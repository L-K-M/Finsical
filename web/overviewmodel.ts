// Tank Overview's model: turns the tank's state push into the list's
// lines, header text and sort order. Pure — overview.ts renders it.
import { fishThumbKey } from "./bus.js";
import type { BusMsg } from "./bus.js";
import type { Importable } from "./import.js";
import type { FishState } from "../core/sim.js";
import { conditionLabel } from "./lifecopy.js";
import { fishLabel } from "./fishname.js";
import { hungerLabel, uptime } from "./statsmodel.js";
import type { HungerBand } from "./statsmodel.js";

export interface FishSnap {
  id: number; species: string; hunger: number; state: string;
  pack?: string;
  /** The owner's name for it; absent, it goes by its species. */
  name?: string;
  /** From the life model: health 0..100, disease index, cause of death. */
  health?: number; sick?: number | null; dead?: number | null;
  /** Starter art a fish pack will replace — label it honestly. */
  standIn?: boolean;
}
export interface TankState extends BusMsg {
  addons?: Importable[];
  fish?: FishSnap[];
  waterQuality?: number;
  tickCount?: number;
  /** Add-on urls whose backdrop/gravel art is on display. */
  scenery?: { backdrop?: string; gravel?: string };
}

/** One line of the list: a fish, or an add-on with no fish of its own
 * in the tank. */
export interface Item {
  key: string;
  thumb: string;
  name: string;
  kind: string;
  status: string;
  /** 0 for a fish, 1 for an add-on (the header's counts). */
  rank: number;
  remove: BusMsg;
  /** "Use" intent for scenery packs not currently on display. */
  use?: BusMsg | undefined;
  /** Fish rows carry the sim id so a selection can spotlight it. */
  fishId?: number;
  /** Status-column order as an explicit lexicographic key: ailing fish
   * first, then hunger bands, then a fixed state order — a fish turning
   * or startling for a second must not reshuffle the list under the
   * pointer. A tuple can't collide the way packed integer ranks can. */
  statusKey: readonly number[];
}

export type Column = "name" | "kind" | "status";
export const COLUMNS: { id: Column; title: string }[] = [
  { id: "name", title: "Name" },
  { id: "kind", title: "Kind" },
  { id: "status", title: "Status" },
];

const KINDS: Record<string, string> = {
  fish: "Fish add-on", gravel: "Gravel", plants: "Plant",
  accessories: "Accessory", backgrounds: "Background", tanks: "Tank",
  sounds: "Sound",
};
// Exhaustive: a new sim state fails the build until it has a label
// (the Overview, the hover tip and Get Info all read it).
const STATES: Record<FishState, string> = {
  drift: "Swimming", seek: "Looking for food", startle: "Startled",
  turn: "Turning", sleep: "Sleeping", dead: "Dead",
};
// Sections that produce replaceable scenery — gravel art fills the
// floor, backgrounds/tanks fill the walls (aspect decides which at
// decode). Plants/accessories stack as decor; nothing to switch.
const USABLE = new Set(["gravel", "backgrounds", "tanks"]);
/** Display label for a fish's sim state — the hover tip and the
 * overview share it. A roll in progress reads "Swimming": it's
 * transient enough that the row shouldn't flash "Turning", and an
 * unknown bus state gets the same neutral label. */
export function stateLabel(state: string): string {
  // typeof, not ??: a hostile string like "constructor" resolves to
  // an inherited Object.prototype member, which is never nullish.
  const known = STATES[state as FishState];
  if (state === "turn" || typeof known !== "string") return "Swimming";
  return known;
}

// Status-column ordering: hunger band first (hungrier sorts earlier),
// then a fixed per-state rank. Transient states share a rank where
// they read the same — a barrel roll is Swimming for list purposes.
// Bands ride on hungerLabel so the sort and the status text can't
// drift on separate cut-offs — and HungerBand is total over the
// record, so a new band without a rank fails to compile rather than
// silently sorting as full.
const BAND_RANK: Record<HungerBand, number> =
  { starving: 0, hungry: 1, peckish: 2, full: 3 };
const hungerBand = (h: number): number => BAND_RANK[hungerLabel(h)];
const STATE_ORDER: Record<FishState, number> = {
  startle: 0, seek: 1, sleep: 2, turn: 3, drift: 3,
  // A real dead fish takes the ailing branch below; this only orders
  // a malformed bus frame that reports state "dead" with no timestamp.
  dead: 0,
};

// typeof, not ??: indexing with an inherited key ("constructor")
// returns a function, which is never nullish.
function stateRank(state: string): number {
  const rank = STATE_ORDER[state as FishState];
  return typeof rank === "number" ? rank : 3;
}

/** The Finder-style header line: "8 fish, 3 add-ons, water 96%, up
 * 2h 3m" (the sim ticks 30 times a second). */
export function summary(fish: number, addons: number, water: number,
                        ticks: number): string {
  return `${fish} fish, ${addons} add-on${addons === 1 ? "" : "s"}, ` +
    `water ${Math.round(water * 100)}%, up ${uptime(Math.floor(ticks / 1800))}`;
}

/** A fish's Name cell: what the tank calls it, with the species in
 * parentheses once a name has replaced it, and stand-ins marked. */
export function fishRowName(f: FishSnap): string {
  const label = fishLabel(f);
  if (f.standIn) return `${label} (stand-in)`;
  const named = typeof f.name === "string" && f.name !== "";
  return named && f.species ? `${label} (${f.species})` : label;
}

/** The list's lines from a state push. A fish add-on is represented by
 * its fish — it only lists on its own while no fish is bound to it
 * (same bound test the tank uses: pack url, or species name for
 * pre-pack rosters). */
export function itemsOf(s: TankState): Item[] {
  const fish = s.fish ?? [];
  const items: Item[] = fish.map((f) => {
    const ailing = typeof f.dead === "number" || typeof f.sick === "number";
    const stateTxt = stateLabel(f.state);
    return {
      key: fishThumbKey(f),
      thumb: fishThumbKey(f),
      name: fishRowName(f),
      kind: "Fish",
      // Bus data is untrusted: an unknown state reads as swimming.
      status: ailing ? conditionLabel(f)
                     : `${stateTxt}, ${hungerLabel(f.hunger)}`,
      rank: 0,
      remove: { op: "removeFish", id: f.id },
      fishId: f.id,
      // Ailing rows lead the list, Dead before Sick — a corpse needs
      // attention before a patient does.
      statusKey: ailing ? [typeof f.dead === "number" ? 0 : 1]
        : [2, hungerBand(f.hunger), stateRank(f.state)],
    };
  });
  const showing = new Set(
    [s.scenery?.backdrop, s.scenery?.gravel].filter(
      (u): u is string => typeof u === "string" && u !== ""));
  for (const a of s.addons ?? []) {
    if (a.section === "fish" && fish.some((f) => f.pack === a.url ||
        (f.pack === undefined && f.species === a.inner)))
      continue;
    const on = showing.has(a.url);
    items.push({
      key: `a:${a.url}`,
      thumb: `a:${a.url}`,
      name: a.inner,
      kind: KINDS[a.section] ?? a.section,
      status: on ? "Showing" : "In tank",
      rank: 1,
      // Add-ons sit after every fish; "In tank" sorts ahead of
      // "Showing" the way the old status-text compare did.
      statusKey: [3, on ? 1 : 0],
      remove: { op: "removeAddon", url: a.url },
      use: !on && USABLE.has(a.section)
        ? { op: "useAddon", url: a.url } : undefined,
    });
  }
  return items;
}

/** Lexicographic compare for status keys — prefix-free. */
function cmpKey(a: readonly number[], b: readonly number[]): number {
  for (let i = 0; i < a.length && i < b.length; i++)
    if (a[i]! !== b[i]!) return a[i]! - b[i]!;
  return a.length - b.length;
}

/** `dir` mirrors the header's direction: 1 ascending (a column's first
 * click), -1 the reverse of it, tie-breakers included — a descending
 * list is the ascending one read backwards, with rows that compare
 * equal still holding their place. */
export function sortItems(items: Item[], by: Column, dir: 1 | -1 = 1):
  Item[] {
  const name = (a: Item, b: Item) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  const cmp = (a: Item, b: Item) =>
    by === "kind" ? a.kind.localeCompare(b.kind) || name(a, b)
    : by === "status" ? cmpKey(a.statusKey, b.statusKey) || name(a, b)
    : name(a, b) || a.kind.localeCompare(b.kind);
  return [...items].sort((a, b) => dir * cmp(a, b));
}
