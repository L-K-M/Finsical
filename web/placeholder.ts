/**
 * The placeholder fish — pixel art, so a fresh install with no packs
 * yet still shows a real little guppy rather than a couple of
 * rectangles. Two frames, tail up and tail down, drawn through
 * render.ts's gridCanvas and wagged by the tank's anim clock.
 */
import { gridCanvas } from "./render.js";
import type { Palette } from "osmium-ui";

export const PLACEHOLDER_PALETTE: Palette = {
  k: "#1a1a2e", // outline, eye
  o: "#e8a33d", // body
  w: "#f2d8a0", // belly
  t: "#c97f24", // fins
};

/** Body: head left, dorsal top, cream belly, a 2px eye near the
 * head; rows 4-9 run the full width so the tail can attach. */
const BODY: readonly string[] = [
  "..................",
  "......kkkk........",
  "...kkkooookk......",
  "..koooooooookk....",
  ".kooooookooooooooo",
  ".kooooookooooooooo",
  ".koowwwooooooooooo",
  ".koowwwwoooooooooo",
  ".koowwwwoooooooooo",
  "..koowwooooooooooo",
  "...kooooooooooo...",
  ".....kkkoooook....",
  ".......kkkkkk.....",
  "..................",
];

/** Tail fans: same pixels, angled down (A) or up (B) — the wag. The
 * first column is filled on rows 5-8 so the fin meets the body. */
const TAIL_DOWN: readonly string[] = [
  "......",
  "......",
  "......",
  "......",
  "..tt..",
  ".ttt..",
  "tttt..",
  "tttt..",
  ".ttt..",
  "t.tt..",
  "t..t..",
  "......",
  "......",
  "......",
];
const TAIL_UP: readonly string[] = [...TAIL_DOWN].reverse();

/** Body + tail, side by side — rows must all match in length. */
function compose(tail: readonly string[]): readonly string[] {
  return BODY.map((b, i) => b + tail[i]!);
}

export const PLACEHOLDER_FRAMES: readonly (readonly string[])[] = [
  compose(TAIL_DOWN),
  compose(TAIL_UP),
];

let cache: [HTMLCanvasElement, HTMLCanvasElement] | null = null;

/** The two wag frames as canvases (built once, shared). */
export function placeholderFrames():
    [HTMLCanvasElement, HTMLCanvasElement] {
  return (cache ??= PLACEHOLDER_FRAMES.map((rows) =>
    gridCanvas(rows, PLACEHOLDER_PALETTE)) as
    [HTMLCanvasElement, HTMLCanvasElement]);
}
