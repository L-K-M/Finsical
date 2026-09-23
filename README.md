# Finsical

**Latest release:** v<!-- version -->0.3.0<!-- /version --> · [Download](https://github.com/L-K-M/Finsical/releases/latest) · [Changelog](CHANGELOG.md)

![Screenshot showing a Performa backdrop](media-sources/screenshot.png)

> [!IMPORTANT]
> LLM disclosure: This codebase was written with substantial help from large language models: AI coding agents working from the [`AGENTS.md`](AGENTS.md) brief in this repo.

A lightweight retro virtual aquarium for modern macOS: little pixel fish in a
floating window, in the spirit of the 90s Mac classic **[AquaZone](https://www.youtube.com/watch?v=I05H8mLGd-s)**.

Ships no copyrighted assets: the app imports the original game data you supply
(or downloads from public archives) and converts it into a runtime bundle.

![Screenshot showing a classic backdrop](media-sources/screenshot2.png)

Archive.org integration inspired by [Afterglow](https://morphing.cloud/afterglow/).

## Download and first launch

**Requirements:** macOS 12 or later on an Apple silicon Mac. The release
build contains only an arm64 binary; on an Intel Mac, [build from
source](#build-from-source), which compiles for the Mac that runs the build.

1. Download `Finsical-<version>-macOS.zip` from the
   [latest release](https://github.com/L-K-M/Finsical/releases/latest)
   (`SHA256SUMS.txt` next to it lets you check the download).
2. Unzip it and move `Finsical.app` to `/Applications`.
3. Open it. Finsical is ad-hoc signed and not notarized by Apple, so
   macOS blocks the first launch:
   - **macOS 15 and later:** after the warning, choose **Done**, open
     **System Settings > Privacy & Security**, scroll to **Security**,
     click **Open Anyway** next to the Finsical message, and confirm.
     Control-click > Open no longer bypasses Gatekeeper on macOS 15.
   - **macOS 12 to 14:** Control-click the app, choose **Open**, then
     **Open** again in the dialog.

   Alternatively, remove the quarantine flag in Terminal:

   ```sh
   xattr -dr com.apple.quarantine /Applications/Finsical.app
   ```

macOS remembers your choice; later launches open normally.

## Using Finsical

| Action | How |
| --- | --- |
| Feed the fish | Click near the water's surface (the top 15% of the tank) |
| Tap the glass | Click lower in the tank; nearby fish startle |
| Move the window | In the app, drag the computer case around the tank, or the top edge of the window |

Menu commands in the app:

| Command | Menu | Keys |
| --- | --- | --- |
| Preferences… | Finsical | Cmd-, |
| Quit Finsical | Finsical | Cmd-Q |
| Tank Overview | Tank | Cmd-O |
| Tank Stats | Tank | Shift-Cmd-S |
| Import Add-ons… | Tank | Cmd-I |
| Feed Fish | Tank | Cmd-F |
| Toggle CRT Effect | Tank | Cmd-R |
| Support the Internet Archive | Tank | (opens archive.org/donate in your browser) |
| Close, Minimize | Window | Cmd-W, Cmd-M |

Closing the tank window quits Finsical.

Keys on the tank page, useful in the browser build (see
[Build from source](#build-from-source)):

| Key | Action |
| --- | --- |
| F | Feed the fish (also works in the app) |
| C | Toggle the CRT effect (also works in the app) |
| S | Open Tank Stats in a tab (browser only) |
| Ctrl-I or Cmd-I | Open the add-on browser over the tank |

On touch screens without a keyboard, an **Add-ons…** button opens the
add-on browser.

## Add-ons

**Import Add-ons** lists add-ons hosted on the Internet Archive. Pick a
section from the **Show** pop-up, select an add-on to preview it, and click
**Add to Tank**. The sections are:

| Section | Contents |
| --- | --- |
| Fish | Add-on and modded fish, plus the Japanese release's fish and its non-retail bonus fish |
| Gravel | Gravel packs from both archive.org items |
| Plants, Accessories | Meka Asia packs and the Japanese release's item library |
| Backgrounds, Tanks | The Japanese release's backdrops and tank sets |
| Sounds | Audio from the Japanese set's non-retail bonus bundle, such as its CD bonus track |

The game's own sound effects are not on archive.org; drop your copy onto the
tank or the Import Add-ons window to add them.

You can also drag files from the Finder onto the tank:

| What you drop | What happens |
| --- | --- |
| An `.azpack` folder (made by the [asset tools](#asset-tools)) | Its fish, art and sounds are imported |
| AquaZone fish pack files such as `.fsh` or `.REZ` | Their fish and art are imported |
| Resource files with `snd ` resources: `.rsrc`, MacBinary `.bin`, BinHex `.hqx`, AppleDouble | Their sounds are imported and kept |
| Audio files: `.wav`, `.mp3`, `.aif`, `.aiff`, `.m4a`, `.ogg`, `.flac` | Imported as sounds and kept |

Sound files over 32 MB are skipped. The Import Add-ons window accepts the
sound formats too.

Installed archive.org add-ons come back at every launch. Remove fish and
add-ons in Tank Overview.

## Windows

| Window | What it does |
| --- | --- |
| Preferences | **Machine**: the computer case around the tank (Macintosh Plus, Performa 450, 20th Anniversary Mac, iMac G3 and G4 variants, or a bare tank). **Monitor**: the CRT effect and its picture tube sliders. **Picture**: the monitor's front-panel controls. |
| Tank Overview | Everything in the tank as a sortable Name, Kind and Status list, with **Remove** |
| Import Add-ons | The archive.org add-on browser described above |
| Tank Stats | Water quality, average hunger, the hungriest fish, fish and food counts, day or night, tank age, and care hints |

## Your data

Everything stays on your Mac:

- **localStorage**, under `finsical:*` keys: the tank itself
  (`finsical:tank`: fish, water quality and installed add-ons, saved every
  10 seconds and when the page closes), the CRT switch and settings
  (`finsical:crt`, `finsical:crt-cfg`), the machine case
  (`finsical:machine`), and the last Preferences pane and add-on section
  (`finsical:prefsPane`, `finsical:addonSection`).
- **IndexedDB** database `finsical`: downloaded add-on archives,
  thumbnails and archive.org listing pages, so installed add-ons restore
  offline. Cached downloads are evicted least recently used once they pass
  about 150 MB. Sounds you import are stored there too and are never
  evicted.
- **macOS defaults** (`dev.finsical.app`): window positions.

The only network host Finsical contacts is archive.org, for add-on listings
and downloads. Other web links open in your default browser.

## Build from source

You need Node.js 22 or later and Python 3.9 or later (stdlib only). The
macOS app also needs the Xcode Command Line Tools (`xcode-select --install`);
there is no Xcode project.

```sh
npm ci
npm run typecheck
npm test
python3 -m unittest discover -s tools/tests -p 'test_*.py' -t .
```

**Browser build:** `npm run dev` rebuilds the pages on every change and
serves `web/` at <http://localhost:8080/>. The tank is `index.html`; open
the other windows (`prefs.html`, `overview.html`, `addons.html`,
`stats.html`) as tabs in the same browser, where they reach the tank over
`BroadcastChannel`. Put an emitted `.azpack` (`manifest.json` at its root)
in `web/pack/` to load it at startup; the app build bundles it too.

**macOS app:** `scripts/build.sh` runs all the checks above, then builds
`macos/Finsical.app`. Options:

| Option | Effect |
| --- | --- |
| `--clean` | Delete the previous app build and `dist/` first |
| `--install` | Copy the app to `/Applications` and reveal it in the Finder |
| `--run` | Open the built app |

On other platforms, `scripts/build.sh` runs the checks and stops before
packaging.

## Asset tools

`tools/fetch.py` downloads AquaZone archives from archive.org (by default
the [`aquazonewithguppiesandaddons`](https://archive.org/details/aquazonewithguppiesandaddons)
item, or pass another identifier) and converts every pack and sound resource
inside into `.azpack` bundles in `packs/`. `tools/azpack.py` converts local
`.fsh`, `.acc`, `.plt`, `.azn` or `.REZ` files:
`python3 tools/azpack.py NeonTetra.fsh -o NeonTetra.azpack`. Drag the output
folder onto the tank, or put it in `web/pack/`. Both need Python 3.9 or later
and nothing beyond the standard library; run either with `--help` for
options.

## Credits and trademarks

- **AquaZone** is by 9003 Inc. (OPENBOOK 9003) and was published by
  Mindscape. Finsical ships none of its data.
- Add-ons are hosted by the [Internet Archive](https://archive.org/), from
  [AquaZone with Guppies and Add-ons](https://archive.org/details/aquazonewithguppiesandaddons)
  and the [AquaZone (JPN) Set](https://archive.org/details/aquazone-jpn-set).
- The computer case pictures are user-supplied renders of Apple hardware,
  cropped for the app (see `web/machines.ts`).
- Apple, Macintosh and iMac are trademarks of Apple Inc. Finsical is not
  affiliated with Apple, 9003 or Mindscape.
- The Mac OS 8 look comes from [Osmium UI](https://github.com/L-K-M/osmium-ui).
- The [Unlicense](LICENSE) covers Finsical's own code only. It does not
  cover AquaZone data, add-ons, or the case art. Ported third-party code
  carries its own notices.
