"use client";

// Stage-4 calendar export button. Renders a small "Add to calendar"
// button next to the existing share button on /trip/[id]. When clicked,
// builds the .ics from the server-passed trip data (no extra fetch) and
// triggers a download via Blob URL.

import { useState } from "react";
import { buildTripIcs, tripIcsFilename, type TripIcsDay } from "@/lib/icsExport";

type Props = {
  tripName: string;
  originLabel: string;
  /** First ski day. Falls back to today on the server if the trip has
      no explicit start date stored — passed in pre-resolved. */
  startDateIso: string;
  days: TripIcsDay[];
};

export default function TripCalendarExport({
  tripName,
  originLabel,
  startDateIso,
  days,
}: Props) {
  const [downloaded, setDownloaded] = useState(false);

  function handleDownload() {
    // Parse the ISO date into the user's local TZ so day-1 lands on
    // the right calendar date.
    const start = new Date(startDateIso);
    const ics = buildTripIcs({
      tripName,
      originLabel,
      startDate: start,
      days,
    });
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = tripIcsFilename(tripName);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revoke the object URL after the click so we don't leak — but
    // give the browser a tick to start the download first.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      className="rounded-lg border border-wn-charcoal/20 bg-white px-3 py-1.5 text-xs font-semibold text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy"
      aria-label="Add this trip to your calendar"
    >
      {downloaded ? "✓ Downloaded" : "📅 Add to calendar"}
    </button>
  );
}
