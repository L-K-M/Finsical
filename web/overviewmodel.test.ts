import { describe, expect, it } from "vitest";
import { itemsOf, sortItems, summary } from "./overviewmodel.js";

const STATE = {
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

  it("removes each line the way the tank expects", () => {
    const items = itemsOf(STATE);
    expect(items[0]!.remove).toEqual({ op: "removeFish", id: 1 });
    expect(items[3]!.remove).toEqual({ op: "removeAddon", url: "u:blue" });
  });
});

describe("sortItems", () => {
  const items = itemsOf(STATE);
  it("sorts by kind alphabetically, like the Finder, names breaking ties",
     () => {
    const more = itemsOf({ ...STATE, addons: [...STATE.addons,
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
});

describe("summary", () => {
  it("reads like a Finder window header", () => {
    expect(summary(2, 1, 0.934, 30 * 60 * 125))
      .toBe("2 fish, 1 add-on, water 93%, up 2h 5m");
    expect(summary(0, 3, 1, 0)).toBe("0 fish, 3 add-ons, water 100%, up 0m");
  });
});
