import { afterEach, describe, expect, it, vi } from "vitest";
import { ownBytes } from "../core/data/bytes.js";
import { buildBank, wav } from "../core/data/sndbank.fixture.js";

// Nothing persists in node, but the calls are what the tests check.
const store = vi.hoisted(() => ({
  packPut: vi.fn(async () => true),
}));
vi.mock("./store.js", async (orig) => ({
  ...await orig<typeof import("./store.js")>(),
  packGet: async () => null,
  packPut: store.packPut,
  metaGet: async () => null,
  metaPut: async () => true,
}));
const { importAddon, listAddons, loadProblem } = await import("./import.js");

const ITEM = "https://archive.org/download/aquazonewithguppiesandaddons";
const PAGE = `${ITEM}/Missing%20addons%20Aquazone.7z/`;
const BANK_URL = `${ITEM}/Missing%20addons%20Aquazone.7z/` +
  "Missing%20addons%20Aquazone%2FSystem%2FAZ_WAVES.REZ";

afterEach(() => {
  vi.unstubAllGlobals();
  store.packPut.mockClear();
});

/** An archive view row as archive.org writes it: the whole entry path
 * percent-encoded into one segment. */
const row = (path: string) =>
  `<a href="//archive.org/download/aquazonewithguppiesandaddons/` +
  `Missing%20addons%20Aquazone.7z/${encodeURIComponent(path)}">x</a>`;

describe("the game's sound bank on archive.org", () => {
  it("lists AZ_WAVES under the folder the 7z really stores it in", async () => {
    const html = [
      row("addons Aquazone/System/AZ_WAVES.REZ"),
      row("addons Aquazone/System/Aquazone.rez"),
      row("addons Aquazone/ITEMS/Plants/X.plt"),
    ].join("\n");
    vi.stubGlobal("fetch", async (u: string) =>
      String(u) === PAGE ? new Response(html)
                         : new Response(null, { status: 404 }));
    const got = await listAddons(
      (c) => c.outer === "Missing addons Aquazone.7z");
    expect(got).toEqual([{ section: "sounds", inner: "AZ_WAVES",
                           url: BANK_URL }]);
  });

  it("imports the bank's WAVs as named sound records", async () => {
    const bank = buildBank([{ tag: "snd ", res: [
      { id: 1000, body: wav(1) }, { id: 9000, body: wav(2) },
    ] }]);
    vi.stubGlobal("fetch", async (u: string) =>
      String(u) === BANK_URL ? new Response(ownBytes(bank))
                             : new Response(null, { status: 404 }));
    const rs = await importAddon(BANK_URL);
    expect(rs).toHaveLength(1);
    expect(rs[0]!.sheets.size + rs[0]!.images.size).toBe(0);
    expect(rs[0]!.sounds.map((s) => s.name))
      .toEqual(["AZ bubble 9003", "CENTER*"]);
  });

  it("rejects an empty answer instead of caching it", async () => {
    // What the listing's own (unrenamed) URL gets back: 200, no bytes.
    const url = `${ITEM}/Missing%20addons%20Aquazone.7z/empty.REZ`;
    let calls = 0;
    vi.stubGlobal("fetch", async () => { calls++; return new Response(""); });
    const e1 = await importAddon(url).catch((e: unknown) => e);
    expect(String(e1)).toMatch(/: empty$/);
    expect(loadProblem(e1)).toBe(
      "archive.org sent an empty file. Try again later.");
    expect(store.packPut).not.toHaveBeenCalled();
    // Not memoized either: the next try asks archive.org again.
    await importAddon(url).catch(() => {});
    expect(calls).toBe(2);
  });
});
