/**
 * Pure rules for naming and binding the fish of an add-on, kept out of
 * the tank page so vitest can pin them.
 *
 * One archive.org fish add-on can hold several sheet-bearing packs
 * (angels.zip carries angel.fsh and blackangel.fsh; the goldfish add-on
 * has five). Each pack is an entry, keyed by its name in the add-on.
 */

/** An entry's display name: its file name without the folder or
 * extension ("angels/blackangel.fsh" -> "blackangel"). */
export function entryStem(entry: string): string {
  const base = entry.split("/").pop() ?? entry;
  return base.replace(/\.[^.]+$/, "") || base;
}

/** What a fish from one entry of an add-on is called: an add-on with a
 * single sheet pack keeps its listing name; each entry of a multi-pack
 * add-on goes by its own pack, so two angels read "angel" and
 * "blackangel" rather than "angels" twice. */
export function partName(inner: string, entry: string,
                         parts: number): string {
  return parts > 1 ? entryStem(entry) : inner;
}
