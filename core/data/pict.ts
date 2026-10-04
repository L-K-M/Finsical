/**
 * QuickDraw PICT decoder: a picture from a Mac data-fork file (after
 * its 512-byte header) or a resource payload (a 'PICT' resource, or
 * AquaZone's own types such as a gravel's BAPC) to an indexed image.
 * Written from "Inside Macintosh: Imaging With QuickDraw" (Apple,
 * 1994), Appendix A, "Picture Opcodes".
 *
 * A picture is a 10-byte header (u16 size, only the low 16 bits of
 * it; Rect picFrame) and then drawing opcodes up to OpEndPic (00FF).
 * Version 1 opens with 11 01 and uses 1-byte opcodes. Version 2 opens
 * with 0011 02FF, uses 2-byte opcodes and starts each one on an even
 * offset from the picture's start. Only the bitmap opcodes draw here:
 *
 *   0090 BitsRect, 0091 BitsRgn              rows stored plain
 *   0098 PackBitsRect, 0099 PackBitsRgn      PackBits rows
 *   009A DirectBitsRect, 009B DirectBitsRgn  16- and 32-bit pixels
 *
 * Every other opcode (lines, text, comments, the clip) is skipped by
 * its documented length. Each bitmap is copied from its srcRect to its
 * dstRect, scaled nearest-neighbor as CopyBits does, clipped to
 * picFrame and, in the Rgn forms, to the mask region, onto a white
 * page: QuickDraw's default background. Transfer modes are not
 * modelled; image pictures copy with srcCopy (or ditherCopy, which
 * only differs on a screen of fewer colors).
 *
 * The result always has white at palette index 0 and gives index 0 to
 * no other color. Gravel strips paint the sky above their stones
 * white: all 39 of the Windows add-ons' strips that have one do,
 * whether their palette puts white first or last. The tank keys out
 * index 0, where the standard Mac color table puts white, so a strip
 * drawn in direct color or with a reordered table keys the same way.
 * A picture of at most 255 other colors keeps them exactly. One with
 * more, which only direct pixels can have, is reduced by median cut:
 * see quantize().
 *
 * Input is untrusted: every read is bounds-checked, the frame and each
 * bitmap are capped before anything is allocated, and the pixels a
 * picture may decode and draw are budgeted, so a crafted file can't
 * hang the decode or exhaust memory. Failures throw PictError only.
 */
import type { IndexedImage } from "./azpack.js";

/** Why a picture didn't decode: the only error decodePict throws. */
export class PictError extends Error {}

/** Largest picture or bitmap side: BMP's limit (bmp.ts). */
const MAX_SIDE = 8192;
/** Largest picture or bitmap area: 2048 x 2048. AquaZone's pictures
 * are 640 x 480 backdrops and strips up to 1280 wide; the RGB page
 * costs four bytes a pixel. */
const MAX_PIXELS = 1 << 22;
/** Pixels decoded plus pixels drawn, summed over all of a picture's
 * bitmaps: many bitmaps, or one scaled over the page again and again,
 * can't add up to unbounded work. */
const MAX_WORK = 1 << 25;
/** Opcodes read before giving up. Image pictures hold a handful. */
const MAX_OPCODES = 1 << 17;
/** A data-fork file's application header, before the picture. */
const FILE_HEADER = 512;
/** Color table entries: an 8-bit pixel indexes at most 256. */
const MAX_CLUT = 256;

const WHITE = 0xffffff;
const BLACK = 0x000000;

interface Rect { top: number; left: number; bottom: number; right: number }

const i16 = (d: Uint8Array, o: number): number =>
  (d[o]! << 24 | d[o + 1]! << 16) >> 16;

/** Bounds-checked big-endian reads: running off the end (or past a
 * region's own length) is a PictError, never a RangeError. */
class Reader {
  constructor(readonly d: Uint8Array, public p: number,
              readonly end = d.length) {}
  private need(n: number): void {
    if (this.p + n > this.end) throw new PictError("picture is truncated");
  }
  u8(): number { this.need(1); return this.d[this.p++]!; }
  u16(): number {
    this.need(2);
    const v = this.d[this.p]! << 8 | this.d[this.p + 1]!;
    this.p += 2;
    return v;
  }
  i16(): number { const v = this.u16(); return v >= 0x8000 ? v - 0x10000 : v; }
  u32(): number { return (this.u16() * 0x10000 + this.u16()) >>> 0; }
  skip(n: number): void { this.need(n); this.p += n; }
  bytes(n: number): Uint8Array {
    this.need(n);
    const s = this.d.subarray(this.p, this.p + n);
    this.p += n;
    return s;
  }
  rect(): Rect {
    const top = this.i16(), left = this.i16();
    return { top, left, bottom: this.i16(), right: this.i16() };
  }
}

/** Offset of the picture in `d`: 0 for a resource payload, 512 past a
 * data-fork file's header, or -1 when neither place starts a picture
 * (a non-empty frame, then 11 01 or 0011 02FF). */
function pictStart(d: Uint8Array): number {
  for (const base of [0, FILE_HEADER]) {
    if (d.length < base + 12) continue;
    if (i16(d, base + 6) <= i16(d, base + 2) ||
        i16(d, base + 8) <= i16(d, base + 4)) continue;
    if (d[base + 10] === 0x11 && d[base + 11] === 0x01) return base;
    if (d.length >= base + 14 && d[base + 10] === 0x00 &&
        d[base + 11] === 0x11 && d[base + 12] === 0x02 &&
        d[base + 13] === 0xff) return base;
  }
  return -1;
}

/** Whether `d` starts like a QuickDraw picture, with or without a
 * data-fork header: a cheap sniff, not a promise that it decodes. */
export function isPict(d: Uint8Array): boolean {
  return pictStart(d) >= 0;
}

function checkSize(w: number, h: number, what: string): void {
  if (w <= 0 || h <= 0)
    throw new PictError(`${what} is empty (${w} x ${h})`);
  if (w > MAX_SIDE || h > MAX_SIDE || w * h > MAX_PIXELS)
    throw new PictError(`${what} is too large (${w} x ${h})`);
}

/** The page the bitmaps draw on, created at the first bitmap. */
interface Page {
  frame: Rect;
  w: number;
  h: number;
  rgb: Uint32Array | null;
  work: number;
  quickTime: boolean;
}

/** Decode a picture to an indexed image the size of its picFrame.
 * Throws PictError when it can't. */
export function decodePict(d: Uint8Array): IndexedImage {
  const base = pictStart(d);
  if (base < 0) throw new PictError("not a QuickDraw picture");
  const v1 = d[base + 10] === 0x11;
  const r = new Reader(d, base + 2);
  const frame = r.rect();
  const page: Page = { frame, w: frame.right - frame.left,
                       h: frame.bottom - frame.top, rgb: null, work: 0,
                       quickTime: false };
  checkSize(page.w, page.h, "picture");
  r.skip(v1 ? 2 : 4); // the version opcode pictStart matched
  for (let n = 0; ; n++) {
    if (n === MAX_OPCODES)
      throw new PictError(`picture has over ${MAX_OPCODES} opcodes`);
    if (!v1 && (r.p - base) & 1) r.skip(1);
    if (r.p >= d.length)
      throw new PictError("picture ends before its end opcode");
    const op = v1 ? r.u8() : r.u16();
    if (op === 0x00ff) break;
    if (BITS_OPS.has(op)) drawBits(r, op, page);
    else skipOp(r, op, v1, page);
  }
  if (!page.rgb)
    throw new PictError(page.quickTime
      ? "picture is QuickTime-compressed, which Finsical can't read"
      : "picture has no bitmap");
  return quantize(page.rgb, page.w, page.h);
}

/** BitsRect, BitsRgn, PackBitsRect, PackBitsRgn, DirectBitsRect and
 * DirectBitsRgn: the odd ones carry a mask region. */
const BITS_OPS = new Set([0x90, 0x91, 0x98, 0x99, 0x9a, 0x9b]);

/** Skip one non-bitmap opcode's data, by Appendix A's table. */
function skipOp(r: Reader, op: number, v1: boolean, page: Page): void {
  const word = () => r.skip(r.u16());
  if (op <= 0xff) {
    switch (op) {
      case 0x00: case 0x17: case 0x18: case 0x19: case 0x1c: case 0x1e:
        return;
      case 0x01: return skipRegion(r);
      case 0x04: return r.skip(1);
      case 0x03: case 0x05: case 0x08: case 0x0d: case 0x15: case 0x16:
      case 0x23: case 0xa0:
        return r.skip(2);
      case 0x06: case 0x07: case 0x0b: case 0x0c: case 0x0e: case 0x0f:
      case 0x21:
        return r.skip(4);
      case 0x1a: case 0x1b: case 0x1d: case 0x1f: case 0x22:
        return r.skip(6);
      case 0x02: case 0x09: case 0x0a: case 0x10: case 0x20:
        return r.skip(8);
      case 0x11: return r.skip(v1 ? 1 : 2); // a repeated version opcode
      case 0x12: case 0x13: case 0x14: return skipPixPat(r);
      case 0x28: r.skip(4); return r.skip(r.u8()); // LongText
      case 0x29: case 0x2a: r.skip(1); return r.skip(r.u8()); // DH/DVText
      case 0x2b: r.skip(2); return r.skip(r.u8()); // DHDVText
      case 0xa1: r.skip(2); return word(); // LongComment: kind, size, data
    }
    if (op >= 0x24 && op <= 0x2f) return word(); // fontName and reserved
    if (op >= 0x30 && op <= 0x6f) {
      // Rect, RRect, Oval and Arc families: the shape, then its "same"
      // forms with no data. Arcs add two angles; sameArc keeps them.
      const same = (op & 0x0f) >= 8;
      if (op >= 0x60) return r.skip(same ? 4 : 12);
      return same ? undefined : r.skip(8);
    }
    if (op >= 0x70 && op <= 0x8f) {
      // Polygons and regions: size word (counting itself) then data.
      if ((op & 0x0f) >= 8) return;
      const size = r.u16();
      if (size < 2) throw new PictError(`bad shape size in opcode ${hex(op)}`);
      return r.skip(size - 2);
    }
    if (op >= 0x92 && op <= 0xaf) return word();
    if (op >= 0xb0 && op <= 0xcf) return;
    if (op >= 0xd0) return r.skip(r.u32());
    // Only the bitmap opcodes are left, and decodePict draws those.
    throw new PictError(`unexpected opcode ${hex(op)}`);
  }
  if (op < 0x8000) return r.skip((op >> 8) * 2); // 0C00 HeaderOp is 24
  if (op < 0x8100) return;
  if (op === 0x8200 || op === 0x8201) page.quickTime = true;
  r.skip(r.u32());
}

const hex = (op: number): string =>
  op.toString(16).toUpperCase().padStart(4, "0");

function skipRegion(r: Reader): void {
  const size = r.u16();
  if (size < 10) throw new PictError("bad region size");
  r.skip(size - 2);
}

function skipColorTable(r: Reader): void {
  r.skip(6); // ctSeed, ctFlags
  const n = r.i16() + 1;
  if (n < 0 || n > MAX_CLUT) throw new PictError("bad color table");
  r.skip(n * 8);
}

/** Rows of a pattern or bitmap that carries no pixels we draw. */
function skipRows(r: Reader, rowBytes: number, rows: number): void {
  for (let y = 0; y < rows; y++)
    r.skip(rowBytes < 8 ? rowBytes : rowBytes > 250 ? r.u16() : r.u8());
}

/** BkPixPat, PnPixPat, FillPixPat: patType, the 8x8 1-bit pattern,
 * then an RGB color (ditherPat, 2) or a whole pixel map (1). */
function skipPixPat(r: Reader): void {
  const type = r.u16();
  r.skip(8);
  if (type === 2) return r.skip(6);
  if (type !== 1) throw new PictError(`unknown pattern type ${type}`);
  const rowBytes = r.u16() & 0x3fff;
  const b = r.rect();
  r.skip(36); // pmVersion through pmReserved; no baseAddr
  skipColorTable(r);
  const rows = b.bottom - b.top;
  if (rows < 0 || rows > MAX_SIDE) throw new PictError("bad pattern bounds");
  skipRows(r, rowBytes, rows);
}

/** Pixel value to 0xRRGGBB. A device table (ctFlags bit 15) indexes by
 * position; any other by each entry's value. Values the table lacks
 * draw black. */
function readColorTable(r: Reader, depth: number): Uint32Array {
  r.skip(4); // ctSeed
  const device = (r.u16() & 0x8000) !== 0;
  const n = r.i16() + 1;
  if (n < 0 || n > MAX_CLUT) throw new PictError("bad color table");
  const lut = new Uint32Array(1 << depth).fill(BLACK);
  for (let i = 0; i < n; i++) {
    const value = r.u16();
    const c = (r.u16() >> 8) << 16 | (r.u16() >> 8) << 8 | r.u16() >> 8;
    const at = device ? i : value;
    if (at < lut.length) lut[at] = c;
  }
  return lut;
}

/** A mask region: its bounding box, then (unless it is just that box)
 * scanlines of inversion points, each list ending in 7FFF. */
interface Region { box: Rect; rows: { y: number; xs: number[] }[] | null }

function readRegion(r: Reader): Region {
  const size = r.u16();
  if (size < 10) throw new PictError("bad region size");
  const end = r.p + size - 2;
  if (end > r.end) throw new PictError("picture is truncated");
  const box = r.rect();
  if (size === 10) return { box, rows: null };
  const sub = new Reader(r.d, r.p, end);
  const rows: { y: number; xs: number[] }[] = [];
  for (let y = sub.i16(); y !== 0x7fff; y = sub.i16()) {
    const xs: number[] = [];
    for (let x = sub.i16(); x !== 0x7fff; x = sub.i16()) xs.push(x);
    rows.push({ y, xs });
  }
  r.p = end;
  return { box, rows };
}

/** Inside flags of a region over columns x0..x1-1, a row at a time
 * in increasing y. A scanline's points flip the inside state from the
 * row above at each point onwards, so a row's state is the parity of
 * all points so far at or left of each column. */
class Mask {
  private readonly toggles: Uint8Array;
  private leftParity = 0;
  private next = 0;
  readonly inside: Uint8Array;
  constructor(private readonly rgn: Region, private readonly x0: number,
              x1: number) {
    this.toggles = new Uint8Array(x1 - x0);
    this.inside = new Uint8Array(x1 - x0);
  }
  row(y: number): Uint8Array {
    const { box, rows } = this.rgn;
    const n = this.inside.length;
    while (rows && this.next < rows.length && rows[this.next]!.y <= y) {
      for (const x of rows[this.next++]!.xs) {
        if (x < this.x0) this.leftParity ^= 1;
        else if (x - this.x0 < n) this.toggles[x - this.x0]! ^= 1;
      }
    }
    if (y < box.top || y >= box.bottom) return this.inside.fill(0);
    let on = rows ? this.leftParity : 0;
    for (let i = 0; i < n; i++) {
      const x = this.x0 + i;
      if (rows) on ^= this.toggles[i]!;
      this.inside[i] = (rows ? on : 1) &&
        x >= box.left && x < box.right ? 1 : 0;
    }
    return this.inside;
  }
}

/** How a bitmap's rows are stored and read back into colors. */
type Layout =
  | { kind: "indexed"; depth: number; lut: Uint32Array }
  | { kind: "mono" }
  | { kind: "rgb16" }
  | { kind: "xrgb" }          // 32-bit, packType 1
  | { kind: "rgb" }           // 32-bit, packType 2: pad byte removed
  | { kind: "planar"; cmpCount: number }; // 32-bit, packType 4

function drawBits(r: Reader, op: number, page: Page): void {
  const direct = op >= 0x9a;
  if (direct) r.skip(4); // baseAddr
  const rb = r.u16();
  const pixMap = (rb & 0x8000) !== 0;
  const rowBytes = rb & (pixMap ? 0x3fff : 0x7fff);
  const bounds = r.rect();
  const bw = bounds.right - bounds.left, bh = bounds.bottom - bounds.top;
  checkSize(bw, bh, "bitmap");
  let layout: Layout = { kind: "mono" };
  let packType = 0;
  if (pixMap) {
    r.skip(2); // pmVersion
    packType = r.u16();
    r.skip(14); // packSize, hRes, vRes, pixelType
    const depth = r.u16(), cmpCount = r.u16();
    r.skip(14); // cmpSize, planeBytes, pmTable, pmReserved
    layout = direct ? directLayout(depth, packType, cmpCount)
                    : { kind: "indexed", depth,
                        lut: indexedTable(r, depth) };
  } else if (direct) {
    throw new PictError("direct bits without a pixel map");
  }
  const src = r.rect(), dst = r.rect();
  r.skip(2); // transfer mode
  const mask = op & 1 ? readRegion(r) : null;

  const bpp = layout.kind === "indexed" ? layout.depth
    : layout.kind === "mono" ? 1 : layout.kind === "rgb16" ? 16 : 32;
  if (rowBytes < Math.ceil(bw * bpp / 8))
    throw new PictError(`rowBytes ${rowBytes} too small for ${bw} pixels`);

  // How rows are stored. BitsRect rows, and any row under 8 bytes, are
  // the pixel map's own rows (32-bit ones xRGB, whatever the
  // packType). packType 1 stores rows as they are too, packType 2 as
  // RGB without the pad byte. Everything else is PackBits, one row
  // after its byte count (a word once rowBytes passes 250): 16-bit
  // pixels by the word, packType 4 by the byte over the row's
  // components laid out one after another.
  let read = layout, len = rowBytes, packed = false;
  if (op <= 0x91 || rowBytes < 8) {
    if (layout.kind === "planar" || layout.kind === "rgb")
      read = { kind: "xrgb" };
  } else if (layout.kind === "rgb") {
    len = bw * 3;
  } else if (layout.kind === "planar") {
    len = bw * layout.cmpCount;
    packed = true;
  } else {
    packed = !(direct && packType === 1);
  }
  const unit = layout.kind === "rgb16" ? 2 : 1;

  // The destination, clipped to the page; source columns per column.
  const { frame } = page;
  const x0 = Math.max(dst.left, frame.left), x1 = Math.min(dst.right, frame.right);
  const y0 = Math.max(dst.top, frame.top), y1 = Math.min(dst.bottom, frame.bottom);
  const sw = src.right - src.left, sh = src.bottom - src.top;
  const dw = dst.right - dst.left, dh = dst.bottom - dst.top;
  const draws = x1 > x0 && y1 > y0 && sw > 0 && sh > 0 && dw > 0 && dh > 0;
  const cost = bw * bh + (draws ? (x1 - x0) * (y1 - y0) : 0);
  if (page.work + cost > MAX_WORK)
    throw new PictError("picture asks for too much drawing");
  page.work += cost;
  page.rgb ??= new Uint32Array(page.w * page.h).fill(WHITE);
  const rgb = page.rgb;

  const cols = new Int32Array(draws ? x1 - x0 : 0);
  for (let i = 0; i < cols.length; i++) {
    const sx = src.left + Math.floor((x0 + i - dst.left) * sw / dw) -
      bounds.left;
    cols[i] = sx >= 0 && sx < bw ? sx : -1;
  }
  const m = mask && draws ? new Mask(mask, x0, x1) : null;
  const row = new Uint8Array(len);
  const line = new Uint32Array(bw);
  let y = y0;
  for (let by = bounds.top; by < bounds.bottom; by++) {
    if (packed) unpackBits(r.bytes(rowBytes > 250 ? r.u16() : r.u8()),
                           row, unit);
    else row.set(r.bytes(len));
    if (!draws) continue;
    toColors(read, row, line, bw);
    for (; y < y1; y++) {
      const sy = src.top + Math.floor((y - dst.top) * sh / dh);
      if (sy > by) break;
      if (sy < by) continue; // above the bitmap's bounds
      const inside = m?.row(y);
      const out = (y - frame.top) * page.w - frame.left;
      for (let i = 0; i < cols.length; i++) {
        const sx = cols[i]!;
        if (sx >= 0 && (!inside || inside[i])) rgb[out + x0 + i] = line[sx]!;
      }
    }
  }
}

function indexedTable(r: Reader, depth: number): Uint32Array {
  if (depth !== 1 && depth !== 2 && depth !== 4 && depth !== 8)
    throw new PictError(`unsupported pixel size ${depth} with a color table`);
  return readColorTable(r, depth);
}

function directLayout(depth: number, packType: number,
                      cmpCount: number): Layout {
  if (depth === 16) {
    if (packType === 0 || packType === 1 || packType === 3)
      return { kind: "rgb16" };
  } else if (depth === 32) {
    if (packType === 1) return { kind: "xrgb" };
    if (packType === 2) return { kind: "rgb" };
    if (packType === 0 || packType === 4) {
      if (cmpCount !== 3 && cmpCount !== 4)
        throw new PictError(`unsupported component count ${cmpCount}`);
      return { kind: "planar", cmpCount };
    }
  } else {
    throw new PictError(`unsupported direct pixel size ${depth}`);
  }
  throw new PictError(`unsupported packType ${packType} for ${depth}-bit pixels`);
}

/** PackBits: flag n below 128 copies n + 1 units, n above 128 repeats
 * the next unit 257 - n times, 128 does nothing. `unit` is 2 for
 * 16-bit pixels. A row that runs long is cut at the row's end, one
 * that runs short leaves zeros. */
function unpackBits(src: Uint8Array, out: Uint8Array, unit: number): void {
  out.fill(0);
  let i = 0, o = 0;
  while (i < src.length && o < out.length) {
    const n = src[i++]!;
    if (n < 128) {
      const len = (n + 1) * unit;
      out.set(src.subarray(i, i + Math.min(len, out.length - o)), o);
      i += len;
      o += len;
    } else if (n > 128) {
      if (i + unit > src.length) break;
      for (let k = 257 - n; k > 0 && o < out.length; k--)
        for (let b = 0; b < unit && o < out.length; b++) out[o++] = src[i + b]!;
      i += unit;
    }
  }
}

/** Five bits of a 16-bit pixel's channel spread over eight. */
const widen5 = (v: number): number => (v << 3) | (v >> 2);

function toColors(l: Layout, row: Uint8Array, out: Uint32Array,
                  w: number): void {
  switch (l.kind) {
    case "indexed": {
      const { depth, lut } = l, mask = (1 << depth) - 1;
      for (let x = 0; x < w; x++) {
        const bit = x * depth;
        out[x] = lut[(row[bit >> 3]! >> (8 - depth - (bit & 7))) & mask]!;
      }
      return;
    }
    case "mono":
      for (let x = 0; x < w; x++)
        out[x] = (row[x >> 3]! >> (7 - (x & 7))) & 1 ? BLACK : WHITE;
      return;
    case "rgb16":
      for (let x = 0; x < w; x++) {
        const v = row[2 * x]! << 8 | row[2 * x + 1]!;
        out[x] = widen5(v >> 10 & 31) << 16 | widen5(v >> 5 & 31) << 8 |
          widen5(v & 31);
      }
      return;
    case "xrgb":
      for (let x = 0; x < w; x++)
        out[x] = row[4 * x + 1]! << 16 | row[4 * x + 2]! << 8 | row[4 * x + 3]!;
      return;
    case "rgb":
      for (let x = 0; x < w; x++)
        out[x] = row[3 * x]! << 16 | row[3 * x + 1]! << 8 | row[3 * x + 2]!;
      return;
    case "planar": {
      const r0 = l.cmpCount === 4 ? w : 0; // alpha plane first
      for (let x = 0; x < w; x++)
        out[x] = row[r0 + x]! << 16 | row[r0 + w + x]! << 8 |
          row[r0 + 2 * w + x]!;
      return;
    }
  }
}

/** Distinct colors median cut works on as they are. A picture with
 * more (a photo) is binned to 5 bits a channel first. */
const MAX_EXACT = 1 << 16;
/** 5-bit-a-channel bins: 32768 of them. */
const BINS = 1 << 15;
const binOf = (c: number): number =>
  (c >> 19 & 31) << 10 | (c >> 11 & 31) << 5 | (c >> 3 & 31);

/** The page as an indexed image, white at index 0. The other colors
 * keep their first-seen order while 255 entries hold them; past that,
 * median cut picks 255. */
function quantize(rgb: Uint32Array, w: number, h: number): IndexedImage {
  const seen = new Map<number, number>(); // color to its entry
  const cols: number[] = [], pops: number[] = [];
  let binned = false;
  for (const c of rgb) {
    if (c === WHITE) continue;
    const e = seen.get(c);
    if (e !== undefined) { pops[e]!++; continue; }
    if (cols.length === MAX_EXACT) { binned = true; break; }
    seen.set(c, cols.length);
    cols.push(c);
    pops.push(1);
  }
  const idx = new Uint8Array(w * h);
  if (!binned && cols.length <= 255) {
    for (let i = 0; i < rgb.length; i++)
      if (rgb[i] !== WHITE) idx[i] = seen.get(rgb[i]!)! + 1;
    return { w, h, idx, palette: [[255, 255, 255], ...cols.map(
      (c): [number, number, number] => [c >> 16, c >> 8 & 255, c & 255])] };
  }
  // Entries median cut sorts: the distinct colors, or the non-empty
  // bins (each at its center) when there are too many colors.
  let rep: Uint32Array, pop: Float64Array, sum: Float64Array;
  let entryOf: (c: number) => number;
  if (!binned) {
    rep = Uint32Array.from(cols);
    pop = Float64Array.from(pops);
    sum = new Float64Array(cols.length * 3);
    cols.forEach((c, e) => {
      sum[3 * e] = (c >> 16) * pops[e]!;
      sum[3 * e + 1] = (c >> 8 & 255) * pops[e]!;
      sum[3 * e + 2] = (c & 255) * pops[e]!;
    });
    entryOf = (c) => seen.get(c)!;
  } else {
    const count = new Float64Array(BINS), acc = new Float64Array(BINS * 3);
    for (const c of rgb) {
      if (c === WHITE) continue;
      const k = binOf(c);
      count[k]!++;
      acc[3 * k]! += c >> 16;
      acc[3 * k + 1]! += c >> 8 & 255;
      acc[3 * k + 2]! += c & 255;
    }
    const entryOfBin = new Int32Array(BINS);
    const reps: number[] = [], ps: number[] = [], sums: number[] = [];
    for (let k = 0; k < BINS; k++) {
      if (!count[k]) continue;
      entryOfBin[k] = reps.length;
      reps.push((k >> 10) << 19 | (k >> 5 & 31) << 11 | (k & 31) << 3 |
                0x040404);
      ps.push(count[k]!);
      sums.push(acc[3 * k]!, acc[3 * k + 1]!, acc[3 * k + 2]!);
    }
    rep = Uint32Array.from(reps);
    pop = Float64Array.from(ps);
    sum = Float64Array.from(sums);
    entryOf = (c) => entryOfBin[binOf(c)]!;
  }
  const { boxOf, n } = medianCut(rep, pop);
  const tot = new Float64Array(n * 4);
  boxOf.forEach((b, e) => {
    tot[4 * b]! += pop[e]!;
    for (let ch = 0; ch < 3; ch++) tot[4 * b + 1 + ch]! += sum[3 * e + ch]!;
  });
  const palette: [number, number, number][] = [[255, 255, 255]];
  for (let b = 0; b < n; b++) {
    const t = tot[4 * b]!;
    palette.push([Math.round(tot[4 * b + 1]! / t),
                  Math.round(tot[4 * b + 2]! / t),
                  Math.round(tot[4 * b + 3]! / t)]);
  }
  for (let i = 0; i < rgb.length; i++)
    if (rgb[i] !== WHITE) idx[i] = boxOf[entryOf(rgb[i]!)]! + 1;
  return { w, h, palette, idx };
}

/** Heckbert's median cut: the box of entries whose pixel count times
 * longest side is largest splits at its weighted median along that
 * side, until there are 255 boxes or none can split. Each split is a
 * histogram of that channel and a stable partition, so it costs the
 * box's size; ties go to the earlier box. Returns each entry's box
 * and how many boxes there are. */
function medianCut(rep: Uint32Array, pop: Float64Array):
    { boxOf: Uint8Array; n: number } {
  const chan = (e: number, ch: number): number =>
    rep[e]! >> (16 - 8 * ch) & 255;
  const order = new Int32Array(rep.length).map((_, i) => i);
  const scratch = new Int32Array(rep.length);
  interface Box { lo: number; hi: number; pop: number; ch: number;
                  min: number; max: number }
  const measure = (lo: number, hi: number): Box => {
    let total = 0;
    const min = [255, 255, 255], max = [0, 0, 0];
    for (let i = lo; i < hi; i++) {
      const e = order[i]!;
      total += pop[e]!;
      for (let ch = 0; ch < 3; ch++) {
        const v = chan(e, ch);
        if (v < min[ch]!) min[ch] = v;
        if (v > max[ch]!) max[ch] = v;
      }
    }
    let ch = 0;
    for (let c = 1; c < 3; c++)
      if (max[c]! - min[c]! > max[ch]! - min[ch]!) ch = c;
    return { lo, hi, pop: total, ch, min: min[ch]!, max: max[ch]! };
  };
  const boxes: Box[] = rep.length ? [measure(0, rep.length)] : [];
  const hist = new Float64Array(256);
  while (boxes.length < 255) {
    let best = -1, score = 0;
    boxes.forEach((b, i) => {
      const s = b.hi - b.lo > 1 ? b.pop * (b.max - b.min + 1) : 0;
      if (s > score) { score = s; best = i; }
    });
    if (best < 0) break;
    const b = boxes[best]!;
    hist.fill(0);
    for (let i = b.lo; i < b.hi; i++) hist[chan(order[i]!, b.ch)]! += pop[order[i]!]!;
    // The weighted median, kept below the box's top so both halves
    // hold entries: the box spans at least two values here.
    let cut = b.min, acc = hist[cut]!;
    while (acc * 2 < b.pop && cut < b.max - 1) acc += hist[++cut]!;
    let l = b.lo, r = 0;
    for (let i = b.lo; i < b.hi; i++) {
      const e = order[i]!;
      if (chan(e, b.ch) <= cut) order[l++] = e;
      else scratch[r++] = e;
    }
    order.set(scratch.subarray(0, r), l);
    boxes.splice(best, 1, measure(b.lo, l), measure(l, b.hi));
  }
  const boxOf = new Uint8Array(rep.length);
  boxes.forEach((b, i) => {
    for (let j = b.lo; j < b.hi; j++) boxOf[order[j]!] = i;
  });
  return { boxOf, n: boxes.length };
}
