import { describe, expect, it } from "vitest";
import { sanitizeSoundConfig, SOUND_DEFAULTS } from "./audio.js";

describe("sanitizeSoundConfig", () => {
  it("keeps defaults for absent or malformed input", () => {
    expect(sanitizeSoundConfig(null)).toEqual(SOUND_DEFAULTS);
    expect(sanitizeSoundConfig("loud")).toEqual(SOUND_DEFAULTS);
    expect(sanitizeSoundConfig({ master: "eight" })).toEqual(SOUND_DEFAULTS);
  });

  it("clamps levels into 0..1 and accepts the mute flag", () => {
    expect(sanitizeSoundConfig({ master: 1.5, ambient: -0.2, muted: true }))
      .toEqual({ master: 1, ambient: 0, muted: true });
    expect(sanitizeSoundConfig({ master: 0.25, ambient: 0.5, muted: false }))
      .toEqual({ master: 0.25, ambient: 0.5, muted: false });
    // A number is not a boolean — the flag keeps its default.
    expect(sanitizeSoundConfig({ muted: 1 }).muted).toBe(false);
  });

  it("keeps unknown keys out", () => {
    const c = sanitizeSoundConfig({ master: 0.4, extra: true });
    expect(c).toEqual({ master: 0.4, ambient: SOUND_DEFAULTS.ambient,
                        muted: SOUND_DEFAULTS.muted });
    expect("extra" in c).toBe(false);
  });
});
