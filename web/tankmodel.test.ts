import { describe, expect, it } from "vitest";
import { capRefusal, entryKey, entryOfSlot, entryStem, legacyEntries,
         partName } from "./tankmodel.js";

describe("entryStem", () => {
  it("drops the folder and the extension", () => {
    expect(entryStem("angels/blackangel.fsh")).toBe("blackangel");
    expect(entryStem("angel.fsh")).toBe("angel");
    expect(entryStem("Aquazone.REZ")).toBe("Aquazone");
  });

  it("keeps a name that is all extension", () => {
    expect(entryStem(".fsh")).toBe(".fsh");
  });
});

describe("partName", () => {
  it("keeps the listing name for a single-pack add-on", () => {
    expect(partName("banggai", "banggai.fsh", 1)).toBe("banggai");
  });

  it("names each entry of a multi-pack add-on by its pack", () => {
    expect(partName("angels", "angel.fsh", 2)).toBe("angel");
    expect(partName("angels", "blackangel.fsh", 2)).toBe("blackangel");
  });
});

describe("capRefusal", () => {
  it("takes an install that fits", () => {
    expect(capRefusal(10, 1, 12)).toBeNull();
    expect(capRefusal(10, 2, 12)).toBeNull();
  });

  it("takes anything that adds no fish, even over the cap", () => {
    expect(capRefusal(12, 0, 12)).toBeNull();
    expect(capRefusal(14, 0, 12)).toBeNull();
  });

  it("refuses a full tank", () => {
    expect(capRefusal(12, 1, 12)).toMatch(/^The tank is full: 12 fish/);
    // A healed pre-cap roster can sit above the cap.
    expect(capRefusal(14, 1, 12)).toMatch(/^The tank is full/);
  });

  it("refuses a multi-pack add-on whole when only some would fit", () => {
    expect(capRefusal(11, 2, 12)).toBe(
      "This add-on brings 2 fish, and the tank has room for 1 more. " +
      "Release 1 from Tank Overview first.");
  });
});

describe("legacy entry migration", () => {
  // angels.zip as v0.3.0 installed it: one fish per entry, in entry
  // order, ids ascending. Restoring registers both entries; the URL's
  // pack-level slot ends on the last one, as handleSheets leaves it.
  const URL = "https://archive.org/angels.zip";
  const byEntry = new Map([[entryKey(URL, "angel.fsh"), 0],
                           [entryKey(URL, "blackangel.fsh"), 1]]);
  const byPack = new Map([[URL, 1]]);

  it("finds the entry that owns a slot", () => {
    expect(entryOfSlot(byEntry, URL, 0)).toBe("angel.fsh");
    expect(entryOfSlot(byEntry, URL, 1)).toBe("blackangel.fsh");
    expect(entryOfSlot(byEntry, "other", 1)).toBeUndefined();
  });

  it("gives each legacy fish of a multi-pack add-on its own entry",
     () => {
    const fish = [{ id: 8, pack: URL }, { id: 7, pack: URL }];
    const m = legacyEntries(fish, byEntry);
    expect(m.get(7)).toBe("angel.fsh");
    expect(m.get(8)).toBe("blackangel.fsh");
  });

  it("is what the pack-level slot alone gets wrong", () => {
    // Main's backfill: the URL's slot, then the entry owning it.
    const slot = byPack.get(URL)!;
    expect(entryOfSlot(byEntry, URL, slot)).toBe("blackangel.fsh");
  });

  it("cycles through the entries for Add Again copies", () => {
    const fish = [1, 2, 3].map((id) => ({ id, pack: URL }));
    expect([...legacyEntries(fish, byEntry)]).toEqual(
      [[1, "angel.fsh"], [2, "blackangel.fsh"], [3, "angel.fsh"]]);
  });

  it("leaves fish that have an entry, or a single-entry add-on", () => {
    const one = "https://archive.org/banggai.zip";
    const m = legacyEntries(
      [{ id: 1, pack: URL, entry: "angel.fsh" }, { id: 2, pack: one },
       { id: 3 }],
      new Map([...byEntry, [entryKey(one, "banggai.fsh"), 2]]));
    expect(m.size).toBe(0);
  });

  it("assigns nothing for an add-on that hasn't restored", () => {
    expect(legacyEntries([{ id: 1, pack: URL }], new Map()).size).toBe(0);
  });
});
