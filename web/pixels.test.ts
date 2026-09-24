import { describe, expect, it } from "vitest";
import { indexedPixels } from "./render.js";
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
});
