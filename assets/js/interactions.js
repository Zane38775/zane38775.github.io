/* ==========================================================================
   interactions.js — fx unit
   Boot sequence · command palette · fake terminal · data-decode scramble ·
   nav HUD · konami CRT mode · matrix rain · toast helper.
   Classic IIFE, no dependencies. Every external hook is optional.
   ========================================================================== */
(function () {
  "use strict";

  if (!document || !document.documentElement) { return; }

  /* ---------- constants ---------- */

  var EMAIL = "chengziheng0621@outlook.com";
  var GITHUB_URL = "https://github.com/Zane38775";

  var PROJECTS = [
    { id: "vibe", name: "Vibe Box" },
    { id: "collar", name: "Canine Stress & Behavior Collar" },
    { id: "sksff", name: "Smart Dog Shelter" },
    { id: "parking", name: "Smart Parking Vision" },
    { id: "recon", name: "3D Reconstruction" },
    { id: "food", name: "Food Segmentation" },
    { id: "flood", name: "FloodUU Drone" }
  ];

  var SECTIONS = [
    { id: "about", label: "about" },
    { id: "skills", label: "skills" },
    { id: "projects", label: "projects" },
    { id: "experience", label: "experience" },
    { id: "contact", label: "contact" }
  ];

  var GLYPHS = "!<>-_\\/[]{}—=+*^?#";

  var reduceMotion = false;
  try {
    reduceMotion = window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch (e) { reduceMotion = false; }

  /* ---------- tiny DOM helpers ---------- */

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) { node.className = cls; }
    if (text != null) { node.textContent = text; }
    return node;
  }

  function isTypingTarget(t) {
    if (!t || t.nodeType !== 1) { return false; }
    var tag = t.tagName;
    return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" ||
      t.isContentEditable === true;
  }

  function onReady(fn) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", fn, { once: true });
    } else {
      fn();
    }
  }

  /* ======================================================================
     Toast helper  (z 1250)
     ====================================================================== */

  var toastHost = null;

  function toast(message) {
    if (!document.body) { return; }
    if (!toastHost) {
      toastHost = el("div", "fx-toasts");
      toastHost.setAttribute("role", "status");
      toastHost.setAttribute("aria-live", "polite");
      document.body.appendChild(toastHost);
    }
    var chip = el("div", "fx-toast", String(message));
    toastHost.appendChild(chip);
    while (toastHost.children.length > 3) {
      toastHost.removeChild(toastHost.firstChild);
    }
    window.setTimeout(function () {
      chip.classList.add("is-out");
      window.setTimeout(function () {
        if (chip.parentNode) { chip.parentNode.removeChild(chip); }
      }, 300);
    }, 2500);
  }

  /* ======================================================================
     Shared actions (used by palette + terminal)
     ====================================================================== */

  function jumpToSection(id) {
    var target = document.getElementById(id);
    if (!target) {
      toast("section not found: " + id);
      return false;
    }
    try {
      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start"
      });
    } catch (e) {
      target.scrollIntoView();
    }
    return true;
  }

  function openProject(id) {
    if (typeof window.openProject === "function") {
      try {
        window.openProject(id);
        return true;
      } catch (e) { /* fall through to card scroll */ }
    }
    var card = document.querySelector('article.card[data-id="' + id + '"]');
    if (card) {
      try {
        card.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "center"
        });
      } catch (e) {
        card.scrollIntoView();
      }
      return true;
    }
    var work = document.getElementById("work");
    if (work) {
      try {
        work.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start"
        });
      } catch (e) {
        work.scrollIntoView();
      }
      return true;
    }
    toast("open failed: project modal offline");
    return false;
  }

  function toggleTheme() {
    var btn = document.getElementById("themeToggle") ||
      document.querySelector('[data-action="theme"]');
    if (btn) {
      btn.click();
    } else {
      var root = document.documentElement;
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) { /* private mode */ }
      try { window.dispatchEvent(new CustomEvent("themechange")); } catch (e) { /* noop */ }
    }
    return document.documentElement.getAttribute("data-theme") || "dark";
  }

  function copyEmail() {
    function done() { toast("copied: " + EMAIL); }
    function fail() { toast("copy failed — " + EMAIL); }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(EMAIL).then(done, function () {
        legacyCopy() ? done() : fail();
      });
    } else {
      legacyCopy() ? done() : fail();
    }
    function legacyCopy() {
      var ok = false;
      var ta = el("textarea");
      ta.value = EMAIL;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      document.body.removeChild(ta);
      return ok;
    }
  }

  /* ======================================================================
     Matrix rain  (z -1, ~30fps)
     ====================================================================== */

  var matrix = {
    on: false,
    canvas: null,
    ctx: null,
    raf: 0,
    last: 0,
    drops: null,
    fontSize: 16,
    color: "#00e893",
    chars: (function () {
      var s = "0123456789";
      for (var i = 0x30a0; i <= 0x30fa; i++) { s += String.fromCharCode(i); }
      return s;
    })()
  };

  function matrixResize() {
    if (!matrix.canvas) { return; }
    matrix.canvas.width = window.innerWidth;
    matrix.canvas.height = window.innerHeight;
    var cols = Math.max(1, Math.floor(matrix.canvas.width / matrix.fontSize));
    matrix.drops = new Array(cols);
    for (var i = 0; i < cols; i++) {
      matrix.drops[i] = Math.floor(Math.random() * -40);
    }
  }

  function matrixAccent() {
    var v = "";
    try {
      v = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent").trim();
    } catch (e) { v = ""; }
    return v || "#00e893";
  }

  function matrixFrame(now) {
    if (!matrix.on || !matrix.ctx) { return; }
    matrix.raf = window.requestAnimationFrame(matrixFrame);
    if (now - matrix.last < 33) { return; }
    matrix.last = now;
    matrixDraw();
  }

  function matrixDraw() {
    var ctx = matrix.ctx;
    var w = matrix.canvas.width;
    var h = matrix.canvas.height;
    ctx.fillStyle = "rgba(7, 11, 15, 0.10)";
    ctx.fillRect(0, 0, w, h);
    ctx.font = matrix.fontSize + "px monospace";
    ctx.fillStyle = matrix.color;
    for (var i = 0; i < matrix.drops.length; i++) {
      var ch = matrix.chars.charAt(
        Math.floor(Math.random() * matrix.chars.length));
      var x = i * matrix.fontSize;
      var y = matrix.drops[i] * matrix.fontSize;
      if (y > 0) { ctx.fillText(ch, x, y); }
      if (y > h && Math.random() > 0.975) {
        matrix.drops[i] = 0;
      } else {
        matrix.drops[i]++;
      }
    }
  }

  function matrixToggle() {
    matrix.on = !matrix.on;
    if (matrix.on) {
      if (!matrix.canvas) {
        matrix.canvas = el("canvas", "fx-matrix");
        matrix.canvas.setAttribute("aria-hidden", "true");
        matrix.ctx = matrix.canvas.getContext("2d");
        window.addEventListener("resize", matrixResize);
        window.addEventListener("themechange", function () {
          matrix.color = matrixAccent();
        });
      }
      matrix.color = matrixAccent();
      document.body.appendChild(matrix.canvas);
      document.body.classList.add("matrix-on");
      matrixResize();
      if (matrix.ctx) {
        matrix.ctx.fillStyle = "#070b0f";
        matrix.ctx.fillRect(0, 0, matrix.canvas.width, matrix.canvas.height);
      }
      if (reduceMotion) {
        for (var i = 0; i < 90; i++) { matrixDraw(); }
      } else {
        matrix.last = 0;
        matrix.raf = window.requestAnimationFrame(matrixFrame);
      }
      toast("matrix rain [ON]");
    } else {
      if (matrix.raf) { window.cancelAnimationFrame(matrix.raf); matrix.raf = 0; }
      if (matrix.canvas && matrix.canvas.parentNode) {
        matrix.canvas.parentNode.removeChild(matrix.canvas);
      }
      document.body.classList.remove("matrix-on");
      toast("matrix rain [OFF]");
    }
    return matrix.on;
  }

  document.addEventListener("visibilitychange", function () {
    if (!matrix.on || reduceMotion) { return; }
    if (document.hidden) {
      if (matrix.raf) { window.cancelAnimationFrame(matrix.raf); matrix.raf = 0; }
    } else if (!matrix.raf) {
      matrix.last = 0;
      matrix.raf = window.requestAnimationFrame(matrixFrame);
    }
  });

  /* ======================================================================
     CRT mode (konami)
     ====================================================================== */

  function crtToggle() {
    var on = document.body.classList.toggle("crt-mode");
    toast("CRT MODE [" + (on ? "ON" : "OFF") + "]");
  }

  /* ======================================================================
     Command palette  (z 1100)
     ====================================================================== */

  var pal = {
    built: false,
    open: false,
    backdrop: null,
    input: null,
    list: null,
    items: [],
    filtered: [],
    active: 0,
    lastFocus: null
  };

  function buildPaletteItems() {
    var items = [];
    var i;
    for (i = 0; i < SECTIONS.length; i++) {
      (function (s) {
        items.push({
          label: "goto: " + s.label,
          hint: "section",
          run: function () { jumpToSection(s.id); }
        });
      })(SECTIONS[i]);
    }
    for (i = 0; i < PROJECTS.length; i++) {
      (function (p) {
        items.push({
          label: "open: " + p.name,
          hint: p.id,
          run: function () { openProject(p.id); }
        });
      })(PROJECTS[i]);
    }
    items.push({
      label: "toggle theme",
      hint: "ui",
      run: function () { toast("theme → " + toggleTheme()); }
    });
    items.push({
      label: "toggle matrix rain",
      hint: "fx",
      run: function () { matrixToggle(); }
    });
    items.push({
      label: "open terminal",
      hint: "`",
      run: function () { termSetOpen(true); }
    });
    items.push({
      label: "copy email",
      hint: "clipboard",
      run: function () { copyEmail(); }
    });
    items.push({
      label: "github / Zane38775",
      hint: "link",
      run: function () {
        var w = window.open(GITHUB_URL, "_blank", "noopener");
        if (w) { w.opener = null; }
      }
    });
    items.push({
      label: "sudo make coffee",
      hint: "??",
      run: function () {
        toast("make: *** No rule to make target 'coffee'. Stop.");
      }
    });
    return items;
  }

  function fuzzyMatch(query, text) {
    var q = query.toLowerCase();
    var s = text.toLowerCase();
    if (!q) { return { score: 0, hits: [] }; }
    var hits = [];
    var score = 0;
    var qi = 0;
    var prev = -2;
    for (var i = 0; i < s.length && qi < q.length; i++) {
      if (s.charAt(i) === q.charAt(qi)) {
        hits.push(i);
        score += 1;
        if (i === prev + 1) { score += 2; }
        if (i === 0 || s.charAt(i - 1) === " " || s.charAt(i - 1) === ":") {
          score += 3;
        }
        prev = i;
        qi++;
      }
    }
    if (qi < q.length) { return null; }
    score -= hits.length ? hits[0] * 0.15 : 0;
    return { score: score, hits: hits };
  }

  function buildPalette() {
    if (pal.built) { return; }
    pal.built = true;

    pal.backdrop = el("div", "fx-pal-backdrop");
    pal.backdrop.setAttribute("aria-hidden", "true");

    var panel = el("div", "fx-pal");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-modal", "true");
    panel.setAttribute("aria-label", "Command palette");

    var row = el("div", "fx-pal__row");
    row.appendChild(el("span", "fx-pal__prompt", "❯"));

    pal.input = el("input", "fx-pal__input");
    pal.input.type = "text";
    pal.input.placeholder = "type a command…";
    pal.input.setAttribute("spellcheck", "false");
    pal.input.setAttribute("autocomplete", "off");
    pal.input.setAttribute("role", "combobox");
    pal.input.setAttribute("aria-expanded", "true");
    pal.input.setAttribute("aria-controls", "fxPalList");
    row.appendChild(pal.input);
    row.appendChild(el("span", "fx-pal__kbd", "esc"));

    pal.list = el("ul", "fx-pal__list");
    pal.list.id = "fxPalList";
    pal.list.setAttribute("role", "listbox");

    var foot = el("div", "fx-pal__foot");
    var hints = [["↑↓", "navigate"], ["↵", "run"], ["esc", "close"]];
    for (var i = 0; i < hints.length; i++) {
      var seg = el("span");
      seg.appendChild(el("b", null, hints[i][0]));
      seg.appendChild(document.createTextNode(" " + hints[i][1]));
      foot.appendChild(seg);
    }

    panel.appendChild(row);
    panel.appendChild(pal.list);
    panel.appendChild(foot);
    pal.backdrop.appendChild(panel);
    document.body.appendChild(pal.backdrop);

    pal.backdrop.addEventListener("mousedown", function (e) {
      if (e.target === pal.backdrop) { palSetOpen(false); }
    });

    pal.input.addEventListener("input", function () {
      palFilter(pal.input.value);
    });

    pal.input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        palMove(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        palMove(-1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        palRunActive();
      } else if (e.key === "Escape") {
        e.preventDefault();
        palSetOpen(false);
      }
    });
  }

  function palFilter(query) {
    pal.items = pal.items.length ? pal.items : buildPaletteItems();
    var q = (query || "").trim();
    var results = [];
    for (var i = 0; i < pal.items.length; i++) {
      var m = fuzzyMatch(q, pal.items[i].label);
      if (m) { results.push({ item: pal.items[i], score: m.score, hits: m.hits }); }
    }
    if (q) { results.sort(function (a, b) { return b.score - a.score; }); }
    pal.filtered = results;
    pal.active = 0;
    palRender();
  }

  function palRender() {
    pal.list.textContent = "";
    if (!pal.filtered.length) {
      var empty = el("li", "fx-pal__empty", "command not found");
      pal.list.appendChild(empty);
      pal.input.removeAttribute("aria-activedescendant");
      return;
    }
    for (var i = 0; i < pal.filtered.length; i++) {
      (function (idx) {
        var entry = pal.filtered[idx];
        var li = el("li", "fx-pal__item");
        li.id = "fxPalOpt" + idx;
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", idx === pal.active ? "true" : "false");
        if (idx === pal.active) { li.classList.add("is-active"); }

        var label = el("span", "fx-pal__label");
        var text = entry.item.label;
        var hitSet = {};
        for (var h = 0; h < entry.hits.length; h++) { hitSet[entry.hits[h]] = true; }
        var buf = "";
        for (var c = 0; c <= text.length; c++) {
          var isHit = c < text.length && hitSet[c];
          if (isHit || c === text.length) {
            if (buf) { label.appendChild(document.createTextNode(buf)); buf = ""; }
            if (isHit) { label.appendChild(el("span", "fx-hit", text.charAt(c))); }
          } else {
            buf += text.charAt(c);
          }
        }
        li.appendChild(label);
        li.appendChild(el("span", "fx-pal__hint", entry.item.hint));

        li.addEventListener("mouseenter", function () {
          palSetActive(idx);
        });
        li.addEventListener("click", function () {
          pal.active = idx;
          palRunActive();
        });
        pal.list.appendChild(li);
      })(i);
    }
    palSetActive(pal.active);
  }

  function palSetActive(idx) {
    if (!pal.filtered.length) { return; }
    pal.active = Math.max(0, Math.min(idx, pal.filtered.length - 1));
    var nodes = pal.list.children;
    for (var i = 0; i < nodes.length; i++) {
      var on = i === pal.active;
      nodes[i].classList.toggle("is-active", on);
      if (nodes[i].getAttribute("role") === "option") {
        nodes[i].setAttribute("aria-selected", on ? "true" : "false");
      }
    }
    var node = nodes[pal.active];
    if (node) {
      pal.input.setAttribute("aria-activedescendant", node.id);
      if (node.scrollIntoView) {
        node.scrollIntoView({ block: "nearest" });
      }
    }
  }

  function palMove(delta) {
    if (!pal.filtered.length) { return; }
    var next = pal.active + delta;
    if (next < 0) { next = pal.filtered.length - 1; }
    if (next >= pal.filtered.length) { next = 0; }
    palSetActive(next);
  }

  function palRunActive() {
    var entry = pal.filtered[pal.active];
    if (!entry) { return; }
    palSetOpen(false);
    try { entry.item.run(); } catch (e) { toast("command failed"); }
  }

  function palSetOpen(open) {
    buildPalette();
    if (open === pal.open) { return; }
    pal.open = open;
    if (open) {
      if (term.open) { termSetOpen(false); }
      pal.lastFocus = document.activeElement;
      pal.items = buildPaletteItems();
      pal.input.value = "";
      palFilter("");
      pal.backdrop.classList.add("is-open");
      pal.backdrop.setAttribute("aria-hidden", "false");
      window.setTimeout(function () { pal.input.focus(); }, 0);
    } else {
      pal.backdrop.classList.remove("is-open");
      pal.backdrop.setAttribute("aria-hidden", "true");
      if (pal.lastFocus && pal.lastFocus.focus &&
          document.contains(pal.lastFocus)) {
        try { pal.lastFocus.focus(); } catch (e) { /* noop */ }
      }
      pal.lastFocus = null;
    }
  }

  /* ======================================================================
     Fake terminal  (z 1150, backtick toggle)
     ====================================================================== */

  var term = {
    built: false,
    open: false,
    root: null,
    out: null,
    input: null,
    history: [],
    histIdx: 0,
    draft: ""
  };

  var PS1 = "zane@hkust:~$";

  function termLine(text, cls) {
    var line = el("div", "fx-term__line" + (cls ? " fx-term__line--" + cls : ""));
    line.textContent = text;
    term.out.appendChild(line);
    return line;
  }

  function termEcho(cmd) {
    var line = el("div", "fx-term__line fx-term__line--echo");
    line.appendChild(el("span", "fx-term__ps1", PS1));
    line.appendChild(document.createTextNode(" " + cmd));
    term.out.appendChild(line);
  }

  function termScroll() {
    term.out.scrollTop = term.out.scrollHeight;
  }

  function buildTerminal() {
    if (term.built) { return; }
    term.built = true;

    term.root = el("div", "fx-term");
    term.root.setAttribute("role", "dialog");
    term.root.setAttribute("aria-label", "Terminal");
    term.root.setAttribute("aria-hidden", "true");

    var bar = el("div", "fx-term__bar");
    var closeDot = el("button", "fx-term__dot fx-term__dot--close");
    closeDot.type = "button";
    closeDot.setAttribute("aria-label", "Close terminal");
    closeDot.addEventListener("click", function () { termSetOpen(false); });
    bar.appendChild(closeDot);
    bar.appendChild(el("span", "fx-term__dot fx-term__dot--min"));
    bar.appendChild(el("span", "fx-term__dot fx-term__dot--max"));
    bar.appendChild(el("span", "fx-term__title", "zane@hkust: ~ — zsh"));

    var body = el("div", "fx-term__body");
    term.out = el("div", "fx-term__out");
    term.out.setAttribute("aria-live", "polite");

    var row = el("div", "fx-term__row");
    row.appendChild(el("span", "fx-term__ps1", PS1));
    term.input = el("input", "fx-term__input");
    term.input.type = "text";
    term.input.setAttribute("spellcheck", "false");
    term.input.setAttribute("autocomplete", "off");
    term.input.setAttribute("autocapitalize", "off");
    term.input.setAttribute("aria-label", "Terminal input");
    row.appendChild(term.input);

    body.appendChild(term.out);
    body.appendChild(row);
    body.addEventListener("click", function () { term.input.focus(); });

    term.root.appendChild(bar);
    term.root.appendChild(body);
    document.body.appendChild(term.root);

    term.input.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var cmd = term.input.value;
        term.input.value = "";
        term.draft = "";
        termExec(cmd);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (!term.history.length) { return; }
        if (term.histIdx === term.history.length) { term.draft = term.input.value; }
        term.histIdx = Math.max(0, term.histIdx - 1);
        term.input.value = term.history[term.histIdx];
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        if (term.histIdx >= term.history.length) { return; }
        term.histIdx++;
        term.input.value = term.histIdx === term.history.length
          ? term.draft
          : term.history[term.histIdx];
      } else if (e.key === "Escape") {
        e.preventDefault();
        termSetOpen(false);
      }
    });

    termLine("zane.sh — fake shell. type 'help' to get started.", "ok");
  }

  function termExec(raw) {
    var cmd = String(raw || "").trim();
    termEcho(cmd);
    if (cmd) {
      term.history.push(cmd);
      if (term.history.length > 64) { term.history.shift(); }
    }
    term.histIdx = term.history.length;
    if (!cmd) { termScroll(); return; }

    var parts = cmd.split(/\s+/);
    var name = parts[0].toLowerCase();
    var arg = parts.slice(1).join(" ").toLowerCase();

    switch (name) {
      case "help":
        termLine("commands:");
        termLine("  help            this list");
        termLine("  whoami          who is this guy");
        termLine("  ls              list projects");
        termLine("  open <id|n>     open a project  (open vibe / open 3)");
        termLine("  cat about.txt   short bio");
        termLine("  cat contact.txt reach me");
        termLine("  theme           toggle dark/light");
        termLine("  matrix          toggle matrix rain");
        termLine("  konami          a hint");
        termLine("  clear           clear scrollback");
        termLine("  exit            close terminal");
        break;

      case "whoami":
        termLine("ziheng \"zane\" cheng — final-year @ HKUST", "ok");
        termLine("embedded systems · algorithms · computer vision");
        break;

      case "ls":
        for (var i = 0; i < PROJECTS.length; i++) {
          var pad = PROJECTS[i].id;
          while (pad.length < 9) { pad += " "; }
          termLine("  " + (i + 1) + "  " + pad + PROJECTS[i].name);
        }
        termLine("(open <id|number> to inspect)");
        break;

      case "open": {
        if (!arg) {
          termLine("usage: open <id|number> — try 'ls' first", "err");
          break;
        }
        var found = null;
        var num = parseInt(arg, 10);
        if (!isNaN(num) && num >= 1 && num <= PROJECTS.length &&
            String(num) === arg) {
          found = PROJECTS[num - 1];
        }
        if (!found) {
          for (var j = 0; j < PROJECTS.length; j++) {
            if (PROJECTS[j].id === arg ||
                PROJECTS[j].name.toLowerCase().indexOf(arg) !== -1) {
              found = PROJECTS[j];
              break;
            }
          }
        }
        if (found) {
          termLine("opening " + found.id + " …", "ok");
          termSetOpen(false);
          openProject(found.id);
        } else {
          termLine("open: no such project: " + arg, "err");
        }
        break;
      }

      case "cat":
        if (arg === "about.txt") {
          termLine("Final-year student at HKUST working across embedded");
          termLine("systems, algorithms and computer vision. Everything on");
          termLine("this site is hand-rolled — no frameworks, no build step.");
          termLine("'ls' for the project list.");
        } else if (arg === "contact.txt") {
          termLine("email:  " + EMAIL);
          termLine("github: " + GITHUB_URL);
        } else if (!arg) {
          termLine("usage: cat <file>", "err");
        } else {
          termLine("cat: " + arg + ": No such file or directory", "err");
        }
        break;

      case "theme":
        termLine("theme → " + toggleTheme(), "ok");
        break;

      case "matrix":
        termLine("matrix rain [" + (matrixToggle() ? "ON" : "OFF") + "]", "ok");
        break;

      case "clear":
        term.out.textContent = "";
        break;

      case "exit":
        termLine("logout", "ok");
        window.setTimeout(function () { termSetOpen(false); }, 120);
        break;

      case "konami":
        termLine("↑ ↑ ↓ ↓ ← → ← → B A", "ok");
        termLine("(on the page, not in here)");
        break;

      case "sudo":
        if (/^rm\s+-rf\s+\/\s*$/.test(arg)) {
          termLine("permission denied: nice try.", "err");
        } else if (arg === "make coffee") {
          termLine("make: *** No rule to make target 'coffee'. Stop.", "err");
        } else {
          termLine("zane is not in the sudoers file. This incident will be reported.", "err");
        }
        break;

      default:
        termLine("command not found: " + name + " — try 'help'", "err");
    }
    termScroll();
  }

  function termSetOpen(open) {
    buildTerminal();
    if (open === term.open) { return; }
    term.open = open;
    if (open) {
      if (pal.open) { palSetOpen(false); }
      term.root.classList.add("is-open");
      term.root.setAttribute("aria-hidden", "false");
      window.setTimeout(function () { term.input.focus(); }, 0);
      termScroll();
    } else {
      term.root.classList.remove("is-open");
      term.root.setAttribute("aria-hidden", "true");
      if (document.activeElement === term.input) {
        try { term.input.blur(); } catch (e) { /* noop */ }
      }
    }
  }

  /* ======================================================================
     Boot sequence  (z 1200, once per session, skipped for reduced motion)
     ====================================================================== */

  function runBootSequence() {
    if (reduceMotion) { return; }
    var seen = null;
    try { seen = sessionStorage.getItem("zane_booted"); } catch (e) { seen = "1"; }
    if (seen) { return; }
    try { sessionStorage.setItem("zane_booted", "1"); } catch (e) { /* noop */ }

    var overlay = el("div", "fx-boot");
    overlay.setAttribute("aria-hidden", "true");
    var pre = el("pre", "fx-boot__pre");
    var textNode = document.createTextNode("");
    var cursor = el("span", "fx-boot__cursor");
    pre.appendChild(textNode);
    pre.appendChild(cursor);
    overlay.appendChild(pre);
    document.body.appendChild(overlay);

    var lines = [
      "ZANE-BIOS v3.7 — phosphor build",
      "init hardware .............. ok",
      "mount /dev/projects ........ ok",
      "load three.js r149 ......... ok",
      "calibrating imu ............ ok",
      "starting zane.sh"
    ];
    var script = lines.join("\n") + "\n";
    var pos = 0;
    var finished = false;
    var timer = 0;
    var step = Math.max(1, Math.ceil(script.length / (1400 / 14)));

    function finish() {
      if (finished) { return; }
      finished = true;
      if (timer) { window.clearTimeout(timer); }
      textNode.nodeValue = script;
      overlay.classList.add("is-done");
      window.removeEventListener("keydown", skipKey, true);
      window.setTimeout(function () {
        if (overlay.parentNode) { overlay.parentNode.removeChild(overlay); }
      }, 350);
    }

    function type() {
      if (finished) { return; }
      pos = Math.min(script.length, pos + step);
      textNode.nodeValue = script.slice(0, pos);
      if (pos >= script.length) {
        timer = window.setTimeout(finish, 260);
      } else {
        timer = window.setTimeout(type, 14);
      }
    }

    function skipKey(e) {
      /* swallow the skip keystroke so it can't also trigger
         palette / terminal / konami shortcuts underneath */
      if (e && e.stopPropagation) { e.stopPropagation(); }
      finish();
    }

    overlay.addEventListener("click", finish);
    window.addEventListener("keydown", skipKey, true);
    timer = window.setTimeout(type, 60);
  }

  /* ======================================================================
     data-decode text scramble
     ====================================================================== */

  function scramble(node) {
    var original = node.textContent;
    if (!original || !original.trim()) { return; }
    var duration = 600;
    var start = 0;
    var len = original.length;

    function frame(now) {
      if (!start) { start = now; }
      var p = Math.min(1, (now - start) / duration);
      var solved = Math.floor(p * len);
      var out = original.slice(0, solved);
      for (var i = solved; i < len; i++) {
        var ch = original.charAt(i);
        out += (ch === " " || ch === "\n")
          ? ch
          : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length));
      }
      node.textContent = out;
      if (p < 1) {
        window.requestAnimationFrame(frame);
      } else {
        node.textContent = original;
      }
    }
    window.requestAnimationFrame(frame);
  }

  function initDecode() {
    var nodes = document.querySelectorAll("[data-decode]");
    if (!nodes.length || reduceMotion || !("IntersectionObserver" in window)) {
      return;
    }
    var seen = typeof WeakSet === "function" ? new WeakSet() : null;
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var entry = entries[i];
        if (!entry.isIntersecting) { continue; }
        io.unobserve(entry.target);
        if (seen) {
          if (seen.has(entry.target)) { continue; }
          seen.add(entry.target);
        }
        if (entry.target.childElementCount === 0) {
          scramble(entry.target);
        }
      }
    }, { threshold: 0.4 });
    for (var i = 0; i < nodes.length; i++) { io.observe(nodes[i]); }
  }

  /* ======================================================================
     Nav HUD  (#hudSlot, <=4Hz, hidden <720px via CSS)
     ====================================================================== */

  function initHud() {
    var slot = document.getElementById("hudSlot");
    if (!slot) { return; }

    var hud = el("span", "fx-hud");
    var fpsB = el("b", null, "--");
    var scrB = el("b", null, "0%");

    hud.appendChild(document.createTextNode("FPS "));
    hud.appendChild(fpsB);
    hud.appendChild(el("span", "fx-hud__sep", "·"));
    hud.appendChild(document.createTextNode("SCROLL "));
    hud.appendChild(scrB);
    hud.appendChild(el("span", "fx-hud__sep", "·"));
    hud.appendChild(document.createTextNode("22.3°N 114.2°E"));
    slot.appendChild(hud);

    var frames = 0;
    var ownFps = 60;
    var lastStamp = performance.now();

    function countFrame() {
      frames++;
      window.requestAnimationFrame(countFrame);
    }
    window.requestAnimationFrame(countFrame);

    window.setInterval(function () {
      if (document.hidden) {
        frames = 0;
        lastStamp = performance.now();
        return;
      }
      var now = performance.now();
      var dt = (now - lastStamp) / 1000;
      if (dt > 0) { ownFps = ownFps * 0.5 + (frames / dt) * 0.5; }
      frames = 0;
      lastStamp = now;

      var fps = ownFps;
      if (window.SceneManager &&
          typeof window.SceneManager.fps === "number" &&
          isFinite(window.SceneManager.fps) &&
          window.SceneManager.fps > 0) {
        fps = window.SceneManager.fps;
      }
      fpsB.textContent = String(Math.max(0, Math.min(240, Math.round(fps))));

      var doc = document.documentElement;
      var max = Math.max(1, doc.scrollHeight - window.innerHeight);
      var pct = Math.round(Math.max(0, Math.min(1, window.scrollY / max)) * 100);
      scrB.textContent = pct + "%";
    }, 250);
  }

  /* ======================================================================
     Global keyboard routing
     ====================================================================== */

  var KONAMI = [
    "arrowup", "arrowup", "arrowdown", "arrowdown",
    "arrowleft", "arrowright", "arrowleft", "arrowright", "b", "a"
  ];
  var konamiIdx = 0;

  function initKeys() {
    window.addEventListener("keydown", function (e) {
      if (e.defaultPrevented) { return; }
      var key = e.key || "";
      var low = key.toLowerCase();

      /* Esc works everywhere, including inside inputs. */
      if (key === "Escape") {
        if (term.open) { termSetOpen(false); e.preventDefault(); return; }
        if (pal.open) { palSetOpen(false); e.preventDefault(); return; }
        return;
      }

      /* Ctrl/Cmd+K toggles the palette even over page content;
         all remaining shortcuts are ignored while typing. */
      if ((e.ctrlKey || e.metaKey) && low === "k" && !e.altKey && !e.shiftKey) {
        if (isTypingTarget(e.target)) { return; }
        e.preventDefault();
        palSetOpen(!pal.open);
        return;
      }

      if (isTypingTarget(e.target)) { return; }
      if (e.ctrlKey || e.metaKey || e.altKey) { return; }

      /* konami tracking (plain keys only) */
      if (low === KONAMI[konamiIdx]) {
        konamiIdx++;
        if (konamiIdx === KONAMI.length) {
          konamiIdx = 0;
          crtToggle();
        }
      } else {
        konamiIdx = low === KONAMI[0] ? 1 : 0;
      }

      if (key === "/") {
        e.preventDefault();
        palSetOpen(true);
        return;
      }
      if (key === "`") {
        e.preventDefault();
        termSetOpen(!term.open);
      }
    });

    /* any [data-action="palette"] button opens the palette */
    document.addEventListener("click", function (e) {
      var btn = e.target && e.target.closest
        ? e.target.closest('[data-action="palette"]')
        : null;
      if (!btn) { return; }
      e.preventDefault();
      palSetOpen(true);
    });
  }

  /* ======================================================================
     init
     ====================================================================== */

  onReady(function () {
    if (!document.body) { return; }
    runBootSequence();
    initDecode();
    initHud();
    initKeys();
  });
})();
