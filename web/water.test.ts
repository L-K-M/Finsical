import { describe, expect, it } from "vitest";
import { SURFACE } from "../core/sim.js";
import { makeRng } from "../core/rng.js";
import {
  bubbleOffset, bubblePops, bubbleSize, CAUSTIC_TILE_H, CAUSTIC_TILE_W, drawAir,
  causticShimmer, causticTile, causticValue, feedPinch, murkParams,
  MURK_BOTTOM, MURK_TOP, pelletDrift, PINCH_MAX, PINCH_SPREAD, REFRACT_ROWS,
  refractShift, sunFactor,
} from "./water.js";
import { SURFACE_MAX, SURFACE_W } from "./surface.js";

describe("bubbles", () => {
  it("grow from 1 px at depth to 4 px near the surface", () => {
    expect(bubbleSize(180)).toBe(1);
    expect(bubbleSize(100)).toBe(2);
    expect(bubbleSize(50)).toBe(3);
    expect(bubbleSize(SURFACE + 2)).toBe(4);
    let prev = 0;
    for (let y = 190; y > SURFACE; y -= 0.8) {
      expect(bubbleSize(y)).toBeGreaterThanOrEqual(prev);
      prev = bubbleSize(y);
    }
  });

  it("wobble a pixel or so and keep a stable offset per position", () => {
    for (let y = SURFACE; y < 200; y += 0.8) {
      expect(Math.abs(bubbleOffset(123, y))).toBeLessThanOrEqual(1.4);
    }
    expect(bubbleOffset(40, 90)).toBe(bubbleOffset(40, 90));
    // Different spawn x sway out of step.
    expect(bubbleOffset(40, 90)).not.toBeCloseTo(bubbleOffset(41, 90), 2);
  });

  it("pop exactly on the last tick before the sim removes them", () => {
    expect(bubblePops(SURFACE + 0.8)).toBe(true);
    expect(bubblePops(SURFACE + 0.3)).toBe(true);
    expect(bubblePops(SURFACE + 0.81)).toBe(false);
  });
});

describe("feedPinch", () => {
  it("drops pellets within the spread, the first at once", () => {
    const rand = makeRng(7);
    for (let i = 0; i < 500; i++) {
      const p = feedPinch(rand, PINCH_MAX);
      expect(p[0]!.delay).toBe(0);
      for (const q of p) {
        expect(Math.abs(q.dx)).toBeLessThanOrEqual(PINCH_SPREAD);
        expect(q.delay).toBeGreaterThanOrEqual(0);
        expect(q.delay).toBeLessThan(1000);
      }
    }
  });

  it("drops one pellet per hungry fish, at least one, at most a few", () => {
    const rand = makeRng(7);
    // A sated tank still gets a pellet; a crowd doesn't flood it.
    expect(feedPinch(rand, 0)).toHaveLength(1);
    expect(feedPinch(rand, 3)).toHaveLength(3);
    expect(feedPinch(rand, 24)).toHaveLength(PINCH_MAX);
  });

  it("stays in bounds at the extremes of the random source", () => {
    for (const r of [0, 0.999999]) {
      const p = feedPinch(() => r, PINCH_MAX);
      expect(p).toHaveLength(PINCH_MAX);
      for (const q of p)
        expect(Math.abs(q.dx)).toBeLessThanOrEqual(PINCH_SPREAD);
    }
  });

  it("pellet drift is small and fixed once a pellet settles", () => {
    for (let y = 12; y < 190; y += 0.35)
      expect(Math.abs(pelletDrift(160, y))).toBeLessThanOrEqual(1.3);
    expect(pelletDrift(150, 188)).toBe(pelletDrift(150, 188));
  });
});

describe("caustics", () => {
  it("are deterministic", () => {
    expect(causticTile(0)).toEqual(causticTile(0));
    expect(causticTile(1)).toEqual(causticTile(1));
    expect(causticTile(0)).not.toEqual(causticTile(1));
  });

  it("tile seamlessly", () => {
    for (const layer of [0, 1] as const) {
      for (let y = 0; y < CAUSTIC_TILE_H; y += 3) {
        for (let x = 0; x < CAUSTIC_TILE_W; x += 5) {
          const v = causticValue(x, y, layer);
          expect(causticValue(x + CAUSTIC_TILE_W, y, layer)).toBeCloseTo(v, 9);
          expect(causticValue(x, y + CAUSTIC_TILE_H, layer)).toBeCloseTo(v, 9);
        }
      }
    }
  });

  it("light a sparse web, not a wash", () => {
    for (const layer of [0, 1] as const) {
      const t = causticTile(layer);
      const lit = t.reduce((a, b) => a + b, 0) / t.length;
      expect(lit).toBeGreaterThan(0.05);
      expect(lit).toBeLessThan(0.3);
    }
  });

  it("fade out entirely at night", () => {
    expect(sunFactor(0.3)).toBe(0);
    expect(sunFactor(1)).toBe(1);
    expect(sunFactor(0.65)).toBeCloseTo(0.5);
    // A light timer's night floor is brighter; it is still night.
    expect(sunFactor(0.45, 0.45)).toBe(0);
    expect(sunFactor(1, 0.45)).toBe(1);
  });
});

describe("murkParams", () => {
  it("is invisible in clean water", () => {
    for (const q of [1, 0.9, 0.7]) {
      const m = murkParams(q);
      expect(m.strength).toBe(0);
      expect(m.bottom).toBe(0);
      expect(m.particles).toBe(0);
    }
  });

  it("is at full strength and thickest at the gravel by q 0.1", () => {
    for (const q of [0.1, 0]) {
      const m = murkParams(q);
      expect(m.strength).toBe(1);
      expect(m.top).toBe(MURK_TOP);
      expect(m.bottom).toBe(MURK_BOTTOM);
      expect(m.bottom).toBeGreaterThan(m.top);
      expect(m.particles).toBe(40);
    }
  });

  it("eases in monotonically", () => {
    let prev = -1;
    for (let q = 1; q >= 0; q -= 0.05) {
      const s = murkParams(q).strength;
      expect(s).toBeGreaterThanOrEqual(prev);
      prev = s;
    }
    // Smoothstep, not linear: gentle start, halfway at the midpoint.
    expect(murkParams(0.65).strength).toBeLessThan(0.1);
    expect(murkParams(0.4).strength).toBeCloseTo(0.5);
  });

  it("adds 20-40 debris specks only below q 0.5", () => {
    expect(murkParams(0.5).particles).toBe(0);
    expect(murkParams(0.49).particles).toBeGreaterThanOrEqual(20);
    expect(murkParams(0.3).particles).toBeGreaterThan(20);
    expect(murkParams(0.3).particles).toBeLessThan(40);
  });
});

describe("drawAir", () => {
  function recorder(): { ctx: CanvasRenderingContext2D; rects: number[][] } {
    const rects: number[][] = [];
    const ctx = {
      fillStyle: "", globalAlpha: 1, globalCompositeOperation: "",
      createLinearGradient: () => ({ addColorStop: () => {} }),
      fillRect: (...r: number[]) => { rects.push(r); },
    } as unknown as CanvasRenderingContext2D;
    return { ctx, rects };
  }

  it("covers the whole tank above the surface line, and only that", () => {
    const { ctx, rects } = recorder();
    drawAir(ctx, 1);
    expect(rects[0]).toEqual([0, 0, SURFACE_W, SURFACE]);
    // The shading and the frame stay in the air, clear of the water.
    for (const [, y, , h] of rects) expect(y! + h!).toBeLessThanOrEqual(SURFACE);
  });

  it("follows a moving waterline column by column", () => {
    const line = new Int16Array(SURFACE_W).fill(SURFACE);
    line.fill(SURFACE + 2, 100, 110);
    line.fill(SURFACE - 3, 200, 204);
    const { ctx, rects } = recorder();
    drawAir(ctx, 0, line);
    const cover = new Array<number>(SURFACE_W).fill(-1);
    for (const [x, y, w, h] of rects) {
      if (y !== 0 || h! < SURFACE - 3) continue; // the frame
      for (let i = x!; i < x! + w!; i++) cover[i] = h!;
    }
    expect(cover).toEqual([...line]);
  });

  it("keeps the top frame above the highest wave", () => {
    const { ctx, rects } = recorder();
    drawAir(ctx, 0.5, new Int16Array(SURFACE_W).fill(SURFACE));
    const details = rects.filter(([, y, , h]) => !(y === 0 && h! >= SURFACE));
    expect(details.length).toBeGreaterThan(0);
    for (const [, y, , h] of details)
      expect(y! + h!).toBeLessThanOrEqual(SURFACE - SURFACE_MAX);
  });
});

describe("refraction", () => {
  it("wavers only a band under the surface, fading with depth", () => {
    let top = 0, deep = 0;
    for (let t = 0; t < 600; t += 7) {
      expect(refractShift(SURFACE, t)).toBe(0);
      expect(refractShift(SURFACE + REFRACT_ROWS + 1, t)).toBe(0);
      top = Math.max(top, Math.abs(refractShift(SURFACE + 1, t)));
      deep = Math.max(deep, Math.abs(refractShift(SURFACE + REFRACT_ROWS - 1, t)));
      for (let y = SURFACE; y < SURFACE + REFRACT_ROWS + 2; y++)
        expect(Math.abs(refractShift(y, t))).toBeLessThanOrEqual(2);
    }
    expect(top).toBe(2);
    expect(deep).toBeLessThan(top);
  });

  it("caustic shimmer stays within a couple of pixels", () => {
    const seen = new Set<number>();
    for (let t = 0; t < 900; t += 3)
      for (let b = 0; b < 30; b++) seen.add(causticShimmer(b, t));
    expect(Math.max(...seen)).toBeLessThanOrEqual(3);
    expect(Math.min(...seen)).toBeGreaterThanOrEqual(-3);
    expect(seen.size).toBeGreaterThan(3);
  });
});
