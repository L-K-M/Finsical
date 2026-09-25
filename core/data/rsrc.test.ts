import { describe, expect, it } from "vitest";
import { packKind, packResources } from "./rsrc.js";
import { buildPack } from "./rsrc.fixture.js";

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
