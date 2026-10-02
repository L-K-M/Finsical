import { afterEach, describe, expect, it, vi } from "vitest";
import { isArchiveUrl, listAddons } from "./import.js";

const PAGE = "https://archive.org/download/aquazonewithguppiesandaddons/" +
  "addon%20and%20modded%20fish.zip/";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("listing pages", () => {
  it("keep downloading past the stall limit while bytes arrive", async () => {
    vi.useFakeTimers();
    const html = '<a href="/download/aquazonewithguppiesandaddons/' +
      'addon%20and%20modded%20fish.zip/banggai.zip">banggai.zip</a>';
    // Four slices 20 s apart: 80 s in all, never 30 s without a byte.
    const parts = [0, 30, 60, 90].map((a, i, xs) => html.slice(a, xs[i + 1]));
    vi.stubGlobal("fetch", async (u: string, init?: RequestInit) => {
      if (String(u) !== PAGE) return new Response(null, { status: 404 });
      let next = 0, aborted = false;
      return new Response(new ReadableStream<Uint8Array>({
        start(c) {
          init?.signal?.addEventListener("abort", () => {
            aborted = true;
            c.error(new DOMException("The operation was aborted.",
                                     "AbortError"));
          });
        },
        pull: (c) => new Promise<void>((done) => setTimeout(() => {
          if (aborted) return done();
          const part = parts[next++];
          if (part === undefined) c.close();
          else c.enqueue(new TextEncoder().encode(part));
          done();
        }, 20_000)),
      }));
    });
    const listed = listAddons((c) => c.outer === "addon and modded fish.zip");
    await vi.advanceTimersByTimeAsync(120_000);
    expect((await listed).map((it) => it.inner)).toEqual(["banggai"]);
  });
});

describe("node-mirror listing links", () => {
  it("produce items the install validator accepts", async () => {
    // Listing pages may switch to mirror-host hrefs; the producer must
    // not emit a URL the tank's remote install refuses.
    const html = '<a href="//ia801504.us.archive.org/download/' +
      'aquazonewithguppiesandaddons/addon%20and%20modded%20fish.zip/' +
      'banggai.zip">banggai.zip</a>';
    vi.stubGlobal("fetch", async (u: string) =>
      String(u) === PAGE
        ? new Response(html, { status: 200 })
        : new Response(null, { status: 404 }));
    const listed = await listAddons(
      (c) => c.outer === "addon and modded fish.zip");
    expect(listed.map((it) => it.inner)).toEqual(["banggai"]);
    expect(listed.every((it) => isArchiveUrl(it.url))).toBe(true);
  });

  it("drop a plain-http link the installer would refuse", async () => {
    // The parser and the validator must agree on scheme: an http href
    // listed here would always fail with 'invalid add-on item'. Use the
    // gravel collection — the rename path rewrites URLs to https, so it
    // could not show the raw href this test is about.
    const page = "https://archive.org/download/aquazonewithguppiesandaddons/" +
      "gravel.zip/";
    const html = '<a href="http://archive.org/download/' +
      'aquazonewithguppiesandaddons/gravel.zip/brownsand.grv">' +
      'brownsand.grv</a>';
    const fetchMock = vi.fn(async (u: string) =>
      String(u) === page
        ? new Response(html, { status: 200 })
        : new Response(null, { status: 404 }));
    vi.stubGlobal("fetch", fetchMock);
    const listed = await listAddons((c) => c.outer === "gravel.zip");
    // Without this the test passes vacuously if pageUrl ever stops
    // matching the stub: every request 404s and `listed` is empty too.
    expect(fetchMock.mock.calls.flat().map(String)).toContain(page);
    expect(listed).toEqual([]);
  });
});
