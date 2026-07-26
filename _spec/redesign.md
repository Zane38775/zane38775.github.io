# Personal Site "Geek 3D" Redesign — Master Spec

Owner: Ziheng "Zane" Cheng — HKUST final-year, embedded systems + algorithms + CV.
Goal: dark-first **"Terminal × Hardware Lab"** aesthetic; a detailed procedural Three.js model
for every project; new geek interactions (command palette, fake terminal, decode text, boot
sequence, telemetry HUD, exploded view). Static site, **no build step, no frameworks** —
plain HTML/CSS/JS, all scripts are classic IIFE scripts (NO ES modules, NO import/export).

The site content (English copy, project facts, contact info) is REAL RESUME DATA — never
invent new facts, awards, or metrics. Microcopy may be re-toned geekier.

---

## 1. File ownership (each agent edits ONLY its own files)

| Unit    | Files (create/rewrite)                                          |
|---------|-----------------------------------------------------------------|
| core    | `index.html`, `assets/css/styles.css`, `assets/js/main.js`      |
| scene   | `assets/js/scene-manager.js` (new)                              |
| fx      | `assets/js/interactions.js` (new), `assets/css/interactions.css` (new) |
| bg      | `assets/js/bg.js` (rewrite)                                     |
| model-* | `assets/js/models/<id>.js` (new), ids: hero vibe collar sksff parking recon food flood |

Untouched: `assets/js/sensor.js`, `assets/js/demos.js`, `assets/img/*`, `_rev2/`, `_review/`.
`assets/js/three-scenes.js` is dead code (was never loaded) — integration deletes it.

## 2. Design tokens (styles.css `:root`, dark is DEFAULT via `html[data-theme="dark"]` AND no-attr default)

Dark ("phosphor terminal"):
```
--bg:#070b0f; --bg-alt:#0b1118; --surface:#0f151d; --surface-2:#141c26;
--border:#1d2938; --border-bright:#2b3b50;
--accent:#00e893;        /* phosphor green — primary */
--accent-soft:#5cffc0;
--accent-2:#4dc9ff;      /* cyan — secondary */
--warn:#ffb454; --danger:#ff5c57;
--text:#d7e1ea; --text-soft:#8b9bab; --text-faint:#566575;
--font-mono:'JetBrains Mono',ui-monospace,monospace;
--cover-a/--cover-b/--cover-line/--cover-ink : keep vars, retint to dark surface + green ink
```
Light theme = "blueprint paper": bg #f2f5f4, surface #ffffff, accent #009e6b, accent-2 #0077cc,
text #101820. Theme toggle stays; **default dark when nothing stored in localStorage**.

Typography: **JetBrains Mono for h1–h3, nav, labels, buttons, kickers**; Inter for body text.
Texture: subtle dot-grid on body bg (CSS radial-gradient tile), very subtle scanline overlay
(repeating-linear-gradient, opacity ~0.03, `body::after`, pointer-events:none, hidden in light theme).
Glow: accent elements get `text-shadow`/`box-shadow` phosphor glow. Selection ::selection accent.
Reduced motion: keep the existing `prefers-reduced-motion` global kill-switch.

## 3. z-index map

bgfield -1 · matrix-rain -1 (bgfield hidden while on) · page content auto · **#scene3d canvas 50
(fixed, inset:0, pointer-events:none)** · nav 100 · modal 1000 · palette 1100 · terminal 1150 ·
boot overlay 1200 · toasts 1250.

## 4. Script load order (end of body, classic scripts, exactly this order)

```html
<script src="https://unpkg.com/three@0.149.0/build/three.min.js"></script>
<script src="assets/js/models/hero.js"></script>
<script src="assets/js/models/vibe.js"></script>
<script src="assets/js/models/collar.js"></script>
<script src="assets/js/models/sksff.js"></script>
<script src="assets/js/models/parking.js"></script>
<script src="assets/js/models/recon.js"></script>
<script src="assets/js/models/food.js"></script>
<script src="assets/js/models/flood.js"></script>
<script src="assets/js/scene-manager.js"></script>
<script src="assets/js/bg.js"></script>
<script src="assets/js/sensor.js"></script>
<script src="assets/js/demos.js"></script>
<script src="assets/js/main.js"></script>
<script src="assets/js/interactions.js"></script>
```
Head: keep Google Fonts (JetBrains Mono 400;500;700 + Inter 400;500;600 — Space Grotesk may be dropped),
`styles.css` then `interactions.css`.

## 5. DOM contract (core provides, others consume)

- `<canvas id="bgfield">` kept (bg.js).
- IMU instrument kept in hero with EXACT ids: `canvas#imu`, `#imuA`, `#imuG`, `#imuS` (+ its
  `data-state` attr). sensor.js depends on them. Wrapper markup/classes may change.
- Hero 3D: `<div id="hero3d" class="hero__scene" data-model3d="hero"></div>` — sized ~ min(46vw, 520px)
  square-ish, placed in hero right column above/behind the IMU panel.
- Each project card keeps `article.card[data-id][data-cat]` + its inline `svg.cover` (WebGL
  fallback) inside `.cover-wrap`, and core ADDS `<div class="cover3d" data-model3d="<id>"></div>`
  into each `.cover-wrap`. CSS: `.cover-wrap.has-3d .cover { opacity:0; transition:.4s }`
  (scene-manager adds `.has-3d` when a model mounts). `.cover3d` fills the wrap, `cursor:grab`.
- Each `<template id="detail-<id>">` keeps ALL current content (`.demo[data-demo]` divs, imgs,
  meta, links) and ADDS as the FIRST child of `.detail__media`:
  `<div class="detail__scene" data-model3d="<id>" data-scene-mode="modal"></div>` (height ~300–380px).
- Nav contains `<div id="hudSlot" class="nav__hud" aria-hidden="true"></div>` (fx fills it).
- Modal ids kept: `#modal`, `#modalBody`, `[data-close]`.
- All section titles + hero title get `data-decode` attribute (fx scramble-decodes them on reveal).
- Section kickers restyled as terminal prompts, e.g. `<span class="prompt">zane@hkust:~$</span> cat 01_about.md`.
- Favicon: swap to a green `>_` terminal SVG data-URI.

## 6. main.js responsibilities (core owns)

Keep ALL existing behaviors: theme toggle (+localStorage, default dark), burger nav, scroll
progress, `.reveal` IntersectionObserver, `data-count` counters, project filters, card tilt
(pointer:fine only), modal open/close (incl. `ProjectDemos.mount`), `#year`.
ADD:
- `window.openProject(id)` — programmatically open a project modal (palette/terminal use it).
- After injecting a template into `#modalBody`: call `window.SceneManager && SceneManager.scan(modalBody)`.
  On modal close: `window.SceneManager && SceneManager.release(modalBody)`.
- Theme toggle dispatches `window.dispatchEvent(new CustomEvent('themechange'))`.
- Card click must ignore drags on `.cover3d` (scene-manager sets `data-dragging="1"` on the
  element during/just after a drag — main.js checks it before opening the modal).

## 7. Model registry contract (all model-* units)

File shape (classic script, strict IIFE, ONLY global THREE + own registry, no fetch/textures
from disk; procedural CanvasTexture allowed):

```js
(function () {
  "use strict";
  window.ProjectModels = window.ProjectModels || {};
  window.ProjectModels["vibe"] = {
    camera: { distance: 6.5, height: 1.6, fov: 38 },   // optional hints
    build: function (THREE, env) {
      // env = { palette: { accent, accent2, warn, danger, ink, soft }, mode: 'card'|'modal'|'hero', quality: 0..1 }
      // MUST return:
      // {
      //   group: THREE.Group     — fits sphere r≈2.2 at origin, y-up, "front" faces +Z
      //   update: function (t, dt, ctx) {}  — t seconds; ctx = { hover:bool, pointer:{x,y in -1..1}, explode:0..1, mode }
      //   parts: [ { object, dir: THREE.Vector3(unit), dist: Number 0.5–1.8 } ]  — exploded view
      //   dispose: function () {}          — optional extra cleanup
      // }
    }
  };
})();
```

Rules:
- Three r149 API ONLY: BufferGeometry classes (Box/Cylinder/Sphere/Torus/Cone/Icosahedron/
  Lathe/Extrude/Tube/Plane/Ring/CircleGeometry), Points+PointsMaterial, LineSegments/Line,
  Sprite+SpriteMaterial with CanvasTexture. NO THREE.Geometry, no loaders, no examples/jsm.
- Materials: MeshStandardMaterial / MeshPhysicalMaterial; emissive for LEDs/screens/traces.
  Use env.palette colors for glow accents so themes stay coherent. Metalness/roughness tuned —
  these must look 精致 (refined), not like primitive blobs: bevel edges where cheap (e.g.
  slightly-rounded boxes via multiple segments not required; chamfer illusions via extra thin
  boxes/cylinders are fine), consistent scale, deliberate silhouettes.
- Perf: ≤ ~30k triangles, reuse geometries/materials, ZERO allocations inside update()
  (preallocate vectors/arrays; store initial positions for vertex animation).
- update() animates sub-parts only (spin, pulse, bob). DO NOT rotate the whole group — the
  scene-manager owns group rotation (auto-rotate + user drag).
- parts[] positions: scene-manager records each object's base position at mount and applies
  `base + dir*dist*explodeFactor`. Choose dirs that read like an engineering exploded diagram
  (lids up, internals sideways, base down).
- No console.log. Guard everything (file must not throw if THREE missing: check at top and return).

## 8. scene-manager.js contract (scene unit)

Global `window.SceneManager = { scan(root), release(root), fps }`. Behavior:

- Init on DOMContentLoaded. If `typeof THREE === "undefined"` or WebGL unavailable → add
  `no-webgl` class on `<body>`, define SceneManager as no-ops, return. (SVG covers remain.)
- **Shared-canvas scissor architecture** (like three.js `webgl_multiple_elements` example) for
  all non-modal mounts (`.cover3d`, `#hero3d`): ONE fixed transparent canvas `#scene3d`
  (inset:0, pointer-events:none, z-index:50), one WebGLRenderer({alpha:true,antialias:true}),
  DPR ≤ 1.75. Per rAF: size canvas to viewport, clear, then for each ACTIVE mount compute
  `getBoundingClientRect()`, skip if offscreen, `setViewport`+`setScissor` (flip Y:
  `y = canvasH - rect.bottom*dpr`), render that mount's scene.
- **Modal mounts** (`[data-scene-mode="modal"]`): dedicated small renderer + canvas appended
  inside the element (only ever 1 alive), plus an overlay UI button `[ EXPLODE ]`
  (class `scene-explode-btn`, styles injected by scene-manager itself via a <style> tag) that
  eases explodeFactor 0↔1 (~600ms cubic). Dispose renderer on release().
- Per mount: scene = AmbientLight(0x8899aa,.55) + DirectionalLight(0xffffff,.95, pos 3,5,4) +
  PointLight(accent,.5, pos -3,2,-3); PerspectiveCamera(fov||38) at (0, height||1.4, distance||6.5)
  lookAt(0,.1,0); the model group nested in an outer `spin` Group.
- Auto-rotate spin.rotation.y += dt*0.25 (×3 eased while hovered); pointer parallax tilts
  spin.rotation.x toward pointer.y*0.15.
- Drag-to-rotate with inertia on the placeholder element itself (pointerdown/move/up; capture;
  velocity decay 0.94/frame). While dragging and for 250ms after, set `el.dataset.dragging="1"`
  else remove it (main.js contract §6). cursor grab/grabbing.
- Soft fake ground shadow: small radial-gradient CanvasTexture on a y≈-1.35 plane, per scene.
- env.palette read from computed CSS vars (--accent, --accent-2, --warn, --danger, --text,
  --text-soft). On `themechange` event: dispose + rebuild all live mounts with new palette.
- IntersectionObserver actives mounts (rootMargin 100px); `document.hidden` pauses rAF;
  `prefers-reduced-motion` → render ONE static frame per mount, still re-render on drag only.
- Adds `.has-3d` to the closest `.cover-wrap` (if any) once mounted, so CSS fades the SVG out.
- `SceneManager.fps` — rolling FPS number updated ~1/s. If fps<38 for >2s, drop DPR to 1.
- Full dispose on release: traverse geometries/materials/textures, cancel observers/listeners.
- Handle `webglcontextlost` → body class `no-webgl`, un-hide SVG covers (remove .has-3d).

## 9. interactions.js / interactions.css (fx unit)

All UI it needs is self-created DOM (appended to body) + styles in interactions.css. Mono font,
palette from CSS vars, phosphor-glow styling consistent with §2. Respect reduced-motion.

1. **Boot sequence**: first visit per session (`sessionStorage.zane_booted`) — full-screen
   overlay (z 1200), ~1.4s of terminal boot lines typing fast (`init hardware… ok`,
   `mount /dev/projects… ok`, `starting zane.sh`), then fade+remove. Click/keypress skips.
   Never show for reduced-motion users. Content stays in DOM underneath (SEO-safe).
2. **Command palette**: Ctrl+K / Cmd+K / `/` (when not typing in an input) opens; fuzzy filter;
   items: 5 section jumps · 7 projects ("open: Vibe Box" → `window.openProject('vibe')`) ·
   toggle theme · toggle matrix · open terminal · copy email (clipboard + toast) · GitHub link ·
   `sudo make coffee` (toast: `make: *** No rule to make target 'coffee'. Stop.`).
   Keyboard: ↑↓ move, Enter run, Esc close. ARIA: role=dialog + listbox.
3. **Terminal overlay**: backtick `` ` `` toggles (and palette item). Fake shell `zane@hkust:~$`
   with history (↑↓). Commands: `help`, `whoami`, `ls` (lists projects), `open <id|number>`,
   `cat about.txt`, `cat contact.txt`, `theme`, `matrix`, `clear`, `exit`, `konami` (prints hint),
   `sudo rm -rf /` → `permission denied: nice try.` Unknown → `command not found`.
4. **Decode text**: elements with `data-decode` scramble-in (random glyphs `!<>-_\/[]{}—=+*^?#`
   resolving left→right, ~600ms) when first revealed (IntersectionObserver). Skip if reduced-motion.
5. **HUD** in `#hudSlot`: tiny mono readout `FPS 60 · SCROLL 42% · 22.3°N 114.2°E`. FPS from
   `SceneManager.fps` if present else own rAF counter. Update ≤4Hz. Hidden < 720px viewport.
6. **Konami code** (↑↑↓↓←→←→BA) → toggles body class `crt-mode` (CSS: stronger scanlines,
   slight chromatic-aberration text-shadow, vignette) + toast `CRT MODE [ON]`.
7. **Matrix rain**: fixed canvas z:-1; while ON add body class `matrix-on` (CSS hides #bgfield);
   green glyph rain (katakana+digits), ~30fps cap. Toggled via palette/terminal/konami? — only
   palette+terminal.
8. **Toast** helper: bottom-center mono chip, auto-dismiss 2.5s (z 1250).

## 10. bg.js rewrite (bg unit)

Keep `#bgfield` canvas + CSS-var color reading + MutationObserver theme refresh + reduced-motion
static frame + DPR cap ≤1.5 + hidden-tab pause. New visuals (subtle, alpha ≤ .30):
- Perspective dot-grid "floor horizon" at the bottom third, slow forward drift.
- Sparse drifting particles; within 130px of each other AND near cursor (<220px) draw thin
  connection lines (constellation effect).
- Occasional (every 3–6s) "data packet": a bright accent streak traveling along a horizontal
  scanline with a small trailing gradient.
Also listen for the `themechange` CustomEvent (in addition to the MutationObserver).

## 11. Per-model creative briefs (each ≈150–300 lines, must feel hand-crafted)

- **hero** — *silicon centerpiece*: dark PCB slab (rounded, 3.2×2.2), big central MCU (black,
  gold pin rows on 4 sides, pulsing accent glow ring), SMD caps/resistors scattered with intent,
  glowing copper traces (accent) with 4–6 light packets traveling along polyline paths;
  above the board: floating icosahedron core (wireframe+solid duo) inside 2–3 slowly
  counter-rotating gyroscope rings (cyan). Hover: packets speed ×2.5, core emissive up.
  Explode: chip up, rings out, core up-forward, caps sideways.
- **vibe** — *AI DJ station*: beveled chassis; two spinning turntable platters w/ groove rings
  + tonearms; center mixer (3 knobs + crossfader); front speaker cone pulsing on a 100-BPM sine
  "beat"; LED strip around chassis rim (12–16 emissive spheres chasing, colors cycling
  accent→accent2→warn); 6 floating EQ bars above dancing like a spectrum. Explode: platters up,
  mixer forward, speaker forward-down, LED ring out.
- **collar** — *canine wearable*: flattened torus collar band (dark strap w/ stitch line —
  thin dashed tube), metal buckle; top electronics pod: green PCB, ESP32 shield can (silver),
  MPU6050 chip, blinking status LED (double-blink heartbeat pattern), coin cell under;
  hanging bone-tag; an orbiting live "accel waveform" ribbon (Line, animated points from stored
  base + sin) circling the collar. Explode: pod lid up, PCB up, battery down, tag down-forward.
- **sksff** — *shelter ops*: cozy dog house (walls + gabled roof + arched door), procedural
  little dog beside it (capsule body, sphere head, cone ears, wagging tail cylinder), 3 floating
  holo panels (translucent rounded planes with emissive list-row bars; one row gets a checkmark
  tick every ~2.5s — "walked ✓"), glowing paw prints path on ground disc. Idle: tail wag, head
  tilt, panels bob. Explode: roof up, walls apart, panels out, dog forward.
- **parking** — *vision pipeline*: asphalt ground slab with 3 painted slots; 2 parked low-poly
  cars (box-sculpted bodies, cylinder wheels, glass canopy); 3rd car slowly drives into / out of
  the empty slot on a loop; corner camera pole (pole + housing + lens + blinking LED) sweeping
  a translucent view-frustum cone; pulsing wireframe bounding boxes (LineSegments) snap around
  each car; sprite labels above (`CAR 0.97`, `EV-5842`) in mono CanvasTexture. Explode: cars up
  staggered, camera up, labels higher, ground stays.
- **recon** — *tank scan*: industrial steel tank (lathe: cylinder + dished head, brushed metal)
  on 4 legs; a glowing scan ring (accent torus) sweeps up↔down the tank; a point cloud
  (~2500 pts on the tank surface, cyan, BufferGeometry sorted by y + drawRange) materializes
  up to the ring's height (progressive reveal synced to ring); floating readout sprite
  `VOL 12.40 m³ · ERR <0.01%`. Explode: shell forward-left as a "ghost", point cloud stays,
  ring up, legs down.
- **food** — *segmentation plate*: ceramic plate (lathe) with rice mound (flattened hemisphere),
  broccoli (3 sphere-cluster florets on stems), salmon slab (rounded box), 2 tomato slices;
  each food has a translucent color-coded overlay shell (slightly scaled clone, distinct hues:
  accent/accent2/warn/danger) whose opacity pulses one class at a time (like classes cycling in
  an inference demo); a thin scan-grid plane sweeps across the plate every ~4s re-flashing
  overlays; small sprite labels (`rice 212 kcal`). Explode: foods lift staggered, overlays lift
  higher, plate down.
- **flood** — *rescue drone over water*: quadcopter (rounded body, 4 arms, motor pods,
  2-blade props spinning + translucent blur discs, landing legs, camera gimbal dome underneath);
  first-aid payload box (white + red cross) on a cable (Line) that winches down/up on a loop;
  water plane below (translucent blue-cyan, PlaneGeometry ~28×28 segs, sine-wave vertex
  animation from stored base positions); blinking red SOS beacon bobbing in the water; drone
  gently translates toward/away from beacon; subtle expanding ripple rings under the drone.
  Explode: props up-out ×4, arms out, payload down, camera down, body stays.

## 12. Copy / tone guardrails (core)

Keep the real copy; you may add geek framing: nav brand `[zane@hkust ~]$` w/ blinking cursor
block; hero eyebrow like `// embedded systems & algorithms — hong kong`; stats labels mono;
footer adds `▲ 100% hand-rolled · zero frameworks · <script src="three.js">`-style wink; section
kickers as prompts (§5). Contact heading can be `$ ping zane` styled. Meta description/OG keep.
Keyboard hints surfaced subtly (e.g. nav shows `⌘K`, footer shows `` ` `` for terminal).

## 13. Acceptance checklist (integration verifies)

- `node --check` passes for every JS file.
- index.html: script order §4 exact; all `data-model3d` hooks present (8 ids); `#imu` ids intact;
  templates keep `.demo[data-demo]`; interactions.css linked; hudSlot present; favicon swapped.
- styles.css: dark default tokens §2; `.cover-wrap.has-3d .cover` fade rule; `.cover3d` fills;
  scanlines; crt-mode styles NOT here (fx owns them in interactions.css).
- main.js exposes openProject, scans/releases SceneManager on modal open/close, dispatches
  themechange, respects data-dragging.
- Each models/*.js registers exactly its id and returns {group, update, parts}.
- No file uses ES module syntax; no console.log left; no TODO placeholders.
