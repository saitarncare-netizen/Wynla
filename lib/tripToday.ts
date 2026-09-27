// Trip mode's "Today" model for /trip/[id]: which state the trip is in,
// which day and mountain today is, and the places to show for it.
//
// Saitarn's flow (2026-09-27): Start trip -> Google Maps to mountain 1
// only; at the mountain, open the app, see the places saved for it, tap
// Directions to each; Finish day 1 -> day 2 is mountain 2 with ITS saved
// places. Several nights at one mountain is one STOP: the next day keeps
// that mountain (no drive, nothing to "close") and shows the same places.
//
// Places are stored per day (lib/dayPlans.ts), so a stop's places are the
// union of every day in that stop, today's own saves first. Pure: the
// server page computes it and hands it to the client components.

import { unionPlaces, type DayPlace, type DayPlans } from "./dayPlans";
import { effectiveCurrentDay } from "./tripProgress";
import {
  ACTIVITY_CATEGORIES,
  RESTAURANT_CATEGORIES,
  type CategoryMeta,
} from "./nearbyCategories";

export type TodayState = "not_started" | "active" | "complete";

/** A run of consecutive days at the same mountain. */
export type TripStop = {
  slug: string;
  /** 1-based day numbers, ascending. */
  days: number[];
};

export type TodayInput = {
  /** The expanded itinerary: one resort slug per day, day 1 first. */
  daySlugs: string[];
  currentDay: number | null;
  completedDays: number[] | null;
  startedAt: string | null;
  /** trips.total_days. Only used when the itinerary is empty: the day
   *  list the page renders is the expanded slugs, so that length wins. */
  totalDays: number;
  dayPlans: DayPlans;
};

export type TodayModel = {
  state: TodayState;
  totalDays: number;
  /** Today's day: day 1 before the start, the last day once complete. */
  day: number;
  /** Today's resort slug, null only for an empty itinerary. */
  slug: string | null;
  /** Same mountain as yesterday: no drive today. */
  stayPut: boolean;
  /** The stop that contains today. */
  stop: TripStop | null;
  /** Everything saved for that stop, today's own saves first, deduped. */
  placesForStop: DayPlace[];
  /** Tomorrow, or null on the last day (and once the trip is complete). */
  nextDay: { day: number; slug: string; sameStop: boolean } | null;
  completedCount: number;
  lastCompletedDay: number | null;
};

/** Split the itinerary into stops: ["vail","vail","aspen"] ->
 *  [{vail,[1,2]},{aspen,[3]}]. A mountain visited twice with another in
 *  between is two stops (you drive back to it). */
export function tripStops(daySlugs: string[]): TripStop[] {
  const stops: TripStop[] = [];
  daySlugs.forEach((slug, i) => {
    const prev = stops[stops.length - 1];
    if (prev && prev.slug === slug) prev.days.push(i + 1);
    else stops.push({ slug, days: [i + 1] });
  });
  return stops;
}

/** The stop that contains `day` (1-based), or null when out of range. */
export function stopForDay(daySlugs: string[], day: number): TripStop | null {
  return tripStops(daySlugs).find((s) => s.days.includes(day)) ?? null;
}

export function tripToday(input: TodayInput): TodayModel {
  const { daySlugs, dayPlans } = input;
  const n = daySlugs.length > 0 ? daySlugs.length : Math.max(0, input.totalDays);
  // Days outside the itinerary (a trip shortened after they were
  // finished) do not count toward progress.
  const done = new Set((input.completedDays ?? []).filter((d) => Number.isInteger(d) && d >= 1 && d <= n));
  const started = input.startedAt != null;
  const allDone = n > 0 && done.size >= n;

  const state: TodayState = !started || n === 0 ? "not_started" : allDone ? "complete" : "active";
  const day =
    state === "not_started"
      ? 1
      : state === "complete"
        ? n
        : effectiveCurrentDay(
            { started_at: input.startedAt, current_day: input.currentDay, completed_days: [...done] },
            n,
          );

  const slug = daySlugs[day - 1] ?? null;
  const stop = slug == null ? null : stopForDay(daySlugs, day);
  const placesForStop = stop ? unionPlaces(dayPlans, [day, ...stop.days.filter((d) => d !== day)]) : [];
  const nextSlug = state !== "complete" && day < daySlugs.length ? daySlugs[day] : undefined;

  return {
    state,
    totalDays: n,
    day,
    slug,
    stayPut: day > 1 && slug != null && daySlugs[day - 2] === slug,
    stop,
    placesForStop,
    nextDay: nextSlug === undefined ? null : { day: day + 1, slug: nextSlug, sameStop: nextSlug === slug },
    completedCount: done.size,
    lastCompletedDay: done.size > 0 ? Math.max(...done) : null,
  };
}

const own = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);

/** Human label for a saved place's category key: "ski_shop" -> "Ski &
 *  board shops", an unknown key -> its words ("food_truck" -> "Food
 *  truck"), no key -> "Restaurant" / "Activity". */
export function placeCategoryLabel(p: Pick<DayPlace, "kind" | "category">): string {
  const fallback = p.kind === "restaurant" ? "Restaurant" : "Activity";
  const key = (p.category ?? "").trim();
  if (!key) return fallback;
  const table: Record<string, CategoryMeta> = p.kind === "restaurant" ? RESTAURANT_CATEGORIES : ACTIVITY_CATEGORIES;
  // hasOwnProperty, not `in`: "constructor" must not hit Object.prototype.
  if (own(table, key)) return table[key].label;
  const words = key.replace(/_/g, " ").replace(/\s+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : fallback;
}
