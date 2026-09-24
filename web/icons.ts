// Pane icons for the Preferences window, 32 x 32. Original artwork in
// the spirit of Mac OS 8 control panel icons (drawn for Finsical, not
// copied): a compact Mac with a fish tank on screen, a tube monitor
// showing scanlines, a brightness/contrast disc and a light bulb.
// Registered as Osmium sprites (--osm-sprite-icon-*) by prefs.ts. Also
// the sound add-ons' icon, a speaker, which the add-on lists draw on
// canvases and the Sound pane's button shows.
import type { Palette } from "osmium-ui";

/** Icon colors beyond Osmium's built-in grays and lavender ramp, from
 * the Mac's standard 256-color palette. */
export const ICON_PALETTE: Palette = {
  y: "#ffcc00", o: "#ff9900", t: "#339999", u: "#66cccc",
};

const ICON_MACHINE = [
  "................................",
  "........00000000000000000.......",
  "........0fffffffffffffff0.......",
  "........0fddddddddddddda0.......",
  "........0fd88888888888da0.......",
  "........0fd80000000000fa0.......",
  "........0fd80ufuuuuuu0fa0.......",
  "........0fd80uuuooouy0fa0.......",
  "........0fd80uuo0ooyu0fa0.......",
  "........0fd80uuuooouy0fa0.......",
  "........0fd80utuuuuuu0fa0.......",
  "........0fd80uttuuuut0fa0.......",
  "........0fd80utuuuuut0fa0.......",
  "........0fd80tttttttt0fa0.......",
  "........0fd80tttttttt0fa0.......",
  "........0fd80000000000fa0.......",
  "........0fddfffffffffffa0.......",
  "........0fddddddddddddda0.......",
  "........0fddddddddddddda0.......",
  "........0fddddddddddddda0.......",
  "........0fddddddddddddda0.......",
  "........0fdppddd000000da0.......",
  "........0fdppdddffffffda0.......",
  "........0fddddddddddddda0.......",
  "........0fddddddddddddda0.......",
  "........0faaaaaaaaaaaaaa0.......",
  "........00000000000000000.......",
  "........0bcccccccccccccb0.......",
  "........0a9999999999999a0.......",
  "........00000000000000000.......",
  "................................",
  "................................",
];

const ICON_MONITOR = [
  "................................",
  "................................",
  "................................",
  "..0000000000000000000000000000..",
  "..0ffffffffffffffffffffffffff0..",
  "..0fcccccccccccccccccccccccc90..",
  "..0fcc00000000000000000000cc90..",
  "..0fc00mmmmmmmmmmmmmmmmmm00c90..",
  "..0fc0nnnnnnnnnnnnnnnnnnnn0c90..",
  "..0fc0mmmmmppppppppppmmmmm0c90..",
  "..0fc0nnnnnnnnnnnnnnnnnnnn0c90..",
  "..0fc0mmpppqqqqffqqqqpppmm0c90..",
  "..0fc0nnnnnnnnnnnnnnnnnnnn0c90..",
  "..0fc0mmppqqffffffffqqppmm0c90..",
  "..0fc0nnnnnnnnnnnnnnnnnnnn0c90..",
  "..0fc0mmpppqqqqffqqqqpppmm0c90..",
  "..0fc0nnnnnnnnnnnnnnnnnnnn0c90..",
  "..0fc0mmmmmppppppppppmmmmm0c90..",
  "..0fc0nnnnnnnnnnnnnnnnnnnn0c90..",
  "..0fc00mmmmmmmmmmmmmmmmmm00c90..",
  "..0fcc00000000000000000000cc90..",
  "..0fccccccccccccccccccccf8cc90..",
  "..0fcccccccccccccccccccc88cc90..",
  "..0f99999999999999999999999990..",
  "..0000000000000000000000000000..",
  "...........0aaaaaaaa0...........",
  "...........0aaaaaaaa0...........",
  ".......000000000000000000.......",
  ".......0aaaaaaaaaaaaaaaa0.......",
  ".......000000000000000000.......",
  "................................",
  "................................",
];

const ICON_PICTURE = [
  "................................",
  "................................",
  "................................",
  "...............00...............",
  "...............00...............",
  "...............00...............",
  "...............00...............",
  ".......0................0.......",
  "........0..............0........",
  ".........0...000000...0.........",
  "...........00000ddd00...........",
  "..........000000ffdd00..........",
  "..........000000ffffd0..........",
  ".........0000000ffffdd0.........",
  ".........0000000fffffd0.........",
  "...0000..0000000fffffd0..0000...",
  "...0000..0000000fffffd0..0000...",
  ".........0000000fffffd0.........",
  ".........0000000ffffdd0.........",
  "..........000000ffffd0..........",
  "..........000000ffdd00..........",
  "...........00000ddd00...........",
  ".........0...000000...0.........",
  "........0..............0........",
  ".......0................0.......",
  "...............00...............",
  "...............00...............",
  "...............00...............",
  "...............00...............",
  "................................",
  "................................",
  "................................",
];

const ICON_LIGHTING = [
  "................................",
  "................................",
  ".............000000.............",
  "...........00yyyyyy00...........",
  "..........0yffyyyyyyy0..........",
  ".........0yfyyyyyyyyyy0.........",
  "........0yfyyyyyyyyyyyo0........",
  "........0yfyyyyyyyyyyyo0........",
  ".......0yfyyyyyyyyyyyyyo0.......",
  ".......0yyyyyyyyyyyyyyyo0.......",
  ".......0yyyyyyooooyyyyoo0.......",
  ".......0yyyyyoyyyyoyyyoo0.......",
  ".......0yyyyyoyyyyoyyooo0.......",
  "........0yyyyyoyyoyyooo0........",
  "........0yyyyyoyyoyyooo0........",
  ".........0yyyyoyyoyooo0.........",
  "..........0yyyoyyoyoo0..........",
  "...........0yyoyyooo0...........",
  "...........0yyoyyooo0...........",
  "...........0yyyyyyoo0...........",
  "...........0000000000...........",
  "...........0ffddcca90...........",
  "...........0000000000...........",
  "...........0ffddcca90...........",
  "...........0000000000...........",
  "...........0ffddcca90...........",
  "...........0000000000...........",
  "............0ddca990............",
  ".............000000.............",
  "................................",
  "................................",
  "................................",
];

/** Sound add-ons' icon, 32 x 24 so it sits unscaled in the add-on
 * lists' 38 x 28 thumbnails: a speaker sending out sound waves. Drawn
 * with grays and ICON_PALETTE only (render.ts rasterizes it). */
export const SOUND_ICON: readonly string[] = [
  "................................",
  "................................",
  "...............00........t......",
  "..............0f0.........t.....",
  ".............0ff0..........t....",
  "............0fee0...........t...",
  "...........0feee0.....t.....t...",
  "..........0feeee0......t.....t..",
  "....000000fddddd0.......t....t..",
  "....0ffff0dddddd0..t....t.....t.",
  "....0fcc80dddddd0...t....t....t.",
  "....0fcc80dddddd0...t....t....t.",
  "....0fcc80cccccc0...t....t....t.",
  "....0fcc80cccccc0...t....t....t.",
  "....0f8880cccccc0..t....t.....t.",
  "....0000008bbbbb0.......t....t..",
  "..........08bbbb0......t.....t..",
  "...........08aaa0.....t.....t...",
  "............08aa0...........t...",
  ".............0890..........t....",
  "..............080.........t.....",
  "...............00........t......",
  "................................",
  "................................",
];

/** The browser menu bar's 16 x 16 app glyph: the compact Mac with a
 * fish in its tank, redrawn at menu size rather than cropped from the
 * pane icon. */
export const MENU_GLYPH: readonly string[] = [
  "...00000000000..",
  "...0ffffffffa0..",
  "...0fddddddda0..",
  "...0fd00000da0..",
  "...0fd0uou0da0..",
  "...0fd0uuu0da0..",
  "...0fd0ttt0da0..",
  "...0fd00000da0..",
  "...0fddddddda0..",
  "...0fdpd000da0..",
  "...0fddddddda0..",
  "...0aaaaaaaaa0..",
  "...00000000000..",
  "...0bcccccccb0..",
  "...00000000000..",
  "................",
];

// The Sound pane's button: the same speaker, centered in 32 x 32.
const BLANK_ROWS = Array<string>(4).fill(".".repeat(32));
const ICON_SOUND = [...BLANK_ROWS, ...SOUND_ICON, ...BLANK_ROWS];

export const ICON_SPRITES: Record<string, readonly string[]> = {
  "icon-machine": ICON_MACHINE,
  "icon-monitor": ICON_MONITOR,
  "icon-picture": ICON_PICTURE,
  "icon-lighting": ICON_LIGHTING,
  "icon-sound": ICON_SOUND,
};

// Alert icons, 32 x 32, in the spirit of Mac OS 8's note and caution
// alert icons (drawn for Finsical, not copied): a face speaking into a
// balloon, and a yellow warning triangle. Registered by web/alert.ts.
const ICON_NOTE = [
  "................................",
  "................00000000000.....",
  "..............00fffffffffff00...",
  ".............0fffffffffffffff0..",
  "............0fff88888888888fff0.",
  "............0fffffffffffffffff0.",
  "............0fffffffffffffffff0.",
  "............0ff8888888888888ff0.",
  "............0fffffffffffffffff0.",
  "............0ffffffffffffffffc0.",
  "............0fff88888888888fcc0.",
  ".............0fffffffffffffcc0..",
  "..............00fffffffffcc00...",
  "...............0ff000000000.....",
  "...............0f0..............",
  ".....000000...00................",
  "...00ssssss00...................",
  "..0ssssssssss0..................",
  ".0ssssssssssss0.................",
  ".0sssssssss00ss0................",
  "0ssssssssss00ss0................",
  "0ssssssssssssss0................",
  "0sssssssssssssss0...............",
  "0ssssssssssssssss0..............",
  "0sssssssssssssss0...............",
  "0ssssssssssssss0................",
  "0ssssssssss000s0................",
  ".0ssssssssssss0.................",
  ".0sssssssssss0..................",
  "..0ssssssssss0..................",
  "...0sssssssss0..................",
  "....0ssssssss0..................",
];

const ICON_CAUTION = [
  "................................",
  "................................",
  "...............00...............",
  "...............00...............",
  "..............0000..............",
  "..............0yy0..............",
  ".............00yy00.............",
  ".............0yyyy0.............",
  "............00yyyy00............",
  "............0yyyyyy0............",
  "...........00y0000y00...........",
  "...........0yy0000yy0...........",
  "..........00yy0000yy00..........",
  "..........0yyy0000yyy0..........",
  ".........00yyy0000yyy00.........",
  ".........0yyyy0000yyyy0.........",
  "........00yyyy0000yyyy00........",
  "........0yyyyyy00yyyyyy0........",
  ".......00yyyyyy00yyyyyy00.......",
  ".......0yyyyyyy00yyyyyyy0.......",
  "......00yyyyyyyyyyyyyyyy00......",
  "......0yyyyyyyyyyyyyyyyyy0......",
  ".....00yyyyyyyy00yyyyyyyy00.....",
  ".....0yyyyyyyy0000yyyyyyyy0.....",
  "....00yyyyyyyy0000yyyyyyyy00....",
  "....0yyyyyyyyyy00yyyyyyyyyy0....",
  "...00yyyyyyyyyyyyyyyyyyyyyy00...",
  "...0yyyyyyyyyyyyyyyyyyyyyyyy0...",
  "..00yyyyyyyyyyyyyyyyyyyyyyyy00..",
  ".000000000000000000000000000000.",
  "................................",
  "................................",
];

/** The alert icons' colors: ICON_PALETTE plus a face tone, #ffcc99
 * from the same 256-color palette. */
export const ALERT_PALETTE: Palette = { ...ICON_PALETTE, s: "#ffcc99" };

export const ALERT_ICONS: Record<string, readonly string[]> = {
  "alert-note": ICON_NOTE,
  "alert-caution": ICON_CAUTION,
};
