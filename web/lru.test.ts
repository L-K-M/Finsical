import { describe, expect, it } from "vitest";
import { lruGet, lruSet } from "./lru.js";

describe("lru", () => {
  it("evicts the oldest entry past the cap", () => {
    const m = new Map<string, number>();
    lruSet(m, "a", 1, 3);
    lruSet(m, "b", 2, 3);
    lruSet(m, "c", 3, 3);
    lruSet(m, "d", 4, 3);
    expect([...m.keys()]).toEqual(["b", "c", "d"]);
  });

  it("a hit refreshes the entry against eviction", () => {
    const m = new Map<string, number>();
    lruSet(m, "a", 1, 2);
    lruSet(m, "b", 2, 2);
    expect(lruGet(m, "a")).toBe(1); // a is now newest
    lruSet(m, "c", 3, 2);           // evicts b, not a
    expect(m.has("a")).toBe(true);
    expect(m.has("b")).toBe(false);
    expect([...m.keys()]).toEqual(["a", "c"]);
  });

  it("re-setting a key keeps one entry at its new position", () => {
    const m = new Map<string, number>();
    lruSet(m, "a", 1, 2);
    lruSet(m, "b", 2, 2);
    lruSet(m, "a", 10, 2); // a moves newest; b is now oldest
    lruSet(m, "c", 3, 2);
    expect(m.get("a")).toBe(10);
    expect(m.has("b")).toBe(false);
  });

  it("a cap of one holds only the latest", () => {
    const m = new Map<string, number>();
    lruSet(m, "a", 1, 1);
    lruSet(m, "b", 2, 1);
    expect([...m.keys()]).toEqual(["b"]);
  });

  it("a miss returns undefined and leaves the map untouched", () => {
    const m = new Map<string, number>();
    lruSet(m, "a", 1, 2);
    expect(lruGet(m, "z")).toBeUndefined();
    expect([...m.keys()]).toEqual(["a"]);
  });

  it("a stored undefined still counts as a hit and refreshes", () => {
    const m = new Map<string, number | undefined>();
    lruSet(m, "a", undefined, 2);
    lruSet(m, "b", 2, 2);
    expect(lruGet(m, "a")).toBeUndefined();
    lruSet(m, "c", 3, 2); // evicts b: a was refreshed by the hit
    expect(m.has("a")).toBe(true);
    expect(m.has("b")).toBe(false);
  });

  it("canEvict pins the oldest entry past the cap until it clears", () => {
    const m = new Map<string, number>();
    const pinned = new Set<number>([1]);
    const set = (k: string, v: number) =>
      lruSet(m, k, v, 2, (x) => !pinned.has(x));
    set("a", 1);
    set("b", 2);
    set("c", 3); // a is pinned — map overshoots rather than evicting it
    expect(m.has("a")).toBe(true);
    expect(m.size).toBe(3);
    pinned.delete(1);
    set("d", 4); // now a trims normally
    expect(m.has("a")).toBe(false);
  });
});
