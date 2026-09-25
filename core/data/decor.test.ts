import { describe, expect, it } from "vitest";
import { borderKey, cornerKey, DECOR_TICKS_PER_FRAME, decorFrame,
         decorPhase, hasDecorFrames, keyToZero, MAX_DECOR_FRAMES,
         pickDecorArt, pickDecorFrames } from "./decor.js";
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

/** Thumbnail-style image: textured edge, different index at each
 * corner. */
function thumbnail(s = 83): IndexedImage {
  const idx = new Uint8Array(s * s);
  for (let i = 0; i < idx.length; i++) idx[i] = 1 + (i * 37) % 200;
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

describe("borderKey", () => {
  it("reads the key off the border when art covers the corners", () => {
    // Sea Monster2-style: the art's feet touch both bottom corners.
    const art = framed(30, 20, 255, 7);
    for (let x = 0; x < 30; x++) art.idx[19 * 30 + x] = 7;
    expect(cornerKey(art)).toBeNull();
    expect(borderKey(art)).toBe(255);
  });
  it("prefers 0, then 255, on a tie", () => {
    const img = framed(4, 4, 0, 0);            // 12 border pixels
    for (let i = 0; i < 16; i++) img.idx[i] = i < 8 ? 255 : 0;
    expect(borderKey(img)).toBe(0);
    img.idx.fill(9, 8);                        // 255 vs 9, 6 each
    expect(borderKey(img)).toBe(255);
  });
  it("returns null for a textured border", () => {
    expect(borderKey(thumbnail())).toBeNull();
  });
});

describe("pickDecorFrames", () => {
  it("returns the animation group, not the top view or thumbnail", () => {
    // AZ_SUB: catalog tile, a larger overhead layout view, then the
    // side-view frames.
    const thumb = thumbnail();
    const top = framed(120, 120, 0, 5);
    const frames = Array.from({ length: 10 },
                              (_, i) => framed(90, 40, 0, i + 1));
    const pick = pickDecorFrames([thumb, top, ...frames]);
    expect(pick).not.toBeNull();
    expect(pick!.key).toBe(0);
    expect(pick!.frames).toHaveLength(10);
    pick!.frames.forEach((f, i) => expect(f).toBe(frames[i]));
  });
  it("groups frames whose corners are covered by the art", () => {
    const frames = Array.from({ length: 3 }, () => framed(30, 20, 255, 7));
    for (let x = 0; x < 30; x++) frames[1]!.idx[19 * 30 + x] = 7;
    const pick = pickDecorFrames([framed(50, 50, 255, 3), ...frames]);
    expect(pick?.frames).toEqual(frames);
    expect(pick?.key).toBe(255);
  });
  it("picks the biggest group, larger frames on a tie", () => {
    const a = Array.from({ length: 3 }, () => framed(10, 10, 0, 1));
    const b = Array.from({ length: 3 }, () => framed(20, 10, 0, 1));
    const c = Array.from({ length: 4 }, () => framed(8, 8, 0, 1));
    expect(pickDecorFrames([...a, ...b])?.frames).toEqual(b);
    expect(pickDecorFrames([...a, ...b, ...c])?.frames).toEqual(c);
  });
  it("caps the animation at MAX_DECOR_FRAMES", () => {
    const frames = Array.from({ length: 40 }, () => framed(10, 10, 0, 1));
    expect(pickDecorFrames(frames)?.frames)
      .toEqual(frames.slice(0, MAX_DECOR_FRAMES));
  });
  it("falls back to the largest keyed image without a group of 3", () => {
    const small = framed(40, 40, 255, 3);
    const big = framed(64, 64, 255, 3);
    const pair = [framed(20, 20, 0, 1), framed(20, 20, 0, 1)];
    expect(pickDecorFrames([thumbnail(), small, big, ...pair]))
      .toEqual({ frames: [big], key: 255 });
  });
  it("keys single art whose bottom corners are opaque", () => {
    // Sea Monster2: the art must win over the smaller keyed tile.
    const tile = framed(30, 40, 0, 5);
    const art = framed(60, 90, 0, 7);
    for (let x = 0; x < 60; x++) art.idx[89 * 60 + x] = 7;
    expect(pickDecorFrames([tile, art]))
      .toEqual({ frames: [art], key: 0 });
  });
  it("falls back to key 0, flagged guessed, with no keyed image", () => {
    const only = thumbnail(50);
    expect(pickDecorFrames([only]))
      .toEqual({ frames: [only], key: 0, guessed: true });
    expect(pickDecorFrames([])).toBeNull();
  });
});

describe("keyToZero", () => {
  it("swaps the key with index 0 in the palette and the pixels", () => {
    const img = framed(6, 6, 255, 0);
    img.idx[1] = 3;
    const out = keyToZero(img, 255);
    expect(out.idx[0]).toBe(0);                // key moved to 0
    expect(out.idx[2 * 6 + 2]).toBe(255);      // old 0 moved to 255
    expect(out.idx[1]).toBe(3);
    expect(out.palette[0]).toEqual(PAL[255]);
    expect(out.palette[255]).toEqual(PAL[0]);
    expect(out.palette[3]).toEqual(PAL[3]);
    // Same colors everywhere, and the input is left untouched.
    for (let i = 0; i < 36; i++)
      expect(out.palette[out.idx[i]!]).toEqual(img.palette[img.idx[i]!]);
    expect(img.idx[0]).toBe(255);
    expect(img.palette[0]).toEqual([0, 0, 0]);
  });
  it("keys enclosed pockets too, not just the border", () => {
    // Line art encloses background that no flood fill reaches; every
    // key pixel must still end up transparent.
    const out = keyToZero(framed(12, 12, 255, 3, /*pocket*/ true), 255);
    expect(out.idx[5 * 12 + 5]).toBe(0);         // enclosed key
    expect(out.idx[3 * 12 + 3]).toBe(3);         // art stays opaque
  });
  it("returns key-0 art unchanged", () => {
    const img = framed(6, 6, 0, 3);
    expect(keyToZero(img, 0)).toBe(img);
  });
});

describe("decorFrame", () => {
  it("steps one frame every DECOR_TICKS_PER_FRAME ticks and wraps", () => {
    const t = DECOR_TICKS_PER_FRAME;
    expect(decorFrame(0, 10, 0)).toBe(0);
    expect(decorFrame(t - 1, 10, 0)).toBe(0);
    expect(decorFrame(t, 10, 0)).toBe(1);
    expect(decorFrame(10 * t, 10, 0)).toBe(0);
  });
  it("offsets by the item's phase", () => {
    expect(decorFrame(0, 10, 7)).toBe(7);
    expect(decorFrame(3 * DECOR_TICKS_PER_FRAME, 10, 7)).toBe(0);
  });
  it("holds a still item on its only frame", () => {
    expect(decorFrame(12345, 1, 0)).toBe(0);
  });
});

describe("decorPhase", () => {
  it("gives copies of one pack different, stable phases", () => {
    const url = "https://archive.org/download/x/Banana_M.plt";
    const ph = [0, 1, 2].map((c) => decorPhase(url, c, 10));
    expect(new Set(ph).size).toBe(3);
    ph.forEach((p) => expect(p >= 0 && p < 10).toBe(true));
    expect(decorPhase(url, 1, 10)).toBe(ph[1]);
    expect(decorPhase(url, 5, 1)).toBe(0);
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


describe("hasDecorFrames", () => {
  it("accepts a frame with art outside the key", () => {
    expect(hasDecorFrames([framed(40, 40, 255, 3)])).toBe(true);
  });
  it("rejects art that is nothing but its transparent key", () => {
    const blank = { w: 20, h: 20, palette: PAL,
                    idx: new Uint8Array(400).fill(255) };
    expect(hasDecorFrames([blank])).toBe(false);
  });
  it("rejects a zero-area pick and an empty pack", () => {
    const empty = { w: 0, h: 0, palette: PAL, idx: new Uint8Array(0) };
    expect(hasDecorFrames([empty])).toBe(false);
    expect(hasDecorFrames([])).toBe(false);
  });
  it("accepts a keyed animation when only one frame draws", () => {
    const art = framed(30, 30, 255, 7);
    const blank = { w: 30, h: 30, palette: PAL,
                    idx: new Uint8Array(900).fill(255) };
    const frames = Array.from({ length: 8 },
      (_, i) => i === 3 ? art : blank);
    expect(hasDecorFrames(frames)).toBe(true);
  });
});
