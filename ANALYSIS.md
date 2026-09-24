# Finsical Analysis: Shovel-Ready Improvements

Consolidates nine review passes and their review-response logs into one
backlog. Completed work stays listed with its PR so later passes can
see what landed; every open idea is written so an LLM can pick it up
cold. Nothing from earlier passes was dropped: ideas were merged into
one entry per idea, and each merge is recorded in that entry's
"Merged and related" notes and in the ID map below.

## How to use this document

- Pick work from the Implementation Order at the end. Each open entry
  has an ID, a size (S/M/L effort), the verifier's severity, Value and
  Risk (1-5), then **Problem**, **Evidence** (file:line), **Change**,
  **Acceptance** and, where relevant, **Merged and related**.
- Severity (ninth-pass convention): critical = data loss, crash or
  broken core flow; high = clearly wrong user-visible behavior or a
  major performance issue; medium = real but limited; low = minor;
  nit = cosmetic; idea = improvement, not a defect.
- Before starting an entry, check the PRs named in its notes. The
  review PRs #87 through #160 were consolidated on 2026-09-24 (#161,
  #162): most "Completed" entries below are now merged, the rest were
  closed, and merged PRs may have finished some open entries.
  [FOLLOW-UPS.md](FOLLOW-UPS.md) lists every PR's outcome. Verify
  against `origin/main` before re-scoping.
- Line numbers date from before the consolidation (`3320181`, whose
  code is identical to `0499443`). The merged PRs moved much of the
  code, so find an entry's code by name. Entries carried from passes
  one to eight cite files without line numbers or with `0342fb0`-era
  numbers.
- Acceptance lines marked "(derived)" were written during this merge
  because the source gave no test; the rest come from the reviews.
  Size, severity, value and risk for entries tagged "(from passes
  ...)" are estimates made during this merge; ninth-pass entries carry
  the verifier's values.

## Baselines

- Eighth pass (full-repo review against `0342fb0`): `npm ci`,
  typecheck clean, 167 tests, `python3 -m unittest discover -s
  tools/tests` (76). Live archive.org listings return 200; test-time
  "listing 404" logs are the intentional `import.test.ts` fetch stub.
  Headless-Chromium runtime checks reproduced that pass's findings;
  AppKit, Retina GPU, VoiceOver and physical touch remain unverified.
- Ninth pass (full-repo review at `0499443`, 2026-09-23): ten
  dimension reviewers (core bugs, tank page, client windows, macOS
  shell, performance, visual and layout, UX, AquaZone fidelity,
  tooling and docs, delight) checked claims with node/vitest/Python
  snippets, Playwright screenshots against a built copy and real
  add-on packs downloaded from archive.org. An adversarial verifier
  re-checked every finding, corrected severities and proposals and
  dropped what did not hold up (see "Declined, refuted and
  corrected"); a completeness critic added the gaps. Scratch evidence
  (scripts, screenshots) lived in the review scratchpad and is not in
  the repo. Swift is compile-checked by CI on macOS only; native
  behavior claims marked "not run on macOS" are code-verified only.

## ID scheme and map

Prefixes: **B** bugs and reliability, **P** performance, **V** visual
and layout, **U** UX and convenience, **A** aesthetics and Mac OS 8
fidelity, **F** features (AquaZone fidelity), **D** delight, **S**
security and robustness, **T** tooling, tests, CI and docs. The old
categories map as: Bugs/Reliability to B and S; Performance to P;
Missing features to F; Visual/Aesthetic to V and A; UX/Delight to U
and D; Testing & tooling and Docs/packaging to T.

Ninth-pass IDs keep their numbers. Earlier-pass ideas with no
ninth-pass match took the next free number (B-52+, P-19+, V-19+,
U-25+, F-31+, D-22+, T-30+). Items with a "remainder" in their title
keep their ID and list only what is still open.

Eighth-pass shorthand used in older notes: B04 (decoder resource
budgets) is now S-02 to S-06 plus T-20; B08 (pack-identity binding) is
B-14; B14 (bus and multi-tank authority) is B-34 plus T-18.

Earlier-pass open items and where they went:

| Earlier item (passes 1-8) | Now |
| --- | --- |
| `tap()` doesn't cap bubble spawn in foul water | P-20 |
| `window.finsical.openImport` appears dead | T-30 |
| Save/load drops mid-swim fields | S-07 |
| Stats "Light: Day/Night" threshold coarse | closed by PR #155 (see ninth pass) |
| Loose-mode listings don't dedupe basenames | B-52 |
| Sim time stops when the tab is hidden | B-53 |
| DragStrip 22 px vs `TOP_CLEAR` 24 | U-18 |
| PLAN.md overclaims "mood" | T-11 |
| Drop-path vs remote stem regex | B-13 |
| `pickBackdrop` keys art by source `""` | B-13 |
| Empty-tank save repopulated (reproduced) | B-16 |
| Emitter scenery PNGs can't be loaded | B-54 |
| Persisted data needs a validated schema boundary | S-07 (with B-16) |
| Pack-owned fish inherit unrelated art (B08) | B-14 |
| Removal undone by in-flight restore work | B-38 (with B-37) |
| Local drops trail archive imports | B-13 |
| Sound persistence can lose data | B-39 |
| `tools/fetch.py` deletes output before conversion succeeds | T-19 |
| Remaining decoder resource budgets (B04) | S-02, S-03, S-04, S-05, S-06, T-20 |
| Bus messages and multiple browser tanks (B14) | B-34, T-18 |
| Stats mixes histories across tank restarts | B-55 |
| Hoist per-frame string allocations | P-19 |
| State push cadence; four windows hello-poll | P-06 |
| `swimCanvas` cache unbounded; idle pre-rasterization | P-16 |
| IndexedDB thumbs vs installed packs | B-30 |
| Sim O(F·P), pellet cap, overfeeding | P-20, U-01 |
| `saveTank` writes when clean | P-21 |
| Drop path reads every file twice | B-47 |
| Bounded thumbnail memory; cache eviction metrics | P-01 |
| Native `frames.save` per resize tick | P-22 |
| `startAmbient()` overlap | B-40, T-17 |
| Optional `fitBackdrop` helper extraction | T-31 |
| Whole JPN collection zip downloaded to list | P-05 |
| Pack decode on the main thread (Worker) | P-08 |
| Bound live memory, not just IndexedDB bytes | P-01 |
| Render catalogue sections as they settle | P-05 |
| Fish info card `FsTH` names; fish rename | F-02 |
| Lifecycle stage 1; death and hunger consequences; sickness | F-12 |
| Lighting dimmer | F-31 (real-clock sync done in PR #155) |
| More foods | F-06 |
| Starter reef bundle, first-run card | closed by PR #160 (see ninth pass) |
| Overview actions; click a fish to select; sort persistence | U-25 |
| Save slots / tank profiles | F-26 |
| About box | A-04 |
| Favicon | V-19 |
| Decor count / quantity | B-21 |
| Sound browser for game SFX | F-22 |
| Machine case thumbnails in the prefs list | U-26 |
| Specimen library; specimen cards | F-32 |
| Offline sim catch-up | F-09 |
| Empty-state first-run tour; first-run pack guidance | U-02 (remainder) |
| Water chemistry UI | F-15 |
| In-app help; keyboard help overlay; Balloon Help | A-05 |
| Per-species swim params (`FsTI`) | F-33 |
| Backdrop/gravel chooser | B-20 |
| Multi-sheet growth stages | F-11 |
| Scene life (plant sway, godrays, caustics, shadows, crumbs) | V-20 (godrays and caustics done in PR #158) |
| Moonlight leftovers (sparkles, darker sleepers) | D-01 |
| Gravel finish | V-04 |
| Placeholder thumbnail | U-02 (remainder) |
| Bubble size range | closed by PR #158 |
| `cursor: grab` in plain browsers | U-03 |
| `prefers-reduced-motion` across the CRT | U-20 |
| Eat gulp sound | D-08 |
| Pellet eaten animation | V-21 |
| Adaptive murk tint, murk shimmer | V-22 |
| Night glow, reflection layer, bezel tint, desk lamp, stars | V-23 |
| `#opentrigger` overlaps the case corner | V-24 |
| Fish pitch capped at ±45° | V-06 |
| Consistent fish scale across packs | closed by PR #149 (shared `ART_SCALE`) |
| Bright fish over bright backdrops | V-25 |
| CRT presets: lower all-day baseline | U-29 |
| Preferences fixed layout; small-window floor; Stats clipping | U-27 |
| Overview Remove without confirm | U-04 |
| Make failures and pending states visible; offline mode | U-28 |
| Native shell politeness | U-16 (done), B-28, B-50, T-32 |
| Touch trigger only on `hover: none` | U-14 |
| Right-click contextual menu | U-15 |
| Feed-zone leftovers (crumb trail, plip, long-press) | U-03 |
| Import flow progress, parallel installs, badges | U-24, P-07 |
| Touch feed-vs-tap discovery | U-03 |
| Stale badges after wake | U-12 |
| Keyboard cheat sheet | A-05 |
| Fish Diary; Tank Age milestones; anniversary line | D-22 |
| Captain's Log | F-13 |
| Feeding reminder; dinner bell and frenzy | D-15 |
| "About This Aquarium" easter egg | A-04 |
| Screensaver / relaxation mode | F-28 |
| Guppy breeding; breeding-lite | F-17 |
| Fish faces | D-24 |
| Machine-case easter eggs; activity LED | D-04 |
| Tank weather | D-25 |
| Laser-pointer toy | D-26 |
| Snail on the glass | D-12 |
| Party mode | D-27 |
| Save Picture with bezel; time-lapse contact sheet | D-09 |
| Vintage filter mode | A-02 |
| Bubble trails | D-28 |
| Feed-key plop before unlock | B-17 |
| Photobomb / perfect-water sparkle | D-29 |
| Machine switch flash or degauss | D-06 |
| Play Sound menu for imported records | F-05 (remainder) |
| Konami bonus fish; hidden credits screen | D-23 |
| Sprite editor | D-30 |
| CRT test card | D-31 |
| Arrange mode | F-04 |
| Tests: entry-bundle handlers | T-08 |
| Tests: light-curve / stats phase agreement | closed by PR #155 (re-verify on merge) |
| `import.test.ts` 404 stub noise | T-09, T-26 |
| Swift only via CI build | T-32 |
| No e2e for the bus install ack | T-06 |
| Scheduled live archive.org smoke job | T-09 |
| Portable visual-check suite | T-06 |
| CHANGELOG upkeep | T-10 |
| PLAN.md updates | T-11 |
| README version marker | done in PR #116 and PR #156 |

## Completed work

All entries are open PRs unless stated otherwise; none is merged.

### Completed (other pass, in branches)

- **Bug fix:** `core/sim.ts` `addFish()` truthy coordinate checks fixed (uses `Number.isFinite` on raw input).
- **Bug fix:** Non-primary pointer clicks now call `preventDefault()` to avoid drag interference.
- **Performance:** `swimCache` capped at 1024 with true LRU (refresh-on-hit); `thumbMemo` capped at 512.
- **Performance:** `thumbMemo` refreshes recency on hit.
- **Feature:** Named fish (`feature/named-fish`); retro names assigned at spawn, saved with tank, shown in overview.
- **Visual:** Enhanced placeholder fish (`feature/placeholder-fish`); charming pixel design with stripes, smile, tail.
- **Visual:** Bubble animation (`feature/food-animation-bubbles`); circular bubbles with transparency; food splash on eat.
- **Visual:** Light rays (`feature/light-rays-night`); drifting diagonal beams; deeper night blue.
- **Audio/UX:** Interactive machine (`feature/interactive-machine`); synthetic click tone on case press.
- **UX:** Personality hints (`feature/fish-personality`); playful status notes in Tank Overview.

### Completed (second pass, PRs open for review, all at steady state)

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

### Completed (third pass, Devin, PRs open for review)

- **PR #93** (`fix/import-shell-fixes`): viewport meta on all
  five pages (the narrow-overlay and touch paths were built for
  a viewport that never reported real width); `zipCache`/
  `pageCache`/`packCache` delete-guards so a late rejection can't
  evict a newer entry; `.fsh` drop no longer hijacks the
  backdrop; drop classification is section-aware like the
  remote-install path; fish thumbnails render a neutral drift
  pose instead of a possibly edge-on mid-roll freeze; `addFish`
  uses `=== undefined`/`Number.isFinite` so a saved `0` field
  isn't re-rolled. Review round 2: `did`/`return` import-drop
  bugs fixed (`bbe5e2b`); every dropped pack imports, and a
  rejected pack isn't counted as imported. GLM round 3 clean.
- **PR #103** (`feat/browser-menubar`): Osmium `mountMenuBar` on
  the tank page (browser only; native keeps AppKit menus) -
  Apple menu with About Finsical dialog, Tank menu exposing
  Preferences/Overview/Stats/Import/Feed/Change Water/CRT/
  Take a Picture (2x nearest-neighbor PNG download). Browser
  users previously had to type URLs for every client window.
  GLM review timed out twice; review gap, not approval.
- **PR #106** (`feat/tank-life`): tap ripple rings at the click
  point (glass-knock finally has visual feedback), ambient
  bubble vents trickling from the gravel, foul-water surface
  gasping (`bandY` biases to the surface below `QUALITY_SEEK`),
  a 1px surface line, and drag-to-feed scattering pellets along
  the drag. Review follow-ups applied through round 5: pointer
  capture + touch-action for feed drags, pointerId-scoped drag
  state, paced pellets/feed sounds, id-stable gasp slack,
  lostpointercapture cleanup, constant-derived test bounds.
- **PR #110** (`feat/fish-growth`): per-fish `scale`; juveniles
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
  pellet (settled food drains quality from tick one; it is
  waste in this model); Tank Stats button posts
  `op:"changeWater"`; native menu item bridges to
  `changeWater()` in the page. Review follow-ups applied
  (`286e9af`): op renamed for greppability, siphon docs
  corrected; "BusMsg union" and "0-fish test" findings refuted.

### Completed (fourth pass, Devin, PRs open for review)

- **PR #101** (`feat/sound-toggle`): Sound Preferences pane +
  master mute (persisted; native Tank-menu item and bare `m` key
  both work). Active Web Audio source tracking so muting also
  stops in-flight one-shots; ended-listener (not `onended`
  assignment) and normal-flow caption per review. GLM latest
  round clean.
- **PR #104** (`fix/sound-uninstall`): uninstalling an add-on drops
  its sound records from the bank; `orphanedSounds` pure helper +
  test. Provenance is recorded only after `handleSounds` succeeds,
  and restores refresh it so legacy installs self-heal. Round 2:
  `applyPack` hoisted out of `onInstall?.()`; inside the optional
  call a missing handler skipped the whole restore.
- **PR #105** (`chore/gitignore-idea`): stop tracking `.idea/`.
  GLM failed twice (HTTP 429 / timeout); review gap, not approval;
  diff is one line.
- **PR #107** (`feat/tap-ripple`): expanding ring where the glass
  is tapped (also on feed). Round: hoisted `lineWidth`, raised ring
  cap. GLM rerun failed twice; review gap. NOTE: overlaps
  other-pass PR #106's ripple; pick one at merge.
- **PR #108** (`feat/water-art`): real bubbles (highlight pixel +
  wall-clock wobble) and food flakes replace the 2x2 squares/dots.
  Round: wobble phase hoisted to once-per-frame + named constants.
- **PR #111** (`feat/fish-cap`): tank capped at 24 fish; install
  refused with a friendly "Tank is full" (spawnFish only fails at
  the cap; verified). Round: shared drop-spawn helper deduped.
- **PR #113** (`feat/night-mode`): full-sine light curve with a
  real ~36% dark valley (the old half-wave dipped below 0.5 for
  ~18%) + deep-blue night tint. Tests pin night fraction 30–45%
  and the 0.65 daylight mean at precision 5.
- **PR #117** (`fix/install-again-queue`): every "Add again" click
  queues per-URL and replays serially (was silently dropped while
  an install was in flight); a failed install drops its queue.
  Rounds: drain made iterative, then flat + rejection-proof -
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
- **PR #121** (`fix/drop-fallback`): drops work in Firefox; falls
  back to flat `dataTransfer.files` when `webkitGetAsEntry` is
  absent; the FileList is copied into a real array before the async
  walk (live FileLists are only guaranteed valid during dispatch).
- **PR #122** (`fix/restore-retry`): failed launch restores retry
  at 15 s/60 s in the background (was: art-less fish all session);
  rejected retries logged; when retries exhaust while offline a
  single deduped `online` listener arms one fresh round.
- **PR #124** (`fix/local-drop-persist`): dropped fish packs
  persist under `local:` keys in IndexedDB (excluded from LRU
  eviction; they're user data, not cache), so they survive
  relaunch like installed add-ons; shared `LOCAL_PREFIX`/`isLocalPack`;
  writes awaited with quota warnings; scenery-only packs no longer
  block later fish files in the same drop.
- **PR #125** (`fix/backdrop-cover`): backdrop cover-fits (crops,
  never stretches a non-1.6 source) and pre-scales once per pack -
  `render()` is a 1:1 blit. Cache keyed on identity + dimensions.
  NOTE: overlaps other-pass PR #87; pick one at merge.
- **PR #126** (`feat/browser-shortcuts`): `o`/`p` open Overview/
  Preferences in browsers (the `s`→stats pattern generalized via a
  COMPANIONS table); editable-target guard so future text fields
  don't fight bare letters.
- **PR #127** (`feat/empty-tank`): Overview "Empty Tank"; removes
  every add-on and fish, keeps prefs/water/sound bank. In-page
  two-click arm ("Really empty?") because `confirm()` silently
  returns false in the WKWebView shell; tank epoch discards installs
  that were fetching at the wipe (checked twice; before apply and
  before `recordInstall`); disarm on empty + 350 ms anti-double-
  click beat; red danger styling.
- **PR #128** (`feat/sleepy-fish`): new `sleep` state; after the
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

### Completed (fifth pass, PRs open for review, all at steady state)

- **PR #94** (`fix/multi-pack-drop`): a multi-file drop of pack
  containers imports *every* decodable pack; the inline loop
  `return`ed after the first success whenever any earlier sheet
  existed. The pass now lives in `web/drop.ts`
  (`decodeDroppedPacks`, red-green regression test), reads each
  file once (the sound pass collects pack candidates via the head
  it already slices), skips packs that throw mid-decode (corrupt
  file cannot cost the rest of the drop; pinned by a truncated-
  directory test), and warns only when nothing at all landed.
  Overlaps the round-2 fix inside PR #93; pick one at merge.
- **PR #102** (`feat/web-menubar-bar`): a Mac OS 8 menu bar for
  the browser shell (never mounted in native; AppKit owns that):
  Tank / Window / Help menus plus an app-glyph menu (About
  Finsical window, Shortcuts window, donate, archive.org links)
  and a System 8 clock that repaints per second and on
  visibilitychange. `openClientWindow` generalizes the stats-tab
  focus/reuse dance for Preferences, Tank Overview and Tank Stats,
  fixing the browser dead end where both were native-menu-only.
  Bare keys (F/C/S) stand down while a menu or doc window is open.
  Overlaps #103 (their menubar: also adds Change Water/Take a
  Picture) and #126 (o/p keys); complementary; reconcile at
  merge.
- **PR #129** (`feat/water-feedback`): tap ripples and feed
  splashes as whole-pixel effects ticked on the 30 tps sim clock
  (`web/fx.ts`, tested): double-pulse ring where the glass is
  knocked, three ballistic droplets where food (or a newly
  installed fish) enters at `FOOD_ENTRY_Y` (exported from the sim
  so the splash sits where pellets actually spawn). Overlaps
  #106/#107; three ripple PRs now; pick one at merge.
- **PR #131** (`feat/first-run-hint`): a raised-Platinum first-run
  note at the foot of the tank pointing at Import Add-ons (auto-
  hides on the first install; dismissed once, never returns) and a
  hand-drawn 24x14 pixel guppy placeholder with a two-frame tail
  wag replacing the colored rectangles (grid integrity, body-
  still and tail-wags assertions via `spriteSvg`). Overlaps the
  other placeholder-fish branches; reconcile at merge.
- **PR #132** (`feat/tank-lights`): lamp toggle; off pins the
  tank at `LIGHT_NIGHT` (the cycle's own night floor), on restores
  the automatic cycle; bare L, native Tank > Toggle Lights
  (window.finsical.toggleLights), persisted in the tank save with
  finite/clamped restores (tickCount and waterQuality gained the
  same hardening); Tank Stats' Day/Night follows the same push.
  Partially lands the "Lighting switch" item below; dimmer and
  real-clock sync remain open.
- **PR #133** (`feat/sound-controls`): Sound pane in Preferences -
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
  pane: mute + active-source tracking); reconcile at merge; the
  volume-slider half of the open item below lands here.

### Completed (sixth pass, Devin, PRs open for review)

- **PR #134** (`fix/import-reliability`): every fetch runs under a
  stall timeout; 30 s without body progress aborts, so
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
  swims); saved fish fields sanitized; finite+clamped numerics,
  `bandY` falls back to the clamped `y`, invalid `sheetIdx`/`pack`/
  `id` dropped rather than zeroed, `speed` floor matches `cruise`;
  `visibilitychange → hidden` saves so native quit can't lose the
  last ≤10 s; menu feed drops at a random x. Declined: deleting
  empty `species`; `""` is the sim's own unbound sentinel.
- **PR #136** (`feat/import-filter`): substring filter field in the
  add-on browser header; case-insensitive, scoped to the current
  section, "N of M" count, Escape clears the field without closing
  the panel, filter survives section switches. Review round 2
  applied: `stopPropagation` on Escape, autocomplete/spellcheck
  off, forced-colors focus outline, `aria-live` on the count.
  Refuted: "inner is HTML markup"; it is the zip entry name
  rendered via `textContent`.
- **PR #137** (`feat/fish-get-info`): ⌥-click a fish for a
  Mac-style Get-Info card that tracks it as it swims; species,
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
  to look; hunger and panic outrank curiosity. Review round 2
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
  stacking. Declined: drawing pellets topmost; mid-water occlusion
  by foreground plants is the depth effect (intent pinned in a
  comment).
- **PR #140** (`feat/stats-sparklines`): inline 44×14 1-bit
  sparklines for water quality and hunger beside each meter -
  newest sample right, per-column gaps for missing data, text and
  progress-bar accessibility untouched. Review round 2 applied:
  intrinsic canvas size (no CSS w/h, so a border-box reset can't
  squeeze the columns), an all-null series skips the framed blank,
  and non-finite samples gap like nulls. Verified: history push
  precedes render; age+count trims keep it bounded.
- **PR #141** (`feat/crt-poweron`): a `uPower` shader uniform plays
  a ~450 ms tube warm-up on every enable; a bright center line
  opens into the full raster while the whole raster squeezes into
  the band; the brightness boost keys to raster openness so total
  emitted light stays roughly constant (no mid-animation flash);
  skipped under `prefers-reduced-motion`. Review round 2 applied:
  `powerT0`'s sentinel is `-Infinity` (0 meant page-load time; a
  pre-enable frame could play a stray warm-up).

### Completed (seventh pass, full-repo review, PRs open, all at steady state)

- **PR #99** (`fix/decor-reinstall`): "Add Again" on a
  plants/accessories pack no longer stacks a duplicate; `addDecor`
  replaces that pack's frames instead of always pushing. GLM round 2
  clean (0 actionable).
- **PR #109** (`fix/light-curve`): full-sine light curve so a
  `DAY_TICKS` cycle includes a sustained night near the 0.3 floor;
  stats Day/Night tracks the same threshold the render uses.
- **PR #115** (`fix/audio-unlock`): first feed/tap from keyboard or
  menu unlocks `AudioContext` the same way a click does (`unlock()`
  called from those paths; `e.repeat` guard so held keys don't spam).
  Declined: ambient-stack re-entry double-guard (basis of prior
  refusal; `unlock()` already idempotent).
- **PR #116** (`docs/readme-version`): README version marker kept in
  step with `package.json`/`Info.plist` (release script notes;
  EXIT/signal traps so a failed bump doesn't leave a half-written
  README). Tip `ce14382`. 0 actionable.
- **PR #119** (`fix/native-import-shortcut`): in the native shell,
  Cmd/Ctrl+I opens only the native Import window; the page overlay
  no longer competes when a WKWebView menu already owns the shortcut.
  Declined: `e.metaKey`-only guard (Ctrl+I is the actual dual-UI
  path; meta-only would leave the reported bug).
- **PR #123** (`feat/pause-sim`): pause freezes `tick()` while
  render continues (screenshots/benchmarks); Tank menu + bare key;
  pause-persistence, `e.repeat`, and TDZ findings declined with
  reasons. Streak >2 minor-only rounds → stopped.
- **PR #142** (`feat/crt-presets`): named `CrtConfig` bundles in the
  Monitor pane; Authentic, Sharp, Soft, Pixel Perfect; frozen via
  `CRT_PRESETS`, applied by dropping any pending custom config and
  posting the full preset; disabled with the CRT-off checkbox;
  balloon captions clear when a slider takes over. Round 1: tube-key
  list derived from `CRT_DEFAULTS` minus picture keys; focus handler
  guards `!described` like pointerenter. Round 2–3: Authentic aliasing
  declined (`CRT_DEFAULTS` already frozen + `isFrozen` test); CSS dim
  and `setEnabled` claims refuted (`osm-button:disabled` dims;
  `setEnabled` is `HTMLInputElement`-only). 0 actionable on `e7aadb6`.
- **PR #143** (`feat/food-zone`): feed-zone cue; pure
  `web/feedzone.ts` (`FEED_ZONE`, `isFeedZoneY`, `containPoint`,
  `feedZoneLineY`), crosshair + bright 1px boundary under the pointer
  (rechecked each frame from the last client point so resize can't
  strand the state; cleared immediately on leave). Round 1–2: hover
  moved to `render()`, letterbox math extracted + tested, boundary
  `ceil`, zero-area rect covered. Round 3: 0/0 NaN path + line
  invariant pin declined as info-only nits after two clean rounds.

### Completed (eighth pass, Devin, PRs open for review)

Eighth-pass baseline: `origin/main` `0342fb0`. Findings were verified
against main itself, not against historical branch claims.

- **PR #144** (`devin/complete-web-artifact`): the standalone web
  build copies `web/assets/` into `dist/`; every machine case image
  404'd in the production artifact (native packaging copies assets
  separately in `macos/Makefile`). `scripts/web-build.test.mjs`
  builds a temp fixture and pins each image-backed machine's bytes.
  GLM round 1 minor-only (junction-safe symlink, `npm.cmd` spawn +
  inherited stdio, non-empty `it.each` guard); applied. NOTE: the
  `cpSync` line was later removed from `package.json` by a manual
  user edit; confirm the build still ships `dist/assets` at merge.
- **PR #145** (`devin/validate-imported-art`): untrusted azpack art
  is validated before rendering; a 2^26-pixel budget is checked
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
  still of the tank; aperture backplate, water gradient, gravel,
  three placeholder swimmers, bubble trail; under the shell art in
  the prefs machine picker, so cases preview as running aquariums
  and Bare tank as plain water. Shell art stays on top so baked-in
  reflections remain; no extra render loop or fetch. Verified
  visually across all 11 cases.
- **PR #148** (`devin/stale-food-seek`): a fish exits `seek` when its
  food vanishes (eaten by another fish, rotted, or water below
  `QUALITY_SEEK`); Overview/Stats no longer report "Looking for
  food" for behavior that isn't happening. Regression tests cover
  the eaten-target and foul-water paths.

### Completed (ninth pass, PRs open for review)

Ninth-pass baseline `0499443` (code-identical to `origin/main`
`3320181`). Each PR is one branch cut from `origin/main`, left open
for the maintainer. IDs refer to the ninth-pass review; round counts
and declines are in the ninth-pass review-response log.

- **PR #149** (`claude/adult-fish-art`, B-01, V-10 fish part): pure
  `pickSwimSheet` (`core/data/swimsheet.ts`: among max-group sheets
  the largest cell, pack order on ties) used by the tank, the Import
  preview, its list and the Overview thumbnails, in the level
  right-facing profile; stored list thumbnails moved to a new key so
  cached fry art redraws. Shared `ART_SCALE` (half size, art was
  painted for 640x480) with an area-weighted box-filter shrink
  (`web/artscale.ts`); the renderer reports each fish's drawn
  half-extent to the sim (wall clamps, mouth-point bubbles). Round 1
  applied: eat reach uses the clamp's `EDGE_KEEP` factor so fish with
  halfH > 40 reach settled food (test); round 3 applied: a wide fish
  also reaches a pellet against the side glass (test). Not included: B-01's `baby`
  return value (needed by F-11), V-10's scenery and decor thumbnail
  parts (V-10 remainder).
- **PR #150** (`claude/mace-tables`, B-02, T-03 MACE part): FFmpeg's
  per-position MACE 3:1 tables (MACEtab3/MACEtab4 for the 2-bit
  middle code) in both ports; `core/data/mace.ts` with an SPDX
  LGPL-2.1-or-later header, `tools/az/mace_tab4.bin` sha256-pinned,
  `THIRD_PARTY_NOTICES.md` naming FFmpeg plus LGPL section 4 relink
  instructions; new goldens from a line-by-line port of FFmpeg's
  `read_table`/`chomp3`, cross-checked against stock ffmpeg 7.0.2;
  DC-drift bound test. CHANGELOG tells users to re-drop imported
  sounds (stored decoded). Overlaps nothing open.
- **PR #151** (`claude/client-windows-front`, B-05, U-17, B-26,
  B-24): `showClient` gives client windows the tank's level, places a
  first-opened window beside the tank and moves it to the active
  Space; `TankWebView`/DragStrip `acceptsFirstMouse` so the first
  click feeds or taps; Cmd-I in the native shell no longer opens the
  in-page overlay. B-24 overlaps open PR #119 (same fix, seventh
  pass): pick one at merge.
- **PR #152** (`claude/mac-menus`, U-05, U-16, U-19): About, Hide
  (Cmd-H), Hide Others, Show All, Services and a Help menu; CRT item
  checkmark; Window menu toggles "Float Above Other Windows" and
  "Show on All Desktops" (persisted); Cmd-W no longer quits from the
  tank.
- **PR #153** (`claude/render-on-tick`, P-03, P-13, S-01 part): the
  tank and CRT draw only on frames where a sim tick ran (plus CRT
  enable/reconfigure and resize), pure `planFrame()` in
  `core/loop.ts`, bubble sound decided per tick; `TankAudio.setHidden`
  suspends the context while hidden; `frame()` schedules the next
  rAF first and a sheet that throws is logged once and drawn as the
  placeholder from then on. Round 1 applied: `unlock()` skips resume
  while hidden. Overlaps open PR #146 (render-on-tick, eighth pass)
  and PR #145's `drawFish` fallback: pick one at merge.
- **PR #154** (`claude/calmer-fish`, B-03, B-07, B-08, B-10, B-31,
  B-32): seekers re-arm the stroke and hold a floor above the pellet's
  sink rate; strokes continue toward the same target instead of
  re-rolling every second; facing hysteresis and `maybeTurn` after
  eating; opportunistic eating and hungrier newcomers; startle speed
  clamped with wall bounce; `seek` clears when the pellet is gone;
  sim constants shared through `core/tuning.ts`. Round 1 applied:
  ahead-mirror onto a wall (test). B-32 overlaps open PR #148.
- **PR #155** (`claude/day-night-clock`, B-09, F-08): `core/light.ts`
  trapezoid day on a virtual clock (about 47% night, smooth ramps,
  tick 0 mid-morning); night drawn as a multiplied moonlit blue with
  lifted shadows, warm dawn/dusk tint; Preferences Lighting pane with
  a light timer on the Mac's clock (on/off hours, 30-minute fades,
  nights held at `CLOCK_NIGHT_LIGHT = 0.45`, a moonbeam scaled by the
  real moon phase); the page hands light to the sim via `setLight()`
  so the sim stays tick-only; the fast demo cycle stays default;
  Stats names the next switch in timer mode. Round 1 applied: caption
  kept while the Lighting pop-up is open. D-01 was planned for this
  branch but not included. Overlaps open PRs #109/#113 (light curve,
  night tint) and #132 (lamp toggle): reconcile at merge.
- **PR #156** (`claude/readme-guide`, T-01, T-02, T-03, T-04): README
  sections for download and first launch (macOS 15 Gatekeeper "Open
  Anyway", xattr alternative with a caveat, arm64-only note),
  controls, add-ons, windows, stored data, building, credits
  (AquaZone's makers, the Internet Archive items), an Apple trademark
  note, case-art provenance and "the Unlicense covers Finsical's code
  only"; version marker corrected to 0.3.0, `release.sh` rewrites and
  commits it and prints the publish command, `scripts/check-version.mjs`
  runs in core-linux CI and `release.sh`; `from __future__ import
  annotations` in `tools/tests/test_snd.py` and the supported Python
  stated in tool docstrings. Round 1 blockers refuted, xattr caveat
  applied. Not included: publishing the draft release (maintainer
  action, T-33), the optional notarization step (T-02 remainder),
  T-03's in-app credits (T-03 remainder), T-04's CI Python matrix
  (folded into T-14). Overlaps open PR #116 (README version marker,
  release traps).
- **PR #157** (`claude/animated-decor`, F-03, B-22, V-02):
  `pickDecorFrames` (largest group of at least three same-size,
  same-key frames, fallback to the largest keyed image,
  border-majority key when art covers a corner); decor loops its
  frames at 10 fps on the sim clock with a per-item phase hashed from
  URL and copy number, capped at 16 frames, built once; all decor at
  `ART_SCALE` clamped only by tank height, shrunk with the shared box
  filter (`decorCanvases`, `decorScale` in `web/render.ts`). Overlaps
  open PR #139 (decor depth, multi-frame `pickDecorArts`) and #99.
- **PR #158** (`claude/living-water`, A-01, V-11, V-12):
  `web/water.ts`: wobbling bubbles growing from 1 px to a 4 px ring
  and popping at a faint surface line with a travelling glint; sun
  shafts and two counter-scrolling caustic tiles scaled by daylight;
  Feed Fish scatters a pinch of 3-5 pellets that sway as they sink,
  drawn as shaded nuggets and tumbling flakes (a surface click still
  drops one); murk eases in by smoothstep from q 0.7 as a green-brown
  wash thickest at the gravel with drifting debris below q 0.5; all
  held still under reduced motion (round 1 added the murk debris); sim exports `SURFACE` and
  `BUBBLE_RISE`. Overlaps open PRs #106 (surface line, vents), #108
  (bubble art) and #135 (random-x menu feed).
- **PR #159** (`claude/sound-prefs`, F-05 part, B-45): one master
  gain for every sound, volume, mute, bubble and ambience switches,
  `sanitizeSoundConfig`, `finsical:sound` persisted and in the state
  push, bus op `soundConfig`; a fourth Preferences pane "Sound"
  (Monitors & Sound layout); Tank > Mute Sound (Opt-Cmd-S) and the
  bare M key; install feedback keeps one tracked source, fades out
  records longer than 4 s and is skipped while the context is locked;
  the Import Add-ons window pauses its preview when hidden; round 1
  applied: level changes glide (10 ms) instead of clicking, and the
  slider reads "Muted" to screen readers. B-17 was
  planned for this branch but not included. Overlaps open PRs #101
  and #133 (two earlier Sound panes): three Sound panes now exist,
  reconcile at merge.
- **PR #160** (`claude/welcome`, U-02 points 1-3 and 5, D-07):
  `web/alert.ts` (Mac OS 8 alert from Osmium parts, 32x32 note and
  caution sprites, Return/Escape, scrim), a first-run "Stock the
  Tank" offer (`finsical:welcomed`) that resolves a ~1 MB starter set
  (three fish, a gravel, a plant, a background; `web/starter.ts`)
  against the live listing and installs it with determinate progress,
  removing the stand-ins once a real fish is in, with a caution alert
  and Try Again on failure; `remoteInstall` became `installAddon`
  (joins an in-flight request for the same add-on); `listAddons` can
  list a subset of collections; the bundled pack's manifest 404 is
  logged as info; `web/scold.ts` shows "Please don't tap on the
  glass" after six taps within 8 s, at most once per 30 minutes.
  Round 1 applied: key bindings no longer pile up on progress
  updates, an accessible name, tall alerts scroll, Escape answers the
  glass-tap OK, duplicate installs ack the in-page window.

Optional follow-ups proposed with implemented items but not included
in their PRs (each is carried in the open entry named):

- B-01: use ELRA/ELRB at the species base id once F-01 exists (F-01);
  return a `baby` sheet (F-11).
- B-02: an optional `tools/tests/gen_mace_vectors.sh` wrapping bytes
  in an AIFF-C 'MAC3' file and decoding with real ffmpeg (T-07).
- B-05 and U-17: optional `level` and `collectionBehavior` fields on
  Osmium's `OsmiumWindowSpec` upstream (Design notes).
- B-26: a "desk toy" `NSPanel` with `.nonactivatingPanel` so tapping
  never steals focus (F-28).
- P-03: a Low Power Mode hook and Energy preference (P-23); gate the
  frame skip on Classic if P-09's Smooth mode lands (P-09).
- P-13: an optional `BackgroundSound { Pause, Keep }` preference (P-23).
- A-01: an "Animated water" preference (V-20); skip the effects in
  A-02's Black & White depth (A-02).
- V-12: a dithered algae vignette at the glass edges below q 0.3, not
  mentioned in PR #158's commits (D-12).
- F-03: after F-01, frames = ACPC ids base..base+AccI.u16@10-1;
  optional ping-pong for plants if a seam shows (F-01).
- F-08: Stats wording such as "Night, waxing gibbous" (F-31).
- Review follow-ups (small, no separate entry; each is S size and
  self-contained):
  - PR #149: set a fish's `halfW`/`halfH` when it binds to its sheet
    (usePack assignment, new-fish path) instead of in `drawFish`, so
    the sim never runs a tick on stale extents and headless use
    matches the tank. Acceptance: extents exist before the first
    `Sim.tick()` after a pack install (unit test on the binding
    helper).
  - PR #159: a checkmark on Tank > Mute Sound (and on Toggle CRT
    Effect, which PR #152 adds): the page's state push carries
    `muted`; Swift keeps the item and sets `state`. Acceptance: the
    checkmark follows M, the Sound pane and Opt-Cmd-S, and is right
    at launch with a persisted mute.
  - PR #159: Import Add-ons previews follow the Sound pane's volume
    and mute (they play through their own `<audio>` element). Read
    `finsical:sound` at play time, or route it over the bus if the
    WKWebView pages do not share storage. Acceptance: a muted tank
    previews silently.
  - PR #160: `web/starter.test.ts`'s last assertion restates
    `starterCollection`'s own filter; replace it with a check that
    `starterCollection` rejects a synthetic nested collection.
- D-07: optional `sim.fearAt = {x, y, until}` so `decide()` rerolls
  targets within 40 px of a knocking spot for a minute (D-02).

Done by other sessions (PRs #87-#90, second pass, listed above): the
ninth-pass items that duplicate them are treated as done: V-01
(backdrop cover-crop, also PR #125), the buffer-cap half of P-10
(PR #88), V-17's viewport meta (PR #90, also PR #93; its favicon half
is V-19) and U-20's accessible tank name (PR #90). Concurrent sound
decoding (PR #89) has no separate ninth-pass entry.

Ninth-pass top picks, with status: B-01 (PR #149), B-05 (PR #151),
T-01 (PR #156; publishing is T-33), B-03 (PR #154), B-02 (PR #150),
B-04 (open), P-02 (open), F-03 with B-22 (PR #157), V-01 (PR #87/#125),
V-02 (PR #157), B-06 (open), B-24 (PR #151), B-26 (PR #151), B-10
(PR #154), P-03 (PR #153).

Closed from the open lists during this merge (no separate entry):

- Starter reef bundle and first-run card: PR #160's Stock the Tank.
- Bubble 1 px size range: PR #158 (bubbles grow from 1 px to 4 px).
- Consistent fish scale across packs: PR #149's shared `ART_SCALE`
  keeps the packs' authored relative sizes.
- Stats Day/Night threshold and the light-curve/stats agreement
  test: PR #155 pushes the light the renderer uses, Stats keeps
  `light > 0.5`, which now falls inside short smooth ramps, and
  statsmodel tests were added; re-verify after any further light
  change (and keep D-01's sleep threshold consistent with it).
- Real-clock day/night: PR #155 (F-08). The dimmer stays open (F-31).

## Bugs and reliability (open)

Done this pass and removed from this list: B-01, B-02, B-03, B-05,
B-07, B-08, B-09, B-10, B-22, B-24, B-26, B-31, B-32, B-45.

### B-04 Multi-pack fish add-ons all turn into their last species after relaunch

Size M · Severity high · Value 5/5 · Risk 3/5

**Problem.** One add-on zip can hold several sheet-bearing packs (angels.zip = angel.fsh + blackangel.fsh; tama.zip has 3 colours; disc addon2 has 3; goldfish addon has 5). handleSheets runs once per pack with the same `url` and overwrites `sheetByPack.set(url, idx)`, so only the last slot survives. During the session fish keep their own sheetIdx, so it looks right. On the next launch remapSheetIdx rebinds every fish with `f.pack === url` to that last slot, permanently. All fish of such an add-on are also named after the zip ('angels' twice), so Overview and Stats cannot tell them apart. 17 of 88 archive.org fish add-ons are affected.

**Evidence.** `web/main.ts:253-270` (handleSheets), `web/main.ts:275-295` (remapSheetIdx), `web/main.ts:631-635` (remoteInstall loop), `web/import.ts:318-364` (PackResult, importAddon), `web/import.ts:1083-1097` (applyPack), `web/overviewmodel.ts:66`.

Playwright: install angels.zip; saved roster sheetIdx [4:0, 5:1]; after reload and the 10 s save [4:1, 5:1], both thumbnails identical.

**Change.**

1. Add `entry: string` to PackResult (basename stem of RawBlob.name), filled in importAddon; pass it through ImportHandlers.onSheets and remoteInstall. Key parts by entry name, not array position.
2. Store it on Fish as optional `packPart` (persisted in saveTank, set in spawnFish). Replace `sheetByPack: Map<url, slot>` with `Map<url, Map<part, slot>>` (nested maps, not '#'-joined strings, since URLs already contain '#'); packBySheet becomes slot -> {url, part}.
3. When more than one usable result has sheets, name each fish by `r.entry` ('angel', 'blackangel'); single-pack add-ons keep `it.inner`. URL identity is unchanged, so removal still matches by `f.pack === url`.
4. Legacy migration (recovers rosters already collapsed by this bug): for fish with `pack` but no `packPart`, sort same-pack fish by id and assign parts in the add-on's entry order, cycling; the original install spawned them in part order with ascending ids.
5. removeAddon deletes every part's slot and packBySheet entry; addonThumb uses the first part.
6. Put `resolveSlot(fish, bindings)` and `migrateParts(fishOfPack, entries)` in a pure `web/tankmodel.ts`.

**Acceptance.** Vitest: two parts with two fish each keep their parts; a legacy pair maps to parts [0,1]; a missing pack returns undefined. Playwright: install angels, reload, saved sheetIdx stay distinct and rows read 'angel'/'blackangel'.

**Merged and related.**

- Related: B-14 and B-15 share the pure `web/tankmodel.ts`; B-23 (tank presets feed the same pool).
- PR #149 (open) replaced usePack's comparator with `pickSwimSheet`; key each part's slot to the sheet it picks.

### B-06 The release binary is arm64-only although Info.plist promises macOS 12 (which runs on Intel)

Size S · Severity high · Value 4/5 · Risk 2/5

**Problem.** The binary contains only the build host's architecture and releases build on an Apple-silicon runner. Intel Macs on macOS 12-15 get 'not supported on this type of Mac'. No lipo step exists and CI never checks architectures. The minos check would also break on a fat binary (vtool prints one `minos` per slice).

**Evidence.** `macos/Makefile:39-41` (swiftc `-target $(shell uname -m)-apple-macos12.0`), `macos/Makefile:44-50` (minos check), `macos/Makefile:52` (codesign), `.github/workflows/release.yml:18` (`runs-on: macos-15`, arm64), `macos/Info.plist:19-20`.

**Change.** Add `ARCHS ?= arm64 x86_64` to the Makefile. Loop `for a in $(ARCHS); do swiftc -O ... -target $$a-apple-macos$(MACOS_MIN) -o $(APP).staging/Finsical-$$a $(SOURCES) || exit 1; done; lipo -create -output $(APP).staging/Contents/MacOS/Finsical $(APP).staging/Finsical-*; rm $(APP).staging/Finsical-*`. Run the minos check per arch with `vtool -arch $$a -show-build ... | awk '$$1=="minos"{print $$2}'`. Codesign after lipo. In ci.yml's native-macos job, assert `lipo -archs .../Finsical | tr ' ' '\n' | sort | tr '\n' ' '` equals `arm64 x86_64 `; the SWIFT_VERSION=6 step may pass `ARCHS=arm64`. If Intel is deliberately unsupported, say 'Apple silicon required' in README and CHANGELOG instead.

**Acceptance.** (derived) CI's native-macos job asserts `lipo -archs` equals `arm64 x86_64`; the per-arch `vtool` minos check passes; a manual launch on an Intel Mac works, or README and CHANGELOG say "Apple silicon required" instead.

**Merged and related.**

- PR #156's README now states that the release binary is arm64-only; update README and CHANGELOG when this lands.

### B-11 Fish add-ons with no usable sprites still report 'Added to the tank'

Size S · Severity medium · Value 4/5 · Risk 1/5

**Problem.** Any result with images counts as usable. For the fish section nothing is drawn, yet the install is recorded, restored every launch and listed as 'Fish add-on, In tank'. Affected: 'arow addon1' (aw*.rez hold BMP frames only; its Arowana.dna duplicates Medaka art), 'pleco' (no sprite stream), 'pleco addon1/2/3' (BMP frame runs), and 'updatedAZfiles' (AquaZone .exe/.dll/.rez program updates; its two Aquazone.rez copies spawn two fish named 'updatedAZfiles'). The detail pane even calls 'arow addon1' '7 packs, scenery.' This violates the repo rule never to report a skipped operation as successful.

**Evidence.** `web/main.ts:318-330` (handleImages drops fish-section images), `web/main.ts:619-646` (remoteInstall records success when only images decoded), `web/import.ts:309-315` (fetchInnerBlobs), `web/import.ts:793-859` (showDetail), `web/import.ts:1083-1098` (applyPack), `web/import.ts:520-529` (loadProblem).

**Change.** (1) In showDetail, applyPack and remoteInstall, when `it.section === 'fish'` and no usable PackResult has sheets, throw `new Error('no fish sprites')`, skip recordInstall/markInstalled, keep Add disabled, and map it in loadProblem to 'This fish add-on has no sprites Finsical can read yet.' (2) Add optional `hide?: RegExp` to Collection and hide `/^updatedAZfiles$/`. (3) Word the count as '1 fish' / '3 fish' for the fish section. Do NOT add `.dna` to PACK_EXT here (Arowana.dna's art is byte-identical to Medaka.dna and medaka.fsh). Follow-up (L): build sheets from BMP-frame packs (aw*.rez: runs of 100x40/75x40/40x27; PC0*.rez: 55xN runs of 20).

**Acceptance.** Tests (import.test.ts): a fish PackResult with images only is rejected with the message and not marked installed; listCollection's hide filter; a loadProblem case.

**Merged and related.**

- Related: U-06 ('No fish' status), F-23 (`.dna` only with a duplicate-art check). Refuted: adding `.dna` to PACK_EXT (see "Declined, refuted and corrected").

### B-12 Six gravel add-ons install as a silent no-op

Size S · Severity medium · Value 3/5 · Risk 1/5

**Problem.** bluesand, matteblack, redpebble (372-374x208, white-topped strips), clear (fully key colour), greensand (unkeyed 373x209 opaque texture) and lowfront (two all-key 50x50 images) have no image passing the strip test, so nothing changes, yet the panel says 'Added to the tank.' and Overview lists them.

**Evidence.** `web/main.ts:184-194` (pickGravel requires w >= 3h and w >= 160), `web/main.ts:321-332`, `web/main.ts:1078-1084`, `core/data/decor.ts:21-29`, `web/import.ts:1083-1111`.

**Change.** Add a pure `opaqueBounds(img, key)` to `core/data/decor.ts` (tight rect of non-key pixels, or null). In pickGravel, crop each candidate with a uniform corner key to its opaque bounds before the aspect test (rescues bluesand, matteblack, redpebble as ~372x83; mirror-tile to TANK.width). A pack whose only image is 100% key (clear) means a bare glass floor: set gravelCv = null for that src. An unkeyed ~16:9 texture (greensand) becomes a strip from its bottom 40% rows. Otherwise (lowfront) handleImages returns false and install reports 'This gravel has no floor art Finsical can use.' without marking it installed.

**Acceptance.** Tests in decor.test.ts: opaqueBounds on a 372x208 fixture with blank top returns y 125..207; an all-key image returns null; pickGravel on the greensand-like fixture yields a strip.

**Merged and related.**

- Related: V-04 (gravel prescale and `floorFor`); land together or B-12 first.

### B-13 Dropping raw packs: only the first imports, scenery is ignored, fish portraits replace the backdrop

Size M · Severity medium · Value 3/5 · Risk 2/5

**Problem.** (a) The loop returns after the first file with sprite sheets, so a multi-file drop imports one fish. (b) Packs without sheets are skipped, so dropped .grv/.plt/.acc/.azn do nothing and then log the misleading "no manifest.json, pack file, or 'snd ' found". (c) It calls `pickBackdrop(packImages(data))` on fish packs, which the archive path deliberately never does: a 196x146 catalog portrait passes pickBackdrop's thresholds and fills the tank (blackmoor, comet, ryukin), and 180x35 banners (copperband, queen angel, shark) can replace the gravel. Raw drag-and-drop is undocumented, hence medium.

**Evidence.** `web/main.ts:983-999` (raw-pack drop loop; `continue` at :990, pickBackdrop at :992, early `return` at :993-996), `web/import.ts:346-365` (importAddon per-blob branch).

**Change.** Export `decodeBlob(name, data): PackResult | null` from import.ts (isPack gives fshToSheets plus packImages, isBmp gives decodeBmp). Add a pure `sectionFor(result, name)`: non-empty sheets means fish; else by extension .grv gravel, .plt plants, .acc accessories, .azn tanks, .bmp backgrounds; a sheet-less .rez goes to backgrounds only if it has a backdrop-sized image (.rez is used for every type in the JPN set). In the loop call `handleSheets(r.sheets, stem, src, section, true)` and `handleImages(r.images.values(), src, section)` for every file with no early return; fish packs never touch backdrop or gravel. Use src '' (the existing bundled/dropped convention) until B-14's persistence exists. Log one summary at the end and warn only when nothing was usable.

**Acceptance.** Tests: vitest for sectionFor; Playwright drop of blackmoor.fsh + GoldFish.fsh gives 2 fish and an unchanged backdrop.

**Merged and related.**

- Merged from pass 8 ("Local drops still trail archive imports"): the target is one classified import path for archive and local sources, with stable local IDs, durable local bytes outside cache eviction, per-file failure isolation and an import summary (U-10).
- Merged from passes 1-7 ("`pickBackdrop` keys art by source"): the key is `""` for both bundled and dropped packs, so a drop silently rebinds the bundled art and `removeAddon` can never restore it. The earlier fix was synthetic source keys (for example `local:<hash>`); this entry's interim `src ''` convention keeps the bug, so prefer synthetic keys when B-14's local persistence lands in the same series.
- Merged from passes 1-7 (stem logic): the drop path uses `name.replace(/\.[^.]*$/, "")` and the remote path `replace(/\.[^.]+$/, "")`; use one shared stem helper so they cannot diverge.
- Overlaps open PRs #93 (section-aware drop classification; a `.fsh` drop no longer hijacks the backdrop), #94 (`decodeDroppedPacks` in `web/drop.ts` imports every decodable pack, skips corrupt ones), #121 (Firefox `dataTransfer.files` fallback) and #124 (dropped packs persist under `local:` IDB keys, excluded from LRU). With those merged, (a) and (c) may already be fixed; diff against main first.

### B-14 Fish show the wrong species during launch restore, and permanently when their pack failed or was dropped

Size S · Severity medium · Value 4/5 · Risk 2/5

**Problem.** Saved fish carry last session's sheetIdx. Until their pack restores, sheetOf uses the stale index or round-robins, so the tank opens with a school of wrong or identical fish that morph one pack at a time (~1.7 s from IDB, seconds from the network). remapSheetIdx runs once, after the whole chain; for a pack-bound fish whose pack did not load (offline, 503, evicted), it keeps any in-range sheetIdx, which now belongs to another pack. Dropped fish (no `pack`, no stored bytes) borrow whatever slot restored first after relaunch, so a dropped blackmoor becomes a goldfish.

**Evidence.** `web/main.ts:222-237` (sheetOf), `web/main.ts:253-270`, `web/main.ts:275-295` (remapSheetIdx else-branch at :291-293), `web/main.ts:875-900` (launch chain), `web/main.ts:948`, `web/main.ts:991`.

Playwright: goldfish (sheet 0) + blackmoor (sheet 1), clear IDB, goldfish.zip returns 503, reload: roster 'goldfish@sheet0, blackmoor@sheet0'. Drop blackmoor then install goldfish, reload: two identical goldfish.

**Change.** Put the rule in a pure `drawableSheetIndex(f, {sheetByPack, sheetBySpecies, count}, restoring)` in `web/tankmodel.ts` (shared with B-04's resolveSlot). (1) At load, strip sheetIdx from fish that have `pack`. (2) A fish with `pack` or non-empty `species` that is unresolved returns null (drawn as placeholder or hidden while `restoring`); it never falls through to round-robin. Only fish with species '' and no pack round-robin (see B-15). (3) In handleSheets, rebind only the fish whose pack/part (or legacy species) just registered; never delete bindings mid-restore, since remapSheetIdx's delete branch must run only after the chain (main.ts:900). (4) Optional: fade newly drawable fish in over ~15 ticks. Persisting dropped bytes under `local:<sha1>` (non-LRU IDB store, recordInstall entry, fetchInnerBlobs serving `local:`) is a separate M follow-up if drag-and-drop becomes a documented feature.

**Acceptance.** Vitest: pack missing gives null; `{species:'blackmoor', sheetIdx:0}` with no binding gives null; resolved and legacy cases.

**Merged and related.**

- Merged from pass 8 ("Pack-owned fish can inherit unrelated art", old ID B08): `remapSheetIdx` drops bindings only when the old index is out of range and `sheetOf` then round-robins. Bind pack-owned fish strictly by pack identity, draw the recognizable placeholder while absent, resolve when the pack loads, and keep round-robin only for explicitly unbound starters. Extra tests from that entry: mid-order restore failure, same-name packs, late retry.
- Design constraint: `usePack` intentionally keeps sheets on removal to preserve `sheetIdx` bindings; do not "fix" that apparent leak separately.
- The local-bytes follow-up overlaps open PR #124 (`local:` keys, `LOCAL_PREFIX`/`isLocalPack`).

### B-15 Starter fish adopt every installed species, change as more install, and keep removed art

Size S · Severity medium · Value 4/5 · Risk 2/5

**Problem.** The four starters (no species, pack or sheetIdx) draw `fishSheets[slot % fishSheets.length]`. Installing one fish add-on turns all four into that species (five of them), a second install turns them into A/B/A/B mid-swim, and after uninstalling they keep the removed species because removeAddon deliberately leaves sheets loaded. Their thumb key `f:{id}:` never changes, so Overview keeps stale art, and they are always named 'Fish'. Tank presets with sheets (B-23) feed the same pool.

**Evidence.** `web/main.ts:70-76` (DEFAULT_FISH), `web/main.ts:222-237` (round-robin at :230-236), `web/main.ts:441-454` (fishThumb memo), `web/main.ts:549-602` (removeAddon keeps sheets), `web/bus.ts:16-20` (fishThumbKey), `web/overviewmodel.ts:66`, `web/statsmodel.ts:59`.

**Change.** (1) Add `bindStarters(fish, {species, pack, sheetIdx})` to `web/tankmodel.ts`: on the first live fish install (handleSheets with live === true, section 'fish'), bind every untouched starter to that pack, then saveTank; they keep that art, get a real name and leave with their add-on. (2) For anything still unbound, round-robin only over `liveSlots` (slots whose owner is the bundled pack or a URL in installedAddons, fed only by section 'fish'), via a pure `roundRobinSlot(i, liveSlots)`; empty list gives the placeholder. removeAddon removes its slots from liveSlots. (3) Memoize fish thumbs by `${fishThumbKey(f)}|${slot}` and re-post `thumbs` for keys whose slot changed. Never set `f.pack` on loose fish outside bindStarters (removeAddon would then delete them unexpectedly).

**Acceptance.** Vitest: starters bind once; a second install leaves them alone; pack fish are never touched; roundRobinSlot never returns a removed or tanks-only slot. Playwright: install then remove tama, 0 starter thumbs show tama.

**Merged and related.**

- Related: B-23(a) (keep tank-preset sheets out of the pool), B-14.
- PR #160 (open) removes the stand-ins once Stock the Tank installs a real fish, which narrows this; a user who declines the offer still sees starters adopt every species.

### B-16 An emptied tank comes back with 4 starter fish on the next launch

Size S · Severity medium · Value 3/5 · Risk 1/5

**Problem.** `roster?.length ? roster : DEFAULT_FISH` treats a saved, deliberately empty v2 roster as a missing save, contradicting the documented rule that v2 rosters are authoritative. Overview supports an empty tank ('The tank is empty…'), but removing everything does not stick.

**Evidence.** `web/main.ts:72-76`, `web/main.ts:297-301`.

**Change.** Extract `initialRoster(saved)` into `web/tankmodel.ts`: `saved?.v === 2 ? roster : (roster.length ? roster : DEFAULT_FISH)`.

**Acceptance.** Vitest: v2 with [] gives []; no save gives 4 defaults; v1 with [] gives 4 defaults.

**Merged and related.**

- Merged from pass 8 (reproduced there too): distinguish "no valid save" from "valid empty roster"; test first launch, explicit empty v1 and v2 saves and malformed entries; keep v1 add-on reconciliation separate from the first-launch decision.
- Related: S-07 (schema boundary), open PR #127 (Empty Tank) whose result this bug undoes on relaunch, and PR #160 (welcome keyed on `saved === null`): an emptied tank must not re-trigger the welcome.

### B-17 While audio is locked every sound is queued; the first click plays them all at once

Size S · Severity medium · Value 4/5 · Risk 2/5

**Problem.** The AudioContext is created at launch by the sounds restore, before any gesture. play() attaches `resume().then(() => this.play(...))` for every one-shot, including bubbles from render(); per spec, pending resume promises settle together once the context may start, so the first click fires every queued effect (28 starts within 400 ms of the click in a 40-fish test). WebKit's 'interrupted' state (sleep, device change) falls through and silently drops sounds; nothing watches statechange or visibilitychange.

**Evidence.** `web/audio.ts:70-74`, `web/audio.ts:99-116` (play retry closure), `web/main.ts:108-110` (unlock then tap), `web/main.ts:1106-1108` (bubble sounds from render), `macos/Finsical.swift:110-116`.

**Change.** In TankAudio add `private resuming: Promise<void> | null` and `requestResume()` (at most one resume() at a time; on resolve start the ambient if `ambientWanted && !ambientSrc`). play(): if `state !== 'running'`, call requestResume(); queue a single retry for this call only while a gesture is in progress (`navigator.userActivation?.isActive`, or a `gestureUntil` timestamp that unlock() sets to now+1000); otherwise drop one-shots and never queue bubbles. Remove the per-call closure and the ambientGen bookkeeping it needed. Hook `ctx.onstatechange` and `visibilitychange` (when visible) to requestResume(). Native: set `config.mediaTypesRequiringUserActionForPlayback = []` in makeWebConfig (verify on a Mac).

**Acceptance.** Tests: new `web/audio.test.ts` with a fake AudioContext (settable state, deferred resume, counted start()): 10 bubble() calls while suspended then resolve gives 0 one-shots and 1 ambient; unlock() then tap() while suspended gives exactly 1 tap.

**Merged and related.**

- Planned for PR #159 but not included; #159 only skips install feedback while the context is locked.
- Overlaps open PRs #115 (keyboard and menu paths call `unlock()`) and #133 (defers AudioContext creation until a buffer plays; `usable:false` on failure). Re-measure on top of them.
- Merged from passes 1-7: the F key could play a "plop" even before unlock by resuming on the keydown gesture itself (keys count as activation).
- Refuted variant: dropping every one-shot while suspended (see "Declined, refuted and corrected").

### B-18 Sound add-ons cannot be removed; their sounds persist and replay every launch

Size M · Severity medium · Value 3/5 · Risk 3/5

**Problem.** The Overview line disappears, but the records stay in TankAudio.imported and in the persistent 'snds' record, and come back every launch (Macinfish: 3.2 MB decoded on every launch). They still drive the ambient, bubble and tap lookups by name. The launch also decodes restored sound add-ons twice (restore -> handleSounds -> addWavs, then sndsGet -> addWavs). A live install plays the track through an untracked source that nothing can stop. Dropped sounds are never listed anywhere and cannot be removed.

**Evidence.** `web/main.ts:343-358` (handleSounds, sndsMerge), `web/main.ts:549-602` (removeAddon has no sounds branch), `web/main.ts:640-644`, `web/main.ts:891-899` (launch re-adds all stored records), `web/store.ts:186-230` (only sndsGet/sndsMerge), `web/audio.ts:11`, `web/audio.ts:44-81`.

**Change.** (1) Add optional `from?: string` (add-on URL) to StoredSnd, passed via `handleSounds(recs, live, from)` from remoteInstall and applyPack; record the qualified names on the Importable (`sounds?: string[]`) before recordInstall. (2) store.ts: `sndsRemove(pred)` serialized on sndsChain, backed by a pure `withoutSnds(cur, names)` tested next to capSnds. (3) audio.ts: `removeImported(names)` (delete buffers; if ambientBuf was among them, stop and restart the ambient) and `stopImported()` tracking the last playImported source. (4) removeAddon: for section 'sounds', use `it.sounds`, or for older saves `qualifySoundItemName((await fetchAddon(url)).flatMap(r => r.sounds), it.inner)` (served from IDB), then call both. (5) At launch skip stored records whose `from` is an installed add-on.

**Acceptance.** Tests: vitest withoutSnds; Playwright install then remove Macinfish leaves 'snds' empty.

**Merged and related.**

- Overlaps open PR #104 (`orphanedSounds` pure helper drops an uninstalled add-on's sound records; provenance recorded only after `handleSounds` succeeds; restores refresh it). With #104 merged, what remains is the double decode at launch, stopping a playing track, and dropped sounds that are never listed.
- Related: B-39, B-40, P-04, F-05 (remainder).

### B-19 Imported music takes over tank sound effects through substring name matching

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** find() falls back to any imported name that contains the keyword, and imported records outrank bundled ones (releases ship none anyway). Audio files become records named after the file, so 'Desktop Aquarium.mp3' becomes the ambient loop ('aqua') and the top-of-glass tap ('desktop' contains 'top'); 'Seaside Sunset' answers every side tap via the `?? find('center','side')` fallback. A full song then replays at gain 0.8 on every tap and overlaps itself, with no way to remove it (B-18).

**Evidence.** `web/audio.ts:44-68` (addWavs), `web/audio.ts:83-97` (find), `web/audio.ts:128-156`, `core/data/snd.ts:381-392` (fileSoundRecords), `web/store.ts:195`, `web/main.ts:959-982`, `web/addons.ts:40-65`.

**Change.** Add `kind: 'effect' | 'music'` to sound records: the AUDIO_FILE_EXT branch of fileSoundRecords sets 'music', the 'snd ' fork branch 'effect'; carry optional `kind` through StoredSnd, capSnds and sndsMerge. Legacy records without kind count as effect only if they are RIFF/WAVE, mono and <= 22254 Hz (what wavBytes emits). addWavs puts music in a separate `music` map that find() never searches; playImported(name) looks in both (and F-05's jukebox plays music). Keep substring matching for effects (the original fork's names are unknown); if stricter matching is wanted, split camelCase and non-letters into words first rather than a word regex on the lowercased name.

**Acceptance.** Tests (audio.test.ts, fake AudioContext): a music record 'Desktop Aquarium' never plays from tap(), feed() or startAmbient() but plays via playImported; an effect 'aqua' loops; 'TapTop' still answers a top tap.

**Merged and related.**

- Related: F-05 (remainder) plays `kind === 'music'` records; P-04 streams them; F-22 records are `kind: 'effect'`.

### B-20 A background, gravel or tank preset re-chosen with 'Add Again' reverts after relaunch

Size S · Severity medium · Value 4/5 · Risk 2/5

**Problem.** One scenery item shows at a time; pickBackdrop/pickGravel re-insert into their maps, so the choice is right during the session. But recordInstall only appends unseen URLs and restore replays installedAddons in first-install order, so after relaunch the last-installed item wins, not the last-chosen. Both install paths drop `again`. The button label 'Add Again' does not describe switching back to a background. Playwright: Back01, Back02, Back01 again: correct live; after reload Back02 is back.

**Evidence.** `web/main.ts:36-44` (SavedTank), `web/main.ts:165-194` (pickBackdrop/pickGravel), `web/main.ts:333-337` (recordInstall ignores `again`), `web/main.ts:607-650` (remoteInstall; call at :645), `web/main.ts:891`, `web/import.ts:789`, `web/import.ts:822-858`, `web/import.ts:1115-1131` (applyAddon -> onInstall(it)), `web/import.ts:1231-1246` (restore order).

**Change.** Persist the scenery choice explicitly rather than reordering installedAddons (tank presets can carry fish sheets, and reordering would reshuffle round-robin slots). (1) Add `scenery?: { backdrop?: string; gravel?: string }` to SavedTank, written by saveTank from backdropSrc/gravelSrc. (2) Pure `promote(map, key)` in a new `web/scenery.ts` (delete-then-set so the chosen key is newest, keeping uninstall fallback correct); after `importPanel.restore([...])` resolves, promote saved.scenery.backdrop/gravel when present and set the current canvases. (3) For installed items in backgrounds/gravel/tanks, label the button 'Show in Tank'; once postState carries the displayed srcs (U-06), show a disabled 'In Tank' for the current one. (4) Pass `again` through `ImportHandlers.onInstall(it, again)` and `recordInstall(it, again)` in the same PR as B-21.

**Acceptance.** Tests: vitest promote() and `resolveScenery(saved, keys)`; browser check of the Back01/Back02/Back01 sequence surviving reload.

**Merged and related.**

- Overlaps open PR #118 (Overview "Use" swaps in an installed pack's backdrop or gravel, rows show "Showing"/"In tank", the choice persists via `SavedTank`). With #118 merged, what remains is the 'Add Again' labelling and passing `again` through.
- Merged from passes 1-7 ("Backdrop/gravel chooser"): `pickBackdrop` is newest-wins on install; a Preferences-side chooser with preview is still open.
- Related: U-06 (statuses), B-21 (shared `recordInstall(it, again)` plumbing).

### B-21 'Add Again' copies of plants and accessories are lost on relaunch

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** Add Again pushes another decor instance, so three copies show, but recordInstall dedupes by URL and restore applies each URL once; after relaunch one copy remains. Fish are unaffected because each fish is in the roster.

**Evidence.** `web/main.ts:198-218` (addDecor pushes one decor per call), `web/main.ts:333-337` (recordInstall dedupes by URL), `web/import.ts:828-858`, `web/import.ts:1231-1246`.

**Change.** Give saved add-ons an optional `copies?: number` (missing = 1). In `recordInstall(it, again)` (shared plumbing with B-20), when again is true and section is plants or accessories, increment copies instead of skipping; restore calls handleImages `copies` times. If F-04 lands first, persist decor placements as an ordered array (one entry per copy) instead.

**Acceptance.** Tests: vitest SavedTank migration (copies defaults to 1); Playwright reload keeps 3 copies (debug hook `window.finsical.debug?.decorCount` or a pixel diff).

**Merged and related.**

- Conflicts with open PR #99 (and #139): there "Add Again" on a plants/accessories pack replaces that pack's frames instead of stacking a copy. Decide the intended behavior first. If copies are wanted, this entry (or F-04's placement array) applies and #99 must be revised; if not, #99 already fixes the visible stacking and this entry reduces to nothing.
- Merged from passes 1-7 ("Decor count"): an optional Overview quantity control.

### B-23 Tank presets (.azn) apply only a stretched backdrop and one strip; their sheets hijack the starter fish

Size M · Severity medium · Value 3/5 · Risk 3/5

**Problem.** A .azn is a complete saved aquarium. eden.azn holds 5 plant species with 12 positioned named individuals (PlPI/PlPH), a 'venus' accessory, backdrop 640x480, gravel 640x128, heater, water, filter, feeder and light records. Only the backdrop (and for the goldfish bowl the 560x130 base as 'gravel') survives; fish swim over the wooden table outside the bowl. Installing AROWANA ADAM&EVE feeds its fish sheets into the round-robin, so the starter fish become arowana fry, while the preset's own fish never spawn.

**Evidence.** `web/main.ts:222-237` (sheetOf round-robin), `web/main.ts:253-270` (handleSheets calls usePack for any section), `web/main.ts:321-332` (tanks -> pickBackdrop only), `web/import.ts:78-79`, `core/data/decor.ts`.

**Change.** (a) Bug fix (S): only section 'fish' (and the bundled/dropped pack) pushes into the round-robin pool (`liveSlots`, see B-15); for 'tanks' with sheets, spawn one fish bound to the sheet on live install under its own species name. Test: `roundRobinSlot` never returns a tanks-only index. (b) Scene import (M): new `core/data/azn.ts` `parseTank(res)` (needs F-01) returning size, backdrop, gravel, plants `[{frames, x, top, h, w, depth, name}]`, accessories, heater, water, feeder. PlPI tail: h = u16@260, w = u16@262, x = u16@264, top = u16@266 (top + h equals the AQUA height, so plants stand on the tank bottom; it is not a baseline), depth = u16@268. Map x by TANK.width/aquaW, put bottoms at the floor line (V-04), draw by ascending depth. Standalone .plt packs carry 1-2 PlPI placements too, giving default positions for F-04. Ask first with an alert: 'Replace the current scenery with “eden”? Your fish stay in the tank.'

**Acceptance.** Tests: azn.test.ts with a synthetic two-plant, one-accessory tank asserting top + h equals the tank height; a pure `layoutDecor()` for scaling and depth sort. Screenshot-check 3 presets.

**Merged and related.**

- Related: F-01 (needed for (b)), F-04 (default positions from PlPI), V-04 (floor line), B-15.

### B-25 Dropping a file on Preferences, Tank Overview or Tank Stats navigates that window to the raw file

Size S · Severity medium · Value 3/5 · Risk 1/5

**Problem.** Only the tank (`main.ts:919-920`) and Import Add-ons (`addons.ts:39-40`) preventDefault drops. On the other pages WebKit's default drop action loads the file in the main frame, which the navigation delegate allows (file: is not http(s)). The borderless Mac OS 8 window is replaced by the raw file with no drawn close box, and because Osmium keeps the webview after close, reopening shows the broken page until restart. Inferred from WebKit behavior; not reproduced on a Mac.

**Evidence.** `macos/Finsical.swift:439-453` (decidePolicyFor allows every non-http(s) scheme), `web/prefs.ts`, `web/overview.ts`, `web/stats.ts`, `node_modules/osmium-ui/src/host.ts:80-175`, `node_modules/osmium-ui/macos/OsmiumWindows.swift:281`.

**Change.** In decidePolicyFor, after the http(s) branch: `if action.targetFrame?.isMainFrame == true, let s = action.request.url?.scheme, s != WebHandler.scheme { NSLog(...); decisionHandler(.cancel); return }` (no page navigates its main frame to blob: or data:). Optionally also cancel main-frame finsical:// loads of paths other than the five bundled pages. Defence in depth: dragover/drop preventDefault in prefs.ts, overview.ts and stats.ts, or upstream in osmium-ui's hostWindow().

**Acceptance.** Manual test: drop a PNG on each window; chrome stays; drops on the tank and Import still import.

### B-27 Zoom and window tiling break the aspect ratio, so the silhouette mask no longer matches the art

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** contentAspectRatio only constrains live resize. Zoom (no windowWillUseStandardFrame, so the whole visibleFrame), title-bar double-click and macOS 15 tiling can set another aspect. The page letterboxes the case art (xMidYMid meet, min() scale plus offsets), but the image mask uses `contentsGravity = .resize` over the full layer and the shape mask scales by width only, so bezel edges get clipped and the refilled aperture misses the glass.

**Evidence.** `macos/Finsical.swift:262-301` (syncMask), `macos/Finsical.swift:144` (contentAspectRatio), `macos/Finsical.swift:600-602` (Window > Zoom), `web/main.ts:726-733` (layoutMachine letterbox), `web/index.html:21`, `web/machines.ts:47-50`.

**Change.** In syncMask compute the letterbox once: `let s = min(b.width/machineVbW, b.height/machineVbH); let art = CGRect(x: (b.width - machineVbW*s)/2, y: (b.height - machineVbH*s)/2, width: machineVbW*s, height: machineVbH*s)`; set `mask.frame = art` for the image mask (outside is transparent) and offset plus scale each shape rect by art.origin and s. Implement `windowWillUseStandardFrame(_:defaultFrame:)` returning the largest aspect-correct frame (ideally an integer tank scale, V-03) centered in defaultFrame.

**Acceptance.** Manual test on macOS 15: Window > Move & Resize > Left, Zoom and edge tiling keep the case intact with click-through margins.

**Merged and related.**

- Related: V-03 (integer tank scale), B-49.

### B-28 A WebContent process crash leaves an invisible, empty always-on-top window

Size S · Severity medium · Value 3/5 · Risk 1/5

**Problem.** AppDelegate is the navigation delegate for every webview but implements neither `webViewWebContentProcessDidTerminate` nor any didFail handler. When WebKit kills the content process (memory pressure, GPU reset, WebKit update), the transparent tank keeps its mask but paints nothing; the app keeps running with an invisible floating window. Client windows go blank and cannot be closed from their drawn chrome.

**Evidence.** `macos/Finsical.swift:69-71`, `macos/Finsical.swift:434-465`, `macos/Finsical.swift:498-499` (non-opaque, clear background).

**Change.** Implement `webViewWebContentProcessDidTerminate(_ v:)`: log which page died and call `v.reload()`. The tank restores from localStorage and clients re-sync through hello because the new `boot` id forces a re-ask. Crash-loop guard: more than 3 tank terminations in 60 s shows an NSAlert ('The aquarium stopped unexpectedly') with Reload and Quit. Also implement `webView(_:didFailProvisionalNavigation:withError:)` for the tank with the same alert.

**Acceptance.** Manual test: force-quit 'Finsical Web Content' in Activity Monitor; the tank returns within a second with the same fish.

**Merged and related.**

- Part of the "native shell politeness" checklist (T-32).

### B-29 Add-on import needs WebKit 16.4 (DecompressionStream) while the app promises macOS 12.0

Size M · Severity medium · Value 3/5 · Risk 2/5

**Problem.** Every archive.org import and the azpack PNG decoder use DecompressionStream, which WebKit shipped in Safari 16.4; macOS 12.0 shipped Safari 15. A Monterey Mac without the Safari 16.4+ update throws a ReferenceError on every import. The project otherwise treats 12.0 as a hard floor (Osmium avoids :has() for exactly that reason). esbuild runs at its default target (esnext), so nothing lowers or checks syntax. The zip.ts comment is also wrong: node 18 lacks deflate-raw (added in 20.12/21.2).

**Evidence.** `core/data/zip.ts:5-6` (comment), `core/data/zip.ts:99` (`deflate-raw`), `core/data/azpack.ts:54-58` (`deflate`), `package.json` (scripts.build/dev, no esbuild target), `macos/Makefile:13`, `node_modules/osmium-ui/osmium.css:311-312`.

**Change.** Either (a) add `core/data/inflate.ts` (a small pure-JS raw inflate, or fflate's inflateSync, ~8 KB) used when `typeof DecompressionStream === 'undefined'`, tested by deleting `globalThis.DecompressionStream` in a vitest and re-running the zip and azpack suites; or (b) raise MACOS_MIN and LSMinimumSystemVersion to 13.3 and document it. Either way add `--target=safari15` to every esbuild call (builds cleanly today), fix the zip.ts comment, and show an alert naming the missing API at startup instead of failing silently.

**Acceptance.** (derived) Option (a): a vitest that deletes `globalThis.DecompressionStream` re-runs the zip and azpack suites green; option (b): Info.plist and the Makefile say 13.3 and README documents it. Either way every esbuild call has `--target=safari15` and a startup alert names the missing API.

### B-30 Browsing add-ons evicts installed add-ons from the offline cache

Size M · Severity medium · Value 3/5 · Risk 2/5

**Problem.** Every browsed pack (detail views and each lazily fetched row thumbnail) is persisted into the same 150 MB LRU as installed add-ons, and trimPacks evicts oldest-first with no notion of installed. Installed packs were last touched by the launch restore, so a long browse evicts them first, breaking store.ts's promise that restores work offline. Scrolling Fish (~165 packs, 47 KB to 5.6 MB, 4-9 MB for the arow/disc/gup add-ons) plus a couple of scenery sections exceeds the budget. Flick-scrolling queues dozens of multi-MB downloads.

**Evidence.** `web/store.ts:73-84` (packGet refreshes `at` on hit), `web/store.ts:86-135` (trimPacks, PACK_BUDGET 150 MB at :90), `web/store.ts:137-162`, `web/import.ts:115-131` (fetchZip packPut), `web/import.ts:1039-1078` (row thumbnails fetch whole packs), `web/main.ts:333-337`, `web/main.ts:553-602`.

**Change.** (1) Pure `evictionPlan(recs: {url, at, bytes}[], budget, pinned: Set<string>): string[]` in store.ts: evict 'thumb:' keys first, then unpinned packs oldest-first; pinned entries are never evicted, even if the pinned set alone exceeds the budget. trimPacks reads `meta['pinned']` inside its transaction. (2) Export `packPinSet(urls)`; call it from recordInstall, removeAddon and once after importPanel.restore resolves with `[...new Set(installedAddons.map(a => a.url.split('#')[0]))]` (not from saveTank, which runs every 10 s). (3) Start a row's thumbnail fetch only after the row has been visible 300 ms (setTimeout in the IntersectionObserver callback, cancelled on exit).

**Acceptance.** Tests: vitest evictionPlan (pinned kept, thumbs first, over-budget pinned evicts only unpinned); rerun a scaled-budget (8 MB) Playwright check where an installed key survives browsing 40 fish rows.

**Merged and related.**

- Merged from passes 1-7: thumbnail entries share the pack budget deliberately, but fresh thumbs can still evict installed packs; pinning live installs (this entry) is that fix.
- Related: P-01, B-46, T-17 (store.ts tests).

### B-33 Tail-wag ignores the species' own animation scripts (AMV#/BMV#)

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** Each species ships idle and swim scripts (AMV# adult, BMV# baby): a big-endian u16 count followed by big-endian frame indices. Several are non-linear: clownfish Baby Idle is 0,0,1,1,2,2,1,1,...; ネオンテトラ adult Idle is 0,1,2,3,3,3,3,4,5,6,6,6,7,0,0,0 (held glide frames); メダカ adult scripts too. animFrame cycles linearly, so these fish jump from the last frame to the first.

**Evidence.** `web/main.ts:1016-1025` (animFrame cycles 0..nf-1), `core/pose.ts`.

**Change.** After F-01, parse scripts into the species model (clamp each index to framesPerGroup-1). Add a pure `scriptFrame(script, phase)` in core/pose.ts; use the Idle script when `f.speed < 0.4*f.cruise`, else Swim, indexing `script[floor(phase) % script.length]`, falling back to the linear cycle.

**Acceptance.** Tests (pose.test.ts): the clownfish fixture maps phases 0..7 to 0,0,1,1,2,2,1,1; the neon prefix [0,1,2,3,3,3,3,4].

**Merged and related.**

- Needs F-01.

### B-34 Two tank tabs both execute every command and overwrite one save

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** In a browser every tank tab opens BroadcastChannel('finsical'), answers every intent (one install gives 2 downloads and 2 acks) and writes `finsical:tank` every 10 s, so the last writer wins. Clients receive alternating states with different `boot` ids, and Overview keeps resetting its thumbnail requests. Browser-only; the native shell has one tank.

**Evidence.** `web/main.ts:35`, `web/main.ts:92`, `web/main.ts:97`, `web/main.ts:379`, `web/main.ts:516-547`, `web/bus.ts:34-36`, `web/overview.ts:43-47`.

**Change.** Gate the tank on a Web Lock: start `passive = true`; `navigator.locks?.request('finsical-tank', {ifAvailable: true}, lock => lock ? (passive = false, postState(), new Promise(() => {})) : showAlreadyOpen())`. While passive, onBusMessage returns early, saveTank and its interval do nothing, and an alert says 'Finsical is already open in another tab.' Fall back to a BroadcastChannel ping/pong when navigator.locks is missing; skip the lock entirely when inNativeShell().

**Acceptance.** Verify with two tabs: 1 state reply and 1 ack per request.

**Merged and related.**

- Merged from pass 8 ("Bus messages and multiple browser tanks lack an authority boundary", old ID B14): choose one active browser tank or scope sessions and companion windows by tank ID; test malformed messages, two tanks, reconnect and companion-before-tank; the native relay stays unchanged. The envelope-validation half is T-18.
- F-26 (save slots) should build on this rather than on competing global save keys.

### B-35 With the CRT effect on, clicks do not land where the curved, overscanned picture shows

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** The shader applies overscan zoom, width/height pots and barrel warp before sampling, but pointerdown uses flat object-fit math. At defaults the worst offset is ~13 tank px and 12% of the screen is black curved border that still accepts clicks; hsize=0 gives 48 px and 34% black. The feed band shifts too.

**Evidence.** `web/main.ts:100-111` (pointer mapping), `web/crt.ts:59-79` (FRAG uv chain), `web/app.css:45-50`.

**Change.** Export a pure `crtScreenToRaster(u, v, cfg): [number, number] | null` from crt.ts reproducing FRAG in order (zoom, size pots, barrel), null outside 0..1, with 'keep in sync with FRAG' comments on both. In pointerdown when `crt?.enabled`: u = (clientX - r.left - offX) / (TANK.width*s), v = 1 - (clientY - r.top - offY) / (TANK.height*s) (the shader is y-up), map, return on null, else x = su*320, y = (1 - sv)*200.

**Acceptance.** Tests (crt.test.ts): identity at curvature 0 with neutral size and zoom; the center is a fixed point; the corner at curvature 1 is null; zoom=1 maps u=0.95 to ~0.902.

### B-36 After a GPU context loss the CRT stays off for the session and Preferences still shows it on

Size M · Severity low · Value 2/5 · Risk 3/5

**Problem.** webglcontextlost sets `lost = true` permanently and nothing handles webglcontextrestored (GPU switches or sleep on dual-GPU Macs). The loss posts no state, so Preferences shows On until the next heartbeat. main.ts's `crtOn` stays true, so the next toggle silently turns it 'off' and the one after stores '1' while setEnabled returns early.

**Evidence.** `web/crt.ts:229-236` (lost = true forever), `web/crt.ts:324-329`, `web/main.ts:665-675`, `web/main.ts:800`, `web/main.ts:834`.

**Change.** Refactor initCrt's GL setup (shaders, program, buffer, texture, uniforms, upload) into `setup(): boolean`, called at init and on 'webglcontextrestored' (which clears `lost`). Track `wanted` (last setEnabled request) and re-enable after restore. Add `initCrt(canvas, { onChange })` fired on loss and restore; main.ts passes postState. Toggles use live state: `setCrt(!(crt?.enabled ?? false))` at main.ts:800 and :834.

**Acceptance.** Verify with WEBGL_lose_context: loseContext() pushes state within 1.5 s; restoreContext() brings the CRT back.

### B-37 The in-tank add-on browser misses installs and removals made in other windows

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** main.ts never calls importPanel.notify(), so the browser/touch overlay (Cmd/Ctrl+I) keeps its checkmark and 'Add Again' after an Overview removal, and after an install from another window its 'Add to Tank' adds a duplicate fish.

**Evidence.** `web/main.ts:360-369`, `web/main.ts:553-602` (removeAddon), `web/main.ts:601` (posts 'uninstalled'), `web/import.ts:1099-1107` (markInstalled), `web/import.ts:1121` (applyAddon guard), `web/import.ts:1201-1224` (notify).

**Change.** Do NOT feed postState into notify: postState runs during module evaluation (main.ts:703, :791) before importPanel.restore (main.ts:891), so a state notify would mark every saved add-on installed and restore() would skip them all. Instead: in import.ts notify() add `else if (m.op === 'uninstalled' && typeof ackUrl === 'string') markInstalled(ackUrl, false);` (the remote panel already receives 'uninstalled'); in removeAddon after the splice call `importPanel.notify({ op: 'uninstalled', url })`; after a successful remoteInstall call `importPanel.notify({ op: 'installed', url })`.

**Acceptance.** Test: overlay install, Overview removal, overlay shows no checkmark and 'Add to Tank'; a reload still restores saved add-ons.

**Merged and related.**

- Merged from pass 8 (removal race): the in-page panel keeps its own installed set that main-page removals don't reach; keep both panel forms in sync.
- Refuted variant: notifying with `op: 'state'` (see "Declined, refuted and corrected").

### B-38 An add-on removed during launch reappears when its restore download finishes

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** restore() replays the saved list sequentially and checks only its own `installed` set. Removing an add-on in Overview before its fetch resolves still runs applyPack: its gravel, backdrop or decor come back and its sheets re-register although installedAddons no longer lists it.

**Evidence.** `web/import.ts:1231-1246` (restore), `web/main.ts:891`.

**Change.** `restore(list, stillWanted?: (url: string) => boolean)`, checked before fetchPack and again inside `.then` before applyPack; main.ts passes `u => installedAddons.some(a => a.url === u)`.

**Acceptance.** Test: with archive.org delayed 4 s, remove bamboo gravel at t≈1 s; the floor stays default after the restore lands.

**Merged and related.**

- Merged from pass 8 ("Removal can be undone by in-flight restore work"): serialize or generation-check per-pack apply/remove and make removal authoritative over older work; tests: delayed-restore-then-remove, reinstall-after-remove, same-name packs.
- Related: P-07 (`stillWanted` at apply time), B-37. Open PR #127's tank epoch is the same pattern for Empty Tank.

### B-39 Saving a sound reports success even when nothing was written

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** rw() never rejects, so metaPut and sndsMerge resolve on failed writes; addons.ts's catch is unreachable and it posts soundsLoaded for a sound that did not persist. Worse, sndsMerge reads through the same rw(), so a failed read looks like 'no record' and `capSnds(null, records)` can overwrite the store with only the new records.

**Evidence.** `web/store.ts:53-71` (rw resolves null on every failure), `web/store.ts:182-184` (metaPut), `web/store.ts:220-230` (sndsMerge), `web/addons.ts:56-63`, `web/main.ts:354-355`.

**Change.** Make rw() distinguish a miss from a failure (`{ok: true, value} | {ok: false}`, or an rwStrict() for the snds path). sndsGet throws on failure; metaPut resolves a boolean; sndsMerge throws if the read failed (never overwrite on an unknown baseline) or the write returned false. Keep packPut fire-and-forget.

**Acceptance.** Test: a pure `mergeInto(get, put, records)` in store.ts rejects when put resolves false and when get fails, and never calls put after a failed get.

**Merged and related.**

- Merged from pass 8 ("Sound persistence can lose data"): `rw` serializes read/modify/write only within one module instance, and the tank and Add-ons pages use separate instances, so overlapping merges can clobber each other: make read/merge/write one IndexedDB readwrite transaction. The legacy-thumbnail migration deletes its source after a null `packPut`: remove a migration source only after commit, and distinguish cache failures from user-data failures.

### B-40 Each sound dropped on Import Add-ons re-decodes all stored sounds and restarts the ambient loop

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** On soundsLoaded the tank decodes every stored record (up to 64 MB). addWavs stores fresh AudioBuffers, so `now !== this.ambientBuf` restarts an imported 'aqua' loop from the top on every unrelated drop.

**Evidence.** `web/main.ts:534-546` (soundsLoaded handler), `web/audio.ts:44-68` (addWavs), `web/addons.ts:63`.

**Change.** addons.ts posts `{op: 'soundsLoaded', names: recs.map(r => r.name)}` (after qualifySoundNames) and the tank decodes only those. TankAudio tracks `ambientName` (the key find('aqua') chose) and restarts only when that name changes or is in the incoming batch. At launch skip records already added by the restore chain (or by `from`, B-18).

**Acceptance.** Test (audio.test.ts, fake context): addWavs([{name:'drip'}]) while an imported 'aqua' loops causes 0 stop() calls.

**Merged and related.**

- Merged from passes 1-7: verify `startAmbient()` never overlaps loops audibly during rapid load or restart (T-17 has the test).

### B-41 Quitting the Mac app can lose the last 10 seconds of tank state

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** Cmd-Q or closing the tank calls NSApp.terminate; WKWebView tears down its content process without page lifecycle events, so fish positions, hunger and water since the last interval save are lost. Nothing saves on visibilitychange (minimize, occlusion). Installs save immediately, so the loss is small. Not verified on a Mac.

**Evidence.** `web/main.ts:96-97` (pagehide + 10 s interval), `web/main.ts:798-800` (window.finsical), `macos/Finsical.swift:408-410` (windowWillClose terminates), `macos/Finsical.swift:529`, `macos/Finsical.swift:551-553`.

**Change.** main.ts: `document.addEventListener('visibilitychange', () => { if (document.hidden) saveTank(); })` and add `save: saveTank` to window.finsical. Swift: `applicationShouldTerminate` returns `.terminateLater`, evaluates `window.finsical?.save?.()`, and in the completion handler calls a once-only reply that runs `NSApp.reply(toApplicationShouldTerminate: true)` after a 250 ms grace, with a 1.5 s fallback timer. Set `window.isReleasedWhenClosed = false` on the tank, since termination now outlives windowWillClose.

**Acceptance.** Manual test: move fish, quit within 1 s, relaunch, positions match.

**Merged and related.**

- The web half (`visibilitychange` save) overlaps open PR #135. The Swift `terminateLater` half is open either way.

### B-42 Stalled downloads never time out and wedge that add-on (and thumbnail slots) for the session

Size S · Severity low · Value 3/5 · Risk 2/5

**Problem.** fetch() has no AbortSignal or timeout. A never-settling promise stays memoized (entries are deleted only on rejection), so the row shows 'Fetching add-on…' with Add disabled until reload, and it holds one of the THUMB_PAR = 3 thumbnail slots forever; three stalls stop all thumbnails. A stalled listing leaves the listing text up forever.

**Evidence.** `web/import.ts:115-131` (fetchZip), `web/import.ts:139-183` (listPage), `web/import.ts:441-449` (packCache memo), `web/import.ts:776-866`, `web/import.ts:1039-1057` (pumpThumbs, thumbRunning-- in .finally), `web/import.ts:520-529`.

**Change.** Add `fetchWithTimeout(url, { firstByteMs = 60_000, idleMs = 30_000 })`: an AbortController with a first-byte timer before fetch() resolves (archive.org's zip view on multi-GB zips is slow to the first byte), then read `r.body.getReader()` re-arming an idle timer per chunk; on timeout abort and throw `new Error(`${url}: timed out`)`. Use it in fetchZip and a text variant in listPage. loadProblem: `if (msg.endsWith(': timed out')) return "archive.org stopped responding. Try again."`. The existing reject-deletes-memo logic then frees Try Again and the slots.

**Acceptance.** Tests: vitest with fake timers and a stubbed fetch whose body never enqueues rejects after 30 s idle; headers that never arrive reject after 60 s; a loadProblem case.

**Merged and related.**

- Overlaps open PR #134 (a 30 s progress-resetting stall timeout, `thumbFetching` dedupe, rejected memos evicted, host-neutral message). With #134 merged, what remains is the 60 s first-byte timer and the `loadProblem` wording. U-24 builds on the same helper.

### B-43 The add-on detail status line contradicts the button after install state changes

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** showDetail writes the status once; later only offer() re-runs and it changes only the button. After a removal in Overview the pane says 'Added to the tank.' next to 'Add to Tank'. After the 15 s 'No response from the tank' timeout, a late ack flips the button to 'Add Again' but leaves the 'No response' text.

**Evidence.** `web/import.ts:822-824`, `web/import.ts:846-851` (15 s timeout), `web/import.ts:855-859` (offer), `web/import.ts:1099-1113` (markInstalled), `web/import.ts:1201-1224`.

**Change.** Compute `summaryLine` once in showDetail and have offer() set both: status = `installed.has(url) ? 'Already in the tank.' : summaryLine`, plus the button. ackInstalled keeps the one-shot 'Added to the tank.' (the heartbeat only calls markInstalled for changed URLs, so it will not overwrite it). In the timeout branch remember `lateRef = ref`; in markInstalled, when `on && detailRef === lateRef`, show 'Added to the tank.' plus Add Again and clear lateRef.

**Acceptance.** Test: install, remove in Overview; the pane shows 'Already in the tank.' before and '1 pack, fish.' after.

### B-44 17 legacy-format Japanese accessories can never load but list normally and offer a useless 'Try Again'

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** FOSSIL1-3, FOSS_PL1-2, R_STONE1-2, WOOD1-4, WOOD_MS1-4 and WOOD_PL1-2 (.ACC under AQUAZONE ITEM/アクセサリー, uppercase 8.3 names, likely an earlier release) start `22 00 25 00 00 00 00 00 00 25 00 08 ...` instead of `00 01 00 00`. isPack rejects them, the panel says the download has no add-on in it and offers Try Again on a deterministic failure; the rows never get thumbnails.

**Evidence.** `core/data/fsh.ts:33-35` (isPack magic 0x100 only), `web/import.ts:346-364`, `web/import.ts:860-865` (catch offers Try Again), `web/import.ts:524`.

**Change.** In showDetail's catch, when `e.message === 'no pack inside'` and the bytes start with `22 00 25 00`, show "Finsical can't read this add-on yet." with `setAdd('Add to Tank', null)` and no Try Again. Track verdicts in an in-session `unreadable` Set and dim rows via `.irow.unusable { color: #888 }` (re-applied in showSection). If persisted, key it `bad:v1:{url}` with a decoder-version constant so a future decoder is not blocked. Decoder follow-up (core/data): the file looks like u16-LE length-prefixed records (length includes the prefix): 0x00 (len 0x22), 0x22 (len 0x22), 0x44 (len 0x2E), with `00 01 00 00` words inside; sample FOSSIL1.ACC (83,140 B).

**Acceptance.** Test: the Accessories section shows 17 dimmed rows and no Try Again.

### B-46 Offline or cache-miss restores quietly turn fish into orange blocks and never retry

Size M · Severity low · Value 2/5 · Risk 2/5

**Problem.** When an installed add-on's bytes are not in IndexedDB and archive.org is unreachable at launch, restore() logs a warning, fish fall back to placeholder rectangles, nothing says why, and nothing retries when the connection returns. Overview keeps showing the species as swimming. B-30's pinning makes the trigger rarer but not impossible (IDB-only failures).

**Evidence.** `web/import.ts:1231-1246` (restore only logs failures at :1241-1242), `web/main.ts:875-900`, `web/store.ts:90-130`.

**Change.** restore() resolves with the Importables that failed. main.ts keeps `restorePending` and retries on `window` 'online' and every 5 minutes (`importPanel.restore(pending)`, then remapSheetIdx()). The state push adds `missing: string[]`; overviewmodel shows 'Waiting for archive.org', and statsmodel adds 'N add-ons couldn't load; they'll come back when you're online.'

**Acceptance.** Playwright: offline reload, then online; sprites replace the placeholders without a reload.

**Merged and related.**

- Overlaps open PR #122 (failed restores retry at 15 s and 60 s; one deduped `online` listener arms a fresh round). With #122 merged, what remains is `missing` in the state push and the Overview and Stats wording.
- Related: U-28 (visible failure states), B-30.

### B-47 Dropping a folder imports every audio file inside it, reading each up to 32 MB

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** Every non-pack file under 32 MB in a dropped folder tree is read fully into memory and every .wav/.mp3/.aiff/.m4a/.ogg/.flac becomes a record, all decoded to PCM in one batch, persisted up to 64 MB, with the first one played. Dropping an add-on folder that includes music, or a Music folder by mistake, pulls hundreds of tracks in with no feedback and no way to remove them.

**Evidence.** `web/main.ts:903-918` (walkEntry recurses), `web/main.ts:959-982`, `web/main.ts:343-358`, `core/data/snd.ts:381-390`, `web/audio.ts:44-56`, `web/store.ts:193`, `web/store.ts:231-268`.

**Change.** Accept audio files only when dropped directly (depth 0, empty walkEntry prefix); inside folders consider only .rsrc/.bin/.hqx and pack files. Cap one drop at 16 sound records and 64 MB of input; report skipped files in the drop feedback (U-10). Confirm before decoding more than 3 music files ('Import 12 sounds?'). Put the filter in a pure `planDrop(paths, sizes)` in `web/drop.ts` with vitest.

**Acceptance.** (derived) Vitest `planDrop` cases: audio at depth 0 accepted, audio inside a folder skipped, the 16-record and 64 MB caps enforced, skipped files reported.

**Merged and related.**

- Merged from passes 1-7: the drop path read every file twice (head slice plus full buffer, up to 32 MB); reuse the head bytes for sniffing. Open PR #94 says it reads each file once; verify.

### B-48 After a native case drag the page never sees mouseup and may keep its pressed/grabbing state

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** A press on the case posts dragWindow and the shell runs performDrag, which consumes the mouse-up. WebKit saw mousedown but not mouseup, so `body.tankpage:active { cursor: grabbing }` may stick until the next click. Same for Osmium title-bar drags and the grow box. Plausible from the event flow; unconfirmed on a device.

**Evidence.** `web/main.ts:778-788`, `macos/Finsical.swift:335-338`, `node_modules/osmium-ui/macos/OsmiumWindows.swift:331-342` (drag), `node_modules/osmium-ui/macos/OsmiumWindows.swift:438-443` (grow loop dequeues mouseUp), `web/app.css:34-35`.

**Change.** After performDrag returns, synthesize `NSEvent.mouseEvent(with: .leftMouseUp, location: w.convertPoint(fromScreen: NSEvent.mouseLocation), modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime, windowNumber: w.windowNumber, context: nil, eventNumber: 0, clickCount: 1, pressure: 0)` and pass it to `(firstResponder as? NSView)?.mouseUp(with:)`; same when grow() exits. The tank can be fixed in Finsical (after Finsical.swift:337); client windows need the osmium-ui change.

**Acceptance.** Manual test: drag the case, release, hover: open-hand cursor, and the next click registers normally.

### B-49 Case swaps resize from the pinned top edge and can push the window off screen

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** Switching machines pins the top edge and never clamps to `window.screen.visibleFrame`; setFrame does not constrain programmatic frames, so Performa to iMac G4 near the bottom pushes the base under the Dock. The animation ignores Reduce Motion. (Tank size drift on swaps is V-03.)

**Evidence.** `macos/Finsical.swift:158-166`.

**Change.** Pass the new frame through a pure `fitted(_ r: NSRect, in vis: NSRect)` that moves it inside vis (up first, then reduce the integer tank scale if taller than vis), keeping the horizontal center where possible. Use `animate: !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion`.

**Acceptance.** Manual test: Performa at the bottom of the screen, switch to iMac G4, whole case stays above the Dock.

**Merged and related.**

- Related: V-03 (integer scale), B-27.

### B-50 Saved window frames are restored when they overlap any screen by a single point

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** OsmiumFrameStore.restore applies a saved frame verbatim if it intersects any screen's full frame. After moving from an external display to a laptop a borderless window can come back almost off screen or under the menu bar; AppKit does not constrain borderless windows and they can only be dragged by the drawn title bar. osmium-ui is a pinned git dependency, so fix app-side first.

**Evidence.** `node_modules/osmium-ui/macos/OsmiumWindows.swift:131-139` (restore), `macos/Finsical.swift:523`.

**Change.** Add a pure `static func onScreen(_ f: NSRect, visible: [NSRect]) -> NSRect` in Finsical.swift: if the top 22-pt strip intersects some visible rect by at least 44x10 pt return f; otherwise pick the visible rect with the largest overlap (or the first), shrink f to fit keeping aspect, and clamp inside. Call it after `frames.restore(window, key: "FinsicalTank")` and in B-05's showClient after host.show. Upstream follow-up: same logic in OsmiumFrameStore.restore.

**Acceptance.** Manual test: `defaults write dev.finsical.app FinsicalFrame.FinsicalPrefs '{{-5000, 900}, {565, 457}}'`, launch, Cmd-, opens fully on screen.

**Merged and related.**

- Part of the "native shell politeness" checklist (restore to a removed monitor, T-32).

### B-51 The simulation replays the same random sequence on every launch

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** The RNG seed is constant, so from the same saved state fish repeat the same first decisions and bubble pattern, and two browser tabs move in lockstep. Effect is small because saved state differs each launch.

**Evidence.** `web/main.ts:63` (`new Sim(TANK, 0x9003)`), `core/rng.ts`.

**Change.** Seed from `crypto.getRandomValues(new Uint32Array(1))[0]` in main.ts; tests keep explicit seeds.

**Acceptance.** (derived) Two launches from the same save make different first decisions; sim tests with explicit seeds still pass.

**Merged and related.**

- Related: S-07 (the save omits RNG state, so a reload is not a deterministic continuation anyway).


### B-52 Loose-mode add-on listings don't dedupe colliding basenames

Size S · Severity low · Value 2/5 · Risk 1/5 (from passes 1-7)

**Problem.** In `web/import.ts`, loose-mode (`prefix:`) listings do not
dedupe colliding basenames the way the nested-zip branch does with its
`used` set, so two rows with the same stem bind `sheetBySpecies`
last-wins.

**Evidence.** `web/import.ts` `listCollection` (loose/prefix branch vs
the nested-zip `used`-set logic).

**Change.** Copy the `used`-set suffixing into the loose-mode branch.

**Acceptance.** (derived) A loose-mode listing fixture with two entries
of the same stem yields two distinct names; existing nested-zip tests
unchanged.

**Merged and related.**

- F-23's test "nested listing of a subfolder of .fsh leaves yields
  unique names" covers the nested side.

### B-53 Simulation time stops while the tank is hidden

Size M · Severity medium · Value 3/5 · Risk 3/5 (from passes 1-8)

**Problem.** The sim is rAF-driven, so it stops when the tab or window
is hidden: uptime, hunger and day/night stall while client windows
claim live readings. Stats' "up 4h" means visible hours, not wall
hours.

**Evidence.** `web/main.ts` frame loop (the rAF clock clamps elapsed
time to 200 ms); PR #153 (open) now also suspends audio while hidden.

**Change.** A product decision first. Eighth-pass framing: prefer
no-care-penalty suspension for a relaxation toy, mark the suspended
state explicitly (grey stale numbers, U-12), and cap any catch-up
burst on wake. Alternatives: catch-up ticks on `visibilitychange`, or a
Worker-driven sim. Keep real-clock lighting (PR #155) separate from
hunger time. Verify real AppKit occlusion and minimize behavior rather
than assuming browser visibility maps perfectly.

**Acceptance.** (derived) With the chosen policy: hiding the tank for
10 minutes and returning either shows an explicit "paused while
hidden" state or advances by a capped, documented amount; Stats
wording matches ("up 4h visible").

**Merged and related.**

- F-09 (closed-app catch-up), U-12 (stale client windows), B-55.

### B-54 Emitter scenery PNGs can't be loaded by the browser

Size M · Severity medium · Value 3/5 · Risk 2/5 (from pass 8)

**Problem.** `tools/az/emit.py` writes scenery as RGBA PNG (color type
6) via `tools/az/img.py`, but both scenery loops in `web/main.ts` call
`decodeIndexedPng` (type 3 only) and silently skip failures, so
tool-built scenery never shows. Fish atlases already use the indexed
writer.

**Evidence.** `tools/az/emit.py`, `tools/az/img.py`, `web/main.ts`
scenery loops, `core/data/azpack.ts` `decodeIndexedPng`.

**Change.** Pick one contract: accept RGBA at the scenery boundary, or
emit indexed scenery (without making palette index 0 transparent in
opaque backgrounds). Add a Python-emitter-to-browser round-trip
fixture.

**Acceptance.** The fixture covers pixels, opacity, dimensions and
actual backdrop selection for bundled packs and dropped folders.

**Merged and related.**

- T-07 (shared parity corpus), T-28 (emitter output).

### B-55 Stats mixes histories across tank restarts; advice threshold off by one

Size S · Severity low · Value 2/5 · Risk 1/5 (from pass 8)

**Problem.** Overview notices `boot` changes; Stats does not clear its
history, so its trend arrows can compare different tank sessions, and
it has no stale or disconnected state. At exactly quality 0.3 the
advice permits feeding while the sim requires strictly > 0.3.

**Evidence.** `web/stats.ts` (page-local history), `web/statsmodel.ts`
advice thresholds, `core/sim.ts` `QUALITY_SEEK`. PR #154 (open) moves
the shared constants into `core/tuning.ts`; re-check the boundary
against it.

**Change.** Reset or reseed trend history on a `boot` change,
distinguish waiting, stale and live, and pin advice thresholds to the
sim's actual comparisons.

**Acceptance.** Tests for restart, delayed first contact, missed
heartbeats and threshold boundaries (quality exactly 0.3).

**Merged and related.**

- U-12 (disconnected state), F-30 (persisted history), open PR #140
  (sparklines from the same history).

## Performance and smoothness (open)

Done this pass and removed from this list: P-03, P-13, and P-10's
buffer cap (PR #88).

### P-01 Add-on caches never evict: 170 MB heap for 7 fish packs, 700 MB after browsing thumbnails

Size M · Severity high · Value 4/5 · Risk 2/5

**Problem.** `packCache` memoizes the full PackResult[] of every URL ever fetched (installs, restores, detail previews, row thumbnails) for the page's life; each holds every decoded sheet (guppy/marbangel .REZ carry 20-80 sheets, 14-19 MB decoded each) though the tank uses one sheet per pack. `zipCache` keeps raw zip bytes although IDB already persists them. The panel's `thumbs` map holds full-size preview canvases. removeAddon touches none of it. The Import webview survives closing, so browse memory stays until quit.

**Evidence.** `web/import.ts:107-131` (zipCache), `web/import.ts:437-449` (packCache/fetchAddon), `web/import.ts:537`, `web/import.ts:776-800`, `web/import.ts:1039-1057` (pumpThumbs), `web/import.ts:1083-1097`, `web/main.ts:120-133`, `web/main.ts:553-602`, `web/main.ts:607-649`, `macos/Finsical.swift:379` (closed windows keep their webview).

performance.memory after gc: empty tank 1.8 MB; 7 fish installs 170.3 MB (packCache sheets 140.6 MB, of which drawn sheets 4.0 MB; zipCache 25.7 MB). Scrolling the fish list: 84 thumbnails, 700.2 MB. Three scenery sections: 564 zips, 118 MB raw, 160 M decoded pixels.

**Change.** (1) `web/lru.ts` `lruMemo<K,V>(max)`: keeps in-flight promises, deletes rejected ones, evicts the oldest settled entry past max. (2) fetchAddon: keep packCache only while in flight (`p.finally(() => packCache.delete(url))`), or lruMemo(8); local installs stay correct because applyAddon reuses the detail pane's `rs` (import.ts:1129). (3) fetchZip: drop leaf entries once settled; keep nested collection zips in lruMemo(3) (listing reads three nested zips at once, so 2 would thrash). (4) pumpThumbs keeps calling fetchPack (so detail fetches still dedupe), then `thumbs.set(url, miniThumb(pv))` and `if (detailRef?.url !== it.url) packCacheDelete(it.url)`; showDetail/applyPack also store only miniThumb(pv); the pane keeps `shownPreview`. (5) remoteInstall calls packCacheDelete(url) after applying. Do not tombstone fishSheets slots (breaks sheetOf round-robin; chosen sheets are only ~4 MB).

**Acceptance.** Tests: vitest lruMemo (eviction order, in-flight kept, rejection removed) and 'two concurrent fetchAddon calls share one promise, a later call re-invokes the loader'; Chromium Playwright: heap after gc < 30 MB after 7 installs, packCache <= 8 after scrolling three sections.

**Merged and related.**

- Merged from pass 8 ("Bound live memory, not just IndexedDB bytes"): `zipCache`/`packCache`, sheet arrays and per-sheet raster canvases live for the session and `usePack` appends a sheet again on reinstall, so the disk LRU does not bound live objects. Use stable pack-owned sheet slots and measured, byte-aware eviction for rebuildable previews; never evict the only copy of locally imported user data. Test repeated install/remove and a long catalogue-browse session.
- Merged from passes 1-7: confirm `thumbMemo` stays within budget over long sessions, and add a temporary eviction counter for `swimCache`/`thumbMemo` to verify near-zero evictions in normal use (the other-pass branch caps `swimCache` at 1024 with LRU and `thumbMemo` at 512).

### P-02 fshToSheets decodes every sheet in a pack on the main thread; the tank uses one

Size M · Severity high · Value 5/5 · Risk 2/5

**Problem.** importAddon synchronously RLE-decodes every sprite stream (up to 80 per .REZ) and packImages decodes fish portrait BMPs that handleImages then ignores. usePack keeps one sheet and previewOf needs one frame. Installs, the launch restore and thumbnail decodes freeze the tank; the 200 ms accumulator cap then drops sim time and the next frame runs up to 6 ticks, so fish jump.

**Evidence.** `core/data/fsh.ts:73-97` (decodePixels: per-pixel closure with % and /), `core/data/fsh.ts:109-164`, `web/import.ts:346-364`, `web/main.ts:120-133`, `web/render.ts:76-88`, `web/main.ts:887-890` (launch restore), `web/main.ts:988-990` (drop), `web/main.ts:1126-1142`.

node on real packs: GP15000.REZ (80 sheets) 135 ms full vs 1.6 + 1.8 ms header-scan plus winner; GP17000 114-127 ms; ma1.rez 110 ms; DS01 53 ms. Chromium rAF gaps: gup addon1 install 400 ms, marbangel(1) 317 ms; launch restore of 11 add-ons from IDB: 383, 300, 200 ms frames; scrolling the in-page list: worst 467 ms.

**Change.** Add `sheetHeaders(d)` (walks frame records by stream_len without decoding, returning {chunkPos, groups, framesPerGroup, cellW, cellH, dims}) and `decodeSheet(d, chunkPos, palette)` to fsh.ts, reusing spriteSheet's exact validation (including `w*h <= 64*ln+0x400` and the `sw*sh > 1<<26` guard, see S-02) so the valid set is identical. Add `enum SheetPick { All, Tank, Preview, TankAndPreview }` with All the default (tools and tests unchanged). Tank decodes only the pickSwimSheet winner (B-01, run on header metadata); Preview decodes the largest-area sheet, falling back to the next if frame(0,0) throws. The panel detail fetch and the tank page use TankAndPreview (applyPack also calls h.preview; local installs reuse the detail result); row thumbnails use Preview. Key packCache by `${pick}|${url}` (or drop it per P-01). Skip packImages for fish-section blobs. Rewrite decodePixels with x/y counters (`if (++y === h) { y = 0; x++; }`).

**Acceptance.** Tests: the fsh.test.ts fixtures decode byte-identically through All and the header path; a 3-sheet pack under Tank returns exactly usePack's pick after decoding one stream; old and new decodePixels are pixel-equal.

**Merged and related.**

- PR #149 (open) adds `pickSwimSheet`; run it on the header metadata here. S-02 shares the header pass.
- Merged from pass 8: record a performance trace around a large import and a fish's first turn first; a real import showed > 50 ms main-thread tasks with nothing attributed yet.

### P-04 Imported long tracks are decoded to PCM and kept forever (Macinfish: 72 MB, re-decoded every launch)

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** addWavs decodes every imported record into `imported` for the page's lifetime, again at every launch and on every soundsLoaded. The only Sounds add-on, the JPN bonus track Macinfish.mp3 (3.28 MB, ~205 s, 44.1 kHz stereo), becomes 72.3 MB of Float32 PCM after a 461 ms decode, although it is only played once as install feedback.

**Evidence.** `web/audio.ts:44-68`, `web/audio.ts:79-81`, `web/main.ts:343-358`, `web/main.ts:534-546`, `web/main.ts:892-899`.

**Change.** In addWavs keep a record as a Blob in a `streams` map instead of decoding when its name matches none of find()'s event keys (aqua, drop, intowater, bubble, center, side, top, bottom) and it is long (WAV header over 10 s, or non-WAV over 512 KB); with B-19 in place, use `kind === 'music'`. playImported checks `streams` first and plays through one reused HTMLAudioElement with a blob: URL, revoking the previous one. Streaming a long 'aqua' WAV would silently drop the ambient loop, so that stays decoded.

**Acceptance.** Tests (fake AudioContext/Audio): a 1 MB 'Macinfish' mp3 never reaches decodeAudioData and playImported sets a blob: src; a 1 MB 'aqua' WAV is decoded and loops.

**Merged and related.**

- Related: B-19 (`kind`), F-05 (remainder, jukebox).

### P-05 The add-on list waits for the slowest catalog and silently drops failed collections

Size M · Severity medium · Value 3/5 · Risk 3/5

**Problem.** listAddons awaits all 11 collections, three of which are nested zips downloaded whole to enumerate (mekplants ~4 MB, mekaccs, the 5.6 MB JPN bonus zip just for one mp3 and a few fish). Nothing appears until the slowest finishes (12.2 s with nested zips delayed 12 s, vs 232 ms cached). A failed collection returns [] with only a console.warn: Gravel drops from 76 to 36 when gravel.zip fails, with no indication; retry only happens when everything fails. Mostly a first-run problem (IDB caches zips; listing pages have a 24 h TTL).

**Evidence.** `web/import.ts:190-239` (nested collections download whole zips), `web/import.ts:369-387` (listAddons Promise.all, per-collection catch -> []), `web/import.ts:1133-1162` (loadListing), `web/import.ts:1188-1196` (lists once per session).

**Change.** `listAddons(onSection?: (section, items, col) => void): Promise<{ items: Importable[]; failed: Collection[] }>` calling onSection as each collection resolves (items accumulate per section). loadListing shows the saved or first section once all of its collections are in, re-renders when later collections append, and keeps not-yet-loaded popup items dimmed with '(loading…)'. Show a determinate `.osm-progress` bar ('4 of 11 catalogs'). When `failed.length`, show 'Some add-ons couldn't be listed' and offer 'Try Again' retrying only the failed collections.

**Acceptance.** Tests: vitest with a stubbed fetch where gravel.zip rejects gives failed=[gravel] plus the other items, and onSection fires in resolution order; Playwright with an 8 s delay on the bonus zip only shows Fish rows within ~2 s.

**Merged and related.**

- Merged from pass 8 ("Render catalogue sections as they settle"): show cached, offline and partial status with per-section retry, and reserve download priority for the user's selection over speculative thumbnails; add progress and stall cancellation before parallelizing more work.
- Merged from passes 1-7: `listCollection`'s nested-zip mode downloads `AQUAZONE (JPN) SET.zip`, the whole item library (tens to hundreds of MB), into memory and IndexedDB (150 MB LRU budget) just to list it; the first JPN section open stalls, and swallowed `packPut` failures degrade to no persistence. archive.org offers no central-directory-only fetch, so keep the budget trim, warn in docs and monitor quota.
- PR #160 (open) lets `listAddons` list a subset of collections; reuse that for per-section loading.

### P-06 Every hello and every slider step broadcasts full state to every window

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** Each client says hello every 2 s and each hello makes the tank broadcast full state to all windows (N² with open windows; 12 pushes/10 s to Stats with Overview and Prefs open). Dragging a CRT slider sends ~29 crtConfig/s, each answered with a synchronous localStorage write and a full push to every window; in the app each push is a JSON evaluateJavaScript per window. Cost is modest.

**Evidence.** `web/main.ts:385-419` (postState), `web/main.ts:516-533` (hello -> postState at :517), `web/main.ts:665-690` (applyCrtConfig: localStorage write + postState), `web/prefs.ts:317-328`, `web/overview.ts:205-220`, `web/stats.ts:122-136`, `web/addons.ts:66-84`, `macos/Finsical.swift:376-410` (relay fans out to every window).

**Change.** `requestState()`: a leading+trailing throttle with a 1000 ms minimum gap for hello replies. `schedulePostState()`: a 100 ms trailing coalesce for state-changing paths (saveTank, setCrt, applyCrtConfig, machine). Keep crt.configure() immediate; debounce the `finsical:crt-cfg` write by 250 ms and flush it in the pagehide handler. Keep client heartbeats (they are the tank-reload recovery path).

**Acceptance.** Tests with fake timers: 100 schedulePostState calls within 100 ms give 1 post; 100 applyCrtConfig calls give 1 setItem after the debounce; with three clients each gets <= ~10 pushes per 10 s; a drag delivers <= 10 pushes/s and the final value persists.

**Merged and related.**

- Merged from passes 1-7: Overview and Stats heartbeat every 2 s with the full fish list and add-ons JSON, and four client windows each hello-poll every 2-10 s, each answered by a full push; acceptable at today's roster sizes, so push-on-change plus a slow heartbeat is the direction if rosters grow past dozens of fish.

### P-07 Launch restore downloads add-ons strictly one after another

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** restore() chains `p.then(() => fetchPack(it.url).then(applyPack))`, so on a new machine or evicted cache the total is the sum of archive.org round trips (0.8-1.3 s each; ~10 s for 11 add-ons), and B-14's wrong-species phase lasts that long.

**Evidence.** `web/import.ts:1231-1245`.

**Change.** Prefetch with concurrency 3 (pumpThumbs pattern) and apply strictly in list order (await fetched[i] in the loop), re-checking `installed.has(it.url)` (and B-38's stillWanted) at apply time so sheet slots and backdrop precedence are unchanged.

**Acceptance.** Test: vitest with out-of-order fake fetchPack resolutions still applies in list order with at most 3 in flight.

**Merged and related.**

- Related: B-38, B-14 (the wrong-species phase lasts as long as the restore), U-24.

### P-08 Move archive decoding into a Web Worker (after P-02)

Size L · Severity low · Value 2/5 · Risk 3/5

**Problem.** Even after P-02, inflate of multi-MB entries (25-71 ms in node), BMP decode of 1024x768 backgrounds and MACE decode run on the page's main thread. Chromium measured DecompressionStream on a 4.7 MB entry at a ~25 ms main-thread gap, so the benefit is small until measured otherwise. core/data has no DOM references.

**Evidence.** `web/import.ts:289-364`, `core/data/zip.ts:86-120`, `core/data/fsh.ts:148-175`, `core/data/bmp.ts`, `core/data/snd.ts:361-400`, `web/main.ts:959-997`, `package.json`, `macos/Makefile`.

**Change.** Ship P-02 first and re-measure the longest rAF gap during a gup addon1 install; build the worker only if gaps above 50 ms remain. Then split fetch and decode out of import.ts into a DOM-free `web/fetchaddon.ts`, run it in `web/decoder.worker.ts` (esbuild entry, added to package.json, the Makefile copy list and build-site), transfer idx ArrayBuffers back, and keep fetchAddon as a thin RPC with the same in-flight dedupe. Verify `new Worker('decoder.js')` loads under the finsical:// WKURLSchemeHandler, with a Blob-URL fallback.

**Acceptance.** Test: structured-clone round trip of a SpriteSheet.

**Merged and related.**

- Merged from passes 1-7: pack decode (`zipRead`, `decodeIndexedPng`, `decodePixels`) on the main thread janks the rAF loop while thumbnails decode; the 3-in-flight throttle is polite but a Worker isolates it. Same measure-first rule.

### P-09 No interpolation between 30 tps ticks: integer-pixel motion alternates 1 and 2 px steps

Size M · Severity low · Value 3/5 · Risk 3/5

**Problem.** Positions are rounded to whole tank pixels with no interpolation, so a 1.1-1.8 px/tick cruise alternates 1 and 2 px steps, and a tank pixel spans up to ~4.5 CSS px in a large window. At 60 Hz each state is held exactly 2 frames (even); at 50/75/144 Hz or with rAF jitter the hold count varies. Measured mean position error at 4.5 CSS px per tank px: 2.24 CSS px today, 0.74 with interpolation plus a 2x internal canvas. Integer motion is arguably the authentic 1997 look, so this is a style option.

**Evidence.** `web/main.ts:1031-1044`, `web/main.ts:1093-1105` (Math.round positions), `web/main.ts:1126-1142`, `core/sim.ts:205-246`, `web/crt.ts:286` (uTank from src.width).

**Change.** `enum MotionMode { Classic, Smooth }` in Preferences, Classic by default. Smooth: before each sim.tick() copy x/y into prevX/prevY on Fish/Food/Bubble (core/sim.ts); render `lerp(prev, cur, acc/step)`; new objects without prev draw at their current position. Internal canvas scale k=2 (width 640, height 400, `ctx.setTransform(2,0,0,2,0,0)`, smoothing off), positions rounded to 1/k. Pass the logical 320x200 to crt.ts for uTank so scanlines stay on game rows. Cap Smooth at ~60 renders/s; P-03's frame skip applies only in Classic.

**Acceptance.** Tests: a pure lerp helper; a crt test that uTank stays logical.


### P-10 (remainder) Two-pass CRT shader, only after profiling

Size M · Severity low · Value 2/5 · Risk 3/5

**Problem.** The CRT shader samples 13 texels per device pixel (1
sharp, 4 beam, 2 misconvergence, 2 bloom, 4 halation) and recomputes
row-resolution effects at device resolution: a full-screen tank on a
16" MacBook Pro is about 2000x1250 device px, about 32 M texel fetches
per frame. Evidence is SwiftShader-only (dsf 2: about 24 fps); on
Apple GPUs it is likely small.

**Evidence.** `web/crt.ts:24-25`, `web/crt.ts:84-112`,
`web/crt.ts:278`, `web/crt.ts:307-316`, `web/crt.ts:339-353`.

**Change.** Done elsewhere: the buffer cap (PR #88, 2x DPR) and
render-on-tick (PR #153, halves CRT passes at 60 Hz). A pure
`crtBufferSize(cssW, cssH, dpr, cap = 2560)` with crt.test.ts cases is
only needed if #88 is not merged. Attempt a two-pass FBO (pass 1 at
logical-row resolution for beam, bloom and halation; pass 2 at device
resolution for scanlines, grille, vignette and grain) only after
profiling on real hardware (Safari timeline or Instruments GPU) shows
the shader matters. Misconvergence depends on the pre-warp glass
position, so approximate it.

**Acceptance.** A profile showing the shader matters, then screenshot
diffs at `CRT_DEFAULTS` within tolerance and a measured frame-time
drop.

**Merged and related.**

- Refuted: "the two-pass FBO is exactly equivalent" (see "Declined,
  refuted and corrected").

### P-11 Machine case art ships as 15 MB of PNG

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** The ten case images are 0.87-1.81 MB RGBA PNGs (15 MB total) copied wholesale into the app bundle. A web load fetches only the selected case (~1-1.8 MB). Lossless WebP is 7.5 MB with identical pixels; WebP q95 is 2.2 MB with 0 alpha changes and no flips of the alpha < 250 mask threshold. WebKit and ImageIO decode WebP on macOS 11+.

**Evidence.** `web/assets/*.png`, `web/machines.ts:62-170`, `macos/Finsical.swift:8-11` (MIME map), `macos/Finsical.swift:169-190` (loadMaskImage), `macos/Makefile:36-39`, `media-sources/`.

**Change.** Add a dev-only `tools/optimize_assets.py` (cwebp `-lossless -exact -z 9`, or `-q 95 -exact -alpha_q 100`) converting web/assets; masters already live in media-sources/. Update the image paths in machines.ts, add `"webp": "image/webp"` to WebHandler's MIME map, and add a machines.test.ts check that every `image` exists and a Python test that decoded PNG and WebP alpha channels are identical.

**Acceptance.** Verify on macOS 12 that loadMaskImage's NSImage loads .webp and the Prefs preview renders.

**Merged and related.**

- Related: T-24 (add `webp` to the MIME map).

### P-12 imageCanvas destructures a palette array per pixel (3x slower than a Uint32 LUT)

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** `const [r, g, b] = img.palette[pi] ?? [0,0,0]` runs per pixel with four separate byte writes, for every swim frame, backdrop, strip, decor and preview: 640x480 costs 7.7 ms cold / 4.3 warm vs 2.6 / 1.7 with a LUT.

**Evidence.** `web/render.ts:41-59`.

**Change.** Extract a pure `indexedToRgba(img, opaque, mask?)`: precompute `lut[i] = (a<<24 | b<<16 | g<<8 | r) >>> 0` (a = 255 when opaque or i != 0), write `out32[i] = lut[idx[i]]` through a Uint32Array view of ImageData, and clear alpha with `& 0x00ffffff` where mask[i] === 0. Assert little-endian once.

**Acceptance.** Test against the current algorithm on random images with and without a mask.

### P-14 The native mask is re-baked with a full-image flood fill on every case switch

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** Each machine change reloads the PNG, redraws it and flood-fills ~0.9-1.3 Mpx with Swift arrays on the main thread, with no cache, plus an animated setFrame. Holding the down arrow in the Machine list repeats this per row. Unmeasured (Linux container); the non-72-dpi concern is moot (no pHYs chunks).

**Evidence.** `macos/Finsical.swift:130-167`, `macos/Finsical.swift:141`, `macos/Finsical.swift:177-255` (loadMaskImage, flood fill :231-251), `web/prefs.ts:276-289` (posts `machine` on every selection change), `web/main.ts:766-773`.

**Change.** `private var maskCache: [String: CGImage] = [:]`; `machineMaskImage = maskCache[id] ?? loadMaskImage(...)` and store it. In prefs.ts, update the preview immediately on keyboard selection changes but debounce the bus post by 150 ms.

**Acceptance.** Verify with CFAbsoluteTimeGetCurrent logging (second visit ~0 ms) and Instruments while holding down.

### P-15 Closed client windows keep their WKWebViews and WebContent processes for the session

Size M · Severity low · Value 2/5 · Risk 2/5

**Problem.** Every client webview survives closing for fast reopening; Import Add-ons holds listings, decoded previews and caches (P-01). After opening all four windows once, four extra idle web processes can live indefinitely. Not measured.

**Evidence.** `node_modules/osmium-ui/macos/OsmiumWindows.swift:281` (`isReleasedWhenClosed = false`), `macos/Finsical.swift:379-381`.

**Change.** A `DispatchSource.makeMemoryPressureSource(eventMask: [.warning, .critical], queue: .main)` in AppDelegate; on events call a new OsmiumWindowHost API `discard(_ hw:)` for hidden windows (nil the webView and window so show() recreates them). Requires an osmium-ui change (window/webView are internal(set)). Optionally discard Import Add-ons 5 minutes after it closes.

**Acceptance.** Verify with Activity Monitor and `sudo memory_pressure -l warn`.

### P-16 Swim-frame cache fills lazily mid-animation and keys are template strings

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** The first draw of each pose builds a canvas mid-frame; 110 misses cost 31.5 ms over 8 s (~0.3 ms each, not perceptible). The key is a string built per fish per frame.

**Evidence.** `web/render.ts:61-72`, `web/main.ts:253-270`, `web/main.ts:1031-1036`.

**Change.** Numeric key `group*256 + frame*2 + (facing > 0 ? 1 : 0)`. Prewarm in requestIdleCallback slices only if a profiler shows misses coinciding with dropped frames.

**Acceptance.** (derived) A key-collision unit test for the numeric key; a profile before and after showing no misses during dropped frames.

**Merged and related.**

- Merged from passes 1-7: the `swimCanvas` cache is unbounded per sheet x frame x facing (bounded by small sheet metadata; large imported sheets still allocate every combination on first use); an LRU is optional (the other-pass branch has one for `swimCache`). A fish's first turn hitches through about 16 cells of `putImageData`; prewarm the pose ring via `requestIdleCallback` after a pack installs, under the profiler condition above.
- PR #149 (open) prescales per cached frame, so the key now includes the scale; keep that in the numeric key.

### P-17 The CRT drawing buffer is reallocated on every size change during live resize

Size S · Severity nit · Value 1/5 · Risk 2/5

**Problem.** render() calls resize(), which reassigns width/height (reallocating and clearing the backbuffer) whenever the rounded box changes, every frame of a live resize or animated case swap. Likely sub-millisecond; unmeasured.

**Evidence.** `web/crt.ts:307-316`, `web/crt.ts:339-341`, `macos/Finsical.swift:160-166`.

**Change.** Keep the old buffer (CSS stretches it) and reallocate 200 ms after the last change or immediately on first enable, via a pure `nextBufferSize(cur, want, nowMs, lastChangeMs)` with unit tests.

**Acceptance.** (derived) Unit tests for `nextBufferSize` (no reallocation within 200 ms of a change, immediate on first enable); a live resize shows no flashes.

**Merged and related.**

- Related: open PR #88 (re-measures only when dirty), P-22, V-15.

### P-18 The Stats window rebuilds its whole DOM on every state push

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** render() clears rowsEl and careEl and recreates ~25 elements per push (more during slider drags, P-06), resetting selection and hover.

**Evidence.** `web/stats.ts:65-86`, `web/stats.ts:96-110`.

**Change.** Build the rows once, then update textContent and `--osm-value` in place; rebuild care lines only when `st.advice.join('\n')` changes.

**Acceptance.** (derived) Stats keeps text selection and hover across pushes; a DOM test shows rows are reused (same nodes) across two pushes.


### P-19 Per-frame allocations in `render()`

Size S · Severity nit · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** `render()` rebuilt murk and dark `rgba()` template strings
every frame and toggled `globalAlpha` per pellet.

**Evidence.** `web/main.ts` `render()` (murk and night overlays,
pellet loop). PRs #155 (night drawing) and #158 (`web/water.ts`, murk
and pellets) rewrote these paths; re-audit on top of them.

**Change.** Cache alpha strings or use a prebuilt overlay canvas;
batch pellets by alpha.

**Acceptance.** (derived) No per-frame string construction in the
render path (allocation profile); pixels unchanged in a screenshot
diff.

### P-20 Bound per-tick sim work: bubble cap and O(n²) loops

Size S · Severity low · Value 2/5 · Risk 1/5 (from passes 1-7)

**Problem.** `tap()` propagates panic but never caps bubble spawn in
foul water. The sim is O(F·P) (`nearestFood` per fish per tick) plus
O(F²) panic fan-out plus an O(F²) schoolmate `filter` per decision
(PR #112); fine under caps, the stutter vector without them.

**Evidence.** `core/sim.ts` `tap()`, panic propagation, `nearestFood`,
`decide()`; the fish cap (24) is in open PR #111; D-03's separation
adds another O(F²) term.

**Change.** A max-bubble cap (drop the oldest); keep fish and pellet
caps (pellets: U-01) so the quadratic terms stay bounded.

**Acceptance.** (derived) Sim test: 1000 taps in foul water keep
`bubbles.length` at or below the cap; a 24-fish, full-pellet tick stays
under a measured budget.

### P-21 `saveTank` writes localStorage every 10 s even when nothing changed

Size S · Severity nit · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** The roster is serialized to localStorage every 10 s even
when clean.

**Evidence.** `web/main.ts` `saveTank` interval.

**Change.** Hash (or compare) the serialized string and skip identical
writes; B-41's hidden and quit saves may still write.

**Acceptance.** (derived) Two consecutive saves of an unchanged tank
call `setItem` once (spy).

### P-22 Native `frames.save` runs on every resize tick

Size S · Severity nit · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** A UserDefaults write per frame during live resize.

**Evidence.** `macos/Finsical.swift` frame persistence
(`windowDidResize`/`windowDidMove` handlers).

**Change.** Debounce the save to about 100 ms after the last change.

**Acceptance.** (derived) Logging shows one write per resize gesture;
the frame restores after relaunch.

### P-23 Energy: Low Power Mode hook and background-sound preference

Size S · Severity idea · Value 2/5 · Risk 2/5 (follow-ups of P-03 and P-13)

**Problem.** PR #153 draws only on sim ticks and suspends audio while
hidden. The floating tank is watched while other apps are active, so it
keeps running at full rate on battery, and some users may want sound
to keep playing while the tank is hidden.

**Evidence.** `web/main.ts` frame loop (PR #153's `planFrame`),
`web/audio.ts` `setHidden` (PR #153), `macos/Finsical.swift`.

**Change.** A Low Power Mode hook (`ProcessInfo.isLowPowerModeEnabled`
plus `NSProcessInfoPowerStateDidChange`, macOS 12+) calling
`window.finsical.setPowerMode('saver')` to present every second tick;
do not trigger it on app deactivation. Preferences
`Energy { Automatic, AlwaysNormal, AlwaysSaver }` with a pure
`effectiveMode(pref, lowPower)`. An optional
`BackgroundSound { Pause, Keep }` preference (default Pause, since the
sim is frozen while hidden).

**Acceptance.** (derived) Unit tests for `effectiveMode`; with saver on,
render count over 5 s halves again in Playwright; Activity Monitor
energy before and after on a Mac.

## Visual and layout (open)

Done this pass and removed from this list: V-01 (PR #87/#125), V-02,
V-11, V-12, V-17's viewport meta (PR #90/#93; favicon is V-19) and
V-10's fish part.

### V-03 The tank is drawn at a non-integer scale; on first launch it is below its native 320x200

Size M · Severity medium · Value 4/5 · Risk 3/5

**Problem.** The canvas is CSS-stretched with nearest-neighbor to whatever layoutMachine computes, placed at fractional CSS px (Performa at 800x900: left 146.75, top 220.45, scale 1.585). Pixels come out alternately 1 and 2 device px wide and crawl as fish move (ink fluctuation 2.7-8.5% per 1-px move). The native first launch keeps the 400-pt launch height, giving a 310-pt wide Plus window whose screen is 227x142 pt: 0.71 CSS px per tank px, so ~29% of rows and columns are dropped at 1x and pixels are uneven at 2x. That frame is also below contentMinSize (369x476), so the first resize jumps. Other machines: TAM 0.66x, Performa 0.88x, iMac G3 0.78-0.82x, G4 0.83x. Case swaps keep viewBox units per pt, so the tank grows by the sw ratio (Plus to Performa +12%). The CRT path is unaffected (it resamples).

**Evidence.** `web/main.ts:735-764` (layoutMachine, fractional px), `web/app.css:36-40` (`image-rendering: pixelated`), `macos/Finsical.swift:144-157` (first applyMachine keeps the 400-pt height), `macos/Finsical.swift:145` (contentMinSize), `macos/Finsical.swift:161-166` (case swap scales by vbW), `macos/Finsical.swift:468`, `macos/Finsical.swift:502`, `web/machines.ts:62-71`, `web/main.ts:391-395` (machine payload lacks sw/sh).

**Change.**

1. Pixel crispness (web, also fixes browsers): add a pure `snapRect(r, dpr)` (round each edge to 1/dpr) in machines.ts for #screen and #screenback. For the non-CRT path use sharp-bilinear: keep #tank at 320x200 as the render target and add a visible display canvas of k*320 x k*200 with `k = max(1, ceil(screenDevicePx / 320))` from a pure `presentScale(cssW, dpr)`; nearest-blit each rendered frame and let CSS downscale it with `image-rendering: auto`; move the pointer listener to the visible canvas (it already maps through TANK constants and the rect). Do not integer-snap by shrinking: floor(455/320) = 1 would shrink the default tank to 160 CSS px inside heavy underscan.
2. Native size: add `sw` and `sh` to postState's machine payload. In Swift, a pure `frameSize(vbW:vbH:sw:sh:backing:k:) -> NSSize` with `f = min(sw/320, sh/200)`, `s = k/(backing*f)`, size `(vbW*s, vbH*s)`. On the first apply with no saved FinsicalTank frame, use the largest integer k whose height fits 0.7*visibleFrame (Plus at 2x Retina: ~437x563 pt, an exact 2x); set contentMinSize to the k=1 size; keep k on case swaps; re-snap in windowDidChangeBackingProperties. Optional: View menu 'Actual Pixels' Cmd-1 / 'Double' Cmd-2 / 'Triple' Cmd-3, and `windowWillResize(_:to:)` snapping to integer k within 3% (Option resizes freely).

**Acceptance.** 3. Tests: vitest `tankRect(machine, w, h, dpr)` / snapRect for every machine at dpr 1 and 2 (integer k, rect inside the aperture), and a TS mirror `tankWindowSize(machine, n, scale)`; Playwright screenshots at DPR 1.42 compare column-width histograms. Manual: `defaults delete dev.finsical.app`, fresh launch at 1x and 2x, no doubled or missing columns.

**Merged and related.**

- Related: B-27 (aspect-correct zoom), B-49 (case swaps), P-09 (Smooth mode also changes the internal canvas scale).

### V-04 Gravel strips are squeezed with nearest-neighbor, floor height is accidental, and the sim floor ignores it

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** A 1000-px strip is sampled every 3.1 px and becomes coloured noise (Eden, Dutch presets). Floor thickness depends on source width: bamboo 640x116 -> 58 px, jewelstone 800x176 -> 70, whitesand 999x128 -> 41, brownsand 1000x169 -> 54. The sim floor is always y=188, so fish centres sit 27 of 39 px (base strip) to 58 of 70 px (BLACK.GRV) deep inside the gravel art, and pellets rot in the bottom rows. In the original, fish went only ~23% into a 78-px strip.

**Evidence.** `web/main.ts:184-194` (pickGravel), `web/main.ts:1078-1084` (gh = h*320/w, smoothing off), `web/main.ts:1086-1091` (decor at height-6), `core/sim.ts:74` (BOTTOM_PAD 12), `core/sim.ts:229-237` (food settles at height-BOTTOM_PAD), `core/sim.ts:345`, `core/sim.ts:379`.

**Change.** (1) In pickGravel pre-render once: scale by `ART_SCALE * TANK.height / 240` (0.5 once V-05's 240-px tank lands; at 200 px a 1000x169 strip at 0.5 would be 42% of the tank) with smoothing 'high', centre-crop to TANK.width, mirror-tile narrower strips; cache in gravelByPack and draw unscaled at y = H - h. (2) Sim gets a mutable `floorY` (default height - BOTTOM_PAD) and `setFloor(y)`, replacing every `height - BOTTOM_PAD` (sim.ts:231, 345, 379); when the floor rises, fish below it glide up at <= 1.5 px/tick. main.ts calls `sim.setFloor(floorFor(gravelCv))` whenever gravel changes, with a pure `floorFor(stripH) = TANK.height - stripH + round(stripH * GRAVEL_SURFACE)`, GRAVEL_SURFACE = 0.35 until the Grvl record is decoded (verify on 3 strips by overlay screenshot). (3) Each pellet gets a seeded restY in [floorY + 4, H - 4] so pellets scatter across the bed; decor bottoms move to floorY + 4.

**Acceptance.** Tests: sim.test `setFloor(150)` keeps fish y <= 150 after 5000 ticks, pellets settle in the band, a fish at 188 is above 150 within 40 ticks with no NaN; a pure `gravelScale(w, h, tankW, tankH)` test for 1000x169 at tankH 200 and 240.

**Merged and related.**

- Merged from passes 1-7 ("Gravel finish"): feather the strip's top edge 1-2 px into the water, seat decor roots in it (open PR #139 anchors roots a quarter-strip deep) and consider a subtle noise texture over the flat `#8a6d3b` floor.
- `ART_SCALE` now exists in `web/artscale.ts` (PRs #149/#157, open).

### V-05 A 16:10 tank inside roughly 4:3 glass leaves 13-24% dead black bands

Size L · Severity medium · Value 4/5 · Risk 4/5

**Problem.** Every machine's screen rect is 1.6:1 inside a glass aperture of 1.25-1.39 (Plus 1.370, Performa 1.387, TAM 1.394, Bondi 1.273; G4 1.566). The water covers only 76-87% of the glass height and #screenback paints black above and below, which reads as dead glass. It also forces the backdrop crop in V-01. The design was intentional (and tested), so this changes a decision.

**Evidence.** `web/machines.ts:10-11` (comment), `web/machines.ts:62-178` (sx/sy/sw/sh), `web/machines.test.ts:116-118` (asserts 1.6), `web/main.ts:24` (TANK), `web/index.html:16`, `web/crt.ts:280-286`, `macos/Finsical.swift` (contentAspectRatio ~:500).

**Change.** Do the single-size step first: TANK = 320x240 (main.ts:24, index.html canvas height). Set each machine's sx/sy/sw/sh to a 4:3 rect centred in the hole with a 4-8 unit inset (the G4 pillarboxes slightly); Bare becomes vbW 320, vbH 240; Swift contentAspectRatio 320x240; update machines.test.ts:118 to 4/3. Saved fish (y <= 200) stay valid and the CRT takes its dimensions from the source at init. Backgrounds then fit 640x480 at exactly 0.5 and ART_SCALE becomes a clean 0.5. Per-machine heights (Sim.resize) only if G4 pillarboxing proves objectionable.

**Acceptance.** Tests: machines.test asserts every sw/sh is 4/3 within 1% and inside the hole; sim.test a Sim(320x240) keeps fish in bounds.

### V-06 Pitch snaps by up to 45 degrees at the start and end of every roll

Size S · Severity medium · Value 3/5 · Risk 1/5

**Problem.** pitch() has no smoothing. A fish climbing at up to 45 degrees snaps level on the tick it enters a roll, and snaps to the new angle when the roll ends: median ~15 degrees, p90 45 degrees at both ends, about 27 times per fish-minute (fewer after B-07).

**Evidence.** `core/pose.ts:31-37` (pitch: 0 during 'turn', raw heading otherwise), `core/sim.ts:266-287` (turn end sets heading at the target), `web/main.ts:1013-1025`, `web/main.ts:1031-1044` (drawFish rotates by pitch(f)).

**Change.** Keep it render-only: a `WeakMap<Fish, number>` tilt in main.ts advanced once per sim tick (like animFrame integrates on sim.tickCount) toward pitch(f) via a pure `stepTilt(prev, target)` clamped to PI/60 per tick (45 degrees in 0.5 s). During 'turn' the target is 0, so fish ease level. drawFish (and drawPlaceholder) use the tilt. If V-07 lands, feed its residual rotation through the same helper.

**Acceptance.** Test: `|stepTilt(a, b) - a| <= PI/60 + 1e-9` for random inputs; wrapAngle handled.

**Merged and related.**

- Merged from passes 1-7: fish pitch is capped at ±45°, so steep dives clip mid-pose; acceptable, noted here so nobody "fixes" it by raising the cap.

### V-07 Climb and dive rotate the pixel art although every pack ships authored pitch poses

Size M · Severity medium · Value 4/5 · Risk 3/5

**Problem.** drawFish rotates sprites up to +/-45 degrees with nearest-neighbor sampling on the 320x200 canvas, producing broken outlines; each small angle change re-samples ~27-29% of the sprite's pixels, so climbing fish visibly boil. The placeholder's rotated fillRects anti-alias to off-palette pixels. Every species has a 6-group pitch sheet (FishMaker sequences 9-14: left level, left up, right up, right level, right down, left down; art tilt ~30 degrees), unused. Some 6g sheets have only 1-2 frames (disc, tama, Denden).

**Evidence.** `core/pose.ts:31-37`, `core/pose.ts:113-125` (fishPose), `web/main.ts:1039-1043` (`ctx.rotate(pitch(f))`, smoothing off), `web/main.ts:1047-1061` (placeholder rotates with anti-aliased edges), `core/sim.ts:116-117` (TURN_RATE PI/20).

**Change.** After B-01 (and ideally F-01), pick the pitch sheet as the 6g sheet whose cellW/cellH are closest to the chosen swim sheet (never by position). Before hard-coding the group map, render the 6 groups of a real pitch sheet through swimFrame for both facings and record which reads as left-up etc. (comet: g0 level-left, g1 up-left, g2 up-right, g3 level-right, g4 down-right, g5 down-left; check angels and discus too). Extend fishPose with hysteresis kept on the fish (`f.pitchPose: -1|0|1`): enter at |pitch| > 14-15 degrees, leave at < 8; return `{sheet: 'pitch', g}`; animFrame indexes modulo that sheet's framesPerGroup. drawFish drops ctx.rotate except a residual `(pitch - sign*30deg)` clamped to +/-8-10 degrees (through V-06's stepTilt). The placeholder snaps to 0 or +/-30 degrees. Alternative for packs without a pitch sheet: quantize the drawn pitch (`quantizePitch(prevStep, pitch, PI/24, 0.6)` in pose.ts) and pre-rotate into the swim cache (4x nearest supersample, then 4:1 nearest downsample).

**Acceptance.** Tests (pose.test.ts): the four climb/dive cases, hysteresis (13 degrees after 15 stays pitched, 7 returns level), 'turn' ignores pitch.

### V-08 The CRT shader blurs the tank bilinearly: rows bleed into each other and 'Sharp' still blurs

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** Every tap interpolates between neighbouring game pixels in both axes, including the 'sharp' centre tap. Vertically colour bleeds across rows although the Softening text promises smear 'along each scan, never between rows' and the header says scanlines are locked to game rows (default scanlines are only 0.40, so it shows). With Softening at 'Sharp' (uBeam = 0) the output is still the bilinear sample. GL probe with the real FRAG on alternating 1-px red/blue rows at 3x, all traits off: only 1 of 3 device rows per game row is pure; black/green columns ramp 0/85/170/255.

**Evidence.** `web/crt.ts:49-52` (gamePx samples raw lp), `web/crt.ts:84-89`, `web/crt.ts:115-119`, `web/crt.ts:270-277` (LINEAR filtering), `web/crt.ts:343`, `web/prefs.ts:37-39` (Softening blurb).

**Change.** Add `uniform float uScale;` (device px per game px, from the `s` already computed at crt.ts:343). `vec3 rowPx(vec2 lp){ vec2 c = clamp(lp, vec2(0.5), uTank - 0.5); return texture2D(uTex, vec2(c.x, floor(c.y) + 0.5) / uTank).rgb; }` (linear in x, nearest in y) for every horizontal tap (beam +/-0.7/+/-1.6, misconvergence, bloom +/-3.5, halation +/-7); halation's +/-5 vertical taps may keep gamePx. Sharp-bilinear for the centre: `vec3 sharpPx(vec2 lp){ vec2 p = clamp(lp, vec2(0.5), uTank - 0.5) - 0.5; vec2 i = floor(p); vec2 f = clamp((p - i - 0.5) * uScale + 0.5, 0.0, 1.0); return texture2D(uTex, (i + 0.5 + f) / uTank).rgb; }` (pure nearest would give uneven widths and moire under curvature). Keep LINEAR filtering.

**Acceptance.** Test: a Playwright GL probe on 1-px red/blue rows at 3x (scanlines, curvature, beam 0): every pixel pure red or blue except at most one AA pixel per boundary; with beam = 1 rows still never mix. Add it to T-06's smoke suite.

### V-09 Plant and accessory previews show the catalog tile, not the art the tank draws

Size S · Severity low · Value 3/5 · Risk 2/5

**Problem.** previewOf uses `imageCanvas(imgs[0], true)`: for many accessories that is the catalog card with its gravel strip and black key background (BEAD_BLU/LB/RED rows are black squares) or the overhead layout view (AZ_SUB), while the tank uses pickDecorArt + keyMask. The preview well is white (.osm-well #fff), so 50% checker shadows look like noise.

**Evidence.** `web/render.ts:74-88` (previewOf renders the largest image opaque), `web/main.ts:199-220`, `web/import.ts:407` (ImportHandlers.preview), `web/import.ts:793-800`, `web/import.ts:1043-1051`, `web/import.ts:931` (THUMB_PREFIX), `web/app.css:205-207`, `web/addons.ts:32`.

**Change.** Pass the section: `preview(rs, section)` in ImportHandlers and both callers (main.ts:368, addons.ts:32). Move decor canvas creation from addDecor into render.ts as `decorCanvas(images)` (pickDecorFrames from B-22, frame 0, keyMask) shared by addDecor and previewOf for plants/accessories; gravel previews use the widest w >= 3h strip. Give `.ipreview` the tank gradient (#2e7fc4 -> #14508c) and optionally a size line ('80 x 55 in the tank'). Bump THUMB_PREFIX to 'thumb2:'.

**Acceptance.** Test: vitest decorCanvas prefers the uniform-corner frame over a textured-corner 83x83 tile.

**Merged and related.**

- PR #157 (open) adds `decorCanvases(images, tankH)` to `web/render.ts` (pickDecorFrames, key, shrink), but `previewOf` still renders `imgs[0]`: reuse `decorCanvases` here instead of writing a new `decorCanvas`.


### V-10 (remainder) Scenery and decor thumbnails: slivers and aliasing

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** The fish half landed in PR #149 (canonical right-facing
profile, new thumb key). Still open: gravel strips shrink to 38x6
slivers, large art shrinks 10-30x with nearest-neighbor, and plants and
accessories use the in-tank art rather than their catalog icon as the
list thumb.

**Evidence.** `web/main.ts:430-440` (scaledThumb), `web/import.ts:491-501`
(miniThumb), `web/import.ts:931` (thumb prefix).

**Change.** Gravel and backgrounds crop a centred 38x28 window from the
ART_SCALE-prescaled canvas (V-04; V-01's cover-cropped backdrop) via a
pure `thumbCrop(srcW, srcH, 38, 28)`. Downscales above 2x use
`imageSmoothingQuality 'high'`. Plants and accessories use the pack's
83x83 catalog icon (the image `cornerKey` rejects) as the list thumb.
Bump the thumb prefix so old slivers regenerate.

**Acceptance.** `thumbCrop` unit test; a screenshot of the Gravel list
shows readable 38x28 swatches.

### V-13 The Preferences machine preview shows a blank white screen

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** The case art has a transparent glass cut-out over a white well, so every machine looks switched off and the baked-in glass reflections are invisible. 'Bare tank' (no image) is an entirely blank well.

**Evidence.** `web/prefs.ts:296-304` (paintPreview), `web/app.css:79-84` (#pfpreview #fff), `web/main.ts:734-764`.

**Change.** In paintPreview, when m.hole is set, prepend `<rect>` at hole +/- SCREENBACK_HOLE_PAD filled #050505, then a `<rect>` at sx/sy/sw/sh with a #2e7fc4 -> #14508c linearGradient, then the shell `<image>`; for 'bare' draw just the gradient at 0,0,320,200. Optional follow-up: bus op 'wantSnapshot'; the tank replies with a 160x100 canvas data URL at most once per second while the Machine pane is visible, drawn as an `<image>` at sx/sy/sw/sh beneath the shell.

**Acceptance.** (derived) Every machine in the Preferences list previews water in its glass (screenshot per machine), Bare tank included.

**Merged and related.**

- Overlaps open PR #147 (`previewMarkup()` layers an aperture backplate, water gradient, gravel, three placeholder swimmers and a bubble trail under the shell art for all 11 cases and Bare tank). With #147 merged only the optional live-snapshot follow-up remains.

### V-14 CRT shader runs at mediump and its time uniform wraps every 100 s

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** On GPUs where mediump is fp16 (common on mobile; the web build supports touch), `fract(sin(dot(p, ...)) * 43758.5453)` collapses (dot can even overflow fp16's 65504 and give NaN), so Noise becomes a constant darkening; gl_FragCoord is exact only to 2048 px. Separately, uTime wraps at 100 s, so `sin(uv.y*3 - uTime*4)` jumps 4.16 rad and `sin(uTime*61)` is discontinuous: the rolling band hops every 100 s (amplitude 0.03*flicker, barely visible). Not reproducible on desktop GPUs.

**Evidence.** `web/crt.ts:25` (`precision mediump float`), `web/crt.ts:54-56` (sin hash x43758), `web/crt.ts:122-127` (grille), `web/crt.ts:131-134`, `web/crt.ts:347-349` (uTime % 100).

**Change.** (1) `#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif` (the real fix wherever highp exists). (2) Mediump-safe hash: `float hash(vec2 p){ p = mod(p, 256.0); return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }` (the inner fract keeps the product < 53). (3) Wrap uTime at 32*PI (~100.53 s): 61*32PI and 4*32PI are whole multiples of 2*PI, so flicker and the band stay continuous; grain uses fract(uTime) and is unaffected. Leave the grille expression.

**Acceptance.** Verify on an iPad: log `getShaderPrecisionFormat(FRAGMENT_SHADER, MEDIUM_FLOAT).precision` and compare grain.

**Merged and related.**

- Corrected claim from pass 8: `uTime` already wraps every 100 s and grain uses `fract(uTime)`, so "wrap more often" alone is not a fix; this entry's 32·π wrap (continuous flicker and band) and the mediump-safe hash are the verified versions.

### V-15 Mask layer changes animate implicitly, so case edges lag during live resize

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** The mask is a standalone CALayer/CAShapeLayer with no delegate, so frame, contents and path changes get CoreAnimation's default 0.25 s implicit animation; during live resize the mask trails the window and clips the growing bezel, and a case swap cross-fades silhouettes. Not seen on a device.

**Evidence.** `macos/Finsical.swift:262-301` (syncMask), `macos/Finsical.swift:312-316`.

**Change.** Wrap the body of syncMask in `CATransaction.begin(); CATransaction.setDisableActions(true); defer { CATransaction.commit() }`. Do not bother with contentsScale (the image is stretched with `.resize` and the assets have no pHYs).

**Acceptance.** Manual test: fast bottom-right live resize of the Plus tracks the pointer; a Preferences case switch swaps the silhouette with no cross-fade.

**Merged and related.**

- Needs a macOS check (T-32).

### V-16 The window shadow is not recomputed when the transparent silhouette changes

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** AppKit derives a transparent window's shadow from its content alpha and does not refresh it without `invalidateShadow()`, which is never called. The first frame happens at script run, before the case PNG has painted, so the shadow may follow an incomplete or earlier outline. Needs a device check.

**Evidence.** `macos/Finsical.swift:142-143`, `macos/Finsical.swift:262-301`, `macos/Finsical.swift:498-499`, `web/main.ts:766-775` (applyMachine), `web/main.ts:792`.

**Change.** In applyMachine, after setting shellEl.innerHTML, wait for the `<image>` `load` event plus two requestAnimationFrame calls, then `bus.post({op: 'shellPainted'})`. In userContentController handle 'shellPainted' from the tank (not relayed) with `window.invalidateShadow()`; if that has no effect on a layer-backed window, toggle hasShadow off and on.

**Acceptance.** Manual test: Plus, iMac G4, Bare; the shadow follows each outline.

**Merged and related.**

- Needs a macOS check (T-32).

### V-18 The add-on detail line uses a middle dot that the Geneva 10 bitmap font lacks

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** `${KIND} · archive.org` renders in .imeta (Osmium Geneva 10), which has no U+00B7, so that one glyph falls back to an anti-aliased system font. Charcoal 12 has it; every other non-ASCII UI glyph is covered.

**Evidence.** `web/import.ts:785-786`, `node_modules/osmium-ui/src/fonts/geneva10.ts`, `node_modules/osmium-ui/src/fonts/geneva9.ts`.

**Change.** Use ', ' (Finder Get Info style) or a spaced U+2014 dash (present in Geneva 10), or add U+00B7 to Osmium's Geneva 9/10 strikes upstream (Mac Roman 0xE1 exists in the original). T-03 replaces the line with a source credit anyway.

**Acceptance.** (derived) A screenshot of the detail line shows no anti-aliased fallback glyph.


### V-19 Favicon

Size S · Severity nit · Value 1/5 · Risk 1/5 (V-17's remainder plus passes 1-8)

**Problem.** No page has a favicon, so browser tabs show a blank icon
and log a `/favicon.ico` 404.

**Evidence.** `web/index.html` and the four client pages;
`media-sources/icon-finsical.png`.

**Change.** Add `<link rel="icon" href="assets/icon-32.png">` (generated
from `media-sources/icon-finsical.png`) to all pages. Note on V-17's
viewport meta (done in PRs #90/#93): V-17 proposed it for
`web/index.html` only, since the four client pages are fixed-size
Osmium windows that would overflow at 390 px, while PR #93 adds it to
all five pages; check each client page on a phone before merging #93.

**Acceptance.** (derived) No favicon 404 in the console; the tab shows
the icon. When merging #90/#93, V-17's viewport check applies:
Playwright's iPhone 13 descriptor gives innerWidth 390, the overlay
card gets class 'inarrow' and `#opentrigger` clears the home indicator
(`env(safe-area-inset-*)` is non-zero).

### V-20 Scene-life leftovers: sway for single-frame decor, fish shadows

Size S each · Severity idea · Value 3/5 · Risk 1/5 (from passes 1-7)

**Problem.** The ranked scene-life list was: plant sway, light rays,
caustic dapple, fish drop shadows, tumbling crumbs. PR #158 delivered
sun shafts, caustics and tumbling flakes; PR #157 animates decor that
ships frames. Still open: a sine x-shear by height for single-frame
decor (so static plants sway too) and fish drop shadows on the gravel.
A-01 also proposed an "Animated water" preference (default on); PR
#158 does not have one (it only follows prefers-reduced-motion), so
that preference is open here too.

**Evidence.** `web/main.ts` decor draw; `web/water.ts` (PR #158).
Other-pass branches (`feature/light-rays-night`, round bubbles) exist;
check them before reimplementing.

**Change.** One effect per PR: (1) shear static decor rows by
`sin(t + phase) * k * (1 - y/h)`; (2) a 1-2 px dark ellipse under
each fish at the floor line, alpha by depth.

**Acceptance.** (derived) Screenshot checks; reduced motion holds the
sway still; no change for decor that has frames.

### V-21 Pellet eaten animation

Size S · Severity idea · Value 2/5 · Risk 1/5 (from passes 1-7)

**Problem.** Eaten pellets vanish in one frame.

**Evidence.** `web/water.ts` pellet drawing (PR #158); `core/sim.ts`
`food.eaten`.

**Change.** A render-only shrink or rotate over 3-4 frames before the
splash, keyed on the eat tick.

**Acceptance.** (derived) A pure frame-envelope test; screenshot of a
pellet mid-shrink.

### V-22 Adaptive murk tint and shimmer

Size S · Severity idea · Value 2/5 · Risk 1/5 (from passes 1-7)

**Problem.** Murk uses a fixed tint (green-brown after PR #158). Tinting
toward the backdrop's dominant color would look less pasted on, and a
slow sine shimmer would read as water, not jelly.

**Evidence.** `web/water.ts` murk (PR #158); V-12's `murkParams(q)`.

**Change.** Compute the backdrop's mean color once in `pickBackdrop` and
blend it into `murkParams`; add a low-frequency alpha shimmer (off
under reduced motion).

**Acceptance.** (derived) `murkParams` unit test with a supplied
dominant color; reduced motion keeps alpha constant.

### V-23 Night ambience: glow, reflections, bezel tint, desk lamp, stars

Size M · Severity idea · Value 3/5 · Risk 2/5 (from passes 1-8)

**Problem.** Night now renders as moonlit blue (PR #155). Earlier ideas
for making night lovely are unbuilt: faint bottom bioluminescence at
very low light; a low-opacity mirrored reflection layer behind the
machine glass; the case art dimming with `sim.light` via a CSS filter
(night-light bezel tint); a "desk-lamp evening" with a subtle optional
warm room reflection around the cool tank and a steady night setting;
stars or a room reflection on the bezel at night.

**Evidence.** `web/main.ts` `layoutMachine`/shell SVG; `core/light.ts`
(PR #155).

**Change.** Pick one per PR. Constraints: no per-frame full-resolution
reflection canvas; composition guardrails (Design notes) apply; prefer
a soft blue tint over crushing to black.

**Acceptance.** (derived) Screenshots at light 1.0, 0.45 and 0.3; frame
time unchanged within noise.

### V-24 `#opentrigger` overlaps the case's rounded corner

Size S · Severity nit · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** On some machines the touch "Add-ons…" trigger sits over the
case's rounded corner.

**Evidence.** `web/main.ts:805-822` (touch button), `web/app.css`.

**Change.** Position it from the machine's opaque bezel rect (viewBox
units) rather than the window corner.

**Acceptance.** (derived) Screenshots for all 11 machines at a phone
size show the trigger fully on the bezel.

### V-25 Bright fish over bright backdrops wash out

Size S · Severity idea · Value 2/5 · Risk 1/5 (from pass 8)

**Problem.** Pale scenery can wash out light sprites.

**Evidence.** `web/main.ts` `drawFish`; light backgrounds in the JPN
set.

**Change.** A subtle darker 1 px outline on fish, or slight backdrop
dimming behind fish only when contrast is low.

**Acceptance.** (derived) A contrast check on a pale backdrop fixture;
screenshot comparison.

## UX and convenience (open)

Done this pass and removed from this list: U-05, U-16, U-17, U-19,
U-02 points 1-3 and 5, and U-20's accessible tank name (PR #90).

### U-01 A few extra food clicks foul the whole tank within a minute, with no warning

Size S · Severity medium · Value 4/5 · Risk 2/5

**Problem.** Every click in the top 15% drops a pellet whether or not anyone is hungry. With 4 sated fish: 1 pellet dips water to 0.89, 3 to 0.44, 5 to 0.00 about 61 s after dropping (0.15 at 120 s). Below 0.3 fish stop eating and slow down under brown murk, and full recovery takes ~6.7 minutes. The top of the tank is exactly where a curious new user clicks, so the main interaction punishes playing. One Feed Fish with 7 hungry fish feeds only 1.

**Evidence.** `core/sim.ts:88-92` (WASTE_PER_TICK 1/6000, FILTER_PER_TICK 1/12000, FOOD_ROT_TICKS 1350), `core/sim.ts:174-178` (dropFood), `core/sim.ts:228-240`, `core/sim.test.ts:88-100`, `web/main.ts:100-111`, `web/main.ts:794-797`, `web/main.ts:1111-1116`.

**Change.** (1) `export const MAX_UNEATEN = 6`; `Sim.dropFood(x): boolean` returns false (nothing pushed) once `food.filter(f => !f.eaten).length >= MAX_UNEATEN`; main.ts plays audio.feed() only on true and shows a ripple otherwise (U-03). (2) WASTE_PER_TICK = 1/10000; it must stay above FILTER_PER_TICK or single-pellet rot never shows and the existing rot test fails; the worst case at the cap leaves water ~0.30, so only sustained overfeeding fouls the tank. Update the comment at sim.ts:89. (3) feedFish drops N = clamp(fish with hunger > 0.4, 1, 5) pellets at 160 +/- 24*k, 3 ticks apart via a pending queue drained in frame().

**Acceptance.** Tests: 20 dropFood calls with sated fish leave water >= 0.25 after 60 s; dropFood returns false at the cap; one feed with 5 hungry fish feeds at least 3; existing rot and filter tests pass.

**Merged and related.**

- Merged from passes 1-8 (pellet cap): avoid an evict-oldest cap that lets repeated feeding erase waste for free (`MAX_UNEATEN` refusing new pellets is fine); add gentle overfeeding feedback, since fouling within about a second of overfeeding reads as broken. Test sustained input, settled waste and feeding fairness. The fish cap (24) is in open PR #111.
- PR #158 (open) already makes Feed Fish scatter 3-5 pellets (a fixed random pinch, not the hunger-based count proposed in point 3); reconcile point 3 with it. PR #154's opportunistic eating (B-10) reduces rot from ignored pellets.

### U-02 (remainder) Placeholder fish, first-run guidance and placeholder thumbs

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** PR #160 (open) adds the alert module, the first-run
"Stock the Tank" offer, the starter set and the quiet pack-manifest
404. Still open is U-02's point 4: when the user declines, the four
stand-ins remain 14x8 orange blocks over a flat brown bar, and nothing
in the tank points at Import Add-ons.

**Evidence.** `web/main.ts:56-76` (DEFAULT_FISH), `web/main.ts:1046-1068`
(drawPlaceholder), `web/main.ts:1081-1083` (flat floor),
`web/render.ts:12-29` (gridCanvas).

**Change.** Placeholders that remain are named "Starter fish", drawn as
2-3 hand-made 16-colour `gridCanvas` sprites with a 2-frame tail, over
seeded 3-tone dithered sand prerendered once; a dismissible
Balloon-style hint ("Choose Tank > Import Add-ons… (Cmd-I) to stock
your aquarium") while `installedAddons` is empty.

**Acceptance.** (derived) Playwright: a fresh context that declines the
welcome shows named "Starter fish" in Overview and the hint; the hint
disappears after the first install and never returns once dismissed.

**Merged and related.**

- Overlaps open PR #131 (first-run hint note at the foot of the tank,
  auto-hides on first install, and a hand-drawn 24x14 pixel guppy with
  a two-frame tail wag) and the other-pass `feature/placeholder-fish`
  branch: reconcile rather than build a fourth placeholder.
- Merged from passes 1-7: placeholder fish get no Overview thumbnail
  (the pending-thumbs key stays alive by design); give them a
  placeholder thumb so the list never looks broken.
- Merged from passes 1-7 ("empty-state first-run tour"; "no first-run
  pack guidance in-tank"): point at Import Add-ons, F to feed and
  click to knock; show in-tank guidance when the bundled pack fails to
  load instead of console-only feedback. A-05's first-run balloons
  would subsume the tour.

### U-03 Feeding and tapping give almost no feedback: no cursor hint, a 3-px pellet, silence by default

Size M · Severity medium · Value 4/5 · Risk 2/5

**Problem.** Two invisible click zones (top 15% feeds, lower taps the glass) share the default arrow; a tap more than 48 px from any fish changes nothing; Finsical ships no samples and the only Sounds add-on is music, so both actions are silent for nearly every user.

**Evidence.** `web/main.ts:100-111` (zones split at y < 0.15*height, no pointermove handler), `web/main.ts:1093-1099`, `web/app.css:28` (`#screen { cursor: default }`), `web/app.css:34-35`, `web/audio.ts:128-148`, `web/render.ts:12-29` (gridCanvas), `web/icons.ts:11-13`.

**Change.** (1) Cursors: new `web/cursors.ts` with original 16x16 pixel grids (Osmium sprite keys) for SHAKER (hotspot at the spout), KNUCKLE (hotspot at the knuckles), HAND_OPEN, HAND_CLOSED, rasterized with gridCanvas at 1x and 2x into data URLs; CSS `-webkit-image-set(url(1x) 1x, url(2x) 2x) hx hy, url(1x) hx hy, pointer`. Factor the letterbox math into a pure exported `mapToTank(rect, clientX, clientY, tank)` and `zoneAt(y): 'feed' | 'tap'`, shared by pointerdown and a new pointermove that sets canvas.style.cursor; a tipped shaker for 150 ms on pointerdown; hands outside the tank rect. The CRT canvas passes pointer events through, so this works with CRT on (combine with B-35). (2) Visual echo: `ripples: {x, y, t0, kind}[]` drawn after bubbles: a tap is a 1-px ring growing radius 2 -> 14 over 12 frames at alpha 0.6 -> 0; a feed is a flattened ring at SURFACE. (3) Fallback sounds when find() returns null: a synthesized 60 ms band-passed noise knock for taps and a 120 ms 600 -> 300 Hz sine plop for feeding; imported samples take precedence.

**Acceptance.** Tests: unit-test zoneAt and mapToTank; Playwright: a click with no fish nearby changes pixels within 8 px of it inside 100 ms.

**Merged and related.**

- Overlaps open PRs #106, #107 and #129 (three competing tap-ripple and splash implementations), #143 (feed-zone crosshair and a bright 1 px boundary under the pointer, `containPoint` letterbox math) and #106 (drag-to-feed). With those merged, point (2) is done and the cursor work narrows to shaker/knuckle art.
- Merged from passes 1-7: `cursor: grab` on `body.tankpage` suggests window-drag in plain browsers where it does nothing; the feed affordance still lacks a crumb trail and a "plip" on drop; a touch long-press could be the scare/knock gesture; on touch the feed-vs-tap split is hard to discover even with a menu bar (a first-use hint helps).
- Related: B-35 (CRT pointer mapping), U-18.

### U-04 Removing a fish or add-on is instant and permanent: no confirmation, no Undo

Size M · Severity medium · Value 4/5 · Risk 3/5

**Problem.** A slip of the Delete key in Tank Overview permanently loses a fish; removeAddon also deletes all its fish and scenery. The Edit menu has no Undo.

**Evidence.** `web/overview.ts:106-118` (Remove button, plain Delete/Backspace), `web/main.ts:520-521`, `web/main.ts:553-602` (removeAddon), `core/sim.ts:156-159`, `core/sim.ts:167-172`, `macos/Finsical.swift:578-585` (Edit menu without Undo), `web/import.ts:1236`.

**Change.** (0) Cheap guard first: in overview.ts require Cmd-Delete (Mac OS 8 Finder's Move to Trash; Ctrl in a browser), ignore plain Delete. (1) Pure `web/trash.ts`: a stack capped at 10 of `{kind:'fish', fish} | {kind:'addon', it, fish: Fish[]}`, pushed from the removeFish and removeAddon handlers. (2) Bus op 'undo': a fish comes back via `sim.addFish(savedFish)` (keeps its id); an add-on goes back into installedAddons, then `importPanel.restore([it])` (works once B-37 notifies the panel of removals), then the fish are re-added and remapSheetIdx() runs. (3) State carries `undo: string | null` ('Undo Remove “angels”'); native Edit > Undo Cmd-Z evaluates `window.finsical.undo()` with the title validated from the last push; Overview binds Cmd/Ctrl-Z. (4) Before removing an add-on that has fish, a caution alert (U-02's alert module): 'Remove “angels” and its 2 fish from the tank?' [Cancel] [Remove].

**Acceptance.** Tests: vitest trash.ts; Playwright remove then Ctrl+Z restores the count and species; plain Delete no longer removes.

**Merged and related.**

- Merged from pass 8: prefer one-level Undo with a named action and shortcut; keep selection stable after removal and announce the result; test repeated keydown, focused text fields, pack-wide removal and delayed state echo. Open PR #127's two-click arm ("Really empty?") is the in-page confirm pattern, because `confirm()` silently returns false in WKWebView. PR #160's `web/alert.ts` (open) provides point (4)'s alert.

### U-06 Overview statuses mislead: hidden scenery says 'In tank', a fish add-on with no fish stays listed, the header miscounts

Size S · Severity low · Value 3/5 · Risk 2/5

**Problem.** Only the newest gravel and background are drawn, yet every installed one reads 'In tank' and is ticked in the importer; removing a hidden one changes nothing visible, and the only way back to an earlier one is the confusing 'Add Again'. Removing the last fish of a fish add-on makes a new row 'aetena, Fish add-on, In tank' appear; its sheet still feeds loose fish, so it is not truly unused. The header says '8 fish, 0 add-ons' with add-ons installed.

**Evidence.** `web/overviewmodel.ts:72-85` (status hard-coded 'In tank' at :81), `web/overview.ts:161-170` (header counts unbound add-on lines at :168), `web/main.ts:157-194`, `web/main.ts:385-419`, `web/main.ts:520-522`, `web/main.ts:578-587`, `web/import.ts:686`, `web/import.ts:822-824`.

**Change.** Keep the per-pack fallback design (removing the newest gravel falls back to the previous one). Add `scenery: {gravel: gravelSrc, backdrop: backdropSrc}` to postState. In itemsOf: gravel/backgrounds/tanks get 'In use' or 'Not shown'; a fish add-on with no bound fish gets 'No fish'. Header counts `(s.addons ?? []).length`. Double-click on a 'Not shown' row (mountList onOpen) posts `{op: 'useScenery', url}`: the tank promotes that key (B-20's promote), sets the current canvas, saves and posts state. After removing a pack's last fish, select the add-on row that appears (key `a:${pack}`) so a second Delete uninstalls it. Do not auto-uninstall or auto-replace.

**Acceptance.** Tests: overviewmodel.test.ts for the three statuses and the count.

**Merged and related.**

- Overlaps open PR #118 (Overview "Use" action; rows show "Showing"/"In tank"). Related: B-20.

### U-07 Import Add-ons: double-click does nothing; no search field, remembered position or section counts

Size M · Severity low · Value 4/5 · Risk 2/5

**Problem.** In the Chooser and Standard File, double-clicking an item triggers the default button; here it does nothing. Sections are long (395 accessories, 165 fish, 93 plants) and type-select times out after 1 s. Switching sections resets scroll and selection.

**Evidence.** `web/import.ts:564-601`, `web/import.ts:660-677` (mountList without onOpen), `web/import.ts:696-714`, `web/import.ts:789`, `node_modules/osmium-ui/src/controls.ts:752`, `node_modules/osmium-ui/src/controls.ts:920-923`, `node_modules/osmium-ui/src/controls.ts:938` (type-select resets after 1 s), `web/overview.ts:95-99`.

**Change.** (1) `onOpen: (i) => { if (installed.has(rows[i]?.url ?? '')) return; if (addAction) addAction(); else openWhenReady = rows[i]?.url ?? null; }`; at the end of showDetail's fetch, when `detailRef === ref && openWhenReady === it.url`, call offer() then addAction() (onSelect already started the fetch; addAction is null until it loads). (2) An edit-text field in .ihead right of the popup (`.ifind { border: 1px solid #000; box-shadow: inset 1px 1px #888; font: var(--osm-font-small) }`) filtering rows by case-insensitive substring on inner and source through the same path as showSection (keeps the IntersectionObserver in sync); Escape clears it. (3) `Map<section, {scrollTop, url}>` restored in showSection. (4) Counts in the popup ('Accessories (395)').

**Acceptance.** Tests: Playwright double-click adds one fish, not on an installed item; typing 'wood' filters to the WOOD* rows.

**Merged and related.**

- Point (2) overlaps open PR #136 (substring filter in the add-on browser header, case-insensitive, per section, "N of M" count, Escape clears the field). With #136 merged, what remains is double-click to add, remembered scroll and selection per section, and section counts.

### U-08 Add-on lists are unsorted, split by case, and duplicates across archives look identical

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** Sections concatenate collections in COLLECTIONS order, each in case-sensitive archive order: Plants starts 'Salma Large, Salma Small, Silver Reed, APONOGET…'; 'black'/'BLACK', 'marble'/'Marble', 'stream'/'Stream' sit far apart in Gravel; 'MekaUni' appears twice in Accessories (US mekaccs.zip and JPN) with identical '<Kind> · archive.org' meta.

**Evidence.** `web/import.ts:37-60` (Collection), `web/import.ts:369-387` (listAddons), `web/import.ts:785-786` (dmeta).

**Change.** Add `source: string` to Collection ('AquaZone add-ons', 'Meka Asia pack', 'AquaZone (JPN) set', 'JPN non-retail bonus') and copy it onto each Importable (identity stays the url). Sort each section by `(rank) || a.inner.localeCompare(b.inner, 'ja', { sensitivity: 'base', numeric: true })`. Show `${KIND}, ${it.source}` in dmeta (see V-18, T-03).

**Acceptance.** Test: vitest listAddons with stubbed collections returns case-insensitively sorted names per section with source set.

### U-09 Failed installs from Import Add-ons show raw JavaScript errors with full URLs

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** When the tank's fetch fails the window shows e.g. "Couldn't add it: Error: https://archive.org/download/.../arowana.zip: 503" or "TypeError: Failed to fetch"; the local path already maps errors through loadProblem().

**Evidence.** `web/main.ts:607-649` (remoteInstall `fail(String(e))` at :648), `web/import.ts:518-529` (loadProblem), `web/import.ts:1205-1211` (`Couldn't add it: ${m.error}` at :1209).

**Change.** In remoteInstall's catch: `console.warn('remote install failed:', e); fail(loadProblem(e));` (main.ts already imports from ./import.js). Change import.ts:1209 to `Couldn't add it. ${m.error}`, matching the local 'Couldn't load it. …' style.

**Acceptance.** Vitest loadProblem cases: `new TypeError('Failed to fetch')`, an Error ending ': 503' ('archive.org answered with error 503.'), 'no pack inside'.

**Merged and related.**

- Related: U-28.

### U-10 Dropped files get no highlight and no result message on the tank or the Import window

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** Drag-and-drop is an advertised path (the Sounds pane says to drop files 'on the tank or this window'), but nothing shows a drop target and success or failure only reaches the console; success on Import Add-ons is only audible.

**Evidence.** `web/main.ts:919-1001` (dragover only preventDefaults; every outcome at :945-999 goes to console, oversize skips at :969-972 silent), `web/addons.ts:38-67` (console.warn only; silent return on no records), `web/import.ts:740-743` (invites drops).

**Change.** Count dragenter/dragleave to toggle `body.dropping` and draw the Mac OS 8 drop hilite in CSS (2 px black inset plus a 1 px white inner rule around #screen). After the async import, show a transient Osmium caption box in the screen corner for 3 s ('Added Angelfish', or "Finsical can't use “notes.txt”. Drop an AquaZone .fsh pack, a .azpack folder or a sound file."). Expose `showMessage(text)` on the mountImportPanel return object and use it in addons.ts ('Added N sounds.', 'Nothing to import: that file has no sounds. Drop fish packs on the tank window.', "Couldn't save the sounds."). Optional: forward dropped pack files to the tank (packPut under `drop:{name}` and `{op: 'importDropped', key}`).

**Acceptance.** Tests: Playwright synthetic drop of a .txt shows the caption; a 4-byte bogus file on addons.html shows the status text.

**Merged and related.**

- Related: U-28, B-13, B-47.

### U-11 Overview rows reshuffle under the pointer when sorted by Status

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** Status text includes transient states ('Turning' ~10 ticks, 'Startled' ~1 s), so each 2 s heartbeat can reorder rows (12 order changes in 30 s with 4 fish). Selection follows the key, so Remove removes the right fish, but a click can land on a row that just moved.

**Evidence.** `web/overviewmodel.ts:44-47` (STATES; 'Turning' at :46), `web/overviewmodel.ts:89-96` (sortItems compares text at :94), `web/overview.ts:161-200`, `core/sim.ts:126` (TURN_TICKS 10).

**Change.** Map `turn` to 'Swimming'. Sort Status by `hungerRank*10 + stateRank` (hungry 0, peckish 1, full 2), then name, instead of text. Optionally defer structure-changing re-sorts while `listEl.matches(':hover')` and flush on pointerleave.

**Acceptance.** Test (overviewmodel.test.ts): fish differing only in turn/drift keep their order; hungry sort before full.

### U-12 Client windows never say when the tank is not connected

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** With no tank (browser dev, tank tab closed or reloading), Add to Tank spins 15 s before 'No response from the tank', Overview's Remove posts into the void, Stats shows stale numbers as live, and Overview is blank before the first push. The native tank lives as long as the app, so this is mostly browser-side.

**Evidence.** `web/addons.ts:15-19`, `web/import.ts:841-851` (15 s timeout), `web/overview.ts:106-118`, `web/overview.ts:161-166`, `web/stats.ts:92-107`.

**Change.** Each page records `lastStateAt` in its state handler and checks `Date.now() - lastStateAt < 6000` every second. Overview: placard 'Waiting for the tank…' and Remove disabled while disconnected. Stats: .osm-disabled look on #srows plus a 'Waiting for the tank…' care line. Import: `PanelOptions.connected?: () => boolean`; addIt shows "The tank isn't running." immediately instead of posting.

**Acceptance.** Tests: Playwright with no tank, Add shows the message at once; after closing the tank, Stats shows 'Waiting…' within 7 s.

**Merged and related.**

- Merged from passes 1-7: grey client-window numbers until the first fresh push after wake ("stale badges").
- Open PR #90 added Overview's "Waiting for the tank…" empty text at mount. Related: B-53, B-55.

### U-13 Preferences: CRT controls stay clickable when WebGL is unavailable

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** With `crt.available === false` the warning shows but 'Simulate a CRT monitor' stays enabled (a click checks it, then the echo unchecks it), Defaults stays enabled while every slider it resets is dimmed, and the footer still says to turn the effect on.

**Evidence.** `web/prefs.ts:171-181` (state handler), `web/prefs.ts:233`, `web/prefs.ts:426-442` (syncEnabled), `web/prefs.ts:446-459`, `web/prefs.html:28-35`, `web/app.css:91`.

**Change.** In the state handler `setEnabled(onBox, crt.available !== false)`; in syncEnabled `defaultsBtn.disabled = !onBox.checked`; while unavailable, describe(null) shows "This Mac can't show the CRT effect. Settings are kept." instead of the pane's offHint.

**Acceptance.** Test: Chromium with --disable-webgl at 565x457; checkbox and Defaults disabled.

### U-14 The browser build has no menu bar: Preferences and Overview are reachable only by URL

Size M · Severity low · Value 3/5 · Risk 2/5

**Problem.** Desktop browsers show no controls; shortcuts are undocumented; prefs.html and overview.html must be typed. On touch the only control is a tiny 'Add-ons…' button, so an iPad cannot remove fish, change the machine or open stats. The README ships a Mac app and there is no hosted build yet (T-29), so this is secondary.

**Evidence.** `web/main.ts:802-868` (only Ctrl/Cmd-I, F, C, S; stats tab logic at :835-866), `web/index.html:12-24`, `web/app.css:10-15`, `node_modules/osmium-ui/src/menubar.ts:53-54` (mountMenuBar, unused), `macos/Finsical.swift:543-609`.

**Change.** When `!inNativeShell()` and hover is available, mount Osmium's mountMenuBar in a new `#menubar`: a fish-glyph menu in the Apple slot (original art, not Apple's logo) with About This Aquarium… and Show Balloons; File: Import Add-ons… (Ctrl-I), Save Picture…; Edit: Copy Picture; Tank: Feed Fish (F), Tank Overview, Tank Stats (S), Preferences…, CRT Effect with checkmark (C), Degauss. A Mac OS 8 menu-bar clock at the right in Charcoal 12 ('3:42 PM'; a click toggles the date). Factor the stats-tab logic into `openClientTab(page, name)` and reuse it. Offset #machine by 20 px (`top: 20px`); layoutMachine reads clientWidth/Height and adapts. Keep the menu table in a pure module shared with the keydown handler. Touch keeps #opentrigger or uses the sticky menus.

**Acceptance.** Tests: every key equivalent maps to exactly one action; Playwright: Tank > Tank Overview opens a tab that receives state; arrow keys walk the menus.

**Merged and related.**

- Overlaps open PRs #102 (Mac OS 8 menu bar with Tank/Window/Help menus, app-glyph menu, System 8 clock, `openClientWindow`), #103 (Osmium menu bar with About, Change Water, Take a Picture) and #126 (bare `o`/`p` keys). This is implemented three ways in unmerged PRs: reconcile rather than reimplement.
- Merged from passes 1-7: `#opentrigger` shows only on `hover: none`, so stylus-with-mouse and hybrid laptops can miss it; also show it when no menu bar is available (browser only).

### U-15 Control-click on the tank shows WebKit's generic menu (with Reload) instead of a Mac OS 8 contextual menu

Size M · Severity low · Value 3/5 · Risk 2/5

**Problem.** No contextmenu handling exists. WKWebView's default menu offers Reload, which restarts the tank page, and a Control-click today both feeds or taps and opens that menu. Contextual menus arrived with Mac OS 8.

**Evidence.** `web/main.ts:100-111` (the pointer handler lets Control-click through as button 0), `web/main.ts:776-788`, `macos/Finsical.swift:467-527`.

**Change.** Native: in B-26's TankWebView override `willOpenMenu(_ menu: NSMenu, with event: NSEvent)`: `menu.removeAllItems()`, then Feed Fish, CRT Effect (checkmark from cached crtOn), Sound (F-05), Machine > submenu (from a `machines: [{id, name}]` list the tank adds to postState; choosing one evaluates `window.__bus({op: 'machine', id})`), Tank Stats, Preferences…, targeting existing actions. Web: return early from pointerdown when `e.ctrlKey && navigator.platform.startsWith('Mac')`; browser fallback: `web/contextmenu.ts` `openContextMenu(x, y, entries)` rendering an `.osm-menu` list (Osmium has no standalone menu renderer; better upstreamed), with Feed Fish Here (mapped x), Tap the Glass, window items.

**Acceptance.** Tests: Playwright right-click shows the menu and Feed Fish Here adds a pellet near that x; manual native check that Control-click switches the case.

**Merged and related.**

- Merged from passes 1-7 (right-click menu idea: Feed, Clean tank, Import Add-ons…, Snapshot, Mute; the pointerdown handler already reserves non-left buttons). PR #151 (open) adds the `TankWebView` subclass this builds on; PR #159 adds Mute.

### U-18 On the Bare tank the invisible 22-pt drag strip covers the feeding zone

Size S · Severity low · Value 3/5 · Risk 2/5

**Problem.** For image cases the strip sits on bezel and is redundant (case presses already post dragWindow). For Bare (320x200, no case) it sits on the water: at 640x400 it covers 22 of the 60-pt feed band, and at the 90-pt minimum height the whole 13.5-pt band, so food can only be dropped with F. It also shows an arrow over a `cursor: grab` page.

**Evidence.** `macos/Finsical.swift:58-67` (DragStrip), `macos/Finsical.swift:513-521` (22-pt constraints), `macos/Finsical.swift:145`, `web/main.ts:99-111` (feed band y < 15%), `web/main.ts:778-788`, `web/machines.ts:172-178`.

**Change.** Keep a reference and set `strip.isHidden = id != "bare"`; shrink the Bare strip to 8 pt or show it only while Cmd is held. In the canvas pointerdown handler first: `if (e.metaKey && e.pointerType === 'mouse') { e.preventDefault(); bus.post({op: 'dragWindow'}); return; }` so Cmd-drag moves the tank in any mode. Optional retro follow-up: an Osmium floating-windoid title bar for Bare, with the window 11 pt taller.

**Acceptance.** Manual test: Bare at minimum size, clicking the top rows drops food and Cmd-drag moves the window.

**Merged and related.**

- Merged from passes 1-7: the Swift DragStrip is 22 pt while the overlay's `TOP_CLEAR` is 24 with a comment saying 22; pick one number while touching this.

### U-20 (remainder) Accessibility: live label, announcements and reduced motion

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** VoiceOver finds an unlabeled web area and canvas. Nothing reacts to prefers-reduced-motion or prefers-contrast; case-swap and Osmium zoom/shade animations always run. The CRT flicker modulates brightness at ~9.7 Hz but only +/-1.5% at the default 0.30 (far below WCAG 2.3.1's threshold) and the CRT is off by default, so reduced motion is a courtesy. Installs and hunger changes are never announced.

**Evidence.** `web/index.html:16-21` (canvas#tank unlabeled, svg#shell role=presentation), `web/main.ts:78-95` (saveTank every 10 s), `web/crt.ts:131-133` (9.7 Hz flicker term), `web/main.ts:657-704`, `macos/Finsical.swift:164-166`, `node_modules/osmium-ui/macos/OsmiumWindows.swift:370`, `:407`, `:410`.

**Change.** Give canvas#tank `role="img"` and `aria-label="Aquarium"`, updated in saveTank from a pure statsmodel helper ('Aquarium: 6 fish, 1 hungry, water 92%. Press F to feed.') with a vitest. A visually hidden `aria-live="polite"` element announces 'Angelfish added' and 'Fish are hungry'. When `matchMedia('(prefers-reduced-motion: reduce)')` matches, call `crt.configure({...crtCfg, flicker: 0, grain: 0})` without persisting, and listen for changes (Playwright `emulateMedia({reducedMotion: 'reduce'})` gives flicker 0). Native: `animate: !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion` at Finsical.swift:166 and upstream in osmium-ui. window.title is already 'Finsical'.

**Acceptance.** (derived) Playwright `emulateMedia({reducedMotion: 'reduce'})` gives flicker 0 and grain 0 without persisting; a vitest for the label helper.

**Merged and related.**

- Remainder only: the accessible name (`role="img"`, label naming the feed/tap zones and the F key) landed in open PR #90. Open: the dynamic label from statsmodel, the `aria-live` announcements and reduced motion.
- Merged from passes 1-7: PR #141's power-on animation already skips under reduced motion and PR #158 holds the water still; flicker, grain and the rolling band still animate, so flatten them at `configure()` time.

### U-21 Plant and accessory names show as cryptic 8.3 file stems although the packs carry real names

Size M · Severity low · Value 3/5 · Risk 2/5

**Problem.** JPN Plants lists 90 DOS stems ('APONOGET', 'GLOSSOSL', 'Corksc_M', 'Kingyo_S', 'NUPHRJPN', 'TOOTHCUP') and L/M/S or 1/2/3 families. The packs hold a text-header resource (PlTH; the trailer type table also lists PlTI, PlPH, PlPI, PlVe, PLPC, PLDP) with a Shift-JIS Pascal Str31 common name at 0 ('バナナプラント'), an ASCII Pascal Str31 Latin name at 32 ('Nymphoides aquatica'), and Shift-JIS description text from 104; a second chunk sometimes has an English name ('Hair grass1'). Accessories have AccH (layout unverified). Fish use FsTH (F-02).

**Evidence.** `web/import.ts:261-270`, `web/import.ts:684-686`, `web/import.ts:784-787`, `core/data/fsh.ts:42-54`, `core/data/fsh.ts:167-175`.

**Change.** Add one generic `packInfo(d): { name?, latin?, blurb? } | null` in fsh.ts shared with F-02: find the xxTH chunk via F-01's type table, or take the first non-BMP chunk >= 600 B whose byte 32 is a plausible Pascal length; decode Str31@0 as shift_jis, Str31@32 as latin1, bytes 104.. as shift_jis up to NUL. importAddon puts it on PackResult; the detail pane shows 'Banana Plant, Nymphoides aquatica' plus the description; after the thumbnail pass, rows switch their label to the Latin name, cached with the thumb in IDB as `info:{url}`. Suffix fallback before fetch: `/_?([LMS])$/i` -> ' (Large/Medium/Small)'.

**Acceptance.** Tests: fsh.test.ts fixtures built from these byte layouts.

**Merged and related.**

- Related: F-02 (shared `packInfo`/text reader), F-32.

### U-22 Firefox may ask for persistent-storage permission at launch, before the user does anything

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** openDb calls `navigator.storage.persist()` on the first IDB use, which happens at every launch through sndsGet and the restore, with no gesture. Firefox answers with a permission doorhanger (once; the decision is remembered). Chromium and WebKit decide silently. Not verified in Firefox.

**Evidence.** `web/store.ts:31-36` and `web/store.ts:69-75` (persist() in openDb's onsuccess), `web/main.ts:891-899`.

**Change.** Export `requestPersistence()` from store.ts, called from recordInstall on the first user-initiated (live) install; skip when `await navigator.storage.persisted()` is true or inNativeShell().

**Acceptance.** Test: stub navigator.storage in vitest and assert persist() is not called during openDb.

### U-23 Tank Stats wording and bounds nits

Size S · Severity nit · Value 2/5 · Risk 1/5

**Problem.** 'Hungriest: Fish, full' shows when nobody is hungry (reads like an alarm). The Fish line can read '5 (2 seeking food) (1 startled)'. The care line says 'is starving' (>= 0.85) while Hungriest says 'hungry' (no 'starving' band). Advice says 'the Add-ons importer' but the menu reads 'Import Add-ons…'. Uptime reads '49h 3m'. The browser grow minimum of 60 px contradicts the native 250 that keeps all fields and two wrapped hints visible.

**Evidence.** `web/stats.ts:75-79`, `web/stats.ts:112-116` (grow min {300, 60}), `web/statsmodel.ts:45` (HUNGER_STARVING), `web/statsmodel.ts:89`, `web/statsmodel.ts:106-108`, `web/statsmodel.ts:115-118`, `web/statsmodel.ts:121-125`, `macos/Finsical.swift:100-104` (native min 300x250), `macos/Finsical.swift:564`.

**Change.** Show 'Hungriest: -' (or blank) when `hungriest.hunger < 0.33`. Join counts with commas: `${n} (${[seeking && `${seeking} seeking food`, startled && `${startled} startled`].filter(Boolean).join(', ')})`. Add a 'starving' band (>= 0.85) to hungerLabel and update overviewmodel.test.ts and statsmodel.test.ts together (it changes Overview text and its Status sort). Advice: 'choose Import Add-ons… in the Tank menu'. Uptime '2d 1h' past 24 h. Browser grow min {w: 300, h: 250}; keep the native minimum (an earlier idea to shrink it to 200 would clip the worst case); optionally lower the native default to ~360x260 after checking 4 wrapped hint lines fit.

**Acceptance.** (derived) statsmodel/overviewmodel tests for the new wording and the 'starving' band; the browser Stats window cannot shrink below 300x250.

**Merged and related.**

- Related: U-27 (small-window floor).

### U-24 Idea: a download progress bar with Stop in the add-on detail pane

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** 'Fetching add-on…' stays static while zips of up to 5.6 MB download, with no progress and no cancel. Osmium ships a determinate `.osm-progress` (used by Stats) but no indeterminate barber pole.

**Evidence.** `web/import.ts:787`, `web/import.ts:1136`, `web/import.ts:115-131`, `web/stats.ts:35-47`, `node_modules/osmium-ui/osmium.css:196-222`.

**Change.** Build on B-42's fetchWithTimeout: add `onProgress(loaded, total | null)`. showDetail inserts an .osm-progress under the status and sets `--osm-value` to loaded/total, or a striped indeterminate class (local CSS in app.css, Mac OS 8 barber pole) when Content-Length is missing. A 'Stop' push button aborts, which rejects, deletes the memo and shows 'Stopped.' with Try Again. Reuse it for the listing with per-collection progress (P-05).

**Acceptance.** (derived) A vitest with a stubbed streaming body reports progress; Stop rejects and shows "Stopped." with Try Again; a missing Content-Length shows the barber pole.

**Merged and related.**

- Merged from passes 1-7 (import flow): per-row progress or loading state, 2-3-wide parallel installs, failure text naming the file, ellipsized long names in fixed-height rows (open PR #135 adds `.irowname` nowrap), cached/offline badges and a clear selected-item preview. Do not auto-download packs just to decorate the list.
- Builds on B-42 (open PR #134's stall timeout). Related: P-07, P-05.


### U-25 Overview: select and spotlight a fish, state icons, remembered sort

Size M · Severity idea · Value 3/5 · Risk 2/5 (from passes 1-7)

**Problem.** Overview rows can't highlight their fish in the tank, rows
have no state icons, and the chosen sort column isn't persisted across
sessions. There is no way to select a fish by clicking it in the tank.

**Evidence.** `web/overview.ts`, `web/overviewmodel.ts`, `web/main.ts`
pointer handler. Open PR #137 adds Option-click Get Info (distinct from
selection); PR #130 adds a hover tip.

**Change.** (1) Click a row: the tank draws a ring highlight around
that fish for a few seconds (bus op `spotlight`). (2) Click a fish in
the tank (hit-test with the per-frame fish rects, A-05): select it and
sync the Overview row; an optional "follow" later. This is the
prerequisite for per-fish care UI. (3) 16x16 state icons (hungry,
sleeping, startled). (4) Persist the sort column in localStorage.
Rename lives in F-02.

**Acceptance.** (derived) Playwright: clicking a row rings the matching
fish; clicking a fish selects its row; the sort survives a reload.

### U-26 Machine case thumbnails in the Preferences list

Size S · Severity idea · Value 2/5 · Risk 1/5 (from passes 1-7)

**Problem.** The machine list is text-only; a small icon column would
sell the 11 cases.

**Evidence.** `web/prefs.ts:269-312` (machine list). The preview well
itself shows a water-filled case in open PR #147.

**Change.** A 32x32 (1x/2x) thumbnail per machine, rendered once from
the case art with `shellMarkup` or a pre-scaled asset.

**Acceptance.** (derived) Screenshot of the list; the list stays
keyboard-navigable.

### U-27 Small-window support floor (reproduced) and fixed Preferences layout

Size M · Severity medium · Value 3/5 · Risk 2/5 (from pass 8 and earlier)

**Problem.** At 320x400 the Preferences preview collapses to about 2 px
and its caption overlaps the machine list; at 300x120 the Stats care
text starts below the viewport, unreachable (web `grow.min` 300x60 vs
native's nominal 300x250). `app.css` lays Preferences out absolutely
inside 564x456 (native 565x457) and `hostWindow` does not pass `grow`;
if Osmium resizing is ever enabled, panes can clip. Stats clips care
hints by design (`advice.slice(0, 2)`).

**Evidence.** `web/app.css`, `web/prefs.ts`, `web/stats.ts:112-116`,
`macos/Finsical.swift:100-104`.

**Change.** State a supported minimum; stack or scroll content below
it; share native and web minimum geometry (U-23 proposes browser
`grow.min` 300x250); confirm Osmium resizability for Preferences and
document it if fixed. Longer advice could open a help overlay later.

**Acceptance.** Test 320, 375 and 565 widths, short heights, 200% zoom,
long names and two care hints; no content becomes unreachable.

### U-28 Make failures and pending states visible (umbrella)

Size M · Severity medium · Value 4/5 · Risk 2/5 (from pass 8 and earlier)

**Problem.** Many failures are console-only.

**Evidence.** `web/main.ts` restore chain, `web/import.ts` `loadProblem`,
`web/store.ts` quota paths.

**Change.** Concise in-window states for restoring, unavailable pack,
cached listing ("showing cached listing", offline mode), partial
catalogue, quota failure and a stopped import, each with a practical
next step and the real error preserved in diagnostics. A fallback fish
should be clearly a placeholder, not a mislabeled species. No modal
storms or permanent busy HUD. Keep the archive.org credit and Donate
link (good as they are).

**Acceptance.** Each state has a Playwright check that forces it (for
example offline reload, quota stub, failed collection).

**Merged and related.**

- Concrete pieces: B-46 (restore failures), U-09 (error text), U-10
  (drop feedback), U-12 (disconnected), P-05 (partial catalogue), B-44
  (unreadable accessories), U-24 (progress and Stop).

### U-29 CRT presets: a lower all-day baseline

Size S · Severity idea · Value 2/5 · Risk 1/5 (from passes 7-8)

**Problem.** Open PR #142 adds Authentic, Sharp, Soft and Pixel Perfect
presets. An all-day desk toy may want a gentler user-tunable baseline
than Soft.

**Evidence.** `web/crt.ts` `CRT_DEFAULTS`, `CRT_PRESETS` (PR #142),
`web/prefs.ts` Monitor pane.

**Change.** Add a "Gentle" preset (lower flicker, grain, halation) or
let "Defaults" restore a user-saved baseline.

**Acceptance.** (derived) The preset is frozen like the others
(`isFrozen` test) and applies in one bus post.

## Aesthetics and Mac OS 8 fidelity (open)

Done this pass and removed from this list: A-01.

### A-02 Colors: Black & White to Millions, like Monitors & Sound (1-bit Mac Plus, LCD look for the G4)

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** A Mac Plus showing 256-colour fish is anachronistic, and a CRT effect on the iMac G4's LCD is wrong. A prototype Atkinson dither of the live 320x200 frame (gamma lift pow(l, 0.6)) costs ~1 ms per frame and reads clearly, but error diffusion crawls as fish move.

**Evidence.** `web/main.ts:26-28` (context creation), `web/main.ts:1130-1142`, `web/prefs.ts:98-131`, `web/crt.ts:24-145`, `web/machines.ts:62-71`, `web/machines.ts:161-170`.

**Change.** New `web/depth.ts` `quantize(imageData, depth)`: 'bw' with a 4x4 or 8x8 Bayer threshold (stable under motion), plus 'bw-diffused' (Atkinson with the gamma lift; check a screen recording first); 'gray4'/'gray16' quantize luminance with Bayer; '256' maps to the classic Mac 8-bit system palette (6x6x6 cube plus ramps) with Bayer; 'millions' is a no-op. Create the 2D context with `{willReadFrequently: true}` and apply quantize after render() and before crt.render(). Prefs Monitor pane: a 'Colors:' list (Monitors & Sound style) whose caption notes 'The Macintosh Plus had a black-and-white screen.'; bus op 'depth'; persist `finsical:depth`; never change depth automatically on machine choice. Optional per-machine 'lcd' display for the G4: faint pixel grid and slight ghosting blend with the previous frame.

**Acceptance.** Tests (depth.test.ts): bw outputs only 0/255; a flat 50% grey gives ~50% white; '256' outputs only palette colours. (derived) Plus depth.test.ts as proposed: bw outputs only 0/255; flat 50% grey gives about 50% white; '256' outputs only palette colours; a screen recording shows no crawl in 'bw'.

**Merged and related.**

- A-01 follow-up: skip PR #158's living-water effects in Black & White depth.
- Merged from passes 1-7: a "vintage filter" mode (sepia, reduced saturation, vignette) fits the same post-render hook as an extra entry in the Colors list.

### A-03 Highlight color that matches the chosen iMac case

Size M · Severity idea · Value 2/5 · Risk 3/5

**Problem.** Choosing Strawberry or Bondi changes only the tank frame; Osmium hard-codes #6666cc/#333399/#000088 and exposes no variables. List selections are black and white (not lavender) and the progress fill is a sprite, so CSS variables alone cannot recolour everything. Mac OS 8.5 Appearance had Accent colours.

**Evidence.** `node_modules/osmium-ui/osmium.css:487-491` (menu items), `node_modules/osmium-ui/osmium.css:544-549` (menubar titles), `node_modules/osmium-ui/osmium.css:755-760` (focus rings), `web/machines.ts:27-45`.

**Change.** In osmium-ui first: add `--osm-accent-light`, `--osm-accent`, `--osm-accent-dark` (defaults = today's values, pixel-exact) for menu, menubar and focus-ring rules, plus `setAccent(palette)` re-registering the progress-fill sprites with recoloured palette entries; cut a tag and bump the pin. Finsical: optional `accent?: [light, mid, dark]` on Machine (Bondi #7fd1d6/#0f9aa6/#006070, Strawberry #ff8f9a/#d6283e/#7a0018), sent in postState and applied on :root by each client page behind a Prefs pop-up 'Accent color: Lavender / Match the case'. Leave list highlights black and white; check white-on-mid contrast. Low priority.

**Acceptance.** (derived) Default accent values are pixel-identical to today's Osmium rendering (screenshot diff); white-on-mid contrast is checked for each case palette.

### A-04 'About This Aquarium…' in the style of Mac OS 8's About This Computer

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** The app has no About item at all, and nothing shows the version or what the tank caches. Mac OS 8's About This Computer (machine icon, Built-in Memory, a bar per running app) maps nicely onto an aquarium and doubles as a performance readout for P-01/P-03.

**Evidence.** `macos/Finsical.swift:87-104` (window specs), `macos/Finsical.swift:543-554`, `web/main.ts:385-419`, `web/main.ts:428-504`, `web/import.ts:97` (Importable has no byte size).

**Change.** New about.html/about.ts (hostWindow, osm-info; bundled like stats.ts in package.json and the Makefile copy list; `host.add(OsmiumWindowSpec(url: page("about.html"), title: "About Finsical", frameKey: "FinsicalAbout", size: NSSize(width: 420, height: 260)))`; first item in the app menu). Header: the current machine's name and a small case preview (shellMarkup), 'Built-in Memory: 320 x 200 pixels', water, and 'Largest Unused Block: N% of the tank'. Rows sorted by size like the original: thumbnail (wantThumbs), fish name (F-02), size such as '1,136K' (record the pack byte length on installedAddons in remoteInstall/applyPack; old saves show '-'), and a Platinum bar filled to 1 - hunger. Optional footer bars from page-tracked byte counts (fish sheets, scenery canvases, decoded audio, IDB cache) plus fps and the worst frame in 60 s, answered via op 'perf' only while open (performance.memory is Chromium-only). Version via esbuild `--define` (T-15). Credits per T-03.

**Acceptance.** Test: pure aboutmodel.ts (sorting, K formatting with thousands separators, bar clamp).

**Merged and related.**

- Merged from passes 1-8 ("About box"): version from `package.json`/Info.plist, license (Unlicense), archive.org credit and the LLM disclosure link. A basic browser About dialog is in open PR #103 (and #102's About window); PR #152 (open) gives the native app the standard About panel. Merged "About This Aquarium" easter-egg idea (tank stats as system specs) is this entry.
- T-03 (remainder) wants the same credits here.

### A-05 Balloon Help for the tank, fish, case and client windows

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** Nothing explains the feed and tap zones, the draggable case, resizable edges or the F/C/S keys. Help > Show Balloons is iconic System 7/8.

**Evidence.** `web/prefs.ts:194-217` (caption area already imitates Balloon Help), `web/main.ts:100-111`, `web/main.ts:1031-1044`, `macos/Finsical.swift:543-609`.

**Change.** New `web/balloon.ts`: `showBalloon(anchor: DOMRect, text)` (white rounded rect r=10, 1 px black, a triangular tail toward the anchor, Geneva 10, max width 200 px) placed by a pure `balloonPlacement(anchor, viewport, size)`; hideBalloon(). drawFish records each fish's screen rect per frame into a module-level array (shared with D-14 and D-02). With balloons on, pointermove hit-tests fish ('Scott, Angelfish. Full.'), decor (add-on name), zones ('Click here to sprinkle food. Hungry fish swim up to eat.' / 'Click the glass to tap it. Nearby fish dart away.'), the case ('Drag the case to move the tank.') and D-04 hotspots. Toggle: native Help menu 'Show Balloons'/'Hide Balloons' calling `window.finsical.setBalloons(on)` (U-05); browser: '?' key or U-14's menu; persisted as `finsical:balloons`; on automatically for the first 60 s of a first run. Client pages opt in with `data-balloon`.

**Acceptance.** Tests: balloonPlacement flips at viewport edges; Playwright hovering each zone shows the expected text.

**Merged and related.**

- Merged from passes 1-8 ("In-app help"): PR #102 (open) has a browser Shortcuts window listing F/C/S/Cmd-I and PR #152 (open) adds a native Help menu with "Finsical Help"; still open are the feed-vs-tap gesture hint and a `?`/`H` keyboard help overlay listing the same shortcuts. The first balloon step is open PR #130 (species and state tip on fish hover); "Balloon Help mode reusing prefs caption copy across tank and Overview" is this entry. Use one key: this entry proposes `?` for balloons, the older idea `?`/`H` for the shortcut overlay.

### A-06 The app icon is a full-bleed square with no alpha

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** macOS 11-15 do not mask third-party .icns art, so the icon shows as a hard-cornered square bigger than neighbouring Dock icons (Apple's grid is an 824-pt rounded rect inside 1024); macOS 26 puts non-conforming icons on a grey plate.

**Evidence.** `macos/Makefile:56` (comment claims macOS masks it), `macos/Makefile:61-71`, `media-sources/icon-finsical.png` (1254x1254 RGB, opaque corners).

**Change.** Commit a pre-masked `media-sources/icon-finsical-1024.png` (art clipped to an 824x824 rounded rect, radius ~185, centred with a 100-px margin and a soft drop shadow), generated once by a hand-run `tools/make-icon.swift`; point ICON_SRC at it and fix the comment. Retro bonus: hand-pixelled 16x16 and 32x32 Mac OS 8-style icons for the small iconset slots.

**Acceptance.** (derived) The Dock icon matches neighbouring icons' size and corner radius on macOS 14 and 15; no grey plate on macOS 26.

### A-07 Disabled Osmium sliders keep full-contrast tick marks

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** With the CRT off, slider tracks and thumbs dim but the tick sprite stays black and white; Mac OS 8 dims the whole control.

**Evidence.** `node_modules/osmium-ui/osmium.css:330-334` (::after tick sprite), `node_modules/osmium-ui/osmium.css:359-368`.

**Change.** Upstream in L-K-M/osmium-ui: a dimmed tick sprite for `.osm-inactive .osm-slider::after` and `.osm-slider.osm-disabled::after`, then bump the dependency.

**Acceptance.** (derived) With the CRT off, disabled sliders show dimmed ticks (screenshot); the osmium-ui pin is bumped.


## Features: AquaZone fidelity (open)

Done this pass and removed from this list: F-03, F-08, and F-05's
volume, mute and Sound pane (PR #159). Note from T-11: no code reads
the AquaZone resource tags yet, so earlier notes calling `FsTH`,
`FsTI`, `FdHd`, `LigH` and the lifecycle hooks "decoded" were wrong;
most entries below need F-01 first.

### F-01 Parse the pack trailer as a resource map (types, ids, names) instead of sniffing chunks

Size M · Severity idea · Value 5/5 · Risk 2/5

**Problem.** The trailer at u32@4 is a little-endian Mac resource map, and most features below depend on it. Layout, verified on 99 of 101 downloaded packs (fish, eggs, 24 foods, 11 meds, gravel, plants, 34 accessories, 3 .azn, aquazone.rez, gp*.rez): map = u32@4; map+26 u16 name-list offset; map+28 u16 typeCount-1; map+30 8-byte type entries {tag[4] stored byte-reversed ('IgrD' is DrgI), u16 count-1, u16 refListOffset relative to map+30}; each ref 12 bytes {u16 id, u16 nameOffset (0xFFFF none; Pascal string at map+nameListOffset+nameOffset), u32 dataOffset (low 24 bits) relative to 0x100, pointing at u32 length + payload}. The header tag at 0x10 (byte-reversed) names the pack kind: AqFd food, AqDr medicine, AqGr gravel, AqPl plant, AqAc accessory, Aqua tank, AqZn base, XXXX fish; gp*.rez carries zero. Exceptions: SCEPTER.ACC ('Version 2.0 Resource File', 10-byte type entries) and ERAWAN.ACC (78-byte refs), whose type counts still sum to the chunk count in type order; eden.azn has one orphan chunk. Real types: FsTI, FsTH, PrF#, AMV#, BMV#, ELRA, ELRB, EGPC, EGPP, FADP, FBDP, SuS#, FsT2, FsT3, FshI, FshH, FsI3, EggI, EggH (fish); Fd_I, Fd_H, FDPC, FDDP (food); DrgI, DrgH, DRDP (medicine); AccI, AccH, ACPC, ACDP; PlTI, PlTH, PlPI, PlPH, PLPC, PLDP; AQUA, Watr, HtrI, FltI, Ligt, FdFd, Grvl, BAPC, BADP (tanks). No code reads types today.

**Evidence.** `core/data/fsh.ts:3`, `core/data/fsh.ts:42-54` (packChunks), `core/data/fsh.ts:148-175` (fshToSheets, packImages), `tools/az/pack.py:58` (Pack.tag), `tools/az/pack.py:73-90` (byte-scan for 12-byte records, no types), `tools/az/emit.py:55` (manifest has no type).

**Change.** New `core/data/rsrc.ts`: `packResources(d): {type, id, name, payload}[]`, `byType(type)`, and `packKind(d)` (null for unknown or zero tags, never throws). Validate that every ref offset lands on a packChunks boundary; otherwise assign types sequentially from the type-list counts when their sum equals the chunk count; otherwise fall back to today's heuristics. Rebuild fshToSheets/packImages on top and return type and id with each sheet or image. Mirror in `tools/az/pack.py` (Pack.resources) and write 'type' and 'id' into each emit.py chunk record.

**Acceptance.** Tests: rsrc.test.ts with a synthetic 2-type map plus name list, the 10-byte-entry variant, an orphan chunk, and a fixture shaped like clownfish.fsh (AMV#/BMV#/ELRA/ELRB/FsTH named 'Adult Idle' etc.); tools/tests/test_pack.py equivalents.

**Merged and related.**

- Implemented-item follow-ups that wait on this: B-01's ELRA/ELRB at the species base id; F-03's frames = ACPC ids base..base+AccI.u16@10-1 (optional ping-pong for plants if a seam shows).
- Unlocks F-02, F-06, F-11, F-12, F-13, F-17, F-18, F-22, F-33, B-22's typed-frame follow-up (PR #157 kept the heuristic), B-23(b), B-33, U-21 and V-07.

### F-02 Real species names, individual fish names, sex, hatch dates and a Get Info window

Size M · Severity idea · Value 5/5 · Risk 3/5

**Problem.** Overview lists 'clownfish', 'comet', 'disc addon3': archive file names. Every fish pack carries AquaZone's species card and a roster of named individuals. FsTH (1128-byte chunk): Pascal strings at 0x00 common name (max 32), 0x21 scientific, 0x42 family, 0x142 habitat, a label at 0x246 ('Description:' or '概説'), and a NUL-terminated CRLF C string at 0x268 (e.g. 'Water Temperature: 24-28°C ... The Angelfish prefers meaty foods'). English packs keep template placeholders ('#Genre', '#Habitat'). Individuals: adjacent 464-byte (sex byte @0x104 'M'/'F', u32 LE Mac-epoch hatch time @0x106) and 1134-byte (Pascal name @0, breeder @0x122, parents and tank for bred fish) chunks. angels yields Scott (M, 1997-09-24), Robert, Samantha, Amy, Melissa from 'Franks Fish Farms'; all 58 cached fish packs have a card and plausible individuals, 9 with person names. Encoding: Western cards are Windows-1252 (a naive fatal Shift-JIS decode wrongly succeeds on them), JPN cards Shift-JIS ('金魚', 'Carassius auratus var.', 'コイ科'). The original had Fish Name, Individual Info, Species Info and Personal Note windows.

**Evidence.** `core/data/fsh.ts:42-54`, `core/sim.ts:10-57` (Fish has no name/sex), `web/import.ts:318-324`, `web/import.ts:346-365`, `web/import.ts:784-787` (detail text), `web/main.ts:78-95` (saveTank whitelist at :83-89), `web/main.ts:138-150` (spawnFish species = it.inner), `web/main.ts:385-401`, `web/overviewmodel.ts:61-71`, `web/overview.ts:95-99`, `node_modules/osmium-ui/src/controls.ts:752`.

**Change.** (1) fsh.ts: `packSpecies(d): SpeciesCard | null` and `packIndividuals(d): {name, sex?, born?, breeder?}[]` (born = `(t - 2082844800)*1000` ms, formatted with timeZone 'UTC'; drop dates outside 1990-2010). Deduplicate by name+born, keep first-seen order (angels repeats 5 individuals ~60 times). Breeder fields that look like paths (`/^[A-Za-z]:\\|\\/`, e.g. banggai's '…\Copy of flower frame tank.azn') show as 'Bred in <basename>' or are omitted. Names shorter than 3 chars or pure codes ('F', '01') count as unnamed and fall back to '<Common name> <n>'. Treat values starting with '#' or equal to their label as empty. `decodeText(bytes)`: Shift-JIS only if the fatal decode succeeds and the result contains U+3040-U+9FFF, else windows-1252 (or 'macintosh' when a Mac Roman heuristic fits); normalize CRLF. Share the reader with U-21. (2) PackResult gains species/individuals, passed through ImportHandlers.onSheets so restores carry them. (3) Fish gains optional name, sex, born, comment, in the saveTank whitelist. spawnFish takes the next unused individual of the pack (first install Scott, Add Again Robert); when a pack runs out (clownfish has 2), generate a seeded name and alternate sex; old saves get a seeded default. (4) FishSnap/itemsOf: Name = individual name, Kind = common name, optional Sex column. (5) Double-click in Overview (mountList onOpen) or Cmd-I posts `{op: 'wantInfo', id}`; a new info.html Get Info window (Osmium .osm-info, OsmiumWindowSpec in Finsical.swift, window.open in the browser) shows the 83x83 FADP portrait, editable Name (bus op 'renameFish', max 31 chars), Kind (italic Latin), Family, Habitat, Sex, Hatched (`Intl.DateTimeFormat` dateStyle 'full', UTC), Breeder, keeping notes, description and a Comments box persisted on the fish. (6) Import detail pane shows common/scientific name and the first description lines, and FADP as the preview when present.

**Acceptance.** Tests (fsh.test.ts, synthetic chunks): offsets, NUL-truncated Pascal overflow, the 1252-vs-SJIS decision, dedupe, path-breeder filter, short-code fallback, UTC date; overviewmodel.test.ts Name/Kind columns.

**Merged and related.**

- Overlaps open PR #137 (Option-click opens a Mac-style Get-Info card that tracks the fish: species, hunger, mood via `Record<Fish["state"], string>`, cruise) and the other-pass `feature/named-fish` branch (retro names at spawn, saved with the tank). Build the species card and individuals into those rather than a third UI.
- Merged from passes 1-7: surface the decoded `FsTH` names and descriptions on the Get-Info card; a Finder-style inline rename in Overview is the natural home for naming (bus op `renameFish`).

### F-04 Let users arrange decorations: placement, depth, drag, persisted positions

Size M · Severity medium · Value 4/5 · Risk 3/5

**Problem.** Decor is re-spaced evenly on every add or removal, on one baseline, never clamped (with 5 items MOAI is centred at x=288 and clipped at 335), always behind every fish, and cannot be moved. Adding a plant moves all the others. The original had an Aquarium Layout editor using the packs' top views, and its AccI/PlPI records store x, y and depth. A goldfish-bowl preset label even says 'please place this at the very front'.

**Evidence.** `web/main.ts:198-218`, `web/main.ts:1085-1091` (x = W*(i+0.5)/n, y = H-6-h, no clamp), `web/main.ts:1100` (all decor before fish), `web/main.ts:36-44`, `web/main.ts:78-95`, `web/main.ts:100-111`.

**Change.** Persist `SavedTank.decor` as an ordered array `[{url, x, depth}]`, one entry per placed item (duplicates allowed, which also fixes B-21), with installedAddons staying the fetch list. Default position: the pack's PlPI tail when present (B-23), else a pure `placeDecor(existing: {x, w}[], w, tankW, seed)` returning the centre of the widest free gap, clamped so the item stays within [0, tankW] (seeded x when there is no room). Draw sorted by depth with the base at `floorY + 4 - depth*12` (V-04); items with depth > 0.8 draw after the fish. Interaction: Option-drag on #tank (an `e.altKey` branch before the tap in pointerdown) hit-tests decor through an alpha mask kept with each canvas, moves it with a Finder-style dotted outline, and saves on pointerup; or a Tank > 'Arrange Decorations' mode where clicks do not feed or tap.

**Acceptance.** Tests: placeDecor never overlaps when the widths fit and never returns an out-of-bounds extent; `decorHit` returns the topmost item under a pixel; two copies of one accessory survive save and load.

**Merged and related.**

- Merged from pass 8 ("Arrange mode"): explicit aquascaping (pick up a plant, drag with gravel snap, Escape cancels, Undo restores); ordinary feeding drags must never rearrange the tank.
- Overlaps open PR #139 (roots anchored into the gravel, up to 3 art frames per pack, the middle frame drawn in front of fish). Resolve B-21's copies-vs-replace conflict first.


### F-05 (remainder) Jukebox for imported music

Size M · Severity medium · Value 3/5 · Risk 2/5

**Problem.** PR #159 (open) delivered the master gain, volume, mute,
bubble and ambience switches, the Sound pane, Tank > Mute Sound
(Opt-Cmd-S), the M key and tracked install feedback. Still open: after
installing the only Sounds add-on (the JPN bonus CD track "Macinfish",
about 205 s) nothing can ever play it again, since restores are
silent.

**Evidence.** `web/audio.ts:76-81` (playImported is the only trigger
for music), `web/main.ts:343-358`, `web/prefs.ts` (Sound pane in
PR #159), `macos/Finsical.swift:555-577`.

**Change.** (2) `tracks()` lists imported records matching none of
drop/intowater/center/side/top/bottom/bubble/aqua (or
`kind === 'music'`, B-19); `playTrack(name, loop)`/`stopTrack()` keep
one track source (streamed per P-04); bus ops `playTrack`, `stopTrack`.
(4) Minimal UI: double-clicking a Sound add-on row in Overview posts
`playTrack`, status "Playing". (5) A Music group in the Sound pane
listing tracks with Play/Stop and Loop in an AppleCD Audio Player
style; optionally a separate "Audio CD" window opened from D-04's CD
slot. Merged from passes 1-7: a Tank > Play Sound > [name] submenu for
dropped records.

**Acceptance.** Fake AudioContext: the `tracks()` filter; a new track
stops the previous source; Overview double-click plays a track once.

**Merged and related.**

- Three Sound panes exist in open PRs (#101, #133, #159): reconcile
  before adding the Music group.
- Related: B-18 (removing sound add-ons), B-19, P-04, D-27 (party
  mode).

### F-06 Import AquaZone food packs: named foods, real particle sprites, species food preferences

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** The default item has allfoodsandmeds.zip (125 KB): top-level inner zips meds.zip, foods.zip (12 .fd under foods/), foods2.zip (5), live_*.zip, beetles.zip, mosquito_larvae.zip. The JPN set has AQUAZONE ITEM/餌セット with ~20 more .fd, and fish add-ons carry .fd too (Goldfish Flake/Pellet, Pleco Food, Discus). Fd_H holds the name ('AZ Standard Flake Food', 'Live Bloodworms', 'Arowana Burgers') and dosing advice; Fd_I u16@0 is a food type indexing aquazone.rez STR# 7200 (1 Flake, 2 Powder, 3 Pellet, 4 Dry Worm, 5 Insect, 6 Dry Shrimp, 7 Hamburger, 8 Frozen Insect, 9 Frozen Shrimp, 10 Living Worm, 11 Living Insect, 12 Living Shrimp Egg, 13 Hyper-Capsule); FDPC are particle sprites (flake.fd 11x4..18x8 flakes; live daphnia 4 frames of 24x10). Each fish's PrF# lists accepted food types (cardinal and neon [1,2,4,5,7,8,9,10,11,12], no pellets). Finsical has one anonymous 3x3 yellow pellet.

**Evidence.** `core/sim.ts:59-65` (Food has no kind), `core/sim.ts:174-178`, `core/sim.ts:228-238`, `core/sim.ts:418-427`, `web/import.ts:65-89` (no food collection), `web/import.ts:90-93` (PACK_EXT/DIRECT_EXT lack fd), `web/import.ts:190-239`, `web/import.ts:462-471`, `web/main.ts:1093-1099`.

**Change.** Import: add `fd|med` to PACK_EXT and DIRECT_EXT. Nested-mode collections `{section: 'food', outer: 'allfoodsandmeds.zip/foods.zip', exts: /\.fd$/i, deep: true}` and the same for foods2.zip; a new optional `Collection.innerMatch?: RegExp` for the default-mode listing of allfoodsandmeds.zip's other inner zips (live_*, beetles, mosquito_larvae; exclude meds.zip, foods.zip, foods2.zip); JPN `{section: 'food', item: JPN_ITEM, outer: JPN_ZIP, prefix: JPN_ROOT + '餌セット/', exts: /\.fd$/i}`. Add 'Food' to SECTION_TITLES and KIND_NAMES and a food route in handleImages (unknown sections are silently ignored today). Installing adds the food to a pantry (`SavedTank.foods`); Tank > Food submenu lists pantry foods with a check on the current one, and F and Feed Fish drop the current food. Sim: `dropFood(x, food)` with `enum FoodKind { Sinking, Floating, Live }` from the type code (flakes float ~4 s with x drift then sink at 0.15 px/tick; pellets 0.35; live food random-walks and never rots); nearestFood skips food a fish's PrF# does not accept (default accepts all). Render a seeded FDPC sprite per pellet (animated for live food, ART_SCALE).

**Acceptance.** Tests: import.test.ts innerMatch excludes meds.zip; sim.test.ts: a fish accepting [1] ignores type-3 food, live food moves and does not settle, floating food stays at SURFACE >= 100 ticks.

**Merged and related.**

- Merged from passes 1-7 ("More foods"): flakes, pellets and live food with different sink rates start as one `sink` field on `Food`.

### F-07 Automatic feeder ('Fantastic Feeder') with spoonfuls, interval and limited supply

Size S · Severity idea · Value 3/5 · Risk 2/5

**Problem.** Fish seek food after ~8 minutes, read 'hungry' after ~13 and 'starving' after ~17, so a tank left open all day is permanently starving and only Stats says so. The original shipped an auto-feeder: the FdHd 'Fantastic Feeder' text says it drops a fixed amount at fixed intervals of tank time and that supply is limited; tanks carry an FdFd schedule record, and the FRMFOODTIMER window had 'Add Food ( spoonfuls ):', 'Next Feeding:', 'Interval:' and 'Remaining:'.

**Evidence.** `core/sim.ts:81-84` (hunger saturates in ~20 min), `core/sim.ts:174-178`, `web/main.ts:794-797`, `web/statsmodel.ts:45-47`, `web/statsmodel.ts:121-125`.

**Change.** `Sim.feeder = {enabled, nextTick, intervalTicks, spoonfuls 1-5, remaining}`; when due, tick() drops `spoonfuls` pellets spread over the middle 40% of the width, decrements remaining, schedules the next drop and emits 'fed' (F-13). Works with F-10 speed and F-09 catch-up. A simpler 'Automatic feeder' checkbox variant: a pure `autoFeedTarget(sim)` that every 900 ticks drops one pellet above a fish with hunger > 0.6 when no uneaten food exists. UI: Tank > 'Food Timer…' Mac OS 8 dialog ('Add food in [6] hours', 'Every [12] hours' with little arrows, 'Spoonfuls: [2]', 'Remaining: 18 spoonfuls [Refill]', 'Next feeding: 14:30', On checkbox); Stats shows the next feeding.

**Acceptance.** Tests: interval 100 ticks and 2 spoonfuls drop exactly 2k pellets by tick 100k; remaining 0 stops drops; disabled drops nothing; autoFeedTarget unit tests.

**Merged and related.**

- Related: D-15 (learned feeding time), U-01.

### F-09 Time passes while the app is closed (closed-form catch-up on launch)

Size M · Severity idea · Value 2/5 · Risk 3/5

**Problem.** On relaunch the sim resumes at the saved tickCount; the original ran around the clock. But HUNGER_PER_TICK = 1/36000 saturates in 20 minutes, so naive catch-up would make every launch start with all fish starving; do this only after F-07 and F-10's life pace exist.

**Evidence.** `web/main.ts:36-44` (SavedTank has no timestamp), `web/main.ts:56-69`, `web/main.ts:78-95`, `web/main.ts:1130-1132` (200 ms catch-up cap), `core/sim.ts:83`.

**Change.** Save `savedAt: Date.now()`. On load `elapsed = clamp(now - savedAt, 0, 8 h)` (or 7 days with a feeder) in ticks at the configured pace. `Sim.catchUp(ticks)` in core/sim.ts: waterQuality += FILTER_PER_TICK*ticks (clamped to 1; settled food has rotted), hunger = `max(hunger, min(0.6, hunger + ticks*HUNGER_PER_TICK))` without a feeder (hungry, not starving), feeder drops at their scheduled ticks, age for F-11/F-12; no swimming. Show a Mac OS 8 alert: 'While you were away (2 days 4 hours): the Food Timer fed 4 times. 1 fish is hungry.' Preference 'Pause the tank while Finsical is closed', default on until the feeder exists.

**Acceptance.** Tests (sim.test.ts): catchUp(1e6) caps hunger at 0.6 and water at 1; a stationary fish's hunger after catchUp(108000) matches 108000 tick() calls within 1e-9 (with the feeder, fed-fish hunger matches a real-time run within 1e-6); determinism with a seed.

**Merged and related.**

- Merged from passes 1-8 ("Offline sim catch-up (optional)"): the sim does not advance while the app is closed; long absences reset nothing (good) but never progress day/night either; cap a tick budget on launch if wanted. Distinct from the hidden-tab stall (B-53). Keep real-clock lighting (PR #155) separate from hunger time.

### F-10 Simulation speed and life pace (pause, fast-forward)

Size S · Severity idea · Value 3/5 · Risk 2/5

**Problem.** The original let you freeze or speed up time ('Aquarium Speed:', 'Current speed:' in AQUAZONE.exe; the feeder help says intervals follow tank time). Finsical runs a fixed 30 tps. Growth, incubation and disease also need a tank-time scale.

**Evidence.** `web/main.ts:1016-1025` (animFrame on sim.tickCount), `web/main.ts:1126-1141` (fixed 30 tps), `macos/Finsical.swift:555-577`.

**Change.** A speed in {0, 1, 2, 4, 8}; a pure `ticksForFrame(acc, dtMs, speed)` in core returning how many sim.tick() calls to run, capped at 400 per frame with the rest dropped (no spiral of death). Speed 0 pauses animation too (animFrame is tick-driven). Tank > Speed submenu with checkmarks (Paused, Normal, Fast 2x, Faster 4x, Fastest 8x); a small 'Paused' placard (Geneva 9) in a tank corner. A 'Life pace' preference sets `TANK_DAY_TICKS` (Realistic 24 h, Relaxed 1 h default, Quick 5 min) used by F-07, F-11, F-12, F-17. Persist both and show them in Stats.

**Acceptance.** Tests: ticksForFrame per speed and the cap; a Sim advanced by the helper is bit-identical to calling tick() the same number of times.

**Merged and related.**

- Pause overlaps open PR #123 (freezes `tick()` while render continues; Tank menu and a bare key). Speed and life pace remain. PR #157 already runs decor animation on the sim clock so speed applies.

### F-11 Fish grow from fry to adult using both sprite sets every pack already ships

Size M · Severity idea · Value 4/5 · Risk 3/5

**Problem.** Every fish pack contains the generic fry ring (shared 9x31 / 32x32 / 20x32 sheets, which B-01 stops showing by mistake) and the adult ring; AquaZone was a fish-raising sim. Egg packs exist too (F-23).

**Evidence.** `core/sim.ts:10-57` (no age), `web/main.ts:78-95`, `web/main.ts:120-133`, `web/main.ts:138-150`, `web/main.ts:222-237`, `web/render.ts:61-72`, `web/overviewmodel.ts:66`.

**Change.** After B-01, keep `rings[slot] = { baby, adult }` (pickSwimSheet's baby/adult). Fish gains a persisted `bornTick`: spawnFish sets `sim.tickCount`; legacy fish without it count as adults (existing tanks never regress). A pure `lifeStage(ageTicks)` in `web/tankmodel.ts` (and a `growthScale(age)`): baby below 1 TANK_DAY_TICKS (x0.7 faster when hunger stays below 0.33), adult after; ramp the adult's render scale from 0.5 to 1 over the transition so it does not pop, with a small sparkle and chime. A preference decides whether new fish arrive as fry or adults (default adults); 'Add again' may spawn fry. Overview status 'Fry' or 'Adult'.

**Acceptance.** Tests: lifeStage boundaries and growthScale; saveTank/loadTank round-trips bornTick.

**Merged and related.**

- Overlaps open PR #110 (per-fish `scale` growth: juveniles spawn at 0.78-1.10, each meal closes 6% of the gap to 1.35, persisted). Merged from passes 1-7: multi-sheet growth stages need `usePack` to keep more than one sheet; scale-based growth is the interim.
- PR #149's `pickSwimSheet` does not return B-01's proposed `baby` sheet; add it here.

### F-12 Fish lifecycle: health, old age and death using the packs' own dying art

Size L · Severity idea · Value 3/5 · Risk 4/5

**Problem.** The original's fish were born, grew and died; dead fish floated up, turned black and fouled the water until removed. Finsical fish are immortal. The data exists: each family's 4th sheet (+3) is 'right/left dying fish' (5 or 8 frames depending on the pack; clownfish ELRA 31603 fades through grey to black); FsTI u16@0 looks like days to adulthood (guppy 95, medaka 99, neon 180, cardinal 360, goldfish 370; tentative); aquazone.rez STR# 7100 CauseOfDeath has 23 entries (Starvation, Old Age, Water Temperature, Bad pH level, Disease…) and STR# 20005 is 'A fish has died.' Killing fish in a relaxation toy is a product decision.

**Evidence.** `core/sim.ts:10-57`, `core/sim.ts:248-252` (hunger clamps at 1 forever), `core/pose.ts:10-29`, `web/main.ts:1031-1044`.

**Change.** Sequence after B-01, F-01 and F-10. Fish gains optional `ageTicks`, `health` (0..1), `stage`, `life` ('alive' | 'dying' | 'dead') with defaults for old saves (adult, health 1, age 0). Health drains while hunger >= 1 or water < 0.2 (later temperature/pH, F-15). At 0 the fish plays all framesPerGroup of the +3 sheet matching facing (~2 s), then turns dead: no steering, rises to SURFACE at 0.2 px/tick belly-up (mirror vertically), fouls water at 2x WASTE_PER_TICK until removed, records its cause, and emits 'died' (F-13). Removal via Overview Remove plus Tank > 'Remove Dead Fish'. Preferences > 'Fish can die', default OFF (ask the user).

**Acceptance.** Tests (seeded): hunger 1 and health 0.01 goes dying then dead within N ticks with cause 'Starvation'; a dead fish reaches SURFACE and water falls until removeFish; a baby at adultTicks-1 becomes adult after one tick; with deaths disabled health never drops below 0.1.

**Merged and related.**

- Merged from passes 1-8 ("Lifecycle stage 1", "Fish death / hunger consequences", "No sickness/death beyond lethargy"): start with lethargy at hunger >= about 0.9 plus recovery on feed, wired to the birth/sick/dead `snd` events once F-01 can read them; pair any death path with a revive so it stays friendly; foul-water surface gasping (open PR #106) is the pure-visual first step. Relaxation-toy constraint: no irreversible deaths by default (Preferences > "Fish can die", default off). Starvation notifications are declined.

### F-13 Event notices and a Tank Log window using the original's event text and animated art

Size M · Severity idea · Value 4/5 · Risk 2/5

**Problem.** The original popped an event dialog (FRMEVENT) for everything that happened. aquazone.rez has STR# 20001-20014 ('Adding food.', 'Adding Medicine.', 'Changing water.', 'Cleaning the filter.', 'A fish has died. Name/Species/Age', 'Laying eggs.', 'Baby has hatched.', 'A fish is sick.', 'A fish is pregnant.', 'Fish are mating.', 'The eggs have all died.', 'A fish has given birth.', 'A miscarriage occurred.', 'A fish has recovered.') and 52 EvDP pictures, 70x70: 13 events x 4-frame animations (a hand dropping food, a dropper, a bucket, a filter cartridge, a fish fading to black, a mating pair, an egg hatching…). Verified word for word. aquazone.rez is at `https://archive.org/download/aquazonewithguppiesandaddons/AQUAZONE.iso/Updater%2FData%2Faquazone.rez` (4,136,362 B, CORS OK).

**Evidence.** `core/sim.ts:205-246` (tick emits nothing), `web/statsmodel.ts:86-112`, `macos/Finsical.swift:76-102` (window table), `macos/Finsical.swift:555-577`.

**Change.** core/sim.ts `readonly events: SimEvent[]`, a typed union `{kind: 'fed' | 'medicated' | 'waterChanged' | 'filterCleaned' | 'died' | 'laidEggs' | 'hatched' | 'sick' | 'recovered' | 'pregnant' | 'born' | 'mating', tick, fishId?, data?}` pushed in tick() and public actions. main.ts drains it each frame into a persisted ring (localStorage `finsical:log`, 500 entries with wall-clock time), posts op 'log', and plays a matching 'snd ' event sound if one exists. New log.html/log.ts client window (native entry in the Finsical.swift window table and Tank > 'Tank Log' Cmd-L): an Osmium Finder list with a 16x16 icon cut from the first EvDP frame, Date, Event and Fish columns. Optional 'Show event alerts': a movable modal with the 4-frame animation at 4 fps plus the original label lines ('Name: Andrew Species: Dell's Comets Age: 12 days'). Load aquazone.rez lazily the first time art is needed (text-only rows until then). Ship with 'fed', 'medicated', 'waterChanged', 'filterCleaned' first.

**Acceptance.** Tests: sim.test.ts that a manual dropFood emits nothing but a feeder drop emits 'fed', and a death emits 'died' with fishId; `web/logmodel.test.ts` for formatting and ring truncation.

**Merged and related.**

- Merged from passes 1-7: "Captain's Log", a SimpleText-styled auto-diary of tank events from stats history plus sim events, is this Tank Log. D-20's letters add entries.

### F-14 Water changes, a filter that gets dirty, and Clean Filter

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** The filter never clogs, so a fouled tank always heals by itself and the only care is 'stop feeding'. The original had Change Water… and Clean Filter commands and a 'Dirtiness:' field; STR# 310 describes the change-water dialog (amount, temperature, Blue = original, Red = new water, Green = resulting mix, conditioners, click the bucket); tanks carry a FltI 'AquaClean' record.

**Evidence.** `core/sim.ts:90-92`, `core/sim.ts:239-240` (constant filtration), `web/statsmodel.ts:86-112`.

**Change.** `Sim.filter = {dirt 0..1}` growing with the waste term; recovery = FILTER_PER_TICK * (1 - 0.8*dirt). `cleanFilter()` resets dirt, briefly adds murk, emits 'filterCleaned'. `changeWater(fraction, tempC)`: quality = q*(1-f) + f, temperature mixed (F-15), pH toward 7.2, chlorine += f unless a conditioner is dosed (F-16). UI: Tank > 'Change Water…' movable modal ('Amount: [25] %', 'Temperature: [26.0] °C', three Platinum bars in the original blue/red/green legend, 'Add Water Conditioner' checkbox, Cancel / Change with a bucket icon); Tank > 'Clean Filter'; a Stats 'Filter:' row; advice 'Clean the filter' (dirt > 0.6) and 'Change some water' (quality < 0.5).

**Acceptance.** Tests: changeWater(0.5) from 0.4 gives 0.7; dirt = 1 recovers at 20% of the clean rate; cleanFilter restores the full rate.

**Merged and related.**

- Overlaps open PR #114 (`sim.changeWater(0.6)` recovers 60% of the quality gap and siphons every settled pellet; Tank Stats button; native menu item). The dirty filter, Clean Filter and the Change Water dialog remain; keep #114's "settled food is waste" model (Design notes).

### F-15 Water temperature, pH and hardness with a heater, driven by each species' FsTI tolerances

Size L · Severity idea · Value 2/5 · Risk 3/5

**Problem.** FsTI stores per-species ranges as u32 LE thousandths (verified on cardinal, guppy, 赤金魚, ネオンテトラ): @0x0e/0x12 ideal max/min °C, @0x16/0x1a tolerated max/min, @0x20/0x24 ideal pH, @0x28/0x2c tolerated pH, @0x32/0x36/0x3a GH. Cardinal 22-28 °C ideal, 21-31 tolerated, pH 5.0-7.5; goldfish 16-28 / 10-35 °C; guppy and molly pH 6.9-8.5, GH 4-18. Tanks carry HtrI 'AquaHeat' (setpoint 26.0 °C, dial 16-36 °C) and Watr (25.998 °C, pH 7.001); a 'NonHeater' bowl exists. It adds care burden to a relaxation toy and matters little before F-12.

**Evidence.** `core/sim.ts:138-139` (waterQuality is the only water state), `web/stats.ts:64-86`, `web/prefs.ts`.

**Change.** Sim gains `water {tempC, pH, gh}` and `heater {on, setC}`; tempC relaxes toward (heater.on ? setC : ROOM_C = 20) with a ~2 tank-hour time constant; pH drifts down with waste and water changes pull it toward 7.2. Species params travel with the sheet (SpeciesParams keyed by pack/species; placeholders get 22-28 °C, pH 6-8). Stress is 0 inside the ideal band, rising to 1 at the tolerated limit; it drains health and scales vigor; beyond the limit a death records 'Water Temperature' or 'Bad pH level'. Stats rows 'Temperature: 25.9 °C' and 'pH: 7.0' with bars; a Preferences 'Tank' pane with a Heater checkbox and a 16-36 °C slider in 0.5 °C steps (metric only).

**Acceptance.** Tests (seeded): heater off approaches 20 °C within 5 tank-hours; a 22-28 °C species loses health at 20 °C but not at 25 °C.

**Merged and related.**

- Merged from passes 1-7 ("Water chemistry UI"): an advanced pane later; Stats already shows quality %.

### F-16 Diseases and medicines (8 diseases in aquazone.rez, 29 medicine packs on archive.org)

Size L · Severity idea · Value 2/5 · Risk 4/5

**Problem.** aquazone.rez defines 8 diseases (SicI/SicH 400-407: White Spot, Tailrot, Bellworm/Epistylis, Chilodonella, Water Mold, Red Rust, Red Rust B, ARDS) and 4 base medicines (AZ Water Conditioner, Chlorine Cut, Green-S, Methylene Blue). allfoodsandmeds.zip/meds.zip has 11 .med and a meds.txt mapping medicines to diseases ('Green: white spot, tailrot, molds; GreenS: rust & rust B; Horisona: Chilodonella, gill & skin flukes; Methylene: white spot, tailrot, water mold'); JPN 薬品 has 18 .med. Each med has DrgH name/description, 60-byte DrgI params (undecoded) and an 83x83 DRDP icon. The least relaxing feature, with the most dependencies.

**Evidence.** `core/sim.ts` (no health or disease state), `web/import.ts:65-89`.

**Change.** After F-12 and F-15. `Fish.disease = {id, sinceTick}`; each tank-hour the infection chance scales with (1 - waterQuality) and temperature stress (seeded). A sick fish loses health slowly and swims with lower vigor; render a per-disease overlay generated once per cached frame (White Spot: seeded 1-px white dots on opaque pixels; Rust: tint toward #b0603a; Water Mold: whitish rim). Medicine packs import into a cabinet (section 'medicine', meds.zip nested collection). Tank > Medicate > <name> doses the tank: concentration decays over ~2 tank-days and cures listed diseases (a table keyed by DrgH name from meds.txt until DrgI is decoded); a second dose within the window risks 'Drug poisoning'; Water Conditioner also raises waterQuality by 0.5 over 10 s and neutralizes F-14 chlorine. A Disease Information window lists SicH names.

**Acceptance.** Tests (seeded): water 0.2 makes a fish sick within N tank-hours; a matching medicine clears it and emits 'recovered'; a non-matching one does not.

### F-17 Breeding: mating, eggs, livebearer births, fry and family trees

Size L · Severity idea · Value 3/5 · Risk 4/5

**Problem.** Breeding was AquaZone's heart ('they will live long and BREED for limitless generations'). Data: F-02's sexes; FsTI u16@0x02/0x04 is 1/2 for egg-layers and 2/1 for livebearers; FsTI u32@0x0a looks like incubation/gestation minutes (neon and cardinal 1440, goldfish 5040, guppy and molly 43200; tentative); EGPC (5x5 egg sprite), EGPP clutch pictures, EggI/EggH egg records with parent names; blackmolly has 'Pregnant 01-05' individuals and bred records naming parents; banggai has 'Banggai eggs'; 13 JPN egg packs (F-23). Events exist for mating, laying, hatching, pregnancy, birth and miscarriage; the original had a Family Tree window.

**Evidence.** `core/sim.ts:132-172` (no egg entity, no sex), `core/data/fsh.ts:148-164`, `web/import.ts:80-88`, `PLAN.md:59-61` (out of v1 scope; says the hooks exist).

**Change.** After F-02, F-10, F-11 and F-12. `Sim.eggs: Egg[] {id, speciesKey, x, y, laidTick, hatchTick, motherId, fatherId}` persisted (SavedTank v3 with migration). Once per tank-hour, an adult 'M' and 'F' of the same pack with hunger < 0.3 for 2 tank-hours and water >= 0.8 (and ideal temperature once F-15 exists) mate with a seeded probability (~0.15 per tank-day): a 90-tick chase, then egg-layers lay k eggs near plants or gravel (drawn with EGPC) and livebearers set `pregnant = gestation` and later give birth. k is capped by FsTI u16@0x08 (tentative brood size) and a global 24-40 fish cap. Hatchlings are 'baby' fish inheriting pack and species, a free individual or '<Mother> Jr.', and parent ids; Get Info shows 'Parents: Samantha x Scott'; a Family Tree list uses a Finder outline view with disclosure triangles. All rolls use this.rand().

**Acceptance.** Tests (seeded): a fed pair in clean water produces eggs within N tank-days; eggs hatch at incubation; livebearers give fry and no eggs; a same-sex tank never breeds; the cap holds.

**Merged and related.**

- Merged from passes 1-7: guppy breeding (colour-mixing fry from `EggI`/`EGPC`/`EGDP`) as headline 0.4.0 material, and a breeding-lite variant: at least two well-fed same-species fish for a stretch give a small chance per day-cycle of a juvenile spawning.

### F-18 Colour morphs from multi-variant packs, and guppy strains from the Deluxe II gp*.rez sets

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** gup addon1's three .REZ blobs hold 28 distinct adult 8g sheets (red, black, white, leopard males; orange and gold females) that collapse to one sheet. The Deluxe II ISO has Updater/Data/gp15000.rez..gp23000.rez (3.5-4.7 MB each, CORS OK) with 10/10/10/8/8 = 46 guppy phenotype families (ids step by 200, each with full ELRA/ELRB +0..+3, AMV#/BMV#, EGPC); FshI carries gene-like numeric fields.

**Evidence.** `web/main.ts:120-133`, `web/main.ts:138-150`, `web/import.ts:65-89`.

**Change.** After B-01, `allAdultSwims(sheets)` returns the max-groups sheets whose area is >= 0.5x the largest; usePack stores them per pack; spawnFish picks one at random and stores `Fish.morph` (index), preserved by saveTank and remapSheetIdx; sheetOf resolves `fishSheets[idx][morph ?? 0]`, so 'Add again' adds variety. Strains phase 1 (after F-01): expose each gp family as its own fish add-on (listing URL = ISO view URL + '#family=15200') and decode only that family's 8 sheets via `fshToSheets(d, {family})`; never decode a whole gp*.rez on install. Phase 2 (after F-17): fry inherit the mother's strain with p 0.5, the father's 0.4, a neighbouring strain 0.1 (seeded).

**Acceptance.** Tests: a synthetic 3-morph pack and a save round-trip; the inheritance distribution over 10000 seeded births within tolerance.

### F-19 Show the heater, the filter intake and its bubble plume in the tank

Size M · Severity idea · Value 2/5 · Risk 2/5

**Problem.** aquazone.rez has BAPC 1000 (349x980 glass heater, mostly cable; the tube is a ~300-px diagonal), BAPC 400 (76x370 filter intake) and BAPC 410-412 (3 frames of a ~67x73 bubble cluster), plus error strings about 'making the heater visible' and 'showing you the bubbles created by the filter'. The original's filter bubbled audibly.

**Evidence.** `core/sim.ts:367-370` (bubbles only from fish), `web/main.ts:1102-1109`.

**Change.** An equipment layer after the backdrop and before decor: the filter tube hanging from the top-right rim (0.5 scale, ~38x185) with a sim-owned deterministic bubble emitter at its outlet cycling BAPC 410-412 on the sim clock; the heater anchored bottom-left with its cable off the top (try 0.4 scale; 0.5 covers ~47% of the width). Filter off (F-14) stops the plume. Preferences 'Show heater and filter' plus an optional quiet filter hum. Load aquazone.rez lazily (fetchZip/packPut) and draw nothing until it arrives.

**Acceptance.** Tests: emitter bubble count after N ticks with a seed; screenshot check.

### F-20 Per-fish courage: brave fish turn to watch you when you tap the glass

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** The original gave each fish a 'Courage:' value; the box copy says 'Tap on the glass and watch them… watch you!' and some fish were brave while others scattered. Every species ships sheet id+2 with 'front turn' and 'back turn' 8-frame sequences of the fish turning to face the viewer. Finsical makes every fish within 48 px flee alike.

**Evidence.** `core/sim.ts:182-197`, `core/sim.ts:210-227`.

**Change.** `Fish.courage` in 0..1 seeded in addFish (or from FshI once decoded), saved. tap(): courage < 0.5 startles with strength*(1 - courage); a brave fish enters a new state 'look': it steers to ~20 px from the tap, plays the front-turn sequence (id+2, group 0) once, holds facing the glass ~1 s, then drifts. Panic propagation skips brave fish; add 'look' to overviewmodel STATES.

**Acceptance.** Tests (seeded): a courage 0.9 fish near a tap enters 'look' and ends within N px of the tap point; courage 0.1 startles at 90% strength; determinism.

### F-21 Offer the 'Missing addons Aquazone.7z' library (988 entries); archive.org's listing links drop a path prefix

Size M · Severity idea · Value 4/5 · Risk 3/5

**Problem.** The main item's 'Missing addons Aquazone.7z' (147 MB) is listed by View Archive with CORS and serves single entries. It holds an English, sorted ITEMS library: 98 .fsh, 172 .plt, 350 .acc (incl. Stone accs and Wood accs), 108 .grv, 50 .bmp backgrounds, 43 .azn, 35 .fd, 12 .med, plus System/*.rez species sets (DS01-15, GP15000-23000, GF01-04, PC*, aw*, ma*, kf), Mekasia fish and toys, 'Mekasia Story.txt', the iMac fish (D-19) and AZ_WAVES.REZ (F-22). Overlap with existing JPN collections is small (plants 6 of 171 stems, gravel 5 of 108, .azn 0); fish overlap 'addon and modded fish.zip'. Catch: 986 of 988 hrefs read '.../Missing addons Aquazone.7z/addons Aquazone/ITEMS/...' but the entry lives at 'Missing addons Aquazone/ITEMS/...'; the short href returns HTTP 200 with 0 bytes, which fetchZip would cache forever and report as 'no pack inside'. Entries take 1-10 s (server-side 7z extraction).

**Evidence.** `web/import.ts:37-60` (Collection), `web/import.ts:65-88`, `web/import.ts:190-281` (listCollection; URL built from u.href at :261-270), `web/import.ts:115-131` (fetchZip persists any 200), `web/import.ts:289-299`, `web/import.ts:1038-1056` (THUMB_PAR).

**Change.** (1) Add `sevenZipRoot?: string` to Collection and DEFAULT_ITEM collections with outer 'Missing addons Aquazone.7z', sevenZipRoot 'Missing addons Aquazone/', and prefix/exts pairs 'addons Aquazone/ITEMS/Plants/' /\.plt$/i, '…/Accessories/' /\.acc$/i (covers Stone and Wood subfolders), '…/Gravel/' /\.grv$/i, '…/Backgrounds/' /\.bmp$/i, and the tanks folder /\.azn$/i (check exact folder names against the listing); fish last, deduped case-insensitively by stem against 'addon and modded fish.zip'. (2) In listCollection when sevenZipRoot is set: `const real = rel.startsWith(root) ? rel : root + rel.slice(rel.indexOf('/') + 1); const url = `${BASE}/${item}/${encodeURIComponent(outer)}/${encodeURIComponent(real)}`;` and use it for `seen`. (3) fetchZip throws when `d.length === 0`, before packPut. (4) THUMB_PAR 1-2 for these collections; label the source 'English library' (U-08).

**Acceptance.** Tests: an import.test.ts fixture of two View Archive rows ('addons Aquazone/ITEMS/Plants/X.plt') yields a URL containing 'Missing%20addons%20Aquazone%2FITEMS%2FPlants%2FX.plt'; fetchZip with an empty 200 rejects without packPut.

### F-22 The game's own sound effects (System/AZ_WAVES.REZ, 25 WAVs) are on archive.org, but the UI says they are not

Size M · Severity low · Value 4/5 · Risk 2/5

**Problem.** The Sounds empty state says the game's sound effects aren't on archive.org. The Windows sound bank at 'Missing addons Aquazone/System/AZ_WAVES.REZ' inside the 7z (1,182,480 B via F-21's prefixed URL) is a 9003 pack (magic 00010000) whose 25 chunks are plain RIFF/WAVE (8-bit, mostly mono, 11025/11127/22050/22254 Hz; durations 0.04-7.38 s); the trailer has one 'snd ' type, 12-byte records with ids 1000-1003, 2203, 2671 … 32080, no names. The four ~50 ms clips 1000-1003 are probably the four glass-tap zones (unverified by listening). importAddon sends pack data only to fshToSheets and packImages, so it yields 'no pack inside'.

**Evidence.** `web/import.ts:740-743` (clearDetail text), `web/import.ts:346-364` (importAddon), `core/data/fsh.ts:42-54`, `web/audio.ts:128-156`, `web/main.ts:983-997`.

**Change.** (1) In importAddon also collect `packChunks(b.data).filter(c => ascii(c.payload, 0, 4) === 'RIFF' && ascii(c.payload, 8, 4) === 'WAVE')` into `sounds` named `azwave_<resId>` (ids from the trailer directory, F-01, or the chunk index meanwhile), kind 'effect' (B-19). (2) A Sounds collection entry (or a 'Game Sound Effects' row) for that file. (3) An id -> event table in audio.ts (tap centre/side/top/bottom, drop, intowater, bubble, ambient 'aqua') consulted before the name search; filling it needs someone to listen to the 25 clips; record the mapping in a comment. (4) Fix the clearDetail text.

**Acceptance.** Test: a vitest fixture pack with two RIFF chunks yields two sound records with the right names.

**Merged and related.**

- Merged from passes 1-7 ("Sound browser for game SFX"): deep-link, or accept a folder drop of a whole set with a progress UI.

### F-23 List the JPN egg packs (13 species) and the 26 'Power Updater' zips

Size S · Severity idea · Value 3/5 · Risk 1/5

**Problem.** AQUAZONE 魚/魚単体/魚卵.zip (2.2 MB) holds egg packs for 13 species (カージナルテトラの卵.fsh …; full fish packs plus 20 EggI/EggH/EGPP individuals each), but it is a zip inside the collection zip and is never listed. The same folder has 26 'Power Updater' zips (Angel fish, クラウンローチ, ゼブラ・ダニオ, ハーレークインフィシュ, ブラックエンゼル, Discus, Arowana, guppy breeding sets…); 'AQUAZONE Option ゼブラ・ダニオ.zip' holds ITEMS/ZEBRA.DNA (a full fish pack: tag 'XXXX', ELRA/ELRB x4, FsTI/FsTH) plus C_WENTY.PLT and WORM.FD.

**Evidence.** `web/import.ts:79-83` (JPN fish collection: loose .fsh only), `web/import.ts:90-93` (PACK_EXT), `web/import.ts:309-315`, `web/import.ts:462-471`, `core/data/zip.ts:40-66`.

**Change.** (1) Egg packs: `{section: 'fish', item: JPN_ITEM, outer: JPN_ZIP + '/AQUAZONE (JPN) SET/AQUAZONE 魚/魚単体/魚卵.zip', exts: /\.fsh$/i, deep: true}` (nested mode; one download lists 13 species); list under Fish until F-17, then place a clutch that hatches. (2) Power Updater: `{section: 'fish', item: JPN_ITEM, outer: JPN_ZIP, prefix: 'AQUAZONE (JPN) SET/AQUAZONE 魚/Power Updater/', exts: /\.zip$/i}`; each entry URL serves the zip raw and fetchInnerBlobs' no-fragment path imports every PACK_EXT entry. Accept `.dna` only for this collection and only when its adult sheet hash is not already installed (Arowana.dna duplicates Medaka art, B-11); stray .PLT/.FD entries are ignored by handleImages.

**Acceptance.** Tests (import.test.ts): a loose-mode listing with /\.zip$/ yields one item per zip; importAddon on a synthetic zip holding ITEMS/X.DNA and a .PLT returns the DNA sheets; nested listing of a subfolder of .fsh leaves yields unique names. (derived) As listed: a loose-mode listing with `/\.zip$/` yields one item per zip; `importAddon` on a synthetic zip holding `ITEMS/X.DNA` and a `.PLT` returns the DNA sheets; a nested listing of a subfolder of `.fsh` leaves yields unique names.

### F-24 The bonus bundle's Mecha-snail gravel (G_Debris.grv) and animated MekaUni accessory are never listed

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** The JPN non-retail bonus zip's メカデンデンムシ/Denden/ folder also holds G_Debris.grv (219,658 B; its 1001x138 image passes pickGravel) and MekaUni.acc (576,894 B; 83x83, 168x192 and 10 x 278x187 frames, picked correctly). The zip is already downloaded for the fish listing.

**Evidence.** `web/import.ts:84-87` (JPN_BONUS listed only for .fsh and audio), `web/import.ts:190-239`, `web/import.ts:216-219`.

**Change.** Append `{ section: 'gravel', item: JPN_ITEM, outer: JPN_BONUS, exts: /\.grv$/i, deep: true }` and `{ section: 'accessories', item: JPN_ITEM, outer: JPN_BONUS, exts: /\.acc$/i, deep: true }` to COLLECTIONS; nested mode handles deep entries and fetchZip dedupes the download.

**Acceptance.** Test: extend the nested-zip fixture in import.test.ts with a .grv and an .acc under a subfolder and assert the sections.

### F-25 Show each add-on's Read Me and credits in the detail pane

Size S · Severity idea · Value 2/5 · Risk 1/5

**Problem.** Many archive.org add-on zips carry README text with install notes and modder credits ('addon files README.txt' in goldfish addon and guppy, 'arowana addon files README.txt', three READMEs in updatedAZfiles; the 7z has 'Read me - by Kez/SSR' files). They are discarded.

**Evidence.** `web/import.ts:289-316` (fetchInnerBlobs keeps only PACK_EXT entries), `web/import.ts:590`, `web/import.ts:785-786`.

**Change.** In fetchInnerBlobs' no-fragment branch also collect `*.txt` under 16 KB; decode with UTF-8 `{fatal: true}`, then `TextDecoder('shift_jis')` for JPN items, then `TextDecoder('macintosh')` (90s Mac text; latin1 would mangle curly quotes); return `readme?: string` on the first PackResult. showDetail adds a 'Read Me…' push button next to Play opening a small Osmium window (mountWindow, as the overlay does) with the text in a monospace scrolling well.

**Acceptance.** Test: vitest importAddon on a synthetic zip with a README.txt returns the text.

### F-26 New Tank, Save Tank As… and Open Tank… (start over, back up, share)

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** The whole tank lives in one localStorage key: no backup, no second tank, and emptying it means removing items one by one.

**Evidence.** `web/main.ts:35-55` (SAVE_KEY), `web/main.ts:78-95`.

**Change.** File commands in the native menu and U-14's browser menu. New Tank…: caution alert 'Empty the tank? Your fish and add-ons will be removed.', then an empty v2 save and reload. Save Tank As…: serialize `{v: 2, fish, addons, machine, crt}` as `.finsicaltank` JSON (native: bus op 'saveFile' {name, text} to NSSavePanel; browser: Blob download). Open Tank…: validate with loadTank's checks (S-07), write SAVE_KEY and reload; dropping a .finsicaltank on the tank does the same. Do not reuse .azn (that is importable scenery).

**Acceptance.** Vitest: serialize/parse round trip; reject wrong versions and non-array fish.

**Merged and related.**

- Merged from pass 8 ("Save slots / tank profiles"): multiple save slots in Preferences or a small Tank menu; a versioned export (settings, roster, stable pack provenance and an explicit choice about including local assets) with validate-before-replace, preview and rollback. Build multiple tanks on B-34, not on competing global save keys. New Tank overlaps open PR #127 (Empty Tank).

### F-27 Accept add-on files dropped on the Dock icon or opened with Open With (the Mac OS 8 way to install)

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** The tank already imports dropped .azpack folders, raw packs and sound files, but only onto the window. In Mac OS 8 you installed things by dropping them on the application icon.

**Evidence.** `macos/Info.plist` (no CFBundleDocumentTypes), `macos/Finsical.swift:6-56` (WebHandler), `web/main.ts:919-1000` (import logic tied to the drop listener).

**Change.** (1) Info.plist CFBundleDocumentTypes with CFBundleTypeRole Viewer and LSHandlerRank Alternate for fsh, rez, rsrc, bin, hqx, azpack, wav, aiff (LSItemContentTypes public.data plus public.folder for .azpack folders and extension-less classic add-ons). (2) AppDelegate `application(_:open urls:)` registers each URL in `pendingImports: [String: URL]` under a random token; WebHandler serves `finsical://app/__import/<token>/<name>` from that dictionary only (read once, then removed); post `window.finsical.importUrls([{name, url}])`. (3) main.ts: split the drop handler body into `importFiles(files: Map<string, Blob>)`, called by the drop listener and by importUrls (fetch each URL into a Blob).

**Acceptance.** Test: vitest importFiles with an in-memory Map; manual: drag a .fsh onto the Dock icon and a fish appears.

### F-28 Presentation modes: desk widget on the desktop, ghost (click-through), full screen, screen saver

Size L · Severity idea · Value 3/5 · Risk 4/5

**Problem.** The original was sold as 'Desktop Life' with Full Screen, Menu Bar and Tool Bar toggles, and screensaver editions existed. Finsical has only the floating window (U-16 covers the float and Spaces toggles).

**Evidence.** `macos/Finsical.swift:487-527`, `macos/Finsical.swift:500-501`, `macos/Finsical.swift:542`, `macos/Finsical.swift:555-577`.

**Change.** `enum Presentation { case window, desktop, ghost, fullScreen, screenSaver }` persisted in UserDefaults, restored at launch, one webview reparented between windows so there is one simulation. Desktop: borderless window at `NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopIconWindow)) + 1)` (above Finder's icon layer; `.desktopWindow + 1` would swallow clicks), `collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]`; verify on macOS 12 and 15 that clicks still feed and tap. Ghost: `ignoresMouseEvents = true`, `alphaValue = 0.7`; needs D-18's status item as the way back. Full screen: borderless window over the screen, the page gets a 'fullscreen' class via the bus (hides #machine, integer-scales the canvas, black letterbox), Esc exits. Screen saver: same at `.screenSaver` level with `NSCursor.hide()`, exit on local and global mouseMoved/keyDown monitors, started from Tank > 'Start Screen Saver' or after N idle minutes (`CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: CGEventType(rawValue: ~0)!)` checked every 30 s). A real .saver bundle is fragile on macOS 14+ (WKWebView inside legacyScreenSaver), so stay in-app.

**Acceptance.** Manual tests: enter and exit each mode repeatedly; fish state is continuous and the tank returns to its saved frame.

**Merged and related.**

- B-26 follow-up (not in PR #151): a "desk toy" `NSPanel` with `.nonactivatingPanel` so tapping never steals focus.
- Merged from passes 1-7: "Screensaver / relaxation mode" (slow drift, hidden cursor, an After Dark homage); in the browser the Bare tank machine plus `requestFullscreen` is nearly free.

### F-29 Let Brightness, Contrast and the colour trims work without the CRT effect

Size S · Severity idea · Value 2/5 · Risk 2/5

**Problem.** The whole Picture pane is disabled unless 'Simulate a CRT monitor' is on (and that checkbox lives on another pane). A dimmer or warmer tank is useful on its own; a real monitor's front panel works regardless.

**Evidence.** `web/prefs.ts:107-131` (PANES.picture.offHint), `web/prefs.ts:426-431` (syncEnabled disables every slider), `web/crt.ts:136-141`, `web/app.css:106-110`.

**Change.** A pure `pictureTransfer(cfg): { r: [slope, icpt], g, b }` in crt.ts with K = 0.55 + 0.9*contrast, B = 0.5 + brightness, G_ch = 0.6 + 0.8*gain_ch: slope = K*B*G_ch, icpt = 0.4*(1-K)*B*G_ch (exactly the shader's map; CSS brightness()/contrast() pivot at 0.5 and would not match). main.ts inserts a hidden inline `<svg><filter id="pic" color-interpolation-filters="sRGB"><feComponentTransfer>` with linear funcR/G/B from it; when the CRT is off and settings are non-neutral, `canvas#tank.style.filter = 'url(#pic)'`, else 'none'. Measure WKWebView frame cost at full Retina size first; if slow, apply a 256-entry per-channel LUT to the 320x200 ImageData instead. syncEnabled keeps only zoom and Geometry CRT-only.

**Acceptance.** Tests: pictureTransfer(defaults) is identity within 1e-6 and matches the shader formula on random configs.

### F-30 Stats: a history graph that survives reopening the window

Size M · Severity idea · Value 2/5 · Risk 2/5

**Problem.** Trend arrows restart when Stats reloads and the tank keeps no history. A small period-style line graph (1-bit, like Mac OS 8's Memory or Energy panels) of water quality and average hunger over the last hour would teach the feeding rhythm.

**Evidence.** `web/stats.ts:49-63` (page-local 90 s history), `web/stats.ts:92-107`, `web/main.ts:385-419`, `core/sim.ts:94` (QUALITY_SEEK, module-private), `core/sim.ts:129`.

**Change.** main.ts keeps a ring of 120 samples (one per 30 s of sim time: {t: tickCount, water, avgHunger}) persisted in SavedTank as `hist` and sent in the state push (<= 120 x 3 numbers). stats.ts draws a 240x48 canvas in an .osm-well: black lines on white, a dotted QUALITY_SEEK line (export it or use B-10's core/tuning.ts), night bands shaded 50% grey from the day phase; trend arrows come from hist so they work immediately.

**Acceptance.** Test: a pure `pushSample(hist, s, max)` helper.

**Merged and related.**

- Overlaps open PR #140 (44x14 1-bit sparklines beside each Stats meter from the window's own history). The persisted tank-side history remains. Related: B-55.


### F-31 Light dimmer

Size S · Severity idea · Value 2/5 · Risk 1/5 (from passes 5-8)

**Problem.** Open PR #132 adds a lamp toggle (off pins `LIGHT_NIGHT`,
on restores the cycle; bare L, native Tank > Toggle Lights, persisted)
and PR #155 adds the light timer on the Mac's clock. A continuous
dimmer is still missing; tank presets carry a light record (`Ligt` in
F-01's type list; earlier notes called it `LigH`).

**Evidence.** `core/light.ts` (PR #155), `web/prefs.ts` Lighting pane
(PR #155), PR #132's `lightOverride`.

**Change.** A "Brightness" slider in the Lighting pane scaling the
computed light (clamped at the night floor); reconcile PR #132's L key
and override with PR #155's modes first (one light model). F-08 follow-up: Stats wording such as "Night, waxing gibbous" in clock mode.

**Acceptance.** (derived) `core/light.ts` test: the dimmer scales day
light and never goes below the floor; the setting persists.

### F-32 Specimen library and specimen cards

Size M · Severity idea · Value 3/5 · Risk 2/5 (from pass 8)

**Problem.** Installed species vanish from view when their last fish is
removed; there is no place to learn about them.

**Evidence.** `web/overview.ts`, `web/import.ts` installed list.

**Change.** A library of installed species that stay reusable after
their last living fish is removed: plain-language name, original name,
source, cached status and the decoded `FsTH` description where
available (F-02). Keep "Add fish" distinct from "Remove pack". An
illustrated card per species (original sprite, plain and
original-language names, a short description, attribution): collect
knowledge, not chores or achievements.

**Acceptance.** (derived) Removing the last fish of a species keeps it
in the library; "Add fish" spawns one without a download (IDB hit).

**Merged and related.**

- Needs F-01 and F-02 for names and descriptions; U-21 for plants.

### F-33 Per-species swim parameters from `FsTI`

Size M · Severity idea · Value 3/5 · Risk 3/5 (from passes 1-7)

**Problem.** All fish share one set of behavior constants, although the
packs carry per-species data.

**Evidence.** `core/sim.ts` constants; `FsTI` layout notes in F-12
(u16@0 tentative days to adulthood), F-15 (temperature and pH at
0x0e-0x3a) and F-17 (0x02-0x0a).

**Change.** After F-01, research which `FsTI` fields map to speed,
depth band and hunger rate (earlier notes assumed they exist; not
verified), then pass per-species params with the sheet (like F-15's
SpeciesParams) and let `cruise`, `bandY` range and hunger rate use
them, clamped to today's ranges.

**Acceptance.** (derived) Seeded sim tests: a species with a shallow
band stays in it; defaults reproduce today's behavior bit for bit.

## Delight and quirky ideas (open)

Done this pass and removed from this list: D-07.

### D-01 Fish rest at night: slower, lower, tails barely moving, woken by a tap

Size S · Severity idea · Value 3/5 · Risk 2/5

**Problem.** Night only darkens the overlay; fish swim exactly as by day. Real fish settle low and barely fin. Only meaningful once B-09/F-08 give the cycle a real night.

**Evidence.** `core/sim.ts:182-197`, `core/sim.ts:248-371` (tickFish never reads light), `core/sim.ts:367-370` (bubbles), `core/sim.ts:378-393` (decide/bandY), `web/main.ts:399-401`, `web/main.ts:1016-1025`, `web/overviewmodel.ts:44-47`.

**Change.** A derived flag, not a new FishState (turn/startle/seek logic untouched). Add `Fish.wakeUntil` (default 0). In the drift/seek branch `asleep = light < 0.5 && tickCount >= f.wakeUntil && f.hunger < 0.8` (light from `sim.setLight(v)` when F-08 drives it). Asleep: cap speed at cruise*0.3, re-decide every MOVE_TICKS*3, pull bandY into the lowest quarter (maxY-40..maxY-8), bubble chance x0.3. tap(), propagated panic and pointer activity over the tank set `wakeUntil = tickCount + 30*60`, so a watched tank looks awake. postState sends `asleep: true`; Overview shows 'Sleeping'; animFrame rate x0.25 while asleep; optionally a 3x3 pixel 'z' rising every ~8 s from one sleeper.

**Acceptance.** Tests (sim.test.ts, light forced 0.3 vs 1.0 over 3000 ticks): lower mean speed and deeper mean y at night; after tap() the fish startles then swims at day speed; a sleeping fish still seeks food above hunger 0.8; determinism holds.

**Merged and related.**

- Follow-up from this pass: gate sleep on `light < 0.5`, not the review's original `< 0.45` (the Change above already says 0.5). PR #155 (open) holds clock-mode nights at exactly `CLOCK_NIGHT_LIGHT = 0.45` (`core/light.ts`), so a strict `< 0.45` would never fire in timer mode; 0.5 also matches Stats' Day/Night split.
- Planned for PR #155 but not included.
- Overlaps open PR #128 (a real `sleep` state: after the tank has seen daylight once, fish settle on the gravel below the dusk threshold with a barely-there stroke, ignore food and wake at dawn or on a knock; exported `SLEEP_LIGHT`/`WAKE_LIGHT`; a `seenDay` latch). If #128 merges instead, check its thresholds against the 0.45 clock floor too.
- Merged from passes 1-7 (moonlight leftovers): keep sparkles visible at night and darken sleeping fish sprites slightly. Night glow is V-23.

### D-02 Fish gather at the glass where the pointer rests

Size S · Severity idea · Value 3/5 · Risk 2/5

**Problem.** Real fish crowd the front glass when someone comes close, expecting food.

**Evidence.** `core/sim.ts:378-393`, `web/main.ts:100-111` (no pointermove handler).

**Change.** Sim gains `lure: {x, y} | null` and `lureSince`. In decide(), when lure is set, the fish is not seeking, not startled in the last 300 ticks (`f.lastStartle` set in tap/panic), `tickCount - lureSince < 600` (curiosity fades after 20 s of a still pointer) and `rand() < 0.6`: target lure.x +/- 15, lure.y +/- 10, bandY = lure.y. main.ts pointermove (U-03's mapToTank) sets sim.lure and bumps lureSince only after > 4 logical px of movement; pointerleave clears it. A pure `lureActive(sim)` for the expiry rule. Verify in WKWebView that mousemove arrives while another app is frontmost.

**Acceptance.** Tests: with a lure fixed at tick 0, mean distance over ticks 100-550 is lower than the same seed without a lure; after tick 700 targets are unbiased; null lure leaves existing tests untouched.

**Merged and related.**

- D-07 follow-up (not in PR #160): `sim.fearAt = {x, y, until}` makes `decide()` reroll targets within 40 px of a knocking spot for a minute; the same target-biasing hook as the lure.
- Overlaps open PR #138 (the nearest calm fish within `NOTICE_RADIUS` of a hovering pointer drifts to a `NOTICE_STANDOFF` ring; hunger above about 0.75 biases the band toward the surface to beg; hunger and panic outrank curiosity). Merge the ideas rather than adding a second lure system.

### D-03 Schooling for small same-species fish, and separation so fish don't stack on a pellet

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** Five neon tetras wander as unrelated individuals, and several fish chasing one pellet are drawn on top of each other.

**Evidence.** `core/sim.ts:205-227` (only panic propagation reads other fish), `core/sim.ts:289-297` (every seeker targets the exact pellet), `core/sim.ts:378-393`, `web/main.ts:83-89`, `web/main.ts:138-150`.

**Change.** `addFish` accepts `schooling?: boolean`, saved in the saveTank whitelist. main.ts sets it at spawn when the cell is small (max(cellW, cellH) < 70) or the common name (F-02) matches /tetra|neon|rasbora|cardinal|danio|guppy|molly|pencil/i. In decide(), with >= 3 living schooling fish sharing f.pack, the lowest id leads and decides normally; followers with probability 0.75 take tx = leader.tx +/- 15, ty = leader.ty +/- 8, bandY = leader.bandY; a follower whose leader is removed picks the next lowest id. Separation in drift/seek: for each neighbour within 0.6*(halfW_a + halfW_b) (fixed radius until B-01's extents), nudge heading away by up to TURN_RATE/2 (O(n^2), fine below 50 fish). Seekers offset their target by a per-fish angle around the pellet. Use only this.rand().

**Acceptance.** Tests: 6 schooling fish end with lower mean pairwise distance than the same seed unschooled; after a feeding no two centres stay closer than 4 px for > 10 ticks; a lone schooling fish behaves as today; determinism.

**Merged and related.**

- Schooling overlaps open PR #112 (`decide()` sometimes anchors a wander target near a same-species schoolmate, x-scatter ±42 px, half that vertically). The separation half is new; mind P-20's O(n²) budget.

### D-04 Clickable case hardware: floppy slot imports, brightness knob, power button, CD slot, speakers

Size M · Severity idea · Value 4/5 · Risk 2/5

**Problem.** The art shows real controls, but every press on the case drags the window. Measured viewBox rects (overlaid on the PNGs and verified): Plus floppy bezel ~{x:388, y:703, w:359, h:79}, Plus brightness sun ~{x:85, y:965, w:50, h:50}, Plus badge ~{x:74, y:712, w:236, h:53}; iMac Bondi power ~{x:985, y:885, w:46, h:46}, CD slot ~{x:569, y:862, w:371, h:55}, speakers ~{x:301, y:839, w:170, h:170} and {x:1042, y:839, w:170, h:170}, Apple logo ~{x:645, y:5, w:55, h:45}.

**Evidence.** `web/machines.ts:27-45`, `web/machines.ts:62-104`, `web/main.ts:735-764`, `web/main.ts:776-788` (drag handler already skips buttons at :782-784), `web/app.css:28-30` (#machine pointer-events none), `web/machines.test.ts`.

**Change.** `Machine.hotspots?: { x, y, w, h, act: 'import' | 'brightness' | 'power' | 'mute' | 'about' | 'jukebox'; tip: string }[]` in viewBox units, starting with plus and imac-bondi. A `?hotspots` debug query outlines them. layoutMachine positions a new #hotspots layer (z-index above #machine, pointer-events none) whose transparent `<button>` children (pointer-events auto, aria-label and title from tip) use the same s/ox/oy transform. Actions: import opens Import Add-ons with a slot-insert sound (a file dropped on the floppy plays a disk-slide animation before the drop handler); brightness is a vertical drag on cfg.brightness (or F-29's filter when the CRT is off); power sleeps the display (D-06); mute toggles F-05's master gain; about opens A-04; jukebox opens F-05's player; an LED sprite (Performa) can flicker while archive.org fetches are in flight.

**Acceptance.** Test (machines.test.ts): every hotspot lies inside the viewBox and the opaque art, and never intersects `hole`.

**Merged and related.**

- Merged from passes 1-8: machine-case easter eggs (a TAM clock, the Plus programmer's switch) with sounds; an activity LED (an existing case indicator or a Platinum status glyph lights steadily during imports and returns to idle, with a textual equivalent; no flashing and no fake disk sounds).

### D-05 Startup screen with a 'Happy Fishbowl' and a Mac OS extensions parade of add-ons

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** On launch the tank shows placeholders (or wrong species, B-14) while add-ons restore, then art pops in. A Mac OS 8 style boot would turn the wait into a moment.

**Evidence.** `web/main.ts:253-270`, `web/main.ts:321-332`, `web/main.ts:875-900`, `web/main.ts:1047-1061`, `web/main.ts:1126-1142`, `web/import.ts:1231-1246`.

**Change.** New `web/boot.ts`, a pure state machine driven by elapsed ms and a restoreDone flag: 'black' plus 'desktop' (~600 ms total; grey, a 1-bit 50% dither on the Plus), 'parade', 'fade' (400 ms); drawn into the tank ctx instead of render() while active so CRT mode applies. An original 32x32 smiling fishbowl icon (not Apple's Happy Mac) and on colour machines a small 'Welcome to Finsical' box. Parade: when each restored add-on's handler fires, draw its thumbnail at `paradeSlot(i) = {x: 8 + (i % 9) * 34, y: 160 - floor(i / 9) * 30}`. Hide fish until it ends; end at restore completion plus 400 ms or a 6 s cap; a click or key skips; skip entirely with no saved add-ons or under prefers-reduced-motion. Chime: an original synthesized soft chord (3 triangle oscillators, 1.5 s exponential decay); Apple's startup chime is a registered sound trademark. Prefs checkbox 'Show startup screen' (finsical:boot, default on).

**Acceptance.** Tests: phase transitions and paradeSlot wrapping in boot.test.ts.

### D-06 CRT power-on bloom, power-off collapse, a degauss wobble and Energy Saver display sleep

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** Switching the tube on or off and changing machines are instant cuts. Real tubes bloom open, collapse to a line and a dot, and Apple monitors 'BWONG' with a rainbow wobble when degaussing.

**Evidence.** `web/crt.ts:24-145` (FRAG), `web/crt.ts:318-354` (setEnabled toggles in one frame), `web/main.ts:665-675`, `web/main.ts:703` (setCrt at launch from the stored pref), `web/main.ts:766-773`, `web/main.ts:1130-1142`, `web/audio.ts:150-156`.

**Change.** (a) Effects: `enum CrtToggleSource { User, Restore }` as setCrt's second parameter (the launch call at main.ts:703 passes Restore, so no degauss on every launch). FRAG gains `uniform float uPower; uniform float uDegauss;`: before the bounds check `float vy = max(uPower*uPower, 0.004); uv.y = (uv.y-0.5)/vy+0.5; uv.x = (uv.x-0.5)/clamp(uPower*4.0,0.02,1.0)+0.5;` and colour x `1.0 + (1.0-uPower)*2.0`; degauss `uv.x += sin(uv.y*40.0 + uTime*60.0) * 0.008 * uDegauss`, conv x (1 + 6*uDegauss), colour x (1 + 0.3*uDegauss) or a per-channel rainbow term. CrtFilter gains powerOn(ms), powerOff(ms): Promise<void> and degauss(), animated from pure exported envelopes `powerCurve(t)` and `degaussAmp(t)` (exponential decay, 0 after ~0.6-1.2 s). setCrt keeps one 'pending' token so a toggle during powerOff cancels and applies the latest state. CSS keyframes on #screen (scaleY 0.01 plus brightness(3)) when the CRT is off. Triggers: machine change, the CRT turning on by the user, Tank > 'Degauss', bare D in the browser. Sound: TankAudio.degauss() synthesizes a 60 ms 55 Hz thump plus a decaying high whine (or 50 Hz sawtooth through a 300 Hz lowpass), played only when `ctx.state === 'running'`. Skip wobble and collapse under prefers-reduced-motion. (b) Energy Saver: Prefs slider 'Sleep the display after 5-60 min / Never'; on idle (no pointer, key or bus intent other than hello/wantThumbs) play powerOff and skip render()/crt.render() while `setInterval(…, 1000/30)` keeps sim.tick() running; any activity wakes with powerOn.

**Acceptance.** Tests: envelope values in crt.test.ts; a manual check with the C key.

**Merged and related.**

- Power-on overlaps open PR #141 (a `uPower` uniform plays a ~450 ms warm-up on every enable, brightness keyed to raster openness, skipped under reduced motion). What remains: power-off collapse, degauss and Energy Saver; reuse #141's uniform rather than adding a second one.
- Merged from passes 1-7: a machine switch could play a brief white flash or the degauss wobble to sell the hardware swap.

### D-08 Stereo-positioned tank sounds with varied bubbles

Size S · Severity idea · Value 3/5 · Risk 1/5

**Problem.** Every splash, bubble and knock plays dead centre at a fixed gain.

**Evidence.** `web/audio.ts:99-126`, `web/audio.ts:128-148`, `web/main.ts:106-110`, `web/main.ts:794-797`.

**Change.** Route everything through F-05's master gain. play() takes an optional pan and inserts a StereoPannerNode (WebKit 14.1+, fine for macOS 12). feed(x), bubble(x) and tap(x, …) pass `pan = clamp(x/320*1.6 - 0.8, -0.8, 0.8)`; render() passes the newest bubble's x via `sim.bubbles[sim.bubbles.length - 1]` (not `.at(-1)`, which needs Safari 15.4); feedFish passes TANK.width/2. Bubbles get playbackRate 0.94-1.06 at random.

**Acceptance.** Test: the pure pan mapping and a volume clamp.

**Merged and related.**

- Merged from passes 1-7 ("Eat gulp sound"): `find('eat', 'gulp')` on `food.eaten` if a pack ships one, silent otherwise. PR #159's master gain (open) is the routing point.

### D-09 Copy Picture and Save 'Picture 1' (optionally as a real PICT)

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** People will want to share their tank. Mac OS named screenshots 'Picture 1', 'Picture 2'.

**Evidence.** `macos/Finsical.swift:578-585` (Edit > Copy maps to NSText.copy; the page has no selection), `web/main.ts:798-800`, `tools/az/pict.py`.

**Change.** Native with the case and CRT: `WKWebView.takeSnapshot(with:)` of the whole window to NSImage, written to NSPasteboard.general ('Copy Picture', Shift-Cmd-C) or saved via NSSavePanel as '~/Desktop/Picture N.png' (first free N), with a shutter click and a one-frame white flash. Without the case: `window.finsical.snapshot(scale = 2)` returns a nearest-neighbor 2x PNG of the 320x200 frame. Browser: bare P uses `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` inside the key gesture, falling back to a download. Optional low-priority PICT v2 writer (0x0011 version, 0x0C00 header, 0x0098 PackBitsRect with an 8-bit clut), round-trip tested through tools/az/pict.py (gives T-16's pict.py a use).

**Acceptance.** (derived) Native: Copy Picture puts a PNG on the pasteboard and Save names files "Picture N" with the first free N; browser: P copies or downloads a 640x400 PNG; the optional PICT round-trips through `tools/az/pict.py`.

**Merged and related.**

- Overlaps open PR #103 (Take a Picture: a 2x nearest-neighbor PNG download in the browser).
- Merged from passes 1-7: "Save Picture with bezel" (composite the case PNG over the tank exactly as on screen, a shareable postcard) and a time-lapse contact sheet (1 fps `toDataURL` for 60 s).

### D-10 Messages in bottles that sink into the tank with tips and trivia

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** Most features are invisible (bare F, C and S, the feed band, Cmd-I); the only in-app guidance is the Stats care advice.

**Evidence.** `web/main.ts:100-111`, `web/main.ts:825-868`, `web/statsmodel.ts:86-116`.

**Change.** New `web/tips.ts`: ~25 tip strings plus dynamic ones from F-02 ('Your angelfish Scott hatched at Franks Fish Farms in 1997'), and a pure scheduler `nextBottleAt(now, lastShown, rng)` (first after 10 min, then every 30-90 min, never while the display sleeps or at night). A render-only bottle in main.ts (original 8x14 sprite with cork and note) sinks with a slight sway and rests on the gravel; pointerdown hit-tests it before the feed/tap branch and opens a small overlay window (.ov + mountWindow); seen tips go to localStorage `finsical:tips-seen` (try/catch) so none repeats until all are shown. Prefs toggle 'Messages in bottles'.

**Acceptance.** Tests: scheduler bounds and no-repeat order.

### D-11 Seasonal surprises and fish birthdays (party hats on hatch day)

Size M · Severity idea · Value 2/5 · Risk 2/5

**Problem.** No Date use exists in the render or the sim. Small date-based touches make a desk toy worth leaving open, and F-02 provides real hatch dates (Scott 1997-09-24, Melissa 1997-07-04, Robert 1999-12-13).

**Evidence.** `web/main.ts:1031-1044`, `web/main.ts:1071-1124`.

**Change.** Pure `web/seasons.ts` `eventsOn(date, fish)` returning event ids plus per-fish birthday flags (Feb 29 birthdays celebrate on Feb 28 in non-leap years), with an injectable now. Hooks: a jack-o'-lantern (original 16x14 sprite on the gravel, additive orange glow at night) Oct 24-31; ten bulbs along the rim cycling 4 colours every 15 ticks Dec 20-26; coloured bubble bursts from the gravel from 23:59:50 Dec 31 until 00:05; a bottle message (D-10) on January 24 (the Macintosh's birthday). Birthday: a 5x6 hat at the head (`x + facing*w*0.28, y - h*0.35`, rotated with the drawn tilt), a confetti burst on the first view that day, and 'Happy birthday!' in Get Info; compare the UTC-formatted hatch date with the local date. Prefs toggle 'Seasonal surprises'.

**Acceptance.** Tests: eventsOn for fixed dates, the leap-day rule and the midnight boundary.

**Merged and related.**

- Tension: pass 7 declined "seasonal/holiday gravel" as scope creep. This entry is date-triggered sprites behind a toggle, not gravel packs; keep it optional and off-by-default if in doubt.

### D-12 Algae on the glass, a sponge to wipe it, and a snail that grazes

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** Water quality shows only as a uniform tint. Patchy algae that grows faster in poor water, a sponge ritual and a lazy snail companion give hands-on care.

**Evidence.** `web/main.ts:1111-1116` (murk is one full-tank fillRect), `core/sim.ts:228-240`, `web/main.ts:100-111`.

**Change.** Pure `web/algae.ts`: an 80x50 Float32 grid (4-px cells); `step(grid, quality, rng)` grows film ~1/54000 per tick per cell with patchy noise, much slower above quality 0.7; `wipe(grid, x, y, r)`; `snailStep(snail, grid, rng)` a 0.1 px/tick random walk biased toward dirtier cells, clearing radius 2. Keep the grid in an 80x50 canvas repainted via putImageData at most once per second or after a wipe, drawn each frame with one drawImage scaled 4x (smoothing off, pre-dithered 2x2 Bayer green-brown at alpha film*0.35), before day/night. Sponge: Option-drag over the glass (pointerdown with altKey enters wipe mode, suppressing tap and feed; pointermove wipes) with a sponge cursor and a synthesized squeak. Snail: an original 12x9 two-frame sprite offered as a built-in pseudo add-on in Overview. Persist the grid as base64 bytes in `finsical:algae` on save.

**Acceptance.** Tests: growth bounded in [0,1], wipe clears the radius, the snail reduces total film over time.

**Merged and related.**

- V-12 follow-up: a dithered algae vignette at the glass edges below q 0.3, not in PR #158 (checked: no algae code on the branch); build it here.
- Merged from passes 1-7: "Snail on the glass" (a tiny snail inches across the front pane every few hours, leaving a faint clean streak).

### D-13 Shake the window to stir the tank like a snow globe

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** Grabbing the machine and shaking it should slosh the tank: fish dart, food and bubbles scatter, sand swirls up and settles. It is unverified whether windowDidMove fires continuously during a performDrag.

**Evidence.** `macos/Finsical.swift:306-310` (windowDidMove only saves the frame), `node_modules/osmium-ui/macos/OsmiumWindows.swift:331-342` (performDrag), `core/sim.ts:182-197`, `core/sim.ts:241-245`.

**Change.** Prototype detection first: on the dragWindow op start a 60 Hz Timer sampling `window.frame.origin` until `NSEvent.pressedMouseButtons == 0`; compare with windowDidMove samples and keep whichever is continuous. Detect >= 3 direction reversals above 1500 pt/s within 700 ms, then evaluate `window.finsical.shake(k)` (k 0..1 from peak speed), throttled to one call per 400 ms. Browser: DeviceMotionEvent acceleration > 15 m/s2 on touch (permission on iOS), else bare K for testing. Sim `stir(k)`: startle every fish away from the centre at 3*k, displace food and bubbles by +/-10*k, waterQuality -= 0.03*k, spawn 40*k silt particles {x, y, vx, vy} from the gravel that decelerate and sink within ~6 s (a sim list, deterministic). Render silt as 1-px sand dots; a lowpassed-noise slosh sound.

**Acceptance.** Tests: stir startles every fish; silt returns to 0 within 200 ticks; determinism.

### D-14 A fish net to pick up and move fish, and a scoop animation on removal

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** Removing a fish in Overview makes it vanish in one frame, and fish cannot be moved.

**Evidence.** `core/sim.ts:167-172` (removeFish splice), `core/sim.ts:210-227`, `core/sim.ts:248-265`, `web/main.ts:520-521`, `web/overview.ts:105-120`, `web/overviewmodel.ts:44-47`.

**Change.** A new FishState 'held': tickFish returns early (no movement, no clamp); panic propagation skips held fish; `hold(id)`, `moveHeld(x, y)`, `release()` (clamps into bounds, startles with a small speed, adds 6 bubbles). saveTank never saves state, so no serialization change; add 'held' to overviewmodel STATES ('In the net') and statsmodel. main.ts: hit-test with the shared per-frame fish rects (A-05); press-and-hold 300 ms without moving > 3 px on a fish enters net mode, drawing the fish inside an original 20x14 net sprite following the pointer; release plays audio.splash() panned (D-08). Removal: a 1 s render-only scoop (net from the top down to the fish, both rise out with a splash), then sim.removeFish, sweepThumbs and saveTank.

**Acceptance.** Tests: a held fish does not move over 100 ticks; release clamps a fish dropped outside the bounds.

### D-15 Fish learn your feeding time and gather at the surface before dinner

Size S · Severity idea · Value 2/5 · Risk 2/5

**Problem.** Real fish learn feeding schedules. No feeding history is kept. Hunger saturates in ~20 minutes, so users feed many times per session.

**Evidence.** `web/main.ts:109`, `web/main.ts:794-797`, `web/statsmodel.ts:86-116`.

**Change.** On each feed record at most one entry per 2-hour local window per calendar day (localStorage `finsical:feeds`, 30 days). Pure `web/habit.ts` `habitualFeedMinute(entries)`: the circular mean of the densest +/-45 min cluster when it spans >= 3 distinct days (handles midnight wraparound), else null. From 10 min before to 15 min after, while average hunger > 0.3, set D-02's `sim.lure = {x: TANK.width/2, y: 30}` with lureSince refreshed so curiosity does not fade. Stats advice: 'Your fish expect dinner around 6:30 PM.'

**Acceptance.** Tests: circular mean across 23:50/00:10; thresholds; 10 feeds in one afternoon count as one entry.

**Merged and related.**

- Merged from passes 1-7: "Dinner bell + feeding frenzy" (overuse fouls faster) and "Feeding reminder after about 10 foodless minutes". Express reminders as fish behavior (gathering at the surface), never as notifications: starvation notifications are declined.

### D-16 Stickies notes on the case bezel

Size S · Severity idea · Value 2/5 · Risk 2/5

**Problem.** Mac OS 7.5-9 users stuck Stickies everywhere; a pale-yellow 'Feed Scott!' note on the monitor bezel is a sweet personal touch.

**Evidence.** `web/main.ts:735-764`, `web/main.ts:776-788` (drag handler already excludes textarea and [contenteditable] at :783-784), `web/machines.ts:37-40`.

**Change.** Tank > New Note (native) or bare N (browser) creates a div with a 12-px title strip (close box, drag handle) and a textarea in Geneva 10, #ffff99 with a 1-px black border; right-click on the strip cycles six Stickies colours. Store notes in viewBox units `{vx, vy, w, h, text, color}[]` in localStorage `finsical:notes`; layoutMachine maps them with the same s/ox/oy so they stay glued across resizes and machine swaps. Clamp rects to the opaque bezel (viewBox bounds minus the hole with a margin, inside the silhouette, since the native window mask clips anything outside the alpha); the lower chin is wide on every machine. Strip drags use pointer capture with stopPropagation.

**Acceptance.** Test: the viewBox-to-px mapping and the clamp.

### D-17 New fish splash in from the surface, removed fish swim off

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** New fish simply appear mid-tank and removed ones vanish, so without sounds you often cannot tell what happened.

**Evidence.** `web/main.ts:138-150` (spawn at random mid-tank y at :141-142), `web/main.ts:520-521`, `core/sim.ts:148-172`.

**Change.** Entry: spawnFish sets y = 26 (SURFACE + MARGIN), state 'startle', vy 1.5, speed 1, pushes 6 bubbles at the entry x plus U-03's surface ripple, and shows a 2 s balloon 'Welcome, Samantha' (F-02). Exit: keep sim.removeFish immediate so persistence and Overview stay truthful; before splicing, main.ts copies the fish's current frame, position and facing into render-only `ghosts: {cv, x, y, vx, t}[]` that swim at 2x cruise toward the nearer side wall (no margins), drawn after the fish and dropped off-screen or after 200 frames.

**Acceptance.** Test: a pure `stepGhost()` in `web/ghosts.ts` exits within 200 steps.

**Merged and related.**

- Overlaps open PR #129 (three ballistic droplets where food or a newly installed fish enters at `FOOD_ENTRY_Y`).

### D-18 Dock menu, hunger badge, a menu-bar fish and Open at Login

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** The Dock icon does nothing special, a hidden tank has no quick controls, and a desk toy wants to start with the Mac and optionally stay out of the Dock. The state push already carries fish hunger.

**Evidence.** `macos/Finsical.swift:69-71`, `macos/Finsical.swift:329-374` (relay parses state only for `machine`), `macos/Finsical.swift:538-543` (activation policy `.regular`), `macos/Finsical.swift:543-577`, `web/main.ts:398-401`, `web/statsmodel.ts:45-47`.

**Change.** (1) `applicationDockMenu(_:)` returning Feed Fish, Tank Stats, Import Add-ons…, Float Above Other Windows (checkable, U-16), calling `NSApp.activate()` before host.show. (2) postState adds a compact `summary: { hungriest: string | null, hungerLabel, needsFood: boolean }` from statsmodel.deriveStats (HUNGER_FEED 0.55; reuse HUNGER_STARVING rather than duplicating thresholds in Swift); on change set `NSApp.dockTile.badgeLabel = needsFood ? "!" : nil`, behind 'Show Hunger in Dock' (default off); optionally `requestUserAttention(.informationalRequest)` once when all fish are starving and the app is inactive (a nod to the Notification Manager). (3) An NSStatusItem with a 16x16 template fish (drawn at launch, isTemplate) or, better, fish 0's current frame posted every 500 ms over the thumbs path so it swims; its menu: the info line, Feed Fish, Show/Hide Tank, Ghost Mode (F-28), Preferences, Quit. (4) 'Show in Dock' preference toggling `setActivationPolicy(.regular/.accessory)` (the accessory policy drops the main menu, so the status menu must mirror the Tank menu and Preferences). (5) 'Open at Login' via `SMAppService.mainApp.register()/unregister()` behind `if #available(macOS 13, *)`, hidden on 12.

**Acceptance.** Manual tests: toggle the preferences and relaunch; all actions still work.

### D-19 iMac-shaped fish and matching iMac backgrounds for the iMac G3 cases

Size S · Severity idea · Value 3/5 · Risk 1/5

**Problem.** The 7z's 'Spare interesting things/iMacs and Tama fish/' folder has fan-made fish shaped like iMac G3s (Blueberry, Grape, Grey, Ivory, Lime, Orange, Strawberry, Yellow, black; iMacFish-Love/NeonGreen/Strawberry with eggs) and 'Terrible iMac backgrounds' (BONDAI, Blueberry, GRAPE, LIME, Strawberry, Tangeline, WHITE). StrawberryImacs.fsh (1,371,912 B) decodes into 8 sheets: a red translucent iMac with its cable as the tail. Finsical ships Bondi, Strawberry and Flower Power iMac cases.

**Evidence.** `web/machines.ts:27-45`, `web/machines.ts:96-160`, `web/prefs.ts:269-312`, `web/import.ts:65-88`.

**Change.** After F-21, collections for prefix 'addons Aquazone/Spare interesting things/iMacs and Tama fish/' (/\.fsh$/i, fish) and '…/Terrible iMac backgrounds/' (/\.bmp$/i, backgrounds). `companion?: { fish?: string; background?: string }` on Machine: imac-strawberry(-2) -> fish 'StrawberryImacs', background 'Strawberry'; imac-bondi(-2) -> background 'BONDAI' (Blueberry is the nearest fish); Flower Power none. In prefs.ts, when the selected machine has an uninstalled companion (state.addons), one caption line points to Import Add-ons > iMac fish. Easter egg: installing the matching fish plays audio.splash() and drops it in from the surface (D-17).

**Acceptance.** Test: machines.test.ts that every companion names a real listing stem from a fixture list.

### D-20 Mekasia storyline: letters from Dr. Chen arrive as your Meka collection grows

Size M · Severity idea · Value 2/5 · Risk 2/5

**Problem.** aquazone.rez hides a story: FO_H 1000-2000 hold 11 English letters and documents ('Redxine Letter', 'Study of Fish Co-Existence', 'Crystal Study', 'Confidential document-C:4656283', 'Mule'…), STR# 20015-20024 ('A letter from Dr. Chen arrived.', 'A confidential letter from Dr. Bowers arrived.', 'Something arrived from Dr. Chen.'), and AcH* crystal lore (the Omni Crystal deposited by Z.U.N. fish becomes the Radiance Crystal; the Meka Sphere comes alive as 'Mule'). The Mekasia fish (Zun.fsh, Ormola.fsh, ﾒｶﾃﾞﾝﾃﾞﾝ虫.fsh) and accessories are on archive.org.

**Evidence.** `web/import.ts:68-69` (Mekasia plants/accessories already importable).

**Change.** A pure rule table `mekasiaLetters(state) -> letterIds due` (letter 1 after any Mekasia fish has lived one tank-day; letter 2 when a Z.U.N. fish and the Omni Crystal are both in the tank; and so on in FO_H order). An arriving letter plays a short mail chime, adds a Tank Log entry with an envelope icon (F-13), and opens a read-only SimpleText-style Osmium document window in Geneva 10. Read letters persist in SavedTank.

**Acceptance.** Tests: fixtures give the expected letters in order and never repeat one.

### D-21 Let the fish out: a desktop aquarium mode

Size L · Severity idea · Value 3/5 · Risk 4/5

**Problem.** The After Dark-era wow feature: fish swim across the desktop wallpaper behind your windows while the tank window can stay hidden. Full-screen transparent compositing, multiple displays, Spaces and energy use are unmeasured.

**Evidence.** `macos/Finsical.swift:4-7`, `macos/Finsical.swift:106-112` (finsical:// scheme gives a shared origin), `macos/Finsical.swift:467-527`, `web/main.ts:1071-1124`.

**Change.** A spike first. Tank > 'Let the Fish Out' (off by default) creates a borderless NSWindow over `NSScreen.main.visibleFrame` (isOpaque false, clear background, `ignoresMouseEvents = true`, level `CGWindowLevelForKey(.desktopIconWindow) + 1`, `[.canJoinAllSpaces, .stationary]`). A second WKWebView loads a new desktop.html running its own Sim sized to screen/3, reading installed packs from the shared IndexedDB cache, drawing only fish and bubbles on a transparent canvas upscaled 3x nearest-neighbour, capped at 20 fps with a setTimeout loop. Feeding happens from the menu (clicks pass through). Measure Energy Impact in Activity Monitor before building UI.

**Acceptance.** (derived) The spike reports Energy Impact before and after in Activity Monitor; clicks pass through to the desktop; the tank window's sim is unaffected.


### D-22 Fish Diary, tank-age milestones and anniversaries

Size M · Severity idea · Value 2/5 · Risk 1/5 (from passes 1-7)

**Problem.** Nothing celebrates time spent with the tank.

**Evidence.** `web/statsmodel.ts` (uptime), `web/main.ts` saved state
(no age fields today).

**Change.** A Fish Diary (Cmd-Shift-H): age, pellets eaten and favorite
depth band per fish. Tank-age milestones: a floating message at 1 hour,
1 day and 1 week of uptime; save the uptime and show a tiny
anniversary line at 24 h and 7 d. Uptime is visible hours today
(B-53).

**Acceptance.** (derived) A pure milestone scheduler test (each fires
once); diary stats round-trip through the save.

### D-23 Easter eggs: Konami bonus fish, hidden credits screen

Size S · Severity idea · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** Optional whimsy.

**Evidence.** `web/main.ts` keydown handler.

**Change.** A Konami-style sequence adds a tiny bonus fish; a hidden
"Aquazone" about screen with the original credits in license-safe text
(A-04, T-03).

**Acceptance.** (derived) A pure sequence-matcher test; the bonus fish
is a normal roster entry.

### D-24 Fish faces: a 2 px mood mouth

Size S · Severity idea · Value 2/5 · Risk 2/5 (from passes 1-7)

**Problem.** Hunger and mood are only readable in client windows.

**Change.** Overlay a 2 px hunger/mood mouth on the sprite at the mouth
point (B-01's `x + facing*(halfW-3)`), Tamagotchi legibility.

**Evidence.** `web/main.ts` `drawFish`.

**Acceptance.** (derived) Screenshot per mood; off by default if it
clashes with the original art.

### D-25 Tank weather

Size M · Severity idea · Value 2/5 · Risk 1/5 (from passes 1-7)

**Problem.** Cosmetic, cozy variety.

**Change.** Rain rings on the surface, a slight dim and a filter
gurgle; render-only on the sim clock.

**Evidence.** `web/water.ts` (PR #158) surface line.

**Acceptance.** (derived) Deterministic ring spawns from a seed;
reduced motion disables it.

### D-26 Laser-pointer toy

Size S · Severity idea · Value 2/5 · Risk 1/5 (from passes 1-7)

**Problem.** Useless, irresistible: hold a key and fish chase a light
dot under the pointer.

**Evidence.** `web/main.ts` keydown and pointermove; D-02's lure.

**Change.** Reuse D-02's lure with a red dot sprite while the key is
held. The original idea used L, which open PR #132 assigns to Toggle
Lights: pick another key.

**Acceptance.** (derived) Sim test: with the lure held, mean fish
distance to it drops.

### D-27 Party mode

Size S · Severity idea · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** Silly delight: playing a music add-on keys the fish
tail-wag rate to the AudioContext clock.

**Evidence.** `web/main.ts` `animFrame` (one constant away).

**Change.** While F-05's jukebox plays, scale `animFrame`'s rate by a
beat estimate.

**Acceptance.** (derived) Unit test of the rate mapping; off when no
track plays.

### D-28 Bubble trails

Size S · Severity idea · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** Faint fading trails behind swimming fish.

**Change.** Render-only 1 px dots at past mouth positions fading over
about 20 frames.

**Evidence.** `web/water.ts` (PR #158).

**Acceptance.** (derived) Screenshot; reduced motion disables.

### D-29 Photobomb and perfect-water sparkle

Size S · Severity idea · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** Tapping the glass already startles fish with a sound; a
rare reward would add surprise.

**Change.** A rare fish "photobomb" (swims to the front, large) after a
tap, or a sparkle on perfect water quality.

**Evidence.** `core/sim.ts` `tap()`.

**Acceptance.** (derived) Seeded rarity test (for example at most once
per 10 minutes).

### D-30 Custom 16x16 sprite editor

Size L · Severity idea · Value 1/5 · Risk 2/5 (from passes 1-7)

**Problem.** Seasoning: users could draw their own fish.

**Change.** A 16x16 editor in palette colors, persisted to
localStorage, producing a one-sheet species.

**Evidence.** `web/render.ts` `gridCanvas`.

**Acceptance.** (derived) A drawn sprite survives reload and swims.

### D-31 CRT test card in the Monitor pane

Size S · Severity idea · Value 2/5 · Risk 1/5 (from pass 8)

**Problem.** The scanline and geometry controls are hard to judge on the
live tank.

**Evidence.** `web/prefs.ts` Monitor pane; `web/crt.ts`.

**Change.** A switchable calibration preview (color bars, grayscale
steps, a circle, a 1 px grid) that explains the controls without
touching the live tank; one click back to the aquarium preview.

**Acceptance.** (derived) Screenshot of the card at `CRT_DEFAULTS`; the
tank is unaffected while it shows.

## Security and robustness (open)

All inputs below are fixed archive.org items or files the user drops,
so these are self-inflicted denial-of-service and crash hardening
rather than reachable attacks; real corpus data is unaffected by every
proposed cap.

### S-01 (remainder) Validate azpack sprite metadata at load

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** PR #153 (open) now schedules the next frame first and draws
a throwing sheet as the placeholder. Still open: `loadAzpack` validates
only `sprites.image`, so a 0x0 frame or `dims` with holes (producible by
`emit.py`, S-02) reaches the renderer, and `SpriteSheet.frame` accepts
zero-size frames.

**Evidence.** `core/data/azpack.ts:145` (throws on missing dims),
`core/data/azpack.ts:147-149` (frame() accepts 0-size),
`core/data/azpack.ts:163-187`, `tools/az/emit.py:34-52`.

**Change.** `loadAzpack` validates each sprites meta: integer groups
and framesPerGroup in [1, 63], cellW/cellH >= 1,
`dims.length === groups*framesPerGroup`, each dim w, h in [1, cell]
with matching g/f; invalid sheets are skipped with `console.warn`
instead of failing the pack. `SpriteSheet.frame` rejects fw/fh === 0.

**Acceptance.** A manifest missing one dims entry yields no sheet for
that chunk; `frame()` on a 0x0 dim throws; `azpack.test.ts:120` stays
valid.

**Merged and related.**

- Overlaps open PR #145, which validates sheet metadata (positive
  counts, ordered group-major `dims` prefix, cell/atlas bounds) but
  deliberately keeps truncated `dims` prefixes loadable because
  `emit.py` emits them. This entry's `dims.length ===
  groups*framesPerGroup` rule contradicts that: decide the contract
  together with S-02's Python change (Design notes, azpack contract).
- Deferred from pass 8: a per-(sheet, group, frame) "cell missing"
  memo so a truncated pack stops paying exception cost per frame
  (PR #153's per-sheet fallback may make it moot).

### S-02 Sprite-stream validation: every frame is allocated before the sheet-size guard, valid blank frames are rejected, and Python keeps truncated streams

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** (1) Despite the 'reject before allocating' comment, all ng*nf frames are decoded and kept before the size check: a crafted 9 MB pack of 16x16 frames of 1500x1500 takes 4.9 s and ~500 MB before returning null, and a 1 MB 8x8x1000² pack is accepted as a 64 Mpx sheet (real packs peak at 18.6 Mpx per pack; the real max per-frame ratio is 0.70 of the guard). (2) One 3-byte run item can legally emit 32768 pixels, so a fully transparent 64x64 frame (ln = 3) fails the 64:1 heuristic: TS drops the whole sheet while Python silently truncates. None of 20,568 real frames trips it (latent). (3) loreto.fsh has three chunks declaring 8x8 frames with data ending after 6, 2 and 2 groups: TS rejects them, emit.py writes 6/2/2-group sheets, so fishPose treats a truncated 8-ring as a 6-ring (right profile from group 3), and a mid-group cut leaves holes in dims (S-01).

**Evidence.** `core/data/fsh.ts:109-129` (decodePixels per frame in the loop; the `sw*sh > 1<<26` guard at :129 runs after), `core/data/fsh.ts:116-121` (per-frame `w*h <= 64*ln + 0x400`), `tools/az/fsh.py:66-91` (iter_frames stops at the first bad record), `tools/az/emit.py:34-52` (ng/nf = max observed g/f), `core/pose.ts:10-22`.

**Change.** Two-pass decoding in both languages (shares P-02's header index). Pass 1 walks frame headers (w, h, ln) with the existing bounds checks and the codec's true bound `w*h <= ceil(ln/3)*0x8000`, computes cw, ch, `sw = cw*nf`, `sh = ch*ng` and the pack total, and rejects before any decodePixels when `sw*sh > 1<<24` (16 Mpx per sheet) or the per-pack total exceeds ~48 Mpx. Pass 2 decodes. One corrupt/truncated-frame policy in both: reject the chunk; Python records `rec['spriteError'] = 'truncated frame g/f'` and emits no 'sprites' record unless `len(frames) == declared_ng * declared_nf`. Port the caps to emit._sprite_sheet.

**Acceptance.** Tests (fsh.test.ts and test_fsh.py via fixtures.build_fsh): a 2-frame 64x64 sheet with a blank second frame decodes to framesPerGroup 2 with dims [[0,0,64,64],[0,1,64,64]]; a stream truncated after group 5 is rejected in both; a crafted 16x16x1500² pack (and a header-only 63x63 bomb) is rejected in < 20 ms with decodePixels called 0 times (spy); existing fixtures unchanged.

**Merged and related.**

- Merged from pass 8 (B04 slice): "FSH checks the atlas budget after allocating individual frames" is point (1) here.
- Contract conflict: open PR #145 keeps truncated `dims` prefixes loadable (emit.py emits them) and cushions absent cells in `drawFish`; this entry makes Python stop emitting truncated streams and TS reject them. Change both sides in one series and update the Design note.

### S-03 Hostile BMP input: RLE8 delta and run growth are unbounded and biClrUsed is uncapped

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** decodeBmp runs on remote data on the main thread. A 17 KB 8192x8192 RLE8 file of 4000 x delta(0,255) takes 82 s and ~8.4 GB of ArrayBuffers; a 4 MB single-line run file takes 12 s then throws RangeError; biClrUsed = 0xFFFFFFFF builds a 2 M-entry palette. All 82 real JPN backgrounds are 8-bit uncompressed.

**Evidence.** `core/data/bmp.ts:33` (`ncol = u32(46) || 256`), `core/data/bmp.ts:50-84` (RLE8: delta pushes dy rows without checking rows.length < h; runs grow unbounded number[] within a line), `tools/az/img.py:14-55`, `web/import.ts:351-356`.

**Change.** `ncol = Math.min(u32(d, 46) || 256, 256)`. Rewrite RLE8 to write straight into idx with an (x, y) cursor (y counts stored rows from the bottom; final row `topdown ? y : h - 1 - y`): encoded and absolute runs write only while x < w (still consuming bytes), EOL sets x = 0 and y++, delta adds dx/dy, decoding stops at y >= h; no rows/run arrays. Mirror in img.py read_bmp.

**Acceptance.** Tests (bmp.test.ts and tools/tests): the delta bomb and the single-line bomb each return in < 50 ms with a w*h output; the palette caps at 256; existing RLE fixtures decode identically.

**Merged and related.**

- Merged from pass 8 (B04 slice): "BMP RLE builds an unbounded intermediate row before clipping".

### S-04 zipRead inflates up to 128 MB even when the entry declares 1 KB, and never checks CRC-32

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** A 100 KB zip whose directory claims usize 1024 inflates all 100 MB and rejects after 424 ms; a length-correct entry with a flipped byte is accepted. Zips are cached and persisted forever, so a corrupted cached copy would keep producing garbage.

**Evidence.** `core/data/zip.ts:69-75` (ZipEntry has no crc), `core/data/zip.ts:85-119` (limit = maxBytes; length compared only at :116), `web/import.ts:107-128`, `web/import.test.ts:28`, `web/import.test.ts:40` (fixtures write crc=0).

**Change.** Store `crc: u32(v, p + 16)` in ZipEntry; `const limit = Math.min(maxBytes, e.usize)` and abort as soon as total > limit; after reading (stored or deflated) compute CRC-32 (256-entry table, ~10-20 ms for 5 MB) and throw `zip ${name}: CRC mismatch`. In import.ts, on a CRC or length error delete the zipCache entry and `packDelete(url)` so the next attempt refetches.

**Acceptance.** Tests (zip.test.ts): the bomb rejects in < 30 ms; a flipped byte raises CRC mismatch; update import.test.ts fixtures to write real CRCs (reuse azpack.test.ts:35-40's helper).

**Merged and related.**

- Merged from pass 8 (B04 slice): the ZIP byte limit covers deflate but not stored entries, and remote `arrayBuffer` downloads are unbounded; cap input size, per-entry expansion, aggregate decoded bytes and recursion depth before allocating, and test continued import after a rejection.

### S-05 snd.ts: crafted resource maps explode, BinHex uses number[] buffers with uncapped RLE, and a 0 Hz rate is accepted

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** A 39 KB fork with 2000 'snd ' type entries x 2000 refs made hasSounds() take 1.1 s at 747 MB and return 4 M records (65536x65536 would be 4.3e9). binhexDecode materializes the file as JS number arrays (~8 bytes per element) and expands 0x90 RLE up to 255x per marker. A rate below 1 Hz yields a WAV that decodeAudioData later rejects with an unclear error.

**Evidence.** `core/data/snd.ts:64-103` (binhexDecode), `core/data/snd.ts:148-189` (sndResources walks every 'snd ' type entry and ref list), `core/data/snd.ts:276-280` (rateHz unvalidated), `tools/az/rsrc.py:150-190`, `web/main.ts:969` (32 MB drop cap).

**Change.** sndResources stops after the first 'snd ' type entry, caps references at 4096 and skips duplicate data offsets. binhexDecode preallocates Uint8Array buffers (vals <= text.length, out <= 3/4 of that) with a de-RLE size pre-pass capped at 64 MB, throwing SndError past the cap. parseSnd throws `SndError('implausible sample rate')` outside [1000, 96000] Hz. Mirror in rsrc.py/snd.py.

**Acceptance.** Tests: the crafted map gives <= 1 resource list in < 20 ms; a BinHex RLE bomb throws quickly; a rate-0 header throws.

**Merged and related.**

- Merged from pass 8 (B04 slice): "BinHex RLE expands without an output cap".

### S-06 PNG decoder in azpack has no dimension cap and an uncapped inflate

Size S · Severity low · Value 1/5 · Risk 1/5

**Problem.** A small PNG bomb in a shared .azpack would hang or crash the tab. Inputs are local (bundled pack or dropped folder).

**Evidence.** `core/data/azpack.ts:54-59` (inflate to arrayBuffer, no limit), `core/data/azpack.ts:103-109` (IHDR up to 2^32), `core/data/azpack.ts:124-126` (size check after inflation).

**Change.** Right after IHDR reject w or h > 8192 or w*h > 1<<26; replace inflate() with a streaming reader like zipRead's that aborts once output exceeds h*(w+1).

**Acceptance.** Test: IHDR 60000x60000 with a 1 MB zero-deflate IDAT rejects in < 20 ms.

**Merged and related.**

- Overlaps open PR #145 (a 2^26-pixel budget checked before inflating, inflate streaming into an exact-size buffer that cancels on overflow, palettes over 256 entries rejected). With #145 merged this entry is done.

### S-07 Saved state and bus messages are trusted: bad fields freeze fish, break the restore chain or get persisted

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** A saved fish with cruise null or 0 (JSON turns NaN into null) never moves (`Math.min(null, x) = 0`); a negative cruise swims into a wall; duplicate or huge ids stop nextId increasing; a string hunger becomes NaN. A null addons entry throws at `installed.has(it.url)`, rejecting the chain before remap and reconcile. A non-string `inner` spawns and saves a fish before qualifySoundItemName throws. bus.ts forwards null payloads. Producers are all same-origin, so this needs a buggy client or hand-edited storage.

**Evidence.** `web/main.ts:45-55` (loadTank checks only Array.isArray(addons)), `web/main.ts:73-76` (roster filter validates only x/y), `web/main.ts:333-337`, `web/main.ts:607-615` (remoteInstall validates url and section, not inner; persists the raw item), `web/main.ts:891-900` (restore chain without a terminal catch), `web/import.ts:1237`, `web/bus.ts:36` (forwards any data), `core/sim.ts:148-164` (addFish spreads saved fields).

**Change.** Sanitize inside `Sim.addFish` (testable): `num(v, d, lo, hi)` gives cruise in [0.3, 3] (default 1), hunger [0, 1] (0.2), finite heading (0), facing +/-1 (else from heading), finite speed/vy (0), bandY in the tank (else y), x/y clamped; id must be a safe non-negative integer not in use, else nextId. Export `isImportable(x): x is Importable` from import.ts (object; `https://archive.org/` url string; known section; inner a non-empty string of <= 256 chars); remoteInstall rebuilds a clean `{section, inner, url}`; loadTank filters addons with it and keeps only finite numeric fish fields and string species/pack. bus.ts ignores non-plain-object data. Add a terminal `.catch` to the launch chain.

**Acceptance.** Tests: cruise null moves > 20 px in 10 s; two saved fish with id 3 get distinct ids; id 1e300 is replaced; isImportable cases in import.test.ts.

**Merged and related.**

- Merged from pass 8 ("Persisted data needs a validated schema boundary"): extract a versioned parse/restore step that validates each record independently, preserves an intentionally empty roster (B-16), clamps domain values and defines which fields intentionally reset; retain a last-good save; test partially damaged saves and quota-full or unavailable storage. The save omits pellets, RNG state and motion fields, so reloads are not deterministic continuations (a fed pellet vanished on a tested reload).
- Merged from passes 1-7 ("Save/load drops mid-swim fields"): `saveTank()` omits `state`, `phase`, `latch`, `peak`, `tx`, `ty`, `turnDir`, `turnFrom` and `panicHops`, so fish restart a decision cycle from rest and forget an in-progress turn; persist them or document the reset. PR #154 (open) adds runtime-only fields (for example `strokes`); include them in the decision.
- Overlaps open PR #135 (every numeric saved field finite and clamped, `bandY` falls back to the clamped `y`, invalid `sheetIdx`/`pack`/`id` dropped; empty `species` kept as the sim's unbound sentinel). Bus-message validation is T-18.

### S-08 The Swift bus relay can crash on NaN or Date values and accepts posts from any frame

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** bus.ts posts raw objects; `JSONSerialization.data(withJSONObject:)` raises an Objective-C NSInvalidArgumentException that `try?` cannot catch for NaN, Infinity or NSDate. The first NaN any page posts (a future stat dividing by zero) would crash the app on every state push, and since state persists possibly on every launch. Latent: current producers are finite. The relay does not check `frameInfo.isMainFrame` or the origin, and the splice re-parses large payloads (thumbs data URLs) as JS in every visible client.

**Evidence.** `macos/Finsical.swift:329-405` (JSONSerialization at :376-378, string splice with U+2028 escaping at :390-396), `web/bus.ts:33`, `web/crt.ts:197-205`.

**Change.** Minimal: before :376, `guard JSONSerialization.isValidJSONObject(message.body) else { NSLog("Finsical: dropped non-JSON bus message"); return }`. Better: replace serialize-and-splice with `dest.callAsyncJavaScript("if (!window.__bus) return 'dropped'; window.__bus(m);", arguments: ["m": message.body], in: nil, in: .page) { r in … }` (macOS 11+; removes the U+2028 workaround). Add `guard message.frameInfo.isMainFrame else { return }` at the top of userContentController. Optional: deliver 'thumbs' only to the window that sent wantThumbs.

**Acceptance.** Test from the tank's Web Inspector (T-24): `webkit.messageHandlers.finsical.postMessage({op: 'x', v: NaN})` must not crash.

### S-09 Dev dependencies carry advisories, including one against the esbuild dev server

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** `npm audit` reports 5 advisories (1 critical, 1 high, 3 moderate): esbuild <= 0.24.2 GHSA-67mh-4wv8-2f99 (any website a developer visits can read responses from `npm run dev`'s server, which may serve web/pack/ with the user's extracted AquaZone data), vite <= 6.4.2 (high), vitest critical GHSA-5xrq-8626-4rwp (UI server) and GHSA-82fw-gwwq-j7x9, plus @vitest/mocker and vite-node. All dev-only; nothing ships.

**Evidence.** `package.json:14-18` (esbuild 0.24.2, vitest 2.1.9, typescript 5.6.3), `package-lock.json`, `.github/dependabot.yml`.

**Change.** Bump esbuild to >= 0.25 (the actual fix for GHSA-67mh; binding to 127.0.0.1 only removes LAN exposure, since the attacker page runs in the developer's own browser) and re-run build and dev. Bump vitest (and vite transitively) to the latest patched release; run npm test and typecheck and check config/API changes across majors; typescript to 5.9+. Add a dependabot `groups:` entry so dev dependencies arrive as one weekly PR, and confirm Dependabot security updates are on.

**Acceptance.** (derived) `npm audit` reports no advisories for esbuild, vite and vitest; `npm test`, `npm run typecheck` and `npm run build` pass; Dependabot groups dev dependencies.


## Tooling, tests, CI and docs (open)

Done this pass and removed from this list: T-01, T-02, T-03 (MACE
notices and README credits) and T-04, with remainders below.

### T-02 (remainder) Optional notarized release

Size M · Severity low · Value 3/5 · Risk 2/5

**Problem.** The app is ad-hoc signed, has no hardened runtime and is
not notarized; PR #156 documents the Gatekeeper steps instead.

**Evidence.** `macos/Makefile:52` (`codesign --sign -`),
`.github/workflows/release.yml:40-55`.

**Change.** An optional release.yml step gated on secrets
(`MACOS_CERT_P12`, `MACOS_CERT_PASSWORD`, `NOTARY_KEY_ID`,
`NOTARY_ISSUER`, `NOTARY_KEY_P8`): temporary keychain,
`codesign --force --options runtime --timestamp --sign "Developer ID
Application: …"`, `xcrun notarytool submit <zip> --wait`,
`xcrun stapler staple`, re-zip; skip cleanly without secrets. Needs a
paid Developer ID: the owner's call.

**Acceptance.** (derived) Without secrets the workflow is unchanged;
with them `spctl -a -vv` accepts the app and the zip is stapled.

### T-03 (remainder) Ship the notices and credit sources in the app

Size S · Severity medium · Value 3/5 · Risk 1/5

**Problem.** PR #150 adds `THIRD_PARTY_NOTICES.md` (FFmpeg, LGPL relink
note) and SPDX headers; PR #156 adds README credits and trademark
notes. Still open: the notices are not copied into the app bundle or
release zip and may not yet name Osmium UI and the archive.org
content; the in-app detail pane links no source item; the About window
lacks credits.

**Evidence.** `macos/Makefile:27-37`, `web/import.ts:593-594`,
`web/import.ts:785-786` (dmeta), `web/machines.ts:59`,
`macos/Finsical.swift:543-577`.

**Change.** (1) Add Osmium UI (Unlicense) and archive.org-hosted
content to `THIRD_PARTY_NOTICES.md`; copy it into Contents/Resources
from the Makefile and include it in the release zip. (3) `showDetail`
replaces the dmeta text with the item title plus a link-styled "View
on archive.org" button (`window.open('https://archive.org/details/' +
item)`; add `item` to Importable or derive it from the URL). Never show
uploader e-mail addresses. (4) The same credits in A-04's About window.
Final licensing judgment is the maintainer's.

**Acceptance.** (derived) `Finsical.app/Contents/Resources/
THIRD_PARTY_NOTICES.md` exists after `make`; the release zip contains
it; the detail pane's link opens the right item.

**Merged and related.**

- U-08 (source label per collection), V-18 (the dmeta glyph).

### T-05 fetch.py downloads identical ISOs twice and a zip it cannot use, never checks md5, and has no retries

Size M · Severity medium · Value 2/5 · Risk 2/5

**Problem.** AQUAZONE.iso and AQUAZONE_BACKUP.ISO are both 541,442,048 B with md5 7bb85ba32b8d4cc4b072496f9ad7c84c, so the default run fetches 1.08 GB and emits AQUAZONE.azpack plus a duplicate AQUAZONE-2.azpack. The 284 MB 'Aquazone-Deluxe-II-…-WinMac-Hybrid.zip' contains only AQUAZONE.iso; _harvest decompresses ~512 MiB into memory and then prints 'skipped, decompressed data over cap'. archive.org returned 500 and 503 during the review; _get has no retry.

**Evidence.** `tools/fetch.py:43-60`, `tools/fetch.py:63-78` (_cached_get compares size only), `tools/fetch.py:134-176` (_harvest; _read_capped), `tools/fetch.py:204-253`, `tools/fetch.py:271` (default include `(?i)\.(iso|zip)$`).

**Change.** (1) fetch() skips item files whose metadata md5 was already processed this run and logs 'same content as <name>'. (2) _emit_source keeps a per-run set of sha256(data) and skips byte-identical sources (dedupes packs regardless of which archive carried them). (3) In _harvest, check `zi.file_size` before reading; when an entry ends in .iso, stream it with zf.open() into downloads/ (capped by _MAX_ISO_BYTES) and call `_harvest_disc(Iso(tmp))` (step 2 prevents duplicate bundles). (4) _cached_get verifies md5 when metadata has it; retry 3 times with backoff on 5xx and URLError; optionally resume a .part file with Range.

**Acceptance.** Tests (test_fetch.py, monkeypatched _get/_list_item): identical md5 fetched once; identical pack bytes in two zips give one bundle; md5 mismatch re-downloads; 5xx then success is retried. (derived) Tests as listed in test_fetch.py (identical md5 fetched once; identical pack bytes in two zips give one bundle; md5 mismatch re-downloads; 5xx then success is retried); a default run downloads 541 MB, not 1.08 GB.

### T-06 No browser smoke test: the tank page and four client windows run untested in CI

Size M · Severity low · Value 4/5 · Risk 1/5

**Problem.** CI runs tsc, vitest in Node, Python unittest and the macOS build. Rendering, the rAF loop, the CRT shader, keyboard shortcuts and BroadcastChannel traffic are never exercised; main.ts, prefs.ts, overview.ts, addons.ts and stats.ts have 0% coverage. A prototype smoke run takes ~5 s.

**Evidence.** `.github/workflows/ci.yml:17-38`, `web/main.ts`, `web/prefs.ts`, `web/overview.ts`, `web/addons.ts`, `web/stats.ts`.

**Change.** devDependency @playwright/test, `playwright.config.ts` (webServer: build to dist per T-15, then serve), `e2e/smoke.spec.ts`: (1) the tank paints more than 1000 non-dark pixels and two frames 500 ms apart differ; (2) F makes the next state push report food >= 1; (3) C sets body.crt with no 'crt shader'/'crt link' warnings; (4) posting `{op: 'machine', id: 'imac-bondi'}` from prefs.html changes #shell's viewBox; (5) client pages load without pageerror; (6) no console errors; (7) `route('https://archive.org/**')` to fixture listings and zip bytes so Import Add-ons works offline and deterministically. Run chromium and webkit projects (Playwright's WebKit is the closest proxy for WKWebView and would catch B-29). CI job on ubuntu-24.04 with `npx playwright install --with-deps chromium webkit`, traces uploaded on failure. Home for V-08's GL probe and several Playwright checks above.

**Acceptance.** (derived) The seven smoke checks pass in chromium and webkit on ubuntu-24.04 in CI; traces upload on failure.

**Merged and related.**

- Merged from passes 1-8: no e2e test covers the bus install acknowledgment (remote panel to tank); and the "portable visual-check suite": headless runs against synthetic local art with a controllable clock and mocked archive responses covering startup, empty save, malformed pack, import acknowledgment, focus, layout at minimum sizes and reload. Real archive checks stay an optional smoke job (T-09), not required CI.

### T-07 Duplicated Python and TS decoders have no shared parity corpus and already disagree

Size M · Severity low · Value 2/5 · Risk 1/5

**Problem.** core/data/{fsh,bmp,snd}.ts port tools/az/*.py and each language has its own fixture builders; no test feeds the same bytes to both. Drift exists: a truncated 16x16 BMP raises in Python but decodes in TS; a 100000x100000 BMP is rejected in TS but hits MemoryError in Python; a 258 KB sprite payload makes emit request a 66.5 GB bytearray. B-02 shows parity alone is not enough; goldens need outside references.

**Evidence.** `core/data/bmp.ts:29` (8192 cap), `core/data/fsh.ts:129` (64 Mpx sheet cap), `tools/az/img.py:5-72` (no caps; IndexError on truncated rows), `tools/az/emit.py:30-54` (no sheet cap), `core/data/*.test.ts`, `tools/tests/fixtures.py`.

**Change.** (1) Mirror TS caps in Python: read_bmp raises a ValueError subclass (T-20) on w <= 0, h == 0, or |w|, |h| > 8192; _sprite_sheet rejects sw*sh > 1<<26 (S-02). (2) `python3 -m tools.tests.gen_parity` writes a small committed corpus into `core/data/fixtures/parity/` with expected.json (dims and sha256 of indices/PCM, or 'reject'): blank frame, truncated frame, RLE8 BMP, truncated BMP, oversized BMP, snd fmt1 raw/MACE, extSH 8/16, AppleDouble/MacBinary/BinHex rsrc. (3) `core/data/parity.test.ts` and `tools/tests/test_parity.py` assert against it; the Python test also regenerates and diffs to catch staleness. (4) AGENTS.md: 'change core/data/*.ts and tools/az/*.py together; run parity' (T-12). Moving TS builders into core/testing/fixtures.ts is optional (the two buildBmp8/buildZip helpers differ).

**Acceptance.** (derived) `core/data/parity.test.ts` and `tools/tests/test_parity.py` pass on the committed corpus; regenerating the corpus produces no diff.

**Merged and related.**

- B-02 follow-up (not in PR #150): an optional `tools/tests/gen_mace_vectors.sh` that wraps bytes in an AIFF-C 'MAC3' file and decodes with real ffmpeg, so goldens come from an outside decoder (the #150 goldens were checked against ffmpeg 7.0.2 by hand).

### T-08 main.ts (1142 lines, 0% covered) mixes state logic with DOM; extract pure modules

Size L · Severity low · Value 3/5 · Risk 3/5

**Problem.** The riskiest logic (save migration, sheet binding, removal teardown, letterbox mapping, the fixed-step clock) runs at module load with getElementById, localStorage and rAF, so it is untestable; web/ statement coverage is 20.9%.

**Evidence.** `web/main.ts:45-98` (loadTank/saveTank), `web/main.ts:100-111` (pointer mapping), `web/main.ts:120-133`, `web/main.ts:222-320` (sheet maps, 'exact inverses' comments at :246-252, :275-279, :302-306), `web/main.ts:553-602`, `web/main.ts:735-764`, `web/main.ts:1127-1142`.

**Change.** First pass limited to pure functions with clear test value, call sites staying in main.ts: `web/tanksave.ts` (`parseSavedTank(raw)`, `serializeTank(...)`, `rosterFromSave(saved)`, B-16's initialRoster), `web/geometry.ts` (`clientToTank(rect, x, y, tank)`, `isFeedZone(y, tankH)`; shared with U-03's mapToTank), `core/clock.ts` (`stepClock(acc, dtMs, stepMs, maxMs)`, P-03's planFrame), and `web/tankmodel.ts` (B-04, B-14, B-15 resolvers).

**Acceptance.** Test: invalid JSON, v not in {1,2}, non-finite coordinates dropped, sheetIdx/pack serialized only when set, letterbox clicks return null, the 200 ms clamp. Defer a SheetRegistry class until a bug justifies it.

**Merged and related.**

- Merged from passes 1-7: no DOM or unit tests cover entry-bundle handlers; keep extracting pure helpers whenever `main.ts` is touched (`web/drop.ts` from PR #94 and PR #99's replace path are examples).
- This pass added more pure modules in open PRs: `core/loop.ts` (#153), `core/tuning.ts` (#154), `core/light.ts` (#155), `web/artscale.ts` (#149/#157), `core/data/swimsheet.ts` (#149), `web/water.ts` (#158), `web/alert.ts`, `web/starter.ts`, `web/scold.ts` (#160).

### T-09 import.ts: split the archive.org client from the panel, fixture-test the HTML scraper, add a live contract check

Size M · Severity low · Value 3/5 · Risk 2/5

**Problem.** An archive.org markup change would silently empty the add-on browser, and the scraper is never tested. Every green `npm test` prints 24 'archive.org listing failed' stack traces. Module-level caches leak between tests. A live run lists 840 items (fish 165, gravel 76, plants 93, accessories 395, backgrounds 83, tanks 27, sounds 1) in 1.7 s; hrefs are protocol-relative ('//archive.org/download/…').

**Evidence.** `web/import.ts:26-388` (DOM-free client), `web/import.ts:240-282` (href scraper, uncovered), `web/import.ts:389-1248` (panel), `web/import.test.ts:83-98` (stub answers every listing with 404).

**Change.** (1) Move lines 26-388 to `web/archive.ts`, ideally an ArchiveClient class owning zipCache/pageCache so each test gets a fresh one; mountImportPanel to `web/importpanel.ts`. (2) Commit trimmed real listing pages captured with curl (`web/fixtures/archive/gravel.zip.html` and a JPN SET page); the stub serves them by URL; assert exact inner names and URLs. (3) `vi.spyOn(console, 'warn')` for expected failures. (4) `.github/workflows/archive-contract.yml` (weekly schedule plus workflow_dispatch) runs a LIVE_ARCHIVE=1-gated vitest asserting every COLLECTIONS entry lists >= 1 item and one known add-on imports; on failure `gh issue create`.

**Acceptance.** (derived) The fixture-based scraper test asserts exact inner names and URLs; `npm test` prints no archive.org stack traces; the weekly workflow opens an issue on failure.

**Merged and related.**

- Merged from passes 1-7: the `import.test.ts` stub answering non-`.zip` fetches with 404 is expected log noise (a comment at the stub helps), and live archive.org is correctly not in CI; a scheduled smoke job catches listing HTML changes early.

### T-10 CHANGELOG has no version sections and release.sh updates neither CHANGELOG nor README

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** '## Unreleased' mixes work that shipped in 0.3.0 (#81 Tank Stats, #82 Platinum redesign, ancestors of release commit 792e658) with later work (#83-#86). A failed build.sh leaves a dirty tree that blocks the retry.

**Evidence.** `CHANGELOG.md:3` (single '## Unreleased'), `scripts/release.sh:81`, `scripts/release.sh:87` (push without --atomic), `.github/workflows/release.yml:60` (generate_release_notes).

**Change.** Split now into '## 0.3.0 (date)' (#81, #82) and '## Unreleased' (#83-#86). release.sh (with T-01's marker step): an awk rewrite renaming '## Unreleased' to `## $version ($(date +%Y-%m-%d))` and inserting a fresh empty Unreleased above it; `git add README.md CHANGELOG.md`; `git push --atomic origin main "$tag"`; a `trap` restoring bumped files if build.sh fails. release.yml extracts that version's section with awk into `body_path` instead of generate_release_notes.

**Acceptance.** (derived) A dry run of `release.sh` on a scratch clone renames Unreleased to the version section, inserts a fresh Unreleased, commits README.md and CHANGELOG.md and restores files if build.sh fails.

**Merged and related.**

- Merged from passes 1-8: keep appending user-facing notes to CHANGELOG for each shipped idea. PR #156 (open) changes `release.sh` for the README marker; open PR #116 adds EXIT/signal traps; combine all three.

### T-11 PLAN.md is stale and claims resource types are 'decoded so far' when no code reads them

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** PLAN.md lists 'tools/sit/ StuffIt archives (via bundled unar)' (does not exist), says the macOS shell 'ships later' (it shipped: Finsical.swift 614 lines plus Osmium), names an aquazone.me library no code uses, says 'vitest or node:test', omits the in-app archive.org import, Osmium UI, CRT, machine cases and client windows, lists pict.py in the pipeline (T-16), and says FsTH, FsTI, FsT2/FsT3, FBDP/FADP, BMV#/AMV#, EggI/EGPC/EGDP, FdHd, Grvl, Watr, LigH and snd events are 'decoded so far' with lifecycle 'hooks' in place. A grep over core, web, tools and macos finds none of these tags outside two comments.

**Evidence.** `PLAN.md:22-28`, `PLAN.md:40`, `PLAN.md:57`, `PLAN.md:59-61`.

**Change.** Rename to `docs/ARCHITECTURE.md` describing the current layout and data flow (archive.org -> zip -> fsh/bmp -> SpriteSheet -> render; the bus; the Osmium boundary), keeping the original plan as a short 'Origins' note. Add a 'Resource types' table (type, meaning, layout, status verified/tentative/unknown) covering F-01's map layout, the FishMaker 18-sequence sprite table (ring, pitch, turn, dying; ELRA adult, ELRB baby), FsTI offsets (F-12, F-15, F-17), AccI frames (F-03), food type codes (STR# 7200), event strings and art (F-13), and the aquazone.rez ISO URL; mark lifecycle hooks as not implemented. Link it from AGENTS.md.

**Acceptance.** (derived) `docs/ARCHITECTURE.md` exists, is linked from AGENTS.md, and a grep for "decoded so far" finds nothing.

**Merged and related.**

- Merged from passes 1-8: PLAN.md overclaims "mood" (growth now exists in open PR #110; mood does not): implement mood or reword; keep the out-of-scope breeding and water notes accurate until those land.

### T-12 AGENTS.md has no project-specific quick reference

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** AGENTS.md is generic process guidance; agents must rediscover test commands, the dev loop and invariants (this review's orchestrator had to restate them).

**Evidence.** `AGENTS.md`, `CLAUDE.md`.

**Change.** Add '## Project quick reference': a layout table (core/, web/, macos/, tools/, node_modules/osmium-ui); commands (npm ci; npm run typecheck; npm test; `python3 -m unittest discover -s tools/tests -p 'test_*.py' -t .`; npm run dev; scripts/build.sh); invariants (never commit AquaZone data: web/pack/ and packs/ are gitignored; change core/data/*.ts and tools/az/*.py together and run T-07's parity test; respect the macOS 12 / WebKit floor (B-29); UI fixes go upstream to L-K-M/osmium-ui; the 320x200 tank); how to verify UI (open index.html and a client page in the same browser profile; T-06's smoke test; the Web Inspector default from T-24).

**Acceptance.** (derived) AGENTS.md has a "Project quick reference" section whose commands all run as written.

### T-13 No linters; enabling cheap checks immediately finds dead code and a missing test

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** CI runs only tsc and `bash -n`. `tsc --noUnusedLocals --noUnusedParameters` gives exactly one error: `sndFmt1Mace` (snd.test.ts:63) is never called, so the TS parseSnd MACE branch is untested. ruff (E,F,W,B) on tools/ finds ~30 issues including unused struct (emit.py), unused rbase (rsrc.py:197) and W605 (T-21). shellcheck flags SC2155 (`readonly X="$(cd … && pwd)"` hides a failed cd).

**Evidence.** `tsconfig.json`, `core/data/snd.test.ts:63`, `tools/az/emit.py:11`, `tools/az/rsrc.py:197`, `scripts/build.sh:6-7`, `scripts/release.sh:6-7`, `.github/workflows/ci.yml:23`.

**Change.** Add noUnusedLocals and noUnusedParameters to tsconfig.json and resolve the hit via B-02's parseSnd 0xFE test. `pyproject.toml` `[tool.ruff]` (select E,F,W,B; ignore E702/E501 initially) and a `pipx run ruff check tools` step. `shellcheck scripts/*.sh` in core-linux; split the SC2155 declarations (`SCRIPT_DIR="$(cd … && pwd)"; readonly SCRIPT_DIR`). Skip a tsconfig 'types' split: @types/node is not installed and web code already cannot use Node globals.

**Acceptance.** (derived) CI runs tsc with `noUnusedLocals`/`noUnusedParameters`, ruff and shellcheck, all clean.

**Merged and related.**

- Related: T-30 (the dead `openImport` surface) is the kind of dead code these checks find.

### T-14 CI toolchains are unpinned, the web build is not checked on Linux, and PRs produce no artifacts

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** Both jobs use whatever Node and Python the runner image ships (they differ between ubuntu-24.04 and macos-15 and drift); no npm cache; `npm run build` runs only indirectly on macOS; reviewers cannot download a PR build. zip.ts needs Node >= 20.12 for deflate-raw.

**Evidence.** `.github/workflows/ci.yml:17-38`, `package.json` (no engines), no `.nvmrc`.

**Change.** `.nvmrc` (22) and `"engines": {"node": ">=22"}`; actions/setup-node (pinned SHA) with node-version-file and cache npm in both jobs; setup-python per T-04; `npm run build` in core-linux; upload dist/ from core-linux and `ditto -c -k --keepParent macos/Finsical.app Finsical-pr.zip` from native-macos with actions/upload-artifact (retention-days 7).

**Acceptance.** (derived) CI logs show the pinned Node and both Python versions; PRs carry dist and app artifacts with 7-day retention.

**Merged and related.**

- T-04's remainder: PR #156 fixed the import on Python 3.9 but did not add the CI Python matrix (['3.9', '3.13'] with a pinned actions/setup-python); do it here.

### T-15 `npm run build` does not produce a complete site; every launch 404s on pack/manifest.json

Size S · Severity low · Value 3/5 · Risk 2/5

**Problem.** dist/ lacks web/assets, so it shows no machine case (the review needed its own build-site.sh). An Osmium upgrade needs a dev restart. main.ts always fetches pack/manifest.json, logging a 404 and 'azpack load failed; using placeholder fish' on every normal launch (web/pack/ is gitignored).

**Evidence.** `package.json` (scripts.build: five esbuild calls plus an inline `node -e` copying only HTML and CSS; scripts.dev copies osmium.css into web/ once), `macos/Makefile:27-37` (re-copies HTML and assets from web/), `web/main.ts:870-887`, `.gitignore:11-13`.

**Change.** `scripts/build-web.mjs` using esbuild's JS API: entryPoints {bundle: 'web/main.ts', overview, addons, prefs, stats}, bundle, format 'iife', target 'safari15' (B-29), outdir dist; copy the HTML, app.css, osmium.css, assets and optional web/pack. `--serve` uses `context.serve` on 127.0.0.1:8080 with servedir dist plus watch, so dev stops writing into web/. Define `__BUNDLED_PACK__` (existsSync('web/pack/manifest.json')) and `__VERSION__` (package.json); main.ts skips the pack fetch when __BUNDLED_PACK__ is false; A-04 shows __VERSION__. The Makefile copies only from ../dist; package.json scripts become `build: node scripts/build-web.mjs`, `dev: node scripts/build-web.mjs --serve`.

**Acceptance.** (derived) `npm run build` produces a `dist/` that shows a machine case and fish without a 404; the Makefile copies only from `../dist`.

**Merged and related.**

- Overlaps open PR #144 (copies `web/assets/` into `dist/`, `scripts/web-build.test.mjs` pins each machine image). Its `cpSync` line was later removed from `package.json` by a manual user edit: confirm `dist/assets` ships.
- PR #160 (open) already logs the pack-manifest 404 as info (U-02 point 5); `__BUNDLED_PACK__` still removes the fetch.

### T-16 Python pipeline coverage gaps: the ISO reader is 16% covered, fetch() untested, pict.py dead code

Size M · Severity low · Value 2/5 · Risk 1/5

**Problem.** coverage.py: iso9660.py 16%, fetch.py 58%, pict.py 63%, total 74%. The real Iso class is never tested; fetch() orchestration (listing, declared-size skip, cache key, ISO vs zip branch, failure count and exit code) has no test; pict.py is imported only by its own test yet listed in the pipeline.

**Evidence.** `tools/az/iso9660.py`, `tools/fetch.py:204-253`, `tools/tests/test_fetch.py:142-155` (FakeIso), `tools/az/pict.py`, `PLAN.md:40`.

**Change.** `fixtures.build_iso(files: dict[str, bytes])` writing a PVD at sector 16, a root directory, one subdirectory and a directory record forced across a sector boundary; test Iso.walk, read_file, the '.'/'..' skip and the extent-loop guard. Test fetch() end to end with monkeypatched `fetch._get` and `fetch._list_item`. Either wire pict.py into emit (PICT backdrops in .rsrc/.pct) or delete it with test_pict.py and update PLAN.md (T-11). D-09's optional PICT export would give it a use.

**Acceptance.** (derived) coverage.py shows `iso9660.py` above 80% and `fetch()` orchestration covered; `pict.py` is either used by emit or deleted with its test.

### T-17 audio.ts race handling and store.ts LRU eviction are untested

Size M · Severity low · Value 2/5 · Risk 2/5

**Problem.** TankAudio's ambient-loop races (ambientGen, ambientWanted, the resume retry, the addWavs restart) and trimPacks' 150 MB LRU have 0% and ~35% coverage; only capSnds is tested. B-17, B-18, B-19, B-30 and B-40 all change this code.

**Evidence.** `web/audio.ts:14`, `web/audio.ts:17`, `web/audio.ts:60-69`, `web/audio.ts:83-94`, `web/audio.ts:96-125`, `web/audio.ts:138-143`, `web/store.ts:90-135`, `web/store.test.ts`.

**Change.** Extract pure `pickSound(importedMap, bundledMap, subs)` (find's rules) and `tapZone(x, y, w, h)` into `web/audiopick.ts` with table tests. `web/testing/fakeaudio.ts`: a FakeAudioContext with controllable state, deferred resume(), decodeAudioData and a createBufferSource spy (shared by the audio tests proposed in B-17, B-19, B-40, F-05); test startAmbient while suspended then resume gives exactly one loop, load() during a pending resume gives none, a new 'aqua' restarts once. devDependency fake-indexeddb, an injectable pack budget, and tests for packPut/trimPacks eviction order and packDelete (with B-30's evictionPlan).

**Acceptance.** (derived) Table tests for `pickSound` and `tapZone`; ambient-race tests as listed; trimPacks eviction order tests with fake-indexeddb.

**Merged and related.**

- Merged from passes 1-7: verify `startAmbient()` never overlaps loops during rapid load or restart.
- PRs #153 and #159 (open) add `web/audio.test.ts` with a fake AudioContext; reuse it as `web/testing/fakeaudio.ts`.

### T-18 The page-to-page bus protocol is untyped and has a dead message

Size M · Severity low · Value 2/5 · Risk 2/5

**Problem.** Each page matches op strings and re-validates by hand, so nothing checks senders and receivers agree. 'uninstalled' is posted but handled nowhere (overview.ts mentions it in a comment; the Swift relay checks only dragWindow and state); B-37 gives it a handler.

**Evidence.** `web/bus.ts:4` (`type BusMsg = Record<string, unknown>`), `web/main.ts:516-551`, `web/main.ts:519` (casts m.item), `web/main.ts:601` (posts 'uninstalled'), `web/main.ts:607-615`, `macos/Finsical.swift:335`, `macos/Finsical.swift:343`.

**Change.** `web/protocol.ts` with discriminated unions TankToClient ('state' | 'thumbs' | 'installed' | 'installFailed' | 'uninstalled') and ClientToTank ('hello' | 'install' | 'removeFish' | 'removeAddon' | 'wantThumbs' | 'crtEnabled' | 'crtConfig' | 'machine' | 'soundsLoaded' | 'dragWindow'), plus `parseClientMsg(unknown): ClientToTank | null` validating every field (S-07's isImportable for items). Make openBus generic and use an exhaustive switch with a `never` check in onBusMessage. Unit-test validators with malformed payloads.

**Acceptance.** (derived) Validator unit tests reject malformed payloads for every op; the exhaustive switch fails typecheck when an op is missing.

**Merged and related.**

- Merged from pass 8 (B14 envelope half): validate the envelope and each op's payload; clients share one `isState()` validator. `BusMsg` is `Record<string, unknown>` by design today, with op validation in each handler; this entry replaces that with discriminated unions.
- New ops in this pass's open PRs to include: `soundConfig` (#159), the lighting op (#155), `toggleMute`, `changeWater` (#114), the scenery "Use" op (#118).

### T-19 fetch.py deletes an earlier run's numbered bundles even when the current source emits nothing

Size S · Severity low · Value 1/5 · Risk 1/5

**Problem.** Run 1 emits out/Foo.azpack and out/Foo-2.azpack; a later `_emit_source('Foo.bin', b'not importable', 'out')` returns None but leaves only Foo.azpack (reproduced).

**Evidence.** `tools/fetch.py:86-99` (stale-sibling cleanup at :92-97 runs before the is_pack/has_sounds checks).

**Change.** Clean stale siblings only after a successful emit of the base name, or collect emitted base names and clean orphans once at the end of fetch(). Add the repro as a test next to test_rerun_drops_orphaned_numbered_bundles.

**Acceptance.** (derived) The repro test passes: a later non-importable source leaves both earlier bundles intact.

**Merged and related.**

- Merged from pass 8 ("`tools/fetch.py` deletes output before conversion succeeds"): an existing output bundle is removed up front and numbered siblings before the new input is proven usable, so a failed conversion destroys the previous usable result. Stage each conversion in a fresh sibling directory, validate its manifest, then replace only that conversion's owned destination; reconcile stale outputs only after a successful complete run. Test with temp dirs and an injected failure: existing bytes must survive. The standalone converter's same-basename overwrite is T-28.

### T-20 Tool input validation uses assert, and the ISO reader never closes its file

Size S · Severity low · Value 1/5 · Risk 1/5

**Problem.** read_bmp and Iso.__init__ validate untrusted content with assert (reserved for internal invariants by AGENTS.md): under `python -O` garbage decodes (read_bmp(b'XX' + bytes(60)) returns a 0x0 image; a zero-filled file passes Iso() then fails with TypeError); without -O a bare AssertionError has no message. Iso opens self.f with no close; ResourceWarnings appear in the suite.

**Evidence.** `tools/az/img.py:7`, `tools/az/img.py:11`, `tools/az/img.py:15`, `tools/az/iso9660.py:6-11`, `tools/fetch.py:242`.

**Change.** Raise ImgError and IsoError (ValueError subclasses) with messages ('not a BMP', 'unsupported DIB header size N', 'not ISO9660'); give Iso close(), __enter__ and __exit__ and use `with Iso(path) as iso:` in fetch.py. Tests assert the specific errors, including one run under `python3 -O -m unittest tools.tests.test_img`.

**Acceptance.** (derived) Tests assert `ImgError`/`IsoError` messages, including a run under `python3 -O`; the suite shows no ResourceWarning.

**Merged and related.**

- Merged from pass 8 (B04 slice): Python ISO parsing trusts lengths too far; validate extents and lengths against the file size with the same `IsoError`.

### T-21 fetch.py's docstring has an invalid escape sequence (SyntaxWarning on every run on 3.12+)

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** `uvx --python 3.13 python tools/fetch.py --help` prints 'SyntaxWarning: invalid escape sequence' every run (compiled fresh as __main__); a future Python makes it an error.

**Evidence.** `tools/fetch.py:2-13` (`--include '\.zip$'` in a non-raw docstring, also argparse's description at :262).

**Change.** Make the docstring raw (`r"""…`) and run the Python tests in CI with `-W error::SyntaxWarning`.

**Acceptance.** (derived) `python3 -W error::SyntaxWarning tools/fetch.py --help` succeeds on 3.12+.

### T-22 tools/fetch.py skips food packs: it lists '.fod' instead of '.fd'

Size S · Severity low · Value 1/5 · Risk 1/5

**Problem.** No AquaZone file uses '.fod'; food packs are .fd/.FD (allfoodsandmeds.zip, JPN 餌セット), so every one is silently skipped. No impact today (nothing consumes food bundles).

**Evidence.** `tools/fetch.py:36-37` (IMPORTABLE), `tools/fetch.py:140`.

**Change.** Replace '.fod' with '.fd' and add '.dna' (F-23's Power Updater packs).

**Acceptance.** Test in test_fetch.py: a zip containing a minimal pack named 'flake.fd' yields one bundle. Once F-01 lands, emitted manifests carry chunk types (food bundles identifiable).

### T-23 tools/fetch.py reads Shift-JIS zip entry names as CP437, unlike the TypeScript reader

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** JPN archives store Shift-JIS names without the UTF-8 flag. zip.ts tries UTF-8 then shift_jis; Python's zipfile falls back to CP437, so `fetch.py aquazone-jpn-set` emits 'âOâbâsü[1.azpack' instead of 'グッピー1.azpack'. Shift-JIS trail bytes can be 0x5C (ソ = 83 5C), so backslash normalization must run after re-decoding.

**Evidence.** `tools/fetch.py:85-91`, `tools/fetch.py:146-171` (`norm = zi.filename.replace('\\', '/')` at :150), `core/data/zip.ts:38-68`.

**Change.** `_entry_name(zi)`: return zi.filename if `zi.flag_bits & 0x800`; else `raw = zi.orig_filename.encode('cp437')`, try `raw.decode('utf-8')`, then `raw.decode('shift_jis')`, fall back to zi.filename (works on 3.9, unlike metadata_encoding). Compute `norm = _entry_name(zi).replace('\\', '/')` only after decoding.

**Acceptance.** Test `test_sjis_entry_names`: raw SJIS names 'グッピー1.fsh' and 'ソ.fsh' with flag 0x800 clear give bases 'グッピー1' and 'ソ'; add to T-07's corpus notes.

### T-24 No Web Inspector in native builds; missing bundled files fail as network errors instead of 404s

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** Nothing sets `isInspectable`, and apps built with a current SDK are not inspectable by default, so native-only bugs (relay, masks, WKWebView quirks) cannot be debugged. A missing file makes the handler fail the task instead of answering 404, which only changes console text (packFetch treats both the same).

**Evidence.** `macos/Finsical.swift:8-12` (MIME map), `macos/Finsical.swift:28-52` (WebHandler: didFailWithError at :50-52), `macos/Finsical.swift:83-86` (client prepare closure), `macos/Finsical.swift:110-116`, `macos/Finsical.swift:468`.

**Change.** `if #available(macOS 13.3, *) { v.isInspectable = UserDefaults.standard.bool(forKey: "FinsicalWebInspector") }` for the tank after :468 and for clients in the prepare closure; document `defaults write dev.finsical.app FinsicalWebInspector -bool YES` (T-02, T-12). Optional: answer a missing file with `HTTPURLResponse(statusCode: 404)` and an empty body (403 for traversal attempts; traversal is already handled correctly). Skip a UTType MIME rewrite (everything is read as ArrayBuffer), except adding webp for P-11.

**Acceptance.** (derived) With the default set, Safari's Develop menu lists the tank and client pages; a missing bundled file answers 404.

### T-25 Info.plist is missing standard keys

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** Only CFBundleExecutable, CFBundleIconFile, CFBundleIdentifier, CFBundleName, CFBundlePackageType, CFBundleShortVersionString, CFBundleVersion and LSMinimumSystemVersion are present.

**Evidence.** `macos/Info.plist:1-22`.

**Change.** Add CFBundleInfoDictionaryVersion 6.0, CFBundleDevelopmentRegion en, CFBundleDisplayName Finsical, NSHumanReadableCopyright ('Public domain (Unlicense). AquaZone art © 9003inc, fetched from the Internet Archive.', feeding the standard About panel), LSApplicationCategoryType public.app-category.entertainment, NSHighResolutionCapable true. A CI PlistBuddy assertion that the keys exist.

**Acceptance.** (derived) The CI PlistBuddy check passes; the standard About panel shows the copyright line.

### T-26 Test output is noisy and leaks file handles

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** Green runs print 24 'archive.org listing failed' stack traces, ResourceWarning 'unclosed file' at the cited lines, and unasserted stderr ('skipped, total byte budget exhausted', 'snd resources present but none decodable'), which hides real failures.

**Evidence.** `web/import.test.ts:87-98`, `tools/tests/test_fetch.py:226`, `tools/tests/test_fetch.py:230`, `tools/tests/test_img.py:52`.

**Change.** Spy on console.warn in import.test.ts and assert the calls (T-09); use Path.read_bytes() or `with open` in the Python tests; wrap expected-stderr tests in `contextlib.redirect_stderr(io.StringIO())` and assert the text; run the Python suite with `-W error::ResourceWarning` in CI.

**Acceptance.** (derived) Green runs print no stack traces or ResourceWarnings; expected stderr is asserted.

### T-27 Machine-specific JetBrains Java config is committed in .idea/

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** 7 tracked files irrelevant to a TypeScript, Swift and Python repo. The maintainer committed them deliberately and some JetBrains users share .idea, so ask first.

**Evidence.** `.idea/Finsical.iml`, `.idea/misc.xml` (JDK_23, 'openjdk-23 (2)'), `.idea/checkstyle-idea.xml` (Sun and Google Java checks), `.idea/noctule.xml` (absolute Xcode toolchain path), `.gitignore`.

**Change.** With the maintainer's agreement: `git rm -r --cached .idea` and add `/.idea/`, `coverage/`, `playwright-report/`, `test-results/` to .gitignore.

**Acceptance.** (derived) `git ls-files .idea` is empty and `.gitignore` lists the new paths.

**Merged and related.**

- Overlaps open PR #105 (stop tracking `.idea/`; one-line diff, reviewer failed twice, review gap). Ask the maintainer first.

### T-28 Asset CLI emits raw chunk files nothing reads, and same-named inputs overwrite each other

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** The loader only reads sprites images, decor images and sounds; chunks/*.bin are never read but inflate a bundled Finsical.app. a/Foo.fsh and b/Foo.fsh map to the same out/Foo and the second silently overwrites the first (fetch.py already suffixes -2).

**Evidence.** `tools/az/emit.py:70-77` (writes chunks/*.bin), `tools/azpack.py:32-34` (output dir from basename), `core/data/azpack.ts:175-185`, `macos/Makefile:33` (copies web/pack wholesale).

**Change.** A `--raw` flag on emit (off by default) for chunks/. In azpack.py reuse fetch._emit_source-style suffixing (Foo, Foo-2) and log each collision.

**Acceptance.** (derived) Two same-named inputs produce `Foo` and `Foo-2` with a logged collision; no `chunks/` without `--raw`.

**Merged and related.**

- Related: T-19.

### T-29 Idea: publish the web build to GitHub Pages as 'Try Finsical in your browser'

Size S · Severity idea · Value 4/5 · Risk 2/5

**Problem.** The tank and client windows already work in a browser over BroadcastChannel, and archive.org sends access-control-allow-origin for download and view_archive URLs (checked with an l-k-m.github.io Origin). Pages would give a no-install, no-Gatekeeper trial, including on Intel, Linux and Windows. Nothing in the browser links to prefs.html or overview.html today.

**Evidence.** `.github/workflows`, `README.md`, `scripts/build-web.mjs` (T-15), `web/main.ts:825-866`.

**Change.** `.github/workflows/pages.yml`: on push to main, npm ci plus T-15's complete build, then actions/upload-pages-artifact and actions/deploy-pages (pinned SHAs; permissions pages: write, id-token: write). A browser-only way to open the client pages (U-14's menu bar, or bare P and O keys opening named tabs via the existing stats-tab logic at main.ts:836-866). Link 'Try it in your browser' from the README; add V-17's viewport meta; smoke-test the deployed page with T-06.

**Acceptance.** (derived) The Pages workflow deploys on push to main; T-06's smoke test passes against the deployed URL.

**Merged and related.**

- Needs U-14 (open PRs #102/#103/#126) for browser navigation and V-19 for the favicon; the viewport meta is done (PRs #90/#93).


### T-30 `window.finsical.openImport` appears dead

Size S · Severity nit · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** `openImport` is exposed for the native shell, but Swift
invokes only `feedFish`/`toggleCrt` (and, in open PRs, `toggleMute`
and `toggleLights`).

**Evidence.** `web/main.ts:798-800` (`window.finsical`),
`macos/Finsical.swift` menu actions.

**Change.** Wire a native path that uses it or remove the surface.

**Acceptance.** (derived) A grep shows every `window.finsical` member
has a caller.

### T-31 Optional: extract `fitBackdrop`'s round-and-clamp into a tested helper

Size S · Severity nit · Value 1/5 · Risk 1/5 (from pass 2)

**Problem.** A reviewer follow-up on PR #87, declined there as a
stop-rule nit but still valid: the four-line round-and-clamp of the
cover-crop rect lives inline.

**Evidence.** `web/render.ts` `fitBackdrop` next to `coverCrop`
(PR #87).

**Change.** Move it into a pure helper beside `coverCrop` with tests.

**Acceptance.** (derived) Unit tests for whole-texel rounding and the
in-bounds clamp.

### T-32 Real-macOS verification checklist

Size M · Severity medium · Value 3/5 · Risk 1/5 (from pass 8 and this pass)

**Problem.** CI only compiles Swift; many native claims are
code-verified only ("not run on macOS"), and the eighth pass asked for
"native shell politeness" checks.

**Evidence.** B-05, B-24, B-25, B-26, B-27, B-28, B-41, B-48, B-49,
B-50, U-05, U-16, U-17, U-19, V-15, V-16, P-11, P-14 and the native
parts of PRs #151 and #152.

**Change.** A written manual checklist (or a UI test target) run
before each release: transparent-edge click capture, drag and resize
on all machines, restore to a removed monitor, custom-window focus,
WebContent process recovery, Help/About parity, Spaces and full-screen
behavior, and the entries above.

**Acceptance.** The checklist lives in the repo and a release records
its result.

### T-33 Maintainer action: publish the draft release

Size S · Severity high · Value 5/5 · Risk 1/5 (T-01's remainder)

**Problem.** v0.2.0 and v0.3.0 are unpublished drafts, so the README's
Download link (`/releases/latest`) leads nowhere. PR #156 fixes the
marker and prints the publish command, but an agent cannot publish.

**Evidence.** `.github/workflows/release.yml:49-60` (`draft: true`).

**Change.** The maintainer runs `gh release edit v0.3.0 --draft=false
--latest` (or publishes a rebuilt universal v0.3.1 after B-06), or
release.yml sets `draft: false` and `make_latest: true` if no manual
review is wanted.

**Acceptance.** `/releases/latest` returns 200 and the README link
downloads the app.

## Declined, refuted and corrected (do not re-raise without new evidence)

### Declined product ideas (passes 1-8)

- Starvation notifications: this is a relaxation toy, not a
  Tamagotchi. Reminders, if any, are fish behavior (D-15).
- Windowshade double-click collapse: the native window is chromeless,
  so there is nothing to shade.
- Seasonal or holiday gravel: scope creep (D-11's date-triggered
  sprites are a different, optional idea).

### Corrected claims (pass 8)

- "`nearestFood()` can briefly target food that was just eaten from a
  stale snapshot": unsupported; `nearestFood` skips `fd.eaten` and fish
  update sequentially. The adjacent real bug (fish stuck in `seek`) is
  B-32 (PR #154, and PR #148).
- "`web/crt.ts` `hash()` loses precision over long sessions; wrap
  `uTime` more often": `uTime` already wraps every 100 s and noise uses
  `fract(uTime)`; profile a real artifact first. V-14 holds the
  verified precision and wrap fixes.
- "`macos/Finsical.swift` `loadMaskImage()` assumes
  `premultipliedFirst`": the code derives the alpha byte offset from
  the alpha format and byte order. A native image test is still
  welcome.

### Refuted or dropped in the ninth-pass review (tmp.md)

Claims that verification refuted, downgraded to a non-issue, or replaced with a different fix. Do not re-raise them without new evidence.

- **Tank Overview list shading does not match Mac OS 8's Finder**: refuted. The CSS (`web/app.css:133-136`) deliberately recreates grey cells over white rules with a darker sort column, measured from Mac OS 8.0 screenshots; the claim rested on memory.
- **Add `.dna` to PACK_EXT so 'arow addon1' yields a fish** (B-11): refuted. Arowana.dna's adult sheets are byte-identical to Medaka.dna and medaka.fsh, so it would spawn a medaka and duplicate fish from medaka(1).zip and gup addon2. `.dna` is only acceptable for F-23's Power Updater collection with a duplicate-art check.
- **Fix the in-tank browser by calling `importPanel.notify({op: 'state', …})` from postState** (B-37): harmful. postState runs before restore, so every saved add-on would be marked installed and skipped at launch; use the 'uninstalled' op instead.
- **Make previewOf match usePack** (B-01): wrong direction. The tank's pick is the shared fry sheet; fix the tank side and have both use the adult ring.
- **Reset `f.phase = 0` when re-arming a seeking fish** (B-03): causes a visible one-tick stop; resume the ramp at the current speed.
- **Startle speed `max(speed, cruise) * (1 + 1.5k)`** (B-31): compounds on re-taps (8.75 px/tick); clamp at 3.5.
- **Waste per tick 1/27000** (U-01): below FILTER_PER_TICK, so single-pellet rot would never show and an existing test would fail; use 1/10000.
- **Drop every one-shot sound while the AudioContext is suspended** (B-17): would also drop the first click's own tap and feed; allow one retry during a gesture.
- **Integer-snap the tank by shrinking it** (V-03): floor(455/320) = 1 would shrink the default tank to 160 CSS px; use sharp-bilinear plus an integer-scale default window.
- **Reorder installedAddons to persist the chosen background** (B-20): tank presets carry fish sheets, so reordering reshuffles round-robin slots; persist the scenery choice explicitly.
- **Auto-remove a fish add-on when its last fish is deleted; auto-replace the previous gravel on install** (U-06): the sheet still feeds loose fish and the per-pack fallback is a deliberate design; fix the statuses instead.
- **Set `f.pack` on loose fish to make their art sticky** (B-15): removeAddon would then delete them; bind starters explicitly on the first live install.
- **Set `hidesOnDeactivate` on client windows** (B-05): hides Import Add-ons while Finder is active (breaks Finder drags) and hidden windows stop receiving state.
- **'No visual change' from rendering only on ticks** (P-03): the CRT grain and flicker then update at 30 Hz; acceptable, but not invisible. forceRender flags for scenery changes are unnecessary.
- **A 100 ms trailing throttle cuts hellos to ~5 per 10 s** (P-06): cannot merge hellos from clients spaced ~0.7 s apart; use a 1000 ms leading+trailing throttle.
- **Bind the esbuild dev server to 127.0.0.1 to fix GHSA-67mh** (S-09): the attacker page runs in the developer's own browser and reaches loopback; only the version bump fixes it.
- **Split tsconfig 'types' so web code cannot use Node globals** (T-13): @types/node is not installed; web code already cannot.
- **Missing bundled files make native code paths behave differently** (T-24): packFetch treats a 404 and a network failure the same; only console text differs. A UTType MIME rewrite is unnecessary.
- **A Web Worker is needed for decoding now** (P-08): after P-02 the remaining stall is ~25 ms per entry; build it only if measurement says so.
- **Two-pass CRT FBO is exactly equivalent** (P-10): misconvergence depends on the pre-warp glass position; profile on real hardware first.
- **Fish poke above the water line** (B-01, former margin finding): the renderer draws no water line; edge clipping behind the bezel is normal. Kept only as the sprite-extent clamp in B-01.
- **Preview counts: 21 of 62 species preview a non-primary sheet** (B-01): overstated; 9 of 73 distinct blobs, 7 of them 6g sheets that look fine. The dying-sheet preview is real for angels and ネオンテトラ.
- **Accessory picker wrong for ~15% of packs** (B-22): 3 of 36 sampled render visibly wrong (~8%); GIORNO's and ghost's picks are nearly identical to their ACPC.
- **PlPI tail @266 is the plant baseline** (B-23): it is the top y (top + height equals the tank height).
- **FsTH description is a Pascal string; clownfish ships 14-30 individuals** (F-02): it is a NUL-terminated C string; clownfish has 2 individuals.
- **The FsTH breeder field is always a breeder** (F-02): banggai and blackmolly store Windows .azn paths there.
- **Proposed day/night curve gives light(0) = 0.95** (B-09): it gives 1.0.
- **The accessory hint 'please place this at the very front' is machine-readable metadata** (F-04): it is a Japanese label image.
- **AquaZone saved tanks as .azn documents** (F-26): unverified; Finsical lists .azn as importable scenery, so tank files use `.finsicaltank`.
- **Desktop mode at `CGWindowLevelForKey(.desktopWindow) + 1`** (F-28): below Finder's desktop-icon window, which would swallow clicks; use `.desktopIconWindow + 1`.
- **Inject a wall clock into Sim for real-time lighting** (F-08): breaks the tick-only deterministic design; compute light in main.ts and pass it in.
- **Closed-form catch-up leaves fish 'gently hungry'** (F-09): hunger saturates in 20 minutes, so it must be capped (0.6) or wait for the feeder.
- **Whole-word regex for sound names** (B-19): would break joined names like 'TapTop'; separate music from effects instead.
- **7z URL rebuild `root + rel.replace(/^Missing /, '')`** (F-21): produces a doubled path; replace the first segment.
- **fp16-safe hash without an inner fract** (V-14): still collapses in fp16; the grille rewrite changes nothing.
- **Decor test 'Amazon_L:Amazon_S == 402:273' at ART_SCALE 0.5** (V-02): both hit the height clamp in a 200-px tank; test unclamped sizes.
- **Gravel crop rescues all six no-op packs** (B-12): only three are white-topped strips; clear, greensand and lowfront need other handling.
- **Shrink the Stats window to 220/200 pt** (U-23): clips the worst case of two wrapped hints; keep 250.
- **setAccessibilityTitle for the tank; contentsScale for the mask; CGImageSource for non-72-dpi masks** (U-20, V-15, P-14): redundant or moot (title is set; `.resize` gravity; no pHYs chunks).
- **`buildBmp8`/`buildZip` are duplicated helpers** (T-07): the two copies have different signatures.
- **Lure test with a 900-tick fixed lure** (D-02): contradicts the 600-tick fade; measure ticks 100-550.

## Design notes (preserved)

- `core/sim.ts`: excellent isolation; pure logic, easy to test.
  `new Sim(tank, seed)`: the second constructor argument is the RNG
  seed, not a fish count (a reviewer misread it once). Keep the sim
  tick-only and deterministic: real-clock lighting is computed in
  `main.ts` and passed in with `setLight()` (PR #155); injecting a wall
  clock into Sim was refuted.
- `core/pose.ts`: handles the pose ring and turn animations correctly.
- `data/azpack` / `fsh`: classic Mac resource-fork parsing works well.
  The pack trailer is a real resource map (F-01), which later code
  should use instead of chunk sniffing.
- `osmium-ui` provides the authentic retro Mac UI; `mountMenuBar`,
  `mountWindow`, `pushButton` and `registerSprites` are exercised by
  the browser shell. It has no alert component (PR #160 builds one in
  `web/alert.ts`) and no standalone menu renderer. UI fixes go
  upstream to L-K-M/osmium-ui (a pinned git dependency). Upstream
  follow-ups collected here: optional `level` and `collectionBehavior`
  on `OsmiumWindowSpec` (B-05, U-17), a `discard` API for hidden
  windows (P-15), accent variables (A-03), dimmed slider ticks (A-07),
  an on-screen frame restore (B-50), the drag mouse-up fix (B-48) and
  U+00B7 in Geneva 9/10 (V-18).
- `core/data/decor.ts`: the guard (`pickDecorArt`) skips catalog
  thumbnails with textured corners; PR #157's `pickDecorFrames`
  generalizes it to animation groups.
- `machines.ts`: clear viewBox and hole definitions; the Swift mirror
  is precise. The 16:10 tank inside roughly 4:3 glass is a deliberate,
  tested decision (V-05 proposes changing it).
- Tank state persistence (v1/v2 roster migration), sheet remap by pack
  URL and the thumb sweep on removal are carefully built; touch that
  code with tests running. v2 rosters are authoritative, including an
  empty one (B-16).
- `usePack` intentionally leaves sheets in place on removal to
  preserve `sheetIdx` bindings; do not "fix" the apparent leak without
  reading B-14 (pack-identity binding) first.
- Bus discipline: validate cross-page messages (`remoteInstall`
  pattern); clients should share one `isState()` validator. `BusMsg` is
  `Record<string, unknown>` by design today, with op validation in each
  handler (T-18 proposes typed unions).
- Settled food is waste in the sim model: `settled` increments, so
  `WASTE_PER_TICK` drains quality from the first settled tick, and
  `changeWater` siphons the whole settled layer. `WASTE_PER_TICK` must
  stay above `FILTER_PER_TICK` or single-pellet rot never shows (U-01).
- Native vs browser shell: AppKit owns the native menus; the Osmium
  menu bar (`web/menubar.ts`, open PRs) mounts only in the browser
  path. Keep them in sync when adding tank ops (lights L vs Cmd-L, CRT
  C vs Cmd-R, mute M vs Opt-Cmd-S).
- Relaxation-toy constraints (product guidance, pass 8): no mandatory
  maintenance, starvation notifications, irreversible deaths, surprise
  flashes, or a growing dashboard over the fish. Prefer gentle
  observable behavior, immediate reversible controls and useful
  offline operation. Killing fish (F-12) and diseases (F-16) are
  product decisions and default off.
- Composition guardrails (design constraint): keep the classic fonts,
  bevels, real case art, nearest-neighbor fish (box-filtered shrink at
  `ART_SCALE` is fine) and sparse controls; no modern rounded cards,
  blur or oversized type in the Platinum windows. Prefer a soft blue
  night tint over crushing to black.
- Shared art scale: fish (PR #149) and decor (PR #157) draw at one
  `ART_SCALE` from `web/artscale.ts`, so sizes relate across packs.
  Gravel (V-04) and thumbnails (V-10) should use it too.
- Azpack contract: `tools/az/emit.py` can emit a truncated group-major
  `dims` prefix when a sprite stream is truncated; PR #145's loader
  accepts an aligned prefix, absent cells throw `RangeError` at
  `frame()` time, and `drawFish` falls back to the placeholder (also
  PR #153) instead of killing the rAF loop. S-01 and S-02 propose
  rejecting truncated streams instead; change emitter and loader
  together.
- Decoders are ported in pairs (`core/data/*.ts` and `tools/az/*.py`):
  change both and keep parity (T-07). Parity alone is not correctness:
  B-02 showed both ports can share a bug, so pin goldens against an
  outside reference.
- Platform floor: macOS 12 / Safari 15 WebKit (B-29): avoid APIs
  newer than that (Osmium avoids `:has()` for this reason; D-08 avoids
  `.at(-1)`).

## Review-response logs (recorded so nothing flip-flops)

### Second pass

- Applied: whole-texel rounding + clamp for fitted backdrops; TANK-dims invariant note; CRT single-init lifetime note; named audio-skip warnings; `#crt` aria-hidden; F key in tank label.
- Declined with reasons: CRT observer teardown (single module-scope `initCrt`, no dispose interface; nothing to tear down); audio decode batching (manifests ≤ ~25 sounds, drops capped 32 MB); concurrent-`read` hazard (both `read` impls stateless: fresh fetch / File bytes); keyboard parity for tap (feed already has F + menu; tap-key is new scope); pure-helper extraction for the 4-line rounding (tracked above as optional).
- Refuted with evidence: none needed; no reviewer claim was factually wrong.

### Review-response log (third pass, Devin)

- Applied: multi-pack drop + `did`-on-rejected-pack import fixes (PR #93); corrupt-`scale` guard + clamp both ends + legacy-save `fromSave` flag + `GROWTH` comment math (PR #110); flat-school y-scatter comment + calibrated 10 px test margin + direct gap assertion (PR #112); `cleanTank`→`changeWater` op rename + "every settled pellet" doc fix (PR #114); pointer capture + `touch-action:none` + pointerId-scoped feed drag + FEED_STEP pacing + feed-sound throttle + id-stable gasp slack + `lostpointercapture` + named test tolerances (PR #106).
- Declined with reasons: `.azn` fish-sheet spawning; remote "tanks" section doesn't spawn fish either; `.azn` drops now match it (sheets still join the pool via `usePack`) (PR #93). 9-row gasp-slack quantization; integer pixel rows are fine for pixel art (PR #106). `EAT_DIST * f.scale`; design call, skews feeding competition toward adults (PR #110). Redundant clamp assertions duplicating covered branches (PR #110).
- Refuted with evidence: "dangerous `exec`/`child_process` usage" on `web/main.ts:994`; the flagged call is `RegExp.exec` on a string (PR #93). "Missing `cleanTank` `BusMsg` variant breaks the build"; `BusMsg` is `Record<string, unknown>`, CI green (PR #114). "Use 0 fish in the water-change test"; the ctor's second arg is the seed; the test already has zero fish (PR #114). "Confirm `audio.splash()` exists"; web/audio.ts:133, typecheck green (PR #114). "Feed drag never captures the pointer"; `setPointerCapture` runs unconditionally on every valid press before the branch (PR #106).
- Review gaps: GLM timed out twice consecutively on PR #103; reported as a gap, not approval; CI green. PR #106 also lost its first run to a timeout but later rounds completed.
- Steady state: all six PRs posted with merge-ready/gap notes. Rounds without important findings: #93 clean re-review; #103 n/a (integration failure); #106 rounds 3–6 minor-only; #110 rounds 2–5 minor-only; #112 round 3 clean; #114 rounds 2–3 clean/minor.

### Review-response log (fourth pass, Devin)

- Applied: `addEventListener("ended")` over `onended` assignment + normal-flow sound caption (#101); stored-names-only provenance + restore-time `onInstall` self-heal + `orphanedSounds` contract test, then `applyPack` hoisted out of the optional call (#104); queue list + no-replay-after-failure + iterative then flat rejection-proof drain (#117); `Item.use` optional under `exactOptionalPropertyTypes` + unconditional test assertions + success-path `postState` (#118); hover-memoized trigger then DOM-presence memo (#120); FileList snapshot then real `Array.from` copy (#121); retry rejection handler + `restoreFailed` refresh + single deduped `online` listener (#122); shared `LOCAL_PREFIX`/`isLocalPack` + awaited `packPut` with warn + rejection-reason logging + scenery-doesn't-block-fish drop flow (#124); backdrop cache keyed on dimensions as well as identity (#125); editable-target guard refined to bare keys only + COMPANIONS table (#126); in-page arm-confirm replacing `confirm()` (silent-false in WKWebView) + epoch checks before apply and `recordInstall` + disarm-on-empty + anti-double-click beat + danger styling (#127); night-fraction + precision-5 daylight-mean pins (#113); no-drift bidirectional settle + exported thresholds + x-steady assertion (#128); tip edge-clamp + touch guard + frame-loop staleness re-check (#130); shared drop-spawn helper (#111); wobble phase once-per-frame + wall-clock wobble (#108).
- Declined with reasons: "freeze wobble with sim pause"; no pause exists and rAF stops when hidden (#108). "Distinct warning for non-cap spawnFish failures"; `spawnFish` only returns null at the cap, so "Tank is full" is accurate (#111). GLM's `e.repeat` concern; `!e.repeat` was already in the s/o/p branch condition (#126).
- Refuted with evidence: "`Fish` type not in scope"; `import type { Fish }` at main.ts:21, typecheck green (#130). "Sleeping fish can't be woken by tap / state breaks saves"; `tap()` sets state+speed unconditionally and `state` is not persisted in SavedTank (#128).
- Review gaps: GLM failed twice consecutively on #105 and #107 (HTTP 429 / timeout); reported as gaps, not approvals.
- Cross-pass overlaps to reconcile at merge: #107 ↔ #106 (tap ripple), #125 ↔ #87 (backdrop cover-fit), #113 ↔ #109 fix/light-curve, #111 ↔ the cap idea inside the O(F·P) note, #120/#126 ↔ #103 browser menubar (complementary; button/keys vs menu bar).

### Review-response log (fifth pass)

- Applied: readonly-tuple widening + corrupt-pack try/catch + its truncated-directory test (#94); FOOD_ENTRY_Y for splash placement and the tickRipples doc fix (#129); `.finally` hint sync, frame count from the sprite module, tail-differs assertion (#131); save-field clamps (lightOverride/waterQuality/tickCount) and the falsy-zero lamp pin (#132); ambient-loop retirement + gain-node disconnect, buffer-before-context ordering, 20 ms gain ramps, 1 s clock tick, CRT-off dim scoped off Sound sliders, docOpen stand-down for bare keys (#102/#133).
- Declined with reasons: "log only when usePack accepts" (#94, twice); a pack with a sheet always gets a slot, the guarded form and its `else` are dead code; "derive body/tail split from frame data" (#131); the test pins a fixture's contract against its known geometry, deriving the split from the data under test would assert the data against itself.
- Stale anchors noted: several rounds re-anchored already-applied suggestions on newer commits (docOpen, Number.isFinite, wag assertion, LIGHT_NIGHT doc); verified via `original_commit_id` before acting.
- Review gaps: PR #102's first GLM run died HTTP 429 (rate limits from concurrent passes); a manual rerun completed and its findings were applied. No PR ended in an unreported gap.
- Steady state: #94 (rounds 4-5 clean), #102 (round 3 stale-only), #129 (round 2 clean), #131 (rounds 2-3 minor/stale only), #132 (rounds 2-4 minor, round 4's suggestion already present verbatim), #133 (rounds 2-3 minor, all applied). All six left open for human review per the task brief.

### Review-response log (sixth pass, Devin)

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
- Declined with reasons: deleting empty `species`; `""` is the
  sim's unbound sentinel (`addFish` defaults it; lookups fall
  through either way) (#135); drawing pellets topmost over front
  decor; mid-water occlusion is the depth effect and pellets over
  fish bodies would read as spots (#139).
- Refuted with evidence: "the filter matches raw markup" -
  `it.inner` is the zip entry/display name rendered via
  `textContent`; there is no markup in it (#136).
- Verification confirmations (info findings): `recordInstall` →
  `saveTank` → `postState` fires unconditionally including
  reinstalls; `zipCache` evicts rejected promises via
  `p.catch(delete)`; all `sheetByPack`/`packBySheet` consumers are
  fish-only so skipping `usePack` for scenery is safe (#134); stats
  history pushes before render and stays bounded (#140).

### Review-response log (seventh pass, full-repo review)

- Applied: decor replace-on-reinstall (#99); full-sine light curve
  (#109); `unlock()` on keyboard/menu feed paths (#115); README
  version + release-script traps (#116); native Cmd/Ctrl+I prefers
  the native Import window (#119); pause sim (#123); CRT presets
  tube-key derivation from `CRT_DEFAULTS` and focus/pointerenter
  `!described` guard (#142); feed-zone hover rechecked each frame,
  `containPoint` extraction + tests, `ceil` boundary, immediate
  `pointerleave` clear, zero-area rect test (#143).
- Declined with reasons: `e.metaKey`-only import-shortcut guard
  (#119; Ctrl+I is the dual-UI path); pause-persistence / TDZ /
  `e.repeat` concerns (#123, #115; already handled or out of
  scope); Authentic preset aliasing `CRT_DEFAULTS` (#142; already
  `Object.freeze`d, covered by `isFrozen` test); active-preset
  highlight (#142; out of scope / product decision); 0/0 NaN-path
  and `feedZoneLineY` invariant pins (#143; info-only nits after
  two consecutive rounds without important findings).
- Refuted with evidence: CRT-off preset buttons already dim via
  `osm-button:disabled` (`osmium-ui` osmium.css:263) (#142);
  `setEnabled` is typed `HTMLInputElement` and only toggles
  `.osm-disabled` on checkbox/slider ancestors; cannot take
  buttons (#142); ambient-stacks double-guard already in place
  (#115).
- Steady state: #99 round 2 clean; #109/#116 no actionable; #115
  `e.repeat` declined, otherwise clean; #119 clean after decline;
  #123 minor-only streak stopped; #142 round 3 0 actionable on
  `e7aadb6` (merge CLEAN); #143 round 3 info-only after applying
  rounds 1–2 (merge CLEAN). All eight left open for human review.

### Review-response log (eighth pass, Devin)

- Applied: junction-safe symlink, `npm.cmd` spawn + inherited stdio,
  and a non-empty `it.each` guard in the web-build test (#144);
  manifest-scoped `dims` error detail, an interior-gap `dims` test,
  and a `drawFish` placeholder fallback so an absent cell can't kill
  the rAF loop (#145). Round 2: build-child `timeout: 25_000` inside
  the 30s hook (a blocking execFileSync made the hook timeout dead
  code) and env-gated `WEB_BUILD_DEBUG` stdio (#144); drawFish catch
  narrowed to `RangeError` so other render regressions still
  propagate, and the non-array `dims` message split out (#145).
- #147 round 1: gravel bottom-anchored to `m.sy + m.sh` (screen
  rects are ~16:10 but rounded, not exact), `pvwater` gradient id
  suffixed per machine (SVG ids are document-global), swimmer-count
  test strips the trailing shell markup first. Facing convention
  verified against `drawPlaceholder` (`scale(-facing)`); preview
  fish already mirror the live tank; no change needed.
- #148 round 1: `f.phase = MOVE_TICKS` on seek-abandon so `decide()`
  repicks a wander target the same tick (was: steering at the dead
  pellet's coordinates); tests pin `toBe("drift")` + `phase === 0`,
  and the foul-water case derives from exported `QUALITY_SEEK`.
- #146 round 1: `invalidatePaint()` wired to every out-of-band
  tank-mutation path (pointer feed/knock, menu feed, spawnFish,
  handleImages, handleSheets, removeAddon) so those show next rAF;
  stale-frame-upload test added for the `dirtyTex` contract.
- Refuted with evidence: "truncated `dims` packs were previously
  rejected cleanly at load"; no manifest validation existed before
  PR #145; the absent-cell `RangeError` predates the PR and is now
  cushioned (#145). "Repaint gating blanks on canvas resize"; the
  tank canvas buffer is never reassigned on this baseline (fixed
  320×200), no pause exists on main, and `render()` draws only sim
  state (#146). "`resize()` may reallocate the texture"; it only
  resizes the output canvas + viewport; the source texture is
  allocated once at init (#146).
- Deferred: per-(sheet,group,frame) "cell missing" memo so a
  truncated pack stops paying exception cost per frame (#145 info
  follow-up); a pack missing cells is already rare.
- Steady state: pending; round 2 reviews were still in flight on
  #146–#148 when this document was last updated.

### Ninth pass (this pass, PRs #149-#160)

Final scorecard (automated GLM 5.3 reviewer rounds; every PR reached
steady state and was left open for human review and merge):

| PR | Branch | Items | Rounds | State |
| --- | --- | --- | --- | --- |
| #149 | `claude/adult-fish-art` | B-01, V-10 fish part | 4 (R3 minor fixed `4b6996a`; R4 0 actionable) | steady |
| #150 | `claude/mace-tables` | B-02, T-03 MACE part | 2 (R2 minor re-raise declined) | steady |
| #151 | `claude/client-windows-front` | B-05, U-17, B-26, B-24 | 1 (0 actionable) | steady |
| #152 | `claude/mac-menus` | U-05, U-16, U-19 | 1 (0 actionable) | steady |
| #153 | `claude/render-on-tick` | P-03, P-13, S-01 part | 2 (R2 minor-only, declined) | steady |
| #154 | `claude/calmer-fish` | B-03, B-07, B-08, B-10, B-31, B-32 | 2 (R2 test-only nits declined) | steady |
| #155 | `claude/day-night-clock` | B-09, F-08 | 2 (R2 0 actionable) | steady |
| #156 | `claude/readme-guide` | T-01, T-02, T-03, T-04 | 2 (R2 0 actionable) | steady |
| #157 | `claude/animated-decor` | F-03, B-22, V-02 | 1 (4 minors refuted) | steady |
| #158 | `claude/living-water` | A-01, V-11, V-12 | 2 (R1 major fixed `1692826`; R2 nits declined) | steady |
| #159 | `claude/sound-prefs` | F-05 part, B-45 | 2 (R1 minors fixed `081c93c`; R2 declined) | steady |
| #160 | `claude/welcome` | U-02 points 1-3 and 5, D-07 | 2 (R1 blocker refuted, major and minors fixed `9eb697e`; R2 0 actionable) | steady |

- Applied:
  - #149: R1 eat reach for halfH > 40 uses the clamp's factor, with a
    test (`c28ac99`); R2 bounded settle wait in the big-fish test
    (`780096b`); R3 wide fish could not eat a pellet against the side
    glass (reach now adds the pellet's distance outside the side
    clamp), with a test that failed before (`4b6996a`).
  - #150: R1 LGPL section 4 wording in the notices (`043835b`).
  - #153: R1 `unlock()` no longer resumes while hidden, with a test
    (`8aaf086`).
  - #154: R1 ahead-bias mirror clamped onto the wall a fish was at,
    with a test that failed before (`3251aac`).
  - #155: R1 Lighting caption cleared when a pop-up took focus;
    browser-verified before and after (`40eb4f0`).
  - #156: R1 xattr caveat (`5e5d7f8`).
  - #158: R1 major murk debris kept drifting under reduced motion;
    `BUBBLE_RISE` now exported from the sim (`1692826`).
  - #159: R1 master level glides (`setTargetAtTime`, 10 ms) instead of
    stepping, with a test; volume slider says "Muted" when muted
    (`081c93c`).
  - #160: R1 major dialog-key listeners piled up on progress updates
    (now bound only when buttons exist); aria-label "Finsical"
    (variant of the suggested labelledby, which would read the text
    twice); tall alerts scroll; Escape answers the glass-tap OK;
    already-installed add-ons ack the in-page window; `fishArrived`
    moved out of the install's catch (`9eb697e`).
- Declined with reasons:
  - #151 R1 `formUnion` for `collectionBehavior` (Osmium sets no flags,
    and a union could combine `moveToActiveSpace` with
    `canJoinAllSpaces`, an AppKit exception); besideTank
    neither-side-fits case (first open only, rare, window stays in
    front).
  - #152 R1 persisting the CRT checkmark (state push at page load sets
    it).
  - #150 R1 TS/.bin parity test (goldens pin both copies); R2
    `SndError` wrapper (same as R1, re-raised).
  - #153 R1 `shouldRender` helper (trivial predicate); R2 extending the
    hidden-unlock test (covered by sibling tests).
  - #149 R1 restPose throw, scale cache, degenerate scale, right-facing
    comment and ImageData suggestions (refuted per thread); R4 sim
    extents written in `drawFish` (at most one tick stale before the
    first draw; follow-up: set them when a fish binds to its sheet).
  - #156 R1 wrapping `JSON.parse`.
  - #154 R1 defaulting `addFish` hunger to `SPAWN_HUNGER` (the app
    passes it explicitly; sim tests rely on the 0.2 default); R2
    left-wall twin test and seed label (same clamp expression).
  - #155 R1 ramp clamp in `phaseAt` (whole-hour timers make it
    unreachable; demo cycle fixed).
  - #157 R1 info monotonic per-pack copy counter (decors are add-only
    today; latent).
  - #158 R1 `TANK`-derived W/H in water.ts (`TANK` is private to
    main.ts; canvas fixed at 320 x 200), tracked feed timeouts
    (sub-second, harmless into a paused sim), Safari 14
    `addEventListener` fallback (LSMinimumSystemVersion 12.0); R2
    shared `waterTime` local (`drawMurk` is the only tick-driven water
    layer), `BUBBLE_RISE` in tests (literals pin the contract) and
    doc wording.
  - #159 R1 Mute Sound checkmark (Tank menu toggles are stateless on
    this base; belongs with #152's menu work; follow-up), import
    previews ignoring volume (separate `<audio>` element; follow-up),
    keyboard drag latch (the slider is the only writer; blur clears
    it); R2 "Muted, N%" valuetext (the slider is disabled while muted).
  - #160 R2 tautological `starterCollection` assertion (harmless;
    follow-up: test it against a synthetic nested collection).
- Refuted with evidence (PR comments posted where a claim could
  mislead a merge decision):
  - #151 R1 major "fixes only the four menu actions" (`showClient` is
    the only `host.show` caller; Osmium never reopens windows).
  - #152 R1 major "new client windows still float after the toggle"
    (Osmium windows are `.normal`; #151 covers the floating-on case).
  - #150 R1 major "MACE errors are no longer `SndError`" (`parseSnd`
    length-checks and throws `SndError` before `mace3Decode`;
    `SndError` is unexported).
  - #153 R1 blocker "`eval()`" (false positive on comment text; the
    comment was reworded).
  - #156 R1 blockers "version mismatch" (everything is 0.3.0 and the
    check passes).
  - #157 R1 four minors: empty frames array (`decorCanvases` never
    returns `[]`), tallest-frame scale (frames are grouped by exact
    size), try/catch (the replaced path was unguarded; `shrinkSprite`
    output is always valid), 1 px scale clamp (`shrinkSprite` already
    floors at 1 px).
  - #160 R1 blocker "rejected listing strands the alert" (`listAddons`
    catches every collection and resolves; browser-verified with all
    archive.org requests answered 502).
- Verified: #150 R1 info "goldens vs real FFmpeg": stock ffmpeg 7.0.2
  reproduces all three hashes. #159 R1 info: the `icon-sound` sprite
  exists.
- Not implemented from the ninth-pass plan: D-01 (planned in #155) and
  B-17 (planned in #159) remain open; see their entries.
- Review gaps: none; every PR completed at least one GLM round.

## Implementation Order (suggested)

Highest value per risk first. Phase 0 is a merge backlog, not new
code: about 60 review PRs are open and several implement the same
idea.

**Phase 0: reconcile and merge open PRs.** Pick one of each
overlapping set, then merge: tap ripple (#106/#107/#129), backdrop
cover-fit (#87/#125), multi-pack drop (#93/#94), Sound pane
(#101/#133/#159), browser menu bar and shortcuts (#102/#103/#126),
placeholder fish (other-pass branch, #131, U-02 remainder), render on
tick (#146/#153, with #145's fallback), light curve and lamp
(#109/#113/#132/#155), stale seek (#148/#154), native Cmd-I
(#119/#151), README version (#116/#156), decor frames and depth
(#99/#139/#157, and decide B-21's copies-vs-replace), CRT presets
(#142) vs other Monitor-pane work, feed-zone cue (#143) vs drag-to-feed
(#106), and #144's `cpSync` vs the manual `package.json` edit (T-15).
Then T-33 (publish the release).

**Phase 1: small, high-value fixes (S, risk 1-2).**

1. B-16 empty tank stays empty (with S-07's parse step if cheap).
2. B-06 universal binary, then T-33's v0.3.1.
3. B-11 and B-12 honest install results; B-44 no useless Try Again.
4. D-01 fish rest at night, gated on `light < 0.5` (not 0.45) so it
   works with PR #155's clock nights; reconcile with #128.
5. B-17 no burst of queued sounds on the first click.
6. U-01 food cap and gentler waste (after #158's pinch lands).
7. B-19 music never answers taps; B-40 no ambient restarts.
8. U-09, U-11, U-13, U-22, U-23 wording and state nits.
9. B-25, B-28, B-49, B-50, V-15 native safety fixes (T-32 checks).
10. T-21, T-22, T-23, T-20, T-19 Python tool fixes; T-13 linters.

**Phase 2: pack identity and persistence (M, risk 2-3).**

11. B-04, B-14, B-15 in one `web/tankmodel.ts` series, then B-23(a).
12. B-20 and B-21 scenery choice and copies (after Phase 0 decisions).
13. S-07 schema boundary (motion fields decision), B-51, P-21.
14. B-37, B-38 removal authority; B-46 remainder; B-30 cache pinning.
15. B-39, B-18 sound store transaction and removal; B-54 scenery PNG
    contract.
16. B-41 Swift quit save, B-53 hidden-tab policy (product decision),
    B-55 Stats history.

**Phase 3: performance and robustness.**

17. P-02 header-only sheet decode (after #149), then S-02.
18. P-01 bounded caches; P-05 progressive catalogue; P-07 parallel
    restore; P-06 push coalescing.
19. S-03, S-04, S-05, S-01 remainder, S-06 (if #145 is not merged),
    S-08 relay guard, S-09 dependency bumps.
20. P-04, P-12, P-14, P-18, P-19, P-20, P-22, P-23; P-08, P-09, P-10, P-11,
    P-15, P-16, P-17 only after measurement.

**Phase 4: tests, CI and docs.**

21. T-06 browser smoke suite (hosts V-08's GL probe), T-14 pinned CI
    with the Python matrix, T-15 complete web build.
22. T-07 parity corpus, T-08 and T-09 extractions and fixtures, T-17,
    T-18 typed bus, T-16.
23. T-10 CHANGELOG sections, T-11 ARCHITECTURE.md, T-12 quick
    reference, T-03 remainder, T-24, T-25, T-26, T-27, T-28, T-30,
    T-31, T-32 checklist; T-29 Pages once U-14 is merged; T-02
    remainder if the owner wants notarization.

**Phase 5: UX and visuals.**

24. U-02 remainder, U-03 (after the ripple PRs), U-04 undo, U-06
    statuses, U-07 remainder, U-08 sorting, U-10 drop feedback, U-12,
    U-28 visible states, U-24 progress and Stop.
25. V-09 decor previews (reuse `decorCanvases`), V-10 remainder, V-04
    gravel and sim floor, V-06 tilt smoothing, V-08 CRT sharpness,
    V-14, V-16, V-18, V-19 favicon.
26. U-14 (if the menu-bar PRs are dropped), U-15 contextual menu, U-18,
    U-20 remainder, U-21 real plant names (after F-01), U-25, U-26,
    U-27, U-29.
27. V-03 integer scale and V-05 4:3 tank (L, decision needed), V-07
    authored pitch poses (after F-01).

**Phase 6: AquaZone fidelity.**

28. F-01 resource map (unlocks most of this phase), then F-02 names
    and Get Info (with #137), B-33 scripts, F-11 growth rings.
29. F-21, F-22, F-23, F-24, F-25 more content from archive.org.
30. F-05 remainder jukebox, F-06 foods, F-07 feeder, F-10 speed, F-14
    filter, F-13 Tank Log, F-26 save files, F-27 Dock drops, F-29
    picture controls, F-30 history, F-31 dimmer, F-32, F-33.
31. Product decisions first: F-09, F-12, F-15, F-16, F-17, F-18,
    F-19, F-20, F-28, F-04, B-23(b).

**Phase 7: aesthetics and delight as seasoning.**

32. A-04 About This Aquarium, A-05 Balloon Help, A-06 icon, A-02
    depth modes, A-03, A-07.
33. D-02, D-03 separation, D-06 remainder, D-08, D-09, D-17, D-04,
    D-05, D-10, D-15, D-12, D-14, D-16, D-18, D-19, V-20 to V-25.
34. D-11, D-13, D-20, D-21, D-22 to D-31 last.

---

*Merged from nine review passes: passes one to eight were already
folded into the previous ANALYSIS.md; the ninth pass's full-repo
`tmp.md` review and its scorecard are folded here, with implemented
items moved to the ninth-pass Completed section. No open idea was
removed: duplicates were consolidated into one entry each (see the ID
map and each entry's "Merged and related" notes), and unsupported
claims are kept under "Declined, refuted and corrected".*
