export interface DecorEntry {
  cv: HTMLCanvasElement;
  pack: string;
}

/** Insert or replace the single decor entry for `pack`. Matching is an
 * exact string comparison, so callers must pass a stable, canonical pack
 * source — the identical string on every reinstall of the same pack.
 * Reinstalling ("Add Again") must not stack a second copy of the art. */
export function upsertDecor(
  list: DecorEntry[],
  pack: string,
  cv: HTMLCanvasElement,
): void {
  const i = list.findIndex((d) => d.pack === pack);
  if (i >= 0) list[i] = { cv, pack };
  else list.push({ cv, pack });
}
