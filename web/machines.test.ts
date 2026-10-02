/// <reference types="vite/client" />
import { describe, expect, it } from "vitest";
import {
  MACHINES, SCREENBACK_HOLE_PAD, backgroundMarkup, machineById, previewMarkup, rasterInGlass,
  rasterZoom, shellMarkup,
} from "./machines.js";

// osmium-ui's exports map opens only its index, so the Charcoal 12
// strike the list rows render in can't be reached by subpath import.
// Resolve the package's entry through module resolution (any install
// layout that can resolve "osmium-ui" works — a hardcoded
// ../node_modules path survives only npm's) and step across to the
// font file next to it, keeping the entry's own extension so a
// compiled dist/ layout resolves too.
const osmiumEntry = import.meta.resolve("osmium-ui");
const { CHARCOAL_12 } = await import(
  new URL(`fonts/charcoal12.${
    osmiumEntry.endsWith(".ts") ? "ts" : "js"}`, osmiumEntry).href) as
  { CHARCOAL_12: { glyphs: readonly [number, number, ...unknown[]][] } };

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
      const paths = [m.image, m.rearImage, m.maskImage].filter(Boolean);
      if (!paths.length) continue;
      for (const p of paths)
        expect(`./${p}` in assets, `${m.id}: ${p}`).toBe(true);
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
    // every hole keeps >= 44px to the nearest see-through pixel. This
    // test can't measure that, so it pins the weaker invariant: the
    // hole stays pad + 8 slack inside the viewBox when padding is used.
    for (const m of MACHINES) {
      const hole = m.hole;
      if (!hole) continue;
      const pad = m.backplatePad ?? SCREENBACK_HOLE_PAD;
      const clearance = pad > 0 ? pad + 8 : 0;
      expect(hole.x, m.id).toBeGreaterThanOrEqual(clearance);
      expect(hole.y, m.id).toBeGreaterThanOrEqual(clearance);
      expect(m.vbW - (hole.x + hole.w), m.id)
        .toBeGreaterThanOrEqual(clearance);
      expect(m.vbH - (hole.y + hole.h), m.id)
        .toBeGreaterThanOrEqual(clearance);
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

describe("glare mask", () => {
  it("glassR is set only on image machines with a hole", () => {
    for (const m of MACHINES) {
      if (m.glassR === undefined) continue;
      expect(m.image, `${m.id}: glassR needs a raster shell`).toBeTruthy();
      expect(m.hole, `${m.id}: glassR needs a measured glass`).toBeTruthy();
      expect(m.glassR).toBeGreaterThan(0);
      // The mask insets the hole by 3 and feathers 2 — a hole that
      // small would collapse the glare region to nothing.
      expect(m.hole!.w, m.id).toBeGreaterThan(10);
      expect(m.hole!.h, m.id).toBeGreaterThan(10);
    }
  });

  it("glassR machines split the shell into masked glare layers", () => {
    for (const m of MACHINES) {
      if (m.glassR === undefined) continue;
      const svg = shellMarkup(m);
      const images = svg.match(/<image /g) ?? [];
      expect(images.length, `${m.id}: shell + glare layers`)
        .toBe(2);
      // Both masks and the blur filter are namespaced by machine id —
      // inline SVG ids are document-global and prefs shows several
      // previews at once.
      for (const id of
        [`glareoff-${m.id}`, `glareon-${m.id}`, `glareblur-${m.id}`])
        expect(svg, `${m.id}: ${id}`).toContain(`id="${id}"`);
      expect(svg, m.id).toContain(`mask="url(#glareoff-${m.id})"`);
      expect(svg, m.id).toContain(`mask="url(#glareon-${m.id})"`);
      // The glare layer's opacity is driven by the light.
      expect(svg, m.id).toContain("opacity: var(--glare, 1)");
    }
  });

  it("other machines keep the single-image shell", () => {
    for (const m of MACHINES) {
      if (!m.image || m.glassR !== undefined) continue;
      const svg = shellMarkup(m);
      expect(svg.match(/<image /g)?.length, m.id).toBe(1);
      expect(svg, m.id).not.toContain("<mask");
      expect(svg, m.id).not.toContain("--glare");
    }
  });
});

describe("backgroundMarkup", () => {
  it("is empty without a rear image", () => {
    for (const m of MACHINES) {
      if (m.rearImage) continue;
      expect(backgroundMarkup(m), m.id).toBe("");
    }
  });

  it("uses the full viewBox stretch like the shell", () => {
    for (const m of MACHINES) {
      if (!m.rearImage) continue;
      expect(backgroundMarkup(m), m.id).toBe(
        `<image href="${m.rearImage}" x="0" y="0" ` +
        `width="${m.vbW}" height="${m.vbH}" ` +
        `preserveAspectRatio="none"/>`);
    }
  });
});

describe("previewMarkup", () => {
  it("puts rear glass below the water and front glass above the fish", () => {
    const m = machineById("aquarium")!;
    const preview = previewMarkup(m);
    const rear = preview.indexOf(`href="${m.rearImage}"`);
    const water = preview.indexOf('fill="url(#pvwater-aquarium)"');
    const fish = preview.lastIndexOf('<g transform=');
    const front = preview.indexOf(`href="${m.image}"`);
    expect(rear).toBeGreaterThanOrEqual(0);
    expect(water).toBeGreaterThan(rear);
    expect(fish).toBeGreaterThan(water);
    expect(front).toBeGreaterThan(fish);
  });

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
        const pad = m.backplatePad ?? SCREENBACK_HOLE_PAD;
        // Padded past the hole like the live backplate (#screenback).
        expect(mk, m.id).toContain(
          `<rect x="${m.hole.x - pad}" y="${m.hole.y - pad}"` +
          ` width="${m.hole.w + pad * 2}" height="${m.hole.h + pad * 2}"` +
          ` fill="#050505"/>`);
      } else {
        expect(mk, m.id).not.toContain('fill="#050505"');
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

// The CRT canvas covers the glass aperture; the raster sits at the
// tank's rect within it. A tank shorter than its glass (Performa 450)
// must leave room above and below for the height pot to grow into.
describe("rasterInGlass", () => {
  it("places the Performa 450 tank inside its taller glass", () => {
    const r = rasterInGlass(machineById("performa")!);
    expect(r.x).toBe(0);
    expect(r.w).toBe(1);
    expect(r.y).toBeCloseTo((137 - 99) / 541);
    expect(r.h).toBeCloseTo(466 / 541);
  });

  it("is the whole box for a machine without a hole", () => {
    expect(rasterInGlass(machineById("bare")!))
      .toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it("keeps every tank inside its glass", () => {
    for (const m of MACHINES) {
      const r = rasterInGlass(m);
      expect(r.x, m.id).toBeGreaterThanOrEqual(0);
      expect(r.y, m.id).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w, m.id).toBeLessThanOrEqual(1);
      expect(r.y + r.h, m.id).toBeLessThanOrEqual(1);
    }
  });
});

describe("rasterZoom", () => {
  const plus = machineById("plus")!, bare = machineById("bare")!;

  it("snaps a case's upscale to whole device pixels", () => {
    expect(rasterZoom(plus, 2.18, 1)).toBe(2);
    expect(rasterZoom(plus, 1.25, 2)).toBe(1);
    expect(rasterZoom(plus, 1.9, 1.5)).toBeCloseTo(2 / 1.5);
  });

  it("stretches below 1x", () => {
    expect(rasterZoom(plus, 0.6, 1)).toBe(0.6);
    expect(rasterZoom(bare, 0.6, 2)).toBe(0.6);
  });

  // No case, no bezel: the margin would be transparent, and the
  // window's edges (resize, move strip) would sit out in it, away
  // from the water the user sees.
  it("fills the Bare tank's window edge to edge at any size", () => {
    expect(rasterZoom(bare, 2.18, 1)).toBe(2.18);
    expect(rasterZoom(bare, 1.25, 2)).toBe(1.25);
    expect(rasterZoom(bare, 1.9, 1.5)).toBe(1.9);
  });

  it("fills the glass aquarium without a monitor's letterbox margins", () => {
    const aquarium = machineById("aquarium")!;
    expect(rasterZoom(aquarium, 2.18, 1)).toBe(2.18);
    expect(rasterZoom(aquarium, 1.25, 2)).toBe(1.25);
    expect(rasterZoom(aquarium, 1.9, 1.5)).toBe(1.9);
  });

  it("keeps the aquarium feed zone below the native drag strip", () => {
    // Both desktop shells use these minimum-size and drag-strip values.
    const NATIVE_MIN_SCALE = 0.25, NATIVE_DRAG_STRIP_HEIGHT = 22;
    const aquarium = machineById("aquarium")!;
    expect(aquarium.sy * NATIVE_MIN_SCALE)
      .toBeGreaterThanOrEqual(NATIVE_DRAG_STRIP_HEIGHT);
  });
});

describe("machine names", () => {
  // The Preferences machine list (#pfmachines) is a 190 px column of
  // Charcoal 12 rows; a name past the row truncates, and the dropped
  // suffix can be the only thing telling two variants apart ("(II)",
  // "(Black)") — this guard keeps every name whole.
  // 190 px list − 17 px scrollbar − 4 px padding − 1 px safety margin.
  const ROW_TEXT_PX = 190 - 17 - 4 - 1;
  const advance = new Map(CHARCOAL_12.glyphs.map((g) => [g[0], g[1]]));
  const nameWidth = (name: string): number =>
    [...name].reduce((w, c) => {
      const px = advance.get(c.codePointAt(0)!);
      // A glyph missing from the strike doesn't draw; counting it as
      // zero-width would pass a name that actually renders garbled.
      if (px === undefined)
        throw new Error(
          `no Charcoal 12 glyph for U+${
            c.codePointAt(0)!.toString(16).padStart(4, "0")
          } (${JSON.stringify(c)}) in "${name}"`);
      return w + px;
    }, 0);

  it.each(MACHINES)("$name fits the Preferences machine list", (m) => {
    expect(nameWidth(m.name)).toBeLessThanOrEqual(ROW_TEXT_PX);
  });
});
