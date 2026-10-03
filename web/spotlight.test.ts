import { describe, expect, it } from "vitest";
import { SPOTLIGHT_TTL_MS, spotlightAlive } from "./spotlight.js";

describe("spotlightAlive", () => {
  it("lives exactly until the TTL passes", () => {
    expect(spotlightAlive(7, 1000, 1000, true)).toBe(true);
    expect(spotlightAlive(7, 1000, 1000 + SPOTLIGHT_TTL_MS, true)).toBe(true);
    expect(spotlightAlive(7, 1000, 1001 + SPOTLIGHT_TTL_MS, true))
      .toBe(false);
  });

  it("dies with its fish or with no selection", () => {
    expect(spotlightAlive(7, 1000, 1000, false)).toBe(false);
    expect(spotlightAlive(null, 1000, 1000, true)).toBe(false);
  });

  it("treats a clock that went backwards as still live", () => {
    // Date.now() can step back (NTP); the old inline check kept the
    // spotlight rather than lifting it on a negative age.
    expect(spotlightAlive(7, 1000, 500, true)).toBe(true);
  });
});
