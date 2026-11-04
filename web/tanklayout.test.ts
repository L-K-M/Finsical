import { describe, expect, it } from "vitest";
import { LAYOUT_HEADROOM, placeItem, tankFit } from "./tanklayout.js";
import { TANK_SIZE } from "../core/tuning.js";

const TANK = TANK_SIZE;

describe("tankFit", () => {
  it("halves a 640 x 480 tank, cropping only top and bottom", () => {
    expect(tankFit({ width: 640, height: 480 }, TANK)).toEqual({ s: 0.5, sx: 0 });
  });

  it("matches the backdrop's crop for other tank sizes", () => {
    // The goldfish bowl: 560 px wide fills the 320 px glass.
    const bowl = tankFit({ width: 560, height: 480 }, TANK);
    expect(bowl.s).toBeCloseTo(320 / 560);
    expect(bowl.sx).toBeCloseTo(0);
    // A panorama wider than the glass's aspect loses its sides.
    const wide = tankFit({ width: 1920, height: 1035 }, TANK);
    expect(wide.s).toBeCloseTo(200 / 1035);
    expect(wide.sx).toBeCloseTo((1920 - 320 / wide.s) / 2);
  });

  it("maps nothing for a degenerate tank", () => {
    expect(tankFit({ width: 0, height: 480 }, TANK)).toEqual({ s: 0, sx: 0 });
  });
});

describe("placeItem", () => {
  const fit = tankFit({ width: 640, height: 480 }, TANK);

  it("centres a piece where the file draws it, at the backdrop's scale", () => {
    // eden's left GlossoBig: 157 x 44 at x = 47.
    expect(placeItem({ x: 47, w: 157, h: 44 }, fit, TANK))
      .toEqual({ cx: (47 + 157 / 2) / 2, w: 79, h: 22 });
  });

  it("follows a cropped panorama's left edge", () => {
    const wide = tankFit({ width: 1920, height: 1035 }, TANK);
    const p = placeItem({ x: wide.sx, w: 0, h: 10 }, wide, TANK);
    expect(p.cx).toBeCloseTo(0);
  });

  it("shrinks a piece too tall for the tank to fit under the headroom", () => {
    // The goldfish bowl's own glass: 560 x 412 at the bowl's scale is
    // 235 px tall, taller than the 200 px tank.
    const bowl = tankFit({ width: 560, height: 480 }, TANK);
    const p = placeItem({ x: 0, w: 560, h: 412 }, bowl, TANK);
    expect(p.h).toBe(TANK.height - LAYOUT_HEADROOM);
    expect(p.w).toBe(Math.round(560 * (TANK.height - LAYOUT_HEADROOM) / 412));
    expect(p.cx).toBeCloseTo(160);
  });

  it("never sizes a piece below one pixel", () => {
    expect(placeItem({ x: 0, w: 1, h: 1 }, fit, TANK))
      .toMatchObject({ w: 1, h: 1 });
  });
});
