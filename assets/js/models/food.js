(function () {
  "use strict";
  if (typeof THREE === "undefined") { return; }
  window.ProjectModels = window.ProjectModels || {};

  window.ProjectModels["food"] = {
    camera: { distance: 5.8, height: 2.7, fov: 38 },

    build: function (THREE, env) {
      var palette = (env && env.palette) || {};
      var group = new THREE.Group();

      var COL = {
        accent:  new THREE.Color(palette.accent  || "#00e893"),
        accent2: new THREE.Color(palette.accent2 || "#4dc9ff"),
        warn:    new THREE.Color(palette.warn    || "#ffb454"),
        danger:  new THREE.Color(palette.danger  || "#ff5c57")
      };
      var PLATE_Y = -0.55;

      /* ---------- plate (lathe ceramic) ---------- */
      var profile = [
        [0.00, 0.100], [0.60, 0.105], [0.95, 0.110], [1.28, 0.160],
        [1.62, 0.330], [1.78, 0.385], [1.83, 0.345], [1.70, 0.230],
        [1.32, 0.055], [0.88, 0.000], [0.56, 0.000], [0.52, -0.105],
        [0.40, -0.110], [0.02, -0.030]
      ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
      var plateMat = new THREE.MeshStandardMaterial({
        color: 0xe8ecef, roughness: 0.32, metalness: 0.05, side: THREE.DoubleSide
      });
      var plate = new THREE.Mesh(new THREE.LatheGeometry(profile, 48), plateMat);
      plate.position.y = PLATE_Y;
      group.add(plate);

      /* thin glazed rim ring for a deliberate silhouette */
      var rimMat = new THREE.MeshStandardMaterial({ color: 0xcfd8dd, roughness: 0.22, metalness: 0.15 });
      var rim = new THREE.Mesh(new THREE.TorusGeometry(1.795, 0.018, 8, 64), rimMat);
      rim.rotation.x = Math.PI / 2;
      rim.position.y = PLATE_Y + 0.372;
      group.add(rim);

      var FOOD_TOP = PLATE_Y + 0.125; /* plate well surface */

      /* ---------- rice mound (flattened, jittered hemisphere) ---------- */
      var riceGroup = new THREE.Group();
      riceGroup.position.set(-0.62, FOOD_TOP, -0.42);
      var riceGeo = new THREE.SphereGeometry(0.52, 26, 14, 0, Math.PI * 2, 0, Math.PI / 2);
      var rp = riceGeo.attributes.position;
      for (var ri = 0; ri < rp.count; ri++) {
        var ry = rp.getY(ri);
        if (ry > 0.02) {
          rp.setX(ri, rp.getX(ri) + (Math.sin(ri * 12.9898) * 43758.5453 % 1) * 0.018);
          rp.setZ(ri, rp.getZ(ri) + (Math.sin(ri * 78.233) * 12543.123 % 1) * 0.018);
        }
      }
      riceGeo.computeVertexNormals();
      var rice = new THREE.Mesh(riceGeo, new THREE.MeshStandardMaterial({
        color: 0xf2ead6, roughness: 0.95, metalness: 0.0
      }));
      rice.scale.y = 0.55;
      riceGroup.add(rice);
      group.add(riceGroup);

      /* ---------- broccoli (3 florets: stem + sphere crown clusters) ---------- */
      var brocGroup = new THREE.Group();
      brocGroup.position.set(0.72, FOOD_TOP, -0.55);
      var stemMat = new THREE.MeshStandardMaterial({ color: 0x9dbb62, roughness: 0.85 });
      var crownMat = new THREE.MeshStandardMaterial({ color: 0x3f7d2e, roughness: 0.9 });
      var stemGeo = new THREE.CylinderGeometry(0.05, 0.075, 0.17, 10);
      var crownGeo = new THREE.SphereGeometry(0.105, 12, 10);
      var floretPos = [[-0.22, 0, 0.1], [0.16, 0, -0.14], [0.12, 0, 0.24]];
      var bumpPos = [
        [0, 0.06, 0], [0.08, 0.02, 0.05], [-0.08, 0.02, 0.04],
        [0.02, 0.03, -0.09], [-0.04, 0.05, -0.04]
      ];
      for (var f = 0; f < 3; f++) {
        var floret = new THREE.Group();
        floret.position.set(floretPos[f][0], 0, floretPos[f][2]);
        var stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.y = 0.085;
        floret.add(stem);
        for (var b = 0; b < bumpPos.length; b++) {
          var bump = new THREE.Mesh(crownGeo, crownMat);
          bump.position.set(bumpPos[b][0], 0.2 + bumpPos[b][1], bumpPos[b][2]);
          var s = 0.85 + 0.3 * ((f * 5 + b) % 3) / 2;
          bump.scale.setScalar(s);
          floret.add(bump);
        }
        floret.rotation.y = f * 2.1;
        brocGroup.add(floret);
      }
      group.add(brocGroup);

      /* ---------- salmon slab (rounded box + fat stripes) ---------- */
      var salmonGroup = new THREE.Group();
      salmonGroup.position.set(0.55, FOOD_TOP, 0.52);
      salmonGroup.rotation.y = -0.5;
      var salMat = new THREE.MeshStandardMaterial({ color: 0xef7a4f, roughness: 0.6, metalness: 0.02 });
      var salBody = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.15, 0.46), salMat);
      salBody.position.y = 0.075;
      salmonGroup.add(salBody);
      var salTop = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.05, 0.40),
        new THREE.MeshStandardMaterial({ color: 0xf68d63, roughness: 0.5 }));
      salTop.position.y = 0.165;
      salmonGroup.add(salTop);
      var fatMat = new THREE.MeshStandardMaterial({ color: 0xffe0cf, roughness: 0.55 });
      var fatGeo = new THREE.BoxGeometry(0.02, 0.055, 0.42);
      for (var fs = 0; fs < 3; fs++) {
        var stripe = new THREE.Mesh(fatGeo, fatMat);
        stripe.position.set(-0.2 + fs * 0.2, 0.168, 0);
        stripe.rotation.y = 0.28;
        salmonGroup.add(stripe);
      }
      group.add(salmonGroup);

      /* ---------- tomato slices (2 flattened cylinders) ---------- */
      var tomatoGroup = new THREE.Group();
      tomatoGroup.position.set(-0.55, FOOD_TOP, 0.62);
      var tomOutMat = new THREE.MeshStandardMaterial({ color: 0xd93a2e, roughness: 0.42, metalness: 0.02 });
      var tomInMat = new THREE.MeshStandardMaterial({ color: 0xf5705c, roughness: 0.5 });
      var tomOutGeo = new THREE.CylinderGeometry(0.23, 0.23, 0.05, 24);
      var tomInGeo = new THREE.CylinderGeometry(0.165, 0.165, 0.054, 24);
      var tomOffsets = [[-0.12, 0.025, 0.05, 0], [0.16, 0.025, -0.06, 0.9]];
      for (var tt = 0; tt < 2; tt++) {
        var slice = new THREE.Group();
        slice.position.set(tomOffsets[tt][0], tomOffsets[tt][1], tomOffsets[tt][2]);
        slice.rotation.y = tomOffsets[tt][3];
        slice.add(new THREE.Mesh(tomOutGeo, tomOutMat));
        var inner = new THREE.Mesh(tomInGeo, tomInMat);
        slice.add(inner);
        tomatoGroup.add(slice);
      }
      group.add(tomatoGroup);

      /* ---------- overlay shells (scaled clones, class-colored) ---------- */
      var foodGroups = [riceGroup, brocGroup, salmonGroup, tomatoGroup];
      var classColors = [COL.accent, COL.accent2, COL.warn, COL.danger];
      var overlayMats = [];
      var overlays = [];
      for (var oi = 0; oi < 4; oi++) {
        var mat = new THREE.MeshBasicMaterial({
          color: classColors[oi], transparent: true, opacity: 0.05,
          depthWrite: false, side: THREE.DoubleSide
        });
        overlayMats.push(mat);
        var shell = foodGroups[oi].clone(true);
        shell.position.set(0, 0, 0);
        shell.rotation.set(0, 0, 0);
        shell.scale.setScalar(1.13);
        shell.traverse(function (node) { if (node.isMesh) { node.material = mat; } });
        foodGroups[oi].add(shell);
        overlays.push(shell);
      }

      /* ---------- sprite labels (mono CanvasTexture) ---------- */
      function makeLabel(text, cssColor) {
        var cv = document.createElement("canvas");
        cv.width = 256; cv.height = 56;
        var cx = cv.getContext("2d");
        cx.font = "500 24px 'JetBrains Mono', ui-monospace, monospace";
        cx.textBaseline = "middle";
        cx.fillStyle = cssColor;
        cx.globalAlpha = 0.9;
        cx.fillText("[ " + text + " ]", 8, 30);
        var tex = new THREE.CanvasTexture(cv);
        tex.minFilter = THREE.LinearFilter;
        var sm = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
        var sp = new THREE.Sprite(sm);
        sp.scale.set(1.15, 0.25, 1);
        return sp;
      }
      var labelDefs = [
        ["rice 212 kcal", "#" + COL.accent.getHexString()],
        ["broccoli 55 kcal", "#" + COL.accent2.getHexString()],
        ["salmon 208 kcal", "#" + COL.warn.getHexString()],
        ["tomato 18 kcal", "#" + COL.danger.getHexString()]
      ];
      var labels = [];
      var labelBaseY = [0.78, 0.92, 0.62, 0.55];
      for (var li = 0; li < 4; li++) {
        var lbl = makeLabel(labelDefs[li][0], labelDefs[li][1]);
        lbl.position.y = labelBaseY[li];
        foodGroups[li].add(lbl);
        labels.push(lbl);
      }

      /* ---------- scan-grid plane (vertical, sweeps along X) ---------- */
      var gridCv = document.createElement("canvas");
      gridCv.width = 128; gridCv.height = 64;
      var gcx = gridCv.getContext("2d");
      gcx.strokeStyle = "#" + COL.accent.getHexString();
      gcx.globalAlpha = 0.8;
      gcx.lineWidth = 1;
      for (var gx = 0; gx <= 128; gx += 16) {
        gcx.beginPath(); gcx.moveTo(gx + 0.5, 0); gcx.lineTo(gx + 0.5, 64); gcx.stroke();
      }
      for (var gy = 0; gy <= 64; gy += 16) {
        gcx.beginPath(); gcx.moveTo(0, gy + 0.5); gcx.lineTo(128, gy + 0.5); gcx.stroke();
      }
      var gridTex = new THREE.CanvasTexture(gridCv);
      gridTex.wrapS = gridTex.wrapT = THREE.RepeatWrapping;
      gridTex.repeat.set(3, 1.5);
      var scanMat = new THREE.MeshBasicMaterial({
        map: gridTex, color: COL.accent, transparent: true, opacity: 0,
        depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending
      });
      var scan = new THREE.Mesh(new THREE.PlaneGeometry(3.9, 1.1), scanMat);
      scan.rotation.y = Math.PI / 2;
      scan.position.set(-2.2, PLATE_Y + 0.72, 0);
      group.add(scan);

      /* ---------- update state (fully preallocated) ---------- */
      var foodX = [riceGroup.position.x, brocGroup.position.x, salmonGroup.position.x, tomatoGroup.position.x];
      var flash = [0, 0, 0, 0];
      var prevScanX = -2.2;
      var hoverAmt = 0;
      var CYCLE = 1.6, SCAN_PERIOD = 4.0, SCAN_SPAN = 0.34;

      function update(t, dt, ctx) {
        if (!(dt > 0)) { dt = 0.016; }
        var hov = ctx && ctx.hover ? 1 : 0;
        hoverAmt += (hov - hoverAmt) * Math.min(1, dt * 6);
        var speed = 1 + hoverAmt * 0.8;

        /* scan sweep */
        var phase = (t % SCAN_PERIOD) / SCAN_PERIOD;
        var sx, sOp;
        if (phase < SCAN_SPAN) {
          var p = phase / SCAN_SPAN;
          sx = -2.2 + p * 4.4;
          sOp = 0.5 * Math.sin(p * Math.PI);
          scan.visible = true;
        } else {
          sx = -2.2; sOp = 0;
          scan.visible = false;
        }
        scan.position.x = sx;
        scanMat.opacity = sOp * (0.7 + hoverAmt * 0.5);
        gridTex.offset.y = t * 0.4;

        var i;
        for (i = 0; i < 4; i++) {
          if (prevScanX < foodX[i] && sx >= foodX[i] && scan.visible) { flash[i] = 1; }
          flash[i] = Math.max(0, flash[i] - dt * 1.8);
        }
        prevScanX = scan.visible ? sx : -2.2;

        /* class cycling pulse */
        var active = Math.floor(t / CYCLE) % 4;
        var pulse = 0.16 + 0.13 * Math.sin(t * 6 * speed);
        var ex = ctx ? ctx.explode || 0 : 0;
        for (i = 0; i < 4; i++) {
          var op = 0.045 + flash[i] * 0.35 + ex * 0.12;
          if (i === active) { op += pulse * (1 + hoverAmt * 0.5); }
          overlayMats[i].opacity = Math.min(0.6, op);
          labels[i].material.opacity = 0.5 + (i === active ? 0.5 : flash[i] * 0.4);
          labels[i].position.y = labelBaseY[i] + 0.04 * Math.sin(t * 1.3 + i * 1.7);
        }
      }

      /* ---------- exploded-view parts ---------- */
      var UP = new THREE.Vector3(0, 1, 0);
      var parts = [
        { object: riceGroup,    dir: UP.clone(),                                dist: 0.55 },
        { object: brocGroup,    dir: UP.clone(),                                dist: 0.85 },
        { object: salmonGroup,  dir: new THREE.Vector3(0.25, 0.95, 0.19).normalize(), dist: 0.70 },
        { object: tomatoGroup,  dir: new THREE.Vector3(-0.2, 0.95, 0.24).normalize(), dist: 1.00 },
        { object: overlays[0],  dir: UP.clone(), dist: 0.55 },
        { object: overlays[1],  dir: UP.clone(), dist: 0.55 },
        { object: overlays[2],  dir: UP.clone(), dist: 0.55 },
        { object: overlays[3],  dir: UP.clone(), dist: 0.55 },
        { object: plate,        dir: new THREE.Vector3(0, -1, 0),               dist: 0.70 },
        { object: rim,          dir: new THREE.Vector3(0, -1, 0),               dist: 0.70 }
      ];

      return { group: group, update: update, parts: parts };
    }
  };
})();
