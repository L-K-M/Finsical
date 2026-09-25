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
  it("sorts by status: hunger bands, then a fixed state order", () => {
    const rows = sortItems(items, "status").map((i) => i.name);
    // Hungry Angelfish ahead of full Clownfish; add-ons after the fish.
    expect(rows).toEqual(["Angelfish", "Clownfish", "Blue.grv", "tang.fsh"]);
  });
  it("a turning fish reads and sorts as Swimming", () => {
    // A roll lasts ~10 ticks — "Turning" churned the Status column.
    const withTurn = itemsOf({ ...STATE, addons: [],
      fish: [{ id: 1, species: "Clownfish", hunger: 0.2,
               state: "turn" }] });
    expect(withTurn[0]!.status).toBe("Swimming, full");
    // ...and it keeps the same sort seat a drifting twin would take.
    const both = itemsOf({ ...STATE, addons: [], fish: [
      { id: 1, species: "Clownfish", hunger: 0.2, state: "turn" },
      { id: 2, species: "Angelfish", hunger: 0.2, state: "drift" },
    ] });
    expect(sortItems(both, "status").map((i) => i.name))
      .toEqual(["Angelfish", "Clownfish"]); // name tiebreak, stable
  });
  it("a hostile state string falls back to Swimming", () => {
    // "constructor" resolves to an inherited Object.prototype member —
    // a function, not nullish — so a ?? guard alone can't catch it.
    const rows = itemsOf({ ...STATE, addons: [], fish: [
      { id: 1, species: "Clownfish", hunger: 0.2, state: "constructor" },
    ] });
    expect(rows[0]!.status).toBe("Swimming, full");
  });
  it("a startle can't outrank a hungrier calm fish", () => {
    const rows = sortItems(itemsOf({ ...STATE, addons: [], fish: [
      { id: 1, species: "Zebra", hunger: 0.9, state: "drift" },
      { id: 2, species: "Alpha", hunger: 0.5, state: "startle" },
    ] }), "status");
    expect(rows.map((i) => i.name)).toEqual(["Zebra", "Alpha"]);
  });
  it("orders the hunger bands starving, hungry, peckish, full", () => {
    // A renamed or dropped band falls into the "full" fallback rank and
    // lands at the wrong end of this order.
    const rows = sortItems(itemsOf({ ...STATE, addons: [], fish: [
      { id: 1, species: "Fed", hunger: 0.05, state: "drift" },
      { id: 2, species: "Snackish", hunger: 0.5, state: "drift" },
      { id: 3, species: "Hungry", hunger: 0.7, state: "drift" },
      { id: 4, species: "Starving", hunger: 0.9, state: "drift" },
    ] }), "status");
    expect(rows.map((i) => i.name))
      .toEqual(["Starving", "Hungry", "Snackish", "Fed"]);
  });
  it("bands malformed hunger readings as full", () => {
    // A negative or non-finite bus value must not sort a fish to the
    // urgent end; hungerLabel sends both to "full" — in the status
    // text too, so sort and display can't disagree.
    const rows = sortItems(itemsOf({ ...STATE, addons: [], fish: [
      { id: 1, species: "Negative", hunger: -0.5, state: "drift" },
      { id: 2, species: "Notanum", hunger: NaN, state: "drift" },
      { id: 3, species: "Peckish", hunger: 0.5, state: "drift" },
      { id: 4, species: "Overflow", hunger: Infinity, state: "drift" },
    ] }), "status");
    expect(rows.map((i) => i.name))
      .toEqual(["Peckish", "Negative", "Notanum", "Overflow"]);
    expect(rows[0]!.status).toBe("Swimming, peckish");
    for (const r of rows.slice(1))
      expect(r.status).toBe("Swimming, full");
  });
  it("keeps add-ons after fish, In tank before Showing", () => {
    // The old status-text sort grouped the two; the rank key must keep
    // that order rather than interleaving add-ons by name.
    const rows = sortItems(itemsOf({ ...STATE,
      fish: [{ id: 1, species: "Guppy", hunger: 0.9, state: "drift" }],
      addons: [
        { section: "gravel", inner: "Ashown.grv", url: "u:shown" },
        { section: "gravel", inner: "Zidle.grv", url: "u:idle" },
      ],
      scenery: { gravel: "u:shown" } }), "status");
    expect(rows.map((i) => i.name))
      .toEqual(["Guppy", "Zidle.grv", "Ashown.grv"]);
  });
  it("ailing fish lead the status sort, Dead before Sick", () => {
    // Names are picked so the alphabetical tiebreak would produce the
    // wrong order if the ailing ranks didn't split.
    const rows = sortItems(itemsOf({ ...STATE, addons: [], fish: [
      { id: 1, species: "Alive", hunger: 0.9, state: "seek" },
      { id: 2, species: "Zombie", hunger: 0.1, state: "drift", sick: 3 },
      { id: 3, species: "Mort", hunger: 0.1, state: "dead", dead: 1 },
    ] }), "status");
    expect(rows.map((i) => i.name)).toEqual(["Mort", "Zombie", "Alive"]);
    expect(rows[0]!.status).toMatch(/^Dead/);
    expect(rows[1]!.status).toMatch(/^Sick/);
  });
  it("defaults to ascending, as a first click on a column does", () => {
    expect(sortItems(items, "name")).toEqual(sortItems(items, "name", 1));
  });
  it("reverses a whole column, tie-breakers and all, when it flips", () => {
    // The reverse-of-forward identity below holds only while no two
    // fixtures compare fully equal: rows that tie keep their place in
    // both directions because the sort is stable. Names compare with
    // the base collator — case- and accent-insensitive — so assert it
    // with that collator: a "Cafe"/"Café" pair is distinct lowercase
    // yet compares equal, and would fail only as a puzzling order
    // mismatch if this guard didn't catch it first.
    for (const a of items) for (const b of items)
      if (a !== b)
        expect(a.name.localeCompare(b.name, undefined,
          { sensitivity: "base" })).not.toBe(0);
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
