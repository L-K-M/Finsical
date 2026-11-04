import { describe, expect, it } from "vitest";
import { clampCenter, decorLeft, pickDecor, savedPlace, spreadCenter,
         widestGapCenter } from "./arrange.js";
import type { DecorBox } from "./arrange.js";

const W = 320;

describe("clampCenter", () => {
  it("keeps a piece wholly inside the glass", () => {
    expect(clampCenter(5, 40, W)).toBe(20);
    expect(clampCenter(318, 40, W)).toBe(300);
    expect(clampCenter(100, 40, W)).toBe(100);
  });

  it("centres a piece wider than the tank", () => {
    expect(clampCenter(0, 400, W)).toBe(160);
    expect(clampCenter(999, W, W)).toBe(160);
  });
});

describe("decorLeft", () => {
  it("matches the old even-spread clamp", () => {
    expect(decorLeft(100, 40, W)).toBe(80);
    expect(decorLeft(5, 40, W)).toBe(0);
    expect(decorLeft(318, 40, W)).toBe(280);
  });

  it("hangs an over-wide piece off the right edge from x = 0", () => {
    expect(decorLeft(160, 400, W)).toBe(0);
  });
});

describe("spreadCenter", () => {
  it("tiles a floor the old way", () => {
    // Eight 40 px pieces fill the 320 px floor edge to edge.
    const xs = Array.from({ length: 8 }, (_, i) => spreadCenter(i, 8, 40, W));
    expect(xs).toEqual([20, 60, 100, 140, 180, 220, 260, 300]);
    expect(xs.map((x) => decorLeft(x, 40, W)))
      .toEqual([0, 40, 80, 120, 160, 200, 240, 280]);
  });

  it("keeps a wide piece inside the glass, as the old clamp did", () => {
    // The old layout drew the piece at max(round(anchor - w/2), 0).
    expect(decorLeft(spreadCenter(0, 4, 100, W), 100, W)).toBe(0);
    expect(decorLeft(spreadCenter(3, 4, 100, W), 100, W)).toBe(220);
  });
});

describe("widestGapCenter", () => {
  it("puts the first piece in the middle", () => {
    expect(widestGapCenter([], 40, W)).toBe(160);
  });

  it("puts a new piece in the widest free stretch", () => {
    // A piece at 0..40 leaves 40..320 free: the new one centres at 180.
    expect(widestGapCenter([{ x: 20, w: 40 }], 30, W)).toBe(180);
    // Pieces at 60..100 and 200..300: gaps 0..60, 100..200, 300..320.
    expect(widestGapCenter([{ x: 250, w: 100 }, { x: 80, w: 40 }], 20, W))
      .toBe(150);
  });

  it("leaves placed pieces where they are", () => {
    const placed = [{ x: 160, w: 40 }];
    const next = widestGapCenter(placed, 40, W);
    expect(placed).toEqual([{ x: 160, w: 40 }]);
    // Gaps 0..140 and 180..320 tie: the leftmost wins.
    expect(next).toBe(70);
  });

  it("handles overlapping pieces as one covered stretch", () => {
    // 100..200 and 150..250 overlap; the free floor is 0..100 and
    // 250..320, so the new piece takes 0..100.
    expect(widestGapCenter([{ x: 150, w: 100 }, { x: 200, w: 100 }], 20, W))
      .toBe(50);
  });

  it("keeps a piece inside the glass when the widest gap is too narrow", () => {
    // Only 10 px of floor is free, at 310..320: the piece is clamped.
    expect(widestGapCenter([{ x: 155, w: 310 }], 60, W)).toBe(290);
  });

  it("spreads a run of new pieces instead of stacking them", () => {
    const placed: { x: number; w: number }[] = [];
    for (let i = 0; i < 4; i++)
      placed.push({ x: widestGapCenter(placed, 20, W), w: 20 });
    const xs = placed.map((p) => p.x).sort((a, b) => a - b);
    expect(new Set(xs).size).toBe(4);
    for (let i = 1; i < xs.length; i++)
      expect(xs[i]! - xs[i - 1]!).toBeGreaterThanOrEqual(20);
  });
});

describe("savedPlace", () => {
  it("reads each copy's centre exactly as saved", () => {
    expect(savedPlace([10, 200.5], 0, W)).toBe(10);
    expect(savedPlace([10, 200.5], 1, W)).toBe(200.5);
  });

  it("rejects what a corrupt save or a crafted .fins could hold", () => {
    expect(savedPlace(undefined, 0, W)).toBeNull();
    expect(savedPlace("12", 0, W)).toBeNull();
    expect(savedPlace({ 0: 12 }, 0, W)).toBeNull();
    expect(savedPlace([10], 1, W)).toBeNull();
    expect(savedPlace([null], 0, W)).toBeNull();
    expect(savedPlace(["12"], 0, W)).toBeNull();
    expect(savedPlace([NaN], 0, W)).toBeNull();
    expect(savedPlace([Infinity], 0, W)).toBeNull();
    expect(savedPlace([-1], 0, W)).toBeNull();
    expect(savedPlace([W + 1], 0, W)).toBeNull();
  });

  it("keeps the good entries next to a bad one", () => {
    const places = [40, "x", 280];
    expect(savedPlace(places, 0, W)).toBe(40);
    expect(savedPlace(places, 1, W)).toBeNull();
    expect(savedPlace(places, 2, W)).toBe(280);
  });

  it("accepts both glass edges", () => {
    expect(savedPlace([0, W], 0, W)).toBe(0);
    expect(savedPlace([0, W], 1, W)).toBe(W);
  });
});

describe("pickDecor", () => {
  const box = (x0: number, w: number, depth: number): DecorBox =>
    ({ x0, y0: 100, w, h: 50, depth });
  const allSolid = (): boolean => true;

  it("misses empty floor", () => {
    expect(pickDecor([box(0, 20, 0.5)], 100, 120, 0, allSolid)).toBe(-1);
    expect(pickDecor([], 100, 120, 2, allSolid)).toBe(-1);
  });

  it("picks the frontmost of overlapping pieces", () => {
    const boxes = [box(80, 60, 0.3), box(100, 60, 0.8), box(90, 60, 0.5)];
    expect(pickDecor(boxes, 110, 120, 0, allSolid)).toBe(1);
  });

  it("gives a depth tie to the later piece, which draws on top", () => {
    const boxes = [box(80, 60, 0.5), box(100, 60, 0.5)];
    expect(pickDecor(boxes, 110, 120, 0, allSolid)).toBe(1);
  });

  it("looks through the clear parts of a front piece", () => {
    const boxes = [box(80, 60, 0.3), box(100, 60, 0.8)];
    // The front piece is solid only in its right half.
    const solid = (i: number, x: number): boolean => i === 0 || x >= 30;
    expect(pickDecor(boxes, 110, 120, 0, solid)).toBe(0);
    expect(pickDecor(boxes, 135, 120, 0, solid)).toBe(1);
  });

  it("asks for the art's own coordinates", () => {
    const seen: [number, number, number][] = [];
    pickDecor([box(40, 10, 0.5)], 45.7, 103.2, 0, (i, x, y) => {
      seen.push([i, x, y]);
      return false;
    });
    expect(seen).toEqual([[0, 5, 3]]);
  });

  it("grabs a thin stem within the slop", () => {
    // A one-pixel stem at art x = 10.
    const solid = (_: number, x: number): boolean => x === 10;
    const boxes = [box(100, 21, 0.5)];
    expect(pickDecor(boxes, 112, 120, 0, solid)).toBe(-1);
    expect(pickDecor(boxes, 112, 120, 2, solid)).toBe(0);
    // Slop reaches past the box edge but never asks outside the art.
    const edge = (_: number, x: number, y: number): boolean => {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      return x === 0;
    };
    expect(pickDecor(boxes, 99, 120, 2, edge)).toBe(0);
    expect(pickDecor(boxes, 97, 120, 2, edge)).toBe(-1);
  });
});
