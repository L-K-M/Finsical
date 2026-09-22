import { openBus } from "./bus.js";
import { fileSoundRecords, qualifySoundNames } from "../core/data/snd.js";
import { mountImportPanel } from "./import.js";
import { previewOf } from "./render.js";
import { sndsMerge } from "./store.js";
import { hostWindow } from "./winhost.js";

// Import Add-ons window: the archive.org add-on browser. The tank page
// owns the sim — this page sends install intents and renders the acks
// and state it pushes back. Opened by Tank ▸ Import Add-ons… in the
// app; in a browser it talks to an index.html tab over
// BroadcastChannel.

let greeted = false;
const bus = openBus((m) => {
  if (m.op === "state") greeted = true;
  panel.notify(m);
});

const win = document.getElementById("awin")!;
hostWindow(win, bus, {
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
}, { host: win.querySelector<HTMLElement>(".pt-content")!, remote: bus });
panel.open();

// Sound files dropped on the window: decoded/encoded bytes persist to
// the shared IndexedDB store, then the tank page is asked to reload
// and play them (audio contexts live in the tank page's webview).
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => {
  e.preventDefault();
  void (async () => {
    const recs: { name: string; wav: Uint8Array }[] = [];
    for (const file of Array.from(e.dataTransfer?.files ?? [])) {
      if (file.size > 32 * 1024 * 1024) { // same cap as the tank
        console.warn("snd skip (too large):", file.name);
        continue;
      }
      try {
        recs.push(...fileSoundRecords(
          file.name, new Uint8Array(await file.arrayBuffer())));
      } catch (err) { console.warn("snd skip:", file.name, err); }
    }
    if (!recs.length) return;
    qualifySoundNames(recs);
    try { await sndsMerge(recs); }
    catch (err) {
      // The tank re-reads the store on soundsLoaded — nothing landed,
      // so posting it would report a success that isn't one.
      console.warn("snd persist failed:", err);
      return;
    }
    bus.post({ op: "soundsLoaded", name: recs[0]!.name });
  })().catch((err) => console.warn("sound drop failed:", err));
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
setInterval(() => {
  if (greeted && !document.hidden) bus.post({ op: "hello" });
}, 2000);
// Snap to fresh state the moment the window is shown again.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden && greeted) bus.post({ op: "hello" });
});
