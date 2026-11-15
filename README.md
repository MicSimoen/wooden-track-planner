# Wooden Track Planner

Plan BRIO and IKEA LILLABO wooden train layouts using the track you actually own.

- Real piece dimensions (BRIO track guide, measured LILLABO pieces), snapping joints, peg/hole checks
- Inventory: set how many of each piece you own, see what's used and what's left
- Gap measurement, so you can see whether a loop will close
- Bridges and ramps with height levels, plus a **3D view** and a **clearance check** for track passing under bridges
- Custom pieces for anything that isn't in the list
- **Scan your inventory with the camera**: photograph your pieces next to a sheet of A4 paper, tap its corners, and the app measures and recognises each piece (you check and correct before adding)
- Made for iPad: pinch to zoom, big buttons, a floating toolbar next to the selected piece, +/− steppers
- Works offline and can be added to the iPad/iPhone home screen as an app

## Put it online with GitHub Pages

1. On GitHub, create a new **public** repository, e.g. `wooden-track-planner` (no README needed).
2. On the empty repository page, click **uploading an existing file**, drag in **everything in this folder**
   (`index.html`, `manifest.webmanifest`, `sw.js`, `.nojekyll`, `README.md` and the `icons` folder), then **Commit changes**.
   > Tip: on a Mac, `.nojekyll` is hidden in Finder. Press Cmd+Shift+. to show it. It isn't strictly needed.
3. Go to **Settings → Pages**. Under *Build and deployment*, set **Source: Deploy from a branch**, **Branch: main**, folder **/ (root)**, and click **Save**.
4. After a minute or two the page is live at `https://<your-username>.github.io/wooden-track-planner/`.

## Install on the iPad

1. Open the GitHub Pages address in **Safari** on the iPad.
2. Tap **Share → Add to Home Screen → Add**.
3. Open it from the home screen once while online. After that it also works offline, 3D view included.

Your layouts and inventory are stored on the device, inside the app. Use **Save / load** to copy a backup now and then.

## Scanning tips

- Lay pieces flat and apart (a hand's width), with an A4 or US Letter sheet flat next to them.
- A plain floor or rug that contrasts with the wood works best; avoid strong shadows.
- 10–20 pieces per photo; several photos add up.
- Look-alikes (e.g. BRIO 144 mm vs IKEA 145 mm straights, or ramps vs straights seen from above) are marked orange so you can choose.
  Untick a brand you don't own to reduce them.
- Everything runs on the device; photos are not uploaded anywhere.

## Updating

Change `index.html`, then increase `VERSION` in `sw.js` (e.g. `"v1"` → `"v2"`) so installed copies pick up the new version.
An open app updates the next time it is started while online.

## Dimensions and sources

- BRIO: [woodenrailway.info track guide](https://woodenrailway.info/track/brio-track-guide). Track is 40 mm wide and 12 mm thick, ramps rise 64 mm.
- IKEA LILLABO straights and curves: measurements of a 2025 reproduction collected by [ChooChooCAD](https://github.com/raduuuuu/ChooChooCAD/pull/64) (unverified).
- Pieces marked *estimated* in the app (IKEA double Y, parallel switches, IKEA ramp length) are guesses. Measure yours and correct them with a custom piece.
