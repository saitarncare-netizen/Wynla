"use client";

// Trip itinerary v2 — swap which resort a day points at, from the trip
// page itself. This is the "ปักหมุดทีหลัง" behavior Saitarn described:
// plan loosely up front, then decide day 2's mountain during the trip.
// Only offered on days that aren't completed yet.
//
// Write model: the trip may store grouped stops (resort_slugs=['vail',
// 'aspen'] + days_per_resort=[3,2]). Editing a single expanded day inside
// a group would ambiguously split it, so on first edit we NORMALIZE the
// trip to one-slug-per-day (days_per_resort all 1s — an equivalent
// representation the rest of the app already handles), then swap that
// day's slug. total_days is unchanged.

import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseDayPlans, withDayPlan } from "@/lib/dayPlans";
import { useFocusTrap } from "@/lib/useFocusTrap";
import Input from "@/components/ui/Input";

type SlimResort = { slug: string; name: string; state: string };

// Same expansion the trip page uses — one slug per day.
function expandSlugs(slugs: string[], daysPer: number[] | null): string[] {
  if (daysPer && daysPer.length === slugs.length) {
    const out: string[] = [];
    for (let i = 0; i < slugs.length; i++) {
      const reps = Math.max(1, daysPer[i] ?? 1);
      for (let j = 0; j < reps; j++) out.push(slugs[i]);
    }
    return out;
  }
  return slugs;
}

type Props = {
  tripId: string;
  /** 1-based expanded day number this control edits. */
  day: number;
  currentName: string;
};

export default function DayResortSwap({ tripId, day, currentName }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<SlimResort[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const ids = useId();
  const popoverId = `${ids}-popover`;
  const errorId = `${ids}-error`;
  const listId = `${ids}-list`;

  const close = useCallback(() => setOpen(false), []);

  // Popover, not a modal: the rest of the trip page stays usable, so no
  // inert / scroll lock / Tab wrap. Escape closes, focus lands in the
  // search box on open and returns to the Change button on close
  // (audit a11y-23).
  useFocusTrap(popoverRef, open, {
    initialFocusRef: inputRef,
    onEscape: close,
    modal: false,
  });

  // Click or tap outside the popover closes it.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);

  // Lazy-load the slim resort list the first time the picker opens
  // (~400 rows × 3 fields — small, and only for users actively editing).
  useEffect(() => {
    if (!open || options !== null) return;
    let cancelled = false;
    (async () => {
      const sb = createSupabaseBrowserClient();
      const { data, error: err } = await sb
        .from("resorts")
        .select("slug, name, state")
        .eq("active", true)
        .order("name");
      if (cancelled) return;
      if (err || !data) {
        setError("Could not load resorts. Try again.");
        return;
      }
      setOptions(data as SlimResort[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, options]);

  const filtered = useMemo(() => {
    if (!options) return [];
    const q = query.trim().toLowerCase();
    const pool = q
      ? options.filter(
          (r) =>
            r.name.toLowerCase().includes(q) || r.state.toLowerCase() === q,
        )
      : options;
    return pool.slice(0, 30);
  }, [options, query]);

  async function pick(slug: string) {
    if (busy) return;
    setBusy(true);
    setError(null);
    const sb = createSupabaseBrowserClient();
    // Read-merge-write (same class of bug as day_plans): the server-
    // rendered expandedSlugs prop goes stale the moment ANOTHER day is
    // swapped — writing from the prop would silently revert that swap.
    // Re-fetch the trip fresh, expand, then swap this day. select("*")
    // also brings day_plans along IF that column exists yet.
    const { data: fresh, error: readErr } = await sb
      .from("trips")
      .select("*")
      .eq("id", tripId)
      .maybeSingle<{
        resort_slugs: string[];
        days_per_resort: number[] | null;
        day_plans?: unknown;
      }>();
    if (readErr || !fresh) {
      setBusy(false);
      setError("Could not change the resort. Try again.");
      return;
    }
    const freshExpanded = expandSlugs(fresh.resort_slugs, fresh.days_per_resort);
    if (day < 1 || day > freshExpanded.length) {
      // Trip shape changed under us (another tab shortened it).
      setBusy(false);
      setError("This trip changed. Reload the page and try again.");
      return;
    }
    const nextSlugs = [...freshExpanded];
    const oldSlug = nextSlugs[day - 1];
    nextSlugs[day - 1] = slug;

    // Attached places belong to the OLD mountain's town — keep the note
    // but drop the places for this day so the plan doesn't silently mix
    // two towns. Only touch day_plans when the column already exists.
    const payload: Record<string, unknown> = {
      resort_slugs: nextSlugs,
      days_per_resort: nextSlugs.map(() => 1),
    };
    if (oldSlug !== slug && "day_plans" in fresh && fresh.day_plans !== undefined) {
      const plans = parseDayPlans(fresh.day_plans);
      const cur = plans[String(day)];
      if (cur?.places?.length) {
        payload.day_plans = withDayPlan(plans, day, { note: cur.note, places: [] });
      }
    }

    // .select("id") turns the RLS 0-row case (e.g. session expired in
    // another tab) into a visible error instead of a silent fake success.
    const { data: updated, error: err } = await sb
      .from("trips")
      .update(payload)
      .eq("id", tripId)
      .select("id");
    setBusy(false);
    if (err || !updated || updated.length === 0) {
      setError("Could not change the resort. Try again.");
      return;
    }
    setOpen(false);
    setQuery("");
    router.refresh();
  }

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? popoverId : undefined}
        className="inline-flex min-h-11 touch-manipulation items-center gap-1 rounded-wn-sm px-2 text-xs font-bold text-wn-muted transition hover:bg-wn-navy/5 hover:text-wn-navy"
      >
        <span aria-hidden="true">⇄</span>
        <span>Change</span>
        <span className="sr-only"> the resort for day {day}, currently {currentName}</span>
      </button>

      {open && (
        <div
          id={popoverId}
          ref={popoverRef}
          role="dialog"
          aria-label={`Change the resort for day ${day}`}
          className="absolute right-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] rounded-wn-md border border-wn-line bg-white p-2 font-normal normal-case tracking-normal shadow-wn-md"
        >
          <Input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search resorts"
            aria-label={`Search a new resort for day ${day}`}
            aria-controls={listId}
            aria-describedby={error ? errorId : undefined}
            invalid={Boolean(error)}
            className="mb-1.5"
          />
          {error && (
            <p id={errorId} role="alert" className="mb-1 px-1 text-xs text-wn-danger">
              {error}
            </p>
          )}
          <ul id={listId} className="max-h-60 overflow-y-auto" aria-busy={busy || (open && options === null)}>
            {options === null && !error && (
              <li className="px-2 py-2 text-xs text-wn-muted" role="status">Loading…</li>
            )}
            {filtered.map((r) => (
              <li key={r.slug}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => pick(r.slug)}
                  className="flex min-h-11 w-full touch-manipulation items-baseline justify-between gap-2 rounded-wn-sm px-2 py-1.5 text-left transition hover:bg-wn-navy/5 disabled:opacity-50"
                >
                  <span className="truncate text-sm font-semibold text-wn-charcoal">{r.name}</span>
                  <span className="shrink-0 text-xs text-wn-muted">{r.state}</span>
                </button>
              </li>
            ))}
            {options !== null && filtered.length === 0 && (
              <li className="px-2 py-2 text-xs text-wn-muted" role="status">No match.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
