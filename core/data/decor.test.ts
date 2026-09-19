import { describe, expect, it } from "vitest";
import { cornerKey, keyMask, pickDecorArt } from "./decor.js";
import type { IndexedImage } from "./azpack.js";

const PAL: [number, number, number][] = Array.from({ length: 256 },
  (_, i) => [i, i, i]);

/** w×h image filled with `bg`, `art` pixels in a centered rect. */
function framed(w: number, h: number, bg: number, art: number,
                pocket = false): IndexedImage {
  const idx = new Uint8Array(w * h).fill(bg);
  for (let y = 2; y < h - 2; y++)
    for (let x = 2; x < w - 2; x++) idx[y * w + x] = art;
  if (pocket) // enclosed region of key-colored pixels inside the art
    for (let y = 4; y < 7; y++)
      for (let x = 4; x < 7; x++) idx[y * w + x] = bg;
  return { w, h, palette: PAL, idx };
}

/** Thumbnail-style image: different index at each corner. */
function thumbnail(s = 83): IndexedImage {
  const idx = new Uint8Array(s * s).fill(42);
  idx[0] = 174; idx[s - 1] = 140; idx[(s - 1) * s] = 100;
  idx[s * s - 1] = 100;
  return { w: s, h: s, palette: PAL, idx };
}

describe("cornerKey", () => {
  it("returns the shared corner index for art frames", () => {
    expect(cornerKey(framed(20, 10, 255, 7))).toBe(255);
    expect(cornerKey(framed(20, 10, 0, 7))).toBe(0);
  });
  it("returns null for textured corners", () => {
    expect(cornerKey(thumbnail())).toBeNull();
  });
});

describe("pickDecorArt", () => {
  it("skips the catalog thumbnail and picks the largest frame", () => {
    const thumb = thumbnail();                    // 83×83, non-uniform
    const small = framed(40, 40, 255, 3);
    const big = framed(139, 212, 255, 3);
    const pick = pickDecorArt([thumb, small, big]);
    expect(pick).toEqual({ img: big, key: 255 });
  });
  it("falls back to the largest image with key 0", () => {
    const only = thumbnail(50);
    expect(pickDecorArt([only])).toEqual({ img: only, key: 0 });
  });
  it("returns null for an empty pack", () => {
    expect(pickDecorArt([])).toBeNull();
  });
});

describe("keyMask", () => {
  it("clears edge-connected key pixels, keeps enclosed ones", () => {
    const art = framed(12, 12, 255, 3, /*pocket*/ true);
    const m = keyMask(art, 255);
    expect(m[0]).toBe(0);                    // corner: transparent
    expect(m[3 * 12 + 3]).toBe(1);           // art: opaque
    expect(m[5 * 12 + 5]).toBe(1);           // enclosed pocket: opaque
    expect(m[11 * 12 + 5]).toBe(0);          // bottom edge: transparent
  });
  it("clears a uniform image entirely", () => {
    const m = keyMask(framed(6, 6, 0, 0), 0);
    expect([...m].every((v) => v === 0)).toBe(true);
  });
});
