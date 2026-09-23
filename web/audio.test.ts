import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TankAudio } from "./audio.js";

// Just enough of AudioContext for TankAudio: state transitions resolve
// on a microtask like the real ones, and every started source is kept
// so tests can count live loops.
interface FakeSource { loop: boolean; started: boolean }
class FakeAudioContext {
  static last: FakeAudioContext | null = null;
  state: AudioContextState = "running";
  sources: FakeSource[] = [];
  destination = {};
  constructor() { FakeAudioContext.last = this; }
  resume(): Promise<void> {
    return Promise.resolve().then(() => { this.state = "running"; });
  }
  suspend(): Promise<void> {
    return Promise.resolve().then(() => { this.state = "suspended"; });
  }
  decodeAudioData(): Promise<object> { return Promise.resolve({}); }
  createGain(): object {
    return { gain: { value: 1 }, connect: (n: unknown) => n };
  }
  createBufferSource(): object {
    const s = { buffer: null, loop: false, started: false,
                connect: (n: unknown) => n,
                start() { s.started = true; }, stop() {} };
    this.sources.push(s);
    return s;
  }
  loops(): number {
    return this.sources.filter((s) => s.loop && s.started).length;
  }
}

const flush = (): Promise<void> =>
  new Promise((r) => setTimeout(r, 0));

async function tankWithAmbient(): Promise<[TankAudio, FakeAudioContext]> {
  const a = new TankAudio();
  await a.addWavs([{ name: "aqua", wav: new Uint8Array(4) },
                   { name: "bubble", wav: new Uint8Array(4) }]);
  return [a, FakeAudioContext.last!];
}

describe("TankAudio.setHidden", () => {
  beforeEach(() => vi.stubGlobal("AudioContext", FakeAudioContext));
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the device asleep when a gesture unlocks while hidden", async () => {
    const [a, ac] = await tankWithAmbient();
    a.setHidden(true);
    await flush();
    a.unlock();
    await flush();
    expect(ac.state).toBe("suspended");
    expect(ac.loops()).toBe(0);
  });

  it("suspends while hidden and resumes the same loop", async () => {
    const [a, ac] = await tankWithAmbient();
    a.startAmbient();
    expect(ac.loops()).toBe(1);

    a.setHidden(true);
    await flush();
    expect(ac.state).toBe("suspended");

    a.setHidden(false);
    await flush();
    expect(ac.state).toBe("running");
    expect(ac.loops()).toBe(1);
  });

  it("plays nothing and doesn't wake the device while hidden",
     async () => {
    const [a, ac] = await tankWithAmbient();
    a.setHidden(true);
    await flush();
    a.bubble();
    a.startAmbient();
    await flush();
    expect(ac.state).toBe("suspended");
    expect(ac.sources.length).toBe(0);

    // The ambient asked for while hidden starts once on return.
    a.setHidden(false);
    await flush();
    expect(ac.loops()).toBe(1);
  });

  it("never stacks a second loop when a pending start races the hide",
     async () => {
    const [a, ac] = await tankWithAmbient();
    ac.state = "suspended"; // autoplay-gated until a gesture
    a.startAmbient();       // queues a resume() retry
    a.setHidden(true);
    await flush();
    expect(ac.loops()).toBe(0);

    a.setHidden(false);
    a.unlock();             // a click right on return races the resume
    await flush();
    expect(ac.loops()).toBe(1);
  });

  it("creates the context suspended when hidden", async () => {
    const a = new TankAudio();
    a.setHidden(true);
    await a.addWavs([{ name: "aqua", wav: new Uint8Array(4) }]);
    a.startAmbient();
    await flush();
    expect(FakeAudioContext.last!.state).toBe("suspended");
    expect(FakeAudioContext.last!.loops()).toBe(0);
    a.setHidden(false);
    await flush();
    expect(FakeAudioContext.last!.loops()).toBe(1);
  });
});
