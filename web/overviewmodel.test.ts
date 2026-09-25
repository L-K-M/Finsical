import { describe, expect, it } from "vitest";
import { itemsOf, sortItems, summary } from "./overviewmodel.js";
import type { TankState } from "./overviewmodel.js";

const STATE: TankState = {
  op: "state",
  fish: [
    { id: 1, species: "Clownfish", hunger: 0.2, state: "drift",
      pack: "u:clown" },
    { id: 2, species: "Angelfish", hunger: 0.7, state: "seek" },
  ],
  addons: [
    { section: "fish", inner: "clown.fsh", url: "u:clown" },
    { section: "fish", inner: "Angelfish", url: "u:angel" },
    { section: "fish", inner: "tang.fsh", url: "u:tang" },
    { section: "gravel", inner: "Blue.grv", url: "u:blue" },
  ],
};

describe("itemsOf", () => {
  it("lists fish, then add-ons that have no fish of their own", () => {
    const items = itemsOf(STATE);
    // clown.fsh is bound by pack url, Angelfish by species name (a
    // pre-pack roster); tang.fsh has no fish yet.
    expect(items.map((i) => i.name))
      .toEqual(["Clownfish", "Angelfish", "tang.fsh", "Blue.grv"]);
    expect(items.map((i) => i.kind))
      .toEqual(["Fish", "Fish", "Fish add-on", "Gravel"]);
    expect(items[0]!.status).toBe("Swimming, full");
    expect(items[1]!.status).toBe("Looking for food, hungry");
  });

  it("labels a starter stand-in honestly", () => {
    const items = itemsOf({ ...STATE,
      fish: [{ id: 9, species: "Guppy", hunger: 0.5, state: "drift",
               standIn: true }] });
    expect(items[0]!.name).toBe("Guppy (stand-in)");
    // The label changes nothing else: a stand-in stays a plain,
    // removable fish row.
    expect(items[0]!.remove).toEqual({ op: "removeFish", id: 9 });
  });

  it("removes each line the way the tank expects", () => {
    const items = itemsOf(STATE);
    expect(items[0]!.remove).toEqual({ op: "removeFish", id: 1 });
    expect(items[3]!.remove).toEqual({ op: "removeAddon", url: "u:blue" });
  });

  it("offers Use on idle scenery, Showing on the active pack", () => {
    const items = itemsOf({ ...STATE, scenery: { gravel: "u:blue" } });
    const blue = items[3]!;
    expect(blue.status).toBe("Showing");
    expect(blue.use).toBeUndefined();
    // A second scenery pack not on display can be swapped in.
    const more = itemsOf({ ...STATE,
      addons: [...STATE.addons ?? [],
        { section: "gravel", inner: "Slate.grv", url: "u:slate" }],
      scenery: { gravel: "u:blue" } });
    const slate = more[4]!;
    expect(slate.status).toBe("In tank");
    expect(slate.use).toEqual({ op: "useAddon", url: "u:slate" });
  });

  it("never offers Use on fish or decor packs", () => {
    const items = itemsOf({ ...STATE,
      addons: [...STATE.addons ?? [],
        { section: "plants", inner: "Kelp.pl", url: "u:kelp" }] });
    const tang = items.find((i) => i.name === "tang.fsh");
    expect(tang).toBeDefined();
    expect(tang?.use).toBeUndefined();
    const kelp = items.find((i) => i.name === "Kelp.pl");
    expect(kelp).toBeDefined();
    expect(kelp?.use).toBeUndefined();
  });
});

describe("sortItems", () => {
  const items = itemsOf(STATE);
  it("sorts by kind alphabetically, like the Finder, names breaking ties",
     () => {
    const more = itemsOf({ ...STATE, addons: [...STATE.addons ?? [],
      { section: "backgrounds", inner: "Reef.bg", url: "u:reef" }] });
    expect(sortItems(more, "kind").map((i) => i.name))
      .toEqual(["Reef.bg", "Angelfish", "Clownfish", "tang.fsh", "Blue.grv"]);
  });
  it("sorts by name, ignoring case", () => {
    expect(sortItems(items, "name").map((i) => i.name))
      .toEqual(["Angelfish", "Blue.grv", "Clownfish", "tang.fsh"]);
  });
  it("sorts by status", () => {
    expect(sortItems(items, "status")[0]!.status).toBe("In tank");
  });
  it("defaults to ascending, as a first click on a column does", () => {
    expect(sortItems(items, "name")).toEqual(sortItems(items, "name", 1));
  });
  it("reverses a whole column, tie-breakers and all, when it flips", () => {
    // The reverse-of-forward identity below holds only while no two
    // fixtures compare fully equal: rows that tie keep their place in
    // both directions because the sort is stable. Names are compared
    // ignoring case, so assert that here — a case-duplicate fixture
    // should fail on this line, not on a puzzling order mismatch.
    expect(new Set(items.map((i) => i.name.toLowerCase())).size)
      .toBe(items.length);
    for (const by of ["name", "kind", "status"] as const)
      expect(sortItems(items, by, -1).map((i) => i.name))
        .toEqual(sortItems(items, by).map((i) => i.name).reverse());
  });
});

describe("summary", () => {
  it("reads like a Finder window header", () => {
    expect(summary(2, 1, 0.934, 30 * 60 * 125))
      .toBe("2 fish, 1 add-on, water 93%, up 2h 5m");
    expect(summary(0, 3, 1, 0)).toBe("0 fish, 3 add-ons, water 100%, up 0m");
  });
});
