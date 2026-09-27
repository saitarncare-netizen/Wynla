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

/** Does any day of the trip take place at this mountain? */
export function tripIncludesResort(t: TripShape, resortSlug: string): boolean {
  return expandTrip(t).includes(resortSlug);
}

/** Does the trip still have a day at this mountain that is not done? */
export function hasOpenDayAt(t: TripShape, resortSlug: string): boolean {
  const done = new Set(t.completed_days ?? []);
  return expandTrip(t).some((slug, i) => slug === resortSlug && !done.has(i + 1));
}

// ---------- Is it happening now? ----------

/** Slack after a trip's last day before it counts as over. It also
 *  absorbs the up-to-one-day gap between started_at's UTC date and the
 *  viewer's local `today`. */
export const TRIP_GRACE_DAYS = 2;

const DAY_MS = 86_400_000;
const LEADING_DATE = /^(\d{4})-(\d{2})-(\d{2})/;

/** Whole calendar days from `fromIso`'s date (a YYYY-MM-DD or a full ISO
 *  timestamp, read as its UTC date) to `today`; null if either is not a
 *  date. */
function daysFrom(fromIso: string, today: string): number | null {
  const a = LEADING_DATE.exec(fromIso);
  const b = LEADING_DATE.exec(today);
  if (!a || !b) return null;
  const from = Date.UTC(Number(a[1]), Number(a[2]) - 1, Number(a[3]));
  const to = Date.UTC(Number(b[1]), Number(b[2]) - 1, Number(b[3]));
  return Math.round((to - from) / DAY_MS);
}

/** Is `today` still inside the trip's run of days, counted from `anchor`
 *  (its first day), plus the grace? */
function withinTripWindow(anchor: string, totalDays: number, today: string): boolean {
  const elapsed = daysFrom(anchor, today);
  const length = Number.isFinite(totalDays) && totalDays >= 1 ? totalDays : 1;
  return elapsed != null && elapsed <= length + TRIP_GRACE_DAYS;
}

/**
 * A trip that is plausibly under way today: started (started_at is set by
 * the Start button or by the first day marked done), not every day done,
 * and started no more than
 * total_days + TRIP_GRACE_DAYS days ago. The age limit matters because
 * people rarely tick the last day: without it last season's half-ticked
 * trip would count as "running" forever and swallow every save for its
 * mountains.
 */
export function isRunningNow(t: TripShape, today: string): boolean {
  if (t.started_at == null || tripFinished(t)) return false;
  return withinTripWindow(t.started_at, t.total_days, today);
}

/**
 * A trip that is behind the person: every day done, or started but gone
 * quiet past its window (see isRunningNow), or never started but dated
 * (start_date) entirely before today's window.
 * A trip dated today or later is never past unless finished, whatever
 * started_at says: Start can be tapped days ahead, and a trip re-dated
 * after an earlier run keeps that run's started_at (TripActions edits
 * start_date alone). "+ Trip" refuses past trips (canSaveInto), so
 * without this it would turn away next month's trip.
 */
export function isPastTrip(t: TripShape & Pick<SaveTripRow, "start_date">, today: string): boolean {
  if (tripFinished(t)) return true;
  const start = tripStartDate(t);
  if (start != null && start >= today) return false;
  if (t.started_at != null) return !isRunningNow(t, today);
  return start != null && !withinTripWindow(start, t.total_days, today);
}

// ---------- Which trip, which day ----------

/**
 * The trip a save from `resortSlug` goes into, or null when no trip
 * includes that mountain (the button then offers to plan one).
 *   1. the trip running now (isRunningNow) that still has a day to ski
 *      at this mountain — one that already left it does not count;
 *   2. else the upcoming trip that starts soonest (start_date >= today);
 *   3. else the most recently edited trip, with the ones where this
 *      mountain is still ahead first — a past trip (finished, abandoned
 *      half-ticked, or dated before today) or a stop already skied is the
 *      last resort, not the default.
 * `today` is the viewer's local YYYY-MM-DD.
 * The button saves through pickSaveTarget, which turns that last resort
 * away rather than writing into last season's trip.
 */
export function pickTargetTrip<T extends SaveTripRow>(trips: T[], resortSlug: string, today: string): T | null {
  const withResort = trips.filter((t) => tripIncludesResort(t, resortSlug));
  if (withResort.length === 0) return null;
  const byUpdatedDesc = (a: T, b: T) => (b.updated_at ?? "").localeCompare(a.updated_at ?? "");

  const running = withResort
    .filter((t) => isRunningNow(t, today) && hasOpenDayAt(t, resortSlug))
    .sort((a, b) => (b.started_at ?? "").localeCompare(a.started_at ?? "") || byUpdatedDesc(a, b));
  if (running.length > 0) return running[0];

  const upcoming = withResort
    .filter((t) => !tripFinished(t) && (tripStartDate(t) ?? "") >= today)
    .sort((a, b) => tripStartDate(a)!.localeCompare(tripStartDate(b)!) || byUpdatedDesc(a, b));
  if (upcoming.length > 0) return upcoming[0];

  const behind = (t: T) => Number(!canSaveInto(t, resortSlug, today));
  const recent = [...withResort].sort((a, b) => behind(a) - behind(b) || byUpdatedDesc(a, b));
  return recent[0];
}

/**
 * May a place from `resortSlug` still be saved into this trip? Not when
 * the trip is behind the person (isPastTrip) or every day it has at this
 * mountain is done: the place would land in a trip nobody opens again,
 * and the card would then read "In trip" for it. A trip running now (with
 * a day left here) or dated ahead always passes.
 */
export function canSaveInto(t: TripShape & Pick<SaveTripRow, "start_date">, resortSlug: string, today: string): boolean {
  return !isPastTrip(t, today) && hasOpenDayAt(t, resortSlug);
}

/**
 * The trip "+ Trip" saves into: pickTargetTrip over the trips that pass
 * canSaveInto, so null when none here does. Null makes the button offer
 * to plan a trip instead of quietly filling last season's. Filtering
 * first (rather than checking pickTargetTrip's answer) only differs when
 * the soonest upcoming trip has every day here ticked ahead of time; the
 * next trip that can take the place is the better answer then.
 */
export function pickSaveTarget<T extends SaveTripRow>(trips: T[], resortSlug: string, today: string): T | null {
  return pickTargetTrip(
    trips.filter((t) => canSaveInto(t, resortSlug, today)),
    resortSlug,
    today,
  );
}

/**
 * The 1-based day a place saved from `resortSlug` is written under:
 *   - the trip is running and today's mountain is this one -> today
 *   - else the first day of the first stop at this mountain that still
 *     has a day to ski
 *   - else the first day at this mountain at all
 * Null when the trip does not include the mountain.
 * With `today`, "running" means isRunningNow, so an abandoned trip's
 * stale current_day is not trusted; without it, any started trip that
 * is not finished counts.
 */
export function pickTargetDay(trip: TripShape, resortSlug: string, today?: string): number | null {
  const days = expandTrip(trip);
  const cur = trip.current_day;
  const running = today != null ? isRunningNow(trip, today) : trip.started_at != null && !tripFinished(trip);
  if (running && cur != null && cur >= 1 && days[cur - 1] === resortSlug) return cur;
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

/** What the UI calls a trip: its name, else "<N>-day trip" (as /trips
 *  titles an unnamed one). */
export function tripLabel(t: Pick<SaveTripRow, "name" | "total_days">): string {
  const name = t.name?.trim();
  return name ? name : `${t.total_days}-day trip`;
}

/** True when the person has more than one trip at this mountain, so a
 *  confirmation must name the trip it saved into. */
export function hasSeveralTripsAt(trips: TripShape[], resortSlug: string): boolean {
  let n = 0;
  for (const t of trips) if (tripIncludesResort(t, resortSlug) && ++n > 1) return true;
  return false;
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

/**
 * Planner deep link that adds this mountain to the trip being planned, or
 * starts one with it. ?add=, not ?route=: a route seed replaces every
 * stop of the draft in progress, and people reach a nearby card mid-plan
 * (the map sheet, resort page and /go links use ?add= for the same
 * reason). No ?days: the planner's appendStop sizes the trip from the
 * draft plus this stop.
 */
export function planTripHref(resortSlug: string): string {
  return `/?plan=1&add=${encodeURIComponent(resortSlug)}`;
}

/** Sign-in link that comes back to `path` (pathname + search). Anything
 *  that is not a same-site path falls back to the map. */
export function signInHref(path: string): string {
  const next = path.startsWith("/") && !path.startsWith("//") ? path : "/";
  return `/login?next=${encodeURIComponent(next)}`;
}
