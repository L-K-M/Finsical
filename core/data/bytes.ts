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
