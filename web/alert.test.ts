import { describe, expect, it } from "vitest";
import { alertOrigin, alertOriginIn, alertWidth, focusStep }
  from "./alert.js";

describe("alertWidth", () => {
  it("is the standard width in a roomy window", () => {
    expect(alertWidth(1280)).toBe(340);
  });

  it("narrows to fit the Mac Plus tank window, 8px from each edge", () => {
    expect(alertWidth(330)).toBe(314);
    expect(alertWidth(330.6)).toBe(314);
  });

  it("never goes negative", () => {
    expect(alertWidth(10)).toBe(0);
  });
});

describe("alertOrigin", () => {
  it("centers across with a third of the spare height above", () => {
    expect(alertOrigin(1280, 800, 340, 140)).toEqual({ left: 470, top: 220 });
  });

  it("lands on whole pixels", () => {
    expect(alertOrigin(331, 431, 314, 150)).toEqual({ left: 8, top: 93 });
  });

  it("keeps the top edge on screen when the alert is taller", () => {
    expect(alertOrigin(330, 100, 314, 200).top).toBe(8);
  });
});

describe("alertOriginIn", () => {
  // The tank page places alerts inside the machine case's screen, so
  // an alert narrower than the case's tank still centers on it and a
  // standard-width alert narrows instead of overhanging the monitor.
  it("centers on the box, not the viewport", () => {
    // A 320-wide screen at x 352 in a 1024 viewport: a 240-wide alert
    // centers on the screen, 8 px in from its edge after the width
    // clamp narrowed it (alertWidth(320) = 304 keeps EDGE=8).
    expect(alertOriginIn({ left: 352, top: 148, width: 320, height: 200 },
                         304, 120))
      .toEqual({ left: 360, top: 148 + Math.max(8, Math.floor(80 / 3)) });
  });

  it("keeps the top edge EDGE inside the box when the alert is taller",
     () => {
    expect(alertOriginIn({ left: 100, top: 50, width: 300, height: 90 },
                         280, 200).top).toBe(58);
  });

  it("never slides left of the box", () => {
    expect(alertOriginIn({ left: 352, top: 148, width: 300, height: 200 },
                         340, 100).left).toBe(352);
  });
});

describe("focusStep", () => {
  it("cycles Tab through the buttons and wraps both ways", () => {
    expect(focusStep(2, -1, false)).toBe(0);
    expect(focusStep(2, -1, true)).toBe(1);
    expect(focusStep(2, 0, false)).toBe(1);
    expect(focusStep(2, 1, false)).toBe(0);
    expect(focusStep(2, 0, true)).toBe(1);
  });

  it("keeps focus on the alert when it has no buttons", () => {
    expect(focusStep(0, -1, false)).toBe(-1);
  });
});
