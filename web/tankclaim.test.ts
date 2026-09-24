import { afterEach, describe, expect, it, vi } from "vitest";
import { beatLease, claimTank, LEASE_BEAT_MS, LEASE_TTL_MS,
         readLease, releaseLease, tryClaim }
  from "./tankclaim.js";
import type { LeaseStore } from "./tankclaim.js";

/** A localStorage-shaped fake: a single slot the tests can corrupt. */
function fakeStore(): { store: LeaseStore;
                        setRaw(v: string | null): void } {
  let v: string | null = null;
  return {
    store: { get: () => v, set: (x) => { v = x; },
             clear: () => { v = null; } },
    setRaw: (x) => { v = x; },
  };
}

afterEach(() => vi.useRealTimers());

describe("tank lease", () => {
  it("denies a second tab while the owner's lease is fresh", () => {
    const { store } = fakeStore();
    expect(tryClaim(store, "a", 1_000)).toBe(true);
    expect(tryClaim(store, "b", 1_500)).toBe(false);
    expect(readLease(store.get())?.id).toBe("a"); // owner untouched
  });

  it("hands the tank over once the lease goes stale", () => {
    const { store } = fakeStore();
    tryClaim(store, "a", 1_000);
    expect(tryClaim(store, "b", 1_000 + LEASE_TTL_MS + 1)).toBe(true);
    expect(readLease(store.get())?.id).toBe("b");
  });

  it("beats only while it still owns the lease", () => {
    const { store, setRaw } = fakeStore();
    tryClaim(store, "a", 1_000);
    expect(beatLease(store, "a", 2_000)).toBe(true);
    expect(readLease(store.get())?.at).toBe(2_000);
    // A same-instant claim race overwrote us — the next beat says so.
    setRaw(JSON.stringify({ id: "b", at: 2_500 }));
    expect(beatLease(store, "a", 3_000)).toBe(false);
    expect(readLease(store.get())?.id).toBe("b"); // don't clobber it
  });

  it("release frees only our own lease", () => {
    const { store, setRaw } = fakeStore();
    tryClaim(store, "a", 1_000);
    releaseLease(store, "b"); // a stranger can't release ours
    expect(readLease(store.get())?.id).toBe("a");
    releaseLease(store, "a");
    expect(readLease(store.get())).toBeNull();
    setRaw("not json");
    expect(readLease(store.get())).toBeNull(); // corrupt = absent
  });

  it("claimTank reports the denial and sees the owner leave", () => {
    const { store, setRaw } = fakeStore();
    tryClaim(store, "a", Date.now());
    const c = claimTank(() => {}, store);
    expect(c.owned).toBe(false);
    expect(c.ownerGone()).toBe(false);
    setRaw(JSON.stringify({ id: "a", at: Date.now() - LEASE_TTL_MS }));
    expect(c.ownerGone()).toBe(true);
  });

  it("claimTank degrades to owned when storage can't be written", () => {
    // Private mode: get always misses, set silently no-ops — nothing
    // to coordinate with, so holding the claim beats a reload loop.
    const dead: LeaseStore = { get: () => null, set: () => {},
                               clear: () => {} };
    const c = claimTank(() => {}, dead);
    expect(c.owned).toBe(true);
    expect(c.ownerGone()).toBe(false);
  });

  it("onLost fires when the lease is stolen mid-session", () => {
    vi.useFakeTimers();
    const { store, setRaw } = fakeStore();
    let lost = 0;
    const c = claimTank(() => { lost++; }, store);
    expect(c.owned).toBe(true);
    vi.advanceTimersByTime(LEASE_BEAT_MS); // own beat re-stamps
    expect(lost).toBe(0);
    setRaw(JSON.stringify({ id: "b", at: Date.now() }));
    vi.advanceTimersByTime(LEASE_BEAT_MS);
    expect(lost).toBe(1);
  });
});
