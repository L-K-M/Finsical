/**
 * Name tags on every fish at once: AquaZone's Options > Names ("attach
 * name tags to your fish"), so a tank of look-alikes reads at a glance
 * and touch screens, which never hover, can tell one fish from another.
 * In a crowd the tags are laid out so none covers another, a tag with
 * no room hiding until there is some (declutterTags). Placement is
 * pure, so vitest pins it; the DOM layer only writes what placement
 * returns.
 */
import type { TankMap } from "./feedzone.js";

/** Gap between a tag and the fish it names, px. */
const TAG_GAP = 2;

export interface TagSpot { left: number; top: number }

/** The box tags stay inside, host px: the tank's element rect. */
export interface TagBounds {
  left: number; top: number; right: number; bottom: number;
}

/** Which side of its fish a tag sits on. */
export type TagSide = "above" | "below";

/**
 * Where a tag of `w` x `h` px may go for a fish centred at tank x `fx`
 * whose drawn body spans tank rows `top`..`bottom`: centred above the
 * body, or centred under it. `above` is null where it would reach past
 * the waterline (tank row `surface`) into the air strip. Both are
 * clamped inside `bounds` and land on whole pixels.
 */
export function tagSides(fx: number, top: number, bottom: number,
                         map: TankMap, w: number, h: number,
                         bounds: TagBounds,
                         surface: number): { above: TagSpot | null;
                                             below: TagSpot } {
  const left = Math.round(Math.max(bounds.left,
    Math.min(map.ox + fx * map.s - w / 2, bounds.right - w)));
  const at = (y: number): TagSpot => ({
    left, top: Math.round(Math.max(bounds.top, Math.min(y, bounds.bottom - h))),
  });
  const up = map.oy + top * map.s - TAG_GAP - h;
  return {
    above: up < map.oy + surface * map.s ? null : at(up),
    below: at(map.oy + bottom * map.s + TAG_GAP),
  };
}

/** A tag's usual place when nothing else is near: above the fish, or
 * under it near the surface (see tagSides). The tank lays tags out
 * with declutterTags; this is the one-tag case. */
export function tagPlacement(fx: number, top: number, bottom: number,
                             map: TankMap, w: number, h: number,
                             bounds: TagBounds,
                             surface: number): TagSpot {
  const s = tagSides(fx, top, bottom, map, w, h, bounds, surface);
  return s.above ?? s.below;
}

/** One tag to lay out: its fish's id, its size and where it may go. */
export interface TagCandidate {
  id: number; w: number; h: number;
  above: TagSpot | null; below: TagSpot;
}

/** Where declutterTags put a tag, or null: hidden this frame. */
export type TagChoice = { side: TagSide; spot: TagSpot } | null;

/** Clear space, px, a tag needs around a spot it is moving to (a
 * hidden tag coming back, or a tag changing sides); a tag staying put
 * needs none. The difference is what stops tags flickering between
 * two places, or in and out, as fish drift past each other. */
export const TAG_CLEARANCE = 6;

/** How long a tag that had to give way stays hidden before it may
 * come back, ms. Clearance alone doesn't stop a tag caught between two
 * fish that wander back and forth from blinking several times a
 * second. */
export const TAG_HOLD_MS = 1500;

/** Drop the holds that have run out, and those of fish gone from the
 * tank. */
export function pruneHolds(heldUntil: Map<number, number>,
                           live: ReadonlySet<number>, now: number): void {
  for (const [id, until] of heldUntil)
    if (until <= now || !live.has(id)) heldUntil.delete(id);
}

/** Hold every tag that was showing in `prev` and had to hide in `next`
 * for TAG_HOLD_MS from `now`. A tag that stays hidden isn't held again:
 * its hold runs out once. */
export function armHolds(prev: ReadonlyMap<number, TagChoice>,
                         next: ReadonlyMap<number, TagChoice>,
                         heldUntil: Map<number, number>, now: number): void {
  for (const [id, c] of next)
    if (!c && prev.get(id)) heldUntil.set(id, now + TAG_HOLD_MS);
}

function overlaps(a: TagSpot & { w: number; h: number },
                  b: TagSpot & { w: number; h: number },
                  gap: number): boolean {
  return a.left - gap < b.left + b.w && b.left - gap < a.left + a.w &&
         a.top - gap < b.top + b.h && b.top - gap < a.top + a.h;
}

/**
 * Lay out every tag so that none covers another: a crowd at the surface
 * or round a pellet otherwise piles its tags into one unreadable stack.
 * Each tag tries its usual side, then the other side of its fish; one
 * with no free side hides for the frame. `prev` is the last frame's
 * result. Tags that were showing go first, the longest-shown first,
 * and keep their side while it stays free, so a tag already being read
 * holds still and a newcomer yields; moving needs TAG_CLEARANCE of
 * room. Tags in `held` stay
 * hidden and take no room (see TAG_HOLD_MS). Ties go by id, so the
 * result doesn't depend on the order the fish come in.
 */
export function declutterTags(cands: readonly TagCandidate[],
                              prev: ReadonlyMap<number, TagChoice>,
                              held: ReadonlySet<number> = new Set()):
    Map<number, TagChoice> {
  // Seniority: tags that were showing, in last frame's order (which is
  // this function's own output order, longest-shown first), then the
  // rest by id.
  const rank = new Map<number, number>();
  for (const [id, c] of prev) if (c) rank.set(id, rank.size);
  const order = [...cands].sort((a, b) =>
    (rank.get(a.id) ?? Infinity) - (rank.get(b.id) ?? Infinity) ||
    a.id - b.id);
  const placed: (TagSpot & { w: number; h: number })[] = [];
  const out = new Map<number, TagChoice>();
  for (const c of order) {
    if (held.has(c.id)) { out.set(c.id, null); continue; }
    const was = prev.get(c.id) ?? null;
    const usual: TagSide = c.above ? "above" : "below";
    const other: TagSide = usual === "above" ? "below" : "above";
    // (side, clearance) in the order to try them.
    const tries: [TagSide, number][] = !was
      ? [[usual, TAG_CLEARANCE], [other, TAG_CLEARANCE]]
      : was.side === usual
        ? [[usual, 0], [other, TAG_CLEARANCE]]
        // Off its usual side: home again once there's room, else stay.
        : [[usual, TAG_CLEARANCE], [was.side, 0]];
    let choice: TagChoice = null;
    for (const [side, gap] of tries) {
      const spot = side === "above" ? c.above : c.below;
      if (!spot) continue;
      const box = { ...spot, w: c.w, h: c.h };
      if (placed.some((p) => overlaps(p, box, gap))) continue;
      placed.push(box);
      choice = { side, spot };
      break;
    }
    out.set(c.id, choice);
  }
  return out;
}

/** One fish to tag: its id (the tag's identity from frame to frame),
 * label, centre x and the tank rows its drawn body spans. */
export interface TagFish {
  id: number; label: string; x: number; top: number; bottom: number;
}

export interface NameTags {
  /** Show exactly these tags, placed through `map`, kept inside
   * `bounds`. */
  sync(fish: readonly TagFish[], map: TankMap,
       bounds: TagBounds, surface: number): void;
  /** Remove every tag. */
  clear(): void;
}

/** A layer of `.nametag` labels appended to `host`. The caller's map
 * and bounds must be in the coordinates `.nametag` is positioned in. */
export function mountNameTags(host: HTMLElement): NameTags {
  const tags = new Map<number, { el: HTMLElement; w: number; h: number }>();
  // Last frame's layout, which declutterTags keeps steady, and until
  // when each tag that had to give way stays hidden (performance.now).
  let choices = new Map<number, TagChoice>();
  const heldUntil = new Map<number, number>();
  const clear = (): void => {
    for (const t of tags.values()) t.el.remove();
    tags.clear();
    choices = new Map();
    heldUntil.clear();
  };
  return {
    sync(fish, map, bounds, surface) {
      const live = new Set<number>();
      // Text first and every size read after, so the layout runs once
      // per frame rather than once per tag.
      for (const f of fish) {
        live.add(f.id);
        let t = tags.get(f.id);
        if (!t) {
          const el = document.createElement("div");
          el.className = "nametag";
          host.appendChild(el);
          t = { el, w: 0, h: 0 };
          tags.set(f.id, t);
        }
        if (t.el.textContent !== f.label) {
          t.el.textContent = f.label;
          t.w = 0; // measure again
        }
      }
      for (const [id, t] of tags)
        if (!live.has(id)) { t.el.remove(); tags.delete(id); }
      for (const t of tags.values())
        if (!t.w) { t.w = t.el.offsetWidth; t.h = t.el.offsetHeight; }
      const now = performance.now();
      pruneHolds(heldUntil, live, now);
      const prev = choices;
      choices = declutterTags(fish.map((f) => {
        const t = tags.get(f.id)!;
        return { id: f.id, w: t.w, h: t.h,
                 ...tagSides(f.x, f.top, f.bottom, map, t.w, t.h, bounds,
                             surface) };
      }), prev, new Set(heldUntil.keys()));
      armHolds(prev, choices, heldUntil, now);
      for (const f of fish) {
        const t = tags.get(f.id)!;
        const c = choices.get(f.id) ?? null;
        // visibility, not display: a hidden tag keeps its measured size.
        t.el.style.visibility = c ? "" : "hidden";
        if (!c) continue;
        t.el.style.left = `${c.spot.left}px`;
        t.el.style.top = `${c.spot.top}px`;
      }
    },
    clear,
  };
}
