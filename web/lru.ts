/**
 * A bounded Map: least-recently-used eviction by insertion order (Map
 * preserves it), refreshed on read. Used for session caches whose
 * entries are expensive to hold — decoded packs and fetched zip bytes —
 * where an unbounded memo would pin megabytes for the whole session.
 * Evicting is always safe: callers either still hold the value they
 * were given, or refetch (IndexedDB serves archive.org bytes, so a
 * refetch costs a decode, not a download).
 */

/** Read `k`, marking it most-recently-used. A key stored with the
 * value `undefined` still counts as a hit. */
export function lruGet<K, V>(m: Map<K, V>, k: K): V | undefined {
  if (!m.has(k)) return undefined;
  const v = m.get(k) as V;
  if (m.size > 1) {
    m.delete(k);
    m.set(k, v);
  }
  return v;
}

/** Store `k → v`, evicting the oldest entries past `cap`. `canEvict`
 * vetoes trimming at the entry it rejects — pinned entries (e.g. a
 * download still in flight, whose map slot is the dedup key) simply
 * overshoot the cap until they settle. `onEvict` runs per dropped
 * entry — cap trims and same-key replacement alike — so callers
 * keeping side accounting (like zipCache's byte total) don't leak
 * it. It fires before the new value lands, so an `onEvict` that
 * deletes the key can't clobber the replacement. */
export function lruSet<K, V>(m: Map<K, V>, k: K, v: V, cap: number,
                             canEvict?: (v: V) => boolean,
                             onEvict?: (k: K, v: V) => void): void {
  const old = m.get(k);
  try {
    if (m.has(k)) { m.delete(k); onEvict?.(k, old as V); }
  } finally {
    // A throwing callback must not turn a replace into a delete.
    m.set(k, v);
  }
  // A throwing callback mid-trim must not abandon the loop with the
  // map still over cap — finish evicting, then rethrow the first error.
  let trimErr: unknown;
  while (m.size > cap) {
    const [k0, v0] = m.entries().next().value!;
    if (canEvict && !canEvict(v0)) break;
    m.delete(k0);
    try { onEvict?.(k0, v0); } catch (e) { trimErr ??= e; }
  }
  if (trimErr !== undefined) throw trimErr;
}
