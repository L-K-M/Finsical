import { describe, expect, it } from "vitest";
import { MACHINES } from "./machines.js";

// Each machine's `shape` is hand-synced to the outer <rect> geometry
// of its svg — the native shell unions it into the window's layer
// mask. If art drifts from shape, the mask clips into or away from
// the bezel and it only shows in the native shell (the prefs preview
// renders the svg alone). Pin the pair here.

function svgRects(svg: string): { x: number; y: number; w: number; h: number; r: number }[] {
  const out: { x: number; y: number; w: number; h: number; r: number }[] = [];
  const re = /<rect\b([^>]*)\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(svg))) {
    const attrs = m[1] ?? "";
    const num = (name: string): number | undefined => {
      const a = new RegExp(`${name}="([\\d.]+)"`).exec(attrs);
      return a ? Number(a[1]) : undefined;
    };
    const x = num("x"), y = num("y"), w = num("width"), h = num("height");
    if (x !== undefined && y !== undefined && w !== undefined && h !== undefined)
      out.push({ x, y, w, h, r: num("rx") ?? 0 });
  }
  return out;
}

describe("machine silhouettes", () => {
  for (const m of MACHINES) {
    if (!m.svg) continue; // bare — asserted separately below
    it(`${m.id}: every shape rect matches an svg rect`, () => {
      const rects = svgRects(m.svg);
      for (const s of m.shape)
        expect(rects, `${m.id} shape ${JSON.stringify(s)}`).toContainEqual(s);
    });
  }

  it("bare: shape is the full viewBox", () => {
    const bare = MACHINES.find((m) => m.id === "bare")!;
    expect(bare.svg).toBe("");
    expect(bare.shape).toEqual([
      { x: 0, y: 0, w: bare.vbW, h: bare.vbH, r: 0 },
    ]);
  });

  it("screens stay inside the silhouette", () => {
    for (const m of MACHINES) {
      expect(m.sw).toBe(320);
      expect(m.sh).toBe(200);
      expect(m.sx).toBeGreaterThanOrEqual(0);
      expect(m.sy).toBeGreaterThanOrEqual(0);
      expect(m.sx + m.sw).toBeLessThanOrEqual(m.vbW);
      expect(m.sy + m.sh).toBeLessThanOrEqual(m.vbH);
    }
  });
});
