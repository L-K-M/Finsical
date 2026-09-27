import { describe, expect, it, vi } from "vitest";

// A dropped file's only copy lives in IndexedDB; a map stands in.
const stored = vi.hoisted(() => new Map<string, Uint8Array>());
vi.mock("./store.js", async (orig) => ({
  ...await orig<typeof import("./store.js")>(),
  packGet: async (url: string) => stored.get(url) ?? null,
}));
const { importAddon } = await import("./import.js");

/** A w x h BMP, every pixel palette index 1. Only 8 bits per pixel
 * decode; any other `bpp` makes a picture Finsical can't use. */
function bmp(w: number, h: number, bpp = 8): Uint8Array {
  const pxOff = 14 + 40 + 256 * 4;
  const stride = ((w * 8 + 31) >> 5) * 4;
  const out = new Uint8Array(pxOff + stride * h).fill(1, pxOff);
  const v = new DataView(out.buffer);
  out[0] = 0x42; out[1] = 0x4d; // "BM"
  v.setUint32(2, out.length, true);
  v.setUint32(10, pxOff, true);
  v.setUint32(14, 40, true); // BITMAPINFOHEADER
  v.setInt32(18, w, true);
  v.setInt32(22, h, true);
  v.setUint16(26, 1, true); // planes
  v.setUint16(28, bpp, true);
  return out;
}

describe("a dropped picture at launch", () => {
  it("restores as one backdrop image", async () => {
    stored.set("local:MyBackdrop.bmp", bmp(640, 480));
    const rs = await importAddon("local:MyBackdrop.bmp");
    expect(rs).toHaveLength(1);
    // Local packs name their one entry by the url, as a stored pack does.
    expect(rs[0]!.entry).toBe("local:MyBackdrop.bmp");
    expect(rs[0]!.sheets.size + rs[0]!.sounds.length).toBe(0);
    expect([...rs[0]!.images.values()].map((i) => [i.w, i.h]))
      .toEqual([[640, 480]]);
  });

  it("fails when the stored picture can't be decoded", async () => {
    stored.set("local:Photo.bmp", bmp(640, 480, 24));
    await expect(importAddon("local:Photo.bmp"))
      .rejects.toThrow("local:Photo.bmp: stored picture is not a " +
                       "256-color BMP");
  });
});
