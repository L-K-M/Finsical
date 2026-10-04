/**
 * The pictures in a classic Mac file: a data-fork PICT (a backdrop as
 * Photoshop saved it, 512-byte header and all, bare or wrapped in
 * MacBinary, BinHex or AppleSingle), or the picture resources of a
 * resource fork in any wrapping resfork.ts peels.
 *
 * AquaZone files its pictures under its own resource types. A gravel
 * add-on (Finder type AqGr) carries, all as id 4020, the strip the
 * tank draws (BAPC), the picture the item catalog shows (BADP) and the
 * floor's geometry (Grvl): the Windows .grv packs carry the same
 * three, which is how their roles were confirmed. 'PICT' is the Mac's
 * own picture resource.
 */
import type { IndexedImage } from "./azpack.js";
import { decodePict, isPict } from "./pict.js";
import { dataFork, openFork } from "./resfork.js";
import type { Fork } from "./resfork.js";

export interface MacPictures {
  /** The fork is a gravel add-on's: it carries a Grvl record. */
  gravel: boolean;
  /** Decoded pictures by "TYPE id", or "PICT" for a data-fork file. */
  images: Map<string, IndexedImage>;
  /** Pictures that didn't decode, each as "TYPE id: why". */
  failed: string[];
}

/** In-tank art first, so it leads the images' order. */
const PICTURE_TYPES = ["BAPC", "BADP", "PICT"] as const;

/** Most pictures decoded from one file. AquaZone's add-ons hold one
 * or two; an application's fork holds hundreds of interface PICTs,
 * which would decode to hundreds of megabytes. */
const MAX_FILE_PICTURES = 16;

const message = (e: unknown): string =>
  e instanceof Error ? e.message : String(e);

function forkPictures(fork: Fork): { type: string; id: number;
                                      data: Uint8Array }[] {
  return PICTURE_TYPES.flatMap((type) =>
    fork.resources(type, MAX_FILE_PICTURES)
      .map((r) => ({ type, id: r.id, data: r.data })))
    .slice(0, MAX_FILE_PICTURES);
}

/** The pictures in `d`, or null when it has none: neither a picture
 * resource in a fork nor a PICT file. Never throws; a picture that
 * won't decode is listed in `failed`. */
export function macPictures(d: Uint8Array): MacPictures | null {
  const fork = openFork(d);
  const res = fork ? forkPictures(fork) : [];
  if (res.length) {
    const out: MacPictures = { gravel: fork!.resources("Grvl", 1).length > 0,
                               images: new Map(), failed: [] };
    for (const { type, id, data } of res) {
      try { out.images.set(`${type} ${id}`, decodePict(data)); }
      catch (e) { out.failed.push(`${type} ${id}: ${message(e)}`); }
    }
    return out;
  }
  const file = pictFile(d);
  if (!file) return null;
  try {
    return { gravel: false, images: new Map([["PICT", decodePict(file)]]),
             failed: [] };
  } catch (e) {
    return { gravel: false, images: new Map(),
             failed: [`PICT: ${message(e)}`] };
  }
}

/** A PICT file `d` is, or carries in its data fork, or null. */
function pictFile(d: Uint8Array): Uint8Array | null {
  if (isPict(d)) return d;
  const data = dataFork(d);
  return data && isPict(data) ? data : null;
}

/** Whether `d` is a PICT file, bare or wrapped in MacBinary, BinHex or
 * AppleSingle: a cheap sniff, not a promise that it decodes. */
export const isPictFile = (d: Uint8Array): boolean => pictFile(d) !== null;

/** Whether `d` carries pictures macPictures would try, without
 * decoding any of them: a test for sorting dropped files. It still
 * peels the file's wrapping (a BinHex file decodes in full), which
 * macPictures then does again. */
export function hasMacPictures(d: Uint8Array): boolean {
  const fork = openFork(d);
  return (fork !== null && forkPictures(fork).length > 0) ||
    pictFile(d) !== null;
}
