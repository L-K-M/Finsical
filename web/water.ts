/**
 * Living water: bubbles, food pellets, the surface, caustics, sun shafts
 * and murk. Everything here is render-only. Looks derive from sim data
 * (positions, tickCount, light, water quality) rather than per-frame
 * randomness, so drawing the same sim state twice gives the same frame.
 * Sprites, tiles and gradients are built once on first use; the per-frame
 * draw calls allocate nothing beyond a few path points.
 */
import { BOTTOM_PAD, FOOD_ROT_TICKS, SURFACE } from "../core/sim.js";
import type { Bubble, Food } from "../core/sim.js";

const W = 320;
const H = 200;

/** Whether ambient light animates. 'still' honours prefers-reduced-motion:
 * caustics, shafts and the surface glint freeze in place. */
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

/** Sunlight strength for light effects: 0 at night, 1 at noon. The
 * sim's light bottoms out at 0.3, and moonlit water shouldn't sparkle. */
export function sunFactor(light: number): number {
  return clamp01((light - 0.3) / 0.7);
}

// ---- bubbles ---------------------------------------------------------------

/** Bubble rise per tick in the sim; a bubble at or below SURFACE + this
 * is on its last tick and pops instead of drawing. */
const BUBBLE_RISE = 0.8;

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

export function drawBubbles(ctx: CanvasRenderingContext2D,
                            bubbles: readonly Bubble[]): void {
  bubbleSprites ??= BUBBLE_ART.map(spriteOf);
  popSprites ??= [spriteOf(POP_ART_INNER), spriteOf(POP_ART)];
  for (const b of bubbles) {
    const x = Math.round(b.x + bubbleOffset(b.x, b.y));
    if (bubblePops(b.y)) {
      // Alternate the two ring sizes on the x parity so simultaneous
      // pops don't look stamped.
      const p = popSprites[Math.round(b.x) & 1]!;
      ctx.drawImage(p, x - 2, SURFACE - 2);
      continue;
    }
    const s = bubbleSprites[bubbleSize(b.y) - 1]!;
    ctx.drawImage(s, x - (s.width >> 1), Math.round(b.y) - (s.height >> 1));
  }
}

// ---- food ------------------------------------------------------------------

/** Pellets per feed, inclusive. */
const PINCH_MIN = 3;
const PINCH_MAX = 5;
/** Horizontal scatter of a pinch around the drop x, px. */
export const PINCH_SPREAD = 24;
/** Delay between pellets of one pinch, ms: they rain in, not as a row. */
const PINCH_STAGGER_MS = 110;

export interface PinchPellet {
  /** Offset from the drop x, px. */
  dx: number;
  /** Milliseconds after the feed that this pellet enters the water. */
  delay: number;
}

/** A pinch of food: 3-5 pellets scattered around the drop point. */
export function feedPinch(rand: () => number): PinchPellet[] {
  const n = PINCH_MIN + Math.floor(rand() * (PINCH_MAX - PINCH_MIN + 1));
  const out: PinchPellet[] = [];
  for (let i = 0; i < n; i++) {
    out.push({
      dx: Math.round((rand() * 2 - 1) * PINCH_SPREAD),
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

export function drawFood(ctx: CanvasRenderingContext2D,
                         food: readonly Food[]): void {
  for (const fd of food) {
    // Rotting pellets dissolve: fade them out over their rot lifetime.
    ctx.globalAlpha = 1 - 0.65 * Math.min(1, fd.settled / FOOD_ROT_TICKS);
    const x = Math.round(fd.x + pelletDrift(fd.x, fd.y));
    const y = Math.round(fd.y);
    const shape = pelletShape(fd.x, fd.y, fd.settled > 0);
    ctx.fillStyle = PELLET;
    if (shape === "nugget") {
      ctx.fillRect(x - 1, y - 1, 2, 2);
      ctx.fillStyle = PELLET_SHADE;
      ctx.fillRect(x, y, 1, 1);
    } else if (shape === "flakeFlat") {
      ctx.fillRect(x - 1, y, 1, 1);
      ctx.fillStyle = PELLET_SHADE;
      ctx.fillRect(x, y, 1, 1);
    } else {
      ctx.fillRect(x, y - 1, 1, 2);
    }
  }
  ctx.globalAlpha = 1;
}

// ---- surface, caustics, shafts ---------------------------------------------

export const CAUSTIC_TILE_W = 64;
export const CAUSTIC_TILE_H = 32;
/** Caustics cover the lower tank, fading in from here down. */
const CAUSTIC_TOP = 104;
const CAUSTIC_ALPHA = 0.1;
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

/**
 * Sunlight in the water: gentle slanted shafts, caustics over the lower
 * tank and a faint surface line with a travelling glint. Drawn behind
 * the fish, and scaled by daylight so nights stay dark.
 */
export function drawLight(ctx: CanvasRenderingContext2D, light: number,
                          tick: number, motion: WaterMotion): void {
  const sun = sunFactor(light);
  const t = motion === "animated" ? tick : 0;

  // Surface: moonlight keeps a trace of the line after dark.
  ctx.fillStyle = "#e8f6ff";
  ctx.globalAlpha = 0.12 + 0.16 * sun;
  ctx.fillRect(0, SURFACE, W, 1);
  const gx = Math.round(W / 2 + (Math.sin(t * 0.011) * 0.6 +
                                 Math.sin(t * 0.027 + 1) * 0.4) * W * 0.42);
  ctx.globalAlpha = 0.2 + 0.35 * sun;
  ctx.fillRect(gx - 9, SURFACE, 18, 1);
  ctx.globalAlpha = 0.35 + 0.5 * sun;
  ctx.fillRect(gx - 3, SURFACE, 6, 1);

  if (sun <= 0.01) { ctx.globalAlpha = 1; return; }
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
  ctx.drawImage(strips[0]!, a, 0, W, h, 0, CAUSTIC_TOP, W, h);
  ctx.drawImage(strips[1]!, b, 0, W, h, 0, CAUSTIC_TOP, W, h);

  ctx.globalCompositeOperation = "source-over";
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

/** Green-brown wash over the scene plus 1-px debris drifting in it. */
export function drawMurk(ctx: CanvasRenderingContext2D, quality: number,
                         tick: number): void {
  const m = murkParams(quality);
  if (m.strength <= 0.01) return;
  if (!murkFill) {
    // Built at unit strength; globalAlpha scales it to m.bottom.
    murkFill = ctx.createLinearGradient(0, 0, 0, H);
    murkFill.addColorStop(0, `rgba(70,90,30,${MURK_TOP / MURK_BOTTOM})`);
    murkFill.addColorStop(1, "rgba(62,74,26,1)");
  }
  ctx.fillStyle = murkFill;
  ctx.globalAlpha = m.bottom;
  ctx.fillRect(0, 0, W, H);

  const span = H - BOTTOM_PAD - SURFACE - 16;
  for (let i = 0; i < m.particles; i++) {
    const r = hash01(i), s = hash01(i + 97), k = hash01(i + 211);
    const x = (r * W + tick * (0.03 + 0.06 * s) +
               Math.sin(tick * 0.02 + i) * 3) % W;
    const y = SURFACE + 12 + s * span + Math.sin(tick * 0.013 + i * 2.3) * 5;
    ctx.fillStyle = k < 0.7 ? "#3a3a14" : "#8c8a4a";
    ctx.globalAlpha = 0.35 + 0.45 * m.strength;
    ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
  }
  ctx.globalAlpha = 1;
}
