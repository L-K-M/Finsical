import { describe, expect, it } from "vitest";
import { fshToSheets, isPack, packChunks } from "./fsh.js";

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
});
