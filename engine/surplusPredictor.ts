export type SurplusPattern = {
  dayOfWeek: number; // 0 = Sunday
  hourBlock: string; // e.g. "18:00–21:00"
  count: number;
};

const BLOCK_HOURS = 3;
const MIN_OCCURRENCES = 2;

function hourBlockLabel(hour: number): string {
  const startHour = Math.floor(hour / BLOCK_HOURS) * BLOCK_HOURS;
  const endHour = (startHour + BLOCK_HOURS) % 24;
  const pad = (h: number) => String(h).padStart(2, "0");
  return `${pad(startHour)}:00–${pad(endHour)}:00`;
}

/**
 * Simple frequency-based pattern detection over a donor's past listing
 * creation times — buckets by day-of-week + 3-hour block, surfaces buckets
 * that recur at least MIN_OCCURRENCES times. Not a learned model; just
 * counting, per the "simple historical pattern model" scope.
 */
export function detectPatterns(createdAtTimestamps: Date[]): SurplusPattern[] {
  const counts = new Map<string, SurplusPattern>();

  for (const ts of createdAtTimestamps) {
    const dayOfWeek = ts.getDay();
    const hourBlock = hourBlockLabel(ts.getHours());
    const key = `${dayOfWeek}|${hourBlock}`;
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { dayOfWeek, hourBlock, count: 1 });
    }
  }

  return Array.from(counts.values())
    .filter((p) => p.count >= MIN_OCCURRENCES)
    .sort((a, b) => b.count - a.count);
}
