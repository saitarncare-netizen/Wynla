// "With my pass, from my city, where should I ride this Saturday, and
// how will the snow feel?" — the one question Wynla answers (strategy
// move 2, 2026-09-18). This module is the pure ranking behind /go and the
// Thursday email: it takes resort rows, the weather the pipeline already
// stores and the rider's pass + city, and returns three picks with a
// score, a one-line reason and an honest confidence tag.
//
// Nothing here talks to the database. The page and the cron load the
// inputs (lib/saturday/load.ts) and call rankForSaturday(); the tests
// feed it fixtures. Every domain rule is borrowed, not re-implemented:
//   season status  lib/seasonDates.deriveResortStatus
//   surface        lib/snowSurface (dormancy gate + classifier)
//   wind hold      lib/windHold (gusts first)
//   pass access    lib/passAccess (blackouts, day limits)
//   crowds         lib/crowdForecast
//   drive time     drive_time_cache when the origin has it, else
//                  lib/distance's estimate, labelled "≈"
//
// Honesty rules:
//   * A resort we cannot confirm is running is never a pick. Closed,
//     off-season and "check resort" rows go to the excluded list with the
//     reason, and before the season the caller renders the opening
//     countdown instead of picks (mode "off-season").
//   * The confidence tag is derived from the forecast horizon and the age
//     of the data, never from how good the pick looks.
//   * A blackout on the target date excludes the resort; an unknown
//     blackout status is printed as unknown, never as "open". With a
//     family but no product chosen, every product of the family is
//     checked: excluded only when all of them are blacked out, otherwise
//     the line names which products are.
//   * An approximate opening ("Late November", parsed to the 25th) is a
//     countdown entry, never an opening-day pick: only an explicit date
//     from the operator promotes a resort out of the dormant list.

import {
  deriveResortStatus,
  isGlobalOffSeasonNow,
  resolveSeasonInfo,
  type ResortStatus,
  type ResortStatusSource,
  type SeasonInfo,
  type SeasonTextSource,
} from "@/lib/seasonDates";
import {
  classifyToday,
  dormantReason,
  forecastDayToDailyWeather,
  wordingLooksRainy,
  type DailyWeather,
  type ForecastDay as SurfaceForecastDay,
  type SurfaceCode,
  type SurfaceContext,
  type SurfaceResult,
  SURFACE_GLOSSARY,
} from "@/lib/snowSurface";
import {
  evaluateWindHold,
  liftMixFromTypes,
  parseWindFromText,
  type WindHoldEvaluation,
} from "@/lib/windHold";
import { crowdForecast, type CrowdForecast, type CrowdLevel } from "@/lib/crowdForecast";
import {
  PASS_ACCESS_VERIFIED_ON,
  formatRanges,
  getFamilyAccess,
  isBlackedOutFor,
  productShort,
  productsFor,
  type PassFamily,
  type PassProductAccess,
} from "@/lib/passAccess";
import { passLabel } from "@/lib/passColors";
import { estimateDriveMeters, estimateDriveSeconds, haversineMeters } from "@/lib/distance";
import { formatDriveTime } from "@/lib/origins";
import type { ForecastDay, MeasuredSnow } from "@/lib/weather/forecastJson";
import { daysBetween, formatAge, formatMonthDay, hoursSince, shiftIso, todayIso } from "./dates";

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

/** The resort columns the ranking reads. Same names as the DB row so the
 *  loader can pass rows straight through. */
export type RankResort = ResortStatusSource &
  SeasonTextSource & {
    id: number;
    slug: string;
    name: string;
    state: string;
    latitude: number | string | null;
    longitude: number | string | null;
    passes: string[] | null;
    tier?: string | null;
    vertical_drop?: number | null;
    snow_base_depth_in?: number | null;
    snow_new_24h_in?: number | null;
    snow_new_48h_in?: number | null;
    current_surface_class?: string | null;
    current_surface_updated_at?: string | null;
    wind_hold_mph_chair?: number | null;
    wind_hold_mph_gondola?: number | null;
    lift_types?: Record<string, number | null | undefined> | null;
  };

export type RankWeather = {
  /** Forecast strip (forecast_json days[], v1 or v2), resort-local dates. */
  days: ForecastDay[];
  /** forecast_json.measured (v2) — NOAA analysis / SNOTEL at the resort. */
  measured: MeasuredSnow | null;
  /** When the forecast was written: forecast_json.updated_at or fetched_at. */
  updatedAt: string | null;
  /** weather_history rows, oldest → newest, up to 7, ideally ending today. */
  history: DailyWeather[];
};

export type DriveInfo = {
  seconds: number;
  meters: number | null;
  /** True when the number is lib/distance's straight-line estimate. */
  estimated: boolean;
};

export type RankOrigin = { lat: number; lon: number; name: string };

export type RankInput = {
  resorts: RankResort[];
  weatherById: ReadonlyMap<number, RankWeather>;
  /** Exact drive times from drive_time_cache for this origin, by resort id.
   *  Resorts without an entry get the estimate. */
  driveById?: ReadonlyMap<number, DriveInfo>;
  /** null = no pass filter (day tickets); the picks then cover every resort. */
  passFamily: PassFamily | null;
  /** productKey from lib/passAccess.productsFor, or null for "any product". */
  product: string | null;
  origin: RankOrigin;
  /** 'YYYY-MM-DD' in the origin's calendar. */
  targetDate: string;
  maxDriveHours?: number;
  /** IANA zone the target date was chosen in (America/New_York default). */
  timeZone?: string;
  now?: Date;
  /**
   * Resort ids the loader actually fetched weather for. When the loader
   * had to cap the candidate list, resorts inside the radius but outside
   * this set are excluded as "not ranked" instead of being blamed for
   * having no weather on file. Omit when every candidate was loaded.
   */
  rankedIds?: ReadonlySet<number>;
  /** The loader's cap, for the "ranked the N closest" wording. */
  rankedLimit?: number | null;
};

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export type Confidence = "High" | "Medium" | "Low";

/** Which forecast fed the expected-snow number: forecast_json v2 days
 *  carry `source`; v1 strips (no field) are NWS. "mixed" = the day before
 *  and the target day came from different feeds. */
export type ForecastSource = "nws" | "open-meteo" | "mixed";

/** Label for the number's provenance line: "NWS", "Open-Meteo", "NWS + Open-Meteo". */
export function forecastSourceLabel(source: ForecastSource | null): string {
  switch (source) {
    case "open-meteo":
      return "Open-Meteo";
    case "mixed":
      return "NWS + Open-Meteo";
    default:
      return "NWS";
  }
}

function forecastSourceOf(target: ForecastDay | undefined, before: ForecastDay | undefined): ForecastSource | null {
  if (!target) return null;
  const t = target.source ?? "nws";
  const b = before ? (before.source ?? "nws") : t;
  return t === b ? t : "mixed";
}

export type PickSnow = {
  /** Forecast inches for the day before plus the target day (the storm a
   *  Saturday rider actually meets), null when the strip does not reach
   *  the target date. */
  expectedIn: number | null;
  targetDayIn: number | null;
  dayBeforeIn: number | null;
  forecastUpdatedAt: string | null;
  /** Provenance of expectedIn; null when there is no target-day forecast. */
  forecastSource: ForecastSource | null;
  tempHighF: number | null;
  tempLowF: number | null;
  conditions: string | null;
  /** Liquid rain is likely on the target day (wording + chance, or QPF
   *  with a warm high and no snow). */
  rainLikely: boolean;
  /** NOAA snowfall analysis totals ending `measuredAt` (inches). */
  measured24In: number | null;
  measured48In: number | null;
  measured72In: number | null;
  measuredAt: string | null;
  /** The resort's own 24 h number, only when a licensed feed read it. */
  reported24In: number | null;
  reportedAt: string | null;
  baseDepthIn: number | null;
};

export type PickSurface =
  | {
      dormant: false;
      code: SurfaceCode;
      label: string;
      confidence: SurfaceResult["confidence"];
      /** "stored" = resorts.current_surface_class written by the cron
       *  today; "classified" = run here from history + forecast. */
      basis: "stored" | "classified";
      reasons: string[];
      asOf: string | null;
    }
  | { dormant: true; reason: string };

export type PickAccess = {
  /** One line for the card, e.g. "Ikon Base: 5 days · no blackout Jan 16". */
  line: string;
  /** isBlackedOut for the target date: true / false / null (unknown). */
  blackout: boolean | null;
  daysShort: string | null;
  reservationRequired: boolean;
  /** False when the pass dataset has no row for this resort + product and
   *  the line only echoes resorts.passes[]. */
  verified: boolean;
  /** Set for a day-access blackout (night skiing still allowed). */
  note: string | null;
};

export type ScoreBreakdown = {
  snow: number;
  measured: number;
  surface: number;
  drive: number;
  wind: number;
  crowd: number;
  open: number;
  rain: number;
};

export type RankedPick = {
  rank: number;
  score: number;
  breakdown: ScoreBreakdown;
  resort: { id: number; slug: string; name: string; state: string };
  drive: DriveInfo & { label: string };
  status: ResortStatus;
  /** True when the resort is not running today but the operator's
   *  explicit opening date falls on or before the target date. */
  openingDay: boolean;
  /** The announced opening date when openingDay is set (it may be the
   *  Friday before the target), else null. */
  opensOn: string | null;
  snow: PickSnow;
  surface: PickSurface;
  windHold: WindHoldEvaluation;
  crowd: CrowdForecast;
  access: PickAccess;
  confidence: Confidence;
  confidenceWhy: string;
  /** "6 in expected Fri into Sat, powder by first chair, 4h 10m drive" */
  reason: string;
};

export type ExcludedKind =
  | "closed"
  | "unknown"
  | "projected"
  /** Opening date is a vague phrase ("Late November") that lands on or
   *  before the target: still counting down, not confirmed open. */
  | "unconfirmed"
  | "blackout"
  | "not-included"
  | "no-pass"
  | "no-weather"
  /** Inside the radius but beyond the loader's candidate cap. */
  | "not-ranked";

export type Excluded = {
  kind: ExcludedKind;
  resort: { id: number; slug: string; name: string; state: string };
  drive: DriveInfo & { label: string };
  reason: string;
};

export type CountdownEntry = {
  resort: { id: number; slug: string; name: string; state: string };
  drive: DriveInfo & { label: string };
  opensOn: string | null;
  daysUntilOpen: number | null;
  approximate: boolean;
  projected: boolean;
  statusLabel: string;
  access: PickAccess | null;
};

export type RankInputNote = { label: string; value: string };

export type RankResult = {
  /** "picks" when at least one resort within reach is running and on the
   *  pass; "no-picks" when resorts are running but every one fell to a
   *  blackout or pass rule (render the excluded list); "off-season" when
   *  nothing within reach is running (render the countdown); "none" when
   *  nothing is within the drive radius at all. */
  mode: "picks" | "no-picks" | "off-season" | "none";
  targetDate: string;
  todayDate: string;
  horizonDays: number;
  /** The calendar says summer for most US resorts (May – mid Oct). */
  globalOffSeason: boolean;
  /**
   * In mode "off-season": "before" when the mountains within reach are
   * counting down to an opening, "after" when they have closed for the
   * season and none has announced the next one yet (April–May), so the
   * page can say "the season is over" instead of "has not started".
   */
  seasonPhase: "before" | "after" | null;
  picks: RankedPick[];
  runnersUp: RankedPick[];
  excluded: Excluded[];
  countdown: CountdownEntry[];
  /** Resorts beyond the drive radius, counted only. */
  tooFarCount: number;
  candidateCount: number;
  /** Resorts within reach whose lifts are (or will be by the target) running. */
  runningCount: number;
  /** Resorts within reach the loader did not fetch (candidate cap). */
  unrankedCount: number;
  inputs: RankInputNote[];
  weights: typeof WEIGHTS;
};

// ---------------------------------------------------------------------------
// Weights — the whole scoring model in one table
// ---------------------------------------------------------------------------

/**
 * Points per signal. The scale is chosen so a 12" storm (+48) outweighs a
 * five-hour drive (-24) and a packed crowd (-14) together, while an icy
 * surface (-18) plus a wind hold (-20) sink a resort even on a snow day.
 *
 *   snow      +4 per forecast inch (Fri + Sat), capped at 12" (+48)
 *   measured  +1 per inch already on the ground in the last 72 h, cap 10
 *   surface   class points × confidence factor (high 1.0 / medium 0.8 / low 0.6)
 *   drive     -6 per hour beyond the first hour
 *   wind      warning -8, lifts-may-close -20 (gusts, lib/windHold)
 *   crowd     quiet 0 / moderate -3 / busy -8 / packed -14
 *   open      +5 when the resort is verified open today (lifts confirmed)
 *   rain      -10 when liquid rain is likely on the target day
 */
export const WEIGHTS = {
  snowPerInch: 4,
  snowCapIn: 12,
  measuredPerInch: 1,
  measuredCapIn: 10,
  surface: {
    PP: 25,
    PPC: 20,
    MG: 14,
    LSG: 8,
    WG: 6,
    VC: 3,
    FG: -4,
    WS: -3,
    IP: -18,
  } as Record<SurfaceCode, number>,
  surfaceConfidence: { high: 1, medium: 0.8, low: 0.6 } as Record<SurfaceResult["confidence"], number>,
  drivePerHour: 6,
  driveFreeHours: 1,
  windWarning: -8,
  windHighRisk: -20,
  crowd: { quiet: 0, moderate: -3, busy: -8, packed: -14 } as Record<CrowdLevel, number>,
  verifiedOpen: 5,
  rainLikely: -10,
} as const;

export const DEFAULT_MAX_DRIVE_HOURS = 5;
export const PICK_COUNT = 3;
export const RUNNER_UP_COUNT = 2;

/** A forecast older than this steps the confidence tag down one level. */
const FORECAST_FRESH_HOURS = 30;
/** A stored surface class older than this is not "today's surface". */
const STORED_SURFACE_FRESH_HOURS = 36;
/** A resort report older than this no longer counts as today's number. */
const REPORT_FRESH_HOURS = 36;
/** Nearest announced opening further out than this reads as "the season
 *  is over" (spring) rather than "has not started" (autumn). */
const POST_SEASON_GAP_DAYS = 120;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function num(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? n : null;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function resortRef(r: RankResort): RankedPick["resort"] {
  return { id: r.id, slug: r.slug, name: r.name, state: r.state };
}

function driveFor(r: RankResort, origin: RankOrigin, cached: DriveInfo | undefined): (DriveInfo & { label: string }) | null {
  if (cached && Number.isFinite(cached.seconds)) {
    return { ...cached, label: formatDriveTime(cached.seconds) };
  }
  const lat = num(r.latitude);
  const lon = num(r.longitude);
  if (lat == null || lon == null) return null;
  const meters = haversineMeters(origin.lat, origin.lon, lat, lon);
  const seconds = estimateDriveSeconds(meters);
  return { seconds, meters: estimateDriveMeters(meters), estimated: true, label: `≈${formatDriveTime(seconds)}` };
}

function findProduct(entries: PassProductAccess[], productKey: string | null): PassProductAccess | null {
  if (!productKey) return null;
  const wanted = productKey.trim().toLowerCase();
  return entries.find((e) => e.productKey === wanted || e.product.toLowerCase() === wanted) ?? null;
}

type AccessVerdict = { access: PickAccess | null; exclude: { kind: ExcludedKind; reason: string } | null };

/** Why a product's blackout status is unknown for a date, as card copy. */
function unknownBlackoutClause(entry: PassProductAccess): string {
  switch (entry.blackouts.status) {
    case "unpublished":
      return "blackouts not announced yet";
    case "conditional":
      return `peak-date blackout depends on the option you bought (${formatRanges(entry.blackouts.ranges)})`;
    default:
      return "blackout dates unknown, check the pass";
  }
}

/**
 * Access line + blackout verdict for one resort. `blackoutDate` is the
 * target date to check, or null to print the day allowance only (used for
 * the countdown, where a blackout verdict for a date months before the
 * lifts run reads as over-precise).
 */
export function accessFor(
  r: RankResort,
  family: PassFamily | null,
  productKey: string | null,
  blackoutDate: string | null,
): AccessVerdict {
  if (!family) return { access: null, exclude: null };
  const onFamily = (r.passes ?? []).includes(family);
  if (!onFamily) {
    return { access: null, exclude: { kind: "no-pass", reason: `Not on the ${passLabel(family)}` } };
  }
  const entries = getFamilyAccess(r.slug, family);
  if (entries.length === 0) {
    // The resort is on the family per resorts.passes[] but the verified
    // dataset has no row for it: say so instead of guessing.
    return {
      access: {
        line: `${passLabel(family)} resort · product details not verified yet`,
        blackout: null,
        daysShort: null,
        reservationRequired: false,
        verified: false,
        note: null,
      },
      exclude: null,
    };
  }
  if (!productKey) return familyAccess(family, entries, blackoutDate);

  const entry = findProduct(entries, productKey);
  if (!entry) {
    // The family is verified here but this product has no row: the
    // rider's product may simply not include the resort, or the row was
    // never captured. Either way we cannot check blackouts, so say that.
    const productName = productsFor(family).find((p) => p.productKey === productKey)?.product ?? productKey;
    return {
      access: {
        line: `${passLabel(family)} resort · ${productName} not in the verified list for this resort, check the pass`,
        blackout: null,
        daysShort: null,
        reservationRequired: false,
        verified: false,
        note: null,
      },
      exclude: null,
    };
  }
  if (entry.days.kind === "none") {
    return {
      access: null,
      exclude: { kind: "not-included", reason: `Not included on the ${entry.product}` },
    };
  }
  // days.short is already lower-case copy ("5 days", "unlimited"); the
  // qualifier keeps its proper nouns ("shared across Killington and Pico").
  const bits: string[] = [
    `${productShort(entry)}: ${entry.days.short}${entry.days.qualifier ? ` (${entry.days.qualifier})` : ""}`,
  ];
  let blackout: boolean | null = null;
  let note: string | null = null;
  if (blackoutDate) {
    blackout = isBlackedOutFor(entry, blackoutDate);
    const when = formatMonthDay(blackoutDate);
    if (blackout === true && entry.blackouts.scope === "full") {
      return {
        access: null,
        exclude: { kind: "blackout", reason: `${productShort(entry)} blackout on ${when}` },
      };
    }
    if (blackout === true) {
      // Day-access scope: the pass does not work 9am-3pm but the rest of
      // the day (night skiing) is open. Printed, never hidden.
      note = `No 9am-3pm access on ${when}${entry.blackouts.note ? ` · ${entry.blackouts.note}` : ""}`;
      bits.push(`no daytime access ${when}`);
    } else if (blackout === false) {
      bits.push(`no blackout ${when}`);
    } else {
      bits.push(unknownBlackoutClause(entry));
    }
  }
  if (entry.reservationRequired) bits.push("reservation required");
  return {
    access: {
      line: bits.join(" · "),
      blackout,
      daysShort: entry.days.short,
      reservationRequired: entry.reservationRequired,
      verified: true,
      note,
    },
    exclude: null,
  };
}

/**
 * Family chosen, no product: check every product of the family at this
 * resort. Excluded only when all of them are blacked out for the date;
 * otherwise the line names the products that are, so a rider on the
 * cheaper product is warned and one on the full product is not blocked.
 */
function familyAccess(family: PassFamily, entries: PassProductAccess[], blackoutDate: string | null): AccessVerdict {
  const usable = entries.filter((e) => e.days.kind !== "none");
  if (usable.length === 0) {
    return { access: null, exclude: { kind: "not-included", reason: `Not included on any ${passLabel(family)} product` } };
  }
  const bits: string[] = [`${passLabel(family)}: ${usable.map((e) => `${productShort(e)} ${e.days.short}`).join(", ")}`];
  let blackout: boolean | null = null;
  let note: string | null = null;
  if (blackoutDate) {
    const when = formatMonthDay(blackoutDate);
    const verdicts = usable.map((e) => ({ e, v: isBlackedOutFor(e, blackoutDate) }));
    const fullOut = verdicts.filter((x) => x.v === true && x.e.blackouts.scope === "full");
    const dayOut = verdicts.filter((x) => x.v === true && x.e.blackouts.scope !== "full");
    const open = verdicts.filter((x) => x.v === false);
    if (fullOut.length === usable.length) {
      return {
        access: null,
        exclude: {
          kind: "blackout",
          reason: `${passLabel(family)} blackout on ${when} on every product (${fullOut.map((x) => productShort(x.e)).join(", ")})`,
        },
      };
    }
    if (fullOut.length > 0 || dayOut.length > 0) {
      const names = [...fullOut, ...dayOut].map((x) => productShort(x.e)).join(", ");
      const openNames = open.map((x) => productShort(x.e)).join(", ");
      bits.push(`${when} blackout depends on product: ${names} blacked out${openNames ? `, ${openNames} open` : ""}`);
      if (dayOut.length > 0) note = `No 9am-3pm access on ${when} on ${dayOut.map((x) => productShort(x.e)).join(", ")}`;
      blackout = null;
    } else if (open.length === usable.length) {
      bits.push(`no blackout ${when} on any product`);
      blackout = false;
    } else {
      // At least one product's list is unpublished or option-dependent
      // and none is known to be blacked out: unknown, never "open".
      const unknown = verdicts.find((x) => x.v === null)!;
      bits.push(`${productShort(unknown.e)}: ${unknownBlackoutClause(unknown.e)}`);
      blackout = null;
    }
  }
  const reserved = usable.filter((e) => e.reservationRequired);
  if (reserved.length === usable.length) bits.push("reservation required");
  else if (reserved.length > 0) bits.push(`reservation required on ${reserved.map(productShort).join(", ")}`);
  return {
    access: {
      line: bits.join(" · "),
      blackout,
      daysShort: null,
      reservationRequired: reserved.length === usable.length,
      verified: true,
      note,
    },
    exclude: null,
  };
}

function toSurfaceForecastDay(d: ForecastDay): SurfaceForecastDay {
  return {
    date: d.date,
    temp_high_f: d.temp_high_f,
    temp_low_f: d.temp_low_f,
    snow_in: d.snow_in,
    precip_chance: d.precip_chance,
    conditions_short: d.conditions_short,
    wind_short: d.wind_short,
    precip_in: typeof d.qpf_in === "number" ? d.qpf_in : null,
  };
}

function rainLikelyOn(d: ForecastDay | undefined): boolean {
  if (!d) return false;
  const chance = typeof d.precip_chance === "number" ? d.precip_chance : 0;
  if (wordingLooksRainy(d.conditions_short, d.temp_high_f) && chance >= 50) return true;
  const qpf = typeof d.qpf_in === "number" ? d.qpf_in : 0;
  const snow = d.snow_in ?? 0;
  return qpf >= 0.1 && snow < 0.5 && d.temp_high_f != null && d.temp_high_f >= 34;
}

/** Cap the classifier's confidence by how far out the target day is —
 *  the same ladder lib/snowSurface.classifyForecast applies to its 3-day
 *  strip, extended to a full week. */
function capByHorizon(c: SurfaceResult["confidence"], horizonDays: number): SurfaceResult["confidence"] {
  if (horizonDays <= 1) return c;
  if (horizonDays === 2) return c === "high" ? "medium" : c;
  return "low";
}

type SurfaceEval = { surface: PickSurface; dormantForConfidence: boolean };

function surfaceFor(
  r: RankResort,
  w: RankWeather,
  status: ResortStatus,
  season: SeasonInfo,
  todayDate: string,
  targetDate: string,
  horizonDays: number,
  openingDay: boolean,
  now: Date,
): SurfaceEval {
  if (openingDay) {
    return {
      surface: { dormant: true, reason: "Opens that weekend: no surface call until the lifts have run" },
      dormantForConfidence: false,
    };
  }
  const isOpen: boolean | null =
    status.kind === "open" || status.kind === "limited" || status.kind === "likely-open"
      ? true
      : status.dormant
        ? false
        : null;
  const liveSnowpack =
    status.kind === "open" ||
    status.kind === "limited" ||
    (r.snow_base_depth_in ?? 0) > 0 ||
    (r.lifts_open_today ?? 0) > 0;
  const ctx: SurfaceContext = {
    baseDepthIn: r.snow_base_depth_in ?? null,
    hasSnowpack: liveSnowpack ? true : null,
    inSeason: season.status === "in-season",
    isOpen,
    offSeason: status.kind === "off-season" || status.kind === "opens",
    lastObservedAt: w.updatedAt,
    now,
  };
  const dormant = dormantReason(w.history, ctx);
  if (dormant) {
    return {
      surface: { dormant: true, reason: dormant.message },
      dormantForConfidence: dormant.reason === "stale" || dormant.reason === "no-data",
    };
  }

  // Today: the cron's stored class is the same classifier run this
  // morning on the same inputs, so prefer it when it is fresh.
  if (horizonDays === 0 && r.current_surface_class) {
    const code = r.current_surface_class.toUpperCase() as SurfaceCode;
    const age = hoursSince(r.current_surface_updated_at, now);
    if (SURFACE_GLOSSARY[code] && age != null && age <= STORED_SURFACE_FRESH_HOURS) {
      return {
        surface: {
          dormant: false,
          code,
          label: SURFACE_GLOSSARY[code].label,
          confidence: "medium",
          basis: "stored",
          reasons: [],
          asOf: r.current_surface_updated_at ?? null,
        },
        dormantForConfidence: false,
      };
    }
  }

  // Roll the 7-day window forward one forecast day at a time until the
  // target date is "today" for the classifier. A missing day in the
  // strip means the forecast does not reach the target yet.
  let rolling: DailyWeather[] = w.history.slice(-7);
  for (let d = shiftIso(todayDate, 1); d <= targetDate; d = shiftIso(d, 1)) {
    const day = w.days.find((x) => x.date === d);
    if (!day) {
      return {
        surface: { dormant: true, reason: `The forecast does not reach ${formatMonthDay(targetDate)} yet` },
        dormantForConfidence: true,
      };
    }
    rolling = [...rolling.slice(-6), forecastDayToDailyWeather(toSurfaceForecastDay(day))];
  }
  const result = classifyToday(rolling, ctx);
  if (!result) {
    return { surface: { dormant: true, reason: "Not enough weather to classify" }, dormantForConfidence: true };
  }
  return {
    surface: {
      dormant: false,
      code: result.code,
      label: result.label,
      confidence: capByHorizon(result.confidence, horizonDays),
      basis: "classified",
      reasons: result.reasons,
      asOf: w.updatedAt,
    },
    dormantForConfidence: false,
  };
}

/**
 * Confidence tag from the forecast horizon and data freshness only.
 * Exported so the email and the page can explain it the same way.
 */
export function confidenceFor(input: {
  horizonDays: number;
  forecastAgeHours: number | null;
  hasTargetForecast: boolean;
  surfaceUnavailable: boolean;
}): { tag: Confidence; why: string } {
  const ladder: Confidence[] = ["High", "Medium", "Low"];
  let level = input.horizonDays <= 1 ? 0 : input.horizonDays <= 3 ? 1 : 2;
  const why: string[] = [
    input.horizonDays <= 0
      ? "same-day forecast"
      : `${input.horizonDays} day${input.horizonDays === 1 ? "" : "s"} out`,
  ];
  if (!input.hasTargetForecast) {
    level = 2;
    why.push("forecast does not reach that day yet");
  }
  if (input.forecastAgeHours == null) {
    level = Math.min(2, level + 1);
    why.push("forecast age unknown");
  } else if (input.forecastAgeHours > FORECAST_FRESH_HOURS) {
    level = Math.min(2, level + 1);
    why.push(`forecast last refreshed ${Math.round(input.forecastAgeHours)} h ago`);
  } else {
    why.push(`forecast refreshed ${Math.max(1, Math.round(input.forecastAgeHours))} h ago`);
  }
  if (input.surfaceUnavailable) {
    level = Math.min(2, level + 1);
    why.push("no surface call");
  }
  return { tag: ladder[level], why: why.join(", ") };
}

function snowPhrase(s: PickSnow, targetDate: string): string {
  if (s.expectedIn == null) return `no forecast for ${formatMonthDay(targetDate)} yet`;
  const target = new Date(`${targetDate}T12:00:00Z`).toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" });
  const before = new Date(`${shiftIso(targetDate, -1)}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    timeZone: "UTC",
  });
  const t = s.targetDayIn ?? 0;
  const b = s.dayBeforeIn ?? 0;
  if (s.expectedIn < 0.5) return "no new snow expected";
  const total = round1(s.expectedIn);
  if (b >= 0.5 && t >= 0.5) return `${total} in expected ${before} into ${target}`;
  if (b >= 0.5) return `${total} in expected ${before}`;
  return `${total} in expected ${target}`;
}

function surfacePhrase(s: PickSurface): string | null {
  if (s.dormant) return null;
  const label = s.label.toLowerCase();
  switch (s.code) {
    case "PP":
      return "powder by first chair";
    case "PPC":
      return "packed powder by first chair";
    case "MG":
      return "groomed corduroy early";
    case "WG":
      return "spring corn by late morning";
    case "IP":
      return "icy, edges required";
    default:
      return `${label} surface`;
  }
}

function buildReason(pick: Omit<RankedPick, "reason" | "rank">, targetDate: string): string {
  const bits: string[] = [snowPhrase(pick.snow, targetDate)];
  if (pick.snow.rainLikely) bits.push("rain likely");
  const surface = surfacePhrase(pick.surface);
  if (surface) bits.push(surface);
  if (pick.windHold.level === "high-risk") bits.push(`${pick.windHold.detail} may close lifts`);
  else if (pick.windHold.level === "warning") bits.push(`${pick.windHold.detail}, hold possible`);
  if (pick.openingDay) {
    // "opening day" only when the lifts start on the target date itself;
    // an opening the Friday before is named so the rider is not misled.
    bits.push(pick.opensOn && pick.opensOn !== targetDate ? `opens ${formatMonthDay(pick.opensOn)}` : "opening day");
  }
  bits.push(`${pick.drive.label} drive`);
  return bits.join(", ");
}

// ---------------------------------------------------------------------------
// The ranking
// ---------------------------------------------------------------------------

export function rankForSaturday(input: RankInput): RankResult {
  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? "America/New_York";
  const todayDate = todayIso(now, timeZone);
  const targetDate = input.targetDate;
  const horizonDays = daysBetween(todayDate, targetDate);
  const maxDriveSeconds = (input.maxDriveHours ?? DEFAULT_MAX_DRIVE_HOURS) * 3600;
  const globalOffSeason = isGlobalOffSeasonNow(now);
  const targetNoon = new Date(`${targetDate}T17:00:00Z`);

  const scored: Array<Omit<RankedPick, "rank">> = [];
  const excluded: Excluded[] = [];
  const countdown: CountdownEntry[] = [];
  let tooFarCount = 0;
  let candidateCount = 0;
  let runningCount = 0;
  let unrankedCount = 0;
  let countingDown = 0;
  let closedForSeason = 0;
  let newestForecast: string | null = null;
  let newestMeasured: string | null = null;
  let reportedCount = 0;
  let newestReport: string | null = null;
  let exactDrives = 0;
  let estimatedDrives = 0;

  for (const r of input.resorts) {
    const drive = driveFor(r, input.origin, input.driveById?.get(r.id));
    if (!drive) continue;
    if (drive.seconds > maxDriveSeconds) {
      tooFarCount++;
      continue;
    }
    candidateCount++;
    if (drive.estimated) estimatedDrives++;
    else exactDrives++;
    const ref = resortRef(r);

    const season = resolveSeasonInfo(r, now);
    const status = deriveResortStatus(r, season, now);
    const opensOn = season.nextOpenDate ? season.nextOpenDate.toISOString().slice(0, 10) : null;
    const opensByTarget = status.kind === "opens" && opensOn != null && opensOn <= targetDate;
    // Only an explicit date from the operator counts as an opening day.
    // A projection ("(projected)") or a vague phrase ("Late November",
    // parsed to the 25th) keeps the resort in the countdown.
    const openingByTarget = opensByTarget && !season.openProjected && !season.approximate;
    const runsByTarget = !status.dormant || openingByTarget;

    // Blackouts are checked only for a resort that will be running on the
    // target date; the countdown prints the day allowance alone.
    const { access, exclude: passExclude } = accessFor(
      r,
      input.passFamily,
      input.product,
      runsByTarget ? targetDate : null,
    );
    // A resort the pass does not cover at all is left out quietly; a
    // blackout on a covered resort is spelled out below because it is
    // the exclusion the rider most wants to see.
    const offPass = passExclude?.kind === "no-pass" || passExclude?.kind === "not-included";

    if (!runsByTarget) {
      if (offPass) continue;
      if (status.kind === "closed-season") closedForSeason++;
      if (season.nextOpenDate) {
        countingDown++;
        countdown.push({
          resort: ref,
          drive,
          opensOn,
          daysUntilOpen: season.daysUntilOpen,
          approximate: season.approximate,
          projected: season.openProjected,
          statusLabel: status.label,
          access,
        });
      }
      let kind: ExcludedKind = "closed";
      let reason = status.detail ? `${status.label} · ${status.detail}` : status.label;
      if (opensByTarget && season.openProjected) {
        kind = "projected";
        reason = `Projected to open ${formatMonthDay(opensOn!)}, not confirmed by the resort`;
      } else if (opensByTarget && season.approximate) {
        kind = "unconfirmed";
        reason = `Opens ~${formatMonthDay(opensOn!)}, exact date not announced`;
      }
      excluded.push({ kind, resort: ref, drive, reason });
      continue;
    }
    if (status.kind === "unknown") {
      if (!offPass) {
        excluded.push({ kind: "unknown", resort: ref, drive, reason: "Cannot confirm the lifts are running" });
      }
      continue;
    }
    runningCount++;
    if (passExclude) {
      if (!offPass) excluded.push({ kind: passExclude.kind, resort: ref, drive, reason: passExclude.reason });
      continue;
    }

    if (input.rankedIds && !input.rankedIds.has(r.id)) {
      // The loader capped its candidate list: this resort is in reach
      // but was never fetched, which is our limit, not a data gap.
      unrankedCount++;
      excluded.push({
        kind: "not-ranked",
        resort: ref,
        drive,
        reason: input.rankedLimit ? `Beyond the ${input.rankedLimit} closest mountains ranked` : "Not ranked this time",
      });
      continue;
    }
    const w = input.weatherById.get(r.id);
    if (!w) {
      excluded.push({ kind: "no-weather", resort: ref, drive, reason: "No weather on file yet" });
      continue;
    }

    // Forecast for the target day and the day before.
    const targetDay = w.days.find((d) => d.date === targetDate);
    const dayBefore = w.days.find((d) => d.date === shiftIso(targetDate, -1));
    const targetDayIn = targetDay ? (num(targetDay.snow_in) ?? 0) : null;
    const dayBeforeIn = dayBefore ? (num(dayBefore.snow_in) ?? 0) : horizonDays === 0 ? 0 : null;
    const expectedIn = targetDayIn == null ? null : round1(targetDayIn + (dayBeforeIn ?? 0));
    if (w.updatedAt && (!newestForecast || w.updatedAt > newestForecast)) newestForecast = w.updatedAt;

    const m = w.measured;
    if (m?.sfav2_valid_end && (!newestMeasured || m.sfav2_valid_end > newestMeasured)) {
      newestMeasured = m.sfav2_valid_end;
    }
    const reportFresh =
      r.snow_report_status === "reported" &&
      (hoursSince(r.snow_report_updated_at, now) ?? Infinity) <= REPORT_FRESH_HOURS;
    if (reportFresh) {
      reportedCount++;
      if (r.snow_report_updated_at && (!newestReport || r.snow_report_updated_at > newestReport)) {
        newestReport = r.snow_report_updated_at;
      }
    }
    const snow: PickSnow = {
      expectedIn,
      targetDayIn,
      dayBeforeIn,
      forecastUpdatedAt: w.updatedAt,
      forecastSource: forecastSourceOf(targetDay, dayBefore),
      tempHighF: targetDay?.temp_high_f ?? null,
      tempLowF: targetDay?.temp_low_f ?? null,
      conditions: targetDay?.conditions_short ?? null,
      rainLikely: rainLikelyOn(targetDay),
      measured24In: m?.sfav2_24h_in ?? null,
      measured48In: m?.sfav2_48h_in ?? null,
      measured72In: m?.sfav2_72h_in ?? null,
      measuredAt: m?.sfav2_valid_end ?? null,
      reported24In: reportFresh ? (num(r.snow_new_24h_in) ?? null) : null,
      reportedAt: reportFresh ? (r.snow_report_updated_at ?? null) : null,
      baseDepthIn: num(r.snow_base_depth_in),
    };

    const { surface, dormantForConfidence } = surfaceFor(
      r,
      w,
      status,
      season,
      todayDate,
      targetDate,
      horizonDays,
      openingByTarget,
      now,
    );

    // Wind hold on the target day, judged on gusts like the resort page.
    const parsedWind = parseWindFromText(targetDay?.wind_short);
    const gust = typeof targetDay?.gust_mph === "number" ? targetDay.gust_mph : parsedWind.gust;
    const windHold = evaluateWindHold(
      { sustained: parsedWind.sustained, gust },
      {
        wind_hold_mph_chair: r.wind_hold_mph_chair ?? null,
        wind_hold_mph_gondola: r.wind_hold_mph_gondola ?? null,
        liftMix: liftMixFromTypes(r.lift_types ?? null),
      },
    );

    const crowd = crowdForecast(
      {
        latitude: num(r.latitude),
        longitude: num(r.longitude),
        tier: r.tier ?? null,
        vertical_drop: r.vertical_drop ?? null,
        snow_new_24h_in: expectedIn,
        slug: r.slug,
        state: r.state,
      },
      targetNoon,
    );

    // Score.
    const snowPts = Math.min(expectedIn ?? 0, WEIGHTS.snowCapIn) * WEIGHTS.snowPerInch;
    const onGround = snow.measured72In ?? snow.reported24In ?? 0;
    const measuredPts = Math.min(Math.max(onGround, 0), WEIGHTS.measuredCapIn) * WEIGHTS.measuredPerInch;
    const surfacePts = surface.dormant
      ? 0
      : WEIGHTS.surface[surface.code] * WEIGHTS.surfaceConfidence[surface.confidence];
    const hours = drive.seconds / 3600;
    const drivePts = -WEIGHTS.drivePerHour * Math.max(0, hours - WEIGHTS.driveFreeHours);
    const windPts =
      windHold.level === "high-risk" ? WEIGHTS.windHighRisk : windHold.level === "warning" ? WEIGHTS.windWarning : 0;
    const crowdPts = WEIGHTS.crowd[crowd.level];
    const openPts = status.kind === "open" || status.kind === "limited" ? WEIGHTS.verifiedOpen : 0;
    const rainPts = snow.rainLikely ? WEIGHTS.rainLikely : 0;
    const breakdown: ScoreBreakdown = {
      snow: round1(snowPts),
      measured: round1(measuredPts),
      surface: round1(surfacePts),
      drive: round1(drivePts),
      wind: windPts,
      crowd: crowdPts,
      open: openPts,
      rain: rainPts,
    };
    const score = round1(Object.values(breakdown).reduce((a, b) => a + b, 0));

    const conf = confidenceFor({
      horizonDays,
      forecastAgeHours: hoursSince(w.updatedAt, now),
      hasTargetForecast: targetDay != null,
      surfaceUnavailable: dormantForConfidence,
    });

    const partial: Omit<RankedPick, "rank" | "reason"> = {
      score,
      breakdown,
      resort: ref,
      drive,
      status,
      openingDay: openingByTarget,
      opensOn: openingByTarget ? opensOn : null,
      snow,
      surface,
      windHold,
      crowd,
      access: access ?? {
        line: "Any pass or lift ticket",
        blackout: null,
        daysShort: null,
        reservationRequired: false,
        verified: false,
        note: null,
      },
      confidence: conf.tag,
      confidenceWhy: conf.why,
    };
    scored.push({ ...partial, reason: buildReason(partial, targetDate) });
  }

  scored.sort((a, b) => b.score - a.score || a.drive.seconds - b.drive.seconds || a.resort.name.localeCompare(b.resort.name));
  const ranked: RankedPick[] = scored.map((p, i) => ({ ...p, rank: i + 1 }));
  countdown.sort(
    (a, b) =>
      (a.opensOn ?? "9999").localeCompare(b.opensOn ?? "9999") || a.drive.seconds - b.drive.seconds,
  );
  excluded.sort((a, b) => a.drive.seconds - b.drive.seconds);

  const mode: RankResult["mode"] =
    ranked.length > 0 ? "picks" : runningCount > 0 ? "no-picks" : candidateCount > 0 ? "off-season" : "none";
  // "after" when the closed-for-season rows are not outnumbered by
  // announced openings, or when the nearest announced opening is far
  // off: after the last lift stops in April a resort's explicit dates
  // roll forward to next November (~200 days out), and the honest
  // headline is "the season is over", not "has not started"; by
  // September the nearest opening is ~60 days out and it flips back.
  const soonestOpen = countdown.reduce<number | null>(
    (best, c) => (c.daysUntilOpen != null && (best == null || c.daysUntilOpen < best) ? c.daysUntilOpen : best),
    null,
  );
  const seasonPhase: RankResult["seasonPhase"] =
    mode !== "off-season"
      ? null
      : (closedForSeason > 0 && closedForSeason >= countingDown) || (soonestOpen != null && soonestOpen > POST_SEASON_GAP_DAYS)
        ? "after"
        : "before";

  const inputs: RankInputNote[] = [];
  inputs.push({
    label: "Forecast",
    value: newestForecast
      ? `NWS + Open-Meteo, newest refresh ${formatAge(newestForecast, now)}`
      : "NWS + Open-Meteo, no refresh on file for these resorts",
  });
  if (newestMeasured) {
    inputs.push({ label: "Measured snow", value: `NOAA snowfall analysis to ${formatAge(newestMeasured, now)}` });
  }
  inputs.push({
    label: "Resort reports",
    value:
      reportedCount > 0
        ? `${reportedCount} resort${reportedCount === 1 ? "" : "s"} with a licensed report, newest ${formatAge(newestReport, now)}`
        : "No licensed resort report among these picks; open status comes from declared season dates",
  });
  inputs.push({
    label: "Drive times",
    value:
      exactDrives > 0 && estimatedDrives === 0
        ? `Road routes cached from ${input.origin.name}`
        : exactDrives > 0
          ? `Road routes from ${input.origin.name}; ≈ marks a straight-line estimate`
          : `≈ straight-line estimate × 1.2 at 60 mph from ${input.origin.name}`,
  });
  inputs.push({ label: "Pass rules", value: `Verified ${PASS_ACCESS_VERIFIED_ON} from the pass operators' pages` });
  inputs.push({ label: "Crowds", value: "Estimated from resort size, distance to a metro, weekend and holiday calendar" });
  if (unrankedCount > 0) {
    inputs.push({
      label: "Coverage",
      value: `Ranked the ${input.rankedLimit ?? "closest"} mountains nearest ${input.origin.name}; ${unrankedCount} more within reach were not scored`,
    });
  }

  return {
    mode,
    targetDate,
    todayDate,
    horizonDays,
    globalOffSeason,
    seasonPhase,
    picks: ranked.slice(0, PICK_COUNT),
    runnersUp: ranked.slice(PICK_COUNT, PICK_COUNT + RUNNER_UP_COUNT),
    excluded,
    countdown,
    tooFarCount,
    candidateCount,
    runningCount,
    unrankedCount,
    inputs,
    weights: WEIGHTS,
  };
}
