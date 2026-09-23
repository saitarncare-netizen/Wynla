"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDriveTime, type Origin } from "@/lib/origins";
import { passColor, primaryPass } from "@/lib/passColors";
import { haversineMeters, estimateDriveSeconds, estimateDriveMeters } from "@/lib/distance";
import { expandStopsToDays, type Stop } from "@/lib/tripPlanner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  clampPartySize,
  estimateTripCost,
  metersToMiles,
  MAX_PARTY_SIZE,
  MIN_PARTY_SIZE,
  type CostBreakdown,
} from "@/lib/tripCost";
import { getPreferences } from "@/lib/preferences";
import { getTemplate } from "@/lib/tripTemplates";
import ResortPicker from "./ResortPicker";
import { customHistoryState } from "./sheetHistory";
import type { Resort } from "./MapPage";
import type { TripRoutePoint } from "./MapView";

// Longest trip the planner lets you build. Matches the live DB check
// (trips.total_days BETWEEN 1 AND 14) so a save never fails on length.
// handoff-docs/sql/2026-09-23-planner.sql has an optional block that
// raises the constraint to 30 — bump this constant with it.
export const MAX_TRIP_DAYS = 14;
const DAY_PRESETS = [1, 2, 3, 5, 7, 10, 14];

// localStorage key for the in-flight trip draft. Used to preserve the
// user's stops + day choices across the magic-link login round-trip:
// they tap Save → we stash the draft → bounce to /login → they click
// the email link (usually in a NEW tab, so sessionStorage is gone) →
// /auth/callback exchanges the code → they land back on the map with
// ?restore=1 → we hydrate from localStorage and clear the key. 1-hour
// TTL guards against stale drafts from old sessions.
const DRAFT_KEY = "wynla_pending_trip_draft";
const DRAFT_TTL_MS = 60 * 60 * 1000;
// sessionStorage mirror of the live draft. Written on every change so
// a refresh, a back-navigation from /resort/[slug], or iOS evicting the
// tab does not throw away a half-built trip. Per-tab by design: two
// tabs planning two trips must not clobber each other.
const SESSION_DRAFT_KEY = "wynla_planner_draft_v1";
const SESSION_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;

type TripDraft = {
  stops: Stop[];
  draftName: string;
  /** YYYY-MM-DD or empty when the user has not picked a date. */
  startDate?: string;
  partySize?: number;
  /** Trip length the user chose. Restored so a draft opened from a URL
      without ?days does not read "5 of 1 days planned". */
  days?: number;
  savedAt: number;
};

// Mobile bottom-sheet footers sit inside the iPhone home-indicator
// zone; without this padding the primary button's lower half is a
// swipe-home gesture instead of a tap. Same value ResortPanel uses.
const SAFE_AREA_FOOTER_STYLE = {
  paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
} as const;

type Props = {
  open: boolean;
  origin: Origin;
  /** Currently-filtered resorts — what the picker offers. Falls back to
      allResorts when omitted (e.g. tests). */
  candidates?: Resort[];
  allResorts: Resort[];
  // Stage 33 final — passFilter / onPassChange dropped from
  // TripPlannerPanel props. Pass filtering happens via the
  // FiltersDrawer (opened from the picker's Filters pill); the
  // global URL state is consumed via `candidates` already.
  /** Lets MapPage hand off resort-pin clicks to the panel while the
      picker is open. Panel registers a (slug) => void handler when
      pickerForIndex is set, and clears it on close. MapPage routes
      pin clicks to this handler instead of opening ResortPanel. */
  onMapPickHandlerChange?: (handler: ((slug: string) => void) | null) => void;
  days: number;
  /** Ordered one-slug-per-day route to seed from. When omitted the
      panel reads ?route=a,b,b,c from the URL itself (share links and
      trip templates use that form). */
  initialOrderedSlugs?: string[];
  isAuthed: boolean;
  onClose: () => void;
  onFocusResort?: (point: { lat: number; lng: number } | null) => void;
  onPreviewLeg?: (
    leg: { fromLat: number; fromLng: number; toLat: number; toLng: number } | null,
  ) => void;
  onTripResortIds?: (ids: number[]) => void;
  /** Single source of truth for the on-map trip route. Emits the
      ordered list of points (origin + each stop) whenever stops change,
      and null when the panel is empty so the line/markers clear. */
  onTripRoute?: (points: TripRoutePoint[] | null) => void;
  onDaysChange?: (d: number) => void;
  /** Stage 33 final — same "stack drawer on top of picker" pattern as
   *  the header search. Letting the user open the FiltersDrawer from
   *  inside the trip-planner picker so they can refine candidates by
   *  pass / conditions / size / drive / airport without closing the
   *  picker and losing their place. */
  onOpenFilters?: () => void;
  /** Number of "other" filters currently set (size / night / drive /
   *  airport / fresh-snow). Renders as a badge on the Filters pill in
   *  the picker. */
  activeFilterCount?: number;
  onViewFullRoute?: () => void;
};

// Nearest-neighbor TSP for reordering stops. Returns the reordered
// stops AND the haversine meters saved compared to the original
// ordering. Origin is fixed — the route starts and ends at the
// origin. Stops with the same slug share a position (basecamp days
// don't move). Pure function — exported only for testability.
//
// Why nearest-neighbor: brute-force n! works under 7 stops but blows
// up past that. For the planner's typical 2-6 stops NN is within ~5%
// of optimal and runs in O(n²). Good enough to surface a meaningful
// "saves X minutes" prompt.
function nearestNeighborReorder(
  origin: { lat: number; lng: number },
  stops: Stop[],
  resortBySlug: Map<string, { lat: number; lng: number }>,
): { reordered: Stop[]; savedMeters: number } {
  // Build the working set — unique stops (dedupe by slug, sum days).
  // The reorder operates on unique resort positions; days carry along.
  const unique: Stop[] = [];
  const dayBySlug = new Map<string, number>();
  for (const s of stops) {
    if (dayBySlug.has(s.slug)) {
      dayBySlug.set(s.slug, (dayBySlug.get(s.slug) ?? 0) + s.days);
    } else {
      dayBySlug.set(s.slug, s.days);
      unique.push({ slug: s.slug, days: s.days });
    }
  }

  function pointFor(slug: string): { lat: number; lng: number } | null {
    const p = resortBySlug.get(slug);
    if (!p) return null;
    return p;
  }
  function totalMeters(order: Stop[]): number {
    let cursor = origin;
    let total = 0;
    for (const s of order) {
      const p = pointFor(s.slug);
      if (!p) continue;
      total += haversineMeters(cursor.lat, cursor.lng, p.lat, p.lng);
      cursor = p;
    }
    total += haversineMeters(cursor.lat, cursor.lng, origin.lat, origin.lng);
    return total;
  }

  const beforeMeters = totalMeters(unique);

  // Greedy NN: always jump to the closest unvisited stop.
  const remaining = [...unique];
  const out: Stop[] = [];
  let cursor = origin;
  while (remaining.length > 0) {
    let bestIdx = -1;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const p = pointFor(remaining[i].slug);
      if (!p) continue;
      const d = haversineMeters(cursor.lat, cursor.lng, p.lat, p.lng);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) {
      // Stops with missing coords — drop to the end so we don't lose
      // them, but they don't participate in distance math.
      out.push(remaining.shift()!);
      continue;
    }
    const picked = remaining.splice(bestIdx, 1)[0];
    out.push({ slug: picked.slug, days: dayBySlug.get(picked.slug) ?? picked.days });
    const p = pointFor(picked.slug);
    if (p) cursor = p;
  }

  const afterMeters = totalMeters(out);
  return { reordered: out, savedMeters: Math.max(0, beforeMeters - afterMeters) };
}

// Suggest a default trip name like "Vail + Aspen 5d" so the input has
// something useful out of the box. Empty when there are no stops yet.
function suggestTripName(stops: Stop[], allResorts: Resort[], days: number): string {
  if (stops.length === 0) return "";
  const bySlug = new Map(allResorts.map((r) => [r.slug, r]));
  const names = stops.slice(0, 2).map((s) => {
    const r = bySlug.get(s.slug);
    if (!r) return s.slug;
    // First word of resort name — keeps the placeholder short.
    return r.name.split(/[\s-]/)[0];
  });
  const more = stops.length > 2 ? " +" + (stops.length - 2) : "";
  return `${names.join(" + ")}${more} ${days}d`;
}

// Group a one-slug-per-day route (the ?route= / template shape) into
// stops: consecutive repeats of a slug become one stop with N days.
function stopsFromRoute(slugs: string[]): Stop[] {
  const out: Stop[] = [];
  for (const slug of slugs) {
    const last = out[out.length - 1];
    if (last && last.slug === slug) last.days += 1;
    else out.push({ slug, days: 1 });
  }
  return out;
}

// Fit the stops into a shorter trip without losing picks: trim days
// from the LAST stop backwards (each stop keeps at least one day), and
// only drop whole stops when there are more stops than days. Returns
// the same array when nothing needs to change so state stays stable.
function clampStopsToDays(stops: Stop[], days: number): Stop[] {
  const budget = Math.max(1, days);
  const planned = stops.reduce((sum, s) => sum + s.days, 0);
  if (planned <= budget) return stops;
  const next = stops.map((s) => ({ ...s }));
  let excess = planned - budget;
  for (let i = next.length - 1; i >= 0 && excess > 0; i--) {
    const trim = Math.min(excess, next[i].days - 1);
    next[i].days -= trim;
    excess -= trim;
  }
  // Every stop is at 1 day and there are still too many → drop the tail.
  while (excess > 0 && next.length > 1) {
    next.pop();
    excess -= 1;
  }
  return next;
}

function isValidStop(value: unknown): value is Stop {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.slug === "string" && v.slug.length > 0 && typeof v.days === "number" && v.days >= 1;
}

function parseDraft(raw: string | null, ttlMs: number): TripDraft | null {
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as Partial<TripDraft>;
    const ageMs = Date.now() - (draft.savedAt ?? 0);
    if (ageMs >= ttlMs) return null;
    if (!Array.isArray(draft.stops)) return null;
    const stops = draft.stops.filter(isValidStop).map((s) => ({ slug: s.slug, days: Math.floor(s.days) }));
    if (stops.length === 0) return null;
    return {
      stops,
      draftName: typeof draft.draftName === "string" ? draft.draftName : "",
      startDate: typeof draft.startDate === "string" ? draft.startDate : "",
      partySize: draft.partySize == null ? undefined : clampPartySize(draft.partySize),
      days:
        typeof draft.days === "number" && Number.isFinite(draft.days)
          ? Math.min(MAX_TRIP_DAYS, Math.max(1, Math.floor(draft.days)))
          : undefined,
      savedAt: draft.savedAt ?? 0,
    };
  } catch {
    // Bad JSON — treat as no draft.
    return null;
  }
}

function readStorage(storage: "local" | "session", key: string): string | null {
  try {
    if (typeof window === "undefined") return null;
    const s = storage === "local" ? window.localStorage : window.sessionStorage;
    return s.getItem(key);
  } catch {
    // Private browsing / blocked storage — behave as if empty.
    return null;
  }
}

function writeStorage(storage: "local" | "session", key: string, value: string | null) {
  try {
    if (typeof window === "undefined") return;
    const s = storage === "local" ? window.localStorage : window.sessionStorage;
    if (value === null) s.removeItem(key);
    else s.setItem(key, value);
  } catch {
    // Quota / private mode — the draft just isn't preserved.
  }
}

// PostgREST / Postgres codes for "that column does not exist". Seen
// when trips.start_date has not been added yet (see the SQL file).
function isMissingColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  return /start_date/.test(err.message ?? "") && /column|schema cache/i.test(err.message ?? "");
}

let warnedMissingStartDate = false;

// Turn a Supabase insert error into copy a person can act on. The raw
// Postgres text ("new row violates check constraint …") is kept out of
// the UI; the constraint case gets its own sentence.
function describeSaveError(err: { code?: string; message?: string } | null): string {
  // 23514 is any check-constraint violation; only the trip-length one
  // (trips_total_days_check) gets the length copy, so a different
  // constraint firing does not send the user to shorten a fine trip.
  if (err?.code === "23514" && /total_days/.test(err.message ?? "")) {
    return `Trips can be 1 to ${MAX_TRIP_DAYS} days long. Shorten the trip and try again.`;
  }
  const detail = err?.message?.trim();
  return detail
    ? `Couldn't save your trip (${detail}). Check your connection and try again.`
    : "Couldn't save your trip. Check your connection and try again.";
}

// Today's date as YYYY-MM-DD in the user's zone — the earliest date the
// start-date picker offers.
function todayIsoDate(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// MapPage's convention for the ?days param: absent means 1. Mirrored
// here because the post-mount URL cleanup has to strip ?restore/?route
// and set days in ONE history.replaceState — two replaces built from the same
// stale searchParams would drop one of the edits.
function daysParamValue(days: number): string | null {
  return days > 1 ? String(days) : null;
}

export default function TripPlannerPanel({
  open,
  origin,
  candidates,
  allResorts,
  onMapPickHandlerChange,
  days: daysProp,
  initialOrderedSlugs,
  isAuthed,
  onClose,
  onFocusResort,
  onPreviewLeg,
  onTripResortIds,
  onTripRoute,
  onDaysChange,
  onViewFullRoute,
  onOpenFilters,
  activeFilterCount = 0,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // SSR-aware browser Supabase client. The bare createClient() in
  // @/lib/supabase reads its session from localStorage, but our magic
  // link flow writes the session to cookies via /auth/callback. With
  // the bare client, supabase.auth.getUser() returned no user right
  // after login — so saveTrip kept bouncing the user back to /login.
  // createSupabaseBrowserClient uses @supabase/ssr's cookie-based
  // session, matching what the proxy + callback set up.
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  // The URL may carry any number (MapPage clamps to 30); the planner
  // itself never plans past the DB limit.
  const days = Math.min(MAX_TRIP_DAYS, Math.max(1, daysProp));
  const [stops, setStops] = useState<Stop[]>([]);
  const [pickerForIndex, setPickerForIndex] = useState<"new" | number | null>(null);
  // The resort the user has tapped in the picker but not yet added.
  // Lives until they tap "Add stop" (pushes a Stop) or close the
  // picker (drops it). Tapping other rows just swaps the slug.
  const [pendingStop, setPendingStop] = useState<{ slug: string; days: number } | null>(null);
  const [draftName, setDraftName] = useState<string>("");
  // Optional planned first ski day (YYYY-MM-DD). Empty = undated.
  const [startDate, setStartDate] = useState<string>("");
  // Flips to false the first time an insert says trips.start_date does
  // not exist, which hides the field for the rest of the session.
  const [startDateSupported, setStartDateSupported] = useState(true);
  // Party size for the cost estimate. Two is the most common ski-trip
  // shape (couple / pair of friends sharing a room and a car).
  const [partySize, setPartySize] = useState(2);
  // Whether the whole party skis on the same passes as the signed-in
  // user (a family on one Ikon plan) or only they do. Drives
  // lib/tripCost passHolders; the card shows the switch only when a
  // pass is known and the party is bigger than one.
  const [everyoneHasPass, setEveryoneHasPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Stage-4 trip-order optimizer. After tapping "✨ Optimize order"
  // we stash a short inline message ("Reordered: saves ~N min") above
  // the stops list; auto-clears after a few seconds.
  const [optimizeNotice, setOptimizeNotice] = useState<string | null>(null);

  // Stage-4 template hydration. When the URL carries ?template=<slug>,
  // we seed stops from lib/tripTemplates on first mount, jump the
  // wizard to "review", and show a dismissable banner. The ref + state
  // guard against re-applying on every render.
  const templateSlug = searchParams.get("template");
  const templateApplied = useRef(false);
  const [templateNotice, setTemplateNotice] = useState<{ slug: string; title: string } | null>(null);

  // Stage 21 mobile wizard state. The mobile path renders one phase at a
  // time (set days → pick stops → review). Desktop ignores all of this
  // and shows the single-screen layout.
  const [isMobile, setIsMobile] = useState(false);
  // daysLockedIn = the user has explicitly committed to a trip length
  // and is now picking stops. Reset to false on each fresh planner open
  // so a returning user always re-confirms their day count.
  const [daysLockedIn, setDaysLockedIn] = useState(false);
  // Mobile: the user asked to see the review sheet before every day is
  // planned (picker ×, "Review trip" on the between-stops sheet, or
  // removing a stop from review). Cleared whenever the picker opens
  // for a new stop so the wizard resumes its normal flow.
  const [reviewEarly, setReviewEarly] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const compute = () => {
      setIsMobile(window.matchMedia("(max-width: 767px)").matches);
    };
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // Slug→Resort lookup uses allResorts so we can render names for any
  // already-picked stop, even if filters now hide it. The picker itself
  // gets `candidates` (filtered) so users see only what's currently
  // visible on the map.
  const candidateBySlug = useMemo(
    () => new Map(allResorts.map((r) => [r.slug, r])),
    [allResorts],
  );
  const pickerResorts = candidates ?? allResorts;

  // Trip templates link with ?from=geo for cities outside the origin
  // list (Denver, SLC, …) and pass the city name as ?fromLabel= so the
  // header and the saved trip say "Denver", not "Your location".
  const fromLabelParam = searchParams.get("fromLabel")?.trim() ?? "";
  const originLabel =
    origin.kind === "geo" ? (fromLabelParam.slice(0, 40) || "Your location") : origin.name;
  const originLat = origin.lat;
  const originLng = origin.lon;

  // Route seed: an explicit one-slug-per-day list from the prop or the
  // ?route= param (share links, trip templates). This is the ONLY input
  // that replaces the stops wholesale. The day count is deliberately not
  // part of the key — changing trip length clamps stops instead of
  // wiping them (see the lastDays block below).
  const routeParam = searchParams.get("route");
  const routeSlugs = useMemo(
    () => initialOrderedSlugs ?? (routeParam ? routeParam.split(",").filter(Boolean) : []),
    [initialOrderedSlugs, routeParam],
  );
  const contextKey = routeSlugs.join(",");
  const [seededFor, setSeededFor] = useState<string>("");
  if (seededFor !== contextKey) {
    setSeededFor(contextKey);
    if (routeSlugs.length > 0) {
      setStops(clampStopsToDays(stopsFromRoute(routeSlugs), MAX_TRIP_DAYS));
      setPendingStop(null);
      setPickerForIndex(null);
      setDaysLockedIn(true);
    }
  }

  // Days-planned vs target. Stops are freeform — user may overrun or
  // underrun; we just surface the discrepancy in the UI.
  const daysPlanned = stops.reduce((sum, s) => sum + s.days, 0);
  const remainingDays = Math.max(0, days - daysPlanned);

  // A seeded route can be longer than the URL's ?days (a template link
  // always carries a matching days=N, but a hand-edited share link may
  // not). Grow the trip length to fit rather than showing "over target".
  // The mount seed is handled by the hydration effect below (which also
  // strips ?route); this only covers a route that changes while the
  // planner is already mounted.
  useEffect(() => {
    if (!hydrated || routeSlugs.length === 0) return;
    if (daysPlanned > days) onDaysChange?.(Math.min(MAX_TRIP_DAYS, daysPlanned));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seededFor]);

  // Trip length changed (header stepper / "Change trip length"): keep
  // every stop and just trim day counts so the plan fits. Render-phase
  // derived-state pattern, same as seededFor above.
  const [lastDays, setLastDays] = useState(days);
  if (lastDays !== days) {
    setLastDays(days);
    const clamped = clampStopsToDays(stops, days);
    if (clamped !== stops) setStops(clamped);
    if (pendingStop && pendingStop.days > Math.max(1, days - daysPlanned)) {
      setPendingStop({ ...pendingStop, days: Math.max(1, days - daysPlanned) });
    }
  }

  // One-shot draft hydration on mount. Two sources, in priority order:
  //   1. ?restore=1 — back from the magic-link login; the draft was
  //      stashed in localStorage by saveTrip (new tab, so sessionStorage
  //      is empty).
  //   2. sessionStorage — same tab came back from a refresh, a resort
  //      page, or tab eviction. Skipped when the URL carries an explicit
  //      ?route= (a share link or template must win over stale state).
  // Afterwards the URL is cleaned in ONE history.replaceState: ?restore goes
  // so a refresh does not re-hydrate, ?route goes so the next mount
  // (back from /resort/[slug], refresh) hydrates the user's edits from
  // sessionStorage instead of re-applying the original seed, and ?days
  // is brought in line with the draft / seed.
  // `hydrated` gates the persist effect below so the pre-hydration
  // empty state never overwrites the stored draft; `draftHydrated`
  // tells the template effect not to re-seed over a restored draft.
  const [hydrated, setHydrated] = useState(false);
  const draftHydrated = useRef(false);
  useEffect(() => {
    if (hydrated) return;
    const restoring = searchParams.get("restore") === "1";
    let draft: TripDraft | null = null;
    if (restoring) {
      draft = parseDraft(readStorage("local", DRAFT_KEY), DRAFT_TTL_MS);
      writeStorage("local", DRAFT_KEY, null);
    } else if (routeSlugs.length === 0) {
      draft = parseDraft(readStorage("session", SESSION_DRAFT_KEY), SESSION_DRAFT_TTL_MS);
    }
    // Trip length to land on: the draft's own length grown to fit its
    // stops, or the seeded route's length. 0 = leave the URL alone.
    let targetDays = 0;
    if (draft) {
      draftHydrated.current = true;
      const draftStops = clampStopsToDays(draft.stops, MAX_TRIP_DAYS);
      const draftPlanned = draftStops.reduce((sum, s) => sum + s.days, 0);
      targetDays = Math.min(MAX_TRIP_DAYS, Math.max(draft.days ?? 0, draftPlanned));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from external storage is the documented exception.
      setStops(draftStops);
      setDraftName(draft.draftName);
      setStartDate(draft.startDate ?? "");
      setPartySize(draft.partySize ?? 2);
      setPendingStop(null);
      // The user already chose a length before they left; land them on
      // the stops they had, not on "How long is your trip?" again.
      setDaysLockedIn(true);
      // They tapped Save from the review sheet (the only place it
      // lives), so put them back on review even if days remain unplanned.
      if (restoring) setReviewEarly(true);
    } else if (routeSlugs.length > 0 && daysPlanned > days) {
      targetDays = Math.min(MAX_TRIP_DAYS, daysPlanned);
    }
    setHydrated(true);

    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    if (restoring) {
      params.delete("restore");
      changed = true;
    }
    if (routeParam !== null) {
      params.delete("route");
      changed = true;
    }
    if (targetDays >= 1 && targetDays !== days) {
      const value = daysParamValue(targetDays);
      if (value === null) params.delete("days");
      else params.set("days", value);
      changed = true;
    }
    if (changed) {
      const qs = params.toString();
      // History API, not router.replace: Next syncs useSearchParams with
      // it and it skips the server re-render of the force-dynamic homepage.
      // customHistoryState keeps the resort sheet's entry keys (so a back
      // press still closes the sheet) and drops Next's own keys (so the
      // useSearchParams sync still runs): components/Map/sheetHistory.ts.
      window.history.replaceState(customHistoryState(window.history.state), "", qs ? `?${qs}` : window.location.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Mirror the live draft into sessionStorage on every change.
  useEffect(() => {
    if (!hydrated) return;
    if (stops.length === 0) {
      writeStorage("session", SESSION_DRAFT_KEY, null);
      return;
    }
    const draft: TripDraft = { stops, draftName, startDate, partySize, days, savedAt: Date.now() };
    writeStorage("session", SESSION_DRAFT_KEY, JSON.stringify(draft));
  }, [hydrated, stops, draftName, startDate, partySize, days]);

  // Stage-4 template hydration. Fires once per ?template=<slug> token
  // when the planner is open. The template page also passes the route
  // and day count in the URL, so the route seed above already has the
  // stops; this effect adds the title, the banner and (as a safety net
  // for hand-written links) the stops + day total. The URL flag is
  // preserved so refresh keeps the banner — the dismiss action strips
  // it. When the hydration effect restored a draft (refresh, back from
  // a resort page, or back from login) the user's edits to that
  // template must survive, so only the banner is applied.
  useEffect(() => {
    if (!open || !templateSlug || templateApplied.current) return;
    const tpl = getTemplate(templateSlug);
    if (!tpl) {
      // Unknown slug — clean the URL so we don't bother the user with
      // a stale banner and exit. Treat as applied so we don't retry.
      templateApplied.current = true;
      const params = new URLSearchParams(searchParams.toString());
      params.delete("template");
      const qs = params.toString();
      // History API, not router.replace: Next syncs useSearchParams with
      // it and it skips the server re-render of the force-dynamic homepage.
      // customHistoryState keeps the resort sheet's entry keys (so a back
      // press still closes the sheet) and drops Next's own keys (so the
      // useSearchParams sync still runs): components/Map/sheetHistory.ts.
      window.history.replaceState(customHistoryState(window.history.state), "", qs ? `?${qs}` : window.location.pathname);
      return;
    }
    templateApplied.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration from URL, same pattern as restore above.
    setTemplateNotice({ slug: tpl.slug, title: tpl.title });
    // A restored draft already holds the user's version of this
    // template — banner only.
    if (draftHydrated.current) return;
    setDraftName(tpl.title);
    setDaysLockedIn(true);
    setPendingStop(null);
    setPickerForIndex(null);
    // With ?route= the render-phase seed owns the stops and the
    // hydration effect owns the day total (it strips ?route and grows
    // ?days in one replace). Setting days here as well would issue a
    // second replace from the same stale params and undo that cleanup.
    if (routeSlugs.length > 0) return;
    setStops(
      clampStopsToDays(
        tpl.resortSlugs.map((slug, i) => ({
          slug,
          days: Math.max(1, tpl.daysPerResort[i] ?? 1),
        })),
        MAX_TRIP_DAYS,
      ),
    );
    const totalDays = Math.min(
      MAX_TRIP_DAYS,
      tpl.daysPerResort.reduce((a, b) => a + b, 0),
    );
    if (totalDays > 0 && totalDays !== days) {
      onDaysChange?.(totalDays);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templateSlug]);

  function dismissTemplateNotice() {
    setTemplateNotice(null);
    // Strip ?template from the URL so a refresh doesn't re-pop the
    // banner. Keep all other params (plan, days, from, etc).
    const params = new URLSearchParams(searchParams.toString());
    params.delete("template");
    const qs = params.toString();
    // History API, not router.replace: Next syncs useSearchParams with
    // it and it skips the server re-render of the force-dynamic homepage.
    // Sheet-safe state object, as above.
    window.history.replaceState(customHistoryState(window.history.state), "", qs ? `?${qs}` : window.location.pathname);
  }

  // Render-phase reset for pendingStop on panel close. Avoids the
  // setState-in-effect lint while still guaranteeing the in-flight
  // pick disappears when the user closes the planner.
  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (!open && pendingStop) setPendingStop(null);
    if (open) {
      // Wizard reset: a returning user (e.g. closes + reopens with no
      // saved stops) re-enters at the days-picker step. If they reopen
      // mid-trip with confirmed stops they skip days and go straight
      // to picking the next one.
      setDaysLockedIn(stops.length > 0);
    }
  }

  // Build per-stop legs for display (origin → stop1 → stop2 → … → home).
  const legs = useMemo(() => {
    const out: { fromLabel: string; toSlug: string; toLat: number; toLng: number; durationSeconds: number }[] = [];
    let cursorLat = originLat;
    let cursorLng = originLng;
    let cursorLabel = originLabel;
    for (const s of stops) {
      const r = candidateBySlug.get(s.slug);
      if (!r) {
        out.push({ fromLabel: cursorLabel, toSlug: s.slug, toLat: 0, toLng: 0, durationSeconds: 0 });
        continue;
      }
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      const meters = haversineMeters(cursorLat, cursorLng, lat, lng);
      out.push({
        fromLabel: cursorLabel,
        toSlug: s.slug,
        toLat: lat,
        toLng: lng,
        durationSeconds: estimateDriveSeconds(meters),
      });
      cursorLat = lat;
      cursorLng = lng;
      cursorLabel = r.name;
    }
    return out;
  }, [stops, candidateBySlug, originLat, originLng, originLabel]);

  const homeLegSeconds = useMemo(() => {
    if (stops.length === 0) return 0;
    const last = candidateBySlug.get(stops[stops.length - 1].slug);
    if (!last) return 0;
    return estimateDriveSeconds(
      haversineMeters(Number(last.latitude), Number(last.longitude), originLat, originLng),
    );
  }, [stops, candidateBySlug, originLat, originLng]);
  const totalDriveSeconds =
    legs.reduce((s, l) => s + l.durationSeconds, 0) + homeLegSeconds;

  // Total round-trip meters (origin → stops → home), inflated by the
  // distance.ts highway factor so the miles match the per-leg drive
  // estimates the user already sees. Drives both the cost estimator
  // (driving × IRS rate) and the optimize-saved math.
  const totalRoundTripMeters = useMemo(() => {
    if (stops.length === 0) return 0;
    let cursorLat = originLat;
    let cursorLng = originLng;
    let total = 0;
    for (const s of stops) {
      const r = candidateBySlug.get(s.slug);
      if (!r) continue;
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      const m = haversineMeters(cursorLat, cursorLng, lat, lng);
      total += estimateDriveMeters(m);
      cursorLat = lat;
      cursorLng = lng;
    }
    // Drive-home leg.
    const last = candidateBySlug.get(stops[stops.length - 1].slug);
    if (last) {
      total += estimateDriveMeters(
        haversineMeters(Number(last.latitude), Number(last.longitude), originLat, originLng),
      );
    }
    return total;
  }, [stops, candidateBySlug, originLat, originLng]);
  const totalRoundTripMiles = useMemo(
    () => Math.round(metersToMiles(totalRoundTripMeters)),
    [totalRoundTripMeters],
  );

  // Stage-4 cost estimator. Pulls the user's owned passes from
  // localStorage preferences (empty if not onboarded) and reads
  // ticket_price_adult_min/max off the resort rows. The estimator is
  // pure — see lib/tripCost.ts.
  const userPasses = useMemo<string[]>(() => {
    if (typeof window === "undefined") return [];
    return getPreferences()?.passes ?? [];
  }, []);
  const costBreakdown = useMemo(() => {
    if (stops.length === 0) return null;
    const slugs = stops.map((s) => s.slug);
    const daysArr = stops.map((s) => s.days);
    const passesBySlug = new Map<string, string[]>();
    const minBySlug = new Map<string, number>();
    const maxBySlug = new Map<string, number>();
    for (const s of stops) {
      const r = candidateBySlug.get(s.slug);
      if (!r) continue;
      passesBySlug.set(s.slug, r.passes ?? []);
      if (r.ticket_price_adult_min != null) minBySlug.set(s.slug, r.ticket_price_adult_min);
      if (r.ticket_price_adult_max != null) maxBySlug.set(s.slug, r.ticket_price_adult_max);
    }
    return estimateTripCost(slugs, daysArr, passesBySlug, totalRoundTripMiles, userPasses, {
      ticketPriceMin: minBySlug,
      ticketPriceMax: maxBySlug,
      partySize,
      passHolders: everyoneHasPass ? partySize : 1,
    });
  }, [stops, candidateBySlug, totalRoundTripMiles, userPasses, partySize, everyoneHasPass]);

  // Stage-4 optimize-order handler. Runs nearest-neighbor TSP locally
  // (no API call), updates the stops state, and sets an inline notice
  // with the rough drive-time savings. Disabled when there are fewer
  // than 3 unique stops — the only orders are trivially the same or
  // reversed.
  const uniqueStopCount = useMemo(
    () => new Set(stops.map((s) => s.slug)).size,
    [stops],
  );
  const canOptimize = uniqueStopCount >= 3;
  function handleOptimizeOrder() {
    if (!canOptimize) return;
    const resortBySlug = new Map<string, { lat: number; lng: number }>();
    for (const s of stops) {
      const r = candidateBySlug.get(s.slug);
      if (r) resortBySlug.set(s.slug, { lat: Number(r.latitude), lng: Number(r.longitude) });
    }
    const { reordered, savedMeters } = nearestNeighborReorder(
      { lat: originLat, lng: originLng },
      stops,
      resortBySlug,
    );
    // No change → tell the user the route is already optimal.
    const sameOrder =
      reordered.length === stops.length &&
      reordered.every((s, i) => s.slug === stops[i].slug);
    if (sameOrder || savedMeters < 1000) {
      setOptimizeNotice("Already optimized — current order is the shortest route.");
    } else {
      setStops(reordered);
      const savedSeconds = estimateDriveSeconds(savedMeters);
      const savedMinutes = Math.max(1, Math.round(savedSeconds / 60));
      setOptimizeNotice(
        savedMinutes >= 60
          ? `Reordered: saves ~${Math.round(savedMinutes / 60)}h ${savedMinutes % 60}m driving.`
          : `Reordered: saves ~${savedMinutes} min driving.`,
      );
    }
    // Auto-dismiss after 5s so the notice doesn't camp on the screen.
    window.setTimeout(() => setOptimizeNotice(null), 5000);
  }

  // Sync upstream — pin highlight + plan IDs. We include the
  // pendingStop's resort here so the pin gets the gold-halo treatment
  // the moment the user picks it (before confirming day count). Pairs
  // with the route line below so the user can see where they're
  // committing to even mid-wizard.
  const planResortIds = useMemo(() => {
    const ids: number[] = [];
    for (const s of stops) {
      const r = candidateBySlug.get(s.slug);
      if (r?.id != null) ids.push(r.id);
    }
    if (pendingStop) {
      const pr = candidateBySlug.get(pendingStop.slug);
      if (pr?.id != null && !ids.includes(pr.id)) ids.push(pr.id);
    }
    return ids;
  }, [stops, pendingStop, candidateBySlug]);
  const idsKey = planResortIds.join(",");
  // Gated on `open`: the draft is hydrated from storage even while the
  // planner is closed, and the map must not show trip pins for a sheet
  // the user cannot see.
  useEffect(() => {
    onTripResortIds?.(open ? planResortIds : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey, open]);

  // Single source of truth for the trip route line + numbered markers
  // on the map. Emits origin + each stop's resort point in order, plus
  // the pendingStop at the tail when one is mid-confirm. That way the
  // route line stays connected through the whole wizard — we never
  // strip it out between picker close and Confirm click. When there
  // are no stops AND no pending pick we emit null so the line clears.
  const tripRoutePoints = useMemo<TripRoutePoint[] | null>(() => {
    if (stops.length === 0 && !pendingStop) return null;
    const points: TripRoutePoint[] = [
      { lat: originLat, lng: originLng, label: originLabel, kind: "origin" },
    ];
    for (const s of stops) {
      const r = candidateBySlug.get(s.slug);
      if (!r) continue;
      points.push({
        lat: Number(r.latitude),
        lng: Number(r.longitude),
        label: r.name,
        kind: "resort",
        // Round 5 polish — surface the primary pass so MapView can
        // color the numbered trip pin to match the resort's brand.
        primaryPass: primaryPass(r.passes),
      });
    }
    if (pendingStop) {
      const pr = candidateBySlug.get(pendingStop.slug);
      if (pr) {
        points.push({
          lat: Number(pr.latitude),
          lng: Number(pr.longitude),
          label: pr.name,
          kind: "resort",
          primaryPass: primaryPass(pr.passes),
        });
      }
    }
    // Need at least origin + one resort to draw a meaningful line.
    return points.length >= 2 ? points : null;
  }, [stops, pendingStop, candidateBySlug, originLat, originLng, originLabel]);
  // Stable key to drive the upstream callback — avoids re-firing when
  // points array identity changes but contents don't.
  const routeKey = tripRoutePoints
    ? tripRoutePoints.map((p) => `${p.kind}:${p.lat.toFixed(4)},${p.lng.toFixed(4)}`).join("|")
    : "";
  useEffect(() => {
    onTripRoute?.(open ? tripRoutePoints : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey, open]);

  useEffect(() => {
    if (open) return;
    onPreviewLeg?.(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);


  // Stage 19.7: when the picker opens for a NEW stop and there's
  // already at least one confirmed stop, immediately fitBounds the
  // trip-so-far. The user wants to see "home + everything I've
  // booked" before scanning candidates — without this the camera was
  // wherever the last pick / hover left it, which was usually a tight
  // close-up that lost spatial context.
  useEffect(() => {
    if (pickerForIndex !== "new") return;
    if (stops.length === 0) return;
    onViewFullRoute?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickerForIndex]);

  // Expose handlePicked to MapPage so map-pin clicks can pick a
  // resort directly while the picker is open. We funnel through a ref
  // so the registered handler always sees the latest closure (current
  // pickerForIndex, stops, etc.) without re-registering on every
  // render. Register only when picker is active; clear on close.
  const handlePickedRef = useRef<(slug: string) => void>(() => {});
  // Update the ref inside an effect to keep render pure (the
  // react-hooks/refs lint disallows mutating .current during render).
  useEffect(() => {
    handlePickedRef.current = handlePicked;
  });
  useEffect(() => {
    if (!onMapPickHandlerChange) return;
    if (pickerForIndex == null) {
      onMapPickHandlerChange(null);
      return;
    }
    onMapPickHandlerChange((slug: string) => handlePickedRef.current(slug));
    return () => onMapPickHandlerChange(null);
  }, [pickerForIndex, onMapPickHandlerChange]);

  // Picker fromPoint: origin for stop 0, previous stop's resort otherwise.
  const pickerFromPoint = useMemo(() => {
    if (pickerForIndex == null) return null;
    const idx = pickerForIndex === "new" ? stops.length : pickerForIndex;
    if (idx === 0) {
      return { lat: originLat, lng: originLng, label: originLabel };
    }
    const prev = stops[idx - 1];
    if (!prev) return { lat: originLat, lng: originLng, label: originLabel };
    const r = candidateBySlug.get(prev.slug);
    if (!r) return { lat: originLat, lng: originLng, label: originLabel };
    return { lat: Number(r.latitude), lng: Number(r.longitude), label: r.name };
  }, [pickerForIndex, stops, candidateBySlug, originLat, originLng, originLabel]);

  // Open the picker for the next stop. Also leaves any early-review
  // detour so the wizard flows normally after the pick.
  function openNewStopPicker() {
    setReviewEarly(false);
    setPickerForIndex("new");
  }

  function handlePicked(slug: string) {
    if (pickerForIndex == null) return;
    const targetIndex = pickerForIndex;
    onPreviewLeg?.(null);

    if (targetIndex === "new") {
      // Preview-first flow: the picker stays open with pendingStop set
      // so the user can keep tapping different rows (each updates the
      // dashed preview leg on the map). The picker's sticky footer
      // carries the day stepper and the "Add stop" button, so one tap
      // commits. Day count defaults to whatever is left in the trip
      // (a 3-day trip's first pick is a 3-day basecamp until the user
      // says otherwise); a count the user already dialed in survives a
      // swap to another row.
      const fallback = Math.max(1, remainingDays);
      setPendingStop((prev) => ({ slug, days: prev?.days ?? fallback }));
    } else {
      // Swap-resort flow: still in-place + closes the picker (single
      // explicit change, no confirm step).
      setStops((prev) => prev.map((s, i) => (i === targetIndex ? { ...s, slug } : s)));
      setPickerForIndex(null);
    }

    // Round 5 polish — fly the camera to the picked resort so the user
    // can see exactly where their next stop is + the drive distance
    // from the previous one. The dashed preview line already renders
    // by the time we get here (set in the picker onSelect path), so
    // the user sees route AND destination at the same time. Replaces
    // the older Stage 19.7 "fit bounds for the whole trip" which left
    // users staring at a tiny pin in a state-wide bounding box.
    const r = candidateBySlug.get(slug);
    if (r) {
      const lat = Number(r.latitude);
      const lng = Number(r.longitude);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        onFocusResort?.({ lat, lng });
      }
    }
  }

  // Cap for the stop being added: total days minus every confirmed
  // stop's days. The pendingStop itself isn't in `stops` yet, so
  // daysPlanned excludes it correctly.
  const pendingDaysCap = Math.max(1, days - daysPlanned);

  function adjustPendingDays(delta: number) {
    setPendingStop((prev) => {
      if (!prev) return prev;
      const next = Math.max(1, Math.min(pendingDaysCap, prev.days + delta));
      return { ...prev, days: next };
    });
  }

  function confirmPendingStop() {
    if (!pendingStop) return;
    const committed = { slug: pendingStop.slug, days: Math.min(pendingStop.days, pendingDaysCap) };
    setStops((prev) => [...prev, committed]);
    setPendingStop(null);
    setReviewEarly(false);
    onPreviewLeg?.(null);
    // Stage 21.4 wizard auto-advance: if there are still days left to
    // plan, immediately re-open the picker for the next stop so the
    // user doesn't get dumped on the bare map. If this commit fills
    // the budget, close the picker → wizard lands on `review`.
    const wouldBeDays = daysPlanned + committed.days;
    if (wouldBeDays >= days) {
      setPickerForIndex(null);
    } else {
      setPickerForIndex("new");
      // Zoom out to the trip-so-far overview so the user has spatial
      // context before picking the next stop. Camera zooms back in
      // once they tap/hover another candidate.
      onViewFullRoute?.();
    }
  }

  function cancelPendingStop() {
    setPendingStop(null);
    onPreviewLeg?.(null);
    onFocusResort?.(null);
  }

  function adjustStopDays(idx: number, delta: number) {
    setStops((prev) => {
      // Cap each stop at trip total minus the days already used by
      // OTHER stops. Stage 19 fix — previously capped at total days
      // alone, so a 3-day trip with stop 1 = 1 day let stop 2 climb
      // to 3 days (overrun). Now stop 2's max is 3 - 1 = 2.
      const otherDays = prev.reduce(
        (sum, s, j) => (j === idx ? sum : sum + s.days),
        0,
      );
      const cap = Math.max(1, days - otherDays);
      return prev.map((s, i) => {
        if (i !== idx) return s;
        const next = Math.max(1, Math.min(cap, s.days + delta));
        return { ...s, days: next };
      });
    });
  }

  function removeStop(idx: number) {
    setStops((prev) => prev.filter((_, i) => i !== idx));
    // Removing from the review sheet reopens days to plan; stay on the
    // review sheet (with an "Add next stop" button) instead of dropping
    // the user onto the between-stops sheet.
    setReviewEarly(true);
  }

  // Mobile wizard phase derivation. Order matters: set-days gates
  // everything until the user commits to a trip length; pick covers
  // both "picker open" (the overlay replaces the sheet) and "picker
  // closed with days left" (a slim between-stops sheet); review is the
  // terminal "all days planned" state, or an early look the user asked
  // for once at least one stop exists.
  type WizardPhase = "set-days" | "pick" | "review";
  const showReviewEarly = reviewEarly && stops.length > 0;
  const wizardPhase: WizardPhase = !daysLockedIn
    ? "set-days"
    : pickerForIndex !== null
      ? "pick"
      : remainingDays > 0 && !showReviewEarly
        ? "pick"
        : "review";

  // Wizard "Continue" from set-days → lock in trip length. Opens the
  // picker only when there is something left to plan; a fully planned
  // trip (draft restore, template, back from "Change trip length")
  // falls through to review.
  function lockInDays() {
    setDaysLockedIn(true);
    if (isMobile && pickerForIndex === null && !pendingStop && remainingDays > 0) {
      openNewStopPicker();
    }
  }

  // Wizard "Change trip length" from review → back to set-days. Stops
  // are kept; a shorter length trims day counts (see lastDays above).
  function unlockDays() {
    setDaysLockedIn(false);
  }

  // Picker × on mobile behaves as "back": to the review sheet when the
  // trip already has stops, to the between-stops sheet otherwise.
  function closePicker() {
    setPickerForIndex(null);
    setPendingStop(null);
    onPreviewLeg?.(null);
    if (stops.length > 0) setReviewEarly(true);
  }

  async function saveTrip() {
    if (stops.length === 0) return;
    setSaving(true);
    setSaveError(null);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setSaving(false);
      // Stash the in-flight draft so the user's stops + name aren't
      // lost on the magic-link round-trip. The hydration effect above
      // reads this when the user returns with ?restore=1.
      const draft: TripDraft = {
        stops,
        draftName,
        startDate,
        partySize,
        days,
        savedAt: Date.now(),
      };
      writeStorage("local", DRAFT_KEY, JSON.stringify(draft));
      // Clear map overlays before bouncing to login so the route line
      // and pin highlights don't linger when the user comes back.
      onTripResortIds?.([]);
      onPreviewLeg?.(null);
      onTripRoute?.(null);
      // Build the return URL with ?plan=1 (re-open planner) and
      // ?restore=1 (signal hydration) so the planner re-mounts in the
      // right state when /auth/callback redirects them back.
      const returnParams = new URLSearchParams(window.location.search);
      returnParams.set("plan", "1");
      returnParams.set("restore", "1");
      const returnTo = `${window.location.pathname}?${returnParams.toString()}`;
      router.push(`/login?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    const finalName =
      draftName.trim() || suggestTripName(stops, allResorts, daysPlanned);
    const { resort_slugs, days_per_resort } = expandStopsToDays(stops);
    const basePayload = {
      user_id: userRes.user.id,
      name: finalName,
      origin_lat: origin.lat,
      origin_lng: origin.lon,
      origin_label: originLabel,
      resort_slugs,
      days_per_resort,
      lodging_mode: "roadtrip", // legacy column, kept for compat
      total_days: daysPlanned,
    };
    const withDate = startDateSupported && startDate ? { ...basePayload, start_date: startDate } : basePayload;
    let result = await supabase.from("trips").insert(withDate).select("id").single();
    if (result.error && "start_date" in withDate && isMissingColumnError(result.error)) {
      // The start_date column has not been added yet (see the SQL
      // file). Save the trip without it and hide the field; the trip
      // still works, the calendar export just anchors to today.
      if (!warnedMissingStartDate) {
        warnedMissingStartDate = true;
        console.warn("[trip planner] trips.start_date is missing; saving without a start date.");
      }
      setStartDateSupported(false);
      result = await supabase.from("trips").insert(basePayload).select("id").single();
    }
    setSaving(false);
    if (result.error || !result.data) {
      setSaveError(describeSaveError(result.error));
      return;
    }
    // Clear all map overlays before navigating away so the saved-trip
    // pins don't stay visually highlighted on the main map.
    onTripResortIds?.([]);
    onPreviewLeg?.(null);
    onTripRoute?.(null);
    // Successful save — drop every preserved draft.
    writeStorage("local", DRAFT_KEY, null);
    writeStorage("session", SESSION_DRAFT_KEY, null);
    router.push(`/trip/${result.data.id}`);
  }

  if (!open) return null;

  const pickedSlugs = stops.map((s) => s.slug);
  const namePlaceholder = suggestTripName(stops, allResorts, daysPlanned) || "My ski trip";
  const saveLabel = saving
    ? "Saving…"
    : saveError
      ? "Try again"
      : isAuthed
        ? "Save trip"
        : "Sign in to save";

  // Mobile wizard hides the planner sheet only while the picker
  // overlay (z-61) is up, so two sheets never stack. With the picker
  // closed and days still unplanned, a slim between-stops sheet
  // renders instead — there is always something to tap.
  const hidePlannerSheet = isMobile && wizardPhase === "pick" && pickerForIndex !== null;
  const stopsSummary = stops
    .map((s) => `${candidateBySlug.get(s.slug)?.name ?? s.slug} (${s.days}d)`)
    .join(" → ");

  return (
    <>
      {/* Stage 21 — no mobile scrim. Map stays clickable so the user
          can pan/zoom while planning, matching the user's request that
          the top half of the screen remains a usable map. */}

      <aside
        role="complementary"
        aria-label="Trip planner"
        className={[
          "fixed z-40 flex flex-col bg-white shadow-2xl",
          // Mobile: capped at ~80dvh on the review phase so users can
          // actually scroll the trip-name field + stops list + cost
          // estimator without bumping into the bottom of the sheet.
          // Other phases stay at 55dvh so the map above stays usable.
          // dvh (not vh) so the iOS toolbar never hides the footer.
          // Desktop: full-height right rail.
          "inset-x-0 bottom-0 rounded-t-2xl",
          wizardPhase === "review" ? "max-h-[80dvh]" : "max-h-[55dvh]",
          hidePlannerSheet ? "hidden md:flex" : "",
          "animate-[slideUp_220ms_cubic-bezier(0.16,1,0.3,1)]",
          "md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:flex md:w-[440px] md:max-h-none md:rounded-none",
          "md:animate-[slideLeft_220ms_cubic-bezier(0.16,1,0.3,1)]",
        ].join(" ")}
      >
        <div className="flex shrink-0 justify-center pt-2 md:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-wn-charcoal/20" />
        </div>

        {/* ---- MOBILE WIZARD — phase-driven, one screen at a time ---- */}
        <div className="flex flex-1 flex-col md:hidden">
          {/* Phase 1: How many days? — visible until the user taps Continue. */}
          {wizardPhase === "set-days" && (
            <>
              <header className="relative shrink-0 border-b border-wn-charcoal/10 bg-wn-navy px-4 py-4 text-white">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <span aria-hidden="true" className="text-lg leading-none">×</span>
                </button>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">
                  Trip planner · step 1 of 2
                </p>
                <h2 className="mt-0.5 text-lg font-extrabold tracking-tight">
                  How long is your trip?
                </h2>
                <p className="mt-1 text-[11px] leading-tight text-white/70">
                  Pick the total ski days (up to {MAX_TRIP_DAYS}). You can change this later without losing your stops.
                </p>
              </header>
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ touchAction: "pan-y" }}>
                <div className="rounded-xl border border-wn-charcoal/15 bg-wn-offwhite p-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDaysChange?.(Math.max(1, days - 1))}
                      disabled={days <= 1}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-wn-2xl font-bold text-wn-navy shadow-sm transition active:scale-95 disabled:opacity-30"
                      aria-label="Fewer days"
                    >
                      −
                    </button>
                    <div className="flex flex-1 items-baseline justify-center gap-1.5">
                      <span className="text-wn-3xl font-extrabold tracking-tight text-wn-navy">{days}</span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-wn-charcoal/60">
                        {days === 1 ? "day" : "days"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDaysChange?.(Math.min(MAX_TRIP_DAYS, days + 1))}
                      disabled={days >= MAX_TRIP_DAYS}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-wn-2xl font-bold text-wn-navy shadow-sm transition active:scale-95 disabled:opacity-30"
                      aria-label="More days"
                    >
                      +
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {DAY_PRESETS.map((n) => {
                      const active = n === days;
                      return (
                        <button
                          key={n}
                          type="button"
                          onClick={() => onDaysChange?.(n)}
                          aria-pressed={active}
                          className={[
                            "inline-flex h-8 items-center rounded-full px-3 text-xs font-semibold transition",
                            active
                              ? "bg-wn-navy text-white"
                              : "border border-wn-charcoal/20 bg-white text-wn-charcoal hover:border-wn-navy",
                          ].join(" ")}
                        >
                          {n}d
                        </button>
                      );
                    })}
                  </div>
                </div>
                {stops.length > 0 && (
                  <p className="mt-3 text-[11px] leading-snug text-wn-charcoal/60">
                    Keeping your {stops.length} stop{stops.length === 1 ? "" : "s"}: {stopsSummary}.
                    {daysPlanned > days ? " Fewer days trims the last stops." : ""}
                  </p>
                )}
              </div>
              <footer
                className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3"
                style={SAFE_AREA_FOOTER_STYLE}
              >
                <button
                  type="button"
                  onClick={lockInDays}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-wn-navy/90 active:scale-[0.98]"
                >
                  {stops.length === 0
                    ? "Continue → Pick stop 1"
                    : remainingDays > 0
                      ? `Continue → Pick stop ${stops.length + 1}`
                      : "Continue → Review trip"}
                </button>
              </footer>
            </>
          )}

          {/* Phase 2b: between stops — picker closed, days still unplanned. */}
          {wizardPhase === "pick" && pickerForIndex === null && (
            <>
              <header className="relative shrink-0 border-b border-wn-charcoal/10 bg-wn-navy px-4 py-4 text-white">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <span aria-hidden="true" className="text-lg leading-none">×</span>
                </button>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">
                  Trip planner · {daysPlanned} of {days} days planned
                </p>
                <h2 className="mt-0.5 text-lg font-extrabold tracking-tight">
                  {remainingDays} day{remainingDays === 1 ? "" : "s"} left to plan
                </h2>
                <p className="mt-1 text-[11px] leading-tight text-white/70">
                  {stops.length === 0
                    ? `Pick your first resort. From ${originLabel}.`
                    : `So far: ${stopsSummary}.`}
                </p>
              </header>
              <footer
                className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3"
                style={SAFE_AREA_FOOTER_STYLE}
              >
                <button
                  type="button"
                  onClick={openNewStopPicker}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-wn-navy/90 active:scale-[0.98]"
                >
                  <span aria-hidden="true">+</span>
                  {stops.length === 0 ? "Add first stop" : "Add next stop"}
                </button>
                <div className="mt-2 flex items-center justify-center gap-4 text-[12px] font-semibold text-wn-charcoal/65">
                  {stops.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setReviewEarly(true)}
                      className="underline-offset-2 hover:text-wn-navy hover:underline"
                    >
                      Review trip
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={unlockDays}
                    className="underline-offset-2 hover:text-wn-navy hover:underline"
                  >
                    Change trip length
                  </button>
                </div>
              </footer>
            </>
          )}

          {/* Phase 3: Review — ready to save (or an early look). */}
          {wizardPhase === "review" && (
            <>
              <header className="relative shrink-0 border-b border-wn-charcoal/10 bg-wn-navy px-4 py-4 text-white">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close"
                  className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                >
                  <span aria-hidden="true" className="text-lg leading-none">×</span>
                </button>
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">
                  {remainingDays === 0 ? "Trip ready · review" : "Trip planner · review"}
                </p>
                <h2 className="mt-0.5 text-lg font-extrabold tracking-tight">
                  {days}-day trip from {originLabel}
                </h2>
                <p className="mt-1 text-[11px] leading-tight text-white/70">
                  {remainingDays === 0
                    ? `✓ All ${days} days planned`
                    : `${daysPlanned} of ${days} days planned`}
                  {" · "}
                  {stops.length} stop{stops.length === 1 ? "" : "s"} · ≈ {formatDriveTime(totalDriveSeconds)} total drive
                </p>
              </header>
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ touchAction: "pan-y" }}>
                {/* Stage-4 template-loaded banner (mobile review). */}
                {templateNotice && (
                  <TemplateNotice title={templateNotice.title} onDismiss={dismissTemplateNotice} />
                )}
                {/* Round 5 polish — trip-name input moved to TOP of the
                    review panel. Was buried under stops + cost so users
                    didn't realize they could rename before save. */}
                <div className="mb-3">
                  <label
                    htmlFor="trip-name-mobile-top"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55"
                  >
                    Name your trip
                  </label>
                  <input
                    id="trip-name-mobile-top"
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder={namePlaceholder}
                    maxLength={80}
                    className="w-full rounded-md border border-wn-charcoal/20 bg-white px-3 py-2 text-sm font-medium text-wn-charcoal placeholder:text-wn-charcoal/35 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
                  />
                </div>
                {startDateSupported && (
                  <StartDateField id="trip-start-mobile" value={startDate} onChange={setStartDate} />
                )}
                <ol className="flex flex-col gap-2">
                  {stops.map((stop, i) => {
                    const r = candidateBySlug.get(stop.slug);
                    const name = r?.name ?? stop.slug;
                    const primary = primaryPass(r?.passes ?? []);
                    const dot = passColor(primary);
                    return (
                      <li
                        key={`${stop.slug}-${i}`}
                        className="flex items-center gap-2 rounded-lg border border-wn-charcoal/10 bg-white p-2.5"
                      >
                        <span
                          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                          style={{ backgroundColor: dot }}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-wn-navy">
                            {name}
                          </div>
                          <div className="text-[11px] text-wn-charcoal/55">
                            {stop.days} day{stop.days === 1 ? "" : "s"}
                            {r?.state ? ` · ${r.state}` : ""}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPickerForIndex(i)}
                          className="rounded-md border border-wn-charcoal/15 bg-white px-2 py-1 text-[10px] font-semibold text-wn-charcoal/70 transition hover:border-wn-navy hover:text-wn-navy"
                          aria-label={`Swap stop ${i + 1}`}
                        >
                          Swap
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStop(i)}
                          className="rounded-md border border-wn-charcoal/15 bg-white px-2 py-1 text-[10px] font-semibold text-wn-charcoal/70 transition hover:border-red-400 hover:text-red-700"
                          aria-label={`Remove stop ${i + 1}`}
                        >
                          ✕
                        </button>
                      </li>
                    );
                  })}
                </ol>

                {remainingDays > 0 && (
                  <button
                    type="button"
                    onClick={openNewStopPicker}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-wn-navy/40 bg-wn-navy/5 px-3 py-2.5 text-sm font-semibold text-wn-navy transition hover:border-wn-navy hover:bg-wn-navy/10 active:scale-[0.99]"
                  >
                    <span aria-hidden="true">+</span>
                    <span>Add next stop</span>
                    <span className="text-[11px] font-normal text-wn-navy/65">
                      ({remainingDays} day{remainingDays === 1 ? "" : "s"} left)
                    </span>
                  </button>
                )}

                {/* Stage-4 optimize order button (mobile review). */}
                <button
                  type="button"
                  onClick={handleOptimizeOrder}
                  disabled={!canOptimize}
                  className="mt-3 w-full rounded-md border border-wn-navy/30 bg-wn-navy/5 px-3 py-2 text-[12px] font-semibold text-wn-navy transition hover:bg-wn-navy/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  ✨ Optimize order
                  {!canOptimize && (
                    <span className="ml-1 font-normal text-wn-charcoal/55">
                      (need 3+ stops)
                    </span>
                  )}
                </button>
                {optimizeNotice && (
                  <p
                    role="status"
                    className="mt-1.5 rounded-md bg-emerald-50 px-2 py-1 text-center text-[11px] font-medium text-emerald-800"
                  >
                    {optimizeNotice}
                  </p>
                )}

                {/* Stage-4 cost estimator (mobile review). */}
                {costBreakdown && (
                  <CostEstimateCard
                    breakdown={costBreakdown}
                    miles={totalRoundTripMiles}
                    onPartySizeChange={setPartySize}
                    hasPass={userPasses.length > 0}
                    everyoneHasPass={everyoneHasPass}
                    onEveryoneHasPassChange={setEveryoneHasPass}
                  />
                )}

                <button
                  type="button"
                  onClick={unlockDays}
                  className="mt-4 text-[12px] font-semibold text-wn-charcoal/65 underline-offset-2 hover:text-wn-navy hover:underline"
                >
                  ← Change trip length
                </button>
              </div>
              <footer
                className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3"
                style={SAFE_AREA_FOOTER_STYLE}
              >
                {saveError && (
                  <p role="alert" className="mb-2 text-[11px] leading-snug text-red-700">
                    {saveError}
                  </p>
                )}
                <button
                  type="button"
                  onClick={saveTrip}
                  disabled={stops.length === 0 || saving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
                >
                  {saveLabel}
                  <span aria-hidden="true">→</span>
                </button>
                <p className="mt-1.5 text-center text-[10px] text-wn-charcoal/55">
                  {isAuthed
                    ? "Saved trips appear under My trips."
                    : "We use a magic link, no password. Your plan is kept while you sign in."}
                </p>
              </footer>
            </>
          )}
        </div>

        {/* ---- DESKTOP LAYOUT — single-screen view ---- */}
        <div className="hidden flex-1 flex-col md:flex">

        <header className="shrink-0 border-b border-wn-charcoal/10 bg-wn-navy px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60">
                Trip planner
              </p>
              <h2 className="mt-0.5 text-lg font-extrabold tracking-tight">
                {days}-day trip from {originLabel}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            >
              <span aria-hidden="true" className="text-lg leading-none">×</span>
            </button>
          </div>

          {onDaysChange && (
            <div className="mt-3">
              <span
                id="trip-days-label"
                className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60"
              >
                How many days is your trip?
              </span>
              {/* Stepper card — replaces the number input that opened
                  the iOS keypad and covered half the screen. */}
              <div
                role="group"
                aria-labelledby="trip-days-label"
                className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 p-1"
              >
                <button
                  type="button"
                  onClick={() => onDaysChange(Math.max(1, days - 1))}
                  disabled={days <= 1}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-lg font-bold text-white transition hover:bg-white/20 disabled:opacity-30"
                  aria-label="Fewer days"
                >
                  −
                </button>
                <div className="flex flex-1 items-baseline justify-center gap-1.5">
                  <span className="text-wn-xl font-extrabold tracking-tight text-white">{days}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                    {days === 1 ? "day" : "days"} total
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDaysChange(Math.min(MAX_TRIP_DAYS, days + 1))}
                  disabled={days >= MAX_TRIP_DAYS}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-lg font-bold text-white transition hover:bg-white/20 disabled:opacity-30"
                  aria-label="More days"
                >
                  +
                </button>
              </div>
              {/* Preset chips — common trip lengths (1d through 14d). */}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {DAY_PRESETS.map((n) => {
                  const active = n === days;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onDaysChange(n)}
                      aria-pressed={active}
                      className={[
                        "inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-semibold transition",
                        active
                          ? "bg-white text-wn-navy"
                          : "border border-white/25 bg-white/5 text-white/85 hover:bg-white/15",
                      ].join(" ")}
                    >
                      {n}d
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p className="mt-3 text-[11px] leading-tight text-white/70">
            {stops.length === 0
              ? "Tap Add stop below to pick your first resort. The map will fly to it once selected."
              : "Tap +/− to change how many days you stay at each stop. Changing the trip length keeps your stops."}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Stage-4 template-loaded banner (desktop). */}
          {templateNotice && (
            <TemplateNotice title={templateNotice.title} onDismiss={dismissTemplateNotice} />
          )}
          {/* Days-planned tracker */}
          <div className="mb-3 flex items-baseline justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/60">
              {daysPlanned} of {days} days planned
            </span>
            {remainingDays > 0 ? (
              <span className="text-[11px] text-wn-navy">
                {remainingDays} day{remainingDays === 1 ? "" : "s"} unplanned
              </span>
            ) : daysPlanned > days ? (
              <span className="text-[11px] text-amber-700">
                {daysPlanned - days} day{daysPlanned - days === 1 ? "" : "s"} over target
              </span>
            ) : (
              <span className="text-[11px] text-emerald-700">✓ All days planned</span>
            )}
          </div>

          {stops.length === 0 && (
            <div className="rounded-lg border border-dashed border-wn-charcoal/20 bg-wn-offwhite p-4 text-center text-xs text-wn-charcoal/65">
              No stops yet. Tap <strong>Add stop</strong> below to pick your first resort.
            </div>
          )}

          <ol className="flex flex-col gap-3">
            {stops.map((stop, i) => {
              const r = candidateBySlug.get(stop.slug);
              const passes = r?.passes ?? [];
              const primary = primaryPass(passes);
              const dot = passColor(primary);
              const leg = legs[i];
              return (
                <li
                  key={`${stop.slug}-${i}`}
                  className="rounded-lg border border-wn-charcoal/10 bg-white p-3"
                >
                  <div className="mb-1 flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
                    <span>Stop {i + 1}</span>
                    <span className="text-wn-charcoal/45 normal-case tracking-normal">
                      ≈ {formatDriveTime(leg?.durationSeconds ?? 0)} drive
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: dot }}
                      aria-hidden="true"
                    />
                    {r ? (
                      // The draft is mirrored to sessionStorage, so
                      // reading the resort page and coming back keeps
                      // the plan intact.
                      <Link
                        href={`/resort/${r.slug}`}
                        className="text-sm font-bold text-wn-navy hover:underline"
                      >
                        {r.name}
                      </Link>
                    ) : (
                      <span className="text-sm font-bold text-wn-charcoal/55">{stop.slug}</span>
                    )}
                    {r && <span className="text-[11px] text-wn-charcoal/50">{r.state}</span>}
                  </div>
                  <p className="mt-0.5 text-[11px] text-wn-charcoal/55">
                    From {leg?.fromLabel ?? originLabel}
                  </p>

                  {/* Day count stepper + edit + remove */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center gap-1 rounded-md border border-wn-charcoal/15 bg-wn-offwhite px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => adjustStopDays(i, -1)}
                        disabled={stop.days <= 1}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-wn-charcoal hover:bg-wn-charcoal/10 disabled:opacity-30"
                        aria-label="Fewer days"
                      >
                        −
                      </button>
                      <span className="min-w-[3rem] text-center text-[12px] font-semibold text-wn-navy">
                        {stop.days} day{stop.days === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustStopDays(i, 1)}
                        disabled={remainingDays === 0}
                        className="inline-flex h-6 w-6 items-center justify-center rounded text-wn-charcoal hover:bg-wn-charcoal/10 disabled:opacity-30"
                        aria-label="More days"
                        title={remainingDays === 0 ? "All trip days are already planned — remove a day from another stop first." : "More days at this stop"}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPickerForIndex(i)}
                      className="rounded-md border border-wn-charcoal/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy"
                    >
                      🔍 Swap resort
                    </button>
                    <button
                      type="button"
                      onClick={() => removeStop(i)}
                      className="ml-auto rounded-md border border-wn-charcoal/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-wn-charcoal/70 transition hover:border-red-400 hover:text-red-700"
                      aria-label="Remove stop"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}

            {/* Inline "How many days here?" card. Mirrors the picker's
                sticky footer for users who prefer the right rail. Renders
                only while a resort is selected in the picker but not yet
                added, so the wizard never silently appends a stop the
                user didn't actively choose. */}
            {pendingStop && (() => {
              const r = candidateBySlug.get(pendingStop.slug);
              const name = r?.name ?? pendingStop.slug;
              return (
                <li
                  className="rounded-lg border-2 border-wn-navy bg-wn-navy/5 p-3 shadow-sm"
                  aria-live="polite"
                >
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-wn-navy">
                    Stop {stops.length + 1}
                  </div>
                  <div className="text-sm font-bold text-wn-navy">
                    How many days at {name}?
                  </div>
                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex items-center gap-1 rounded-md border border-wn-navy/30 bg-white px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() => adjustPendingDays(-1)}
                        disabled={pendingStop.days <= 1}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-wn-navy hover:bg-wn-navy/10 disabled:opacity-30"
                        aria-label="Fewer days"
                      >
                        −
                      </button>
                      <span className="min-w-[3rem] text-center text-[13px] font-bold text-wn-navy">
                        {pendingStop.days} day{pendingStop.days === 1 ? "" : "s"}
                      </span>
                      <button
                        type="button"
                        onClick={() => adjustPendingDays(1)}
                        disabled={pendingStop.days >= pendingDaysCap}
                        className="inline-flex h-7 w-7 items-center justify-center rounded text-wn-navy hover:bg-wn-navy/10 disabled:opacity-30"
                        aria-label="More days"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={confirmPendingStop}
                      className="flex-1 rounded-md bg-wn-navy px-3 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90 active:scale-[0.98]"
                    >
                      + Add stop
                    </button>
                    <button
                      type="button"
                      onClick={cancelPendingStop}
                      className="rounded-md border border-wn-charcoal/20 bg-white px-3 py-2 text-sm font-semibold text-wn-charcoal/70 transition hover:border-wn-charcoal/40 hover:text-wn-charcoal"
                    >
                      ✗ Cancel
                    </button>
                  </div>
                </li>
              );
            })()}

            {/* Add stop button — only when:
                  - no pending pick is in flight AND
                  - there are still days left to plan (remainingDays > 0)
                Once daysPlanned >= days the button hides and a green
                "All days planned — ready to save" card takes its place
                so the wizard has a visible end state instead of letting
                the user keep adding stops past the trip length. */}
            {!pendingStop && remainingDays > 0 && (
              <li>
                <button
                  type="button"
                  onClick={openNewStopPicker}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-wn-navy/40 bg-wn-navy/5 px-3 py-3 text-sm font-semibold text-wn-navy transition hover:border-wn-navy hover:bg-wn-navy/10 active:scale-[0.99]"
                >
                  <span aria-hidden="true">+</span>
                  <span>{stops.length === 0 ? "Add stop" : "Add next stop"}</span>
                  <span className="text-[11px] font-normal text-wn-navy/65">
                    ({remainingDays} day{remainingDays === 1 ? "" : "s"} remaining)
                  </span>
                </button>
              </li>
            )}

            {/* All-days-planned card. Replaces the Add-stop button when
                the user has filled their day count. Points them at the
                Save CTA in the footer. */}
            {!pendingStop && stops.length > 0 && remainingDays === 0 && daysPlanned <= days && (
              <li className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-center">
                <div className="text-sm font-bold text-emerald-800">
                  ✓ All {days} days planned
                </div>
                <div className="mt-0.5 text-[11px] text-emerald-700">
                  Ready to save your trip below — or remove a stop to add a different one.
                </div>
              </li>
            )}

            {/* Drive home leg */}
            {stops.length > 0 && (
              <li className="rounded-lg border border-dashed border-wn-charcoal/20 bg-wn-offwhite p-3">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
                  After last stop
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-wn-navy">🏠 Drive home</span>
                  <span className="text-xs text-wn-charcoal/60">
                    ≈ {formatDriveTime(homeLegSeconds)}
                  </span>
                </div>
              </li>
            )}
          </ol>

          {stops.length > 0 && (
            <div className="mt-3 rounded-lg border border-wn-charcoal/10 bg-gradient-to-br from-wn-offwhite to-white p-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
                Trip summary
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-base font-extrabold tracking-tight text-wn-navy">{daysPlanned}</div>
                  <div className="text-[10px] uppercase tracking-wide text-wn-charcoal/55">ski days</div>
                </div>
                <div>
                  <div className="text-base font-extrabold tracking-tight text-wn-navy">
                    {formatDriveTime(totalDriveSeconds)}
                  </div>
                  <div className="text-[10px] uppercase tracking-wide text-wn-charcoal/55">total drive</div>
                </div>
                <div>
                  <div className="text-base font-extrabold tracking-tight text-wn-navy">{stops.length}</div>
                  <div className="text-[10px] uppercase tracking-wide text-wn-charcoal/55">
                    stop{stops.length === 1 ? "" : "s"}
                  </div>
                </div>
              </div>
              {onViewFullRoute && (
                <button
                  type="button"
                  onClick={onViewFullRoute}
                  className="mt-2 w-full rounded-md border border-wn-charcoal/15 bg-white px-3 py-1.5 text-[11px] font-semibold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy"
                >
                  🗺️ View full route on map
                </button>
              )}
              {/* Stage-4 optimize order. Disabled below 3 unique stops
                  (the only orders are equivalent). */}
              <button
                type="button"
                onClick={handleOptimizeOrder}
                disabled={!canOptimize}
                title={
                  canOptimize
                    ? "Reorder stops to minimize driving"
                    : "Need 3+ stops to optimize"
                }
                className="mt-2 w-full rounded-md border border-wn-navy/30 bg-wn-navy/5 px-3 py-1.5 text-[11px] font-semibold text-wn-navy transition hover:bg-wn-navy/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ✨ Optimize order
                {!canOptimize && (
                  <span className="ml-1 font-normal text-wn-charcoal/55">
                    (need 3+ stops)
                  </span>
                )}
              </button>
              {optimizeNotice && (
                <p
                  role="status"
                  className="mt-1.5 rounded-md bg-emerald-50 px-2 py-1 text-center text-[11px] font-medium text-emerald-800"
                >
                  {optimizeNotice}
                </p>
              )}
            </div>
          )}

          {/* Stage-4 cost estimator. Renders only when there's at
              least one stop so the layout doesn't shift on a blank
              planner. */}
          {stops.length > 0 && costBreakdown && (
            <CostEstimateCard
              breakdown={costBreakdown}
              miles={totalRoundTripMiles}
              onPartySizeChange={setPartySize}
              hasPass={userPasses.length > 0}
              everyoneHasPass={everyoneHasPass}
              onEveryoneHasPassChange={setEveryoneHasPass}
            />
          )}

          {stops.length > 0 && (
            <div className="mt-3">
              <label
                htmlFor="trip-name"
                className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55"
              >
                Trip name
              </label>
              <input
                id="trip-name"
                type="text"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder={namePlaceholder}
                maxLength={80}
                className="w-full rounded-md border border-wn-charcoal/20 bg-white px-3 py-2 text-sm font-medium text-wn-charcoal placeholder:text-wn-charcoal/35 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
              />
              <p className="mt-1 text-[10px] text-wn-charcoal/55">
                Leave blank to use the suggested name above.
              </p>
              {startDateSupported && (
                <div className="mt-3">
                  <StartDateField id="trip-start-desktop" value={startDate} onChange={setStartDate} />
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3">
          {saveError && (
            <p role="alert" className="mb-2 text-[11px] leading-snug text-red-700">
              {saveError}
            </p>
          )}
          <button
            type="button"
            onClick={saveTrip}
            disabled={stops.length === 0 || saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : saveError ? "Try again" : isAuthed ? "Save this trip" : "Sign in to save trip"}
            <span aria-hidden="true">→</span>
          </button>
          <p className="mt-1.5 text-center text-[10px] text-wn-charcoal/55">
            {isAuthed
              ? 'Saved trips show up under "My trips" — you can start one anytime.'
              : "We use a magic link, no password. Your plan is kept while you sign in."}
          </p>
        </footer>
        </div>{/* end desktop layout wrapper */}
      </aside>

      {pickerFromPoint && pickerForIndex != null && (
        <ResortPicker
          open
          title={pickerForIndex === "new" ? "Pick a resort to add" : `Swap stop ${(pickerForIndex as number) + 1}`}
          // Stage 33 amend — trip-planner picker stays as a SNAP sheet
          // (collapsed / half / full) instead of full-screen. The
          // user needs to see the map BEHIND the picker while planning
          // so they can read the dashed preview leg + understand
          // route direction. The "Filters" pill still opens the
          // drawer stacked on top — same one-source-of-truth pattern
          // as header search, just without hiding the map.
          onOpenFilters={onOpenFilters}
          activeFilterCount={activeFilterCount}
          fromPoint={pickerFromPoint}
          allResorts={pickerResorts}
          alreadyPicked={pickedSlugs}
          pendingSlug={pendingStop?.slug}
          pendingResortName={
            pendingStop
              ? candidateBySlug.get(pendingStop.slug)?.name ?? pendingStop.slug
              : null
          }
          pendingDays={pendingStop?.days}
          pendingDaysMax={pendingDaysCap}
          onPendingDaysChange={adjustPendingDays}
          onSelect={handlePicked}
          onConfirmPending={confirmPendingStop}
          onClose={closePicker}
          onHover={(slug) => {
            // Stage 19.8: hover only draws the gold preview line.
            // Camera is left alone so the trip-overview view (set by
            // the Stage 19.7 click / open / confirm paths) stays
            // visible while the user scans candidates. Zooming-in on
            // hover broke the planning context the user explicitly
            // asked us to keep.
            if (!slug) {
              onPreviewLeg?.(null);
              return;
            }
            const r = candidateBySlug.get(slug);
            if (!r) return;
            onPreviewLeg?.({
              fromLat: pickerFromPoint.lat,
              fromLng: pickerFromPoint.lng,
              toLat: Number(r.latitude),
              toLng: Number(r.longitude),
            });
          }}
        />
      )}
    </>
  );
}

// "Template loaded" banner shared by the mobile review and desktop list.
function TemplateNotice({ title, onDismiss }: { title: string; onDismiss: () => void }) {
  return (
    <div className="mb-3 flex items-start gap-2 rounded-lg border border-wn-navy/25 bg-wn-navy/5 px-3 py-2">
      <span className="text-base leading-none" aria-hidden="true">✨</span>
      <div className="flex-1 text-[12px] leading-snug text-wn-navy">
        <span className="font-bold">Template loaded:</span> {title}.
        Customize and save when ready.
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss template notice"
        className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-wn-navy/65 transition hover:bg-wn-navy/10 hover:text-wn-navy"
      >
        <span aria-hidden="true">×</span>
      </button>
    </div>
  );
}

// Optional planned first ski day. Native date input: iOS shows its
// wheel picker, desktop its calendar popover, both without extra code.
function StartDateField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
}) {
  return (
    <div className="mb-3">
      <label
        htmlFor={id}
        className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55"
      >
        Trip start date <span className="font-normal normal-case tracking-normal">(optional)</span>
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="date"
          value={value}
          min={todayIsoDate()}
          onChange={(e) => onChange(e.target.value)}
          // 16px keeps iOS Safari from zooming the page on focus.
          style={{ fontSize: "16px" }}
          className="flex-1 rounded-md border border-wn-charcoal/20 bg-white px-3 py-1.5 font-medium text-wn-charcoal focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-[11px] font-semibold text-wn-charcoal/60 underline-offset-2 hover:text-wn-navy hover:underline"
          >
            Clear
          </button>
        )}
      </div>
      <p className="mt-1 text-[10px] text-wn-charcoal/55">
        Day 1 of the trip. Used for the calendar export; you can add it later.
      </p>
    </div>
  );
}

// Cost estimate card shared by the mobile review and the desktop rail.
// Every number says what it covers: the group total is headline, the
// per-person split is underneath, and each tile names its unit
// (people × days, rooms × nights, cars × miles).
function CostEstimateCard({
  breakdown,
  miles,
  onPartySizeChange,
  hasPass,
  everyoneHasPass,
  onEveryoneHasPassChange,
}: {
  breakdown: CostBreakdown;
  miles: number;
  onPartySizeChange: (next: number) => void;
  /** The signed-in user has at least one pass saved in preferences. */
  hasPass: boolean;
  everyoneHasPass: boolean;
  onEveryoneHasPassChange: (next: boolean) => void;
}) {
  const { partySize, nights, rooms, cars, totalDays, passHolders } = breakdown;
  const people = `${partySize} ${partySize === 1 ? "person" : "people"}`;
  const payers = Math.max(0, partySize - passHolders);
  const passToggleId = "trip-cost-everyone-pass";
  return (
    <div className="mt-3 rounded-lg border border-wn-charcoal/10 bg-white p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
          Estimated trip cost
        </div>
        <div
          role="group"
          aria-label="Number of people"
          className="flex items-center gap-1 rounded-md border border-wn-charcoal/15 bg-wn-offwhite px-1 py-0.5"
        >
          <button
            type="button"
            onClick={() => onPartySizeChange(Math.max(MIN_PARTY_SIZE, partySize - 1))}
            disabled={partySize <= MIN_PARTY_SIZE}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-wn-charcoal hover:bg-wn-charcoal/10 disabled:opacity-30"
            aria-label="Fewer people"
          >
            −
          </button>
          <span className="min-w-[4.25rem] text-center text-[11px] font-semibold text-wn-navy">
            {people}
          </span>
          <button
            type="button"
            onClick={() => onPartySizeChange(Math.min(MAX_PARTY_SIZE, partySize + 1))}
            disabled={partySize >= MAX_PARTY_SIZE}
            className="inline-flex h-6 w-6 items-center justify-center rounded text-wn-charcoal hover:bg-wn-charcoal/10 disabled:opacity-30"
            aria-label="More people"
          >
            +
          </button>
        </div>
      </div>
      <div className="text-base font-extrabold tracking-tight text-wn-navy">
        ${breakdown.totalLow.toLocaleString()}–${breakdown.totalHigh.toLocaleString()}
        <span className="ml-1 text-[11px] font-semibold text-wn-charcoal/55">total for {people}</span>
      </div>
      <div className="mb-2 text-[11px] text-wn-charcoal/60">
        ≈ ${breakdown.perPersonLow.toLocaleString()}–${breakdown.perPersonHigh.toLocaleString()} per person
      </div>
      {breakdown.passCoversAll && (
        <p className="mb-2 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
          {payers === 0
            ? partySize === 1
              ? "✓ Your pass covers all stops. Lift tickets $0"
              : "✓ Everyone's pass covers all stops. Lift tickets $0"
            : `✓ Your pass covers your lift tickets. The other ${payers === 1 ? "person pays" : `${payers} pay`} walk-up`}
        </p>
      )}
      {/* Only meaningful when a pass is known and there is someone else
          to apply it to; lib/tripCost clamps passHolders to the party. */}
      {hasPass && partySize > 1 && (
        <label
          htmlFor={passToggleId}
          className="mb-2 flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-md border border-wn-charcoal/10 bg-wn-offwhite px-2 text-[11px] font-medium text-wn-charcoal"
        >
          <span>Everyone has this pass</span>
          <input
            id={passToggleId}
            type="checkbox"
            role="switch"
            checked={everyoneHasPass}
            aria-checked={everyoneHasPass}
            onChange={(e) => onEveryoneHasPassChange(e.target.checked)}
            className="h-5 w-5 accent-wn-navy"
          />
        </label>
      )}
      <dl className="grid grid-cols-3 gap-2 text-center">
        <CostTile
          label={
            breakdown.passCoversAll && payers === 0
              ? `Lift tickets (covered by pass, ${totalDays} day${totalDays === 1 ? "" : "s"})`
              : breakdown.passCoversAll && payers < partySize
                ? `Lift tickets (${payers} without a pass × ${totalDays} day${totalDays === 1 ? "" : "s"})`
                : `Lift tickets (${partySize} × ${totalDays} day${totalDays === 1 ? "" : "s"})`
          }
          value={`$${breakdown.liftTickets.toLocaleString()}`}
        />
        <CostTile
          label={
            nights === 0
              ? "Lodging (day trip, 0 nights)"
              : `Lodging (${rooms} room${rooms === 1 ? "" : "s"} × ${nights} night${nights === 1 ? "" : "s"})`
          }
          value={`$${breakdown.lodging.toLocaleString()}`}
        />
        <CostTile
          label={`Driving (${cars} car${cars === 1 ? "" : "s"}, ${miles.toLocaleString()} mi)`}
          value={`$${breakdown.driving.toLocaleString()}`}
        />
      </dl>
      <p className="mt-2 text-[10px] leading-tight text-wn-charcoal/50">
        Rough estimate: walk-up ticket prices, $80–300 a night for lodging, IRS mileage for driving. Real prices vary by date, hotel, and demand.
      </p>
    </div>
  );
}

// Single cost-breakdown tile inside the estimator card. Kept inline
// so the cost section stays self-contained.
function CostTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-wn-charcoal/10 bg-wn-offwhite px-1.5 py-2 text-center">
      <div className="text-[12px] font-bold tracking-tight text-wn-navy">
        {value}
      </div>
      <div className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
        {label}
      </div>
    </div>
  );
}
