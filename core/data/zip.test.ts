import { describe, expect, it } from "vitest";
import { zipEntries, zipRead } from "./zip.js";

const enc = new TextEncoder();

/** Build a minimal single-entry zip. method 0 = stored, 8 = deflate-raw. */
function buildZip(name: string, payload: Uint8Array,
                  method = 0, data?: Uint8Array): Uint8Array {
  const body = data ?? payload;
  const n = enc.encode(name);
  const lh = new Uint8Array(30 + n.length + body.length);
  const lv = new DataView(lh.buffer);
  lv.setUint32(0, 0x04034b50, true);
  lv.setUint16(4, 20, true);              // version needed
  lv.setUint16(8, method, true);
  lv.setUint32(18, body.length, true);    // csize
  lv.setUint32(22, payload.length, true); // usize
  lv.setUint16(26, n.length, true);
  lh.set(n, 30);
  lh.set(body, 30 + n.length);
  const cd = new Uint8Array(46 + n.length);
  const cv = new DataView(cd.buffer);
  cv.setUint32(0, 0x02014b50, true);
  cv.setUint16(4, 20, true);
  cv.setUint16(10, method, true);
  cv.setUint32(20, body.length, true);
  cv.setUint32(24, payload.length, true);
  cv.setUint16(28, n.length, true);
  cv.setUint32(42, 0, true);              // local header offset
  cd.set(n, 46);
  const eocd = new Uint8Array(22);
  const ev = new DataView(eocd.buffer);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(8, 1, true);               // entries on this disk
  ev.setUint16(10, 1, true);              // total entries
  ev.setUint32(12, cd.length, true);
  ev.setUint32(16, lh.length, true);      // cd offset
  const out = new Uint8Array(lh.length + cd.length + eocd.length);
  out.set(lh, 0); out.set(cd, lh.length); out.set(eocd, lh.length + cd.length);
  return out;
}

async function deflate(payload: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream("deflate-raw");
  const stream = new Blob([payload]).stream().pipeThrough(cs);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

describe("zipEntries", () => {
  it("lists a stored entry", () => {
    const z = buildZip("clownfish.fsh", enc.encode("fishy"));
    const es = zipEntries(z);
    expect(es).toHaveLength(1);
    expect(es[0]!.name).toBe("clownfish.fsh");
    expect(es[0]!.method).toBe(0);
    expect(es[0]!.usize).toBe(5);
  });

  it("rejects non-zip data", () => {
    expect(() => zipEntries(enc.encode("not a zip"))).toThrow(/EOCD|central/);
  });
});

describe("zipRead", () => {
  it("extracts a stored entry", async () => {
    const payload = enc.encode("hello gravel");
    const z = buildZip("x.grv", payload);
    const out = await zipRead(z, zipEntries(z)[0]!);
    expect(out).toEqual(payload);
  });

  it("extracts a deflated entry", async () => {
    const payload = new Uint8Array(5000).map((_, i) => (i * 7) & 0xff);
    const z = buildZip("big.fsh", payload, 8, await deflate(payload));
    const out = await zipRead(z, zipEntries(z)[0]!);
    expect(out).toEqual(payload);
  });

  it("rejects a truncated entry", async () => {
    const z = buildZip("x.fsh", enc.encode("abcdef"));
    const es = zipEntries(z);
    es[0]!.csize = 100;
    await expect(zipRead(z, es[0]!)).rejects.toThrow(/truncated/);
  });

  it("rejects unsupported methods", async () => {
    const z = buildZip("x.fsh", enc.encode("abc"), 99);
    await expect(zipRead(z, zipEntries(z)[0]!)).rejects.toThrow(/method/);
  });

  it("rejects a central directory entry that overruns the EOCD", () => {
    const z = buildZip("x.fsh", enc.encode("abc"));
    const bad = z.slice();
    const cdOff = 30 + 5 + 3; // end of local header (30 + name + body)
    new DataView(bad.buffer).setUint16(cdOff + 28, 0xffff, true);
    expect(() => zipEntries(bad)).toThrow(/truncated/);
  });

  it("rejects encrypted entries", () => {
    const z = buildZip("x.fsh", enc.encode("abc"));
    const bad = z.slice();
    const cdOff = 30 + 5 + 3;
    new DataView(bad.buffer).setUint16(cdOff + 8, 1, true);
    expect(() => zipEntries(bad)).toThrow(/encrypted/);
  });

  it("rejects entries whose declared size exceeds the cap", async () => {
    const payload = enc.encode("abc");
    const z = buildZip("x.fsh", payload, 8, await deflate(payload));
    const es = zipEntries(z);
    es[0]!.usize = 10;
    await expect(zipRead(z, es[0]!, 4)).rejects.toThrow(/too large/);
  });

  it("caps inflate expansion even when usize lies", async () => {
    const payload = enc.encode("a".repeat(64));
    const z = buildZip("x.fsh", payload, 8, await deflate(payload));
    const es = zipEntries(z);
    es[0]!.usize = 3; // declaration lies; real inflate exceeds the cap
    await expect(zipRead(z, es[0]!, 4)).rejects.toThrow(/exceeded/);
  });
});
