import { openBus } from "./bus.js";
import { COLUMNS, itemsOf, sortItems, summary } from "./overviewmodel.js";
import type { Column, Item, TankState } from "./overviewmodel.js";
import { centerText, hostWindow, mountList, pushButton } from "osmium-ui";
import type { ListScroll } from "osmium-ui";

// Tank Overview: what's in the tank, as a Mac OS 8 Finder list view —
// a header placard, sortable Name / Kind / Status columns, and a strip
// with Remove. The tank page owns the sim: this page renders the state
// it pushes and posts intents (removeFish, removeAddon, wantThumbs).
// In a browser it talks to an index.html tab over BroadcastChannel.

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

// Remove is a one-way door (a released fish is gone; an uninstalled
// add-on must be re-downloaded), so it arms like Empty Tank: first
// activation labels the button, a second inside 4s — but not within a
// double-click's beat — actually removes. Hoisted declarations: the
// list's onSelect closure below references disarmRemove.
let removeArmTimer = 0;
let removeArmedAt = 0;
/** The row key the armed Remove points at; disarm when it moves. */
let removeArmedKey: string | undefined;
/** Pending deferred live-region write from a drift re-arm. */
let statusTimer = 0;
function disarmRemove(msg?: string): void {
  const wasArmed = removeBtn.dataset.armed === "1";
  window.clearTimeout(removeArmTimer);
  // A queued drift announcement mustn't land after a cancel message.
  window.clearTimeout(statusTimer);
  delete removeBtn.dataset.armed;
  removeArmedKey = undefined;
  removeBtn.textContent = "Remove";
  if (wasArmed && msg !== undefined) removeStatus.textContent = msg;
}

const summaryEl = document.getElementById("osummary")!;
const headsEl = document.getElementById("oheads")!;
const listEl = document.getElementById("olist")!;
const useBtn = document.getElementById("ouse") as HTMLButtonElement;
const emptyBtn = document.getElementById("oempty") as HTMLButtonElement;
const removeBtn = document.getElementById("oremove") as HTMLButtonElement;
// A focused button already announces its own label change — aria-live
// on it would double-speak, and the 4s revert to "Remove" would sound
// like the deed done. A hidden live region says what actually
// happened instead (visually hidden, not display:none — some screen
// readers won't announce those).
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
const bus = openBus((m) => {
  if (m.op === "state") {
    greeted = true;
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
const heads = new Map<Column, HTMLButtonElement>();
for (const c of COLUMNS) {
  const h = el("button", `osm-colhead ohead-${c.id}`, c.title) as
    HTMLButtonElement;
  h.type = "button";
  h.addEventListener("click", () => {
    if (sortBy === c.id) return;
    sortBy = c.id;
    syncHeads();
    lastStructure = "";
    render("top");
  });
  heads.set(c.id, h);
  headsEl.appendChild(h);
}
function syncHeads(): void {
  for (const [id, h] of heads) {
    h.classList.toggle("osm-sorted", id === sortBy);
    h.setAttribute("aria-pressed", String(id === sortBy));
    h.setAttribute("aria-label", `Sort by ${h.textContent}`);
  }
  listEl.dataset.sort = sortBy;
}
syncHeads();

// ---- the list -----------------------------------------------------------
let items: Item[] = [];
const list = mountList(listEl, {
  rowHeight: ROW_H,
  label: "Tank contents",
  // A selection move disarms Remove — the armed button pointed at the
  // previous row, not the new one.
  onSelect: () => { disarmRemove("Removal cancelled."); syncRemove(); },
});
// Until the first state push lands, blank is "not heard yet", not
// "empty" — render() swaps in the empty-tank text once it knows.
list.setEmpty("Waiting for the tank…");
// Keys go to the list from the start (arrows, type-select, Delete).
listEl.focus({ preventScroll: true });

function syncRemove(): void {
  const it = items[list.selected];
  removeBtn.disabled = !it;
  useBtn.disabled = !it?.use;
}
const armOrRemove = (): void => {
  const it = items[list.selected];
  if (!it) { disarmRemove("Removal cancelled."); return; }
  // If the arm and the selection ever drift apart (a future path that
  // changed selection without disarming), re-arm on the row the user
  // actually picked instead of removing an unconfirmed one. The
  // re-target is announced distinctly — "Removal cancelled." followed
  // by the same "Press again to confirm." it showed before would
  // batch to no announcement at all in some screen readers.
  const drifted = removeBtn.dataset.armed === "1" &&
    it.key !== removeArmedKey;
  if (drifted) disarmRemove();
  if (removeBtn.dataset.armed !== "1") {
    removeBtn.dataset.armed = "1";
    removeArmedKey = it.key;
    removeBtn.textContent = "Really remove?";
    if (drifted) {
      // Live regions only announce *changes* — a second consecutive
      // drift writing identical text would be silent, so clear first
      // and set on the next task.
      removeStatus.textContent = "";
      window.clearTimeout(statusTimer);
      statusTimer = window.setTimeout(() => {
        removeStatus.textContent =
          "Selection changed — press again to confirm.";
      }, 0);
    } else {
      removeStatus.textContent = "Press again to confirm.";
    }
    removeArmedAt = performance.now();
    removeArmTimer = window.setTimeout(
      () => disarmRemove("Removal cancelled."), 4000);
    return;
  }
  if (performance.now() - removeArmedAt < 350) return;
  disarmRemove();
  removeStatus.textContent = "Removed.";
  bus.post(it.remove);
};
pushButton(removeBtn, armOrRemove);
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
// selected line — armed first, like the button: a stray keypress
// shouldn't release a fish. Auto-repeat is ignored: a held key would
// arm on the first event and confirm on the repeat, one gesture.
listEl.addEventListener("keydown", (e) => {
  if ((e.key === "Backspace" || e.key === "Delete") && !e.altKey &&
      !e.ctrlKey && !e.repeat && items[list.selected]) {
    e.preventDefault();
    armOrRemove();
  }
});

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

// Rows are only rebuilt when membership or order changes — a full
// rebuild on every 2s state push would reset the list under the
// pointer. Live labels refresh in place instead. A rebuild a push
// forces (fish reordering under the Status sort) keeps the scroll
// where it is; a new sort starts from the top.
let lastStructure = "";
function render(scroll: ListScroll = "keep"): void {
  const s = tankState;
  if (!s) return;
  // Only now is "empty" a fact rather than "not heard from the tank".
  list.setEmpty("The tank is empty. Import add-ons to stock it.");
  const fishN = (s.fish ?? []).length;
  const next = sortItems(itemsOf(s), sortBy);
  const addonN = next.filter((i) => i.rank === 1).length;
  summaryEl.textContent =
    summary(fishN, addonN, s.waterQuality ?? 1, s.tickCount ?? 0);
  centerText(summaryEl);

  const structure = JSON.stringify(next.map((i) => i.key));
  if (structure === lastStructure) {
    next.forEach((it, i) => {
      const r = list.rows[i];
      const st = r?.querySelector(".ocell-status");
      if (st && st.textContent !== it.status) {
        st.textContent = it.status;
        r!.setAttribute("aria-label", `${it.name}, ${it.kind}, ${it.status}`);
      }
    });
    items = next;
    return;
  }
  lastStructure = structure;
  const keep = items[list.selected]?.key;
  items = next;
  const need = new Set<string>();
  list.setRows(items.map((it) => row(it, need)),
               { keep: items.findIndex((i) => i.key === keep), scroll });
  // Membership changed — disarm only when the armed row itself moved
  // out from under the button (removed elsewhere, or the selection
  // shifted). A re-tag push that keeps the selection keeps the arm.
  if (items[list.selected]?.key !== removeArmedKey)
    disarmRemove("Removal cancelled.");
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
  if (greeted || ++tries > 60) clearInterval(greet); // give up after 30s
  else bus.post({ op: "hello" });
}, 500);
bus.post({ op: "hello" });
// Poll while the window is visible — the overview reads live, and this
// is also the recovery path if the tank page reloaded mid-session or
// was still loading when the greet loop gave up. Skipped while hidden:
// the relay filters pushes to closed windows.
setInterval(() => {
  if (!document.hidden) bus.post({ op: "hello" });
}, 2000);
// Snap to fresh state the moment the window is shown again.
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) bus.post({ op: "hello" });
});
