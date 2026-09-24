import { describe, expect, it } from "vitest";
import {
  CRT_DEFAULTS, CRT_PRESETS, PICTURE_KEYS, crtRasterRect, presetTube,
  sanitizeCrtConfig,
} from "./crt.js";
import type { CrtConfig } from "./crt.js";

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
    expect(c.beam).toBe(CRT_DEFAULTS.beam); // untouched key = default
  });

  it("clamps out-of-range and rejects non-numbers", () => {
    const c = sanitizeCrtConfig({
      bloom: 5, curvature: -1, grille: "high", flicker: NaN,
      overdrive: Infinity, beam: 0.25,
    });
    expect(c.bloom).toBe(1);
    expect(c.curvature).toBe(0);
    expect(c.grille).toBe(CRT_DEFAULTS.grille);
    expect(c.flicker).toBe(CRT_DEFAULTS.flicker);
    expect(c.overdrive).toBe(CRT_DEFAULTS.overdrive);
    expect(c.beam).toBe(0.25);
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
      for (const k of keys) expect(p.config[k]).toBeTypeOf("number");
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
    expect([...PICTURE_KEYS, ...tube].sort())
      .toEqual(Object.keys(CRT_DEFAULTS).sort());
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
