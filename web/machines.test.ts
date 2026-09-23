/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import { MACHINES, SCREENBACK_HOLE_PAD, previewMarkup, shellMarkup } from "./machines.js";

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
      // Anchor on a word boundary — bare `x=` would also match inside
      // `rx="9"`, `width=` inside `stroke-width=`, `y=` inside
      // `opacity=`.
      const a = new RegExp(`(?:^|\\s)${name}="([\\d.]+)"`).exec(attrs);
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

  it("image machines: the asset exists under web/", () => {
    // A missing png renders an empty shell and a rectangular window —
    // silent at runtime, so pin it here. import.meta.glob runs
    // through vite — no node typings needed.
    const assets = import.meta.glob("./assets/*");
    for (const m of MACHINES) {
      if (!m.image) continue;
      expect(`./${m.image}` in assets, `${m.id}: ${m.image}`)
        .toBe(true);
    }
  });

  it("bare: shape is the full viewBox", () => {
    const bare = MACHINES.find((m) => m.id === "bare")!;
    expect(bare.svg).toBe("");
    expect(bare.shape).toEqual([
      { x: 0, y: 0, w: bare.vbW, h: bare.vbH, r: 0 },
    ]);
  });

  it("silhouette bounds cover every svg rect", () => {
    // The other direction: an svg rect that grows past the shape union
    // would be clipped by the window mask. Bounding boxes must match.
    const box = (rs: { x: number; y: number; w: number; h: number }[]) => [
      Math.min(...rs.map((r) => r.x)),
      Math.min(...rs.map((r) => r.y)),
      Math.max(...rs.map((r) => r.x + r.w)),
      Math.max(...rs.map((r) => r.y + r.h)),
    ];
    for (const m of MACHINES) {
      if (!m.svg) continue;
      expect(box(svgRects(m.svg)), m.id).toEqual(box(m.shape));
    }
  });

  it("image machines: tank sits inside the glass aperture", () => {
    // `hole` is the screen glass — it backs the mask fill and the
    // black backplate, and the letterboxed tank must live inside it.
    for (const m of MACHINES) {
      if (!m.image) continue;
      const hole = m.hole;
      expect(hole, `${m.id}: image machine needs a hole`).toBeTruthy();
      if (!hole) continue;
      expect(hole.x).toBeGreaterThanOrEqual(0);
      expect(hole.y).toBeGreaterThanOrEqual(0);
      expect(hole.x + hole.w).toBeLessThanOrEqual(m.vbW);
      expect(hole.y + hole.h).toBeLessThanOrEqual(m.vbH);
      expect(m.sx, m.id).toBeGreaterThanOrEqual(hole.x);
      expect(m.sy, m.id).toBeGreaterThanOrEqual(hole.y);
      expect(m.sx + m.sw, m.id).toBeLessThanOrEqual(hole.x + hole.w);
      expect(m.sy + m.sh, m.id).toBeLessThanOrEqual(hole.y + hole.h);
    }
  });

  it("machines with holes: hole inset clears the backplate pad", () => {
    // layoutMachine pads #screenback past the hole so a few px of
    // translucent glass rim past the measured aperture still has black
    // behind it. The pad must land on opaque art; per the art audit
    // every hole keeps >= 46px to the nearest see-through pixel. This
    // test can't measure that, so it pins the weaker invariant: the
    // hole stays pad + 8 slack inside the viewBox.
    for (const m of MACHINES) {
      const hole = m.hole;
      if (!hole) continue;
      expect(hole.x, m.id).toBeGreaterThanOrEqual(SCREENBACK_HOLE_PAD + 8);
      expect(hole.y, m.id).toBeGreaterThanOrEqual(SCREENBACK_HOLE_PAD + 8);
      expect(m.vbW - (hole.x + hole.w), m.id)
        .toBeGreaterThanOrEqual(SCREENBACK_HOLE_PAD + 8);
      expect(m.vbH - (hole.y + hole.h), m.id)
        .toBeGreaterThanOrEqual(SCREENBACK_HOLE_PAD + 8);
    }
  });

  it("screens stay inside the silhouette", () => {
    for (const m of MACHINES) {
      // Screen rect is in viewBox units — 320×200 only where the
      // viewBox is game-scaled; what matters is the 1.6 tank aspect.
      expect(m.sw / m.sh).toBeCloseTo(1.6, 2);
      // The SVG viewport crops at the viewBox no matter what the mask
      // allows — keep both checks.
      expect(m.sx).toBeGreaterThanOrEqual(0);
      expect(m.sy).toBeGreaterThanOrEqual(0);
      expect(m.sx + m.sw).toBeLessThanOrEqual(m.vbW);
      expect(m.sy + m.sh).toBeLessThanOrEqual(m.vbH);
      const inShape = (px: number, py: number) =>
        m.shape.some((s) => {
          if (px < s.x || px > s.x + s.w || py < s.y || py > s.y + s.h)
            return false;
          // The native mask rounds each rect's corners with s.r —
          // clamp to the inner rect and test against the corner arc.
          const cx = Math.min(Math.max(px, s.x + s.r), s.x + s.w - s.r);
          const cy = Math.min(Math.max(py, s.y + s.r), s.y + s.h - s.r);
          return Math.hypot(px - cx, py - cy) <= s.r;
        });
      // Corners and center must land inside some shape rect — fitting
      // the viewBox alone means nothing once the mask steps inward.
      const points: [number, number][] = [
        [m.sx, m.sy], [m.sx + m.sw, m.sy],
        [m.sx, m.sy + m.sh], [m.sx + m.sw, m.sy + m.sh],
        [m.sx + m.sw / 2, m.sy + m.sh / 2],
      ];
      for (const [px, py] of points)
        expect(inShape(px, py), `${m.id} screen point ${px},${py}`)
          .toBe(true);
    }
  });
});

describe("previewMarkup", () => {
  it("fills exactly the screen rect with water, shell painted last", () => {
    for (const m of MACHINES) {
      const mk = previewMarkup(m);
      expect(mk, m.id).toContain(
        `<rect x="${m.sx}" y="${m.sy}" width="${m.sw}" height="${m.sh}"` +
        ` fill="url(#pvwater-${m.id})"/>`);
      if (m.image)
        expect(mk.endsWith(shellMarkup(m)), m.id).toBe(true);
    }
  });

  it("backs the glass aperture only where a hole exists", () => {
    for (const m of MACHINES) {
      const mk = previewMarkup(m);
      if (m.hole) {
        expect(mk, m.id).toContain(
          `<rect x="${m.hole.x}" y="${m.hole.y}" width="${m.hole.w}"` +
          ` height="${m.hole.h}" fill="#050508"/>`);
      } else {
        expect(mk, m.id).not.toContain('fill="#050508"');
      }
    }
  });

  it("stocks every preview with swimmers, gravel, and bubbles", () => {
    for (const m of MACHINES) {
      const mk = previewMarkup(m);
      // previewMarkup ends with shellMarkup — strip it so a future
      // transformed shell group can't trip the swimmer count.
      const tank = mk.slice(0, mk.length - shellMarkup(m).length);
      expect((tank.match(/<g transform=/g) ?? []).length, m.id).toBe(3);
      expect(mk, m.id).toContain('fill="#8a6d3b"');
      expect(mk, m.id).toContain('fill="#cfe8ff"');
    }
  });
});
