"use client";

// Trip itinerary v2 — the per-day plan editor inside each day card.
// A note ("อยากไปไหนบ้างวันนี้") + places attached from that day's
// resort nearby data (restaurants + activities, recommended first),
// added with one tap. Saitarn's ask: plan day-by-day like a real trip —
// note day 1's restaurants/activities, check the day off, move on.
//
// Persistence: trips.day_plans (jsonb) via the browser client — RLS
// owner-update already covers it (same pattern as TripActions). Every
// write re-reads the column and applies only the ONE change the person
// made (lib/tripToday applyDayPlanEdit), never this card's copy of the
// day: places also arrive from "+ Trip" on the map sheet or another tab,
// and writing a stale local list would erase or resurrect them. Note
// saves are debounced 800ms; place add/remove saves immediately. All
// writes are optimistic with rollback on error.
//
// Trip mode: the Today card at the top of the page lists the places saved
// for today's mountain (every day of a multi-night stay, and other visits
// to it), so a place add/remove here refreshes the server render to keep
// that list current, and a saved chip opens Google Maps DIRECTIONS (the
// rider is on the mountain, headed there) rather than a map search.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  MAX_PLACES_PER_DAY,
  parseDayPlans,
  placeKey,
  type DayPlace,
  type DayPlan as DayPlanT,
  type DayPlans,
} from "@/lib/dayPlans";
import { mapsDirectionsUrl } from "@/lib/nearbyCategories";
import { applyDayPlanEdit, placeCategoryLabel, type DayPlanEdit } from "@/lib/tripToday";
import Icon from "@/components/icons/Icon";

export type NearbyOption = DayPlace & { is_recommended: boolean };

/** window event (detail = day number) that opens that day's add list. */
export const OPEN_DAY_PLAN_EVENT = "wn:open-day-plan";

/** Whether the Today card at the top of the page lists this stay's
 *  places: right now (the trip is on and today is in this stay), once
 *  the trip starts, or not at the moment (another stay is today, or the
 *  trip is over). Only "now" may link there: the card shows no places
 *  otherwise, so the link would land on nothing. */
export type TodayCardStay = "now" | "after-start" | "not-now";

type Props = {
  tripId: string;
  day: number;
  initialPlans: DayPlans;
  /** Nearby options for THIS day's resort (already recommended-first). */
  nearby: NearbyOption[];
  /** placeKeys saved on OTHER days of the trip (server-computed, fresh
   *  after every router.refresh). A place is saved once per trip, so the
   *  add list leaves these out instead of creating a hidden duplicate. */
  savedElsewhere?: string[];
  /** Muted styling for completed days. */
  completed?: boolean;
  /** Day 2+ of a multi-night stay: places saved on any day of the stay
   *  already show every day in the Today card, so say so instead of
   *  inviting the rider to re-add them. */
  continuesStay?: boolean;
  /** See TodayCardStay; only read when continuesStay. */
  todayCard?: TodayCardStay;
};

// Every day card's writes to one trip's day_plans run one at a time. Each
// write is read-apply-write, so two in flight at once (day 1's note save
// while day 2 adds a place, or a note save racing a place add on the same
// card) could read the same row, and the second write would drop the
// first one's change.
const writeQueues = new Map<string, Promise<void>>();

function enqueueWrite(tripId: string, job: () => Promise<void>): void {
  const next = (writeQueues.get(tripId) ?? Promise.resolve()).then(job).catch(() => {});
  writeQueues.set(tripId, next);
}

export default function DayPlan({
  tripId,
  day,
  initialPlans,
  nearby,
  savedElsewhere,
  completed,
  continuesStay,
  todayCard = "not-now",
}: Props) {
  const router = useRouter();
  const [plans, setPlans] = useState<DayPlans>(() => parseDayPlans(initialPlans));
  const plan: DayPlanT = plans[String(day)] ?? {};
  const [note, setNote] = useState(plan.note ?? "");
  const [open, setOpen] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "error">("idle");
  // Why the last add did not land, when the fresh row said no: this day
  // filled up elsewhere, or the place is already saved on another day.
  const [addNotice, setAddNotice] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const plansRef = useRef(plans);
  // Live textarea value, whether a debounced save is still pending, and
  // whether the textarea holds text not saved yet (typing, or a failed
  // save: the plans state rolls back but the textarea keeps the user's
  // text, and that visible text is the truth to persist). Place edits
  // carry the note only while it is unsaved, so they never overwrite a
  // note edited in another tab with this card's old copy.
  const noteRef = useRef(note);
  const notePendingRef = useRef(false);
  const noteDirtyRef = useRef(false);
  // Mirror state into refs after commit (writing refs during render is a
  // react-hooks/refs lint error and unsafe under concurrent rendering).
  useEffect(() => {
    plansRef.current = plans;
  }, [plans]);
  useEffect(() => {
    noteRef.current = note;
  }, [note]);

  // Read, apply the one edit, write. Each day card holds its own snapshot
  // of the whole day_plans object, so writing any of it back would
  // CLOBBER newer data: a sibling day's just-saved edits, or a place
  // saved with "+ Trip" after this page loaded. applyDayPlanEdit changes
  // only what the person just did on this day. .select("id") exposes the
  // RLS 0-row case (non-owner) as an error instead of a silent fake
  // success.
  async function persist(edit: DayPlanEdit, rollback: DayPlans, refreshToday: boolean) {
    setSaveState("saving");
    try {
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
      const res = applyDayPlanEdit(parseDayPlans(freshRow.day_plans), day, edit);
      // Nothing to write when the fresh row already says it (the place is
      // already on this day, or already removed elsewhere).
      if (res.changed) {
        const { data: updated, error } = await sb
          .from("trips")
          .update({ day_plans: res.dayPlans })
          .eq("id", tripId)
          .select("id");
        if (error || !updated || updated.length === 0) {
          setPlans(rollback);
          setSaveState("error");
          return;
        }
      }
      setPlans(res.dayPlans);
      if (edit.note !== undefined && edit.note === noteRef.current) noteDirtyRef.current = false;
      setSaveState(notePendingRef.current ? "saving" : "idle");
      setAddNotice(
        res.add?.status === "full"
          ? `Day ${day} already has ${MAX_PLACES_PER_DAY} places. Remove one to add another.`
          : res.add?.status === "already" && res.add.day !== day
            ? `Already saved on day ${res.add.day}.`
            : null,
      );
      // Re-render the server page so the Today card's place list (and the
      // other days' add lists) match. Client state here survives a
      // refresh; notes skip it (typing would re-run the page's queries
      // every 800 ms for text the card never shows).
      if (refreshToday) router.refresh();
    } catch {
      setPlans(rollback);
      setSaveState("error");
    }
  }

  function commit(edit: DayPlanEdit, refreshToday = false) {
    const prev = plansRef.current;
    // Optimistic local view of this day; persist() applies the same edit
    // to the fresh server copy, which then replaces this view.
    setPlans(applyDayPlanEdit(prev, day, edit).dayPlans);
    setAddNotice(null);
    enqueueWrite(tripId, () => persist(edit, prev, refreshToday));
  }

  /** A place edit also saves the note while it has unsaved text, and
   *  cancels the pending debounce that would save it again. */
  function withUnsavedNote(edit: DayPlanEdit): DayPlanEdit {
    if (!noteDirtyRef.current) return edit;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    notePendingRef.current = false;
    return { ...edit, note: noteRef.current };
  }

  // The Today card's "Add places" link scrolls to #day-N and fires this
  // event so the day's add list is already open when it lands. An event,
  // not hashchange: a second tap on the same link changes no hash.
  useEffect(() => {
    function onOpen(e: Event) {
      if ((e as CustomEvent<number>).detail === day) setOpen(true);
    }
    window.addEventListener(OPEN_DAY_PLAN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_DAY_PLAN_EVENT, onOpen);
  }, [day]);

  // Debounced note save. "Saving…" shows from the first keystroke so the
  // user always has an unsaved-work cue during the debounce window.
  function onNoteChange(v: string) {
    setNote(v);
    notePendingRef.current = true;
    noteDirtyRef.current = true;
    setSaveState("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      notePendingRef.current = false;
      commit({ note: v });
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
        commit({ note: noteRef.current });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const places = plan.places ?? [];
  const attachedIds = new Set(places.map(placeKey));
  const elsewhere = new Set(savedElsewhere ?? []);
  const notHere = nearby.filter((n) => !attachedIds.has(placeKey(n)));
  const addable = notHere.filter((n) => !elsewhere.has(placeKey(n)));
  // withDayPlan keeps at most MAX_PLACES_PER_DAY; past it an add would
  // flash in and silently vanish, so the list says so instead.
  const full = places.length >= MAX_PLACES_PER_DAY;

  function addPlace(n: NearbyOption) {
    if (full) return;
    // Only the DayPlace fields: is_recommended is a list hint, not plan data.
    const place: DayPlace = {
      id: n.id,
      kind: n.kind,
      name: n.name,
      category: n.category,
      latitude: n.latitude,
      longitude: n.longitude,
      website_url: n.website_url,
    };
    commit(withUnsavedNote({ add: place }), true);
  }
  function removePlace(p: DayPlace) {
    commit(withUnsavedNote({ remove: placeKey(p) }), true);
  }

  const hasContent = places.length > 0 || note.trim() !== "";

  return (
    <div className={`mt-3 border-t border-dashed border-wn-line pt-3 ${completed ? "opacity-80" : ""}`}>
      {continuesStay && (
        // "the Today card at the top of this page", never a bare "Today":
        // the phone tab bar has a Today tab (/today, My mountains today)
        // that does not show trip places. The link only while that card
        // is showing this stay's places; otherwise it would land on a
        // card listing another mountain, or none.
        <p className="mb-2 flex items-start gap-1.5 text-xs text-wn-muted">
          <Icon name="info" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {todayCard === "now" ? (
            <span>
              Places saved for this stay show every day in the{" "}
              <a href="#today" className="font-semibold text-wn-navy underline underline-offset-2">
                Today card at the top of this page
              </a>
            </span>
          ) : (
            <span>
              Places saved on any day of this stay show together in the Today card each day of the stay
              {todayCard === "after-start" ? ", once the trip starts." : "."}
            </span>
          )}
        </p>
      )}
      {/* Attached places — always visible when present (the itinerary). */}
      {places.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-x-1.5 gap-y-2">
          {places.map((p) => (
            <li
              key={placeKey(p)}
              className="group inline-flex items-center gap-1 rounded-full border border-wn-navy/15 bg-wn-navy/5 py-1 pl-2.5 pr-1 text-xs font-semibold text-wn-navy"
            >
              <a
                href={mapsDirectionsUrl(p.name, p.latitude, p.longitude)}
                target="_blank"
                rel="noopener noreferrer"
                // Vertical-only hit area (~44 px); stays clear of the remove x.
                className="relative before:absolute before:inset-x-0 before:-inset-y-3.5 before:content-[''] hover:underline"
                aria-label={`Directions to ${p.name}`}
                title={`Directions to ${p.name} in Google Maps`}
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
          {saveState === "saving"
            ? "Saving…"
            : saveState === "error"
              ? "Couldn't save — retry your last change"
              : (addNotice ?? "")}
        </span>
      </div>

      {open && full && (
        <p className="mt-2 rounded-wn-sm border border-wn-line bg-wn-offwhite px-3 py-2 text-xs text-wn-muted">
          {MAX_PLACES_PER_DAY} places is the most for one day. Remove one to add another.
        </p>
      )}
      {/* One-tap add list — compact rows, recommended first. */}
      {open && !full && addable.length > 0 && (
        <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-wn-sm border border-wn-line bg-white p-1.5">
          {addable.map((n) => (
            <li key={placeKey(n)}>
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
                  <span className="block truncate text-xs text-wn-muted">{placeCategoryLabel(n)}</span>
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
      {open && !full && addable.length === 0 && (
        <p className="mt-2 rounded-wn-sm border border-wn-line bg-wn-offwhite px-3 py-2 text-xs text-wn-muted">
          {notHere.length > 0
            ? "Everything nearby is already saved on this trip."
            : "Everything nearby is already on this day."}
        </p>
      )}
    </div>
  );
}
