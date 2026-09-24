import { describe, expect, it } from "vitest";
import { ownBytes } from "./bytes.js";

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
