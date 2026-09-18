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

/** Run/literal encoder mirroring tools/tests/fixtures.py. */
function encodeFrameStream(px: Uint8Array): Uint8Array {
  const out: number[] = [];
  const n = px.length;
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && px[j] === px[i]) j++;
    let run = j - i;
    const col = px[i]!;
    if (col === 0xff) throw new Error("0xFF cannot lead a run command");
    const lits: number[] = [];
    let k = j;
    while (k < n) {
      let m = k;
      while (m < n && px[m] === px[k]) m++;
      if (m - k >= 2 && px[k] !== 0xff) break;
      if (lits.length + (m - k) > 255) break;
      lits.push(...px.subarray(k, m));
      k = m;
    }
    i = k;
    while (run > 255) { out.push(0x01, 0xff, col, 0, 0); run -= 255; }
    out.push(0x100 - run, 0xff, col, lits.length, 0, ...lits);
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

  it("treats a literal 0x00 0xFF pair as pixels, not a command", () => {
    // 0x00 0xFF would mis-parse as a run command under a grammar that ignores
    // op==0; here every byte must land as one literal pixel.
    const stream = new Uint8Array([0x03, 0x00, 0xff, 0x07]);
    const sheet = [...fshToSheets(buildPack(rawSpriteChunk(2, 2, stream))).values()][0]!;
    // column-major emit [3,0,255,7] -> row-major [3,255,0,7]
    expect([...sheet.frame(0, 0).idx]).toEqual([3, 255, 0, 7]);
  });

  it("consumes the count high byte as structure, not a pixel", () => {
    // `FE FF 09 01 00 2A`: run of 2 × col 9, then 1 literal 0x2A. The 0x00 is
    // the u16 count's high byte; the old 4-byte grammar emitted it as a pixel
    // and shifted the real literal out of frame.
    const stream = new Uint8Array([0xfe, 0xff, 0x09, 0x01, 0x00, 0x2a]);
    const sheet = [...fshToSheets(buildPack(rawSpriteChunk(3, 1, stream))).values()][0]!;
    expect([...sheet.frame(0, 0).idx]).toEqual([9, 9, 0x2a]);
  });
});
