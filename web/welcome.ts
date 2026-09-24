// First launch: a new tank holds four stand-in fish and no scenery, so
// Finsical offers to stock it with the starter set (web/starter.ts) in
// a note alert, then shows each download's progress in the same alert.
// Failures end in a caution alert with Try Again, never silently. The
// offer lasts until it is answered, and a stocking that doesn't finish
// is offered once more on the next launch.
import { showAlert } from "./alert.js";
import type { Alert, AlertButton } from "./alert.js";
import { listAddons, loadProblem } from "./import.js";
import type { Importable } from "./import.js";
import { resolveStarter, starterCollection, wantsStarterSounds,
         welcomeOffer } from "./starter.js";
import type { WelcomeAnswer } from "./starter.js";

/** A WelcomeAnswer (or the old "1"). */
const WELCOMED_KEY = "finsical:welcomed";
/** Set once the tank has had its chance at the starter set's sounds:
 * installed or declined through the welcome, or handled by
 * backfillStarterSounds for an older tank. */
const SOUNDS_KEY = "finsical:starterSounds";

const WELCOME_TEXT = "Welcome to Finsical. Your tank has four stand-in " +
  "fish. Finsical can stock it with the original Aquazone fish, plants, " +
  "scenery and sound effects from the Internet Archive.";
const RETRY_TEXT = "Finsical couldn't finish stocking your tank. Try again?";

export type StarterOffer = "welcome" | "retry";
/** What stopping or turning down Try Again records: after the welcome,
 * a retry on the next launch; after that retry, a decline. */
type GiveUp = Extract<WelcomeAnswer, "retry" | "declined">;

export interface StarterHooks {
  /** The tank's own install path; rejects when the add-on can't be
   * added. */
  install(it: Importable): Promise<void>;
  /** Whether the tank has the add-on: a retry skips what an earlier
   * session installed. */
  installed(it: Importable): boolean;
  /** A starter fish is in the tank: the stand-ins can go. */
  fishArrived(): void;
}

/** What this launch offers, if anything. `pristine`: the tank holds
 * only stand-ins and no add-ons. A saved tank alone doesn't mean the
 * welcome was answered: the tank saves while the welcome is up. */
export function launchOffer(pristine: boolean): StarterOffer | null {
  let answer: string | null;
  try { answer = localStorage.getItem(WELCOMED_KEY); }
  catch { answer = null; } // storage off: nothing can be remembered either
  return welcomeOffer({ answer, pristine });
}

function recordAnswer(answer: WelcomeAnswer): void {
  try { localStorage.setItem(WELCOMED_KEY, answer); }
  catch { /* storage unavailable: the offer comes back next launch */ }
  // The welcome offers the sounds with the rest: declining it declines
  // them too. Installing them marks them as they land (stock).
  if (answer === "declined") markSoundsHandled();
}

function markSoundsHandled(): void {
  try { localStorage.setItem(SOUNDS_KEY, "1"); }
  catch { /* storage unavailable: nothing is remembered anyway */ }
}

/** A tank set up before the starter set had sounds (AZ_WAVES) plays
 * nothing: the Sound pane has no sounds to control. Install them once,
 * without asking, as the welcome would have. Offline, or with the item
 * gone from the archive, the next launch tries again. A tank that has
 * sounds of its own only records that it was handled. */
export async function backfillStarterSounds(
    hooks: { welcomePending: boolean; hasSounds: boolean;
             install(it: Importable): Promise<void> }): Promise<void> {
  let soundsHandled: boolean;
  try { soundsHandled = localStorage.getItem(SOUNDS_KEY) !== null; }
  catch { return; } // storage off: this can't be done just once
  if (!wantsStarterSounds({ ...hooks, soundsHandled })) {
    if (!hooks.welcomePending && !soundsHandled) markSoundsHandled();
    return;
  }
  const items = resolveStarter(await listAddons((c) =>
    c.section === "sounds" && starterCollection(c)));
  if (!items.length) return;
  for (const it of items) await hooks.install(it);
  markSoundsHandled();
}

/** Offer the starter set, or on a "retry" launch what's left of it.
 * The welcome counts as unanswered until a button is pressed. Once
 * stocking starts, an unfinished run (a failure or Stop, then Not Now,
 * or the session ending) leaves "retry", and the next launch offers
 * the rest; giving up on that offer declines for good. */
export function showWelcome(offer: StarterOffer, hooks: StarterHooks): void {
  const decline: AlertButton = { title: "Not Now", cancel: true,
    action: (a) => { recordAnswer("declined"); a.close(); } };
  if (offer === "retry") {
    showAlert({
      icon: "caution",
      text: RETRY_TEXT,
      buttons: [decline, { title: "Try Again", default: true,
        action: (a) => { void stock(a, hooks, null, "declined"); } }],
    });
    return;
  }
  recordAnswer("pending");
  showAlert({
    icon: "note",
    text: WELCOME_TEXT,
    buttons: [decline, { title: "Stock the Tank", default: true,
      action: (a) => {
        recordAnswer("retry");
        void stock(a, hooks, null, "retry");
      } }],
  });
}

/** "a", "a and b", "a, b and c". */
function listNames(names: readonly string[]): string {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Install the starter set's missing items (or `retry`, the items that
 * failed last time) with determinate progress, then close the alert or
 * report what didn't make it. `giveUp` is recorded when the user stops
 * or turns down Try Again. */
async function stock(alert: Alert, hooks: StarterHooks,
                     retry: Importable[] | null,
                     giveUp: GiveUp): Promise<void> {
  // A network that never answers must not hold the page under a modal
  // alert: Stop closes it at once and ends the run before the next
  // item. A download already under way still lands (fetches can't be
  // recalled), which is also why the stand-ins may still leave.
  let stopped = false;
  const stop: AlertButton = { title: "Stop", cancel: true,
    action: (a) => { stopped = true; recordAnswer(giveUp); a.close(); } };
  alert.update({ icon: "note", buttons: [stop], progress: 0,
                 text: "Looking up the starter set on the Internet " +
                       "Archive…" });
  const listed = retry ??
    resolveStarter(await listAddons(starterCollection));
  if (stopped) return;
  if (!listed.length) {
    offerRetry(alert, hooks, null, giveUp,
               "Finsical couldn't reach the Internet Archive. Check " +
               "the connection and try again.");
    return;
  }
  const items = listed.filter((it) => !hooks.installed(it));

  const failed: Importable[] = [];
  let problem: unknown = null;
  for (const [i, it] of items.entries()) {
    if (stopped) return;
    alert.progress(`Adding ${i + 1} of ${items.length}: ${it.inner}…`,
                   i / items.length);
    try {
      await hooks.install(it);
    } catch (e) {
      console.warn(`starter set: couldn't add ${it.inner}:`, e);
      failed.push(it);
      problem ??= e;
      continue;
    }
    if (it.section === "fish") hooks.fishArrived();
    if (it.section === "sounds") markSoundsHandled();
  }
  if (stopped) return;
  if (!failed.length) { recordAnswer("stocked"); alert.close(); return; }

  const what = !retry && failed.length === listed.length
    ? "the starter set"
    : listNames(failed.map((f) => f.inner));
  offerRetry(alert, hooks, failed, giveUp,
             `Finsical couldn't add ${what}. ${loadProblem(problem)}`);
}

function offerRetry(alert: Alert, hooks: StarterHooks,
                    retry: Importable[] | null,
                    giveUp: GiveUp, text: string): void {
  alert.update({
    icon: "caution",
    text,
    buttons: [
      { title: "Not Now", cancel: true,
        action: (a) => { recordAnswer(giveUp); a.close(); } },
      { title: "Try Again", default: true,
        action: (a) => { void stock(a, hooks, retry, giveUp); } },
    ],
  });
}
