/**
 * CRT post-process. The tank still renders at its logical 320×200 into
 * the 2D canvas; when enabled, that bitmap is re-drawn every frame at
 * the display's device resolution through a shader emulating an
 * aperture-grille tube:
 *  - scanlines locked to logical game rows (they follow the warped,
 *    letterboxed image, not fixed screen stripes)
 *  - horizontal beam smear (CRTs blur along the scan, not across lines)
 *  - phosphor bloom that over-emphasizes bright colors, plus wider
 *    glass halation
 *  - R/B misconvergence that grows toward the screen edges
 *  - RGB grille stripes at device-pixel pitch, so the mask is far finer
 *    than the game pixels
 *  - gentle barrel curvature, corner vignette, flicker + rolling band,
 *    faint grain
 * WebGL setup failure returns null and the plain pixelated path stays.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;
uniform sampler2D uTex;
uniform vec2 uTank;   // logical resolution (320x200)
uniform vec4 uRect;   // letterboxed tank rect in buffer px, y-up
uniform float uTime;
uniform float uScan;  // gap darkness between rows (0 = off, 1 = black)
uniform float uBeam;  // horizontal smear blend (0 = sharp pixels)
uniform float uBloom; // bright bleed strength
uniform float uOver;  // bright-color overdrive
uniform float uConv;  // R/B misconvergence, edge-weighted
uniform float uGrill; // RGB mask strength (0 = invisible stripes)
uniform float uCurve; // barrel warp
uniform float uVig;   // edge/corner dimming
uniform float uFlick; // brightness shimmer
uniform float uGrain; // analog noise

vec3 gamePx(vec2 lp) {
  vec2 t = clamp(lp, vec2(0.5), uTank - 0.5) / uTank;
  return texture2D(uTex, t).rgb;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = (gl_FragCoord.xy - uRect.xy) / uRect.zw;

  // Barrel curve: sample positions bow outward like curved tube glass.
  vec2 cc = uv * 2.0 - 1.0;
  uv = (cc * (1.0 + (0.10 * uCurve) * dot(cc, cc))) * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Logical game pixel under this output pixel (post-warp).
  vec2 lp = uv * uTank;

  // Horizontal beam smear — gaussian over ~2 game px along the scan.
  vec3 sharp = gamePx(lp);
  vec3 c = sharp * 0.40;
  c += (gamePx(lp - vec2(0.7, 0.0)) + gamePx(lp + vec2(0.7, 0.0))) * 0.19;
  c += (gamePx(lp - vec2(1.6, 0.0)) + gamePx(lp + vec2(1.6, 0.0))) * 0.11;
  c = mix(sharp, c, uBeam);

  // Misconvergence: the outer electron guns never land perfectly —
  // red drifts left and blue right, growing from zero at the center
  // toward the edges. Green stays as the reference beam.
  float conv = (1.2 * uConv) * length(cc);
  if (conv > 0.001) {
    // Blend, don't overwrite — a hard swap would strip the beam smear
    // from r/b and leave them crisper than green.
    float k = clamp(conv * 2.5, 0.0, 1.0);
    c.r = mix(c.r, gamePx(lp - vec2(conv, 0.0)).r, k);
    c.b = mix(c.b, gamePx(lp + vec2(conv, 0.0)).b, k);
  }

  // Phosphor bloom: bright areas bleed wider and overdrive.
  vec3 glow =
    (gamePx(lp - vec2(3.5, 0.0)) + gamePx(lp + vec2(3.5, 0.0))) * 0.5;
  c += glow * max(glow.r, max(glow.g, glow.b)) * (0.60 * uBloom);
  // Halation: light scattered inside the faceplate glass reaches
  // further than the phosphor bloom — a wider, fainter halo.
  vec3 halo =
    (gamePx(lp - vec2(7.0, 0.0)) + gamePx(lp + vec2(7.0, 0.0)) +
     gamePx(lp - vec2(0.0, 5.0)) + gamePx(lp + vec2(0.0, 5.0))) * 0.25;
  c += halo * (0.10 * uBloom);
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
  c *= 1.0 - (0.40 * uVig) * dot(cc, cc);
  c *= 1.0 + (0.05 * uFlick) * sin(uTime * 61.0)
           + (0.03 * uFlick) * sin(uv.y * 3.0 - uTime * 4.0);
  c += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * (0.10 * uGrain);

  gl_FragColor = vec4(c, 1.0);
}
`;

/** Tunable CRT traits, all normalized 0–1. The shader multiplies each
 * by a tuned ceiling, so 1.0 is "authentic" rather than "clipped". */
export interface CrtConfig {
  /** Darkness of the gaps between game-pixel rows. */
  scanlines: number;
  /** How much the beam smears color sideways along each scan. */
  beam: number;
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
}

export const CRT_DEFAULTS: Readonly<CrtConfig> = Object.freeze<CrtConfig>({
  scanlines: 0.40, beam: 1.0, bloom: 0.50, overdrive: 0.50,
  misconvergence: 0.35, grille: 1.0, curvature: 0.45, vignette: 0.35,
  flicker: 0.30, grain: 0.30,
});

/** Merge an untrusted source (localStorage, bus message) onto the
 * defaults: unknown keys drop, each value clamps into 0–1. */
export function sanitizeCrtConfig(raw: unknown): CrtConfig {
  const c = { ...CRT_DEFAULTS };
  if (raw && typeof raw === "object")
    for (const k of Object.keys(c) as (keyof CrtConfig)[]) {
      const v = (raw as Record<string, unknown>)[k];
      if (typeof v === "number" && Number.isFinite(v))
        c[k] = Math.min(1, Math.max(0, v));
    }
  return c;
}

export interface CrtFilter {
  readonly enabled: boolean;
  /** False once the GL context is lost — the effect can't re-enable. */
  readonly usable: boolean;
  setEnabled(on: boolean): void;
  /** Live-update shader params; `config` reflects the merged result. */
  configure(cfg: Partial<CrtConfig>): void;
  readonly config: CrtConfig;
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
  const fs = shader(gl.FRAGMENT_SHADER, FRAG);
  if (!vs || !fs) return null;
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.warn("crt link:", gl.getProgramInfoLog(prog));
    return null;
  }
  gl.useProgram(prog);

  // Fullscreen triangle.
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Linear filtering: the shader's horizontal taps get smooth beam
  // smear; the scanline mask re-establishes crisp row boundaries.
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1); // gl_FragCoord y is up
  // Allocate storage once — render() updates it in place.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA,
    gl.UNSIGNED_BYTE, src);

  const uTank = gl.getUniformLocation(prog, "uTank");
  const uRect = gl.getUniformLocation(prog, "uRect");
  const uTime = gl.getUniformLocation(prog, "uTime");
  gl.uniform2f(uTank, src.width, src.height);

  // Trait uniforms — config keys pair with shader names.
  const TRAIT_UNIFORMS: Record<keyof CrtConfig, string> = {
    scanlines: "uScan", beam: "uBeam", bloom: "uBloom", overdrive: "uOver",
    misconvergence: "uConv", grille: "uGrill", curvature: "uCurve",
    vignette: "uVig", flicker: "uFlick", grain: "uGrain",
  };
  const traitLoc = {} as Record<keyof CrtConfig, WebGLUniformLocation | null>;
  for (const k of Object.keys(TRAIT_UNIFORMS) as (keyof CrtConfig)[])
    traitLoc[k] = gl.getUniformLocation(prog, TRAIT_UNIFORMS[k]);
  let cfg = { ...CRT_DEFAULTS };
  const upload = (): void => {
    for (const k of Object.keys(traitLoc) as (keyof CrtConfig)[])
      gl.uniform1f(traitLoc[k], cfg[k]);
  };
  upload();

  function resize(): void {
    // Buffer tracks the element's box at device-pixel pitch.
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(out.clientWidth * dpr));
    const h = Math.max(1, Math.round(out.clientHeight * dpr));
    if (out.width === w && out.height === h) return;
    out.width = w;
    out.height = h;
    gl.viewport(0, 0, w, h);
  }

  return {
    get enabled() { return enabled; },
    get usable() { return !lost; },
    // A copy — the live cfg could otherwise be mutated without the
    // shader ever seeing it, and goes stale once configure() swaps it.
    get config(): CrtConfig { return { ...cfg }; },
    setEnabled(on: boolean): void {
      if (on && lost) return; // dead context — stay on the plain path
      enabled = on;
      document.body.classList.toggle("crt", on);
      if (on) resize();
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
    render(): void {
      if (!enabled) return;
      resize(); // cheap check — catches zoom/fullscreen/dpr changes
      // Same math as object-fit: contain, in buffer pixels (y-up).
      const s = Math.min(out.width / src.width, out.height / src.height);
      const w = src.width * s, h = src.height * s;
      gl.uniform4f(uRect,
        (out.width - w) / 2, (out.height - h) / 2, w, h);
      // Bound the clock: mediump floats lose sin() precision fast once
      // uTime*61 grows — wrap every 100s (flicker is noise-like anyway).
      gl.uniform1f(uTime, (performance.now() / 1000) % 100);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA,
        gl.UNSIGNED_BYTE, src);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
  };
}
