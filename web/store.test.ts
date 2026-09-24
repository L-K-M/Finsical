import { describe, expect, it } from "vitest";
import { capSnds, sndsMergeInto, type StoredSnd } from "./store.js";

const rec = (name: string, n: number): StoredSnd =>
  ({ name, wav: new Uint8Array(n) });

describe("capSnds", () => {
  it("extends the stored set by name", () => {
    const { out, dropped } = capSnds([rec("a", 4), rec("b", 4)],
                                     [rec("c", 4)], 100);
    expect(out.map((r) => r.name)).toEqual(["c", "a", "b"]);
    expect(dropped).toBe(0);
  });

  it("replaces a stored namesake with the incoming record", () => {
    const old = rec("a", 4);
    const { out } = capSnds([old], [rec("a", 8)], 100);
    expect(out).toHaveLength(1);
    expect(out[0]!.wav).toHaveLength(8);
  });

  it("budgets incoming records before stored ones", () => {
    // Store is near the cap; the fresh drop must survive while the
    // oldest stored records get trimmed — not the reverse.
    const cur = [rec("old1", 60), rec("old2", 30)];
    const { out, dropped } = capSnds(cur, [rec("new", 50)], 100);
    expect(out.map((r) => r.name)).toEqual(["new", "old2"]);
    expect(dropped).toBe(1);
  });

  it("keeps everything under the cap in drop order", () => {
    const { out, dropped } = capSnds(null,
      [rec("x", 10), rec("y", 20)], 100);
    expect(out.map((r) => r.name)).toEqual(["x", "y"]);
    expect(dropped).toBe(0);
  });
});

describe("sndsMergeInto", () => {
  it("merges over the stored baseline and writes the result", async () => {
    const puts: StoredSnd[][] = [];
    await sndsMergeInto(async () => [rec("a", 4)],
                        async (out) => { puts.push(out); return true; },
                        [rec("b", 4)]);
    expect(puts).toHaveLength(1);
    expect(puts[0]!.map((r) => r.name)).toEqual(["b", "a"]);
  });

  it("treats a real miss as an empty baseline", async () => {
    const puts: StoredSnd[][] = [];
    await sndsMergeInto(async () => null,
                        async (out) => { puts.push(out); return true; },
                        [rec("x", 4)]);
    expect(puts[0]!.map((r) => r.name)).toEqual(["x"]);
  });

  it("rejects on a failed read and never calls put", async () => {
    let putCalled = false;
    await expect(sndsMergeInto(
      async () => { throw new Error("idb down"); },
      async () => { putCalled = true; return true; },
      [rec("x", 4)])).rejects.toThrow("idb down");
    expect(putCalled).toBe(false);
  });

  it("rejects when the write resolves falsy", async () => {
    await expect(sndsMergeInto(async () => null,
                               async () => null,
                               [rec("x", 4)])).rejects.toThrow();
  });

  it("rejects when the write rejects", async () => {
    await expect(sndsMergeInto(
      async () => null,
      async () => { throw new Error("quota"); },
      [rec("x", 4)])).rejects.toThrow("quota");
  });
});
