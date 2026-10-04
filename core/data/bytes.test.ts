import { describe, expect, it } from "vitest";
import { ownBytes, u16, u32 } from "./bytes.js";

describe("ownBytes", () => {
  it("passes a plain view through without copying", () => {
    const buf = new ArrayBuffer(8);
    const u = new Uint8Array(buf, 2, 4);
    expect(ownBytes(u)).toBe(u);
  });

  it("copies bytes that sit on a SharedArrayBuffer", () => {
    const u = new Uint8Array(new SharedArrayBuffer(4));
    u.set([1, 2, 3, 4]);
    const own = ownBytes(u);
    expect(own).not.toBe(u);
    expect(own.buffer).toBeInstanceOf(ArrayBuffer);
    expect([...own]).toEqual([1, 2, 3, 4]);
  });
});

describe("u16/u32", () => {
  // The pack, resource-map and BMP parsers read untrusted bytes through
  // these: a read past the end must give 0, not throw.
  it("reads little-endian, a missing byte as 0", () => {
    expect(u16(Uint8Array.of(0x34, 0x12), 0)).toBe(0x1234);
    expect(u16(Uint8Array.of(0x34), 0)).toBe(0x34);
    expect(u32(new Uint8Array(2), 1)).toBe(0);
  });

  it("reads u32 unsigned", () => {
    expect(u32(Uint8Array.of(0, 0, 0, 0x80), 0)).toBe(0x80000000);
  });
});
