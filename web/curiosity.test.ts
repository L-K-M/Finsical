import { describe, expect, it } from "vitest";
import { nextNotice, NOTICE_FADE_TICKS, NOTICE_MOVE, noticePoint }
  from "./curiosity.js";

describe("curiosity", () => {
  it("starts on the first sight of the pointer", () => {
    const n = nextNotice(null, { x: 10, y: 20 }, 100);
    expect(n).toEqual({ x: 10, y: 20, at: 100 });
    expect(noticePoint(n, 100)).toEqual({ x: 10, y: 20 });
  });

  it("doesn't count a jitter of a few px as a move", () => {
    const n = nextNotice(null, { x: 10, y: 20 }, 100);
    const m = nextNotice(n, { x: 10 + NOTICE_MOVE, y: 20 }, 500);
    expect(m).toBe(n);
  });

  it("fades after NOTICE_FADE_TICKS without a real move", () => {
    const n = nextNotice(null, { x: 10, y: 20 }, 100);
    expect(noticePoint(n, 100 + NOTICE_FADE_TICKS)).not.toBeNull();
    expect(noticePoint(n, 101 + NOTICE_FADE_TICKS)).toBeNull();
  });

  it("comes back when the pointer really moves", () => {
    const n = nextNotice(null, { x: 10, y: 20 }, 100);
    const tick = 200 + NOTICE_FADE_TICKS;
    const m = nextNotice(n, { x: 20, y: 20 }, tick);
    expect(noticePoint(m, tick)).toEqual({ x: 20, y: 20 });
  });

  it("treats a notice from a later tick as stale, then restarts it",
     () => {
    // The sim clock went back (a restored tank) under a live notice.
    const n = nextNotice(null, { x: 10, y: 20 }, 500);
    expect(noticePoint(n, 499)).toBeNull();
    expect(noticePoint(n, 100)).toBeNull();
    // Even a sighting that isn't a real move restarts it on the new
    // clock, where it fades as usual.
    const m = nextNotice(n, { x: 10, y: 20 }, 100);
    expect(m).toEqual({ x: 10, y: 20, at: 100 });
    expect(noticePoint(m, 100)).toEqual({ x: 10, y: 20 });
    expect(noticePoint(m, 101 + NOTICE_FADE_TICKS)).toBeNull();
  });

  it("ends when the pointer leaves the tank", () => {
    const n = nextNotice(null, { x: 10, y: 20 }, 100);
    expect(nextNotice(n, null, 101)).toBeNull();
    expect(noticePoint(null, 101)).toBeNull();
  });
});
