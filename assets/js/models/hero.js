(function () {
  "use strict";
  if (typeof THREE === "undefined") { return; }
  window.ProjectModels = window.ProjectModels || {};

  window.ProjectModels["hero"] = {
    camera: { distance: 6.8, height: 1.9, fov: 38 },

    build: function (THREE, env) {
      if (!THREE) { return null; }

      var palette = (env && env.palette) || {};
      var accent = new THREE.Color(palette.accent || "#00e893");
      var accent2 = new THREE.Color(palette.accent2 || "#4dc9ff");
      var quality = (env && typeof env.quality === "number") ? env.quality : 1;

      var group = new THREE.Group();
      var parts = [];

      var BOARD_TOP = -0.52;

      /* ---------- PCB slab (rounded) ---------- */
      var bw = 3.2, bd = 2.2, br = 0.18, bt = 0.16;
      var shape = new THREE.Shape();
      var hx = bw / 2, hz = bd / 2;
      shape.moveTo(-hx + br, -hz);
      shape.lineTo(hx - br, -hz);
      shape.quadraticCurveTo(hx, -hz, hx, -hz + br);
      shape.lineTo(hx, hz - br);
      shape.quadraticCurveTo(hx, hz, hx - br, hz);
      shape.lineTo(-hx + br, hz);
      shape.quadraticCurveTo(-hx, hz, -hx, hz - br);
      shape.lineTo(-hx, -hz + br);
      shape.quadraticCurveTo(-hx, -hz, -hx + br, -hz);
      var boardGeo = new THREE.ExtrudeGeometry(shape, {
        depth: bt, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 2, curveSegments: 8
      });
      var boardMat = new THREE.MeshStandardMaterial({ color: 0x0d1a14, metalness: 0.35, roughness: 0.62 });
      var board = new THREE.Mesh(boardGeo, boardMat);
      board.rotation.x = -Math.PI / 2;
      board.position.y = BOARD_TOP - bt - 0.015;
      group.add(board);

      /* ---------- MCU package ---------- */
      var chip = new THREE.Group();
      chip.position.y = BOARD_TOP;
      group.add(chip);

      var mcuMat = new THREE.MeshStandardMaterial({ color: 0x11141a, metalness: 0.55, roughness: 0.38 });
      var mcuBody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.13, 0.95), mcuMat);
      mcuBody.position.y = 0.065;
      chip.add(mcuBody);
      var mcuCap = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.02, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x1c222c, metalness: 0.85, roughness: 0.25 }));
      mcuCap.position.y = 0.14;
      chip.add(mcuCap);

      var pinGeo = new THREE.BoxGeometry(0.034, 0.045, 0.1);
      var pinMat = new THREE.MeshStandardMaterial({ color: 0xd9b24a, metalness: 1.0, roughness: 0.3 });
      var pinsPerSide = 9, pinPitch = 0.1, pinOut = 0.53;
      for (var s = 0; s < 4; s++) {
        for (var p = 0; p < pinsPerSide; p++) {
          var pin = new THREE.Mesh(pinGeo, pinMat);
          var off = (p - (pinsPerSide - 1) / 2) * pinPitch;
          if (s === 0) { pin.position.set(off, 0.03, pinOut); }
          else if (s === 1) { pin.position.set(off, 0.03, -pinOut); }
          else if (s === 2) { pin.position.set(pinOut, 0.03, off); pin.rotation.y = Math.PI / 2; }
          else { pin.position.set(-pinOut, 0.03, off); pin.rotation.y = Math.PI / 2; }
          chip.add(pin);
        }
      }

      var glowRingMat = new THREE.MeshBasicMaterial({
        color: accent, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false
      });
      var glowRing = new THREE.Mesh(new THREE.RingGeometry(0.68, 0.8, 48), glowRingMat);
      glowRing.rotation.x = -Math.PI / 2;
      glowRing.position.y = 0.006;
      chip.add(glowRing);

      parts.push({ object: chip, dir: new THREE.Vector3(0, 1, 0), dist: 1.15 });

      /* ---------- copper traces + packet paths ---------- */
      var traceY = BOARD_TOP + 0.006;
      var tracePts = [
        [[0.62, -0.18], [1.02, -0.18], [1.24, -0.4], [1.42, -0.4]],
        [[0.62, 0.2], [0.95, 0.2], [0.95, 0.62], [1.32, 0.62]],
        [[-0.62, -0.25], [-1.02, -0.25], [-1.22, -0.45], [-1.42, -0.45]],
        [[-0.62, 0.15], [-0.9, 0.15], [-0.9, 0.58], [-1.34, 0.58]],
        [[0.25, 0.62], [0.25, 0.9], [-0.28, 0.9]],
        [[-0.2, -0.62], [-0.2, -0.88], [0.52, -0.88]]
      ];
      var traceMat = new THREE.LineBasicMaterial({ color: accent, transparent: true, opacity: 0.8 });
      var paths = []; // { pts: Float32Array(xz pairs), segLen: [], total: Number }
      var i, j;
      for (i = 0; i < tracePts.length; i++) {
        var src = tracePts[i];
        var flat = new Float32Array(src.length * 3);
        var segLen = new Float32Array(src.length - 1);
        var total = 0;
        for (j = 0; j < src.length; j++) {
          flat[j * 3] = src[j][0];
          flat[j * 3 + 1] = traceY;
          flat[j * 3 + 2] = src[j][1];
          if (j > 0) {
            var dx = src[j][0] - src[j - 1][0], dz = src[j][1] - src[j - 1][1];
            segLen[j - 1] = Math.sqrt(dx * dx + dz * dz);
            total += segLen[j - 1];
          }
        }
        var lineGeo = new THREE.BufferGeometry();
        lineGeo.setAttribute("position", new THREE.BufferAttribute(flat, 3));
        group.add(new THREE.Line(lineGeo, traceMat));
        paths.push({ pts: flat, segLen: segLen, total: total });
      }

      var packetCount = quality < 0.5 ? 4 : 6;
      var packetGeo = new THREE.SphereGeometry(0.032, 8, 8);
      var packetMat = new THREE.MeshBasicMaterial({ color: accent });
      var packets = []; // { mesh, path, phase, speed }
      for (i = 0; i < packetCount; i++) {
        var pm = new THREE.Mesh(packetGeo, packetMat);
        group.add(pm);
        packets.push({
          mesh: pm,
          path: paths[i % paths.length],
          phase: (i * 0.37) % 1,
          speed: 0.55 + (i % 3) * 0.14
        });
      }

      /* ---------- SMD caps + resistors ---------- */
      var capGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.1, 14);
      var capMat = new THREE.MeshStandardMaterial({ color: 0x2a3140, metalness: 0.8, roughness: 0.35 });
      var capTopMat = new THREE.MeshStandardMaterial({ color: 0x9aa7b8, metalness: 0.95, roughness: 0.2 });
      var capSpots = [[1.42, -0.4], [1.32, 0.62], [-1.42, -0.45], [-1.34, 0.58], [-0.28, 0.9], [0.52, -0.88]];
      var capDir = new THREE.Vector3();
      for (i = 0; i < capSpots.length; i++) {
        var capGrp = new THREE.Group();
        capGrp.position.set(capSpots[i][0], BOARD_TOP, capSpots[i][1]);
        var capBody = new THREE.Mesh(capGeo, capMat);
        capBody.position.y = 0.05;
        var capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.012, 14), capTopMat);
        capTop.position.y = 0.104;
        capGrp.add(capBody);
        capGrp.add(capTop);
        group.add(capGrp);
        capDir.set(capSpots[i][0], 0, capSpots[i][1]).normalize();
        parts.push({ object: capGrp, dir: capDir.clone(), dist: 0.7 });
      }

      var resGeo = new THREE.BoxGeometry(0.14, 0.045, 0.07);
      var resMat = new THREE.MeshStandardMaterial({ color: 0x1a1d24, metalness: 0.4, roughness: 0.5 });
      var resEndGeo = new THREE.BoxGeometry(0.028, 0.048, 0.072);
      var resEndMat = new THREE.MeshStandardMaterial({ color: 0xc9c2ae, metalness: 0.9, roughness: 0.3 });
      var resSpots = [[0.85, -0.62, 0], [-0.8, 0.72, 1], [0.05, 0.98, 0], [-1.1, -0.05, 1]];
      for (i = 0; i < resSpots.length; i++) {
        var rGrp = new THREE.Group();
        rGrp.position.set(resSpots[i][0], BOARD_TOP + 0.024, resSpots[i][1]);
        if (resSpots[i][2]) { rGrp.rotation.y = Math.PI / 2; }
        var rBody = new THREE.Mesh(resGeo, resMat);
        var rEndA = new THREE.Mesh(resEndGeo, resEndMat);
        var rEndB = new THREE.Mesh(resEndGeo, resEndMat);
        rEndA.position.x = 0.058;
        rEndB.position.x = -0.058;
        rGrp.add(rBody); rGrp.add(rEndA); rGrp.add(rEndB);
        group.add(rGrp);
      }

      /* ---------- floating icosahedron core ---------- */
      var CORE_Y = 0.82;
      var coreGrp = new THREE.Group();
      coreGrp.position.y = CORE_Y;
      group.add(coreGrp);

      var coreMat = new THREE.MeshStandardMaterial({
        color: 0x0c2530, metalness: 0.6, roughness: 0.3,
        emissive: accent2, emissiveIntensity: 0.45
      });
      var coreSolid = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 0), coreMat);
      coreGrp.add(coreSolid);
      var coreWireMat = new THREE.MeshBasicMaterial({ color: accent2, wireframe: true, transparent: true, opacity: 0.5 });
      var coreWire = new THREE.Mesh(new THREE.IcosahedronGeometry(0.52, 0), coreWireMat);
      coreGrp.add(coreWire);

      parts.push({ object: coreGrp, dir: new THREE.Vector3(0, 0.78, 0.62).normalize(), dist: 1.4 });

      /* ---------- gyroscope rings ---------- */
      var ringSegs = quality < 0.5 ? 40 : 72;
      var ringMat = new THREE.MeshStandardMaterial({
        color: 0x11333f, metalness: 0.75, roughness: 0.3,
        emissive: accent2, emissiveIntensity: 0.7
      });
      var ringRadii = [0.68, 0.86, 1.04];
      var ringDirs = [
        new THREE.Vector3(1, 0.35, 0).normalize(),
        new THREE.Vector3(-1, 0.35, 0).normalize(),
        new THREE.Vector3(0, 0.35, -1).normalize()
      ];
      var ringPivots = [];
      for (i = 0; i < 3; i++) {
        var pivot = new THREE.Group();
        pivot.position.y = CORE_Y;
        var ring = new THREE.Mesh(new THREE.TorusGeometry(ringRadii[i], 0.018, 8, ringSegs), ringMat);
        pivot.add(ring);
        group.add(pivot);
        ringPivots.push(pivot);
        parts.push({ object: pivot, dir: ringDirs[i], dist: 1.1 });
      }
      ringPivots[0].rotation.set(Math.PI / 2.6, 0.3, 0);
      ringPivots[1].rotation.set(-Math.PI / 3.2, -0.4, 0.5);
      ringPivots[2].rotation.set(0.5, 0, Math.PI / 2.9);

      /* ---------- update (zero allocations) ---------- */
      var speedMult = 1;
      var emissiveBase = 0.45, emissiveNow = emissiveBase;
      var travel = new Float32Array(packets.length);
      for (i = 0; i < packets.length; i++) {
        travel[i] = packets[i].phase * packets[i].path.total;
      }

      function placePacket(pk, dist) {
        var path = pk.path, seg = path.segLen, pts = path.pts;
        var d = dist, k = 0;
        while (k < seg.length - 1 && d > seg[k]) { d -= seg[k]; k++; }
        var f = seg[k] > 0 ? d / seg[k] : 0;
        if (f > 1) { f = 1; }
        var a = k * 3, b = (k + 1) * 3;
        pk.mesh.position.x = pts[a] + (pts[b] - pts[a]) * f;
        pk.mesh.position.y = pts[a + 1] + 0.02;
        pk.mesh.position.z = pts[a + 2] + (pts[b + 2] - pts[a + 2]) * f;
      }

      function update(t, dt, ctx) {
        var hover = !!(ctx && ctx.hover);

        speedMult += ((hover ? 2.5 : 1) - speedMult) * Math.min(1, dt * 6);
        emissiveNow += ((hover ? 1.1 : emissiveBase) - emissiveNow) * Math.min(1, dt * 5);
        coreMat.emissiveIntensity = emissiveNow;
        coreWireMat.opacity = 0.35 + emissiveNow * 0.3;

        glowRingMat.opacity = 0.35 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.6));

        for (var n = 0; n < packets.length; n++) {
          var pk = packets[n];
          travel[n] = (travel[n] + dt * pk.speed * speedMult) % pk.path.total;
          placePacket(pk, travel[n]);
        }

        coreSolid.rotation.y = t * 0.5;
        coreSolid.rotation.x = t * 0.22;
        coreWire.rotation.y = -t * 0.34;
        coreWire.rotation.z = t * 0.18;
        coreGrp.children[0].position.y = Math.sin(t * 1.1) * 0.05;
        coreGrp.children[1].position.y = Math.sin(t * 1.1) * 0.05;

        ringPivots[0].children[0].rotation.z = t * 0.65;
        ringPivots[1].children[0].rotation.z = -t * 0.5;
        ringPivots[2].children[0].rotation.z = t * 0.4;
      }

      return { group: group, update: update, parts: parts };
    }
  };
})();
