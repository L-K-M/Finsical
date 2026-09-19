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

/** Sparse line art: thin `art` outline enclosing key-colored interior. */
function outlined(w: number, h: number, bg: number,
                  art: number): IndexedImage {
  const idx = new Uint8Array(w * h).fill(bg);
  for (let x = 2; x < w - 2; x++) {
    idx[2 * w + x] = art; idx[(h - 3) * w + x] = art;
  }
  for (let y = 2; y < h - 2; y++) {
    idx[y * w + 2] = art; idx[y * w + w - 3] = art;
  }
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
    const big = framed(64, 64, 255, 3);           // < thumb's 6889 px
    const pick = pickDecorArt([thumb, small, big]);
    expect(pick).toEqual({ img: big, key: 255 });
  });
  it("falls back to the largest image with key 0, flagged guessed", () => {
    const only = thumbnail(50);
    expect(pickDecorArt([only]))
      .toEqual({ img: only, key: 0, guessed: true });
  });
  it("treats zero-area images as keyless", () => {
    const empty = { w: 0, h: 0, palette: PAL, idx: new Uint8Array(0) };
    expect(cornerKey(empty)).toBeNull();
    expect(pickDecorArt([empty]))
      .toEqual({ img: empty, key: 0, guessed: true });
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
  it("clears enclosed key pixels when they dominate the art", () => {
    // Sparse line art (Silver Reed-style): the strokes enclose more
    // key-colored space than they occupy, so the key is background.
    const art = outlined(12, 12, 0, 3);
    const m = keyMask(art, 0);
    expect(m[0]).toBe(0);                    // corner: transparent
    expect(m[2 * 12 + 4]).toBe(1);           // outline stroke: opaque
    expect(m[5 * 12 + 5]).toBe(0);           // enclosed key: transparent
  });
  it("keeps enclosed key pixels when art dominates", () => {
    // Dense subject (Pinna/Robobot-style): the enclosed key region is
    // real content (white plumage/body), not leaked background.
    const art = framed(12, 12, 255, 3, /*pocket*/ true);
    const m = keyMask(art, 255);
    expect(m[5 * 12 + 5]).toBe(1);           // enclosed pocket: opaque
  });
  it("keeps enclosed key just below the threshold", () => {
    // 2px-thick ring: 48 art + 16 enclosed key → 16*2 < 64, no clear.
    const idx = new Uint8Array(12 * 12).fill(0);
    for (let y = 2; y <= 9; y++) for (let x = 2; x <= 9; x++)
      if (x < 4 || x > 7 || y < 4 || y > 7) idx[y * 12 + x] = 3;
    const m = keyMask({ w: 12, h: 12, palette: PAL, idx }, 0);
    expect(m[5 * 12 + 5]).toBe(1);           // enclosed key: opaque
  });
  it("clears on an exact tie (enclosed key == art pixels)", () => {
    // 6-wide × 8-tall ring: 24 art vs 24 enclosed key → `>=` clears.
    const idx = new Uint8Array(12 * 12).fill(0);
    for (let x = 3; x <= 8; x++) { idx[2 * 12 + x] = 3; idx[9 * 12 + x] = 3; }
    for (let y = 2; y <= 9; y++) { idx[y * 12 + 3] = 3; idx[y * 12 + 8] = 3; }
    const m = keyMask({ w: 12, h: 12, palette: PAL, idx }, 0);
    expect(m[5 * 12 + 5]).toBe(0);           // tie → treated as background
  });
  it("clears a uniform image entirely", () => {
    const m = keyMask(framed(6, 6, 0, 0), 0);
    expect([...m].every((v) => v === 0)).toBe(true);
  });
});
