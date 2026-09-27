import { describe, expect, it } from "vitest";
import { fileSoundRecords } from "./snd.js";
import { bankSounds, GAME_SOUND_NAMES, MAX_FILE_SOUNDS } from "./sndbank.js";
import { buildBank, wav } from "./sndbank.fixture.js";

/** A bank whose one 'snd ' entry lists `n` references, all to the
 * same payload: the crafted shape that multiplies one WAV. */
function sharedRefs(n: number, id = 1000): Uint8Array {
  const body = wav(1);
  const dataLen = 4 + body.length, typeList = 30;
  const mapLen = typeList + 8 + n * 12, mapOff = 0x100 + dataLen;
  const out = new Uint8Array(mapOff + mapLen);
  const v = new DataView(out.buffer);
  [0x100, mapOff, dataLen, mapLen].forEach((x, i) => {
    v.setUint32(i * 4, x, true);
    v.setUint32(mapOff + i * 4, x, true);
  });
  v.setUint32(0x100, body.length, true);
  out.set(body, 0x104);
  v.setUint16(mapOff + 24, typeList, true);
  v.setUint16(mapOff + 26, mapLen, true);
  v.setUint16(mapOff + 28, 0, true);
  const e = mapOff + typeList;
  out.set([0x20, 0x64, 0x6e, 0x73], e); // " dns"
  v.setUint16(e + 4, n - 1, true);
  v.setUint16(e + 6, 8, true);
  for (let j = 0; j < n; j++) {
    const p = e + 8 + j * 12;
    v.setInt16(p, id, true);
    v.setInt16(p + 2, -1, true);
  }
  return out;
}

describe("bankSounds", () => {
  it("names each WAV by the Mac build's name for its id", () => {
    const bank = buildBank([{ tag: "snd ", res: [
      { id: 1000, body: wav(1) }, { id: 16016, body: wav(2) },
    ] }]);
    const got = bankSounds(bank);
    expect(got.map((s) => s.name)).toEqual(["CENTER*", "Drop"]);
    expect(got[1]!.wav).toEqual(wav(2));
  });

  it("puts the bubbling first, then goes by id", () => {
    const bank = buildBank([{ tag: "snd ", res: [
      { id: 17232, body: wav(1) }, { id: 9000, body: wav(2) },
      { id: 1003, body: wav(3) },
    ] }]);
    expect(bankSounds(bank).map((s) => s.name))
      .toEqual(["AZ bubble 9003", "BOTTOM*", "IntoWater"]);
  });

  it("prefers a name stored in the map, then falls back to the id", () => {
    const bank = buildBank([{ tag: "snd ", res: [
      { id: 1001, body: wav(1), name: "Tap" }, { id: 4242, body: wav(2) },
    ] }]);
    expect(bankSounds(bank).map((s) => s.name))
      .toEqual(["Tap", "snd_4242"]);
  });

  it("skips other resource types and non-WAV payloads", () => {
    const bank = buildBank([
      { tag: "FsTH", res: [{ id: 9001, body: wav(1) }] },
      { tag: "snd ", res: [
        { id: 9001, body: wav(2) },
        { id: 1002, body: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]) },
      ] },
    ]);
    expect(bankSounds(bank)).toEqual([{ name: "aqua", wav: wav(2) }]);
  });

  it("skips an entry whose data runs past the end", () => {
    const bank = buildBank([{ tag: "snd ", res: [
      { id: 1000, body: wav(1) }, { id: 1001, body: wav(2) },
    ] }]);
    // The first payload's length prefix now claims the whole file.
    new DataView(bank.buffer).setUint32(0x100, bank.length, true);
    expect(bankSounds(bank).map((s) => s.name)).toEqual(["SIDE"]);
  });

  it("ignores the attribute byte in a ref's data offset", () => {
    const bank = buildBank(
      [{ tag: "snd ", res: [{ id: 1000, body: wav(1) }] }]);
    const v = new DataView(bank.buffer);
    // Ref list starts past the one 8-byte type entry; the offset's
    // high byte carries attributes real maps set.
    const ref = v.getUint32(4, true) + 30 + 8;
    v.setUint8(ref + 7, 0x01);
    expect(bankSounds(bank).map((s) => s.name)).toEqual(["CENTER*"]);
  });

  it("reads only the first 'snd ' type entry", () => {
    // Real maps list a type once; a duplicate entry is crafted chaff
    // that would re-scan every ref (quadratic on a hostile file).
    const bank = buildBank([
      { tag: "snd ", res: [{ id: 1000, body: wav(1) }] },
      { tag: "snd ", res: [{ id: 1001, body: wav(2) }] },
    ]);
    expect(bankSounds(bank).map((s) => s.name)).toEqual(["CENTER*"]);
  });

  it("yields a payload once, however many references share it", () => {
    const got = bankSounds(sharedRefs(65536));
    expect(got).toEqual([{ name: "CENTER*", wav: wav(1) }]);
  });

  it("stops at MAX_FILE_SOUNDS records", () => {
    const res = Array.from({ length: MAX_FILE_SOUNDS + 50 },
                           (_, i) => ({ id: i + 1, body: wav(i & 0xff) }));
    expect(bankSounds(buildBank([{ tag: "snd ", res }])))
      .toHaveLength(MAX_FILE_SOUNDS);
  });

  it("returns nothing for data that isn't a pack", () => {
    expect(bankSounds(wav(1))).toEqual([]);
    expect(bankSounds(new Uint8Array(0x200))).toEqual([]);
  });

  it("returns nothing when the map offset is out of range", () => {
    const bank = buildBank([{ tag: "snd ", res: [{ id: 1000, body: wav(1) }] }]);
    new DataView(bank.buffer).setUint32(4, bank.length, true);
    expect(bankSounds(bank)).toEqual([]);
  });
});

describe("GAME_SOUND_NAMES", () => {
  it("covers the bank's 25 ids with the names the tank looks up", () => {
    expect(GAME_SOUND_NAMES.size).toBe(25);
    for (const n of ["CENTER*", "SIDE", "TOP*", "BOTTOM*", "Drop",
                     "IntoWater", "AZ bubble 9003", "aqua"])
      expect([...GAME_SOUND_NAMES.values()]).toContain(n);
  });
});

describe("fileSoundRecords", () => {
  it("reads a dropped sound bank, whatever its name", () => {
    const bank = buildBank([{ tag: "snd ", res: [{ id: 13439, body: wav(1) }] }]);
    expect(fileSoundRecords("AZ_WAVES.REZ", bank))
      .toEqual([{ name: "Switch", wav: wav(1) }]);
  });
});
