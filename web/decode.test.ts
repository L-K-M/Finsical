import { describe, expect, it, vi } from "vitest";
import { decodeImage } from "./decode.js";

type FakeImage = { onload: (() => void) | null;
                   onerror: (() => void) | null;
                   decode?: (() => Promise<void>) | undefined };

function fakeImage(decode?: () => Promise<void>): FakeImage {
  return { onload: null, onerror: null, decode };
}

const flush = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("decodeImage", () => {
  it("resolves only after decode() settles, not at onload", async () => {
    let decoded = false;
    const img = fakeImage(() => Promise.resolve().then(() => {
      decoded = true;
    }));
    let resolved = false;
    void decodeImage(img as unknown as HTMLImageElement)
      .then(() => { resolved = true; });
    img.onload!();
    await flush();
    // decode() must have run and resolved first.
    expect(decoded).toBe(true);
    expect(resolved).toBe(true);
  });

  it("still resolves when decode() rejects (bad asset commits)", async () => {
    const img = fakeImage(() => Promise.reject(new Error("corrupt")));
    let resolved = false;
    void decodeImage(img as unknown as HTMLImageElement)
      .then(() => { resolved = true; });
    img.onload!();
    await flush();
    expect(resolved).toBe(true);
  });

  it("still resolves on a load error (broken asset commits)", async () => {
    const img = fakeImage(() => Promise.resolve());
    let resolved = false;
    void decodeImage(img as unknown as HTMLImageElement)
      .then(() => { resolved = true; });
    img.onerror!();
    await flush();
    expect(resolved).toBe(true);
  });

  it("still commits when decode() never settles (custom-scheme images)",
     async () => {
    const img = fakeImage(() => new Promise<void>(() => { })); // hangs
    let resolved = false;
    void decodeImage(img as unknown as HTMLImageElement)
      .then(() => { resolved = true; });
    img.onload!();
    await flush();
    // decode() still pending — nothing may have resolved yet.
    expect(resolved).toBe(false);
    // The forced-draw fallback fires one task after onload.
    await new Promise((r) => setTimeout(r, 0));
    await flush();
    expect(resolved).toBe(true);
  });

  it("settles an already-complete image without waiting on handlers",
     async () => {
    // A cached asset's onload/onerror already fired (or never will):
    // resolution must come from the complete check alone.
    const img = { onload: null, onerror: null, complete: true,
                  naturalWidth: 4, decode: () => Promise.resolve() };
    await expect(decodeImage(img as unknown as HTMLImageElement))
      .resolves.toBeUndefined();
    expect(img.onload).toBeNull();
    expect(img.onerror).toBeNull();
  });

  it("settles a failed cached image (complete, no pixels) at once",
     async () => {
    const img = { onload: null, onerror: null, complete: true,
                  naturalWidth: 0 };
    await expect(decodeImage(img as unknown as HTMLImageElement))
      .resolves.toBeUndefined();
  });

  it("without decode(), forces one by drawing the loaded image", async () => {
    const drawn: unknown[] = [];
    vi.stubGlobal("document", { createElement: () => ({
      getContext: () => ({
        drawImage: (img: unknown, x: number, y: number) =>
          drawn.push([img, x, y]),
      }),
    }) });
    const img = fakeImage(); // no decode — the old-WebKit path
    let resolved = false;
    try {
      void decodeImage(img as unknown as HTMLImageElement)
        .then(() => { resolved = true; });
      img.onload!();
      await flush();
    } finally {
      vi.unstubAllGlobals();
    }
    expect(drawn).toEqual([[img, 0, 0]]);
    expect(resolved).toBe(true);
  });
});
