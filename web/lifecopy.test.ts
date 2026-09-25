import { describe, expect, it } from "vitest";
import { conditionLabel, eventText, noticeText } from "./lifecopy.js";

describe("life copy", () => {
  it("words each event", () => {
    expect(eventText({ kind: "died", fish: 1, cause: 12 }, "Angelfish"))
      .toBe("Angelfish has died. Cause: Starvation.");
    expect(eventText({ kind: "sick", fish: 1, disease: 0 }, "Guppy"))
      .toBe("Guppy is sick with White Spot.");
    expect(eventText({ kind: "recovered", fish: 1, disease: 4 }, "Guppy"))
      .toBe("Guppy has recovered from Water Mold.");
  });

  it("folds a long list into a count", () => {
    expect(noticeText(["a", "b"])).toBe("a\nb");
    expect(noticeText(["a", "b", "c", "d", "e", "f"], 4))
      .toBe("a\nb\nc\nd\n…and 2 more events.");
  });

  it("labels a fish's condition, worst first", () => {
    expect(conditionLabel({ health: 80 })).toBe("Healthy");
    expect(conditionLabel({ health: 10 })).toBe("Weak");
    expect(conditionLabel({ health: 10, sick: 1 })).toBe("Sick: Tailrot");
    expect(conditionLabel({ sick: 1, dead: 13 })).toBe("Dead: Disease");
    expect(conditionLabel({ dead: 99 })).toBe("Dead: Unknown");
  });
});
