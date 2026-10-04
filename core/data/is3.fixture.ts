/** Shared test builders for InstallShield 3 cabinets (see is3.ts): an
 * implode encoder and the archive layout, so the reader's tests need
 * no real cabinets. tools/tests/fixtures.py has the Python twins. */

const LIT_LENGTHS =
  "bcccccccc87cc7ccccccccccccdccccc4a8caca87789767876777787788cb79b" +
  "c676657886b967667b66679899b8b9c8c566656665b756556a55558788abbccc" +
  "ddddddddddddddddddddddddddddddddddddddddddddddddcccccccccccccccc" +
  "ccccccccccccccccccccccccccccccccdcdddcdddcddddcdddcccddddddddddd";
const LEN_LENGTHS = "2333444555566677";
const DIST_LENGTHS =
  "2445555666666666666666777777777777777777777777778888888888888888";
const LEN_BASE = [3, 2, 4, 5, 6, 7, 8, 9, 10, 12, 16, 24, 40, 72, 136, 264];
const LEN_EXTRA = [0, 0, 0, 0, 0, 0, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8];

/** Canonical codes for packed code lengths, as [code, length] by
 * symbol: shorter first, by symbol within a length. */
function codes(packed: string): [number, number][] {
  const lengths = [...packed].map((c) => parseInt(c, 16));
  const out: [number, number][] = [];
  let code = 0;
  for (let length = 1; length <= Math.max(...lengths); length++) {
    lengths.forEach((n, sym) => {
      if (n === length) out[sym] = [code++, length];
    });
    code <<= 1;
  }
  return out;
}

/** A PKWARE DCL Implode stream of `data`: the longest match of 2 to 518
 * bytes in the last `window` bytes, else a literal (Huffman coded when
 * `coded`). Codes go out inverted, most significant bit first;
 * everything is packed from each byte's low bit up. */
export function implode(data: Uint8Array, coded = false, low = 6,
                        window = 64): Uint8Array {
  const lit = codes(LIT_LENGTHS), lens = codes(LEN_LENGTHS);
  const dists = codes(DIST_LENGTHS);
  const out = [coded ? 1 : 0, low];
  let acc = 0, n = 0;
  const put = (v: number, k: number): void => {
    for (let i = 0; i < k; i++) {
      acc |= (v >> i & 1) << n++;
      if (n === 8) { out.push(acc); acc = 0; n = 0; }
    }
  };
  const code = ([value, k]: [number, number]): void => {
    for (let i = 0; i < k; i++) put((value >> (k - 1 - i) & 1) ^ 1, 1);
  };
  const length = (m: number): void => {
    let sym = 15;
    while (LEN_BASE[sym]! > m || m - LEN_BASE[sym]! >= 1 << LEN_EXTRA[sym]!)
      sym--;
    code(lens[sym]!);
    put(m - LEN_BASE[sym]!, LEN_EXTRA[sym]!);
  };
  for (let i = 0; i < data.length;) {
    let best = 0, at = 0;
    for (let j = Math.max(0, i - window); j < i; j++) {
      let k = 0;
      while (i + k < data.length && k < 518 && data[j + k] === data[i + k]) k++;
      if (k > best) { best = k; at = j; }
    }
    const dist = i - at, extra = best === 2 ? 2 : low;
    if (best >= 2 && (dist - 1) >> extra < 64) {
      put(1, 1);
      length(best);
      code(dists[(dist - 1) >> extra]!);
      put((dist - 1) & (1 << extra) - 1, extra);
      i += best;
    } else {
      put(0, 1);
      if (coded) code(lit[data[i]!]!);
      else put(data[i]!, 8);
      i++;
    }
  }
  put(1, 1);
  length(519); // the end code
  if (n) out.push(acc);
  return Uint8Array.from(out);
}

/** One file of a cabinet: its directory's index, name and data, and
 * whether it goes in stored rather than imploded. */
export type Is3File = [number, string, Uint8Array, boolean];

/** An InstallShield 3 archive (data.z) of `files`, in the layout
 * is3.ts reads. Names are ASCII here. */
export function buildIs3(files: Is3File[], dirs = ["Items"]): Uint8Array {
  const bytes: number[] = new Array<number>(255).fill(0);
  const le16 = (v: number) => [v & 255, v >> 8 & 255];
  const le32 = (v: number) => [...le16(v & 0xffff), ...le16(v >>> 16)];
  const ascii = (s: string) => [...s].map((c) => c.charCodeAt(0));
  const placed = files.map(([di, name, data, stored]) => {
    const packed = stored ? data : implode(data);
    const offset = bytes.length;
    for (const b of packed) bytes.push(b);
    return { di, name, size: data.length, packed: packed.length, offset,
             stored };
  });
  const dirpos = bytes.length;
  for (const [i, d] of dirs.entries())
    bytes.push(...le16(files.filter((f) => f[0] === i).length),
               ...le16(6 + d.length), ...le16(d.length), ...ascii(d));
  const filepos = bytes.length;
  for (const f of placed)
    bytes.push(0, ...le16(f.di), ...le32(f.size), ...le32(f.packed),
               ...le32(f.offset), ...le32(0), ...le32(0x80),
               ...le16(43 + f.name.length), f.stored ? 0x10 : 0, 0, 0, 0,
               f.name.length, ...ascii(f.name), ...new Array<number>(13).fill(0));
  const head = [0x13, 0x5d, 0x65, 0x8c, ...le32(0x0002013a), 0, 0, 0, 0,
                ...le16(files.length), 0, 0, 0, 0, ...le32(bytes.length),
                ...le32(files.reduce((s, f) => s + f[2].length, 0))];
  head.forEach((b, i) => { bytes[i] = b; });
  le32(dirpos).forEach((b, i) => { bytes[41 + i] = b; });
  [...le16(dirs.length), ...le32(filepos)]
    .forEach((b, i) => { bytes[49 + i] = b; });
  return Uint8Array.from(bytes);
}
