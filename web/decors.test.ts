import { describe, expect, it } from "vitest";
import { upsertDecor, type DecorEntry } from "./decors.js";

function fakeCanvas(): HTMLCanvasElement {
  return {} as HTMLCanvasElement;
}

describe("upsertDecor", () => {
  it("appends a new pack", () => {
    const list: DecorEntry[] = [];
    const cv = fakeCanvas();
    upsertDecor(list, "https://example/p.plt", cv);
    expect(list).toEqual([{ cv, pack: "https://example/p.plt" }]);
  });

  it("replaces an existing pack instead of stacking a duplicate", () => {
    const list: DecorEntry[] = [];
    const first = fakeCanvas();
    const second = fakeCanvas();
    upsertDecor(list, "https://example/p.plt", first);
    upsertDecor(list, "https://example/p.plt", second);
    expect(list).toHaveLength(1);
    expect(list[0]!.cv).toBe(second);
    expect(list[0]!.pack).toBe("https://example/p.plt");
  });

  it("keeps distinct packs as separate entries", () => {
    const list: DecorEntry[] = [];
    upsertDecor(list, "https://example/a.plt", fakeCanvas());
    upsertDecor(list, "https://example/b.acc", fakeCanvas());
    expect(list).toHaveLength(2);
  });
});
