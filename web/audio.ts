// WebAudio playback for 'snd ' resources emitted as WAVs by
// tools/azpack.py. Buffers stay keyed by their resource name; the sim
// maps events (feed, glass tap zone, ambient loop) onto names lazily.
import type { AzpackManifest } from "../core/data/azpack.js";

/** Volume preferences, as the prefs pane and the bus carry them.
 * master/ambient run 0..1; muted silences everything while the levels
 * survive (classic Sound control panel behavior). */
export interface SoundConfig {
  master: number;
  ambient: number;
  muted: boolean;
}
export const SOUND_DEFAULTS: Readonly<SoundConfig> =
  Object.freeze({ master: 0.8, ambient: 0.7, muted: false });

/** Clamp an untrusted config (bus message, storage) onto the defaults. */
export function sanitizeSoundConfig(raw: unknown): SoundConfig {
  const c = { ...SOUND_DEFAULTS };
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    for (const k of ["master", "ambient"] as const)
      if (typeof r[k] === "number" && Number.isFinite(r[k] as number))
        c[k] = Math.min(1, Math.max(0, r[k] as number));
    if (typeof r.muted === "boolean") c.muted = r.muted;
  }
  return c;
}

/** The ambient loop's base level — the ambient slider scales it. */
const AMBIENT_BASE = 0.12;

export class TankAudio {
  private ctx: AudioContext | null = null;
  /** Master bus every source connects through; null before the first
   * AudioContext exists (created lazily with it). */
  private masterGain: GainNode | null = null;
  /** The live ambient loop's own gain node, for live level changes. */
  private ambientGain: GainNode | null = null;
  private vol: SoundConfig = { ...SOUND_DEFAULTS };
  private dead = false;
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
    this.ambientGain = null;
    this.ambientBuf = null;
    this.ambientWanted = false;
    this.buffers.clear();
    for (const s of manifest.sounds ?? []) {
      try {
        const ac = this.ac();
        if (!ac) break;
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
        const ac = this.ac();
        if (!ac) break;
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

  /** True once AudioContext creation is known to fail — the prefs
   * pane dims its controls and says so. */
  get usable(): boolean { return !this.dead; }

  get volume(): SoundConfig { return { ...this.vol }; }

  /** Apply new levels; live sources follow, nothing restarts. */
  setVolume(v: SoundConfig): void {
    this.vol = sanitizeSoundConfig(v);
    if (this.masterGain)
      this.masterGain.gain.value = this.vol.muted ? 0 : this.vol.master;
    if (this.ambientGain)
      this.ambientGain.gain.value = AMBIENT_BASE * this.vol.ambient;
  }

  /** The shared context (and its master bus), created on first use. */
  private ac(): AudioContext | null {
    if (this.ctx) return this.ctx;
    if (this.dead) return null;
    try {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
      this.setVolume(this.vol);
      return this.ctx;
    } catch {
      this.dead = true; // no WebAudio — every call degrades to silence
      return null;
    }
  }

  /** Browsers gate audio behind a user gesture; call from pointerdown. */
  unlock(): void {
    if (!this.ctx) return;
    void this.ctx.resume().then(() => this.startAmbient());
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
    const ac = this.ac();
    if (!buf || !ac) return null;
    if (ac.state === "suspended" && retry) {
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
    if (ac.state !== "running") return null;
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    const g = ac.createGain();
    g.gain.value = gain;
    src.connect(g).connect(this.masterGain ?? ac.destination);
    if (loop) {
      // The ambient loop rides its own gain node so the slider can
      // trim it live; the master bus still governs the final level.
      this.ambientGain?.disconnect();
      this.ambientGain = g;
    }
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
    this.ambientSrc = this.play(
      this.ambientBuf, AMBIENT_BASE * this.vol.ambient, true);
  }
}
