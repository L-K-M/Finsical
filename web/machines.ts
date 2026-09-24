// Machine "cases" drawn around the tank. Each entry is a rendered
// image with a cut-out screen, layered over the aquarium so the art's
// baked-in reflections stay on top of the water. The window mask
// follows the image's own alpha — silhouette AND any genuine holes
// (handle recesses, air gaps) — except the screen aperture, which the
// native shell fills back in so the tank can show through the glass.
//
// viewBox units are the cropped image's pixels. `hole` is the glass
// aperture: where the black screen backplate sits and which part of
// the silhouette the mask fills. `sx/sy/sw/sh` is the tank itself —
// the 1.6-aspect aquarium letterboxed inside the glass.

/** A rounded rect in viewBox units — a building block of the window
 * silhouette. The native shell unions these into a CGPath layer mask,
 * so the window's visible shape can be irregular (stepped bases,
 * protruding chins), not just a rounded rect. */
export interface ShapeRect {
  x: number; y: number; w: number; h: number; r: number;
}

/** How far #screenback extends past `hole`, in viewBox units — covers
 * a few px of translucent glass rim that can outrun the measured
 * aperture. Must stay under every machine's clearance to the nearest
 * see-through pixel (>= 44px as of the current art). */
export const SCREENBACK_HOLE_PAD = 32;

export interface Machine {
  id: string;
  name: string;
  blurb: string;
  vbW: number; vbH: number;
  sx: number; sy: number;   // screen rect origin in viewBox units
  sw: number; sh: number;   // screen rect size — a 1.6 aspect
  shape: ShapeRect[];       // window silhouette — for image machines
                            // it's only a fallback: the image's own
                            // alpha becomes the window mask
  hole?: ShapeRect;         // screen glass aperture — backplate + the
                            // part of the silhouette the mask refills.
                            // `r` is unused — the refill is a sharp
                            // rect on both platforms.
  image?: string;           // raster shell asset under web/ — when set,
                            // its alpha IS the silhouette
  svg: string;              // inner markup for the shell <svg>
                            // (empty for image machines)
}

/** The shell svg's inner markup — vector art, or the raster image
 * stretched to the viewBox. preserveAspectRatio="none" matters: the
 * native mask stretches the same image to the window, so both must
 * use identical (stretch) semantics or silhouette and art misalign. */
export function shellMarkup(m: Machine): string {
  if (m.image)
    return `<image href="${m.image}" x="0" y="0" ` +
      `width="${m.vbW}" height="${m.vbH}" ` +
      `preserveAspectRatio="none"/>`;
  return m.svg;
}

// Preview palette mirrors the live tank in main.ts — a machine should
// preview as a running Finsical, not an empty screen.
const PV_WATER_TOP = "#2e7fc4", PV_WATER_BOT = "#14508c";
const PV_GRAVEL = "#8a6d3b", PV_FISH = "#e8a33d", PV_EYE = "#1a1a2e";
const PV_BUBBLE = "#cfe8ff", PV_BACKPLATE = "#050505"; // #screenback

/** The shell over a still of the tank — the prefs machine picker shows
 * each case as a running aquarium: black backplate behind the glass,
 * water + gravel + a few placeholder swimmers inside the screen rect,
 * and the shell art last so its baked-in reflections ride on top. */
export function previewMarkup(m: Machine): string {
  const k = m.sw / 320; // logical tank px (320×200) → viewBox units
  const tx = (x: number) => m.sx + x * k;
  const ty = (y: number) => m.sy + y * k;
  const parts: string[] = [];
  // Backplate — the letterbox matte around the tank. Padded like the
  // live #screenback: the art's translucent glass rim runs a few px
  // past the measured hole and would otherwise show the page behind.
  if (m.hole) {
    const pad = SCREENBACK_HOLE_PAD;
    parts.push(`<rect x="${m.hole.x - pad}" y="${m.hole.y - pad}"` +
      ` width="${m.hole.w + pad * 2}" height="${m.hole.h + pad * 2}"` +
      ` fill="${PV_BACKPLATE}"/>`);
  }
  parts.push(
    // ids are document-global across inline SVGs — suffix per machine
    `<defs><linearGradient id="pvwater-${m.id}" x1="0" y1="0" x2="0" y2="1">` +
      `<stop offset="0" stop-color="${PV_WATER_TOP}"/>` +
      `<stop offset="1" stop-color="${PV_WATER_BOT}"/>` +
      `</linearGradient></defs>`,
    `<rect x="${m.sx}" y="${m.sy}" width="${m.sw}" height="${m.sh}"` +
      ` fill="url(#pvwater-${m.id})"/>`,
    // Gravel strip — the tank's bottom 12 logical px, anchored to the
    // screen bottom (screen rects are ~16:10 but not exactly).
    `<rect x="${m.sx}" y="${m.sy + m.sh - 12 * k}" width="${m.sw}"` +
      ` height="${12 * k}" fill="${PV_GRAVEL}"/>`);
  // Placeholder swimmers — drawPlaceholder's rects, mirrored to face.
  const fish = (x: number, y: number, facing: 1 | -1, s = 1): string =>
    `<g transform="translate(${tx(x)} ${ty(y)})` +
    ` scale(${-facing * k * s} ${k * s})" fill="${PV_FISH}">` +
    `<rect x="-8" y="-4" width="14" height="8"/>` +
    `<rect x="6" y="-6" width="6" height="12"/>` +
    `<rect x="-2" y="-7" width="6" height="3"/>` +
    `<rect x="-6" y="-2" width="2" height="2" fill="${PV_EYE}"/></g>`;
  parts.push(fish(84, 78, 1), fish(238, 108, -1), fish(158, 52, 1, 0.7));
  const bubbles = [[252, 66], [255, 55], [253, 44]]
    .map(([x, y]) => `<rect x="${tx(x!)}" y="${ty(y!)}"` +
      ` width="${2 * k}" height="${2 * k}"/>`).join("");
  parts.push(`<g fill="${PV_BUBBLE}">${bubbles}</g>`);
  parts.push(shellMarkup(m));
  return parts.join("");
}

// All renders: user-supplied art cropped to alpha bounds; hole and
// screen rects measured from the image's own pixels.

const plus: Machine = {
  id: "plus", name: "Macintosh Plus",
  blurb: "The classic platinum compact — reflections ride over the water.",
  vbW: 821, vbH: 1059,
  hole: { x: 102, y: 129, w: 618, h: 451, r: 0 },
  sx: 110, sy: 167, sw: 602, sh: 376,
  image: "assets/macintosh-plus.png",
  shape: [{ x: 0, y: 0, w: 821, h: 1059, r: 0 }],
  svg: "",
};

const performa: Machine = {
  id: "performa", name: "Macintosh Performa 450",
  blurb: "A pizza-box desktop under an Apple RGB monitor.",
  vbW: 1013, vbH: 1013,
  hole: { x: 135, y: 99, w: 745, h: 541, r: 0 },
  sx: 135, sy: 137, sw: 745, sh: 466,
  image: "assets/performa-450.png",
  shape: [{ x: 0, y: 0, w: 1013, h: 1013, r: 0 }],
  svg: "",
};

const performa2: Machine = {
  id: "performa-2", name: "Macintosh Performa 450 (II)",
  blurb: "Another take on the pizza box — angled, vents showing.",
  vbW: 1132, vbH: 1010,
  hole: { x: 294, y: 113, w: 688, h: 538, r: 0 },
  sx: 294, sy: 167, sw: 688, sh: 430,
  image: "assets/performa-450-2.png",
  shape: [{ x: 0, y: 0, w: 1132, h: 1010, r: 0 }],
  svg: "",
};

const tam: Machine = {
  id: "tam", name: "20th Anniversary Mac",
  blurb: "The Bose stereo with a screen in it.",
  vbW: 1161, vbH: 1161,
  hole: { x: 266, y: 59, w: 630, h: 452, r: 0 },
  sx: 274, sy: 93, sw: 614, sh: 384,
  image: "assets/tam.png",
  shape: [{ x: 0, y: 0, w: 1161, h: 1161, r: 0 }],
  svg: "",
};

const bondi: Machine = {
  id: "imac-bondi", name: "iMac G3 (Bondi)",
  blurb: "The teal translucent bubble.",
  vbW: 1241, vbH: 1035,
  hole: { x: 379, y: 175, w: 685, h: 538, r: 0 },
  sx: 387, sy: 235, sw: 669, sh: 418,
  image: "assets/imac-bondi.png",
  shape: [{ x: 0, y: 0, w: 1241, h: 1035, r: 0 }],
  svg: "",
};

const bondi2: Machine = {
  id: "imac-bondi-2", name: "iMac G3 (Bondi II)",
  blurb: "Another take on the teal bubble — clearer glass.",
  vbW: 1245, vbH: 1037,
  hole: { x: 185, y: 179, w: 665, h: 531, r: 0 },
  sx: 193, sy: 242, sw: 649, sh: 406,
  image: "assets/imac-bondi-2.png",
  shape: [{ x: 0, y: 0, w: 1245, h: 1037, r: 0 }],
  svg: "",
};

const strawberry: Machine = {
  id: "imac-strawberry", name: "iMac G3 (Strawberry)",
  blurb: "The red bubble.",
  vbW: 1189, vbH: 1003,
  hole: { x: 357, y: 171, w: 675, h: 515, r: 0 },
  sx: 365, sy: 223, sw: 659, sh: 412,
  image: "assets/imac-strawberry.png",
  shape: [{ x: 0, y: 0, w: 1189, h: 1003, r: 0 }],
  svg: "",
};

const strawberry2: Machine = {
  id: "imac-strawberry-2", name: "iMac G3 (Strawberry II)",
  blurb: "Another take on the red bubble.",
  vbW: 1207, vbH: 1013,
  hole: { x: 164, y: 173, w: 675, h: 517, r: 0 },
  sx: 172, sy: 226, sw: 659, sh: 412,
  image: "assets/imac-strawberry-2.png",
  shape: [{ x: 0, y: 0, w: 1207, h: 1013, r: 0 }],
  svg: "",
};

const flowerPower: Machine = {
  id: "imac-flower-power", name: "iMac G3 (Flower Power)",
  blurb: "The special edition with daisies on the shell.",
  vbW: 1190, vbH: 1009,
  hole: { x: 350, y: 180, w: 679, h: 521, r: 0 },
  sx: 358, sy: 234, sw: 663, sh: 414,
  image: "assets/imac-flower-power.png",
  shape: [{ x: 0, y: 0, w: 1190, h: 1009, r: 0 }],
  svg: "",
};

const flowerPower2: Machine = {
  id: "imac-flower-power-2", name: "iMac G3 (Flower Power II)",
  blurb: "Another take on the daisy shell.",
  vbW: 1203, vbH: 1025,
  hole: { x: 168, y: 187, w: 673, h: 520, r: 0 },
  sx: 176, sy: 242, sw: 657, sh: 411,
  image: "assets/imac-flower-power-2.png",
  shape: [{ x: 0, y: 0, w: 1203, h: 1025, r: 0 }],
  svg: "",
};

const powerbookG3: Machine = {
  id: "powerbook-g3", name: "PowerBook G3",
  blurb: "The black PowerPC notebook.",
  vbW: 1072, vbH: 994,
  hole: { x: 317, y: 60, w: 705, h: 499, r: 0 },
  sx: 317, sy: 89, sw: 705, sh: 441,
  image: "assets/powerbook-g3.png",
  shape: [{ x: 0, y: 0, w: 1072, h: 994, r: 0 }],
  svg: "",
};

const ibook: Machine = {
  id: "ibook-tangerine", name: "iBook (Tangerine)",
  blurb: "The orange clamshell.",
  vbW: 1284, vbH: 1161,
  hole: { x: 423, y: 120, w: 714, h: 495, r: 0 },
  sx: 423, sy: 144, sw: 714, sh: 446,
  image: "assets/ibook-tangerine.png",
  shape: [{ x: 0, y: 0, w: 1284, h: 1161, r: 0 }],
  svg: "",
};

const imacg4: Machine = {
  id: "imacg4", name: "iMac G4",
  blurb: "The sunflower — dome base, chrome arm, floating panel.",
  vbW: 1022, vbH: 1246,
  hole: { x: 91, y: 95, w: 841, h: 537, r: 0 },
  sx: 99, sy: 106, sw: 825, sh: 516,
  image: "assets/imac-g4.png",
  shape: [{ x: 0, y: 0, w: 1022, h: 1246, r: 0 }],
  svg: "",
};

const bare: Machine = {
  id: "bare", name: "Bare tank",
  blurb: "No case — just the water, edge to edge.",
  vbW: 320, vbH: 200, sx: 0, sy: 0, sw: 320, sh: 200,
  shape: [{ x: 0, y: 0, w: 320, h: 200, r: 0 }],
  svg: "",
};

export const MACHINES: readonly Machine[] =
  [plus, performa, performa2, tam, bondi, bondi2, strawberry, strawberry2,
   flowerPower, flowerPower2, powerbookG3, ibook, imacg4, bare];
export const DEFAULT_MACHINE = "plus";
export function machineById(id: string): Machine | undefined {
  return MACHINES.find((m) => m.id === id);
}
