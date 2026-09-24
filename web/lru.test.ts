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
});
