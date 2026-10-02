/** Screen-only overlays that require a clean scene before a souvenir copy.
 * Keep in sync with the `target === "screen"` gates in `render()`: any
 * screen-only overlay must be listed here so it cannot enter a souvenir. */
export interface PictureState {
  paused: boolean;
  torchLit: boolean;
  bootActive: boolean;
  focusActive: boolean;
}

export function needsCleanPicture(state: PictureState): boolean {
  return state.paused || state.torchLit || state.bootActive ||
    state.focusActive;
}
