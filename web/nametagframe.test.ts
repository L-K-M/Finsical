import { describe, expect, it } from "vitest";

// main.ts wires the DOM at import time, so it cannot be loaded under
// vitest; this guard reads its source instead (the tanksurfaces.test.ts
// pattern). syncNameTags runs on every rendered frame while Fish Names
// is on. A fresh pictureEl().getBoundingClientRect() there forced one
// synchronous layout per frame (the frame's own tag writes invalidate
// layout), and building fresh slot objects per fish churned the GC;
// the cached rect helpers and reused slots keep the frame loop clean.
const src = import.meta.glob<string>("./main.ts", {
  query: "?raw", import: "default", eager: true,
})["./main.ts"]!;

/** The body of syncNameTags, from its name to the closing brace. */
const body = (): string => {
  const at = src.indexOf("function syncNameTags(): void {");
  expect(at).toBeGreaterThanOrEqual(0);
  return src.slice(at, src.indexOf("\n}", at));
};

describe("Fish Names frame-loop hygiene", () => {
  it("places tags from the cached rect, never a fresh layout read",
     () => {
    const fn = body();
    expect(fn).toMatch(/crtMapsPointer\(\) \? crtClientRect\(\) : tankRect\(\)/);
    // A call, not the word: the block's comments explain why no fresh
    // layout read belongs here.
    expect(fn).not.toMatch(/\.getBoundingClientRect\(\)/);
  });

  it("reuses tag slots instead of allocating per fish per frame", () => {
    expect(src).toMatch(
      /const tagSlots: \{ id: number; label: string; x: number;/);
    const fn = body();
    expect(fn).toMatch(/tagSlots\[n\]/);
    expect(fn).not.toMatch(/\.map\(/);
    expect(fn).not.toMatch(/\.filter\(/);
  });
});
