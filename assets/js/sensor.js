/* =========================================================
   Ziheng (Zane) Cheng — Live IMU instrument
   A real-time accel/gyro readout driven by the visitor's
   cursor, with a CALM/ACTIVE/ALERT classifier — a working
   demo of the behaviour-collar's sensing pipeline.
   ========================================================= */
(function () {
  "use strict";
  var cv = document.getElementById("imu");
  if (!cv) return;
  var ctx = cv.getContext("2d");
  if (!ctx) return;

  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  var W = 0, H = 0, N = 170;
  var ch = { ax: [], ay: [], az: [], gx: [], gy: [], gz: [] };
  Object.keys(ch).forEach(function (k) { for (var i = 0; i < N; i++) ch[k].push(k === "az" ? 0.98 : 0); });

  var px = 0, py = 0, vx = 0, vy = 0, lvx = 0, lvy = 0, have = false;
  function track(x, y) { if (have) { vx = x - px; vy = y - py; } px = x; py = y; have = true; }
  window.addEventListener("mousemove", function (e) { track(e.clientX, e.clientY); });
  window.addEventListener("touchmove", function (e) { var t = e.touches[0]; if (t) track(t.clientX, t.clientY); }, { passive: true });

  function css(v, f) { var c = getComputedStyle(document.documentElement).getPropertyValue(v).trim(); return c || f; }
  var COLS = ["#ff9a5c", "#ffd0a3", "#74d2c2"]; // x, y, z
  function refreshCols() { COLS[0] = css("--accent", "#ff9a5c"); COLS[1] = css("--accent-soft", "#ffd0a3"); }
  refreshCols();
  new MutationObserver(refreshCols).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  function resize() {
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = W * DPR; cv.height = H * DPR; ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  if (window.ResizeObserver) new ResizeObserver(resize).observe(cv); else window.addEventListener("resize", resize);
  resize();

  var aEl = document.getElementById("imuA"), gEl = document.getElementById("imuG"), sEl = document.getElementById("imuS");
  var t = 0, energy = 0, frame = 0, scroll = 0;
  function rnd() { return Math.random() * 2 - 1; }
  function clamp(v, m) { return Math.max(-m, Math.min(m, v)); }
  function f3(a, b, c) { function s(n) { return (n >= 0 ? "+" : "") + n.toFixed(2); } return s(a) + " " + s(b) + " " + s(c); }
  function g3(a, b, c) { function s(n) { return (n >= 0 ? "+" : "") + n.toFixed(1); } return s(a) + " " + s(b) + " " + s(c); }

  function sample() {
    vx *= 0.86; vy *= 0.86;
    var ax = clamp(vx * 0.03 + rnd() * 0.05 + Math.sin(t * 1.7) * 0.03, 1.7);
    var ay = clamp(vy * 0.03 + rnd() * 0.05 + Math.cos(t * 1.3) * 0.03, 1.7);
    var az = 0.98 + rnd() * 0.03 + Math.hypot(vx, vy) * 0.004;
    var dvx = vx - lvx, dvy = vy - lvy; lvx = vx; lvy = vy;
    var gx = clamp(dvy * 0.14 + rnd() * 0.07, 2.2);
    var gy = clamp(dvx * 0.14 + rnd() * 0.07, 2.2);
    var gz = clamp((dvx - dvy) * 0.06 + rnd() * 0.06, 2.2);
    var v = [ax, ay, az, gx, gy, gz], k = Object.keys(ch);
    for (var i = 0; i < k.length; i++) { ch[k[i]].push(v[i]); if (ch[k[i]].length > N) ch[k[i]].shift(); }
    var inst = Math.abs(ax) + Math.abs(ay) + Math.abs(gx) + Math.abs(gy) + Math.abs(gz);
    energy = energy * 0.9 + inst * 0.1;
    return v;
  }

  function lane(arr, cy, lh, color, mid, range) {
    ctx.strokeStyle = color; ctx.lineWidth = 1.6; ctx.beginPath();
    for (var i = 0; i < arr.length; i++) {
      var x = (i / (N - 1)) * W;
      var y = cy - ((arr[i] - mid) / range) * (lh / 2);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function grid(cy, lh) {
    ctx.strokeStyle = "rgba(255,255,255,0.05)"; ctx.lineWidth = 1;
    for (var gx = (scroll % 40); gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, cy - lh / 2); ctx.lineTo(gx, cy + lh / 2); ctx.stroke(); }
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    var pad = 10, laneH = (H - pad * 3) / 2;
    var cyA = pad + laneH / 2, cyG = pad * 2 + laneH + laneH / 2;
    scroll -= 0.6;
    grid(cyA, laneH); grid(cyG, laneH);
    // labels
    ctx.font = "10px " + (css("--font-mono", "monospace"));
    ctx.fillStyle = "rgba(255,255,255,.35)";
    ctx.fillText("ACCEL", 8, pad + 12); ctx.fillText("GYRO", 8, pad * 2 + laneH + 12);
    lane(ch.ax, cyA, laneH, COLS[0], 0, 1.8);
    lane(ch.ay, cyA, laneH, COLS[1], 0, 1.8);
    lane(ch.az, cyA, laneH, COLS[2], 0.98, 1.8);
    lane(ch.gx, cyG, laneH, COLS[0], 0, 2.4);
    lane(ch.gy, cyG, laneH, COLS[1], 0, 2.4);
    lane(ch.gz, cyG, laneH, COLS[2], 0, 2.4);
  }

  function readout(v) {
    if (aEl) aEl.textContent = f3(v[0], v[1], v[2]);
    if (gEl) gEl.textContent = g3(v[3], v[4], v[5]);
    if (sEl) {
      var st = energy < 0.4 ? "calm" : (energy < 1.3 ? "active" : "alert");
      var lbl = { calm: "● CALM", active: "● ACTIVE", alert: "▲ ALERT" }[st];
      if (sEl.getAttribute("data-state") !== st) sEl.setAttribute("data-state", st);
      sEl.textContent = lbl;
    }
  }

  function loop() {
    if (!document.hidden) { t += 0.05; var v = sample(); draw(); if (frame++ % 5 === 0) readout(v); }
    requestAnimationFrame(loop);
  }
  loop();
})();
