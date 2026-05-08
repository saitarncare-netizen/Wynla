"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDriveTime, type Origin } from "@/lib/origins";
import { passColor, primaryPass } from "@/lib/passColors";
import {
  planTrip,
  planFromOrderedSlugs,
  type PlannerCandidate,
  type TripPlan,
} from "@/lib/tripPlanner";
import { supabase } from "@/lib/supabase";
import ResortPicker from "./ResortPicker";
import type { Resort } from "./MapPage";

type Props = {
  open: boolean;
  origin: Origin;
  /** Filtered resorts (respects pass / size / drive cap). Used as the
      initial seed pool for the algorithm. */
  candidates: Resort[];
  /** Every active resort, no filter. Used by the per-day picker so the
      user can pick something far/exotic that the algorithm wouldn't. */
  allResorts: Resort[];
  days: number;
  /** Fully-explicit ordered slugs from ?route=… (share link). Overrides
      both algorithm and per-day picker state when present. */
  initialOrderedSlugs?: string[];
  isAuthed: boolean;
  onClose: () => void;
};

function resortToCandidate(r: Resort): PlannerCandidate {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    state: r.state,
    lat: Number(r.latitude),
    lng: Number(r.longitude),
  };
}

export default function TripPlannerPanel({
  open,
  origin,
  candidates,
  allResorts,
  days,
  initialOrderedSlugs,
  isAuthed,
  onClose,
}: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"basecamp" | "roadtrip">("roadtrip");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Per-day overrides keyed by day index. Empty means "use algorithm".
  // Implicit reset whenever mode / days / origin change: each entry is
  // tagged with the context it was made under, and any stale entry is
  // ignored at read time. Avoids a setState-in-effect cascade.
  const [overrides, setOverrides] = useState<Record<number, string>>({});
  const [overridesKey, setOverridesKey] = useState<string>("");
  const [pickerDay, setPickerDay] = useState<number | null>(null);

  const candidatePool = useMemo(
    () => candidates.filter((r) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude))).map(resortToCandidate),
    [candidates],
  );
  // Bigger pool that includes resorts outside the current filter — used
  // by the picker AND by plan reconstruction when an override picks a
  // resort that isn't in the filtered pool.
  const allCandidatePool = useMemo(
    () => allResorts.filter((r) => Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude))).map(resortToCandidate),
    [allResorts],
  );

  const originLabel = origin.kind === "geo" ? "Your location" : origin.name;
  const originLat = origin.lat;
  const originLng = origin.lon;

  const contextKey = `${mode}|${days}|${originLat.toFixed(5)}|${originLng.toFixed(5)}`;
  // Render-phase reset: when the inputs that produced these overrides
  // change, drop them so the fresh algorithm output isn't shadowed by
  // stale picks. React explicitly supports calling setState during
  // render to derive state from prop change.
  if (overridesKey !== contextKey) {
    setOverridesKey(contextKey);
    if (Object.keys(overrides).length > 0) setOverrides({});
  }

  // Initial algorithm plan (no overrides applied).
  const initialPlan: TripPlan | null = useMemo(() => {
    const originLatLng = { lat: originLat, lng: originLng };
    if (initialOrderedSlugs && initialOrderedSlugs.length > 0) {
      return planFromOrderedSlugs(originLatLng, originLabel, allCandidatePool, initialOrderedSlugs, mode);
    }
    return planTrip(mode, originLatLng, originLabel, candidatePool, days);
  }, [mode, originLat, originLng, originLabel, candidatePool, allCandidatePool, days, initialOrderedSlugs]);

  // Final plan = initial plan with per-day overrides spliced in.
  // Built by re-running planFromOrderedSlugs against allCandidatePool so
  // resorts the user picked from outside the filter still resolve.
  const plan: TripPlan | null = useMemo(() => {
    if (!initialPlan) return null;
    if (Object.keys(overrides).length === 0) return initialPlan;
    const slugs = initialPlan.resorts.map((r, i) => overrides[i] ?? r.slug);
    const originLatLng = { lat: originLat, lng: originLng };
    return planFromOrderedSlugs(originLatLng, originLabel, allCandidatePool, slugs, mode);
  }, [initialPlan, overrides, originLat, originLng, originLabel, allCandidatePool, mode]);

  // Compute the "from" point for the picker based on which day the user
  // is editing. Day 0 starts at the origin; day N starts at day N-1's
  // resort (post-overrides).
  const pickerFromPoint = useMemo(() => {
    if (pickerDay == null || !plan) return null;
    if (pickerDay === 0 || mode === "basecamp") {
      return { lat: originLat, lng: originLng, label: originLabel };
    }
    const prev = plan.resorts[pickerDay - 1];
    if (!prev) return { lat: originLat, lng: originLng, label: originLabel };
    return { lat: prev.lat, lng: prev.lng, label: prev.name };
  }, [pickerDay, plan, mode, originLat, originLng, originLabel]);

  function handlePickFor(dayIndex: number, slug: string) {
    setOverrides((prev) => {
      const next = { ...prev };
      if (mode === "basecamp") {
        // Basecamp: one resort for the whole trip — overriding any day
        // overrides every day. Simpler model than per-day picks here.
        for (let i = 0; i < days; i++) next[i] = slug;
      } else {
        next[dayIndex] = slug;
      }
      return next;
    });
    setPickerDay(null);
  }

  async function saveTrip() {
    if (!plan) return;
    setSaving(true);
    setSaveError(null);
    const { data: userRes } = await supabase.auth.getUser();
    if (!userRes.user) {
      setSaving(false);
      const returnTo = `${window.location.pathname}${window.location.search}`;
      router.push(`/login?next=${encodeURIComponent(returnTo)}`);
      return;
    }
    const { data, error } = await supabase
      .from("trips")
      .insert({
        user_id: userRes.user.id,
        name: `${days}-day trip from ${originLabel}`,
        origin_lat: origin.lat,
        origin_lng: origin.lon,
        origin_label: originLabel,
        resort_slugs: plan.resorts.map((r) => r.slug),
        lodging_mode: mode,
        total_days: plan.days,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      setSaveError(error?.message ?? "Couldn't save trip.");
      return;
    }
    router.push(`/trip/${data.id}`);
  }

  if (!open) return null;

  const pickedSlugs = plan ? plan.resorts.map((r) => r.slug) : [];

  return (
    <>
      {/* Mobile scrim */}
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
          "inset-x-0 bottom-0 max-h-[85vh] rounded-t-2xl",
          "animate-[slideUp_220ms_cubic-bezier(0.16,1,0.3,1)]",
          "md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-[420px] md:max-h-none md:rounded-none",
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

          <div className="mt-3 grid grid-cols-2 gap-1 rounded-md bg-white/10 p-1">
            <button
              type="button"
              onClick={() => setMode("roadtrip")}
              className={`rounded px-2 py-1.5 text-[11px] font-semibold transition ${
                mode === "roadtrip" ? "bg-white text-wn-navy" : "text-white/80 hover:text-white"
              }`}
            >
              🛣️ Road trip
            </button>
            <button
              type="button"
              onClick={() => setMode("basecamp")}
              className={`rounded px-2 py-1.5 text-[11px] font-semibold transition ${
                mode === "basecamp" ? "bg-white text-wn-navy" : "text-white/80 hover:text-white"
              }`}
            >
              🏠 Basecamp
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-tight text-white/65">
            {mode === "roadtrip"
              ? "Sleep at a different resort each night. Tap any day to swap in a different resort."
              : "Stay at one resort the whole trip. Tap to choose a different basecamp."}
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {!plan && (
            <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              No resorts in range with your current filters. Tap a day to pick any of the 451 resorts manually, or remove the pass filter.
            </p>
          )}

          {plan && plan.days < days && (
            <p className="mb-3 rounded-md border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900">
              Auto-pick filled {plan.days} day{plan.days === 1 ? "" : "s"}. Tap any day to extend the trip with a manual pick — there&apos;s no drive cap on manual picks.
            </p>
          )}

          {plan && (
            <ol className="flex flex-col gap-3">
              {plan.legs.map((leg, i) => {
                const r = plan.resorts[i];
                const passes = allResorts.find((c) => c.slug === r.slug)?.passes ?? [];
                const primary = primaryPass(passes);
                const dot = passColor(primary);
                const isStayPut = leg.durationSeconds === 0 && i > 0;
                const isOverride = overrides[i] != null;
                return (
                  <li
                    key={i}
                    className={`rounded-lg border bg-white p-3 transition ${
                      isOverride ? "border-wn-navy/40 ring-1 ring-wn-navy/15" : "border-wn-charcoal/10"
                    }`}
                  >
                    <div className="mb-1 flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
                      <span>
                        Day {i + 1}
                        {isOverride && <span className="ml-1.5 text-wn-navy">your pick</span>}
                      </span>
                      <span className="text-wn-charcoal/45 normal-case tracking-normal">
                        {isStayPut ? "stay put" : `≈ ${formatDriveTime(leg.durationSeconds)} drive`}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: dot }}
                        aria-hidden="true"
                      />
                      <Link
                        href={`/resort/${r.slug}`}
                        className="text-sm font-bold text-wn-navy hover:underline"
                      >
                        {r.name}
                      </Link>
                      <span className="text-[11px] text-wn-charcoal/50">{r.state}</span>
                    </div>
                    {!isStayPut && i === 0 && (
                      <p className="mt-0.5 text-[11px] text-wn-charcoal/55">
                        From {leg.fromName}
                      </p>
                    )}
                    {!isStayPut && i > 0 && (
                      <p className="mt-0.5 text-[11px] text-wn-charcoal/55">
                        From {leg.fromName} the night before
                      </p>
                    )}
                    {/* Swap button — same row as drive estimate. Basecamp
                        mode only exposes one pick (the basecamp itself),
                        so hide the per-day swap on days > 0. */}
                    {(mode === "roadtrip" || i === 0) && (
                      <button
                        type="button"
                        onClick={() => setPickerDay(i)}
                        className="mt-2 w-full rounded-md border border-wn-charcoal/15 bg-white px-2 py-1.5 text-[11px] font-semibold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy"
                      >
                        🔍 {mode === "basecamp" ? "Pick a different basecamp" : "Pick a different resort for this day"}
                      </button>
                    )}
                  </li>
                );
              })}
              {plan.homeLeg && (
                <li className="rounded-lg border border-dashed border-wn-charcoal/20 bg-wn-offwhite p-3">
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
                    After day {plan.days}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-bold text-wn-navy">🏠 Drive home</span>
                    <span className="text-xs text-wn-charcoal/60">
                      ≈ {formatDriveTime(plan.homeLeg.durationSeconds)}
                    </span>
                  </div>
                </li>
              )}
            </ol>
          )}

          {plan && (
            <div className="mt-3 rounded-md bg-wn-offwhite px-3 py-2 text-[11px] text-wn-charcoal/70">
              Total drive time across the trip:{" "}
              <strong className="text-wn-navy">
                ≈ {formatDriveTime(plan.totalDriveSeconds)}
              </strong>
              <span className="ml-1 text-wn-charcoal/55">
                (estimate — exact via Mapbox once you start the trip)
              </span>
            </div>
          )}

          {Object.keys(overrides).length > 0 && (
            <button
              type="button"
              onClick={() => setOverrides({})}
              className="mt-2 w-full rounded-md border border-wn-charcoal/10 bg-white px-3 py-1.5 text-[11px] font-semibold text-wn-charcoal/70 transition hover:border-wn-charcoal/30 hover:text-wn-navy"
            >
              ↺ Reset to auto-picked plan
            </button>
          )}
        </div>

        <footer className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3">
          {saveError && <p className="mb-2 text-[11px] text-red-700">{saveError}</p>}
          <button
            type="button"
            onClick={saveTrip}
            disabled={!plan || saving}
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

      {pickerFromPoint && pickerDay != null && (
        <ResortPicker
          open
          title={
            mode === "basecamp"
              ? "Pick your basecamp"
              : `Pick a resort for Day ${pickerDay + 1}`
          }
          fromPoint={pickerFromPoint}
          allResorts={allResorts}
          alreadyPicked={pickedSlugs}
          onSelect={(slug) => handlePickFor(pickerDay, slug)}
          onClose={() => setPickerDay(null)}
        />
      )}
    </>
  );
}

export type { TripPlan };
