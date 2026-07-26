# Zane Cheng — Portfolio

A single-page portfolio with a "Terminal × Hardware Lab" aesthetic: a procedural Three.js
model for every project, a command palette, a fake terminal, and other geek interactions.
Pure static HTML/CSS/JS — **no build step, no frameworks, no ES modules** (all classic IIFE
scripts). Just open it or drop it on any static host.

## Structure

```
index.html                     ← all content + script load order (see end of <body>)
assets/css/styles.css          ← design tokens (dark default), layout, components
assets/css/interactions.css    ← styles for palette / terminal / boot / HUD / CRT / matrix
assets/js/main.js              ← theme, nav, reveals, counters, filters, tilt, project modal
assets/js/scene-manager.js     ← mounts/renders every 3D scene (shared-canvas scissor + modal renderer)
assets/js/interactions.js      ← boot sequence, ⌘K palette, ` terminal, decode text, HUD, konami, matrix
assets/js/bg.js                ← ambient background canvas (#bgfield): dot-grid horizon, constellation
assets/js/sensor.js            ← live IMU instrument in the hero (canvas #imu)
assets/js/demos.js             ← 2D canvas demos inside project modals (.demo[data-demo])
assets/js/models/<id>.js       ← one procedural Three.js model per project (the model registry)
```

Script order matters and is fixed in `index.html`: Three.js CDN → the 8 model files →
`scene-manager.js` → `bg.js` → `sensor.js` → `demos.js` → `main.js` → `interactions.js`.

## The model registry

Each file in `assets/js/models/` registers one model on a shared global:

```js
(function () {
  "use strict";
  if (typeof THREE === "undefined") return;
  window.ProjectModels = window.ProjectModels || {};
  window.ProjectModels["myid"] = {
    camera: { distance: 6.5, height: 1.6, fov: 38 },     // optional hints
    build: function (THREE, env) {
      // env = { palette: { accent, accent2, warn, danger, ink, soft }, mode: 'card'|'modal'|'hero', quality: 0..1 }
      return {
        group: group,          // THREE.Group, fits sphere r≈2.2 at origin, front faces +Z
        update: function (t, dt, ctx) {},   // animate sub-parts only; NO allocations; don't rotate group
        parts: [ { object: lid, dir: new THREE.Vector3(0, 1, 0), dist: 1.0 } ], // exploded view
        dispose: function () {}             // optional extra cleanup
      };
    }
  };
})();
```

`scene-manager.js` finds every element with `data-model3d="<id>"`, looks the id up in
`window.ProjectModels`, and renders it:

- **Cards + hero** share ONE fixed transparent canvas (`#scene3d`) via scissor rects — cheap.
- **Modal scenes** (`data-scene-mode="modal"`) get a dedicated renderer plus an `[ EXPLODE ]`
  button that eases the `parts[]` offsets.
- It owns group rotation (auto-rotate, drag with inertia), lighting, ground shadow, theming
  (rebuilds on the `themechange` event), visibility/FPS throttling, and full disposal.
- No WebGL → body gets `no-webgl` and the inline SVG covers stay visible as fallback.

## Adding a new project model

1. Create `assets/js/models/<id>.js` following the registry shape above (Three r149 API only,
   no loaders/textures from disk — procedural `CanvasTexture` is fine).
2. Add `<script src="assets/js/models/<id>.js"></script>` in `index.html` **before**
   `scene-manager.js`.
3. Add the hooks in `index.html`:
   - in the project card's `.cover-wrap`: `<div class="cover3d" data-model3d="<id>"></div>`
   - as first child of the template's `.detail__media`:
     `<div class="detail__scene" data-model3d="<id>" data-scene-mode="modal"></div>`

That's it — scene-manager picks it up on load and on every modal open.

## Preview locally

Double-click `index.html`, or run a tiny local server (better for fonts/caching):

```bash
cd this-folder
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (pick one — all free)

**GitHub Pages** — push to `main`, then Settings → Pages → Deploy from branch → `main` / root.

**Vercel** — vercel.com → New Project → import the repo → Deploy (it's static, no settings).

**Netlify** — netlify.com → drag-and-drop this folder onto the dashboard.

## Customize

- **Design tokens** — top of `assets/css/styles.css` (`--accent` phosphor green `#00e893`,
  `--accent-2` cyan, dark is the default theme; light = "blueprint paper").
- **Fonts** — JetBrains Mono (headings/mono UI) + Inter (body), loaded in `index.html`.
- **Links** — search `index.html` for `data-placeholder` and replace `href="#"` with real URLs.
- Keyboard: `Ctrl/Cmd+K` command palette · `` ` `` terminal · ↑↑↓↓←→←→BA for CRT mode.
- Fully responsive and respects `prefers-reduced-motion` (static frames, no boot sequence).
