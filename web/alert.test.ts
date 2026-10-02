import { describe, expect, it } from "vitest";
import { alertOrigin, alertWidth, focusStep } from "./alert.js";

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

describe("setAlertSound wiring", () => {
  // showAlert builds DOM, so it can't run here; this guard reads the
  // source instead (the tanksurfaces.test.ts pattern). The hook fires
  // once per alert, when it opens — never on in-place updates or
  // progress ticks, which reuse the same window.
  const src = import.meta.glob<string>("./alert.ts", {
    query: "?raw", import: "default", eager: true,
  })["./alert.ts"];

  it("fires the hook exactly where the alert opens", () => {
    expect(src).toMatch(
      /openCount\+\+;\s*alertSound\?\.\(\);\s*document\.body\.append\(scrim\);/);
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
