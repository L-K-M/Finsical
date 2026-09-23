/**
 * Water feedback: pixel rings on a glass tap and droplets when food
 * hits the surface. Advanced on the sim's 30 tps clock (the tank page
 * ticks them in its fixed-step loop) and drawn as whole pixels —
 * anti-aliased arcs would look soft next to the 2x2 bubble squares.
 */

export interface Ripple {
  x: number;
  y: number;
  age: number;
}

export interface Splash {
  x: number;
  y: number;
  age: number;
  /** 1px droplets launched upward, gravity pulls them back. */
  drops: { x: number; y: number; vx: number; vy: number }[];
}

/** A ring lives ~0.7 s and reaches ~14 px out. */
export const RIPPLE_TICKS = 22;
export const SPLASH_TICKS = 18;
const RIPPLE_MAX_R = 14;
const DROP_GRAVITY = 0.12;

/** Age every ring one tick; discard rings past RIPPLE_TICKS. (The
 * fainter trailing ring of the double-pulse is drawn by drawRipples,
 * not ticked separately.) */
export function tickRipples(rs: Ripple[]): void {
  for (let i = rs.length - 1; i >= 0; i--)
    if (++rs[i]!.age > RIPPLE_TICKS) rs.splice(i, 1);
}

/** Food (or a new fish) entering the water at `x`, `y`. */
export function newSplash(x: number, y: number): Splash {
  // Center droplet rises highest; the side ones lean outward. The
  // speeds and DROP_GRAVITY bring them back down within the splash's
  // lifetime (~apex at tick 8, surface again by tick 16).
  const drops = [-1, 0, 1].map((i) => ({
    x: x + i * 1.5,
    y,
    vx: i * 0.45,
    vy: -0.95 + Math.abs(i) * 0.4,
  }));
  return { x, y, age: 0, drops };
}

export function tickSplashes(ss: Splash[]): void {
  for (let i = ss.length - 1; i >= 0; i--) {
    const s = ss[i]!;
    if (++s.age > SPLASH_TICKS) { ss.splice(i, 1); continue; }
    for (const d of s.drops) {
      d.x += d.vx;
      d.vy += DROP_GRAVITY;
      d.y += d.vy;
    }
  }
}

/** Stepped 1px ring — whole pixels only, alpha fades with age. */
function ring(ctx: CanvasRenderingContext2D, cx: number, cy: number,
              r: number, alpha: number): void {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#cfe8ff";
  const steps = Math.max(8, Math.round(r * 5));
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    ctx.fillRect(Math.round(cx + Math.cos(a) * r),
                 Math.round(cy + Math.sin(a) * r), 1, 1);
  }
  ctx.globalAlpha = 1;
}

export function drawRipples(ctx: CanvasRenderingContext2D,
                            rs: readonly Ripple[]): void {
  for (const r of rs) {
    const t = r.age / RIPPLE_TICKS;
    const rad = 2 + t * RIPPLE_MAX_R;
    ring(ctx, r.x, r.y, rad, 1 - t);
    if (rad > 5) ring(ctx, r.x, r.y, rad - 4, (1 - t) * 0.6);
  }
}

export function drawSplashes(ctx: CanvasRenderingContext2D,
                             ss: readonly Splash[]): void {
  ctx.fillStyle = "#cfe8ff";
  for (const s of ss) {
    for (const d of s.drops) ctx.fillRect(Math.round(d.x), Math.round(d.y), 1, 1);
  }
}
