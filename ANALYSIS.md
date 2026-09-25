# Finsical Analysis: Shovel-Ready Improvements

Consolidates sixteen review passes and their review-response logs into
one
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
- Tenth pass (2026-09-24, `origin/main` `62b8572`): review PRs #179,
  #180 and #182 are open for the maintainer (all at steady state, none
  merged). Tenth-pass entries name that revision; verify against
  `origin/main` before re-scoping, since those PRs may have landed.
- Eleventh pass (2026-09-24, `origin/main` `f777fa8`): review PRs
  #181, #183 and #184 are open for the maintainer (all at steady
  state, none merged). Eleventh-pass entries name that revision;
  verify against `origin/main` before re-scoping, since those PRs may
  have landed.
- Thirteenth pass (`origin/main` `e9360a8`): an implementation pass —
  44 focused PRs (#188 through #252, minus the maintainer's claude/
  branches) are open for review, each named in the entries it
  addresses. None are merged; verify against `origin/main` before
  re-scoping. The GLM reviewer hit Z.ai rate limits on a few branches
  (#233, #235, #237) — those reviews are gaps, not clean rounds.
- Fourteenth pass (2026-09-24, code at `62b8572`, folded on
  `e9360a8`): sixteen review PRs (#208 to #242) are open for the
  maintainer, all at steady state, none merged. Entries a PR fully
  implements are listed in the fourteenth-pass Completed section and in
  each category's "Done" line; if one of those PRs is closed unmerged,
  restore its entry from `tmp.md` history or the PR description.
  Fourteenth-pass notes cite that revision; verify against
  `origin/main` before re-scoping.
- Sixteenth pass (2026-09-25, `origin/main` `06f7935`): a fresh
  full-repo review; its `tmp.md` was folded into this document. Three
  PRs (#263 frame-loop allocations, #265 launch and removal
  reliability, #272 Monitor pane) are open for the maintainer with CI
  green on all three. **The GLM reviewer could not run:** every attempt
  on all three returned `Z.ai API: HTTP 429` (rate limit) — those are
  review gaps, not clean rounds, and no review round has completed.
  Sixteenth-pass notes cite `06f7935`; the tree moved ~70 commits
  during the pass, so verify against `origin/main` before re-scoping.

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
- Tenth pass (full-repo review at `62b8572`, 2026-09-24): three
  dimension agents (sim/rendering, import/audio/UI/shell, tools and
  AquaZone fidelity) plus targeted verification (vitest 38 files / 471
  tests green; `npm run typecheck` and `npm run build` clean). Findings
  became `tmp.md`, then three PRs (#179 page metadata, #180 Prefs
  off-caption, #182 Fish Diary milestones), each reviewed by GLM 5.3 to
  steady state and left open. Claims that did not survive verification
  are recorded under "Refuted or dropped in the tenth-pass review".
  The Python suite was not re-run this pass (no tool changes). Swift
  behavior code-verified only, as before.
- Eleventh pass (full-repo review at `f777fa8`, 2026-09-24): three
  dimension agents (core engine and decoders, web UI and rendering,
  macOS shell and tooling) plus targeted verification (vitest 38
  files / 471 tests green; `npm run typecheck` clean; `npm ci` from
  scratch). Findings became `tmp.md`, then three PRs (#181 tap-sound
  word matching, #183 frame-pacing and hour-label guards, #184
  tank-page CSS nits), each reviewed by GLM 5.3 to steady state and
  left open. New open entries take the next free IDs (B-56+, P-24+,
  V-26+); everything else maps to existing entries (see each entry's
  eleventh-pass notes and the review-response log). The Python suite
  was not re-run this pass (no tool changes). Swift behavior
  code-verified only, as before.
- Twelfth pass (full-repo review at `62b8572`, 2026-09-24): the
  backlog was re-verified slice by slice against main (several
  entries had silently landed or rotted — see "Backlog status
  verified" notes in each entry) plus fresh findings N-1 through
  N-12; vitest 471 tests and 80 Python tests green at baseline.
  Findings became `tmp.md`, then seven PRs (#185 audio unlock and
  event caps, #186 client-window drop guard, #187 fetch.py fixes,
  #189 food cap, #192 stereo sound, #197 favicon/legacy/seed, #201
  strict snds merge), each reviewed by GLM 5.3 and left open. New
  open entries take the next free IDs (B-62+, P-25+, U-30+); dropped
  claims are under "Refuted or dropped in the twelfth-pass review".
  Swift behavior code-verified only, as before.
- Fourteenth pass (full-repo review at `62b8572`, 2026-09-24): eleven
  dimension reviewers (fish simulation, tank page, add-on import,
  sound, client windows, visuals and CRT, performance, macOS shell,
  AquaZone fidelity, delight, tooling/tests/docs) plus three backlog
  auditors; a skeptical verifier re-ran or re-read every finding and
  kept only confirmed and corrected ones. Runtime checks used a
  Playwright harness serving a frozen build against archive.org with a
  stocked starter tank, headless node drivers over millions of ticks,
  and real packs downloaded and decoded; vitest 471 tests green at
  baseline. The 148 verified findings became `tmp.md`; the audit
  re-checked every open entry and FOLLOW-UPS.md's 20 follow-ups
  (fixed on main: B-38, V-08, S-01, S-06, T-27, F-22 and D-01's core;
  overturned: U-14 back to partial, T-26 back to open). Sixteen PRs
  (#208 to #242), each reviewed by GLM 5.3 to steady state and left
  open. New IDs start at B-65, P-28, V-29, U-32, A-08, F-34, D-35 and
  T-34 (those a PR implements went straight to Completed); dropped
  claims are under "Refuted or dropped in the fourteenth-pass review".
  PR #229 (open) makes CI's macOS job launch the app
  (`--smoke-test`); other Swift behavior is code-verified only, as
  before.
- Sixteenth pass (full-repo review at `06f7935`, 2026-09-25): written
  from scratch against a tree that had moved ~70 commits past its
  first draft. `npm ci` clean (0 advisories), `npm run typecheck`
  clean, vitest **53 files / 691 tests** green (692 with PR #263's new
  gradient test), `python3 -m unittest discover -s tools/tests` 78
  green, `node scripts/check-version.mjs` agrees on 0.3.0. Runtime
  checks drove the real pages in headless Chromium at 1280x900 (2x
  DPR) and at the native 565x520 window size, with and without
  `--disable-webgl --disable-3d-apis`, measuring element rects rather
  than eyeballing screenshots. Findings became `tmp.md` (folded in
  here), then three PRs: #263 (P-24's gradient and Date, red→green
  test), #265 (S-07's terminal catch plus the Overview repaint, test
  impractical — verification procedure in the PR), #272 (U-13 and
  A-07, measured in the browser before and after). New open entries
  take the next free IDs (V-38, U-40); everything else maps to
  existing entries. Roughly 25 of the first draft's findings had
  already landed on main during the pass and were dropped rather than
  re-filed; the list is preserved at the end of the sixteenth-pass
  Completed section below. Swift behavior code-verified only, as
  before.

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
U-25+, F-31+, D-22+, T-30+); later passes continue each prefix
(eleventh: B-56+, P-24, V-26+; twelfth: B-62+, P-25+, U-30+;
thirteenth: P-27, V-28, D-32 to D-34; fourteenth: B-65+, P-28+, V-29+,
U-32+, A-08+, F-34+, D-35+, T-34+). Items
with a "remainder" in their title keep their ID and list only what
is still open.

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
| Empty-tank save repopulated (reproduced) | verified fixed on main (twelfth pass) |
| Emitter scenery PNGs can't be loaded | B-54 |
| Persisted data needs a validated schema boundary | S-07 (with the now-closed B-16) |
| Pack-owned fish inherit unrelated art (B08) | B-14 |
| Removal undone by in-flight restore work | B-38 (with B-37) |
| Local drops trail archive imports | B-13 |
| Sound persistence can lose data | B-39 (miss-vs-failure closed by PR #201) |
| `tools/fetch.py` deletes output before conversion succeeds | T-19 |
| Remaining decoder resource budgets (B04) | S-02, S-03, S-04, S-05, S-06, T-20 |
| Bus messages and multiple browser tanks (B14) | B-34, T-18 |
| Stats mixes histories across tank restarts | B-55 |
| Hoist per-frame string allocations | P-19 |
| State push cadence; four windows hello-poll | P-06 |
| `swimCanvas` cache unbounded; idle pre-rasterization | P-16 |
| IndexedDB thumbs vs installed packs | B-30 |
| Sim O(F·P), pellet cap, overfeeding | P-20, U-01 (cap and waste landed in PR #189) |
| `saveTank` writes when clean | closed by PR #230 |
| Drop path reads every file twice | B-47 |
| Bounded thumbnail memory; cache eviction metrics | closed by PRs #196, #205 |
| Native `frames.save` per resize tick | P-22 |
| `startAmbient()` overlap | B-40, T-17 |
| Optional `fitBackdrop` helper extraction | T-31 |
| Whole JPN collection zip downloaded to list | closed by PR #240 |
| Pack decode on the main thread (Worker) | P-08 |
| Bound live memory, not just IndexedDB bytes | closed by PRs #196, #205 |
| Render catalogue sections as they settle | closed by PR #240 |
| Fish info card `FsTH` names; fish rename | F-02 |
| Lifecycle stage 1; death and hunger consequences; sickness | F-12 |
| Lighting dimmer | F-31 (real-clock sync done in PR #155) |
| More foods | F-06 |
| Starter reef bundle, first-run card | closed by PR #160 (see ninth pass) |
| Overview actions; click a fish to select; sort persistence | U-25 |
| Save slots / tank profiles | F-26 |
| About box | A-04 |
| Favicon | closed by PRs #179 (metadata) and #197 (favicon) |
| Decor count / quantity | B-21 |
| Sound browser for game SFX | F-05 (F-22 closed in the fourteenth pass) |
| Machine case thumbnails in the prefs list | U-26 |
| Specimen library; specimen cards | F-32 |
| Offline sim catch-up | F-09 |
| Empty-state first-run tour; first-run pack guidance | U-02 (remainder) |
| Water chemistry UI | F-15 |
| In-app help; keyboard help overlay; Balloon Help | A-05 |
| Per-species swim params (`FsTI`) | F-33 |
| Backdrop/gravel chooser | B-20 |
| Multi-sheet growth stages | F-11 |
| Scene life (plant sway, godrays, caustics, shadows, crumbs) | V-20 (godrays/caustics #158, sway #238) |
| Moonlight leftovers (sparkles, darker sleepers) | D-01 |
| Gravel finish | V-04 |
| Placeholder thumbnail | U-02 (remainder) |
| Bubble size range | closed by PR #158 |
| `cursor: grab` in plain browsers | U-03 |
| `prefers-reduced-motion` across the CRT | U-20 |
| Eat gulp sound | closed by PR #192 (stereo pan + eat lookup) |
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
| Import flow progress, parallel installs, badges | U-24 (P-07 closed by PR #200) |
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
| Feed-key plop before unlock | B-17 (queue burst closed by PR #185) |
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

Fourteenth-pass review IDs (`tmp.md`) and where they went; a PR
number marks the review PR that implements the finding:

- Fish simulation: SIM-01 B-65 PR #215, SIM-02 B-67 PR #213, SIM-03 B-66 PR #214, SIM-04 F-10, SIM-05 D-01, SIM-06 D-03, SIM-07 D-35, SIM-08 B-69 PR #223, SIM-09 D-02 PR #215, SIM-10 D-36, SIM-11 T-34, SIM-12 V-06.
- Tank page: TANK-01 B-68 PR #241, TANK-02 U-32 PR #220, TANK-03 U-14, TANK-04 U-01, TANK-05 U-03, TANK-06 B-69 PR #223, TANK-07 B-70, TANK-08 V-29, TANK-09 B-37, TANK-10 B-34, TANK-11 A-05, TANK-12 B-14, TANK-13 B-71, TANK-14 U-27, TANK-15 A-05, TANK-16 D-09, TANK-17 F-02, TANK-18 U-14.
- Add-on import: IMPORT-01 B-04 PR #218, IMPORT-02 F-24 PR #208, IMPORT-03 B-44, IMPORT-04 B-13, IMPORT-05 B-72, IMPORT-06 B-11, IMPORT-07 B-30, IMPORT-08 B-12, IMPORT-09 F-34, IMPORT-10 F-18, IMPORT-11 S-05 PR #210, IMPORT-12 B-18.
- Sound: AUDIO-01 B-18, AUDIO-02 U-34, AUDIO-03 F-35, AUDIO-04 B-73, AUDIO-05 U-35, AUDIO-06 P-28, AUDIO-07 U-33, AUDIO-08 D-37, AUDIO-09 F-36, AUDIO-10 F-05.
- Client windows: UI-01 V-30 PR #225, UI-02 V-31 PR #225, UI-03 U-04, UI-04 B-74, UI-05 B-37, UI-06 B-43, UI-07 U-06, UI-08 U-14, UI-09 U-27, UI-10 U-08, UI-11 V-09, UI-12 U-07, UI-13 U-02, UI-14 U-13, UI-15 V-32, UI-16 U-36, UI-17 P-06, UI-18 U-37, UI-19 F-05, UI-20 D-38.
- Visuals and CRT: VISUAL-01 V-33, VISUAL-02 V-34, VISUAL-03 B-35, VISUAL-04 U-14, VISUAL-05 U-38, VISUAL-06 A-08, VISUAL-07 A-02, VISUAL-08 A-09, VISUAL-09 F-10, VISUAL-10 A-11, VISUAL-11 A-10, VISUAL-12 A-12, VISUAL-13 V-35, VISUAL-14 P-11.
- Performance: PERF-01 P-02 PR #226, PERF-02 P-01, PERF-03 P-28, PERF-04 P-29, PERF-05 P-10, PERF-06 B-36, PERF-07 P-17.
- macOS shell: MACOS-01 B-75 PR #229, MACOS-02 T-35 PR #229, MACOS-03 B-76, MACOS-04 V-36, MACOS-05 U-18, MACOS-06 B-25, MACOS-07 B-28, MACOS-09 B-50, MACOS-10 V-37.
- AquaZone fidelity: FIDELITY-01 F-10, FIDELITY-02 F-14, FIDELITY-03 F-37 PR #212, FIDELITY-04 U-39, FIDELITY-05 U-03, FIDELITY-06 B-13 PR #239, FIDELITY-07 F-24 PR #208, FIDELITY-08 F-34, FIDELITY-09 F-02, FIDELITY-10 F-01, FIDELITY-11 F-09, FIDELITY-12 D-39, FIDELITY-13 F-26, FIDELITY-14 T-36, FIDELITY-15 F-17, FIDELITY-16 F-38, FIDELITY-17 U-15.
- Delight: DELIGHT-01 D-40 PR #242, DELIGHT-02 D-41 PR #211, DELIGHT-03 F-37 PR #212, DELIGHT-04 D-42, DELIGHT-05 D-36, DELIGHT-06 F-38, DELIGHT-07 D-24, DELIGHT-08 D-39, DELIGHT-09 F-39, DELIGHT-10 D-43, DELIGHT-11 V-23, DELIGHT-12 F-40, DELIGHT-13 A-13, DELIGHT-14 D-44, DELIGHT-15 U-39, DELIGHT-16 D-45, DELIGHT-17 F-41, DELIGHT-18 F-42, DELIGHT-19 D-09, DELIGHT-20 D-46, DELIGHT-21 U-03.
- Tooling, tests and docs: TOOLING-01 S-05 PR #210, TOOLING-02 T-06, TOOLING-03 T-06, TOOLING-04 T-37, TOOLING-05 T-38, TOOLING-06 T-28, TOOLING-07 T-39 PR #210, TOOLING-08 T-21.

Sixteenth-pass review IDs (`tmp.md`, folded in at `06f7935`) and
where they went; a PR number marks the review PR that implements the
finding:

- Reliability: R-1 S-07 PR #265, R-2 (new; Completed as part of PR
  #265), R-3 B-46 (same fix, note appended), R-4 (process note only —
  a second agent's branch overlaps R-2; drop it from #265 if that one
  merges first).
- Performance: P-1 P-24 PR #263, P-2 P-24 (landed upstream during the
  pass in `f79cba9`/`004030c`, not in any PR of this pass), P-3 P-24
  PR #263, P-4 P-18, P-5 P-24/P-27.
- Visual: V-1 U-13 (UI-14) PR #272, V-2 A-07 PR #272, V-3 V-38.
- UX: U-1 U-40, U-2 B-46, U-3 (declined, low value against stealing
  arrow keys from sliders).
- Tooling: T-1 T-06/T-08 (the gradient test went in `water.ts`, which
  is covered; `main.ts` remains uncovered), T-2 T-13 (already filed,
  nothing added), T-3 A-07's note (`web/osmium.css` is a build
  artifact).

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

### Completed (tenth pass, PRs open for review, all at steady state)

Tenth-pass baseline `62b8572`. Each PR is one branch cut from
`origin/main`, left open for the maintainer. Round counts and declines
are in the tenth-pass review-response log.

- **PR #179** (`audit/page-metadata`): every page names a viewport,
  description, theme-color and color-scheme, carries a noscript note,
  and the tank page carries basic Open Graph tags. Only the tank page
  had a viewport: V-19 treated the client-page viewports as done via
  PRs #90/#93, but `62b8572` has none on the four client pages (the
  consolidation did not carry them), so this re-lands that half of
  V-19; the favicon half stays open. Round 1 applied: noscript blocks
  hide their page's empty window chrome, `color-scheme` light on the
  platinum pages (dark on the tank page), OG tags on index. Round 2
  clean; og:image deferred (no canonical domain or promo asset).
- **PR #180** (`audit/prefs-off-caption`): pointing at a Monitor or
  Picture slider while the CRT effect is off showed its value as if it
  applied, although the sliders dim. Tube sliders now fall back to the
  pane's off hint through pure `tubeCaption` (`web/caption.ts` +
  `web/caption.test.ts`). Round 1 applied: one hoisted PANES lookup
  shared by both hint paths (verified only Monitor/Picture mount key
  sliders, both define offHint, `syncEnabled` dims exactly those
  inputs), truthy off-hint check with an empty-hint test; the hint
  discriminant and Sound/Lighting extension declined with reasons
  (single caller; muted-volume and disabled-timer values persist and
  reapply, while CRT-off slider values are inert). Round 2 clean; the
  Record-keyed lookup deferred (the suggested cast verifies nothing).
- **PR #182** (`audit/tank-milestones`): D-22's anniversary line.
  `milestone()` in `web/statsmodel.ts` names the highest tank-time
  anniversary reached (first hour, full day, week, month or more),
  wired through `deriveStats` and rendered as a Diary row in
  `web/stats.ts` only once earned, with boundary and wiring tests.
  Round 1 applied: hoisted `uptimeMin`, month tier reworded for older
  tanks. Round 2 clean; pinning the "or more" wording in the test
  deferred (one line in `web/statsmodel.test.ts`).

Tenth-pass top picks, with status: viewport/client metadata (PR #179),
Prefs off-caption (PR #180), Diary anniversaries (PR #182, D-22 part);
still open and highest value per risk: B-04 pack identity, S-07 schema
boundary, F-01 resource map.

### Completed (eleventh pass, PRs open for review, all at steady state)

Eleventh-pass baseline `f777fa8`. Each PR is one branch cut from
`origin/main`, left open for the maintainer. Round counts and declines
are in the eleventh-pass review-response log.

- **PR #181** (`fix/tap-song-hijack`): a song called Centerfold
  answered every center glass tap: `find()` matched substrings and
  imported sounds outrank bundled ones in that pass. Substring matching
  is now whole-word (`words()` in `web/audio.ts`: "CENTER*" and
  "bubble pop" still hit, "Centerfold" stays silent), with regression
  tests for tap-with-song-plus-game-set and tap-with-song-only. Round
  1 applied: the single-word-sub contract documented on `find()`.
  Round 2 clean. Lands the word-splitting half of B-19's Change (which
  named it as the alternative); the `kind: effect | music` split
  stays open.
- **PR #183** (`fix/loop-hour-guards`): `planFrame` looped forever on a
  non-positive or NaN step and let NaN poison the accumulator (the new
  test hung the suite until the fix); `hourLabel` printed "8.5:00" and
  "NaN:00". Guards plus a per-frame tick cap (one frame's steps, at
  most `ABSOLUTE_MAX_TICKS` iterations, excess dropped like a stall),
  with regression tests. Rounds applied: non-finite-dt and dropped-dt
  docs, the finite-but-huge acc / near-zero step cap, and the exact
  tiny-step pin (`{ ticks: ABSOLUTE_MAX_TICKS, acc: 0 }`). Round 3
  clean. No existing entry; the hang was unreachable from today's
  callers (constant step, bounded acc) but the guard is cheap.
- **PR #184** (`fix/small-css-nits`): neutral cursor on the tank canvas
  (a click feeds or taps, never drags; the feed zone keeps its inline
  crosshair), a wrapping fish-tip balloon (`max-width: 220px`,
  cooperating with the JS clamp, which already reads both axes after
  setting text), and document windows that shrink (`max-width:
  calc(100vw - 24px)`, covering a classic scrollbar) instead of
  clipping. Round 1 applied: 16px margin widened to 24px; the tooltip
  vertical-clamp info verified against `web/main.ts` with no change.
  Round 2 clean. Narrows U-03's cursor complaint and U-27's clipping;
  the finfo-under-glass stacking stays open (V-26).

Eleventh-pass top picks, with status: tap word matching (PR #181),
frame-pacing guards (PR #183), tank CSS nits (PR #184); still open
and highest value per risk: B-04 pack identity, S-07 schema boundary,
F-01 resource map, plus new shovel-ready entries B-56 through B-61,
P-24, V-26 and V-27 below.

### Completed (twelfth pass, PRs open for review)

Twelfth-pass baseline `62b8572` (work branched before the tenth- and
eleventh-pass folds landed; the doc is folded on top of `8afbaaa`).
Each PR is one branch cut from `origin/main`, left open for the
maintainer. Round counts and declines are in the twelfth-pass
review-response log.

- **PR #185** (`devin/audio-fixes`, B-17, B-19 part): while the
  AudioContext is suspended `play()` drops one-shots unless a user
  gesture is active (`navigator.userActivation`), so bubbles spawned
  from `tickSim` no longer queue a burst on the first click; a single
  `requestResume()` serializes resume attempts and restarts the
  ambient on `statechange`. Event lookups (tap/feed/splash/…) reject
  buffers longer than `EVENT_MAX_S` = 20 s, so a dropped song can't
  answer glass knocks on either find() pass. Round 1 declined:
  explicit `vi.unstubAllGlobals()` in one test — the file's
  `afterEach` already unstubs every global.
- **PR #186** (`devin/client-drop-guard`, B-25 web half):
  `dragover`/`drop` `preventDefault` on prefs, overview and stats so
  a dropped file can't navigate those windows; `dropEffect: 'none'`
  for file drags (round 1). The preventDefault stays unconditional —
  WebKit also navigates on dropped text and URLs.
- **PR #187** (`devin/fetch-py-fixes`, T-21, T-22, T-23): raw module
  docstring (SyntaxWarning gone), `.fd` food extension plus `.dna`,
  and `_entry_name()` reconstructs raw name bytes (CP437) for
  unflagged entries and tries UTF-8 then Shift-JIS before falling
  back to `zi.filename`; backslashes normalize only after decoding
  (a SJIS trail byte can be 0x5C). Rounds applied: NUL truncation —
  on the raw bytes, so bytes past a NUL can't fail the surviving
  prefix — plus an explicit unflagged-name assertion and a `with`
  block on the flag-check ZipFile.
- **PR #189** (`devin/food-cap`, U-01): `MAX_UNEATEN` = 6 uneaten
  pellets, `dropFood(x)` returns `Food | null`, a refusal alert
  throttled to once a minute, `WASTE_PER_TICK` = 1/10000, and
  delayed pinch pellets are skipped while paused (N-1). Rounds
  applied: the cap comment corrected (six pellets still out-foul the
  filter); the throttle seeded `-Infinity` — `performance.now()`
  counts from page load, so `0` suppressed the first alert for 60 s.
- **PR #192** (`devin/stereo-sound`, D-08): StereoPanner pans taps,
  splashes, bubbles and feed by tank x (`panFor` clamps to +/-0.8),
  bubble playbackRate varies 0.94-1.06, and an `eat()` lookup plays a
  gulp for packs that ship one. Round applied: feed pans to the
  clamped `pellet.x`, not the requested x.
- **PR #197** (`devin/small-ui`, V-19 favicon half, B-44 UI half,
  B-51): a 32x32 favicon rendered from `ICON_MACHINE` linked on all
  five pages and packed by the native Makefile; `isLegacyPack()`
  recognizes the `0x00250022` accessory signature, so legacy-only
  downloads fail as "unreadable legacy pack" → "Finsical can't read
  this add-on yet." with dimmed `.irow.unusable` rows and no Try
  Again, while mixed zips still install their readable packs; the
  sim seed is `crypto.getRandomValues` per launch instead of the
  fixed `0x9003`. Round applied: the status line reuses
  `loadProblem` instead of a duplicated literal.
- **PR #201** (`devin/snds-merge-strict`, B-39 main case):
  `rwStrict()` resolves null on a real miss but rejects on a backend
  failure; `sndsMerge`/`sndsRemove` run through it via the pure
  `sndsMergeInto(get, put, records)`, so a failed read can no longer
  overwrite the whole sound store with only the incoming records and
  a failed write no longer posts `soundsLoaded`. Cache paths keep
  the lenient `rw()`. Round applied: `sndsPut` resolves an explicit
  `true` rather than the put key.

Verified against `62b8572` without new code: **B-16** is already
fixed on main (`keepEmpty` at `web/main.ts:214` — an empty v2 roster
loads no fish); **B-13** is substantially fixed by `web/drop.ts`
(every dropped pack imports, fish packs no longer hijack the
backdrop) — its remainders are noted in the entry.

Twelfth-pass top picks, with status: audio unlock + event caps
(PR #185), food cap and waste (PR #189), fetch.py encoding fixes
(PR #187); still open and highest value per risk: B-04 pack identity,
S-07 schema boundary, F-01 resource map, B-14/B-15 binding
(unchanged from the eleventh pass), plus new entries B-62 through
B-64, P-25, P-26, U-30 and U-31 below.

### Completed (thirteenth pass, PRs open for review)

Thirteenth-pass baseline `e9360a8` on `origin/main`. A continuation
of the twelfth-pass review: the tmp.md findings were implemented in
one focused branch per idea, each left open for the maintainer.
Round outcomes are summarized per PR; GLM review rounds are in the
PR threads. Reviewer-integration failures (Z.ai HTTP 429) hit #233,
#235 and #237 — those gaps are noted, not counted as clean rounds.

- **PR #188** (`fix/audio-queue-burst`, B-17 remainder, B-19 part):
  `find()` iterates needles outermost so caller-specified priority is
  honored — the enumeration test caught splash playing `Drop` because
  it was inserted first; suspended-context one-shots dropped on top
  of #185's guard.
- **PR #190** (`fix/feeding-polish`): feeding polish round.
- **PR #191** (`fix/per-launch-seed`, B-51): per-launch sim seed —
  reconcile with #197's identical change before merging either.
- **PR #193** (`fix/fish-identity`, B-14/B-15/B-46, B-04 partial):
  fish bind to their pack's entry, not a pack-level slot; launch
  restores record the binding so remap can't orphan it.
- **PR #194** (`fix/housekeeping`): small cleanups.
- **PR #195** (`fix/client-windows`, B-55, U-11, U-12): stats history
  keyed to boot, overview re-sort only on key-set change, persistent
  "waiting for the tank" state.
- **PR #196** (`perf/import-cache-lru`, P-01 part): bounded the
  import-side caches; superseded in spirit by #205 — merge one.
- **PR #198** (`ux/overview-delete-confirm`, U-04 part): remove
  asks for confirmation.
- **PR #199** (`fix/import-ux`, U-07, U-08, U-09/N-06, B-44 part,
  U-22): double-click installs, alphabetical sections, friendly
  `loadProblem` errors over the bus, no Try Again on deterministic
  decode failures, `storage.persist()` deferred to first write.
- **PR #200** (`perf/parallel-restore`, P-07): restore downloads run
  with bounded concurrency before ordered apply.
- **PR #202** (`fix/decompression-fallback`, B-29): fflate inflate
  when `DecompressionStream` is missing (WebKit < 16.4).
- **PR #203** (`fix/import-honesty`, B-11, B-12): per-section
  `usablePacks` — a pack that can put nothing in the tank fails the
  install instead of reporting success; gravel strips count as
  backdrops where `pickBackdrop` consumes them.
- **PR #204** (`feat/cat-paw`, N-18): the cat paw bats at the glass.
- **PR #205** (`perf/state-and-cache`, P-01, P-06, P-12, P-16):
  16-entry LRU for decoded packs, coalesced `postState` with a
  rate-limited hello response, `indexedPixels` Uint32 palette LUT,
  numeric swim-cache keys.
- **PR #206** (`feat/lifecycle`, F-16 part): sick, dead and born
  states.
- **PR #207** (`fix/crt-shader`, V-14): phase-continuous uniforms
  replace the 100 s `uTime` wrap; `highp` with a
  `GL_FRAGMENT_PRECISION_HIGH` fallback.
- **PR #209** (`fix/tank-polish`, U-01, V-21, V-04, U-15): food cap
  with a shared refusal blip, a gulp bubble at the eat point, drawn
  gravel capped near the sim floor, `contextmenu` suppressed on all
  five borderless pages.
- **PR #216** (`feat/dinner-bell`): a bell rings when fish start
  begging.
- **PR #217** (`feat/zen-mode`): every chrome piece hidden.
- **PR #219** (`feat/stats-copy`): Copy Summary button.
- **PR #221** (`fix/sound-manifest`, N-05, B-40): pack manifests merge
  instead of wiping the sound table; the ambient loop restarts only
  when the winning pick's name+duration+content probe changes, not on
  identical re-decodes.
- **PR #222** (`fix/import-guards`, N-07, N-08): zip entry names are
  minimally percent-encoded (`%`/`#` only — full encodeURIComponent
  would change identity for the JPN names and duplicate installs);
  dropped-folder audio is capped.
- **PR #224** (`fix/decor-copies`, B-21): decor copy counts persist on
  the Importable record and replay on restore.
- **PR #227** (`feat/crt-degauss`): degauss wobble + power-off
  collapse.
- **PR #228** (`feat/auto-feeder`, F-07 part): the original's timed
  feeder.
- **PR #230** (`perf/save-cadence`, P-21): state pushes stay frequent,
  localStorage writes drop to a slower cadence.
- **PR #231** (`ux/quota-message`): one warning when a dropped pack
  can't persist.
- **PR #232** (`feat/snail`): a rare snail creeps the gravel.
- **PR #233** (`fix/multi-tab-guard`, B-34): a localStorage lease
  picks one tank owner; a tab that loses the race — or loses the
  lease mid-session — goes read-only with an alert; bfcache restores
  re-claim.
- **PR #234** (`fix/shell-polish`, B-28, B-49, B-50, V-16, U-18/N-09):
  per-webview crash throttling with a delayed reload, resized frames
  clamped onto the visible screen, a minimum-visible-area restore,
  `invalidateShadow` on mask changes, and a narrower DragStrip on the
  bare tank. P-22 investigated and declined: `UserDefaults.set` is
  in-memory — there is no synchronous plist write to debounce.
- **PR #235** (`fix/interaction-guards`, N-10, N-03): the menu's Feed
  checks the modal alert; a queued Add-Again identity-checks the
  in-flight slot so it can't clobber a newer install's registration.
- **PR #236** (`fix/case-drag-cursor`, B-48): the grabbing cursor is a
  JS-tracked class cleared on pointerup/cancel, blur, focus and
  buttonless motion — the page never sees the native drag's mouseup.
- **PR #237** (`fix/integer-scale`, V-03): device-pixel-snapped
  integer upscales, pixelated above 1x and smooth below, raster
  centered on the device grid; `#screen` takes `touch-action: none`
  so letterbox-margin gestures stay covered.
- **PR #238** (`feat/plant-sway`, V-20 part): plants sway.
- **PR #240** (`feat/progressive-listing`, P-05): `listAddons` takes
  an `onItems` callback per landed collection; the panel merges
  incrementally under a generation token while the final list keeps
  canonical collection order. Callback throws are isolated from both
  the fetch catch and `Promise.all`.
- **PR #243** (`feat/pointer-crowd`, D-02): up to `NOTICE_CAP` = 4
  calm fish gather at the pointer on rank-staggered rings; the clamp
  is per-rank so capped watchers can't stack; `noticeFish` stays as
  the senior-watcher getter.
- **PR #244** (`feat/drag-affordance`, U-10): a depth-counted
  `body.dragging` class draws a dashed "Drop to add" frame over
  `#screen`; the reset runs on the capture phase so a descendant's
  `stopPropagation` can't strand it. Review refuted: `#screen` is a
  plain div, `::after` renders.
- **PR #245** (`feat/overview-focus`, U-25 part): the Overview's
  selection posts `focusFish`, the tank draws a marching-ants marquee
  that freezes under reduced motion, clears on a missing fish, and
  lapses after ~40 s of sim silence — BroadcastChannel has no
  disconnect and bfcache eviction fires no pagehide, so the overview
  re-asserts on a heartbeat.
- **PR #246** (`fix/favicon`, V-19 part): favicon on every window
  page — overlaps #197's favicon half; merge one.
- **PR #247** (`feat/plant-bubbles`, N-14): plants leak a thin bubble
  stream in daylight through `Sim.spawnBubble`; a shared
  `decorAnchor` + `DECOR_FLOOR` keep emitter geometry in lockstep
  with the renderer.
- **PR #248** (`feat/bubble-pop`, N-13): a tap pops the nearest rising
  bubble inside its drawn radius (`tapBubble` lives in water.ts with
  the footprint) and leaves the same ring the waterline draws.
  Overlaps claude/#211 — pick one.
- **PR #249** (`feat/standin-label`, U-02 part): starter placeholders
  carry `standIn: true` and read "Species (stand-in)".
- **PR #250** (`ux/sound-drop-hint`): the sounds pane hint mentions
  plain audio drops.
- **PR #251** (`feat/scold-pref`): Tank-menu toggle for the
  don't-tap sign.
- **PR #252** (`ux/feed-hint`): feeding affordance cue.

Declined this pass and recorded: P-22 (no synchronous plist write
exists), the #209 edit-menu concern (no editable field exists on any
of the five pages — the range slider has no edit menu), the #199
`transientFailure` regex change (the suggested alternation would
break real abort detection; no tank-raised message matches today),
the #224 decor-frame non-uniformity worry (frames in one pick are
same-size by construction; comment strengthened instead), and
palette `& 255` masking in #205 (every palette producer is
byte-sourced — unreachable). The #245 bfcache-eviction gap was fixed
with the heartbeat lease rather than bus disconnect tracking.

New open entries this pass: P-27, V-28, D-32, D-33, D-34. N-11 and
N-12 became P-27 and V-28; N-15, N-17 and N-19 became D-32, D-33 and
D-34; N-16 folded into D-10 and N-20 into V-23; the rest of the N-*
list was implemented above. N-09 was a duplicate of U-18.

### Completed (fourteenth pass, PRs open for review)

Fourteenth-pass baseline `62b8572` (code), folded on top of `e9360a8`.
Each PR is one branch cut from `origin/main`, left open for the
maintainer; none is merged. Review IDs in parentheses (SIM-01, ...)
are the pass's `tmp.md` IDs. Round counts and declines are in the
fourteenth-pass review-response log.

- **PR #208** (`claude/mekasia-sections`, F-24; IMPORT-02 and
  FIDELITY-07): each Mekasia collection takes only its own pack
  extension, so mekaccs.zip's `G_Debris.grv` lists as gravel instead
  of an accessory that dropped a textured block into the tank; a new
  gravel collection covers it. `sceneryFix()` moves saved scenery
  records whose extension names another section at load, so existing
  tanks heal. Rounds applied: uppercase-extension and plant-record
  tests; the extension table became a `Map`, because an object
  literal let a URL ending in `.constructor` save
  `Object.prototype.constructor` as the section.
- **PR #210** (`claude/sound-bank-caps`, S-05 sound part, T-39;
  IMPORT-11, TOOLING-01, TOOLING-07): `bankSounds` and `sndResources`
  read only the first `'snd '` type entry, skip repeated payload
  offsets and stop at `MAX_FILE_SOUNDS` = 1024, so a small crafted bank
  can no longer freeze the tank and leave thousands of records that
  return every launch; `qualifySoundNames` is linear. The Python
  `rsrc.py` mirrors the caps (`MAX_RESOURCES`) and bounds checks.
  Pinning tests cover the resource attribute byte and the Shift_JIS
  name fallback that mutation testing found unpinned. Rounds applied:
  Python ref-list and payload bounds with tests, a 3 s timing bound,
  a whole-list assertion.
- **PR #211** (`claude/pop-bubbles`, D-41; DELIGHT-02): clicking a
  rising bubble in the water pops it (`bubbleAt`, `BUBBLE_HIT_R`,
  `Sim.popBubble`) with a small ring and a synthesized sine plip
  (700 to 1600 Hz over 60 ms), or a user sound with "pop" in its
  name, gated by Bubble sounds; the test sits in the water branch so
  feed clicks near a bubble still feed. Rounds applied: a gating test
  for the user "Pop!" sound, one `feeding` local, and a Bubble sounds
  blurb that names both added sounds (the reviewer's wording, which
  said the plip needs an added sound, was corrected).
- **PR #212** (`claude/fish-names`, F-37; FIDELITY-03 and DELIGHT-03):
  AquaZone's Options > Names. The N key, Tank > Show/Hide Fish Names
  in the browser menu bar and a native Tank > Fish Names item tag
  every fish at once with a small balloon label that follows it
  (`web/nametags.ts`: `tagPlacement`, `mountNameTags`; `tankMap` in
  `web/feedzone.ts`), persisted in `finsical:names`. It is also the
  only way to tell fish apart on touch; the hover tip stays hidden
  while the tags show. GLM failed twice on the first commit, then
  reviewed `726e2ab` with nothing valid (one Major refuted); CI green.
- **PR #213** (`claude/food-roll-cost`, B-67; SIM-02): `nearestFood`
  adds `ROLL_COST` = 32 px for a pellet behind a seeking fish, so a
  hungry fish between two pellets commits to one instead of rolling
  back and forth for up to a minute while both rot. Round applied:
  `sqrt` instead of `hypot`, and a failure message naming the eaten
  flags.
- **PR #214** (`claude/staggered-sleep`, B-66; SIM-03): `darkTicks`
  and `brightTicks` counters replace the `seenDay` latch, with a
  per-fish bedtime (`BEDTIME_MIN` 60 + up to `BEDTIME_SPREAD` 600
  ticks) and lie-in (`LIE_IN_MIN` 20 + up to `LIE_IN_SPREAD` 300) from
  `mix32(f.id + 1)`. Fish now sleep in a tank opened after dark or
  with the lamp saved off, and no longer all sleep and wake on one
  tick. Round applied: the constants are exported and the tests
  derive their waits; a comment explains the `+ 1`.
- **PR #215** (`claude/watcher-hover`, B-65 and D-02's fade; SIM-01,
  SIM-09): the fish that notices the pointer hovers with its nose
  `NOSE_GAP` (6 px) short of it (with `HOVER_SLACK` 8 px of
  hysteresis), holds level while settling to its height at up to
  `HOVER_RISE` 0.3 px a tick, faces it with at most one roll and glides clear
  of a pointer resting on its body; curiosity fades after
  `NOTICE_FADE_TICKS` = 600 of a still pointer and returns when it
  moves 3 px (`web/curiosity.ts`). Measured: pointer on the body
  40% to 0%, heading zigzags 20% to 0, rolls 6 per minute to 0,
  facing the pointer 100%. Round applied: a watcher covered at the
  glass used to fin there at cruise / 3 for as long as the pointer
  stayed; it now clears by the room each way needs, and a fish too
  big to clear either way holds still.
- **PR #218** (`claude/pack-parts`, B-04; IMPORT-01): `PackResult.entry`
  and `Fish.packPart`; `sheetByPack` is `Map<url, Map<part, slot>>`
  and `packBySheet` maps a slot to `{url, part}`. Fish of multi-pack
  add-ons are named after their own pack (`partName`), keep it across
  relaunches, and legacy collapsed rosters are repaired by
  `migrateParts` (`web/tankmodel.ts`). A multi-pack add-on is refused
  as a whole when its fish don't fit (`fishRefusal(section, fish)`).
  Verified in Chromium: fresh installs keep their parts and a legacy
  save from main is repaired. Rounds applied: `handleSheets` names
  fish itself and aliases the add-on name to its first pack;
  `reconcileFish` takes a part only from its own add-on's slot; the
  part count is `partCount`.
  Overlaps PR #193 (thirteenth pass, open), which binds launch
  restores per pack entry; reconcile the two before merging either
  (the thirteenth-pass note on the now-removed B-04).
- **PR #220** (`claude/client-popups`, U-32; TANK-02): in a browser,
  Preferences, Tank Overview, Tank Stats and Import Add-ons open as
  small popup windows sized per page (`clientWindowFeatures`,
  `CLIENT_SIZES`, `POPUP_CHROME` 40) instead of full tabs that hid
  and froze the tank. Rounds applied: the title-bar clamp, a
  `ClientPage` union, an oversize-screen test and a Safari note.
- **PR #223** (`claude/paused-taps`, B-69; TANK-06 and SIM-08): on a
  paused tank a click in the water knocks without startling fish or
  raising the glass-tap alert (`clickAction(y, paused)` returns feed,
  tap or knock), and ripples, splashes and the surface keep playing
  out on the frame clock (`tickFx`, `fxAlive`, `surfaceAtRest`)
  instead of freezing. Round applied: SURFACE-relative test rows.
- **PR #225** (`claude/prefs-fit`, V-30 and V-31; UI-01, UI-02): the
  Picture and Monitor panes fit above the caption again (group gaps
  30 to 18 px and 24 to 16 px) and the Machine list shows whole case
  names ("Performa 450", with an ellipsis for any future overflow).
- **PR #226** (`claude/fast-decode`, P-02's first slice; PERF-01):
  `decodePixels` keeps the column and row as counters instead of a
  per-pixel closure, skips runs of colour 0 (the output starts
  zeroed) and checks a copy's stream end once per record. On gup1's
  three packs `fshToSheets` takes 102 ms instead of 335 ms, byte for
  byte identical (seeded random-stream equivalence test).
- **PR #229** (`claude/translocated-app`, B-75 and T-35; MACOS-01,
  MACOS-02): `WebHandler.resolve` builds the file URL from the bundle
  root and the request path's components, refusing `..`, without
  standardizing either side, so the app serves its tank when run from
  App Translocation or `/private/tmp` (it served nothing before). A
  failed tank load shows "Finsical couldn't open its tank." instead of
  an invisible window, with a move-to-Applications hint when
  translocated. `--smoke-test` launches the app in CI from
  `/Applications` and from a `/private/tmp` copy: the copy failed with
  NSURLErrorDomain -1100 before the fix and passes after.
- **PR #239** (`claude/bmp-backdrop`, B-13's `.bmp` remainder;
  FIDELITY-06 phase 1): a 256-color BMP dropped on the tank, known by
  its `BM` signature rather than its extension, becomes the backdrop
  (a strip at least three times as wide as tall becomes the gravel),
  is stored under `local:<name>`, restores at every launch and lists
  in Tank Overview with Remove. 24-bit BMPs and pictures under
  `BACKDROP_MIN` (160 x 100) bring up one alert per drop instead of
  being tried as sounds and dropped with a misleading warning.
- **PR #241** (`claude/welcome-retry`, B-68; TANK-01): the first-run
  welcome lasts until it is answered. `finsical:welcomed` records
  `pending`, `retry` (set when Stock the Tank is pressed), `declined`
  or `stocked` (legacy `1` counts as answered), decided by the pure
  `welcomeOffer({answer, pristine})`. A session that ends with the
  welcome up gets it again instead of a silent AZ_WAVES download; an
  offline or interrupted stocking is offered once more ("Finsical
  couldn't finish stocking your tank. Try again?"), installs only
  what is missing, and giving up declines for good. Saved stand-ins
  rejoin `placeholderIds`; the sound backfill waits while an offer is
  due. Known gap: a tank already hit by the bug on a main build (it
  has AZ_WAVES, so it is not pristine) gets no offer.
- **PR #242** (`claude/night-torch`, D-40; DELIGHT-01): at night
  (nightness above 0.35) a mouse or pen hovering the tank lights a
  warm, soft circle (`torchShows`, `torchRadius` 24 to 40 px,
  `keepTorch` and `drawTorch` sharing one 80x80 canvas). The beam is
  added over the veil with `lighter`, at a strength that follows the
  nightness, rather than the undimmed scene copied back (that copy
  darkened the beam over dark backdrops, measured). It follows the
  pointer on a paused tank; about +0.07 ms a frame. Measured 1.96x
  under the pointer at (160,120), 1.77 to 1.81x over the darkest
  backdrop; nothing darkens. Optional follow-up left open: a sleeper
  lit for 2 s rolls away from the beam (`Sim.beam`).

Fourteenth-pass audit of the earlier Completed tables (at `62b8572`):

- Fixed on main: the B-24 overlap with closed PR #119 (superseded by
  #151: `acceptsFirstMouse`, Cmd/Ctrl-I skips the overlay natively);
  render on tick (#146's overlap; #153's `planFrame` and `frameDirty`
  gate are on main, though #146's Proxy-GL CRT tests were not carried
  over); B-32 (#148's overlap: a seeker whose pellet is gone drifts,
  `foodFor` gates on water quality); the lamp toggle (#132's overlap:
  Tank > Lamp On with Cmd-L and a checkmark, the L key); V-17's
  viewport and drop classification (ported from #93 via #162); and the
  review follow-ups "extents at bind" (#149), "Mute and CRT menu
  checkmarks" (#159; FOLLOW-UPS still notes that Mute, Lamp and CRT
  wait for the next state push) and the starter nested-collection
  test (#160).
- Obsolete: the light curve and night tint of closed PRs #109/#113
  (superseded by #155), decor Add Again replace-in-place (#99; #161
  chose copies, whose persistence is B-21), the bubble art of #108
  (superseded by #158) and #125's backdrop smoothing (cover-crop is
  on main via #87; smoothing was declined).
- Partial (overturned from fixed for #116): #116's EXIT/signal traps
  that restore bumped files when a release step fails are not on
  main (`scripts/release.sh` has no `trap`; T-10 carries it). #139's
  decor depth: decor bottoms still sit at `TANK.height - 6` rather
  than a quarter into the gravel, and no foreground decor is drawn
  after the fish (overlaps V-04 and F-04). #106's drag-to-feed waits
  for a feeding cap (see U-01, P-20). #133's Sound-pane extras: an
  ambient level slider, a Defaults that leaves Mute alone (Defaults
  still posts `muted: false`) and a "sound unavailable" note.
- Open: the #159 follow-up "Import Add-ons previews follow volume and
  mute" is now B-73.

FOLLOW-UPS.md, re-verified at `62b8572` in the fourteenth pass: all
20 review follow-ups are still open (evidence per item; "Remains" names
what is left of a partly done one):

- macOS: Mute, Lamp and CRT menu state sync: toggleCrt/toggleLights/toggleMute ignore the JS result; only togglePause syncs (`macos/Finsical.swift:561-601`).
- macOS: shared JS dispatch helper: Six copies of the dispatch; five use `webView?` and log nothing when nil (`macos/Finsical.swift:545-601`).
- macOS: Tank items enabled before `window.finsical` exists: `validateMenuItem` returns true for everything but CRT (`macos/Finsical.swift:674-693`).
- macOS: tank lacks `.participatesInCycle` on All Desktops: allSpaces branch sets `[.canJoinAllSpaces, .fullScreenAuxiliary]` (`macos/Finsical.swift:666-668`).
- Tank: use `bodySize` for sim extents and hit tests: `bindExtents` still uses the padded cell (`web/main.ts:1898-1906`).
- Tank: Preferences previews draw rectangle fish: `previewMarkup` draws 14x8 rects, no waterline or air strip (`web/machines.ts:117-123`).
- Alerts: `bindDialogKeys` has no unbind: osmium-ui v0.2.0 adds a window keydown listener with no dispose (`node_modules/osmium-ui/src/controls.ts:182`). Remains: Whole item (upstream).
- Alerts: tall alert scrolls its bevel away: `.alertwin` is still the scroll container (`web/app.css:369-373`).
- Prefs: volume slider blur clears latch without re-sync: blur sets `volDragging = false` with no `syncSound` (`web/prefs.ts:723-727`).
- Sound: install feedback cut off abruptly: `playImported` hard-stops the previous `feedbackSrc` (`web/audio.ts:271-275`).
- Sound: ambient volume slider; Defaults leaves Mute alone: No ambient slider; Defaults posts `SOUND_DEFAULTS` incl. `muted: false` (`web/prefs.ts:783-786`, `web/audio.ts:17-20`).
- Sound: game sounds with no feature: `web/audio.ts` plays only drop, intowater, changewater, switch, intowaterbig, letoutwater, taps, bubbling and aqua (`:361-431`). Remains: Event*, WashFilter, Timer*, add, set, pipopa.
- Sound: reuse `Collection.rename` for F-21: `rename` exists but only the AZ_WAVES collection uses it. Remains: With F-21.
- Sound: addWavs restarts the bubbling loop at launch: Restart rule compares AudioBuffer objects (`web/audio.ts:136-143`).
- Tooling: pack.py trailer parsing; fetch.py lacks 7z: `pack.py` byte-scans (id, sub, off, pad) records (`tools/az/pack.py:73-90`); no 7z in `tools/` (grep).
- Tests: audio.test.ts waits exactly two microtasks: Two bare `await Promise.resolve()` (`web/audio.test.ts:198-199`) though `flush` exists (`:246`).
- Tooling: check-version.mjs doesn't trim marker spaces: `find` returns the raw `([^<]*)` capture, compared untrimmed (`scripts/check-version.mjs:17-19, 26-27`).
- Tooling: rename LGPL file if REUSE is adopted: Conditional; no REUSE config; `LICENSES/LGPL-2.1.txt` unchanged. Remains: Only if REUSE is adopted.
- Docs: sparkColumns must say samples are time-ordered: Doc comment describes output order only (`web/statsmodel.ts:161-165`).
- Reconcile ANALYSIS.md with PR outcomes: ANALYSIS.md still cites merged or closed PRs as open (e.g. U-14 #102, U-07 #136, F-22). Remains: This audit is the input.

Verified against `62b8572` without new code (fourteenth-pass audit;
details in each section's "Done" line): B-38 (restore re-checks
`wanted` before fetching and before applying), V-08, S-01, S-06, T-27
and F-22 are fixed on main, and D-01's sleep state landed (its polish
is a remainder). Twelfth-pass removals whose PRs are still open, so
their code is not on main yet: B-51 and V-19 (PR #197), D-08 (PR #192)
and T-21 (PR #187; T-21 now has a fourteenth-pass remainder). If one of
those PRs closes unmerged, its entry comes back.

Fourteenth-pass top picks, with status: B-04 multi-pack identity (PR
#218), the lost first-run welcome (PR #241), App Translocation (PR
#229), the watcher wobble and two-pellet spin (PRs #215, #213), sleep
in a dark-opened tank (PR #214), taps on a paused tank (PR #223),
Mekasia's gravel (PR #208) and the crafted sound bank (PR #210). Still
open and highest value per risk: B-11 and B-12 (installs that add
nothing), B-44 (the 7z substitution), U-14's menu-bar offset and
U-18's Bare drag strip, B-35 (CRT click mapping), T-06's browser smoke
suite, F-01's resource map, and the new B-70 to B-76.

### Completed (fifteenth pass, Devin, PRs merged to main)

A merge-burst pass: the backlog of open PRs was rebased onto the
advancing main and squash-merged; GLM reviews were triaged to steady
state per the stopping rules. 41 PRs merged; #191 closed as a strict
subset of #255.

- **PR #190** (`fix/feed-edge-cases`): feeding gates on `paused`;
  pellets can no longer hang frozen mid-tank (tmp.md B-1).
- **PR #194** (`fix/housekeeping`): three small housekeeping issues.
- **PR #196** (`perf/import-cache-lru`): `web/lru.ts` `lruGet`/`lruSet`
  bound the session zip cache (8 entries + 96 MB byte budget) and the
  pack cache; in-flight promises are pinned so eviction can't
  double-download (tmp.md B-7, P-01). Review fixes: eviction continues
  past a throwing `onEvict` and rethrows the first value (even
  `undefined`); `lruGet` refreshes recency on hit.
- **PR #198** (`fix/overview-remove-arm`): Overview's Remove arms like
  Empty Tank; a selection move disarms it (tmp.md §5, U-04 partial).
- **PR #199** (`fix/import-honesty`): import-window honesty and Chooser
  conventions; `getAll()` empty-enumeration guard.
- **PR #200** (`feat/parallel-restore`): launch restore fetches packs
  in parallel; application order preserved (P-07, tmp.md R-5).
- **PR #202** (`fix/decompression-fallback`): fflate inflate fallback
  when `DecompressionStream` is absent — restores macOS 12/Safari <16.4
  support; fflate lazy-loads so modern browsers never fetch it; usize
  capped by the declared bound (B-29, tmp.md R-1).
- **PR #204** (`feat/cat-paw`): the AquaZone signature visitor — a paw
  drops from the rim every few minutes, bats the glass, startles fish;
  tick-driven so it pauses with the sim (tmp.md §7 cat, D-46 partial).
- **PR #205** (`perf/pack-caches`): bounded pack caches and cut
  per-frame/state-push overhead (P-01, P-06 partial).
- **PR #206** (`feat/lifecycle`): fish get sick, die, and are born —
  corpses excluded from the saved roster, births splash in and persist
  (F-12 partial, tmp.md §7 lifecycle-lite).
- **PR #207** (`fix/crt-shader`): continuous `uPhase` time and highp
  precision — kills the 100 s wrap jump and the mediump hash collapse
  (V-14).
- **PR #216** (`feat/dinner-bell`): soft chime when a fish first starts
  begging; latches only once the chime actually sounds, debounced
  re-arm after a sustained lull (tmp.md §8 feeding-time chime).
- **PR #217** (`feat/zen-mode`): Zen Mode hides every chrome piece;
  double-tap exits; Info card and import panel auto-exit (F-28 partial,
  tmp.md ambient-only sleep).
- **PR #219** (`feat/stats-copy`): Copy Summary button in Tank Stats;
  readonly textarea fallback for iOS, `aria-live` result, focus restore
  (tmp.md §8 diary/copy-summary).
- **PR #221** (`fix/sound-manifest`): pack manifests merge instead of
  wiping the sound table; ambient clip identity is a full-buffer,
  all-channel hash (tmp.md B-18-adjacent).
- **PR #222** (`fix/import-guards`): zip-fragment name guards and
  dropped-audio flood caps; `remoteInstall` validates `it.inner`
  (tmp.md B-2).
- **PR #224** (`fix/decor-copies`): decor copy counts persist across
  relaunches; live adds cap by the pack's current copy count (B-21).
- **PR #227** (`feat/crt-degauss`): degauss wobble + synthesized BWONG,
  power-off line collapse; reduced-motion can't strand a mid-flight
  collapse (D-06 partial).
- **PR #228** (`feat/auto-feeder`): Tank-menu timed feeder running on
  tank time, capped by in-water pellet count (F-07 partial, tmp.md §7).
- **PR #230** (`perf/save-cadence`): the 10 s interval now only pushes
  state; disk writes ride mutation paths plus a monotonic-clock
  60 s drift flush (P-21, tmp.md R-7).
- **PR #231** (`ux/quota-message`): a dropped pack that can't persist
  warns once per drop, cause-agnostic (tmp.md R-10).
- **PR #232** (`feat/snail`): rare procedurally-drawn snail creeps the
  gravel on the sim clock (D-12 partial, tmp.md §8 visitors).
- **PR #236** (`fix/case-drag-cursor`): grabbing cursor tracked in JS —
  native `performDrag` owns the mouse, so `:active` could stick (B-48).
- **PR #237** (`fix/integer-scale`): display scale snaps to integer
  multiples; raster snaps to device pixels; letterbox-margin gestures
  covered by `touch-action` (V-03).
- **PR #238** (`feat/plant-sway`): banded decor sway on a fractional
  phase, anchored so oversized pieces never teleport to the glass
  (V-20 partial).
- **PR #240** (`feat/progressive-listing`): add-ons list section by
  section as collections land (P-05).
- **PR #243** (`feat/pointer-crowd`): up to `NOTICE_CAP` calm fish
  gather at the pointer, each holding its rank (D-02).
- **PR #244** (`feat/drag-affordance`): Mac-style border-invert drop
  cue on the glass while files hover (U-10 partial).
- **PR #245** (`feat/overview-focus`): selecting a fish in the Overview
  spotlights it in the tank (U-25 partial).
- **PR #246** (`fix/favicon`): shared pixel-fish `icon.svg` on every
  window page.
- **PR #247** (`feat/plant-bubbles`): lit plants leak a thin oxygen
  stream that pops at the waterline.
- **PR #248** (`feat/bubble-pop`): tapping a rising bubble pops it with
  a lingering ring (D-41 partial — Stats counter still open).
- **PR #249** (`feat/standin-label`): starter stand-ins read as such in
  the Overview (U-02 partial).
- **PR #250** (`ux/sound-drop-hint`): sounds-pane hint mentions plain
  audio drops (tmp.md §5 microcopy).
- **PR #251** (`feat/scold-pref`): Tank-menu toggle for the don't-tap
  sign; disabling clears the in-flight tap tally (D-33, tmp.md §5).
- **PR #252** (`ux/feed-hint`): "Click to feed" tip over the feed zone,
  re-clamped on text swap, silenced while chrome is up (tmp.md §5).
- **PR #253** (`feat/boot-parade`): Mac-style startup parade — pixel
  art phases, restored add-ons march in, click/key skips, Tank-menu
  toggle (D-05).
- **PR #254** (`feat/golden-pellet`): rare golden pellet worth a
  victory roll (D-32).
- **PR #255** (`fix/sim-seed`): per-launch random seed, `?seed=<uint32>`
  replay pin, logged seed, malformed-param warning (tmp.md R-2).
- **PR #256** (`feat/tank-export`): Export/Import Tank via `.fins`
  JSON — validated structure, 5 MB guard, `.bak` backup, save
  suppression across the reload including bfcache restore (F-26
  partial, tmp.md §8 sync).
- **PR #259** (`fix/packcache-cap`): pack cache cap aligned to the
  16-entry drain contract the packcache tests encode (main went red on
  the #196/#205 interaction).

Also landed this pass on the same heads: feed-zone hover tracks the
live waterline (`isFeedZone` takes the per-column line; tmp.md B-5),
fish spawn through the surface (tmp.md B-3), `emptyTank` persists once
(tmp.md B-4), the feed-hover rect is cached (tmp.md B-8), and
`finsical.openImport` is now wired (tmp.md R-8). Declined: tmp.md's
lamp-follows-sunset variant (F-39 stays open; geolocation-free solar
math noted in the entry), hysteresis on the dinner bell (hunger fully
clears before re-arm is possible), and every refuted GLM claim is
recorded on its PR.



Done and removed from this list: B-01, B-02, B-03, B-05,
B-07, B-08, B-09, B-10, B-22, B-24, B-26, B-31, B-32, B-45 (ninth
pass); B-16 (already fixed on main), B-51 (twelfth pass); B-38
(fourteenth pass: verified fixed on main), B-04 (fourteenth pass:
PR #218). Fourteenth-pass IDs implemented by this pass's PRs, so
never listed here: B-65 (PR #215), B-66 (PR #214), B-67 (PR #213),
B-68 (PR #241), B-69 (PR #223), B-75 (PR #229). Fifteenth pass
(merged to main): B-29 (PR #202), B-48 (PR #236), P-01 (PRs #196,
#205), P-05 (PR #240), P-07 (PR #200), P-21 (PR #230), V-03
(PR #237), V-14 (PR #207), D-02 (PR #243), D-05 (PR #253), D-32
(PR #254), D-33 (PR #251).

### B-06 (remainder) The release binary is arm64-only although Info.plist promises macOS 12 (which runs on Intel)

Size S · Severity high · Value 4/5 · Risk 2/5

**Problem.** The binary contains only the build host's architecture and releases build on an Apple-silicon runner. Intel Macs on macOS 12-15 get 'not supported on this type of Mac'. No lipo step exists and CI never checks architectures. The minos check would also break on a fat binary (vtool prints one `minos` per slice).

**Evidence.** `macos/Makefile:39-41` (swiftc `-target $(shell uname -m)-apple-macos12.0`), `macos/Makefile:44-50` (minos check), `macos/Makefile:52` (codesign), `.github/workflows/release.yml:18` (`runs-on: macos-15`, arm64), `macos/Info.plist:19-20`.

**Change.** Add `ARCHS ?= arm64 x86_64` to the Makefile. Loop `for a in $(ARCHS); do swiftc -O ... -target $$a-apple-macos$(MACOS_MIN) -o $(APP).staging/Finsical-$$a $(SOURCES) || exit 1; done; lipo -create -output $(APP).staging/Contents/MacOS/Finsical $(APP).staging/Finsical-*; rm $(APP).staging/Finsical-*`. Run the minos check per arch with `vtool -arch $$a -show-build ... | awk '$$1=="minos"{print $$2}'`. Codesign after lipo. In ci.yml's native-macos job, assert `lipo -archs .../Finsical | tr ' ' '\n' | sort | tr '\n' ' '` equals `arm64 x86_64 `; the SWIFT_VERSION=6 step may pass `ARCHS=arm64`. If Intel is deliberately unsupported, say 'Apple silicon required' in README and CHANGELOG instead.

**Acceptance.** (derived) CI's native-macos job asserts `lipo -archs` equals `arm64 x86_64`; the per-arch `vtool` minos check passes; a manual launch on an Intel Mac works, or README and CHANGELOG say "Apple silicon required" instead.

**Merged and related.**

- PR #156's README now states that the release binary is arm64-only; update README and CHANGELOG when this lands.

Fourteenth-pass audit (62b8572): the README half of the fallback
landed: `README.md:22-23` says the release needs an Apple silicon Mac
and contains only an arm64 binary (PR #156). Still open: the universal
build itself (swiftc still targets `$(shell uname
-m)-apple-macos$(MACOS_MIN)` and there is no `lipo` step in
`macos/Makefile`), with its per-arch `vtool` minos check and the CI
`lipo -archs` assert; or, if Intel stays unsupported, the same
Apple-silicon note in CHANGELOG. `LSMinimumSystemVersion` is still
12.0.

### B-11 Fish add-ons with no usable sprites still report 'Added to the tank'

Size S · Severity medium · Value 4/5 · Risk 1/5

**Problem.** Any result with images counts as usable. For the fish section nothing is drawn, yet the install is recorded, restored every launch and listed as 'Fish add-on, In tank'. Affected: 'arow addon1' (aw*.rez hold BMP frames only; its Arowana.dna duplicates Medaka art), 'pleco' (no sprite stream), 'pleco addon1/2/3' (BMP frame runs), and 'updatedAZfiles' (AquaZone .exe/.dll/.rez program updates; its two Aquazone.rez copies spawn two fish named 'updatedAZfiles'). The detail pane even calls 'arow addon1' '7 packs, scenery.' This violates the repo rule never to report a skipped operation as successful.

**Evidence.** `web/main.ts:318-330` (handleImages drops fish-section images), `web/main.ts:619-646` (remoteInstall records success when only images decoded), `web/import.ts:309-315` (fetchInnerBlobs), `web/import.ts:793-859` (showDetail), `web/import.ts:1083-1098` (applyPack), `web/import.ts:520-529` (loadProblem).

**Change.** (1) In showDetail, applyPack and remoteInstall, when `it.section === 'fish'` and no usable PackResult has sheets, throw `new Error('no fish sprites')`, skip recordInstall/markInstalled, keep Add disabled, and map it in loadProblem to 'This fish add-on has no sprites Finsical can read yet.' (2) Add optional `hide?: RegExp` to Collection and hide `/^updatedAZfiles$/`. (3) Word the count as '1 fish' / '3 fish' for the fish section. Do NOT add `.dna` to PACK_EXT here (Arowana.dna's art is byte-identical to Medaka.dna and medaka.fsh). Follow-up (L): build sheets from BMP-frame packs (aw*.rez: runs of 100x40/75x40/40x27; PC0*.rez: 55xN runs of 20).

**Acceptance.** Tests (import.test.ts): a fish PackResult with images only is rejected with the message and not marked installed; listCollection's hide filter; a loadProblem case.

**Merged and related.**

- Related: U-06 ('No fish' status), F-23 (`.dna` only with a duplicate-art check). Refuted: adding `.dna` to PACK_EXT (see "Declined, refuted and corrected").
- IMPORT-09 (fourteenth pass, filed as F-34) proposes a proper Mule row, replacing the `updatedAZfiles` spawn this entry hides.

Fourteenth-pass update (IMPORT-06): the problem is wider than the US
list above. Eight JPN 魚単体 packs have no sprites either (ANGEL,
EMPEROR, GIGAZIGA, MOLLY, PENCIL, PHANTOM, RUMMY and クラウンローチ1): they
store runs of BMP frames (141 to 239 images each) with no ELRA/ELRB
sprite stream. With arow addon1, pleco and pleco addon1-3 that makes
13 of 159 Fish rows that install as scenery only: the pane says '1
pack, scenery.', the tank acks 'installed' and records the add-on, and
no fish appears. Separately, the only sprite streams in arowana.zip,
in arow addon2 (Arowana.fsh) and in JPN ｱﾛﾜﾅ.fsh are the medaka's, so
'arowana' adds a small silver killifish; the real arowana art is in
the aw*.rez BMP-frame runs. updatedAZfiles spawns two Mule fish named
'updatedAZfiles', one from each of its two Aquazone.rez copies.

Evidence at 62b8572: `web/import.ts:996-1027` (usable is any result
with sheets, images or sounds; the kinds label),
`web/import.ts:1282-1305` (applyPack marks the add-on installed),
`web/main.ts:776-784` (fish-section images are ignored),
`web/main.ts:1207-1241` (downloadAddon). Verification
(`import-verify/sheets.mjs` over all 71 JPN fish): exactly those 8
have no sheet; `drv/fish-out.txt` shows `sheetPacks=0` for arow
addon1, pleco and pleco addon1-3. Picked-sheet hashes
(`import-verify/hash.mjs`): arowana.fsh, medaka.fsh, ｱﾛﾜﾅ.fsh and
メダカ.fsh all give `2efd972dc7`, and Aquazone.rez gives the same hash as
Mule1.fsh (`fc77ded5fa`). The reviewer's Playwright run (e2.mjs):
installing MOLLY and pleco returned 'installed' acks, both were
recorded, and the fish count stayed at 3.

Change, refined: step (1) now covers all 13 rows; the throw goes in
showDetail, applyPack and downloadAddon (formerly remoteInstall), the
add-on is not recorded and the pane does not say 'Added'. Also add a
small `knownStandIn` map (url to note) in import.ts so the detail pane
of the three arowana rows says "Finsical draws this as a medaka until
arowana art is supported." The L follow-up (sheets from BMP-frame
runs) stays the real fix and now covers the 8 JPN packs too.
Acceptance additions: a `hide` regex drops a listed row; Playwright:
installing MOLLY leaves the saved add-on list unchanged and shows the
message, and the 'arowana' detail shows the stand-in note.

Re-verified open at 62b8572 (fourteenth-pass audit): `usable` counts
sheets, images or sounds (`web/main.ts:1214-1216`), handleImages
returns early for section fish (`web/main.ts:778-783`) yet
recordInstall still runs, and Collection has no `hide`.

Thirteenth-pass update: PR #203 (open): a fish pack with no drawable frame now fails the install instead of reporting success.

### B-12 Six gravel add-ons install as a silent no-op

Size S · Severity medium · Value 3/5 · Risk 1/5

**Problem.** bluesand, matteblack, redpebble (372-374x208, white-topped strips), clear (fully key colour), greensand (unkeyed 373x209 opaque texture) and lowfront (two all-key 50x50 images) have no image passing the strip test, so nothing changes, yet the panel says 'Added to the tank.' and Overview lists them.

**Evidence.** `web/main.ts:184-194` (pickGravel requires w >= 3h and w >= 160), `web/main.ts:321-332`, `web/main.ts:1078-1084`, `core/data/decor.ts:21-29`, `web/import.ts:1083-1111`.

**Change.** Add a pure `opaqueBounds(img, key)` to `core/data/decor.ts` (tight rect of non-key pixels, or null). In pickGravel, crop each candidate with a uniform corner key to its opaque bounds before the aspect test (rescues bluesand, matteblack, redpebble as ~372x83; mirror-tile to TANK.width). A pack whose only image is 100% key (clear) means a bare glass floor: set gravelCv = null for that src. An unkeyed ~16:9 texture (greensand) becomes a strip from its bottom 40% rows. Otherwise (lowfront) handleImages returns false and install reports 'This gravel has no floor art Finsical can use.' without marking it installed.

**Acceptance.** Tests in decor.test.ts: opaqueBounds on a 372x208 fixture with blank top returns y 125..207; an all-key image returns null; pickGravel on the greensand-like fixture yields a strip.

**Merged and related.**

- Related: V-04 (gravel prescale and `floorFor`); land together or B-12 first.

Fourteenth-pass update (IMPORT-08): still open on main and re-verified
per pack. Driver output (`drv/usgravel.txt`): bluesand [372x208],
clear [373x209], greensand [373x209], lowfront [50x50, 50x50],
matteblack [372x208] and redpebble [374x208], all 'NO-GRAVEL'; all 36
JPN gravel packs and the other 34 US ones pick a strip. The reviewer's
Playwright run (e2.mjs): bluesand was acked 'installed' and recorded,
and the floor did not change. Current code: `web/main.ts:582-592`
(pickGravel), `web/main.ts:776-793` (handleImages reports no result),
`web/main.ts:1241` (recordInstall); `core/data/decor.ts` still has no
`opaqueBounds`. The Change stands; the lowfront path (handleImages
reports 'no floor art', so downloadAddon throws instead of recording)
shares its result-reporting change with B-11 (IMPORT-06). Acceptance
addition: Playwright: installing lowfront shows "This gravel has no
floor art Finsical can use." and is not recorded, and bluesand changes
the floor.

Thirteenth-pass update: PR #203 (open): per-section usablePacks reports 'nothing usable inside'; gravel strips count where pickBackdrop consumes them.

### B-13 (remainder) Dropped files: the .rez base library replaces the scenery, BMP pictures are ignored, .azpack folders keep src ''

Size M · Severity medium · Value 3/5 · Risk 2/5

**Problem.** (a) The loop returns after the first file with sprite sheets, so a multi-file drop imports one fish. (b) Packs without sheets are skipped, so dropped .grv/.plt/.acc/.azn do nothing and then log the misleading "no manifest.json, pack file, or 'snd ' found". (c) It calls `pickBackdrop(packImages(data))` on fish packs, which the archive path deliberately never does: a 196x146 catalog portrait passes pickBackdrop's thresholds and fills the tank (blackmoor, comet, ryukin), and 180x35 banners (copperband, queen angel, shark) can replace the gravel. Raw drag-and-drop is undocumented, hence medium.

**Evidence.** `web/main.ts:983-999` (raw-pack drop loop; `continue` at :990, pickBackdrop at :992, early `return` at :993-996), `web/import.ts:346-365` (importAddon per-blob branch).

**Change.** (Narrowed in the fourteenth pass to what remains; (a) to (c) landed through `web/drop.ts`, see the notes below. The plan to route a sheet-less .rez to backgrounds is dropped: no real .rez carries a backdrop.) (1) .rez drops (IMPORT-04): in `decodeDroppedPacks`, treat .rez like .fsh (`const fishOnly = section === 'fish' || /\.rez$/i.test(name)`, `images = fishOnly ? new Map() : packImages(data)`), return section 'fish' for a .rez with sheets and map .rez to 'fish' in `dropSection`; a .rez with neither sheets nor images still falls through to the AZ_WAVES sound-bank path; update the drop.test.ts ANGEL.REZ case from `["tanks", 1, 1]` to `["fish", 1, 0]`; reword `README.md:133` to say the base library adds its fish; on load, drop a saved `sceneryChoice` whose URL is a `local:` key ending in .rez. (2) `.bmp` drops: PR #239 (open), then its phase 2 (see the FIDELITY-06 note). (3) The `.azpack` folder path: give it a synthetic `local:` source and a pack URL instead of `pickBackdrop(imgs)` with src '' and `spawnFromDrop` with no pack. (4) One shared stem helper for `web/drop.ts` and `web/import.ts`. (5) Log one drop summary and show it to you (U-10), warning only when nothing was usable.

**Acceptance.** Vitest (drop.test.ts): a .rez fixture with one sprite stream and a 349x980 BMP decodes to sheets.size 1, images.size 0 and section 'fish'; an AZ_WAVES-like bank still yields nothing from decodeDroppedPacks; the shared stem helper gives the same stem on both paths. Playwright (e4.mjs): dropping Aquazone.rez adds one fish and leaves the backdrop and gravel unchanged. (derived) Dropping an `.azpack` folder and then removing it in Overview restores the bundled art.

**Merged and related.**

- Merged from pass 8 ("Local drops still trail archive imports"): the target is one classified import path for archive and local sources, with stable local IDs, durable local bytes outside cache eviction, per-file failure isolation and an import summary (U-10).
- Merged from passes 1-7 ("`pickBackdrop` keys art by source"): the key is `""` for both bundled and dropped packs, so a drop silently rebinds the bundled art and `removeAddon` can never restore it. The earlier fix was synthetic source keys (for example `local:<hash>`); this entry's interim `src ''` convention keeps the bug, so prefer synthetic keys when B-14's local persistence lands in the same series.
- Merged from passes 1-7 (stem logic): the drop path uses `name.replace(/\.[^.]*$/, "")` and the remote path `replace(/\.[^.]+$/, "")`; use one shared stem helper so they cannot diverge.
- Overlaps open PRs #93 (section-aware drop classification; a `.fsh` drop no longer hijacks the backdrop), #94 (`decodeDroppedPacks` in `web/drop.ts` imports every decodable pack, skips corrupt ones), #121 (Firefox `dataTransfer.files` fallback) and #124 (dropped packs persist under `local:` IDB keys, excluded from LRU). With those merged, (a) and (c) may already be fixed; diff against main first.

Twelfth-pass update: verified against `62b8572` — `web/drop.ts`
(`decodeDroppedPacks`, `dropSection`) now imports every dropped pack
and fish packs no longer hijack the backdrop; (a) and (c) are fixed
on main. Still open: the `src ""` vs `local:` split called out above
and the import summary/message work (U-10).

Fourteenth-pass audit (62b8572): (a), (b) and (c) are fixed.
`decodeDroppedPacks` and `dropSection` (`web/drop.ts:26-61`) decode
every dropped pack in drop order, section it by extension and give
fish packs no scenery images, and every file imports on its own under
a `local:` URL (`web/main.ts:1783-1842`); tests at
`web/drop.test.ts:78-139`. Still open: the `.azpack` folder path calls
`pickBackdrop(imgs)` with src '' and `spawnFromDrop` with no pack URL
(`web/main.ts:1735-1748`), so the `src ''` split above now remains
only there; the drop summary goes only to the console; and the stem
regexes still differ (`web/drop.ts` `/\.[^./]+$/` against
`web/import.ts:276,346` `/\.[^.]+$/`). The tank reviewer's cite of
`drop.ts:175-198` was wrong: the file has 62 lines.

Fourteenth-pass update (IMPORT-04): dropping the base library
Aquazone.rez replaces the backdrop with the heater sprite and the
gravel with the lamp-hood bar. README tells you that you can drop "the
base library (.REZ, fish and scenery)", but `dropSection` classes
every .rez as 'tanks' and `decodeDroppedPacks` keeps `packImages` for
.rez, so its images go through `pickBackdrop`. Aquazone.rez has no
backdrop: its largest qualifying image is the 349x980 heater (a white
field with a black cable) and its widest strip the 640x78 grey hood
bar. Both become the tank's scenery, saved as `local:Aquazone.rez`.
The drop is recorded as section 'fish', so after a relaunch the
restore ignores its images and the scene reverts while the saved
choice still points at art that never loads, and the spawned fish is
named 'Aquazone' although it is the Mekasia Mule. Evidence:
`web/drop.ts:27-34` (azn and rez go to 'tanks'), `web/drop.ts:47-53`,
the drop loop in `web/main.ts` (handleImages with `p.section`, then
recordInstall as 'fish'), `web/main.ts:563-581` (pickBackdrop),
`README.md:133`. Rerun in verification (`drv/rezdrop.mjs rez`):
'Aquazone.rez tanks sheets 16 ... => backdrop 349x980 gravel 640x78';
screenshot `import/e4-dropped.png` (viewed): a white backdrop with the
heater cable at the left and a grey hood-bar floor. DS01, GF01,
GP15000, kf and ma1 carry only 5 to 20 px images, aw1.rez has no
sheets and only 100x40 frames, and the .rez files on archive.org (7z
System/) are species sets, pleco and arowana frame runs, AZ_WAVES and
ACCMAKER: none is a scenery backdrop, so the old plan's
sheet-less-.rez-to-backgrounds rule had no real input and was replaced
by Change (1).

Fourteenth-pass update (FIDELITY-06): PR #239 (open) lands the `.bmp`
branch, so you can use your own picture as the backdrop, as AquaZone
allowed ('you can always use one that you've made yourself', guide
@2161101; the Japanese catalog lists it as a headline feature). On
main a dropped 256-colour BMP is tried only as a sound, then ignored
with the misleading "drop: no manifest.json, pack file, or 'snd '
found", and even if stored the launch restore would throw, because
`importAddon`'s `local:` branch accepts only packs. Evidence:
`web/main.ts:1760-1761` (only `isPack` heads take the pack path;
everything else goes to `fileSoundRecords`), `web/main.ts:1843-1844`
(the warning), `web/import.ts:470-478` (local branch; :473 throws
'stored data is not a pack'), `web/import.ts:489-492` (the remote
`isBmp` path already exists), `web/drop.ts` `dropSection` (`.bmp`
falls to 'fish'), `core/data/bmp.ts:21-28` (8-bit only, like the
original); reproduced with `fidelity-verify/v3.mjs` (dropping the
640x480 8-bit `MyBackdrop.bmp` on a stocked tank logs the warning, and
no localStorage record mentions the file). `pickBackdrop`
(`web/main.ts:563-581`) also silently skips images under half the
tank's width or height. The PR's plan: files whose head `isBmp` decode
with `decodeBmp`; null (24-bit, RLE4 and so on) or an image smaller
than 160x100 shows one alert, 'Finsical can use 256-colour BMP
pictures of at least 160 by 100 pixels as backdrops.'; otherwise
`packPut('local:' + name)`, `handleImages([img], url, "backgrounds",
true)` (a wide strip, w >= 3h, goes to the gravel) and
`recordInstall({ section: "backgrounds", inner: stem, url })` only
when stored; `dropSection` returns 'backgrounds' for `.bmp`, and
`importAddon`'s local branch returns a single images-only `PackResult`
when `isBmp(d)`. Its acceptance: `dropSection("x.bmp") ===
"backgrounds"`; `importAddon("local:x.bmp")` over a stored 8-bit BMP
returns one image; in Playwright a dropped 640x480 8-bit BMP changes
the backdrop, Tank Overview lists it with Remove and it survives a
reload, while a 24-bit BMP shows the alert and changes nothing. The
PR implements that plan, detecting a BMP by its `BM` signature rather
than its extension (classic Mac files often have none), guarding the
decode like a pack's, and alerting "Finsical can't use that picture as
the backdrop. You can use 256-color BMP pictures of at least 160 by
100 pixels." once per drop. Still open after it (phase 2): PNG, JPEG
and 24-bit pictures through a 256-colour quantizer are F-42, which
also records phase 2's 'Accessory Maker lite'.

### B-14 (remainder) Fish show the wrong species during launch restore, and permanently when their pack failed

Size S · Severity medium · Value 4/5 · Risk 2/5

**Problem.** Saved fish carry last session's sheetIdx. Until their pack restores, sheetOf uses the stale index or round-robins, so the tank opens with a school of wrong or identical fish that morph one pack at a time (~1.7 s from IDB, seconds from the network). remapSheetIdx runs once, after the whole chain; for a pack-bound fish whose pack did not load (offline, 503, evicted), it keeps any in-range sheetIdx, which now belongs to another pack. Dropped fish (no `pack`, no stored bytes) borrow whatever slot restored first after relaunch, so a dropped blackmoor becomes a goldfish.

**Evidence.** `web/main.ts:222-237` (sheetOf), `web/main.ts:253-270`, `web/main.ts:275-295` (remapSheetIdx else-branch at :291-293), `web/main.ts:875-900` (launch chain), `web/main.ts:948`, `web/main.ts:991`.

Playwright: goldfish (sheet 0) + blackmoor (sheet 1), clear IDB, goldfish.zip returns 503, reload: roster 'goldfish@sheet0, blackmoor@sheet0'. Drop blackmoor then install goldfish, reload: two identical goldfish.

**Change.** Put the rule in a pure `drawableSheetIndex(f, {sheetByPack, sheetBySpecies, count}, restoring)` in `web/tankmodel.ts` (shared with B-04's resolveSlot). (1) At load, strip sheetIdx from fish that have `pack`. (2) A fish with `pack` or non-empty `species` that is unresolved returns null (drawn as placeholder or hidden while `restoring`); it never falls through to round-robin. Only fish with species '' and no pack round-robin (see B-15). (3) In handleSheets, rebind only the fish whose pack/part (or legacy species) just registered; never delete bindings mid-restore, since remapSheetIdx's delete branch must run only after the chain (main.ts:900). (4) Optional: fade newly drawable fish in over ~15 ticks. (5) Reveal the restored tank once (TANK-12): add a `restoring` flag, set until the launch chain's final `.then` and capped at 3 s; while it is set, render the screen as an unlit tube (black backplate, no fish or scenery), then reveal it with a short fade, or with the CRT warm-up when the CRT is on. Pack-bound fish whose pack still fails afterwards are drawn as clearly marked stand-ins by rule (2). (The old follow-up to persist dropped bytes landed: drops persist under `local:` keys.)

**Acceptance.** Vitest: pack missing gives null; `{species:'blackmoor', sheetIdx:0}` with no binding gives null; resolved and legacy cases. Playwright (TANK-12): for a stocked state, frames captured every 50 ms after load show either the dark screen or the restored tank, never stand-ins over the gradient; a state whose packs fail still reveals after 3 s.

**Merged and related.**

- Merged from pass 8 ("Pack-owned fish can inherit unrelated art", old ID B08): `remapSheetIdx` drops bindings only when the old index is out of range and `sheetOf` then round-robins. Bind pack-owned fish strictly by pack identity, draw the recognizable placeholder while absent, resolve when the pack loads, and keep round-robin only for explicitly unbound starters. Extra tests from that entry: mid-order restore failure, same-name packs, late retry.
- Design constraint: `usePack` intentionally keeps sheets on removal to preserve `sheetIdx` bindings; do not "fix" that apparent leak separately.
- The local-bytes follow-up overlaps open PR #124 (`local:` keys, `LOCAL_PREFIX`/`isLocalPack`).
- B-04's multi-pack fix, PR #218 (open), adds the pure `web/tankmodel.ts` (`migrateParts`, `partName`, `entryStem`) and per-part `sheetByPack`; put `drawableSheetIndex` there and resolve by pack and part.

Fourteenth-pass audit (62b8572): the dropped-fish half is fixed: raw
drops persist as `local:` packs and restore by URL
(`web/main.ts:1816-1839`, `web/import.ts:470`), so a dropped blackmoor
keeps its art. Still open: the saved sheetIdx is kept at load
(`web/main.ts:203-204`), sheetOf uses it or round-robins while packs
restore (`web/main.ts:629-644`), remapSheetIdx keeps an in-range
sheetIdx for a pack that failed (`web/main.ts:703-705`), and there is
no `drawableSheetIndex`.

Fourteenth-pass update (TANK-12): the launch also pops the scenery,
not just the fish. Every launch paints the saved roster before the
restore chain lands: until a sheet loads, `sheetOf` returns null and
`drawFish` falls back to the orange stand-in guppy, drawn over the
gradient backdrop and flat brown floor, and then everything swaps at
once (about 0.2 s from IndexedDB, seconds from the network on a cache
miss). The reviewer's frames (`tank/rm-strip.png`): at 14 ms stand-ins
on the default gradient and flat floor, at 177 ms real fish, gravel
and plant, at 336 ms the backdrop. Code: `web/main.ts:629-644`
(sheetOf returns null until a sheet exists), `:1917-1919` (placeholder
fallback), `:1610-1658` (restore chain). Change (5) and its Playwright
acceptance come from this item; do it with rule (2)'s `restoring`
handling rather than alone.

Thirteenth-pass update: PR #193 (open): entry-bound restore fixes the stale-index case.

### B-15 (remainder) Kept starter fish adopt every installed species, change as more install, and keep removed art

Size S · Severity medium · Value 4/5 · Risk 2/5

**Problem.** The four starters (no species, pack or sheetIdx) draw `fishSheets[slot % fishSheets.length]`. Installing one fish add-on turns all four into that species (five of them), a second install turns them into A/B/A/B mid-swim, and after uninstalling they keep the removed species because removeAddon deliberately leaves sheets loaded. Their thumb key `f:{id}:` never changes, so Overview keeps stale art, and they are always named 'Fish'. Tank presets with sheets (B-23) feed the same pool.

**Evidence.** `web/main.ts:70-76` (DEFAULT_FISH), `web/main.ts:222-237` (round-robin at :230-236), `web/main.ts:441-454` (fishThumb memo), `web/main.ts:549-602` (removeAddon keeps sheets), `web/bus.ts:16-20` (fishThumbKey), `web/overviewmodel.ts:66`, `web/statsmodel.ts:59`.

**Change.** (1) Add `bindStarters(fish, {species, pack, sheetIdx})` to `web/tankmodel.ts`: on the first live fish install (handleSheets with live === true, section 'fish'), bind every untouched starter to that pack, then saveTank; they keep that art, get a real name and leave with their add-on. (2) For anything still unbound, round-robin only over `liveSlots` (slots whose owner is the bundled pack or a URL in installedAddons, fed only by section 'fish'), via a pure `roundRobinSlot(i, liveSlots)`; empty list gives the placeholder. removeAddon removes its slots from liveSlots. (3) Memoize fish thumbs by `${fishThumbKey(f)}|${slot}` and re-post `thumbs` for keys whose slot changed. Never set `f.pack` on loose fish outside bindStarters (removeAddon would then delete them unexpectedly).

**Acceptance.** Vitest: starters bind once; a second install leaves them alone; pack fish are never touched; roundRobinSlot never returns a removed or tanks-only slot. Playwright: install then remove tama, 0 starter thumbs show tama.

**Merged and related.**

- Related: B-23(a) (keep tank-preset sheets out of the pool), B-14.
- PR #160 (open) removes the stand-ins once Stock the Tank installs a real fish, which narrows this; a user who declines the offer still sees starters adopt every species.

Fourteenth-pass audit (62b8572): two parts landed. handleSheets
registers only section 'fish' (`web/main.ts:664-665`), so tank-preset
sheets stay out of the pool, and accepting Stock the Tank removes the
stand-ins (`web/main.ts:1669-1674`, PR #160's feature). Still open:
stand-ins kept with Not Now still round-robin over every `fishSheets`
slot, removed packs included (`web/main.ts:629-644`); there is no
`bindStarters` or `liveSlots`; and the thumb key `f:{id}:` never
changes (`web/main.ts:914-926`). Change (1) to (3) stand, minus the
tanks half of (2).

Thirteenth-pass update: PR #193 (open): the same binding stops starter stand-ins adopting installed species.

### B-17 (remainder) While audio is locked every sound is queued; the first click plays them all at once

Size S · Severity medium · Value 4/5 · Risk 2/5

**Problem.** The AudioContext is created at launch by the sounds restore, before any gesture. play() attaches `resume().then(() => this.play(...))` for every one-shot, including bubbles from render(); per spec, pending resume promises settle together once the context may start, so the first click fires every queued effect (28 starts within 400 ms of the click in a 40-fish test). WebKit's 'interrupted' state (sleep, device change) falls through and silently drops sounds; nothing watches statechange or visibilitychange.

**Evidence.** `web/audio.ts:70-74`, `web/audio.ts:99-116` (play retry closure), `web/main.ts:108-110` (unlock then tap), `web/main.ts:1106-1108` (bubble sounds from render), `macos/Finsical.swift:110-116`.

**Change.** In TankAudio add `private resuming: Promise<void> | null` and `requestResume()` (at most one resume() at a time; on resolve start the ambient if `ambientWanted && !ambientSrc`). play(): if `state !== 'running'`, call requestResume(); queue a single retry for this call only while a gesture is in progress (`navigator.userActivation?.isActive`, or a `gestureUntil` timestamp that unlock() sets to now+1000); otherwise drop one-shots and never queue bubbles. Remove the per-call closure and the ambientGen bookkeeping it needed. Hook `ctx.onstatechange` and `visibilitychange` (when visible) to requestResume(). (The native half is done: makeWebConfig sets `mediaTypesRequiringUserActionForPlayback = [.video]`, `macos/Finsical.swift:165`.)

**Acceptance.** Tests: new `web/audio.test.ts` with a fake AudioContext (settable state, deferred resume, counted start()): 10 bubble() calls while suspended then resolve gives 0 one-shots and 1 ambient; unlock() then tap() while suspended gives exactly 1 tap.

**Merged and related.**

- Planned for PR #159 but not included; #159 only skips install feedback while the context is locked.
- Overlaps open PRs #115 (keyboard and menu paths call `unlock()`) and #133 (defers AudioContext creation until a buffer plays; `usable:false` on failure). Re-measure on top of them.
- Merged from passes 1-7: the F key could play a "plop" even before unlock by resuming on the keydown gesture itself (keys count as activation).
- Refuted variant: dropping every one-shot while suspended (see "Declined, refuted and corrected").

Twelfth-pass update: PR #185 lands the core — one-shots dropped
while suspended unless a gesture is active, a single
`requestResume()`, ambient self-heal on `statechange`, with vitest
coverage. Still open: WebKit's `interrupted` state (only `suspended`
is handled), a `visibilitychange` resume hook, and the native
`mediaTypesRequiringUserActionForPlayback` flag (needs a Mac).

Fourteenth-pass audit (62b8572): the native flag and the gesture paths
are done on main: `mediaTypesRequiringUserActionForPlayback =
[.video]` (`macos/Finsical.swift:165`, so the twelfth-pass note's
native item is closed), and the keyboard and menu paths call
`unlock()` (`web/main.ts:1345, 1461, 1477, 1500, 1510, 1540`). Still
open on main until PR #185 merges: play() attaches a
`resume().then(play)` retry per call while suspended, bubbles included
(`web/audio.ts:335-349`), with no single in-flight resume; and nothing
handles `statechange` or the 'interrupted' state (grep finds neither).
After #185, what remains is 'interrupted' and a `visibilitychange`
resume hook.

Thirteenth-pass update: PR #188 (open) stacks the remaining queue-burst guards on #185's suspended-drop core.

### B-18 (remainder) Sound add-ons: every launch decodes the sound bank twice and rewrites it; dropped sounds can't be listed or removed

Size M · Severity low · Value 3/5 · Risk 2/5

**Problem.** The Overview line disappears, but the records stay in TankAudio.imported and in the persistent 'snds' record, and come back every launch (Macinfish: 3.2 MB decoded on every launch). They still drive the ambient, bubble and tap lookups by name. The launch also decodes restored sound add-ons twice (restore -> handleSounds -> addWavs, then sndsGet -> addWavs). A live install plays the track through an untracked source that nothing can stop. Dropped sounds are never listed anywhere and cannot be removed.

**Evidence.** `web/main.ts:343-358` (handleSounds, sndsMerge), `web/main.ts:549-602` (removeAddon has no sounds branch), `web/main.ts:640-644`, `web/main.ts:891-899` (launch re-adds all stored records), `web/store.ts:186-230` (only sndsGet/sndsMerge), `web/audio.ts:11`, `web/audio.ts:44-81`.

**Change.** (Narrowed in the fourteenth pass: removal, provenance and tracked install feedback landed, see the notes below. These steps replace the old (1) to (5); the old (5), skipping stored records at launch that an installed add-on restores, is step 2.)

1. main.ts: start `const storedSounds = sndsGet().then((r) => r?.length ? audio.addWavs(r) : undefined).then(() => audio.open())` at launch, in parallel with `importPanel.restore(...)` instead of after it. Keep applySceneryChoice, remap/reconcile, retryRestores and backfillStarterSounds after the restore (backfill still needs the stored count).
2. Add `TankAudio.has(name)`. In handleSounds with `live === false`, first await the stored-sounds promise so the two paths cannot both decode a name, then decode only the names audio lacks and persist only names missing from the store (`sndsMergeMissing`, built on capSnds). A restore still heals a cleared store but stops rewriting it every launch. (IMPORT-12's simpler variant: skip sndsMerge when `live` is false, and at launch skip stored records whose names appear in the `sounds` list of an installed add-on that restored successfully; provenance lives on the Importable since #104.)
3. Replace the buffer-identity restart in addWavs and removeWavs with a name rule: track `ambientName`, and restart only when the selected name changes or that name is in the incoming batch.
4. B-40: addons.ts posts `names: recs.map((r) => r.name)` with soundsLoaded, and main.ts decodes only those names from the store.
5. In applyPack, render and store the preview only when `live` (IMPORT-12). Restores leave the in-page overlay to loadStoredThumb, and the fetchPack memo makes a refetch cheap.
6. Optional: stop a replaced loop, and install feedback cut short by a newer install (a FOLLOW-UPS 'Sound' item), with a 20 ms fade: per-source gain `setTargetAtTime(0, t, 0.005)`, then `stop(t + 0.03)`. Use the same fade to stop a playing track when its add-on is removed.
7. Dropped sounds that are never listed and can't be removed: list them in the Sound pane (AUDIO-10, filed as F-05) and remove them from there.

**Acceptance.** audio.test.ts (FakeContext): addWavs with the same names while the loop plays calls stop() 0 times; `addWavs([{name:'drip'}])` while it plays calls stop() 0 times; a restore batch whose names are loaded calls decodeAudioData 0 times. Playwright on the stocked state: a relaunch makes 25 decodes (addWavs once per record), 0 `snds` puts, 0 `thumb2:` puts and exactly one loop start; with the art zips evicted and archive.org delayed, the loop starts within 2 s of load. An install still stores its thumbnail, and a relaunch after deleting the 'snds' record still plays the add-on's sounds. The old `withoutSnds` and "remove Macinfish leaves 'snds' empty" checks are covered by the landed removal (`web/import.test.ts:206`).

**Merged and related.**

- Overlaps open PR #104 (`orphanedSounds` pure helper drops an uninstalled add-on's sound records; provenance recorded only after `handleSounds` succeeds; restores refresh it). With #104 merged, what remains is the double decode at launch, stopping a playing track, and dropped sounds that are never listed.
- Related: B-39, B-40, P-04, F-05 (remainder).
- Fourteenth pass: AUDIO-10 (Sound pane: list every tank sound, as in
  Mac OS 8's Alert Sounds list, and click one to play it) is filed as
  F-05; it is where dropped sounds become visible and removable (step
  7).

Fourteenth-pass audit (62b8572): the core landed. Sound add-ons are
removable: `recordAddon` stores the record names
(`web/import.ts:426-438`), and removeAddon drops orphaned records
through `orphanedSounds`, `audio.removeWavs` and `sndsRemove`
(`web/main.ts:1105-1112`, `web/import.ts:409-414`,
`web/audio.ts:256-266`; tested at `web/import.test.ts:206`). Install
feedback is one tracked source capped at 4 s (`web/audio.ts:40,
271-297`). Still open: the launch still decodes restored sound add-ons
twice, restore to handleSounds and then sndsGet to addWavs
(`web/main.ts:809-827, 1634-1641`); stopping a playing track; and
dropped sounds, which are never listed and can't be removed.

Fourteenth-pass update (AUDIO-01): the launch loads the sound bank
twice, rewrites it to IndexedDB and holds all sound behind the add-on
restore. The launch chain restores add-ons one at a time. When
AZ_WAVES comes up, `handleSounds(recs, false)` decodes all 25 records
and `sndsMerge` reads and rewrites the whole `snds` record (1.18 MB
for the bank alone, more with Macinfish); the chain then runs
`sndsGet()` and `addWavs()` on the same 25 records again. Because
addWavs restarts the loop whenever the `AZ bubble 9003` buffer object
changes, the loop stops and restarts about 30 ms after it starts. The
stored WAVs are already local but load only after the whole sequential
restore, so when art packs have to come from archive.org (an evicted
or cleared pack cache) the tank stays silent until every art pack is
back. The per-launch rewrite also runs B-39's failure path every
launch: if the read inside sndsMerge fails, `capSnds(null, recs)`
overwrites the store with only the bank, and dropped sounds are lost.
Corrections to the review: the launch restart is not audible in
practice (in the app the opening `aqua` sound starts in the same
render quantum and masks it; in a browser it happens while the context
is still locked; FOLLOW-UPS.md already calls it harmless), the audible
case being B-40's restart during playback; and the decode cost is
small (the 50 decodes finish within about 30 ms), so severity is low,
not medium (this entry's severity and risk were lowered to match:
medium to low, risk 3/5 to 2/5). Evidence: `web/main.ts:1629-1645`
(restore, then sndsGet, addWavs, open), `web/main.ts:809-824`
(handleSounds always runs addWavs and sndsMerge, restores included),
`web/store.ts:232-243` (sndsMerge reads and rewrites the whole
record), `web/import.ts:1441-1470` (sequential restore),
`web/audio.ts:136-143` and `:258-265` (restart by buffer identity),
`web/main.ts:1035-1046` (soundsLoaded re-reads and re-decodes the
whole store). Re-run for verification (Chromium with autoplay allowed,
stocked state, AudioContext and IDB wrappers): with a warm cache, one
`packs` get of AZ_WAVES (1,182,480 B), two `meta snds` gets (1,181,786
B each), one `snds` put (n=25), 50 decodeAudioData calls, loop start
at 348 ms and stop plus restart at 382 ms, together with the 5.165 s
`aqua` start; with 6 art zips evicted and archive.org delayed by 4 s
per request, the AudioContext and loop start at 30.8 s; posting
`{op:'soundsLoaded'}` from a second page gives 25 decodes, then the
loop stops at context time 7.6 s and restarts from the top (B-40).
Change steps 1 to 4 and 6 and most of the Acceptance come from this
item; step 4 closes B-40.

Fourteenth-pass update (IMPORT-12): every launch also re-encodes a
thumbnail per restored add-on. The launch restore goes through
`applyPack`, which always renders a preview and stores it as a PNG
under `thumb2:` although it is usually already cached, and each write
also runs `trimPacks` over all cache stats. The thumbnail writes and
the 'snds' rewrite are new; the second decode is this entry's recorded
remainder. Evidence: `web/import.ts:1302-1303` (preview and storeThumb
run on restores too), `web/import.ts:1158-1174` (storeThumb calls
toBlob, then packPut), `web/main.ts:809-824` (handleSounds calls
sndsMerge even when `live` is false), `web/main.ts:829-831`
(onSounds), and the launch chain in `web/main.ts` (sndsGet, then
addWavs again). The reviewer's e7.mjs (IDB puts instrumented) counted
13 packstat, 6 thumb2 and 1 snds writes per relaunch of the stocked
tank, with a 301 ms restore and one 81 ms long task; checked by code
reading, not re-run. Change step 5 and the `thumb2:` acceptance come
from this item; pair it with the rest of this remainder rather than
shipping it alone.

### B-19 (remainder) Imported music takes over tank sound effects through substring name matching

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** find() falls back to any imported name that contains the keyword, and imported records outrank bundled ones (releases ship none anyway). Audio files become records named after the file, so 'Desktop Aquarium.mp3' becomes the ambient loop ('aqua') and the top-of-glass tap ('desktop' contains 'top'); 'Seaside Sunset' answers every side tap via the `?? find('center','side')` fallback. A full song then replays at gain 0.8 on every tap and overlaps itself, with no way to remove it (B-18).

**Evidence.** `web/audio.ts:44-68` (addWavs), `web/audio.ts:83-97` (find), `web/audio.ts:128-156`, `core/data/snd.ts:381-392` (fileSoundRecords), `web/store.ts:195`, `web/main.ts:959-982`, `web/addons.ts:40-65`.

**Change.** Add `kind: 'effect' | 'music'` to sound records: the AUDIO_FILE_EXT branch of fileSoundRecords sets 'music', the 'snd ' fork branch 'effect'; carry optional `kind` through StoredSnd, capSnds and sndsMerge. Legacy records without kind count as effect only if they are RIFF/WAVE, mono and <= 22254 Hz (what wavBytes emits). addWavs puts music in a separate `music` map that find() never searches; playImported(name) looks in both (and F-05's jukebox plays music). Keep substring matching for effects (the original fork's names are unknown); if stricter matching is wanted, split camelCase and non-letters into words first rather than a word regex on the lowercased name.

**Acceptance.** Tests (audio.test.ts, fake AudioContext): a music record 'Desktop Aquarium' never plays from tap(), feed() or startAmbient() but plays via playImported; an effect 'aqua' loops; 'TapTop' still answers a top tap.

Eleventh-pass update: the word-splitting half of this Change is done
in PR #181 (`words()` in `web/audio.ts`; "CENTER*" and "bubble pop"
still match, "Centerfold" stays silent; exact-named events already
used `named()`). Still open: the `kind: 'effect' | 'music'` split, so
a song with a whole event word in its name ("Top Hit" answers a top
tap today) still takes the slot, and B-18 removal.

**Merged and related.**

- Related: F-05 (remainder) plays `kind === 'music'` records; P-04 streams them; F-22 records are `kind: 'effect'`.
- Fourteenth pass: AUDIO-07 ('Bubble sounds' is on by default but does nothing with the game's sounds) is filed as U-33.

Twelfth-pass update: both narrowing halves landed — PR #181 makes
substring matching whole-word ("Centerfold" no longer answers
"center"), and PR #185 rejects buffers longer than 20 s on every
find() pass, so even a single-word song name can't hijack an event.
Still open: the `kind: 'effect' | 'music'` split — a short song
called "drop" can still answer a splash; music should live in a
separate map that event lookup never searches.

Fourteenth-pass audit (62b8572): on main, exact names beat substrings
globally (`web/audio.ts:301-316`), and the ambient, opening, lamp,
scenery and fish-out sounds use `named()` (`web/audio.ts:321-327,
376-390, 428-434`; test at `web/audio.test.ts:337`). Still open on
main until PRs #181 and #185 merge: tap() and feed()/splash() still
fall back to substring `find()` (`web/audio.ts:361-368, 393-401`), so
'Seaside Sunset' can answer side taps. After them, only the `kind`
split remains: records still have no music kind.

Thirteenth-pass update: PR #188 (open): find() iterates needles outermost, so caller-specified priority wins over insertion order.

### B-20 (remainder) Installed scenery still offers 'Add Again' instead of 'Show in Tank'

Size S · Severity medium · Value 4/5 · Risk 2/5

**Problem.** One scenery item shows at a time; pickBackdrop/pickGravel re-insert into their maps, so the choice is right during the session. But recordInstall only appends unseen URLs and restore replays installedAddons in first-install order, so after relaunch the last-installed item wins, not the last-chosen. Both install paths drop `again`. The button label 'Add Again' does not describe switching back to a background. Playwright: Back01, Back02, Back01 again: correct live; after reload Back02 is back.

**Evidence.** `web/main.ts:36-44` (SavedTank), `web/main.ts:165-194` (pickBackdrop/pickGravel), `web/main.ts:333-337` (recordInstall ignores `again`), `web/main.ts:607-650` (remoteInstall; call at :645), `web/main.ts:891`, `web/import.ts:789`, `web/import.ts:822-858`, `web/import.ts:1115-1131` (applyAddon -> onInstall(it)), `web/import.ts:1231-1246` (restore order).

**Change.** (Narrowed in the fourteenth pass: steps (1) and (2), persisting and re-applying the scenery choice, landed as `SavedTank.scenery` and `applySceneryChoice`.) (3) For installed items in backgrounds/gravel/tanks, label the button 'Show in Tank'; once postState carries the displayed srcs (U-06), show a disabled 'In Tank' for the current one. (4) Pass `again` through `ImportHandlers.onInstall(it, again)` and `recordInstall(it, again)` in the same PR as B-21, which is the only remaining consumer.

**Acceptance.** (derived) The detail pane of an installed background, gravel or tank preset offers 'Show in Tank', and pressing it shows that item; with U-06's displayed srcs, the current one shows a disabled 'In Tank'.

**Merged and related.**

- Overlaps open PR #118 (Overview "Use" swaps in an installed pack's backdrop or gravel, rows show "Showing"/"In tank", the choice persists via `SavedTank`). With #118 merged, what remains is the 'Add Again' labelling and passing `again` through.
- Merged from passes 1-7 ("Backdrop/gravel chooser"): `pickBackdrop` is newest-wins on install; a Preferences-side chooser with preview is still open.
- Related: U-06 (statuses), B-21 (shared `recordInstall(it, again)` plumbing).

Fourteenth-pass audit (62b8572): the relaunch revert is fixed.
`SavedTank.scenery` persists the choice (`web/main.ts:84-110`, written
at `:234`), a live install or Use sets it, Add Again included
(`web/main.ts:786-789`), and `applySceneryChoice` re-applies it after
the restore chain and after retries (`web/main.ts:594-612, 754,
1649`). Still open: installed backgrounds, gravel and tanks are still
labelled 'Add Again' (`web/import.ts:991, 1046, 1065`), with no 'Show
in Tank' or disabled 'In Tank'.

### B-21 'Add Again' copies of plants and accessories are lost on relaunch

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** Add Again pushes another decor instance, so three copies show, but recordInstall dedupes by URL and restore applies each URL once; after relaunch one copy remains. Fish are unaffected because each fish is in the roster.

**Evidence.** `web/main.ts:198-218` (addDecor pushes one decor per call), `web/main.ts:333-337` (recordInstall dedupes by URL), `web/import.ts:828-858`, `web/import.ts:1231-1246`.

**Change.** Give saved add-ons an optional `copies?: number` (missing = 1). In `recordInstall(it, again)` (shared plumbing with B-20), when again is true and section is plants or accessories, increment copies instead of skipping; restore calls handleImages `copies` times. If F-04 lands first, persist decor placements as an ordered array (one entry per copy) instead.

**Acceptance.** Tests: vitest SavedTank migration (copies defaults to 1); Playwright reload keeps 3 copies (debug hook `window.finsical.debug?.decorCount` or a pixel diff).

**Merged and related.**

- Conflicts with open PR #99 (and #139): there "Add Again" on a plants/accessories pack replaces that pack's frames instead of stacking a copy. Decide the intended behavior first. If copies are wanted, this entry (or F-04's placement array) applies and #99 must be revised; if not, #99 already fixes the visible stacking and this entry reduces to nothing.
- Merged from passes 1-7 ("Decor count"): an optional Overview quantity control.

Re-verified open at 62b8572 (fourteenth-pass audit): addDecor pushes
one copy per call (`web/main.ts:619-625`) and recordAddon dedupes by
URL (`web/import.ts:426-438`); FOLLOW-UPS confirms that copies don't
persist. PR #99's replace-in-place was rejected in #161, so the
open-PR conflict above no longer applies: Add Again stacks copies
live, and this entry makes them persist.

Thirteenth-pass update: PR #224 (open): the copy count persists on the Importable record and replays on restore.

### B-23 (remainder) Tank presets (.azn) apply only a stretched backdrop and one strip

Size M · Severity medium · Value 3/5 · Risk 3/5

**Problem.** A .azn is a complete saved aquarium. eden.azn holds 5 plant species with 12 positioned named individuals (PlPI/PlPH), a 'venus' accessory, backdrop 640x480, gravel 640x128, heater, water, filter, feeder and light records. Only the backdrop (and for the goldfish bowl the 560x130 base as 'gravel') survives; fish swim over the wooden table outside the bowl. Installing AROWANA ADAM&EVE feeds its fish sheets into the round-robin, so the starter fish become arowana fry, while the preset's own fish never spawn.

**Evidence.** `web/main.ts:222-237` (sheetOf round-robin), `web/main.ts:253-270` (handleSheets calls usePack for any section), `web/main.ts:321-332` (tanks -> pickBackdrop only), `web/import.ts:78-79`, `core/data/decor.ts`.

**Change.** (a) (Done: only section 'fish' registers sheets now. Its second half, spawning one fish bound to a preset's sheet on live install, was declined in PR #93's review because remote 'tanks' don't spawn fish either; revisit it only with (b).) (b) Scene import (M): new `core/data/azn.ts` `parseTank(res)` (needs F-01) returning size, backdrop, gravel, plants `[{frames, x, top, h, w, depth, name}]`, accessories, heater, water, feeder. PlPI tail: h = u16@260, w = u16@262, x = u16@264, top = u16@266 (top + h equals the AQUA height, so plants stand on the tank bottom; it is not a baseline), depth = u16@268. Map x by TANK.width/aquaW, put bottoms at the floor line (V-04), draw by ascending depth. Standalone .plt packs carry 1-2 PlPI placements too, giving default positions for F-04. Ask first with an alert: 'Replace the current scenery with “eden”? Your fish stay in the tank.'

**Acceptance.** Tests: azn.test.ts with a synthetic two-plant, one-accessory tank asserting top + h equals the tank height; a pure `layoutDecor()` for scaling and depth sort. Screenshot-check 3 presets.

**Merged and related.**

- Related: F-01 (needed for (b)), F-04 (default positions from PlPI), V-04 (floor line), B-15.
- Fourteenth pass: FIDELITY-13 (correction: .azn was AquaZone's tank document format) is filed as F-26.

Fourteenth-pass audit (62b8572): (a)'s pool fix landed: handleSheets
registers only section 'fish' (`web/main.ts:664-665`), and
`web/drop.ts` keeps .grv/.plt/.acc/.azn sheets out. Still open: tank
presets with sheets spawn no fish of their own (declined earlier in
PR #93's review, see the review-response log), and (b) is not started:
there is no `core/data/azn.ts`, and tanks only go through pickBackdrop
(`web/main.ts:782-783`).

### B-25 Dropping a file on Preferences, Tank Overview or Tank Stats navigates that window to the raw file

Size S · Severity medium · Value 3/5 · Risk 1/5

**Problem.** Only the tank (`main.ts:919-920`) and Import Add-ons (`addons.ts:39-40`) preventDefault drops. On the other pages WebKit's default drop action loads the file in the main frame, which the navigation delegate allows (file: is not http(s)). The borderless Mac OS 8 window is replaced by the raw file with no drawn close box, and because Osmium keeps the webview after close, reopening shows the broken page until restart. Inferred from WebKit behavior; not reproduced on a Mac.

**Evidence.** `macos/Finsical.swift:439-453` (decidePolicyFor allows every non-http(s) scheme), `web/prefs.ts`, `web/overview.ts`, `web/stats.ts`, `node_modules/osmium-ui/src/host.ts:80-175`, `node_modules/osmium-ui/macos/OsmiumWindows.swift:281`.

**Change.** In decidePolicyFor, after the http(s) branch: `if action.targetFrame?.isMainFrame == true, let s = action.request.url?.scheme, s != WebHandler.scheme { NSLog(...); decisionHandler(.cancel); return }` (no page navigates its main frame to blob: or data:). Optionally also cancel main-frame finsical:// loads of paths other than the five bundled pages. Defence in depth: dragover/drop preventDefault in prefs.ts, overview.ts and stats.ts, or upstream in osmium-ui's hostWindow().

**Acceptance.** Manual test: drop a PNG on each window; chrome stays; drops on the tank and Import still import.

Twelfth-pass update: the defence-in-depth half landed in PR #186 —
all three pages preventDefault `dragover`/`drop` unconditionally and
show `dropEffect: 'none'` for file drags. Still open: the native
`decidePolicyFor` cancel for main-frame non-http(s) loads (the real
fix; needs a Mac to verify).

Fourteenth-pass update (MACOS-06): still open on main, and its line
numbers moved: the tank drop handler is at `web/main.ts:1693-1694`,
Import Add-ons' at `web/addons.ts:39-40`, and decidePolicyFor at
`macos/Finsical.swift:701-715` cancels only http and https main-frame
loads. No drop handler exists in `web/prefs.ts`, `web/overview.ts`,
`web/stats.ts` or `node_modules/osmium-ui/src/` (grep), and
`node_modules/osmium-ui/macos/OsmiumWindows.swift:281` reuses the web
view, so a window stays broken until relaunch. The browser shell has
the same gap: a file dropped on a Preferences, Overview or Stats tab
navigates that tab away, which the page-side half (PR #186, open) also
fixes. Refined Change: page side, a small shared
`swallowFileDrops(target: EventTarget)` that calls preventDefault on
`dragover` and `drop`, called from prefs.ts, overview.ts and stats.ts
(compare with #186 before adding it); native side, in decidePolicyFor
after the http(s) branch, cancel and log any main-frame navigation
whose scheme is not `finsical` (file:, blob:, data:), which covers the
tank too; the Swift half compiles in the existing macOS CI job.
Acceptance addition: vitest with Node's EventTarget, cancelable
`dragover` and `drop` events dispatched after `swallowFileDrops` end
with `defaultPrevented`. Not reproduced on a Mac.

Thirteenth-pass update: #186 covers the web half; the native decidePolicyFor half remains open.

### B-27 Zoom and window tiling break the aspect ratio, so the silhouette mask no longer matches the art

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** contentAspectRatio only constrains live resize. Zoom (no windowWillUseStandardFrame, so the whole visibleFrame), title-bar double-click and macOS 15 tiling can set another aspect. The page letterboxes the case art (xMidYMid meet, min() scale plus offsets), but the image mask uses `contentsGravity = .resize` over the full layer and the shape mask scales by width only, so bezel edges get clipped and the refilled aperture misses the glass.

**Evidence.** `macos/Finsical.swift:262-301` (syncMask), `macos/Finsical.swift:144` (contentAspectRatio), `macos/Finsical.swift:600-602` (Window > Zoom), `web/main.ts:726-733` (layoutMachine letterbox), `web/index.html:21`, `web/machines.ts:47-50`.

**Change.** In syncMask compute the letterbox once: `let s = min(b.width/machineVbW, b.height/machineVbH); let art = CGRect(x: (b.width - machineVbW*s)/2, y: (b.height - machineVbH*s)/2, width: machineVbW*s, height: machineVbH*s)`; set `mask.frame = art` for the image mask (outside is transparent) and offset plus scale each shape rect by art.origin and s. Implement `windowWillUseStandardFrame(_:defaultFrame:)` returning the largest aspect-correct frame (ideally an integer tank scale, V-03) centered in defaultFrame.

**Acceptance.** Manual test on macOS 15: Window > Move & Resize > Left, Zoom and edge tiling keep the case intact with click-through margins.

**Merged and related.**

- Related: V-03 (integer tank scale), B-49.

Re-verified open at 62b8572 (fourteenth-pass audit): there is still no
`windowWillUseStandardFrame`, and Window > Zoom is `performZoom`
(`macos/Finsical.swift:911`).

### B-28 A second WebContent crash within 30 s leaves an invisible, empty always-on-top window

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** (Corrected in the fourteenth pass, MACOS-07: the earlier premise, that any crash leaves an invisible window, ignored WebKit's own reload policy.) AppDelegate is the navigation delegate for all five web views but implements no `webViewWebContentProcessDidTerminate`, so WebKit reloads a page itself after a crash, a memory or CPU limit kill or (on newer WebKit) an unresponsive kill, at most once until 30 s after the next successful main-frame load; newer WebKit defers a hidden view's reload until it becomes visible. A single crash therefore already recovers. What remains: a second termination within 30 s of that reload leaves the transparent tank with its mask but nothing painted, an invisible floating window with no signal, and terminations for other reasons (IdleExit, process-count limit) never reload. Client windows hit that way go blank and cannot be closed from their drawn chrome.

**Evidence.** `macos/Finsical.swift:69-71`, `macos/Finsical.swift:434-465`, `macos/Finsical.swift:498-499` (non-opaque, clear background).

**Change.** Implement `webViewWebContentProcessDidTerminate(_ v:)`, but not with a bare `v.reload()`: implementing the method switches WebKit's policy off, so it must keep the visible/hidden handling. Keep a per-web-view list of termination times. Reload at once if the view's window is visible; otherwise set a flag and reload in showClient before showing. On a third tank termination within 60 s, show an NSAlert "The aquarium stopped unexpectedly." with Reload and Quit instead of looping. Log which page died. The tank restores from localStorage and clients re-sync through hello because the new `boot` id forces a re-ask. (The tank's load-failure alert, `webView(_:didFailProvisionalNavigation:withError:)` and `didFail`, lands in PR #229 (open) with B-75.)

**Acceptance.** Manual: force-quit the tank's Web Content process once and the tank returns with the same fish (today and after the change). Kill it twice within 10 s and an alert appears instead of an invisible window. Kill the process of a closed Preferences window, reopen it, and it renders.

**Merged and related.**

- Part of the "native shell politeness" checklist (T-32).
- Fourteenth pass: MACOS-01 (Opened from Downloads (App
  Translocation), the app shows nothing because WebHandler rejects
  every file) is filed as B-75; its PR #229 (open) also adds the
  tank's load-failure alert this entry asked for.

Fourteenth-pass update (MACOS-07): the premise, Change and Acceptance
above were rewritten from WebKit's source. WebKit safari-612-branch
(the macOS 12 era) `Source/WebKit/UIProcess/WebPageProxy.cpp:331-332`
(resetRecentCrashCountDelay 30 s,
maximumWebProcessRelaunchAttempts 1), `:7738-7766`
(shouldReloadAfterProcessTermination;
dispatchProcessDidTerminate reloads when the client didn't handle it),
`:7769-7780` (a second attempt resets the count and does not reload),
`:5067` (the count resets 30 s after a main-frame load finishes);
WebKit main `WebPageProxy.cpp:14317-14383` (adds Unresponsive; hidden
views set `m_shouldReloadDueToCrashWhenVisible`);
`Source/WebKit/UIProcess/Cocoa/NavigationState.mm:1312-1315` (returns
"not handled" when the delegate lacks the methods).
`macos/Finsical.swift` still has no
`webViewWebContentProcessDidTerminate` (grep at 62b8572; the tank is
non-opaque with a clear background at `:761-762`). The old force-quit
acceptance therefore probably passes today, and severity drops from
medium to low (value 3/5 to 2/5). Source only; not run on a Mac.

Thirteenth-pass update: PR #234 (open): per-webview crash throttling, 0.5 s delayed reload, three retries per minute per view.

### B-30 Browsing add-ons evicts installed add-ons from the offline cache

Size M · Severity medium · Value 3/5 · Risk 2/5

**Problem.** Every browsed pack (detail views and each lazily fetched row thumbnail) is persisted into the same 150 MB LRU as installed add-ons, and trimPacks evicts oldest-first with no notion of installed. Installed packs were last touched by the launch restore, so a long browse evicts them first, breaking store.ts's promise that restores work offline. Scrolling Fish (~165 packs, 47 KB to 5.6 MB, 4-9 MB for the arow/disc/gup add-ons) plus a couple of scenery sections exceeds the budget. Flick-scrolling queues dozens of multi-MB downloads.

**Evidence.** `web/store.ts:73-84` (packGet refreshes `at` on hit), `web/store.ts:86-135` (trimPacks, PACK_BUDGET 150 MB at :90), `web/store.ts:137-162`, `web/import.ts:115-131` (fetchZip packPut), `web/import.ts:1039-1078` (row thumbnails fetch whole packs), `web/main.ts:333-337`, `web/main.ts:553-602`.

**Change.** (1) Pure `evictionPlan(recs: {url, at, bytes}[], budget, pinned: Set<string>): string[]` in store.ts: evict `thumb2:` (and legacy `thumb:`) keys first, then unpinned packs oldest-first; pinned entries are never evicted, even if the pinned set alone exceeds the budget. trimPacks reads `meta['pinned']` inside its transaction. (2) Export `packPinSet(urls)`; call it from recordInstall, removeAddon and once after importPanel.restore resolves with `[...new Set(installedAddons.map(a => a.url.split('#')[0]))]` (not from saveTank, which runs every 10 s). (3) Start a row's thumbnail fetch only after the row has been visible 300 ms (setTimeout in the IntersectionObserver callback, cancelled on exit).

**Acceptance.** Tests: vitest evictionPlan (pinned kept, thumbs first, over-budget pinned evicts only unpinned); rerun a scaled-budget (8 MB) Playwright check where an installed key survives browsing 40 fish rows.

**Merged and related.**

- Merged from passes 1-7: thumbnail entries share the pack budget deliberately, but fresh thumbs can still evict installed packs; pinning live installs (this entry) is that fix.
- Related: P-01, B-46, T-17 (store.ts tests).

Fourteenth-pass update (IMPORT-07): still open, and browsing the Fish
list alone now downloads more than the budget, so scrolling it once
can evict installed add-ons and break the promise that restores work
offline. `packGet` refreshes an installed pack's age at the launch
restore, so everything browsed afterwards is newer and the installed
packs go first; only `local:` drops are exempt. Evidence at 62b8572:
`web/store.ts:98` (PACK_BUDGET = 150 MiB = 157.3 MB),
`web/store.ts:101-150` (trimPacks; local exemption at :132,
oldest-first at :136), `web/import.ts:179-201` (fetchZip persists
every archive.org download), `web/import.ts:1232-1264` (row thumbnails
fetch whole packs), `web/import.ts:1145` (`thumb2:` keys share the
budget). Byte totals recomputed in verification: US fish zips 115.7
MB, JPN fish 39.5 MB and the bonus zip 5.6 MB, about 161 MB in all,
slightly over the budget before any `thumb2:` entries. The reviewer's
`drv/mem.ts` also measured about 668 MB of decoded pixels held by
packCache (P-01) and 6.8 s of total decode (P-02). Not re-run in a
browser. Correction applied to the Change: the thumbnail keys are now
`thumb2:`, not `thumb:`. The Change otherwise stands
(`packPinSet(urls)` stored in meta, called from recordInstall,
removeAddon and once after the launch restore with `url.split('#')[0]`
so nested add-ons pin their parent zip; a row's thumbnail fetch waits
until the row has been visible for 300 ms), and so does the Acceptance
(PACK_BUDGET patched to 8 MB, an installed pack's IDB key survives
scrolling 40 Fish rows).

### B-33 Tail-wag ignores the species' own animation scripts (AMV#/BMV#)

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** Each species ships idle and swim scripts (AMV# adult, BMV# baby): a big-endian u16 count followed by big-endian frame indices. Several are non-linear: clownfish Baby Idle is 0,0,1,1,2,2,1,1,...; ネオンテトラ adult Idle is 0,1,2,3,3,3,3,4,5,6,6,6,7,0,0,0 (held glide frames); メダカ adult scripts too. animFrame cycles linearly, so these fish jump from the last frame to the first.

**Evidence.** `web/main.ts:1016-1025` (animFrame cycles 0..nf-1), `core/pose.ts`.

**Change.** After F-01, parse scripts into the species model (clamp each index to framesPerGroup-1). Add a pure `scriptFrame(script, phase)` in core/pose.ts; use the Idle script when `f.speed < 0.4*f.cruise`, else Swim, indexing `script[floor(phase) % script.length]`, falling back to the linear cycle.

**Acceptance.** Tests (pose.test.ts): the clownfish fixture maps phases 0..7 to 0,0,1,1,2,2,1,1; the neon prefix [0,1,2,3,3,3,3,4].

**Merged and related.**

- Needs F-01.
- Fourteenth pass: SIM-07 (fish never pause: add rest moves where a
  calm fish hangs in the water for a few seconds) is filed as D-35.

### B-34 Two tank tabs both execute every command and overwrite one save

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** In a browser every tank tab opens BroadcastChannel('finsical'), answers every intent (one install gives 2 downloads and 2 acks) and writes `finsical:tank` every 10 s, so the last writer wins. Clients receive alternating states with different `boot` ids, and Overview keeps resetting its thumbnail requests. Browser-only; the native shell has one tank.

**Evidence.** `web/main.ts:35`, `web/main.ts:92`, `web/main.ts:97`, `web/main.ts:379`, `web/main.ts:516-547`, `web/bus.ts:34-36`, `web/overview.ts:43-47`.

**Change.** Gate the tank on a Web Lock: start `passive = true`; `navigator.locks?.request('finsical-tank', {ifAvailable: true}, lock => lock ? (passive = false, postState(), new Promise(() => {})) : showAlreadyOpen())`. While passive, onBusMessage returns early, saveTank and its interval do nothing, and an alert says 'Finsical is already open in another tab.' Fall back to a BroadcastChannel ping/pong when navigator.locks is missing; skip the lock entirely when inNativeShell().

**Acceptance.** Verify with two tabs: 1 state reply and 1 ack per request.

**Merged and related.**

- Merged from pass 8 ("Bus messages and multiple browser tanks lack an authority boundary", old ID B14): choose one active browser tank or scope sessions and companion windows by tank ID; test malformed messages, two tanks, reconnect and companion-before-tank; the native relay stays unchanged. The envelope-validation half is T-18.
- F-26 (save slots) should build on this rather than on competing global save keys.

Fourteenth-pass update (TANK-10): still open on main. Nothing in
`web/` uses `navigator.locks` (grep); every tab answers the bus
(`web/main.ts:1005-1048`) and saves every 10 s (`web/main.ts:246`). A
second tank tab (the same URL opened again, or a duplicated tab) runs
its own diverging simulation, answers every hello and intent, plays
its own sounds and writes `finsical:tank` alongside the first. Re-run
at runtime (`tank-verify/twotabs.mjs`): with two tank pages in one
context, one 'hello' gets 2 'state' replies with different boot ids;
in the reviewer's run, forcing pagehide in each tab wrote different
fish positions to the same key. The reviewer's claim that the menu bar
makes this easier doesn't hold: it opens client pages, never a second
tank. Refined Change: a tab without the lock stays fully passive (no
bus replies, no saves, no audio and no ticks) and shows a Mac OS 8
note alert, "Finsical is already open in another tab.", with a "Use
This Tab" button that re-requests the lock with `{steal: true}` and
reloads; skip the lock in the native shell; `navigator.locks` needs
Safari 15.4, so keep the BroadcastChannel fallback for the platform
floor. Acceptance, Playwright with two tabs: each hello gets one state
reply and each request one install ack; the passive tab shows the
alert; "Use This Tab" moves the lock and the other tab goes passive.

Thirteenth-pass update: PR #233 (open): a localStorage lease elects one owner; losers go read-only with an alert and bfcache restores re-claim.

### B-35 With the CRT effect on, clicks do not land where the curved, overscanned picture shows

Size M · Severity low · Value 3/5 · Risk 2/5

**Problem.** The shader applies overscan zoom, width/height pots and barrel warp before sampling, but pointerdown uses flat object-fit math. At defaults the worst offset is ~13 tank px and 12% of the screen is black curved border that still accepts clicks; hsize=0 gives 48 px and 34% black. The feed band shifts too.

**Evidence.** (Updated in the fourteenth pass; the refs were `web/main.ts:100-111` and `web/crt.ts:59-79`.) `web/main.ts:250-254` (`tankPoint` uses `containPoint` on `canvas.getBoundingClientRect()`), `web/main.ts:284` and `:332` (pointer handlers on #tank only), `web/main.ts:408-417` (`layoutInfo`, flat mapping), `web/main.ts:1437-1447` (a document pointerdown outside #screen starts a window drag), `web/main.ts:1400-1404` (#crt spans the glass), `web/crt.ts:97-136` (FRAG uv chain: zoom, size pots, skew, keystone, barrel), `web/app.css:45-50`.

**Change.** (Rewritten in the fourteenth pass from VISUAL-03: since #171 the CRT canvas spans the whole glass and #178 added skew and keystone, so mapping from #tank's flat rect no longer covers the displayed picture.) Export a pure `crtScreenToRaster(u, v, cfg): {x: number, y: number} | null` from `web/crt.ts` reproducing FRAG in order (zoom crop, size pots, skew shear, keystone divide, barrel; y is up in the shader), null outside 0..1, with "keep in sync with FRAG" comments on both sides. When the CRT is enabled, route the tank's pointer handlers through a mapper that takes client coordinates relative to #crt's rect (the whole glass), converts them to raster uv with `rasterInGlass(machine)` and applies `crtScreenToRaster` (then x = su*320, y = (1 - sv)*200). Set `canvas#crt { pointer-events: auto }` under `body.crt` and attach the handlers to it too; it is inside #screen, so the drag exclusion's `closest("#screen")` already covers it. `layoutInfo` needs the inverse (raster to screen); the barrel term has no closed form, so invert with 3-4 fixed-point iterations of the forward map. Fix the stale comment at `web/crt.ts:93-94`: since #171, `gc` is relative to the raster box (uRect), not the glass.

**Acceptance.** Tests (crt.test.ts): identity at curvature 0 with neutral pots; the center is a fixed point; the corner at curvature 1 is null; zoom=1 with the other pots neutral maps u=0.95 to ~0.902; skew=1 moves the top-centre by about 0.125 of the width; perspective=1 returns null at the looming edge; the inverse round-trips within 0.01 tank px at defaults. Playwright: Performa, CRT on, vsize 1: a click at the displayed waterline drops food and posts no `dragWindow`, and hovering there shows the crosshair.

Twelfth-pass note: `canvas#crt` has `pointer-events: none`, so while
the CRT is on, clicks over the visible picture still hit `#tank` —
correct in intent, but the hit target and the picture disagree under
overscan/curvature. Same fix as this entry (N-12 in the twelfth-pass
review).

**Merged and related.**

- Fourteenth pass: VISUAL-13 (at full Perspective the looming edge
  spills off the glass and hides about 37 tank px) is filed as V-35.

Re-verified open at 62b8572 (fourteenth-pass audit): `tankPoint` maps
through the flat `containPoint` (`web/main.ts:250-254`) and there is
no `crtScreenToRaster`; #178's skew and perspective
(`web/crt.ts:104-118`) add more warp that clicks ignore, so the entry
is worse since #178.

Fourteenth-pass update (VISUAL-03): the offsets are now much larger
than the Problem above measured. With raised size, overscan, skew or
perspective pots the displayed picture moves well outside #tank, while
pointer handling still maps through #tank's flat object-fit rect. With
Height at max on the Performa 450, the displayed waterline and air
strip (the feed zone) sit above #tank: a click there lands on
`#screenback`, which the document handler treats as a window drag (in
the native app the window moves instead of feeding), while clicks on
the top rows of #tank feed although they show water. The Get Info
card is placed by the same flat mapping. At defaults the offsets stay
small, so this matters when you raise the pots. Re-run in verification
(Performa 450, CRT on, vsize 1, 1100x800): #tank's top is at 108.2 px;
`elementFromPoint` in the displayed glass above it returns
`screenback`, and a real mouse click there posted `dragWindow` on the
bus (1 post); a screenshot shows the displayed waterline about 15 px
above #tank's top. The reviewer's Python replica of the uv chain (max
/ median offset in tank px: defaults 16.5 / 2.9; vsize=1 18.1 / 9.7;
skew=1 63.0 / 20.7; perspective=1 126.3 / 14.5; hsize=0 79.6 / 30.2)
was not re-run. Correction: `#fishtip` is placed at the pointer
(`web/main.ts:345-348`), so only which fish it names is wrong, not
where it appears. Size, value and the Change above were raised to
match (S to M, value 2/5 to 3/5).

### B-36 After a GPU context loss the CRT stays off for the session and Preferences still shows it on

Size M · Severity low · Value 2/5 · Risk 3/5

**Problem.** webglcontextlost sets `lost = true` permanently and nothing handles webglcontextrestored (GPU switches or sleep on dual-GPU Macs). The loss posts no state, so Preferences shows On until the next heartbeat. main.ts's `crtOn` stays true, so the next toggle silently turns it 'off' and the one after stores '1' while setEnabled returns early.

**Evidence.** `web/crt.ts:229-236` (lost = true forever), `web/crt.ts:324-329`, `web/main.ts:665-675`, `web/main.ts:800`, `web/main.ts:834`.

**Change.** Refactor initCrt's GL setup (shaders, program, buffer, texture, uniforms, upload) into `setup(): boolean`, called at init and on 'webglcontextrestored' (which clears `lost`). Track `wanted` (last setEnabled request) and re-enable after restore. Add `initCrt(canvas, { onChange })` fired on loss and restore; main.ts passes postState. Toggles use live state: `setCrt(!(crt?.enabled ?? false))` at main.ts:800 and :834.

**Acceptance.** Verify with WEBGL_lose_context: loseContext() pushes state within 1.5 s; restoreContext() brings the CRT back.

Re-verified open at 62b8572 (fourteenth-pass audit): grep finds no
`webglcontextrestored` in `web/`. postState's live `usable` does
correct Preferences at the next push, so the stale 'On' lasts one
heartbeat.

Fourteenth-pass update (PERF-06, folded in here): the CRT's WebGL
context and 18-tap shader are built at launch although the effect is
off by default. `main.ts` calls `initCrt()` while the module
evaluates, creating a WebGL context, compiling and linking the CRT
program and allocating its texture on every launch; the context then
lives for the session. The context attributes pass no
`powerPreference`; WebKit is believed to use the integrated GPU unless
'high-performance' is requested, so a 'low-power' hint is probably a
no-op there (unverified either way). Evidence: `web/main.ts:1267`
(`const crt = initCrt(canvas)` at module scope), `:1275-1288`
(setCrt), `:885-887` (postState reports crt.usable/enabled), `:1349`
(saved CRT preference applied at launch); `web/crt.ts:402-405`
(getContext without powerPreference), `:420-452` (compile, link,
buffer, texture). Re-run in verification (perf/boot.mjs, 3 runs each):
first long task 86/83/85 ms with initCrt and 75/83/77 ms with `crt =
null`, about 6 ms; DOMContentLoaded showed no consistent difference
(143/129/131 against 132/144/125 ms), so the reviewer's 15 ms
DOMContentLoaded saving was not reproduced; no steady-state difference
(GPU process 240-260 ms per 8 s either way). Do this only as part of
this entry's `setup()` refactor: create the context and program on the
first `setCrt(true)` (remembering a null result), report `available`
optimistically until the first attempt fails, replay the stored config
and raster box into the new filter, and add `powerPreference:
"low-power"` as an explicit hint. Acceptance addition, Playwright with
the CRT off: a spy on `HTMLCanvasElement.prototype.getContext` sees no
'webgl' call and Preferences still offers the CRT checkbox; pressing C
creates the context, plays the warm-up and uses the saved config and
raster box; with getContext stubbed to return null, enabling reports
unavailable and the plain path stays visible.

### B-37 (remainder) The in-tank add-on browser misses removals made in other windows

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** main.ts never calls importPanel.notify(), so the browser/touch overlay (Cmd/Ctrl+I) keeps its checkmark and 'Add Again' after an Overview removal, and after an install from another window its 'Add to Tank' adds a duplicate fish.

**Evidence.** `web/main.ts:360-369`, `web/main.ts:553-602` (removeAddon), `web/main.ts:601` (posts 'uninstalled'), `web/import.ts:1099-1107` (markInstalled), `web/import.ts:1121` (applyAddon guard), `web/import.ts:1201-1224` (notify).

**Change.** Do NOT feed postState into notify: postState runs during module evaluation (main.ts:703, :791) before importPanel.restore (main.ts:891), so a state notify would mark every saved add-on installed and restore() would skip them all. Instead: in import.ts notify() add `else if (m.op === 'uninstalled' && typeof ackUrl === 'string') markInstalled(ackUrl, false);` (the remote panel already receives 'uninstalled'); in removeAddon after the splice call `importPanel.notify({ op: 'uninstalled', url })`, so `emptyTank` (`web/main.ts:1148`), which goes through removeAddon, is covered too. (The install half, notifying 'installed' after a successful install, landed.) Ship it with B-43, which touches the same markInstalled/offer path.

**Acceptance.** Playwright: stocked tank, overlay open; remove an add-on (brownsand, or banggai) in Overview: the overlay's row loses `.done` and selecting it offers 'Add to Tank'. A reload still restores every remaining saved add-on.

**Merged and related.**

- Merged from pass 8 (removal race): the in-page panel keeps its own installed set that main-page removals don't reach; keep both panel forms in sync.
- Refuted variant: notifying with `op: 'state'` (see "Declined, refuted and corrected").

Fourteenth-pass audit (62b8572): the install half is fixed:
installAddon calls `importPanel.notify({op: 'installed'})` on success
and on duplicates (`web/main.ts:1183`, `:1197`). Still open:
removeAddon only posts 'uninstalled' on the bus (`web/main.ts:1130`),
which a BroadcastChannel never delivers to its own page, and
`notify()` has no 'uninstalled' branch (`web/import.ts:1409-1432`;
markInstalled at `web/import.ts:1307-1315`).

Fourteenth-pass update (TANK-09, UI-05): two reviewers re-found the
removal half. In the browser, Tank > Import Add-ons opens the in-page
overlay and Window > Tank Overview opens Overview, so removing an
add-on in Overview and going back to the overlay is now the everyday
path; the overlay keeps the checkmark and offers "Add Again", which
adds a copy. In the reviewer's Playwright run (`tank/b37.mjs`) the
overlay checks banggai, clownfish and neon; after bus
`removeAddon(banggai)` the tank drops banggai and its fish, but the
overlay still checks all three. The UI reviewer's repro
(`ui/sync3.mjs`) showed done=['brownsand'] and 'Add Again' after
removing that gravel. Both confirm the fix above and that `op:
'state'` stays refuted (it runs before restore).

### B-39 Saving a sound reports success even when nothing was written

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** rw() never rejects, so metaPut and sndsMerge resolve on failed writes; addons.ts's catch is unreachable and it posts soundsLoaded for a sound that did not persist. Worse, sndsMerge reads through the same rw(), so a failed read looks like 'no record' and `capSnds(null, records)` can overwrite the store with only the new records.

**Evidence.** `web/store.ts:53-71` (rw resolves null on every failure), `web/store.ts:182-184` (metaPut), `web/store.ts:220-230` (sndsMerge), `web/addons.ts:56-63`, `web/main.ts:354-355`.

**Change.** Make rw() distinguish a miss from a failure (`{ok: true, value} | {ok: false}`, or an rwStrict() for the snds path). sndsGet throws on failure; metaPut resolves a boolean; sndsMerge throws if the read failed (never overwrite on an unknown baseline) or the write returned false. Keep packPut fire-and-forget.

**Acceptance.** Test: a pure `mergeInto(get, put, records)` in store.ts rejects when put resolves false and when get fails, and never calls put after a failed get.

**Merged and related.**

- Merged from pass 8 ("Sound persistence can lose data"): `rw` serializes read/modify/write only within one module instance, and the tank and Add-ons pages use separate instances, so overlapping merges can clobber each other: make read/merge/write one IndexedDB readwrite transaction. The legacy-thumbnail migration deletes its source after a null `packPut`: remove a migration source only after commit, and distinguish cache failures from user-data failures.
- Fourteenth pass (AUDIO-01, under B-18): the launch restore calls sndsMerge on every launch, so until B-18's change or PR #201 lands, this failure path (a failed read, then `capSnds(null, recs)` overwriting the store with only the bank) is exercised on every launch.

Twelfth-pass update: PR #201 lands the miss-vs-failure fix —
`rwStrict()` (null on a real miss, reject on failure) drives
`sndsMerge`/`sndsRemove` through pure `sndsMergeInto(get, put,
records)`; a failed read no longer overwrites the store and a failed
write no longer reports success. Still open from the merged note:
cross-instance serialization (tank and Add-ons pages can still
clobber each other's merges) and the legacy-thumbnail migration
ordering.

Thirteenth-pass update: #201 covers the main case; #199 (open) tightened the merge and error paths further.

### B-40 Each sound dropped on Import Add-ons re-decodes all stored sounds and restarts the ambient loop

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** On soundsLoaded the tank decodes every stored record (up to 64 MB). addWavs stores fresh AudioBuffers, so `now !== this.ambientBuf` restarts an imported 'aqua' loop from the top on every unrelated drop.

**Evidence.** `web/main.ts:534-546` (soundsLoaded handler), `web/audio.ts:44-68` (addWavs), `web/addons.ts:63`.

**Change.** addons.ts posts `{op: 'soundsLoaded', names: recs.map(r => r.name)}` (after qualifySoundNames) and the tank decodes only those. TankAudio tracks `ambientName` (the key find('aqua') chose) and restarts only when that name changes or is in the incoming batch. At launch skip records already added by the restore chain (or by `from`, B-18).

**Acceptance.** Test (audio.test.ts, fake context): addWavs([{name:'drip'}]) while an imported 'aqua' loops causes 0 stop() calls.

**Merged and related.**

- Merged from passes 1-7: verify `startAmbient()` never overlaps loops audibly during rapid load or restart (T-17 has the test).
- Fourteenth pass: AUDIO-01 (launch loads the sound bank twice, rewrites it to IndexedDB, and holds all sound behind the add-on restore) is filed as B-18; its step 4 is this entry's change and closes it, and its Playwright run measured this restart: posting `{op:'soundsLoaded'}` from a second page gives 25 decodes, then the loop stops at context time 7.6 s and restarts from the top.

Re-verified open at 62b8572 (fourteenth-pass audit): the soundsLoaded
handler decodes every stored record (`web/main.ts:1035-1046`), and
addWavs restarts on a new buffer object (`web/audio.ts:133-143`).

Thirteenth-pass update: PR #221 (open): manifests merge and the ambient restarts only when the winning pick's content probe changes.

### B-41 (remainder) Quitting the Mac app can lose the last 10 seconds of tank state

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** Cmd-Q or closing the tank calls NSApp.terminate; WKWebView tears down its content process without page lifecycle events, so fish positions, hunger and water since the last interval save are lost. Nothing saves on visibilitychange (minimize, occlusion). Installs save immediately, so the loss is small. Not verified on a Mac.

**Evidence.** `web/main.ts:96-97` (pagehide + 10 s interval), `web/main.ts:798-800` (window.finsical), `macos/Finsical.swift:408-410` (windowWillClose terminates), `macos/Finsical.swift:529`, `macos/Finsical.swift:551-553`.

**Change.** (The web `visibilitychange` save landed; narrowed in the fourteenth pass.) main.ts: add `save: saveTank` to window.finsical. Swift: `applicationShouldTerminate` returns `.terminateLater`, evaluates `window.finsical?.save?.()`, and in the completion handler calls a once-only reply that runs `NSApp.reply(toApplicationShouldTerminate: true)` after a 250 ms grace, with a 1.5 s fallback timer. Set `window.isReleasedWhenClosed = false` on the tank, since termination now outlives windowWillClose.

**Acceptance.** Manual test: move fish, quit within 1 s, relaunch, positions match.

**Merged and related.**

- The web half (`visibilitychange` save) overlaps open PR #135. The Swift `terminateLater` half is open either way.

Fourteenth-pass audit (62b8572): the web half landed:
`web/main.ts:240-246` saves on visibilitychange to hidden and on
pagehide, plus the 10 s interval. Still open: the Swift half.
`macos/Finsical.swift` has no `applicationShouldTerminate` or
`.terminateLater` (windowWillClose terminates directly,
`macos/Finsical.swift:541-543`), and `window.finsical`
(`web/main.ts:1506-1512`) has no `save`.

Fifteenth pass: the tank now saves on `pagehide` and
`visibilitychange`, and an import reload suppresses stale saves
(PR #256); the native Cmd-Q teardown path is still unverified.

### B-42 (remainder) Slow-starting archive.org downloads share the 30 s stall budget; no separate first-byte allowance

Size S · Severity low · Value 3/5 · Risk 2/5

**Problem.** fetch() has no AbortSignal or timeout. A never-settling promise stays memoized (entries are deleted only on rejection), so the row shows 'Fetching add-on…' with Add disabled until reload, and it holds one of the THUMB_PAR = 3 thumbnail slots forever; three stalls stop all thumbnails. A stalled listing leaves the listing text up forever.

**Evidence.** `web/import.ts:115-131` (fetchZip), `web/import.ts:139-183` (listPage), `web/import.ts:441-449` (packCache memo), `web/import.ts:776-866`, `web/import.ts:1039-1057` (pumpThumbs, thumbRunning-- in .finally), `web/import.ts:520-529`.

**Change.** (Narrowed in the fourteenth pass: the 30 s stall timeout, evicted memos and the abort wording landed as `fetchTimed`; what remains is its separate first-byte budget.) Give `fetchTimed` a `firstByteMs = 60_000` next to its 30 s idle budget. The original plan: `fetchWithTimeout(url, { firstByteMs = 60_000, idleMs = 30_000 })`, an AbortController with a first-byte timer before fetch() resolves (archive.org's zip view on multi-GB zips is slow to the first byte), then read `r.body.getReader()` re-arming an idle timer per chunk; on timeout abort and throw `new Error(`${url}: timed out`)`. Use it in fetchZip and a text variant in listPage. loadProblem: `if (msg.endsWith(': timed out')) return "archive.org stopped responding. Try again."`. The existing reject-deletes-memo logic then frees Try Again and the slots.

**Acceptance.** Tests: vitest with fake timers: headers that never arrive reject after 60 s, not 30 s; a stubbed fetch whose body never enqueues still rejects after 30 s idle.

**Merged and related.**

- Overlaps open PR #134 (a 30 s progress-resetting stall timeout, `thumbFetching` dedupe, rejected memos evicted, host-neutral message). With #134 merged, what remains is the 60 s first-byte timer and the `loadProblem` wording. U-24 builds on the same helper.

Fourteenth-pass audit (62b8572): #134's part landed. `fetchTimed`
aborts after 30 s without progress, including before headers, and
re-arms per chunk (`web/import.ts:140-178`); the listing uses it too
(`web/import.ts:236`); rejected memos are evicted
(`web/import.ts:198`, `:601`); and loadProblem maps an abort to 'The
download took too long' (`web/import.ts:685-687`), so the wording item
is done. Still open: a separate, longer first-byte budget (60 s) for
archive.org zip views that are slow to start.

### B-43 The add-on detail status line contradicts the button after install state changes

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** showDetail writes the status once; later only offer() re-runs and it changes only the button. After a removal in Overview the pane says 'Added to the tank.' next to 'Add to Tank'. After the 15 s 'No response from the tank' timeout, a late ack flips the button to 'Add Again' but leaves the 'No response' text.

**Evidence.** `web/import.ts:822-824`, `web/import.ts:846-851` (15 s timeout), `web/import.ts:855-859` (offer), `web/import.ts:1099-1113` (markInstalled), `web/import.ts:1201-1224`.

**Change.** Compute `summaryLine` once in showDetail and have offer() set both: status = `installed.has(url) ? 'Already in the tank.' : summaryLine`, plus the button. ackInstalled keeps the one-shot 'Added to the tank.' (the heartbeat only calls markInstalled for changed URLs, so it will not overwrite it). In the timeout branch remember `lateRef = ref`; in markInstalled, when `on && detailRef === lateRef`, show 'Added to the tank.' plus Add Again and clear lateRef.

**Acceptance.** Test: install, remove in Overview; the pane shows 'Already in the tank.' before and '1 pack, fish.' after.

Fourteenth-pass update (UI-06): still open. `markInstalled(url,
false)` re-runs `offer()`, which only retitles the button, and the
status line written once by showDetail stays, so after a removal
elsewhere the pane says 'Already in the tank.' beside 'Add to Tank'.
Evidence at 62b8572: `web/import.ts:1025-1027` (status written once),
`web/import.ts:1063-1066` (offer sets only the button),
`web/import.ts:1307-1315` (markInstalled). Verified in code; the
reviewer's runtime repro (`ui/b43.mjs`) showed status 'Already in the
tank.' with button 'Add to Tank' after the removal. The Change stands;
ship it with B-37's removal notify (UI-05), which touches the same
markInstalled/offer path. Acceptance addition, Playwright as in
`ui/b43.mjs`: after the removal the status reads '1 pack, scenery.'
and the button 'Add to Tank'; reinstalling from the tank flips it back
to 'Already in the tank.'.

### B-44 17 damaged Japanese accessory files never load and offer a useless 'Try Again'; intact copies sit in the main item's 7z

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** FOSSIL1-3, FOSS_PL1-2, R_STONE1-2, WOOD1-4, WOOD_MS1-4 and WOOD_PL1-2 (.ACC under AQUAZONE ITEM/アクセサリー, uppercase 8.3 names) start `22 00 25 00 00 00 00 00 00 25 00 08 ...` instead of `00 01 00 00`. isPack rejects them, the panel says the download has no add-on in it and offers Try Again on a deterministic failure; the rows never get thumbnails. (Corrected in the fourteenth pass, IMPORT-03: they are not a legacy format, as this entry assumed, but a damaged extraction. Each file is one 2048-byte ISO 9660 directory sector repeated to the file's length, with entries '.', '..', Apo_rigi.plt, Back01.bmp and so on, matching little- and big-endian extent and size fields, and flag 0x02 on the first two entries, so no decoder can recover them.) Every one of the 17 has a byte-size-identical, decodable copy in 'Missing addons Aquazone.7z' (MA_*.acc, and 'MA Wood1-4.acc').

**Evidence.** `core/data/fsh.ts:33-35` (isPack magic 0x100 only), `web/import.ts:346-364`, `web/import.ts:860-865` (catch offers Try Again), `web/import.ts:524`.

**Change.** (Replaced in the fourteenth pass from IMPORT-03: the old plan, an 'unreadable' verdict with dimmed rows plus a decoder for 'u16-LE length-prefixed records', assumed a format that does not exist.) Serve the intact copies instead. Add `substitute?: Record<string, string>` to Collection: a listed basename mapped to a path under `MISSING_ROOT + 'ITEMS/'`. Fill it on the JPN accessories entry with the 17 mappings (`FOSSIL1.ACC -> 'Stone accs/MA_Fossil1.acc'`, `WOOD1.ACC -> 'Wood accs/MA Wood1.acc'`, and so on). In listCollection's loose branch, a substituted entry gets `url = ${BASE}/${DEFAULT_ITEM}/${encodeURIComponent(MISSING_7Z)}/` + `encodeURIComponent(MISSING_ROOT + 'ITEMS/' + path)`, and `inner` is kept. No save migration is needed, because these installs never succeeded. Optional: a pure `isIsoDirectorySector(d)` in core/data, so any other damaged file shows "This add-on's file is damaged in the archive." with no Try Again. Coordinate with F-21: if the 7z's Accessories folder is ever listed, hide these 17 JPN rows instead of substituting them, or the Stone and Wood items appear twice.

**Acceptance.** Vitest: a JPN loose-listing fixture containing FOSSIL1.ACC yields a URL containing `Missing%20addons%20Aquazone.7z/Missing%20addons%20Aquazone%2FITEMS%2FStone%20accs%2FMA_Fossil1.acc`; `isIsoDirectorySector` is true for a synthetic '.' record and false for a pack. Playwright: Accessories > FOSSIL1 shows a preview, and Add to Tank places the fossil.

Twelfth-pass update: the UI half landed in PR #197 —
`isLegacyPack()` (`0x00250022` signature in `core/data/fsh.ts`),
legacy-only downloads throw "unreadable legacy pack" → "Finsical
can't read this add-on yet.", `.irow.unusable` dims the rows, no Try
Again; mixed zips install their readable packs and skip the legacy
entries. Still open: the decoder follow-up (u16-LE length-prefixed
records; sample FOSSIL1.ACC) — the verdicts are in-session only, so
a future decoder needs no cache-bust key.

**Merged and related.**

- F-21 (the 'Missing addons Aquazone.7z' library): substitute or hide,
  never both.

Fourteenth-pass update (IMPORT-03): the entry's premise, Change and
Acceptance were rewritten (see the Problem's correction). Evidence at
62b8572: `web/import.ts:82-83` (the JPN accessories collection),
`web/import.ts:1066-1073` (the catch offers Try Again),
`core/data/fsh.ts:33-35` (isPack). Verification (python over
`import/jacc/`): all 17 parse as 45 ISO 9660 records with consistent
LE/BE fields, and every file equals its first sector repeated. All 17
sizes match their 7z counterparts exactly (7z.html `id="size"`), for
example FOSSIL1 83140 = MA_Fossil1.acc and WOOD_PL2 70440 =
MA_Wood_pl2.acc. Fetching `.../Missing%20addons%20Aquazone.7z/` +
`encodeURIComponent('Missing addons Aquazone/ITEMS/Stone
accs/MA_Fossil3.acc')` and the Wood accs MA_Wood_pl2.acc returned HTTP
200 with the expected sizes, about 3.3 s each. The 7 copies the
reviewer fetched all decode (`drv/scenery.mjs accessories ma`), for
example 'MA_Fossil1.acc => decor 1f 349x169' and 'MA Wood1.acc =>
decor 439x159'. Screenshot `import/e3-FOSSIL1.png`: "Couldn't load it.
The download has no add-on in it." with Try Again. The decoder
follow-up and the 'dim the row' plan are dropped. PR #197 (open) dims
these 17 rows as an unreadable legacy format; with the substitution
they load, so its legacy-pack verdict no longer applies to them
(reconcile #197 with this change, for example by turning its
`0x00250022` signature check into the `isIsoDirectorySector`
fallback). Value raised from 2/5 to 3/5: the fix brings 17 accessories
back.

Thirteenth-pass update: #197 added the legacy signature; #199 (open) drops Try Again on deterministic decode failures.

### B-46 (remainder) Offline or cache-miss restores: nothing says which add-ons are waiting for archive.org

Size M · Severity low · Value 2/5 · Risk 2/5

**Problem.** When an installed add-on's bytes are not in IndexedDB and archive.org is unreachable at launch, restore() logs a warning, fish fall back to placeholder rectangles, nothing says why, and nothing retries when the connection returns. Overview keeps showing the species as swimming. B-30's pinning makes the trigger rarer but not impossible (IDB-only failures).

**Evidence.** `web/import.ts:1231-1246` (restore only logs failures at :1241-1242), `web/main.ts:875-900`, `web/store.ts:90-130`.

**Change.** (Narrowed in the fourteenth pass: the retries landed.) The state push adds `missing: string[]` (the add-ons whose restore is still pending); overviewmodel shows 'Waiting for archive.org', and statsmodel adds 'N add-ons couldn't load; they'll come back when you're online.'

**Acceptance.** (derived) Playwright: offline reload: Overview shows 'Waiting for archive.org' on the missing add-ons and Stats the 'N add-ons couldn't load' line; back online, sprites replace the placeholders without a reload and both lines clear.

**Merged and related.**

- Overlaps open PR #122 (failed restores retry at 15 s and 60 s; one deduped `online` listener arms a fresh round). With #122 merged, what remains is `missing` in the state push and the Overview and Stats wording.
- Related: U-28 (visible failure states), B-30.

Fourteenth-pass audit (62b8572): #122's retries landed: failed
restores retry at 15 s and 60 s, then once per deduped 'online' event
(`web/main.ts:741-775`). Still open: there is no `missing` list in the
state push, and Overview and Stats never name the add-ons waiting for
archive.org (grep); the status wording overlaps U-28.

Thirteenth-pass update: Folded into PR #193 (open).

Sixteenth pass (R-3 and U-2 of `tmp.md`): re-verified and widened.
The launch-side retry still tells nobody anything: `retryRestores`
ends in `.catch((e) => console.warn("add-on restore retry failed:",
e))` (`web/main.ts:1205-1207`), so once the 15 s/60 s/online rounds
have failed, the reason exists only in the tank page's console while
Overview keeps showing the species as swimming and the pack as
installed. The launch chain deliberately leaves whatever the chain
picked in place on the assumption a retry will happen; when it does
not, nothing surfaces. Same fix as this entry's Change — carry the
failed URLs into the state push (either this entry's `missing:
string[]`, or `restoreFailed: string[]` on the tank side feeding the
existing `installFailed` wording in Import), and render them where
add-ons are listed. Additive field; clients ignore unknown fields
today, so no protocol break. Pairs with U-28's visible failure states.

### B-47 Dropping a folder imports every audio file inside it, reading each up to 32 MB

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** Every non-pack file under 32 MB in a dropped folder tree is read fully into memory and every .wav/.mp3/.aiff/.m4a/.ogg/.flac becomes a record, all decoded to PCM in one batch, persisted up to 64 MB, with the first one played. Dropping an add-on folder that includes music, or a Music folder by mistake, pulls hundreds of tracks in with no feedback and no way to remove them.

**Evidence.** `web/main.ts:903-918` (walkEntry recurses), `web/main.ts:959-982`, `web/main.ts:343-358`, `core/data/snd.ts:381-390`, `web/audio.ts:44-56`, `web/store.ts:193`, `web/store.ts:231-268`.

**Change.** Accept audio files only when dropped directly (depth 0, empty walkEntry prefix); inside folders consider only .rsrc/.bin/.hqx and pack files. Cap one drop at 16 sound records and 64 MB of input; report skipped files in the drop feedback (U-10). Confirm before decoding more than 3 music files ('Import 12 sounds?'). Put the filter in a pure `planDrop(paths, sizes)` in `web/drop.ts` with vitest.

**Acceptance.** (derived) Vitest `planDrop` cases: audio at depth 0 accepted, audio inside a folder skipped, the 16-record and 64 MB caps enforced, skipped files reported.

**Merged and related.**

- Merged from passes 1-7: the drop path read every file twice (head slice plus full buffer, up to 32 MB); reuse the head bytes for sniffing. Open PR #94 says it reads each file once; verify.

Re-verified open at 62b8572 (fourteenth-pass audit): walkEntry
recurses (`web/main.ts:1677-1692`) and every non-pack file up to 32 MB
goes through fileSoundRecords (`web/main.ts:1756-1768`). The double
read from the merged note is fixed: heads are now sliced once.

### B-49 Case swaps resize from the pinned top edge and can push the window off screen

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** Switching machines pins the top edge and never clamps to `window.screen.visibleFrame`; setFrame does not constrain programmatic frames, so Performa to iMac G4 near the bottom pushes the base under the Dock. The animation ignores Reduce Motion. (Tank size drift on swaps is V-03.)

**Evidence.** `macos/Finsical.swift:158-166`.

**Change.** Pass the new frame through a pure `fitted(_ r: NSRect, in vis: NSRect)` that moves it inside vis (up first, then reduce the integer tank scale if taller than vis), keeping the horizontal center where possible. Use `animate: !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion`.

**Acceptance.** Manual test: Performa at the bottom of the screen, switch to iMac G4, whole case stays above the Dock.

**Merged and related.**

- Related: V-03 (integer scale), B-27.

Re-verified open at 62b8572 (fourteenth-pass audit): setFrame still
uses `f.maxY - nh` with `animate: true`, with no visibleFrame clamp
and no Reduce Motion check (`macos/Finsical.swift:272-280`).

Thirteenth-pass update: PR #234 (open): resized frames clamp into the visible screen.

### B-50 Saved window frames are restored when they overlap any screen by a single point

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** OsmiumFrameStore.restore applies a saved frame verbatim if it intersects any screen's full frame. After moving from an external display to a laptop a borderless window (and, since #176, the tank, see MACOS-09 below) can come back almost off screen or under the menu bar; AppKit does not constrain borderless windows and they can only be dragged by the drawn title bar. osmium-ui is a pinned git dependency, so fix app-side first.

**Evidence.** `node_modules/osmium-ui/macos/OsmiumWindows.swift:131-139` (restore), `macos/Finsical.swift:523`.

**Change.** Add a pure `static func onScreen(_ f: NSRect, visible: [NSRect]) -> NSRect` in Finsical.swift: if the top 22-pt strip intersects some visible rect by at least 44x10 pt return f; otherwise pick the visible rect with the largest overlap (or the first), shrink f to fit keeping aspect, and clamp inside. Call it after `frames.restore(window, key: "FinsicalTank")` and in B-05's showClient after host.show. Upstream follow-up: same logic in OsmiumFrameStore.restore.

**Acceptance.** Manual test: `defaults write dev.finsical.app FinsicalFrame.FinsicalPrefs '{{-5000, 900}, {565, 457}}'`, launch, Cmd-, opens fully on screen.

**Merged and related.**

- Part of the "native shell politeness" checklist (restore to a removed monitor, T-32).

Fourteenth-pass audit (62b8572): still open for the client windows:
`OsmiumFrameStore.restore` accepts any frame that intersects a screen
(`node_modules/osmium-ui/macos/OsmiumWindows.swift:132-139`). #176
made the tank keep a partly offscreen frame on purpose
(`macos/Finsical.swift:789-794`); see the next note for what that
means here.

Fourteenth-pass update (MACOS-09): since #176 this entry applies to
the tank too. The tank's launch restore now skips AppKit's
`constrainFrameRect`, which used to pull a titled window's top edge
below the menu bar, and `OsmiumFrameStore.restore` still accepts any
intersection with a screen's full frame. So a saved frame whose only
overlap is under the menu bar, or a sliver left after a display was
unplugged or rescaled while Finsical was not running, comes back
verbatim. User drags stay constrained, so only display changes between
launches produce such a frame. Correction to the review: the tank is
not quite unreachable, because Window > Zoom (its zoom button is
hidden but present) should bring it back, though that breaks the
aspect ratio (B-27). Evidence: `macos/Finsical.swift:97-116`
(TankWindow.keepingFrame disables constrainFrameRect), `:789-794`
(restore and first order-front inside it), `:910-912` (Window > Zoom);
`node_modules/osmium-ui/macos/OsmiumWindows.swift:132-139` (intersects
any `$0.frame`, not `visibleFrame`); commit ada63c5 (#176) says the
partly-offscreen restore is deliberate; the menu bar's level (24) is
above .floating (3). Code only. Change as written, applied inside
keepingFrame after `frames.restore`: keep the frame when its top 22-pt
strip overlaps some visible frame by at least 44x10 pt, which
preserves #176's intent; otherwise use `super.constrainFrameRect` or
center it. Acceptance addition: `defaults write dev.finsical.app
FinsicalFrame.FinsicalTank '{{100, <mainScreenMaxY - 4>}, {310,
400}}'`, then launch: the tank comes back with its top edge reachable;
a tank parked half off the left edge still comes back exactly there.

Thirteenth-pass update: PR #234 (open): restore requires a minimum visible area, else centers.

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

Re-verified open at 62b8572 (fourteenth-pass audit): the prefix branch
dedupes by URL only (`web/import.ts:340-349`), while the nested branch
has its `used` set (`web/import.ts:279-292`).

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

Re-verified open at 62b8572 (fourteenth-pass audit):
`tools/az/emit.py:91` calls `write_png` with RGBA, and
`decodeIndexedPng` requires color type 3 (`core/data/azpack.ts:128`).

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

Re-verified open at 62b8572 (fourteenth-pass audit): `web/stats.ts`
never reads `boot` (grep), and the sim requires `waterQuality >
QUALITY_SEEK` (`core/sim.ts:786`).

Thirteenth-pass update: PR #195 (open): stats history is keyed to the tank's boot.

### B-56 Sim spawn contract gaps: no cap, unused hunger constant

Size S · Severity low · Value 2/5 · Risk 1/5 (eleventh pass)

**Problem.** `FISH_CAP = 24` (`core/tuning.ts`) is enforced only in UI
install paths, never in `Sim.addFish`, so any future caller (or a
restored roster) can exceed it; `food` and `bubbles` are likewise
uncapped (see P-20). `addFish` also defaults `hunger: 0.2` while
`SPAWN_HUNGER (0.45)` sits unused despite the comment that new fish
start past seek.

**Evidence.** `core/sim.ts:256-290` (addFish), `core/tuning.ts`
(FISH_CAP, SPAWN_HUNGER), `web/main.ts` install paths.

**Change.** Wire `SPAWN_HUNGER` into `addFish`; decide where the cap
belongs (sim return value vs caller check) and cap `food`/`bubbles`
with oldest-first eviction. Keep the cap consistent with PR #111's UI
cap at merge.

**Acceptance.** (derived) Vitest: `addFish` spawns at `SPAWN_HUNGER`;
over-cap adds are refused or evicted; food/bubble arrays stay bounded
under `dropFood` spam.

**Merged and related.**

- Related: P-20 (per-tick bounds), PR #111 (UI fish cap, open).

Fifteenth pass: `spawnFish` enforces `FISH_CAP` and
spawns at `SPAWN_HUNGER`; `Sim.addFish` itself is still uncapped
and the `food`/`bubbles` bounds remain P-20's.

### B-57 Drift-steering edge cases: turn double-move, standoff drift, wall-stuck seekers

Size S · Severity low · Value 3/5 · Risk 2/5 (eleventh pass)

**Problem.** Three small `tickFish` defects in the drift path: (1)
after `maybeTurn()` sets `state = turn`, the same tick still runs
drift steering, the stroke pulse and `x += vx` (`turning` only freezes
`want`), so the turn-entry tick moves twice; (2) a fish hovering
inside the pointer standoff skips `decide` but still steers to a stale
`tx/ty`, drifting off the pointer instead of holding station; (3)
wall-hit early `decide` runs only for `drift`, so a `seek` pressed
into a wall (common for big fish: `room()` vs a pellet at `MARGIN`)
sticks until the pellet is gone.

**Evidence.** `core/sim.ts:501-557` (drift branch),
`core/sim.ts:656-659` (wall-hit early decide).

**Change.** Early-out the movement integration on the tick a turn
begins; when holding inside the standoff, steer to a station-keeping
target (or skip steering); run the wall-hit re-decide for `seek` too
without resetting the brake clock (seek uses `phase` as the brake
clock; see the existing comment).

**Acceptance.** (derived) Vitest: turn-entry tick moves at most one
step; a standoff hover holds position within a few px over 60 ticks;
a seeker pinned to a wall re-aims within `MOVE_TICKS`.

Fourteenth-pass update: PR #215 (open) lands part (2) as B-65 (SIM-01:
the watcher now stops at its standoff, level with the pointer and
facing it, instead of gliding through the cursor and wobbling); still
open: (1) the turn-entry double move and (3) wall-stuck seekers.

### B-58 Hunger and vigor model inconsistencies

Size S · Severity low · Value 2/5 · Risk 2/5 (eleventh pass)

**Problem.** (1) The seek floor `FOOD_SINK * 1.5 / vigor` is later
multiplied by `vigor` when integrating, so foul-water seekers swim at
full cruise, contradicting the sluggish-water model. (2) Sleep's
`peckish` needs `hunger > HUNGER_SEEK (0.4)`, but awake `foodFor`
snacks at `> 0.1` inside `NOTICE_DIST`, so sleepers ignore a nearby
pellet they would eat awake.

**Evidence.** `core/sim.ts:430-431` (vigor), `core/sim.ts:439-440`
(peckish), `core/sim.ts:584-595` (seek floor), `core/sim.ts:785-791`
(foodFor).

**Change.** Apply the vigor division once (floor in post-vigor units);
align the sleep-wake appetite with the snack threshold (wake for a
pellet within `NOTICE_DIST` at snack hunger, else keep sleeping).

**Acceptance.** (derived) Vitest: seeker speed scales with `vigor`;
a sleeper with a pellet in `NOTICE_DIST` at hunger 0.2 wakes and
seeks.

### B-59 Install-feedback audio gaps: locked-silent installs, overlapping feedback

Size S · Severity low · Value 2/5 · Risk 1/5 (eleventh pass)

**Problem.** (1) The Add-to-Tank path never calls `audio.unlock()`
(only canvas/keys/menus do), and `playImported()` drops while the
context is locked, so the first install feedback is silently lost.
(2) `load()` stops the ambient loop but not `feedbackSrc`, so an old
feedback overlaps a newly loaded pack.

**Evidence.** `web/audio.ts:84-92` (load), `web/audio.ts:268-279`
(playImported), `web/main.ts` install paths (no `unlock()` call).

**Change.** Unlock from the install click path (it is a user gesture);
track and stop `feedbackSrc` in `load()` like `ambientSrc`.

**Acceptance.** (derived) Fake-AudioContext test: install click with a
suspended context plays feedback after resume; `load()` during
feedback leaves exactly one source.

### B-60 Take Picture clicks a detached link and blocks on encode

Size S · Severity low · Value 2/5 · Risk 1/5 (eleventh pass)

**Problem.** `takePicture()` calls `a.click()` on a detached anchor,
which some browsers ignore, and `toDataURL` encodes synchronously on
the main thread.

**Evidence.** `web/main.ts` `takePicture()`.

**Change.** Append the anchor before clicking (remove after), and
prefer `canvas.toBlob` (async) with a `toDataURL` fallback.

**Acceptance.** (derived) Manual check in Firefox and Safari: the PNG
downloads; no dropped frames on the tank during capture.

**Merged and related.**

- B-70 (fourteenth pass, TANK-07): Take a Picture while paused bakes
  the pause overlay into the PNG; both change `takePicture()`, so do
  them together.

Fifteenth pass (tmp.md B-6): also still open — the native
shell has no Take a Picture path at all: WKWebView ignores the
synthesized download and the native Tank menu has no such item.
Fix options: a native menu item posting PNG bytes over `finsical:`
to `NSSavePanel`, or a `WKDownloadDelegate`.

### B-61 Import-panel caches: unbounded artist thumbs, stale previews

Size S · Severity low · Value 2/5 · Risk 1/5 (eleventh pass)

**Problem.** `thumbMemo` is unbounded for `a:` (artist) keys while
`sweepThumbs()` only sweeps `f:` keys: a slow leak while browsing.
Separately, `paintThumb` returns early when `box.firstChild` exists,
so a list row never refreshes its preview after a reinstall.

**Evidence.** `web/main.ts` (`thumbMemo`, `sweepThumbs`),
`web/import.ts` (`paintThumb`).

**Change.** Bound or sweep `a:` entries with the same policy as `f:`;
repaint the row when its pack reinstalls (or drop the early return
when the cached canvas is stale).

**Acceptance.** (derived) Heap stays flat across repeated section
browsing; reinstalling a pack visibly refreshes its row.

**Merged and related.**

- Related: P-01 (cache eviction).

### B-62 `handleSheets` registers the same pack twice on overlapping restores

Size S · Severity low · Value 2/5 · Risk 1/5 (twelfth pass, N-2)

**Problem.** `importPanel.restore()` runs in the launch chain and
again inside `retryRestores` rounds. If the same URL is restored
twice in one session — a retry racing a late first restore, or a
`restore` after an uninstall→install cycle — `usePack` pushes a
fresh sheet each time and `sheetByPack` rebinds to the newest slot.
`fishSheets` grows by one per duplicate and the old slot stays
forever (by design — sheets are kept to preserve `sheetIdx`
bindings), so this is a slow leak rather than corruption.

**Evidence.** `web/main.ts` (`usePack`/`handleSheets`,
`retryRestores`).

**Change.** Skip `usePack` when `sheetByPack` (or B-04's per-part
map) already binds the URL; a reinstall after an uninstall keeps the
existing slot. Test: two overlapping restores of the same URL leave
one slot.

### B-63 `installAddon`'s in-flight ride reports success once for a queued double-click

Size S · Severity nit · Value 1/5 · Risk 1/5 (twelfth pass, N-3)

**Problem.** `installAddon` checks `installsInFlight` before the
installed-dup check, so a second "Add Again" click while the first
install still downloads rides the same promise — it resolves to the
first install's completion and the second fish never spawns. In
practice the panel disables the button while pending, so impact is a
queued double-click doing nothing visibly different.

**Evidence.** `web/main.ts` (`installAddon`, `installsInFlight`).

**Change.** Key `installsInFlight` by URL and queue a real second
install behind it when the click was explicit (or drop the ride and
start a fresh fetch — bytes are cached anyway). Low priority: the
current behavior is silent but harmless.

### B-64 `openClientWindow` may silently fail under strict popup blockers

Size S · Severity nit · Value 1/5 · Risk 1/5 (twelfth pass, N-7)

**Problem.** The probe `window.open("", target)` runs before the real
open; where it returns null the code retries `window.open(url,
target)` and then gives up silently. Menu commands are real gestures
so this is an edge case, but a failure leaves no trace — a confused
user filing a bug has nothing to quote.

**Evidence.** `web/menubar.ts` (probe + retry path).

**Change.** `console.warn` when both opens fail; optionally a
status-line note on the tank page. No UX machinery — the failure is
environmental.

### B-70 Take a Picture while paused bakes the dark pause scrim and a blurry "PAUSED" into the PNG

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass, TANK-07)

**Problem.** `takePicture()` copies the live 2D canvas, and `render()`
paints the pause overlay into that canvas: a 35% dark-blue scrim over
the whole scene plus the word "PAUSED". Pausing to catch a nice moment
is the natural way to take a picture, so the souvenir comes out
darkened with a big label in the middle. The label itself is
`ctx.fillText` in `10px monospace` on the 320x200 canvas: its gray
anti-aliased fringes are then pixel-scaled, it uses whatever monospace
font the OS has, and it sits over whatever fish or plant is at the
center.

**Evidence.** `web/main.ts:1482-1497` (takePicture),
`web/main.ts:2063-2072` (scrim and text inside render). The reviewer's
Playwright download (`tank/picture.png`, 640x400) shows the darkened
scene with PAUSED at the center; `tank/paused-text.png` shows the
anti-aliased glyph edges.

**Change.** Split `render()` into `renderScene()` and
`drawPausedOverlay()`. `takePicture()` calls `renderScene()` with no
overlay and no feed-zone highlight, captures, then calls
`requestPaint()` so the next frame restores the overlay. Redraw the
label as a 1-bit bitmap word from a `gridCanvas` sprite (as
`web/placeholder.ts` does) on a small dark placard with a 1 px
outline, in a corner or under the air strip, as F-10's placard
suggests.

**Acceptance.** Playwright: pause, then Take a Picture; the PNG
matches a capture of the same frame with `paused=false` (no scrim and
no label pixels). The on-screen label uses only the placard palette,
with no intermediate grays.

**Merged and related.**

- F-10 (its "Paused placard"; the label restyle overlaps it), B-60
  (the other `takePicture()` fixes; do them together).
- Fourteenth pass: TANK-07.

### B-71 Escape closes the Get Info card hidden behind About or Shortcuts, and Ctrl-I opens Import underneath About

Size S · Severity low · Value 1/5 · Risk 1/5 (fourteenth pass, TANK-13)

**Problem.** The tank's keydown handler is registered at module
evaluation, so it runs before the document window's handler, which is
added when the window opens. The tank handler claims Escape for the
Get Info card, so the first Escape closes a card hidden behind the
front window. Cmd/Ctrl-I also ignores `docOpen()` and opens the Import
overlay underneath an open About window.

**Evidence.** `web/main.ts:1544-1548` (the Escape branch checks only
alertOpen), `web/main.ts:1553-1557` (Cmd-I ignores docOpen),
`web/menubar.ts:104-112` (the doc window's keydown is added on open).
Re-run at runtime (`tank-verify/esc.mjs`): with the card and Shortcuts
open, the first Escape closes the card and Shortcuts stays open, and
the second Escape closes Shortcuts; with About open, Ctrl-I opens the
Import overlay (hidden under About).

**Change.** In the Escape branch, also require `!docOpen() &&
!menuOpen() && !importPanel.isOpen`, and gate the Cmd-I branch on
`!docOpen()`. Alternatively, register the document window's keydown
with `{ capture: true }` so the front window always handles Escape
first.

**Acceptance.** Playwright: with the card and Shortcuts open, Escape
closes Shortcuts and a second Escape closes the card; Ctrl-I with
About open does nothing.

**Merged and related.**

- Fourteenth pass: TANK-13.

### B-72 Empty Tank during 'Stock the Tank' blames the connection and keeps installing the rest of the starter set

Size S · Severity low · Value 3/5 · Risk 2/5 (fourteenth pass, IMPORT-05)

**Problem.** `downloadAddon` rejects an install that was fetching when
Empty Tank ran (the `tankEpoch` check). The starter loop in
`welcome.ts` treats that rejection like any other failure: it pushes
the item to `failed` and continues. The remaining fish, gravel, plant,
backdrop and sounds therefore arrive in the tank you just emptied. The
alert then says "Finsical couldn't add clownfish. Check the connection
and try again.", because `loadProblem` has no case for the
cancellation, and its Try Again re-adds the item. The Import Add-ons
window shows the raw "Couldn't add it: Error: cancelled ..." text (the
U-09 path). Separately, `emptyTank`'s comment says "the sound bank
stays", but emptying uninstalls AZ_WAVES along with the rest
(removeAddon drops its records); the starter-sounds backfill is
already marked done, so the tank stays silent. Overview's own comment
says every add-on leaves, so only the main.ts comment is wrong.
Severity was lowered from medium: triggering this takes opening
Overview and confirming Empty Tank while the stocking alert is still
running, and the alert's own Stop button is the normal way to abort.

**Evidence.** `web/welcome.ts:95-140` (the loop at :118, `failed.push`
at :126, the loadProblem text at :139), `web/main.ts:1134-1154`
(tankEpoch, and emptyTank with its comment), `web/main.ts:1207-1241`
(the two cancellation throws), `web/main.ts:1200` (`String(e)`),
`web/import.ts:675-688` (loadProblem falls back to the connection
text), `web/import.ts:1417` (`Couldn't add it: ${m.error}`),
`web/main.ts:1107-1112` (sound records dropped),
`web/overview.ts:126-127`. Screenshot `import/e5.png` (viewed): the
caution alert blames the connection. The reviewer's run logged
'imported fish neon', brownsand, Amazon_L and Back03 after the wipe,
and the final save held `addons:
['neon','brownsand','Amazon_L','Back03','AZ_WAVES']`.

**Change.** Export `class InstallCancelled extends Error` from
import.ts and throw it from downloadAddon. In `stock()`, on `e
instanceof InstallCancelled`, end the run and close the alert, or show
'Stopped: the tank was emptied.' with OK, and install nothing further.
In loadProblem, map it to "The tank was emptied, so it wasn't added."
installAddon's failure branch posts `loadProblem(e)` instead of
`String(e)`, and `web/import.ts:1417` becomes `Couldn't add it.
${m.error}` (U-09). Fix the emptyTank comment to say sounds leave too.
To make the loop testable, extract it as a pure `runStarter(items,
install, onProgress)` in starter.ts.

**Acceptance.** Vitest (starter.test.ts): with an install that rejects
with InstallCancelled on item 2 of 7, runStarter calls install exactly
twice and returns `stopped`. Vitest: `loadProblem(new
InstallCancelled())` returns the tank-emptied text. Playwright
(e5.mjs): after Empty Tank mid-stock, the saved add-on list stays []
and no connection alert appears.

**Merged and related.**

- U-09 (raw error text in Import Add-ons; the `loadProblem(e)` change
  is shared). B-68 (fourteenth pass, PR #241) reworks the same
  welcome flow's saved state; rebase on it.
- Fourteenth pass: IMPORT-05.

### B-73 Import Add-ons previews ignore the Sound pane's volume and mute

Size S · Severity low · Value 3/5 · Risk 1/5 (fourteenth pass, AUDIO-04)

**Problem.** The Import Add-ons window plays sound previews through
its own HTMLAudioElement, which always plays at volume 1.0. With the
tank muted, pressing Play on AZ_WAVES or Macinfish still plays at full
level. At default settings the preview is about 5 dB louder than the
same record's install feedback in the tank (0.8 x master 0.7 = 0.56).

**Evidence.** `web/import.ts:804` (`const audio = new Audio()`) and
`web/import.ts:1018` (`audio.src = sndObjUrl`). Grepping
`web/import.ts` and `web/addons.ts` for `volume|muted` finds nothing.
State pushes already carry `sound: soundCfg` (`web/main.ts:890`), and
the panel already handles 'state' messages (`web/import.ts:1420`).
Verified in code only.

**Change.** Export `previewVolume(c: SoundConfig) = c.muted ? 0 :
c.volume * 0.8` from `web/audio.ts`, using the gain playImported
applies. In mountImportPanel, keep a `soundCfg`, updated from
`sanitizeSoundConfig(m.sound)` in the state handler (the addons.html
window). The in-page panel gets a mount option `soundConfig?: () =>
SoundConfig` that main.ts supplies. Set `audio.volume =
previewVolume(cfg)` before play() and on every state push while a
preview plays. If AUDIO-05's taper (U-35) lands, go through the same
curve.

**Acceptance.** Vitest: `previewVolume({volume: 0.5, muted: false,
...})` is 0.4, and muted gives 0. Playwright: mute the tank with M,
open addons.html, select AZ_WAVES and press Play, and `audio.volume`
reads 0; unmuting from Preferences while the preview plays raises it.

**Merged and related.**

- This is the un-numbered PR #159 review follow-up "Import Add-ons
  previews follow the Sound pane's volume and mute" listed under
  Completed work (its acceptance: a muted tank previews silently); it
  now has this ID.
- U-35 (fourteenth pass, AUDIO-05: the volume taper).
- Fourteenth pass: AUDIO-04.

### B-74 Overview's Use button goes stale when the selected row's status changes in place

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass, UI-04)

**Problem.** `render()` rebuilds rows only when the list's keys
change. When only a status changes, it updates the cells and returns
before `syncRemove()`. Select a background that is 'In tank' (Use
enabled); after your own Use, or a change from the tank, it reads
'Showing' but Use stays enabled. The reverse also happens: a row that
becomes usable keeps Use dimmed until reselected. It only affects the
Name and Kind sorts; under the Status sort the order changes and the
rebuild path runs syncRemove.

**Evidence.** `web/overview.ts:218-230` (the in-place branch returns),
`web/overview.ts:111-115` (syncRemove), `web/overviewmodel.ts:98-107`
(`use` only when not showing). Re-run at runtime (`ui-verify/use.mjs`,
two backgrounds, Back03 selected): before, `{use: true, row: 'Back03,
Background, In tank'}`; after a push showing Back03, `{use: true, row:
'Back03, Background, Showing'}`.

**Change.** Call `syncRemove()` on both paths: before the early return
at `web/overview.ts:229`, or move it to the end of `render()`.
Optionally rename it `syncButtons()`.

**Acceptance.** Playwright with fake state pushes as in
`ui-verify/use.mjs`: after the selected row turns 'Showing', `#ouse`
is disabled; after it turns back to 'In tank', `#ouse` is enabled,
with no click in between.

**Merged and related.**

- Fourteenth pass: UI-04.

### B-76 About Finsical opens behind the floating tank

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass, MACOS-03)

**Problem.** The tank floats (.floating level) by default.
`NSApp.orderFrontStandardAboutPanel` shows AppKit's standard About
panel, a normal-level panel centered on the screen, and a window can
never order above a higher level. On a default first launch the tank
is also centered (a 310x400 pt Plus), so Finsical > About Finsical
appears to do nothing: the panel is key but sits under the case art.
`showClient` has an explicit fix for exactly this for the client
windows; the About panel, added later, did not get one. Any later
non-modal AppKit panel (for example D-09's NSSavePanel opened with
`begin`) would have the same problem. The panel is not lost: Cmd-W
closes it and moving the tank reveals it, hence low severity.

**Evidence.** `macos/Finsical.swift:619-634` (showAbout, no level
handling), `macos/Finsical.swift:662-665` (tank level .floating when
FinsicalFloat), `macos/Finsical.swift:763-766` (FinsicalFloat defaults
to true), `macos/Finsical.swift:180-194` (the showClient comment: "one
can never order above the floating tank, so it takes the tank's
level"), `node_modules/osmium-ui/macos/OsmiumWindows.swift:132-139`
(first launch `center()`). Code only; not seen on a Mac.

**Change.** Lift the panel to the tank's level, and keep it in step
when Float changes. Either, right after
`orderFrontStandardAboutPanel`, set `NSApp.keyWindow?.level =
window.level` when the key window is neither the tank nor a hosted
client; or, generally, observe `NSWindow.didBecomeKeyNotification`:
for any window that is not the tank, has no sheet parent and has a
lower level than the tank, set its level to the tank's.
applyWindowPrefs must also re-level those windows (every visible
window in `NSApp.windows` other than the tank and sheets); otherwise a
lifted About panel stays floating over other apps after Float is
turned off (a verifier correction to the review).

**Acceptance.** Manual: `defaults delete dev.finsical.app`, launch,
Finsical > About Finsical: the panel shows in front of the tank and
Cmd-W closes it. Turn Float Above Other Windows off with the panel
open: the panel drops to normal level with the tank.

**Merged and related.**

- A-04 (a custom About window opened through showClient would also
  avoid this), D-09 (any non-modal NSSavePanel needs the same lift).
- Fourteenth pass: MACOS-03.

### Completed (sixteenth pass, PRs open for review, CI green, reviewer blocked)

All three are open and rebased onto `06f7935`; `core-linux` and
`native-macos` pass on each. **None has had a review round:** the GLM
job failed on all three with `Z.ai API: HTTP 429`, so treat these as
unreviewed rather than at steady state.

- **PR #263** (`perf/frame-loop-allocations`) — P-24's two
  per-frame allocations that already had a cache key. `drawAir`'s
  shade gradient is memoized on its stop-string pair (`airShade`,
  `airShadeLip`, `airShadeLow` in `web/water.ts`, declared above
  `drawAir`, mirroring `shaftFill` and `murkFill`): `grey()` rounds
  each stop to a whole grey, so the pair of stop strings is an exact
  key and a steady lamp rebuilds nothing — the discarded rebuilds were
  byte-identical, so no visual change is possible. `frame()` now makes
  one `Date` per frame and passes it to `syncLight` and
  `render(now)` → `drawNight(now)` instead of two clock reads
  microseconds apart. Also updated the `syncFeedHover` comment, whose
  subject (`tankRect()`) had landed upstream mid-pass. Test:
  `web/water.test.ts` "reuses its shade gradient until a stop actually
  changes" — red on `main`, green after. typecheck clean; 692 tests
  green.
- **PR #265** (`fix/launch-and-removal-reliability`) — S-07's
  terminal `.catch`, plus the Overview repaint the same chain was
  missing. The launch chain now logs a failure and repaints what did
  land, and `retryRestores(restoreFailed)` moved from the success
  `.then` into a `.finally` with its own `try/catch`: the call that
  re-fetches the packs a restore could not fetch ran only when
  everything else had already succeeded, so any exception in
  `applySceneryChoice`/`remapSheetIdx`/`reconcileFish` skipped it and
  left the failure as an `unhandledrejection`. `removeFish` now calls
  `requestPaint()` on success (`web/main.ts:1533`): while the tank was
  paused the removed fish stayed in the water indefinitely, because
  the frame loop draws only on a tick or when `frameDirty` is set.
  No automated test (browser-only promise control flow in the one
  uncovered `web/` file); the PR carries the reproduction and
  verification procedure AGENTS.md asks for instead. typecheck clean;
  691 tests green at push.
- **PR #272** (`fix/prefs-crt-pane`) — U-13 (UI-14) and A-07. The
  WebGL-unavailable caption moved out of `position: absolute` into the
  flow under the switch (`web/app.css`), `#pfpresets` now actually
  hides (`display: flex` had made the `hidden` attribute a no-op),
  `#crt-on` and `#pfdefaults` go disabled with it, and `syncEnabled()`
  folds `crtUnavailable` into its `on` so the sliders and preset
  buttons dim too. A pane-scoped tick rule dims the ticks A-07
  filed — `opacity: .45` on `.pfslider .osm-slider.osm-disabled::after`
  in `web/app.css` — and the upstream osmium-ui fix is still owed. Measured headless before and after: no
  intersection between `#crt-warn` and `#pfpresets` or any `.pfgroup`
  at 1280x900 or 565x520, controls disabled, presets hidden, 455 px
  (63 px native) of clearance above `#pffoot`, and the normal
  WebGL-available pane byte-identical in layout. typecheck clean; 691
  tests green.

**Landed on main by `06f7935`** (the first draft was written ~70
commits earlier, so most of these arrived during the pass; each was
re-read on the later revision and dropped rather than filed — recorded
so a later pass does not re-raise them):

- Simulation and data: `addFish` sanitization and `sanitizeSavedFish`
  clamping every saved numeric field (#135), `changeWater`'s fraction
  clamp, lifecycle `sick`/`dead` fields, the fish cap, capped feeding
  and marked-eaten pellets (#209), uneaten-food cap and waste
  softening (#189), feeding-at-the-surface edges (#190), per-launch sim
  seed (#197, #255), AquaZone water/health/disease/medicine (#163).
- Performance: `postState()` coalescing and the split push/persist
  interval (#230), bounded pack and zip caches (#196, #205), the
  failing `snds` merge chain (#201), and **P-2 of `tmp.md` — the tank
  rect cache and `syncFeedHover()`'s use of it, which landed upstream
  mid-pass (`f79cba9`/`004030c`) while PR #263 was being written.**
- Reliability: two tank tabs fighting over the save (#233), installs
  that cannot put anything in the tank (#203), feed/Add-Again race
  guards (#235), audio burst fixes (#185, #188), tap-sound word
  matching (#181), import-window honesty (#199), client-window
  hardening (#195, #186, #222).
- Features and delight: tank export/import (#256), Zen mode (#217),
  integer display scale (#237), lifecycle sick/dead/born (#206), the
  timed auto-feeder (#228), snail (#232), cat (#204), plant sway
  (#238), oxygen stream (#247), dinner bell (#216), golden pellet
  (#254), crowd at the pointer (#243), starter parade, one-time
  persistence warning, and three tank-page CSS nits (#184).

## Performance and smoothness (open)

Done this pass and removed from this list: P-03, P-13, and P-10's
buffer cap (PR #88).

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
- Fourteenth pass: PERF-04 (after any stall the next frame runs up to 6 ticks, so every fish jumps about 6x its normal step) is filed as P-29.

Fourteenth-pass update (PERF-01): PR #226 (open) lands Change's last
sentence, the `decodePixels` rewrite, as a first step: no per-pixel
`emit` closure, `x`/`y` counters, each run clamped to `total`, and 0
read past the end of the stream exactly as `?? 0` did, so the output
is byte-identical and `tools/az/fsh.py` needs no parity change; a
vitest reference copy of the old function agrees with the new one on
seeded random RLE streams. Measured in verification: node, best of 5
on gup addon1's packs, GP15000.REZ 142.8 -> 69.5 ms, GP17000.REZ
143.1 -> 68.1 ms, GP21000.REZ 108.7 -> 51.8 ms, all 80/80/64 sheets
byte-identical; 20,000 randomized RLE streams (zero-length records,
runs past w*h, truncated streams, odd trailing bytes) gave 0
mismatches. Chromium (install via BroadcastChannel into the stocked
tank): the longest rAF gap for gup addon1 was 417 and 533 ms on main,
283 and 317 ms with only this change. The reviewer's CPU profile put
`emit` self time at 283 of 416 ms inclusive importAddon (gup), 224/297
(marbangel(1)) and 184/246 (disc addon1); the small starter packs
never exceeded a 33 ms gap. Correction: the decode halves, but the
whole stall drops by only about a third, because inflate, BMP decode
and the rest of importAddon stay. Current references:
`core/data/fsh.ts:73-97` (decodePixels, the closure at :78-81),
:104-140 (spriteSheet decodes every frame of every group), :148-164
(fshToSheets decodes every chunk); `web/import.ts:467` (importAddon),
:590-603 (packCache, fetchAddon); `web/main.ts:456` (usePack keeps one
sheet via `pickSwimSheet`, which is now on main). Still open: the rest
of Change (`sheetHeaders`/`decodeSheet` with `SheetPick`, decoding
only pickSwimSheet's winner, skipping packImages for fish blobs), which
removes the rest of the stall and most of P-01's heap. Measure stall
changes with paired Playwright runs against main (step 1's bar: the
longest rAF gap during a gup addon1 install at least 25% shorter), not
an absolute bar: the step-1 build measured 283 and 317 ms, so the
reviewer's "below 300 ms" bar was dropped.

### P-04 Imported long tracks are decoded to PCM and kept forever (Macinfish: 72 MB, re-decoded every launch)

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** addWavs decodes every imported record into `imported` for the page's lifetime, again at every launch and on every soundsLoaded. The only Sounds add-on, the JPN bonus track Macinfish.mp3 (3.28 MB, ~205 s, 44.1 kHz stereo), becomes 72.3 MB of Float32 PCM after a 461 ms decode, although it is only played once as install feedback.

**Evidence.** `web/audio.ts:44-68`, `web/audio.ts:79-81`, `web/main.ts:343-358`, `web/main.ts:534-546`, `web/main.ts:892-899`.

**Change.** In addWavs keep a record as a Blob in a `streams` map instead of decoding when its name matches none of find()'s event keys (aqua, drop, intowater, bubble, center, side, top, bottom) and it is long (WAV header over 10 s, or non-WAV over 512 KB); with B-19 in place, use `kind === 'music'`. playImported checks `streams` first and plays through one reused HTMLAudioElement with a blob: URL, revoking the previous one. Streaming a long 'aqua' WAV would silently drop the ambient loop, so that stays decoded.

**Acceptance.** Tests (fake AudioContext/Audio): a 1 MB 'Macinfish' mp3 never reaches decodeAudioData and playImported sets a blob: src; a 1 MB 'aqua' WAV is decoded and loops.

**Merged and related.**

- Related: B-19 (`kind`), F-05 (remainder, jukebox).

Re-verified open at 62b8572 (fourteenth-pass audit): addWavs still
decodes every record into `imported` (`web/audio.ts:117-132`); there
is no streaming path.

### P-06 Every hello and every slider step broadcasts full state to every window

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** Each client says hello every 2 s and each hello makes the tank broadcast full state to all windows (N² with open windows; 12 pushes/10 s to Stats with Overview and Prefs open). Dragging a CRT slider sends ~29 crtConfig/s, each answered with a synchronous localStorage write and a full push to every window; in the app each push is a JSON evaluateJavaScript per window. Cost is modest.

**Evidence.** `web/main.ts:385-419` (postState), `web/main.ts:516-533` (hello -> postState at :517), `web/main.ts:665-690` (applyCrtConfig: localStorage write + postState), `web/prefs.ts:317-328`, `web/overview.ts:205-220`, `web/stats.ts:122-136`, `web/addons.ts:66-84`, `macos/Finsical.swift:376-410` (relay fans out to every window).

**Change.** `requestState()`: a leading+trailing throttle with a 1000 ms minimum gap for hello replies. `schedulePostState()`: a 100 ms trailing coalesce for state-changing paths (saveTank, setCrt, applyCrtConfig, machine). Keep crt.configure() immediate; debounce the `finsical:crt-cfg` write by 250 ms and flush it in the pagehide handler. Keep client heartbeats (they are the tank-reload recovery path).

**Acceptance.** Tests with fake timers: 100 schedulePostState calls within 100 ms give 1 post; 100 applyCrtConfig calls give 1 setItem after the debounce; with three clients each gets <= ~10 pushes per 10 s; a drag delivers <= 10 pushes/s and the final value persists.

**Merged and related.**

- Merged from passes 1-7: Overview and Stats heartbeat every 2 s with the full fish list and add-ons JSON, and four client windows each hello-poll every 2-10 s, each answered by a full push; acceptable at today's roster sizes, so push-on-change plus a slow heartbeat is the direction if rosters grow past dozens of fish.

Fourteenth-pass update (UI-17): re-verified open; there is still no
throttle. Current references: `web/main.ts:1005-1006` (hello ->
postState), `web/main.ts:1291-1301` (applyCrtConfig: setItem plus
postState per message), `web/stats.ts:101-128` (Stats render clears
and rebuilds rows and care lines, P-18). Verified in code; the rates
are the reviewer's measurement (`ui/p06.mjs`, not re-run): 17 pushes
per 10 s idle to Stats and 63 in a 2.6 s scanlines drag (about 24/s).
The plan is unchanged (the 1000 ms leading-and-trailing hello
throttle, since the 100 ms variant was refuted; the 100 ms trailing
`schedulePostState` with `crt.configure` kept immediate; the 250 ms
debounced `finsical:crt-cfg` write flushed on pagehide); ship P-18's
in-place Stats update with it. Added acceptance: rerunning
`ui/p06.mjs` gives at most 10 pushes/s during a drag and at most 6 per
10 s idle per window, and a Stats value node survives pushes.

Thirteenth-pass update: PR #205 (open): postState coalesces and hello responses are rate-limited.

Fifteenth pass: hello pushes are throttled
(HELLO_MIN_MS) and the 10 s persist split from the state push
(PR #230); a versioned state handshake remains.

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


### P-10 (remainder) CRT shader cost: skip unused bloom taps now, two-pass only after profiling

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

Re-verified open at 62b8572 (fourteenth-pass audit): FRAG is still
single-pass with a 9-tap smear (`web/crt.ts:139-155`) and
`MAX_CRT_DPR = 2` (`web/crt.ts:504`). Correction to Problem: the
shader now takes up to 18 samples per device pixel (1 sharp, a 9-tap
beam, 2 misconvergence, 2 bloom, 4 halation; `web/crt.ts:143-181`),
not 13, and the Evidence line numbers above predate the current file.

Fourteenth-pass update (PERF-05): one saving needs no profile. FRAG
already skips the beam smear when softening is 0 and misconvergence
when it is 0 (`web/crt.ts:147`, :164), but always takes the 2 bloom
and 4 halation samples (:172-181) and multiplies them by `uBloom`.
With bloom at 0, which the Pixel Perfect preset sets (:362), every
device pixel pays for 6 unused texture fetches. Change (first step,
ahead of the two-pass work; Size S, Risk 1/5): wrap the glow and halo
block in `if (uBloom > 0.0) { ... }`; the branch depends only on a
uniform, so it is coherent across the draw. Leave overdrive, which follows,
unchanged. Output is unchanged by construction: with `uBloom = 0`
both terms add exactly 0.0 to finite colors. Re-run in verification
(perf/shader.mjs, SwiftShader, 303x221 buffer, 2 runs each, the guard
the only change): Pixel Perfect 8.85 -> 6.46 ms per CRT render
(-27%); the reviewer measured bloom 0 with otherwise default settings
at 12.45 -> 10.21 ms (-18%). These are SwiftShader costs, not Apple
GPU timings. Acceptance for this step: Playwright with the CRT on at
Pixel Perfect (grain and flicker already 0) gives pixel-identical
screenshots before and after; at the defaults with `performance.now`
stubbed so grain is frozen, also identical; perf/shader.mjs shows
fewer ms per render for bloom-0 configs.

### P-11 Machine case art ships as 17 MB of PNG

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** The ten case images are 0.87-1.81 MB RGBA PNGs (15 MB total) copied wholesale into the app bundle. A web load fetches only the selected case (~1-1.8 MB). Lossless WebP is 7.5 MB with identical pixels; WebP q95 is 2.2 MB with 0 alpha changes and no flips of the alpha < 250 mask threshold. WebKit and ImageIO decode WebP on macOS 11+.

**Evidence.** `web/assets/*.png`, `web/machines.ts:62-170`, `macos/Finsical.swift:8-11` (MIME map), `macos/Finsical.swift:169-190` (loadMaskImage), `macos/Makefile:36-39`, `media-sources/`.

**Change.** Add a dev-only `tools/optimize_assets.py` (cwebp `-lossless -exact -z 9`, or `-q 95 -exact -alpha_q 100`) converting web/assets; masters already live in media-sources/. Update the image paths in machines.ts, add `"webp": "image/webp"` to WebHandler's MIME map, and add a machines.test.ts check that every `image` exists and a Python test that decoded PNG and WebP alpha channels are identical.

**Acceptance.** Verify on macOS 12 that loadMaskImage's NSImage loads .webp and the Prefs preview renders.

**Merged and related.**

- Related: T-24 (add `webp` to the MIME map).
- Fourteenth pass: TANK-08 (switching machines, or a cold first load, shows a caseless tank until the case PNG arrives) is filed as V-29.

Fourteenth-pass update (VISUAL-14): the numbers above are stale.
Since #169, #170 and #173 there are 15 PNGs, 17,221,248 bytes
(17.2 MB), in `web/assets`, all shipped in the app bundle, and the
Preferences Machine preview loads each full-size PNG as you move down
the list (re-measured in verification; the audit confirms no `webp`
in the WebHandler MIME map). Pillow re-encodes: lossless WebP (exact,
method 6) 8,968,984 bytes (-48%); WebP q95 with alpha_quality 100
2,594,472 bytes (-85%) with 0 flips of the alpha < 250 mask
threshold. The plan stands; the `webp` MIME entry goes at
`macos/Finsical.swift:10`. New: `scripts/machine-art.test.mjs`
decodes only 8-bit RGBA PNGs, so it needs a WebP decode path or keeps
testing the masters; acceptance adds that it still runs on the
shipped format. Not a Linux-only PR: the macOS 12 check that
`loadMaskImage` reads .webp remains.

### P-12 imageCanvas destructures a palette array per pixel (3x slower than a Uint32 LUT)

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** `const [r, g, b] = img.palette[pi] ?? [0,0,0]` runs per pixel with four separate byte writes, for every swim frame, backdrop, strip, decor and preview: 640x480 costs 7.7 ms cold / 4.3 warm vs 2.6 / 1.7 with a LUT.

**Evidence.** `web/render.ts:41-59`.

**Change.** Extract a pure `indexedToRgba(img, opaque, mask?)`: precompute `lut[i] = (a<<24 | b<<16 | g<<8 | r) >>> 0` (a = 255 when opaque or i != 0), write `out32[i] = lut[idx[i]]` through a Uint32Array view of ImageData, and clear alpha with `& 0x00ffffff` where mask[i] === 0. Assert little-endian once.

**Acceptance.** Test against the current algorithm on random images with and without a mask.

Thirteenth-pass update: PR #205 (open): indexedPixels uses a Uint32 palette LUT.

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

Re-verified open at 62b8572 (fourteenth-pass audit): the key is still
a template string and the cache fills on first draw
(`web/render.ts:91-100`).

Thirteenth-pass update: PR #205 (open): swim-cache keys are numeric composites.

### P-17 The CRT drawing buffer is reallocated on every size change during live resize

Size S · Severity nit · Value 1/5 · Risk 2/5

**Problem.** render() calls resize(), which reassigns width/height (reallocating and clearing the backbuffer) whenever the rounded box changes, every frame of a live resize or animated case swap. Likely sub-millisecond; unmeasured.

**Evidence.** `web/crt.ts:307-316`, `web/crt.ts:339-341`, `macos/Finsical.swift:160-166`.

**Change.** Keep the old buffer (CSS stretches it) and reallocate 200 ms after the last change or immediately on first enable, via a pure `nextBufferSize(cur, want, nowMs, lastChangeMs)` with unit tests.

**Acceptance.** (derived) Unit tests for `nextBufferSize` (no reallocation within 200 ms of a change, immediate on first enable); a live resize shows no flashes.

**Merged and related.**

- Related: open PR #88 (re-measures only when dirty), P-22, V-15.

Fourteenth-pass update (PERF-07): measured, and not sub-millisecond.
Current references: `web/crt.ts:505-509` (ResizeObserver and window
resize set `sizeDirty`), :511-523 (resize() reassigns
`out.width`/`out.height` whenever the rounded box changes), :561-563
(render() calls resize()); `web/main.ts:2194-2195` (a resize requests
a paint); the Evidence lines above (crt.ts:307-316, :339-341) are
stale. Re-run in verification (perf/resize.mjs, CRT on, 214 viewport
steps in 6 s): `resize` self time 358.5 ms, about 1.7 ms per step and
6% of main-thread time, while SwiftShader's frame readback
('(program)') took 84%; 44 fps. The reviewer measured 366.8 ms over
169 steps (2.2 ms). With the CRT off the same loop stayed under
16.8 ms per frame. SwiftShader only; the cost on a Mac GPU is unknown.
Refined Change: also reallocate at once whenever the box's aspect
ratio changes (a case swap), since `layoutMachine` scales the glass
uniformly within one case but a different case would stretch a stale
buffer; `nextBufferSize` encodes that rule too. Refined Acceptance:
`nextBufferSize` tests cover no reallocation within 200 ms of a
uniform change and immediate reallocation on first enable and on an
aspect change; a Playwright resize loop with the CRT on cuts `resize`
self time by more than 80%, and the final buffer matches the element
box 200 ms after the last step.

### P-18 The Stats window rebuilds its whole DOM on every state push

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** render() clears rowsEl and careEl and recreates ~25 elements per push (more during slider drags, P-06), resetting selection and hover.

**Evidence.** `web/stats.ts:65-86`, `web/stats.ts:96-110`.

**Change.** Build the rows once, then update textContent and `--osm-value` in place; rebuild care lines only when `st.advice.join('\n')` changes.

**Acceptance.** (derived) Stats keeps text selection and hover across pushes; a DOM test shows rows are reused (same nodes) across two pushes.

**Merged and related.**

- Fourteenth pass: UI-17 (state pushes flood every client window during slider drags) is filed as P-06; it asks for this in-place Stats update alongside P-06's throttle.

Re-verified open at 62b8572 (fourteenth-pass audit): render() still
clears and rebuilds the rows (`web/stats.ts:101-125`; UI-17 cites
:101-128 including the care lines).

Sixteenth pass (re-verified at `06f7935`, P-4 of `tmp.md`): still
open. `render(st)` runs unconditionally from the message handler with
no comparison against the previous values (`web/stats.ts:145-164`) and
rebuilds from `web/stats.ts:113`. Nothing in the change is blocked;
`statsmodel` is already pure and tested, so the new-node reference
test the Acceptance asks for can be written against `stats.ts`.

### P-19 (remainder) Per-frame allocations in `render()`

Size S · Severity nit · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** `render()` rebuilt murk and dark `rgba()` template strings
every frame and toggled `globalAlpha` per pellet.

**Evidence.** `web/main.ts` `render()` (murk and night overlays,
pellet loop). PRs #155 (night drawing) and #158 (`web/water.ts`, murk
and pellets) rewrote these paths; re-audit on top of them.

**Change.** In `drawNight`, cache the `rgb()`/`rgba()` strings and
gradients (rebuild when the light bucket or the size changes) or draw
a prebuilt overlay canvas; batch pellets by alpha in `drawFood`. The
murk overlay needs nothing more. Do the `drawNight` part together with
P-24, which lists the same function's per-frame `Date` and gradients.

**Acceptance.** (derived) No per-frame string or gradient construction
in `drawNight` at night, twilight or under the moonbeam, and no
per-pellet `globalAlpha` toggling (allocation profile); pixels
unchanged in a screenshot diff.

Fourteenth-pass audit (62b8572): the murk half landed: the murk
gradient is built once and scaled by `globalAlpha`
(`web/water.ts:548-562`). Still open: `drawNight` builds
`rgb()`/`rgba()` strings and new gradients on each drawn frame at
night, twilight and moonbeam (`web/main.ts:2083-2129`), and `drawFood`
sets `globalAlpha` per pellet (`web/water.ts:207-229`). Change and
Acceptance narrowed to that remainder.

### P-20 (remainder) Bound per-tick sim work: pellet cap for the O(F·P) loop

Size S · Severity low · Value 2/5 · Risk 1/5 (from passes 1-7)

**Problem.** `tap()` propagates panic but never caps bubble spawn in
foul water. The sim is O(F·P) (`nearestFood` per fish per tick) plus
O(F²) panic fan-out plus an O(F²) schoolmate `filter` per decision
(PR #112); fine under caps, the stutter vector without them.

**Evidence.** `core/sim.ts` `tap()`, panic propagation, `nearestFood`,
`decide()`; the fish cap (24) is in open PR #111; D-03's separation
adds another O(F²) term.

**Change.** No bubble cap: bubbles are already bounded (see the audit
below). Land the pellet cap through U-01 (open PR #189,
`MAX_UNEATEN` = 6) so the O(F·P) `nearestFood` term stays bounded
alongside the merged fish cap; keep D-03's extra O(F²) separation term
within the same budget.

**Acceptance.** (derived) With PR #189 merged, a 24-fish tick with the
pellet count at its cap stays under a measured budget; close this
entry then.

Fourteenth-pass audit (62b8572): the fish cap and the bubble bound
landed. `FISH_CAP = 24` is merged (`core/tuning.ts:16`) and enforced
for new spawns (`web/main.ts:476-488`), so PR #111's cap is no longer
pending. `tap()` and `startle()` spawn no bubbles (`core/sim.ts:321-331`,
:731ff); bubbles come only from a per-fish chance of at most 0.008 per
tick (`core/sim.ts:208`, :663-666) plus an ambient 0.004 (:210, :414)
and pop within about 220-250 ticks at 0.8 px per tick (:212,
:421-422), so the live count is bounded by rate times lifetime (at
most 22 on screen with 24 fish in foul water and frequent taps). The
bubble cap in the original Change is moot, and the Problem's `tap()`
sentence no longer holds. A tick at 24 fish with about 60 pellets
costs about 5 us (headless node). Still open: `dropFood` appends
without limit on main (`core/sim.ts:302-307`) while `nearestFood` is
O(F·P); that cap is U-01's point 1 in open PR #189. Change and
Acceptance narrowed to that remainder.

### P-22 Native `frames.save` runs on every resize tick

Size S · Severity nit · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** A UserDefaults write per frame during live resize.

**Evidence.** `macos/Finsical.swift` frame persistence
(`windowDidResize`/`windowDidMove` handlers).

**Change.** Debounce the save to about 100 ms after the last change.

**Acceptance.** (derived) Logging shows one write per resize gesture;
the frame restores after relaunch.

Thirteenth-pass update: Declined in #234: UserDefaults.set is in-memory; CFPreferences syncs asynchronously — nothing synchronous to debounce.

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

**Merged and related.**

- Fourteenth pass: AUDIO-06 (a muted tank keeps the audio device running) is filed as P-28; it suspends the AudioContext while muted, as the hidden path already does.

### P-24 Tank-page per-frame allocations: gradients, Dates, layout reads

Size S · Severity low · Value 3/5 · Risk 1/5 (eleventh pass)

**Problem.** `drawAir()` allocates a `createLinearGradient` plus
full-tank fills every frame; `drawSurface()` issues ~320 1x1
`fillRect`s with per-column alpha and `drawLight()` ~56 `drawImage`s
for caustics per tick; `drawNight(new Date())` allocates a `Date` (and
gradients when tint/beam active) every frame; `pointermove` reads
`offsetWidth/offsetHeight` (forced layout) and `tankPoint` runs
`getBoundingClientRect` per move while `frame()` runs it again per
frame.

**Evidence.** `web/water.ts` (`drawAir`, `drawSurface`, `drawLight`,
`drawNight`), `web/main.ts:332-349` (pointermove tip math),
`web/main.ts` `frame()` hover re-evaluation.

**Change.** Hoist gradients (rebuild on resize/light-bucket change
only); batch the surface into runs or a single path; pass a cached
timestamp into `drawNight`; cache the last rect for hover math (the
frame loop already re-evaluates from the last client point). Measure
with the frame profiler before and after; keep the render-on-tick
gating (PRs #146/#153) intact.

**Acceptance.** (derived) No per-frame allocations in a profiled
minute of calm tank; pointermove performs no layout reads.

**Merged and related.**

- Related: P-19 (render allocations), P-03/P-13 (render-on-tick),
  P-10 (CRT shader cost).
- Sixteenth pass: P-1 and P-3 of `tmp.md` shipped in **PR #263**
  (see the sixteenth-pass Completed section) — the `drawAir` shade
  gradient and the two per-frame `Date`s. P-2 and P-5 map here too:
  the `Date` fix covered P-2's clock reads, and P-5's pointermove
  layout reads are the `tankPoint`/`placeTip` items below. The rect
  and layout reads
  landed separately: `tankPoint` now reads the cached `tankRect()`
  (`web/main.ts:543-555`), and `pointermove` keeps `lastClient` only,
  so hover is evaluated from the frame loop. Still open here:
  `drawSurface`'s ~320 per-column alpha `fillRect`s, `drawLight`'s
  ~56 caustic `drawImage`s, and `placeTip` reading
  `offsetWidth`/`offsetHeight` on every move that shows a tip
  (`web/main.ts:680-684`) — cheap, but cacheable like the rect.

### P-25 `serveThumbs` is O(keys × fish) per wantThumbs push

Size S · Severity nit · Value 1/5 · Risk 1/5 (twelfth pass, N-5)

**Problem.** Each `f:` key does `sim.fish.find(fishThumbKey(f) === k)`
— ~700 string builds per request at 24 fish and ~30 keys. Negligible,
but a `Map` of key→fish built once per call is the same length of
code.

**Evidence.** `web/main.ts` (`serveThumbs`/`wantThumbs`).

**Change.** Build `Map(fishThumbKey(f) → f)` once per serveThumbs
call; look up keys against it. No behavior change.

### P-26 `walkEntry` reads dropped directory trees serially

Size S · Severity nit · Value 1/5 · Risk 1/5 (twelfth pass, N-11)

**Problem.** A folder drop awaits each `readEntries` batch and each
file walk in sequence. Fine for `.azpack` folders (a few dozen
files); a big tree walks slowly and silently — U-10 wants progress
feedback anyway.

**Evidence.** `web/main.ts` (`walkEntry`).

**Change.** Walk siblings with bounded concurrency (4-8) and surface
a count in the drop feedback when U-10 lands. Low priority: correct
today, just slow on pathological drops.

### P-27 Fish-card layout reads run every frame while a card is open

Size S · Severity nit · Value 1/5 · Risk 1/5 (thirteenth pass, N-11)

**Problem.** `layoutInfo`/`syncCard` call `getBoundingClientRect` on
every frame while a Get-Info card is open — cheap per call, but a
layout read in the render loop is the kind that batches badly if the
DOM around it changes.

**Evidence.** `web/main.ts` (`layoutInfo`, `syncCard`).

**Change.** Gate the reads behind a ResizeObserver dirty flag — the
card's anchor only moves when the tank resizes or the fish's box
rebinds, not per frame.

**Acceptance.** (derived) Open a fish card, pin the browser to a
fixed size, confirm no layout reads run between resize events; move
the fish and the card still tracks it.

### P-28 A muted tank keeps the audio device running and the loop rendering into zero gain

Size S · Severity low · Value 2/5 · Risk 2/5 (fourteenth pass)

**Problem.** Mute and volume 0 only glide the master gain to 0. The
AudioContext keeps running, the filter loop keeps rendering into
silence, and one-shots are still created, started and even resumed
for. A tank muted at launch still creates and starts the context (the
app allows audio autoplay), and with Water ambience and Bubble sounds
both off the context still runs. Every keydown and several menu
actions call `unlock()`, which resumes a suspended context. The page
already suspends the context while hidden (`setHidden`), but a tank
you mute and leave open all day still pays for a live output stream;
on macOS that is a CoreAudio stream. Its energy cost, and whether it
holds off idle sleep (App Nap, a coreaudiod idle-sleep assertion),
were not verified.

**Evidence.** Code verified: `web/audio.ts:161` (`level()`),
:161-180 (setVolume/setMuted only call `setTargetAtTime` on the
gain), :204-230 (`unlock()` resumes unless hidden), :236-251
(`setHidden`, the existing suspend path), :329-358 (`play()` still
starts sources and resumes a suspended context), :413-417 and
:428-434 (open/startAmbient start the loop regardless of level);
`web/main.ts:118-122` (the hidden path suspends), :1325-1329
(configureAudio), :1540 (`unlock()` on every keydown);
`macos/Finsical.swift:165` (only video requires a user action).

- Runtime, re-run in verification (AUDIO-06): pressing F while muted
  logs two `resume()` calls and starts the 0.12 s Drop source. With
  the tank paused and muted, the audio threads use 15 CPU ticks per
  10 s (AudioOutputDevice 7, AudioWorkerThread 8, about 1.5% of a
  core); 0 after `ctx.suspend()`, and 14 again after `resume()`.
- Runtime per the reviewer, not re-run (PERF-03): audio-service CPU
  per 15 s was 120 ms unmuted, 130 ms muted, 160 ms muted at launch,
  140 ms with ambience and bubbles off, and 0 ms after a manual
  `ctx.suspend()`; pressing P after that suspend resumed the context
  through `unlock()`.

**Change.** In TankAudio add
`private shouldRun(): boolean { return !this.hidden && this.level() > 0; }`.

- setMuted/setVolume: when the level becomes 0, suspend after the
  glide (a timeout of about 60 ms, guarded by a generation counter so
  a quick unmute cancels it). When it becomes > 0 and the page is
  visible, `ctx.resume().then(() => { if (this.ambientWanted)
  this.startAmbient(); })`.
- open() while the level is 0 clears `openingDue`, as today's muted
  launch effectively does, so the first unmute does not play the
  opening sound hours later.
- play(): when the level is 0, return null without the resume retry
  (the sound would be inaudible).
- unlock() and setHidden(false) resume only when `shouldRun()`.
  B-17's first-gesture retry is untouched.

An unmute sent from the Preferences window arrives with no gesture in
the tank page. In the app (autoplay allowed) and in Chrome with sticky
activation the resume works; otherwise, for example in a browser tank
muted at launch that never resumed under a gesture, the sound waits
for your next click in the tank, as setHidden(false) already relies
on. Optional: treat Pause like hidden for the loop only (a product
call); suspend about 10 s after the last source ends when ambience is
off. A macOS follow-up can route NSWorkspace
`screensDidSleep`/`screensDidWake` to the hidden path.

**Acceptance.** `web/audio.test.ts` (FakeContext): setMuted(true)
calls `suspend()` once after the glide; tap() while muted calls
neither `resume()` nor `start()`; `unlock()` and `feed()` while muted
leave the state 'suspended'; `setVolume(0)` behaves like mute;
setMuted(false) calls `resume()` and the loop is live; hidden followed
by unmute does not resume. Playwright: 0 audio-thread ticks over 10 s
(0 ms audio-service CPU over 15 s) while muted. On a Mac (manual):
`pmset -g assertions` lists no coreaudiod assertion for Finsical
while muted.

**Merged and related.**

- Related: P-23 (Low Power Mode and background-sound preference; the
  same energy goal), B-17 (first-gesture resume; untouched here).
- Fourteenth pass: AUDIO-06, merged with PERF-03 (a duplicate from
  another reviewer; its runtime numbers, the `unlock()`/`feed()`
  acceptance and the optional follow-ups are folded in above).

### P-29 After any stall the next frame runs up to 6 ticks, so every fish jumps about 6x its normal step

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** `planFrame` clamps a late frame to `MAX_FRAME_MS`
(200 ms) and then runs all of it, 5-6 ticks, before a single render.
After an install decode, a GC pause or a slow IDB read, every fish
visibly teleports by several ticks' worth. The freeze itself (P-02) is
the larger artifact; this only shrinks the jump that follows it.

**Evidence.** `core/loop.ts:7` (`MAX_FRAME_MS = 200`), :19-30 (every
whole step is returned); `web/main.ts:2156-2171` (all ticks run
before one `render()`). Re-run in verification (node):
`planFrame(acc, 400, 1000/30)` returns 5 ticks at acc 0 and 6 ticks
at acc 5, 16.7 and 30. The reviewer's perf/jump.mjs during a gup
addon1 install: a 400 ms gap was followed by one 6-tick frame in which
fish moved up to 8.5 tank px (mean 6.3) against a mean of 1.14 px in
a normal 1-tick frame.

**Change.** Lower `MAX_FRAME_MS` in `core/loop.ts` to 100 and update
its doc comment: a stall then feeds at most 3 ticks (about half
today's jump), displays down to 10 fps keep a real-time sim, and
F-10's speed factor can still multiply after the wall-clock clamp.
Corrected from the reviewer's `MAX_TICKS_PER_FRAME = 2`: a tick cap
would slow the sim below real time on any display under 15 fps, break
the existing "keeps the remainder below one step" test (a 100 ms frame
runs 3 ticks), and conflict with F-10's fast-forward, which multiplies
ticks per frame.

**Acceptance.** `core/loop.test.ts`: `planFrame(0, 400, 1000/30)`
returns at most 3 ticks with acc below one step;
`planFrame(10, 100, STEP)` still returns 3 ticks; the 60 and 120 Hz
tests pass unchanged; the "clamps a long stall" test's
`toBeGreaterThanOrEqual(5)` becomes 2. Playwright (jump.mjs pattern):
the frame after a 400 ms install stall runs at most 3 ticks.

**Merged and related.**

- Related: P-02 (the install stall that precedes the jump; PR #226
  shortens it), F-10 (fast-forward multiplies ticks per frame).
- Fourteenth pass: PERF-04.

## Visual and layout (open)

Done this pass and removed from this list: V-01 (PR #87/#125), V-02,
V-11, V-12, V-17's viewport meta (PR #90/#93; favicon is V-19) and
V-10's fish part (ninth pass); V-19 — client-page metadata in PR
#179, favicon in PR #197 (twelfth pass); V-08 (fourteenth pass: verified fixed on main by PR #174; the optional GL row-bleed probe from its acceptance is not in `crt.test.ts`). Fourteenth-pass IDs implemented by this pass's PRs, so never listed here: V-30 (PR #225), V-31 (PR #225; its remainder is listed below).

### V-04 Gravel strips are squeezed with nearest-neighbor, floor height is accidental, and the sim floor ignores it

Size S · Severity medium · Value 3/5 · Risk 2/5

**Problem.** A 1000-px strip is sampled every 3.1 px and becomes coloured noise (Eden, Dutch presets). Floor thickness depends on source width: bamboo 640x116 -> 58 px, jewelstone 800x176 -> 70, whitesand 999x128 -> 41, brownsand 1000x169 -> 54. The sim floor is always y=188, so fish centres sit 27 of 39 px (base strip) to 58 of 70 px (BLACK.GRV) deep inside the gravel art, and pellets rot in the bottom rows. In the original, fish went only ~23% into a 78-px strip.

**Evidence.** `web/main.ts:184-194` (pickGravel), `web/main.ts:1078-1084` (gh = h*320/w, smoothing off), `web/main.ts:1086-1091` (decor at height-6), `core/sim.ts:74` (BOTTOM_PAD 12), `core/sim.ts:229-237` (food settles at height-BOTTOM_PAD), `core/sim.ts:345`, `core/sim.ts:379`.

**Change.** (1) In pickGravel pre-render once: scale by `ART_SCALE * TANK.height / 240` (0.5 once V-05's 240-px tank lands; at 200 px a 1000x169 strip at 0.5 would be 42% of the tank) with smoothing 'high', centre-crop to TANK.width, mirror-tile narrower strips; cache in gravelByPack and draw unscaled at y = H - h. (2) Sim gets a mutable `floorY` (default height - BOTTOM_PAD) and `setFloor(y)`, replacing every `height - BOTTOM_PAD` (sim.ts:231, 345, 379); when the floor rises, fish below it glide up at <= 1.5 px/tick. main.ts calls `sim.setFloor(floorFor(gravelCv))` whenever gravel changes, with a pure `floorFor(stripH) = TANK.height - stripH + round(stripH * GRAVEL_SURFACE)`, GRAVEL_SURFACE = 0.35 until the Grvl record is decoded (verify on 3 strips by overlay screenshot). (3) Each pellet gets a seeded restY in [floorY + 4, H - 4] so pellets scatter across the bed; decor bottoms move to floorY + 4.

**Acceptance.** Tests: sim.test `setFloor(150)` keeps fish y <= 150 after 5000 ticks, pellets settle in the band, a fish at 188 is above 150 within 40 ticks with no NaN; a pure `gravelScale(w, h, tankW, tankH)` test for 1000x169 at tankH 200 and 240.

**Merged and related.**

- Merged from passes 1-7 ("Gravel finish"): feather the strip's top edge 1-2 px into the water, seat decor roots in it (open PR #139 anchors roots a quarter-strip deep) and consider a subtle noise texture over the flat `#8a6d3b` floor.
- `ART_SCALE` now exists in `web/artscale.ts` (PRs #149/#157, open).
- D-01 (fourteenth pass, SIM-05): sleepers all rest on one row, deep in the gravel, with tails still beating at half speed; their resting depth follows this entry's sim floor.

Re-verified open at 62b8572 (fourteenth-pass audit): gravel is now scaled nearest-neighbour in `fitGravel` (`web/main.ts:553-562`) and decor still sits at `TANK.height - 6` (`web/main.ts:2031`).

Thirteenth-pass update: PR #209 (open): drawn gravel is capped near the sim floor.

### V-05 A 16:10 tank inside roughly 4:3 glass leaves 13-24% dead black bands

Size L · Severity medium · Value 4/5 · Risk 4/5

**Problem.** Every machine's screen rect is 1.6:1 inside a glass aperture of 1.25-1.39 (Plus 1.370, Performa 1.387, TAM 1.394, Bondi 1.273; G4 1.566). The water covers only 76-87% of the glass height and #screenback paints black above and below, which reads as dead glass. It also forces the backdrop crop in V-01. The design was intentional (and tested), so this changes a decision.

**Evidence.** `web/machines.ts:10-11` (comment), `web/machines.ts:62-178` (sx/sy/sw/sh), `web/machines.test.ts:116-118` (asserts 1.6), `web/main.ts:24` (TANK), `web/index.html:16`, `web/crt.ts:280-286`, `macos/Finsical.swift` (contentAspectRatio ~:500).

**Change.** Do the single-size step first: TANK = 320x240 (main.ts:24, index.html canvas height). Set each machine's sx/sy/sw/sh to a 4:3 rect centred in the hole with a 4-8 unit inset (the G4 pillarboxes slightly); Bare becomes vbW 320, vbH 240; Swift contentAspectRatio 320x240; update machines.test.ts:118 to 4/3. Saved fish (y <= 200) stay valid and the CRT takes its dimensions from the source at init. Backgrounds then fit 640x480 at exactly 0.5 and ART_SCALE becomes a clean 0.5. Per-machine heights (Sim.resize) only if G4 pillarboxing proves objectionable.

**Acceptance.** Tests: machines.test asserts every sw/sh is 4/3 within 1% and inside the hole; sim.test a Sim(320x240) keeps fish in bounds.

Re-verified open at 62b8572 (fourteenth-pass audit): `TANK = { width: 320, height: 200 }` (`web/main.ts:56`). #171's Height pot can fill the glass, but only with the CRT on, so the bands remain for you whenever the CRT is off.

### V-06 Pitch snaps by up to 45 degrees at the start and end of every roll

Size S · Severity medium · Value 3/5 · Risk 1/5

**Problem.** pitch() has no smoothing. A fish climbing at up to 45 degrees snaps level on the tick it enters a roll, and snaps to the new angle when the roll ends: median ~15 degrees, p90 45 degrees at both ends, about 27 times per fish-minute (fewer after B-07).

**Evidence.** `core/pose.ts:31-37` (pitch: 0 during 'turn', raw heading otherwise), `core/sim.ts:266-287` (turn end sets heading at the target), `web/main.ts:1013-1025`, `web/main.ts:1031-1044` (drawFish rotates by pitch(f)).

**Change.** Keep it render-only: a `WeakMap<Fish, number>` tilt in main.ts advanced once per sim tick (like animFrame integrates on sim.tickCount) toward pitch(f) via a pure `stepTilt(prev, target)` clamped to PI/60 per tick (45 degrees in 0.5 s). During 'turn' the target is 0, so fish ease level. drawFish (and drawPlaceholder) use the tilt. If V-07 lands, feed its residual rotation through the same helper.

**Acceptance.** Test: `|stepTilt(a, b) - a| <= PI/60 + 1e-9` for random inputs; wrapAngle handled.

**Merged and related.**

- Merged from passes 1-7: fish pitch is capped at ±45°, so steep dives clip mid-pose; acceptable, noted here so nobody "fixes" it by raising the cap.

Fourteenth-pass update (SIM-12): still open, and the Evidence line numbers above are stale: `pitch()` is now `core/pose.ts:40-46`, the rotate is `web/main.ts:1937` (`ctx.rotate(pitch(f))`) and the roll end that points the heading straight at the target is `core/sim.ts:490-496`. No tilt smoothing exists anywhere (no `stepTilt` or tilt state in `web/` or `core/`). Runtime, headless (`sim-verify/v7.ts`, 6 fish, 20 min, hunger 0): 10.3 rolls per fish-minute; the pitch change across a roll's start or end has median 10.6 degrees, p90 45.0, max 45.0, and 1276 of 2468 transitions exceed 10 degrees, so this is one of the most frequent visible jumps in the tank. The Change stands; put the pure `stepTilt(prev, target)` in `core/pose.ts`. B-65 (SIM-01's wobble fix, PR #215) removes the other large source of per-tick tilt changes. Acceptance addition: re-running the roll-edge measurement on the drawn tilt shows no per-tick change above 6 degrees.

### V-07 Climb and dive rotate the pixel art although every pack ships authored pitch poses

Size M · Severity medium · Value 4/5 · Risk 3/5

**Problem.** drawFish rotates sprites up to +/-45 degrees with nearest-neighbor sampling on the 320x200 canvas, producing broken outlines; each small angle change re-samples ~27-29% of the sprite's pixels, so climbing fish visibly boil. The placeholder's rotated fillRects anti-alias to off-palette pixels. Every species has a 6-group pitch sheet (FishMaker sequences 9-14: left level, left up, right up, right level, right down, left down; art tilt ~30 degrees), unused. Some 6g sheets have only 1-2 frames (disc, tama, Denden).

**Evidence.** `core/pose.ts:31-37`, `core/pose.ts:113-125` (fishPose), `web/main.ts:1039-1043` (`ctx.rotate(pitch(f))`, smoothing off), `web/main.ts:1047-1061` (placeholder rotates with anti-aliased edges), `core/sim.ts:116-117` (TURN_RATE PI/20).

**Change.** After B-01 (and ideally F-01), pick the pitch sheet as the 6g sheet whose cellW/cellH are closest to the chosen swim sheet (never by position). Before hard-coding the group map, render the 6 groups of a real pitch sheet through swimFrame for both facings and record which reads as left-up etc. (comet: g0 level-left, g1 up-left, g2 up-right, g3 level-right, g4 down-right, g5 down-left; check angels and discus too). Extend fishPose with hysteresis kept on the fish (`f.pitchPose: -1|0|1`): enter at |pitch| > 14-15 degrees, leave at < 8; return `{sheet: 'pitch', g}`; animFrame indexes modulo that sheet's framesPerGroup. drawFish drops ctx.rotate except a residual `(pitch - sign*30deg)` clamped to +/-8-10 degrees (through V-06's stepTilt). The placeholder snaps to 0 or +/-30 degrees. Alternative for packs without a pitch sheet: quantize the drawn pitch (`quantizePitch(prevStep, pitch, PI/24, 0.6)` in pose.ts) and pre-rotate into the swim cache (4x nearest supersample, then 4:1 nearest downsample).

**Acceptance.** Tests (pose.test.ts): the four climb/dive cases, hysteresis (13 degrees after 15 stays pitched, 7 returns level), 'turn' ignores pitch.

### V-09 Plant and accessory previews show the catalog tile, not the art the tank draws

Size S · Severity low · Value 3/5 · Risk 2/5

**Problem.** previewOf uses `imageCanvas(imgs[0], true)`: for many accessories that is the catalog card with its gravel strip and black key background (BEAD_BLU/LB/RED rows are black squares) or the overhead layout view (AZ_SUB), while the tank uses pickDecorArt + keyMask. The preview well is white (.osm-well #fff), so 50% checker shadows look like noise.

**Evidence.** `web/render.ts:74-88` (previewOf renders the largest image opaque), `web/main.ts:199-220`, `web/import.ts:407` (ImportHandlers.preview), `web/import.ts:793-800`, `web/import.ts:1043-1051`, `web/import.ts:931` (THUMB_PREFIX), `web/app.css:205-207`, `web/addons.ts:32`.

**Change.** (Rewritten in the fourteenth pass: `decorCanvases` now exists in `web/render.ts` and THUMB_PREFIX is already 'thumb2:', so the plan reuses that helper instead of a new `decorCanvas` and bumps the prefix to 'thumb3:'.) Pass the section: `ImportHandlers.preview(rs, section)` in `web/import.ts` and both callers (`web/main.ts`, `web/addons.ts`). For plants and accessories return `decorCanvases(images, TANK.height)?.[0] ?? null` (the tank's own pick, key and shrink), falling back to today's path; gravel previews keep their strip (the widest w >= 3h). Give `.ipreview` the tank gradient (#2e7fc4 -> #14508c) so keyed art is not on white, and optionally a size line ('80 x 55 in the tank'). Bump THUMB_PREFIX to 'thumb3:' so cached tiles are redrawn.

**Acceptance.** Vitest: `previewOf` for a fixture with a catalog tile plus keyed side art returns the keyed frame (the same pixels as `decorCanvases` frame 0), not the textured-corner 83x83 tile. Playwright: a screenshot of Accessories shows no purple tiles on the Meka Sphere rows.

**Merged and related.**

- PR #157 (open) adds `decorCanvases(images, tankH)` to `web/render.ts` (pickDecorFrames, key, shrink), but `previewOf` still renders `imgs[0]`: reuse `decorCanvases` here instead of writing a new `decorCanvas`.

Fourteenth-pass update (UI-11): still open. `previewOf` still falls back to `imageCanvas(imgs[0], true)` (`web/render.ts:100-116`; the audit at 62b8572 cites :113-117), so accessories such as Radiance Crystal, Inactive Meka Sphere, Meka Sphere and Omni Crystal show a purple catalog card in the list, the detail well and the stored thumbnails (screenshot `ui/acc-detail.png`). `decorCanvases` is at `web/render.ts:128-136`, THUMB_PREFIX at `web/import.ts:1145`, and `web/addons.ts:32` passes `preview: previewOf`. The Change and Acceptance above now follow this item.


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

Re-verified open at 62b8572 (fourteenth-pass audit): `scaledThumb` still shrinks nearest-neighbour (`web/main.ts:903-913`) and there is no `thumbCrop`.

### V-13 (remainder) Preferences machine previews: old placeholder fish and an optional live snapshot

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** The case art has a transparent glass cut-out over a white well, so every machine looks switched off and the baked-in glass reflections are invisible. 'Bare tank' (no image) is an entirely blank well.

**Evidence.** `web/prefs.ts:296-304` (paintPreview), `web/app.css:79-84` (#pfpreview #fff), `web/main.ts:734-764`.

**Change.** (Narrowed in the fourteenth pass: PR #147's `previewMarkup` fixed the blank well; see the audit note below.) (1) `previewMarkup` (`web/machines.ts`) still draws the old rectangle fish with no waterline or air strip (FOLLOW-UPS.md, Tank): add the waterline and air strip and draw the swimmers in the tank's current stand-in shape. (2) Optional: bus op 'wantSnapshot'; the tank replies with a 160x100 canvas data URL at most once per second while the Machine pane is visible, drawn as an `<image>` at sx/sy/sw/sh beneath the shell.

**Acceptance.** (derived) Screenshots of the Machine pane show a waterline, an air strip and the current stand-in fish in every case, Bare tank included; with the optional snapshot, the preview shows the live tank and updates at most once per second while the pane is visible.

**Merged and related.**

- Overlaps open PR #147 (`previewMarkup()` layers an aperture backplate, water gradient, gravel, three placeholder swimmers and a bubble trail under the shell art for all 11 cases and Bare tank). With #147 merged only the optional live-snapshot follow-up remains.

Fourteenth-pass audit (62b8572): the blank well is fixed. PR #147 (merged via #161) added `previewMarkup` (`web/machines.ts:87-137`), which draws the backplate, water, gravel, placeholder swimmers and bubbles under every case, Bare tank included; `web/prefs.ts:352-360` uses it and `web/machines.test.ts:152` tests it (screenshot `ui/mach-grid.png`). The Problem above describes the state before #147. Still open: the old rectangle fish with no waterline or air strip (FOLLOW-UPS.md) and the optional live snapshot.

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

Thirteenth-pass update: PR #234 (open): applyMask now calls invalidateShadow.

### V-18 The add-on detail line uses a middle dot that the Geneva 10 bitmap font lacks

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** `${KIND} · archive.org` renders in .imeta (Osmium Geneva 10), which has no U+00B7, so that one glyph falls back to an anti-aliased system font. Charcoal 12 has it; every other non-ASCII UI glyph is covered.

**Evidence.** `web/import.ts:785-786`, `node_modules/osmium-ui/src/fonts/geneva10.ts`, `node_modules/osmium-ui/src/fonts/geneva9.ts`.

**Change.** Use ', ' (Finder Get Info style) or a spaced U+2014 dash (present in Geneva 10), or add U+00B7 to Osmium's Geneva 9/10 strikes upstream (Mac Roman 0xE1 exists in the original). T-03 replaces the line with a source credit anyway.

**Acceptance.** (derived) A screenshot of the detail line shows no anti-aliased fallback glyph.

Re-verified open at 62b8572 (fourteenth-pass audit): the line is now `web/import.ts:988`.


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

Re-verified open at 62b8572 (fourteenth-pass audit): decor is blitted unsheared (`web/main.ts:2025-2032`) and there are no fish shadows.

Thirteenth-pass update: PR #238 (open) adds the plant sway.

Fifteenth pass: banded plant sway landed (PR #238); fish
shadows and tumbling crumbs remain.

### V-21 Pellet eaten animation

Size S · Severity idea · Value 2/5 · Risk 1/5 (from passes 1-7)

**Problem.** Eaten pellets vanish in one frame.

**Evidence.** `web/water.ts` pellet drawing (PR #158); `core/sim.ts`
`food.eaten`.

**Change.** A render-only shrink or rotate over 3-4 frames before the
splash, keyed on the eat tick.

**Acceptance.** (derived) A pure frame-envelope test; screenshot of a
pellet mid-shrink.

Thirteenth-pass update: PR #209 (open): eating a pellet spawns a gulp bubble at the fish's mouth.

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

Re-verified open at 62b8572 (fourteenth-pass audit): murk is still one fixed gradient (`web/water.ts:557-562`).

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

**Merged and related.**

- A-08 (fourteenth pass, VISUAL-06): the iMac G3 cases' opaque white glass glare stays lit at night; its plan dims the glare with the light.
- D-40 (fourteenth pass, DELIGHT-01, PR #242): flashlight at night, the pointer lights a warm circle of the dark tank.
- Moonlight leftovers merged into D-01 (darker sleeping sprites, sparkles at night) belong here: the fourteenth pass found D-01's sleep state fixed on main and did not check these two.
- Related: D-28 (bubble trails behind fish) can share the plankton particle list below.

Re-verified open at 62b8572 (fourteenth-pass audit): night is a tint plus the moonbeam (`web/main.ts:2083-2129`).

Fourteenth-pass update (DELIGHT-11): a mechanism for the "faint bottom bioluminescence" idea, glowing plankton lit by disturbance, the way dinoflagellates flash where water is stirred. A fish woken by a tap or out for food at night leaves a short cyan-green wake, and a knock on the glass leaves a ring of sparks. Sleepers barely move (speed about cruise * 0.04, `core/sim.ts:449-458`), so the tank stays calm unless something happens. Evidence: `web/main.ts:2083-2129` (drawNight), `web/fx.ts:23-90` (render-only ripple and splash lists, the same pattern). The reviewer's prototype (diff inspected) spawns sparks at the tail with probability 0.35 per tick while light < 0.5 and speed > 0.5 and draws them with 'lighter' after the night veil; `p07-night-glow-emotes.png` (inspected) shows the trail but confirms that 1-px sparks at alpha 0.9 are faint at 1.42x. Change: in `web/fx.ts` add a `Spark {x, y, age, life}` type; pure `spawnWake(fish, rand)`, `burst(x, y, n, rand)` for taps (12 sparks on a 6-px ring, drifting outward) and `tickSparks` with a 150-spark cap; and `drawSparks(ctx, sparks)` using 'lighter' in rgba(110,255,215,a), 1x2 px with a brighter core and about 45 ticks of life. `tickSim` spawns wake sparks only while `sim.light < SLEEP_LIGHT`; a night tap adds a burst; sparks are drawn right after `drawNight`; none under reduced motion. Optional Lighting checkbox "Glowing plankton at night", default on. Acceptance: Vitest: no sparks at light 1; the count stays under the cap over 10k ticks with 24 fish; deterministic with a seeded rand. Playwright: at night a tap produces at least 8 bright cyan pixels near it within 100 ms and none after 2 s; daytime frames are unchanged. Size S, Value 3/5, Risk 1/5; a PR candidate.

Thirteenth-pass variant (N-20): a starfield plus an occasional shooting star on the black #screenback letterbox at night — the matte is already black, so the canvas is ~50 lines.

### V-24 `#opentrigger` overlaps the case's rounded corner

Size S · Severity nit · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** On some machines the touch "Add-ons…" trigger sits over the
case's rounded corner.

**Evidence.** `web/main.ts:805-822` (touch button), `web/app.css`.

**Change.** Position it from the machine's opaque bezel rect (viewBox
units) rather than the window corner.

**Acceptance.** (derived) Screenshots for all 11 machines at a phone
size show the trigger fully on the bezel.

Re-verified open at 62b8572 (fourteenth-pass audit): the trigger is fixed to the viewport's bottom-right (`web/app.css:11-15`).

### V-25 Bright fish over bright backdrops wash out

Size S · Severity idea · Value 2/5 · Risk 1/5 (from pass 8)

**Problem.** Pale scenery can wash out light sprites.

**Evidence.** `web/main.ts` `drawFish`; light backgrounds in the JPN
set.

**Change.** A subtle darker 1 px outline on fish, or slight backdrop
dimming behind fish only when contrast is low.

**Acceptance.** (derived) A contrast check on a pale backdrop fixture;
screenshot comparison.

### V-26 The Get Info card renders under the machine's glass reflections

Size S · Severity low · Value 2/5 · Risk 2/5 (eleventh pass)

**Problem.** `#screen` (`z-index: 1`) creates a stacking context, so
`.finfo` (`z-index: 2` inside it) paints below `#machine`
(`z-index: 2`): the Get Info card slides under glass reflections
instead of floating above them like a real Mac window.

**Evidence.** `web/app.css:28-29` (`#screen`, `#machine`),
`web/app.css:88-93` (`.finfo`), `web/main.ts` `openInfo` (appends to
`screenEl`).

**Change.** Move the card out of `#screen`'s stacking context (append
to `body` and position from viewport coords, like the fish tip) or
lift it above `#machine` without breaking tap-through. Re-check the
under-fish flip (`main.ts` card placement) after the move.

**Acceptance.** (derived) Screenshot: the card paints above the case
art at every machine; clicks still feed/tap around it.

### V-27 The browser menu bar covers the top of the machine art

Size S · Severity low · Value 2/5 · Risk 1/5 (eleventh pass)

**Problem.** `#menubar` is fixed at the top of the viewport
(`z-index: 6`) but `layoutMachine()` sizes the machine from the full
viewport, so the Platinum bar hides the top of the case art in
browser builds.

**Evidence.** `web/app.css:56` (`#menubar`), `web/main.ts`
`layoutMachine()` (uses full client size).

**Change.** Subtract the menubar height from the layout viewport when
the bar is mounted (browser only; native keeps AppKit menus), via the
same DOM-presence check PR #120 used for the Add-ons trigger.

**Acceptance.** (derived) With the bar mounted, no machine pixels hide
under it at 800x600 and 1440x900; native layout unchanged.

### V-28 The Get-Info card can clip under the machine art edge

Size S · Severity nit · Value 1/5 · Risk 1/5 (thirteenth pass, N-12)

**Problem.** `#fishtip`/`.finfo` sit at z-index 5/2 — under the
menubar (6) and overlays (10) as intended — but `.finfo` shares the
machine layer, so on cases whose art edge overlaps the tank the card
can slide under the bezel.

**Evidence.** `web/app.css` (`#fishtip`, `.finfo` z-index),
`web/machines.ts` (case art edge).

**Change.** Raise `.finfo` above the machine layer but below the
overlays, or clamp the card inside the glass rect.

### V-29 Switching machines, or a cold first load, shows a caseless tank until the case PNG arrives

Size S · Severity low · Value 2/5 · Risk 2/5 (fourteenth pass)

**Problem.** `applyMachine()` replaces the shell markup with the new `<image>` and re-lays out `#screen` at once. The 0.4-1.8 MB case PNG then loads asynchronously, so until it arrives and decodes, the old case is gone and the tank floats over the black backplate at the new rect. The same happens on a cold first load. Served locally (the app or `npm run serve`) this lasts a frame or two (measured in V-34). It matters for a hosted browser build and when you arrow through the Preferences machine list, where every step starts a new download.

**Evidence.** `web/main.ts:1425-1432` (applyMachine), `web/main.ts:1434` (initial apply), `web/machines.ts:72-78` (`shellMarkup` emits an SVG `<image>`). Case PNGs in dist-main/assets range from 401 KB to 1.81 MB. In the reviewer's run with a 1.5 s asset delay, 300 ms after a bus machine switch no case was drawn (`tank/swapflash-300ms.png`, `tank/firstflash-early.png`). The verifier checked this in code only.

**Change.** The reviewer's plan: make the swap atomic by preloading with `const img = new Image(); img.src = m.image; await img.decode().catch(() => {})`, guarded by a generation counter so only the latest request applies, then set the markup, run `layoutMachine()` and `postState()` together; on first load, keep `#screen` and `#screenback` `visibility: hidden` until the first case decodes, with a 3 s fallback. Correction from V-34's verification: pre-decoding with `new Image().decode()` does not remove the gap in Chromium (still 2 caseless frames on each of three switches), because an `<image>` created by innerHTML always loads asynchronously. For the switch, use V-34's double-buffered swap (append the new `<image>` hidden, await its own `load`, then commit in one task), which keeps the generation token and the single commit. What this entry adds is the first-load step: keep `#screen` and `#screenback` hidden until the first case `<image>` has loaded, with the 3 s fallback.

**Acceptance.** Playwright with a 1.5 s delayed asset route: 300 ms after a switch, the old case pixels and the old `#screen` rect are unchanged, and after the load both change together; two switches 100 ms apart end on the second machine with one layout. (derived) On a cold first load under the same route, no frame shows the tank without its case.

**Merged and related.**

- V-34 (VISUAL-02): the same swap gap measured frame by frame, with the verified double-buffered fix; do the two in one change.
- Related: P-11 (the size of the case PNGs), T-29 (a hosted build, where the delay is long; this is worth doing with it rather than alone).
- Fourteenth pass: TANK-08.

### V-31 (remainder) The '(II)' case names tell you nothing about the variant

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** PR #225 (open) fixes the clipped names in the Preferences machine list: the Performas drop "Macintosh", the rows end in an ellipsis rather than mid-glyph, and README's Preferences row names every case family. Still open: the '(II)' suffix on four variants, Performa 450 (II), iMac G3 (Bondi II), iMac G3 (Strawberry II) and iMac G3 (Flower Power II), tells you nothing; only the caption blurb explains the difference. The PR kept 'Performa 450 (II)' rather than the proposed 'Performa 450 (Angled)'.

**Evidence.** `web/machines.ts` names (on the PR branch: `performa-2` at :159, `imac-bondi-2` at :214, `imac-strawberry-2` at :236, `imac-flower-power-2` at :258); `web/prefs.ts:257` and `:348-349` (names shown in the list and caption).

**Change.** A product call: give the variants descriptive display names and keep their ids, so saved choices survive. Candidates from the review: 'Performa 450 (Angled)' (its blurb: "angled, vents showing") and 'Clear' for the Bondi II, which fits its blurb. Each new name must fit the 190-px list without the ellipsis.

**Acceptance.** (derived) Playwright at 565x457: every `#pfmachines .osm-row` has scrollWidth <= clientWidth; the machine tests pass with unchanged ids, and a tank saved on a renamed variant reopens on that case.

**Merged and related.**

- Fourteenth pass: UI-02 (the rest is in PR #225, open).
- Related: U-26 (case thumbnails in the same list need the same width budget).

### V-32 Mac OS 8 alerts get the browser's focus ring around the whole dialog

Size S · Severity low · Value 1/5 · Risk 1/5 (fourteenth pass)

**Problem.** showAlert focuses the alert window itself (tabIndex -1) so Return and Escape reach it; that design is deliberate (FOLLOW-UPS, "Declined in review"). When the alert opens before any pointer input, as the welcome does at launch, `:focus-visible` matches and the UA draws its focus outline around the frame: an orange ring on mobile Chromium, and a dark `auto` ring on desktop Chromium that mostly blends into the black frame. WKWebView was not checked.

**Evidence.** `web/alert.ts:98` (`win.tabIndex = -1`), `web/alert.ts:230` (`win.focus`), `web/app.css:368-381` (`.alertwin` sets no outline). Re-run at runtime (`ui-verify/focus.mjs`, fresh context, archive.org blocked): desktop `{active: true, focusVisible: true, outline: 'rgb(16, 16, 16) auto 1px'}`; mobile (isMobile, 390x700) outline `'rgb(229, 151, 0) auto 1px'`, visible in `ui-verify/alert-m.png`.

**Change.** Add `.alertwin:focus { outline: none; }` to `web/app.css`. The buttons keep Osmium's keyboard ring (`.osm-kbd`), and Tab still moves into them. Check `.ov .iwin` and `.dbwin` the same way.

**Acceptance.** Playwright desktop and isMobile: with the welcome alert open, `getComputedStyle(.alertwin).outlineStyle === 'none'`; a screenshot shows no ring; Tab still lands on 'Not Now' with Osmium's ring.

**Merged and related.**

- Bundle with another CSS fix. The review suggested UI-01 (V-30), but PR #225 (open) fixes that one without this change.
- Fourteenth pass: UI-15.

### V-33 CRT scanlines alias into moire below about 3 device px per game row

Size S · Severity medium · Value 4/5 · Risk 1/5 (fourteenth pass)

**Problem.** The scanline term point-samples sin^2(pi*lp.y) once per device pixel and always applies the full `uScan` depth. Below about 3 device px per game row the row frequency is near or above the pixel Nyquist limit, so a flat colour shows beat bands or, under curvature, wavy moire over the whole picture instead of even scanlines. These scales are common: a 1x display at typical browser sizes gives 1.4-1.9 px/row (the Plus at 1100x800 is 1.42), the native first launch (V-03) is 1.42 on Retina, and the native minimum window (`tankMinScale` 0.25) is 0.94 on Retina.

**Evidence.** `web/crt.ts:186-188` (`float scan = sin(3.14159265 * lp.y); scan *= scan; c *= mix(1.0 - uScan, 1.0, scan);`). `pxScale` (device px per game px) is already computed at `web/crt.ts:90-91` and corrected for the keystone at :118, but the scanline term never reads it. `macos/Finsical.swift:242` (`tankMinScale` 0.25). Runtime, re-run in verification: the real FRAG via `initCrt` over a flat #808080 320x200 source at CRT defaults with flicker and grain 0, DPR 1, centre column, contrast = max-min over 3 device rows (min/median/max, 8-bit levels): 0.94 px/row 3/18/33 (visible wavy moire over the whole picture), 1.42 29/42/52 (irregular), 1.86 13/43/54 (beat bands), 3.0 38/43/47 (steady). The reviewer's in-app screenshots (Plus at 205x285, DPR 2) show the same banding.

**Change.** In FRAG replace `web/crt.ts:186-188`:

```glsl
float fh = min(1.0 / pxScale.y, 1.0);            // footprint in rows
float scan = 0.5 - 0.5 * cos(6.2831853 * lp.y) *
             sin(3.14159265 * fh) / (3.14159265 * fh); // box-averaged sin^2
float sdepth = uScan * smoothstep(1.5, 3.0, pxScale.y);
c *= mix(1.0 - sdepth, 1.0, scan) * (1.0 - 0.5 * (uScan - sdepth));
```

Name it `sdepth`: `depth` is already declared at `web/crt.ts:112`. The last factor keeps the average brightness of today's full-depth dip. Update the Scanlines blurb in `web/prefs.ts:40` to say that scanlines fade out on small pictures (on a 1x display at typical window sizes they will mostly vanish; that is the honest trade-off against moire).

**Acceptance.** Verified in this pass with the prototype: contrast 0/0/1 at 0.94 and 1.42 px/row, 1/3/4 at 1.86, 32/35/39 at 3.0; centre mean 106 before and after. As a check: a Playwright GL probe (as above) keeps the 3-row contrast under 8 levels at 0.94, 1.42 and 1.86 px/row and at 30 or more at 3.0, with the centre mean within 3% of main. `crt.test.ts` still passes. Visual: the Plus at 205x285 at DPR 2 with the CRT on shows no wavy bands on flat water.

**Merged and related.**

- Related: V-03 (the non-integer scales that land below 3 px/row), A-10 and A-11 (CRT polish that builds on `sdepth`; ship them with this or right after).
- Fourteenth pass: VISUAL-01.

### V-34 Switching machines shows the bare tank with no case for 1-2 frames

Size S · Severity medium · Value 4/5 · Risk 2/5 (fourteenth pass)

**Problem.** `applyMachine` replaces the shell SVG's innerHTML and re-lays out #screen and #screenback in the same task. The new `<image>` has not loaded yet and the old one is already gone, so every switch shows only the tank on its black backplate for a frame or two, then the case pops in. It happens on revisits too, and once per row while you arrow through the Preferences Machine list. In the native shell the page also posts the new machine at once, so the window mask and frame change while the page shows no case.

**Evidence.** `web/main.ts:1425-1432` (`shellEl.innerHTML = shellMarkup(m); layoutMachine();`), `web/main.ts:1033-1035` (bus 'machine' op: `applyMachine(nm); postState();`). Runtime, re-run in verification with a CDP screencast at 900x700: switching to imac-bondi, tam and plus each produced a run of caseless frames (mean frame luminance fell from about 100 to about 30 for 2 frames, and for 1-2 frames on the plus revisit). Correction to the reviewer's fix: pre-decoding with `new Image(); await img.decode()` before the swap does not help in Chromium (measured: still 2 caseless frames on each of three switches), because an `<image>` created by innerHTML always loads asynchronously. A double-buffered swap does: appending the new `<image>` with opacity 0, awaiting its own `load` event (42-75 ms), then setting the viewBox, removing the old image and revealing the new one in one task gave no caseless frame (minimum frame luminance 87).

**Change.** In `web/main.ts` keep a `let machineSwap = 0` token. `applyMachine(m)` increments it. For a machine without `image` (Bare) and for the first call at startup, commit synchronously as today. For an image machine, create the `<image>` with `createElementNS` (same attributes as `shellMarkup`), set `style.opacity = "0"`, append it to `shellEl`, and wait for its `load` or `error` event (plus a 1 s timeout fallback). Then, if the token still matches, commit in one task: `machine = m`, set the viewBox, remove every other child, clear the opacity, run `layoutMachine()`, persist `MACHINE_KEY`, and `postState()`. Move the `postState()` from the bus branch at :1035 into the commit so the native mask and frame change on the same frame as the art. If the token no longer matches, remove the hidden element. Drop the reviewer's optional Preferences prewarm of neighbouring case images: it is a different page, and pre-decoding does not remove the gap anyway.

**Acceptance.** Playwright: post `{op:'machine'}` for three machines in a row under a CDP screencast; no frame's mean luminance drops below 60% of its neighbours (no caseless frame). A rAF log of #screen's rect and the shell image href shows no frame with #screen at the new geometry and the old or no href. Two posts 10 ms apart (A then B) end on B with only B's image in the SVG.

**Merged and related.**

- V-29 (TANK-08): the same gap on a slow network, plus the cold first load; its first-load hiding step belongs in this change.
- Fourteenth pass: VISUAL-02.

### V-35 At full Perspective the looming edge spills off the glass and hides about 37 tank px

Size S · Severity nit · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** The keystone divides uv by `depth = 1 - (p - 0.5) * 1.2 * (x - 0.5)`. At p = 1 the display's left edge samples raster u = 0.115, so the leftmost 11.5% of the tank (about 37 px) lands outside the glass on cases with no side margin (Performa 450: `hole.w` equals `sw`), while raster u = 1 lands at display x = 0.885, leaving a black wedge on the far side. Fish can swim out of view. A picture swung on its stand should keep its near edge at the frame and recede on the far side.

**Evidence.** `web/crt.ts:111-113` (skew and keystone, #178). The edge positions above were derived from the formula in verification; screenshot `scratchpad/visual/z13.png` (Performa 450, perspective 1) shows the left content cut at the glass and the black wedge on the right.

**Change.** Normalize the keystone by the looming side: `float a = (uPersp - 0.5) * 1.2; float depth = (1.0 - a * (uv.x - 0.5)) / (1.0 + 0.5 * abs(a));`, so the near edge stays at its neutral place and only the far edge shrinks; consider reducing 1.2 to about 0.8 so the far edge keeps two thirds of the height. Do it together with B-35 (VISUAL-03), whose `crtScreenToRaster` mirror must follow the same formula.

**Acceptance.** `crt.test.ts` (via B-35's `crtScreenToRaster` mirror): at perspective 0 and 1, raster u = 0 and u = 1 map inside the glass, and the looming edge maps to its neutral position within 0.5%.

**Merged and related.**

- B-35 (VISUAL-03): shares the keystone formula through its mirror; do both together.
- Fourteenth pass: VISUAL-13.

### V-36 On the laptop cases the native silhouette mask cuts off the left fifth of the tank's alerts, caution icon included

Size S · Severity low · Value 3/5 · Risk 1/5 (fourteenth pass)

**Problem.** In-page alerts (the glass-tap sign, the welcome and retry alerts) are centred on the whole window viewport. In the app, the window is clipped to the case art's alpha. On the PowerBook G3 and the iBook the lid is narrower than the base and sits right of centre, so the left part of every alert, including its icon, falls outside the silhouette and is cut away. The iMac G4, 20th Anniversary Mac and Bondi lose small corners at 300 pt. The default Plus is not affected, so the first-launch welcome alert is fine unless you have chosen a laptop case.

**Evidence.** `web/alert.ts:49-62` (alertWidth and alertOrigin use only the viewport), `web/alert.ts:161-167` (place()). `macos/Finsical.swift:376-391` (image mask = case alpha stretched to the window) and `:291-367` (flood fill). `web/machines.ts:269-284` (PowerBook hole x 317 to 1022 of 1072; iBook 423 to 1137 of 1284). Re-ran the reviewer's emulation (native branch stubbed, viewport at the machine's aspect, mask computed from the PNG as loadMaskImage does, sign triggered by 6 taps) at 400 pt: Plus 0%, PowerBook G3 18.8%, iBook 14.5% of the alert's area outside the silhouette. The screenshot shows the caution icon and left border in the clipped area. Measured lid spans from the PNG alpha over the glass rows: PowerBook x 279 to 1059, iBook x 360 to 1203 (viewBox units), which at 400 pt are 314 px and 290 px wide, narrower than the 340-px alert. Emulated in Playwright, not run on a Mac.

**Change.** Correction to the reviewer's proposal: anchoring every alert to #screenback narrows it on every case. The Plus alert would go from 294 to 257 px at the first-launch size and to about 170 px at the Plus minimum size, where the alert wraps into many lines, although the Plus is not clipped today. Use a per-machine safe area instead:

- Add an optional `alertBox: {x, w}` in viewBox units to Machine, measured from the art's opaque span over the glass rows: PowerBook G3 `{x: 280, w: 778}`, iBook `{x: 360, w: 843}`. Add others only if the emulation shows clipping above 1%.
- Give `alertWidth` and `alertOrigin` an optional area in CSS px: width = min(MAX_W, area.width - 2*EDGE, innerWidth - 2*EDGE); left = clamp(area.left + (area.width - w)/2, 0, innerWidth - w). Machines without `alertBox` keep today's viewport rule.
- `setAlertArea(fn)` in alert.ts, set from layoutMachine as the scaled box (`ox + box.x*s`, `box.w*s`), and call place() from layoutMachine so a machine switch or resize under an open alert re-anchors it.

**Acceptance.** Vitest: alertOrigin and alertWidth with an area (centred on it, clamped to the viewport, never wider than the area) and without one (unchanged). A Python or vitest check that each `alertBox` column range is opaque (alpha >= 250) in its PNG across the glass rows. The Playwright native-emulation script reports under 1% clipped for every machine at 260, 300, 400 and 600 pt, and the Plus alert keeps its current width.

**Merged and related.**

- Needs a macOS check (T-32).
- Fourteenth pass: MACOS-04.

### V-37 Trackpad scrolling likely rubber-bands the tank page inside its fixed silhouette

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** WebKit on macOS lets the main frame rubber-band even when nothing scrolls. The tank page sets no overflow or overscroll rules and has no wheel handler, but the native layer mask and the window stay fixed. A two-finger swipe over the tank should bounce the case art and the aquarium inside the stationary silhouette, briefly exposing see-through gaps and clipping the art at the mask edge. The Osmium client pages (Preferences, Stats) would bounce their drawn window chrome the same way.

**Evidence.** WebKit safari-612-branch `Source/WebCore/page/Page.cpp:279-280` (main-frame elasticity defaults to ScrollElasticityAllowed), `page/FrameView.cpp:196-208` (the main frame takes the Page's elasticity), `:5140-5145` ("to allow for rubber-band over-scroll behavior, even non-scrollable views should handle wheel events"), `platform/mac/ScrollAnimatorMac.mm:1286-1301` (Allowed stretches whether or not the page scrolls). `web/app.css:1` (html and body: no overflow or overscroll-behavior). No `wheel` listener in `web/*.ts`. `macos/Finsical.swift:376-415` (mask fixed to the window). Source and code only; not observed on a Mac.

**Change.** Tank: `override func scrollWheel(with event: NSEvent) {}` in TankWebView; the tank page has nothing to scroll in the app (the add-on overlay is touch-only). Or page side when inNativeShell(): `window.addEventListener('wheel', e => { if (!(e.target instanceof Element && e.target.closest('.ov'))) e.preventDefault(); }, { passive: false })`, plus `html.tankroot.native { overscroll-behavior: none }` for WebKit 16 and later. Client pages: `overscroll-behavior: none` on Osmium's page root, upstream in osmium-ui.

**Acceptance.** Manual on a Mac with a trackpad: swiping over the tank, Preferences and Stats moves nothing. Lists in Overview and Import Add-ons still scroll.

**Merged and related.**

- Needs a macOS check (T-32); Linux browsers do not rubber-band, so it cannot be reproduced or verified there.
- Fourteenth pass: MACOS-10.

### V-38 The Preferences description clips its third line with no ellipsis

Size S · Severity nit · Value 1/5 · Risk 1/5 (sixteenth pass)

**Problem.** `#pfdesc` is `max-height: 39px; overflow: hidden` over a
13 px line-height — exactly three lines — with no `text-overflow`, so a
description long enough to wrap three times is cut mid-glyph. Every
other truncating surface in the app ends in an ellipsis (for example
`.osm-list-empty`, `web/osmium.css`). The defect is latent: the
longest shipped hint is 101 characters (the Picture pane's `offHint`,
`web/prefs.ts:156-157`), which is one longer sentence away from
showing it.

**Evidence.** `web/app.css:226-231` (`#pfdesc { position: absolute;
left: 0; right: 0; top: 8px; font: var(--osm-font-small);
line-height: 13px; max-height: 39px; overflow: hidden; }` and the
`#pffoot.pfdefaults #pfdesc { right: 76px }` shift),
`web/prefs.ts:244`, `:279` (the hint and `offHint` are the only
things that reach it), `node_modules/osmium-ui/osmium.css:676-681`
(the in-house ellipsis precedent). Read at `06f7935`; wrapping not
measured.

**Change.** `-webkit-line-clamp: 3` with `display: -webkit-box` and
`-webkit-box-orient: vertical` (the clamp needs all three; the
orientation supplies the `...` on the last line), or keep the box
layout and
shorten any hint that would exceed three lines. Prefer the clamp: it
needs no per-pane measurement. Re-check that the
`#pffoot.pfdefaults` `right: 76px` shift, which narrows the box when
Defaults is showing, does not push a hint from two lines to three.

**Acceptance.** Playwright: set `#pfdesc` to a 400-character string;
its height stays 39 px and the third line ends in `...`. Every shipped
hint still fits in the box at the native 565x520 window size and at
1280x900, with and without the Defaults button present.

**Merged and related.**

- Sixteenth pass: V-3 of `tmp.md`, where it was deferred rather than
  dropped; filed so the deferral does not lose it.
- Related: U-27 (Preferences fixed layout and clipping).


## UX and convenience (open)

Done this pass and removed from this list: U-05, U-16, U-17, U-19,
U-02 points 1-3 and 5, and U-20's accessible tank name (PR #90).
Fourteenth-pass IDs implemented by this pass's PRs, so never listed
here: U-32 (PR #220).

### U-01 (remainder) A few extra food clicks foul the whole tank within a minute, with no warning

Size S · Severity medium · Value 4/5 · Risk 2/5

**Problem.** Every click in the top 15% drops a pellet whether or not anyone is hungry. With 4 sated fish: 1 pellet dips water to 0.89, 3 to 0.44, 5 to 0.00 about 61 s after dropping (0.15 at 120 s). Below 0.3 fish stop eating and slow down under brown murk, and full recovery takes ~6.7 minutes. The top of the tank is exactly where a curious new user clicks, so the main interaction punishes playing. One Feed Fish with 7 hungry fish feeds only 1.

**Evidence.** `core/sim.ts:88-92` (WASTE_PER_TICK 1/6000, FILTER_PER_TICK 1/12000, FOOD_ROT_TICKS 1350), `core/sim.ts:174-178` (dropFood), `core/sim.ts:228-240`, `core/sim.test.ts:88-100`, `web/main.ts:100-111`, `web/main.ts:794-797`, `web/main.ts:1111-1116`.

**Change.** (1) `export const MAX_UNEATEN = 6`; `Sim.dropFood(x): boolean` returns false (nothing pushed) once `food.filter(f => !f.eaten).length >= MAX_UNEATEN`; main.ts plays audio.feed() only on true and shows a ripple otherwise (U-03). (2) WASTE_PER_TICK = 1/10000; it must stay above FILTER_PER_TICK or single-pellet rot never shows and the existing rot test fails; the worst case at the cap leaves water ~0.30, so only sustained overfeeding fouls the tank. Update the comment at sim.ts:89. (3) feedFish drops N = clamp(fish with hunger > 0.4, 1, 5) pellets at 160 +/- 24*k, 3 ticks apart via a pending queue drained in frame().

**Acceptance.** Tests: 20 dropFood calls with sated fish leave water >= 0.25 after 60 s; dropFood returns false at the cap; one feed with 5 hungry fish feeds at least 3; existing rot and filter tests pass.

**Merged and related.**

- Merged from passes 1-8 (pellet cap): avoid an evict-oldest cap that lets repeated feeding erase waste for free (`MAX_UNEATEN` refusing new pellets is fine); add gentle overfeeding feedback, since fouling within about a second of overfeeding reads as broken. Test sustained input, settled waste and feeding fairness. The fish cap (24) is in open PR #111.
- PR #158 (open) already makes Feed Fish scatter 3-5 pellets (a fixed random pinch, not the hunger-based count proposed in point 3); reconcile point 3 with it. PR #154's opportunistic eating (B-10) reduces rot from ignored pellets.

Twelfth-pass update: PR #189 lands points 1 and 2 — `MAX_UNEATEN` =
6 (`dropFood` → `Food | null`), `WASTE_PER_TICK` = 1/10000, a
throttled refusal alert instead of the ripple, and delayed pinch
pellets skipped while paused (fixes N-1). Still open: point 3's
hunger-based pinch count and a pending queue drained on the frame
clock (today's pinch still runs on `setTimeout`s — paused pellets
are skipped, but the scatter is PR #158's fixed random one).

Fourteenth-pass audit (62b8572): point 3 landed in a different form, which corrects the twelfth-pass note above. Feed Fish now drops one pellet per fish with hunger above `HUNGER_SEEK`, at least 1 and at most 5 (`feedPinch` in `web/water.ts`, called from `feedFish` at `web/main.ts:1457-1473`), a click feeds only in the 10-px air strip (`web/feedzone.ts:11-13`), and fish eat opportunistically (`core/sim.ts:106-108`). The pinch still runs on `setTimeout`s and uses one x for every pellet (U-31). Still open on main, pending PR #189 (open): no `MAX_UNEATEN` cap (`Sim.dropFood` always pushes, `core/sim.ts:302-307`), `WASTE_PER_TICK` still 1/6000 (`core/sim.ts:115`), and no overfeeding feedback. The perf reviewer found P-20 otherwise stale; its only remaining piece is this cap.

Fourteenth-pass update (TANK-04): re-verified still open on main, and the F key is unbounded too: `feedPinch` drops at least one pellet per press (`Math.max(1, ...)`, `web/water.ts:172-184`), so repeated F presses on a sated tank add up just like clicks. Clicking is the gesture the README and the tank's aria-label teach, and the murk that follows looks like a broken tank. Evidence: `core/sim.ts:302-307` (dropFood, no cap), `core/sim.ts:115-117` (WASTE 1/6000, FILTER 1/12000), `web/main.ts:297-300` (click feed), `web/main.ts:1457-1471` (feedFish). Headless re-run against `core/sim.ts` (`tank-verify/overfeed.ts`), 3 fish at hunger 0.53 and 10 pellets: water 1.00 at 15 s, 0.57 at 30 s, 0.08 at 45 s and 0.00 at 60 s with 7 pellets still uneaten, then 0.15 at 120 s; the reviewer's Playwright run agrees (0.55 at 30 s, 0.00 at 60 s). The review's Change is points 1 and 2 (`MAX_UNEATEN` = 6, `dropFood` returns `null` at the cap, `WASTE_PER_TICK` = 1/10000 and never below FILTER_PER_TICK, see "Declined, refuted and corrected"), with its own feedback: pointerdown and the `feedFish` timer callback handle `null`, and a refused click still shows a small splash and pushes the surface but plays no feed sound and adds no pellet, so you can see the tank declining food. PR #189 shows a throttled refusal alert instead; settle on one when it lands. Acceptance addition: Playwright, 10 clicks along the air strip leave water >= 0.3 at 60 s.

Thirteenth-pass update: PR #209 (open): MAX_UNEATEN caps uneaten pellets with a shared refusal blip; #252 (open) adds the feed affordance.

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

**Change.** Placeholders that remain are named "Starter fish" (or
"Stand-in fish") and get a placeholder thumb keyed as the UI-13 update
below describes, over seeded 3-tone dithered sand prerendered once (the
hand-made 2-frame sprite this Change first asked for landed as #131's
pixel guppy); a dismissible
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
- Fourteenth pass: DELIGHT-12 (a Finsical Guide with Apple Guide-style "How do I…?" topics and red coach marks) is filed as F-40; it could carry the in-tank guidance.
- Fourteenth pass: UI-13.

Fourteenth-pass audit (62b8572): PR #160's welcome alert and starter set are on main (`web/welcome.ts`, `web/starter.ts`), and the stand-ins are now a 2-frame pixel guppy (`web/placeholder.ts`), so the Problem's "14x8 orange blocks" is out of date. Still open: stand-ins are listed as "Fish" (`web/overviewmodel.ts:81`) with no thumb (`web/main.ts:919`), the gravel is a flat brown bar (`web/main.ts:2017-2019`), nothing in the tank points at Import Add-ons, and a failed azpack load is console-only (`web/main.ts:1624`).

Fourteenth-pass update (UI-13): re-verified. After you decline the welcome, Overview lists the stand-ins as four identical rows, Name 'Fish' and Kind 'Fish', with empty thumbnail boxes, and Stats names the hungriest fish 'Fish': it looks broken, and it is the first thing a new user sees in those windows (screenshot `ui/fresh-overview.png`). Evidence: `fishThumb` returns null for sheetless fish (`web/main.ts:914-919`) although `placeholderFrames` exists (`web/placeholder.ts:61-75`); their keys stay pending (`web/main.ts:964-982`); DEFAULT_FISH has no species (`web/main.ts:164-167`); the name falls back to 'Fish' (`web/overviewmodel.ts:81`); `fishThumbKey` is `f:${id}:${pack ?? species}` (`web/bus.ts:16-19`). Correction to the review's plan, which also shapes this entry's placeholder thumb: memoizing a guppy thumb under today's key would stick. Stand-ins have no species and no pack, so their key `f:<id>:` does not change when a later manual install gives them round-robin art (only the welcome's `fishArrived` removes them, `web/main.ts:1663-1673`; see B-15), Overview never re-asks a key it has, and `paintThumbs` skips boxes that already hold an image (`web/overview.ts:171-180`). Change for the name and thumb: postState adds `standIn: true` for fish whose `sheetOf(f)` is null, and `fishThumbKey` appends '~' for them, so the key changes when art binds and Overview asks again; `fishThumb` serves `placeholderFrames()[0]` (right-facing) scaled into the 38x28 box for '~' keys; `itemsOf` and `deriveStats` show 'Stand-in fish' (or 'Starter fish') for stand-ins without setting `f.pack` (B-15 declined that); leave the persisted species alone. Acceptance addition: Playwright on a fresh context with Not Now, overview.html shows 4 rows, each with an `<img>` in `.othumb` and a name other than 'Fish'; after a manual fish install the stand-in thumbs change to the adopted art; after Stock the Tank the stand-ins leave as before.

Thirteenth-pass update: PR #249 (open): stand-ins are labeled in the Overview; the placeholder-thumb half stays open.

### U-03 (remainder) Feeding and tapping: no hand or shaker cursor, a tiny feed target, silence without the game's sounds

Size M · Severity medium · Value 4/5 · Risk 2/5

**Problem.** Two invisible click zones (top 15% feeds, lower taps the glass) share the default arrow; a tap more than 48 px from any fish changes nothing; Finsical ships no samples and the only Sounds add-on is music, so both actions are silent for nearly every user.

**Evidence.** `web/main.ts:100-111` (zones split at y < 0.15*height, no pointermove handler), `web/main.ts:1093-1099`, `web/app.css:28` (`#screen { cursor: default }`), `web/app.css:34-35`, `web/audio.ts:128-148`, `web/render.ts:12-29` (gridCanvas), `web/icons.ts:11-13`.

**Change.** (1) Cursors: new `web/cursors.ts` with original 16x16 pixel grids (Osmium sprite keys) for SHAKER (hotspot at the spout), KNUCKLE (hotspot at the knuckles), HAND_OPEN, HAND_CLOSED, rasterized with gridCanvas at 1x and 2x into data URLs; CSS `-webkit-image-set(url(1x) 1x, url(2x) 2x) hx hy, url(1x) hx hy, pointer`. Factor the letterbox math into a pure exported `mapToTank(rect, clientX, clientY, tank)` and `zoneAt(y): 'feed' | 'tap'`, shared by pointerdown and a new pointermove that sets canvas.style.cursor; a tipped shaker for 150 ms on pointerdown; hands outside the tank rect. The CRT canvas passes pointer events through, so this works with CRT on (combine with B-35). (2) Visual echo: done (tap ripples and feed splashes are on main; see the fourteenth-pass audit below). (3) Fallback sounds when find() returns null: a synthesized 60 ms band-passed noise knock for taps and a 120 ms 600 -> 300 Hz sine plop for feeding; imported samples take precedence.

**Acceptance.** Tests: unit-test zoneAt and mapToTank; Playwright: a click with no fish nearby changes pixels within 8 px of it inside 100 ms.

**Merged and related.**

- Overlaps open PRs #106, #107 and #129 (three competing tap-ripple and splash implementations), #143 (feed-zone crosshair and a bright 1 px boundary under the pointer, `containPoint` letterbox math) and #106 (drag-to-feed). With those merged, point (2) is done and the cursor work narrows to shaker/knuckle art.
- Merged from passes 1-7: `cursor: grab` on `body.tankpage` suggests window-drag in plain browsers where it does nothing; the feed affordance still lacks a crumb trail and a "plip" on drop; a touch long-press could be the scare/knock gesture; on touch the feed-vs-tap split is hard to discover even with a menu bar (a first-use hint helps).
- Eleventh-pass: PR #184 sets `cursor: default` on `canvas#tank` (the
  water never drags; the feed-zone inline crosshair still overrides)
  and wraps the fish tip; the custom-cursor art, pellet echo and
  fallback synth sounds stay open.
- Related: B-35 (CRT pointer mapping), U-18.
- Fourteenth pass: AUDIO-07 ('Bubble sounds' does nothing with the game's sounds) is filed as U-33; its synthesized bubble pairs with point (3).
- Fourteenth pass: TANK-03 (the browser menu bar covers the top of every case) is filed under U-14; its change also scopes the `cursor: grab` rule noted above to the app.
- Fourteenth pass: UI-16 ('Bubble sounds' does nothing with any archive add-on) is filed as U-36.
- Fourteenth pass: TANK-05, FIDELITY-05, DELIGHT-21 (updates below).

Fourteenth-pass audit (62b8572): point (2) is done: tap ripples and feed splashes (`web/main.ts:283-306`), plus a crosshair and a bright waterline over the feed zone (`web/main.ts:268-282`). The game's own AZ_WAVES sounds now play for drops and taps (`web/audio.ts:361-401`), installed by the starter set (#166) or by the one-time backfill for older tanks (#172, `web/welcome.ts:55-70`), so point (3)'s premise that nearly every user hears nothing is stale: only users who answer the welcome with Not Now stay silent. Still open: the shaker and knuckle (or hand) cursor art, the synthesized fallback sounds for those silent users, and `body.tankpage { cursor: grab }` (`web/app.css:34`).

Fourteenth-pass update (TANK-05): the feed target is about 8 CSS px tall in the app's default window and in small browser windows. Since feeding moved to the air strip (`y < SURFACE + 1`, 11 of 200 rows; `web/feedzone.ts:11-13` isFeedZoneY, `core/sim.ts:90` SURFACE 10), the strip is 5.5% of the screen rect, and the crosshair appears only once the pointer is already inside it. A miss taps the glass, and six misses within 8 s bring up the modal "Please don't tap on the glass" alert (`web/scold.ts:6-7` and `:23`, SPREE_TAPS 6, SPREE_MS 8000); touch users get the same strip under a finger. The native app's first window starts at 640x400 (`macos/Finsical.swift:730`) and snaps to the case aspect at the same height (`:260-270`), so the default Plus window is about 310x400 and its strip is 11 x 376 x (400/1059) / 200 = 7.8 px tall. The reviewer's figures (`tank/band.mts`, from `web/machines.ts` geometry): at 480x360, 6.5 px (TAM), 7.0 (Plus), 8.0-9.1 (iMacs, Performas, PowerBook) and 16.5 (Bare); at 800x600, 10.9-15.2 px; at 1100x800, 14.6-20.2 px. (The reviewer cited `feedzone.ts:242-244` and `scold.ts:213-214`, which don't exist; the lines above are the correct ones.) FOLLOW-UPS.md lists the strip height as a call to revisit; this adds the measurements and a fix that keeps the drawn waterline. Change: `isFeedZoneY(y, cssPerRow = Infinity)` returns `y < Math.max(SURFACE + 1, MIN_FEED_CSS_PX / cssPerRow)`, with `MIN_FEED_CSS_PX = 16`, or 24 for `pointerType === "touch"`; `main.ts` passes the contain scale (`Math.min(rect.w/320, rect.h/200)`, as in `containPoint`) from pointerdown (`web/main.ts:284-309`) and `syncFeedHover`, so the crosshair and the waterline highlight match the target; the pellet still enters at FOOD_ENTRY_Y at the clicked x; `fishAtPoint` (`web/main.ts:258-260`) keeps the drawn line (the default argument), otherwise fish swimming just under the surface could no longer be hovered or Option-clicked at small sizes; windows whose strip is already >= 16 px behave exactly as today. Acceptance: `feedzone.test.ts`, at 0.64 CSS px per row y=20 feeds and y=26 taps, at 2 px per row the boundary stays at y < 11, and the default argument keeps today's behavior; Playwright on the Plus at 480x360, a click 12 CSS px below the tank top drops a pellet and hovering there shows the crosshair, and hovering a fish at y=14 still shows its balloon.

Fourteenth-pass update (FIDELITY-05): the original's cursors refine point (1). In AquaZone "the mouse pointer changes to a small hand when it moves over the aquarium. Clicking … is equivalent to tapping on the glass" (guide, "small hand" paragraph). The Windows build's `aquazone.dll` keeps the whole set: CRSR500 a raised pointing hand; CRSR1100-1102 finger up, finger bending and knuckle striking with three impact ticks; CRSR1000-1007 an 8-frame flask filling with blue water (the busy cursor) (`fidelity/cursors/sheet.png`, viewed). So instead of a static KNUCKLE, the original design is a hand at rest plus a three-frame knock. Over the water Finsical shows the default arrow; only the air strip gets a crosshair (`web/main.ts:270-275`, `canvas.style.cursor = on ? "crosshair" : ""`; `web/app.css:28`, `#screen { cursor: default }`). The reviewer's `run1.mjs` read `cursor: default` over water (consistent with the code, not rerun). Change: `web/cursors.ts` with Finsical's own 16x16 Osmium sprite grids (not the game's pixels) for HAND, KNOCK_1 and KNOCK_2, rasterized to 1x and 2x data URLs (`-webkit-image-set` as point (1) describes) with hotspots; `setFeedHover` sets HAND over the water instead of ''; a water pointerdown steps KNOCK_1, KNOCK_2, HAND over about 180 ms, and moving into the air strip cancels it. Optional: the flask as the busy cursor while `restore()` re-downloads add-ons at launch (DELIGHT-21 below proposes a wristwatch for the same moment; pick one); later a small PE RT_CURSOR reader could load the game's own cursors from `aquazone.dll` at runtime, like the sound bank. Acceptance: `cursors.test.ts`, every sprite is 16 rows of 16 and the hotspot pixel is opaque; Playwright, over the water the cursor contains 'url(', over the air strip it is 'crosshair', and a water click changes the cursor within 50 ms and returns it to HAND by 300 ms.

Fourteenth-pass update (DELIGHT-21): a busy cursor while add-ons restore. At launch the saved add-ons take 10 to 30 s to restore, the tank shows stand-ins, and nothing says it is busy; the classic answer was the wristwatch cursor with its advancing hand. (The proposal's other half, the original's "small hand" over the water, guide `:714`, is point (1)'s HAND and KNUCKLE work.) Evidence: `web/main.ts:271-275` (only a crosshair, over the feed strip), `web/main.ts:1629` (the launch restore chain), `web/main.ts:741-775` (restore retries, known busy windows); `web/cursors.ts` does not exist yet. Change: in `web/cursors.ts` (created here or by point (1)) add 8 original 16x16 watch frames with the hand at 45° steps, and `watchCursor(frame)`, which returns a CSS cursor value with a hotspot; while the launch restore chain or any install is in flight and the pointer is over the tank, `main.ts` swaps `canvas.style.cursor` every 125 ms, then restores the zone cursor, and it stops while the page is hidden. Acceptance: Vitest, the frame sequence cycles and `watchCursor` returns valid url() values with hotspots; Playwright with a slowed archive.org route, the canvas cursor holds a watch data URL during the restore and reverts after the last add-on lands. Severity idea, Value 2/5, Risk 1/5.

### U-04 Removing a fish or add-on is instant and permanent: no confirmation, no Undo

Size M · Severity medium · Value 4/5 · Risk 3/5

**Problem.** A slip of the Delete key in Tank Overview permanently loses a fish; removeAddon also deletes all its fish and scenery. The Edit menu has no Undo.

**Evidence.** `web/overview.ts:106-118` (Remove button, plain Delete/Backspace), `web/main.ts:520-521`, `web/main.ts:553-602` (removeAddon), `core/sim.ts:156-159`, `core/sim.ts:167-172`, `macos/Finsical.swift:578-585` (Edit menu without Undo), `web/import.ts:1236`.

**Change.** (0) Cheap guard first: in overview.ts require Cmd-Delete (Mac OS 8 Finder's Move to Trash; Ctrl in a browser), ignore plain Delete. (1) Pure `web/trash.ts`: a stack capped at 10 of `{kind:'fish', fish} | {kind:'addon', it, fish: Fish[]}`, pushed from the removeFish and removeAddon handlers. (2) Bus op 'undo': a fish comes back via `sim.addFish(savedFish)` (keeps its id); an add-on goes back into installedAddons, then `importPanel.restore([it])` (works once B-37 notifies the panel of removals), then the fish are re-added and remapSheetIdx() runs. (3) State carries `undo: string | null` ('Undo Remove “angels”'); native Edit > Undo Cmd-Z evaluates `window.finsical.undo()` with the title validated from the last push; Overview binds Cmd/Ctrl-Z. (4) Before removing an add-on that has fish, a caution alert (U-02's alert module): 'Remove “angels” and its 2 fish from the tank?' [Cancel] [Remove].

**Acceptance.** Tests: vitest trash.ts; Playwright remove then Ctrl+Z restores the count and species; plain Delete no longer removes.

**Merged and related.**

- Merged from pass 8: prefer one-level Undo with a named action and shortcut; keep selection stable after removal and announce the result; test repeated keydown, focused text fields, pack-wide removal and delayed state echo. Open PR #127's two-click arm ("Really empty?") is the in-page confirm pattern, because `confirm()` silently returns false in WKWebView. PR #160's `web/alert.ts` (open) provides point (4)'s alert.
- Fourteenth pass: UI-07 (Delete on a fish in Overview leaves a same-named row and drops the selection) is filed under U-06; its `pendingSelect` step covers the pass-8 note on keeping the selection stable after removal.
- Fourteenth pass: UI-03 (update below).

Re-verified open at 62b8572 (fourteenth-pass audit): plain Delete/Backspace and Remove post at once (`web/overview.ts:116-119`, `:155-163`), there is no undo anywhere, and only Empty Tank has a two-click arm. `web/alert.ts` is now on main, so point (4)'s alert is available.

Fourteenth-pass update (UI-03): Empty Tank… should use that alert too, which replaces the in-page two-click arm the pass-8 note above recommends. In Mac OS 8 a trailing ellipsis means a dialog follows, and the Finder's Empty Trash… raises a caution alert with counts. Tank Overview's 'Empty Tank…' opens nothing: the first click retitles it to bold red 'Really empty?' for 4 s, and a second click empties the tank. The new title is wider than the button because overview.ts assigns textContent (`web/overview.ts:124-154`, textContent at :136 and :144) and never calls Osmium's `setButtonTitle`, so the button keeps the width fitted to 'Empty Tank…' (`fitButton` sets a fixed width, `node_modules/osmium-ui/src/controls.ts:142-152`; `setButtonTitle` refits, `:171-174`) and the '?' is painted past the right border. Red button text (`web/app.css:275-276`, `#oempty` #a00, bold when armed) is not Platinum either. Runtime re-run (`ui-verify/armed.mjs`, fake state): before, width 105, scrollWidth 97 = clientWidth 97; armed, text right edge 140 vs button right 133, scrollWidth 108 > clientWidth 97, font-weight 700; the zoomed screenshot `ui-verify/armed-zoom3.png` shows the '?' outside the bevel. The arm exists because `window.confirm()` returns false in WKWebView, but `web/alert.ts` (showAlert, `:95-235`; alertWidth fits a 361-px Overview at its minimum) is a real Mac OS 8 modal alert that works in any page that links app.css, and overview.html does. Change: in `web/overview.ts` import `showAlert` from ./alert.js; when 'Empty Tank…' is pressed and `tankItems() > 0`, show a caution alert whose text comes from a new pure `emptyTankPrompt(fish, addons)` in `web/overviewmodel.ts` ('The tank holds 3 fish and 7 add-ons. Are you sure you want to remove them all? You can't undo this.'), with buttons [Cancel (cancel)] [Empty (default)]; Empty closes the alert and posts `{op: 'emptyTank'}`. Delete emptyArmTimer, emptyArmedAt, disarmEmpty, the stand-down on state (`web/overview.ts:53`), and the `#oempty` colour and `[data-armed]` rules in app.css. Count add-ons as `(tankState.addons ?? []).length` so the numbers match the tank (U-06). The same alert serves point (4) ('Remove “angels” and its 2 fish from the tank?'). Known limit: `bindDialogKeys` has no unbind (FOLLOW-UPS 'Alerts and Preferences'), so each alert leaves one keydown listener; acceptable for a rare action. Acceptance: Vitest, `emptyTankPrompt(3, 7)`, `(1, 0)` and `(0, 1)` give correct singular and plural text; Playwright on overview.html with a fake BroadcastChannel state, clicking 'Empty Tank…' shows `[role=alertdialog]`, Escape closes it and posts nothing, Return posts exactly one emptyTank, and no button in the window has scrollWidth > clientWidth. Size S, Severity low, Value 3/5, Risk 2/5; a PR candidate.

Thirteenth-pass update: PR #198 (open): removal asks for confirmation; Undo remains open.

Fifteenth pass: Overview Remove is now a two-step armed
button (PR #198); Undo remains.

### U-06 (remainder) Overview: a fish add-on with no fish still says 'In tank', the header miscounts, and Delete drops the selection

Size S · Severity low · Value 3/5 · Risk 2/5

**Problem.** Only the newest gravel and background are drawn, yet every installed one reads 'In tank' and is ticked in the importer; removing a hidden one changes nothing visible, and the only way back to an earlier one is the confusing 'Add Again'. Removing the last fish of a fish add-on makes a new row 'aetena, Fish add-on, In tank' appear; its sheet still feeds loose fish, so it is not truly unused. The header says '8 fish, 0 add-ons' with add-ons installed.

**Evidence.** `web/overviewmodel.ts:72-85` (status hard-coded 'In tank' at :81), `web/overview.ts:161-170` (header counts unbound add-on lines at :168), `web/main.ts:157-194`, `web/main.ts:385-419`, `web/main.ts:520-522`, `web/main.ts:578-587`, `web/import.ts:686`, `web/import.ts:822-824`.

**Change.** Keep the per-pack fallback design (removing the newest gravel falls back to the previous one). The scenery statuses and the way back to hidden scenery that this Change first proposed ('In use'/'Not shown', a `useScenery` op) landed as 'Showing'/'In tank' with a Use button, so what remains is: in itemsOf, a fish add-on with no bound fish gets 'No fish'; the header counts `(s.addons ?? []).length`; after removing a pack's last fish, select the add-on row that appears (key `a:${pack}`) so a second Delete uninstalls it (the UI-07 update below generalizes this step). Do not auto-uninstall or auto-replace.

**Acceptance.** Tests: overviewmodel.test.ts for the 'No fish' status and the count.

**Merged and related.**

- Overlaps open PR #118 (Overview "Use" action; rows show "Showing"/"In tank"). Related: B-20.
- Fourteenth pass: UI-07.

Fourteenth-pass audit (62b8572): rows read "Showing" or "In tank" with a Use button (`web/overviewmodel.ts:88-108`, `web/overview.ts:120-125`). Still open: the 'No fish' status for a fish add-on with no bound fish, the header count (it counts only unbound add-on rows, `web/overview.ts:213`), and selecting the add-on row after removing a pack's last fish.

Fourteenth-pass update (UI-07): re-verified, with what you see. Selecting a pack's last fish (say 'neon') and pressing Delete removes it, but a row with the same name reappears as 'neon, Fish add-on, In tank', so it reads as if Delete did nothing. The selection is dropped because the new row has a new key, so a second Delete does nothing either; deleting a fish whose pack still has other fish also drops the selection. The header counts only rank-1 rows (add-ons with no fish of their own), so it jumps from 4 to 5 add-ons with 7 installed. Evidence: `web/overviewmodel.ts:92-108` (a fish add-on lists itself once no fish is bound, status 'In tank'), `web/overview.ts:213-215` (`addonN` counts rank-1 rows), `web/overview.ts:232-236` (selection kept only by identical key). Verified in code; the reviewer's runtime repro (`ui/sync2.mjs` on a stocked tank) gave header '3 fish, 4 add-ons' before and '2 fish, 5 add-ons' after, with sel null. Refined re-select step (auto-uninstall stays declined): when Remove or Delete posts removeFish, overview.ts remembers the fish's pack and list index in a local `pendingSelect`; on the next rebuild it selects the `a:${pack}` row if it appeared, else the row now at the same index (clamped), so Delete twice removes the fish and then its pack, and repeated Deletes walk the list the way the Finder does. Acceptance addition: Playwright with fake state pushes, Delete on 'neon' selects the 'neon, Fish add-on, No fish' row, and a second Delete posts removeAddon for it.

### U-07 (remainder) Import Add-ons: double-click does nothing; no remembered position or section counts

Size M · Severity low · Value 4/5 · Risk 2/5

**Problem.** In the Chooser and Standard File, double-clicking an item triggers the default button; here it does nothing. Sections are long (395 accessories, 165 fish, 93 plants) and type-select times out after 1 s. Switching sections resets scroll and selection.

**Evidence.** `web/import.ts:564-601`, `web/import.ts:660-677` (mountList without onOpen), `web/import.ts:696-714`, `web/import.ts:789`, `node_modules/osmium-ui/src/controls.ts:752`, `node_modules/osmium-ui/src/controls.ts:920-923`, `node_modules/osmium-ui/src/controls.ts:938` (type-select resets after 1 s), `web/overview.ts:95-99`.

**Change.** (1) `onOpen: (i) => { if (installed.has(rows[i]?.url ?? '')) return; if (addAction) addAction(); else openWhenReady = rows[i]?.url ?? null; }`; at the end of showDetail's fetch, when `detailRef === ref && openWhenReady === it.url`, call offer() then addAction() (onSelect already started the fetch; addAction is null until it loads). (2) The search field: done (the filter landed; see the fourteenth-pass audit below). (3) `Map<section, {scrollTop, url}>` restored in showSection. (4) Counts in the popup ('Accessories (395)').

**Acceptance.** Tests: Playwright double-click adds one fish, not on an installed item.

**Merged and related.**

- Point (2) overlaps open PR #136 (substring filter in the add-on browser header, case-insensitive, per section, "N of M" count, Escape clears the field). With #136 merged, what remains is double-click to add, remembered scroll and selection per section, and section counts.
- Fourteenth pass: UI-12.

Fourteenth-pass audit (62b8572): point (2) landed: a filter field with "N of M" and Escape to clear (`web/import.ts:876-913`, `web/app.css:300-313`), and the last section is remembered (`SECTION_KEY`, `web/import.ts:626`). Still open: double-click to add (no `onOpen`, `web/import.ts:844-851`), per-section scroll and selection memory, and counts in the section popup (`web/import.ts:1359`).

Fourteenth-pass update (UI-12): point (1) re-verified at runtime (`ui-verify/jpn.mjs`): after `dblclick` on the first Fish row the status reads '1 pack, fish.' and the button 'Add to Tank', so nothing was added. Adding a fish takes a click, a wait and 'Add to Tank' instead of one double-click, although Osmium's `onOpen` fires on a second press of the selected row (`node_modules/osmium-ui/src/controls.ts:752` and `:922`) and in Mac OS 8 a double-click in a list presses the default button. Point (1)'s Change stands. Acceptance addition: Playwright with the tank open, double-clicking a not-installed fish row posts exactly one install, and double-clicking an installed row posts nothing.

Thirteenth-pass update: PR #199 (open): double-click installs; search field and section counts remain open.

### U-08 Add-on lists are unsorted, split by case, and duplicates across archives look identical

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** Sections concatenate collections in COLLECTIONS order, each in case-sensitive archive order: Plants starts 'Salma Large, Salma Small, Silver Reed, APONOGET…'; 'black'/'BLACK', 'marble'/'Marble', 'stream'/'Stream' sit far apart in Gravel; 'MekaUni' appears twice in Accessories (US mekaccs.zip and JPN) with identical '<Kind> · archive.org' meta.

**Evidence.** `web/import.ts:37-60` (Collection), `web/import.ts:369-387` (listAddons), `web/import.ts:785-786` (dmeta).

**Change.** Add `source: string` to Collection ('AquaZone add-ons', 'Meka Asia pack', 'AquaZone (JPN) set', 'JPN non-retail bonus') and copy it onto each Importable (identity stays the url). Sort each section by `(rank) || a.inner.localeCompare(b.inner, 'ja', { sensitivity: 'base', numeric: true })`. Show `${KIND}, ${it.source}` in dmeta (see V-18, T-03).

**Acceptance.** Test: vitest listAddons with stubbed collections returns case-insensitively sorted names per section with source set.

**Merged and related.**

- Fourteenth pass: UI-10.

Re-verified open at 62b8572 (fourteenth-pass audit): `listAddons` sorts by section rank only (`web/import.ts:524-525`), Collection has no `source`, and dmeta is "Kind · archive.org" (`web/import.ts:987-988`).

Fourteenth-pass update (UI-10): the in-archive case. 19 Fish entries start with '(通販専用）' ('mail-order only') and several share a species, differing only in the trailing number, for example '(通販専用）アフリカン・ランプアイ(10005)' and '…(10530)'. End truncation (`.irowname` ellipsis, `web/app.css:323`; rowFor shows `it.inner`, `web/import.ts:853-859`) cuts exactly that part, so pairs look identical in the list. Runtime re-run (`ui-verify/jpn.mjs`, addons.html at 621x441): 165 fish, 19 mail-order names, 11 of 19 clipped (name cell clientWidth 196). Names include '(10376.)' with a trailing period, and the numbers repeat across species (10530 twice), so they are not unique ids and their meaning is unknown. Change: a pure `displayName(inner): { name: string; note?: string }` in `web/import.ts` strips a leading '(通販専用）' or '（通販専用）' into the note 'Mail-order only' and keeps the rest, including the trailing '(10005)' or '(10376.)', unchanged. Show the note in the detail meta line ('Fish, Mail-order only', which also avoids V-18's middle dot) and the shortened name in the row and detail title; names that still overflow truncate in the middle so the last 7 characters stay visible; sort with this entry's localeCompare on the display name. Acceptance: Vitest, `displayName('(通販専用）コンゴテトラ(10006)')` gives `{name: 'コンゴテトラ(10006)', note: 'Mail-order only'}`, '(10376.)' survives, and ASCII names pass through unchanged; Playwright at 621x441, the 19 mail-order rows' visible texts are pairwise distinct.

Thirteenth-pass update: PR #199 (open): sections sort alphabetically.

### U-09 Failed installs from Import Add-ons show raw JavaScript errors with full URLs

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** When the tank's fetch fails the window shows e.g. "Couldn't add it: Error: https://archive.org/download/.../arowana.zip: 503" or "TypeError: Failed to fetch"; the local path already maps errors through loadProblem().

**Evidence.** `web/main.ts:607-649` (remoteInstall `fail(String(e))` at :648), `web/import.ts:518-529` (loadProblem), `web/import.ts:1205-1211` (`Couldn't add it: ${m.error}` at :1209).

**Change.** In remoteInstall's catch: `console.warn('remote install failed:', e); fail(loadProblem(e));` (main.ts already imports from ./import.js). Change import.ts:1209 to `Couldn't add it. ${m.error}`, matching the local 'Couldn't load it. …' style.

**Acceptance.** Vitest loadProblem cases: `new TypeError('Failed to fetch')`, an Error ending ': 503' ('archive.org answered with error 503.'), 'no pack inside'.

**Merged and related.**

- Related: U-28.
- Fourteenth pass: IMPORT-05 (Empty Tank during 'Stock the Tank' blames the connection and keeps installing the starter set) is filed as B-72; it shares the `loadProblem(e)` change.

Re-verified open at 62b8572 (fourteenth-pass audit): `installFailed` still carries `String(e)` (`web/main.ts:1200`), the panel shows `Couldn't add it: ${m.error}` (`web/import.ts:1417`), and `loadProblem` is used only for the local path and the welcome.

Thirteenth-pass update: PR #199 (open): the bus posts loadProblem's friendly line instead of the raw error.

### U-10 Dropped files get no highlight and no result message on the tank or the Import window

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** Drag-and-drop is an advertised path (the Sounds pane says to drop files 'on the tank or this window'), but nothing shows a drop target and success or failure only reaches the console; success on Import Add-ons is only audible.

**Evidence.** `web/main.ts:919-1001` (dragover only preventDefaults; every outcome at :945-999 goes to console, oversize skips at :969-972 silent), `web/addons.ts:38-67` (console.warn only; silent return on no records), `web/import.ts:740-743` (invites drops).

**Change.** Count dragenter/dragleave to toggle `body.dropping` and draw the Mac OS 8 drop hilite in CSS (2 px black inset plus a 1 px white inner rule around #screen). After the async import, show a transient Osmium caption box in the screen corner for 3 s ('Added Angelfish', or "Finsical can't use “notes.txt”. Drop an AquaZone .fsh pack, a .azpack folder or a sound file."). Expose `showMessage(text)` on the mountImportPanel return object and use it in addons.ts ('Added N sounds.', 'Nothing to import: that file has no sounds. Drop fish packs on the tank window.', "Couldn't save the sounds."). Optional: forward dropped pack files to the tank (packPut under `drop:{name}` and `{op: 'importDropped', key}`).

**Acceptance.** Tests: Playwright synthetic drop of a .txt shows the caption; a 4-byte bogus file on addons.html shows the status text.

**Merged and related.**

- Related: U-28, B-13, B-47.

Re-verified open at 62b8572 (fourteenth-pass audit): the tank's dragover only calls preventDefault (`web/main.ts:1693`), drop outcomes are console-only, and `web/addons.ts:39-64` returns silently when a file has no records.

Thirteenth-pass update: PR #244 (open): a dashed 'Drop to add' frame shows while files hover; the result toast remains open.

Fifteenth pass: a Mac-style border-invert drop cue now
shows on the glass while files hover (PR #244); a result message
on the tank itself is still absent.

### U-11 Overview rows reshuffle under the pointer when sorted by Status

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** Status text includes transient states ('Turning' ~10 ticks, 'Startled' ~1 s), so each 2 s heartbeat can reorder rows (12 order changes in 30 s with 4 fish). Selection follows the key, so Remove removes the right fish, but a click can land on a row that just moved.

**Evidence.** `web/overviewmodel.ts:44-47` (STATES; 'Turning' at :46), `web/overviewmodel.ts:89-96` (sortItems compares text at :94), `web/overview.ts:161-200`, `core/sim.ts:126` (TURN_TICKS 10).

**Change.** Map `turn` to 'Swimming'. Sort Status by `hungerRank*10 + stateRank` (hungry 0, peckish 1, full 2), then name, instead of text. Optionally defer structure-changing re-sorts while `listEl.matches(':hover')` and flush on pointerleave.

**Acceptance.** Test (overviewmodel.test.ts): fish differing only in turn/drift keep their order; hungry sort before full.

Re-verified open at 62b8572 (fourteenth-pass audit): STATES maps `turn` to 'Turning' (`web/overviewmodel.ts:52-55`), and the Status sort compares text (`web/overviewmodel.ts:117`).

Thirteenth-pass update: PR #195 (open): re-sort only when the key set or column changes.

### U-12 (remainder) Client windows never say when the tank is not connected

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** With no tank (browser dev, tank tab closed or reloading), Add to Tank spins 15 s before 'No response from the tank', Overview's Remove posts into the void, Stats shows stale numbers as live, and Overview is blank before the first push. The native tank lives as long as the app, so this is mostly browser-side.

**Evidence.** `web/addons.ts:15-19`, `web/import.ts:841-851` (15 s timeout), `web/overview.ts:106-118`, `web/overview.ts:161-166`, `web/stats.ts:92-107`.

**Change.** Each page records `lastStateAt` in its state handler and checks `Date.now() - lastStateAt < 6000` every second. Overview: placard 'Waiting for the tank…' and Remove disabled while disconnected. Stats: .osm-disabled look on #srows plus a 'Waiting for the tank…' care line. Import: `PanelOptions.connected?: () => boolean`; addIt shows "The tank isn't running." immediately instead of posting.

**Acceptance.** Tests: Playwright with no tank, Add shows the message at once; after closing the tank, Stats shows 'Waiting…' within 7 s.

**Merged and related.**

- Merged from passes 1-7: grey client-window numbers until the first fresh push after wake ("stale badges").
- Open PR #90 added Overview's "Waiting for the tank…" empty text at mount. Related: B-53, B-55.

Fourteenth-pass audit (62b8572): Overview shows "Waiting for the tank…" until the first push (`web/overview.ts:107`). Still open: no client checks for staleness, Import still waits 15 s before 'No response from the tank' (`web/import.ts:1058-1059`), Stats shows stale numbers as live, and Overview's Remove is not disabled while the tank is gone.

Thirteenth-pass update: PR #195 (open): clients keep a persistent waiting-for-tank state.

### U-13 Preferences: CRT controls stay clickable when WebGL is unavailable

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** With `crt.available === false` the warning shows but 'Simulate a CRT monitor' stays enabled (a click checks it, then the echo unchecks it), Defaults stays enabled while every slider it resets is dimmed, and the footer still says to turn the effect on.

**Evidence.** `web/prefs.ts:171-181` (state handler), `web/prefs.ts:233`, `web/prefs.ts:426-442` (syncEnabled), `web/prefs.ts:446-459`, `web/prefs.html:28-35`, `web/app.css:91`.

**Change.** In the state handler `setEnabled(onBox, crt.available !== false)`; in syncEnabled `defaultsBtn.disabled = !onBox.checked`; while unavailable, describe(null) shows "This Mac can't show the CRT effect. Settings are kept." instead of the pane's offHint.

**Acceptance.** Test: Chromium with --disable-webgl at 565x457; checkbox and Defaults disabled.

**Merged and related.**

- Fourteenth pass: UI-14.

Fourteenth-pass update (UI-14): still open, and worse than filed: `#crt-warn` was positioned before the preset row existed (#142), so its third line ('for later.') is painted under the Authentic, Sharp, Soft and Pixel Perfect buttons. Current evidence: `web/prefs.html:27-30` (`#crt-warn`), `web/app.css:157-163` (`#crt-warn` absolute at left 196px, top 0; the presets 10px under the checkbox), `web/prefs.ts:199-207` (the state handler only unhides the warning; the checkbox is never disabled), `web/prefs.ts:526-535` (syncEnabled leaves Defaults alone). The reviewer's run with `--disable-webgl --disable-3d-apis` (`ui/nogl.mjs`) gave warnBottom 70 > presetsTop 60, onDisabled false, defaultsDisabled false; the screenshot `ui/nogl-monitor.png` (checked) shows the overlap and the 'Turn on Simulate a CRT monitor…' caption. Change addition: put `#crt-warn` in the flow under the checkbox (position static, margin-top 6px) and hide `#pfpresets` while unavailable, so nothing overlaps at any text length; recheck UI-01's budget (V-30, PR #225): the Monitor pane must still clear the separator with the warning shown. Acceptance (supersedes the line above): Playwright with `--disable-webgl --disable-3d-apis`, `#crt-warn`'s rect intersects neither `#pfpresets` nor any `.pfgroup`, `#crt-on` and `#pfdefaults` are disabled, the caption is the unavailable text, and the last group still ends 8 px above the separator.

Sixteenth pass (V-1 of `tmp.md`): **shipped in PR #272.** The
Change-addition and this Acceptance were implemented as written —
`#crt-warn` in the flow (`web/app.css`), `#pfpresets[hidden] { display:
none }` (its `display: flex` had made the `hidden` attribute a
no-op), `#crt-on` and `#pfdefaults` disabled with it, and
`syncEnabled()` folding `crtUnavailable` into its `on` so the sliders
and preset buttons dim too. Measured headless with
`--disable-webgl --disable-3d-apis` at 1280x900 and at the native
565x520: no intersection with `#pfpresets` or any `.pfgroup` (12 px
clear above the first), controls disabled, presets hidden, 455 px
(63 px native) of clearance to `#pffoot`; the WebGL-available pane is
unchanged (warning hidden, presets at y 60-80). UI-01's budget
(V-30) is respected by that clearance. Verify against `origin/main`
before picking this up again — PR #272 may have merged.

### U-14 (remainder) The browser menu bar covers the top of the case, and its menus disagree with the app's

Size M · Severity low · Value 3/5 · Risk 2/5

**Problem.** Desktop browsers show no controls; shortcuts are undocumented; prefs.html and overview.html must be typed. On touch the only control is a tiny 'Add-ons…' button, so an iPad cannot remove fish, change the machine or open stats. The README ships a Mac app and there is no hosted build yet (T-29), so this is secondary.

**Evidence.** `web/main.ts:802-868` (only Ctrl/Cmd-I, F, C, S; stats tab logic at :835-866), `web/index.html:12-24`, `web/app.css:10-15`, `node_modules/osmium-ui/src/menubar.ts:53-54` (mountMenuBar, unused), `macos/Finsical.swift:543-609`.

**Change.** The Osmium menu bar this Change specified landed with #102 (a fish-glyph menu in the Apple slot, the Tank items, a System 8 clock, `openClientWindow`), so this is now the remainder. (1) Offset the case below the bar and keep the menus live while windows are open: the original "offset #machine by 20 px" step, specified in the TANK-03 and VISUAL-04 update below. (2) Match the app's menus and show key equivalents, keeping the menu table in a pure module shared with the keydown handler and the Shortcuts window (UI-08 update below). (3) Add the items still missing from the original list: Show Balloons in the fish-glyph menu, Degauss in the Tank menu, and a Machine submenu. (4) A click on the clock shows the date (TANK-18 update below). Touch keeps #opentrigger or uses the sticky menus.

**Acceptance.** Tests: every key equivalent maps to exactly one action (no menu-bar tests exist yet); Playwright: Tank > Tank Overview opens a window that receives state; arrow keys walk the menus. The updates below add acceptance for each piece.

**Merged and related.**

- Overlaps open PRs #102 (Mac OS 8 menu bar with Tank/Window/Help menus, app-glyph menu, System 8 clock, `openClientWindow`), #103 (Osmium menu bar with About, Change Water, Take a Picture) and #126 (bare `o`/`p` keys). This is implemented three ways in unmerged PRs: reconcile rather than reimplement.
- Merged from passes 1-7: `#opentrigger` shows only on `hover: none`, so stylus-with-mouse and hybrid laptops can miss it; also show it when no menu bar is available (browser only).
- U-32 (fourteenth pass, TANK-02, PR #220): the Window menu items and the S key open Preferences, Overview and Stats as small windows at the app's sizes instead of full-size tabs.
- Related: U-37 (the clock is 12-hour while Lighting and Stats are 24-hour), U-39 (a Tool Bar palette), U-18 (the native Bare drag strip over the feed zone).
- Fourteenth pass: TANK-03, VISUAL-04, TANK-18, UI-08.

Fourteenth-pass audit (62b8572), overturning the reviewers' "fixed": the menu bar landed (#102, merged via #162). `web/menubar.ts` mounts Finsical, Tank, Window and Help menus with a clock from `web/main.ts:1580`; Preferences, Overview and Stats are reachable, and a Shortcuts window lists the keys. The bar mounts in every browser, touch included (FIDELITY-04's correction), so the `#opentrigger` note above matters only where the bar is absent. Still open: the 20-px bar (`#menubar`, z 6, `web/app.css:56`) overlaps `#machine` (fixed, inset 0; `layoutMachine` reserves nothing), so it covers the top of the case and, on Bare, the top rows of water including the feed zone, because the `top: 20px` offset was not done. Also missing: Degauss, a Machine submenu and Show Balloons, key equivalents in the menus, and menu-bar tests.

Fourteenth-pass update (TANK-03, VISUAL-04; two reviews of the same overlap): `#machine` still spans `inset: 0` (`web/app.css:29`) and `layoutMachine` letterboxes the case into the whole viewport from its origin (`web/main.ts:1382-1392`, `machineEl.clientWidth/Height` with `oy` from 0), so in any viewport where the case is height-limited (most landscape windows) the Platinum bar (fixed at the top, z 6, `web/app.css:56`) covers the case's top 20 CSS px. The iMac's handle is cut and the tops of the Performa 5200, TAM, G4 and iBook are clipped; on the iMac G4 at 480x360 the camera and top bezel are hidden, and on the PowerBook G3 at 480x360 the lid top. On the Bare tank the bar covers the tank itself: at 1920x1080 it hides the rim and 3.7 of the 11 feed rows, and a click on tank row 1 hits the bar and drops no food (at 1680x1050, about 4 feed-strip rows). Runtime (`tank-verify/mbar.mjs`, and VISUAL-04's re-run with the bar's bottom at 20 px in every case): Bare 1920x1080 `#screen` is [96,0,1728,1080] and `elementFromPoint` at tank (160,1) is `#menubar`; iMac G4 480x360 `#screenback` top 18; PowerBook G3 480x360 `#screenback` top 10; at 1100x800 and at 1680x1050 the case art's top is y 0 for plus, imac-bondi, imacg4, bare, tam and performa-5200, and Bare's `#screen` top is 0; at 800x900 only the width-limited cases clear the bar. A second problem: About, Shortcuts and the Import overlay are `.ov` click-away layers at z 10 (`web/app.css:8`), above the bar, so while one is open a click on a menu title only dismisses the window (the reviewer's Playwright click on "Tank" fails because `<div class="ov">` intercepts pointer events), whereas Mac OS 8 keeps the menu bar live with windows open. Separately, `body.tankpage { cursor: grab }` (`web/app.css:34-35`) shows a grab hand over the case in the browser, where nothing drags (U-03's merged note); fix it in the same PR. The reviewer's prototype (`tank/proto`) moves Bare's `#screen` top to 20: a click at tank (160,1) then adds a pellet, and the iMac G4 case is fully visible (`proto-fix-480x360.png`). The clock overlapping the Help title is real but only below 243 CSS px of width (250 px clear, 240 px overlaps), which desktop browsers reach only with extreme page zoom; an optional nit. Change: (a) offset `#machine` by the bar: either add `body.hasmenubar` in `mountTankMenuBar` with `body.hasmenubar #machine { top: 20px }` in app.css (TANK-03), or set `--menubar-h` from `bar.offsetHeight` on `document.documentElement` after `document.body.append(bar)`, remove it in the teardown, and use `#machine { top: var(--menubar-h, 0px) }` (VISUAL-04); (b) in `layoutMachine` add the machine element's viewport offset (`machineEl.getBoundingClientRect().left/top`) to ox/oy, since `#screen` (absolute, against the initial containing block) and `#screenback` (fixed) use viewport coordinates; (c) `applyMachine` first runs at `web/main.ts:1433-1434`, before `mountTankMenuBar` at `:1580`, so call `layoutMachine()` once right after mounting; (d) raise `#menubar` to z-index 15, below `.alertscrim` (20) so modal alerts still block menus (`.osm-menu` lists are already at z 1000); menus then work while About, Shortcuts or Import is open, and `placeDoc` (top >= 28) and `placeOverlay` (TOP_CLEAR 24) already keep windows below the bar; (e) scope the grab cursor to the app, `.tankroot.native body.tankpage { cursor: grab }` and its `:active` rule; (f) optional: hide `.mbclock` when the bar is narrower than the menu titles' right edge plus the clock width plus 12 px, re-checked on resize. The native shell never mounts the bar, so nothing changes there. Acceptance: Playwright at 480x360, 1100x800, 1680x1050 and 1920x1080 for the Plus, iMac Bondi, iMac G4, TAM and Bare cases: `#machine` top is 20, `#screen` top is >= 20, the shell image's (or Bare's svg's) top is at least the bar's bottom, and `#screen` equals the rect computed from `machine.sx/sy/sw/sh` and the shell's letterbox; on Bare at 1920x1080 a click at tank (160,1) adds a pellet; with About open, clicking "Tank" opens the Tank menu and About stays open; in the browser the computed cursor over the case is not `grab`; in the native shell (`inNativeShell()` true) there is no bar, no class and an unchanged layout. Size S, Severity medium (TANK-03) or low (VISUAL-04), Value 3/5, Risk 1/5; a PR candidate.

Fourteenth-pass update (TANK-18): this Change's "a click toggles the date" did not land: `.mbclock` has `pointer-events: none` (`web/app.css:57-61`) and mountClock paints only the time (`web/menubar.ts:236-260`), so the Mac OS 8 gesture of clicking the clock to see today's date does nothing. Change: make `.mbclock` clickable (`pointer-events: auto`); a click shows the date for 3 s ("Thursday, September 24, 2026" via `toLocaleDateString` with long weekday and month, or a shorter form when the bar is narrow), then returns to the time, and a second click returns early; the 1 s paint interval must not overwrite the date while it is shown; keep `aria-hidden` and add a `title` with the full date. Acceptance: Playwright, clicking the clock changes its text to the date, and 3.5 s later it shows the time again. Severity idea, Value 1/5; it can ride along with TANK-03.

Fourteenth-pass update (UI-08): the bar disagrees with the app's menus, shows no shortcuts, and a Prefs caption names a nonexistent item. (1) In the app, Tank Overview and Tank Stats sit in the Tank menu without ellipses and Preferences… in the app menu; the browser bar puts all three in a Window menu and gives 'Tank Overview…' and 'Tank Stats…' ellipses, although they open windows, not dialogs. (2) Menu items show no key equivalents, although F, L, M, P, C, S and Ctrl-I work: Osmium's MenuItem is only `{title, action}`, and Charcoal 12 has no ⌘ glyph (U+2318). (3) The Lighting pane's Lamp caption says 'Tank > Toggle Lights do the same'; no such item exists (the app says 'Lamp On', the browser 'Turn Lamp Off/On'). (4) The Shortcuts window omits the pointer gestures the README documents: click above the waterline to feed, click the water to tap, Option-click for Get Info. Evidence: `web/menubar.ts:271-323` (menus), `web/menubar.ts:198-227` (Shortcuts rows), `macos/Finsical.swift:853-883` (native Tank menu), `web/prefs.ts:621-623` ('Tank > Toggle Lights'; grep finds it nowhere else in web/ or macos/), `node_modules/osmium-ui/src/menubar.ts:20-24` (MenuItem), `node_modules/osmium-ui/src/fonts/charcoal12.ts` (last glyphs U+2248..U+2713, no U+2318), `README.md:60-64` and `:69-90`; screenshot `ui/menu-2.png` (checked). Change, first PR (S): move Tank Overview and Tank Stats into the browser Tank menu without ellipses; move Preferences… into the Finsical menu (it already stands in for the app menu) and drop the Window menu; change the Lamp caption to 'The L key and the lamp item in the Tank menu do the same.'; add the three pointer gestures to the Shortcuts window. Later (M, the rest of this entry's point (2)): a pure `web/menumodel.ts` of `{id, title, menu, bareKey?, nativeKey?, opens: 'window' | 'dialog' | 'action'}` that builds the menus, the Shortcuts rows and main.ts's keydown table; upstream in osmium-ui, optional `key` and `checked` on MenuItem and the ⌘ glyph in Charcoal 12. Only then revisit the documented call (FOLLOW-UPS 'Calls you may want to revisit') that browser toggles are titled by the action they take. Acceptance, first PR: grep finds no 'Toggle Lights' in web/; Playwright, the Tank menu holds Tank Overview and Tank Stats, neither ends in '…', and choosing Tank Overview opens overview.html; the Shortcuts window lists the three gestures. Menu model: vitest that bare keys are unique, no 'window' or 'action' entry ends in '…' and every 'dialog' entry does, and every bareKey has a Shortcuts row.

### U-15 Control-click on the tank shows WebKit's generic menu (with Reload) instead of a Mac OS 8 contextual menu

Size M · Severity low · Value 3/5 · Risk 2/5

**Problem.** No contextmenu handling exists. WKWebView's default menu offers Reload, which restarts the tank page, and a Control-click today both feeds or taps and opens that menu. Contextual menus arrived with Mac OS 8.

**Evidence.** `web/main.ts:100-111` (the pointer handler lets Control-click through as button 0), `web/main.ts:776-788`, `macos/Finsical.swift:467-527`.

**Change.** Native: in B-26's TankWebView override `willOpenMenu(_ menu: NSMenu, with event: NSEvent)`: `menu.removeAllItems()`, then Feed Fish, CRT Effect (checkmark from cached crtOn), Sound (F-05), Machine > submenu (from a `machines: [{id, name}]` list the tank adds to postState; choosing one evaluates `window.__bus({op: 'machine', id})`), Tank Stats, Preferences…, targeting existing actions. Web: return early from pointerdown when `e.ctrlKey && navigator.platform.startsWith('Mac')`; browser fallback: `web/contextmenu.ts` `openContextMenu(x, y, entries)` rendering an `.osm-menu` list (Osmium has no standalone menu renderer; better upstreamed), with Feed Fish Here (mapped x), Tap the Glass, window items.

**Acceptance.** Tests: Playwright right-click shows the menu and Feed Fish Here adds a pellet near that x; manual native check that Control-click switches the case.

**Merged and related.**

- Merged from passes 1-7 (right-click menu idea: Feed, Clean tank, Import Add-ons…, Snapshot, Mute; the pointerdown handler already reserves non-left buttons). PR #151 (open) adds the `TankWebView` subclass this builds on; PR #159 adds Mute.
- Fourteenth pass: UI-20 (a Mac OS 8 Control Strip on the browser tank page) is filed as D-38.
- Related: U-39 (the original's Tool Bar palette offers the same commands).
- Fourteenth pass: FIDELITY-17.

Re-verified open at 62b8572 (fourteenth-pass audit): the tank has no contextmenu handling (only the alert scrim swallows it, `web/alert.ts:125`); `TankWebView` exists on main but overrides only acceptsFirstMouse (`macos/Finsical.swift:91-95`); pointerdown filters only `e.button !== 0` (`web/main.ts:284`).

Fourteenth-pass update (FIDELITY-17): AquaZone had right-click menus on the tank and on each fish. The Windows build defines a tank pop-up menu (`mnuPopup`: New Aquarium, Open Aquarium, Add fish and other items…, Remove fish or eggs, Aquarium Layout…, a Reference submenu with Fish, Plants, Accessories, Water, Diseases, and Menu Bar) and a separate per-fish pop-up (`mnuFishPopup`) (`AQUAZONE.exe` strings around lines 3849-3890 and 18938 of `exe_strings.txt`, verified). Finsical ignores right clicks (`web/main.ts:285`, `if (e.button !== 0) return`; no tank `contextmenu` handler, only `web/alert.ts:125`), and in the app WebKit's menu with Reload appears instead; `macos/Finsical.swift:91` is where `TankWebView` would override `willOpenMenu`. Change addition, a fish branch: when `fishAtPoint()` hits, the menu starts with the fish's name, then Get Info, Fish Cam (FIDELITY-12, filed as D-39) and Remove from Tank…, followed by the tank items (Feed Fish Here, Show Names, Tank Stats, Import Add-ons…). The fish items depend on FIDELITY-03 (fish names, F-37, PR #212) and FIDELITY-12 (D-39), and the native half cannot be tested on Linux. Acceptance addition: Playwright, a right-click on a fish shows its name as the first item and Get Info opens the card; a right-click on empty water shows only tank items; a manual native check for Control-click. Severity idea, Value 2/5.

Thirteenth-pass update: PR #209 (open): contextmenu is suppressed on all five pages; a real OS 8 menu remains open.

### U-18 On the Bare tank the invisible 22-pt drag strip covers the feeding zone

Size S · Severity low · Value 3/5 · Risk 2/5

**Problem.** For image cases the strip sits on bezel and is redundant (case presses already post dragWindow). For Bare (320x200, no case) it sits on the water: at 640x400 it covers 22 of the 60-pt feed band, and at the 90-pt minimum height the whole 13.5-pt band, so food can only be dropped with F. It also shows an arrow over a `cursor: grab` page.

**Evidence.** `macos/Finsical.swift:58-67` (DragStrip), `macos/Finsical.swift:513-521` (22-pt constraints), `macos/Finsical.swift:145`, `web/main.ts:99-111` (feed band y < 15%), `web/main.ts:778-788`, `web/machines.ts:172-178`.

**Change.** Keep a reference and set `strip.isHidden = id != "bare"`; shrink the Bare strip to 8 pt or show it only while Cmd is held. In the canvas pointerdown handler first: `if (e.metaKey && e.pointerType === 'mouse') { e.preventDefault(); bus.post({op: 'dragWindow'}); return; }` so Cmd-drag moves the tank in any mode. Optional retro follow-up: an Osmium floating-windoid title bar for Bare, with the window 11 pt taller.

**Acceptance.** Manual test: Bare at minimum size, clicking the top rows drops food and Cmd-drag moves the window.

**Merged and related.**

- Merged from passes 1-7: the Swift DragStrip is 22 pt while the overlay's `TOP_CLEAR` is 24 with a comment saying 22; pick one number while touching this.
- Related: V-03 (case-swap size drift; MACOS-05 lands its swap rule here), B-49 (window clamping), U-14 (the browser menu bar also covers Bare's feed strip).
- Fourteenth pass: MACOS-05.

Re-verified open at 62b8572 (fourteenth-pass audit): the DragStrip is always added at 22 pt (`macos/Finsical.swift:779-787`), there is no Cmd-drag branch, and `TOP_CLEAR` is still 24 (`web/import.ts:634`). The Problem's numbers are stale; see MACOS-05 below.

Fourteenth-pass update (MACOS-05): the feed zone is now the air strip, y < 11 of 200 tank px (5.5%; `web/feedzone.ts:11-13`, `core/sim.ts:90` SURFACE 10), not a 15% band, so on any Bare window up to 400 pt tall the 22-pt strip, which takes every left press (`macos/Finsical.swift:71-85`, DragStrip with acceptsFirstMouse), covers all of it: a click drags the window instead of feeding. At 640x400 the zone is 11 x 2 = 22 pt, the strip's height. Switching from the default Plus to Bare makes it worse. Case swaps keep viewBox units per point (V-03; `:272-280`, `nw = f.width * (w / old)`), and Bare's screen is its whole 320-unit viewBox (`web/machines.ts:301-307`, sx = sy = 0, sw = vbW = 320) while the Plus screen is 602 of 821 units (`web/machines.ts:136-145`). A 310x400 Plus window therefore becomes 121x75 pt (310 x 320/821 = 120.8 pt wide, 75.5 pt tall), and the tank shrinks from 227 to 121 pt wide (47% smaller), although the code comment says "Keep the screen the same size"; Bare's minimum is 80x50 (`:258-259`). At that size the strip is 29% of the window and the feed zone is 4.2 pt. Bare can only be moved by the strip, because the page's case drag skips `#screen` (`web/main.ts:1437-1447`), which fills the whole Bare window. README says to drag "the top edge of the window" (`README.md:64`). Code only: nothing was run on a Mac, and the cursor under the strip was not observed. The review rates this Size M, Severity medium. Change, landing this entry with V-03's swap rule (prefer it over the strip rule in the Change above, which hid the strip on image cases and shrank Bare's): 1. postState's machine payload (`web/main.ts:860-865`) also sends `sx`, `sy`, `sw` and `sh` (V-03 wants `sw` and `sh` too). 2. Swift keeps a reference to the strip's height constraint and sets it to `min(22, glassTop * window.frame.height / vbH)` in applyMachine and windowDidResize, where `glassTop = hole?.minY ?? sy`: Bare gets 0, image cases keep 22 unless their glass reaches higher. 3. In the tank's pointerdown, a left mouse press with `e.metaKey` posts `{op: 'dragWindow'}` instead of feeding or tapping, on every machine; this becomes Bare's way to move, and README's "Move the window" row says so. 4. Case swaps keep points per tank pixel instead of per viewBox unit: `tankPt = f.width * oldSw / oldVbW; nw = tankPt * newVbW / newSw`, then clamp per B-49. 5. import.ts takes the strip height from one exported constant (the merged note's 22 vs 24). Acceptance: manual, on a Mac: Bare at 640x400, a click in the air strip drops food and Cmd-drag moves the window; Plus to Bare keeps the tank about 227 pt wide; an image case still drags from its top bezel. A vitest pins a pure TS mirror `dragStripHeight(machine, windowH)`: 0 for Bare, 22 for Plus at 400 pt.

Thirteenth-pass update: PR #234 (open): the DragStrip narrows on the bare tank. (N-09 was this same finding.)

### U-20 (remainder) Accessibility: live label, announcements and reduced motion

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** VoiceOver finds an unlabeled web area and canvas. Nothing reacts to prefers-reduced-motion or prefers-contrast; case-swap and Osmium zoom/shade animations always run. The CRT flicker modulates brightness at ~9.7 Hz but only +/-1.5% at the default 0.30 (far below WCAG 2.3.1's threshold) and the CRT is off by default, so reduced motion is a courtesy. Installs and hunger changes are never announced.

**Evidence.** `web/index.html:16-21` (canvas#tank unlabeled, svg#shell role=presentation), `web/main.ts:78-95` (saveTank every 10 s), `web/crt.ts:131-133` (9.7 Hz flicker term), `web/main.ts:657-704`, `macos/Finsical.swift:164-166`, `node_modules/osmium-ui/macos/OsmiumWindows.swift:370`, `:407`, `:410`.

**Change.** Give canvas#tank `role="img"` and `aria-label="Aquarium"`, updated in saveTank from a pure statsmodel helper ('Aquarium: 6 fish, 1 hungry, water 92%. Press F to feed.') with a vitest. A visually hidden `aria-live="polite"` element announces 'Angelfish added' and 'Fish are hungry'. When `matchMedia('(prefers-reduced-motion: reduce)')` matches, call `crt.configure({...crtCfg, flicker: 0, grain: 0})` without persisting, and listen for changes (Playwright `emulateMedia({reducedMotion: 'reduce'})` gives flicker 0). Native: `animate: !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion` at Finsical.swift:166 and upstream in osmium-ui. window.title is already 'Finsical'.

**Acceptance.** (derived) Playwright `emulateMedia({reducedMotion: 'reduce'})` gives flicker 0 and grain 0 without persisting; a vitest for the label helper.

**Merged and related.**

- Remainder only: the accessible name (`role="img"`, label naming the feed/tap zones and the F key) landed in open PR #90. Open: the dynamic label from statsmodel, the `aria-live` announcements and reduced motion.
- Merged from passes 1-7: PR #141's power-on animation already skips under reduced motion and PR #158 holds the water still; flicker, grain and the rolling band still animate, so flatten them at `configure()` time.

Fourteenth-pass audit (62b8572): the static label is on `canvas#tank` (`web/index.html:17-18`), reduced motion stills the water (`web/main.ts:1969-1973`), and the CRT power-on is skipped under it (`web/crt.ts:529-570`). Still open: the dynamic label, the `aria-live` announcements, CRT flicker and grain under reduced motion, and the native case swap's `animate: true` (now `macos/Finsical.swift:280`).

### U-21 Plant and accessory names show as cryptic 8.3 file stems although the packs carry real names

Size M · Severity low · Value 3/5 · Risk 2/5

**Problem.** JPN Plants lists 90 DOS stems ('APONOGET', 'GLOSSOSL', 'Corksc_M', 'Kingyo_S', 'NUPHRJPN', 'TOOTHCUP') and L/M/S or 1/2/3 families. The packs hold a text-header resource (PlTH; the trailer type table also lists PlTI, PlPH, PlPI, PlVe, PLPC, PLDP) with a Shift-JIS Pascal Str31 common name at 0 ('バナナプラント'), an ASCII Pascal Str31 Latin name at 32 ('Nymphoides aquatica'), and Shift-JIS description text from 104; a second chunk sometimes has an English name ('Hair grass1'). Accessories have AccH (layout unverified). Fish use FsTH (F-02).

**Evidence.** `web/import.ts:261-270`, `web/import.ts:684-686`, `web/import.ts:784-787`, `core/data/fsh.ts:42-54`, `core/data/fsh.ts:167-175`.

**Change.** Add one generic `packInfo(d): { name?, latin?, blurb? } | null` in fsh.ts shared with F-02: find the xxTH chunk via F-01's type table, or take the first non-BMP chunk >= 600 B whose byte 32 is a plausible Pascal length; decode Str31@0 as shift_jis, Str31@32 as latin1, bytes 104.. as shift_jis up to NUL. importAddon puts it on PackResult; the detail pane shows 'Banana Plant, Nymphoides aquatica' plus the description; after the thumbnail pass, rows switch their label to the Latin name, cached with the thumb in IDB as `info:{url}`. Suffix fallback before fetch: `/_?([LMS])$/i` -> ' (Large/Medium/Small)'.

**Acceptance.** Tests: fsh.test.ts fixtures built from these byte layouts.

**Merged and related.**

- Related: F-02 (shared `packInfo`/text reader), F-32.

Re-verified open at 62b8572 (fourteenth-pass audit): rows and the detail show `it.inner` (`web/import.ts:855`, `:986`), and there is no PlTH or `packInfo` reader.

### U-22 Firefox may ask for persistent-storage permission at launch, before the user does anything

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** openDb calls `navigator.storage.persist()` on the first IDB use, which happens at every launch through sndsGet and the restore, with no gesture. Firefox answers with a permission doorhanger (once; the decision is remembered). Chromium and WebKit decide silently. Not verified in Firefox.

**Evidence.** `web/store.ts:31-36` and `web/store.ts:69-75` (persist() in openDb's onsuccess), `web/main.ts:891-899`.

**Change.** Export `requestPersistence()` from store.ts, called from recordInstall on the first user-initiated (live) install; skip when `await navigator.storage.persisted()` is true or inNativeShell().

**Acceptance.** Test: stub navigator.storage in vitest and assert persist() is not called during openDb.

Re-verified open at 62b8572 (fourteenth-pass audit): `navigator.storage.persist()` is still called in openDb's onsuccess (`web/store.ts:33-35`).

Thirteenth-pass update: PR #199 (open): persist() defers to the first write.

### U-23 Tank Stats wording and bounds nits

Size S · Severity nit · Value 2/5 · Risk 1/5

**Problem.** 'Hungriest: Fish, full' shows when nobody is hungry (reads like an alarm). The Fish line can read '5 (2 seeking food) (1 startled)'. The care line says 'is starving' (>= 0.85) while Hungriest says 'hungry' (no 'starving' band). Advice says 'the Add-ons importer' but the menu reads 'Import Add-ons…'. Uptime reads '49h 3m'. The browser grow minimum of 60 px contradicts the native 250 that keeps all fields and two wrapped hints visible.

**Evidence.** `web/stats.ts:75-79`, `web/stats.ts:112-116` (grow min {300, 60}), `web/statsmodel.ts:45` (HUNGER_STARVING), `web/statsmodel.ts:89`, `web/statsmodel.ts:106-108`, `web/statsmodel.ts:115-118`, `web/statsmodel.ts:121-125`, `macos/Finsical.swift:100-104` (native min 300x250), `macos/Finsical.swift:564`.

**Change.** Show 'Hungriest: -' (or blank) when `hungriest.hunger < 0.33`. Join counts with commas: `${n} (${[seeking && `${seeking} seeking food`, startled && `${startled} startled`].filter(Boolean).join(', ')})`. Add a 'starving' band (>= 0.85) to hungerLabel and update overviewmodel.test.ts and statsmodel.test.ts together (it changes Overview text and its Status sort). Advice: 'choose Import Add-ons… in the Tank menu'. Uptime '2d 1h' past 24 h. Browser grow min {w: 300, h: 250}; keep the native minimum (an earlier idea to shrink it to 200 would clip the worst case); optionally lower the native default to ~360x260 after checking 4 wrapped hint lines fit.

**Acceptance.** (derived) statsmodel/overviewmodel tests for the new wording and the 'starving' band; the browser Stats window cannot shrink below 300x250.

**Merged and related.**

- Related: U-27 (small-window floor).
- Fourteenth pass: UI-09 (Stats' Change Water is clipped at the 300x250 minimum) is filed under U-27; it proposes a minimum of 300x262 in both the app and the browser, which supersedes the 300x250 here.

Re-verified open at 62b8572 (fourteenth-pass audit): the Hungriest line still names a fish as full when nobody is hungry, and the counts still nest parentheses (`web/stats.ts:113-117`); there is no 'starving' band (`web/statsmodel.ts:137-142`); the advice still says 'the Add-ons importer' (`web/statsmodel.ts:104`); uptime still reads '49h 3m' (`:131-134`); the browser grow minimum is 300x60 (`web/stats.ts:153`).

### U-24 (remainder) Idea: a download progress bar with Stop in the add-on detail pane

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** 'Fetching add-on…' stays static while zips of up to 5.6 MB download, with no progress and no cancel. Osmium ships a determinate `.osm-progress` (used by Stats) but no indeterminate barber pole.

**Evidence.** `web/import.ts:787`, `web/import.ts:1136`, `web/import.ts:115-131`, `web/stats.ts:35-47`, `node_modules/osmium-ui/osmium.css:196-222`.

**Change.** Build on B-42's fetchWithTimeout: add `onProgress(loaded, total | null)`. showDetail inserts an .osm-progress under the status and sets `--osm-value` to loaded/total, or a striped indeterminate class (local CSS in app.css, Mac OS 8 barber pole) when Content-Length is missing. A 'Stop' push button aborts, which rejects, deletes the memo and shows 'Stopped.' with Try Again. Reuse it for the listing with per-collection progress (P-05).

**Acceptance.** (derived) A vitest with a stubbed streaming body reports progress; Stop rejects and shows "Stopped." with Try Again; a missing Content-Length shows the barber pole.

**Merged and related.**

- Merged from passes 1-7 (import flow): per-row progress or loading state, 2-3-wide parallel installs, failure text naming the file, ellipsized long names in fixed-height rows (open PR #135 adds `.irowname` nowrap), cached/offline badges and a clear selected-item preview. Do not auto-download packs just to decorate the list.
- Builds on B-42 (open PR #134's stall timeout). Related: P-07, P-05.

Fourteenth-pass audit (62b8572): the stall timeout with a streamed `readBody` is on main (`web/import.ts:135-191`), and row names ellipsize (`web/app.css:323`). Still open: no progress bar, barber pole or Stop (the status stays 'Fetching add-on…', `web/import.ts:989`), and no per-row progress or parallel installs.


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

**Merged and related.**

- Fourteenth pass: DELIGHT-08 (Close View, a pixel magnifier that follows a fish or the pointer) is filed as D-39; following a fish builds on point (2)'s selection.
- Fourteenth pass: FIDELITY-12 (FishCam: zoom in on one fish and follow it, as the 2000s AquaZone editions did) is filed as D-39 too.

Re-verified open at 62b8572 (fourteenth-pass audit): there is no spotlight op, no tank-to-row selection and no state icons, and `sortBy` defaults to name without being persisted (`web/overview.ts:72`).

Thirteenth-pass update: PR #245 (open): selection spotlights the fish with a leased marquee; state icons and remembered sort remain open.

Fifteenth pass: selecting a fish spotlights it in the
tank (PR #245); state icons and a remembered sort remain.

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

**Merged and related.**

- Fourteenth pass: UI-02 (the machine list clipped two case names mid-glyph) is filed as V-31 (PR #225, open); thumbnails must fit the same 190-px width budget.
- Related: U-38 (a width test for the machine names in this list).

Re-verified open at 62b8572 (fourteenth-pass audit): the machine rows are text only (`web/prefs.ts:347-351`), and there are 16 machines now.

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

**Merged and related.**

- Fourteenth pass: UI-01 (the Picture and Monitor pane groups run into the caption area since Skew and Perspective were added) is filed as V-30 (PR #225, open).
- Related: U-23 (browser `grow.min`), U-14 (TANK-14 can ride along with its menu-bar offset).
- Fourteenth pass: TANK-14, UI-09.

Eleventh-pass update: PR #184 clamps document windows to
`max-width: calc(100vw - 24px)` so About/Shortcuts shrink instead of
clipping in narrow viewports. Still open: the Preferences absolute
layout and floor, Stats short-height reachability, shared min
geometry.

Re-verified open at 62b8572 (fourteenth-pass audit): Preferences is still laid out absolutely (`web/app.css`), and the Stats browser grow minimum is 300x60 (`web/stats.ts:153`). PR #184 is still open, so `.dbwin` is a fixed 344 px on main (`web/app.css:63`).

Fourteenth-pass update (TANK-14): About and Shortcuts don't fit short or narrow viewports. Document windows are a fixed 344 px wide (`web/app.css:63`) and size to their content with no maximum; `placeDoc` only clamps their position (`web/menubar.ts:150-156`). Runtime re-run (`tank-verify/docfit.mjs`): at 320x240, About is [8,28,352,340] with its OK button's top at 296, entirely off-screen, and Shortcuts is [8,28,352,288] with OK at top 244, off-screen; at 568x320, About's bottom is 340 and its OK button's bottom 322, clipped; at 375x667 both fit and OK is visible. Escape and click-away still close the windows, so nothing is trapped. Change (its width rule overlaps PR #184's clamp): `.dbwin { width: min(344px, calc(100vw - 16px)) }`; `.dbwin .osm-content { max-height: calc(100vh - 62px); overflow-y: auto }`, so the frame stays whole and the text scrolls; shrink `.dbabout .dbicon` to 64 px under `(max-height: 400px)`. It can ride along with U-14's menu-bar offset (TANK-03). Acceptance: Playwright at 320x240 and 568x320, every `.dbwin` rect lies inside the viewport, and its OK button is fully visible and clickable. Severity low, Value 1/5.

Fourteenth-pass update (UI-09): minimum sizes clip content. Tank Stats' native minimum of 300x250 is commented as keeping "every field and two care hints visible" (`macos/Finsical.swift:147-153`), but Change Water was added under the hints since (`web/app.css:210-228`: Stats flows top-down and `#sfoot` follows `#scare`). With the ordinary two-hint case (food rotting and fish hungry, each hint wrapping to two lines), the button's bottom edge falls below the window. Runtime re-run (`ui-verify/stats.mjs`, fake state at 300x250): rotting + hungry puts Change Water at top 231, bottom 251 > innerHeight 250; rotting + starving gives bottom 238; one hint gives 225 (screenshot `ui-verify/stats-min.png`). The browser grow minimum of 300x60 (`web/stats.ts:150-154`) is far worse (U-23). In Import Add-ons at its native minimum of 441 px, the count '165 add-ons' is clipped to '165 add-on' and touches the Filter field, whose right edge lands on a fractional pixel (`web/app.css:300-317`: `.ifilter` flex 0 1 130px; `.icount` margin-left auto, no gap, no ellipsis). Runtime re-run (`ui-verify/addmin.mjs`, addons.html at 441x301): filter right 366.47 = count left 366.47, count width 55.5 < scrollWidth 62; at 480 px and wider the count is whole (62 px) and 20 px clear (screenshot `ui-verify/addons-min3.png`). Whether the fractional offset blurs the bitmap text was not established. Change: make `#swin .osm-content` a flex column with `#srows` and the separator `flex: none`, `#scare` `flex: 1; min-height: 0; overflow: hidden` and `#sfoot` `flex: none`, so Change Water stays visible at any size. To avoid a hint cut mid-line, also raise the minimum height to 262 in both `macos/Finsical.swift` and stats.ts's `grow.min` (U-23 asks for the browser to match native), which leaves the measured worst case (button bottom 251, including a Japanese species name in the reviewer's run) about 11 px clear of the bottom edge. Import: `.icount { margin-left: 8px; text-overflow: ellipsis; }`, and give `.ifilter` a whole-pixel width (set it in import.ts `layout()` from the header's clientWidth, or use a whole-pixel flex-basis with min-width 48). Acceptance: Playwright with fake state at 300x262 and the rotting and hungry hints, `#schange` bottom <= innerHeight - 4; at 300x200 in a browser tab the grow box refuses to go below the new minimum; addons.html at 441x301, `.icount` scrollWidth <= clientWidth and `.icount` left >= `.ifilter` right + 6, with `.ifilter` right a whole number.

### U-28 (remainder) Make failures and pending states visible (umbrella)

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

Fourteenth-pass audit (62b8572): local detail errors go through `loadProblem` (`web/import.ts:1071`), a listing failure offers Try Again (`web/import.ts:1366-1368`), and failed restores retry at 15 s and 60 s, then once per 'online' event (`web/main.ts:741-775`; B-46 is mostly fixed, and its status wording stays here). Still open: U-09, U-10, U-12 and U-24, and the restore, drop, quota and azpack failures are console-only.

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

Re-verified open at 62b8572 (fourteenth-pass audit): the presets are on main (`web/crt.ts:327`), "Soft" is described as for all-day desktop use, and Defaults resets to `CRT_DEFAULTS` (`web/prefs.ts:778-800`). What remains is a product call: a Gentle preset or a user-saved baseline, or decide that Soft is enough.

### U-30 The Get-Info card can't be dragged or pinned, and chases fast fish

Size S · Severity nit · Value 1/5 · Risk 1/5 (twelfth pass, N-9)

**Problem.** `layoutInfo` repositions the ⌥-click fish card every
frame to follow its fish, so there's no way to move or pin it — and
a fast fish drags a text-heavy card around constantly. In the
original, Get Info is a real window.

**Evidence.** `web/main.ts` (`layoutInfo`), `web/app.css` (finfo
rules). See also V-26 (the card renders under the case glass).

**Change.** Let the card lag or fade while the fish moves fast, or
detach it once the fish travels far from where it opened. A dragged
position could stick until the fish leaves a radius.

### U-31 Feed Fish picks one x for the whole pinch

Size S · Severity nit · Value 1/5 · Risk 1/5 (twelfth pass, N-10)

**Problem.** All pellets of a Feed Fish pinch scatter ±24 px around a
single random x. With a full tank the hungry school at the far end
races the near school to one spot every time; two or three pinch
centers would read fairer and look better.

**Evidence.** `web/main.ts` (`feedPinch`, PINCH_SPREAD 24),
`web/water.ts` (splash ring per pellet).

**Change.** Pick 1-3 centers (more when the roster is large or the
hungry fish are spread out) and split the pinch between them. Ties
into U-01's open point 3 (hunger-based pellet count) — do them
together.

Fourteenth-pass note (from U-01's audit): the hunger-based count has landed (`feedPinch` drops one pellet per hungry fish, 1 to 5), so only the single center remains: `feedFish` still picks one `x` for the whole pinch (`web/main.ts:1457-1473`).

### U-33 'Bubble sounds' is on by default but does nothing with the game's sounds

Size M · Severity low · Value 3/5 · Risk 2/5 (fourteenth pass)

**Problem.** bubble() looks for a record whose name contains 'bubble' and skips the filter loop. The only such name in the game's bank is that loop, so for nearly every user the 'Bubble sounds' checkbox, checked by default, does nothing; the caption admits it only plays a sound you add. The same substring pass is also the remaining path by which imported music can take over an effect once the bank is installed (the remainder of B-19): a dropped 'Bubbles.mp3' would start on a quarter of bubble spawns at gain 0.4 and overlap itself, about 0.33 starts/s with 10 fish (each fish 0.004 per tick plus one gravel bubble every ~8 s, at 30 tps).

**Evidence.** `web/audio.ts:405-408` (`find(['bubble'], FILTER_BUBBLING)`), `web/audio.ts:17-20` (`bubbles: true`), `web/prefs.ts:745-749` (the caption), `web/main.ts:2140-2141` (25% of spawns), `core/sim.ts:208-210`. Screenshot `scratchpad/audio/prefs-sound-bubbles.png`: the box is checked, and the caption reads '...The game's own sounds have none, so this plays a short bubble sound you add.' The decoded bank has no single-bubble record.

**Change.** Add `private synthBubble(): void` in `web/audio.ts`: a sine OscillatorNode at f0 = 500 + rand*800 Hz, with `frequency.setValueAtTime(f0, t)` and `exponentialRampToValueAtTime(f0 * 1.5, t + 0.04)` (the rising chirp of a real bubble), and a GainNode that ramps from 0 to 0.12 in 4 ms, then decays exponentially to 0.001 by t + 0.09; stop at t + 0.1, routed through the master. bubble() plays a user 'bubble' effect record if there is one, otherwise synthBubble(); it stays gated by bubblesOn and the spawn draw (tune the draw to about 15%). Restrict the lookup to effect records once B-19's `kind` exists, so music never plays as a bubble. Update the prefs caption and the README Sounds text. This is a product call: the project otherwise plays only the original's sounds. If synthesis is rejected, dim the checkbox instead with setEnabled: add `bubbleSource: boolean` to the state push and use the caption 'Add a short sound with "bubble" in its name to hear single bubbles.' (U-36 details that route).

**Acceptance.** `audio.test.ts` (FakeContext gains createOscillator): with only the bank, bubble() starts one oscillator whose frequency ramp ends within [750, 1950] Hz and whose gain decays to 0.001 or less. With a user 'bubble' record, a buffer source plays and no oscillator starts. With bubbles off, nothing plays.

**Merged and related.**

- U-36 (UI-16): the same symptom, with the dimming plan; choose one plan and close the other entry.
- Related: B-19 (remainder; the substring lookup this restricts), U-03 point (3) (synthesized fallbacks for taps and feeding), D-08.
- Fourteenth pass: AUDIO-07.

### U-34 Stocking the tank takes about twice as long as needed, and is silent, because the sound bank downloads after all the art

Size S · Severity low · Value 2/5 · Risk 2/5 (fourteenth pass)

**Problem.** 'Stock the Tank' installs the starter set strictly in sequence, and AZ_WAVES, the slowest item because of the server-side 7z extraction, goes last. Nothing can play during stocking: the AudioContext doesn't exist until the bank lands, so every splash() and sceneryIn() finds no buffer. The opening sound doesn't play in that session either, because open() ran without a bank. The bank's own download time is added to the end instead of overlapping the art. Correction to the review: starting the bank at the same time as the art won't make the fish splashes audible, because the fish land 2.5 to 4.5 s after the click and the bank alone needs about 7 s. The real gain is a shorter first run, with the sound arriving when the art finishes instead of 7 s later.

**Evidence.** `web/starter.ts:10-21` (sounds last, 'the slowest download'), `web/welcome.ts:118-130` (sequential `await hooks.install(it)`), `web/main.ts:677` and `:785` (splash, sceneryIn), `web/audio.ts:413-417` (openingDue is decided at open()). Runtime re-run (first run in Chromium): click at 4.1 s; fish imported at 6.6, 7.8 and 8.6 s; scenery at 9.6, 10.5 and 11.6 s; the AudioContext is created at about 18.9 s when AZ_WAVES lands. The only starts are the 1.699 s loop and the 1.699 s feedback, with no IntoWater or IntoWaterBig start.

**Change.** In `welcome.ts` stock(), start the sounds items' installs early without awaiting them: right after the first fish arrives, so the stand-ins still leave as early as possible and the fish don't compete with 1.2 MB on a slow link. Collect them as `hooks.install(it).then(() => null, (e) => ({ it, e }))`, and loop over the art items as today. Then show 'Adding the sound effects…' while awaiting the sound jobs, and fold failures into `failed`/`problem` so Try Again still covers the bank. installAddon already allows overlapping installs of different URLs (installsInFlight, `web/main.ts:1157-1203`). Stop behaves as documented: a download already under way still lands. To test without the DOM, extract the loop into a pure `runStarter(items, install, onProgress)`.

**Acceptance.** Unit test on runStarter with deferred fake installs: install(AZ_WAVES) is called before the second fish install resolves; progress reaches 7 of 7; a rejected sounds install ends up in `failed`. Playwright first run: the time from the click to the AudioContext creation drops by at least 4 s against the sequential baseline.

**Merged and related.**

- Pairs well with F-35 (AUDIO-03), which makes the bank's arrival an audible 'aquarium opens' moment.
- B-68 (PR #241, open) and B-72 rework the same welcome flow; rebase on them.
- Fourteenth pass: AUDIO-02.

### U-35 The volume slider is linear in amplitude, so the quiet settings are crammed into its left third

Size S · Severity low · Value 2/5 · Risk 2/5 (fourteenth pass)

**Problem.** The slider position (0 to 100) becomes the master gain directly. The default of 70 is only 3.1 dB below full. From 30 to 100, 70% of the travel covers 10.5 dB, roughly one halving of loudness, and all the quiet levels sit in the left third (10 is -20 dB, 5 is -26 dB). Fine control at low listening levels, the likely use for a relaxation toy, is hard.

**Evidence.** `web/prefs.ts:756-757` (`volume: Number(volInput.value) / 100`), `web/audio.ts:161-175` (`level()` goes straight into the master gain). 20*log10(v): 0.7 is -3.1 dB, 0.5 is -6.0 dB, 0.3 is -10.5 dB, 0.1 is -20 dB. Verified in code and by arithmetic.

**Change.** Add `export function gainForVolume(v: number): number { return v * v; }` in `web/audio.ts` and use it in level(). With it, 50% is -12 dB, 25% is -24 dB and 10% is -40 dB. `volume` stays the slider position. Raise SOUND_DEFAULTS.volume to 0.84 so the default level stays at about -3 dB, and update the FOLLOW-UPS 'Calls you may want to revisit' row for the default volume. Optional: to keep what existing users hear, migrate once: a saved config without `v: 2` gets `volume = Math.sqrt(volume)` and is saved with `v: 2`. Without the migration, a saved 0.7 simply plays 3 dB quieter.

**Acceptance.** Vitest: gainForVolume(0) = 0, gainForVolume(1) = 1, gainForVolume(0.5) = 0.25; the master-gain tests go through gainForVolume. With the migration, a saved `{volume: 0.49}` without `v` loads as a slider of 0.7 and still gives a master gain of 0.49.

**Merged and related.**

- Related: B-73 (Import Add-ons previews ignore the Sound pane's volume and mute).
- Fourteenth pass: AUDIO-05.

### U-36 'Bubble sounds' is on by default but does nothing with any archive add-on

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** The Sound pane shows 'Bubble sounds' checked. `bubble()` plays only a sound whose name contains 'bubble' other than the filter loop 'AZ bubble 9003'. The importer's Sounds section lists only AZ_WAVES (whose only 'bubble' record is that loop) and Macinfish (music), and the app ships no bundled pack (T-15), so the switch changes nothing unless you drop your own file. Mac OS 8 dims a control that cannot act; here the caption explains only on hover. The behavior is documented (README 'Sounds'), so this is about the control's state, not a bug.

**Evidence.** `web/audio.ts:17-19` (bubbles: true default), `web/audio.ts:49` (FILTER_BUBBLING), `web/audio.ts:301-316` (find), `web/audio.ts:403-408` (bubble), `web/prefs.ts:746-750` (caption), `README.md:161-162`. Runtime re-run (`ui-verify/snd.mjs`): the Sounds section lists ['AZ_WAVES', 'Macinfish']; `core/data/sndbank.ts:30-55` has no other 'bubble' name.

**Change.** Add `hasBubble(): boolean` to TankAudio (the same find, non-null). postState sends it as a sibling field (`soundCaps: { bubble }`) rather than inside `sound`, which is sanitized as config. prefs.ts calls `setEnabled(bubblesBox, caps.bubble)` and, while dimmed, captions 'Add a short sound with “bubble” in its name to hear single bubbles.' Keep the stored preference. The alternative with more delight is U-33's synthesized bloop (as U-03 point (3) does for taps and feeding), so the switch always works; that changes the README's documented behavior, so it is a product call.

**Acceptance.** Vitest: `hasBubble()` is false with only 'AZ bubble 9003' loaded and true after `addWavs` with 'bubble pop'. Playwright on a stocked tank: `#snd-bubbles` is disabled with the explanatory caption.

**Merged and related.**

- U-33 (AUDIO-07): the same symptom, with the synthesis plan; choose one plan and close the other entry.
- Related: U-03 point (3), D-08.
- Fourteenth pass: UI-16.

### U-37 The menu-bar clock is 12-hour while Lighting and Stats are 24-hour

Size S · Severity low · Value 1/5 · Risk 1/5 (fourteenth pass)

**Problem.** The browser menu bar clock always shows '8:04 PM'. The Lighting pane's hour pop-ups and Tank Stats always show '20:00'. Neither follows your locale; Mac OS 8's Date & Time control panel made this one setting. In the app, the macOS clock follows the system setting while the pop-ups stay 24-hour.

**Evidence.** `web/menubar.ts:236-246` (hard-coded 12-hour), `core/light.ts:144-147` (hourLabel pads to 'HH:00'), used by `web/prefs.ts:562`, `:606`, `:611` and `web/statsmodel.ts:97-98`; tests pin '08:00' (`core/light.test.ts:136-137`, `web/statsmodel.test.ts:116`). Verified in code.

**Change.** Add a pure `clockLabel(h, m, locale?)` in `core/light.ts` using `Intl.DateTimeFormat(locale, {hour: 'numeric', minute: '2-digit'})`; hourLabel(h) becomes clockLabel(h, 0), and mountClock uses the same function. Caveats: whether WKWebView's Intl honours the macOS 24-hour override (not just the region) is unverified, and '12:00 AM' may not fit the 76-px `.pfhour` pop-ups, so measure and widen them if needed. Low value; the review opened no PR for it.

**Acceptance.** Vitest: `clockLabel(20, 0, 'en-US') === '8:00 PM'` and `clockLabel(20, 0, 'de-DE') === '20:00'`; existing tests pass an explicit locale. Playwright with locale en-US: every Lighting pop-up title fits (scrollWidth <= clientWidth).

**Merged and related.**

- Related: U-14 (the same clock; TANK-18 makes a click show the date).
- Fourteenth pass: UI-18.

### U-38 (remainder) No test keeps the machine names inside the 190-px Preferences list

Size S · Severity low · Value 3/5 · Risk 1/5 (fourteenth pass)

**Problem.** In the 190-px Machine list, "Macintosh Performa 450 (II)" and "Macintosh Performa 5200 (Black)" are cut off with no ellipsis, and the clipped suffix is the only thing that tells each variant from the row above it. PR #225 (open, filed as V-31 from UI-02) makes this entry's rename (the four Performas drop "Macintosh") and ends overlong rows in an ellipsis. Still open: nothing fails when a future name outgrows the list; the PR adds no test.

**Evidence.** `web/machines.ts:159` and `:181` (names), `web/app.css:141-142` (`#pfmachines` 190 px, rows padding-left 4 px). Runtime re-run in prefs.html: row clientWidth 173 px with `text-overflow: clip`; "Macintosh Performa 450 (II)" is 175 px of text (scrollWidth 179), "Macintosh Performa 5200 (Black)" 206 px (scrollWidth 210); the other 14 names fit. PR #225's branch (`claude/prefs-fit`) changes the names in `web/machines.ts` and adds the ellipsis to `#pfmachines .osm-row` in `web/app.css`, with no `machines.test.ts` change.

**Change.** The review's rename, now in PR #225: drop "Macintosh " from the four Performa names, matching the iMac rows and the README (which already says "Performa 450"): "Performa 450", "Performa 450 (II)", "Performa 5200", "Performa 5200 (Black)"; "Macintosh Plus" keeps it. Ids do not change, so saved choices are unaffected, and nothing in the Swift code uses the names. Remaining: add a `machines.test.ts` guard that sums Charcoal 12 advances for every name, importing `CHARCOAL_12` by relative path (`../node_modules/osmium-ui/src/fonts/charcoal12.ts`, since the package exports only "." and the entries are `[codepoint, advance, ...]`), and asserts each is at most 168 px.

**Acceptance.** The width test passes for all 16 names (and fails on the two long names from before PR #225). A Preferences screenshot shows every row whole.

**Merged and related.**

- V-31 (UI-02, PR #225 open): the same clipping; V-31's remainder renames the '(II)' variants, and any new name must pass this test.
- Related: U-26 (case thumbnails in the same list share the width budget).
- Fourteenth pass: VISUAL-05.

### U-39 Tool Bar: the original's floating palette of one-click commands

Size M · Severity low · Value 3/5 · Risk 2/5 (fourteenth pass)

**Problem.** AquaZone's Options > Tool Bar opened a small draggable palette with balloon help on each button: food, fish info (one or all), sound, light, full screen, menu bar and fish names; "Many like keeping it on-screen all the time" (guide, 'THE TOOLBAR' section). Mac OS 7.5 to 8's Control Strip was the period's collapsible home for such toggles. Finsical spreads these commands across menus and single-letter keys you can't discover. Correction to the review: touch browsers now get the Osmium menu bar too (`mountTankMenuBar` mounts in every browser), so the case rests on the native floating tank, which has no visible controls of its own (its menus live in the app's menu bar), and on one-click access to the toggles.

**Evidence.** `web/main.ts:1537-1575` (bare keys), `web/main.ts:1580-1590` (menu actions and `state()`), `web/menubar.ts:265-326` (menus; the commands at `:283-303`), `macos/Finsical.swift:851-887` (the commands exist only in menus), `web/app.css` `.finfo`/`.fintitle` (the Get Info card's mini title bar), `web/machines.ts:29-53` (viewBox geometry for placing overlays on the case). `AQUAZONE.exe`: `frmToolBar`, `CCFeedFish`, `ccMenuBarOnOff` (strings verified). Guide `:940-948` and `:1707-1709` (the Tool Bar's contents). Found in verification (code only): the document-level pointerdown at `web/main.ts:1437-1447` turns any press outside `#screen`, buttons and form controls into a window drag, so a drag handle outside `#screen` must be added to that exclusion list.

**Change.** Two designs were proposed; build one. (a) FIDELITY-04, a Tool Bar windoid: new `web/toolbar.ts` built from the card's mini title bar, with 16x16 Osmium sprite buttons (new art in `web/icons.ts`): Feed, Get Info (nearest fish), Sound, Lamp, CRT, Names (FIDELITY-03, F-37; omit until it lands) and Pause. Pressed states read the same `state()` getter the menu bar uses; balloon help reuses `#fishtip`; drag within `#screen` with pointer capture; persist visibility and a tank-relative position in `finsical:toolbar`. Toggle with Tank > Tool Bar and the bare T key (free today), plus a native menu item. Hidden by default, so nothing changes for existing users and the sparse-controls guardrail holds. (b) DELIGHT-15, a Control Strip on the case: `web/controlstrip.ts`, a 22-px Platinum strip with an end tab. Clicking the tab collapses the strip to the tab; dragging the tab moves it along the edge (add the strip's class to the drag handler's exclusion list). Modules are original 16x16 icons: food can, name tag (DELIGHT-03, F-37), bulb lit or unlit, speaker (opens a volume pop-up like the Sound Volume module), monitor (CRT) and pause. Each module is a button with an aria-label and a title and reads state from the same accessors as `TankMenuActions.state()`. Placement comes from a pure `stripAnchor(machine)`: the lower left of the case's chin, inside the opaque art, mapped through `layoutMachine`'s s/ox/oy; on the Bare tank it sits at the tank's bottom left and appears only on hover. Persist the collapsed state and position in `finsical:strip`. It is page DOM, so it works in both shells without Swift; Tank > Show Control Strip toggles it.

**Acceptance.** (a) Playwright: T shows the palette; Feed adds pellets; Sound flips `muted` in the posted state; Lamp flips `lighting.lamp`; dragging moves it and the position survives a reload; the close box hides it. (b) Vitest: for every entry in MACHINES, `stripAnchor` lies inside the viewBox and outside the hole. Playwright: each module toggles its state (lamp, CRT, mute, pause) and its icon follows; dragging the tab moves the strip, not the window; the collapsed state survives a reload.

**Merged and related.**

- Merged: DELIGHT-15 (a Control Strip on the case; idea, Size M, Value 3/5, Risk 2/5, no PR candidate) into FIDELITY-04.
- Related: F-28 (mentions the Tool Bar only as a presentation toggle), D-38 (UI-20, a Control Strip on the browser tank page, overlaps design (b)), F-37 (fish names, PR #212), U-14, U-15.
- Fourteenth pass: FIDELITY-04, DELIGHT-15.

### U-40 Deleting a fish that is already gone does nothing, silently

Size S · Severity nit · Value 2/5 · Risk 1/5 (sixteenth pass)

**Problem.** The tank's `removeFish` handler only acts when
`sim.removeFish(id)` returns true; on a stale id — another window
removed it, or the Overview row predates the last push — the false
return is dropped on the floor and no state is pushed back. The row
stays on screen, the user presses Delete again, and again nothing
happens. The `removeAddon` branch is the same shape: `fishOutAfter`
runs the fish-out animation unconditionally and `removeAddon` then
finds nothing to remove.

**Evidence.** `web/main.ts:1533-1539` (`if (sim.removeFish(m.id)) {
audio.fishOut(); sweepThumbs(); saveTank(); }` — no else), `web/main.ts:1540-1544`
(`removeAddon` through `fishOutAfter`), `web/overview.ts:105-120`
(the Remove button posts and forgets). Read at `06f7935`;
`web/main.ts` has no test file.

**Change.** In the false branch, `postState()` so the panel re-renders
from the truth and the dead row disappears or changes status within
one push — one line, no new UI. Same treatment for `removeAddon`'s
no-op path if it can be distinguished cheaply (have `removeAddon`
report whether it spliced anything).

**Acceptance.** Manual, two windows open on one tank: Delete a fish in
window A, then Delete the same row in window B; within one state push
window B's row for that fish is gone or marked out of the tank, and
the tank page's console shows no error. (Automated regression test
impractical until T-06's browser suite or a `main.ts` harness exists —
documented here per AGENTS.md.)

**Merged and related.**

- Sixteenth pass: U-1 of `tmp.md`.
- Related: U-04 (Overview Remove without confirmation), UI-07 (U-06,
  rows that look unchanged after a Delete), U-28 (visible failure
  states).


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
- F-42 (fourteenth pass, DELIGHT-18): your own picture as the backdrop, dithered to the Mac's 256 colours.

Fourteenth-pass update (VISUAL-07): the LCD half covers more than the G4. Since #169 four cases have flat LCD panels (the 20th Anniversary Mac, the PowerBook G3, the iBook and the iMac G4), and with "Simulate a CRT monitor" on they all get barrel curvature with black curved corners, scanlines, bloom and misconvergence inside a flat, square panel. The Plus had a monochrome tube with no RGB guns, so its misconvergence and colour grille are out of period too. Evidence: `web/machines.ts:29-45` (`Machine` has no display field), `web/crt.ts:124-136` (curvature on every machine), `web/crt.ts:190-196` (aperture grille on every machine); screenshot `scratchpad/visual/cb/powerbook-g3-1680x1050-day-crt.png`; code-only in verification. Correction: the reviewer's per-tube claims (a Trinitron on the Performa 450's monitor, a shadow mask on the iMac G3) are unverified; do not encode them. Plan for the display part: add `display?: "crt" | "lcd"` to `Machine` (default "crt") and set "lcd" on tam, powerbook-g3, ibook-tangerine and imacg4; send it in `postState`'s machine payload and add a `uLcd` uniform (`CrtFilter.setDisplay`). The LCD path skips barrel, scanlines, misconvergence, bloom and the grille and draws a faint pixel grid, faded in only when cells are big enough: `vec2 f = fract(lp); float grid = step(0.12, f.x) * step(0.12, f.y); c *= mix(1.0, 0.8 + 0.2 * grid, smoothstep(2.5, 4.0, min(pxScale.x, pxScale.y)));`. Optional: response-time ghosting from a previous-frame texture (this entry's G4 ghosting), and a "Mono (P4 white)" preset for the Plus applied only when you pick it. Product call before building: this entry says never change colour depth automatically on machine choice, so decide between automatic per-case behaviour and a Monitor-pane "Display: Match machine / CRT / LCD" choice; the tube keys stay stored either way. Acceptance: `machines.test.ts` checks each listed machine's display; a GL probe with `uLcd = 1` at 4 px per game px shows raster corners that are not black and no row dips beyond the grid factor; screenshots of the PowerBook G3, iBook, TAM and G4 with the effect on show a flat, square raster. Related nit: the Monitor pane labels the grille "Shadow grille" (`web/prefs.ts:58`) while its blurb and the shader say aperture grille; call it "Aperture grille".

### A-03 Highlight color that matches the chosen iMac case

Size M · Severity idea · Value 2/5 · Risk 3/5

**Problem.** Choosing Strawberry or Bondi changes only the tank frame; Osmium hard-codes #6666cc/#333399/#000088 and exposes no variables. List selections are black and white (not lavender) and the progress fill is a sprite, so CSS variables alone cannot recolour everything. Mac OS 8.5 Appearance had Accent colours.

**Evidence.** `node_modules/osmium-ui/osmium.css:487-491` (menu items), `node_modules/osmium-ui/osmium.css:544-549` (menubar titles), `node_modules/osmium-ui/osmium.css:755-760` (focus rings), `web/machines.ts:27-45`.

**Change.** In osmium-ui first: add `--osm-accent-light`, `--osm-accent`, `--osm-accent-dark` (defaults = today's values, pixel-exact) for menu, menubar and focus-ring rules, plus `setAccent(palette)` re-registering the progress-fill sprites with recoloured palette entries; cut a tag and bump the pin. Finsical: optional `accent?: [light, mid, dark]` on Machine (Bondi #7fd1d6/#0f9aa6/#006070, Strawberry #ff8f9a/#d6283e/#7a0018), sent in postState and applied on :root by each client page behind a Prefs pop-up 'Accent color: Lavender / Match the case'. Leave list highlights black and white; check white-on-mid contrast. Low priority.

**Acceptance.** (derived) Default accent values are pixel-identical to today's Osmium rendering (screenshot diff); white-on-mid contrast is checked for each case palette.

Re-verified open at 62b8572 (fourteenth-pass audit): osmium-ui v0.2.0 still hard-codes #6666cc (`node_modules/osmium-ui/osmium.css:489, 546, 755-760`).

### A-04 (remainder) 'About This Aquarium…' in the style of Mac OS 8's About This Computer

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** The app has no About item at all, and nothing shows the version or what the tank caches. Mac OS 8's About This Computer (machine icon, Built-in Memory, a bar per running app) maps nicely onto an aquarium and doubles as a performance readout for P-01/P-03.

**Evidence.** `macos/Finsical.swift:87-104` (window specs), `macos/Finsical.swift:543-554`, `web/main.ts:385-419`, `web/main.ts:428-504`, `web/import.ts:97` (Importable has no byte size).

**Change.** New about.html/about.ts (hostWindow, osm-info; bundled like stats.ts in package.json and the Makefile copy list; `host.add(OsmiumWindowSpec(url: page("about.html"), title: "About Finsical", frameKey: "FinsicalAbout", size: NSSize(width: 420, height: 260)))`; first item in the app menu). Header: the current machine's name and a small case preview (shellMarkup), 'Built-in Memory: 320 x 200 pixels', water, and 'Largest Unused Block: N% of the tank'. Rows sorted by size like the original: thumbnail (wantThumbs), fish name (F-02), size such as '1,136K' (record the pack byte length on installedAddons in remoteInstall/applyPack; old saves show '-'), and a Platinum bar filled to 1 - hunger. Optional footer bars from page-tracked byte counts (fish sheets, scenery canvases, decoded audio, IDB cache) plus fps and the worst frame in 60 s, answered via op 'perf' only while open (performance.memory is Chromium-only). Version via esbuild `--define` (T-15). Credits per T-03.

**Acceptance.** Test: pure aboutmodel.ts (sorting, K formatting with thousands separators, bar clamp).

**Merged and related.**

- Merged from passes 1-8 ("About box"): version from `package.json`/Info.plist, license (Unlicense), archive.org credit and the LLM disclosure link. A basic browser About dialog is in open PR #103 (and #102's About window); PR #152 (open) gives the native app the standard About panel. Merged "About This Aquarium" easter-egg idea (tank stats as system specs) is this entry.
- T-03 (remainder) wants the same credits here.
- B-76 (fourteenth pass, MACOS-03): About Finsical opens behind the floating tank.

Fourteenth-pass audit (62b8572): the basic About items landed: a browser About window (`web/menubar.ts:158-195`) and the native standard About panel with credits (`macos/Finsical.swift:619-634`, menu item at `:820-822`), so the Problem's "the app has no About item at all" is stale. Still open: the Mac OS 8 About This Computer window itself (per-fish bars, pack sizes and the perf readout) and the version in the browser About. The Change stands for that window; open it through `showClient` like the other client windows, which also avoids B-76.

### A-05 (remainder) Balloon Help for the tank, fish, case and client windows

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** Nothing explains the feed and tap zones, the draggable case, resizable edges or the F/C/S keys. Help > Show Balloons is iconic System 7/8.

**Evidence.** `web/prefs.ts:194-217` (caption area already imitates Balloon Help), `web/main.ts:100-111`, `web/main.ts:1031-1044`, `macos/Finsical.swift:543-609`.

**Change.** New `web/balloon.ts`: `showBalloon(anchor: DOMRect, text)` (white rounded rect r=10, 1 px black, a triangular tail toward the anchor, Geneva 10, max width 200 px) placed by a pure `balloonPlacement(anchor, viewport, size)`; hideBalloon(). drawFish records each fish's screen rect per frame into a module-level array (shared with D-14 and D-02). With balloons on, pointermove hit-tests fish ('Scott, Angelfish. Full.'), decor (add-on name), zones ('Click here to sprinkle food. Hungry fish swim up to eat.' / 'Click the glass to tap it. Nearby fish dart away.'), the case ('Drag the case to move the tank.') and D-04 hotspots. Toggle: native Help menu 'Show Balloons'/'Hide Balloons' calling `window.finsical.setBalloons(on)` (U-05); browser: '?' key or U-14's menu; persisted as `finsical:balloons`; on automatically for the first 60 s of a first run. Client pages opt in with `data-balloon`.

**Acceptance.** Tests: balloonPlacement flips at viewport edges; Playwright hovering each zone shows the expected text.

**Merged and related.**

- Merged from passes 1-8 ("In-app help"): PR #102 (open) has a browser Shortcuts window listing F/C/S/Cmd-I and PR #152 (open) adds a native Help menu with "Finsical Help"; still open are the feed-vs-tap gesture hint and a `?`/`H` keyboard help overlay listing the same shortcuts. The first balloon step is open PR #130 (species and state tip on fish hover); "Balloon Help mode reusing prefs caption copy across tank and Overview" is this entry. Use one key: this entry proposes `?` for balloons, the older idea `?`/`H` for the shortcut overlay.
- F-40 (fourteenth pass, DELIGHT-12): Finsical Guide, Apple Guide-style "How do I…?" topics with red coach marks.

Fourteenth-pass audit (62b8572): the first steps landed: the fish hover tip (`web/main.ts:312-345`), the browser Help > Shortcuts window (`web/menubar.ts:198-226`) and the native Help > Finsical Help item, which opens the README (`macos/Finsical.swift:613-617`). Still open: `balloon.ts` and a Show Balloons mode, balloons for the zones, case and decor, the `?` key and first-run balloons.

Fourteenth-pass update (TANK-11): the feed-vs-tap gesture hint is still open, and touch has no Get Info. Help > Shortcuts lists only keys (F L M P C S Cmd-I Esc; `web/menubar.ts:198-227`, `shortcutsContent`); clicking above the water to feed, clicking the water to tap and Option-clicking a fish for Get Info are documented only in the README gesture table (`README.md:57-63`). Get Info requires `e.altKey` (`web/main.ts:290-296`), so touch devices cannot open it, and hover names skip touch (`web/main.ts:337`), so on touch you can learn a fish's name only from Tank Overview. On many Linux desktops Alt-click is the window manager's move gesture and never reaches the page (not verified). Screenshot `tank/shortcuts-480x360.png`. A step that does not need balloons: (1) add a second block to `shortcutsContent`: "Click above the water: drop food", "Click in the water: tap the glass", "Option-click a fish: Get Info", "Drop packs or sounds on the tank: import them"; (2) touch long-press: in pointerdown, when `pointerType` is "touch" and a fish is under the finger, defer the tap and arm a 500 ms timer; if the pointer stays within 8 px, call `openInfo(f)` and skip the tap, and on an earlier pointerup tap as today; suppress `contextmenu` on the canvas so the long-press does not raise the system callout; (3) optionally accept Shift-click, unused today, as a second Get Info gesture. Acceptance: Playwright shows the four gestures in Shortcuts; with hasTouch (CDP `Input.dispatchTouchEvent`), a 600 ms hold on a fish opens `.finfo` and adds no ripple, while a quick tap still adds a ripple and startles.

Fourteenth-pass update (TANK-15): the fish hover tip is a pale-yellow rectangle with 4 px corners and no tail (`web/app.css:281-285`: `#fishtip` background #ffc, border-radius 4px; placed at +14 px and clamped in `web/main.ts:345-348`), which reads as a Windows or Mac OS X tooltip rather than a System 7/8 balloon (white, black outline, generous rounded corners and a tail pointing at the item, as this entry's spec says). Zoomed screenshot `tank/hover-zoom.png`. A cheap step before `balloon.ts`: restyle `#fishtip` (background #fff, 1 px black border, border-radius 8-10 px, a 1 px drop shadow) and add a CSS `::before`/`::after` triangle tail at its top-left, pointing up-left at the pointer; when the viewport clamp in `main.ts` moves the tip left of or above the pointer, set `data-flip-x` or `data-flip-y` so the tail moves to the matching corner. `balloon.ts` can later reuse the same classes. Acceptance: a screenshot of a hovered fish shows a white balloon whose tail tip lies within 4 px of the pointer, including near the right and bottom edges (flipped).

### A-06 The app icon is a full-bleed square with no alpha

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** macOS 11-15 do not mask third-party .icns art, so the icon shows as a hard-cornered square bigger than neighbouring Dock icons (Apple's grid is an 824-pt rounded rect inside 1024); macOS 26 puts non-conforming icons on a grey plate.

**Evidence.** `macos/Makefile:56` (comment claims macOS masks it), `macos/Makefile:61-71`, `media-sources/icon-finsical.png` (1254x1254 RGB, opaque corners).

**Change.** Commit a pre-masked `media-sources/icon-finsical-1024.png` (art clipped to an 824x824 rounded rect, radius ~185, centred with a 100-px margin and a soft drop shadow), generated once by a hand-run `tools/make-icon.swift`; point ICON_SRC at it and fix the comment. Retro bonus: hand-pixelled 16x16 and 32x32 Mac OS 8-style icons for the small iconset slots.

**Acceptance.** (derived) The Dock icon matches neighbouring icons' size and corner radius on macOS 14 and 15; no grey plate on macOS 26.

Re-verified open at 62b8572 (fourteenth-pass audit): `ICON_SRC` is still `media-sources/icon-finsical.png` (1254x1254 RGB, opaque corners), and the "macOS masks the square art" comment remains (`macos/Makefile:3, 61-62`).

### A-07 Disabled Osmium sliders keep full-contrast tick marks

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** With the CRT off, slider tracks and thumbs dim but the tick sprite stays black and white; Mac OS 8 dims the whole control.

**Evidence.** `node_modules/osmium-ui/osmium.css:330-334` (::after tick sprite), `node_modules/osmium-ui/osmium.css:359-368`.

**Change.** Upstream in L-K-M/osmium-ui: a dimmed tick sprite for `.osm-inactive .osm-slider::after` and `.osm-slider.osm-disabled::after`, then bump the dependency.

**Acceptance.** (derived) With the CRT off, disabled sliders show dimmed ticks (screenshot); the osmium-ui pin is bumped.

Sixteenth pass (V-2 of `tmp.md`): **partly shipped in PR #272.** The
pane's own stylesheet now dims the ticks where the CRT is unavailable —
`.pfslider .osm-slider.osm-disabled::after { opacity: .45 }` in
`web/app.css`, measured in headless Chromium (computed style 0.45;
forcing `opacity: 1` changes 1582 PNG bytes, so the rule reaches the
pixels). Still owed: the fix **upstream in osmium-ui** and the pin
bump this entry's Acceptance requires. Two notes for whoever does it:
`web/osmium.css` is a **build artifact** — gitignored and copied from
`node_modules/osmium-ui/osmium.css` by both `npm run build` and
`npm run dev`, so editing it in this repo is silently overwritten;
and do not reach for `:has()` — the repo documents (in that same
file) that `:has()` needs Safari 15.4, newer than the macOS 12.0
floor.

### A-08 iMac G3 cases bury part of the tank under an opaque white glare that stays lit at night

Size M · Severity medium · Value 4/5 · Risk 2/5 (fourteenth pass)

**Problem.** The four Bondi and Strawberry case renders carry a baked glass reflection whose core is opaque white over the tank's top-left, so fish there vanish. At night or with the lamp off it is the brightest thing on screen: a white blob over a dark blue tank. The other cases keep their reflections subtle. The design keeps reflections over the water on purpose (`web/machines.ts:1-3`), so the fix dims the glare rather than removing it.

**Evidence.** `web/machines.ts:72-79` (`shellMarkup` draws the PNG once at full opacity over the tank). Re-measured in verification over each tank rect (sx/sy/sw/sh) of the shipped PNGs, share of pixels with alpha > 0.3 and luminance > 200 / share with alpha >= 250: imac-bondi 10.0% / 2.2%, imac-bondi-2 11.2% / 1.0%, imac-strawberry 14.6% / 4.5%, imac-strawberry-2 13.4% / 4.7%; for comparison imacg4 8.7% / 0%, plus 3.1% / 0%, tam 0.9% / 0%, and Flower Power, Performa, iBook and PowerBook 0.0-0.1%. Screenshot `scratchpad/visual/cb/imac-bondi-1680x1050-night-crt.png` shows the white blob at night. The reviewer's prototype (inset 3, radius 60, blur 2, `--glare` 0.5; `scratchpad/visual/z22.png`, `z23.png`) keeps a soft reflection with the tank readable and no seam; an 8-unit inset with blur 6 left a bright ring (`z20.png`).

**Change.** Add an optional `glassR?: number` to `Machine` (the glass corner radius in viewBox units) rather than reusing `hole.r`, which is documented as unused and which the Swift mirror ignores. Set it only on the cases with a strong glare, measured from the alpha: Bondi and Bondi II about 60, Strawberry and Strawberry II about 60-70 (optionally the G4 and the Plus later). In `shellMarkup`, when `glassR` is set, draw the art twice: once under an SVG mask that is white everywhere except a black rounded rect at `hole` inset by 3 units with `rx = glassR` (blurred with `feGaussianBlur stdDeviation="2"`), and once under the complementary mask with `style="opacity: var(--glare, 1)"`. Suffix the mask and filter ids with the machine id, as `previewMarkup` does. In `web/main.ts`, set `shellEl.style.setProperty("--glare", ...)` from the light, for example `0.25 + 0.35 * sunFactor(sim.light, nightFloor(lighting))` (`sunFactor` is in `web/water.ts:42`), only when the value changes by 0.02 or more. The native window mask is built from the PNG file and the aperture is refilled, so the window shape is unaffected. Unverified: WebKit's rendering cost for an opacity change on a masked, blurred SVG image; check that it does not re-run the blur every frame.

**Acceptance.** `machines.test.ts`: every machine with `glassR` has a hole, `glassR > 0`, and `shellMarkup` emits both masks with machine-suffixed ids; machines without `glassR` emit exactly one `<image>` as today. Playwright with the tank canvas showing a dark scene: the mean luminance of the glare region over the tank drops by at least half against main by day and by at least 70% with the lamp off, and a pixel diff outside `hole` plus 4 units is 0.

**Merged and related.**

- Related: V-23 (night ambience; its bezel-tint idea dims the case art with `sim.light` too).
- Fourteenth pass: VISUAL-06.

### A-09 The dawn and dusk tint is a source-over wash that lifts blacks to brown

Size S · Severity low · Value 3/5 · Risk 1/5 (fourteenth pass)

**Problem.** `twilightTint` is painted with source-over at up to alpha 0.3, so every dark pixel is lifted toward (255,110,40): pure black at the surface becomes about (77,33,12). Mid-dusk the tank's blacks turn muddy brown and the picture loses contrast; it reads as fog rather than warm light. It happens twice per demo cycle and at every timer switch. The separate night lift (`NIGHT_LIFT`, the "soft blue night" guardrail) is not affected.

**Evidence.** `web/main.ts:2099-2108` (gradient from `tint.a` to `0.3 * tint.a`, `globalCompositeOperation = "source-over"`), `core/light.ts:108-117` (`TINT_ALPHA` 0.3, `DUSK` 255,110,40). The lift is arithmetic from the code. The reviewer's Playwright run at a mid-ramp timer time (Bare tank) measured the darkest 5% of pixels at rgb(52,30,27) on main against rgb(19,12,18) with a soft-light prototype (`scratchpad/visual/dusk-before-after.png`, reviewed in verification: the prototype keeps deep shadows and warm highlights). The measurement was not re-run in verification.

**Change.** In `drawNight`'s tint block use `ctx.globalCompositeOperation = "soft-light"` with gradient stops `min(1, 2 * tint.a)` at the top and `0.6 * tint.a` at the bottom (the measured prototype). Soft-light leaves black black and warms midtones and highlights, as a low sun does. Canvas soft-light is supported on the WebKit floor (Safari 15). Optional: a faint multiply pass, `rgba(255,200,150, 0.5 * tint.a)`, for deeper amber at the surface.

**Acceptance.** Playwright with the clock fixed mid-ramp: the darkest 5% of tank pixels have mean luminance under 20 and the mean R/G ratio is above the daytime frame's. Frames outside the ramps are pixel-identical to main.

**Merged and related.**

- Fourteenth pass: VISUAL-08.

### A-10 Scanline gaps ignore brightness; let the beam swell on bright rows

Size S · Severity idea · Value 3/5 · Risk 1/5 (fourteenth pass)

**Problem.** A real CRT's beam spot grows with intensity: dark rows show deep gaps and bright rows swell to fill them. The shader applies the same dip to every colour, so highlights look striped like shadows and the effect reads as a stripe overlay rather than a tube.

**Evidence.** `web/crt.ts:186-188`: the dip depth is `uScan`, independent of `c`. The reviewer's flat-grey probe at 3 px/row showed the same 40% dip at #808080 and #ffffff apart from clamping. Code-only in verification.

**Change.** After V-33 (VISUAL-01) lands, so both share `sdepth`, compute `float lum = max(c.r, max(c.g, c.b));` after the bloom and overdrive block and scale the gap: `sdepth *= mix(1.0, 0.35, smoothstep(0.35, 1.0, lum));`. Optionally sharpen the dip for dark rows with `scan = pow(scan, mix(1.6, 0.8, lum))` (the base is non-negative). Retune the Sharp preset's scanlines (0.55 today) so bright water still shows lines. Best shipped in the same PR as V-33 or right after it.

**Acceptance.** A GL probe at 4 px/row with scanlines 0.4: the dip on #ffffff rows is at most 45% of the dip on #404040 rows. A tank screenshot shows full-bodied highlights with visible lines in the dark water.

**Merged and related.**

- Related: V-33 (the `sdepth` term this builds on), A-11 (more CRT polish for the same PR).
- Fourteenth pass: VISUAL-11.

### A-11 The CRT raster edge is a hard 1-bit cut, so curved edges and corners are jagged

Size S · Severity nit · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** After the barrel warp every fragment outside [0,1] is black and every one inside is full picture, so the curved raster border is a stair-step, most visible on 1x displays and where a bright waterline meets the edge. Real tubes have a soft beam falloff and rounded raster corners.

**Evidence.** `web/crt.ts:133-136` (`if (uv.x < 0.0 || ...) { gl_FragColor = vec4(0,0,0,1); return; }`). Screenshot `scratchpad/visual/z17.png` (Bare, 1100x800, DPR 1, reviewed in verification: one-device-pixel steps on the edge). Code and screenshot only.

**Change.** Keep the early out for points outside. Inside, compute a rounded-box distance and fade over about one device pixel: `vec2 q = abs(uv - 0.5) * 2.0 - (1.0 - rad); float sd = length(max(q, 0.0)) - rad;` with `rad = 0.04`, then `float edge = clamp(-sd * 0.5 * min(uTank.x * pxScale.x, uTank.y * pxScale.y), 0.0, 1.0);` and multiply `c` by `edge` before the vignette. Bundle with V-33 (VISUAL-01) as CRT polish rather than a PR of its own.

**Acceptance.** A GL probe (white source, curvature 0.45, DPR 1): each transition along the curved edge spans at most 2 device px with an intermediate value. With curvature 0 and `rad` 0 the inside matches main pixel for pixel.

**Merged and related.**

- Related: V-33, A-10 (the same CRT polish bundle).
- Fourteenth pass: VISUAL-10.

### A-12 Backdrops downscale 2:1 by nearest neighbour while fish and decor are box-filtered

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** Most AquaZone backgrounds are 640x480 and cover-fit to the 320x200 tank at exactly 0.5. `fitBackdrop` draws with smoothing off, keeping one source pixel in four, so one-pixel grass blades and leaf edges come out dotted and the backdrop is noisier than the fish (#149) and decor (#157) in front of it, which `shrinkSprite` box-filters. A 2x2 area average at exactly 0.5 adds no blur at the 320x200 output.

**Evidence.** `web/main.ts:538-551` (`fitBackdrop`, `imageSmoothingEnabled = false`). This is a documented deliberate call: FOLLOW-UPS.md "Calls you may want to revisit" says backdrops downscale nearest-neighbor per PLAN.md ("Renderer keeps the crunch", PLAN.md:45), and #125's smoothing was closed. The Design notes' composition guardrails allow "box-filtered shrink at ART_SCALE" for fish, which is the precedent. Re-measured in verification on Back03.bmp (640x480), per-channel mean absolute neighbour difference: source 10.4, nearest at 320 14.4, 2x2 box 12.0 (the reviewer's 17.9 / 26.0 / 21.7 used a different metric that was not reproduced; the ordering holds). `scratchpad/visual/backdrop-near-vs-box.png` shows broken blades with nearest and continuous ones with the box.

**Change.** Only if the maintainer flips the call: add an opaque variant of `shrinkSprite` (`shrinkImage(img, s)` in `web/artscale.ts`, the same area-weighted loop without index-0 transparency). In `fitBackdrop`, when the cover scale is 1 or less, shrink the whole image at that scale and crop the centred 320x200; at larger scales keep the nearest path.

**Acceptance.** `artscale.test.ts`: `shrinkImage` of a 2x2 black/white checker gives mid grey; a 1-px line on an odd row survives at half intensity; the output is exactly `w*s` by `h*s`. A screenshot shows continuous grass in Back03.

**Merged and related.**

- Related: V-04 (gravel strips squeezed nearest-neighbour, the same crunch call), V-05 (a 320x240 tank keeps the backdrop scale at exactly 0.5).
- Fourteenth pass: VISUAL-12 (revisits a FOLLOW-UPS call; needs the maintainer's decision).

### A-13 Finder zoom rects when Get Info and the in-page windows open and close

Size S · Severity idea · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** The Get Info card and the in-page windows appear and vanish in one frame. The Finder's zoom rects, a quick trail of outlines growing from an icon to its window, are one of the most recognizable System 7 and 8 animations, and they show where a window came from.

**Evidence.** `web/main.ts:372-401` (`openInfo` appends the card at once), `web/main.ts:367-370` (`closeInfo` removes it), `web/menubar.ts:84` (`showDocWindow`), `web/import.ts:690` (`mountImportPanel`). This document had no window-open animation entry (every "zoom" hit is about Window > Zoom or CRT overscan).

**Change.** Add `web/zoomrects.ts` with a pure `zoomFrames(from, to, n = 10): Rect[]`, eased like the Finder (fast start, slow finish), and `playZoom(from, to): Promise<void>`. It draws each rect as a 1-px dotted 50% grey outline on a fixed, pointer-events:none overlay with `mix-blend-mode: difference` (the Finder drew them in XOR), keeps the last 3 rects visible, advances one step per animation frame (about 160 ms in all), cancels cleanly when another zoom starts, and does nothing under prefers-reduced-motion. `openInfo` zooms from the fish's box to the card and shows the card at the end; `closeInfo` reverses it. The in-tank Import panel zooms from the Add-ons button or the menu title, and doc windows from their menu title.

**Acceptance.** Vitest: `zoomFrames` starts at `from`, ends at `to`, returns n frames, and sizes change monotonically. Playwright: after Option-click on a fish, an overlay exists for less than 250 ms and the card appears after it; under emulated reduced motion, the card appears in the same frame and no overlay is created.

**Merged and related.**

- Related: V-26 (moving the Get Info card out of `#screen` changes where the zoom must end).
- Fourteenth pass: DELIGHT-13.

## Features: AquaZone fidelity (open)

Done this pass and removed from this list: F-03, F-08, and F-05's
volume, mute and Sound pane (PR #159); F-22 (fourteenth pass: verified fixed on main by #166 and #172), F-24 (fourteenth pass: PR #208, which supersedes it). Fourteenth-pass IDs implemented by this pass's PRs, so never listed here: F-37 (PR #212; its remainder is listed below). Note from T-11: no code reads
the AquaZone resource tags yet, so earlier notes calling `FsTH`,
`FsTI`, `FdHd`, `LigH` and the lifecycle hooks "decoded" were wrong;
most entries below need F-01 first. (Fourteenth pass: since #166, `bankSounds` in `core/data/sndbank.ts` walks the resource map, but only for 'snd ' entries; the tags above are still unread.)

### F-01 (remainder) Parse the pack trailer as a resource map (types, ids, names) instead of sniffing chunks

Size M · Severity idea · Value 5/5 · Risk 2/5

**Problem.** The trailer at u32@4 is a little-endian Mac resource map, and most features below depend on it. Layout, verified on 99 of 101 downloaded packs (fish, eggs, 24 foods, 11 meds, gravel, plants, 34 accessories, 3 .azn, aquazone.rez, gp*.rez): map = u32@4; map+26 u16 name-list offset; map+28 u16 typeCount-1; map+30 8-byte type entries {tag[4] stored byte-reversed ('IgrD' is DrgI), u16 count-1, u16 refListOffset relative to map+30}; each ref 12 bytes {u16 id, u16 nameOffset (0xFFFF none; Pascal string at map+nameListOffset+nameOffset), u32 dataOffset (low 24 bits) relative to 0x100, pointing at u32 length + payload}. The header tag at 0x10 (byte-reversed) names the pack kind: AqFd food, AqDr medicine, AqGr gravel, AqPl plant, AqAc accessory, Aqua tank, AqZn base, XXXX fish; gp*.rez carries zero. Exceptions: SCEPTER.ACC ('Version 2.0 Resource File', 10-byte type entries) and ERAWAN.ACC (78-byte refs), whose type counts still sum to the chunk count in type order; eden.azn has one orphan chunk. Real types: FsTI, FsTH, PrF#, AMV#, BMV#, ELRA, ELRB, EGPC, EGPP, FADP, FBDP, SuS#, FsT2, FsT3, FshI, FshH, FsI3, EggI, EggH (fish); Fd_I, Fd_H, FDPC, FDDP (food); DrgI, DrgH, DRDP (medicine); AccI, AccH, ACPC, ACDP; PlTI, PlTH, PlPI, PlPH, PLPC, PLDP; AQUA, Watr, HtrI, FltI, Ligt, FdFd, Grvl, BAPC, BADP (tanks). Only `bankSounds` (`core/data/sndbank.ts`, since #166) reads types today, and only 'snd '.

**Evidence.** `core/data/fsh.ts:3`, `core/data/fsh.ts:42-54` (packChunks), `core/data/fsh.ts:148-175` (fshToSheets, packImages), `tools/az/pack.py:58` (Pack.tag), `tools/az/pack.py:73-90` (byte-scan for 12-byte records, no types), `tools/az/emit.py:55` (manifest has no type).

**Change.** New `core/data/rsrc.ts`: `packResources(d): {type, id, name, payload}[]`, `byType(type)`, and `packKind(d)` (null for unknown or zero tags, never throws). Validate that every ref offset lands on a packChunks boundary; otherwise assign types sequentially from the type-list counts when their sum equals the chunk count; otherwise fall back to today's heuristics. Rebuild fshToSheets/packImages on top and return type and id with each sheet or image. Mirror in `tools/az/pack.py` (Pack.resources) and write 'type' and 'id' into each emit.py chunk record.

**Acceptance.** Tests: rsrc.test.ts with a synthetic 2-type map plus name list, the 10-byte-entry variant, an orphan chunk, and a fixture shaped like clownfish.fsh (AMV#/BMV#/ELRA/ELRB/FsTH named 'Adult Idle' etc.); tools/tests/test_pack.py equivalents.

**Merged and related.**

- Implemented-item follow-ups that wait on this: B-01's ELRA/ELRB at the species base id; F-03's frames = ACPC ids base..base+AccI.u16@10-1 (optional ping-pong for plants if a seam shows).
- Unlocks F-02, F-06, F-11, F-12, F-13, F-17, F-18, F-22, F-33, B-22's typed-frame follow-up (PR #157 kept the heuristic), B-23(b), B-33, U-21 and V-07.

Fourteenth-pass audit (62b8572): the map walk exists, but only inline: `bankSounds` parses the little-endian map (type list, 12-byte refs, name list) to pick out 'snd ' entries (`core/data/sndbank.ts:66-110`). Still open: the generic `packResources`/`byType`/`packKind` reader, rebuilding `fshToSheets`/`packImages` on it, and the Python side (`tools/az/pack.py:73-90` still byte-scans for records, with no types).

Fourteenth-pass update (FIDELITY-10): the cheapest first slice is to lift that walk into the shared reader; it unblocks FIDELITY-09 (F-02), U-21, B-33, F-06, F-13 and D-20. Evidence: `core/data/sndbank.ts:70-110` (the walk, inline in `bankSounds`) and `:113-118` (`pascal`), `core/data/fsh.ts:42-54` (chunk scan, no types). Runtime: the same walk in Python (`fidelity/rez.py`) parses fish packs, Mekasia `.acc` letters and the 4.1 MB `aquazone.rez`; over blackmolly, neon and clownfish it lists typed resources (FsTH, FshI x31, AMV#/BMV# named 'Adult Idle' etc.). Some packs carry garbage name offsets: blackmolly's FshI names decode to a run of NULs plus 'Fatal Windows error, Aquazone will now terminate… Version 2.0 Resource File', so names need validating. Corrections to the review's plan: build this entry's API rather than a parallel design, and avoid a name clash with `tools/az/rsrc.py` (the existing big-endian Mac resource-fork reader used for sounds, with tests) by calling the TypeScript module `core/data/packmap.ts` instead of the `core/data/rsrc.ts` named above (or documenting that it reads 9003 little-endian maps only). Step one: export `packResources(d): { type, id, name: string | null, payload }[]`, lifted from `bankSounds` with the same per-entry bounds checks and never throwing; drop names that are empty, over 63 bytes or contain control characters; add `byType(res, type)`; make `bankSounds` a filter over it plus the RIFF check, with its tests unchanged; tolerate SCEPTER.ACC's 10-byte type entries and ERAWAN.ACC's 78-byte refs by returning what parses. Add the Python twin as `Pack.resources()` in `tools/az/pack.py`, which also settles the FOLLOW-UPS note that `pack.py` misses the bank's entries. Acceptance for this step: tests over `sndbank.fixture.ts` plus a synthetic 2-type map with one bogus name offset (its name comes back null) and a truncated ref list (no throw); `sndbank.test.ts` passes unmodified; a `tools/tests/test_pack.py` twin. Size S, Severity low, Value 4/5, Risk 1/5 for this step.

### F-02 (remainder) Real species names, individual fish names, sex, hatch dates and a Get Info window

Size M · Severity idea · Value 5/5 · Risk 3/5

**Problem.** Overview lists 'clownfish', 'comet', 'disc addon3': archive file names. Every fish pack carries AquaZone's species card and a roster of named individuals. FsTH (1128-byte chunk): Pascal strings at 0x00 common name (max 32), 0x21 scientific, 0x42 family, 0x142 habitat, a label at 0x246 ('Description:' or '概説'), and a NUL-terminated CRLF C string at 0x268 (e.g. 'Water Temperature: 24-28°C ... The Angelfish prefers meaty foods'). English packs keep template placeholders ('#Genre', '#Habitat'). Individuals: adjacent 464-byte (sex byte @0x104 'M'/'F', u32 LE Mac-epoch hatch time @0x106) and 1134-byte (Pascal name @0, breeder @0x122, parents and tank for bred fish) chunks. angels yields Scott (M, 1997-09-24), Robert, Samantha, Amy, Melissa from 'Franks Fish Farms'; all 58 cached fish packs have a card and plausible individuals, 9 with person names. Encoding: Western cards are Windows-1252 (a naive fatal Shift-JIS decode wrongly succeeds on them), JPN cards Shift-JIS ('金魚', 'Carassius auratus var.', 'コイ科'). The original had Fish Name, Individual Info, Species Info and Personal Note windows.

**Evidence.** `core/data/fsh.ts:42-54`, `core/sim.ts:10-57` (Fish has no name/sex), `web/import.ts:318-324`, `web/import.ts:346-365`, `web/import.ts:784-787` (detail text), `web/main.ts:78-95` (saveTank whitelist at :83-89), `web/main.ts:138-150` (spawnFish species = it.inner), `web/main.ts:385-401`, `web/overviewmodel.ts:61-71`, `web/overview.ts:95-99`, `node_modules/osmium-ui/src/controls.ts:752`.

**Change.** (1) fsh.ts: `packSpecies(d): SpeciesCard | null` and `packIndividuals(d): {name, sex?, born?, breeder?}[]` (born = `(t - 2082844800)*1000` ms, formatted with timeZone 'UTC'; drop dates outside 1990-2010). Deduplicate by name+born, keep first-seen order (angels repeats 5 individuals ~60 times). Breeder fields that look like paths (`/^[A-Za-z]:\\|\\/`, e.g. banggai's '…\Copy of flower frame tank.azn') show as 'Bred in <basename>' or are omitted. Names shorter than 3 chars or pure codes ('F', '01') count as unnamed and fall back to '<Common name> <n>'. Treat values starting with '#' or equal to their label as empty. `decodeText(bytes)`: Shift-JIS only if the fatal decode succeeds and the result contains U+3040-U+9FFF, else windows-1252 (or 'macintosh' when a Mac Roman heuristic fits); normalize CRLF. Share the reader with U-21. (2) PackResult gains species/individuals, passed through ImportHandlers.onSheets so restores carry them. (3) Fish gains optional name, sex, born, comment, in the saveTank whitelist. spawnFish takes the next unused individual of the pack (first install Scott, Add Again Robert); when a pack runs out (clownfish has 2), generate a seeded name and alternate sex; old saves get a seeded default. (4) FishSnap/itemsOf: Name = individual name, Kind = common name, optional Sex column. (5) Double-click in Overview (mountList onOpen) or Cmd-I posts `{op: 'wantInfo', id}`; a new info.html Get Info window (Osmium .osm-info, OsmiumWindowSpec in Finsical.swift, window.open in the browser) shows the 83x83 FADP portrait, editable Name (bus op 'renameFish', max 31 chars), Kind (italic Latin), Family, Habitat, Sex, Hatched (`Intl.DateTimeFormat` dateStyle 'full', UTC), Breeder, keeping notes, description and a Comments box persisted on the fish. (6) Import detail pane shows common/scientific name and the first description lines, and FADP as the preview when present.

**Acceptance.** Tests (fsh.test.ts, synthetic chunks): offsets, NUL-truncated Pascal overflow, the 1252-vs-SJIS decision, dedupe, path-breeder filter, short-code fallback, UTC date; overviewmodel.test.ts Name/Kind columns.

**Merged and related.**

- Overlaps open PR #137 (Option-click opens a Mac-style Get-Info card that tracks the fish: species, hunger, mood via `Record<Fish["state"], string>`, cruise) and the other-pass `feature/named-fish` branch (retro names at spawn, saved with the tank). Build the species card and individuals into those rather than a third UI.
- Merged from passes 1-7: surface the decoded `FsTH` names and descriptions on the Get-Info card; a Finder-style inline rename in Overview is the natural home for naming (bus op `renameFish`).
- F-37 (fourteenth pass, FIDELITY-03 and DELIGHT-03, PR #212): Fish Names puts a name tag on every fish at once, labelled `f.species` until this entry's names exist.

Fourteenth-pass audit (62b8572): an Option-click Get Info card landed (PR #137, merged via #162): it follows the fish and shows the species (the pack stem), hunger and mood (`web/main.ts:285-294`, `:372-398`). Still open: no FsTH or individual decoding, names are pack stems, `Fish` has no name, sex or hatch date, and there is no rename or Get Info window.

Fourteenth-pass update (TANK-17): a small step on today's card toward (5). Mac OS 8 Get Info windows lead with the item's icon, but the card shows only a name, a hunger percentage and a mood, although the tank already renders a memoized profile thumbnail for every fish and tracks growth. Evidence: `web/main.ts:372-398` (openInfo), `:403-430` (layoutInfo lines), `:914-935` (fishThumb/thumbFrame, a memoized profile), `core/sim.ts:207` (`MAX_SCALE`, not exported) and `:611` (asymptotic growth). Change: in `openInfo`, put an `<img>` from `fishThumb(f)` to the left of the text in `.finbody`, with `image-rendering: pixelated` (placeholder fish get the stand-in guppy frame from `placeholderFrames()`); export `MAX_SCALE` and add a third live line in `layoutInfo`: "Full grown" when `f.scale >= MAX_SCALE - 0.01`, else "Growing"; keep the card compact, since it follows the fish over the water. Real names, species cards and the FADP portrait remain this entry's. Acceptance: Playwright: Option-click shows the card with a non-empty portrait and three lines, and the growth line changes when the fish reaches full size. Size S, Severity idea, Value 2/5, Risk 1/5.

Fourteenth-pass update (FIDELITY-09): a first slice, after F-01's reader (FIDELITY-10), shows the pack's real species name and the original's Fullness reading. The card and hover balloon show the add-on's file stem ('banggai'), 'Hunger 54%' and a state word (`web/main.ts:386` card title = `f.species`, `:425` `Hunger  n%`, `:325-327` balloon label; `core/sim.ts:12-72`, Fish has no name, sex or traits), while every fish pack's FsTH carries the common name ('Neon Tetra', 'Black Molly', 'Clownfish', dumped with `fidelity/rez.py`). AquaZone's Individual Fish Information window (`frmFishPersonalInfo`, `pnlLifeSignsFishInfo` in `AQUAZONE.exe`) showed an editable name, species, sex, birthplace, age, parents, a memo, Disease/Pregnant/Died panels, a Family Tree button and five life-sign bars: Health, Fullness (100 = full, the inverse of Finsical's Hunger), Vigor, Courage and Power (guide @2797825, @2799106). Its Add Fish dialog listed a pack's individuals by name, age and sex, and adding one removed it from the file ('you cannot have more than one of the same fish', guide near @2252410; STR# 6100 #87 'This fish is not the original fish.', parsed); Finsical's Add Again clones a species without limit. Beyond the sex (0x104) and hatch time (0x106) above, each 464-byte FshI record holds several 0..100 values (u16 LE at 0x100, 0x102, 0x114, 0x122, 0x124, 0x126, 0x130, 0x138; for example clownfish F `[100, 100, 100, 99, 97, 99, 79, 95]`, neon M `[56, 56, 58, 73, 40, 67, 81, 30]`) and a Pascal string at 0x148. Correction to the review: that string is not always random printable text: neon's are, clownfish's contain control bytes (0x10, 0x18, 0x1a, 0x1b), and blackmolly's are '01', '02', '09', which look like individual codes. The mapping of the values to the five bars is unverified. Phase 1 change: `packSpecies(d)` returns the FsTH common name (Pascal string at 0), decoded with this entry's rule (Shift-JIS only if a fatal decode succeeds and yields kana or kanji, else windows-1252), ignoring empty or '#'-template names; carry it on `PackResult` and keep a display map from pack URL to name, rebuilt on restore, while `f.species` stays the install key (sheet binding depends on it, B-14). Show the name in the balloon, the Get Info title and Overview's Name/Kind for fish rows (and F-37's name tags); change the card's line to 'Fullness 46' (100 - hunger). Phase 2 is the rest of this entry (individuals, names, the Add Fish list). Do not map FshI values to Vigor or Courage until checked against the Mac build in an emulator; once individuals persist, keep the 0x148 string with each fish as an identity. Acceptance for phase 1: `fsh.test.ts`: `packSpecies` on a synthetic FsTH returns 'Neon Tetra', a Shift-JIS fixture returns kana, a '#Genre' placeholder returns null; `overviewmodel.test.ts`: a fish row shows the common name; Playwright: hovering the banggai shows 'Banggai', and the card reads 'Fullness'. Phase 1: Size S, Severity medium, Value 5/5, Risk 2/5.

### F-04 (remainder) Let users arrange decorations: placement, depth, drag, persisted positions

Size M · Severity medium · Value 4/5 · Risk 3/5

**Problem.** Decor is re-spaced evenly on every add or removal, on one baseline, never clamped (with 5 items MOAI is centred at x=288 and clipped at 335), always behind every fish, and cannot be moved. Adding a plant moves all the others. The original had an Aquarium Layout editor using the packs' top views, and its AccI/PlPI records store x, y and depth. A goldfish-bowl preset label even says 'please place this at the very front'.

**Evidence.** `web/main.ts:198-218`, `web/main.ts:1085-1091` (x = W*(i+0.5)/n, y = H-6-h, no clamp), `web/main.ts:1100` (all decor before fish), `web/main.ts:36-44`, `web/main.ts:78-95`, `web/main.ts:100-111`.

**Change.** Persist `SavedTank.decor` as an ordered array `[{url, x, depth}]`, one entry per placed item (duplicates allowed, which also fixes B-21), with installedAddons staying the fetch list. Default position: the pack's PlPI tail when present (B-23), else a pure `placeDecor(existing: {x, w}[], w, tankW, seed)` returning the centre of the widest free gap, clamped so the item stays within [0, tankW] (seeded x when there is no room). Draw sorted by depth with the base at `floorY + 4 - depth*12` (V-04); items with depth > 0.8 draw after the fish. Interaction: Option-drag on #tank (an `e.altKey` branch before the tap in pointerdown) hit-tests decor through an alpha mask kept with each canvas, moves it with a Finder-style dotted outline, and saves on pointerup; or a Tank > 'Arrange Decorations' mode where clicks do not feed or tap.

**Acceptance.** Tests: placeDecor never overlaps when the widths fit and never returns an out-of-bounds extent; `decorHit` returns the topmost item under a pixel; two copies of one accessory survive save and load.

**Merged and related.**

- Merged from pass 8 ("Arrange mode"): explicit aquascaping (pick up a plant, drag with gravel snap, Escape cancels, Undo restores); ordinary feeding drags must never rearrange the tank.
- Overlaps open PR #139 (roots anchored into the gravel, up to 3 art frames per pack, the middle frame drawn in front of fish). Resolve B-21's copies-vs-replace conflict first.
- F-34 (fourteenth pass, FIDELITY-08): a pure `decorRect(i, n, w, h)` from `render()`'s even spacing, for Option-clicking a Mekasia letter envelope; share it with this entry's `decorHit`.

Fourteenth-pass audit (62b8572): decor x is now clamped inside the glass (`web/main.ts:2025-2031`), so the Problem's "never clamped" and the MOAI clipping are fixed. PR #139 was closed without merging; its multi-frame decor landed through #157, but its depth work did not: decor bottoms still sit at `TANK.height - 6` (`web/main.ts:2031`) and no decor is drawn after the fish (`:2025-2038`). Still open: even re-spacing on one baseline, decor always behind the fish, no moving, no persisted positions, and copies that do not persist (B-21).


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
- Related (fourteenth pass): F-35 (the bank's first record is the bubbling loop), F-36 and F-38 (jobs for unused bank sounds).
- Moved here from F-22 (verified fixed and removed in the fourteenth pass): the passes 1-7 idea "Sound browser for game SFX" (deep-link, or accept a folder drop of a whole set with a progress UI); AUDIO-10's Sounds list below is its natural home.

Re-verified open at 62b8572 (fourteenth-pass audit): `playImported` (install feedback, capped at FEEDBACK_MAX_S = 4 s) is still the only music trigger (`web/audio.ts:271-297`); there is no `tracks()` or `playTrack`. The Sound pane from PR #159 is on main (merged via #162; #101 and #133 were closed), so the three-pane reconcile note above is settled.

Fourteenth-pass update (AUDIO-10): a first slice that also covers this entry's minimal UI (4): list every tank sound in the Sound pane, as Mac OS 8's Alert Sounds list did, and click one to play it. The bank has 25 sounds; 12 play (four glass taps, Drop, IntoWater, IntoWaterBig, letoutWater, ChangeWater, Switch, aqua and the bubbling loop: 9 event kinds covering 12 sounds, correcting the review's "9 of 25") and 13 never play. There is nowhere to hear them or to see which sound goes with which event; the Import Add-ons Play button plays only a set's first record (`web/import.ts:1009-1018`, `snds[0]`); installed music (the JPN Macinfish track) is heard once as 4 s of install feedback and never again (`web/audio.ts:271-297`, FEEDBACK_MAX_S); dropped sounds are listed nowhere (B-18's remainder). About 60% of the Sound pane is empty: screenshot `scratchpad/audio/prefs-sound-bubbles.png` shows a Volume group and a Tank Sounds group with two checkboxes (`web/prefs.html:65-90`). Other references: the `audio.*` call sites in `web/main.ts` (lines 157, 299, 302, 515, 677, 785, 1002, 1502, 1645), `README.md:161-165`, and the Machine pane's `mountList` (`web/prefs.ts:331`), which takes arbitrary row elements, so two columns are plain CSS. Change: (1) `TankAudio.catalog()` returns the imported and bundled records as `{name, dur, event}`, with event labels from a table next to GAME_SOUND_NAMES in `core/data/sndbank.ts`: 'Glass tap: middle/side/top/bottom', 'Feeding', 'Fish in', 'Fish out', 'Scenery in', 'Water change', 'Lamp', 'Aquarium opens', 'Filter (loop)', and 'Not used yet' for the rest; imported non-bank records are labelled 'Added'. (2) postState gains `sounds: catalog()`. (3) The Sound pane gets a 'Sounds' group with a two-column list (Sound, Plays when) built with mountList like the machine list; click or Space posts `{op:'playSound', name}`, and a second press posts `{op:'stopSound'}`. (4) main.ts routes these to `TankAudio.preview(name)` and `stopPreview()`: one tracked source, no 4 s cap for an explicit play, no loop, and `play(..., retry=false)` so nothing queues while the context is locked; in a browser the tank page needs an earlier click before it can play, in the app it plays at once. (5) Later, a per-event pop-up to reassign sounds would retire B-19's name guessing. Acceptance: audio.test.ts: catalog() lists 25 bank records with the documented labels, and an imported mp3 is labelled 'Added'; preview(name) replaces a playing preview, and stopPreview() stops it; Prefs: a state push with 3 sounds renders 3 rows, and clicking row 2 posts playSound with that row's name; Playwright: playing 'EventBirth' from the pane starts a 6.359 s buffer in the tank. Size M, Severity idea, Value 4/5, Risk 2/5.

Fourteenth-pass update (UI-19): the same Sounds list, proposed independently, with measurements and a narrower cut. The Sound pane has about 196 px free below the Tank Sounds group (the groups end at y 192, the separator is at 388; `ui-verify/m1.mjs`). References: `core/data/sndbank.ts:30-55` (GAME_SOUND_NAMES), `web/audio.ts:271-297` (playImported plays only `this.imported`, and only while the context is running), FOLLOW-UPS 'Sound' (unused game sounds). Corrections to that reviewer's plan: `playImported` does not play bundled buffers, so that plan lists imported effects only, and long tracks such as Macinfish belong to this entry's Music group; in the browser build Preferences is another tab, so the tank tab's AudioContext may still be locked, and then nothing plays. Its change: `effectNames(): string[]` on TankAudio (imported record names, sorted, excluding records longer than 30 s; B-19's music/effect split can replace the threshold); the bank's longest clip is 7.38 s, which playImported fades at FEEDBACK_MAX_S (4 s), so give the audition its own cap or accept the fade; postState sends `sounds: audio.effectNames()`; a third Sound-pane group, 'Sounds', with an Osmium mountList (rowHeight 16, about 112 px tall); selecting a row posts `{op: 'playSound', name}`, and the tank checks the name against effectNames() before calling `audio.playImported(name)`; caption 'Click a sound to hear it. These are the original game's effects.'; while the tank reports a locked context, dim the list with 'Click the tank once to turn its sound on.' Optional follow-up: TimerSet when the Lighting timer's hours change (F-36, F-38). Acceptance: Vitest: effectNames() lists each short imported record once, sorted, and leaves out a 200 s record; Playwright on a stocked tank after one click in the tank tab: the list shows the bank's 25 names, and selecting 'TimerSet' makes the tank call playImported('TimerSet') (spy). Size M, Value 3/5, Risk 2/5. Build AUDIO-10 and UI-19 as one change: AUDIO-10's `preview()` path (its own source, no 4 s cap, nothing queued while locked) and event column, with UI-19's locked-context dimming and caption; keep music in the Music group (5).

### F-06 Import AquaZone food packs: named foods, real particle sprites, species food preferences

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** The default item has allfoodsandmeds.zip (125 KB): top-level inner zips meds.zip, foods.zip (12 .fd under foods/), foods2.zip (5), live_*.zip, beetles.zip, mosquito_larvae.zip. The JPN set has AQUAZONE ITEM/餌セット with ~20 more .fd, and fish add-ons carry .fd too (Goldfish Flake/Pellet, Pleco Food, Discus). Fd_H holds the name ('AZ Standard Flake Food', 'Live Bloodworms', 'Arowana Burgers') and dosing advice; Fd_I u16@0 is a food type indexing aquazone.rez STR# 7200 (1 Flake, 2 Powder, 3 Pellet, 4 Dry Worm, 5 Insect, 6 Dry Shrimp, 7 Hamburger, 8 Frozen Insect, 9 Frozen Shrimp, 10 Living Worm, 11 Living Insect, 12 Living Shrimp Egg, 13 Hyper-Capsule); FDPC are particle sprites (flake.fd 11x4..18x8 flakes; live daphnia 4 frames of 24x10). Each fish's PrF# lists accepted food types (cardinal and neon [1,2,4,5,7,8,9,10,11,12], no pellets). Finsical has one anonymous 3x3 yellow pellet.

**Evidence.** `core/sim.ts:59-65` (Food has no kind), `core/sim.ts:174-178`, `core/sim.ts:228-238`, `core/sim.ts:418-427`, `web/import.ts:65-89` (no food collection), `web/import.ts:90-93` (PACK_EXT/DIRECT_EXT lack fd), `web/import.ts:190-239`, `web/import.ts:462-471`, `web/main.ts:1093-1099`.

**Change.** Import: add `fd|med` to PACK_EXT and DIRECT_EXT. Nested-mode collections `{section: 'food', outer: 'allfoodsandmeds.zip/foods.zip', exts: /\.fd$/i, deep: true}` and the same for foods2.zip; a new optional `Collection.innerMatch?: RegExp` for the default-mode listing of allfoodsandmeds.zip's other inner zips (live_*, beetles, mosquito_larvae; exclude meds.zip, foods.zip, foods2.zip); JPN `{section: 'food', item: JPN_ITEM, outer: JPN_ZIP, prefix: JPN_ROOT + '餌セット/', exts: /\.fd$/i}`. Add 'Food' to SECTION_TITLES and KIND_NAMES and a food route in handleImages (unknown sections are silently ignored today). Installing adds the food to a pantry (`SavedTank.foods`); Tank > Food submenu lists pantry foods with a check on the current one, and F and Feed Fish drop the current food. Sim: `dropFood(x, food)` with `enum FoodKind { Sinking, Floating, Live }` from the type code (flakes float ~4 s with x drift then sink at 0.15 px/tick; pellets 0.35; live food random-walks and never rots); nearestFood skips food a fish's PrF# does not accept (default accepts all). Render a seeded FDPC sprite per pellet (animated for live food, ART_SCALE).

**Acceptance.** Tests: import.test.ts innerMatch excludes meds.zip; sim.test.ts: a fish accepting [1] ignores type-3 food, live food moves and does not settle, floating food stays at SURFACE >= 100 ticks.

**Merged and related.**

- Merged from passes 1-7 ("More foods"): flakes, pellets and live food with different sink rates start as one `sink` field on `Food`.

Re-verified open at 62b8572 (fourteenth-pass audit): there is still no food collection and no `.fd` in PACK_EXT (`web/import.ts:74-106`), and `Food` has no kind.

### F-07 Automatic feeder ('Fantastic Feeder') with spoonfuls, interval and limited supply

Size S · Severity idea · Value 3/5 · Risk 2/5

**Problem.** Fish seek food after ~8 minutes, read 'hungry' after ~13 and 'starving' after ~17, so a tank left open all day is permanently starving and only Stats says so. The original shipped an auto-feeder: the FdHd 'Fantastic Feeder' text says it drops a fixed amount at fixed intervals of tank time and that supply is limited; tanks carry an FdFd schedule record, and the FRMFOODTIMER window had 'Add Food ( spoonfuls ):', 'Next Feeding:', 'Interval:' and 'Remaining:'.

**Evidence.** `core/sim.ts:81-84` (hunger saturates in ~20 min), `core/sim.ts:174-178`, `web/main.ts:794-797`, `web/statsmodel.ts:45-47`, `web/statsmodel.ts:121-125`.

**Change.** `Sim.feeder = {enabled, nextTick, intervalTicks, spoonfuls 1-5, remaining}`; when due, tick() drops `spoonfuls` pellets spread over the middle 40% of the width, decrements remaining, schedules the next drop and emits 'fed' (F-13). Works with F-10 speed and F-09 catch-up. A simpler 'Automatic feeder' checkbox variant: a pure `autoFeedTarget(sim)` that every 900 ticks drops one pellet above a fish with hunger > 0.6 when no uneaten food exists. UI: Tank > 'Food Timer…' Mac OS 8 dialog ('Add food in [6] hours', 'Every [12] hours' with little arrows, 'Spoonfuls: [2]', 'Remaining: 18 spoonfuls [Refill]', 'Next feeding: 14:30', On checkbox); Stats shows the next feeding.

**Acceptance.** Tests: interval 100 ticks and 2 spoonfuls drop exactly 2k pellets by tick 100k; remaining 0 stops drops; disabled drops nothing; autoFeedTarget unit tests.

**Merged and related.**

- Related: D-15 (learned feeding time), U-01.

Thirteenth-pass update: PR #228 (open) adds the timed auto-feeder half.

Fifteenth pass: a Tank-menu timed feeder drops on a
tank-time interval with a pellet pile-up cap (PR #228); spoonful
counts, the supply limit and the FRMFOODTIMER window remain.

### F-09 Time passes while the app is closed (closed-form catch-up on launch)

Size M · Severity idea · Value 2/5 · Risk 3/5

**Problem.** On relaunch the sim resumes at the saved tickCount; the original ran around the clock. But HUNGER_PER_TICK = 1/36000 saturates in 20 minutes, so naive catch-up would make every launch start with all fish starving; do this only after F-07 and F-10's life pace exist.

**Evidence.** `web/main.ts:36-44` (SavedTank has no timestamp), `web/main.ts:56-69`, `web/main.ts:78-95`, `web/main.ts:1130-1132` (200 ms catch-up cap), `core/sim.ts:83`.

**Change.** Save `savedAt: Date.now()`. On load `elapsed = clamp(now - savedAt, 0, 8 h)` (or 7 days with a feeder) in ticks at the configured pace. `Sim.catchUp(ticks)` in core/sim.ts: waterQuality += FILTER_PER_TICK*ticks (clamped to 1; settled food has rotted), hunger = `max(hunger, min(0.6, hunger + ticks*HUNGER_PER_TICK))` without a feeder (hungry, not starving), feeder drops at their scheduled ticks, age for F-11/F-12; no swimming. Show a Mac OS 8 alert: 'While you were away (2 days 4 hours): the Food Timer fed 4 times. 1 fish is hungry.' Preference 'Pause the tank while Finsical is closed', default on until the feeder exists.

**Acceptance.** Tests (sim.test.ts): catchUp(1e6) caps hunger at 0.6 and water at 1; a stationary fish's hunger after catchUp(108000) matches 108000 tick() calls within 1e-9 (with the feeder, fed-fish hunger matches a real-time run within 1e-6); determinism with a seed.

**Merged and related.**

- Merged from passes 1-8 ("Offline sim catch-up (optional)"): the sim does not advance while the app is closed; long absences reset nothing (good) but never progress day/night either; cap a tick budget on launch if wanted. Distinct from the hidden-tab stall (B-53). Keep real-clock lighting (PR #155) separate from hunger time.

Fourteenth-pass update (FIDELITY-11): primary sources settle this entry's product question. While AquaZone was closed, time went on ('everything in your tank will go on just as you left it', @2409808); on Open Aquarium it 'gathers information about what happened … You will learn about all of these events as your aquarium opens' (@2697470); aquariums were never saved because 'time cannot be turned back' (@2698256, @2409558). `SavedTank` still has no `savedAt` (`web/main.ts:76-86`), so a relaunch resumes as if no time had passed. Correction to the review's button naming: in the original, 'Catching up' meant ignoring the elapsed time (STR# 6001 #30 'Catching up will ignore the time that has passed. This does not reflect reality and is not really being true to the AQUAZONE concept. Do it anyway?!'; #24 asks 'Should AQUAZONE update it to match the computer's time?'), so a 'Catch Up' button that applies the elapsed time would invert it. STR# strings parsed from `aquazone.rez`; guide quotes verified in the extracted text. Refined plan, on F-10's life clock (FIDELITY-01): save `savedAt`; on load convert the elapsed time to capped life ticks at the chosen pace (the 0.6 hunger cap above without a feeder); open a Mac OS 8 alert 'While you were away (3 hours 10 minutes): …' listing F-13 events when they exist, and the hunger and water drift until then, with buttons 'Let Time Pass' (apply it) and 'Catch Up' in the original's sense (jump to now without simulating), the latter confirming once with the original's 'not really being true to the AQUAZONE concept' line. The preference becomes a checkbox 'Let time pass while Finsical is closed', off until F-07's feeder exists (the same default as above). Acceptance addition: Playwright: a save whose `savedAt` is 2 hours old opens the alert; Let Time Pass raises hunger by exactly the paced, capped amount; Catch Up leaves the tank as saved. Needs F-10 (FIDELITY-01) and F-07 first. Size M, Severity low, Value 3/5, Risk 3/5.

### F-10 (remainder) Life pace: AquaZone's Aquarium Speed scales biology, not swimming

Size M · Severity low · Value 4/5 · Risk 2/5 (fourteenth pass, from FIDELITY-01; was Size S · Severity idea · Value 3/5)

**Problem.** The original let you freeze or speed up time ('Aquarium Speed:', 'Current speed:' in AQUAZONE.exe; the feeder help says intervals follow tank time). Finsical runs a fixed 30 tps. Growth, incubation and disease also need a tank-time scale.

**Evidence.** `web/main.ts:1016-1025` (animFrame on sim.tickCount), `web/main.ts:1126-1141` (fixed 30 tps), `macos/Finsical.swift:555-577`.

**Change.** (Rewritten in the fourteenth pass from FIDELITY-01, with SIM-04 and VISUAL-09. The old plan, a speed in {0, 1, 2, 4, 8} run by a pure `ticksForFrame(acc, dtMs, speed)` capped at 400 ticks per frame, a Tank > Speed submenu (Paused, Normal, Fast 2x, Faster 4x, Fastest 8x) and a separate 'Life pace' preference setting `TANK_DAY_TICKS` (Realistic 24 h, Relaxed 1 h default, Quick 5 min) only for F-07, F-11, F-12 and F-17, would have sped up the swimming too, the opposite of the original, whose Aquarium Speed scaled only biological time.) In `core/sim.ts`, add a public `lifeRate` with a `LifePace` enum of presets: Hold (0: fish swim, nothing ages), RealTime, Brisk, and Finsical (today's pacing, the default, so nothing changes). Express the life constants per real-time second at speed 1 and multiply `HUNGER_PER_TICK`, `WASTE_PER_TICK`, `FILTER_PER_TICK` and the rot counter (`fd.settled += lifeRate`) by the rate; strokes, sinking, bubbles, startles and `animFrame` stay on `tickCount`. Keep `DAY_TICKS` defined at the default pace so today's 13.3-minute demo day is unchanged (at RealTime the demo day would then last about 13 hours, and the clock-timer light mode remains the real 24-hour option), or leave the demo light on `tickCount`; decide in the PR. SIM-04's `Sim.setAppetite(ticksPerDay: number | null)` (null keeps today's pace; hunger rises by `HUNGER_PER_TICK * DAY_TICKS / ticksPerDay`, mirroring `setLight` so the sim stays tick-only) is the hunger-only form of the same knob: build one knob, with a pure main-side helper that maps the setting to the rate. Offer a real-time pace only after F-09 and B-53 land: the sim runs only while the tank is open and visible, and closed time is not caught up, so a tank open one hour a day would take about ten days of open time to reach seek hunger; feeding, the tank's main interaction, would stop working and every pellet would rot. The default and the light-timer mode's value are product decisions (a Relaxed pace of about 1 h per tank day gives seek hunger after about 36 min). UI: a Tank > Aquarium Speed submenu and a Speed pop-up in Tank Stats (the original kept it in Aquarium Information); persist the pace in `SavedTank`, show it in Stats, and fix the `HUNGER_PER_TICK` comment in sim.ts. Keep Pause as the separate freeze-everything feature (done, PR #123), and draw its label as a System 7/8 notice (VISUAL-09, below). F-07's feeder and F-09's catch-up then run on the life clock, as do F-11, F-12 and F-17.

**Acceptance.** `sim.test.ts`: at Hold, 10,000 ticks leave hunger and water quality unchanged while fish x changes; doubling the rate halves the ticks to a given hunger for a still fish (within 1e-9); with `setLight(1)` pinned (so sleep can't diverge), no food and hunger below the seek threshold, fish trajectories over 3,000 ticks are bit-identical across two rates with the same seed; the default preset reproduces today's hunger after 14,400 ticks exactly; `saveTank`/`loadTank` round-trips the pace. From SIM-04: the null (default) pace reproduces today's hunger exactly; a pace of `2 * DAY_TICKS` per day raises hunger at half the rate (within 1e-12); a unit test covers the main-side helper that maps the setting to the rate. From VISUAL-09: Playwright: after pressing P (Cmd-P natively), the tank canvas pixels inside the label rect are only #000 and #fff, and a screenshot over a bright backdrop shows the label readable.

**Merged and related.**

- Pause overlaps open PR #123 (freezes `tick()` while render continues; Tank menu and a bare key). Speed and life pace remain. PR #157 already runs decor animation on the sim clock so speed applies.
- B-70 (fourteenth pass, TANK-07): Take a Picture while paused bakes the dark pause scrim and a blurry "PAUSED" into the PNG.

Fourteenth-pass audit (62b8572): Pause is done (PR #123, merged via #162): `PAUSE_KEY`, the bare P key, Tank > Pause Simulation and a dimmed overlay (`web/main.ts:1245-1260`; paused frames run 0 ticks at `:2169-2170`). Still open: the speed part, now the life pace above (FIDELITY-01 supersedes the old fast-forward), and the pause label's look (VISUAL-09).

Fourteenth-pass update (FIDELITY-01): Aquarium Speed was a life clock. AquaZone's Aquarium Speed (Edit > Aquarium Information, 0 to 100 times real time) scaled only biological time: 'The aquarium speed does not control the aquarium's animation. AQUAZONE fish will always swim at a natural pace' (@2303472); it 'does affect the rate of growth of the fish, the speed at which the water becomes dirty' (@2783672). Speed 1 was the recommended default (@2290140), with feeding two or three times a day (@2325088); at 0 nothing developed but fish kept swimming. Starter tanks reset the speed to 1 (@2251276), and speed 0 turned off the autofeeder and light timer (STR# 6001 #31, #33). Finsical has no life clock: hunger goes from 0 after a meal to `HUNGER_SEEK` 0.4 in 14,400 ticks (8 minutes) and saturates in 20 minutes, about 60 times the original's pace, and Pause runs zero ticks, so fish freeze mid-stroke. Evidence: `core/sim.ts:103-105` (`HUNGER_PER_TICK = 1/36000`; its comment says 'once-a-day feeding rhythm', true only per 13-minute demo day), `:113-117` (rot, waste and filter constants), `:214` (`DAY_TICKS` 24000, 13.3 minutes), `:357` (the demo light reads `tickCount`), `:405-412`, `:429`, `:609` (a meal sets hunger to 0); `core/tuning.ts` (`HUNGER_SEEK`); `web/main.ts:2169-2170` (paused runs 0 ticks). Guide quotes and STR# strings verified in the extracted text and the parsed `aquazone.rez`; code-verified, nothing run. Correction applied in the Change: keep `DAY_TICKS` at the default pace so the demo day does not change.

Fourteenth-pass update (SIM-04): in light-timer mode hunger still runs on the 13-minute demo day. With the timer a day is 24 real hours, yet at 30 tps fish seek food after 8 min, Stats says "Fish are hungry" after about 11 min, and fish beg under the surface after 15 min, so an owner who keeps a timer tank open and feeds once in the morning sees begging fish and a feeding hint for almost the whole lit day (13 h 45 min of a 14 h day). Evidence: `core/sim.ts:103-105` (HUNGER_PER_TICK and its comment), `:187` and `:684-686` (BEG_HUNGER 0.75 pins the band under the surface), `core/tuning.ts:6` (HUNGER_SEEK 0.4), `web/statsmodel.ts:47-50` and `:119-123` (the hint at an average of 0.55, 'starving' at 0.85), `core/light.ts:99-105` (timer light follows the wall clock), `web/main.ts:2149` (30 tps). Arithmetic verified: 0.4 x 36000 = 14400 ticks = 8 min; 0.55 gives 11 min; 0.75 gives 15 min. Correction to the review: tying appetite to a real 24-hour day is harmful today (see the Change), so the pace is this entry's setting rather than hardwired to the timer. Size S, Severity low, Value 2/5, Risk 3/5.

Fourteenth-pass update (VISUAL-09): the PAUSED label is `10px monospace` drawn into the 320x200 canvas: whatever monospace the system has (Menlo, DejaVu), anti-aliased, then scaled up into fat grey blocks, with no backing plate, so it gets lost over bright plants, where this entry asked for a small placard in a Mac font. Evidence: `web/main.ts:2062-2072` (fill `rgba(4,8,24,0.35)`, `ctx.font = "10px monospace"`, `fillText("PAUSED", ...)`); screenshot `scratchpad/visual/z16.png` (reviewed in verification). The reviewer measured 2 grey levels for "Paused" in 12px "Osmium Charcoal" or 10px "Osmium Geneva" on a canvas, against 92 for 10px monospace. `installOsmium` is exported from osmium-ui and runs on the tank page only when the menu bar (browser) or an Osmium control mounts, so in the native shell the fonts are not guaranteed to be registered. Change: call `void installOsmium().then(requestPaint).catch(() => {})` once at startup; in `render()`'s paused block keep the dim and draw a System 7/8 style notice: `ctx.font = '12px "Osmium Charcoal"'`, measure the text, fill a white rect `w + 12` by 18 at integer coordinates (centred, or in a corner as planned here), stroke 1 px #000 at +0.5, add a 1 px #000 shadow on the right and bottom, and draw "Paused" in #000 at an integer baseline with `textAlign = "left"` so glyphs stay on the pixel grid. Acceptance is in the Acceptance above. Size S, Severity low, Value 2/5, Risk 1/5; it can land on its own before the life pace.

### F-11 (remainder) Fish grow from fry to adult using both sprite sets every pack already ships

Size M · Severity idea · Value 4/5 · Risk 3/5

**Problem.** Every fish pack contains the generic fry ring (shared 9x31 / 32x32 / 20x32 sheets, which B-01 stops showing by mistake) and the adult ring; AquaZone was a fish-raising sim. Egg packs exist too (F-23).

**Evidence.** `core/sim.ts:10-57` (no age), `web/main.ts:78-95`, `web/main.ts:120-133`, `web/main.ts:138-150`, `web/main.ts:222-237`, `web/render.ts:61-72`, `web/overviewmodel.ts:66`.

**Change.** After B-01, keep `rings[slot] = { baby, adult }` (pickSwimSheet's baby/adult). Fish gains a persisted `bornTick`: spawnFish sets `sim.tickCount`; legacy fish without it count as adults (existing tanks never regress). A pure `lifeStage(ageTicks)` in `web/tankmodel.ts` (and a `growthScale(age)`): baby below 1 TANK_DAY_TICKS (x0.7 faster when hunger stays below 0.33), adult after; ramp the adult's render scale from 0.5 to 1 over the transition so it does not pop, with a small sparkle and chime. A preference decides whether new fish arrive as fry or adults (default adults); 'Add again' may spawn fry. Overview status 'Fry' or 'Adult'.

**Acceptance.** Tests: lifeStage boundaries and growthScale; saveTank/loadTank round-trips bornTick.

**Merged and related.**

- Overlaps open PR #110 (per-fish `scale` growth: juveniles spawn at 0.78-1.10, each meal closes 6% of the gap to 1.35, persisted). Merged from passes 1-7: multi-sheet growth stages need `usePack` to keep more than one sheet; scale-based growth is the interim.
- PR #149's `pickSwimSheet` does not return B-01's proposed `baby` sheet; add it here.

Fourteenth-pass audit (62b8572): the interim scale growth landed (PR #110, merged via #161, with `MAX_SCALE` 1 rather than 1.35): fish spawn at 0.70-0.95 and each meal closes 6% of the gap to `MAX_SCALE` (`core/sim.ts:202-207`, `:281-287`, `:611`). Still open: `pickSwimSheet` returns only the adult (`core/data/swimsheet.ts:14`), and there is no `bornTick`, `lifeStage` or fry rendering. `TANK_DAY_TICKS` in the Change now means a tank day at F-10's life pace (FIDELITY-01).

### F-12 Fish lifecycle: health, old age and death using the packs' own dying art

Size L · Severity idea · Value 3/5 · Risk 4/5

**Problem.** The original's fish were born, grew and died; dead fish floated up, turned black and fouled the water until removed. Finsical fish are immortal. The data exists: each family's 4th sheet (+3) is 'right/left dying fish' (5 or 8 frames depending on the pack; clownfish ELRA 31603 fades through grey to black); FsTI u16@0 looks like days to adulthood (guppy 95, medaka 99, neon 180, cardinal 360, goldfish 370; tentative); aquazone.rez STR# 7100 CauseOfDeath has 23 entries (Starvation, Old Age, Water Temperature, Bad pH level, Disease…) and STR# 20005 is 'A fish has died.' Killing fish in a relaxation toy is a product decision.

**Evidence.** `core/sim.ts:10-57`, `core/sim.ts:248-252` (hunger clamps at 1 forever), `core/pose.ts:10-29`, `web/main.ts:1031-1044`.

**Change.** Sequence after B-01, F-01 and F-10. Fish gains optional `ageTicks`, `health` (0..1), `stage`, `life` ('alive' | 'dying' | 'dead') with defaults for old saves (adult, health 1, age 0). Health drains while hunger >= 1 or water < 0.2 (later temperature/pH, F-15). At 0 the fish plays all framesPerGroup of the +3 sheet matching facing (~2 s), then turns dead: no steering, rises to SURFACE at 0.2 px/tick belly-up (mirror vertically), fouls water at 2x WASTE_PER_TICK until removed, records its cause, and emits 'died' (F-13). Removal via Overview Remove plus Tank > 'Remove Dead Fish'. Preferences > 'Fish can die', default OFF (ask the user).

**Acceptance.** Tests (seeded): hunger 1 and health 0.01 goes dying then dead within N ticks with cause 'Starvation'; a dead fish reaches SURFACE and water falls until removeFish; a baby at adultTicks-1 becomes adult after one tick; with deaths disabled health never drops below 0.1.

**Merged and related.**

- Merged from passes 1-8 ("Lifecycle stage 1", "Fish death / hunger consequences", "No sickness/death beyond lethargy"): start with lethargy at hunger >= about 0.9 plus recovery on feed, wired to the birth/sick/dead `snd` events once F-01 can read them; pair any death path with a revive so it stays friendly; foul-water surface gasping (open PR #106) is the pure-visual first step. Relaxation-toy constraint: no irreversible deaths by default (Preferences > "Fish can die", default off). Starvation notifications are declined.

Re-verified open at 62b8572 (fourteenth-pass audit): there is no health, age or life state; the only consequence of bad water is the foul-water gasping (`core/sim.ts:119-121`).

Fifteenth pass: sickness, death and birth landed with
their bank sounds (PR #206); old age, the packs' dying art and
the CauseOfDeath table remain.

### F-13 Event notices and a Tank Log window using the original's event text and animated art

Size M · Severity idea · Value 4/5 · Risk 2/5

**Problem.** The original popped an event dialog (FRMEVENT) for everything that happened. aquazone.rez has STR# 20001-20014 ('Adding food.', 'Adding Medicine.', 'Changing water.', 'Cleaning the filter.', 'A fish has died. Name/Species/Age', 'Laying eggs.', 'Baby has hatched.', 'A fish is sick.', 'A fish is pregnant.', 'Fish are mating.', 'The eggs have all died.', 'A fish has given birth.', 'A miscarriage occurred.', 'A fish has recovered.') and 52 EvDP pictures, 70x70: 13 events x 4-frame animations (a hand dropping food, a dropper, a bucket, a filter cartridge, a fish fading to black, a mating pair, an egg hatching…). Verified word for word. aquazone.rez is at `https://archive.org/download/aquazonewithguppiesandaddons/AQUAZONE.iso/Updater%2FData%2Faquazone.rez` (4,136,362 B, CORS OK).

**Evidence.** `core/sim.ts:205-246` (tick emits nothing), `web/statsmodel.ts:86-112`, `macos/Finsical.swift:76-102` (window table), `macos/Finsical.swift:555-577`.

**Change.** core/sim.ts `readonly events: SimEvent[]`, a typed union `{kind: 'fed' | 'medicated' | 'waterChanged' | 'filterCleaned' | 'died' | 'laidEggs' | 'hatched' | 'sick' | 'recovered' | 'pregnant' | 'born' | 'mating', tick, fishId?, data?}` pushed in tick() and public actions. main.ts drains it each frame into a persisted ring (localStorage `finsical:log`, 500 entries with wall-clock time), posts op 'log', and plays a matching 'snd ' event sound if one exists. New log.html/log.ts client window (native entry in the Finsical.swift window table and Tank > 'Tank Log' Cmd-L): an Osmium Finder list with a 16x16 icon cut from the first EvDP frame, Date, Event and Fish columns. Optional 'Show event alerts': a movable modal with the 4-frame animation at 4 fps plus the original label lines ('Name: Andrew Species: Dell's Comets Age: 12 days'). Load aquazone.rez lazily the first time art is needed (text-only rows until then). Ship with 'fed', 'medicated', 'waterChanged', 'filterCleaned' first.

**Acceptance.** Tests: sim.test.ts that a manual dropFood emits nothing but a feeder drop emits 'fed', and a death emits 'died' with fishId; `web/logmodel.test.ts` for formatting and ring truncation.

**Merged and related.**

- Merged from passes 1-7: "Captain's Log", a SimpleText-styled auto-diary of tank events from stats history plus sim events, is this Tank Log. D-20's letters add entries.
- F-38 (fourteenth pass, DELIGHT-06): a recovery jingle (EventTiyu) when gasping fish recover, a first 'recovered' moment before this entry's events exist.

Re-verified open at 62b8572 (fourteenth-pass audit): there is no `SimEvent`, events list or log page. Correction: the event sounds the Change wants to play now exist; the bank's ids carry their Mac names (`core/data/sndbank.ts:30-55`), so events can play the bank's Event* sounds (for example EventBirth, EventTiyu) by exact name.

### F-14 (remainder) Water changes, a filter that gets dirty, and Clean Filter

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** The filter never clogs, so a fouled tank always heals by itself and the only care is 'stop feeding'. The original had Change Water… and Clean Filter commands and a 'Dirtiness:' field; STR# 310 describes the change-water dialog (amount, temperature, Blue = original, Red = new water, Green = resulting mix, conditioners, click the bucket); tanks carry a FltI 'AquaClean' record.

**Evidence.** `core/sim.ts:90-92`, `core/sim.ts:239-240` (constant filtration), `web/statsmodel.ts:86-112`.

**Change.** (Filter model rewritten in the fourteenth pass from FIDELITY-02. The old plan, `Sim.filter = {dirt 0..1}` growing with the waste term, recovery = FILTER_PER_TICK * (1 - 0.8*dirt) and a `cleanFilter()` that reset dirt to 0, made a spotless filter always best, the misconception the original set out to correct; its tests, dirt = 1 recovering at 20% of the clean rate and cleanFilter restoring the full rate, go with it.) Filter: a saved `filterDirt` (0..1) growing with rotting pellets plus a small base rate. A pure exported `filterEfficiency(dirt)`: a mechanical term (1 - dirt) times a biological ramp saturating at 30% dirt, giving a plateau of 1.0 on 0.3-0.5, about 0.35 spotless and about 0.2 fully clogged; recovery = `FILTER_PER_TICK * efficiency`, tuned so today's recovery holds inside the band. `cleanFilter(step = 0.05)` lowers dirt by 5%, never below 0, briefly adds murk and emits 'filterCleaned' (F-13). Relaxation-toy constraints: new and migrated tanks start at 0.4 (inside the band); the base rate is slow (days of tank time, on F-10's life clock when it exists); clogging only slows recovery, so an untended filter never makes a carefully fed tank worse, and nothing nags. UI: a Tank Stats 'Filter: 42% dirty' Platinum bar with a 'Clean 5%' button, a Tank > Clean Filter item (browser and native), `audio.washFilter()` by exact name, and care hints above 0.6 ('The filter is clogging') and below 0.15 ('A spotless filter has none of its helpful bacteria'). Keep `WASTE_PER_TICK` above the best-case filter rate (Design notes, U-01). Water changes (a basic `changeWater` landed, see the audit note below): extend it to `changeWater(fraction, tempC)`: quality = q*(1-f) + f, temperature mixed (F-15), pH toward 7.2, chlorine += f unless a conditioner is dosed (F-16); Tank > 'Change Water…' movable modal ('Amount: [25] %', 'Temperature: [26.0] °C', three Platinum bars in the original blue/red/green legend, 'Add Water Conditioner' checkbox, Cancel / Change with a bucket icon); advice 'Change some water' (quality < 0.5).

**Acceptance.** Tests: changeWater(0.5) from 0.4 gives 0.7. From FIDELITY-02: `sim.test.ts`: `filterEfficiency(0) < filterEfficiency(0.4) > filterEfficiency(0.9)`, and the maximum lies on [0.3, 0.5]; `cleanFilter` lowers dirt by exactly 0.05 and clamps at 0; rotting food raises dirt; `filterDirt` round-trips; a single rotting pellet still lowers quality at every dirt level. A `statsmodel` test for the hint thresholds; `audio.test.ts`: `washFilter` plays 'WashFilter'.

**Merged and related.**

- Overlaps open PR #114 (`sim.changeWater(0.6)` recovers 60% of the quality gap and siphons every settled pellet; Tank Stats button; native menu item). The dirty filter, Clean Filter and the Change Water dialog remain; keep #114's "settled food is waste" model (Design notes).

Fourteenth-pass audit (62b8572): water changes landed (PR #114, merged via #162): `Sim.changeWater` (`core/sim.ts:309-317`) with a Tank menu item, a Stats button and the ChangeWater sound. Still open: filtration is constant (`core/sim.ts:411-412`), so there is no filter dirt, no Clean Filter and no Change Water dialog (amount, temperature, conditioner).

Fourteenth-pass update (FIDELITY-02): the original cleaned the filter 5% at a time and called 30-50% dirty ideal. AquaZone's Attend > Filter dialog (`frmFilterSetup` with `ccFilterDirtiness` in `AQUAZONE.exe`; STR# 20004 'Cleaning the filter.', parsed) showed how dirty the filter was and had one 'Clean by 5%' button. The guide stresses that a spotless filter is not ideal: bacteria in the dirty cotton do the biological filtering, 'never clean the filter completely', and 'AQUAZONE experts recommend keeping the filter between 30% and 50% dirty' (@2351038, @2351674, @2849444). Finsical has no filter state (`core/sim.ts:117` constant `FILTER_PER_TICK`, `:410-412`), the bank's WashFilter sound (id 8074, `core/data/sndbank.ts:37`) is unused (FOLLOW-UPS 'Sound'), and `web/stats.ts:166-169` is the precedent for a Stats care button. The Change and Acceptance above now follow this item, including its corrections for the relaxation-toy constraints. Size M, Severity low, Value 3/5, Risk 2/5.

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

Thirteenth-pass update: PR #206 (open) adds sick/dead/born states.

### F-17 Breeding: mating, eggs, livebearer births, fry and family trees

Size L · Severity idea · Value 3/5 · Risk 4/5

**Problem.** Breeding was AquaZone's heart ('they will live long and BREED for limitless generations'). Data: F-02's sexes; FsTI u16@0x02/0x04 is 1/2 for egg-layers and 2/1 for livebearers; FsTI u32@0x0a looks like incubation/gestation minutes (neon and cardinal 1440, goldfish 5040, guppy and molly 43200; tentative); EGPC (5x5 egg sprite), EGPP clutch pictures, EggI/EggH egg records with parent names; blackmolly has 'Pregnant 01-05' individuals and bred records naming parents; banggai has 'Banggai eggs'; 13 JPN egg packs (F-23). Events exist for mating, laying, hatching, pregnancy, birth and miscarriage; the original had a Family Tree window.

**Evidence.** `core/sim.ts:132-172` (no egg entity, no sex), `core/data/fsh.ts:148-164`, `web/import.ts:80-88`, `PLAN.md:59-61` (out of v1 scope; says the hooks exist).

**Change.** After F-02, F-10, F-11 and F-12. `Sim.eggs: Egg[] {id, speciesKey, x, y, laidTick, hatchTick, motherId, fatherId}` persisted (SavedTank v3 with migration). Once per tank-hour, an adult 'M' and 'F' of the same pack with hunger < 0.3 for 2 tank-hours and water >= 0.8 (and ideal temperature once F-15 exists) mate with a seeded probability (~0.15 per tank-day): a 90-tick chase, then egg-layers lay k eggs near plants or gravel (drawn with EGPC) and livebearers set `pregnant = gestation` and later give birth. k is capped by FsTI u16@0x08 (tentative brood size) and a global 24-40 fish cap. Hatchlings are 'baby' fish inheriting pack and species, a free individual or '<Mother> Jr.', and parent ids; Get Info shows 'Parents: Samantha x Scott'; a Family Tree list uses a Finder outline view with disclosure triangles. All rolls use this.rand().

**Acceptance.** Tests (seeded): a fed pair in clean water produces eggs within N tank-days; eggs hatch at incubation; livebearers give fry and no eggs; a same-sex tank never breeds; the cap holds.

**Merged and related.**

- Merged from passes 1-7: guppy breeding (colour-mixing fry from `EggI`/`EGPC`/`EGDP`) as headline 0.4.0 material, and a breeding-lite variant: at least two well-fed same-species fish for a stretch give a small chance per day-cycle of a juvenile spawning.

Fourteenth-pass update (FIDELITY-15): breeding rules from primary sources that this entry and F-18 lack. Mating: pairs visibly 'do a lot of coupling' before laying (FAQ); laying fails with crowding, poor water or stress, and dense plants help ('Fish like to spawn there'); 'fish are much more likely to mate when the aquarium light is off' (@2084320). Eggs: they die in bad water, are eaten by other fish including the parents (STR# 7100 'Eaten by Fish'), and are 'Crushed by gravel' if you remove it (STR# 7100, 6001 #28, guide @2188986); dead eggs need no removal ('removed by the filter or … eaten', @2766604); each accessory is flagged a good or bad spawning place (Accessory Maker, @2520920). Hatching: hatchlings must be named or 'all the fish hatched in this group will revert to eggs' (STR# 6001 #21); removing a mating fish warns about 'its love life' (#25). Guppy genetics (JPN catalog `guppy/inheritance.html`, read): autosomal body base colour (grey, albino) and tail colour and pattern (mosaic, grass), a Y-linked body pattern (cobra) and an X-linked body pattern (tuxedo); the page notes AquaZone deliberately simplified real genetics (tail genes on autosomes). Evidence: strings parsed from `aquazone.rez`; guide offsets verified; catalog page read; `AQUAZONE.exe` `frmFishName` 'Naming fish' and `frmEggParentInfo` (strings verified). Change, folded into this entry: a seeded `breedChance(tank)` = base x lamp-off bonus (x2) x plant-density factor x (1 - crowding) x water quality; a 'court' state where the pair swims in tandem; per-tick egg predation by nearby adults, reduced near a good-spawning accessory or dense plants; removing gravel with eggs present shows a caution and loses the clutch; at hatch an Osmium dialog proposes names with defaults filled in, and clutches never revert to eggs (relaxation-toy constraint). The genetics go to F-18's phase 2. Acceptance additions (seeded): lamp off doubles the mating rate; eggs near a good spawning spot survive more often; an X-linked tuxedo passes from father to daughters (carriers) and from mother to sons; a same-sex tank never breeds. Size L, Severity idea, Value 3/5, Risk 4/5; needs F-02 and this entry's prerequisites.

### F-18 Colour morphs from multi-variant packs, and guppy strains from the Deluxe II gp*.rez sets

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** gup addon1's three .REZ blobs hold 28 distinct adult 8g sheets (red, black, white, leopard males; orange and gold females) that collapse to one sheet. The Deluxe II ISO has Updater/Data/gp15000.rez..gp23000.rez (3.5-4.7 MB each, CORS OK) with 10/10/10/8/8 = 46 guppy phenotype families (ids step by 200, each with full ELRA/ELRB +0..+3, AMV#/BMV#, EGPC); FshI carries gene-like numeric fields.

**Evidence.** `web/main.ts:120-133`, `web/main.ts:138-150`, `web/import.ts:65-89`.

**Change.** After B-01, `allAdultSwims(sheets)` returns the max-groups sheets whose area is >= 0.5x the largest; usePack stores them per pack; spawnFish picks one at random and stores `Fish.morph` (index), preserved by saveTank and remapSheetIdx; sheetOf resolves `fishSheets[idx][morph ?? 0]`, so 'Add again' adds variety. Strains phase 1 (after F-01): expose each gp family as its own fish add-on (listing URL = ISO view URL + '#family=15200') and decode only that family's 8 sheets via `fshToSheets(d, {family})`; never decode a whole gp*.rez on install. Phase 2 (after F-17): fry inherit the mother's strain with p 0.5, the father's 0.4, a neighbouring strain 0.1 (seeded).

**Acceptance.** Tests: a synthetic 3-morph pack and a save round-trip; the inheritance distribution over 10000 seeded births within tolerance.

**Merged and related.**

- F-17 (fourteenth pass, FIDELITY-15): guppy genetics from the JPN catalog (autosomal base colour and tail genes, Y-linked cobra, X-linked tuxedo) replace phase 2's 0.5/0.4/0.1 strain inheritance, which does not follow that model: a genome `{ base: [a, a], tail: [t, t], x: [...], y? }` with dominance tables from the catalog, the phenotype choosing among the gp*.rez families.

Fourteenth-pass update (IMPORT-10): a second case this entry does not cover: separate colour-variant packs that ship byte-identical sprite sheets and the same palette, so Finsical draws, for example, 'Discus yellow' and 'Discus blue', or 黒金魚 (black goldfish) and 赤金魚 (red goldfish), as the same fish. The packs differ only in chunks Finsical does not decode, such as per-individual records; the reviewer reads the 32-byte record after each named individual as colour genes (plausible, unverified), and its `drv/rowdup.ts` counts 71 of 159 fish rows that add no look an earlier row does not already give. Verification (`import-verify/hash.mjs`, `allsheets.mjs`): every sheet and image of Discus_blue.fsh equals Discus_yellow.fsh's, and the same holds for 赤金魚 vs 黒金魚; picked sheets are identical for blackangel = marbangel = ブラックエンゼル = M_Angel, for albino = cobra = グッピー1, and for GoldFish = kikin = 赤金魚 = 黒金魚; all of these share one palette (`7e870e88b0`), so any recolouring must come from an index remap or a palette swap. blackangel and marbangel have identical sheets, but 8 of their 9 portrait images differ, so the packs' own portraits show the intended colours and give a reference for deriving the remap (Discus blue and yellow share their portraits too). Change: (1) a research spike with F-01's resource map: identify the 32-byte record's type (this entry suspects FshI gene fields), compare records within one strain family and check the result against the differing angel portraits; (2) if it is a remap, add `applyMorph(sheet, record)` in core/data and store the chosen individual's record on Fish; (3) until then, show 'Looks like <earlier row> in Finsical for now' in the detail pane, driven by a checked-in JSON table of known-identical URLs generated by a script like `drv/allhash.ts`. Acceptance: research, a written mapping of the record verified on at least two strain pairs; feature, vitest for applyMorph on a synthetic sheet and Playwright screenshots of blue and yellow discus that differ. Size L, Severity low, Value 3/5, Risk 3/5.

### F-19 Show the heater, the filter intake and its bubble plume in the tank

Size M · Severity idea · Value 2/5 · Risk 2/5

**Problem.** aquazone.rez has BAPC 1000 (349x980 glass heater, mostly cable; the tube is a ~300-px diagonal), BAPC 400 (76x370 filter intake) and BAPC 410-412 (3 frames of a ~67x73 bubble cluster), plus error strings about 'making the heater visible' and 'showing you the bubbles created by the filter'. The original's filter bubbled audibly.

**Evidence.** `core/sim.ts:367-370` (bubbles only from fish), `web/main.ts:1102-1109`.

**Change.** An equipment layer after the backdrop and before decor: the filter tube hanging from the top-right rim (0.5 scale, ~38x185) with a sim-owned deterministic bubble emitter at its outlet cycling BAPC 410-412 on the sim clock; the heater anchored bottom-left with its cable off the top (try 0.4 scale; 0.5 covers ~47% of the width). Filter off (F-14) stops the plume. Preferences 'Show heater and filter' plus an optional quiet filter hum. Load aquazone.rez lazily (fetchZip/packPut) and draw nothing until it arrives.

**Acceptance.** Tests: emitter bubble count after N ticks with a seed; screenshot check.

Re-verified open at 62b8572 (fourteenth-pass audit): there is no equipment layer and nothing reads BAPC. Correction to the Evidence: the ambient bubbles now rise only from the gravel (`core/sim.ts:413-418`), not from the fish.

### F-20 Per-fish courage: brave fish turn to watch you when you tap the glass

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** The original gave each fish a 'Courage:' value; the box copy says 'Tap on the glass and watch them… watch you!' and some fish were brave while others scattered. Every species ships sheet id+2 with 'front turn' and 'back turn' 8-frame sequences of the fish turning to face the viewer. Finsical makes every fish within 48 px flee alike.

**Evidence.** `core/sim.ts:182-197`, `core/sim.ts:210-227`.

**Change.** `Fish.courage` in 0..1 seeded in addFish (or from FshI once decoded), saved. tap(): courage < 0.5 startles with strength*(1 - courage); a brave fish enters a new state 'look': it steers to ~20 px from the tap, plays the front-turn sequence (id+2, group 0) once, holds facing the glass ~1 s, then drifts. Panic propagation skips brave fish; add 'look' to overviewmodel STATES.

**Acceptance.** Tests (seeded): a courage 0.9 fish near a tap enters 'look' and ends within N px of the tap point; courage 0.1 startles at 90% strength; determinism.

### F-21 (remainder) Offer the 'Missing addons Aquazone.7z' library (988 entries); archive.org's listing links drop a path prefix

Size M · Severity idea · Value 4/5 · Risk 3/5

**Problem.** The main item's 'Missing addons Aquazone.7z' (147 MB) is listed by View Archive with CORS and serves single entries. It holds an English, sorted ITEMS library: 98 .fsh, 172 .plt, 350 .acc (incl. Stone accs and Wood accs), 108 .grv, 50 .bmp backgrounds, 43 .azn, 35 .fd, 12 .med, plus System/*.rez species sets (DS01-15, GP15000-23000, GF01-04, PC*, aw*, ma*, kf), Mekasia fish and toys, 'Mekasia Story.txt', the iMac fish (D-19) and AZ_WAVES.REZ (F-22). Overlap with existing JPN collections is small (plants 6 of 171 stems, gravel 5 of 108, .azn 0); fish overlap 'addon and modded fish.zip'. Catch: 986 of 988 hrefs read '.../Missing addons Aquazone.7z/addons Aquazone/ITEMS/...' but the entry lives at 'Missing addons Aquazone/ITEMS/...'; the short href returns HTTP 200 with 0 bytes, which fetchZip would cache forever and report as 'no pack inside'. Entries take 1-10 s (server-side 7z extraction).

**Evidence.** `web/import.ts:37-60` (Collection), `web/import.ts:65-88`, `web/import.ts:190-281` (listCollection; URL built from u.href at :261-270), `web/import.ts:115-131` (fetchZip persists any 200), `web/import.ts:289-299`, `web/import.ts:1038-1056` (THUMB_PAR).

**Change.** (1) Add `sevenZipRoot?: string` to Collection and DEFAULT_ITEM collections with outer 'Missing addons Aquazone.7z', sevenZipRoot 'Missing addons Aquazone/', and prefix/exts pairs 'addons Aquazone/ITEMS/Plants/' /\.plt$/i, '…/Accessories/' /\.acc$/i (covers Stone and Wood subfolders), '…/Gravel/' /\.grv$/i, '…/Backgrounds/' /\.bmp$/i, and the tanks folder /\.azn$/i (check exact folder names against the listing); fish last, deduped case-insensitively by stem against 'addon and modded fish.zip'. (2) In listCollection when sevenZipRoot is set: `const real = rel.startsWith(root) ? rel : root + rel.slice(rel.indexOf('/') + 1); const url = `${BASE}/${item}/${encodeURIComponent(outer)}/${encodeURIComponent(real)}`;` and use it for `seen`. (3) fetchZip throws when `d.length === 0`, before packPut. (4) THUMB_PAR 1-2 for these collections; label the source 'English library' (U-08).

**Acceptance.** Tests: an import.test.ts fixture of two View Archive rows ('addons Aquazone/ITEMS/Plants/X.plt') yields a URL containing 'Missing%20addons%20Aquazone%2FITEMS%2FPlants%2FX.plt'; fetchZip with an empty 200 rejects without packPut.

**Merged and related.**

- B-44 (fourteenth pass, IMPORT-03): the 17 unreadable JPN accessories (FOSSIL1-3, R_STONE1-2, WOOD1-4 and others) are ISO 9660 directory sectors; intact copies sit in this 7z's Stone and Wood accs, which B-44 serves in their place. If this entry lists the 7z's Accessories folder, hide those 17 JPN rows instead, or the items appear twice.
- F-34 (fourteenth pass, IMPORT-09): the Meka Asia Mule fish (mekasia.zip's mekfish.zip) is on archive.org but never listed; this 7z's Mekasia fish and 'Mekasia Story.txt' overlap it.

Fourteenth-pass audit (62b8572): points (2) and (3) landed with the AZ_WAVES Sounds collection (#166): `Collection.rename` corrects the 7z listing's wrong top folder, and the fetch rejects an empty 200 (`web/import.ts:67-69`, `:191`). Still open: (1) the ITEMS plants, accessories, gravel, backgrounds, tanks and fish collections (reuse `rename` rather than the `sevenZipRoot` field sketched above, as FOLLOW-UPS FU-13 suggests), and (4) THUMB_PAR tuning and the 'English library' source label (U-08). The Acceptance's empty-200 test is covered; the URL fixture test still applies to the new collections.

### F-23 List the JPN egg packs (13 species) and the 26 'Power Updater' zips

Size S · Severity idea · Value 3/5 · Risk 1/5

**Problem.** AQUAZONE 魚/魚単体/魚卵.zip (2.2 MB) holds egg packs for 13 species (カージナルテトラの卵.fsh …; full fish packs plus 20 EggI/EggH/EGPP individuals each), but it is a zip inside the collection zip and is never listed. The same folder has 26 'Power Updater' zips (Angel fish, クラウンローチ, ゼブラ・ダニオ, ハーレークインフィシュ, ブラックエンゼル, Discus, Arowana, guppy breeding sets…); 'AQUAZONE Option ゼブラ・ダニオ.zip' holds ITEMS/ZEBRA.DNA (a full fish pack: tag 'XXXX', ELRA/ELRB x4, FsTI/FsTH) plus C_WENTY.PLT and WORM.FD.

**Evidence.** `web/import.ts:79-83` (JPN fish collection: loose .fsh only), `web/import.ts:90-93` (PACK_EXT), `web/import.ts:309-315`, `web/import.ts:462-471`, `core/data/zip.ts:40-66`.

**Change.** (1) Egg packs: `{section: 'fish', item: JPN_ITEM, outer: JPN_ZIP + '/AQUAZONE (JPN) SET/AQUAZONE 魚/魚単体/魚卵.zip', exts: /\.fsh$/i, deep: true}` (nested mode; one download lists 13 species); list under Fish until F-17, then place a clutch that hatches. (2) Power Updater: `{section: 'fish', item: JPN_ITEM, outer: JPN_ZIP, prefix: 'AQUAZONE (JPN) SET/AQUAZONE 魚/Power Updater/', exts: /\.zip$/i}`; each entry URL serves the zip raw and fetchInnerBlobs' no-fragment path imports every PACK_EXT entry. Accept `.dna` only for this collection and only when its adult sheet hash is not already installed (Arowana.dna duplicates Medaka art, B-11); stray .PLT/.FD entries are ignored by handleImages.

**Acceptance.** Tests (import.test.ts): a loose-mode listing with /\.zip$/ yields one item per zip; importAddon on a synthetic zip holding ITEMS/X.DNA and a .PLT returns the DNA sheets; nested listing of a subfolder of .fsh leaves yields unique names. (derived) As listed: a loose-mode listing with `/\.zip$/` yields one item per zip; `importAddon` on a synthetic zip holding `ITEMS/X.DNA` and a `.PLT` returns the DNA sheets; a nested listing of a subfolder of `.fsh` leaves yields unique names.

**Merged and related.**

- F-34 (fourteenth pass, FIDELITY-08): Zirco Draco and Triloid Null, two of the six main Mekasia fish, exist only in the JPN Power Updater zips, so D-20's Mekasia story chain needs this entry first.

Re-verified open at 62b8572 (fourteenth-pass audit): the JPN fish collection still lists loose `.fsh` only (`web/import.ts:88-89`); there is no 魚卵.zip or Power Updater collection.

### F-25 Show each add-on's Read Me and credits in the detail pane

Size S · Severity idea · Value 2/5 · Risk 1/5

**Problem.** Many archive.org add-on zips carry README text with install notes and modder credits ('addon files README.txt' in goldfish addon and guppy, 'arowana addon files README.txt', three READMEs in updatedAZfiles; the 7z has 'Read me - by Kez/SSR' files). They are discarded.

**Evidence.** `web/import.ts:289-316` (fetchInnerBlobs keeps only PACK_EXT entries), `web/import.ts:590`, `web/import.ts:785-786`.

**Change.** In fetchInnerBlobs' no-fragment branch also collect `*.txt` under 16 KB; decode with UTF-8 `{fatal: true}`, then `TextDecoder('shift_jis')` for JPN items, then `TextDecoder('macintosh')` (90s Mac text; latin1 would mangle curly quotes); return `readme?: string` on the first PackResult. showDetail adds a 'Read Me…' push button next to Play opening a small Osmium window (mountWindow, as the overlay does) with the text in a monospace scrolling well.

**Acceptance.** Test: vitest importAddon on a synthetic zip with a README.txt returns the text.

**Merged and related.**

- F-34 (fourteenth pass, IMPORT-09 and FIDELITY-08): mekasia.zip's mekdocs.zip holds 'Mekasia Story.txt', a 13 KB care guide and backstory, a natural Read Me for the Mekasia items.

### F-26 (remainder) New Tank, Save Tank As… and Open Tank… (start over, back up, share)

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** The whole tank lives in one localStorage key: no backup, no second tank, and emptying it means removing items one by one.

**Evidence.** `web/main.ts:35-55` (SAVE_KEY), `web/main.ts:78-95`.

**Change.** File commands in the native menu and U-14's browser menu. New Tank…: caution alert 'Empty the tank? Your fish and add-ons will be removed.', then an empty v2 save and reload. Save Tank As…: serialize `{v: 2, fish, addons, machine, crt}` as `.finsicaltank` JSON (native: bus op 'saveFile' {name, text} to NSSavePanel; browser: Blob download). Open Tank…: validate with loadTank's checks (S-07), write SAVE_KEY and reload; dropping a .finsicaltank on the tank does the same. Do not reuse .azn (that is importable scenery).

**Acceptance.** Vitest: serialize/parse round trip; reject wrong versions and non-array fish.

**Merged and related.**

- Merged from pass 8 ("Save slots / tank profiles"): multiple save slots in Preferences or a small Tank menu; a versioned export (settings, roster, stable pack provenance and an explicit choice about including local assets) with validate-before-replace, preview and rollback. Build multiple tanks on B-34, not on competing global save keys. New Tank overlaps open PR #127 (Empty Tank).

Fourteenth-pass audit (62b8572): "start over" landed as Tank Overview's Empty Tank with a two-click confirm (PR #127, merged via #162; `web/overview.ts:126-153`), which covers New Tank…. Still open: Save Tank As…, Open Tank…, the `.finsicaltank` export and import, and multiple slots.

Fourteenth-pass update (FIDELITY-13): the Change's "Do not reuse .azn" stands, but .azn was AquaZone's own tank document format, which the "Declined, refuted and corrected" list still calls unverified ('AquaZone saved tanks as .azn documents (F-26): unverified'; that line should read verified, with this evidence). The Open Aquarium dialog filter is 'Tank Files (*.azn)|*.azn' (`exe_strings.txt` lines 3666, 8121, 45594; 'SAMPLE.AZN' at 12291); the guide says your tank files 'have "AZN" file extensions' and must be updated like items (@2529015); starter tanks and the hospital tank are `.azn` files opened with Open Aquarium (@2251276, @2379074); aquariums were never explicitly saved (@2409558). `.finsicaltank` still stands, since Finsical can't write 9003 containers. Correction to the review: the CD's starter tanks carried no fish ('all you have to do is add your fish') and reset the aquarium speed to 1 when first opened, but other `.azn` files do carry fish (B-23: AROWANA ADAM&EVE carries fish sheets), so B-23(a) still applies. Documentation only: Size S, Severity low, Value 2/5, Risk 1/5.

Fifteenth pass: Export/Import Tank via `.fins` JSON
landed with validation, a size guard and a `.bak` backup
(PR #256); New Tank and multiple named tanks remain.

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
- U-39 (fourteenth pass, FIDELITY-04): Tool Bar, the original's floating palette of one-click commands (the Problem's 'Tool Bar' toggle).
- U-39 (fourteenth pass, DELIGHT-15, merged there): a Control Strip on the case, echoing AquaZone's Tool Bar.

Re-verified open at 62b8572 (fourteenth-pass audit): the only presentation options are still the Float and All Desktops toggles (`macos/Finsical.swift:646-669`).

Fifteenth pass: Zen Mode hides all chrome in-page
(PR #217); the desktop widget, ghost, full-screen and screensaver
modes remain.

### F-29 Let Brightness, Contrast and the colour trims work without the CRT effect

Size S · Severity idea · Value 2/5 · Risk 2/5

**Problem.** The whole Picture pane is disabled unless 'Simulate a CRT monitor' is on (and that checkbox lives on another pane). A dimmer or warmer tank is useful on its own; a real monitor's front panel works regardless.

**Evidence.** `web/prefs.ts:107-131` (PANES.picture.offHint), `web/prefs.ts:426-431` (syncEnabled disables every slider), `web/crt.ts:136-141`, `web/app.css:106-110`.

**Change.** A pure `pictureTransfer(cfg): { r: [slope, icpt], g, b }` in crt.ts with K = 0.55 + 0.9*contrast, B = 0.5 + brightness, G_ch = 0.6 + 0.8*gain_ch: slope = K*B*G_ch, icpt = 0.4*(1-K)*B*G_ch (exactly the shader's map; CSS brightness()/contrast() pivot at 0.5 and would not match). main.ts inserts a hidden inline `<svg><filter id="pic" color-interpolation-filters="sRGB"><feComponentTransfer>` with linear funcR/G/B from it; when the CRT is off and settings are non-neutral, `canvas#tank.style.filter = 'url(#pic)'`, else 'none'. Measure WKWebView frame cost at full Retina size first; if slow, apply a 256-entry per-channel LUT to the 320x200 ImageData instead. syncEnabled keeps only zoom and Geometry CRT-only.

**Acceptance.** Tests: pictureTransfer(defaults) is identity within 1e-6 and matches the shader formula on random configs.

Re-verified open at 62b8572 (fourteenth-pass audit): `syncEnabled` still disables every Picture slider when the CRT is off (`web/prefs.ts:526-533`), and there is no `pictureTransfer`.

### F-30 (remainder) Stats: a history graph that survives reopening the window

Size M · Severity idea · Value 2/5 · Risk 2/5

**Problem.** Trend arrows restart when Stats reloads and the tank keeps no history. A small period-style line graph (1-bit, like Mac OS 8's Memory or Energy panels) of water quality and average hunger over the last hour would teach the feeding rhythm.

**Evidence.** `web/stats.ts:49-63` (page-local 90 s history), `web/stats.ts:92-107`, `web/main.ts:385-419`, `core/sim.ts:94` (QUALITY_SEEK, module-private), `core/sim.ts:129`.

**Change.** main.ts keeps a ring of 120 samples (one per 30 s of sim time: {t: tickCount, water, avgHunger}) persisted in SavedTank as `hist` and sent in the state push (<= 120 x 3 numbers). stats.ts draws a 240x48 canvas in an .osm-well: black lines on white, a dotted QUALITY_SEEK line (export it or use B-10's core/tuning.ts), night bands shaded 50% grey from the day phase; trend arrows come from hist so they work immediately.

**Acceptance.** Test: a pure `pushSample(hist, s, max)` helper.

**Merged and related.**

- Overlaps open PR #140 (44x14 1-bit sparklines beside each Stats meter from the window's own history). The persisted tank-side history remains. Related: B-55.

Fourteenth-pass audit (62b8572): PR #140 landed (merged via #162): 44x14 1-bit sparklines beside the Stats meters (`web/statsmodel.ts:155-185`). Still open: the history is still page-local (`web/stats.ts:84-99`), so it restarts whenever Stats reopens; there is no persisted tank-side ring (`hist`) and no larger graph.


### F-31 (remainder) Light dimmer

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

**Merged and related.**

- Related (fourteenth pass): F-38 and F-36 (the light timer's sounds), F-39 (a "Follow the sun" Lighting mode).

Fourteenth-pass audit (62b8572): the Change's first step is done: PR #132's lamp was ported into #161 and reconciled with PR #155's modes into one Lighting model (`core/light.ts:13-28`). Still open: the Brightness slider in the Lighting pane and the moon-phase wording in Stats (the F-08 follow-up).

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

Re-verified open at 62b8572 (fourteenth-pass audit): there is no library UI. Correction to the Problem: a species whose last fish is removed still shows in Overview as its add-on row, just not as a species you can add from or learn about.

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

### F-34 The Meka Asia Mule fish and the English Mekasia letters are on archive.org but never listed, and no letter can be read

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass; with FIDELITY-08's letter reader: Size M · Value 3/5 · Risk 2/5)

**Problem.** mekasia.zip also holds mekfish.zip (Denden.fsh, Mule1.fsh and 'Mule Pair with four mule fry, two eggs.fsh') and mekdocs.zip (the English letters as 8 `.acc` story items, plus 'Mekasia Story.txt', a 13 KB care guide and backstory). COLLECTIONS lists only mekplants.zip and mekaccs.zip, so the Mule is reachable only as the two fish named 'updatedAZfiles', or by dropping Aquazone.rez. Denden is already listed from the JPN bonus zip ('ﾒｶﾃﾞﾝﾃﾞﾝ虫.fsh', byte-identical, sha1 5cafcce0d9). The Mule Pair pack's picked sheet is identical to Mule1's (both hash `fc77ded5fa`, the same as Aquazone.rez), and Finsical has no fry or eggs to show the pair's extra individuals, so listing both would add two rows with the same look. The Japanese Mekasia story items are already listed through the JPN library's Accessories folder ('レドキシンについての考察.acc', '金属魚の共存関係についての考察.acc', '機密文書-c：4656283.acc', '研究は成功か？.acc', 'p777-球体について.acc', 'mule について.acc', and the p512/p767/p777 crystals). Each letter pack's art is an airmail envelope lying on the gravel ('Redxine Letter.acc' decodes to a 140x160 envelope, 'Confidential document.acc' to 3 frames of 91x161), and its AccH resource holds the letter: a Pascal name at 0, a u16 LE text length at 0x20 and the text from 0x22. In the original a letter physically arrived in the tank; today an envelope can be placed but never read. mekasia.zip also holds mekfoods.zip, mekmeds.zip and the six main Mekasia fish only as `.exe` installers; Zun, Ormola and GigaZiga exist as JPN `.fsh`, but Zirco Draco and Triloid Null appear only in the JPN Power Updater zip (F-23).

**Evidence.** `web/import.ts:75-103` (COLLECTIONS; only mekplants and mekaccs, at :78-79). Entries listed from `import/mekasia.zip` (mekfish.zip 1,272,121 B, mekdocs.zip 1,125,796 B; zip listings also checked with Python); `curl` on `.../mekasia.zip/mekfish.zip` and `.../mekasia.zip/mekdocs.zip` returns 200 with those sizes. Picked-sheet hashes from `import-verify/hash.mjs`. Runtime decode in Node with Finsical's `fshToSheets`: Denden 8 sheets (8g x6, 161x220), Mule1 and Mule Pair 8 sheets (8g x8, 110x140); `packImages(Redxine Letter.acc)` gives 83x83, 124x78 and 140x160, the envelope (`import-verify/letter-2-140x160.png` and `fidelity/mek/redxine_sheet.png`, viewed). `rez.py`: AccH 28229, 546 bytes, 'Hello old friend, Our ongoing research…' at 0x22. JPN catalog `mekasia/hint/index.html` (read): Zun spits out P512 under some condition; P512 with Zirco Draco becomes P767 and mail arrives; P767 with Ormola becomes P777 under a tank condition, with mail including one from Dr. Bowers; Triloid Null with P777 brings 'a surprising change'. `AQUAZONE.exe` debug menu 'Throw Up Object', 'P767 Changes', 'Spec Mail 1-10' (strings verified).

**Change.** (1) The Mule (IMPORT-09): append `{ section: 'fish', outer: 'mekasia.zip/mekfish.zip', exts: /(^|\/)Mule1\.fsh$/i }`, Mule1 only (FIDELITY-08's `/\.fsh$/i` would also list the look-alike Mule Pair and the duplicate Denden). This adds one 1.27 MB fetch to the first listing, which fetchZip persists (P-05 covers incremental listing). Land it together with B-11's `hide` for 'updatedAZfiles' (IMPORT-06). (2) The letters (FIDELITY-08 phase 1), only together with a way to read them, since without it they are just envelopes: add `{ section: "accessories", outer: "mekasia.zip/mekdocs.zip", exts: /\.acc$/i }`; add `accInfo(d): { name, text } | null` over F-01's reader (AccH, bounded by the length at 0x20, CRLF normalized, Shift-JIS or windows-1252 as in F-02's decode rule), so the Japanese letters read too; add a pure `decorRect(i, n, w, h)` from `render()`'s even spacing (`web/main.ts:2025-2031`) for hit-testing (share it with F-04's `decorHit`); Option-click on a placed accessory with text opens it in a read-only SimpleText-style Osmium document window (the `showDocWindow` pattern in `web/menubar.ts`, shared later with F-02 and U-21). IMPORT-09 would keep the mekdocs items out and leave them to D-20; decide in the PR. 'Mekasia Story.txt' goes to F-25. (3) Phase 2 is D-20 proper, after F-23: a pure rule table swaps crystal art and drops the next envelope into the tank with the EventEgg jingle when its condition holds.

**Acceptance.** `import.test.ts`: a nested fixture shaped like mekfish.zip lists exactly one row, 'Mule1', under fish; a mekdocs fixture lists the letters under accessories. `fsh.test.ts`: `accInfo` on a synthetic AccH (name, length, CRLF text) returns both, and a truncated one returns null. A unit test for `decorRect`. Playwright: Fish > Mule1 installs a fish named Mule1; installing 'Redxine Letter' places an envelope, and Option-click on it shows text starting 'Hello old friend'.

**Merged and related.**

- Fourteenth pass: IMPORT-09, with FIDELITY-08 merged (FIDELITY-08 was filed against D-20; its phase 2 is D-20's story chain).
- Related: D-20 (the Mekasia letters and story), F-21 (the 7z also holds Mekasia fish and 'Mekasia Story.txt'), F-23 (Zirco Draco and Triloid Null), F-25 (the story text), B-11 (IMPORT-06's `hide` for 'updatedAZfiles'), P-05, F-01 (the reader), F-04 (decor hit-testing).

### F-35 The sound bank's install feedback and Play button give the bubbling loop instead of the game's opening sound

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** bankSounds puts `AZ bubble 9003` (LEAD_ID 9000) first, and install feedback and the Import Add-ons Play button both play a set's first record. At install time the ambient loop starts on the same buffer in the same millisecond, so the feedback only plays the loop at 3x its level (0.4 + 0.8, +9.5 dB; the review said 1.2x) for 1.7 s, and says nothing about the 25 sounds just added. `aqua`, the sound the game plays as an aquarium opens, never plays in the session that installs the bank. Separately, installing a tank preset (.azn, a whole aquarium) plays IntoWaterBig, which sndbank.ts documents as the sound for 'a backdrop, gravel, plant or accessory'.

**Evidence.** `core/data/sndbank.ts:30-58` (the id table; LEAD_ID = 9000, whose comment only asks to avoid leading with a 40 ms tap); `web/main.ts:822` (`audio.playImported(recs[0]!.name)`), then `web/main.ts:823` (startAmbient); `web/import.ts:1009-1018` (the preview plays `snds[0]`); `web/audio.ts:413-417`; `web/main.ts:781-785` (section 'tanks' plays sceneryIn). Runtime (re-run first-run trace): `start dur 1.699 loop:true` and `start dur 1.699 loop:false` 1 ms apart when the bank lands, and no 5.165 s start.

**Change.** (1) Set LEAD_ID to 9001 so `aqua` leads, and update the comment; playImported fades it from 3.4 s to 4 s (FEEDBACK_MAX_S). Optionally let feedback records up to 6 s play in full, since the cap exists for the 205 s song. Update `core/data/sndbank.test.ts:16-23` and `web/import-bank.test.ts:61-62`. (2) Optional (the mapping follows the id table's comment, not a trace of the original): add `TankAudio.aquariumIn()` = `play(named('aqua'), 0.7)`; in handleImages, call it for section 'tanks' instead of sceneryIn(), and keep IntoWaterBig for backgrounds, gravel, plants and accessories.

**Acceptance.** sndbank test: the first record is 'aqua', then ids ascend. audio.test.ts: a live 'tanks' image install starts the aqua buffer, and a 'plants' install starts IntoWaterBig. Playwright first run: the bank install starts a 5.165 s one-shot.

**Merged and related.**

- Fourteenth pass: AUDIO-03.
- Related: F-05 (AUDIO-10's Sounds list plays any record, not just the first), B-19.

### F-36 Unused bank sounds fit existing features: the light timer (TimerOnOff, TimerSet) and caution alerts (pipopa)

Size S · Severity idea · Value 2/5 · Risk 2/5 (fourteenth pass)

**Problem.** README says the bank's timer and dialog sounds have 'no matching feature in Finsical yet', and FOLLOW-UPS lists TimerOnOff, TimerSet and pipopa as unused. Finsical does have a light timer, modelled on AquaZone's 'Lovely Light' timer according to `core/light.ts`, and it shows Mac OS 8 caution alerts; neither makes a sound. PCM analysis of the unused short sounds (re-run): TimerOnOff is a single 0.128 s click at about 3.3 kHz; TimerSet is 0.47 s, a click at 0 to 0.06 s and a softer one at 0.36 to 0.42 s, like a dial; pipopa is 0.248 s, three tones (800 to 500 Hz, a gap, 934 to 1768 Hz), and it ends mid-tone (last sample -31/128, RMS over the last 30 ms about 25 to 27), so played raw it clicks at the end. The sndbank id table records no event for ids 7650, 29727 or 13606, so this mapping is an informed guess.

**Evidence.** `README.md:161-165`; `core/light.ts:1-10` ('Lovely Light' timer, LightMode 'timer'); `web/prefs.ts:569-576` (setLighting posts the whole lighting object); `web/main.ts:154-163` (applyLighting plays only the lamp switch); `web/main.ts:435-445` (the glass-tap caution alert) and `web/welcome.ts:142-150` (the retry caution alert); `core/data/sndbank.ts:30-54`.

**Change.** In `web/audio.ts`: `timerSwitch()` = named('timeronoff') at 0.8; `timerSet()` = named('timerset') at 0.8; `alertBeep()` = named('pipopa') at 0.6, with a per-source `gain.setTargetAtTime(0, t + dur - 0.02, 0.005)` to hide the truncated end. In `web/main.ts`: applyLighting plays timerSwitch() when the mode changes to or from 'timer', and timerSet() when the on or off hour changes; the tank page's caution alerts (the scold, the welcome retry) call alertBeep() when shown, the way Mac OS 8 played SysBeep with a caution alert. Optional, pending someone who knows the original: timerSwitch() when the timer itself switches the light at the set hour. Update the README Sounds table and the FOLLOW-UPS list.

**Acceptance.** audio.test.ts: applying `{mode: 'timer'}` after 'demo' starts the TimerOnOff buffer once; changing `on` starts TimerSet; alertBeep schedules a gain target of 0 before the buffer ends. The lamp switch behaves as before.

**Merged and related.**

- Fourteenth pass: AUDIO-09.
- F-38 (FIDELITY-16, DELIGHT-06) plans the same timer sounds; build the two as one change. Decide there which sound marks the timer's own switch at the set hour (FIDELITY-16 plays the lamp's Switch click, DELIGHT-06 plays TimerOnOff, this entry leaves it optional) and whether pipopa is the caution-alert beep (here) or a confirmation chime (DELIGHT-06).
- B-68 (fourteenth pass, PR #241) reworks the welcome flow and its retry alert; re-check the `web/welcome.ts` call site after it lands.
- Related: F-05 (the Sounds list), F-35, F-31.

### F-37 (remainder) Fish Names: hide the tags under menus and windows, mark sleepers

Size S · Severity nit · Value 2/5 · Risk 1/5 (fourteenth pass; estimated for the remainder)

**Problem.** PR #212 (open) adds Fish Names, AquaZone's Options > Names: the bare N key, Tank > Show/Hide Fish Names in the browser menu bar, a checkmarked native Tank > Fish Names item (no key equivalent, since Cmd-N is New), one tag per fish that follows it and moves under it near the surface, the `finsical:names` setting, and N in Shortcuts and the README. Still open from the two review plans: tags are skipped only for the fish whose Get Info card is open, and are not hidden while a menu, a document window, the import panel or an alert is up (DELIGHT-03 asked for the same conditions as `fishToName`), and sleepers get no " (asleep)" suffix (DELIGHT-03). (The hover tip is hidden while the tags show since the PR's 726e2ab.) Labels stay `f.species` until F-02's FIDELITY-09 slice supplies the FsTH common name, and F-02 the individual's name. With the CRT on, the DOM tags share the Get Info card's unwarped mapping, so B-35 applies.

**Evidence.** PR #212's branch `claude/fish-names` (`726e2ab`): `syncNameTags()` in `web/main.ts` filters out only `infoCard?.fish`, while `fishToName` returns null when `infoCard || importPanel.isOpen || menuOpen() || docOpen() || alertOpen()`; tag labels are `f.species || "Fish"`. Code read only; not run.

**Change.** In `syncNameTags()`, clear the tags under the same conditions that make `fishToName` return null, and append " (asleep)" to a sleeping fish's label. Switch the label source when F-02's names land.

**Acceptance.** (derived) Playwright: with tags on, opening a menu or the import panel hides every `.nametag`, and closing it brings them back; a sleeping fish's tag ends in "(asleep)".

**Merged and related.**

- Fourteenth pass: FIDELITY-03, with DELIGHT-03 merged (the rest is in PR #212, open).
- Related: F-02 (names), B-35 (CRT alignment), D-16 (DELIGHT-03 notes that D-16 proposed the bare N key for Stickies; D-16 should take another key now that Fish Names uses N).

### F-38 The light timer flips the lamp silently, and the game's timer and recovery sounds go unused

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** AquaZone's light is a lamp with a switch and a timer that 'turns the aquarium light on and off automatically' (aquazone.rez LigH 400 'Lovely Light'; guide @2083898). Finsical plays the game's Switch click only when the lamp changes by hand: when timer mode reaches its on or off hour, `syncLight` changes the light with no sound, and changing the hours makes no sound either. The bank's TimerOnOff (id 7650, a 0.128 s tick) and TimerSet (id 29727, a 0.470 s click) are never played (FOLLOW-UPS 'Sound'). FOLLOW-UPS lists 13 game sounds with no feature, and two more have an obvious job (DELIGHT-06): EventTiyu (chiyu, "a fish has recovered", 6.237 s) fits the moment gasping fish recover, and pipopa (0.248 s, three notes) suits small confirmations such as solving the Puzzle.

**Evidence.** `web/main.ts:146-151` (`syncLight`, no sound), `web/main.ts:154-157` (`lampSwitch` only on a lamp change; only the lamp's Switch plays anywhere in `:146-165`), `web/main.ts:2161` (`syncLight` each frame); `core/light.ts:99-105` (`lightAt`), `core/light.ts:41` (`CLOCK_RAMP_MIN` 30: the fade starts exactly at the switch time, so a click there matches the visible change); `core/data/sndbank.ts:36, 40, 52` and `:29-55` (ids 7650 TimerOnOff, 29727 TimerSet, 27034 EventTiyu, 13606 pipopa); `FOLLOW-UPS.md:117-120` (the unused list); `web/starter.ts:20` (the starter set installs AZ_WAVES, so most tanks have these sounds); `web/audio.ts:321-327` (`named()` matches exact names, case-insensitively); `core/sim.ts:120` (`GASP_QUALITY` = 0.45, not exported); `core/sim.ts:312-317` (`changeWater(0.6)` lifts quality from 0.4 to 0.76 in one call). Durations re-measured from `delight/wavs` with Python's wave module (ChangeWater is 4.216 s). Code-verified; no sound played. Found in verification (DELIGHT-06): with a plain "quality above 0.6 plays the jingle" rule, Change Water would fire the 6.2 s jingle on the same frame as its own 4.2 s ChangeWater sound, and a switch time crossed while the page was hidden or the Mac slept would click on return.

**Change.** (1) Timer flips: a pure `timerFlip(prevMinutes, nowMinutes, lighting): "on" | "off" | null` in `core/light.ts` (DELIGHT-06 calls it `timerCrossed(prevMin, nowMin, on, off)`) that reports crossing `on*60` or `off*60` while `mode === "timer"` and the lamp is on, handles the midnight wrap, and returns null for equal on and off hours (always on) and for gaps over a few minutes (FIDELITY-16 suggests about 5, DELIGHT-06 2), so a resumed laptop does not click; also skip the first sample after launch. `syncLight` in `main.ts` keeps the previous sample (ms and minutes) and plays a click on a flip: FIDELITY-16 plays `audio.lampSwitch()`, the Switch the hand-worked lamp makes, while DELIGHT-06 plays TimerOnOff; pick one. (2) `applyLighting` plays `audio.timerSet()` when `on` or `off` changes, but not for a mode or lamp change; FIDELITY-16 also plays `audio.timerOnOff()` when the mode enters or leaves 'timer'. Play by exact name, silently without the bank, and note in `sndbank.ts` that these uses are inferred from the names. The default mode is 'demo', so only people who opted into the timer hear it. (3) Recovery jingle (DELIGHT-06): `recovered()` = `named('eventtiyu')` at gain 0.5; `tickSim` sets a latch while `waterQuality < GASP_QUALITY` (exported from `core/tuning.ts`, beside `QUALITY_SEEK`) and plays `recovered()` once quality has stayed above 0.6 for 150 ticks (5 s, which also clears ChangeWater's own sound), with a 10-minute cooldown. (4) Optional: `chime()` = `named('pipopa')` for small confirmations such as the Puzzle (F-36 wants pipopa as the caution-alert beep instead). Update README's Sounds table and FOLLOW-UPS' unused list.

**Acceptance.** `light.test.ts`: 21:59 to 22:00 with off = 22 returns 'off'; 23:59 to 00:01 with off = 0 fires; no flip within any other minute; equal hours, the launch sample and a gap over the chosen limit (DELIGHT-06 tests 3 minutes against its 2-minute limit, FIDELITY-16 tests 6 hours) return null. `audio.test.ts` with the fake AudioContext: `timerOnOff` and `timerSet` play their exact names; `timerSet` plays TimerSet once per hour change and nothing for a mode-only change; a recovery plays EventTiyu once, 5 s after the water clears; a Change Water followed by 4 s of ticks has not played it yet; a second dip within 10 minutes plays nothing.

**Merged and related.**

- Fourteenth pass: FIDELITY-16, with DELIGHT-06 merged (DELIGHT-06: Size S · Severity idea · Value 3/5 · Risk 1/5).
- F-36 (AUDIO-09) plans the same timer sounds plus pipopa for caution alerts; build them as one change.
- Related: F-13 (a 'recovered' event), F-31 (one Lighting model), F-39 (the sun mode switches the lamp too).

### F-39 Follow the sun: lights on at the real sunrise over the fish's home waters

Size M · Severity idea · Value 3/5 · Risk 1/5 (fourteenth pass)

**Problem.** The light timer uses fixed hours, and the demo cycle lasts 13 minutes. A "Follow the sun over…" mode would switch the lights at the real sunrise and sunset over a place such as the Rio Negro, the Banggai Islands or the Great Barrier Reef. It is relaxing, a little educational, and needs only a short solar formula: longitude gives solar time from UTC, so no time-zone database is needed. Over the Rio Negro, a user in Europe gets a tank lit from noon to midnight.

**Evidence.** `core/light.ts:10` (modes demo, timer and always), `:99-105` (`lightAt` takes local minutes), `:120-131` (`twilightTint`); `web/statsmodel.ts:91-99` (Stats names the next switch only for the timer); `web/prefs.ts:548-650` (Lighting pane); `web/starter.ts:14-16` (starter species banggai, clownfish, neon). Re-run (`delight/sun.mjs`, geometric sunrise with no refraction) for 2026-09-24: Banggai sunrise 21:46 UTC (23:46 in Zurich), sunset 11:46 Zurich; Rio Negro near Manaus 12:00 to 00:00 Zurich; the sun never sets at 69.6°N in June and never rises in December. The sketch prints "09:60", so round before formatting. Found in verification: without the standard -0.833° altitude (refraction plus the solar radius), times run a few minutes off published tables, and 60°N at the December solstice gives 5.51 h instead of about 5.9 h; the proposal's "5.5±0.3 h" test would pin the less accurate formula.

**Change.** In `core/light.ts`, add LightMode 'sun' and `Lighting.place`, validated against `PLACES [{id, name, lat, lon}]`: Rio Negro (Amazon), Banggai Islands, Great Barrier Reef, Lake Malawi, Lake Tanganyika, Okinawa, Red Sea, and Cupertino for fun. Add a pure `sunTimesUtc(dayOfYear, lat, lon)` using the -0.833° standard altitude, returning `{rise, set}` or 'day' or 'night', and `sunLight(ms, place)`, which reuses `phaseAt` with a 40-minute ramp and CLOCK_NIGHT_LIGHT as the floor. `nightFloor` and `twilightTint` learn the mode; `syncLight` passes `now.getTime()` in this mode. Lighting pane: "Follow the sun" in the Lighting pop-up, and an "Over:" pop-up in place of the hour pop-ups. The default place comes from the first fish's species (banggai: Banggai Islands; clownfish: Great Barrier Reef; neon, cardinal, angelfish, discus: Rio Negro). Stats shows, for example, "Day (sunset over the Rio Negro at 00:03)" in local time. The moonbeam keeps working.

**Acceptance.** Vitest: an equinox day at the equator lasts 12.1±0.2 h; 60°N at the December solstice gives 5.9±0.2 h; the polar cases; `sunLight` is 1 an hour after sunrise; `sanitizeLighting` drops unknown places and modes. Playwright: choosing "Follow the sun" shows the place pop-up, and the Stats light line names the place.

**Merged and related.**

- Fourteenth pass: DELIGHT-09.
- Related: F-31 (one Lighting model), F-38 (timer sounds; decide whether the sun's switch clicks too).

Fifteenth pass: declined for now — the solar math needs
no geolocation (longitude only), but picking each species' home
waters is a product call. Entry stays open.

### F-40 Finsical Guide: Apple Guide-style "How do I…?" topics with red coach marks

Size M · Severity idea · Value 3/5 · Risk 2/5 (fourteenth pass)

**Problem.** The tank's main gestures are invisible: food drops only from a 10-px strip above the waterline, any other click taps the glass, Option-click opens Get Info, hovering names a fish, and single keys do the rest. A-05's Balloon Help explains what is under the pointer, not how to do a task. Apple Guide (Mac OS 7.5 to 8.6) taught exactly this: "How do I…?" topics, a red coach mark circling the thing to click, and steps that advance when you do them. Value lowered in verification from 4 to 3: A-05 and U-02's first-run hint already cover part of the same need.

**Evidence.** `web/index.html:16-17` (the feed/tap split is described only in an aria-label); FOLLOW-UPS "Calls you may want to revisit" (a click feeds only in the 10 px air strip); `web/main.ts:284-308`; `web/menubar.ts:315-322` (browser Help menu: Shortcuts and a link to the original); `macos/Finsical.swift:926-931` (native Help opens the README). Neither ANALYSIS nor FOLLOW-UPS mentions Apple Guide or coach marks.

**Change.** Add a pure `web/guide.ts` with TOPICS `{id, question, steps: {text, mark, until}[]}[]`: "How do I feed my fish?" (marks the air strip; until 'fed'), "Who is this fish?" (marks the nearest fish; until 'hovered', then 'info'), "How do I get more fish?" (marks the Tank menu title in the browser; text only in the app, whose menus are not DOM; until 'importOpened'), and "How do I turn off the lights?" (until 'lamp'). An `advance(state, event)` reducer drives them. Add `web/guidewin.ts`: a narrow Osmium window titled "Finsical Guide" with the step text and a right-arrow Next/Done button. Coach marks are red-orange hand-drawn ellipses on a pointer-events:none overlay: 3 seeded, jittered strokes drawn on over 300 ms. `main.ts` emits guide events from existing handlers (`dropFood`, `openInfo`, the fish balloon showing, `applyLighting`, `importPanel.open`). Entry points: Help > Finsical Guide in the browser, and `window.finsical.openGuide` for the native Help menu (a Swift follow-up). Make one first-run offer, not three: whichever of A-05's balloons, U-02's hint and this guide lands first owns the welcome follow-up.

**Acceptance.** Vitest: each topic advances only on its own event and ends in a done state. Playwright: opening "How do I feed my fish?" draws a red mark over the air strip, clicking there advances to the done step, and Esc closes the guide.

**Merged and related.**

- Fourteenth pass: DELIGHT-12.
- Related: A-05 (Balloon Help), U-02 (first-run hint), F-37 (Fish Names, another way to answer "Who is this fish?").

### F-41 A visiting fish of the day from the archive, which you can adopt (opt-in)

Size L · Severity idea · Value 3/5 · Risk 3/5 (fourteenth pass)

**Problem.** Finding the roughly 900 archive.org add-ons means browsing a list. A Tamagotchi-era visitor would make discovery ambient: once a day a fish you don't own swims in from the side, stays a while and leaves, unless you adopt it.

**Evidence.** `web/main.ts:1207-1246` (`downloadAddon`, then `handleSheets`, then `spawnFish`: the only way fish arrive), `web/main.ts:453-470` (`usePack` appends to `fishSheets` and re-deals every round-robin fish's art, so a visitor must stay out of that pool), `web/main.ts:629-644` (`sheetOf`), `web/main.ts:221-236` (`saveTank` saves every fish), `web/import.ts:505-594` (`listAddons` and `fetchAddon`; listings are cached in IndexedDB).

**Change.** Add a pure `web/visitor.ts`: `visitorFor(dateKey, listing, installed)` picks, seeded by the local date, a fish-section item that isn't installed, preferring ones with a cached thumbnail; `visitSchedule(nowMs, lastVisitDay, rand)` times the visit. In `main.ts`, only when visitors are enabled and the fish listing is already cached, fetch the pack with `fetchAddon`. Keep its sheet in a `visitorSheet: Map<Fish, SpriteSheet>` that `sheetOf` checks first, never in `fishSheets`. Spawn the fish at a side wall with a runtime-only `visitor` flag that `saveTank` filters out, and show the balloon "A visitor: <name>". After 15 minutes it swims out through the far wall. Overview lists it as "Visiting" with an Adopt button that calls `installAddon` and removes the visitor. Opt-in only (Tank > Allow Visitors, unchecked by default), because it downloads 100 to 400 KB a day unasked. A visitor does not count toward FISH_CAP and never spawns into a full tank.

**Acceptance.** Vitest: `visitorFor` is deterministic per date and never returns an installed item; a save test shows visitors never persist. Playwright with a cached listing and a fake clock: enabling visitors spawns exactly one visitor, it is missing from the saved roster, and Adopt installs it.

**Merged and related.**

- Fourteenth pass: DELIGHT-17.
- Related: B-14 (sheet binding; a visitor must not disturb it), P-05 (listings).

### F-42 Your own picture as the backdrop, dithered to the Mac's 256 colours

Size M · Severity idea · Value 3/5 · Risk 2/5 (fourteenth pass)

**Problem.** The only backdrops are AquaZone's own. Mac OS 8.5's Desktop Pictures control panel took any picture you dropped in. A family photo or your cat behind the fish, reduced to the Mac's 256-colour system palette with an ordered dither so it matches the pixel art, is a personal and very 90s touch.

**Evidence.** `web/drop.ts:25-60` (drops decode only pack containers, so .png and .jpg files are ignored), `web/import.ts:467-479` (a `local:` record must be a pack, or it throws), `core/data/bmp.ts:17-21` (`isBmp` and `decodeBmp` exist), `web/main.ts:1812-1839` (the `local:` persistence path: `packPut` plus `recordInstall`), `web/main.ts:538-563` (`fitBackdrop` crops to 320x200 nearest-neighbour). A-02 already specifies the Mac 8-bit system palette. Found in verification: FOLLOW-UPS' "backdrops downscale nearest-neighbor" call is for AquaZone's own pixel backdrops; a multi-megapixel photo shrunk nearest-neighbour to 320x200 aliases badly, so photos need a smoothed downscale before the dither.

**Change.** `web/drop.ts` accepts image/png, jpeg, gif and webp files dropped directly (not ones found inside folders). Check the size (20 MB cap) before decoding, then decode with `createImageBitmap`, cover-crop to 320x200 through a canvas with `imageSmoothingQuality = 'high'` (halving steps for large sources; 8000 px cap), and pass the result to a pure `quantizeToMacPalette(rgba, w, h): IndexedImage` in a new `web/depth.ts` shared with A-02 (6x6x6 cube plus ramps, 4x4 Bayer dither). A small `encodeBmp8(img)` that mirrors `decodeBmp` stores the result with `packPut('local:<name>.bmp')`; then `recordInstall({section: 'backgrounds'})` and `handleImages` apply it. `importAddon`'s local branch also accepts `isBmp` data through `decodeBmp`. Remove in Tank Overview deletes it, as it does for dropped packs.

**Acceptance.** Vitest: the quantized image holds only palette indices, and a flat mid grey dithers to about 50/50; `encodeBmp8` round-trips through `decodeBmp`. Playwright: dropping a PNG makes it the backdrop, it survives a reload, and a fine checkerboard photo downscales without moiré (the mean of the result stays within 10% of the source mean).

**Merged and related.**

- Fourteenth pass: DELIGHT-18.
- B-13 (fourteenth pass, FIDELITY-06, PR #239, open): a dropped 256-colour BMP becomes the backdrop, stored under a `local:` key, restored at launch by decoding the stored BMP into an images-only result, listed in Tank Overview and deleted by Remove. That covers this entry's `importAddon` local-branch step and the storage path; build the photo decode, smoothed downscale, `quantizeToMacPalette` and `encodeBmp8` on top of it.
- Accessory Maker lite (FIDELITY-06's phase 2, recorded here with the
  photos): a small index-0-keyed BMP dropped on the tank becomes a
  still accessory, and `Name1.bmp` to `Name10.bmp` an animated one, the
  original's 10 cells. It reuses the same `local:` BMP path.
- Related: A-02 (the Mac 8-bit system palette; share `web/depth.ts`).

## Delight and quirky ideas (open)

Done this pass and removed from this list: D-07 (ninth pass); D-08
(PR #192, twelfth pass). Fourteenth-pass IDs implemented by this
pass's PRs: D-40 (PR #242) and D-41 (PR #211); only their optional
remainders are listed below.

### D-01 (remainder) Fish rest at night: slower, lower, tails barely moving, woken by a tap

Size S · Severity idea · Value 3/5 · Risk 2/5

**Problem.** Night only darkens the overlay; fish swim exactly as by day. Real fish settle low and barely fin. Only meaningful once B-09/F-08 give the cycle a real night.

**Evidence.** `core/sim.ts:182-197`, `core/sim.ts:248-371` (tickFish never reads light), `core/sim.ts:367-370` (bubbles), `core/sim.ts:378-393` (decide/bandY), `web/main.ts:399-401`, `web/main.ts:1016-1025`, `web/overviewmodel.ts:44-47`.

**Change.** Narrowed in the fourteenth pass: PR #128 (merged via #161) built sleep as a real `sleep` FishState instead of this entry's derived flag, so the original plan's speed cap (cruise*0.3), re-decide every MOVE_TICKS*3, bandY in the lowest quarter (maxY-40..maxY-8), `asleep: true` in postState and Overview's 'Sleeping' are done or superseded. What remains: (1) Resting place (SIM-05): in the sleep branch, bed each fish with its belly on the pellet line and a small per-fish offset, `bed = h - BOTTOM_PAD - halfH(f) - (mix(id) % 7)`, clamped to room() (use V-04's `floorY` once it exists). (2) Tail rate (SIM-05, replaces the original animFrame x0.25): add a pure `tailRate(f)` to `core/pose.ts` that returns about 0.025 frames per tick for `f.state === "sleep"` and today's `0.1 + speed * 0.08` otherwise, and use it in `animFrame`. (3) A watched tank stays awake: a tap already wakes a sleeper; add `Fish.wakeUntil` (default 0), set to `tickCount + 30*60` by propagated panic and pointer activity over the tank, and keep a fish awake while `tickCount < f.wakeUntil`. (4) Bubble chance x0.3 while asleep. The optional 3x3 pixel 'z' rising every ~8 s from one sleeper moved to D-24 (DELIGHT-07).

**Acceptance.** Tests: a fish with halfH 30 and scale 1 sleeps with `y + 30 <= 188 + 1e-9` (tightens 'a big fish sleeps inside its room', `sim.test.ts:506`); a fish without extents sleeps within 12 px of the floor; two sleepers with different ids rest at different y; `tailRate` of a sleeper is below a third of a cruising fish's; with (3), pointer activity keeps fish awake for 30 s below `SLEEP_LIGHT`; determinism holds. Harness check: sleepers no longer share one row. The original night-versus-day behaviour (settling low, waking on a tap, waking for food when peckish) landed with #128's sleep tests (`core/sim.test.ts:460-510`).

**Merged and related.**

- Follow-up from this pass: gate sleep on `light < 0.5`, not the review's original `< 0.45` (the Change above already says 0.5). PR #155 (open) holds clock-mode nights at exactly `CLOCK_NIGHT_LIGHT = 0.45` (`core/light.ts`), so a strict `< 0.45` would never fire in timer mode; 0.5 also matches Stats' Day/Night split.
- Planned for PR #155 but not included.
- Overlaps open PR #128 (a real `sleep` state: after the tank has seen daylight once, fish settle on the gravel below the dusk threshold with a barely-there stroke, ignore food and wake at dawn or on a knock; exported `SLEEP_LIGHT`/`WAKE_LIGHT`; a `seenDay` latch). If #128 merges instead, check its thresholds against the 0.45 clock floor too.
- Merged from passes 1-7 (moonlight leftovers): keep sparkles visible at night and darken sleeping fish sprites slightly. Night glow is V-23.
- Fourteenth pass: SIM-05 (below); it also extends V-04, which covers the general floor-versus-gravel mismatch.
- Fourteenth pass: DELIGHT-07 (fish mood balloons: tiny pictograms for startle, curiosity, eating and sleep, including this entry's rising 'z') is filed as D-24.
- Fourteenth pass: SIM-03 (fish never sleep when the tank opens after dark or with the lamp saved off, and every fish sleeps and wakes on the same tick) is filed as B-66 (PR #214).

Fourteenth-pass audit (62b8572): the core landed. PR #128 (merged via #161) added FishState 'sleep' (`core/sim.ts:10`): `SLEEP_LIGHT` = `DUSK_LIGHT` 0.5, above `CLOCK_NIGHT_LIGHT` 0.45 (pinned by `core/sim.test.ts:486`, so the 0.45 follow-up above is resolved), `WAKE_LIGHT` 0.6 and a `seenDay` latch (`core/sim.ts:214-219`, `:249`, `:362`); fish settle on the gravel, ignore food unless peckish, and wake at dawn, on a knock or for food (`core/sim.ts:433-466`); Overview shows 'Sleeping' (`web/overviewmodel.ts:53`); tests at `core/sim.test.ts:460-510`; CHANGELOG.md:52-53. Still open: the Change above (resting depth and tail rate, a watched tank staying awake, fewer bubbles while asleep). Of the moonlight leftovers, darker sleeping sprites belong with V-23 (not checked this pass), and sparkles stay hidden at night by design (`web/water.ts` `sunFactor`).

Fourteenth-pass update (SIM-05): sleepers all rest on one row, deep in the gravel, with tails still beating at half speed (severity low, Value 3/5, Risk 1/5). Every sleeper aims for the same line, y = h - BOTTOM_PAD - 4 = 184, limited only by room(), so a tank of sleepers lies on one ruler-straight row, small fish sit deep inside the gravel art, and big fish rest at room()'s lowest point with their painted belly on the tank's bottom row all night. The tail-wag rate has a floor of 0.1 frames per tick, so a sleeper's tail still beats at about 3 frames/s, roughly half its cruising rate; this entry's "tails barely moving" was not built. Evidence: `core/sim.ts:457-459` (one floor line for every fish; sleep speed max(speed x 0.98, cruise x 0.04)), `:768-775` (room y1 = h - max(12, 0.8 x halfH)), `web/main.ts:1861-1870` (animFrame rate `0.1 + speed * 0.08` per tick). Runtime (instrumented copy of main in the harness, stocked tank, lamp off, 25 s; the verifier's `sim-verify/shot5.mjs` with a raw 320x200 canvas capture, `tank-asleep-x3.png`): banggai, clownfish and neon all rest at y = 184.0 at speed 0.055 to 0.071; the gravel top is near y 148, so all three lie about 36 px into the gravel art, and the banggai's painted body reaches the canvas's bottom row. The belly position itself follows the documented EDGE_KEEP call (FOLLOW-UPS 'Calls you may want to revisit', pinned by `sim.test.ts:506`), so it is not a separate bug, only more visible because a sleeper stays there all night. V-04 covers the general floor mismatch; this sleep-specific part can land first. Its Change and Acceptance are now items (1) and (2) above.

### D-03 (remainder) Schooling for small same-species fish, and separation so fish don't stack on a pellet

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** Five neon tetras wander as unrelated individuals, and several fish chasing one pellet are drawn on top of each other.

**Evidence.** `core/sim.ts:205-227` (only panic propagation reads other fish), `core/sim.ts:289-297` (every seeker targets the exact pellet), `core/sim.ts:378-393`, `web/main.ts:83-89`, `web/main.ts:138-150`.

**Change.** Narrowed in the fourteenth pass: #112 landed schooling keyed on `f.species` (`SCHOOL_PULL`, `SCHOOL_RADIUS`), which replaced this entry's spawn-time `schooling` flag (saved in the saveTank whitelist, set when max(cellW, cellH) < 70 or the common name matched /tetra|neon|rasbora|cardinal|danio|guppy|molly|pencil/i) and its follower numbers (probability 0.75, leader.tx +/- 15, leader.ty +/- 8, bandY = leader.bandY, with >= 3 fish sharing f.pack). What remains is alignment and separation. Alignment (SIM-06): leader-follower targeting in `decide()`. The lowest-id fish of a species leads and wanders normally. With probability SCHOOL_PULL, each other member takes the leader's destination spread by SCHOOL_RADIUS (`tx = lead.tx +/- R`, `ty = lead.ty +/- R/2`, clamped to room() and the gasp ceiling), so the school heads the same way. When the leader is removed, the next id leads. Begging fish still don't follow. Consider skipping a leader that is seeking, asleep or startled (its tx is then a pellet or stale). Separation in drift/seek: for each neighbour within 0.6*(halfW_a + halfW_b) (fixed radius until B-01's extents), nudge heading away by up to TURN_RATE/2 (O(n^2), fine below 50 fish). Seekers offset their target by a per-fish angle around the pellet. Use only this.rand().

**Acceptance.** Alignment: 6 same-species fish, seeded, 30000 ticks: close pairs face the same way on at least 62% of pair-ticks (main 47%), the mean nearest-neighbour distance is no larger than on main, and rolls per fish-minute don't rise; 'same-species fish drift closer than strangers', 'starter fish don't school' and the determinism test pass. Separation: after a feeding no two centres stay closer than 4 px for > 10 ticks; a lone schooling fish behaves as today; determinism. (The original cohesion test, schooled fish ending closer than unschooled ones, landed with #112 as 'same-species fish drift closer than strangers'.)

**Merged and related.**

- Schooling overlaps open PR #112 (`decide()` sometimes anchors a wander target near a same-species schoolmate, x-scatter ±42 px, half that vertically). The separation half is new; mind P-20's O(n²) budget.
- Fourteenth pass: SIM-06 (below).

Fourteenth-pass audit (62b8572): #112's schooling landed: `SCHOOL_PULL` 0.6 and `SCHOOL_RADIUS` 42 anchor a same-species wander on a random mate's current position (`core/sim.ts:179-185`, `:696-715`); starter fish share species "" and don't school, and a begging fish doesn't follow. Still open: alignment (SIM-06, below) and separation. Seekers still target the exact pellet (`core/sim.ts:509`, `f.tx = food.x; f.ty = food.y`), and fish have no neighbour push.

Fourteenth-pass update (SIM-06): schools cluster but mill, and close schoolmates face opposite ways half the time (severity low, Size S, Value 3/5, Risk 2/5). #112 anchors 60% of same-species wanders on a random mate's current position, plus or minus 42 px. That tightens groups, but each fish aims at where a mate is, not where it is going, so neighbours face random ways and cross each other head-on; the group reads as a jostling cloud rather than a school travelling together. Evidence: `core/sim.ts:696-713` (anchor = `m.x`/`m.y` +/- SCHOOL_RADIUS). Runtime, headless (`sim-verify/v6.ts`, 6 fish, 3 seeds, 15 min each after a 100 s settle): same species gives a mean nearest-neighbour distance of 37.1 px, close pairs (under 50 px) facing the same way 47% of the time, and 33 head-on crossings per minute; six different species give 52.2 px, 50% and 12 per minute. So schooling adds cohesion but no alignment, and it roughly triples head-on crossings. The prototype `sim/patches/school.diff` (leader-follower) gives 33.7 px, 68% aligned, 28 crossings per minute, and rolls drop from 12.6 to 10.4 per fish-minute; all 68 sim tests pass on a copy. Its plan is now the alignment half of the Change and Acceptance above.

### D-04 Clickable case hardware: floppy slot imports, brightness knob, power button, CD slot, speakers

Size M · Severity idea · Value 4/5 · Risk 2/5

**Problem.** The art shows real controls, but every press on the case drags the window. Measured viewBox rects (overlaid on the PNGs and verified): Plus floppy bezel ~{x:388, y:703, w:359, h:79}, Plus brightness sun ~{x:85, y:965, w:50, h:50}, Plus badge ~{x:74, y:712, w:236, h:53}; iMac Bondi power ~{x:985, y:885, w:46, h:46}, CD slot ~{x:569, y:862, w:371, h:55}, speakers ~{x:301, y:839, w:170, h:170} and {x:1042, y:839, w:170, h:170}, Apple logo ~{x:645, y:5, w:55, h:45}.

**Evidence.** `web/machines.ts:27-45`, `web/machines.ts:62-104`, `web/main.ts:735-764`, `web/main.ts:776-788` (drag handler already skips buttons at :782-784), `web/app.css:28-30` (#machine pointer-events none), `web/machines.test.ts`.

**Change.** `Machine.hotspots?: { x, y, w, h, act: 'import' | 'brightness' | 'power' | 'mute' | 'about' | 'jukebox'; tip: string }[]` in viewBox units, starting with plus and imac-bondi. A `?hotspots` debug query outlines them. layoutMachine positions a new #hotspots layer (z-index above #machine, pointer-events none) whose transparent `<button>` children (pointer-events auto, aria-label and title from tip) use the same s/ox/oy transform. Actions: import opens Import Add-ons with a slot-insert sound (a file dropped on the floppy plays a disk-slide animation before the drop handler); brightness is a vertical drag on cfg.brightness (or F-29's filter when the CRT is off); power sleeps the display (D-06); mute toggles F-05's master gain; about opens A-04; jukebox opens F-05's player; an LED sprite (Performa) can flicker while archive.org fetches are in flight.

**Acceptance.** Test (machines.test.ts): every hotspot lies inside the viewBox and the opaque art, and never intersects `hole`.

**Merged and related.**

- Merged from passes 1-8: machine-case easter eggs (a TAM clock, the Plus programmer's switch) with sounds; an activity LED (an existing case indicator or a Platinum status glyph lights steadily during imports and returns to idle, with a textual equivalent; no flashing and no fake disk sounds).

Re-verified open at 62b8572 (fourteenth-pass audit): no `hotspots` on Machine and no hotspot layer (grep for 'hotspot' finds nothing in web, core or macos). Re-measure the rects in the Problem on the current art: #167, #169, #170 and #173 added or swapped cases.

### D-06 (remainder) CRT power-on bloom, power-off collapse, a degauss wobble and Energy Saver display sleep

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** Switching the tube on or off and changing machines are instant cuts. Real tubes bloom open, collapse to a line and a dot, and Apple monitors 'BWONG' with a rainbow wobble when degaussing.

**Evidence.** `web/crt.ts:24-145` (FRAG), `web/crt.ts:318-354` (setEnabled toggles in one frame), `web/main.ts:665-675`, `web/main.ts:703` (setCrt at launch from the stored pref), `web/main.ts:766-773`, `web/main.ts:1130-1142`, `web/audio.ts:150-156`.

**Change.** (a) Effects: `enum CrtToggleSource { User, Restore }` as setCrt's second parameter (the launch call at main.ts:703 passes Restore, so no degauss on every launch). FRAG gains `uniform float uPower; uniform float uDegauss;`: before the bounds check `float vy = max(uPower*uPower, 0.004); uv.y = (uv.y-0.5)/vy+0.5; uv.x = (uv.x-0.5)/clamp(uPower*4.0,0.02,1.0)+0.5;` and colour x `1.0 + (1.0-uPower)*2.0`; degauss `uv.x += sin(uv.y*40.0 + uTime*60.0) * 0.008 * uDegauss`, conv x (1 + 6*uDegauss), colour x (1 + 0.3*uDegauss) or a per-channel rainbow term. CrtFilter gains powerOn(ms), powerOff(ms): Promise<void> and degauss(), animated from pure exported envelopes `powerCurve(t)` and `degaussAmp(t)` (exponential decay, 0 after ~0.6-1.2 s). setCrt keeps one 'pending' token so a toggle during powerOff cancels and applies the latest state. CSS keyframes on #screen (scaleY 0.01 plus brightness(3)) when the CRT is off. Triggers: machine change, the CRT turning on by the user, Tank > 'Degauss', bare D in the browser. Sound: TankAudio.degauss() synthesizes a 60 ms 55 Hz thump plus a decaying high whine (or 50 Hz sawtooth through a 300 Hz lowpass), played only when `ctx.state === 'running'`. Skip wobble and collapse under prefers-reduced-motion. (b) Energy Saver: Prefs slider 'Sleep the display after 5-60 min / Never'; on idle (no pointer, key or bus intent other than hello/wantThumbs) play powerOff and skip render()/crt.render() while `setInterval(…, 1000/30)` keeps sim.tick() running; any activity wakes with powerOn.

**Acceptance.** Tests: envelope values in crt.test.ts; a manual check with the C key.

**Merged and related.**

- Power-on overlaps open PR #141 (a `uPower` uniform plays a ~450 ms warm-up on every enable, brightness keyed to raster openness, skipped under reduced motion). What remains: power-off collapse, degauss and Energy Saver; reuse #141's uniform rather than adding a second one.
- Merged from passes 1-7: a machine switch could play a brief white flash or the degauss wobble to sell the hardware swap.

Fourteenth-pass audit (62b8572): #141's power-on warm-up landed: a `uPower` uniform (`web/crt.ts:51`, `:122`, `:569`), skipped under reduced motion. Still open: the power-off collapse, the degauss (uniform, sound and menu item) and Energy Saver display sleep; grep finds no degauss or powerOff code. Build them on #141's `uPower` rather than the Change's separate `powerOn(ms)`.

Fifteenth pass: the degauss wobble with synthesized BWONG
and the power-off line collapse landed (PR #227); Energy Saver
display sleep remains.

### D-09 (remainder) Copy Picture and Save 'Picture 1' (optionally as a real PICT)

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** People will want to share their tank. Mac OS named screenshots 'Picture 1', 'Picture 2'.

**Evidence.** `macos/Finsical.swift:578-585` (Edit > Copy maps to NSText.copy; the page has no selection), `web/main.ts:798-800`, `tools/az/pict.py`.

**Change.** Native with the case and CRT: `WKWebView.takeSnapshot(with:)` of the whole window to NSImage, written to NSPasteboard.general ('Copy Picture', Shift-Cmd-C) or saved via NSSavePanel as '~/Desktop/Picture N.png' (first free N), with a shutter click and a one-frame white flash. Without the case: `window.finsical.snapshot(scale = 2)` returns a nearest-neighbor 2x PNG of the 320x200 frame. Browser: bare P uses `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` inside the key gesture, falling back to a download. Optional low-priority PICT v2 writer (0x0011 version, 0x0C00 header, 0x0098 PackBitsRect with an 8-bit clut), round-trip tested through tools/az/pict.py (gives T-16's pict.py a use).

**Acceptance.** (derived) Native: Copy Picture puts a PNG on the pasteboard and Save names files "Picture N" with the first free N; browser: P copies or downloads a 640x400 PNG; the optional PICT round-trips through `tools/az/pict.py`.

**Merged and related.**

- Overlaps open PR #103 (Take a Picture: a 2x nearest-neighbor PNG download in the browser).
- Merged from passes 1-7: "Save Picture with bezel" (composite the case PNG over the tank exactly as on screen, a shareable postcard) and a time-lapse contact sheet (1 fps `toDataURL` for 60 s).
- Fourteenth pass: TANK-16 (the bezel composite, page-side) and DELIGHT-19 (an animated GIF), both below.
- Related: B-70 (TANK-07: a picture taken while paused bakes in the pause scrim; its `renderScene()` split serves TANK-16 too), F-42 (DELIGHT-18's Mac palette, usable for the GIF).

Fourteenth-pass audit (62b8572): the browser half of the plain snapshot landed: the browser menu's Take a Picture (`web/menubar.ts:300`) downloads a 2x nearest-neighbor PNG (`web/main.ts:1482-1497`). The native app has no equivalent. Still open: native Copy/Save Picture with the case, a clipboard copy, the bezel composite, the PICT writer and the contact sheet. Bare P is now Pause (`web/main.ts:1567`), so the browser shortcut needs another key.

Fourteenth-pass update (TANK-16): a page-side plan for the merged "Save Picture with bezel" that works in both shells (the native plan above uses `WKWebView.takeSnapshot`). Take a Picture saves only the bare 640x400 raster, so the machine case, which is what makes a Finsical screenshot recognizable, never appears. Evidence: `web/main.ts:1482-1497` (takePicture draws only the tank canvas), `web/machines.ts:29-46` (Machine has image, vbW/vbH, sx/sy/sw/sh and hole). The case PNGs are same-origin (dist `assets/`, and app:// in the native shell), so a canvas that draws them stays untainted, and their natural sizes equal vbW x vbH (the Plus is 821x1059). Change: in `takePicture`, when `machine.image` is set, (1) choose the composite scale k = 640 / `machine.sw`, so the tank lands at exactly 640x400 (crisp 2x fish pixels, as today; the reviewer's "long side at most 1600 px" gives a non-integer tank scale); (2) make a canvas of vbW*k x vbH*k; (3) fill the hole rect plus SCREENBACK_HOLE_PAD with #050505; (4) draw the tank canvas into (sx, sy, sw, sh) * k with smoothing off; (5) draw the case image over it with smoothing on, so its glass reflections land on the water as they do on screen. The Bare case keeps today's 2x raster. Name the file `finsical-<machine id>-<stamp>.png`. Reuse B-70's `renderScene()` split, so the pause overlay never appears. Acceptance: Playwright on the Plus: the download is 873x1126 (k = 640/602); a pixel in the case area matches the case art, and the screen center matches the tank canvas; on Bare the output is still 640x400.

Fourteenth-pass update (DELIGHT-19): save an animated GIF of the tank (Size M, Value 2/5, Risk 1/5). Take a Picture saves a still PNG, and only in the browser; a tank is about motion, and a few seconds of animated GIF is the most 90s-web way to share it, and it plays everywhere. Evidence: `web/main.ts:1482-1498` (`takePicture`: a 2x PNG through `a.download`), `web/menubar.ts:300` (Take a Picture); `macos/Finsical.swift` has no picture item and no download handling. Change: add a pure `web/gif.ts`, a GIF89a writer with LZW, the NETSCAPE2.0 loop extension and per-frame delays, using one global palette (F-42's Mac palette with Bayer dither, or median cut). After the command, `main.ts` captures 4 s at 10 fps as 320x200 ImageData (`getImageData` on the 2D canvas, which holds the scene with or without the CRT). A "REC" dot shows meanwhile as a DOM element, not drawn into the canvas, so it stays out of the movie. It then encodes "Finsical Movie 1.gif" at 1x or 2x. Browser: Tank > Save Animated GIF…. The app waits for this entry's native save plumbing. Acceptance: Vitest: a 2-frame 4x4 encode has the right structure (header, logical screen descriptor, loop extension, 2 image descriptors, trailer) and decodes to the source indices with a small reference LZW decoder. Playwright: the menu item downloads a .gif that starts with GIF89a and holds 40 frames, none showing the REC dot.

### D-10 Messages in bottles that sink into the tank with tips and trivia

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** Most features are invisible (bare F, C and S, the feed band, Cmd-I); the only in-app guidance is the Stats care advice.

**Evidence.** `web/main.ts:100-111`, `web/main.ts:825-868`, `web/statsmodel.ts:86-116`.

**Change.** New `web/tips.ts`: ~25 tip strings plus dynamic ones from F-02 ('Your angelfish Scott hatched at Franks Fish Farms in 1997'), and a pure scheduler `nextBottleAt(now, lastShown, rng)` (first after 10 min, then every 30-90 min, never while the display sleeps or at night). A render-only bottle in main.ts (original 8x14 sprite with cork and note) sinks with a slight sway and rests on the gravel; pointerdown hit-tests it before the feed/tap branch and opens a small overlay window (.ov + mountWindow); seen tips go to localStorage `finsical:tips-seen` (try/catch) so none repeats until all are shown. Prefs toggle 'Messages in bottles'.

**Acceptance.** Tests: scheduler bounds and no-repeat order.

Thirteenth-pass variant (N-16): the bottle drifts across the tank surface rarely; click it for a help tip.

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

Fifteenth pass: the snail visitor creeps the gravel
(PR #232); algae growth and the sponge ritual remain.

### D-13 Shake the window to stir the tank like a snow globe

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** Grabbing the machine and shaking it should slosh the tank: fish dart, food and bubbles scatter, sand swirls up and settles. It is unverified whether windowDidMove fires continuously during a performDrag.

**Evidence.** `macos/Finsical.swift:306-310` (windowDidMove only saves the frame), `node_modules/osmium-ui/macos/OsmiumWindows.swift:331-342` (performDrag), `core/sim.ts:182-197`, `core/sim.ts:241-245`.

**Change.** Prototype detection first: on the dragWindow op start a 60 Hz Timer sampling `window.frame.origin` until `NSEvent.pressedMouseButtons == 0`; compare with windowDidMove samples and keep whichever is continuous. Detect >= 3 direction reversals above 1500 pt/s within 700 ms, then evaluate `window.finsical.shake(k)` (k 0..1 from peak speed), throttled to one call per 400 ms. Browser: DeviceMotionEvent acceleration > 15 m/s2 on touch (permission on iOS), else bare K for testing. Sim `stir(k)`: startle every fish away from the centre at 3*k, displace food and bubbles by +/-10*k, waterQuality -= 0.03*k, spawn 40*k silt particles {x, y, vx, vy} from the gravel that decelerate and sink within ~6 s (a sim list, deterministic). Render silt as 1-px sand dots; a lowpassed-noise slosh sound.

**Acceptance.** Tests: stir startles every fish; silt returns to 0 within 200 ticks; determinism.

Re-verified open at 62b8572 (fourteenth-pass audit): no `Sim.stir` and no shake detection; `stirSurface` (`web/main.ts:1997`) only ripples the waterline.

### D-14 A fish net to pick up and move fish, and a scoop animation on removal

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** Removing a fish in Overview makes it vanish in one frame, and fish cannot be moved.

**Evidence.** `core/sim.ts:167-172` (removeFish splice), `core/sim.ts:210-227`, `core/sim.ts:248-265`, `web/main.ts:520-521`, `web/overview.ts:105-120`, `web/overviewmodel.ts:44-47`.

**Change.** A new FishState 'held': tickFish returns early (no movement, no clamp); panic propagation skips held fish; `hold(id)`, `moveHeld(x, y)`, `release()` (clamps into bounds, startles with a small speed, adds 6 bubbles). saveTank never saves state, so no serialization change; add 'held' to overviewmodel STATES ('In the net') and statsmodel. main.ts: hit-test with the shared per-frame fish rects (A-05); press-and-hold 300 ms without moving > 3 px on a fish enters net mode, drawing the fish inside an original 20x14 net sprite following the pointer; release plays audio.splash() panned (D-08). Removal: a 1 s render-only scoop (net from the top down to the fish, both rise out with a splash), then sim.removeFish, sweepThumbs and saveTank.

**Acceptance.** Tests: a held fish does not move over 100 ticks; release clamps a fish dropped outside the bounds.

Re-verified open at 62b8572 (fourteenth-pass audit): no 'held' FishState, and `removeFish` still splices at once (`core/sim.ts:293-298`).

### D-15 (remainder) Fish learn your feeding time and gather at the surface before dinner

Size S · Severity idea · Value 2/5 · Risk 2/5

**Problem.** Real fish learn feeding schedules. No feeding history is kept. Hunger saturates in ~20 minutes, so users feed many times per session.

**Evidence.** `web/main.ts:109`, `web/main.ts:794-797`, `web/statsmodel.ts:86-116`.

**Change.** On each feed record at most one entry per 2-hour local window per calendar day (localStorage `finsical:feeds`, 30 days). Pure `web/habit.ts` `habitualFeedMinute(entries)`: the circular mean of the densest +/-45 min cluster when it spans >= 3 distinct days (handles midnight wraparound), else null. From 10 min before to 15 min after, while average hunger > 0.3, set D-02's `sim.lure = {x: TANK.width/2, y: 30}` with lureSince refreshed so curiosity does not fade. Stats advice: 'Your fish expect dinner around 6:30 PM.'

**Acceptance.** Tests: circular mean across 23:50/00:10; thresholds; 10 feeds in one afternoon count as one entry.

**Merged and related.**

- Merged from passes 1-7: "Dinner bell + feeding frenzy" (overuse fouls faster) and "Feeding reminder after about 10 foodless minutes". Express reminders as fish behavior (gathering at the surface), never as notifications: starvation notifications are declined.

Fourteenth-pass audit (62b8572): the merged "reminder as behavior" idea landed as begging: above `BEG_HUNGER` 0.75, hungry fish rise under the surface between meals (`core/sim.ts:684-686`). Still open: the learned schedule (`finsical:feeds`, `web/habit.ts`, the pre-dinner gathering and the Stats line). D-02's planned `sim.lure` is `sim.notice` on main (#138), which draws only the nearest calm fish.

### D-16 Stickies notes on the case bezel

Size S · Severity idea · Value 2/5 · Risk 2/5

**Problem.** Mac OS 7.5-9 users stuck Stickies everywhere; a pale-yellow 'Feed Scott!' note on the monitor bezel is a sweet personal touch.

**Evidence.** `web/main.ts:735-764`, `web/main.ts:776-788` (drag handler already excludes textarea and [contenteditable] at :783-784), `web/machines.ts:37-40`.

**Change.** Tank > New Note (native) or bare N (browser) creates a div with a 12-px title strip (close box, drag handle) and a textarea in Geneva 10, #ffff99 with a 1-px black border; right-click on the strip cycles six Stickies colours. Store notes in viewBox units `{vx, vy, w, h, text, color}[]` in localStorage `finsical:notes`; layoutMachine maps them with the same s/ox/oy so they stay glued across resizes and machine swaps. Clamp rects to the opaque bezel (viewBox bounds minus the hole with a margin, inside the silhouette, since the native window mask clips anything outside the alpha); the lower chin is wide on every machine. Strip drags use pointer capture with stopPropagation.

**Acceptance.** Test: the viewBox-to-px mapping and the clamp.

**Merged and related.**

- Fourteenth pass: DELIGHT-03 (Show Names: AquaZone's Names command puts a name tag on every fish) is filed as F-37; its PR #212 (open) takes the bare N key for Fish Names, so New Note needs another key.

Re-verified open at 62b8572 (fourteenth-pass audit): no notes layer and no bare N (keydown handler at `web/main.ts:1537-1573`).

### D-17 (remainder) New fish splash in from the surface, removed fish swim off

Size M · Severity idea · Value 3/5 · Risk 2/5

**Problem.** New fish simply appear mid-tank and removed ones vanish, so without sounds you often cannot tell what happened.

**Evidence.** `web/main.ts:138-150` (spawn at random mid-tank y at :141-142), `web/main.ts:520-521`, `core/sim.ts:148-172`.

**Change.** Entry: spawnFish sets y = 26 (SURFACE + MARGIN), state 'startle', vy 1.5, speed 1, pushes 6 bubbles at the entry x plus U-03's surface ripple, and shows a 2 s balloon 'Welcome, Samantha' (F-02). Exit: keep sim.removeFish immediate so persistence and Overview stay truthful; before splicing, main.ts copies the fish's current frame, position and facing into render-only `ghosts: {cv, x, y, vx, t}[]` that swim at 2x cruise toward the nearer side wall (no margins), drawn after the fish and dropped off-screen or after 200 frames.

**Acceptance.** Test: a pure `stepGhost()` in `web/ghosts.ts` exits within 200 steps.

**Merged and related.**

- Overlaps open PR #129 (three ballistic droplets where food or a newly installed fish enters at `FOOD_ENTRY_Y`).

Fourteenth-pass audit (62b8572): #129's entry splash landed: `spawnFish` calls `splashAt(x, FOOD_ENTRY_Y, …)` (`web/main.ts:502-504`). Still open: new fish still appear at a random mid-tank y (`y = 30 + random * (H - 90)`, `web/main.ts:490-493`), there is no 'Welcome' balloon, and removed fish still vanish (no `web/ghosts.ts` exit swim).

### D-18 Dock menu, hunger badge, a menu-bar fish and Open at Login

Size M · Severity idea · Value 3/5 · Risk 3/5

**Problem.** The Dock icon does nothing special, a hidden tank has no quick controls, and a desk toy wants to start with the Mac and optionally stay out of the Dock. The state push already carries fish hunger.

**Evidence.** `macos/Finsical.swift:69-71`, `macos/Finsical.swift:329-374` (relay parses state only for `machine`), `macos/Finsical.swift:538-543` (activation policy `.regular`), `macos/Finsical.swift:543-577`, `web/main.ts:398-401`, `web/statsmodel.ts:45-47`.

**Change.** (1) `applicationDockMenu(_:)` returning Feed Fish, Tank Stats, Import Add-ons…, Float Above Other Windows (checkable, U-16), calling `NSApp.activate()` before host.show. (2) postState adds a compact `summary: { hungriest: string | null, hungerLabel, needsFood: boolean }` from statsmodel.deriveStats (HUNGER_FEED 0.55; reuse HUNGER_STARVING rather than duplicating thresholds in Swift); on change set `NSApp.dockTile.badgeLabel = needsFood ? "!" : nil`, behind 'Show Hunger in Dock' (default off); optionally `requestUserAttention(.informationalRequest)` once when all fish are starving and the app is inactive (a nod to the Notification Manager). (3) An NSStatusItem with a 16x16 template fish (drawn at launch, isTemplate) or, better, fish 0's current frame posted every 500 ms over the thumbs path so it swims; its menu: the info line, Feed Fish, Show/Hide Tank, Ghost Mode (F-28), Preferences, Quit. (4) 'Show in Dock' preference toggling `setActivationPolicy(.regular/.accessory)` (the accessory policy drops the main menu, so the status menu must mirror the Tank menu and Preferences). (5) 'Open at Login' via `SMAppService.mainApp.register()/unregister()` behind `if #available(macOS 13, *)`, hidden on 12.

**Acceptance.** Manual tests: toggle the preferences and relaunch; all actions still work.

Re-verified open at 62b8572 (fourteenth-pass audit): `macos/Finsical.swift` has no `applicationDockMenu`, `dockTile`, `NSStatusItem` or `SMAppService`, and the activation policy is fixed at `.regular` (`macos/Finsical.swift:815`).

### D-19 iMac-shaped fish and matching iMac backgrounds for the iMac G3 cases

Size S · Severity idea · Value 3/5 · Risk 1/5

**Problem.** The 7z's 'Spare interesting things/iMacs and Tama fish/' folder has fan-made fish shaped like iMac G3s (Blueberry, Grape, Grey, Ivory, Lime, Orange, Strawberry, Yellow, black; iMacFish-Love/NeonGreen/Strawberry with eggs) and 'Terrible iMac backgrounds' (BONDAI, Blueberry, GRAPE, LIME, Strawberry, Tangeline, WHITE). StrawberryImacs.fsh (1,371,912 B) decodes into 8 sheets: a red translucent iMac with its cable as the tail. Finsical ships Bondi, Strawberry and Flower Power iMac cases.

**Evidence.** `web/machines.ts:27-45`, `web/machines.ts:96-160`, `web/prefs.ts:269-312`, `web/import.ts:65-88`.

**Change.** After F-21, collections for prefix 'addons Aquazone/Spare interesting things/iMacs and Tama fish/' (/\.fsh$/i, fish) and '…/Terrible iMac backgrounds/' (/\.bmp$/i, backgrounds). `companion?: { fish?: string; background?: string }` on Machine: imac-strawberry(-2) -> fish 'StrawberryImacs', background 'Strawberry'; imac-bondi(-2) -> background 'BONDAI' (Blueberry is the nearest fish); Flower Power none. In prefs.ts, when the selected machine has an uninstalled companion (state.addons), one caption line points to Import Add-ons > iMac fish. Easter egg: installing the matching fish plays audio.splash() and drops it in from the surface (D-17).

**Acceptance.** Test: machines.test.ts that every companion names a real listing stem from a fixture list.

Re-verified open at 62b8572 (fourteenth-pass audit): no `companion` on Machine, and neither collection is in COLLECTIONS. Addition: the ibook-tangerine case could pair with the 'Tangeline' background.

### D-20 Mekasia storyline: letters from Dr. Chen arrive as your Meka collection grows

Size M · Severity idea · Value 2/5 · Risk 2/5

**Problem.** aquazone.rez hides a story: FO_H 1000-2000 hold 11 English letters and documents ('Redxine Letter', 'Study of Fish Co-Existence', 'Crystal Study', 'Confidential document-C:4656283', 'Mule'…), STR# 20015-20024 ('A letter from Dr. Chen arrived.', 'A confidential letter from Dr. Bowers arrived.', 'Something arrived from Dr. Chen.'), and AcH* crystal lore (the Omni Crystal deposited by Z.U.N. fish becomes the Radiance Crystal; the Meka Sphere comes alive as 'Mule'). The Mekasia fish (Zun.fsh, Ormola.fsh, ﾒｶﾃﾞﾝﾃﾞﾝ虫.fsh) and accessories are on archive.org.

**Evidence.** `web/import.ts:68-69` (Mekasia plants/accessories already importable).

**Change.** A pure rule table `mekasiaLetters(state) -> letterIds due` (letter 1 after any Mekasia fish has lived one tank-day; letter 2 when a Z.U.N. fish and the Omni Crystal are both in the tank; and so on in FO_H order). An arriving letter plays a short mail chime, adds a Tank Log entry with an envelope icon (F-13), and opens a read-only SimpleText-style Osmium document window in Geneva 10. Read letters persist in SavedTank.

**Acceptance.** Tests: fixtures give the expected letters in order and never repeat one.

**Merged and related.**

- Fourteenth pass: FIDELITY-08 (the English Mekasia letters and the Mule fish are not listed, and no letter can be read) is filed as F-34.
- Fourteenth pass: IMPORT-09 (the Meka Asia Mule fish is on archive.org but never listed) is filed as F-34.

Re-verified open at 62b8572 (fourteenth-pass audit): no letter rules and no letter window. The game's EventEgg sound, which also marks each letter in the Mekasia story, is available for the mail chime (`core/data/sndbank.ts:51`).

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

 Tenth-pass update: the anniversary line is done in PR #182
 (`milestone()` in `web/statsmodel.ts`, Diary row in `web/stats.ts`,
 boundary and wiring tests; tank time advances only while the page is
 visible). Still open: floating messages, per-fish diary stats, and
 save round-trip.

Re-verified open at 62b8572 (fourteenth-pass audit): grep for diary, milestone and anniversary finds nothing on main, and Stats shows only Tank age. Correction to the tenth-pass update: PR #182 has not merged (still no milestone code on main at `e9360a8`), so the anniversary line is open too until it lands.

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

**Merged and related.**

- Fourteenth pass: DELIGHT-07 (below; it also takes over D-01's optional rising 'z').

Re-verified open at 62b8572 (fourteenth-pass audit): no mouth overlay in the fish drawing. Mood now shows as text in the hover tip and Get Info (`web/main.ts:313-364`), not on the sprite.

Fourteenth-pass update (DELIGHT-07): fish mood balloons, tiny pictograms for startle, curiosity, eating and sleep (Size M, Value 3/5, Risk 2/5), an alternative to the 2 px mouth for the same goal. Fish have visible habits (the nearest calm fish drifts to the pointer, fish sleep on the gravel, flinch at taps and eat), but today they can be read only through the hover balloon's state word or Tank Overview; small pictogram balloons that pop up in response would make them readable at a glance. Corrected scope: the proposed begging-pellet glyph (hunger > 0.75) and gasping glyph are hunger and maintenance reminders drawn over the fish, which ANALYSIS declines ("Starvation notifications: this is a relaxation toy, not a Tamagotchi. Reminders, if any, are fish behavior"), and both states already show as behaviour (fish hang under the surface), so they are dropped. Evidence: `core/sim.ts:179-193` (notice constants), `:433-458` (sleep), `:608` (a pellet eaten), `core/sim.ts:242` (public `noticeFish`), `web/main.ts:319-321` (`fishTipLabel`, the only in-tank state display); this entry's mouth and D-01's rising 'z' were never built. Runtime (reviewer's prototype, diff inspected): 9x9 white balloons with 5x5 glyphs read clearly at 1.42x (`p06-emotes-day.png`, inspected); drawn after `drawNight` they glare white (`p07`, inspected), so draw them before it. Change: add `web/emotes.ts` with glyph grids rasterized through `render.gridCanvas`, and a pure `nextEmotes(prev, fish, {tick, noticeId, rand})`. Rules: '!' for 45 ticks when a fish enters startle; '?' once when a fish becomes `sim.noticeFish`; a heart when a fish eats (a runtime-only `Fish.ateAt`, set at `core/sim.ts:608`, never saved); a rising 'z' from one sleeper at a time, about every 8 s (D-01's rate). Nothing for hunger or water quality. Caps: 3 balloons visible, 1 per fish, and 4 s of quiet per fish after each. `render()` calls `drawEmotes` after `drawFish` and before `drawNight`, clamped inside the tank and below the air strip. Add a "Show fish moods" preference; default on is defensible, because every glyph except the 'z' answers your own tap, hover or feed, but the maintainer may prefer off (Design notes: no dashboard over the fish). Acceptance: Vitest for `nextEmotes`: each rule, no glyph for hunger or foul water, the caps, the cooldown, one 'z' at a time, and determinism with a seeded rand. Playwright: a tap beside a fish shows a balloon above it within 200 ms and none after 2 s; with the preference off, none are drawn; a night screenshot shows dimmed balloons.

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

**Merged and related.**

- Fourteenth pass: DELIGHT-01 (flashlight at night: the pointer lights a warm circle of the dark tank) is filed as D-40 (PR #242); a beam that only lights, where this entry's dot lures.

Re-verified open at 62b8572 (fourteenth-pass audit): no held-key lure. Correction: L is now the lamp on main (`web/main.ts:1563`), and F, C, M, P and S are also taken (PR #212, open, takes N); D-02's lure exists as `sim.notice` (#138).

### D-27 Party mode

Size S · Severity idea · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** Silly delight: playing a music add-on keys the fish
tail-wag rate to the AudioContext clock.

**Evidence.** `web/main.ts` `animFrame` (one constant away).

**Change.** While F-05's jukebox plays, scale `animFrame`'s rate by a
beat estimate.

**Acceptance.** (derived) Unit test of the rate mapping; off when no
track plays.

**Merged and related.**

- Fourteenth pass: DELIGHT-10 (fish music: each fish plays a soft pentatonic note when it turns, opt-in) is filed as D-43; it differs from this entry, which keys tail wags to a playing track.

### D-28 Bubble trails

Size S · Severity idea · Value 1/5 · Risk 1/5 (from passes 1-7)

**Problem.** Faint fading trails behind swimming fish.

**Change.** Render-only 1 px dots at past mouth positions fading over
about 20 frames.

**Evidence.** `web/water.ts` (PR #158).

**Acceptance.** (derived) Screenshot; reduced motion disables.

**Merged and related.**

- Fourteenth pass: DELIGHT-11 (glowing plankton at night: fish leave cyan sparkle wakes, and taps leave a ring) is filed as V-23.

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

### D-34 CRT channel buttons: number keys jump between presets

Size S · Severity idea · Value 2/5 · Risk 1/5 (thirteenth pass, N-19)

**Problem.** (delight) The Monitor pane's CRT controls are a TV with
no channel buttons. Number keys 1-4 could jump between named picture
presets like channels — U-29's 'lower all-day baseline' preset slots
in naturally.

**Evidence.** `web/crt.ts` (`sanitizeCrtConfig`, presets),
`web/prefs.ts` Monitor pane, U-29.

**Change.** Bind 1-4 on the tank page to CRT presets (off, sharp,
broadcast, all-day) and name them in the Monitor pane.

### D-35 Fish never pause: rest moves where a calm fish hangs in the water for a few seconds

Size S · Severity idea · Value 3/5 · Risk 2/5 (fourteenth pass)

**Problem.** Every drift decision is a stroke to a new target. The brake never lets speed fall below 0.15 x cruise, and reaching a target (dist < 4) triggers the next decision at once, so fish swim nonstop, like screensaver sprites. Real aquarium fish often hang in place, finning gently, then move off. Pauses would also slow the tail (animFrame is speed-driven) and would let B-33's species Idle scripts play once F-01 lands (B-33 keys them on speed < 0.4 x cruise).

**Evidence.** `core/sim.ts:525-536` (re-decide as soon as phase >= MOVE_TICKS or dist < 4), `:584-588` (brake floor 0.15 x cruise). Runtime, headless (`sim-verify/v7.ts`, 6 fish, 20 min, hunger 0): 0.8% of drift ticks are below 0.1 x cruise (the reviewer measured 1.1% with 8 fish). The reviewer's rough prototype raised that to 18.8% but also raised zigzag from 0.02 to 1.0 per fish-minute, so the real change must steer the resting fish more gently.

**Change.** In `decide()`, when the fish is neither begging nor gasping, with REST_CHANCE of about 0.15 give it a runtime-only `rest` of 45 to 135 ticks (not saved) and set tx/ty to its own position. While `rest > 0` in the drift branch: skip the re-decide gate, ease the heading level (not toward a target), set `speed = max(speed * 0.92, cruise * 0.02)`, and count down. Food, becoming the watcher, a startle or a wall hit clears `rest`. The 0.92 decay stays under the 'no one-tick stops' test's 0.35 x cruise drop. The extra `rand()` draw changes seeded trajectories, so 'never mirrors a wall-side target' (`sim.test.ts:666`) may need a reseed.

**Acceptance.** Seeded test (8 fish, 30 min, hunger 0): 8% to 25% of drift ticks below 0.1 x cruise; every rest lasts 45 to 135 ticks; zigzag at most 0.1 per fish-minute; 'swims calmly' still reports 0 halts and fewer than 18 rolls per fish-minute; a pellet dropped beside a resting hungry fish is eaten.

**Merged and related.**

- Fourteenth pass: SIM-07.
- B-33 (species Idle scripts keyed on speed < 0.4 x cruise; rests let them play once F-01 lands), D-01 (tail rate).

### D-36 Fish flinch when the lamp snaps on (and optionally the tube strikes)

Size S · Severity idea · Value 2/5 · Risk 1/5 (fourteenth pass; DELIGHT-05's tube strike: Value 3/5 · Risk 2/5)

**Problem.** The lamp switch (L, Tank > Lamp) changes the light in one frame, fish don't react, and every sleeping fish wakes on the same tick. Real fish startle when tank lights snap on, which is why aquarium lights ramp, and AquaZone's light is a fluorescent tube (guide `:1684`); real tubes blink before they catch. A small, deterministic flinch would make the L key feel physical, alongside the existing lamp click sound. Correction (DELIGHT-05): the jump is 0.3 to 1.0 only when the schedule is in daylight (always under "Always"; the timer or the demo cycle by day). At a scheduled night the lamp turning on leaves the light at 0.3 and changes nothing visible, so no flinch there, which is correct.

**Evidence.** `core/light.ts:99-105` (lamp off gives 0.3; lamp on gives the mode's light, both instantly; `lightAt` has no transition), `web/main.ts:146-165` (`applyLighting`, `:154-163`, plays `audio.lampSwitch()` and then applies the new light at once through syncLight), `core/sim.ts:351-352` (setLight), `:731-741` (startle), `core/sim.ts:441-446` (every sleeper wakes once light >= WAKE_LIGHT). The demo and timer ramps change light by less than 0.001 per tick (asserted by `sim.test.ts:432-446` for the demo); DELIGHT-05 measured at most about 0.0005 per tick (the demo's 2,000-tick ramp; the timer's is slower), so a threshold on the per-tick rise separates a switch from a dawn. Re-run (`delight/simcheck.ts`): after 1,200 ticks of night, 6 of 6 fish sleep, and `setLight(1)` wakes them on ticks [0,0,0,0,0,0].

**Change.** (1) Flinch (SIM-10): in `Sim.tick()`, keep the previous tick's light (initialised on the first tick, so launch never flinches). If light rises by more than 0.25 in one tick (DELIGHT-05 used 0.3; either separates a switch from a ramp), give every fish that is not already startled a weak startle: strength 0.15 to 0.3 from `this.rand()`, a random side, and `hops = MAX_PANIC_HOPS` so it doesn't cascade. Sleepers wake with the flinch rather than simply waking (DELIGHT-05 gives them k = 0.25 + rand() * 0.2 in a random direction). Dawn ramps wake fish as today. A resume after a long pause across a timer dawn can also trigger it; that is acceptable. (2) Optional tube strike (DELIGHT-05): add a pure `strikeLevel(ms)` to `core/light.ts`: 0 from 0 to 120 ms, 0.6 from 120 to 180 ms, 0 from 180 to 320 ms, then 1. That gives two rises to light within 320 ms, inside WCAG 2.3.1's three flashes per second. `main.ts` sets `strikeAt` when a user action raises the target light by more than 0.3 at once (the lamp turning on, or a Lighting-mode change that switches the lights on), never at launch and never from the timer. `syncLight` then applies floor + (light - floor) * strikeLevel(now - strikeAt), with floor = DEMO_NIGHT_LIGHT. Under reduced motion, a 250 ms linear ramp replaces the blinks. Product call: Design notes forbid "surprise flashes"; this blink answers your own switch, never goes above the target light and becomes a ramp under reduced motion, but whether to ship it is the maintainer's decision.

**Acceptance.** Sim tests: `setLight(0.3)` for 100 ticks, then `setLight(1)`: within 1 tick every non-startled fish is in 'startle' with `startleLen <= 21`; a lamp jump after a night startles every sleeper exactly once with varied `startleLen`; a full demo day (and a demo dawn) triggers no flinch; the first tick after construction with `setLight(1)` triggers none; runs stay deterministic per seed. If the strike ships: Vitest for `strikeLevel`'s sequence, its final value of 1, and at most 2 dark-to-light transitions; Playwright: turning the lamp on in daylight shows at least one dark frame in the first 300 ms (mean luminance) and full light by 400 ms; under emulated reduced motion, brightness never drops after the first frame; launching with the lamp on shows no blink.

**Merged and related.**

- Fourteenth pass: SIM-10, with DELIGHT-05 merged (DELIGHT-05: Size S · Value 3/5 · Risk 2/5).
- D-01 (sleep); B-66 (SIM-03, PR #214, open: per-fish bedtimes and lie-ins replace the `seenDay` latch, so re-check how sleepers wake on a lamp jump once it lands).

### D-37 Releasing the volume slider plays nothing; the classic Sound control panel beeped at the new level

Size S · Severity idea · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** Changing the volume in Preferences gives no audible feedback, so the only way to judge a level is to go back and tap the glass. Classic Mac OS's Sound and Monitors & Sound panels played the alert sound at the new volume when you let go of the slider (from memory, not checked).

**Evidence.** `web/prefs.ts:756-757` posts on 'input' only, through postSound's rAF-coalesced batch (`web/prefs.ts:677-692`), and nothing in the tank plays in response. The Swift relay forwards every op except its own dragWindow and state handling (`macos/Finsical.swift:443-530`), so no native change is needed.

**Change.** Correction to the review's plan: a separate `soundPreview` message sent from 'change' would reach the tank before the rAF-deferred soundConfig carrying the final level, so the beep would play at the old volume. (1) prefs.ts: on the slider's 'change' event (pointer release, keyboard commits) and when Mute is unchecked, flush the pending sound post at once with `preview: true` (`bus.post({ op: 'soundConfig', cfg, preview: true })`). (2) main.ts: after applySoundConfig, call `audio.preview()` when `m.preview === true`. (3) `TankAudio.preview()`: if not muted, play `named('drop') ?? find(['center'])` at gain 0.8 with `retry = false`, starting at currentTime + 0.03 so the 10 ms glide has settled. Keep one tracked source so repeated releases replace each other rather than stack.

**Acceptance.** audio.test.ts: preview() starts exactly one source on the Drop buffer; muted, none starts; two quick previews stop the first. Playwright: dragging the slider in prefs.html posts no preview until release, then exactly one soundConfig with `preview: true`, carrying the final volume.

**Merged and related.**

- Fourteenth pass: AUDIO-08.
- Related: B-73 (AUDIO-04: Import Add-ons previews ignore the Sound pane's volume and mute).

### D-38 A Mac OS 8 Control Strip on the browser tank page

Size M · Severity idea · Value 3/5 · Risk 2/5 (fourteenth pass)

**Problem.** In the browser build, changing the case, the volume or the CRT preset takes a separate Preferences tab. Mac OS 8's Control Strip, a collapsible row of small module buttons in the lower-left corner with pop-up menus, is the era's own answer, and the browser tank page is already a desktop with a menu bar and clock.

**Evidence.** `web/menubar.ts:49-63` (TankMenuActions exposes feed, lamp, mute, pause and CRT with live state), `web/main.ts:1425` (applyMachine), `web/main.ts:1576-1590` (menu bar mounted, browser only). Osmium's `mountPopup` (`node_modules/osmium-ui/src/controls.ts:294-315`) writes the chosen item into the button's text, so it cannot drive icon-only module buttons, and Osmium has no standalone menu renderer (ANALYSIS 'Design notes'; U-15 needs the same).

**Change.** Not a PR candidate until a standalone menu renderer exists. First add one (upstream in osmium-ui, or a local `openMenu(anchor, entries)` reusing `.osm-menu`), shared with U-15's contextual menu. Then add `web/controlstrip.ts`, mounted next to mountTankMenuBar only when `!inNativeShell()` and hover is available: a fixed strip at the bottom-left with an end-cap tab that collapses it (remembered in localStorage `finsical:strip` inside try/catch; collapsed by default when the viewport is too narrow to keep the strip clear of the case) and 22x22 module buttons with 16x16 sprites in icons.ts. Modules: Sound (Mute, then 0/25/50/75/100%), Lamp, Monitor (CRT On/Off plus the four presets), Machine (MACHINES names, via applyMachine) and Tank (Feed, Pause/Resume, Change Water). They call the same functions as TankMenuActions, so no new bus op.

**Acceptance.** Playwright: choosing Machine > iMac G4 swaps the case, Sound > Mute checks Preferences' Mute box in an open prefs.html, the strip is not mounted when `window.webkit.messageHandlers.finsical` exists, and the collapsed state survives a reload.

**Merged and related.**

- Fourteenth pass: UI-20.
- U-15 (the Mac OS 8 contextual menu; shares the standalone menu renderer).

### D-39 FishCam: zoom in on one fish and follow it (Close View)

Size M · Severity idea · Value 3/5 · Risk 2/5 (fourteenth pass; DELIGHT-08's magnifier variant: Size S)

**Problem.** Finsical's tank is 320x200 and fish are 10 to 40 tank px long (a neon is about 12 px), so the authored pixel art (stripes, fin rays, eyes) is hard to appreciate at the default size, and there is no way to look closely or watch one fish up close. The later 3D AquaZone editions were sold on "Use FishCam to zoom in and follow single fish!" (archive.org AquazoneJTM description, fetched and verified) and on zooming and panning through the tank; this comes from those editions, not the 1990s original. Mac OS shipped Close View, a screen magnifier control panel toggled with Command-Option-O, for exactly this. The Get Info card already tracks a chosen fish every frame, and U-25 mentions "an optional follow later" with no design.

**Evidence.** `web/main.ts:2009-2075` (`render()`: backdrop, gravel, decor, light, fish, surface, bubbles, ripples, murk, night, then the PAUSED overlay), `web/main.ts:250` (`tankPoint`), `web/main.ts:403-431` (`layoutInfo` follows a fish), `web/main.ts:1875-1916` (fish are drawn at art scale into the 320x200 canvas), `web/main.ts:2153-2192` (frame). Code-verified; feasible as described. Runtime (DELIGHT-08 reviewer's prototype, diff inspected): the 160x100 region around a fish redrawn at 2x with smoothing off (`p03-follow.png`). Found in verification (code only): the Get Info card (`layoutInfo`), the hover tip and the name tags (DELIGHT-03, F-37) place themselves from unzoomed tank coordinates, so they would detach from their fish under zoom. DELIGHT-08's `zoom: 2 | 3 | 4` type also disagreed with its "Z cycles 2x, 3x, off".

**Change.** FishCam (FIDELITY-12): state `fishCam: { id, zoom: 2 | 3, cx, cy } | null`. `render()` wraps the scene, from the backdrop through the night overlay, in `ctx.save()` and `setTransform(z, 0, 0, z, W/2 - cx*z, H/2 - cy*z)`; `cx, cy` ease 15% per frame toward the fish, clamped so the view stays inside the tank; smoothing stays off. PAUSED and a small blinking 'FISHCAM' label draw untransformed; the CRT pass needs no change. `tankPoint` applies the inverse transform so feeding, tapping and hovering land where you click; `tankToScreen` (FIDELITY-03; PR #212 ships the mapping as `tankMap` in `web/feedzone.ts`) and `layoutInfo` apply it too, or hide the card while zoomed. Enter from a 'Fish Cam' button on the Get Info card (which works in both shells, so the native menu can follow later) and Tank > Fish Cam in the browser menu; leave with Esc, when the fish is removed, or by toggling. Keep repainting while easing even when paused. Alternative pipeline (DELIGHT-08, Close View as a post-process): add `web/closeview.ts` with a pure `closeViewRect(center, zoom, tank)` that returns a source rect clamped to the tank, and `toView`/`fromView` point mappers; `main.ts` keeps `closeView: {zoom: 2 | 3, follow: Fish | null} | null`; after `render()` and before `crt.render()`, copy to an offscreen canvas and draw the source rect over the whole tank with smoothing off. It follows the Get Info card's fish when a card is open (a magnifier button in the card's title strip), otherwise the last hover point, easing 20% per frame. Pointer events go through `fromView`, so feeding, tapping and Option-click land where shown; `layoutInfo`, the hover tip and name tags go through `toView`. Bare Z cycles 2x, 3x and off; Esc exits; the browser Tank menu gets "Close View"; `window.finsical.toggleCloseView` serves a native item on Command-Option-O (a Swift follow-up). Pause and the CRT apply on top. Pick one pipeline; both need the same inverse mapping for input and overlays.

**Acceptance.** Pure `camView(fish, zoom, tank)` (or `closeViewRect`) tests: clamping at the corners and all four edges, the target centred elsewhere, identity at zoom 1; `fromView(toView(p)) = p`. Playwright: with FishCam on, the fish's screen position stays within 20% of the centre over 60 ticks; Z doubles a fish's drawn width (bounding box of non-background pixels); a click while zoomed taps at the inverse-mapped tank point; Option-click on the magnified fish opens Get Info for that fish, and the card sits over the magnified fish; Esc restores the full view (with the sim paused, the unzoomed frame byte for byte).

**Merged and related.**

- Fourteenth pass: FIDELITY-12, with DELIGHT-08 merged (DELIGHT-08: Size S · Value 3/5 · Risk 2/5; it extended U-25's "optional follow later").
- U-25 (select and spotlight a fish; its follow idea), F-37 (Fish Names, PR #212: the tags must follow the zoom).

### D-40 (remainder) Flashlight at night: sleepers turn away from the beam

Size S · Severity idea · Value 2/5 · Risk 1/5 (fourteenth pass; estimated for the remainder)

**Problem.** PR #242 (open) adds the flashlight (DELIGHT-01): at night a mouse or pen hovering the tank lights a warm, soft circle of the dark tank. The beam only lights; the fish never notice it. The review's optional follow-up is still open: a sleeper lit for more than 2 s rolls to face away from the beam without waking.

**Evidence.** PR #242's branch `claude/night-torch` changes only `web/main.ts`, `web/water.ts` (`torchShows`, `torchRadius`, `keepTorch`, `drawTorch`) and tests, so the sim never learns where the beam is. The sleep branch is `core/sim.ts:433-458`.

**Change.** Add `Sim.beam: {x, y, r} | null`, set by `main.ts` from the pointer and `torchRadius` while the torch shows and cleared when it hides. In the sleep branch, a sleeper inside the beam for more than 2 s (60 ticks) rolls to face away from it without waking. No `rand()` draw, so seeded runs are unchanged while no beam is set.

**Acceptance.** (derived) Sim test: a sleeper under a fixed beam faces away after 60 ticks and is still in 'sleep'; with `beam` null, sleepers behave as today.

**Merged and related.**

- Fourteenth pass: DELIGHT-01 (the rest is in PR #242, open).
- D-26 (a laser dot that lures fish; the beam only lights), V-23 (ambient night ideas), D-01 (sleep).

### D-41 (remainder) Pop the bubbles: a "Bubbles popped" line in Stats

Size S · Severity idea · Value 1/5 · Risk 1/5 (fourteenth pass; estimated for the remainder)

**Problem.** PR #211 (open) makes a click on a rising bubble pop it instead of knocking on the glass (DELIGHT-02). The review's optional "Bubbles popped" line in Stats is not in it.

**Evidence.** PR #211's branch `claude/pop-bubbles` changes `core/sim.ts` (`Sim.popBubble`), `web/water.ts` (`bubbleAt`), `web/audio.ts`, `web/main.ts` and `web/prefs.ts`, but no Stats file (`web/stats.ts`, `web/statsmodel.ts`).

**Change.** Count each pop, send the count with the state push, and show a "Bubbles popped" line in Stats.

**Acceptance.** (derived) After three pops, Stats shows "Bubbles popped: 3".

**Merged and related.**

- Fourteenth pass: DELIGHT-02 (the rest is in PR #211, open).

Fifteenth pass: tapping pops a rising bubble with a
lingering ring (PR #248); the 'Bubbles popped' Stats line
remains.

### D-42 The Puzzle desk accessory, played on the live tank

Size S · Severity idea · Value 4/5 · Risk 1/5 (fourteenth pass)

**Problem.** The Apple menu's desk accessories were a signature of the classic Mac, and System 7's 15-tile Puzzle was the most whimsical. The browser build's Finsical menu holds only About and Support. The 320x200 tank divides exactly into sixteen 80x50 tiles, and scrambling the *live* picture, so the fish swim across shuffled tiles, is a delightful twist.

**Evidence.** `web/menubar.ts:272-281` (Finsical menu: About and Support), `macos/Finsical.swift:818-850` (app menu), `web/main.ts:2153-2192` (`render()` and then `crt.render()`, which uploads the same 2D canvas at `web/crt.ts:571`, so post-processing that canvas reaches the CRT too). Runtime (reviewer's prototype, diff inspected): after `render()`, 15 `drawImage` calls redraw the shuffled tiles with a 1-px bevel. `delight/p04-puzzle.png` (inspected) shows fish on scrambled tiles; p05 shows the same through the CRT. Found in verification (code only): while the picture is shuffled, the hover tip, `sim.notice` (the pointer's curiosity target) and an open Get Info card would all name or track the wrong spot, because they use the unshuffled tank point.

**Change.** Add a pure `web/puzzle.ts`: `solved()`, `shuffle(rand, moves = 200)` (random legal moves of the gap from the solved state, repeated until the result is unsolved, so every deal is solvable), `slide(state, pos): state | null`, `isSolved`, `tileAt(x, y)`. Tile 15 is the gap. `main.ts` holds `puzzle: PuzzleState | null`. `frame()` applies `drawPuzzle(ctx, offscreen, state)` after `render()` and before `crt.render()`. Starting the puzzle closes Get Info. While it is active, `fishToName` returns null, name tags hide, `sim.notice` stays null, pointerdown goes straight to `slide` (no feed, tap or Get Info), and bare keys stand down except Esc, which ends the puzzle. The sim keeps running underneath. Solving plays the game's unused 'pipopa' (DELIGHT-06, F-38) and shows a note alert: "You solved it in N moves." Entry points: "Puzzle" in the browser Finsical menu under About, and `window.finsical.togglePuzzle` for a native app-menu item (a Swift follow-up). Optional: Option-click the gap for the original DA's numbers mode.

**Acceptance.** Vitest: 1,000 seeded shuffles are all solvable (permutation parity) and none starts solved; `slide` moves only orthogonal neighbours of the gap. Playwright: starting the puzzle changes the frame; each click on a gap neighbour moves exactly one tile; no hover tip shows while it is active; Esc restores the unshuffled frame; food never drops while it is active.

**Merged and related.**

- Fourteenth pass: DELIGHT-04.
- F-38 (DELIGHT-06: pipopa as a confirmation chime; F-36 wants it as the caution-alert beep instead), F-37 (Fish Names, PR #212: its tags hide while the puzzle is active).

### D-43 Fish music: each fish plays a soft pentatonic note when it turns (opt-in)

Size M · Severity idea · Value 3/5 · Risk 2/5 (fourteenth pass)

**Problem.** The soundscape is the filter loop plus event sounds. An opt-in generative mode, in the spirit of SimTunes and Eno, where fish play gentle notes as they swim would turn the tank into a relaxing desk instrument. It can reuse sim events that already happen about once every six seconds per fish.

**Evidence.** Re-run (`delight/simcheck.ts`, 6 fish, 10 simulated minutes): 59.7 drift-to-turn transitions per minute, about one note a second for a small tank. A 350 ms global gate plus a cap of 3 notes per 2 s keeps even 24 fish (FISH_CAP, `core/tuning.ts:16`) calm. `web/main.ts:2131-2142` (`tickSim` already compares sim state per tick for bubble sounds), `web/audio.ts:56-60` and `:356` (every sound feeds the master gain), `web/prefs.ts:740-754` (the Sound pane's checkboxes). No other entry covers melodic or generative audio.

**Change.** In `audio.ts`, `note(freq, pan, gain)` synthesizes a soft kalimba voice (a triangle wave plus a sine partial at twice the pitch, 5 ms attack, 1.2 s exponential decay) through a StereoPannerNode (WebKit 14.1+, inside the macOS 12 floor) into the master gain, with the same guards as `play()`: nothing while hidden, suspended or muted. Add a pure `web/fishmusic.ts`: `noteFor(y, x, tank, night)` maps depth to a two-octave major pentatonic (high at the surface, low at the gravel, root C4, an octave lower at night) and x to a pan of ±0.7; a `NoteGate` allows notes at least 350 ms apart and at most 3 per 2 s. `tickSim` records each fish's previous state and calls `audio.note` on a drift-to-turn change, plus a grace note when a fish eats, while `soundCfg.music` is on. `SoundConfig` gains `music` (default false, sanitized). The Sound pane gets a "Fish music" checkbox captioned "Each fish plays a note when it turns: higher near the surface." Sleeping fish stay silent.

**Acceptance.** Vitest: `noteFor` maps SURFACE and the floor to the top and bottom scale degrees and always stays in the scale; `NoteGate` spacing; `sanitizeSoundConfig` keeps `music`. `audio.test` with the fake AudioContext: a turn with music on builds one voice connected to the master gain; music off or mute builds none.

**Merged and related.**

- Fourteenth pass: DELIGHT-10.
- D-08 (stereo tank sounds, done in PR #192, twelfth pass): reuse its StereoPannerNode once it is on main. D-27 (party mode keys tail wags to a playing track; different).

### D-44 Talking Alerts in MacinTalk's Bubbles voice, and an alert sound

Size S · Severity idea · Value 3/5 · Risk 2/5 (fourteenth pass)

**Problem.** Finsical's Mac OS 8 alerts (the scold sign, the welcome offer, errors) appear in silence. Mac OS alerts beeped, and later versions could speak them (Speech control panel > Talking Alerts). MacinTalk's novelty voices such as Bubbles, Boing, Trinoids and Zarvox still ship with macOS, and a fish scolding you in the Bubbles voice is a perfectly quirky payoff.

**Evidence.** `web/alert.ts:87` (`showAlert` plays no sound), `web/main.ts:435-446` (the scold alert), `web/prefs.ts:740-754` (Sound pane). Not verified: which voices `speechSynthesis.getVoices()` lists inside a WKWebView on macOS 12 to 15 (headless Chromium on Linux lists none). The alert sound part does not depend on it.

**Change.** Add `web/speech.ts`: a pure `pickVoice(voices, prefer = ['Bubbles', 'Boing', 'Trinoids', 'Zarvox', 'Fred'])` that matches by name and returns null when none is present (the feature then hides itself); a pure `alertPhrase(text, rand)` that adds Talking Alerts-style openers such as "Excuse me!"; and `speak(text)`, which honours mute, volume (`utterance.volume`) and a hidden page. `showAlert` gains an `onShow` hook that plays an alert sound at once (a synthesized two-drop "droplet" through the master gain, or a user sound named 'alert'). With Talking Alerts on, it also speaks the alert after 2 s unless it was dismissed. The Get Info card gets a small speaker button that says "<species>. <mood>. Hunger N percent." `SoundConfig` gains `talk` (default off), with a "Talking alerts" checkbox in Preferences, hidden when `pickVoice` returns null. The alert sound can ship first as its own small PR.

**Acceptance.** Vitest: `pickVoice`'s preference order and its null case. Playwright with a stubbed `window.speechSynthesis`: with Talking Alerts on, the scold alert speaks once after 2 s; it never speaks when off or muted; dismissing within 2 s cancels it. Manual macOS check: WKWebView lists Bubbles.

**Merged and related.**

- Fourteenth pass: DELIGHT-14.
- F-36 (AUDIO-09: the game's pipopa as the caution-alert beep; pick one alert sound), B-68 (PR #241, open, reworks the welcome alert).

### D-45 Tank > Clean Up: the fish line up in a neat grid, like the Finder's Clean Up

Size S · Severity idea · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** Pure whimsy on a Mac joke: the Finder's Clean Up (System 7's Special menu, Mac OS 8's View menu) snaps icons to a grid. Clean Up in the tank would line the fish up in a grid sorted by size, hold them there for a few seconds facing the same way, and then let them drift off.

**Evidence.** `core/sim.ts:674-721` (`decide()` picks every wander target, a single hook point), `core/sim.ts:179-185` (schooling is the only group behaviour), `web/menubar.ts:283-303` (Tank menu). No other entry covers it ("formation" hits are unrelated).

**Change.** Sim: `formation {slots: Map<id, {x, y}>, until} | null` and `cleanUp(order: 'size' | 'name')`. A pure `gridSlots(n, tank, margin)` lays out rows of up to 6 in mid-water, below the air strip and above the gravel, and assigns slots by scale * halfW descending (or by species for 'name'). While `tickCount < until`, `decide()` returns the slot as tx/ty with bandY = slot.y; within 3 px of its slot, a fish slows to cruise * 0.1 and faces right. A tap or a feed dissolves the formation, and sleeping fish get up for roll call. Everything uses `this.rand`, so it stays deterministic. `main.ts`: Tank > Clean Up in the browser menu bar, "Clean Up by Name" with Option held, and `window.finsical.cleanUp` for a native item.

**Acceptance.** Sim test: 600 ticks after `cleanUp`, every fish is within 6 px of its slot and facing +1; slots never overlap given halfW; after `until` the formation clears and targets are unbiased; a tap clears it early.

**Merged and related.**

- Fourteenth pass: DELIGHT-16.

### D-46 Now and then a pixel cat peeks over the rim (a nod to the Neko desk toy)

Size M · Severity idea · Value 2/5 · Risk 2/5 (fourteenth pass)

**Problem.** The oldest aquarium joke is the cat. A rare, original pixel cat that peeks over the rim after a long idle, watches the fish with its eyes following them, dips a paw (the fish scatter, the surface ripples) and bolts when clicked would be a shareable surprise, in the spirit of the classic Neko desk toy.

**Evidence.** `web/water.ts:441` (`drawAir`: the air strip above the waterline is a natural stage), `core/sim.ts:321-331` (`tap(x, y)` startles fish near a point, which serves as the paw), `web/main.ts:1990-2006` (`splashAt` and `disturbSurface`), `web/placeholder.ts` (precedent for original pixel-art sprites), `web/scold.ts` (the project already enjoys a joke).

**Change.** Add `web/neko.ts`: original 24x16 head-and-paws sprites in 4 frames (peek, look left, look right, paw) as `gridCanvas` grids; a pure scheduler `nekoDue(nowMs, lastVisitMs, idleMs, rand)` that fires at most once every 3 h and only after 10 minutes without input; and a state machine: peek (2 s), watch (6 to 10 s, eyes on the nearest fish), paw (`sim.tap(pawX, SURFACE + 6)` plus a surface disturbance), leave. Clicking the cat ends the visit with a synthesized "mrrp". It draws in the air strip, clipped by the tank frame. Add a Preferences checkbox "Surprise visitors". Its default is a product call; off is the safe start under the relaxation-toy constraints.

**Acceptance.** Vitest: the scheduler never fires twice within 3 h or while input is recent. Playwright with a forced trigger: the cat appears, its paw startles a fish within 48 px, and a click sends it away.

**Merged and related.**

- Fourteenth pass: DELIGHT-20.
- D-29 (a photobomb, a different, fish-based surprise).

Fifteenth pass: the paw drops and bats the glass every
few minutes (PR #204); the peeking face, tracking eyes and
bolt-on-click remain.

## Security and robustness (open)

All inputs below are fixed archive.org items or files the user drops,
so these are self-inflicted denial-of-service and crash hardening
rather than reachable attacks; real corpus data is unaffected by every
proposed cap.

Done and removed from this list: S-01 and S-06 (fourteenth pass:
verified fixed on main; S-01's optional leftovers are noted under
S-02).

### S-02 Sprite-stream validation: every frame is allocated before the sheet-size guard, valid blank frames are rejected, and Python keeps truncated streams

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** (1) Despite the 'reject before allocating' comment, all ng*nf frames are decoded and kept before the size check: a crafted 9 MB pack of 16x16 frames of 1500x1500 takes 4.9 s and ~500 MB before returning null, and a 1 MB 8x8x1000² pack is accepted as a 64 Mpx sheet (real packs peak at 18.6 Mpx per pack; the real max per-frame ratio is 0.70 of the guard). (2) One 3-byte run item can legally emit 32768 pixels, so a fully transparent 64x64 frame (ln = 3) fails the 64:1 heuristic: TS drops the whole sheet while Python silently truncates. None of 20,568 real frames trips it (latent). (3) loreto.fsh has three chunks declaring 8x8 frames with data ending after 6, 2 and 2 groups: TS rejects them, emit.py writes 6/2/2-group sheets, so fishPose treats a truncated 8-ring as a 6-ring (right profile from group 3), and a mid-group cut leaves holes in dims (S-01).

**Evidence.** `core/data/fsh.ts:109-129` (decodePixels per frame in the loop; the `sw*sh > 1<<26` guard at :129 runs after), `core/data/fsh.ts:116-121` (per-frame `w*h <= 64*ln + 0x400`), `tools/az/fsh.py:66-91` (iter_frames stops at the first bad record), `tools/az/emit.py:34-52` (ng/nf = max observed g/f), `core/pose.ts:10-22`.

**Change.** Two-pass decoding in both languages (shares P-02's header index). Pass 1 walks frame headers (w, h, ln) with the existing bounds checks and the codec's true bound `w*h <= ceil(ln/3)*0x8000`, computes cw, ch, `sw = cw*nf`, `sh = ch*ng` and the pack total, and rejects before any decodePixels when `sw*sh > 1<<24` (16 Mpx per sheet) or the per-pack total exceeds ~48 Mpx. Pass 2 decodes. One corrupt/truncated-frame policy in both: reject the chunk; Python records `rec['spriteError'] = 'truncated frame g/f'` and emits no 'sprites' record unless `len(frames) == declared_ng * declared_nf`. Port the caps to emit._sprite_sheet.

**Acceptance.** Tests (fsh.test.ts and test_fsh.py via fixtures.build_fsh): a 2-frame 64x64 sheet with a blank second frame decodes to framesPerGroup 2 with dims [[0,0,64,64],[0,1,64,64]]; a stream truncated after group 5 is rejected in both; a crafted 16x16x1500² pack (and a header-only 63x63 bomb) is rejected in < 20 ms with decodePixels called 0 times (spy); existing fixtures unchanged.

**Merged and related.**

- Merged from pass 8 (B04 slice): "FSH checks the atlas budget after allocating individual frames" is point (1) here.
- Contract conflict: open PR #145 keeps truncated `dims` prefixes loadable (emit.py emits them) and cushions absent cells in `drawFish`; this entry makes Python stop emitting truncated streams and TS reject them. Change both sides in one series and update the Design note.
- From S-01 (removed in the fourteenth pass, verified fixed on main): #145 landed through #161, and `checkSheetMeta` (`core/data/azpack.ts:191-217`, called at `:243`) rejects non-integer or zero counts and cells, out-of-order dims, any dim outside [1, cell] and grids larger than the image. Its comment now documents the prefix contract (dims ordered and complete but possibly fewer than groups*framesPerGroup; `frame()` reports absent cells at use time), and FOLLOW-UPS records "One bad sheet rejects a whole `.azpack` (#145)". So this entry's Python change alters a documented contract rather than settling an open one, and S-01's "skip invalid sheets with `console.warn`" is superseded by that recorded call. S-01's optional leftovers: a per-(sheet, group, frame) missing-cell memo so a truncated pack stops paying exception cost per frame (pass 8; PR #153's per-sheet fallback may make it moot), and a `SpriteSheet.frame` guard against 0x0 dims (`core/data/azpack.ts:176` accepts 0, but it is unreachable today: `checkSheetMeta` and `fsh.ts`'s `w > 0 && h > 0` both reject zero dims).

Re-verified open at 62b8572 (fourteenth-pass audit): `decodePixels` still runs per frame inside the loop (`core/data/fsh.ts:121`) before the `sw*sh > 1<<26` guard (`:129`), and the 64:1 heuristic remains (`:120`); Python's `iter_frames` and the emit cap are unchanged.

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

Re-verified open at 62b8572 (fourteenth-pass audit): the inflate limit is still `maxBytes` (`core/data/zip.ts:109-111`), the declared `usize` is compared with the output only after the full inflate (`:118-119`), and no CRC is stored or checked anywhere.

### S-05 snd.ts: crafted resource maps explode, BinHex uses number[] buffers with uncapped RLE, and a 0 Hz rate is accepted

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** A 39 KB fork with 2000 'snd ' type entries x 2000 refs made hasSounds() take 1.1 s at 747 MB and return 4 M records (65536x65536 would be 4.3e9). binhexDecode materializes the file as JS number arrays (~8 bytes per element) and expands 0x90 RLE up to 255x per marker. A rate below 1 Hz yields a WAV that decodeAudioData later rejects with an unclear error.

**Evidence.** `core/data/snd.ts:64-103` (binhexDecode), `core/data/snd.ts:148-189` (sndResources walks every 'snd ' type entry and ref list), `core/data/snd.ts:276-280` (rateHz unvalidated), `tools/az/rsrc.py:150-190`, `web/main.ts:969` (32 MB drop cap).

**Change.** sndResources stops after the first 'snd ' type entry, caps references at 4096 and skips duplicate data offsets. binhexDecode preallocates Uint8Array buffers (vals <= text.length, out <= 3/4 of that) with a de-RLE size pre-pass capped at 64 MB, throwing SndError past the cap. parseSnd throws `SndError('implausible sample rate')` outside [1000, 96000] Hz. Mirror in rsrc.py/snd.py.

**Acceptance.** Tests: the crafted map gives <= 1 resource list in < 20 ms; a BinHex RLE bomb throws quickly; a rate-0 header throws.

**Merged and related.**

- Merged from pass 8 (B04 slice): "BinHex RLE expands without an output cap".
- Fourteenth pass: IMPORT-11 and TOOLING-01 (the same explosion in the newer sound-bank parser, plus quadratic naming; update below).

Fourteenth-pass update (IMPORT-11, TOOLING-01): the explosion this entry describes also sits in code written after it. `bankSounds` in `core/data/sndbank.ts` (#166) walks every `" dns"` type entry and every reference in each, with no cap and no offset dedupe (`core/data/sndbank.ts:81-105`), and `fileSoundRecords` calls it for any pack (`core/data/snd.ts:336-345`). `qualifySoundNames` (`core/data/snd.ts:356-365`) is quadratic for repeated names: each duplicate restarts `while (seen.has(n)) n = name (i++)` from 2, so a bank whose references all share one id (one name from `GAME_SOUND_NAMES`) hangs even with the reference count capped. Both run on the main thread, reached from a drop on the tank (`web/main.ts:1789-1797`, names qualified by `handleSounds` at `web/main.ts:813`), a drop on Import Add-ons (`web/addons.ts:45-55`) and remote add-on blobs (`web/import.ts:487`). The records persist through `sndsMerge` and decode again at every launch (`web/main.ts:1634-1640`), and dropped sounds cannot be listed or removed (B-18), so clearing site data is the only cleanup. Re-run in verification (node drivers bundling the repo's modules): 500 types x 500 references (10 KB) gave 250,000 records in 175 ms; 1000 x 1000 (20 KB) gave 1,000,000 records in 567-695 ms with a 283 MB heap; the IMPORT-11 reviewer's 2000 x 2000 (39 KB) gave 4,000,000 records in 3.9 s with about 1 GB of heap. One type with every reference at id 1000 took 1-7 ms to extract, but `qualifySoundNames` took 357 ms for 2,000 references, 2,148 ms for 5,000 and 9,323 ms for 10,000 (last name `CENTER* (10000)`). Not re-run: TOOLING-01's 4000 x 4000 in 78 KB (16 M records, 4 GB RSS), 65,536 same-id references (over 240 s), and its Playwright drop (a 96 KB file, a 5.4 s main-thread block, "8000 sounds imported"). The real `AZ_WAVES.REZ` (1,182,480 bytes) has one type and 25 references with distinct ids and offsets and decodes to 25 records, `AZ bubble 9003` first (verified), so the caps touch no real data; the repo ships no real AZ_WAVES fixture, so tests use the synthesized `sndbank.fixture.ts` banks. PR #210 (open) lands the resource-map half: `bankSounds` and `sndResources` read only the first `'snd '` type entry, yield each payload once however many references share it, and stop at one shared `MAX_FILE_SOUNDS` = 1024 (this entry proposed 4096, TOOLING-01 256; real data holds 25); `qualifySoundNames` resumes each base name's suffix where the last duplicate stopped (output stays "a", "a (2)", "a (3)", and names already in the batch are skipped); `tools/az/rsrc.py` `resources()` mirrors the rules (`MAX_RESOURCES` = 1024), and instead of raising `struct.error` it now stops at a reference list that runs past the end and skips a payload that does. The reviews' acceptance for this half: the crafted 2000 x 2000 bank returns 1 record in under 50 ms; two `" dns"` entries sharing one reference list yield the records once; 70,000 references to one offset return 1 record in under 50 ms; `qualifySoundNames` on 20,000 identical names finishes in under 100 ms and names the last "x (20000)"; the existing `buildBank` naming and order cases are unchanged. Still open here: the BinHex half (`binhexDecode` still builds `number[]` buffers with uncapped 0x90 RLE, `core/data/snd.ts:70`), the sample-rate check (`rateHz` is unvalidated, `core/data/snd.ts:225`) and their mirrors in `rsrc.py`/`snd.py`. Once #210 merges, narrow the Change and Acceptance to those.

### S-07 (remainder) Saved state and bus messages are trusted: bad fields freeze fish, break the restore chain or get persisted

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** A saved fish with cruise null or 0 (JSON turns NaN into null) never moves (`Math.min(null, x) = 0`); a negative cruise swims into a wall; duplicate or huge ids stop nextId increasing; a string hunger becomes NaN. A null addons entry throws at `installed.has(it.url)`, rejecting the chain before remap and reconcile. A non-string `inner` spawns and saves a fish before qualifySoundItemName throws. bus.ts forwards null payloads. Producers are all same-origin, so this needs a buggy client or hand-edited storage.

**Evidence.** `web/main.ts:45-55` (loadTank checks only Array.isArray(addons)), `web/main.ts:73-76` (roster filter validates only x/y), `web/main.ts:333-337`, `web/main.ts:607-615` (remoteInstall validates url and section, not inner; persists the raw item), `web/main.ts:891-900` (restore chain without a terminal catch), `web/import.ts:1237`, `web/bus.ts:36` (forwards any data), `core/sim.ts:148-164` (addFish spreads saved fields).

**Change.** Narrowed in the fourteenth pass: PR #135's `sanitizeSavedFish` already clamps every numeric fish field (the original plan did this inside `Sim.addFish`: cruise in [0.3, 3] defaulting to 1, hunger in [0, 1] defaulting to 0.2, finite heading, facing +/-1, finite speed and vy, bandY in the tank, x/y clamped), so what remains is ids, add-ons, bus data and the chain. A restored fish's id must be a safe non-negative integer not already in use, else nextId. Export `isImportable(x): x is Importable` from import.ts (object; `https://archive.org/` url string; known section; inner a non-empty string of <= 256 chars); remoteInstall rebuilds a clean `{section, inner, url}`; loadTank filters addons with it. bus.ts ignores non-plain-object data. Add a terminal `.catch` to the launch chain. Decide the motion-field reset and the last-good save from the merged notes below.

**Acceptance.** Tests (the original cruise-null case, moving > 20 px in 10 s, now falls to #135's clamp): two saved fish with id 3 get distinct ids; id 1e300 is replaced; isImportable cases in import.test.ts; (derived) a saved `addons` array holding `null` still restores the other add-ons and runs remap and reconcile.

**Merged and related.**

- Merged from pass 8 ("Persisted data needs a validated schema boundary"): extract a versioned parse/restore step that validates each record independently, preserves an intentionally empty roster (B-16), clamps domain values and defines which fields intentionally reset; retain a last-good save; test partially damaged saves and quota-full or unavailable storage. The save omits pellets, RNG state and motion fields, so reloads are not deterministic continuations (a fed pellet vanished on a tested reload).
- Merged from passes 1-7 ("Save/load drops mid-swim fields"): `saveTank()` omits `state`, `phase`, `latch`, `peak`, `tx`, `ty`, `turnDir`, `turnFrom` and `panicHops`, so fish restart a decision cycle from rest and forget an in-progress turn; persist them or document the reset. PR #154 (open) adds runtime-only fields (for example `strokes`); include them in the decision.
- Overlaps open PR #135 (every numeric saved field finite and clamped, `bandY` falls back to the clamped `y`, invalid `sheetIdx`/`pack`/`id` dropped; empty `species` kept as the sim's unbound sentinel). Bus-message validation is T-18.

Fourteenth-pass audit (62b8572): PR #135 landed. `sanitizeSavedFish` clamps every saved numeric fish field (`web/main.ts:172-207`), so the cruise-null freeze, the negative cruise and the string hunger are fixed; `tickCount` and `waterQuality` are clamped too, and an intentionally empty v2 roster is kept (`keepEmpty`). Still open: saved add-on entries are unvalidated (`web/main.ts:99`), so a `null` entry throws in `importPanel.restore` at `installed.has(it.url)` and, with no terminal `.catch` on the launch chain (`web/main.ts:1626-1658`), skips remap and reconcile; remoteInstall still does not check `inner`; bus.ts forwards any payload; duplicate or 1e300 ids are accepted (`core/sim.ts:271-273`); and the motion-field decision and a last-good save are still open.

Sixteenth pass: **the terminal `.catch` is shipped in PR #265** (R-1
of `tmp.md`; see the sixteenth-pass Completed section). The chain now
logs and repaints on failure, and `retryRestores(restoreFailed)` runs
from a `.finally` with its own `try/catch`, so a throw in
`applySceneryChoice`/`remapSheetIdx`/`reconcileFish` can no longer
skip the pack re-fetch that exists to recover from a partial restore.
`web/main.ts` has no test file, so PR #265 carries a documented
verification procedure rather than a red→green test. The rest of this
entry — unvalidated `addons` entries, `inner`, bus payloads, ids, and
the motion-field/last-good-save decision — is untouched and still
open.

### S-08 The Swift bus relay can crash on NaN or Date values and accepts posts from any frame

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** bus.ts posts raw objects; `JSONSerialization.data(withJSONObject:)` raises an Objective-C NSInvalidArgumentException that `try?` cannot catch for NaN, Infinity or NSDate. The first NaN any page posts (a future stat dividing by zero) would crash the app on every state push, and since state persists possibly on every launch. Latent: current producers are finite. The relay does not check `frameInfo.isMainFrame` or the origin, and the splice re-parses large payloads (thumbs data URLs) as JS in every visible client.

**Evidence.** `macos/Finsical.swift:329-405` (JSONSerialization at :376-378, string splice with U+2028 escaping at :390-396), `web/bus.ts:33`, `web/crt.ts:197-205`.

**Change.** Minimal: before :376, `guard JSONSerialization.isValidJSONObject(message.body) else { NSLog("Finsical: dropped non-JSON bus message"); return }`. Better: replace serialize-and-splice with `dest.callAsyncJavaScript("if (!window.__bus) return 'dropped'; window.__bus(m);", arguments: ["m": message.body], in: nil, in: .page) { r in … }` (macOS 11+; removes the U+2028 workaround). Add `guard message.frameInfo.isMainFrame else { return }` at the top of userContentController. Optional: deliver 'thumbs' only to the window that sent wantThumbs.

**Acceptance.** Test from the tank's Web Inspector (T-24): `webkit.messageHandlers.finsical.postMessage({op: 'x', v: NaN})` must not crash.

Re-verified open at 62b8572 (fourteenth-pass audit): the relay still calls `JSONSerialization.data` behind `try?` with no `isValidJSONObject` guard (`macos/Finsical.swift:507`), and `userContentController` (`:443`) never checks `frameInfo.isMainFrame`.

### S-09 (remainder) Dev dependencies carry advisories, including one against the esbuild dev server

Size S · Severity low · Value 2/5 · Risk 2/5

**Problem.** `npm audit` reports 5 advisories (1 critical, 1 high, 3 moderate): esbuild <= 0.24.2 GHSA-67mh-4wv8-2f99 (any website a developer visits can read responses from `npm run dev`'s server, which may serve web/pack/ with the user's extracted AquaZone data), vite <= 6.4.2 (high), vitest critical GHSA-5xrq-8626-4rwp (UI server) and GHSA-82fw-gwwq-j7x9, plus @vitest/mocker and vite-node. All dev-only; nothing ships.

**Evidence.** `package.json:14-18` (esbuild 0.24.2, vitest 2.1.9, typescript 5.6.3), `package-lock.json`, `.github/dependabot.yml`.

**Change.** Narrowed in the fourteenth pass, since the bumps landed (the original plan: esbuild >= 0.25, the actual fix for GHSA-67mh, as binding to 127.0.0.1 only removes LAN exposure; vitest and vite to the latest patched release; typescript 5.9+). Add a dependabot `groups:` entry so dev dependencies arrive as one weekly PR, and confirm Dependabot security updates are on (a repository setting only the maintainer can check).

**Acceptance.** (derived) `.github/dependabot.yml` groups dev dependencies; `npm audit` still reports 0 vulnerabilities.

Fourteenth-pass audit (62b8572): the advisories are gone. `package.json` pins esbuild 0.28.2, vitest 5.0.1 and typescript 7.0.2 (installed versions match), and `npm audit` reports 0 vulnerabilities. Still open: `.github/dependabot.yml` has no `groups:` entry, and whether Dependabot security updates are on is unconfirmed.


## Tooling, tests, CI and docs (open)

Done this pass and removed from this list: T-01, T-02, T-03 (MACE
notices and README credits) and T-04, with remainders below (ninth
pass); T-21, T-22, T-23 (PR #187, twelfth pass; T-21 has a
fourteenth-pass remainder below); T-27 (fourteenth pass: verified
fixed on main). Fourteenth-pass IDs implemented by this pass's PRs,
so never listed here: T-39 (PR #210); T-35 (PR #229, with a
remainder below).

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

Fourteenth-pass audit (62b8572): the bundle copy in part (1) and the native credits in part (4) landed. `macos/Makefile:24-36` copies LICENSE, THIRD_PARTY_NOTICES.md and LICENSES/LGPL-2.1.txt into Contents/Resources, and the release zip is the ditto'd .app, so it carries them. The native About panel credits AquaZone, the Internet Archive and Osmium UI (`macos/Finsical.swift:619-634`); the browser About credits only the Internet Archive (`web/menubar.ts:175-179`). Still open: THIRD_PARTY_NOTICES.md names neither Osmium UI nor the archive.org content (no match for "Osmium"), the detail pane shows only "<kind> · archive.org" with no item link (`web/import.ts:987-988`), and the browser About could name Osmium UI too. (A reviewer's "part (1) is done" holds only for the copy.) Remaining Change: part (1)'s notices text, part (3) as written, and part (4) for the browser About only; drop the Makefile and zip half of the Acceptance.

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
- Fourteenth pass: MACOS-02 (CI never launches the built app, so native runtime failures ship unnoticed) is filed as T-35 (core in PR #229); it covers the native WKWebView launch, which this browser suite cannot.
- From T-27 (removed in the fourteenth pass, `.idea/` untracked and ignored by #105): when this lands, add `playwright-report/`, `test-results/` and `coverage/` to `.gitignore`.
- Fourteenth pass: TOOLING-03 and TOOLING-02 (updates below).

Fourteenth-pass update (TOOLING-03): a verified offline recipe, which refines the Change above. Three practical blockers the Change misses: the first-run welcome alert makes `alertOpen()` true, which suppresses every bare key (`web/main.ts:1549-1552`); `backfillStarterSounds` contacts archive.org on a welcomed tank with no sounds (`web/main.ts:1652`; keys `finsical:welcomed` and `finsical:starterSounds`, `web/welcome.ts:12-15`); and the page has no state hook. The README documents bare keys, Ctrl/Cmd-I, Esc, the feed crosshair, the hover balloon and the Option-click Get Info card (`README.md:79-121`), all in `web/main.ts` and `web/menubar.ts` with no coverage. Verified with a standalone Playwright script on the frozen 62b8572 build: routing `archive.org` to 404 and an init script setting both keys to "1" gave no alert and 0 archive.org requests; reading state through a second `BroadcastChannel('finsical')` (post `{op:'hello'}`, read the `state` reply) showed 4 stand-in fish and `crt.available: true`; pressing L then F turned `lighting.lamp` from true to false and `food` from 0 to 3; total 2.6 s. The only console error was the `pack/manifest.json` 404 (T-15). The reviewer's wider run on a stocked tank (M, P, C, S opening the stats tab, the Ctrl-I overlay and Esc, the crosshair at 2% height, the `#fishtip` balloon while paused, the Alt-click `.finfo` card, the menu bar titles) was not re-run. Correction: the food count after F depends on how many fish are hungry (`feedPinch`), so assert an increase, not an exact number. Recipe: devDependency `@playwright/test`; `playwright.config.ts` whose webServer runs `npm run build` and a small node static server on 127.0.0.1 serving `dist/`; Chromium only at first, launched with `--use-gl=swiftshader --enable-unsafe-swiftshader` (add WebKit afterwards, as planned above). `e2e/readme.spec.ts`: `context.route(/archive\.org/)` fulfils 404 (`listAddons` never rejects, per FOLLOW-UPS); `addInitScript` sets both localStorage keys; a `state()` helper uses the BroadcastChannel hello. Cover each README key and pointer row against the stand-in fish (pause before scanning for `#fishtip`), TOOLING-02's CRT availability check and no `pageerror`; allow only the known `pack/manifest.json` 404 until T-15 removes the fetch. Open prefs, overview, stats and addons in the same context and assert each receives a state push without a `pageerror`. CI: a core-linux step `npx playwright install --with-deps chromium && npx playwright test`, uploading traces on failure. Acceptance: `npx playwright test` passes on main in under 60 s of test time on ubuntu-24.04; commenting out the `k === "l"` branch in main.ts's keydown handler fails the lamp test; removing `canvas.style.cursor = on ? "crosshair" : ""` fails the crosshair test. Size M, Severity low, Value 4/5, Risk 1/5.

Fourteenth-pass update (TOOLING-02): nothing checks the CRT shader source, and a pure unit test can land before the Playwright suite. `initCrt` is uncovered and no test reads the GLSL, though #171, #174 and #178 all edited the fragment shader. Two failure modes: (1) a compile error makes `initCrt` return null after one `console.warn` (`web/crt.ts:420-426`), so the CRT reports unavailable and its menu item and Preferences switch dim for every user; (2) a mismatch between `TRAIT_UNIFORMS` and the `uniform float` declarations, or a declared uniform the body never reads (the GLSL compiler drops it), makes `getUniformLocation` return null, and `gl.uniform1f(null, v)` silently does nothing, so one front-panel pot is dead. Evidence: `web/crt.ts:25-51` (uniform declarations in `FRAG`), `web/crt.ts:474-485` (`TRAIT_UNIFORMS` is a local, typed only as `string` values); `grep` finds no test mentioning `FRAG`, `uniform` or `initCrt`. Verified at runtime with the reviewer's `crtsmoke.mjs`: the frozen main build reports `crt {available: true}`; the build with `uniform float uPersp;` renamed to `uPerp` reports `{available: false}` and logs `crt shader: ERROR: 0:88: 'uPersp' : undeclared identifier`, so headless Chromium with swiftshader compiles the real shader. The claim that the mutation passes all 471 tests and `tsc` follows from the absence of any shader test (code-verified; suite not re-run). Severity low, not medium: main has no defect; this is a missing guard. Change: (a) pure vitest, no GL: hoist `TRAIT_UNIFORMS` to module scope as `export const CRT_UNIFORMS: Readonly<Record<keyof CrtConfig, string>>` and export `FRAG` as `CRT_FRAG` (test-only consumers; say so in the doc comment); in `web/crt.test.ts`, parse `/uniform\s+\w+\s+(\w+);/g` from `CRT_FRAG` and assert that every key of `CRT_DEFAULTS` maps to a declared `float` uniform that appears at least once more in the body, that every declared uniform is in `CRT_UNIFORMS` or the fixed set {uTex, uTank, uRect, uTime, uPower}, and that the fixed names match the literal `getUniformLocation` calls. (b) The browser half is check (3) above, with TOOLING-03's recipe: `state.crt.available === true` and no console line matching `/crt (shader|link)/`. Acceptance: (a) fails for the `uPerp` declaration rename and for a `TRAIT_UNIFORMS` value typo such as `"uSkw"`, and passes on main; (b) fails on the `uPerp` build and passes on main. Size S, Severity low, Value 4/5, Risk 1/5.

### T-07 Duplicated Python and TS decoders have no shared parity corpus and already disagree

Size M · Severity low · Value 2/5 · Risk 1/5

**Problem.** core/data/{fsh,bmp,snd}.ts port tools/az/*.py and each language has its own fixture builders; no test feeds the same bytes to both. Drift exists: a truncated 16x16 BMP raises in Python but decodes in TS; a 100000x100000 BMP is rejected in TS but hits MemoryError in Python; a 258 KB sprite payload makes emit request a 66.5 GB bytearray. B-02 shows parity alone is not enough; goldens need outside references.

**Evidence.** `core/data/bmp.ts:29` (8192 cap), `core/data/fsh.ts:129` (64 Mpx sheet cap), `tools/az/img.py:5-72` (no caps; IndexError on truncated rows), `tools/az/emit.py:30-54` (no sheet cap), `core/data/*.test.ts`, `tools/tests/fixtures.py`.

**Change.** (1) Mirror TS caps in Python: read_bmp raises a ValueError subclass (T-20) on w <= 0, h == 0, or |w|, |h| > 8192; _sprite_sheet rejects sw*sh > 1<<26 (S-02). (2) `python3 -m tools.tests.gen_parity` writes a small committed corpus into `core/data/fixtures/parity/` with expected.json (dims and sha256 of indices/PCM, or 'reject'): blank frame, truncated frame, RLE8 BMP, truncated BMP, oversized BMP, snd fmt1 raw/MACE, extSH 8/16, AppleDouble/MacBinary/BinHex rsrc. (3) `core/data/parity.test.ts` and `tools/tests/test_parity.py` assert against it; the Python test also regenerates and diffs to catch staleness. (4) AGENTS.md: 'change core/data/*.ts and tools/az/*.py together; run parity' (T-12). Moving TS builders into core/testing/fixtures.ts is optional (the two buildBmp8/buildZip helpers differ).

**Acceptance.** (derived) `core/data/parity.test.ts` and `tools/tests/test_parity.py` pass on the committed corpus; regenerating the corpus produces no diff.

**Merged and related.**

- B-02 follow-up (not in PR #150): an optional `tools/tests/gen_mace_vectors.sh` that wraps bytes in an AIFF-C 'MAC3' file and decodes with real ffmpeg, so goldens come from an outside decoder (the #150 goldens were checked against ffmpeg 7.0.2 by hand).

### T-08 (remainder) main.ts (1142 lines, 0% covered) mixes state logic with DOM; extract pure modules

Size L · Severity low · Value 3/5 · Risk 3/5

**Problem.** The riskiest logic (save migration, sheet binding, removal teardown, letterbox mapping, the fixed-step clock) runs at module load with getElementById, localStorage and rAF, so it is untestable; web/ statement coverage is 20.9%.

**Evidence.** `web/main.ts:45-98` (loadTank/saveTank), `web/main.ts:100-111` (pointer mapping), `web/main.ts:120-133`, `web/main.ts:222-320` (sheet maps, 'exact inverses' comments at :246-252, :275-279, :302-306), `web/main.ts:553-602`, `web/main.ts:735-764`, `web/main.ts:1127-1142`.

**Change.** Narrowed in the fourteenth pass: the planned `web/geometry.ts` and `core/clock.ts` landed as `web/feedzone.ts` (`containPoint`, `isFeedZoneY`) and `core/loop.ts` (`planFrame`, `MAX_FRAME_MS` 200). Still to extract, with call sites staying in main.ts: `web/tanksave.ts` (`parseSavedTank(raw)`, `serializeTank(...)`, `rosterFromSave(saved)`, B-16's initialRoster) and `web/tankmodel.ts` (B-04, B-14, B-15 resolvers).

**Acceptance.** Test: invalid JSON, v not in {1,2}, non-finite coordinates dropped, sheetIdx/pack serialized only when set. (The letterbox-null and 200 ms clamp cases belong to the modules that landed.) Defer a SheetRegistry class until a bug justifies it.

**Merged and related.**

- Merged from passes 1-7: no DOM or unit tests cover entry-bundle handlers; keep extracting pure helpers whenever `main.ts` is touched (`web/drop.ts` from PR #94 and PR #99's replace path are examples).
- This pass added more pure modules in open PRs: `core/loop.ts` (#153), `core/tuning.ts` (#154), `core/light.ts` (#155), `web/artscale.ts` (#149/#157), `core/data/swimsheet.ts` (#149), `web/water.ts` (#158), `web/alert.ts`, `web/starter.ts`, `web/scold.ts` (#160).

Fourteenth-pass audit (62b8572): much of the extraction landed: `core/loop.ts` (`planFrame`, `MAX_FRAME_MS` 200), `web/feedzone.ts` (`containPoint`, `isFeedZoneY`), and the light, tuning, water, surface, artscale, drop, scold, starter and alert modules. Still to extract: `web/tanksave.ts` (`loadTank`, `sanitizeSavedFish` and `saveTank` still sit in `web/main.ts:87-239`) and the `web/tankmodel.ts` resolvers. main.ts is now 2196 lines. This pass's B-04 PR (#218, open) starts `web/tankmodel.ts` with pure part helpers (`entryStem`, `partName`, `migrateParts`) and `tankmodel.test.ts`; the B-14 and B-15 resolvers and `web/tanksave.ts` remain.

### T-09 (remainder) import.ts: split the archive.org client from the panel, fixture-test the HTML scraper, add a live contract check

Size M · Severity low · Value 3/5 · Risk 2/5

**Problem.** An archive.org markup change would silently empty the add-on browser, and the scraper is never tested. Every green `npm test` prints 24 'archive.org listing failed' stack traces. Module-level caches leak between tests. A live run lists 840 items (fish 165, gravel 76, plants 93, accessories 395, backgrounds 83, tanks 27, sounds 1) in 1.7 s; hrefs are protocol-relative ('//archive.org/download/…').

**Evidence.** `web/import.ts:26-388` (DOM-free client), `web/import.ts:240-282` (href scraper, uncovered), `web/import.ts:389-1248` (panel), `web/import.test.ts:83-98` (stub answers every listing with 404).

**Change.** (1) Move lines 26-388 to `web/archive.ts`, ideally an ArchiveClient class owning zipCache/pageCache so each test gets a fresh one; mountImportPanel to `web/importpanel.ts`. (2) Commit trimmed real listing pages captured with curl (`web/fixtures/archive/gravel.zip.html` and a JPN SET page); the stub serves them by URL; assert exact inner names and URLs. (3) `vi.spyOn(console, 'warn')` for expected failures. (4) `.github/workflows/archive-contract.yml` (weekly schedule plus workflow_dispatch) runs a LIVE_ARCHIVE=1-gated vitest asserting every COLLECTIONS entry lists >= 1 item and one known add-on imports; on failure `gh issue create`.

**Acceptance.** (derived) The fixture-based scraper test asserts exact inner names and URLs; `npm test` prints no archive.org stack traces; the weekly workflow opens an issue on failure.

**Merged and related.**

- Merged from passes 1-7: the `import.test.ts` stub answering non-`.zip` fetches with 404 is expected log noise (a comment at the stub helps), and live archive.org is correctly not in CI; a scheduled smoke job catches listing HTML changes early.

Fourteenth-pass audit (62b8572): a first scraper test landed: `import-listing.test.ts` scrapes a synthetic one-link listing and asserts the inner name. Still open: the client/panel split (`web/import.ts` is 1470 lines with module-level caches), real listing fixtures, a `console.warn` spy (a verbose run shows 27 'listing failed' warnings, which vitest 5's default reporter only hides; see T-26) and the weekly live-contract workflow. Points (1), (2) with real captured pages, (3) and (4) of the Change stand.

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
- Fourteenth pass: FIDELITY-14 (record the User's Guide, the JPN catalog and the DLL cursors as fidelity references) is filed as T-36; its 'Primary sources' section can live in this entry's `docs/ARCHITECTURE.md`.

### T-12 AGENTS.md has no project-specific quick reference

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** AGENTS.md is generic process guidance; agents must rediscover test commands, the dev loop and invariants (this review's orchestrator had to restate them).

**Evidence.** `AGENTS.md`, `CLAUDE.md`.

**Change.** Add '## Project quick reference': a layout table (core/, web/, macos/, tools/, node_modules/osmium-ui); commands (npm ci; npm run typecheck; npm test; `python3 -m unittest discover -s tools/tests -p 'test_*.py' -t .`; npm run dev; scripts/build.sh); invariants (never commit AquaZone data: web/pack/ and packs/ are gitignored; change core/data/*.ts and tools/az/*.py together and run T-07's parity test; respect the macOS 12 / WebKit floor (B-29); UI fixes go upstream to L-K-M/osmium-ui; the 320x200 tank); how to verify UI (open index.html and a client page in the same browser profile; T-06's smoke test; the Web Inspector default from T-24).

**Acceptance.** (derived) AGENTS.md has a "Project quick reference" section whose commands all run as written.

### T-13 (remainder) No linters; enabling cheap checks immediately finds dead code and a missing test

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** CI runs only tsc and `bash -n`. `tsc --noUnusedLocals --noUnusedParameters` gives exactly one error: `sndFmt1Mace` (snd.test.ts:63) is never called, so the TS parseSnd MACE branch is untested. ruff (E,F,W,B) on tools/ finds ~30 issues including unused struct (emit.py), unused rbase (rsrc.py:197) and W605 (T-21). shellcheck flags SC2155 (`readonly X="$(cd … && pwd)"` hides a failed cd).

**Evidence.** `tsconfig.json`, `core/data/snd.test.ts:63`, `tools/az/emit.py:11`, `tools/az/rsrc.py:197`, `scripts/build.sh:6-7`, `scripts/release.sh:6-7`, `.github/workflows/ci.yml:23`.

**Change.** Add noUnusedLocals and noUnusedParameters to tsconfig.json (the hit is already resolved: see the audit note below). `pyproject.toml` `[tool.ruff]` (select E,F,W,B; ignore E702/E501 initially) and a `pipx run ruff check tools` step. `shellcheck scripts/*.sh` in core-linux; split the SC2155 declarations (`SCRIPT_DIR="$(cd … && pwd)"; readonly SCRIPT_DIR`). Skip a tsconfig 'types' split: @types/node is not installed and web code already cannot use Node globals.

**Acceptance.** (derived) CI runs tsc with `noUnusedLocals`/`noUnusedParameters`, ruff and shellcheck, all clean.

**Merged and related.**

- Related: T-30 (the dead `openImport` surface) is the kind of dead code these checks find.

Twelfth-pass note: the cited W605 (T-21) is fixed in PR #187 — the
docstring is now raw. The rest of the ruff/shellcheck/tsc-unused
findings stand.

Fourteenth-pass audit (62b8572): the TypeScript hit is resolved. `sndFmt1Mace` is now called by a test (`core/data/snd.test.ts:281`; a reviewer's "it is gone" was wrong, it still exists), and `tsc --noEmit --noUnusedLocals --noUnusedParameters` is clean. Still open: neither flag is set in tsconfig.json; ruff (E,F,W,B) now finds 16 issues, not about 30 (the unused `import struct` at `tools/az/emit.py:11`, the unused `rbase` at `tools/az/rsrc.py:197`, W605 at `tools/fetch.py:7` until PR #187 merges, and others), with no pyproject config or CI step; no shellcheck in CI, and SC2155 remains in `scripts/build.sh:6-7` and `scripts/release.sh:6-7`. T-21's remainder adds a `-W error::SyntaxWarning` CI run that also guards the escape.

### T-14 (remainder) CI toolchains are unpinned, the web build is not checked on Linux, and PRs produce no artifacts

Size S · Severity low · Value 2/5 · Risk 1/5

**Problem.** Both jobs use whatever Node and Python the runner image ships (they differ between ubuntu-24.04 and macos-15 and drift); no npm cache; `npm run build` runs only indirectly on macOS; reviewers cannot download a PR build. zip.ts needs Node >= 20.12 for deflate-raw.

**Evidence.** `.github/workflows/ci.yml:17-38`, `package.json` (no engines), no `.nvmrc`.

**Change.** `.nvmrc` (22) and `"engines": {"node": ">=22"}`; actions/setup-node (pinned SHA) with node-version-file and cache npm in both jobs; setup-python per T-04; `npm run build` in core-linux; upload dist/ from core-linux and `ditto -c -k --keepParent macos/Finsical.app Finsical-pr.zip` from native-macos with actions/upload-artifact (retention-days 7).

**Acceptance.** (derived) CI logs show the pinned Node and both Python versions; PRs carry dist and app artifacts with 7-day retention.

**Merged and related.**

- T-04's remainder: PR #156 fixed the import on Python 3.9 but did not add the CI Python matrix (['3.9', '3.13'] with a pinned actions/setup-python); do it here.

Fourteenth-pass audit (62b8572): the Linux web build is now checked: `npm test` in core-linux runs `scripts/web-build.test.mjs`, which runs `npm run build` in a temp dir and pins every machine image (a verbose log confirms), so drop "`npm run build` in core-linux" from the Change. Still open: `.nvmrc` and `engines`, actions/setup-node with an npm cache, the Python matrix, and uploading dist/ and the app with actions/upload-artifact.

### T-15 (remainder) `npm run build` does not produce a complete site; every launch 404s on pack/manifest.json

Size S · Severity low · Value 3/5 · Risk 2/5

**Problem.** dist/ lacks web/assets, so it shows no machine case (the review needed its own build-site.sh). An Osmium upgrade needs a dev restart. main.ts always fetches pack/manifest.json, logging a 404 and 'azpack load failed; using placeholder fish' on every normal launch (web/pack/ is gitignored).

**Evidence.** `package.json` (scripts.build: five esbuild calls plus an inline `node -e` copying only HTML and CSS; scripts.dev copies osmium.css into web/ once), `macos/Makefile:27-37` (re-copies HTML and assets from web/), `web/main.ts:870-887`, `.gitignore:11-13`.

**Change.** `scripts/build-web.mjs` using esbuild's JS API: entryPoints {bundle: 'web/main.ts', overview, addons, prefs, stats}, bundle, format 'iife', target 'safari15' (B-29), outdir dist; copy the HTML, app.css, osmium.css, assets and optional web/pack. `--serve` uses `context.serve` on 127.0.0.1:8080 with servedir dist plus watch, so dev stops writing into web/. Define `__BUNDLED_PACK__` (existsSync('web/pack/manifest.json')) and `__VERSION__` (package.json); main.ts skips the pack fetch when __BUNDLED_PACK__ is false; A-04 shows __VERSION__. The Makefile copies only from ../dist; package.json scripts become `build: node scripts/build-web.mjs`, `dev: node scripts/build-web.mjs --serve`.

**Acceptance.** (derived) `npm run build` produces a `dist/` that shows a machine case and fish without a 404; the Makefile copies only from `../dist`.

**Merged and related.**

- Overlaps open PR #144 (copies `web/assets/` into `dist/`, `scripts/web-build.test.mjs` pins each machine image). Its `cpSync` line was later removed from `package.json` by a manual user edit: confirm `dist/assets` ships.
- PR #160 (open) already logs the pack-manifest 404 as info (U-02 point 5); `__BUNDLED_PACK__` still removes the fetch.

Fourteenth-pass audit (62b8572): two parts landed. The build copies `web/assets` into dist, pinned by `scripts/web-build.test.mjs` (so dist/ shows the machine cases), and the missing manifest is logged as info (`NoBundledPack`, `web/main.ts:1595-1624`); the native shell now answers a missing bundled file with 404 (T-24). Still open: the `pack/manifest.json` request still fires on every launch, and the browser console still shows it as a 404 error (seen again in this pass's Playwright runs, T-06); `scripts/build-web.mjs`, `__BUNDLED_PACK__` and `__VERSION__`, a dev server that stops writing into `web/`, and a Makefile that copies only from `../dist`.

### T-16 Python pipeline coverage gaps: the ISO reader is 16% covered, fetch() untested, pict.py dead code

Size M · Severity low · Value 2/5 · Risk 1/5

**Problem.** coverage.py: iso9660.py 16%, fetch.py 58%, pict.py 63%, total 74%. The real Iso class is never tested; fetch() orchestration (listing, declared-size skip, cache key, ISO vs zip branch, failure count and exit code) has no test; pict.py is imported only by its own test yet listed in the pipeline.

**Evidence.** `tools/az/iso9660.py`, `tools/fetch.py:204-253`, `tools/tests/test_fetch.py:142-155` (FakeIso), `tools/az/pict.py`, `PLAN.md:40`.

**Change.** `fixtures.build_iso(files: dict[str, bytes])` writing a PVD at sector 16, a root directory, one subdirectory and a directory record forced across a sector boundary; test Iso.walk, read_file, the '.'/'..' skip and the extent-loop guard. Test fetch() end to end with monkeypatched `fetch._get` and `fetch._list_item`. Either wire pict.py into emit (PICT backdrops in .rsrc/.pct) or delete it with test_pict.py and update PLAN.md (T-11). D-09's optional PICT export would give it a use.

**Acceptance.** (derived) coverage.py shows `iso9660.py` above 80% and `fetch()` orchestration covered; `pict.py` is either used by emit or deleted with its test.

### T-17 (remainder) audio.ts race handling and store.ts LRU eviction are untested

Size M · Severity low · Value 2/5 · Risk 2/5

**Problem.** TankAudio's ambient-loop races (ambientGen, ambientWanted, the resume retry, the addWavs restart) and trimPacks' 150 MB LRU have 0% and ~35% coverage; only capSnds is tested. B-17, B-18, B-19, B-30 and B-40 all change this code.

**Evidence.** `web/audio.ts:14`, `web/audio.ts:17`, `web/audio.ts:60-69`, `web/audio.ts:83-94`, `web/audio.ts:96-125`, `web/audio.ts:138-143`, `web/store.ts:90-135`, `web/store.test.ts`.

**Change.** Narrowed in the fourteenth pass, since `web/audio.test.ts` now has a fake AudioContext and covers loop stacking (see the audit note). Extract pure `pickSound(importedMap, bundledMap, subs)` (find's rules) and `tapZone(x, y, w, h)` into `web/audiopick.ts` with table tests; the `tapZone` table must pin the normalized comparison in `web/audio.ts:393-399`, so that mutating `dx / w < dy / h` to `dx < dy` fails it (for example (5, 5, 320, 200) gives "side"). Move the existing fake into `web/testing/fakeaudio.ts` (controllable state, deferred resume(), decodeAudioData and a createBufferSource spy, shared by the audio tests proposed in B-17, B-19, B-40, F-05) and add the two missing ambient races: load() during a pending resume gives no loop, and a new 'aqua' restarts once. devDependency fake-indexeddb, an injectable pack budget, and tests for packPut/trimPacks eviction order and packDelete (with B-30's evictionPlan).

**Acceptance.** (derived) Table tests for `pickSound` and `tapZone`, and the `dx < dy` mutation fails the `tapZone` table; the two ambient-race tests; trimPacks eviction order tests with fake-indexeddb.

**Merged and related.**

- Merged from passes 1-7: verify `startAmbient()` never overlaps loops during rapid load or restart.
- PRs #153 and #159 (open) add `web/audio.test.ts` with a fake AudioContext; reuse it as `web/testing/fakeaudio.ts`.
- Fourteenth pass: TOOLING-07 (mutation testing finds unpinned decoder behavior: resource attribute bits and the Shift_JIS fallback) is filed as T-39 and done in PR #210. Its third point is this entry's `tapZone` table: no test calls `TankAudio.tap`, so the `dx / w < dy / h` to `dx < dy` mutation survives trivially today.

Fourteenth-pass audit (62b8572): the ambient half is mostly done. `web/audio.test.ts` has a fake AudioContext and covers loop stacking, a locked context and hide/resume (`web/audio.test.ts:192`, `:248-320`). Still open: tests for `store.ts` `trimPacks`/`packPut`/`packDelete` with fake-indexeddb (`store.test.ts` covers only `capSnds`), the `pickSound`/`tapZone` extraction, and tests for load() during a pending resume and for a new loop buffer restarting once.

### T-18 The page-to-page bus protocol is untyped and has a dead message

Size M · Severity low · Value 2/5 · Risk 2/5

**Problem.** Each page matches op strings and re-validates by hand, so nothing checks senders and receivers agree. 'uninstalled' is posted but handled nowhere (overview.ts mentions it in a comment; the Swift relay checks only dragWindow and state); B-37 gives it a handler.

**Evidence.** `web/bus.ts:4` (`type BusMsg = Record<string, unknown>`), `web/main.ts:516-551`, `web/main.ts:519` (casts m.item), `web/main.ts:601` (posts 'uninstalled'), `web/main.ts:607-615`, `macos/Finsical.swift:335`, `macos/Finsical.swift:343`.

**Change.** `web/protocol.ts` with discriminated unions TankToClient ('state' | 'thumbs' | 'installed' | 'installFailed' | 'uninstalled') and ClientToTank ('hello' | 'install' | 'removeFish' | 'removeAddon' | 'wantThumbs' | 'crtEnabled' | 'crtConfig' | 'machine' | 'soundsLoaded' | 'dragWindow'), plus `parseClientMsg(unknown): ClientToTank | null` validating every field (S-07's isImportable for items). Make openBus generic and use an exhaustive switch with a `never` check in onBusMessage. Unit-test validators with malformed payloads.

**Acceptance.** (derived) Validator unit tests reject malformed payloads for every op; the exhaustive switch fails typecheck when an op is missing.

**Merged and related.**

- Merged from pass 8 (B14 envelope half): validate the envelope and each op's payload; clients share one `isState()` validator. `BusMsg` is `Record<string, unknown>` by design today, with op validation in each handler; this entry replaces that with discriminated unions.
- New ops in this pass's open PRs to include: `soundConfig` (#159), the lighting op (#155), `toggleMute`, `changeWater` (#114), the scenery "Use" op (#118).

Re-verified open at 62b8572 (fourteenth-pass audit): `type BusMsg = Record<string, unknown>` (`web/bus.ts:4`); 'uninstalled' is posted at `web/main.ts:1130` and no page handles it.

### T-19 fetch.py deletes an earlier run's numbered bundles even when the current source emits nothing

Size S · Severity low · Value 1/5 · Risk 1/5

**Problem.** Run 1 emits out/Foo.azpack and out/Foo-2.azpack; a later `_emit_source('Foo.bin', b'not importable', 'out')` returns None but leaves only Foo.azpack (reproduced).

**Evidence.** `tools/fetch.py:86-99` (stale-sibling cleanup at :92-97 runs before the is_pack/has_sounds checks).

**Change.** Clean stale siblings only after a successful emit of the base name, or collect emitted base names and clean orphans once at the end of fetch(). Add the repro as a test next to test_rerun_drops_orphaned_numbered_bundles.

**Acceptance.** (derived) The repro test passes: a later non-importable source leaves both earlier bundles intact.

**Merged and related.**

- Merged from pass 8 ("`tools/fetch.py` deletes output before conversion succeeds"): an existing output bundle is removed up front and numbered siblings before the new input is proven usable, so a failed conversion destroys the previous usable result. Stage each conversion in a fresh sibling directory, validate its manifest, then replace only that conversion's owned destination; reconcile stale outputs only after a successful complete run. Test with temp dirs and an injected failure: existing bytes must survive. The standalone converter's same-basename overwrite is T-28.

Re-verified open at 62b8572 (fourteenth-pass audit): the stale-sibling cleanup still runs before the `is_pack`/`has_sounds` checks (`tools/fetch.py:95-111`).

### T-20 Tool input validation uses assert, and the ISO reader never closes its file

Size S · Severity low · Value 1/5 · Risk 1/5

**Problem.** read_bmp and Iso.__init__ validate untrusted content with assert (reserved for internal invariants by AGENTS.md): under `python -O` garbage decodes (read_bmp(b'XX' + bytes(60)) returns a 0x0 image; a zero-filled file passes Iso() then fails with TypeError); without -O a bare AssertionError has no message. Iso opens self.f with no close; ResourceWarnings appear in the suite.

**Evidence.** `tools/az/img.py:7`, `tools/az/img.py:11`, `tools/az/img.py:15`, `tools/az/iso9660.py:6-11`, `tools/fetch.py:242`.

**Change.** Raise ImgError and IsoError (ValueError subclasses) with messages ('not a BMP', 'unsupported DIB header size N', 'not ISO9660'); give Iso close(), __enter__ and __exit__ and use `with Iso(path) as iso:` in fetch.py. Tests assert the specific errors, including one run under `python3 -O -m unittest tools.tests.test_img`.

**Acceptance.** (derived) Tests assert `ImgError`/`IsoError` messages, including a run under `python3 -O`; the suite shows no ResourceWarning.

**Merged and related.**

- Merged from pass 8 (B04 slice): Python ISO parsing trusts lengths too far; validate extents and lengths against the file size with the same `IsoError`.

### T-21 (remainder) Both tool CLIs run their usage examples together in `--help`, and CI would not catch fetch.py's warning coming back

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** T-21 itself (the non-raw docstring in `tools/fetch.py`) is fixed in PR #187 (open, twelfth pass); until it merges, CI's ubuntu-24.04 runner (Python 3.12) prints the SyntaxWarning in every unittest run. This remainder is what #187 leaves out. Both argparse parsers pass the module docstring as `description` with the default `HelpFormatter`, which re-wraps it, so the aligned example commands in both docstrings print as one run-on paragraph. And nothing in CI turns such warnings into failures, so the next invalid escape would print unnoticed again.

**Evidence.** `tools/fetch.py:2-7` on main (`'\.zip$'` in a non-raw docstring), `tools/fetch.py:265` and `tools/azpack.py:26` (`description=__doc__`, default formatter), `.github/workflows/ci.yml:31` (plain unittest run). Verified: a plain `python3.12 -m unittest discover` on a copy of `tools/` prints `tools/fetch.py:2: SyntaxWarning: invalid escape sequence '\.'`; `python3 -W error tools/fetch.py --help` on 3.11 raises `SyntaxError`; `python3 tools/fetch.py --help` and `python3 tools/azpack.py --help` print the examples run together ("...into .azpack bundles. python3 tools/fetch.py # default item, into packs/ python3 tools/fetch.py <identifier> ..."). With only the docstring made raw, the suite passes under `-W error::SyntaxWarning -W error::DeprecationWarning` on 3.10, 3.12 and 3.13 (DeprecationWarning is what 3.10 and 3.11 emit for invalid escapes), and both `--help` calls exit 0 under `-W error` on 3.13. Python 3.9 was not available, and the CI log line the reviewer cited (run 36044544453) was not fetched. PR #187's branch (`devin/fetch-py-fixes`) changes the docstring prefix but passes no `formatter_class` and does not touch `ci.yml`.

**Change.** Make fetch.py's docstring raw (`r"""`) if PR #187 has not merged. Pass `formatter_class=argparse.RawDescriptionHelpFormatter` in both `ArgumentParser` calls. In `ci.yml` and `scripts/build.sh`, run `python3 -W error::SyntaxWarning -W error::DeprecationWarning -m unittest discover ...`. Leave `error::ResourceWarning` to T-20/T-26, which must fix the leaks first.

**Acceptance.** `python3 -W error tools/fetch.py --help` and `python3 -W error tools/azpack.py --help` exit 0 on 3.10 to 3.13 and print each example on its own line; the CI unittest step logs no SyntaxWarning.

**Merged and related.**

- T-21's raw docstring, with T-22 and T-23: PR #187 (open, twelfth pass).
- Related: T-13 (ruff's W605 flags the same escape statically), T-26 (`-W error::ResourceWarning` once the leaks are fixed), T-20.
- Fourteenth pass: TOOLING-08.

### T-24 (remainder) No Web Inspector in native builds; missing bundled files fail as network errors instead of 404s

Size S · Severity low · Value 3/5 · Risk 1/5

**Problem.** Nothing sets `isInspectable`, and apps built with a current SDK are not inspectable by default, so native-only bugs (relay, masks, WKWebView quirks) cannot be debugged. A missing file makes the handler fail the task instead of answering 404, which only changes console text (packFetch treats both the same).

**Evidence.** `macos/Finsical.swift:8-12` (MIME map), `macos/Finsical.swift:28-52` (WebHandler: didFailWithError at :50-52), `macos/Finsical.swift:83-86` (client prepare closure), `macos/Finsical.swift:110-116`, `macos/Finsical.swift:468`.

**Change.** `if #available(macOS 13.3, *) { v.isInspectable = UserDefaults.standard.bool(forKey: "FinsicalWebInspector") }` for the tank after :468 and for clients in the prepare closure; document `defaults write dev.finsical.app FinsicalWebInspector -bool YES` (T-02, T-12). Optional: answer a missing file with `HTTPURLResponse(statusCode: 404)` and an empty body (403 for traversal attempts; traversal is already handled correctly). Skip a UTType MIME rewrite (everything is read as ArrayBuffer), except adding webp for P-11.

**Acceptance.** (derived) With the default set, Safari's Develop menu lists the tank and client pages; a missing bundled file answers 404.

Fourteenth-pass audit (62b8572): the 404 half landed (333845d): a missing bundled file answers HTTP 404 with Content-Length 0 and no-store (`macos/Finsical.swift:50-62`). Still open: `isInspectable` behind the `FinsicalWebInspector` default (nothing in `macos/` or osmium-ui's Swift sets it), and optionally a 403 for path traversal, which still fails with a URLError (`macos/Finsical.swift:23-26`). This pass's B-75 (PR #229) replaces the containment check so a translocated app keeps serving files and answering 404.

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

Re-verified open at 62b8572 (fourteenth-pass audit, which overturns an earlier "partial" reading): neither half is fixed in code. vitest 5's default reporter hides console output, but a verbose run still logs 27 (not 24) 'archive.org listing failed' stacks, and `import.test.ts` has no `console.warn` spy. The Python tests still leak files (`tools/tests/test_fetch.py:226`, `:230`, `tools/tests/test_img.py:52`) and print unasserted stderr. The whole Change stands; T-21's remainder adds `-W error::SyntaxWarning -W error::DeprecationWarning` to the CI unittest run, and `-W error::ResourceWarning` follows once these leaks are fixed.

### T-28 Asset CLI emits raw chunk files nothing reads, and same-named inputs overwrite each other

Size S · Severity nit · Value 1/5 · Risk 1/5

**Problem.** The loader only reads sprites images, decor images and sounds; chunks/*.bin are never read but inflate a bundled Finsical.app. a/Foo.fsh and b/Foo.fsh map to the same out/Foo and the second silently overwrites the first (fetch.py already suffixes -2).

**Evidence.** `tools/az/emit.py:70-77` (writes chunks/*.bin), `tools/azpack.py:32-34` (output dir from basename), `core/data/azpack.ts:175-185`, `macos/Makefile:33` (copies web/pack wholesale).

**Change.** A `--raw` flag on emit (off by default) for chunks/. In azpack.py reuse fetch._emit_source-style suffixing (Foo, Foo-2) and log each collision.

**Acceptance.** (derived) Two same-named inputs produce `Foo` and `Foo-2` with a logged collision; no `chunks/` without `--raw`.

**Merged and related.**

- Related: T-19.
- Fourteenth pass: TOOLING-06 (update below; it also extends the FOLLOW-UPS "Tooling and tests" note on pack.py).

Fourteenth-pass update (TOOLING-06): `tools/azpack.py` reports success on the game's sound bank but emits no sounds. README "Asset tools" says `azpack.py` converts `.REZ` files; for `AZ_WAVES.REZ` it takes the `is_pack` branch straight to `emit`, writes 25 opaque `chunks/*.bin` files and no manifest `sounds`, prints its success line (it prints for "0 sprite sheets" too) and exits 0 (`tools/azpack.py:41-59`). The loader never reads `chunks/`, so the bundle plays nothing, while dropping the same file on the tank gives 25 named sounds through `core/data/sndbank.ts`. Any pack that yields no art is reported the same way, and `fetch._emit_source` has the same blind spot for an archive that carries a bank (`tools/fetch.py:102-111`; whether the default item's ISOs contain one is unverified, and FOLLOW-UPS already notes fetch.py cannot open the 7z that does). The Python side also has no port of `sndbank.ts`, against the paired-decoder design note. Verified: `python3 tools/azpack.py AZ_WAVES.REZ -o …` on the real 1,182,480-byte bank printed `(25 chunks, 0 sprite sheets)` and exited 0; the manifest has format `azpack/1`, 25 chunks (`chunks/anon_0000_104.bin`, …) and no `sounds` key; `bankSounds` on the same bytes gives 25 records, `AZ bubble 9003` first. The reviewer's `loadAzpack` run (0 sheets, 0 sounds) and the sprite parity check on neon, banggai, angel and Mule1 were not re-run. The audit confirms `emit.py` still always writes `chunks/` (`tools/az/emit.py:58`). Change: add `tools/az/sndbank.py`, a port of `bankSounds` (little-endian map, `" dns"` type, 12-byte references, RIFF/WAVE payloads, the id-to-name table, bubbling first) with the caps PR #210 adds on the TS side (first `" dns"` entry only, one record per payload, 1024 records; S-05). In `azpack.py` and `fetch._emit_source`, when `is_pack(data)` and `emit()` yields no sprites or images, try the bank and write `sounds/<n>.wav` plus manifest `sounds` through `emit.py`'s existing sounds writer; when a pack yields neither art nor sounds, print an error and return rc 1. `tools/tests/test_sndbank.py` ports `core/data/sndbank.fixture.ts`'s `buildBank` and checks the same names and order as `sndbank.test.ts`. Acceptance: `azpack.py` on a `buildBank` fixture writes `manifest.sounds` whose names match `bankSounds` for the same bytes; a pack with no art and no bank exits 1 with a message. This part is Size M, Severity low, Value 2/5, Risk 1/5; it fits with this entry's `--raw` flag, since a bank would then emit sounds and no chunks.

### T-29 Idea: publish the web build to GitHub Pages as 'Try Finsical in your browser'

Size S · Severity idea · Value 4/5 · Risk 2/5

**Problem.** The tank and client windows already work in a browser over BroadcastChannel, and archive.org sends access-control-allow-origin for download and view_archive URLs (checked with an l-k-m.github.io Origin). Pages would give a no-install, no-Gatekeeper trial, including on Intel, Linux and Windows. Nothing in the browser links to prefs.html or overview.html today.

**Evidence.** `.github/workflows`, `README.md`, `scripts/build-web.mjs` (T-15), `web/main.ts:825-866`.

**Change.** `.github/workflows/pages.yml`: on push to main, npm ci plus T-15's complete build, then actions/upload-pages-artifact and actions/deploy-pages (pinned SHAs; permissions pages: write, id-token: write). A browser-only way to open the client pages (U-14's menu bar, or bare P and O keys opening named tabs via the existing stats-tab logic at main.ts:836-866). Link 'Try it in your browser' from the README; add V-17's viewport meta; smoke-test the deployed page with T-06.

**Acceptance.** (derived) The Pages workflow deploys on push to main; T-06's smoke test passes against the deployed URL.

**Merged and related.**

- Needs U-14 (open PRs #102/#103/#126) for browser navigation and V-19 for the favicon; the viewport meta is done (PRs #90/#93).

Re-verified open at 62b8572 (fourteenth-pass audit), with a correction: U-14's menu bar prerequisite is met (`web/menubar.ts` mounts it in every browser), so this no longer waits on those PRs. Still missing: `pages.yml`, the README link, a smoke test and a favicon (no `rel=icon` on main; the favicon is PR #197, open since the twelfth pass).


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

Re-verified open at 62b8572 (fourteenth-pass audit), with a correction: `openImport` is exposed at `web/main.ts:1507`, and Swift now calls `feedFish`, `changeWater`, `toggleCrt`, `toggleLights`, `toggleMute` and `togglePause` (from `macos/Finsical.swift:546`), never `openImport`.

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

Re-verified open at 62b8572 (fourteenth-pass audit), with a correction: `fitBackdrop` lives in `web/main.ts:538-550` (the round-and-clamp is still inline at `:543-545`) and imports `coverCrop` from `web/render.ts`.

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

**Merged and related.**

- Fourteenth pass: MACOS-02 (CI never launches the built app, so native runtime failures ship unnoticed) is filed as T-35; PR #229 automates the launch part of this checklist with `--smoke-test` in CI, and T-35's remainder extends it.
- Fourteenth pass (refuted MACOS-08): check on a Mac whether Show on All Desktops floats the tank over other apps' full-screen Spaces as part of "Spaces and full-screen behavior"; if it does, reopen MACOS-08 with the reviewer's "Show Over Full-Screen Apps" toggle.

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

### T-34 No motion-quality regression tests: the watcher wobble and the two-pellet spin pass the current suite

Size M · Severity low · Value 3/5 · Risk 1/5 (fourteenth pass)

**Problem.** `sim.test.ts` checks single scenarios with loose bounds. Nothing checks, across the whole sim, for the artifacts that make motion look broken: heading zigzag, repeated rolls in one seek, fish pinned at walls, pellets left uneaten, or non-finite fields. Both SIM-01 (the watcher wobble, B-65) and SIM-02 (the two-pellet spin, B-67) pass all 68 tests.

**Evidence.** `core/sim.test.ts:265-288` (watcher bounds only), `core/sim.test.ts:838-861` ('swims calmly' counts rolls and one-tick halts only); no fuzz or invariant test exists. Healthy baselines worth pinning, re-measured by the verifier: 1.86M fuzzed fish-ticks (40 seeds, 24 fish, random taps, food, pointer, light, water changes, removals, extreme extents and cruise; `sim-verify/v7.ts`) with 0 non-finite fields and 0 escapes from the tank; bubbles bounded by their lifetime (at most 22 with 24 fish in foul water and a tap every 10 ticks over 30000 ticks, `v8.ts`). The reviewer measured 0.0% wall pinning and 659 of 659 Feed Fish pellets eaten over 200 seeded feeds.

**Change.** Add `core/sim.motion.test.ts` with a small in-file metrics helper (zigzag ticks per fish-minute, rolls per fish-minute, maximum rolls in one seek, share of ticks pinned to `room()` bounds, non-finite fields) and seeded scenarios: 6 fish free-swimming for 10 min; the fuzz above; 24 fish with bubbles. The watcher and two-pellet scenarios belong in the SIM-01 and SIM-02 PRs as their regression tests, not here. `core/` never imports `web/`, so the Feed Fish pinch scenario (which needs `web/water.ts` `feedPinch`) goes in `web/water.test.ts`. Thresholds: zigzag under 0.2 per fish-minute, pinned under 1%, 0 non-finite, 100% of pinch pellets eaten.

**Acceptance.** The new tests pass on main; `npm test` grows by at most 3 s.

**Merged and related.**

- B-65 (SIM-01, PR #215) and B-67 (SIM-02, PR #213) carry their own regression scenarios.
- Fourteenth pass: SIM-11.

### T-35 (remainder) Native smoke test: run it in the release job, catch page errors, leave no state, cover the client pages

Size S · Severity low · Value 3/5 · Risk 1/5 (fourteenth pass; the whole item was Size M, Severity medium, Value 4/5)

**Problem.** CI compiled, installed and `test -x`-checked the app but never loaded the tank page in WKWebView, so a WebHandler path bug (MACOS-01, B-75), a WebKit API missing on the runner's WebKit (the B-29 class), a top-level script that throws or a Makefile copy list that misses a web file would all pass CI and the release job. PR #229 (open) adds the core: a `--smoke-test` launch that runs in `ci.yml` from /Applications and from a /private/tmp copy (see the completed work). This entry holds the parts of the review's plan it leaves out: the release job still builds and archives without launching; under `--smoke-test` the app keeps its normal website data store and window-frame saving, so a local run can leave state behind and two runs can share a saved tank; page errors are not collected, so the verdict rests only on `window.finsical.feedFish` existing and `#shell` having children; and the client pages are never loaded.

**Evidence.** `.github/workflows/release.yml:45-46` (build only; PR #229 does not touch it), `.github/workflows/ci.yml:32-45` (native-macos job; PR #229 adds both smoke steps), `macos/Makefile:30-37` (hand-maintained copy list). PR #229's branch (`claude/translocated-app`) adds `smokeExit`, the `webView(_:didFinish:)` check, the provisional-failure exit 2 and a 30 s watchdog to `macos/Finsical.swift`, but no `WKWebsiteDataStore.nonPersistent()`, no error-forwarding user script and no client-page loads. GitHub's macOS images run UI tests in a logged-in GUI session, and PR #229's CI runs showed the app launching there (its /private/tmp run first reported the WebHandler failure: NSURLErrorDomain -1100, exit 2).

**Change.** The review's remaining steps: (1) add the same `--smoke-test` step to release.yml before archiving; (2) under `--smoke-test`, use `WKWebsiteDataStore.nonPersistent()` for the web views, skip `frames.save` and read toggles from the argument domain; (3) add a WKUserScript at `.atDocumentStart` that forwards `error` and `unhandledrejection` as `{op: 'smokeError', msg}` over the finsical handler, and print them in the JSON line and fail the verdict when any arrived; (4) optionally load prefs, overview, stats and addons in offscreen web views and require each to register `window.__bus`.

**Acceptance.** (derived) A failing smoke test fails the release job before archiving; an `unhandledrejection` raised after `window.finsical` exists fails the smoke run; two consecutive local smoke runs leave no saved frames or website data; with (4), a client page that stops registering `window.__bus` fails it.

**Merged and related.**

- B-75 (MACOS-01, PR #229): the translocation path bug the /private/tmp run caught.
- Related: T-32 (manual checklist; this automates its launch part), T-06 (browser suite; cannot see WKWebView), B-29 (WebKit API floor).
- Fourteenth pass: MACOS-02.

### T-36 Record the User's Guide, the JPN catalog and the DLL cursors as fidelity references

Size S · Severity low · Value 3/5 · Risk 1/5 (fourteenth pass)

**Problem.** Earlier passes inferred the original's behavior mostly from resource strings. `AQUAZONE.exe`'s strings are already cited (F-07 'FRMFOODTIMER', F-10 'Aquarium Speed:', F-13 'FRMEVENT'; this corrects the review, which said they were cited nowhere). What no document cites: the Deluxe II disc's full English User's Guide (prose inside the Director projector `Win/GUIDE/AZGuide.exe`, about 100 KB of text covering every menu command, the Individual Info fields, the filter and speed rules and an FAQ), the JPN set's 'AQUAZONE Guide・Catalog.zip' (the 1999 catalog: feature overview, guppy genetics, the guppy diary, Mekasia hints), and `aquazone.dll`'s cursors. This pass settled F-09, F-10, F-14 and F-26 from them.

**Evidence.** `grep -rn "AZGuide\|User's Guide" --include=*.md` over the repo finds nothing. The review's `fidelity/guide_extract.py` yields the text keyed by byte offset (spot-checked for about 25 quotes).

**Change.** Add a 'Primary sources' section to ANALYSIS.md (or T-11's `docs/ARCHITECTURE.md`) listing the archive.org URLs (`aquazonewithguppiesandaddons/AQUAZONE.iso/Win/GUIDE/AZGuide.exe`, `…/Updater/Data/AQUAZONE.exe`, `…/aquazone.dll`, `aquazone-jpn-set/…/AQUAZONE Guide・Catalog.zip`), the guide offsets per topic, the STR# lists used, the exe's forms and menus, and the DLL cursor ids. Optionally add `tools/az/guide.py`, a 15-line extractor (printable cp1252 runs of 40+ characters with an alphabetic ratio above 0.6, printed as '@offset: text') with a unit test on a synthetic blob; never commit the extracted text.

**Acceptance.** The section exists and F entries cite guide offsets; if the tool is added, a `tools/tests` unittest extracts prose and skips binary noise.

**Merged and related.**

- Related: T-11 (the section can live in `docs/ARCHITECTURE.md`), F-09, F-10, F-14, F-26 (settled from these sources this pass).
- Fourteenth pass: FIDELITY-14.

### T-37 Nothing checks that the LGPL notice survives in the built bundles

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** THIRD_PARTY_NOTICES.md and the FOLLOW-UPS.md constraint "LGPL decoder" rely on esbuild keeping `core/data/mace.ts`'s `/*!` legal comment in `bundle.js` and `addons.js`; that header is how the shipped JavaScript carries its LGPL notice. esbuild drops ordinary `/*` comments, so a one-character edit, or a future build flag such as `--legal-comments=none`, removes the notice from every bundle and no test notices. The same gap would let another bundle start compiling in MACE unnoticed.

**Evidence.** `core/data/mace.ts:1-9` (header), `core/data/mace.ts:17` (`MACE_TAB2_B64`), `scripts/web-build.test.mjs:33-55` (checks file presence and machine images only). Verified: in the frozen build, `bundle.js` and `addons.js` each contain 1 `SPDX-License-Identifier: LGPL` line and the table prefix `ACUAdADOAUoAJwB5`; `overview.js`, `prefs.js` and `stats.js` contain neither. Bundling `mace.ts` with esbuild gives 1 SPDX line; the same file with `/*!` changed to `/*` gives 0. Nothing in the test suite greps the bundles.

**Change.** In `scripts/web-build.test.mjs`, loop over every `dist/*.js`: when a file contains the first 16 characters of `MACE_TAB2_B64`, assert it also contains `SPDX-License-Identifier: LGPL-2.1-or-later` and `Laszlo Torok`. Also assert that `bundle.js` and `addons.js` contain the tables, so the test cannot pass vacuously.

**Acceptance.** The `/*!` to `/*` mutation fails the new test; main passes.

**Merged and related.**

- Related: T-03 (notices in the app bundle), T-13.
- Fourteenth pass: TOOLING-04.

### T-38 README and CHANGELOG lag the last dozen commits: four machine cases, a storage key and the starter-set size

Size S · Severity low · Value 2/5 · Risk 1/5 (fourteenth pass)

**Problem.** (1) README's Preferences row lists the cases as "Macintosh Plus, Performa 450, 20th Anniversary Mac, iMac G3 and G4 variants, or a bare tank", omitting Performa 5200 and 5200 (Black) (#173) and PowerBook G3 and iBook (Tangerine) (#169); CHANGELOG "Unreleased" has no entry for #169, #170 (Performa 450 (II)) or #173. (2) "Your data" lists the `finsical:*` keys but omits `finsical:starterSounds` (#172). (3) A CHANGELOG Unreleased bullet still says Stock the Tank downloads "three fish, a gravel, a plant and a background (about 1 MB)", while the starter set now includes AZ_WAVES (1,155 KB), README says about 2 MB, and another Unreleased bullet says the set includes the sounds.

**Evidence.** `README.md:171`, `README.md:180-190`, `README.md:50-52`, `CHANGELOG.md:161-163` versus `CHANGELOG.md:25-27`, `web/machines.ts:137-302` (16 entries), `web/welcome.ts:15`, `web/starter.ts:13-21`. Verified: `grep -rhoE '"finsical:[a-zA-Z:-]+"' web` gives 11 keys plus the legacy `finsical:thumb:` prefix, and README names 10; `grep -i "powerbook\|ibook\|5200"` finds nothing in README.md or CHANGELOG.md.

**Change.** README.md:171: name the case families (Macintosh Plus, Performa 450 and 5200, 20th Anniversary Mac, iMac G3 and G4, PowerBook G3, iBook, or a bare tank). README "Your data": add `finsical:starterSounds` (whether the tank has had its one offer of the game's sounds). CHANGELOG Unreleased: one bullet for the new and changed cases, and fix the welcome bullet to "three fish, a gravel, a plant, a background and the game's sound effects (about 2 MB)". Optional `scripts/docs.test.mjs`: every `"finsical:…"` literal in `web/*.ts` other than the `finsical:thumb:` prefix appears in README.md.

**Acceptance.** Both greps above find the new names; the optional docs test passes and fails when a new `finsical:` key is added without a README line.

**Merged and related.**

- Related: T-10 (versioned CHANGELOG sections) stays separate.
- Fourteenth pass: TOOLING-05.

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
- **AquaZone saved tanks as .azn documents** (F-26): verified in the
  fourteenth pass (FIDELITY-13): the Open Aquarium filter is 'Tank
  Files (*.azn)' and the guide calls tank files "AZN" files (evidence
  in F-26). Finsical still lists .azn as importable scenery and saves
  tank files as `.finsicaltank`, since it can't write 9003 containers.
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

### Refuted or dropped in the tenth-pass review (tmp.md)

Checked against `origin/main` `62b8572` with node/vitest/typecheck;
code citations are from that revision. Do not re-raise them without
new evidence.

- **Clamp `decorScale` against non-positive scales**
  (`web/render.ts:121-123`): unreachable. Scale goes <= 0 only if
  `tankH <= 8` (the constant 200) or `h <= 0`; the sole caller guards
  zero-area art (`web/render.ts:132`).
- **Panic cascades past `MAX_PANIC_HOPS` within one tick**
  (`core/sim.ts:387-399`): the depth bound holds. A fish reached as
  `b` spreads as `a` later in the same tick, but every transmission
  adds one hop and stops at the cap; only the timing compresses (by
  milliseconds at 30 tps), not the depth.
- **`fishAt` picks the last fish instead of the nearest**
  (`core/sim.ts:343`): `d <= bd` only ever replaces with an
  equally-near-or-nearer fish; exact ties (mirrored equidistant bodies)
  go to the later roster entry, deterministically. The "nearest centre"
  contract holds.
- **The Add-ons sound-drop success message fires for evicted records**
  (`web/addons.ts:63`, `web/store.ts:213-227`): merge failures already
  return before posting, and `capSnds` eviction needs over 64 MB of
  stored WAVs against a ~2 MB full set. Vanishingly rare; no change.

### Refuted or dropped in the twelfth-pass review (tmp.md)

Checked against `origin/main` `62b8572` with node/vitest/typecheck;
code citations are from that revision. Do not re-raise them without
new evidence.

- **Clear `sim.notice` while the pointer is in the feed zone**
  (`web/main.ts` pointermove): dropped by the reviewer — a fish
  crowding the feed point is the point of the attraction; it eats
  the pellet about to drop, and AquaZone fish do rush the feeding
  spot. The "photobombing" framing was wrong.
- **`unlock()`/`play()` resume races need one `requestResume()`**
  (`web/audio.ts`): fixed rather than refuted — PR #185 folds both
  through a shared `requestResume()`; recorded here because tmp.md
  listed it as a finding.
- **The drop guard should only `preventDefault` file drags** (PR
  #186 round-1 suggestion): applied differently on evidence —
  `preventDefault` stays unconditional because WebKit navigates on
  dropped text and URLs too; `dropEffect: 'none'` is set only when
  the drag carries `Files`.

### Refuted or dropped in the fourteenth-pass review (tmp.md)

Checked against `origin/main` `62b8572` (code unchanged at `e9360a8`)
with vitest, node drivers, Playwright and real archive.org packs.
Review IDs (SIM-01, TANK-02, ...) map to entries through the
fourteenth-pass list in the ID map. Do not re-raise these without new
evidence.

#### Fish simulation review

- "The hover.diff prototype settles the watcher on its standoff ring": it removes the wobble, but it stops fish by half the standoff, so big fish settle with the cursor over their head and a fish under the pointer is held there (the pointer stays on the body in 16 of 60 runs). SIM-01's Change and Acceptance were corrected.
- "Sleeping big fish drop below the tank's bottom edge" as its own bug: the depth follows the documented EDGE_KEEP call and its test; on the stocked tank the banggai's painted body reaches the bottom row rather than being visibly cut. Kept only as SIM-05 polish.
- "Give timer mode a real 24-hour appetite": with no closed-time catch-up (F-09) and no ticks while hidden (B-53), fish in a tank opened briefly each day would almost never get hungry. SIM-04 was corrected to a life-pace setting instead.
- "The leader-follower school halves head-on crossings": on main, schooling does triple crossings (33 against 12 per minute), but the prototype only brings them to 28; the claim is kept for alignment (47% to 68%), not crossings.

#### Tank page review

- None of the 18 findings was refuted outright. Corrections that were applied:
  - TANK-02: the features must go on the probe `window.open("", target)` call.
  - TANK-04: the F key is not bounded, because feedPinch drops at least one pellet per press.
  - TANK-05: the line cites were wrong; `fishAtPoint` must keep the drawn line; the native default window is affected.
  - TANK-07: the dark scrim is baked in too.
  - TANK-09: B-37's install half is already fixed.
  - TANK-10: the menu bar does not open tank tabs.
  - TANK-16: this is D-09's merged idea, and the composite scale must keep the tank at 2x.
  - Relations corrected: TANK-11 and TANK-15 extend A-05, TANK-14 extends U-27, TANK-17 extends F-02, and TANK-03's cursor point duplicates U-03.

#### Add-on import review

None. All twelve findings reproduced or held up in code reading. The corrections are:
- IMPORT-01: the cap check must count parts after the fetch.
- IMPORT-05: severity lowered to low.
- IMPORT-07: thumbnail keys are `thumb2:`, and the Fish total is about 161 MB against a 157 MB budget.
- IMPORT-09: list Mule1 only, and leave the letters to D-20.
- IMPORT-11: acceptance uses the synthesized fixtures.
- IMPORT-12: the double decode is B-18's remainder.

#### Sound review

- The launch loop restart makes an audible click (AUDIO-01): in the app, the opening sound starts in the same render quantum and masks it. In a browser, it happens while the context is still locked.
- Starting the bank alongside the art makes the stocking splashes audible (AUDIO-02): the fish land 2.5 to 4.5 s after the click, and the bank needs about 7 s.
- Install feedback makes the loop '1.2x as loud' (AUDIO-03): the combined gain is 1.2 against the loop's 0.4, so it is 3x (+9.5 dB).
- 'Only 9 of the 25 game sounds ever play' (AUDIO-10): 12 play, across 9 kinds of event.

#### Client windows review

- UI-13's plan to memoize the guppy thumb under the existing key: the key `f:<id>:` does not change when a stand-in adopts art, and Overview never repaints a box that has an image, so the stale thumb would stick. Replaced with a stand-in key marker.
- UI-09's 'fractional filter edge blurs the bitmap text': not established; headless Chromium draws subpixel colour fringes on both the count and the Filter placeholder. Dropped; the whole-pixel width stays as a tidy-up.
- UI-19's 'list imported plus bundled sounds and play them with playImported': playImported only plays imported records, and music belongs to F-05. Narrowed to imported effects.
- UI-01's 'caption starts about 2 px under the group box': measured 4 px (group bottom 392, `#pfdesc` top 396); the finding stands.
- UI-03's 'medium' severity: the two-click arm works and the defect is cosmetic plus a HIG mismatch; filed as low.
- UI-07 as a new extension of U-06: U-06 already specifies 'No fish', the header count and selecting the `a:${pack}` row; filed as a duplicate.

#### Visuals and CRT review

- Pre-decoding the next case with `new Image().decode()` before the innerHTML swap (VISUAL-02's proposed fix): measured in Chromium, still 2 caseless frames on each of three switches; only awaiting the new `<image>` element's own load (double-buffered) removed them.
- The menu-bar clock drawn over the Help title as a practical problem (VISUAL-04): it needs a page narrower than 243 CSS px, which desktop browsers do not allow without extreme zoom, and the native shell has no bar. Kept only as an optional nit.
- "#fishtip is placed by the flat mapping" (VISUAL-03): the tip follows the pointer (`web/main.ts:345-348`); only which fish it names depends on the mapping.
- Per-tube display claims (a Trinitron on the Performa 450's monitor, a shadow mask on the iMac G3) (VISUAL-07): unverified; do not encode them.
- VISUAL-12's metric values (17.9 / 26.0 / 21.7): not reproduced with a per-channel neighbour-difference metric (10.4 / 14.4 / 12.0); the ordering holds.
- A Preferences prewarm of neighbouring case images (VISUAL-02's optional step): the Preferences window is another page, and pre-decoding does not remove the gap anyway.

#### Performance review

- PERF-04's proposed `MAX_TICKS_PER_FRAME = 2`: would slow the sim below real time on displays under 15 fps, breaks the existing 100 ms-frame test, and conflicts with F-10's fast-forward; replaced by lowering MAX_FRAME_MS to 100.
- PERF-06's "about 15 ms off DOMContentLoaded": not reproduced (no consistent difference over 3 paired runs); only about 6 ms of the first long task remains.
- PERF-01's "below 300 ms after step 1" as an absolute bar: the patched build measured 283 and 317 ms; use a relative bar.

#### macOS shell review

- MACOS-08 "Show on All Desktops also floats the tank over every full-screen app": not substantiated. The only evidence is the `.fullScreenAuxiliary` flag and its one-line documentation. Public reports widely say a regular (non-agent) app's window does not join another app's full-screen Space without LSUIElement or a non-activating NSPanel, so neither the covering nor the energy claim follows from the code. Check it on a Mac as part of T-32's "Spaces and full-screen behavior" item; if the tank does appear over full-screen apps, reopen it with the reviewer's "Show Over Full-Screen Apps" toggle. The `.participatesInCycle` gap in that branch is already a FOLLOW-UPS item.

#### AquaZone fidelity review

- **'Touch users in a browser get only an Add-ons… button'** (FIDELITY-04's premise): the Osmium menu bar now mounts in every browser, touch included (`web/menubar.ts` `mountTankMenuBar`, `web/app.css:56`).
- **'The Mekasia story ships as accessories Finsical never lists'** (FIDELITY-08's premise): the Japanese letters and crystals already list under JPN Accessories; only the English copies and the Mule fish are missing.
- **'The FshI 0x148 string is up to 31 random printable characters'** (FIDELITY-09): blackmolly's are '01', '02', '09' and clownfish's contain control bytes.
- **'AQUAZONE.exe's forms and menus are cited nowhere'** (FIDELITY-14): F-07, F-10 and F-13 already cite them.
- **'Starter .azn tanks carry no fish' as a general rule** (FIDELITY-13): true of the CD's starter tanks only; AROWANA ADAM&EVE carries fish (B-23).

#### Delight review

- DELIGHT-07's begging-pellet and gasping glyphs: dropped. They are hunger and maintenance reminders drawn over the fish, which ANALYSIS declines ("not a Tamagotchi; reminders, if any, are fish behavior"), and begging and gasping already show as behaviour.
- DELIGHT-21's "small hand over the water" cursor: already U-03 (HAND and KNUCKLE cursors); not a new item.
- DELIGHT-05's "the lamp jumps from 0.3 to 1.0": only when the schedule is in daylight. At a scheduled night the lamp switch leaves the light at the night floor.
- DELIGHT-02's order "bubble test before the feed zone" (from the prototype and proposal): it would swallow feed clicks next to a bubble about to pop. The test belongs in the water branch.
- DELIGHT-09's "60°N December day is 5.5 h" test: that pins the geometric sunrise; with the standard -0.833° altitude it is about 5.9 h.

#### Tooling, tests and docs review

- "The unused sndFmt1Mace is gone" (T-13 evidence): it still exists and is now used by a test (`snd.test.ts:281`); the conclusion that tsc is clean holds.
- "The CRT shader gap is medium severity": main has no defect; it is a missing guard (kept as low).
- "F raises food from 0 to 2" as a test oracle: the pinch depends on hungry fish (3 in this pass's run); assert an increase.
- "T-03 part (1) is done": only the bundle copy is; the notices still omit Osmium UI and the archive.org content.

#### Corrected in the fourteenth-pass fold

Stale claims in existing entries, corrected in place (each entry
carries the correction):

- B-44: the 17 legacy accessories are repeated ISO 9660 directory
  sectors, so its decoder follow-up and dim-the-row plan are dropped
  for the 7z substitution (IMPORT-03).
- B-13: the plan to route a sheet-less .rez to backgrounds and its
  decodeBlob/sectionFor design are dropped; (a) to (c) landed in
  `web/drop.ts`, and no real .rez carries a backdrop (IMPORT-04).
- B-42's loadProblem wording item and B-14's "persist dropped bytes"
  follow-up are done on main; B-23(a)'s idea of spawning a preset's own
  fish was declined in PR #93's review and stays as context only.
- P-20's bubble-cap half is obsolete (tap and startle spawn no bubbles;
  about 22 on screen at most); only the pellet cap remains. P-10's
  "13 texels per device pixel" is now 18; P-11 is 15 PNGs, 17.2 MB;
  P-17's "likely sub-millisecond" guess measured 1.7 to 2.2 ms a step.
- D-01's 0.45-vs-0.5 sleep threshold is resolved on main; D-22's
  "anniversary line done in PR #182" is stale (#182 is unmerged); D-26's
  "open PR #132 assigns L" is outdated (L is the lamp on main).
- T-30: Swift now calls feedFish, changeWater, toggleCrt, toggleLights,
  toggleMute and togglePause (still never openImport); T-31's
  fitBackdrop is in `web/main.ts`, not `web/render.ts`; T-29's menu-bar
  prerequisite is met; T-13's ruff count is 16 and sndFmt1Mace is used
  by a test.
- U-01: today's Feed Fish pinch drops one pellet per hungry fish (1 to
  5, on setTimeout), not PR #158's fixed random count; U-27's .dbwin is
  still unclamped on main (PR #184 is open).
- B-17: `mediaTypesRequiringUserActionForPlayback = [.video]` is
  already on main (`macos/Finsical.swift:165`), so its native flag is
  closed.
- Thirteenth-pass notes, placed during this fold: PR #228's timed
  feeder is F-07's (the thirteenth-pass list said "F-22 part"; F-22
  was the game's sound bank, now on main), so its note moved to F-07;
  PR #206's note moved from F-17 to F-16 (its list says F-16 part);
  the N-20 starfield variant moved from V-24 to V-23, where its list
  says it folded; the B-04 note on PR #193 moved to PR #218's
  Completed entry when B-04 closed.
- The thirteenth-pass notes set the `claude/` branches aside as the
  maintainer's. The `claude/` PRs #208 to #242 are the fourteenth
  pass's sixteen review PRs, listed in its Completed section.

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

### Tenth pass (this pass, PRs #179, #180, #182)

Final scorecard (automated GLM 5.3 reviewer rounds; every PR reached
steady state and was left open for human review and merge):

| PR | Branch | Items | Rounds | State |
| --- | --- | --- | --- | --- |
| #179 | `audit/page-metadata` | V-19 viewport half | 2 (R1 minor + 2 info fixed `734259f`; R2 0 actionable) | steady |
| #180 | `audit/prefs-off-caption` | dimmed-slider captions | 2 (R1 major verified non-issue + hardened, minor fixed `4e8f5ca`; R2 minor-only, declined) | steady |
| #182 | `audit/tank-milestones` | D-22 anniversary line | 2 (R1 2 minors fixed `6577ddd`; R2 minor-only, declined) | steady |

- Applied:
  - #179: R1 noscript blocks hide their page's empty window chrome;
    `color-scheme` light on the platinum pages (dark on the tank page,
    matching its #000 background; no color-scheme existed in CSS);
    og:title/og:description/og:type on index (`734259f`).
  - #180: R1 one hoisted PANES lookup shared by both hint paths, with
    the invariant documented (only Monitor/Picture mount key sliders,
    both define offHint, `syncEnabled` dims exactly those inputs);
    truthy off-hint check with an empty-hint test (`4e8f5ca`).
  - #182: R1 hoisted `uptimeMin` so the stats literal is complete at
    construction; month tier reworded for older tanks (`6577ddd`).
- Declined with reasons:
  - #179 R2 og:image (needs an absolute URL; no canonical domain or
    promo asset exists; suggest adding both with a hosted image later).
  - #180 R1 hint discriminant on `Caption` (single caller; contract
    pinned by doc comment and tests); extending the off-hint to
    Sound/Lighting controls (muted-volume and disabled-timer values
    persist and reapply, while CRT-off slider values are inert); R2
    Record-keyed pane lookup (the suggested `as` cast verifies nothing,
    and the lookup provably cannot miss today).
  - #182 R2 pinning the "or more" wording in the test (one-line
    follow-up in `web/statsmodel.test.ts`, left for the merger).
- Refuted with evidence: the tenth-pass "Refuted or dropped" entries
  above (decorScale, panic depth, fishAt ties, sound-drop message).
- Verified: `npm run typecheck` clean and `npx vitest run` 38 files /
  471 tests green at baseline, plus the new suites (475 with #180's
  caption tests, 474 with #182's milestone tests on their branches);
  `npm run build` ok on every branch. Native behavior code-verified
  only (no macOS runner); CI (core-linux + native-macos) green on all
  three PRs.
- Process note: the shared worktree lost committed lines once mid-pass
  (another session on the same filesystem); always inspect `git diff`
  before committing and confirm it holds exactly the intended change.
- Review gaps: none; every PR completed two GLM rounds.

### Eleventh pass (this pass, PRs #181, #183, #184)

Final scorecard (automated GLM 5.3 reviewer rounds; every PR reached
steady state and was left open for human review and merge):

| PR | Branch | Items | Rounds | State |
| --- | --- | --- | --- | --- |
| #181 | `fix/tap-song-hijack` | B-19 word-matching half | 2 (R1 info fixed `10fa18e`; R2 0 actionable) | steady |
| #183 | `fix/loop-hour-guards` | frame-pacing + hour-label guards | 3 (R1 minor + info + outside-diff minor fixed `fa79c0c`; R2 minor fixed `4cdcaa6`; R3 0 actionable) | steady |
| #184 | `fix/small-css-nits` | tank cursor, fish tip, doc windows | 2 (R1 minor fixed `a4bdb3c`, info verified; R2 0 actionable) | steady |

- Applied:
  - #181: R1 one-sentence contract on `find()` (subs must be single
    lowercase words; `[^a-z0-9]` splits the rest) (`10fa18e`).
  - #183: R1 non-finite-dt and dropped-dt doc wording, plus the
    finite-but-huge acc / near-zero step tick cap (`ABSOLUTE_MAX_TICKS
    = 10_000`, excess dropped like a stall) (`fa79c0c`); R2 exact
    tiny-step pin `{ ticks: ABSOLUTE_MAX_TICKS, acc: 0 }`
    (`4cdcaa6`, prediction confirmed green).
  - #184: R1 viewport margin 16px to 24px for classic scrollbars
    (`a4bdb3c`); the tooltip vertical-clamp info verified against
    `web/main.ts` (text set before both-axis clamp) with no change.
- Declined with reasons: none; every suggestion was applied or already
  satisfied.
- Refuted with evidence: none new this pass (all round-1 findings
  held up); the tenth-pass "Refuted or dropped" entries stand.
- Verified: `npm ci` from scratch, `npm run typecheck` clean,
  `npm test` 38 files green on every branch (471 baseline, 473 with
  #181's tap tests, 475 with #183's loop/light tests); the new loop
  hang reproduced by suite timeout (exit 124) before the fix and
  passes in ~250 ms after. The Python suite was not re-run (no tool
  changes). Native behavior code-verified only (no macOS runner); CI
  (core-linux + native-macos) green on all three PRs.
- Finding-to-entry map: fixed-in-PR (no new open entry) — `loop` hang
  and `hourLabel` (#183), tap word matching beyond B-19 (#181),
  cursor/tip/dbwin (#184); new open entries — B-56 through B-61, P-24,
  V-26, V-27; updated entries — B-19 (word half done), U-03 (cursor
  narrowed), U-27 (dbwin clamp done); mapped without new entries —
  decoder hardening to S-02..S-06, `sndbank` comparator to S-05,
  `zip` stored-cap/CRC to S-04, fetch.py gaps to
  T-05/T-16/T-19/T-21/T-22/T-23, macOS shell nits to B-28/B-50/T-25
  and FOLLOW-UPS, P-02/P-04/P-05/P-06/P-07/P-08/P-11/P-12/P-16/P-18/
  P-20/P-21/P-22/P-23 frame and packaging costs, AquaZone gaps to
  F-01/F-03/F-04/F-05/F-06/F-07/F-09/F-12/F-15/F-17/F-24/F-25/F-26/
  F-27/F-28/F-29/F-30/F-31/F-32/F-33 and B-23/B-33/B-54/V-06/V-07,
  delight ideas to their D entries (D-02/D-09/D-10/D-11/D-12/D-13/
  D-15/D-21/D-22/D-23/D-24/D-26/D-27/D-28/D-29/D-31, F-13/F-17).
- Review gaps: none; every PR completed at least two GLM rounds.

### Twelfth pass (this pass, PRs #185-#201)

Automated GLM 5.3 reviewer rounds; PRs are left open for human review
and merge. Round counts at fold time (#201 still had a review round
running on its latest commit — marked "running"):

| PR | Branch | Items | Rounds | State |
| --- | --- | --- | --- | --- |
| #185 | `devin/audio-fixes` | B-17, B-19 length cap | 1 (R1: 1 declined nit) | quiet |
| #186 | `devin/client-drop-guard` | B-25 web half | 2 (R1 applied `1b942e6`; R2 clean) | steady |
| #187 | `devin/fetch-py-fixes` | T-21, T-22, T-23 | 3 (R1 applied `ad68d38`; R2 applied `11813e5`; R3 clean) | steady |
| #189 | `devin/food-cap` | U-01 | 3 (R1 applied `0eb894b`; R2 applied `88e573d`; R3 clean) | steady |
| #192 | `devin/stereo-sound` | D-08 | 2 (R1 applied `8ef6619`; R2 clean) | steady |
| #197 | `devin/small-ui` | V-19 favicon, B-44 UI, B-51 | 2 (R1 applied `e7ec845`; R2 clean) | steady |
| #201 | `devin/snds-merge-strict` | B-39 main case | 4 (R1 applied `86874ea`; R2 applied `0783cc1`; R3 applied `d154201`; R4 running) | open |

- Applied:
  - #186: `dropEffect: 'none'` on file drags for an honest no-drop
    cursor; `preventDefault` kept unconditional (dropped text/URLs
    also navigate) (`1b942e6`).
  - #187: NUL truncation of entry names, moved to the raw bytes so a
    post-NUL byte can't fail the surviving prefix's decode; explicit
    assertion that fixture names are written unflagged; `with` block
    on the flag-check ZipFile (`ad68d38`, `11813e5`).
  - #189: cap comment corrected — six pellets still foul faster than
    filtration (`0eb894b`); refusal throttle seeded `-Infinity` —
    `performance.now()` counts from page load, so `0` suppressed the
    first alert for 60 s (`88e573d`).
  - #192: feed pans to the clamped `pellet.x`, not the requested x
    (`8ef6619`).
  - #197: legacy-pack status line reuses `loadProblem` (`e7ec845`).
  - #201: `sndsPut` resolves an explicit `true`, is typed
    `Promise<boolean>`, and the falsy-write stub uses `false`
    (`86874ea`, `0783cc1`, `d154201`).
- Declined with reasons: #185 R1 — an explicit
  `vi.unstubAllGlobals()` inside one test; the file's `afterEach`
  already unstubs every global for every test.
- Refuted with evidence: none; every factual claim checked out.
- Verified: `npm run typecheck` clean on every branch; vitest 34
  audio tests (#185, #192), 23 import tests (#197), 9 store tests
  (#201), full suite green; 80 Python tests (#187); the
  `performance.now()` throttle bug confirmed by reading the API
  contract before applying.
- Finding-to-entry map: closed and removed — B-16 (verified fixed
  on main, no PR needed), B-51, V-19, D-08, T-21, T-22, T-23;
  narrowed — B-13, B-17, B-19, B-25, B-39, B-44, U-01; new open
  entries — B-62, B-63, B-64, P-25, P-26, U-30, U-31; annotated
  without new entries — P-21 (weak premise), B-35 (same fix as
  N-12); dropped by the reviewer — N-6 (notice in the feed zone is
  desirable).
- Review gaps: #201 had a review round still running at fold time;
  all other PRs reached two quiet rounds or steady state.
  A heartbeat keeps polling the open PRs.

### Fourteenth pass (this pass, PRs #208-#242)

Automated GLM 5.3 reviewer rounds; PRs are left open for human review
and merge. Every PR reached steady state with CI green on its head.
Review IDs in the Items column are this pass's `tmp.md` IDs; the ID map
has their entries.

| PR | Branch | Items | Rounds | State |
| --- | --- | --- | --- | --- |
| #208 | `claude/mekasia-sections` | F-24 (IMPORT-02, FIDELITY-07) | 3 (R1 applied `d43a5cf`; R2 applied `16be9c0`; R3 clean) | steady |
| #210 | `claude/sound-bank-caps` | S-05, T-39 (IMPORT-11, TOOLING-01, TOOLING-07) | 2 (R1 applied `80d0cb1`; R2 applied `0294cf5`) | steady |
| #211 | `claude/pop-bubbles` | D-41 (DELIGHT-02) | 3 (R1 applied `fdc96d0`; R2 applied `1d22516`; R3 clean) | steady |
| #212 | `claude/fish-names` | F-37 (FIDELITY-03, DELIGHT-03) | 1 (two integration failures on `3a56a65`; R1 on `726e2ab`: Major refuted, info not reproduced) | steady |
| #213 | `claude/food-roll-cost` | B-67 (SIM-02) | 2 (R1 applied `55e3faf`; R2 clean) | steady |
| #214 | `claude/staggered-sleep` | B-66 (SIM-03) | 3 (R1 applied `e132189`; R2 applied `c80354d`; R3 nit deferred) | steady |
| #215 | `claude/watcher-hover` | B-65, D-02 fade (SIM-01, SIM-09) | 2 (R1 applied `ffdf20c`; R2 info declined) | steady |
| #218 | `claude/pack-parts` | B-04 (IMPORT-01) | 3 (R1 applied `c1fd7ec`; R2 applied `bf45e2b`, Major refuted; R3 declined) | steady |
| #220 | `claude/client-popups` | U-32 (TANK-02) | 2 (R1 applied `66687a6`; R2 clean) | steady |
| #223 | `claude/paused-taps` | B-69 (TANK-06, SIM-08) | 2 (R1 applied `239e33c`, Major refuted; R2 clean) | steady |
| #225 | `claude/prefs-fit` | V-30, V-31 part (UI-01, UI-02) | 1 (clean) | steady |
| #226 | `claude/fast-decode` | P-02 first slice (PERF-01) | 2 (R1 applied `c215d55`; R2 declined) | steady |
| #229 | `claude/translocated-app` | B-75, T-35 (MACOS-01, MACOS-02) | 3 (R1 applied `313d4aa`; R2 clean; R3 declined) | steady |
| #239 | `claude/bmp-backdrop` | B-13 `.bmp` (FIDELITY-06) | 2 (R1 applied `1b4df2a`, one Major refuted; R2 declined) | steady |
| #241 | `claude/welcome-retry` | B-68 (TANK-01) | 1 (clean; minors refuted) | steady |
| #242 | `claude/night-torch` | D-40 (DELIGHT-01) | 1 (all refuted) | steady |

- Applied:
  - #208: tests for uppercase extensions and plant records;
    `SCENERY_BY_EXT` became a `Map`, because a URL ending in
    `.constructor` made `sceneryFix` save `Object` as the section
    (reproduced first).
  - #210: Python bounds checks for over-long reference lists and
    payloads past the end, as the TS readers do; a 3 s timing bound; a
    whole-list assertion.
  - #211: the user "Pop!" sound's gating test and one `feeding` local;
    the Bubble sounds blurb names both added sounds, with the reviewer's
    wording corrected (the plip is synthesized, not an added sound).
  - #213: `sqrt` instead of `hypot` in `nearestFood`; the failure
    message names the eaten flags.
  - #214: exported the bedtime and lie-in constants and derived the
    tests' waits from them; then moved a derivation that had landed on
    the wrong test (the water-change test's 400 instead of the
    dawn-wake test's).
  - #215: a watcher covered by the pointer at the glass finned there at
    cruise / 3 (600 of 600 ticks covered, reproduced); it now clears by
    the room each way needs and holds when neither can. The reviewer's
    target clamp alone would not have fixed it.
  - #218: `reconcileFish` takes a part only from its own add-on's slot;
    `handleSheets` names fish itself and aliases the add-on name to its
    first pack; the count parameter became `partCount`.
  - #220: the title-bar clamp (`POPUP_CHROME` 40), a `ClientPage`
    union, an oversize-screen test and a Safari note.
  - #223: SURFACE-relative test rows and the first tap row.
  - #226: skip colour-0 runs and hoist the copy bounds check (335 ms
    on main, 184 ms after the first commit, 102 ms after round 1);
    maximum-length clipping tests; random streams biased toward zero
    and maximum runs.
  - #229: a cancelled tank load (NSURLErrorCancelled, e.g. quitting
    mid-load) no longer shows the fatal alert; smoke-test lines are
    serialized JSON; CI copies the smoke-tested /Applications bundle.
  - #239: a picture whose decode throws is skipped like a throwing pack
    (mocked-throw test failed first).
- Declined with reasons:
  - #208 R1: persisting the migrated add-on list at load
    (`installedAddons` is the only reader; `saveTank` rewrites it
    within 10 s).
  - #210 R3 (after steady state): the Python cap counts distinct
    offsets, including out-of-range ones, where the TS readers count
    emitted records. Adversarial-input parity only; carried in S-05.
  - #214 R3: the CHANGELOG's "over a few seconds" understates the 2 to
    22 s bedtime spread and up to 11 s lie-in; a wording nit after two
    minor-only rounds, left for the maintainer at merge.
  - #215 R1: clamping the hover height (`room()` clamps y every tick);
    a two-sided notice age (the Sim is a module constant and its tick
    count only grows); naming one-off hover gains. R2: a CHANGELOG
    sentence for the at-glass edge case.
  - #212 R1 (info): re-measuring the tags after a late font swap. Not
    reproduced: the Osmium bitmap faces are built from in-memory bytes
    and were loaded before the first tag at 1x, 6x and 20x CPU
    throttling; a stale width would put a "Fish" tag 1 px off-centre.
  - #218 R3: the `refuse()` fish count includes non-fish sheet packs
    (its only implementation returns null for non-fish sections).
  - #220 R1: `scrollbars` in the popup features (a popup without it
    still scrolls and shows a 15 px gutter in Chromium; in the current
    HTML spec the token only feeds the popup check).
  - #226 R2: a truncated maximum-copy test (a stream cut mid-copy has
    no later record, so the advance cannot change output) and a
    strided-loop comment (the doc comment already states column-major
    order).
  - #229 R3: a fallback for failed smoke-report serialization (a
    `[String: String]` dictionary is always a valid JSON object).
  - #239 R1: keying the restored image by file name (image keys are
    never read; both paths use the `local:` URL as the source) and
    re-checking `BACKDROP_MIN` on restore (only passing pictures are
    stored). R2: guarding `decodeBmp` on the restore path (restore
    catches each item's rejection and retries it next launch).
- Refuted with evidence (PR comments posted where a Major or blocker
  label could mislead a merge):
  - #208 R1 red "dangerous exec": `RegExp.prototype.exec`, not
    `child_process.exec` (FOLLOW-UPS already records the same scanner
    false positive).
  - #212 R1 [Major] "the per-frame tip refresh resurrects the hover
    balloon over the tags": that block runs only while the tip is
    showing and never shows it; the one path that shows it is gated by
    `!namesOn`.
  - #218 R1 info notes (the drop-time part equals the restore entry by
    construction; the drop path already refuses on a full tank) and R2
    [Major] "the add-on-name alias goes stale after a reinstall" (sheet
    slots are append-only, removal drops the alias, species-only fish
    migrate at the first remap).
  - #223 R1 [Major] "dropping the paused accumulator reset
    fast-forwards on resume": `planFrame` clamps each frame's input and
    always carries less than one step.
  - #225 R1: ellipsis in flex rows (`.osm-row` is a block) and stale
    "Macintosh Performa" names (none outside node_modules).
  - #239 R1 [Major] "the wide-strip-to-gravel claim has no code":
    `pickBackdrop` routes images at least three times as wide as tall
    to the gravel (a 640x200 drop landed there in Chromium).
  - #241 R1: `installedAddons` is filled synchronously before
    `pristine` is computed; saved stand-ins never carry `pack: null`.
  - #242 R1 [Major] "the torch capture ignores a HiDPI transform": the
    tank canvas is a fixed 320x200 backing store and `ctx` is at
    identity when the torch copies; the paused-clock minors (`sim.light`
    follows the clock every frame and repaints on change).
- Verified: `npm run typecheck` and the full vitest suite on every
  branch (474 to 482 tests depending on the branch); the Python suite
  on #210; Playwright runtime checks for every web-facing PR; for #229,
  the macOS runner reproduced the translocation bug (the `/private/tmp`
  launch failed with NSURLErrorDomain -1100, exit 2) before the fix and
  passed both launches after it, with the Swift 6 warnings-as-errors
  build clean.
- Finding-to-entry map: see the fourteenth-pass list in the ID map.
  Closed and removed by this pass's PRs: B-04 and F-24; new IDs
  implemented directly and never listed as open: B-65 to B-69, B-75,
  T-39, U-32, V-30; new IDs kept as a remainder after their PR: D-40
  (sleepers turn from the beam), D-41 (a Stats line), F-37 (tags under
  menus, sleepers), T-35 (release job and wider smoke), V-31 (variant
  names); narrowed in place: B-13 (`.bmp` branch), D-02 (curiosity
  fade), P-02 (decode speed), S-05 (sound-record caps); verified fixed
  on main without a PR and removed: B-38, F-22, S-01, S-06, T-27,
  V-08 (D-01's sleep state landed; its polish stays open).
- Review gaps: #212's GLM job failed twice after a minute on
  `3a56a65`; the review of `726e2ab` completed (one round, nothing
  valid). #229's first review arrived while the fix commit was already
  in CI and was answered one push later.
- Process notes: three PRs (#239, #241, #242) were implemented by
  subagents in their own worktrees and reviewed by the lead before
  pushing; the lead re-ran typecheck and tests and read every diff.

### Review-response log (sixteenth pass)

- Applied: nothing yet — no review round has completed.
- Review gaps: **all three PRs (#263, #265, #272) failed the GLM job
  with `Z.ai API: HTTP 429` on every attempt** (the automatic run on
  each push, plus one spaced rerun). Rate limit from concurrent
  reviews, not a code finding. Per the stopping rules these are gaps,
  not clean rounds and not approval; CI (`core-linux`,
  `native-macos`) is green on all three, and the branches were rebased
  onto `06f7935` and re-verified after each move (typecheck clean;
  vitest 691 green, 692 with PR #263's test).
- Cross-pass overlap to reconcile at merge: another agent's
  `fix/remove-fish-repaint` covers the same repaint as R-2 inside PR
  #265. This pass did not read that branch. If it merges first, drop
  the hunk from #265 rather than fighting the conflict.
- Steady state: not reached; nothing to report as reviewed.

## Implementation Order (suggested)

Highest value per risk first. Phase 0 is a merge backlog, not new
code: about 105 review PRs are open (the thirteenth pass added 44,
the fourteenth 16), and several implement the same idea.

**Phase 0: reconcile and merge open PRs.** The thirteenth-pass set
(#188-#252, non-claude branches) already covers most of Phases 1-3
below: B-11/B-12 (#203), B-14/B-15/B-46 (#193), B-21 (#224), B-28/
B-49/B-50/V-16/U-18 (#234), B-29 (#202), B-34 (#233), B-39/B-40
remainders (#199/#221), B-48 (#236), B-55 (#195), P-01/P-06/P-12/
P-16 (#205), P-05 (#240), P-07 (#200), P-21 (#230), V-03 (#237),
V-04/V-21/U-01/U-15 (#209), V-14 (#207), U-04 (#198), U-07/U-08/
U-09/U-22 (#199), U-10 (#244), U-11/U-12 (#195), U-25 (#245),
D-02 (#243) — plus delights (#204, #206, #216, #217, #219, #227,
#228, #231, #232, #238, #246-#252) and internal overlaps to pick
between: #196 vs #205 (cache bound), #191 vs #197 (per-launch seed),
#246 vs #197 (favicon), #248 vs claude/#211 (bubble pop), #193 vs
claude/#218 (pack parts). Older overlapping sets still need the same
triage: tap ripple (#106/#107/#129), backdrop
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

**Fourteenth-pass placement.** The sixteen fourteenth-pass PRs
(#208-#242) are independent of each other and conflict only in
CHANGELOG.md. Against the thirteenth-pass set they overlap in idea:
#211 with #248 (bubble pop), #218 with #193 (pack identity) and #215
with #243 (the pointer watcher: one hovering watcher with a fade, or a
crowd on rings); #229 and #234 both change `macos/Finsical.swift`.
New and re-scoped entries fit the phases below:

- Phase 1 (small fixes): B-70 to B-74, B-76, V-32, V-36, U-37,
  U-38, P-28, P-29, T-21 remainder, T-34, T-37, T-38; pick one plan for
  'Bubble sounds' (U-33 synthesis or U-36 dimming) and close the other.
- Phase 2 (identity and persistence): B-13 remainder (.rez drops), B-44
  (7z substitution), F-34 (Mule fish and letters).
- Phase 3 (performance): P-02 remainder (SheetPick), P-11, V-29 and
  V-34 together (the machine-switch gap), V-33 (CRT moire), A-10, A-11.
- Phase 4 (tests, CI, docs): T-06 with the fourteenth pass's recipe,
  T-35 remainder (release job, page errors, stateless runs, client
  pages), T-36.
- Phase 5 (UX and visuals): U-14 remainder (menu-bar offset), U-18
  (Bare drag strip, Cmd-drag), U-34, U-35, U-39 (Tool Bar), B-35 with
  V-35, V-31 remainder, V-37, A-08, A-09, A-12.
- Phase 6 (fidelity): F-10 remainder (life pace), F-35, F-36 or F-38
  (one timer-sound plan), F-37 remainder, F-39, F-40, F-41, F-42.
- Phase 7 (delight): D-35, D-36, D-37, D-38, D-39, D-40 remainder, D-41
  remainder, D-42 (Puzzle), D-43 to D-45, D-46 remainder, A-13.

**Phase 1: small, high-value fixes (S, risk 1-2).**

1. B-06 universal binary, then T-33's v0.3.1.
2. B-11 and B-12 honest install results; B-44's 7z substitution for
   the 17 unreadable legacy accessories (the decoder plan was dropped).
3. D-01 remainder: sleep polish (the sleep state is on main; PR #214
   staggers bedtimes).
4. B-19's `kind` split (word matching done in #181, length cap in
   #185; a short song can still answer a splash) and B-40 ambient
   restarts; B-56 through B-61, P-24, V-26 and V-27 are the same
   size and ready next.
5. U-09, U-11, U-13, U-22, U-23 wording and state nits.
6. B-62 restore-dup guard, B-63 install ride, B-64 popup warning,
   P-25 thumb map — one "small polish" PR covers all four.
7. B-25's native decidePolicyFor half (web guard done in #186),
   B-28, B-49, B-50, V-15 native safety fixes (T-32 checks); B-17's
   native `mediaTypesRequiringUserActionForPlayback` flag is already
   on main (fourteenth-pass audit).
8. T-20, T-19 Python tool fixes; T-13 linters (T-21/22/23 done in
   #187).

**Phase 2: pack identity and persistence (M, risk 2-3).**

9. B-14, B-15 in one `web/tankmodel.ts` series (B-04 is PR #218,
   which starts that module), then B-23(a).
10. B-20 and B-21 scenery choice and copies (after Phase 0 decisions).
11. S-07 schema boundary (motion fields decision), P-21 (weakened:
    only helps a paused or empty tank — see its note).
12. B-37 removal authority (B-38 is fixed on main); B-46 remainder;
    B-30 cache pinning.
13. B-39 remainder (cross-instance merge transaction, thumbnail
    migration ordering — the miss-vs-failure half is done in #201),
    B-18 sound store transaction and removal; B-54 scenery PNG
    contract.
14. B-41 Swift quit save, B-53 hidden-tab policy (product decision),
    B-55 Stats history.

**Phase 3: performance and robustness.**

15. P-02 remainder, header-only sheet decode (PR #226 speeds up the
    pixel decode), then S-02.
16. P-01 bounded caches; P-05 progressive catalogue; P-07 parallel
    restore; P-06 push coalescing.
17. S-03, S-04, S-05 remainder (PR #210 caps sound records), S-08
    relay guard, S-09 dependency bumps (S-01 and S-06 are fixed on
    main).
18. P-04, P-12, P-14, P-18, P-19, P-20, P-22, P-23; P-08, P-09, P-10, P-11,
    P-15, P-16, P-17 only after measurement.

**Phase 4: tests, CI and docs.**

19. T-06 browser smoke suite (hosts V-08's GL probe), T-14 pinned CI
    with the Python matrix, T-15 complete web build.
20. T-07 parity corpus, T-08 and T-09 extractions and fixtures, T-17,
    T-18 typed bus, T-16.
21. T-10 CHANGELOG sections, T-11 ARCHITECTURE.md, T-12 quick
    reference, T-03 remainder, T-24, T-25, T-26, T-28, T-30,
    T-31, T-32 checklist; T-29 Pages once U-14 is merged; T-02
    remainder if the owner wants notarization.

**Phase 5: UX and visuals.**

22. U-02 remainder, U-03 (after the ripple PRs), U-04 undo, U-06
    statuses, U-07 remainder, U-08 sorting, U-10 drop feedback, U-12,
    U-28 visible states, U-24 progress and Stop.
23. V-09 decor previews (reuse `decorCanvases`), V-10 remainder, V-04
    gravel and sim floor, V-06 tilt smoothing, V-14, V-16, V-18 (V-08
    is fixed on main).
24. U-14 (if the menu-bar PRs are dropped), U-15 contextual menu, U-18,
    U-20 remainder, U-21 real plant names (after F-01), U-25, U-26,
    U-27, U-29; U-30 Get-Info card and U-31 multi-center pinch (with
    U-01's open point 3) fit here too.
25. V-03 integer scale and V-05 4:3 tank (L, decision needed), V-07
    authored pitch poses (after F-01).

**Phase 6: AquaZone fidelity.**

26. F-01 resource map (unlocks most of this phase), then F-02 names
    and Get Info (with #137), B-33 scripts, F-11 growth rings.
27. F-21, F-23, F-25, F-34 more content from archive.org (F-22 is on
    main; F-24 is PR #208).
28. F-05 remainder jukebox, F-06 foods, F-07 feeder, F-10 speed, F-14
    filter, F-13 Tank Log, F-26 save files, F-27 Dock drops, F-29
    picture controls, F-30 history, F-31 dimmer, F-32, F-33.
29. Product decisions first: F-09, F-12, F-15, F-16, F-17, F-18,
    F-19, F-20, F-28, F-04, B-23(b).

**Phase 7: aesthetics and delight as seasoning.**

30. A-04 About This Aquarium, A-05 Balloon Help, A-06 icon, A-02
    depth modes, A-03, A-07.
31. D-03 separation, D-06 remainder, D-09, D-17, D-04,
    D-10, D-15, D-12 remainder, D-14, D-16, D-18, D-19, V-20 remainder
    to V-25.
32. D-11, D-13, D-20, D-21, D-22 to D-31 last (D-22's anniversary
    line done in #182; diary messages, per-fish stats and save
    round-trip remain).

---

*Merged from fifteen review passes: passes one to eight were already
folded into the previous ANALYSIS.md; the ninth pass's full-repo
`tmp.md` review and its scorecard are folded here, with implemented
items moved to the ninth-pass Completed section; the tenth pass's
`tmp.md` review, its three PRs (#179, #180, #182) and its refutations
are folded into the tenth-pass sections in the same way; the eleventh
pass's `tmp.md` review, its three PRs (#181, #183, #184) and its nine
new entries (B-56 through B-61, P-24, V-26, V-27) are folded into the
eleventh-pass sections in the same way; the twelfth pass's `tmp.md`
review, its seven PRs (#185, #186, #187, #189, #192, #197, #201), its
seven new entries (B-62 through B-64, P-25, P-26, U-30, U-31) and its
refutations are folded into the twelfth-pass sections in the same way;
the thirteenth pass's `tmp.md` review, its 44 PRs (#188-#252, minus
the maintainer's claude/ branches), its new entries (P-27, V-28,
D-32 through D-34) and its declines are folded into the
thirteenth-pass sections in the same way; the fourteenth pass's
`tmp.md` review (148 verified findings), its sixteen PRs (#208 to
#242), its new entries (B-70 to B-76, P-28, P-29, V-29 to V-37, U-33
to U-39, A-08 to A-13, F-34 to F-42, D-35 to D-46, T-34 to T-38) and
its refutations are folded into the fourteenth-pass sections in the
same way; the fifteenth pass's `tmp.md` review and its 41 merged PRs
(#190-#259, with #191 closed as a subset of #255) are folded into the
fifteenth-pass sections in the same way; the sixteenth pass's fresh
`tmp.md` review, its three open PRs (#263, #265, #272) and its three
new entries (V-38, U-40) are folded into the sixteenth-pass
sections in the same way. No open idea
was removed: duplicates were consolidated into one entry each (see the
ID map and each entry's "Merged and related" notes), and unsupported
claims are kept under "Declined, refuted and corrected".*
