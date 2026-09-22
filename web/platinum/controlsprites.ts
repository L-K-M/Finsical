// Mac OS 8.0 control bitmaps: push buttons, checkboxes, sliders,
// scroll bars, pop-up buttons and bevel buttons, copied from a running
// Mac OS 8.0 (Keyboard and General Controls control panels, Finder
// windows, an alert) and from guidebookgallery.org screenshots (Open
// dialog, Monitors & Sound). Same palette keys as sprites.ts.
//
// Variable-width controls are stored as 9-slices: the columns (and for
// bevel buttons, rows) either side of the single middle one are the
// fixed ends; platinum.css stretches the middle with border-image, so
// every width stays pixel-exact.

// ---- push buttons: 4 | 1 | 4 columns, 20 rows -----------------------
// Normal and dimmed from the Open dialog ("Desktop", "Eject"), pressed
// from an alert's OK button. The anti-aliased corner pixels are the
// fixed 22 gray on any background.

const BUTTON = [
  "..20002..",
  ".0bdddb0.",
  "2bffffdb2",
  "0dffdda70",
  "0dfddda70",
  "0dfddda70",
  "0dfddda70",
  "0dfddda70",
  "0dfddda70",
  "0dfddda70",
  "0dfddda70",
  "0dfddda70",
  "0dfddda70",
  "0dfddda70",
  "0dfddda70",
  "0dfddda70",
  "0dfddaa70",
  "2bdaaa772",
  ".0b77770.",
  "..20002..",
];

const BUTTON_PRESSED = [
  "..20002..",
  ".0444440.",
  "244555672",
  "045566780",
  "045666780",
  "045666780",
  "045666780",
  "045666780",
  "045666780",
  "045666780",
  "045666780",
  "045666780",
  "045666780",
  "045666780",
  "045666780",
  "045666780",
  "045667780",
  "246777882",
  ".0788880.",
  "..20002..",
];

const BUTTON_DISABLED = [
  "..88888..",
  ".8ddddd8.",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  "8ddddddd8",
  ".8ddddd8.",
  "..88888..",
];

// Default button: the button inside its 3px ring, 7 | 1 | 7 columns,
// 26 rows (the alert's OK button, released and pressed).

const BUTTON_DEFAULT = [
  "...200000002...",
  "..0ddddddddc0..",
  ".0ddaaaaaaaab0.",
  "2dda7200027aa82",
  "0da70bdddb07a70",
  "0da2bffffdb2a70",
  "0da0dffdda70a70",
  "0da0dfddda70a70",
  "0da0dfddda70a70",
  "0da0dfddda70a70",
  "0da0dfddda70a70",
  "0da0dfddda70a70",
  "0da0dfddda70a70",
  "0da0dfddda70a70",
  "0da0dfddda70a70",
  "0da0dfddda70a70",
  "0da0dfddda70a70",
  "0da0dfddda70a70",
  "0da0dfddda70a70",
  "0da0dfddaa70a70",
  "0da2bdaaa772a70",
  "0da70b777707a70",
  "2caa7200027a872",
  ".0baaaaaaaa870.",
  "..08777777770..",
  "...200000002...",
];

const BUTTON_DEFAULT_PRESSED = [
  "...200000002...",
  "..0ddddddddc0..",
  ".0ddaaaaaaaab0.",
  "2dda7200027aa82",
  "0da704444407a70",
  "0da244555672a70",
  "0da045566780a70",
  "0da045666780a70",
  "0da045666780a70",
  "0da045666780a70",
  "0da045666780a70",
  "0da045666780a70",
  "0da045666780a70",
  "0da045666780a70",
  "0da045666780a70",
  "0da045666780a70",
  "0da045666780a70",
  "0da045666780a70",
  "0da045666780a70",
  "0da045667780a70",
  "0da246777882a70",
  "0da707888807a70",
  "2caa7200027a872",
  ".0baaaaaaaa870.",
  "..08777777770..",
  "...200000002...",
];

// ---- checkboxes: 12 x 12 box, the check overhangs 2px right ---------
// Keyboard control panel (on the dd dialog face) and General Controls
// in an inactive window for the dimmed pair.

const CHECKBOX = [
  "000000000000..",
  "0fffffffffd0..",
  "0fdddddddd80..",
  "0fdddddddd80..",
  "0fdddddddd80..",
  "0fdddddddd80..",
  "0fdddddddd80..",
  "0fdddddddd80..",
  "0fdddddddd80..",
  "0fdddddddd80..",
  "0d8888888880..",
  "000000000000..",
];

const CHECKBOX_ON = [
  "000000000000..",
  "0fffffffffd00.",
  "0fdddddddd007a",
  "0fddddddd000a.",
  "0fdddddd0050..",
  "0f00ddd00770..",
  "0fd00d007a80..",
  "0fda0007ad80..",
  "0fdda07add80..",
  "0fddd7addd80..",
  "0d8888888880..",
  "000000000000..",
];

const CHECKBOX_PRESSED = [
  "000000000000..",
  "055555555570..",
  "057777777790..",
  "057777777790..",
  "057777777790..",
  "057777777790..",
  "057777777790..",
  "057777777790..",
  "057777777790..",
  "057777777790..",
  "079999999990..",
  "000000000000..",
];

const CHECKBOX_ON_PRESSED = [
  "000000000000..",
  "0555555555700.",
  "05777777770057",
  "0577777770007.",
  "057777770040..",
  "050077700450..",
  "057007004590..",
  "057500045790..",
  "057750457790..",
  "057774577790..",
  "079999999990..",
  "000000000000..",
];

const CHECKBOX_DIMMED = [
  "888888888888..",
  "8dddddddddd8..",
  "8dddddddddd8..",
  "8dddddddddd8..",
  "8dddddddddd8..",
  "8dddddddddd8..",
  "8dddddddddd8..",
  "8dddddddddd8..",
  "8dddddddddd8..",
  "8dddddddddd8..",
  "8dddddddddd8..",
  "888888888888..",
];

const CHECKBOX_ON_DIMMED = [
  "888888888888..",
  "8dddddddddd88.",
  "8ddddddddd88..",
  "8dddddddd888..",
  "8ddddddd88d8..",
  "8d88ddd88dd8..",
  "8dd88d88ddd8..",
  "8ddd888dddd8..",
  "8dddd8ddddd8..",
  "8dddddddddd8..",
  "8dddddddddd8..",
  "888888888888..",
];

// ---- slider (Keyboard, "Key Repeat Rate") ---------------------------
// Track: 3 | 1 | 5 columns, 7 rows — an engraved groove with a 22
// outline and chamfered ends. The thumb (15 x 16) points down at the
// tick marks, which hang 13px below the track's top row.

const SLIDER_TRACK = [
  ".aaaaa...",
  "aa2222f..",
  "a2aaaa2f.",
  "a2aaaa2f.",
  "a2aaaa2f.",
  ".f2222ff.",
  "..fffff..",
];

const SLIDER_TRACK_DIMMED = [
  ".........",
  "..7777...",
  ".7bbbb7..",
  ".7bbbb7..",
  ".7bbbb7..",
  "..7777...",
  ".........",
];

const SLIDER_THUMB = [
  ".0000000000000.",
  "0eqqqqqqqqqqqp0",
  "0qpppppppppppm0",
  "0qppepepeppppm0",
  "0qppqlqlqlpppm0",
  "0qppqlqlqlpppm0",
  "0qppqlqlqlpppm0",
  "0qppqlqlqlpppm0",
  "0qppqlqlqlpppm0",
  "0qppplplplpppm0",
  ".0mpppppppppm0.",
  "..0mpppppppm0..",
  "...0mpppppm0...",
  "....0mpppm0....",
  ".....0mmm0.....",
  "......000......",
];

const SLIDER_THUMB_PRESSED = [
  ".0000000000000.",
  "0qpppppppppppm0",
  "0pmmmmmmmmmmml0",
  "0pmmqmqmqmmmml0",
  "0pmmpnpnpnmmml0",
  "0pmmpnpnpnmmml0",
  "0pmmpnpnpnmmml0",
  "0pmmpnpnpnmmml0",
  "0pmmpnpnpnmmml0",
  "0pmmmnmnmnmmml0",
  ".0lmmmmmmmmml0.",
  "..0lmmmmmmml0..",
  "...0lmmmmml0...",
  "....0lmmml0....",
  ".....0lll0.....",
  "......000......",
];

const SLIDER_THUMB_DIMMED = [
  ".7777777777777.",
  "7ddddddddddddd7",
  "7ddddddddddddd7",
  "7ddddddddddddd7",
  "7ddddddddddddd7",
  "7ddddddddddddd7",
  "7ddddddddddddd7",
  "7ddddddddddddd7",
  "7ddddddddddddd7",
  "7ddddddddddddd7",
  ".7ddddddddddd7.",
  "..7ddddddddd7..",
  "...7ddddddd7...",
  "....7ddddd7....",
  ".....7ddd7.....",
  "......777......",
];

const SLIDER_TICK = [
  "ff.",
  "f08",
  "f08",
  "f08",
  "f08",
  "f08",
  "f08",
  ".88",
];

// ---- vertical scroll bar, 16 columns ---------------------------------
// Arrows are 16 rows including the bar's end line and the separator
// they share with the track. The thumb is 17 rows: its black top and
// bottom lines overlap the separators at either end of its travel.
// Mac OS 8.0 thumbs are fixed-size (proportional thumbs came in 8.5).
// SCROLL_TRACK is the sunken track's first two rows, then the row that
// repeats; the same two rows shade the track again below the thumb.

const SCROLL_UP = [
  "0000000000000000",
  "0fffffffffffffd0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0fddddd00dddddb0",
  "0fdddd0000ddddb0",
  "0fddd000000dddb0",
  "0fdd00000000ddb0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0dbbbbbbbbbbbbb0",
  "0000000000000000",
];

const SCROLL_UP_PRESSED = [
  "0000000000000000",
  "0555555555555570",
  "0577777777777790",
  "0577777777777790",
  "0577777777777790",
  "0577777777777790",
  "0577777007777790",
  "0577770000777790",
  "0577700000077790",
  "0577000000007790",
  "0577777777777790",
  "0577777777777790",
  "0577777777777790",
  "0577777777777790",
  "0799999999999990",
  "0000000000000000",
];

const SCROLL_UP_DIMMED = [
  "0000000000000000",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeee88eeeeee0",
  "0eeeee8888eeeee0",
  "0eeee888888eeee0",
  "0eee88888888eee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0555555555555550",
];

const SCROLL_DOWN = [
  "0000000000000000",
  "0fffffffffffffd0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0fdd00000000ddb0",
  "0fddd000000dddb0",
  "0fdddd0000ddddb0",
  "0fddddd00dddddb0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0fddddddddddddb0",
  "0dbbbbbbbbbbbbb0",
  "0000000000000000",
];

// Not captured: the pressed up arrow with the down arrow's triangle.

const SCROLL_DOWN_PRESSED = [
  "0000000000000000",
  "0555555555555570",
  "0577777777777790",
  "0577777777777790",
  "0577777777777790",
  "0577777777777790",
  "0577000000007790",
  "0577700000077790",
  "0577770000777790",
  "0577777007777790",
  "0577777777777790",
  "0577777777777790",
  "0577777777777790",
  "0577777777777790",
  "0799999999999990",
  "0000000000000000",
];

const SCROLL_DOWN_DIMMED = [
  "0555555555555550",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eee88888888eee0",
  "0eeee888888eeee0",
  "0eeeee8888eeeee0",
  "0eeeeee88eeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0eeeeeeeeeeeeee0",
  "0000000000000000",
];

const SCROLL_THUMB = [
  "0000000000000000",
  "0eqqqqqqqqqqqqp0",
  "0qppppppppppppm0",
  "0qppppppppppppm0",
  "0qppeqqqqqqpppm0",
  "0qppplllllllppm0",
  "0qppeqqqqqqpppm0",
  "0qppplllllllppm0",
  "0qppeqqqqqqpppm0",
  "0qppplllllllppm0",
  "0qppeqqqqqqpppm0",
  "0qppplllllllppm0",
  "0qppppppppppppm0",
  "0qppppppppppppm0",
  "0qppppppppppppm0",
  "0pmmmmmmmmmmmmm0",
  "0000000000000000",
];

const SCROLL_THUMB_PRESSED = [
  "0000000000000000",
  "0qppppppppppppm0",
  "0pmmmmmmmmmmmml0",
  "0pmmmmmmmmmmmml0",
  "0pmmqppppppmmml0",
  "0pmmmnnnnnnnmml0",
  "0pmmqppppppmmml0",
  "0pmmmnnnnnnnmml0",
  "0pmmqppppppmmml0",
  "0pmmmnnnnnnnmml0",
  "0pmmqppppppmmml0",
  "0pmmmnnnnnnnmml0",
  "0pmmmmmmmmmmmml0",
  "0pmmmmmmmmmmmml0",
  "0pmmmmmmmmmmmml0",
  "0mlllllllllllll0",
  "0000000000000000",
];

const SCROLL_TRACK = [
  "07777777777777c0",
  "0788888888888bc0",
  "078aaaaaaaaaabc0",
];

// ---- pop-up button (Keyboard, "Script:"), 19 rows --------------------
// 4 | 1 | 22 columns: the right slice is the arrow section, starting at
// its separator. Pressed, only the arrow section changes — the menu
// covers the rest (and its outline and shadow are in this capture).

const POPUP = [
  "..20000000000000000000002..",
  ".0fffdddddddddddddddddddb0.",
  "2fdddadfffffffffffffffffda2",
  "0fdddadfdddddddddddddddda70",
  "0fdddadfddddddd0dddddddda70",
  "0fdddadfdddddd000ddddddda70",
  "0fdddadfddddd00000dddddda70",
  "0fdddadfdddd0000000ddddda70",
  "0fdddadfdddddddddddddddda70",
  "0fdddadfdddddddddddddddda70",
  "0fdddadfdddd0000000ddddda70",
  "0fdddadfddddd00000dddddda70",
  "0fdddadfdddddd000ddddddda70",
  "0fdddadfddddddd0dddddddda70",
  "0fdddadfdddddddddddddddda70",
  "0fdddadfdddddddddddddddda70",
  "2fdddaddaaaaaaaaaaaaaaaa772",
  ".0aaaab7777777777777777770.",
  "..20000000000000000000002..",
];

const POPUP_DISABLED = [
  "..88888888888888888888888..",
  ".8dddaddddddddddddddddddd8.",
  "8ddddadddddddddddddddddddd8",
  "8ddddadddddddddddddddddddd8",
  "8ddddaddddddddd8dddddddddd8",
  "8ddddadddddddd888ddddddddd8",
  "8ddddaddddddd88888dddddddd8",
  "8ddddadddddd8888888ddddddd8",
  "8ddddadddddddddddddddddddd8",
  "8ddddadddddddddddddddddddd8",
  "8ddddadddddd8888888ddddddd8",
  "8ddddaddddddd88888dddddddd8",
  "8ddddadddddddd888ddddddddd8",
  "8ddddaddddddddd8dddddddddd8",
  "8ddddadddddddddddddddddddd8",
  "8ddddadddddddddddddddddddd8",
  "8ddddadddddddddddddddddddd8",
  ".8dddaddddddddddddddddddd8.",
  "..88888888888888888888888..",
];

const POPUP_PRESSED = [
  "00000000000000000002..",
  "044444444444444444440.",
  "0255555555555555555682",
  "0256666666666666666780",
  "0256666666f66666666780",
  "025666666fff6666666780",
  "02566666fffff666666780",
  "0256666fffffff66666780",
  "0256666666666666666780",
  "0256666666666666666780",
  "0256666fffffff66666780",
  "02566666fffff666666780",
  "025666666fff6666666780",
  "0256666666f66666666780",
  "0256666666666666666780",
  "0256666666666666666780",
  "0267777777777777777882",
  "028888888888888888880.",
  "22000000000000000002..",
];

// ---- bevel buttons (Monitors & Sound), 40 x 40 as a 3 | 1 | 3 slice --
// The icon sits on the face; "selected" is the pushed-in pane button.

const BEVEL = [
  ".00000.",
  "0fdddb0",
  "0dffc80",
  "0dfda80",
  "0dca880",
  "0b88850",
  ".00000.",
];

const BEVEL_SELECTED = [
  ".00000.",
  "0444470",
  "0455790",
  "0457890",
  "0478890",
  "0799990",
  ".00000.",
];

// Dimmed default button — not captured: the dimmed button inside a
// ring drawn the way dimmed controls are (88 outline on the flat face).
const dimRing = (px: string): string =>
  px.replace(/[^.02]/g, "d").replace(/[02]/g, "8");
const BUTTON_DEFAULT_DISABLED = BUTTON_DEFAULT.map((row, y) =>
  y >= 3 && y < 23
    ? dimRing(row.slice(0, 3)) + BUTTON_DISABLED[y - 3]!.replace(/\./g, "d") +
      dimRing(row.slice(12))
    : dimRing(row));

/** Name → grid, published as --pt-sprite-<name> by spriteCss(). */
export const CONTROL_SPRITES: Record<string, readonly string[]> = {
  button: BUTTON,
  "button-pressed": BUTTON_PRESSED,
  "button-disabled": BUTTON_DISABLED,
  "button-default": BUTTON_DEFAULT,
  "button-default-pressed": BUTTON_DEFAULT_PRESSED,
  "button-default-disabled": BUTTON_DEFAULT_DISABLED,
  checkbox: CHECKBOX,
  "checkbox-on": CHECKBOX_ON,
  "checkbox-pressed": CHECKBOX_PRESSED,
  "checkbox-on-pressed": CHECKBOX_ON_PRESSED,
  "checkbox-dimmed": CHECKBOX_DIMMED,
  "checkbox-on-dimmed": CHECKBOX_ON_DIMMED,
  "slider-track": SLIDER_TRACK,
  "slider-track-dimmed": SLIDER_TRACK_DIMMED,
  "slider-thumb": SLIDER_THUMB,
  "slider-thumb-pressed": SLIDER_THUMB_PRESSED,
  "slider-thumb-dimmed": SLIDER_THUMB_DIMMED,
  // One tick per 25px tile: the ticks under a 100-step slider.
  "slider-ticks": SLIDER_TICK.map((r) => r.padEnd(25, ".")),
  "scroll-up": SCROLL_UP,
  "scroll-up-pressed": SCROLL_UP_PRESSED,
  "scroll-up-dimmed": SCROLL_UP_DIMMED,
  "scroll-down": SCROLL_DOWN,
  "scroll-down-pressed": SCROLL_DOWN_PRESSED,
  "scroll-down-dimmed": SCROLL_DOWN_DIMMED,
  "scroll-thumb": SCROLL_THUMB,
  "scroll-thumb-pressed": SCROLL_THUMB_PRESSED,
  "scroll-track-top": SCROLL_TRACK.slice(0, 2),
  "scroll-track": SCROLL_TRACK.slice(2),
  popup: POPUP,
  "popup-disabled": POPUP_DISABLED,
  "popup-pressed": POPUP.map((r, y) => r.slice(0, 5) + POPUP_PRESSED[y]!),
  bevel: BEVEL,
  "bevel-selected": BEVEL_SELECTED,
};
