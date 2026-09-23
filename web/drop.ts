/**
 * Drag-dropped raw pack containers (.fsh/.grv/.plt/.acc/.azn/.REZ).
 * The drop handler in web/main.ts decodes every pack file it was
 * handed here; this module owns the "which of these files are packs,
 * and what do they contain" half so it stays testable in node.
 */
import { fshToSheets, isPack, packImages } from "../core/data/fsh.js";
import type { IndexedImage, SpriteSheet } from "../core/data/azpack.js";

export interface DroppedPack {
  /** Display/species name — the file name minus its extension. */
  name: string;
  sheets: Map<string, SpriteSheet>;
  images: Map<string, IndexedImage>;
}

/** Decode every pack container among the entries (name → bytes), in
 * drop order. Non-pack files and pack containers without a decodable
 * sprite chunk are skipped. */
export function decodeDroppedPacks(
  entries: readonly [string, Uint8Array][],
): DroppedPack[] {
  const out: DroppedPack[] = [];
  for (const [name, data] of entries) {
    if (!isPack(data)) continue;
    const sheets = fshToSheets(data);
    if (!sheets.size) continue;
    out.push({
      name: name.replace(/\.[^.]*$/, ""),
      sheets,
      images: packImages(data),
    });
  }
  return out;
}
