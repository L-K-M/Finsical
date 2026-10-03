import type { Fish } from "../core/sim.js";
import type { FishLife } from "../core/aquarium/life.js";
import { sanitizeLife } from "../core/aquarium/life.js";
import { TANK_SIZE } from "../core/tuning.js";
import { cleanFishName } from "./fishname.js";

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
  const base = entry.slice(entry.lastIndexOf("/") + 1);
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
    return `The tank is full: ${cap} fish is plenty. Release ` +
           `${adding === 1 ? "one" : adding} from Tank Overview first.`;
  return `This add-on brings ${adding} fish, and the tank has room for ` +
         `${room} more. Release ${adding - room} from Tank Overview first.`;
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

/** The fish fields the save carries, including a body's life record.
 *
 * This list is the save's contract with the sim, so it belongs in one
 * place: `restoredFish` reads exactly these fields back on the
 * next launch, and a field named here but not saved (or saved but not
 * read) is a fish that quietly loses part of its identity.
 *
 * `entry` is the trap it exists to catch. An archive.org fish add-on
 * can hold several packs, and a fish's entry says which of them it
 * came from; without it in the save the fish comes back as "some
 * fish from that add-on", and `legacyEntries` has to guess from its id
 * — which is right until you remove an earlier fish, and then the
 * survivors swap species. */
export interface SavedFish {
  id: number;
  species: string;
  x: number;
  y: number;
  facing: 1 | -1;
  heading: number;
  speed: number;
  cruise: number;
  vy: number;
  bandY: number;
  z: number;
  hunger: number;
  scale: number;
  sheetIdx?: number;
  pack?: string;
  entry?: string;
  name?: string;
  life?: FishLife;
}

/** One fish as saved; `life.dead` preserves a body without its runtime state. */
export function savedFish(f: Fish): SavedFish {
  return {
    id: f.id, species: f.species, x: f.x, y: f.y, facing: f.facing,
    heading: f.heading, speed: f.speed, cruise: f.cruise, vy: f.vy,
    bandY: f.bandY, z: f.z, hunger: f.hunger, scale: f.scale,
    // Optional fields are omitted rather than zeroed: a bogus sheetIdx
    // or entry must read as "no binding", not bind to slot 0.
    ...(f.sheetIdx !== undefined ? { sheetIdx: f.sheetIdx } : {}),
    ...(f.pack !== undefined ? { pack: f.pack } : {}),
    ...(f.entry !== undefined ? { entry: f.entry } : {}),
    ...(f.name ? { name: f.name } : {}),
    ...(f.life ? { life: f.life } : {}),
  };
}

/** A saved fish as it comes back out of storage, where every field is
 * untrusted: a corrupted hunger or heading enters the sim (a NaN
 * hunger means a fish can never seek food) and then re-persists.
 * Clamp each numeric field. */
export function restoredFish(f: Partial<SavedFish> & {
  x: number; y: number;
}): Partial<Fish> & { x: number; y: number } {
  const num = (v: number | undefined, lo: number, hi: number,
               dflt: number): number =>
    typeof v === "number" && Number.isFinite(v)
      ? Math.min(hi, Math.max(lo, v)) : dflt;
  // bandY's fallback must reuse the clamped y — the raw value only
  // passed the finite check, so a corrupt save could seed an
  // out-of-bounds band and re-persist it.
  const y = num(f.y, 0, TANK_SIZE.height - 1, TANK_SIZE.height / 2);
  // Only the fields savedFish writes come back, each one named: a
  // field on one side of this contract and not the other is a fish
  // losing part of itself, and naming both sides in one module is how
  // that gets caught. Anything else a save carries stays out of the
  // sim rather than passing through unchecked.
  const out: Partial<Fish> & { x: number; y: number } = {
    x: num(f.x, 0, TANK_SIZE.width - 1, TANK_SIZE.width / 2),
    y,
    facing: f.facing === -1 ? -1 as const : 1 as const,
    heading: num(f.heading, -2 * Math.PI, 2 * Math.PI, 0),
    speed: num(f.speed, 0.1, 8, 1),
    cruise: num(f.cruise, 0.1, 8, 1),
    vy: num(f.vy, -8, 8, 0),
    bandY: num(f.bandY, 0, TANK_SIZE.height - 1, y),
    hunger: num(f.hunger, 0, 1, 0.2),
    // Pre-growth saves carry no scale: those fish are grown, not
    // juveniles. addFish clamps the value into the sim's range.
    scale: typeof f.scale === "number" && Number.isFinite(f.scale)
      ? f.scale : 1,
    species: typeof f.species === "string" ? f.species : "",
  };
  // Optional fields drop rather than zero out — a bogus sheetIdx or
  // pack must read as "no binding", not bind to slot 0.
  if (Number.isInteger(f.id) && f.id! >= 0) out.id = f.id!;
  if (Number.isInteger(f.sheetIdx) && f.sheetIdx! >= 0)
    out.sheetIdx = f.sheetIdx!;
  if (typeof f.pack === "string") out.pack = f.pack;
  // The pack's entry inside it. Read here as well as written: a
  // multi-pack add-on's fish that comes back without one has to be
  // guessed at from its id, which goes wrong the moment an earlier
  // fish is removed.
  if (typeof f.entry === "string") out.entry = f.entry;
  const name = cleanFishName(f.name);
  if (name) out.name = name;
  if (typeof f.z === "number" && Number.isFinite(f.z))
    out.z = Math.min(1, Math.max(0, f.z));
  const life = sanitizeLife(f.life);
  if (life) {
    out.life = life;
    // A body is found on the bottom, as the original reloads its
    // dead: it settles straight there rather than floating up again.
    if (life.dead) {
      out.corpse = "sink";
      out.state = "dead"; // a restored body must not announce its death again
    }
  }
  return out;
}

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
