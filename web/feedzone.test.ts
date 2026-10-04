import { describe, expect, it } from "vitest";
import { makeRng } from "../core/rng.js";
import { SURFACE } from "../core/sim.js";
import { TANK_SIZE } from "../core/tuning.js";
import { containPoint, isFeedZone, tankMap } from "./feedzone.js";

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
    // Edges raised 4px: clamping to the edge column would read the
    // raised waterline; the contract is the rest height instead, so
    // just under SURFACE must still count as above water.
    const raised = new Int16Array(320).fill(SURFACE);
    raised[0] = raised[319] = SURFACE - 4;
    expect(isFeedZone(-5, SURFACE - 3, raised)).toBe(true);
    expect(isFeedZone(400, SURFACE - 3, raised)).toBe(true);
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
    const m = tankMap(canvas, TANK);
    expect(m.s).toBe(1.5); // height-limited: 300 / 200
    for (const [x, y] of [[0, 0], [160, 100], [319, 199]] as const) {
      const back = containPoint(m.ox + x * m.s, m.oy + y * m.s, canvas,
                                TANK);
      expect(back!.x).toBeCloseTo(x, 9);
      expect(back!.y).toBeCloseTo(y, 9);
    }
  });

  it("lands exactly where the inline contain formula does", () => {
    // The forward letterbox math written out, as main.ts placed the Get
    // Info card and the name tags before it used tankMap: the map must
    // reproduce it to the last bit (toBe compares with Object.is).
    const rand = makeRng(11);
    const rects = [
      { left: 12.3, top: 7.75, width: 701.1, height: 333.3 },
      { left: 0.5, top: 41.2, width: 319.7, height: 610.9 },
      { left: 1234.56, top: 0.1, width: 0, height: 0 }, // hidden canvas
      ...Array.from({ length: 200 }, () => ({
        left: rand() * 2000 - 500, top: rand() * 1500 - 300,
        width: rand() * 1600, height: rand() * 1200 })),
    ];
    for (const r of rects) {
      const m = tankMap(r, TANK_SIZE);
      const s = Math.min(r.width / TANK_SIZE.width,
                         r.height / TANK_SIZE.height);
      for (const [x, y] of [[0, 0], [17.25, 199.5], [160.1, 99.9],
                            [319, 3.3]] as const) {
        expect(m.ox + x * m.s)
          .toBe(r.left + (r.width - TANK_SIZE.width * s) / 2 + x * s);
        expect(m.oy + y * m.s)
          .toBe(r.top + (r.height - TANK_SIZE.height * s) / 2 + y * s);
      }
    }
  });
});
