import { describe, expect, it } from "vitest";
import { COLLECTIONS } from "./import.js";
import type { Importable } from "./import.js";
import { resolveStarter, STARTER_SET, starterCollection, wantsStarterSounds }
  from "./starter.js";

const item = (section: string, inner: string): Importable =>
  ({ section, inner,
     url: `https://archive.org/download/x/${section}.zip/${inner}.zip` });

describe("resolveStarter", () => {
  const full = [
    item("fish", "angels"),
    ...STARTER_SET.map((s) => item(s.section, s.inner)),
  ].reverse();

  it("takes the listing's entries, in STARTER_SET order", () => {
    const got = resolveStarter(full);
    expect(got.map((g) => [g.section, g.inner]))
      .toEqual(STARTER_SET.map((s) => [s.section, s.inner]));
    expect(got.every((g) => full.includes(g))).toBe(true);
  });

  it("skips items the listing lacks", () => {
    const [first, ...rest] = STARTER_SET;
    const got = resolveStarter(
      rest.map((s) => item(s.section, s.inner)));
    expect(got).toHaveLength(STARTER_SET.length - 1);
    expect(got.some((g) => g.inner === first!.inner)).toBe(false);
  });

  it("matches the section as well as the name", () => {
    const s = STARTER_SET[0]!;
    expect(resolveStarter([item("plants", s.inner)])).toEqual([]);
  });

  it("comes back empty for an empty listing (offline)", () => {
    expect(resolveStarter([])).toEqual([]);
  });
});

describe("STARTER_SET", () => {
  it("has fish, a gravel, a plant, a background and the sounds", () => {
    const sections = STARTER_SET.map((s) => s.section);
    expect(sections.filter((s) => s === "fish").length).toBeGreaterThan(1);
    for (const s of ["gravel", "plants", "backgrounds", "sounds"])
      expect(sections.filter((x) => x === s)).toHaveLength(1);
  });

  // Each item must be findable without listing a nested collection,
  // which downloads its whole outer zip.
  it("draws only on archive.org collections with a listing page", () => {
    for (const s of STARTER_SET) {
      expect(COLLECTIONS.some((c) =>
        c.section === s.section && starterCollection(c)), s.inner)
        .toBe(true);
    }
    // A nested collection is left out even when its section is one the
    // starter set draws on (mekasia's plants, say).
    const nested = COLLECTIONS.find((c) => c.outer.includes("/") &&
      STARTER_SET.some((s) => s.section === c.section));
    expect(nested).toBeDefined();
    expect(starterCollection(nested!)).toBe(false);
  });
});

describe("wantsStarterSounds", () => {
  const tank = { welcomePending: false, soundsHandled: false,
                 hasSounds: false };

  it("gives a silent tank from before the sounds its sounds", () => {
    expect(wantsStarterSounds(tank)).toBe(true);
  });

  it("leaves a first launch to the welcome", () => {
    expect(wantsStarterSounds({ ...tank, welcomePending: true }))
      .toBe(false);
  });

  it("keeps sounds the user already has", () => {
    expect(wantsStarterSounds({ ...tank, hasSounds: true })).toBe(false);
  });

  it("does not bring back sounds once handled", () => {
    expect(wantsStarterSounds({ ...tank, soundsHandled: true }))
      .toBe(false);
  });
});
