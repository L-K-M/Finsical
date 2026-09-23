// WebAudio playback for 'snd ' resources emitted as WAVs by
// tools/azpack.py. Buffers stay keyed by their resource name; the sim
// maps events (feed, glass tap zone, ambient loop) onto names lazily.
import type { AzpackManifest } from "../core/data/azpack.js";

export class TankAudio {
  private ctx: AudioContext | null = null;
  private buffers = new Map<string, AudioBuffer>();
  // Dropped/imported 'snd ' sets persist across pack loads — load()
  // only swaps manifest sounds, never user-supplied ones.
  private imported = new Map<string, AudioBuffer>();
  private ambientSrc: AudioBufferSourceNode | null = null;
  private ambientBuf: AudioBuffer | null = null;
  private ambientWanted = false;
  // Bumped by each startAmbient so a stale pending resume() retry can
  // tell it lost the race instead of starting a second loop.
  private ambientGen = 0;

  async load(read: (path: string) => Promise<Uint8Array>,
             manifest: AzpackManifest): Promise<void> {
    if (this.ambientSrc) {
      try { this.ambientSrc.stop(); } catch { /* already ended */ }
      this.ambientSrc = null;
    }
    this.ambientBuf = null;
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

  /** Merge decoded WAVs (e.g. from a dropped .rsrc) under their resource
   * names; same-name entries replace. Keeps manifest sounds loaded. */
  async addWavs(records: { name: string; wav: Uint8Array }[]): Promise<void> {
    for (const r of records) {
      try {
        const ac = this.ctx ?? new AudioContext();
        this.ctx = ac;
        const raw = r.wav;
        const buf = raw.buffer.slice(raw.byteOffset,
                                     raw.byteOffset + raw.byteLength);
        this.imported.set(r.name, await ac.decodeAudioData(buf));
      } catch {
        // undecodable entry — keep the rest
      }
    }
    // A dropped "aqua" can outrank what's looping (or supply the ambient
    // an earlier startAmbient found missing) — restart when the buffer
    // that would play now differs from the one currently selected.
    const now = this.find("aqua");
    if (this.ambientWanted && now !== null && now !== this.ambientBuf) {
      if (this.ambientSrc) {
        try { this.ambientSrc.stop(); } catch { /* already ended */ }
        this.ambientSrc = null;
      }
      this.startAmbient();
    }
  }

  /** Browsers gate audio behind a user gesture; call from pointerdown,
   * a keydown handler, or any other activation path (native menu JS
   * still needs a prior gesture on some WebKit builds). */
  unlock(): void {
    if (!this.ctx) return;
    // Menu-driven unlock can resume() without a user activation and
    // reject — expected while suspended, quiet. startAmbient() is
    // already idempotent (ambientSrc guard). Log only failures after
    // *this* chain resumed (startAmbient threw, or a later step failed);
    // do not infer success from ctx.state — a concurrent resume() can
    // race this one and flip the state without this chain succeeding.
    let resumed = false;
    void this.ctx.resume()
      .then(() => {
        resumed = true;
        return this.startAmbient();
      })
      .catch((err) => {
        if (resumed) console.warn("audio unlock failed:", err);
      });
  }

  /** Play one imported sound by name — install feedback and the only
   * trigger for records (like an imported music track) that no sim
   * event maps onto. */
  playImported(name: string): void {
    this.play(this.imported.get(name) ?? null, 0.8);
  }

  private find(...subs: string[]): AudioBuffer | null {
    // Exact names beat substring hits globally — a bundled "aqua" keeps
    // the ambient slot over an unrelated import that merely contains
    // the substring. Within each pass, imported (user-dropped) sounds
    // still outrank bundled manifest ones — the drop is the more
    // deliberate, more recent act.
    for (const exact of [true, false])
      for (const map of [this.imported, this.buffers])
        for (const [name, buf] of map) {
          const n = name.toLowerCase();
          if (subs.some((s) => exact ? n === s : n.includes(s)))
            return buf;
        }
    return null;
  }

  private play(buf: AudioBuffer | null, gain = 0.8, loop = false,
               retry = true): AudioBufferSourceNode | null {
    if (!buf || !this.ctx) return null;
    if (this.ctx.state === "suspended" && retry) {
      const ac = this.ctx;
      const gen = this.ambientGen;
      void ac.resume()
        .then(() => {
          // Superseded by load(), a newer ambient call, or a second
          // ambient call that raced in while resume was pending.
          if (loop && (gen !== this.ambientGen || !this.ambientWanted ||
                       this.ambientSrc)) return;
          const n = this.play(buf, gain, loop, false);
          if (n && loop) this.ambientSrc = n; // keep the loop stoppable
        })
        .catch(() => { /* resume blocked until a user gesture */ });
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

  /** Fish entering the tank — the original's water-entry sound. */
  splash(): void {
    this.play(this.find("intowater", "drop"), 0.7);
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
    if (this.ambientSrc) return; // loop already live
    this.ambientWanted = true;
    this.ambientBuf = this.find("aqua");
    this.ambientGen++; // stale pending starts abort in play()
    this.ambientSrc = this.play(this.ambientBuf, 0.12, true);
  }
}
