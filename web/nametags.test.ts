import { describe, expect, it } from "vitest";
import { SURFACE } from "../core/sim.js";
import { makeRng } from "../core/rng.js";
import { armHolds, declutterTags, pruneHolds, TAG_CLEARANCE, TAG_HOLD_MS,
         tagPlacement, tagSides } from "./nametags.js";
import type { TagCandidate, TagChoice } from "./nametags.js";

// A tank drawn at 2x, its corner 10 px into the host; tags stay
// inside the host's 660 x 420 box.
const MAP = { s: 2, ox: 10, oy: 10 };
const BOUNDS = { left: 0, top: 0, right: 660, bottom: 420 };
const W = 40, H = 12;

describe("tagPlacement", () => {
  it("centres the tag just above the fish", () => {
    // Body rows 90..110 at tank x 100: host x 210, top at host y 190.
    const p = tagPlacement(100, 90, 110, MAP, W, H, BOUNDS, SURFACE + 1);
    expect(p.left).toBe(210 - W / 2);
    expect(p.top).toBeLessThan(190);
    expect(p.top + H).toBeGreaterThan(185); // close above, not far off
  });

  it("puts the tag under a fish at the surface", () => {
    // Above would reach into the air strip.
    const p = tagPlacement(100, 14, 30, MAP, W, H, BOUNDS, SURFACE + 1);
    expect(p.top).toBeGreaterThanOrEqual(10 + 30 * 2);
  });

  it("stays inside the host at the side walls", () => {
    expect(tagPlacement(0, 90, 110, MAP, W, H, BOUNDS, SURFACE + 1).left)
      .toBe(0);
    expect(tagPlacement(319, 90, 110, MAP, W, H, BOUNDS, SURFACE + 1).left)
      .toBe(BOUNDS.right - W);
  });

  it("stays inside the host at the bottom", () => {
    const p = tagPlacement(100, 14, 205, MAP, W, H, BOUNDS, SURFACE + 1);
    expect(p.top).toBe(BOUNDS.bottom - H);
  });

  it("stays inside a box that does not start at the origin", () => {
    // Viewport space: the tank rect sits at 100,50 in the window.
    const box = { left: 100, top: 50, right: 740, bottom: 450 };
    const map = { s: 2, ox: 100, oy: 50 };
    expect(tagPlacement(0, 90, 110, map, W, H, box, SURFACE + 1).left)
      .toBe(100);
    expect(tagPlacement(100, 14, 205, map, W, H, box, SURFACE + 1).top)
      .toBe(450 - H);
  });

  it("lands on whole pixels", () => {
    const p = tagPlacement(100.3, 90.7, 110, { s: 1.37, ox: 3.5, oy: 2.25 },
                           41, 13, BOUNDS, SURFACE + 1);
    expect(Number.isInteger(p.left)).toBe(true);
    expect(Number.isInteger(p.top)).toBe(true);
  });
});

describe("tagSides", () => {
  it("offers both sides in open water, the usual one being above", () => {
    const s = tagSides(100, 90, 110, MAP, W, H, BOUNDS, SURFACE + 1);
    expect(s.above).toEqual(tagPlacement(100, 90, 110, MAP, W, H, BOUNDS,
                                         SURFACE + 1));
    expect(s.below.top).toBeGreaterThanOrEqual(10 + 110 * 2);
  });

  it("offers no spot above a fish at the surface", () => {
    const s = tagSides(100, 14, 30, MAP, W, H, BOUNDS, SURFACE + 1);
    expect(s.above).toBeNull();
    expect(s.below).toEqual(tagPlacement(100, 14, 30, MAP, W, H, BOUNDS,
                                         SURFACE + 1));
  });
});

describe("declutterTags", () => {
  /** A W x H tag whose fish sits at (x, y), above and below it. */
  const cand = (id: number, x: number, y: number,
                above = true): TagCandidate => ({
    id, w: W, h: H,
    above: above ? { left: x, top: y - H - 10 } : null,
    below: { left: x, top: y + 10 },
  });
  const none = new Map<number, TagChoice>();
  type Box = { left: number; top: number; w: number; h: number };
  const boxes = (m: Map<number, TagChoice>): Box[] =>
    [...m.values()].flatMap((c) => c ? [{ ...c.spot, w: W, h: H }] : []);
  const hit = (a: Box, b: Box): boolean =>
    a.left < b.left + b.w && b.left < a.left + a.w &&
    a.top < b.top + b.h && b.top < a.top + a.h;

  it("leaves tags that don't touch where they are", () => {
    const m = declutterTags([cand(1, 0, 100), cand(2, 200, 100)], none);
    expect(m.get(1)).toEqual({ side: "above", spot: { left: 0, top: 78 } });
    expect(m.get(2)?.side).toBe("above");
  });

  it("sends a second tag on the same spot to the other side", () => {
    const m = declutterTags([cand(1, 50, 100), cand(2, 50, 100)], none);
    expect(m.get(1)?.side).toBe("above");
    expect(m.get(2)?.side).toBe("below");
  });

  it("hides a tag with no free side rather than stacking it", () => {
    const m = declutterTags(
      [cand(1, 50, 100), cand(2, 50, 100), cand(3, 50, 100)], none);
    expect(m.get(3)).toBeNull();
    // A fish at the surface has only its spot below to try.
    const s = declutterTags([cand(1, 50, 100), cand(2, 50, 100),
                             cand(4, 60, 90, false)], none);
    expect(s.get(4)).toBeNull();
  });

  it("never lets two shown tags overlap", () => {
    const rand = makeRng(7);
    for (let round = 0; round < 50; round++) {
      const cs = Array.from({ length: 24 }, (_, i) =>
        cand(i, Math.round(rand() * 280), Math.round(30 + rand() * 150),
             rand() > 0.2));
      const shown = boxes(declutterTags(cs, none));
      for (let i = 0; i < shown.length; i++)
        for (let j = i + 1; j < shown.length; j++)
          expect(hit(shown[i]!, shown[j]!)).toBe(false);
    }
  });

  it("doesn't depend on the order the fish come in", () => {
    const cs = [cand(3, 50, 100), cand(1, 52, 101), cand(2, 49, 99)];
    expect(declutterTags(cs, none))
      .toEqual(declutterTags([...cs].reverse(), none));
  });

  it("keeps a showing tag in place and makes the newcomer yield", () => {
    // Tag 5 was showing; tag 1 (a lower id) swims up under it.
    const prev = declutterTags([cand(5, 50, 100)], none);
    const m = declutterTags([cand(1, 50, 100), cand(5, 50, 100)], prev);
    expect(m.get(5)).toEqual(prev.get(5));
    expect(m.get(1)?.side).toBe("below");
  });

  it("brings a hidden tag back only once there is clear room", () => {
    const crowd = declutterTags(
      [cand(1, 50, 100), cand(2, 50, 100), cand(3, 50, 100)], none);
    expect(crowd.get(3)).toBeNull();
    // Tag 1 moves just clear of tag 3's spot above: touching distance
    // isn't room enough to come back...
    const near = declutterTags(
      [cand(1, 50 + W + 1, 100), cand(2, 50, 100), cand(3, 50, 100)],
      crowd);
    expect(TAG_CLEARANCE).toBeGreaterThan(1);
    expect(near.get(3)).toBeNull();
    // ...and well clear, it is: tag 2 goes home above, and tag 3
    // takes the spot below that tag 2 left.
    const far = declutterTags(
      [cand(1, 200, 100), cand(2, 50, 100), cand(3, 50, 100)], near);
    expect(far.get(2)?.side).toBe("above");
    expect(far.get(3)?.side).toBe("below");
  });

  it("keeps a held tag hidden, and it takes no room", () => {
    const m = declutterTags([cand(1, 50, 100), cand(2, 50, 100)], none,
                            new Set([1]));
    expect(m.get(1)).toBeNull();
    expect(m.get(2)?.side).toBe("above");
  });

  it("is its own fixed point: fed back unchanged, nothing moves", () => {
    const cs = [cand(1, 50, 100), cand(2, 50, 100), cand(3, 60, 110),
                cand(4, 200, 60, false)];
    const once = declutterTags(cs, none);
    expect(declutterTags(cs, once)).toEqual(once);
  });

  it("goes back above once its usual side is clear", () => {
    const pushed = declutterTags([cand(1, 50, 100), cand(2, 50, 100)], none);
    expect(pushed.get(2)?.side).toBe("below");
    const freed = declutterTags([cand(2, 50, 100)], pushed);
    expect(freed.get(2)?.side).toBe("above");
  });
});

describe("tag holds", () => {
  const shown: TagChoice = { side: "above", spot: { left: 0, top: 0 } };

  it("arms a hold only when a showing tag has to hide", () => {
    const held = new Map<number, number>();
    armHolds(new Map([[1, shown], [2, null]]),
             new Map([[1, null], [2, null], [3, shown]]), held, 1000);
    // 1 went from shown to hidden; 2 was already hidden; 3 shows.
    expect([...held]).toEqual([[1, 1000 + TAG_HOLD_MS]]);
  });

  it("doesn't re-arm a tag that stays hidden", () => {
    const held = new Map([[1, 1000 + TAG_HOLD_MS]]);
    armHolds(new Map([[1, null]]), new Map([[1, null]]), held, 1200);
    expect(held.get(1)).toBe(1000 + TAG_HOLD_MS);
  });

  it("lets a hold run out, and drops the holds of fish that left", () => {
    const held = new Map([[1, 1000 + TAG_HOLD_MS], [2, 5000]]);
    pruneHolds(held, new Set([1, 2]), 1000 + TAG_HOLD_MS - 1);
    expect(held.size).toBe(2); // still running
    pruneHolds(held, new Set([1]), 1000 + TAG_HOLD_MS);
    expect([...held.keys()]).toEqual([]); // 1 expired, 2's fish is gone
  });
});
