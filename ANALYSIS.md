# Finsical Analysis — Shovel-Ready Improvements

This document consolidates findings from the initial review and tracks what's been implemented vs. what's ready for future work.

## Completed (implemented in branches)

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

## Shovel-Ready Ideas (high quality, ready to pick up)

### Bugs / Reliability
- `core/sim.ts`: `nearestFood()` can briefly target food that was just eaten if called with a slightly stale snapshot. Confirm removal order in `tick()`.
- `core/sim.ts`: `tap()` propagates panic but doesn't cap bubble spawn in foul water. Consider a max-bubble cap for performance.
- `web/crt.ts`: `hash()` uses `fract()` which may lose precision over very long sessions; wrap `uTime` more frequently or use a different noise source.
- `macos/Finsical.swift`: `loadMaskImage()` alpha-offset computation assumes `premultipliedFirst`; add a runtime check or fallback for other byte orders.

### Visual / Aesthetic
- **Food pellet animation:** Add a brief shrink/rotate animation when eaten (before splash); could be a 3-frame scale down.
- **Gravel texture:** Replace flat `#8a6d3b` rectangle with a subtle noise gradient or pixel texture.
- **Night glow:** At very low light, add a faint bottom glow (`#1a3a4a` at ~3%) simulating underwater bioluminescence.
- **Decor swaying:** Add a very subtle vertical bob (0.2–0.5 px over ~60 ticks) to decorations for life.
- **Adaptive murk:** Make the murk overlay tint toward the backdrop's dominant color instead of fixed brown.
- **Reflection layer:** A second, lower-opacity `canvas` mirroring the tank vertically (with blur) behind the machine glass for depth.

### User Experience / Delight
- **Fish Diary / Timeline:** Hidden feature (e.g., `⌘⇧H`) showing fun facts: age, pellets eaten, favorite depth band.
- **Tank Age Milestones:** Small floating messages at 1 hour, 1 day, 1 week of uptime.
- **Screensaver / Relaxation Mode:** Full-screen, slower tick rate (`0.5` multiplier), no UI, just tank + ambient sound.
- **Feeding reminder:** A gentle reminder if no food has been dropped in ~10 minutes of real time.
- **Vintage Filter Mode:** Preferences checkbox for sepia tint, reduced saturation, subtle vignette.
- **Interactive Machine Details:** Click sounds for specific machine parts (iMac power LED blink, tray open); could change a minor decorative state.
- **Bubble Trails:** Fish leave a faint fading trail of tiny bubbles as they swim.
- **Fish Sleep Mode:** At night (`sim.light < 0.5`), fish slow down, stay lower, face slightly downward.
- **Custom Fish Sprites:** In-app 16×16 pixel editor using palette colors, saved to `localStorage`.

### Performance / Engineering
- **Bounded thumbnail memory:** Confirm `thumbMemo` LRU stays within budget under all session lengths.
- **Cache eviction metrics:** Add a temporary log counter for `swimCache` and `thumbMemo` evictions; verify near-zero during normal use.
- **WebGL shader optimization:** The CRT shader does 5 horizontal taps + glow + halo per pixel. Consider reducing tap count for mobile WebGL contexts.
- **Audio overlap:** `startAmbient()` may briefly overlap with previous loops; verify no audible stutter during rapid load/restart.

## Design Notes (preserved from review)

- `core/sim.ts`: Excellent isolation; pure logic, easy to test.
- `core/pose.ts`: Handles pose ring and turn animations correctly.
- `data/azpack` / `fsh`: Classic Mac resource fork parsing works well.
- `osmium-ui` provides authentic retro Mac UI.
- `core/data/decor.ts`: Smart guard (`pickDecorArt`) skips catalog thumbnails with textured corners.
- `machines.ts`: Clear viewBox / hole definitions; Swift mirror is precise.

## Implementation Order (suggested for future work)

1. Food pellet animation + gravel texture (quick wins, visual impact)
2. Fish sleep mode + night glow (uses existing `sim.light`, low risk)
3. Screen relaxation mode (uses `sim.tick()` rate control, simple)
4. Fish diary (hidden feature, pure UI layer)
5. Vintage filter + adaptive murk (shader / overlay changes)
6. Custom sprite editor (new module, higher complexity)

---

*Document produced from initial review (tmp.md). Completed branches removed; remaining items are shovel-ready for future LLM or human work.*
