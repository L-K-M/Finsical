/** A bounded event history; corrupt imported entries must not break a tank. */
export interface DiaryEntry {
  date: string;
  event: string;
  fishId?: number;
}

export const DIARY_LIMIT = 50;

/** Read the latest records, dropping malformed entries and unsaved fields. */
export function sanitizeDiary(raw: unknown): DiaryEntry[] {
  if (!Array.isArray(raw)) return [];

  const out: DiaryEntry[] = [];
  for (const value of raw.slice(-DIARY_LIMIT)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    if (typeof v.date !== "string" || typeof v.event !== "string" ||
        !v.event.trim()) continue;

    const entry: DiaryEntry = { date: v.date, event: v.event };
    if (typeof v.fishId === "number" && Number.isInteger(v.fishId) &&
        v.fishId >= 0) entry.fishId = v.fishId;
    out.push(entry);
  }
  return out;
}
