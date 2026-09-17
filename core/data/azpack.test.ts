import { describe, expect, it } from "vitest";
import { decodeIndexedPng, loadAzpack, SpriteSheet } from "./azpack.js";

/** zlib wrapper around uncompressed deflate blocks (valid IDAT payload). */
function deflateStore(data: Uint8Array): Uint8Array {
  const nblocks = Math.ceil(data.length / 65535) || 1;
  const out = new Uint8Array(2 + data.length + nblocks * 5 + 4);
  const v = new DataView(out.buffer);
  out.set([0x78, 0x01], 0); // zlib: deflate, no dict, check
  let o = 2;
  for (let b = 0; b < nblocks; b++) {
    const n = Math.min(65535, data.length - b * 65535);
    out[o] = b === nblocks - 1 ? 1 : 0; // BFINAL + stored
    v.setUint16(o + 1, n, true);
    v.setUint16(o + 3, ~n & 0xffff, true);
    out.set(data.subarray(b * 65535, b * 65535 + n), o + 5);
    o += 5 + n;
  }
  let s1 = 1, s2 = 0; // adler32
  for (const byte of data) { s1 = (s1 + byte) % 65521; s2 = (s2 + s1) % 65521; }
  v.setUint32(o, (s2 << 16) | s1);
  return out;
}

/** Minimal indexed-PNG encoder — mirrors tools/az/img.py save_indexed_png. */
function encodeIndexedPng(w: number, h: number, idx: Uint8Array,
                          pal: [number, number, number][]): Uint8Array {
  const chunk = (tag: string, data: Uint8Array) => {
    const out = new Uint8Array(12 + data.length);
    const v = new DataView(out.buffer);
    v.setUint32(0, data.length);
    for (let i = 0; i < 4; i++) out[4 + i] = tag.charCodeAt(i);
    out.set(data, 8);
    let crc = 0xffffffff;
    for (let i = 4; i < 8 + data.length; i++) {
      crc ^= out[i] ?? 0;
      for (let k = 0; k < 8; k++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
    v.setUint32(8 + data.length, ~crc >>> 0);
    return out;
  };
  const ihdr = new Uint8Array(13);
  const hv = new DataView(ihdr.buffer);
  hv.setUint32(0, w); hv.setUint32(4, h);
  ihdr.set([8, 3, 0, 0, 0], 8); // 8-bit, indexed, no interlace
  const plte = new Uint8Array(pal.flat());
  const raw = new Uint8Array(h * (w + 1));
  for (let y = 0; y < h; y++) {
    const f = y % 5; // cycle row filters 0–4 to cover all unfilter branches
    raw[y * (w + 1)] = f;
    for (let x = 0; x < w; x++) {
      const v = idx[y * w + x] ?? 0;
      const a = x ? idx[y * w + x - 1] ?? 0 : 0;
      const b = y ? idx[(y - 1) * w + x] ?? 0 : 0;
      const c = x && y ? idx[(y - 1) * w + x - 1] ?? 0 : 0;
      const p = a + b - c;
      const pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
      const pred = pa <= pb && pa <= pc ? a : pb <= pc ? b : c;
      raw[y * (w + 1) + 1 + x] =
        (f === 1 ? v - a : f === 2 ? v - b : f === 3 ? v - ((a + b) >> 1) : f === 4 ? v - pred : v) & 0xff;
    }
  }
  const idat = deflateStore(raw);
  const sig = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const parts = [sig, chunk("IHDR", ihdr), chunk("PLTE", plte),
                 chunk("IDAT", idat), chunk("IEND", new Uint8Array(0))];
  const png = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { png.set(p, o); o += p.length; }
  return png;
}

const PAL: [number, number, number][] = [[0, 0, 0], [255, 0, 0], [0, 0, 255]];

describe("decodeIndexedPng", () => {
  it("round-trips pixels and palette", async () => {
    const idx = new Uint8Array(20).map((_, i) => i % 3); // 4x5
    const png = encodeIndexedPng(4, 5, idx, PAL);
    const img = await decodeIndexedPng(png);
    expect(img.w).toBe(4);
    expect(img.h).toBe(5);
    expect(img.palette).toEqual(PAL);
    expect([...img.idx]).toEqual([...idx]);
  });

  it("rejects non-png data", async () => {
    await expect(decodeIndexedPng(new Uint8Array([1, 2, 3, 4])))
      .rejects.toThrow("signature");
  });

  it("rejects palette indices out of range", async () => {
    const png = encodeIndexedPng(2, 1, new Uint8Array([5, 0]), PAL);
    await expect(decodeIndexedPng(png))
      .rejects.toThrow(/palette index 5 out of range \(palette size \d+\)/);
  });
});

describe("SpriteSheet", () => {
  it("extracts the right cell", async () => {
    // 2x2 sheet of 2x1 cells: cell (g,f) filled with value g*2+f+1
    const idx = new Uint8Array([1, 1, 2, 2, 3, 3, 4, 4]); // 4x2
    const img = { w: 4, h: 2, palette: PAL, idx };
    const meta = { image: "s.png", groups: 2, framesPerGroup: 2,
                   cellW: 2, cellH: 1,
                   dims: [[0, 0, 2, 1], [0, 1, 2, 1], [1, 0, 2, 1], [1, 1, 2, 1]] as [number, number, number, number][] };
    const sheet = new SpriteSheet(meta, img);
    const fr = sheet.frame(1, 0);
    expect(fr.w).toBe(2);
    expect([...fr.idx]).toEqual([3, 3]);
    expect([...sheet.frame(0, 1).idx]).toEqual([2, 2]);
    expect(() => sheet.frame(2, 0)).toThrow(RangeError);
  });

  it("rejects frames with invalid dims", () => {
    const img = { w: 6, h: 3, palette: PAL, idx: new Uint8Array(18) };
    const meta = { image: "s.png", groups: 1, framesPerGroup: 3,
                   cellW: 2, cellH: 1,
                   dims: [[0, 0, -2, 1], [0, 1, 2, 1.5], [0, 2, 2, 1]] as [number, number, number, number][] };
    const sheet = new SpriteSheet(meta, img);
    expect(() => sheet.frame(0, 0)).toThrow(RangeError);
    expect(() => sheet.frame(0, 1)).toThrow(RangeError);
    const ok = sheet.frame(0, 2);
    expect(ok.w).toBe(2);
    expect(ok.h).toBe(1);
    expect(ok.idx.length).toBe(2);
  });
});

describe("loadAzpack", () => {
  it("loads manifest + sprite sheets through a reader", async () => {
    const idx = new Uint8Array([0, 1, 1, 0]); // 2x2 sheet, one cell
    const png = encodeIndexedPng(2, 2, idx, PAL);
    const manifest = {
      format: "azpack/1", tag: "XXXX", version: 1, names: [],
      chunks: [{ file: "chunks/a.bin", size: 5, resId: 0xc8, sub: 0xffff,
                 sprites: { image: "sprites/a.png", groups: 1,
                            framesPerGroup: 1, cellW: 2, cellH: 2,
                            dims: [[0, 0, 2, 2]] } }],
    };
    const files: Record<string, Uint8Array> = {
      "manifest.json": new TextEncoder().encode(JSON.stringify(manifest)),
      "sprites/a.png": png,
    };
    const pack = await loadAzpack(async (p) => files[p] ?? new Uint8Array(0));
    expect(pack.manifest.chunks).toHaveLength(1);
    const sheet = pack.sheets.get("chunks/a.bin")!;
    expect([...sheet.frame(0, 0).idx]).toEqual([...idx]);
  });
});
