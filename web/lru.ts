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
 * overshoot the cap until they settle. */
export function lruSet<K, V>(m: Map<K, V>, k: K, v: V, cap: number,
                             canEvict?: (v: V) => boolean): void {
  m.delete(k);
  m.set(k, v);
  while (m.size > cap) {
    const [k0, v0] = m.entries().next().value!;
    if (canEvict && !canEvict(v0)) break;
    m.delete(k0);
  }
}
