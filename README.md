# Zane Cheng — Portfolio

A minimal, modern, single-page portfolio. Pure static HTML/CSS/JS — **no build step, no dependencies**. Just open it or drop it on any static host.

## Files

```
index.html              ← all content (edit your text here)
assets/css/styles.css   ← design system (colors, fonts, layout)
assets/js/main.js        ← theme toggle, filtering, scroll reveals
README.md
```

## Preview locally

Double-click `index.html`, or run a tiny local server (better for fonts/caching):

```bash
cd this-folder
python3 -m http.server 8000
# open http://localhost:8000
```

## Deploy (pick one — all free)

**GitHub Pages**
1. Create a repo, push these files to the `main` branch.
2. Repo → Settings → Pages → Source: `Deploy from a branch` → `main` / `root`.
3. Live at `https://<username>.github.io/<repo>/` in ~1 min.
   - Tip: name the repo `<username>.github.io` to get it at the root domain.

**Vercel** — vercel.com → New Project → import the repo → Deploy (no settings needed, it's static).

**Netlify** — netlify.com → drag-and-drop this whole folder onto the dashboard. Done.

## Adding images (the easy part)

Every project + the hero has an image slot. Until a file exists, the slot shows a tidy labeled
placeholder — nothing looks broken. To add a real image, just drop a file into `assets/img/`
with the **exact name** below (any of `.jpg`, `.png`, `.webp` — keep the name, change nothing in code):

| Slot | File name | Best aspect ratio |
|------|-----------|-------------------|
| Hero (featured) | `assets/img/hero.jpg` | ~4:3 |
| Vibe Box | `assets/img/vibe-box.jpg` | 16:10 |
| Canine Collar | `assets/img/dog-collar.jpg` | 16:10 |
| SKSFF Manager | `assets/img/sksff.jpg` | 16:10 |
| Smart Parking | `assets/img/smart-parking.jpg` | 16:10 |
| 3D Reconstruction | `assets/img/3d-reconstruction.jpg` | 16:10 |
| Food Segmentation | `assets/img/food-segmentation.jpg` | 16:10 |
| FloodUU | `assets/img/flooduu.jpg` | 16:10 |

That's it — refresh the page and the image appears. (Cards are cropped to fit, so any size works;
landscape looks best. For the 3D render you shared, save it as whichever slot fits — e.g. `hero.jpg`.)

## What to fill in (search `index.html` for these)

- **GitHub / LinkedIn links** — search for `data-placeholder`. Replace `href="#"` with your real URLs (in the Projects cards and the Contact section).
- **Project links** — `Demo →`, `Code →`, `App →`, `Write-up →` are placeholders; add URLs or delete the `<a>` if none.
- **`[confirm details]`** markers — three newest projects (Vibe Box, the dog collar, SKSFF app) have small `<em>[confirm ...]</em>` notes where I made reasonable guesses. Replace with the real model / stack / results, then delete the `<em>` note.
- **Photo (optional)** — none included yet. Easy to add a headshot to the hero if you want one.

## Customize the look

Open `assets/css/styles.css`, top of file:

- **Accent color** — change `--accent` (currently warm amber `#e8743b`). The whole site re-themes from this one value. Dark-mode accent is `--accent` under `[data-theme="dark"]`.
- **Fonts** — headings use *Space Grotesk*, body uses *Inter* (loaded in `index.html`).
- **Dark / light** — toggle is in the top-right; the site also respects the visitor's system preference and remembers their choice.

## Notes

- Fully responsive (mobile nav included) and respects `prefers-reduced-motion`.
- The contact email is `chengziheng0621@outlook.com` and phone `+852 6228 7270` — change in the Contact section of `index.html`.
