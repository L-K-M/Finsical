/**
 * Minimal 8-bit BMP decoder — uncompressed and RLE8 (port of
 * tools/az/img.py read_bmp). Returns palette-indexed pixels.
 */
import type { IndexedImage } from "./azpack.js";

function u16(d: Uint8Array, o: number): number {
  return (d[o] ?? 0) | ((d[o + 1] ?? 0) << 8);
}
function u32(d: Uint8Array, o: number): number {
  return (u16(d, o) | (u16(d, o + 2) << 16)) >>> 0;
}
function i32(d: Uint8Array, o: number): number {
  return u32(d, o) | 0;
}

export function isBmp(d: Uint8Array): boolean {
  return d[0] === 0x42 && d[1] === 0x4d; // "BM"
}

export function decodeBmp(d: Uint8Array): IndexedImage | null {
  if (!isBmp(d) || d.length < 54) return null;
  const size = u32(d, 2), pxOff = u32(d, 10), hdr = u32(d, 14);
  if (hdr < 40) return null; // BITMAPINFOHEADER or newer only
  const w = i32(d, 18);
  let h = i32(d, 22);
  const bpp = u16(d, 28), comp = u32(d, 30);
  if (bpp !== 8 || (comp !== 0 && comp !== 1)) return null;
  if (w <= 0 || h === 0 || w > 8192 || Math.abs(h) > 8192) return null;
  const topdown = h < 0;
  h = Math.abs(h);

  const ncol = u32(d, 46) || 256;
  const palette: [number, number, number][] = [];
  for (let i = 0; i < ncol; i++) {
    const o = 14 + hdr + i * 4;
    if (o + 4 > d.length) break;
    palette.push([d[o + 2] ?? 0, d[o + 1] ?? 0, d[o] ?? 0]); // BGRA → RGB
  }

  const idx = new Uint8Array(w * h);
  if (comp === 0) {
    const stride = ((w * 8 + 31) >> 5) * 4;
    for (let y = 0; y < h; y++) {
      const row = topdown ? y : h - 1 - y;
      const base = pxOff + row * stride;
      if (base + w > d.length) break;
      idx.set(d.subarray(base, base + w), y * w);
    }
  } else {
    // RLE8: command stream, first stored scanline = image bottom.
    const rows: Uint8Array[] = [];
    const end = size ? Math.min(size, d.length) : d.length;
    let p = pxOff, done = false;
    while (rows.length < h && !done && p + 1 < end) {
      let run: number[] = [];
      while (p + 1 < end) {
        const n = d[p] ?? 0, v = d[p + 1] ?? 0;
        p += 2;
        if (n) {
          for (let k = 0; k < n; k++) run.push(v);
        } else if (v === 0) { // end of line
          break;
        } else if (v === 1) { // end of bitmap
          done = true;
          break;
        } else if (v === 2) { // delta: right dx, up dy
          if (p + 1 >= end) { done = true; break; }
          const dx = d[p] ?? 0, dy = d[p + 1] ?? 0;
          p += 2;
          if (dy) {
            rows.push(clipRow(run, w));
            for (let k = 1; k < dy; k++) rows.push(new Uint8Array(w));
            run = new Array(Math.min(run.length + dx, w)).fill(0) as number[];
          } else {
            for (let k = 0; k < dx; k++) run.push(0);
          }
        } else { // absolute run of v bytes
          for (let k = 0; k < v && p + k < end; k++) run.push(d[p + k] ?? 0);
          p += v + (v & 1); // absolute runs pad to even
        }
      }
      rows.push(clipRow(run, w));
    }
    for (let y = 0; y < h; y++) {
      const row = topdown ? y : h - 1 - y;
      const r = rows[row];
      if (r) idx.set(r, y * w);
    }
  }
  return { w, h, palette, idx };
}

function clipRow(run: number[], w: number): Uint8Array {
  const row = new Uint8Array(w);
  row.set(Uint8Array.from(run.slice(0, w)));
  return row;
}
