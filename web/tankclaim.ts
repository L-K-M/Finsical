/** Single-owner lease for the tank page. Two same-origin index.html
 * tabs would both simulate, both answer every mutating bus op, and
 * both write the same localStorage save — last writer wins and saves
 * interleave. The first tab holds a lease and re-stamps it on a
 * heartbeat; a second tab sees the fresh lease and runs view-only
 * (no saves, no bus answers) until the lease lapses, then reloads to
 * claim it.
 *
 * localStorage is the lease store because BroadcastChannel can't be
 * asked "is anyone else there" synchronously, and the claim must be
 * decided before the first save runs during module eval. */

export const LEASE_KEY = "finsical:tank-owner";
/** A lease untouched this long is dead — its tab closed or crashed
 * before pagehide could release it. */
export const LEASE_TTL_MS = 4_000;
/** Owner re-stamp period; well under the TTL so a busy main thread
 * can miss a beat without losing the tank. */
export const LEASE_BEAT_MS = 1_500;

export interface TankLease { id: string; at: number }

/** Storage narrowed to the lease operations — injectable for tests. */
export interface LeaseStore {
  get(): string | null;
  set(v: string): void;
  clear(): void;
}

export function readLease(raw: string | null): TankLease | null {
  try {
    const l = JSON.parse(raw ?? "") as Partial<TankLease> | null;
    if (l && typeof l.id === "string" && l.id !== "" &&
        typeof l.at === "number" && Number.isFinite(l.at))
      return { id: l.id, at: l.at };
  } catch { /* corrupt — treat as absent */ }
  return null;
}

export function leaseAlive(l: TankLease | null, now: number): boolean {
  return l !== null && now - l.at < LEASE_TTL_MS;
}

/** Try to take the lease for `id`. False while another id's lease is
 * fresh; a missing or expired lease is taken over. */
export function tryClaim(s: LeaseStore, id: string,
                         now: number): boolean {
  const cur = readLease(s.get());
  if (cur !== null && cur.id !== id && leaseAlive(cur, now)) return false;
  s.set(JSON.stringify({ id, at: now }));
  return true;
}

/** Re-stamp while `id` still holds the lease. False once the record
 * names another id (a same-instant claim race) or is gone, so the
 * caller knows it lost the tank. */
export function beatLease(s: LeaseStore, id: string,
                          now: number): boolean {
  if (readLease(s.get())?.id !== id) return false;
  s.set(JSON.stringify({ id, at: now }));
  return true;
}

/** Give the lease back — the owner's pagehide — so a spectator can
 * take over on its next poll instead of waiting out the TTL. */
export function releaseLease(s: LeaseStore, id: string): void {
  if (readLease(s.get())?.id === id) s.clear();
}

export interface TankClaim {
  /** This tab holds the lease — it may save and answer the bus. */
  readonly owned: boolean;
  /** Spectator poll: the owner's lease is missing or stale, so this
   * tab can reload and claim the tank. */
  ownerGone(): boolean;
}

/** Claim the tank for this tab. `onLost` fires when a same-instant
 * claim race stole the lease mid-session — the right response is a
 * reload, which re-runs the claim as a spectator.
 *
 * Degrades honestly: when localStorage can't be written at all
 * (private mode), there is nothing to coordinate with — the claim
 * reports owned with no heartbeat, matching pre-guard behavior. */
export function claimTank(onLost: () => void,
                          storage: LeaseStore = {
    get: () => { try { return localStorage.getItem(LEASE_KEY); }
                 catch { return null; } },
    set: (v) => { try { localStorage.setItem(LEASE_KEY, v); }
                 catch { /* storage off */ } },
    clear: () => { try { localStorage.removeItem(LEASE_KEY); }
                   catch { /* storage off */ } },
  }): TankClaim {
  const id = `t${Date.now().toString(36)}${Math.random().toString(36)
    .slice(2)}`;
  if (!tryClaim(storage, id, Date.now()))
    return { owned: false,
             ownerGone: () =>
               !leaseAlive(readLease(storage.get()), Date.now()) };
  // Null read-back = unwritable store (private mode): nothing to
  // coordinate with, hold the claim without a heartbeat. A different
  // id = a rival's claim landed between our write and this read —
  // fresh rival: we lost the race and spectate; stale rival: retake.
  const back = readLease(storage.get());
  if (back === null) return { owned: true, ownerGone: () => false };
  if (back.id !== id) {
    if (leaseAlive(back, Date.now()))
      return { owned: false,
               ownerGone: () =>
                 !leaseAlive(readLease(storage.get()), Date.now()) };
    storage.set(JSON.stringify({ id, at: Date.now() }));
  }
  const beat = setInterval(() => {
    if (beatLease(storage, id, Date.now())) return;
    clearInterval(beat);
    onLost();
  }, LEASE_BEAT_MS);
  // Node tests drive the pure functions; the pagehide/pageshow pair
  // is browser-only.
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", () => {
      clearInterval(beat);
      releaseLease(storage, id);
    });
    // A pagehide into the bfcache released the lease and stopped the
    // heartbeat — on restore someone else may own the tank now, so
    // re-run the claim from scratch (onLost reloads in main.ts).
    window.addEventListener("pageshow", (e) => {
      if (e.persisted) onLost();
    });
  }
  return { owned: true, ownerGone: () => false };
}
