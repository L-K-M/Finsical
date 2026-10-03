# Finsical: Verified implementation backlog

Updated 2026-10-03 against `origin/main` **57f9ae3**, version 0.8.0, plus this
pass's independent review and its nine PRs (#406–#414) against the same base.
Entries below are remaining work, with evidence, scope and acceptance conditions.
S/M/L describe effort. Historical IDs are retained when they describe the same
behavior; C24 IDs identify the previous review's additions, C25 this pass's.

## Evidence and preservation

- [Chromium review](REVIEW-2026-10-03.md): complete findings, measurements,
  reference URLs, edition distinctions and limitations. This was `tmp.md`.
- [Earlier analysis and backlog](ANALYSIS-HISTORY.md): the previous ANALYSIS.md
  body, preserved unchanged. No earlier ideas, format research, reviews,
  refutations or completed-work records were discarded.
- [Original simulation reference](docs/ORIGINAL-SIM.md): reconstructed rules
  and deliberate differences from AquaZone.

This pass ran its own review (core sim, web UI, native shells, performance, and
a Chromium pass over the running tank with real archive.org add-ons), reproduced
its findings against the code, and shipped the fixes below as PRs #406–#414.
Its method and full evidence: see the C25 entries and the PR bodies. The queue
consolidates overlapping entries from those documents. Older proposals not
reverified here remain in the historical backlog; their old status or line
numbers are not proof against current code. Reproduce before implementing them.
No other agents' PRs were inspected in this task.

### Verified baseline

Typecheck, web build and 892 TypeScript tests passed at 57f9ae3. At d5e5410,
94 asset-tool and 100 Linux-shell tests passed. Chromium 153/Playwright 1.63
completed the archive.org starter flow and tested all five pages, six Preferences
panes, three Stats tabs, small viewports, pause, Get Info, name tags and cached
offline reload. No page exceptions occurred during starter installation.

Six-second, warmed-up measurements at 1280x900 with companion windows open:

| Scenario | rAF gap p95 / max | frame-callback CPU p95 / max |
| --- | --- | --- |
| Three fish, CRT off | 16.7 / 16.8 ms | 7.3 / 11.1 ms |
| Three fish, CRT on | 16.8 / 33.4 ms | 3.8 / 5.5 ms |
| 24 fish, CRT on | 33.3 / 33.4 ms | 5.4 / 7.3 ms |

No >50ms long tasks occurred in those warmed samples. Installing the two-resource
angels pack produced three 51ms tasks. These are **software-rendered SwiftShader
measurements**, not hardware-GPU benchmarks or proof of 60fps fish motion. The
simulation intentionally paints at 30Hz. Native shells, physical touch, speaker
quality, VoiceOver and hardware-GPU performance remain unverified locally.

## Implemented, awaiting maintainer merge

These tasks are removed from the active queue. Their PRs remain **open**, as
requested; none of this pass's application changes is on main yet. If a PR closes
unmerged, restore its task from the complete review rather than lose the finding.

| PR | Branch / head | Implemented scope | CI / completed GLM rounds |
| --- | --- | --- | --- |
| [#402](https://github.com/L-K-M/Finsical/pull/402) | `fix/atomic-sound-store` / `3a5bf34` | RT-01, B-39/B-18 cross-window sound edits: one IndexedDB transaction, commit-aware errors, real-browser regression | Green / 2, steady |
| [#403](https://github.com/L-K-M/Finsical/pull/403) | `fix/low-oxygen-care` / `7a5730a` | RT-02: low-oxygen care and explicit chlorine/oxygen-before-medicine priority | Green / 2, steady; false positives rejected |
| [#404](https://github.com/L-K-M/Finsical/pull/404) | `fix/frozen-tank-speed` / `be75834` | RT-03, F-10/F-26 UI slice: saved 0× and custom speeds display correctly, latest custom value remains selectable | Green / 2, steady |
| [#405](https://github.com/L-K-M/Finsical/pull/405) | `fix/short-help-windows` / `db7030d` | RT-04, U-27/A-05 help slice: bounded scrolling, visible-viewport fallback and mouse-gesture help | Green / 2, steady |

### This pass: independent review pass (PRs #406–#414)

Reviewed the core engine, the web UI, the three native shells and the frame
path (static + measured in Chromium against a tank stocked with real
archive.org add-ons). All nine are open for the maintainer, CI green.

| PR | Branch / head | Implemented scope | CI / completed GLM rounds |
| --- | --- | --- | --- |
| [#406](https://github.com/L-K-M/Finsical/pull/406) | `fix/view-only-tab-writes` / `8e2d917` | C25-01: the view-only (spectator) tank tab writes nothing — welcome, starter-sound backfill and drops are gated on `tankOwner` | Green / steady |
| [#407](https://github.com/L-K-M/Finsical/pull/407) | `fix/plant-chemistry` / `dc74251` | C25-02: plant chemistry restored — `Sim_Plant` runs again (`plantSize` was never assigned) | Green / steady |
| [#408](https://github.com/L-K-M/Finsical/pull/408) | `fix/disease-susceptibility` / `7dc77ac` | C25-03: contagion and shock respect a species' diseases (no incurable ARDS by spread) | Green / steady |
| [#409](https://github.com/L-K-M/Finsical/pull/409) | `fix/stomach-fill` / `8d50891` | C25-04: stomach resize keeps the eaten share; monotonic floor; clamp both ends | Green / steady |
| [#410](https://github.com/L-K-M/Finsical/pull/410) | `fix/export-anchor` / `c4494e5` | C25-05: Export Tank appends its download anchor (worked in Chromium; Firefox/Safari unverified) | Green / steady |
| [#411](https://github.com/L-K-M/Finsical/pull/411) | `fix/modal-discipline` / `9b342b1` | C25-06: the frontmost alert owns Return/Escape; drops and the drop cue stand down behind a modal | Green / steady |
| [#412](https://github.com/L-K-M/Finsical/pull/412) | `perf/frame-path-trim` / `b780038` | C25-07: name tags and the Get Info card place from the cached rect (no per-frame layout read) | Green / steady |
| [#413](https://github.com/L-K-M/Finsical/pull/413) | `fix/overview-delete-guard` / `1e2790b` | C25-08: Overview's Delete takes the same `tankGone`/modal guard as Rename (no false "Removed") | Green / steady |
| [#414](https://github.com/L-K-M/Finsical/pull/414) | `fix/getinfo-card-wrap` / `6f46bfb` | C25-09: Get Info card sized to its readings (no mid-label wrap) | Green / steady |

Proof: #402's regression first kept only 10 of 20 successful concurrent writes;
all 20 now survive, with replacement, removal/addition and abort recovery covered
in CI. #403's two initial regressions failed on the healthy verdict/priority and
now pass; both hazard hints fit the 340x330 Stats pane. #404 was reproduced with
speed 0 displaying Real time; Chromium now checks 0/0.5/1/2.5, all nine choices
with custom 7, and reload. A restored frozen aquarium also survives a month away
without changing life, water or doses. #405 originally ended at y=310 in a
240px-high viewport; About/Shortcuts now fit, scroll and close at 320x240,
568x320 and desktop sizes, with extra checks at 240px and 375px widths.

### Review decisions and deferred feedback

- #402: shared the merge policy between production/tests, made fixture startup
  failures explicit and checked Node 22. Fixed a CI-only Chrome-profile cleanup
  race; the application regression itself had already passed.
- #403: the claimed empty-tank bug is refuted by the early return in `advice`.
  Disease index 0 is valid (`Number.isInteger`), not an absent disease. The same
  fixture produces White Spot treatment without hypoxia; moving treatment ahead
  of oxygen would fail the priority test. A three-hint suggestion conflicts with
  the existing two-hint contract. Kept a colon in new prose per repository rules.
- #404: verified the pinned Osmium `setItems` API and every menu value in Chromium.
  Zero was already supported by the core. Suggestions to throw on invalid saves
  would change existing clamping/default recovery and were not applied.
- #405: added `dvh` with old-WebKit fallback. Firefox scrollbar pixel fidelity,
  physical mobile URL-bar behavior and deliberately dragged partly-offscreen
  windows remain follow-ups; flow-only document content scrolls correctly.
- #409: review twice pushed toward a monotonic `stomachSize` floor and a
  two-sided clamp. Applied: bare `trunc(0.2×weight)` gave weight 5 a stomach of
  1 (under a pellet's 3, and capacity that dipped as a fish grew), so the floor
  is a real `max(2, …)`; the docstring states the trade-off. The clamp is
  `[0, stomach]` on both ends — a negative `ate` from a corrupt save poisons
  every fullness ratio. NaN is not clamped by `Math.min/max`; that threat model
  was considered and left to `sanitizeLife` on load rather than added here.
- #410: review asked for the object URL to be a named const (done) and for a
  Firefox/Safari download check. The refactor also fixed a latent bug: the old
  detached-anchor click is ignored by those engines, so Export Tank was
  previously a no-op there. Only Chromium was verified locally.
- #411: review's ordering and drop-guard points were applied (frontmost alert,
  drop stands down behind a modal). Follow-ups applied too: `alertOpen()` now
  reads the stack (one source of truth), a stacked close hands focus to the
  alert beneath via a WeakMap rather than DOM order, and the drop cue
  re-evaluates on every dragover so a mid-drag modal can't leave a stale cue.
- #412/#414: review flagged that `pictureRect` caches depend on convention and
  that `max-width` bounds the box not the text. Addressed by dropping the rects
  on a CRT toggle, stating the invalidation contract in the comment, and
  bounding the species line (with `overflow-wrap`) rather than the card.
- macOS navigation policy (every non-http(s) scheme and all subframes allowed)
  is a real cross-shell divergence, but open PR #310 already fixes it. Recorded,
  not duplicated.

## Priority queue: correctness and responsive behavior

### C24-01 Cancel manual installs when their add-on is removed

Medium impact, M. Related B-38/B-72/B-18; RT-05.

**Evidence:** `web/main.ts:1905-1975` removal never invalidates
`installsInFlight`; `:2075-2113` only checks the Empty Tank epoch. Add Again can
finish after Remove and restore the saved URL/fish/scenery. Applying art before
awaiting sounds can also leave uncommitted contributions after a wipe.
This is code-confirmed; drive the complete race before fixing it.

**Slice:** one per-URL generation for active and queued requests. Prepare async
resources before publishing them or roll back a cancelled install's contributions.
Preserve unrelated URL installs and honest install acknowledgements.
**Acceptance:** defer fetch and sound decode separately; remove/empty, then
resolve. No fish, decor, scenery, sound provenance, saved URL or success ack
returns. A later explicit install works. The existing restore wanted-check alone
does not cover manual installs.

### S-02/S-04 Reject oversized imports before allocating them

High impact for large/hostile input, M. RT-09; older decoder budget entries.

**Evidence:** `core/data/fsh.ts:154` decodes frames before the aggregate atlas
guard at `:162`. `web/import.ts:237-253` accumulates bodies without a total byte
ceiling. A small compressed input can amplify into excessive allocations before
rejection. Historical S-02 contains a measured large-input reproduction.

**Slice:** validate headers, counts and aggregate budgets before RLE decoding;
enforce an incoming-body ceiling while streaming; abort and avoid caching rejected
bodies. Keep valid blank/truncated-format compatibility defined by fixtures.
**Acceptance:** over-budget declarations reject before pixel allocation; bounded
peak bytes and useful errors; representative real packs and decoder parity pass.
Do this before Worker decoding, which alone does not solve resource amplification.

### B-77/B-79 Preserve fish pack-entry identity

Medium impact, S. RT-06; consolidate the duplicate fry/adult-save cases.

**Evidence:** `tankSnapshot` omits `entry` (`main.ts:458-467`), and `maybeBirth`
copies pack/sheet but not entry (`core/sim.ts:1334-1341`). Multi-species pack fish
can be rebound to another entry on reload. Earlier proposal status is historical.

**Slice:** persist and inherit the entry key; keep legacy entry-less saves readable.
**Acceptance:** two differently drawn entries from one URL retain the right art
through birth, export, relaunch and removal. Do not derive identity from sheet
ordering or the user-facing name.

### B-80 Make the feeding ceiling one contract

Medium impact, S. RT-06, U-01.

**Evidence:** `FOOD_CAP=12` versus `MAX_UNEATEN=6`; `feedFish` schedules pellets
and plays pour feedback after the sim's authoritative ceiling has been reached.
**Slice:** choose one documented ceiling and use it in the sim and every input
path. Refuse without discarding existing waste or scheduling a futile pinch.
**Acceptance:** mouse, F/menu and auto-feeder respect the same limit; repeated
feeds produce the defined refusal cue and no false pour. Preserve meaningful
overfeeding consequences rather than silently deleting old food.

### F-44 Apply care per entry in multi-species packs

Medium impact, M. Existing historical F-44; relates to B-77/B-79.

**Evidence:** `careByPack`/`sim.careOf` at `main.ts:269-275` key care by URL,
although one URL can contain multiple species entries. Entry-scoped art alone
does not establish entry-scoped physiology. Reproduce with differing care ranges.
**Slice:** entry-qualified care with URL-level fallback for legacy saves; persist
it for catch-up before art downloads complete.
**Acceptance:** two species in one pack receive their own tolerances during live
care and offline catch-up; old saves and single-entry packs retain their rules.

### B-54/B-13 Complete the tool-to-app scenery round trip

Medium impact, M. RT-07; raw BMP/file-drop support is already present.

**Evidence:** `tools/az/img.py:117` emits RGBA PNG, while `decodeIndexedPng`
accepts indexed PNG; `main.ts:2866-2867,3061-3062` swallows scenery decode failure.
The .azpack folder path also lacks durable/removable pack identity (`:3064`).
**Slice:** support the emitted image representation at the scenery boundary or
emit the compatible representation. Give a dropped folder a durable local key,
including its fish, art and sounds.
**Acceptance:** emit, drop, reload offline and remove a plant/backdrop bundle;
art remains correct until removal, which leaves no orphaned contributions.

### U-27 Fit every Preferences pane on narrow screens

Medium impact, M. RT-08. Help-window clipping is covered by #405, not this task.

**Evidence:** at 375px, Monitor units extend to x=528. Fixed 125px sliders in
three columns (`web/app.css:188-298`) are clipped; Android `PanelSizes.fit` only
clamps the viewport. Machine and caption geometry also assumes desktop width.
**Slice:** narrow-only reflow and a scrollable pane with a reserved footer.
Keep standard desktop pixel metrics and bitmap text unscaled.
**Acceptance:** all six panes, captions and Defaults are reachable at 320/375px
portrait and short landscape; normal-size desktop screenshots remain unchanged.
Verify scrolling/keyboard appearance on Android and WebKit, not only Chromium.

### P-02/P-08 Move bounded pack decoding off the UI path

Medium impact, M/L. RT-10. Begin with sheet selection, then Worker transfer.

**Evidence:** angels installation produced three 51ms long tasks. Fetch/decode
and synchronous raster preparation share the tank's UI thread. Task-level CPU
attribution is needed before claiming one decoder owns the entire stall.
**Slice:** select needed sheets from metadata; preserve preview choices; decode
bounded arrays in a Worker. DOM/canvas publication stays on the UI thread.
**Acceptance:** cold and cached large-pack traces show reduced long tasks and
bounded peak memory; cancellation, failed imports and all decoder fixtures pass.

## Fidelity and convenience: independent product slices

### F-07/F-10 Couple the feeder to biology time

M. RT-16. `main.ts:2302-2305,3808-3812` uses fixed visual ticks for the
45-minute feeder; biology speed uses a separate clock. At 0× or 100× those
clocks disagree. Confirm behavior before changing it.
**Slice:** feed quantity/interval and optional finite supply on the aquarium
clock, including catch-up. Keep swimming on the visual clock.
**Acceptance:** changing speed scales feeding consistently; 0× has the defined
timer behavior; long closure does not overfill the tank or silently skip supply.
Use original FdFd/food data after validating its meaning. Check the original 0×
light-timer rule separately from the modern wall-clock lighting modes.

### F-04/B-23 Arrange decorations and import real tank layouts

M/L. RT-16. Read x/top/depth for each PlPI/AccI individual rather than reducing
a prepared .azn tank to scenery. First ship manual placement for existing copies.
**Acceptance:** three individually placed copies reload in position; depth
occlusion stays stable; a representative .azn reproduces its placements without
discarding fish or equipment unexpectedly. Keep replacements reversible.

### F-06 Add named foods and species preferences

M. RT-16. Fd_H/Fd_I, particle art and PrF# already exist in original data;
Finsical still feeds anonymous pellets. Parse one selected food first.
**Acceptance:** compatible fish accepts it, incompatible fish does not; visible
amount and sprite match the selected food; feeder and manual feeding agree.

### F-02/F-32 Show individual and species cards

M. RT-15/RT-16. Replace display stems with FsTH common/scientific names while
keeping pack keys stable; add hatch dates, birthplace/provenance and personal
notes from validated metadata. Renaming is already present.
**Acceptance:** western/Japanese metadata displays correctly, unknown fields are
explicit, and names do not change removal/binding behavior. A specimen cabinet
can reuse these cards without a parallel species model.

### F-17 Model sex, courtship, pregnancy/eggs and ancestry

L. RT-16. Current `maybeBirth` is a daily healthy-pair roll with immediate fry;
no sex, gestation, eggs or family tree. Separate original rules from inferred
format fields before implementing them.
**Acceptance:** same-sex pairs do not breed; timed offspring retain entry/species
and parents through save/reload; population limits and long catch-up remain bounded.

### F-26 Add safe named tank slots and portable local assets

M/L. RT-16. .fins exports save URL-based state, not the only copy of dropped
local art or sounds. Add duplicate/restore for a single tank before multiple
simultaneous tanks.
**Acceptance:** duplicate, close and restore safely; local packs and sound bytes
travel with a portable export; explicit replacement is recoverable and never
overwritten by old unload handlers. Keep frozen speed with each saved tank.

### A-02/V-05 Match display hardware and expose the fill tradeoff

M. RT-13. Plus displays color, and LCD cases accept curved RGB CRT output.
At 1280x900 the Plus has about 500x312 glass but a 320x200 integer-scaled raster.
This is a crispness/fill choice, not an accidental stretch.
**Slice:** “Match machine / CRT / LCD” and explicit integer zoom/fill controls.
Optional monochrome is user-selected; preserve manual settings.
**Acceptance:** LCD skips curvature/grille, integer mode stays crisp, fill mode
does not distort; compare real hardware references and legacy save behavior.

### A-05/T-06 Establish Mac OS 8/9 widget goldens

M. RT-14. Current bitmap fonts, bevels, default rings, titles and grow boxes
are recognizable; exact pixel identity has not been proved.
**Slice:** original-system 1x goldens for dialog/list/control-panel, disabled and
inactive states, menu tracking and custom Get Info/balloons. Fix shared widget
pixels in Osmium rather than accumulate page overrides.
**Acceptance:** documented pixel differences at integer DPR, keyboard/accessibility
behavior preserved. Include Firefox scroll styling and actual WebKit screenshots.

### A-05/U-30 Make Get Info reachable on touch and easier to edit

M. RT-15. Alt-click works in Chromium; touch has no equivalent and Linux may
reserve Alt-drag. Help gestures are covered by #405; the interaction is not.
**Slice:** long-press with movement/cancel tolerance, Overview Get Info, optional
pinned card. Route all paths through the same action.
**Acceptance:** short tap knocks once; long press opens info without a knock;
movement/cancellation cannot open a stale fish; edited names/notes persist.

### U-39 Restore the compact Tool Bar

M. RT-16. Original documentation/community guides describe a floating palette.
Finsical spreads feed/info/lamp/names/sound/stats across menus and keys.
**Slice:** a collapsible Platinum/Control-Strip-style palette calling existing
commands, with balloon captions and keyboard/touch access.
**Acceptance:** one-click commands remain correct while paused, offline or full;
no duplicated simulation logic; remember visibility and safe placement.

### U-08/U-21/V-09/B-11/B-52 Improve the add-on catalog

M. RT-17. Raw stems, duplicate names, program updates and mismatched catalog
previews make selection uncertain. Loose basename collisions remain a code gap.
**Slice:** stable qualified identity, meaningful display names, sort and format
capability; preview the actual object that will be added.
**Acceptance:** duplicates are distinguishable, image-only fish never report
success, unsupported data explains the limitation, and installed scenery offers
the action it actually performs. Preserve separate western/Japanese resources.

## Reliability, performance and observability follow-ups

- **B-28/B-34/B-46/B-96/B-98/U-28 (RT-18), M:** nonmodal save/restore status,
  retry/export, owner gating on every drop path, usable crash-exhaustion screen,
  and grabbable native frame restore. Quota failure must never say saved;
  monitor removal and repeated renderer failure must leave usable controls.
  Native claims are code-only locally; reproduce on the specified platform.
  (PR #406 closes the spectator-tab half of owner gating; the native drop and
  status work remains.)
- **P-06/P-18/P-28/P-04 (RT-12), M:** compare 0/1/4-window traces, coalesce
  unchanged state, preserve focused nodes and stop unnecessary muted audio work.
  Bound decoded PCM, retain unlock/unmute behavior and report skipped records.
- **P-09/P-16/P-29/P-30 (RT-11), L:** keep Classic 30Hz default; consider
  opt-in interpolation after decode work. Measure turns/pitch, lazy rasterization,
  stalls, 60/120Hz presentation and energy on hardware. Do not call deliberate
  whole-pixel movement a bug solely because rAF runs at 60Hz.
- **T-06/T-08, M:** add fixture-backed entry-flow browser checks for first run,
  bus install acknowledgements, restore, removal, drops, keyboard and touch.
  The new sound-store and existing caustics checks cover boundaries, not the
  complete tank app. Extract tested state logic from the large entry point only
  as needed, retaining the application-service boundary.
- **F-14/F-15/F-18, M/L:** equipment art, tank volume and validated Accessory
  Maker output. Check concentration scaling, legacy presets and explicit format
  failure. FisherMan volume edits are third-party examples, not proof of a stock
  Mac volume control.

## Bounded delight ideas

- **D-09, S/M:** tank postcard with optional case, name/date and Platinum caption.
  Reuse clean-picture rendering; never capture the pointer torch or paused scrim.
- **F-13/D-22, M:** capped persistent keeper's scrapbook with feed/birth/recovery
  events, paper card and Copy. Deduplicate events across catch-up/relaunch.
- **F-32, M:** specimen cabinet using imported metadata, with family tree after
  F-17. Offline after import; no invented metadata or separate species state.
- **F-02/D-24, S/M:** two-line fish notes and optional behavior-derived keeper
  observations in a pinned card. Keep the simulation's real state authoritative.
- **D-15/U-39, M:** compact keeper's card with fullness, thermometer and next
  feeder time, using existing Stats models/commands.
- **U-03/A-13, S/M:** original-inspired hand/knock cursor and Finder zoom rects,
  using own pixel art, no per-frame allocation and a reduced-motion static cue.
- **F-28/D-09, M:** optional fish portrait/zoom-follow inspired by the **2005**
  Seven Seas edition, explicitly a modern feature rather than Mac Deluxe parity.

The paw, snail, torch, golden food, startup parade, names and degauss already add
novelty. Prefer care, ownership and observation to more default animated visitors.

## C25 verified-but-unshipped findings (this pass; all reproduced or code-confirmed)

These came out of the same review that produced #406–#414, are verified, and
remain open. They are the natural next pickups.

### C25-10 Plant chemistry gates are still unreachable (murk, gasping, food refusal)

Medium impact, S. Adjacent to the shipped #407 (which restored the plant term).
`syncLife` (`core/sim.ts:520`) computes `waterQuality` from O2 deficit and
organics. O2 is pinned near saturation because the filter's `power` is a fixed
constant nothing can change, and measured organics equilibrium is ~1.2 mg/L
under sustained max feeding, while `MURK_ORGANICS` (`sim.ts:164`) needs ~3.5
mg/L for quality to fall under `QUALITY_SEEK` (`tuning.ts:9`). So quality lives
in ~[0.75, 1] and the murk render, gasping and `QUALITY_SEEK` food refusal are
unreachable in practice.
**Slice:** rescale `MURK_ORGANICS` to the reachable range and/or give the filter
an on/off power state; decide which gates are meant to be live.
**Acceptance:** a fouled tank visibly clouds and fish refuse/gasp per the
documented rule; a clean planted tank does not.

### C25-11 Filter ammonia efficiency is discontinuous at dirt 10 and 50

Medium-low, S. `core/aquarium/aquarium.ts:173` changes coefficient at both
joins: eff(9.99)=0.50% jumps to eff(10)=0.75%, and eff(50) falls to 2.50% from
3.75%. `ORIGINAL-SIM.md` says efficiency "rises to a peak just under 50%, then
declining" — the shape, but the cliff breaks it.
**Slice:** make the descending limb continuous (same coefficient as the rise).
**Acceptance:** the curve peaks smoothly near the documented dirt level and
falls to zero when clogged.

### C25-12 The sickness vitality knockdown is erased by the next age step

Medium, S. `startSickness` (`core/aquarium/life.ts`) lowers `vitality` by the
disease severity, but `stepAge` recomputes `l.vitality = vitalityAt(...)` every
age step, wiping it within one grow step (~11–60 min) while the disease runs for
weeks. Verified: vitality 50 → 41 on infection → back to the curve value after
one `stepAge`.
**Slice:** re-apply the active disease's severity factor after the curve while
sick (or store the knockdown rather than mutating once).
**Acceptance:** a sick fish's vitality reflects its disease until it recovers,
matching `ORIGINAL-SIM.md`.

### C25-13 `dead.at` is stamped at the catch-up chunk's end

Low, S. `visit` adds `m` to `this.minutes` before fish routines
(`aquarium.ts:134`) and a death stamps `dead.at = this.minutes` (`:335`), so a
death anywhere inside a catch-up chunk gets the chunk's end. `syncLife`
(`sim.ts:505`) picks "rise" vs "sunk" by `minutes - dead.at > 60`, making the
corpse's look depend on the size of the absence rather than how long ago the
fish died.
**Slice:** stamp the chunk start (or the sub-step) instead.
**Acceptance:** a fish that starves in a single-chunk gap still sinks like one
that died weeks earlier.

### C25-14 Mineral reading wraps to int16 (hard water reads negative)

Low, S. `waterReadings` (`life.ts:218`) reproduces an original 16-bit truncation,
`((trunc(ca+mg) << 16) >> 16) / L`: Ca+Mg = 500 mg/L reads as **−155 mg/L**, and
totals between ~32 768 and 60 000 mg (reachable under the element ceilings) flip
the sign, with a blind spot at exactly 655.36 mg/L. `changeWater`'s shock table
(`aquarium.ts:385`) uses the un-wrapped value for the same quantity.
**Slice:** clamp instead of wrap (or document the reachable range); use one
value in both paths.
**Acceptance:** extreme hardness does not read as far-below-minimum; the shock
table and the reading agree.

### C25-15 CO2 production constant looks like a digit slip of the O2 line

Low, S. `breathe` (`aquarium.ts:256`): O2 use `∝ (T·0.0076 + 0.00496)/60 · W·0.096/L`;
CO2 out `∝ (T·0.0076 + **0.0496**)/60 · W·0.096/20`. `0.0496` is exactly 10× the
O2 line's `0.00496` and the `/20` vs `/L` divisor differs; at 26.5 °C a fish emits
~6× more CO2 than O2 it consumes (physiologically ~1.4). Gameplay effect small;
likely wrong against the original's Sim_Fish_In_Out.
**Slice:** recheck the original constants; fix the slip and the divisor.
**Acceptance:** CO2/O2 production ratio matches the reconstructed original.

### C25-16 `resilience` is a write-only stat

Low, S. `FishLife.resilience` is rolled, knocked down by disease severity,
restored on cure and sanitized on load — no read site feeds damage, healing,
contagion or recovery. Either a consumer was never ported (the original's
resistance likely modulated sickness damage/recovery) or it is vestigial.
**Slice:** wire it into `stepSickness` damage or cure odds per the original's
semantics, or drop the field.
**Acceptance:** the trait has a documented effect or is gone.

### C25-17 The starter set's default backdrop reads as murky green

Nit/idea, S. The starter set installs the JPN `Back03.bmp`
(`web/starter.ts`), a dark saturated plant photo; in a live tank the foreground
plant nearly dissolves into it and a new tank opens murkier than Finsical's own
built-in gradient. The built-in default read noticeably better.
**Slice:** reconsider the starter backdrop choice (or none) for first-run
impression.
**Acceptance:** a freshly stocked starter tank reads clearly. (Product/content
call; the user can pick another background in Overview.)

### C25-18 Browser menu bar lacks Mac OS 8 checkmarks and a shortcut column

Nit/idea, M (upstream). `web/menubar.ts` titles toggles by the action they take
("Turn Lamp Off") and shows no shortcut glyphs or checkmarks, because Osmium
0.2's `MenuItem` has only `title`/`action` (`node_modules/osmium-ui/src/menubar.ts:20`).
Mac OS 8 would show "Lamp On ✓" with a right-aligned ⌘-glyph column.
**Slice:** extend `osmium-ui`'s `MenuItem` with optional `checked` and
`shortcut` fields, then use them; the alternative is to accept the compromise.
**Acceptance:** toggles show a checkmark and a shortcut glyph without breaking
older Osmium consumers.

## Source boundaries and corrected historical claims

Classic Mac AquaZone/Deluxe defines fidelity. Macworld's 2005 Seven Seas article,
the Allume archive, XP/Vista/7 screensaver and 2008 DS commercial describe later
products. The complete review records all supplied URLs and inaccessible sources
(Softonic 406, Amazon interstitial, failed Desktop Life fetch). Do not infer Mac
features from a product title or Windows screenshot.

- Pause already persists locally and suppresses catch-up. Its earlier description
  as transient was wrong. No source proves the original Mac speed widget was a
  continuous slider. Core zero-speed support already existed; #404 fixes exposure.
- B-15 adoption/round-robin and B-21 lost decor-copy claims are obsolete on main.
  P-12 uses a palette LUT; P-17 has fixed/dirty resize handling; B-56 spawn hunger
  and cap paths exist. Removed these from the current queue, preserving evidence
  in the historical document.
- B-13 is partial: raw-file identities work, .azpack folders still need work.
  B-34's lease works; its owner-gating leftovers (the spectator tab's welcome,
  starter-sound backfill and drop writes) are fixed by PR #406. B-30 cache
  bounds do not prove installed archives can never be evicted.
- Earlier “Completed” records naming open PRs are historical work states, not
  assertions that their code shipped. Re-check current code before taking them on.
