(function () {
  "use strict";
  if (typeof THREE === "undefined") return;

  window.ProjectModels = window.ProjectModels || {};

  window.ProjectModels["collar"] = {
    camera: { distance: 6.2, height: 1.6, fov: 38 },

    build: function (THREE, env) {
      var palette = (env && env.palette) || {};
      var accent = new THREE.Color(palette.accent || "#00e893");
      var accent2 = new THREE.Color(palette.accent2 || "#4dc9ff");

      var geoms = [];
      var mats = [];
      function G(g) { geoms.push(g); return g; }
      function M(m) { mats.push(m); return m; }

      var group = new THREE.Group();

      /* ---------- materials ---------- */
      var strapMat = M(new THREE.MeshStandardMaterial({
        color: 0x232a33, roughness: 0.88, metalness: 0.08
      }));
      var metalMat = M(new THREE.MeshStandardMaterial({
        color: 0xb9c3cd, roughness: 0.32, metalness: 0.92
      }));
      var brassMat = M(new THREE.MeshStandardMaterial({
        color: 0xd6b46a, roughness: 0.38, metalness: 0.85
      }));
      var shellMat = M(new THREE.MeshStandardMaterial({
        color: 0x11161d, roughness: 0.55, metalness: 0.35
      }));
      var pcbMat = M(new THREE.MeshStandardMaterial({
        color: 0x0d6b3e, roughness: 0.6, metalness: 0.15
      }));
      var chipMat = M(new THREE.MeshStandardMaterial({
        color: 0x0a0d11, roughness: 0.4, metalness: 0.3
      }));
      var traceMat = M(new THREE.MeshStandardMaterial({
        color: 0x0d6b3e, emissive: accent, emissiveIntensity: 0.7,
        roughness: 0.5, metalness: 0.2
      }));
      var ledMat = M(new THREE.MeshStandardMaterial({
        color: 0x1a2a22, emissive: accent, emissiveIntensity: 0.1,
        roughness: 0.3, metalness: 0.1
      }));

      /* ---------- collar band (flattened torus strap) ---------- */
      var BAND_R = 1.32;
      var band = new THREE.Mesh(G(new THREE.TorusGeometry(BAND_R, 0.125, 18, 84)), strapMat);
      band.geometry.rotateX(Math.PI / 2);
      band.scale.set(1, 1.75, 1);
      group.add(band);

      /* stitch lines: two thin dashed circles on the outer face */
      var stitchMat = M(new THREE.LineDashedMaterial({
        color: 0x93a0ad, dashSize: 0.075, gapSize: 0.055,
        transparent: true, opacity: 0.75
      }));
      var STITCH_N = 96;
      function stitchRing(y) {
        var pos = new Float32Array((STITCH_N + 1) * 3);
        for (var i = 0; i <= STITCH_N; i++) {
          var a = (i % STITCH_N) / STITCH_N * Math.PI * 2;
          pos[i * 3] = Math.cos(a) * (BAND_R + 0.128);
          pos[i * 3 + 1] = y;
          pos[i * 3 + 2] = Math.sin(a) * (BAND_R + 0.128);
        }
        var g = G(new THREE.BufferGeometry());
        g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        var line = new THREE.Line(g, stitchMat);
        line.computeLineDistances();
        return line;
      }
      group.add(stitchRing(0.145));
      group.add(stitchRing(-0.145));

      /* ---------- buckle (metal frame + prong, at the back) ---------- */
      var buckle = new THREE.Group();
      var barX = G(new THREE.BoxGeometry(0.56, 0.07, 0.08));
      var barY = G(new THREE.BoxGeometry(0.07, 0.62, 0.08));
      var bTop = new THREE.Mesh(barX, metalMat); bTop.position.y = 0.275;
      var bBot = new THREE.Mesh(barX, metalMat); bBot.position.y = -0.275;
      var bL = new THREE.Mesh(barY, metalMat); bL.position.x = -0.245;
      var bR = new THREE.Mesh(barY, metalMat); bR.position.x = 0.245;
      var prong = new THREE.Mesh(G(new THREE.CylinderGeometry(0.024, 0.024, 0.56, 10)), metalMat);
      buckle.add(bTop, bBot, bL, bR, prong);
      buckle.position.set(0, 0, -(BAND_R + 0.14));
      group.add(buckle);

      /* ---------- electronics pod (front, on top of the band) ---------- */
      var pod = new THREE.Group();
      pod.position.set(0, 0.24, BAND_R - 0.05);
      group.add(pod);

      /* base shell sitting on the strap, with side clamps */
      var podBase = new THREE.Group();
      podBase.add(new THREE.Mesh(G(new THREE.BoxGeometry(0.95, 0.16, 0.6)), shellMat));
      var clampGeo = G(new THREE.BoxGeometry(0.1, 0.5, 0.34));
      var clampL = new THREE.Mesh(clampGeo, shellMat); clampL.position.set(-0.4, -0.24, 0);
      var clampR = new THREE.Mesh(clampGeo, shellMat); clampR.position.set(0.4, -0.24, 0);
      podBase.add(clampL, clampR);
      podBase.position.y = 0.1;
      pod.add(podBase);

      /* coin cell battery (inside the base, explodes down) */
      var battery = new THREE.Mesh(G(new THREE.CylinderGeometry(0.17, 0.17, 0.06, 24)), metalMat);
      battery.position.set(0, 0.12, 0);
      pod.add(battery);

      /* PCB assembly: green board, ESP32 shield can, MPU6050, traces, LED */
      var pcb = new THREE.Group();
      pcb.position.y = 0.22;
      pod.add(pcb);
      pcb.add(new THREE.Mesh(G(new THREE.BoxGeometry(0.86, 0.035, 0.52)), pcbMat));

      var can = new THREE.Mesh(G(new THREE.BoxGeometry(0.34, 0.1, 0.3)), metalMat);
      can.position.set(-0.2, 0.07, 0);
      pcb.add(can);
      var canLip = new THREE.Mesh(G(new THREE.BoxGeometry(0.37, 0.02, 0.33)), metalMat);
      canLip.position.set(-0.2, 0.028, 0);
      pcb.add(canLip);

      var mpu = new THREE.Mesh(G(new THREE.BoxGeometry(0.15, 0.045, 0.15)), chipMat);
      mpu.position.set(0.14, 0.04, -0.1);
      pcb.add(mpu);
      var mpuDot = new THREE.Mesh(G(new THREE.CylinderGeometry(0.014, 0.014, 0.05, 8)), traceMat);
      mpuDot.position.set(0.09, 0.042, -0.15);
      pcb.add(mpuDot);

      var traceGeo = G(new THREE.BoxGeometry(0.3, 0.012, 0.02));
      var tr1 = new THREE.Mesh(traceGeo, traceMat); tr1.position.set(0.16, 0.022, 0.08);
      var tr2 = new THREE.Mesh(traceGeo, traceMat); tr2.position.set(0.1, 0.022, 0.16); tr2.scale.x = 0.7;
      var tr3 = new THREE.Mesh(traceGeo, traceMat); tr3.position.set(-0.02, 0.022, -0.2); tr3.scale.x = 0.5;
      pcb.add(tr1, tr2, tr3);

      var led = new THREE.Mesh(G(new THREE.CylinderGeometry(0.035, 0.04, 0.05, 12)), ledMat);
      led.position.set(0.33, 0.045, 0.15);
      pcb.add(led);

      /* lid (explodes up) with accent seam + antenna stub */
      var lid = new THREE.Group();
      lid.position.y = 0.36;
      pod.add(lid);
      lid.add(new THREE.Mesh(G(new THREE.BoxGeometry(0.98, 0.1, 0.64)), shellMat));
      var lidTop = new THREE.Mesh(G(new THREE.BoxGeometry(0.86, 0.05, 0.52)), shellMat);
      lidTop.position.y = 0.07;
      lid.add(lidTop);
      var seamMat = M(new THREE.MeshStandardMaterial({
        color: 0x11161d, emissive: accent2, emissiveIntensity: 0.5,
        roughness: 0.5, metalness: 0.3
      }));
      var seam = new THREE.Mesh(G(new THREE.BoxGeometry(1.0, 0.015, 0.66)), seamMat);
      seam.position.y = -0.05;
      lid.add(seam);
      var ant = new THREE.Mesh(G(new THREE.CylinderGeometry(0.018, 0.018, 0.14, 8)), metalMat);
      ant.position.set(-0.38, 0.14, -0.2);
      lid.add(ant);
      var antTip = new THREE.Mesh(G(new THREE.SphereGeometry(0.03, 10, 8)), metalMat);
      antTip.position.set(-0.38, 0.22, -0.2);
      lid.add(antTip);

      /* ---------- hanging bone tag (front-bottom, swings) ---------- */
      var tag = new THREE.Group();
      tag.position.set(0, -0.235, BAND_R + 0.06);
      group.add(tag);

      var hoop = new THREE.Mesh(G(new THREE.TorusGeometry(0.075, 0.018, 10, 22)), metalMat);
      hoop.position.y = -0.06;
      tag.add(hoop);

      var bone = new THREE.Group();
      bone.position.y = -0.28;
      tag.add(bone);
      var boneBar = new THREE.Mesh(G(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 14)), brassMat);
      boneBar.rotation.z = Math.PI / 2;
      bone.add(boneBar);
      var lobeGeo = G(new THREE.SphereGeometry(0.095, 14, 12));
      var lx = [-0.17, -0.17, 0.17, 0.17];
      var ly = [0.06, -0.06, 0.06, -0.06];
      for (var li = 0; li < 4; li++) {
        var lobe = new THREE.Mesh(lobeGeo, brassMat);
        lobe.position.set(lx[li], ly[li], 0);
        bone.add(lobe);
      }
      bone.scale.z = 0.55;

      /* ---------- orbiting accel-waveform ribbon ---------- */
      var RIB_N = 168;
      var ribY = 0.02;
      var ribPos = new Float32Array((RIB_N + 1) * 3);
      var ribTheta = new Float32Array(RIB_N + 1);
      for (var ri = 0; ri <= RIB_N; ri++) {
        var th = (ri % RIB_N) / RIB_N * Math.PI * 2;
        ribTheta[ri] = th;
        ribPos[ri * 3] = Math.cos(th) * 1.78;
        ribPos[ri * 3 + 1] = ribY;
        ribPos[ri * 3 + 2] = Math.sin(th) * 1.78;
      }
      var ribGeo = G(new THREE.BufferGeometry());
      var ribAttr = new THREE.BufferAttribute(ribPos, 3);
      ribGeo.setAttribute("position", ribAttr);
      var ribMat = M(new THREE.LineBasicMaterial({
        color: accent, transparent: true, opacity: 0.8
      }));
      var ribbon = new THREE.Line(ribGeo, ribMat);
      var ribbonSpin = new THREE.Group();
      ribbonSpin.add(ribbon);
      group.add(ribbonSpin);

      /* ---------- animation state (preallocated) ---------- */
      var hoverAmt = 0;
      var HEART = 1.55; /* heartbeat period, seconds */

      function update(t, dt, ctx) {
        var hoverTarget = ctx && ctx.hover ? 1 : 0;
        hoverAmt += (hoverTarget - hoverAmt) * Math.min(1, dt * 6);

        /* status LED: double-blink heartbeat */
        var p = t % HEART;
        var on = (p < 0.11) || (p > 0.26 && p < 0.37);
        var target = on ? 2.4 + hoverAmt * 0.8 : 0.08;
        ledMat.emissiveIntensity += (target - ledMat.emissiveIntensity) * Math.min(1, dt * 26);

        /* PCB trace shimmer */
        traceMat.emissiveIntensity = 0.55 + Math.sin(t * 2.1) * 0.2 + hoverAmt * 0.35;

        /* orbiting accel waveform */
        ribbonSpin.rotation.y = t * 0.42;
        var amp = 0.11 + hoverAmt * 0.11;
        for (var i = 0; i <= RIB_N; i++) {
          var a = ribTheta[i];
          ribPos[i * 3 + 1] = ribY + amp * (
            Math.sin(a * 5 - t * 3.3) * 0.6 +
            Math.sin(a * 13 + t * 5.4) * 0.22 +
            Math.sin(a * 2 + t * 1.4) * 0.34
          );
        }
        ribAttr.needsUpdate = true;
        ribMat.opacity = 0.62 + hoverAmt * 0.3;

        /* bone tag: gentle pendulum swing */
        tag.rotation.z = Math.sin(t * 1.35) * 0.085;
        tag.rotation.x = Math.sin(t * 0.9 + 1.2) * 0.05;
      }

      function dispose() {
        var i;
        for (i = 0; i < geoms.length; i++) geoms[i].dispose();
        for (i = 0; i < mats.length; i++) mats[i].dispose();
      }

      return {
        group: group,
        update: update,
        parts: [
          { object: lid, dir: new THREE.Vector3(0, 1, 0), dist: 1.15 },
          { object: pcb, dir: new THREE.Vector3(0, 1, 0), dist: 0.65 },
          { object: battery, dir: new THREE.Vector3(0, -1, 0), dist: 0.6 },
          { object: tag, dir: new THREE.Vector3(0, -0.6, 0.8), dist: 0.9 }
        ],
        dispose: dispose
      };
    }
  };
})();
