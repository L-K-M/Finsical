/**
 * Drag-dropped raw pack containers (.fsh/.grv/.plt/.acc/.azn/.REZ) and
 * 256-color BMP backdrops. The drop handler in web/main.ts decodes
 * each pack file and picture it was handed here, one at a time; this
 * module owns the "is this file a pack, and what does it contain" half
 * so it stays testable in node.
 */
import { decodeBmp, isBmp } from "../core/data/bmp.js";
import { fshToSheets, isPack, packImages } from "../core/data/fsh.js";
import { packSpeciesCare } from "../core/data/species.js";
import type { SpeciesCare } from "../core/data/species.js";
import type { IndexedImage, SpriteSheet } from "../core/data/azpack.js";
import type { PackSection } from "./import.js";

export interface DroppedPack {
  /** Display/species name — the file name minus its extension. */
  name: string;
  /** Tank section the file imports as (see dropSection). */
  section: PackSection;
  /** Sprite sheets that spawn a fish: fish packs and the base-library
   * .REZ only. Scenery packs' sprite streams stay out of the fish pool,
   * matching handleSheets' fish-only registration. */
  sheets: Map<string, SpriteSheet>;
  /** The species' care needs, when the pack spawns a fish. */
  care: SpeciesCare | null;
  /** Scenery art. Empty for fish packs: their catalog portraits must
   * not take the tank's backdrop. */
  images: Map<string, IndexedImage>;
}

/** The smallest picture the tank shows as its backdrop: half the
 * 320 x 200 tank each way, the floor pickBackdrop in web/main.ts sets.
 * A dropped picture below it would be kept but never shown. */
export const BACKDROP_MIN = { w: 160, h: 100 } as const;

/** The section a dropped pack imports as, by extension: the same
 * dispatch a remote install gets from its collection's section. */
export function dropSection(name: string): PackSection {
  const ext = (/\.([^./]+)$/.exec(name)?.[1] ?? "").toLowerCase();
  return ext === "grv" ? "gravel"
    : ext === "plt" ? "plants"
    : ext === "acc" ? "accessories"
    : ext === "azn" || ext === "rez" ? "tanks"
    : ext === "bmp" ? "backgrounds"
    : "fish"; // .fsh and unknown extensions
}

/** Decode one dropped file, a pack container or a BMP picture, from
 * its name and bytes. Null for other files, packs with nothing usable
 * for their section and pictures the tank can't show (see
 * BACKDROP_MIN); a file that throws while decoding is logged and
 * skipped too, so one corrupt file costs only itself. */
export function decodeDroppedPack(name: string, data: Uint8Array):
    DroppedPack | null {
  // The same extension dropSection reads: never across a slash.
  const stem = name.replace(/\.[^./]+$/, "");
  // A picture is known by its content, not its name: classic Mac
  // files often carry no extension. AquaZone took 256-color BMPs
  // only, as decodeBmp does.
  if (isBmp(data)) {
    // decodeBmp allocates from the header's dimensions: a throw there
    // costs this picture, as a throwing pack does below.
    try {
      const img = decodeBmp(data);
      if (img && img.w >= BACKDROP_MIN.w && img.h >= BACKDROP_MIN.h)
        return { name: stem, section: "backgrounds", sheets: new Map(),
                 images: new Map([[name, img]]), care: null };
    } catch (e) {
      console.warn(`drop: skipping undecodable picture ${name}:`, e);
    }
    return null;
  }
  if (!isPack(data)) return null;
  try {
    const section = dropSection(name);
    // .REZ is the base library: fish sheets and scenery in one file.
    const spawns = section === "fish" || /\.rez$/i.test(name);
    const sheets = spawns ? fshToSheets(data)
                          : new Map<string, SpriteSheet>();
    const images = section === "fish"
      ? new Map<string, IndexedImage>() : packImages(data);
    if (!sheets.size && !images.size) return null;
    return { name: stem, section, sheets, images,
             care: sheets.size ? packSpeciesCare(data) : null };
  } catch (e) {
    console.warn(`drop: skipping undecodable pack ${name}:`, e);
    return null;
  }
}
