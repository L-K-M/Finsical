import { describe, expect, it } from "vitest";
import { alertOrigin, alertWidth } from "./alert.js";

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
