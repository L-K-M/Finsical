import { describe, expect, it } from "vitest";
import { SURFACE } from "../core/sim.js";
import { tagPlacement } from "./nametags.js";

// A tank drawn at 2x, its corner 10 px into the host.
const MAP = { s: 2, ox: 10, oy: 10 };
const BOUNDS = { w: 660, h: 420 };
const W = 40, H = 12;

describe("tagPlacement", () => {
  it("centres the tag just above the fish", () => {
    // Body rows 90..110 at tank x 100: host x 210, top at host y 190.
    const p = tagPlacement(100, 90, 110, MAP, W, H, BOUNDS, SURFACE + 1);
    expect(p.left).toBe(210 - W / 2);
    expect(p.top).toBeLessThan(190);
    expect(p.top + H).toBeGreaterThan(185); // close above, not far off
  });

  it("puts the tag under a fish at the surface", () => {
    // Above would reach into the air strip.
    const p = tagPlacement(100, 14, 30, MAP, W, H, BOUNDS, SURFACE + 1);
    expect(p.top).toBeGreaterThanOrEqual(10 + 30 * 2);
  });

  it("stays inside the host at the side walls", () => {
    expect(tagPlacement(0, 90, 110, MAP, W, H, BOUNDS, SURFACE + 1).left)
      .toBe(0);
    expect(tagPlacement(319, 90, 110, MAP, W, H, BOUNDS, SURFACE + 1).left)
      .toBe(BOUNDS.w - W);
  });

  it("stays inside the host at the bottom", () => {
    const p = tagPlacement(100, 14, 205, MAP, W, H, BOUNDS, SURFACE + 1);
    expect(p.top).toBe(BOUNDS.h - H);
  });

  it("lands on whole pixels", () => {
    const p = tagPlacement(100.3, 90.7, 110, { s: 1.37, ox: 3.5, oy: 2.25 },
                           41, 13, BOUNDS, SURFACE + 1);
    expect(Number.isInteger(p.left)).toBe(true);
    expect(Number.isInteger(p.top)).toBe(true);
  });
});
