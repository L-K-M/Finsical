// Minimal TrueType writer for bitmap ("pixel") fonts. Each set pixel
// becomes a square of font units, so at the font's nominal CSS size
// one font pixel is exactly one CSS pixel and glyph edges land on the
// device-pixel grid — the text renders as crisp as the original
// QuickDraw bitmap strike, with ordinary DOM text layout, selection
// and accessibility. Pure function over bytes: no DOM, testable in
// node. The output carries only the tables browsers require (OTS in
// Chromium, CoreText in WebKit): no hinting, no kerning, no names
// beyond the family/style set.

/** One glyph of a bitmap strike, in pixels. `rows[0]` is the topmost
 * ink row, `top` rows above the baseline row (the row a capital's
 * bottom edge sits on is row 0; descenders go negative). Each row is
 * a bit mask, most significant of `width` bits = leftmost pixel. */
export interface PixelGlyph {
  codepoint: number;
  advance: number;
  lsb: number;
  top: number;
  width: number;
  rows: readonly number[];
}

export interface PixelFontSpec {
  family: string;
  bold: boolean;
  /** Nominal size in px: at `font-size: <sizePx>px` one font pixel is
   * one CSS pixel. */
  sizePx: number;
  /** Line metrics in px — ascent above the baseline, descent below.
   * Integers, so CSS line boxes put the baseline on a pixel row. */
  ascent: number;
  descent: number;
  glyphs: readonly PixelGlyph[];
}

/** Font units per font pixel. 128 keeps every coordinate a small
 * integer while leaving unitsPerEm (sizePx * 128) well inside the
 * format's 16..16384 range for any plausible strike size. */
const UNITS_PER_PIXEL = 128;

/** head.created/modified: 1997-07-26, Mac OS 8.0's release, in the
 * format's seconds-since-1904 (the high 32 bits stay zero). */
const MAC_OS_8_RELEASE = 2952720000;

/** Widest glyph a row bit mask can hold (JS shifts are 32-bit). */
const MAX_WIDTH = 32;

interface Rect { x0: number; x1: number; y0: number; y1: number }

/** Partition a glyph's pixels into rectangles: horizontal runs, merged
 * downward while the run below is identical. The rectangles never
 * overlap, so the nonzero fill of their union is exactly the bitmap. */
export function glyphRects(g: PixelGlyph): Rect[] {
  const done: Rect[] = [];
  let open: Rect[] = [];
  g.rows.forEach((bits, r) => {
    const runs: [number, number][] = [];
    for (let x = 0; x < g.width; x++) {
      if (!((bits >> (g.width - 1 - x)) & 1)) continue;
      const last = runs[runs.length - 1];
      if (last && last[1] === x) last[1] = x + 1;
      else runs.push([x, x + 1]);
    }
    // Pixel rows count downward from `top`; y is up in font space.
    const yTop = g.top + 1 - r;
    const next: Rect[] = [];
    for (const [x0, x1] of runs) {
      const i = open.findIndex((o) => o.x0 === x0 && o.x1 === x1);
      if (i >= 0) {
        const o = open.splice(i, 1)[0]!;
        o.y0 = yTop - 1;
        next.push(o);
      } else {
        next.push({ x0, x1, y0: yTop - 1, y1: yTop });
      }
    }
    done.push(...open);
    open = next;
  });
  done.push(...open);
  return done.map((q) => ({
    x0: q.x0 + g.lsb, x1: q.x1 + g.lsb, y0: q.y0, y1: q.y1,
  }));
}

class Writer {
  private bytes: number[] = [];
  get length(): number { return this.bytes.length; }
  u8(v: number): this { this.bytes.push(v & 0xff); return this; }
  u16(v: number): this { return this.u8(v >> 8).u8(v); }
  i16(v: number): this { return this.u16(v < 0 ? v + 0x10000 : v); }
  u32(v: number): this { return this.u16(v >>> 16).u16(v & 0xffff); }
  tag(t: string): this {
    for (let i = 0; i < 4; i++) this.u8(t.charCodeAt(i));
    return this;
  }
  raw(b: ArrayLike<number>): this {
    for (let i = 0; i < b.length; i++) this.u8(b[i]!);
    return this;
  }
  pad4(): this { while (this.bytes.length % 4) this.u8(0); return this; }
  out(): Uint8Array { return Uint8Array.from(this.bytes); }
}

function checksum(b: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < b.length; i += 4) {
    sum = (sum + (((b[i] ?? 0) << 24) | ((b[i + 1] ?? 0) << 16) |
                  ((b[i + 2] ?? 0) << 8) | (b[i + 3] ?? 0))) >>> 0;
  }
  return sum;
}

function utf16be(s: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    out.push(c >> 8, c & 0xff);
  }
  return out;
}

/** cmap format 4 over the BMP code points, one segment per run of
 * consecutive code points with consecutive glyph ids. */
function cmapTable(cps: number[]): Uint8Array {
  const segs: { start: number; end: number; delta: number }[] = [];
  cps.forEach((cp, i) => {
    const gid = i + 1;
    const last = segs[segs.length - 1];
    if (last && cp === last.end + 1 && gid - cp === last.delta) last.end = cp;
    else segs.push({ start: cp, end: cp, delta: gid - cp });
  });
  segs.push({ start: 0xffff, end: 0xffff, delta: 1 });
  const n = segs.length;
  const pow = 2 ** Math.floor(Math.log2(n));
  const sub = new Writer()
    .u16(4).u16(16 + 8 * n).u16(0)
    .u16(n * 2).u16(pow * 2).u16(Math.log2(pow)).u16((n - pow) * 2);
  for (const s of segs) sub.u16(s.end);
  sub.u16(0);
  for (const s of segs) sub.u16(s.start);
  for (const s of segs) sub.u16((s.delta + 0x10000) & 0xffff);
  for (let i = 0; i < n; i++) sub.u16(0);
  const body = sub.out();
  // Unicode BMP (0,3) and Windows BMP (3,1) share one subtable.
  return new Writer().u16(0).u16(2)
    .u16(0).u16(3).u32(20).u16(3).u16(1).u32(20)
    .raw(body).out();
}

function nameTable(family: string, style: string): Uint8Array {
  const ps = `${family}-${style}`.replace(/[^A-Za-z0-9-]/g, "");
  const names: [number, string][] = [
    [1, family], [2, style], [3, ps], [4, `${family} ${style}`], [6, ps],
  ];
  const strings = names.map(([, s]) => utf16be(s));
  const w = new Writer().u16(0).u16(names.length).u16(6 + 12 * names.length);
  let off = 0;
  names.forEach(([id], i) => {
    const len = strings[i]!.length;
    w.u16(3).u16(1).u16(0x409).u16(id).u16(len).u16(off);
    off += len;
  });
  for (const s of strings) w.raw(s);
  return w.out();
}

/** Build a TrueType font whose outlines are the strike's pixels. Code
 * points outside the BMP are not supported (the Mac Roman repertoire
 * plus a few arrows never needs them). */
export function buildPixelFont(spec: PixelFontSpec): Uint8Array {
  const U = UNITS_PER_PIXEL;
  const glyphs = [...spec.glyphs].sort((a, b) => a.codepoint - b.codepoint);
  glyphs.forEach((g, i) => {
    if (g.codepoint < 0x20 || g.codepoint > 0xfffd)
      throw new RangeError(`code point ${g.codepoint} outside the BMP`);
    // A second glyph for one code point would be unreachable in cmap.
    if (g.codepoint === glyphs[i - 1]?.codepoint)
      throw new RangeError(`duplicate code point ${g.codepoint}`);
    // Row masks are read with 32-bit shifts.
    if (g.width > MAX_WIDTH)
      throw new RangeError(`glyph ${g.codepoint} is ${g.width}px wide; ` +
                           `rows hold at most ${MAX_WIDTH}`);
  });
  const upem = spec.sizePx * U;
  const asc = spec.ascent * U;
  const desc = spec.descent * U;
  const style = spec.bold ? "Bold" : "Regular";

  // glyf/loca/hmtx. Glyph 0 (.notdef) is empty: cmap never maps to it,
  // so missing characters fall through to the next CSS font instead of
  // drawing a box.
  const glyf = new Writer();
  const loca: number[] = [0];
  const hmtx = new Writer().u16(0).i16(0);
  let xMin = 0, yMin = 0, xMax = 0, yMax = 0, advMax = 0;
  let minLsb = 0, minRsb = 0, maxExtent = 0, maxPts = 0, maxCtr = 0;
  let first = true;
  for (const g of glyphs) {
    const rects = glyphRects(g);
    advMax = Math.max(advMax, g.advance * U);
    if (!rects.length) {
      hmtx.u16(g.advance * U).i16(0);
      loca.push(glyf.length);
      continue;
    }
    const gx0 = Math.min(...rects.map((q) => q.x0)) * U;
    const gx1 = Math.max(...rects.map((q) => q.x1)) * U;
    const gy0 = Math.min(...rects.map((q) => q.y0)) * U;
    const gy1 = Math.max(...rects.map((q) => q.y1)) * U;
    if (first) { xMin = gx0; xMax = gx1; yMin = gy0; yMax = gy1; }
    xMin = Math.min(xMin, gx0); xMax = Math.max(xMax, gx1);
    yMin = Math.min(yMin, gy0); yMax = Math.max(yMax, gy1);
    minLsb = first ? gx0 : Math.min(minLsb, gx0);
    const rsb = g.advance * U - gx1;
    minRsb = first ? rsb : Math.min(minRsb, rsb);
    maxExtent = Math.max(maxExtent, gx1);
    first = false;
    maxPts = Math.max(maxPts, rects.length * 4);
    maxCtr = Math.max(maxCtr, rects.length);
    hmtx.u16(g.advance * U).i16(gx0);

    glyf.i16(rects.length).i16(gx0).i16(gy0).i16(gx1).i16(gy1);
    rects.forEach((_, i) => glyf.u16(i * 4 + 3));
    glyf.u16(0); // no instructions
    // Clockwise contours, every point on-curve, coordinates as 16-bit
    // deltas (flag 0x01 alone: not short, not same-as-previous).
    const pts: [number, number][] = [];
    for (const q of rects) {
      pts.push([q.x0 * U, q.y1 * U], [q.x1 * U, q.y1 * U],
               [q.x1 * U, q.y0 * U], [q.x0 * U, q.y0 * U]);
    }
    for (let i = 0; i < pts.length; i++) glyf.u8(0x01);
    let px = 0, py = 0;
    for (const [x] of pts) { glyf.i16(x - px); px = x; }
    for (const [, y] of pts) { glyf.i16(y - py); py = y; }
    glyf.pad4();
    loca.push(glyf.length);
  }
  loca.splice(1, 0, 0); // .notdef occupies no glyf bytes
  const numGlyphs = glyphs.length + 1;
  const locaW = new Writer();
  for (const o of loca) locaW.u32(o);

  const head = new Writer()
    .u32(0x00010000).u32(0x00010000).u32(0) // version, revision, adjust
    .u32(0x5f0f3cf5).u16(0x0003).u16(upem)
    .u32(0).u32(MAC_OS_8_RELEASE).u32(0).u32(MAC_OS_8_RELEASE)
    .i16(xMin).i16(yMin).i16(xMax).i16(yMax)
    .u16(spec.bold ? 1 : 0).u16(8).i16(2).i16(1).i16(0);
  const hhea = new Writer()
    .u32(0x00010000).i16(asc).i16(-desc).i16(0).u16(advMax)
    .i16(minLsb).i16(minRsb).i16(maxExtent)
    .i16(1).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0).i16(0)
    .u16(numGlyphs);
  const maxp = new Writer()
    .u32(0x00010000).u16(numGlyphs).u16(maxPts).u16(maxCtr)
    .u16(0).u16(0).u16(2).u16(0).u16(0).u16(0).u16(0).u16(0).u16(0)
    .u16(0).u16(0);
  const cps = glyphs.map((g) => g.codepoint);
  const avg = Math.round(glyphs.reduce((a, g) => a + g.advance, 0) /
                         Math.max(1, glyphs.length) * U);
  const capH = (glyphs.find((g) => g.codepoint === 0x48)?.top ?? 0) + 1;
  const xH = (glyphs.find((g) => g.codepoint === 0x78)?.top ?? 0) + 1;
  const os2 = new Writer()
    .u16(4).i16(avg).u16(spec.bold ? 700 : 400).u16(5).u16(0)
    .i16(upem >> 1).i16(upem >> 1).i16(0).i16(upem >> 3)   // subscript
    .i16(upem >> 1).i16(upem >> 1).i16(0).i16(upem >> 2)   // superscript
    .i16(U).i16(capH * U >> 1)                              // strikeout
    .i16(0).raw(new Array(10).fill(0))                      // class, panose
    .u32(0b11).u32(0).u32(0).u32(0)                         // Latin + Latin-1
    .tag("    ")
    .u16((spec.bold ? 0x20 : 0x40) | 0x80)                 // USE_TYPO_METRICS
    .u16(Math.min(...cps)).u16(Math.max(...cps))
    .i16(asc).i16(-desc).i16(0).u16(asc).u16(desc)
    .u32(1).u32(0)                                          // Latin 1 code page
    .i16(xH * U).i16(capH * U).u16(0).u16(0x20).u16(1);
  const post = new Writer()
    .u32(0x00030000).u32(0).i16(-U).i16(U).u32(0)
    .u32(0).u32(0).u32(0).u32(0);

  const tables: [string, Uint8Array][] = [
    ["OS/2", os2.out()], ["cmap", cmapTable(cps)], ["glyf", glyf.out()],
    ["head", head.out()], ["hhea", hhea.out()], ["hmtx", hmtx.out()],
    ["loca", locaW.out()], ["maxp", maxp.out()],
    ["name", nameTable(spec.family, style)], ["post", post.out()],
  ];
  const n = tables.length;
  const pow = 2 ** Math.floor(Math.log2(n));
  const font = new Writer()
    .u32(0x00010000).u16(n).u16(pow * 16).u16(Math.log2(pow))
    .u16(n * 16 - pow * 16);
  let offset = 12 + 16 * n;
  for (const [tag, data] of tables) {
    font.tag(tag).u32(checksum(data)).u32(offset).u32(data.length);
    offset += (data.length + 3) & ~3;
  }
  for (const [, data] of tables) font.raw(data).pad4();
  const bytes = font.out();
  // head.checkSumAdjustment makes the whole-file checksum 0xB1B0AFBA.
  const headAt = 12 + 16 * n + tables.slice(0, 3)
    .reduce((a, [, d]) => a + ((d.length + 3) & ~3), 0);
  const adjust = (0xb1b0afba - checksum(bytes)) >>> 0;
  new DataView(bytes.buffer).setUint32(headAt + 8, adjust);
  return bytes;
}
