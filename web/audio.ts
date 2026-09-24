// WebAudio playback for 'snd ' resources emitted as WAVs by
// tools/azpack.py. Buffers stay keyed by their resource name; the sim
// maps events (feed, glass tap zone, ambient loop) onto names lazily.
import type { AzpackManifest } from "../core/data/azpack.js";

/** The tank's sound settings, owned and persisted by the tank page and
 * edited from Preferences' Sound pane. */
export interface SoundConfig {
  /** Master level, 0 (silent) to 1 (each sound at its mixed gain). */
  volume: number;
  /** Silences everything but keeps `volume` for unmuting. */
  muted: boolean;
  bubbles: boolean;
  ambient: boolean;
}

export const SOUND_DEFAULTS: Readonly<SoundConfig> =
  Object.freeze<SoundConfig>({
    volume: 0.7, muted: false, bubbles: true, ambient: true,
  });

/** Trust boundary for localStorage payloads and bus messages: unknown
 * keys drop, wrong types fall back to the defaults, volume clamps. */
export function sanitizeSoundConfig(raw: unknown): SoundConfig {
  const c = { ...SOUND_DEFAULTS };
  if (!raw || typeof raw !== "object") return c;
  const r = raw as Record<string, unknown>;
  if (typeof r.volume === "number" && Number.isFinite(r.volume))
    c.volume = Math.min(1, Math.max(0, r.volume));
  for (const k of ["muted", "bubbles", "ambient"] as const) {
    const v = r[k];
    if (typeof v === "boolean") c[k] = v;
  }
  return c;
}

/** Install feedback is a taste of the sound, not the whole record: the
 * only Sounds add-on is a ~205 s song. Longer clips fade out and stop
 * after this many seconds. */
export const FEEDBACK_MAX_S = 4;
const FEEDBACK_FADE_S = 0.6;
/** Time constant of a master level change (about 3 tau to settle). */
const LEVEL_GLIDE_S = 0.01;

// The original game's sounds, by the names its 'snd ' resources carry
// (core/data/sndbank.ts), lowercased for lookup.
/** The filter's bubbling: the one sound the original loops, under all
 * the others. */
const FILTER_BUBBLING = "az bubble 9003";
/** Played once as an aquarium opens. */
const OPENING = "aqua";
/** The bubbling's own level is close to the effects', so it loops at
 * the gain single bubbles play at, under them. */
const AMBIENT_GAIN = 0.4;

export class TankAudio {
  private ctx: AudioContext | null = null;
  // Every sound's per-play gain feeds this one node, created with the
  // context, so volume and mute also reach sounds already playing.
  private master: GainNode | null = null;
  private volume = SOUND_DEFAULTS.volume;
  private muted = SOUND_DEFAULTS.muted;
  private bubblesOn = SOUND_DEFAULTS.bubbles;
  private ambientOn = SOUND_DEFAULTS.ambient;
  // The one install-feedback source still playing, so a newer install
  // (or Add Again) replaces it instead of stacking copies.
  private feedbackSrc: AudioBufferSourceNode | null = null;
  private buffers = new Map<string, AudioBuffer>();
  // Dropped/imported 'snd ' sets persist across pack loads — load()
  // only swaps manifest sounds, never user-supplied ones.
  private imported = new Map<string, AudioBuffer>();
  private ambientSrc: AudioBufferSourceNode | null = null;
  // Name:duration of the buffer the ambient loop plays — content
  // identity, so re-decoding the same file doesn't restart it (each
  // decode mints a fresh AudioBuffer object for identical bytes).
  private ambientKey = "";
  private ambientWanted = false;
  // Bumped by each startAmbient so a stale pending resume() retry can
  // tell it lost the race instead of starting a second loop.
  private ambientGen = 0;
  // Page hidden: rAF stops and the sim freezes, so the device sleeps too.
  private hidden = false;
  // The opening sound plays once per session: due from open() when the
  // set has one, and played as soon as audio runs.
  private openingDue = false;

  /** Merge a pack's manifest sounds into the table — a later pack
   * replaces only its same-named entries instead of wiping an earlier
   * pack's bindings. The ambient loop restarts when the bubbling pick
   * changed (addWavs' rule); callers still run startAmbient() for the
   * not-yet-playing case. */
  async load(read: (path: string) => Promise<Uint8Array>,
             manifest: AzpackManifest): Promise<void> {
    const sounds = manifest.sounds ?? [];
    if (sounds.length) {
      // context(), not a bare AudioContext: it also builds the master
      // gain every play() connects to.
      const ac = this.context();
      // Decode concurrently — sequential awaits made a 25-sound set
      // ~25x slower than the decoders allow. Each entry still fails
      // alone so one bad file keeps the rest.
      const decoded = await Promise.all(sounds.map(async (s) => {
        try {
          const raw = await read(s.file);
          // A copy: decodeAudioData detaches the buffer it is given.
          return { name: s.name,
                   data: await ac.decodeAudioData(raw.slice().buffer) };
        } catch (e) {
          console.warn(`audio skip ${s.file}:`, e);
          return null; // undecodable entry — keep the rest
        }
      }));
      for (const d of decoded) if (d) this.buffers.set(d.name, d.data);
    }
    const now = this.ambientPick();
    if (this.ambientWanted && now !== "" && now !== this.ambientKey) {
      if (this.ambientSrc) {
        try { this.ambientSrc.stop(); } catch { /* already ended */ }
        this.ambientSrc = null;
      }
      this.startAmbient();
    }
  }

  /** Merge decoded WAVs (e.g. from a dropped .rsrc) under their resource
   * names; same-name entries replace. Keeps manifest sounds loaded. */
  async addWavs(records: { name: string; wav: Uint8Array }[]): Promise<void> {
    if (records.length) {
      const ac = this.context();
      // Decode concurrently; each record still fails alone.
      const decoded = await Promise.all(records.map(async (r) => {
        try {
          // A copy: decodeAudioData detaches the buffer it is given.
          return { name: r.name,
                   data: await ac.decodeAudioData(r.wav.slice().buffer) };
        } catch (e) {
          console.warn(`audio skip imported ${r.name}:`, e);
          return null; // undecodable entry — keep the rest
        }
      }));
      for (const d of decoded) if (d) this.imported.set(d.name, d.data);
    }
    // A dropped bubbling sound can replace what's looping (or supply the
    // loop an earlier startAmbient found missing) — restart when the
    // buffer that would play now differs from the one currently selected.
    const now = this.ambientPick();
    if (this.ambientWanted && now !== "" && now !== this.ambientKey) {
      if (this.ambientSrc) {
        try { this.ambientSrc.stop(); } catch { /* already ended */ }
        this.ambientSrc = null;
      }
      this.startAmbient();
    }
  }

  private context(): AudioContext {
    if (this.ctx) return this.ctx;
    const ac = new AudioContext();
    this.master = ac.createGain();
    this.master.connect(ac.destination);
    this.ctx = ac;
    // Nothing plays yet, so the first level can be set outright.
    this.master.gain.value = this.level();
    // Created while hidden (say, a restore decoding sounds in a
    // background tab): stay asleep until setHidden(false).
    if (this.hidden)
      void ac.suspend().catch(() => { /* closed context */ });
    return ac;
  }

  private level(): number { return this.muted ? 0 : this.volume; }

  /** Glide the live master to the current level: a hard step in the
   * gain mid-waveform clicks on mute and zippers under a slider drag. */
  private applyLevel(): void {
    if (!this.master || !this.ctx) return;
    this.master.gain.setTargetAtTime(this.level(), this.ctx.currentTime,
                                     LEVEL_GLIDE_S);
  }

  /** Master level, clamped to 0..1. */
  setVolume(v: number): void {
    this.volume = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0;
    this.applyLevel();
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.applyLevel();
  }

  /** Switch bubble sounds and the ambient loop. Turning ambience off
   * stops a live loop; turning it back on restarts it. */
  setOptions(o: { bubbles?: boolean; ambient?: boolean }): void {
    if (o.bubbles !== undefined) this.bubblesOn = o.bubbles;
    if (o.ambient === undefined || o.ambient === this.ambientOn) return;
    this.ambientOn = o.ambient;
    if (o.ambient) {
      if (this.ctx) this.startAmbient();
      return;
    }
    if (this.ambientSrc) {
      try { this.ambientSrc.stop(); } catch { /* already ended */ }
      this.ambientSrc = null;
    }
    // Also aborts a loop still waiting on a pending resume() in play().
    this.ambientWanted = false;
    this.ambientGen++;
  }

  /** Browsers gate audio behind a user gesture; call from pointerdown,
   * a keydown handler, or any other activation path (native menu JS
   * still needs a prior gesture on some WebKit builds). */
  unlock(): void {
    if (!this.ctx) return;
    // Hidden, setHidden(false) resumes on return; waking the device
    // now would undo the suspend for nothing.
    if (this.hidden) return;
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
        this.playOpening();
        return this.startAmbient();
      })
      .catch((err) => {
        // Quiet only the documented no-activation rejection; surface
        // resume failures (closed context, etc.) and startAmbient throws.
        const expected = !resumed && err instanceof DOMException
          && err.name === "NotAllowedError";
        if (!expected)
          console.warn(resumed ? "audio start failed:" : "audio resume failed:", err);
      });
  }

  /** Suspend the audio device while the tank is hidden and resume it on
   * return. Suspending pauses a live ambient loop in place, so resuming
   * continues it; startAmbient only starts one when none is live (one
   * asked for while hidden, or whose gated start was dropped). */
  setHidden(hidden: boolean): void {
    this.hidden = hidden;
    const ac = this.ctx;
    if (!ac) return;
    if (hidden) {
      void ac.suspend().catch(() => { /* closed context */ });
      return;
    }
    void ac.resume()
      .then(() => {
        if (this.hidden) return;
        this.playOpening();
        if (this.ambientWanted) this.startAmbient();
      })
      .catch(() => { /* resume blocked until a user gesture */ });
  }

  /** Drop imported records (add-on uninstall). If the ambient loop was
   * playing one, restart it on whatever bubbling remains — same restart
   * rule as addWavs. */
  removeWavs(names: Iterable<string>): void {
    for (const n of names) this.imported.delete(n);
    // No non-empty guard here: deleting the loop's own sound must stop it.
    if (this.ambientWanted && this.ambientPick() !== this.ambientKey) {
      if (this.ambientSrc) {
        try { this.ambientSrc.stop(); } catch { /* already ended */ }
        this.ambientSrc = null;
      }
      this.startAmbient();
    }
  }

  /** Play one imported sound by name as install feedback: replaces any
   * feedback still playing, and records longer than FEEDBACK_MAX_S
   * fade out and stop there. */
  playImported(name: string): void {
    if (this.feedbackSrc) {
      try { this.feedbackSrc.stop(); } catch { /* already ended */ }
      this.feedbackSrc = null;
    }
    const buf = this.imported.get(name);
    // Not through play(): while the context is locked that queues the
    // sound until the first click, long after the install it answers.
    if (!buf || !this.ctx || this.ctx.state !== "running") return;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain();
    g.gain.value = 0.8;
    src.connect(g).connect(this.master!);
    src.start();
    if (buf.duration > FEEDBACK_MAX_S) {
      const t = this.ctx.currentTime;
      // Four time constants: down to about 2% when the stop cuts it.
      g.gain.setTargetAtTime(0, t + FEEDBACK_MAX_S - FEEDBACK_FADE_S,
                             FEEDBACK_FADE_S / 4);
      src.stop(t + FEEDBACK_MAX_S);
    }
    src.onended = () => {
      if (this.feedbackSrc === src) this.feedbackSrc = null;
    };
    this.feedbackSrc = src;
  }

  /** The first sound named one of `subs`, else the first whose name
   * contains one, passing over the sound named `skip`. */
  private find(subs: readonly string[], skip = ""): AudioBuffer | null {
    // Exact names beat substring hits globally — a bundled "drop" keeps
    // the feed slot over an unrelated import that merely contains the
    // substring. Within each pass, imported (user-dropped) sounds
    // still outrank bundled manifest ones — the drop is the more
    // deliberate, more recent act.
    for (const exact of [true, false])
      for (const map of [this.imported, this.buffers])
        for (const [name, buf] of map) {
          const n = name.toLowerCase();
          if (n === skip) continue;
          if (subs.some((s) => exact ? n === s : n.includes(s)))
            return buf;
        }
    return null;
  }

  /** Exact-name lookup (case-insensitive) for the original game's event
   * sounds. find()'s substring pass would let an unrelated import, a
   * song called "Switchfoot" say, stand in for the lamp's click. */
  private namedEntry(name: string): { name: string; buf: AudioBuffer } |
      null {
    const want = name.toLowerCase();
    for (const map of [this.imported, this.buffers])
      for (const [n, buf] of map)
        if (n.toLowerCase() === want) return { name: n, buf };
    return null;
  }

  private named(name: string): AudioBuffer | null {
    return this.namedEntry(name)?.buf ?? null;
  }

  /** Content key of whichever buffer would loop as ambience now, or
   * "" when the bank has no bubbling at all. name+duration alone can't
   * tell a same-length re-encode from the original, so the key also
   * probes the ends of channel 0. */
  private ambientPick(): string {
    const e = this.namedEntry(FILTER_BUBBLING);
    if (!e) return "";
    const d = e.buf.getChannelData(0);
    return `${e.name}:${e.buf.sampleRate}:${e.buf.duration}:` +
           `${d[0] ?? 0}:${d[d.length - 1] ?? 0}`;
  }

  private play(buf: AudioBuffer | null, gain = 0.8, loop = false,
               retry = true): AudioBufferSourceNode | null {
    if (!buf || !this.ctx) return null;
    // Hidden: drop the sound rather than resume() the device below. A
    // wanted ambient loop starts from setHidden(false) instead.
    if (this.hidden) return null;
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
    src.connect(g).connect(this.master!); // created with ctx
    src.start();
    return src;
  }

  feed(): void {
    this.play(this.find(["drop", "intowater"]), 0.7);
  }

  /** Fish entering the tank — the original's water-entry sound. */
  splash(): void {
    this.play(this.find(["intowater", "drop"]), 0.7);
  }

  /** A water change. Sets without the original's own sound for it
   * splash instead. */
  changeWater(): void {
    this.play(this.named("changewater") ?? this.find(["intowater", "drop"]),
              0.7);
  }

  /** The lamp's switch. */
  lampSwitch(): void {
    this.play(this.named("switch"), 0.8);
  }

  /** Scenery going in: a backdrop, gravel, plant or accessory. */
  sceneryIn(): void {
    this.play(this.named("intowaterbig"), 0.7);
  }

  /** A fish taken out of the tank. */
  fishOut(): void {
    this.play(this.named("letoutwater"), 0.7);
  }

  /** Tap sounds are positional in the original app. */
  tap(x: number, y: number, w: number, h: number): void {
    const dx = Math.min(x, w - x), dy = Math.min(y, h - y);
    let sub = "center";
    if (dx < w / 4 || dy < h / 4)
      // Compare normalized distances — the tank is wider than tall,
      // so raw pixels call near-side taps "top"/"bottom".
      sub = dx / w < dy / h ? "side" : (y < h - y ? "top" : "bottom");
    this.play(this.find([sub]) ?? this.find(["center", "side"]), 0.8);
  }

  /** A bubble rising. The original has no sound for one, so this plays
   * a short bubble sound the user added, never the filter's loop. */
  bubble(): void {
    if (!this.bubblesOn) return;
    this.play(this.find(["bubble"], FILTER_BUBBLING), 0.4);
  }

  /** The tank has opened with its saved sounds loaded: start the
   * bubbling, and play the opening sound now if audio may start by
   * itself (the app), else on the first unlock (a browser). */
  open(): void {
    this.openingDue = this.named(OPENING) !== null;
    this.startAmbient();
    this.playOpening();
  }

  private playOpening(): void {
    if (!this.openingDue || this.hidden || this.ctx?.state !== "running")
      return;
    this.openingDue = false;
    this.play(this.named(OPENING), 0.7, false, false);
  }

  /** Loop the filter's bubbling under everything, as the original does.
   * The "Water ambience" switch (setOptions' `ambient`) turns it off. */
  startAmbient(): void {
    if (!this.ambientOn || this.ambientSrc) return; // off, or already live
    this.ambientWanted = true;
    this.ambientKey = this.ambientPick();
    this.ambientGen++; // stale pending starts abort in play()
    this.ambientSrc =
      this.play(this.named(FILTER_BUBBLING), AMBIENT_GAIN, true);
  }
}
