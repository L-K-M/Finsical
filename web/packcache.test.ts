import { afterAll, describe, expect, it, vi } from "vitest";
import { fetchAddon } from "./import.js";

// An ID3-tagged blob decodes to a sound PackResult through the loose
// file branch of fetchInnerBlobs — enough for importAddon to resolve.
const MP3 = new Uint8Array([0x49, 0x44, 0x33, 4, 5]);
vi.stubGlobal("fetch", async () => ({
  ok: true,
  arrayBuffer: async () =>
    MP3.buffer.slice(MP3.byteOffset, MP3.byteOffset + MP3.byteLength),
}));
afterAll(() => vi.unstubAllGlobals());

const url = (i: number) => `http://t/f${i}.mp3`;

describe("fetchAddon cache", () => {
  // A cache hit returns the stored promise itself, so identity tells
  // memoized from re-imported even when zipCache re-serves the bytes.
  it("memoizes per URL and evicts least-recently-used past 16", async () => {
    const p = new Map<number, ReturnType<typeof fetchAddon>>();
    for (let i = 0; i < 16; i++) p.set(i, fetchAddon(url(i)));
    await Promise.all(p.values());

    expect(fetchAddon(url(0))).toBe(p.get(0));   // memoized
    fetchAddon(url(0));                          // refresh: f1 now eldest
    p.set(16, fetchAddon(url(16)));              // 17th → evicts f1
    await p.get(16);

    expect(fetchAddon(url(1))).not.toBe(p.get(1)); // evicted → re-import
    expect(fetchAddon(url(0))).toBe(p.get(0));     // refresh saved it
    expect(fetchAddon(url(16))).toBe(p.get(16));   // newest still cached
  });

  it("drains a burst's overshoot once the imports settle", async () => {
    // 20 concurrent imports all ride pending — nothing evicts until
    // they settle. Later misses must then drain the excess, not
    // ratchet the cache to the burst size forever.
    const burst = new Map<number, ReturnType<typeof fetchAddon>>();
    for (let i = 0; i < 20; i++) burst.set(i, fetchAddon(url(100 + i)));
    await Promise.all(burst.values());
    await fetchAddon(url(200));
    await fetchAddon(url(201));
    // Two inserts past 20 settled entries evict back to the cap:
    // the six eldest burst entries are gone, the seventh survives.
    // Probe the survivor first — a miss re-imports, which itself
    // evicts the eldest settled entry.
    expect(fetchAddon(url(106))).toBe(burst.get(6));
    expect(fetchAddon(url(105))).not.toBe(burst.get(5));
    expect(fetchAddon(url(100))).not.toBe(burst.get(0));
  });
});
