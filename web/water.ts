/**
 * Living water: bubbles, food pellets, the surface and the hood above
 * it, refraction, caustics, sun shafts and murk. Everything here is render-only. Looks derive from sim data
 * (positions, tickCount, light, water quality) rather than per-frame
 * randomness, so drawing the same sim state twice gives the same frame.
 * Sprites, tiles and gradients are built once on first use; the per-frame
 * draw calls allocate nothing beyond a few path points.
 */
import { DEMO_NIGHT_LIGHT } from "../core/light.js";
import { BOTTOM_PAD, BUBBLE_RISE, FOOD_ROT_TICKS, SURFACE }
  from "../core/sim.js";
import { SURFACE_MAX } from "./surface.js";
import type { Bubble, Food } from "../core/sim.js";

const W = 320;
const H = 200;

/** Whether ambient light animates. 'still' honours prefers-reduced-motion:
 * caustics, shafts, the surface swell and glint and the refraction
 * shimmer freeze in place. */
export type WaterMotion = "animated" | "still";

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Hermite ease of x from e0 to e1; e0 > e1 gives a falling ramp. */
export function smoothstep(e0: number, e1: number, x: number): number {
  const t = clamp01((x - e0) / (e1 - e0));
  return t * t * (3 - 2 * t);
}

/** Stable pseudo-random value in [0, 1) for an integer key. */
function hash01(i: number): number {
  const s = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Sunlight strength for light effects: 0 at night, 1 at noon.
 * `floor` is the light the current night bottoms out at (the demo's
 * 0.3, a light timer's brighter 0.45): moonlit water shouldn't sparkle. */
export function sunFactor(light: number, floor = DEMO_NIGHT_LIGHT): number {
  return clamp01((light - floor) / (1 - floor));
}

// ---- bubbles ---------------------------------------------------------------


/**
 * Bubble diameter in pixels by depth: gas expands as the pressure drops,
 * so bubbles grow from 1 px near the gravel to 4 px just under the
 * surface.
 */
export function bubbleSize(y: number): 1 | 2 | 3 | 4 {
  if (y > 140) return 1;
  if (y > 80) return 2;
  if (y > 36) return 3;
  return 4;
}

/**
 * Side-to-side wobble in pixels. Phase comes from the bubble's height and
 * its (fixed) spawn x, so neighbouring bubbles sway out of step and the
 * swing widens a little as they grow.
 */
export function bubbleOffset(x: number, y: number): number {
  return Math.sin((y + x * 7) * 0.2) * (0.6 + bubbleSize(y) * 0.2);
}

/** True on a bubble's final tick before the sim removes it. */
export function bubblePops(y: number): boolean {
  return y - BUBBLE_RISE <= SURFACE;
}

// Pixel maps: O dark outline (reads on light backdrops), L light body
// (reads on dark ones), W highlight, f faint fill, '.' clear.
const BUBBLE_ART: readonly (readonly string[])[] = [
  ["L"],
  ["WL",
   "LO"],
  [".O.",
   "OWO",
   ".O."],
  [".OO.",
   "OWLO",
   "OLfO",
   ".OO."],
];
const POP_ART = [
  "L...L",
  ".....",
  ".....",
  ".....",
  "L...L",
];
const POP_ART_INNER = [
  ".L.L.",
  "L...L",
  ".....",
  "L...L",
  ".L.L.",
];
const PALETTE: Record<string, readonly [number, number, number, number]> = {
  O: [42, 74, 112, 200],
  L: [207, 232, 255, 255],
  W: [255, 255, 255, 255],
  f: [207, 232, 255, 110],
};

function spriteOf(art: readonly string[]): HTMLCanvasElement {
  const h = art.length, w = art[0]!.length;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d")!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = PALETTE[art[y]![x]!];
      if (!c) continue;
      img.data.set(c, (y * w + x) * 4);
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

let bubbleSprites: HTMLCanvasElement[] | null = null;
let popSprites: HTMLCanvasElement[] | null = null;
function popPair(): HTMLCanvasElement[] {
  return [spriteOf(POP_ART_INNER), spriteOf(POP_ART)];
}

/** One pop ring drawn at a point — for a tap-pop mid-water, where the
 * surface's drawn-line path can't show it. */
export function drawBubblePop(ctx: CanvasRenderingContext2D,
                              x: number, y: number): void {
  popSprites ??= popPair();
  const p = popSprites[Math.round(x) & 1]!; // same alternation as surface pops
  ctx.drawImage(p, Math.round(x) - 2, Math.round(y) - 2);
}

/** Index of the bubble whose drawn body (plus a finger's worth of
 * slop) is nearest to (px, py), or -1 if the point misses them all.
 * Lives here so the hit test can't drift from the drawn footprint. */
export function tapBubble(bubbles: readonly Bubble[], px: number,
                          py: number): number {
  let bi = -1, bd = Infinity;
  for (let i = 0; i < bubbles.length; i++) {
    const b = bubbles[i]!;
    const r = bubbleSize(b.y) / 2 + 4;
    const d = (b.x + bubbleOffset(b.x, b.y) - px) ** 2 + (b.y - py) ** 2;
    if (d < r * r && d < bd) { bd = d; bi = i; }
  }
  return bi;
}

/** `line` is the drawn waterline (see surfaceLine): a bubble pops
 * where the moving surface is, not at its resting row. */
export function drawBubbles(ctx: CanvasRenderingContext2D,
                            bubbles: readonly Bubble[],
                            line?: Int16Array): void {
  bubbleSprites ??= BUBBLE_ART.map(spriteOf);
  popSprites ??= popPair();
  for (const b of bubbles) {
    const x = Math.round(b.x + bubbleOffset(b.x, b.y));
    if (bubblePops(b.y)) {
      // Alternate the two ring sizes on the x parity so simultaneous
      // pops don't look stamped.
      const p = popSprites[Math.round(b.x) & 1]!;
      const col = Math.min(W - 1, Math.max(0, x));
      ctx.drawImage(p, x - 2, (line?.[col] ?? SURFACE) - 2);
      continue;
    }
    const s = bubbleSprites[bubbleSize(b.y) - 1]!;
    ctx.drawImage(s, x - (s.width >> 1), Math.round(b.y) - (s.height >> 1));
  }
}

// ---- food ------------------------------------------------------------------

/** Most pellets one feed drops. */
export const PINCH_MAX = 5;
/** Horizontal scatter of a pinch around its center, px. */
export const PINCH_SPREAD = 24;
/** Most centers one pinch may split across. */
export const PINCH_CENTERS_MAX = 3;
/** How far a multi-center pinch's centers may sit from the drop x, px.
 * A one-center pinch keeps it — a lone pellet still lands where fed. */
export const PINCH_CENTER_SPREAD = 48;
/** Delay between pellets of one pinch, ms: they rain in, not as a row. */
const PINCH_STAGGER_MS = 110;

export interface PinchPellet {
  /** Offset from the drop x, px. */
  dx: number;
  /** Milliseconds after the feed that this pellet enters the water. */
  delay: number;
}

/** A pinch of food scattered around the drop point: one pellet per
 * hungry fish, at least one and at most PINCH_MAX. A fixed 3-5 pellets
 * a feed gave a sated tank enough rotting waste to foul it within
 * minutes. */
export function feedPinch(rand: () => number,
                          hungry: number): PinchPellet[] {
  const n = Math.min(PINCH_MAX, Math.max(1, Math.floor(hungry)));
  const centers = Math.min(PINCH_CENTERS_MAX, Math.ceil(n / 2));
  const at: number[] = centers === 1 ? [0] : [];
  for (let c = at.length; c < centers; c++)
    at.push(Math.round((rand() * 2 - 1) * PINCH_CENTER_SPREAD));
  const out: PinchPellet[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      dx: at[i % centers]!
        + Math.round((rand() * 2 - 1) * PINCH_SPREAD),
      delay: i === 0
        ? 0 : Math.round(i * PINCH_STAGGER_MS * (0.6 + rand() * 0.8)),
    });
  }
  return out;
}

/** Render-only sway of a sinking pellet, px. Phase is keyed on the
 * pellet's fixed x so a pinch doesn't sway in unison; only y changes
 * over time, so a settled pellet holds still. */
export function pelletDrift(x: number, y: number): number {
  return Math.sin(y * 0.12 + x * 1.7) * 1.3;
}

export type PelletShape = "nugget" | "flakeFlat" | "flakeEdge";

/** A quarter of pellets are flakes that tumble between flat and edge-on
 * while sinking and lie flat on the gravel. */
export function pelletShape(x: number, y: number, settled: boolean):
    PelletShape {
  if (Math.floor(x * 7.3) % 4 !== 0) return "nugget";
  if (settled) return "flakeFlat";
  return Math.floor(y / 9) % 2 ? "flakeEdge" : "flakeFlat";
}

const PELLET = "#c9a227";
const PELLET_SHADE = "#8a6a14";
// The rare golden pellet reads brighter than the everyday flake.
const PELLET_GOLD = "#ffe066";
const PELLET_GOLD_SHADE = "#e0a800";

export function drawFood(ctx: CanvasRenderingContext2D,
                         food: readonly Food[]): void {
  for (const fd of food) {
    // Rotting pellets dissolve: they fade to about a third over their
    // rot lifetime, staying visible (and findable) until removed.
    ctx.globalAlpha = 1 - 0.65 * Math.min(1, fd.settled / FOOD_ROT_TICKS);
    const x = Math.round(fd.x + pelletDrift(fd.x, fd.y));
    const y = Math.round(fd.y);
    const shape = pelletShape(fd.x, fd.y, fd.settled > 0);
    const shade = fd.golden ? PELLET_GOLD_SHADE : PELLET_SHADE;
    ctx.fillStyle = fd.golden ? PELLET_GOLD : PELLET;
    if (shape === "nugget") {
      ctx.fillRect(x - 1, y - 1, 2, 2);
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, 1, 1);
    } else if (shape === "flakeFlat") {
      ctx.fillRect(x - 1, y, 1, 1);
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, 1, 1);
    } else {
      ctx.fillRect(x, y - 1, 1, 2);
    }
  }
  ctx.globalAlpha = 1;
}

// ---- caustics, shafts ------------------------------------------------------

export const CAUSTIC_TILE_W = 64;
export const CAUSTIC_TILE_H = 32;
/** Caustics cover the lower tank, fading in from here down. */
const CAUSTIC_TOP = 88;
const CAUSTIC_ALPHA = 0.14;
/** Caustic rows shimmer sideways in bands this tall, px. */
const CAUSTIC_BAND = 4;
const SHAFT_ALPHA = 0.04;

/**
 * Sum of three sines with integer wave numbers across the tile, so the
 * field repeats every CAUSTIC_TILE_W x CAUSTIC_TILE_H pixels. `layer`
 * picks one of two wave sets for the counter-scrolling layers.
 */
export function causticValue(x: number, y: number, layer: 0 | 1): number {
  const u = (x / CAUSTIC_TILE_W) * Math.PI * 2;
  const v = (y / CAUSTIC_TILE_H) * Math.PI * 2;
  return layer === 0
    ? Math.sin(u + v) + Math.sin(2 * u - v + 1.3) + Math.sin(2 * v - u + 2.1)
    : Math.sin(2 * u + v + 0.7) + Math.sin(u - 2 * v + 2.4) +
      Math.sin(3 * u + v + 4.0);
}

/** Lit pixels of one caustic tile (1 = lit), row-major. Caustics are the
 * bright web where the summed waves cross zero, hence the |value| test. */
export function causticTile(layer: 0 | 1): Uint8Array {
  const out = new Uint8Array(CAUSTIC_TILE_W * CAUSTIC_TILE_H);
  for (let y = 0; y < CAUSTIC_TILE_H; y++) {
    for (let x = 0; x < CAUSTIC_TILE_W; x++) {
      out[y * CAUSTIC_TILE_W + x] =
        Math.abs(causticValue(x, y, layer)) < 0.25 ? 1 : 0;
    }
  }
  return out;
}

/** One layer baked as a strip a tile wider than the tank, with the fade
 * toward the gravel built into its alpha, so a frame draws each layer
 * with a single drawImage at a scrolled source x. */
function causticStrip(layer: 0 | 1): HTMLCanvasElement {
  const tile = causticTile(layer);
  const w = W + CAUSTIC_TILE_W, h = H - CAUSTIC_TOP;
  const cv = document.createElement("canvas");
  cv.width = w; cv.height = h;
  const g = cv.getContext("2d")!;
  const img = g.createImageData(w, h);
  for (let y = 0; y < h; y++) {
    const fade = smoothstep(0, h * 0.8, y);
    for (let x = 0; x < w; x++) {
      if (!tile[(y % CAUSTIC_TILE_H) * CAUSTIC_TILE_W + x % CAUSTIC_TILE_W])
        continue;
      const o = (y * w + x) * 4;
      img.data[o] = 210; img.data[o + 1] = 240; img.data[o + 2] = 255;
      img.data[o + 3] = Math.round(255 * fade);
    }
  }
  g.putImageData(img, 0, 0);
  return cv;
}

let strips: HTMLCanvasElement[] | null = null;
let shaftFill: CanvasGradient | null = null;

/** Shafts: top x, top width, sway phase. */
const SHAFTS: readonly (readonly [number, number, number])[] =
  [[58, 16, 0], [150, 24, 2.1], [236, 12, 4.2]];
/** One sway cycle of the shafts, ticks (a minute at 30 tps). */
const SHAFT_SWAY_TICKS = 1800;

/** Sideways shimmer of one caustic band, px: the surface waves bend
 * the light, so the web wavers instead of sliding rigidly. */
export function causticShimmer(band: number, t: number): number {
  return Math.round(Math.sin(band * 0.7 + t * 0.06) * 1.5 +
                    Math.sin(band * 1.9 - t * 0.041) * 0.8);
}

/**
 * Sunlight in the water: gentle slanted shafts and caustics over the
 * lower tank. Drawn behind the fish, and scaled by daylight so nights
 * stay dark. The waterline is drawSurface's, drawn every frame, nights
 * included.
 */
export function drawLight(ctx: CanvasRenderingContext2D, light: number,
                          tick: number, motion: WaterMotion,
                          nightFloor = DEMO_NIGHT_LIGHT): void {
  const sun = sunFactor(light, nightFloor);
  const t = motion === "animated" ? tick : 0;
  if (sun <= 0.01) return;
  ctx.globalCompositeOperation = "lighter";

  if (!shaftFill) {
    shaftFill = ctx.createLinearGradient(0, SURFACE, 0, H - BOTTOM_PAD);
    shaftFill.addColorStop(0, "rgba(230,245,255,1)");
    shaftFill.addColorStop(1, "rgba(230,245,255,0)");
  }
  ctx.fillStyle = shaftFill;
  ctx.globalAlpha = SHAFT_ALPHA * sun;
  const sway = (t / SHAFT_SWAY_TICKS) * Math.PI * 2;
  for (const [sx, sw, ph] of SHAFTS) {
    const x0 = sx + Math.sin(sway + ph) * 6;
    ctx.beginPath();
    ctx.moveTo(x0, SURFACE);
    ctx.lineTo(x0 + sw, SURFACE);
    ctx.lineTo(x0 + sw * 1.8 + 46, H - BOTTOM_PAD);
    ctx.lineTo(x0 + 46, H - BOTTOM_PAD);
    ctx.fill();
  }

  strips ??= [causticStrip(0), causticStrip(1)];
  ctx.globalAlpha = CAUSTIC_ALPHA * sun;
  const h = H - CAUSTIC_TOP;
  const a = Math.floor(t * 0.3) % CAUSTIC_TILE_W;
  const b = CAUSTIC_TILE_W - 1 - Math.floor(t * 0.2) % CAUSTIC_TILE_W;
  const tw = CAUSTIC_TILE_W;
  for (let y = 0, band = 0; y < h; y += CAUSTIC_BAND, band++) {
    const bh = Math.min(CAUSTIC_BAND, h - y);
    // The strips repeat every tile, so wrapping the source x keeps a
    // shimmered read inside the strip.
    const sa = ((a + causticShimmer(band, t)) % tw + tw) % tw;
    const sb = ((b - causticShimmer(band + 11, t)) % tw + tw) % tw;
    ctx.drawImage(strips[0]!, sa, y, W, bh, 0, CAUSTIC_TOP + y, W, bh);
    ctx.drawImage(strips[1]!, sb, y, W, bh, 0, CAUSTIC_TOP + y, W, bh);
  }

  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

// ---- refraction ------------------------------------------------------------

/** Rows under the waterline that waver, fading out with depth. */
export const REFRACT_ROWS = 18;

/** Sideways shift of the scene at row `y` under the surface, px: the
 * moving surface bends the view just beneath it, strongest at the top
 * and gone by REFRACT_ROWS down. */
export function refractShift(y: number, t: number): number {
  const depth = y - SURFACE;
  if (depth < 1 || depth > REFRACT_ROWS) return 0;
  const fade = 1 - (depth - 1) / REFRACT_ROWS;
  return Math.round((Math.sin(y * 0.8 + t * 0.09) * 1.1 +
                     Math.sin(y * 0.37 - t * 0.057) * 0.6) * fade);
}

let refractScratch: HTMLCanvasElement | null = null;

/** Waver the band just under the surface: fish, plants and backdrop
 * seen through the top of the water shift a pixel or two row by row.
 * Reads back what is already drawn, so call it after the fish and
 * before the air. */
export function drawRefraction(ctx: CanvasRenderingContext2D,
                               t: number): void {
  const top = SURFACE - SURFACE_MAX;
  const rows = SURFACE_MAX + REFRACT_ROWS + 1;
  if (!refractScratch) {
    refractScratch = document.createElement("canvas");
    refractScratch.width = W;
    refractScratch.height = rows;
  }
  const g = refractScratch.getContext("2d")!;
  g.clearRect(0, 0, W, rows);
  g.drawImage(ctx.canvas, 0, top, W, rows, 0, 0, W, rows);
  for (let r = 0; r < rows; r++) {
    // A crest lifts water above SURFACE; waver those rows as the top.
    const dx = refractShift(Math.max(top + r, SURFACE + 1), t);
    if (dx === 0) continue;
    ctx.drawImage(refractScratch, 0, r, W, 1, dx, top + r, W, 1);
    // Clamp-fill the sliver the shift leaves bare so no unshifted
    // pixels survive at the tank's edges.
    if (dx > 0)
      ctx.drawImage(refractScratch, 0, r, 1, 1, 0, top + r, dx, 1);
    else
      ctx.drawImage(refractScratch, W - 1, r, 1, 1,
                    W + dx, top + r, -dx, 1);
  }
}

// ---- air -------------------------------------------------------------------

/** How much of the scene behind still shows through the air, at the
 * hood's lip and at the waterline, with the lamp off and on. */
const AIR_SHADE = { lipOff: 0.1, lipOn: 0.22, lowOff: 0.3, lowOn: 0.58 };
/** Rows of the tank's top frame. They stay above SURFACE - SURFACE_MAX,
 * the highest a wave reaches. */
const RIM_ROWS = 2;

function grey(v: number): string {
  const c = Math.round(255 * v);
  return `rgb(${c},${c},${c})`;
}

/** Per-column fill of the air: the rows above each column's
 * waterline. Runs of equal height share one rect. */
function fillAboveLine(ctx: CanvasRenderingContext2D,
                       line: Int16Array | undefined): void {
  if (!line) { ctx.fillRect(0, 0, W, SURFACE); return; }
  let x0 = 0;
  for (let x = 1; x <= W; x++) {
    if (x < W && line[x] === line[x0]) continue;
    ctx.fillRect(x0, 0, x - x0, line[x0]!);
    x0 = x;
  }
}

let airShade: CanvasGradient | null = null;
// Keyed on the context too — a gradient belongs to the context that
// created it, so a second canvas (or another test's mock) must build
// its own rather than reuse a foreign one.
let airShadeCtx: CanvasRenderingContext2D | null = null;
let airShadeLip = "", airShadeLow = "";

/**
 * The air above the waterline. The back of the tank carries on behind
 * it, as in a real tank, but dry: drained of color and dimmed, darkest
 * under the hood's lip and brightest where the lamp (`lamp`, 0 = off,
 * 1 = full) reaches down to the water. Fins poking above the surface
 * dim with it. The tank's top frame runs along the very top. `line` is
 * the drawn waterline (see surfaceLine); without it the air ends at the
 * resting surface. Drawn after the fish; bubble pops and splash drops
 * go on top of it.
 */
export function drawAir(ctx: CanvasRenderingContext2D, lamp = 0,
                        line?: Int16Array): void {
  const mix = (off: number, on: number): number => off + (on - off) * lamp;
  // The shade follows the lamp, which dims at dusk — but grey() rounds
  // each stop to a whole grey, so most frames of a day produce stops
  // that already have a gradient. Keyed on that pair, this rebuilds
  // exactly when the picture would change, like shaftFill and murkFill,
  // instead of once per frame.
  const lip = grey(mix(AIR_SHADE.lipOff, AIR_SHADE.lipOn));
  const low = grey(mix(AIR_SHADE.lowOff, AIR_SHADE.lowOn));
  if (!airShade || airShadeCtx !== ctx ||
      airShadeLip !== lip || airShadeLow !== low) {
    airShadeCtx = ctx;
    airShadeLip = lip;
    airShadeLow = low;
    airShade = ctx.createLinearGradient(0, RIM_ROWS, 0, SURFACE + SURFACE_MAX);
    airShade.addColorStop(0, lip);
    airShade.addColorStop(1, low);
  }
  const shade = airShade;

  ctx.globalCompositeOperation = "saturation";
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = "#808080";
  fillAboveLine(ctx, line);
  ctx.globalCompositeOperation = "multiply";
  ctx.globalAlpha = 1;
  ctx.fillStyle = shade;
  fillAboveLine(ctx, line);
  ctx.globalCompositeOperation = "source-over";

  // Top frame: a black lip with a faint lit edge on its underside.
  ctx.fillStyle = "#050607";
  ctx.fillRect(0, 0, W, RIM_ROWS - 1);
  ctx.fillStyle = "#1c2024";
  ctx.fillRect(0, RIM_ROWS - 1, W, 1);
}

// ---- surface line ----------------------------------------------------------

/** Brightness of the silvery band under the waterline, row by row
 * down from the line, at full daylight. */
const UNDERSIDE = [0.3, 0.14, 0.05] as const;

/**
 * The waterline itself, following the waves: a faint line (moonlight
 * keeps a trace of it after dark), brighter where the water slopes and
 * catches the lamp, with a glint travelling along it. Under it the
 * surface's underside mirrors the light as a silvery band, which is
 * what makes a waterline read from the front. `highlight` brightens the
 * whole line while a click would feed.
 */
export function drawSurface(ctx: CanvasRenderingContext2D,
                            line: Int16Array, sun: number, t: number,
                            highlight: boolean): void {
  const gx = W / 2 + (Math.sin(t * 0.011) * 0.6 +
                      Math.sin(t * 0.027 + 1) * 0.4) * W * 0.42;
  // Screen-blended, so the band lifts what is under it instead of
  // painting over it.
  ctx.globalCompositeOperation = "screen";
  ctx.fillStyle = "#dff4ff";
  let x0 = 0;
  for (let x = 1; x <= W; x++) {
    if (x < W && line[x] === line[x0]) continue;
    for (let r = 0; r < UNDERSIDE.length; r++) {
      ctx.globalAlpha = UNDERSIDE[r]! * (0.35 + 0.65 * sun);
      ctx.fillRect(x0, line[x0]! + 1 + r, x - x0, 1);
    }
    x0 = x;
  }
  ctx.globalCompositeOperation = "source-over";

  const base = highlight ? 0.6 : 0.3 + 0.25 * sun;
  ctx.fillStyle = highlight ? "#ffffff" : "#e8f6ff";
  for (let x = 0; x < W; x++) {
    const y = line[x]!;
    const slope = Math.abs(line[Math.min(W - 1, x + 1)]! -
                           line[Math.max(0, x - 1)]!);
    const d = Math.abs(x - gx);
    const glint = d < 3 ? 0.35 + 0.5 * sun : d < 9 ? 0.2 + 0.35 * sun : 0;
    ctx.globalAlpha = Math.min(1, Math.max(base, glint) + slope * 0.18 * sun);
    ctx.fillRect(x, y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

// ---- murk ------------------------------------------------------------------

/** Wash opacity at full strength, at the surface and at the gravel:
 * waste settles, so foul water thickens toward the bottom. */
export const MURK_TOP = 0.3;
export const MURK_BOTTOM = 0.62;
const MURK_PARTICLES_MIN = 20;
const MURK_PARTICLES_MAX = 40;

export interface MurkParams {
  /** 0 = clear water, 1 = fully fouled. */
  strength: number;
  /** Wash opacity just under the surface. */
  top: number;
  /** Wash opacity at the gravel. */
  bottom: number;
  /** Drifting specks of debris to draw. */
  particles: number;
}

/** Murk for a water quality (1 = clean, 0 = foul): invisible down to
 * q 0.7, then easing in until the tank is thick with it by q 0.1. */
export function murkParams(q: number): MurkParams {
  const strength = smoothstep(0.7, 0.1, q);
  const debris = q < 0.5 ? smoothstep(0.5, 0.1, q) : -1;
  return {
    strength,
    top: MURK_TOP * strength,
    bottom: MURK_BOTTOM * strength,
    particles: debris < 0 ? 0 : Math.round(
      MURK_PARTICLES_MIN + (MURK_PARTICLES_MAX - MURK_PARTICLES_MIN) * debris),
  };
}

let murkFill: CanvasGradient | null = null;

/** Green-brown wash over the water plus 1-px debris drifting in it.
 * The wash starts at the surface line (the air above stays clear) and
 * reaches full thickness at the gravel line, then covers the gravel. */
export function drawMurk(ctx: CanvasRenderingContext2D, quality: number,
                         tick: number): void {
  const m = murkParams(quality);
  if (m.strength <= 0.01) return;
  if (!murkFill) {
    // Built at unit strength; globalAlpha scales it to m.bottom.
    murkFill = ctx.createLinearGradient(0, SURFACE, 0, H - BOTTOM_PAD);
    murkFill.addColorStop(0, `rgba(70,90,30,${MURK_TOP / MURK_BOTTOM})`);
    murkFill.addColorStop(1, "rgba(62,74,26,1)");
  }
  ctx.fillStyle = murkFill;
  ctx.globalAlpha = m.bottom;
  ctx.fillRect(0, SURFACE, W, H - SURFACE);

  const span = H - BOTTOM_PAD - SURFACE - 16;
  for (let i = 0; i < m.particles; i++) {
    const r = hash01(i), s = hash01(i + 97), k = hash01(i + 211);
    // Wrap-safe: the sway can take a fresh tank's speck below 0.
    const x = ((r * W + tick * (0.03 + 0.06 * s) +
                Math.sin(tick * 0.02 + i) * 3) % W + W) % W;
    const y = SURFACE + 12 + s * span + Math.sin(tick * 0.013 + i * 2.3) * 5;
    ctx.fillStyle = k < 0.7 ? "#3a3a14" : "#8c8a4a";
    ctx.globalAlpha = 0.35 + 0.45 * m.strength;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}
