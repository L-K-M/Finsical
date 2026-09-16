import { Sim } from "../core/sim.js";

const TANK = { width: 320, height: 200 };

const canvas = document.getElementById("tank") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
ctx.imageSmoothingEnabled = false;

const sim = new Sim(TANK, 0x9003);
for (let i = 0; i < 4; i++) {
  sim.addFish({
    x: 40 + i * 60,
    y: 50 + i * 30,
    facing: i % 2 ? -1 : 1,
    speed: 0.6 + i * 0.2,
  });
}

// Placeholder sprite until real Aquazone assets are imported.
function drawFish(x: number, y: number, facing: number): void {
  ctx.save();
  ctx.translate(Math.round(x), Math.round(y));
  ctx.scale(-facing, 1);
  ctx.fillStyle = "#e8a33d";
  ctx.fillRect(-8, -4, 14, 8);   // body
  ctx.fillRect(6, -6, 6, 12);    // tail
  ctx.fillRect(-2, -7, 6, 3);    // dorsal
  ctx.fillStyle = "#1a1a2e";
  ctx.fillRect(-6, -2, 2, 2);    // eye
  ctx.restore();
}

const tankGradient = (() => {
  const g = ctx.createLinearGradient(0, 0, 0, TANK.height);
  g.addColorStop(0, "#1a4d7a");
  g.addColorStop(1, "#0b2a45");
  return g;
})();

function render(): void {
  ctx.fillStyle = tankGradient;
  ctx.fillRect(0, 0, TANK.width, TANK.height);
  for (const f of sim.fish) drawFish(f.x, f.y, f.facing);
}

// Fixed-step sim; render on rAF.
const TICKS_PER_SECOND = 30;
let acc = 0;
let last = performance.now();
function frame(now: number): void {
  acc += Math.min(now - last, 200);
  last = now;
  const step = 1000 / TICKS_PER_SECOND;
  while (acc >= step) {
    sim.tick();
    acc -= step;
  }
  render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
