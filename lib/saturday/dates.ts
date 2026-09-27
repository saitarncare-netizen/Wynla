// Calendar helpers for the Saturday picks page and the Thursday email.
//
// "This Saturday" is decided in the rider's city clock (America/New_York
// for the launch cities; Chicago / Minneapolis are Central), never in
// the server's UTC: a Friday-night visitor in New York at 11 PM is still
// planning for tomorrow even though it is already Saturday in UTC. Every
// function here works on calendar parts read through Intl and on
// Date.UTC arithmetic over those parts, so DST changes (which shift the
// clock, not the calendar) cannot move a date by a day.

import { calendarParts } from "@/lib/crowdForecast";
import { localDate } from "@/lib/weather/time";

export const DEFAULT_TIME_ZONE = "America/New_York";

export type WeekendDay = "sat" | "sun";

const WEEKDAY_INDEX: Record<WeekendDay, number> = { sat: 6, sun: 0 };
const MS_PER_DAY = 86_400_000;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: string | null | undefined): value is string {
  return !!value && ISO_DATE.test(value) && Number.isFinite(Date.parse(`${value}T00:00:00Z`));
}

function isoFromParts(year: number, month: number, day: number): string {
  return new Date(Date.UTC(year, month, day)).toISOString().slice(0, 10);
}

/** Today's calendar date in the given zone, as 'YYYY-MM-DD'. */
export function todayIso(now: Date, timeZone: string = DEFAULT_TIME_ZONE): string {
  return localDate(now, timeZone);
}

/**
 * The Saturday (or Sunday) on or after today in the given zone. On a
 * Saturday the answer is today, because someone opening the page at
 * 7 AM on Saturday wants today's call, not next week's; on a Sunday
 * "sat" rolls to the coming Saturday and "sun" is today.
 */
export function upcomingWeekendDate(
  now: Date,
  day: WeekendDay = "sat",
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const { year, month, day: dom, weekday } = calendarParts(now, timeZone);
  const ahead = (WEEKDAY_INDEX[day] - weekday + 7) % 7;
  return isoFromParts(year, month, dom + ahead);
}

/** Whole days from `fromIso` to `toIso` (negative when `toIso` is earlier). */
export function daysBetween(fromIso: string, toIso: string): number {
  return Math.round((Date.parse(`${toIso}T00:00:00Z`) - Date.parse(`${fromIso}T00:00:00Z`)) / MS_PER_DAY);
}

/** 'YYYY-MM-DD' shifted by whole days. */
export function shiftIso(iso: string, days: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Weekday index (0 = Sunday) of a calendar date. */
export function weekdayOf(iso: string): number {
  return new Date(`${iso}T12:00:00Z`).getUTCDay();
}

/** True when `now` falls on a Thursday in the given zone. */
export function isThursdayIn(now: Date, timeZone: string = DEFAULT_TIME_ZONE): boolean {
  return calendarParts(now, timeZone).weekday === 4;
}

/** "Saturday, Jan 17" — the long form for headings. */
export function formatTargetDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Sat Jan 17" — the short form for chips, subjects and the share card. */
export function formatTargetDateShort(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "Jan 17" without the weekday, for blackout and opening-date copy. */
export function formatMonthDay(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/** "6 h ago" / "2 days ago" / "just now" for data-age labels. */
export function formatAge(iso: string | null | undefined, now: Date): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const mins = Math.max(0, Math.round((now.getTime() - t) / 60_000));
  if (mins < 2) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 36) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

/** Hours since an ISO timestamp, or null when unknown. */
export function hoursSince(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? (now.getTime() - t) / 3_600_000 : null;
}
