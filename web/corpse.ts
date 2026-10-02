// CanvasRenderingContext2D.filter is unavailable on the macOS 12 WebKit
// floor. Build each muted corpse frame once with universally supported
// alpha compositing instead.
const corpses = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();

export function corpseSprite(source: HTMLCanvasElement): HTMLCanvasElement {
  const cached = corpses.get(source);
  if (cached) return cached;

  const corpse = document.createElement("canvas");
  corpse.width = source.width;
  corpse.height = source.height;
  const ctx = corpse.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(source, 0, 0);
  // source-atop limits both fills to opaque sprite pixels.
  ctx.globalCompositeOperation = "source-atop";
  ctx.globalAlpha = 0.7;
  ctx.fillStyle = "#808080";
  ctx.fillRect(0, 0, corpse.width, corpse.height);
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, corpse.width, corpse.height);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  corpses.set(source, corpse);
  return corpse;
}
