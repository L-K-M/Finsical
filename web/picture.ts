/** Screen-only overlays that require a clean scene before a souvenir copy. */
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
