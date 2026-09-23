import { describe, expect, it } from "vitest";
import {
  FEED_ZONE, containPoint, feedZoneLineY, isFeedZoneY,
} from "./feedzone.js";

const TANK = { width: 320, height: 200 };

describe("feed zone", () => {
  it("is the top 15% of the tank", () => {
    expect(FEED_ZONE).toBe(0.15);
  });

  it("treats the surface as feeding and the bound as exclusive", () => {
    expect(isFeedZoneY(0, 200)).toBe(true);
    expect(isFeedZoneY(29, 200)).toBe(true);
    expect(isFeedZoneY(30, 200)).toBe(false);
    expect(isFeedZoneY(199, 200)).toBe(false);
  });

  it("scales with tank height", () => {
    expect(isFeedZoneY(14, 100)).toBe(true);
    expect(isFeedZoneY(15, 100)).toBe(false);
    expect(isFeedZoneY(44.9, 300)).toBe(true);
    expect(isFeedZoneY(45, 300)).toBe(false);
  });

  it("draws the boundary on the first non-feed row", () => {
    // ceil, not round: a fractional bound (e.g. 52.2) must land on the
    // first row that fails isFeedZoneY, not one pixel inside the strip.
    expect(feedZoneLineY(200)).toBe(30);
    expect(feedZoneLineY(348)).toBe(53); // 52.2 → 53
    expect(isFeedZoneY(feedZoneLineY(348) - 1, 348)).toBe(true);
    expect(isFeedZoneY(feedZoneLineY(348), 348)).toBe(false);
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
  });
});
