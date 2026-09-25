import { describe, expect, it } from "vitest";
import { positionText, tubeCaption } from "./caption.js";
import { POS_RANGE } from "./crt.js";

describe("tubeCaption", () => {
  it("shows the value and blurb while the effect is on", () => {
    expect(tubeCaption({
      label: "Scanlines", valueText: "42%", blurb: "Dark gaps.",
      offHint: "Turn the effect on.", crtOn: true,
    })).toEqual({ label: "Scanlines: 42%", tail: " — Dark gaps." });
  });

  it("falls back to the off hint while the effect is off", () => {
    expect(tubeCaption({
      label: "Scanlines", valueText: "42%", blurb: "Dark gaps.",
      offHint: "Turn the effect on.", crtOn: false,
    })).toEqual({ label: "", tail: "Turn the effect on." });
  });

  it("shows the value when no off hint exists", () => {
    expect(tubeCaption({
      label: "Scanlines", valueText: "42%", blurb: "Dark gaps.",
      crtOn: false,
    })).toEqual({ label: "Scanlines: 42%", tail: " — Dark gaps." });
  });

  it("treats an empty off hint as no off hint", () => {
    expect(tubeCaption({
      label: "Scanlines", valueText: "42%", blurb: "Dark gaps.",
      offHint: "", crtOn: false,
    })).toEqual({ label: "Scanlines: 42%", tail: " — Dark gaps." });
  });
});

describe("positionText", () => {
  const H = ["Left", "Right"] as const;
  const V = ["Down", "Up"] as const;

  it("says Centered at the exact center", () => {
    expect(positionText(0.5, H)).toBe("Centered");
    expect(positionText(0.5, V)).toBe("Centered");
  });

  it("names the full POS_RANGE shift at both end stops", () => {
    expect(POS_RANGE).toBe(0.1);
    expect(positionText(0, H)).toBe("10% left");
    expect(positionText(1, H)).toBe("10% right");
    expect(positionText(0, V)).toBe("10% down");
    expect(positionText(1, V)).toBe("10% up");
  });

  it("uses the end captions as direction words, low end first", () => {
    expect(positionText(0.3, H)).toBe("4% left");
    expect(positionText(0.8, V)).toBe("6% up");
    expect(positionText(0.4, V)).toBe("2% down");
    expect(positionText(0.7, ["Back", "Forth"])).toBe("4% forth");
  });

  it("keeps one slider step distinct instead of rounding it to 0%", () => {
    // 0.51 and 0.49 carry float noise; one step is a 0.2% shift.
    expect(positionText(0.51, H)).toBe("0.2% right");
    expect(positionText(0.49, H)).toBe("0.2% left");
    expect(positionText(0.53, V)).toBe("0.6% up");
    expect(positionText(0.57, H)).toBe("1.4% right");
  });

  it("rounds sub-step values to one decimal", () => {
    expect(positionText(0.5001, H)).toBe("Centered");
    expect(positionText(0.4999, H)).toBe("Centered");
    expect(positionText(0.5126, H)).toBe("0.3% right");
  });
});
