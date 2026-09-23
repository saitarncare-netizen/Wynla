// Sunrise / sunset calculator for resort detail pages — first chair /
// last chair planning. NOAA solar-position algorithm; accurate to ~1
// minute. No external library needed.
//
// Also home to the resort → IANA time-zone resolver, because sunrise /
// sunset was its first consumer and every other "show this in the
// mountain's local time" surface (synced stamps, crowd weekday) reuses
// it.
//
// Usage:
//   const { sunrise, sunset } = computeSunTimes(lat, lng, new Date());
//   // → both are Date objects in UTC; format with formatLocal(d, tz).

export type SunTimes = {
  sunrise: Date;
  sunset: Date;
  /** Daylight hours, rounded to one decimal. */
  daylightHours: number;
};

/**
 * Compute local sunrise + sunset for a point on a given date.
 * Uses NOAA's general solar-position algorithm (Meeus, 1998).
 */
export function computeSunTimes(
  lat: number,
  lng: number,
  date: Date = new Date(),
): SunTimes | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const utcYear = date.getUTCFullYear();
  const utcMonth = date.getUTCMonth() + 1; // 1-12
  const utcDay = date.getUTCDate();

  // Julian day at 0h UTC on the requested date.
  const jd = julianDay(utcYear, utcMonth, utcDay);
  // Julian century relative to J2000.0.
  const t = (jd - 2451545) / 36525;

  const geomMeanLongSun = mod360(280.46646 + t * (36000.76983 + t * 0.0003032));
  const geomMeanAnomSun =
    357.52911 + t * (35999.05029 - 0.0001537 * t);
  const eccentEarthOrbit =
    0.016708634 - t * (0.000042037 + 0.0000001267 * t);
  const sunEqOfCtr =
    Math.sin(rad(geomMeanAnomSun)) *
      (1.914602 - t * (0.004817 + 0.000014 * t)) +
    Math.sin(rad(2 * geomMeanAnomSun)) * (0.019993 - 0.000101 * t) +
    Math.sin(rad(3 * geomMeanAnomSun)) * 0.000289;
  const sunTrueLong = geomMeanLongSun + sunEqOfCtr;
  const sunAppLong =
    sunTrueLong - 0.00569 - 0.00478 * Math.sin(rad(125.04 - 1934.136 * t));

  const meanObliqEcliptic =
    23 +
    (26 +
      (21.448 -
        t * (46.815 + t * (0.00059 - t * 0.001813))) /
        60) /
      60;
  const obliqCorr =
    meanObliqEcliptic + 0.00256 * Math.cos(rad(125.04 - 1934.136 * t));

  const sunDecl = deg(
    Math.asin(Math.sin(rad(obliqCorr)) * Math.sin(rad(sunAppLong))),
  );

  const varY = Math.tan(rad(obliqCorr / 2)) ** 2;
  const eqOfTime =
    4 *
    deg(
      varY * Math.sin(2 * rad(geomMeanLongSun)) -
        2 * eccentEarthOrbit * Math.sin(rad(geomMeanAnomSun)) +
        4 *
          eccentEarthOrbit *
          varY *
          Math.sin(rad(geomMeanAnomSun)) *
          Math.cos(2 * rad(geomMeanLongSun)) -
        0.5 * varY * varY * Math.sin(4 * rad(geomMeanLongSun)) -
        1.25 *
          eccentEarthOrbit *
          eccentEarthOrbit *
          Math.sin(2 * rad(geomMeanAnomSun)),
    );

  const haCos =
    Math.cos(rad(90.833)) / (Math.cos(rad(lat)) * Math.cos(rad(sunDecl))) -
    Math.tan(rad(lat)) * Math.tan(rad(sunDecl));
  if (haCos > 1 || haCos < -1) {
    // Sun never rises or never sets at this latitude/date (polar night/day).
    return null;
  }
  const haSunrise = deg(Math.acos(haCos));

  // Solar noon in minutes UTC.
  const solarNoonUtcMin = 720 - 4 * lng - eqOfTime;
  const sunriseUtcMin = solarNoonUtcMin - haSunrise * 4;
  const sunsetUtcMin = solarNoonUtcMin + haSunrise * 4;

  const sunrise = utcDateFromMinutes(utcYear, utcMonth, utcDay, sunriseUtcMin);
  const sunset = utcDateFromMinutes(utcYear, utcMonth, utcDay, sunsetUtcMin);
  const daylightHours = Math.round(((sunset.getTime() - sunrise.getTime()) / 3_600_000) * 10) / 10;

  return { sunrise, sunset, daylightHours };
}

/**
 * Format a Date's clock time in a target IANA time zone. Example:
 *   formatLocal(sunrise, "America/Denver") → "6:42 AM"
 * Locale is pinned to en-US so the server render and the client
 * hydration agree (the resort page is ISR-rendered on a UTC server).
 */
export function formatLocal(d: Date, timeZone?: string): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

/**
 * Short zone abbreviation for a timestamp ("MST", "EDT", "PST"). Falls
 * back to "UTC" when the zone is unknown so a stamp is never unlabelled.
 */
export function zoneAbbreviation(timeZone: string | undefined, d: Date = new Date()): string {
  if (!timeZone) return "UTC";
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "short" }).formatToParts(d);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "UTC";
}

/**
 * "Tue 5:03 AM MST" — a synced / updated stamp in the resort's own
 * clock with the zone spelled out, so a Vermont visitor reading a
 * Colorado page is never misled by a bare time.
 */
export function formatStampInZone(d: Date, timeZone: string | undefined): string {
  const clock = d.toLocaleString("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timeZone ?? "UTC",
  });
  return `${clock} ${zoneAbbreviation(timeZone, d)}`;
}

// ---------- Resort → time zone ----------

// Slugs whose county sits on the other side of a zone line from the bulk
// of their state (audit domain-logic-22 / resort-panel-detail-54). Kept
// explicit so a reviewer can verify each one against the county map even
// though the geographic rules below would catch most of them.
const RESORT_TIMEZONE_OVERRIDES: Record<string, string> = {
  // Idaho panhandle (north of the Salmon River) is Pacific.
  schweitzer: "America/Los_Angeles",
  "silver-mountain": "America/Los_Angeles",
  "cottonwood-butte": "America/Los_Angeles",
  snowhaven: "America/Los_Angeles",
  "lookout-pass": "America/Los_Angeles",
  // Western Upper Peninsula (Gogebic / Iron / Dickinson / Menominee) is Central.
  "big-powderhorn-mountain": "America/Chicago",
  snowriver: "America/Chicago",
  "indianhead-mountain": "America/Chicago",
  "blackjack-mountain": "America/Chicago",
  "ski-brule": "America/Chicago",
  "pine-mountain": "America/Chicago",
  "norway-mountain": "America/Chicago",
  // Black Hills, SD is Mountain.
  "terry-peak": "America/Denver",
  // East Tennessee is Eastern.
  "ober-mountain": "America/New_York",
};

export type ResortTimeZoneSource = {
  slug?: string | null;
  state?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
};

/**
 * IANA zone for a resort: explicit slug override → geographic rule for
 * the split states → state default. Returns undefined only when even the
 * state is unknown, so callers can fall back to UTC and say so.
 */
export function timeZoneForResort(r: ResortTimeZoneSource): string | undefined {
  if (r.slug && RESORT_TIMEZONE_OVERRIDES[r.slug]) return RESORT_TIMEZONE_OVERRIDES[r.slug];
  const state = r.state ? r.state.toUpperCase() : null;
  const lat = r.latitude == null ? NaN : Number(r.latitude);
  const lng = r.longitude == null ? NaN : Number(r.longitude);
  if (state && Number.isFinite(lat) && Number.isFinite(lng)) {
    const split = splitStateZone(state, lat, lng);
    if (split) return split;
  }
  return timeZoneForState(state);
}

// Geographic rules for the states a zone line cuts through. Boundaries
// are approximate but sit in unpopulated country between the resorts on
// either side (verified against every resort in the catalog on 2026-09-23).
function splitStateZone(state: string, lat: number, lng: number): string | undefined {
  switch (state) {
    case "ID":
      // Panhandle (Pacific) vs the rest (Mountain); the line follows the
      // Salmon River at ~45.5°N. Grangeville / Cottonwood are north of it.
      return lat > 45.55 ? "America/Los_Angeles" : "America/Denver";
    case "MI":
      // Four western UP counties bordering Wisconsin are Central.
      if ((lng <= -87.6 && lat < 46.3) || (lng <= -89.7 && lat < 46.6)) return "America/Chicago";
      return "America/New_York";
    case "SD":
      return lng < -101 ? "America/Denver" : "America/Chicago";
    case "ND":
      return lng < -102.5 && lat < 47.2 ? "America/Denver" : "America/Chicago";
    case "NE":
      return lng < -101.5 ? "America/Denver" : "America/Chicago";
    case "KS":
      return lng < -101.8 ? "America/Denver" : "America/Chicago";
    case "TN":
      // Eastern zone starts just west of Chattanooga / Knoxville.
      return lng > -85.6 ? "America/New_York" : "America/Chicago";
    case "KY":
      return lng < -86 ? "America/Chicago" : "America/New_York";
    case "IN":
      // NW corner (Chicago metro) and SW corner (Evansville) are Central.
      if ((lat > 40.9 && lng < -86.7) || (lat < 38.4 && lng < -87.2)) return "America/Chicago";
      return "America/New_York";
    case "OR":
      // Malheur County (Ontario, OR) runs on Mountain time.
      return lng > -117.5 && lat < 44.5 ? "America/Denver" : "America/Los_Angeles";
    case "NV":
      // West Wendover / Jackpot follow Utah + Idaho.
      return lng > -114.2 && lat > 40.5 ? "America/Denver" : "America/Los_Angeles";
    case "TX":
      return lng < -104.9 ? "America/Denver" : "America/Chicago";
    case "FL":
      return lng < -85.1 ? "America/Chicago" : "America/New_York";
    default:
      return undefined;
  }
}

/**
 * Map US state code to IANA timezone. The default zone for each state;
 * `timeZoneForResort` layers the split-state geography on top. Arizona
 * (no DST) is Phoenix; the Navajo Nation exception has no ski areas.
 */
export function timeZoneForState(state: string | null | undefined): string | undefined {
  if (!state) return undefined;
  const s = state.toUpperCase();
  if (s === "AK") return "America/Anchorage";
  if (s === "HI") return "Pacific/Honolulu";
  if (["WA", "OR", "CA", "NV"].includes(s)) return "America/Los_Angeles";
  if (s === "AZ") return "America/Phoenix";
  if (["MT", "WY", "CO", "NM", "UT", "ID"].includes(s)) return "America/Denver";
  if (
    [
      "ND",
      "SD",
      "NE",
      "KS",
      "OK",
      "TX",
      "MN",
      "IA",
      "MO",
      "AR",
      "LA",
      "MS",
      "AL",
      "WI",
      "IL",
      "TN",
    ].includes(s)
  )
    return "America/Chicago";
  if (
    [
      "ME",
      "VT",
      "NH",
      "MA",
      "CT",
      "RI",
      "NY",
      "NJ",
      "PA",
      "DE",
      "MD",
      "DC",
      "VA",
      "WV",
      "NC",
      "SC",
      "GA",
      "FL",
      "OH",
      "MI",
      "IN",
      "KY",
    ].includes(s)
  )
    return "America/New_York";
  return undefined;
}

// ---------- helpers ----------

function julianDay(y: number, m: number, d: number): number {
  let yy = y;
  let mm = m;
  if (mm <= 2) {
    yy -= 1;
    mm += 12;
  }
  const a = Math.floor(yy / 100);
  const b = 2 - a + Math.floor(a / 4);
  return (
    Math.floor(365.25 * (yy + 4716)) +
    Math.floor(30.6001 * (mm + 1)) +
    d +
    b -
    1524.5
  );
}

function utcDateFromMinutes(
  y: number,
  m: number,
  d: number,
  minutes: number,
): Date {
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCMinutes(minutes);
  return date;
}

function rad(deg: number): number {
  return (deg * Math.PI) / 180;
}
function deg(rad: number): number {
  return (rad * 180) / Math.PI;
}
function mod360(x: number): number {
  return ((x % 360) + 360) % 360;
}
