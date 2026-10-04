// Pane icons for the Preferences window, 32 x 32. Original artwork in
// the spirit of Mac OS 8 control panel icons (drawn for Finsical, not
// copied): a compact Mac with a fish tank on screen, a tube monitor
// showing scanlines, and a brightness/contrast disc. Registered as
// Osmium sprites (--osm-sprite-icon-*) by prefs.ts. Also the sound
// add-ons' icon, a speaker, which the add-on lists draw on canvases.
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

export const ICON_SPRITES: Record<string, readonly string[]> = {
  "icon-machine": ICON_MACHINE,
  "icon-monitor": ICON_MONITOR,
  "icon-picture": ICON_PICTURE,
};
