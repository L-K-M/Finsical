import { describe, expect, it } from "vitest";
import { emboldened, strikeGlyphs } from "./bitmapfont.js";
import { CHARCOAL_12 } from "./fonts/charcoal12.js";
import { GENEVA_10 } from "./fonts/geneva10.js";
import { buildPixelFont, glyphRects } from "./ttf.js";
import type { PixelGlyph } from "./ttf.js";

/** Rasterize `text` the way QuickDraw's DrawString lays out a strike:
 * pen advances by each glyph's advance, ink starts at pen + lsb. Rows
 * [baseline - above, baseline + below] as '#'/'.' strings. */
function draw(glyphs: PixelGlyph[], text: string, above: number,
              below: number): string[] {
  const map = new Map(glyphs.map((g) => [g.codepoint, g]));
  const width = [...text].reduce((a, c) => a + map.get(c.codePointAt(0)!)!
    .advance, 0);
  const rows = Array.from({ length: above + below + 1 },
                          () => Array<string>(width).fill("."));
  let pen = 0;
  for (const c of text) {
    const g = map.get(c.codePointAt(0)!)!;
    g.rows.forEach((bits, r) => {
      for (let x = 0; x < g.width; x++) {
        if ((bits >> (g.width - 1 - x)) & 1)
          rows[above - g.top + r]![pen + g.lsb + x] = "#";
      }
    });
    pen += g.advance;
  }
  return rows.map((r) => r.join(""));
}

// Pixels copied out of Mac OS 8.0 screenshots: the Finder window
// title "Mac OS 8 full" (cap top to two rows below the baseline) and
// the synthesized-bold "Kind:" label of a Get Info window.
const FINDER_TITLE = [
  ".##......##.....................###....####......####......###........##..##.",
  ".##......##....................##.##..##........##..##....##..........##..##.",
  ".###....###..####....####.....##...##.##........##..##...####.##..##..##..##.",
  ".###....###.....##..##..#.....##...##.###.......##..##....##..##..##..##..##.",
  ".#.##..#.##..#####..##........##...##..###.......####.....##..##..##..##..##.",
  ".#.##..#.##.##..##..##........##...##...###.....##..##....##..##..##..##..##.",
  ".#..###..##.##..##..##........##...##....##.....##..##....##..##..##..##..##.",
  ".#..###..##.##.###..##.........##.##.....##.....##..##....##..##.###..##..##.",
  ".#...#...##..##.##...####.......###...####.......####.....##...##.##..##..##.",
  ".............................................................................",
  ".............................................................................",
];
const INFO_LABEL = [
  ".##..##..##............##.....",
  ".##.##.................##.....",
  ".####...###...####...####.....",
  ".###.....##...##.##.##.##..##.",
  ".###.....##...##.##.##.##.....",
  ".####....##...##.##.##.##.....",
  ".##.##...##...##.##.##.##.....",
  ".##..##..##...##.##..####..##.",
  "..............................",
  "..............................",
];

describe("bitmap strikes", () => {
  it("reproduce a Charcoal 12 window title pixel for pixel", () => {
    expect(draw(strikeGlyphs(CHARCOAL_12), "Mac OS 8 full", 8, 2))
      .toEqual(FINDER_TITLE);
  });

  it("synthesize QuickDraw bold for Geneva 10 labels", () => {
    expect(draw(emboldened(strikeGlyphs(GENEVA_10)), "Kind:", 7, 2))
      .toEqual(INFO_LABEL);
  });

  it("keep code points unique and inside each strike's line box", () => {
    for (const s of [CHARCOAL_12, GENEVA_10]) {
      const cps = s.glyphs.map((g) => g[0]);
      expect(new Set(cps).size).toBe(cps.length);
      // A hex string that doesn't split into whole rows would decode a
      // truncated extra row without complaint.
      for (const [cp, , , , width, hex] of s.glyphs) {
        const digits = Math.ceil(width / 4);
        expect(digits ? hex.length % digits : hex.length,
               `U+${cp.toString(16)}`).toBe(0);
      }
      for (const g of strikeGlyphs(s)) {
        expect(g.top + 1).toBeLessThanOrEqual(s.ascent);
        expect(g.rows.length - 1 - g.top).toBeLessThanOrEqual(s.descent);
      }
    }
  });
});

describe("glyphRects", () => {
  it("partitions the pixels without overlap", () => {
    for (const g of strikeGlyphs(CHARCOAL_12)) {
      const cover = new Map<string, number>();
      for (const q of glyphRects(g)) {
        for (let x = q.x0; x < q.x1; x++)
          for (let y = q.y0; y < q.y1; y++) {
            const k = `${x},${y}`;
            cover.set(k, (cover.get(k) ?? 0) + 1);
          }
      }
      const want = new Set<string>();
      g.rows.forEach((bits, r) => {
        for (let x = 0; x < g.width; x++)
          if ((bits >> (g.width - 1 - x)) & 1)
            want.add(`${x + g.lsb},${g.top - r}`);
      });
      expect([...cover.values()].every((n) => n === 1)).toBe(true);
      expect(new Set(cover.keys())).toEqual(want);
    }
  });
});

describe("buildPixelFont", () => {
  const font = buildPixelFont({
    family: "Test", bold: false, sizePx: CHARCOAL_12.sizePx,
    ascent: CHARCOAL_12.ascent, descent: CHARCOAL_12.descent,
    glyphs: strikeGlyphs(CHARCOAL_12),
  });
  const dv = new DataView(font.buffer);
  const tables = new Map<string, { off: number; len: number }>();
  for (let i = 0; i < dv.getUint16(4); i++) {
    const rec = 12 + 16 * i;
    const tag = String.fromCharCode(...font.slice(rec, rec + 4));
    tables.set(tag, { off: dv.getUint32(rec + 8), len: dv.getUint32(rec + 12) });
  }

  it("writes every table the browser sanitizers require", () => {
    expect([...tables.keys()]).toEqual([
      "OS/2", "cmap", "glyf", "head", "hhea", "hmtx", "loca", "maxp",
      "name", "post",
    ]);
  });

  it("balances the whole-file checksum", () => {
    let sum = 0;
    for (let i = 0; i < font.length; i += 4) sum = (sum + dv.getUint32(i)) >>> 0;
    expect(sum).toBe(0xb1b0afba);
  });

  it("rejects glyphs it cannot encode", () => {
    const g = { codepoint: 0x41, advance: 1, lsb: 0, top: 0, width: 1,
                rows: [1] };
    const spec = { family: "T", bold: false, sizePx: 1, ascent: 1, descent: 0 };
    expect(() => buildPixelFont({ ...spec, glyphs: [g, g] }))
      .toThrow(/duplicate/);
    expect(() => buildPixelFont({ ...spec, glyphs: [{ ...g, width: 33 }] }))
      .toThrow(/wide/);
  });

  it("maps characters to glyphs with pixel-exact advances", () => {
    const cmap = tables.get("cmap")!.off;
    const sub = cmap + dv.getUint32(cmap + 8);
    const segX2 = dv.getUint16(sub + 6);
    const glyphFor = (cp: number): number => {
      for (let i = 0; i < segX2; i += 2) {
        const end = dv.getUint16(sub + 14 + i);
        const start = dv.getUint16(sub + 16 + segX2 + i);
        if (cp < start || cp > end) continue;
        return (cp + dv.getUint16(sub + 16 + 2 * segX2 + i)) & 0xffff;
      }
      return 0;
    };
    const upem = dv.getUint16(tables.get("head")!.off + 18);
    const hmtx = tables.get("hmtx")!.off;
    const adv = (cp: number) => dv.getUint16(hmtx + 4 * glyphFor(cp)) /
                                (upem / CHARCOAL_12.sizePx);
    expect(adv(0x48)).toBe(8);   // H
    expect(adv(0x20)).toBe(3);   // space
    expect(adv(0x2014)).toBe(10); // em dash
    expect(glyphFor(0x263a)).toBe(0); // absent: falls through in CSS
  });
});
