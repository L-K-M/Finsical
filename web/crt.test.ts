import { describe, expect, it } from "vitest";
import {
  CRT_DEFAULTS, CRT_MASKS, CRT_PRESETS, DEGAUSS_MS, PICTURE_KEYS,
  PRESET_KEPT_TUBE_KEYS, crtClientToTank, crtRasterRect,
  crtRasterToScreen, crtRowColumns, crtScreenToRaster, crtTankToClient,
  degaussAmp, presetTube, sanitizeCrtConfig,
} from "./crt.js";
import type { CrtConfig, CrtGeometry } from "./crt.js";

// sanitizeCrtConfig is the trust boundary for localStorage payloads and
// bus messages from the prefs window — anything odd must fall back to
// or clamp toward the tuned defaults.
describe("sanitizeCrtConfig", () => {
  it("returns defaults for non-objects", () => {
    for (const raw of [null, undefined, 42, "x", [1, 2], true])
      expect(sanitizeCrtConfig(raw)).toEqual(CRT_DEFAULTS);
  });

  it("keeps in-range values and drops unknown keys", () => {
    const c = sanitizeCrtConfig({ scanlines: 0.7, bogus: 1 });
    expect(c.scanlines).toBe(0.7);
    expect("bogus" in c).toBe(false);
    expect(c.softening).toBe(CRT_DEFAULTS.softening); // untouched key = default
  });

  it("clamps out-of-range and rejects non-numbers", () => {
    const c = sanitizeCrtConfig({
      bloom: 5, curvature: -1, grille: "high", flicker: NaN,
      overdrive: Infinity, softening: 0.25,
    });
    expect(c.bloom).toBe(1);
    expect(c.curvature).toBe(0);
    expect(c.grille).toBe(CRT_DEFAULTS.grille);
    expect(c.flicker).toBe(CRT_DEFAULTS.flicker);
    expect(c.overdrive).toBe(CRT_DEFAULTS.overdrive);
    expect(c.softening).toBe(0.25);
  });

  it("converts a stored legacy beam onto the wider softening range", () => {
    // The old slider's full range is the new one's lower 40%, so a
    // saved config keeps its look after the upgrade.
    expect(sanitizeCrtConfig({ beam: 1 }).softening).toBeCloseTo(0.4);
    expect(sanitizeCrtConfig({ beam: 0.25 }).softening).toBeCloseTo(0.1);
    expect(sanitizeCrtConfig({ beam: 0 }).softening).toBe(0);
    expect("beam" in sanitizeCrtConfig({ beam: 1 })).toBe(false);
  });

  it("prefers softening over a legacy beam and validates the beam", () => {
    expect(sanitizeCrtConfig({ beam: 1, softening: 0.9 }).softening)
      .toBe(0.9);
    expect(sanitizeCrtConfig({ beam: "x" }).softening)
      .toBe(CRT_DEFAULTS.softening);
    expect(sanitizeCrtConfig({ beam: 9 }).softening).toBe(1);
  });

  it("centers the picture for a config saved before the position pots", () => {
    const c = sanitizeCrtConfig({ scanlines: 0.6, hsize: 0.8 });
    expect(c.hpos).toBe(0.5);
    expect(c.vpos).toBe(0.5);
    expect(c.hsize).toBe(0.8);
  });

  it("defaults the mask to the aperture grille", () => {
    expect(CRT_DEFAULTS.mask).toBe("aperture");
    expect(sanitizeCrtConfig({}).mask).toBe("aperture");
  });

  it("keeps every known mask type", () => {
    for (const mask of CRT_MASKS)
      expect(sanitizeCrtConfig({ mask }).mask).toBe(mask);
  });

  it("falls back to the aperture grille for an unknown mask", () => {
    for (const mask of ["trinitron", "Slot", "", 1, null, {}, ["slot"]])
      expect(sanitizeCrtConfig({ mask, grille: 0.3 })).toEqual(
        { ...CRT_DEFAULTS, grille: 0.3 });
  });

  it("round-trips a full config", () => {
    const c = sanitizeCrtConfig(CRT_DEFAULTS);
    expect(c).toEqual(CRT_DEFAULTS);
    expect(c).not.toBe(CRT_DEFAULTS); // a copy — defaults stay frozen
  });
});

describe("CRT_PRESETS", () => {
  it("has unique ids and labels", () => {
    const ids = CRT_PRESETS.map((p) => p.id);
    const labels = CRT_PRESETS.map((p) => p.label);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("every preset is a complete, in-range CrtConfig", () => {
    const keys = Object.keys(CRT_DEFAULTS) as (keyof CrtConfig)[];
    for (const p of CRT_PRESETS) {
      for (const k of keys)
        expect(p.config[k]).toBeTypeOf(k === "mask" ? "string" : "number");
      expect(sanitizeCrtConfig(p.config)).toEqual(p.config);
    }
  });

  it("Authentic is the tuned defaults", () => {
    const auth = CRT_PRESETS.find((p) => p.id === "authentic");
    expect(auth?.config).toEqual(CRT_DEFAULTS);
  });

  it("Pixel Perfect zeros every tube trait", () => {
    const flat = CRT_PRESETS.find((p) => p.id === "pixel-perfect");
    expect(flat).toBeDefined();
    // Tube keys are everything but the picture controls, so a new trait
    // can't silently keep a nonzero Pixel Perfect default.
    const tube = Object.keys(presetTube(flat!)) as (keyof CrtConfig)[];
    expect(tube.length).toBeGreaterThan(0);
    for (const k of tube) expect(flat!.config[k]).toBe(0);
  });

  it("a preset sets the tube and leaves the picture trims alone", () => {
    // The Picture pane's brightness, geometry and color gains are the
    // user's; a preset clicked on the Monitor pane must not reset them.
    const mine: CrtConfig = { ...CRT_DEFAULTS, brightness: 0.9, red: 0.2,
                              zoom: 0.7, grain: 0.8 };
    for (const p of CRT_PRESETS) {
      const next = { ...mine, ...presetTube(p) };
      for (const k of PICTURE_KEYS) expect(next[k]).toBe(mine[k]);
      expect(next.grain).toBe(p.config.grain);
    }
    // Every key is one or the other: a picture trim added later but
    // left out of PICTURE_KEYS would count as tube and be reset.
    const tube = Object.keys(presetTube(CRT_PRESETS[0]!));
    expect([...PICTURE_KEYS, ...PRESET_KEPT_TUBE_KEYS, ...tube].sort())
      .toEqual(Object.keys(CRT_DEFAULTS).sort());
  });

  it("leaves the mask type the user picked", () => {
    // A preset tunes trait strengths, not which tube it is.
    for (const mask of CRT_MASKS)
      for (const p of CRT_PRESETS) {
        const next = { ...CRT_DEFAULTS, mask, ...presetTube(p) };
        expect(next.mask).toBe(mask);
        expect(next.grille).toBe(p.config.grille);
      }
  });

  it("counts the position pots as the user's trims", () => {
    // Picture keys survive every preset (tested above).
    expect(PICTURE_KEYS).toContain("hpos");
    expect(PICTURE_KEYS).toContain("vpos");
  });

  it("configs are frozen so a click cannot mutate the shared object", () => {
    for (const p of CRT_PRESETS)
      expect(Object.isFrozen(p.config)).toBe(true);
  });
});

// The CRT canvas spans the whole glass aperture so the size pots can
// grow the raster past the tank's 1.6 rect; the raster itself must
// still land exactly on the tank's rect inside it.
describe("crtRasterRect", () => {
  it("fills the buffer when the tank is the whole glass", () => {
    expect(crtRasterRect(640, 400, 320, 200, { x: 0, y: 0, w: 1, h: 1 }))
      .toEqual([0, 0, 640, 400]);
  });

  it("lands on the tank's sub-rect, flipped to y-up", () => {
    // Glass 100×200 buffer px; tank fills the middle half vertically.
    const r = crtRasterRect(100, 200, 320, 200,
      { x: 0, y: 0.1, w: 1, h: 0.5 });
    expect(r[2]).toBeCloseTo(100);
    expect(r[3]).toBeCloseTo(62.5); // contain-fit inside 100×100
    expect(r[0]).toBeCloseTo(0);
    // Box spans top-down 20..120, so y-up 80..180; centered: +18.75.
    expect(r[1]).toBeCloseTo(80 + 18.75);
  });
});

// The rows pass smears each scanline once at the raster's device
// width; too few columns would blur the sharp end of Softening.
describe("crtRowColumns", () => {
  const neutral = { zoom: 0, hsize: 0.5 };

  it("draws one column per device px of the neutral raster", () => {
    expect(crtRowColumns(1280, neutral, 320, 4096)).toBe(1280);
  });

  it("follows the overscan and width pots like FRAG's pxScale.x", () => {
    expect(crtRowColumns(1000, { zoom: 1, hsize: 0.5 }, 320, 4096))
      .toBe(1120);
    expect(crtRowColumns(1000, { zoom: 0, hsize: 1 }, 320, 4096))
      .toBe(1250);
    expect(crtRowColumns(1000, { zoom: 0, hsize: 0 }, 320, 4096))
      .toBe(750);
  });

  it("keeps a column per game px and stays inside the target", () => {
    expect(crtRowColumns(100, neutral, 320, 4096)).toBe(320);
    expect(crtRowColumns(5120, { zoom: 1, hsize: 1 }, 320, 4096))
      .toBe(4096);
  });
});

describe("degaussAmp", () => {
  it("starts at full swing and settles inside DEGAUSS_MS", () => {
    expect(degaussAmp(0)).toBe(1);
    expect(degaussAmp(DEGAUSS_MS)).toBe(0);
    // Strictly decreasing across the whole ring — two interior
    // samples would miss a mid-decay wiggle — then floored at zero
    // once the exponential clips.
    let prev = degaussAmp(0);
    let settled = false;
    for (let ms = 50; ms < DEGAUSS_MS; ms += 50) {
      const amp = degaussAmp(ms);
      if (settled) { expect(amp).toBe(0); continue; }
      if (amp === 0) { settled = true; continue; }
      expect(amp).toBeLessThan(prev);
      prev = amp;
    }
    expect(settled).toBe(true); // it does reach the floor inside
  });

  it("reads settled before it ever fires (and for bad inputs)", () => {
    expect(degaussAmp(-1)).toBe(0);
    expect(degaussAmp(Infinity)).toBe(0); // degaussT0 = -Infinity
    expect(degaussAmp(NaN)).toBe(0);
  });
});

// Pointer input maps through the same warp as the picture: B-35 and
// V-35 in ANALYSIS.md.
describe("crtScreenToRaster", () => {
  const TANK = { width: 320, height: 200 };
  const flat: CrtGeometry = { ...CRT_DEFAULTS, curvature: 0 };
  const at = (g: Partial<CrtGeometry>): CrtGeometry => ({ ...flat, ...g });

  it("is the identity with neutral pots and a flat tube", () => {
    for (const [u, v] of [[0.1, 0.2], [0.5, 0.5], [0.9, 0.7], [0.3, 0.95]]) {
      const r = crtScreenToRaster(u!, v!, flat);
      expect(r!.x).toBeCloseTo(u!, 12);
      expect(r!.y).toBeCloseTo(v!, 12);
    }
  });

  it("keeps the center fixed under every warp but the position pots", () => {
    for (const g of [CRT_DEFAULTS, at({ curvature: 1, zoom: 1 }),
      at({ hsize: 0, vsize: 1 }), at({ skew: 1 }), at({ skew: 0 }),
      at({ perspective: 0 }), at({ perspective: 1 })]) {
      const r = crtScreenToRaster(0.5, 0.5, g);
      expect(r!.x).toBeCloseTo(0.5, 12);
      expect(r!.y).toBeCloseTo(0.5, 12);
    }
  });

  it("shows black past the corner at full curvature", () => {
    expect(crtScreenToRaster(0.999, 0.999, at({ curvature: 1 }))).toBeNull();
    expect(crtScreenToRaster(0.001, 0.001, at({ curvature: 1 }))).toBeNull();
  });

  it("drops points off the raster and past its rounded corners", () => {
    expect(crtScreenToRaster(-0.01, 0.5, flat)).toBeNull();
    expect(crtScreenToRaster(0.5, 1.01, flat)).toBeNull();
    // Inside the rect but outside the 6 px corner arc.
    expect(crtScreenToRaster(0.5 / 320, 0.5 / 200, flat)).toBeNull();
    expect(crtScreenToRaster(6 / 320, 0.5 / 200, flat)).not.toBeNull();
  });

  it("crops for overscan", () => {
    expect(crtScreenToRaster(0.95, 0.5, at({ zoom: 1 }))!.x)
      .toBeCloseTo(0.9018, 4);
  });

  it("follows the size and position pots", () => {
    expect(crtScreenToRaster(0.9, 0.5, at({ hsize: 1 }))!.x)
      .toBeCloseTo(0.5 + 0.4 / 1.25, 12);
    // Full right slides the raster a tenth of its width to the right.
    expect(crtScreenToRaster(0.6, 0.5, at({ hpos: 1 }))!.x)
      .toBeCloseTo(0.5, 12);
    expect(crtScreenToRaster(0.5, 0.4, at({ vpos: 0 }))!.y)
      .toBeCloseTo(0.5, 12);
  });

  it("leans the top edge by an eighth of the width at full skew", () => {
    expect(crtScreenToRaster(0.5, 1, at({ skew: 1 }))!.x)
      .toBeCloseTo(0.375, 12);
    expect(crtScreenToRaster(0.5, 0, at({ skew: 1 }))!.x)
      .toBeCloseTo(0.625, 12);
  });

  it("keeps the looming edge in place and blacks out the far side", () => {
    // Perspective 1 looms on the left, 0 on the right.
    const right = at({ perspective: 1 }), left = at({ perspective: 0 });
    expect(crtScreenToRaster(0, 0.5, right)!.x).toBeCloseTo(0, 12);
    expect(crtScreenToRaster(0.95, 0.5, right)).toBeNull();
    expect(crtScreenToRaster(1, 0.5, left)!.x).toBeCloseTo(1, 12);
    expect(crtScreenToRaster(0.05, 0.5, left)).toBeNull();
    // The far edge keeps 1 / (1 + KEYSTONE / 2) of the height.
    expect(crtRasterToScreen(1, 1, right).y - 0.5).toBeCloseTo(0.5 / 1.4, 12);
  });

  it("fits the whole raster inside the glass at either perspective end", () => {
    for (const curvature of [0, CRT_DEFAULTS.curvature])
      for (const perspective of [0, 1]) {
        const g = at({ curvature, perspective });
        const neutral = at({ curvature });
        for (const x of [0, 1]) {
          const s = crtRasterToScreen(x, 0.5, g);
          expect(s.x).toBeGreaterThanOrEqual(-1e-9);
          expect(s.x).toBeLessThanOrEqual(1 + 1e-9);
        }
        // The looming edge sits where it does head-on, within 0.5%.
        const loom = perspective === 1 ? 0 : 1;
        expect(Math.abs(crtRasterToScreen(loom, 0.5, g).x -
          crtRasterToScreen(loom, 0.5, neutral).x)).toBeLessThan(0.005);
      }
  });

  it("round-trips through the inverse within 0.01 tank px", () => {
    const cases: CrtGeometry[] = [CRT_DEFAULTS,
      at({ curvature: 1, zoom: 1, hsize: 0, vsize: 1, skew: 0.8,
           perspective: 0.2, hpos: 0.9, vpos: 0.1 }),
      at({ curvature: 1, perspective: 1 })];
    for (const g of cases)
      for (let i = 0; i <= 20; i++)
        for (let j = 0; j <= 20; j++) {
          const x = 0.03 + 0.94 * i / 20, y = 0.05 + 0.9 * j / 20;
          const s = crtRasterToScreen(x, y, g);
          const r = crtScreenToRaster(s.x, s.y, g);
          expect(r).not.toBeNull();
          expect(Math.abs(r!.x - x) * TANK.width).toBeLessThan(0.01);
          expect(Math.abs(r!.y - y) * TANK.height).toBeLessThan(0.01);
        }
  });
});

describe("crtClientToTank", () => {
  const TANK = { width: 320, height: 200 };
  // A glass taller than the tank, like the Performa's.
  const rect = { left: 100, top: 50, width: 640, height: 600 };
  const box = { x: 0, y: 0.25, w: 1, h: 400 / 600 };
  const flat: CrtGeometry = { ...CRT_DEFAULTS, curvature: 0 };

  it("maps the neutral raster like a flat letterbox", () => {
    // The raster is 640x400 at y 150..550 (client 200..600).
    const p = crtClientToTank(100 + 320, 200 + 30, rect, box, flat, TANK);
    expect(p!.x).toBeCloseTo(160, 9);
    expect(p!.y).toBeCloseTo(15, 9);
    expect(crtClientToTank(420, 190, rect, box, flat, TANK)).toBeNull();
  });

  it("reaches the glass above the tank once the height pot grows", () => {
    // The feed zone moves up with the picture: a click just above the
    // neutral raster lands in the tank's top rows (the raster grows
    // from 400 to 500 px tall, so its top edge moves to client 150).
    const tall = { ...flat, vsize: 1 };
    const p = crtClientToTank(420, 160, rect, box, tall, TANK);
    expect(p).not.toBeNull();
    expect(p!.y).toBeCloseTo(4, 9);
  });

  it("inverts through crtTankToClient", () => {
    for (const g of [CRT_DEFAULTS, { ...CRT_DEFAULTS, vsize: 1, skew: 0.9 }]) {
      const c = crtTankToClient(200, 40, rect, box, g, TANK);
      const p = crtClientToTank(c.x, c.y, rect, box, g, TANK);
      expect(p!.x).toBeCloseTo(200, 6);
      expect(p!.y).toBeCloseTo(40, 6);
    }
  });
});
