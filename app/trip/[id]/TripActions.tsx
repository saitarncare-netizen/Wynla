"use client";

// "Trip controls" at the bottom of /trip/[id]: the planned start date,
// the whole-route overview link, Undo / Restart and Delete. Day-to-day
// trip mode (Start, Navigate, Finish day) lives in the Today card at the
// top and the sticky bar, so this panel no longer repeats "Mark day
// complete"; its progress buttons go through the same useTripProgress
// hook as those two, so a write that hits zero rows (RLS, expired
// session) is reported here too instead of looking like success.

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import ConfirmButton from "@/components/ConfirmButton";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Notice from "@/components/ui/Notice";
import Icon from "@/components/icons/Icon";
import { todayIsoDate, useTripProgress } from "./TodayCard";

// The badge moved next to the Today card (both use it); re-exported so
// existing imports keep working.
export { StartDateBadge } from "./TodayCard";

type Props = {
  tripId: string;
  /** Started and not yet finished. */
  isActive: boolean;
  tripFinished: boolean;
  /** Highest day already marked complete, for the per-day undo. */
  lastCompletedDay: number | null;
  totalDays: number;
  googleMapsUrl: string | null;
  /** The Today card at the top of the page is showing a drive to today's
   *  mountain right now (trip under way, resort known). Only then may the
   *  route blurb link there for "each day's drive". */
  todayCardShowsDrive: boolean;
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

export default function TripActions({
  tripId,
  isActive,
  tripFinished,
  lastCompletedDay,
  totalDays,
  googleMapsUrl,
  todayCardShowsDrive,
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
  const progress = useTripProgress(tripId, totalDays);
  const [busy, setBusy] = useState<null | "delete" | "date">(null);
  const [error, setError] = useState<string | null>(null);
  // Start-date editor. `dateDraft` mirrors the input; `dateSupported`
  // flips off if the DB reports the column is missing.
  const [dateDraft, setDateDraft] = useState(startDate ?? "");
  const [dateSupported, setDateSupported] = useState(startDateEnabled);
  const [dateSaved, setDateSaved] = useState(false);

  const anyBusy = busy != null || progress.busy;
  const shownError = error ?? progress.error;

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
      setError("Couldn't save the date. Try again.");
      return;
    }
    setDateDraft(next ?? "");
    setDateSaved(true);
    window.setTimeout(() => setDateSaved(false), 2500);
    startTransition(() => router.refresh());
  }

  async function deleteTrip() {
    // No window.confirm — blocked in Capacitor WebView. ConfirmButton
    // wraps this with a two-tap UX so the safety check is in the UI layer.
    setBusy("delete");
    setError(null);
    // .select("id"): a 0-row delete (not the owner any more) must not
    // navigate away as if the trip were gone.
    const { data, error } = await supabase.from("trips").delete().eq("id", tripId).select("id");
    setBusy(null);
    if (error || !data || data.length === 0) {
      setError("Couldn't delete the trip. Sign in again and retry.");
      return;
    }
    router.push("/trips");
  }

  const dateDirty = dateDraft !== (startDate ?? "");

  return (
    <Card>
      {shownError && (
        <Notice tone="danger" className="mb-3">
          {shownError}
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
              disabled={anyBusy}
              // 16px keeps iOS Safari from zooming the page on focus.
              style={{ fontSize: "16px" }}
              className="min-h-11 rounded-wn-sm border border-wn-line bg-white px-3 font-medium text-wn-charcoal hover:border-wn-subtle focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/25 disabled:opacity-60"
            />
            {dateDirty && dateDraft && (
              <Button onClick={() => saveStartDate(dateDraft)} disabled={anyBusy}>
                {busy === "date" ? "Saving…" : "Save date"}
              </Button>
            )}
            {startDate && (
              <Button variant="secondary" onClick={() => saveStartDate(null)} disabled={anyBusy}>
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

      {googleMapsUrl && (
        <p className="mb-3 text-sm text-wn-charcoal">
          {/* "the Today card at the top of this page", not a bare "Today":
              the phone tab bar's Today tab is a different screen. Linked
              only while that card is showing today's drive: before the
              start it offers day 1 only, and a finished trip has none. */}
          Every stop in order, as one route.
          {todayCardShowsDrive ? (
            <>
              {" "}For each day&apos;s drive, use the{" "}
              <a href="#today" className="font-semibold text-wn-navy underline underline-offset-2">
                Today card at the top of this page
              </a>
              .
            </>
          ) : (
            !isActive &&
            !tripFinished &&
            " Once the trip starts, the Today card at the top of this page has each day's drive."
          )}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {googleMapsUrl && (
          <Button
            variant="secondary"
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            iconLeft={<Icon name="map" />}
          >
            Whole route in Google Maps
          </Button>
        )}
        {(isActive || tripFinished) && lastCompletedDay != null && (
          <Button
            variant="secondary"
            // The day this button names: a stale page undoes it or nothing.
            onClick={() => progress.run("undo", lastCompletedDay)}
            disabled={anyBusy}
            loading={progress.running === "undo"}
            title="Unmark the last completed day"
            iconLeft={<Icon name="arrow-left" />}
          >
            Undo day {lastCompletedDay}
          </Button>
        )}
        {(isActive || tripFinished) && (
          <Button
            variant="secondary"
            onClick={() => progress.run("restart")}
            disabled={anyBusy}
            loading={progress.running === "restart"}
          >
            Restart trip
          </Button>
        )}
        <ConfirmButton
          onConfirm={deleteTrip}
          busy={anyBusy}
          busyLabel={busy === "delete" ? "Deleting…" : "…"}
          label="Delete"
          confirmLabel="Tap again to confirm"
          variant="secondary"
          className="ml-auto"
        />
      </div>
    </Card>
  );
}
