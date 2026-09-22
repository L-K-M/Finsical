// Fixed-size Platinum bitmaps — the titlebar boxes, the grow box, the
// pinstripe and progress-bar tiles — as pixel art. Every entry is a
// grid of palette keys, one character per pixel, copied from Mac OS
// 8.0 screen output (reference screenshots, plus a running system for
// the pressed and inactive states). A hex
// digit is a gray level (0 = #000000, 8 = #888888, f = #ffffff),
// letters are named colors, '.' is transparent.
//
// The grids compile to crisp SVG data URIs (spriteUrl) that the
// stylesheet reads through custom properties, so platinum.css never
// hard-codes pixel art and every sprite stays reviewable as a picture.

const COLORS: Record<string, string> = {
  // Lavender accent — the default Mac OS 8 highlight ramp, dark to light.
  n: "#000055", l: "#333399", m: "#6666cc", p: "#9999ff", q: "#ccccff",
};

/** Resolve one palette key to a CSS color, or null for transparent. */
function color(key: string): string | null {
  if (key === ".") return null;
  if (/^[0-9a-f]$/.test(key)) return "#" + key.repeat(6);
  const c = COLORS[key];
  if (!c) throw new Error(`unknown sprite palette key "${key}"`);
  return c;
}

/** SVG for a pixel grid: one path per color, one subpath per run.
 * crispEdges keeps the browser from antialiasing the pixel squares
 * when it rasterizes the image at the device's pixel ratio. */
export function spriteSvg(rows: readonly string[]): string {
  const h = rows.length;
  const w = rows[0]?.length ?? 0;
  const paths = new Map<string, string>();
  rows.forEach((row, y) => {
    if (row.length !== w) throw new Error(`sprite row ${y} is not ${w} wide`);
    for (let x = 0; x < w;) {
      const c = color(row[x]!);
      let end = x + 1;
      while (end < w && row[end] === row[x]) end++;
      if (c) paths.set(c, (paths.get(c) ?? "") + `M${x} ${y}h${end - x}v1H${x}z`);
      x = end;
    }
  });
  const body = [...paths].map(([c, d]) => `<path fill="${c}" d="${d}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"` +
    ` shape-rendering="crispEdges">${body}</svg>`;
}

export function spriteUrl(rows: readonly string[]): string {
  return `url("data:image/svg+xml,${encodeURIComponent(spriteSvg(rows))}")`;
}

// ---- titlebar boxes (13 x 13, engraved rim included) ---------------
// The face is a diagonal ramp: 99 -> ff lit from the bottom right, in
// a 22 frame. Pressed, the ramp darkens to 44 -> bb. Zoom and collapse
// overlay their glyph lines on the same face.
const CLOSE = [
  "888888888888.",
  "822222222222f",
  "82fcccccccc2f",
  "82c99aabbc82f",
  "82c9aabbcc82f",
  "82caabbccd82f",
  "82cabbccdd82f",
  "82cbbccdde82f",
  "82cbccddee82f",
  "82cccddeef82f",
  "82c888888882f",
  "822222222222f",
  ".ffffffffffff",
];
const CLOSE_PRESSED = [
  "888888888888.",
  "822222222222f",
  "824455667782f",
  "824556677882f",
  "825566778892f",
  "825667788992f",
  "826677889992f",
  "826778899a92f",
  "82778899aa92f",
  "8278899aab92f",
  "828899999992f",
  "822222222222f",
  ".ffffffffffff",
];

/** Overlay 2-pixel glyph lines onto a box face. */
function overlay(face: readonly string[], lines: readonly string[]): string[] {
  return face.map((row, y) => [...row].map((c, x) =>
    lines[y]![x] === "2" ? "2" : c).join(""));
}
const ZOOM_LINES = [
  ".............",
  ".......2.....",
  ".......2.....",
  ".......2.....",
  ".......2.....",
  ".......2.....",
  ".......2.....",
  ".2222222.....",
  ".............",
  ".............",
  ".............",
  ".............",
  ".............",
];
const COLLAPSE_LINES = [
  ".............",
  ".............",
  ".............",
  ".............",
  ".............",
  ".22222222222.",
  ".............",
  ".22222222222.",
  ".............",
  ".............",
  ".............",
  ".............",
  ".............",
];

// ---- grow box (19 x 19) ---------------------------------------------
// A window without scroll bars notches its content frame around the
// grow box: the black content edge steps in by 15px, the notch takes
// the frame's face and highlight, and three engraved diagonals mark
// the grip. Covers [W-21, W-3] x [H-21, H-3] of a W x H window.
const GROW = [
  "0000000000000000fcc",
  "0ffffffffffffffffcc",
  "0fccccccccccccccccc",
  "0fccccccccccccccccc",
  "0fcccccccffcccccccc",
  "0fccccccfc7cccccccc",
  "0fcccccfc7cffcccccc",
  "0fccccfc7cfc7cccccc",
  "0fcccfc7cfc7cffcccc",
  "0fccfc7cfc7cfc7cccc",
  "0fcca7cfc7cfc7ccccc",
  "0fccccfc7cfc7cccccc",
  "0fcccca7cfc7ccccccc",
  "0fccccccfc7cccccccc",
  "0fcccccca7ccccccccc",
  "0fccccccccccccccccc",
  "ffccccccccccccccccc",
  "ccccccccccccccccccc",
  "ccccccccccccccccccc",
];
// Inactive, the grip goes but the notch keeps a faint ee highlight on
// a flat dd face inside the 55 content edge.
const GROW_INACTIVE = [
  "5555555555555555edd",
  "5eeeeeeeeeeeeeeeedd",
  ...Array<string>(14).fill("5eddddddddddddddddd"),
  "eeddddddddddddddddd",
  "ddddddddddddddddddd",
  "ddddddddddddddddddd",
];

// ---- tiles -----------------------------------------------------------
// Pinstripes: 1px white over 1px 77, six pairs per titlebar. Each
// color is its own tile so the stylesheet can offset the gray line one
// pixel right of the white one, the way Mac OS 8 staggers the ends.
const STRIPE_HI = ["f", "."];
const STRIPE_LO = [".", "7"];

// Progress-bar fill (10 rows tall): the lavender tube, a lighter left
// cap and a darker, rounding-off right end.
const FILL = ["l", "m", "p", "q", "f", "q", "p", "m", "l", "n"];
const FILL_LEFT = ["mm", "mp", "mq", "mf", "mf", "mf", "mq", "mp", "mm", "ml"];
const FILL_RIGHT = [
  "lll", "mmn", "pln", "qln", "qln", "qln", "pln", "mln", "lln", "nnn",
];

export const SPRITES = {
  close: CLOSE,
  closePressed: CLOSE_PRESSED,
  zoom: overlay(CLOSE, ZOOM_LINES),
  zoomPressed: overlay(CLOSE_PRESSED, ZOOM_LINES),
  collapse: overlay(CLOSE, COLLAPSE_LINES),
  collapsePressed: overlay(CLOSE_PRESSED, COLLAPSE_LINES),
  grow: GROW,
  growInactive: GROW_INACTIVE,
  stripeHi: STRIPE_HI,
  stripeLo: STRIPE_LO,
  fill: FILL,
  fillLeft: FILL_LEFT,
  fillRight: FILL_RIGHT,
} as const;

export type SpriteName = keyof typeof SPRITES;

/** `--pt-sprite-<kebab-name>: url(...)` declarations for every sprite,
 * ready to drop into a :root rule. */
export function spriteCss(): string {
  return Object.entries(SPRITES).map(([name, rows]) =>
    `--pt-sprite-${name.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase())}:` +
    ` ${spriteUrl(rows)};`).join("\n");
}
