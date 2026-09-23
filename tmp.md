# Finsical Project Analysis

Retro virtual aquarium (Mac OS 8 / AquaZone-inspired). Assets from archive.org. TypeScript + native macOS Swift (WKWebView).

## Bugs / Defects Found

### Critical / High
1. `core/sim.ts:148` — `addFish()` checks `!fish.tx && !fish.ty`. This fails incorrectly when a fish is intentionally placed at x=0 or y=0. Should use `Number.isFinite()` instead of truthy checks.
2. `core/sim.ts:399` — `maybeTurn()` compares `Math.cos(want) * f.facing < -1e-6` but uses a hardcoded epsilon; fine but could miss near-vertical turns.
3. `core/sim.ts:289-291` — The nearest-food search runs before `tickFish()` updates food state; if called with stale `fd.eaten`, could seek eaten food briefly, though removal is synchronous in `tick()`.
4. `web/main.ts:869-874` — `packFetch()` catches nothing; if `fetch()` throws, the `await` rejects without a fallback message.
5. `macos/Finsical.swift:141` — `loadMaskImage()` computes `alphaOff` assuming `premultipliedFirst` + little-endian = alpha first, which may not hold on all systems; but works for standard RGBA.
6. `web/main.ts:104` — Click handler ignores right-click but doesn't call `preventDefault()` for multi-button clicks; non-primary clicks fall through to drag or nothing.

### Medium / Low
7. `core/sim.ts:70` — `DEFAULT_FISH` creates exactly 4 fish regardless of user preference or saved state restarts; no way to start with 0 fish.
8. `core/sim.ts:242-245` — Bubbles never stop spawning in extremely foul water (max `2 - 1 = 1` multiplier); no cap.
9. `web/crt.ts:349` — `gl.uniform1f(uTime, (performance.now() / 1000) % 100)` wraps every 100s; fine for flicker, but `hash()` uses `fract()` which could lose precision over long sessions.
10. `web/store.ts:84` — `packGet()` updates meta stats asynchronously; if `rw()` fails silently, the stat entry may be missing but the pack still exists.
11. `web/import.ts:197` — `listCollection()` pushes items with `section: ""` initially, then overwrites with `col.section`; fine but redundant.
12. `web/addons.ts` and other pages don't set `lang` attribute consistently; all pages use `lang="en"` which is fine.

## Performance / Stuttering

13. `web/main.ts:1029-1043` — `drawFish()` creates a new `swimCanvas()` per fish per frame; `swimCache` is a WeakMap so it doesn't bound memory, but with many unique poses it can grow. Needs an LRU cap.
14. `web/main.ts:429-454` — `fishThumb()` creates `swimCanvas()` and `scaledThumb()` (new canvas per call); `thumbMemo` is unbounded. Over long sessions with many fish, memory grows without limit.
15. `web/main.ts:707-714` — `serveThumbs()` creates thumbnail data URLs that are never cleaned up if a fish is removed but its key lingers; `sweepThumbs()` helps but only runs on removal.
16. `core/sim.ts` — Simulation runs at fixed 30 tps with `acc += Math.min(now - last, 200)`. The 200ms cap prevents huge jumps after tab suspension, but large gaps could cause visual jumps.
17. `web/crt.ts:308-316` — `resize()` runs every `render()` and allocates a new buffer only when dimensions change; good. But the shader samples 5 horizontal taps per pixel (`sharp` + 4 neighbors + glow + halo) — heavy on mobile/WebGL.
18. `web/audio.ts` — `startAmbient()` creates a new `AudioBufferSourceNode` each time but doesn't stop the previous one correctly in some race conditions; `ambientGen` helps but the loop can overlap briefly.

## Missing Features

19. No fish naming / personalization. Fish are anonymous `id` numbers.
20. No historical tracking of fish (birth time, age, death log). The `tickCount` exists but isn't mapped to individual fish.
21. No feeding schedule / reminder. The user must manually press F or click the surface.
22. No interactive decorations — plants don't move or respond to fish; fish pass through them.
23. No weather / seasonal changes (rain, storms, snow above tank).
24. No photo/screenshot mode.
25. No sound customization (only bundled audio + imported sounds).
26. No screensaver mode (auto-hide UI, full-screen, slow movement).
27. No multi-tank support (only one tank per instance).
28. No export/import of individual fish (only full tank save).
29. No accessibility labels for the tank canvas; screen readers see nothing useful.
30. No tooltip/help for the machine selection or slider controls in Preferences.

## Visual Issues & Layout Problems

31. Placeholder fish (`drawPlaceholder`) is a very simple geometric shape (body + tail + dorsal + eye). Could be more charming — a retro pixel-art fish.
32. Bubbles are 2×2 white squares (`#cfe8ff`). They look like snowflakes, not bubbles. Should be circles with opacity gradient, slightly larger, perhaps with a tiny shine highlight.
33. Food pellets (`#c9a227`) are 3×3 yellow squares. When eaten, they vanish instantly; could shrink/rotate as they're consumed.
34. The gravel strip (`#8a6d3b`) is a flat rectangle with no texture; a subtle gradient or noise pattern would improve depth.
35. The tank gradient (`#2e7fc4` → `#14508c`) is linear vertical. A radial or slightly curved gradient would look more like real water.
36. The CRT effect (`crt.ts`) uses `mod(floor(gl_FragCoord.x), 3.0)` for RGB stripes. On high-DPI displays this creates very fine stripes that may alias. The shader could use `smoothstep` for smoother color transitions.
37. The `machine` SVG (`#machine`) covers the entire window with `pointer-events: none`. Clicks fall through correctly, but hover effects or accessibility focus is impossible on the machine art.
38. The `#screenback` div is hidden by default (`display: none`) unless `machine.hole` exists; for `bare` machine it stays hidden, which is correct, but for some machines it may not cover the full aperture, leaving black gaps.
39. The `tankGradient` is created once; fine. But the `murk` overlay (`rgba(96,80,36,...)`) uses a fixed brownish color regardless of the backdrop; a more adaptive murk (tinted toward the backdrop's dominant color) would be more realistic.
40. `drawFish()` uses `ctx.rotate(pitch(f))` which rotates around the fish center; the rotation doesn't account for the fish's body shape, so the tail can look detached at steep angles. The original handles this via the pose ring; our simplified approach is acceptable but could be smoother.
41. The decorations (`addDecor`) are drawn at `Math.round()` positions but don't animate or sway; they look static. A very subtle vertical bob (0.5 px over 30 ticks) would make them feel alive.
42. The `tankGradient` doesn't shift or shimmer; a very slow horizontal ripple (1 px per second, looping) would enhance the water feel.
43. The night overlay (`rgba(4,8,24, dark * 0.55)`) is a flat dark layer. A subtle blue shift (darker blue rather than black) would feel more natural for underwater night.

## UX / Interface Issues

44. The `opentrigger` button (`#opentrigger`) appears only on touch devices (`hover: none`). There's no keyboard-only way to open the import panel besides ⌘I (native menu) or F for feed. A small icon button for mouse users could help.
45. The Preferences pane buttons (`#pfstrip`) are vertical but don't have keyboard navigation hints (arrow keys work but aren't labeled).
46. The CRT toggle shortcut (C) conflicts with browser's native find (`⌘F` is protected, but bare `C` could be misinterpreted by users expecting Copy).
47. The `Tank Stats` window opens via `S` but requires `!e.metaKey` check; the native menu uses `⇧⌘S` which avoids the conflict.
48. No visual feedback when clicking high in the tank to feed (just sound). A brief splash animation or bubble burst would confirm the action.
49. The drag strip (`DragStrip`) is 22px high but invisible (clear). Users may not know the top edge is the drag handle; a very subtle gradient or line would help.
50. The native app (`Finsical.swift`) hides all standard window buttons (close/minimize/zoom). The user can only close via `⌘W` or Quit; no minimize button. Fine for a floating toy, but some users may miss the minimize option.
51. The `tankGradient` is hardcoded; users can't choose a different base water color.
52. The `machine` images load from `assets/` folder; if a user selects a machine but the image file is missing or corrupt, the `machineEl.innerHTML` renders nothing, leaving a blank screen. `loadMaskImage()` logs to console but the user sees nothing.
53. The `tankGradient` doesn't account for the backdrop image; if a dark backdrop is loaded, the gradient underneath is hidden, but the murk overlay still uses the same fixed brown, which may clash.
54. `core/sim.ts` uses `SURFACE = 10` (top margin) and `BOTTOM_PAD = 12`. The food drops at `y = SURFACE + 2` = 12. The fish's `bandY` starts at `SURFACE + MARGIN` (26) to `maxY` (188). This means food drops slightly below the surface but fish don't go above `SURFACE + MARGIN` (26), so food can fall into unreachable space briefly before sinking. Fine but could be tighter.
55. The `tankGradient` uses `#2e7fc4` (light blue) → `#14508c` (dark blue). For a retro Mac aquarium, a slightly greener or more cyan tone (`#2e8a9e` → `#0f3a52`) might evoke vintage CRT monitors better.

## Novel / Cool / Delightful Ideas

56. **Fish Names & Profiles**: Each fish gets a random retro-style name ("Bubbles", "Finley", "Guppy"). The Tank Overview could show the name alongside the species. If a fish dies (future feature), it could leave a brief memorial bubble.
57. **Food Animation**: When food hits the water, create a tiny splash (3-4 white pixels that expand and fade). When a fish eats it, show a brief "nibble" animation (small circle that shrinks).
58. **Ambient Light Rays**: Subtle diagonal light beams that slowly drift across the tank, more visible at night. Could be drawn with very low opacity (`rgba(255,255,255,0.02)`) moving at 0.5 px/s.
59. **Interactive Machine Case**: Clicking on certain machine parts (e.g., the iMac's power button, the Performa's CD tray) could trigger tiny sound effects or change a minor state (like a blinking LED).
60. **Seasonal Backgrounds**: The `backdropCv` could slowly rotate through seasonal variants if multiple background packs are installed (e.g., summer plants, winter snow on the glass edge).
61. **Fish Diary / Timeline**: A hidden feature — pressing a secret key combo (`⌘⇧H`?) shows a small floating text bubble with fun facts: "Fish #3 turned 3 days old today. It has eaten 47 pellets."
62. **Screensaver / Relaxation Mode**: A full-screen mode with slower movement (`sim.tick()` at half speed), no UI, just the tank and gentle ambient sound loop. Activated by double-clicking the tank or a menu item.
63. **Bubble Trails**: Fish could leave a faint trail of tiny bubbles behind them as they swim, fading over 2-3 seconds. Adds movement history.
64. **Decor Interactions**: Fish could briefly hide behind plants or swim through coral decorations. The decorations could gently sway in a simulated current.
65. **Retro Sound Design**: Adding subtle clicks for UI buttons (like the classic Mac OS 8 "click" sound from the resource fork). The `audio` module could load a `system` sound set for UI interactions.
66. **Night Mode Glow**: At night, add a very faint blue-green glow (`#1a3a4a` at 5% opacity) from the bottom of the tank, simulating underwater bioluminescence.
67. **Fish Personality**: Small variations in behavior — some fish prefer deeper bands, some are faster, some are more social (follow other fish closely). Could be derived from the `bandY`, `cruise`, and `species` fields.
68. **Tank Age Milestones**: After 1 hour, 1 day, 1 week of uptime, a small celebratory message could appear briefly ("Your tank has been running for 1 week!").
69. **Custom Fish Sprites**: A simple in-app sprite editor that lets users create a 16×16 pixel fish from a palette and assign it to a fish slot. Stored in `localStorage`.
70. **Multi-layer Water**: The `tankGradient` could be layered with a second, slightly offset gradient to simulate depth — darker at the bottom, lighter at the top, with a subtle mid-depth shimmer.
71. **Reflection Effects**: The machine's glass could reflect the fish or bubbles very faintly, adding depth. Could be a second, lower-opacity `canvas` that mirrors the tank content vertically with blur.
72. **Fish Sleep Mode**: At night (`sim.light < 0.5`), fish could slow down, stay closer to the bottom, and face downward slightly more often.
73. **Food Preferences**: Different food types (if user drops different files) could attract different fish or affect hunger differently.
74. **Weather Effects**: Very subtle rain drops (small white vertical lines that fall briefly across the tank) that only appear occasionally and don't affect the fish.
75. **Vintage Filter Modes**: In Preferences, a "Vintage" checkbox that applies a sepia tint, reduces saturation, and adds a subtle vignette to the tank — mimicking old photographs of aquariums.

## Code Quality / Design Notes

76. The `sim` module is well-isolated and uses pure logic; excellent.
77. The `pose` module correctly handles the pose ring and turn animations.
78. The `data/azpack` and `fsh` modules handle classic Mac resource forks well.
79. The `osmium-ui` integration provides authentic retro Mac UI.
80. The `core/data/decor.ts` (`pickDecorArt`) skips textured-corner frames; this prevents catalog thumbnails from being used as decorations, which is a smart guard.
81. The `web/machines.ts` defines machines clearly with viewBox units and hole measurements; the Swift `loadMaskImage()` mirrors this precisely.
82. The `core/rng.ts` uses a simple LCG-style generator; fine for this use case.
83. The `core/pose.ts` handles `mir: -1` for turns correctly; the `swimCanvas()` mirrors the group correctly.
84. The `core/data/fsh.ts` handles `.fsh` file parsing with 5-byte codec support (`fix/fsh-5byte-codec` branch exists); good backward compatibility.
85. The `tools/` folder has extensive Python tooling for extracting archive assets; well-structured.

## Recommended Priority Order for Implementation

A. Fix critical bugs (coordinate checks, drag behavior, memory leaks) — high impact, low risk.
B. Visual improvements to bubbles, food, placeholder fish — user-visible, delightful.
C. Named fish / personal details — user engagement.
D. Memory/performance fixes (cache bounds, weak map limits) — stability.
E. Novel aesthetic features (light rays, food splash, interactive machine) — delight factor.
F. Retro sound design and vintage filters — immersion.

## Branch Planning (for implementation phase)

- `fix/bugs-coords-memory`: Fix `addFish` truthy checks, drag behavior, unbounded caches.
- `feature/named-fish`: Add random retro names to fish, display in overview.
- `feature/food-animation-bubbles`: Enhanced bubbles (circular, transparent) + food splash animation.
- `feature/placeholder-fish`: More charming placeholder sprite.
- `feature/light-rays-night`: Subtle drifting light beams + enhanced night gradient.
- `feature/interactive-machine`: Click sounds for machine parts.
- `feature/fish-personality`: Small behavior variations derived from existing data.
