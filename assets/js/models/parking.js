(function () {
  "use strict";
  if (typeof THREE === "undefined") { return; }
  window.ProjectModels = window.ProjectModels || {};

  window.ProjectModels["parking"] = {
    camera: { distance: 6.9, height: 2.3, fov: 36 },

    build: function (THREE, env) {
      var palette = (env && env.palette) || {};
      var quality = (env && typeof env.quality === "number") ? env.quality : 1;
      var ACCENT = new THREE.Color(palette.accent || "#00e893");
      var ACCENT2 = new THREE.Color(palette.accent2 || "#4dc9ff");
      var WARN = new THREE.Color(palette.warn || "#ffb454");
      var DANGER = new THREE.Color(palette.danger || "#ff5c57");

      var group = new THREE.Group();
      var GROUND_TOP = -0.9;
      var wheelSegs = quality < 0.5 ? 10 : 16;

      /* ---------- shared materials / geometries ---------- */
      var asphaltMat = new THREE.MeshStandardMaterial({ color: 0x181d24, roughness: 0.96, metalness: 0.05 });
      var paintMat = new THREE.MeshStandardMaterial({
        color: 0xcfd8de, roughness: 0.7, metalness: 0.0,
        emissive: ACCENT.clone().multiplyScalar(0.28)
      });
      var tireMat = new THREE.MeshStandardMaterial({ color: 0x101215, roughness: 0.9, metalness: 0.1 });
      var hubMat = new THREE.MeshStandardMaterial({ color: 0x9aa4ad, roughness: 0.35, metalness: 0.85 });
      var glassMat = new THREE.MeshStandardMaterial({
        color: 0x9fd8ff, roughness: 0.08, metalness: 0.4,
        transparent: true, opacity: 0.38, depthWrite: false
      });
      var trimMat = new THREE.MeshStandardMaterial({ color: 0x22262c, roughness: 0.6, metalness: 0.55 });
      var headMat = new THREE.MeshStandardMaterial({
        color: 0xfff6d8, emissive: 0xfff0b8, emissiveIntensity: 0.9, roughness: 0.4
      });
      var tailMat = new THREE.MeshStandardMaterial({
        color: DANGER.getHex(), emissive: DANGER.getHex(), emissiveIntensity: 0.8, roughness: 0.4
      });

      var wheelGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.085, wheelSegs);
      wheelGeo.rotateZ(Math.PI / 2);
      var hubGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.09, wheelSegs);
      hubGeo.rotateZ(Math.PI / 2);
      var lightGeo = new THREE.BoxGeometry(0.1, 0.05, 0.03);

      /* ---------- ground slab + painted slots ---------- */
      var ground = new THREE.Group();
      var slab = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.12, 2.5), asphaltMat);
      slab.position.y = GROUND_TOP - 0.06;
      ground.add(slab);
      var stripeGeo = new THREE.BoxGeometry(0.05, 0.012, 1.7);
      var xs = [-1.65, -0.55, 0.55, 1.65];
      for (var i = 0; i < 4; i++) {
        var stripe = new THREE.Mesh(stripeGeo, paintMat);
        stripe.position.set(xs[i], GROUND_TOP + 0.006, 0.05);
        ground.add(stripe);
      }
      var backLine = new THREE.Mesh(new THREE.BoxGeometry(3.35, 0.012, 0.05), paintMat);
      backLine.position.set(0, GROUND_TOP + 0.006, -0.8);
      ground.add(backLine);
      group.add(ground);

      /* ---------- car factory ---------- */
      function makeCar(paintColor) {
        var car = new THREE.Group();
        var bodyMat = new THREE.MeshStandardMaterial({ color: paintColor, roughness: 0.32, metalness: 0.75 });
        var body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 1.28), bodyMat);
        body.position.y = 0.23;
        car.add(body);
        var skirt = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.08, 1.2), trimMat);
        skirt.position.y = 0.14;
        car.add(skirt);
        var cabin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.68), bodyMat);
        cabin.position.set(0, 0.445, -0.06);
        car.add(cabin);
        var canopy = new THREE.Mesh(new THREE.BoxGeometry(0.47, 0.13, 0.64), glassMat);
        canopy.position.set(0, 0.395, -0.06);
        car.add(canopy);
        var hood = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.05, 0.34), bodyMat);
        hood.position.set(0, 0.345, 0.42);
        car.add(hood);
        var wheels = [];
        var wx = [-0.31, 0.31], wz = [0.42, -0.42];
        for (var a = 0; a < 2; a++) {
          for (var b = 0; b < 2; b++) {
            var w = new THREE.Mesh(wheelGeo, tireMat);
            w.position.set(wx[a], 0.13, wz[b]);
            car.add(w);
            var hub = new THREE.Mesh(hubGeo, hubMat);
            hub.position.copy(w.position);
            car.add(hub);
            wheels.push(w, hub);
          }
        }
        var lx = [-0.19, 0.19];
        for (var c = 0; c < 2; c++) {
          var hl = new THREE.Mesh(lightGeo, headMat);
          hl.position.set(lx[c], 0.26, 0.645);
          car.add(hl);
          var tl = new THREE.Mesh(lightGeo, tailMat);
          tl.position.set(lx[c], 0.26, -0.645);
          car.add(tl);
        }
        car.userData.wheels = wheels;
        return car;
      }

      /* ---------- wireframe bounding box ---------- */
      var bboxGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.78, 0.56, 1.5));
      function makeBBox() {
        var mat = new THREE.LineBasicMaterial({ color: ACCENT.getHex(), transparent: true, opacity: 0.7 });
        var box = new THREE.LineSegments(bboxGeo, mat);
        box.position.y = 0.28;
        return box;
      }

      /* ---------- mono canvas label sprite ---------- */
      var labelTextures = [];
      function makeLabel(text) {
        var cv = document.createElement("canvas");
        cv.width = 256; cv.height = 64;
        var cx = cv.getContext("2d");
        cx.clearRect(0, 0, 256, 64);
        cx.font = "700 30px 'JetBrains Mono', ui-monospace, monospace";
        cx.textAlign = "center"; cx.textBaseline = "middle";
        cx.shadowColor = palette.accent || "#00e893";
        cx.shadowBlur = 10;
        cx.fillStyle = palette.accent || "#00e893";
        cx.fillText(text, 128, 34);
        cx.shadowBlur = 0;
        cx.strokeStyle = palette.accent || "#00e893";
        cx.lineWidth = 3;
        cx.strokeRect(6, 6, 20, 20); cx.clearRect(12, 12, 20, 20);
        cx.strokeRect(230, 38, 20, 20); cx.clearRect(224, 32, 20, 20);
        var tex = new THREE.CanvasTexture(cv);
        labelTextures.push(tex);
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
        sp.scale.set(1.0, 0.25, 1);
        return sp;
      }

      /* ---------- two parked cars (slots 0 and 2) ---------- */
      var car0 = makeCar(ACCENT2.getHex());
      car0.position.set(-1.1, GROUND_TOP, 0.05);
      car0.add(makeBBox());
      group.add(car0);

      var car1 = makeCar(0xd9dee2);
      car1.position.set(1.1, GROUND_TOP, 0.05);
      car1.add(makeBBox());
      group.add(car1);

      var label0 = makeLabel("CAR 0.97");
      label0.position.set(-1.1, GROUND_TOP + 0.95, 0.05);
      group.add(label0);

      var label1 = makeLabel("EV-5842");
      label1.position.set(1.1, GROUND_TOP + 0.95, 0.05);
      group.add(label1);

      /* ---------- moving car (loops into / out of middle slot) ---------- */
      var moverWrap = new THREE.Group();          // exploded by scene-manager
      var mover = new THREE.Group();              // translated by update()
      var car2 = makeCar(ACCENT.getHex());
      car2.rotation.y = Math.PI;                  // nose faces -Z while driving in
      mover.add(car2);
      mover.add(makeBBox());
      var label2 = makeLabel("CAR 0.91");
      label2.position.y = 0.95;
      mover.add(label2);
      mover.position.set(0, GROUND_TOP, 1.5);
      moverWrap.add(mover);
      group.add(moverWrap);

      /* ---------- corner camera pole + frustum ---------- */
      var pole = new THREE.Group();
      pole.position.set(-1.62, GROUND_TOP, -1.05);
      var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 1.55, 10), trimMat);
      mast.position.y = 0.775;
      pole.add(mast);
      var footRing = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.05, 12), hubMat);
      footRing.position.y = 0.025;
      pole.add(footRing);
      var head = new THREE.Group();
      head.position.y = 1.55;
      var housing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.32), trimMat);
      housing.position.z = 0.06;
      head.add(housing);
      var visor = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.03, 0.34), hubMat);
      visor.position.set(0, 0.085, 0.06);
      head.add(visor);
      var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.06, 12), new THREE.MeshStandardMaterial({
        color: 0x0a0d10, roughness: 0.1, metalness: 0.3,
        emissive: ACCENT2.getHex(), emissiveIntensity: 0.35
      }));
      lens.rotation.x = Math.PI / 2;
      lens.position.z = 0.24;
      head.add(lens);
      var ledMat = new THREE.MeshStandardMaterial({
        color: DANGER.getHex(), emissive: DANGER.getHex(), emissiveIntensity: 1
      });
      var led = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), ledMat);
      led.position.set(0.08, 0.09, -0.08);
      head.add(led);
      var frustumGeo = new THREE.ConeGeometry(0.85, 2.4, 4, 1, true);
      frustumGeo.translate(0, -1.2, 0);           // apex at origin
      frustumGeo.rotateY(Math.PI / 4);            // square cross-section aligned
      var frustumMat = new THREE.MeshStandardMaterial({
        color: ACCENT.getHex(), emissive: ACCENT.getHex(), emissiveIntensity: 0.5,
        transparent: true, opacity: 0.1, depthWrite: false, side: THREE.DoubleSide
      });
      var frustum = new THREE.Mesh(frustumGeo, frustumMat);
      frustum.position.z = 0.24;
      frustum.rotation.x = -Math.PI / 2 + 0.55;   // aim down-forward into the lot
      head.add(frustum);
      head.rotation.y = 0;
      pole.add(head);
      group.add(pole);

      /* ---------- update (zero allocations) ---------- */
      var moverWheels = car2.userData.wheels;
      var wheels0 = car0.userData.wheels;
      var bboxMats = [car0.children[car0.children.length - 1].material,
                      car1.children[car1.children.length - 1].material,
                      mover.children[1].material];
      var lastZ = mover.position.z;
      var CYCLE = 12;
      var Z_OUT = 1.5, Z_IN = 0.12;
      var HEAD_BASE = 0.72;                       // yaw aiming head toward lot center

      function smooth(p) { return p * p * (3 - 2 * p); }

      function pathZ(t) {
        var p = t % CYCLE;
        if (p < 4) { return Z_OUT + (Z_IN - Z_OUT) * smooth(p / 4); }        // drive in
        if (p < 7) { return Z_IN; }                                          // dwell parked
        if (p < 11) { return Z_IN + (Z_OUT - Z_IN) * smooth((p - 7) / 4); }  // back out
        return Z_OUT;                                                        // dwell outside
      }

      function update(t, dt, ctx) {
        var hover = !!(ctx && ctx.hover);

        // moving car + wheel spin
        var z = pathZ(t);
        mover.position.z = z;
        var dz = z - lastZ;
        lastZ = z;
        var spin = dz / 0.13;
        for (var i = 0; i < moverWheels.length; i++) {
          moverWheels[i].rotation.x -= spin;
        }

        // camera head sweep, biased to track the mover while it is close
        var sweep = Math.sin(t * (hover ? 0.9 : 0.5)) * 0.55;
        head.rotation.y = HEAD_BASE + sweep;
        frustumMat.opacity = 0.08 + 0.05 * Math.sin(t * 2.1);

        // LED double-blink heartbeat
        var s = t % 1.6;
        ledMat.emissiveIntensity = (s < 0.09 || (s > 0.24 && s < 0.33)) ? 1.6 : 0.08;

        // pulsing bounding boxes (offset phases so they breathe independently)
        var rate = hover ? 5 : 3;
        for (var j = 0; j < 3; j++) {
          bboxMats[j].opacity = 0.42 + 0.34 * Math.sin(t * rate + j * 2.1);
        }

        // parked cars: faint idle settle on tires (suspension shimmer)
        var settle = Math.sin(t * 1.3) * 0.0035;
        wheels0[0].position.y = 0.13 + settle;
        wheels0[1].position.y = 0.13 + settle;
      }

      /* ---------- exploded-view parts ---------- */
      var parts = [
        { object: car0, dir: new THREE.Vector3(0, 1, 0), dist: 0.9 },
        { object: car1, dir: new THREE.Vector3(0, 1, 0), dist: 1.25 },
        { object: moverWrap, dir: new THREE.Vector3(0, 1, 0), dist: 1.05 },
        { object: pole, dir: new THREE.Vector3(-0.18, 1, -0.12).normalize(), dist: 1.2 },
        { object: label0, dir: new THREE.Vector3(0, 1, 0), dist: 1.7 },
        { object: label1, dir: new THREE.Vector3(0, 1, 0), dist: 1.8 }
      ];

      function dispose() {
        for (var i = 0; i < labelTextures.length; i++) {
          labelTextures[i].dispose();
        }
      }

      return { group: group, update: update, parts: parts, dispose: dispose };
    }
  };
})();
