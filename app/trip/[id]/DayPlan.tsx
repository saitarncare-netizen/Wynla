"use client";

// Trip itinerary v2 — the per-day plan editor inside each day card.
// A note ("อยากไปไหนบ้างวันนี้") + places attached from that day's
// resort nearby data (restaurants + activities, recommended first),
// added with one tap. Saitarn's ask: plan day-by-day like a real trip —
// note day 1's restaurants/activities, check the day off, move on.
//
// Persistence: whole-column update of trips.day_plans (jsonb) via the
// browser client — RLS owner-update already covers it (same pattern as
// TripActions). Note saves are debounced 800ms; place add/remove saves
// immediately. All writes are optimistic with rollback on error.

import { useEffect, useRef, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  parseDayPlans,
  withDayPlan,
  type DayPlace,
  type DayPlan as DayPlanT,
  type DayPlans,
} from "@/lib/dayPlans";
import { mapsPlaceUrl } from "@/lib/nearbyCategories";

export type NearbyOption = DayPlace & { is_recommended: boolean };

type Props = {
  tripId: string;
  day: number;
  initialPlans: DayPlans;
  /** Nearby options for THIS day's resort (already recommended-first). */
  nearby: NearbyOption[];
  /** Muted styling for completed days. */
  completed?: boolean;
};

export default function DayPlan({ tripId, day, initialPlans, nearby, completed }: Props) {
  const [plans, setPlans] = useState<DayPlans>(() => parseDayPlans(initialPlans));
  const plan: DayPlanT = plans[String(day)] ?? {};
  const [note, setNote] = useState(plan.note ?? "");
  const [open, setOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plansRef = useRef(plans);
  plansRef.current = plans;

  async function persist(next: DayPlans, rollback: DayPlans) {
    setSaveState("saving");
    const sb = createSupabaseBrowserClient();
    const { error } = await sb
      .from("trips")
      .update({ day_plans: next })
      .eq("id", tripId);
    if (error) {
      setPlans(rollback);
      setSaveState("error");
    } else {
      setSaveState("idle");
    }
  }

  function commit(update: DayPlanT) {
    const prev = plansRef.current;
    const next = withDayPlan(prev, day, update);
    setPlans(next);
    void persist(next, prev);
  }

  // Debounced note save.
  function onNoteChange(v: string) {
    setNote(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      commit({ note: v, places: plansRef.current[String(day)]?.places });
    }, 800);
  }
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const places = plan.places ?? [];
  const attachedIds = new Set(places.map((p) => `${p.kind}:${p.id}`));
  const addable = nearby.filter((n) => !attachedIds.has(`${n.kind}:${n.id}`));

  function addPlace(n: NearbyOption) {
    commit({
      note: plansRef.current[String(day)]?.note,
      places: [...places, { ...n }],
    });
  }
  function removePlace(p: DayPlace) {
    commit({
      note: plansRef.current[String(day)]?.note,
      places: places.filter((x) => !(x.kind === p.kind && x.id === p.id)),
    });
  }

  const hasContent = places.length > 0 || note.trim() !== "";

  return (
    <div className={`mt-3 border-t border-dashed border-wn-charcoal/10 pt-3 ${completed ? "opacity-80" : ""}`}>
      {/* Attached places — always visible when present (the itinerary). */}
      {places.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-1.5">
          {places.map((p) => (
            <li
              key={`${p.kind}:${p.id}`}
              className="group inline-flex items-center gap-1 rounded-full border border-wn-navy/15 bg-wn-navy/5 py-1 pl-2.5 pr-1 text-[11px] font-semibold text-wn-navy"
            >
              <a
                href={mapsPlaceUrl(p.name, p.latitude, p.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline"
                title={`${p.name} — open in Google Maps`}
              >
                <span aria-hidden="true">{p.kind === "restaurant" ? "🍽️ " : "🎯 "}</span>
                {p.name}
              </a>
              <button
                type="button"
                onClick={() => removePlace(p)}
                aria-label={`Remove ${p.name} from this day`}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-wn-navy/40 transition hover:bg-wn-navy/10 hover:text-wn-navy"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Note — grows only when used; placeholder invites the plan. */}
      <textarea
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        rows={note.trim() === "" ? 1 : Math.min(4, note.split("\n").length + 1)}
        maxLength={2000}
        placeholder="Notes for this day — where to eat, what time to leave…"
        style={{ fontSize: "16px" }}
        className="w-full resize-none rounded-lg border border-transparent bg-wn-offwhite/70 px-3 py-2 text-[13px] text-wn-charcoal placeholder:text-wn-charcoal/40 transition focus:border-wn-navy/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-wn-navy/10"
      />

      <div className="mt-1.5 flex items-center justify-between">
        {/* Add-places toggle — only when this day's resort has nearby data. */}
        {nearby.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold text-wn-navy/80 transition hover:bg-wn-navy/5 hover:text-wn-navy"
          >
            <span aria-hidden="true">{open ? "−" : "+"}</span>
            {open ? "Hide places" : hasContent ? "Add more places" : "Add restaurants & activities"}
          </button>
        ) : (
          <span />
        )}
        <span
          aria-live="polite"
          className={`text-[10px] font-medium ${
            saveState === "error" ? "text-red-600" : "text-wn-charcoal/40"
          }`}
        >
          {saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save — retry your last change" : ""}
        </span>
      </div>

      {/* One-tap add list — compact rows, recommended first. */}
      {open && addable.length > 0 && (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-wn-charcoal/10 bg-white p-1.5">
          {addable.map((n) => (
            <li key={`${n.kind}:${n.id}`}>
              <button
                type="button"
                onClick={() => addPlace(n)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition hover:bg-wn-navy/5"
              >
                <span aria-hidden="true" className="text-sm">
                  {n.kind === "restaurant" ? "🍽️" : "🎯"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-wn-charcoal">
                    {n.is_recommended && <span aria-hidden="true">⭐ </span>}
                    {n.name}
                  </span>
                  {n.category && (
                    <span className="block truncate text-[10px] capitalize text-wn-charcoal/50">
                      {n.category}
                    </span>
                  )}
                </span>
                <span
                  aria-hidden="true"
                  className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-wn-navy/10 text-sm font-bold text-wn-navy"
                >
                  +
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && addable.length === 0 && (
        <p className="mt-2 rounded-lg border border-wn-charcoal/10 bg-wn-offwhite px-3 py-2 text-[11px] text-wn-charcoal/55">
          Everything nearby is already on this day.
        </p>
      )}
    </div>
  );
}
