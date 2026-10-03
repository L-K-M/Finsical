import { describe, expect, it } from "vitest";
import { DIARY_LIMIT, sanitizeDiary } from "./diary.js";

describe("saved diary", () => {
  it("keeps event identity without carrying runtime or invalid fields", () => {
    const entry = { date: "2026-10-03 12:00:00", event: "New fry: guppy",
                    fishId: 7, runtime: true };
    expect(sanitizeDiary([entry, { ...entry, fishId: -1 }]))
      .toEqual([
        { date: entry.date, event: entry.event, fishId: 7 },
        { date: entry.date, event: entry.event },
      ]);
    expect(entry.runtime).toBe(true);
  });

  it("bounds an imported history to the latest records", () => {
    const entries = Array.from({ length: DIARY_LIMIT + 10 }, (_, fishId) =>
      ({ date: "2026-10-03", event: "Golden meal!", fishId }));
    const out = sanitizeDiary(entries);
    expect(out).toHaveLength(DIARY_LIMIT);
    expect(out[0]?.fishId).toBe(10);
    expect(out[out.length - 1]?.fishId).toBe(DIARY_LIMIT + 9);
  });

  it("accepts old tanks and drops corrupt records", () => {
    for (const raw of [undefined, null, {}, "events"])
      expect(sanitizeDiary(raw)).toEqual([]);
    expect(sanitizeDiary([null, {}, { date: 1, event: "birth" },
                          { date: "today", event: " " }])).toEqual([]);
  });
});
