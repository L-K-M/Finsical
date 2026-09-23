import { describe, expect, it } from "vitest";
import {
  CRT_DEFAULTS, CRT_PRESETS, sanitizeCrtConfig,
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

  it("Pixel Perfect zeros every tube trait and neutralizes the picture", () => {
    const flat = CRT_PRESETS.find((p) => p.id === "pixel-perfect");
    expect(flat).toBeDefined();
    // Derive tube keys from CRT_DEFAULTS minus the picture controls so a
    // new trait can't silently keep a nonzero Pixel Perfect default.
    const picture: (keyof CrtConfig)[] = [
      "brightness", "contrast", "zoom", "hsize", "vsize",
      "red", "green", "blue",
    ];
    const tube = (Object.keys(CRT_DEFAULTS) as (keyof CrtConfig)[])
      .filter((k) => !picture.includes(k));
    expect(tube.length).toBeGreaterThan(0);
    for (const k of tube) expect(flat!.config[k]).toBe(0);
    expect(flat!.config.brightness).toBe(0.5);
    expect(flat!.config.contrast).toBe(0.5);
    expect(flat!.config.zoom).toBe(0);
    expect(flat!.config.hsize).toBe(0.5);
    expect(flat!.config.vsize).toBe(0.5);
    expect(flat!.config.red).toBe(0.5);
    expect(flat!.config.green).toBe(0.5);
    expect(flat!.config.blue).toBe(0.5);
  });

  it("configs are frozen so a click cannot mutate the shared object", () => {
    for (const p of CRT_PRESETS)
      expect(Object.isFrozen(p.config)).toBe(true);
  });
});
