// The starter aquarium a first launch offers: a few fish, a gravel, a
// plant, a background and the game's sound effects from the archive.org
// collections, about 2 MB in all, picked by name and resolved against
// the live listing so an item the archive drops is skipped instead of
// breaking the offer.
import type { Collection, Importable } from "./import.js";

export interface StarterItem { section: string; inner: string }

/** In install order: scenery after the fish, so the fish arrive first
 * and the placeholders can go as early as possible, and the sounds,
 * the slowest download, last. Sizes are the archive's download sizes. */
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
