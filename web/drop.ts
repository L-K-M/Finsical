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
  /** Tank section the file imports as (see dropSection). */
  section: string;
  /** Sprite sheets that spawn a fish: fish packs and the base-library
   * .REZ only. Scenery packs' sprite streams stay out of the fish pool,
   * matching handleSheets' fish-only registration. */
  sheets: Map<string, SpriteSheet>;
  /** Scenery art. Empty for fish packs: their catalog portraits must
   * not take the tank's backdrop. */
  images: Map<string, IndexedImage>;
}

/** The section a dropped pack imports as, by extension: the same
 * dispatch a remote install gets from its collection's section. */
export function dropSection(name: string): string {
  const ext = (/\.([^./]+)$/.exec(name)?.[1] ?? "").toLowerCase();
  return ext === "grv" ? "gravel"
    : ext === "plt" ? "plants"
    : ext === "acc" ? "accessories"
    : ext === "azn" || ext === "rez" ? "tanks"
    : "fish"; // .fsh and unknown extensions
}

/** Decode every pack container among the entries (name → bytes), in
 * drop order. Non-pack files and packs with nothing usable for their
 * section are skipped; a pack that throws while decoding is skipped
 * too — one corrupt file must not cost the rest of the drop. */
export function decodeDroppedPacks(
  entries: readonly (readonly [string, Uint8Array])[],
): DroppedPack[] {
  const out: DroppedPack[] = [];
  for (const [name, data] of entries) {
    if (!isPack(data)) continue;
    try {
      const section = dropSection(name);
      // .REZ is the base library: fish sheets and scenery in one file.
      const spawns = section === "fish" || /\.rez$/i.test(name);
      const sheets = spawns ? fshToSheets(data)
                            : new Map<string, SpriteSheet>();
      const images = section === "fish"
        ? new Map<string, IndexedImage>() : packImages(data);
      if (!sheets.size && !images.size) continue;
      out.push({ name: name.replace(/\.[^.]*$/, ""), section, sheets,
                 images });
    } catch (e) {
      console.warn(`drop: skipping undecodable pack ${name}:`, e);
    }
  }
  return out;
}
