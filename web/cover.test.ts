import { describe, expect, it } from "vitest";
import { coverCrop } from "./render.js";

describe("coverCrop", () => {
  it("keeps the full source when aspects match", () => {
    expect(coverCrop(640, 400, 320, 200))
      .toEqual({ sx: 0, sy: 0, sw: 640, sh: 400 });
  });

  it("center-crops a wider source", () => {
    expect(coverCrop(640, 200, 320, 200))
      .toEqual({ sx: 160, sy: 0, sw: 320, sh: 200 });
  });

  it("center-crops a taller source", () => {
    expect(coverCrop(200, 400, 320, 200))
      .toEqual({ sx: 0, sy: 137.5, sw: 200, sh: 125 });
  });

  it("covers a square source", () => {
    expect(coverCrop(100, 100, 320, 200))
      .toEqual({ sx: 0, sy: 18.75, sw: 100, sh: 62.5 });
  });
});
