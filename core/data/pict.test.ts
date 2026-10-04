import { describe, expect, it } from "vitest";
import type { IndexedImage } from "./azpack.js";
import { ownBytes } from "./bytes.js";
import { decodePict, isPict, PictError } from "./pict.js";
import { buildPict, packBits, rect } from "./pict.fixture.js";
import type { Op, PictSpec } from "./pict.fixture.js";

const WHITE = 0xffffff;
const RED = 0xff0000, GREEN = 0x00ff00, BLUE = 0x0000ff, BLACK = 0x000000;
const CLUT: [number, number, number][] =
  [[255, 255, 255], [255, 0, 0], [0, 255, 0], [0, 0, 255]];
const CLUT_RGB = [WHITE, RED, GREEN, BLUE];

/** Each pixel's color as 0xRRGGBB. */
const colors = (img: IndexedImage): number[] =>
  [...img.idx].map((k) => {
    const [r, g, b] = img.palette[k]!;
    return r << 16 | g << 8 | b;
  });

/** One indexed op filling the whole frame. */
const indexed = (w: number, h: number, px: number[],
                 more: Partial<Extract<Op, { kind: "indexed" }>> = {}):
    PictSpec => ({
  frame: rect(0, 0, h, w),
  ops: [{ kind: "indexed", depth: 8, w, h, px, clut: CLUT, ...more }],
});

const decode = (spec: PictSpec): IndexedImage => decodePict(buildPict(spec));

const sha256 = async (d: Uint8Array): Promise<string> =>
  [...new Uint8Array(await crypto.subtle.digest("SHA-256", ownBytes(d)))]
    .map((b) => b.toString(16).padStart(2, "0")).join("");

/** Seeded generator for the fuzz tests: the same bytes every run. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    // An LCG's low bits repeat quickly; fold the high bits into them.
    return (s ^ s >>> 16) >>> 0;
  };
}

const be16 = (v: number) => [(v >> 8) & 0xff, v & 0xff];

describe("decodePict: indexed pixel maps", () => {
  it("decodes an 8-bit PackBitsRect through its color table", () => {
    const px = [0, 1, 2, 3, 1, 1, 1, 1, 1, 2, 3, 0, 0, 0, 0];
    const img = decode(indexed(5, 3, px));
    expect([img.w, img.h]).toEqual([5, 3]);
    expect(colors(img)).toEqual(px.map((v) => CLUT_RGB[v]));
  });

  it("reads word byte counts once rowBytes passes 250", () => {
    for (const w of [250, 251, 300]) {
      const px = Array.from({ length: w * 2 }, (_, i) =>
        i % 7 === 0 ? 3 : i < w ? 1 : (i >> 4) & 3);
      expect(colors(decode(indexed(w, 2, px)))).toEqual(
        px.map((v) => CLUT_RGB[v]));
    }
  });

  it("unpacks 1, 2 and 4-bit pixels across partial bytes", () => {
    for (const depth of [1, 2, 4] as const) {
      const n = 1 << depth;
      const clut = Array.from({ length: n }, (_, i): [number, number, number] =>
        [i * 16, 255 - i * 16, i & 1 ? 200 : 40]);
      const px = Array.from({ length: 7 * 3 }, (_, i) => (i * 5 + 1) % n);
      const img = decode({ frame: rect(0, 0, 3, 7), ops: [
        { kind: "indexed", depth, w: 7, h: 3, px, clut }] });
      expect(colors(img)).toEqual(
        px.map((v) => clut[v]![0] << 16 | clut[v]![1] << 8 | clut[v]![2]));
    }
  });

  it("reads rows under 8 bytes unpacked, and unpacked BitsRect", () => {
    const px = [1, 2, 3, 0, 1, 2, 3, 2, 1, 0, 3, 3];
    expect(colors(decode(indexed(6, 2, px)))).toEqual(
      px.map((v) => CLUT_RGB[v]));
    const wide = Array.from({ length: 40 }, (_, i) => i % 4);
    expect(colors(decode(indexed(20, 2, wide, { packed: false }))))
      .toEqual(wide.map((v) => CLUT_RGB[v]));
  });

  it("skips the padding at the end of each row", () => {
    const px = [1, 2, 3, 1, 2, 3, 1, 2, 3, 1, 2, 3];
    expect(colors(decode(indexed(4, 3, px, { rowBytes: 12 }))))
      .toEqual(px.map((v) => CLUT_RGB[v]));
  });

  it("maps pixels by the values in a color table", () => {
    // Entry i carries value 3 - i: pixel 0 is the last entry's color.
    const px = [0, 1, 2, 3];
    const img = decode(indexed(4, 1, px, { values: [3, 2, 1, 0] }));
    expect(colors(img)).toEqual([BLUE, GREEN, RED, WHITE]);
  });

  it("indexes a device color table by position", () => {
    // Star sand's tables: ctFlags bit 15 set, every value 0.
    const px = [3, 2, 1, 0];
    const img = decode(indexed(4, 1, px, { device: true }));
    expect(colors(img)).toEqual([BLUE, GREEN, RED, WHITE]);
  });

  it("draws pixels the table lacks in black", () => {
    const img = decode(indexed(3, 1, [0, 1, 200], { clut: CLUT.slice(0, 2) }));
    expect(colors(img)).toEqual([WHITE, RED, BLACK]);
  });

  it("decodes runs and literals alike", () => {
    const px = [...new Array(130).fill(2), 0, 1, 2, 3, ...new Array(9).fill(1)];
    for (const encode of ["auto", "literal"] as const)
      expect(colors(decode(indexed(px.length, 1, px, { encode }))))
        .toEqual(px.map((v) => CLUT_RGB[v]));
  });
});

describe("decodePict: bitmaps and versions", () => {
  it("decodes a version 1 BitMap, 1 as black and 0 as white", () => {
    const px = [1, 0, 0, 1, 1, 1, 0, 1, 0, 1, 0, 0, 1, 1];
    for (const packed of [true, false]) {
      const img = decode({ version: 1, frame: rect(0, 0, 2, 7),
                           ops: [{ kind: "mono", packed, w: 7, h: 2, px }] });
      expect(colors(img)).toEqual(px.map((v) => v ? BLACK : WHITE));
    }
  });

  it("decodes a version 2 BitMap of 16-bit-wide rows", () => {
    const px = Array.from({ length: 70 * 3 }, (_, i) => (i * 7) % 3 === 0 ? 1 : 0);
    const img = decode({ frame: rect(0, 0, 3, 70),
                         ops: [{ kind: "mono", w: 70, h: 3, px }] });
    expect(colors(img)).toEqual(px.map((v) => v ? BLACK : WHITE));
  });

  it("skips a data-fork file's 512-byte header", () => {
    const spec = indexed(4, 2, [0, 1, 2, 3, 3, 2, 1, 0]);
    const file = buildPict({ ...spec, file: true });
    file.fill(0x41, 0, 512); // application data, not zeros
    expect(decodePict(file)).toEqual(decode(spec));
  });

  it("skips 1-byte opcodes in version 1 without alignment", () => {
    const img = decode({ version: 1, frame: rect(0, 0, 1, 8), ops: [
      { kind: "raw", bytes: [0x03, 0, 3] },            // TxFont
      { kind: "raw", bytes: [0xa1, 0, 100, 0, 3, 1, 2, 3] }, // LongComment
      { kind: "raw", bytes: [0x29, 5, 3, 0x61, 0x62, 0x63] }, // DHText
      { kind: "mono", w: 8, h: 1, px: [1, 0, 1, 0, 1, 0, 1, 1] },
    ] });
    expect(colors(img)).toEqual(
      [BLACK, WHITE, BLACK, WHITE, BLACK, WHITE, BLACK, BLACK]);
  });
});

describe("decodePict: direct pixel maps", () => {
  const px = [RED, GREEN, BLUE, 0x123456, WHITE, BLACK, 0x808080, 0xabcdef,
              RED, RED, RED, RED, 0x010203, 0xfefefe, 0x00ffff, 0xff00ff];

  it("decodes 32-bit pixels for every packType", () => {
    for (const packType of [0, 1, 2, 4] as const)
      for (const cmpCount of [3, 4] as const) {
        const img = decode({ frame: rect(0, 0, 2, 8), ops: [
          { kind: "direct", depth: 32, packType, cmpCount, w: 8, h: 2, px }] });
        expect(colors(img)).toEqual(px);
      }
  });

  it("reads three quarters of rowBytes a row for packType 2", () => {
    // Padded rows: 3 pixels in 16 rowBytes leave 12 stored bytes a row.
    const img = decode({ frame: rect(0, 0, 2, 3), ops: [
      { kind: "direct", depth: 32, packType: 2, w: 3, h: 2, rowBytes: 16,
        px: [RED, GREEN, BLUE, 0x123456, WHITE, BLACK] }] });
    expect(colors(img)).toEqual([RED, GREEN, BLUE, 0x123456, WHITE, BLACK]);
  });

  it("decodes 16-bit pixels, widening 5 bits to 8", () => {
    const five = (c: number) => {
      const w = (v: number) => (v << 3) | (v >> 2);
      return w(c >> 19 & 31) << 16 | w(c >> 11 & 31) << 8 | w(c >> 3 & 31);
    };
    for (const packType of [0, 1, 3] as const) {
      const img = decode({ frame: rect(0, 0, 2, 8), ops: [
        { kind: "direct", depth: 16, packType, w: 8, h: 2, px }] });
      expect(colors(img)).toEqual(px.map(five));
    }
    expect(five(0x808080)).toBe(0x848484);
    expect(five(WHITE)).toBe(WHITE);
  });

  it("reads rows under 8 bytes unpacked", () => {
    const img = decode({ frame: rect(0, 0, 3, 1), ops: [
      { kind: "direct", depth: 32, packType: 4, w: 1, h: 3,
        px: [RED, GREEN, BLUE] }] });
    expect(colors(img)).toEqual([RED, GREEN, BLUE]);
  });

  it("keeps up to 255 colors besides white exactly", () => {
    const many = Array.from({ length: 256 }, (_, i) =>
      i === 0 ? WHITE : (i * 0x10101 + 0x3000) & 0xffffff);
    expect(new Set(many).size).toBe(256);
    const img = decode({ frame: rect(0, 0, 16, 16), ops: [
      { kind: "direct", depth: 32, packType: 4, w: 16, h: 16, px: many }] });
    expect(img.palette.length).toBe(256);
    expect(colors(img)).toEqual(many);
  });

  it("reduces more colors to 256 by median cut, deterministically",
     async () => {
    const w = 64, h = 32;
    const px = Array.from({ length: w * h }, (_, i) => {
      const x = i % w, y = (i / w) | 0;
      return i % 97 === 0 ? WHITE : (x * 4) << 16 | (y * 8) << 8 | (x + y) * 2;
    });
    const img = decode({ frame: rect(0, 0, h, w), ops: [
      { kind: "direct", depth: 32, packType: 4, w, h, px }] });
    expect(img.palette.length).toBeLessThanOrEqual(256);
    expect(img.palette[0]).toEqual([255, 255, 255]);
    const out = colors(img);
    let err = 0;
    px.forEach((c, i) => {
      if (c === WHITE) expect(img.idx[i]).toBe(0);
      else expect(img.idx[i]).not.toBe(0);
      const d = out[i]!;
      err += Math.abs((c >> 16) - (d >> 16)) +
        Math.abs((c >> 8 & 255) - (d >> 8 & 255)) +
        Math.abs((c & 255) - (d & 255));
    });
    expect(err / px.length).toBeLessThan(12);
    const pal = Uint8Array.from(img.palette.flat());
    const both = new Uint8Array(pal.length + img.idx.length);
    both.set(pal); both.set(img.idx, pal.length);
    expect(await sha256(both)).toBe(PINNED_MEDIAN_CUT);
  });

  it("keeps close colors apart when there are just over 255", () => {
    // Nebula's strip: 294 dark colors that 5-bit bins would fold into
    // a few dozen. Splitting the exact colors merges only the closest.
    const px = Array.from({ length: 300 }, (_, i) =>
      (i % 10) << 16 | ((i / 10) | 0) << 8 | 2);
    const img = decode({ frame: rect(0, 0, 20, 15), ops: [
      { kind: "direct", depth: 32, packType: 4, w: 15, h: 20, px }] });
    expect(img.palette.length).toBe(256);
    const out = colors(img);
    const off = px.filter((c, i) => c !== out[i]).length;
    expect(off).toBeLessThanOrEqual(2 * 45);
  });

  it("bins a photo's colors before cutting them", () => {
    const w = 257, h = 256;
    const px = Array.from({ length: w * h }, (_, i) =>
      i === 5 ? WHITE : (i * 2654435761 >>> 8) & 0xfffffe);
    const img = decode({ frame: rect(0, 0, h, w), ops: [
      { kind: "direct", depth: 32, packType: 1, w, h, px }] });
    expect(img.palette.length).toBe(256);
    expect(img.idx[5]).toBe(0);
    expect([...img.idx].filter((k) => k === 0)).toHaveLength(1);
  });
});

// Pins decodePict's median cut, so that changing it is deliberate.
const PINNED_MEDIAN_CUT =
  "dc328fe62aa7332c692642d95b28810bd88e10acedb78722fdedbc48a6c48b0a";

describe("decodePict: palette order", () => {
  it("puts white at index 0 and nothing else there", () => {
    // A table with black first and white last, as some Windows-made
    // pictures order theirs.
    const clut: [number, number, number][] =
      [[0, 0, 0], [255, 0, 0], [0, 0, 255], [255, 255, 255]];
    const px = [0, 3, 1, 3, 2, 0];
    const img = decode(indexed(6, 1, px, { clut }));
    expect(img.palette[0]).toEqual([255, 255, 255]);
    expect(colors(img)).toEqual([BLACK, WHITE, RED, WHITE, BLUE, BLACK]);
    expect([...img.idx].map((k) => k === 0)).toEqual(
      [false, true, false, true, false, false]);
  });

  it("keeps index 0 for white even when the picture has none", () => {
    const img = decode(indexed(3, 1, [1, 2, 3]));
    expect(img.palette[0]).toEqual([255, 255, 255]);
    expect([...img.idx]).not.toContain(0);
  });
});

describe("decodePict: placement", () => {
  const two = { kind: "indexed" as const, depth: 8 as const, w: 2, h: 2,
                px: [1, 2, 3, 0], clut: CLUT };

  it("scales srcRect to dstRect nearest-neighbor", () => {
    const up = decode({ frame: rect(0, 0, 4, 4),
                        ops: [{ ...two, dst: rect(0, 0, 4, 4) }] });
    expect(colors(up)).toEqual([
      RED, RED, GREEN, GREEN, RED, RED, GREEN, GREEN,
      BLUE, BLUE, WHITE, WHITE, BLUE, BLUE, WHITE, WHITE]);
    const four = { kind: "indexed" as const, depth: 8 as const, w: 4, h: 4,
                   px: [1, 0, 2, 0, 0, 0, 0, 0, 3, 0, 1, 0, 0, 0, 0, 0],
                   clut: CLUT };
    const down = decode({ frame: rect(0, 0, 2, 2),
                          ops: [{ ...four, dst: rect(0, 0, 2, 2) }] });
    expect(colors(down)).toEqual([RED, GREEN, BLUE, RED]);
  });

  it("copies only srcRect", () => {
    const img = decode({ frame: rect(0, 0, 1, 1),
                         ops: [{ ...two, src: rect(1, 0, 2, 1),
                                 dst: rect(0, 0, 1, 1) }] });
    expect(colors(img)).toEqual([BLUE]);
  });

  it("draws at dstRect, clipped to the frame, on white", () => {
    const img = decode({ frame: rect(0, 0, 3, 3),
                         ops: [{ ...two, dst: rect(2, 2, 4, 4) }] });
    expect(colors(img)).toEqual([WHITE, WHITE, WHITE, WHITE, WHITE, WHITE,
                                 WHITE, WHITE, RED]);
  });

  it("reads coordinates relative to a frame away from 0,0", () => {
    const img = decode({ frame: rect(10, 20, 12, 22), ops: [
      { ...two, bounds: rect(10, 20, 12, 22) }] });
    expect(colors(img)).toEqual([RED, GREEN, BLUE, WHITE]);
  });

  it("composites bands with their own color tables", () => {
    const img = decode({ frame: rect(0, 0, 2, 2), ops: [
      { kind: "indexed", depth: 8, w: 2, h: 1, px: [1, 2], clut: CLUT },
      { kind: "indexed", depth: 8, w: 2, h: 1, px: [0, 1],
        clut: [[0, 0, 0], [9, 9, 9]], bounds: rect(1, 0, 2, 2) },
    ] });
    expect(colors(img)).toEqual([RED, GREEN, BLACK, 0x090909]);
  });

  it("masks the Rgn forms by a rectangular region", () => {
    const img = decode({ frame: rect(0, 0, 2, 2),
                         ops: [{ ...two, rgn: { box: rect(0, 1, 2, 2) } }] });
    expect(colors(img)).toEqual([WHITE, GREEN, WHITE, WHITE]);
  });

  it("masks by an inversion-point region", () => {
    // A 4x4 picture masked to a 2x2 square at (1,1) plus row 3's
    // first pixel: rows toggle the spans [1,3) on at y=1 and off at
    // y=3, and [0,1) on at y=3.
    const px = new Array<number>(16).fill(1);
    const rgn = { box: rect(1, 0, 4, 3), rows: [
      { y: 1, xs: [1, 3] }, { y: 3, xs: [0, 3] }, { y: 4, xs: [0, 1] }] };
    for (const op of [
      { kind: "indexed" as const, depth: 8 as const, w: 4, h: 4, px,
        clut: CLUT, rgn },
      { kind: "indexed" as const, depth: 8 as const, w: 4, h: 4, px,
        clut: CLUT, rgn, packed: false },
      { kind: "direct" as const, depth: 32 as const, packType: 4 as const,
        w: 4, h: 4, px: px.map(() => RED), rgn },
    ]) {
      const img = decode({ frame: rect(0, 0, 4, 4), ops: [op] });
      expect(colors(img)).toEqual([
        WHITE, WHITE, WHITE, WHITE,
        WHITE, RED, RED, WHITE,
        WHITE, RED, RED, WHITE,
        RED, WHITE, WHITE, WHITE]);
    }
  });
});

describe("decodePict: the clip region", () => {
  const four = { kind: "indexed" as const, depth: 8 as const, w: 2, h: 2,
                 px: [1, 2, 3, 1], clut: CLUT };

  it("draws bitmaps only inside it", () => {
    const img = decode({ frame: rect(0, 0, 2, 2), ops: [
      { kind: "raw", bytes: [0x00, 0x01, ...be16(10), 0, 0, 0, 0, 0, 1, 0, 1] },
      four] });
    expect(colors(img)).toEqual([RED, WHITE, WHITE, WHITE]);
  });

  /** A Clip opcode for a region: its box, then inversion points. */
  const clip = (box: number[], rows: [number, number[]][] = []) => {
    const body = rows.flatMap(([y, xs]) =>
      [...be16(y), ...xs.flatMap(be16), ...be16(0x7fff)]);
    if (rows.length) body.push(...be16(0x7fff));
    return { kind: "raw" as const,
             bytes: [0x00, 0x01, ...be16(10 + body.length),
                     ...box.flatMap(be16), ...body] };
  };

  it("follows an inversion-point clip, and a later clip replaces it", () => {
    // The diagonal: row 0 inside [0,1), row 1 inside [1,2).
    const diagonal = clip([0, 0, 2, 2], [[0, [0, 1]], [1, [0, 2]], [2, [1, 2]]]);
    expect(colors(decode({ frame: rect(0, 0, 2, 2), ops: [diagonal, four] })))
      .toEqual([RED, WHITE, WHITE, RED]);
    expect(colors(decode({ frame: rect(0, 0, 2, 2), ops: [
      clip([0, 0, 1, 1]), clip([0, 0, 2, 2]), four] })))
      .toEqual([RED, GREEN, BLUE, RED]);
  });
});

describe("decodePict: opcodes around the bitmap", () => {
  it("skips every kind of opcode by its documented length", () => {
    const longComment = [0x00, 0xa1, 0x01, 0xf2, ...be16(5), 1, 2, 3, 4, 5];
    const pixPat = (patType: number) => {
      const out = [0x00, 0x12, ...be16(patType), 0, 1, 2, 3, 4, 5, 6, 7];
      if (patType === 2) return [...out, 1, 2, 3, 4, 5, 6];
      // A 2x2 8-bit pattern: PixMap without baseAddr, color table,
      // then rows under 8 bytes, unpacked.
      return [...out, ...be16(0x8002), 0, 0, 0, 0, 0, 2, 0, 2,
              ...new Array(36).fill(0), 0, 0, 0, 0, ...be16(0), ...be16(1),
              ...new Array(16).fill(0), 1, 0, 0, 1];
    };
    const ops: Op[] = [
      { kind: "raw", bytes: [0x00, 0x1e] },                    // DefHilite
      { kind: "raw", bytes: [0x00, 0x01, ...be16(10), 0, 0, 0, 0, 0, 2, 0, 2] },
      { kind: "raw", bytes: longComment },                     // odd length
      { kind: "raw", bytes: [0x00, 0xa0, 0, 1] },              // ShortComment
      { kind: "raw", bytes: [0x00, 0x1a, 1, 2, 3, 4, 5, 6] },  // RGBFgCol
      { kind: "raw", bytes: [0x00, 0x28, 0, 0, 0, 0, 3, 0x41, 0x42, 0x43] },
      { kind: "raw", bytes: [0x00, 0x2b, 1, 1, 2, 0x41, 0x42] }, // DHDVText
      { kind: "raw", bytes: [0x00, 0x2c, ...be16(5), 0, 1, 2, 0x41, 0x42] },
      { kind: "raw", bytes: [0x00, 0x24, ...be16(3), 9, 9, 9] }, // reserved
      { kind: "raw", bytes: pixPat(1) },
      { kind: "raw", bytes: pixPat(2) },
      { kind: "raw", bytes: pixPat(0) }, // not ditherPat: a pixel map
      { kind: "raw", bytes: [0x00, 0x30, 0, 0, 0, 0, 0, 1, 0, 1] }, // frameRect
      { kind: "raw", bytes: [0x00, 0x38] },                    // frameSameRect
      { kind: "raw", bytes: [0x00, 0x60, ...new Array(12).fill(0)] }, // arc
      { kind: "raw", bytes: [0x00, 0x70, ...be16(12), ...new Array(10).fill(0)] },
      { kind: "raw", bytes: [0x00, 0x80, ...be16(10), ...new Array(8).fill(0)] },
      { kind: "raw", bytes: [0x00, 0x92, ...be16(1), 7] },     // reserved
      { kind: "raw", bytes: [0x00, 0xb5] },                    // reserved, 0
      { kind: "raw", bytes: [0x00, 0xd3, 0, 0, 0, 3, 1, 2, 3] }, // reserved
      { kind: "raw", bytes: [0x02, 0x34, 1, 2, 3, 4] },        // 2 x high byte
      { kind: "raw", bytes: [0x80, 0x11] },                    // reserved, 0
      { kind: "raw", bytes: [0x81, 0x23, 0, 0, 0, 1, 7] },     // reserved, long
      { kind: "raw", bytes: [0x00, 0x00] },                    // NOP
      { kind: "indexed", depth: 8, w: 2, h: 1, px: [1, 3], clut: CLUT },
      { kind: "raw", bytes: [0x00, 0x31, 0, 0, 0, 0, 0, 1, 0, 1] }, // after
    ];
    const img = decode({ frame: rect(0, 0, 1, 2), ops });
    expect(colors(img)).toEqual([RED, BLUE]);
  });

  it("decodes pictures laid out like AquaZone's", () => {
    // Photoshop's gravel strips: HeaderOp, an 8BIM LongComment, the
    // clip, then one 32-bit DirectBitsRect in ditherCopy mode.
    const w = 40, h = 6;
    const px = Array.from({ length: w * h }, (_, i) =>
      i < w ? WHITE : (i * 2654435761 >>> 8) & 0x3f3f3f);
    const img = decode({ frame: rect(0, 0, h, w), ops: [
      { kind: "raw", bytes: [0x00, 0xa1, 0x01, 0xf2, ...be16(22),
                             0x38, 0x42, 0x49, 0x4d, ...new Array(18).fill(0)] },
      { kind: "raw", bytes: [0x00, 0x01, ...be16(10), 0, 0, 0, 0,
                             ...be16(h), ...be16(w)] },
      { kind: "direct", depth: 32, packType: 4, w, h, px, mode: 64 },
    ] });
    expect(colors(img)).toEqual(px);
    expect([...img.idx.subarray(0, w)]).toEqual(new Array(w).fill(0));
  });
});

describe("decodePict: untrusted input", () => {
  const good = buildPict({ frame: rect(0, 0, 4, 9), ops: [
    { kind: "raw", bytes: [0x00, 0xa1, 0, 0, ...be16(3), 1, 2, 3] },
    { kind: "indexed", depth: 4, w: 9, h: 2, clut: CLUT,
      px: Array.from({ length: 18 }, (_, i) => i % 4) },
    { kind: "direct", depth: 32, packType: 4, w: 9, h: 2, bounds: rect(2, 0, 4, 9),
      px: Array.from({ length: 18 }, (_, i) => i * 0x0a0b0c),
      rgn: { box: rect(2, 0, 4, 9), rows: [{ y: 2, xs: [1, 8] },
                                           { y: 4, xs: [1, 8] }] } },
  ] });

  // The other parsers' shapes: a version 1 picture of a packed 1-bit
  // BitMap, and a data-fork file of unpacked 32-bit pixels.
  const seeds = [good,
    buildPict({ version: 1, frame: rect(0, 0, 3, 70), ops: [
      { kind: "mono", w: 70, h: 3,
        px: Array.from({ length: 210 }, (_, i) => i % 3 & 1) }] }),
    buildPict({ file: true, frame: rect(0, 0, 2, 3), ops: [
      { kind: "direct", depth: 32, packType: 1, w: 3, h: 2,
        px: [RED, BLUE, RED, BLUE, RED, BLUE] }] }),
  ];
  /** Decoding `d` either throws a PictError or gives a sound image. */
  const decodesSoundly = (d: Uint8Array) => {
    let img: IndexedImage;
    try { img = decodePict(d); }
    catch (e) { expect(e).toBeInstanceOf(PictError); return; }
    expect(img.idx.length).toBe(img.w * img.h);
    expect(img.palette.length).toBeLessThanOrEqual(256);
    expect(img.idx.every((k) => k < img.palette.length)).toBe(true);
  };

  it("decodes the fuzz seeds", () => {
    expect(seeds.map((d) => decodePict(d).w)).toEqual([9, 70, 3]);
  });

  it("throws only PictError for every truncation", () => {
    for (const seed of seeds)
      for (let n = 0; n < seed.length; n++)
        expect(() => decodePict(seed.subarray(0, n))).toThrow(PictError);
  });

  it("throws only PictError, or decodes, under byte flips", () => {
    const rnd = lcg(42);
    for (const seed of seeds)
      for (let k = 0; k < 1500; k++) {
        const d = seed.slice();
        const flips = 1 + rnd() % 4;
        for (let f = 0; f < flips; f++) d[rnd() % d.length] = rnd() & 0xff;
        decodesSoundly(d);
      }
  });

  it("throws only PictError, or decodes, on random bytes behind a valid header",
     () => {
    // Each seed's own header: version 2, version 1, and a data-fork
    // file's (512 bytes, then the picture's).
    const rnd = lcg(7);
    for (let k = 0; k < 600; k++) {
      const seed = seeds[k % 3]!;
      const head = [...seed.subarray(0, seed === seeds[2] ? 552 : 40)];
      const tail = Array.from({ length: rnd() % 400 }, () => rnd() & 0xff);
      decodesSoundly(Uint8Array.from([...head, ...tail]));
    }
  });

  it("rejects what isn't a picture", () => {
    for (const d of [new Uint8Array(0), new Uint8Array(600),
                     Uint8Array.from([0x42, 0x4d, 1, 2, 3])])
      expect(() => decodePict(d)).toThrow(PictError);
  });

  it("rejects empty and oversized frames", () => {
    for (const frame of [rect(0, 0, 0, 5), rect(5, 5, 2, 9),
                         rect(0, 0, 1, 8193), rect(0, 0, 2049, 2049)])
      expect(() => decodePict(buildPict({ frame, ops: [] })))
        .toThrow(PictError);
  });

  it("rejects bitmaps too large to allocate", () => {
    const spec = indexed(2, 1, [1, 2]);
    const op = spec.ops[0]! as Extract<Op, { kind: "indexed" }>;
    // Bounds claim 4096 x 4096 while carrying two pixels.
    const d = buildPict({ ...spec, ops: [{ ...op, bounds: rect(0, 0, 4096, 4096),
                                           rowBytes: 4096,
                                           src: rect(0, 0, 1, 2),
                                           dst: rect(0, 0, 1, 2) }] });
    expect(() => decodePict(d)).toThrow(PictError);
  });

  it("says when a picture has no bitmap", () => {
    expect(() => decodePict(buildPict({ frame: rect(0, 0, 2, 2), ops: [
      { kind: "raw", bytes: [0x00, 0x31, 0, 0, 0, 0, 0, 2, 0, 2] }] })))
      .toThrow(/no bitmap/);
    expect(() => decodePict(buildPict({ frame: rect(0, 0, 2, 2), ops: [
      { kind: "raw", bytes: [0x82, 0x00, 0, 0, 0, 2, 1, 2] }] })))
      .toThrow(/QuickTime/);
  });

  it("rejects pixel formats QuickDraw doesn't write", () => {
    const bad: Op[] = [
      { kind: "indexed", depth: 8, w: 2, h: 1, px: [1, 2], clut: CLUT,
        rowBytes: 1 },
      { kind: "direct", depth: 16, packType: 4, w: 2, h: 1, px: [1, 2] },
      { kind: "direct", depth: 32, packType: 3, w: 2, h: 1, px: [1, 2] },
    ];
    for (const op of bad)
      expect(() => decodePict(buildPict({ frame: rect(0, 0, 1, 2),
                                          ops: [op] }))).toThrow(PictError);
    // A color table of 257 entries.
    const big = Array.from({ length: 257 }, (): [number, number, number] =>
      [1, 2, 3]);
    expect(() => decode(indexed(2, 1, [1, 2], { clut: big })))
      .toThrow(PictError);
  });

  it("rejects shapes and regions shorter than their 10-byte head", () => {
    for (const op of [0x70, 0x80, 0x84])
      expect(() => decodePict(buildPict({ frame: rect(0, 0, 1, 2), ops: [
        { kind: "raw", bytes: [0x00, op, ...be16(4), 0, 0] },
        { kind: "indexed", depth: 8, w: 2, h: 1, px: [1, 2], clut: CLUT }] })))
        .toThrow(/bad shape size/);
  });

  it("rejects a picture that stops before its end opcode", () => {
    expect(() => decodePict(buildPict({ ...indexed(2, 1, [1, 2]),
                                        noEnd: true })))
      .toThrow(/ends before its end opcode/);
  });

  it("rejects direct formats outside Appendix A's table", () => {
    const one = (o: Partial<Extract<Op, { kind: "direct" }>>) => () =>
      decodePict(buildPict({ frame: rect(0, 0, 1, 2), ops: [
        { kind: "direct", depth: 32, packType: 4, w: 2, h: 1,
          px: [RED, BLUE], ...o }] }));
    expect(one({})).not.toThrow(); // the table's own row decodes
    expect(one({ cmpCount: 2 })).toThrow(/component count 2/);
    expect(one({ packType: 5 })).toThrow(/packType 5/);
    expect(one({ depth: 24 })).toThrow(/direct pixel size 24/);
  });

  it("refuses 16-bit pixels under PackBitsRect, where QuickDraw never puts them",
     () => {
    // Appendix A: direct pixels are recorded with DirectBitsRect.
    expect(() => decode(indexed(2, 1, [1, 2], { depth: 16, rowBytes: 4 })))
      .toThrow(/pixel size 16 with a color table/);
  });

  it("ignores packType for pixels with a color table", () => {
    // packType only matters for direct pixels: rows of 8 bytes or more
    // are PackBits whatever an indexed map says.
    const px = Array.from({ length: 24 }, (_, i) => i % 4);
    expect(colors(decode(indexed(12, 2, px, { packType: 1 }))))
      .toEqual(px.map((v) => CLUT_RGB[v]));
  });

  it("stops after too many opcodes", () => {
    // More no-op opcodes than the decoder's cap of 1 << 17.
    const nops = new Array<number>(2 * 140_000).fill(0);
    expect(() => decodePict(buildPict({ frame: rect(0, 0, 1, 2), ops: [
      { kind: "raw", bytes: nops },
      { kind: "indexed", depth: 8, w: 2, h: 1, px: [1, 2], clut: CLUT }] })))
      .toThrow(/over \d+ opcodes/);
  });

  it("stops a picture that asks for too much drawing", () => {
    // Every band scales one pixel over the whole 2048 x 2048 frame:
    // 20 bands draw 84 million pixels, past the decoder's budget of
    // 1 << 25.
    const one = { kind: "indexed" as const, depth: 8 as const, w: 1, h: 1,
                  px: [1], clut: CLUT, dst: rect(0, 0, 2048, 2048) };
    expect(() => decodePict(buildPict({ frame: rect(0, 0, 2048, 2048),
                                        ops: new Array<Op>(20).fill(one) })))
      .toThrow(/too much drawing/);
  });
});

describe("isPict", () => {
  const pic = buildPict(indexed(2, 1, [1, 2]));

  it("knows resource payloads and data-fork files of both versions", () => {
    expect(isPict(pic)).toBe(true);
    expect(isPict(buildPict({ ...indexed(2, 1, [1, 2]), file: true })))
      .toBe(true);
    for (const file of [false, true])
      expect(isPict(buildPict({ version: 1, frame: rect(0, 0, 1, 8), file,
        ops: [{ kind: "mono", w: 8, h: 1, px: new Array(8).fill(1) }] })))
        .toBe(true);
  });

  it("refuses other data", () => {
    expect(isPict(new Uint8Array(0))).toBe(false);
    expect(isPict(new Uint8Array(1024))).toBe(false);
    expect(isPict(pic.subarray(0, 11))).toBe(false);
    const flat = pic.slice();
    flat[6] = 0; flat[7] = 0; // bottom 0: an empty frame
    expect(isPict(flat)).toBe(false);
    expect(isPict(Uint8Array.from([0x42, 0x4d, ...new Array(60).fill(0)])))
      .toBe(false);
  });
});

describe("packBits fixture", () => {
  it("round-trips through the decoder's word mode", () => {
    expect(packBits([1, 2, 1, 2, 1, 2, 9, 9], 2))
      .toEqual([254, 1, 2, 0, 9, 9]);
    // packType 3 rows of runs, which only the word mode reads right.
    const px = [RED, RED, RED, RED, RED, BLUE, BLUE, BLUE];
    expect(colors(decode({ frame: rect(0, 0, 1, 8), ops: [
      { kind: "direct", depth: 16, packType: 3, w: 8, h: 1, px }] })))
      .toEqual(px);
  });
});
