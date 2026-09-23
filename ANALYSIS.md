# Finsical Analysis — Shovel-Ready Improvements

Consolidates two independent review passes plus follow-up review
responses. Nothing below is dropped: implemented items stay listed
with their branch/PR so future work can see what landed, and every
open idea is written so an LLM can pick it up cold.

## Completed (other pass, in branches)

- **Bug fix:** `core/sim.ts` `addFish()` truthy coordinate checks fixed (uses `Number.isFinite` on raw input).
- **Bug fix:** Non-primary pointer clicks now call `preventDefault()` to avoid drag interference.
- **Performance:** `swimCache` capped at 1024 with true LRU (refresh-on-hit); `thumbMemo` capped at 512.
- **Performance:** `thumbMemo` refreshes recency on hit.
- **Feature:** Named fish (`feature/named-fish`) — retro names assigned at spawn, saved with tank, shown in overview.
- **Visual:** Enhanced placeholder fish (`feature/placeholder-fish`) — charming pixel design with stripes, smile, tail.
- **Visual:** Bubble animation (`feature/food-animation-bubbles`) — circular bubbles with transparency; food splash on eat.
- **Visual:** Light rays (`feature/light-rays-night`) — drifting diagonal beams; deeper night blue.
- **Audio/UX:** Interactive machine (`feature/interactive-machine`) — synthetic click tone on case press.
- **UX:** Personality hints (`feature/fish-personality`) — playful status notes in Tank Overview.

## Completed (this pass, PRs open for review, all at steady state)

- **PR #87** (`audit/backdrop-cover-prescale`): backdrops
  center-cover-crop to 320x200 via tested pure `coverCrop`
  (`web/render.ts` + `web/cover.test.ts`) instead of stretching;
  backdrop/gravel pre-fitted once at import so `render()` is a
  1:1 blit (fixes aspect distortion + the biggest 2D frame
  cost). Follow-up applied per review: crop rects rounded to
  whole texels with in-bounds clamp; TANK-dims invariant noted.
  CI green (core-linux + native-macos), GLM round 2 minor-only.
- **PR #88** (`audit/crt-perf`): CRT buffer capped at 2x DPR
  (grille is sub-game-pixel already there; ~2.25x fewer pixels
  on 3x Retina); `resize()` re-measures only when dirty
  (ResizeObserver + window resize flag; DPR still read
  per-frame so zoom resizes). Review asked for teardown;
  answered with a documented single-init lifetime (module-scope
  call, no dispose path on CrtFilter). CI green, GLM clean.
- **PR #89** (`audit/audio-parallel`): `load()`/`addWavs()`
  decode concurrently under `Promise.all` (~25x faster for a
  full sound set); per-entry failures now log the file/record
  name (were silent); no context built for empty lists. Review
  verified `read()` stateless (fresh fetch/File bytes);
  batching declined (manifests ≤ ~25 sounds / ~2MB). CI green,
  GLM clean.
- **PR #90** (`audit/touch-a11y-basics`): viewport meta (touch
  tap math was mis-mapping on mobile); tank canvas `role=img`
  + label documenting feed-vs-tap and the F key; `#crt`
  overlay `aria-hidden`; overview "Waiting for the tank…"
  empty text at mount. CI green, GLM clean.

## Bugs / Reliability (open)

- `core/sim.ts`: `nearestFood()` can briefly target food that was just eaten if called with a slightly stale snapshot. Confirm removal order in `tick()`.
- `core/sim.ts`: `tap()` propagates panic but doesn't cap bubble spawn in foul water. Consider a max-bubble cap for performance.
- `web/crt.ts`: `hash()` uses `fract()` which may lose precision over very long sessions; wrap `uTime` more frequently or use a different noise source.
- `macos/Finsical.swift`: `loadMaskImage()` alpha-offset computation assumes `premultipliedFirst`; add a runtime check or fallback for other byte orders.
- `web/import.ts`: thumbnail fetch dedupe hole — IDB-miss path deletes from `thumbQueued` then pushes to `thumbQueue`, so a second `wantThumb` before fetch completion queues a duplicate (`pumpThumbs` never checks). Harmless today (`fetchAddon` memoized) but slow packs starve the 3-wide queue.
- `web/import.ts`: loose-mode (`prefix:`) listings don't dedupe colliding basenames the way the nested-zip branch does — two same-name rows bind `sheetBySpecies` last-wins. Copy the `used`-set logic over.
- Fetch path has no timeouts: a stalled archive.org request wedges that URL in `installsInFlight` while the panel's 15 s "Try Again" re-arms a no-op button. Add `AbortController` timeouts (~30 s) + clear in-flight on timeout.
- Sim time stops when the tab is hidden (rAF-driven), so stats uptime/hunger/day-night stall while client windows claim live readings. Advance catch-up ticks on visibilitychange, drive from a Worker, or grey stale numbers until fresh pushes land.
- Fractional sprite dest rects (`drawFish` rounds translate but not w/h) shimmer on HiDPI with smoothing off. Round w/h to whole pixels.
- Cosmetic drift: Swift `DragStrip` is 22 px, overlay `TOP_CLEAR` is 24 with a comment saying 22. Pick one number.
- `PLAN.md` overclaims the sim ("mood, growth stages" — only state + hunger exist). Implement (§ Features) or reword.

## Performance / Engineering (open)

- Hoist per-frame string allocs in `render()`: murk/dark `rgba()` templates rebuilt each frame, `globalAlpha` toggled per pellet.
- Sim is O(F·P) (`nearestFood` per fish per tick) + O(F²) panic fan-out — fine under caps, the stutter vector without them. Cap pellets (~60, evict oldest) and fish (~40, disable "Add Again" with a reason); overfeeding currently fouls the tank in ~1 s, which reads as broken.
- `AudioContext` is constructed during page load before any gesture (suspended-context warnings). Defer creation to `unlock()`.
- `saveTank` serializes the roster to localStorage every 10 s even when clean. Hash-and-skip.
- Drop path reads every file twice (head slice + full buffer, up to 32 MB). Reuse head bytes for sniffing.
- Four client windows each `hello`-poll every 2–10 s, each answered by a full state push. Push-on-change + slow heartbeat instead.
- Bounded thumbnail memory: confirm `thumbMemo` LRU stays within budget under all session lengths.
- Cache eviction metrics: temporary log counter for `swimCache`/`thumbMemo` evictions; verify near-zero in normal use.
- Audio overlap: `startAmbient()` may briefly overlap previous loops; verify no audible stutter during rapid load/restart.
- Optional GLM follow-up (declined as a stop-rule nit, still valid): extract `fitBackdrop`'s round+clamp into a pure tested helper next to `coverCrop`.

## Missing features (open)

- **Click-a-fish info card (highest value).** Per-species names + descriptions (`FsTH`) are decoded but never shown; clicks only scare. ⌥-click (or plain click) should open a Get-Info fish card: name, description, hunger/mood, species params.
- **Fish lifecycle stage 1.** No sickness (`SicH` unused), death, birth/eggs (`Egg*` unused), growth — hunger has no consequences so feeding is theater. Start with lethargy at hunger ≥ ~0.9 + recovery on feed, wired to the decoded birth/sick/dead `snd` events.
- **Water care actions.** Quality self-recovers; the user can only wait. Add "Clean tank / water change" + a visible dirty cue beyond the murk overlay (stats.ts already advises about it).
- **Lighting switch.** `sim.light` auto-runs a 13-min cycle with ~6.5 min pinned at flat night. Add day/night/auto + dimmer; `LigH` data already decoded.
- **More foods.** `FdHd` data decoded and ignored; flakes/pellets/live food with different sink rates is one `sink` field on `Food`.
- **Import search/filter.** JPN sections are long; add a name-substring filter box.
- **Starter reef bundle.** One-click curated set (6 fish + gravel + plant) + first-run card ("Your tank is empty. [Import Add-ons…] [Stock a starter reef]") — fixes asset-failure silence and cold-start discoverability together.
- **Overview actions.** Click row → spotlight fish in tank (ring highlight); rename (persist in save); state icons.
- **Stats history.** Sparklines for water/hunger from the existing 90 s `history` samples.
- **Snapshot.** One-call `toDataURL` PNG download in a PICT-styled frame — the share mechanic for a pretty toy.
- **Pause/sleep.** Freeze `tick()` (render continues) for screenshots/benchmarks.
- **No mute/volume.** Ambient loop has no UI off-switch; add Tank-menu Mute + persisted volume.
- **In-app help.** F/feed, surface-feed, tap-scare, C/CRT shortcuts exist nowhere in the app. One "About / Shortcuts" card (or Balloon Help, below).

## Visual / Aesthetic (open)

- **Scene life, ranked:** plant sway (sine x-shear by height on static decor) → light rays/godrays → surface shimmer line → caustic dapple on gravel (pre-rendered noise, slow scroll) → fish drop shadows → tap ripple ring at click point (scares currently have zero visual feedback) → tumbling food crumbs. One effect per PR. (Light-rays/night-blue and round-bubble variants exist in other-pass branches — check them before reimplementing.)
- **Moonlight, not black overlay.** Tint nights blue, keep sparkles visible; sleeping fish drift low and darken (matches Fish Sleep Mode below).
- **Gravel finish.** Feather the strip's top edge 1–2 px into the water; seat decor roots *in* it; consider subtle noise texture over flat `#8a6d3b`.
- **Procedural placeholder fish.** Offline users live with orange rectangles; a tiny two-colorway pixel fish keeps the crunch without shipping art. (Another pass has a pixel-placeholder branch — reconcile.)
- **Machine preview with tank.** Render the 320×200 gradient inside the prefs preview glass (`sx/sy/sw/sh` all exist) so cases aren't picked blind.
- **Calmer CRT defaults** (flicker/grain 0.30 read as noise on LCDs; try 0.15) + named presets ("Showroom", "Well-worn", "Flat panel").
- Food pellet eaten-animation (shrink/rotate before splash).
- Adaptive murk tint (toward backdrop's dominant color, not fixed brown).
- Night glow: faint bottom bioluminescence at very low light.
- Reflection layer: low-opacity mirrored canvas behind machine glass for depth.

## User Experience / Delight (open)

- Right-click (ctrl-click) contextual menu on the tank — Feed, Clean tank, Import Add-ons…, Snapshot, Mute — keeps chrome-free look, makes everything reachable. The `pointerdown` handler already reserves non-left buttons.
- Feed affordances: crumb cursor over the top 15%, crumb trail + plip on drop; touch long-press = scare split.
- Import flow: per-row progress spinners, 2–3-wide parallel installs, failure text naming the file.
- Touch users get one button; add feed ripple parity.
- Stale badges: grey client-window numbers until the first fresh push after wake.
- Fish Diary (`⌘⇧H`): age, pellets eaten, favorite depth band per fish.
- Captain's Log: SimpleText-styled auto-diary of tank events from stats history + sim events.
- Tank Age milestones: floating messages at 1 h / 1 day / 1 week uptime.
- Feeding reminder after ~10 foodless minutes.
- "About This Aquarium" easter-egg window (tank stats as system specs).
- Balloon Help mode reusing prefs caption copy across tank + overview.
- Screensaver / relaxation mode (slow drift, hidden cursor; also After Dark homage).
- Guppy breeding: color-mixing fry from decoded `EggI/EGPC/EGDP` — headline 0.4.0 material.
- Fish faces: 2-px hunger/mood mouth on sprites, Tamagotchi legibility.
- Machine-case easter eggs (TAM clock, Plus programmer's switch) with sounds.
- Dinner bell + feeding frenzy; overuse fouls faster.
- Tank weather: rain rings + dim + filter gurgle, cosmetic and cozy.
- Laser-pointer toy (hold L, fish chase the light). Useless, irresistible.
- Time-lapse contact sheet (1 fps toDataURL for 60 s).
- Vintage filter mode (sepia + reduced saturation + vignette).
- Bubble trails: faint fading trails as fish swim.
- Custom 16×16 sprite editor in palette colors, persisted to localStorage.

## Design Notes (preserved)

- `core/sim.ts`: Excellent isolation; pure logic, easy to test.
- `core/pose.ts`: Handles pose ring and turn animations correctly.
- `data/azpack` / `fsh`: Classic Mac resource fork parsing works well.
- `osmium-ui` provides authentic retro Mac UI.
- `core/data/decor.ts`: Smart guard (`pickDecorArt`) skips catalog thumbnails with textured corners.
- `machines.ts`: Clear viewBox / hole definitions; Swift mirror is precise.
- Tank state persistence (v1/v2 roster migration), sheet remap by pack URL, and thumb sweep on removal are carefully built — touch that code with tests running.
- Bus review discipline: validate cross-page messages (`remoteInstall` pattern); clients should share one `isState()` validator.

## Review-response log (this pass; recorded so nothing flip-flops)

- Applied: whole-texel rounding + clamp for fitted backdrops; TANK-dims invariant note; CRT single-init lifetime note; named audio-skip warnings; `#crt` aria-hidden; F key in tank label.
- Declined with reasons: CRT observer teardown (single module-scope `initCrt`, no dispose interface — nothing to tear down); audio decode batching (manifests ≤ ~25 sounds, drops capped 32 MB); concurrent-`read` hazard (both `read` impls stateless: fresh fetch / File bytes); keyboard parity for tap (feed already has F + menu; tap-key is new scope); pure-helper extraction for the 4-line rounding (tracked above as optional).
- Refuted with evidence: none needed; no reviewer claim was factually wrong.

## Implementation Order (suggested for future work)

1. Caps for food/fish + foul-rate sanity (sim test first, TDD).
2. Fish info card (data already decoded; biggest feature win).
3. First-run card + starter reef bundle.
4. Scene life, one effect per PR (check other-pass branches first).
5. Mute/volume + Tank menu wiring.
6. Import search + install progress/parallelism.
7. Fetch timeouts + thumb queue dedupe.
8. Lifecycle stage 1 + clean-tank action.
9. Lighting switch + moonlight.
10. Food pellet animation + gravel texture (quick visual wins).
11. Fish sleep mode + night glow (uses existing `sim.light`).
12. Screen relaxation mode, fish diary, vintage filter + adaptive murk.
13. Breeding, sprite editor, remaining delights as seasoning.

---

*Merged from two review passes (other-pass tmp.md already folded above; this-pass tmp.md §§1–8 folded with implemented items marked). No entries removed; overlapping ideas consolidated and cross-referenced.*
