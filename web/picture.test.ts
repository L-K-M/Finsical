import { describe, expect, it } from "vitest";
import { needsCleanPicture } from "./picture.js";

describe("needsCleanPicture", () => {
  const plain = { paused: false, torchLit: false,
                  bootActive: false, focusActive: false };

  it("copies an unadorned scene directly", () => {
    expect(needsCleanPicture(plain)).toBe(false);
  });

  it("redraws for every screen-only overlay", () => {
    for (const overlay of ["paused", "torchLit", "bootActive",
                           "focusActive"] as const)
      expect(needsCleanPicture({ ...plain, [overlay]: true })).toBe(true);
  });
});
