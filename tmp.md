# Finsical review (tmp)

Scope: the whole Finsical repository at base commit `0499443` (review date 2026-09-23): the simulation and decoders in `core/`, the tank page and client windows in `web/`, the Swift shell in `macos/`, the Python asset tools in `tools/`, CI and docs.

Method: ten dimension reviewers (core bugs, tank page, client windows, macOS shell, performance, visual and layout, UX, AquaZone fidelity, tooling and docs, delight) read the code and checked their claims with node/vitest/Python snippets, Playwright screenshots against a built copy, and real add-on packs downloaded from archive.org. An adversarial verifier then re-checked every finding, corrected severities and proposals, and dropped what did not hold up. A completeness critic added the gaps. Near-duplicates across dimensions are merged below; every merged item keeps all locations and the best (usually the verifier's corrected) proposal.

Conventions: severity follows the verifier (critical = data loss, crash or broken core flow; high = clearly wrong user-visible behavior or a major performance issue; medium = real but limited; low = minor; nit = cosmetic; idea = improvement, not a defect). Value and Risk are 1-5. Line numbers refer to `0499443`. Scratch evidence (scripts, screenshots) lived under the review scratchpad and is not part of the repo.

## Top picks

Highest value per risk, across all sections:

1. B-01: Draw each species' adult sprite ring instead of the shared fry sheet.
2. B-05: Open client windows at the tank's level, beside it, not hidden underneath.
3. T-01: Publish the draft release so the README Download link works.
4. B-03: Seeking fish re-arm their stroke instead of crawling slower than a sinking pellet.
5. B-02: Fix the MACE 3:1 decoder tables and re-pin the goldens against FFmpeg.
6. B-04: Keep each pack of a multi-pack add-on bound to its own fish across relaunches.
7. P-02: Decode only the sprite sheet the tank uses (up to 135 ms saved per pack).
8. F-03 with B-22: Animate plants and accessories and stop showing the overhead layout view.
9. V-01: Crop and smooth-scale backgrounds once instead of squashing them every frame.
10. V-02: Draw all decor at one shared art scale so sizes relate.
11. B-06: Ship a universal (arm64 + x86_64) binary.
12. B-24: Stop Cmd-I in the app from opening the cramped in-page importer.
13. B-26: Let the first click on the inactive tank feed or tap (acceptsFirstMouse).
14. B-10: New fish arrive hungry and eat food drifting past them.
15. P-03: Render only when a sim tick ran (halves GPU work at 60 Hz).

## Implementation plan (this session)

Each item below gets its own branch cut from `origin/main` and its own PR against `main`; the PRs stay open for the maintainer. Items were chosen for value per risk, for being verifiable here (vitest, typecheck, Playwright screenshots; Swift is compile-checked by CI on macOS), and for staying clear of work already in flight in other open PRs (backdrop cover-crop, CRT buffer cap, concurrent sound decoding, viewport meta and tank label), which is skipped here.

| Branch | Items | Summary |
| --- | --- | --- |
| `claude/adult-fish-art` | B-01, V-10 (fish part) | Draw each species' adult pose ring at one shared art scale; preview, tank and thumbnails agree; big fish stay inside the tank. |
| `claude/mace-tables` | B-02, T-03 (MACE part) | Correct MACE 3:1 tables, new goldens cross-checked against an FFmpeg-faithful reference, LGPL attribution. |
| `claude/calmer-fish` | B-03, B-07, B-08, B-10, B-31, B-32 | Fish reach food, keep stroking toward their target instead of re-rolling every second, flip facing only through a roll, newcomers eat. |
| `claude/render-on-tick` | P-03, P-13, S-01 | Draw only when the sim advanced, suspend audio while hidden, keep the loop alive if one sprite throws. |
| `claude/client-windows-front` | B-05, U-17, B-26 | Client windows share the tank's level, open beside it on the current Space, and the first click on the tank counts. |
| `claude/mac-menus` | U-05, U-16, U-19 | About, Hide, Hide Others, Show All, Services and Help menus; Float Above Other Windows and Show on All Desktops toggles; CRT checkmark; Cmd-W no longer quits. |
| `claude/day-night-clock` | B-09, F-08, D-01 | A real night half, an optional light timer that follows the Mac's clock with dawn and dusk tints, and fish that rest at night. |
| `claude/sound-prefs` | F-05 (part 1), B-17, B-45 | Volume, mute, bubble and ambience switches in a Sound pane; no burst of queued sounds on the first click; install feedback stops. |
| `claude/animated-decor` | F-03, B-22, V-02 | Plants and accessories animate with their shipped frames, use their in-tank art, and share the fish's art scale. |
| `claude/living-water` | A-01, V-11, V-12 | Wobbling, growing bubbles that pop, a shimmering surface, caustics, scattered pellets and visible murk. |
| `claude/welcome` | U-02, D-07 | A Mac OS 8 alert module, a first-run offer to stock the tank from archive.org, and the 'please don't tap on the glass' sign. |

Anything not listed stays open for future work; ANALYSIS.md will carry the remainder once this session ends.

## Bugs

### B-01 **Every fish is drawn with its generic fry sprite instead of its adult art**
Severity: high · Effort: M · Value: 5/5 · Risk: 3/5

Where: `web/main.ts:120-133` (usePack sort), `web/main.ts:455-463` (addonThumb), `web/main.ts:1027-1044` (MAX_FISH_W/H, drawFish), `web/render.ts:61-72` (swimCanvas cache), `web/render.ts:76-88` (previewOf), `core/data/fsh.ts:148-164`, `core/sim.ts:72`, `core/sim.ts:345-363`, `core/sim.ts:378-388`.

What: Fish packs hold two sprite families under the same ids: ELRA (adult) and ELRB (baby). The BMV# scripts are named 'Baby Idle'/'Baby Swim'. Each family has 4 sheets: an 8-group swim ring, a 6-group pitch sheet, a 2-group turn sheet and a 2-group dying sheet. usePack sorts by group count and breaks ties toward the smallest cellH, so it always binds the small baby ring. Those baby sheets are shared generic art: across 82-109 decoded packs only 38-45 distinct tank sprites exist. One 9x31 grey yolk-sac fry (md5 ebde37c8) serves clownfish, comet, ryukin, damselfish, emperor angel, black tang, hogfish, congo, blackmoor and spotted puffer; one 32x32 juvenile (9aa638b5) serves queen angel, blue tang, checkered puffer, goldfish, copperband and others. Picking the largest 8-group ring instead gives 89 distinct sheets. previewOf sorts by cell area only, so the Import preview shows a different sheet from the tank: usually the adult, sometimes a 6-group sheet, and for angels and ネオンテトラ the 2-group dying sheet (a pale grey fish). Pack order varies: disc addon1-6 and goldfish addon put the small set first, and goldfish addon's order is 8g,2g,8g,2g,6g,2g,6g,2g, so sub-sheets cannot be classified by position.

Evidence: decoded packs with fshToSheets plus the usePack comparator and hashed the chosen idx; a Playwright drop of clownfish, comet, ryukin and damselfish showed four identical tiny grey fry. Adult cells run from 50x100 (clownfish) to 110x160 (comet, 160x110 after rotation).

Proposal:
1. Add a pure `pickSwimSheet(sheets)` (new `core/data/species.ts`, or `fsh.ts`): among sheets with the maximum group count, return the largest `cellW*cellH`, first in pack order on ties (the GP*.REZ packs hold 64-80 sheets with many equal 8g 94x130). Also return `baby` = the smallest other candidate for later growth (F-11). Once F-01 exists, use ELRA/ELRB at the species base id instead. Use it in usePack, previewOf, fishThumb and addonThumb so the Chooser preview, the tank and the thumbnails always match. previewOf draws the right-facing profile `swimCanvas(sheet, 0, -1, groups >= 4 ? groups/2 : 0)`. Bump the stored thumb prefix (`import.ts:931`, `thumb:` to `thumb2:`) so stale previews regenerate.
2. Scale: add one named `ART_SCALE` (start at 0.5 = TANK.width/640 for the 640x480 originals; try 0.31 = /1024 too and tune from screenshots). Pre-scale once per cached frame inside swimCanvas (key `${group}:${f}:${facing}:${scale}`) with an alpha-weighted 2x2 box filter (average RGB of opaque texels, alpha = coverage >= 0.5) so 1-px outlines survive. drawFish then draws unscaled; keep MAX_FISH_W/H only as a safety clamp. Share ART_SCALE with V-02.
3. Sim extents: add runtime-only `halfW/halfH` to Fish via `Sim.setExtent(id, hw, hh)`, set when a sheet binds (handleSheets, remapSheetIdx, spawnFish). Wall clamps and decide() use `max(MARGIN, 0.6*halfW)` and `SURFACE + max(MARGIN, 0.6*halfH)` so fish tuck partly behind the bezel. Measure the eat distance and bubble spawn from a mouth point `x + facing*(halfW-3)`.
4. Tests: species.test.ts with synthetic sheets in comet order `[8g big, 6g, 2g, 2g, 8g small, ...]`, disc order `[small set, 8g big, 2g, 6g, 2g]` and goldfish-addon order; pickSwimSheet returns the big 8g sheet each time; previewOf and usePack return the same sheet object. sim.test: a fish with halfW=40 never has x-halfW < MARGIN over 5000 ticks. Node probe: more than 80 distinct selected sheets across the 88 archive.org fish add-ons. Manual: install comet and see an orange ~80x55 fish.

### B-02 **MACE 3:1 decoder uses the wrong tables for the middle 2-bit code; golden tests pin the bug**
Severity: high · Effort: S · Value: 5/5 · Risk: 2/5

Where: `core/data/snd.ts:193-248` (MACE_TAB_B64/MACE_TAB2, MACE_TAB1, mace3Decode loop at :234), `tools/az/mace.py:21-59`, `tools/az/mace_tab.bin`, `core/data/snd.test.ts:63` (unused `sndFmt1Mace`), `core/data/snd.test.ts:279-287`, `tools/tests/test_snd.py:103-124`.

What: FFmpeg `libavcodec/mace.c` decodes each MACE3 byte as three codes `{pkt&7, (pkt>>3)&3, pkt>>5}` with a per-position table: `tabs[] = {{MACEtab1,MACEtab2,4},{MACEtab3,MACEtab4,2},{MACEtab1,MACEtab2,4}}`, and line 276 calls `chomp3(..., val[1][l], l)`. Both ports use MACEtab1/MACEtab2 with stride 4 for all three positions, so the 2-bit middle code always takes a positive entry and the index adapts with the wrong step table. `mace_tab.bin` equals MACEtab2; MACEtab4 is absent. Python and TS share the bug, so the cross-implementation hash pin (`150be20e...`) passes while both are wrong. Every MACE-compressed 'snd ' resource decodes with a strong positive DC drift (dropped AQUAZONE forks, MACE sound files, and any pack built by `tools/`).

Evidence: an exact Python port of FFmpeg's read_table/chomp3, with the 3-bit tables forced, reproduces the repo's golden bit-exactly; with the correct tables 599/600 samples differ on `0x39F1*100`. Repo output rails near +32767 (mean 29449) while FFmpeg's stays in [-258, 1285] (mean 280).

Proposal:
1. Move the MACE code into `core/data/mace.ts` (same signature) and keep `tools/az/mace.py`; give both an `SPDX-License-Identifier: LGPL-2.1-or-later` header and FFmpeg attribution (see T-03).
2. Add MACEtab3 = `[-18, 140, 140, -18]` and the 128x2 MACEtab4 (FFmpeg mace.c lines 109-143) as big-endian s16 in `tools/az/mace_tab4.bin` (sha256-pinned like mace_tab.bin at test_snd.py:164) and as a second base64 const in TS.
3. Implement read_table exactly: `stride = (4,2,4)[l]; row = tab2[(index & 0x7f0) >> 4]; cur = val < stride ? row[val] : -1 - row[2*stride - val - 1]; index += tab1[val] - (index >> 5)`, keeping the int16 wrap of index/level and FFmpeg's clip.
4. New goldens in both suites: `sha256(mace3(0x39F1*100, 100)) = b0a200e1b12b8b030724fd034cfb19c104e8131fbb3c7429d0bc337707cb9a5f` (snd.test.ts:286, test_snd.py:109) and `parse_snd(snd_fmt1_mace(0x24*20, 10))` PCM = `0e7832566fa0a88c9a6fc29b927df72d93d3ce0f72d5c4a9af808b60b1bfa398` (test_snd.py:122). Add a DC-sanity test (|mean| < 2000 on a 0x39F1 stream) and use `sndFmt1Mace` in a TS parseSnd 0xFE test.
5. Optional: `tools/tests/gen_mace_vectors.sh` that wraps bytes in an AIFF-C 'MAC3' file and decodes with real ffmpeg, so goldens come from an outside decoder.
6. CHANGELOG: users must re-drop imported .rsrc/.bin/.hqx sounds (IndexedDB 'snds' stores decoded WAV) and regenerate any `web/pack` built by the tools.

### B-03 **Seeking fish latch the brake early and crawl slower than the pellet sinks**
Severity: high · Effort: S · Value: 5/5 · Risk: 2/5

Where: `core/sim.ts:289-297` (seek branch never re-arms), `core/sim.ts:317-325` (brake floor cruise*0.15), `core/sim.ts:86` (FOOD_SINK 0.35), `core/sim.ts:115` (BRAKE_DIST 24).

What: In seek mode the stroke latch is armed once (dist < BRAKE_DIST) and never re-armed, because decide() is skipped while food exists. After latching, speed decays to cruise*0.15 (0.17-0.27 px/tick), below FOOD_SINK, so the pellet sinks away and the fish trails it to the bottom. A latch left over from a wander move carries into the seek. Viewers see hungry fish hovering above a pellet for ~20 s.

Evidence: seed 42, fish (60,120), cruise 1.4, food at x=200: latch at t=102, speed 0.21, gap grows to 58 px, still not eaten at t=700. Over 200 random trials about half the pellets are eaten only after settling (median 4.4 s, p90 28.7 s).

Proposal: In the drift/seek branch, re-arm without zeroing speed: `if (food && f.latch >= 0 && dist > BRAKE_DIST) { f.latch = -1; f.phase = Math.max(0, Math.ceil(Math.sqrt(f.speed / f.cruise * RAMP_DIV)) - 1); }` (resumes the ramp at the current speed; `phase = 0` would cause a visible one-tick stop). Brake floor: `food ? Math.max(f.cruise * 0.15, FOOD_SINK * 1.5 / vigor) : f.cruise * 0.15`. Optional: aim ahead of a sinking pellet (`ty = food.y + FOOD_SINK * min(30, dist / max(speed, 0.5))`). Prototype result: 200/200 eaten mid-water, median 3.2 s, p90 5.6 s; the seed-42 case eats at t=124. Tests (core/sim.test.ts): the seed-42 scenario eats within 300 ticks with `settled === 0` at eat time; a fish latched on a wander target reaches >= 0.9*cruise within 20 ticks of food appearing 200 px away; the existing brake/glide wander tests (sim.test.ts:160-185) still pass.

### B-04 **Multi-pack fish add-ons all turn into their last species after relaunch**
Severity: high · Effort: M · Value: 5/5 · Risk: 3/5

Where: `web/main.ts:253-270` (handleSheets), `web/main.ts:275-295` (remapSheetIdx), `web/main.ts:631-635` (remoteInstall loop), `web/import.ts:318-364` (PackResult, importAddon), `web/import.ts:1083-1097` (applyPack), `web/overviewmodel.ts:66`.

What: One add-on zip can hold several sheet-bearing packs (angels.zip = angel.fsh + blackangel.fsh; tama.zip has 3 colours; disc addon2 has 3; goldfish addon has 5). handleSheets runs once per pack with the same `url` and overwrites `sheetByPack.set(url, idx)`, so only the last slot survives. During the session fish keep their own sheetIdx, so it looks right. On the next launch remapSheetIdx rebinds every fish with `f.pack === url` to that last slot, permanently. All fish of such an add-on are also named after the zip ('angels' twice), so Overview and Stats cannot tell them apart. 17 of 88 archive.org fish add-ons are affected.

Evidence: Playwright: install angels.zip; saved roster sheetIdx [4:0, 5:1]; after reload and the 10 s save [4:1, 5:1], both thumbnails identical.

Proposal:
1. Add `entry: string` to PackResult (basename stem of RawBlob.name), filled in importAddon; pass it through ImportHandlers.onSheets and remoteInstall. Key parts by entry name, not array position.
2. Store it on Fish as optional `packPart` (persisted in saveTank, set in spawnFish). Replace `sheetByPack: Map<url, slot>` with `Map<url, Map<part, slot>>` (nested maps, not '#'-joined strings, since URLs already contain '#'); packBySheet becomes slot -> {url, part}.
3. When more than one usable result has sheets, name each fish by `r.entry` ('angel', 'blackangel'); single-pack add-ons keep `it.inner`. URL identity is unchanged, so removal still matches by `f.pack === url`.
4. Legacy migration (recovers rosters already collapsed by this bug): for fish with `pack` but no `packPart`, sort same-pack fish by id and assign parts in the add-on's entry order, cycling; the original install spawned them in part order with ascending ids.
5. removeAddon deletes every part's slot and packBySheet entry; addonThumb uses the first part.
6. Put `resolveSlot(fish, bindings)` and `migrateParts(fishOfPack, entries)` in a pure `web/tankmodel.ts`. Vitest: two parts with two fish each keep their parts; a legacy pair maps to parts [0,1]; a missing pack returns undefined. Playwright: install angels, reload, saved sheetIdx stay distinct and rows read 'angel'/'blackangel'.

### B-05 **Client windows open centered underneath the always-on-top tank**
Severity: high · Effort: S · Value: 5/5 · Risk: 1/5

Where: `macos/Finsical.swift:500` (tank `.floating`), `macos/Finsical.swift:118-121` (openPrefs/openOverview/openImport/openStats), `macos/Finsical.swift:146-156`, `macos/Finsical.swift:523`, `node_modules/osmium-ui/macos/OsmiumWindows.swift:133-139` (restore centers), `node_modules/osmium-ui/macos/OsmiumWindows.swift:245-284` (create sets no level).

What: The tank is `.floating`; Osmium client windows stay `.normal`. On first launch both are centered on the same point, and the tank (about 332x428 pt for the Plus) covers the middle of Import Add-ons (621x441), Preferences (565x457), Overview (521x381) and nearly all of Stats (360x320). A normal-level window can never order above a floating one, so clicking it does not help. Code-verified; not run on macOS.

Proposal: In AppDelegate add `showClient(_ hw: OsmiumHostedWindow)`: note `let fresh = frames.frame(for: hw.spec.frameKey) == nil` before `host.show(hw)` (which creates the window lazily), then set `hw.window?.level = window.level` and call `makeKeyAndOrderFront(nil)` again so the level applies. If `fresh`, place it beside the tank: x = `window.frame.maxX + 12` when it fits in `window.screen!.visibleFrame`, else `window.frame.minX - w - 12`, clamped, top aligned with the tank (setFrameTopLeftPoint). Use it in all four open* actions. Do NOT set `hidesOnDeactivate`: it would hide Import Add-ons while Finder is active (breaking Finder drags, `addons.ts:39-40`) and hidden windows fail the relay's isVisible filter. Upstream follow-up: optional `level` on OsmiumWindowSpec. Manual test: `defaults delete dev.finsical.app`, launch, press Cmd-I and Cmd-,; both open fully visible beside the tank and stay in front while key.

### B-06 **The release binary is arm64-only although Info.plist promises macOS 12 (which runs on Intel)**
Severity: high · Effort: S · Value: 4/5 · Risk: 2/5

Where: `macos/Makefile:39-41` (swiftc `-target $(shell uname -m)-apple-macos12.0`), `macos/Makefile:44-50` (minos check), `macos/Makefile:52` (codesign), `.github/workflows/release.yml:18` (`runs-on: macos-15`, arm64), `macos/Info.plist:19-20`.

What: The binary contains only the build host's architecture and releases build on an Apple-silicon runner. Intel Macs on macOS 12-15 get 'not supported on this type of Mac'. No lipo step exists and CI never checks architectures. The minos check would also break on a fat binary (vtool prints one `minos` per slice).

Proposal: Add `ARCHS ?= arm64 x86_64` to the Makefile. Loop `for a in $(ARCHS); do swiftc -O ... -target $$a-apple-macos$(MACOS_MIN) -o $(APP).staging/Finsical-$$a $(SOURCES) || exit 1; done; lipo -create -output $(APP).staging/Contents/MacOS/Finsical $(APP).staging/Finsical-*; rm $(APP).staging/Finsical-*`. Run the minos check per arch with `vtool -arch $$a -show-build ... | awk '$$1=="minos"{print $$2}'`. Codesign after lipo. In ci.yml's native-macos job, assert `lipo -archs .../Finsical | tr ' ' '\n' | sort | tr '\n' ' '` equals `arm64 x86_64 `; the SWIFT_VERSION=6 step may pass `ARCHS=arm64`. If Intel is deliberately unsupported, say 'Apple silicon required' in README and CHANGELOG instead.

### B-07 **Fish re-roll their destination about every second: constant barrel rolls and dead stops**
Severity: medium · Effort: M · Value: 4/5 · Risk: 3/5

Where: `core/sim.ts:105-109` (MOVE_TICKS 32 and its comment), `core/sim.ts:298-303` (budget expiry -> decide -> maybeTurn), `core/sim.ts:317-320` (ramp restarts at cruise/64), `core/sim.ts:378-393` (decide resets speed), `core/sim.test.ts:199`.

What: decide() picks a random destination anywhere (median 84 px away, ~60 ticks of travel) but the budget is 32 ticks, so almost every move is cut short and 55% of new targets lie behind the fish, triggering a roll. On each expiry the ramp drops speed from full cruise to cruise/64 in one tick. Measured over 10 sim-minutes with 6 fish: 2896 decisions, only 47 arrivals; ~26.7 rolls and ~14.6 one-tick halts per fish-minute. That reads as frantic for a relaxation toy. The MOVE_TICKS comment says the ~1 s cadence mirrors the original, so keep the cadence and remove the stops and reversals.

Proposal: (1) In the drift branch, when `f.phase >= MOVE_TICKS && dist >= BRAKE_DIST && f.strokes < 3`, start a new stroke toward the same target (`f.phase = 0; f.latch = -1; f.strokes++`) instead of decide(); call decide() on arrival (dist < 4) or when strokes run out, and reset `strokes` there (runtime-only field). (2) Glide ramp: `f.speed = Math.min(f.cruise, Math.max(f.speed * 0.93, f.cruise * (f.phase + 1) ** 2 / RAMP_DIV))`, and drop the speed reset in decide(). (3) Optional: bias new targets to the facing side (70%). Prototype: rolls 11.7-15.8/min, halts 0/min. Tests: a 10-minute 6-fish run with rolls per fish-minute < 18 and no drift/seek tick dropping speed by more than 0.35*cruise; update 're-decides when the movement budget expires' to assert a new stroke or decision started; keep 'darts out of each decision' working for a fish starting at rest.

### B-08 **Facing flips as a one-frame mirror pop after eating and when steering through vertical**
Severity: medium · Effort: S · Value: 3/5 · Risk: 2/5

Where: `core/sim.ts:332` (facing = sign(cos(heading))), `core/sim.ts:334-341` (eat branch calls decide() without maybeTurn()), `core/sim.ts:399-409` (maybeTurn threshold -1e-6), `core/pose.ts:22` and `core/pose.ts:110` (ring jumps group 0 <-> ng/2), `core/sim.test.ts:186-197`.

What: Facing is recomputed every tick from the heading, so two paths flip it without the roll: after eating (new target behind, no maybeTurn) and near-vertical targets where the heading crosses +/-90 degrees (even `cos(-PI/2) = 6e-17` flips it). On pose-ring sheets that is a jump from group 0 to ng/2. Conversely, a target 0.5 px behind and 60 px below triggers a full 10-tick roll. A 20-seed feeding run showed 458 facing changes outside turn/startle, 408 within 2 s of eating.

Proposal: (1) Safe core: call `this.maybeTurn(f)` after decide() in the eat branch (sim.ts:340). (2) Hysteresis: change facing only when `Math.cos(f.heading) * f.facing < -0.26` (~105 degrees); if steering would pass that, clamp pitch at +/-75 degrees and call maybeTurn so every reversal rolls. (3) maybeTurn dead zone: roll only if `Math.cos(want) * f.facing < -0.2` or `|tx - x| > 6`. Update the pinned test at sim.test.ts:186. Test: the 20-seed feeding run has zero facing changes outside turn/startle; a fish directly above a pellet (dx = 0.5) never enters 'turn'.

### B-09 **Day/night curve: dead clamp, night only 18% of the cycle, and a new tank opens at the darkest moment**
Severity: medium · Effort: S · Value: 3/5 · Risk: 1/5

Where: `core/sim.ts:128-129` (DAY_TICKS 24000), `core/sim.ts:199-203` (Sim.light), `web/main.ts:1118-1123` (flat night veil), `web/statsmodel.ts:78` (phase = light > 0.5), `core/sim.test.ts:147`.

What: `light = 0.3 + 0.7 * Math.max(0, Math.sin(t * Math.PI))` with t in [0,1) is one hump; the max() never applies (probably sin(2*PI*t) was meant). light <= 0.5 for 18.4% of the 13.3-minute cycle, < 0.9 for 65.6%, and light(0) = 0.3, so every fresh tank opens under the darkest 0.385-alpha navy overlay and Stats says 'Light: Night' at age 0m. Night is a flat rgba(4,8,24) veil that reads as 'dim', not 'moonlit'. There is a derivative cusp at the wrap.

Proposal: Replace with a periodic curve with real halves: `const sun = Math.sin(2 * Math.PI * (t + 0.125)); return 0.3 + 0.7 * smoothstep(-0.25, 0.25, sun);` (light(0) = 1.0, about 47% night, ~8% ramps), or a pure `lightAt(t)` trapezoid (day 45%, night 35%, 10% smoothstep ramps). Render night with `globalCompositeOperation = 'multiply'` and a #3a4a80-ish tint scaled by (1-light) instead of the flat veil. Minimal fallback if the curve stays: start new tanks (saved === null) at `tickCount = DAY_TICKS * 0.25`. Update the HUNGER_PER_TICK comment (sim.ts:81-83), which ties hunger to day cycles. Real-clock lighting is F-08. Tests: replace sim.test.ts:147 with light(0) >= 0.85, fraction with light < 0.5 in [0.4, 0.5], max per-tick |delta| < 0.001, light(t) == light(t + DAY_TICKS); statsmodel 'night' covers >= 30% of a cycle.

### B-10 **New fish ignore food for about 4 minutes; hunger labels disagree with the sim**
Severity: medium · Effort: S · Value: 4/5 · Risk: 1/5

Where: `core/sim.ts:83-84` (HUNGER_SEEK 0.4), `core/sim.ts:153` (addFish default hunger 0.2), `web/main.ts:70-72` (DEFAULT_FISH), `web/main.ts:138-148` (spawnFish), `web/statsmodel.ts:40-47` (duplicated QUALITY_SEEK), `web/statsmodel.ts:121-125` (hungerLabel).

What: Every new fish (the starters and each install) starts at hunger 0.2 and seeks food only above 0.4: 7200 ticks, 4 minutes. A new user's first action, clicking near the surface, drops pellets nobody eats; each rots for 45 s and costs ~0.11 water quality net of filtration. hungerLabel says 'peckish' from 0.33, below the seek threshold, and statsmodel hard-codes its own copies of sim constants.

Proposal: (1) Opportunistic eating: in the drift/seek branch a fish with hunger > 0.1 that is not seeking eats any pellet within 3*EAT_DIST of its mouth. (2) spawnFish and DEFAULT_FISH pass hunger 0.45 (keep the addFish default for tests). (3) Move HUNGER_SEEK, QUALITY_SEEK and HUNGER_PER_TICK into a pure `core/tuning.ts` imported by sim.ts and statsmodel.ts, and start 'peckish' at HUNGER_SEEK. Tests: `addFish({x:160, y:80, hunger:0.45})`, `dropFood(160)` at tick 0, pellet eaten with `settled === 0`; `hungerLabel(HUNGER_SEEK - 0.01) === 'full'`.

### B-11 **Fish add-ons with no usable sprites still report 'Added to the tank'**
Severity: medium · Effort: S · Value: 4/5 · Risk: 1/5

Where: `web/main.ts:318-330` (handleImages drops fish-section images), `web/main.ts:619-646` (remoteInstall records success when only images decoded), `web/import.ts:309-315` (fetchInnerBlobs), `web/import.ts:793-859` (showDetail), `web/import.ts:1083-1098` (applyPack), `web/import.ts:520-529` (loadProblem).

What: Any result with images counts as usable. For the fish section nothing is drawn, yet the install is recorded, restored every launch and listed as 'Fish add-on, In tank'. Affected: 'arow addon1' (aw*.rez hold BMP frames only; its Arowana.dna duplicates Medaka art), 'pleco' (no sprite stream), 'pleco addon1/2/3' (BMP frame runs), and 'updatedAZfiles' (AquaZone .exe/.dll/.rez program updates; its two Aquazone.rez copies spawn two fish named 'updatedAZfiles'). The detail pane even calls 'arow addon1' '7 packs, scenery.' This violates the repo rule never to report a skipped operation as successful.

Proposal: (1) In showDetail, applyPack and remoteInstall, when `it.section === 'fish'` and no usable PackResult has sheets, throw `new Error('no fish sprites')`, skip recordInstall/markInstalled, keep Add disabled, and map it in loadProblem to 'This fish add-on has no sprites Finsical can read yet.' (2) Add optional `hide?: RegExp` to Collection and hide `/^updatedAZfiles$/`. (3) Word the count as '1 fish' / '3 fish' for the fish section. Do NOT add `.dna` to PACK_EXT here (Arowana.dna's art is byte-identical to Medaka.dna and medaka.fsh). Follow-up (L): build sheets from BMP-frame packs (aw*.rez: runs of 100x40/75x40/40x27; PC0*.rez: 55xN runs of 20). Tests (import.test.ts): a fish PackResult with images only is rejected with the message and not marked installed; listCollection's hide filter; a loadProblem case.

### B-12 **Six gravel add-ons install as a silent no-op**
Severity: medium · Effort: S · Value: 3/5 · Risk: 1/5

Where: `web/main.ts:184-194` (pickGravel requires w >= 3h and w >= 160), `web/main.ts:321-332`, `web/main.ts:1078-1084`, `core/data/decor.ts:21-29`, `web/import.ts:1083-1111`.

What: bluesand, matteblack, redpebble (372-374x208, white-topped strips), clear (fully key colour), greensand (unkeyed 373x209 opaque texture) and lowfront (two all-key 50x50 images) have no image passing the strip test, so nothing changes, yet the panel says 'Added to the tank.' and Overview lists them.

Proposal: Add a pure `opaqueBounds(img, key)` to `core/data/decor.ts` (tight rect of non-key pixels, or null). In pickGravel, crop each candidate with a uniform corner key to its opaque bounds before the aspect test (rescues bluesand, matteblack, redpebble as ~372x83; mirror-tile to TANK.width). A pack whose only image is 100% key (clear) means a bare glass floor: set gravelCv = null for that src. An unkeyed ~16:9 texture (greensand) becomes a strip from its bottom 40% rows. Otherwise (lowfront) handleImages returns false and install reports 'This gravel has no floor art Finsical can use.' without marking it installed. Tests in decor.test.ts: opaqueBounds on a 372x208 fixture with blank top returns y 125..207; an all-key image returns null; pickGravel on the greensand-like fixture yields a strip.

### B-13 **Dropping raw packs: only the first imports, scenery is ignored, fish portraits replace the backdrop**
Severity: medium · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:983-999` (raw-pack drop loop; `continue` at :990, pickBackdrop at :992, early `return` at :993-996), `web/import.ts:346-365` (importAddon per-blob branch).

What: (a) The loop returns after the first file with sprite sheets, so a multi-file drop imports one fish. (b) Packs without sheets are skipped, so dropped .grv/.plt/.acc/.azn do nothing and then log the misleading "no manifest.json, pack file, or 'snd ' found". (c) It calls `pickBackdrop(packImages(data))` on fish packs, which the archive path deliberately never does: a 196x146 catalog portrait passes pickBackdrop's thresholds and fills the tank (blackmoor, comet, ryukin), and 180x35 banners (copperband, queen angel, shark) can replace the gravel. Raw drag-and-drop is undocumented, hence medium.

Proposal: Export `decodeBlob(name, data): PackResult | null` from import.ts (isPack gives fshToSheets plus packImages, isBmp gives decodeBmp). Add a pure `sectionFor(result, name)`: non-empty sheets means fish; else by extension .grv gravel, .plt plants, .acc accessories, .azn tanks, .bmp backgrounds; a sheet-less .rez goes to backgrounds only if it has a backdrop-sized image (.rez is used for every type in the JPN set). In the loop call `handleSheets(r.sheets, stem, src, section, true)` and `handleImages(r.images.values(), src, section)` for every file with no early return; fish packs never touch backdrop or gravel. Use src '' (the existing bundled/dropped convention) until B-14's persistence exists. Log one summary at the end and warn only when nothing was usable. Tests: vitest for sectionFor; Playwright drop of blackmoor.fsh + GoldFish.fsh gives 2 fish and an unchanged backdrop.

### B-14 **Fish show the wrong species during launch restore, and permanently when their pack failed or was dropped**
Severity: medium · Effort: S · Value: 4/5 · Risk: 2/5

Where: `web/main.ts:222-237` (sheetOf), `web/main.ts:253-270`, `web/main.ts:275-295` (remapSheetIdx else-branch at :291-293), `web/main.ts:875-900` (launch chain), `web/main.ts:948`, `web/main.ts:991`.

What: Saved fish carry last session's sheetIdx. Until their pack restores, sheetOf uses the stale index or round-robins, so the tank opens with a school of wrong or identical fish that morph one pack at a time (~1.7 s from IDB, seconds from the network). remapSheetIdx runs once, after the whole chain; for a pack-bound fish whose pack did not load (offline, 503, evicted), it keeps any in-range sheetIdx, which now belongs to another pack. Dropped fish (no `pack`, no stored bytes) borrow whatever slot restored first after relaunch, so a dropped blackmoor becomes a goldfish.

Evidence: Playwright: goldfish (sheet 0) + blackmoor (sheet 1), clear IDB, goldfish.zip returns 503, reload: roster 'goldfish@sheet0, blackmoor@sheet0'. Drop blackmoor then install goldfish, reload: two identical goldfish.

Proposal: Put the rule in a pure `drawableSheetIndex(f, {sheetByPack, sheetBySpecies, count}, restoring)` in `web/tankmodel.ts` (shared with B-04's resolveSlot). (1) At load, strip sheetIdx from fish that have `pack`. (2) A fish with `pack` or non-empty `species` that is unresolved returns null (drawn as placeholder or hidden while `restoring`); it never falls through to round-robin. Only fish with species '' and no pack round-robin (see B-15). (3) In handleSheets, rebind only the fish whose pack/part (or legacy species) just registered; never delete bindings mid-restore, since remapSheetIdx's delete branch must run only after the chain (main.ts:900). (4) Optional: fade newly drawable fish in over ~15 ticks. Persisting dropped bytes under `local:<sha1>` (non-LRU IDB store, recordInstall entry, fetchInnerBlobs serving `local:`) is a separate M follow-up if drag-and-drop becomes a documented feature. Vitest: pack missing gives null; `{species:'blackmoor', sheetIdx:0}` with no binding gives null; resolved and legacy cases.

### B-15 **Starter fish adopt every installed species, change as more install, and keep removed art**
Severity: medium · Effort: S · Value: 4/5 · Risk: 2/5

Where: `web/main.ts:70-76` (DEFAULT_FISH), `web/main.ts:222-237` (round-robin at :230-236), `web/main.ts:441-454` (fishThumb memo), `web/main.ts:549-602` (removeAddon keeps sheets), `web/bus.ts:16-20` (fishThumbKey), `web/overviewmodel.ts:66`, `web/statsmodel.ts:59`.

What: The four starters (no species, pack or sheetIdx) draw `fishSheets[slot % fishSheets.length]`. Installing one fish add-on turns all four into that species (five of them), a second install turns them into A/B/A/B mid-swim, and after uninstalling they keep the removed species because removeAddon deliberately leaves sheets loaded. Their thumb key `f:{id}:` never changes, so Overview keeps stale art, and they are always named 'Fish'. Tank presets with sheets (B-23) feed the same pool.

Proposal: (1) Add `bindStarters(fish, {species, pack, sheetIdx})` to `web/tankmodel.ts`: on the first live fish install (handleSheets with live === true, section 'fish'), bind every untouched starter to that pack, then saveTank; they keep that art, get a real name and leave with their add-on. (2) For anything still unbound, round-robin only over `liveSlots` (slots whose owner is the bundled pack or a URL in installedAddons, fed only by section 'fish'), via a pure `roundRobinSlot(i, liveSlots)`; empty list gives the placeholder. removeAddon removes its slots from liveSlots. (3) Memoize fish thumbs by `${fishThumbKey(f)}|${slot}` and re-post `thumbs` for keys whose slot changed. Never set `f.pack` on loose fish outside bindStarters (removeAddon would then delete them unexpectedly). Vitest: starters bind once; a second install leaves them alone; pack fish are never touched; roundRobinSlot never returns a removed or tanks-only slot. Playwright: install then remove tama, 0 starter thumbs show tama.

### B-16 **An emptied tank comes back with 4 starter fish on the next launch**
Severity: medium · Effort: S · Value: 3/5 · Risk: 1/5

Where: `web/main.ts:72-76`, `web/main.ts:297-301`.

What: `roster?.length ? roster : DEFAULT_FISH` treats a saved, deliberately empty v2 roster as a missing save, contradicting the documented rule that v2 rosters are authoritative. Overview supports an empty tank ('The tank is empty…'), but removing everything does not stick.

Proposal: Extract `initialRoster(saved)` into `web/tankmodel.ts`: `saved?.v === 2 ? roster : (roster.length ? roster : DEFAULT_FISH)`. Vitest: v2 with [] gives []; no save gives 4 defaults; v1 with [] gives 4 defaults.

### B-17 **While audio is locked every sound is queued; the first click plays them all at once**
Severity: medium · Effort: S · Value: 4/5 · Risk: 2/5

Where: `web/audio.ts:70-74`, `web/audio.ts:99-116` (play retry closure), `web/main.ts:108-110` (unlock then tap), `web/main.ts:1106-1108` (bubble sounds from render), `macos/Finsical.swift:110-116`.

What: The AudioContext is created at launch by the sounds restore, before any gesture. play() attaches `resume().then(() => this.play(...))` for every one-shot, including bubbles from render(); per spec, pending resume promises settle together once the context may start, so the first click fires every queued effect (28 starts within 400 ms of the click in a 40-fish test). WebKit's 'interrupted' state (sleep, device change) falls through and silently drops sounds; nothing watches statechange or visibilitychange.

Proposal: In TankAudio add `private resuming: Promise<void> | null` and `requestResume()` (at most one resume() at a time; on resolve start the ambient if `ambientWanted && !ambientSrc`). play(): if `state !== 'running'`, call requestResume(); queue a single retry for this call only while a gesture is in progress (`navigator.userActivation?.isActive`, or a `gestureUntil` timestamp that unlock() sets to now+1000); otherwise drop one-shots and never queue bubbles. Remove the per-call closure and the ambientGen bookkeeping it needed. Hook `ctx.onstatechange` and `visibilitychange` (when visible) to requestResume(). Native: set `config.mediaTypesRequiringUserActionForPlayback = []` in makeWebConfig (verify on a Mac). Tests: new `web/audio.test.ts` with a fake AudioContext (settable state, deferred resume, counted start()): 10 bubble() calls while suspended then resolve gives 0 one-shots and 1 ambient; unlock() then tap() while suspended gives exactly 1 tap.

### B-18 **Sound add-ons cannot be removed; their sounds persist and replay every launch**
Severity: medium · Effort: M · Value: 3/5 · Risk: 3/5

Where: `web/main.ts:343-358` (handleSounds, sndsMerge), `web/main.ts:549-602` (removeAddon has no sounds branch), `web/main.ts:640-644`, `web/main.ts:891-899` (launch re-adds all stored records), `web/store.ts:186-230` (only sndsGet/sndsMerge), `web/audio.ts:11`, `web/audio.ts:44-81`.

What: The Overview line disappears, but the records stay in TankAudio.imported and in the persistent 'snds' record, and come back every launch (Macinfish: 3.2 MB decoded on every launch). They still drive the ambient, bubble and tap lookups by name. The launch also decodes restored sound add-ons twice (restore -> handleSounds -> addWavs, then sndsGet -> addWavs). A live install plays the track through an untracked source that nothing can stop. Dropped sounds are never listed anywhere and cannot be removed.

Proposal: (1) Add optional `from?: string` (add-on URL) to StoredSnd, passed via `handleSounds(recs, live, from)` from remoteInstall and applyPack; record the qualified names on the Importable (`sounds?: string[]`) before recordInstall. (2) store.ts: `sndsRemove(pred)` serialized on sndsChain, backed by a pure `withoutSnds(cur, names)` tested next to capSnds. (3) audio.ts: `removeImported(names)` (delete buffers; if ambientBuf was among them, stop and restart the ambient) and `stopImported()` tracking the last playImported source. (4) removeAddon: for section 'sounds', use `it.sounds`, or for older saves `qualifySoundItemName((await fetchAddon(url)).flatMap(r => r.sounds), it.inner)` (served from IDB), then call both. (5) At launch skip stored records whose `from` is an installed add-on. Tests: vitest withoutSnds; Playwright install then remove Macinfish leaves 'snds' empty.

### B-19 **Imported music takes over tank sound effects through substring name matching**
Severity: medium · Effort: S · Value: 3/5 · Risk: 2/5

Where: `web/audio.ts:44-68` (addWavs), `web/audio.ts:83-97` (find), `web/audio.ts:128-156`, `core/data/snd.ts:381-392` (fileSoundRecords), `web/store.ts:195`, `web/main.ts:959-982`, `web/addons.ts:40-65`.

What: find() falls back to any imported name that contains the keyword, and imported records outrank bundled ones (releases ship none anyway). Audio files become records named after the file, so 'Desktop Aquarium.mp3' becomes the ambient loop ('aqua') and the top-of-glass tap ('desktop' contains 'top'); 'Seaside Sunset' answers every side tap via the `?? find('center','side')` fallback. A full song then replays at gain 0.8 on every tap and overlaps itself, with no way to remove it (B-18).

Proposal: Add `kind: 'effect' | 'music'` to sound records: the AUDIO_FILE_EXT branch of fileSoundRecords sets 'music', the 'snd ' fork branch 'effect'; carry optional `kind` through StoredSnd, capSnds and sndsMerge. Legacy records without kind count as effect only if they are RIFF/WAVE, mono and <= 22254 Hz (what wavBytes emits). addWavs puts music in a separate `music` map that find() never searches; playImported(name) looks in both (and F-05's jukebox plays music). Keep substring matching for effects (the original fork's names are unknown); if stricter matching is wanted, split camelCase and non-letters into words first rather than a word regex on the lowercased name. Tests (audio.test.ts, fake AudioContext): a music record 'Desktop Aquarium' never plays from tap(), feed() or startAmbient() but plays via playImported; an effect 'aqua' loops; 'TapTop' still answers a top tap.

### B-20 **A background, gravel or tank preset re-chosen with 'Add Again' reverts after relaunch**
Severity: medium · Effort: S · Value: 4/5 · Risk: 2/5

Where: `web/main.ts:36-44` (SavedTank), `web/main.ts:165-194` (pickBackdrop/pickGravel), `web/main.ts:333-337` (recordInstall ignores `again`), `web/main.ts:607-650` (remoteInstall; call at :645), `web/main.ts:891`, `web/import.ts:789`, `web/import.ts:822-858`, `web/import.ts:1115-1131` (applyAddon -> onInstall(it)), `web/import.ts:1231-1246` (restore order).

What: One scenery item shows at a time; pickBackdrop/pickGravel re-insert into their maps, so the choice is right during the session. But recordInstall only appends unseen URLs and restore replays installedAddons in first-install order, so after relaunch the last-installed item wins, not the last-chosen. Both install paths drop `again`. The button label 'Add Again' does not describe switching back to a background. Playwright: Back01, Back02, Back01 again: correct live; after reload Back02 is back.

Proposal: Persist the scenery choice explicitly rather than reordering installedAddons (tank presets can carry fish sheets, and reordering would reshuffle round-robin slots). (1) Add `scenery?: { backdrop?: string; gravel?: string }` to SavedTank, written by saveTank from backdropSrc/gravelSrc. (2) Pure `promote(map, key)` in a new `web/scenery.ts` (delete-then-set so the chosen key is newest, keeping uninstall fallback correct); after `importPanel.restore([...])` resolves, promote saved.scenery.backdrop/gravel when present and set the current canvases. (3) For installed items in backgrounds/gravel/tanks, label the button 'Show in Tank'; once postState carries the displayed srcs (U-06), show a disabled 'In Tank' for the current one. (4) Pass `again` through `ImportHandlers.onInstall(it, again)` and `recordInstall(it, again)` in the same PR as B-21. Tests: vitest promote() and `resolveScenery(saved, keys)`; browser check of the Back01/Back02/Back01 sequence surviving reload.

### B-21 **'Add Again' copies of plants and accessories are lost on relaunch**
Severity: medium · Effort: S · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:198-218` (addDecor pushes one decor per call), `web/main.ts:333-337` (recordInstall dedupes by URL), `web/import.ts:828-858`, `web/import.ts:1231-1246`.

What: Add Again pushes another decor instance, so three copies show, but recordInstall dedupes by URL and restore applies each URL once; after relaunch one copy remains. Fish are unaffected because each fish is in the roster.

Proposal: Give saved add-ons an optional `copies?: number` (missing = 1). In `recordInstall(it, again)` (shared plumbing with B-20), when again is true and section is plants or accessories, increment copies instead of skipping; restore calls handleImages `copies` times. If F-04 lands first, persist decor placements as an ordered array (one entry per copy) instead. Tests: vitest SavedTank migration (copies defaults to 1); Playwright reload keeps 3 copies (debug hook `window.finsical.debug?.decorCount` or a pixel diff).

### B-22 **Accessory and plant picker shows the overhead layout view or catalog thumbnail instead of the in-tank art**
Severity: medium · Effort: S · Value: 3/5 · Risk: 2/5

Where: `core/data/decor.ts:21-28` (cornerKey), `core/data/decor.ts:35-47` (pickDecorArt), `web/main.ts:199-218` (addDecor), `web/render.ts:76-88` (previewOf).

What: Packs hold an 83x83 catalog icon (ACDP/PLDP base id), a top view used by the original's layout editor (ACDP/PLDP id+1), and the side-view in-tank art (ACPC/PLPC, often 10 animation frames). pickDecorArt takes the largest image with four equal corner indices; a top view can be larger than the art, and art touching a corner fails the key test. Of 36 sampled JPN accessories, 3 render visibly wrong art: BUGDANCE shows a 172x172 top-down disc instead of the 180x145 robot, Sea Monster2 shows its 76x100 thumbnail because its 289x379 art has opaque bottom corners, R_Rock02 shows a 120x78 ACDP instead of 269x174. Across all cached packs, 19 packs pick a frame outside their animation group (AZ_SUB shows the sub from above; also ANCHCUBE, Confidential, Radiance Crystal, Sensui, Tank in Tank, Hair2/3, Riccia2/3). The Import preview has the same problem.

Proposal: Fix together with F-03 (same function). (1) Add `pickDecorFrames(images)` to decor.ts returning `{ frames: IndexedImage[]; key: number; guessed?: boolean }`: group keyed images by `${w}x${h}:${key}`; if a group has >= 3 members, return the group with the most members (ties: larger area), in chunk order; else fall back to pickDecorArt. (2) key = `cornerKey(frame) ?? borderMajority(frame)`, a new pure helper counting palette indices on the 1-px border (prefer 0, then 255, on ties). (3) After F-01, prefer typed ACPC/PLPC frames sorted by id, and keep the heuristic only for packs without a usable map (SCEPTER/ERAWAN style). A 'last chunk wins' shortcut does not work (丸石02.acc stores its icon last). Tests (decor.test.ts): 83x83 textured thumb + one larger keyed image + ten same-size keyed frames returns the 10 frames in order (the AZ_SUB regression); an ACPC with opaque bottom corners gets the border-majority key; no group of 3 falls back to the largest keyed image.

### B-23 **Tank presets (.azn) apply only a stretched backdrop and one strip; their sheets hijack the starter fish**
Severity: medium · Effort: M · Value: 3/5 · Risk: 3/5

Where: `web/main.ts:222-237` (sheetOf round-robin), `web/main.ts:253-270` (handleSheets calls usePack for any section), `web/main.ts:321-332` (tanks -> pickBackdrop only), `web/import.ts:78-79`, `core/data/decor.ts`.

What: A .azn is a complete saved aquarium. eden.azn holds 5 plant species with 12 positioned named individuals (PlPI/PlPH), a 'venus' accessory, backdrop 640x480, gravel 640x128, heater, water, filter, feeder and light records. Only the backdrop (and for the goldfish bowl the 560x130 base as 'gravel') survives; fish swim over the wooden table outside the bowl. Installing AROWANA ADAM&EVE feeds its fish sheets into the round-robin, so the starter fish become arowana fry, while the preset's own fish never spawn.

Proposal: (a) Bug fix (S): only section 'fish' (and the bundled/dropped pack) pushes into the round-robin pool (`liveSlots`, see B-15); for 'tanks' with sheets, spawn one fish bound to the sheet on live install under its own species name. Test: `roundRobinSlot` never returns a tanks-only index. (b) Scene import (M): new `core/data/azn.ts` `parseTank(res)` (needs F-01) returning size, backdrop, gravel, plants `[{frames, x, top, h, w, depth, name}]`, accessories, heater, water, feeder. PlPI tail: h = u16@260, w = u16@262, x = u16@264, top = u16@266 (top + h equals the AQUA height, so plants stand on the tank bottom; it is not a baseline), depth = u16@268. Map x by TANK.width/aquaW, put bottoms at the floor line (V-04), draw by ascending depth. Standalone .plt packs carry 1-2 PlPI placements too, giving default positions for F-04. Ask first with an alert: 'Replace the current scenery with “eden”? Your fish stay in the tank.' Tests: azn.test.ts with a synthetic two-plant, one-accessory tank asserting top + h equals the tank height; a pure `layoutDecor()` for scaling and depth sort. Screenshot-check 3 presets.

### B-24 **Cmd-I in the app likely opens the cramped in-page importer instead of the Import Add-ons window**
Severity: medium · Effort: S · Value: 4/5 · Risk: 1/5

Where: `web/main.ts:825-828` (Meta/Ctrl+I handler), `web/main.ts:835-836` (S branch guards with inNativeShell), `web/main.ts:238-242` (overlay is for browser/touch only), `macos/Finsical.swift:564-566`.

What: The tank's keydown handler opens `importPanel.open()` on Meta/Ctrl+I and calls preventDefault without checking `inNativeShell()`. WKWebView hands Command-key events to the page first and only re-sends unhandled ones to the menu, so with the tank focused the 560x400 overlay likely opens squeezed inside a ~330 pt tank. Code-certain; not run on macOS.

Proposal: `if ((e.metaKey || e.ctrlKey) && k === 'i' && !inNativeShell())`, as the S branch does. Manual macOS test: with the tank focused, Cmd-I shows the Import Add-ons window and no overlay.

### B-25 **Dropping a file on Preferences, Tank Overview or Tank Stats navigates that window to the raw file**
Severity: medium · Effort: S · Value: 3/5 · Risk: 1/5

Where: `macos/Finsical.swift:439-453` (decidePolicyFor allows every non-http(s) scheme), `web/prefs.ts`, `web/overview.ts`, `web/stats.ts`, `node_modules/osmium-ui/src/host.ts:80-175`, `node_modules/osmium-ui/macos/OsmiumWindows.swift:281`.

What: Only the tank (`main.ts:919-920`) and Import Add-ons (`addons.ts:39-40`) preventDefault drops. On the other pages WebKit's default drop action loads the file in the main frame, which the navigation delegate allows (file: is not http(s)). The borderless Mac OS 8 window is replaced by the raw file with no drawn close box, and because Osmium keeps the webview after close, reopening shows the broken page until restart. Inferred from WebKit behavior; not reproduced on a Mac.

Proposal: In decidePolicyFor, after the http(s) branch: `if action.targetFrame?.isMainFrame == true, let s = action.request.url?.scheme, s != WebHandler.scheme { NSLog(...); decisionHandler(.cancel); return }` (no page navigates its main frame to blob: or data:). Optionally also cancel main-frame finsical:// loads of paths other than the five bundled pages. Defence in depth: dragover/drop preventDefault in prefs.ts, overview.ts and stats.ts, or upstream in osmium-ui's hostWindow(). Manual test: drop a PNG on each window; chrome stays; drops on the tank and Import still import.

### B-26 **The first click on the inactive floating tank only activates the app**
Severity: medium · Effort: S · Value: 4/5 · Risk: 1/5

Where: `macos/Finsical.swift:468-471` (stock WKWebView), `macos/Finsical.swift:60-67` (DragStrip), `node_modules/osmium-ui/macos/OsmiumWindows.swift:54-67` (OsmiumWebView documents the same fix).

What: The tank floats over other apps, so most clicks arrive while another app is active. A stock WKWebView and the DragStrip return false from acceptsFirstMouse, so the first press only activates Finsical: the food drop or glass tap is lost and moving the case needs a second press.

Proposal: `final class TankWebView: WKWebView { override func acceptsFirstMouse(for e: NSEvent?) -> Bool { e?.type == .leftMouseDown } }`, used at Finsical.swift:468; same override on DragStrip. This subclass is also the hook for U-15's contextual menu. Optional follow-up: a 'desk toy' NSPanel with `.nonactivatingPanel` so tapping never steals focus. Manual test: with Safari frontmost, one click near the surface drops a pellet and one press-drag moves the window.

### B-27 **Zoom and window tiling break the aspect ratio, so the silhouette mask no longer matches the art**
Severity: medium · Effort: S · Value: 3/5 · Risk: 2/5

Where: `macos/Finsical.swift:262-301` (syncMask), `macos/Finsical.swift:144` (contentAspectRatio), `macos/Finsical.swift:600-602` (Window > Zoom), `web/main.ts:726-733` (layoutMachine letterbox), `web/index.html:21`, `web/machines.ts:47-50`.

What: contentAspectRatio only constrains live resize. Zoom (no windowWillUseStandardFrame, so the whole visibleFrame), title-bar double-click and macOS 15 tiling can set another aspect. The page letterboxes the case art (xMidYMid meet, min() scale plus offsets), but the image mask uses `contentsGravity = .resize` over the full layer and the shape mask scales by width only, so bezel edges get clipped and the refilled aperture misses the glass.

Proposal: In syncMask compute the letterbox once: `let s = min(b.width/machineVbW, b.height/machineVbH); let art = CGRect(x: (b.width - machineVbW*s)/2, y: (b.height - machineVbH*s)/2, width: machineVbW*s, height: machineVbH*s)`; set `mask.frame = art` for the image mask (outside is transparent) and offset plus scale each shape rect by art.origin and s. Implement `windowWillUseStandardFrame(_:defaultFrame:)` returning the largest aspect-correct frame (ideally an integer tank scale, V-03) centered in defaultFrame. Manual test on macOS 15: Window > Move & Resize > Left, Zoom and edge tiling keep the case intact with click-through margins.

### B-28 **A WebContent process crash leaves an invisible, empty always-on-top window**
Severity: medium · Effort: S · Value: 3/5 · Risk: 1/5

Where: `macos/Finsical.swift:69-71`, `macos/Finsical.swift:434-465`, `macos/Finsical.swift:498-499` (non-opaque, clear background).

What: AppDelegate is the navigation delegate for every webview but implements neither `webViewWebContentProcessDidTerminate` nor any didFail handler. When WebKit kills the content process (memory pressure, GPU reset, WebKit update), the transparent tank keeps its mask but paints nothing; the app keeps running with an invisible floating window. Client windows go blank and cannot be closed from their drawn chrome.

Proposal: Implement `webViewWebContentProcessDidTerminate(_ v:)`: log which page died and call `v.reload()`. The tank restores from localStorage and clients re-sync through hello because the new `boot` id forces a re-ask. Crash-loop guard: more than 3 tank terminations in 60 s shows an NSAlert ('The aquarium stopped unexpectedly') with Reload and Quit. Also implement `webView(_:didFailProvisionalNavigation:withError:)` for the tank with the same alert. Manual test: force-quit 'Finsical Web Content' in Activity Monitor; the tank returns within a second with the same fish.

### B-29 **Add-on import needs WebKit 16.4 (DecompressionStream) while the app promises macOS 12.0**
Severity: medium · Effort: M · Value: 3/5 · Risk: 2/5

Where: `core/data/zip.ts:5-6` (comment), `core/data/zip.ts:99` (`deflate-raw`), `core/data/azpack.ts:54-58` (`deflate`), `package.json` (scripts.build/dev, no esbuild target), `macos/Makefile:13`, `node_modules/osmium-ui/osmium.css:311-312`.

What: Every archive.org import and the azpack PNG decoder use DecompressionStream, which WebKit shipped in Safari 16.4; macOS 12.0 shipped Safari 15. A Monterey Mac without the Safari 16.4+ update throws a ReferenceError on every import. The project otherwise treats 12.0 as a hard floor (Osmium avoids :has() for exactly that reason). esbuild runs at its default target (esnext), so nothing lowers or checks syntax. The zip.ts comment is also wrong: node 18 lacks deflate-raw (added in 20.12/21.2).

Proposal: Either (a) add `core/data/inflate.ts` (a small pure-JS raw inflate, or fflate's inflateSync, ~8 KB) used when `typeof DecompressionStream === 'undefined'`, tested by deleting `globalThis.DecompressionStream` in a vitest and re-running the zip and azpack suites; or (b) raise MACOS_MIN and LSMinimumSystemVersion to 13.3 and document it. Either way add `--target=safari15` to every esbuild call (builds cleanly today), fix the zip.ts comment, and show an alert naming the missing API at startup instead of failing silently.

### B-30 **Browsing add-ons evicts installed add-ons from the offline cache**
Severity: medium · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/store.ts:73-84` (packGet refreshes `at` on hit), `web/store.ts:86-135` (trimPacks, PACK_BUDGET 150 MB at :90), `web/store.ts:137-162`, `web/import.ts:115-131` (fetchZip packPut), `web/import.ts:1039-1078` (row thumbnails fetch whole packs), `web/main.ts:333-337`, `web/main.ts:553-602`.

What: Every browsed pack (detail views and each lazily fetched row thumbnail) is persisted into the same 150 MB LRU as installed add-ons, and trimPacks evicts oldest-first with no notion of installed. Installed packs were last touched by the launch restore, so a long browse evicts them first, breaking store.ts's promise that restores work offline. Scrolling Fish (~165 packs, 47 KB to 5.6 MB, 4-9 MB for the arow/disc/gup add-ons) plus a couple of scenery sections exceeds the budget. Flick-scrolling queues dozens of multi-MB downloads.

Proposal: (1) Pure `evictionPlan(recs: {url, at, bytes}[], budget, pinned: Set<string>): string[]` in store.ts: evict 'thumb:' keys first, then unpinned packs oldest-first; pinned entries are never evicted, even if the pinned set alone exceeds the budget. trimPacks reads `meta['pinned']` inside its transaction. (2) Export `packPinSet(urls)`; call it from recordInstall, removeAddon and once after importPanel.restore resolves with `[...new Set(installedAddons.map(a => a.url.split('#')[0]))]` (not from saveTank, which runs every 10 s). (3) Start a row's thumbnail fetch only after the row has been visible 300 ms (setTimeout in the IntersectionObserver callback, cancelled on exit). Tests: vitest evictionPlan (pinned kept, thumbs first, over-budget pinned evicts only unpinned); rerun a scaled-budget (8 MB) Playwright check where an installed key survives browsing 40 fish rows.

### B-31 **Weak startles slow fish down, and a fish startled toward a wall stays pinned there**
Severity: low · Effort: S · Value: 3/5 · Risk: 1/5

Where: `core/sim.ts:182-197` (tap: speed = 3.5*k), `core/sim.ts:210-227` (propagation, k <= 0.5), `core/sim.ts:255-265` (startle branch ignores walls), `core/sim.ts:345-365` (clamp), `core/sim.test.ts:208`.

What: Startle speed replaces the current speed with 3.5*k, so fish in the outer radius get 0.18-1.2 px/tick, below their 1.1-1.8 cruise: 53% of 408 startled fish slowed down. During startle the heading is rebuilt from speed*facing each tick, overwriting the wall reflection, so a fish darting into the left wall sits at x=16 for the rest of the ~31-tick startle.

Proposal: In tap() and propagation: `f.speed = Math.min(STARTLE_MAX_SPEED, Math.max(f.speed, f.cruise * (1 + 1.5 * k)))` with STARTLE_MAX_SPEED = 3.5 (plain `max(speed, cruise) * (1+1.5k)` compounds on re-taps). Store a per-fish startle duration `STARTLE_TICKS * (0.5 + 0.5 * k)`. In the clamp, when state is 'startle' and a side wall is hit, flip facing and multiply speed by 0.6; negate vy at top/bottom. Tests: every fish entering startle via tap() has cruise <= speed <= 3.5; a fish startled into the left wall is at x > MARGIN + 5 within 8 ticks; update 'tap startle fades with distance' to compare relative speeds.

### B-32 **A fish stays in 'seek' after its pellet is gone, so Overview and Stats say it is looking for food**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `core/sim.ts:289-303`, `web/statsmodel.ts:72`.

What: setState(f, 'seek') runs only when a pellet is found; nothing resets it when another fish ate it, it rotted, or water fell below QUALITY_SEEK. The loser of a race stays 'seek' until its next roll or startle (mean 1.1 s, max 6.4 s in 100 trials; longer once B-07 cuts rolls).

Proposal: In the drift/seek branch before the budget check: `if (!food && f.state === 'seek') this.setState(f, 'drift');`. Test: after fish A eats the only pellet, fish B's state is 'drift' on the next tick.

### B-33 **Tail-wag ignores the species' own animation scripts (AMV#/BMV#)**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/main.ts:1016-1025` (animFrame cycles 0..nf-1), `core/pose.ts`.

What: Each species ships idle and swim scripts (AMV# adult, BMV# baby): a big-endian u16 count followed by big-endian frame indices. Several are non-linear: clownfish Baby Idle is 0,0,1,1,2,2,1,1,...; ネオンテトラ adult Idle is 0,1,2,3,3,3,3,4,5,6,6,6,7,0,0,0 (held glide frames); メダカ adult scripts too. animFrame cycles linearly, so these fish jump from the last frame to the first.

Proposal: After F-01, parse scripts into the species model (clamp each index to framesPerGroup-1). Add a pure `scriptFrame(script, phase)` in core/pose.ts; use the Idle script when `f.speed < 0.4*f.cruise`, else Swim, indexing `script[floor(phase) % script.length]`, falling back to the linear cycle. Tests (pose.test.ts): the clownfish fixture maps phases 0..7 to 0,0,1,1,2,2,1,1; the neon prefix [0,1,2,3,3,3,3,4].

### B-34 **Two tank tabs both execute every command and overwrite one save**
Severity: low · Effort: S · Value: 2/5 · Risk: 2/5

Where: `web/main.ts:35`, `web/main.ts:92`, `web/main.ts:97`, `web/main.ts:379`, `web/main.ts:516-547`, `web/bus.ts:34-36`, `web/overview.ts:43-47`.

What: In a browser every tank tab opens BroadcastChannel('finsical'), answers every intent (one install gives 2 downloads and 2 acks) and writes `finsical:tank` every 10 s, so the last writer wins. Clients receive alternating states with different `boot` ids, and Overview keeps resetting its thumbnail requests. Browser-only; the native shell has one tank.

Proposal: Gate the tank on a Web Lock: start `passive = true`; `navigator.locks?.request('finsical-tank', {ifAvailable: true}, lock => lock ? (passive = false, postState(), new Promise(() => {})) : showAlreadyOpen())`. While passive, onBusMessage returns early, saveTank and its interval do nothing, and an alert says 'Finsical is already open in another tab.' Fall back to a BroadcastChannel ping/pong when navigator.locks is missing; skip the lock entirely when inNativeShell(). Verify with two tabs: 1 state reply and 1 ack per request.

### B-35 **With the CRT effect on, clicks do not land where the curved, overscanned picture shows**
Severity: low · Effort: S · Value: 2/5 · Risk: 2/5

Where: `web/main.ts:100-111` (pointer mapping), `web/crt.ts:59-79` (FRAG uv chain), `web/app.css:45-50`.

What: The shader applies overscan zoom, width/height pots and barrel warp before sampling, but pointerdown uses flat object-fit math. At defaults the worst offset is ~13 tank px and 12% of the screen is black curved border that still accepts clicks; hsize=0 gives 48 px and 34% black. The feed band shifts too.

Proposal: Export a pure `crtScreenToRaster(u, v, cfg): [number, number] | null` from crt.ts reproducing FRAG in order (zoom, size pots, barrel), null outside 0..1, with 'keep in sync with FRAG' comments on both. In pointerdown when `crt?.enabled`: u = (clientX - r.left - offX) / (TANK.width*s), v = 1 - (clientY - r.top - offY) / (TANK.height*s) (the shader is y-up), map, return on null, else x = su*320, y = (1 - sv)*200. Tests (crt.test.ts): identity at curvature 0 with neutral size and zoom; the center is a fixed point; the corner at curvature 1 is null; zoom=1 maps u=0.95 to ~0.902.

### B-36 **After a GPU context loss the CRT stays off for the session and Preferences still shows it on**
Severity: low · Effort: M · Value: 2/5 · Risk: 3/5

Where: `web/crt.ts:229-236` (lost = true forever), `web/crt.ts:324-329`, `web/main.ts:665-675`, `web/main.ts:800`, `web/main.ts:834`.

What: webglcontextlost sets `lost = true` permanently and nothing handles webglcontextrestored (GPU switches or sleep on dual-GPU Macs). The loss posts no state, so Preferences shows On until the next heartbeat. main.ts's `crtOn` stays true, so the next toggle silently turns it 'off' and the one after stores '1' while setEnabled returns early.

Proposal: Refactor initCrt's GL setup (shaders, program, buffer, texture, uniforms, upload) into `setup(): boolean`, called at init and on 'webglcontextrestored' (which clears `lost`). Track `wanted` (last setEnabled request) and re-enable after restore. Add `initCrt(canvas, { onChange })` fired on loss and restore; main.ts passes postState. Toggles use live state: `setCrt(!(crt?.enabled ?? false))` at main.ts:800 and :834. Verify with WEBGL_lose_context: loseContext() pushes state within 1.5 s; restoreContext() brings the CRT back.

### B-37 **The in-tank add-on browser misses installs and removals made in other windows**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/main.ts:360-369`, `web/main.ts:553-602` (removeAddon), `web/main.ts:601` (posts 'uninstalled'), `web/import.ts:1099-1107` (markInstalled), `web/import.ts:1121` (applyAddon guard), `web/import.ts:1201-1224` (notify).

What: main.ts never calls importPanel.notify(), so the browser/touch overlay (Cmd/Ctrl+I) keeps its checkmark and 'Add Again' after an Overview removal, and after an install from another window its 'Add to Tank' adds a duplicate fish.

Proposal: Do NOT feed postState into notify: postState runs during module evaluation (main.ts:703, :791) before importPanel.restore (main.ts:891), so a state notify would mark every saved add-on installed and restore() would skip them all. Instead: in import.ts notify() add `else if (m.op === 'uninstalled' && typeof ackUrl === 'string') markInstalled(ackUrl, false);` (the remote panel already receives 'uninstalled'); in removeAddon after the splice call `importPanel.notify({ op: 'uninstalled', url })`; after a successful remoteInstall call `importPanel.notify({ op: 'installed', url })`. Test: overlay install, Overview removal, overlay shows no checkmark and 'Add to Tank'; a reload still restores saved add-ons.

### B-38 **An add-on removed during launch reappears when its restore download finishes**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/import.ts:1231-1246` (restore), `web/main.ts:891`.

What: restore() replays the saved list sequentially and checks only its own `installed` set. Removing an add-on in Overview before its fetch resolves still runs applyPack: its gravel, backdrop or decor come back and its sheets re-register although installedAddons no longer lists it.

Proposal: `restore(list, stillWanted?: (url: string) => boolean)`, checked before fetchPack and again inside `.then` before applyPack; main.ts passes `u => installedAddons.some(a => a.url === u)`. Test: with archive.org delayed 4 s, remove bamboo gravel at t≈1 s; the floor stays default after the restore lands.

### B-39 **Saving a sound reports success even when nothing was written**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/store.ts:53-71` (rw resolves null on every failure), `web/store.ts:182-184` (metaPut), `web/store.ts:220-230` (sndsMerge), `web/addons.ts:56-63`, `web/main.ts:354-355`.

What: rw() never rejects, so metaPut and sndsMerge resolve on failed writes; addons.ts's catch is unreachable and it posts soundsLoaded for a sound that did not persist. Worse, sndsMerge reads through the same rw(), so a failed read looks like 'no record' and `capSnds(null, records)` can overwrite the store with only the new records.

Proposal: Make rw() distinguish a miss from a failure (`{ok: true, value} | {ok: false}`, or an rwStrict() for the snds path). sndsGet throws on failure; metaPut resolves a boolean; sndsMerge throws if the read failed (never overwrite on an unknown baseline) or the write returned false. Keep packPut fire-and-forget. Test: a pure `mergeInto(get, put, records)` in store.ts rejects when put resolves false and when get fails, and never calls put after a failed get.

### B-40 **Each sound dropped on Import Add-ons re-decodes all stored sounds and restarts the ambient loop**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/main.ts:534-546` (soundsLoaded handler), `web/audio.ts:44-68` (addWavs), `web/addons.ts:63`.

What: On soundsLoaded the tank decodes every stored record (up to 64 MB). addWavs stores fresh AudioBuffers, so `now !== this.ambientBuf` restarts an imported 'aqua' loop from the top on every unrelated drop.

Proposal: addons.ts posts `{op: 'soundsLoaded', names: recs.map(r => r.name)}` (after qualifySoundNames) and the tank decodes only those. TankAudio tracks `ambientName` (the key find('aqua') chose) and restarts only when that name changes or is in the incoming batch. At launch skip records already added by the restore chain (or by `from`, B-18). Test (audio.test.ts, fake context): addWavs([{name:'drip'}]) while an imported 'aqua' loops causes 0 stop() calls.

### B-41 **Quitting the Mac app can lose the last 10 seconds of tank state**
Severity: low · Effort: S · Value: 2/5 · Risk: 2/5

Where: `web/main.ts:96-97` (pagehide + 10 s interval), `web/main.ts:798-800` (window.finsical), `macos/Finsical.swift:408-410` (windowWillClose terminates), `macos/Finsical.swift:529`, `macos/Finsical.swift:551-553`.

What: Cmd-Q or closing the tank calls NSApp.terminate; WKWebView tears down its content process without page lifecycle events, so fish positions, hunger and water since the last interval save are lost. Nothing saves on visibilitychange (minimize, occlusion). Installs save immediately, so the loss is small. Not verified on a Mac.

Proposal: main.ts: `document.addEventListener('visibilitychange', () => { if (document.hidden) saveTank(); })` and add `save: saveTank` to window.finsical. Swift: `applicationShouldTerminate` returns `.terminateLater`, evaluates `window.finsical?.save?.()`, and in the completion handler calls a once-only reply that runs `NSApp.reply(toApplicationShouldTerminate: true)` after a 250 ms grace, with a 1.5 s fallback timer. Set `window.isReleasedWhenClosed = false` on the tank, since termination now outlives windowWillClose. Manual test: move fish, quit within 1 s, relaunch, positions match.

### B-42 **Stalled downloads never time out and wedge that add-on (and thumbnail slots) for the session**
Severity: low · Effort: S · Value: 3/5 · Risk: 2/5

Where: `web/import.ts:115-131` (fetchZip), `web/import.ts:139-183` (listPage), `web/import.ts:441-449` (packCache memo), `web/import.ts:776-866`, `web/import.ts:1039-1057` (pumpThumbs, thumbRunning-- in .finally), `web/import.ts:520-529`.

What: fetch() has no AbortSignal or timeout. A never-settling promise stays memoized (entries are deleted only on rejection), so the row shows 'Fetching add-on…' with Add disabled until reload, and it holds one of the THUMB_PAR = 3 thumbnail slots forever; three stalls stop all thumbnails. A stalled listing leaves the listing text up forever.

Proposal: Add `fetchWithTimeout(url, { firstByteMs = 60_000, idleMs = 30_000 })`: an AbortController with a first-byte timer before fetch() resolves (archive.org's zip view on multi-GB zips is slow to the first byte), then read `r.body.getReader()` re-arming an idle timer per chunk; on timeout abort and throw `new Error(`${url}: timed out`)`. Use it in fetchZip and a text variant in listPage. loadProblem: `if (msg.endsWith(': timed out')) return "archive.org stopped responding. Try again."`. The existing reject-deletes-memo logic then frees Try Again and the slots. Tests: vitest with fake timers and a stubbed fetch whose body never enqueues rejects after 30 s idle; headers that never arrive reject after 60 s; a loadProblem case.

### B-43 **The add-on detail status line contradicts the button after install state changes**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/import.ts:822-824`, `web/import.ts:846-851` (15 s timeout), `web/import.ts:855-859` (offer), `web/import.ts:1099-1113` (markInstalled), `web/import.ts:1201-1224`.

What: showDetail writes the status once; later only offer() re-runs and it changes only the button. After a removal in Overview the pane says 'Added to the tank.' next to 'Add to Tank'. After the 15 s 'No response from the tank' timeout, a late ack flips the button to 'Add Again' but leaves the 'No response' text.

Proposal: Compute `summaryLine` once in showDetail and have offer() set both: status = `installed.has(url) ? 'Already in the tank.' : summaryLine`, plus the button. ackInstalled keeps the one-shot 'Added to the tank.' (the heartbeat only calls markInstalled for changed URLs, so it will not overwrite it). In the timeout branch remember `lateRef = ref`; in markInstalled, when `on && detailRef === lateRef`, show 'Added to the tank.' plus Add Again and clear lateRef. Test: install, remove in Overview; the pane shows 'Already in the tank.' before and '1 pack, fish.' after.

### B-44 **17 legacy-format Japanese accessories can never load but list normally and offer a useless 'Try Again'**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `core/data/fsh.ts:33-35` (isPack magic 0x100 only), `web/import.ts:346-364`, `web/import.ts:860-865` (catch offers Try Again), `web/import.ts:524`.

What: FOSSIL1-3, FOSS_PL1-2, R_STONE1-2, WOOD1-4, WOOD_MS1-4 and WOOD_PL1-2 (.ACC under AQUAZONE ITEM/アクセサリー, uppercase 8.3 names, likely an earlier release) start `22 00 25 00 00 00 00 00 00 25 00 08 ...` instead of `00 01 00 00`. isPack rejects them, the panel says the download has no add-on in it and offers Try Again on a deterministic failure; the rows never get thumbnails.

Proposal: In showDetail's catch, when `e.message === 'no pack inside'` and the bytes start with `22 00 25 00`, show "Finsical can't read this add-on yet." with `setAdd('Add to Tank', null)` and no Try Again. Track verdicts in an in-session `unreadable` Set and dim rows via `.irow.unusable { color: #888 }` (re-applied in showSection). If persisted, key it `bad:v1:{url}` with a decoder-version constant so a future decoder is not blocked. Decoder follow-up (core/data): the file looks like u16-LE length-prefixed records (length includes the prefix): 0x00 (len 0x22), 0x22 (len 0x22), 0x44 (len 0x2E), with `00 01 00 00` words inside; sample FOSSIL1.ACC (83,140 B). Test: the Accessories section shows 17 dimmed rows and no Try Again.

### B-45 **Sound previews and install feedback keep playing with no way to stop them**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/import.ts:637-652`, `web/import.ts:1164-1171` (close returns early when `!ov`), `web/addons.ts:80-84`, `web/audio.ts:76-81` (playImported discards its source), `web/main.ts:356`.

What: In the Import Add-ons window (host mode) closing the window does not pause the preview `<audio>`; the native shell keeps the closed webview alive and addons.ts's visibilitychange only posts hello. On the tank, playImported starts an untracked source at gain 0.8 for the whole record: the 3.2 MB Macinfish track plays in full on every Add or Add Again, overlapping. Native playback after close is inferred from code.

Proposal: In mountImportPanel when `!ov`: `document.addEventListener('visibilitychange', () => { if (document.hidden) stopSound(); })`. In TankAudio keep `private feedbackSrc` and stop it before starting another in playImported; for `buf.duration > 4`, fade out and stop after 4 s (`g.gain.setTargetAtTime(0, t+3.5, 0.2); src.stop(t+4)`). Full playback belongs to F-05. Test: Playwright Play in addons.html, dispatch visibilitychange with document.hidden stubbed true, `audio.paused === true`.

### B-46 **Offline or cache-miss restores quietly turn fish into orange blocks and never retry**
Severity: low · Effort: M · Value: 2/5 · Risk: 2/5

Where: `web/import.ts:1231-1246` (restore only logs failures at :1241-1242), `web/main.ts:875-900`, `web/store.ts:90-130`.

What: When an installed add-on's bytes are not in IndexedDB and archive.org is unreachable at launch, restore() logs a warning, fish fall back to placeholder rectangles, nothing says why, and nothing retries when the connection returns. Overview keeps showing the species as swimming. B-30's pinning makes the trigger rarer but not impossible (IDB-only failures).

Proposal: restore() resolves with the Importables that failed. main.ts keeps `restorePending` and retries on `window` 'online' and every 5 minutes (`importPanel.restore(pending)`, then remapSheetIdx()). The state push adds `missing: string[]`; overviewmodel shows 'Waiting for archive.org', and statsmodel adds 'N add-ons couldn't load; they'll come back when you're online.' Playwright: offline reload, then online; sprites replace the placeholders without a reload.

### B-47 **Dropping a folder imports every audio file inside it, reading each up to 32 MB**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/main.ts:903-918` (walkEntry recurses), `web/main.ts:959-982`, `web/main.ts:343-358`, `core/data/snd.ts:381-390`, `web/audio.ts:44-56`, `web/store.ts:193`, `web/store.ts:231-268`.

What: Every non-pack file under 32 MB in a dropped folder tree is read fully into memory and every .wav/.mp3/.aiff/.m4a/.ogg/.flac becomes a record, all decoded to PCM in one batch, persisted up to 64 MB, with the first one played. Dropping an add-on folder that includes music, or a Music folder by mistake, pulls hundreds of tracks in with no feedback and no way to remove them.

Proposal: Accept audio files only when dropped directly (depth 0, empty walkEntry prefix); inside folders consider only .rsrc/.bin/.hqx and pack files. Cap one drop at 16 sound records and 64 MB of input; report skipped files in the drop feedback (U-10). Confirm before decoding more than 3 music files ('Import 12 sounds?'). Put the filter in a pure `planDrop(paths, sizes)` in `web/drop.ts` with vitest.

### B-48 **After a native case drag the page never sees mouseup and may keep its pressed/grabbing state**
Severity: low · Effort: S · Value: 2/5 · Risk: 2/5

Where: `web/main.ts:778-788`, `macos/Finsical.swift:335-338`, `node_modules/osmium-ui/macos/OsmiumWindows.swift:331-342` (drag), `node_modules/osmium-ui/macos/OsmiumWindows.swift:438-443` (grow loop dequeues mouseUp), `web/app.css:34-35`.

What: A press on the case posts dragWindow and the shell runs performDrag, which consumes the mouse-up. WebKit saw mousedown but not mouseup, so `body.tankpage:active { cursor: grabbing }` may stick until the next click. Same for Osmium title-bar drags and the grow box. Plausible from the event flow; unconfirmed on a device.

Proposal: After performDrag returns, synthesize `NSEvent.mouseEvent(with: .leftMouseUp, location: w.convertPoint(fromScreen: NSEvent.mouseLocation), modifierFlags: [], timestamp: ProcessInfo.processInfo.systemUptime, windowNumber: w.windowNumber, context: nil, eventNumber: 0, clickCount: 1, pressure: 0)` and pass it to `(firstResponder as? NSView)?.mouseUp(with:)`; same when grow() exits. The tank can be fixed in Finsical (after Finsical.swift:337); client windows need the osmium-ui change. Manual test: drag the case, release, hover: open-hand cursor, and the next click registers normally.

### B-49 **Case swaps resize from the pinned top edge and can push the window off screen**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `macos/Finsical.swift:158-166`.

What: Switching machines pins the top edge and never clamps to `window.screen.visibleFrame`; setFrame does not constrain programmatic frames, so Performa to iMac G4 near the bottom pushes the base under the Dock. The animation ignores Reduce Motion. (Tank size drift on swaps is V-03.)

Proposal: Pass the new frame through a pure `fitted(_ r: NSRect, in vis: NSRect)` that moves it inside vis (up first, then reduce the integer tank scale if taller than vis), keeping the horizontal center where possible. Use `animate: !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion`. Manual test: Performa at the bottom of the screen, switch to iMac G4, whole case stays above the Dock.

### B-50 **Saved window frames are restored when they overlap any screen by a single point**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `node_modules/osmium-ui/macos/OsmiumWindows.swift:131-139` (restore), `macos/Finsical.swift:523`.

What: OsmiumFrameStore.restore applies a saved frame verbatim if it intersects any screen's full frame. After moving from an external display to a laptop a borderless window can come back almost off screen or under the menu bar; AppKit does not constrain borderless windows and they can only be dragged by the drawn title bar. osmium-ui is a pinned git dependency, so fix app-side first.

Proposal: Add a pure `static func onScreen(_ f: NSRect, visible: [NSRect]) -> NSRect` in Finsical.swift: if the top 22-pt strip intersects some visible rect by at least 44x10 pt return f; otherwise pick the visible rect with the largest overlap (or the first), shrink f to fit keeping aspect, and clamp inside. Call it after `frames.restore(window, key: "FinsicalTank")` and in B-05's showClient after host.show. Upstream follow-up: same logic in OsmiumFrameStore.restore. Manual test: `defaults write dev.finsical.app FinsicalFrame.FinsicalPrefs '{{-5000, 900}, {565, 457}}'`, launch, Cmd-, opens fully on screen.

### B-51 **The simulation replays the same random sequence on every launch**
Severity: nit · Effort: S · Value: 1/5 · Risk: 1/5

Where: `web/main.ts:63` (`new Sim(TANK, 0x9003)`), `core/rng.ts`.

What: The RNG seed is constant, so from the same saved state fish repeat the same first decisions and bubble pattern, and two browser tabs move in lockstep. Effect is small because saved state differs each launch.

Proposal: Seed from `crypto.getRandomValues(new Uint32Array(1))[0]` in main.ts; tests keep explicit seeds.

## Performance and smoothness

### P-01 **Add-on caches never evict: 170 MB heap for 7 fish packs, 700 MB after browsing thumbnails**
Severity: high · Effort: M · Value: 4/5 · Risk: 2/5

Where: `web/import.ts:107-131` (zipCache), `web/import.ts:437-449` (packCache/fetchAddon), `web/import.ts:537`, `web/import.ts:776-800`, `web/import.ts:1039-1057` (pumpThumbs), `web/import.ts:1083-1097`, `web/main.ts:120-133`, `web/main.ts:553-602`, `web/main.ts:607-649`, `macos/Finsical.swift:379` (closed windows keep their webview).

What: `packCache` memoizes the full PackResult[] of every URL ever fetched (installs, restores, detail previews, row thumbnails) for the page's life; each holds every decoded sheet (guppy/marbangel .REZ carry 20-80 sheets, 14-19 MB decoded each) though the tank uses one sheet per pack. `zipCache` keeps raw zip bytes although IDB already persists them. The panel's `thumbs` map holds full-size preview canvases. removeAddon touches none of it. The Import webview survives closing, so browse memory stays until quit.

Evidence: performance.memory after gc: empty tank 1.8 MB; 7 fish installs 170.3 MB (packCache sheets 140.6 MB, of which drawn sheets 4.0 MB; zipCache 25.7 MB). Scrolling the fish list: 84 thumbnails, 700.2 MB. Three scenery sections: 564 zips, 118 MB raw, 160 M decoded pixels.

Proposal: (1) `web/lru.ts` `lruMemo<K,V>(max)`: keeps in-flight promises, deletes rejected ones, evicts the oldest settled entry past max. (2) fetchAddon: keep packCache only while in flight (`p.finally(() => packCache.delete(url))`), or lruMemo(8); local installs stay correct because applyAddon reuses the detail pane's `rs` (import.ts:1129). (3) fetchZip: drop leaf entries once settled; keep nested collection zips in lruMemo(3) (listing reads three nested zips at once, so 2 would thrash). (4) pumpThumbs keeps calling fetchPack (so detail fetches still dedupe), then `thumbs.set(url, miniThumb(pv))` and `if (detailRef?.url !== it.url) packCacheDelete(it.url)`; showDetail/applyPack also store only miniThumb(pv); the pane keeps `shownPreview`. (5) remoteInstall calls packCacheDelete(url) after applying. Do not tombstone fishSheets slots (breaks sheetOf round-robin; chosen sheets are only ~4 MB). Tests: vitest lruMemo (eviction order, in-flight kept, rejection removed) and 'two concurrent fetchAddon calls share one promise, a later call re-invokes the loader'; Chromium Playwright: heap after gc < 30 MB after 7 installs, packCache <= 8 after scrolling three sections.

### P-02 **fshToSheets decodes every sheet in a pack on the main thread; the tank uses one**
Severity: high · Effort: M · Value: 5/5 · Risk: 2/5

Where: `core/data/fsh.ts:73-97` (decodePixels: per-pixel closure with % and /), `core/data/fsh.ts:109-164`, `web/import.ts:346-364`, `web/main.ts:120-133`, `web/render.ts:76-88`, `web/main.ts:887-890` (launch restore), `web/main.ts:988-990` (drop), `web/main.ts:1126-1142`.

What: importAddon synchronously RLE-decodes every sprite stream (up to 80 per .REZ) and packImages decodes fish portrait BMPs that handleImages then ignores. usePack keeps one sheet and previewOf needs one frame. Installs, the launch restore and thumbnail decodes freeze the tank; the 200 ms accumulator cap then drops sim time and the next frame runs up to 6 ticks, so fish jump.

Evidence: node on real packs: GP15000.REZ (80 sheets) 135 ms full vs 1.6 + 1.8 ms header-scan plus winner; GP17000 114-127 ms; ma1.rez 110 ms; DS01 53 ms. Chromium rAF gaps: gup addon1 install 400 ms, marbangel(1) 317 ms; launch restore of 11 add-ons from IDB: 383, 300, 200 ms frames; scrolling the in-page list: worst 467 ms.

Proposal: Add `sheetHeaders(d)` (walks frame records by stream_len without decoding, returning {chunkPos, groups, framesPerGroup, cellW, cellH, dims}) and `decodeSheet(d, chunkPos, palette)` to fsh.ts, reusing spriteSheet's exact validation (including `w*h <= 64*ln+0x400` and the `sw*sh > 1<<26` guard, see S-02) so the valid set is identical. Add `enum SheetPick { All, Tank, Preview, TankAndPreview }` with All the default (tools and tests unchanged). Tank decodes only the pickSwimSheet winner (B-01, run on header metadata); Preview decodes the largest-area sheet, falling back to the next if frame(0,0) throws. The panel detail fetch and the tank page use TankAndPreview (applyPack also calls h.preview; local installs reuse the detail result); row thumbnails use Preview. Key packCache by `${pick}|${url}` (or drop it per P-01). Skip packImages for fish-section blobs. Rewrite decodePixels with x/y counters (`if (++y === h) { y = 0; x++; }`). Tests: the fsh.test.ts fixtures decode byte-identically through All and the header path; a 3-sheet pack under Tank returns exactly usePack's pick after decoding one stream; old and new decodePixels are pixel-equal.

### P-03 **The tank and the CRT redraw every display frame although the sim changes 30 times a second**
Severity: medium · Effort: S · Value: 4/5 · Risk: 1/5

Where: `web/main.ts:1126-1142` (frame), `web/main.ts:1106-1109` (bubble sound check in render), `web/crt.ts:132-134`, `web/crt.ts:339-353`, `macos/Finsical.swift:500-501`.

What: render() and crt.render() run every rAF, even with zero ticks. render() depends only on sim state and installed art, so at 60 Hz half the frames are pixel-identical (3 of 4 at 120 Hz, ProMotion), each re-uploading the CRT texture and running a device-resolution shader. The tank floats on all Spaces and is never occluded, so WebKit never throttles it. Measured: CRT on (SwiftShader), renderer task time 1154 -> 454 ms/s and DrawAndSwap 60/s -> 30/s when skipping 0-tick frames.

Proposal: `let ticked = false; while (acc >= step) { sim.tick(); acc -= step; ticked = true; } if (ticked || dirty) { render(); if (crtOn) crt?.render(); dirty = false; }` and always schedule the next rAF. Set `dirty = true` only in setCrt(true), the CRT config handler and the resize listener (a resized WebGL canvas is cleared); other scenery changes appear on the next tick (<= 33 ms) without flags. Accept CRT grain/flicker updating at 30 Hz. Move the bubble-sound check into the tick loop (compare bubble counts per tick). Extract a pure `planFrame(acc, dtMs, stepMs)` -> {ticks, acc} in `core/loop.ts` (dt=16.7 alternates 0/1 ticks, dt=8.33 renders 1 in 4, the 200 ms clamp holds). If P-09's Smooth mode lands, gate the skip on Classic. Follow-up: a Low Power Mode hook (ProcessInfo.isLowPowerModeEnabled + NSProcessInfoPowerStateDidChange, macOS 12+) calling `window.finsical.setPowerMode('saver')` to present every second tick; do not trigger it on app deactivation (the floating tank is watched while other apps are active); Preferences `Energy { Automatic, AlwaysNormal, AlwaysSaver }` with a pure `effectiveMode(pref, lowPower)`. Verify: render() count over 5 s in Playwright (~150 instead of ~300 at 60 Hz); Activity Monitor energy before/after.

### P-04 **Imported long tracks are decoded to PCM and kept forever (Macinfish: 72 MB, re-decoded every launch)**
Severity: medium · Effort: S · Value: 3/5 · Risk: 2/5

Where: `web/audio.ts:44-68`, `web/audio.ts:79-81`, `web/main.ts:343-358`, `web/main.ts:534-546`, `web/main.ts:892-899`.

What: addWavs decodes every imported record into `imported` for the page's lifetime, again at every launch and on every soundsLoaded. The only Sounds add-on, the JPN bonus track Macinfish.mp3 (3.28 MB, ~205 s, 44.1 kHz stereo), becomes 72.3 MB of Float32 PCM after a 461 ms decode, although it is only played once as install feedback.

Proposal: In addWavs keep a record as a Blob in a `streams` map instead of decoding when its name matches none of find()'s event keys (aqua, drop, intowater, bubble, center, side, top, bottom) and it is long (WAV header over 10 s, or non-WAV over 512 KB); with B-19 in place, use `kind === 'music'`. playImported checks `streams` first and plays through one reused HTMLAudioElement with a blob: URL, revoking the previous one. Streaming a long 'aqua' WAV would silently drop the ambient loop, so that stays decoded. Tests (fake AudioContext/Audio): a 1 MB 'Macinfish' mp3 never reaches decodeAudioData and playImported sets a blob: src; a 1 MB 'aqua' WAV is decoded and loops.

### P-05 **The add-on list waits for the slowest catalog and silently drops failed collections**
Severity: medium · Effort: M · Value: 3/5 · Risk: 3/5

Where: `web/import.ts:190-239` (nested collections download whole zips), `web/import.ts:369-387` (listAddons Promise.all, per-collection catch -> []), `web/import.ts:1133-1162` (loadListing), `web/import.ts:1188-1196` (lists once per session).

What: listAddons awaits all 11 collections, three of which are nested zips downloaded whole to enumerate (mekplants ~4 MB, mekaccs, the 5.6 MB JPN bonus zip just for one mp3 and a few fish). Nothing appears until the slowest finishes (12.2 s with nested zips delayed 12 s, vs 232 ms cached). A failed collection returns [] with only a console.warn: Gravel drops from 76 to 36 when gravel.zip fails, with no indication; retry only happens when everything fails. Mostly a first-run problem (IDB caches zips; listing pages have a 24 h TTL).

Proposal: `listAddons(onSection?: (section, items, col) => void): Promise<{ items: Importable[]; failed: Collection[] }>` calling onSection as each collection resolves (items accumulate per section). loadListing shows the saved or first section once all of its collections are in, re-renders when later collections append, and keeps not-yet-loaded popup items dimmed with '(loading…)'. Show a determinate `.osm-progress` bar ('4 of 11 catalogs'). When `failed.length`, show 'Some add-ons couldn't be listed' and offer 'Try Again' retrying only the failed collections. Tests: vitest with a stubbed fetch where gravel.zip rejects gives failed=[gravel] plus the other items, and onSection fires in resolution order; Playwright with an 8 s delay on the bonus zip only shows Fish rows within ~2 s.

### P-06 **Every hello and every slider step broadcasts full state to every window**
Severity: low · Effort: S · Value: 2/5 · Risk: 2/5

Where: `web/main.ts:385-419` (postState), `web/main.ts:516-533` (hello -> postState at :517), `web/main.ts:665-690` (applyCrtConfig: localStorage write + postState), `web/prefs.ts:317-328`, `web/overview.ts:205-220`, `web/stats.ts:122-136`, `web/addons.ts:66-84`, `macos/Finsical.swift:376-410` (relay fans out to every window).

What: Each client says hello every 2 s and each hello makes the tank broadcast full state to all windows (N² with open windows; 12 pushes/10 s to Stats with Overview and Prefs open). Dragging a CRT slider sends ~29 crtConfig/s, each answered with a synchronous localStorage write and a full push to every window; in the app each push is a JSON evaluateJavaScript per window. Cost is modest.

Proposal: `requestState()`: a leading+trailing throttle with a 1000 ms minimum gap for hello replies. `schedulePostState()`: a 100 ms trailing coalesce for state-changing paths (saveTank, setCrt, applyCrtConfig, machine). Keep crt.configure() immediate; debounce the `finsical:crt-cfg` write by 250 ms and flush it in the pagehide handler. Keep client heartbeats (they are the tank-reload recovery path). Tests with fake timers: 100 schedulePostState calls within 100 ms give 1 post; 100 applyCrtConfig calls give 1 setItem after the debounce; with three clients each gets <= ~10 pushes per 10 s; a drag delivers <= 10 pushes/s and the final value persists.

### P-07 **Launch restore downloads add-ons strictly one after another**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/import.ts:1231-1245`.

What: restore() chains `p.then(() => fetchPack(it.url).then(applyPack))`, so on a new machine or evicted cache the total is the sum of archive.org round trips (0.8-1.3 s each; ~10 s for 11 add-ons), and B-14's wrong-species phase lasts that long.

Proposal: Prefetch with concurrency 3 (pumpThumbs pattern) and apply strictly in list order (await fetched[i] in the loop), re-checking `installed.has(it.url)` (and B-38's stillWanted) at apply time so sheet slots and backdrop precedence are unchanged. Test: vitest with out-of-order fake fetchPack resolutions still applies in list order with at most 3 in flight.

### P-08 **Move archive decoding into a Web Worker (after P-02)**
Severity: low · Effort: L · Value: 2/5 · Risk: 3/5

Where: `web/import.ts:289-364`, `core/data/zip.ts:86-120`, `core/data/fsh.ts:148-175`, `core/data/bmp.ts`, `core/data/snd.ts:361-400`, `web/main.ts:959-997`, `package.json`, `macos/Makefile`.

What: Even after P-02, inflate of multi-MB entries (25-71 ms in node), BMP decode of 1024x768 backgrounds and MACE decode run on the page's main thread. Chromium measured DecompressionStream on a 4.7 MB entry at a ~25 ms main-thread gap, so the benefit is small until measured otherwise. core/data has no DOM references.

Proposal: Ship P-02 first and re-measure the longest rAF gap during a gup addon1 install; build the worker only if gaps above 50 ms remain. Then split fetch and decode out of import.ts into a DOM-free `web/fetchaddon.ts`, run it in `web/decoder.worker.ts` (esbuild entry, added to package.json, the Makefile copy list and build-site), transfer idx ArrayBuffers back, and keep fetchAddon as a thin RPC with the same in-flight dedupe. Verify `new Worker('decoder.js')` loads under the finsical:// WKURLSchemeHandler, with a Blob-URL fallback. Test: structured-clone round trip of a SpriteSheet.

### P-09 **No interpolation between 30 tps ticks: integer-pixel motion alternates 1 and 2 px steps**
Severity: low · Effort: M · Value: 3/5 · Risk: 3/5

Where: `web/main.ts:1031-1044`, `web/main.ts:1093-1105` (Math.round positions), `web/main.ts:1126-1142`, `core/sim.ts:205-246`, `web/crt.ts:286` (uTank from src.width).

What: Positions are rounded to whole tank pixels with no interpolation, so a 1.1-1.8 px/tick cruise alternates 1 and 2 px steps, and a tank pixel spans up to ~4.5 CSS px in a large window. At 60 Hz each state is held exactly 2 frames (even); at 50/75/144 Hz or with rAF jitter the hold count varies. Measured mean position error at 4.5 CSS px per tank px: 2.24 CSS px today, 0.74 with interpolation plus a 2x internal canvas. Integer motion is arguably the authentic 1997 look, so this is a style option.

Proposal: `enum MotionMode { Classic, Smooth }` in Preferences, Classic by default. Smooth: before each sim.tick() copy x/y into prevX/prevY on Fish/Food/Bubble (core/sim.ts); render `lerp(prev, cur, acc/step)`; new objects without prev draw at their current position. Internal canvas scale k=2 (width 640, height 400, `ctx.setTransform(2,0,0,2,0,0)`, smoothing off), positions rounded to 1/k. Pass the logical 320x200 to crt.ts for uTank so scanlines stay on game rows. Cap Smooth at ~60 renders/s; P-03's frame skip applies only in Classic. Tests: a pure lerp helper; a crt test that uTank stays logical.

### P-10 **The CRT shader samples 13 texels per device pixel at full Retina resolution**
Severity: low · Effort: M · Value: 2/5 · Risk: 3/5

Where: `web/crt.ts:24-25`, `web/crt.ts:84-112` (1 sharp + 4 beam + 2 misconvergence + 2 bloom + 4 halation taps), `web/crt.ts:278`, `web/crt.ts:307-316` (buffer = box x dpr), `web/crt.ts:339-353`.

What: A full-screen tank on a 16" MacBook Pro is ~2000x1250 device px, ~32 M texel fetches per frame, recomputing row-resolution effects at device resolution. Evidence is SwiftShader-only (dsf 2: ~24 fps); on Apple GPUs it is likely small.

Proposal: First rely on P-03 (halves CRT passes at 60 Hz). Add a pure `crtBufferSize(cssW, cssH, dpr, cap = 2560)` used by resize(), with crt.test.ts cases. Attempt a two-pass FBO (pass 1 at logical-row resolution for beam, bloom, halation; pass 2 at device resolution for scanlines, grille, vignette, grain) only after profiling on real hardware (Safari timeline or Instruments GPU) shows the shader matters; misconvergence depends on the pre-warp glass position, so approximate and confirm with screenshot diffs at CRT_DEFAULTS.

### P-11 **Machine case art ships as 15 MB of PNG**
Severity: low · Effort: S · Value: 2/5 · Risk: 2/5

Where: `web/assets/*.png`, `web/machines.ts:62-170`, `macos/Finsical.swift:8-11` (MIME map), `macos/Finsical.swift:169-190` (loadMaskImage), `macos/Makefile:36-39`, `media-sources/`.

What: The ten case images are 0.87-1.81 MB RGBA PNGs (15 MB total) copied wholesale into the app bundle. A web load fetches only the selected case (~1-1.8 MB). Lossless WebP is 7.5 MB with identical pixels; WebP q95 is 2.2 MB with 0 alpha changes and no flips of the alpha < 250 mask threshold. WebKit and ImageIO decode WebP on macOS 11+.

Proposal: Add a dev-only `tools/optimize_assets.py` (cwebp `-lossless -exact -z 9`, or `-q 95 -exact -alpha_q 100`) converting web/assets; masters already live in media-sources/. Update the image paths in machines.ts, add `"webp": "image/webp"` to WebHandler's MIME map, and add a machines.test.ts check that every `image` exists and a Python test that decoded PNG and WebP alpha channels are identical. Verify on macOS 12 that loadMaskImage's NSImage loads .webp and the Prefs preview renders.

### P-12 **imageCanvas destructures a palette array per pixel (3x slower than a Uint32 LUT)**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/render.ts:41-59`.

What: `const [r, g, b] = img.palette[pi] ?? [0,0,0]` runs per pixel with four separate byte writes, for every swim frame, backdrop, strip, decor and preview: 640x480 costs 7.7 ms cold / 4.3 warm vs 2.6 / 1.7 with a LUT.

Proposal: Extract a pure `indexedToRgba(img, opaque, mask?)`: precompute `lut[i] = (a<<24 | b<<16 | g<<8 | r) >>> 0` (a = 255 when opaque or i != 0), write `out32[i] = lut[idx[i]]` through a Uint32Array view of ImageData, and clear alpha with `& 0x00ffffff` where mask[i] === 0. Assert little-endian once. Test against the current algorithm on random images with and without a mask.

### P-13 **AudioContext and the ambient loop keep running while the tank is hidden**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/audio.ts:70-74`, `web/audio.ts:150-156`, `web/main.ts:96-97`.

What: No visibilitychange handler and no ctx.suspend(). When the tank is hidden (Cmd-H, minimized, hidden tab) rAF stops and the sim freezes, but the ambient loop and the audio device keep running.

Proposal: `TankAudio.setHidden(hidden)` calling ctx.suspend()/resume() without starting a second ambient loop (reuse the ambientSrc guard), wired to document.visibilitychange in main.ts; pause by default since the sim is frozen. An optional preference `BackgroundSound { Pause, Keep }`. Test with a fake AudioContext.

### P-14 **The native mask is re-baked with a full-image flood fill on every case switch**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `macos/Finsical.swift:130-167`, `macos/Finsical.swift:141`, `macos/Finsical.swift:177-255` (loadMaskImage, flood fill :231-251), `web/prefs.ts:276-289` (posts `machine` on every selection change), `web/main.ts:766-773`.

What: Each machine change reloads the PNG, redraws it and flood-fills ~0.9-1.3 Mpx with Swift arrays on the main thread, with no cache, plus an animated setFrame. Holding the down arrow in the Machine list repeats this per row. Unmeasured (Linux container); the non-72-dpi concern is moot (no pHYs chunks).

Proposal: `private var maskCache: [String: CGImage] = [:]`; `machineMaskImage = maskCache[id] ?? loadMaskImage(...)` and store it. In prefs.ts, update the preview immediately on keyboard selection changes but debounce the bus post by 150 ms. Verify with CFAbsoluteTimeGetCurrent logging (second visit ~0 ms) and Instruments while holding down.

### P-15 **Closed client windows keep their WKWebViews and WebContent processes for the session**
Severity: low · Effort: M · Value: 2/5 · Risk: 2/5

Where: `node_modules/osmium-ui/macos/OsmiumWindows.swift:281` (`isReleasedWhenClosed = false`), `macos/Finsical.swift:379-381`.

What: Every client webview survives closing for fast reopening; Import Add-ons holds listings, decoded previews and caches (P-01). After opening all four windows once, four extra idle web processes can live indefinitely. Not measured.

Proposal: A `DispatchSource.makeMemoryPressureSource(eventMask: [.warning, .critical], queue: .main)` in AppDelegate; on events call a new OsmiumWindowHost API `discard(_ hw:)` for hidden windows (nil the webView and window so show() recreates them). Requires an osmium-ui change (window/webView are internal(set)). Optionally discard Import Add-ons 5 minutes after it closes. Verify with Activity Monitor and `sudo memory_pressure -l warn`.

### P-16 **Swim-frame cache fills lazily mid-animation and keys are template strings**
Severity: nit · Effort: S · Value: 1/5 · Risk: 1/5

Where: `web/render.ts:61-72`, `web/main.ts:253-270`, `web/main.ts:1031-1036`.

What: The first draw of each pose builds a canvas mid-frame; 110 misses cost 31.5 ms over 8 s (~0.3 ms each, not perceptible). The key is a string built per fish per frame.

Proposal: Numeric key `group*256 + frame*2 + (facing > 0 ? 1 : 0)`. Prewarm in requestIdleCallback slices only if a profiler shows misses coinciding with dropped frames.

### P-17 **The CRT drawing buffer is reallocated on every size change during live resize**
Severity: nit · Effort: S · Value: 1/5 · Risk: 2/5

Where: `web/crt.ts:307-316`, `web/crt.ts:339-341`, `macos/Finsical.swift:160-166`.

What: render() calls resize(), which reassigns width/height (reallocating and clearing the backbuffer) whenever the rounded box changes, every frame of a live resize or animated case swap. Likely sub-millisecond; unmeasured.

Proposal: Keep the old buffer (CSS stretches it) and reallocate 200 ms after the last change or immediately on first enable, via a pure `nextBufferSize(cur, want, nowMs, lastChangeMs)` with unit tests.

### P-18 **The Stats window rebuilds its whole DOM on every state push**
Severity: nit · Effort: S · Value: 1/5 · Risk: 1/5

Where: `web/stats.ts:65-86`, `web/stats.ts:96-110`.

What: render() clears rowsEl and careEl and recreates ~25 elements per push (more during slider drags, P-06), resetting selection and hover.

Proposal: Build the rows once, then update textContent and `--osm-value` in place; rebuild care lines only when `st.advice.join('\n')` changes.

## Visual and layout

### V-01 **Backgrounds are squashed 17% vertically and nearest-neighbor downsampled every frame**
Severity: high · Effort: S · Value: 4/5 · Risk: 2/5

Where: `web/main.ts:28` (smoothing off), `web/main.ts:159-183` (pickBackdrop stores the full image), `web/main.ts:1071-1077` (drawImage to 320x200 per frame).

What: AquaZone backgrounds are 4:3 (640x480, some 1024x768; tank presets 640x480, the goldfish bowl 560x480). render() stretches them to 320x200 with smoothing off: a 16.7% vertical squash, every 2nd (or 3.2th) column and every 2.4th (or 3.84th) row sampled. The Back01 'AQUAZONE' logo is squat, photographic backdrops (Jungle01) speckle, and the bowl's wood grain and Dutch-aquarium dithered gradients alias into horizontal moire bands. The full-size source is rescaled on every frame, and backdropByPack keeps every installed background at full resolution (3.1 MB RGBA for 1024x768).

Proposal: Add a pure `coverRect(srcW, srcH, dstW, dstH, anchor: 'top' | 'center')` in web/render.ts returning the source crop {sx, sy, sw, sh} for a uniform cover scale. In pickBackdrop render once into a TANK-sized canvas: `drawImage(src, crop..., 0, 0, W, H)` with imageSmoothingEnabled = true and imageSmoothingQuality = 'high' (halve in steps when scale < 0.5; nearest-neighbor only for integer upscales), anchored top since gravel hides the bottom. Cache that canvas in backdropByPack (drop the full-size copy) and draw it unscaled. Optionally build a combined `sceneryCv` (backdrop + gravel + static decor) rebuilt from pickBackdrop, pickGravel, addDecor and removeAddon, so render() draws 1 image instead of 2+N; create the tank context with `{ alpha: false }`. If V-05's 320x240 tank lands, 640x480 fits at exactly 0.5 with no crop. Tests: `coverRect(640,480,320,200,'top')` = {sx:0, sy:0, sw:640, sh:400}; (1024,768) gives sw 1024, sh 640; (560,480) is width-limited. Manual: Back01's logo keeps its proportions.

### V-02 **Decor sizes are meaningless: every item is fit to ~160 px**
Severity: high · Effort: S · Value: 4/5 · Risk: 2/5

Where: `web/main.ts:199-218` (addDecor: `s = min(1, 0.8*TANK.height/h, 0.5*TANK.width/w)`, nearest-neighbor shrink at :214-216), `web/main.ts:1085-1091`.

What: Each item is scaled independently, so tall items all become 160 px and small ones stay 1:1. Amazon_L 262x402 -> 104x160 while Amazon_S 229x273 -> 134x160 (the small one renders wider); Vallis_l 252x464 -> 87x160; a thermometer 41x293 -> 22x160; a grand piano 179x187 -> 153x160; 39 px items stay 1:1 and look 2-3x too big. Nearest-neighbor at 0.35-0.6 breaks thin fronds apart. A 10-item tank reads as a wall.

Proposal: Add a pure `decorScale(w, h, tankH)` in render.ts returning `min(ART_SCALE, (tankH - 8) / h)` with the same ART_SCALE as B-01 (tune 0.31 vs 0.5 by screenshot; the art was authored for 640x480 and 1024x768 tanks). Downscale with the shared box filter (imageSmoothingQuality 'high' for non-0.5 factors). At 0.5 many L plants exceed a 200-px tank (Amazon_L 201, Glycer_L 243) and hit the clamp; that is expected until V-05's 240-px tank. Tests: decorScale keeps the Amazon_S (273) : GRASS_S (37) ratio exactly; an item with h=464 gets h*s == tankH-8.

### V-03 **The tank is drawn at a non-integer scale; on first launch it is below its native 320x200**
Severity: medium · Effort: M · Value: 4/5 · Risk: 3/5

Where: `web/main.ts:735-764` (layoutMachine, fractional px), `web/app.css:36-40` (`image-rendering: pixelated`), `macos/Finsical.swift:144-157` (first applyMachine keeps the 400-pt height), `macos/Finsical.swift:145` (contentMinSize), `macos/Finsical.swift:161-166` (case swap scales by vbW), `macos/Finsical.swift:468`, `macos/Finsical.swift:502`, `web/machines.ts:62-71`, `web/main.ts:391-395` (machine payload lacks sw/sh).

What: The canvas is CSS-stretched with nearest-neighbor to whatever layoutMachine computes, placed at fractional CSS px (Performa at 800x900: left 146.75, top 220.45, scale 1.585). Pixels come out alternately 1 and 2 device px wide and crawl as fish move (ink fluctuation 2.7-8.5% per 1-px move). The native first launch keeps the 400-pt launch height, giving a 310-pt wide Plus window whose screen is 227x142 pt: 0.71 CSS px per tank px, so ~29% of rows and columns are dropped at 1x and pixels are uneven at 2x. That frame is also below contentMinSize (369x476), so the first resize jumps. Other machines: TAM 0.66x, Performa 0.88x, iMac G3 0.78-0.82x, G4 0.83x. Case swaps keep viewBox units per pt, so the tank grows by the sw ratio (Plus to Performa +12%). The CRT path is unaffected (it resamples).

Proposal:
1. Pixel crispness (web, also fixes browsers): add a pure `snapRect(r, dpr)` (round each edge to 1/dpr) in machines.ts for #screen and #screenback. For the non-CRT path use sharp-bilinear: keep #tank at 320x200 as the render target and add a visible display canvas of k*320 x k*200 with `k = max(1, ceil(screenDevicePx / 320))` from a pure `presentScale(cssW, dpr)`; nearest-blit each rendered frame and let CSS downscale it with `image-rendering: auto`; move the pointer listener to the visible canvas (it already maps through TANK constants and the rect). Do not integer-snap by shrinking: floor(455/320) = 1 would shrink the default tank to 160 CSS px inside heavy underscan.
2. Native size: add `sw` and `sh` to postState's machine payload. In Swift, a pure `frameSize(vbW:vbH:sw:sh:backing:k:) -> NSSize` with `f = min(sw/320, sh/200)`, `s = k/(backing*f)`, size `(vbW*s, vbH*s)`. On the first apply with no saved FinsicalTank frame, use the largest integer k whose height fits 0.7*visibleFrame (Plus at 2x Retina: ~437x563 pt, an exact 2x); set contentMinSize to the k=1 size; keep k on case swaps; re-snap in windowDidChangeBackingProperties. Optional: View menu 'Actual Pixels' Cmd-1 / 'Double' Cmd-2 / 'Triple' Cmd-3, and `windowWillResize(_:to:)` snapping to integer k within 3% (Option resizes freely).
3. Tests: vitest `tankRect(machine, w, h, dpr)` / snapRect for every machine at dpr 1 and 2 (integer k, rect inside the aperture), and a TS mirror `tankWindowSize(machine, n, scale)`; Playwright screenshots at DPR 1.42 compare column-width histograms. Manual: `defaults delete dev.finsical.app`, fresh launch at 1x and 2x, no doubled or missing columns.

### V-04 **Gravel strips are squeezed with nearest-neighbor, floor height is accidental, and the sim floor ignores it**
Severity: medium · Effort: S · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:184-194` (pickGravel), `web/main.ts:1078-1084` (gh = h*320/w, smoothing off), `web/main.ts:1086-1091` (decor at height-6), `core/sim.ts:74` (BOTTOM_PAD 12), `core/sim.ts:229-237` (food settles at height-BOTTOM_PAD), `core/sim.ts:345`, `core/sim.ts:379`.

What: A 1000-px strip is sampled every 3.1 px and becomes coloured noise (Eden, Dutch presets). Floor thickness depends on source width: bamboo 640x116 -> 58 px, jewelstone 800x176 -> 70, whitesand 999x128 -> 41, brownsand 1000x169 -> 54. The sim floor is always y=188, so fish centres sit 27 of 39 px (base strip) to 58 of 70 px (BLACK.GRV) deep inside the gravel art, and pellets rot in the bottom rows. In the original, fish went only ~23% into a 78-px strip.

Proposal: (1) In pickGravel pre-render once: scale by `ART_SCALE * TANK.height / 240` (0.5 once V-05's 240-px tank lands; at 200 px a 1000x169 strip at 0.5 would be 42% of the tank) with smoothing 'high', centre-crop to TANK.width, mirror-tile narrower strips; cache in gravelByPack and draw unscaled at y = H - h. (2) Sim gets a mutable `floorY` (default height - BOTTOM_PAD) and `setFloor(y)`, replacing every `height - BOTTOM_PAD` (sim.ts:231, 345, 379); when the floor rises, fish below it glide up at <= 1.5 px/tick. main.ts calls `sim.setFloor(floorFor(gravelCv))` whenever gravel changes, with a pure `floorFor(stripH) = TANK.height - stripH + round(stripH * GRAVEL_SURFACE)`, GRAVEL_SURFACE = 0.35 until the Grvl record is decoded (verify on 3 strips by overlay screenshot). (3) Each pellet gets a seeded restY in [floorY + 4, H - 4] so pellets scatter across the bed; decor bottoms move to floorY + 4. Tests: sim.test `setFloor(150)` keeps fish y <= 150 after 5000 ticks, pellets settle in the band, a fish at 188 is above 150 within 40 ticks with no NaN; a pure `gravelScale(w, h, tankW, tankH)` test for 1000x169 at tankH 200 and 240.

### V-05 **A 16:10 tank inside roughly 4:3 glass leaves 13-24% dead black bands**
Severity: medium · Effort: L · Value: 4/5 · Risk: 4/5

Where: `web/machines.ts:10-11` (comment), `web/machines.ts:62-178` (sx/sy/sw/sh), `web/machines.test.ts:116-118` (asserts 1.6), `web/main.ts:24` (TANK), `web/index.html:16`, `web/crt.ts:280-286`, `macos/Finsical.swift` (contentAspectRatio ~:500).

What: Every machine's screen rect is 1.6:1 inside a glass aperture of 1.25-1.39 (Plus 1.370, Performa 1.387, TAM 1.394, Bondi 1.273; G4 1.566). The water covers only 76-87% of the glass height and #screenback paints black above and below, which reads as dead glass. It also forces the backdrop crop in V-01. The design was intentional (and tested), so this changes a decision.

Proposal: Do the single-size step first: TANK = 320x240 (main.ts:24, index.html canvas height). Set each machine's sx/sy/sw/sh to a 4:3 rect centred in the hole with a 4-8 unit inset (the G4 pillarboxes slightly); Bare becomes vbW 320, vbH 240; Swift contentAspectRatio 320x240; update machines.test.ts:118 to 4/3. Saved fish (y <= 200) stay valid and the CRT takes its dimensions from the source at init. Backgrounds then fit 640x480 at exactly 0.5 and ART_SCALE becomes a clean 0.5. Per-machine heights (Sim.resize) only if G4 pillarboxing proves objectionable. Tests: machines.test asserts every sw/sh is 4/3 within 1% and inside the hole; sim.test a Sim(320x240) keeps fish in bounds.

### V-06 **Pitch snaps by up to 45 degrees at the start and end of every roll**
Severity: medium · Effort: S · Value: 3/5 · Risk: 1/5

Where: `core/pose.ts:31-37` (pitch: 0 during 'turn', raw heading otherwise), `core/sim.ts:266-287` (turn end sets heading at the target), `web/main.ts:1013-1025`, `web/main.ts:1031-1044` (drawFish rotates by pitch(f)).

What: pitch() has no smoothing. A fish climbing at up to 45 degrees snaps level on the tick it enters a roll, and snaps to the new angle when the roll ends: median ~15 degrees, p90 45 degrees at both ends, about 27 times per fish-minute (fewer after B-07).

Proposal: Keep it render-only: a `WeakMap<Fish, number>` tilt in main.ts advanced once per sim tick (like animFrame integrates on sim.tickCount) toward pitch(f) via a pure `stepTilt(prev, target)` clamped to PI/60 per tick (45 degrees in 0.5 s). During 'turn' the target is 0, so fish ease level. drawFish (and drawPlaceholder) use the tilt. If V-07 lands, feed its residual rotation through the same helper. Test: `|stepTilt(a, b) - a| <= PI/60 + 1e-9` for random inputs; wrapAngle handled.

### V-07 **Climb and dive rotate the pixel art although every pack ships authored pitch poses**
Severity: medium · Effort: M · Value: 4/5 · Risk: 3/5

Where: `core/pose.ts:31-37`, `core/pose.ts:113-125` (fishPose), `web/main.ts:1039-1043` (`ctx.rotate(pitch(f))`, smoothing off), `web/main.ts:1047-1061` (placeholder rotates with anti-aliased edges), `core/sim.ts:116-117` (TURN_RATE PI/20).

What: drawFish rotates sprites up to +/-45 degrees with nearest-neighbor sampling on the 320x200 canvas, producing broken outlines; each small angle change re-samples ~27-29% of the sprite's pixels, so climbing fish visibly boil. The placeholder's rotated fillRects anti-alias to off-palette pixels. Every species has a 6-group pitch sheet (FishMaker sequences 9-14: left level, left up, right up, right level, right down, left down; art tilt ~30 degrees), unused. Some 6g sheets have only 1-2 frames (disc, tama, Denden).

Proposal: After B-01 (and ideally F-01), pick the pitch sheet as the 6g sheet whose cellW/cellH are closest to the chosen swim sheet (never by position). Before hard-coding the group map, render the 6 groups of a real pitch sheet through swimFrame for both facings and record which reads as left-up etc. (comet: g0 level-left, g1 up-left, g2 up-right, g3 level-right, g4 down-right, g5 down-left; check angels and discus too). Extend fishPose with hysteresis kept on the fish (`f.pitchPose: -1|0|1`): enter at |pitch| > 14-15 degrees, leave at < 8; return `{sheet: 'pitch', g}`; animFrame indexes modulo that sheet's framesPerGroup. drawFish drops ctx.rotate except a residual `(pitch - sign*30deg)` clamped to +/-8-10 degrees (through V-06's stepTilt). The placeholder snaps to 0 or +/-30 degrees. Alternative for packs without a pitch sheet: quantize the drawn pitch (`quantizePitch(prevStep, pitch, PI/24, 0.6)` in pose.ts) and pre-rotate into the swim cache (4x nearest supersample, then 4:1 nearest downsample). Tests (pose.test.ts): the four climb/dive cases, hysteresis (13 degrees after 15 stays pitched, 7 returns level), 'turn' ignores pitch.

### V-08 **The CRT shader blurs the tank bilinearly: rows bleed into each other and 'Sharp' still blurs**
Severity: medium · Effort: S · Value: 3/5 · Risk: 2/5

Where: `web/crt.ts:49-52` (gamePx samples raw lp), `web/crt.ts:84-89`, `web/crt.ts:115-119`, `web/crt.ts:270-277` (LINEAR filtering), `web/crt.ts:343`, `web/prefs.ts:37-39` (Softening blurb).

What: Every tap interpolates between neighbouring game pixels in both axes, including the 'sharp' centre tap. Vertically colour bleeds across rows although the Softening text promises smear 'along each scan, never between rows' and the header says scanlines are locked to game rows (default scanlines are only 0.40, so it shows). With Softening at 'Sharp' (uBeam = 0) the output is still the bilinear sample. GL probe with the real FRAG on alternating 1-px red/blue rows at 3x, all traits off: only 1 of 3 device rows per game row is pure; black/green columns ramp 0/85/170/255.

Proposal: Add `uniform float uScale;` (device px per game px, from the `s` already computed at crt.ts:343). `vec3 rowPx(vec2 lp){ vec2 c = clamp(lp, vec2(0.5), uTank - 0.5); return texture2D(uTex, vec2(c.x, floor(c.y) + 0.5) / uTank).rgb; }` (linear in x, nearest in y) for every horizontal tap (beam +/-0.7/+/-1.6, misconvergence, bloom +/-3.5, halation +/-7); halation's +/-5 vertical taps may keep gamePx. Sharp-bilinear for the centre: `vec3 sharpPx(vec2 lp){ vec2 p = clamp(lp, vec2(0.5), uTank - 0.5) - 0.5; vec2 i = floor(p); vec2 f = clamp((p - i - 0.5) * uScale + 0.5, 0.0, 1.0); return texture2D(uTex, (i + 0.5 + f) / uTank).rgb; }` (pure nearest would give uneven widths and moire under curvature). Keep LINEAR filtering. Test: a Playwright GL probe on 1-px red/blue rows at 3x (scanlines, curvature, beam 0): every pixel pure red or blue except at most one AA pixel per boundary; with beam = 1 rows still never mix. Add it to T-06's smoke suite.

### V-09 **Plant and accessory previews show the catalog tile, not the art the tank draws**
Severity: low · Effort: S · Value: 3/5 · Risk: 2/5

Where: `web/render.ts:74-88` (previewOf renders the largest image opaque), `web/main.ts:199-220`, `web/import.ts:407` (ImportHandlers.preview), `web/import.ts:793-800`, `web/import.ts:1043-1051`, `web/import.ts:931` (THUMB_PREFIX), `web/app.css:205-207`, `web/addons.ts:32`.

What: previewOf uses `imageCanvas(imgs[0], true)`: for many accessories that is the catalog card with its gravel strip and black key background (BEAD_BLU/LB/RED rows are black squares) or the overhead layout view (AZ_SUB), while the tank uses pickDecorArt + keyMask. The preview well is white (.osm-well #fff), so 50% checker shadows look like noise.

Proposal: Pass the section: `preview(rs, section)` in ImportHandlers and both callers (main.ts:368, addons.ts:32). Move decor canvas creation from addDecor into render.ts as `decorCanvas(images)` (pickDecorFrames from B-22, frame 0, keyMask) shared by addDecor and previewOf for plants/accessories; gravel previews use the widest w >= 3h strip. Give `.ipreview` the tank gradient (#2e7fc4 -> #14508c) and optionally a size line ('80 x 55 in the tank'). Bump THUMB_PREFIX to 'thumb2:'. Test: vitest decorCanvas prefers the uniform-corner frame over a textured-corner 83x83 tile.

### V-10 **Thumbnails: fish captured mid-turn, gravel as 38x6 slivers, big downscales alias**
Severity: low · Effort: S · Value: 3/5 · Risk: 1/5

Where: `web/main.ts:430-440` (scaledThumb), `web/main.ts:441-454` (fishThumb memoized for the fish's lifetime), `web/import.ts:491-501` (miniThumb), `web/import.ts:931`.

What: fishThumb renders the fish's live pose and memoizes it, so a fish caught mid-turn is an end-on blob forever. Gravel strips shrink to 38x6. Large art shrinks 10-30x with nearest-neighbor.

Proposal: fishThumb uses the canonical pose `swimCanvas(sheet, 0, -1, groups >= 4 ? groups/2 : 0)` independent of state. Gravel and backgrounds crop a centred 38x28 window from the ART_SCALE-prescaled canvas (V-01/V-04) via a pure `thumbCrop(srcW, srcH, 38, 28)`. Downscales > 2x use imageSmoothingQuality 'high'. Plants and accessories use the pack's 83x83 catalog icon (the image cornerKey rejects) as the list thumb. Bump the thumb prefix so old slivers regenerate. Test: thumbCrop unit test.

### V-11 **Feeding by key or menu stacks every pellet in one column; pellets are flat squares**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/main.ts:794-797` (feedFish drops at TANK.width/2), `web/main.ts:1093-1099` (3x3 #c9a227), `core/sim.ts:175-178` (spawn at SURFACE+2).

What: Repeated F presses spawn pellets at exactly x=160 that sink in lockstep and read as a stick.

Proposal: Each feed drops a pinch (see U-01 for the count): 3-5 pellets at 160 +/- rand(24) with staggered start y and a per-pellet phase for a small sinusoidal x drift while sinking. Draw 2x2 pellets with a shade pixel mixed with 2x1 flakes, plus a one-frame splash at the surface; use pack food sprites once F-06 exists. Test: sim.test for the dropFood spread.

### V-12 **Murky water barely shows**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/main.ts:1111-1116`.

What: Murk is a linear `rgba(96,80,36, (1-q)*0.28)` wash: 25% alpha at water quality 0.1, so a fouled tank still looks clean.

Proposal: A pure `murkParams(q)`: strength = smoothstep(0.7, 0.1, q); a green-brown tint (70,90,30) stronger toward the gravel; reduced contrast; 20-40 drifting 1-px particles below q 0.5; a dithered algae vignette at the glass edges below q 0.3 (D-12 can extend it). Unit-test murkParams.

### V-13 **The Preferences machine preview shows a blank white screen**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/prefs.ts:296-304` (paintPreview), `web/app.css:79-84` (#pfpreview #fff), `web/main.ts:734-764`.

What: The case art has a transparent glass cut-out over a white well, so every machine looks switched off and the baked-in glass reflections are invisible. 'Bare tank' (no image) is an entirely blank well.

Proposal: In paintPreview, when m.hole is set, prepend `<rect>` at hole +/- SCREENBACK_HOLE_PAD filled #050505, then a `<rect>` at sx/sy/sw/sh with a #2e7fc4 -> #14508c linearGradient, then the shell `<image>`; for 'bare' draw just the gradient at 0,0,320,200. Optional follow-up: bus op 'wantSnapshot'; the tank replies with a 160x100 canvas data URL at most once per second while the Machine pane is visible, drawn as an `<image>` at sx/sy/sw/sh beneath the shell.

### V-14 **CRT shader runs at mediump and its time uniform wraps every 100 s**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/crt.ts:25` (`precision mediump float`), `web/crt.ts:54-56` (sin hash x43758), `web/crt.ts:122-127` (grille), `web/crt.ts:131-134`, `web/crt.ts:347-349` (uTime % 100).

What: On GPUs where mediump is fp16 (common on mobile; the web build supports touch), `fract(sin(dot(p, ...)) * 43758.5453)` collapses (dot can even overflow fp16's 65504 and give NaN), so Noise becomes a constant darkening; gl_FragCoord is exact only to 2048 px. Separately, uTime wraps at 100 s, so `sin(uv.y*3 - uTime*4)` jumps 4.16 rad and `sin(uTime*61)` is discontinuous: the rolling band hops every 100 s (amplitude 0.03*flicker, barely visible). Not reproducible on desktop GPUs.

Proposal: (1) `#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif` (the real fix wherever highp exists). (2) Mediump-safe hash: `float hash(vec2 p){ p = mod(p, 256.0); return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }` (the inner fract keeps the product < 53). (3) Wrap uTime at 32*PI (~100.53 s): 61*32PI and 4*32PI are whole multiples of 2*PI, so flicker and the band stay continuous; grain uses fract(uTime) and is unaffected. Leave the grille expression. Verify on an iPad: log `getShaderPrecisionFormat(FRAGMENT_SHADER, MEDIUM_FLOAT).precision` and compare grain.

### V-15 **Mask layer changes animate implicitly, so case edges lag during live resize**
Severity: low · Effort: S · Value: 3/5 · Risk: 1/5

Where: `macos/Finsical.swift:262-301` (syncMask), `macos/Finsical.swift:312-316`.

What: The mask is a standalone CALayer/CAShapeLayer with no delegate, so frame, contents and path changes get CoreAnimation's default 0.25 s implicit animation; during live resize the mask trails the window and clips the growing bezel, and a case swap cross-fades silhouettes. Not seen on a device.

Proposal: Wrap the body of syncMask in `CATransaction.begin(); CATransaction.setDisableActions(true); defer { CATransaction.commit() }`. Do not bother with contentsScale (the image is stretched with `.resize` and the assets have no pHYs). Manual test: fast bottom-right live resize of the Plus tracks the pointer; a Preferences case switch swaps the silhouette with no cross-fade.

### V-16 **The window shadow is not recomputed when the transparent silhouette changes**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `macos/Finsical.swift:142-143`, `macos/Finsical.swift:262-301`, `macos/Finsical.swift:498-499`, `web/main.ts:766-775` (applyMachine), `web/main.ts:792`.

What: AppKit derives a transparent window's shadow from its content alpha and does not refresh it without `invalidateShadow()`, which is never called. The first frame happens at script run, before the case PNG has painted, so the shadow may follow an incomplete or earlier outline. Needs a device check.

Proposal: In applyMachine, after setting shellEl.innerHTML, wait for the `<image>` `load` event plus two requestAnimationFrame calls, then `bus.post({op: 'shellPainted'})`. In userContentController handle 'shellPainted' from the tank (not relayed) with `window.invalidateShadow()`; if that has no effect on a layer-backed window, toggle hasShadow off and on. Manual test: Plus, iMac G4, Bare; the shadow follows each outline.

### V-17 **No viewport meta: on phones the tank lays out at 980 px and the touch code never takes effect**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/index.html:1-8`, `web/app.css:13-14` and `:81-85` (safe-area insets), `web/import.ts:606-611` (NARROW_W), `web/import.ts:894-903`, `web/main.ts:805-822` (touch 'Add-ons…' button).

What: Without `<meta name="viewport">` mobile browsers lay out at 980 CSS px (iPhone 13: innerWidth 980), so bitmap text and the touch button render at ~40% size, the overlay's < 480 px stacked layout never triggers, and `env(safe-area-inset-*)` is always 0. No page has a favicon, so browsers log a /favicon.ico 404.

Proposal: Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` to web/index.html only (the four client pages are fixed-size Osmium windows that would overflow at 390 px; revisit after checking each). Add `<link rel="icon" href="assets/icon-32.png">` (generated from media-sources/icon-finsical.png) to all pages. WKWebView on macOS ignores the tag. Verify with Playwright's iPhone 13 descriptor: innerWidth 390, the overlay card has class 'inarrow', #opentrigger clears the home indicator.

### V-18 **The add-on detail line uses a middle dot that the Geneva 10 bitmap font lacks**
Severity: nit · Effort: S · Value: 1/5 · Risk: 1/5

Where: `web/import.ts:785-786`, `node_modules/osmium-ui/src/fonts/geneva10.ts`, `node_modules/osmium-ui/src/fonts/geneva9.ts`.

What: `${KIND} · archive.org` renders in .imeta (Osmium Geneva 10), which has no U+00B7, so that one glyph falls back to an anti-aliased system font. Charcoal 12 has it; every other non-ASCII UI glyph is covered.

Proposal: Use ', ' (Finder Get Info style) or a spaced U+2014 dash (present in Geneva 10), or add U+00B7 to Osmium's Geneva 9/10 strikes upstream (Mac Roman 0xE1 exists in the original). T-03 replaces the line with a source credit anyway.

## UX and convenience

### U-01 **A few extra food clicks foul the whole tank within a minute, with no warning**
Severity: medium · Effort: S · Value: 4/5 · Risk: 2/5

Where: `core/sim.ts:88-92` (WASTE_PER_TICK 1/6000, FILTER_PER_TICK 1/12000, FOOD_ROT_TICKS 1350), `core/sim.ts:174-178` (dropFood), `core/sim.ts:228-240`, `core/sim.test.ts:88-100`, `web/main.ts:100-111`, `web/main.ts:794-797`, `web/main.ts:1111-1116`.

What: Every click in the top 15% drops a pellet whether or not anyone is hungry. With 4 sated fish: 1 pellet dips water to 0.89, 3 to 0.44, 5 to 0.00 about 61 s after dropping (0.15 at 120 s). Below 0.3 fish stop eating and slow down under brown murk, and full recovery takes ~6.7 minutes. The top of the tank is exactly where a curious new user clicks, so the main interaction punishes playing. One Feed Fish with 7 hungry fish feeds only 1.

Proposal: (1) `export const MAX_UNEATEN = 6`; `Sim.dropFood(x): boolean` returns false (nothing pushed) once `food.filter(f => !f.eaten).length >= MAX_UNEATEN`; main.ts plays audio.feed() only on true and shows a ripple otherwise (U-03). (2) WASTE_PER_TICK = 1/10000; it must stay above FILTER_PER_TICK or single-pellet rot never shows and the existing rot test fails; the worst case at the cap leaves water ~0.30, so only sustained overfeeding fouls the tank. Update the comment at sim.ts:89. (3) feedFish drops N = clamp(fish with hunger > 0.4, 1, 5) pellets at 160 +/- 24*k, 3 ticks apart via a pending queue drained in frame(). Tests: 20 dropFood calls with sated fish leave water >= 0.25 after 60 s; dropFood returns false at the cap; one feed with 5 hungry fish feeds at least 3; existing rot and filter tests pass.

### U-02 **First launch shows four orange rectangles, no guidance, and a 404 every launch; offer a starter aquarium**
Severity: medium · Effort: M · Value: 4/5 · Risk: 3/5

Where: `web/main.ts:56-76` (DEFAULT_FISH), `web/main.ts:222-237`, `web/main.ts:805-824` (#opentrigger only for hover:none), `web/main.ts:870-887` (pack/ fetch 404), `web/main.ts:1046-1068` (drawPlaceholder), `web/main.ts:1081-1083` (flat floor), `web/import.ts:1133-1162`, `macos/Finsical.swift:555-577`, `.gitignore` (web/pack/).

What: A new user sees 14x8 orange blocks on a two-stop gradient above a flat brown bar, with no text and (in a desktop browser) no control at all. In the app the only way in is Tank > Import Add-ons…, and a fish, a gravel, a plant and a background take ~13 clicks and 4 downloads. Every launch logs 'azpack load failed; using placeholder fish: manifest.json: 404' because web/pack/ is gitignored and never shipped.

Proposal:
1. Alert module: `web/alert.ts` `showAlert({icon: 'note' | 'caution', text, buttons: [{title, default?, action}]})` built on Osmium's mountWindow in a fixed overlay (Osmium has no alert component); 32x32 note/caution icons as sprites via registerSprites (icons.ts pattern, vitest in icons.test.ts); Return/Escape through bindDialogKeys. Reused by U-04, D-07 and others.
2. First run (`saved === null` and localStorage `finsical:welcomed` unset): 'Welcome to Finsical. Your tank has four stand-in fish. Finsical can stock it with the original AquaZone fish, plants and scenery from the Internet Archive.' [Not Now] [Stock the Tank]. Browser: showAlert over the tank. Native: postState carries `firstRun: true`; the shell opens Import Add-ons beside the tank (B-05) and addons.ts shows a one-time 'Stock the Tank' banner row.
3. `STARTER_SET` in web/import.ts as (section, inner) pairs resolved against the listing (e.g. fish angels, banggai; gravel brownsand; plants Amazon_L; backgrounds Back01; ~1-1.5 MB, not aquazone.rez) via a pure `resolveStarter(listing)` that skips missing items; install sequentially through the existing install path with a determinate `.osm-progress` ('Adding 2 of 5: banggai…'). On accept, remove the placeholders.
4. Placeholders that remain: named 'Starter fish', drawn as 2-3 hand-made 16-colour gridCanvas sprites with a 2-frame tail, over seeded 3-tone dithered sand prerendered once; a dismissible Balloon-style hint ('Choose Tank > Import Add-ons… (Cmd-I) to stock your aquarium') while installedAddons is empty.
5. pack/: treat a 404 as absence with console.info, or have the build write `__BUNDLED_PACK__` (T-15) and skip the fetch.
Tests: vitest resolveStarter; STARTER_SET URLs are on archive.org and map to known sections; Playwright fresh context shows the dialog, one with a saved tank does not, and Stock the Tank ends with angels and banggai plus a gravel, a plant and a background.

### U-03 **Feeding and tapping give almost no feedback: no cursor hint, a 3-px pellet, silence by default**
Severity: medium · Effort: M · Value: 4/5 · Risk: 2/5

Where: `web/main.ts:100-111` (zones split at y < 0.15*height, no pointermove handler), `web/main.ts:1093-1099`, `web/app.css:28` (`#screen { cursor: default }`), `web/app.css:34-35`, `web/audio.ts:128-148`, `web/render.ts:12-29` (gridCanvas), `web/icons.ts:11-13`.

What: Two invisible click zones (top 15% feeds, lower taps the glass) share the default arrow; a tap more than 48 px from any fish changes nothing; Finsical ships no samples and the only Sounds add-on is music, so both actions are silent for nearly every user.

Proposal: (1) Cursors: new `web/cursors.ts` with original 16x16 pixel grids (Osmium sprite keys) for SHAKER (hotspot at the spout), KNUCKLE (hotspot at the knuckles), HAND_OPEN, HAND_CLOSED, rasterized with gridCanvas at 1x and 2x into data URLs; CSS `-webkit-image-set(url(1x) 1x, url(2x) 2x) hx hy, url(1x) hx hy, pointer`. Factor the letterbox math into a pure exported `mapToTank(rect, clientX, clientY, tank)` and `zoneAt(y): 'feed' | 'tap'`, shared by pointerdown and a new pointermove that sets canvas.style.cursor; a tipped shaker for 150 ms on pointerdown; hands outside the tank rect. The CRT canvas passes pointer events through, so this works with CRT on (combine with B-35). (2) Visual echo: `ripples: {x, y, t0, kind}[]` drawn after bubbles: a tap is a 1-px ring growing radius 2 -> 14 over 12 frames at alpha 0.6 -> 0; a feed is a flattened ring at SURFACE. (3) Fallback sounds when find() returns null: a synthesized 60 ms band-passed noise knock for taps and a 120 ms 600 -> 300 Hz sine plop for feeding; imported samples take precedence. Tests: unit-test zoneAt and mapToTank; Playwright: a click with no fish nearby changes pixels within 8 px of it inside 100 ms.

### U-04 **Removing a fish or add-on is instant and permanent: no confirmation, no Undo**
Severity: medium · Effort: M · Value: 4/5 · Risk: 3/5

Where: `web/overview.ts:106-118` (Remove button, plain Delete/Backspace), `web/main.ts:520-521`, `web/main.ts:553-602` (removeAddon), `core/sim.ts:156-159`, `core/sim.ts:167-172`, `macos/Finsical.swift:578-585` (Edit menu without Undo), `web/import.ts:1236`.

What: A slip of the Delete key in Tank Overview permanently loses a fish; removeAddon also deletes all its fish and scenery. The Edit menu has no Undo.

Proposal: (0) Cheap guard first: in overview.ts require Cmd-Delete (Mac OS 8 Finder's Move to Trash; Ctrl in a browser), ignore plain Delete. (1) Pure `web/trash.ts`: a stack capped at 10 of `{kind:'fish', fish} | {kind:'addon', it, fish: Fish[]}`, pushed from the removeFish and removeAddon handlers. (2) Bus op 'undo': a fish comes back via `sim.addFish(savedFish)` (keeps its id); an add-on goes back into installedAddons, then `importPanel.restore([it])` (works once B-37 notifies the panel of removals), then the fish are re-added and remapSheetIdx() runs. (3) State carries `undo: string | null` ('Undo Remove “angels”'); native Edit > Undo Cmd-Z evaluates `window.finsical.undo()` with the title validated from the last push; Overview binds Cmd/Ctrl-Z. (4) Before removing an add-on that has fish, a caution alert (U-02's alert module): 'Remove “angels” and its 2 fish from the tank?' [Cancel] [Remove]. Tests: vitest trash.ts; Playwright remove then Ctrl+Z restores the count and species; plain Delete no longer removes.

### U-05 **Standard Mac menu items are missing: About, Hide Cmd-H, Hide Others, Show All, Services, Help; the CRT item has no checkmark**
Severity: medium · Effort: S · Value: 4/5 · Risk: 1/5

Where: `macos/Finsical.swift:543-554` (app menu: Preferences… and Quit only), `macos/Finsical.swift:555-577` (Tank menu), `macos/Finsical.swift:578-608`, `macos/Finsical.swift:343-374` (state branch ignores `crt`).

What: Cmd-H does nothing, which matters for a window that floats above every app; no About box shows the version; no Services submenu; no Help menu, so macOS menu search is missing; 'Toggle CRT Effect' shows no state. Automatic window-tabbing items may also appear (unverified).

Proposal: App menu: About Finsical (the A-04 window, or `orderFrontStandardAboutPanel` with credits for 9003 Inc./Mindscape, the Internet Archive and Osmium UI, see T-03), separator, Preferences… Cmd-,, separator, Services (`NSApp.servicesMenu`), separator, Hide Finsical Cmd-H (`NSApplication.hide(_:)`), Hide Others Opt-Cmd-H, Show All, separator, Quit. Help menu (`app.helpMenu`) with 'Show Balloons' (A-05) and 'Finsical Help' (README or a shortcuts window). `NSWindow.allowsAutomaticWindowTabbing = false` before creating windows. AppDelegate conforms to NSMenuItemValidation, caches `crtOn` from `body["crt"]["on"]` in the state branch, and sets `item.state` for toggleCrt (rename it 'CRT Effect'). Manual test: Cmd-H hides and a Dock click restores; the checkmark follows the C key.

### U-06 **Overview statuses mislead: hidden scenery says 'In tank', a fish add-on with no fish stays listed, the header miscounts**
Severity: low · Effort: S · Value: 3/5 · Risk: 2/5

Where: `web/overviewmodel.ts:72-85` (status hard-coded 'In tank' at :81), `web/overview.ts:161-170` (header counts unbound add-on lines at :168), `web/main.ts:157-194`, `web/main.ts:385-419`, `web/main.ts:520-522`, `web/main.ts:578-587`, `web/import.ts:686`, `web/import.ts:822-824`.

What: Only the newest gravel and background are drawn, yet every installed one reads 'In tank' and is ticked in the importer; removing a hidden one changes nothing visible, and the only way back to an earlier one is the confusing 'Add Again'. Removing the last fish of a fish add-on makes a new row 'aetena, Fish add-on, In tank' appear; its sheet still feeds loose fish, so it is not truly unused. The header says '8 fish, 0 add-ons' with add-ons installed.

Proposal: Keep the per-pack fallback design (removing the newest gravel falls back to the previous one). Add `scenery: {gravel: gravelSrc, backdrop: backdropSrc}` to postState. In itemsOf: gravel/backgrounds/tanks get 'In use' or 'Not shown'; a fish add-on with no bound fish gets 'No fish'. Header counts `(s.addons ?? []).length`. Double-click on a 'Not shown' row (mountList onOpen) posts `{op: 'useScenery', url}`: the tank promotes that key (B-20's promote), sets the current canvas, saves and posts state. After removing a pack's last fish, select the add-on row that appears (key `a:${pack}`) so a second Delete uninstalls it. Do not auto-uninstall or auto-replace. Tests: overviewmodel.test.ts for the three statuses and the count.

### U-07 **Import Add-ons: double-click does nothing; no search field, remembered position or section counts**
Severity: low · Effort: M · Value: 4/5 · Risk: 2/5

Where: `web/import.ts:564-601`, `web/import.ts:660-677` (mountList without onOpen), `web/import.ts:696-714`, `web/import.ts:789`, `node_modules/osmium-ui/src/controls.ts:752`, `node_modules/osmium-ui/src/controls.ts:920-923`, `node_modules/osmium-ui/src/controls.ts:938` (type-select resets after 1 s), `web/overview.ts:95-99`.

What: In the Chooser and Standard File, double-clicking an item triggers the default button; here it does nothing. Sections are long (395 accessories, 165 fish, 93 plants) and type-select times out after 1 s. Switching sections resets scroll and selection.

Proposal: (1) `onOpen: (i) => { if (installed.has(rows[i]?.url ?? '')) return; if (addAction) addAction(); else openWhenReady = rows[i]?.url ?? null; }`; at the end of showDetail's fetch, when `detailRef === ref && openWhenReady === it.url`, call offer() then addAction() (onSelect already started the fetch; addAction is null until it loads). (2) An edit-text field in .ihead right of the popup (`.ifind { border: 1px solid #000; box-shadow: inset 1px 1px #888; font: var(--osm-font-small) }`) filtering rows by case-insensitive substring on inner and source through the same path as showSection (keeps the IntersectionObserver in sync); Escape clears it. (3) `Map<section, {scrollTop, url}>` restored in showSection. (4) Counts in the popup ('Accessories (395)'). Tests: Playwright double-click adds one fish, not on an installed item; typing 'wood' filters to the WOOD* rows.

### U-08 **Add-on lists are unsorted, split by case, and duplicates across archives look identical**
Severity: low · Effort: S · Value: 3/5 · Risk: 1/5

Where: `web/import.ts:37-60` (Collection), `web/import.ts:369-387` (listAddons), `web/import.ts:785-786` (dmeta).

What: Sections concatenate collections in COLLECTIONS order, each in case-sensitive archive order: Plants starts 'Salma Large, Salma Small, Silver Reed, APONOGET…'; 'black'/'BLACK', 'marble'/'Marble', 'stream'/'Stream' sit far apart in Gravel; 'MekaUni' appears twice in Accessories (US mekaccs.zip and JPN) with identical '<Kind> · archive.org' meta.

Proposal: Add `source: string` to Collection ('AquaZone add-ons', 'Meka Asia pack', 'AquaZone (JPN) set', 'JPN non-retail bonus') and copy it onto each Importable (identity stays the url). Sort each section by `(rank) || a.inner.localeCompare(b.inner, 'ja', { sensitivity: 'base', numeric: true })`. Show `${KIND}, ${it.source}` in dmeta (see V-18, T-03). Test: vitest listAddons with stubbed collections returns case-insensitively sorted names per section with source set.

### U-09 **Failed installs from Import Add-ons show raw JavaScript errors with full URLs**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/main.ts:607-649` (remoteInstall `fail(String(e))` at :648), `web/import.ts:518-529` (loadProblem), `web/import.ts:1205-1211` (`Couldn't add it: ${m.error}` at :1209).

What: When the tank's fetch fails the window shows e.g. "Couldn't add it: Error: https://archive.org/download/.../arowana.zip: 503" or "TypeError: Failed to fetch"; the local path already maps errors through loadProblem().

Proposal: In remoteInstall's catch: `console.warn('remote install failed:', e); fail(loadProblem(e));` (main.ts already imports from ./import.js). Change import.ts:1209 to `Couldn't add it. ${m.error}`, matching the local 'Couldn't load it. …' style. Vitest loadProblem cases: `new TypeError('Failed to fetch')`, an Error ending ': 503' ('archive.org answered with error 503.'), 'no pack inside'.

### U-10 **Dropped files get no highlight and no result message on the tank or the Import window**
Severity: low · Effort: S · Value: 3/5 · Risk: 1/5

Where: `web/main.ts:919-1001` (dragover only preventDefaults; every outcome at :945-999 goes to console, oversize skips at :969-972 silent), `web/addons.ts:38-67` (console.warn only; silent return on no records), `web/import.ts:740-743` (invites drops).

What: Drag-and-drop is an advertised path (the Sounds pane says to drop files 'on the tank or this window'), but nothing shows a drop target and success or failure only reaches the console; success on Import Add-ons is only audible.

Proposal: Count dragenter/dragleave to toggle `body.dropping` and draw the Mac OS 8 drop hilite in CSS (2 px black inset plus a 1 px white inner rule around #screen). After the async import, show a transient Osmium caption box in the screen corner for 3 s ('Added Angelfish', or "Finsical can't use “notes.txt”. Drop an AquaZone .fsh pack, a .azpack folder or a sound file."). Expose `showMessage(text)` on the mountImportPanel return object and use it in addons.ts ('Added N sounds.', 'Nothing to import: that file has no sounds. Drop fish packs on the tank window.', "Couldn't save the sounds."). Optional: forward dropped pack files to the tank (packPut under `drop:{name}` and `{op: 'importDropped', key}`). Tests: Playwright synthetic drop of a .txt shows the caption; a 4-byte bogus file on addons.html shows the status text.

### U-11 **Overview rows reshuffle under the pointer when sorted by Status**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/overviewmodel.ts:44-47` (STATES; 'Turning' at :46), `web/overviewmodel.ts:89-96` (sortItems compares text at :94), `web/overview.ts:161-200`, `core/sim.ts:126` (TURN_TICKS 10).

What: Status text includes transient states ('Turning' ~10 ticks, 'Startled' ~1 s), so each 2 s heartbeat can reorder rows (12 order changes in 30 s with 4 fish). Selection follows the key, so Remove removes the right fish, but a click can land on a row that just moved.

Proposal: Map `turn` to 'Swimming'. Sort Status by `hungerRank*10 + stateRank` (hungry 0, peckish 1, full 2), then name, instead of text. Optionally defer structure-changing re-sorts while `listEl.matches(':hover')` and flush on pointerleave. Test (overviewmodel.test.ts): fish differing only in turn/drift keep their order; hungry sort before full.

### U-12 **Client windows never say when the tank is not connected**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/addons.ts:15-19`, `web/import.ts:841-851` (15 s timeout), `web/overview.ts:106-118`, `web/overview.ts:161-166`, `web/stats.ts:92-107`.

What: With no tank (browser dev, tank tab closed or reloading), Add to Tank spins 15 s before 'No response from the tank', Overview's Remove posts into the void, Stats shows stale numbers as live, and Overview is blank before the first push. The native tank lives as long as the app, so this is mostly browser-side.

Proposal: Each page records `lastStateAt` in its state handler and checks `Date.now() - lastStateAt < 6000` every second. Overview: placard 'Waiting for the tank…' and Remove disabled while disconnected. Stats: .osm-disabled look on #srows plus a 'Waiting for the tank…' care line. Import: `PanelOptions.connected?: () => boolean`; addIt shows "The tank isn't running." immediately instead of posting. Tests: Playwright with no tank, Add shows the message at once; after closing the tank, Stats shows 'Waiting…' within 7 s.

### U-13 **Preferences: CRT controls stay clickable when WebGL is unavailable**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/prefs.ts:171-181` (state handler), `web/prefs.ts:233`, `web/prefs.ts:426-442` (syncEnabled), `web/prefs.ts:446-459`, `web/prefs.html:28-35`, `web/app.css:91`.

What: With `crt.available === false` the warning shows but 'Simulate a CRT monitor' stays enabled (a click checks it, then the echo unchecks it), Defaults stays enabled while every slider it resets is dimmed, and the footer still says to turn the effect on.

Proposal: In the state handler `setEnabled(onBox, crt.available !== false)`; in syncEnabled `defaultsBtn.disabled = !onBox.checked`; while unavailable, describe(null) shows "This Mac can't show the CRT effect. Settings are kept." instead of the pane's offHint. Test: Chromium with --disable-webgl at 565x457; checkbox and Defaults disabled.

### U-14 **The browser build has no menu bar: Preferences and Overview are reachable only by URL**
Severity: low · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:802-868` (only Ctrl/Cmd-I, F, C, S; stats tab logic at :835-866), `web/index.html:12-24`, `web/app.css:10-15`, `node_modules/osmium-ui/src/menubar.ts:53-54` (mountMenuBar, unused), `macos/Finsical.swift:543-609`.

What: Desktop browsers show no controls; shortcuts are undocumented; prefs.html and overview.html must be typed. On touch the only control is a tiny 'Add-ons…' button, so an iPad cannot remove fish, change the machine or open stats. The README ships a Mac app and there is no hosted build yet (T-29), so this is secondary.

Proposal: When `!inNativeShell()` and hover is available, mount Osmium's mountMenuBar in a new `#menubar`: a fish-glyph menu in the Apple slot (original art, not Apple's logo) with About This Aquarium… and Show Balloons; File: Import Add-ons… (Ctrl-I), Save Picture…; Edit: Copy Picture; Tank: Feed Fish (F), Tank Overview, Tank Stats (S), Preferences…, CRT Effect with checkmark (C), Degauss. A Mac OS 8 menu-bar clock at the right in Charcoal 12 ('3:42 PM'; a click toggles the date). Factor the stats-tab logic into `openClientTab(page, name)` and reuse it. Offset #machine by 20 px (`top: 20px`); layoutMachine reads clientWidth/Height and adapts. Keep the menu table in a pure module shared with the keydown handler. Touch keeps #opentrigger or uses the sticky menus. Tests: every key equivalent maps to exactly one action; Playwright: Tank > Tank Overview opens a tab that receives state; arrow keys walk the menus.

### U-15 **Control-click on the tank shows WebKit's generic menu (with Reload) instead of a Mac OS 8 contextual menu**
Severity: low · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:100-111` (the pointer handler lets Control-click through as button 0), `web/main.ts:776-788`, `macos/Finsical.swift:467-527`.

What: No contextmenu handling exists. WKWebView's default menu offers Reload, which restarts the tank page, and a Control-click today both feeds or taps and opens that menu. Contextual menus arrived with Mac OS 8.

Proposal: Native: in B-26's TankWebView override `willOpenMenu(_ menu: NSMenu, with event: NSEvent)`: `menu.removeAllItems()`, then Feed Fish, CRT Effect (checkmark from cached crtOn), Sound (F-05), Machine > submenu (from a `machines: [{id, name}]` list the tank adds to postState; choosing one evaluates `window.__bus({op: 'machine', id})`), Tank Stats, Preferences…, targeting existing actions. Web: return early from pointerdown when `e.ctrlKey && navigator.platform.startsWith('Mac')`; browser fallback: `web/contextmenu.ts` `openContextMenu(x, y, entries)` rendering an `.osm-menu` list (Osmium has no standalone menu renderer; better upstreamed), with Feed Fish Here (mapped x), Tap the Glass, window items. Tests: Playwright right-click shows the menu and Feed Fish Here adds a pellet near that x; manual native check that Control-click switches the case.

### U-16 **Always-on-top and show-on-every-Space are hard-coded**
Severity: low · Effort: S · Value: 3/5 · Risk: 2/5

Where: `macos/Finsical.swift:500-501`, `macos/Finsical.swift:542`, `PLAN.md:57`.

What: The tank is always `.floating` with `[.canJoinAllSpaces, .fullScreenAuxiliary]`: it covers other apps' windows and dialogs, follows every Space, sits over full-screen video, and is never occluded (so never throttled). Floating is the intended default (PLAN.md), so the gap is the missing option.

Proposal: Window menu items with checkmarks, persisted in UserDefaults: 'Float Above Other Windows' (`FinsicalFloat`, default true) and 'Show on All Desktops' (`FinsicalAllSpaces`, default true). `applyWindowPrefs()`: `window.level = float ? .floating : .normal`; `window.collectionBehavior = allSpaces ? [.canJoinAllSpaces, .fullScreenAuxiliary] : [.managed, .participatesInCycle]`; update open client windows' level (B-05). Replace lines 500-501 with a call from applicationDidFinishLaunching; checkmarks via validateMenuItem. Manual test: toggles persist across relaunch; with float off a Safari window can cover the tank. Richer modes are F-28.

### U-17 **Client windows stay on the Space where they were first opened**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `node_modules/osmium-ui/macos/OsmiumWindows.swift:242` (show), `node_modules/osmium-ui/macos/OsmiumWindows.swift:266-284`, `macos/Finsical.swift:501`, `macos/Finsical.swift:118-121`.

What: The tank joins all Spaces, but client windows are `.managed`: open Preferences on Space 1, switch to Space 2, press Cmd-, and macOS jumps back to Space 1; from a full-screen Space, opening Stats leaves full screen.

Proposal: In B-05's showClient set `hw.window?.collectionBehavior = [.moveToActiveSpace, .fullScreenAuxiliary]` before makeKeyAndOrderFront (hw.window is public; no upstream change needed; optional upstream spec field later). Manual test: Preferences comes to the current Space without switching.

### U-18 **On the Bare tank the invisible 22-pt drag strip covers the feeding zone**
Severity: low · Effort: S · Value: 3/5 · Risk: 2/5

Where: `macos/Finsical.swift:58-67` (DragStrip), `macos/Finsical.swift:513-521` (22-pt constraints), `macos/Finsical.swift:145`, `web/main.ts:99-111` (feed band y < 15%), `web/main.ts:778-788`, `web/machines.ts:172-178`.

What: For image cases the strip sits on bezel and is redundant (case presses already post dragWindow). For Bare (320x200, no case) it sits on the water: at 640x400 it covers 22 of the 60-pt feed band, and at the 90-pt minimum height the whole 13.5-pt band, so food can only be dropped with F. It also shows an arrow over a `cursor: grab` page.

Proposal: Keep a reference and set `strip.isHidden = id != "bare"`; shrink the Bare strip to 8 pt or show it only while Cmd is held. In the canvas pointerdown handler first: `if (e.metaKey && e.pointerType === 'mouse') { e.preventDefault(); bus.post({op: 'dragWindow'}); return; }` so Cmd-drag moves the tank in any mode. Optional retro follow-up: an Osmium floating-windoid title bar for Bare, with the window 11 pt taller. Manual test: Bare at minimum size, clicking the top rows drops food and Cmd-drag moves the window.

### U-19 **Cmd-W on the tank quits the app immediately**
Severity: low · Effort: S · Value: 3/5 · Risk: 1/5

Where: `macos/Finsical.swift:407-410` (windowWillClose terminates), `macos/Finsical.swift:489-490` (styleMask), `macos/Finsical.swift:589-596` (Window > Close targets the key window), `macos/Finsical.swift:529`.

What: The tank is key right after a click on the glass, so Cmd-W meant for Preferences quits the whole toy with no confirmation (and, today, no save hook; B-41).

Proposal: Simplest: remove `.closable` from the tank's styleMask (its close button is already hidden) so Cmd-W beeps on the tank and still closes client windows; update the comment at :589-593. Alternative: `windowShouldClose` returns false and calls `orderOut(nil)`; `applicationShouldHandleReopen` calls makeKeyAndOrderFront; `applicationShouldTerminateAfterLastWindowClosed` returns false. Manual test: click the glass, Cmd-W, the app keeps running.

### U-20 **Accessibility: the aquarium has no accessible name, and reduced motion is ignored**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/index.html:16-21` (canvas#tank unlabeled, svg#shell role=presentation), `web/main.ts:78-95` (saveTank every 10 s), `web/crt.ts:131-133` (9.7 Hz flicker term), `web/main.ts:657-704`, `macos/Finsical.swift:164-166`, `node_modules/osmium-ui/macos/OsmiumWindows.swift:370`, `:407`, `:410`.

What: VoiceOver finds an unlabeled web area and canvas. Nothing reacts to prefers-reduced-motion or prefers-contrast; case-swap and Osmium zoom/shade animations always run. The CRT flicker modulates brightness at ~9.7 Hz but only +/-1.5% at the default 0.30 (far below WCAG 2.3.1's threshold) and the CRT is off by default, so reduced motion is a courtesy. Installs and hunger changes are never announced.

Proposal: Give canvas#tank `role="img"` and `aria-label="Aquarium"`, updated in saveTank from a pure statsmodel helper ('Aquarium: 6 fish, 1 hungry, water 92%. Press F to feed.') with a vitest. A visually hidden `aria-live="polite"` element announces 'Angelfish added' and 'Fish are hungry'. When `matchMedia('(prefers-reduced-motion: reduce)')` matches, call `crt.configure({...crtCfg, flicker: 0, grain: 0})` without persisting, and listen for changes (Playwright `emulateMedia({reducedMotion: 'reduce'})` gives flicker 0). Native: `animate: !NSWorkspace.shared.accessibilityDisplayShouldReduceMotion` at Finsical.swift:166 and upstream in osmium-ui. window.title is already 'Finsical'.

### U-21 **Plant and accessory names show as cryptic 8.3 file stems although the packs carry real names**
Severity: low · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/import.ts:261-270`, `web/import.ts:684-686`, `web/import.ts:784-787`, `core/data/fsh.ts:42-54`, `core/data/fsh.ts:167-175`.

What: JPN Plants lists 90 DOS stems ('APONOGET', 'GLOSSOSL', 'Corksc_M', 'Kingyo_S', 'NUPHRJPN', 'TOOTHCUP') and L/M/S or 1/2/3 families. The packs hold a text-header resource (PlTH; the trailer type table also lists PlTI, PlPH, PlPI, PlVe, PLPC, PLDP) with a Shift-JIS Pascal Str31 common name at 0 ('バナナプラント'), an ASCII Pascal Str31 Latin name at 32 ('Nymphoides aquatica'), and Shift-JIS description text from 104; a second chunk sometimes has an English name ('Hair grass1'). Accessories have AccH (layout unverified). Fish use FsTH (F-02).

Proposal: Add one generic `packInfo(d): { name?, latin?, blurb? } | null` in fsh.ts shared with F-02: find the xxTH chunk via F-01's type table, or take the first non-BMP chunk >= 600 B whose byte 32 is a plausible Pascal length; decode Str31@0 as shift_jis, Str31@32 as latin1, bytes 104.. as shift_jis up to NUL. importAddon puts it on PackResult; the detail pane shows 'Banana Plant, Nymphoides aquatica' plus the description; after the thumbnail pass, rows switch their label to the Latin name, cached with the thumb in IDB as `info:{url}`. Suffix fallback before fetch: `/_?([LMS])$/i` -> ' (Large/Medium/Small)'. Tests: fsh.test.ts fixtures built from these byte layouts.

### U-22 **Firefox may ask for persistent-storage permission at launch, before the user does anything**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/store.ts:31-36` and `web/store.ts:69-75` (persist() in openDb's onsuccess), `web/main.ts:891-899`.

What: openDb calls `navigator.storage.persist()` on the first IDB use, which happens at every launch through sndsGet and the restore, with no gesture. Firefox answers with a permission doorhanger (once; the decision is remembered). Chromium and WebKit decide silently. Not verified in Firefox.

Proposal: Export `requestPersistence()` from store.ts, called from recordInstall on the first user-initiated (live) install; skip when `await navigator.storage.persisted()` is true or inNativeShell(). Test: stub navigator.storage in vitest and assert persist() is not called during openDb.

### U-23 **Tank Stats wording and bounds nits**
Severity: nit · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/stats.ts:75-79`, `web/stats.ts:112-116` (grow min {300, 60}), `web/statsmodel.ts:45` (HUNGER_STARVING), `web/statsmodel.ts:89`, `web/statsmodel.ts:106-108`, `web/statsmodel.ts:115-118`, `web/statsmodel.ts:121-125`, `macos/Finsical.swift:100-104` (native min 300x250), `macos/Finsical.swift:564`.

What: 'Hungriest: Fish, full' shows when nobody is hungry (reads like an alarm). The Fish line can read '5 (2 seeking food) (1 startled)'. The care line says 'is starving' (>= 0.85) while Hungriest says 'hungry' (no 'starving' band). Advice says 'the Add-ons importer' but the menu reads 'Import Add-ons…'. Uptime reads '49h 3m'. The browser grow minimum of 60 px contradicts the native 250 that keeps all fields and two wrapped hints visible.

Proposal: Show 'Hungriest: -' (or blank) when `hungriest.hunger < 0.33`. Join counts with commas: `${n} (${[seeking && `${seeking} seeking food`, startled && `${startled} startled`].filter(Boolean).join(', ')})`. Add a 'starving' band (>= 0.85) to hungerLabel and update overviewmodel.test.ts and statsmodel.test.ts together (it changes Overview text and its Status sort). Advice: 'choose Import Add-ons… in the Tank menu'. Uptime '2d 1h' past 24 h. Browser grow min {w: 300, h: 250}; keep the native minimum (an earlier idea to shrink it to 200 would clip the worst case); optionally lower the native default to ~360x260 after checking 4 wrapped hint lines fit.

### U-24 **Idea: a download progress bar with Stop in the add-on detail pane**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/import.ts:787`, `web/import.ts:1136`, `web/import.ts:115-131`, `web/stats.ts:35-47`, `node_modules/osmium-ui/osmium.css:196-222`.

What: 'Fetching add-on…' stays static while zips of up to 5.6 MB download, with no progress and no cancel. Osmium ships a determinate `.osm-progress` (used by Stats) but no indeterminate barber pole.

Proposal: Build on B-42's fetchWithTimeout: add `onProgress(loaded, total | null)`. showDetail inserts an .osm-progress under the status and sets `--osm-value` to loaded/total, or a striped indeterminate class (local CSS in app.css, Mac OS 8 barber pole) when Content-Length is missing. A 'Stop' push button aborts, which rejects, deletes the memo and shows 'Stopped.' with Try Again. Reuse it for the listing with per-collection progress (P-05).

## Aesthetics and Mac OS 8 fidelity

### A-01 **Living water: wobbling bubbles that grow and pop, a shimmering surface, caustics and sun shafts**
Severity: idea · Effort: S · Value: 4/5 · Risk: 1/5

Where: `core/sim.ts:73` (SURFACE, not exported), `core/sim.ts:240-245` (bubbles rise straight at 0.8/tick), `core/sim.ts:367-370` (spawn at f.x + facing*6), `web/main.ts:1078-1084`, `web/main.ts:1093-1105` (2x2 #cfe8ff squares).

What: Bubbles are identical 2x2 squares from mid-body that rise in straight lines and vanish on light backdrops; nothing draws the surface or any light.

Proposal: Render-only (the sim stays untouched apart from exporting SURFACE and B-01's mouth offset for spawns). Bubble x offset `sin((b.y + b.x*7)*0.2)*0.6`; size 1 px below y 140, 2 px mid, 3-4 px near the top, drawn as a ring with a dark #2a4a70 outline and a white highlight pixel; a one-frame pop ring on a bubble's final frame (when `b.y - 0.8 <= SURFACE`). A 1-px surface line at SURFACE (alpha 0.25) with a highlight moving along it (two summed sines of tickCount). Caustics: a 64x16 tile (thresholded sum of three sines) precomputed once, drawn over the gravel with `globalCompositeOperation = 'lighter'` at alpha 0.12*light, offset by tickCount*0.3. Sun shafts: three slanted quads, alpha 0.04*light, swaying over a minute. Scale all alphas by light; skip in Black & White depth (A-02). Preference 'Animated water' (default on). Test: sim.test that a bubble from a fish with halfW=40 facing right spawns at x >= f.x+30.

### A-02 **Colors: Black & White to Millions, like Monitors & Sound (1-bit Mac Plus, LCD look for the G4)**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:26-28` (context creation), `web/main.ts:1130-1142`, `web/prefs.ts:98-131`, `web/crt.ts:24-145`, `web/machines.ts:62-71`, `web/machines.ts:161-170`.

What: A Mac Plus showing 256-colour fish is anachronistic, and a CRT effect on the iMac G4's LCD is wrong. A prototype Atkinson dither of the live 320x200 frame (gamma lift pow(l, 0.6)) costs ~1 ms per frame and reads clearly, but error diffusion crawls as fish move.

Proposal: New `web/depth.ts` `quantize(imageData, depth)`: 'bw' with a 4x4 or 8x8 Bayer threshold (stable under motion), plus 'bw-diffused' (Atkinson with the gamma lift; check a screen recording first); 'gray4'/'gray16' quantize luminance with Bayer; '256' maps to the classic Mac 8-bit system palette (6x6x6 cube plus ramps) with Bayer; 'millions' is a no-op. Create the 2D context with `{willReadFrequently: true}` and apply quantize after render() and before crt.render(). Prefs Monitor pane: a 'Colors:' list (Monitors & Sound style) whose caption notes 'The Macintosh Plus had a black-and-white screen.'; bus op 'depth'; persist `finsical:depth`; never change depth automatically on machine choice. Optional per-machine 'lcd' display for the G4: faint pixel grid and slight ghosting blend with the previous frame. Tests (depth.test.ts): bw outputs only 0/255; a flat 50% grey gives ~50% white; '256' outputs only palette colours.

### A-03 **Highlight color that matches the chosen iMac case**
Severity: idea · Effort: M · Value: 2/5 · Risk: 3/5

Where: `node_modules/osmium-ui/osmium.css:487-491` (menu items), `node_modules/osmium-ui/osmium.css:544-549` (menubar titles), `node_modules/osmium-ui/osmium.css:755-760` (focus rings), `web/machines.ts:27-45`.

What: Choosing Strawberry or Bondi changes only the tank frame; Osmium hard-codes #6666cc/#333399/#000088 and exposes no variables. List selections are black and white (not lavender) and the progress fill is a sprite, so CSS variables alone cannot recolour everything. Mac OS 8.5 Appearance had Accent colours.

Proposal: In osmium-ui first: add `--osm-accent-light`, `--osm-accent`, `--osm-accent-dark` (defaults = today's values, pixel-exact) for menu, menubar and focus-ring rules, plus `setAccent(palette)` re-registering the progress-fill sprites with recoloured palette entries; cut a tag and bump the pin. Finsical: optional `accent?: [light, mid, dark]` on Machine (Bondi #7fd1d6/#0f9aa6/#006070, Strawberry #ff8f9a/#d6283e/#7a0018), sent in postState and applied on :root by each client page behind a Prefs pop-up 'Accent color: Lavender / Match the case'. Leave list highlights black and white; check white-on-mid contrast. Low priority.

### A-04 **'About This Aquarium…' in the style of Mac OS 8's About This Computer**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `macos/Finsical.swift:87-104` (window specs), `macos/Finsical.swift:543-554`, `web/main.ts:385-419`, `web/main.ts:428-504`, `web/import.ts:97` (Importable has no byte size).

What: The app has no About item at all, and nothing shows the version or what the tank caches. Mac OS 8's About This Computer (machine icon, Built-in Memory, a bar per running app) maps nicely onto an aquarium and doubles as a performance readout for P-01/P-03.

Proposal: New about.html/about.ts (hostWindow, osm-info; bundled like stats.ts in package.json and the Makefile copy list; `host.add(OsmiumWindowSpec(url: page("about.html"), title: "About Finsical", frameKey: "FinsicalAbout", size: NSSize(width: 420, height: 260)))`; first item in the app menu). Header: the current machine's name and a small case preview (shellMarkup), 'Built-in Memory: 320 x 200 pixels', water, and 'Largest Unused Block: N% of the tank'. Rows sorted by size like the original: thumbnail (wantThumbs), fish name (F-02), size such as '1,136K' (record the pack byte length on installedAddons in remoteInstall/applyPack; old saves show '-'), and a Platinum bar filled to 1 - hunger. Optional footer bars from page-tracked byte counts (fish sheets, scenery canvases, decoded audio, IDB cache) plus fps and the worst frame in 60 s, answered via op 'perf' only while open (performance.memory is Chromium-only). Version via esbuild `--define` (T-15). Credits per T-03. Test: pure aboutmodel.ts (sorting, K formatting with thousands separators, bar clamp).

### A-05 **Balloon Help for the tank, fish, case and client windows**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/prefs.ts:194-217` (caption area already imitates Balloon Help), `web/main.ts:100-111`, `web/main.ts:1031-1044`, `macos/Finsical.swift:543-609`.

What: Nothing explains the feed and tap zones, the draggable case, resizable edges or the F/C/S keys. Help > Show Balloons is iconic System 7/8.

Proposal: New `web/balloon.ts`: `showBalloon(anchor: DOMRect, text)` (white rounded rect r=10, 1 px black, a triangular tail toward the anchor, Geneva 10, max width 200 px) placed by a pure `balloonPlacement(anchor, viewport, size)`; hideBalloon(). drawFish records each fish's screen rect per frame into a module-level array (shared with D-14 and D-02). With balloons on, pointermove hit-tests fish ('Scott, Angelfish. Full.'), decor (add-on name), zones ('Click here to sprinkle food. Hungry fish swim up to eat.' / 'Click the glass to tap it. Nearby fish dart away.'), the case ('Drag the case to move the tank.') and D-04 hotspots. Toggle: native Help menu 'Show Balloons'/'Hide Balloons' calling `window.finsical.setBalloons(on)` (U-05); browser: '?' key or U-14's menu; persisted as `finsical:balloons`; on automatically for the first 60 s of a first run. Client pages opt in with `data-balloon`. Tests: balloonPlacement flips at viewport edges; Playwright hovering each zone shows the expected text.

### A-06 **The app icon is a full-bleed square with no alpha**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `macos/Makefile:56` (comment claims macOS masks it), `macos/Makefile:61-71`, `media-sources/icon-finsical.png` (1254x1254 RGB, opaque corners).

What: macOS 11-15 do not mask third-party .icns art, so the icon shows as a hard-cornered square bigger than neighbouring Dock icons (Apple's grid is an 824-pt rounded rect inside 1024); macOS 26 puts non-conforming icons on a grey plate.

Proposal: Commit a pre-masked `media-sources/icon-finsical-1024.png` (art clipped to an 824x824 rounded rect, radius ~185, centred with a 100-px margin and a soft drop shadow), generated once by a hand-run `tools/make-icon.swift`; point ICON_SRC at it and fix the comment. Retro bonus: hand-pixelled 16x16 and 32x32 Mac OS 8-style icons for the small iconset slots.

### A-07 **Disabled Osmium sliders keep full-contrast tick marks**
Severity: nit · Effort: S · Value: 1/5 · Risk: 1/5

Where: `node_modules/osmium-ui/osmium.css:330-334` (::after tick sprite), `node_modules/osmium-ui/osmium.css:359-368`.

What: With the CRT off, slider tracks and thumbs dim but the tick sprite stays black and white; Mac OS 8 dims the whole control.

Proposal: Upstream in L-K-M/osmium-ui: a dimmed tick sprite for `.osm-inactive .osm-slider::after` and `.osm-slider.osm-disabled::after`, then bump the dependency.

## Missing features (AquaZone fidelity)

### F-01 **Parse the pack trailer as a resource map (types, ids, names) instead of sniffing chunks**
Severity: idea · Effort: M · Value: 5/5 · Risk: 2/5

Where: `core/data/fsh.ts:3`, `core/data/fsh.ts:42-54` (packChunks), `core/data/fsh.ts:148-175` (fshToSheets, packImages), `tools/az/pack.py:58` (Pack.tag), `tools/az/pack.py:73-90` (byte-scan for 12-byte records, no types), `tools/az/emit.py:55` (manifest has no type).

What: The trailer at u32@4 is a little-endian Mac resource map, and most features below depend on it. Layout, verified on 99 of 101 downloaded packs (fish, eggs, 24 foods, 11 meds, gravel, plants, 34 accessories, 3 .azn, aquazone.rez, gp*.rez): map = u32@4; map+26 u16 name-list offset; map+28 u16 typeCount-1; map+30 8-byte type entries {tag[4] stored byte-reversed ('IgrD' is DrgI), u16 count-1, u16 refListOffset relative to map+30}; each ref 12 bytes {u16 id, u16 nameOffset (0xFFFF none; Pascal string at map+nameListOffset+nameOffset), u32 dataOffset (low 24 bits) relative to 0x100, pointing at u32 length + payload}. The header tag at 0x10 (byte-reversed) names the pack kind: AqFd food, AqDr medicine, AqGr gravel, AqPl plant, AqAc accessory, Aqua tank, AqZn base, XXXX fish; gp*.rez carries zero. Exceptions: SCEPTER.ACC ('Version 2.0 Resource File', 10-byte type entries) and ERAWAN.ACC (78-byte refs), whose type counts still sum to the chunk count in type order; eden.azn has one orphan chunk. Real types: FsTI, FsTH, PrF#, AMV#, BMV#, ELRA, ELRB, EGPC, EGPP, FADP, FBDP, SuS#, FsT2, FsT3, FshI, FshH, FsI3, EggI, EggH (fish); Fd_I, Fd_H, FDPC, FDDP (food); DrgI, DrgH, DRDP (medicine); AccI, AccH, ACPC, ACDP; PlTI, PlTH, PlPI, PlPH, PLPC, PLDP; AQUA, Watr, HtrI, FltI, Ligt, FdFd, Grvl, BAPC, BADP (tanks). No code reads types today.

Proposal: New `core/data/rsrc.ts`: `packResources(d): {type, id, name, payload}[]`, `byType(type)`, and `packKind(d)` (null for unknown or zero tags, never throws). Validate that every ref offset lands on a packChunks boundary; otherwise assign types sequentially from the type-list counts when their sum equals the chunk count; otherwise fall back to today's heuristics. Rebuild fshToSheets/packImages on top and return type and id with each sheet or image. Mirror in `tools/az/pack.py` (Pack.resources) and write 'type' and 'id' into each emit.py chunk record. Tests: rsrc.test.ts with a synthetic 2-type map plus name list, the 10-byte-entry variant, an orphan chunk, and a fixture shaped like clownfish.fsh (AMV#/BMV#/ELRA/ELRB/FsTH named 'Adult Idle' etc.); tools/tests/test_pack.py equivalents.

### F-02 **Real species names, individual fish names, sex, hatch dates and a Get Info window**
Severity: idea · Effort: M · Value: 5/5 · Risk: 3/5

Where: `core/data/fsh.ts:42-54`, `core/sim.ts:10-57` (Fish has no name/sex), `web/import.ts:318-324`, `web/import.ts:346-365`, `web/import.ts:784-787` (detail text), `web/main.ts:78-95` (saveTank whitelist at :83-89), `web/main.ts:138-150` (spawnFish species = it.inner), `web/main.ts:385-401`, `web/overviewmodel.ts:61-71`, `web/overview.ts:95-99`, `node_modules/osmium-ui/src/controls.ts:752`.

What: Overview lists 'clownfish', 'comet', 'disc addon3': archive file names. Every fish pack carries AquaZone's species card and a roster of named individuals. FsTH (1128-byte chunk): Pascal strings at 0x00 common name (max 32), 0x21 scientific, 0x42 family, 0x142 habitat, a label at 0x246 ('Description:' or '概説'), and a NUL-terminated CRLF C string at 0x268 (e.g. 'Water Temperature: 24-28°C ... The Angelfish prefers meaty foods'). English packs keep template placeholders ('#Genre', '#Habitat'). Individuals: adjacent 464-byte (sex byte @0x104 'M'/'F', u32 LE Mac-epoch hatch time @0x106) and 1134-byte (Pascal name @0, breeder @0x122, parents and tank for bred fish) chunks. angels yields Scott (M, 1997-09-24), Robert, Samantha, Amy, Melissa from 'Franks Fish Farms'; all 58 cached fish packs have a card and plausible individuals, 9 with person names. Encoding: Western cards are Windows-1252 (a naive fatal Shift-JIS decode wrongly succeeds on them), JPN cards Shift-JIS ('金魚', 'Carassius auratus var.', 'コイ科'). The original had Fish Name, Individual Info, Species Info and Personal Note windows.

Proposal: (1) fsh.ts: `packSpecies(d): SpeciesCard | null` and `packIndividuals(d): {name, sex?, born?, breeder?}[]` (born = `(t - 2082844800)*1000` ms, formatted with timeZone 'UTC'; drop dates outside 1990-2010). Deduplicate by name+born, keep first-seen order (angels repeats 5 individuals ~60 times). Breeder fields that look like paths (`/^[A-Za-z]:\\|\\/`, e.g. banggai's '…\Copy of flower frame tank.azn') show as 'Bred in <basename>' or are omitted. Names shorter than 3 chars or pure codes ('F', '01') count as unnamed and fall back to '<Common name> <n>'. Treat values starting with '#' or equal to their label as empty. `decodeText(bytes)`: Shift-JIS only if the fatal decode succeeds and the result contains U+3040-U+9FFF, else windows-1252 (or 'macintosh' when a Mac Roman heuristic fits); normalize CRLF. Share the reader with U-21. (2) PackResult gains species/individuals, passed through ImportHandlers.onSheets so restores carry them. (3) Fish gains optional name, sex, born, comment, in the saveTank whitelist. spawnFish takes the next unused individual of the pack (first install Scott, Add Again Robert); when a pack runs out (clownfish has 2), generate a seeded name and alternate sex; old saves get a seeded default. (4) FishSnap/itemsOf: Name = individual name, Kind = common name, optional Sex column. (5) Double-click in Overview (mountList onOpen) or Cmd-I posts `{op: 'wantInfo', id}`; a new info.html Get Info window (Osmium .osm-info, OsmiumWindowSpec in Finsical.swift, window.open in the browser) shows the 83x83 FADP portrait, editable Name (bus op 'renameFish', max 31 chars), Kind (italic Latin), Family, Habitat, Sex, Hatched (`Intl.DateTimeFormat` dateStyle 'full', UTC), Breeder, keeping notes, description and a Comments box persisted on the fish. (6) Import detail pane shows common/scientific name and the first description lines, and FADP as the preview when present. Tests (fsh.test.ts, synthetic chunks): offsets, NUL-truncated Pascal overflow, the 1252-vs-SJIS decision, dedupe, path-breeder filter, short-code fallback, UTC date; overviewmodel.test.ts Name/Kind columns.

### F-03 **Animate plants and accessories with the frames the packs already ship**
Severity: idea · Effort: S · Value: 5/5 · Risk: 2/5

Where: `core/data/decor.ts:35-50` (pickDecorArt keeps one image; its header comment calls the others 'animation frames'), `web/main.ts:198-218` (decors hold one canvas), `web/main.ts:455-474` (addonThumb), `web/main.ts:1085-1091` (static draw), `core/data/decor.test.ts`.

What: 87 of 378 accessory packs and 29 of 93 plant packs contain a group of >= 3 same-size, same-key frames, 10 in most: swaying Banana_M (10 x 220x120), Pearl3, Riccia2, Hollandm; bubble plumes Bub_L_01..06 (10 x 80x675) and Bub_S; Robobot's rotating head (10 x 65x141), BUGDANCE's walking robot, Meka Sphere, a pendulum clock (10 x 190x281), a submarine (8 x 400x174), a jellyfish, a toad, Moon Laser. AccI u16@10 equals the frame count and byte 7 is 1 exactly when animated (verified on 34 accessories). 106 of 111 loops are cyclic (last-to-first step about the size of a normal step), so a linear loop is right. None animate today.

Proposal: Uses B-22's `pickDecorFrames(images)`. addDecor builds one canvas per frame, all scaled with the s computed from frame 0 (V-02), and stores `{ frames: HTMLCanvasElement[]; pack; phase }` with a per-item phase from a URL hash so identical plants do not sway in lockstep. render() draws `d.frames[Math.floor(sim.tickCount / DECOR_TICKS_PER_FRAME + d.phase) % d.frames.length]` with DECOR_TICKS_PER_FRAME = 3 (10 fps on the sim clock, so pause and speed apply; packs carry a 2-byte blob such as 0x96/0xa8 that may be timing, so document the constant as a guess). addonThumb and previews use frames[0]; removeAddon needs no change. Cap at 16 frames and skip animation for frames larger than 256x512 after scaling (memory is small: Bub_L scales to 14x160). After F-01, frames = ACPC ids base..base+AccI.u16@10-1. Optional ping-pong for plants if a seam shows. Tests: decor.test.ts (10 equal 80x80 key-0 frames plus an 83x83 thumbnail return 10 frames in order; single-image fallback); a pure `decorFrame(tick, n, ticksPerFrame)`; screenshot check that the Bub_L plume moves.

### F-04 **Let users arrange decorations: placement, depth, drag, persisted positions**
Severity: medium · Effort: M · Value: 4/5 · Risk: 3/5

Where: `web/main.ts:198-218`, `web/main.ts:1085-1091` (x = W*(i+0.5)/n, y = H-6-h, no clamp), `web/main.ts:1100` (all decor before fish), `web/main.ts:36-44`, `web/main.ts:78-95`, `web/main.ts:100-111`.

What: Decor is re-spaced evenly on every add or removal, on one baseline, never clamped (with 5 items MOAI is centred at x=288 and clipped at 335), always behind every fish, and cannot be moved. Adding a plant moves all the others. The original had an Aquarium Layout editor using the packs' top views, and its AccI/PlPI records store x, y and depth. A goldfish-bowl preset label even says 'please place this at the very front'.

Proposal: Persist `SavedTank.decor` as an ordered array `[{url, x, depth}]`, one entry per placed item (duplicates allowed, which also fixes B-21), with installedAddons staying the fetch list. Default position: the pack's PlPI tail when present (B-23), else a pure `placeDecor(existing: {x, w}[], w, tankW, seed)` returning the centre of the widest free gap, clamped so the item stays within [0, tankW] (seeded x when there is no room). Draw sorted by depth with the base at `floorY + 4 - depth*12` (V-04); items with depth > 0.8 draw after the fish. Interaction: Option-drag on #tank (an `e.altKey` branch before the tap in pointerdown) hit-tests decor through an alpha mask kept with each canvas, moves it with a Finder-style dotted outline, and saves on pointerup; or a Tank > 'Arrange Decorations' mode where clicks do not feed or tap. Tests: placeDecor never overlaps when the widths fit and never returns an out-of-bounds extent; `decorHit` returns the topmost item under a pixel; two copies of one accessory survive save and load.

### F-05 **Volume, mute, a Sound preferences pane, and a jukebox for imported music**
Severity: medium · Effort: M · Value: 4/5 · Risk: 2/5

Where: `web/audio.ts:76-81` (playImported: 'the only trigger' for music), `web/audio.ts:99-126` (per-play GainNode straight to destination), `web/audio.ts:146-156`, `web/main.ts:343-358` (playImported on live install at :356), `web/main.ts:534-545`, `web/main.ts:1106-1108`, `web/prefs.ts:113-131` (PANES: machine/monitor/picture), `web/import.ts:84-89`, `macos/Finsical.swift:555-577`.

What: No master volume, no mute and no setting for bubbles or ambience anywhere (grep). The only Sounds add-on is the JPN bonus CD track 'Macinfish' (~205 s MP3): installing it plays the whole song at gain 0.8 with no stop, Add Again overlaps copies, and afterwards nothing can ever play it again (restores are silent). For an always-on desk toy with an ambient loop, a mute switch is basic.

Proposal: (1) TankAudio: one `master: GainNode` created lazily with the context, every play() routed through it; `setVolume(v)`, `setMuted(b)`, `setOptions({bubbles, ambient})`; one-shot sources tracked in a Set for `stopImported()`. (2) `tracks()` lists imported records matching none of drop/intowater/center/side/top/bottom/bubble/aqua (or `kind === 'music'`, B-19); `playTrack(name, loop)`/`stopTrack()` keep one track source (streamed per P-04). (3) Persist `finsical:sound` = {volume: 0.7, muted: false, bubbles: true, ambient: true} (try/catch), include it in the state push, bus ops soundConfig, playTrack, stopTrack. (4) Minimal UI first: double-clicking a Sound add-on row in Overview posts playTrack, status 'Playing'; native Tank > 'Mute Sound' Opt-Cmd-S with a checkmark; browser M key. (5) Then a 4th Preferences pane 'Sound' (32x32 speaker sprite) laid out like Monitors & Sound: Volume slider with 0-7 ticks, Mute, Bubble sounds, Water ambience, and a Music group listing tracks with Play/Stop and Loop in an AppleCD Audio Player style; optionally a separate 'Audio CD' window opened from D-04's CD slot. Tests: sanitizeSoundConfig like sanitizeCrtConfig; fake AudioContext: muted sets master.gain to 0, ambient=false stops startAmbient, tracks() filter, a new track stops the previous source.

### F-06 **Import AquaZone food packs: named foods, real particle sprites, species food preferences**
Severity: idea · Effort: M · Value: 3/5 · Risk: 3/5

Where: `core/sim.ts:59-65` (Food has no kind), `core/sim.ts:174-178`, `core/sim.ts:228-238`, `core/sim.ts:418-427`, `web/import.ts:65-89` (no food collection), `web/import.ts:90-93` (PACK_EXT/DIRECT_EXT lack fd), `web/import.ts:190-239`, `web/import.ts:462-471`, `web/main.ts:1093-1099`.

What: The default item has allfoodsandmeds.zip (125 KB): top-level inner zips meds.zip, foods.zip (12 .fd under foods/), foods2.zip (5), live_*.zip, beetles.zip, mosquito_larvae.zip. The JPN set has AQUAZONE ITEM/餌セット with ~20 more .fd, and fish add-ons carry .fd too (Goldfish Flake/Pellet, Pleco Food, Discus). Fd_H holds the name ('AZ Standard Flake Food', 'Live Bloodworms', 'Arowana Burgers') and dosing advice; Fd_I u16@0 is a food type indexing aquazone.rez STR# 7200 (1 Flake, 2 Powder, 3 Pellet, 4 Dry Worm, 5 Insect, 6 Dry Shrimp, 7 Hamburger, 8 Frozen Insect, 9 Frozen Shrimp, 10 Living Worm, 11 Living Insect, 12 Living Shrimp Egg, 13 Hyper-Capsule); FDPC are particle sprites (flake.fd 11x4..18x8 flakes; live daphnia 4 frames of 24x10). Each fish's PrF# lists accepted food types (cardinal and neon [1,2,4,5,7,8,9,10,11,12], no pellets). Finsical has one anonymous 3x3 yellow pellet.

Proposal: Import: add `fd|med` to PACK_EXT and DIRECT_EXT. Nested-mode collections `{section: 'food', outer: 'allfoodsandmeds.zip/foods.zip', exts: /\.fd$/i, deep: true}` and the same for foods2.zip; a new optional `Collection.innerMatch?: RegExp` for the default-mode listing of allfoodsandmeds.zip's other inner zips (live_*, beetles, mosquito_larvae; exclude meds.zip, foods.zip, foods2.zip); JPN `{section: 'food', item: JPN_ITEM, outer: JPN_ZIP, prefix: JPN_ROOT + '餌セット/', exts: /\.fd$/i}`. Add 'Food' to SECTION_TITLES and KIND_NAMES and a food route in handleImages (unknown sections are silently ignored today). Installing adds the food to a pantry (`SavedTank.foods`); Tank > Food submenu lists pantry foods with a check on the current one, and F and Feed Fish drop the current food. Sim: `dropFood(x, food)` with `enum FoodKind { Sinking, Floating, Live }` from the type code (flakes float ~4 s with x drift then sink at 0.15 px/tick; pellets 0.35; live food random-walks and never rots); nearestFood skips food a fish's PrF# does not accept (default accepts all). Render a seeded FDPC sprite per pellet (animated for live food, ART_SCALE). Tests: import.test.ts innerMatch excludes meds.zip; sim.test.ts: a fish accepting [1] ignores type-3 food, live food moves and does not settle, floating food stays at SURFACE >= 100 ticks.

### F-07 **Automatic feeder ('Fantastic Feeder') with spoonfuls, interval and limited supply**
Severity: idea · Effort: S · Value: 3/5 · Risk: 2/5

Where: `core/sim.ts:81-84` (hunger saturates in ~20 min), `core/sim.ts:174-178`, `web/main.ts:794-797`, `web/statsmodel.ts:45-47`, `web/statsmodel.ts:121-125`.

What: Fish seek food after ~8 minutes, read 'hungry' after ~13 and 'starving' after ~17, so a tank left open all day is permanently starving and only Stats says so. The original shipped an auto-feeder: the FdHd 'Fantastic Feeder' text says it drops a fixed amount at fixed intervals of tank time and that supply is limited; tanks carry an FdFd schedule record, and the FRMFOODTIMER window had 'Add Food ( spoonfuls ):', 'Next Feeding:', 'Interval:' and 'Remaining:'.

Proposal: `Sim.feeder = {enabled, nextTick, intervalTicks, spoonfuls 1-5, remaining}`; when due, tick() drops `spoonfuls` pellets spread over the middle 40% of the width, decrements remaining, schedules the next drop and emits 'fed' (F-13). Works with F-10 speed and F-09 catch-up. A simpler 'Automatic feeder' checkbox variant: a pure `autoFeedTarget(sim)` that every 900 ticks drops one pellet above a fish with hunger > 0.6 when no uneaten food exists. UI: Tank > 'Food Timer…' Mac OS 8 dialog ('Add food in [6] hours', 'Every [12] hours' with little arrows, 'Spoonfuls: [2]', 'Remaining: 18 spoonfuls [Refill]', 'Next feeding: 14:30', On checkbox); Stats shows the next feeding. Tests: interval 100 ticks and 2 spoonfuls drop exactly 2k pellets by tick 100k; remaining 0 stops drops; disabled drops nothing; autoFeedTarget unit tests.

### F-08 **Day and night that follow the Mac's clock (a light timer), with dawn and dusk tints and moonlight**
Severity: idea · Effort: S · Value: 4/5 · Risk: 1/5

Where: `core/sim.ts:128-129`, `core/sim.ts:199-203`, `web/main.ts:409`, `web/main.ts:1118-1123`, `web/statsmodel.ts:78`, `web/prefs.ts:113-131`.

What: The tank runs a 13.3-minute 'day' ~108 times a day, unrelated to the user's day. The original's 'Lovely Light' timer switched lights on a fixed schedule ('ON 14 hours, OFF 10 hours'; 'the next timer time shown is real time'), with Light Setup and Light Timer windows. Many people use a desk toy in the evening, so a real-clock tank would sit dark during typical use unless handled.

Proposal: Keep Sim tick-only and deterministic (do not inject a clock). New pure `core/light.ts`: `lightAt(minutesOfDay, schedule)` returning 0.3..1 with 30-minute smoothstep ramps, `schedule = {mode: 'timer' | 'always' | 'demo', on: '08:00', off: '22:00'}`; optional warm dawn/dusk tint `{r, g, b, a}`; `moonIllumination(date) = (1 - cos(2*PI*phase))/2` with `phase = ((date - 2000-01-06T18:14Z) / 29.530588853 d) mod 1`. main.ts `currentLight()`: demo returns sim.light, otherwise lightAt(local minutes); render and postState's `light` use it; D-01's night rest gets it via `sim.setLight(v)`. Clock-mode nights keep light >= 0.45 plus a faint moonbeam (slanted 40-px gradient, 'lighter', alpha 0.08*illumination) so evenings are not gloomy. Prefs (Machine pane or a Tank pane): 'Lights: (•) Timer, on at [08:00] off at [22:00]  ( ) Always on  ( ) Fast demo cycle', default demo until users opt in; bus op 'lighting', persisted `finsical:lighting`. Stats: 'Light: Night (on at 08:00)' or 'Night, waxing gibbous'. Tests (core/light.test.ts): 12:00 = 1, 03:00 = floor, 08:15 mid-ramp, an overnight schedule (on 20:00, off 06:00) wraps, 'always' = 1; moon phase ~0 at the reference new moon and ~0.5 at +14.77 days.

### F-09 **Time passes while the app is closed (closed-form catch-up on launch)**
Severity: idea · Effort: M · Value: 2/5 · Risk: 3/5

Where: `web/main.ts:36-44` (SavedTank has no timestamp), `web/main.ts:56-69`, `web/main.ts:78-95`, `web/main.ts:1130-1132` (200 ms catch-up cap), `core/sim.ts:83`.

What: On relaunch the sim resumes at the saved tickCount; the original ran around the clock. But HUNGER_PER_TICK = 1/36000 saturates in 20 minutes, so naive catch-up would make every launch start with all fish starving; do this only after F-07 and F-10's life pace exist.

Proposal: Save `savedAt: Date.now()`. On load `elapsed = clamp(now - savedAt, 0, 8 h)` (or 7 days with a feeder) in ticks at the configured pace. `Sim.catchUp(ticks)` in core/sim.ts: waterQuality += FILTER_PER_TICK*ticks (clamped to 1; settled food has rotted), hunger = `max(hunger, min(0.6, hunger + ticks*HUNGER_PER_TICK))` without a feeder (hungry, not starving), feeder drops at their scheduled ticks, age for F-11/F-12; no swimming. Show a Mac OS 8 alert: 'While you were away (2 days 4 hours): the Food Timer fed 4 times. 1 fish is hungry.' Preference 'Pause the tank while Finsical is closed', default on until the feeder exists. Tests (sim.test.ts): catchUp(1e6) caps hunger at 0.6 and water at 1; a stationary fish's hunger after catchUp(108000) matches 108000 tick() calls within 1e-9 (with the feeder, fed-fish hunger matches a real-time run within 1e-6); determinism with a seed.

### F-10 **Simulation speed and life pace (pause, fast-forward)**
Severity: idea · Effort: S · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:1016-1025` (animFrame on sim.tickCount), `web/main.ts:1126-1141` (fixed 30 tps), `macos/Finsical.swift:555-577`.

What: The original let you freeze or speed up time ('Aquarium Speed:', 'Current speed:' in AQUAZONE.exe; the feeder help says intervals follow tank time). Finsical runs a fixed 30 tps. Growth, incubation and disease also need a tank-time scale.

Proposal: A speed in {0, 1, 2, 4, 8}; a pure `ticksForFrame(acc, dtMs, speed)` in core returning how many sim.tick() calls to run, capped at 400 per frame with the rest dropped (no spiral of death). Speed 0 pauses animation too (animFrame is tick-driven). Tank > Speed submenu with checkmarks (Paused, Normal, Fast 2x, Faster 4x, Fastest 8x); a small 'Paused' placard (Geneva 9) in a tank corner. A 'Life pace' preference sets `TANK_DAY_TICKS` (Realistic 24 h, Relaxed 1 h default, Quick 5 min) used by F-07, F-11, F-12, F-17. Persist both and show them in Stats. Tests: ticksForFrame per speed and the cap; a Sim advanced by the helper is bit-identical to calling tick() the same number of times.

### F-11 **Fish grow from fry to adult using both sprite sets every pack already ships**
Severity: idea · Effort: M · Value: 4/5 · Risk: 3/5

Where: `core/sim.ts:10-57` (no age), `web/main.ts:78-95`, `web/main.ts:120-133`, `web/main.ts:138-150`, `web/main.ts:222-237`, `web/render.ts:61-72`, `web/overviewmodel.ts:66`.

What: Every fish pack contains the generic fry ring (shared 9x31 / 32x32 / 20x32 sheets, which B-01 stops showing by mistake) and the adult ring; AquaZone was a fish-raising sim. Egg packs exist too (F-23).

Proposal: After B-01, keep `rings[slot] = { baby, adult }` (pickSwimSheet's baby/adult). Fish gains a persisted `bornTick`: spawnFish sets `sim.tickCount`; legacy fish without it count as adults (existing tanks never regress). A pure `lifeStage(ageTicks)` in `web/tankmodel.ts` (and a `growthScale(age)`): baby below 1 TANK_DAY_TICKS (x0.7 faster when hunger stays below 0.33), adult after; ramp the adult's render scale from 0.5 to 1 over the transition so it does not pop, with a small sparkle and chime. A preference decides whether new fish arrive as fry or adults (default adults); 'Add again' may spawn fry. Overview status 'Fry' or 'Adult'. Tests: lifeStage boundaries and growthScale; saveTank/loadTank round-trips bornTick.

### F-12 **Fish lifecycle: health, old age and death using the packs' own dying art**
Severity: idea · Effort: L · Value: 3/5 · Risk: 4/5

Where: `core/sim.ts:10-57`, `core/sim.ts:248-252` (hunger clamps at 1 forever), `core/pose.ts:10-29`, `web/main.ts:1031-1044`.

What: The original's fish were born, grew and died; dead fish floated up, turned black and fouled the water until removed. Finsical fish are immortal. The data exists: each family's 4th sheet (+3) is 'right/left dying fish' (5 or 8 frames depending on the pack; clownfish ELRA 31603 fades through grey to black); FsTI u16@0 looks like days to adulthood (guppy 95, medaka 99, neon 180, cardinal 360, goldfish 370; tentative); aquazone.rez STR# 7100 CauseOfDeath has 23 entries (Starvation, Old Age, Water Temperature, Bad pH level, Disease…) and STR# 20005 is 'A fish has died.' Killing fish in a relaxation toy is a product decision.

Proposal: Sequence after B-01, F-01 and F-10. Fish gains optional `ageTicks`, `health` (0..1), `stage`, `life` ('alive' | 'dying' | 'dead') with defaults for old saves (adult, health 1, age 0). Health drains while hunger >= 1 or water < 0.2 (later temperature/pH, F-15). At 0 the fish plays all framesPerGroup of the +3 sheet matching facing (~2 s), then turns dead: no steering, rises to SURFACE at 0.2 px/tick belly-up (mirror vertically), fouls water at 2x WASTE_PER_TICK until removed, records its cause, and emits 'died' (F-13). Removal via Overview Remove plus Tank > 'Remove Dead Fish'. Preferences > 'Fish can die', default OFF (ask the user). Tests (seeded): hunger 1 and health 0.01 goes dying then dead within N ticks with cause 'Starvation'; a dead fish reaches SURFACE and water falls until removeFish; a baby at adultTicks-1 becomes adult after one tick; with deaths disabled health never drops below 0.1.

### F-13 **Event notices and a Tank Log window using the original's event text and animated art**
Severity: idea · Effort: M · Value: 4/5 · Risk: 2/5

Where: `core/sim.ts:205-246` (tick emits nothing), `web/statsmodel.ts:86-112`, `macos/Finsical.swift:76-102` (window table), `macos/Finsical.swift:555-577`.

What: The original popped an event dialog (FRMEVENT) for everything that happened. aquazone.rez has STR# 20001-20014 ('Adding food.', 'Adding Medicine.', 'Changing water.', 'Cleaning the filter.', 'A fish has died. Name/Species/Age', 'Laying eggs.', 'Baby has hatched.', 'A fish is sick.', 'A fish is pregnant.', 'Fish are mating.', 'The eggs have all died.', 'A fish has given birth.', 'A miscarriage occurred.', 'A fish has recovered.') and 52 EvDP pictures, 70x70: 13 events x 4-frame animations (a hand dropping food, a dropper, a bucket, a filter cartridge, a fish fading to black, a mating pair, an egg hatching…). Verified word for word. aquazone.rez is at `https://archive.org/download/aquazonewithguppiesandaddons/AQUAZONE.iso/Updater%2FData%2Faquazone.rez` (4,136,362 B, CORS OK).

Proposal: core/sim.ts `readonly events: SimEvent[]`, a typed union `{kind: 'fed' | 'medicated' | 'waterChanged' | 'filterCleaned' | 'died' | 'laidEggs' | 'hatched' | 'sick' | 'recovered' | 'pregnant' | 'born' | 'mating', tick, fishId?, data?}` pushed in tick() and public actions. main.ts drains it each frame into a persisted ring (localStorage `finsical:log`, 500 entries with wall-clock time), posts op 'log', and plays a matching 'snd ' event sound if one exists. New log.html/log.ts client window (native entry in the Finsical.swift window table and Tank > 'Tank Log' Cmd-L): an Osmium Finder list with a 16x16 icon cut from the first EvDP frame, Date, Event and Fish columns. Optional 'Show event alerts': a movable modal with the 4-frame animation at 4 fps plus the original label lines ('Name: Andrew Species: Dell's Comets Age: 12 days'). Load aquazone.rez lazily the first time art is needed (text-only rows until then). Ship with 'fed', 'medicated', 'waterChanged', 'filterCleaned' first. Tests: sim.test.ts that a manual dropFood emits nothing but a feeder drop emits 'fed', and a death emits 'died' with fishId; `web/logmodel.test.ts` for formatting and ring truncation.

### F-14 **Water changes, a filter that gets dirty, and Clean Filter**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `core/sim.ts:90-92`, `core/sim.ts:239-240` (constant filtration), `web/statsmodel.ts:86-112`.

What: The filter never clogs, so a fouled tank always heals by itself and the only care is 'stop feeding'. The original had Change Water… and Clean Filter commands and a 'Dirtiness:' field; STR# 310 describes the change-water dialog (amount, temperature, Blue = original, Red = new water, Green = resulting mix, conditioners, click the bucket); tanks carry a FltI 'AquaClean' record.

Proposal: `Sim.filter = {dirt 0..1}` growing with the waste term; recovery = FILTER_PER_TICK * (1 - 0.8*dirt). `cleanFilter()` resets dirt, briefly adds murk, emits 'filterCleaned'. `changeWater(fraction, tempC)`: quality = q*(1-f) + f, temperature mixed (F-15), pH toward 7.2, chlorine += f unless a conditioner is dosed (F-16). UI: Tank > 'Change Water…' movable modal ('Amount: [25] %', 'Temperature: [26.0] °C', three Platinum bars in the original blue/red/green legend, 'Add Water Conditioner' checkbox, Cancel / Change with a bucket icon); Tank > 'Clean Filter'; a Stats 'Filter:' row; advice 'Clean the filter' (dirt > 0.6) and 'Change some water' (quality < 0.5). Tests: changeWater(0.5) from 0.4 gives 0.7; dirt = 1 recovers at 20% of the clean rate; cleanFilter restores the full rate.

### F-15 **Water temperature, pH and hardness with a heater, driven by each species' FsTI tolerances**
Severity: idea · Effort: L · Value: 2/5 · Risk: 3/5

Where: `core/sim.ts:138-139` (waterQuality is the only water state), `web/stats.ts:64-86`, `web/prefs.ts`.

What: FsTI stores per-species ranges as u32 LE thousandths (verified on cardinal, guppy, 赤金魚, ネオンテトラ): @0x0e/0x12 ideal max/min °C, @0x16/0x1a tolerated max/min, @0x20/0x24 ideal pH, @0x28/0x2c tolerated pH, @0x32/0x36/0x3a GH. Cardinal 22-28 °C ideal, 21-31 tolerated, pH 5.0-7.5; goldfish 16-28 / 10-35 °C; guppy and molly pH 6.9-8.5, GH 4-18. Tanks carry HtrI 'AquaHeat' (setpoint 26.0 °C, dial 16-36 °C) and Watr (25.998 °C, pH 7.001); a 'NonHeater' bowl exists. It adds care burden to a relaxation toy and matters little before F-12.

Proposal: Sim gains `water {tempC, pH, gh}` and `heater {on, setC}`; tempC relaxes toward (heater.on ? setC : ROOM_C = 20) with a ~2 tank-hour time constant; pH drifts down with waste and water changes pull it toward 7.2. Species params travel with the sheet (SpeciesParams keyed by pack/species; placeholders get 22-28 °C, pH 6-8). Stress is 0 inside the ideal band, rising to 1 at the tolerated limit; it drains health and scales vigor; beyond the limit a death records 'Water Temperature' or 'Bad pH level'. Stats rows 'Temperature: 25.9 °C' and 'pH: 7.0' with bars; a Preferences 'Tank' pane with a Heater checkbox and a 16-36 °C slider in 0.5 °C steps (metric only). Tests (seeded): heater off approaches 20 °C within 5 tank-hours; a 22-28 °C species loses health at 20 °C but not at 25 °C.

### F-16 **Diseases and medicines (8 diseases in aquazone.rez, 29 medicine packs on archive.org)**
Severity: idea · Effort: L · Value: 2/5 · Risk: 4/5

Where: `core/sim.ts` (no health or disease state), `web/import.ts:65-89`.

What: aquazone.rez defines 8 diseases (SicI/SicH 400-407: White Spot, Tailrot, Bellworm/Epistylis, Chilodonella, Water Mold, Red Rust, Red Rust B, ARDS) and 4 base medicines (AZ Water Conditioner, Chlorine Cut, Green-S, Methylene Blue). allfoodsandmeds.zip/meds.zip has 11 .med and a meds.txt mapping medicines to diseases ('Green: white spot, tailrot, molds; GreenS: rust & rust B; Horisona: Chilodonella, gill & skin flukes; Methylene: white spot, tailrot, water mold'); JPN 薬品 has 18 .med. Each med has DrgH name/description, 60-byte DrgI params (undecoded) and an 83x83 DRDP icon. The least relaxing feature, with the most dependencies.

Proposal: After F-12 and F-15. `Fish.disease = {id, sinceTick}`; each tank-hour the infection chance scales with (1 - waterQuality) and temperature stress (seeded). A sick fish loses health slowly and swims with lower vigor; render a per-disease overlay generated once per cached frame (White Spot: seeded 1-px white dots on opaque pixels; Rust: tint toward #b0603a; Water Mold: whitish rim). Medicine packs import into a cabinet (section 'medicine', meds.zip nested collection). Tank > Medicate > <name> doses the tank: concentration decays over ~2 tank-days and cures listed diseases (a table keyed by DrgH name from meds.txt until DrgI is decoded); a second dose within the window risks 'Drug poisoning'; Water Conditioner also raises waterQuality by 0.5 over 10 s and neutralizes F-14 chlorine. A Disease Information window lists SicH names. Tests (seeded): water 0.2 makes a fish sick within N tank-hours; a matching medicine clears it and emits 'recovered'; a non-matching one does not.

### F-17 **Breeding: mating, eggs, livebearer births, fry and family trees**
Severity: idea · Effort: L · Value: 3/5 · Risk: 4/5

Where: `core/sim.ts:132-172` (no egg entity, no sex), `core/data/fsh.ts:148-164`, `web/import.ts:80-88`, `PLAN.md:59-61` (out of v1 scope; says the hooks exist).

What: Breeding was AquaZone's heart ('they will live long and BREED for limitless generations'). Data: F-02's sexes; FsTI u16@0x02/0x04 is 1/2 for egg-layers and 2/1 for livebearers; FsTI u32@0x0a looks like incubation/gestation minutes (neon and cardinal 1440, goldfish 5040, guppy and molly 43200; tentative); EGPC (5x5 egg sprite), EGPP clutch pictures, EggI/EggH egg records with parent names; blackmolly has 'Pregnant 01-05' individuals and bred records naming parents; banggai has 'Banggai eggs'; 13 JPN egg packs (F-23). Events exist for mating, laying, hatching, pregnancy, birth and miscarriage; the original had a Family Tree window.

Proposal: After F-02, F-10, F-11 and F-12. `Sim.eggs: Egg[] {id, speciesKey, x, y, laidTick, hatchTick, motherId, fatherId}` persisted (SavedTank v3 with migration). Once per tank-hour, an adult 'M' and 'F' of the same pack with hunger < 0.3 for 2 tank-hours and water >= 0.8 (and ideal temperature once F-15 exists) mate with a seeded probability (~0.15 per tank-day): a 90-tick chase, then egg-layers lay k eggs near plants or gravel (drawn with EGPC) and livebearers set `pregnant = gestation` and later give birth. k is capped by FsTI u16@0x08 (tentative brood size) and a global 24-40 fish cap. Hatchlings are 'baby' fish inheriting pack and species, a free individual or '<Mother> Jr.', and parent ids; Get Info shows 'Parents: Samantha x Scott'; a Family Tree list uses a Finder outline view with disclosure triangles. All rolls use this.rand(). Tests (seeded): a fed pair in clean water produces eggs within N tank-days; eggs hatch at incubation; livebearers give fry and no eggs; a same-sex tank never breeds; the cap holds.

### F-18 **Colour morphs from multi-variant packs, and guppy strains from the Deluxe II gp*.rez sets**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:120-133`, `web/main.ts:138-150`, `web/import.ts:65-89`.

What: gup addon1's three .REZ blobs hold 28 distinct adult 8g sheets (red, black, white, leopard males; orange and gold females) that collapse to one sheet. The Deluxe II ISO has Updater/Data/gp15000.rez..gp23000.rez (3.5-4.7 MB each, CORS OK) with 10/10/10/8/8 = 46 guppy phenotype families (ids step by 200, each with full ELRA/ELRB +0..+3, AMV#/BMV#, EGPC); FshI carries gene-like numeric fields.

Proposal: After B-01, `allAdultSwims(sheets)` returns the max-groups sheets whose area is >= 0.5x the largest; usePack stores them per pack; spawnFish picks one at random and stores `Fish.morph` (index), preserved by saveTank and remapSheetIdx; sheetOf resolves `fishSheets[idx][morph ?? 0]`, so 'Add again' adds variety. Strains phase 1 (after F-01): expose each gp family as its own fish add-on (listing URL = ISO view URL + '#family=15200') and decode only that family's 8 sheets via `fshToSheets(d, {family})`; never decode a whole gp*.rez on install. Phase 2 (after F-17): fry inherit the mother's strain with p 0.5, the father's 0.4, a neighbouring strain 0.1 (seeded). Tests: a synthetic 3-morph pack and a save round-trip; the inheritance distribution over 10000 seeded births within tolerance.

### F-19 **Show the heater, the filter intake and its bubble plume in the tank**
Severity: idea · Effort: M · Value: 2/5 · Risk: 2/5

Where: `core/sim.ts:367-370` (bubbles only from fish), `web/main.ts:1102-1109`.

What: aquazone.rez has BAPC 1000 (349x980 glass heater, mostly cable; the tube is a ~300-px diagonal), BAPC 400 (76x370 filter intake) and BAPC 410-412 (3 frames of a ~67x73 bubble cluster), plus error strings about 'making the heater visible' and 'showing you the bubbles created by the filter'. The original's filter bubbled audibly.

Proposal: An equipment layer after the backdrop and before decor: the filter tube hanging from the top-right rim (0.5 scale, ~38x185) with a sim-owned deterministic bubble emitter at its outlet cycling BAPC 410-412 on the sim clock; the heater anchored bottom-left with its cable off the top (try 0.4 scale; 0.5 covers ~47% of the width). Filter off (F-14) stops the plume. Preferences 'Show heater and filter' plus an optional quiet filter hum. Load aquazone.rez lazily (fetchZip/packPut) and draw nothing until it arrives. Tests: emitter bubble count after N ticks with a seed; screenshot check.

### F-20 **Per-fish courage: brave fish turn to watch you when you tap the glass**
Severity: idea · Effort: M · Value: 3/5 · Risk: 3/5

Where: `core/sim.ts:182-197`, `core/sim.ts:210-227`.

What: The original gave each fish a 'Courage:' value; the box copy says 'Tap on the glass and watch them… watch you!' and some fish were brave while others scattered. Every species ships sheet id+2 with 'front turn' and 'back turn' 8-frame sequences of the fish turning to face the viewer. Finsical makes every fish within 48 px flee alike.

Proposal: `Fish.courage` in 0..1 seeded in addFish (or from FshI once decoded), saved. tap(): courage < 0.5 startles with strength*(1 - courage); a brave fish enters a new state 'look': it steers to ~20 px from the tap, plays the front-turn sequence (id+2, group 0) once, holds facing the glass ~1 s, then drifts. Panic propagation skips brave fish; add 'look' to overviewmodel STATES. Tests (seeded): a courage 0.9 fish near a tap enters 'look' and ends within N px of the tap point; courage 0.1 startles at 90% strength; determinism.

### F-21 **Offer the 'Missing addons Aquazone.7z' library (988 entries); archive.org's listing links drop a path prefix**
Severity: idea · Effort: M · Value: 4/5 · Risk: 3/5

Where: `web/import.ts:37-60` (Collection), `web/import.ts:65-88`, `web/import.ts:190-281` (listCollection; URL built from u.href at :261-270), `web/import.ts:115-131` (fetchZip persists any 200), `web/import.ts:289-299`, `web/import.ts:1038-1056` (THUMB_PAR).

What: The main item's 'Missing addons Aquazone.7z' (147 MB) is listed by View Archive with CORS and serves single entries. It holds an English, sorted ITEMS library: 98 .fsh, 172 .plt, 350 .acc (incl. Stone accs and Wood accs), 108 .grv, 50 .bmp backgrounds, 43 .azn, 35 .fd, 12 .med, plus System/*.rez species sets (DS01-15, GP15000-23000, GF01-04, PC*, aw*, ma*, kf), Mekasia fish and toys, 'Mekasia Story.txt', the iMac fish (D-19) and AZ_WAVES.REZ (F-22). Overlap with existing JPN collections is small (plants 6 of 171 stems, gravel 5 of 108, .azn 0); fish overlap 'addon and modded fish.zip'. Catch: 986 of 988 hrefs read '.../Missing addons Aquazone.7z/addons Aquazone/ITEMS/...' but the entry lives at 'Missing addons Aquazone/ITEMS/...'; the short href returns HTTP 200 with 0 bytes, which fetchZip would cache forever and report as 'no pack inside'. Entries take 1-10 s (server-side 7z extraction).

Proposal: (1) Add `sevenZipRoot?: string` to Collection and DEFAULT_ITEM collections with outer 'Missing addons Aquazone.7z', sevenZipRoot 'Missing addons Aquazone/', and prefix/exts pairs 'addons Aquazone/ITEMS/Plants/' /\.plt$/i, '…/Accessories/' /\.acc$/i (covers Stone and Wood subfolders), '…/Gravel/' /\.grv$/i, '…/Backgrounds/' /\.bmp$/i, and the tanks folder /\.azn$/i (check exact folder names against the listing); fish last, deduped case-insensitively by stem against 'addon and modded fish.zip'. (2) In listCollection when sevenZipRoot is set: `const real = rel.startsWith(root) ? rel : root + rel.slice(rel.indexOf('/') + 1); const url = `${BASE}/${item}/${encodeURIComponent(outer)}/${encodeURIComponent(real)}`;` and use it for `seen`. (3) fetchZip throws when `d.length === 0`, before packPut. (4) THUMB_PAR 1-2 for these collections; label the source 'English library' (U-08). Tests: an import.test.ts fixture of two View Archive rows ('addons Aquazone/ITEMS/Plants/X.plt') yields a URL containing 'Missing%20addons%20Aquazone%2FITEMS%2FPlants%2FX.plt'; fetchZip with an empty 200 rejects without packPut.

### F-22 **The game's own sound effects (System/AZ_WAVES.REZ, 25 WAVs) are on archive.org, but the UI says they are not**
Severity: low · Effort: M · Value: 4/5 · Risk: 2/5

Where: `web/import.ts:740-743` (clearDetail text), `web/import.ts:346-364` (importAddon), `core/data/fsh.ts:42-54`, `web/audio.ts:128-156`, `web/main.ts:983-997`.

What: The Sounds empty state says the game's sound effects aren't on archive.org. The Windows sound bank at 'Missing addons Aquazone/System/AZ_WAVES.REZ' inside the 7z (1,182,480 B via F-21's prefixed URL) is a 9003 pack (magic 00010000) whose 25 chunks are plain RIFF/WAVE (8-bit, mostly mono, 11025/11127/22050/22254 Hz; durations 0.04-7.38 s); the trailer has one 'snd ' type, 12-byte records with ids 1000-1003, 2203, 2671 … 32080, no names. The four ~50 ms clips 1000-1003 are probably the four glass-tap zones (unverified by listening). importAddon sends pack data only to fshToSheets and packImages, so it yields 'no pack inside'.

Proposal: (1) In importAddon also collect `packChunks(b.data).filter(c => ascii(c.payload, 0, 4) === 'RIFF' && ascii(c.payload, 8, 4) === 'WAVE')` into `sounds` named `azwave_<resId>` (ids from the trailer directory, F-01, or the chunk index meanwhile), kind 'effect' (B-19). (2) A Sounds collection entry (or a 'Game Sound Effects' row) for that file. (3) An id -> event table in audio.ts (tap centre/side/top/bottom, drop, intowater, bubble, ambient 'aqua') consulted before the name search; filling it needs someone to listen to the 25 clips; record the mapping in a comment. (4) Fix the clearDetail text. Test: a vitest fixture pack with two RIFF chunks yields two sound records with the right names.

### F-23 **List the JPN egg packs (13 species) and the 26 'Power Updater' zips**
Severity: idea · Effort: S · Value: 3/5 · Risk: 1/5

Where: `web/import.ts:79-83` (JPN fish collection: loose .fsh only), `web/import.ts:90-93` (PACK_EXT), `web/import.ts:309-315`, `web/import.ts:462-471`, `core/data/zip.ts:40-66`.

What: AQUAZONE 魚/魚単体/魚卵.zip (2.2 MB) holds egg packs for 13 species (カージナルテトラの卵.fsh …; full fish packs plus 20 EggI/EggH/EGPP individuals each), but it is a zip inside the collection zip and is never listed. The same folder has 26 'Power Updater' zips (Angel fish, クラウンローチ, ゼブラ・ダニオ, ハーレークインフィシュ, ブラックエンゼル, Discus, Arowana, guppy breeding sets…); 'AQUAZONE Option ゼブラ・ダニオ.zip' holds ITEMS/ZEBRA.DNA (a full fish pack: tag 'XXXX', ELRA/ELRB x4, FsTI/FsTH) plus C_WENTY.PLT and WORM.FD.

Proposal: (1) Egg packs: `{section: 'fish', item: JPN_ITEM, outer: JPN_ZIP + '/AQUAZONE (JPN) SET/AQUAZONE 魚/魚単体/魚卵.zip', exts: /\.fsh$/i, deep: true}` (nested mode; one download lists 13 species); list under Fish until F-17, then place a clutch that hatches. (2) Power Updater: `{section: 'fish', item: JPN_ITEM, outer: JPN_ZIP, prefix: 'AQUAZONE (JPN) SET/AQUAZONE 魚/Power Updater/', exts: /\.zip$/i}`; each entry URL serves the zip raw and fetchInnerBlobs' no-fragment path imports every PACK_EXT entry. Accept `.dna` only for this collection and only when its adult sheet hash is not already installed (Arowana.dna duplicates Medaka art, B-11); stray .PLT/.FD entries are ignored by handleImages. Tests (import.test.ts): a loose-mode listing with /\.zip$/ yields one item per zip; importAddon on a synthetic zip holding ITEMS/X.DNA and a .PLT returns the DNA sheets; nested listing of a subfolder of .fsh leaves yields unique names.

### F-24 **The bonus bundle's Mecha-snail gravel (G_Debris.grv) and animated MekaUni accessory are never listed**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/import.ts:84-87` (JPN_BONUS listed only for .fsh and audio), `web/import.ts:190-239`, `web/import.ts:216-219`.

What: The JPN non-retail bonus zip's メカデンデンムシ/Denden/ folder also holds G_Debris.grv (219,658 B; its 1001x138 image passes pickGravel) and MekaUni.acc (576,894 B; 83x83, 168x192 and 10 x 278x187 frames, picked correctly). The zip is already downloaded for the fish listing.

Proposal: Append `{ section: 'gravel', item: JPN_ITEM, outer: JPN_BONUS, exts: /\.grv$/i, deep: true }` and `{ section: 'accessories', item: JPN_ITEM, outer: JPN_BONUS, exts: /\.acc$/i, deep: true }` to COLLECTIONS; nested mode handles deep entries and fetchZip dedupes the download. Test: extend the nested-zip fixture in import.test.ts with a .grv and an .acc under a subfolder and assert the sections.

### F-25 **Show each add-on's Read Me and credits in the detail pane**
Severity: idea · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/import.ts:289-316` (fetchInnerBlobs keeps only PACK_EXT entries), `web/import.ts:590`, `web/import.ts:785-786`.

What: Many archive.org add-on zips carry README text with install notes and modder credits ('addon files README.txt' in goldfish addon and guppy, 'arowana addon files README.txt', three READMEs in updatedAZfiles; the 7z has 'Read me - by Kez/SSR' files). They are discarded.

Proposal: In fetchInnerBlobs' no-fragment branch also collect `*.txt` under 16 KB; decode with UTF-8 `{fatal: true}`, then `TextDecoder('shift_jis')` for JPN items, then `TextDecoder('macintosh')` (90s Mac text; latin1 would mangle curly quotes); return `readme?: string` on the first PackResult. showDetail adds a 'Read Me…' push button next to Play opening a small Osmium window (mountWindow, as the overlay does) with the text in a monospace scrolling well. Test: vitest importAddon on a synthetic zip with a README.txt returns the text.

### F-26 **New Tank, Save Tank As… and Open Tank… (start over, back up, share)**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:35-55` (SAVE_KEY), `web/main.ts:78-95`.

What: The whole tank lives in one localStorage key: no backup, no second tank, and emptying it means removing items one by one.

Proposal: File commands in the native menu and U-14's browser menu. New Tank…: caution alert 'Empty the tank? Your fish and add-ons will be removed.', then an empty v2 save and reload. Save Tank As…: serialize `{v: 2, fish, addons, machine, crt}` as `.finsicaltank` JSON (native: bus op 'saveFile' {name, text} to NSSavePanel; browser: Blob download). Open Tank…: validate with loadTank's checks (S-07), write SAVE_KEY and reload; dropping a .finsicaltank on the tank does the same. Do not reuse .azn (that is importable scenery). Vitest: serialize/parse round trip; reject wrong versions and non-array fish.

### F-27 **Accept add-on files dropped on the Dock icon or opened with Open With (the Mac OS 8 way to install)**
Severity: idea · Effort: M · Value: 3/5 · Risk: 3/5

Where: `macos/Info.plist` (no CFBundleDocumentTypes), `macos/Finsical.swift:6-56` (WebHandler), `web/main.ts:919-1000` (import logic tied to the drop listener).

What: The tank already imports dropped .azpack folders, raw packs and sound files, but only onto the window. In Mac OS 8 you installed things by dropping them on the application icon.

Proposal: (1) Info.plist CFBundleDocumentTypes with CFBundleTypeRole Viewer and LSHandlerRank Alternate for fsh, rez, rsrc, bin, hqx, azpack, wav, aiff (LSItemContentTypes public.data plus public.folder for .azpack folders and extension-less classic add-ons). (2) AppDelegate `application(_:open urls:)` registers each URL in `pendingImports: [String: URL]` under a random token; WebHandler serves `finsical://app/__import/<token>/<name>` from that dictionary only (read once, then removed); post `window.finsical.importUrls([{name, url}])`. (3) main.ts: split the drop handler body into `importFiles(files: Map<string, Blob>)`, called by the drop listener and by importUrls (fetch each URL into a Blob). Test: vitest importFiles with an in-memory Map; manual: drag a .fsh onto the Dock icon and a fish appears.

### F-28 **Presentation modes: desk widget on the desktop, ghost (click-through), full screen, screen saver**
Severity: idea · Effort: L · Value: 3/5 · Risk: 4/5

Where: `macos/Finsical.swift:487-527`, `macos/Finsical.swift:500-501`, `macos/Finsical.swift:542`, `macos/Finsical.swift:555-577`.

What: The original was sold as 'Desktop Life' with Full Screen, Menu Bar and Tool Bar toggles, and screensaver editions existed. Finsical has only the floating window (U-16 covers the float and Spaces toggles).

Proposal: `enum Presentation { case window, desktop, ghost, fullScreen, screenSaver }` persisted in UserDefaults, restored at launch, one webview reparented between windows so there is one simulation. Desktop: borderless window at `NSWindow.Level(rawValue: Int(CGWindowLevelForKey(.desktopIconWindow)) + 1)` (above Finder's icon layer; `.desktopWindow + 1` would swallow clicks), `collectionBehavior = [.canJoinAllSpaces, .stationary, .ignoresCycle]`; verify on macOS 12 and 15 that clicks still feed and tap. Ghost: `ignoresMouseEvents = true`, `alphaValue = 0.7`; needs D-18's status item as the way back. Full screen: borderless window over the screen, the page gets a 'fullscreen' class via the bus (hides #machine, integer-scales the canvas, black letterbox), Esc exits. Screen saver: same at `.screenSaver` level with `NSCursor.hide()`, exit on local and global mouseMoved/keyDown monitors, started from Tank > 'Start Screen Saver' or after N idle minutes (`CGEventSource.secondsSinceLastEventType(.combinedSessionState, eventType: CGEventType(rawValue: ~0)!)` checked every 30 s). A real .saver bundle is fragile on macOS 14+ (WKWebView inside legacyScreenSaver), so stay in-app. Manual tests: enter and exit each mode repeatedly; fish state is continuous and the tank returns to its saved frame.

### F-29 **Let Brightness, Contrast and the colour trims work without the CRT effect**
Severity: idea · Effort: S · Value: 2/5 · Risk: 2/5

Where: `web/prefs.ts:107-131` (PANES.picture.offHint), `web/prefs.ts:426-431` (syncEnabled disables every slider), `web/crt.ts:136-141`, `web/app.css:106-110`.

What: The whole Picture pane is disabled unless 'Simulate a CRT monitor' is on (and that checkbox lives on another pane). A dimmer or warmer tank is useful on its own; a real monitor's front panel works regardless.

Proposal: A pure `pictureTransfer(cfg): { r: [slope, icpt], g, b }` in crt.ts with K = 0.55 + 0.9*contrast, B = 0.5 + brightness, G_ch = 0.6 + 0.8*gain_ch: slope = K*B*G_ch, icpt = 0.4*(1-K)*B*G_ch (exactly the shader's map; CSS brightness()/contrast() pivot at 0.5 and would not match). main.ts inserts a hidden inline `<svg><filter id="pic" color-interpolation-filters="sRGB"><feComponentTransfer>` with linear funcR/G/B from it; when the CRT is off and settings are non-neutral, `canvas#tank.style.filter = 'url(#pic)'`, else 'none'. Measure WKWebView frame cost at full Retina size first; if slow, apply a 256-entry per-channel LUT to the 320x200 ImageData instead. syncEnabled keeps only zoom and Geometry CRT-only. Tests: pictureTransfer(defaults) is identity within 1e-6 and matches the shader formula on random configs.

### F-30 **Stats: a history graph that survives reopening the window**
Severity: idea · Effort: M · Value: 2/5 · Risk: 2/5

Where: `web/stats.ts:49-63` (page-local 90 s history), `web/stats.ts:92-107`, `web/main.ts:385-419`, `core/sim.ts:94` (QUALITY_SEEK, module-private), `core/sim.ts:129`.

What: Trend arrows restart when Stats reloads and the tank keeps no history. A small period-style line graph (1-bit, like Mac OS 8's Memory or Energy panels) of water quality and average hunger over the last hour would teach the feeding rhythm.

Proposal: main.ts keeps a ring of 120 samples (one per 30 s of sim time: {t: tickCount, water, avgHunger}) persisted in SavedTank as `hist` and sent in the state push (<= 120 x 3 numbers). stats.ts draws a 240x48 canvas in an .osm-well: black lines on white, a dotted QUALITY_SEEK line (export it or use B-10's core/tuning.ts), night bands shaded 50% grey from the day phase; trend arrows come from hist so they work immediately. Test: a pure `pushSample(hist, s, max)` helper.

## Tooling, tests, CI and docs

### T-01 **Every GitHub release is an unpublished draft, so the README Download link leads nowhere; the version marker is stale**
Severity: high · Effort: S · Value: 5/5 · Risk: 1/5

Where: `README.md:3` (`<!-- version -->0.2.0<!-- /version -->`), `.github/workflows/release.yml:49-60` (`draft: true`), `scripts/release.sh:73-90` (commits only Info.plist and package files at :81/:84; ends with 'Created $tag.'), `macos/Info.plist:15-18`, `package.json:3`.

What: v0.2.0 and v0.3.0 are both drafts (published_at null); `/releases/latest` returns 404 on the API and 302 to /releases on the web, so the README's only install path is dead. The README marker says 0.2.0 while package.json, Info.plist and the tag say 0.3.0; nothing updates it.

Proposal: (1) The maintainer publishes the v0.3.0 draft (or a rebuilt universal v0.3.1 after B-06): `gh release edit v0.3.0 --draft=false --latest`. An agent cannot do this. (2) release.sh prints `Created $tag. After the Release workflow finishes, review and publish: gh release edit $tag --draft=false --latest`, or release.yml sets `draft: false` and `make_latest: true` if no manual review is wanted. (3) Before the commit, release.sh rewrites the marker with BSD sed: `sed -i '' -E "s|(<!-- version -->)[^<]*(<!-- /version -->)|\1$version\2|" README.md` and adds README.md to git add (combine with T-10). (4) `scripts/check-version.mjs` in core-linux CI asserts package.json version == Info.plist CFBundleShortVersionString (regex) == the README marker. (5) A 'Releasing' section in README or AGENTS.md names the publish step.

### T-02 **README lacks install (Gatekeeper), usage, add-on, data and build-from-source documentation**
Severity: medium · Effort: S · Value: 4/5 · Risk: 1/5

Where: `README.md` (~17-20 lines of pitch), `macos/Makefile:52` (`codesign --sign -`), `.github/workflows/release.yml:40-55`, `macos/Finsical.swift:546-576`, `web/main.ts:109`, `web/main.ts:825-867`, `web/store.ts:90`.

What: The app is ad-hoc signed, has no hardened runtime and is not notarized. Since macOS 15, Control-click > Open no longer bypasses Gatekeeper; users must use System Settings > Privacy & Security > Open Anyway (or `xattr -dr com.apple.quarantine`). Nothing tells them, or how to use the app: feed zone (top 15%) vs tap; native Cmd-, Preferences, Cmd-O Overview, Shift-Cmd-S Stats, Cmd-I Import, Cmd-F Feed, Cmd-R CRT; browser Ctrl/Cmd-I, F, C, S; drop formats (.azpack folder, .fsh/.REZ, .rsrc/.bin/.hqx, audio); stored data (localStorage finsical:* keys, IndexedDB 'finsical' cache up to 150 MB; archive.org is the only network host); dev loop (`npm run dev` on :8080; client pages as tabs in the same browser for BroadcastChannel; web/pack/; tools/fetch.py and tools/azpack.py). No requirements, no CHANGELOG link.

Proposal: Rewrite the README with sections: Download and first launch (requirements incl. architectures per B-06, the macOS 15 Gatekeeper steps and the Terminal alternative), Using Finsical (a controls table, native and browser), Add-ons (archive.org browser, drag-and-drop formats), Windows, Your data, Build from source (Node 22+, Python 3.9+, npm ci, npm run typecheck, npm test, `python3 -m unittest discover -s tools/tests -p 'test_*.py' -t .`, npm run dev, scripts/build.sh --run, `defaults write dev.finsical.app FinsicalWebInspector -bool YES` from T-24), Asset tools, Credits and trademarks (T-03). Keep the LLM disclosure; link the CHANGELOG. Optional release.yml step gated on secrets (MACOS_CERT_P12, MACOS_CERT_PASSWORD, NOTARY_KEY_ID, NOTARY_ISSUER, NOTARY_KEY_P8): temporary keychain, `codesign --force --options runtime --timestamp --sign "Developer ID Application: …"`, `xcrun notarytool submit <zip> --wait`, `xcrun stapler staple`, re-zip; skip cleanly without secrets (needs a paid Developer ID: the owner's call).

### T-03 **No credits or third-party notices: 9003 Inc., Mindscape, the archive.org items, FFmpeg's LGPL code and Apple's marks**
Severity: medium · Effort: S · Value: 3/5 · Risk: 1/5

Where: `README.md`, `LICENSE` (Unlicense), `tools/az/mace.py:1-9` (claims 'not distributed with the app'), `core/data/snd.ts:193-245` (embeds FFmpeg's LGPL table in the shipped bundle), `macos/Makefile:27-37`, `web/import.ts:593-594`, `web/import.ts:785-786`, `web/machines.ts:59` ('user-supplied art'), `macos/Finsical.swift:543-577`.

What: The only in-app credit is 'Add-ons come from the Internet Archive.' Nothing names AquaZone's makers (archive.org metadata: creator '9003inc., Mindscape, Inc.' for aquazonewithguppiesandaddons, 'OPENBOOK 9003' for aquazone-jpn-set); the detail pane links no source item; the case art shows Apple's rainbow logo and product names with no trademark note or provenance; the Unlicense could be read as covering assets that are not the author's. The MACE decoder ports FFmpeg LGPL-2.1+ code and table into the JS bundle inside Finsical.app with no notice.

Proposal: (1) `THIRD_PARTY_NOTICES.md`: FFmpeg libavcodec/mace.c attribution and LGPL-2.1-or-later text (MACEtab2 now, MACEtab3/4 after B-02), Osmium UI (Unlicense), archive.org-hosted content. Copy it into Contents/Resources from the Makefile and include it in the release zip. Isolate the LGPL code in `core/data/mace.ts` and `tools/az/mace.py` with SPDX headers (B-02); correct the mace.py header. (2) README 'Credits & trademarks': AquaZone © 9003 Inc. (OPENBOOK 9003), published by Mindscape; add-ons hosted by the Internet Archive with links to both items; 'Apple, Macintosh and iMac are trademarks of Apple Inc.; Finsical is not affiliated'; machine art provenance; the Unlicense covers Finsical's code only. (3) showDetail replaces the dmeta text with the item title plus a link-styled 'View on archive.org' button (`window.open('https://archive.org/details/' + item)`; add `item` to Importable or derive it from the URL). Never show uploader e-mail addresses. (4) Same credits in A-04's About window. Final licensing judgment is the maintainer's.

### T-04 **Python tool tests fail on Python 3.9 (the Xcode CLT python3), so scripts/build.sh fails on stock Macs**
Severity: medium · Effort: S · Value: 3/5 · Risk: 1/5

Where: `tools/tests/test_snd.py:43` (`int | None` in a signature), `scripts/build.sh:39`, `.github/workflows/ci.yml:26`.

What: Without `from __future__ import annotations`, the module fails to import on 3.9.6: `uvx --python 3.9 python -m unittest discover ...` gives ImportError for tools.tests.test_snd (55 tests pass, the 21 snd tests never load). fetch.py and azpack.py already have the import. The GitHub macOS image puts a newer Python first, so CI never sees it. No minimum Python is documented.

Proposal: Add `from __future__ import annotations` to test_snd.py and, for consistency, every tools module. State 'Python 3.9+, stdlib only' in README and tool docstrings. Pin Python in CI with actions/setup-python (pinned SHA) and a matrix of ['3.9', '3.13'] for the unittest step (combine with T-14).

### T-05 **fetch.py downloads identical ISOs twice and a zip it cannot use, never checks md5, and has no retries**
Severity: medium · Effort: M · Value: 2/5 · Risk: 2/5

Where: `tools/fetch.py:43-60`, `tools/fetch.py:63-78` (_cached_get compares size only), `tools/fetch.py:134-176` (_harvest; _read_capped), `tools/fetch.py:204-253`, `tools/fetch.py:271` (default include `(?i)\.(iso|zip)$`).

What: AQUAZONE.iso and AQUAZONE_BACKUP.ISO are both 541,442,048 B with md5 7bb85ba32b8d4cc4b072496f9ad7c84c, so the default run fetches 1.08 GB and emits AQUAZONE.azpack plus a duplicate AQUAZONE-2.azpack. The 284 MB 'Aquazone-Deluxe-II-…-WinMac-Hybrid.zip' contains only AQUAZONE.iso; _harvest decompresses ~512 MiB into memory and then prints 'skipped, decompressed data over cap'. archive.org returned 500 and 503 during the review; _get has no retry.

Proposal: (1) fetch() skips item files whose metadata md5 was already processed this run and logs 'same content as <name>'. (2) _emit_source keeps a per-run set of sha256(data) and skips byte-identical sources (dedupes packs regardless of which archive carried them). (3) In _harvest, check `zi.file_size` before reading; when an entry ends in .iso, stream it with zf.open() into downloads/ (capped by _MAX_ISO_BYTES) and call `_harvest_disc(Iso(tmp))` (step 2 prevents duplicate bundles). (4) _cached_get verifies md5 when metadata has it; retry 3 times with backoff on 5xx and URLError; optionally resume a .part file with Range. Tests (test_fetch.py, monkeypatched _get/_list_item): identical md5 fetched once; identical pack bytes in two zips give one bundle; md5 mismatch re-downloads; 5xx then success is retried.

### T-06 **No browser smoke test: the tank page and four client windows run untested in CI**
Severity: low · Effort: M · Value: 4/5 · Risk: 1/5

Where: `.github/workflows/ci.yml:17-38`, `web/main.ts`, `web/prefs.ts`, `web/overview.ts`, `web/addons.ts`, `web/stats.ts`.

What: CI runs tsc, vitest in Node, Python unittest and the macOS build. Rendering, the rAF loop, the CRT shader, keyboard shortcuts and BroadcastChannel traffic are never exercised; main.ts, prefs.ts, overview.ts, addons.ts and stats.ts have 0% coverage. A prototype smoke run takes ~5 s.

Proposal: devDependency @playwright/test, `playwright.config.ts` (webServer: build to dist per T-15, then serve), `e2e/smoke.spec.ts`: (1) the tank paints more than 1000 non-dark pixels and two frames 500 ms apart differ; (2) F makes the next state push report food >= 1; (3) C sets body.crt with no 'crt shader'/'crt link' warnings; (4) posting `{op: 'machine', id: 'imac-bondi'}` from prefs.html changes #shell's viewBox; (5) client pages load without pageerror; (6) no console errors; (7) `route('https://archive.org/**')` to fixture listings and zip bytes so Import Add-ons works offline and deterministically. Run chromium and webkit projects (Playwright's WebKit is the closest proxy for WKWebView and would catch B-29). CI job on ubuntu-24.04 with `npx playwright install --with-deps chromium webkit`, traces uploaded on failure. Home for V-08's GL probe and several Playwright checks above.

### T-07 **Duplicated Python and TS decoders have no shared parity corpus and already disagree**
Severity: low · Effort: M · Value: 2/5 · Risk: 1/5

Where: `core/data/bmp.ts:29` (8192 cap), `core/data/fsh.ts:129` (64 Mpx sheet cap), `tools/az/img.py:5-72` (no caps; IndexError on truncated rows), `tools/az/emit.py:30-54` (no sheet cap), `core/data/*.test.ts`, `tools/tests/fixtures.py`.

What: core/data/{fsh,bmp,snd}.ts port tools/az/*.py and each language has its own fixture builders; no test feeds the same bytes to both. Drift exists: a truncated 16x16 BMP raises in Python but decodes in TS; a 100000x100000 BMP is rejected in TS but hits MemoryError in Python; a 258 KB sprite payload makes emit request a 66.5 GB bytearray. B-02 shows parity alone is not enough; goldens need outside references.

Proposal: (1) Mirror TS caps in Python: read_bmp raises a ValueError subclass (T-20) on w <= 0, h == 0, or |w|, |h| > 8192; _sprite_sheet rejects sw*sh > 1<<26 (S-02). (2) `python3 -m tools.tests.gen_parity` writes a small committed corpus into `core/data/fixtures/parity/` with expected.json (dims and sha256 of indices/PCM, or 'reject'): blank frame, truncated frame, RLE8 BMP, truncated BMP, oversized BMP, snd fmt1 raw/MACE, extSH 8/16, AppleDouble/MacBinary/BinHex rsrc. (3) `core/data/parity.test.ts` and `tools/tests/test_parity.py` assert against it; the Python test also regenerates and diffs to catch staleness. (4) AGENTS.md: 'change core/data/*.ts and tools/az/*.py together; run parity' (T-12). Moving TS builders into core/testing/fixtures.ts is optional (the two buildBmp8/buildZip helpers differ).

### T-08 **main.ts (1142 lines, 0% covered) mixes state logic with DOM; extract pure modules**
Severity: low · Effort: L · Value: 3/5 · Risk: 3/5

Where: `web/main.ts:45-98` (loadTank/saveTank), `web/main.ts:100-111` (pointer mapping), `web/main.ts:120-133`, `web/main.ts:222-320` (sheet maps, 'exact inverses' comments at :246-252, :275-279, :302-306), `web/main.ts:553-602`, `web/main.ts:735-764`, `web/main.ts:1127-1142`.

What: The riskiest logic (save migration, sheet binding, removal teardown, letterbox mapping, the fixed-step clock) runs at module load with getElementById, localStorage and rAF, so it is untestable; web/ statement coverage is 20.9%.

Proposal: First pass limited to pure functions with clear test value, call sites staying in main.ts: `web/tanksave.ts` (`parseSavedTank(raw)`, `serializeTank(...)`, `rosterFromSave(saved)`, B-16's initialRoster), `web/geometry.ts` (`clientToTank(rect, x, y, tank)`, `isFeedZone(y, tankH)`; shared with U-03's mapToTank), `core/clock.ts` (`stepClock(acc, dtMs, stepMs, maxMs)`, P-03's planFrame), and `web/tankmodel.ts` (B-04, B-14, B-15 resolvers). Test: invalid JSON, v not in {1,2}, non-finite coordinates dropped, sheetIdx/pack serialized only when set, letterbox clicks return null, the 200 ms clamp. Defer a SheetRegistry class until a bug justifies it.

### T-09 **import.ts: split the archive.org client from the panel, fixture-test the HTML scraper, add a live contract check**
Severity: low · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/import.ts:26-388` (DOM-free client), `web/import.ts:240-282` (href scraper, uncovered), `web/import.ts:389-1248` (panel), `web/import.test.ts:83-98` (stub answers every listing with 404).

What: An archive.org markup change would silently empty the add-on browser, and the scraper is never tested. Every green `npm test` prints 24 'archive.org listing failed' stack traces. Module-level caches leak between tests. A live run lists 840 items (fish 165, gravel 76, plants 93, accessories 395, backgrounds 83, tanks 27, sounds 1) in 1.7 s; hrefs are protocol-relative ('//archive.org/download/…').

Proposal: (1) Move lines 26-388 to `web/archive.ts`, ideally an ArchiveClient class owning zipCache/pageCache so each test gets a fresh one; mountImportPanel to `web/importpanel.ts`. (2) Commit trimmed real listing pages captured with curl (`web/fixtures/archive/gravel.zip.html` and a JPN SET page); the stub serves them by URL; assert exact inner names and URLs. (3) `vi.spyOn(console, 'warn')` for expected failures. (4) `.github/workflows/archive-contract.yml` (weekly schedule plus workflow_dispatch) runs a LIVE_ARCHIVE=1-gated vitest asserting every COLLECTIONS entry lists >= 1 item and one known add-on imports; on failure `gh issue create`.

### T-10 **CHANGELOG has no version sections and release.sh updates neither CHANGELOG nor README**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `CHANGELOG.md:3` (single '## Unreleased'), `scripts/release.sh:81`, `scripts/release.sh:87` (push without --atomic), `.github/workflows/release.yml:60` (generate_release_notes).

What: '## Unreleased' mixes work that shipped in 0.3.0 (#81 Tank Stats, #82 Platinum redesign, ancestors of release commit 792e658) with later work (#83-#86). A failed build.sh leaves a dirty tree that blocks the retry.

Proposal: Split now into '## 0.3.0 (date)' (#81, #82) and '## Unreleased' (#83-#86). release.sh (with T-01's marker step): an awk rewrite renaming '## Unreleased' to `## $version ($(date +%Y-%m-%d))` and inserting a fresh empty Unreleased above it; `git add README.md CHANGELOG.md`; `git push --atomic origin main "$tag"`; a `trap` restoring bumped files if build.sh fails. release.yml extracts that version's section with awk into `body_path` instead of generate_release_notes.

### T-11 **PLAN.md is stale and claims resource types are 'decoded so far' when no code reads them**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `PLAN.md:22-28`, `PLAN.md:40`, `PLAN.md:57`, `PLAN.md:59-61`.

What: PLAN.md lists 'tools/sit/ StuffIt archives (via bundled unar)' (does not exist), says the macOS shell 'ships later' (it shipped: Finsical.swift 614 lines plus Osmium), names an aquazone.me library no code uses, says 'vitest or node:test', omits the in-app archive.org import, Osmium UI, CRT, machine cases and client windows, lists pict.py in the pipeline (T-16), and says FsTH, FsTI, FsT2/FsT3, FBDP/FADP, BMV#/AMV#, EggI/EGPC/EGDP, FdHd, Grvl, Watr, LigH and snd events are 'decoded so far' with lifecycle 'hooks' in place. A grep over core, web, tools and macos finds none of these tags outside two comments.

Proposal: Rename to `docs/ARCHITECTURE.md` describing the current layout and data flow (archive.org -> zip -> fsh/bmp -> SpriteSheet -> render; the bus; the Osmium boundary), keeping the original plan as a short 'Origins' note. Add a 'Resource types' table (type, meaning, layout, status verified/tentative/unknown) covering F-01's map layout, the FishMaker 18-sequence sprite table (ring, pitch, turn, dying; ELRA adult, ELRB baby), FsTI offsets (F-12, F-15, F-17), AccI frames (F-03), food type codes (STR# 7200), event strings and art (F-13), and the aquazone.rez ISO URL; mark lifecycle hooks as not implemented. Link it from AGENTS.md.

### T-12 **AGENTS.md has no project-specific quick reference**
Severity: low · Effort: S · Value: 3/5 · Risk: 1/5

Where: `AGENTS.md`, `CLAUDE.md`.

What: AGENTS.md is generic process guidance; agents must rediscover test commands, the dev loop and invariants (this review's orchestrator had to restate them).

Proposal: Add '## Project quick reference': a layout table (core/, web/, macos/, tools/, node_modules/osmium-ui); commands (npm ci; npm run typecheck; npm test; `python3 -m unittest discover -s tools/tests -p 'test_*.py' -t .`; npm run dev; scripts/build.sh); invariants (never commit AquaZone data: web/pack/ and packs/ are gitignored; change core/data/*.ts and tools/az/*.py together and run T-07's parity test; respect the macOS 12 / WebKit floor (B-29); UI fixes go upstream to L-K-M/osmium-ui; the 320x200 tank); how to verify UI (open index.html and a client page in the same browser profile; T-06's smoke test; the Web Inspector default from T-24).

### T-13 **No linters; enabling cheap checks immediately finds dead code and a missing test**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `tsconfig.json`, `core/data/snd.test.ts:63`, `tools/az/emit.py:11`, `tools/az/rsrc.py:197`, `scripts/build.sh:6-7`, `scripts/release.sh:6-7`, `.github/workflows/ci.yml:23`.

What: CI runs only tsc and `bash -n`. `tsc --noUnusedLocals --noUnusedParameters` gives exactly one error: `sndFmt1Mace` (snd.test.ts:63) is never called, so the TS parseSnd MACE branch is untested. ruff (E,F,W,B) on tools/ finds ~30 issues including unused struct (emit.py), unused rbase (rsrc.py:197) and W605 (T-21). shellcheck flags SC2155 (`readonly X="$(cd … && pwd)"` hides a failed cd).

Proposal: Add noUnusedLocals and noUnusedParameters to tsconfig.json and resolve the hit via B-02's parseSnd 0xFE test. `pyproject.toml` `[tool.ruff]` (select E,F,W,B; ignore E702/E501 initially) and a `pipx run ruff check tools` step. `shellcheck scripts/*.sh` in core-linux; split the SC2155 declarations (`SCRIPT_DIR="$(cd … && pwd)"; readonly SCRIPT_DIR`). Skip a tsconfig 'types' split: @types/node is not installed and web code already cannot use Node globals.

### T-14 **CI toolchains are unpinned, the web build is not checked on Linux, and PRs produce no artifacts**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `.github/workflows/ci.yml:17-38`, `package.json` (no engines), no `.nvmrc`.

What: Both jobs use whatever Node and Python the runner image ships (they differ between ubuntu-24.04 and macos-15 and drift); no npm cache; `npm run build` runs only indirectly on macOS; reviewers cannot download a PR build. zip.ts needs Node >= 20.12 for deflate-raw.

Proposal: `.nvmrc` (22) and `"engines": {"node": ">=22"}`; actions/setup-node (pinned SHA) with node-version-file and cache npm in both jobs; setup-python per T-04; `npm run build` in core-linux; upload dist/ from core-linux and `ditto -c -k --keepParent macos/Finsical.app Finsical-pr.zip` from native-macos with actions/upload-artifact (retention-days 7).

### T-15 **`npm run build` does not produce a complete site; every launch 404s on pack/manifest.json**
Severity: low · Effort: S · Value: 3/5 · Risk: 2/5

Where: `package.json` (scripts.build: five esbuild calls plus an inline `node -e` copying only HTML and CSS; scripts.dev copies osmium.css into web/ once), `macos/Makefile:27-37` (re-copies HTML and assets from web/), `web/main.ts:870-887`, `.gitignore:11-13`.

What: dist/ lacks web/assets, so it shows no machine case (the review needed its own build-site.sh). An Osmium upgrade needs a dev restart. main.ts always fetches pack/manifest.json, logging a 404 and 'azpack load failed; using placeholder fish' on every normal launch (web/pack/ is gitignored).

Proposal: `scripts/build-web.mjs` using esbuild's JS API: entryPoints {bundle: 'web/main.ts', overview, addons, prefs, stats}, bundle, format 'iife', target 'safari15' (B-29), outdir dist; copy the HTML, app.css, osmium.css, assets and optional web/pack. `--serve` uses `context.serve` on 127.0.0.1:8080 with servedir dist plus watch, so dev stops writing into web/. Define `__BUNDLED_PACK__` (existsSync('web/pack/manifest.json')) and `__VERSION__` (package.json); main.ts skips the pack fetch when __BUNDLED_PACK__ is false; A-04 shows __VERSION__. The Makefile copies only from ../dist; package.json scripts become `build: node scripts/build-web.mjs`, `dev: node scripts/build-web.mjs --serve`.

### T-16 **Python pipeline coverage gaps: the ISO reader is 16% covered, fetch() untested, pict.py dead code**
Severity: low · Effort: M · Value: 2/5 · Risk: 1/5

Where: `tools/az/iso9660.py`, `tools/fetch.py:204-253`, `tools/tests/test_fetch.py:142-155` (FakeIso), `tools/az/pict.py`, `PLAN.md:40`.

What: coverage.py: iso9660.py 16%, fetch.py 58%, pict.py 63%, total 74%. The real Iso class is never tested; fetch() orchestration (listing, declared-size skip, cache key, ISO vs zip branch, failure count and exit code) has no test; pict.py is imported only by its own test yet listed in the pipeline.

Proposal: `fixtures.build_iso(files: dict[str, bytes])` writing a PVD at sector 16, a root directory, one subdirectory and a directory record forced across a sector boundary; test Iso.walk, read_file, the '.'/'..' skip and the extent-loop guard. Test fetch() end to end with monkeypatched `fetch._get` and `fetch._list_item`. Either wire pict.py into emit (PICT backdrops in .rsrc/.pct) or delete it with test_pict.py and update PLAN.md (T-11). D-09's optional PICT export would give it a use.

### T-17 **audio.ts race handling and store.ts LRU eviction are untested**
Severity: low · Effort: M · Value: 2/5 · Risk: 2/5

Where: `web/audio.ts:14`, `web/audio.ts:17`, `web/audio.ts:60-69`, `web/audio.ts:83-94`, `web/audio.ts:96-125`, `web/audio.ts:138-143`, `web/store.ts:90-135`, `web/store.test.ts`.

What: TankAudio's ambient-loop races (ambientGen, ambientWanted, the resume retry, the addWavs restart) and trimPacks' 150 MB LRU have 0% and ~35% coverage; only capSnds is tested. B-17, B-18, B-19, B-30 and B-40 all change this code.

Proposal: Extract pure `pickSound(importedMap, bundledMap, subs)` (find's rules) and `tapZone(x, y, w, h)` into `web/audiopick.ts` with table tests. `web/testing/fakeaudio.ts`: a FakeAudioContext with controllable state, deferred resume(), decodeAudioData and a createBufferSource spy (shared by the audio tests proposed in B-17, B-19, B-40, F-05); test startAmbient while suspended then resume gives exactly one loop, load() during a pending resume gives none, a new 'aqua' restarts once. devDependency fake-indexeddb, an injectable pack budget, and tests for packPut/trimPacks eviction order and packDelete (with B-30's evictionPlan).

### T-18 **The page-to-page bus protocol is untyped and has a dead message**
Severity: low · Effort: M · Value: 2/5 · Risk: 2/5

Where: `web/bus.ts:4` (`type BusMsg = Record<string, unknown>`), `web/main.ts:516-551`, `web/main.ts:519` (casts m.item), `web/main.ts:601` (posts 'uninstalled'), `web/main.ts:607-615`, `macos/Finsical.swift:335`, `macos/Finsical.swift:343`.

What: Each page matches op strings and re-validates by hand, so nothing checks senders and receivers agree. 'uninstalled' is posted but handled nowhere (overview.ts mentions it in a comment; the Swift relay checks only dragWindow and state); B-37 gives it a handler.

Proposal: `web/protocol.ts` with discriminated unions TankToClient ('state' | 'thumbs' | 'installed' | 'installFailed' | 'uninstalled') and ClientToTank ('hello' | 'install' | 'removeFish' | 'removeAddon' | 'wantThumbs' | 'crtEnabled' | 'crtConfig' | 'machine' | 'soundsLoaded' | 'dragWindow'), plus `parseClientMsg(unknown): ClientToTank | null` validating every field (S-07's isImportable for items). Make openBus generic and use an exhaustive switch with a `never` check in onBusMessage. Unit-test validators with malformed payloads.

### T-19 **fetch.py deletes an earlier run's numbered bundles even when the current source emits nothing**
Severity: low · Effort: S · Value: 1/5 · Risk: 1/5

Where: `tools/fetch.py:86-99` (stale-sibling cleanup at :92-97 runs before the is_pack/has_sounds checks).

What: Run 1 emits out/Foo.azpack and out/Foo-2.azpack; a later `_emit_source('Foo.bin', b'not importable', 'out')` returns None but leaves only Foo.azpack (reproduced).

Proposal: Clean stale siblings only after a successful emit of the base name, or collect emitted base names and clean orphans once at the end of fetch(). Add the repro as a test next to test_rerun_drops_orphaned_numbered_bundles.

### T-20 **Tool input validation uses assert, and the ISO reader never closes its file**
Severity: low · Effort: S · Value: 1/5 · Risk: 1/5

Where: `tools/az/img.py:7`, `tools/az/img.py:11`, `tools/az/img.py:15`, `tools/az/iso9660.py:6-11`, `tools/fetch.py:242`.

What: read_bmp and Iso.__init__ validate untrusted content with assert (reserved for internal invariants by AGENTS.md): under `python -O` garbage decodes (read_bmp(b'XX' + bytes(60)) returns a 0x0 image; a zero-filled file passes Iso() then fails with TypeError); without -O a bare AssertionError has no message. Iso opens self.f with no close; ResourceWarnings appear in the suite.

Proposal: Raise ImgError and IsoError (ValueError subclasses) with messages ('not a BMP', 'unsupported DIB header size N', 'not ISO9660'); give Iso close(), __enter__ and __exit__ and use `with Iso(path) as iso:` in fetch.py. Tests assert the specific errors, including one run under `python3 -O -m unittest tools.tests.test_img`.

### T-21 **fetch.py's docstring has an invalid escape sequence (SyntaxWarning on every run on 3.12+)**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `tools/fetch.py:2-13` (`--include '\.zip$'` in a non-raw docstring, also argparse's description at :262).

What: `uvx --python 3.13 python tools/fetch.py --help` prints 'SyntaxWarning: invalid escape sequence' every run (compiled fresh as __main__); a future Python makes it an error.

Proposal: Make the docstring raw (`r"""…`) and run the Python tests in CI with `-W error::SyntaxWarning`.

### T-22 **tools/fetch.py skips food packs: it lists '.fod' instead of '.fd'**
Severity: low · Effort: S · Value: 1/5 · Risk: 1/5

Where: `tools/fetch.py:36-37` (IMPORTABLE), `tools/fetch.py:140`.

What: No AquaZone file uses '.fod'; food packs are .fd/.FD (allfoodsandmeds.zip, JPN 餌セット), so every one is silently skipped. No impact today (nothing consumes food bundles).

Proposal: Replace '.fod' with '.fd' and add '.dna' (F-23's Power Updater packs). Test in test_fetch.py: a zip containing a minimal pack named 'flake.fd' yields one bundle. Once F-01 lands, emitted manifests carry chunk types (food bundles identifiable).

### T-23 **tools/fetch.py reads Shift-JIS zip entry names as CP437, unlike the TypeScript reader**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `tools/fetch.py:85-91`, `tools/fetch.py:146-171` (`norm = zi.filename.replace('\\', '/')` at :150), `core/data/zip.ts:38-68`.

What: JPN archives store Shift-JIS names without the UTF-8 flag. zip.ts tries UTF-8 then shift_jis; Python's zipfile falls back to CP437, so `fetch.py aquazone-jpn-set` emits 'âOâbâsü[1.azpack' instead of 'グッピー1.azpack'. Shift-JIS trail bytes can be 0x5C (ソ = 83 5C), so backslash normalization must run after re-decoding.

Proposal: `_entry_name(zi)`: return zi.filename if `zi.flag_bits & 0x800`; else `raw = zi.orig_filename.encode('cp437')`, try `raw.decode('utf-8')`, then `raw.decode('shift_jis')`, fall back to zi.filename (works on 3.9, unlike metadata_encoding). Compute `norm = _entry_name(zi).replace('\\', '/')` only after decoding. Test `test_sjis_entry_names`: raw SJIS names 'グッピー1.fsh' and 'ソ.fsh' with flag 0x800 clear give bases 'グッピー1' and 'ソ'; add to T-07's corpus notes.

### T-24 **No Web Inspector in native builds; missing bundled files fail as network errors instead of 404s**
Severity: low · Effort: S · Value: 3/5 · Risk: 1/5

Where: `macos/Finsical.swift:8-12` (MIME map), `macos/Finsical.swift:28-52` (WebHandler: didFailWithError at :50-52), `macos/Finsical.swift:83-86` (client prepare closure), `macos/Finsical.swift:110-116`, `macos/Finsical.swift:468`.

What: Nothing sets `isInspectable`, and apps built with a current SDK are not inspectable by default, so native-only bugs (relay, masks, WKWebView quirks) cannot be debugged. A missing file makes the handler fail the task instead of answering 404, which only changes console text (packFetch treats both the same).

Proposal: `if #available(macOS 13.3, *) { v.isInspectable = UserDefaults.standard.bool(forKey: "FinsicalWebInspector") }` for the tank after :468 and for clients in the prepare closure; document `defaults write dev.finsical.app FinsicalWebInspector -bool YES` (T-02, T-12). Optional: answer a missing file with `HTTPURLResponse(statusCode: 404)` and an empty body (403 for traversal attempts; traversal is already handled correctly). Skip a UTType MIME rewrite (everything is read as ArrayBuffer), except adding webp for P-11.

### T-25 **Info.plist is missing standard keys**
Severity: nit · Effort: S · Value: 1/5 · Risk: 1/5

Where: `macos/Info.plist:1-22`.

What: Only CFBundleExecutable, CFBundleIconFile, CFBundleIdentifier, CFBundleName, CFBundlePackageType, CFBundleShortVersionString, CFBundleVersion and LSMinimumSystemVersion are present.

Proposal: Add CFBundleInfoDictionaryVersion 6.0, CFBundleDevelopmentRegion en, CFBundleDisplayName Finsical, NSHumanReadableCopyright ('Public domain (Unlicense). AquaZone art © 9003inc, fetched from the Internet Archive.', feeding the standard About panel), LSApplicationCategoryType public.app-category.entertainment, NSHighResolutionCapable true. A CI PlistBuddy assertion that the keys exist.

### T-26 **Test output is noisy and leaks file handles**
Severity: nit · Effort: S · Value: 1/5 · Risk: 1/5

Where: `web/import.test.ts:87-98`, `tools/tests/test_fetch.py:226`, `tools/tests/test_fetch.py:230`, `tools/tests/test_img.py:52`.

What: Green runs print 24 'archive.org listing failed' stack traces, ResourceWarning 'unclosed file' at the cited lines, and unasserted stderr ('skipped, total byte budget exhausted', 'snd resources present but none decodable'), which hides real failures.

Proposal: Spy on console.warn in import.test.ts and assert the calls (T-09); use Path.read_bytes() or `with open` in the Python tests; wrap expected-stderr tests in `contextlib.redirect_stderr(io.StringIO())` and assert the text; run the Python suite with `-W error::ResourceWarning` in CI.

### T-27 **Machine-specific JetBrains Java config is committed in .idea/**
Severity: nit · Effort: S · Value: 1/5 · Risk: 1/5

Where: `.idea/Finsical.iml`, `.idea/misc.xml` (JDK_23, 'openjdk-23 (2)'), `.idea/checkstyle-idea.xml` (Sun and Google Java checks), `.idea/noctule.xml` (absolute Xcode toolchain path), `.gitignore`.

What: 7 tracked files irrelevant to a TypeScript, Swift and Python repo. The maintainer committed them deliberately and some JetBrains users share .idea, so ask first.

Proposal: With the maintainer's agreement: `git rm -r --cached .idea` and add `/.idea/`, `coverage/`, `playwright-report/`, `test-results/` to .gitignore.

### T-28 **Asset CLI emits raw chunk files nothing reads, and same-named inputs overwrite each other**
Severity: nit · Effort: S · Value: 1/5 · Risk: 1/5

Where: `tools/az/emit.py:70-77` (writes chunks/*.bin), `tools/azpack.py:32-34` (output dir from basename), `core/data/azpack.ts:175-185`, `macos/Makefile:33` (copies web/pack wholesale).

What: The loader only reads sprites images, decor images and sounds; chunks/*.bin are never read but inflate a bundled Finsical.app. a/Foo.fsh and b/Foo.fsh map to the same out/Foo and the second silently overwrites the first (fetch.py already suffixes -2).

Proposal: A `--raw` flag on emit (off by default) for chunks/. In azpack.py reuse fetch._emit_source-style suffixing (Foo, Foo-2) and log each collision.

### T-29 **Idea: publish the web build to GitHub Pages as 'Try Finsical in your browser'**
Severity: idea · Effort: S · Value: 4/5 · Risk: 2/5

Where: `.github/workflows`, `README.md`, `scripts/build-web.mjs` (T-15), `web/main.ts:825-866`.

What: The tank and client windows already work in a browser over BroadcastChannel, and archive.org sends access-control-allow-origin for download and view_archive URLs (checked with an l-k-m.github.io Origin). Pages would give a no-install, no-Gatekeeper trial, including on Intel, Linux and Windows. Nothing in the browser links to prefs.html or overview.html today.

Proposal: `.github/workflows/pages.yml`: on push to main, npm ci plus T-15's complete build, then actions/upload-pages-artifact and actions/deploy-pages (pinned SHAs; permissions pages: write, id-token: write). A browser-only way to open the client pages (U-14's menu bar, or bare P and O keys opening named tabs via the existing stats-tab logic at main.ts:836-866). Link 'Try it in your browser' from the README; add V-17's viewport meta; smoke-test the deployed page with T-06.

## Delightful and quirky ideas

### D-01 **Fish rest at night: slower, lower, tails barely moving, woken by a tap**
Severity: idea · Effort: S · Value: 3/5 · Risk: 2/5

Where: `core/sim.ts:182-197`, `core/sim.ts:248-371` (tickFish never reads light), `core/sim.ts:367-370` (bubbles), `core/sim.ts:378-393` (decide/bandY), `web/main.ts:399-401`, `web/main.ts:1016-1025`, `web/overviewmodel.ts:44-47`.

What: Night only darkens the overlay; fish swim exactly as by day. Real fish settle low and barely fin. Only meaningful once B-09/F-08 give the cycle a real night.

Proposal: A derived flag, not a new FishState (turn/startle/seek logic untouched). Add `Fish.wakeUntil` (default 0). In the drift/seek branch `asleep = light < 0.45 && tickCount >= f.wakeUntil && f.hunger < 0.8` (light from `sim.setLight(v)` when F-08 drives it). Asleep: cap speed at cruise*0.3, re-decide every MOVE_TICKS*3, pull bandY into the lowest quarter (maxY-40..maxY-8), bubble chance x0.3. tap(), propagated panic and pointer activity over the tank set `wakeUntil = tickCount + 30*60`, so a watched tank looks awake. postState sends `asleep: true`; Overview shows 'Sleeping'; animFrame rate x0.25 while asleep; optionally a 3x3 pixel 'z' rising every ~8 s from one sleeper. Tests (sim.test.ts, light forced 0.3 vs 1.0 over 3000 ticks): lower mean speed and deeper mean y at night; after tap() the fish startles then swims at day speed; a sleeping fish still seeks food above hunger 0.8; determinism holds.

### D-02 **Fish gather at the glass where the pointer rests**
Severity: idea · Effort: S · Value: 3/5 · Risk: 2/5

Where: `core/sim.ts:378-393`, `web/main.ts:100-111` (no pointermove handler).

What: Real fish crowd the front glass when someone comes close, expecting food.

Proposal: Sim gains `lure: {x, y} | null` and `lureSince`. In decide(), when lure is set, the fish is not seeking, not startled in the last 300 ticks (`f.lastStartle` set in tap/panic), `tickCount - lureSince < 600` (curiosity fades after 20 s of a still pointer) and `rand() < 0.6`: target lure.x +/- 15, lure.y +/- 10, bandY = lure.y. main.ts pointermove (U-03's mapToTank) sets sim.lure and bumps lureSince only after > 4 logical px of movement; pointerleave clears it. A pure `lureActive(sim)` for the expiry rule. Verify in WKWebView that mousemove arrives while another app is frontmost. Tests: with a lure fixed at tick 0, mean distance over ticks 100-550 is lower than the same seed without a lure; after tick 700 targets are unbiased; null lure leaves existing tests untouched.

### D-03 **Schooling for small same-species fish, and separation so fish don't stack on a pellet**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `core/sim.ts:205-227` (only panic propagation reads other fish), `core/sim.ts:289-297` (every seeker targets the exact pellet), `core/sim.ts:378-393`, `web/main.ts:83-89`, `web/main.ts:138-150`.

What: Five neon tetras wander as unrelated individuals, and several fish chasing one pellet are drawn on top of each other.

Proposal: `addFish` accepts `schooling?: boolean`, saved in the saveTank whitelist. main.ts sets it at spawn when the cell is small (max(cellW, cellH) < 70) or the common name (F-02) matches /tetra|neon|rasbora|cardinal|danio|guppy|molly|pencil/i. In decide(), with >= 3 living schooling fish sharing f.pack, the lowest id leads and decides normally; followers with probability 0.75 take tx = leader.tx +/- 15, ty = leader.ty +/- 8, bandY = leader.bandY; a follower whose leader is removed picks the next lowest id. Separation in drift/seek: for each neighbour within 0.6*(halfW_a + halfW_b) (fixed radius until B-01's extents), nudge heading away by up to TURN_RATE/2 (O(n^2), fine below 50 fish). Seekers offset their target by a per-fish angle around the pellet. Use only this.rand(). Tests: 6 schooling fish end with lower mean pairwise distance than the same seed unschooled; after a feeding no two centres stay closer than 4 px for > 10 ticks; a lone schooling fish behaves as today; determinism.

### D-04 **Clickable case hardware: floppy slot imports, brightness knob, power button, CD slot, speakers**
Severity: idea · Effort: M · Value: 4/5 · Risk: 2/5

Where: `web/machines.ts:27-45`, `web/machines.ts:62-104`, `web/main.ts:735-764`, `web/main.ts:776-788` (drag handler already skips buttons at :782-784), `web/app.css:28-30` (#machine pointer-events none), `web/machines.test.ts`.

What: The art shows real controls, but every press on the case drags the window. Measured viewBox rects (overlaid on the PNGs and verified): Plus floppy bezel ~{x:388, y:703, w:359, h:79}, Plus brightness sun ~{x:85, y:965, w:50, h:50}, Plus badge ~{x:74, y:712, w:236, h:53}; iMac Bondi power ~{x:985, y:885, w:46, h:46}, CD slot ~{x:569, y:862, w:371, h:55}, speakers ~{x:301, y:839, w:170, h:170} and {x:1042, y:839, w:170, h:170}, Apple logo ~{x:645, y:5, w:55, h:45}.

Proposal: `Machine.hotspots?: { x, y, w, h, act: 'import' | 'brightness' | 'power' | 'mute' | 'about' | 'jukebox'; tip: string }[]` in viewBox units, starting with plus and imac-bondi. A `?hotspots` debug query outlines them. layoutMachine positions a new #hotspots layer (z-index above #machine, pointer-events none) whose transparent `<button>` children (pointer-events auto, aria-label and title from tip) use the same s/ox/oy transform. Actions: import opens Import Add-ons with a slot-insert sound (a file dropped on the floppy plays a disk-slide animation before the drop handler); brightness is a vertical drag on cfg.brightness (or F-29's filter when the CRT is off); power sleeps the display (D-06); mute toggles F-05's master gain; about opens A-04; jukebox opens F-05's player; an LED sprite (Performa) can flicker while archive.org fetches are in flight. Test (machines.test.ts): every hotspot lies inside the viewBox and the opaque art, and never intersects `hole`.

### D-05 **Startup screen with a 'Happy Fishbowl' and a Mac OS extensions parade of add-ons**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:253-270`, `web/main.ts:321-332`, `web/main.ts:875-900`, `web/main.ts:1047-1061`, `web/main.ts:1126-1142`, `web/import.ts:1231-1246`.

What: On launch the tank shows placeholders (or wrong species, B-14) while add-ons restore, then art pops in. A Mac OS 8 style boot would turn the wait into a moment.

Proposal: New `web/boot.ts`, a pure state machine driven by elapsed ms and a restoreDone flag: 'black' plus 'desktop' (~600 ms total; grey, a 1-bit 50% dither on the Plus), 'parade', 'fade' (400 ms); drawn into the tank ctx instead of render() while active so CRT mode applies. An original 32x32 smiling fishbowl icon (not Apple's Happy Mac) and on colour machines a small 'Welcome to Finsical' box. Parade: when each restored add-on's handler fires, draw its thumbnail at `paradeSlot(i) = {x: 8 + (i % 9) * 34, y: 160 - floor(i / 9) * 30}`. Hide fish until it ends; end at restore completion plus 400 ms or a 6 s cap; a click or key skips; skip entirely with no saved add-ons or under prefers-reduced-motion. Chime: an original synthesized soft chord (3 triangle oscillators, 1.5 s exponential decay); Apple's startup chime is a registered sound trademark. Prefs checkbox 'Show startup screen' (finsical:boot, default on). Tests: phase transitions and paradeSlot wrapping in boot.test.ts.

### D-06 **CRT power-on bloom, power-off collapse, a degauss wobble and Energy Saver display sleep**
Severity: idea · Effort: M · Value: 3/5 · Risk: 3/5

Where: `web/crt.ts:24-145` (FRAG), `web/crt.ts:318-354` (setEnabled toggles in one frame), `web/main.ts:665-675`, `web/main.ts:703` (setCrt at launch from the stored pref), `web/main.ts:766-773`, `web/main.ts:1130-1142`, `web/audio.ts:150-156`.

What: Switching the tube on or off and changing machines are instant cuts. Real tubes bloom open, collapse to a line and a dot, and Apple monitors 'BWONG' with a rainbow wobble when degaussing.

Proposal: (a) Effects: `enum CrtToggleSource { User, Restore }` as setCrt's second parameter (the launch call at main.ts:703 passes Restore, so no degauss on every launch). FRAG gains `uniform float uPower; uniform float uDegauss;`: before the bounds check `float vy = max(uPower*uPower, 0.004); uv.y = (uv.y-0.5)/vy+0.5; uv.x = (uv.x-0.5)/clamp(uPower*4.0,0.02,1.0)+0.5;` and colour x `1.0 + (1.0-uPower)*2.0`; degauss `uv.x += sin(uv.y*40.0 + uTime*60.0) * 0.008 * uDegauss`, conv x (1 + 6*uDegauss), colour x (1 + 0.3*uDegauss) or a per-channel rainbow term. CrtFilter gains powerOn(ms), powerOff(ms): Promise<void> and degauss(), animated from pure exported envelopes `powerCurve(t)` and `degaussAmp(t)` (exponential decay, 0 after ~0.6-1.2 s). setCrt keeps one 'pending' token so a toggle during powerOff cancels and applies the latest state. CSS keyframes on #screen (scaleY 0.01 plus brightness(3)) when the CRT is off. Triggers: machine change, the CRT turning on by the user, Tank > 'Degauss', bare D in the browser. Sound: TankAudio.degauss() synthesizes a 60 ms 55 Hz thump plus a decaying high whine (or 50 Hz sawtooth through a 300 Hz lowpass), played only when `ctx.state === 'running'`. Skip wobble and collapse under prefers-reduced-motion. (b) Energy Saver: Prefs slider 'Sleep the display after 5-60 min / Never'; on idle (no pointer, key or bus intent other than hello/wantThumbs) play powerOff and skip render()/crt.render() while `setInterval(…, 1000/30)` keeps sim.tick() running; any activity wakes with powerOn. Tests: envelope values in crt.test.ts; a manual check with the C key.

### D-07 **'Please don't tap on the glass' alert after a knocking spree**
Severity: idea · Effort: S · Value: 3/5 · Risk: 1/5

Where: `web/main.ts:100-111`, `core/sim.ts:182-197`, `web/import.ts:545-559` (the .ov overlay closes on outside press), `node_modules/osmium-ui/README.md` (alerts 'Not included yet').

What: Every public aquarium has the sign; a Platinum alert is a cheap, very Mac joke that teaches restraint.

Proposal: main.ts keeps `tapTimes`; a pure `shouldScold(times, now, lastShownAt)` in `web/scold.ts` is true for >= 6 taps within 8 s and not shown in the last 30 minutes. Show a modal dialog (U-02's alert module): no title bar, var(--osm-dialog) face with the Mac OS 8 double inner frame, an original 32x32 caution icon, 'Please don't tap on the glass. It frightens the fish.' in Charcoal 12, an osm-default OK bound with bindDialogKeys, on a full-window scrim that swallows clicks. Taps are ignored while open. Optional: `sim.fearAt = {x, y, until}` makes decide() reroll targets within 40 px of that spot for a minute. Tests: shouldScold with 5 taps, taps spread over 9 s, and the cooldown.

### D-08 **Stereo-positioned tank sounds with varied bubbles**
Severity: idea · Effort: S · Value: 3/5 · Risk: 1/5

Where: `web/audio.ts:99-126`, `web/audio.ts:128-148`, `web/main.ts:106-110`, `web/main.ts:794-797`.

What: Every splash, bubble and knock plays dead centre at a fixed gain.

Proposal: Route everything through F-05's master gain. play() takes an optional pan and inserts a StereoPannerNode (WebKit 14.1+, fine for macOS 12). feed(x), bubble(x) and tap(x, …) pass `pan = clamp(x/320*1.6 - 0.8, -0.8, 0.8)`; render() passes the newest bubble's x via `sim.bubbles[sim.bubbles.length - 1]` (not `.at(-1)`, which needs Safari 15.4); feedFish passes TANK.width/2. Bubbles get playbackRate 0.94-1.06 at random. Test: the pure pan mapping and a volume clamp.

### D-09 **Copy Picture and Save 'Picture 1' (optionally as a real PICT)**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `macos/Finsical.swift:578-585` (Edit > Copy maps to NSText.copy; the page has no selection), `web/main.ts:798-800`, `tools/az/pict.py`.

What: People will want to share their tank. Mac OS named screenshots 'Picture 1', 'Picture 2'.

Proposal: Native with the case and CRT: `WKWebView.takeSnapshot(with:)` of the whole window to NSImage, written to NSPasteboard.general ('Copy Picture', Shift-Cmd-C) or saved via NSSavePanel as '~/Desktop/Picture N.png' (first free N), with a shutter click and a one-frame white flash. Without the case: `window.finsical.snapshot(scale = 2)` returns a nearest-neighbor 2x PNG of the 320x200 frame. Browser: bare P uses `navigator.clipboard.write([new ClipboardItem({'image/png': blob})])` inside the key gesture, falling back to a download. Optional low-priority PICT v2 writer (0x0011 version, 0x0C00 header, 0x0098 PackBitsRect with an 8-bit clut), round-trip tested through tools/az/pict.py (gives T-16's pict.py a use).

### D-10 **Messages in bottles that sink into the tank with tips and trivia**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:100-111`, `web/main.ts:825-868`, `web/statsmodel.ts:86-116`.

What: Most features are invisible (bare F, C and S, the feed band, Cmd-I); the only in-app guidance is the Stats care advice.

Proposal: New `web/tips.ts`: ~25 tip strings plus dynamic ones from F-02 ('Your angelfish Scott hatched at Franks Fish Farms in 1997'), and a pure scheduler `nextBottleAt(now, lastShown, rng)` (first after 10 min, then every 30-90 min, never while the display sleeps or at night). A render-only bottle in main.ts (original 8x14 sprite with cork and note) sinks with a slight sway and rests on the gravel; pointerdown hit-tests it before the feed/tap branch and opens a small overlay window (.ov + mountWindow); seen tips go to localStorage `finsical:tips-seen` (try/catch) so none repeats until all are shown. Prefs toggle 'Messages in bottles'. Tests: scheduler bounds and no-repeat order.

### D-11 **Seasonal surprises and fish birthdays (party hats on hatch day)**
Severity: idea · Effort: M · Value: 2/5 · Risk: 2/5

Where: `web/main.ts:1031-1044`, `web/main.ts:1071-1124`.

What: No Date use exists in the render or the sim. Small date-based touches make a desk toy worth leaving open, and F-02 provides real hatch dates (Scott 1997-09-24, Melissa 1997-07-04, Robert 1999-12-13).

Proposal: Pure `web/seasons.ts` `eventsOn(date, fish)` returning event ids plus per-fish birthday flags (Feb 29 birthdays celebrate on Feb 28 in non-leap years), with an injectable now. Hooks: a jack-o'-lantern (original 16x14 sprite on the gravel, additive orange glow at night) Oct 24-31; ten bulbs along the rim cycling 4 colours every 15 ticks Dec 20-26; coloured bubble bursts from the gravel from 23:59:50 Dec 31 until 00:05; a bottle message (D-10) on January 24 (the Macintosh's birthday). Birthday: a 5x6 hat at the head (`x + facing*w*0.28, y - h*0.35`, rotated with the drawn tilt), a confetti burst on the first view that day, and 'Happy birthday!' in Get Info; compare the UTC-formatted hatch date with the local date. Prefs toggle 'Seasonal surprises'. Tests: eventsOn for fixed dates, the leap-day rule and the midnight boundary.

### D-12 **Algae on the glass, a sponge to wipe it, and a snail that grazes**
Severity: idea · Effort: M · Value: 3/5 · Risk: 3/5

Where: `web/main.ts:1111-1116` (murk is one full-tank fillRect), `core/sim.ts:228-240`, `web/main.ts:100-111`.

What: Water quality shows only as a uniform tint. Patchy algae that grows faster in poor water, a sponge ritual and a lazy snail companion give hands-on care.

Proposal: Pure `web/algae.ts`: an 80x50 Float32 grid (4-px cells); `step(grid, quality, rng)` grows film ~1/54000 per tick per cell with patchy noise, much slower above quality 0.7; `wipe(grid, x, y, r)`; `snailStep(snail, grid, rng)` a 0.1 px/tick random walk biased toward dirtier cells, clearing radius 2. Keep the grid in an 80x50 canvas repainted via putImageData at most once per second or after a wipe, drawn each frame with one drawImage scaled 4x (smoothing off, pre-dithered 2x2 Bayer green-brown at alpha film*0.35), before day/night. Sponge: Option-drag over the glass (pointerdown with altKey enters wipe mode, suppressing tap and feed; pointermove wipes) with a sponge cursor and a synthesized squeak. Snail: an original 12x9 two-frame sprite offered as a built-in pseudo add-on in Overview. Persist the grid as base64 bytes in `finsical:algae` on save. Tests: growth bounded in [0,1], wipe clears the radius, the snail reduces total film over time.

### D-13 **Shake the window to stir the tank like a snow globe**
Severity: idea · Effort: M · Value: 3/5 · Risk: 3/5

Where: `macos/Finsical.swift:306-310` (windowDidMove only saves the frame), `node_modules/osmium-ui/macos/OsmiumWindows.swift:331-342` (performDrag), `core/sim.ts:182-197`, `core/sim.ts:241-245`.

What: Grabbing the machine and shaking it should slosh the tank: fish dart, food and bubbles scatter, sand swirls up and settles. It is unverified whether windowDidMove fires continuously during a performDrag.

Proposal: Prototype detection first: on the dragWindow op start a 60 Hz Timer sampling `window.frame.origin` until `NSEvent.pressedMouseButtons == 0`; compare with windowDidMove samples and keep whichever is continuous. Detect >= 3 direction reversals above 1500 pt/s within 700 ms, then evaluate `window.finsical.shake(k)` (k 0..1 from peak speed), throttled to one call per 400 ms. Browser: DeviceMotionEvent acceleration > 15 m/s2 on touch (permission on iOS), else bare K for testing. Sim `stir(k)`: startle every fish away from the centre at 3*k, displace food and bubbles by +/-10*k, waterQuality -= 0.03*k, spawn 40*k silt particles {x, y, vx, vy} from the gravel that decelerate and sink within ~6 s (a sim list, deterministic). Render silt as 1-px sand dots; a lowpassed-noise slosh sound. Tests: stir startles every fish; silt returns to 0 within 200 ticks; determinism.

### D-14 **A fish net to pick up and move fish, and a scoop animation on removal**
Severity: idea · Effort: M · Value: 3/5 · Risk: 3/5

Where: `core/sim.ts:167-172` (removeFish splice), `core/sim.ts:210-227`, `core/sim.ts:248-265`, `web/main.ts:520-521`, `web/overview.ts:105-120`, `web/overviewmodel.ts:44-47`.

What: Removing a fish in Overview makes it vanish in one frame, and fish cannot be moved.

Proposal: A new FishState 'held': tickFish returns early (no movement, no clamp); panic propagation skips held fish; `hold(id)`, `moveHeld(x, y)`, `release()` (clamps into bounds, startles with a small speed, adds 6 bubbles). saveTank never saves state, so no serialization change; add 'held' to overviewmodel STATES ('In the net') and statsmodel. main.ts: hit-test with the shared per-frame fish rects (A-05); press-and-hold 300 ms without moving > 3 px on a fish enters net mode, drawing the fish inside an original 20x14 net sprite following the pointer; release plays audio.splash() panned (D-08). Removal: a 1 s render-only scoop (net from the top down to the fish, both rise out with a splash), then sim.removeFish, sweepThumbs and saveTank. Tests: a held fish does not move over 100 ticks; release clamps a fish dropped outside the bounds.

### D-15 **Fish learn your feeding time and gather at the surface before dinner**
Severity: idea · Effort: S · Value: 2/5 · Risk: 2/5

Where: `web/main.ts:109`, `web/main.ts:794-797`, `web/statsmodel.ts:86-116`.

What: Real fish learn feeding schedules. No feeding history is kept. Hunger saturates in ~20 minutes, so users feed many times per session.

Proposal: On each feed record at most one entry per 2-hour local window per calendar day (localStorage `finsical:feeds`, 30 days). Pure `web/habit.ts` `habitualFeedMinute(entries)`: the circular mean of the densest +/-45 min cluster when it spans >= 3 distinct days (handles midnight wraparound), else null. From 10 min before to 15 min after, while average hunger > 0.3, set D-02's `sim.lure = {x: TANK.width/2, y: 30}` with lureSince refreshed so curiosity does not fade. Stats advice: 'Your fish expect dinner around 6:30 PM.' Tests: circular mean across 23:50/00:10; thresholds; 10 feeds in one afternoon count as one entry.

### D-16 **Stickies notes on the case bezel**
Severity: idea · Effort: S · Value: 2/5 · Risk: 2/5

Where: `web/main.ts:735-764`, `web/main.ts:776-788` (drag handler already excludes textarea and [contenteditable] at :783-784), `web/machines.ts:37-40`.

What: Mac OS 7.5-9 users stuck Stickies everywhere; a pale-yellow 'Feed Scott!' note on the monitor bezel is a sweet personal touch.

Proposal: Tank > New Note (native) or bare N (browser) creates a div with a 12-px title strip (close box, drag handle) and a textarea in Geneva 10, #ffff99 with a 1-px black border; right-click on the strip cycles six Stickies colours. Store notes in viewBox units `{vx, vy, w, h, text, color}[]` in localStorage `finsical:notes`; layoutMachine maps them with the same s/ox/oy so they stay glued across resizes and machine swaps. Clamp rects to the opaque bezel (viewBox bounds minus the hole with a margin, inside the silhouette, since the native window mask clips anything outside the alpha); the lower chin is wide on every machine. Strip drags use pointer capture with stopPropagation. Test: the viewBox-to-px mapping and the clamp.

### D-17 **New fish splash in from the surface, removed fish swim off**
Severity: idea · Effort: M · Value: 3/5 · Risk: 2/5

Where: `web/main.ts:138-150` (spawn at random mid-tank y at :141-142), `web/main.ts:520-521`, `core/sim.ts:148-172`.

What: New fish simply appear mid-tank and removed ones vanish, so without sounds you often cannot tell what happened.

Proposal: Entry: spawnFish sets y = 26 (SURFACE + MARGIN), state 'startle', vy 1.5, speed 1, pushes 6 bubbles at the entry x plus U-03's surface ripple, and shows a 2 s balloon 'Welcome, Samantha' (F-02). Exit: keep sim.removeFish immediate so persistence and Overview stay truthful; before splicing, main.ts copies the fish's current frame, position and facing into render-only `ghosts: {cv, x, y, vx, t}[]` that swim at 2x cruise toward the nearer side wall (no margins), drawn after the fish and dropped off-screen or after 200 frames. Test: a pure `stepGhost()` in `web/ghosts.ts` exits within 200 steps.

### D-18 **Dock menu, hunger badge, a menu-bar fish and Open at Login**
Severity: idea · Effort: M · Value: 3/5 · Risk: 3/5

Where: `macos/Finsical.swift:69-71`, `macos/Finsical.swift:329-374` (relay parses state only for `machine`), `macos/Finsical.swift:538-543` (activation policy `.regular`), `macos/Finsical.swift:543-577`, `web/main.ts:398-401`, `web/statsmodel.ts:45-47`.

What: The Dock icon does nothing special, a hidden tank has no quick controls, and a desk toy wants to start with the Mac and optionally stay out of the Dock. The state push already carries fish hunger.

Proposal: (1) `applicationDockMenu(_:)` returning Feed Fish, Tank Stats, Import Add-ons…, Float Above Other Windows (checkable, U-16), calling `NSApp.activate()` before host.show. (2) postState adds a compact `summary: { hungriest: string | null, hungerLabel, needsFood: boolean }` from statsmodel.deriveStats (HUNGER_FEED 0.55; reuse HUNGER_STARVING rather than duplicating thresholds in Swift); on change set `NSApp.dockTile.badgeLabel = needsFood ? "!" : nil`, behind 'Show Hunger in Dock' (default off); optionally `requestUserAttention(.informationalRequest)` once when all fish are starving and the app is inactive (a nod to the Notification Manager). (3) An NSStatusItem with a 16x16 template fish (drawn at launch, isTemplate) or, better, fish 0's current frame posted every 500 ms over the thumbs path so it swims; its menu: the info line, Feed Fish, Show/Hide Tank, Ghost Mode (F-28), Preferences, Quit. (4) 'Show in Dock' preference toggling `setActivationPolicy(.regular/.accessory)` (the accessory policy drops the main menu, so the status menu must mirror the Tank menu and Preferences). (5) 'Open at Login' via `SMAppService.mainApp.register()/unregister()` behind `if #available(macOS 13, *)`, hidden on 12. Manual tests: toggle the preferences and relaunch; all actions still work.

### D-19 **iMac-shaped fish and matching iMac backgrounds for the iMac G3 cases**
Severity: idea · Effort: S · Value: 3/5 · Risk: 1/5

Where: `web/machines.ts:27-45`, `web/machines.ts:96-160`, `web/prefs.ts:269-312`, `web/import.ts:65-88`.

What: The 7z's 'Spare interesting things/iMacs and Tama fish/' folder has fan-made fish shaped like iMac G3s (Blueberry, Grape, Grey, Ivory, Lime, Orange, Strawberry, Yellow, black; iMacFish-Love/NeonGreen/Strawberry with eggs) and 'Terrible iMac backgrounds' (BONDAI, Blueberry, GRAPE, LIME, Strawberry, Tangeline, WHITE). StrawberryImacs.fsh (1,371,912 B) decodes into 8 sheets: a red translucent iMac with its cable as the tail. Finsical ships Bondi, Strawberry and Flower Power iMac cases.

Proposal: After F-21, collections for prefix 'addons Aquazone/Spare interesting things/iMacs and Tama fish/' (/\.fsh$/i, fish) and '…/Terrible iMac backgrounds/' (/\.bmp$/i, backgrounds). `companion?: { fish?: string; background?: string }` on Machine: imac-strawberry(-2) -> fish 'StrawberryImacs', background 'Strawberry'; imac-bondi(-2) -> background 'BONDAI' (Blueberry is the nearest fish); Flower Power none. In prefs.ts, when the selected machine has an uninstalled companion (state.addons), one caption line points to Import Add-ons > iMac fish. Easter egg: installing the matching fish plays audio.splash() and drops it in from the surface (D-17). Test: machines.test.ts that every companion names a real listing stem from a fixture list.

### D-20 **Mekasia storyline: letters from Dr. Chen arrive as your Meka collection grows**
Severity: idea · Effort: M · Value: 2/5 · Risk: 2/5

Where: `web/import.ts:68-69` (Mekasia plants/accessories already importable).

What: aquazone.rez hides a story: FO_H 1000-2000 hold 11 English letters and documents ('Redxine Letter', 'Study of Fish Co-Existence', 'Crystal Study', 'Confidential document-C:4656283', 'Mule'…), STR# 20015-20024 ('A letter from Dr. Chen arrived.', 'A confidential letter from Dr. Bowers arrived.', 'Something arrived from Dr. Chen.'), and AcH* crystal lore (the Omni Crystal deposited by Z.U.N. fish becomes the Radiance Crystal; the Meka Sphere comes alive as 'Mule'). The Mekasia fish (Zun.fsh, Ormola.fsh, ﾒｶﾃﾞﾝﾃﾞﾝ虫.fsh) and accessories are on archive.org.

Proposal: A pure rule table `mekasiaLetters(state) -> letterIds due` (letter 1 after any Mekasia fish has lived one tank-day; letter 2 when a Z.U.N. fish and the Omni Crystal are both in the tank; and so on in FO_H order). An arriving letter plays a short mail chime, adds a Tank Log entry with an envelope icon (F-13), and opens a read-only SimpleText-style Osmium document window in Geneva 10. Read letters persist in SavedTank. Tests: fixtures give the expected letters in order and never repeat one.

### D-21 **Let the fish out: a desktop aquarium mode**
Severity: idea · Effort: L · Value: 3/5 · Risk: 4/5

Where: `macos/Finsical.swift:4-7`, `macos/Finsical.swift:106-112` (finsical:// scheme gives a shared origin), `macos/Finsical.swift:467-527`, `web/main.ts:1071-1124`.

What: The After Dark-era wow feature: fish swim across the desktop wallpaper behind your windows while the tank window can stay hidden. Full-screen transparent compositing, multiple displays, Spaces and energy use are unmeasured.

Proposal: A spike first. Tank > 'Let the Fish Out' (off by default) creates a borderless NSWindow over `NSScreen.main.visibleFrame` (isOpaque false, clear background, `ignoresMouseEvents = true`, level `CGWindowLevelForKey(.desktopIconWindow) + 1`, `[.canJoinAllSpaces, .stationary]`). A second WKWebView loads a new desktop.html running its own Sim sized to screen/3, reading installed packs from the shared IndexedDB cache, drawing only fish and bubbles on a transparent canvas upscaled 3x nearest-neighbour, capped at 20 fps with a setTimeout loop. Feeding happens from the menu (clicks pass through). Measure Energy Impact in Activity Monitor before building UI.

## Security and robustness

All inputs below are fixed archive.org items or files the user drops, so these are self-inflicted denial-of-service and crash hardening rather than reachable attacks; real corpus data is unaffected by every proposed cap.

### S-01 **One bad sprite sheet freezes the tank permanently: no render-loop guard, no azpack metadata validation**
Severity: low · Effort: S · Value: 3/5 · Risk: 1/5

Where: `web/main.ts:1130-1142` (render() before requestAnimationFrame), `core/data/azpack.ts:145` (throws on missing dims), `core/data/azpack.ts:147-149` (frame() accepts 0-size), `core/data/azpack.ts:163-187` (loadAzpack validates only sprites.image), `web/render.ts:41-45`, `tools/az/emit.py:34-52`.

What: frame() calls render() and only then schedules the next frame, so any exception while drawing a fish stops animation forever. Reachable from dropped or bundled .azpack manifests: a 0x0 frame makes drawImage throw InvalidStateError (verified in Chromium), and dims with holes (producible by emit.py, S-02) throw RangeError as the tail cycles. fsh.ts never produces such sheets.

Proposal: Call `requestAnimationFrame(frame)` first. Wrap each drawFish in try/catch that adds the sheet to a `brokenSheets` WeakSet, logs once, and falls back to drawPlaceholder. loadAzpack validates each sprites meta: integer groups and framesPerGroup in [1, 63], cellW/cellH >= 1, `dims.length === groups*framesPerGroup`, each dim w, h in [1, cell] with matching g/f; invalid sheets are skipped with console.warn instead of failing the pack. SpriteSheet.frame rejects fw/fh === 0. Tests: a manifest missing one dims entry yields no sheet for that chunk; frame() on a 0x0 dim throws; a unit test for a `safeDraw(sheet, draw)` helper; existing azpack.test.ts:120 stays valid.

### S-02 **Sprite-stream validation: every frame is allocated before the sheet-size guard, valid blank frames are rejected, and Python keeps truncated streams**
Severity: low · Effort: S · Value: 2/5 · Risk: 2/5

Where: `core/data/fsh.ts:109-129` (decodePixels per frame in the loop; the `sw*sh > 1<<26` guard at :129 runs after), `core/data/fsh.ts:116-121` (per-frame `w*h <= 64*ln + 0x400`), `tools/az/fsh.py:66-91` (iter_frames stops at the first bad record), `tools/az/emit.py:34-52` (ng/nf = max observed g/f), `core/pose.ts:10-22`.

What: (1) Despite the 'reject before allocating' comment, all ng*nf frames are decoded and kept before the size check: a crafted 9 MB pack of 16x16 frames of 1500x1500 takes 4.9 s and ~500 MB before returning null, and a 1 MB 8x8x1000² pack is accepted as a 64 Mpx sheet (real packs peak at 18.6 Mpx per pack; the real max per-frame ratio is 0.70 of the guard). (2) One 3-byte run item can legally emit 32768 pixels, so a fully transparent 64x64 frame (ln = 3) fails the 64:1 heuristic: TS drops the whole sheet while Python silently truncates. None of 20,568 real frames trips it (latent). (3) loreto.fsh has three chunks declaring 8x8 frames with data ending after 6, 2 and 2 groups: TS rejects them, emit.py writes 6/2/2-group sheets, so fishPose treats a truncated 8-ring as a 6-ring (right profile from group 3), and a mid-group cut leaves holes in dims (S-01).

Proposal: Two-pass decoding in both languages (shares P-02's header index). Pass 1 walks frame headers (w, h, ln) with the existing bounds checks and the codec's true bound `w*h <= ceil(ln/3)*0x8000`, computes cw, ch, `sw = cw*nf`, `sh = ch*ng` and the pack total, and rejects before any decodePixels when `sw*sh > 1<<24` (16 Mpx per sheet) or the per-pack total exceeds ~48 Mpx. Pass 2 decodes. One corrupt/truncated-frame policy in both: reject the chunk; Python records `rec['spriteError'] = 'truncated frame g/f'` and emits no 'sprites' record unless `len(frames) == declared_ng * declared_nf`. Port the caps to emit._sprite_sheet. Tests (fsh.test.ts and test_fsh.py via fixtures.build_fsh): a 2-frame 64x64 sheet with a blank second frame decodes to framesPerGroup 2 with dims [[0,0,64,64],[0,1,64,64]]; a stream truncated after group 5 is rejected in both; a crafted 16x16x1500² pack (and a header-only 63x63 bomb) is rejected in < 20 ms with decodePixels called 0 times (spy); existing fixtures unchanged.

### S-03 **Hostile BMP input: RLE8 delta and run growth are unbounded and biClrUsed is uncapped**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `core/data/bmp.ts:33` (`ncol = u32(46) || 256`), `core/data/bmp.ts:50-84` (RLE8: delta pushes dy rows without checking rows.length < h; runs grow unbounded number[] within a line), `tools/az/img.py:14-55`, `web/import.ts:351-356`.

What: decodeBmp runs on remote data on the main thread. A 17 KB 8192x8192 RLE8 file of 4000 x delta(0,255) takes 82 s and ~8.4 GB of ArrayBuffers; a 4 MB single-line run file takes 12 s then throws RangeError; biClrUsed = 0xFFFFFFFF builds a 2 M-entry palette. All 82 real JPN backgrounds are 8-bit uncompressed.

Proposal: `ncol = Math.min(u32(d, 46) || 256, 256)`. Rewrite RLE8 to write straight into idx with an (x, y) cursor (y counts stored rows from the bottom; final row `topdown ? y : h - 1 - y`): encoded and absolute runs write only while x < w (still consuming bytes), EOL sets x = 0 and y++, delta adds dx/dy, decoding stops at y >= h; no rows/run arrays. Mirror in img.py read_bmp. Tests (bmp.test.ts and tools/tests): the delta bomb and the single-line bomb each return in < 50 ms with a w*h output; the palette caps at 256; existing RLE fixtures decode identically.

### S-04 **zipRead inflates up to 128 MB even when the entry declares 1 KB, and never checks CRC-32**
Severity: low · Effort: S · Value: 2/5 · Risk: 2/5

Where: `core/data/zip.ts:69-75` (ZipEntry has no crc), `core/data/zip.ts:85-119` (limit = maxBytes; length compared only at :116), `web/import.ts:107-128`, `web/import.test.ts:28`, `web/import.test.ts:40` (fixtures write crc=0).

What: A 100 KB zip whose directory claims usize 1024 inflates all 100 MB and rejects after 424 ms; a length-correct entry with a flipped byte is accepted. Zips are cached and persisted forever, so a corrupted cached copy would keep producing garbage.

Proposal: Store `crc: u32(v, p + 16)` in ZipEntry; `const limit = Math.min(maxBytes, e.usize)` and abort as soon as total > limit; after reading (stored or deflated) compute CRC-32 (256-entry table, ~10-20 ms for 5 MB) and throw `zip ${name}: CRC mismatch`. In import.ts, on a CRC or length error delete the zipCache entry and `packDelete(url)` so the next attempt refetches. Tests (zip.test.ts): the bomb rejects in < 30 ms; a flipped byte raises CRC mismatch; update import.test.ts fixtures to write real CRCs (reuse azpack.test.ts:35-40's helper).

### S-05 **snd.ts: crafted resource maps explode, BinHex uses number[] buffers with uncapped RLE, and a 0 Hz rate is accepted**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `core/data/snd.ts:64-103` (binhexDecode), `core/data/snd.ts:148-189` (sndResources walks every 'snd ' type entry and ref list), `core/data/snd.ts:276-280` (rateHz unvalidated), `tools/az/rsrc.py:150-190`, `web/main.ts:969` (32 MB drop cap).

What: A 39 KB fork with 2000 'snd ' type entries x 2000 refs made hasSounds() take 1.1 s at 747 MB and return 4 M records (65536x65536 would be 4.3e9). binhexDecode materializes the file as JS number arrays (~8 bytes per element) and expands 0x90 RLE up to 255x per marker. A rate below 1 Hz yields a WAV that decodeAudioData later rejects with an unclear error.

Proposal: sndResources stops after the first 'snd ' type entry, caps references at 4096 and skips duplicate data offsets. binhexDecode preallocates Uint8Array buffers (vals <= text.length, out <= 3/4 of that) with a de-RLE size pre-pass capped at 64 MB, throwing SndError past the cap. parseSnd throws `SndError('implausible sample rate')` outside [1000, 96000] Hz. Mirror in rsrc.py/snd.py. Tests: the crafted map gives <= 1 resource list in < 20 ms; a BinHex RLE bomb throws quickly; a rate-0 header throws.

### S-06 **PNG decoder in azpack has no dimension cap and an uncapped inflate**
Severity: low · Effort: S · Value: 1/5 · Risk: 1/5

Where: `core/data/azpack.ts:54-59` (inflate to arrayBuffer, no limit), `core/data/azpack.ts:103-109` (IHDR up to 2^32), `core/data/azpack.ts:124-126` (size check after inflation).

What: A small PNG bomb in a shared .azpack would hang or crash the tab. Inputs are local (bundled pack or dropped folder).

Proposal: Right after IHDR reject w or h > 8192 or w*h > 1<<26; replace inflate() with a streaming reader like zipRead's that aborts once output exceeds h*(w+1). Test: IHDR 60000x60000 with a 1 MB zero-deflate IDAT rejects in < 20 ms.

### S-07 **Saved state and bus messages are trusted: bad fields freeze fish, break the restore chain or get persisted**
Severity: low · Effort: S · Value: 2/5 · Risk: 1/5

Where: `web/main.ts:45-55` (loadTank checks only Array.isArray(addons)), `web/main.ts:73-76` (roster filter validates only x/y), `web/main.ts:333-337`, `web/main.ts:607-615` (remoteInstall validates url and section, not inner; persists the raw item), `web/main.ts:891-900` (restore chain without a terminal catch), `web/import.ts:1237`, `web/bus.ts:36` (forwards any data), `core/sim.ts:148-164` (addFish spreads saved fields).

What: A saved fish with cruise null or 0 (JSON turns NaN into null) never moves (`Math.min(null, x) = 0`); a negative cruise swims into a wall; duplicate or huge ids stop nextId increasing; a string hunger becomes NaN. A null addons entry throws at `installed.has(it.url)`, rejecting the chain before remap and reconcile. A non-string `inner` spawns and saves a fish before qualifySoundItemName throws. bus.ts forwards null payloads. Producers are all same-origin, so this needs a buggy client or hand-edited storage.

Proposal: Sanitize inside `Sim.addFish` (testable): `num(v, d, lo, hi)` gives cruise in [0.3, 3] (default 1), hunger [0, 1] (0.2), finite heading (0), facing +/-1 (else from heading), finite speed/vy (0), bandY in the tank (else y), x/y clamped; id must be a safe non-negative integer not in use, else nextId. Export `isImportable(x): x is Importable` from import.ts (object; `https://archive.org/` url string; known section; inner a non-empty string of <= 256 chars); remoteInstall rebuilds a clean `{section, inner, url}`; loadTank filters addons with it and keeps only finite numeric fish fields and string species/pack. bus.ts ignores non-plain-object data. Add a terminal `.catch` to the launch chain. Tests: cruise null moves > 20 px in 10 s; two saved fish with id 3 get distinct ids; id 1e300 is replaced; isImportable cases in import.test.ts.

### S-08 **The Swift bus relay can crash on NaN or Date values and accepts posts from any frame**
Severity: low · Effort: S · Value: 3/5 · Risk: 1/5

Where: `macos/Finsical.swift:329-405` (JSONSerialization at :376-378, string splice with U+2028 escaping at :390-396), `web/bus.ts:33`, `web/crt.ts:197-205`.

What: bus.ts posts raw objects; `JSONSerialization.data(withJSONObject:)` raises an Objective-C NSInvalidArgumentException that `try?` cannot catch for NaN, Infinity or NSDate. The first NaN any page posts (a future stat dividing by zero) would crash the app on every state push, and since state persists possibly on every launch. Latent: current producers are finite. The relay does not check `frameInfo.isMainFrame` or the origin, and the splice re-parses large payloads (thumbs data URLs) as JS in every visible client.

Proposal: Minimal: before :376, `guard JSONSerialization.isValidJSONObject(message.body) else { NSLog("Finsical: dropped non-JSON bus message"); return }`. Better: replace serialize-and-splice with `dest.callAsyncJavaScript("if (!window.__bus) return 'dropped'; window.__bus(m);", arguments: ["m": message.body], in: nil, in: .page) { r in … }` (macOS 11+; removes the U+2028 workaround). Add `guard message.frameInfo.isMainFrame else { return }` at the top of userContentController. Optional: deliver 'thumbs' only to the window that sent wantThumbs. Test from the tank's Web Inspector (T-24): `webkit.messageHandlers.finsical.postMessage({op: 'x', v: NaN})` must not crash.

### S-09 **Dev dependencies carry advisories, including one against the esbuild dev server**
Severity: low · Effort: S · Value: 2/5 · Risk: 2/5

Where: `package.json:14-18` (esbuild 0.24.2, vitest 2.1.9, typescript 5.6.3), `package-lock.json`, `.github/dependabot.yml`.

What: `npm audit` reports 5 advisories (1 critical, 1 high, 3 moderate): esbuild <= 0.24.2 GHSA-67mh-4wv8-2f99 (any website a developer visits can read responses from `npm run dev`'s server, which may serve web/pack/ with the user's extracted AquaZone data), vite <= 6.4.2 (high), vitest critical GHSA-5xrq-8626-4rwp (UI server) and GHSA-82fw-gwwq-j7x9, plus @vitest/mocker and vite-node. All dev-only; nothing ships.

Proposal: Bump esbuild to >= 0.25 (the actual fix for GHSA-67mh; binding to 127.0.0.1 only removes LAN exposure, since the attacker page runs in the developer's own browser) and re-run build and dev. Bump vitest (and vite transitively) to the latest patched release; run npm test and typecheck and check config/API changes across majors; typescript to 5.9+. Add a dependabot `groups:` entry so dev dependencies arrive as one weekly PR, and confirm Dependabot security updates are on.

## Refuted or dropped

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
