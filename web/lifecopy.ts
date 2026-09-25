/**
 * Wording for the life model: the event notices the original showed
 * (STR# 20005 "A fish has died.", 20008 "A fish is sick.", 20014 "A
 * fish has recovered."), and the condition labels Overview, Get Info
 * and the hover tip share. Pure, so vitest can pin the text.
 */
import { DISEASES } from "../core/aquarium/disease.js";
import { CAUSES } from "../core/aquarium/life.js";
import type { AquariumEvent } from "../core/aquarium/aquarium.js";

export function diseaseName(i: number): string {
  return DISEASES[i]?.name ?? "an unknown disease";
}

export function causeName(i: number): string {
  return CAUSES[i] || "Unknown";
}

/** One line per event, naming the fish. */
export function eventText(e: AquariumEvent, fish: string): string {
  switch (e.kind) {
    case "died": return `${fish} has died. Cause: ${causeName(e.cause)}.`;
    case "sick": return `${fish} is sick with ${diseaseName(e.disease)}.`;
    case "recovered":
      return `${fish} has recovered from ${diseaseName(e.disease)}.`;
  }
}

/** Several events as one notice: the first few lines, then a count. */
export function noticeText(lines: readonly string[], max = 4): string {
  if (lines.length <= max) return lines.join("\n");
  const more = lines.length - max;
  return [...lines.slice(0, max),
          `…and ${more} more event${more === 1 ? "" : "s"}.`].join("\n");
}

/** A fish's condition as the bus carries it. */
export interface Condition {
  health?: number;
  sick?: number | null;
  dead?: number | null;
}

/** "Healthy", "Weak", "Sick: White Spot", "Dead: Starvation". */
export function conditionLabel(c: Condition): string {
  if (typeof c.dead === "number") return `Dead: ${causeName(c.dead)}`;
  if (typeof c.sick === "number") return `Sick: ${diseaseName(c.sick)}`;
  if (typeof c.health === "number" && c.health < 30) return "Weak";
  return "Healthy";
}
