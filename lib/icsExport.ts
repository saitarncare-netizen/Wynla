// Build a valid VCALENDAR (.ics) for a saved trip. One all-day VEVENT
// per ski day. Compatible with Google Calendar, Apple Calendar, and
// Outlook. RFC 5545 conforming — DTSTAMP/UID/SUMMARY/DTSTART/DTEND all
// present; values folded to <75 octets and CRLF-terminated.

export type TripIcsDay = {
  day: number;
  resortName: string;
  resortState: string;
  /** Optional geo for the VEVENT. Skipped when null. */
  lat?: number | null;
  lng?: number | null;
};

export type TripIcsInput = {
  tripName: string;
  /** First ski day of the trip (local date — time is ignored). */
  startDate: Date;
  days: TripIcsDay[];
  originLabel: string;
};

const PROD_ID = "-//Wynla//Trip Planner//EN";

/**
 * Format a JS Date as a YYYYMMDD value (date-only VEVENT). All-day
 * events use VALUE=DATE per RFC 5545 §3.8.2.4.
 */
function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/**
 * Format a JS Date as a UTC timestamp YYYYMMDDTHHMMSSZ. Used for
 * DTSTAMP, which RFC 5545 requires to be UTC.
 */
function formatUtcStamp(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

/**
 * Escape ICS TEXT field per RFC 5545 §3.3.11. Backslash, semicolon,
 * comma, and newline must be escaped.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Line-fold a content line to <=75 octets per RFC 5545 §3.1. Long
 * lines get split with CRLF + single space as continuation marker.
 */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    if (i === 0) {
      out.push(line.slice(0, 75));
      i = 75;
    } else {
      out.push(" " + line.slice(i, i + 74));
      i += 74;
    }
  }
  return out.join("\r\n");
}

/**
 * Add `n` days to a date and return the result (immutable — original
 * `base` is not modified).
 */
function addDays(base: Date, n: number): Date {
  const out = new Date(base.getTime());
  out.setDate(out.getDate() + n);
  return out;
}

/**
 * Build the .ics file content. Returns a string ready to be served as
 * "text/calendar" or wrapped in a Blob for client-side download.
 */
export function buildTripIcs(input: TripIcsInput): string {
  const { tripName, startDate, days, originLabel } = input;
  const now = new Date();
  // Strip time component from startDate so every event is firmly
  // anchored to the user-visible calendar date (not 11pm of the day
  // before in their local TZ).
  const start = new Date(
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(),
  );

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${PROD_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeText(tripName)}`,
  ];

  for (const d of days) {
    const dayStart = addDays(start, d.day - 1);
    // All-day VEVENT — DTEND is the day AFTER (exclusive per RFC).
    const dayEnd = addDays(dayStart, 1);
    const summary = `${d.resortName}${d.resortState ? `, ${d.resortState}` : ""} - Day ${d.day}`;
    const description = `Ski day ${d.day} of trip "${tripName}". Origin: ${originLabel}.`;
    const uid = `wynla-trip-day${d.day}-${formatDate(dayStart)}-${d.resortName.replace(/\s+/g, "-").toLowerCase()}@wynla.app`;
    const eventLines = [
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${formatUtcStamp(now)}`,
      `DTSTART;VALUE=DATE:${formatDate(dayStart)}`,
      `DTEND;VALUE=DATE:${formatDate(dayEnd)}`,
      `SUMMARY:${escapeText(summary)}`,
      `DESCRIPTION:${escapeText(description)}`,
      `LOCATION:${escapeText(`${d.resortName}${d.resortState ? `, ${d.resortState}` : ""}`)}`,
    ];
    if (typeof d.lat === "number" && typeof d.lng === "number" && Number.isFinite(d.lat) && Number.isFinite(d.lng)) {
      eventLines.push(`GEO:${d.lat.toFixed(6)};${d.lng.toFixed(6)}`);
    }
    eventLines.push("TRANSP:OPAQUE");
    eventLines.push("END:VEVENT");
    for (const l of eventLines) lines.push(l);
  }

  lines.push("END:VCALENDAR");
  // Fold every line and join with CRLF per RFC.
  return lines.map(fold).join("\r\n") + "\r\n";
}

/**
 * Generate a safe filename slug from a trip name. Falls back to
 * "wynla-trip" when the name reduces to nothing.
 */
export function tripIcsFilename(tripName: string): string {
  const slug = tripName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${slug || "wynla-trip"}.ics`;
}
