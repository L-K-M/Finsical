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

/** sheetByEntry's key: an add-on URL and one of its entries. URLs can
 * hold '#' (zip fragments) but never a newline. */
export const entryKey = (url: string, entry: string): string =>
  `${url}\n${entry}`;

/** The entry of add-on `url` whose sheet sits in slot `idx`, from an
 * entry-key -> slot map: how a fish bound to a slot learns its entry. */
export function entryOfSlot(byEntry: ReadonlyMap<string, number>,
                            url: string, idx: number): string | undefined {
  const prefix = entryKey(url, "");
  for (const [k, v] of byEntry)
    if (v === idx && k.startsWith(prefix)) return k.slice(prefix.length);
  return undefined;
}

interface LegacyFish { id: number; pack?: string; entry?: string }

/**
 * Entries for fish saved before entries were recorded (v0.3.0 saves).
 * Binding them by their add-on's pack-level slot alone lands every fish
 * of a multi-pack add-on on its last entry, and backfilling that entry
 * makes the collapse permanent. v0.3.0 spawned one fish per entry, in
 * entry order with ascending ids, so fish sorted by id take the entries
 * in that order, cycling round for Add Again copies. Only add-ons with
 * two or more registered entries are touched: with one, the slot
 * already names the right entry. Returns fish id -> entry.
 */
export function legacyEntries(fish: readonly LegacyFish[],
                              byEntry: ReadonlyMap<string, number>):
    Map<number, string> {
  const byUrl = new Map<string, number[]>();
  for (const f of fish)
    if (f.pack !== undefined && f.entry === undefined)
      byUrl.set(f.pack, [...byUrl.get(f.pack) ?? [], f.id]);
  const out = new Map<number, string>();
  for (const [url, ids] of byUrl) {
    const prefix = entryKey(url, "");
    // Map order is registration order: the add-on's entry order.
    const entries = [...byEntry.keys()]
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length));
    if (entries.length < 2) continue;
    [...ids].sort((a, b) => a - b)
      .forEach((id, i) => out.set(id, entries[i % entries.length]!));
  }
  return out;
}
