import { answerBook } from "./answers.js";
import { openBus, TANK_QUIET_MS } from "./bus.js";
import { qualifySoundNames } from "../core/data/snd.js";
import { showAlert } from "./alert.js";
import { BACKDROP_MIN, sortClientDrop } from "./drop.js";
import { mountImportPanel } from "./import.js";
import { previewOf } from "./render.js";
import { LOCAL_PREFIX, packPut, sndsMerge } from "./store.js";
import { hostWindow } from "osmium-ui";

// Import Add-ons window: the archive.org add-on browser. The tank page
// owns the sim — this page sends install intents and renders the acks
// and state it pushes back. Opened by Tank ▸ Import Add-ons… in the
// app; in a browser it talks to an index.html tab over
// BroadcastChannel.

let greeted = false;
let lastStateAt = 0;
/** How long a dropped picture waits for the tank's answer. */
const DROP_ANSWER_MS = 20_000;
/** Dropped pictures waiting for the tank's answer, by request id. */
const dropAnswers = answerBook<boolean>();
/** Request ids: unique to this page load. */
const dropIdBase = Math.random().toString(36).slice(2);
let dropSeq = 0;

/** "Reef", "Reef and Wall", "Reef, Wall and Moss". */
const listOf = (names: string[]): string =>
  names.length < 2 ? names.join("")
    : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;

const bus = openBus((m) => {
  if (m.op === "state") { greeted = true; lastStateAt = Date.now(); }
  // The tank's answer to a dropped picture's installDropped request.
  else if (m.op === "droppedResult" && typeof m.id === "string" &&
           typeof m.ok === "boolean")
    dropAnswers.settle(m.id, m.ok);
  panel.notify(m);
});

// The tank pushes on every save and answers each hello — a quiet
// spell means the tab is gone or reloading, so Add to Tank would
// just spin to its timeout.
const tankConnected = (): boolean =>
  greeted && Date.now() - lastStateAt < TANK_QUIET_MS;

const win = document.getElementById("awin")!;
hostWindow(win, {
  title: "Import Add-ons",
  zoom: { standard: { w: 620, h: 440 } },
  grow: { min: { w: 440, h: 300 } },
});

const panel = mountImportPanel({
  // Remote mode never touches the sim locally — the tank page applies
  // installs and posts the result back.
  onSheets: () => {},
  onImages: () => {},
  preview: previewOf,
}, { host: win.querySelector<HTMLElement>(".osm-content")!, remote: bus,
     connected: tankConnected });
panel.open();

const showNote = (text: string, icon: "note" | "caution" = "caution") =>
  showAlert({ icon, text,
              buttons: [{ title: "OK", default: true, cancel: true }] });

// Files dropped on the window: sounds and pictures. Their bytes persist
// to the shared IndexedDB store, then the tank page is asked to take
// them in, since it owns the sim and the audio context: sounds through
// the store's sound records, a picture under its own local: key, as a
// drop on the tank keeps one.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault();
  void (async () => {
    const files: { name: string; data: Uint8Array }[] = [];
    for (const file of Array.from(e.dataTransfer?.files ?? [])) {
      if (file.size > 32 * 1024 * 1024) { // same cap as the tank
        console.warn("drop skip (too large):", file.name);
        continue;
      }
      try {
        files.push({ name: file.name,
                     data: new Uint8Array(await file.arrayBuffer()) });
      } catch (err) { console.warn("drop skip:", file.name, err); }
    }
    const { sounds: recs, pictures, refused } = sortClientDrop(files);
    if (recs.length) {
      qualifySoundNames(recs);
      try {
        await sndsMerge(recs);
        bus.post({ op: "soundsLoaded", name: recs[0]!.name,
                   names: recs.map((r) => r.name) });
      } catch (err) {
        // The tank re-reads the store on soundsLoaded — nothing landed,
        // so posting it would report a success that isn't one.
        console.warn("snd persist failed:", err);
      }
    }
    // A picture stored with no tank to take it in would stay in the
    // store, owned by no add-on. tankConnected trusts a state push up
    // to TANK_QUIET_MS old, so a tank that quit within that time still
    // leaves the bytes behind.
    if (pictures.length && !tankConnected()) {
      showNote("The tank isn't running, so the picture wasn't added. " +
            "Open Finsical and drop it again.");
      return;
    }
    let unsaved = 0;
    const answers: Promise<[string, boolean | null]>[] = [];
    for (const { name, data, pack } of pictures) {
      const url = `${LOCAL_PREFIX}${name}`;
      if (!await packPut(url, data).catch(() => null)) { unsaved++; continue; }
      // Listening before asking: the answer can't come first.
      const id = `${dropIdBase}-${++dropSeq}`;
      answers.push(dropAnswers.wait(id, DROP_ANSWER_MS)
        .then((ok) => [pack.name, ok]));
      bus.post({ op: "installDropped", url, section: pack.section,
                 inner: pack.name, id });
    }
    // One note for the whole drop, as the tank says one for its own.
    const results = await Promise.all(answers);
    const named = (ok: boolean | null) =>
      results.filter(([, got]) => got === ok).map(([n]) => n);
    const added = named(true), failed = named(false), unheard = named(null);
    const notes: string[] = [];
    if (added.length) notes.push(`Added ${listOf(added)}.`);
    if (failed.length) notes.push(`Couldn't add ${listOf(failed)}.`);
    if (unheard.length)
      notes.push(`The tank didn't answer about ${listOf(unheard)}. If it ` +
        `quit, open Finsical and drop ${unheard.length > 1 ? "them"
        : "it"} again.`);
    if (refused)
      notes.push(`Finsical can't use ${refused > 1 ? "those pictures"
        : "that picture"}. Drop a PICT or a 256-color BMP of at least ` +
        `${BACKDROP_MIN.w} by ${BACKDROP_MIN.h} pixels.`);
    if (unsaved)
      notes.push(`Couldn't save ${unsaved > 1 ? "those pictures"
        : "the dropped picture"}. If storage is full, remove some add-ons ` +
        "to make room.");
    if (notes.length)
      showNote(notes.join(" "), failed.length || unheard.length || refused ||
        unsaved ? "caution" : "note");
  })().catch((err) => console.warn("drop failed:", err));
});

// The tank page may still be loading when the window opens — retry the
// hello until a state push arrives (it also posts on every save).
let tries = 0;
const greet = setInterval(() => {
  if (greeted || ++tries > 60) clearInterval(greet); // give up after 30s
  else bus.post({ op: "hello" });
}, 500);
bus.post({ op: "hello" });
// Poll while visible so install marks stay synced with the tank (and
// recover if the tank page reloaded mid-session). Skipped while
// hidden: the relay filters pushes to closed windows anyway.
// `greeted` gates neither this nor the show below: if the greet loop
// gave up with the tank still loading, they are what pick contact
// back up, and an unanswered hello costs nothing with no tank.
setInterval(() => {
  if (!document.hidden) bus.post({ op: "hello" });
}, 2000);
// Snap to fresh state the moment the window is shown again.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) bus.post({ op: "hello" });
});
// Right-click inside a borderless WebKit window surfaces WebKit's
// generic menu (Reload etc.) — nothing in it applies to a desk
// accessory, so swallow it like the tank page does.
window.addEventListener("contextmenu", (e) => e.preventDefault());
