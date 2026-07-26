/* =========================================================
   Ziheng (Zane) Cheng — Portfolio core interactions
   theme · nav · reveal · counters · filters · tilt · modal
   ========================================================= */
(function () {
  "use strict";
  var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* Theme toggle — default DARK when nothing stored */
  var root = document.documentElement;
  var themeToggle = document.getElementById("themeToggle");
  var stored = null;
  try { stored = localStorage.getItem("theme"); } catch (e) {}
  root.setAttribute("data-theme", stored === "light" ? "light" : "dark");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      window.dispatchEvent(new CustomEvent("themechange"));
    });
  }

  /* Mobile nav */
  var navToggle = document.getElementById("navToggle");
  var navLinks = document.querySelector(".nav__links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      var open = navLinks.classList.toggle("is-open");
      navToggle.setAttribute("aria-expanded", String(open));
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("is-open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* Nav border + scroll progress */
  var nav = document.getElementById("nav");
  var bar = document.getElementById("scrollProgress");
  var onScroll = function () {
    var y = window.scrollY || window.pageYOffset;
    if (nav) nav.classList.toggle("is-scrolled", y > 8);
    if (bar) {
      var hh = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (hh > 0 ? (y / hh) * 100 : 0) + "%";
    }
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* Reveal on scroll */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el, i) { el.style.transitionDelay = Math.min(i % 6, 5) * 60 + "ms"; io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add("is-visible"); });
  }

  /* Count-up stats */
  var counters = document.querySelectorAll("[data-count]");
  var runCounter = function (el) {
    var target = parseFloat(el.getAttribute("data-count")) || 0;
    var suffix = el.getAttribute("data-suffix") || "";
    if (reduceMotion) { el.textContent = target + suffix; return; }
    var dur = 1100, start = null;
    var step = function (t) {
      if (start === null) start = t;
      var p = Math.min((t - start) / dur, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  if ("IntersectionObserver" in window && counters.length) {
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting) { runCounter(e.target); cio.unobserve(e.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (c) { cio.observe(c); });
  } else { counters.forEach(runCounter); }

  /* Project filtering */
  var filters = document.querySelectorAll(".filter");
  var cards = document.querySelectorAll(".card[data-cat]");
  filters.forEach(function (btn) {
    btn.addEventListener("click", function () {
      filters.forEach(function (f) { f.classList.remove("is-active"); });
      btn.classList.add("is-active");
      var cat = btn.getAttribute("data-filter");
      cards.forEach(function (card) {
        var match = cat === "all" || card.getAttribute("data-cat").indexOf(cat) !== -1;
        card.classList.toggle("is-hidden", !match);
      });
    });
  });

  /* Card 3D tilt (fine pointer only) */
  var finePointer = window.matchMedia && window.matchMedia("(pointer: fine)").matches;
  if (finePointer && !reduceMotion) {
    cards.forEach(function (card) {
      card.addEventListener("mousemove", function (e) {
        var r = card.getBoundingClientRect();
        card.classList.add("is-tilting");
        card.style.setProperty("--ry", ((e.clientX - r.left) / r.width - 0.5) * 5 + "deg");
        card.style.setProperty("--rx", -((e.clientY - r.top) / r.height - 0.5) * 5 + "deg");
      });
      card.addEventListener("mouseleave", function () {
        card.classList.remove("is-tilting");
        card.style.setProperty("--ry", "0deg");
        card.style.setProperty("--rx", "0deg");
      });
    });
  }

  /* Detail modal */
  var modal = document.getElementById("modal");
  var modalBody = document.getElementById("modalBody");
  var lastFocus = null;

  function openModal(id) {
    var tpl = document.getElementById("detail-" + id);
    if (!tpl || !modal || !modalBody) return;
    /* clean up whatever a previous open left behind */
    if (window.SceneManager) SceneManager.release(modalBody);
    if (window.ProjectDemos) ProjectDemos.stop();
    lastFocus = document.activeElement;
    modalBody.innerHTML = "";
    modalBody.appendChild(tpl.content.cloneNode(true));
    var demoEl = modalBody.querySelector(".demo[data-demo]");
    if (demoEl && window.ProjectDemos) ProjectDemos.mount(demoEl.getAttribute("data-demo"), demoEl);
    if (window.SceneManager) SceneManager.scan(modalBody);
    modalBody.querySelectorAll("a[data-placeholder]").forEach(function (a) {
      a.setAttribute("title", "Add your link in index.html");
      a.addEventListener("click", function (e) { e.preventDefault(); });
    });
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");
    var closeBtn = modal.querySelector(".modal__close");
    if (closeBtn) closeBtn.focus();
    modal.querySelector(".modal__panel").scrollTop = 0;
  }
  function closeModal() {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
    if (window.SceneManager && modalBody) SceneManager.release(modalBody);
    if (window.ProjectDemos) ProjectDemos.stop();
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  /* Public API — command palette / terminal open projects through this */
  window.openProject = openModal;

  cards.forEach(function (card) {
    var id = card.getAttribute("data-id");
    if (!id) return;
    card.addEventListener("click", function (e) {
      if (e.target.closest("a")) return;
      /* ignore clicks that were really 3D-scene drags (scene-manager flags them) */
      var scene = e.target.closest("[data-model3d]");
      if (scene && scene.getAttribute("data-dragging") === "1") return;
      openModal(id);
    });
    card.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); openModal(id); }
    });
  });
  if (modal) {
    modal.querySelectorAll("[data-close]").forEach(function (el) {
      el.addEventListener("click", closeModal);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("is-open")) closeModal();
    });
  }

  /* Footer year */
  var yr = document.getElementById("year");
  if (yr) yr.textContent = new Date().getFullYear();
})();
