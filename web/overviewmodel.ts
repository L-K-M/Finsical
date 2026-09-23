// Tank Overview's model: turns the tank's state push into the list's
// lines, header text and sort order. Pure — overview.ts renders it.
import { fishThumbKey } from "./bus.js";
import type { BusMsg } from "./bus.js";
import type { Importable } from "./import.js";
import { hungerLabel, uptime } from "./statsmodel.js";

export interface FishSnap {
  id: number; species: string; hunger: number; state: string;
  pack?: string; name?: string;
}
export interface TankState extends BusMsg {
  addons?: Importable[];
  fish?: FishSnap[];
  waterQuality?: number;
  tickCount?: number;
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
const STATES: Record<string, string> = {
  drift: "Swimming", seek: "Looking for food", startle: "Startled",
  turn: "Turning",
};

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
    name: f.name ? `${f.name} (${f.species || "Fish"})` : (f.species || "Fish"),
    kind: "Fish",
    // Personality hint derived from state and species — adds flavor.
    const personality = personalityOf(f);
    status: `${STATES[f.state] ?? "Swimming"}, ${hungerLabel(f.hunger)}${personality ? ` · ${personality}` : ""}`,
    rank: 0,
    remove: { op: "removeFish", id: f.id },
  }));
  for (const a of s.addons ?? []) {
    if (a.section === "fish" && fish.some((f) => f.pack === a.url ||
        (f.pack === undefined && f.species === a.inner)))
      continue;
    items.push({
      key: `a:${a.url}`,
      thumb: `a:${a.url}`,
      name: a.inner,
      kind: KINDS[a.section] ?? a.section,
      status: "In tank",
      rank: 1,
      remove: { op: "removeAddon", url: a.url },
    });
  }
  return items;
}

function personalityOf(f: FishSnap): string {
  // Small playful hints based on what we know — no extra sim data needed.
  const hints: string[] = [];
  if (f.state === "seek") hints.push("eager");
  else if (f.state === "startle") hints.push("jumpy");
  else if (f.state === "turn") hints.push("graceful");
  else hints.push("calm");
  const species = (f.species ?? "").toLowerCase();
  if (species.includes("angel") || species.includes("angelfish"))
    hints.push("elegant");
  else if (species.includes("guppy") || species.includes("guppies"))
    hints.push("lively");
  else if (species.includes("tang") || species.includes("tank"))
    hints.push("bold");
  return hints.join(", ");
}

export function sortItems(items: Item[], by: Column): Item[] {
  const name = (a: Item, b: Item) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: "base" });
  return [...items].sort((a, b) =>
    by === "kind" ? a.kind.localeCompare(b.kind) || name(a, b)
    : by === "status" ? a.status.localeCompare(b.status) || name(a, b)
    : name(a, b) || a.kind.localeCompare(b.kind));
}
