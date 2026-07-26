(function () {
  "use strict";
  if (typeof THREE === "undefined") { return; }
  if (typeof window === "undefined") return;
  window.ProjectModels = window.ProjectModels || {};

  window.ProjectModels["sksff"] = {
    camera: { distance: 6.8, height: 1.7, fov: 38 },

    build: function (THREE, env) {
      if (!THREE) return null;
      var pal = (env && env.palette) || {};
      var ACCENT = new THREE.Color(pal.accent || "#00e893");
      var ACCENT2 = new THREE.Color(pal.accent2 || "#4dc9ff");
      var WARN = new THREE.Color(pal.warn || "#ffb454");

      var group = new THREE.Group();
      var parts = [];

      /* ---- materials ------------------------------------------------ */
      var matWall = new THREE.MeshStandardMaterial({ color: 0xcaa471, roughness: 0.82, metalness: 0.04 });
      var matWood = new THREE.MeshStandardMaterial({ color: 0x7d5535, roughness: 0.78, metalness: 0.05 });
      var matRoof = new THREE.MeshStandardMaterial({ color: WARN.clone().multiplyScalar(0.8), roughness: 0.58, metalness: 0.12 });
      var matDark = new THREE.MeshStandardMaterial({ color: 0x18120d, roughness: 0.92, metalness: 0 });
      var matFur = new THREE.MeshStandardMaterial({ color: 0xd8b98b, roughness: 0.9, metalness: 0 });
      var matFurDark = new THREE.MeshStandardMaterial({ color: 0x6e4a2c, roughness: 0.88, metalness: 0 });
      var matGround = new THREE.MeshStandardMaterial({ color: 0x131b25, roughness: 0.95, metalness: 0.05 });
      var matCollar = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.7, roughness: 0.4, metalness: 0.3 });

      /* ---- ground disc + rim --------------------------------------- */
      var ground = new THREE.Mesh(new THREE.CylinderGeometry(1.85, 1.95, 0.1, 48), matGround);
      ground.position.y = -1.05;
      group.add(ground);
      var rim = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.012, 8, 64),
        new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.5, transparent: true, opacity: 0.55, roughness: 0.5 }));
      rim.rotation.x = Math.PI / 2;
      rim.position.y = -1.0;
      group.add(rim);

      /* ---- dog house ------------------------------------------------ */
      var house = new THREE.Group();
      house.position.set(-0.65, 0, -0.05);
      group.add(house);
      var wallGeoSide = new THREE.BoxGeometry(0.06, 0.85, 1.0);
      var wallGeoFace = new THREE.BoxGeometry(1.15, 0.85, 0.06);
      var wallY = -1.0 + 0.425;
      var wallL = new THREE.Group(), wallR = new THREE.Group(), wallF = new THREE.Group(), wallB = new THREE.Group();
      wallL.add(new THREE.Mesh(wallGeoSide, matWall));
      wallL.position.set(-0.575, wallY, 0);
      wallR.add(new THREE.Mesh(wallGeoSide, matWall));
      wallR.position.set(0.575, wallY, 0);
      wallB.add(new THREE.Mesh(wallGeoFace, matWall));
      wallB.position.set(0, wallY, -0.47);
      wallF.position.set(0, wallY, 0.47);
      wallF.add(new THREE.Mesh(wallGeoFace, matWall));
      // arched door (rect + semicircle top) on the front wall
      var doorShape = new THREE.Shape();
      doorShape.moveTo(-0.17, 0);
      doorShape.lineTo(-0.17, 0.35);
      doorShape.absarc(0, 0.35, 0.17, Math.PI, 0, true);
      doorShape.lineTo(0.17, 0);
      doorShape.closePath();
      var door = new THREE.Mesh(new THREE.ExtrudeGeometry(doorShape, { depth: 0.025, bevelEnabled: false }), matDark);
      door.position.set(0, -0.425, 0.032);
      wallF.add(door);
      var porch = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.18), matWood);
      porch.position.set(0, -0.4, 0.12);
      wallF.add(porch);
      house.add(wallL, wallR, wallF, wallB);

      // gabled roof: triangle gable prism + two overhanging planks + ridge cap
      var roof = new THREE.Group();
      var gableShape = new THREE.Shape();
      gableShape.moveTo(-0.575, 0);
      gableShape.lineTo(0.575, 0);
      gableShape.lineTo(0, 0.42);
      gableShape.closePath();
      var gableGeo = new THREE.ExtrudeGeometry(gableShape, { depth: 0.94, bevelEnabled: false });
      gableGeo.translate(0, 0, -0.47);
      var gable = new THREE.Mesh(gableGeo, matWall);
      gable.position.y = -0.15;
      roof.add(gable);
      var pitch = Math.atan2(0.42, 0.6);
      var plankGeo = new THREE.BoxGeometry(0.88, 0.05, 1.24);
      var plankL = new THREE.Mesh(plankGeo, matRoof);
      plankL.position.set(-0.31, 0.085, 0);
      plankL.rotation.z = pitch;
      var plankR = new THREE.Mesh(plankGeo, matRoof);
      plankR.position.set(0.31, 0.085, 0);
      plankR.rotation.z = -pitch;
      var ridge = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.055, 1.24), matWood);
      ridge.position.y = 0.3;
      roof.add(plankL, plankR, ridge);
      house.add(roof);

      /* ---- procedural little dog ------------------------------------ */
      var dog = new THREE.Group();
      dog.position.set(0.8, 0, 0.35);
      dog.rotation.y = -0.35;
      group.add(dog);
      var body = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.3, 6, 14), matFur);
      body.rotation.x = Math.PI / 2;
      body.position.y = -0.64;
      dog.add(body);
      var legGeo = new THREE.CylinderGeometry(0.038, 0.045, 0.24, 8);
      var li, leg;
      for (li = 0; li < 4; li++) {
        leg = new THREE.Mesh(legGeo, matFur);
        leg.position.set(li % 2 ? 0.085 : -0.085, -0.88, li < 2 ? 0.14 : -0.14);
        dog.add(leg);
      }
      var headPivot = new THREE.Group();
      headPivot.position.set(0, -0.5, 0.26);
      dog.add(headPivot);
      var head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 14), matFur);
      head.position.set(0, 0.06, 0.05);
      headPivot.add(head);
      var snout = new THREE.Mesh(new THREE.SphereGeometry(0.068, 12, 10), matFur);
      snout.position.set(0, 0.01, 0.17);
      headPivot.add(snout);
      var nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 8), matDark);
      nose.position.set(0, 0.03, 0.23);
      headPivot.add(nose);
      var eyeGeo = new THREE.SphereGeometry(0.02, 8, 8);
      var eyeL = new THREE.Mesh(eyeGeo, matDark), eyeR = new THREE.Mesh(eyeGeo, matDark);
      eyeL.position.set(-0.06, 0.1, 0.16);
      eyeR.position.set(0.06, 0.1, 0.16);
      headPivot.add(eyeL, eyeR);
      var earGeo = new THREE.ConeGeometry(0.048, 0.14, 8);
      var earL = new THREE.Mesh(earGeo, matFurDark), earR = new THREE.Mesh(earGeo, matFurDark);
      earL.position.set(-0.085, 0.19, 0.0);
      earL.rotation.z = 0.3;
      earR.position.set(0.085, 0.19, 0.0);
      earR.rotation.z = -0.3;
      headPivot.add(earL, earR);
      var collar = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.02, 8, 20), matCollar);
      collar.rotation.x = Math.PI / 2 - 0.35;
      collar.position.set(0, -0.03, 0.02);
      headPivot.add(collar);
      var tailPivot = new THREE.Group();
      tailPivot.position.set(0, -0.58, -0.3);
      dog.add(tailPivot);
      var tailGeo = new THREE.CylinderGeometry(0.02, 0.032, 0.26, 8);
      tailGeo.translate(0, 0.13, 0);
      var tail = new THREE.Mesh(tailGeo, matFurDark);
      tail.rotation.x = -0.8;
      tailPivot.add(tail);

      /* ---- glowing paw-print path ----------------------------------- */
      var padGeo = new THREE.CircleGeometry(0.05, 12);
      var toeGeo = new THREE.CircleGeometry(0.02, 8);
      var pawMats = [], pawCount = 6, pi, ti, s, px, pz, tx, tz, hd, pawMat, paw, m, toe;
      for (pi = 0; pi < pawCount; pi++) {
        s = pi / (pawCount - 1);
        // quadratic bezier from house door out toward the dog
        px = (1 - s) * (1 - s) * -0.65 + 2 * (1 - s) * s * 0.0 + s * s * 0.72;
        pz = (1 - s) * (1 - s) * 0.62 + 2 * (1 - s) * s * 1.18 + s * s * 0.6;
        tx = 2 * (1 - s) * (0.0 - -0.65) + 2 * s * (0.72 - 0.0);
        tz = 2 * (1 - s) * (1.18 - 0.62) + 2 * s * (0.6 - 1.18);
        hd = Math.atan2(tx, tz);
        pawMat = new THREE.MeshStandardMaterial({
          color: ACCENT, emissive: ACCENT, emissiveIntensity: 0.5,
          transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false
        });
        pawMats.push(pawMat);
        paw = new THREE.Group();
        m = new THREE.Mesh(padGeo, pawMat);
        m.scale.set(1, 1.2, 1);
        paw.add(m);
        for (ti = -1; ti <= 1; ti++) {
          toe = new THREE.Mesh(toeGeo, pawMat);
          toe.position.set(ti * 0.045, 0.085 - Math.abs(ti) * 0.018, 0);
          paw.add(toe);
        }
        paw.rotation.set(-Math.PI / 2, 0, -hd);
        // alternate left/right steps perpendicular to the heading
        paw.position.set(
          px + Math.cos(hd) * (pi % 2 ? 0.07 : -0.07),
          -0.993,
          pz - Math.sin(hd) * (pi % 2 ? 0.07 : -0.07)
        );
        group.add(paw);
      }

      /* ---- holographic task panels ----------------------------------- */
      function roundedRect(w, h, r) {
        var sh = new THREE.Shape();
        sh.moveTo(-w / 2 + r, -h / 2);
        sh.lineTo(w / 2 - r, -h / 2);
        sh.absarc(w / 2 - r, -h / 2 + r, r, -Math.PI / 2, 0, false);
        sh.lineTo(w / 2, h / 2 - r);
        sh.absarc(w / 2 - r, h / 2 - r, r, 0, Math.PI / 2, false);
        sh.lineTo(-w / 2 + r, h / 2);
        sh.absarc(-w / 2 + r, h / 2 - r, r, Math.PI / 2, Math.PI, false);
        sh.lineTo(-w / 2, -h / 2 + r);
        sh.absarc(-w / 2 + r, -h / 2 + r, r, Math.PI, Math.PI * 1.5, false);
        return sh;
      }
      var panelMats = [], panels = [], tickRowMat = null, tickGroup = null;
      var rowWidths = [0.42, 0.34, 0.38];
      function makePanel(w, h, color, withTick) {
        var g = new THREE.Group();
        var glass = new THREE.MeshStandardMaterial({
          color: color, emissive: color, emissiveIntensity: 0.4,
          transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false
        });
        panelMats.push(glass);
        var shape = roundedRect(w, h, 0.06);
        g.add(new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false }), glass));
        var frame = new THREE.LineLoop(
          new THREE.BufferGeometry().setFromPoints(shape.getPoints(24)),
          new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.85 }));
        frame.position.z = 0.012;
        g.add(frame);
        var header = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.12, 0.05),
          new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 1.1, transparent: true, opacity: 0.9, side: THREE.DoubleSide, depthWrite: false }));
        header.position.set(0, h / 2 - 0.08, 0.014);
        g.add(header);
        var r, rowMat, bullet, bar, rowY;
        for (r = 0; r < 3; r++) {
          rowY = h / 2 - 0.19 - r * (h - 0.28) / 2.6;
          rowMat = new THREE.MeshStandardMaterial({ color: color, emissive: color, emissiveIntensity: 0.55, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
          bullet = new THREE.Mesh(new THREE.CircleGeometry(0.017, 10), rowMat);
          bullet.position.set(-w / 2 + 0.09, rowY, 0.014);
          g.add(bullet);
          bar = new THREE.Mesh(new THREE.PlaneGeometry(rowWidths[r] * w / 0.78, 0.038), rowMat);
          bar.position.set(-w / 2 + 0.14 + rowWidths[r] * w / 0.78 / 2, rowY, 0.014);
          g.add(bar);
          if (withTick && r === 0) {
            tickRowMat = rowMat;
            tickGroup = new THREE.Group();
            tickGroup.position.set(w / 2 - 0.1, rowY, 0.02);
            var tickMat = new THREE.MeshStandardMaterial({ color: ACCENT, emissive: ACCENT, emissiveIntensity: 1.6, transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false });
            var stroke1 = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.06), tickMat);
            stroke1.rotation.z = -Math.PI / 4;
            stroke1.position.set(-0.028, -0.012, 0);
            var stroke2 = new THREE.Mesh(new THREE.PlaneGeometry(0.022, 0.105), tickMat);
            stroke2.rotation.z = Math.PI / 4;
            stroke2.position.set(0.012, 0.008, 0);
            tickGroup.add(stroke1, stroke2);
            g.add(tickGroup);
          }
        }
        return g;
      }
      var panelDefs = [
        { w: 0.78, h: 0.54, color: ACCENT, tick: true, pos: [-0.78, 0.88, 0.3], rot: [-0.04, 0.3, 0], dir: [-0.5, 0.6, 0.35], dist: 1.25 },
        { w: 0.6, h: 0.44, color: ACCENT2, tick: false, pos: [1.02, 0.5, -0.1], rot: [-0.06, -0.4, 0], dir: [0.9, 0.35, 0.2], dist: 1.15 },
        { w: 0.5, h: 0.4, color: ACCENT2, tick: false, pos: [0.18, 1.28, -0.42], rot: [-0.12, 0.08, 0], dir: [0.15, 0.85, -0.3], dist: 1.3 }
      ];
      var d, pd, pg, pw;
      for (d = 0; d < panelDefs.length; d++) {
        pd = panelDefs[d];
        pg = makePanel(pd.w, pd.h, pd.color, pd.tick);
        pg.rotation.set(pd.rot[0], pd.rot[1], pd.rot[2]);
        // wrapper owns placement (scene-manager moves it for exploded view);
        // the inner panel group bobs locally so the two writers never fight
        pw = new THREE.Group();
        pw.position.set(pd.pos[0], pd.pos[1], pd.pos[2]);
        pw.add(pg);
        panels.push({ g: pg, baseY: 0, baseRZ: pd.rot[2], phase: d * 2.1 });
        group.add(pw);
        parts.push({ object: pw, dir: new THREE.Vector3(pd.dir[0], pd.dir[1], pd.dir[2]).normalize(), dist: pd.dist });
      }

      /* ---- exploded-view parts --------------------------------------- */
      parts.push({ object: roof, dir: new THREE.Vector3(0, 1, 0), dist: 1.15 });
      parts.push({ object: wallL, dir: new THREE.Vector3(-1, 0.05, 0.12).normalize(), dist: 0.85 });
      parts.push({ object: wallR, dir: new THREE.Vector3(1, 0.05, 0.12).normalize(), dist: 0.85 });
      parts.push({ object: wallF, dir: new THREE.Vector3(0, 0.1, 1).normalize(), dist: 0.8 });
      parts.push({ object: wallB, dir: new THREE.Vector3(0, 0.1, -1).normalize(), dist: 0.8 });
      parts.push({ object: dog, dir: new THREE.Vector3(0.15, 0.12, 1).normalize(), dist: 1.0 });

      /* ---- animation (zero allocations) ------------------------------- */
      var hoverMix = 0;
      var TICK_PERIOD = 2.5;

      function update(t, dt, ctx) {
        var hov = ctx && ctx.hover ? 1 : 0;
        hoverMix += (hov - hoverMix) * Math.min(1, dt * 6);
        // tail wag — faster and wider when hovered (happy dog)
        tailPivot.rotation.z = Math.sin(t * (7 + hoverMix * 6)) * (0.4 + hoverMix * 0.28);
        // head tilt + subtle look toward the pointer
        headPivot.rotation.z = Math.sin(t * 0.9) * 0.13;
        headPivot.rotation.y = Math.sin(t * 0.55 + 1.7) * 0.16 +
          (ctx && ctx.pointer ? ctx.pointer.x * 0.22 : 0);
        headPivot.rotation.x = Math.sin(t * 0.7 + 0.6) * 0.05;
        // panels bob and glow
        var i, p, glow = 0.4 + hoverMix * 0.35;
        for (i = 0; i < panels.length; i++) {
          p = panels[i];
          p.g.position.y = p.baseY + Math.sin(t * 1.25 + p.phase) * 0.055;
          p.g.rotation.z = p.baseRZ + Math.sin(t * 0.8 + p.phase) * 0.02;
        }
        for (i = 0; i < panelMats.length; i++) panelMats[i].emissiveIntensity = glow * 0.35;
        // checkmark pops every ~2.5s: "walked — done"
        var cyc = t % TICK_PERIOD, sc, e;
        if (cyc < 0.3) {
          e = cyc / 0.3 - 1;
          sc = 1 + e * e * (2.70158 * e + 1.70158); // ease-out-back
        } else if (cyc > TICK_PERIOD - 0.2) {
          sc = (TICK_PERIOD - cyc) / 0.2;
        } else {
          sc = 1;
        }
        if (sc < 0.001) sc = 0.001;
        if (tickGroup) tickGroup.scale.set(sc, sc, sc);
        if (tickRowMat) tickRowMat.emissiveIntensity = 0.55 + (cyc < 0.5 ? (1 - cyc / 0.5) * 1.3 : 0);
        // paw prints pulse in walking order
        var w;
        for (i = 0; i < pawMats.length; i++) {
          w = Math.max(0, Math.sin(t * 1.6 - i * 0.7));
          w = w * w;
          pawMats[i].emissiveIntensity = 0.35 + w * 1.15;
          pawMats[i].opacity = 0.32 + w * 0.55;
        }
        // collar LED breathes
        matCollar.emissiveIntensity = 0.55 + Math.sin(t * 3.2) * 0.3 + hoverMix * 0.3;
      }

      return { group: group, update: update, parts: parts };
    }
  };
})();
