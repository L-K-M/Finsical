/**
 * CRT post-process. The tank still renders at its logical 320×200 into
 * the 2D canvas; when enabled, that bitmap is re-drawn every frame at
 * the display's device resolution through a shader emulating an
 * aperture-grille tube:
 *  - scanlines locked to logical game rows (they follow the warped,
 *    letterboxed image, not fixed screen stripes)
 *  - horizontal beam smear (CRTs blur along the scan, not across lines)
 *  - phosphor bloom that over-emphasizes bright colors
 *  - RGB grille stripes at device-pixel pitch, so the mask is far finer
 *    than the game pixels
 *  - gentle barrel curvature, corner vignette, faint flicker/grain
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
  uv = (cc * (1.0 + 0.045 * dot(cc, cc))) * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Logical game pixel under this output pixel (post-warp).
  vec2 lp = uv * uTank;

  // Horizontal beam smear — gaussian over ~2 game px along the scan.
  vec3 c = gamePx(lp) * 0.40;
  c += (gamePx(lp - vec2(0.7, 0.0)) + gamePx(lp + vec2(0.7, 0.0))) * 0.19;
  c += (gamePx(lp - vec2(1.6, 0.0)) + gamePx(lp + vec2(1.6, 0.0))) * 0.11;

  // Phosphor bloom: bright areas bleed wider and overdrive.
  vec3 glow =
    (gamePx(lp - vec2(3.5, 0.0)) + gamePx(lp + vec2(3.5, 0.0))) * 0.5;
  c += glow * max(glow.r, max(glow.g, glow.b)) * 0.30;
  c *= 1.0 + 0.30 * smoothstep(0.5, 1.0, max(c.r, max(c.g, c.b)));

  // Scanlines ride the logical-row phase: sin² dips at row boundaries.
  // (pow() is undefined for negative bases — square explicitly.)
  float scan = sin(3.14159265 * lp.y);
  scan *= scan;
  c *= mix(0.60, 1.0, scan);

  // Aperture grille: one RGB channel per device-pixel column.
  float stripe = mod(floor(gl_FragCoord.x), 3.0);
  vec3 mask = vec3(0.72);
  if (stripe < 0.5) mask.r = 1.0;
  else if (stripe < 1.5) mask.g = 1.0;
  else mask.b = 1.0;
  c *= mask * 1.18; // grille+scanline dimming compensation

  // Glass vignette, faint flicker, and grain.
  c *= 1.0 - 0.14 * dot(cc, cc);
  c *= 1.0 + 0.015 * sin(uTime * 61.0);
  c += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.03;

  gl_FragColor = vec4(c, 1.0);
}
`;

export interface CrtFilter {
  readonly enabled: boolean;
  setEnabled(on: boolean): void;
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
  let enabled = false;
  out.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
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
    setEnabled(on: boolean): void {
      enabled = on;
      document.body.classList.toggle("crt", on);
      if (on) resize();
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
