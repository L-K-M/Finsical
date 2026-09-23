# Finsical: project audit and improvement plan

Date: 2026-09-23. Baseline: `origin/main` at `0342fb0f8b25863aa2ba725ec9d6e53b4b4b1765`.

This report was completed before editing application code. It reviews the current main branch, not other agents' branches or PRs. Historical proposals in `ANALYSIS.md` are useful context, but an implementation described there as "landed" is not necessarily present in this baseline. No other agents' PRs were inspected or contacted.

## Executive assessment

The architecture is a good fit for the toy: a small deterministic simulation, a renderer that respects the original indexed artwork, an importer rather than redistributed game data, and an unusually convincing Platinum control-panel skin. Keep those strengths. A framework rewrite, a physics engine, or a large management-game layer would not help.

The largest gaps are at boundaries: exported art does not always match the browser decoder, malformed sprite metadata can stop animation, persistence sometimes contradicts the user's actions, and the standalone web build is incomplete. The most convincing performance opportunity is avoiding repeated work on unchanged simulation frames. The largest usability opportunity is making the existing actions discoverable without sacrificing the quiet tank view.

Treat relaxation as a product constraint. Prefer gentle observable behavior, immediate reversible controls, and useful offline operation. Avoid mandatory maintenance, starvation notifications, irreversible deaths, surprise flashing, or a growing dashboard over the fish.

## Evidence and limitations

- Passed: `npm ci`; `npm run typecheck`; `npm test` (167 tests in 16 files); `npm run build`; `python3 -m unittest discover -s tools/tests -p 'test_*.py' -t .` (76 tests); `bash -n scripts/*.sh`.
- The test-time archive listing 404 warnings are deliberate fetch stubs, not evidence that the live archive is broken. Python tests also emit existing unclosed-file `ResourceWarning`s.
- Inspected the simulation, poses, all web entry points, CSS/HTML, CRT/audio, import/cache/bus paths, TypeScript binary decoders, Python conversion/fetch paths, native shell, build scripts, CI, and existing roadmap.
- Ran isolated local Chromium checks at 1280x800, native Preferences dimensions 565x457, narrow Preferences 320x400, and Stats 300x120. Used fresh browser contexts, not a user's saved aquarium.
- Confirmed the production build requests a missing `dist/assets/macintosh-plus.png` (404). For subsequent visual inspection only, intercepted those requests to the existing `web/assets/` files. This diagnostic routing is not a product fix.
- Live Archive.org listing followed its redirect to HTTP 200. The importer showed 165 fish entries in one run. Importing `aetena` produced five fish and one installed add-on; F added a pellet. Blocking archive requests on reload still restored the cached fish/add-on. This verifies one real pack and cache path, not the entire catalogue.
- During that first real import Chromium observed 106 ms and 63 ms main-thread long tasks. These are observations, not a profile attributing either task to a particular function.
- Plain rendering made 120 tank repaints in a two-second sample. With CRT on, another two-second sample made 118 repaints, 118 texture uploads, and 118 shader passes. The simulation runs at 30 ticks/s. These counts establish redundant work, not a measured battery-life improvement.
- A small Node probe of 300 ticks took approximately 4.3 ms for 4 fish/0 pellets, 10.8 ms for 24 fish/60 pellets, and 32.7 ms for 100 fish/1000 pellets on this host. This is not a stable benchmark, but it argues against blaming ordinary small-tank simulation math before profiling import/render work.
- Native AppKit behavior, real Retina GPU cost, macOS energy use, VoiceOver, and physical touch input remain unverified locally. Native CI compilation is necessary but does not substitute for those checks.
- The attached Paseo browser could not reach the workspace. Local Chromium worked using existing library directories. Its installer unexpectedly pruned two shared Chromium caches; both exact build-1234 caches were restored with cache garbage collection disabled. No project dependencies or source files were changed for browser setup.

## Bugs and reliability

### B01. The standalone web build omits every machine image [P1, reproduced]

`package.json:11` copies HTML, CSS, and bundles, but not `web/assets/`. `web/machines.ts` references those images. Serving only `dist/` loses the computer case and previews, leaving the aquarium in a black rectangle. Native packaging separately copies the assets in `macos/Makefile`, so this is specifically a web artifact defect.

Fix: copy the required machine assets during the web build. Test the actual production build in a fresh temporary output context, assert every declared machine asset exists and has the expected bytes, and smoke-test the served build without source-tree fallbacks. Do not fetch or bundle original game assets.

### B02. An intentionally empty tank is repopulated on reload [P2, reproduced]

`web/main.ts:73-76` chooses the four starter fish whenever the filtered saved roster is empty. A valid v2 save with `fish: []` restored four fish in Chromium. Removing the last fish should be durable, not interpreted as first launch.

Fix: distinguish "no valid saved tank" from "valid saved tank with no fish". Test first launch, explicit empty v1/v2 saves, removal of the last fish, and malformed roster entries. Keep v1 add-on reconciliation separate from the first-launch decision.

### B03. A malformed sprite sheet can freeze the whole aquarium [P1, reproduced at decoder boundary]

`core/data/azpack.ts:163-185` accepts sprite metadata without validating its group count, frame count, cell dimensions, or complete frame table. A synthetic manifest with four groups and `dims: []` loaded successfully; its first `frame()` call threw. `web/main.ts:1031-1043,1130-1141` draws without recovery and schedules the next rAF only after drawing, so that exception terminates the animation chain.

Fix: validate all sheet metadata against decoded atlas bounds before publishing a pack. Reject malformed sheets with a specific import error, before they can enter the live renderer. Test missing/short frame tables, zero/fractional/non-finite dimensions, mismatched group/frame coordinates, and frames outside their cell or atlas. Valid legacy packs must keep loading. Do not merely catch and ignore every draw error.

### B04. PNG decoding is not bounded by the declared image [P1, reproduced]

`core/data/azpack.ts:54-58,90-129` inflates an entire stream into memory before checking dimensions and only rejects too-short pixel data. A one-pixel fixture with 10,000 decoded bytes was accepted. PNG dimensions and palette entry counts also lack useful upper bounds.

Fix: enforce a documented pixel budget before inflation, consume the stream under its exact expected filtered-row byte count, cancel on overflow, reject extra/short pixels, and reject palettes larger than the format's 256 entries. Use small synthetic fixtures and mocked/chunked streams, not an actual memory-exhaustion test. Keep the decoder indexed-only unless B05 is deliberately addressed in a separate contract change.

### B05. Exported scenery PNGs cannot be loaded by the browser [P1, source contract plus equivalent fixture]

`tools/az/emit.py:84-93` writes scenery through `write_png`; `tools/az/img.py:96-104` emits RGBA PNG color type 6. Both scenery-loading loops in `web/main.ts:879-885,949-955` call `decodeIndexedPng`, which only accepts type 3 and silently skips failures. An equivalent RGBA fixture was rejected with "need 8-bit indexed". Fish atlases use a separate indexed writer and are unaffected.

Fix: explicitly support the emitter's scenery format at the browser image-loading boundary, or change both sides to an agreed indexed-scene contract without making palette index 0 transparent in opaque backgrounds. Add a Python-emitter-to-browser-reader round-trip fixture that checks pixels, opacity, dimensions, and actual backdrop selection. Cover bundled packs and dropped folders. This is more important than adding another cosmetic backdrop effect.

### B06. A fish keeps seeking after its food disappears [P2, reproduced]

`core/sim.ts:289-303` enters `seek` when food exists but does not leave that state when no eligible food remains. Marking its target eaten by another fish left `state: "seek"` with no food. Lowering water quality below the appetite threshold also left it seeking. Overview and Stats then describe behavior that is not happening.

Fix: transition an abandoned seek back to drift and start an appropriate wandering decision. Test target consumed by another fish, last pellet rotting away, appetite lost to water quality, an alternative pellet remaining, and transitions during/after a turn. Preserve the turn animation and seeded determinism.

### B07. Persisted data needs an explicit validated schema [P1/P2, source-confirmed]

`loadTank` validates only the version and two arrays; roster validation checks x/y. Invalid hunger, cruise, heading, water quality, duplicate/negative IDs, or malformed add-on objects can enter simulation/restoration. The save omits pellets, RNG state, and much of the motion state, so it is not a deterministic continuation. A fed pellet disappeared on the tested reload, while fish/add-on persistence worked.

Fix: extract a versioned parse/restore boundary; validate each record independently, preserve an intentionally empty roster, clamp domain values, and make identity unique. Define which motion/effect fields intentionally reset. Preserve recoverable data and retain a last-good save before destructive migrations. Test partially damaged saves and an unavailable/quota-full storage backend. Do not silently claim persistence succeeded.

### B08. Missing pack art can be substituted with an unrelated species [P2, source-confirmed]

`remapSheetIdx` only drops unresolved bindings when the old index is out of range; `sheetOf` also falls back to round-robin. If an earlier pack fails to restore, an in-range old index can now point to a different pack. A saved fish can retain its name but wear another species' art.

Fix: bind pack-owned fish strictly by pack identity. Use a recognizable placeholder while that pack is absent, and resolve it when the pack loads. Keep round-robin only for explicitly unbound starter fish. Test failed restore in the middle of the install order, same-name packs, and late retry.

### B09. Removing content does not invalidate pending work [P2, source-confirmed race]

`removeAddon` and `mountImportPanel.restore` do not share cancellation/generation state. A restore that resolves after removal can reapply decor/art to a tank whose installed list no longer contains it. The in-page import panel also keeps its own installed set; main-page removals do not pass state back through that panel's `notify` path.

Fix: serialize or generation-check per-pack apply/remove operations, synchronize both panel forms, and make a removal authoritative over older work. Test delayed restore then remove, reinstall after remove, and two same-name packs. Keep intentional "Add Again" separate from request retries.

### B10. Local drops have incomplete parity with archive imports [P2, source-confirmed]

The raw-pack drop loop returns after its first success, has no flat FileList fallback when `webkitGetAsEntry` is absent, ignores scenery-only raw packs, and can use fish portraits as tank backgrounds. Dropped fish bytes/provenance are not persisted. The shared empty source key also lets a drop overwrite bundled scenery ownership.

Fix: one classified import path for archive and local sources; stable local IDs; durable local bytes outside disposable cache eviction; per-file failure isolation; a browser-compatible FileList fallback; and an import summary. Test multiple valid/corrupt/scenery files together and reload offline. Historical branch work already addresses portions of this; do not assume it is on main.

### B11. Sound persistence can lose data or report a failed write as success [P1, source-confirmed]

`web/store.ts:217-229` serializes read/modify/write only within one module instance. The tank and Add-ons page use separate instances, so overlapping merges can overwrite each other's records. `rw` returns null on transaction failure; callers such as `web/addons.ts:56-63` only catch rejection and can announce `soundsLoaded` after no write committed. The legacy-thumbnail migration similarly deletes the old value after a fulfilled `packPut` even when the result is null.

Fix: make sound read/merge/write one IndexedDB readwrite transaction, return a meaningful persistence result, and distinguish disposable cache failure from user-data failure. Only acknowledge or remove a migration source after commit. Test two connections racing, commit abort/quota failure, oversized incoming sound records, and successful retry. Keep original local sound data safe.

### B12. Python conversion is destructive before success [P1, source-confirmed]

`tools/fetch.py:85-114` removes an existing output bundle before conversion succeeds and removes numbered siblings before determining whether the new input is usable. The standalone converter can also overwrite same-basename inputs into one destination. Failed conversion can therefore destroy the previous usable result.

Fix: stage each conversion in a fresh sibling directory, validate its manifest, then replace only that conversion's owned destination. Reconcile stale outputs only after a successful complete run. Test with temporary directories and an injected conversion failure; existing bytes must survive. Do not test against a user's real packs.

### B13. Resource budgets are inconsistent across formats [P1, source-confirmed]

Raw remote downloads use unbounded `arrayBuffer`. ZIP's byte limit covers deflate but not stored entries; BMP RLE builds an unbounded intermediate row before clipping; FSH checks the final atlas budget after allocating individual frames; BinHex RLE expands JavaScript arrays without an output cap. Python ISO directory reads/record parsing also trust lengths too far, use an assertion for external validation, and lack a clear close/context-manager lifecycle.

Fix in separate format-focused changes: cap input, per-entry expansion, aggregate decoded pixels/bytes, recursion/depth, and live cache memory before allocation. Test small fixtures with injected small budgets, truncation, inconsistent size fields, and continued import after rejection. Preserve real catalogue compatibility and make rejected-file errors actionable. B04 is one deliberately narrow first slice.

### B14. Bus messages and multiple browser tanks lack a clear authority boundary [P2, source-confirmed]

`BusMsg` is an unchecked record; handlers dereference `m.op`, nested arrays, and object fields without one runtime envelope check. Every same-origin browser tank also listens on the same `finsical` channel and writes the same save key. Opening two tanks can yield competing state pushes, duplicated intents, and last-writer-wins persistence.

Fix: validate message envelopes and per-operation payloads without inventing a large RPC framework. Choose one active browser tank, or explicitly scope sessions and companion windows by tank ID. Test malformed messages, two tanks, reconnect, and a companion opened before its tank. Native relay behavior should remain unchanged.

### B15. Stats can mix old and new tank histories [P2, source-confirmed]

Overview notices the tank's `boot` change; Stats does not clear its history on a new boot. Its arrows can compare different tank sessions. There is no explicit stale/disconnected state. At exactly water quality 0.3, advice permits feeding while the sim requires quality strictly greater than 0.3.

Fix: reset/reseed trend history on boot changes, distinguish waiting/stale/live, and pin advice thresholds against actual simulation behavior. Test tank restart, delayed first contact, missed heartbeats, and threshold boundaries.

## Performance and stutter

### P01. Stop repainting and uploading unchanged tank frames [P2, measured; selected]

`web/main.ts:1126-1142` repaints every rAF even without a sim tick; `web/crt.ts:339-352` uploads the same canvas again for every shader pass. Keep the fixed 30 Hz sim and original sprite cadence. Paint once on startup and after a changed scene; upload only after that paint. Continue time-dependent CRT shader passes independently, including after resize and preference changes. This should halve paint/upload calls on a 60 Hz display and remove more duplicate work at higher refresh rates, without claiming a proportional reduction in total GPU time.

Acceptance: instrument 2D paint, texture upload, and shader-pass counts; identical scene frames must not upload twice, but time/resize/config changes must still render the CRT. Test CRT off/on, context loss, no-tick frames, first frame, imports, feed/remove actions, and delayed rAF. Native visual comparison remains necessary.

### P02. Profile first-use decode/rasterization before optimizing tiny arithmetic [P2]

The real import produced >50 ms tasks. `zipRead`, FSH/BMP decode, `swimFrame`, `imageCanvas`, and lazy pose rasterization run on the UI thread. Record a performance trace around a large import and a fish's first turn. Then choose either a small decode worker or bounded idle prewarming of likely pose cells. Transfer buffers where ownership permits. Acceptance: no import-induced visible animation freeze under a representative pack, bounded concurrency, and no work after cancellation. Do not attribute the observed long tasks without a trace.

### P03. Bound live memory, not only IndexedDB bytes [P2]

`zipCache`, `packCache`, sheet arrays, and per-sheet raster canvases can retain data for an entire session. `usePack` appends a sheet again for reinstalls, while removal intentionally leaves sheets to preserve indices. A disk LRU does not bound these live objects. Use stable pack-owned sheet slots/references and measured byte-aware eviction for rebuildable previews. Do not evict the only copy of locally imported user data. Test repeated install/remove and a long catalogue-browse session.

### P04. Separate catalogue readiness from optional expensive collections [P2]

`listAddons` waits for all collections, including nested archive enumeration, before displaying any. Cache failures are invisible and a partial failure simply removes categories. Render known sections as they settle; show cached/offline/partial status and per-section retry; reserve download priority for the user's selection over speculative thumbnails. Introduce progress and stall cancellation before parallelizing more work.

### P05. CRT and scenery cost deserve device-aware budgets [P2]

The CRT allocates at uncapped devicePixelRatio, reads layout dimensions on every render, and runs a multi-tap shader. Backdrops/gravel are rescaled every frame. Pre-fit static scenery, reuse a dirty resize measurement, and measure a capped render scale on Retina. Preserve integer texel alignment and input geometry. These are existing roadmap themes, not proof that an ordinary tank is already GPU-bound.

### P06. Keep population and food growth bounded [P2]

Nearest-food search is O(fish × pellets); panic propagation is O(fish²). Normal measured counts were cheap. Add coherent population/food limits and gentle overfeeding feedback before optimizing with spatial indexes. Avoid an evict-oldest pellet cap that lets repeated feeding erase waste for free. Test sustained input, settled waste, and ordinary feeding fairness.

### P07. Define background and sleep behavior [P2, product decision]

The rAF clock clamps elapsed time to 200 ms. Hidden/minimized tanks mostly stop, yet client windows can show "live" values and uptime is simulation time. Prefer no-care-penalty suspension for a relaxation toy, explicitly mark it, and avoid a huge catch-up burst on wake. If real-clock lighting is added, separate it from hunger time. Verify real AppKit occlusion/minimize behavior rather than assuming browser visibility maps perfectly.

### P08. Reduce redundant persistence and message traffic only where measured [P3]

Multiple companion windows poll full state; a save also broadcasts; remote installation broadcasts twice. Coalesce change notifications and avoid repeated serialization of unchanged data, while retaining reconnect heartbeats. Debounce native frame persistence during live resize. Avoid hashing a full serialized save if serialization itself is the cost being removed.

## Interface, accessibility, layout, and aesthetics

### U01. Make essential actions discoverable [P2]

The desktop browser's first screen has no visible buttons, menus, or help. Import is a keyboard shortcut; Preferences/Overview require knowing companion URLs. Native menus exist, but feed-vs-knock zones are still invisible. Preserve the case view while adding a small authentic menu/Help route and a dismissible first-run note. Have one command model serve browser and native presentation. Historical menu/hint branches should be reconciled rather than blindly reimplemented.

### U02. Show an aquarium inside machine previews [P3, visually confirmed; selected]

`prefs.ts:296-303` previews only the cut-out case image. The glass is white and "Bare tank" is blank, so neither depicts the choice being made. Add a static, asset-free miniature aquarium behind the shell in the existing preview. Reuse the measured screen/aperture geometry, keep the black backplate and reflections in the correct order, and use a few quiet pixel fish. No second simulation, network fetch, or live bus image stream is needed.

Acceptance: every machine and Bare tank has visible water; art stays above the aquarium; the preview fits the normal control-panel well; no extra render loop; deterministic markup/geometry tests and screenshots.

### U03. Small windows must remain usable, not merely keep their frame [P2, reproduced]

At 320x400, the Preferences preview collapses to 2 px and the caption overlaps the list. At 300x120, Stats care text starts below the viewport and cannot be reached. The web Stats grow minimum is 300x60, inconsistent with native's nominal 300x250. All HTML pages also lack viewport metadata.

Fix: state a supported minimum, use responsive stacking or an explicit scrollable content region below it, and share native/web minimum geometry. Test 320/375/565 widths, short heights, 200% text zoom, long names and two care hints. Preserve bitmap text on whole pixels. Native visual and keyboard tests are required for the custom grow boxes.

### U04. Make destructive actions reversible [P2]

Overview immediately removes content on Delete/Backspace. Prefer one-level Undo with a clear named action and keyboard shortcut; otherwise use the project's in-page confirmation pattern, not an unsupported WKWebView `confirm`. Keep selection stable after removal and announce the result. Test repeated keydown, focused text fields, pack-wide removal, and a delayed state echo.

### U05. Make loading, partial failure, and persistence visible [P2]

Many failures are console-only. Add concise in-window states for restoring, unavailable pack, cached listing, partial catalogue, quota failure, and a stopped import. A fallback fish is useful only if it is clearly a placeholder rather than a mislabeled species. Preserve the real underlying error in diagnostics and offer a practical next step. Avoid modal alert storms or a permanent busy HUD.

### U06. Finish keyboard and assistive-technology interaction [P2]

The tank canvas has no accessible description or keyboard focus, and the CRT canvas is decorative but not marked so. Overlay focus is not trapped/restored and underlying controls can remain reachable. Bare shortcuts do not generally guard editable targets. Companion windows lack a robust waiting/stale announcement. Audit focus order, Escape/Enter, focus visibility, labels, and screen-reader summaries. Keep changing per-frame fish positions out of live regions.

### U07. Respect reduced motion and calm visual defaults [P2/P3]

CRT flicker/grain/rolling brightness animate without a reduced-motion policy. Source screenshots show a bright, highly processed CRT look, while default startup is CRT-off. Offer a restrained all-day preset and a steady CRT variant; preserve the user's detailed controls. Reduced motion should remove flicker and decorative motion without changing fish care outcomes. No surprise white flash or degauss effect by default.

### U08. Refine the composition before adding more effects [P3]

Preserve the classic fonts, bevels, real case art, nearest-neighbor fish, and sparse controls. Improve placeholder silhouettes, backdrop aspect preservation, gravel's hard straight edge, roots seated in gravel, modest depth ordering, and consistent fish scale. A soft blue night tint is preferable to crushing everything to black. Keep bright fish readable over bright backdrops. Avoid mixing modern rounded cards, blur, and oversized typography into the Platinum windows.

### U09. Make the importer fast to scan [P2]

165 fish entries make substring filtering, readable names, type-ahead, per-row loading state, and a clear selected-item preview valuable. Long names should ellipsize without wrapping inside a fixed-height row. Distinguish install/uninstall from adding another animal, especially for multi-fish packs. Keep source attribution and Donate, and show whether an item is already cached. Do not automatically download every full pack just to decorate the list.

### U10. Make the floating Mac behave politely [P2, native verification needed]

Always-on-top and all-Spaces behavior is forced. Offer a clear preference without losing the original desktop-toy default. Verify transparent edges do not capture unwanted clicks, drag/resize on all machines, restoring to a removed monitor, custom-window focus, and recovery after WKWebView content-process termination. Keep standard AppKit menu conventions and add native Help/About parity.

## Missing features worth building in small slices

1. **Safe starter aquarium.** One explicit choice downloads a small curated set with itemized progress, cancellation, and an offline placeholder fallback. Never silently fetch an entire library. Success means a recognizably stocked tank on a first run without a tutorial marathon.
2. **Backup and tank profiles.** Export a versioned tank with settings, roster, stable pack provenance, and an explicit local-asset inclusion choice. Import validates before replacing anything and offers preview/rollback. Multiple tanks should build on the authority model in B14, not competing global save keys.
3. **An actual specimen library.** Installed species remain reusable after their last living fish is removed. Show a plain-language name, original name, source, cached status, and the decoded description where available. Keep "Add fish" distinct from "Remove pack".
4. **Per-fish Get Info and rename.** Use the Finder-style overview and the existing stable ID. Renaming changes a display name, not species/pack identity. Show hunger gently, locate the fish with a brief highlight, and preserve keyboard selection. Species-specific behavior can later consume validated original parameters.
5. **Calm lighting controls.** Auto/manual/real-clock are distinct modes, not competing booleans. Keep manual dimming, persisted choice, and simulation time separate. A light switch should explain why a tank stays dim.
6. **Sound controls with honest persistence.** Mute, master/ambient volume, unobtrusive imported-sound playback, and uninstall provenance. Smooth gain changes and retire audio nodes. Fix B11 before promising a permanent sound library.
7. **Reversible care.** Gentle water change, food-type variations, and observable appetite/gulp feedback. Growth or breeding should be bounded and optional. Hunger/sickness must not turn a desktop relaxation toy into an obligation.
8. **Portable visual checks.** A small browser suite with synthetic local art, controllable clock and mocked archive responses should cover startup, empty save, malformed pack, import acknowledgment, focus, layout, and reload. Real archive checks belong in an optional smoke command, not required deterministic CI.

## Delight without clutter

- **Mac postcard camera:** composite the aquarium and case into one pixel-faithful PNG, optionally with a tiny date/species caption. All local; no upload, account, or sharing prompt. Preserve the exact screen/aperture geometry and existing reflections.
- **CRT test card in Preferences:** a switchable calibration preview with color bars, grayscale steps, a circle and one-pixel grid. It explains scanlines/geometry controls without interrupting the live aquarium. Return to the aquarium preview with one click.
- **After Dark relaxation view:** fullscreen bare tank, cursor fades only while idle, no alerts, Escape restores the previous layout. No accelerated hunger or catch-up penalty. A later screensaver can reuse this mode.
- **Desk-lamp evening:** a subtle optional warm room reflection around a cool blue tank, with a steady night setting. Do not add continuous full-resolution reflection canvases to every frame.
- **An unobtrusive activity LED:** a small existing case indicator or Platinum status glyph lights steadily during import and returns to idle when complete. Avoid rapid flashes, fake disk sounds, and hidden activity with no textual equivalent.
- **Aquarium scrapbook:** a SimpleText-like log of genuinely interesting local events, with user-triggered snapshots and a bounded history. No nagging anniversaries or notifications by default.
- **Specimen cards:** an illustrated card using the original fish sprite, plain and original-language names, a short decoded description, and attribution. Collect knowledge, not chores or achievements.
- **A snail cameo:** one slow, rare glass snail, cosmetic and bounded. It must not claim to clean water unless it actually affects the sim. A reduced-motion setting can keep it still.
- **Curiosity with boundaries:** one calm fish may notice a parked cursor, with a standoff distance, cooldown, and a touch-safe equivalent. Never let every fish swarm the pointer or override hunger/panic.
- **Occasional bubble punctuation:** tiny surface rings or a soft gulp after a real event, bounded and tick-driven. The event should be legible without sound. No random screenshake or confetti.
- **About This Aquarium:** a Macintosh About-style panel whose "memory" bar is occupied tank space and whose "system uptime" explicitly means aquarium time. Include version, original-art provenance, license, and LLM disclosure honestly.
- **Low-risk aquascaping:** move a plant with an explicit arrange mode and snap to the gravel; Escape cancels, Undo restores. Do not make ordinary feeding drags unexpectedly rearrange the tank.

## Corrections to older analysis claims

- `nearestFood` already skips `fd.eaten`, and fish update sequentially. The prior claim that it necessarily targets an already eaten pellet is unsupported. B06 is the concrete adjacent state-transition bug.
- CRT shader time already wraps every 100 seconds and noise uses `fract(uTime)`. "Wrap time more frequently" is not a verified long-session fix. Profile a real precision artifact first.
- Native mask code explicitly derives the alpha byte offset from alpha format and byte order. It does not simply assume premultiplied-first. Retain a native image test, not that unsupported bug claim.
- Ordinary JPN loose-file categories use an HTML listing; the nested bonus archive is fetched for deeper enumeration. Do not state that opening every JPN category necessarily downloads the entire outer set archive.
- O(fish²) schooling is not present in this baseline. Population, growth, menu bars, pause, food-zone cues, and several other features described as "landed" in older notes exist only as historical branch claims until verified in main.
- A successful build is not proof of a complete web artifact (B01), and green isolated tests do not cover exporter/loader interoperability (B05).
- Stats clipping is a usability defect at an allowed web size, not an acceptable consequence of retro styling.

## Implementation selection and stop conditions

Favor narrow, independently reviewable improvements over duplicating all historical feature branches:

1. **Complete the web artifact (B01).** No source-asset fallback required; isolated build regression and browser smoke pass.
2. **Keep malformed art out of the renderer (B03/B04).** Bounded indexed PNG decode and validated sprite metadata; rejection tests fail before the fix and pass after; valid fixtures and a real fish still load. RGBA scenery interoperability remains a separate task.
3. **Remove duplicate paint/upload work (P01).** Source updates track painted simulation frames while CRT time/resize/config effects remain live; counted browser comparison and targeted unit coverage.
4. **Put an aquarium in machine previews (U02).** Static deterministic miniature, all cases including Bare tank, no extra animation loop or network work.
5. **Correct abandoned food-seeking (B06), if kept as an independent small patch.** Observable state transitions and deterministic regression tests, not a behavior-system rewrite.

The empty-save bug, scenery format mismatch, and persistence transaction issues remain high-priority follow-ups if not included in this implementation tranche. Do not hide them under cosmetic work or label them fixed by an unrelated PR.

Each selected implementation should branch from freshly fetched main, include its own proof, and open a PR against main. Work on the next independent change while review runs. Review claims require verification; do not manufacture changes merely to provoke another round. Leave every implementation PR open for the user's review and merge. Track actual completed review rounds and distinguish a timeout from approval.

Finally consolidate this report with `ANALYSIS.md`: retain unique prior ideas and delivery/review history, remove duplicate active entries, correct unsupported claims, distinguish pending implementations from available future work, and publish the documentation on main. Only documentation is authorized for direct-to-main delivery in this task.
