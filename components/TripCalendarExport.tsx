"use client";

// Stage-4 calendar export button. Renders a small "Add to calendar"
// button next to the share button on /trip/[id]. Builds the .ics from
// the server-passed trip data (no extra fetch) and hands it to the
// device in whichever way actually works there:
//
//   * iPhone / iPad — the installed PWA and Safari have no download
//     manager, so an `a[download]` blob click does nothing (or opens a
//     blank tab) while the old button still said "Downloaded". We use
//     the share sheet with the .ics as a file (iOS 15+ offers
//     "Add to Calendar"), and fall back to opening the file in a new
//     tab where Safari shows Calendar's "Add all" preview.
//   * Everything else — plain blob download.
//
// The success state is only shown after the chosen path actually
// resolved, never assumed.

import { useState } from "react";
import {
  buildTripIcs,
  parseStartDate,
  tripIcsFilename,
  type TripIcsDay,
} from "@/lib/icsExport";

type Props = {
  tripName: string;
  originLabel: string;
  /** First ski day: trips.start_date when set, else the day the trip
      was started. Null means "no date known" — day 1 is then pinned to
      today on the user's own clock at click time (not the server's,
      which runs on UTC and can be a day off around midnight US time). */
  startDateIso: string | null;
  days: TripIcsDay[];
};

type Outcome = "idle" | "downloaded" | "shared" | "opened" | "failed";

// iPadOS 13+ reports itself as a Mac; the touch-point check catches it.
function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1;
}

// True inside an installed iOS PWA. window.open there hands the URL to
// Safari (or an in-app sheet) and returns null even though it opened,
// so a null return must not be read as a pop-up block.
function isStandalone(): boolean {
  if (typeof navigator === "undefined") return false;
  return (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function TripCalendarExport({
  tripName,
  originLabel,
  startDateIso,
  days,
}: Props) {
  const anchoredToToday = startDateIso === null;
  const [outcome, setOutcome] = useState<Outcome>("idle");

  function flash(next: Outcome) {
    setOutcome(next);
    window.setTimeout(() => setOutcome("idle"), next === "failed" ? 4000 : 2500);
  }

  function handleExport() {
    const ics = buildTripIcs({
      tripName,
      originLabel,
      startDate: startDateIso === null ? new Date() : parseStartDate(startDateIso),
      days,
    });
    const filename = tripIcsFilename(tripName);
    const type = "text/calendar;charset=utf-8";

    if (isAppleMobile()) {
      // Share sheet first — must be called synchronously inside the tap
      // so the user activation is still valid.
      if (typeof File !== "undefined" && typeof navigator.share === "function" && navigator.canShare) {
        const file = new File([ics], filename, { type });
        if (navigator.canShare({ files: [file] })) {
          navigator
            .share({ files: [file], title: tripName })
            .then(() => flash("shared"))
            .catch((err: unknown) => {
              // The user closed the sheet — not a failure worth reporting.
              if (err instanceof Error && err.name === "AbortError") return;
              openInNewTab(ics, type);
            });
          return;
        }
      }
      openInNewTab(ics, type);
      return;
    }

    const blob = new Blob([ics], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke the object URL after the click so we don't leak — but
    // give the browser a tick to start the download first.
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    flash("downloaded");
  }

  // Safari (and the standalone PWA, which hands the URL to Safari)
  // renders a .ics blob as a Calendar preview with an "Add all" button.
  //
  // No "noopener" feature here: the spec makes window.open return null
  // whenever it is set, which made every open look blocked. A
  // same-origin blob: URL has no opener to abuse; the opener is severed
  // by hand on the handle we get back.
  function openInNewTab(ics: string, type: string) {
    const blob = new Blob([ics], { type });
    const url = URL.createObjectURL(blob);
    let win: Window | null = null;
    let threw = false;
    try {
      win = window.open(url, "_blank");
    } catch {
      threw = true;
    }
    if (win) win.opener = null;
    // Long enough for the new tab to fetch the blob before it is
    // revoked — kept regardless of the return value, since a null
    // handle can still mean "opened" (standalone PWA).
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    if (threw || (win === null && !isStandalone())) {
      flash("failed");
      return;
    }
    flash("opened");
  }

  const label =
    outcome === "downloaded"
      ? "✓ Downloaded"
      : outcome === "shared"
        ? "✓ Shared — open it in Calendar"
        : outcome === "opened"
          ? "✓ Opened — tap Add all"
          : outcome === "failed"
            ? "Couldn't open — allow pop-ups"
            : "📅 Add to calendar";

  return (
    <div className="flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleExport}
        className="rounded-lg border border-wn-charcoal/20 bg-white px-3 py-1.5 text-xs font-semibold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy"
        aria-label="Add this trip to your calendar"
        title={
          anchoredToToday
            ? "No trip date set yet, so the events start today. Set a start date under Trip controls to fix that."
            : "Download an .ics file with one all-day event per ski day"
        }
      >
        {label}
      </button>
      {anchoredToToday && (
        <span className="text-[10px] text-white/70">Dates start today — no trip date set</span>
      )}
    </div>
  );
}
