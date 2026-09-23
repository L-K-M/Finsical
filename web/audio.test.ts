import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FEEDBACK_MAX_S, SOUND_DEFAULTS, sanitizeSoundConfig, TankAudio }
  from "./audio.js";

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
  resume(): Promise<void> { return Promise.resolve(); }
}

const wav = (seconds: number): Uint8Array => new Uint8Array(seconds);

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
afterEach(() => vi.unstubAllGlobals());

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
    const { audio, ac } = await tank({ aqua: 30 });
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
    const { audio, ac } = await tank({ aqua: 30 });
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
