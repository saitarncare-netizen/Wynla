// Go / Wait / Skip — the one-word answer the 6 am "My mountains today"
// screen gives for each saved resort, with a reason a first-season
// skier understands and every number labelled by where it came from.
//
// This is deliberately a thin layer over the libs that already own the
// domain logic: deriveResortStatus (is it running), buildSurfaceReport
// (what the snow is like), evaluateWindHold (will the lifts spin),
// crowdForecast (how busy), isBlackedOut (can this pass ride today).
// It reads the v2 forecast_json (measured snow + hourly detail) directly
// so it can tell "measured last night" from "forecast for today" and
// "icy at first chair" from "icy all day".
//
// Honesty rules (audit + strategy: never advertise "accurate"):
//   - a dormant or unknown status never gets a Go / Wait;
//   - weather older than WEATHER_STALE_HOURS is not used for a call;
//   - every label carries a source (Measured / Forecast / Estimated /
//     Reported) and the instant it was valid, so the UI can print it.

import {
  deriveResortStatus,
  resolveSeasonInfo,
  type ResortStatus,
  type ResortStatusSource,
  type SeasonTextSource,
} from "./seasonDates";
import {
  buildSurfaceReport,
  wordingLooksRainy,
  type DailyWeather,
  type ForecastDay as SurfaceForecastDay,
  type SurfaceResult,
} from "./snowSurface";
import { evaluateWindHold, liftMixFromTypes, type WindHoldEvaluation } from "./windHold";
import { crowdForecast, type CrowdForecast } from "./crowdForecast";
import {
  getFamilyAccess,
  isBlackedOut,
  isBlackedOutFor,
  PASS_ACCESS_VERIFIED_ON,
  type PassFamily,
} from "./passAccess";
import {
  forecastDaysFrom,
  isForecastJsonV2,
  type ForecastDay,
  type ForecastHour,
} from "./weather/forecastJson";
import { timeZoneForResort } from "./sunTimes";
import { localDate, localHour } from "./weather/time";

// ---------- Public types ----------

export type VerdictKind = "go" | "wait" | "skip" | "unknown";

/** Where a user-visible number came from. Matches lib/alertRules. */
export type DataSource = "Measured" | "Forecast" | "Estimated" | "Reported";

export type VerdictLabel = {
  /** Short, e.g. "8 in new snow", "Gusts to 48 mph". */
  text: string;
  source: DataSource;
  /** ISO instant the value was valid or written; null for a calendar
   *  estimate that has no clock (crowd level). */
  at: string | null;
};

/** The resort columns a verdict reads. A superset of what the resort
 *  panel + page already select, so callers pass the same row. */
export type VerdictResort = ResortStatusSource &
  SeasonTextSource & {
    slug: string;
    state?: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    tier?: string | null;
    vertical_drop?: number | null;
    /** Measured (NOHRSC / SNOTEL) or, when snow_report_status is
     *  'reported', the resort's own number. */
    snow_new_24h_in?: number | string | null;
    snow_new_48h_in?: number | string | null;
    snow_base_depth_in?: number | null;
    wind_hold_mph_chair?: number | null;
    wind_hold_mph_gondola?: number | null;
    lift_types?: Record<string, number | string | null | undefined> | null;
  };

/** The weather_cache row for the resort (null when never fetched). */
export type VerdictWeather = {
  fetched_at: string | null;
  temp_high_f: number | null;
  temp_low_f: number | null;
  conditions_short: string | null;
  /** Today's forecast snowfall in the legacy column. */
  snow_24h_in: number | string | null;
  wind_mph_avg: number | null;
  wind_mph_gust: number | null;
  /** v1 array or v2 object; read through lib/weather/forecastJson. */
  forecast_json: unknown;
};

/** What we know about the user's pass. Both fields optional: a product
 *  gives a definitive blackout answer, families only a warning. */
export type PassContext = {
  product?: string | null;
  families?: PassFamily[] | null;
} | null;

export type VerdictOptions = {
  now?: Date;
  /** Trailing daily weather rows, oldest → newest, for the surface
   *  classifier. Without them the surface call is skipped, not guessed. */
  history?: DailyWeather[];
};

export type Verdict = {
  verdict: VerdictKind;
  /** Pill-sized headline, e.g. "Go: powder day", "Opens in 52 days". */
  headline: string;
  /** Plain-English reasons; reasons[0] is the one-liner. */
  reasons: string[];
  /** Labelled numbers the row prints, in display order. */
  labels: VerdictLabel[];
  confidence: "low" | "medium" | "high";
  /** The shared status the pill + map panel show. */
  status: ResortStatus;
  /** True when lifts are not running as far as we know (closed, opens
   *  later, off-season): the row shows the status instead of a verdict. */
  dormant: boolean;
  /** Days until the published opening, when the status is "opens". */
  opensInDays: number | null;
  newSnow: { inches: number; source: DataSource; at: string | null } | null;
  /** Today's forecast snowfall (base), for the powder banner. */
  forecastSnowToday: number | null;
  surface: Pick<SurfaceResult, "code" | "label" | "confidence"> | null;
  windHold: WindHoldEvaluation | null;
  crowd: CrowdForecast | null;
  /** Blackout today for the user's pass: true / false when known, null
   *  when the product is unknown or the list is unpublished. */
  blackout: boolean | null;
  /** True when the newest weather is older than WEATHER_STALE_HOURS. */
  stale: boolean;
  /** Resort-local calendar date the verdict is for. */
  todayISO: string;
  timeZone: string | undefined;
};

// ---------- Tunables ----------

/** Measured or forecast snow at or above this is a powder day. */
export const POWDER_IN = 6;

/** Weather older than this is not used for a call (one missed daily
 *  refresh is tolerated, two are not). Same bar as lib/alertRules. */
export const WEATHER_STALE_HOURS = 36;

/** Gust reading above the resort's high-risk line closes lifts; the
 *  warning band is "holds likely". Both come from lib/windHold. */

/** Liquid rain in a day below which we do not call it a rain day. */
const RAIN_MIN_IN = 0.05;
/** After rain, air at or below this refreezes the surface into ice. */
const REFREEZE_F = 30;
/** First-chair temperature at or below this reads as a firm, icy start. */
const ICY_START_F = 26;
/** Midday temperature at or above this softens a firm start. */
const SOFTEN_F = 34;
/** Resort-local hours we count as the ski day. */
const DAY_START_H = 8;
const DAY_END_H = 15;

// ---------- Helpers ----------

function num(v: number | string | null | undefined): number | null {
  if (v == null) return null;
  const n = typeof v === "string" ? parseFloat(v) : v;
  return Number.isFinite(n) ? n : null;
}

function isFresh(iso: string | null | undefined, now: Date, maxHours: number): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return false;
  const age = (now.getTime() - t) / 36e5;
  return age >= 0 && age <= maxHours;
}

function hoursAgo(iso: string | null | undefined, now: Date): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? Math.max(0, Math.round((now.getTime() - t) / 36e5)) : null;
}

function inches(n: number): string {
  const r = Math.round(n * 10) / 10;
  return `${Number.isInteger(r) ? r : r.toFixed(1)} in`;
}

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function maxOf(values: Array<number | null | undefined>): number | null {
  let best: number | null = null;
  for (const v of values) if (v != null && Number.isFinite(v) && (best == null || v > best)) best = v;
  return best;
}

function minOf(values: Array<number | null | undefined>): number | null {
  let best: number | null = null;
  for (const v of values) if (v != null && Number.isFinite(v) && (best == null || v < best)) best = v;
  return best;
}

type HourLocal = ForecastHour & { hour: number };

/** Today's hourly rows in the resort's own clock, tagged with the local hour. */
function todaysHours(hourly: ForecastHour[], todayISO: string, tz: string | undefined): HourLocal[] {
  const out: HourLocal[] = [];
  for (const h of hourly) {
    const t = new Date(h.time);
    if (!Number.isFinite(t.getTime())) continue;
    if (localDate(t, tz) !== todayISO) continue;
    out.push({ ...h, hour: localHour(t, tz) });
  }
  return out;
}

/** The surface classifier wants a row for today; when weather_history
 *  has not caught up we synthesize one from the cache row, exactly as
 *  the resort page does, so a fresh deploy still classifies. */
function surfaceHistory(history: DailyWeather[], weather: VerdictWeather, todayISO: string): DailyWeather[] {
  const rows = history.slice();
  if (rows.at(-1)?.observed_date === todayISO) return rows;
  const snow = num(weather.snow_24h_in);
  rows.push({
    observed_date: todayISO,
    temp_high_f: weather.temp_high_f,
    temp_low_f: weather.temp_low_f,
    snow_24h_in: snow,
    rain_24h_in: 0,
    precip_24h_in: snow != null ? snow * 0.1 : 0,
    wind_mph_avg: weather.wind_mph_avg,
  });
  return rows;
}

function toSurfaceForecast(d: ForecastDay): SurfaceForecastDay {
  return {
    date: d.date,
    temp_high_f: d.temp_high_f,
    temp_low_f: d.temp_low_f,
    snow_in: d.snow_in,
    precip_chance: d.precip_chance,
    conditions_short: d.conditions_short,
    wind_short: d.wind_short,
    rain_in: null,
    precip_in: typeof d.qpf_in === "number" ? d.qpf_in : null,
  };
}

type Blackout = { value: boolean | null; products: string[] };

/** Definitive with a product; with families only, true when every product
 *  of a held family is blacked out here today, null (with the products
 *  named) when only some are, so the copy can say "check which you hold". */
function blackoutToday(slug: string, pass: PassContext, todayISO: string): Blackout {
  if (!pass) return { value: null, products: [] };
  if (pass.product) {
    return { value: isBlackedOut(slug, pass.product, todayISO), products: [pass.product] };
  }
  const families = pass.families ?? [];
  if (families.length === 0) return { value: null, products: [] };
  const blocked: string[] = [];
  let sawEntry = false;
  let allBlocked = true;
  let anyUnknown = false;
  for (const family of families) {
    for (const entry of getFamilyAccess(slug, family)) {
      sawEntry = true;
      const r = isBlackedOutFor(entry, todayISO);
      if (r === true) blocked.push(entry.product);
      else if (r === null) anyUnknown = true;
      if (r !== true) allBlocked = false;
    }
  }
  if (!sawEntry) return { value: null, products: [] };
  if (allBlocked) return { value: true, products: blocked };
  if (blocked.length > 0 || anyUnknown) return { value: null, products: blocked };
  return { value: false, products: [] };
}

function windContext(resort: VerdictResort) {
  const mix = liftMixFromTypes(resort.lift_types as Record<string, number | null | undefined> | null | undefined);
  return {
    wind_hold_mph_chair: resort.wind_hold_mph_chair ?? null,
    wind_hold_mph_gondola: resort.wind_hold_mph_gondola ?? null,
    hasGondolaOrTram: mix != null && mix.gondolas + mix.trams > 0,
    liftMix: mix,
  };
}

// ---------- The verdict ----------

export function verdict(
  resort: VerdictResort,
  weather: VerdictWeather | null,
  pass: PassContext = null,
  opts: VerdictOptions = {},
): Verdict {
  const now = opts.now ?? new Date();
  const tz = timeZoneForResort({
    slug: resort.slug,
    state: resort.state,
    latitude: resort.latitude,
    longitude: resort.longitude,
  });
  const todayISO = localDate(now, tz);
  const season = resolveSeasonInfo(resort, now);
  const status = deriveResortStatus(resort, season, now);
  const opensInDays = status.kind === "opens" ? season.daysUntilOpen : null;

  const base = {
    status,
    opensInDays,
    todayISO,
    timeZone: tz,
    newSnow: null,
    forecastSnowToday: null,
    surface: null,
    windHold: null,
    crowd: null,
    blackout: null,
    stale: false,
    labels: [] as VerdictLabel[],
  };

  // 1. Not running as far as we know: the status is the answer. A "Go"
  //    for a closed hill is the bug the audit found everywhere.
  if (status.dormant) {
    let headline = status.label;
    let reason: string;
    switch (status.kind) {
      case "closed-permanent":
        reason = "This resort has closed for good.";
        break;
      case "closed-season":
        reason = "The season is over here, so there is nothing to ski today.";
        break;
      case "opens":
        headline =
          opensInDays != null && opensInDays >= 0 && opensInDays <= 365
            ? opensInDays === 0
              ? "Opens today"
              : `Opens in ${plural(opensInDays, "day")}`
            : status.label;
        reason = `Lifts are not running yet. ${status.label}${
          season.openProjected ? " (projected, not announced)" : ""
        }. Verdicts start when they spin.`;
        break;
      default:
        reason = "Off-season. Verdicts start when the lifts spin.";
    }
    return {
      ...base,
      verdict: "skip",
      headline,
      reasons: [reason],
      confidence: "high",
      dormant: true,
    };
  }

  // 2. Nobody can confirm the lifts: say so, do not guess.
  if (status.kind === "unknown") {
    return {
      ...base,
      verdict: "unknown",
      headline: "Check resort",
      reasons: ["We cannot confirm the lifts are running today. Check the resort's own report before you drive."],
      confidence: "low",
      dormant: false,
    };
  }

  // 3. Running (open / limited / likely-open). Gather the evidence.
  const labels: VerdictLabel[] = [];
  const reasons: string[] = [];

  const stale = weather == null || !isFresh(weather.fetched_at, now, WEATHER_STALE_HOURS);
  const fetchedAt = weather?.fetched_at ?? null;
  const v2 = weather && isForecastJsonV2(weather.forecast_json) ? weather.forecast_json : null;
  const days = weather ? forecastDaysFrom(weather.forecast_json) : [];
  const today = days.find((d) => d.date === todayISO) ?? null;
  const hours = v2 ? todaysHours(Array.isArray(v2.hourly) ? v2.hourly : [], todayISO, tz) : [];
  const dayHours = hours.filter((h) => h.hour >= DAY_START_H && h.hour <= DAY_END_H);

  // New snow, in order of trust: the resort's own report, the measured
  // analysis, then today's forecast. Each keeps its own clock.
  const reportFresh = isFresh(resort.snow_report_updated_at, now, WEATHER_STALE_HOURS);
  const resortSnow = num(resort.snow_new_24h_in);
  const measured = v2?.measured ?? null;
  const analysisSnow = measured?.sfav2_24h_in ?? null;
  const analysisFresh = isFresh(measured?.sfav2_valid_end, now, WEATHER_STALE_HOURS);
  let newSnow: Verdict["newSnow"] = null;
  if (resortSnow != null && reportFresh && resort.snow_report_status === "reported") {
    newSnow = { inches: resortSnow, source: "Reported", at: resort.snow_report_updated_at ?? null };
  } else if (analysisSnow != null && analysisFresh) {
    newSnow = { inches: analysisSnow, source: "Measured", at: measured?.sfav2_valid_end ?? null };
  } else if (resortSnow != null && reportFresh) {
    newSnow = { inches: resortSnow, source: "Measured", at: resort.snow_report_updated_at ?? null };
  }
  const forecastSnowToday = stale ? null : (today?.snow_in ?? num(weather?.snow_24h_in ?? null));
  if (newSnow == null && forecastSnowToday != null) {
    newSnow = { inches: forecastSnowToday, source: "Forecast", at: fetchedAt };
  }
  if (newSnow) labels.push({ text: `${inches(newSnow.inches)} new snow`, source: newSnow.source, at: newSnow.at });
  const newIn = newSnow?.inches ?? 0;

  // Crowd is a calendar estimate and works even without weather.
  const lat = num(resort.latitude);
  const lng = num(resort.longitude);
  const crowd = crowdForecast(
    {
      latitude: lat,
      longitude: lng,
      tier: resort.tier ?? null,
      vertical_drop: resort.vertical_drop ?? null,
      snow_new_24h_in: newSnow && newSnow.source !== "Forecast" ? newSnow.inches : null,
      snow_new_48h_in: resort.snow_new_48h_in ?? null,
      slug: resort.slug,
      state: resort.state ?? null,
    },
    now,
  );

  // Pass blackout: definitive with a product, a warning with families.
  const blackout = blackoutToday(resort.slug, pass, todayISO);
  // The pass table is verified on a date, not at a time, so the date
  // rides in the text and `at` stays null rather than inventing a clock.
  if (blackout.value === true) {
    labels.push({
      text: `Blackout: ${blackout.products.join(", ")} (verified ${PASS_ACCESS_VERIFIED_ON})`,
      source: "Reported",
      at: null,
    });
  }

  // Stale weather: nothing below is trustworthy, so stop at "unknown".
  if (stale || !weather) {
    const age = hoursAgo(fetchedAt, now);
    if (blackout.value === true) {
      return {
        ...base,
        verdict: "skip",
        headline: "Skip: blackout day",
        reasons: [`Your ${blackout.products.join(" / ")} is blacked out here today.`],
        labels,
        confidence: "high",
        dormant: false,
        newSnow,
        crowd,
        blackout: true,
        stale: true,
      };
    }
    labels.push({ text: crowd.label, source: "Estimated", at: null });
    return {
      ...base,
      verdict: "unknown",
      headline: "Weather not synced",
      reasons: [
        age != null
          ? `Our last weather update here was ${plural(age, "hour")} ago, so we will not call it. Check the resort's report.`
          : "We have no weather for this mountain yet, so we will not call it. Check the resort's report.",
      ],
      labels,
      confidence: "low",
      dormant: false,
      newSnow,
      crowd,
      blackout: blackout.value,
      stale: true,
    };
  }

  // Temperatures (forecast for today, else the cache row).
  const hi = today?.temp_high_f ?? weather.temp_high_f;
  const lo = today?.temp_low_f ?? weather.temp_low_f;
  if (hi != null || lo != null) {
    labels.push({
      text: `${hi != null ? `${hi}°` : "—"} / ${lo != null ? `${lo}°F` : "—"}`,
      source: "Forecast",
      at: fetchedAt,
    });
  }

  // Wind: the ski-day gust peak from the hourly rows, else the daily
  // gust, else the cache row. Gusts are what close lifts.
  const gust = maxOf(dayHours.map((h) => h.gust_mph)) ?? today?.gust_mph ?? weather.wind_mph_gust;
  const sustained = maxOf(dayHours.map((h) => h.wind_mph)) ?? weather.wind_mph_avg;
  const windHold = evaluateWindHold({ sustained, gust }, windContext(resort));
  if (gust != null) labels.push({ text: `Gusts to ${Math.round(gust)} mph`, source: "Forecast", at: fetchedAt });
  else if (sustained != null) labels.push({ text: `Wind ${Math.round(sustained)} mph`, source: "Forecast", at: fetchedAt });

  // Rain and a refreeze: liquid today, then air cold enough to lock it.
  let rainIn = 0;
  let refreeze = false;
  if (hours.length > 0) {
    let lastRainIdx = -1;
    hours.forEach((h, i) => {
      const r = h.rain_in ?? 0;
      if (r > 0) {
        rainIn += r;
        lastRainIdx = i;
      }
    });
    if (rainIn >= RAIN_MIN_IN) {
      const after = minOf(hours.slice(lastRainIdx + 1).map((h) => h.temp_f));
      refreeze = (after != null && after <= REFREEZE_F) || (lo != null && lo <= REFREEZE_F - 2);
    }
  } else if (today && wordingLooksRainy(today.conditions_short, today.temp_high_f) && (today.precip_chance ?? 0) >= 50) {
    rainIn = typeof today.qpf_in === "number" && today.qpf_in > 0 ? today.qpf_in : 0.2;
    refreeze = lo != null && lo <= REFREEZE_F - 2;
  }
  const rain = rainIn >= RAIN_MIN_IN;
  if (rain) labels.push({ text: `${inches(rainIn)} rain`, source: "Forecast", at: fetchedAt });

  // Firm start that softens: cold at first chair, mild by lunch.
  const earlyMin = minOf(hours.filter((h) => h.hour >= 7 && h.hour <= 9).map((h) => h.temp_f));
  const middayMax = maxOf(hours.filter((h) => h.hour >= 11 && h.hour <= 14).map((h) => h.temp_f));
  const softens =
    hours.length > 0
      ? earlyMin != null && middayMax != null && earlyMin <= ICY_START_F && middayMax >= SOFTEN_F
      : lo != null && hi != null && lo <= ICY_START_F - 4 && hi >= SOFTEN_F + 2;

  // Surface class from the shared classifier; dormant results are
  // dropped, never rendered as a class.
  const history = surfaceHistory(opts.history ?? [], weather, todayISO);
  const ahead = days.filter((d) => d.date > todayISO).slice(0, 3).map(toSurfaceForecast);
  const liveSnowpack =
    status.kind === "open" ||
    status.kind === "limited" ||
    (resort.snow_base_depth_in ?? 0) > 0 ||
    (resort.lifts_open_today ?? 0) > 0;
  const report = buildSurfaceReport(history, ahead, {
    baseDepthIn: resort.snow_base_depth_in ?? null,
    hasSnowpack: liveSnowpack ? true : null,
    inSeason: season.status === "in-season",
    isOpen: true,
    offSeason: false,
    lastObservedAt: fetchedAt,
    now,
  });
  const surface = report.dormant
    ? null
    : { code: report.today.code, label: report.today.label, confidence: report.today.confidence };
  if (surface) {
    labels.push({ text: `${surface.label} · ${surface.confidence} confidence`, source: "Estimated", at: fetchedAt });
  }
  labels.push({ text: crowd.label, source: "Estimated", at: null });

  // Confidence: live open flag + a measured number + a confident class.
  let points = status.kind === "open" ? 2 : status.kind === "limited" ? 1 : 0;
  if (newSnow && newSnow.source !== "Forecast") points += 1;
  if (surface?.confidence === "high") points += 1;
  else if (surface?.confidence === "medium") points += 0.5;
  if (hours.length > 0) points += 0.5;
  const confidence: Verdict["confidence"] = points >= 3.5 ? "high" : points >= 2 ? "medium" : "low";

  const snowLine = newSnow
    ? `${inches(newSnow.inches)} of new snow (${newSnow.source.toLowerCase()}).`
    : "No new snow reported.";
  const firmLabel = surface && (surface.code === "IP" || surface.code === "FG") ? surface.label : null;

  let kind: VerdictKind;
  let headline: string;
  if (blackout.value === true) {
    kind = "skip";
    headline = "Skip: blackout day";
    reasons.push(`Your ${blackout.products.join(" / ")} is blacked out here today.`);
  } else if (rain && refreeze) {
    kind = "skip";
    headline = "Skip: rain, then a freeze";
    reasons.push("Rain today with the air dropping below freezing afterwards turns the snow to ice, not powder.");
  } else if (windHold.level === "high-risk") {
    kind = "skip";
    headline = "Skip: lifts may close";
    reasons.push(
      `${windHold.detail.charAt(0).toUpperCase()}${windHold.detail.slice(1)} is above this mountain's lift-hold line, so upper lifts may not run.`,
    );
  } else if (windHold.level === "warning") {
    kind = "wait";
    headline = "Wait: wind holds likely";
    reasons.push(`${windHold.detail.charAt(0).toUpperCase()}${windHold.detail.slice(1)} could put chairs on hold. Check the lift status before you drive.`);
  } else if (rain) {
    kind = "wait";
    headline = "Wait: rain today";
    reasons.push("Rain is in today's forecast, so expect wet, heavy snow. A better day is coming.");
  } else if (softens && newIn < 2) {
    kind = "wait";
    headline = "Wait: icy early, softens by 11";
    reasons.push("Cold at first chair and mild by lunch: let the sun soften it and ride from late morning.");
  } else if (firmLabel && newIn < 1) {
    kind = "wait";
    headline = "Wait: firm and icy";
    reasons.push(`The surface reads ${firmLabel.toLowerCase()} today. Sharp edges and lower expectations, or wait for new snow.`);
  } else if (status.kind === "limited" && newIn < 3) {
    kind = "wait";
    headline = "Wait: limited lifts";
    reasons.push("Only some lifts are running. Check the lift list before you commit to the drive.");
  } else {
    kind = "go";
    if (newIn >= POWDER_IN) {
      headline = "Go: powder day";
      reasons.push(`${snowLine} Get there for first chair.`);
    } else if (newIn >= 2) {
      headline = "Go: fresh snow";
      reasons.push(`${snowLine} Soft turns, especially early.`);
    } else if (surface && (surface.code === "PP" || surface.code === "PPC" || surface.code === "MG")) {
      headline = "Go: good surface";
      reasons.push(`${surface.label} with ${surface.confidence} confidence. ${snowLine}`);
    } else {
      headline = "Go";
      reasons.push(`Lifts are running and nothing in the weather says stay home. ${snowLine}`);
    }
  }

  // Secondary context a beginner can act on.
  if (blackout.value == null && blackout.products.length > 0) {
    reasons.push(`Blackout today on ${blackout.products.join(", ")}. Check which pass you hold.`);
  }
  if (kind !== "skip" && crowd.level === "packed") reasons.push(`Expect crowds (${crowd.reasons.join(", ")}). Park early.`);
  if (status.kind === "likely-open") {
    reasons.push("Open by its season dates; no live lift report yet, so confirm with the resort.");
  }

  return {
    ...base,
    verdict: kind,
    headline,
    reasons,
    labels,
    confidence,
    dormant: false,
    newSnow,
    forecastSnowToday,
    surface,
    windHold,
    crowd,
    blackout: blackout.value,
    stale: false,
  };
}

/** True when any of these verdicts crosses the powder line, measured
 *  or forecast, so the page can shout once instead of per row. */
export function isPowderDay(v: Verdict): boolean {
  if (v.dormant) return false;
  const measured = v.newSnow && v.newSnow.source !== "Forecast" ? v.newSnow.inches : 0;
  return measured >= POWDER_IN || (v.forecastSnowToday ?? 0) >= POWDER_IN;
}
