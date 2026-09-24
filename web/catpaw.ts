/**
 * AquaZone's cat — the original's best-remembered gag: every so often a
 * paw descends from the top of the screen, bats at the glass a couple
 * of times, and withdraws. This module is the pure choreography: when
 * visits happen, where the paw hangs, and when each swat lands. The
 * impulses (fish startle, water push, tap sound) and the drawing live
 * in main.ts, driven by pawPose/pawSwatAt each tick.
 */
import { SURFACE_W } from "./surface.js";

export const PAW_W = 14;
export const PAW_H = 9;
/** Fur colour — a dark silhouette reads against any backdrop. */
export const PAW_FUR = "#26232a";
/** 14x9 silhouette: a paw pad facing the glass, toes arced above it,
 * and a stubby leg the sprite hangs from (drawn to the top edge). */
export const PAW_ART: readonly string[] = [
  "...KKKKKKK......",
  "..KKKKKKKKK.....",
  ".KKK.KKK.KK.KK..",
  ".KKKKKKKKKKKKK..",
  "..KKKKKKKKKKK...",
  "..KKKKKKKKKKK...",
  "...KKKKKKKKK....",
  "...KKKKKKKK.....",
  "....KKKKKK......",
];

/** Ticks at 30 tps. */
export const PAW_DESCEND = 26;
export const PAW_SWAT_LEN = 18;
export const PAW_RETREAT = 26;
/** Paw-top y while swatting: the toes dip just under the hood. */
export const PAW_Y = 2;
/** Horizontal reach of a swat, px from the hang point. */
export const PAW_SWING = 22;
/** First visit lands 1.5–3 min in; then every 4–9 min. */
export const PAW_FIRST = 2700;
export const PAW_FIRST_RANGE = 2700;
export const PAW_GAP = 7200;
export const PAW_GAP_RANGE = 9000;

export interface PawVisit {
  /** tickCount the visit started. */
  t0: number;
  /** tank-space x the leg hangs over (the paw's center column). */
  x: number;
  /** swats planned this visit (2–3 keeps it a cameo, not a pest). */
  swats: number;
}

/** Where the leg may hang: far enough from the glass that the sprite
 * plus a full swat's reach stays on screen. */
export function pawSpawnX(rand: () => number): number {
  const margin = PAW_SWING + PAW_W / 2;
  return margin + rand() * (SURFACE_W - margin * 2);
}

/** The paw's top-left corner at tick `t`, or null once the visit is
 * over (or before it begins). Descend, swat out-and-back per swat,
 * retreat — a pure function of elapsed ticks. */
export function pawPose(v: PawVisit, t: number):
    { x: number; y: number } | null {
  const e = t - v.t0;
  if (e < 0) return null;
  if (e < PAW_DESCEND) {
    const p = e / PAW_DESCEND;
    return { x: v.x, y: -PAW_H + (PAW_Y + PAW_H) * p };
  }
  const sw = e - PAW_DESCEND;
  const total = v.swats * PAW_SWAT_LEN;
  if (sw < total) {
    const i = Math.floor(sw / PAW_SWAT_LEN);
    const p = (sw % PAW_SWAT_LEN) / PAW_SWAT_LEN;
    const dir = i % 2 === 0 ? 1 : -1;
    // sin(πp) eases out to the apex and back inside each swat.
    return { x: v.x + Math.sin(p * Math.PI) * PAW_SWING * dir, y: PAW_Y };
  }
  const r = sw - total;
  if (r < PAW_RETREAT) {
    const p = r / PAW_RETREAT;
    return { x: v.x, y: PAW_Y - (PAW_Y + PAW_H) * p };
  }
  return null;
}

/** The impact point of a swat — emitted once as the paw crosses the
 * apex of each swing (its furthest reach). `i` is the swat index so the
 * caller can dedupe. */
export function pawSwatAt(v: PawVisit, t: number):
    { i: number; x: number; y: number } | null {
  const e = t - v.t0 - PAW_DESCEND;
  if (e < 0) return null;
  const i = Math.floor(e / PAW_SWAT_LEN);
  if (i >= v.swats) return null;
  const p = (e % PAW_SWAT_LEN) / PAW_SWAT_LEN;
  const pe = e - 1;
  const pp = pe >= 0
    ? (pe % PAW_SWAT_LEN) / PAW_SWAT_LEN : -1;
  // Apex at p = 0.5: fire on the tick that crosses it. A wrap to the
  // next swat gives pp ≈ 0.94, so boundaries can't double-fire.
  if (p >= 0.5 && pp < 0.5) {
    const dir = i % 2 === 0 ? 1 : -1;
    return { i, x: v.x + PAW_SWING * dir, y: PAW_Y + PAW_H };
  }
  return null;
}
