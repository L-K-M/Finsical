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

/** Why a tank holding `have` fish refuses an install adding `adding`
 * more under a cap of `cap`, or null when they all fit. A multi-pack
 * add-on adds a fish per pack, so it goes in whole or not at all:
 * adding some and reporting success would hide the rest. */
export function capRefusal(have: number, adding: number,
                           cap: number): string | null {
  const room = cap - have;
  if (adding <= 0 || adding <= room) return null;
  if (room <= 0)
    return `The tank is full: ${cap} fish is plenty. ` +
           "Release one from Tank Overview first.";
  return `This add-on brings ${adding} fish, and the tank has room for ` +
         `${room} more. Release some from Tank Overview first.`;
}
