// Bitmap strikes (the classic Mac 'FONT' idea: fixed-size pixel
// glyphs with per-glyph advance and origin offset) and the QuickDraw
// rules applied on top of them. Pure data transforms — ttf.ts turns
// the result into a font the browser can load.
import type { PixelGlyph } from "./ttf.js";

/** [code point, advance, lsb, top, width, rows] — see fonts/*.ts. */
export type StrikeEntry = readonly [number, number, number, number, number,
                                    string];

export interface StrikeData {
  family: string;
  sizePx: number;
  ascent: number;
  descent: number;
  glyphs: readonly StrikeEntry[];
}

/** Decode a strike's compact hex rows into bit-mask glyphs. */
export function strikeGlyphs(data: StrikeData): PixelGlyph[] {
  return data.glyphs.map(([codepoint, advance, lsb, top, width, hex]) => {
    const digits = Math.ceil(width / 4);
    const rows: number[] = [];
    for (let i = 0; digits && i < hex.length; i += digits) {
      rows.push(parseInt(hex.slice(i, i + digits), 16) >>
                (digits * 4 - width));
    }
    return { codepoint, advance, lsb, top, width, rows };
  });
}

/** QuickDraw's synthesized bold: every glyph is drawn twice, the
 * second copy one pixel to the right, and every advance grows by one
 * pixel. Mac OS 8 draws bold Geneva this way (no bold strike exists),
 * e.g. the labels of Get Info and About This Computer. */
export function emboldened(glyphs: readonly PixelGlyph[]): PixelGlyph[] {
  return glyphs.map((g) => ({
    ...g,
    advance: g.advance + 1,
    width: g.width ? g.width + 1 : 0,
    rows: g.rows.map((r) => (r << 1) | r),
  }));
}
