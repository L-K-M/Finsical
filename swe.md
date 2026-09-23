# Finsical — thorough review (swe)

Scope: full read of `web/` (main, import, crt, machines, prefs, stats,
overview, addons, audio, render, store, bus, icons), `core/` (sim, pose,
data/*), `macos/Finsical.swift`, build/release scripts, CI. All 167 tests
pass after `npm ci` (a stale local `node_modules` fails two suites;
`npm ci` fixes it). Browser screenshots were not possible in this
environment (no system GLib for headless Chromium); visual findings are
from code reading only and marked as unverified where relevant.

Overall verdict: the codebase is in far better shape than the average
LLM-built project — disciplined layering (sim / data / web / native),
consistent error handling, real tests, careful comments. The weak spots
are a handful of genuine bugs in the drop/restore paths, one navigation
gap (browser users can't reach Preferences/Overview), missing
audio/light controls expected of a relaxation toy, and a first-run
experience that shows rough placeholder art with no guidance.

---

## 1. Bugs

### B1. Dropping several pack files imports only the first (confirmed)
`web/main.ts`, drop handler, raw-`.fsh` pass:

```ts
if (fishSheets.length) { console.info(...); return; }
```

`fishSheets.length` is global and nonzero as soon as *any* earlier pack
(bundled launch pack, restore, or an earlier file in the same drop)
loaded a sheet, so the loop `return`s after the first pack in the drop.
Selecting several `.fsh`/`.REZ` files and dropping them imports exactly
one fish. Fix: track a local `imported` counter and only skip the
warning, not the remaining files.

### B2. Drag-dropped `.azpack`/pack fish lose their identity on restart
The launch path does `sheetBySpecies.set(pack.manifest.tag, idx)` but
the drop path does not, and dropped packs are never recorded in
`installedAddons`. After a reload the pack's bytes are gone (nothing to
re-fetch), the saved `sheetIdx` is out of range, the species lookup
misses, and the fish silently round-robins onto unrelated art — or
renders a placeholder again. Minimum fix: set `sheetBySpecies` on drop
and accept the art still vanishing; proper fix: persist dropped pack
bytes in the IndexedDB `packs` store under a synthetic `dropped:` URL
and record an install so the normal restore path replays them.

### B3. Tank (`.azn`) add-ons push anonymous sheets into the fish pool
Verified by decoding `az-src/imac-red-orange.azn`: tank packs carry real
fish sheets (8 groups × 8 frames, 120×144). `remoteInstall` calls
`handleSheets` for any pack with sheets, regardless of section, so a
*tank* install appends a sheet to `fishSheets` that starter/legacy
round-robin fish can land on — fish turning into the tank bundle's fish
was never a choice the user made. Harmless-looking but surprising;
either skip `usePack` for non-fish sections or register the species and
spawn one honestly.

### B4. `audio.tap` zone picks the wrong zone name near corners
`dx < dy ? "side" : ...` compares an x-distance in px with a y-distance
in px against a 320×200 tank; near the horizontal center-top the
classification flips on raw pixel counts rather than proportional
distance. Cosmetic (wrong knock variant), but trivially fixable by
normalizing by w/2 and h/2.

### B5. Native quit can lose the last ≤10 s of tank state
`saveTank` runs on `pagehide` and a 10 s interval. On app quit,
WKWebView does not reliably deliver `pagehide`; up to 10 s of sim time
(roster changes, food) is lost. Cheap mitigation: also save on
`visibilitychange → hidden`, which native does deliver when the window
goes away, or save on every `spawnFish`/`removeFish` (already done via
`saveTank()` calls there — food/water quality remain the gap).

### B6. Two packs can fight over the `""` backdrop slot
`pickBackdrop` keys by `src`; the bundled pack and any drag-dropped
`.azpack` both use `""`, so a drop silently rebinds the bundled art and
`removeAddon` can never restore it (the `""` entry is not an installed
add-on). Synthetic source keys would fix it.

### B7. `panel.html`/`panel.js` live on in `dist/` (local only)
`dist/` is gitignored, so this is dev-box hygiene only — but a stale
`dist` from before the Osmium split still contains deleted pages and no
`overview.js`/`addons.js`/`osmium.css`. Any server pointed at `dist/`
serves a broken mix. `npm run build` regenerates correctly; consider
`rm -rf dist` in `build.sh` before bundling (it does for `--clean`
only).

### Non-bugs worth noting (verified fine)
- The `acc += min(dt, 200)` catch-up loop correctly bounds hidden-tab
  time; the sim pauses rather than bursts when throttled.
- `serveThumbs`/`sweepThumbs` keep the thumb maps bounded.
- `remoteInstall` validates bus payloads (https + known section) and
  dedupes in-flight installs.
- The CRT letterbox math matches `object-fit: contain`; all machine
  screen rects are exactly 1.6 aspect so the CRT canvas aligns.

---

## 2. General issues

- **G1. Browser users cannot open Preferences or Tank Overview at all.**
  Keyboard gives ⌘I (import), S (stats), F (feed), C (CRT). Prefs and
  Overview are native-menu-only. The plain-web experience (the dev
  environment, and anyone hosting it) is second-class. A Mac OS 8 menu
  bar in the browser shell fixes this and is a feature, not a chore.
- **G2. No onboarding.** A fresh run shows four orange placeholder
  rectangles and a console warning. Nothing tells a new user that the
  real content is one ⌘I away. (The stats window says it, but you have
  to know to open the stats window.)
- **G3. Placeholder fish quality.** 14×8 rect "fish" next to
  pixel-perfect Platinum chrome and decoded Aquazone art is the least
  polished pixel in the product. A small hand-drawn pixel-art guppy
  (gridCanvas, like the existing icons) would cost ~30 rows of sprite
  and lift the first impression enormously.
- **G4. Duplicate-looking overview rows.** Ten guppies read as ten
  identical "Guppy" rows; the original named individual fish. Names
  (even auto-generated ones: "Guppy 2") would disambiguate.
- **G5. Sound is all-or-nothing at fixed gains** (ambient 0.12, events
  0.7–0.8). No mute, no volume — for an app pitched as *relaxation*,
  that's a missing basic.
- **G6. No lights control.** Day/night is a fixed 13-minute sine. A
  lamp toggle (instant moonlight) and/or real-clock sync are both
  cheap and very in-genre.
- **G7. Restore is sequential and main-thread.** With many installed
  add-ons, launch decodes pack after pack synchronously (RLE decode +
  canvas rasterization), each a visible hitch. Yield between packs and
  consider idle-time pre-rasterization of pose rings.
- **G8. Menu mismatch, minor:** native "Toggle CRT Effect" is ⌘R while
  the web shortcut is bare C; Tank Stats is ⇧⌘S but bare S in browser.
  Harmless, but a shortcut cheat-sheet (Help menu) would paper over it.
- **G9. Touch users can't move the tank window in the native shell**
  (window drag is mouse-only by design; the top DragStrip needs a
  mouseDown). Acceptable on macOS, worth a comment somewhere.

---

## 3. Performance

The steady-state render path is clean: fixed 30 tps sim, one
`drawImage` per fish from a memoized canvas cache, no per-frame
allocations, CRT path opt-in. Real concerns:

- **P1. Launch restore hitches** (G7): biggest stutter source in
  practice. Chunk decodes or interleave with `requestIdleCallback`.
- **P2. First-pose rasterization:** every new (group,frame,facing)
  triple pays an `imageCanvas` (putImageData) on first draw — a turn
  rolls through ~16 new cells. One-time, small, but pre-warming the
  ring at idle after install would remove the first-turn hitch.
- **P3. `frames.save` on every native resize tick** (UserDefaults write
  per frame during a live resize). Debounce to ~100 ms.
- **P4. `postState` serializes the full addon+fish list** on every
  prefs slider rAF-coalesced post and every 10 s save. Fine today;
  worth remembering if rosters grow.
- **P5. CRT shader runs at full device resolution** every frame. On
  4K+ displays this is the heaviest thing in the app; consider capping
  the backing buffer (it's a soft-focus effect anyway).

---

## 4. Missing features (by value)

1. **Sound controls** — master volume, ambient level, mute (G5).
2. **Lights** — lamp on/off override, optional real-clock day cycle (G6).
3. **Fish names / Get Info** — name fish, inspect one fish (species,
   hunger, state, age). Data is already on the bus.
4. **Growth** — fish grow over days; the format's FsT2/FsT3 size tables
   are already parsed by the Python tool and the hooks exist in Fish.
5. **Breeding** — EggI/EGPC data exists; even a slow "egg appears, days
   later a fry" loop would delight.
6. **Water change** — an interaction that restores water quality fast
   (a "siphon" cursor pass, or a Maintenance menu item), vs waiting 7
   min for the filter.
7. **Save Picture** — Tank ▸ Save Picture… exports the current canvas
   as PNG. Trivial, fun, shareable.
8. **Screensaver/fullscreen mode** — bare tank edge-to-edge.
9. **aquazone.me import** — README name-drops the preservation library
   as a source; only archive.org is wired up.
10. **Search/filter in the add-on browser** — the JPN fish section
    alone is hundreds of entries; type-select exists but a visible
    filter field would help.

---

## 5. Visual & layout

- **V1. Placeholder art** (G3) — biggest visual offender.
- **V2. No visual feedback for tap/feed** — sound plays, water doesn't
  react. An expanding ring on glass tap and a splash ring where a
  pellet lands are cheap, period-appropriate (2-px ring, 3 frames).
- **V3. Bubbles are uniform 2×2 squares** — vary 2/3 px and add a
  slight x wobble for life; pop (tiny 4×4 ring) at the surface.
- **V4. First-load shell flash:** machine art PNG loads async, so the
  black backplate + tank can paint before the bezel does. A same-shape
  low-res placeholder or a CSS background color keyed to the machine
  would mask it.
- **V5. Decor z-order:** fish always swim *over* plants; the original
  layered some foreground flora. Even random assignment of "front"
  vs "back" per decor would add depth.
- **V6. Murk tint is a flat fill** — a slow sine shimmer (or per-fish
  visibility falloff with depth) would read as water, not jelly.
- **V7. Overview column squeeze:** Status gives way before Name on
  narrow windows (Finder-correct), but the window's own minimum width
  (360) can still truncate Status to nothing; fine, just noting.
- **V8. The in-page overlay add-on window on narrow/touch stacks
  without preview** — acceptable, but the detail pane then has a large
  empty area; the status text could wrap into it.

---

## 6. Interface, retro feel & aesthetics

Strong foundation: Osmium UI's Platinum chrome is genuinely good, the
Chooser-style importer and Finder-style overview are the right
metaphors, Balloon-Help-style captions in prefs are a lovely touch.
Gaps:

- **I1. The browser shell has no desktop.** A Mac OS 8 menu bar along
  the top of the browser window (Apple-position glyph → About, Tank,
  Window, Help; clock at the right) fixes G1 and turns the bare black
  page into a tiny System 8 desktop. Osmium ships `mountMenuBar` and
  its docs literally suggest the clock.
- **I2. About window.** Classic OS 8 apps had one; version, credits,
  the LLM disclosure, a donate link. Natural part of I1.
- **I3. Shortcut discoverability.** F/C/S/⌘I are invisible until read
  in source. Put them in menus (I1) and a Help ▸ Shortcuts window.
- **I4. Cursor theater.** Over the water, the cursor could become the
  OS 8 "pointing hand" (data-URI cursor) — feeding/tapping feels
  physical. Mac-correct and free.
- **I5. Windowshade the overlay:** double-click the in-page add-on
  window's title bar to collapse it (osmium windows may already support
  shade; the native ones do).
- **I6. Night dimming of the *chrome*, not just the water** — when the
  tank goes night, the desktop picture behind (browser) could dim too.
  Low value in native (transparent), skip there.

---

## 7. Novel, cool, delightful, quirky ideas

Ranked by smile-per-effort:

1. **Glass-tap ripple + feeding splash** (V2) — the water finally
   *reacts*.
2. **CRT power-on animation** — enabling the effect plays a 400 ms
   tube-warm-up (horizontal line bloom → full raster) in the shader.
   One uniform + a timestamp; huge charm for hardware nerds.
3. **Snail on the glass** — a tiny snail inches across the front pane
   every few hours, leaving a faint clean streak (drawn as a subtle
   lighter band). Pure aquarium truth.
4. **Begging fish** — hungry fish (hunger > 0.75) bias their wander
   band toward the surface and hover under the cursor when it's over
   the top strip. Real fish behavior; sells the sim instantly.
5. **Sleep mode** — at night fish settle to the gravel, slow their
   tails, and a gentle "lights off" click sounds. Pairs with the lamp
   toggle (G6).
6. **Party mode** — installing a music add-on and playing it makes
   fish tail-wag in time (animPhase rate keyed to the AudioContext
   clock). Absolutely silly, absolutely delightful.
7. **Real-clock day/night** — sunrise at your sunrise (opt-in pref).
8. **Fish follow the cursor** — a short "curiosity" chase when the
   pointer glides through the water (bounded, rare, subtle).
9. **Synchronized startle Easter egg** — three knocks in 2 s triggers a
   choreographed scare wave. One-line-ish given the panic system.
10. **Tank screenshot with bezel** — Save Picture… composites the
    machine art over the canvas exactly as on screen (the PNGs are in
    the repo) — a shareable postcard.
11. **Fish names with a rename dialog** — double-click a fish row in
    Overview; classic Get Info behavior.
12. **Growth rings in Stats** — tank age milestone badges ("1 week!",
    "First egg"). Whimsical journaling.

---

## 8. Shovel-ready follow-ups (feed for ANALYSIS.md)

Concrete, bounded, dependency-free tasks an LLM can pick up:

1. Fix B1 (multi-pack drop) — regression test with two synthetic packs.
2. Fix B2 (dropped-pack persistence) — synthetic-IDB-URL approach.
3. B3 — skip `usePack` for scenery sections (one-line + test).
4. Browser menu bar + About + Shortcuts window (I1–I3).
5. Tap ripple + feed splash (V2) — render.ts/main.ts only.
6. First-run empty-state hint (G2) + pixel-art placeholder guppy (G3).
7. Sound pane: mute + master/ambient sliders through the bus (G5).
8. Lights toggle + optional real-clock sync (G6, idea 5/7).
9. Save Picture… (PNG export, optionally composited with the bezel).
10. Idle pre-rasterization of pose rings + yield between restore packs
    (P1/P2).
11. Snail on the glass (idea 3) — self-contained sprite + slow mover.
12. Begging fish (idea 4) — sim.ts band bias + cursor hover hook.

---

*Written for the task brief: review only, no code changed in this
document's commit.*
