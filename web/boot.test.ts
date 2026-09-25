import { describe, expect, it } from "vitest";
import { BOOT_CAP_MS, BOOT_FADE_MS, BOOT_HOLD_MS, BOWL_ART, bootPhase,
         fadeProgress, PALETTE, paradeSlot, SECTION_ART } from "./boot.js";

describe("pixel art", () => {
  it("gives every glyph a palette color", () => {
    for (const [name, art] of Object.entries({ bowl: BOWL_ART,
                                             ...SECTION_ART })) {
      expect(art.length, `${name} has 16 rows`).toBe(16);
      for (const row of art) {
        expect(row.length, `${name} row is 16 glyphs`).toBe(16);
        for (const ch of row)
          if (ch !== ".")
            expect(PALETTE[ch], `${name} uses "${ch}"`).toBeDefined();
      }
    }
  });
});

describe("bootPhase", () => {
  it("walks black, hello, parade, fade, done on a quick restore", () => {
    expect(bootPhase(0, null)).toBe("black");
    expect(bootPhase(200, null)).toBe("hello");
    expect(bootPhase(700, null)).toBe("parade");
    // Restore settled at 900 ms; the parade holds BOOT_HOLD after it.
    expect(bootPhase(900 + BOOT_HOLD_MS - 1, 900)).toBe("parade");
    expect(bootPhase(900 + BOOT_HOLD_MS + 10, 900)).toBe("fade");
    expect(bootPhase(900 + BOOT_HOLD_MS + BOOT_FADE_MS + 1, 900))
      .toBe("done");
  });

  it("caps a stalled restore instead of parading forever", () => {
    expect(bootPhase(BOOT_CAP_MS - 1, null)).toBe("parade");
    expect(bootPhase(BOOT_CAP_MS + 1, null)).toBe("fade");
    expect(bootPhase(BOOT_CAP_MS + BOOT_FADE_MS + 1, null)).toBe("done");
  });

  it("a restore done before the parade still gets its hold", () => {
    // doneElapsed can precede the parade window: the hold counts from
    // the end of hello, so a fast restore still shows its icons.
    expect(bootPhase(700, 100)).toBe("parade");
    expect(bootPhase(600 + BOOT_HOLD_MS + 10, 100)).toBe("fade");
  });

  it("a restore settling mid-fade never rewinds to the parade", () => {
    // fadeAtMs clamps the fade start at BOOT_CAP_MS, so a doneElapsed
    // recorded after the cap leaves a running fade running.
    expect(bootPhase(BOOT_CAP_MS + 200, BOOT_CAP_MS + 100)).toBe("fade");
    expect(bootPhase(BOOT_CAP_MS + 200 + BOOT_FADE_MS, BOOT_CAP_MS + 100))
      .toBe("done");
  });
});

describe("fadeProgress", () => {
  it("clamps to 0..1 across the fade window", () => {
    const done = 800;
    expect(fadeProgress(0, done)).toBe(0);
    expect(fadeProgress(done + BOOT_HOLD_MS, done)).toBe(0);
    expect(fadeProgress(done + BOOT_HOLD_MS + BOOT_FADE_MS / 2, done))
      .toBeCloseTo(0.5);
    expect(fadeProgress(done + BOOT_HOLD_MS + BOOT_FADE_MS * 2, done))
      .toBe(1);
  });

  it("fades on the cap path when the restore never settles", () => {
    // render() reaches fadeProgress with done=null via the BOOT_CAP_MS
    // branch — pin that it fades (not NaN, not a hard cut).
    expect(fadeProgress(BOOT_CAP_MS, null)).toBe(0);
    expect(fadeProgress(BOOT_CAP_MS + BOOT_FADE_MS / 2, null))
      .toBeCloseTo(0.5);
    expect(fadeProgress(BOOT_CAP_MS + BOOT_FADE_MS * 2, null)).toBe(1);
  });
});

describe("paradeSlot", () => {
  it("marches nine icons across, then stacks rows upward", () => {
    expect(paradeSlot(0)).toEqual({ x: 8, y: 160 });
    expect(paradeSlot(8)).toEqual({ x: 8 + 8 * 34, y: 160 });
    expect(paradeSlot(9)).toEqual({ x: 8, y: 130 });
    // The ninth icon's right edge stays inside a 320 px tank.
    expect(paradeSlot(8).x + 32).toBeLessThanOrEqual(320);
  });
});
