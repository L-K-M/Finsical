/**
 * A bounded Map: least-recently-used eviction by insertion order (Map
 * preserves it), refreshed on read. Used for session caches whose
 * entries are expensive to hold — decoded packs and fetched zip bytes —
 * where an unbounded memo would pin megabytes for the whole session.
 * Evicting is always safe: callers either still hold the value they
 * were given, or refetch (IndexedDB serves archive.org bytes, so a
 * refetch costs a decode, not a download).
 */

/** Read `k`, marking it most-recently-used. */
export function lruGet<K, V>(m: Map<K, V>, k: K): V | undefined {
  const v = m.get(k);
  if (v !== undefined && m.size > 1) {
    m.delete(k);
    m.set(k, v);
  }
  return v;
}

/** Store `k → v`, evicting the oldest entries past `cap`. */
export function lruSet<K, V>(m: Map<K, V>, k: K, v: V, cap: number): void {
  m.delete(k);
  m.set(k, v);
  while (m.size > cap) m.delete(m.keys().next().value!);
}
