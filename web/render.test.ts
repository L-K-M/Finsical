import { describe, expect, it } from "vitest";
import { ART_SCALE } from "./artscale.js";
import { decorScale } from "./render.js";

describe("decorScale", () => {
  it("draws small and large decor at one shared scale", () => {
    // Amazon_S (273 px tall) and GRASS_S (37 px) keep their 273:37
    // ratio in a 200-px tank: neither reaches the height clamp.
    const tall = 273 * decorScale(273, 200);
    const short = 37 * decorScale(37, 200);
    expect(tall / short).toBeCloseTo(273 / 37, 12);
    expect(decorScale(37, 200)).toBe(ART_SCALE);
  });
  it("clamps art taller than the tank to its height", () => {
    // Vallis_l: 464 px would stand 232 px at half size.
    expect(464 * decorScale(464, 200)).toBeCloseTo(192, 9);
  });
});
