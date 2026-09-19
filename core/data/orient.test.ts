import { describe, expect, it } from "vitest";
import { SpriteSheet } from "./azpack.js";
import type { IndexedImage, SpriteSheetMeta } from "./azpack.js";
import { mirrorX, rotateCW, swimFrame } from "./orient.js";

const PAL = Array.from({ length: 256 }, () => [0, 0, 0] as [number, number, number]);
const W = 10, H = 20;

function img(w: number, h: number): IndexedImage {
  return { w, h, palette: PAL, idx: new Uint8Array(w * h) };
}

// A vertical head-down profile like real pack art: nose at the bottom
// tip, tail toward the top, dorsal fin along x=1, eye near the nose.
const BODY = 0x80, EYE = 8;
function fishImg(): IndexedImage {
  const im = img(W, H);
  for (let y = 4; y <= 15; y++)
    for (let x = 2; x <= 7; x++) im.idx[y * W + x] = BODY;
  for (let y = 6; y <= 13; y++) im.idx[y * W + 1] = BODY; // dorsal at x0
  for (const y of [16, 17]) for (const x of [4, 5]) im.idx[y * W + x] = BODY;
  for (const y of [13, 14]) for (const x of [4, 5]) im.idx[y * W + x] = EYE;
  return im;
}

function makeSheet(): SpriteSheet {
  const g0 = fishImg();
  const meta: SpriteSheetMeta = {
    image: "t.png", groups: 8, framesPerGroup: 3, cellW: W, cellH: H,
    dims: Array.from({ length: 24 }, (_, i) => [(i / 3) | 0, i % 3, W, H]),
  };
  const sheet = img(W * 3, H * 8); // 3 frame columns x 8 group rows
  for (let g = 0; g < 8; g++)
    for (let f = 0; f < 3; f++)
      for (let y = 0; y < H; y++)
        sheet.idx.set(
          g0.idx.subarray(y * W, y * W + W), (g * H + y) * sheet.w + f * W);
  return new SpriteSheet(meta, sheet);
}

function eyeXs(im: IndexedImage): number {
  let sum = 0, n = 0;
  for (let y = 0; y < im.h; y++)
    for (let x = 0; x < im.w; x++)
      if (im.idx[y * im.w + x] === EYE) { sum += x; n++; }
  return sum / n;
}

describe("orient", () => {
  it("rotateCW transposes a vertical profile to horizontal", () => {
    const r = rotateCW(fishImg());
    expect([r.w, r.h]).toEqual([H, W]);
    // head-down + dorsal-at-x0 -> left-facing, dorsal up.
    expect(r.idx[1 * r.w + 0]).toBe(0);
    expect(r.idx[1 * r.w + 6]).toBe(BODY);
    expect(eyeXs(r)).toBeLessThan(r.w / 2);
  });

  it("mirrorX flips columns", () => {
    const m = mirrorX(fishImg());
    expect(m.idx[6 * W + (W - 2)]).toBe(BODY); // dorsal x=1 -> x=8
    expect(m.idx[6 * W + 1]).toBe(0);
  });

  it("swimFrame yields a right-facing dorsal-up fish for facing=1", () => {
    const r = swimFrame(makeSheet(), 0, 1);
    expect([r.w, r.h]).toEqual([H, W]);
    expect(eyeXs(r)).toBeGreaterThan(r.w / 2);
    // dorsal stays on top after the mirror
    expect(r.idx[1 * r.w + 13]).toBe(BODY);
  });

  it("swimFrame faces left for facing=-1", () => {
    const r = swimFrame(makeSheet(), 0, -1);
    expect(eyeXs(r)).toBeLessThan(r.w / 2);
    expect(r.idx[1 * r.w + 6]).toBe(BODY); // dorsal up, unmirrored
  });
});
