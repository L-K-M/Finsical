/**
 * Pure rules for binding fish to the sprite sheets of their add-on, kept
 * out of the tank page so vitest can pin them.
 *
 * One archive.org fish add-on can hold several sheet-bearing packs
 * (angels.zip carries angel.fsh and blackangel.fsh; goldfish addon has
 * five). Each pack is a "part", keyed by its entry name in the add-on.
 */

/** A part's display name: its entry's file name without the folder or
 * extension ("angels/blackangel.fsh" -> "blackangel"). */
export function entryStem(entry: string): string {
  const base = entry.split("/").pop() ?? entry;
  return base.replace(/\.[^.]+$/, "") || base;
}

/** What a fish from one part of an add-on is called: an add-on with a
 * single sheet pack keeps its listing name; each part of a multi-pack
 * add-on goes by its own pack, so two angels read "angel" and
 * "blackangel" rather than "angels" twice. */
export function partName(inner: string, entry: string, parts: number): string {
  return parts > 1 ? entryStem(entry) : inner;
}

/**
 * Which part each fish saved before parts were recorded swims as.
 * Those saves rebound every fish of an add-on to its last part on
 * relaunch. An install spawned one fish per part, in the add-on's entry
 * order and with ascending ids, so fish sorted by id take the parts in
 * that order, cycling round for Add Again copies. Returns id -> part;
 * empty when the add-on has no parts loaded.
 */
export function migrateParts(ids: readonly number[],
                             parts: readonly string[]): Map<number, string> {
  const out = new Map<number, string>();
  if (!parts.length) return out;
  [...ids].sort((a, b) => a - b)
    .forEach((id, i) => out.set(id, parts[i % parts.length]!));
  return out;
}
