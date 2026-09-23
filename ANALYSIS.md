# Finsical Analysis — Shovel-Ready Improvements

Consolidates eight independent review passes plus follow-up review
responses. Nothing below is dropped: implemented items stay listed
with their branch/PR so future work can see what landed, and every
open idea is written so an LLM can pick it up cold.

Baseline for this pass (eighth, full-repo `tmp.md` against
`origin/main` `0342fb0`): `npm ci`, typecheck clean, 167 tests,
`python3 -m unittest discover -s tools/tests` (76). Live archive.org
listings return 200; test-time "listing 404" logs are the intentional
`import.test.ts` fetch stub. Headless-Chromium runtime checks
reproduced the new B-series findings below; AppKit, Retina GPU,
VoiceOver, and physical touch remain unverified. Note: "landed"
entries are open-PR-only until merged — verify against `origin/main`
before re-scoping (viewport meta, for example, is still absent on
main despite the #90/#93 notes).

## Completed (other pass, in branches)

- **Bug fix:** `core/sim.ts` `addFish()` truthy coordinate checks fixed (uses `Number.isFinite` on raw input).
- **Bug fix:** Non-primary pointer clicks now call `preventDefault()` to avoid drag interference.
- **Performance:** `swimCache` capped at 1024 with true LRU (refresh-on-hit); `thumbMemo` capped at 512.
- **Performance:** `thumbMemo` refreshes recency on hit.
- **Feature:** Named fish (`feature/named-fish`) — retro names assigned at spawn, saved with tank, shown in overview.
- **Visual:** Enhanced placeholder fish (`feature/placeholder-fish`) — charming pixel design with stripes, smile, tail.
- **Visual:** Bubble animation (`feature/food-animation-bubbles`) — circular bubbles with transparency; food splash on eat.
- **Visual:** Light rays (`feature/light-rays-night`) — drifting diagonal beams; deeper night blue.
- **Audio/UX:** Interactive machine (`feature/interactive-machine`) — synthetic click tone on case press.
- **UX:** Personality hints (`feature/fish-personality`) — playful status notes in Tank Overview.

## Completed (second pass, PRs open for review, all at steady state)

- **PR #87** (`audit/backdrop-cover-prescale`): backdrops
  center-cover-crop to 320x200 via tested pure `coverCrop`
  (`web/render.ts` + `web/cover.test.ts`) instead of stretching;
  backdrop/gravel pre-fitted once at import so `render()` is a
  1:1 blit (fixes aspect distortion + the biggest 2D frame
  cost). Follow-up applied per review: crop rects rounded to
  whole texels with in-bounds clamp; TANK-dims invariant noted.
  CI green (core-linux + native-macos), GLM round 2 minor-only.
- **PR #88** (`audit/crt-perf`): CRT buffer capped at 2x DPR
  (grille is sub-game-pixel already there; ~2.25x fewer pixels
  on 3x Retina); `resize()` re-measures only when dirty
  (ResizeObserver + window resize flag; DPR still read
  per-frame so zoom resizes). Review asked for teardown;
  answered with a documented single-init lifetime (module-scope
  call, no dispose path on CrtFilter). CI green, GLM clean.
- **PR #89** (`audit/audio-parallel`): `load()`/`addWavs()`
  decode concurrently under `Promise.all` (~25x faster for a
  full sound set); per-entry failures now log the file/record
  name (were silent); no context built for empty lists. Review
  verified `read()` stateless (fresh fetch/File bytes);
  batching declined (manifests ≤ ~25 sounds / ~2MB). CI green,
  GLM clean.
- **PR #90** (`audit/touch-a11y-basics`): viewport meta (touch
  tap math was mis-mapping on mobile); tank canvas `role=img`
  + label documenting feed-vs-tap and the F key; `#crt`
  overlay `aria-hidden`; overview "Waiting for the tank…"
  empty text at mount. CI green, GLM clean.

## Completed (third pass — Devin, PRs open for review)

- **PR #93** (`fix/import-shell-fixes`): viewport meta on all
  five pages (the narrow-overlay and touch paths were built for
  a viewport that never reported real width); `zipCache`/
  `pageCache`/`packCache` delete-guards so a late rejection can't
  evict a newer entry; `.fsh` drop no longer hijacks the
  backdrop — drop classification is section-aware like the
  remote-install path; fish thumbnails render a neutral drift
  pose instead of a possibly edge-on mid-roll freeze; `addFish`
  uses `=== undefined`/`Number.isFinite` so a saved `0` field
  isn't re-rolled. Review round 2: `did`/`return` import-drop
  bugs fixed (`bbe5e2b`) — every dropped pack imports, and a
  rejected pack isn't counted as imported. GLM round 3 clean.
- **PR #103** (`feat/browser-menubar`): Osmium `mountMenuBar` on
  the tank page (browser only; native keeps AppKit menus) —
  Apple menu with About Finsical dialog, Tank menu exposing
  Preferences/Overview/Stats/Import/Feed/Change Water/CRT/
  Take a Picture (2x nearest-neighbor PNG download). Browser
  users previously had to type URLs for every client window.
  GLM review timed out twice — review gap, not approval.
- **PR #106** (`feat/tank-life`): tap ripple rings at the click
  point (glass-knock finally has visual feedback), ambient
  bubble vents trickling from the gravel, foul-water surface
  gasping (`bandY` biases to the surface below `QUALITY_SEEK`),
  a 1px surface line, and drag-to-feed scattering pellets along
  the drag. Review follow-ups applied through round 5: pointer
  capture + touch-action for feed drags, pointerId-scoped drag
  state, paced pellets/feed sounds, id-stable gasp slack,
  lostpointercapture cleanup, constant-derived test bounds.
- **PR #110** (`feat/fish-growth`): per-fish `scale` — juveniles
  spawn at 0.78–1.10, each meal closes 6% of the gap to the
  1.35 cap (crosses 1.0 after ~8 meals, ~90% grown after ~37),
  persisted in the roster, rendered via existing scale path.
  Review follow-ups applied through round 5 (`8af7701`):
  restored scale sanitized and clamped to [SPAWN_SCALE_MIN,
  MAX_SCALE]; pre-scale saves default to 1 via an explicit
  `fromSave` flag so established fish aren't re-rolled as
  juveniles. Declined: size-scaled `EAT_DIST` (design call,
  skews feeding competition) and duplicate clamp assertions.
- **PR #112** (`feat/schooling`): `decide()` occasionally anchors
  a wander target near a same-species schoolmate (x-scatter ±42
  px, half that vertically so schools sit flat). Test asserts a
  calibrated 10 px distance gap, not just ordering (`b5919a6`).
- **PR #114** (`feat/water-change`): `sim.changeWater(0.6)`
  recovers 60% of the quality gap and siphons every settled
  pellet (settled food drains quality from tick one — it is
  waste in this model); Tank Stats button posts
  `op:"changeWater"`; native menu item bridges to
  `changeWater()` in the page. Review follow-ups applied
  (`286e9af`): op renamed for greppability, siphon docs
  corrected; "BusMsg union" and "0-fish test" findings refuted.

## Completed (fourth pass — Devin, PRs open for review)

- **PR #101** (`feat/sound-toggle`): Sound Preferences pane +
  master mute (persisted; native Tank-menu item and bare `m` key
  both work). Active Web Audio source tracking so muting also
  stops in-flight one-shots; ended-listener (not `onended`
  assignment) and normal-flow caption per review. GLM latest
  round clean.
- **PR #104** (`fix/sound-uninstall`): uninstalling an add-on drops
  its sound records from the bank — `orphanedSounds` pure helper +
  test. Provenance is recorded only after `handleSounds` succeeds,
  and restores refresh it so legacy installs self-heal. Round 2:
  `applyPack` hoisted out of `onInstall?.()` — inside the optional
  call a missing handler skipped the whole restore.
- **PR #105** (`chore/gitignore-idea`): stop tracking `.idea/`.
  GLM failed twice (HTTP 429 / timeout) — review gap, not approval;
  diff is one line.
- **PR #107** (`feat/tap-ripple`): expanding ring where the glass
  is tapped (also on feed). Round: hoisted `lineWidth`, raised ring
  cap. GLM rerun failed twice — review gap. NOTE: overlaps
  other-pass PR #106's ripple — pick one at merge.
- **PR #108** (`feat/water-art`): real bubbles (highlight pixel +
  wall-clock wobble) and food flakes replace the 2x2 squares/dots.
  Round: wobble phase hoisted to once-per-frame + named constants.
- **PR #111** (`feat/fish-cap`): tank capped at 24 fish; install
  refused with a friendly "Tank is full" (spawnFish only fails at
  the cap — verified). Round: shared drop-spawn helper deduped.
- **PR #113** (`feat/night-mode`): full-sine light curve with a
  real ~36% dark valley (the old half-wave dipped below 0.5 for
  ~18%) + deep-blue night tint. Tests pin night fraction 30–45%
  and the 0.65 daylight mean at precision 5.
- **PR #117** (`fix/install-again-queue`): every "Add again" click
  queues per-URL and replays serially (was silently dropped while
  an install was in flight); a failed install drops its queue.
  Rounds: drain made iterative, then flat + rejection-proof —
  `installsInFlight.add` runs synchronously so a slot check detects
  both handoff and early-return.
- **PR #118** (`feat/scenery-use`): Overview "Use" button swaps in
  an installed pack's backdrop/gravel; rows show "Showing"/"In
  tank"; the choice persists via `SavedTank`. Round: `postState`
  on the success path so the panel retags immediately.
- **PR #120** (`feat/import-button`): Add-ons trigger button in
  every browser (was touch-only; previously ⌘I was the only way
  in); 44 px hit target; rebuilds memoized on DOM presence per
  review so an external removal self-heals.
- **PR #121** (`fix/drop-fallback`): drops work in Firefox — falls
  back to flat `dataTransfer.files` when `webkitGetAsEntry` is
  absent; the FileList is copied into a real array before the async
  walk (live FileLists are only guaranteed valid during dispatch).
- **PR #122** (`fix/restore-retry`): failed launch restores retry
  at 15 s/60 s in the background (was: art-less fish all session);
  rejected retries logged; when retries exhaust while offline a
  single deduped `online` listener arms one fresh round.
- **PR #124** (`fix/local-drop-persist`): dropped fish packs
  persist under `local:` keys in IndexedDB (excluded from LRU
  eviction — they're user data, not cache), so they survive
  relaunch like installed add-ons; shared `LOCAL_PREFIX`/`isLocalPack`;
  writes awaited with quota warnings; scenery-only packs no longer
  block later fish files in the same drop.
- **PR #125** (`fix/backdrop-cover`): backdrop cover-fits (crops,
  never stretches a non-1.6 source) and pre-scales once per pack —
  `render()` is a 1:1 blit. Cache keyed on identity + dimensions.
  NOTE: overlaps other-pass PR #87 — pick one at merge.
- **PR #126** (`feat/browser-shortcuts`): `o`/`p` open Overview/
  Preferences in browsers (the `s`→stats pattern generalized via a
  COMPANIONS table); editable-target guard so future text fields
  don't fight bare letters.
- **PR #127** (`feat/empty-tank`): Overview "Empty Tank" — removes
  every add-on and fish, keeps prefs/water/sound bank. In-page
  two-click arm ("Really empty?") because `confirm()` silently
  returns false in the WKWebView shell; tank epoch discards installs
  that were fetching at the wipe (checked twice — before apply and
  before `recordInstall`); disarm on empty + 350 ms anti-double-
  click beat; red danger styling.
- **PR #128** (`feat/sleepy-fish`): new `sleep` state — after the
  tank has seen daylight once, fish bed down below the dusk
  threshold, settle on the gravel with a barely-there stroke,
  ignore food, and wake at dawn or on a knock. `seenDay` latch
  keeps a cold-start mid-night sim from knocking fish out on tick
  one. Round: no positional drift (was ~600 px/night into a wall),
  bidirectional settle, exported `SLEEP_LIGHT`/`WAKE_LIGHT`.
- **PR #130** (`feat/fish-tooltip`): Balloon-Help-style
  species+state tip on fish hover; shared letterbox math between
  tap and hover; edge-clamped, touch-skipped, and the frame loop
  re-hides it once the fish swims off a parked cursor.

## Completed (fifth pass, PRs open for review, all at steady state)

- **PR #94** (`fix/multi-pack-drop`): a multi-file drop of pack
  containers imports *every* decodable pack — the inline loop
  `return`ed after the first success whenever any earlier sheet
  existed. The pass now lives in `web/drop.ts`
  (`decodeDroppedPacks`, red-green regression test), reads each
  file once (the sound pass collects pack candidates via the head
  it already slices), skips packs that throw mid-decode (corrupt
  file cannot cost the rest of the drop — pinned by a truncated-
  directory test), and warns only when nothing at all landed.
  Overlaps the round-2 fix inside PR #93 — pick one at merge.
- **PR #102** (`feat/web-menubar-bar`): a Mac OS 8 menu bar for
  the browser shell (never mounted in native — AppKit owns that):
  Tank / Window / Help menus plus an app-glyph menu (About
  Finsical window, Shortcuts window, donate, archive.org links)
  and a System 8 clock that repaints per second and on
  visibilitychange. `openClientWindow` generalizes the stats-tab
  focus/reuse dance for Preferences, Tank Overview and Tank Stats,
  fixing the browser dead end where both were native-menu-only.
  Bare keys (F/C/S) stand down while a menu or doc window is open.
  Overlaps #103 (their menubar: also adds Change Water/Take a
  Picture) and #126 (o/p keys) — complementary; reconcile at
  merge.
- **PR #129** (`feat/water-feedback`): tap ripples and feed
  splashes as whole-pixel effects ticked on the 30 tps sim clock
  (`web/fx.ts`, tested): double-pulse ring where the glass is
  knocked, three ballistic droplets where food (or a newly
  installed fish) enters at `FOOD_ENTRY_Y` (exported from the sim
  so the splash sits where pellets actually spawn). Overlaps
  #106/#107 — three ripple PRs now; pick one at merge.
- **PR #131** (`feat/first-run-hint`): a raised-Platinum first-run
  note at the foot of the tank pointing at Import Add-ons (auto-
  hides on the first install; dismissed once, never returns) and a
  hand-drawn 24x14 pixel guppy placeholder with a two-frame tail
  wag replacing the colored rectangles (grid integrity, body-
  still and tail-wags assertions via `spriteSvg`). Overlaps the
  other placeholder-fish branches — reconcile at merge.
- **PR #132** (`feat/tank-lights`): lamp toggle — off pins the
  tank at `LIGHT_NIGHT` (the cycle's own night floor), on restores
  the automatic cycle; bare L, native Tank > Toggle Lights
  (window.finsical.toggleLights), persisted in the tank save with
  finite/clamped restores (tickCount and waterQuality gained the
  same hardening); Tank Stats' Day/Night follows the same push.
  Partially lands the "Lighting switch" item below — dimmer and
  real-clock sync remain open.
- **PR #133** (`feat/sound-controls`): Sound pane in Preferences —
  Play sounds switch (mute remembers levels), Overall volume and
  Water ambience sliders with Balloon-Help captions and per-pane
  Defaults; `TankAudio` routes everything through a master gain
  bus (ambient loop keeps its own node), ramps level changes over
  20 ms instead of snapping (clicks), retires displaced ambient
  loops and their gain nodes, defers AudioContext creation until a
  buffer actually plays, and flags `usable:false` when creation
  fails (pane note, like the CRT-unavailable one). Persists via
  `finsical:sound`, bus op `soundConfig`, state carries
  {master, ambient, muted, available}. Overlaps #101 (their Sound
  pane: mute + active-source tracking) — reconcile at merge; the
  volume-slider half of the open item below lands here.

## Completed (sixth pass — Devin, PRs open for review)

- **PR #134** (`fix/import-reliability`): every fetch runs under a
  stall timeout — 30 s without body progress aborts, so
  slow-but-healthy archive.org transfers finish while a true wedge
  rejects and the panel's Try Again actually retries; thumbnail
  fetches dedupe while in flight (`thumbFetching`); tank/scenery
  sections no longer register sheets into the fish pool (starter
  fish can't round-robin onto scenery art); `remoteInstall` drops
  its redundant second `postState`. Review round 2 applied: the
  original total-duration cap became a progress-resetting stall
  budget, and the timeout message went host-neutral. Verified per
  review: `recordInstall`→`saveTank` broadcasts unconditionally,
  `zipCache` evicts rejected promises, all `sheetByPack`/
  `packBySheet` consumers are fish-only.
- **PR #135** (`fix/tank-polish`): tap-zone classification
  normalized by half-dimensions (near-corner taps pick the right
  knock variant); `.irowname` nowrap (long/Japanese add-on names
  ellipsize instead of hard-clipping in the 32 px row); fish dest
  rects round to ≥1×1 integers (less HiDPI shimmer on level
  swims); saved fish fields sanitized — finite+clamped numerics,
  `bandY` falls back to the clamped `y`, invalid `sheetIdx`/`pack`/
  `id` dropped rather than zeroed, `speed` floor matches `cruise`;
  `visibilitychange → hidden` saves so native quit can't lose the
  last ≤10 s; menu feed drops at a random x. Declined: deleting
  empty `species` — `""` is the sim's own unbound sentinel.
- **PR #136** (`feat/import-filter`): substring filter field in the
  add-on browser header — case-insensitive, scoped to the current
  section, "N of M" count, Escape clears the field without closing
  the panel, filter survives section switches. Review round 2
  applied: `stopPropagation` on Escape, autocomplete/spellcheck
  off, forced-colors focus outline, `aria-live` on the count.
  Refuted: "inner is HTML markup" — it is the zip entry name
  rendered via `textContent`.
- **PR #137** (`feat/fish-get-info`): ⌥-click a fish for a
  Mac-style Get-Info card that tracks it as it swims — species,
  hunger, mood (`Record<Fish["state"], string>` so a new state
  fails typecheck), cruise; closed by its close box, Escape, an
  ⌥-click on empty water, or the fish leaving the tank. Review
  round 2 applied: `audio.unlock()` runs before the ⌥-click early
  return, the card origin uses rect deltas against `screenEl` (was
  mixed offset/rect coordinate spaces), and the 7 px close box got
  an invisible ::before halo for touch.
- **PR #138** (`feat/begging-fish`): hunger above ~0.75 biases a
  fish's depth band to just under the surface (begging), and the
  nearest calm fish within 80 px of a hovering pointer drifts over
  to look — hunger and panic outrank curiosity. Review round 2
  applied: the standoff guard measures fish-to-pointer (was
  fish-to-target, which pinned a hovering fish to the exact cursor
  instead of holding a ring); non-primary pointers ignored; sim
  constants exported for the test; `noticeFish` made public so the
  test asserts identity rather than a flaky wander position.
- **PR #139** (`feat/decor-depth`): decor roots anchor into the
  gravel strip (quarter buried, no more floating/sunken plants), up
  to 3 art frames per pack largest-first, and the middle frame
  plays foreground over fish and bubbles capped at half tank
  height; `keyMask` clears key-index pixels including enclosed
  pockets. `pickDecorArts` honors `max=0` (contract fix + test) and
  `addDecor` replaces a re-imported pack's frames instead of
  stacking. Declined: drawing pellets topmost — mid-water occlusion
  by foreground plants is the depth effect (intent pinned in a
  comment).
- **PR #140** (`feat/stats-sparklines`): inline 44×14 1-bit
  sparklines for water quality and hunger beside each meter —
  newest sample right, per-column gaps for missing data, text and
  progress-bar accessibility untouched. Review round 2 applied:
  intrinsic canvas size (no CSS w/h, so a border-box reset can't
  squeeze the columns), an all-null series skips the framed blank,
  and non-finite samples gap like nulls. Verified: history push
  precedes render; age+count trims keep it bounded.
- **PR #141** (`feat/crt-poweron`): a `uPower` shader uniform plays
  a ~450 ms tube warm-up on every enable — a bright center line
  opens into the full raster while the whole raster squeezes into
  the band; the brightness boost keys to raster openness so total
  emitted light stays roughly constant (no mid-animation flash);
  skipped under `prefers-reduced-motion`. Review round 2 applied:
  `powerT0`'s sentinel is `-Infinity` (0 meant page-load time — a
  pre-enable frame could play a stray warm-up).

## Completed (seventh pass — full-repo review, PRs open, all at steady state)

- **PR #99** (`fix/decor-reinstall`): "Add Again" on a
  plants/accessories pack no longer stacks a duplicate — `addDecor`
  replaces that pack's frames instead of always pushing. GLM round 2
  clean (0 actionable).
- **PR #109** (`fix/light-curve`): full-sine light curve so a
  `DAY_TICKS` cycle includes a sustained night near the 0.3 floor;
  stats Day/Night tracks the same threshold the render uses.
- **PR #115** (`fix/audio-unlock`): first feed/tap from keyboard or
  menu unlocks `AudioContext` the same way a click does (`unlock()`
  called from those paths; `e.repeat` guard so held keys don't spam).
  Declined: ambient-stack re-entry double-guard (basis of prior
  refusal — `unlock()` already idempotent).
- **PR #116** (`docs/readme-version`): README version marker kept in
  step with `package.json`/`Info.plist` (release script notes;
  EXIT/signal traps so a failed bump doesn't leave a half-written
  README). Tip `ce14382`. 0 actionable.
- **PR #119** (`fix/native-import-shortcut`): in the native shell,
  Cmd/Ctrl+I opens only the native Import window — the page overlay
  no longer competes when a WKWebView menu already owns the shortcut.
  Declined: `e.metaKey`-only guard (Ctrl+I is the actual dual-UI
  path; meta-only would leave the reported bug).
- **PR #123** (`feat/pause-sim`): pause freezes `tick()` while
  render continues (screenshots/benchmarks); Tank menu + bare key;
  pause-persistence, `e.repeat`, and TDZ findings declined with
  reasons. Streak >2 minor-only rounds → stopped.
- **PR #142** (`feat/crt-presets`): named `CrtConfig` bundles in the
  Monitor pane — Authentic, Sharp, Soft, Pixel Perfect — frozen via
  `CRT_PRESETS`, applied by dropping any pending custom config and
  posting the full preset; disabled with the CRT-off checkbox;
  balloon captions clear when a slider takes over. Round 1: tube-key
  list derived from `CRT_DEFAULTS` minus picture keys; focus handler
  guards `!described` like pointerenter. Round 2–3: Authentic aliasing
  declined (`CRT_DEFAULTS` already frozen + `isFrozen` test); CSS dim
  and `setEnabled` claims refuted (`osm-button:disabled` dims;
  `setEnabled` is `HTMLInputElement`-only). 0 actionable on `e7aadb6`.
- **PR #143** (`feat/food-zone`): feed-zone cue — pure
  `web/feedzone.ts` (`FEED_ZONE`, `isFeedZoneY`, `containPoint`,
  `feedZoneLineY`), crosshair + bright 1px boundary under the pointer
  (rechecked each frame from the last client point so resize can't
  strand the state; cleared immediately on leave). Round 1–2: hover
  moved to `render()`, letterbox math extracted + tested, boundary
  `ceil`, zero-area rect covered. Round 3: 0/0 NaN path + line
  invariant pin declined as info-only nits after two clean rounds.

## Completed (eighth pass — Devin, PRs open for review)

Eighth-pass baseline: `origin/main` `0342fb0`. Findings were verified
against main itself, not against historical branch claims.

- **PR #144** (`devin/complete-web-artifact`): the standalone web
  build copies `web/assets/` into `dist/` — every machine case image
  404'd in the production artifact (native packaging copies assets
  separately in `macos/Makefile`). `scripts/web-build.test.mjs`
  builds a temp fixture and pins each image-backed machine's bytes.
  GLM round 1 minor-only (junction-safe symlink, `npm.cmd` spawn +
  inherited stdio, non-empty `it.each` guard) — applied. NOTE: the
  `cpSync` line was later removed from `package.json` by a manual
  user edit — confirm the build still ships `dist/assets` at merge.
- **PR #145** (`devin/validate-imported-art`): untrusted azpack art
  is validated before rendering — a 2^26-pixel budget is checked
  before inflating, inflate streams into an exact-size buffer and
  cancels on overflow, palettes >256 entries are rejected, and sheet
  metadata (positive counts, ordered group-major `dims` prefix,
  cell/atlas bounds) is checked at load. Truncated `dims` prefixes
  stay loadable (`emit.py` emits them for truncated sprite streams);
  absent cells still throw at `frame()`, now cushioned by a
  `drawFish` placeholder fallback so a bad pack can't kill the rAF
  loop. GLM round 1: error-detail + interior-gap test applied;
  "previously rejected cleanly at load" premise refuted.
- **PR #146** (`devin/render-on-tick`): `render()` paints only on
  rAF frames where a sim tick ran (plus first paint); the CRT shader
  still draws every frame for `uTime` flicker/grain but skips
  `texSubImage2D` on stale frames and re-uploads once on re-enable.
  ~2x fewer canvas repaints and texture uploads at 60 Hz, more at
  higher refresh rates. Proxy-GL tests pin the gating; a headless
  screenshot verified the tank still paints.
- **PR #147** (`devin/machine-previews`): `previewMarkup()` layers a
  still of the tank — aperture backplate, water gradient, gravel,
  three placeholder swimmers, bubble trail — under the shell art in
  the prefs machine picker, so cases preview as running aquariums
  and Bare tank as plain water. Shell art stays on top so baked-in
  reflections remain; no extra render loop or fetch. Verified
  visually across all 11 cases.
- **PR #148** (`devin/stale-food-seek`): a fish exits `seek` when its
  food vanishes (eaten by another fish, rotted, or water below
  `QUALITY_SEEK`) — Overview/Stats no longer report "Looking for
  food" for behavior that isn't happening. Regression tests cover
  the eaten-target and foul-water paths.

## Bugs / Reliability (open)

- ~~`core/sim.ts`: `nearestFood()` can briefly target food that was just eaten if called with a slightly stale snapshot.~~ Corrected in the eighth pass: `nearestFood` already skips `fd.eaten` and fish update sequentially — the claim is unsupported. The concrete adjacent bug (fish stuck in `seek` after its food vanished) landed in PR #148.
- `core/sim.ts`: `tap()` propagates panic but doesn't cap bubble spawn in foul water. Consider a max-bubble cap for performance.
- ~~`web/crt.ts`: `hash()` uses `fract()` which may lose precision over very long sessions; wrap `uTime` more frequently or use a different noise source.~~ Corrected in the eighth pass: `uTime` already wraps every 100 s and noise uses `fract(uTime)` — "wrap more often" is not a verified fix. Profile a real precision artifact first.
- ~~`macos/Finsical.swift`: `loadMaskImage()` alpha-offset computation assumes `premultipliedFirst`; add a runtime check or fallback for other byte orders.~~ Corrected in the eighth pass: the code derives the alpha byte offset from the alpha format and byte order. Retain a native image test, not this unsupported bug claim.
- ~~**"Add Again" duplicates plant/accessory decor** (`addDecor` always `decors.push`).~~ Landed: PR #99 (replace that pack's frames; backdrop/gravel were already delete-then-set by URL).
- ~~**Multi-pack drop stops after the first successful pack file** (pack-pass `return` out of the whole async IIFE).~~ Landed: PR #94 (`decodeDroppedPacks` imports every decodable pack).
- ~~**Day/night curve almost never reaches night** (half-wave sine; stats stuck near "day").~~ Landed: PR #109 (full-sine + sustained night floor) and PR #113 (night valley + tint).
- ~~**Audio stays locked until the first tank click** (`unlock()` only on `pointerdown`).~~ Landed: PR #115 (keyboard/menu paths call `unlock()`).
- ~~**No volume or mute control** (hard-coded gains; no Sound pane).~~ Landed: PR #101 (mute) and PR #133 (volume sliders + master bus).
- ~~**README version marker stale** (0.2.0 vs 0.3.0; release.sh didn't bump README).~~ Landed: PR #116.
- ~~**Ctrl+I in the native shell opens the in-page overlay**, not the Import window (two UIs for one shortcut).~~ Landed: PR #119 (native prefers the native window).
- `window.finsical.openImport` appears dead — exposed for the native shell; Swift only invokes `feedFish`/`toggleCrt`. Either wire a native path or remove the surface.
- **Save/load drops mid-swim fields** — `saveTank()` omits `state`/`phase`/`latch`/`peak`/`tx`/`ty`/`turnDir`/`turnFrom`/`panicHops`; on load fish restart a decision cycle from rest and forget an in-progress turn. Persist the motion fields (or document the reset).
- **Stats "Light: Day/Night" threshold is coarse** — `light > 0.5` flips late in dusk/dawn; keep model and render in lockstep when either changes (PR #109 closed the curve half; verify the stats phase still agrees after further light edits).
- ~~`web/import.ts`: thumbnail fetch dedupe hole — IDB-miss path deletes from `thumbQueued` then pushes to `thumbQueue`, so a second `wantThumb` before fetch completion queues a duplicate (`pumpThumbs` never checks). Harmless today (`fetchAddon` memoized) but slow packs starve the 3-wide queue.~~ Landed: PR #134 (`thumbFetching` tracks in-flight URLs).
- `web/import.ts`: loose-mode (`prefix:`) listings don't dedupe colliding basenames the way the nested-zip branch does — two same-name rows bind `sheetBySpecies` last-wins. Copy the `used`-set logic over.
- ~~Fetch path has no timeouts: a stalled archive.org request wedges that URL in `installsInFlight` while the panel's 15 s "Try Again" re-arms a no-op button. Add `AbortController` timeouts (~30 s) + clear in-flight on timeout.~~ Landed: PR #134 — a 30 s *stall* timeout (resets per body chunk; rejected promises evict their cache memo).
- Sim time stops when the tab is hidden (rAF-driven), so stats uptime/hunger/day-night stall while client windows claim live readings. Advance catch-up ticks on visibilitychange, drive from a Worker, or grey stale numbers until fresh pushes land. Note for stats wording: "up 4h" is visible-hours, not wall-hours. Eighth-pass framing: this is a product decision — prefer no-care-penalty suspension for a relaxation toy, mark the suspended state explicitly, and cap any catch-up burst on wake (the rAF clock already clamps elapsed to 200 ms). If real-clock lighting is ever added, keep it separate from hunger time. Verify real AppKit occlusion/minimize behavior rather than assuming browser visibility maps perfectly.
- ~~Fractional sprite dest rects (`drawFish` rounds translate but not w/h) shimmer on HiDPI with smoothing off. Round w/h to whole pixels.~~ Landed: PR #135 (rounded, clamped ≥1; pitched fish still rotate through fractional space by design).
- Cosmetic drift: Swift `DragStrip` is 22 px, overlay `TOP_CLEAR` is 24 with a comment saying 22. Pick one number.
- `PLAN.md` overclaims the sim ("mood" — growth stages now exist; mood still doesn't). Implement mood or reword.
- ~~Saved fish fields aren't validated beyond `x`/`y` (`loadTank` roster filter in `web/main.ts`). A hand-corrupted `hunger: "x"` or `null` enters the sim, poisons `Math.min` results, and re-persists (the `scale` field got this guard in PR #110 — extend the same pattern to the other numeric fields).~~ Landed: PR #135 — every numeric field finite+clamped, `bandY` defaults to the clamped `y`, invalid `sheetIdx`/`pack`/`id`/`species` sanitized or dropped.
- ~~`remoteInstall` calls `recordInstall` (→ `saveTank` → `postState`) and then `postState()` again — one redundant broadcast per install.~~ Landed: PR #134.
- Drop-path stem logic: `name.replace(/\.[^.]*$/, "")` strips the last dot-suffix only; keep it aligned with the remote path's stem logic (`replace(/\.[^.]+$/, "")`) — same regex, noted so future edits don't diverge.
- ~~`web/audio.ts` `tap()` zone pick compares raw pixel distances (`dx < dy`) on a 320x200 tank — normalize by w/2 and h/2 so corner taps pick the right knock variant.~~ Landed: PR #135.
- ~~Native quit can drop the last ≤10 s of tank state: `pagehide` is unreliable in WKWebView on termination; also save on `visibilitychange → hidden`.~~ Landed: PR #135.
- `pickBackdrop` keys art by source (`""` for bundled *and* drag-dropped packs): a drop silently rebinds the bundled art and `removeAddon` can never restore it. Synthetic source keys fix it.
- **Empty-tank save is repopulated on reload (reproduced)** — `web/main.ts` `roster?.length ? roster : DEFAULT_FISH` restores four starters for a valid v2 save with `fish: []`. Removing the last fish should be durable, not read as first launch. Distinguish "no valid save" from "valid empty roster"; test first launch, explicit empty v1/v2, malformed entries; keep v1 add-on reconciliation separate from the first-launch decision.
- **Emitter scenery PNGs can't be loaded by the browser** — `tools/az/emit.py` writes scenery as RGBA PNG (color type 6) via `tools/az/img.py`, but both scenery loops in `web/main.ts` call `decodeIndexedPng` (type 3 only) and silently skip failures. Pick one contract — accept RGBA at the scenery boundary or emit indexed scenery (without making palette index 0 transparent in opaque backgrounds) — and add a Python-emitter-to-browser round-trip fixture covering pixels, opacity, dimensions, and actual backdrop selection for bundled packs and dropped folders. Fish atlases already use the indexed writer.
- **Persisted data needs a validated schema boundary** — `loadTank` validates only the version and two arrays; roster entries are checked for finite x/y. Invalid hunger/cruise/heading, duplicate or negative IDs, and malformed add-on records enter the sim and re-persist. The save also omits pellets, RNG state, and the motion fields listed below, so reloads are not deterministic continuations (a fed pellet vanished on a tested reload). Extract a versioned parse/restore step that validates each record independently, preserves an intentionally empty roster, clamps domain values, and defines which fields intentionally reset; retain a last-good save; test partially damaged saves and quota-full/unavailable storage.
- **Pack-owned fish can inherit unrelated art** — `remapSheetIdx` only drops unresolved bindings when the old index is out of range and `sheetOf` falls back to round-robin; a pack that fails to restore can leave a saved fish wearing another species' sheet under its own name. Bind pack-owned fish strictly by pack identity and show the recognizable placeholder while absent (resolve when the pack loads); keep round-robin only for explicitly unbound starters. Test mid-order restore failure, same-name packs, and late retry.
- **Removal can be undone by in-flight restore work** — `removeAddon` and the import panel's restore share no cancellation/generation state; a restore resolving after removal reapplies decor/art to a tank whose installed list no longer contains it, and the in-page panel keeps its own installed set that main-page removals don't reach. Serialize or generation-check per-pack apply/remove, synchronize both panel forms, and make removal authoritative over older work. Test delayed-restore-then-remove, reinstall-after-remove, and same-name packs.
- **Local drops still trail archive imports** — remaining gaps on main: scenery-only raw packs are ignored by the raw-pack loop, a dropped fish's art can be misclassified as a tank background, and provenance for local bytes is thin. One classified import path for archive and local sources, stable local IDs, durable local bytes outside cache eviction, per-file failure isolation, and an import summary. Partially addressed by open PRs #93/#94/#121/#124 — verify what's merged before re-scoping.
- **Sound persistence can lose data or report a failed write as success** — `web/store.ts` `rw` serializes read/modify/write only within one module instance; the tank and Add-ons pages use separate instances, so overlapping merges can clobber each other. `rw` returns null on transaction failure while callers only catch rejection — `web/addons.ts` can announce `soundsLoaded` after nothing committed, and the legacy-thumbnail migration deletes its source after a null `packPut`. Make read/merge/write one IndexedDB readwrite transaction, return a meaningful result, distinguish cache failure from user-data failure, and only remove a migration source after commit.
- **`tools/fetch.py` deletes output before conversion succeeds** — an existing output bundle is removed up front and numbered siblings are removed before the new input is proven usable; the standalone converter can also overwrite same-basename inputs into one destination. A failed conversion destroys the previous usable result. Stage each conversion in a fresh sibling directory, validate its manifest, then replace only that conversion's owned destination; reconcile stale outputs only after a successful complete run. Test with temp dirs and an injected failure — existing bytes must survive.
- **Remaining decoder resource budgets (B04 slice landed)** — PR #145 bounded the azpack PNG path; still open: remote `arrayBuffer` downloads are unbounded, ZIP's byte limit covers deflate but not stored entries, BMP RLE builds an unbounded intermediate row before clipping, FSH checks the atlas budget after allocating individual frames, BinHex RLE expands without an output cap, and Python ISO parsing trusts lengths too far (assertion used for external validation). Cap input, per-entry expansion, aggregate decoded bytes/pixels, and recursion depth before allocation; test with injected small budgets, truncation, and continued import after rejection.
- **Bus messages and multiple browser tanks lack an authority boundary** — `BusMsg` is an unchecked record (handlers dereference fields without one envelope validation), and every same-origin tank listens on `finsical` and writes the same save key — two open tanks produce competing state pushes, duplicated intents, and last-writer-wins persistence. Validate envelopes and per-op payloads, choose one active browser tank or scope sessions/companion windows by tank ID; test malformed messages, two tanks, reconnect, companion-before-tank. Native relay stays unchanged.
- **Stats mixes histories across tank restarts** — Overview notices `boot` changes; Stats doesn't clear its history, so its arrows can compare different tank sessions, and there's no stale/disconnected state. At exactly quality 0.3 the advice permits feeding while the sim requires strictly >0.3. Reset/reseed trend history on boot change, distinguish waiting/stale/live, and pin advice thresholds to actual sim behavior; test restart, delayed first contact, missed heartbeats, threshold boundaries.

## Performance / Engineering (open)

- Hoist per-frame string allocs in `render()`: murk/dark `rgba()` templates rebuilt each frame, `globalAlpha` toggled per pellet (P1 in the seventh-pass notes; cache alpha strings or a prebuilt overlay canvas).
- ~~CRT path uploads a full texture every frame + unbounded DPR.~~ Landed: PR #88 (buffer capped at 2x DPR; `resize()` only when dirty) and PR #146 (the 2D canvas repaints only on fresh sim frames; `texSubImage2D` is skipped when the tank bitmap is unchanged while the shader still draws every rAF for `uTime` effects — ~2x fewer repaints/uploads at 60 Hz).
- ~~Backdrop drawn at full tank size every frame without prescale.~~ Landed: PR #87 / PR #125 (pick one at merge) — cover-fit + once-per-pack prescale, `render()` is a 1:1 blit.
- State push cadence while Overview/Stats open: `postState()` on every 10 s save and bus hellos; Overview/Stats also heartbeat every 2 s with full fish list + addons JSON. Acceptable at current roster sizes; coalesce/slim if rosters grow past dozens of fish (related to the four-window hello-poll item below).
- `swimCanvas` cache is unbounded per sheet×frame×facing — bounded by sheet metadata (small); large imported sheets still allocate every combination on first use. Lazy fill already helps; optional LRU not urgent (the related `swimCache` LRU cap landed in the other pass).
- IndexedDB pack cache: thumb entries share the pack budget deliberately; ensure installed packs win over thumbs under pressure (they do if thumbs are older; fresh thumbs could still evict packs — worth a pin/priority for live installs).
- Sim is O(F·P) (`nearestFood` per fish per tick) + O(F²) panic fan-out + O(F²) schoolmate `filter` per decision — fine under caps, the stutter vector without them. Fish cap landed at 24 (PR #111); still open: cap pellets — but avoid an evict-oldest cap that lets repeated feeding erase waste for free; add gentle overfeeding feedback. Overfeeding currently fouls the tank in ~1 s, which reads as broken. Test sustained input, settled waste, and feeding fairness.
- ~~`AudioContext` is constructed during page load before any gesture (suspended-context warnings). Defer creation to `unlock()`.~~ Landed: PR #133 (defers creation until a buffer actually plays; `usable:false` surfaces creation failure in the pane).
- `saveTank` serializes the roster to localStorage every 10 s even when clean. Hash-and-skip.
- Drop path reads every file twice (head slice + full buffer, up to 32 MB). Reuse head bytes for sniffing.
- Four client windows each `hello`-poll every 2–10 s, each answered by a full state push. Push-on-change + slow heartbeat instead.
- Bounded thumbnail memory: confirm `thumbMemo` LRU stays within budget under all session lengths.
- Cache eviction metrics: temporary log counter for `swimCache`/`thumbMemo` evictions; verify near-zero in normal use.
- Idle-time pre-rasterization: each new (group, frame, facing) pose pays a `putImageData` on first draw — a fish's first turn hitches through ~16 cells. Prewarm the pose ring via `requestIdleCallback` after a pack installs.
- Native `frames.save` runs on every resize tick (UserDefaults write per frame during live resize); debounce to ~100 ms.
- Audio overlap: `startAmbient()` may briefly overlap previous loops; verify no audible stutter during rapid load/restart.
- Optional GLM follow-up (declined as a stop-rule nit, still valid): extract `fitBackdrop`'s round+clamp into a pure tested helper next to `coverCrop`.
- The whole JPN collection zip is downloaded to *list* entries: `listCollection` nested-zip mode fetches `AQUAZONE (JPN) SET.zip` — the entire item library, likely tens–hundreds of MB — into memory and IndexedDB (150 MB LRU budget). First JPN section open stalls; `packPut` failures are swallowed so it degrades to "no persistence". archive.org offers no central-directory-only fetch; keep the budget trim, warn in docs, and monitor quota.
- Pack decode (`zipRead`/`decodeIndexedPng`/`decodePixels`) runs on the main thread — a big `.azn` janks the tank rAF loop while thumbnails decode. The 3-in-flight throttle is polite but a `Worker` would isolate it; medium effort, real win on long add-on lists. Record a performance trace around a large import and a fish's first turn first — a real import showed >50 ms main-thread tasks but nothing is attributed yet.
- **Bound live memory, not just IndexedDB bytes** — `zipCache`/`packCache`, sheet arrays, and per-sheet raster canvases retain data for the whole session; `usePack` appends a sheet again on reinstall (removal intentionally keeps sheets to preserve indices), so a disk LRU doesn't bound live objects. Use stable pack-owned sheet slots and measured byte-aware eviction for rebuildable previews; never evict the only copy of locally imported user data. Test repeated install/remove and a long catalogue-browse session.
- **Render catalogue sections as they settle** — `listAddons` waits for every collection (including nested-archive enumeration) before showing any; cache failures are invisible and a partial failure silently drops sections. Show sections as they resolve with cached/offline/partial status and per-section retry; reserve download priority for the user's selection over speculative thumbnails. Introduce progress and stall cancellation before parallelizing more work.

## Missing features (open)

- **Click-a-fish info card — partially landed** (PR #137: ⌥-click opens a tracking Get-Info card with species/hunger/mood/cruise). Still open: surface the decoded `FsTH` per-species names + descriptions on the card.
- **Fish lifecycle stage 1.** No sickness (`SicH` unused), death, birth/eggs (`Egg*` unused) — growth landed in PR #110 but hunger still has no *adverse* consequence. Start with lethargy at hunger ≥ ~0.9 + recovery on feed, wired to the decoded birth/sick/dead `snd` events.
- **Lighting switch — partially landed** (PR #132: lamp off pins `LIGHT_NIGHT`, on restores the cycle; L key + native menu; persisted). Still open: a dimmer (continuous level, `LigH` data already decoded) and real-clock sync (local-time day/night), both natural fits for the same prefs pane.
- **More foods.** `FdHd` data decoded and ignored; flakes/pellets/live food with different sink rates is one `sink` field on `Food`.
- ~~**Import search/filter.** JPN sections are long; add a name-substring filter box.~~ Landed: PR #136 (per-section substring filter + result count + Escape-clears).
- **Starter reef bundle.** One-click curated set (6 fish + gravel + plant) + first-run card ("Your tank is empty. [Import Add-ons…] [Stock a starter reef]") — fixes asset-failure silence and cold-start discoverability together.
- **Overview actions.** Click row → spotlight fish in tank (ring highlight); rename (persist in save); state icons. Sort-column choice isn't persisted either.
- ~~**Stats history.** Sparklines for water/hunger from the existing 90 s `history` samples.~~ Landed: PR #140 (44x14 1-bit canvas per meter; gaps for missing samples).
- **Pause/sleep.** ~~Freeze `tick()` (render continues) for screenshots/benchmarks.~~ Landed: PR #123.
- ~~**No mute/volume.**~~ Landed: PR #101 (mute + active-source tracking) and PR #133 (master/ambient volume sliders, master gain bus, live ramps). Two Sound panes exist (#101/#133) — reconcile at merge; native-menu mute wiring from #101 still applies.
- **Save slots / tank profiles** — multiple `SAVE_KEY` slots in prefs or a small Tank menu; export/import a versioned tank (settings + roster + stable pack provenance + an explicit local-asset inclusion choice) with validate-before-replace, preview, and rollback. Multiple tanks should build on the bus-authority fix (B14 above), not competing global save keys.
- **About box** — version from `package.json`/Info.plist, license (Uncredit/Unlicense), archive.org credit, LLM disclosure link. A basic About dialog landed in PR #103; richer metadata/LM disclosure still open.
- **Click a fish to select** — hit-test on tank; highlight + Overview row sync; optional "follow" later. Prerequisite for per-fish care UI. (⌥-click Get-Info landed in PR #137 — select/highlight is distinct.)
- **Favicon + viewport meta** — viewport meta landed (PRs #90/#93); `index.html` still has no favicon (browser tabs show a blank icon).
- **Decor count / "Add again" for scenery quantity** — replace-on-reinstall landed (PR #99); an Overview quantity control remains optional.
- **Sound browser for game SFX** — Sounds section explains the game's own `.rsrc` isn't on archive.org; could deep-link or accept folder drop of a whole set with a progress UI.
- **Machine case thumbnails in prefs list** — list is text-only; a small icon column would sell the 11 cases. (The preview well itself now shows a water-filled case — PR #147.)
- **Specimen library** — installed species stay reusable after their last living fish is removed; show a plain-language name, the original name, source, cached status, and the decoded `FsTH` description where available. Keep "Add fish" distinct from "Remove pack".
- **Offline sim catch-up (optional)** — sim does not advance while the app is closed; long absences reset nothing (good) but also never progress day/night. Cap a tick budget on launch if wanted (distinct from the hidden-tab stall above).
- **Empty-state first-run tour** — on no packs, point at Import Add-ons / F to feed / click to knock; Overview already has empty copy; PR #131's hint note covers the tank foot.
- **Fish death / hunger consequences** — same as lifecycle stage 1 below (Egg*/SicH hooks unused); pair any death path with a revive so it stays friendly. Explicitly declined: starvation notifications.
- **Water chemistry UI** — Watr/SicH data noted in PLAN; Stats already shows quality %; advanced pane later.
- **In-app help — partially landed** (PR #102's Shortcuts window lists F/C/S/⌘I in-browser). Still open: the same list inside the native app (its menu bar has no Help menu) and the feed-vs-tap gesture hint; a Balloon Help mode (below) would subsume both. Keyboard help overlay = the same list as a `?`/`H` overlay.
- **Per-species swim params.** `FsTI` (speed, depth band, hunger rate) is decoded and unused; all fish share behavior constants.
- ~~**`feedFish` drops at tank center** — menu feed could drop at a random x for variety.~~ Landed: PR #135.
- **Backdrop/gravel chooser.** Partially landed: the Overview's "Use" action (PR #118) swaps among installed scenery packs and persists the pick. Still open: `pickBackdrop` newest-wins on *install*, and a prefs-side chooser/preview.
- **Fish naming/rename UI.** `FsTH` name records exist; the overview is the natural Finder-style inline-edit home. (A named-fish branch exists in the other pass — reconcile.)
- **No sickness/death beyond lethargy** — see lifecycle; fish gasping at the surface in foul water now exists (PR #106) as the pure-visual first step.
- **No multi-sheet growth stages** — `usePack` keeps only the single "best" sheet; real growth-stage art (`FsT2`/`FsT3` tables) would need multi-sheet support. Scale-based growth (PR #110) is the interim.
- Explicitly declined idea, recorded: starvation notifications — this is a relaxation toy, not a Tamagotchi.

## Visual / Aesthetic (open)

- **Scene life, ranked:** plant sway (sine x-shear by height on static decor) → light rays/godrays → caustic dapple on gravel (pre-rendered noise, slow scroll) → fish drop shadows → tumbling food crumbs. One effect per PR. (Light-rays/night-blue and round-bubble variants exist in other-pass branches — check them before reimplementing. Surface line, tap ripples, and ambient bubble vents landed in PR #106.)
- ~~**Moonlight, not black overlay.**~~ Landed via PR #113 (full-sine valley + deep-blue tint) and PR #128 (fish settle on the gravel). Still open: keep sparkles visible, darken sleeping fish sprites.
- **Gravel finish.** Feather the strip's top edge 1–2 px into the water; seat decor roots *in* it; consider subtle noise texture over flat `#8a6d3b`.
- ~~**Procedural placeholder fish.**~~ Landed via PR #131 (24x14 pixel guppy, two-frame wag; other placeholder branches exist — reconcile). Still open: placeholder fish get no overview thumbnail — the pending-thumbs key stays alive by design; consider a placeholder thumb so the list never looks broken.
- ~~**Machine preview with tank.** Render the 320×200 gradient inside the prefs preview glass (`sx/sy/sw/sh` all exist) so cases aren't picked blind.~~ Landed: PR #147 — a still of the tank (backplate, water gradient, gravel, swimmers, bubbles) behind the shell art for all 11 cases + Bare tank.
- ~~**Decor anchors to `TANK.height - 6`, not the gravel top** — tall `.grv` strips leave plants looking sunken, thin ones leave them floating. Anchor to the rendered gravel height (`gh`).~~ Landed: PR #139 — roots sit a quarter-strip deep in the rendered gravel, plus multi-frame picks and a foreground layer.
- ~~**Bubble variety.**~~ Landed via PR #108 (highlight pixel + wall-clock wobble). Still open: a 1 px size range.
- **`cursor: grab` on `body.tankpage`** suggests window-drag in plain browsers where it does nothing — cosmetic lie outside the native shell.
- **`prefers-reduced-motion` across the CRT.** The power-on animation (PR #141) already opts out, but flicker/grain and the rolling band still animate — flatten them at configure() time under the media query.
- **Eat gulp sound** — `find("eat","gulp")` on `food.eaten` if a pack ships one; silent otherwise.
- Food pellet eaten-animation (shrink/rotate before splash).
- Adaptive murk tint (toward backdrop's dominant color, not fixed brown); a slow sine shimmer on the murk would read as water, not jelly.
- Night glow: faint bottom bioluminescence at very low light.
- Reflection layer: low-opacity mirrored canvas behind machine glass for depth.
- **Night-light bezel tint** — the machine case art could dim with `sim.light` via CSS filter; subtle, lovely.
- Minor: `#opentrigger` overlaps the case's rounded corner on some machines.
- Fish pitch capped ±45° — steep dives clip mid-pose; acceptable, noted.
- **Consistent fish scale across packs** — imported species arrive at their own pixel sizes; gentle normalization (or decoded `FsTI` size data) would stop giant guppies next to tiny discus.
- **Bright fish over bright backdrops** — pale scenery can wash out light sprites; a subtle darker outline or slight backdrop dimming keeps fish readable.
- **Composition guardrails** (design constraint, not a bug) — keep the classic fonts, bevels, real case art, nearest-neighbor fish, and sparse controls; no modern rounded cards, blur, or oversized type in the Platinum windows. Prefer a soft blue night tint over crushing to black (PR #113).

## User Experience / Delight (open)

- **CRT presets — landed** (PR #142): Authentic / Sharp / Soft / Pixel Perfect in the Monitor pane; on/off remains the checkbox (the seventh-pass "Off" name folded into the existing switch). Still open: lower all-day defaults as a user-tunable baseline beyond Soft.
- **Preferences window fixed pixel layout** — `app.css` is absolute inside 564×456 (native 565×457); host `hostWindow` does not pass `grow`. Confirm Osmium resizability; if fixed, document it (panes can clip if resize is ever enabled).
- **Overview Remove is destructive without confirm** — Delete/Backspace or Remove drops fish/add-ons immediately; a confirm (or undo via toast) would reduce oopses (empty-tank's two-click arm is the pattern). Prefer one-level Undo with a named action + shortcut; keep selection stable after removal and announce the result. Test repeated keydown, focused text fields, pack-wide removal, and delayed state echo.
- **Small-window support floor (reproduced)** — at 320×400 the Preferences preview collapses to ~2 px and its caption overlaps the machine list; at 300×120 the Stats care text starts below the viewport, unreachable (web `grow.min` 300×60 vs native's nominal 300×250). State a supported minimum, stack or scroll content below it, and share native/web minimum geometry; test 320/375/565 widths, short heights, 200% zoom, long names, two care hints. Viewport meta is still absent from all five pages on main (it exists only in open PRs #90/#93).
- **Make failures and pending states visible** — many failures are console-only. Add concise in-window states for restoring, unavailable pack, cached listing, partial catalogue, quota failure, and a stopped import — each with a practical next step and the real error preserved in diagnostics. A fallback fish should be clearly a placeholder, not a mislabeled species. No modal storms or permanent busy HUD.
- **Native shell politeness** — always-on-top / all-Spaces behavior is forced; offer a preference while keeping the desktop-toy default. Verify transparent-edge click capture, drag/resize on all machines, restore-to-removed-monitor, custom-window focus, WKWebView content-process recovery, and native Help/About parity. Needs real macOS testing.
- **Stats window clips care hints (by design)** — `grow.min` 300×60; `advice.slice(0, 2)`. Acceptable; longer advice could open a help overlay later.
- **Touch trigger only on `hover: none`** — `#opentrigger` may miss stylus-with-mouse / hybrid laptops; consider also showing when no menu bar is available (browser-only).
- **No first-run pack guidance in-tank** — banner/balloon pointing at Tank ▸ Import Add-ons would beat console-only feedback when azpack load fails (PR #131's hint covers the happy path).
- **Archive.org credit + Donate present — good** — keep; consider surfacing offline mode ("showing cached listing").
- **Overview Remove / sort persistence** — column sort choice isn't persisted across sessions.
- Right-click (ctrl-click) contextual menu on the tank — Feed, Clean tank, Import Add-ons…, Snapshot, Mute — keeps chrome-free look, makes everything reachable even where the menu bar doesn't. The `pointerdown` handler already reserves non-left buttons.
- **Feed-zone affordance — landed** (PR #143): crosshair over the top 15% + bright 1px boundary under the pointer; `containPoint` shared letterbox math. Still open: crumb trail + plip on drop; touch long-press = scare split. (Drag-to-feed scattering landed in PR #106.)
- ~~Feed zone invisible (top 15% click = food, else knock; no cue).~~ Landed: PR #143.
- Import flow: per-row progress spinners/loading state, 2–3-wide parallel installs, failure text naming the file, ellipsized long names in fixed-height rows, cached/offline badges, and a clear selected-item preview. Don't auto-download packs to decorate the list.
- Touch: feed-vs-tap (y<15%) is still hard to discover even with the menu bar — a first-use hint or the feed affordances above would fix it.
- Stale badges: grey client-window numbers until the first fresh push after wake.
- ~~**Cursor awareness:** the nearest fish idly faces the pointer when it hovers the tank (no click) — subtle "it notices you". Cheap: in `decide()` occasionally target near last pointer pos.~~ Landed: PR #138 — nearest calm fish within `NOTICE_RADIUS` drifts to a `NOTICE_STANDOFF` ring around the pointer.
- ~~**Fish sleep mode**~~ — landed via PR #128 as a real `sleep` state: fish settle on the gravel at dusk, idle with a weak stroke, wake at dawn or on a knock.
- Keyboard shortcut cheat sheet — landed in-browser via PR #102's Shortcuts window; `?`/`H` overlay or a native-app equivalent still open.
- Fish Diary (`⌘⇧H`): age, pellets eaten, favorite depth band per fish.
- Captain's Log: SimpleText-styled auto-diary of tank events from stats history + sim events.
- Tank Age milestones: floating messages at 1 h / 1 day / 1 week uptime.
- Feeding reminder after ~10 foodless minutes.
- "About This Aquarium" easter-egg window (tank stats as system specs).
- Balloon Help mode reusing prefs caption copy across tank + overview. (First step landed: PR #130's species tip on fish hover.)
- Screensaver / relaxation mode (slow drift, hidden cursor; also After Dark homage). The "Bare tank" machine + `requestFullscreen` is nearly free.
- Guppy breeding: color-mixing fry from decoded `EggI/EGPC/EGDP` — headline 0.4.0 material. Breeding-lite variant: ≥2 well-fed same-species fish for a stretch → small chance per day-cycle of a juvenile spawning.
- Fish faces: 2-px hunger/mood mouth on sprites, Tamagotchi legibility.
- Machine-case easter eggs (TAM clock, Plus programmer's switch) with sounds.
- Dinner bell + feeding frenzy; overuse fouls faster.
- Tank weather: rain rings + dim + filter gurgle, cosmetic and cozy.
- Laser-pointer toy (hold L, fish chase the light). Useless, irresistible.
- Snail on the glass: a tiny snail inches across the front pane every few hours, leaving a faint clean streak (subtle lighter band). Pure aquarium truth.
- ~~Begging fish: hunger > ~0.75 biases the wander band toward the surface and hovers under a cursor parked on the top strip — sells the sim instantly.~~ Landed: PR #138 (the hover part landed as cursor awareness, above).
- Party mode: playing a music add-on keys fish tail-wag rate to the AudioContext clock. Silly, delightful, one constant away from `animFrame`.
- ~~CRT power-on animation: enabling the effect plays a ~400 ms tube warm-up (horizontal line bloom to full raster) — one uniform + timestamp in the shader.~~ Landed: PR #141 (`uPower`; 450 ms; reduced-motion skips it).
- Save Picture with bezel: composite the machine-case PNG over the tank canvas exactly as on screen; a shareable postcard (the plain-tank snapshot landed in #103).
- Time-lapse contact sheet (1 fps toDataURL for 60 s).
- Vintage filter mode (sepia + reduced saturation + vignette).
- Bubble trails: faint fading trails as fish swim.
- Feed key `F` could play a tiny "plop" even before unlock by resuming on the keydown that is itself a gesture (keys often count) — pairs with PR #115's unlock paths.
- Tap-the-glass already startles + sound; add a rare fish "photobomb" or sparkle on perfect water quality.
- Machine case switch: brief white flash or CRT degauss wobble (CSS/GL one-shot) would sell the hardware swap.
- Day/night: stars or room reflection on the bezel at night.
- Save "up time" and show a tiny anniversary line at 24h/7d.
- Sounds: imported record play button already exists in importer; a Tank menu ▸ Play Sound ▸ [name] list would be fun for drops.
- Easter egg: Konami-style sequence or hidden "Aquazone" about screen with original credits (license-safe text) — the Konami→bonus-fish line above is the short form.
- Custom 16×16 sprite editor in palette colors, persisted to localStorage.
- Konami-style easter egg → a tiny bonus fish. Optional whimsy.
- **CRT test card in the Monitor pane** — a switchable calibration preview (color bars, grayscale steps, a circle, a 1 px grid) that explains the scanline/geometry controls without touching the live tank; one click back to the aquarium preview.
- **Activity LED** — an existing case indicator or Platinum status glyph lights steadily during imports and returns to idle; no flashing, fake disk sounds, or silent work with no textual equivalent.
- **Specimen cards** — an illustrated card per species (original sprite, plain + original-language names, short decoded description, attribution). Collect knowledge, not chores or achievements.
- **Arrange mode** — explicit aquascaping: pick up a plant, drag with gravel snap, Escape cancels, Undo restores; ordinary feeding drags must never rearrange the tank.
- **Desk-lamp evening** — a subtle optional warm room reflection around the cool blue tank with a steady night setting; no per-frame full-resolution reflection canvas (relates to the bezel-tint idea above).
- Declined, recorded: windowshade double-click collapse (native window is chromeless — nothing to shade); seasonal/holiday gravel (scope creep).

## Testing & tooling gaps (open)

- No DOM/unit tests for entry-bundle handlers (decor merge and multi-pack drop now have pure helpers + tests — `web/drop.ts`, PR #99's replace path); keep extracting pure helpers when touching `main.ts`.
- No dedicated test for light-curve / stats phase agreement beyond PR #109's night-fraction pins — re-verify if the threshold moves again.
- `import.test.ts` stubs all non-`.zip` fetches as 404 — expected noise in logs; a comment at the stub helps future readers (already noted in the seventh-pass baseline).
- Python tools covered by unittest; Swift only via CI build.
- No e2e for bus install ack path (remote panel → tank).
- Live archive.org is not in CI (correct — flaky); a scheduled smoke job could catch listing HTML changes early.
- **Portable visual-check suite** — headless browser runs against synthetic local art with a controllable clock and mocked archive responses: startup, empty save, malformed pack, import acknowledgment, focus, layout at minimum sizes, reload. Real archive checks stay an optional smoke job, not required CI.

## Docs / packaging (open)

- CHANGELOG.md Unreleased section is rich; keep appending user-facing notes for each shipped idea.
- PLAN.md still accurate for out-of-scope breeding/water; update when those land.
- Favicon still missing (viewport meta landed earlier).
- README version marker tracked by PR #116.

## Design Notes (preserved)

- `core/sim.ts`: Excellent isolation; pure logic, easy to test. `new Sim(tank, seed)` — the second constructor arg is the RNG seed, not a fish count (a reviewer misread it once).
- `core/pose.ts`: Handles pose ring and turn animations correctly.
- `data/azpack` / `fsh`: Classic Mac resource fork parsing works well.
- `osmium-ui` provides authentic retro Mac UI — `mountMenuBar`, `mountWindow`, `pushButton`, `registerSprites` are all exercised by the browser shell now.
- `core/data/decor.ts`: Smart guard (`pickDecorArt`) skips catalog thumbnails with textured corners.
- `machines.ts`: Clear viewBox / hole definitions; Swift mirror is precise.
- Tank state persistence (v1/v2 roster migration), sheet remap by pack URL, and thumb sweep on removal are carefully built — touch that code with tests running.
- Bus review discipline: validate cross-page messages (`remoteInstall` pattern); clients should share one `isState()` validator. `BusMsg` is `Record<string, unknown>` by design — op validation lives in each handler.
- Settled food is waste in the sim model: `settled` increments → `WASTE_PER_TICK` drains quality from the first settled tick, so `changeWater` siphons the whole settled layer.
- Native vs browser shell: AppKit owns native menus; the Osmium menu bar (`web/menubar.ts`) mounts only in the browser path — keep them in sync when adding tank ops.
- Relaxation-toy constraints (product guidance, eighth pass): no mandatory maintenance, starvation notifications, irreversible deaths, surprise flashes, or a growing dashboard over the fish. Prefer gentle observable behavior, immediate reversible controls, and useful offline operation.
- Azpack contract: `tools/az/emit.py` can emit a truncated group-major `dims` prefix when a sprite stream is truncated — the loader accepts an aligned prefix (PR #145), absent cells throw `RangeError` at `frame()` time, and `drawFish` falls back to the placeholder instead of killing the rAF loop.
- `usePack` intentionally leaves sheets in place on removal to preserve `sheetIdx` bindings — don't "fix" the apparent leak without reading B08 (pack-identity binding) first.

## Review-response log (this pass; recorded so nothing flip-flops)

- Applied: whole-texel rounding + clamp for fitted backdrops; TANK-dims invariant note; CRT single-init lifetime note; named audio-skip warnings; `#crt` aria-hidden; F key in tank label.
- Declined with reasons: CRT observer teardown (single module-scope `initCrt`, no dispose interface — nothing to tear down); audio decode batching (manifests ≤ ~25 sounds, drops capped 32 MB); concurrent-`read` hazard (both `read` impls stateless: fresh fetch / File bytes); keyboard parity for tap (feed already has F + menu; tap-key is new scope); pure-helper extraction for the 4-line rounding (tracked above as optional).
- Refuted with evidence: none needed; no reviewer claim was factually wrong.

## Review-response log (third pass — Devin)

- Applied: multi-pack drop + `did`-on-rejected-pack import fixes (PR #93); corrupt-`scale` guard + clamp both ends + legacy-save `fromSave` flag + `GROWTH` comment math (PR #110); flat-school y-scatter comment + calibrated 10 px test margin + direct gap assertion (PR #112); `cleanTank`→`changeWater` op rename + "every settled pellet" doc fix (PR #114); pointer capture + `touch-action:none` + pointerId-scoped feed drag + FEED_STEP pacing + feed-sound throttle + id-stable gasp slack + `lostpointercapture` + named test tolerances (PR #106).
- Declined with reasons: `.azn` fish-sheet spawning — remote "tanks" section doesn't spawn fish either; `.azn` drops now match it (sheets still join the pool via `usePack`) (PR #93). 9-row gasp-slack quantization — integer pixel rows are fine for pixel art (PR #106). `EAT_DIST * f.scale` — design call, skews feeding competition toward adults (PR #110). Redundant clamp assertions duplicating covered branches (PR #110).
- Refuted with evidence: "dangerous `exec`/`child_process` usage" on `web/main.ts:994` — the flagged call is `RegExp.exec` on a string (PR #93). "Missing `cleanTank` `BusMsg` variant breaks the build" — `BusMsg` is `Record<string, unknown>`, CI green (PR #114). "Use 0 fish in the water-change test" — the ctor's second arg is the seed; the test already has zero fish (PR #114). "Confirm `audio.splash()` exists" — web/audio.ts:133, typecheck green (PR #114). "Feed drag never captures the pointer" — `setPointerCapture` runs unconditionally on every valid press before the branch (PR #106).
- Review gaps: GLM timed out twice consecutively on PR #103 — reported as a gap, not approval; CI green. PR #106 also lost its first run to a timeout but later rounds completed.
- Steady state: all six PRs posted with merge-ready/gap notes. Rounds without important findings: #93 clean re-review; #103 n/a (integration failure); #106 rounds 3–6 minor-only; #110 rounds 2–5 minor-only; #112 round 3 clean; #114 rounds 2–3 clean/minor.

## Review-response log (fourth pass — Devin)

- Applied: `addEventListener("ended")` over `onended` assignment + normal-flow sound caption (#101); stored-names-only provenance + restore-time `onInstall` self-heal + `orphanedSounds` contract test, then `applyPack` hoisted out of the optional call (#104); queue list + no-replay-after-failure + iterative then flat rejection-proof drain (#117); `Item.use` optional under `exactOptionalPropertyTypes` + unconditional test assertions + success-path `postState` (#118); hover-memoized trigger then DOM-presence memo (#120); FileList snapshot then real `Array.from` copy (#121); retry rejection handler + `restoreFailed` refresh + single deduped `online` listener (#122); shared `LOCAL_PREFIX`/`isLocalPack` + awaited `packPut` with warn + rejection-reason logging + scenery-doesn't-block-fish drop flow (#124); backdrop cache keyed on dimensions as well as identity (#125); editable-target guard refined to bare keys only + COMPANIONS table (#126); in-page arm-confirm replacing `confirm()` (silent-false in WKWebView) + epoch checks before apply and `recordInstall` + disarm-on-empty + anti-double-click beat + danger styling (#127); night-fraction + precision-5 daylight-mean pins (#113); no-drift bidirectional settle + exported thresholds + x-steady assertion (#128); tip edge-clamp + touch guard + frame-loop staleness re-check (#130); shared drop-spawn helper (#111); wobble phase once-per-frame + wall-clock wobble (#108).
- Declined with reasons: "freeze wobble with sim pause" — no pause exists and rAF stops when hidden (#108). "Distinct warning for non-cap spawnFish failures" — `spawnFish` only returns null at the cap, so "Tank is full" is accurate (#111). GLM's `e.repeat` concern — `!e.repeat` was already in the s/o/p branch condition (#126).
- Refuted with evidence: "`Fish` type not in scope" — `import type { Fish }` at main.ts:21, typecheck green (#130). "Sleeping fish can't be woken by tap / state breaks saves" — `tap()` sets state+speed unconditionally and `state` is not persisted in SavedTank (#128).
- Review gaps: GLM failed twice consecutively on #105 and #107 (HTTP 429 / timeout) — reported as gaps, not approvals.
- Cross-pass overlaps to reconcile at merge: #107 ↔ #106 (tap ripple), #125 ↔ #87 (backdrop cover-fit), #113 ↔ #109 fix/light-curve, #111 ↔ the cap idea inside the O(F·P) note, #120/#126 ↔ #103 browser menubar (complementary — button/keys vs menu bar).

## Review-response log (fifth pass)

- Applied: readonly-tuple widening + corrupt-pack try/catch + its truncated-directory test (#94); FOOD_ENTRY_Y for splash placement and the tickRipples doc fix (#129); `.finally` hint sync, frame count from the sprite module, tail-differs assertion (#131); save-field clamps (lightOverride/waterQuality/tickCount) and the falsy-zero lamp pin (#132); ambient-loop retirement + gain-node disconnect, buffer-before-context ordering, 20 ms gain ramps, 1 s clock tick, CRT-off dim scoped off Sound sliders, docOpen stand-down for bare keys (#102/#133).
- Declined with reasons: "log only when usePack accepts" (#94, twice) — a pack with a sheet always gets a slot, the guarded form and its `else` are dead code; "derive body/tail split from frame data" (#131) — the test pins a fixture's contract against its known geometry, deriving the split from the data under test would assert the data against itself.
- Stale anchors noted: several rounds re-anchored already-applied suggestions on newer commits (docOpen, Number.isFinite, wag assertion, LIGHT_NIGHT doc); verified via `original_commit_id` before acting.
- Review gaps: PR #102's first GLM run died HTTP 429 (rate limits from concurrent passes); a manual rerun completed and its findings were applied. No PR ended in an unreported gap.
- Steady state: #94 (rounds 4-5 clean), #102 (round 3 stale-only), #129 (round 2 clean), #131 (rounds 2-3 minor/stale only), #132 (rounds 2-4 minor, round 4's suggestion already present verbatim), #133 (rounds 2-3 minor, all applied). All six left open for human review per the task brief.

## Review-response log (sixth pass — Devin)

- Applied: progress-based stall timeout replacing the total-duration
  cap + host-neutral timeout wording (#134); `bandY` fallback clamped
  to the already-clamped `y`, ≥1 rounded sprite dims, `speed` floor
  0.1, shimmer-comment reword (#135); Escape `stopPropagation`,
  autocomplete/spellcheck off, forced-colors focus outline,
  `aria-live` count (#136); `audio.unlock()` before the ⌥-click early
  return, rect-delta card origin, close-box hit halo, typed
  `INFO_MOODS` (#137); standoff measured fish-to-pointer, `isPrimary`
  pointer guard, exported sim constants, `noticeFish` public so the
  test asserts identity not wander position (#138); `max=0` contract
  + test, re-import dedup splice, half-height foreground cap (#139);
  intrinsic sparkline size, all-null series guard, non-finite gap
  (#140); `-Infinity` `powerT0` sentinel, openness-keyed warm-up gain
  (#141).
- Declined with reasons: deleting empty `species` — `""` is the
  sim's unbound sentinel (`addFish` defaults it; lookups fall
  through either way) (#135); drawing pellets topmost over front
  decor — mid-water occlusion is the depth effect and pellets over
  fish bodies would read as spots (#139).
- Refuted with evidence: "the filter matches raw markup" —
  `it.inner` is the zip entry/display name rendered via
  `textContent`; there is no markup in it (#136).
- Verification confirmations (info findings): `recordInstall` →
  `saveTank` → `postState` fires unconditionally including
  reinstalls; `zipCache` evicts rejected promises via
  `p.catch(delete)`; all `sheetByPack`/`packBySheet` consumers are
  fish-only so skipping `usePack` for scenery is safe (#134); stats
  history pushes before render and stays bounded (#140).

## Review-response log (seventh pass — full-repo review)

- Applied: decor replace-on-reinstall (#99); full-sine light curve
  (#109); `unlock()` on keyboard/menu feed paths (#115); README
  version + release-script traps (#116); native Cmd/Ctrl+I prefers
  the native Import window (#119); pause sim (#123); CRT presets
  tube-key derivation from `CRT_DEFAULTS` and focus/pointerenter
  `!described` guard (#142); feed-zone hover rechecked each frame,
  `containPoint` extraction + tests, `ceil` boundary, immediate
  `pointerleave` clear, zero-area rect test (#143).
- Declined with reasons: `e.metaKey`-only import-shortcut guard
  (#119 — Ctrl+I is the dual-UI path); pause-persistence / TDZ /
  `e.repeat` concerns (#123, #115 — already handled or out of
  scope); Authentic preset aliasing `CRT_DEFAULTS` (#142 — already
  `Object.freeze`d, covered by `isFrozen` test); active-preset
  highlight (#142 — out of scope / product decision); 0/0 NaN-path
  and `feedZoneLineY` invariant pins (#143 — info-only nits after
  two consecutive rounds without important findings).
- Refuted with evidence: CRT-off preset buttons already dim via
  `osm-button:disabled` (`osmium-ui` osmium.css:263) (#142);
  `setEnabled` is typed `HTMLInputElement` and only toggles
  `.osm-disabled` on checkbox/slider ancestors — cannot take
  buttons (#142); ambient-stacks double-guard already in place
  (#115).
- Steady state: #99 round 2 clean; #109/#116 no actionable; #115
  `e.repeat` declined, otherwise clean; #119 clean after decline;
  #123 minor-only streak stopped; #142 round 3 0 actionable on
  `e7aadb6` (merge CLEAN); #143 round 3 info-only after applying
  rounds 1–2 (merge CLEAN). All eight left open for human review.

## Review-response log (eighth pass — Devin)

- Applied: junction-safe symlink, `npm.cmd` spawn + inherited stdio,
  and a non-empty `it.each` guard in the web-build test (#144);
  manifest-scoped `dims` error detail, an interior-gap `dims` test,
  and a `drawFish` placeholder fallback so an absent cell can't kill
  the rAF loop (#145).
- Refuted with evidence: "truncated `dims` packs were previously
  rejected cleanly at load" — no manifest validation existed before
  PR #145; the absent-cell `RangeError` predates the PR and is now
  cushioned (#145).
- Steady state: pending — review rounds were still in flight on
  #144–#148 when this document was merged.

## Implementation Order (suggested for future work)

1. Save schema boundary + empty-tank durability + motion-field decision (reproduced; `fish: []` repopulates starters today). Blocks honest persistence claims.
2. Scenery format contract — exporter emits RGBA, the loader only reads indexed; pick one contract + an emitter-to-browser round-trip fixture.
3. Sound persistence transaction (one readwrite txn; don't acknowledge or delete migration sources before commit) — before promising a permanent sound library.
4. Removal-vs-restore race, pack-identity sheet binding, bus authority/multi-tank boundary.
5. Remaining decoder budgets (azpack PNG bounded in #145): ZIP stored entries, BMP/FSH/BinHex expansion caps, unbounded remote downloads.
6. Pellet cap + foul-rate sanity (fish cap landed in PR #111; sim test first, TDD).
7. ~~Fish info card (data already decoded; biggest feature win).~~ Landed: PR #137; the `FsTH` names/descriptions on the card remain.
8. First-run card + starter reef bundle (hint note landed in PR #131; the curated bundle remains).
9. Small-window support floor (reproduced at 320×400 / 300×120) + viewport meta (still absent on main; open in #90/#93).
10. Scene life, one effect per PR (check other-pass branches first).
11. Sound-pane reconciliation (#101 vs #133) at merge + keep browser/native menu wiring in sync (lights L vs ⌘L, CRT C vs ⌘R).
12. Install progress/parallelism + catalogue sections rendered as they settle (the search/filter half landed in PR #136).
13. ~~Fetch timeouts + thumb queue dedupe.~~ Landed: PR #134 (stall timeout + `thumbFetching`).
14. Lifecycle stage 1 (sickness lethargy → eggs later).
15. Light dimmer + real-clock sync (lamp toggle landed in PR #132; moonlight curve in PR #113; full-sine curve landed in PR #109).
16. Food pellet animation + gravel texture (decor anchoring landed in PR #139; feed-zone cue landed in PR #143).
17. Night glow + darkened sleeping-fish sprites (sleep state landed in PR #128).
18. Screen relaxation mode, fish diary, vintage filter + adaptive murk.
19. Breeding, sprite editor, remaining delights as seasoning.
20. Merge-time reconciliations: #142 CRT presets vs any other Monitor-pane work; #143 feed-zone vs PR #106's drag path (complementary — cue vs scatter); #144's `cpSync` vs the manual `package.json` edit (confirm `dist/assets` still ships).

---

*Merged from eight review passes (prior tmp.md/swe.md files already folded above; the eighth pass's full-repo `tmp.md` folded with implemented items marked by PR). No entries removed; overlapping ideas consolidated, duplicated claims struck, and unsupported claims corrected against `origin/main` `0342fb0`. Cross-pass overlaps to reconcile at merge: #107/#106/#129 (tap ripple), #125/#87 (backdrop cover-fit), #93/#94 (multi-pack drop), #101/#133 (Sound pane), #103/#102/#126 (browser menu bar + shortcuts), placeholder-fish branches vs #131, #142 (CRT presets) vs Monitor-pane custom config, #143 (feed-zone cue) vs #106 (drag-to-feed).*
