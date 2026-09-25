// Tank Overview's model: turns the tank's state push into the list's
// lines, header text and sort order. Pure — overview.ts renders it.
import { fishThumbKey } from "./bus.js";
import type { BusMsg } from "./bus.js";
import type { Importable } from "./import.js";
import type { FishState } from "../core/sim.js";
import { hungerLabel, uptime } from "./statsmodel.js";

export interface FishSnap {
  id: number; species: string; hunger: number; state: string;
  /** Lifecycle flags — sick outranks the swim state, dead outranks all. */
  sick?: boolean;
  dead?: boolean;
  pack?: string;
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
  turn: "Turning", sleep: "Sleeping",
};
// Sections that produce replaceable scenery — gravel art fills the
// floor, backgrounds/tanks fill the walls (aspect decides which at
// decode). Plants/accessories stack as decor; nothing to switch.
const USABLE = new Set(["gravel", "backgrounds", "tanks"]);
/** Display label for a fish's sim state — the hover tip shares it. */
export function stateLabel(state: string): string {
  return STATES[state as FishState] ?? state;
}

/** The Finder-style header line: "8 fish, 3 add-ons, water 96%, up
 * 2h 3m" (the sim ticks 30 times a second). */
export function summary(fish: number, addons: number, water: number,
                        ticks: number): string {
  return `${fish} fish, ${addons} add-on${addons === 1 ? "" : "s"}, ` +
    `water ${Math.round(water * 100)}%, up ${uptime(Math.floor(ticks / 1800))}`;
}

/** The list's lines from a state push. A fish add-on is represented by
 * its fish — it only lists on its own while no fish is bound to it
 * (same bound test the tank uses: pack url, or species name for
 * pre-pack rosters). */
export function itemsOf(s: TankState): Item[] {
  const fish = s.fish ?? [];
  const items: Item[] = fish.map((f) => ({
    key: fishThumbKey(f),
    thumb: fishThumbKey(f),
    name: f.standIn ? `${f.species || "Fish"} (stand-in)`
                    : f.species || "Fish",
    kind: "Fish",
    // Bus data is untrusted: an unknown state reads as swimming.
    status: `${f.dead === true ? "Dead" : f.sick === true ? "Sick" :
      STATES[f.state as FishState] ?? "Swimming"}, ` +
      hungerLabel(f.hunger),
    rank: 0,
    remove: { op: "removeFish", id: f.id },
    fishId: f.id,
  }));
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
      remove: { op: "removeAddon", url: a.url },
      use: !on && USABLE.has(a.section)
        ? { op: "useAddon", url: a.url } : undefined,
    });
  }
  return items;
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
    : by === "status" ? a.status.localeCompare(b.status) || name(a, b)
    : name(a, b) || a.kind.localeCompare(b.kind);
  return [...items].sort((a, b) => dir * cmp(a, b));
}
