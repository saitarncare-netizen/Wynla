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
import Icon from "@/components/icons/Icon";

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
  // Live textarea value + whether a debounced save is still pending.
  // Place edits and the unmount flush read THESE, never the plans state —
  // after a failed save the plans state rolls back but the textarea keeps
  // the user's text, and that visible text is the truth to persist.
  const noteRef = useRef(note);
  const notePendingRef = useRef(false);
  // Mirror state into refs after commit (writing refs during render is a
  // react-hooks/refs lint error and unsafe under concurrent rendering).
  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);
  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  // Read-merge-write. Each day card holds its own snapshot of the whole
  // day_plans object, so writing our local copy wholesale would CLOBBER a
  // sibling day's just-saved edits (edit day 1, then day 2 → day 2's
  // write resurrects day 1's old note). Re-fetch the current column and
  // merge only THIS day's plan over it before writing. .select("id")
  // exposes the RLS 0-row case (non-owner) as an error instead of a
  // silent fake success.
  async function persist(update: DayPlanT, rollback: DayPlans) {
    setSaveState("saving");
    const sb = createSupabaseBrowserClient();
    const { data: freshRow, error: readErr } = await sb
      .from("trips")
      .select("day_plans")
      .eq("id", tripId)
      .maybeSingle<{ day_plans: unknown }>();
    if (readErr || !freshRow) {
      setPlans(rollback);
      setSaveState("error");
      return;
    }
    const merged = withDayPlan(parseDayPlans(freshRow.day_plans), day, update);
    const { data: updated, error } = await sb
      .from("trips")
      .update({ day_plans: merged })
      .eq("id", tripId)
      .select("id");
    if (error || !updated || updated.length === 0) {
      setPlans(rollback);
      setSaveState("error");
    } else {
      setPlans(merged);
      setSaveState("idle");
    }
  }

  function commit(update: DayPlanT) {
    const prev = plansRef.current;
    // Optimistic local view of this day; persist() recomputes against the
    // fresh server copy so sibling days are never clobbered.
    setPlans(withDayPlan(prev, day, update));
    void persist(update, prev);
  }

  // Debounced note save. "Saving…" shows from the first keystroke so the
  // user always has an unsaved-work cue during the debounce window.
  function onNoteChange(v: string) {
    setNote(v);
    notePendingRef.current = true;
    setSaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      notePendingRef.current = false;
      commit({ note: v, places: plansRef.current[String(day)]?.places });
    }, 800);
  }
  // Unmount: FLUSH a pending note instead of discarding it — "type a note,
  // tap ← All trips within 800ms" must not silently lose the text. The
  // fire-and-forget persist is safe; React ignores setState after unmount.
  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (notePendingRef.current) {
        notePendingRef.current = false;
        commit({
          note: noteRef.current,
          places: plansRef.current[String(day)]?.places,
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const places = plan.places ?? [];
  const attachedIds = new Set(places.map((p) => `${p.kind}:${p.id}`));
  const addable = nearby.filter((n) => !attachedIds.has(`${n.kind}:${n.id}`));

  // Place edits carry the LIVE textarea note (noteRef), not the plans
  // state — otherwise a place edit right after a failed note save would
  // persist the rolled-back old note while the screen shows the new one.
  function addPlace(n: NearbyOption) {
    notePendingRef.current = false;
    commit({ note: noteRef.current, places: [...places, { ...n }] });
  }
  function removePlace(p: DayPlace) {
    notePendingRef.current = false;
    commit({
      note: noteRef.current,
      places: places.filter((x) => !(x.kind === p.kind && x.id === p.id)),
    });
  }

  const hasContent = places.length > 0 || note.trim() !== "";

  return (
    <div className={`mt-3 border-t border-dashed border-wn-line pt-3 ${completed ? "opacity-80" : ""}`}>
      {/* Attached places — always visible when present (the itinerary). */}
      {places.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-x-1.5 gap-y-2">
          {places.map((p) => (
            <li
              key={`${p.kind}:${p.id}`}
              className="group inline-flex items-center gap-1 rounded-full border border-wn-navy/15 bg-wn-navy/5 py-1 pl-2.5 pr-1 text-xs font-semibold text-wn-navy"
            >
              <a
                href={mapsPlaceUrl(p.name, p.latitude, p.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                // Vertical-only hit area (~44 px); stays clear of the remove x.
                className="relative before:absolute before:inset-x-0 before:-inset-y-3.5 before:content-[''] hover:underline"
                title={`${p.name} — open in Google Maps`}
              >
                <span aria-hidden="true">{p.kind === "restaurant" ? "🍽️ " : "🎯 "}</span>
                {p.name}
              </a>
              <button
                type="button"
                onClick={() => removePlace(p)}
                aria-label={`Remove ${p.name} from this day`}
                className="relative inline-flex h-6 w-6 items-center justify-center rounded-full text-wn-muted transition before:absolute before:inset-x-0 before:-inset-y-2.5 before:content-[''] hover:bg-wn-navy/10 hover:text-wn-navy"
              >
                <Icon name="close" className="h-3.5 w-3.5" />
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
        className="w-full resize-none rounded-wn-sm border border-transparent bg-wn-offwhite/70 px-3 py-2 text-sm text-wn-charcoal placeholder:text-wn-muted transition focus:border-wn-navy/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-wn-navy/25"
      />

      <div className="mt-1.5 flex items-center justify-between">
        {/* Add-places toggle — only when this day's resort has nearby data. */}
        {nearby.length > 0 ? (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="inline-flex min-h-11 items-center gap-1 rounded-wn-sm px-1.5 py-1 text-xs font-bold text-wn-navy transition hover:bg-wn-navy/5 sm:min-h-0"
          >
            <span aria-hidden="true">{open ? "−" : "+"}</span>
            {open ? "Hide places" : hasContent ? "Add more places" : "Add restaurants & activities"}
          </button>
        ) : (
          <span />
        )}
        <span
          aria-live="polite"
          className={`text-xs font-medium ${
            saveState === "error" ? "text-wn-danger" : "text-wn-muted"
          }`}
        >
          {saveState === "saving" ? "Saving…" : saveState === "error" ? "Couldn't save — retry your last change" : ""}
        </span>
      </div>

      {/* One-tap add list — compact rows, recommended first. */}
      {open && addable.length > 0 && (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-wn-sm border border-wn-line bg-white p-1.5">
          {addable.map((n) => (
            <li key={`${n.kind}:${n.id}`}>
              <button
                type="button"
                onClick={() => addPlace(n)}
                className="flex min-h-11 w-full items-center gap-2 rounded-wn-sm px-2 py-1.5 text-left transition hover:bg-wn-navy/5"
              >
                <span aria-hidden="true" className="text-sm">
                  {n.kind === "restaurant" ? "🍽️" : "🎯"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-wn-charcoal">
                    {n.is_recommended && <span aria-hidden="true">⭐ </span>}
                    {n.name}
                  </span>
                  {n.category && (
                    <span className="block truncate text-xs capitalize text-wn-muted">
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
        <p className="mt-2 rounded-wn-sm border border-wn-line bg-wn-offwhite px-3 py-2 text-xs text-wn-muted">
          Everything nearby is already on this day.
        </p>
      )}
    </div>
  );
}
