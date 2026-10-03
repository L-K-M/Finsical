/** Screen-only overlays that require a clean scene before a souvenir
 * copy, in one list: when a new `target === "screen"` gate appears in
 * render(), add its flag here and the state type and check follow.
 * The laser entry is web/laser.ts's dot: screen-only like the torch,
 * so a shot taken with the toy on must repaint without it. */
export const PICTURE_OVERLAYS = ["paused", "torchLit", "bootActive",
                               "focusActive", "laserActive"] as const;

export type PictureState =
  Record<(typeof PICTURE_OVERLAYS)[number], boolean>;

export function needsCleanPicture(state: PictureState): boolean {
  return PICTURE_OVERLAYS.some((k) => state[k]);
}
