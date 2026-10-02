import { describe, expect, it } from "vitest";
import { MAX_UNEATEN } from "../core/sim.js";

// main.ts wires the DOM at import time, so it cannot be loaded under
// vitest; this guard reads its source instead (the tanksurfaces.test.ts
// pattern). The sim owns the uneaten-pellet ceiling: dropFood refuses
// past MAX_UNEATEN (6). A UI-side ceiling of its own (the old FOOD_CAP,
// 12) let Tank ▸ Feed Fish promise pellets the sim refuses — the pour
// sound played, nothing dropped, and the drop-time blip re-check that
// was written for exactly that case could never fire. The tank page
// must size its pinch against the sim's own cap.
const src = import.meta.glob<string>("./main.ts", {
  query: "?raw", import: "default", eager: true,
})["./main.ts"];
const tuning = import.meta.glob<string>("../core/tuning.ts", {
  query: "?raw", import: "default", eager: true,
})["../core/tuning.ts"];

describe("feed ceilings", () => {
  it("the tank page gates feeds on the sim's MAX_UNEATEN, not its own cap",
     () => {
    expect(src).not.toMatch(/FOOD_CAP/);
    expect(src).toMatch(
      /const room = MAX_UNEATEN\s*-\s*sim\.food\.filter\(\(\w+\) => !\w+\.eaten\)\.length/);
    expect(src).toMatch(
      /sim\.food\.filter\(\(q\) => !q\.eaten\)\.length >= MAX_UNEATEN/);
  });

  it("no second uneaten-pellet cap is exported next to the sim's", () => {
    expect(tuning).not.toMatch(/FOOD_CAP/);
  });

  it("a full tank refuses up front, with the hint", () => {
    expect(src).toMatch(
      /if \(room <= 0\) \{\s*\/\/ The tank's already full[\s\S]*?blip\(x\);\s*noteFoodRefused\(\);/);
  });

  it("MAX_UNEATEN stays the sim's own ceiling", () => {
    expect(MAX_UNEATEN).toBeGreaterThan(0);
  });
});
