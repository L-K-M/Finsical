import { afterEach, describe, expect, it, vi } from "vitest";
import { COLLECTIONS, listAddons } from "./import.js";
import type { Collection, Importable, PackSection } from "./import.js";
import { resolveStarter, runStarter, STARTER_SET, starterCollection,
         unreachedStarter, wantsStarterSounds, welcomeOffer }
  from "./starter.js";

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

describe("unreachedStarter", () => {
  const all = STARTER_SET.map((s) => item(s.section, s.inner));

  it("is empty when every listing answered, whatever is missing", () => {
    // An item absent from a complete listing is gone from the archive:
    // the set skips it for good.
    expect(unreachedStarter(all.slice(1), false)).toEqual([]);
  });

  it("names what a failed listing kept out of reach", () => {
    const got = unreachedStarter(all.filter((i) =>
      i.section !== "plants" && i.section !== "backgrounds"), true);
    expect(got.map((g) => g.inner)).toEqual(["Amazon_L", "Back03"]);
  });

  it("is empty when the listing failed but the whole set came back",
     () => {
    expect(unreachedStarter(all, true)).toEqual([]);
  });
});

describe("the starter set behind a failed listing", () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  const A = "aquazonewithguppiesandaddons";
  const link = (outer: string, rel: string): string =>
    `<a href="/download/${A}/${encodeURIComponent(outer)}/` +
    `${encodeURIComponent(rel)}">x</a>`;

  it("reports the JPN page's failure, and its items as unreached",
     async () => {
    // The JPN set alone holds the starter plant and backdrop; its one
    // listing page answers 503 while the rest list fine.
    vi.stubGlobal("fetch", async (u: string) => {
      const url = decodeURIComponent(String(u));
      if (url.includes("aquazone-jpn-set"))
        return new Response("busy", { status: 503 });
      if (url.endsWith("addon and modded fish.zip/"))
        return new Response(["banggai", "clownfish", "neon"].map((n) =>
          link("addon and modded fish.zip", `${n}.zip`)).join(""));
      if (url.endsWith("gravel.zip/"))
        return new Response(link("gravel.zip", "brownsand.zip"));
      if (url.endsWith("Missing addons Aquazone.7z/"))
        return new Response(link("Missing addons Aquazone.7z",
          "addons Aquazone/System/AZ_WAVES.REZ"));
      return new Response(null, { status: 404 });
    });
    const failed: Collection[] = [];
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const listing = await listAddons(starterCollection, undefined,
                                     (col) => { failed.push(col); });
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((c) => c.outer.includes("JPN"))).toBe(true);
    // Five of the seven list; the other two are out of reach, not gone.
    expect(resolveStarter(listing)).toHaveLength(STARTER_SET.length - 2);
    expect(unreachedStarter(listing, failed.length > 0)
      .map((s) => s.inner)).toEqual(["Amazon_L", "Back03"]);
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

describe("welcomeOffer", () => {
  it("greets a new tank", () => {
    expect(welcomeOffer({ answer: null, pristine: true })).toBe("welcome");
  });

  it("greets again when the welcome was left unanswered", () => {
    for (const pristine of [true, false])
      expect(welcomeOffer({ answer: "pending", pristine })).toBe("welcome");
  });

  it("offers the rest after stocking didn't finish", () => {
    for (const pristine of [true, false])
      expect(welcomeOffer({ answer: "retry", pristine })).toBe("retry");
  });

  it("leaves an answered offer alone, including the old answer", () => {
    for (const answer of ["declined", "stocked", "1"])
      for (const pristine of [true, false])
        expect(welcomeOffer({ answer, pristine })).toBeNull();
  });

  it("leaves a tank set up before the welcome alone", () => {
    expect(welcomeOffer({ answer: null, pristine: false })).toBeNull();
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
      installed: () => false,
      fishArrived: () => {},
      soundsArrived: () => {},
      stopped: () => false,
    });
    // banggai resolves → its install's await wakes the loop, which
    // calls clownfish and parks; the sounds kick off in between. A
    // macrotask drains every queued microtask, so this doesn't count
    // runStarter's internal await boundaries.
    for (let i = 0; i < 20 && !calls.includes("AZ_WAVES"); i++)
      await new Promise((r) => setTimeout(r, 0));
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
      installed: () => false,
      fishArrived: () => {},
      soundsArrived: () => {},
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
      installed: () => false,
      fishArrived: () => {},
      soundsArrived: () => {},
      stopped: () => false,
    });
    expect(r.failed.map((f) => f.inner)).toEqual(["AZ_WAVES"]);
    expect(r.problem).toBe(err);
  });

  it("counts a null rejection from the bank as a failure", async () => {
    // Success resolves to null internally — a null rejection must not
    // be mistaken for it.
    const r = await runStarter(set, {
      install: (it) => it.section === "sounds"
        ? Promise.reject(null) : Promise.resolve(),
      progress: () => {},
      installed: () => false,
      fishArrived: () => {},
      soundsArrived: () => {},
      stopped: () => false,
    });
    expect(r.failed.map((f) => f.inner)).toEqual(["AZ_WAVES"]);
    expect(r.problem).toBeInstanceOf(Error);
  });

  it("counts a null rejection from an art item as a failure", async () => {
    const r = await runStarter(set, {
      install: (it) => it.section === "gravel"
        ? Promise.reject(null) : Promise.resolve(),
      progress: () => {},
      installed: () => false,
      fishArrived: () => {},
      soundsArrived: () => {},
      stopped: () => false,
    });
    expect(r.failed.map((f) => f.inner)).toEqual(["brownsand"]);
    expect(r.problem).toBeInstanceOf(Error);
    expect((r.problem as Error).message).toContain("brownsand");
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
      installed: () => false,
      fishArrived: () => {},
      soundsArrived: () => {},
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
      installed: () => false,
      fishArrived: () => {},
      soundsArrived: () => {},
      stopped: () => stopped,
    });
    expect(calls).toEqual(["banggai"]);
    expect(r.failed).toEqual([]);
  });

  it("skips what the tank already has and counts only the rest", async () => {
    const calls: string[] = [];
    const seen: [number, number][] = [];
    const have = new Set(["banggai", "brownsand"]);
    const r = await runStarter(set, {
      install: (it) => { calls.push(it.inner); return Promise.resolve(); },
      installed: (it) => have.has(it.inner),
      progress: (i, total) => seen.push([i, total]),
      fishArrived: () => {},
      soundsArrived: () => {},
      stopped: () => false,
    });
    expect(calls).not.toContain("banggai");
    expect(calls).not.toContain("brownsand");
    expect(calls).toHaveLength(set.length - have.size);
    expect(seen).toEqual(calls.map((_, i) => [i, set.length - have.size]));
    expect(r.failed).toEqual([]);
  });

  it("reports the sound bank only when it lands", async () => {
    const landed: string[] = [];
    const hooks = (fail: boolean) => ({
      install: (it: Importable) => fail && it.section === "sounds"
        ? Promise.reject(new Error("bank fetch died")) : Promise.resolve(),
      installed: () => false,
      progress: () => {},
      fishArrived: () => {},
      soundsArrived: (it: Importable) => { landed.push(it.inner); },
      stopped: () => false,
    });
    await runStarter(set, hooks(true));
    expect(landed).toEqual([]);
    await runStarter(set, hooks(false));
    expect(landed).toEqual(["AZ_WAVES"]);
  });
});
