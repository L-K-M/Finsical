/**
 * Byte-capped inflate shared by the ZIP reader and the azpack PNG
 * decoder. Prefers the native DecompressionStream; falls back to
 * fflate's streaming inflate where the API doesn't exist — WKWebView
 * before Safari 16.4, which is macOS 12, the app's stated floor.
 *
 * Both paths stream under the same `maxBytes` cap so a corrupted or
 * hostile archive can't expand without bound: the fallback throws
 * inside fflate's ondata, which propagates out of push() and stops
 * decoding.
 */
import { Inflate, Unzlib } from "fflate";
import { ownBytes } from "./bytes.js";

export type InflateFormat = "deflate" | "deflate-raw";
/** The cap tripped — callers distinguish it from corrupt data without
 * matching message text. */
export class InflateTooLargeError extends Error {}

/** Concatenated inflate result; throws when the stream is corrupt or
 * output would exceed `maxBytes`. The availability check runs per call,
 * not at module load, so tests can stub DecompressionStream. */
export async function inflateCap(data: Uint8Array, format: InflateFormat,
                                 maxBytes: number): Promise<Uint8Array> {
  if (typeof DecompressionStream !== "function")
    return inflateFflate(data, format, maxBytes);
  // The constructor exists but the format may not: "deflate-raw" only
  // landed in Chrome 103 / Safari 16.4. Probe once per call — a
  // TypeError falls through to fflate, which always supports both.
  try { new DecompressionStream(format); }
  catch { return inflateFflate(data, format, maxBytes); }
  return inflateNative(data, format, maxBytes);
}

/** Native streaming path — one reader loop, byte-counted. Exported so
 * tests can pin both implementations regardless of the host. */
export async function inflateNative(data: Uint8Array,
                                    format: InflateFormat,
                                    maxBytes: number): Promise<Uint8Array> {
  const ds = new DecompressionStream(format);
  const stream = new Blob([ownBytes(data)]).stream().pipeThrough(ds);
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        // A cancel rejection (already-errored stream) must not mask
        // the cap error.
        await reader.cancel().catch(() => {});
        throw new InflateTooLargeError(`inflate exceeded ${maxBytes} bytes`);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}

/** fflate path for hosts without DecompressionStream. Throwing inside
 * ondata aborts the synchronous push, so the cap still holds. */
export async function inflateFflate(data: Uint8Array,
                                    format: InflateFormat,
                                    maxBytes: number): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let total = 0;
  const ondata = (chunk: Uint8Array): void => {
    total += chunk.byteLength;
    if (total > maxBytes)
      throw new InflateTooLargeError(`inflate exceeded ${maxBytes} bytes`);
    chunks.push(chunk);
  };
  // push() throws on corrupt input and propagates ondata's cap throw;
  // both surface here as a rejected promise like the native path.
  // Feed bounded slices: even if fflate buffers a full push's expansion
  // before flushing ondata, 4 KiB in caps the transient at ~4 MiB
  // (deflate's maximum expansion ratio is 1032:1).
  const inf = format === "deflate" ? new Unzlib(ondata) : new Inflate(ondata);
  const STEP = 1 << 12;
  for (let i = 0; ; i += STEP) {
    const end = Math.min(i + STEP, data.length);
    inf.push(data.subarray(i, end), end === data.length);
    if (end === data.length) break;
  }
  const out = new Uint8Array(total);
  let o = 0;
  for (const c of chunks) { out.set(c, o); o += c.byteLength; }
  return out;
}
