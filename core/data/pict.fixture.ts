/** Shared test builder for QuickDraw pictures (see pict.ts). It writes
 * the layouts of "Inside Macintosh: Imaging With QuickDraw", Appendix
 * A, so the decoder's tests need no real Mac files. */

export interface Rect { top: number; left: number; bottom: number;
                        right: number }

export const rect = (top: number, left: number, bottom: number,
                     right: number): Rect => ({ top, left, bottom, right });

/** A mask region: a rectangle (`rows` absent) or QuickDraw's
 * inversion-point form, one entry per changed scanline. */
export interface Region { box: Rect; rows?: { y: number; xs: number[] }[] }

interface Placed {
  /** Pixel-map bounds; defaults to (0, 0, h, w). */
  bounds?: Rect;
  src?: Rect;
  dst?: Rect;
  /** Turns 0090/0098/009A into their Rgn forms 0091/0099/009B. */
  rgn?: Region;
  rowBytes?: number;
  /** PackBits encoder for packed rows: runs where they pay, or
   * literals only. */
  encode?: "auto" | "literal";
  mode?: number;
}

/** A color-table pixel map (0090/0098 or their Rgn forms). */
export interface IndexedBits extends Placed {
  kind: "indexed";
  packed?: boolean;
  /** 1, 2, 4 or 8; others write formats QuickDraw doesn't. */
  depth: number;
  w: number;
  h: number;
  /** Row-major pixel values. */
  px: number[];
  /** 8-bit colors in table order. */
  clut: [number, number, number][];
  /** ctFlags bit 15: entries index by position. Otherwise each entry
   * carries its pixel value: `values`, or its position. */
  device?: boolean;
  values?: number[];
  packType?: number;
}

/** A 1-bit BitMap: no color table, 1 is black. */
export interface MonoBits extends Placed {
  kind: "mono";
  packed?: boolean;
  w: number;
  h: number;
  px: number[];
}

/** A direct-color pixel map (009A/009B). */
export interface DirectBits extends Placed {
  kind: "direct";
  /** 16 or 32; others write formats QuickDraw doesn't. */
  depth: number;
  packType: number;
  cmpCount?: number;
  w: number;
  h: number;
  /** Row-major 0xRRGGBB; 16-bit keeps the top 5 bits per channel. */
  px: number[];
}

/** Bytes written verbatim after word alignment (v2): an opcode and
 * its data. */
export interface RawOp { kind: "raw"; bytes: number[] }

/** A QuickTime-compressed image (8200, version 2 only) in QuickTime's
 * BMP codec, laid out as the Mac plant add-ons' art is: a BMP's pixel
 * array, the bottom row first and each row padded to four bytes,
 * behind an image description that carries the color table. */
export interface QuickTimeBits {
  kind: "quicktime";
  w: number;
  h: number;
  /** Row-major pixel values, top row first. */
  px: number[];
  /** 8-bit colors in table order. */
  clut: [number, number, number][];
  /** The part of the image drawn; defaults to all of it. */
  src?: Rect;
  /** The matrix's translation in whole pixels. */
  dx?: number;
  dy?: number;
  /** Overrides, for what the decoder refuses. */
  codec?: string;
  depth?: number;
  matrix?: number[];
  matteSize?: number;
  dataSize?: number;
}

export type Op = IndexedBits | MonoBits | DirectBits | RawOp | QuickTimeBits;

const be16 = (v: number): number[] => [(v >> 8) & 0xff, v & 0xff];
const be32 = (v: number): number[] =>
  [(v >>> 24) & 0xff, (v >> 16) & 0xff, (v >> 8) & 0xff, v & 0xff];
const rectBytes = (r: Rect): number[] =>
  [...be16(r.top), ...be16(r.left), ...be16(r.bottom), ...be16(r.right)];

/** PackBits: flag n < 128 copies n + 1 literal units, 129..255 repeats
 * the next unit 257 - n times. `unit` 2 packs 16-bit words. */
export function packBits(src: number[], unit: 1 | 2 = 1,
                         encode: "auto" | "literal" = "auto"): number[] {
  const n = src.length / unit;
  const at = (i: number) => src.slice(i * unit, i * unit + unit);
  const same = (i: number, j: number) =>
    at(i).every((b, k) => b === src[j * unit + k]);
  const out: number[] = [];
  let i = 0;
  while (i < n) {
    let run = 1;
    while (encode === "auto" && i + run < n && run < 128 && same(i, i + run))
      run++;
    if (run >= 3) {
      out.push(257 - run, ...at(i));
      i += run;
      continue;
    }
    let j = i;
    while (j < n && j - i < 128) {
      if (encode === "auto" && j + 2 < n && same(j, j + 1) && same(j, j + 2))
        break;
      j++;
    }
    out.push(j - i - 1);
    for (let k = i; k < j; k++) out.push(...at(k));
    i = j;
  }
  return out;
}

function regionBytes(r: Region): number[] {
  const body: number[] = [];
  for (const row of r.rows ?? []) {
    body.push(...be16(row.y));
    for (const x of row.xs) body.push(...be16(x));
    body.push(...be16(0x7fff));
  }
  if (r.rows) body.push(...be16(0x7fff));
  return [...be16(10 + body.length), ...rectBytes(r.box), ...body];
}

const evenUp = (n: number) => n + (n & 1);

function pixMapFields(o: { packType: number; depth: number;
                           pixelType: number; cmpCount: number;
                           cmpSize: number }): number[] {
  return [...be16(0), ...be16(o.packType), ...be32(0),   // pmVersion..packSize
          ...be32(72 << 16), ...be32(72 << 16),          // hRes, vRes
          ...be16(o.pixelType), ...be16(o.depth),
          ...be16(o.cmpCount), ...be16(o.cmpSize),
          ...be32(0), ...be32(0), ...be32(0)];           // planeBytes..reserved
}

function rows(op: Placed & { w: number; h: number }, rowBytes: number,
              packed: boolean, rowData: (y: number) => number[],
              unit: 1 | 2 = 1): number[] {
  const out: number[] = [];
  for (let y = 0; y < op.h; y++) {
    const raw = rowData(y);
    if (!packed || rowBytes < 8) { out.push(...raw); continue; }
    const enc = packBits(raw, unit, op.encode ?? "auto");
    out.push(...(rowBytes > 250 ? be16(enc.length) : [enc.length]), ...enc);
  }
  return out;
}

function placement(op: Placed & { w: number; h: number }): number[] {
  const bounds = op.bounds ?? rect(0, 0, op.h, op.w);
  const out = [...rectBytes(op.src ?? bounds), ...rectBytes(op.dst ?? bounds),
               ...be16(op.mode ?? 0)];
  if (op.rgn) out.push(...regionBytes(op.rgn));
  return out;
}

function packIndexRow(px: number[], w: number, depth: number,
                      rowBytes: number, y: number): number[] {
  const row = new Array<number>(rowBytes).fill(0);
  for (let x = 0; x < w; x++) {
    const v = px[y * w + x]! & ((1 << depth) - 1);
    const bit = x * depth;
    row[bit >> 3]! |= v << (8 - depth - (bit & 7));
  }
  return row;
}

function bitsOp(op: IndexedBits | MonoBits | DirectBits, v2: boolean):
    number[] {
  const bounds = op.bounds ?? rect(0, 0, op.h, op.w);
  if (op.kind === "direct") {
    const cmp = op.cmpCount ?? 3;
    const rowBytes = op.rowBytes ?? (op.depth === 32 ? op.w * 4
                                                     : evenUp(op.w * 2));
    const pt = op.packType === 0 ? (op.depth === 16 ? 3 : 4) : op.packType;
    const line = (y: number) => op.px.slice(y * op.w, (y + 1) * op.w);
    // The pixel map's own row: 16-bit words or xRGB, padded to rowBytes.
    const own = (y: number): number[] => {
      const out = new Array<number>(rowBytes).fill(0);
      line(y).forEach((c, x) => {
        if (op.depth === 32) {
          out[4 * x + 1] = c >> 16 & 255; out[4 * x + 2] = c >> 8 & 255;
          out[4 * x + 3] = c & 255;
          return;
        }
        const v = ((c >> 19) & 31) << 10 | ((c >> 11) & 31) << 5 |
          ((c >> 3) & 31);
        out[2 * x] = v >> 8; out[2 * x + 1] = v & 0xff;
      });
      return out;
    };
    const planar = (y: number): number[] => {
      const planes: ((c: number) => number)[] = [
        ...(cmp === 4 ? [() => 0] : []),
        (c) => c >> 16 & 255, (c) => c >> 8 & 255, (c) => c & 255];
      return planes.flatMap((f) => line(y).map((c) => f(c)));
    };
    const all = (f: (y: number) => number[]) =>
      Array.from({ length: op.h }, (_, y) => f(y)).flat();
    // packType 2 keeps three bytes of every four, padding included.
    const rgb = (y: number) => {
      const out = new Array<number>(Math.floor(rowBytes * 3 / 4)).fill(0);
      line(y).forEach((c, x) => out.splice(3 * x, 3, c >> 16 & 255,
                                            c >> 8 & 255, c & 255));
      return out;
    };
    const pixels = rowBytes < 8 || pt === 1 ? all(own)
      : pt === 2 ? all(rgb)
      : op.depth === 16 ? rows(op, rowBytes, true, own, 2)
      : rows(op, rowBytes, true, planar);
    return [...be16(op.rgn ? 0x9b : 0x9a), ...be32(0xff),
            ...be16(rowBytes | 0x8000), ...rectBytes(bounds),
            ...pixMapFields({ packType: op.packType, depth: op.depth,
                              pixelType: 16, cmpCount: cmp,
                              cmpSize: op.depth === 16 ? 5 : 8 }),
            ...placement(op), ...pixels];
  }
  const depth = op.kind === "mono" ? 1 : op.depth;
  const rowBytes = op.rowBytes ?? evenUp(Math.ceil(op.w * depth / 8));
  const packed = op.packed ?? true;
  const code = (packed ? 0x98 : 0x90) + (op.rgn ? 1 : 0);
  const head = v2 ? be16(code) : [code];
  const pixels = rows(op, rowBytes, packed,
                      (y) => packIndexRow(op.px, op.w, depth, rowBytes, y));
  if (op.kind === "mono")
    return [...head, ...be16(rowBytes), ...rectBytes(bounds),
            ...placement(op), ...pixels];
  const table = op.clut.flatMap(([r, g, b], i) =>
    [...be16(op.device ? 0 : op.values?.[i] ?? i),
     ...be16(r * 257), ...be16(g * 257), ...be16(b * 257)]);
  return [...head, ...be16(rowBytes | 0x8000), ...rectBytes(bounds),
          ...pixMapFields({ packType: op.packType ?? 0, depth,
                            pixelType: 0, cmpCount: 1, cmpSize: depth }),
          ...be32(0), ...be16(op.device ? 0x8000 : 0),
          ...be16((op.clut.length - 1) & 0xffff), ...table,
          ...placement(op), ...pixels];
}

const ascii = (s: string): number[] => [...s].map((c) => c.charCodeAt(0));

function quickTimeOp(op: QuickTimeBits): number[] {
  const { w, h } = op;
  const stride = (w + 3) & ~3;
  const rows: number[] = [];
  for (let y = h - 1; y >= 0; y--)
    for (let x = 0; x < stride; x++)
      rows.push(x < w ? op.px[y * w + x]! : 0xff);
  const table = op.clut.flatMap(([r, g, b], i) =>
    [...be16(i), ...be16(r * 257), ...be16(g * 257), ...be16(b * 257)]);
  // The codec's own atoms as the plant forks carry them, then their end.
  const atoms = [...be32(12), ...ascii("bmp "), ...be32(0),
                 ...be32(9), ...ascii("bmp1"), 1, ...be32(0)];
  const name = [3, ...ascii("BMP"), ...new Array<number>(28).fill(0)];
  const desc = [...be32(0), ...ascii(op.codec ?? "WRLE"), ...be32(0),
    ...be16(0), ...be16(0), ...be16(0), ...be16(0), ...ascii("appl"),
    ...be32(0), ...be32(0x400), ...be16(w), ...be16(h),
    ...be32(72 << 16), ...be32(72 << 16), ...be32(op.dataSize ?? stride * h),
    ...be16(1), ...name, ...be16(op.depth ?? 8), ...be16(0),
    ...be32(0), ...be16(0), ...be16((op.clut.length - 1) & 0xffff),
    ...table, ...atoms];
  desc.splice(0, 4, ...be32(desc.length));
  const matrix = op.matrix ?? [0x10000, 0, 0, 0, 0x10000, 0,
    (op.dx ?? 0) * 0x10000, (op.dy ?? 0) * 0x10000, 0x40000000];
  const head = [...be16(0), ...matrix.flatMap(be32), ...be32(op.matteSize ?? 0),
    ...rectBytes(rect(0, 0, 0, 0)), ...be16(0x40),
    ...rectBytes(op.src ?? rect(0, 0, h, w)), ...be32(0x300), ...be32(0)];
  // The plant forks' opcodes count a pad byte past the pixels.
  const body = [...head, ...desc, ...rows, 0];
  return [0x82, 0x00, ...be32(body.length), ...body];
}

export interface PictSpec {
  version?: 1 | 2;
  frame: Rect;
  ops: Op[];
  /** A data-fork file: 512 header bytes before the picture. */
  file?: boolean;
  /** Leave off the closing 00FF. */
  noEnd?: boolean;
}

/** A complete picture. Version 2 gets the standard 0011 02FF and an
 * extended HeaderOp; each opcode starts word-aligned. */
export function buildPict(spec: PictSpec): Uint8Array {
  const v2 = (spec.version ?? 2) === 2;
  const pic: number[] = [...be16(0), ...rectBytes(spec.frame)];
  const align = () => { if (v2 && pic.length & 1) pic.push(0); };
  if (v2) {
    pic.push(0x00, 0x11, 0x02, 0xff, 0x0c, 0x00, ...be16(0xfffe),
             ...be16(0), ...be32(72 << 16), ...be32(72 << 16),
             ...rectBytes(spec.frame), ...be32(0));
  } else pic.push(0x11, 0x01);
  for (const op of spec.ops) {
    align();
    // A loop, not push(...): a long run of raw NOPs would pass more
    // arguments than a call takes.
    const bytes = op.kind === "raw" ? op.bytes
      : op.kind === "quicktime" ? quickTimeOp(op) : bitsOp(op, v2);
    for (const b of bytes) pic.push(b);
  }
  if (!spec.noEnd) { align(); pic.push(...(v2 ? [0x00, 0xff] : [0xff])); }
  const size = pic.length;
  pic[0] = (size >> 8) & 0xff; pic[1] = size & 0xff;
  const out = new Uint8Array((spec.file ? 512 : 0) + pic.length);
  out.set(pic, spec.file ? 512 : 0);
  return out;
}
