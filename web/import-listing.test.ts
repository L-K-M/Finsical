import { afterEach, describe, expect, it, vi } from "vitest";
import { listAddons } from "./import.js";

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
