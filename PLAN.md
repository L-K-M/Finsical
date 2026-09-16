# Finsical — Implementation Plan

A modern, lightweight virtual aquarium for macOS, in the spirit of the original
90s **Aquazone** (9003inc): a floating window with little retro fish that you
can keep running all day for free.

Rather than shipping copyrighted artwork, Finsical ships an **importer**: it
downloads the original game files from public archives (archive.org and the
aquazone.me preservation library) — or accepts a local file drop — and extracts
the sprites, palettes, sounds and fish parameters into a runtime asset bundle.
Same model as ScummVM/OpenMW: we ship the engine, the user supplies the data.

## Source material (verified)

| Source | Contents |
| --- | --- |
| `AQUAZONE 1.7.9` (Mac app, from `AQUA179.sit`) | Full resource fork: 252 PICTs, 25 `snd `s, UI, 68k `CODE` + PPC `Joy!peff` code, per-item data records |
| `.fsh` / `.acc` / `.plt` / `.azn` addon files | 9003inc container format: length-prefixed chunks, 8-bit BMP icons, raw indexed sprite frames, param tables |
| `AQUAZONE.REZ` + `GP*.REZ` (Deluxe II ISO) | Same container format carrying the base content |
| `.pct` files | PICT backdrops (data-fork, survived zipping) |

Mac resource types decoded so far (per-species, ID-keyed): `FsTH` names &
description, `FsTI` sim params, `FsT2`/`FsT3` size tables, `FBDP`/`FADP`
catalog PICTs, `ELRA`/`ELRB` RLE sprite frames, `BMV#`/`AMV#`/`BMV*` animation
scripts, `EggI`/`EGPC`/`EGDP` breeding data, `FdHd` food, `Grvl`, `Watr`,
`LigH` lighting, `snd ` events (birth/egg/dead/sick/bubble/tap).

## Architecture

```
tools/     Python (stdlib only) asset pipeline
  sit/     StuffIt archives (via bundled unar)
  rsrc.py  AppleDouble + classic Mac resource fork
  pict.py  PICT v2 -> PNG (PackBits, clut, 1/4/8/16/32bpp)
  pack.py  9003inc container (.fsh/.acc/.plt/.azn/.REZ) -> chunks
  emit.py  -> .azpack (JSON manifest + PNG atlases + params)
core/      TypeScript engine (no DOM deps — testable in node)
  sim/     deterministic tick: fish state, hunger, mood, growth stages
  data/    pack schema + loader (works in node and browser)
web/       Canvas 2D renderer + UI shell (index.html dev app)
macos/     thin WKWebView wrapper (Swift, ships later)
```

Renderer keeps the crunch: nearest-neighbor scaling, original palettes,
day/night tint over the backdrop. The sim runs on a fixed-step clock so the
aquarium is reproducible and unit-testable.

## v1 scope (deliberately small)

- One tank, fish that swim, turn, idle; smooth retro sprite animation
- Feeding: drop food, fish seek and eat
- Bubbles + a tap-on-the-glass scare
- Day/night lighting
- Pack importer: local `.fsh`/`.azpack` drop first, archive.org fetch next
- Floating always-on-top window on macOS

Out of scope for v1: breeding/genetics, water chemistry, the shop/economy —
the data model already contains the hooks (`Egg*`, `SicH`, `Watr`), so these
can grow later without format changes.

## Process

- Work lands via small PRs. Every PR is auto-reviewed by **GLM-5.3**
  (`z.ai` coding-plan endpoint) through `.github/workflows/zai-code-review.yml`,
  iterated to a clean review, then squash-merged.
- No copyrighted assets in the repo — tests synthesize fixtures; the extractor
  reads user-supplied originals.

## Toolchain

- Node/TypeScript: engine + renderer + tests (vitest or node:test)
- Python 3 stdlib: extractor + unit tests (unittest)
- Swift/WebView shell last (can't compile on this Linux dev box; kept thin)
