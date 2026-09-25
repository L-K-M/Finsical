import { describe, expect, it } from "vitest";
import { packKind, packResources } from "./rsrc.js";

interface Res { type: string; id: number; name?: string; payload: number[] }

/** A pack with the given resources and a well-formed map. `refSize`
 * other than 12 imitates the third-party packs whose refs don't line
 * up with the standard layout. */
function buildPack(res: Res[], opts: { kind?: string; refSize?: number } = {}):
    Uint8Array {
  const refSize = opts.refSize ?? 12;
  const bytes: number[] = new Array(0x100).fill(0);
  const put32 = (o: number, v: number) => {
    for (let i = 0; i < 4; i++) bytes[o + i] = (v >>> (8 * i)) & 0xff;
  };
  const put16 = (o: number, v: number) => {
    bytes[o] = v & 0xff; bytes[o + 1] = (v >> 8) & 0xff;
  };
  put32(0, 0x100);
  if (opts.kind)
    for (let i = 0; i < 4; i++) bytes[0x10 + i] = opts.kind.charCodeAt(3 - i);
  const offsets: number[] = [];
  for (const r of res) {
    offsets.push(bytes.length - 0x100);
    const len = bytes.length;
    bytes.length += 4;
    put32(len, r.payload.length);
    bytes.push(...r.payload);
  }
  const m = bytes.length;
  put32(4, m);
  const types = [...new Set(res.map((r) => r.type))];
  const typeList = m + 30;
  const refBase = typeList + types.length * 8;
  bytes.length = refBase + res.length * refSize;
  bytes.fill(0, m);
  put16(m + 28, types.length - 1);
  const names: number[] = [];
  let ref = refBase;
  types.forEach((t, ti) => {
    const mine = res.map((r, i) => ({ r, i })).filter((x) => x.r.type === t);
    const e = typeList + ti * 8;
    for (let i = 0; i < 4; i++) bytes[e + i] = t.charCodeAt(3 - i);
    put16(e + 4, mine.length - 1);
    put16(e + 6, ref - typeList);
    for (const { r, i } of mine) {
      put16(ref, r.id);
      if (r.name === undefined) put16(ref + 2, 0xffff);
      else {
        put16(ref + 2, names.length);
        names.push(r.name.length, ...[...r.name].map((c) => c.charCodeAt(0)));
      }
      put32(ref + 4, offsets[i]!);
      ref += refSize;
    }
  });
  put16(m + 26, bytes.length - m);
  bytes.push(...names);
  return Uint8Array.from(bytes);
}

describe("packResources", () => {
  it("reads types, ids, names and payloads from the map", () => {
    const d = buildPack([
      { type: "FsTH", id: 600, name: "AngelFish", payload: [1, 2, 3] },
      { type: "FsTI", id: 600, name: "AngelFish", payload: [4, 5] },
      { type: "FsTI", id: 601, payload: [6] },
    ], { kind: "XXXX" });
    const r = packResources(d);
    expect(r.map((x) => [x.type, x.id, x.name, [...x.payload]])).toEqual([
      ["FsTH", 600, "AngelFish", [1, 2, 3]],
      ["FsTI", 600, "AngelFish", [4, 5]],
      ["FsTI", 601, null, [6]],
    ]);
  });

  it("falls back to type order when refs are not standard", () => {
    const d = buildPack([
      { type: "DrgI", id: 1100, payload: [9, 9] },
      { type: "DrgH", id: 1100, payload: [8] },
    ], { refSize: 10 });
    const r = packResources(d);
    expect(r.map((x) => [x.type, x.id, [...x.payload]]))
      .toEqual([["DrgI", -1, [9, 9]], ["DrgH", -1, [8]]]);
  });

  it("returns nothing for data without a readable map", () => {
    expect(packResources(new Uint8Array(8))).toEqual([]);
    const d = buildPack([{ type: "SicI", id: 400, payload: [1] }]);
    d[4] = 0xff; d[5] = 0xff; // map offset past the end
    expect(packResources(d)).toEqual([]);
  });
});

describe("packKind", () => {
  it("reads the header tag, null when blank", () => {
    expect(packKind(buildPack([{ type: "DrgI", id: 1, payload: [0] }],
                              { kind: "AqDr" }))).toBe("AqDr");
    expect(packKind(buildPack([{ type: "DrgI", id: 1, payload: [0] }])))
      .toBeNull();
  });
});
