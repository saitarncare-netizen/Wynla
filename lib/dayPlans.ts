// Trip itinerary v2 — per-day plans. Stored in trips.day_plans (jsonb):
//   { "1": { note: "...", places: [DayPlace, …] }, "2": { … } }
// keyed by the EXPANDED day number (1-based, after days_per_resort
// expansion), because that's the unit the user thinks in ("day 1").
//
// The column may not exist yet (DDL in handoff-docs/sql/
// 2026-06-28-trip-day-plans.sql). The trip page selects * and passes
// `dayPlansEnabled` down so the UI hides itself until the column is live —
// no deploy needed when it lands.

export type DayPlace = {
  /** nearby_restaurants.id or nearby_activities.id */
  id: number;
  kind: "restaurant" | "activity";
  name: string;
  category: string | null;
  latitude: number | null;
  longitude: number | null;
  website_url: string | null;
};

export type DayPlan = {
  note?: string;
  places?: DayPlace[];
};

export type DayPlans = Record<string, DayPlan>;

const MAX_NOTE_LEN = 2000;
const MAX_PLACES_PER_DAY = 12;

/** Defensive parse — jsonb from the DB could be anything if hand-edited. */
export function parseDayPlans(raw: unknown): DayPlans {
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: DayPlans = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!/^\d+$/.test(k) || v == null || typeof v !== "object") continue;
    const plan = v as { note?: unknown; places?: unknown };
    const clean: DayPlan = {};
    if (typeof plan.note === "string" && plan.note.trim() !== "") {
      clean.note = plan.note.slice(0, MAX_NOTE_LEN);
    }
    if (Array.isArray(plan.places)) {
      const places: DayPlace[] = [];
      for (const p of plan.places) {
        if (p == null || typeof p !== "object") continue;
        const q = p as Record<string, unknown>;
        if (typeof q.id !== "number" || typeof q.name !== "string") continue;
        if (q.kind !== "restaurant" && q.kind !== "activity") continue;
        places.push({
          id: q.id,
          kind: q.kind,
          name: q.name.slice(0, 200),
          category: typeof q.category === "string" ? q.category : null,
          latitude: typeof q.latitude === "number" ? q.latitude : null,
          longitude: typeof q.longitude === "number" ? q.longitude : null,
          website_url: typeof q.website_url === "string" ? q.website_url : null,
        });
        if (places.length >= MAX_PLACES_PER_DAY) break;
      }
      if (places.length > 0) clean.places = places;
    }
    if (clean.note !== undefined || clean.places !== undefined) out[k] = clean;
  }
  return out;
}

/** Immutable single-day update; drops the day key when it becomes empty. */
export function withDayPlan(
  plans: DayPlans,
  day: number,
  update: DayPlan,
): DayPlans {
  const next: DayPlans = { ...plans };
  const isEmpty =
    (update.note === undefined || update.note.trim() === "") &&
    (update.places === undefined || update.places.length === 0);
  if (isEmpty) {
    delete next[String(day)];
  } else {
    const clean: DayPlan = {};
    if (update.note !== undefined && update.note.trim() !== "") {
      clean.note = update.note.slice(0, MAX_NOTE_LEN);
    }
    if (update.places !== undefined && update.places.length > 0) {
      clean.places = update.places.slice(0, MAX_PLACES_PER_DAY);
    }
    next[String(day)] = clean;
  }
  return next;
}
