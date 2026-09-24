import { describe, expect, it } from "vitest";
import { SURFACE } from "../core/sim.js";
import { containPoint, isFeedZone } from "./feedzone.js";

const TANK = { width: 320, height: 200 };
/** A flat waterline at rest height, as a column-indexed lookup. */
const flat = new Int16Array(320).fill(SURFACE);

describe("feed zone", () => {
  it("feeds in the air above the waterline", () => {
    expect(isFeedZone(160, 0, flat)).toBe(true);
    expect(isFeedZone(160, SURFACE - 0.5, flat)).toBe(true);
  });

  it("counts the surface line's own row as the surface", () => {
    expect(isFeedZone(160, SURFACE, flat)).toBe(true);
    expect(isFeedZone(160, SURFACE + 0.99, flat)).toBe(true);
    expect(isFeedZone(160, SURFACE + 1, flat)).toBe(false);
  });

  it("taps the glass anywhere in the water", () => {
    // The top 15% of the tank used to feed: 29 was inside it.
    expect(isFeedZone(160, SURFACE + 2, flat)).toBe(false);
    expect(isFeedZone(160, 29, flat)).toBe(false);
    expect(isFeedZone(160, 199, flat)).toBe(false);
  });

  it("follows the drawn line through crests and troughs", () => {
    const wavy = new Int16Array(320).fill(SURFACE);
    wavy[80] = SURFACE + 3;  // crest: water stands 3px lower
    wavy[240] = SURFACE - 3; // trough: water dips 3px higher
    // On the crest a click down to the line still feeds.
    expect(isFeedZone(80, SURFACE + 3, wavy)).toBe(true);
    expect(isFeedZone(80, SURFACE + 4, wavy)).toBe(false);
    // In the trough a click on what used to be air is underwater.
    expect(isFeedZone(240, SURFACE - 3, wavy)).toBe(true);
    expect(isFeedZone(240, SURFACE - 2, wavy)).toBe(false);
    // Rounding: a click between columns reads the nearer one.
    expect(isFeedZone(80.4, SURFACE + 3, wavy)).toBe(true);
  });

  it("falls back to the rest height off the line's ends", () => {
    expect(isFeedZone(-5, SURFACE, flat)).toBe(true);
    expect(isFeedZone(400, SURFACE, flat)).toBe(true);
    expect(isFeedZone(400, SURFACE + 1, flat)).toBe(false);
  });
});

describe("containPoint", () => {
  it("maps a centered click in an exact-fit box", () => {
    const rect = { left: 0, top: 0, width: 320, height: 200 };
    expect(containPoint(160, 100, rect, TANK)).toEqual({ x: 160, y: 100 });
    expect(containPoint(0, 0, rect, TANK)).toEqual({ x: 0, y: 0 });
    // Exclusive upper bound — the far edge is outside the bitmap.
    expect(containPoint(320, 200, rect, TANK)).toBeNull();
  });

  it("returns null in every letterbox bar", () => {
    // 400×200 box, 320×200 tank → 40px bars left and right.
    const rect = { left: 0, top: 0, width: 400, height: 200 };
    expect(containPoint(20, 100, rect, TANK)).toBeNull();
    expect(containPoint(380, 100, rect, TANK)).toBeNull();
    expect(containPoint(200, 100, rect, TANK)).toEqual({ x: 160, y: 100 });

    // 320×400 box, 320×200 tank → 100px bars top and bottom.
    const tall = { left: 0, top: 0, width: 320, height: 400 };
    expect(containPoint(160, 50, tall, TANK)).toBeNull();
    expect(containPoint(160, 350, tall, TANK)).toBeNull();
    expect(containPoint(160, 200, tall, TANK)).toEqual({ x: 160, y: 100 });
  });

  it("respects a nonzero origin", () => {
    const rect = { left: 100, top: 50, width: 320, height: 200 };
    expect(containPoint(100, 50, rect, TANK)).toEqual({ x: 0, y: 0 });
    expect(containPoint(99, 50, rect, TANK)).toBeNull();
  });

  it("rejects non-finite coordinates", () => {
    const rect = { left: 0, top: 0, width: 320, height: 200 };
    expect(containPoint(NaN, 100, rect, TANK)).toBeNull();
    expect(containPoint(160, Infinity, rect, TANK)).toBeNull();
    // Hidden canvas → 0×0 rect → scale 0 → non-finite coordinates.
    expect(containPoint(160, 100, { left: 0, top: 0, width: 0, height: 0 },
                        TANK)).toBeNull();
  });
});
