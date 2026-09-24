import { describe, expect, it } from "vitest";
import { tubeCaption } from "./caption.js";

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
