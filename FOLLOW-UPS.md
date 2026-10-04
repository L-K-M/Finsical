# Follow-ups after the PR consolidation

On 2026-09-24 the open agent-written PRs were consolidated in two
passes: #161 (fish, rendering, decor, light and water; merged in
`fef376c`) and #162 (sound, import, menus, UI, docs and dependencies;
merged in `6929037`). This file keeps what is still open afterwards:
where every PR ended up, calls made during the merge that you may want
to change, constraints to keep, and follow-up work. `ANALYSIS.md` was
written before the merge, so check its entries against the outcomes
below.

## Simplification pass, 2026-10-04

A behavior-preserving cleanup removed dead code, write-only state and
duplicated logic, with characterization tests committed before each
refactor. These candidates were checked and left alone:

- **Derived scenery canvases** (`web/main.ts`): `backdropCv` and
  `gravelCv` always equal their map entries, but `pickBackdrop` and
  `pickGravel` delete the entry before fitting. A fit that throws on
  the shown pack keeps the old art today and would draw nothing
  derived. Fit before touching the maps first.
- **One in-flight memo for `fetchZip` and `fetchAddon`**
  (`web/import.ts`): S-02/S-04 will likely change `fetchZip`'s
  caching, so the two may diverge again.
- **`lruSet`'s throw handling** (`web/lru.ts`) and the in-page
  `sndsChain` (`web/store.ts`): deliberate hardening; the second relies
  on IndexedDB ordering in old WKWebView builds, which is unverified.
- **One resource-map walker for `openFork` and `bankSounds`**
  (`core/data`): an untrusted-input parser with an off-by-two
  type-list base between the two; needs its own tests first.
  `openFork` (`resfork.ts`) now reads Mac forks for sounds and
  pictures alike; the little-endian pack walkers stay apart.
- **Shared staging for `build-deb.sh` and `build-tarball.sh`, the
  duplicated `smoke.py` step, `WebHost`'s menu factory**: GTK and
  packaging paths run only in CI; compare artifact hashes there.
- **Verify scripts**: the tank-page half (server, seed, `openPage`)
  is still copied between pr-integration and spectator. `close()` in
  `scripts/lib/browser.mjs` waits forever on a Chrome killed by a
  signal (`exitCode` null, `signalCode` set).

Noticed during the audit, not fixed; unverified unless stated:

- `drawNight` in `web/main.ts` gates the moonbeam on the timer mode
  without checking the lamp.
- The Import window's sound drop (`web/addons.ts`) has no per-drop
  record cap; the tank's drop stops at 64.
- The two retake tests in `web/tankclaim.test.ts` never reach the
  retake branch (verified with an instrumented copy).
- Tank Overview and the tank page swallow `contextmenu` inside text
  fields (Rename, the name editor), losing Cut/Copy/Paste.
- Import Tank in a view-only tab does nothing and says nothing.
- The Linux smoke test's quit step passes when the save failed.
- `verify-pr-integration.mjs` reads `osmium.css` inside its request
  handler, so a missing osmium-ui crashes the run;
  `verify-caustics.mjs` removes its profile without retries.
- Stale comments: `pushRestPrint` (no renderer calls it), `cleanUp`'s
  return value (its caller ignores it), `ambientKey` in
  `web/audio.ts`, and `announce_x11` in `dbusmenu.py`. The Sound
  follow-up below about `addWavs` restarting the loop at launch no
  longer holds: the rule compares content keys (`bufferKey`) now.

## Second pass, 2026-09-25

A second batch of 22 overlapping agent PRs (#208 to #292) was reviewed
against main and against each other. This section lists where each one
ended up and what is still open afterwards. The sections after it
cover the first pass.

### Outcomes

| Outcome | PRs |
| --- | --- |
| Merged | #208, #210, #212, #213, #214, #220, #225, #226, #229, #239, #241, #242, #263, #265, #267, #271, #272, #292 |
| Parts ported into #299, then closed | #211 (pop sound), #215 (curiosity fade), #218 (per-pack names, whole-pack refusal, pre-entry save migration) |
| Closed without merging | #223: it reverses #190's rule that a paused tank ignores feeds and taps |
| Trimmed while merging | #225 keeps only the shorter Performa names and the row ellipsis, since main grew Preferences to 565x518; #265 keeps only the launch-chain `.catch`/`.finally`; #272 keeps only the dimmed slider ticks |

The GLM reviewer was rate limited for most of the pass. #208, #210,
#212, #213, #214, #225, #226, #229, #239 and #241 were merged without a
completed review on their final commit, with the owner's approval,
after CI and the full test suite passed against main. Their merge
commits say so.

### Bugs on main

- **Medicine banks forever in a large tank.** `stepDose` in
  `core/aquarium/aquarium.ts` waits while one release is too weak to
  act, but `MAX_DOSE_CLOCK` caps a release at 72 ml. In a tank over
  about 360 L (430 L for Green Remedy) a label dose never acts and
  never drains. Confirmed by reading the code; found independently in
  two reviews.
- **The "topped-up dose" test in `core/aquarium/aquarium.test.ts`
  never tops up.** It adds the second dose four hours after the first,
  when the first has already dissolved, so the merge path the test is
  named for never runs. Add the top-up inside the batching window.
- **Reload loop in `web/tankclaim.ts`** (flagged by three reviews, not
  reproduced). When storage can be read but not written and a stale
  lease is left behind, the retake path arms a heartbeat that fails at
  once, and `onLost` reloads the tab, which repeats. Degrade to an
  owned claim without a heartbeat, as the initial claim already does
  when its read-back is null.
- **`tools/az/img.py` and a short color table** (not reproduced). A
  palette cut off by the end of the file leaves `pal` shorter than the
  pixel indices can reach, so the pixel loop raises `IndexError`
  instead of the `ValueError` that `emit()` records.
- **Unbounded ref scan in `core/data/rsrc.ts`** (not reproduced).
  Nothing ties the sum of the type counts to the file's size, so a
  crafted resource map can make the parser push roughly
  (length / 8) x (length / 12) records from a small add-on.
- **`ANALYSIS.md` dropped twelve open entries.** B-55, B-57 to B-64,
  B-70, B-74 and B-76 were deleted without being added to the "Done and
  removed" line, and B-57 and B-60 still had open parts. Restore the
  ones not fixed on main, and record the fixing PR for the rest.

### Unverified review findings on main

These came from reviews that covered main's own recent code while
reviewing a PR. None has been checked.

- `clockFormat` in `core/light.ts` throws `RangeError` on a malformed
  locale tag.
- `plantSize` in `core/aquarium/aquarium.ts` is not saved, so plants
  stop working after a reload; `changeWater` calls `shock()` on dead
  fish.
- `sanitizeLife` in `core/aquarium/life.ts` can bring back or cure a
  fish from a corrupt `dead` or `sick` record.
- `Sim.addFish` in `core/sim.ts` skips `FISH_CAP` unless the caller
  passes `"enforce"`.
- `feedPinch` in `web/water.ts` can scatter pellets outside the water
  near the glass.
- `web/main.ts`: a mouse leaving on a hybrid touch device wipes the
  touch's hover state; an `.azpack` drop reports "Added" when
  `usePack` failed.
- `loadSoundConfig` in `web/audio.ts` may not be idempotent against a
  stale store.
- `web/stats.ts` and `web/overview.ts` can mark a live tank gone while
  their window is hidden, and flash "Waiting for the tank" on return.
- The hello poll in `web/addons.ts` is hardcoded to 2000 ms, and
  `tankConnected` only works while that stays well under
  `TANK_QUIET_MS`.

About 30 more, mostly test strength and `ANALYSIS.md` bookkeeping, are
in the GLM review comment on #267.

### Deferred from merged PRs

- **#299:** when the tank already holds more fish than the cap (a
  tank saved before the cap existed), the full-tank refusal asks for
  `adding` fish to be released; it should be `adding - room`.
- **#212:** name tags stay up while a menu, panel or alert is open, and
  a sleeping fish's tag has no "(asleep)". Tags also hide in Zen mode;
  that was a judgment call.
- **#242:** the torch is left out of Take a Picture, but the brightened
  waterline over the feed zone still shows in pictures.
- **#229:** a local `--smoke-test` run with the Bare case selected
  reports "page broken", because that case leaves `#shell` empty. CI
  uses the Plus case.
- **#210:** records are deduplicated by payload offset, so a second
  resource id that shares a payload under another name is dropped. No
  real AquaZone bank has been checked for this.
- **#225:** nothing tests that every machine name fits the 190 px
  Machine list.

### Optional ideas from closed PRs

- From #223: let ripples and splashes finish after you pause, instead
  of freezing under the pause overlay. The pieces are `surfaceAtRest()`
  and a `tickFx`/`fxAlive` split in `web/surface.ts`.
- From #215: have the fish watching the pointer hover level with it
  without flipping, and hold them in range with some hysteresis. This
  needs rebuilding on #243's per-rank standoff.

### Housekeeping

- These branches have no PR and are superseded by main:
  `feat/night-mode`, `devin/render-on-tick`, `feature/light-rays-night`,
  `feat/browser-menubar`, `feat/first-run-hint`, `tools/sounds-mace`
  and `feat/tap-ripple`. The branches of the closed PRs (#211, #215,
  #218, #223) are also still on the remote.
- #305 (Linux and Android build targets) and #310 (blocking main-frame
  loads of non-app schemes) opened during this pass and were not part
  of it.

## PR outcomes

| Outcome | PRs |
| --- | --- |
| Merged via #161 | #87, #88, #110, #111, #112, #128, #129, #135, #138, #143, #145, #147, #149, #153, #154, #155, #157, #158 |
| Merged via #162 | #89, #90, #94, #102, #104, #114, #115, #118, #121, #122, #123, #124, #127, #130, #134, #136, #137, #140, #141, #142, #144, #150, #151, #152, #156, #159, #160, and #76 and #77 (their updates are in main, but they show as closed: dependabot rebased them after they were merged into the consolidation branch) |
| Parts ported, then closed | #91, #106, #132, #148 (into #161); #93, #103, #131 (into #162) |
| Closed without merging | #92, #95, #96, #97, #98, #99, #100, #107, #108, #109, #113, #125, #139, #146 (part 1); #101, #116, #117, #119, #120, #126, #133 (part 2) |
| Merged directly before the consolidation | #74, #75, #105 |

The reason for each closure is in its closing comment and in the
descriptions of #161 and #162.

## Calls you may want to revisit

| Call | Where to change it |
| --- | --- |
| A fully grown fish draws at its full size, `MAX_SCALE` 1 (#110 grew fish to 1.35x). Newcomers start at 0.70 to 0.95 of that. | `SPAWN_SCALE_MIN`, `SPAWN_SCALE_RANGE`, `MAX_SCALE` in `core/sim.ts` |
| Fish bigger than an eighth of the tank shrink, keeping 40% of each step past it: a discus draws 49 px tall and a shark 68 px long. | `FISH_KNEE`, `FISH_SQUASH` in `web/artscale.ts` |
| A click feeds only above the waterline: the 10 px air strip plus the line's own row (it used to be the top 30 px). F, Cmd-F and Feed Fish feed from anywhere. A taller strip is a bigger target but a lower waterline. | `SURFACE` in `core/sim.ts`, `isFeedZoneY` in `web/feedzone.ts` |
| Feed Fish drops one pellet per hungry fish, at most five, around a random spot. A fixed 3 to 5 fouled a sated tank in minutes. | `feedPinch`, `PINCH_MAX` in `web/water.ts` |
| The demo cycle keeps #155's 12-hour virtual day, about 47% of it night. | `DEMO_OFF_MIN` in `core/light.ts` |
| Backdrops downscale nearest-neighbor, per `PLAN.md` (#125 smoothed them). | `fitBackdrop` in `web/main.ts` |
| One bad sheet rejects a whole `.azpack` (#145). Only the project's own emitter makes these packs. | `core/data/azpack.ts` |
| Add Again on decor adds another copy, as it does for fish. Copies don't persist yet (B-21 in `ANALYSIS.md`). | `web/main.ts` |
| The default volume is 0.84 — the slider position that gives the old default's ~-3 dB under the quadratic gain curve (#159). | sound defaults in `web/audio.ts` |
| Pause is remembered across launches and uses Cmd-P; there is no Print item. | `PAUSE_KEY` in `web/main.ts` |
| First launch offers the starter set from archive.org; Not Now keeps the stand-in fish (#160). | `web/welcome.ts`, `web/starter.ts` |
| The glass-tap sign is a modal alert, shown at most once per 30 minutes. | `SCOLD_COOLDOWN_MS` in `web/scold.ts` |
| Browser menu toggles are titled by the action they take ("Mute Sound", "Unmute Sound") because Osmium 0.2.0 menus have no checkmarks. The app's menus use checkmarks. | `web/menubar.ts` |
| Tall plants shrink only to fit the whole tank, so the top of a big one passes behind the air strip. The alternative is to fit decor under the waterline. | `decorScale` in `web/render.ts` |
| A big fish at the surface can push a few pixels of fin behind the air strip: `room()` keeps 80% of its half-height inside, as it does at the glass and the gravel. | `EDGE_KEEP`, `room()` in `core/sim.ts` |

## Constraints to keep

- **LGPL decoder.** The MACE decoder (`core/data/mace.ts`,
  `tools/az/mace.py` and its tables) is ported from FFmpeg and licensed
  LGPL-2.1-or-later, the one exception to the Unlicense. Keep its `/*!`
  header (esbuild keeps it in `bundle.js` and `addons.js`),
  `THIRD_PARTY_NOTICES.md`, `LICENSES/LGPL-2.1.txt` and their copies
  in `Finsical.app/Contents/Resources`. Writing an independent decoder
  would make all of the code Unlicense.
- **One kind of content per add-on.** `importAddon` never returns art
  and sounds for the same add-on: pack blobs carry no sounds, and sound
  blobs carry no art. `downloadAddon` relies on this. It applies art
  before awaiting the sound decode, so if an add-on ever carries both,
  an Empty Tank during the decode would leave art that no install
  record can remove. Apply the art after the last await in that case.
- **Stall clock.** Any `fetchTimed` caller that reads a body must
  stream it through `readBody`, which resets the 30 s clock on every
  chunk.
- **Painted body vs. cell.** Fish sizing measures the painted body
  (`bodySize`), but sim extents, wall clamps and hit tests still use
  the padded cell (`bindExtents`).
- **CRT preset keys.** Presets set tube keys only. `PICTURE_KEYS` must
  list every Picture pane trim; a test checks that the two sets
  partition the config.

## Follow-ups

### macOS app

- Only Pause syncs its menu state right away. Mute, Lamp and CRT
  ignore the page's reply and wait for the next state push, so
  reopening the Tank menu right after a toggle can show the old
  checkmark. Have those page functions return the new state, and sync
  it the way `togglePause` does.
- Six Tank menu actions repeat the same JavaScript dispatch. Five of
  them do nothing and log nothing without a web view, while
  `togglePause` logs. A shared helper would make them consistent.
- Tank menu items are enabled before the page registers
  `window.finsical`, so a very early click only logs an error.
- With Show on All Desktops on, the tank's collection behavior lacks
  `.participatesInCycle`, so the tank leaves the Cmd-` window cycle
  while its client windows stay in it.

### Tank

- Use the `bodySize` box for sim extents and hit tests (see
  Constraints), so fish with padded cells reach the glass and hover
  matches what is drawn.
- The machine previews in Preferences (`previewMarkup` in
  `web/machines.ts`) still draw the old rectangle fish, with no
  waterline or air strip.
- A gravel's `Grvl` record holds two numbers, its front-face height h
  and its floor's depth span s. AquaZone's DLL stands an object at
  depth d (0 to 400) at `bottom - h - s + d * s / 400`. The tank's
  floor line ignores the record, so decor sits at the same height on
  every gravel. The record can't be applied as given: the tank draws
  only a strip's top `GRAVEL_MAX_H` (20) pixels, at the scale that
  fits its width to the tank, and on most gravels the band the
  formula spans runs below those rows. On Jewelstone the band lies
  entirely below them. Using the record means lifting the cap for
  gravels that carry one, or fitting the band into the rows shown.

### Alerts and Preferences

- `bindDialogKeys` in osmium-ui has no unbind, so every set of alert
  buttons leaves a keydown listener on the window for the rest of the
  session. It needs a dispose function upstream.
- An alert taller than the window scrolls its bevel and drop shadow
  away with its text, because `.alertwin` is the scroll container.
  Scroll an inner wrapper instead.
- When the volume slider in Preferences loses focus after a keyboard
  change, it clears its drag latch without re-syncing, so the thumb can
  show a value the tank didn't take until the next state push.

### Sound

- Installing an add-on while another one's feedback sound is playing
  cuts that sound off, which can click. Fade it out instead.
- Not ported from #133: an ambient volume slider, and a Defaults
  button that leaves Mute alone.
- The game's sound bank (ANALYSIS.md F-22) is in: `AZ_WAVES.REZ` from
  the main item's 7z, named by the Mac build's ids in
  `core/data/sndbank.ts`. These original sounds have no Finsical
  feature to play them yet: EventBirth, EventEgg, EventCouple,
  EventPreg, EventDead, EventSick, EventTiyu (recovery), WashFilter,
  TimerOnOff, TimerSet, add, set and pipopa.
- The 7z's archive view lists its entries under the wrong top folder.
  `Collection.rename` corrects that for the sound bank; F-21 (the 7z's
  English ITEMS library) can reuse it.
- At launch the restored sound records decode again, and addWavs'
  restart rule (it compares buffer objects) restarts the bubbling loop
  once, a few milliseconds in. Harmless, but the rule could compare
  names instead.

### Linux and Android apps

- Web copy still speaks of a Mac: the WebGL note in `web/prefs.html`,
  the light timer's "this Mac's clock" in `web/prefs.ts` and the
  browser About text in `web/menubar.ts`. That is wrong on Linux,
  Android and in any other browser.
- On touch screens nothing names a fish (hover) or opens Get Info
  (Option/Alt-click). A long press could open the card.
- Android can't import local packs or sounds: the web app has no file
  picker, and drag and drop only reaches it from another app in split
  screen. An `<input type=file>` in Import Add-ons would cover it.
- Android: a folded (windowshaded) panel keeps its full size, so its
  transparent area still takes taps meant for the tank. In browser mode
  the page sends the shell no shade message.
- Android: no themed (monochrome) launcher icon; it needs single-colour
  art. No keep-screen-on option either.
- Android: before merge only the CI emulator (API 35) ran the app. Run
  a phone through panels, Back, Take a Picture, external links, insets
  and rotation.
- Linux: the tank resizes only through Larger and Smaller; there is no
  edge to drag. On native Wayland the tank can't float, stick or reopen
  where it was, and client windows don't open beside it.
- Linux: not yet run on a GNOME Shell or KDE session, on HiDPI, or
  installed on Ubuntu 22.04 or Debian 12. Once, without a compositor,
  the first frame after install showed stale content; it never
  reproduced.
- The AppStream metainfo has no screenshots.
- Android: while a panel is open, the full-screen panel layer takes
  drag-and-drop meant for the tank, so a drop outside the panel is lost.
  `PanelLayer.dispatchDragEvent` could hand drags outside every panel
  to the tank.
- Linux: Get Info needs Alt-click, which many window managers (openbox,
  Xfce, KDE Plasma 5, MATE, Cinnamon) take for moving windows. A second
  trigger, such as a Get Info item in the app menu, would need a web
  change.
- After a web process crash, the Linux and Android shells (like the
  macOS one) reload the tank within about a second, while the dead
  page's tank lease (`web/tankclaim.ts`, 4 s) still holds. The reloaded
  tank shows the "already open in another window" view-only notice
  until the lease runs out, then takes over. No data is lost, but the
  notice is wrong.

### Mac content on archive.org

Surveyed on 2026-10-04 with archive.org's advancedsearch and metadata
APIs, the archive view's listings, and HTTP Range reads of the disc
images. The table lists the items with Mac content.

| Item | Path | Container | Contents | Reachable today | What it would take |
| --- | --- | --- | --- | --- | --- |
| `aquazonewithguppiesandaddons` | `Missing addons Aquazone.7z`, `Spare interesting things/Misc Macintosh files/`: 4 files without extensions | PICT files in a 7z | 4 backdrops | Import Add-ons, drops, `fetch.py --archive` | Done |
| same | same folder, 5 `._` files | AppleDouble forks | 5 gravels | Import Add-ons, drops, `fetch.py --archive` | Done |
| same | same folder: `GRAVEL1.sit`, `GRAVEL2.sit`, `Kawajya.sit`, `Raked_Gravel.sit`, `Tsouki.sit`, `bamboo.sit` | StuffIt 5, method 13 (the first two) or 15 | 13 gravels: black, black2, ghyll, red, red2, glassie, goishi, green-mos, marble, Kawajya, Raked Gravel, Tsouki, Bamboo Mat | By hand: extract with `unar`, then drop the `.rsrc` files or run `azpack.py` on them | A StuffIt 5 reader |
| same | same folder: `macplants.sit` | StuffIt 5, method 15 | 41 plants, filed as accessories (`AqAc`) | By hand: extract with `unar`, then drop the `.rsrc` files on the tank | A StuffIt 5 reader |
| same | same folder: `mactools.zip` | zip of StuffIt 5 archives | AquaZone's authoring tools (FisherMan, GravelMaker, PlantMaker, FishColor) and palettes | Not content | Nothing |
| same | `AQUAZONE.iso` | ISO 9660 with an Apple partition map and an HFS volume | HFS `AQUAZONE/Items` and `Guppy Items`: 15 PICT backdrops, 5 gravels, 14 plants, 10 accessories, 12 tanks, fish and guppy forks, food, medicine | No | An HFS reader (below) |
| same | `AQUAZONE.iso`, `Win/Items/data.z` | InstallShield 3 archive, 7.5 MB | 65 Windows items: 15 backdrops (BMP), 5 gravels, 14 plants, 10 accessories, 12 tanks, 9 meds and foods | `fetch.py --archive AQUAZONE.iso --entries 'Win/Items/data.z'` | In the app: the same readers in TypeScript |
| `aquazone_1997_9003inc` | `AQUAZONE.ISO` | ISO 9660 with an Apple partition map and an HFS volume | HFS: 10 backdrops, 4 gravels, 4 plants, 4 accessories, 6 tanks, 4 fish. Windows: `WIN95/ITEMS/DATA.Z`, 3.7 MB | `fetch.py --archive` | As for `AQUAZONE.iso` |
| `aquazone-deluxe` | `AquazoneDeluxe.iso` | ISO 9660 with an Apple partition map and an HFS volume | HFS: 15 backdrops, 4 gravels, 5 plants, 7 accessories, 12 tanks, 6 fish. Windows: `WIN95/Items/data.z`, 6.7 MB | `fetch.py --archive` | As for `AQUAZONE.iso` |
| `AZ_SEVEN_SEAS_DX_ISO` | `AZ_SEVEN_SEAS_DX.ISO` | ISO 9660 with an Apple partition map and an HFS volume | AquaZone Seven Seas Deluxe (2005, Allume): an installer app and trialware | No | Out of scope: a later product, its content inside an installer |
| `aquazone-jpn-set` | `AQUAZONE (JPN) SET.zip`, `AQUAZONE Guide・Catalog.zip`: 19 `.hqx` files | BinHex of classic StuffIt and Compact Pro archives | Updaters, a shop item, and kits for The Tower | No | Not worth it: no scenery |

- The Deluxe II image is on archive.org four times: `AQUAZONE.iso`,
  `AQUAZONE_BACKUP.ISO`, the `AQUAZONE.iso` inside
  `Aquazone-Deluxe-II-…-WinMac-Hybrid.zip`, and the `Aquazone.iso`
  inside `aquazone-iiguppies/AquazoneIIguppies.zip` have the same size
  (541,442,048 bytes) and CRC-32 (`76769523`). The unzipped copy
  serves Range requests, so a reader never needs the zips.
- These have no Mac side (no partition map and no HFS master directory
  block): the JT&M image that `AquazoneJTM`,
  `aqua-zone-virtual-aquarium`, `aquazone-jt-m_202107`,
  `aquazone-jt-m_20210730` and `AQUAZONE` all hold (one MD5),
  `aquazone-virtual-aquarium`'s raw dump,
  `aquazone-turtles-jellies-more`, `azax-spbox-2` and `score52cd`.
- Not found on archive.org: Redump's Mac list names nine Japanese
  AquaZone discs (Aquazone Compact and its rerelease, Aquazone Deluxe
  (Japan) and six iMacinfish option discs), but `apple_macintosh` and
  `apple-macintosh-redump-2` hold none of them. PLAN.md's `AQUA179.sit`
  (the Mac app 1.7.9) is in no surveyed item, and advancedsearch finds
  nothing for it. `AquazoneROM` holds only a torrent, and
  `warc-aquazone_frankism_net` is a Super Soaker fan site.
- Range and CORS, checked on 2026-10-04 with an `Origin` header: a
  whole-file download redirects to a data node that honors `Range`
  (206 with `Content-Range`) but sends no `Access-Control-Allow-Origin`
  for ISO, zip, 7z or raw `.bin` files, and answers a preflight
  `OPTIONS` with 405. Text files do get CORS. The archive view
  (`/download/<item>/<archive>/<entry>`) sends CORS for the entries of
  a zip, 7z or ISO, but ignores `Range` (asked for 16 bytes, it sent
  all 121,616) and lists only an ISO's ISO 9660 side. A page can't
  read a disc image, whole or in part, and can't see an HFS side.

**HFS.** The three hybrids keep the Mac items as plain files on their
HFS sides. Their backdrops and gravels decode with the current code
(Astral Hill and the Aqua gravel, read by Range, do); plants,
accessories, tanks and fish need more.

- Command line first: an HFS reader in `tools/az/` (Apple partition
  map, master directory block, catalog B*-tree, extents overflow),
  written from Inside Macintosh: Files (chapter 2) and Inside
  Macintosh: Devices, with `fetch.py` reading the image through a
  cached Range reader. About 300 lines, plus fixtures that build small
  HFS volumes. Deluxe II's 20 backdrops and gravels come to 4.7 MB of
  its 541 MB. Apple's documentation keeps it license-clean; `hfsutils`
  and `libhfs` are GPL. deark (MIT) has an experimental HFS module to
  compare against.
- In the app, only for a disc image you drop, read through
  `Blob.slice` so the 541 MB never loads at once: a TypeScript twin of
  about 300 lines. Fetching from archive.org fails on CORS, above.

**StuffIt.** All seven `.sit` files are StuffIt 5 archives. Neither
of their methods, 13 (LZ and Huffman) and 15 (Arsenic), has a public
specification. The one open implementation, XADMaster (The
Unarchiver's engine), is LGPL-2.1, so its code can't be copied or
ported, and deark (MIT) reads only the old StuffIt format. A
clean-room reader would need a specification written by someone who
hasn't read that code, so it isn't recommended. Instead, the README
points to `unar -k visible`, which writes each resource fork as an
AppleDouble `.rsrc` file that drops and `azpack.py` read. Checked with
unar 1.10.1: all 13 gravels from the six gravel archives come out as
gravels.

**InstallShield.** The hybrids' Windows items sit in InstallShield 3
archives (`data.z`, 3.7 to 7.5 MB, signature `13 5D 65 8C`), which
the archive view serves with CORS. `tools/az/is3.py` reads them, with
a PKWARE DCL Implode decoder written from the format as zlib's
`contrib/blast` documents it, and `fetch.py` harvests them. Each
disc's cabinet holds the previous one's items and more: 35 on the
1997 disc, 50 on Deluxe, 65 on Deluxe II. Most are reachable already.
Three gravels are in `gravel.zip`, the option-disc plants and
accessories in the Japanese set, and the backdrops, plants and
accessories, at the same sizes, in the 7z's `ITEMS/` folder, which
`COLLECTIONS` doesn't list yet. Only the cabinets hold the US retail
tanks (the Japanese set has its own build of Eden) and the Anchor
rock accessory. Listing those in Import Add-ons takes the same
readers in TypeScript.

**Mac plants.** Every picture in the plant forks (41 `ACPC`, 82
`ACDP`) is a QuickTime picture in QuickTime's BMP codec (`WRLE`): 8-bit
pixels behind an image description that carries the color table, laid
out as a BMP lays them out, bottom row first and each row padded to
four bytes. Both PICT decoders draw them now, and a plant's fork
dropped on the tank or the Import Add-ons window stands its art
(`ACPC`) on the floor as an accessory, as the engine files it. Still
open:

- `azpack.py` turns the forks down. Bundles carry no decor, and the
  tank's bundle loader would take the art for a backdrop.
- The records go unread. `AccH` starts with the name the item catalog
  shows; a drop names the add-on after its file instead.
- The catalog pictures (`ACDP` 200, and 201, the piece seen from
  above) go unused, as the Windows packs' do.

### Tooling and tests

- `tools/az/pack.py` reads a pack's trailer as (id, sub, offset, pad)
  records, which misses the sound bank's entries. The trailer is a
  little-endian Mac resource map (see `core/data/sndbank.ts`); F-01
  can build on that. `tools/fetch.py --archive` can now take the bank
  out of the 7z through archive.org's archive view, but its bundle has
  no sounds for that reason.

- In `web/audio.test.ts`, "ambient off aborts a loop waiting on a
  locked context" waits exactly two microtasks. The file's `flush`
  helper would not depend on how many awaits the code has.
- `scripts/check-version.mjs` doesn't trim spaces inside the README's
  version marker.
- If REUSE tooling is adopted, `LICENSES/LGPL-2.1.txt` has to be
  renamed `LGPL-2.1-or-later.txt`.
- `sparkColumns` in `web/statsmodel.ts` expects samples in time order,
  and its doc comment doesn't say so.
- Reconcile `ANALYSIS.md` with the outcomes above. Its "Completed
  work" entries point at PRs that are now merged or closed, and merged
  PRs may have finished some of its open entries.

## Declined in review

These claims from #162's review were checked and found wrong, or not
reachable with the current code. The evidence is in the PR's comments
and in the message of commit `892da16`. Don't re-raise them without new
evidence.

- The MACE tables need sign extension: no entry reaches 0x8000.
- `exec` in `web/drop.ts` is dangerous: it is `RegExp.prototype.exec`.
- `.participatesInCycle` needs macOS 14: it has existed since macOS
  10.6, and the app targets macOS 12.
- Clicking an alert's text lets focus escape: the alert window takes
  the focus itself, and Tab keeps cycling its buttons.
- The welcome alert can hang on a failed listing: `listAddons` never
  rejects.
- Not Now leaves the retry alert up: a button without an action closes
  the alert.
- Restore retries stop on a rejection: `restore()` never rejects.
- A save without `fish` crashes at `keepEmpty`: `loadTank` rejects such
  saves.
- `ICON_SOUND`'s padding is off: a test pins `SOUND_ICON` at 24 rows.
- `setEnabled(true)` replays the CRT warm-up: `crtEnabled` is posted
  only on a real toggle.
- NaN guards for `changeWater` and `setVolume`, a raw fallback in
  `stateLabel`, a `loadProblem` message for a missing local pack, and a
  guard on the placeholder frames: no caller reaches these cases today.
