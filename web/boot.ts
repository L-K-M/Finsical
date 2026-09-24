// The startup parade: a 90s-Mac boot drawn into the tank canvas before
// the first tank frame — black, a grey desktop with a smiling fishbowl
// (the "Happy Mac" slot, but this app's own icon), restored add-ons
// marching in along the bottom like extension icons, then a fade into
// the water. Pure timing up top; pixel art and drawing at the bottom.

export type BootPhase = "black" | "hello" | "parade" | "fade" | "done";

/** Power-on to desktop grey. */
export const BOOT_BLACK_MS = 150;
/** The fishbowl and welcome box hold this long before icons march. */
export const BOOT_HELLO_MS = 600;
/** The parade lingers this long after the last add-on lands. */
export const BOOT_HOLD_MS = 400;
/** Desktop-to-water crossfade. */
export const BOOT_FADE_MS = 400;
/** A restore that stalls forever can't hold the screen past this. */
export const BOOT_CAP_MS = 6000;

/** When the parade gives way to the fade: BOOT_HOLD after the restore
 * settles, but never before the hello phase ends (an instant restore
 * still gets its moment), and never past the stall cap. */
function fadeAtMs(doneElapsed: number | null): number {
  if (doneElapsed === null) return BOOT_CAP_MS;
  return Math.min(Math.max(doneElapsed, BOOT_HELLO_MS) + BOOT_HOLD_MS,
                  BOOT_CAP_MS);
}

/** The phase `elapsed` ms after power-on. `doneElapsed` is the elapsed
 * value at the moment the add-on restore settled, or null while it
 * runs. */
export function bootPhase(elapsed: number,
                          doneElapsed: number | null): BootPhase {
  if (elapsed < BOOT_BLACK_MS) return "black";
  if (elapsed < BOOT_HELLO_MS) return "hello";
  const fadeAt = fadeAtMs(doneElapsed);
  if (elapsed < fadeAt) return "parade";
  if (elapsed < fadeAt + BOOT_FADE_MS) return "fade";
  return "done";
}

/** Fade progress 0 (desktop opaque) to 1 (tank clear). */
export function fadeProgress(elapsed: number,
                             doneElapsed: number | null): number {
  return Math.min(1, Math.max(0,
    (elapsed - fadeAtMs(doneElapsed)) / BOOT_FADE_MS));
}

/** The slot for parade icon i: nine across along the bottom edge,
 * then stacking upward — how Mac OS marched its extensions in. */
export function paradeSlot(i: number): { x: number; y: number } {
  return { x: 8 + (i % 9) * 34, y: 160 - Math.floor(i / 9) * 30 };
}

// ---- pixel art ----------------------------------------------------------
// Each icon is 16 rows of 16 glyphs, drawn at 2x for a 32 px slot.
// `.` transparent; other glyphs index PALETTE.

const PALETTE: Record<string, string> = {
  "#": "#1a1a1a", // outline
  "w": "#f4f4f4", // white
  "g": "#9d9d9d", // desktop grey
  "b": "#3d6c9e", // water blue
  "o": "#d08030", // fish orange
  "v": "#3f7a3f", // plant green
  "y": "#c8a838", // castle gold
  "p": "#7a4a8c", // sound purple
};

/** The smiling fishbowl for the hello phase — this app's answer to
 * the Happy Mac, original art rather than Apple's trademark glyph. */
const BOWL_ART = [
  "......####......",
  "....##....##....",
  "...#........#...",
  "..#..#....#..#..",
  "..#..........#..",
  ".#....#..#....#.",
  ".#.....##.....#.",
  "..#..........#..",
  "..#.~~~~~~~~.#..",
  "..#~~~~~~~~~~#..",
  "..#~~o~~~~~~~#..",
  "..#~~~~~~~~~~#..",
  "...#~~~~~~~~#...",
  "....#......#....",
  ".....#....#.....",
  "......####......",
];

const SECTION_ART: Record<string, string[]> = {
  fish: [
    "................",
    "................",
    ".....oo.........",
    "....oooo.....##.",
    "...oooooo...###.",
    "..oooooooo.###..",
    ".oooooooooooo#..",
    ".oo#ooooooooo#..",
    ".oooooooooooo#..",
    "..oooooooo.###..",
    "...oooooo...###.",
    "....oooo.....##.",
    ".....oo.........",
    "................",
    "................",
    "................",
  ],
  plants: [
    "................",
    ".......v........",
    "......vvv.......",
    "..v..vvv..v.....",
    "..vv.vvv.vv.....",
    "..vvv.v.vvv.....",
    "...vvv.vvv......",
    "....vvvvv.......",
    ".....vvv........",
    "..v..vvv..v.....",
    "..vv.vvv.vv.....",
    "...vv.v.vv......",
    "....v...v.......",
    "....#######.....",
    "....#######.....",
    "................",
  ],
  accessories: [
    "................",
    "................",
    "....y..y..y.....",
    "....yyyyyyy.....",
    "....yyyyyyy.....",
    "....yy#tyyy.....",
    "....yyyyyyy.....",
    "....yyyyyyy.....",
    "....yyy#yyy.....",
    "....yyy#yyy.....",
    "....yy###yy.....",
    "....yy###yy.....",
    "...yyyyyyyyy....",
    "...yyyyyyyyy....",
    "................",
    "................",
  ],
  backgrounds: [
    "................",
    "..############..",
    "..#..........#..",
    "..#..b.......#..",
    "..#.bbb......#..",
    "..#bbbbb.v...#..",
    "..#bbbbb.vv..#..",
    "..#bbbbbbvvv.#..",
    "..#bbbbbbbbb.#..",
    "..#bbbbbbbbb.#..",
    "..#..........#..",
    "..############..",
    "......#..#......",
    ".....#....#.....",
    "....########....",
    "................",
  ],
  gravel: [
    "................",
    "................",
    "................",
    "................",
    "................",
    ".......##.......",
    "......#gg#......",
    ".....#g##g#.....",
    "....##ggg#gg....",
    "...#g##g#g##g#..",
    "..#ggg##gg##g#..",
    "..############..",
    "..#gg##gg##gg#..",
    "..############..",
    "................",
    "................",
  ],
  sounds: [
    "................",
    "........pppp....",
    "........p..p....",
    "........p..p....",
    "........p..pp...",
    "........p...p...",
    "........p...p...",
    "........p..p....",
    "........p..p....",
    "...ppp..p..p....",
    "..p...p.p..p....",
    "..p...pp..p.....",
    "...ppp.........",
    "................",
    "................",
    "................",
  ],
  tanks: [
    "................",
    ".....######.....",
    "....#......#....",
    "...#........#...",
    "...#.~~~~~~.#...",
    "..#.~~~~~~~~.#..",
    "..#~~o~~~~~~~#..",
    "..#~~~~~~~~~~#..",
    "..#~~~~~~~~~~#..",
    "...#~~~~~~~~#...",
    "....#......#....",
    ".....#....#.....",
    "......####......",
    "................",
    "................",
    "................",
  ],
};

/** The icon art for an add-on section; unknown sections get the bowl. */
export function paradeIcon(section: string): string[] {
  return SECTION_ART[section] ?? BOWL_ART;
}

/** Draw pixel-art rows at integer scale: `art[r][c]` indexes PALETTE. */
function blit(ctx: CanvasRenderingContext2D, art: readonly string[],
              x: number, y: number, scale: number): void {
  for (let r = 0; r < art.length; r++) {
    const row = art[r]!;
    for (let c = 0; c < row.length; c++) {
      const color = PALETTE[row[c]!];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x + c * scale, y + r * scale, scale, scale);
    }
  }
}

// A 2x2 checker pattern stands in for the Mac desktop's grey weave —
// built once, since a per-pixel fillRect loop would cost 30k calls.
let weavePat: CanvasPattern | null = null;
function desktopFill(ctx: CanvasRenderingContext2D): void {
  if (!weavePat) {
    const p = document.createElement("canvas");
    p.width = p.height = 2;
    const pc = p.getContext("2d")!;
    pc.fillStyle = "#9d9d9d";
    pc.fillRect(0, 0, 2, 2);
    pc.fillStyle = "#8e8e8e";
    pc.fillRect(1, 0, 1, 1);
    pc.fillRect(0, 1, 1, 1);
    weavePat = ctx.createPattern(p, "repeat");
  }
  ctx.fillStyle = weavePat ?? "#9d9d9d";
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

/** The boot screen for a phase; "fade" is left to the caller, which
 * draws the tank and then this at (1 - progress) alpha. */
export function drawBoot(ctx: CanvasRenderingContext2D, phase: BootPhase,
                         icons: readonly string[][]): void {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  if (phase === "black") {
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, w, h);
    return;
  }
  desktopFill(ctx);
  // The smiling bowl, centered a touch high like the Happy Mac.
  blit(ctx, BOWL_ART, Math.round(w / 2 - 16), Math.round(h * 0.3), 2);
  // "Welcome to Finsical" in a little white box, like Welcome to
  // Macintosh. Charcoal/Chicago fall back to whatever the system has.
  ctx.font = "10px Charcoal, Chicago, monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const label = "Welcome to Finsical";
  const tw = ctx.measureText(label).width;
  const bx = Math.round(w / 2 - tw / 2 - 6), by = Math.round(h * 0.3) + 40;
  ctx.fillStyle = "#fff";
  ctx.fillRect(bx, by, tw + 12, 16);
  ctx.strokeStyle = "#1a1a1a";
  ctx.strokeRect(bx + 0.5, by + 0.5, tw + 11, 15);
  ctx.fillStyle = "#1a1a1a";
  ctx.fillText(label, bx + 6, by + 11);
  for (let i = 0; i < icons.length; i++) {
    const s = paradeSlot(i);
    blit(ctx, icons[i]!, s.x, s.y, 2);
  }
}
