// Trip-planner draft: storage, the "Add to trip" command and the per-stop
// day stepper. Pure functions + two tiny storage wrappers, split out of
// components/Map/TripPlannerPanel.tsx so the rules are unit-tested
// (lib/plannerDraft.test.ts) and so the resort sheet's action bar can ask
// "is a trip in progress?" without importing the whole planner.
//
// Model since 2026-09-27: a trip is as long as its stops. Adding a
// mountain or tapping + on a stop grows the trip by that many days (up to
// MAX_TRIP_DAYS) instead of hitting a "no days left" wall; − on a fully
// planned trip shrinks it again. The set-days wizard still exists as a
// starting target for people who plan from the header.

import { useMemo, useSyncExternalStore } from "react";
import type { Stop } from "./tripPlanner";

// Longest trip the planner lets you build. Matches the live DB check
// (trips.total_days BETWEEN 1 AND 14) so a save never fails on length.
// handoff-docs/sql/2026-09-23-planner.sql has an optional block that
// raises the constraint to 30 — bump this constant with it.
export const MAX_TRIP_DAYS = 14;

// localStorage key for the draft stashed by Save when the person is not
// signed in. /login keeps `next`, so after the 6-digit code (same tab) or
// the email link / Google (possibly a new tab, where sessionStorage is
// empty) they land back on the map with ?restore=1 and the planner
// hydrates from here, then clears the key. 1-hour TTL guards against
// stale drafts from old sessions.
export const DRAFT_KEY = "wynla_pending_trip_draft";
export const DRAFT_TTL_MS = 60 * 60 * 1000;
// sessionStorage mirror of the live draft. Written on every change so a
// refresh, a back-navigation from /resort/[slug], or iOS evicting the tab
// does not throw away a half-built trip. Per-tab by design: two tabs
// planning two trips must not clobber each other.
export const SESSION_DRAFT_KEY = "wynla_planner_draft_v1";
export const SESSION_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
// Same-tab change signal for the session draft. The browser's `storage`
// event only fires in OTHER tabs, and sessionStorage is per tab, so the
// resort sheet would never hear about a stop added in this tab without it.
export const PLANNER_DRAFT_EVENT = "wynla:planner-draft";

export type TripDraft = {
  stops: Stop[];
  draftName: string;
  /** YYYY-MM-DD or empty when the user has not picked a date. */
  startDate?: string;
  /** Trip length the user chose. Restored so a draft opened from a URL
      without ?days does not read "5 of 1 days planned". */
  days?: number;
  savedAt: number;
  /** Set only on the login-stash copy written by Save: the person asked
      to save, so the planner saves once on its own after sign-in instead
      of making them tap Save a second time. */
  pendingSave?: boolean;
};

function isValidStop(value: unknown): value is Stop {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.slug === "string" && v.slug.length > 0 && typeof v.days === "number" && v.days >= 1;
}

/**
 * Parse a stored draft. Null for missing, expired, malformed or empty
 * drafts. Unknown fields are ignored, which is how drafts written before
 * the cost estimate was removed (they carry `partySize`) still load.
 */
export function parseDraft(raw: string | null, ttlMs: number, now: number = Date.now()): TripDraft | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Partial<TripDraft> | null;
    if (!draft || typeof draft !== "object") return null;
    const savedAt = typeof draft.savedAt === "number" ? draft.savedAt : 0;
    if (now - savedAt >= ttlMs) return null;
    if (!Array.isArray(draft.stops)) return null;
    const stops = draft.stops.filter(isValidStop).map((s) => ({ slug: s.slug, days: Math.floor(s.days) }));
    if (stops.length === 0) return null;
    return {
      stops,
      draftName: typeof draft.draftName === "string" ? draft.draftName : "",
      startDate: typeof draft.startDate === "string" ? draft.startDate : "",
      days:
        typeof draft.days === "number" && Number.isFinite(draft.days)
          ? Math.min(MAX_TRIP_DAYS, Math.max(1, Math.floor(draft.days)))
          : undefined,
      savedAt,
      pendingSave: draft.pendingSave === true,
    };
  } catch {
    // Bad JSON — treat as no draft.
    return null;
  }
}

export function readStorage(storage: "local" | "session", key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    const s = storage === "local" ? window.localStorage : window.sessionStorage;
    return s.getItem(key);
  } catch {
    // Private browsing / blocked storage — behave as if empty.
    return null;
  }
}

export function writeStorage(storage: "local" | "session", key: string, value: string | null) {
  try {
    if (typeof window === "undefined") return;
    const s = storage === "local" ? window.localStorage : window.sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // Quota / private mode — the draft just isn't preserved.
  }
  if (storage === "session" && key === SESSION_DRAFT_KEY && typeof window !== "undefined") {
    window.dispatchEvent(new Event(PLANNER_DRAFT_EVENT));
  }
}

/** Stop slugs of a stored draft as one comma-joined string ("" = none).
    A string so useSyncExternalStore can compare snapshots by value. */
export function draftSlugsKey(raw: string | null, now: number = Date.now()): string {
  const draft = parseDraft(raw, SESSION_DRAFT_TTL_MS, now);
  return draft ? draft.stops.map((s) => s.slug).join(",") : "";
}

function subscribePlannerDraft(onChange: () => void): () => void {
  window.addEventListener(PLANNER_DRAFT_EVENT, onChange);
  // bfcache restore / tab switch: the planner may have written while
  // this component was frozen.
  window.addEventListener("pageshow", onChange);
  return () => {
    window.removeEventListener(PLANNER_DRAFT_EVENT, onChange);
    window.removeEventListener("pageshow", onChange);
  };
}

function readDraftSlugsKey(): string {
  return draftSlugsKey(readStorage("session", SESSION_DRAFT_KEY));
}

/**
 * Slugs of the trip being planned in this tab (empty when none). SSR-safe:
 * the server snapshot is "no draft", and the client re-renders with the
 * stored draft after hydration.
 */
export function usePlannerDraftSlugs(): string[] {
  const key = useSyncExternalStore(subscribePlannerDraft, readDraftSlugsKey, () => "");
  return useMemo(() => (key ? key.split(",") : []), [key]);
}

export function plannedDays(stops: Stop[]): number {
  return stops.reduce((sum, s) => sum + s.days, 0);
}

/** MapPage's ?days parse (absent or junk = 1), capped at the planner max.
    The planner reads it from window.location when it must not trust a
    searchParams snapshot that an earlier replaceState already outdated. */
export function tripDaysFromParam(raw: string | null): number {
  return Math.min(MAX_TRIP_DAYS, Math.max(1, Math.floor(Number(raw)) || 1));
}

/** MapPage's convention for writing ?days: absent means 1. */
export function daysParamValue(days: number): string | null {
  return days > 1 ? String(days) : null;
}

/**
 * Trip length to put back in ?days when the URL fell under the planned
 * total by some route other than the planner's own length controls (Clear
 * all, a back press to an older URL, a route seed longer than ?days), or
 * null when the URL already covers the plan. The plan wins: only a person
 * shortening the trip inside the planner trims stops.
 */
export function daysToCoverPlan(
  rawDaysParam: string | null,
  planned: number,
  maxDays: number = MAX_TRIP_DAYS,
): number | null {
  const target = Math.min(maxDays, planned);
  return tripDaysFromParam(rawDaysParam) < target ? target : null;
}

/** Most days a new stop can take: whatever the 14-day cap leaves (the
    trip grows to fit, see confirm), never less than one. */
export function newStopDayCap(planned: number, maxDays: number = MAX_TRIP_DAYS): number {
  return Math.max(1, maxDays - planned);
}

/** Trip length after the plan changed: never shorter than what is
    planned, never past the cap. */
export function fitTripDays(tripDays: number, planned: number, maxDays: number = MAX_TRIP_DAYS): number {
  return Math.min(maxDays, Math.max(1, tripDays, planned));
}

export type AppendResult = {
  /** added: new last stop of 1 day. exists: the resort is already a stop
      (nothing changes). full: the trip is at the day cap. */
  status: "added" | "exists" | "full";
  stops: Stop[];
  days: number;
};

/**
 * "Add to trip" from a resort sheet (?add=<slug>). Appends the resort as
 * a new 1-day stop. The trip only grows when it has no unplanned day left
 * to give the new stop (a 5-day trip with 3 days planned keeps 5 days);
 * it never replaces or reorders the stops already there.
 */
export function appendStop(
  stops: Stop[],
  slug: string,
  tripDays: number,
  maxDays: number = MAX_TRIP_DAYS,
): AppendResult {
  if (stops.some((s) => s.slug === slug)) return { status: "exists", stops, days: tripDays };
  const planned = plannedDays(stops);
  if (planned + 1 > maxDays) return { status: "full", stops, days: tripDays };
  return {
    status: "added",
    stops: [...stops, { slug, days: 1 }],
    days: fitTripDays(tripDays, planned + 1, maxDays),
  };
}

/**
 * The − / + stepper on a stop. + always works until the trip hits the day
 * cap (the trip grows with it, so a 1-day seed becomes a weekend without
 * "Change trip length"); − stops at one day and, when the trip was fully
 * planned, shrinks the trip too so it does not suddenly show an unplanned
 * day. Returns the inputs unchanged (same references) when the tap is a
 * no-op, so callers can skip the state update.
 */
export function stepStopDays(
  stops: Stop[],
  index: number,
  delta: 1 | -1,
  tripDays: number,
  maxDays: number = MAX_TRIP_DAYS,
): { stops: Stop[]; days: number } {
  const stop = stops[index];
  if (!stop) return { stops, days: tripDays };
  const planned = plannedDays(stops);
  if (delta > 0 && planned >= maxDays) return { stops, days: tripDays };
  if (delta < 0 && stop.days <= 1) return { stops, days: tripDays };
  const next = stops.map((s, i) => (i === index ? { ...s, days: s.days + delta } : s));
  const nextPlanned = planned + delta;
  const days =
    delta < 0 && tripDays <= planned
      ? Math.max(1, nextPlanned)
      : fitTripDays(tripDays, nextPlanned, maxDays);
  return { stops: next, days };
}
