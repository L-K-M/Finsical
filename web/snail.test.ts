import { describe, expect, it } from "vitest";
import { SNAIL_ART, SNAIL_CRAWL, SNAIL_H, SNAIL_PAUSE_EVERY,
         SNAIL_PAUSE_LEN, SNAIL_W, snailPose, snailSpawn } from "./snail.js";

const W = 320;

describe("SNAIL_ART", () => {
  it("is SNAIL_W×SNAIL_H with only known ink characters", () => {
    expect(SNAIL_ART.length).toBe(SNAIL_H);
    for (const row of SNAIL_ART) {
      expect(row.length).toBe(SNAIL_W);
      expect(row).toMatch(/^[.ebsd]*$/);
    }
  });
});

describe("snailPose", () => {
  it("enters offscreen and crawls across", () => {
    const v = snailSpawn(0, () => 0.9); // dir -1: right edge, moving left
    const p0 = snailPose(v, 0, W)!;
    expect(p0.x).toBeGreaterThanOrEqual(W); // just off the right edge
    expect(p0.paused).toBe(false);
    const p1 = snailPose(v, 1000, W)!;
    expect(p1.x).toBeLessThan(p0.x); // dir -1 moves left
    expect(p0.x - p1.x).toBeCloseTo(
      (1000 - SNAIL_PAUSE_LEN * Math.floor(1000 /
        (SNAIL_PAUSE_EVERY + SNAIL_PAUSE_LEN)) -
        (1000 % (SNAIL_PAUSE_EVERY + SNAIL_PAUSE_LEN) >= SNAIL_PAUSE_EVERY
          ? 1000 % (SNAIL_PAUSE_EVERY + SNAIL_PAUSE_LEN) - SNAIL_PAUSE_EVERY
          : 0)) * SNAIL_CRAWL);
  });

  it("mirrors for dir 1", () => {
    const v = snailSpawn(0, () => 0.1); // dir 1: left edge, moving right
    expect(snailPose(v, 0, W)!.x).toBe(-SNAIL_W);
    // 300 ticks is before the first pause, so distance is pure crawl.
    expect(snailPose(v, 300, W)!.x).toBeCloseTo(-SNAIL_W + 300 * SNAIL_CRAWL);
  });

  it("pauses on the gait cycle without drifting", () => {
    const v = snailSpawn(0, () => 0.1);
    const still = snailPose(v, SNAIL_PAUSE_EVERY + 10, W)!;
    const later = snailPose(v, SNAIL_PAUSE_EVERY + SNAIL_PAUSE_LEN - 1, W)!;
    expect(still.paused).toBe(true);
    expect(later.paused).toBe(true);
    expect(later.x).toBe(still.x); // no drift while pulled in
    // Resumes crawling once the pause ends.
    const after = snailPose(v, SNAIL_PAUSE_EVERY + SNAIL_PAUSE_LEN + 10, W)!;
    expect(after.paused).toBe(false);
    expect(after.x).toBeGreaterThan(later.x);
  });

  it("returns null before t0 and once fully across", () => {
    const v = snailSpawn(100, () => 0.1);
    expect(snailPose(v, 50, W)).toBeNull();
    const end = Math.ceil((W + 2 * SNAIL_W) / SNAIL_CRAWL) +
      10 * (SNAIL_PAUSE_EVERY + SNAIL_PAUSE_LEN);
    expect(snailPose(v, 100 + end, W)).toBeNull();
  });
});
