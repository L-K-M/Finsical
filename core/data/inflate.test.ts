import { describe, expect, it } from "vitest";
import { inflateCap, inflateFflate, inflateNative } from "./inflate.js";
import { ownBytes } from "./bytes.js";

const SRC = new Uint8Array(4096).map((_, i) => i & 0xff);

async function compress(data: Uint8Array,
                        format: "deflate" | "deflate-raw"):
    Promise<Uint8Array> {
  const cs = new CompressionStream(format);
  const stream = new Blob([ownBytes(data)]).stream().pipeThrough(cs);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let len = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    len += value.byteLength;
  }
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}

const IMPLS = [
  ["native", inflateNative],
  ["fflate", inflateFflate],
] as const;

describe.each(IMPLS)("%s inflate", (_name, impl) => {
  it("round-trips zlib-wrapped deflate", async () => {
    const z = await compress(SRC, "deflate");
    expect(await impl(z, "deflate", 1 << 20)).toEqual(SRC);
  });

  it("round-trips raw deflate", async () => {
    const z = await compress(SRC, "deflate-raw");
    expect(await impl(z, "deflate-raw", 1 << 20)).toEqual(SRC);
  });

  it("rejects output past the byte cap", async () => {
    const z = await compress(SRC, "deflate-raw");
    await expect(impl(z, "deflate-raw", 1024)).rejects.toThrow(/exceeded/);
  });

  it("rejects corrupt input", async () => {
    const bad = (await compress(SRC, "deflate")).slice();
    bad[10] = (bad[10] ?? 0) ^ 0xff;
    bad[11] = (bad[11] ?? 0) ^ 0xff;
    await expect(impl(bad, "deflate", 1 << 20)).rejects.toThrow();
  });
});

describe("inflateCap", () => {
  it("inflates on whichever implementation the host offers", async () => {
    const z = await compress(SRC, "deflate-raw");
    expect(await inflateCap(z, "deflate-raw", 1 << 20)).toEqual(SRC);
  });

  it("falls back when DecompressionStream is absent", async () => {
    const real = globalThis.DecompressionStream;
    // Simulate WKWebView before Safari 16.4 (macOS 12).
    delete (globalThis as Record<string, unknown>).DecompressionStream;
    try {
      expect(await inflateCap(await compress(SRC, "deflate-raw"),
                              "deflate-raw", 1 << 20)).toEqual(SRC);
      expect(await inflateCap(await compress(SRC, "deflate"),
                              "deflate", 1 << 20)).toEqual(SRC);
    } finally {
      globalThis.DecompressionStream = real;
    }
  });
});
