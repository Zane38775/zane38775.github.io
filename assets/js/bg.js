/* =========================================================
   Ziheng (Zane) Cheng — Ambient background field
   Layered, quiet canvas behind the phosphor terminal UI:
     1) perspective dot-grid floor drifting at the bottom third
     2) sparse drifting particles + constellation lines near cursor
     3) occasional "data packet" streak along a horizontal scanline
   All alpha kept <= 0.3 so it never competes with content.
   ========================================================= */
(function () {
  "use strict";
  var canvas = document.getElementById("bgfield");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var TAU = Math.PI * 2;

  var W = 0, H = 0;
  var mouse = { x: -9999, y: -9999, on: false };

  /* ---------- color parsing (CSS vars -> rgb triplets) ---------- */
  function cssColor(name, fallback) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
    var d = document.createElement("canvas").getContext("2d");
    d.fillStyle = fallback;
    d.fillStyle = raw;
    var hex = d.fillStyle;
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    m = /^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(hex);
    if (m) return [+m[1], +m[2], +m[3]];
    return [0, 232, 147];
  }

  var ACCENT = [0, 232, 147];
  var ACCENT2 = [77, 201, 255];

  function refreshColors() {
    ACCENT = cssColor("--accent", "#00e893");
    ACCENT2 = cssColor("--accent-2", "#4dc9ff");
  }
  refreshColors();

  function rgba(col, a) {
    return "rgba(" + col[0] + "," + col[1] + "," + col[2] + "," + a.toFixed(3) + ")";
  }

  /* ---------- layer 1: perspective dot-grid floor ---------- */
  var grid = {
    drift: 0,            // world-space forward offset, wraps at 1
    speed: 0.055,        // rows per second — slow crawl
    rows: 14,
    cols: 9,             // dots each side of center
    focal: 260           // projection constant
  };

  function horizonY() { return H * 0.66; }

  function drawGrid(alphaScale) {
    var hy = horizonY();
    var depth0 = 1.0;    // nearest world depth
    var span = 10.0;     // world depth covered by the rows
    var i, m;
    for (i = 0; i < grid.rows; i++) {
      // world depth of this row (drift subtracts => rows glide toward viewer)
      var z = depth0 + ((i + (1 - grid.drift)) / grid.rows) * span;
      var y = hy + grid.focal / z;
      if (y > H + 6) continue;
      // fade in from the horizon, fade the very nearest row out at wrap
      var t = (z - depth0) / span;                 // 0 near .. 1 far
      var fade = Math.min(1, (1 - t) * 3) * Math.min(1, t * 6 + 0.15);
      var a = 0.24 * fade * alphaScale;
      if (a <= 0.004) continue;
      var r = Math.max(0.6, 2.4 / (z * 0.55));
      var dx = (grid.focal * 1.35) / z;            // screen spacing at this depth
      ctx.fillStyle = rgba(ACCENT, a);
      for (m = -grid.cols; m <= grid.cols; m++) {
        var x = W / 2 + m * dx;
        if (x < -6 || x > W + 6) continue;
        // dots at the horizontal edges fade slightly
        var ea = Math.abs(m) === grid.cols ? 0.55 : 1;
        if (ea !== 1) ctx.fillStyle = rgba(ACCENT, a * ea);
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
        if (ea !== 1) ctx.fillStyle = rgba(ACCENT, a);
      }
    }
    // faint horizon line
    ctx.strokeStyle = rgba(ACCENT, 0.05 * alphaScale);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, hy);
    ctx.lineTo(W, hy);
    ctx.stroke();
  }

  /* ---------- layer 2: drifting particles + constellation ---------- */
  var parts = [];
  var LINK_DIST = 130;
  var CURSOR_DIST = 220;
  var nearIdx = [];      // reused scratch array of cursor-near particle indices

  function makeParticle() {
    return {
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 14,   // px/s
      vy: (Math.random() - 0.5) * 10,
      r: 0.8 + Math.random() * 1.3,
      ph: Math.random() * TAU,          // twinkle phase
      cool: Math.random() < 0.45        // some cyan, some green
    };
  }

  function buildParticles() {
    var target = Math.round(Math.min(46, (W * H) / 26000));
    parts = [];
    for (var i = 0; i < target; i++) parts.push(makeParticle());
  }

  function stepParticles(dt, t) {
    var i, p;
    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      p.x += (p.vx + Math.sin(t * 0.3 + p.ph) * 4) * dt;
      p.y += (p.vy + Math.cos(t * 0.24 + p.ph) * 3) * dt;
      if (p.x < -12) p.x = W + 12; else if (p.x > W + 12) p.x = -12;
      if (p.y < -12) p.y = H + 12; else if (p.y > H + 12) p.y = -12;
    }
  }

  function drawParticles(t, alphaScale) {
    var i, j, p, q;
    nearIdx.length = 0;

    for (i = 0; i < parts.length; i++) {
      p = parts[i];
      var tw = 0.6 + 0.4 * Math.sin(t * 0.9 + p.ph);
      var col = p.cool ? ACCENT2 : ACCENT;
      ctx.fillStyle = rgba(col, 0.22 * tw * alphaScale);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, TAU);
      ctx.fill();

      if (mouse.on) {
        var mdx = mouse.x - p.x, mdy = mouse.y - p.y;
        if (mdx * mdx + mdy * mdy < CURSOR_DIST * CURSOR_DIST) nearIdx.push(i);
      }
    }

    // constellation lines only among cursor-near particles
    ctx.lineWidth = 1;
    for (i = 0; i < nearIdx.length; i++) {
      p = parts[nearIdx[i]];
      for (j = i + 1; j < nearIdx.length; j++) {
        q = parts[nearIdx[j]];
        var dx = q.x - p.x, dy = q.y - p.y;
        var d2 = dx * dx + dy * dy;
        if (d2 > LINK_DIST * LINK_DIST) continue;
        var a = (1 - Math.sqrt(d2) / LINK_DIST) * 0.18 * alphaScale;
        ctx.strokeStyle = rgba(ACCENT2, a);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }
  }

  /* ---------- layer 3: data packet streak on a scanline ---------- */
  var packet = {
    active: false,
    x: 0, y: 0,
    dir: 1,
    speed: 900,          // px/s
    tail: 170,           // trailing gradient length
    next: 0              // seconds until next launch
  };

  function scheduleNext() {
    packet.active = false;
    packet.next = 3 + Math.random() * 3;   // every 3–6 s
  }
  scheduleNext();

  function launchPacket() {
    packet.active = true;
    packet.dir = Math.random() < 0.5 ? 1 : -1;
    packet.y = H * (0.08 + Math.random() * 0.72);
    packet.speed = 700 + Math.random() * 500;
    packet.tail = 130 + Math.random() * 90;
    packet.x = packet.dir === 1 ? -packet.tail : W + packet.tail;
  }

  function stepPacket(dt) {
    if (!packet.active) {
      packet.next -= dt;
      if (packet.next <= 0) launchPacket();
      return;
    }
    packet.x += packet.dir * packet.speed * dt;
    if ((packet.dir === 1 && packet.x - packet.tail > W + 20) ||
        (packet.dir === -1 && packet.x + packet.tail < -20)) {
      scheduleNext();
    }
  }

  function drawPacket(alphaScale) {
    if (!packet.active) return;
    var y = packet.y;
    var headX = packet.x;
    var tailX = headX - packet.dir * packet.tail;

    // whisper-faint full-width scanline the packet rides on
    ctx.strokeStyle = rgba(ACCENT, 0.04 * alphaScale);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();

    // trailing gradient streak
    var g = ctx.createLinearGradient(tailX, y, headX, y);
    g.addColorStop(0, rgba(ACCENT, 0));
    g.addColorStop(0.75, rgba(ACCENT, 0.12 * alphaScale));
    g.addColorStop(1, rgba(ACCENT, 0.3 * alphaScale));
    ctx.strokeStyle = g;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(tailX, y);
    ctx.lineTo(headX, y);
    ctx.stroke();

    // bright head dot
    ctx.fillStyle = rgba(ACCENT, 0.3 * alphaScale);
    ctx.beginPath();
    ctx.arc(headX, y, 1.8, 0, TAU);
    ctx.fill();
  }

  /* ---------- frame loop ---------- */
  var elapsed = 0;

  function render(dt) {
    elapsed += dt;
    ctx.clearRect(0, 0, W, H);

    grid.drift = (grid.drift + grid.speed * dt) % 1;
    stepParticles(dt, elapsed);
    stepPacket(dt);

    drawGrid(1);
    drawParticles(elapsed, 1);
    drawPacket(1);
  }

  function staticFrame() {
    ctx.clearRect(0, 0, W, H);
    drawGrid(1);
    drawParticles(0, 1);
  }

  function resize() {
    DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    buildParticles();
    if (reduce) staticFrame();
  }

  var last = 0;
  function loop(now) {
    if (!document.hidden) {
      if (!last) last = now;
      var dt = Math.min((now - last) / 1000, 0.05);   // clamp tab-jank spikes
      last = now;
      render(dt);
    } else {
      last = 0;   // avoid a giant dt when the tab returns
    }
    requestAnimationFrame(loop);
  }

  /* ---------- events ---------- */
  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", function (e) {
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true;
  });
  window.addEventListener("mouseout", function () { mouse.on = false; });
  document.addEventListener("visibilitychange", function () {
    if (document.hidden) last = 0;
  });

  function onTheme() {
    refreshColors();
    if (reduce) staticFrame();
  }
  window.addEventListener("themechange", onTheme);
  new MutationObserver(onTheme).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"]
  });

  resize();
  if (!reduce) requestAnimationFrame(loop);
})();
