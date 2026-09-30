import { describe, expect, it } from "vitest";
import { EFFECTS_DEFAULTS, sanitizeEffects } from "./effects.js";

// sanitizeEffects is the trust boundary for the localStorage payload
// and the prefs window's bus posts — anything odd must fall back to
// the all-on defaults key by key.
describe("sanitizeEffects", () => {
  it("returns the defaults for non-objects", () => {
    for (const raw of [null, undefined, 42, "x", [1, 2], true])
      expect(sanitizeEffects(raw)).toEqual(EFFECTS_DEFAULTS);
  });

  it("keeps booleans and drops unknown keys", () => {
    const c = sanitizeEffects({ murk: false, bogus: 1 });
    expect(c.murk).toBe(false);
    expect("bogus" in c).toBe(false);
    expect(c.sunlight).toBe(true); // untouched key = default
  });

  it("rejects non-booleans instead of truthiness", () => {
    const c = sanitizeEffects({ torch: 0, snail: "off", sway: 1 });
    expect(c.torch).toBe(EFFECTS_DEFAULTS.torch);
    expect(c.snail).toBe(EFFECTS_DEFAULTS.snail);
    expect(c.sway).toBe(EFFECTS_DEFAULTS.sway);
  });

  it("merges onto a base so a partial post keeps the other flags", () => {
    const base = { ...EFFECTS_DEFAULTS, murk: false, torch: false };
    const c = sanitizeEffects({ sway: false }, base);
    expect(c.sway).toBe(false);
    expect(c.murk).toBe(false);
    expect(c.torch).toBe(false);
    expect(c.sunlight).toBe(true);
    // ...and a wrong-typed key falls back to the base's value, not
    // the default's.
    expect(sanitizeEffects({ murk: "x" }, base).murk).toBe(false);
  });
});
