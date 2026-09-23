"use client";

// Client island for the trip-page action buttons. Server component
// passes in the trip's current state; this owns the optimistic updates
// and Supabase mutations. Refreshes via router.refresh() after each
// mutation so server-rendered day cards re-color correctly.

import { useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ConfirmButton from "@/components/ConfirmButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Notice from "@/components/ui/Notice";
import Icon from "@/components/icons/Icon";

type Props = {
  tripId: string;
  isActive: boolean;
  tripFinished: boolean;
  currentDay: number;
  /** Highest day already marked complete, for the per-day undo. */
  lastCompletedDay: number | null;
  totalDays: number;
  googleMapsUrl: string | null;
  /** Planned first ski day (YYYY-MM-DD) or null when unset. */
  startDate: string | null;
  /** False until the trips.start_date column exists — hides the editor. */
  startDateEnabled: boolean;
};

// PostgREST / Postgres codes for "that column does not exist" — the
// trips.start_date column may not have been added yet.
function isMissingColumnError(err: { code?: string; message?: string } | null): boolean {
  if (!err) return false;
  if (err.code === "42703" || err.code === "PGRST204") return true;
  return /start_date/.test(err.message ?? "") && /column|schema cache/i.test(err.message ?? "");
}

let warnedMissingStartDate = false;

function todayIsoDate(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// A bare YYYY-MM-DD parsed part-by-part, so it stays on that calendar
// day in every time zone (new Date(string) would read UTC midnight).
function parseIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const noopSubscribe = () => () => {};

/**
 * "Starts Sat, Feb 14, 2027 · in 12 days" for the trip page hero.
 * Lives in this client module because "in N days" depends on the
 * viewer's clock: computed on the server (UTC on Vercel) it could be a
 * day off around midnight US time. The server render and the first
 * client render show only the date; the relative part appears once the
 * client knows its own today (useSyncExternalStore keeps the two in
 * agreement, so there is no hydration mismatch).
 */
export function StartDateBadge({ isoDate }: { isoDate: string }) {
  const today = useSyncExternalStore(noopSubscribe, todayIsoDate, () => null);
  const start = parseIsoDate(isoDate);
  const pretty = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: today && start.getFullYear() === parseIsoDate(today).getFullYear() ? undefined : "numeric",
  });
  if (!today) return <span>Starts {pretty}</span>;
  const diffDays = Math.round((start.getTime() - parseIsoDate(today).getTime()) / 86_400_000);
  const relative =
    diffDays === 0
      ? "today"
      : diffDays === 1
        ? "tomorrow"
        : diffDays > 1
          ? `in ${diffDays} days`
          : diffDays === -1
            ? "yesterday"
            : `${-diffDays} days ago`;
  return (
    <span>
      Starts {pretty} · {relative}
    </span>
  );
}

export default function TripActions({
  tripId,
  isActive,
  tripFinished,
  currentDay,
  lastCompletedDay,
  totalDays,
  googleMapsUrl,
  startDate,
  startDateEnabled,
}: Props) {
  const router = useRouter();
  // SSR-aware browser client. Reads its session from cookies set by the
  // /auth/callback exchange + refreshed by proxy.ts. Using the bare
  // createClient() singleton in @/lib/supabase here would read from
  // localStorage and silently appear signed-out right after a magic-link
  // login — that's the bug Stage 16 fixes.
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [, startTransition] = useTransition();
  const [busy, setBusy] = useState<null | "advance" | "undo" | "restart" | "delete" | "date">(null);
  const [error, setError] = useState<string | null>(null);
  // Start-date editor. `dateDraft` mirrors the input; `dateSupported`
  // flips off if the DB reports the column is missing.
  const [dateDraft, setDateDraft] = useState(startDate ?? "");
  const [dateSupported, setDateSupported] = useState(startDateEnabled);
  const [dateSaved, setDateSaved] = useState(false);

  // Display day = the day they're about to complete. Before any progress
  // exists this is Day 1; once a day is marked complete current_day
  // becomes the next day, which is also what we show next.
  const displayDay = isActive ? currentDay : 1;

  async function markTodayComplete() {
    setBusy("advance");
    setError(null);
    const { data: prior, error: readErr } = await supabase
      .from("trips")
      .select("started_at, completed_days, current_day")
      .eq("id", tripId)
      .single<{ started_at: string | null; completed_days: number[]; current_day: number | null }>();
    if (readErr || !prior) {
      setBusy(null);
      setError(readErr?.message ?? "Couldn't load trip.");
      return;
    }
    const today = prior.current_day ?? 1;
    const nextCompleted = Array.from(new Set([...(prior.completed_days ?? []), today]));
    const nextDay = today + 1 > totalDays ? today : today + 1;
    const update: Record<string, unknown> = {
      completed_days: nextCompleted,
      current_day: nextDay,
    };
    // Auto-start: with no separate Start button (Stage 20), the first
    // "Mark Day complete" is what flips the trip into the active state.
    if (!prior.started_at) {
      update.started_at = new Date().toISOString();
    }
    const { error } = await supabase
      .from("trips")
      .update(update)
      .eq("id", tripId);
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  // Per-day undo: unmark the most recent completed day and rewind
  // current_day to it. Mirrors the auto-start semantics of
  // markTodayComplete — if nothing is left completed the trip returns
  // to "not started".
  async function undoLastDay() {
    setBusy("undo");
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
    const completed = prior.completed_days ?? [];
    if (completed.length === 0) {
      // Nothing left to undo (another tab got there first) — just resync.
      setBusy(null);
      startTransition(() => router.refresh());
      return;
    }
    const last = Math.max(...completed);
    const nextCompleted = completed.filter((d) => d !== last);
    const update: Record<string, unknown> = {
      completed_days: nextCompleted,
      current_day: nextCompleted.length === 0 ? null : Math.min(prior.current_day ?? last, last),
    };
    if (nextCompleted.length === 0) update.started_at = null;
    const { error } = await supabase.from("trips").update(update).eq("id", tripId);
    setBusy(null);
    if (error) {
      setError(error.message);
      return;
    }
    startTransition(() => router.refresh());
  }

  async function saveStartDate(next: string | null) {
    setBusy("date");
    setError(null);
    setDateSaved(false);
    // .select("id") turns the RLS 0-row case (session expired in
    // another tab) into a visible error instead of a silent success.
    const { data, error } = await supabase
      .from("trips")
      .update({ start_date: next })
      .eq("id", tripId)
      .select("id");
    setBusy(null);
    if (error && isMissingColumnError(error)) {
      if (!warnedMissingStartDate) {
        warnedMissingStartDate = true;
        console.warn("[trip] trips.start_date is missing; hiding the date editor.");
      }
      setDateSupported(false);
      setError("Trip dates aren't available yet.");
      return;
    }
    if (error || !data || data.length === 0) {
      setError(error?.message ?? "Couldn't save the date. Try again.");
      return;
    }
    setDateDraft(next ?? "");
    setDateSaved(true);
    window.setTimeout(() => setDateSaved(false), 2500);
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
    // No window.confirm — blocked in Capacitor WebView. ConfirmButton
    // wraps this with a two-tap UX so the safety check is in the UI layer.
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

  const dateDirty = dateDraft !== (startDate ?? "");

  return (
    <Card>
      {error && (
        <Notice tone="danger" className="mb-3">
          {error}
        </Notice>
      )}

      {dateSupported && (
        <div className="mb-4 border-b border-wn-line pb-4">
          <label
            htmlFor="trip-start-date"
            className="mb-1 block text-eyebrow font-bold uppercase text-wn-muted"
          >
            Trip start date <span className="font-normal normal-case tracking-normal">(day 1)</span>
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <input
              id="trip-start-date"
              type="date"
              value={dateDraft}
              min={startDate ?? todayIsoDate()}
              onChange={(e) => setDateDraft(e.target.value)}
              disabled={busy != null}
              // 16px keeps iOS Safari from zooming the page on focus.
              style={{ fontSize: "16px" }}
              className="min-h-11 rounded-wn-sm border border-wn-line bg-white px-3 font-medium text-wn-charcoal hover:border-wn-subtle focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/25 disabled:opacity-60"
            />
            {dateDirty && dateDraft && (
              <Button onClick={() => saveStartDate(dateDraft)} disabled={busy != null}>
                {busy === "date" ? "Saving…" : "Save date"}
              </Button>
            )}
            {startDate && (
              <Button variant="secondary" onClick={() => saveStartDate(null)} disabled={busy != null}>
                Clear date
              </Button>
            )}
            {dateSaved && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-wn-success">
                <Icon name="check" className="h-3.5 w-3.5" /> Saved
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-wn-muted">
            {startDate
              ? "Used for the calendar export and the countdown on this page."
              : "Optional. Without it, the calendar export starts from today."}
          </p>
        </div>
      )}

      {!tripFinished && (
        <>
          <p className="mb-3 text-sm text-wn-charcoal">
            {isActive ? (
              <>
                <strong className="text-wn-navy">Today is Day {displayDay} of {totalDays}.</strong>
                {" "}When you&apos;re done skiing, mark the day complete and the next day&apos;s resort moves into focus.
              </>
            ) : (
              <>
                <strong className="text-wn-navy">Ready to ride.</strong>{" "}
                Open Google Maps for turn-by-turn driving, then mark each day complete on your way home.
              </>
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            {googleMapsUrl && (
              <Button
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                iconLeft={<Icon name="map" />}
              >
                Open in Google Maps
              </Button>
            )}
            <Button
              variant="secondary"
              onClick={markTodayComplete}
              disabled={busy != null}
              iconLeft={busy === "advance" ? undefined : <Icon name="check" />}
            >
              {busy === "advance" ? "Saving…" : "Mark Day " + displayDay + " complete"}
            </Button>
            {isActive && lastCompletedDay != null && (
              <Button
                variant="secondary"
                onClick={undoLastDay}
                disabled={busy != null}
                title="Unmark the last completed day"
              >
                {busy === "undo" ? "Undoing…" : `↩ Undo Day ${lastCompletedDay}`}
              </Button>
            )}
            {isActive && (
              <Button variant="secondary" onClick={restart} disabled={busy != null}>
                Restart trip
              </Button>
            )}
            <ConfirmButton
              onConfirm={deleteTrip}
              busy={busy != null}
              busyLabel={busy === "delete" ? "Deleting…" : "…"}
              label="Delete"
              confirmLabel="Tap again to confirm"
              variant="secondary"
              className="ml-auto"
            />
          </div>
        </>
      )}

      {tripFinished && (
        <>
          <p className="mb-3 text-sm text-wn-charcoal">
            🎉 Trip complete! All {totalDays} days marked done.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={restart} disabled={busy != null}>
              {busy === "restart" ? "Resetting…" : "Run it again"}
            </Button>
            {lastCompletedDay != null && (
              <Button
                variant="secondary"
                onClick={undoLastDay}
                disabled={busy != null}
                title="Unmark the last completed day"
              >
                {busy === "undo" ? "Undoing…" : `↩ Undo Day ${lastCompletedDay}`}
              </Button>
            )}
            <ConfirmButton
              onConfirm={deleteTrip}
              busy={busy != null}
              busyLabel={busy === "delete" ? "Deleting…" : "…"}
              label="Delete"
              confirmLabel="Tap again to confirm"
              variant="secondary"
            />
          </div>
        </>
      )}
    </Card>
  );
}
