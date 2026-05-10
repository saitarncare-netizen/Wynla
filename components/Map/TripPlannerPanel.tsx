"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { formatDriveTime, type Origin } from "@/lib/origins";
import { passColor, primaryPass } from "@/lib/passColors";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";
import { expandStopsToDays, type Stop } from "@/lib/tripPlanner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
  /** Global pass filter — passed through to the picker as the initial
      chip selection. The picker keeps its own internal state from
      there; toggling chips inside the dialog does NOT change the
      global filter. */
  passFilter?: string[];
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
  onViewFullRoute?: () => void;
};

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
  passFilter,
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

  // Render-phase reset for pendingStop on panel close. Avoids the
  // setState-in-effect lint while still guaranteeing the in-flight
  // confirm card disappears when the user closes the planner.
  const [lastOpen, setLastOpen] = useState(open);
  if (lastOpen !== open) {
    setLastOpen(open);
    if (!open && pendingStop) setPendingStop(null);
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
    // eslint-disable-next-line no-console
    console.log("[wynla] onTripRoute emit:", {
      pointsCount: tripRoutePoints?.length ?? 0,
      routeKey,
    });
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
    // eslint-disable-next-line no-console
    console.log("[wynla] handlePicked:", { slug, targetIndex });
    setPickerForIndex(null);
    onPreviewLeg?.(null);

    if (targetIndex === "new") {
      setPendingStop({ slug, days: Math.max(1, Math.min(remainingDays || 1, 1)) });
    } else {
      setStops((prev) => prev.map((s, i) => (i === targetIndex ? { ...s, slug } : s)));
    }

    const r = candidateBySlug.get(slug);
    // eslint-disable-next-line no-console
    console.log("[wynla] candidateBySlug.get:", { slug, found: !!r, lat: r?.latitude, lng: r?.longitude });
    if (r && onFocusResort) {
      onFocusResort({ lat: Number(r.latitude), lng: Number(r.longitude) });
    }
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
    setStops((prev) => [...prev, { slug: pendingStop.slug, days: pendingStop.days }]);
    setPendingStop(null);
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

  return (
    <>
      <button
        type="button"
        aria-label="Close trip planner"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-wn-charcoal/30 backdrop-blur-[1px] md:hidden"
      />

      <aside
        role="complementary"
        aria-label="Trip planner"
        className={[
          "fixed z-40 flex flex-col bg-white shadow-2xl",
          "inset-x-0 bottom-0 max-h-[88vh] rounded-t-2xl",
          "animate-[slideUp_220ms_cubic-bezier(0.16,1,0.3,1)]",
          "md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-[440px] md:max-h-none md:rounded-none",
          "md:animate-[slideLeft_220ms_cubic-bezier(0.16,1,0.3,1)]",
        ].join(" ")}
      >
        <div className="flex shrink-0 justify-center pt-2 md:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-wn-charcoal/20" />
        </div>

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
              <label
                htmlFor="trip-days-input"
                className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.15em] text-white/60"
              >
                How many days is your trip?
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="trip-days-input"
                  type="number"
                  min={1}
                  max={30}
                  step={1}
                  value={days}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    if (Number.isFinite(n) && n >= 1 && n <= 30) {
                      onDaysChange(n);
                    }
                  }}
                  className="w-20 rounded-md border border-white/20 bg-white/5 px-3 py-2 text-center text-base font-bold text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30"
                  aria-label="Trip length in days"
                />
                <span className="text-[11px] text-white/65">
                  {days === 1 ? "day" : "days"} total
                </span>
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
      </aside>

      {pickerFromPoint && pickerForIndex != null && (
        <ResortPicker
          open
          title={pickerForIndex === "new" ? "Pick a resort to add" : `Swap stop ${(pickerForIndex as number) + 1}`}
          fromPoint={pickerFromPoint}
          allResorts={pickerResorts}
          alreadyPicked={pickedSlugs}
          initialPassFilter={passFilter}
          onSelect={handlePicked}
          onClose={() => {
            setPickerForIndex(null);
            onPreviewLeg?.(null);
          }}
          onHover={(slug) => {
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
