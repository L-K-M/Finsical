import { describe, expect, it } from "vitest";
import { SURFACE } from "../core/sim.js";
import { ambientSwell, disturbSurface, newSurface, surfaceLine, SURFACE_MAX,
         SURFACE_W, tickSurface } from "./surface.js";

function energy(s: ReturnType<typeof newSurface>): number {
  let e = 0;
  for (let i = 0; i < SURFACE_W; i++) e += s.h[i]! ** 2 + s.v[i]! ** 2;
  return e;
}

describe("surface", () => {
  it("rests flat until something disturbs it", () => {
    const s = newSurface();
    for (let t = 0; t < 100; t++) tickSurface(s);
    expect(energy(s)).toBe(0);
  });

  it("spreads a splash outward as waves both ways", () => {
    const s = newSurface();
    disturbSurface(s, 160, 1.6);
    for (let t = 0; t < 30; t++) tickSurface(s);
    // Mirror symmetric around the splash, and reaching well past it.
    expect(s.h[150]).toBeCloseTo(s.h[170]!, 4);
    let reach = 0;
    for (let i = 160; i < SURFACE_W; i++)
      if (Math.abs(s.h[i]!) > 0.05) reach = i - 160;
    expect(reach).toBeGreaterThan(20);
  });

  it("settles out of sight within a few seconds", () => {
    const s = newSurface();
    disturbSurface(s, 40, 3.2);
    disturbSurface(s, 300, 1.6);
    for (let t = 0; t < 30 * 5; t++) tickSurface(s);
    // Under half a pixel rounds to the resting row.
    for (let i = 0; i < SURFACE_W; i++) expect(Math.abs(s.h[i]!)).toBeLessThan(0.5);
  });

  it("stays bounded under a storm of splashes", () => {
    const s = newSurface();
    for (let t = 0; t < 600; t++) {
      disturbSurface(s, (t * 37) % SURFACE_W, t % 2 ? 3.2 : -3.2);
      tickSurface(s);
      for (let i = 0; i < SURFACE_W; i += 16) {
        expect(Number.isFinite(s.h[i]!)).toBe(true);
        expect(Math.abs(s.h[i]!)).toBeLessThanOrEqual(6);
      }
    }
  });

  it("ignores pushes past the glass", () => {
    const s = newSurface();
    disturbSurface(s, -50, 3);
    disturbSurface(s, SURFACE_W + 50, 3);
    expect(energy(s)).toBe(0);
    disturbSurface(s, 0, 1);
    expect(s.v[0]).toBeCloseTo(1);
  });
});

describe("surfaceLine", () => {
  it("draws whole-pixel rows within reach of the resting surface", () => {
    const s = newSurface();
    disturbSurface(s, 100, 3);
    disturbSurface(s, 220, -3);
    const out = new Int16Array(SURFACE_W);
    for (let t = 0; t < 120; t++) {
      tickSurface(s);
      surfaceLine(s, t, out);
      for (const y of out) {
        expect(y).toBeGreaterThanOrEqual(SURFACE - SURFACE_MAX);
        expect(y).toBeLessThanOrEqual(SURFACE + SURFACE_MAX);
      }
    }
  });

  it("stays near rest with only the ambient swell", () => {
    const out = surfaceLine(newSurface(), 0, new Int16Array(SURFACE_W));
    for (const y of out) expect(Math.abs(y - SURFACE)).toBeLessThanOrEqual(1);
    // Mostly flat: the swell only breaks the line where waves align.
    const flat = out.filter((y) => y === SURFACE).length;
    expect(flat).toBeGreaterThan(SURFACE_W * 0.6);
    for (let x = 0; x < SURFACE_W; x += 5)
      expect(Math.abs(ambientSwell(x, 1234))).toBeLessThan(0.7);
  });

  it("is deterministic for the same state and time", () => {
    const a = newSurface(), b = newSurface();
    disturbSurface(a, 77, 2); disturbSurface(b, 77, 2);
    for (let t = 0; t < 40; t++) { tickSurface(a); tickSurface(b); }
    expect([...surfaceLine(a, 40, new Int16Array(SURFACE_W))])
      .toEqual([...surfaceLine(b, 40, new Int16Array(SURFACE_W))]);
  });
});
