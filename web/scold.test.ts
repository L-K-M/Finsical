import { describe, expect, it } from "vitest";
import { recentTaps, SCOLD_COOLDOWN_MS, shouldScold } from "./scold.js";

// Taps `gap` ms apart, the last one at `end`.
const taps = (n: number, gap: number, end: number): number[] =>
  Array.from({ length: n }, (_, i) => end - (n - 1 - i) * gap);

describe("shouldScold", () => {
  it("shows the sign for six taps within 8 s", () => {
    expect(shouldScold(taps(6, 1_000, 100_000), 100_000, null)).toBe(true);
  });

  it("lets five taps go", () => {
    expect(shouldScold(taps(5, 500, 100_000), 100_000, null)).toBe(false);
  });

  it("lets six taps spread over 9 s go", () => {
    expect(shouldScold(taps(6, 1_800, 100_000), 100_000, null)).toBe(false);
  });

  it("stays down for 30 minutes after it was shown", () => {
    const now = 100_000_000;
    const t = taps(6, 1_000, now);
    expect(shouldScold(t, now, now - 60_000)).toBe(false);
    expect(shouldScold(t, now, now - SCOLD_COOLDOWN_MS + 1)).toBe(false);
    expect(shouldScold(t, now, now - SCOLD_COOLDOWN_MS)).toBe(true);
  });
});

describe("recentTaps", () => {
  it("keeps only the taps inside the spree window", () => {
    expect(recentTaps([1_000, 5_000, 5_500, 12_000], 13_000))
      .toEqual([5_500, 12_000]);
  });
});
