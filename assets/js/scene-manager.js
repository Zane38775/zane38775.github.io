/* scene-manager.js — shared-canvas 3D mount orchestrator (spec §8)
   One fixed transparent #scene3d canvas + scissor rendering for card covers
   and the hero; a dedicated renderer for the single live modal mount. */
(function () {
  "use strict";

  var NOOP_MANAGER = { scan: function () {}, release: function () {}, fps: 0 };

  function webglAvailable() {
    try {
      var c = document.createElement("canvas");
      return !!(window.WebGLRenderingContext &&
        (c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl")));
    } catch (e) {
      return false;
    }
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  onReady(function () {
    if (typeof THREE === "undefined" || !webglAvailable()) {
      document.body.classList.add("no-webgl");
      window.SceneManager = NOOP_MANAGER;
      return;
    }

    /* ------------------------------------------------------------------ */
    /* Constants + module state                                           */
    /* ------------------------------------------------------------------ */

    var MAX_DPR = 1.75;
    var EXPLODE_MS = 600;
    var DRAG_LINGER_MS = 250;
    var LOW_FPS = 38;
    var LOW_FPS_HOLD_MS = 2000;

    var mounts = [];            // every live mount record
    var modalMount = null;      // only one modal mount may be alive
    var dead = false;           // set on webglcontextlost — manager shuts down

    var sharedCanvas = null;
    var sharedRenderer = null;
    var sharedW = 0, sharedH = 0;

    var dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    var dprDropped = false;

    var rafId = 0;
    var running = false;
    var lastTime = 0;
    var startTime = (typeof performance !== "undefined" ? performance.now() : Date.now());

    var fpsFrames = 0;
    var fpsStamp = 0;
    var lowFpsSince = -1;

    var reducedQuery = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: reduce)") : null;
    var reduced = !!(reducedQuery && reducedQuery.matches);
    var staticRenderQueued = false;

    var io = null;

    // Preallocated scratch (zero allocations inside the frame loop).
    var _tmpVec = new THREE.Vector3();

    /* ------------------------------------------------------------------ */
    /* Injected styles (scene-manager owns its own UI chrome)             */
    /* ------------------------------------------------------------------ */

    (function injectStyles() {
      var style = document.createElement("style");
      style.setAttribute("data-owner", "scene-manager");
      style.textContent =
        "#scene3d{position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:50;display:block;}" +
        "body.no-webgl #scene3d{display:none;}" +
        "[data-scene-mode='modal']{position:relative;overflow:hidden;}" +
        ".scene-modal-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;touch-action:none;}" +
        ".scene-explode-btn{position:absolute;right:12px;bottom:12px;z-index:5;" +
        "font-family:'JetBrains Mono',ui-monospace,SFMono-Regular,monospace;font-size:11px;font-weight:700;" +
        "letter-spacing:.12em;text-transform:uppercase;color:var(--accent,#00e893);" +
        "background:rgba(7,11,15,.55);border:1px solid var(--accent,#00e893);border-radius:3px;" +
        "padding:8px 12px;cursor:pointer;user-select:none;-webkit-user-select:none;" +
        "transition:background .2s ease,color .2s ease,box-shadow .2s ease;}" +
        ".scene-explode-btn:hover,.scene-explode-btn:focus-visible{background:var(--accent,#00e893);" +
        "color:#070b0f;box-shadow:0 0 14px var(--accent,#00e893);outline:none;}" +
        ".scene-explode-btn[data-on='1']{background:var(--accent,#00e893);color:#070b0f;" +
        "box-shadow:0 0 10px var(--accent,#00e893);}";
      document.head.appendChild(style);
    })();

    /* ------------------------------------------------------------------ */
    /* Palette + env                                                      */
    /* ------------------------------------------------------------------ */

    function cssVar(styles, name, fallback) {
      var v = styles.getPropertyValue(name);
      v = v ? v.trim() : "";
      return v || fallback;
    }

    function readPalette() {
      var s = getComputedStyle(document.documentElement);
      return {
        accent: cssVar(s, "--accent-glow", "") || cssVar(s, "--accent", "#9a9aa2"),
        accent2: cssVar(s, "--accent-2", "#6a6a72"),
        warn: cssVar(s, "--warn", "#ffb454"),
        danger: cssVar(s, "--danger", "#ff5c57"),
        ink: cssVar(s, "--text", "#d7e1ea"),
        soft: cssVar(s, "--text-soft", "#8b9bab")
      };
    }

    function makeEnv(mode) {
      return {
        palette: readPalette(),
        mode: mode,
        quality: mode === "card" ? 0.75 : 1
      };
    }

    /* ------------------------------------------------------------------ */
    /* Fake ground shadow                                                 */
    /* ------------------------------------------------------------------ */

    function makeShadowTexture() {
      var size = 128;
      var c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      var g = c.getContext("2d");
      var grad = g.createRadialGradient(size / 2, size / 2, 4, size / 2, size / 2, size / 2);
      grad.addColorStop(0, "rgba(0,0,0,0.38)");
      grad.addColorStop(0.55, "rgba(0,0,0,0.16)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      g.fillStyle = grad;
      g.fillRect(0, 0, size, size);
      var tex = new THREE.CanvasTexture(c);
      tex.needsUpdate = true;
      return tex;
    }

    /* ------------------------------------------------------------------ */
    /* Scene construction / teardown                                      */
    /* ------------------------------------------------------------------ */

    function easeInOutCubic(k) {
      return k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    }

    function buildSceneFor(mount) {
      var entry = window.ProjectModels && window.ProjectModels[mount.id];
      if (!entry || typeof entry.build !== "function") return false;

      var env = makeEnv(mount.mode);
      var built = null;
      try {
        built = entry.build(THREE, env);
      } catch (err) {
        built = null;
      }
      if (!built || !built.group || !built.group.isObject3D) return false;

      var scene = new THREE.Scene();

      var ambient = new THREE.AmbientLight(0x8899aa, 0.55);
      var dir = new THREE.DirectionalLight(0xffffff, 0.95);
      dir.position.set(3, 5, 4);
      var accentColor = new THREE.Color();
      try { accentColor.set(env.palette.accent); } catch (e) { accentColor.set("#00e893"); }
      var point = new THREE.PointLight(accentColor, 0.5);
      point.position.set(-3, 2, -3);
      scene.add(ambient, dir, point);

      var spin = new THREE.Group();
      spin.add(built.group);
      scene.add(spin);

      // Fake ground shadow.
      var shadowTex = makeShadowTexture();
      var shadowMat = new THREE.MeshBasicMaterial({
        map: shadowTex, transparent: true, depthWrite: false, opacity: 0.85
      });
      var shadowGeo = new THREE.PlaneGeometry(4.6, 4.6);
      var shadow = new THREE.Mesh(shadowGeo, shadowMat);
      shadow.rotation.x = -Math.PI / 2;
      shadow.position.y = -1.35;
      spin.add(shadow);

      var camHints = entry.camera || {};
      var camera = new THREE.PerspectiveCamera(camHints.fov || 38, 1, 0.1, 80);
      camera.position.set(0, (camHints.height != null ? camHints.height : 1.4),
        (camHints.distance != null ? camHints.distance : 6.5));
      camera.lookAt(0, 0.1, 0);

      // Record exploded-view part bases.
      var parts = [];
      if (built.parts && built.parts.length) {
        for (var i = 0; i < built.parts.length; i++) {
          var p = built.parts[i];
          if (!p || !p.object || !p.object.isObject3D || !p.dir || typeof p.dist !== "number") continue;
          parts.push({
            object: p.object,
            base: p.object.position.clone(),
            dir: new THREE.Vector3(p.dir.x || 0, p.dir.y || 0, p.dir.z || 0).normalize(),
            dist: p.dist
          });
        }
      }

      mount.scene = scene;
      mount.camera = camera;
      mount.spin = spin;
      mount.model = built;
      mount.parts = parts;
      mount.updateBroken = false;
      mount.aspect = 0;
      mount.szW = -1;   // invalidate modal size cache (fresh camera needs aspect)
      mount.szH = -1;
      mount.szDpr = 0;

      // Prime the model once so its initial pose is valid even without a loop.
      safeUpdate(mount, 0, 0);
      applyExplode(mount);
      return true;
    }

    function disposeMaterial(mat) {
      if (!mat) return;
      for (var key in mat) {
        if (Object.prototype.hasOwnProperty.call(mat, key)) {
          var v = mat[key];
          if (v && v.isTexture) {
            try { v.dispose(); } catch (e) { /* noop */ }
          }
        }
      }
      try { mat.dispose(); } catch (e2) { /* noop */ }
    }

    function disposeSceneGraph(mount) {
      if (mount.model && typeof mount.model.dispose === "function") {
        try { mount.model.dispose(); } catch (e) { /* noop */ }
      }
      if (mount.scene) {
        mount.scene.traverse(function (obj) {
          if (obj.geometry) {
            try { obj.geometry.dispose(); } catch (e) { /* noop */ }
          }
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              for (var i = 0; i < obj.material.length; i++) disposeMaterial(obj.material[i]);
            } else {
              disposeMaterial(obj.material);
            }
          }
        });
        mount.scene.clear();
      }
      mount.scene = null;
      mount.camera = null;
      mount.spin = null;
      mount.model = null;
      mount.parts = null;
    }

    /* ------------------------------------------------------------------ */
    /* Mount records                                                      */
    /* ------------------------------------------------------------------ */

    function createMount(el) {
      var id = el.getAttribute("data-model3d");
      if (!id) return null;
      var mode = el.getAttribute("data-scene-mode") === "modal"
        ? "modal"
        : (el.id === "hero3d" ? "hero" : "card");

      var mount = {
        el: el,
        id: id,
        mode: mode,
        active: mode === "modal",
        scene: null,
        camera: null,
        spin: null,
        model: null,
        parts: null,
        updateBroken: false,
        aspect: 0,
        // interaction state
        hover: false,
        hoverAmt: 0,
        pointerX: 0,
        pointerY: 0,
        dragging: false,
        dragPointerId: -1,
        lastX: 0,
        lastY: 0,
        velY: 0,
        dragRotX: 0,
        dragDist: 0,
        dragLingerTimer: 0,
        // explode state
        explodeVal: 0,
        explodeFrom: 0,
        explodeTo: 0,
        explodeStart: -1,
        // modal-only
        renderer: null,
        canvas: null,
        button: null,
        szW: -1,
        szH: -1,
        szDpr: 0,
        // preallocated ctx passed to model.update
        ctx: { hover: false, pointer: { x: 0, y: 0 }, explode: 0, mode: mode },
        handlers: null,
        disposed: false
      };

      if (!buildSceneFor(mount)) return null;

      el.__sceneMount = mount;
      attachInteraction(mount);

      if (mode === "modal") {
        if (!setupModal(mount)) {
          destroyMount(mount);
          return null;
        }
      } else {
        ensureShared();
        var wrap = el.closest ? el.closest(".cover-wrap") : null;
        if (wrap) wrap.classList.add("has-3d");
        if (io) io.observe(el);
        else mount.active = true; // no IntersectionObserver → always render
      }

      mounts.push(mount);
      if (reduced) queueStaticRender();
      return mount;
    }

    function destroyMount(mount) {
      if (mount.disposed) return;
      mount.disposed = true;

      detachInteraction(mount);
      if (io && mount.mode !== "modal") {
        try { io.unobserve(mount.el); } catch (e) { /* noop */ }
      }
      if (mount.dragLingerTimer) {
        clearTimeout(mount.dragLingerTimer);
        mount.dragLingerTimer = 0;
      }
      delete mount.el.dataset.dragging;

      disposeSceneGraph(mount);

      if (mount.mode === "modal") {
        if (mount.button && mount.button.parentNode) mount.button.parentNode.removeChild(mount.button);
        if (mount.renderer) {
          try { mount.renderer.dispose(); } catch (e2) { /* noop */ }
        }
        if (mount.canvas && mount.canvas.parentNode) mount.canvas.parentNode.removeChild(mount.canvas);
        mount.renderer = null;
        mount.canvas = null;
        mount.button = null;
        if (modalMount === mount) modalMount = null;
      } else {
        var wrap = mount.el.closest ? mount.el.closest(".cover-wrap") : null;
        if (wrap) wrap.classList.remove("has-3d");
      }

      if (mount.el.__sceneMount === mount) {
        try { delete mount.el.__sceneMount; } catch (e3) { mount.el.__sceneMount = null; }
      }

      var idx = mounts.indexOf(mount);
      if (idx !== -1) mounts.splice(idx, 1);

      if (reduced) queueStaticRender();
      syncLoop();
    }

    /* ------------------------------------------------------------------ */
    /* Interaction: drag-to-rotate + hover + parallax                     */
    /* ------------------------------------------------------------------ */

    function markDragging(mount) {
      mount.el.dataset.dragging = "1";
      if (mount.dragLingerTimer) {
        clearTimeout(mount.dragLingerTimer);
        mount.dragLingerTimer = 0;
      }
    }

    function scheduleDragClear(mount) {
      if (mount.dragLingerTimer) clearTimeout(mount.dragLingerTimer);
      mount.dragLingerTimer = setTimeout(function () {
        mount.dragLingerTimer = 0;
        if (!mount.dragging) delete mount.el.dataset.dragging;
      }, DRAG_LINGER_MS);
    }

    function attachInteraction(mount) {
      var el = mount.el;
      el.style.cursor = "grab";
      el.style.touchAction = "pan-y";

      var onEnter = function () { mount.hover = true; };
      var onLeave = function () {
        mount.hover = false;
        mount.pointerX = 0;
        mount.pointerY = 0;
      };
      var onDown = function (e) {
        if (e.button != null && e.button !== 0) return;
        mount.dragging = true;
        mount.dragPointerId = e.pointerId;
        mount.lastX = e.clientX;
        mount.lastY = e.clientY;
        mount.velY = 0;
        mount.dragDist = 0;
        el.style.cursor = "grabbing";
        try { el.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
      };
      var onMove = function (e) {
        var rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          mount.pointerX = Math.max(-1, Math.min(1, ((e.clientX - rect.left) / rect.width) * 2 - 1));
          mount.pointerY = Math.max(-1, Math.min(1, ((e.clientY - rect.top) / rect.height) * 2 - 1));
        }
        if (!mount.dragging || e.pointerId !== mount.dragPointerId) return;
        var dx = e.clientX - mount.lastX;
        var dy = e.clientY - mount.lastY;
        mount.lastX = e.clientX;
        mount.lastY = e.clientY;
        if (mount.spin) {
          var step = dx * 0.005;
          mount.spin.rotation.y += step;
          mount.velY = step;
          mount.dragRotX = Math.max(-0.6, Math.min(0.6, mount.dragRotX + dy * 0.004));
        }
        // Only flag as a "drag" (main.js §6 click-suppression contract) once the
        // pointer actually moved — a plain click must still open the card modal.
        mount.dragDist += Math.abs(dx) + Math.abs(dy);
        if (mount.dragDist > 3) markDragging(mount);
        if (reduced) queueStaticRender();
      };
      var onUp = function (e) {
        if (!mount.dragging || (e.pointerId != null && e.pointerId !== mount.dragPointerId)) return;
        mount.dragging = false;
        mount.dragPointerId = -1;
        el.style.cursor = "grab";
        try { el.releasePointerCapture(e.pointerId); } catch (err) { /* noop */ }
        if (mount.el.dataset.dragging) scheduleDragClear(mount);
      };

      el.addEventListener("pointerenter", onEnter);
      el.addEventListener("pointerleave", onLeave);
      el.addEventListener("pointerdown", onDown);
      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
      el.addEventListener("pointercancel", onUp);

      mount.handlers = {
        enter: onEnter, leave: onLeave, down: onDown,
        move: onMove, up: onUp
      };
    }

    function detachInteraction(mount) {
      var h = mount.handlers;
      if (!h) return;
      var el = mount.el;
      el.removeEventListener("pointerenter", h.enter);
      el.removeEventListener("pointerleave", h.leave);
      el.removeEventListener("pointerdown", h.down);
      el.removeEventListener("pointermove", h.move);
      el.removeEventListener("pointerup", h.up);
      el.removeEventListener("pointercancel", h.up);
      el.style.cursor = "";
      mount.handlers = null;
    }

    /* ------------------------------------------------------------------ */
    /* Explode (modal)                                                    */
    /* ------------------------------------------------------------------ */

    function setExplodeTarget(mount, target) {
      mount.explodeFrom = mount.explodeVal;
      mount.explodeTo = target;
      mount.explodeStart = now();
      if (reduced) {
        mount.explodeVal = target;
        mount.explodeStart = -1;
        applyExplode(mount);
        queueStaticRender();
        renderModalOnce(mount);
      }
    }

    function stepExplode(mount, t) {
      if (mount.explodeStart < 0) return;
      var k = (t - mount.explodeStart) / EXPLODE_MS;
      if (k >= 1) {
        mount.explodeVal = mount.explodeTo;
        mount.explodeStart = -1;
      } else {
        mount.explodeVal = mount.explodeFrom + (mount.explodeTo - mount.explodeFrom) * easeInOutCubic(k);
      }
      applyExplode(mount);
    }

    function applyExplode(mount) {
      var parts = mount.parts;
      if (!parts || !parts.length) return;
      var f = mount.explodeVal;
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        _tmpVec.copy(p.dir).multiplyScalar(p.dist * f);
        p.object.position.set(p.base.x + _tmpVec.x, p.base.y + _tmpVec.y, p.base.z + _tmpVec.z);
      }
    }

    /* ------------------------------------------------------------------ */
    /* Modal mount setup                                                  */
    /* ------------------------------------------------------------------ */

    function setupModal(mount) {
      // Only one modal renderer alive at any time.
      if (modalMount && modalMount !== mount) destroyMount(modalMount);
      modalMount = mount;

      var canvas = document.createElement("canvas");
      canvas.className = "scene-modal-canvas";
      mount.el.appendChild(canvas);

      var renderer;
      try {
        renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
      } catch (e) {
        canvas.parentNode.removeChild(canvas);
        return false;
      }
      renderer.setClearColor(0x000000, 0);
      renderer.setPixelRatio(dpr);
      renderer.outputEncoding = THREE.sRGBEncoding;

      canvas.addEventListener("webglcontextlost", onContextLost, false);

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "scene-explode-btn";
      btn.textContent = "[ EXPLODE ]";
      btn.setAttribute("aria-pressed", "false");
      btn.addEventListener("click", function () {
        var on = mount.explodeTo < 0.5;
        setExplodeTarget(mount, on ? 1 : 0);
        btn.dataset.on = on ? "1" : "";
        btn.textContent = on ? "[ ASSEMBLE ]" : "[ EXPLODE ]";
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      mount.el.appendChild(btn);

      mount.renderer = renderer;
      mount.canvas = canvas;
      mount.button = btn;

      sizeModal(mount);
      if (reduced) renderModalOnce(mount);
      syncLoop();
      return true;
    }

    function sizeModal(mount) {
      if (!mount.renderer) return;
      var w = mount.el.clientWidth || 1;
      var h = mount.el.clientHeight || 1;
      // Skip when nothing changed — setSize per frame would thrash the canvas
      // drawing buffer. Cache is invalidated by buildSceneFor on rebuild.
      if (w === mount.szW && h === mount.szH && dpr === mount.szDpr) return;
      mount.szW = w;
      mount.szH = h;
      mount.szDpr = dpr;
      mount.renderer.setPixelRatio(dpr);
      mount.renderer.setSize(w, h, false);
      if (mount.camera) {
        mount.camera.aspect = w / h;
        mount.camera.updateProjectionMatrix();
      }
    }

    function renderModalOnce(mount) {
      if (!mount.renderer || !mount.scene || !mount.camera || dead) return;
      sizeModal(mount);
      try { mount.renderer.render(mount.scene, mount.camera); } catch (e) { /* noop */ }
    }

    /* ------------------------------------------------------------------ */
    /* Shared canvas                                                      */
    /* ------------------------------------------------------------------ */

    function ensureShared() {
      if (sharedRenderer || dead) return;
      sharedCanvas = document.createElement("canvas");
      sharedCanvas.id = "scene3d";
      sharedCanvas.setAttribute("aria-hidden", "true");
      document.body.appendChild(sharedCanvas);
      try {
        sharedRenderer = new THREE.WebGLRenderer({ canvas: sharedCanvas, alpha: true, antialias: true });
      } catch (e) {
        sharedRenderer = null;
        document.body.removeChild(sharedCanvas);
        sharedCanvas = null;
        onContextLost();
        return;
      }
      sharedRenderer.setClearColor(0x000000, 0);
      sharedRenderer.setPixelRatio(dpr);
      sharedRenderer.autoClear = false;
      sharedRenderer.outputEncoding = THREE.sRGBEncoding;
      sharedCanvas.addEventListener("webglcontextlost", onContextLost, false);
      syncLoop();
    }

    function sizeShared() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (w !== sharedW || h !== sharedH) {
        sharedW = w;
        sharedH = h;
        sharedRenderer.setPixelRatio(dpr);
        sharedRenderer.setSize(w, h, false);
      }
    }

    function renderSharedPass() {
      if (!sharedRenderer) return;
      sizeShared();
      sharedRenderer.setScissorTest(false);
      sharedRenderer.setViewport(0, 0, sharedW, sharedH);
      sharedRenderer.clear(true, true, true);
      sharedRenderer.setScissorTest(true);

      for (var i = 0; i < mounts.length; i++) {
        var m = mounts[i];
        if (m.mode === "modal" || !m.active || !m.scene) continue;
        var rect = m.el.getBoundingClientRect();
        if (rect.width < 2 || rect.height < 2) continue;
        if (rect.bottom < 0 || rect.top > sharedH || rect.right < 0 || rect.left > sharedW) continue;

        // Y flip: WebGL viewport origin is bottom-left. setViewport/setScissor
        // take CSS px here — r149 multiplies by the renderer pixel ratio itself.
        var y = sharedH - rect.bottom;
        sharedRenderer.setViewport(rect.left, y, rect.width, rect.height);
        sharedRenderer.setScissor(rect.left, y, rect.width, rect.height);

        var aspect = rect.width / rect.height;
        if (Math.abs(aspect - m.aspect) > 0.001) {
          m.aspect = aspect;
          m.camera.aspect = aspect;
          m.camera.updateProjectionMatrix();
        }
        try { sharedRenderer.render(m.scene, m.camera); } catch (e) { /* noop */ }
      }
      sharedRenderer.setScissorTest(false);
    }

    /* ------------------------------------------------------------------ */
    /* Frame loop                                                         */
    /* ------------------------------------------------------------------ */

    function now() {
      return typeof performance !== "undefined" ? performance.now() : Date.now();
    }

    function safeUpdate(mount, t, dt) {
      if (!mount.model || mount.updateBroken || typeof mount.model.update !== "function") return;
      var ctx = mount.ctx;
      ctx.hover = mount.hover;
      ctx.pointer.x = mount.pointerX;
      ctx.pointer.y = mount.pointerY;
      ctx.explode = mount.explodeVal;
      try {
        mount.model.update(t, dt, ctx);
      } catch (e) {
        mount.updateBroken = true;
      }
    }

    function stepMount(mount, t, dt) {
      if (!mount.spin) return;

      // Hover easing 0..1.
      var hoverTarget = mount.hover ? 1 : 0;
      mount.hoverAmt += (hoverTarget - mount.hoverAmt) * Math.min(1, dt * 6);

      // Auto-rotate (paused while actively dragging) + inertia.
      if (!mount.dragging) {
        mount.spin.rotation.y += dt * 0.25 * (1 + 2 * mount.hoverAmt);
        if (Math.abs(mount.velY) > 0.00005) {
          mount.spin.rotation.y += mount.velY;
          mount.velY *= 0.94;
        } else {
          mount.velY = 0;
        }
      }

      // Pointer parallax + drag pitch, eased.
      var targetX = (mount.hoverAmt > 0.02 ? mount.pointerY * 0.15 : 0) + mount.dragRotX;
      mount.spin.rotation.x += (targetX - mount.spin.rotation.x) * Math.min(1, dt * 5);
      if (!mount.dragging && Math.abs(mount.dragRotX) > 0.0005) {
        mount.dragRotX *= Math.pow(0.35, dt); // slowly relax pitch back to level
      }

      stepExplode(mount, now());
      safeUpdate(mount, t, dt);
    }

    function frame() {
      rafId = 0;
      if (dead || !running) return;

      var tNow = now();
      var dt = Math.min(0.05, Math.max(0.0001, (tNow - lastTime) / 1000));
      lastTime = tNow;
      var t = (tNow - startTime) / 1000;

      // FPS tracking + adaptive DPR.
      fpsFrames++;
      if (tNow - fpsStamp >= 1000) {
        manager.fps = Math.round((fpsFrames * 1000) / (tNow - fpsStamp));
        fpsFrames = 0;
        fpsStamp = tNow;
        if (!dprDropped && dpr > 1) {
          if (manager.fps < LOW_FPS) {
            if (lowFpsSince < 0) lowFpsSince = tNow;
            else if (tNow - lowFpsSince > LOW_FPS_HOLD_MS) {
              dprDropped = true;
              dpr = 1;
              sharedW = 0; // force resize
              sharedH = 0;
              if (modalMount) sizeModal(modalMount);
            }
          } else {
            lowFpsSince = -1;
          }
        }
      }

      var anyShared = false;
      for (var i = 0; i < mounts.length; i++) {
        var m = mounts[i];
        if (m.mode === "modal") {
          stepMount(m, t, dt);
        } else if (m.active && m.scene) {
          stepMount(m, t, dt);
          anyShared = true;
        }
      }

      if (anyShared && sharedRenderer) renderSharedPass();

      if (modalMount && modalMount.renderer && modalMount.scene) {
        sizeModal(modalMount);
        try { modalMount.renderer.render(modalMount.scene, modalMount.camera); } catch (e) { /* noop */ }
      }

      rafId = requestAnimationFrame(frame);
    }

    function syncLoop() {
      var want = !dead && !reduced && !document.hidden && mounts.length > 0;
      if (want && !running) {
        running = true;
        lastTime = now();
        fpsStamp = lastTime;
        fpsFrames = 0;
        lowFpsSince = -1;
        rafId = requestAnimationFrame(frame);
      } else if (!want && running) {
        running = false;
        if (rafId) cancelAnimationFrame(rafId);
        rafId = 0;
      }
    }

    /* Static rendering path for prefers-reduced-motion. */
    function queueStaticRender() {
      if (!reduced || dead || staticRenderQueued) return;
      staticRenderQueued = true;
      requestAnimationFrame(function () {
        staticRenderQueued = false;
        if (dead || !reduced) return;
        if (sharedRenderer) renderSharedPass();
        if (modalMount) renderModalOnce(modalMount);
      });
    }

    /* ------------------------------------------------------------------ */
    /* Context loss fallback                                              */
    /* ------------------------------------------------------------------ */

    function onContextLost(e) {
      if (e && typeof e.preventDefault === "function") e.preventDefault();
      if (dead) return;
      dead = true;
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;

      document.body.classList.add("no-webgl");

      // Un-hide every SVG cover, tear down all mounts.
      var wraps = document.querySelectorAll(".cover-wrap.has-3d");
      for (var i = 0; i < wraps.length; i++) wraps[i].classList.remove("has-3d");
      while (mounts.length) destroyMount(mounts[0]);

      if (sharedCanvas && sharedCanvas.parentNode) sharedCanvas.parentNode.removeChild(sharedCanvas);
      if (sharedRenderer) {
        try { sharedRenderer.dispose(); } catch (err) { /* noop */ }
      }
      sharedRenderer = null;
      sharedCanvas = null;
    }

    /* ------------------------------------------------------------------ */
    /* Theme rebuild                                                      */
    /* ------------------------------------------------------------------ */

    function rebuildAll() {
      if (dead) return;
      for (var i = 0; i < mounts.length; i++) {
        var m = mounts[i];
        var keepSpinY = m.spin ? m.spin.rotation.y : 0;
        disposeSceneGraph(m);
        m.aspect = 0;
        if (buildSceneFor(m)) {
          m.spin.rotation.y = keepSpinY;
          if (m.mode === "modal") {
            sizeModal(m);
            if (m.button) {
              // Re-sync explode pose after rebuild (parts reset to base).
              stepExplode(m, now());
              applyExplode(m);
            }
          }
        } else {
          // Registry vanished or build failed under the new palette — drop it.
          destroyMount(m);
          i--;
        }
      }
      if (reduced) queueStaticRender();
    }

    /* ------------------------------------------------------------------ */
    /* IntersectionObserver culling                                       */
    /* ------------------------------------------------------------------ */

    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var m = entries[i].target.__sceneMount;
          if (m) m.active = entries[i].isIntersecting;
        }
        if (reduced) queueStaticRender();
      }, { rootMargin: "100px" });
    }

    /* ------------------------------------------------------------------ */
    /* Public API                                                         */
    /* ------------------------------------------------------------------ */

    var manager = {
      fps: 60,
      scan: function (root) {
        if (dead) return;
        root = root || document;
        var found = [];
        if (root.nodeType === 1 && root.hasAttribute && root.hasAttribute("data-model3d")) {
          found.push(root);
        }
        if (root.querySelectorAll) {
          var list = root.querySelectorAll("[data-model3d]");
          for (var i = 0; i < list.length; i++) found.push(list[i]);
        }
        for (var j = 0; j < found.length; j++) {
          var el = found[j];
          if (el.__sceneMount) continue;
          try { createMount(el); } catch (e) { /* one bad model must not kill the rest */ }
        }
        syncLoop();
        if (reduced) queueStaticRender();
      },
      release: function (root) {
        root = root || document;
        for (var i = mounts.length - 1; i >= 0; i--) {
          var m = mounts[i];
          if (root === m.el || (root.contains && root.contains(m.el))) {
            destroyMount(m);
          }
        }
        syncLoop();
      }
    };

    window.SceneManager = manager;

    /* ------------------------------------------------------------------ */
    /* Global listeners                                                   */
    /* ------------------------------------------------------------------ */

    document.addEventListener("visibilitychange", function () {
      syncLoop();
      if (!document.hidden && reduced) queueStaticRender();
    });

    window.addEventListener("resize", function () {
      if (modalMount) sizeModal(modalMount);
      if (reduced) queueStaticRender();
    });

    if (reducedQuery) {
      var onMotionChange = function () {
        reduced = !!reducedQuery.matches;
        syncLoop();
        if (reduced) queueStaticRender();
      };
      if (typeof reducedQuery.addEventListener === "function") {
        reducedQuery.addEventListener("change", onMotionChange);
      } else if (typeof reducedQuery.addListener === "function") {
        reducedQuery.addListener(onMotionChange);
      }
      // Keep static frames aligned with the page while scrolling.
      window.addEventListener("scroll", function () {
        if (reduced) queueStaticRender();
      }, { passive: true });
    }

    window.addEventListener("themechange", rebuildAll);

    // Initial page scan (modal templates are inert; only live DOM is picked up).
    manager.scan(document);
  });
})();
