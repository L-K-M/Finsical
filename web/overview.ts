import { openBus, TANK_QUIET_MS } from "./bus.js";
import { COLUMNS, itemsOf, sortItems, summary } from "./overviewmodel.js";
import type { Column, Item, TankState } from "./overviewmodel.js";
import { centerText, hostWindow, mountList, pushButton } from "osmium-ui";
import type { ListScroll } from "osmium-ui";

// Tank Overview: what's in the tank, as a Mac OS 8 Finder list view —
// a header placard, sortable Name / Kind / Status columns, and a strip
// with Remove. The tank page owns the sim: this page renders the state
// it pushes and posts intents (removeFish, removeAddon, wantThumbs).
// In a browser it talks to an index.html tab over BroadcastChannel.

// A file dropped on this window must not navigate it to the file —
// only the tank page and the Add-ons window accept drops.
window.addEventListener("dragover", (e) => {
  e.preventDefault();
  // Reject file drops with the OS "no drop" cursor instead of a copy cursor.
  if (e.dataTransfer?.types.includes("Files"))
    e.dataTransfer.dropEffect = "none";
});
window.addEventListener("drop", (e) => e.preventDefault());

/** Row pitch: 31px rows (for the 38 x 28 thumbnails) and a white rule. */
const ROW_H = 32;
const THUMB_W = 38, THUMB_H = 28;

function el(tag: string, cls = "", text = ""): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

let tankState: TankState | null = null;
let greeted = false;
// Row thumbnails arrive on demand (wantThumbs → thumbs): the tank
// renders them from live objects, so state pushes stay slim.
const thumbStore = new Map<string, string>(); // key → dataURL
const thumbRequested = new Set<string>();     // asked once per page

const summaryEl = document.getElementById("osummary")!;
const headsEl = document.getElementById("oheads")!;
const listEl = document.getElementById("olist")!;
const useBtn = document.getElementById("ouse") as HTMLButtonElement;
const emptyBtn = document.getElementById("oempty") as HTMLButtonElement;
const removeBtn = document.getElementById("oremove") as HTMLButtonElement;
// A hidden live region confirms a removal to screen readers (visually
// hidden, not display:none — some screen readers won't announce those).
const removeStatus = document.createElement("span");
removeStatus.setAttribute("role", "status");
// Explicit too — some older AT doesn't map role=status to a live region.
removeStatus.setAttribute("aria-live", "polite");
removeStatus.setAttribute("aria-atomic", "true");
removeStatus.style.cssText = "position:absolute;width:1px;height:1px;" +
  "overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);" +
  "white-space:nowrap";
removeBtn.after(removeStatus);

let tankBoot: string | undefined;
// Identifies this page instance to the tank's focus lease — two
// Overviews can be open, and only the claim holder may renew or lift.
// randomUUID is secure-context-only; on a plain-HTTP origin a throw
// here would break the whole module, and uniqueness is all the lease
// needs — not crypto strength.
const pageId = crypto.randomUUID?.() ??
  `o-${Date.now()}-${Math.random()}`;
let lastStateAt = 0;
// True while the tank has gone quiet — the list keeps its last rows
// (dimmed) but Remove mustn't post into the void.
let tankGone = false;
const bus = openBus((m) => {
  if (m.op === "state") {
    greeted = true;
    lastStateAt = Date.now();
    if (tankGone) { tankGone = false; render(); }
    // A tank restart loses any in-flight wantThumbs — a new boot id
    // resets ask state so missing thumbs are requested again (stored
    // thumbs still serve; only empty boxes re-ask).
    if (typeof m.boot === "string" && m.boot !== tankBoot) {
      tankBoot = m.boot;
      thumbRequested.clear();
      lastStructure = "";
    }
    tankState = m;
    // Emptied some other way (Remove, another window): nothing is left
    // to confirm, so an armed Empty Tank button stands down now.
    if (emptyBtn.dataset.armed && !tankItems()) disarmEmpty();
    render();
  } else if (m.op === "thumbs" &&
             m.thumbs && typeof m.thumbs === "object") {
    for (const [k, d] of
         Object.entries(m.thumbs as Record<string, unknown>))
      if (typeof d === "string") thumbStore.set(k, d);
    paintThumbs();
  }
});

hostWindow(document.getElementById("owin")!, {
  title: "Tank Overview",
  zoom: { standard: { w: 520, h: 380 } },
  grow: { min: { w: 360, h: 200 } },
});
centerText(summaryEl);

// ---- column headers ---------------------------------------------------
let sortBy: Column = "name"; // the Finder's default
let sortDir: 1 | -1 = 1;     // ...and its ascending one
const heads = new Map<Column, HTMLButtonElement>();
for (const c of COLUMNS) {
  const h = el("button", `osm-colhead ohead-${c.id}`, c.title) as
    HTMLButtonElement;
  h.type = "button";
  h.addEventListener("click", () => {
    // A column's first click sorts it ascending; clicking the column
    // that is already sorted turns it around instead of doing nothing.
    if (sortBy === c.id) sortDir = sortDir === 1 ? -1 : 1;
    else { sortBy = c.id; sortDir = 1; }
    syncHeads();
    lastStructure = "";
    render("top");
  });
  heads.set(c.id, h);
  headsEl.appendChild(h);
}
function syncHeads(): void {
  for (const [id, h] of heads) {
    const on = id === sortBy;
    h.classList.toggle("osm-sorted", on);
    h.setAttribute("aria-pressed", String(on));
    h.setAttribute("aria-label", on
      ? `Sort by ${h.textContent}, ${sortDir === 1 ? "ascending" : "descending"}`
      : `Sort by ${h.textContent}`);
  }
  // The direction triangle lives over the headers; the cell shading
  // below only needs to know which column is sorted.
  headsEl.dataset.sortDir = sortDir === 1 ? "asc" : "desc";
  listEl.dataset.sort = sortBy;
}
syncHeads();

// ---- the list -----------------------------------------------------------
let items: Item[] = [];
const list = mountList(listEl, {
  rowHeight: ROW_H,
  label: "Tank contents",
  onSelect: () => {
    syncRemove();
    // Picking a fish spotlights it in the tank — like double-clicking
    // a Finder item to see it. Add-on rows and a cleared selection
    // lift the marker. The page id claims the lease, so a second
    // Overview's heartbeats can't steal it.
    const it = items[list.selected];
    bus.post({ op: "focusFish", id: it?.fishId ?? null, from: pageId });
  },
});
// Until the first state push lands, blank is "not heard yet", not
// "empty" — render() swaps in the empty-tank text once it knows.
list.setEmpty("Waiting for the tank…");
// Keys go to the list from the start (arrows, type-select, Delete).
listEl.focus({ preventScroll: true });

function syncRemove(): void {
  const it = items[list.selected];
  removeBtn.disabled = tankGone || !it;
  useBtn.disabled = tankGone || !it?.use;
}
// A double-click's second press lands before the tank's state push
// moves the selection, so without a floor one gesture could remove
// the row and then its successor.
const REMOVE_FLOOR_MS = 350;
let lastRemovedAt = -Infinity;
let statusTimer = 0;
const removeSelected = (): void => {
  const it = items[list.selected];
  if (!it) return;

  const now = performance.now();
  if (now - lastRemovedAt < REMOVE_FLOOR_MS) return;
  lastRemovedAt = now;

  // Live regions announce only changes: two removals of same-named
  // fish would write identical text and the second would be silent,
  // so clear first and set on the next task.
  removeStatus.textContent = "";
  window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    removeStatus.textContent = `Removed ${it.name}.`;
  }, 0);
  bus.post(it.remove);
};
pushButton(removeBtn, removeSelected);
// "Use" swaps a scenery pack into view (backdrop/gravel by aspect);
// the next state push re-tags the rows "Showing"/"In tank".
pushButton(useBtn, () => {
  const it = items[list.selected];
  if (it?.use) bus.post(it.use);
});
// The danger action: every fish and add-on leaves the tank. Kept
// stateless — the next state push just lists an empty tank. Confirm
// in-page: window.confirm() silently returns false in embedded
// pages whose host never wires up the panel delegate (our WKWebView
// shell included) — a two-click arm works everywhere.
let emptyArmTimer = 0;
let emptyArmedAt = 0;
const disarmEmpty = (): void => {
  window.clearTimeout(emptyArmTimer);
  delete emptyBtn.dataset.armed;
  emptyBtn.textContent = "Empty Tank…";
};
const tankItems = (): number =>
  (tankState?.fish ?? []).length + (tankState?.addons ?? []).length;
pushButton(emptyBtn, () => {
  if (!tankItems()) { disarmEmpty(); return; }
  if (emptyBtn.dataset.armed !== "1") {
    emptyBtn.dataset.armed = "1";
    emptyBtn.textContent = "Really empty?";
    emptyArmedAt = performance.now();
    emptyArmTimer = window.setTimeout(disarmEmpty, 4000);
    return;
  }
  // A double-click would confirm within milliseconds of arming —
  // that's an accident, not a decision. Require a beat between.
  if (performance.now() - emptyArmedAt < 350) return;
  disarmEmpty();
  bus.post({ op: "emptyTank" });
});
// Delete (or Command-Delete, the Finder's Move to Trash) removes the
// selected line, like the button. Auto-repeat is ignored so a held key
// releases one fish, not the whole list.
listEl.addEventListener("keydown", (e) => {
  if ((e.key === "Backspace" || e.key === "Delete") && !e.altKey &&
      !e.ctrlKey && !e.repeat && items[list.selected]) {
    e.preventDefault();
    removeSelected();
  }
});

// A file dropped here would navigate this borderless window to the
// raw file, with no way back — swallow drops like the tank page does.
window.addEventListener("dragover", (e) => e.preventDefault());
window.addEventListener("drop", (e) => e.preventDefault());

// Place a thumbnail at whole-pixel offsets inside its box — flex
// centering would put odd sizes on half pixels and blur the art.
function placeThumb(img: HTMLImageElement): void {
  img.style.left = `${Math.floor((THUMB_W - img.naturalWidth) / 2)}px`;
  img.style.top = `${Math.floor((THUMB_H - img.naturalHeight) / 2)}px`;
}
function paintThumbs(): void {
  listEl.querySelectorAll<HTMLElement>(".othumb").forEach((box) => {
    const d = thumbStore.get(box.dataset.thumb ?? "");
    if (!d || box.querySelector("img")) return;
    const img = document.createElement("img");
    img.alt = "";
    img.addEventListener("load", () => placeThumb(img));
    img.src = d;
    box.appendChild(img);
  });
}

function row(it: Item, need: Set<string>): HTMLElement {
  const r = el("div", "orow");
  r.dataset.name = it.name;
  const name = el("span", "ocell ocell-name");
  const box = el("span", "othumb");
  box.dataset.thumb = it.thumb;
  if (!thumbStore.has(it.thumb) && !thumbRequested.has(it.thumb)) {
    thumbRequested.add(it.thumb);
    need.add(it.thumb);
  }
  name.append(box, el("span", "oname", it.name));
  r.append(name, el("span", "ocell ocell-kind", it.kind),
           el("span", "ocell ocell-status", it.status));
  r.setAttribute("aria-label", `${it.name}, ${it.kind}, ${it.status}`);
  return r;
}

// Rows are only rebuilt when membership changes — a full rebuild on
// every 2s state push would reset the list under the pointer, and a
// re-sort on every push would shuffle rows out from under it as fish
// hunger flips their Status text. Live labels refresh in place while
// the displayed order stands; a new sort still starts from the top.
let lastStructure = "";
function render(scroll: ListScroll = "keep"): void {
  const s = tankState;
  if (!s) return;
  listEl.classList.remove("osm-dimmed");
  // Only now is "empty" a fact rather than "not heard from the tank".
  list.setEmpty("The tank is empty. Import add-ons to stock it.");
  const fishN = (s.fish ?? []).length;
  const next = sortItems(itemsOf(s), sortBy, sortDir);
  const addonN = next.filter((i) => i.rank === 1).length;
  summaryEl.textContent =
    summary(fishN, addonN, s.waterQuality ?? 1, s.tickCount ?? 0);
  centerText(summaryEl);

  // Membership, not order: a status-text re-sort alone must not rebuild.
  const structure = JSON.stringify(next.map((i) => i.key).sort());
  if (structure === lastStructure) {
    const byKey = new Map(next.map((it) => [it.key, it]));
    items = items.map((old) => byKey.get(old.key) ?? old);
    items.forEach((it, i) => {
      const r = list.rows[i];
      const st = r?.querySelector(".ocell-status");
      if (st && st.textContent !== it.status) {
        st.textContent = it.status;
        r!.setAttribute("aria-label", `${it.name}, ${it.kind}, ${it.status}`);
      }
    });
    // A status-only re-tag can flip the selected row's `use` — "In
    // tank" becoming "Showing" — without a rebuild to run syncRemove.
    syncRemove();
    return;
  }
  lastStructure = structure;
  const keep = items[list.selected]?.key;
  items = next;
  const need = new Set<string>();
  list.setRows(items.map((it) => row(it, need)),
               { keep: items.findIndex((i) => i.key === keep), scroll });
  syncRemove();
  paintThumbs();
  // Rows were just rebuilt — drop thumb state for keys that died with
  // them (removed fish, uninstalled add-ons) so the maps stay bounded.
  const live = new Set(items.map((i) => i.thumb));
  for (const k of thumbStore.keys()) if (!live.has(k)) thumbStore.delete(k);
  for (const k of thumbRequested) if (!live.has(k)) thumbRequested.delete(k);
  if (need.size) bus.post({ op: "wantThumbs", keys: [...need] });
}

// The tank page may still be loading when the window opens — retry the
// hello until a state push arrives (it also posts on every save).
let tries = 0;
const greet = setInterval(() => {
  if (greeted || ++tries > 60) {
    clearInterval(greet); // give up after 30s — say so rather than wait on
    if (!greeted)
      list.setEmpty("The tank isn't answering — is Finsical running?");
  } else bus.post({ op: "hello" });
}, 500);
bus.post({ op: "hello" });
// Poll while the window is visible — the overview reads live, and this
// is also the recovery path if the tank page reloaded mid-session or
// was still loading when the greet loop gave up. Skipped while hidden:
// the relay filters pushes to closed windows.
setInterval(() => {
  if (!document.hidden) bus.post({ op: "hello" });
}, 2000);
// A hello earns a state push within ~750 ms — six quiet seconds after
// the last one means the tank tab is gone or reloading, and the rows
// still on screen are stale. Dim them and stand the buttons down
// rather than let Remove post into the void.
setInterval(() => {
  // Only mark — the state handler restores when a real push lands, so
  // a late hello reply can't strand the dim between the two.
  if (!greeted || tankGone ||
      Date.now() - lastStateAt <= TANK_QUIET_MS) return;
  tankGone = true;
  summaryEl.textContent = "Waiting for the tank…";
  centerText(summaryEl);
  listEl.classList.add("osm-dimmed");
  syncRemove();
}, 1000);
// Snap to fresh state the moment the window is shown again. The
// hello's response window also resets staleness — a backgrounded tab
// is expected to be quiet, so without the grace the next tick would
// flash "Waiting for the tank…" on a perfectly live one.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) {
    lastStateAt = Date.now();
    bus.post({ op: "hello" });
  }
});
// Right-click inside a borderless WebKit window surfaces WebKit's
// generic menu (Reload etc.) — nothing in it applies to a desk
// accessory, so swallow it like the tank page does.
window.addEventListener("contextmenu", (e) => e.preventDefault());
// Closing the window must not leave a fish spotlighted forever —
// but a bfcache pagehide keeps the DOM's selection, so only a real
// unload lifts it, and a restore re-asserts it.
window.addEventListener("pagehide", (e) => {
  if (!e.persisted)
    bus.post({ op: "focusFish", id: null, from: pageId });
});
window.addEventListener("pageshow", (e) => {
  if (e.persisted)
    bus.post({ op: "focusFish",
               id: items[list.selected]?.fishId ?? null, from: pageId });
});
// A bfcache eviction fires no event and BroadcastChannel has no
// disconnect — the spotlight is a lease: keep re-asserting it and the
// tank lets a silent overview's focus lapse. keepAlive marks the beat
// as a renewal, so it can't steal another Overview's claim.
setInterval(() => {
  const it = items[list.selected];
  if (it?.fishId != null)
    bus.post({ op: "focusFish", id: it.fishId, from: pageId,
               keepAlive: true });
}, 10_000);
