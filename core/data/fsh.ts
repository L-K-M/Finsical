/**
 * Direct .fsh/.REZ import: parse the 9003inc pack container and decode
 * ELRA/ELRB sprite streams into SpriteSheets — no .azpack detour.
 *
 * Container layout (see tools/az/pack.py):
 *   - u32 magic 00 01 00 00, u32 dir offset, ...
 *   - from 0x100: u32-LE length-prefixed chunks up to dir_off
 *
 * Sprite stream layout (see tools/az/fsh.py):
 *   u16 groups, u16 frames/group, u32 reserved, then frame records
 *   {u16 w, u16 h, u16 sections, u32 stream_len} + stream. Items in a
 *   stream: `op 0xFF col n lit…` emits (0x100-op) of col then n literals;
 *   any other byte is one literal. Pixels are column-major.
 */
import { SpriteSheet } from "./azpack.js";
import type { IndexedImage, SpriteSheetMeta } from "./azpack.js";

const MAGIC = 0x00000100;
const DATA_BASE = 0x100;

function u16(d: Uint8Array, o: number): number {
  return (d[o] ?? 0) | ((d[o + 1] ?? 0) << 8);
}
function u32(d: Uint8Array, o: number): number {
  return (u16(d, o) | (u16(d, o + 2) << 16)) >>> 0;
}

export function isPack(d: Uint8Array): boolean {
  return d.length > DATA_BASE && u32(d, 0) === MAGIC;
}

export interface PackChunk {
  pos: number;
  payload: Uint8Array;
}

export function packChunks(d: Uint8Array): PackChunk[] {
  const dirOff = u32(d, 4);
  const chunks: PackChunk[] = [];
  let p = DATA_BASE;
  const limit = Math.min(d.length, dirOff);
  while (p + 4 <= d.length && p < dirOff) {
    const n = u32(d, p);
    if (n < 1 || p + 4 + n > limit) break;
    chunks.push({ pos: p + 4, payload: d.subarray(p + 4, p + 4 + n) });
    p += 4 + n;
  }
  return chunks;
}

/** BMP color table → [r,g,b] entries (empty if unreadable). */
function bmpPalette(d: Uint8Array): [number, number, number][] {
  if (d[0] !== 0x42 || d[1] !== 0x4d) return []; // "BM"
  const hdr = u32(d, 14), bpp = u16(d, 28);
  if (hdr < 40 || (bpp !== 1 && bpp !== 4 && bpp !== 8)) return [];
  const ncol = Math.min(u32(d, 46) || (1 << bpp), 256);
  const pal: [number, number, number][] = [];
  for (let i = 0; i < ncol; i++) {
    const o = 14 + hdr + i * 4;
    if (o + 4 > d.length) break;
    pal.push([d[o + 2] ?? 0, d[o + 1] ?? 0, d[o] ?? 0]); // BGRA → RGB
  }
  return pal;
}

interface RawFrame { w: number; h: number; idx: Uint8Array }

function decodePixels(s: Uint8Array, w: number, h: number): Uint8Array {
  const col: number[] = [];
  const n = s.length;
  let i = 0;
  while (i < n && col.length < w * h) {
    if (i + 3 < n && s[i + 1] === 0xff) {
      const run = 0x100 - (s[i] ?? 0), c = s[i + 2] ?? 0;
      for (let k = 0; k < run; k++) col.push(c);
      const nl = s[i + 3] ?? 0;
      for (let k = 0; k < nl && i + 4 + k < n; k++) col.push(s[i + 4 + k] ?? 0);
      i += 4 + nl;
    } else {
      col.push(s[i] ?? 0);
      i += 1;
    }
  }
  while (col.length < w * h) col.push(0);
  const out = new Uint8Array(w * h);
  for (let k = 0; k < w * h; k++) out[(k % h) * w + (k / h | 0)] = col[k] ?? 0;
  return out;
}

function isSpriteStream(b: Uint8Array): boolean {
  if (b.length < 18) return false;
  const ng = u16(b, 0), nf = u16(b, 2);
  if (ng < 1 || ng >= 64 || nf < 1 || nf >= 64) return false;
  if (u32(b, 4) !== 0) return false;
  const w = u16(b, 8), h = u16(b, 10), ln = u32(b, 14);
  return w > 0 && w < 4096 && h > 0 && h < 4096 && 18 + ln <= b.length;
}

/** Decode one sprite-stream chunk into a group-major sheet image. */
function spriteSheet(b: Uint8Array, palette: [number, number, number][]):
    { meta: SpriteSheetMeta; img: IndexedImage } | null {
  if (!isSpriteStream(b)) return null;
  const ng = u16(b, 0), nf = u16(b, 2);
  const frames: { g: number; f: number; fr: RawFrame }[] = [];
  let p = 8;
  for (let g = 0; g < ng; g++) {
    for (let f = 0; f < nf; f++) {
      if (p + 10 > b.length) return null;
      const w = u16(b, p), h = u16(b, p + 2), ln = u32(b, p + 6);
      if (!(w > 0 && w < 4096 && h > 0 && h < 4096 &&
            p + 10 + ln <= b.length && w * h <= 64 * ln + 0x400)) return null;
      frames.push({ g, f, fr: { w, h, idx: decodePixels(b.subarray(p + 10, p + 10 + ln), w, h) } });
      p += 10 + ln;
      p += f === nf - 1 ? (g === ng - 1 ? 0 : 6) : 4;
    }
  }
  const cw = Math.max(...frames.map((x) => x.fr.w));
  const ch = Math.max(...frames.map((x) => x.fr.h));
  const sw = cw * nf, sh = ch * ng;
  const sheet = new Uint8Array(sw * sh);
  for (const { g, f, fr } of frames)
    for (let y = 0; y < fr.h; y++)
      sheet.set(fr.idx.subarray(y * fr.w, (y + 1) * fr.w),
                (g * ch + y) * sw + f * cw);
  const dims = frames.map((x) => [x.g, x.f, x.fr.w, x.fr.h] as
    [number, number, number, number]);
  const meta: SpriteSheetMeta = {
    image: "", groups: ng, framesPerGroup: nf,
    cellW: cw, cellH: ch, dims, paletteSrc: null,
  };
  return { meta, img: { w: sw, h: sh, palette, idx: sheet } };
}

/**
 * Parse a whole pack and return chunk-name → SpriteSheet for every
 * decodable sprite stream, sharing the first BMP chunk's palette.
 */
export function fshToSheets(d: Uint8Array): Map<string, SpriteSheet> {
  const chunks = packChunks(d);
  let palette: [number, number, number][] = [];
  for (const c of chunks) {
    if (c.payload[0] === 0x42 && c.payload[1] === 0x4d) {
      palette = bmpPalette(c.payload);
      if (palette.length) break;
    }
  }
  for (let i = palette.length; i < 256; i++) palette.push([i, i, i]);
  const sheets = new Map<string, SpriteSheet>();
  for (const c of chunks) {
    const r = spriteSheet(c.payload, palette);
    if (r) sheets.set(`chunk@${c.pos.toString(16)}`, new SpriteSheet(r.meta, r.img));
  }
  return sheets;
}
