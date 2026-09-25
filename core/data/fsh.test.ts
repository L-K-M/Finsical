import { describe, expect, it } from "vitest";
import { decodePixels, fshToSheets, isPack, packChunks } from "./fsh.js";
import { makeRng } from "../rng.js";

const PAL: [number, number, number][] =
  [[0, 0, 0], [255, 0, 0], [0, 0, 255], [0, 255, 0]];

function u32le(n: number): Uint8Array {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}
function u16le(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}
const cat = (...parts: Uint8Array[]) => {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
};

/** Minimal 8-bit BMP — only the palette region needs to be valid. */
function buildBmp8(pal: [number, number, number][]): Uint8Array {
  const pxOff = 14 + 40 + 256 * 4;
  const hdr = new Uint8Array(pxOff);
  hdr[0] = 0x42; hdr[1] = 0x4d;                    // "BM"
  const v = new DataView(hdr.buffer);
  v.setUint32(2, pxOff + 4, true);                 // size
  v.setUint32(10, pxOff, true);                    // pixel offset
  v.setUint32(14, 40, true);                       // BITMAPINFOHEADER
  v.setUint16(26, 1, true);                        // planes
  v.setUint16(28, 8, true);                        // bpp
  v.setUint32(46, pal.length, true);               // colors used
  pal.forEach(([r, g, b], i) => {
    hdr.set([b, g, r, 0], 14 + 40 + i * 4);        // BGRA
  });
  return hdr;
}

/** Signed-i16 run/literal encoder mirroring tools/tests/fixtures.py. */
function encodeFrameStream(px: Uint8Array): Uint8Array {
  const out: number[] = [];
  const n = px.length;
  const i16 = (v: number) => { out.push(v & 0xff, (v >> 8) & 0xff); };
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && px[j] === px[i]) j++;
    if (j - i >= 2) {
      let run = j - i;
      while (run > 0x7fff) { i16(-0x7fff); out.push(px[i]!); run -= 0x7fff; }
      i16(-run); out.push(px[i]!);
      i = j;
      continue;
    }
    let k = i;
    while (k < n) {
      let m = k;
      while (m < n && px[m] === px[k]) m++;
      if (m - k >= 2) break;
      k = m;
    }
    const lits = px.subarray(i, k);
    for (let off = 0; off < lits.length; off += 0x7fff) {
      const c = Math.min(lits.length - off, 0x7fff);
      i16(c);
      for (let x = 0; x < c; x++) out.push(lits[off + x]!);
    }
    i = k;
  }
  return new Uint8Array(out);
}

/** Sprite-stream chunk: header + records, 4B intra-group / 6B between. */
function buildFsh(nf: number, frames: [number, number, Uint8Array][]): Uint8Array {
  const ng = frames.length / nf;
  const parts: Uint8Array[] = [cat(u16le(ng), u16le(nf), u32le(0))];
  for (let g = 0; g < ng; g++) {
    for (let f = 0; f < nf; f++) {
      const [w, h, px] = frames[g * nf + f]!;
      const stream = encodeFrameStream(px);
      parts.push(cat(u16le(w), u16le(h), u16le(0), u32le(stream.length), stream));
      if (f === nf - 1)
        parts.push(g === ng - 1 ? new Uint8Array(0) : cat(u16le(nf), u32le(0)));
      else parts.push(new Uint8Array(4));
    }
  }
  return cat(...parts);
}

function buildPack(...chunks: Uint8Array[]): Uint8Array {
  const body: Uint8Array[] = [new Uint8Array(0x100)];
  for (const pl of chunks) body.push(u32le(pl.length), pl);
  const dirOff = body.reduce((n, p) => n + p.length, 0);
  const hdr = cat(u32le(0x00000100), u32le(dirOff), u32le(dirOff - 0x100), u32le(0x104));
  const out = cat(...body, hdr); // trailer: 16B header copy
  out.set(hdr, 0);
  return out;
}

/** Column-major fixture pixels for a w×h frame. */
function toCol(w: number, h: number, fill: (x: number, y: number) => number): Uint8Array {
  const px = new Uint8Array(w * h);
  for (let x = 0; x < w; x++)
    for (let y = 0; y < h; y++) px[x * h + y] = fill(x, y);
  return px;
}

/** Single-frame sprite chunk from a pre-encoded stream (bypasses the encoder). */
function rawSpriteChunk(w: number, h: number, stream: Uint8Array): Uint8Array {
  return cat(
    u16le(1), u16le(1), u32le(0),                        // groups, frames, reserved
    u16le(w), u16le(h), u16le(0), u32le(stream.length),  // record
    stream,
  );
}

describe("pack", () => {
  it("detects magic and walks chunks", () => {
    const pack = buildPack(new Uint8Array([1, 2, 3]), new Uint8Array([4]));
    expect(isPack(pack)).toBe(true);
    const chunks = packChunks(pack);
    expect(chunks).toHaveLength(2);
    expect([...chunks[0]!.payload]).toEqual([1, 2, 3]);
    expect([...chunks[1]!.payload]).toEqual([4]);
  });

  it("rejects non-pack data", () => {
    expect(isPack(new Uint8Array(0x200))).toBe(false);
    expect(packChunks(buildPack(new Uint8Array([9])))).toHaveLength(1);
  });
});

describe("fshToSheets", () => {
  it("decodes a sprite stream into a sheet", () => {
    const f0 = toCol(4, 4, (x) => x + 1);      // column stripes
    const f1 = toCol(4, 4, (_x, y) => y + 1);  // row stripes
    const pack = buildPack(buildBmp8(PAL), buildFsh(2, [[4, 4, f0], [4, 4, f1]]));
    const sheets = fshToSheets(pack);
    expect(sheets.size).toBe(1);
    const sheet = [...sheets.values()][0]!;
    expect(sheet.meta.groups).toBe(1);
    expect(sheet.meta.framesPerGroup).toBe(2);
    expect(sheet.meta.dims).toEqual([[0, 0, 4, 4], [0, 1, 4, 4]]);
    const fr = sheet.frame(0, 0);
    for (let x = 0; x < 4; x++)
      for (let y = 0; y < 4; y++)
        expect(fr.idx[y * 4 + x]).toBe(x + 1); // row-major round trip
    expect(fr.palette[1]).toEqual([255, 0, 0]);
  });

  it("decodes multi-group streams", () => {
    const px = toCol(2, 2, () => 1);
    const stream = buildFsh(1, [[2, 2, px], [2, 2, px], [2, 2, px]]);
    const sheets = fshToSheets(buildPack(stream));
    const sheet = [...sheets.values()][0]!;
    expect(sheet.meta.groups).toBe(3);
    expect([...sheet.frame(2, 0).idx]).toEqual([1, 1, 1, 1]);
  });

  it("skips malformed payloads", () => {
    const bad = cat(u16le(4), u16le(4), u32le(0), new Uint8Array([9, 9]));
    expect(fshToSheets(buildPack(bad)).size).toBe(0);
  });

  it("emits a literal run verbatim, 0xFF bytes included", () => {
    // `04 00` = a 4-pixel literal run; the FF bytes are pixel data, and the
    // positive i16 cannot be mistaken for a color run.
    const stream = new Uint8Array([0x04, 0x00, 0xff, 0x07, 0xaa, 0xbb]);
    const sheet = [...fshToSheets(buildPack(rawSpriteChunk(2, 2, stream))).values()][0]!;
    // column-major emit [ff,07,aa,bb] -> row-major [ff,aa,07,bb]
    expect([...sheet.frame(0, 0).idx]).toEqual([0xff, 0xaa, 0x07, 0xbb]);
  });

  it("decodes a color run followed by a literal run", () => {
    // `FE FF 09` = i16 -2 → run of 2 × col 9; `01 00 2A` = 1 literal 0x2A.
    const stream = new Uint8Array([0xfe, 0xff, 0x09, 0x01, 0x00, 0x2a]);
    const sheet = [...fshToSheets(buildPack(rawSpriteChunk(3, 1, stream))).values()][0]!;
    expect([...sheet.frame(0, 0).idx]).toEqual([9, 9, 0x2a]);
  });

  it("round-trips runs longer than 255", () => {
    // a run of 300 fits a single signed-i16 color-run command.
    const px = new Uint8Array(300).fill(7);
    const stream = encodeFrameStream(px);
    expect([...stream]).toEqual([0xd4, 0xfe, 0x07]);
    const sheet = [...fshToSheets(buildPack(rawSpriteChunk(1, 300, stream))).values()][0]!;
    expect([...sheet.frame(0, 0).idx]).toEqual([...px]);
  });

  it("drops a stray trailing byte instead of reading past the stream", () => {
    // `FE FF 09` = run of 2 × col 9; `7A` is one orphan byte with no high
    // byte, so it is dropped and the shortfall pads with 0.
    const stream = new Uint8Array([0xfe, 0xff, 0x09, 0x7a]);
    const sheet = [...fshToSheets(buildPack(rawSpriteChunk(4, 1, stream))).values()][0]!;
    expect([...sheet.frame(0, 0).idx]).toEqual([9, 9, 0, 0]);
  });

  it("does not read past the stream on a truncated item", () => {
    // `FE FF` alone is a run header with no color byte -> col defaults to 0.
    const a = [...fshToSheets(buildPack(rawSpriteChunk(2, 1, new Uint8Array([0xfe, 0xff])))).values()][0]!;
    expect([...a.frame(0, 0).idx]).toEqual([0, 0]);
    // `09 00 AA` claims 9 literals but only one remains -> pads the rest.
    const b = [...fshToSheets(buildPack(rawSpriteChunk(4, 1, new Uint8Array([0x09, 0x00, 0xaa])))).values()][0]!;
    expect([...b.frame(0, 0).idx]).toEqual([0xaa, 0, 0, 0]);
  });
});

describe("decodePixels", () => {
  /** The decoder as it was, one closure call per pixel: the reference
   * the counter version must match byte for byte. */
  function reference(s: Uint8Array, w: number, h: number): Uint8Array {
    const total = w * h;
    const out = new Uint8Array(total);
    const n = s.length;
    let o = 0, i = 0;
    const emit = (c: number) => {
      if (o < total) out[(o % h) * w + (o / h | 0)] = c;
      o++;
    };
    while (i + 1 < n && o < total) {
      let v = (s[i] ?? 0) | ((s[i + 1] ?? 0) << 8);
      if (v >= 0x8000) v -= 0x10000;
      if (v < 0) {
        const c = s[i + 2] ?? 0;
        for (let k = 0; k < -v; k++) emit(c);
        i += 3;
      } else if (v > 0) {
        for (let k = 0; k < v; k++) emit(s[i + 2 + k] ?? 0);
        i += 2 + v;
      } else {
        i += 2;
      }
    }
    return out;
  }

  /** A random stream of runs, copies and empty records, often cut off
   * mid-record, with counts that may run past the frame. */
  function stream(rand: () => number, pixels: number): Uint8Array {
    const b: number[] = [];
    const budget = pixels * (0.5 + rand() * 1.2);
    for (let used = 0; used < budget;) {
      const kind = rand();
      const len = 1 + Math.floor(rand() * 40);
      if (kind < 0.1) { b.push(0, 0); continue; }
      if (kind < 0.55) {
        // Some runs at the format's longest, and many of colour 0,
        // whose writes the decoder skips.
        const v = 0x10000 - (rand() < 0.03 ? 0x8000 : len);
        b.push(v & 0xff, v >> 8, rand() < 0.3 ? 0 : Math.floor(rand() * 256));
      } else {
        b.push(len & 0xff, len >> 8);
        for (let k = 0; k < len; k++) b.push(Math.floor(rand() * 256));
      }
      used += len;
    }
    // Truncate some streams mid-record, and leave an odd byte on others.
    const cut = rand() < 0.3 ? Math.floor(rand() * b.length) : b.length;
    return Uint8Array.from(b.slice(0, cut));
  }

  it("matches the old decoder on random streams, byte for byte", () => {
    const rand = makeRng(0x9003);
    for (let t = 0; t < 3000; t++) {
      const w = 1 + Math.floor(rand() * 24), h = 1 + Math.floor(rand() * 24);
      const s = stream(rand, w * h);
      expect(decodePixels(s, w, h)).toEqual(reference(s, w, h));
    }
  });

  it("fills pixels down each column, clipping a run past the frame", () => {
    // 2 wide, 3 tall: a run of 4 fills column 0 then the top of column 1;
    // a copy of 5 fills the rest and drops what is left over.
    const s = Uint8Array.from([0xfc, 0xff, 7, 5, 0, 1, 2, 3, 4, 5]);
    expect([...decodePixels(s, 2, 3)]).toEqual([7, 7, 7, 1, 7, 2]);
  });

  it("clips a maximum-length run to the frame", () => {
    // 0x8000 is -32768 as s16: the run fills the whole 2x2 frame and
    // its other 32764 pixels are dropped.
    expect([...decodePixels(Uint8Array.of(0x00, 0x80, 9), 2, 2)])
      .toEqual([9, 9, 9, 9]);
    // 0x7fff copies up to 32767 bytes; only the frame's 4 are read.
    const copy = Uint8Array.of(0xff, 0x7f, 1, 2, 3, 4, 5, 6);
    expect([...decodePixels(copy, 2, 2)]).toEqual([1, 3, 2, 4]);
  });

  it("reads zeros past the end of a cut stream", () => {
    const s = Uint8Array.from([3, 0, 9]); // a copy of 3 with 1 byte left
    expect([...decodePixels(s, 1, 3)]).toEqual([9, 0, 0]);
  });
});
