/* =========================================================
   Ziheng (Zane) Cheng — Playable project demos
   One small interactive toy per project, mounted into the
   detail popup. window.ProjectDemos.mount(id, host).
   ========================================================= */
window.ProjectDemos = (function () {
  "use strict";
  var active = null;

  function el(tag, css, html) { var e = document.createElement(tag); if (css) e.style.cssText = css; if (html != null) e.innerHTML = html; return e; }
  function bar(host, text) {
    return host.appendChild(el("div",
      "font-family:var(--font-mono);font-size:12px;color:var(--text-soft);margin:0 0 10px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;", text));
  }
  function canvas(host, h) {
    var cv = el("canvas", "width:100%;height:" + h + "px;display:block;border-radius:12px;border:1px solid var(--border);background:#0b1016;touch-action:none;");
    host.appendChild(cv);
    var ctx = cv.getContext("2d"), DPR = Math.min(window.devicePixelRatio || 1, 2), W = 600;
    function size() { W = cv.clientWidth || 600; cv.width = W * DPR; cv.height = h * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0); }
    return { cv: cv, ctx: ctx, h: h, get W() { return W; }, size: size };
  }
  function accent() { return (getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff9a5c"); }

  /* ---------- 1. VIBE BOX — beat sequencer + lights + sound ---------- */
  function vibe(host) {
    bar(host, '<i class="ti ti-player-play"></i> tap cells to make a beat, hit play — lights react to the music');
    var STEPS = 8, rows = ["kick", "snare", "hat"], grid = [[], [], []];
    for (var r = 0; r < 3; r++) for (var s = 0; s < STEPS; s++) grid[r][s] = 0;
    var lights = host.appendChild(el("div", "display:flex;gap:6px;margin-bottom:10px;height:26px;"));
    var lz = [];
    for (var i = 0; i < STEPS; i++) { var L = el("div", "flex:1;border-radius:6px;background:var(--bg-alt);transition:background .08s,box-shadow .08s;"); lights.appendChild(L); lz.push(L); }
    var wrap = host.appendChild(el("div", "display:grid;gap:8px;"));
    var cells = [];
    rows.forEach(function (name, r) {
      var row = el("div", "display:grid;grid-template-columns:54px repeat(" + STEPS + ",1fr);gap:6px;align-items:center;");
      row.appendChild(el("span", "font-family:var(--font-mono);font-size:11px;color:var(--text-faint);", name));
      cells[r] = [];
      for (var s = 0; s < STEPS; s++) (function (r, s) {
        var c = el("button", "height:34px;border-radius:8px;border:1px solid var(--border);background:var(--surface);cursor:pointer;transition:all .12s;");
        c.onclick = function () { grid[r][s] ^= 1; c.style.background = grid[r][s] ? accent() : "var(--surface)"; c.style.borderColor = grid[r][s] ? accent() : "var(--border)"; ensureAudio(); };
        row.appendChild(c); cells[r][s] = c;
      })(r, s);
      wrap.appendChild(row);
    });
    var ctrl = host.appendChild(el("div", "display:flex;gap:10px;align-items:center;margin-top:12px;font-family:var(--font-mono);font-size:12px;"));
    var play = el("button", "font-family:var(--font-mono);", '<i class="ti ti-player-play"></i> play');
    ctrl.appendChild(play);
    var tempoOut = el("span", "color:var(--text-soft);", "120 bpm");
    var tempo = el("input"); tempo.type = "range"; tempo.min = 70; tempo.max = 170; tempo.value = 120; tempo.step = 1; tempo.style.flex = "1";
    tempo.oninput = function () { tempoOut.textContent = tempo.value + " bpm"; };
    ctrl.appendChild(tempo); ctrl.appendChild(tempoOut);

    var AC, playing = false, step = 0, timer = null;
    function ensureAudio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } if (AC && AC.state === "suspended") AC.resume(); }
    function hit(type) {
      if (!AC) return; var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain(); o.connect(g); g.connect(AC.destination);
      if (type === "kick") { o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(50, t + 0.12); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.start(t); o.stop(t + 0.2); }
      else { var noise = AC.createBufferSource(), b = AC.createBuffer(1, 2048, AC.sampleRate), d = b.getChannelData(0); for (var i = 0; i < 2048; i++) d[i] = Math.random() * 2 - 1; noise.buffer = b; var f = AC.createBiquadFilter(); f.type = type === "hat" ? "highpass" : "bandpass"; f.frequency.value = type === "hat" ? 7000 : 1800; noise.connect(f); f.connect(g); g.gain.setValueAtTime(type === "hat" ? 0.3 : 0.6, t); g.gain.exponentialRampToValueAtTime(0.001, t + (type === "hat" ? 0.05 : 0.15)); noise.start(t); noise.stop(t + 0.2); o.start(t); o.stop(t + 0.001); }
    }
    function tick() {
      lz.forEach(function (L, i) { var on = i === step; L.style.background = on ? accent() : "var(--bg-alt)"; L.style.boxShadow = on ? "0 0 14px " + accent() : "none"; });
      for (var r = 0; r < 3; r++) { cells[r][step].style.transform = "scale(1)"; if (grid[r][step]) { hit(rows[r]); cells[r][step].style.transform = "scale(1.12)"; } }
      step = (step + 1) % STEPS;
    }
    function loop() { if (!playing) return; tick(); timer = setTimeout(loop, 60000 / tempo.value / 2); }
    play.onclick = function () { ensureAudio(); playing = !playing; play.innerHTML = playing ? '<i class="ti ti-player-pause"></i> stop' : '<i class="ti ti-player-play"></i> play'; if (playing) loop(); else { clearTimeout(timer); lz.forEach(function (L) { L.style.background = "var(--bg-alt)"; L.style.boxShadow = "none"; }); } };
    return { stop: function () { playing = false; clearTimeout(timer); if (AC) try { AC.close(); } catch (e) {} } };
  }

  /* ---------- 2. CANINE COLLAR — shake the dog, trip the alert ---------- */
  function collar(host) {
    bar(host, '<i class="ti ti-paw"></i> grab the dog and shake it — watch the IMU spike and the state change');
    var C = canvas(host, 250); C.size();
    var state = host.appendChild(el("div", "display:flex;gap:12px;align-items:center;margin-top:10px;font-family:var(--font-mono);font-size:12px;"));
    var badge = el("div", "margin-left:auto;padding:6px 14px;border-radius:999px;border:1px solid var(--border);", "● CALM");
    state.appendChild(el("span", "color:var(--text-faint);", "peak energy")); var eOut = el("b", "color:var(--text);", "0.00"); state.appendChild(eOut); state.appendChild(badge);
    var ctx = C.ctx, dog = { x: C.W / 2, y: 125, vx: 0, vy: 0, tx: C.W / 2, ty: 125 }, drag = false, energy = 0, hist = [], raf;
    for (var i = 0; i < 80; i++) hist.push(0);
    function pos(e) { var r = C.cv.getBoundingClientRect(); var t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
    C.cv.addEventListener("pointerdown", function (e) { var p = pos(e); if (Math.hypot(p.x - dog.x, p.y - dog.y) < 50) { drag = true; C.cv.setPointerCapture && C.cv.setPointerCapture(e.pointerId); } });
    C.cv.addEventListener("pointermove", function (e) { if (!drag) return; var p = pos(e); dog.tx = p.x; dog.ty = p.y; });
    window.addEventListener("pointerup", function () { drag = false; });
    function frame() {
      var W = C.W; ctx.clearRect(0, 0, W, C.h);
      var ox = dog.x, oy = dog.y;
      if (drag) { dog.x += (dog.tx - dog.x) * 0.4; dog.y += (dog.ty - dog.y) * 0.4; }
      else { dog.x += (W / 2 - dog.x) * 0.08; dog.y += (125 - dog.y) * 0.08; }
      var sp = Math.hypot(dog.x - ox, dog.y - oy);
      energy = energy * 0.9 + sp * 0.1;
      hist.push(Math.min(sp / 6, 1.4)); hist.shift();
      ctx.strokeStyle = "rgba(255,255,255,.06)"; for (var g = 0; g < W; g += 30) { ctx.beginPath(); ctx.moveTo(g, 0); ctx.lineTo(g, C.h); ctx.stroke(); }
      ctx.strokeStyle = accent(); ctx.lineWidth = 1.6; ctx.beginPath();
      for (var i = 0; i < hist.length; i++) { var x = (i / hist.length) * W, y = 40 - hist[i] * 30; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke();
      var leash = Math.sin(Date.now() / 200) * (drag ? 4 : 1);
      ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.beginPath(); ctx.moveTo(dog.x, dog.y - 30); ctx.lineTo(dog.x + leash, 50); ctx.stroke();
      ctx.fillStyle = "#caa84a"; ctx.beginPath(); ctx.ellipse(dog.x, dog.y, 34, 26, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(dog.x - 28, dog.y - 16, 10, 14, -0.5, 0, 7); ctx.ellipse(dog.x + 28, dog.y - 16, 10, 14, 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = "#1a1207"; ctx.beginPath(); ctx.arc(dog.x - 11, dog.y - 4, 3, 0, 7); ctx.arc(dog.x + 11, dog.y - 4, 3, 0, 7); ctx.fill();
      ctx.fillStyle = "#ff9a5c"; ctx.fillRect(dog.x - 36, dog.y + 18, 72, 6);
      eOut.textContent = (energy / 6).toFixed(2);
      var st = energy < 6 ? "calm" : (energy < 22 ? "active" : "alert");
      badge.textContent = st === "calm" ? "● CALM" : st === "active" ? "● ACTIVE" : "▲ ALERT";
      badge.style.color = st === "calm" ? "#74d29a" : st === "active" ? accent() : "#ff6a6a";
      badge.style.borderColor = badge.style.color;
      raf = requestAnimationFrame(frame);
    }
    frame();
    return { stop: function () { cancelAnimationFrame(raf); } };
  }

  /* ---------- 3. SMART PARKING — drag a car, detection locks on ---------- */
  function parking(host) {
    bar(host, '<i class="ti ti-car"></i> drag a car into a bay — the detector locks a box on it with a confidence score');
    var C = canvas(host, 260); C.size();
    var ctx = C.ctx, W = C.W, types = ["SEDAN", "SUV", "VAN", "EV"];
    var bays = [], cars = [], parkedN = 0;
    function layout() { W = C.W; bays = []; var n = 4, bw = (W - 40) / n; for (var i = 0; i < n; i++) bays.push({ x: 20 + i * bw + bw / 2, y: 60, w: bw - 10, car: null }); cars = []; for (var j = 0; j < n; j++) cars.push({ x: 50 + j * (W - 80) / 3, y: 210, t: types[j % 4], conf: (0.9 + Math.random() * 0.09), placed: false, bw: 64 }); }
    layout();
    var st = host.appendChild(el("div", "margin-top:10px;font-family:var(--font-mono);font-size:12px;color:var(--text-soft);", "detected 0 / 4"));
    var drag = null, off = { x: 0, y: 0 }, raf;
    function pos(e) { var r = C.cv.getBoundingClientRect(); var t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
    C.cv.addEventListener("pointerdown", function (e) { var p = pos(e); for (var i = cars.length - 1; i >= 0; i--) { var c = cars[i]; if (Math.abs(p.x - c.x) < 34 && Math.abs(p.y - c.y) < 20) { drag = c; off.x = p.x - c.x; off.y = p.y - c.y; if (c.placed) { c.placed = false; parkedN--; bays.forEach(function (b) { if (b.car === c) b.car = null; }); } break; } } });
    C.cv.addEventListener("pointermove", function (e) { if (!drag) return; var p = pos(e); drag.x = p.x - off.x; drag.y = p.y - off.y; });
    window.addEventListener("pointerup", function () { if (!drag) return; var c = drag; drag = null; var best = null, bd = 60; bays.forEach(function (b) { if (b.car) return; var d = Math.hypot(c.x - b.x, c.y - b.y); if (d < bd) { bd = d; best = b; } }); if (best) { best.car = c; c.x = best.x; c.y = best.y; c.placed = true; parkedN++; } });
    function carShape(c, hl) {
      ctx.fillStyle = hl ? "#e9e4da" : "#c9c3b8"; ctx.strokeStyle = "#0c1016"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(c.x - 30, c.y - 14, 60, 28, 6); ctx.fill();
      ctx.fillStyle = "#0c1016"; ctx.fillRect(c.x - 16, c.y - 10, 32, 9);
      if (c.placed) { ctx.strokeStyle = accent(); ctx.lineWidth = 2; ctx.strokeRect(c.x - 34, c.y - 18, 68, 36); ctx.fillStyle = accent(); ctx.font = "11px monospace"; ctx.textAlign = "left"; ctx.fillText(c.t + " " + c.conf.toFixed(2), c.x - 33, c.y - 22); }
    }
    function frame() {
      W = C.W; ctx.clearRect(0, 0, W, C.h); ctx.textAlign = "center";
      ctx.fillStyle = "#11161d"; ctx.fillRect(0, 30, W, 70);
      bays.forEach(function (b, i) { ctx.strokeStyle = "rgba(255,255,255,.25)"; ctx.lineWidth = 1; ctx.strokeRect(b.x - b.w / 2, 36, b.w, 58); if (!b.car) { ctx.fillStyle = "rgba(255,255,255,.18)"; ctx.font = "10px monospace"; ctx.fillText("BAY " + (i + 1), b.x, 68); } });
      cars.forEach(function (c) { carShape(c, drag === c); });
      st.textContent = "detected " + parkedN + " / 4" + (parkedN === 4 ? "  · lot full ✓" : "");
      raf = requestAnimationFrame(frame);
    }
    frame();
    return { stop: function () { cancelAnimationFrame(raf); } };
  }

  /* ---------- 4. 3D RECONSTRUCTION — orbit a point cloud ---------- */
  function recon(host) {
    bar(host, '<i class="ti ti-rotate-3d"></i> drag to orbit the reconstructed point cloud — it scans into shape');
    var C = canvas(host, 270); C.size();
    var ctx = C.ctx, pts = [], yaw = 0.5, pitch = -0.3, drag = false, lx = 0, ly = 0, assemble = 0, raf;
    var N = 900;
    for (var i = 0; i < N; i++) { var u = Math.random() * Math.PI * 2, v = Math.random() * Math.PI * 2, R = 1.1, rr = 0.42; var X = (R + rr * Math.cos(v)) * Math.cos(u), Y = rr * Math.sin(v), Z = (R + rr * Math.cos(v)) * Math.sin(u); pts.push({ x: X, y: Y, z: Z, sx: (Math.random() * 2 - 1) * 2.6, sy: (Math.random() * 2 - 1) * 2.6, sz: (Math.random() * 2 - 1) * 2.6 }); }
    function pos(e) { var t = e.touches ? e.touches[0] : e; return { x: t.clientX, y: t.clientY }; }
    C.cv.addEventListener("pointerdown", function (e) { drag = true; var p = pos(e); lx = p.x; ly = p.y; });
    C.cv.addEventListener("pointermove", function (e) { if (!drag) return; var p = pos(e); yaw += (p.x - lx) * 0.01; pitch += (p.y - ly) * 0.01; lx = p.x; ly = p.y; });
    window.addEventListener("pointerup", function () { drag = false; });
    function frame() {
      var W = C.W, h = C.h; ctx.clearRect(0, 0, W, h);
      if (assemble < 1) assemble += 0.012;
      if (!drag) yaw += 0.004;
      var cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch), cx = W / 2, cyy = h / 2, sc = h * 0.32, e = assemble < 1 ? (1 - Math.pow(1 - assemble, 3)) : 1;
      var out = [];
      for (var i = 0; i < pts.length; i++) { var P = pts[i]; var X = P.sx + (P.x - P.sx) * e, Y = P.sy + (P.y - P.sy) * e, Z = P.sz + (P.z - P.sz) * e;
        var x1 = X * cy - Z * sy, z1 = X * sy + Z * cy, y1 = Y * cp - z1 * sp, z2 = Y * sp + z1 * cp;
        var d = 3 / (3 + z2); out.push({ x: cx + x1 * sc * d, y: cyy + y1 * sc * d, z: z2, d: d }); }
      out.sort(function (a, b) { return a.z - b.z; });
      for (var j = 0; j < out.length; j++) { var o = out[j], a = 0.3 + (o.d - 0.6) * 0.9; ctx.fillStyle = "rgba(255,154,92," + Math.max(0.1, Math.min(1, a)).toFixed(2) + ")"; ctx.fillRect(o.x, o.y, 2 * o.d + 0.5, 2 * o.d + 0.5); }
      ctx.fillStyle = "rgba(255,255,255,.4)"; ctx.font = "10px monospace"; ctx.textAlign = "left"; ctx.fillText(assemble < 1 ? "scanning… " + Math.round(assemble * 100) + "%" : "point cloud · " + N + " pts", 12, h - 12);
      raf = requestAnimationFrame(frame);
    }
    frame();
    return { stop: function () { cancelAnimationFrame(raf); } };
  }

  /* ---------- 5. FOOD SEGMENTATION — brush to reveal the mask ---------- */
  function food(host) {
    bar(host, '<i class="ti ti-brush"></i> brush over the plate to run segmentation — calories add up as regions reveal');
    var box = host.appendChild(el("div", "position:relative;width:100%;height:270px;border-radius:12px;border:1px solid var(--border);overflow:hidden;background:#0b1016;"));
    var base = el("canvas", "position:absolute;inset:0;width:100%;height:100%;"); var over = el("canvas", "position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:crosshair;");
    box.appendChild(base); box.appendChild(over);
    var st = host.appendChild(el("div", "margin-top:10px;font-family:var(--font-mono);font-size:12px;color:var(--text-soft);", "revealed 0% · 0 kcal"));
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var regions = [{ n: "rice", c: "#f0b34d", kcal: 240, x: .38, y: .42, rx: .2, ry: .16 }, { n: "chicken", c: "#d85a30", kcal: 320, x: .63, y: .55, rx: .17, ry: .14 }, { n: "broccoli", c: "#5aaa3a", kcal: 60, x: .5, y: .68, rx: .15, ry: .1 }];
    var bx, ox, W, H, total = 0, revealed = {};
    function setup() {
      W = box.clientWidth; H = 270;
      [base, over].forEach(function (cv) { cv.width = W * DPR; cv.height = H * DPR; });
      bx = base.getContext("2d"); bx.setTransform(DPR, 0, 0, DPR, 0, 0); ox = over.getContext("2d"); ox.setTransform(DPR, 0, 0, DPR, 0, 0);
      bx.fillStyle = "#0b1016"; bx.fillRect(0, 0, W, H);
      bx.fillStyle = "#e9e4da"; bx.beginPath(); bx.arc(W / 2, H / 2, H * 0.42, 0, 7); bx.fill();
      bx.fillStyle = "#cfc8bb"; bx.beginPath(); bx.arc(W / 2, H / 2, H * 0.34, 0, 7); bx.fill();
      regions.forEach(function (r) { bx.fillStyle = r.c; bx.beginPath(); bx.ellipse(r.x * W, r.y * H, r.rx * H, r.ry * H, 0, 0, 7); bx.fill(); bx.fillStyle = "rgba(0,0,0,.55)"; bx.font = "11px monospace"; bx.textAlign = "center"; bx.fillText(r.n, r.x * W, r.y * H + 3); });
      ox.fillStyle = "#9aa0a6"; ox.fillRect(0, 0, W, H);
      ox.globalCompositeOperation = "destination-out";
    }
    setup();
    var painting = false;
    function p(e) { var r = over.getBoundingClientRect(); var t = e.touches ? e.touches[0] : e; return { x: t.clientX - r.left, y: t.clientY - r.top }; }
    function brush(pt) { ox.beginPath(); ox.arc(pt.x, pt.y, 22, 0, 7); ox.fill(); compute(); }
    function compute() {
      var img = ox.getImageData(0, 0, over.width, over.height).data, clear = 0, n = img.length / 4;
      for (var i = 3; i < img.length; i += 4) if (img[i] < 40) clear++;
      var pct = clear / n; total = 0; regions.forEach(function (r) { total += r.kcal; });
      st.textContent = "revealed " + Math.round(pct * 100) + "% · " + Math.round(pct * total) + " kcal";
    }
    over.addEventListener("pointerdown", function (e) { painting = true; brush(p(e)); });
    over.addEventListener("pointermove", function (e) { if (painting) brush(p(e)); });
    window.addEventListener("pointerup", function () { painting = false; });
    return { stop: function () {} };
  }

  /* ---------- 6. FLOODUU — drone rescue ---------- */
  function flood(host) {
    bar(host, '<i class="ti ti-drone"></i> click the water to strand a victim — the drone auto-routes around the flood to deliver aid');
    var C = canvas(host, 280); C.size();
    var ctx = C.ctx, COLS = 16, CELL, ROWS, grid, base = { c: 1, r: 7 }, victim = null, drone = { x: 0, y: 0 }, path = [], pi = 0, phase = "idle", t = 0, splash = 0, noRoute = 0, raf, W;
    function build() { W = C.W; CELL = W / COLS; ROWS = Math.round(C.h / CELL); grid = []; for (var r = 0; r < ROWS; r++) { grid[r] = []; for (var c = 0; c < COLS; c++) grid[r][c] = 0; } [[5, 1, 2, 3], [9, 4, 3, 2], [12, 1, 2, 3], [6, 5, 2, 2]].forEach(function (b) { for (var r = b[1]; r < b[1] + b[3] && r < ROWS; r++) for (var c = b[0]; c < b[0] + b[2] && c < COLS; c++) grid[r][c] = 1; }); grid[base.r][base.c] = 0; }
    build();
    function ctr(c, r) { return { x: c * CELL + CELL / 2, y: r * CELL + CELL / 2 }; }
    function bfs(s, g) { if (grid[g.r][g.c] === 1) return null; var q = [s], seen = {}, prev = {}; seen[s.c + "," + s.r] = 1; while (q.length) { var cur = q.shift(); if (cur.c === g.c && cur.r === g.r) { var p = [cur], k = cur.c + "," + cur.r; while (prev[k]) { p.unshift(prev[k]); k = prev[k].c + "," + prev[k].r; } return p; } [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) { var nc = cur.c + d[0], nr = cur.r + d[1], kk = nc + "," + nr; if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && grid[nr][nc] === 0 && !seen[kk]) { seen[kk] = 1; prev[kk] = cur; q.push({ c: nc, r: nr }); } }); } return null; }
    C.cv.addEventListener("click", function (e) { if (phase !== "idle") return; var r0 = C.cv.getBoundingClientRect(), c = Math.floor((e.clientX - r0.left) / CELL), r = Math.floor((e.clientY - r0.top) / CELL); if (c < 0 || c >= COLS || r < 0 || r >= ROWS || grid[r][c] === 1 || (c === base.c && r === base.r)) return; var p = bfs(base, { c: c, r: r }); if (!p) { noRoute = 40; return; } victim = { c: c, r: r }; path = p; pi = 0; phase = "to"; var b = ctr(base.c, base.r); drone.x = b.x; drone.y = b.y; });
    function step() { t += 0.05; if (phase === "to" || phase === "back") { var tg = ctr(path[pi].c, path[pi].r), dx = tg.x - drone.x, dy = tg.y - drone.y, d = Math.hypot(dx, dy), sp = 3; if (d < sp) { drone.x = tg.x; drone.y = tg.y; pi += phase === "to" ? 1 : -1; if (phase === "to" && pi >= path.length) { phase = "drop"; splash = 1; } else if (phase === "back" && pi < 0) { phase = "idle"; victim = null; } } else { drone.x += dx / d * sp; drone.y += dy / d * sp; } } else if (phase === "drop") { splash -= 0.03; if (splash <= 0) { phase = "back"; pi = path.length - 1; } } }
    function frame() {
      W = C.W; ctx.clearRect(0, 0, W, C.h);
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) { var px = c * CELL, py = r * CELL; if (grid[r][c]) { ctx.fillStyle = "#2c3f4d"; ctx.fillRect(px + 1, py + 1, CELL - 2, CELL - 2); } else { var w = 7 * Math.sin((c + r) * 0.6 + t); ctx.fillStyle = "rgb(12," + (36 + w) + "," + (56 + w) + ")"; ctx.fillRect(px, py, CELL, CELL); } }
      if (path.length && phase !== "idle") { ctx.strokeStyle = "rgba(255,154,92,.5)"; ctx.setLineDash([4, 4]); ctx.lineWidth = 2; ctx.beginPath(); for (var k = 0; k < path.length; k++) { var p = ctr(path[k].c, path[k].r); k ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y); } ctx.stroke(); ctx.setLineDash([]); }
      var b = ctr(base.c, base.r); ctx.fillStyle = "#ff9a5c"; ctx.fillRect(b.x - CELL * 0.3, b.y - CELL * 0.3, CELL * 0.6, CELL * 0.6);
      if (victim) { var v = ctr(victim.c, victim.r), pr = 3 + 2 * Math.sin(t * 3); ctx.fillStyle = "rgba(255,90,90,.25)"; ctx.beginPath(); ctx.arc(v.x, v.y, CELL * 0.5 + pr, 0, 7); ctx.fill(); ctx.fillStyle = "#ff5a5a"; ctx.beginPath(); ctx.arc(v.x, v.y, CELL * 0.28, 0, 7); ctx.fill(); }
      if (splash > 0) { var vv = ctr(victim.c, victim.r); ctx.strokeStyle = "rgba(116,210,194," + splash + ")"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(vv.x, vv.y, (1 - splash) * CELL * 1.3, 0, 7); ctx.stroke(); }
      if (phase !== "idle") { ctx.save(); ctx.translate(drone.x, drone.y); ctx.fillStyle = "#11202c"; ctx.fillRect(-5, -5, 10, 10); ctx.strokeStyle = "#ffd0a3"; ctx.lineWidth = 1.4;[[-8, -8], [8, -8], [-8, 8], [8, 8]].forEach(function (a) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(a[0], a[1]); ctx.stroke(); ctx.fillStyle = "rgba(255,154,92,.85)"; ctx.beginPath(); ctx.arc(a[0], a[1], 3, 0, 7); ctx.fill(); }); ctx.restore(); }
      if (noRoute > 0) { noRoute--; ctx.fillStyle = "rgba(255,90,90,.9)"; ctx.font = "bold 13px monospace"; ctx.textAlign = "center"; ctx.fillText("NO ROUTE", W / 2, C.h / 2); }
      step(); raf = requestAnimationFrame(frame);
    }
    frame();
    return { stop: function () { cancelAnimationFrame(raf); } };
  }

  /* ---------- 7. SKSFF — walk dispatcher ---------- */
  function sksff(host) {
    bar(host, '<i class="ti ti-dog"></i> tap a dog to log its walk — clear the kennel');
    var dogs = ["Mochi", "Lucky", "Bao", "Coco", "Ginger", "Pepper"], done = 0;
    var cols = host.appendChild(el("div", "display:grid;grid-template-columns:1fr 1fr;gap:12px;"));
    function colBox(title) { var b = el("div", "background:var(--bg-alt);border:1px solid var(--border);border-radius:12px;padding:12px;min-height:200px;"); b.appendChild(el("div", "font-family:var(--font-mono);font-size:11px;color:var(--text-faint);margin-bottom:10px;letter-spacing:.1em;", title)); return b; }
    var kennel = colBox("KENNEL"), walked = colBox("WALKED ✓"); cols.appendChild(kennel); cols.appendChild(walked);
    var st = host.appendChild(el("div", "margin-top:10px;font-family:var(--font-mono);font-size:12px;color:var(--text-soft);", "0 / " + dogs.length + " walked today"));
    function chip(name) {
      var c = el("button", "display:flex;align-items:center;gap:8px;width:100%;text-align:left;margin-bottom:8px;padding:9px 12px;border-radius:10px;border:1px solid var(--border);background:var(--surface);cursor:pointer;font-family:var(--font-mono);font-size:13px;color:var(--text);transition:transform .15s;", '<i class="ti ti-paw" style="color:var(--accent)"></i>' + name);
      c.onclick = function () { if (c.parentNode === kennel) { c.style.transform = "translateX(8px)"; setTimeout(function () { c.style.transform = ""; walked.appendChild(c); c.querySelector("i").className = "ti ti-check"; done++; upd(); }, 120); } else { kennel.appendChild(c); c.querySelector("i").className = "ti ti-paw"; done--; upd(); } };
      return c;
    }
    function upd() { st.textContent = done + " / " + dogs.length + " walked today" + (done === dogs.length ? "  · all done! 🐾" : ""); }
    dogs.forEach(function (d) { kennel.appendChild(chip(d)); });
    return { stop: function () {} };
  }

  var builders = { vibe: vibe, collar: collar, sksff: sksff, parking: parking, recon: recon, food: food, flood: flood };
  function mount(id, host) { stop(); if (!host) return; host.innerHTML = ""; var b = builders[id]; if (b) { try { active = b(host) || { stop: function () {} }; } catch (e) { host.innerHTML = '<div style="font-family:var(--font-mono);font-size:12px;color:var(--text-faint)">demo unavailable</div>'; } } }
  function stop() { if (active && active.stop) { try { active.stop(); } catch (e) {} } active = null; }
  return { mount: mount, stop: stop };
})();
