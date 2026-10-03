/**
 * Pixel-readiness proof for machine-case art (web/machines.ts). The
 * shell swap stages both SVG layers and the machine model until every
 * raster asset is decoded, so a commit can never show a caseless tank
 * for a frame or two.
 */

/** Resolve once `img`'s pixels are decoded — or once its load has
 * failed: a broken asset must still resolve so a machine switch can
 * commit (better a missing shell than a machine the picker can never
 * switch to). `decode()` is the real proof that pixels are ready:
 * `onload` alone only means the bytes arrived, and a draw right then
 * can still race the decode on some engines. Where `decode()` is
 * missing (older WebKit), a synchronous draw into a canvas forces the
 * decode before resolving. And where `decode()` exists but stays
 * pending forever — images served by a WKURLSchemeHandler in the
 * native shell do this — the same forced draw runs one task later, so
 * the commit can't wedge either. */
export function decodeImage(img: HTMLImageElement): Promise<void> {
  // A synchronous draw of a fully loaded image decodes it as part of
  // the draw — the explicit proof where decode() can't answer.
  const forceDecode = (): void => {
    try {
      document.createElement("canvas")
        .getContext("2d")?.drawImage(img, 0, 0);
    } catch { /* decode best effort — commit anyway */ }
  };
  return new Promise((ok) => {
    let done = false;
    const commit = (): void => {
      if (!done) { done = true; ok(); }
    };
    const prove = (): void => {
      if (typeof img.decode === "function") {
        // Rejects on a corrupt image — still commit (see above).
        img.decode().then(commit, commit);
        // decode() may never settle (custom-scheme sources): after a
        // task, the forced draw is the proof — then commit anyway.
        // Skipped if decode() already settled: no wasted raster.
        setTimeout(() => { if (!done) forceDecode(); commit(); }, 0);
        return;
      }
      forceDecode();
      commit();
    };
    // Already settled before the handlers went on — a cached asset (or
    // a caller that set src first) never fires onload/onerror again,
    // so without this branch the promise would wedge forever.
    if (img.complete) {
      if (img.naturalWidth > 0) prove();
      else commit(); // load already failed — broken asset commits
      return;
    }
    img.onload = prove;
    img.onerror = () => commit();
  });
}
