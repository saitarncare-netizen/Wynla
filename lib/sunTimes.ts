// Sunrise / sunset calculator for resort detail pages — first chair /
// last chair planning. NOAA solar-position algorithm; accurate to ~1
// minute. No external library needed.
//
// Usage:
//   const { sunrise, sunset } = computeSunTimes(lat, lng, new Date());
//   // → both are Date objects in UTC; format with toLocaleTimeString.

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
 * Format the sunrise/sunset Date in a target IANA time zone. Example:
 *   formatLocal(sunrise, "America/Denver") → "6:42 AM"
 */
export function formatLocal(d: Date, timeZone?: string): string {
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
}

/**
 * Map US state code to IANA timezone for resort-local time formatting.
 * Skiing US covers ~6 zones; the simplifications here are good enough
 * for sunrise/sunset display (the Arizona DST quirk would matter for
 * Arizona Snowbowl in May but not in ski season).
 */
export function timeZoneForState(state: string | null | undefined): string | undefined {
  if (!state) return undefined;
  const s = state.toUpperCase();
  if (
    [
      "AK",
    ].includes(s)
  )
    return "America/Anchorage";
  if (["WA", "OR", "CA", "NV"].includes(s)) return "America/Los_Angeles";
  if (s === "AZ") return "America/Phoenix";
  if (
    ["MT", "WY", "CO", "NM", "UT", "ID"].includes(s)
  )
    return "America/Denver";
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
