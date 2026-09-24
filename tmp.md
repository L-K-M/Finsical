# Finsical — fresh review pass (2025 thread)

> Note: the request described a fantasy Catan/Kolonists board game, but this
> repository is **Finsical**, a retro AquaZone-style virtual aquarium for macOS
> (TypeScript core + web, Swift/WebKit shell). The review below covers the real
> project. IDs reuse ANALYSIS.md numbering where an item was already catalogued;
> `N-*` items are new findings from this pass.

## Confirmed bugs (verified in current source)

### Audio (`web/audio.ts`)

- **B-17 confirmed.** While the AudioContext is suspended (no user gesture
  yet), every `play()` call queues a `resume().then(replay)` retry. A fish
  added before the first click stores one retry each for `FISH_SPLASHES[0..2]`;
  later taps/feeds pile more on top. The first pointer gesture then fires a
  burst of stale sounds. One-shots should be dropped while suspended (only the
  ambient loop is worth queuing). `audio.ts` `play()` retry path.
- **B-19 confirmed.** `find(subs)` falls back to substring matching, so any
  imported sound whose name contains "top"/"center"/"side"/"bottom" can answer
  glass taps and water splashes (e.g. a track "Top of the World"). Bound the
  substring pass (e.g. candidate name length <= needle + few chars) or restrict
  it to known bank names. `audio.ts` `find()`.
- **B-40 confirmed.** `addWavs` re-decodes the whole stored set on every sound
  drop and restarts the ambient loop whenever `named(FILTER_BUBBLING)` returns
  a *new buffer object* — including an identical re-decode. The ambience
  audibly blips on every import. Compare which record name wins, not buffer
  identity; only restart when the winner's name changes or nothing is playing.
  `audio.ts` `addWavs`.
- **N-01.** `unlock()` sets `resumed = true` before `playOpening()` runs, but a
  `play()` issued between `ctx.resume()` resolving and the next tick can still
  see `state === "suspended"` — edge case, covered by the B-17 fix.
- **N-02.** `handleSounds` in `web/main.ts` plays `recs[0]` as install feedback
  for every sound-bearing pack — including restore-time `soundsLoaded` reloads
  where `live` is false (that path is guarded, good) — but `drop.ts` folder
  drops with many loose audio files still queue `playAll` on first gesture.

### Fish identity & save state (`web/main.ts`)

- **B-51 confirmed.** `new Sim(TANK, 0x9003)` — a fixed seed. Every launch
  replays the identical wander/turn/bubble sequence. Seed from entropy in
  main.ts (tests construct their own Sim, determinism is preserved there).
- **B-14/B-15 confirmed.** `remapSheetIdx` keeps a stale in-range `sheetIdx`
  even when its pack failed to restore, and `sheetOf`'s `fishSlot` round-robin
  assigns *any* installed species' art to unbound fish — placeholder starters
  adopt each newly installed species in turn, and a fish whose pack failed
  offline keeps another species' sprite. Fix: bind only by `sheetIdx` →
  `pack` → `species`, everything else renders the placeholder; delete stale
  pack-bound indices during remap. `sheetOf`, `remapSheetIdx`.
- **B-04 confirmed.** `sheetByPack` maps `url → one sheet index`; a multi-pack
  add-on (zip with several .fsh entries) records only the *last* entry's sheet
  under the shared URL, so after relaunch every fish of that add-on becomes the
  last species. Needs an entry-name → sheet binding threaded through
  `PackResult`. Medium.
- **N-03.** `installAddon(it, again)`: if `again === true` is requested while
  the first install for that URL is still in flight, it silently rides the same
  promise — no second copy ever spawns, yet the button state implies success.
- **N-04.** Dropped `.azpack` folders are not persisted at all (no
  `recordInstall`, nothing in IDB): fish/art/sounds vanish on relaunch with no
  warning. Either persist under `local:` URLs or warn the user it is
  session-only.
- **N-05.** `usePack` calls `audio.load(read, manifest)` for *every* pack that
  has a manifest — and `load()` clears the manifest-sound table and restarts
  ambience. Dropping a second .azpack wipes the first pack's sound bindings.
- **B-34 confirmed.** Two `index.html` tabs both simulate, both answer every
  mutating bus op, both save — last writer wins and saves interleave. Needs a
  cheap single-owner claim (localStorage lease + heartbeat) with the loser
  going read-only + alert. Medium.
- **B-21 confirmed.** `Add Again` on plants/accessories adds a second decor
  copy in-session but the save only records the URL once — relaunch loses the
  duplicate. Persist a copy count per add-on.
- **B-46 (remainder) confirmed.** Offline cache-miss fish get their `sheetIdx`
  deleted and then round-robin onto other species' art (orange stand-in is
  fine — a *wrong species* is not). Folded into the B-14/B-15 fix.

### Client windows & bus

- **B-25 confirmed.** `prefs.html`, `overview.html`, `stats.html` install no
  drop handlers — dropping any file navigates that borderless native window to
  the raw file with no way back. `addons.html` handles drops properly. Add
  `dragover`/`drop` preventDefault listeners (3 lines each).
- **B-55 confirmed.** `web/stats.ts` never keys `history` to `m.boot`: a tank
  restart keeps the old tank's samples in trends/sparklines. Clear history on
  boot change (overview.ts already does this for thumbs).
- **U-11 confirmed.** Overview re-sorts by *status text* on every push; a
  hunger label change reshuffles rows under the pointer and forces a full
  rebuild. Only re-sort when the item key set or the sort column changes;
  update status text in place.
- **U-12 confirmed.** When the tank page isn't there, `overview`/`stats`/
  `addons` retry `hello` for 30 s then go silent — the window looks connected
  but is dead. Keep a persistent "waiting for the tank" state; prefs.ts has no
  greeting at all (UI just looks dead).
- **P-06 confirmed (partial).** Each client posts `hello` every 2 s while
  visible; the tank answers *every* hello with a full state push to all
  clients. Three open windows ≈ a full fish/addons serialization + broadcast
  every ~0.7 s, plus per-window `evaluateJavaScript` in the native relay.
  Coalesce `postState` calls and rate-limit hello responses.
- **N-06.** `installFailed` posts `String(e)` over the bus — the remote panel
  shows raw `Error: https://archive.org/…long-url…: 404`. Send
  `loadProblem(e)` instead (already used locally).

### Import & store (`web/import.ts`, `web/store.ts`, `web/addons.ts`)

- **B-11 confirmed.** A "fish" add-on whose sheets decode but have no drawable
  frame still spawns a fish that renders as the orange stand-in and reports
  "Added to the tank". Validate one drawable frame before claiming success;
  fail the install otherwise.
- **B-12 confirmed.** Six gravel add-ons decode to images that fail the ≥3:1
  gravel aspect test — install is a silent no-op. Report "no gravel art inside"
  instead of success.
- **B-44 confirmed.** `no pack inside` errors (17 legacy-format accessories
  that can *never* load) offer Try Again, which always fails. Deterministic
  decode failures shouldn't offer retry.
- **B-39 confirmed.** `sndsMerge` resolves `null` on put failure; `addons.ts`
  drop handler then posts `soundsLoaded` anyway — reports success when nothing
  was stored.
- **U-07 confirmed.** Double-clicking an add-on row does nothing (Chooser
  convention says it should install).
- **U-08 confirmed.** Add-on lists are in archive order — no alphabetical
  sort; near-identical names across archives sit far apart.
- **U-22 confirmed.** `navigator.storage.persist()` runs at first IndexedDB
  open (page launch) — Firefox shows a storage permission prompt before the
  user stores anything. Defer to first write.
- **P-01 confirmed.** `packCache` (fully decoded PackResults — the big
  Uint8Arrays) and `zipCache` (whole outer zips, e.g. the JPN collection)
  are unbounded `Map`s in the tank page. Cap packCache (~16 entries) and skip
  memoizing zips above a size threshold (IDB keeps the bytes anyway).
- **N-07.** `fetchInnerBlobs` splits URLs on `#` — a `#` inside a zip entry
  name breaks it (rare; archive names are sanitized).
- **N-08.** Dropped-folder audio imports are unbounded — a folder of 200 MP3s
  imports all of them (each up to 32 MB decoded). Cap loose-audio imports per
  drop.

### Native shell (`macos/Finsical.swift`)

- **B-28 confirmed.** No `webViewWebContentProcessDidTerminate` handler: a
  WebContent crash leaves a floating always-on-top invisible window with no
  recovery path. Reload the webview (and at minimum surface the failure).
- **B-49 confirmed.** `applyMachine` resizes the window pinned to the top
  edge (`y = maxY - nh`) — a taller machine on a small screen pushes the
  window's bottom off-screen. Clamp into the visible frame after resizing.
- **B-50 confirmed.** `frames.restore` keeps a frame that overlaps *any* edge
  of *any* screen by 1 pt — a tank saved 99 % off-screen restores lost.
  Require a minimum visible area, else center.
- **P-22 confirmed.** `windowDidResize` → `frames.save` on every resize tick —
  synchronous plist write per live-resize event. Debounce.
- **V-16 confirmed.** `applyMask` changes the silhouette but never calls
  `window.invalidateShadow()` — the drop shadow lags the new shape.
- **N-09.** `DragStrip` covers the top 22 pt of every machine — on the Bare
  tank that's the feed zone: native users can't drop food in the top strip of
  the bare tank. Shrink the strip for `bare`.
- **B-48 confirmed (likely).** Case drag → native `performDrag` → the page
  never sees `mouseup`, so the `:active`/grabbing cursor can stick. Track
  grabbing with a JS class + timeout instead of `:active`.

### Rendering

- **V-14 confirmed.** CRT shader uses `mediump float` and wraps `uTime` every
  100 s — `sin(uTime*61)`/`sin(uTime*4)` discontinuously jump every wrap
  (visible flicker blink) and mediump quantizes coordinates. Fix both: pass
  phase-continuous uniforms (`t*61 mod 2π`, `t*4 mod 2π`, `fract(t)` for the
  hash) and try `highp` with a `mediump` fallback compile.
- **V-04 confirmed.** `fitGravel` scales gravel to tank width with no height
  cap — a tall strip (e.g. 640×120 → 320×60) paints gravel over a third of the
  tank while the sim floor stays at `BOTTOM_PAD = 12` px, so fish swim
  *through* visible gravel. Cap drawn gravel height (~20 px, crop top rows).
- **V-03 confirmed.** The tank canvas renders at arbitrary fractional scales
  (object-fit: contain in a free-size window) — pixel art shimmers/crawls at
  non-integer ratios. Integer-snap window sizing (native) or a "pixel-perfect"
  size option would fix it. Product decision, worth doing.
- **B-35 confirmed.** With CRT curvature/skew/perspective on, the displayed
  image is warped but click coordinates map the unwarped canvas — taps land
  off-target. Either inverse-map pointer coords through the warp or constrain
  geometry pots so mismatch stays sub-pixel. Documented, hard.
- **N-10.** Fish feed-zone clicks land while the "don't tap" alert is up via
  the menu path (`feedFish` doesn't check `alertOpen`) — trivial.

## Performance notes

- **P-02** — `fshToSheets` decodes *every* sprite stream to pick one; header-
  only decode until a sheet is chosen would cut install/restore CPU. Medium.
- **P-07** — `restore()` is strictly sequential (fetch → decode → apply per
  add-on). Prefetch all packs (bounded concurrency ~4) then apply in order:
  big win on multi-add-on tanks.
- **P-12** — `imageCanvas` destructures `palette[idx]` per pixel; a Uint32 LUT
  + `Uint32Array` fill is ~3× faster on big images.
- **P-16** — `swimCanvas` builds a string key per fish per frame; a numeric
  composite key avoids the allocation in the hot path.
- **P-05** — `listAddons` waits for the slowest collection before showing
  anything; render sections progressively.
- **P-17/P-19** — per-frame allocations in render (`new Date()`, gradients,
  sparkline rebuilds on every push) — minor; noted, not urgent.
- **N-11.** `layoutInfo`/`syncCard` read `getBoundingClientRect` each frame
  while a fish card is open — cheap, but the observer could gate it.

## UX gaps (confirmed present)

- **U-01.** No overfeeding guard: each feed drops up to 5 pellets with no cap
  on total uneaten food; a new user can foul the tank in a minute and never
  learn why. Soft-cap pellets (~12) with subtle refusal feedback.
- **U-03/V-21.** Eating a pellet has no visual beat — add a tiny ripple/bubble
  puff at the fish's mouth (needs a small `eaten` event out of `sim.tick`).
- **U-04.** Removing a fish/add-on is instant and irreversible; a short Undo
  toast would be kinder (fish state is plain data — re-adding is cheap).
- **U-10.** No drop affordance: nothing highlights during dragover, and the
  only result report is `console.warn`. Highlight the tank during drag and
  toast the outcome.
- **U-15.** Ctrl/right-click on the tank surfaces WebKit's generic menu
  (Reload etc.) in the native app — suppress, and later replace with an OS 8
  contextual menu.
- **U-23/U-24/U-26.** Copy nits, per-item download progress with Stop,
  machine-list thumbnails — all still open.
- **U-02.** Placeholder stand-ins are indistinguishable in Overview once a
  pack failed — they could read "Stand-in".

## Visual / aesthetic

- The machine lineup is strong (15 cases + bare). Remaining: V-03 fractional
  scaling, V-04 gravel height, V-05 dead bands, V-06 pitch snapping, V-19
  favicon (⚠ PR #179 by another agent already touches page metadata — skip),
  V-24 `#opentrigger` overlap, A-02/A-03/A-06/A-07 polish.
- **N-12.** `#fishtip` and `.finfo` use `z-index: 5/2` — under the menubar
  (6) and overlays (10) as documented, fine; but the fish card can clip under
  the machine art edge on some cases (`.finfo` z 2 = same layer as machine).
- Delightful-but-cheap: starfield on the black `#screenback` at night,
  sparkle when water is pristine (D-29), occasional plant bubbles by day.

## Missing vs. the original AquaZone (from ANALYSIS.md, still open)

- **F-01** resource-map/named-resource support (blocks F-02 names, B-33
  animation scripts, V-07 authored pitch poses, U-21 real names) — the
  biggest fidelity lever.
- **F-03** food types + **F-21** water chemistry (temp/pH) + **F-08**
  medicine/disease — PR #163 (other agent) is attempting the health/water
  sim; don't collide.
- **F-04** arrangeable decor, **F-05** jukebox, **F-06** filter dirt,
  **F-07** events/Tank Log, **F-09** sleep catch-up, **F-16** sick/dead
  states, **F-17** egg packs/breeding, **F-22** feeder/filter hardware,
  **F-26** save/load tanks, **F-31** dimmer, **F-33** per-species swim params.
- **D-01** night resting is *implemented* (sleep state exists) — remaining
  night items: resting behaviors variety.
- Smaller originals: B-32 in-app updater, T-15 AMV/BMV tooling.

## Novel / delightful ideas (mine + best of backlog)

- **D-08** Stereo pan sounds by tank x-position (StereoPannerNode per play) —
  taps left/right sound left/right. Small, very charming.
- **D-02+** Let up to 3 fish gather at the pointer instead of one.
- **N-13.** Bubble-pop: clicking a rising bubble pops it early (tiny hit test
  + pop sound). Playful, cheap.
- **N-14.** Plants emit a thin bubble stream during "daylight" — algae
  oxygenating. ~20 lines in the bubble spawner.
- **N-15.** Golden pellet: rare (1/50) golden pellet; the fish that eats it
  does a happy barrel-roll (reuse turn state).
- **N-16.** Message-in-a-bottle tips (D-10): a bottle drifts across rarely,
  click for a help tip.
- **N-17.** "Don't feed the fish" sign companion to the glass-tap scold when
  overfeeding (U-01 + scold infrastructure exists).
- **N-18.** Cat silhouette: rarely, a cat shadow crosses the bezel and every
  fish startles. Pure delight, moderate art cost.
- **N-19.** CRT channel buttons: number keys 1–4 jump between picture presets
  like TV channels.
- **N-20.** Starfield + occasional shooting star on the letterbox matte at
  night (screenback is already black; a star canvas is ~50 lines).
- **D-25** thunderstorm weather, **D-26** laser pointer, **D-27** party mode,
  **D-13** shake-window-to-stir, **D-14** fish net, **D-16** sticky notes on
  the bezel — all still good, medium effort.
- **U-25** select a fish in Overview → highlight ring in the tank.
- **D-30** built-in sprite editor for custom fish — large but the killer
  feature for this audience.
- **D-09** Copy Picture to clipboard (takePicture exists; clipboard write is
  ~10 lines).

## Suggested implementation order for this pass

1. `fix/audio` — B-17, B-19, B-40 (one file, high certainty).
2. `fix/fish-identity` — B-51 + B-14/B-15/B-46 deterministic binding.
3. `fix/client-windows` — B-25, B-55, U-11, U-12.
4. `fix/import-ux` — U-07, U-08, N-06, B-39, B-44, U-22.
5. `fix/import-honesty` — B-11, B-12.
6. `perf/state-and-cache` — P-06 coalescing, P-01 cache bounds, P-12, P-16.
7. `fix/crt-shader` — V-14 (highp + continuous time uniforms).
8. `fix/tank-polish` — U-01 food cap, V-21 eat ripple, V-04 gravel cap, U-15.
9. `feat/native-hardening` — B-28, B-49, B-50, P-22, V-16, N-09.
10. `feat/multi-tab-guard` — B-34 owner lease.
11. `feat/inflate-fallback` — B-29 pure-TS inflate for WebKit < 16.4.
12. `feat/delights` — D-08 stereo, D-02+ gather, N-13/N-14/N-20.
13. `feat/decor-copies` — B-21 persist copy counts.

Deferred to later: F-01 resource maps, P-02 header-only decode, P-07 parallel
restore, P-05 progressive listing, B-35 click-warp, V-03 integer scaling,
U-04 undo, B-30 pack pinning, S-* hardening batch.
