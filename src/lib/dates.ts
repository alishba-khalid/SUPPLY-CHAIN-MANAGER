/**
 * Shared date helpers for the metrics/insights layers. All trailing-window
 * calculations are relative to the real system clock by default — this app
 * is backed by a live, reseedable Postgres database, not a frozen mock
 * snapshot, so "today" has to mean today.
 */

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function todayISODate(): string {
  return toISODate(new Date());
}

/** Adds `days` (may be negative) to an arbitrary ISO date string. */
export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toISODate(d);
}

export function daysBetween(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00Z`).getTime();
  const db = new Date(`${b}T00:00:00Z`).getTime();
  return Math.round((db - da) / 86_400_000);
}

export function isOnOrBefore(a: string, b: string): boolean {
  return a <= b;
}

/** True when `date` falls in (reference - windowDays, reference], inclusive of the reference date. */
export function isWithinTrailingWindow(
  date: string,
  windowDays: number,
  reference: string = todayISODate(),
): boolean {
  const start = addDays(reference, -windowDays);
  return date > start && date <= reference;
}
