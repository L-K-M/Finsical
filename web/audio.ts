// WebAudio playback for 'snd ' resources emitted as WAVs by
// tools/azpack.py. Buffers stay keyed by their resource name; the sim
// maps events (feed, glass tap zone, ambient loop) onto names lazily.
import type { AzpackManifest } from "../core/data/azpack.js";

export class TankAudio {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  private ambientSrc: AudioBufferSourceNode | null = null;
  private ambientWanted = false;

  async load(read: (path: string) => Promise<Uint8Array>,
             manifest: AzpackManifest): Promise<void> {
    if (this.ambientSrc) {
      try { this.ambientSrc.stop(); } catch { /* already ended */ }
      this.ambientSrc = null;
    }
    this.ambientWanted = false;
    this.buffers.clear();
    for (const s of manifest.sounds ?? []) {
      try {
        const ac = this.ctx ?? new AudioContext();
        this.ctx = ac;
        const raw = await read(s.file);
        const buf = raw.buffer.slice(raw.byteOffset,
                                     raw.byteOffset + raw.byteLength);
        this.buffers.set(s.name, await ac.decodeAudioData(buf));
      } catch {
        // undecodable entry — keep the rest
      }
    }
  }

  /** Browsers gate audio behind a user gesture; call from pointerdown. */
  unlock(): void {
    if (!this.ctx) return;
    void this.ctx.resume().then(() => this.startAmbient());
  }

  private find(...subs: string[]): AudioBuffer | null {
    for (const [name, buf] of this.buffers)
      if (subs.some((s) => name.toLowerCase().includes(s))) return buf;
    return null;
  }

  private play(buf: AudioBuffer | null, gain = 0.8, loop = false,
               retry = true): AudioBufferSourceNode | null {
    if (!buf || !this.ctx) return null;
    if (this.ctx.state === "suspended" && retry) {
      const ac = this.ctx;
      void ac.resume().then(() => this.play(buf, gain, loop, false));
      return null;
    }
    if (this.ctx.state !== "running") return null;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.ctx.destination);
    src.start();
    return src;
  }

  feed(): void {
    this.play(this.find("drop", "intowater"), 0.7);
  }

  /** Tap sounds are positional in the original app. */
  tap(x: number, y: number, w: number, h: number): void {
    const dx = Math.min(x, w - x), dy = Math.min(y, h - y);
    let sub = "center";
    if (dx < w / 4 || dy < h / 4)
      sub = dx < dy ? "side" : (y < h - y ? "top" : "bottom");
    this.play(this.find(sub) ?? this.find("center", "side"), 0.8);
  }

  bubble(): void {
    this.play(this.find("bubble"), 0.4);
  }

  startAmbient(): void {
    if (this.ambientWanted) return;
    this.ambientWanted = true;
    this.ambientSrc = this.play(this.find("aqua"), 0.12, true);
  }
}
