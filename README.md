# Wooden Track Planner

Plan BRIO and IKEA LILLABO wooden train layouts using the track you actually own.

- Real piece dimensions (BRIO track guide, measured LILLABO pieces), snapping joints, peg/hole checks
- Side panel with **Pieces** (a palette of what you own), **Inventory** (counts, camera scan, custom pieces) and **Settings**; group by type or by make
- Gap measurement, plus **joint play**: a loop a few mm off is checked against the play in every peg-and-hole joint, and one tap bends it shut
- Bridges and ramps with height levels, plus a **3D view** and a **clearance check** for track passing under bridges
- Custom pieces for anything that isn't in the list
- **Random track**: makes a layout from your inventory that fits a floor size you give, with at most the number of dead ends you allow (finished with buffer stops or ramp tracks when you have them); with bridges on it can lift part of a loop over a bridge or build a figure eight that crosses over itself, checking there's room for your train underneath
- **Kids mode** (ages 3+): one row of big picture buttons — ↶ oops, 🧩 pieces, 🎲 new track, ❤️ keep it, 🖼️ my tracks, 👀 3D; shake the iPad/phone for a new track; hold 🔒 for 2 s to leave
- **My tracks**: ♡ Save keeps the current layout (random or built), 📚 My tracks shows them as pictures to open, rename or delete
- **Run a train** 🚂: a little train drives along your track; tap a switch to send it the other way; it reverses at buffer stops
- **Ride along** in 3D: first-person view from the engine, over bridges and through passing loops; 🎥 hops from the 2D train onto the engine and 🗺️ back, ⇄ turns the train round, 🐢🐇🚀 sets the speed
- **Build it step by step** 👷: pieces light up one at a time in building order, with a big ✓ for the next one (great with kids); a 3/4 view of the next piece, its length, which end of a ramp goes up (▲ on the plan) and 📏 actual size to lay the real piece on the screen (fine-tune with a bank card)
- **Classic layouts** 📐: circle, oval, peanut, dog bone, sidings, bridges — built from whichever brand you own, showing what you'd still need
- **Share** 🔗 a track or your whole inventory as a link, through the share sheet, or as a QR code
- **Sounds** in kids mode (whistle, choo-choo), can be switched off
- **Play area** (⋯ → Play area & settings): floor size, dead ends and bridges for 🎲 Random, set once
- **Scan your inventory with the camera**: photograph your pieces next to a sheet of A4 paper, tap its corners, and the app measures and recognises each piece (you check and correct before adding)
- Made for iPad and iPhone: on a phone the plan fills the screen, the pieces open as a bottom sheet and extra tools sit under ⋯; pinch to zoom, big buttons, a floating toolbar next to the selected piece, +/− steppers
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
- A plain floor, rug or cloth that contrasts with the wood works best; avoid strong shadows.
  **On a wooden table** (oak, walnut…) the colours are too similar. Either lay a dark cloth or coloured paper under the pieces
  (most reliable), or pick **Wooden table** in step 3: pieces are then found by their two grooves instead of their colour
  (grooved side up, even light). Use the Sensitivity slider if pieces are missed (raise) or table grain shows up as track (lower).
- 10–20 pieces per photo; several photos add up.
- Look-alikes (e.g. BRIO 144 mm vs IKEA 145 mm straights, or ramps vs straights seen from above) are marked orange so you can choose.
  Untick a brand you don't own to reduce them.
- The scanner **learns your pieces**: every piece you confirm or correct is remembered (per device), so later scans match
  your actual track and camera rather than nominal catalogue sizes. Settings → *Forget what the scanner learned* resets it.
- Tapped paper corners snap to the paper's edges when the sheet stands out (a coloured sheet works great).
- Everything runs on the device; photos are not uploaded anywhere.

## Updating

Change `index.html`, then increase `VERSION` in `sw.js` (e.g. `"v1"` → `"v2"`) so installed copies pick up the new version.
An open app updates the next time it is started while online.

## Dimensions and sources

- BRIO: [woodenrailway.info track guide](https://woodenrailway.info/track/brio-track-guide) — the full range (straights and gender variants, curves, double curves, L/M, O1/P1, O/P, I/J, Q, F/G, F1/G1, F2/G2, T, H, H1, H2, H3, K1, buffer stops R/S, U/V ramp tracks, N/N1 ascending track). Track 40 mm wide and 12 mm high; grooves 6 mm wide, 3 mm deep, 26 mm apart; peg 11.5 mm on a 7 mm neck; hole 15–17 mm with a 5 mm throat; double track 46 mm apart; ramps rise 64 mm.
- IKEA LILLABO: [trackdrawer.com – IKEA Lillabo](https://trackdrawer.com/systemen/ikea-lillabo) (straights 50/100/146/205/240 mm, curves 45° R205 and 22.5° R200, ramp 205 mm, parallel spacing 40 mm, grooves 25.7 mm apart).
- Only pieces confirmed by these two sources are included. The LILLABO Y's length isn't published; ~150 mm was measured from a photo. Measure yours and correct them with a custom piece.
