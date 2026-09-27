// Trip mode's "Today" model for /trip/[id]: which state the trip is in,
// which day and mountain today is, and the places to show for it.
//
// Saitarn's flow (2026-09-27): Start trip -> Google Maps to mountain 1
// only; at the mountain, open the app, see the places saved for it, tap
// Directions to each; Finish day 1 -> day 2 is mountain 2 with ITS saved
// places. Several nights at one mountain is one STOP: the next day keeps
// that mountain (no drive, nothing to "close") and shows the same places.
//
// Places are stored per day (lib/dayPlans.ts), so today's places are the
// union of every day at today's MOUNTAIN: today's own saves first, then
// the rest of this stop, then any other visit to the same mountain. The
// last part matters because "+ Trip" saves a place once per TRIP, under
// the first stop at that mountain: on an out-and-back (Vail, Beaver
// Creek, Vail) or a stay split by a resort swap, the second Vail visit
// would otherwise show none of the Vail places. Pure: the server page
// computes it and hands it to the client components.
//
// The bottom of the file holds the pure halves of the trip page's own
// day_plans writes (DayPlan's delta edit, DayResortSwap's place move), so
// they reuse lib/saveToTrip's once-per-trip + 12-per-day rules and are
// unit tested here.

import { placeKey, unionPlaces, withDayPlan, type DayPlace, type DayPlans } from "./dayPlans";
import { addPlaceToDay, addPlaceToStop } from "./saveToTrip";
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
  /** Everything saved for today's mountain, deduped: today's own saves
   *  first, then the rest of this stop, then other visits to the same
   *  mountain (see mountainDaysFrom). */
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

/** Every day at `day`'s mountain, in the order its places are shown:
 *  `day` itself, the rest of its stop, then the other visits to the same
 *  mountain in trip order. Empty when `day` is out of range. */
export function mountainDaysFrom(daySlugs: string[], day: number): number[] {
  const stop = stopForDay(daySlugs, day);
  if (!stop) return [];
  const inStop = new Set(stop.days);
  const otherVisits = daySlugs.flatMap((s, i) => (s === stop.slug && !inStop.has(i + 1) ? [i + 1] : []));
  return [day, ...stop.days.filter((d) => d !== day), ...otherVisits];
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
  const placesForStop = stop ? unionPlaces(dayPlans, mountainDaysFrom(daySlugs, day)) : [];
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

// ---------- The trip page's day_plans edits ----------

/** One change from a day card (DayPlan). Any mix: a place add or remove
 *  also carries the note when the note has unsaved text. */
export type DayPlanEdit = {
  /** The day's whole note ("" clears it). */
  note?: string;
  /** Save this place on the day. */
  add?: DayPlace;
  /** Take this place (a placeKey) off the day. */
  remove?: string;
};

export type DayPlanEditResult = {
  dayPlans: DayPlans;
  /** False when the edit was already true of `plans` (the place is
   *  already there, or already gone): nothing to write. */
  changed: boolean;
  /** How the `add` went. "already" names the day the place is saved on
   *  (maybe this one); "full" means this day is at the 12-place cap. */
  add?: { status: "added" | "already" | "full"; day: number };
};

/**
 * Apply one day card edit as a DELTA to `plans`, which the caller has
 * just re-read from the database. The card's own copy of the day can be
 * stale: a place saved with "+ Trip" from the map sheet or another tab
 * after this page loaded is not in it, so writing the card's list back
 * would erase that place (a note edit) or resurrect one removed elsewhere
 * (an add). Only the one thing the person changed is applied:
 *   - note: replaces the note, keeps the fresh places;
 *   - remove: drops that one place from this day, keeps everything else;
 *   - add: lib/saveToTrip's addPlaceToDay, so a place is saved once per
 *     trip (on this day already, or on another: "already") and a day at
 *     the cap reports "full" instead of withDayPlan dropping a place.
 */
export function applyDayPlanEdit(plans: DayPlans, day: number, edit: DayPlanEdit): DayPlanEditResult {
  const key = String(day);
  let next = plans;
  if (edit.note !== undefined) {
    next = withDayPlan(next, day, { note: edit.note, places: next[key]?.places });
  }
  if (edit.remove !== undefined) {
    const cur = next[key] ?? {};
    next = withDayPlan(next, day, {
      note: cur.note,
      places: (cur.places ?? []).filter((p) => placeKey(p) !== edit.remove),
    });
  }
  let add: DayPlanEditResult["add"];
  if (edit.add) {
    const res = addPlaceToDay(next, day, edit.add);
    if (res.status === "added") next = res.dayPlans;
    add = { status: res.status, day: res.day };
  }
  // Only this day can have changed; parseDayPlans and withDayPlan build a
  // day's fields in the same order, so equal JSON means an equal plan.
  const changed = JSON.stringify(plans[key] ?? null) !== JSON.stringify(next[key] ?? null);
  return { dayPlans: next, changed, add };
}

/**
 * The days a swapped day's places move to, best first (see
 * movePlacesOnSwap). `daySlugsAfterSwap` is the itinerary with `day`
 * already pointing at its new mountain.
 */
export function swapTargetDays(daySlugsAfterSwap: string[], day: number, oldSlug: string): number[] {
  const atOld = (d: number) => daySlugsAfterSwap[d - 1] === oldSlug;
  // The old stay was one run of `oldSlug` days through `day`; the swap
  // split it into the part after `day` and the part before it.
  const after: number[] = [];
  for (let d = day + 1; d <= daySlugsAfterSwap.length && atOld(d); d++) after.push(d);
  let start = day;
  while (start > 1 && atOld(start - 1)) start--;
  const before: number[] = [];
  for (let d = start; d < day; d++) before.push(d);
  const stay = new Set([...after, ...before]);
  const otherVisits = daySlugsAfterSwap.flatMap((_, i) => (i + 1 !== day && atOld(i + 1) && !stay.has(i + 1) ? [i + 1] : []));
  return [...after, ...before, ...otherVisits];
}

/**
 * DayResortSwap: `day` now points at another mountain. Its places were
 * saved for the OLD one, and "+ Trip" writes a whole stay's places under
 * the stay's first day, so dropping them (the old behaviour) deleted every
 * Vail place when day 1 of a 3-night Vail stay became Beaver Creek, even
 * though days 2-3 are still Vail. They move instead, to:
 *   1. the rest of the old stay after `day`, the day after first (the
 *      first day of that run, where "+ Trip" would store them now);
 *   2. else the part of the stay before `day`, its first day first;
 *   3. else another visit to the old mountain (trip mode shows a
 *      mountain's places on every visit, see mountainDaysFrom);
 * spilling to the next of those days when one hits the 12-place cap, and
 * skipping a place already saved on another day (once per trip). They are
 * dropped only when no day at the old mountain is left, or all are full.
 * The swapped day keeps its note: a note is about the day, not the town.
 */
export function movePlacesOnSwap(
  plans: DayPlans,
  daySlugsAfterSwap: string[],
  day: number,
  oldSlug: string,
): DayPlans {
  const cur = plans[String(day)];
  const moving = cur?.places ?? [];
  if (moving.length === 0 || daySlugsAfterSwap[day - 1] === oldSlug) return plans;
  let next = withDayPlan(plans, day, { note: cur?.note, places: [] });
  const targets = swapTargetDays(daySlugsAfterSwap, day, oldSlug);
  if (targets.length === 0) return next;
  for (const place of moving) {
    const res = addPlaceToStop(next, targets, place);
    if (res.status === "added") next = res.dayPlans;
  }
  return next;
}
