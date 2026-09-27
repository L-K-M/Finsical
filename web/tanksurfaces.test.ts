import { describe, expect, it } from "vitest";

// main.ts wires the DOM at import time, so it cannot be loaded under
// vitest. This guard reads its source instead: under body.crt the #crt
// glass (a sibling of #tank) receives the pointer, so a tank gesture
// bound to #tank alone silently stops working with the CRT on. That is
// how the zen-exit double-tap was lost once.
const src = import.meta.glob<string>("./main.ts", {
  query: "?raw", import: "default", eager: true,
})["./main.ts"];
const GESTURES = ["pointerdown", "pointermove", "pointerleave", "dblclick"];

describe("tank gesture listeners", () => {
  it("binds no gesture to #tank alone", () => {
    for (const ev of GESTURES) {
      expect(src, ev).not.toMatch(new RegExp(`canvas\\.addEventListener\\(\\s*"${ev}"`));
    }
  });

  it("binds every gesture on both #tank and #crt", () => {
    expect(src).toMatch(/const tankSurfaces[^=]*=\s*\[canvas, crtEl\]/);
    for (const ev of GESTURES) {
      const bound = new RegExp(
        `for \\(const el of tankSurfaces\\) \\{[^}]*el\\.addEventListener\\("${ev}"`,
      );
      expect(src, ev).toMatch(bound);
    }
  });
});
