"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDriveTime, type Origin } from "@/lib/origins";
import { passColor, primaryPass } from "@/lib/passColors";
import { haversineMeters, estimateDriveSeconds, estimateDriveMeters } from "@/lib/distance";
import { expandStopsToDays, type Stop } from "@/lib/tripPlanner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { estimateTripCost, metersToMiles } from "@/lib/tripCost";
import { getPreferences } from "@/lib/preferences";
import { getTemplate } from "@/lib/tripTemplates";
import ResortPicker from "./ResortPicker";
import type { Resort } from "./MapPage";
import type { TripRoutePoint } from "./MapView";

// localStorage key for the in-flight trip draft. Used to preserve the
// user's stops + day choices across the magic-link login round-trip:
// they tap Save → we stash the draft → bounce to /login → they click
// the email link → /auth/callback exchanges the code → they land back
// on the map with ?restore=1 → we hydrate from localStorage and clear
// the key. 1-hour TTL guards against stale drafts from old sessions.
const DRAFT_KEY = "wynla_pending_trip_draft";
const DRAFT_TTL_MS = 60 * 60 * 1000;

type TripDraft = {
  stops: Stop[];
  draftName: string;
  savedAt: number;
};

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

export default function TripPlannerPanel({
  open,
  origin,
  candidates,
  allResorts,
  onMapPickHandlerChange,
  days,
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
  const [stops, setStops] = useState<Stop[]>([]);
  const [pickerForIndex, setPickerForIndex] = useState<"new" | number | null>(null);
  // Inline "How many days here?" confirm card. Set when the user picks
  // a resort in the picker; we hold the slug + chosen day count here
  // until they confirm or cancel. Confirm pushes a Stop; Cancel drops it.
  const [pendingStop, setPendingStop] = useState<{ slug: string; days: number } | null>(null);
  const [draftName, setDraftName] = useState<string>("");
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
  // time (set days → pick stop → confirm days → repeat → review). Desktop
  // ignores all of this and shows the legacy single-screen layout.
  const [isMobile, setIsMobile] = useState(false);
  // daysLockedIn = the user has explicitly committed to a trip length
  // and is now picking stops. Reset to false on each fresh planner open
  // so a returning user always re-confirms their day count.
  const [daysLockedIn, setDaysLockedIn] = useState(false);
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

  const originLabel = origin.kind === "geo" ? "Your location" : origin.name;
  const originLat = origin.lat;
  const originLng = origin.lon;
  const contextKey = `${days}|${originLat.toFixed(5)}|${originLng.toFixed(5)}|${initialOrderedSlugs?.join(",") ?? ""}`;
  // Render-phase reset when the inputs that produced the auto-pick
  // change (origin moves, day count changes, share-link fires).
  const [seededFor, setSeededFor] = useState<string>("");
  if (seededFor !== contextKey) {
    setSeededFor(contextKey);
    // Wizard-style: don't pre-pick anything. User starts blank and
    // picks the first resort themselves. Only the share-link path
    // (?route=…) seeds with explicit slugs. Draft restoration from
    // localStorage happens in a separate effect below — it can't run
    // here because it needs Date.now() (an impure call) for the TTL
    // check, which violates render-phase purity.
    const initialStops: Stop[] = [];
    if (initialOrderedSlugs && initialOrderedSlugs.length > 0) {
      for (const slug of initialOrderedSlugs) {
        const last = initialStops[initialStops.length - 1];
        if (last && last.slug === slug) last.days += 1;
        else initialStops.push({ slug, days: 1 });
      }
    }
    setStops(initialStops);
    setDraftName("");
    setPendingStop(null);
  }

  // Draft hydration after a magic-link round-trip. Triggered when the
  // URL carries ?restore=1 (set by saveTrip right before redirecting
  // to /login). Reads the localStorage draft, applies it to state, and
  // strips the restore flag so a refresh doesn't re-hydrate. One-shot
  // per restore param value — guarded by a ref-style state token.
  const restoreToken = searchParams.get("restore");
  // Ref instead of state so we don't trigger a re-render or violate
  // the no-setState-in-effect lint when we mark the restore as
  // applied. Persists across re-renders within the same mount.
  const restoreAppliedRef = useRef(false);
  useEffect(() => {
    if (!open || restoreToken !== "1" || restoreAppliedRef.current) return;
    restoreAppliedRef.current = true;
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw) as Partial<TripDraft>;
        const ageMs = Date.now() - (draft.savedAt ?? 0);
        if (
          ageMs < DRAFT_TTL_MS &&
          Array.isArray(draft.stops) &&
          draft.stops.length > 0
        ) {
          // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrating from external store (localStorage) is a documented valid use case.
          setStops(draft.stops as Stop[]);
          setDraftName(draft.draftName ?? "");
          setPendingStop(null);
        }
      }
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // Bad JSON or storage error — fall through.
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete("restore");
    const qs = params.toString();
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, restoreToken]);

  // Stage-4 template hydration. Fires once per ?template=<slug> token
  // when the planner is open. Seeds stops from the template definition,
  // updates the day total via the parent's onDaysChange (so the URL
  // ?days param matches), jumps the wizard straight to "review", and
  // pops a dismissable banner. URL flag is preserved so refresh keeps
  // the template applied — the dismiss action strips it.
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
      router.replace(qs ? `?${qs}` : "?", { scroll: false });
      return;
    }
    templateApplied.current = true;
    // Seed stops from the template's resort + day arrays.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hydration from URL, same pattern as restore above.
    setStops(
      tpl.resortSlugs.map((slug, i) => ({
        slug,
        days: Math.max(1, tpl.daysPerResort[i] ?? 1),
      })),
    );
    setDraftName(tpl.title);
    setDaysLockedIn(true);
    setPendingStop(null);
    setPickerForIndex(null);
    setTemplateNotice({ slug: tpl.slug, title: tpl.title });
    // Push the template's total day count back up to MapPage so the
    // URL ?days param matches. Without this the budget tracker still
    // shows whatever days was when the planner opened.
    const totalDays = tpl.daysPerResort.reduce((a, b) => a + b, 0);
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
    router.replace(qs ? `?${qs}` : "?", { scroll: false });
  }

  // Render-phase reset for pendingStop on panel close. Avoids the
  // setState-in-effect lint while still guaranteeing the in-flight
  // confirm card disappears when the user closes the planner.
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

  // Days-planned vs target. Stops are freeform — user may overrun or
  // underrun; we just surface the discrepancy in the UI.
  const daysPlanned = stops.reduce((sum, s) => sum + s.days, 0);
  const remainingDays = Math.max(0, days - daysPlanned);

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
    });
  }, [stops, candidateBySlug, totalRoundTripMiles, userPasses]);

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
  useEffect(() => {
    onTripResortIds?.(planResortIds);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

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
    onTripRoute?.(tripRoutePoints);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  useEffect(() => {
    if (open) return;
    onTripResortIds?.([]);
    onPreviewLeg?.(null);
    onTripRoute?.(null);
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

  function handlePicked(slug: string) {
    if (pickerForIndex == null) return;
    const targetIndex = pickerForIndex;
    onPreviewLeg?.(null);

    if (targetIndex === "new") {
      // Stage 21.3 — preview-confirm flow. The picker stays open with
      // pendingStop set so the user can keep tapping different rows
      // (each updates the dashed preview leg on the map). A sticky
      // "Confirm [Resort]" bar inside the picker advances to the
      // confirm-days phase. Reverts the Stage 21.1 "close on tap"
      // behavior — that broke the "let me see more candidates"
      // affordance the user explicitly asked for.
      setPendingStop({ slug, days: Math.max(1, Math.min(remainingDays || 1, 1)) });
    } else {
      // Swap-resort flow: still in-place + closes the picker (single
      // explicit change, no confirm step).
      setStops((prev) => prev.map((s, i) => (i === targetIndex ? { ...s, slug } : s)));
      setPickerForIndex(null);
    }

    // Stage 19.7: zoom OUT to the trip-so-far overview instead of
    // flying in to the picked resort. The user wants planning context
    // (home + every confirmed stop + this candidate) while deciding,
    // not a detail close-up. The hover-zoom path (Stage 19.3) still
    // serves the "what does this resort look like" check; explicit
    // clicks now trigger the wider overview.
    onViewFullRoute?.();
  }

  function adjustPendingDays(delta: number) {
    setPendingStop((prev) => {
      if (!prev) return prev;
      // Cap at days that remain in the trip budget — total days minus
      // every already-confirmed stop's days. The pendingStop itself
      // isn't in `stops` yet, so daysPlanned excludes it correctly.
      const cap = Math.max(1, days - daysPlanned);
      const next = Math.max(1, Math.min(cap, prev.days + delta));
      return { ...prev, days: next };
    });
  }

  function confirmPendingStop() {
    if (!pendingStop) return;
    const committed = { slug: pendingStop.slug, days: pendingStop.days };
    setStops((prev) => [...prev, committed]);
    setPendingStop(null);
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
  }

  // Mobile wizard phase derivation. Order matters: set-days gates
  // everything until the user commits to a trip length; pick comes
  // before confirm because we don't render the planner sheet at all
  // during pick (the picker overlay takes its place); review is the
  // terminal "all days planned" state.
  type WizardPhase = "set-days" | "pick" | "confirm" | "review";
  const wizardPhase: WizardPhase = !daysLockedIn
    ? "set-days"
    : pickerForIndex !== null
      ? "pick"
      : pendingStop
        ? "confirm"
        : remainingDays > 0
          ? "pick"
          : "review";

  // Wizard "Continue" from set-days → lock in trip length + open the
  // picker so the user lands directly on stop 1. Existing
  // confirmPendingStop already keeps the picker open after each
  // confirm when remainingDays > 0, so we only need to seed the very
  // first transition.
  function lockInDays() {
    setDaysLockedIn(true);
    if (isMobile && pickerForIndex === null && !pendingStop) {
      setPickerForIndex("new");
    }
  }

  // Stage 21.3 preview-confirm: user has selected a candidate (the
  // dashed leg is showing on the map). They tap "Confirm [Resort]" in
  // the picker footer → we close the picker, which transitions the
  // wizard from `pick` to `confirm-days` (planner sheet appears with
  // the day-count stepper).
  function confirmPreviewPick() {
    if (!pendingStop) return;
    setPickerForIndex(null);
    onPreviewLeg?.(null);
  }
  // Wizard "Change trip length" from review → reset to set-days. We
  // keep stops as-is so the user doesn't lose their picks.
  function unlockDays() {
    setDaysLockedIn(false);
  }

  async function saveTrip() {
    if (stops.length === 0) return;
    setSaving(true);
    setSaveError(null);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setSaving(false);
      // Stash the in-flight draft so the user's stops + name aren't
      // lost on the magic-link round-trip. The seededFor block above
      // hydrates from this when the user returns with ?restore=1.
      try {
        if (typeof window !== "undefined") {
          const draft: TripDraft = {
            stops,
            draftName,
            // eslint-disable-next-line react-hooks/purity -- event handler, not render
            savedAt: Date.now(),
          };
          window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
      } catch {
        // localStorage can throw in private browsing / quota-full —
        // safe to continue, the user just won't get draft preserved.
      }
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
    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id: userRes.user.id,
        name: finalName,
        origin_lat: origin.lat,
        origin_lng: origin.lon,
        origin_label: originLabel,
        resort_slugs,
        days_per_resort,
        lodging_mode: "roadtrip", // legacy column, kept for compat
        total_days: daysPlanned,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      setSaveError(error?.message ?? "Couldn't save trip.");
      return;
    }
    // Clear all map overlays before navigating away so the saved-trip
    // pins don't stay visually highlighted on the main map.
    onTripResortIds?.([]);
    onPreviewLeg?.(null);
    onTripRoute?.(null);
    // Successful save — drop any preserved draft.
    try {
      if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    } catch {}
    router.push(`/trip/${data.id}`);
  }

  if (!open) return null;

  const pickedSlugs = stops.map((s) => s.slug);
  const namePlaceholder = suggestTripName(stops, allResorts, daysPlanned) || "My ski trip";

  // Mobile wizard hides the planner sheet entirely during the pick
  // phase — the picker overlay (z-61) takes its place, so stacking
  // two sheets at once is avoided. Desktop keeps both visible.
  const hidePlannerSheet = isMobile && wizardPhase === "pick";

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
          // Mobile: capped at ~55vh so the map above stays usable.
          // Hidden during pick phase (picker overlay shows in its
          // place). Desktop: full-height right rail.
          "inset-x-0 bottom-0 max-h-[55vh] rounded-t-2xl",
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
                  Pick the total ski days. You can change this later.
                </p>
              </header>
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ touchAction: "pan-y" }}>
                <div className="rounded-xl border border-wn-charcoal/15 bg-wn-offwhite p-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onDaysChange?.(Math.max(1, days - 1))}
                      disabled={days <= 1}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-2xl font-bold text-wn-navy shadow-sm transition active:scale-95 disabled:opacity-30"
                      aria-label="Fewer days"
                    >
                      −
                    </button>
                    <div className="flex flex-1 items-baseline justify-center gap-1.5">
                      <span className="text-3xl font-extrabold tracking-tight text-wn-navy">{days}</span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-wn-charcoal/60">
                        {days === 1 ? "day" : "days"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDaysChange?.(Math.min(30, days + 1))}
                      disabled={days >= 30}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-2xl font-bold text-wn-navy shadow-sm transition active:scale-95 disabled:opacity-30"
                      aria-label="More days"
                    >
                      +
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                    {[1, 2, 3, 5, 7, 10, 14].map((n) => {
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
              </div>
              <footer className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3">
                <button
                  type="button"
                  onClick={lockInDays}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-wn-navy/90 active:scale-[0.98]"
                >
                  Continue → Pick stop 1
                </button>
              </footer>
            </>
          )}

          {/* Phase 3: How many days at this resort? — pendingStop confirm. */}
          {wizardPhase === "confirm" && pendingStop && (() => {
            const r = candidateBySlug.get(pendingStop.slug);
            const name = r?.name ?? pendingStop.slug;
            const stateLabel = r?.state ?? "";
            const stopNumber = stops.length + 1;
            // Find the leg from previous cursor to this resort for drive time hint.
            const prev = stops[stops.length - 1];
            const prevR = prev ? candidateBySlug.get(prev.slug) : null;
            const fromLat = prevR ? Number(prevR.latitude) : originLat;
            const fromLng = prevR ? Number(prevR.longitude) : originLng;
            const fromLabel = prevR?.name ?? originLabel;
            const driveSec = r
              ? estimateDriveSeconds(
                  haversineMeters(fromLat, fromLng, Number(r.latitude), Number(r.longitude)),
                )
              : 0;
            const cap = Math.max(1, days - daysPlanned);
            return (
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
                    Stop {stopNumber} of {days}
                  </p>
                  <h2 className="mt-0.5 text-lg font-extrabold tracking-tight">
                    {name}
                    {stateLabel && <span className="ml-2 text-sm font-medium text-white/70">{stateLabel}</span>}
                  </h2>
                  <p className="mt-1 text-[11px] leading-tight text-white/70">
                    From {fromLabel} · ≈ {formatDriveTime(driveSec)} drive
                  </p>
                </header>
                <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ touchAction: "pan-y" }}>
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
                    How many days at {name}?
                  </p>
                  <div className="flex items-center gap-2 rounded-xl border border-wn-charcoal/15 bg-wn-offwhite p-3">
                    <button
                      type="button"
                      onClick={() => adjustPendingDays(-1)}
                      disabled={pendingStop.days <= 1}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-2xl font-bold text-wn-navy shadow-sm transition active:scale-95 disabled:opacity-30"
                      aria-label="Fewer days"
                    >
                      −
                    </button>
                    <div className="flex flex-1 items-baseline justify-center gap-1.5">
                      <span className="text-3xl font-extrabold tracking-tight text-wn-navy">
                        {pendingStop.days}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-wn-charcoal/60">
                        day{pendingStop.days === 1 ? "" : "s"}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => adjustPendingDays(1)}
                      disabled={pendingStop.days >= cap}
                      className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-white text-2xl font-bold text-wn-navy shadow-sm transition active:scale-95 disabled:opacity-30"
                      aria-label="More days"
                    >
                      +
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] text-wn-charcoal/55">
                    {cap - pendingStop.days > 0
                      ? `${cap - pendingStop.days} day${cap - pendingStop.days === 1 ? "" : "s"} left to plan after this stop.`
                      : "This fills the rest of your trip."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      cancelPendingStop();
                      // Re-open picker so the user can choose a different resort.
                      setPickerForIndex("new");
                    }}
                    className="mt-4 text-[12px] font-semibold text-wn-charcoal/65 underline-offset-2 hover:text-wn-navy hover:underline"
                  >
                    ← Pick a different resort
                  </button>
                </div>
                <footer className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3">
                  <button
                    type="button"
                    onClick={confirmPendingStop}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-wn-navy/90 active:scale-[0.98]"
                  >
                    ✓ Confirm stop {stopNumber}
                  </button>
                </footer>
              </>
            );
          })()}

          {/* Phase 4: Review — all days planned, ready to save. */}
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
                  Trip ready · review
                </p>
                <h2 className="mt-0.5 text-lg font-extrabold tracking-tight">
                  {days}-day trip from {originLabel}
                </h2>
                <p className="mt-1 text-[11px] leading-tight text-white/70">
                  ✓ All {days} days planned · {stops.length} stop{stops.length === 1 ? "" : "s"} · ≈ {formatDriveTime(totalDriveSeconds)} total drive
                </p>
              </header>
              <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4" style={{ touchAction: "pan-y" }}>
                {/* Stage-4 template-loaded banner (mobile review). */}
                {templateNotice && (
                  <div className="mb-3 flex items-start gap-2 rounded-lg border border-wn-navy/25 bg-wn-navy/5 px-3 py-2">
                    <span className="text-base leading-none" aria-hidden="true">✨</span>
                    <div className="flex-1 text-[12px] leading-snug text-wn-navy">
                      <span className="font-bold">Template loaded:</span> {templateNotice.title}.
                      Customize and save when ready.
                    </div>
                    <button
                      type="button"
                      onClick={dismissTemplateNotice}
                      aria-label="Dismiss template notice"
                      className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-wn-navy/65 transition hover:bg-wn-navy/10 hover:text-wn-navy"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  </div>
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
                  <div className="mt-3 rounded-lg border border-wn-charcoal/10 bg-white p-3">
                    <div className="mb-1 flex items-baseline justify-between">
                      <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
                        Estimated trip cost
                      </div>
                      <div className="text-[10px] text-wn-charcoal/45">per person</div>
                    </div>
                    <div className="mb-2 text-base font-extrabold tracking-tight text-wn-navy">
                      ${costBreakdown.totalLow.toLocaleString()}–${costBreakdown.totalHigh.toLocaleString()}
                    </div>
                    {costBreakdown.passCoversAll && (
                      <p className="mb-2 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                        ✓ Your pass covers all stops — lift tickets $0
                      </p>
                    )}
                    <dl className="grid grid-cols-3 gap-2 text-center">
                      <CostTile
                        label="Lift tickets"
                        value={`$${costBreakdown.liftTickets.toLocaleString()}`}
                      />
                      <CostTile
                        label={`Lodging (${costBreakdown.totalDays}n)`}
                        value={`$${costBreakdown.lodging.toLocaleString()}`}
                      />
                      <CostTile
                        label={`Driving (${totalRoundTripMiles}mi)`}
                        value={`$${costBreakdown.driving.toLocaleString()}`}
                      />
                    </dl>
                    <p className="mt-2 text-[10px] leading-tight text-wn-charcoal/50">
                      Estimate. Real prices vary by date, hotel, and demand.
                    </p>
                  </div>
                )}

                <div className="mt-3">
                  <label
                    htmlFor="trip-name-mobile"
                    className="mb-1 block text-[10px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55"
                  >
                    Trip name
                  </label>
                  <input
                    id="trip-name-mobile"
                    type="text"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    placeholder={namePlaceholder}
                    maxLength={80}
                    className="w-full rounded-md border border-wn-charcoal/20 bg-white px-3 py-2 text-sm font-medium text-wn-charcoal placeholder:text-wn-charcoal/35 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
                  />
                </div>

                <button
                  type="button"
                  onClick={unlockDays}
                  className="mt-4 text-[12px] font-semibold text-wn-charcoal/65 underline-offset-2 hover:text-wn-navy hover:underline"
                >
                  ← Change trip length
                </button>
              </div>
              <footer className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3">
                {saveError && <p className="mb-2 text-[11px] text-red-700">{saveError}</p>}
                <button
                  type="button"
                  onClick={saveTrip}
                  disabled={stops.length === 0 || saving}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-3 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
                >
                  {saving ? "Saving…" : isAuthed ? "Save trip" : "Sign in to save"}
                  <span aria-hidden="true">→</span>
                </button>
                <p className="mt-1.5 text-center text-[10px] text-wn-charcoal/55">
                  {isAuthed
                    ? "Saved trips appear under My trips."
                    : "We use a magic link, no password."}
                </p>
              </footer>
            </>
          )}
        </div>

        {/* ---- DESKTOP LAYOUT — existing single-screen view ---- */}
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
                  <span className="text-xl font-extrabold tracking-tight text-white">{days}</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
                    {days === 1 ? "day" : "days"} total
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onDaysChange(Math.min(30, days + 1))}
                  disabled={days >= 30}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-white/10 text-lg font-bold text-white transition hover:bg-white/20 disabled:opacity-30"
                  aria-label="More days"
                >
                  +
                </button>
              </div>
              {/* Preset chips — common trip lengths (1d through 14d). */}
              <div className="mt-1.5 flex flex-wrap gap-1">
                {[1, 2, 3, 5, 7, 10, 14].map((n) => {
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
              : "Tap +/− to change how many days you stay at each stop. Add another stop when ready."}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Stage-4 template-loaded banner (desktop). */}
          {templateNotice && (
            <div className="mb-3 flex items-start gap-2 rounded-lg border border-wn-navy/25 bg-wn-navy/5 px-3 py-2">
              <span className="text-base leading-none" aria-hidden="true">✨</span>
              <div className="flex-1 text-[12px] leading-snug text-wn-navy">
                <span className="font-bold">Template loaded:</span> {templateNotice.title}.
                Customize and save when ready.
              </div>
              <button
                type="button"
                onClick={dismissTemplateNotice}
                aria-label="Dismiss template notice"
                className="ml-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-wn-navy/65 transition hover:bg-wn-navy/10 hover:text-wn-navy"
              >
                <span aria-hidden="true">×</span>
              </button>
            </div>
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

            {/* Inline "How many days here?" confirm card. Renders only
                while the user is mid-pick — between selecting a resort
                in the picker and either confirming (push stop) or
                cancelling (drop). Stops the wizard from silently
                appending a 1-day stop the user didn't actively choose. */}
            {pendingStop && (() => {
              const r = candidateBySlug.get(pendingStop.slug);
              const name = r?.name ?? pendingStop.slug;
              return (
                <li
                  className="rounded-lg border-2 border-wn-navy bg-wn-navy/5 p-3 shadow-sm"
                  aria-live="polite"
                >
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-wn-navy">
                    Confirm stop {stops.length + 1}
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
                        disabled={pendingStop.days >= Math.max(1, days - daysPlanned)}
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
                      ✓ Confirm
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
                  - no pending-stop confirm card is open AND
                  - there are still days left to plan (remainingDays > 0)
                Once daysPlanned >= days the button hides and a green
                "All days planned — ready to save" card takes its place
                so the wizard has a visible end state instead of letting
                the user keep adding stops past the trip length. */}
            {!pendingStop && remainingDays > 0 && (
              <li>
                <button
                  type="button"
                  onClick={() => setPickerForIndex("new")}
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
            <div className="mt-3 rounded-lg border border-wn-charcoal/10 bg-white p-3">
              <div className="mb-1 flex items-baseline justify-between">
                <div className="text-[10px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
                  Estimated trip cost
                </div>
                <div className="text-[10px] text-wn-charcoal/45">per person</div>
              </div>
              <div className="mb-2 text-base font-extrabold tracking-tight text-wn-navy">
                ${costBreakdown.totalLow.toLocaleString()}–${costBreakdown.totalHigh.toLocaleString()}
              </div>
              {costBreakdown.passCoversAll && (
                <p className="mb-2 rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-800">
                  ✓ Your pass covers all stops — lift tickets $0
                </p>
              )}
              <dl className="grid grid-cols-3 gap-2 text-center">
                <CostTile
                  label="Lift tickets"
                  value={`$${costBreakdown.liftTickets.toLocaleString()}`}
                />
                <CostTile
                  label={`Lodging (${costBreakdown.totalDays} night${costBreakdown.totalDays === 1 ? "" : "s"})`}
                  value={`$${costBreakdown.lodging.toLocaleString()}`}
                />
                <CostTile
                  label={`Driving (${totalRoundTripMiles.toLocaleString()} mi)`}
                  value={`$${costBreakdown.driving.toLocaleString()}`}
                />
              </dl>
              <p className="mt-2 text-[10px] leading-tight text-wn-charcoal/50">
                Estimate. Real prices vary by date, hotel, and demand.
              </p>
            </div>
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
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3">
          {saveError && <p className="mb-2 text-[11px] text-red-700">{saveError}</p>}
          <button
            type="button"
            onClick={saveTrip}
            disabled={stops.length === 0 || saving}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
          >
            {saving ? "Saving…" : isAuthed ? "Save this trip" : "Sign in to save trip"}
            <span aria-hidden="true">→</span>
          </button>
          <p className="mt-1.5 text-center text-[10px] text-wn-charcoal/55">
            {isAuthed
              ? 'Saved trips show up under "My trips" — you can start one anytime.'
              : "We use a magic link, no password."}
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
          onSelect={handlePicked}
          onConfirmPending={confirmPreviewPick}
          onClose={() => {
            setPickerForIndex(null);
            setPendingStop(null);
            onPreviewLeg?.(null);
          }}
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
