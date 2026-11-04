import { describe, expect, it } from "vitest";
import { ART_SCALE, fishScale, resizeSprite, shrinkSprite } from "./artscale.js";
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

  it("keeps a dithered fin solid at any scale", () => {
    // AquaZone paints translucent fins as a 50% checkerboard. At half
    // size each 2 x 2 block is half covered and turns solid; at other
    // scales coverage swings around one half, and a half-coverage cutoff
    // aliased the fin into a coarse checkerboard of holes.
    const rows = Array.from({ length: 12 }, (_, y) =>
      Array.from({ length: 12 }, (_, x) => ((x + y) & 1 ? "1" : "0")).join(""));
    for (const s of [1 / 3, 0.29, 0.4, 0.5]) {
      const o = shrinkSprite(img(rows), s);
      for (let i = 3; i < o.data.length; i += 4) expect(o.data[i]).toBe(255);
    }
  });

  it("never shrinks below one pixel", () => {
    const o = shrinkSprite(img(["1"]), 0.1);
    expect([o.w, o.h]).toEqual([1, 1]);
    expect(px(o, 0, 0)).toEqual([200, 0, 0, 255]);
  });
});

describe("resizeSprite", () => {
  it("shrinks axes independently to the exact size", () => {
    // 4 x 2 into 2 x 2: only the width shrinks; each column keeps its
    // own half of every row.
    const o = resizeSprite(img(["1122", "2211"]), 2, 2);
    expect([o.w, o.h]).toEqual([2, 2]);
    expect(px(o, 0, 0)).toEqual([200, 0, 0, 255]);
    expect(px(o, 1, 0)).toEqual([0, 0, 100, 255]);
    expect(px(o, 0, 1)).toEqual([0, 0, 100, 255]);
    expect(px(o, 1, 1)).toEqual([200, 0, 0, 255]);
  });

  it("enlarges, filling each source pixel's block", () => {
    // 2 x 2 into 4 x 4: every source pixel owns a 2 x 2 block of
    // outputs, and the transparent key stays transparent.
    const o = resizeSprite(img(["10", "12"]), 4, 4);
    expect([o.w, o.h]).toEqual([4, 4]);
    expect(px(o, 0, 0)).toEqual([200, 0, 0, 255]);
    expect(px(o, 1, 1)).toEqual([200, 0, 0, 255]);
    expect(px(o, 2, 0)).toEqual([0, 0, 0, 0]);
    expect(px(o, 3, 1)).toEqual([0, 0, 0, 0]);
    expect(px(o, 0, 2)).toEqual([200, 0, 0, 255]);
    expect(px(o, 1, 3)).toEqual([200, 0, 0, 255]);
    expect(px(o, 2, 2)).toEqual([0, 0, 100, 255]);
    expect(px(o, 3, 3)).toEqual([0, 0, 100, 255]);
  });

  it("stretches one axis while shrinking the other", () => {
    // 2 x 2 into 4 x 1: the width doubles onto one row as the two
    // source rows collapse into it.
    const o = resizeSprite(img(["10", "12"]), 4, 1);
    expect([o.w, o.h]).toEqual([4, 1]);
    expect(px(o, 0, 0)).toEqual([200, 0, 0, 255]);
    expect(px(o, 1, 0)).toEqual([200, 0, 0, 255]);
    // The transparent top-right cell covers only half of these
    // outputs, so the blue underneath them passes the threshold.
    expect(px(o, 2, 0)).toEqual([0, 0, 100, 255]);
    expect(px(o, 3, 0)).toEqual([0, 0, 100, 255]);
  });

  it("clamps zero or negative sizes to one pixel", () => {
    const o = resizeSprite(img(["12"]), 0, -3);
    expect([o.w, o.h]).toEqual([1, 1]);
    expect(px(o, 0, 0)).toEqual([100, 0, 50, 255]);
  });

  it("matches shrinkSprite at the rounded size", () => {
    const art = img(["1102", "1012", "0221", "2001"]);
    for (const s of [0.1, 0.29, 0.5, 0.75, 1]) {
      const shrunk = shrinkSprite(art, s);
      expect([shrunk.w, shrunk.h])
        .toEqual([Math.max(1, Math.round(art.w * s)),
          Math.max(1, Math.round(art.h * s))]);
      expect(shrunk.data)
        .toEqual(resizeSprite(art, shrunk.w, shrunk.h).data);
    }
  });
});

describe("fishScale", () => {
  const TANK_W = 320, TANK_H = 200;
  /** Drawn height of a body at its scale, tank px. */
  const drawnH = (length: number, height: number) =>
    height * fishScale({ length, height }, TANK_W, TANK_H);

  it("draws small species at the art scale", () => {
    // neon.fsh (63 x 28) and redplaty.fsh (73 x 40) bodies.
    expect(fishScale({ length: 63, height: 28 }, TANK_W, TANK_H))
      .toBe(ART_SCALE);
    expect(fishScale({ length: 73, height: 40 }, TANK_W, TANK_H))
      .toBe(ART_SCALE);
  });

  it("keeps a discus or an angelfish to a quarter of the tank", () => {
    // At the art scale these stood 85 px, over two fifths of the tank.
    expect(drawnH(171, 171)).toBeLessThanOrEqual(TANK_H / 4); // discus
    expect(drawnH(126, 170)).toBeLessThanOrEqual(TANK_H / 4); // angel
    // A shark.fsh body (221 x 69) is judged by its length.
    expect(221 * fishScale({ length: 221, height: 69 }, TANK_W, TANK_H))
      .toBeLessThanOrEqual(TANK_W / 4);
  });

  it("keeps bigger species bigger, with no jump at the knee", () => {
    let prev = drawnH(16, 10);
    for (let h = 11; h <= 400; h++) {
      const d = drawnH(h * 1.6, h);
      expect(d).toBeGreaterThan(prev);
      expect(d - prev).toBeLessThanOrEqual(ART_SCALE + 1e-9);
      prev = d;
    }
  });
});
