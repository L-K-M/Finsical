import { describe, expect, it } from "vitest";
import { fileSoundRecords } from "./snd.js";
import { bankSounds, GAME_SOUND_NAMES } from "./sndbank.js";
import { buildBank, wav } from "./sndbank.fixture.js";

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
