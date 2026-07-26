(function () {
  "use strict";
  if (typeof THREE === "undefined") { return; }
  window.ProjectModels = window.ProjectModels || {};

  /* Morse "SOS" on/off intervals (seconds), precomputed once. unit = 0.16s */
  var SOS = (function () {
    var u = 0.16, seq = [1,1,1,1,1,3, 3,1,3,1,3,3, 1,1,1,1,1,7], on = [], t = 0, i;
    for (i = 0; i < seq.length; i++) {
      if (i % 2 === 0) { on.push([t * u, (t + seq[i]) * u]); }
      t += seq[i];
    }
    return { on: on, total: t * u };
  })();

  window.ProjectModels["flood"] = {
    camera: { distance: 7.0, height: 1.7, fov: 38 },
    build: function (THREE, env) {
      var pal = (env && env.palette) || {};
      var cAccent = new THREE.Color(pal.accent || "#00e893");
      var cAccent2 = new THREE.Color(pal.accent2 || "#4dc9ff");
      var cWarn = new THREE.Color(pal.warn || "#ffb454");
      var cDanger = new THREE.Color(pal.danger || "#ff5c57");
      var q = (env && typeof env.quality === "number") ? env.quality : 1;
      var group = new THREE.Group();
      var parts = [];

      /* ---- materials ---- */
      var mBody = new THREE.MeshStandardMaterial({ color: 0x2a3138, metalness: 0.6, roughness: 0.35 });
      var mDark = new THREE.MeshStandardMaterial({ color: 0x161b21, metalness: 0.5, roughness: 0.45 });
      var mPod = new THREE.MeshStandardMaterial({ color: 0x39424c, metalness: 0.7, roughness: 0.3 });
      var mStripe = new THREE.MeshStandardMaterial({ color: cWarn, metalness: 0.3, roughness: 0.5, emissive: cWarn, emissiveIntensity: 0.25 });
      var mBlade = new THREE.MeshStandardMaterial({ color: 0x11151a, metalness: 0.4, roughness: 0.5 });
      var mDisc = new THREE.MeshBasicMaterial({ color: 0x9fb4c4, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
      var mGlass = new THREE.MeshStandardMaterial({ color: 0x0d1218, metalness: 0.9, roughness: 0.12, transparent: true, opacity: 0.9 });
      var mLens = new THREE.MeshStandardMaterial({ color: 0x05070a, emissive: cAccent2, emissiveIntensity: 0.7, roughness: 0.2, metalness: 0.6 });
      var mWhite = new THREE.MeshStandardMaterial({ color: 0xf1f4f5, metalness: 0.1, roughness: 0.55 });
      var mCross = new THREE.MeshStandardMaterial({ color: cDanger, emissive: cDanger, emissiveIntensity: 0.35, roughness: 0.5 });
      var mLedF = new THREE.MeshStandardMaterial({ color: cAccent, emissive: cAccent, emissiveIntensity: 1.4, roughness: 0.4 });
      var mLedR = new THREE.MeshStandardMaterial({ color: cDanger, emissive: cDanger, emissiveIntensity: 1.2, roughness: 0.4 });
      var mBuoy = new THREE.MeshStandardMaterial({ color: cWarn, metalness: 0.25, roughness: 0.55 });
      var mSos = new THREE.MeshStandardMaterial({ color: cDanger, emissive: cDanger, emissiveIntensity: 2.0, roughness: 0.3 });
      var mWater = new THREE.MeshStandardMaterial({
        color: 0x0c3a52, metalness: 0.35, roughness: 0.3, transparent: true, opacity: 0.6,
        emissive: cAccent2, emissiveIntensity: 0.07, side: THREE.DoubleSide, depthWrite: false
      });
      var mWaterWire = new THREE.MeshBasicMaterial({ color: cAccent2, wireframe: true, transparent: true, opacity: 0.1, depthWrite: false });
      var mCable = new THREE.LineBasicMaterial({ color: 0xaab6c0, transparent: true, opacity: 0.85 });

      /* ---- drone assembly ---- */
      var drone = new THREE.Group();
      drone.position.y = 0.78;
      group.add(drone);

      var body = new THREE.Group();
      body.add(new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.24, 0.6), mBody));
      var topPlate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.07, 0.46), mDark);
      topPlate.position.y = 0.15; body.add(topPlate);
      var belly = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.46), mDark);
      belly.position.y = -0.15; body.add(belly);
      var stripe = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.055, 0.62), mStripe);
      body.add(stripe);
      var gps = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.05, 20), mPod);
      gps.position.set(-0.16, 0.21, 0); body.add(gps);
      drone.add(body);

      /* landing skids */
      var skidGeo = new THREE.CylinderGeometry(0.022, 0.022, 0.78, 10);
      var strutGeo = new THREE.CylinderGeometry(0.016, 0.016, 0.24, 8);
      var si, sj, skid, strut;
      for (si = -1; si <= 1; si += 2) {
        skid = new THREE.Mesh(skidGeo, mDark);
        skid.rotation.z = Math.PI / 2;
        skid.position.set(0, -0.36, si * 0.26);
        drone.add(skid);
        for (sj = -1; sj <= 1; sj += 2) {
          strut = new THREE.Mesh(strutGeo, mDark);
          strut.position.set(sj * 0.26, -0.24, si * 0.24);
          strut.rotation.x = -si * 0.18;
          drone.add(strut);
        }
      }

      /* camera gimbal dome (front-bottom) */
      var dome = new THREE.Group();
      dome.position.set(0, -0.22, 0.24);
      dome.add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 14), mGlass));
      var lens = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.05, 14), mLens);
      lens.rotation.x = Math.PI / 2; lens.position.z = 0.1; dome.add(lens);
      var yoke = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.1, 10), mPod);
      yoke.position.y = 0.12; dome.add(yoke);
      drone.add(dome);
      parts.push({ object: dome, dir: new THREE.Vector3(0, -0.94, 0.34).normalize(), dist: 0.6 });

      /* four arms + motor pods + props */
      var armGeo = new THREE.CylinderGeometry(0.035, 0.045, 0.6, 10);
      var podGeo = new THREE.CylinderGeometry(0.075, 0.09, 0.16, 14);
      var hubGeo = new THREE.CylinderGeometry(0.03, 0.04, 0.07, 10);
      var bladeGeo = new THREE.BoxGeometry(0.42, 0.012, 0.055);
      var discGeo = new THREE.CircleGeometry(0.34, 28);
      var props = [], leds = [], ai, ang, armG, tube, pod, prop, blade, disc, led;
      for (ai = 0; ai < 4; ai++) {
        ang = Math.PI / 4 + ai * Math.PI / 2;
        armG = new THREE.Group();
        armG.rotation.y = ang;
        tube = new THREE.Mesh(armGeo, mBody);
        tube.rotation.z = Math.PI / 2;
        tube.position.set(0.5, 0.06, 0);
        armG.add(tube);
        pod = new THREE.Mesh(podGeo, mPod);
        pod.position.set(0.78, 0.1, 0);
        armG.add(pod);
        led = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), (ai === 0 || ai === 3) ? mLedF : mLedR);
        led.position.set(0.78, 0.02, 0);
        armG.add(led);
        leds.push(led);
        prop = new THREE.Group();
        prop.position.set(0.78, 0.2, 0);
        prop.add(new THREE.Mesh(hubGeo, mDark));
        blade = new THREE.Mesh(bladeGeo, mBlade);
        blade.rotation.y = 0.12; prop.add(blade);
        blade = new THREE.Mesh(bladeGeo, mBlade);
        blade.rotation.y = Math.PI + 0.12; prop.add(blade);
        disc = new THREE.Mesh(discGeo, mDisc);
        disc.rotation.x = -Math.PI / 2;
        disc.position.y = 0.01;
        prop.add(disc);
        drone.add(armG);
        props.push(prop);
        /* prop dir is local to armG (+x = outward); arm dir is in drone space */
        parts.push({ object: prop, dir: new THREE.Vector3(0.5, 1, 0).normalize(), dist: 0.9 });
        parts.push({ object: armG, dir: new THREE.Vector3(Math.cos(ang), 0.18, -Math.sin(ang)).normalize(), dist: 0.55 });
      }

      /* first-aid payload on winch cable */
      var payloadRig = new THREE.Group();
      payloadRig.position.set(0, -0.3, 0);
      drone.add(payloadRig);
      var payload = new THREE.Group();
      payload.add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.24), mWhite));
      var crossGeoA = new THREE.BoxGeometry(0.16, 0.005, 0.05);
      var crossGeoB = new THREE.BoxGeometry(0.05, 0.005, 0.16);
      var cr = new THREE.Mesh(crossGeoA, mCross); cr.position.y = 0.113; payload.add(cr);
      cr = new THREE.Mesh(crossGeoB, mCross); cr.position.y = 0.113; payload.add(cr);
      cr = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.005), mCross); cr.position.z = 0.123; payload.add(cr);
      cr = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.16, 0.005), mCross); cr.position.z = 0.123; payload.add(cr);
      var hook = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.05, 8), mPod);
      hook.position.y = 0.14; payload.add(hook);
      payload.position.y = -0.4;
      payloadRig.add(payload);
      parts.push({ object: payloadRig, dir: new THREE.Vector3(0, -1, 0), dist: 0.75 });

      var CABLE_PTS = 7;
      var cableArr = new Float32Array(CABLE_PTS * 3);
      var cableGeo = new THREE.BufferGeometry();
      cableGeo.setAttribute("position", new THREE.BufferAttribute(cableArr, 3));
      var cable = new THREE.Line(cableGeo, mCable);
      cable.frustumCulled = false;
      drone.add(cable);

      /* ---- water plane ---- */
      var WSEG = q < 0.5 ? 20 : 28;
      var waterGeo = new THREE.PlaneGeometry(3.2, 3.2, WSEG, WSEG);
      waterGeo.rotateX(-Math.PI / 2);
      var waterBase = new Float32Array(waterGeo.attributes.position.array);
      var water = new THREE.Mesh(waterGeo, mWater);
      water.position.y = -1.05;
      group.add(water);
      var waterWire = new THREE.Mesh(waterGeo, mWaterWire);
      waterWire.position.y = -1.045;
      group.add(waterWire);

      /* ---- ripple rings under drone ---- */
      var rippleGroup = new THREE.Group();
      rippleGroup.position.y = -1.0;
      group.add(rippleGroup);
      var ripples = [], ri, rip;
      var ripGeo = new THREE.RingGeometry(0.44, 0.5, 36);
      ripGeo.rotateX(-Math.PI / 2);
      for (ri = 0; ri < 3; ri++) {
        rip = new THREE.Mesh(ripGeo, new THREE.MeshBasicMaterial({
          color: cAccent2, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false
        }));
        rippleGroup.add(rip);
        ripples.push(rip);
      }

      /* ---- SOS beacon buoy ---- */
      var beacon = new THREE.Group();
      beacon.position.set(1.15, -1.03, 0.62);
      var buoy = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.16, 16), mBuoy);
      beacon.add(buoy);
      var mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.22, 8), mDark);
      mast.position.y = 0.17; beacon.add(mast);
      var sosLight = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), mSos);
      sosLight.position.y = 0.3; beacon.add(sosLight);
      group.add(beacon);

      /* ---- preallocated update state ---- */
      var wPos = waterGeo.attributes.position;
      var wArr = wPos.array;
      var vCount = wPos.count;
      var droneBaseY = drone.position.y;
      var beaconBaseY = beacon.position.y;
      var lightScale = 1;

      function update(t, dt, ctx) {
        if (dt > 0.1) { dt = 0.1; }
        var hover = !!(ctx && ctx.hover);
        var explode = (ctx && ctx.explode) || 0;
        var calm = 1 - explode;
        var i, i3, x, z, phase, k;

        /* prop spin + blur discs (shared material, one write per frame) */
        var spin = dt * (hover ? 52 : 34);
        for (i = 0; i < 4; i++) {
          props[i].rotation.y += (i % 2 === 0 ? spin : -spin);
        }
        mDisc.opacity = 0.12 + 0.08 * Math.abs(Math.sin(t * 7));

        /* drone drift toward/away from beacon + hover bob + flight tilt */
        var drift = (Math.sin(t * 0.22) * 0.5 + 0.5) * calm;
        drone.position.x = drift * 0.72;
        drone.position.z = drift * 0.4;
        drone.position.y = droneBaseY + Math.sin(t * 1.35) * 0.055;
        drone.rotation.z = -Math.cos(t * 0.22) * 0.06 * calm;
        drone.rotation.x = Math.cos(t * 0.22) * 0.035 * calm + Math.sin(t * 1.35) * 0.012;

        /* winch loop: payload lowers, holds, raises (retracts while exploded) */
        var winch = (Math.sin(t * 0.42 - Math.PI / 2) * 0.5 + 0.5);
        winch = winch * winch * (3 - 2 * winch);
        payload.position.y = -0.28 - winch * 0.85 * calm;
        payload.rotation.y = Math.sin(t * 0.7) * 0.25;

        /* cable follows winch point -> payload hook, mild sag/sway */
        var px = payloadRig.position.x + payload.position.x;
        var py = payloadRig.position.y + payload.position.y + 0.17;
        var pz = payloadRig.position.z + payload.position.z;
        for (i = 0; i < CABLE_PTS; i++) {
          k = i / (CABLE_PTS - 1);
          i3 = i * 3;
          cableArr[i3] = px * k + Math.sin(t * 1.9 + k * 5) * 0.015 * k * (1 - k) * 4;
          cableArr[i3 + 1] = -0.14 + (py + 0.14) * k;
          cableArr[i3 + 2] = pz * k;
        }
        cableGeo.attributes.position.needsUpdate = true;

        /* water waves from stored base positions */
        for (i = 0; i < vCount; i++) {
          i3 = i * 3;
          x = waterBase[i3];
          z = waterBase[i3 + 2];
          wArr[i3 + 1] = Math.sin(x * 2.3 + t * 1.5) * 0.045 +
                         Math.cos(z * 1.9 + t * 1.05) * 0.04 +
                         Math.sin((x + z) * 3.1 + t * 0.7) * 0.018;
        }
        wPos.needsUpdate = true;

        /* ripples expand under the drone */
        rippleGroup.position.x = drone.position.x;
        rippleGroup.position.z = drone.position.z;
        for (i = 0; i < 3; i++) {
          phase = (t * 0.42 + i / 3) % 1;
          k = 0.35 + phase * 1.7;
          ripples[i].scale.set(k, 1, k);
          ripples[i].material.opacity = (1 - phase) * (1 - phase) * 0.32 * calm;
        }

        /* beacon bobs on the swell; SOS morse blink */
        beacon.position.y = beaconBaseY + Math.sin(t * 1.15 + 1.7) * 0.045;
        beacon.rotation.z = Math.sin(t * 0.9 + 0.4) * 0.09;
        beacon.rotation.x = Math.cos(t * 1.05) * 0.07;
        phase = t % SOS.total;
        lightScale = 0.12;
        for (i = 0; i < SOS.on.length; i++) {
          if (phase >= SOS.on[i][0] && phase < SOS.on[i][1]) { lightScale = 2.6; break; }
        }
        mSos.emissiveIntensity = lightScale;

        /* nav LEDs pulse, camera lens brightens on hover */
        k = 1 + Math.sin(t * 5) * 0.35;
        mLedF.emissiveIntensity = 1.2 * k * (hover ? 1.5 : 1);
        mLedR.emissiveIntensity = 1.0 * (2 - k);
        mLens.emissiveIntensity = hover ? 1.6 : 0.7;
      }

      return { group: group, update: update, parts: parts };
    }
  };
})();
