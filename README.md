# Finsical

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
