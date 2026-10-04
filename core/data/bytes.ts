// Byte helpers. Little-endian readers for the pack, resource-map and
// BMP parsers: a byte past the end reads as 0 where a DataView would
// throw, and u32 is unsigned.
//
// Byte buffers for the browser APIs that insist on a plain ArrayBuffer
// underneath (Blob parts, WebCrypto): since TypeScript 5.7 a bare
// Uint8Array may sit on a SharedArrayBuffer as far as the types know.

/** `u` on a plain ArrayBuffer: the same view when it already is — all
 * bytes read from fetch, files, IndexedDB or a decoder are — and a copy
 * when it sits on a SharedArrayBuffer. */
export function ownBytes(u: Uint8Array): Uint8Array<ArrayBuffer> {
  return u.buffer instanceof ArrayBuffer
    ? u as Uint8Array<ArrayBuffer> : new Uint8Array(u);
}

export function u16(d: Uint8Array, o: number): number {
  return (d[o] ?? 0) | ((d[o + 1] ?? 0) << 8);
}
export function u32(d: Uint8Array, o: number): number {
  return (u16(d, o) | (u16(d, o + 2) << 16)) >>> 0;
}
