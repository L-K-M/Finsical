/**
 * Drag-dropped raw pack containers (.fsh/.grv/.plt/.acc/.azn/.REZ),
 * 256-color BMP backdrops and Mac pictures: PICT files and resource
 * forks that carry pictures. The drop handlers in web/main.ts and
 * web/addons.ts decode each file they were handed here, one at a time;
 * this module owns the "is this file a pack, and what does it contain"
 * half so it stays testable in node.
 */
import { decodeBmp, isBmp } from "../core/data/bmp.js";
import { fshToSheets, isPack, packImages } from "../core/data/fsh.js";
import { hasMacPictures, isPictFile, macPictures }
  from "../core/data/macpics.js";
import { fileSoundRecords } from "../core/data/snd.js";
import { isPict } from "../core/data/pict.js";
import { openFork } from "../core/data/resfork.js";
import { TANK_SIZE } from "../core/tuning.js";
import { isGravelImage } from "./render.js";
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

/** Decode one dropped file, a pack container or a picture (BMP or
 * Mac), from its name and bytes. Null for other files, packs with
 * nothing usable for their section and pictures the tank can't show
 * (see BACKDROP_MIN); a file that throws while decoding is logged and
 * skipped too, so one corrupt file costs only itself. */
export function decodeDroppedPack(name: string, data: Uint8Array):
    DroppedPack | null {
  // The same extension dropSection reads: never across a slash. An
  // AppleDouble companion ("._name") is named for the file it belongs to.
  // A name that is all extension (".pct") keeps it: an add-on needs a
  // name.
  const stem = name.replace(/(^|\/)\._/, "$1").replace(/\.[^./]+$/, "") ||
    name;
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
  if (!isPack(data)) return macPicture(name, stem, data);
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

/** A Mac picture as a dropped add-on: a PICT file, or the pictures in
 * a resource fork. A gravel add-on's fork (it carries Grvl) goes to
 * the gravel and keeps only its strips: its catalog picture is no
 * backdrop. Anything else is yours to show, as a BMP is, at the same
 * minimum size. Null when nothing in it is usable. */
function macPicture(name: string, stem: string, data: Uint8Array):
    DroppedPack | null {
  const pics = macPictures(data);
  if (!pics) return null;
  for (const f of pics.failed)
    console.warn(`drop: ${name}: skipping picture ${f}`);
  const images = new Map([...pics.images].filter(([, img]) => pics.gravel
    ? isGravelImage(img, TANK_SIZE.width)
    : img.w >= BACKDROP_MIN.w && img.h >= BACKDROP_MIN.h)
    .map(([k, img]) => [`${name}#${k}`, img]));
  if (!images.size) return null;
  return { name: stem, section: pics.gravel ? "gravel" : "backgrounds",
           sheets: new Map(), images, care: null };
}

/** Whether a file decodeDroppedPack turned down is a picture the tank
 * can't use, which the drop explains: a BMP, a PICT file (bare or
 * wrapped), or a fork carrying AquaZone's own pictures (BAPC, BADP). A fork's 'PICT'
 * resources alone don't count: most forks have a preview or icons. */
export function isRefusedPicture(data: Uint8Array): boolean {
  if (isBmp(data) || isPictFile(data)) return true;
  const fork = openFork(data);
  return !!fork && (fork.resources("BAPC", 1).length > 0 ||
                    fork.resources("BADP", 1).length > 0);
}

/** A drop on the Import Add-ons window, sorted: the sound records it
 * carries, the pictures that go in as scenery, and how many pictures
 * the tank can't use. Packs stay out: the tank's own drop takes them.
 * A fork can give both a picture and its sounds, as on the tank. */
export function sortClientDrop(files: { name: string; data: Uint8Array }[]):
    { sounds: { name: string; wav: Uint8Array }[];
      pictures: { name: string; data: Uint8Array; pack: DroppedPack }[];
      refused: number } {
  const sounds: { name: string; wav: Uint8Array }[] = [];
  const pictures: { name: string; data: Uint8Array; pack: DroppedPack }[] = [];
  let refused = 0;
  for (const { name, data } of files) {
    if (!isPack(data) && (isBmp(data) || hasMacPictures(data))) {
      const pack = decodeDroppedPack(name, data);
      if (pack) pictures.push({ name, data, pack });
      else if (isRefusedPicture(data)) refused++;
      // A picture file carries no sounds, whatever its name; a fork can.
      if (isBmp(data) || isPict(data)) continue;
    }
    try { sounds.push(...fileSoundRecords(name, data)); }
    catch (e) { console.warn("drop: no sounds in", name, e); }
  }
  // A name is one stored file, so the last picture under a name
  // replaces the others, as on the tank.
  const byName = new Map(pictures.map((p) => [p.name, p]));
  return { sounds, pictures: [...byName.values()], refused };
}
