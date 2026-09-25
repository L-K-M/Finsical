import { describe, expect, it } from "vitest";
import { indexedPixels, isBackdropImage, isGravelImage }
  from "./render.js";
import type { IndexedImage } from "../core/data/azpack.js";

const img = (idx: number[],
             palette: [number, number, number][]): IndexedImage =>
  ({ w: idx.length, h: 1, palette, idx: new Uint8Array(idx) });

describe("indexedPixels", () => {
  it("maps palette indices to RGBA, keying index 0 transparent", () => {
    const px = indexedPixels(
      img([0, 1, 2], [[9, 9, 9], [10, 20, 30], [200, 100, 50]]), false);
    expect([...px]).toEqual([0, 0, 0, 0, 10, 20, 30, 255,
                             200, 100, 50, 255]);
  });

  it("keeps index 0 opaque when asked", () => {
    const px = indexedPixels(img([0, 1], [[9, 9, 9], [10, 20, 30]]), true);
    expect([...px]).toEqual([9, 9, 9, 255, 10, 20, 30, 255]);
  });

  it("renders a palette miss opaque black, the legacy default", () => {
    // Index past the palette's end: the old per-pixel `?? [0,0,0]`
    // fallback still applied the non-zero-index alpha.
    const px = indexedPixels(img([5], [[1, 2, 3]]), false);
    expect([...px]).toEqual([0, 0, 0, 255]);
  });

  it("drops idx bytes beyond w*h instead of overrunning", () => {
    // A corrupt pack's over-long idx used to be truncated by the
    // per-pixel loop; a bare set() into ImageData would throw.
    const over = { w: 1, h: 1, palette: [[1, 2, 3]],
                   idx: new Uint8Array([0, 0, 0]) } as IndexedImage;
    expect(indexedPixels(over, true)).toHaveLength(4);
    const under = { w: 2, h: 1, palette: [[1, 2, 3]],
                    idx: new Uint8Array([0]) } as IndexedImage;
    expect(indexedPixels(under, true)).toHaveLength(4);
  });
});

describe("isGravelImage", () => {
  it("accepts a ~6:1 strip at half tank width", () => {
    expect(isGravelImage({ w: 192, h: 32 }, 320)).toBe(true);
  });
  it("rejects a 3:1 panoramic below the real ~6:1 gravel ratio", () => {
    expect(isGravelImage({ w: 300, h: 100 }, 320)).toBe(false);
  });
  it("rejects narrow strips and near-square art", () => {
    expect(isGravelImage({ w: 150, h: 30 }, 320)).toBe(false); // < w/2
    expect(isGravelImage({ w: 200, h: 80 }, 320)).toBe(false); // 2.5:1
  });
});

describe("isBackdropImage", () => {
  const tank = { width: 320, height: 200 };
  it("accepts a half-tank-or-larger scene, gravel excluded", () => {
    expect(isBackdropImage({ w: 320, h: 200 }, tank)).toBe(true);
    expect(isBackdropImage({ w: 300, h: 100 }, tank)).toBe(true);
    expect(isBackdropImage({ w: 320, h: 50 }, tank)).toBe(false); // gravel
  });
  it("rejects icons and decor art under half a dimension", () => {
    expect(isBackdropImage({ w: 159, h: 200 }, tank)).toBe(false);
    expect(isBackdropImage({ w: 320, h: 99 }, tank)).toBe(false);
  });
});
