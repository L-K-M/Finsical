// The starter aquarium a first launch offers: a few fish, a gravel, a
// plant and a background from the archive.org collections, about 1 MB
// in all, picked by name and resolved against the live listing so an
// item the archive drops is skipped instead of breaking the offer.
import type { Collection, Importable } from "./import.js";

export interface StarterItem { section: string; inner: string }

/** In install order: scenery after the fish, so the fish arrive first
 * and the placeholders can go as early as possible. Sizes are the
 * archive's download sizes. */
export const STARTER_SET: readonly StarterItem[] = [
  { section: "fish", inner: "banggai" },       // 321 KB
  { section: "fish", inner: "clownfish" },     //  94 KB
  { section: "fish", inner: "neon" },          //  85 KB
  { section: "gravel", inner: "brownsand" },   // 126 KB
  { section: "plants", inner: "Amazon_L" },    // 134 KB
  { section: "backgrounds", inner: "Back03" }, // 308 KB
];

/** The collections worth listing for the starter set: its sections'
 * collections that have a listing page. Nested collections ("a.zip/
 * b.zip") are listed by downloading the whole outer zip, megabytes the
 * starter set doesn't need. */
export function starterCollection(c: Collection): boolean {
  return !c.outer.includes("/") &&
    STARTER_SET.some((s) => s.section === c.section);
}

/** STARTER_SET's add-ons as the listing has them, in STARTER_SET order;
 * items missing from the listing are left out. */
export function resolveStarter(listing: readonly Importable[]): Importable[] {
  const out: Importable[] = [];
  for (const s of STARTER_SET) {
    const it = listing.find((l) =>
      l.section === s.section && l.inner === s.inner);
    if (it) out.push(it);
  }
  return out;
}
