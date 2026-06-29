/* =========================================================
   Ziheng (Zane) Cheng — Three.js clay scenes (v2)
   Drag-to-spin covers · grounded shadows · organic hero blob
   + cursor-following particles. Falls back to SVG covers
   if THREE / WebGL is unavailable.
   ========================================================= */
(function () {
  "use strict";
  if (typeof THREE === "undefined") return;
  try {
    var probe = document.createElement("canvas");
    if (!(probe.getContext("webgl") || probe.getContext("experimental-webgl"))) return;
  } catch (e) { return; }

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.6);
  var scenes = [];
  var materials = [];

  function clay() {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--cover-ink").trim() || "#e8743b";
    try { return new THREE.Color(c); } catch (e) { return new THREE.Color("#e8743b"); }
  }

  // soft round contact-shadow texture (shared)
  var shadowTex = (function () {
    var c = document.createElement("canvas"); c.width = c.height = 128;
    var x = c.getContext("2d");
    var g = x.createRadialGradient(64, 64, 6, 64, 64, 62);
    g.addColorStop(0, "rgba(0,0,0,0.42)"); g.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();

  function buildShape(kind, mat) {
    var g = new THREE.Group();
    function add(geo, x, y, z) { var m = new THREE.Mesh(geo, mat); m.position.set(x || 0, y || 0, z || 0); g.add(m); return m; }
    if (kind === "vibe") {
      var hs = [0.7, 1.35, 0.95, 1.65, 0.8];
      for (var i = 0; i < 5; i++) add(new THREE.BoxGeometry(0.3, hs[i], 0.3), (i - 2) * 0.42, hs[i] / 2 - 0.85, 0);
    } else if (kind === "collar") {
      add(new THREE.TorusGeometry(0.95, 0.34, 30, 64));
      add(new THREE.SphereGeometry(0.17, 22, 22), 0, 0.98, 0.08);
    } else if (kind === "sksff") {
      add(new THREE.SphereGeometry(0.62, 40, 40), 0, -0.2, 0);
      add(new THREE.SphereGeometry(0.3, 28, 28), -0.6, 0.55, 0);
      add(new THREE.SphereGeometry(0.3, 28, 28), 0, 0.78, 0);
      add(new THREE.SphereGeometry(0.3, 28, 28), 0.6, 0.55, 0);
    } else if (kind === "parking") {
      add(new THREE.BoxGeometry(1.8, 0.55, 0.85), 0, -0.05, 0);
      add(new THREE.BoxGeometry(0.95, 0.5, 0.82), -0.1, 0.45, 0);
      add(new THREE.CylinderGeometry(0.22, 0.22, 0.92, 26), 0.55, -0.4, 0).rotation.x = Math.PI / 2;
      add(new THREE.CylinderGeometry(0.22, 0.22, 0.92, 26), -0.55, -0.4, 0).rotation.x = Math.PI / 2;
    } else if (kind === "recon") {
      add(new THREE.IcosahedronGeometry(1.15, 0));
    } else if (kind === "food") {
      add(new THREE.CylinderGeometry(1.15, 1.05, 0.26, 60));
      add(new THREE.SphereGeometry(0.27, 24, 24), -0.4, 0.26, 0.25);
      add(new THREE.SphereGeometry(0.23, 24, 24), 0.38, 0.26, -0.1);
      add(new THREE.SphereGeometry(0.2, 24, 24), 0.1, 0.26, 0.45);
    } else if (kind === "flood") {
      add(new THREE.SphereGeometry(0.34, 28, 28));
      add(new THREE.BoxGeometry(1.8, 0.1, 0.16));
      add(new THREE.BoxGeometry(0.16, 0.1, 1.8));
      [[0.82, 0], [-0.82, 0], [0, 0.82], [0, -0.82]].forEach(function (p) {
        add(new THREE.CylinderGeometry(0.3, 0.3, 0.07, 28), p[0], 0.07, p[1]);
      });
    } else {
      add(new THREE.IcosahedronGeometry(1.1, 1));
    }
    var box = new THREE.Box3().setFromObject(g);
    g.position.sub(box.getCenter(new THREE.Vector3()));
    var r = box.getBoundingSphere(new THREE.Sphere()).radius || 1;
    var obj = new THREE.Group(); obj.add(g); obj.scale.setScalar(1.3 / r);
    return obj;
  }

  function heroBlob(mat) {
    var geo = new THREE.IcosahedronGeometry(1.35, 5);
    var p = geo.attributes.position, v = new THREE.Vector3();
    for (var i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      var n = v.clone().normalize();
      var d = 0.16 * Math.sin(3.0 * n.x + 1.0) * Math.cos(2.6 * n.y + 0.4) * Math.sin(3.2 * n.z + 2.0);
      v.addScaledVector(n, d); p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return new THREE.Mesh(geo, mat);
  }

  function makeScene(canvas, kind, opts) {
    opts = opts || {};
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(DPR);
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, opts.camY != null ? opts.camY : 0.85, opts.dist || 4.4);
    camera.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a2418, 0.55));
    scene.add(new THREE.AmbientLight(0xffffff, 0.22));
    var key = new THREE.DirectionalLight(0xffffff, 1.05); key.position.set(-3, 4, 5); scene.add(key);
    var rim = new THREE.DirectionalLight(0xffd8bd, 0.5); rim.position.set(4, -1, 2); scene.add(rim);

    var hero = opts.hero;
    var mat = new THREE.MeshStandardMaterial({
      color: clay(),
      roughness: hero ? 0.42 : 0.88,
      metalness: hero ? 0.28 : 0.06,
      flatShading: kind === "recon"
    });
    materials.push(mat);

    var obj = hero ? heroBlob(mat) : buildShape(kind, mat);
    scene.add(obj);

    // particles (hero only)
    var points = null;
    if (hero) {
      var N = 90, arr = new Float32Array(N * 3);
      for (var i = 0; i < N; i++) {
        var u = Math.random() * Math.PI * 2, t = Math.acos(2 * Math.random() - 1), rr = 1.9 + Math.random() * 0.9;
        arr[i*3] = rr*Math.sin(t)*Math.cos(u); arr[i*3+1] = rr*Math.cos(t); arr[i*3+2] = rr*Math.sin(t)*Math.sin(u);
      }
      var pg = new THREE.BufferGeometry();
      pg.setAttribute("position", new THREE.BufferAttribute(arr, 3));
      var pmat = new THREE.PointsMaterial({ color: clay(), size: 0.045, transparent: true, opacity: 0.55, depthWrite: false });
      materials.push(pmat);
      points = new THREE.Points(pg, pmat); scene.add(points);
    } else {
      // grounded soft shadow
      var sh = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2),
        new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
      sh.rotation.x = -Math.PI / 2; sh.position.y = -1.28; scene.add(sh);
    }

    var sc = { renderer: renderer, scene: scene, camera: camera, obj: obj, points: points, canvas: canvas,
               hero: !!hero, visible: false, spin: opts.spin == null ? 0.34 : opts.spin,
               velY: 0, rotX: 0, tx: 0, ty: 0, hover: false, dragging: false, lastX: 0, lastY: 0, bob: Math.random()*6 };

    function resize() {
      var w = canvas.clientWidth, hh = canvas.clientHeight;
      if (!w || !hh) return;
      renderer.setSize(w, hh, false);
      camera.aspect = w / hh; camera.updateProjectionMatrix();
    }
    sc.resize = resize;
    if (window.ResizeObserver) new ResizeObserver(resize).observe(canvas); else window.addEventListener("resize", resize);
    setTimeout(resize, 0);

    new IntersectionObserver(function (en) {
      en.forEach(function (e) { sc.visible = e.isIntersecting; if (e.isIntersecting) resize(); });
    }, { threshold: 0.05 }).observe(canvas);

    // interaction
    if (!hero) {
      var host = canvas.closest(".card") || canvas;
      host.addEventListener("mouseenter", function () { sc.hover = true; });
      host.addEventListener("mouseleave", function () { sc.hover = false; sc.tx = 0; sc.ty = 0; });
      host.addEventListener("mousemove", function (e) {
        var r = host.getBoundingClientRect();
        sc.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.7;
        sc.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
      });
      // drag to spin (covers)
      canvas.addEventListener("pointerdown", function (e) {
        sc.dragging = true; sc.lastX = e.clientX; sc.lastY = e.clientY;
        if (canvas.setPointerCapture) try { canvas.setPointerCapture(e.pointerId); } catch (x) {}
      });
      canvas.addEventListener("pointermove", function (e) {
        if (!sc.dragging) return;
        var dx = e.clientX - sc.lastX, dy = e.clientY - sc.lastY;
        sc.obj.rotation.y += dx * 0.012;
        sc.rotX = Math.max(-0.9, Math.min(0.9, sc.rotX + dy * 0.012));
        sc.velY = dx * 0.012; sc.lastX = e.clientX; sc.lastY = e.clientY;
      });
      function endDrag() { sc.dragging = false; }
      canvas.addEventListener("pointerup", endDrag);
      canvas.addEventListener("pointercancel", endDrag);
    } else {
      // hero: cursor parallax across the section
      var sec = canvas.closest(".hero") || document.body;
      sec.addEventListener("mousemove", function (e) {
        var r = sec.getBoundingClientRect();
        sc.tx = ((e.clientX - r.left) / r.width - 0.5) * 0.9;
        sc.ty = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
      });
      sec.addEventListener("mouseleave", function () { sc.tx = 0; sc.ty = 0; });
    }

    scenes.push(sc);
    if (canvas.parentElement) canvas.parentElement.classList.add("has-3d");
    return sc;
  }

  var last = performance.now();
  function loop(now) {
    var dt = Math.min((now - last) / 1000, 0.05); last = now;
    for (var i = 0; i < scenes.length; i++) {
      var s = scenes[i];
      if (!s.visible) continue;
      if (s.hero) {
        if (!reduce) s.obj.rotation.y += dt * s.spin;
        s.rotX += ((-s.ty * 0.5) - s.rotX) * 0.05;
        s.obj.rotation.x = s.rotX;
        s.obj.position.x += ((s.tx * 0.5) - s.obj.position.x) * 0.05;
        s.obj.position.y = Math.sin(now / 1400 + s.bob) * 0.08;
        if (s.points) { s.points.rotation.y -= dt * 0.06; s.points.rotation.x += dt * 0.02; }
      } else {
        if (!s.dragging) {
          var base = s.hover ? 1.1 : s.spin;
          if (!reduce) s.obj.rotation.y += dt * base + s.velY;
          s.velY *= 0.93;
          s.rotX += ((s.ty * 0.6) - s.rotX) * 0.08;
        }
        s.obj.rotation.x = s.rotX;
        s.obj.rotation.z = (s.tx * -0.18);
        s.obj.position.y = Math.sin(now / 1100 + s.bob) * (s.hover ? 0.09 : 0.05);
      }
      s.renderer.render(s.scene, s.camera);
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // theme sync
  new MutationObserver(function () {
    var c = clay(); materials.forEach(function (m) { m.color.copy(c); });
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  // init
  document.querySelectorAll(".cover3d").forEach(function (cv) {
    try { makeScene(cv, cv.getAttribute("data-shape"), { spin: 0.34, dist: 4.4, camY: 0.85 }); } catch (e) {}
  });
  var heroCanvas = document.querySelector(".hero3d");
  if (heroCanvas) { try { makeScene(heroCanvas, "blob", { spin: 0.14, dist: 4.2, camY: 0, hero: true }); } catch (e) {} }
})();
