import { describe, expect, it } from "vitest";
import { FEED_ZONE, isFeedZoneY } from "./feedzone.js";

describe("feed zone", () => {
  it("is the top 15% of the tank", () => {
    expect(FEED_ZONE).toBe(0.15);
  });

  it("treats the surface as feeding and the bound as exclusive", () => {
    // 320×200 tank — boundary at y = 30.
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
});
