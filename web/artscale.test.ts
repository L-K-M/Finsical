import { describe, expect, it } from "vitest";
import { shrinkSprite } from "./artscale.js";
import type { IndexedImage } from "../core/data/azpack.js";

const PAL: [number, number, number][] = [[0, 0, 0], [200, 0, 0], [0, 0, 100]];
function img(rows: string[]): IndexedImage {
  const w = rows[0]!.length;
  const idx = new Uint8Array(w * rows.length);
  rows.forEach((r, y) => { for (let x = 0; x < w; x++) idx[y * w + x] = +r[x]!; });
  return { w, h: rows.length, palette: PAL, idx };
}
const px = (o: { w: number; data: Uint8ClampedArray }, x: number, y: number) =>
  [...o.data.subarray((y * o.w + x) * 4, (y * o.w + x) * 4 + 4)];

describe("shrinkSprite", () => {
  it("averages each 2 x 2 block at half size", () => {
    const o = shrinkSprite(img(["1122", "1122"]), 0.5);
    expect([o.w, o.h]).toEqual([2, 1]);
    expect(px(o, 0, 0)).toEqual([200, 0, 0, 255]);
    expect(px(o, 1, 0)).toEqual([0, 0, 100, 255]);
    expect(px(shrinkSprite(img(["12", "21"]), 0.5), 0, 0))
      .toEqual([100, 0, 50, 255]);
  });

  it("keeps a pixel opaque from half coverage, in the opaque color", () => {
    // A 1-px outline against the transparent key survives as its own
    // color instead of fading toward black.
    expect(px(shrinkSprite(img(["10", "10"]), 0.5), 0, 0))
      .toEqual([200, 0, 0, 255]);
    expect(px(shrinkSprite(img(["10", "00"]), 0.5), 0, 0))
      .toEqual([0, 0, 0, 0]);
  });

  it("weights partial source pixels at non-integer scales", () => {
    // 3 px into 2: the middle source pixel splits across both outputs.
    const o = shrinkSprite(img(["122"]), 2 / 3);
    expect(o.w).toBe(2);
    expect(px(o, 0, 0)).toEqual([133, 0, 33, 255]);
    expect(px(o, 1, 0)).toEqual([0, 0, 100, 255]);
  });

  it("never shrinks below one pixel", () => {
    const o = shrinkSprite(img(["1"]), 0.1);
    expect([o.w, o.h]).toEqual([1, 1]);
    expect(px(o, 0, 0)).toEqual([200, 0, 0, 255]);
  });
});
