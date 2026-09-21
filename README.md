# Finsical

**Latest release:** v<!-- version -->0.2.0<!-- /version --> · [Download](https://github.com/L-K-M/Finsical/releases/latest)

![screenshot.png](media-sources/screenshot.png)
> [!IMPORTANT]
> LLM disclosure: This codebase was written with substantial help from large language models: AI coding agents working from the [`AGENTS.md`](AGENTS.md) brief in this repo.

A lightweight retro virtual aquarium for modern macOS — little pixel fish in a
floating window, in the spirit of the 90s Mac classic **Aquazone**.

Ships no copyrighted assets: the app imports the original game data you supply
(or downloads from public archives) and converts it into a runtime bundle.
See [PLAN.md](PLAN.md) for the architecture and roadmap. Downloads live on the
[releases page](https://github.com/L-K-M/Finsical/releases).

## Layout

- `core/` — TypeScript simulation engine (deterministic, node-testable)
- `web/` — Canvas renderer + dev shell
- `tools/` — Python asset pipeline (`.sit`/resource fork/PICT/pack formats)
- `macos/` — WKWebView floating-window shell
- `scripts/` — `build.sh` verifies everything and assembles `Finsical.app`;
  `release.sh` bumps, tags, and ships a release

`scripts/build.sh` runs the checks and builds the app on macOS (`--install`
copies it to /Applications, `--run` opens it); on other systems it verifies the
core only. PRs are auto-reviewed by GLM-5.3 via
`.github/workflows/zai-code-review.yml`.

## Getting assets

Finsical ships no game data. Use a copy of the original disc you are
entitled to (the fetch tool defaults to the public archive.org mirror of it):

```sh
python3 tools/fetch.py   # pulls the disc; every .azpack lands in packs/
```

`fetch.py` converts each pack (`.fsh`/`.acc`/`.plt`/`.azn`/`.REZ`) and
`snd ` resource fork it finds into an `.azpack` — no manual step needed.
To convert loose files from your own disc copy instead:

```sh
python3 tools/azpack.py NeonTetra.fsh -o NeonTetra.azpack
python3 tools/azpack.py "AQUAZONE.rsrc" -o sounds.azpack
```

Then drag the `.azpack` folder onto the aquarium window (or drop it in
`web/pack/` for the dev shell). Fish packs supply sprites, tank packs supply
the backdrop, and a resource fork supplies the sounds.
