/**
 * All calendar math for the dual countdown engine.
 * Dates are stored as "YYYY-MM-DD" strings and parsed as LOCAL dates.
 */

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/** "2023-03-04" → "March 4, 2023" */
export function formatDate(s: string): string {
  return parseISODate(s).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export interface Elapsed {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

/** X years, Y months, Z days (calendar math) plus the ticking sub-day part. */
export function elapsedSince(startISO: string, now: Date): Elapsed {
  const start = parseISODate(startISO);
  if (now.getTime() < start.getTime()) {
    return { years: 0, months: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();
  if (days < 0) {
    months -= 1;
    // Number of days in the previous calendar month (day 0 = last day).
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return {
    years,
    months,
    days,
    hours: now.getHours(),
    minutes: now.getMinutes(),
    seconds: now.getSeconds(),
  };
}

export interface AnniversaryCountdown {
  /** The upcoming anniversary date. */
  date: Date;
  /** True if today is the anniversary. */
  isToday: boolean;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** 0…1 — how far through the current relationship year we are. */
  progress: number;
  /** Which anniversary number is being celebrated (1 = first). */
  yearNumber: number;
}

export function anniversaryCountdown(
  startISO: string,
  anniversaryISO: string,
  now: Date
): AnniversaryCountdown {
  const base = parseISODate(
    anniversaryISO && /^\d{4}-\d{2}-\d{2}$/.test(anniversaryISO)
      ? anniversaryISO
      : startISO
  );
  const start = parseISODate(startISO);
  const isToday =
    now.getMonth() === base.getMonth() && now.getDate() === base.getDate();

  let next = new Date(now.getFullYear(), base.getMonth(), base.getDate());
  if (next.getTime() < now.getTime()) {
    next = new Date(now.getFullYear() + 1, base.getMonth(), base.getDate());
  }
  const prev = new Date(next.getFullYear() - 1, base.getMonth(), base.getDate());

  const diff = next.getTime() - now.getTime();
  const clampedDiff = Math.max(0, diff);
  const progress = Math.min(
    1,
    Math.max(0, (now.getTime() - prev.getTime()) / (next.getTime() - prev.getTime()))
  );

  return {
    date: next,
    isToday,
    days: Math.floor(clampedDiff / 86_400_000),
    hours: Math.floor(clampedDiff / 3_600_000) % 24,
    minutes: Math.floor(clampedDiff / 60_000) % 60,
    seconds: Math.floor(clampedDiff / 1_000) % 60,
    progress: isToday ? 1 : progress,
    yearNumber: Math.max(1, next.getFullYear() - start.getFullYear()),
  };
}

/** 1…365/366 — drives the daily message rotation. */
export function dayOfYear(now: Date): number {
  return Math.floor(
    (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86_400_000
  );
}

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}

/** Milliseconds until the next occurrence of "HH:MM" (today or tomorrow). */
export function msUntilDailyTime(time: string, now: Date = new Date()): number {
  const [h, m] = time.split(":").map(Number);
  const target = new Date(now);
  target.setHours(h || 0, m || 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}
