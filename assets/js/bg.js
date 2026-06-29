/* =========================================================
   Ziheng (Zane) Cheng — Generative signal field
   A flow-field of particle "signal traces" drifting behind
   the page, bending toward the cursor. Lightweight canvas.
   ========================================================= */
(function () {
  "use strict";
  var canvas = document.getElementById("bgfield");
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  if (!ctx) return;

  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DPR = Math.min(window.devicePixelRatio || 1, 1.5);
  var W = 0, H = 0, t = 0;
  var mouse = { x: -9999, y: -9999, on: false };
  var parts = [];
  var TAU = Math.PI * 2;
  var TRAIL = 14;

  function accent() {
    var c = getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() || "#ff9a5c";
    // to rgb
    var d = document.createElement("canvas").getContext("2d");
    d.fillStyle = c; var hex = d.fillStyle;
    var m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [255, 154, 92];
  }
  var COL = accent();

  // smooth pseudo-noise flow field (layered trig — cheap & organic)
  function field(x, y, tt) {
    var a = Math.sin(x * 0.0016 + tt * 0.25) + Math.cos(y * 0.0019 - tt * 0.22);
    var b = Math.sin((x + y) * 0.0011 + tt * 0.16);
    return (a + b) * 1.15; // angle in radians
  }

  function reset(p, randomY) {
    p.x = Math.random() * W;
    p.y = randomY ? Math.random() * H : Math.random() * H;
    p.hist = [];
    p.life = 80 + Math.random() * 140;
    p.age = 0;
    p.sp = 0.5 + Math.random() * 0.9;
  }

  function build() {
    var target = Math.round(Math.min(72, (window.innerWidth * window.innerHeight) / 14000));
    parts = [];
    for (var i = 0; i < target; i++) { var p = {}; reset(p, true); parts.push(p); }
  }

  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + "px"; canvas.style.height = H + "px";
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    build();
  }

  function step() {
    t += 0.016;
    ctx.clearRect(0, 0, W, H);
    ctx.lineCap = "round";
    for (var i = 0; i < parts.length; i++) {
      var p = parts[i];
      var ang = field(p.x, p.y, t);
      // bend toward cursor
      if (mouse.on) {
        var dx = mouse.x - p.x, dy = mouse.y - p.y, d2 = dx * dx + dy * dy;
        if (d2 < 240 * 240) {
          var infl = (1 - Math.sqrt(d2) / 240);
          ang += Math.atan2(dy, dx) * 0.0 + infl * 1.6 * Math.sin(t + i);
          p.x += dx * 0.003 * infl; p.y += dy * 0.003 * infl;
        }
      }
      p.hist.push([p.x, p.y]);
      if (p.hist.length > TRAIL) p.hist.shift();
      p.x += Math.cos(ang) * p.sp;
      p.y += Math.sin(ang) * p.sp;
      p.age++;
      if (p.x < -20 || p.x > W + 20 || p.y < -20 || p.y > H + 20 || p.age > p.life) { reset(p, true); continue; }

      // draw fading trail
      var h = p.hist;
      for (var j = 1; j < h.length; j++) {
        var a = (j / h.length) * 0.26;
        ctx.strokeStyle = "rgba(" + COL[0] + "," + COL[1] + "," + COL[2] + "," + a.toFixed(3) + ")";
        ctx.lineWidth = (j / h.length) * 1.6;
        ctx.beginPath();
        ctx.moveTo(h[j - 1][0], h[j - 1][1]);
        ctx.lineTo(h[j][0], h[j][1]);
        ctx.stroke();
      }
      // head node
      ctx.fillStyle = "rgba(" + COL[0] + "," + COL[1] + "," + COL[2] + ",0.4)";
      ctx.beginPath(); ctx.arc(p.x, p.y, 1.1, 0, TAU); ctx.fill();
    }
  }

  var raf;
  function loop() { if (!document.hidden) step(); raf = requestAnimationFrame(loop); }

  window.addEventListener("resize", resize);
  window.addEventListener("mousemove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; });
  window.addEventListener("mouseout", function () { mouse.on = false; });
  new MutationObserver(function () { COL = accent(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  resize();
  if (reduce) { step(); } // single static frame
  else loop();
})();
