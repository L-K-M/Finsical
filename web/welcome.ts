// First launch: a new tank holds four stand-in fish and no scenery, so
// Finsical offers to stock it with the starter set (web/starter.ts) in
// a note alert, then shows each download's progress in the same alert.
// Failures end in a caution alert with Try Again, never silently.
import { showAlert } from "./alert.js";
import type { Alert, AlertButton } from "./alert.js";
import { listAddons, loadProblem } from "./import.js";
import type { Importable } from "./import.js";
import { resolveStarter, runStarter, starterCollection,
         wantsStarterSounds } from "./starter.js";

const WELCOMED_KEY = "finsical:welcomed";
/** Set once the tank has had its chance at the starter set's sounds:
 * from the welcome, or from backfillStarterSounds for an older tank. */
const SOUNDS_KEY = "finsical:starterSounds";

const WELCOME_TEXT = "Welcome to Finsical. Your tank has four stand-in " +
  "fish. Finsical can stock it with the original Aquazone fish, plants, " +
  "scenery and sound effects from the Internet Archive.";

export interface StarterHooks {
  /** The tank's own install path; rejects when the add-on can't be
   * added. */
  install(it: Importable): Promise<void>;
  /** A starter fish is in the tank: the stand-ins can go. */
  fishArrived(): void;
}

/** Whether to greet: a first launch has no saved tank, and the welcome
 * wasn't answered before (it can be, with storage on, before the first
 * save lands). */
export function wantsWelcome(hasSavedTank: boolean): boolean {
  if (hasSavedTank) return false;
  try { return localStorage.getItem(WELCOMED_KEY) === null; }
  catch { return true; } // storage off: nothing can be remembered either
}

function markWelcomed(): void {
  try { localStorage.setItem(WELCOMED_KEY, "1"); }
  catch { /* storage unavailable: the offer comes back next launch */ }
  // The welcome offers the sounds with the rest; either answer counts.
  markSoundsHandled();
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

/** Offer the starter set; either answer is remembered. */
export function showWelcome(hooks: StarterHooks): void {
  showAlert({
    icon: "note",
    text: WELCOME_TEXT,
    buttons: [
      { title: "Not Now", cancel: true,
        action: (a) => { markWelcomed(); a.close(); } },
      { title: "Stock the Tank", default: true,
        action: (a) => { markWelcomed(); void stock(a, hooks, null); } },
    ],
  });
}

/** "a", "a and b", "a, b and c". */
function listNames(names: readonly string[]): string {
  if (names.length < 2) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

/** Install the starter set (or `retry`, the items that failed last
 * time) with determinate progress, then close the alert or report what
 * didn't make it. */
async function stock(alert: Alert, hooks: StarterHooks,
                     retry: Importable[] | null): Promise<void> {
  // A network that never answers must not hold the page under a modal
  // alert: Stop closes it at once and ends the run before the next
  // item. A download already under way still lands (fetches can't be
  // recalled), which is also why the stand-ins may still leave.
  let stopped = false;
  const stop: AlertButton = { title: "Stop", cancel: true,
    action: (a) => { stopped = true; a.close(); } };
  alert.update({ icon: "note", buttons: [stop], progress: 0,
                 text: "Looking up the starter set on the Internet " +
                       "Archive…" });
  const items = retry ?? resolveStarter(await listAddons(starterCollection));
  if (stopped) return;
  if (!items.length) {
    offerRetry(alert, hooks, null,
               "Finsical couldn't reach the Internet Archive. Check " +
               "the connection and try again.");
    return;
  }

  const { failed, problem } = await runStarter(items, {
    install: (it) => hooks.install(it),
    progress: (i, it) => alert.progress(
      `Adding ${i + 1} of ${items.length}: ${it.inner}…`,
      i / items.length),
    fishArrived: () => hooks.fishArrived(),
    stopped: () => stopped,
  });
  if (stopped) return;
  if (!failed.length) { alert.close(); return; }

  const what = !retry && failed.length === items.length
    ? "the starter set"
    : listNames(failed.map((f) => f.inner));
  offerRetry(alert, hooks, failed,
             `Finsical couldn't add ${what}. ${loadProblem(problem)}`);
}

function offerRetry(alert: Alert, hooks: StarterHooks,
                    retry: Importable[] | null, text: string): void {
  alert.update({
    icon: "caution",
    text,
    buttons: [
      { title: "Not Now", cancel: true },
      { title: "Try Again", default: true,
        action: (a) => { void stock(a, hooks, retry); } },
    ],
  });
}
