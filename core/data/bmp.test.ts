import { describe, expect, it } from "vitest";
import { decodeBmp, isBmp } from "./bmp.js";

const PAL: [number, number, number][] =
  [[0, 0, 0], [255, 0, 0], [0, 0, 255], [0, 255, 0]];

/** 8-bit uncompressed BMP fixture. idx is top-down row-major. */
function buildBmp8(w: number, h: number, idx: Uint8Array,
                   pal: [number, number, number][] = PAL,
                   comp = 0): Uint8Array {
  const stride = ((w * 8 + 31) >> 5) * 4;
  const px = new Uint8Array(h * stride);
  for (let y = 0; y < h; y++)               // stored bottom-up
    px.set(idx.subarray(y * w, (y + 1) * w), (h - 1 - y) * stride);
  const pxOff = 14 + 40 + 256 * 4;
  const out = new Uint8Array(pxOff + px.length);
  const v = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d;             // "BM"
  v.setUint32(2, out.length, true);
  v.setUint32(10, pxOff, true);
  v.setUint32(14, 40, true);                // BITMAPINFOHEADER
  v.setInt32(18, w, true);
  v.setInt32(22, h, true);
  v.setUint16(26, 1, true);                 // planes
  v.setUint16(28, 8, true);                 // bpp
  v.setUint32(30, comp, true);              // compression
  v.setUint32(34, px.length, true);
  v.setUint32(46, pal.length, true);
  pal.forEach(([r, g, b], i) => out.set([b, g, r, 0], 14 + 40 + i * 4));
  out.set(px, pxOff);
  return out;
}

/** RLE8 BMP: each row one absolute run + EOL, then end-of-bitmap. */
function buildBmp8Rle(w: number, h: number, idx: Uint8Array): Uint8Array {
  const bytes: number[] = [];
  for (let y = h - 1; y >= 0; y--) {        // stored bottom-up
    bytes.push(0, w, ...idx.subarray(y * w, (y + 1) * w));
    if (w & 1) bytes.push(0);               // absolute runs pad to even
    bytes.push(0, 0);                       // end of line
  }
  bytes.push(0, 1);                         // end of bitmap
  const pxOff = 14 + 40 + 256 * 4;
  const base = buildBmp8(w, h, idx, PAL, 1);
  const out = new Uint8Array(pxOff + bytes.length);
  out.set(base.subarray(0, pxOff));
  new DataView(out.buffer).setUint32(2, out.length, true);
  new DataView(out.buffer).setUint32(34, bytes.length, true);
  out.set(Uint8Array.from(bytes), pxOff);
  return out;
}

describe("decodeBmp", () => {
  it("round-trips an uncompressed 8-bit BMP", () => {
    const idx = new Uint8Array([1, 2, 3, 0, 0, 3, 2, 1]); // 4x2
    const img = decodeBmp(buildBmp8(4, 2, idx))!;
    expect(img.w).toBe(4);
    expect(img.h).toBe(2);
    expect([...img.idx]).toEqual([...idx]);
    expect(img.palette[1]).toEqual([255, 0, 0]);
  });

  it("round-trips an RLE8 BMP", () => {
    const idx = new Uint8Array([1, 1, 2, 3, 3, 2]); // 3x2
    const img = decodeBmp(buildBmp8Rle(3, 2, idx))!;
    expect([...img.idx]).toEqual([...idx]);
  });

  it("handles encoded RLE runs", () => {
    // one row: encoded run of 4×palette-1 then EOL, EOB
    const px = new Uint8Array([4, 1, 0, 0, 0, 1]);
    const pxOff = 14 + 40 + 256 * 4;
    const bmp = buildBmp8(4, 1, new Uint8Array(4), PAL, 1);
    const out = new Uint8Array(pxOff + px.length);
    out.set(bmp.subarray(0, pxOff));
    out.set(px, pxOff);
    const img = decodeBmp(out)!;
    expect([...img.idx]).toEqual([1, 1, 1, 1]);
  });

  it("rejects non-BMP and unsupported depths", () => {
    expect(decodeBmp(new Uint8Array(60))).toBeNull();
    const bpp24 = buildBmp8(2, 1, new Uint8Array(2));
    new DataView(bpp24.buffer).setUint16(28, 24, true);
    expect(decodeBmp(bpp24)).toBeNull();
    expect(isBmp(bpp24)).toBe(true); // magic still holds
  });
});
