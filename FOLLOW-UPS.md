# Follow-ups after the PR consolidation

On 2026-09-24 the open agent-written PRs were consolidated in two
passes: #161 (fish, rendering, decor, light and water; merged in
`fef376c`) and #162 (sound, import, menus, UI, docs and dependencies;
merged in `6929037`). This file keeps what is still open afterwards:
where every PR ended up, calls made during the merge that you may want
to change, constraints to keep, and follow-up work. `ANALYSIS.md` was
written before the merge, so check its entries against the outcomes
below.

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
| The default volume is 0.84 — the slider position that gives the old default's ~-3 dB under the quadratic gain curve. | sound defaults in `web/audio.ts` |
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

### Tooling and tests

- `tools/az/pack.py` reads a pack's trailer as (id, sub, offset, pad)
  records, which misses the sound bank's entries. The trailer is a
  little-endian Mac resource map (see `core/data/sndbank.ts`); F-01
  can build on that. `tools/fetch.py` doesn't open 7z archives either,
  so the CLI can't fetch the bank.

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
