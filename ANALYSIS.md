# Finsical Analysis — Shovel-Ready Improvements

Consolidates four independent review passes plus follow-up review
responses. Nothing below is dropped: implemented items stay listed
with their branch/PR so future work can see what landed, and every
open idea is written so an LLM can pick it up cold.

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

## Bugs / Reliability (open)

- `core/sim.ts`: `nearestFood()` can briefly target food that was just eaten if called with a slightly stale snapshot. Confirm removal order in `tick()`.
- `core/sim.ts`: `tap()` propagates panic but doesn't cap bubble spawn in foul water. Consider a max-bubble cap for performance.
- `web/crt.ts`: `hash()` uses `fract()` which may lose precision over very long sessions; wrap `uTime` more frequently or use a different noise source.
- `macos/Finsical.swift`: `loadMaskImage()` alpha-offset computation assumes `premultipliedFirst`; add a runtime check or fallback for other byte orders.
- `web/import.ts`: thumbnail fetch dedupe hole — IDB-miss path deletes from `thumbQueued` then pushes to `thumbQueue`, so a second `wantThumb` before fetch completion queues a duplicate (`pumpThumbs` never checks). Harmless today (`fetchAddon` memoized) but slow packs starve the 3-wide queue.
- `web/import.ts`: loose-mode (`prefix:`) listings don't dedupe colliding basenames the way the nested-zip branch does — two same-name rows bind `sheetBySpecies` last-wins. Copy the `used`-set logic over.
- Fetch path has no timeouts: a stalled archive.org request wedges that URL in `installsInFlight` while the panel's 15 s "Try Again" re-arms a no-op button. Add `AbortController` timeouts (~30 s) + clear in-flight on timeout.
- Sim time stops when the tab is hidden (rAF-driven), so stats uptime/hunger/day-night stall while client windows claim live readings. Advance catch-up ticks on visibilitychange, drive from a Worker, or grey stale numbers until fresh pushes land. Note for stats wording: "up 4h" is visible-hours, not wall-hours.
- Fractional sprite dest rects (`drawFish` rounds translate but not w/h) shimmer on HiDPI with smoothing off. Round w/h to whole pixels.
- Cosmetic drift: Swift `DragStrip` is 22 px, overlay `TOP_CLEAR` is 24 with a comment saying 22. Pick one number.
- `PLAN.md` overclaims the sim ("mood" — growth stages now exist; mood still doesn't). Implement mood or reword.
- Saved fish fields aren't validated beyond `x`/`y` (`loadTank` roster filter in `web/main.ts`). A hand-corrupted `hunger: "x"` or `null` enters the sim, poisons `Math.min` results, and re-persists (the `scale` field got this guard in PR #110 — extend the same pattern to the other numeric fields).
- `remoteInstall` calls `recordInstall` (→ `saveTank` → `postState`) and then `postState()` again — one redundant broadcast per install.
- Drop-path stem logic: `name.replace(/\.[^.]*$/, "")` strips the last dot-suffix only; keep it aligned with the remote path's stem logic (`replace(/\.[^.]+$/, "")`) — same regex, noted so future edits don't diverge.

## Performance / Engineering (open)

- Hoist per-frame string allocs in `render()`: murk/dark `rgba()` templates rebuilt each frame, `globalAlpha` toggled per pellet.
- Sim is O(F·P) (`nearestFood` per fish per tick) + O(F²) panic fan-out + O(F²) schoolmate `filter` per decision — fine under caps, the stutter vector without them. Fish cap landed at 24 (PR #111); still open: cap pellets (~60, evict oldest) — overfeeding currently fouls the tank in ~1 s, which reads as broken.
- `AudioContext` is constructed during page load before any gesture (suspended-context warnings). Defer creation to `unlock()`.
- `saveTank` serializes the roster to localStorage every 10 s even when clean. Hash-and-skip.
- Drop path reads every file twice (head slice + full buffer, up to 32 MB). Reuse head bytes for sniffing.
- Four client windows each `hello`-poll every 2–10 s, each answered by a full state push. Push-on-change + slow heartbeat instead.
- Bounded thumbnail memory: confirm `thumbMemo` LRU stays within budget under all session lengths.
- Cache eviction metrics: temporary log counter for `swimCache`/`thumbMemo` evictions; verify near-zero in normal use.
- Audio overlap: `startAmbient()` may briefly overlap previous loops; verify no audible stutter during rapid load/restart.
- Optional GLM follow-up (declined as a stop-rule nit, still valid): extract `fitBackdrop`'s round+clamp into a pure tested helper next to `coverCrop`.
- The whole JPN collection zip is downloaded to *list* entries: `listCollection` nested-zip mode fetches `AQUAZONE (JPN) SET.zip` — the entire item library, likely tens–hundreds of MB — into memory and IndexedDB (150 MB LRU budget). First JPN section open stalls; `packPut` failures are swallowed so it degrades to "no persistence". archive.org offers no central-directory-only fetch; keep the budget trim, warn in docs, and monitor quota.
- Pack decode (`zipRead`/`decodeIndexedPng`/`decodePixels`) runs on the main thread — a big `.azn` janks the tank rAF loop while thumbnails decode. The 3-in-flight throttle is polite but a `Worker` would isolate it; medium effort, real win on long add-on lists.

## Missing features (open)

- **Click-a-fish info card (highest value).** Per-species names + descriptions (`FsTH`) are decoded but never shown; clicks only scare. ⌥-click (or plain click) should open a Get-Info fish card: name, description, hunger/mood, species params.
- **Fish lifecycle stage 1.** No sickness (`SicH` unused), death, birth/eggs (`Egg*` unused) — growth landed in PR #110 but hunger still has no *adverse* consequence. Start with lethargy at hunger ≥ ~0.9 + recovery on feed, wired to the decoded birth/sick/dead `snd` events.
- **Lighting switch.** `sim.light` auto-runs a 13-min cycle with ~6.5 min pinned at flat night. Add day/night/auto + dimmer; `LigH` data already decoded. Optional real-clock sync (local-time day/night) is a classic relaxation-toy touch and would fit the same prefs pane.
- **More foods.** `FdHd` data decoded and ignored; flakes/pellets/live food with different sink rates is one `sink` field on `Food`.
- **Import search/filter.** JPN sections are long; add a name-substring filter box.
- **Starter reef bundle.** One-click curated set (6 fish + gravel + plant) + first-run card ("Your tank is empty. [Import Add-ons…] [Stock a starter reef]") — fixes asset-failure silence and cold-start discoverability together.
- **Overview actions.** Click row → spotlight fish in tank (ring highlight); rename (persist in save); state icons. Sort-column choice isn't persisted either.
- **Stats history.** Sparklines for water/hunger from the existing 90 s `history` samples.
- **Pause/sleep.** Freeze `tick()` (render continues) for screenshots/benchmarks.
- ~~**No mute/volume.**~~ Mute landed via PR #101 (Sound pane, persisted pref, `m` key, native menu). Still open: volume sliders (ambient/one-shot) — `TankAudio` has fixed gains.
- **In-app help.** The browser menu bar now exposes the features, but F/feed, surface-feed, tap-scare, C/CRT shortcuts exist nowhere in the app. One "About / Shortcuts" card (or Balloon Help, below).
- **Per-species swim params.** `FsTI` (speed, depth band, hunger rate) is decoded and unused; all fish share behavior constants.
- **`feedFish` drops at tank center** — menu feed could drop at a random x for variety.
- **Backdrop/gravel chooser.** Partially landed: the Overview's "Use" action (PR #118) swaps among installed scenery packs and persists the pick. Still open: `pickBackdrop` newest-wins on *install*, and a prefs-side chooser/preview.
- **Fish naming/rename UI.** `FsTH` name records exist; the overview is the natural Finder-style inline-edit home. (A named-fish branch exists in the other pass — reconcile.)
- **No sickness/death beyond lethargy** — see lifecycle; fish gasping at the surface in foul water now exists (PR #106) as the pure-visual first step.
- **No multi-sheet growth stages** — `usePack` keeps only the single "best" sheet; real growth-stage art (`FsT2`/`FsT3` tables) would need multi-sheet support. Scale-based growth (PR #110) is the interim.
- Explicitly declined idea, recorded: starvation notifications — this is a relaxation toy, not a Tamagotchi.

## Visual / Aesthetic (open)

- **Scene life, ranked:** plant sway (sine x-shear by height on static decor) → light rays/godrays → caustic dapple on gravel (pre-rendered noise, slow scroll) → fish drop shadows → tumbling food crumbs. One effect per PR. (Light-rays/night-blue and round-bubble variants exist in other-pass branches — check them before reimplementing. Surface line, tap ripples, and ambient bubble vents landed in PR #106.)
- ~~**Moonlight, not black overlay.**~~ Landed via PR #113 (full-sine valley + deep-blue tint) and PR #128 (fish settle on the gravel). Still open: keep sparkles visible, darken sleeping fish sprites.
- **Gravel finish.** Feather the strip's top edge 1–2 px into the water; seat decor roots *in* it; consider subtle noise texture over flat `#8a6d3b`.
- **Procedural placeholder fish.** Offline users live with orange rectangles; a tiny two-colorway pixel fish keeps the crunch without shipping art. (Another pass has a pixel-placeholder branch — reconcile. Placeholder fish also get no overview thumbnail — the pending-thumbs key stays alive by design; consider a placeholder thumb so the list never looks broken.)
- **Machine preview with tank.** Render the 320×200 gradient inside the prefs preview glass (`sx/sy/sw/sh` all exist) so cases aren't picked blind.
- **Decor anchors to `TANK.height - 6`, not the gravel top** — tall `.grv` strips leave plants looking sunken, thin ones leave them floating. Anchor to the rendered gravel height (`gh`).
- ~~**Bubble variety.**~~ Landed via PR #108 (highlight pixel + wall-clock wobble). Still open: a 1 px size range.
- **`cursor: grab` on `body.tankpage`** suggests window-drag in plain browsers where it does nothing — cosmetic lie outside the native shell.
- **Eat gulp sound** — `find("eat","gulp")` on `food.eaten` if a pack ships one; silent otherwise.
- Food pellet eaten-animation (shrink/rotate before splash).
- Adaptive murk tint (toward backdrop's dominant color, not fixed brown).
- Night glow: faint bottom bioluminescence at very low light.
- Reflection layer: low-opacity mirrored canvas behind machine glass for depth.
- **Night-light bezel tint** — the machine case art could dim with `sim.light` via CSS filter; subtle, lovely.
- Minor: `#opentrigger` overlaps the case's rounded corner on some machines.
- Fish pitch capped ±45° — steep dives clip mid-pose; acceptable, noted.

## User Experience / Delight (open)

- Right-click (ctrl-click) contextual menu on the tank — Feed, Clean tank, Import Add-ons…, Snapshot, Mute — keeps chrome-free look, makes everything reachable even where the menu bar doesn't. The `pointerdown` handler already reserves non-left buttons.
- Feed affordances: crumb cursor over the top 15%, crumb trail + plip on drop; touch long-press = scare split. (Drag-to-feed scattering landed in PR #106.)
- Import flow: per-row progress spinners, 2–3-wide parallel installs, failure text naming the file.
- Touch: feed-vs-tap (y<15%) is still hard to discover even with the menu bar — a first-use hint or the feed affordances above would fix it.
- Stale badges: grey client-window numbers until the first fresh push after wake.
- **Cursor awareness:** the nearest fish idly faces the pointer when it hovers the tank (no click) — subtle "it notices you". Cheap: in `decide()` occasionally target near last pointer pos.
- ~~**Fish sleep mode**~~ — landed via PR #128 as a real `sleep` state: fish settle on the gravel at dusk, idle with a weak stroke, wake at dawn or on a knock.
- Keyboard shortcut cheat sheet — `?`/`H` overlay or an About-box pane documenting F/C/S/⌘I in-browser.
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
- Time-lapse contact sheet (1 fps toDataURL for 60 s).
- Vintage filter mode (sepia + reduced saturation + vignette).
- Bubble trails: faint fading trails as fish swim.
- Custom 16×16 sprite editor in palette colors, persisted to localStorage.
- Konami-style easter egg → a tiny bonus fish. Optional whimsy.
- Declined, recorded: windowshade double-click collapse (native window is chromeless — nothing to shade); seasonal/holiday gravel (scope creep).

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

## Implementation Order (suggested for future work)

1. Pellet cap + foul-rate sanity (fish cap landed in PR #111; sim test first, TDD).
2. Fish info card (data already decoded; biggest feature win).
3. First-run card + starter reef bundle.
4. Scene life, one effect per PR (check other-pass branches first).
5. Volume sliders (mute landed in PR #101) + keep browser/native menu wiring in sync.
6. Import search + install progress/parallelism.
7. Fetch timeouts + thumb queue dedupe.
8. Lifecycle stage 1 (sickness lethargy → eggs later).
9. Lighting switch + real-clock sync (moonlight curve landed in PR #113).
10. Food pellet animation + gravel texture + decor anchoring (quick visual wins).
11. Night glow + darkened sleeping-fish sprites (sleep state landed in PR #128).
12. Screen relaxation mode, fish diary, vintage filter + adaptive murk.
13. Breeding, sprite editor, remaining delights as seasoning.

---

*Merged from four review passes (two other-pass tmp.md files already folded above; third- and fourth-pass swe.md/tmp.md folded with implemented items marked by PR). No entries removed; overlapping ideas consolidated and cross-referenced.*
