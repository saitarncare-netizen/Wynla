"use client";

// Client island for the trip-page action buttons. Server component
// passes in the trip's current state; this owns the optimistic updates
// and Supabase mutations. Refreshes via router.refresh() after each
// mutation so server-rendered day cards re-color correctly.

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Props = {
  tripId: string;
  isActive: boolean;
  tripFinished: boolean;
  currentDay: number;
  totalDays: number;
};

export default function TripActions({
  tripId,
  isActive,
  tripFinished,
  currentDay,
  totalDays,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | "start" | "advance" | "restart" | "delete">(null);
  const [error, setError] = useState<string | null>(null);

  async function startTrip() {
    setBusy("start");
    setError(null);
    const { error } = await supabase
      .from("trips")
      .update({
        started_at: new Date().toISOString(),
        current_day: 1,
        completed_days: [],
      })
      .eq("id", tripId);
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function markTodayComplete() {
    setBusy("advance");
    setError(null);
    const { data: prior, error: readErr } = await supabase
      .from("trips")
      .select("completed_days, current_day")
      .eq("id", tripId)
      .single<{ completed_days: number[]; current_day: number | null }>();
    if (readErr || !prior) {
      setBusy(null);
      setError(readErr?.message ?? "Couldn't load trip.");
      return;
    }
    const today = prior.current_day ?? 1;
    const nextCompleted = Array.from(new Set([...(prior.completed_days ?? []), today]));
    const nextDay = today + 1 > totalDays ? today : today + 1;
    const { error } = await supabase
      .from("trips")
      .update({
        completed_days: nextCompleted,
        current_day: nextDay,
      })
      .eq("id", tripId);
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function restart() {
    setBusy("restart");
    setError(null);
    const { error } = await supabase
      .from("trips")
      .update({ started_at: null, current_day: null, completed_days: [] })
      .eq("id", tripId);
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function deleteTrip() {
    if (!window.confirm("Delete this trip? This can't be undone.")) return;
    setBusy("delete");
    setError(null);
    const { error } = await supabase.from("trips").delete().eq("id", tripId);
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    router.push("/trips");
  }

  return (
    <div className="rounded-xl border border-wn-charcoal/10 bg-white p-4">
      {error && (
        <p className="mb-3 rounded-md border border-red-200 bg-red-50 p-2 text-[11px] text-red-800">
          {error}
        </p>
      )}

      {!isActive && (
        <>
          <p className="mb-3 text-sm text-wn-charcoal/80">
            Ready when you are. Hitting Start records today as Day 1 and the trip-day counter advances each time you mark a day complete.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startTrip}
              disabled={busy != null}
              className="rounded-lg bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
            >
              {busy === "start" ? "Starting…" : "🚀 Start trip"}
            </button>
            <button
              type="button"
              onClick={deleteTrip}
              disabled={busy != null}
              className="rounded-lg border border-wn-charcoal/20 bg-white px-4 py-2 text-sm font-semibold text-wn-charcoal transition hover:border-red-400 hover:text-red-700 disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </>
      )}

      {isActive && !tripFinished && (
        <>
          <p className="mb-3 text-sm text-wn-charcoal/80">
            <strong className="text-wn-navy">Today is Day {currentDay} of {totalDays}.</strong>
            {" "}When you&apos;re done skiing, mark the day complete and the next day&apos;s resort moves into focus.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={markTodayComplete}
              disabled={busy != null}
              className="rounded-lg bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
            >
              {busy === "advance" ? "Saving…" : "✓ Mark Day " + currentDay + " complete"}
            </button>
            <button
              type="button"
              onClick={restart}
              disabled={busy != null}
              className="rounded-lg border border-wn-charcoal/20 bg-white px-4 py-2 text-sm font-semibold text-wn-charcoal transition hover:border-wn-charcoal/40 disabled:opacity-60"
            >
              Restart trip
            </button>
            <button
              type="button"
              onClick={deleteTrip}
              disabled={busy != null}
              className="ml-auto rounded-lg border border-wn-charcoal/20 bg-white px-4 py-2 text-sm font-semibold text-wn-charcoal transition hover:border-red-400 hover:text-red-700 disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </>
      )}

      {tripFinished && (
        <>
          <p className="mb-3 text-sm text-wn-charcoal/80">
            🎉 Trip complete! All {totalDays} days marked done.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={restart}
              disabled={busy != null}
              className="rounded-lg bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
            >
              {busy === "restart" ? "Resetting…" : "Run it again"}
            </button>
            <button
              type="button"
              onClick={deleteTrip}
              disabled={busy != null}
              className="rounded-lg border border-wn-charcoal/20 bg-white px-4 py-2 text-sm font-semibold text-wn-charcoal transition hover:border-red-400 hover:text-red-700 disabled:opacity-60"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
