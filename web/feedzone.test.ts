import { describe, expect, it } from "vitest";
import { SURFACE } from "../core/sim.js";
import { containPoint, isFeedZoneY, tankMap } from "./feedzone.js";

const TANK = { width: 320, height: 200 };

describe("feed zone", () => {
  it("feeds in the air above the waterline", () => {
    expect(isFeedZoneY(0)).toBe(true);
    expect(isFeedZoneY(SURFACE - 0.5)).toBe(true);
  });

  it("counts the surface line's own row as the surface", () => {
    expect(isFeedZoneY(SURFACE)).toBe(true);
    expect(isFeedZoneY(SURFACE + 0.99)).toBe(true);
    expect(isFeedZoneY(SURFACE + 1)).toBe(false);
  });

  it("taps the glass anywhere in the water", () => {
    // The top 15% of the tank used to feed: 29 was inside it.
    expect(isFeedZoneY(SURFACE + 2)).toBe(false);
    expect(isFeedZoneY(29)).toBe(false);
    expect(isFeedZoneY(199)).toBe(false);
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

describe("tankMap", () => {
  it("is containPoint's forward twin, letterbox included", () => {
    const canvas = { left: 50, top: 30, width: 700, height: 300 };
    const host = { left: 20, top: 10 };
    const m = tankMap(canvas, host, TANK);
    expect(m.s).toBe(1.5); // height-limited: 300 / 200
    for (const [x, y] of [[0, 0], [160, 100], [319, 199]] as const) {
      const back = containPoint(host.left + m.ox + x * m.s,
                                host.top + m.oy + y * m.s, canvas, TANK);
      expect(back!.x).toBeCloseTo(x, 9);
      expect(back!.y).toBeCloseTo(y, 9);
    }
  });
});
