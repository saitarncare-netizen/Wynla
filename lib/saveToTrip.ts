// Save-to-trip (2026-09-27) — the pure half of the "+ Trip" button on
// every nearby restaurant / activity card (components/SaveToTripButton).
// Saitarn's trip-mode ask: while browsing a mountain, save its places
// into the trip; during the trip, open the app at that mountain and see
// them again with a Directions button each.
//
// Places belong to a mountain STOP (a run of consecutive days at the same
// resort), not to one calendar day: someone staying three nights at Vail
// saves "Vail places", and every Vail day of the trip shows all of them.
// Storage stays the existing trips.day_plans jsonb ({"<day>": {note?,
// places?}}, see lib/dayPlans.ts) — a save is written under one day of the
// stop and the trip view unions the stop's days. No migration needed.
//
// Everything here is pure so the target-trip / target-day rules are unit
// tested; the component only does I/O.

import { withDayPlan, type DayPlace, type DayPlans } from "./dayPlans";
import { tripFinished, tripStartDate } from "./tripProgress";
import type { NearbyRow } from "./nearbyCategories";

/** Mirrors the per-day cap in lib/dayPlans.ts (withDayPlan truncates past
 *  it, so adding a 13th place would silently drop one). */
export const MAX_PLACES_PER_DAY = 12;

export type PlaceKind = DayPlace["kind"];

/** The trips columns the button reads. start_date and day_plans are
 *  optional because both arrived by DDL after launch and are
 *  feature-detected (absent key = column not added yet). */
export type SaveTripRow = {
  id: string;
  name: string | null;
  resort_slugs: string[];
  days_per_resort: number[] | null;
  total_days: number;
  current_day: number | null;
  completed_days: number[] | null;
  started_at: string | null;
  start_date?: string | null;
  updated_at?: string | null;
  day_plans?: unknown;
};

type TripShape = Pick<
  SaveTripRow,
  "resort_slugs" | "days_per_resort" | "total_days" | "current_day" | "completed_days" | "started_at"
>;

// ---------- Days and stops ----------

/**
 * One slug per trip day (index 0 = day 1). days_per_resort may be null
 * (rows saved before Stage 13 already store one slug per day) or shorter
 * than resort_slugs; a missing or non-positive count means one day. The
 * result never runs past total_days, the trip's own length.
 */
export function expandTripDays(
  resort_slugs: string[] | null | undefined,
  days_per_resort: number[] | null | undefined,
  total_days: number,
): string[] {
  const out: string[] = [];
  for (const [i, slug] of (resort_slugs ?? []).entries()) {
    const raw = days_per_resort?.[i];
    const reps = typeof raw === "number" && Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 1;
    for (let j = 0; j < reps; j++) out.push(slug);
  }
  if (Number.isFinite(total_days) && total_days >= 1 && out.length > total_days) out.length = total_days;
  return out;
}

export type TripStop = { slug: string; /** 1-based, ascending */ days: number[] };

/** Group expanded days into stops: consecutive days at the same resort.
 *  A resort visited twice with another in between is two stops. */
export function tripStops(days: string[]): TripStop[] {
  const stops: TripStop[] = [];
  days.forEach((slug, i) => {
    const last = stops[stops.length - 1];
    if (last && last.slug === slug) last.days.push(i + 1);
    else stops.push({ slug, days: [i + 1] });
  });
  return stops;
}

function expandTrip(t: TripShape): string[] {
  return expandTripDays(t.resort_slugs, t.days_per_resort, t.total_days);
}

function isActive(t: TripShape): boolean {
  return t.started_at != null && !tripFinished(t);
}

// ---------- Which trip, which day ----------

/**
 * The trip a save from `resortSlug` goes into, or null when no trip
 * includes that mountain (the button then offers to plan one).
 *   1. a trip running now (started, not every day done)
 *   2. else the upcoming trip that starts soonest (start_date >= today)
 *   3. else the most recently edited trip, unfinished ones first — a
 *      finished trip from last season is the last resort, not the default.
 * `today` is the viewer's local YYYY-MM-DD.
 */
export function pickTargetTrip<T extends SaveTripRow>(trips: T[], resortSlug: string, today: string): T | null {
  const withResort = trips.filter((t) => expandTrip(t).includes(resortSlug));
  if (withResort.length === 0) return null;
  const byUpdatedDesc = (a: T, b: T) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "");

  const active = withResort
    .filter(isActive)
    .sort((a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? "") || byUpdatedDesc(a, b));
  if (active.length > 0) return active[0];

  const upcoming = withResort
    .filter((t) => !tripFinished(t) && (tripStartDate(t) ?? "") >= today)
    .sort((a, b) => tripStartDate(a)!.localeCompare(tripStartDate(b)!) || byUpdatedDesc(a, b));
  if (upcoming.length > 0) return upcoming[0];

  const recent = [...withResort].sort(
    (a, b) => Number(tripFinished(a)) - Number(tripFinished(b)) || byUpdatedDesc(a, b),
  );
  return recent[0];
}

/**
 * The 1-based day a place saved from `resortSlug` is written under:
 *   - the trip is running and today's mountain is this one -> today
 *   - else the first day of the first stop at this mountain that still
 *     has a day to ski
 *   - else the first day at this mountain at all
 * Null when the trip does not include the mountain.
 */
export function pickTargetDay(trip: TripShape, resortSlug: string): number | null {
  const days = expandTrip(trip);
  const cur = trip.current_day;
  if (isActive(trip) && cur != null && cur >= 1 && days[cur - 1] === resortSlug) return cur;
  const done = new Set(trip.completed_days ?? []);
  const stops = tripStops(days).filter((s) => s.slug === resortSlug);
  const open = stops.find((s) => s.days.some((d) => !done.has(d)));
  if (open) return open.days[0];
  return stops.length > 0 ? stops[0].days[0] : null;
}

/**
 * The days a save may spill into, target first: the rest of the target
 * day's stop that is not completed yet. Because the trip view shows a
 * stop's places on every one of its days, a full first day can hand the
 * next place to day 2 of the same stop without the person noticing.
 */
export function stopDaysFrom(trip: TripShape, day: number): number[] {
  const stop = tripStops(expandTrip(trip)).find((s) => s.days.includes(day));
  if (!stop) return [day];
  const done = new Set(trip.completed_days ?? []);
  return [day, ...stop.days.filter((d) => d !== day && !done.has(d))];
}

// ---------- Editing day_plans ----------

export function placeKey(kind: PlaceKind, id: number): string {
  return `${kind}:${id}`;
}

/** The lowest day the place is saved on anywhere in the trip, or null. */
export function findPlaceDay(dayPlans: DayPlans, kind: PlaceKind, id: number): number | null {
  const days = Object.keys(dayPlans)
    .map(Number)
    .filter((d) => Number.isInteger(d))
    .sort((a, b) => a - b);
  for (const d of days) {
    if (dayPlans[String(d)]?.places?.some((p) => p.kind === kind && p.id === id)) return d;
  }
  return null;
}

export type AddPlaceResult =
  | { status: "added"; day: number; dayPlans: DayPlans }
  | { status: "already"; day: number }
  | { status: "full"; day: number };

/**
 * Add a place to one day. A place is saved at most once per trip, so a
 * place already on ANY day returns "already" (with that day) instead of
 * a second copy; a day at the cap returns "full". The day's note is kept.
 */
export function addPlaceToDay(dayPlans: DayPlans, day: number, place: DayPlace): AddPlaceResult {
  if (!Number.isInteger(day) || day < 1) throw new RangeError(`day must be a positive integer, got ${day}`);
  const existing = findPlaceDay(dayPlans, place.kind, place.id);
  if (existing != null) return { status: "already", day: existing };
  const cur = dayPlans[String(day)] ?? {};
  const places = cur.places ?? [];
  if (places.length >= MAX_PLACES_PER_DAY) return { status: "full", day };
  return {
    status: "added",
    day,
    dayPlans: withDayPlan(dayPlans, day, { note: cur.note, places: [...places, place] }),
  };
}

/** addPlaceToDay over a list of days (see stopDaysFrom): the first day
 *  with room wins; "full" (naming the first day) only when all are. */
export function addPlaceToStop(dayPlans: DayPlans, days: number[], place: DayPlace): AddPlaceResult {
  if (days.length === 0) throw new RangeError("days must not be empty");
  for (const d of days) {
    const res = addPlaceToDay(dayPlans, d, place);
    if (res.status !== "full") return res;
  }
  return { status: "full", day: days[0] };
}

/** Remove a place from every day it is on (normally one). Notes stay;
 *  a day left with no note and no places is dropped, as withDayPlan does.
 *  `day` is the first day it was removed from, or null if it was absent. */
export function removePlaceFromTrip(
  dayPlans: DayPlans,
  kind: PlaceKind,
  id: number,
): { dayPlans: DayPlans; day: number | null } {
  let next = dayPlans;
  let first: number | null = null;
  const days = Object.keys(dayPlans)
    .map(Number)
    .filter((d) => Number.isInteger(d))
    .sort((a, b) => a - b);
  for (const d of days) {
    const plan = next[String(d)];
    const places = plan?.places ?? [];
    if (!places.some((p) => p.kind === kind && p.id === id)) continue;
    if (first == null) first = d;
    next = withDayPlan(next, d, {
      note: plan?.note,
      places: places.filter((p) => !(p.kind === kind && p.id === id)),
    });
  }
  return { dayPlans: next, day: first };
}

/** A nearby row as the DayPlace the trip stores, or null when the row
 *  has no kind (the button hides itself then). Coordinates are coerced
 *  because PostgREST returns numeric columns as strings. */
export function toDayPlace(row: NearbyRow, kind: PlaceKind | undefined = row.kind): DayPlace | null {
  if (kind !== "restaurant" && kind !== "activity") return null;
  const num = (v: unknown): number | null => {
    if (v == null || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    id: row.id,
    kind,
    name: row.name,
    category: row.category ?? null,
    latitude: num(row.latitude),
    longitude: num(row.longitude),
    website_url: row.website_url ?? null,
  };
}

// ---------- Small I/O-adjacent helpers ----------

/** The viewer's calendar date as YYYY-MM-DD (not UTC: at 9 pm in Denver
 *  toISOString is already tomorrow). */
export function localTodayISO(now: Date): string {
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${m}-${d}`;
}

/** PostgREST / Postgres "that column does not exist" — what selecting
 *  trips.start_date or trips.day_plans returns before their DDL ran. */
export function isMissingColumnError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  return /column/i.test(err.message ?? "") && /does not exist|schema cache/i.test(err.message ?? "");
}

/** Planner deep link that starts a 2-day trip at this mountain. */
export function planTripHref(resortSlug: string): string {
  return `/?plan=1&route=${encodeURIComponent(resortSlug)}&days=2`;
}

/** Sign-in link that comes back to `path` (pathname + search). Anything
 *  that is not a same-site path falls back to the map. */
export function signInHref(path: string): string {
  const next = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return `/login?next=${encodeURIComponent(next)}`;
}
