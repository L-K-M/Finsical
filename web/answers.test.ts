import { afterEach, describe, expect, it, vi } from "vitest";
import { answerBook } from "./answers.js";

afterEach(() => vi.useRealTimers());

describe("answerBook", () => {
  it("settles each request with its own answer, or null in time", async () => {
    vi.useFakeTimers();
    const book = answerBook<boolean>();
    const a = book.wait("a", 1000);
    vi.advanceTimersByTime(1000);
    expect(await a).toBeNull();
    // A's answer comes late, while B waits: it must not settle B.
    const b = book.wait("b", 1000);
    book.settle("a", false);
    book.settle("b", true);
    expect(await b).toBe(true);
  });
});
