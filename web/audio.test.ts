import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FEEDBACK_MAX_S, SOUND_DEFAULTS, sanitizeSoundConfig, TankAudio }
  from "./audio.js";
import type { AzpackManifest } from "../core/data/azpack.js";

// A minimal stand-in for WebAudio: records connections, gain values,
// scheduled fades and start()/stop() calls so the routing can be read
// back without an audio device.
class FakeParam {
  value = 1;
  targets: [number, number, number][] = [];
  setTargetAtTime(v: number, t: number, tau: number): void {
    this.targets.push([v, t, tau]);
  }
}
class FakeNode {
  out: FakeNode[] = [];
  connect<T extends FakeNode>(n: T): T { this.out.push(n); return n; }
}
class FakeGain extends FakeNode { gain = new FakeParam(); }
class FakeSource extends FakeNode {
  buffer: { duration: number } | null = null;
  loop = false;
  onended: (() => void) | null = null;
  starts = 0;
  stops: (number | undefined)[] = [];
  start(): void { this.starts++; }
  stop(t?: number): void { this.stops.push(t); }
}
class FakeContext {
  static last: FakeContext | null = null;
  state = "running";
  currentTime = 10;
  destination = new FakeNode();
  gains: FakeGain[] = [];
  sources: FakeSource[] = [];
  constructor() { FakeContext.last = this; }
  createGain(): FakeGain {
    const g = new FakeGain();
    this.gains.push(g);
    return g;
  }
  createBufferSource(): FakeSource {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  }
  // The "WAV" byte count doubles as the clip's length in seconds.
  decodeAudioData(buf: ArrayBuffer): Promise<{ duration: number }> {
    return Promise.resolve({ duration: buf.byteLength });
  }
  // State changes settle on a microtask, like the real ones.
  resume(): Promise<void> {
    return Promise.resolve().then(() => { this.state = "running"; });
  }
  suspend(): Promise<void> {
    return Promise.resolve().then(() => { this.state = "suspended"; });
  }
  /** Looping sources started and not stopped: live ambient loops. */
  loops(): number {
    return this.sources
      .filter((s) => s.loop && s.starts > 0 && !s.stops.length).length;
  }
}

const wav = (seconds: number): Uint8Array => new Uint8Array(seconds);
/** The original's filter bubbling, the one sound it loops. */
const LOOP = "AZ bubble 9003";

async function tank(names: Record<string, number>):
    Promise<{ audio: TankAudio; ac: FakeContext; master: FakeGain }> {
  const audio = new TankAudio();
  await audio.addWavs(Object.entries(names)
    .map(([name, s]) => ({ name, wav: wav(s) })));
  const ac = FakeContext.last!;
  // The first gain node is the master, wired straight to the device.
  const master = ac.gains[0]!;
  expect(master.out).toEqual([ac.destination]);
  return { audio, ac, master };
}

/** Where a gain is headed: its last glide target, else its value. */
const level = (p: FakeParam): number => p.targets.at(-1)?.[0] ?? p.value;

/** The master gain a source's chain ends in (source -> gain -> ?). */
const sinkOf = (s: FakeSource): FakeNode => s.out[0]!.out[0]!;

beforeEach(() => {
  FakeContext.last = null;
  vi.stubGlobal("AudioContext", FakeContext);
});
// restoreAllMocks too: a spy (console.warn in the load test) would
// otherwise stay mocked for every later test in the file.
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("TankAudio master gain", () => {
  it("routes every sound through the master and maps the volume", async () => {
    const { audio, ac, master } = await tank({ bubble: 1, drop: 1 });
    expect(master.gain.value).toBe(SOUND_DEFAULTS.volume);
    audio.bubble();
    audio.feed();
    expect(ac.sources).toHaveLength(2);
    for (const s of ac.sources) expect(sinkOf(s)).toBe(master);
    audio.setVolume(0.25);
    expect(level(master.gain)).toBe(0.25);
    audio.setVolume(3);
    expect(level(master.gain)).toBe(1);
  });

  it("applies settings made before the context existed", async () => {
    const audio = new TankAudio();
    audio.setVolume(0.4);
    audio.setMuted(true);
    await audio.addWavs([{ name: "bubble", wav: wav(1) }]);
    expect(FakeContext.last!.gains[0]!.gain.value).toBe(0);
    audio.setMuted(false);
    expect(level(FakeContext.last!.gains[0]!.gain)).toBe(0.4);
  });

  it("mute sets the master to 0 and unmute restores the volume", async () => {
    const { audio, master } = await tank({ bubble: 1 });
    audio.setVolume(0.5);
    audio.setMuted(true);
    expect(level(master.gain)).toBe(0);
    audio.setVolume(0.9); // adjusting while muted stays silent
    expect(level(master.gain)).toBe(0);
    audio.setMuted(false);
    expect(level(master.gain)).toBe(0.9);
  });

  it("glides a live level change instead of stepping it", async () => {
    const { audio, ac, master } = await tank({ bubble: 1 });
    const before = master.gain.value;
    audio.setMuted(true);
    expect(master.gain.value).toBe(before); // no instant write
    const [v, t] = master.gain.targets.at(-1)!;
    expect([v, t]).toEqual([0, ac.currentTime]);
  });
});

describe("TankAudio.load", () => {
  it("decodes a pack's sounds concurrently, through the master", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const manifest: AzpackManifest = {
      format: "azpack/1", tag: "T", version: 1, chunks: [], names: [],
      sounds: [{ name: "bubble", file: "s/bubble.wav" },
               { name: "bad", file: "s/bad.wav" }],
    };
    const audio = new TankAudio();
    await audio.load(async (path) => {
      if (path.includes("bad")) throw new Error("unreadable");
      return wav(1);
    }, manifest);
    const ac = FakeContext.last!;
    // A bare AudioContext here would leave no master for play() to use.
    const master = ac.gains[0]!;
    expect(master.out).toEqual([ac.destination]);
    audio.bubble(); // the bad entry is skipped, the good one plays
    expect(ac.sources).toHaveLength(1);
    expect(sinkOf(ac.sources[0]!)).toBe(master);
  });

  const manifestOf = (...sounds: [string, number][]): AzpackManifest => ({
    format: "azpack/1", tag: "T", version: 1, chunks: [], names: [],
    sounds: sounds.map(([name]) => ({ name, file: `s/${name}.wav` })),
  });
  const wavs = new Map<string, Uint8Array>();
  const readWav = async (path: string): Promise<Uint8Array> =>
    wavs.get(path)!;

  it("a second pack's load keeps the first pack's other sounds", async () => {
    // Manifests merge: pack B replaces its same-named entries, not the
    // whole table — dropping two .azpacks must not mute pack A.
    const audio = new TankAudio();
    wavs.set("s/drop.wav", wav(1)); wavs.set("s/bubble.wav", wav(1));
    await audio.load(readWav, manifestOf(["drop", 1]));
    await audio.load(readWav, manifestOf(["bubble", 1]));
    const ac = FakeContext.last!;
    audio.bubble();
    audio.feed(); // plays pack A's "drop" — wiped before the fix
    expect(ac.sources).toHaveLength(2);
  });

  it("restarts the ambient loop when a pack replaces its bubbling",
     async () => {
    const audio = new TankAudio();
    wavs.set(`s/${LOOP}.wav`, wav(30));
    await audio.load(readWav, manifestOf([LOOP, 30]));
    audio.startAmbient();
    const ac = FakeContext.last!;
    expect(ac.loops()).toBe(1);
    wavs.set(`s/${LOOP}.wav`, wav(60)); // same name, new take
    await audio.load(readWav, manifestOf([LOOP, 60]));
    const loops = ac.sources.filter((s) => s.loop);
    expect(loops[0]!.stops).toHaveLength(1); // old loop stopped
    expect(loops[1]!.starts).toBe(1);        // replacement running
    expect(ac.loops()).toBe(1);
  });

  it("leaves the loop alone when a load doesn't touch its bubbling",
     async () => {
    const audio = new TankAudio();
    wavs.set(`s/${LOOP}.wav`, wav(30)); wavs.set("s/bubble.wav", wav(1));
    await audio.load(readWav, manifestOf([LOOP, 30]));
    audio.startAmbient();
    const ac = FakeContext.last!;
    await audio.load(readWav, manifestOf(["bubble", 1]));
    const loop = ac.sources.filter((s) => s.loop)[0]!;
    expect(loop.stops).toHaveLength(0);
  });
});

describe("TankAudio options", () => {
  it("bubbles off makes bubble() silent", async () => {
    const { audio, ac } = await tank({ bubble: 1 });
    audio.setOptions({ bubbles: false });
    audio.bubble();
    expect(ac.sources).toHaveLength(0);
    audio.setOptions({ bubbles: true });
    audio.bubble();
    expect(ac.sources).toHaveLength(1);
  });

  it("ambient off stops a live loop and startAmbient does nothing",
     async () => {
    const { audio, ac } = await tank({ [LOOP]: 30 });
    audio.startAmbient();
    const loop = ac.sources[0]!;
    expect(loop.loop).toBe(true);
    audio.setOptions({ ambient: false });
    expect(loop.stops).toHaveLength(1);
    audio.startAmbient();
    expect(ac.sources).toHaveLength(1);
    // Turning it back on restarts the loop, once.
    audio.setOptions({ ambient: true });
    audio.setOptions({ ambient: true });
    expect(ac.sources).toHaveLength(2);
    expect(ac.sources[1]!.loop).toBe(true);
  });

  it("ambient off aborts a loop waiting on a locked context", async () => {
    const { audio, ac } = await tank({ [LOOP]: 30 });
    ac.state = "suspended";
    audio.startAmbient(); // queues a resume() retry
    audio.setOptions({ ambient: false });
    ac.state = "running";
    await Promise.resolve();
    await Promise.resolve();
    expect(ac.sources).toHaveLength(0);
  });
});

describe("TankAudio install feedback", () => {
  it("a second playImported stops the first", async () => {
    const { audio, ac, master } = await tank({ a: 1, b: 2 });
    audio.playImported("a");
    audio.playImported("b");
    const [first, second] = ac.sources;
    expect(first!.stops).toHaveLength(1);
    expect(second!.starts).toBe(1);
    expect(second!.stops).toHaveLength(0); // short clips play out
    expect(sinkOf(second!)).toBe(master);
  });

  it("an ended clip is not stopped again", async () => {
    const { audio, ac } = await tank({ a: 1, b: 1 });
    audio.playImported("a");
    ac.sources[0]!.onended!();
    audio.playImported("b");
    expect(ac.sources[0]!.stops).toHaveLength(0);
  });

  it("fades a long record and stops it after 4 s", async () => {
    const { audio, ac } = await tank({ Macinfish: 205 });
    audio.playImported("Macinfish");
    const src = ac.sources[0]!;
    expect(src.stops).toEqual([ac.currentTime + FEEDBACK_MAX_S]);
    const fade = (src.out[0] as FakeGain).gain.targets;
    expect(fade).toHaveLength(1);
    expect(fade[0]![0]).toBe(0);
    expect(fade[0]![1]).toBeGreaterThan(ac.currentTime);
    expect(fade[0]![1]).toBeLessThan(ac.currentTime + FEEDBACK_MAX_S);
  });

  it("stays silent while the context is locked", async () => {
    const { audio, ac } = await tank({ a: 1 });
    ac.state = "suspended";
    audio.playImported("a");
    ac.state = "running";
    await Promise.resolve();
    expect(ac.sources).toHaveLength(0);
  });
});

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe("TankAudio.setHidden", () => {
  it("keeps the device asleep when a gesture unlocks while hidden", async () => {
    const { audio, ac } = await tank({ [LOOP]: 30, bubble: 1 });
    audio.setHidden(true);
    await flush();
    audio.unlock();
    await flush();
    expect(ac.state).toBe("suspended");
    expect(ac.loops()).toBe(0);
  });

  it("suspends while hidden and resumes the same loop", async () => {
    const { audio, ac } = await tank({ [LOOP]: 30, bubble: 1 });
    audio.startAmbient();
    expect(ac.loops()).toBe(1);

    audio.setHidden(true);
    await flush();
    expect(ac.state).toBe("suspended");

    audio.setHidden(false);
    await flush();
    expect(ac.state).toBe("running");
    expect(ac.loops()).toBe(1);
  });

  it("plays nothing and doesn't wake the device while hidden", async () => {
    const { audio, ac } = await tank({ [LOOP]: 30, bubble: 1 });
    audio.setHidden(true);
    await flush();
    audio.bubble();
    audio.startAmbient();
    await flush();
    expect(ac.state).toBe("suspended");
    expect(ac.sources).toHaveLength(0);

    // The ambient asked for while hidden starts once on return.
    audio.setHidden(false);
    await flush();
    expect(ac.loops()).toBe(1);
  });

  it("never stacks a second loop when a pending start races the hide",
     async () => {
    const { audio, ac } = await tank({ [LOOP]: 30, bubble: 1 });
    ac.state = "suspended"; // autoplay-gated until a gesture
    audio.startAmbient();   // queues a resume() retry
    audio.setHidden(true);
    await flush();
    expect(ac.loops()).toBe(0);

    audio.setHidden(false);
    audio.unlock();         // a click right on return races the resume
    await flush();
    expect(ac.loops()).toBe(1);
  });

  it("creates the context suspended when hidden", async () => {
    const audio = new TankAudio();
    audio.setHidden(true);
    await audio.addWavs([{ name: LOOP, wav: wav(30) }]);
    audio.startAmbient();
    await flush();
    const ac = FakeContext.last!;
    expect(ac.state).toBe("suspended");
    expect(ac.loops()).toBe(0);
    audio.setHidden(false);
    await flush();
    expect(ac.loops()).toBe(1);
  });
});

// The original game's event sounds, by the names its 'snd ' resources
// carry (core/data/sndbank.ts). Durations tell the buffers apart.
describe("TankAudio event sounds", () => {
  const played = (ac: FakeContext): (number | undefined)[] =>
    ac.sources.map((s) => s.buffer?.duration);

  it("plays each event's own sound", async () => {
    const { audio, ac } = await tank({
      ChangeWater: 1, Switch: 2, IntoWaterBig: 3, letoutWater: 4,
    });
    audio.changeWater();
    audio.lampSwitch();
    audio.sceneryIn();
    audio.fishOut();
    expect(played(ac)).toEqual([1, 2, 3, 4]);
  });

  it("matches names exactly, so a song can't take an event", async () => {
    const { audio, ac } = await tank({
      "Switchfoot live": 1, "IntoWaterBig remix": 2, IntoWater: 3,
    });
    audio.lampSwitch();
    audio.sceneryIn();
    audio.fishOut();
    expect(ac.sources).toHaveLength(0);
  });

  it("splashes for a water change when the set has no sound for it",
     async () => {
    const { audio, ac } = await tank({ IntoWater: 5 });
    audio.changeWater();
    expect(played(ac)).toEqual([5]);
  });
});

describe("TankAudio bubbles, as the original plays them", () => {
  const played = (ac: FakeContext) =>
    ac.sources.map((s) => [s.buffer?.duration, s.loop]);

  it("loops the filter's bubbling and never plays it per bubble",
     async () => {
    const { audio, ac } = await tank({ [LOOP]: 30, aqua: 5 });
    audio.bubble();
    expect(ac.sources).toHaveLength(0);
    audio.startAmbient();
    expect(played(ac)).toEqual([[30, true]]);
  });

  it("plays a separate bubble sound for single bubbles", async () => {
    const { audio, ac } = await tank({ [LOOP]: 30, "bubble pop": 2 });
    audio.bubble();
    expect(played(ac)).toEqual([[2, false]]);
  });

  it("plays the opening sound once as the tank opens", async () => {
    const { audio, ac } = await tank({ [LOOP]: 30, aqua: 5 });
    audio.open();
    audio.unlock();
    await flush();
    expect(played(ac)).toEqual([[30, true], [5, false]]);
  });

  it("holds the opening sound for the first unlock when audio is locked",
     async () => {
    const { audio, ac } = await tank({ aqua: 5 });
    ac.state = "suspended";
    audio.open();
    await flush();
    expect(ac.sources).toHaveLength(0);
    audio.unlock();
    await flush();
    audio.unlock();
    await flush();
    expect(played(ac)).toEqual([[5, false]]);
  });

  it("owes no opening sound for a set installed after opening",
     async () => {
    const audio = new TankAudio();
    audio.open();
    await audio.addWavs([{ name: "aqua", wav: wav(5) }]);
    audio.unlock();
    await flush();
    expect(FakeContext.last!.sources).toHaveLength(0);
  });
});

// Trust boundary for localStorage and the Preferences bus messages.
describe("sanitizeSoundConfig", () => {
  it("returns defaults for non-objects", () => {
    for (const raw of [null, undefined, 42, "x", [1, 2], true])
      expect(sanitizeSoundConfig(raw)).toEqual(SOUND_DEFAULTS);
  });

  it("keeps valid values and drops unknown keys", () => {
    const c = sanitizeSoundConfig({ volume: 0.3, muted: true, bogus: 1 });
    expect(c).toEqual({ ...SOUND_DEFAULTS, volume: 0.3, muted: true });
    expect("bogus" in c).toBe(false);
  });

  it("clamps the volume and rejects wrong types", () => {
    expect(sanitizeSoundConfig({ volume: 5 }).volume).toBe(1);
    expect(sanitizeSoundConfig({ volume: -1 }).volume).toBe(0);
    const c = sanitizeSoundConfig({
      volume: NaN, muted: "yes", bubbles: 0, ambient: null,
    });
    expect(c).toEqual(SOUND_DEFAULTS);
  });

  it("round-trips a full config as a copy", () => {
    const off = { volume: 0, muted: true, bubbles: false, ambient: false };
    expect(sanitizeSoundConfig(off)).toEqual(off);
    const c = sanitizeSoundConfig(SOUND_DEFAULTS);
    expect(c).toEqual(SOUND_DEFAULTS);
    expect(c).not.toBe(SOUND_DEFAULTS);
  });
});
