import { describe, expect, it } from "vitest";

// main.ts wires the DOM at import time, so it cannot be loaded under
// vitest; this guard reads its source instead (the tanksurfaces.test.ts
// pattern). A fish from one entry of a multi-pack add-on rebinds to its
// own blob's sheet after relaunch only if the save carries its entry:
// sanitizeSavedFish reads the field, so tankSnapshot must write it. The
// omission once made every relaunch re-derive bindings with
// legacyEntries' round-robin guess, which hands a released fish's slot
// to its sibling (blackangel drawing angel art, angel named
// blackangel).
const src = import.meta.glob<string>("./main.ts", {
  query: "?raw", import: "default", eager: true,
})["./main.ts"];

describe("tank save fields", () => {
  it("tankSnapshot persists each fish's pack entry", () => {
    expect(src).toMatch(
      /\.\.\.\(f\.entry !== undefined \? \{ entry: f\.entry \} : \{\}\),/);
  });

  it("sanitizeSavedFish still reads the entry back", () => {
    expect(src).toMatch(
      /if \(typeof f\.entry === "string"\) out\.entry = f\.entry;/);
  });
});
