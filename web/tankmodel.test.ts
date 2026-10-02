import { describe, expect, it } from "vitest";
import { capRefusal, entryKey, entryOfSlot, entryStem, legacyEntries,
         partName, savedFish } from "./tankmodel.js";
import type { Fish } from "../core/sim.js";
import { Sim } from "../core/sim.js";

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
    // A multi-pack add-on asks for room for all of its fish.
    expect(capRefusal(12, 2, 12)).toBe("The tank is full: 12 fish is " +
      "plenty. Release 2 from Tank Overview first.");
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

// The save is the only thing that carries a fish's identity across a
// restart. Every field the tank reads back on the next launch has to
// survive the round trip, and `entry` is the one that used not to.
describe("savedFish", () => {
  // A real fish from the sim, so the fixture cannot drift from the
  // interface the save actually has to cover.
  const fish = (over: Partial<Fish> = {}): Fish => {
    const sim = new Sim({ width: 320, height: 200 }, 1);
    return sim.addFish({ x: 40, y: 90, facing: -1, species: "angel",
                         cruise: 1.2, ...over });
  };

  it("carries the entry that says which pack inside the add-on", () => {
    const rec = savedFish(fish({ pack: "u", entry: "angels/blackangel.fsh" }));
    expect(rec.pack).toBe("u");
    expect(rec.entry).toBe("angels/blackangel.fsh");
  });

  it("omits what the fish does not have, rather than writing a zero",
     () => {
    const rec = savedFish(fish());
    for (const k of ["sheetIdx", "pack", "entry", "name", "life"] as const)
      expect(k in rec, k).toBe(false);
  });

  it("round-trips through the legacy guess without touching it", () => {
    // The bug this pins: with `entry` missing from the save, the fish
    // below comes back as "some fish from that add-on" and
    // legacyEntries guesses from its id. Remove the earlier fish and
    // the survivor is handed the wrong entry — another species' art
    // and name. With `entry` saved there is nothing to guess.
    const URL = "https://archive.org/angels.zip";
    const byEntry = new Map([[entryKey(URL, "angel.fsh"), 0],
                             [entryKey(URL, "blackangel.fsh"), 1]]);
    const gone = fish({ id: 7, pack: URL, entry: "angel.fsh" });
    const kept = savedFish(fish({ id: 8, pack: URL,
                                  entry: "angels/blackangel.fsh" }));
    expect(kept.entry).toBe("angels/blackangel.fsh");
    // Nothing is left for legacyEntries to be asked about.
    expect(legacyEntries([kept, gone], byEntry).size).toBe(0);
    // Without it the survivor takes the first entry instead of its own.
    const { entry: _dropped, ...without } = kept;
    expect("entry" in without).toBe(false);
    expect(legacyEntries([without], byEntry).get(8)).toBe("angel.fsh");
  });

  it("keeps the fields the sim's own save already relied on", () => {
    const f = fish({ name: "Robert", sheetIdx: 4, hunger: 0.8, z: 0.25 });
    const rec = savedFish(f);
    expect(rec).toEqual({
      id: f.id, species: "angel", x: f.x, y: f.y, facing: f.facing,
      heading: f.heading, speed: f.speed, cruise: f.cruise, vy: f.vy,
      bandY: f.bandY, z: f.z, hunger: f.hunger, scale: f.scale,
      sheetIdx: 4, name: "Robert",
    });
  });
});
