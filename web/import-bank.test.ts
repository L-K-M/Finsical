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
const { importAddon, installProblem, listAddons, loadProblem,
        transientFailure } = await import("./import.js");

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

describe("a download that fails in transit", () => {
  const url = `${ITEM}/Missing%20addons%20Aquazone.7z/cut.REZ`;
  /** A body that sends a chunk, then dies the way each engine says. */
  const cut = (msg: string) => new Response(new ReadableStream({
    pull(c) { c.enqueue(new Uint8Array([1, 2])); c.error(new TypeError(msg)); },
  }));

  for (const msg of ["network error",                    // Chromium
                     "Error in body stream",             // Firefox
                     "The network connection was lost."]) // WebKit
    it(`offers Try Again for a body cut off with "${msg}"`, async () => {
      vi.stubGlobal("fetch", async () => cut(msg));
      const e = await importAddon(url).catch((x: unknown) => x);
      expect(transientFailure(e)).toBe(true);
      // Told apart by message, like the other download failures.
      expect(transientFailure((e as Error).message)).toBe(true);
      expect(installProblem(e)).toBe("Check the connection and try again.");
      expect(loadProblem(e)).toBe("Check the connection and try again.");
    });

  it("offers Try Again when the request itself is dropped", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new TypeError("The network connection was lost.");
    });
    const e = await importAddon(url).catch((x: unknown) => x);
    expect(transientFailure(e)).toBe(true);
  });

  it("still calls a stalled download too slow", async () => {
    vi.stubGlobal("fetch", async () => {
      throw new DOMException("The operation was aborted.", "AbortError");
    });
    const e = await importAddon(url).catch((x: unknown) => x);
    expect(transientFailure(e)).toBe(true);
    expect(loadProblem(e)).toBe("The download took too long — try again.");
  });

  it("calls a body that stalls mid-way too slow, not cut off", async () => {
    vi.useFakeTimers();
    try {
      // One chunk, then silence until the stall clock aborts the request,
      // which errors the body the way a browser's fetch does.
      vi.stubGlobal("fetch", async (_u: string, init?: RequestInit) =>
        new Response(new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array([1, 2]));
            init?.signal?.addEventListener("abort", () =>
              c.error(init.signal!.reason));
          },
        })));
      const pending = importAddon(url).catch((x: unknown) => x);
      await vi.advanceTimersByTimeAsync(31_000);
      const e = await pending;
      expect(transientFailure(e)).toBe(true);
      expect(loadProblem(e)).toBe("The download took too long — try again.");
    } finally { vi.useRealTimers(); }
  });

  it("explains a cut-off as one even when the URL says abort", async () => {
    vi.stubGlobal("fetch", async () => cut("network error"));
    const e = await importAddon(`${ITEM}/aborted.REZ`)
      .catch((x: unknown) => x);
    expect(loadProblem(e)).toBe("Check the connection and try again.");
  });
});
