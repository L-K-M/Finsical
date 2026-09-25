/**
 * CRT post-process. The tank still renders at its logical 320×200 into
 * the 2D canvas; when enabled, that bitmap is re-drawn every frame at
 * the display's device resolution through a shader emulating an
 * aperture-grille tube:
 *  - scanlines locked to logical game rows (they follow the warped,
 *    letterboxed image, not fixed screen stripes)
 *  - horizontal beam smear (CRTs blur along the scan, not across lines)
 *  - phosphor bloom that over-emphasizes bright colors, plus wider
 *    glass halation, both smooth blurs
 *  - R/B misconvergence that grows toward the screen edges
 *  - RGB grille stripes at device-pixel pitch, so the mask is far finer
 *    than the game pixels
 *  - gentle barrel curvature, corner vignette, flicker + rolling band,
 *    faint grain
 *  - service-menu geometry: raster skew and a perspective keystone
 * The beam smear runs first, once per game row, into an offscreen
 * target as wide as the raster's device px, and the bloom and halation
 * blur the frame at game size or below; the tube pass then reads the
 * finished rows and glow instead of recomputing them every device px.
 * WebGL setup failure returns null and the plain pixelated path stays.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

// Shared by both passes: precision, the tank frame and its samplers.
const COMMON = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uTex;
uniform vec2 uTank;   // logical resolution (320x200)

// Device px per game px, set at the top of each pass's main().
vec2 pxScale;

// Sharp-bilinear: the texel center nearest to x, except within one
// device px of a texel boundary, where it fades to the neighbor. Pure
// nearest would leave uneven texel widths and moire at fractional
// scales and under curvature.
float sharpCoord(float x, float size, float scale) {
  float p = clamp(x, 0.5, size - 0.5) - 0.5;
  float i = floor(p);
  return i + 0.5 + clamp((p - i - 0.5) * scale + 0.5, 0.0, 1.0);
}

// Game pixel color at lp. Rows sample sharp, so the linear texture
// filter interpolates along the scan but never between rows: every
// horizontal effect stays within its own scanline.
vec3 gamePx(vec2 lp) {
  lp.y = sharpCoord(lp.y, uTank.y, pxScale.y);
  vec2 t = clamp(lp, vec2(0.5), uTank - 0.5) / uTank;
  return texture2D(uTex, t).rgb;
}

// The game pixel under lp, sharp in both directions.
vec3 texelAt(vec2 lp) {
  return gamePx(vec2(sharpCoord(lp.x, uTank.x, pxScale.x), lp.y));
}
`;

// Rows pass: the beam's smear along each scanline, computed once per
// game row into a target one texel row per game row and uCols texels
// wide (the raster's device width), instead of once per device px.
const ROWS_FRAG = COMMON + `
uniform float uSoft;  // horizontal beam smear (0 = sharp pixels)
uniform float uCols;  // columns drawn

void main() {
  pxScale = vec2(uCols / uTank.x, 1.0);
  // The target is uTank.y rows tall, so gl_FragCoord.y is a row center.
  vec2 lp = vec2(gl_FragCoord.x / pxScale.x, gl_FragCoord.y);

  // Horizontal beam smear: a 9-tap gaussian along the scan. The first
  // 40% of the slider fades in a beam about one game px wide (sigma
  // ~0.9 px); beyond that the beam itself widens, to 2.5x at the top.
  vec3 sharp = texelAt(lp);
  vec3 c = sharp;
  float soft = 2.5 * uSoft;
  if (soft > 0.0) {
    float pitch = 0.55 * max(soft, 1.0); // tap spacing in game px
    vec3 sum = gamePx(lp);
    float total = 1.0;
    for (int i = 1; i <= 4; i++) {
      float w = exp(-0.18 * float(i * i));
      vec2 o = vec2(pitch * float(i), 0.0);
      sum += (gamePx(lp - o) + gamePx(lp + o)) * w;
      total += 2.0 * w;
    }
    c = mix(sharp, sum / total, min(soft, 1.0));
  }
  gl_FragColor = vec4(c, 1.0);
}
`;

// Glow passes: one direction of a separable gaussian blur of the tank
// frame, at game resolution or below. The tube pass reads the result
// once per device px as the phosphor bloom and the glass halation.
const GLOW_FRAG = `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D uSrc;
uniform vec2 uSrcSize;  // source size in texels
uniform float uScale;   // source texels per target texel (2 = halved)
uniform vec2 uStep;     // source texels between taps, along the blur
uniform float uSigma;   // gaussian sigma, in taps
// 1 weights each texel by its brightest channel before blurring, so
// only bright colors bloom (the bloom's bright pass); 0 blurs as is.
uniform float uBrightPass;

void main() {
  // At uScale 2 the target texel center lands on the corner of a 2x2
  // block, so the linear filter averages the block as it downsamples.
  vec2 p = gl_FragCoord.xy * uScale;
  vec3 sum = vec3(0.0);
  float total = 0.0;
  for (int i = -8; i <= 8; i++) {
    float w = exp(-0.5 * float(i * i) / (uSigma * uSigma));
    vec3 s = texture2D(uSrc, (p + uStep * float(i)) / uSrcSize).rgb;
    s *= mix(1.0, max(s.r, max(s.g, s.b)), uBrightPass);
    sum += s * w;
    total += w;
  }
  gl_FragColor = vec4(sum / total, 1.0);
}
`;

const FRAG = COMMON + `
uniform sampler2D uRows; // the rows pass's smeared scanlines
uniform sampler2D uBloomTex; // bright pass, blurred: phosphor bloom
uniform sampler2D uHaloTex;  // whole frame, blurred wider: halation
uniform float uCols;  // columns drawn
uniform float uColsMax; // the rows texture's width
uniform vec4 uRect;   // letterboxed tank rect in buffer px, y-up
// Flicker, rolling-band and grain phases, each pre-wrapped on the CPU
// (mod 2π for the sin() args, mod 1 for the hash). Wrapping the raw
// clock instead made every sin(uTime*k) jump once per wrap — a visible
// flicker blink — and an unwrapped clock loses mediump precision.
uniform vec3 uPhase;
uniform float uScan;  // gap darkness between rows (0 = off, 1 = black)
uniform float uBloom; // bright bleed strength
uniform float uOver;  // bright-color overdrive
uniform float uConv;  // R/B misconvergence, edge-weighted
uniform float uGrill; // RGB mask strength (0 = invisible stripes)
uniform float uCurve; // barrel warp
uniform float uVig;   // edge/corner dimming
uniform float uFlick; // brightness shimmer
uniform float uGrain; // analog noise
uniform float uBright;// picture brightness gain (0.5 = neutral)
uniform float uContr; // picture contrast around mid level
uniform float uZoom;  // overscan crop (0 = full raster)
uniform float uHSize; // raster width pot (0.5 = neutral)
uniform float uVSize; // raster height pot (0.5 = neutral)
uniform float uSkew;  // raster shear pot (0.5 = square)
uniform float uPersp; // horizontal keystone (0.5 = head-on)
uniform float uRed;   // per-channel gain trims
uniform float uGreen;
uniform float uBlue;
uniform float uPower; // 1 = settled; <1 = power-on/off in progress
uniform float uDegauss; // degauss wobble amplitude (0 = settled)

// The smeared scanline signal at lp. Like gamePx, rows sample sharp:
// the linear filter blends columns, and rows only across the one
// device px where they meet.
vec3 rowPx(vec2 lp) {
  // Divide before scaling up: lp.x * uCols alone can pass mediump's
  // 2^14 range where highp is missing.
  float x = clamp(lp.x / uTank.x * uCols, 0.5, uCols - 0.5);
  float y = sharpCoord(lp.y, uTank.y, pxScale.y);
  return texture2D(uRows, vec2(x / uColsMax, y / uTank.y)).rgb;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uRect.xy) / uRect.zw;
  // Overscan and the size pots below scale the raster up; the
  // keystone corrects this per fragment below, while skew (a pure
  // shear — area-preserving), curvature and the warm-up squeeze are
  // left out of the estimate. crtRowColumns() mirrors the x term.
  pxScale = uRect.zw / uTank * (1.0 + 0.12 * uZoom) *
            vec2(0.75 + 0.5 * uHSize, 0.75 + 0.5 * uVSize);

  // gc is the position on the glass — vignette and misconvergence
  // follow the tube, not the raster.
  vec2 gc = uv * 2.0 - 1.0;
  // Overscan: real sets run the raster slightly past the glass, so a
  // little crop is authentic. Crop in raster space, BEFORE the warp —
  // the crop stays uniform and the curved black corners survive.
  uv = (uv - 0.5) / (1.0 + 0.12 * uZoom) + 0.5;
  // Front-panel size pots stretch or shrink the raster inside the
  // glass — before the warp, so a shrunken raster's matte edge still
  // bows with the tube. 0.75–1.25 is a service-adjustment range.
  uv = (uv - 0.5) / vec2(0.75 + 0.5 * uHSize,
                         0.75 + 0.5 * uVSize) + 0.5;
  // Geometry pots, still in raster space so the warped matte edges
  // bow with the tube. Skew slides the top edge sideways, leaning
  // the raster into a parallelogram. Perspective is a horizontal
  // keystone — the sample window compresses toward the receding
  // edge and opens toward the looming one, so the raster reads as
  // swung on its stand. Both are centered: 0.5 leaves uv alone.
  uv.x -= (uSkew - 0.5) * 0.5 * (uv.y - 0.5);
  float depth = 1.0 - (uPersp - 0.5) * 1.2 * (uv.x - 0.5);
  uv = (uv - 0.5) / depth + 0.5;
  // The keystone magnifies texels per axis: y by depth, and x by
  // depth squared — depth itself varies with x, so the columns
  // converge on top of the divide. The sharp-bilinear blend width
  // tracks the warp per axis.
  pxScale *= vec2(depth * depth, depth);
  // Power-on: a real tube lights as a bright line at the vertical
  // center that opens into the full raster. Pixels outside the
  // opening band stay black; inside it the whole raster squeezes in.
  float open = (uPower >= 1.0) ? 1.0 : max(pow(uPower, 0.55), 0.015);
  if (open < 1.0) {
    if (abs(uv.y - 0.5) > open * 0.5) {
      gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      return;
    }
    uv.y = (uv.y - 0.5) / open + 0.5;
  }
  // Barrel curve: sample positions bow outward like curved tube glass.
  vec2 cc = uv * 2.0 - 1.0;
  uv = (cc * (1.0 + (0.10 * uCurve) * dot(cc, cc))) * 0.5 + 0.5;
  // Degauss: the coil's field rings the raster side to side — rows
  // shear along a scrolling sine that dies out with uDegauss. Before
  // the bounds check, so a strong swing pushes texels off the matte.
  // uPhase.x already carries t*61 wrapped mod 2π — sin is periodic,
  // so the wrap is seamless for the scroll.
  uv.x += sin(uv.y * 40.0 + uPhase.x) * 0.008 * uDegauss;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Logical game pixel under this output pixel (post-warp).
  vec2 lp = uv * uTank;

  // The scanline, already smeared along the scan by the rows pass.
  vec3 c = rowPx(lp);

  // Misconvergence: the outer electron guns never land perfectly —
  // red drifts left and blue right, growing from zero at the center
  // toward the edges. Green stays as the reference beam.
  float conv = (1.2 * uConv) * length(gc) * (1.0 + 6.0 * uDegauss);
  if (conv > 0.001) {
    // Blend, don't overwrite — a hard swap would strip the beam smear
    // from r/b and leave them crisper than green.
    float k = clamp(conv * 2.5, 0.0, 1.0);
    c.r = mix(c.r, gamePx(lp - vec2(conv, 0.0)).r, k);
    c.b = mix(c.b, gamePx(lp + vec2(conv, 0.0)).b, k);
  }

  // Phosphor bloom: bright areas bleed wider and overdrive, mostly
  // along the scan. Halation: light scattered inside the faceplate
  // glass reaches further, a wider, fainter halo all around. Both are
  // smooth blurs from the glow passes, so a small bright shape glows
  // rather than casting sharp copies of itself.
  if (uBloom > 0.0) {
    vec2 t = lp / uTank;
    c += texture2D(uBloomTex, t).rgb * (0.60 * uBloom);
    c += texture2D(uHaloTex, t).rgb * (0.10 * uBloom);
  }
  c *= 1.0 + (0.60 * uOver) * smoothstep(0.5, 1.0, max(c.r, max(c.g, c.b)));

  // Scanlines ride the logical-row phase: sin² dips at row boundaries.
  // (pow() is undefined for negative bases — square explicitly.)
  float scan = sin(3.14159265 * lp.y);
  scan *= scan;
  c *= mix(1.0 - uScan, 1.0, scan);

  // Aperture grille: one RGB channel per device-pixel column.
  float stripe = mod(floor(gl_FragCoord.x), 3.0);
  vec3 mask = vec3(0.72);
  if (stripe < 0.5) mask.r = 1.0;
  else if (stripe < 1.5) mask.g = 1.0;
  else mask.b = 1.0;
  c *= mix(vec3(1.0), mask * 1.18, uGrill); // 1.18 compensates dimming

  // Glass vignette, faint flicker (plus a slow rolling brightness
  // band — the beam never sits perfectly in sync), and grain.
  c *= 1.0 - (0.40 * uVig) * dot(gc, gc);
  c *= 1.0 + (0.05 * uFlick) * sin(uPhase.x)
           + (0.03 * uFlick) * sin(uv.y * 3.0 - uPhase.y);
  c += (hash(gl_FragCoord.xy + uPhase.z) - 0.5) * (0.10 * uGrain);

  // Front-panel picture controls, last: contrast pivots around the
  // picture's mid level, brightness is a master gain, and each channel
  // gets an independent trim like a service-menu gun adjustment.
  c = (c - 0.40) * (0.55 + 0.90 * uContr) + 0.40;
  c *= 0.5 + uBright;
  c *= vec3(0.6 + 0.8 * uRed, 0.6 + 0.8 * uGreen, 0.6 + 0.8 * uBlue);
  // The collapsed line burns hot and settles as the raster opens:
  // the boost tracks openness, so total emitted light stays roughly
  // constant through warm-up instead of flashing mid-animation.
  c *= 1.0 + 2.0 * (1.0 - open);
  // The degauss field brightens the whole raster a touch while it rings.
  c *= 1.0 + 0.25 * uDegauss;

  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}
`;

/** Tunable CRT traits, all normalized 0–1. The shader multiplies each
 * by a tuned ceiling, so 1.0 is "authentic" rather than "clipped". */
export interface CrtConfig {
  /** Darkness of the gaps between game-pixel rows. */
  scanlines: number;
  /** How much the beam smears color sideways along each scan. Up to
   * 0.4 the smear fades in at a fixed width; above, it widens. */
  softening: number;
  /** Bright colors bleeding into their neighbors. */
  bloom: number;
  /** Extra punch on already-bright colors. */
  overdrive: number;
  /** Red/blue fringing that grows toward the screen edges. */
  misconvergence: number;
  /** Visibility of the fine vertical RGB stripes. */
  grille: number;
  /** Bow of the image, like curved tube glass. */
  curvature: number;
  /** Dimming toward the screen edges and corners. */
  vignette: number;
  /** Faint brightness shimmer as the beam scans. */
  flicker: number;
  /** Subtle analog noise over the image. */
  grain: number;
  /** Master picture gain — 0.5 is neutral. */
  brightness: number;
  /** Bright/dark separation — 0.5 is neutral. */
  contrast: number;
  /** Edge crop like real overscan — 0 shows the full raster. */
  zoom: number;
  /** Raster width inside the glass — 0.5 is neutral. */
  hsize: number;
  /** Raster height inside the glass — 0.5 is neutral. */
  vsize: number;
  /** Sideways lean of the raster — 0.5 is square. */
  skew: number;
  /** Keystone warp, the raster swung about its vertical axis —
   * 0.5 faces the viewer. */
  perspective: number;
  /** Per-channel trims — 0.5 is neutral on each. */
  red: number;
  green: number;
  blue: number;
}

export const CRT_DEFAULTS: Readonly<CrtConfig> = Object.freeze<CrtConfig>({
  scanlines: 0.40, softening: 0.40, bloom: 0.50, overdrive: 0.50,
  misconvergence: 0.35, grille: 1.0, curvature: 0.45, vignette: 0.35,
  flicker: 0.30, grain: 0.30,
  brightness: 0.50, contrast: 0.50, zoom: 0.0,
  hsize: 0.50, vsize: 0.50, skew: 0.50, perspective: 0.50,
  red: 0.50, green: 0.50, blue: 0.50,
});

/** The retired `beam` key spanned only today's lower 40% of
 * `softening`; stored configs convert so their look is unchanged. */
const LEGACY_BEAM_SCALE = 0.4;

/** Merge an untrusted source (localStorage, bus message) onto the
 * defaults: unknown keys drop, each value clamps into 0–1. A legacy
 * `beam` value converts to `softening` when that key is absent. */
export function sanitizeCrtConfig(raw: unknown): CrtConfig {
  const c = { ...CRT_DEFAULTS };
  if (raw && typeof raw === "object" && !("softening" in raw) &&
      "beam" in raw) {
    const beam = (raw as Record<string, unknown>).beam;
    if (typeof beam === "number")
      raw = { ...raw, softening: beam * LEGACY_BEAM_SCALE };
  }
  if (raw && typeof raw === "object")
    for (const k of Object.keys(c) as (keyof CrtConfig)[]) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === "number" && Number.isFinite(v))
        c[k] = Math.min(1, Math.max(0, v));
    }
  return c;
}

/** Named picture-tube setups for one-click restore in the Monitor pane. */
export interface CrtPreset {
  readonly id: string;
  readonly label: string;
  readonly blurb: string;
  readonly config: Readonly<CrtConfig>;
}

/** The Picture pane's keys: the monitor's front-panel trims, which
 * are the user's. Every other key is the tube itself. */
export const PICTURE_KEYS: readonly (keyof CrtConfig)[] = Object.freeze([
  "brightness", "contrast", "zoom",
  "hsize", "vsize", "skew", "perspective",
  "red", "green", "blue",
]);

/** What a preset sets: its tube keys only. It is picked on the Monitor
 * pane, so it leaves the Picture pane's trims alone. */
export function presetTube(p: CrtPreset): Partial<CrtConfig> {
  const out: Partial<CrtConfig> = { ...p.config };
  for (const k of PICTURE_KEYS) delete out[k];
  return out;
}

/** Full config = defaults plus overrides; frozen so a click can't mutate
 * the shared preset object. */
const withDefaults = (over: Partial<CrtConfig>): Readonly<CrtConfig> =>
  Object.freeze({ ...CRT_DEFAULTS, ...over });

export const CRT_PRESETS: readonly CrtPreset[] = Object.freeze([
  {
    id: "authentic",
    label: "Authentic",
    blurb: "The tuned defaults — a plausible consumer tube from the era.",
    config: CRT_DEFAULTS,
  },
  {
    id: "sharp",
    label: "Sharp",
    blurb: "Crisp beam and firm scanlines with grain turned down — " +
      "reads clean on a modern LCD without losing the tube.",
    config: withDefaults({
      softening: 0.10, scanlines: 0.55, misconvergence: 0.15,
      bloom: 0.40, overdrive: 0.55, grille: 0.85,
      curvature: 0.30, vignette: 0.25, flicker: 0.15, grain: 0.10,
    }),
  },
  {
    id: "soft",
    label: "Soft",
    blurb: "Lower flicker, grain, and scanlines for all-day desktop use — " +
      "the tube, without the noise.",
    config: withDefaults({
      scanlines: 0.20, softening: 0.28, bloom: 0.35, overdrive: 0.40,
      misconvergence: 0.20, grille: 0.50, curvature: 0.30,
      vignette: 0.25, flicker: 0.08, grain: 0.10,
    }),
  },
  {
    id: "pixel-perfect",
    label: "Pixel Perfect",
    blurb: "Every tube trait off — a flat-panel look while the " +
      "effect stays on.",
    config: withDefaults({
      scanlines: 0, softening: 0, bloom: 0, overdrive: 0,
      misconvergence: 0, grille: 0, curvature: 0, vignette: 0,
      flicker: 0, grain: 0,
    }),
  },
]);

/** A sub-rect of the CRT canvas as 0–1 fractions, top-down. */
export interface RasterBox { x: number; y: number; w: number; h: number; }

/** Where the neutral raster lands in a bufW×bufH buffer: `src`
 * contain-fit (like object-fit) into `box`, as the shader's uRect
 * [x, y, w, h] in buffer pixels with y up (gl_FragCoord's origin). */
export function crtRasterRect(bufW: number, bufH: number,
    srcW: number, srcH: number, box: RasterBox): [number, number, number, number] {
  const bx = box.x * bufW, bw = box.w * bufW, bh = box.h * bufH;
  const by = bufH - (box.y + box.h) * bufH; // flip to y-up
  const s = Math.min(bw / srcW, bh / srcH);
  const w = srcW * s, h = srcH * s;
  return [bx + (bw - w) / 2, by + (bh - h) / 2, w, h];
}

/** Widest rows-pass target, in texels: past this the rows are
 * resampled up, which only softens the sharp end of Softening. */
const ROW_COLS_MAX = 4096;

/** Glow blur widths in game px (gaussian sigma): the phosphor bloom
 * spreads mostly along the scan, the glass halation wider and evenly.
 * They stand in for fixed taps at ±3.5 px and ±7/±5 px, which left
 * sharp copies of small bright shapes instead of a glow. */
const BLOOM_SIGMA_X = 3;
const BLOOM_SIGMA_Y = 1.5;
const HALO_SIGMA = 4.5;

/** How many columns the rows pass draws: the raster's width in device
 * px once overscan and the width pot have magnified it (mirrors FRAG's
 * pxScale.x before the keystone), so the smeared rows keep device-px
 * detail. At least one per game px, at most `max`. */
export function crtRowColumns(rasterW: number,
    cfg: Pick<CrtConfig, "zoom" | "hsize">, tankW: number,
    max: number): number {
  const w = rasterW * (1 + 0.12 * cfg.zoom) * (0.75 + 0.5 * cfg.hsize);
  return Math.min(max, Math.max(tankW, Math.round(w)));
}

/** The degauss wobble's total length — after this degaussAmp() is 0. */
export const DEGAUSS_MS = 900;
/** Power-off collapse: raster to a hot line to black. */
export const POWEROFF_MS = 280;

/** Degauss envelope: exponential decay, snapped to 0 once inaudible —
 * a hard cutoff keeps animating from lingering on a sub-pixel wobble. */
export function degaussAmp(elapsedMs: number): number {
  if (!(elapsedMs >= 0)) return 0;
  const a = Math.exp(-elapsedMs / 180);
  return a < 0.01 ? 0 : a;
}

export interface CrtFilter {
  readonly enabled: boolean;
  /** False once the GL context is lost — the effect can't re-enable. */
  readonly usable: boolean;
  /** True while a tube animation plays (power warm-up, collapse or
   * degauss): the page must draw every frame then, not only on ticks.
   * Stays true through a collapse even after the caller's "on" flag
   * cleared — the shader still needs frames to finish the effect. */
  readonly animating: boolean;
  setEnabled(on: boolean): void;
  /** Ring the degauss coil: the raster wobbles and its color fringing
   * blooms, then settles. No-op while off or under reduced motion. */
  degauss(): void;
  /** Live-update shader params; `config` reflects the merged result. */
  configure(cfg: Partial<CrtConfig>): void;
  readonly config: CrtConfig;
  /** Where the tank sits inside the canvas — the canvas may span more
   * glass than the tank so the size pots have room to grow into. */
  setRasterBox(box: RasterBox): void;
  /** Upload the latest tank frame and re-run the shader (no-op off). */
  render(): void;
}

export function initCrt(src: HTMLCanvasElement): CrtFilter | null {
  const el = document.getElementById("crt") as HTMLCanvasElement | null;
  const ctx = el?.getContext("webgl",
    { alpha: false, antialias: false, depth: false, stencil: false });
  if (!el || !ctx) return null;
  const out = el, gl = ctx;
  // GPU reset → fall back to the plain pixelated path, not a black tank.
  // `lost` also refuses re-enable — re-adding body.crt on a dead context
  // would just hide the tank again. (Reload the page to retry.)
  let enabled = false;
  let lost = false;
  out.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    lost = true;
    enabled = false;
    offT0 = -Infinity; // a collapse in flight dies with the context
    document.body.classList.remove("crt");
  });

  const shader = (type: number, srcText: string): WebGLShader | null => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, srcText);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      console.warn("crt shader:", gl.getShaderInfoLog(s));
      return null;
    }
    return s;
  };
  const vs = shader(gl.VERTEX_SHADER, VERT);
  const link = (fragText: string): WebGLProgram | null => {
    const fs = shader(gl.FRAGMENT_SHADER, fragText);
    if (!vs || !fs) return null;
    const p = gl.createProgram()!;
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    // Both passes draw the same triangle from attribute slot 0.
    gl.bindAttribLocation(p, 0, "aPos");
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      console.warn("crt link:", gl.getProgramInfoLog(p));
      return null;
    }
    return p;
  };
  const rowsProg = link(ROWS_FRAG);
  const glowProg = link(GLOW_FRAG);
  const prog = link(FRAG);
  if (!rowsProg || !glowProg || !prog) return null;

  // Fullscreen triangle.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // Every texture keeps its own unit, so no pass ever samples the
  // texture it draws into. Unit 0 stays active: texSubImage2D in
  // render() targets it.
  const unitTexture = (unit: number): WebGLTexture => {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return t;
  };
  // An offscreen target on `unit`, or null if the GPU can't draw into
  // it (the plain path stays, as for a shader that won't compile).
  const target = (unit: number, w: number, h: number):
      WebGLFramebuffer | null => {
    const t = unitTexture(unit);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0,
      gl.RGBA, gl.UNSIGNED_BYTE, null);
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D, t, 0);
    const ok =
      gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.activeTexture(gl.TEXTURE0);
    if (!ok) console.warn("crt: an offscreen target is incomplete");
    return ok ? fbo : null;
  };

  // The tank frame, on unit 0. Linear filtering gives the smear's taps
  // a smooth beam; gamePx() samples rows sharp, so they never blend
  // into each other.
  unitTexture(0);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // gl_FragCoord y is up
  // Allocate storage once — render() updates it in place.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
    gl.UNSIGNED_BYTE, src);

  // The rows pass's target, on unit 1: one texel row per game row,
  // allocated once at full width; each frame draws the left
  // crtRowColumns() of it.
  const colsMax = Math.min(ROW_COLS_MAX,
    gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,
    (gl.getParameter(gl.MAX_VIEWPORT_DIMS) as Int32Array)[0]!);
  const rowFbo = target(1, colsMax, src.height);
  if (!rowFbo) return null;

  // The glow passes, in order: each blurs one direction into its unit,
  // reading the unit named by `from`. The bloom blurs a bright pass of
  // the frame at game size into unit 2; the halation blurs the whole
  // frame at half size, wider, into unit 3. Units 4 and 5 hold the
  // halfway results. Sigmas are in taps; a tap is `step` source texels.
  const full: [number, number] = [src.width, src.height];
  const half: [number, number] =
    [Math.ceil(src.width / 2), Math.ceil(src.height / 2)];
  const glowPasses = [
    { unit: 4, size: full, from: 0, fromSize: full, scale: 1,
      step: [1, 0], sigma: BLOOM_SIGMA_X, brightPass: 1 },
    { unit: 2, size: full, from: 4, fromSize: full, scale: 1,
      step: [0, 1], sigma: BLOOM_SIGMA_Y, brightPass: 0 },
    { unit: 5, size: half, from: 0, fromSize: full, scale: 2,
      step: [2, 0], sigma: HALO_SIGMA / 2, brightPass: 0 },
    { unit: 3, size: half, from: 5, fromSize: half, scale: 1,
      step: [0, 1], sigma: HALO_SIGMA / 2, brightPass: 0 },
  ].map((g) => ({ ...g, fbo: target(g.unit, ...g.size) }));
  if (glowPasses.some((g) => !g.fbo)) return null;
  const glowLoc = (name: string) => gl.getUniformLocation(glowProg, name);
  const uGlowSrc = glowLoc("uSrc"), uGlowSrcSize = glowLoc("uSrcSize");
  const uGlowScale = glowLoc("uScale"), uGlowStep = glowLoc("uStep");
  const uGlowSigma = glowLoc("uSigma");
  const uGlowBright = glowLoc("uBrightPass");

  for (const p of [rowsProg, prog]) {
    gl.useProgram(p);
    gl.uniform2f(gl.getUniformLocation(p, "uTank"), src.width, src.height);
  }
  const uRowCols = gl.getUniformLocation(rowsProg, "uCols");
  const uCols = gl.getUniformLocation(prog, "uCols");
  const uRect = gl.getUniformLocation(prog, "uRect");
  const uPhase = gl.getUniformLocation(prog, "uPhase");
  const uPower = gl.getUniformLocation(prog, "uPower");
  const uDegauss = gl.getUniformLocation(prog, "uDegauss");
  gl.uniform1i(gl.getUniformLocation(prog, "uBloomTex"), 2);
  gl.uniform1i(gl.getUniformLocation(prog, "uHaloTex"), 3);
  gl.uniform1i(gl.getUniformLocation(prog, "uRows"), 1);
  gl.uniform1f(gl.getUniformLocation(prog, "uColsMax"), colsMax);
  gl.uniform1f(uPower, 1);
  gl.uniform1f(uDegauss, 0);

  // Trait uniforms — config keys pair with shader names, each read by
  // the pass that declares it (softening by the rows pass).
  const TRAIT_UNIFORMS: Record<keyof CrtConfig, string> = {
    scanlines: "uScan", softening: "uSoft", bloom: "uBloom", overdrive: "uOver",
    misconvergence: "uConv", grille: "uGrill", curvature: "uCurve",
    vignette: "uVig", flicker: "uFlick", grain: "uGrain",
    brightness: "uBright", contrast: "uContr", zoom: "uZoom",
    hsize: "uHSize", vsize: "uVSize",
    skew: "uSkew", perspective: "uPersp",
    red: "uRed", green: "uGreen", blue: "uBlue",
  };
  const traitKeys = Object.keys(TRAIT_UNIFORMS) as (keyof CrtConfig)[];
  const traitLocs = [rowsProg, prog].map((p) => ({
    p,
    locs: traitKeys.flatMap((k) => {
      const loc = gl.getUniformLocation(p, TRAIT_UNIFORMS[k]);
      return loc ? [{ k, loc }] : [];
    }),
  }));
  let cfg = { ...CRT_DEFAULTS };
  let rasterBox: RasterBox = { x: 0, y: 0, w: 1, h: 1 };
  const upload = (): void => {
    for (const { p, locs } of traitLocs) {
      gl.useProgram(p);
      for (const { k, loc } of locs) gl.uniform1f(loc, cfg[k]);
    }
  };
  upload();

  // The element box is only re-measured when it may have changed —
  // reading clientWidth every frame forces a synchronous layout per
  // rAF. A ResizeObserver + window resize flag the box dirty; the
  // devicePixelRatio read stays per-frame (a cheap number, no
  // layout) so browser-zoom DPR changes still resize the buffer.
  // DPR caps at 2: the grille mask is sub-game-pixel already there,
  // and the ~5-read tube pass scales with buffer pixels.
  // Lifetime: initCrt runs once per page load (module scope in
  // web/main.ts) and CrtFilter has no dispose path, so the observer
  // and window listener below live exactly as long as the page.
  const MAX_CRT_DPR = 2;
  let sizeDirty = true;
  let lastDpr = 0;
  if (typeof ResizeObserver !== "undefined")
    new ResizeObserver(() => { sizeDirty = true; }).observe(out);
  window.addEventListener("resize", () => { sizeDirty = true; });

  function resize(): void {
    // Buffer tracks the element's box at device-pixel pitch.
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_CRT_DPR);
    if (!sizeDirty && dpr === lastDpr) return;
    sizeDirty = false;
    lastDpr = dpr;
    const w = Math.max(1, Math.round(out.clientWidth * dpr));
    const h = Math.max(1, Math.round(out.clientHeight * dpr));
    if (out.width === w && out.height === h) return;
    out.width = w;
    out.height = h; // render() sets each pass's viewport
  }

  // Power-on warm-up: ~0.45 s of the raster opening from a bright
  // center line, replayed on every enable. Skipped when the user asks
  // for reduced motion.
  const POWERON_MS = 450;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  // -Infinity reads as "already settled" until the first enable —
  // 0 would mean page-load time and could play a stray warm-up if a
  // frame draws before setEnabled(true) is ever called.
  let powerT0 = -Infinity;
  // Power-off collapse: offT0 stays -Infinity unless a disable is
  // playing out — enabled stays true so render() keeps drawing until
  // the raster dies, then the body class and the flag drop together.
  let offT0 = -Infinity;
  let degaussT0 = -Infinity;

  return {
    get enabled() { return enabled; },
    get usable() { return !lost; },
    get animating() {
      // A collapse in flight must finish even if reduced-motion flips
      // on mid-flight — render() is the only place its state cleans up.
      if (Number.isFinite(offT0) && enabled) return true;
      if (reducedMotion.matches) return false;
      const now = performance.now();
      return enabled &&
        (now - powerT0 < POWERON_MS || now - degaussT0 < DEGAUSS_MS);
    },
    // A copy — the live cfg could otherwise be mutated without the
    // shader ever seeing it, and goes stale once configure() swaps it.
    get config(): CrtConfig { return { ...cfg }; },
    setEnabled(on: boolean): void {
      if (on && lost) return; // dead context — stay on the plain path
      // A collapse in flight ignores re-disable — the instant-off
      // branch would strand offT0 finite with enabled false, and the
      // next enable would render one dead frame and self-disable.
      if (!on && enabled && Number.isFinite(offT0)) return;
      if (!on && enabled && !reducedMotion.matches) {
        // Real tubes don't cut to black — the raster collapses to a
        // hot line first. enabled stays true so render() keeps drawing
        // the fall; render() clears the flag when the line dies.
        // Backdate offT0 by the warm-up's progress so a mid-bloom
        // toggle falls from where it is rather than snapping open.
        const open = Math.min(1,
          (performance.now() - powerT0) / POWERON_MS);
        offT0 = performance.now() - (1 - open) * POWEROFF_MS;
        return;
      }
      enabled = on;
      offT0 = -Infinity; // a re-enable mid-collapse just warms back up
      document.body.classList.toggle("crt", on);
      if (on) { powerT0 = performance.now(); resize(); }
    },
    degauss(): void {
      if (!enabled || reducedMotion.matches) return;
      degaussT0 = performance.now();
    },
    configure(p: Partial<CrtConfig>): void {
      // Merge onto the current config, then sanitize: unknown keys
      // drop, values clamp to 0–1, undefined keeps the current value.
      const merged: Record<string, unknown> = { ...cfg };
      for (const [k, v] of Object.entries(p))
        if (v !== undefined) merged[k] = v;
      cfg = sanitizeCrtConfig(merged);
      upload();
    },
    setRasterBox(box: RasterBox): void { rasterBox = { ...box }; },
    render(): void {
      if (!enabled) return;
      resize(); // dirty-flagged — catches zoom/fullscreen/dpr changes
      const now = performance.now();
      let power = 1;
      // The collapse runs outside the reduced-motion gate: a flip
      // mid-fall must still finish and run its cleanup, not freeze.
      if (Number.isFinite(offT0)) {
        power = Math.max(0, 1 - (now - offT0) / POWEROFF_MS);
        if (power === 0) {
          // The line died: the tube is off. The last drawn frame
          // stays in the buffer but the class drop hides the canvas.
          enabled = false;
          offT0 = -Infinity;
          document.body.classList.remove("crt");
          return;
        }
      } else if (!reducedMotion.matches) {
        power = Math.min(1, (now - powerT0) / POWERON_MS);
      }
      const rect = crtRasterRect(
        out.width, out.height, src.width, src.height, rasterBox);
      const cols = crtRowColumns(rect[2], cfg, src.width, colsMax);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA,
        gl.UNSIGNED_BYTE, src);

      // Glow passes: blur the frame for the bloom and the halation.
      // Bloom at 0 adds nothing, so they are skipped.
      if (cfg.bloom > 0) {
        gl.useProgram(glowProg);
        for (const g of glowPasses) {
          gl.bindFramebuffer(gl.FRAMEBUFFER, g.fbo);
          gl.viewport(0, 0, ...g.size);
          gl.uniform1i(uGlowSrc, g.from);
          gl.uniform2f(uGlowSrcSize, ...g.fromSize);
          gl.uniform1f(uGlowScale, g.scale);
          gl.uniform2f(uGlowStep, g.step[0]!, g.step[1]!);
          gl.uniform1f(uGlowSigma, g.sigma);
          gl.uniform1f(uGlowBright, g.brightPass);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
      }

      // Smear each scanline once, into the rows target.
      gl.bindFramebuffer(gl.FRAMEBUFFER, rowFbo);
      gl.viewport(0, 0, cols, src.height);
      gl.useProgram(rowsProg);
      gl.uniform1f(uRowCols, cols);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      // The tube, at device resolution.
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, out.width, out.height);
      gl.useProgram(prog);
      gl.uniform1f(uCols, cols);
      gl.uniform4f(uRect, ...rect);
      // Each shader phase arrives pre-wrapped mod its period, so the
      // sin() args are identical modulo 2π at every point in time —
      // no wrap jump, no precision loss on a long-running clock.
      const t = now / 1000, TAU = Math.PI * 2;
      // Apparent flicker / rolling-band rates. x/y scale t (seconds)
      // into sin() arguments, so they're radians/sec (Hz = value / TAU);
      // z is a [0,1) hash seed (grain) and wraps by 1, not 2π.
      const FLICKER_RATE = 61, BAND_RATE = 4; // ≈9.7 Hz, ≈0.64 Hz
      gl.uniform3f(uPhase, (t * FLICKER_RATE) % TAU,
                   (t * BAND_RATE) % TAU, t % 1);
      gl.uniform1f(uPower, power);
      gl.uniform1f(uDegauss,
        reducedMotion.matches ? 0 : degaussAmp(now - degaussT0));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
