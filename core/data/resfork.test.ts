import { describe, expect, it } from "vitest";
import { openFork } from "./resfork.js";
import { buildRsrc, wrapAppledouble, wrapBinhex, wrapMacbinary }
  from "./resfork.fixture.js";

const bytes = (...b: number[]) => Uint8Array.from(b);
type Entry = [number, string | null, number, Uint8Array];

/** A Mac gravel add-on's fork: Grvl, BADP and BAPC, all id 4020. */
const gravel = () => buildRsrc(new Map<string, Entry[]>([
  ["Grvl", [[4020, null, 0, bytes(0, 0x35, 0, 0x34, 0, 0, 0, 0)]]],
  ["BADP", [[4020, null, 0, bytes(1, 2, 3)]]],
  ["BAPC", [[4020, null, 0, bytes(4, 5, 6, 7)]]],
]));

const read = (d: Uint8Array, type: string, max = 16) =>
  openFork(d)?.resources(type, max)
    .map((r) => [r.id, r.name, [...r.data]]);

describe("openFork", () => {
  it("reads each type of a gravel add-on's fork", () => {
    const fork = gravel();
    expect(read(fork, "Grvl")).toEqual([[4020, null, [0, 0x35, 0, 0x34, 0, 0, 0, 0]]]);
    expect(read(fork, "BADP")).toEqual([[4020, null, [1, 2, 3]]]);
    expect(read(fork, "BAPC")).toEqual([[4020, null, [4, 5, 6, 7]]]);
  });

  it("finds nothing for a type the map lacks, or one in another case", () => {
    expect(read(gravel(), "PICT")).toEqual([]);
    expect(read(gravel(), "bapc")).toEqual([]);
    expect(read(gravel(), "snd ")).toEqual([]);
  });

  it("reads the same fork through every wrapping", () => {
    const fork = gravel();
    for (const wrapped of [wrapAppledouble(fork), wrapMacbinary(fork),
                           wrapBinhex(fork),
                           wrapBinhex(wrapMacbinary(wrapAppledouble(fork)))])
      expect(read(wrapped, "BAPC")).toEqual([[4020, null, [4, 5, 6, 7]]]);
  });

  it("keeps names, ids and map order", () => {
    const fork = buildRsrc(new Map<string, Entry[]>([
      ["PICT", [[128, "Splash", 0, bytes(1)], [-200, null, 0x20, bytes(2)],
                [129, "Logo", 0, bytes(3)]]],
    ]));
    expect(read(fork, "PICT")).toEqual([
      [128, "Splash", [1]], [-200, null, [2]], [129, "Logo", [3]]]);
  });

  it("returns at most `max` resources per call", () => {
    const fork = buildRsrc(new Map<string, Entry[]>([
      ["PICT", Array.from({ length: 5 }, (_, i): Entry =>
        [i, null, 0, bytes(i)])]]));
    expect(read(fork, "PICT", 3)?.map((r) => r[0])).toEqual([0, 1, 2]);
  });

  it("yields a payload once per type, but once for each type", () => {
    const fork = gravel();
    const dv = new DataView(fork.buffer);
    const map = dv.getUint32(4);
    const types = map + dv.getUint16(map + 24);
    const refsOf = (i: number) => types + dv.getUint16(types + 2 + i * 8 + 6);
    // BAPC's reference now points at BADP's payload.
    dv.setUint32(refsOf(2) + 4, dv.getUint32(refsOf(1) + 4));
    expect(read(fork, "BADP")).toEqual([[4020, null, [1, 2, 3]]]);
    expect(read(fork, "BAPC")).toEqual([[4020, null, [1, 2, 3]]]);
  });

  it("takes four-character type codes only", () => {
    expect(() => openFork(gravel())?.resources("BAP", 1)).toThrow(/4 characters/);
  });

  it("opens nothing without a readable map, and never throws", () => {
    expect(openFork(new Uint8Array(0))).toBeNull();
    expect(openFork(bytes(1, 2, 3))).toBeNull();
    const fork = gravel();
    expect(openFork(fork.subarray(0, 15))).toBeNull();
    for (let n = 0; n < fork.length; n++)
      expect(() => openFork(fork.subarray(0, n))?.resources("BAPC", 9))
        .not.toThrow();
  });
});
