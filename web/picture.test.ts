import { describe, expect, it } from "vitest";
import { needsCleanPicture } from "./picture.js";

describe("needsCleanPicture", () => {
  const plain = { paused: false, torchLit: false, bootActive: false,
                  focusActive: false, laserActive: false };

  it("copies an unadorned scene directly", () => {
    expect(needsCleanPicture(plain)).toBe(false);
  });

  it("redraws for every screen-only overlay", () => {
    for (const overlay of ["paused", "torchLit", "bootActive",
                           "focusActive", "laserActive"] as const)
      expect(needsCleanPicture({ ...plain, [overlay]: true })).toBe(true);
  });

  it("redraws while the laser toy is on, or the souvenir keeps it", () => {
    // Regression: the laser's render gate is screen-only, but unless
    // the laser also counts here, a photo taken with the toy on never
    // repaints and the dot lands in the saved picture.
    expect(needsCleanPicture({ ...plain, laserActive: true }))
      .toBe(true);
  });
});
