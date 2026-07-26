(function () {
  "use strict";
  if (typeof window === "undefined" || typeof THREE === "undefined") return;
  window.ProjectModels = window.ProjectModels || {};

  window.ProjectModels["vibe"] = {
    camera: { distance: 6.4, height: 2.3, fov: 37 },

    build: function (THREE, env) {
      if (!THREE || !THREE.Group) return null;

      var palette = (env && env.palette) || {};
      var accent = new THREE.Color(palette.accent || "#00e893");
      var accent2 = new THREE.Color(palette.accent2 || "#4dc9ff");
      var warn = new THREE.Color(palette.warn || "#ffb454");

      var group = new THREE.Group();
      var parts = [];

      // ---- materials (shared where possible) --------------------------------
      var matBody = new THREE.MeshStandardMaterial({ color: 0x151c26, metalness: 0.55, roughness: 0.42 });
      var matPlate = new THREE.MeshStandardMaterial({ color: 0x212c3b, metalness: 0.72, roughness: 0.3 });
      var matTrim = new THREE.MeshStandardMaterial({ color: 0x8b99ab, metalness: 0.92, roughness: 0.26 });
      var matDark = new THREE.MeshStandardMaterial({ color: 0x0a0e13, metalness: 0.3, roughness: 0.62 });
      var matGroove = new THREE.MeshStandardMaterial({ color: 0x05070a, metalness: 0.5, roughness: 0.35 });
      var matCone = new THREE.MeshStandardMaterial({ color: 0x11151b, metalness: 0.1, roughness: 0.85 });
      var matLabelL = new THREE.MeshStandardMaterial({ color: 0x0c1310, emissive: accent, emissiveIntensity: 0.55, roughness: 0.5 });
      var matLabelR = new THREE.MeshStandardMaterial({ color: 0x0c1013, emissive: accent2, emissiveIntensity: 0.55, roughness: 0.5 });
      var matRing = new THREE.MeshStandardMaterial({ color: 0x1a2230, emissive: accent, emissiveIntensity: 0.4, metalness: 0.6, roughness: 0.4 });
      var matScreen = new THREE.MeshStandardMaterial({ color: 0x06110c, emissive: accent2, emissiveIntensity: 0.8, roughness: 0.4 });
      var matTick = new THREE.MeshStandardMaterial({ color: 0x0a0e13, emissive: accent, emissiveIntensity: 1.4, roughness: 0.4 });

      // ---- chassis (beveled slab: body + chamfer bands + top plate + feet) ---
      var W = 3.2, H = 0.55, D = 2.05;
      var body = new THREE.Mesh(new THREE.BoxGeometry(W, H - 0.12, D), matBody);
      body.position.y = -H / 2;
      group.add(body);

      var bandGeo = new THREE.BoxGeometry(W + 0.1, 0.07, D + 0.1);
      var bandTop = new THREE.Mesh(bandGeo, matPlate);
      bandTop.position.y = -0.035;
      group.add(bandTop);
      var bandBot = new THREE.Mesh(bandGeo, matDark);
      bandBot.position.y = -H + 0.035;
      group.add(bandBot);

      var topPlate = new THREE.Mesh(new THREE.BoxGeometry(W - 0.14, 0.05, D - 0.14), matPlate);
      topPlate.position.y = 0.005;
      group.add(topPlate);

      var footGeo = new THREE.CylinderGeometry(0.09, 0.11, 0.14, 16);
      for (var fi = 0; fi < 4; fi++) {
        var foot = new THREE.Mesh(footGeo, matDark);
        foot.position.set((fi % 2 ? 1 : -1) * (W / 2 - 0.28), -H - 0.07, (fi < 2 ? 1 : -1) * (D / 2 - 0.26));
        group.add(foot);
      }

      // ---- turntable platters (spinning disc + grooves + label + tonearm) ----
      var grooveRadii = [0.28, 0.4, 0.52];
      var grooveGeos = [];
      for (var gi = 0; gi < 3; gi++) grooveGeos.push(new THREE.TorusGeometry(grooveRadii[gi], 0.007, 6, 48));
      var discGeo = new THREE.CylinderGeometry(0.62, 0.64, 0.07, 44);
      var labelGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.02, 28);
      var spindleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.09, 12);
      var tickGeo = new THREE.BoxGeometry(0.03, 0.015, 0.14);

      var platterSpins = [];
      var tonearms = [];
      var tonearmBaseYaw = [];

      function buildPlatter(side, labelMat) {
        var assembly = new THREE.Group();
        assembly.position.set(side * 0.98, 0.03, -0.15);

        var spin = new THREE.Group();
        var disc = new THREE.Mesh(discGeo, matDark);
        disc.position.y = 0.035;
        spin.add(disc);
        for (var i = 0; i < 3; i++) {
          var groove = new THREE.Mesh(grooveGeos[i], matGroove);
          groove.rotation.x = -Math.PI / 2;
          groove.position.y = 0.073;
          spin.add(groove);
        }
        var label = new THREE.Mesh(labelGeo, labelMat);
        label.position.y = 0.078;
        spin.add(label);
        var mark = new THREE.Mesh(tickGeo, matTick);
        mark.position.set(0.1, 0.09, 0);
        spin.add(mark);
        var spindle = new THREE.Mesh(spindleGeo, matTrim);
        spindle.position.y = 0.11;
        spin.add(spindle);
        assembly.add(spin);
        platterSpins.push(spin);

        // tonearm: pivot post + arm tube + headshell + counterweight
        var arm = new THREE.Group();
        arm.position.set(side * 0.56, 0.04, -0.47);
        var post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.14, 16), matTrim);
        post.position.y = 0.05;
        arm.add(post);
        var tubeGeo = new THREE.CylinderGeometry(0.018, 0.024, 0.72, 10);
        tubeGeo.rotateZ(Math.PI / 2);
        var tube = new THREE.Mesh(tubeGeo, matTrim);
        tube.position.set(-side * 0.3, 0.13, 0);
        tube.rotation.z = side * 0.06;
        arm.add(tube);
        var head = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.06), matDark);
        head.position.set(-side * 0.68, 0.1, 0);
        arm.add(head);
        var weight = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 14), matDark);
        weight.rotation.z = Math.PI / 2;
        weight.position.set(side * 0.14, 0.13, 0);
        arm.add(weight);
        arm.rotation.y = side * 0.62;
        tonearms.push(arm);
        tonearmBaseYaw.push(arm.rotation.y);
        assembly.add(arm);

        group.add(assembly);
        return assembly;
      }

      var platterL = buildPlatter(-1, matLabelL);
      var platterR = buildPlatter(1, matLabelR);
      parts.push({ object: platterL, dir: new THREE.Vector3(-0.28, 1, 0).normalize(), dist: 1.05 });
      parts.push({ object: platterR, dir: new THREE.Vector3(0.28, 1, 0).normalize(), dist: 1.05 });

      // ---- center mixer strip (3 knobs + crossfader + bpm screen) ------------
      var mixer = new THREE.Group();
      mixer.position.set(0, 0.03, 0.02);
      var panel = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.06, 1.6), matPlate);
      mixer.add(panel);

      var knobGeo = new THREE.CylinderGeometry(0.075, 0.085, 0.08, 20);
      var knobTickGeo = new THREE.BoxGeometry(0.018, 0.02, 0.06);
      var knobs = [];
      for (var ki = 0; ki < 3; ki++) {
        var knob = new THREE.Mesh(knobGeo, matDark);
        knob.position.set(0, 0.07, -0.62 + ki * 0.26);
        var tick = new THREE.Mesh(knobTickGeo, matTick);
        tick.position.set(0, 0.045, -0.045);
        knob.add(tick);
        knobs.push(knob);
        mixer.add(knob);
      }

      var slot = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.015, 0.06), matGroove);
      slot.position.set(0, 0.035, 0.42);
      mixer.add(slot);
      var slider = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.13), matTrim);
      slider.position.set(0, 0.06, 0.42);
      mixer.add(slider);

      var screen = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.03, 0.2), matScreen);
      screen.position.set(0, 0.05, 0.66);
      mixer.add(screen);

      group.add(mixer);
      parts.push({ object: mixer, dir: new THREE.Vector3(0, 0.25, 1).normalize(), dist: 1.0 });

      // ---- front speaker (housing + surround ring + pulsing cone + cap) ------
      var speaker = new THREE.Group();
      speaker.position.set(0, -0.3, D / 2 + 0.01);

      var housingGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.07, 32);
      housingGeo.rotateX(Math.PI / 2);
      speaker.add(new THREE.Mesh(housingGeo, matDark));

      var ringGeo = new THREE.TorusGeometry(0.235, 0.018, 10, 40);
      var surround = new THREE.Mesh(ringGeo, matRing);
      surround.position.z = 0.04;
      speaker.add(surround);

      var pump = new THREE.Group();
      pump.position.z = 0.045;
      var coneGeo = new THREE.ConeGeometry(0.21, 0.16, 30, 1, true);
      coneGeo.rotateX(-Math.PI / 2);
      coneGeo.translate(0, 0, 0.08);
      pump.add(new THREE.Mesh(coneGeo, matCone));
      var cap = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), matTrim);
      cap.position.z = 0.015;
      pump.add(cap);
      speaker.add(pump);

      group.add(speaker);
      parts.push({ object: speaker, dir: new THREE.Vector3(0, -0.38, 1).normalize(), dist: 1.1 });

      // ---- LED chase strip around the chassis rim ----------------------------
      var LED_N = 14;
      var ledGeo = new THREE.SphereGeometry(0.038, 12, 10);
      var ledMats = [];
      var ledColors = [accent, accent2, warn];
      var rimHX = W / 2 + 0.09, rimHZ = D / 2 + 0.09, rimPer = 4 * rimHX + 4 * rimHZ;
      for (var li = 0; li < LED_N; li++) {
        var u = (li / LED_N) * rimPer, lx, lz;
        if (u < 2 * rimHX) { lx = -rimHX + u; lz = rimHZ; }
        else if (u < 2 * rimHX + 2 * rimHZ) { lx = rimHX; lz = rimHZ - (u - 2 * rimHX); }
        else if (u < 4 * rimHX + 2 * rimHZ) { lx = rimHX - (u - 2 * rimHX - 2 * rimHZ); lz = -rimHZ; }
        else { lx = -rimHX; lz = -rimHZ + (u - 4 * rimHX - 2 * rimHZ); }
        var lm = new THREE.MeshStandardMaterial({ color: 0x05070a, emissive: accent.clone(), emissiveIntensity: 0.3, roughness: 0.4 });
        var led = new THREE.Mesh(ledGeo, lm);
        led.position.set(lx, -0.09, lz);
        ledMats.push(lm);
        group.add(led);
        parts.push({ object: led, dir: new THREE.Vector3(lx / rimHX, 0, lz / rimHZ).normalize(), dist: 0.8 });
      }

      // ---- floating EQ bars (bottom-anchored, scale.y dances) -----------------
      var BAR_N = 6;
      var barGeo = new THREE.BoxGeometry(0.17, 1, 0.12);
      barGeo.translate(0, 0.5, 0);
      var bars = [], barMats = [], barFreqA = [], barFreqB = [], barPhase = [];
      for (var bi = 0; bi < BAR_N; bi++) {
        var bm = new THREE.MeshStandardMaterial({
          color: 0x0a0e13,
          emissive: (bi % 2 ? accent2 : accent),
          emissiveIntensity: 0.9,
          roughness: 0.45,
          transparent: true,
          opacity: 0.92
        });
        var bar = new THREE.Mesh(barGeo, bm);
        bar.position.set(-0.75 + bi * 0.3, 0.85, -0.15);
        bar.scale.y = 0.4;
        bars.push(bar);
        barMats.push(bm);
        barFreqA.push(1.7 + bi * 0.53);
        barFreqB.push(3.1 + bi * 0.71);
        barPhase.push(bi * 1.9);
        group.add(bar);
      }

      // ---- update (zero allocations: all scratch state preallocated) ---------
      var TWO_PI = Math.PI * 2;
      var BEAT_W = TWO_PI * (100 / 60); // 100 BPM
      var tmpColor = new THREE.Color();
      var spinL = 0, spinR = 0, hoverAmt = 0;

      function update(t, dt, ctx) {
        dt = Math.min(dt || 0.016, 0.1);
        var hoverTarget = ctx && ctx.hover ? 1 : 0;
        hoverAmt += (hoverTarget - hoverAmt) * Math.min(1, dt * 5);

        // platters
        var rate = 1.9 + hoverAmt * 2.1;
        spinL += dt * rate;
        spinR += dt * rate * 0.93;
        platterSpins[0].rotation.y = -spinL;
        platterSpins[1].rotation.y = spinR;
        tonearms[0].rotation.y = tonearmBaseYaw[0] + Math.sin(t * 0.45) * 0.035;
        tonearms[1].rotation.y = tonearmBaseYaw[1] + Math.sin(t * 0.45 + 2.4) * 0.035;

        // 100-BPM beat drives speaker cone + surround glow + screen
        var beat = Math.sin(t * BEAT_W);
        beat = beat > 0 ? beat * beat : 0;
        var squeeze = 1 - 0.05 * beat;
        pump.scale.set(squeeze, squeeze, 1 + 0.55 * beat);
        matRing.emissiveIntensity = 0.35 + 1.8 * beat;
        matScreen.emissiveIntensity = 0.65 + 0.5 * beat + 0.07 * Math.sin(t * 23);

        // mixer idle: knobs wiggle, crossfader slides
        knobs[0].rotation.y = Math.sin(t * 0.35) * 0.9;
        knobs[1].rotation.y = Math.sin(t * 0.42 + 2.1) * 0.9;
        knobs[2].rotation.y = Math.sin(t * 0.31 + 4.2) * 0.9;
        slider.position.x = Math.sin(t * 0.6) * 0.13;

        // LED chase around the rim, colors cycling accent -> accent2 -> warn
        var chase = t * (0.22 + hoverAmt * 0.28);
        for (var i = 0; i < LED_N; i++) {
          var u = i / LED_N;
          var d = u - chase;
          d -= Math.floor(d);
          var b = 0.5 + 0.5 * Math.cos(d * TWO_PI);
          b = b * b * b;
          var cu = (u * 3 + t * 0.4) % 3;
          var seg = cu | 0;
          tmpColor.copy(ledColors[seg]).lerp(ledColors[(seg + 1) % 3], cu - seg);
          var m = ledMats[i];
          m.emissive.copy(tmpColor);
          m.emissiveIntensity = 0.25 + (2.4 + hoverAmt) * b;
        }

        // EQ bars: two blended sines + beat kick, like a spectrum analyser
        for (var j = 0; j < BAR_N; j++) {
          var a = 0.5 + 0.5 * Math.sin(t * barFreqA[j] + barPhase[j]);
          var c = 0.5 + 0.5 * Math.sin(t * barFreqB[j] + barPhase[j] * 1.7);
          var h = 0.15 + 0.62 * (a * 0.65 + c * 0.35) + 0.28 * beat;
          bars[j].scale.y += (h - bars[j].scale.y) * Math.min(1, dt * 12);
          barMats[j].emissiveIntensity = 0.5 + bars[j].scale.y * 1.1;
        }
      }

      return { group: group, update: update, parts: parts };
    }
  };
})();
