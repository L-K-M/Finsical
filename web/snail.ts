/** A rare visitor: every so often a snail creeps in along the gravel,
 * pauses like snails do, and keeps going until it's out the far side.
 * Pure choreography — the page owns the schedule and the drawing;
 * this module only answers where the snail is at tick t.
 * Drawn behind the fish on the gravel line, so it never reads as
 * floating. */

export const SNAIL_W = 12;
export const SNAIL_H = 7;
/** Palette per art character — . is transparent. The eyestalks (e)
 * and shell flecks (d) are the only darks; the foot reads as one row
 * of body against the gravel. */
export const SNAIL_ART: readonly string[] = [
  ".ee.........",
  ".bb..ssss...",
  "bbbbsssssss.",
  "bbbbsdsdss..",
  "bbbbsssssss.",
  ".bbbbbbbbb..",
  "............",
];
const SNAIL_INK: Record<string, string> = {
  e: "#4a4434", b: "#93a07c", s: "#a0763e", d: "#6e4e26",
};

export interface SnailVisit {
  /** tickCount when the snail touched the gravel at the edge. */
  t0: number;
  /** 1 enters at the left edge crawling right, -1 the mirror. */
  dir: 1 | -1;
}

/** Creep speed, tank-px per tick — ~5 px/s, so crossing takes a while. */
export const SNAIL_CRAWL = 0.16;
/** Crawl this many ticks, then pull in and sit for SNAIL_PAUSE_LEN. */
export const SNAIL_PAUSE_EVERY = 420;
export const SNAIL_PAUSE_LEN = 90;
const CYCLE = SNAIL_PAUSE_EVERY + SNAIL_PAUSE_LEN;

export function snailSpawn(t0: number, rng: () => number): SnailVisit {
  return { t0, dir: rng() < 0.5 ? 1 : -1 };
}

/** Where the sprite's left edge sits at tick t on a `w`-wide tank, or
 * null once the visit is over. `paused` while the snail is pulled in —
 * the sprite hunkers (the foot row spreads, eyestalks dip). */
export function snailPose(v: SnailVisit, t: number, w: number):
    { x: number; paused: boolean } | null {
  const el = t - v.t0;
  if (el < 0) return null;
  const pauses = Math.floor(el / CYCLE);
  const inCycle = el % CYCLE;
  const inPause = inCycle >= SNAIL_PAUSE_EVERY;
  const crawling = el - pauses * SNAIL_PAUSE_LEN -
    (inPause ? inCycle - SNAIL_PAUSE_EVERY : 0);
  const dist = crawling * SNAIL_CRAWL;
  // Enter fully offscreen and leave fully offscreen.
  if (dist > w + 2 * SNAIL_W) return null;
  return { x: v.dir === 1 ? -SNAIL_W + dist : w + SNAIL_W - dist,
           paused: inPause };
}

/** Rasterize the sprite once per direction — paused drops the
 * eyestalks, so two frames per direction. */
export function snailCanvas(dir: 1 | -1, paused: boolean,
                            scale = 1): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = SNAIL_W * scale;
  cv.height = SNAIL_H * scale;
  const c = cv.getContext("2d")!;
  for (let y = 0; y < SNAIL_H; y++)
    for (let x = 0; x < SNAIL_W; x++) {
      // Reading right-to-left mirrors the art for dir -1.
      const ch = SNAIL_ART[y]![dir === 1 ? x : SNAIL_W - 1 - x]!;
      const ink = SNAIL_INK[ch];
      if (!ink) continue;
      // Paused: the eyestalks tuck in.
      if (paused && ch === "e") continue;
      c.fillStyle = ink;
      c.fillRect(x * scale, y * scale, scale, scale);
    }
  return cv;
}
