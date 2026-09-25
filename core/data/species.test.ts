import { describe, expect, it } from "vitest";
import { DEFAULT_CARE, DEFAULT_SUSCEPTIBLE, packSpeciesCare, parseFsti,
         parseSusceptibility, sanitizeCare } from "./species.js";
import { buildPack } from "./rsrc.fixture.js";

/** An FsTI record: the tolerance table in thousandths, max before min. */
function fsti(): Uint8Array {
  const b = new Uint8Array(210);
  const v = new DataView(b.buffer);
  v.setInt16(0, 365, true);                        // breedAge
  const bands = [[28, 24, 32, 22, 4], [7.5, 5.5, 9.5, 3.5, 1],
                 [12, 3.5, 15, 0, 2], [20, 0, 50, 0, 10], [5, 0, 40, 0, 5],
                 [2, 0, 20, 0, 1], [0.1, 0, 2, 0, 1], [1000, 0, 1000, 0, 1000]];
  bands.forEach(([iMax, iMin, lMax, lMin, roc], i) => {
    const o = 0x0e + i * 18;
    v.setInt32(o, iMax! * 1000, true); v.setInt32(o + 4, iMin! * 1000, true);
    v.setInt32(o + 8, lMax! * 1000, true); v.setInt32(o + 12, lMin! * 1000, true);
    v.setInt16(o + 16, roc!, true);
  });
  v.setInt16(0x9e, 20, true);                      // unhealthyValRes
  v.setUint32(0xbe, 180 * 1440, true);             // adultStart
  v.setUint32(0xc4, 1460 * 1440, true);            // lifeSpan
  return b;
}

describe("parseFsti", () => {
  it("reads the angelfish's needs", () => {
    const c = parseFsti(fsti())!;
    expect(c.tolerance.temp).toEqual(
      { idealMin: 24, idealMax: 28, liveMin: 22, liveMax: 32, rateOfChange: 4 });
    expect(c.tolerance.chlorine.idealMax).toBeCloseTo(0.1);
    expect(c.unhealthy).toBe(20);
    expect(c.adultAge).toBe(180 * 1440);
    expect(c.lifeSpan).toBe(1460 * 1440);
    expect(c.breedAge).toBe(365);
  });

  it("rejects short or inverted records", () => {
    expect(parseFsti(new Uint8Array(100))).toBeNull();
    const b = fsti();
    new DataView(b.buffer).setInt32(0x0e + 4, 99_000, true); // idealMin > max
    expect(parseFsti(b)).toBeNull();
  });

  it("keeps a fallback adult age below a short life span", () => {
    const b = fsti();
    const v = new DataView(b.buffer);
    v.setUint32(0xbe, 0, true);
    v.setUint32(0xc4, 60 * 1440, true);
    const c = parseFsti(b)!;
    expect(c.adultAge).toBeLessThan(c.lifeSpan);
  });

  it("falls back when the ages make no sense", () => {
    const b = fsti();
    new DataView(b.buffer).setUint32(0xbe, 0, true);
    expect(parseFsti(b)!.adultAge).toBe(DEFAULT_CARE.adultAge);
  });
});

describe("parseSusceptibility", () => {
  it("reads a count and ids", () => {
    expect(parseSusceptibility(Uint8Array.of(2, 0, 0x95, 1, 0x96, 1)))
      .toEqual([405, 406]);
    expect(parseSusceptibility(Uint8Array.of(3, 0, 0x95, 1))).toBeNull();
  });
});

describe("sanitizeCare", () => {
  it("round-trips a valid record and rejects a damaged one", () => {
    const c = parseFsti(fsti())!;
    expect(sanitizeCare(JSON.parse(JSON.stringify(c)))).toEqual(c);
    expect(sanitizeCare({ ...c, lifeSpan: -1 })).toBeNull();
    expect(sanitizeCare({ ...c, lifeSpan: c.adultAge })).toBeNull();
    expect(sanitizeCare({ ...c, tolerance: { ...c.tolerance, pH: {} } }))
      .toBeNull();
    expect(sanitizeCare("angelfish")).toBeNull();
  });
});

describe("packSpeciesCare", () => {
  it("pairs each species' SuS# by resource id, not by position", () => {
    // Two species in one pack; species 600's susceptibility list is
    // the second SuS# — a positional find would hand it 601's.
    const d = buildPack([
      { type: "FsTI", id: 600, payload: [...fsti()] },
      { type: "FsTI", id: 601, payload: [...fsti()] },
      { type: "SuS#", id: 601, payload: [1, 0, 7, 0] },
      { type: "SuS#", id: 600, payload: [1, 0, 3, 0] },
    ]);
    expect(packSpeciesCare(d)!.susceptible).toEqual([3]);
  });

  it("keeps the fallback for a pack with one shared SuS#", () => {
    const d = buildPack([
      { type: "FsTI", id: 600, payload: [...fsti()] },
      { type: "SuS#", id: 999, payload: [1, 0, 5, 0] },
    ]);
    expect(packSpeciesCare(d)!.susceptible).toEqual([5]);
  });

  it("guesses no list when several SuS# records match no FsTI id", () => {
    // Rather than handing species 600 whichever list comes first.
    const d = buildPack([
      { type: "FsTI", id: 600, payload: [...fsti()] },
      { type: "SuS#", id: 701, payload: [1, 0, 7, 0] },
      { type: "SuS#", id: 702, payload: [1, 0, 3, 0] },
    ]);
    expect(packSpeciesCare(d)!.susceptible).toEqual(DEFAULT_SUSCEPTIBLE);
  });
});
