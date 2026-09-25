import { describe, expect, it } from "vitest";
import { COLLECTIONS } from "./import.js";
import type { Importable, PackSection } from "./import.js";
import { resolveStarter, runStarter, STARTER_SET, starterCollection,
         wantsStarterSounds } from "./starter.js";

const item = (section: PackSection, inner: string): Importable =>
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

describe("runStarter", () => {
  const deferred = <T>() => {
    let resolve!: (v: T) => void, reject!: (e: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res; reject = rej;
    });
    return { promise, resolve, reject };
  };
  const set = STARTER_SET.map((s) => item(s.section, s.inner));

  it("starts the sounds download while the second fish is out", async () => {
    const calls: string[] = [];
    const hold = deferred<unknown>(); // the second fish's fetch
    const install = (it: Importable): Promise<unknown> => {
      calls.push(it.inner);
      return it.inner === "clownfish" ? hold.promise
                                     : Promise.resolve();
    };
    const run = runStarter(set, {
      install,
      progress: () => {},
      fishArrived: () => {},
      stopped: () => false,
    });
    // banggai resolves → its install's await wakes the loop, which
    // calls clownfish and parks; the sounds kick off in between.
    for (let i = 0; i < 5 && !calls.includes("AZ_WAVES"); i++)
      await Promise.resolve();
    expect(calls).toEqual(["banggai", "clownfish", "AZ_WAVES"]);
    hold.resolve(null);
    const r = await run;
    expect(r.failed).toEqual([]);
    expect(r.problem).toBeNull();
  });

  it("reports every install through progress in set order", async () => {
    const seen: number[] = [];
    await runStarter(set, {
      install: () => Promise.resolve(),
      progress: (i) => seen.push(i),
      fishArrived: () => {},
      stopped: () => false,
    });
    expect(seen).toEqual(set.map((_, i) => i));
  });

  it("folds a rejected sounds install into failed", async () => {
    const err = new Error("bank fetch died");
    const r = await runStarter(set, {
      install: (it) => it.section === "sounds"
        ? Promise.reject(err) : Promise.resolve(),
      progress: () => {},
      fishArrived: () => {},
      stopped: () => false,
    });
    expect(r.failed.map((f) => f.inner)).toEqual(["AZ_WAVES"]);
    expect(r.problem).toBe(err);
  });

  it("still installs the sounds when every fish fails", async () => {
    const calls: string[] = [];
    await runStarter(set, {
      install: (it) => {
        calls.push(it.inner);
        return it.section === "fish"
          ? Promise.reject(new Error("nope")) : Promise.resolve();
      },
      progress: () => {},
      fishArrived: () => {},
      stopped: () => false,
    });
    expect(calls).toContain("AZ_WAVES");
  });

  it("stops before the next item once stopped", async () => {
    const calls: string[] = [];
    let stopped = false;
    const r = await runStarter(set, {
      install: (it) => {
        calls.push(it.inner);
        stopped = true;
        return Promise.resolve();
      },
      progress: () => {},
      fishArrived: () => {},
      stopped: () => stopped,
    });
    expect(calls).toEqual(["banggai"]);
    expect(r.failed).toEqual([]);
  });
});
