# Finsical review, twenty-second pass (tmp.md)

Working notes for this pass. Folded into ANALYSIS.md at the end of the
pass, then deleted.

## Method and baseline

- Tree: `origin/main` at `1064b5b` (2026-10-02), v0.8.0.
- `npm ci` clean, `npm run typecheck` clean, vitest **63 files / 892
  tests** green, `npm run build` clean.
- **A browser was available this pass.** Headless Chromium 141
  (Playwright, SwiftShader WebGL) drove a `dist/` build served on
  localhost, at 1024x768 and 900x700, DPR 1 and 2. Every visual claim
  below rests on a screenshot or a measured rect unless it says
  otherwise.
- **No archive.org in the browser.** The container's Chromium does not
  trust archive.org's certificate chain (curl and openssl do), and the
  pass did not weaken TLS to get round it. Runtime checks used the four
  stand-in fish plus **24 synthetic fish packs** built offline with the
  same encoder as `core/data/fsh.test.ts` (8 pose groups x 4 frames,
  18x34 cells) and dropped on the tank through a synthetic
  `DataTransfer`. Anything that needs real AquaZone art, sounds or the
  add-on listings is code-level only.
- Perf numbers come from CDP `Performance.getMetrics` (TaskDuration,
  ScriptDuration) over 6-10 s windows. rAF cadence in this headless,
  software-GL container is not representative and is not quoted as a
  finding.
- Helper reviews (Claude sub-agents, read-only): native shells; import
  and persistence; Mac OS 8 visual fidelity with the same Playwright
  harness; original-AquaZone research from the web. Every helper
  finding kept below was re-read against the code.
- New IDs in this file are provisional (N-xx); the fold maps them onto
  ANALYSIS.md's prefixes.

## Bugs and reliability

### N-01 The "Click for sound" hint is wrong in most of the cases it shows

Severity medium · Size S · Value 4/5 · Risk 1/5 · verified in Chromium ·
**implemented: PR #382** (`claude/sound-hint-fix`)

`web/index.html` `#audio-hint`, `syncAudioHint()` in `web/main.ts`
(about line 251), CSS `web/app.css:52-60`. Added by the eighteenth pass
(U-41 there, merged to main in `9cc72e6`).

1. **Shown when there is nothing to unlock.** `syncAudioHint` reads
   the private `TankAudio.ctx` through `(audio as any).ctx` and shows
   the hint whenever it is null. `TankAudio` creates its context
   lazily (`context()`, `web/audio.ts:265`), only when a pack with
   sounds loads. A tank with no sound bank (every "Not Now" tank, a
   tank of dropped `.fsh` files) never creates one, so the hint stays
   up forever, and it does so in the **native apps too**, where audio
   needs no gesture at all (macOS only gates video; Linux uses
   `AutoplayPolicy.ALLOW`, `linux/finsical_shell/web.py:109`; Android
   `setMediaPlaybackRequiresUserGesture(false)`,
   `MainActivity.java:234`). Measured: fresh profile, stand-ins only,
   hint visible after 3 s and after any number of clicks on the case.
2. **The hint itself can't be clicked.** It has `pointer-events:
   none`, so a click on "Click for sound" lands on the page, whose
   pointerdown handler (`web/main.ts:2458`) is the window-drag path
   and never calls `audio.unlock()`. Only a click *in the tank*
   (which also feeds or taps the glass), a key, or a menu command
   unlocks. Measured: click at the case (300,600), hint still shown.
3. **Zen mode leaves it up.** `body.zen` hides the menu bar, tip,
   trigger and tags (`web/app.css:428`) but not `#audio-hint` (or
   `#dropmsg`). Measured: `z`, hint still visible.
4. **Not period.** A translucent black, rounded, white-bordered pill in
   the window's bottom-right corner, far from the tank. In the native
   window that corner is usually outside the case silhouette.
5. It reaches into a private field with `as any`.

**Change.** Give `TankAudio` a public `get blocked(): boolean` (context
exists, state `suspended`, not hidden, level > 0, and the bank or a
synth cue has something to play); show the hint only when `blocked`
and not in zen or the boot parade. Unlock on the first pointerdown
anywhere on the page (one capture listener, `{ once: false }` until
running), so the case, the menu bar and the hint all count. Make the
hint a real control: a Platinum bevel chip (Geneva 9, `#ddd`, 1 px
black frame with a white/grey bevel, square corners) with a small
speaker glyph, placed just under the tank's glass rather than the
window corner; clicking it unlocks. Acceptance (Playwright): with no
sound bank the hint never shows; with the autoplay policy forcing a
gesture and a bank present, the hint shows, and a click on the case
hides it and the context is `running`; with `z` it hides.

### N-02 The welcome offer keeps saying "four stand-in fish" after fish arrive

Severity low · Size S · Value 2/5 · Risk 1/5 · verified in Chromium

`showWelcome` (`web/welcome.ts`) and `pristine` (`web/main.ts:407`)
are decided at launch. Drops still land behind the alert's scrim
(the window-level drop handler ignores it): after dropping 20 fish
packs onto a first-run tank the alert still reads "Your tank has four
stand-in fish. Finsical can stock it…". Either refuse drops while a
modal alert is up (a short `dropSay`), or re-word / dismiss the offer
once a real fish or add-on has arrived (`placeholderIds` empty).

### N-03 The Get Info card wraps "Health 93% Hunger 50%" across two lines

Severity nit · Size S · Value 2/5 · Risk 1/5 · verified in Chromium ·
**implemented: PR #388** (`claude/info-card-lines`, together with N-54)

`layoutInfo` writes `Health  ${h}%  Hunger  ${n}%` into one line of
the 118 px card (`.finfo`, `web/app.css:150`); in Geneva 9 it breaks
after "Hunger", leaving "50%" alone on the next line (screenshot
`i-card-moving`). Split into two lines ("Health 93%", "Hunger 50%") or
give the line `white-space: nowrap` and widen the card to fit.

### N-07 Bodies vanish on relaunch although they should stay until removed

Severity medium (fidelity, water model) · Size S · Value 4/5 · Risk 2/5 ·
verified in Chromium · **implemented: PR #384** (`claude/keep-bodies`)

`tankSnapshot` (`web/main.ts:461`) saved
`sim.fish.filter((f) => f.state !== "dead")`, so every quit removed
the bodies, and the ammonia they release (`Aquarium.breathe`,
`core/aquarium/aquarium.ts:247`) with them, although ORIGINAL-SIM says
"sinks and stays until removed, decaying into ammonia", the README
says "remove it from Tank Overview before it fouls the water", and the
original's guide says bodies decompose until removed. The restore path
(`sanitizeSavedFish`, `life.dead` -> corpse "sink") existed but never
ran. Restoring a body also needs `state: "dead"`, or the first
`syncLife` re-announces the death (sound and save) on every launch.
Seeded-save Playwright check: on main the body is gone after one
relaunch; with the fix it survives two.

### N-08 The cat paw is not from AquaZone and could not be switched off

Severity low (fidelity, provenance) · Size S · Value 3/5 · Risk 1/5 ·
**implemented: PR #383** (`claude/cat-paw-effect`)

`web/catpaw.ts:2` ("AquaZone's cat — the original's best-remembered
gag"), `web/main.ts:3727` ("AquaZone's signature visitor") and the
Effects pane's snail blurb ("that visitor was the original's own")
credit the original with a cat. The Deluxe II User's Guide (every
menu, tool, event and FAQ), the 1993 box back, the Macworld 1995 and
ATPM 1998 reviews and Japanese sources never mention one. It was the
only extra the Effects pane could not turn off, and it startles the
fish every few minutes. PR #383 adds Effects > Cat visits (default on)
and corrects the comments. ANALYSIS.md's PR #204 line ("the AquaZone
signature visitor") should be corrected at the fold. D-46 (a Neko cat
peeking over the rim) stays a separate idea.

### Import, download and persistence (helper review, re-read by hand)

- **N-09 A partial listing failure quietly shrinks the starter set and
  records "stocked" for good.** Severity medium · S. `listAddons`
  turns a failed collection into `[]` (`web/import.ts:739-747`);
  `resolveStarter` drops missing items silently (`web/starter.ts:36-44`);
  `stock()` records "stocked" when `failed` is empty
  (`web/welcome.ts:166`). The starter plant (Amazon_L) and backdrop
  (Back03) live only in the JPN collections, which share one listing
  page (`listPage`'s `pageCache`, `web/import.ts:298-345`), so one 5xx or
  stall on that page installs 5 of 7 items, reports success and never
  offers the rest again. Verified with a vitest that stubs a 503 for the
  JPN page. Change: `listAddons` returns `{items, failed}`; when a
  starter item is missing and any starter collection failed, install
  the rest and leave the answer at "retry". Acceptance: the 503 test
  ends with `finsical:welcomed` = "retry"; a second run with the page
  healthy installs only Amazon_L and Back03.
  **Implemented: PR #387** (`claude/starter-listing-retry`).
- **N-10 The Import panel keeps full-size preview canvases for every
  browsed add-on, and re-stores a thumbnail on every selection.**
  Severity medium (memory) · S. `thumbs` (`web/import.ts:995`) is set
  from `h.preview(...)` (`:1316`, `:1583`, `:1646`), which is
  `imageCanvas(largest image)` at full size (`web/render.ts:170`);
  nothing deletes from it. A 640x480 background is ~1.2 MB of backing
  store, so scrolling the 82 JPN backgrounds pins ~100 MB for the
  window's life (the app hides the Import window rather than unloading
  it). `paintThumb` rescales from the full canvas on every
  `applyFilter` (each Filter keystroke), and each `showDetail`
  re-encodes a PNG, `packPut`s it and runs `trimPacks` even when the
  thumb is already stored (`storeThumb`, `:1500-1515`). Change: store
  only `miniThumb(pv)` (38x28) in `thumbs`; store the PNG once per URL.
  Acceptance: `thumbs` holds nothing larger than 38x28; two
  `showDetail`s of one URL make one `packPut` for its `thumb2:` key.
  **Implemented: PR #393** (`claude/import-thumb-memory`).
- **N-11 `store.ts` keeps using a closed IndexedDB connection for the
  rest of the session.** Severity medium-low · S. `dbPromise`
  (`web/store.ts:19-46`) is cached forever; no `onclose` or
  `onversionchange`. After the browser drops the connection (site data
  cleared, WebKit's storage process lost), every `transaction()` throws
  InvalidStateError until reload: every `packGet` misses and
  re-downloads, drops show "storage is full", `sndsMerge` rejects
  silently, `local:` restores fail as "stored pack missing", and a
  future `DB_VER` bump would be blocked by an old open page. Change:
  reset `dbPromise` in `onclose`, close and reset in `onversionchange`,
  retry once on InvalidStateError. Acceptance: a fake-IDB test where
  the connection is lost, after which `packGet` returns the stored
  bytes and `open` ran twice.
  **Implemented: PR #392** (`claude/idb-reconnect`).
- **N-12 Mid-download connection drops are classed as permanent, so
  Try Again is disabled.** Severity low-medium · S. `transientFailure`
  (`web/import.ts:966-970`) matches only
  `/abort|failed to fetch|networkerror|load failed|timeout/i`;
  Chromium's body-stream error is `TypeError: network error`,
  Firefox's "Error in body stream", WebKit's "The network connection
  was lost." The user sees "Couldn't load it. network error" beside a
  disabled Try Again. Change: wrap fetch/reader rejections and `!ok`
  in `class DownloadError` inside `fetchTimed`; `transientFailure`
  checks `instanceof` first, the regex only for bus prose.
  **Implemented: PR #396** (`claude/download-error`).
- **N-13 Dropping a second pack with the same file name shows the old
  art, then replaces the first fish after relaunch.** Severity
  low-medium · S. Drops key by `local:${name}` (`web/main.ts:3182`),
  `packPut` overwrites the bytes, and `handleSheets` reuses the first
  drop's slot (`sheetByEntry`), so B spawns with A's art now and A's
  fish turns into B (with B's care) after a relaunch. Change: a pure
  `dropIdentity(name, bytesHash, records)` in `web/drop.ts` that mints
  `local:${name} (2)` when the bytes differ (SHA-256 via
  `crypto.subtle`); identical bytes keep today's reuse.
- **N-14 Stored bytes of dropped packs that no save references are
  never reclaimed.** Severity low · S. `local:` packs are exempt from
  `trimPacks` (`web/store.ts:181`); only `removeAddon` deletes one.
  Spectator-tab drops and `.fins` imports (which replace the tank
  without deleting the old tank's `local:` packs) leave invisible,
  unremovable bytes. Change: after the launch restore (owner only),
  delete `local:` packs referenced by neither `installedAddons` nor
  `finsical:tank.bak`; a small `packKeys(prefix)` in store.ts and a pure
  `orphanLocals(keys, saved, bak)`.
- **N-15 Add Again at the 16-copy decor cap says "Added to the tank"
  and adds nothing.** Severity low · S. `handleImages`
  (`web/main.ts:1519`) gets `room` 0 from `decorCopyRoom` yet still
  plays `sceneryIn()`, and both install paths report success
  (`web/import.ts:1368`, remote ack `:1662`). Change: refuse up front
  with "This plant is already in the tank 16 times." (pure
  `decorRefusal(decors, src)`), no sound, nothing recorded.
  **Implemented: PR #397** (`claude/decor-cap-refusal`).
- **N-16 Saved care data is never pruned, and a restore saves the whole
  tank once per add-on.** Severity low · S. `careByPack`
  (`web/main.ts:284`, set at `:1345`) is never deleted from and rides
  in every save and `.fins` export (~870 bytes per pack ever
  installed); `recordAddon(..., "refresh")` always returns true
  (`web/import.ts:598-607`), so launch does N full synchronous
  `localStorage` saves. Change: drop `care[url]` once no add-on and no
  living fish's `pack` uses it; make `recordAddon` report change and
  save once after the restore chain.
- Updates to existing entries (fold into them):
  - **U-28**: per-collection listing failures are swallowed and
    `loadListing` runs once per page life (`web/import.ts:1790`,
    `:1798`; Try Again only when *everything* failed, `:1740`), so if
    the JPN page fails once, Plants, Backgrounds and Tanks (and the JPN
    fish and gravel) are missing from Show: with no message until the
    app restarts. Offer "Some sections couldn't be loaded." with Try
    Again for the failed collections, and re-run on the next `open()`.
  - **B-34**: a view-only second tab still stores dropped packs and
    sounds (`web/main.ts:3024`), and shows its own welcome
    (`:2944`); pressing Stock the Tank there stocks a tank that never
    saves and records "stocked", so the owner is never offered it.
    Gate drops, in-page installs, the welcome and the sound backfill on
    `tankOwner`.
  - **S-07**: `.fins` is the documented way to share a tank, and
    `isSavedAddon` (`web/import.ts:638-648`) accepts any URL, so a file
    from someone else makes the tank fetch an arbitrary host at every
    launch and retry, and feeds its bytes to the decoders; exported
    `local:` records fail forever elsewhere. Require
    `isArchiveUrl(url) || isLocalPack(url)`, and drop `local:` records
    whose bytes are absent on import, saying so.
  - **B-72 / B-18**: sounds decoded while their add-on is removed or
    cancelled stay in the bank and the `snds` store with no owner
    (`handleSounds` awaits `addWavs` then `sndsMerge`, and a restore
    doesn't await it; `removeAddon`'s `sndsRemove` can run first). Pass
    the epoch and URL into `handleSounds` and drop the records if the
    add-on is no longer listed.
  - **S-04**: `fetchZip` stores any non-empty 200 body before
    validation (`web/import.ts:271-275`), and a later decode failure is
    classed permanent, so a bad cached copy is a dead end until the LRU
    evicts it. Check cheaply before `packPut` (EOCD for zips, magic
    bytes for loose files) and `packDelete` + refetch once on a decode
    failure of a cached copy.

### Native shells (helper review, code-level; GTK, WebKitGTK and Android not run)

- **N-17 Linux: quit can lose up to 60 s of state; the quit never
  waits for the save.** Severity medium · S. `quit_gracefully`
  (`linux/finsical_shell/shell.py:178-215`) hides the windows, then
  evaluates `"0"` and quits on the reply, assuming the page's
  `visibilitychange`/`pagehide` save has run. Visibility changes are
  queued tasks (and WebKitGTK sends the hidden state after its own
  zero-delay timer), so the `"0"` reply proves nothing; the interval
  save runs only every 60 s now. The smoke test's QUIT step only checks
  that the evaluate returned. Change: evaluate an explicit save (PR
  #357 adds `window.finsical.save` for macOS; add `"save"` to
  `logic.TANK_FUNCTIONS`), then wait ~250 ms inside `QUIT_TIMEOUT_MS`.
  Test: the smoke test asserts `savedAt` advanced. Linux counterpart of
  B-41.
  **Implemented: PR #395** (`claude/linux-quit-save`).
- **N-18 Linux: a client window can reopen fully off screen.** Severity
  medium-low · S. Reopen (`clients.py:124-133`) moves to the saved x/y
  with no monitor check, and the first open accepts any 1 px overlap
  (`_place`, `:203-209`, `logic.intersects_any`), while the tank uses
  the stricter `grabbable_on_any`. Unplug the monitor a window was
  closed on and it reopens where no screen is; the drawn title bar is
  its only handle. Change: one pure helper requiring the 22 px title
  strip to overlap a work area by 44x10, else `beside_tank`. Linux
  counterpart of B-50.
- **N-19 Linux: a maximized or tiled tank gets a stretched input
  silhouette while the page letterboxes the case.** Severity
  medium-low · S. `_Silhouette.region` (`tank.py:58-85`) stretches
  the mask to w x h, claiming the page stretches too, but `#shell` is
  `preserveAspectRatio="xMidYMid meet"` and `layoutMachine` letterboxes;
  `_snap_to_aspect` skips MAXIMIZED/TILED/FULLSCREEN. Result: invisible
  always-on-top bands that eat clicks (black under X11 without a
  compositor). Change: uniform `min()` scale plus offsets; a pure
  `letterboxed_shape_rects(shape, vb, w, h)` in `logic.py`. Linux
  counterpart of B-27.
- **N-30 Android: renderer loss restarts in the background, counts
  system kills as crashes, and its error screens never retry.**
  Severity low-medium · S. `MainActivity.java:855-863` restarts for
  `didCrash()` true and false; every loss counts toward
  `RENDERER_RESTARTS` (3 per 60 s) and `recreate()` runs even while
  stopped; past the cap, and on "WebView unavailable" (during a WebView
  update), a static TextView stays until the app is swiped away
  (`singleTask`, no retry in `onStart`). The "saves every 10 s" comment
  (`:714`) is stale (60 s). Change: count only `didCrash()`; defer
  `recreate()` to `onStart` when stopped; retry problem screens in
  `onStart`.
- **N-31 Crash recovery leaves an invisible floating window (macOS and
  Linux), and macOS `reload()` does nothing before the first commit.**
  Update to **B-28**. `webViewWebContentProcessDidTerminate`
  (`macos/Finsical.swift:950-966`) only calls `reload()`, which WebKit
  ignores with an empty back-forward list (Linux already falls back to
  `load_uri`, `web.py:158-165`); past the cap both shells only log,
  leaving a transparent, always-on-top, click-eating window. Change:
  `load(URLRequest)` when `backForwardList.currentItem == nil`; past
  the cap show "The aquarium stopped unexpectedly" (Reload/Quit).
- **N-32 Take a Picture failures are silent on Linux and macOS, and
  Linux can't save to non-local locations.** Severity low · S.
  `shell.py:587-594` needs `file.get_path()` (GVFS locations without
  FUSE fail) and only logs write errors; macOS logs only
  (`Finsical.swift:685-692`); Android toasts. Change:
  `Gio.File.replace_contents_bytes_async` plus a `Gtk.AlertDialog`;
  an NSAlert on macOS.
- **N-33 Linux: Larger and restore never fit the tank to the work
  area.** Severity low · S. `step_size` (`tank.py:283-297`) keeps the
  top-left and only sets the size; `_restore_frame` restores a saved
  size larger than the monitor; `clamp_to_visible` moves but never
  shrinks. A tank at (1500,700) 400x300 on a 1920x1050 work area ends at
  x 2000 after one Larger. Change: a pure
  `stepped_tank_frame(frame, step, aspect, min, area)`.
- **N-34 Linux: every case switch blocks the UI thread 45-140 ms.**
  Update to **P-14** (macOS only today). `load_mask` (`tank.py:88-147`,
  GdkPixbuf decode plus CPython `fill_interior`) runs in the bus
  handler with no cache; measured 23-47 ms decode plus 16-90 ms fill on
  the real case PNGs. Holding an arrow key in the Machine list repeats
  the stall. Change: a 3-4 entry LRU of `_Silhouette` by machine id, or
  ship pre-filled A8 masks.
- **N-35 Linux menus: no Fish Names or Minimize, and the Wayland-
  disabled toggles show checked.** Severity low · S. macOS has Tank >
  Fish Names and Window > Minimize (`Finsical.swift:721-733`,
  `:1193-1195`); Linux's `TANK_FUNCTIONS`, `APP_MENU`, `MENU_BAR`
  (`logic.py:878-888`, `:1152-1181`, `:1198-1223`) have neither, though
  `toggleNames` is in the bridge; an undecorated tank can only be
  minimized by a WM key. On Wayland, Float Above and All Desktops are
  greyed out but checked (`shell.py:484-491`). Change: add both items;
  uncheck disabled toggles.
- **N-36 Linux: fixed-size client windows can be resized or
  maximized.** Severity low · S. `ClientWindowState.hints()` computes
  max = min (`logic.py:532-539`) but `_apply_hints` applies only the
  minimum (`clients.py:217-225`). Change: PMaxSize = PMinSize on X11
  except while folded; try `set_resizable(False)` on Wayland.
- **N-37 Packaging: the tarball litters the install prefix, and About
  names a .deb-only path.** Severity low/nit · S. `build-tarball.sh:
  107-110` puts LICENSE, THIRD_PARTY_NOTICES.md, LICENSES/ and
  README.txt at the tree top, so the documented `--strip-components=1
  -C ~/.local` drops them into `~/.local/`; `shell.py:36-42` About says
  "See /usr/share/doc/finsical/copyright". Change: move them to
  `share/doc/finsical/` and `share/licenses/finsical/` (and the Flatpak
  manifest's `install -D` paths); pick the About path per layout.
- **N-38 Android: white flash before the tank's first paint.** Nit · S.
  `MainActivity.java:244-248` sets a background only for panels; set
  `Color.BLACK` for `Role.TANK`.
- **N-39 Android config changes that still recreate the Activity.**
  Update to **B-85** (PR #372 adds `fontScale`): also
  `locale|layoutDirection`, `fontWeightAdjustment` (API 31 Bold text),
  `colorMode`, `touchscreen` (`AndroidManifest.xml:23`).
- **N-40 Linux has no opt-in Web Inspector.** Update to **T-24**:
  `web.py:113` hard-codes `set_enable_developer_extras(False)`; honour
  `FINSICAL_INSPECTOR=1`.
- **N-41 Android panel sizes have no drift guard.** Nit · S (T-37's
  "panel sizing vs CLIENT_SIZES drift"): Linux has
  `test_specs_match_the_macos_shell`; extend it to parse
  `PanelSizes.java`'s `sizes.put(...)`.
- **N-42 The WebView 103 floor's stated reason is stale.** Nit:
  `WebViewVersion.java:157-162` cites `DecompressionStream`, which
  `core/data/inflate.ts:24-29` no longer needs (fflate fallback). Fix
  the comment, or audit the bundle (`.at()` needs 92) before lowering.
- Checked and fine (no entry): the DBus menu, the Wayland appmenu
  ctypes tables, `WebRoot`/`AssetPaths` path handling, version gating,
  the Flatpak locale fallback, the restart/crash limiters, AppArmor
  detection, the bus relay (U+2028 escaped), Android's navigation
  policy and token-bound blob bridge.

## Performance

- Measured on this container: a 24-fish tank (synthetic packs) costs
  about 6% of a core on the main thread (script 3.5%) with the CRT off;
  name tags on, 8%; paused, 2.3% (the rAF loop still runs syncLight,
  syncFeedHover, runLife and showNotices at the display rate). Nothing
  here stutters on the main thread; the existing P-entries (P-02 decode
  on install, P-09 interpolation, P-29 catch-up bursts) remain the
  smoothness work. No new perf entries from the measurements.

## Visual and layout

### N-04 Name tags pile on top of each other in a busy tank

Severity low · Size S · Value 4/5 · Risk 2/5 · verified in Chromium ·
**implemented: PR #385** (`claude/nametag-declutter`)

With 24 fish and Fish Names on, tags near the surface and around a
feeding crowd overlap so badly that names can't be read (screenshot
`c-heavy-names`: five tags stacked in the top-left corner).
`tagPlacement` (`web/nametags.ts:25`) places each tag alone. New fish
enter at the surface and hungry fish beg there, so the worst pile-up is
exactly when names matter (a new arrival). Change: a pure
`declutterTags(spots, sizes, order)` pass after placement: in a stable
priority order (Get Info fish, then the newest, then by id), try above,
below, then a nudge of up to one tag height; a tag that still overlaps a
higher-priority one hides for that frame. Keep each tag's last side
(hysteresis) so tags don't flip as fish cross. Acceptance: vitest for
the pure pass (no two kept boxes intersect; side sticks unless blocked;
deterministic); Playwright with the synthetic packs, no overlapping
`.nametag` rects.

### N-05 `#dropmsg` is a translucent navy pill

Severity nit · Size S · Value 2/5 · Risk 1/5

`web/app.css:42-51`: rounded 4 px, `rgba(0,0,80,.78)`, white text.
Mac OS 8 had no toast; the nearest period look is a Platinum help tag
or a small modeless status window. Restyle together with N-01 so the
tank's two transient messages share one Platinum chip style.

## UX and convenience

(see helper sections below)

## Mac OS 8 fidelity

### N-06 The About box says "for modern Macs" and shows no version

Severity nit · Size S · Value 2/5 · Risk 1/5

`aboutContent()` (`web/menubar.ts:222`) still describes "A little
aquarium for modern Macs"; the browser About is what Linux and Android
users of the web build see too, and the native About panels exist.
The missing version is already A-04's open remainder. Change the blurb
to "A little aquarium in the spirit of…" and add "Version 0.8.0" under
the title (from `package.json` at build time, which
`scripts/check-version.mjs` already keeps in step).

## Missing features and discrepancies to the original (AquaZone fidelity)

Source: a research helper read the **AquaZone Deluxe II with Guppies
User's Guide** (Windows, 1999; on archive.org in
`aquazonewithguppiesandaddons/AQUAZONE.iso`, `Win/GUIDE/AZGuide.exe`,
cited as `@offset`, the offsets ANALYSIS.md already uses), the 1993
box back and Mac 1.5 screenshots on Macintosh Garden, the ATPM 4.03
(1998) and Macworld (1995) reviews, aquazone.me and ja.wikipedia.
Note: macworld.com/article/177208 is a different product (Allume's
2005 *Aquazone Seven Seas* screensaver). The original's menus were
File (New/Open Aquarium, Add Fish and other Items, Remove Fish or
Eggs), Edit (Aquarium Layout, Aquarium Information), Reference (Fish,
Plants, Accessories, Water, Diseases), Attend (Food, Medication,
Change Water, Heater, Filter, Light) and Options (Fullscreen, Menu Bar,
Names, Sound, Tool Bar) (@2683592). Most rows of the comparison map to
existing entries (F-02, F-04, F-06, F-07, F-10, F-11, F-13 to F-19,
F-26, F-28, F-32, U-03, U-15, U-21, U-39, B-23, D-03); the new ones:

- **N-43 Light timer as a cycle on tank time.** The original's light
  timer is "hours of a cycle that doesn't have to be a 24-hour cycle"
  (@2091442, @2850266), and speed 0 turns it off (STR# cited in F-10),
  i.e. it runs on tank time. Finsical's timer follows the wall clock
  (and the default is a 13-minute demo day, a deliberate choice). Add
  `LightMode "cycle"` (`lightHours`, `darkHours` 1-23, anchored in tank
  minutes) to `core/light.ts`, passing `sim.aquarium.minutes` from
  `syncLight`; two hour pop-ups on the Lighting pane and a "next
  switch" line in Stats. Acceptance: 8 h on / 4 h off switches at tank
  minutes 480 and 720 and repeats; at speed 10 it runs 10x faster in
  wall time; Pause holds it. Size M · Value 3/5.
- **F-07 update (new evidence): the auto-feeder runs on open-tank
  ticks, not tank time.** `tickCount % AUTOFEED_TICKS`
  (`web/main.ts:2302`, `:3785`) feeds every 45 minutes the window is
  open, ignoring Aquarium Speed and the time the app is closed, while
  the original's feeder has "Add food in" and "Interval", accounts for
  speed, can't run at speed 0 and keeps "feeding" nothing when the
  bottle is empty (@2325564, @2844852, @2555603). Step `nextFeedAt` /
  `interval` in tank minutes inside `advanceLife` (default ~12 tank
  hours); read the Mac CODE feeder routine before deciding how catch-up
  meals apply.
- **N-44 Fighting and territorial fish.** ATPM: fish "school, are born,
  fight and die"; the guide ties Courage to territorial tankmates
  (@2799106). ORIGINAL-SIM lists fighting as not reimplemented. A spike
  first: find the aggression rule in the Mac 1.7.9 MacsBug names and
  FsTI, record it in ORIGINAL-SIM with its source, then add a
  chase-and-nip state scaled by courage. Peaceful stock species must
  never fight. Size L.
- **N-45 The original menu layout.** Finsical has Finsical/Tank/
  Window/Help; the original had File/Edit/Reference/Attend/Options.
  An optional reshuffle of the browser bar, the native menus and the
  README: Attend (Feed, Auto-Feeder…, Medication…, Change Water…,
  Heater…, Filter…, Light…) opening Tank Stats on the matching tab or
  control, Reference (Fish…, Water…, Diseases…), Options (Full Screen,
  Menu Bar, Names, Sound, Tool Bar). A product call; overlaps U-14's
  menu-model refactor, which should land first.
- **N-46 A Fishkeeping Library.** The original shipped the AZ Library,
  11 illustrated books (Aquarist's Dictionary, Breeding, Setup/Layout/
  Maintenance, Fish Feeding, Disease and Medication, an A-Z Tropical
  Guide; @1967556, ATPM), and Info books on each medicine. Help >
  Fishkeeping Library… in the `showDocWindow` pattern with articles
  Finsical writes itself (never the guide's text): filter, water
  changes, chlorine, feeding, diseases generated from `curesFor`,
  breeding, a glossary; a "?" beside each Keeping row in Tank Stats.
  Acceptance: every Keeping control opens its article; the disease
  article lists exactly the sim's cures. Related F-32, F-40.
- **N-47 AquaZone's own buttons, as an option.** Dialogs used a roundish
  "OK plant" and a short broad "Cancel plant", and actions were icons:
  a food container, a medicine bottle, a bucket, an Info book, a Memo
  pencil, a trash can (@2007415, @2020345). An opt-in "AquaZone
  buttons" look: plant-shaped OK/Cancel in alerts, a bucket on Change
  Water, a bottle on Add, a shaker on Feed, all original pixel art;
  Platinum stays pixel-identical when off.
- **N-48 Holding Tank and Graveyard.** Removing a fish in the original
  put it in a fish file, a "deep-freeze" where it stops ageing
  (@2765728); the guide jokes about a "graveyard file", and Mac 1.0
  "exported [dead fish] to the Toilet" (Macworld 1995). Overview's
  Remove could offer "Put in Holding Tank" (life frozen, not counted
  against the cap, with Return) or "Release"; removed bodies go to a
  Graveyard list with an optional Flush. Data: `SavedTank.held`.
  Acceptance: a round trip restores the life fields exactly and
  holding time doesn't age the fish. Related U-04 (no undo for
  Remove), N-07.
- **N-49 Tank size and volume.** New Aquarium took a pixel size
  (presets or W x H, minimum 250x250, @2685734; "choose a tank based on
  screen size, not gallons", Macworld). Finsical has one volume
  (`TANK_LITRES`, `core/aquarium/aquarium.ts:51`). A size choice at New
  Tank (40/100/200 L) setting litres, dose sizing and the fish cap;
  check the AQUA record for how the original derived volume first.
  Related F-26.
- **N-50 Heater step is 0.5 °C; the original's is 0.1 °C, typed or
  scrolled** (@2067546, @2848992). `HEAT_STEP` (`web/stats.ts:191`):
  0.1 with press-and-hold repeat, or a typed field. Nit · S.
- **F-37 note:** the original's Names "pause everything on your screen
  so that you can read them" (@2852534-@2866744). Finsical's tags
  deliberately follow the fish; record the difference, optionally a
  "Freeze while names show" setting.
- **Corrections for the fold.** F-14's Problem text still says filter
  dirt and Clean Filter are missing; they shipped (CHANGELOG,
  ORIGINAL-SIM), only the Water Settings dialog remains. F-19: the
  guide calls the bubbler an "air pump" (@2063138, @2303754);
  ORIGINAL-SIM's "no air pump" is about the simulation only. F-30: the
  original's "water quality graphs" were the Change Water bar charts
  (current purple, new pink, result green per the guide), not time
  series, so F-30's history graph is a modern addition. The original
  had no screensaver ("AQUAZONE does not have screen saver
  functionality", FAQ @2557631) and no source shows fish on the
  desktop; F-28 and D-21 are modern ideas, not fidelity gaps.

## Platinum fidelity and layout (helper review in Chromium at the native sizes, DPR 2)

Each rect below was measured with getBoundingClientRect in the `dist`
build at the shells' fixed window sizes; screenshots were in the
review scratchpad. The native macOS app was not run.

- **N-51 Preferences > Picture: the Color group runs into the caption
  separator.** Update to **V-30** (closed, but back). At 565x518 the
  Color group spans y 378-453 while the footer separator sits at
  449-451, so the group's bottom bevel lands on it as a triple line and
  the caption starts 4 px below. PR #225 dropped its gap reduction when
  #318 enlarged the window, and #318's Vertical skew row used the extra
  height. Change `#pfpicture .pfgroup + .pfgroup { margin-top: 30px }`
  (`web/app.css:256`) to 24px like the Monitor pane (`:254`): the group
  then ends at 441. Add a Playwright check that every pane's last
  `.pfgroup` ends >= 6 px above `#pffoot .osm-separator` at 565x518.
  Severity medium · S.
  **Implemented: PR #389** (`claude/prefs-layout-fixes`).
- **N-52 Lighting: the hour pop-ups truncate "8:00 AM" to "8:00 …".**
  `.pfhour { width: 76px }` (`web/app.css:297`) leaves 44 px for text;
  `hourLabel` gives "8:00 AM" (46 px) and "12:00 AM" (53 px) in Charcoal
  12 (`core/light.ts:161-173`), so the pop-up hides AM/PM (its menu
  shows them). Mac OS 8 pop-ups are as wide as their widest item. Size
  from the widest `HOURS` label (`web/prefs.ts:743`) with Osmium's
  `textWidth` + 34 px chrome, or at least `width: 88px` (still fits the
  443 px pane). Severity medium · S. Related B-02 in the independent
  appendix (AM/PM) and U-37 (12- vs 24-hour).
  **Implemented: PR #389** (`claude/prefs-layout-fixes`).
- **N-53 Two glyphs in Tank Stats fall back to an anti-aliased system
  font.** U+2212 "−" on the steppers (`web/stats.html:37`, `:51`) and
  U+00D7 in "2× faster" (`web/stats.ts:210`) are not in Osmium's
  Charcoal 12, so the minus is a thin system line beside a bold
  Charcoal "+". Mac Roman had neither; use "-" and "2x faster". A
  crawl of every page, menu, pop-up and window found no other gaps
  besides ⌘ (U-14) and the middle dot (V-18). Add a vitest that scans
  literal UI strings against the three Osmium strikes. Severity low · S.
  **Implemented: PR #390** (`claude/stats-polish`).
- **N-54 The Get Info card looks like a System 7 windoid, selects its
  text and shows web cursors.** Pale 2-px stripes (`web/app.css:157`)
  instead of Osmium's 1 px white / 1 px #777, a white body, a
  translucent shadow, `cursor: pointer` on the close box and `cursor:
  text` on the title, selectable text, fractional placement.
  **Implemented in PR #388** with N-03.
- **N-55 A normal button beside a default button sits 3-4 px high.**
  About (`.dbfoot`, `web/app.css:134`, no `align-items`) and the Import
  footer (`.idonate` 9 px vs `.iadd` 10 px margins, `:508-509`; the
  credit line centred 2.5 px high). The alerts already do it right
  (`.alertbuttons { align-items: center }`, `:574`). Mac OS 8 aligns
  neighbours with the inner button, the default ring drawn outside it.
  Change: `.dbfoot { align-items: center }`, `.idonate { margin-top:
  13px }`, `.icredit { margin-top: 17px }`. Severity low · S.
  **Implemented: PR #394** (`claude/platinum-dialogs`).
- **N-56 Rename accepts 48 characters and keeps 24, silently.**
  `NAME_MAX = 24` (`web/fishname.ts:9`) but both fields allow
  `maxLength: NAME_MAX * 2` (`web/overview.ts:216`, `web/main.ts:880`);
  "Bubbles the Magnificent Goldfish of the Deep" was stored as "Bubbles
  the Magnificent" with no feedback. The Finder stops taking characters
  at the limit and beeps: refuse input in `beforeinput` once
  `Array.from(value).length` reaches NAME_MAX, with the alert beep.
  Severity low · S.
- **N-57 Drop feedback looks like a web dropzone and a toast, and
  errors vanish after 4 s.** The cue (`web/app.css:30-41`) is a navy
  wash with a dashed frame and "Drop to add" although its comment says
  "classic-Mac border-invert"; `#dropmsg` is a rounded translucent chip;
  dropping a `.txt` gave an 85-character, 3-line error, partly over the
  bezel, gone after 4 s (`dropSay`, `web/main.ts:3001-3012`). Mac OS
  8's Drag Manager highlight is a 2 px frame inside the receiver, and a
  file the app can't open gets a caution alert with OK. Change: a 2 px
  solid frame with no wash or label; failures through `showAlert`;
  successes in a square #ddd chip (merges N-05). Related U-10.
  Severity low · S.
- **N-58 Stats > Keeping mixes two label fonts in one column.**
  "Heater:" and "Filter:" are `.osm-label` (bold Geneva 10,
  `web/stats.html:35`, `:43`); "Change:", "Medicine:" and "Time:" are
  `.osm-popup-title` (Charcoal 12). Give the first two the pop-up-title
  font. Severity low · S.
  **Implemented: PR #390** (`claude/stats-polish`).
- **N-59 The Lighting pane's group starts 12 px higher than every other
  pane's.** No `#pane-lighting .pfgroup { margin-top: 12px }` rule
  beside the Sound, Effects and Picture ones (`web/app.css:255`, `:278`,
  `:286`). Nit · S.
  **Implemented: PR #389** (`claude/prefs-layout-fixes`).
- **N-60 Copy Summary: "Copied!" is off-centre and the reset timer
  ignores its own comment.** The handler sets `textContent`
  (`web/stats.ts:364`, `:369`), so the label sits left at Osmium's
  fitted padding; `let copyTimer` is declared inside the handler
  (`:362`), so `clearTimeout` never clears an earlier click's timer, and
  a second click 1 s after the first reverted 0.7 s later. Move the
  timer to module scope, and keep the button's title fixed with
  "Summary copied." in the `#sfoot` status span (Mac OS 8 buttons don't
  retitle), or use `setButtonTitle`. Nit · S.
  **Implemented: PR #390** (`claude/stats-polish`).
- **N-61 "Empty Tank…" stays enabled in an empty tank and does
  nothing.** `if (!tankItems()) { disarmEmpty(); return; }`
  (`web/overview.ts:248`); Empty Trash… is dimmed when the Trash is
  empty. `emptyBtn.disabled = !tankItems() || tankGone` in `render()`.
  Nit · S. Related U-41 (its red text).
  **Implemented: PR #394** (`claude/platinum-dialogs`).
- **N-62 With no fish, Stats' two meter bars differ in length.** The
  Water quality bar spans x 119-244 and Avg. hunger 119-296, because
  `meter()` omits the sparkline when there is no data
  (`web/stats.ts:65-67`) and the flex bar grows; the hunger bar draws an
  empty track beside "—". Always reserve the 46 px spark column; hide
  or dim a bar whose value is null. Nit · S.
  **Implemented: PR #390** (`claude/stats-polish`).
- **N-63 The Shortcuts window's OK is left-aligned** (`.dbkeys
  .osm-button { margin-top: 14px }`, `web/app.css:141`) while About
  centres its buttons; Mac OS 8 puts OK at the bottom right:
  `display: block; margin: 14px 0 0 auto`, and right-align About's
  footer. Nit · S.
  **Implemented: PR #394** (`claude/platinum-dialogs`).
- **N-64 Text fields show a black double ring on focus.**
  `.ifilter:focus` and `.alertfield:focus` use `box-shadow: 0 0 0 1px
  #fff, 0 0 0 2px #000` (`web/app.css:463`, `:568`), which in the Rename
  alert reads as a second default-button ring. Mac OS 8.0 drew none;
  8.5 drew a 2 px accent ring, which Osmium imitates (`outline: 2px
  solid #6666cc`, `osmium.css:812-816`). Use that. Nit · S.
  **Implemented: PR #394** (`claude/platinum-dialogs`).
- **N-65 "Aquazone (9003inc)" vs "AquaZone by 9003 Inc."** About
  (`web/menubar.ts:238`), Help > "Aquazone, the original…" (`:403`) and
  the welcome (`web/welcome.ts:23`) say "Aquazone"; the drop error
  (`web/main.ts:3224`), the page meta and the native About
  (`macos/Finsical.swift:774`) say "AquaZone". Use "AquaZone" and "9003
  Inc." in visible copy. Nit · S.
- **F-10 update (the PAUSED label's font):** the boot screen's "Welcome
  to Finsical" box has the same fallback: `ctx.font = "10px Charcoal,
  Chicago, monospace"` (`web/boot.ts:275`) renders in a system font
  with 151 grey levels (vs 2 for `12px "Osmium Charcoal"`), at a
  fractional width (114.39 px) that blurs the box edge. Share F-10's
  fix: `installOsmium()` at startup, `12px "Osmium Charcoal"`, integer
  coordinates.
- **F-30 update (stopgap):** each sparkline opens as an empty framed
  box with a 2 px stub at its right edge; until two samples exist, draw
  a dotted line at the current value.
- **N-66 (idea) An Application menu at the right of the menu bar.** Mac
  OS 8 put the front app's icon right of the clock; its menu holds
  "Hide Finsical" (entering Zen), "Show All" and the running apps with
  Finsical checked. Nothing is there in the browser bar today.
- **N-67 (idea) Little Arrows for the Heater and water-temperature
  steppers**, the Date & Time / Memory control, instead of two push
  buttons; removes N-53's glyph gap too. Needs a sprite in osmium-ui.
- **N-68 (idea) Double-click a title bar to collapse the window**
  (WindowShade) for the client windows and the in-page windows:
  `osmium-ui/src/window.ts` and `host.ts` have no dblclick handling;
  wire it to `setShaded(!shaded)`. Pairs with N-21 for the tank.

## Delight and quirky ideas (new this pass)

Each checked against ANALYSIS.md's D-, F- and A- entries; none is
filed there.

- **N-20 Finder Labels for fish.** Mac OS 8's Label menu (Essential,
  Hot, In Progress, Cool, Personal, Project 1, Project 2, with their
  colours) applied to fish: pick one in Get Info or Tank Overview; the
  name tag and the Overview row take the label colour, and Overview can
  sort by Label. Tells look-alike fish apart, and is the most Finder
  thing a fish list could do. Saved per fish like `name`.
- **N-21 WindowShade the tank.** Mac OS 8's collapse box / double-click
  the title bar: in the native shells a double-click on the case (or a
  Window > Collapse item) rolls the window up to a thin strip of water
  along the case's top edge where the fish keep swimming in a 320x24
  letterbox, and a second double-click rolls it down. The original
  AquaZone Desktop was all about a tank that stays out of your way.
- **N-22 Desktop patterns behind the case in the browser.** The browser
  page is flat black around the case. Offer the Mac OS 8 Desktop
  Patterns control panel's look (a few 8x8 1-bit and colour patterns,
  plus "Mac OS Default" grey) as the page background, picked in
  Preferences > Machine. Native windows keep the real desktop.
- **N-23 Sad Mac fishbowl.** When the tank can't start (missing bundle,
  WebGL lost for good, a corrupt save kept aside), show the boot
  parade's fishbowl icon with X eyes and a hex "error code" under it on
  a black screen, then the explanatory alert. Turns an error into a
  period joke without hiding the explanation.
- **N-24 Sneezing sick fish.** A sick fish now and then puffs a single
  tiny bubble from its mouth with a little backward jolt. A visible
  cue for sickness besides the 55% alpha, at nearly no cost (one
  `spawnBubble` and a 4-tick nudge).
  **Implemented: PR #398** (`claude/sneezing-fish`).
- **N-25 An LCD stick-on thermometer.** Real tanks wear a liquid-crystal
  strip on the glass. A 6x40 px strip in the tank's front corner shows
  the water temperature with the classic green/tan/blue LCD cells, so
  you see a cold tank without opening Tank Stats. Toggle in Effects.
  **Implemented: PR #391** (`claude/lcd-thermometer`).
- **N-26 Fish learn to trust your hand.** Each fish keeps a small trust
  value: feeding while the fish is near raises it, a tap near it lowers
  it. Trusting fish come to the pointer sooner and from further away
  (curiosity, `web/curiosity.ts`); shy ones keep their distance for a
  while after being knocked. Ties the two gestures to a personality the
  owner can see grow. Save with the fish.
- **N-27 Print a Tank Census on an ImageWriter.** Tank > Print Census…
  opens a printable page styled as tractor-feed paper (perforated
  margins, a 1-bit dithered picture of the tank, a table of fish,
  ages and health in a 9-pin font) and calls `window.print()`.
- **N-28 Mac-lore names for fry.** A fry is born unnamed. Offer a
  default name drawn from 90s Mac lore and words (Moof, Sosumi,
  Gershwin, Copland, Cyberdog, Clarus is trademark-adjacent so skip it)
  so a breeding tank fills with characters. Settable off.

## Notes for the fold

- Get Info card wrap (N-03) and the audio hint (N-01) are new; U-41 in
  ANALYSIS.md is the "Empty Tank… red text" entry, not the audio hint
  (the eighteenth-pass appendix reused the ID); the fold should give
  the eighteenth-pass audio-hint entry a fresh ID.

## Review follow-ups (this pass, from the PR rounds)

Recorded so the fold keeps them; none blocks its PR. The full triage
(applied, refuted, declined, with reasons) is in the review-response log
below.

- **Store the thumbnail cache at list size.** `storeThumb`
  (`web/import.ts:~1500`) persists previews capped at 256 px, but the
  only reader (the cache-load path, `:~1543`) immediately reduces them
  to the 38x28 mini. Persisting `miniThumb(pv)` (or a 2x version for
  HiDPI) would cut the `thumb2:` store by roughly 99% in the shared LRU
  budget. Raised by GLM on #393; out of that PR's scope. Severity low · S.
- **A failed thumbnail PNG write is not retried in the session.**
  After #393, `thumbStored` marks a URL before `storeThumb` resolves, so
  a quota failure skips the PNG until the next launch, which re-renders
  and re-stores it. Low; declined on #393 as best-effort cache.
- **The fake IndexedDB's `lose()` lets in-flight transactions
  complete.** `web/store.idb.test.ts` (from #392) closes the connection
  but never fires `onabort` on transactions created before the loss,
  so "a write cut off by the loss resolves as failure" is untested
  (production already treats `onabort` as failure). Pairs with T-17.
- **A refused drop also logs "no manifest.json, pack file, or 'snd '
  found".** After a fish-cap refusal (pre-existing) or the decor-cap
  refusal (#397), `imported` stays 0 so the drop handler's final
  `console.warn` (`web/main.ts`, end of the drop IIFE) claims nothing
  usable was found. Console only; count refusals as handled. Trivial.
- **Sneeze extras (#398).** No sound and no Effects toggle by choice
  (a life-model cue, and the Effects pane already gains rows in #383
  and #391). Optional follow-ups: a tiny "achoo" from the bank if one
  fits, and an Effects row if a purist asks.
- **Possible overlap:** another agent's open PR titled "Save the tank
  before the native shell lets a quit land" (#357) may cover the same
  race as #395 (N-17) on Linux, or the macOS one (B-41). Not read, per
  instructions; the maintainer should compare before merging both.
