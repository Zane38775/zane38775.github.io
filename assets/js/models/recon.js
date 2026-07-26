(function () {
  "use strict";
  if (typeof THREE === "undefined") { return; }

  window.ProjectModels = window.ProjectModels || {};

  var R = 1.0;            // tank shell radius
  var HEAD = 0.35;        // dished head height
  var Y_CYL_BOT = -0.55;  // cylinder section bottom
  var Y_CYL_TOP = 1.05;   // cylinder section top
  var Y_BOT = Y_CYL_BOT - HEAD;
  var Y_TOP = Y_CYL_TOP + HEAD;

  function radiusAt(y) {
    if (y <= Y_CYL_BOT) {
      var ub = (y - Y_CYL_BOT) / HEAD;
      return R * Math.sqrt(Math.max(0, 1 - ub * ub));
    }
    if (y >= Y_CYL_TOP) {
      var ut = (y - Y_CYL_TOP) / HEAD;
      return R * Math.sqrt(Math.max(0, 1 - ut * ut));
    }
    return R;
  }

  function makeShellProfile() {
    var pts = [], i, a;
    for (i = 0; i <= 10; i++) {
      a = -Math.PI / 2 + (i / 10) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.max(0.001, R * Math.cos(a)), Y_CYL_BOT + HEAD * Math.sin(a)));
    }
    pts.push(new THREE.Vector2(R, Y_CYL_TOP * 0.25));
    for (i = 0; i <= 10; i++) {
      a = (i / 10) * (Math.PI / 2);
      pts.push(new THREE.Vector2(Math.max(0.001, R * Math.cos(a)), Y_CYL_TOP + HEAD * Math.sin(a)));
    }
    return pts;
  }

  function makeBrushedTexture() {
    var c = document.createElement("canvas");
    c.width = 128; c.height = 128;
    var g = c.getContext("2d");
    g.fillStyle = "#8f8f8f";
    g.fillRect(0, 0, 128, 128);
    for (var i = 0; i < 340; i++) {
      var x = Math.random() * 128;
      var v = 120 + Math.floor(Math.random() * 50);
      g.strokeStyle = "rgba(" + v + "," + v + "," + v + ",0.35)";
      g.lineWidth = 0.6 + Math.random() * 0.9;
      g.beginPath();
      g.moveTo(x, -4);
      g.lineTo(x + (Math.random() - 0.5) * 3, 132);
      g.stroke();
    }
    var tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(4, 2);
    return tex;
  }

  function makeReadoutSprite(accent2) {
    var c = document.createElement("canvas");
    c.width = 512; c.height = 112;
    var g = c.getContext("2d");
    g.fillStyle = "rgba(7,11,15,0.82)";
    g.strokeStyle = accent2;
    g.lineWidth = 3;
    g.beginPath();
    if (g.roundRect) { g.roundRect(4, 4, 504, 104, 14); } else { g.rect(4, 4, 504, 104); }
    g.fill(); g.stroke();
    g.font = "600 40px 'JetBrains Mono', ui-monospace, monospace";
    g.textAlign = "center"; g.textBaseline = "middle";
    g.shadowColor = accent2; g.shadowBlur = 14;
    g.fillStyle = accent2;
    g.fillText("VOL 12.40 m³ · ERR <0.01%", 256, 58);
    var tex = new THREE.CanvasTexture(c);
    var mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
    var spr = new THREE.Sprite(mat);
    spr.scale.set(1.7, 0.37, 1);
    return spr;
  }

  window.ProjectModels["recon"] = {
    camera: { distance: 7.0, height: 1.6, fov: 38 },

    build: function (THREE, env) {
      env = env || {};
      var pal = env.palette || {};
      var accent = new THREE.Color(pal.accent || "#00e893");
      var accent2 = new THREE.Color(pal.accent2 || "#4dc9ff");
      var quality = (typeof env.quality === "number") ? env.quality : 1;

      var group = new THREE.Group();
      var brushed = makeBrushedTexture();

      /* ---- steel shell (lathe: cylinder + dished heads) ---- */
      var shellGroup = new THREE.Group();
      var shellMat = new THREE.MeshStandardMaterial({
        color: 0xaeb9c4, metalness: 0.9, roughness: 0.34,
        roughnessMap: brushed, transparent: true, opacity: 1
      });
      var shell = new THREE.Mesh(new THREE.LatheGeometry(makeShellProfile(), 48), shellMat);
      shellGroup.add(shell);

      var seamMat = new THREE.MeshStandardMaterial({ color: 0x77828e, metalness: 0.85, roughness: 0.55, transparent: true });
      var seamGeo = new THREE.TorusGeometry(R + 0.006, 0.013, 6, 56);
      var seamYs = [Y_CYL_BOT + 0.02, 0.25, Y_CYL_TOP - 0.02];
      for (var s = 0; s < 3; s++) {
        var seam = new THREE.Mesh(seamGeo, seamMat);
        seam.rotation.x = Math.PI / 2;
        seam.position.y = seamYs[s];
        shellGroup.add(seam);
      }

      var nozzleMat = new THREE.MeshStandardMaterial({ color: 0x8892a0, metalness: 0.85, roughness: 0.45, transparent: true });
      var nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.2, 20), nozzleMat);
      nozzle.position.y = Y_TOP + 0.04;
      shellGroup.add(nozzle);
      var flange = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.035, 20), nozzleMat);
      flange.position.y = Y_TOP + 0.15;
      shellGroup.add(flange);

      var manhole = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.21, 0.06, 22), nozzleMat);
      manhole.rotation.x = Math.PI / 2;
      manhole.position.set(0, 0.32, radiusAt(0.32) - 0.005);
      shellGroup.add(manhole);

      var ledMat = new THREE.MeshStandardMaterial({
        color: 0x0a0f14, emissive: accent, emissiveIntensity: 1.2,
        metalness: 0.2, roughness: 0.4, transparent: true
      });
      var led = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), ledMat);
      led.position.set(0.1, Y_TOP + 0.2, 0.1);
      shellGroup.add(led);
      group.add(shellGroup);
      var shellMats = [shellMat, seamMat, nozzleMat, ledMat];

      /* ---- 4 support legs ---- */
      var legMat = new THREE.MeshStandardMaterial({ color: 0x5b6673, metalness: 0.8, roughness: 0.5 });
      var legGeo = new THREE.CylinderGeometry(0.055, 0.065, 0.62, 12);
      var footGeo = new THREE.CylinderGeometry(0.14, 0.15, 0.045, 14);
      var legs = [], legDirs = [];
      for (var l = 0; l < 4; l++) {
        var la = (l / 4) * Math.PI * 2 + Math.PI / 4;
        var lg = new THREE.Group();
        var pole = new THREE.Mesh(legGeo, legMat);
        pole.rotation.z = Math.cos(la) * 0.14;
        pole.rotation.x = -Math.sin(la) * 0.14;
        lg.add(pole);
        var foot = new THREE.Mesh(footGeo, legMat);
        foot.position.set(Math.cos(la) * 0.045, -0.32, Math.sin(la) * 0.045);
        lg.add(foot);
        lg.position.set(Math.cos(la) * 0.72, -0.99, Math.sin(la) * 0.72);
        group.add(lg);
        legs.push(lg);
        legDirs.push(new THREE.Vector3(Math.cos(la) * 0.4, -1, Math.sin(la) * 0.4).normalize());
      }

      /* ---- scan ring (carrier is the explode part, inner animates) ---- */
      var ringCarrier = new THREE.Group();
      var ringInner = new THREE.Group();
      var ringMat = new THREE.MeshStandardMaterial({
        color: 0x0a0f14, emissive: accent, emissiveIntensity: 1.4,
        metalness: 0.3, roughness: 0.3, transparent: true, opacity: 0.95
      });
      var ring = new THREE.Mesh(new THREE.TorusGeometry(R + 0.14, 0.022, 10, 64), ringMat);
      ring.rotation.x = Math.PI / 2;
      ringInner.add(ring);
      var planeMat = new THREE.MeshBasicMaterial({
        color: accent, transparent: true, opacity: 0.07,
        side: THREE.DoubleSide, depthWrite: false
      });
      var scanPlane = new THREE.Mesh(new THREE.RingGeometry(0.05, R + 0.13, 48), planeMat);
      scanPlane.rotation.x = -Math.PI / 2;
      ringInner.add(scanPlane);
      ringCarrier.add(ringInner);
      group.add(ringCarrier);

      /* ---- point cloud on tank surface, sorted by y for drawRange reveal ---- */
      var count = Math.round(1400 + 1100 * quality);
      var samples = [];
      while (samples.length < count) {
        var py = Y_BOT + 0.015 + Math.random() * (Y_TOP - Y_BOT - 0.03);
        var pr = radiusAt(py);
        if (Math.random() > pr / R) { continue; }
        var th = Math.random() * Math.PI * 2;
        var rr = pr + 0.02 + Math.random() * 0.02;
        samples.push([Math.cos(th) * rr, py, Math.sin(th) * rr]);
      }
      samples.sort(function (a, b) { return a[1] - b[1]; });
      var posArr = new Float32Array(count * 3);
      var ys = new Float32Array(count);
      for (var p = 0; p < count; p++) {
        posArr[p * 3] = samples[p][0];
        posArr[p * 3 + 1] = samples[p][1];
        posArr[p * 3 + 2] = samples[p][2];
        ys[p] = samples[p][1];
      }
      var pointsGeo = new THREE.BufferGeometry();
      pointsGeo.setAttribute("position", new THREE.BufferAttribute(posArr, 3));
      pointsGeo.setDrawRange(0, 0);
      var pointsMat = new THREE.PointsMaterial({
        color: accent2, size: 0.038, sizeAttenuation: true,
        transparent: true, opacity: 0.9, depthWrite: false
      });
      group.add(new THREE.Points(pointsGeo, pointsMat));

      function countBelow(y) {
        var lo = 0, hi = count;
        while (lo < hi) {
          var mid = (lo + hi) >> 1;
          if (ys[mid] <= y) { lo = mid + 1; } else { hi = mid; }
        }
        return lo;
      }

      /* ---- floating readout callout ---- */
      var readoutGroup = new THREE.Group();
      var sprite = makeReadoutSprite("#" + accent2.getHexString());
      readoutGroup.add(sprite);
      var lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array([
        0, -0.14, 0, -0.55, -0.55, -0.05
      ]), 3));
      readoutGroup.add(new THREE.Line(lineGeo, new THREE.LineBasicMaterial({
        color: accent2, transparent: true, opacity: 0.5
      })));
      readoutGroup.position.set(0.85, 1.85, 0.2);
      group.add(readoutGroup);

      /* ---- animation state (preallocated) ---- */
      var phase = Math.random() * Math.PI * 2;
      var ringYRange = Y_TOP - Y_BOT;
      var i;

      function update(t, dt, ctx) {
        ctx = ctx || {};
        var hover = !!ctx.hover;
        var explode = ctx.explode || 0;

        phase += (dt || 0.016) * (hover ? 1.7 : 0.85);
        var sweep = 0.5 - 0.5 * Math.cos(phase);
        var ringY = Y_BOT + sweep * ringYRange;
        ringInner.position.y = ringY;

        ringMat.emissiveIntensity = (hover ? 2.1 : 1.4) + Math.sin(t * 6) * 0.3;
        planeMat.opacity = 0.05 + sweep * 0.05;
        pointsGeo.setDrawRange(0, countBelow(ringY));
        pointsMat.size = 0.038 + Math.sin(t * 3.1) * 0.006;

        led.material.emissiveIntensity = Math.pow(Math.max(0, Math.sin(t * 3.2)), 8) * 1.8 + 0.2;

        var ghost = 1 - explode * 0.74;
        for (i = 0; i < shellMats.length; i++) { shellMats[i].opacity = ghost; }
        shellMat.depthWrite = explode < 0.5;

        sprite.position.y = 0.06 * Math.sin(t * 1.3);
      }

      var parts = [
        { object: shellGroup, dir: new THREE.Vector3(-0.66, 0.1, 0.74).normalize(), dist: 1.6 },
        { object: ringCarrier, dir: new THREE.Vector3(0, 1, 0), dist: 1.25 },
        { object: readoutGroup, dir: new THREE.Vector3(0.2, 1, 0).normalize(), dist: 0.6 }
      ];
      for (i = 0; i < 4; i++) {
        parts.push({ object: legs[i], dir: legDirs[i], dist: 0.85 });
      }

      return {
        group: group,
        update: update,
        parts: parts,
        dispose: function () {
          brushed.dispose();
          if (sprite.material.map) { sprite.material.map.dispose(); }
        }
      };
    }
  };
})();
