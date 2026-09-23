export interface DecorEntry {
  cv: HTMLCanvasElement;
  pack: string;
}

/** Insert or replace the single decor entry for `pack`. Reinstalling
 * ("Add Again") must not stack a second copy of the same pack's art. */
export function upsertDecor(
  list: DecorEntry[],
  pack: string,
  cv: HTMLCanvasElement,
): void {
  const i = list.findIndex((d) => d.pack === pack);
  if (i >= 0) list[i] = { cv, pack };
  else list.push({ cv, pack });
}
