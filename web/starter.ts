// The starter aquarium a first launch offers: a few fish, a gravel, a
// plant, a background and the game's sound effects from the archive.org
// collections, about 2 MB in all, picked by name and resolved against
// the live listing so an item the archive drops is skipped instead of
// breaking the offer.
import type { Collection, Importable, PackSection } from "./import.js";

export interface StarterItem { section: PackSection; inner: string }

/** In reported install order: scenery after the fish, so the fish
 * arrive first and the placeholders can go as early as possible, and
 * the sounds last — runStarter still kicks that slowest download off
 * in the background once the first fish lands. Sizes are the
 * archive's download sizes. */
export const STARTER_SET: readonly StarterItem[] = [
  { section: "fish", inner: "banggai" },       // 321 KB
  { section: "fish", inner: "clownfish" },     //  94 KB
  { section: "fish", inner: "neon" },          //  85 KB
  { section: "gravel", inner: "brownsand" },   // 126 KB
  { section: "plants", inner: "Amazon_L" },    // 134 KB
  { section: "backgrounds", inner: "Back03" }, // 308 KB
  { section: "sounds", inner: "AZ_WAVES" },    // 1155 KB
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

/** Whether this launch should install the starter set's sounds on its
 * own. Tanks set up before the set had sounds answered the welcome
 * without them and play nothing. Only a tank that already answered the
 * welcome, holds no sounds and was never given the chance before gets
 * them: a launch that offers the starter set (the welcome or its retry)
 * leaves them to it, and once they are handled, removing them sticks. */
export function wantsStarterSounds(s: { welcomePending: boolean;
                                        soundsHandled: boolean;
                                        hasSounds: boolean }): boolean {
  return !s.welcomePending && !s.soundsHandled && !s.hasSounds;
}

/** Where the first-run offer stands, as web/welcome.ts stores it:
 * "pending" while the welcome is up unanswered, "retry" once stocking
 * started and until it finishes (a failure or Stop leaves it there),
 * "declined" and "stocked" for good. Before these, "1" meant either
 * answer. */
export type WelcomeAnswer = "pending" | "retry" | "declined" | "stocked";

/** What a launch offers: the welcome, the rest of a starter set that
 * didn't finish installing, or nothing. `answer` is the stored one
 * (null: never stored); `pristine`: the tank holds only stand-ins and
 * no add-ons. A tank with no answer that isn't pristine was set up
 * before the welcome existed; an unknown answer counts as answered. */
export function welcomeOffer(s: { answer: string | null;
                                  pristine: boolean }):
    "welcome" | "retry" | null {
  if (s.answer === "pending") return "welcome";
  if (s.answer === "retry") return "retry";
  return s.answer === null && s.pristine ? "welcome" : null;
}

/** Outcome of a starter install run: the items that failed, in set
 * order, and the first error seen, for the retry offer's message. */
export interface StarterRun {
  failed: Importable[];
  problem: unknown;
}

/** Install a resolved starter set, skipping the items the tank already
 * has (a retry after an unfinished run). The art installs strictly in
 * order — fish first so the stand-ins leave as early as possible — while the
 * sounds, the slowest download, kick off once the first fish lands and
 * overlap the remaining art instead of stacking on the end. The sounds
 * are still awaited last, so progress numbering and failure order keep
 * the set's order. A stopped run returns what it has so far; an
 * in-flight download still lands. */
export async function runStarter(
  items: readonly Importable[],
  hooks: {
    install: (it: Importable) => Promise<unknown>;
    installed: (it: Importable) => boolean;
    /** `index` of `total`: the items this run installs. */
    progress: (index: number, total: number, it: Importable) => void;
    fishArrived: (it: Importable) => void;
    /** The sound bank landed, even after a stop. */
    soundsArrived: (it: Importable) => void;
    stopped: () => boolean;
  },
): Promise<StarterRun> {
  const todo = items.filter((it) => !hooks.installed(it));
  const failed: Importable[] = [];
  let problem: unknown = null;
  const soundJobs = new Map<Importable, Promise<unknown>>();
  const startSounds = (): void => {
    if (soundJobs.size) return;
    for (const it of todo)
      if (it.section === "sounds")
        soundJobs.set(it, Promise.resolve().then(() => hooks.install(it))
          .then(() => { hooks.soundsArrived(it); return null; },
                // A null rejection mustn't read as success.
                (e: unknown) =>
                  e ?? new Error(`couldn't add ${it.inner}`)));
  };
  for (const [i, it] of todo.entries()) {
    if (it.section === "sounds") continue;
    if (hooks.stopped()) return { failed, problem };
    hooks.progress(i, todo.length, it);
    try {
      await hooks.install(it);
    } catch (e) {
      console.warn(`starter set: couldn't add ${it.inner}:`, e);
      failed.push(it);
      // A bare Promise.reject() leaves e nullish — the modal's retry
      // still needs a real error to report, and it should name the
      // item that failed.
      problem ??= e ?? new Error(`couldn't add ${it.inner}`);
      continue;
    }
    if (it.section === "fish") {
      hooks.fishArrived(it);
      if (!hooks.stopped()) startSounds();
    }
  }
  // No fish landed, or the set has no fish — the sounds still install.
  if (!hooks.stopped()) startSounds();
  for (const [i, it] of todo.entries()) {
    const job = soundJobs.get(it);
    if (!job) continue;
    if (hooks.stopped()) return { failed, problem };
    hooks.progress(i, todo.length, it);
    const e = await job;
    if (e !== null) {
      console.warn(`starter set: couldn't add ${it.inner}:`, e);
      failed.push(it);
      problem ??= e;
    }
  }
  return { failed, problem };
}
