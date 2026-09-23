// Time-zone helpers. Resorts span six US time zones and every source
// reports in a different frame (NWS = UTC ISO-8601 with durations,
// Open-Meteo = resort-local wall clock, AWDB = station-local dates),
// so all "which calendar day is this" decisions go through here.

const MS_PER_DAY = 86_400_000;

/** 'YYYY-MM-DD' for an instant in an IANA zone. Falls back to UTC when
 *  the zone string is unknown to the runtime (never throws). */
export function localDate(instant: Date, timeZone: string | null | undefined): string {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).formatToParts(instant);
      const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
      const s = `${get("year")}-${get("month")}-${get("day")}`;
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    } catch {
      /* unknown zone → UTC below */
    }
  }
  return instant.toISOString().slice(0, 10);
}

/** Local hour (0-23) for an instant in an IANA zone; UTC on failure. */
export function localHour(instant: Date, timeZone: string | null | undefined): number {
  if (timeZone) {
    try {
      const h = new Intl.DateTimeFormat("en-US", {
        timeZone,
        hour: "numeric",
        hour12: false,
      }).format(instant);
      const n = Number(h);
      if (Number.isFinite(n)) return n % 24;
    } catch {
      /* fall through */
    }
  }
  return instant.getUTCHours();
}

/** Shift a 'YYYY-MM-DD' string by whole days (UTC arithmetic, no DST). */
export function shiftDate(ymd: string, days: number): string {
  const t = Date.parse(`${ymd}T00:00:00Z`);
  return new Date(t + days * MS_PER_DAY).toISOString().slice(0, 10);
}

/** Short weekday label ("Tue") for a calendar date, zone-independent. */
export function weekdayShort(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
}

/**
 * Parse an NWS validTime "2026-09-22T12:00:00+00:00/PT6H" into a
 * [start, end] pair of epoch ms. Supports the ISO-8601 duration
 * subset NWS emits (P#DT#H#M). Returns null on anything malformed.
 */
export function parseValidTime(validTime: string): { start: number; end: number } | null {
  const slash = validTime.indexOf("/");
  if (slash < 0) return null;
  const start = Date.parse(validTime.slice(0, slash));
  if (!Number.isFinite(start)) return null;
  const dur = validTime.slice(slash + 1);
  const m = /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/.exec(dur);
  if (!m) return null;
  const days = Number(m[1] ?? 0);
  const hours = Number(m[2] ?? 0);
  const mins = Number(m[3] ?? 0);
  const ms = ((days * 24 + hours) * 60 + mins) * 60_000;
  if (ms <= 0) return null;
  return { start, end: start + ms };
}

/** Hours between two instants, one decimal. */
export function hoursBetween(a: Date | string | number, b: Date | string | number): number {
  const ta = typeof a === "number" ? a : new Date(a).getTime();
  const tb = typeof b === "number" ? b : new Date(b).getTime();
  return Math.round(((tb - ta) / 3_600_000) * 10) / 10;
}
