"use client";

// Sticky bottom action bar for /trip/[id]: Mark day done, Undo, Share.
// The page's timeline is long and the old controls sat at the very end,
// so on a phone the one action a rider needs on the drive home was a
// full page-scroll away (audit trip-planner-8 / mobile-ergonomics-26).
//
// Layout: position fixed above the phone tab bar (the --wn-tab-bar-h
// custom property AppTabBar publishes), flush to the bottom with the
// home-indicator inset on routes or screens without the bar. The
// mutations reuse lib/tripProgress so this bar and TripActions never
// disagree on what "done" means.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { completeCurrentDay, undoLastCompletedDay, type TripProgress } from "@/lib/tripProgress";
import TripShareButton from "./TripShareButton";

type Props = {
  tripId: string;
  tripName: string;
  isActive: boolean;
  tripFinished: boolean;
  currentDay: number;
  lastCompletedDay: number | null;
  totalDays: number;
};

export default function TripStickyBar({
  tripId,
  tripName,
  isActive,
  tripFinished,
  currentDay,
  lastCompletedDay,
  totalDays,
}: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | "done" | "undo">(null);
  const [error, setError] = useState<string | null>(null);

  const displayDay = isActive ? currentDay : 1;

  // Read-then-write so a tap on a page left open all day still applies
  // to the trip's real state, not the render's.
  async function readProgress(): Promise<TripProgress | null> {
    const { data, error: readErr } = await supabase
      .from("trips")
      .select("started_at, completed_days, current_day")
      .eq("id", tripId)
      .single<TripProgress>();
    if (readErr || !data) {
      setError(readErr?.message ?? "Could not load the trip.");
      return null;
    }
    return data;
  }

  async function write(update: Record<string, unknown>) {
    const { data, error: writeErr } = await supabase.from("trips").update(update).eq("id", tripId).select("id");
    if (writeErr || !data || data.length === 0) {
      setError(writeErr?.message ?? "Could not save. Sign in again and retry.");
      return false;
    }
    return true;
  }

  async function markDone() {
    if (busy) return;
    setBusy("done");
    setError(null);
    const prior = await readProgress();
    if (prior && (await write(completeCurrentDay(prior, totalDays, new Date().toISOString())))) {
      startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  async function undo() {
    if (busy) return;
    setBusy("undo");
    setError(null);
    const prior = await readProgress();
    if (prior) {
      const update = undoLastCompletedDay(prior);
      // Nothing left to undo (another tab got there first): just resync.
      if (!update || (await write(update))) startTransition(() => router.refresh());
    }
    setBusy(null);
  }

  return (
    <>
      {/* Above the phone tab bar when it is showing; the inset padding
          only applies when the bar is not there to cover it. */}
      <style>{`
        .wn-trip-bar { bottom: var(--wn-tab-bar-h, 0px); padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem); }
        @media (max-width: 767px) { html[data-tab-bar="1"] .wn-trip-bar { padding-bottom: 0.5rem; } }
      `}</style>
      <div
        className="wn-trip-bar fixed inset-x-0 z-40 border-t border-wn-charcoal/10 bg-white/95 px-4 pt-2 shadow-[0_-4px_16px_rgba(30,41,82,0.08)] backdrop-blur-sm"
        role="region"
        aria-label="Trip actions"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          {tripFinished ? (
            <span className="min-h-11 flex-1 content-center text-sm font-semibold text-wn-navy">
              Trip complete. All {totalDays} days done.
            </span>
          ) : (
            <button
              type="button"
              onClick={markDone}
              disabled={busy != null}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1 rounded-lg bg-wn-navy px-3 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60 motion-reduce:transition-none"
            >
              {busy === "done" ? "Saving…" : `Mark day ${displayDay} done`}
            </button>
          )}
          {lastCompletedDay != null && (
            <button
              type="button"
              onClick={undo}
              disabled={busy != null}
              title={`Unmark day ${lastCompletedDay}`}
              className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-wn-charcoal/20 bg-white px-3 text-sm font-semibold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy disabled:opacity-60 motion-reduce:transition-none"
            >
              <span aria-hidden="true">↩</span>
              {busy === "undo" ? "Undoing…" : "Undo"}
            </button>
          )}
          <TripShareButton tripId={tripId} tripName={tripName} />
        </div>
        {error && (
          <p role="alert" className="mx-auto mt-1 max-w-3xl text-[11px] text-red-700">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
