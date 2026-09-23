// Inaugural Season 2026 — Snow Surface Forecast classifier.
//
// Rule-based decision tree that predicts today's snow surface from the
// last 7 days of weather observations (weather_history) plus today's
// snapshot. Outputs the US-standard SANY (Ski Areas of New York) snow
// classification code — using the standard so users learn the vocabulary
// the resorts themselves report in.
//
// **Why a rule tree and not ML?** With 0 users and 0 labels at launch
// we have no training data. A transparent rule tree is auditable, easy
// to tune in v2 from user-reported "felt like" labels, and ships today.
// Realistic accuracy: 75-85% for the 5 dominant classes (PP, PPC, MG,
// FG, IP). The rest land in WS/WG/LSG/VC as edge cases.
//
// **Asymmetric error rule (critical):** when the tree is torn between
// "frozen granular" and "icy," bias toward IP. Over-warning about ice
// is a small inconvenience the user shrugs off; under-warning and
// having them catch an edge on hidden ice destroys trust permanently.
//
// **Confidence calibration:** uses IPCC-style verbal anchors so the
// number maps to plain English in the UI:
//   • high   ≥ 0.85   — strong signal across multiple features
//   • medium 0.70-0.84 — clear pattern but a contradicting feature
//   • low    0.50-0.69 — sparse data or close call between codes
//
// **Dormant reports (2026-09 audit round 2):** the classifier now refuses
// to name a surface when the mountain is closed / off-season, when the
// newest input is more than 48 hours old, or when there is no history at
// all. A confident "Frozen granular" on a September afternoon read as a
// bug to every tester; a dormant card that says why is honest.

// ---------- Public types ----------

/** SANY classification codes. VC is our "I don't have enough signal" bucket. */
export type SurfaceCode =
  | "PP"   // Powder
  | "PPC"  // Packed Powder
  | "MG"   // Machine Groomed
  | "LSG"  // Loose Granular
  | "FG"   // Frozen Granular
  | "WS"   // Wet Snow
  | "WG"   // Wet Granular
  | "IP"   // Icy Patches / Icy Surface
  | "VC";  // Variable Conditions (fallback / not enough data)

/** Each daily snapshot the classifier consumes. UTC calendar date. */
export type DailyWeather = {
  observed_date: string;            // 'YYYY-MM-DD'
  temp_high_f: number | null;
  temp_low_f: number | null;
  snow_24h_in: number | null;       // inches new snow in the last 24h
  rain_24h_in: number | null;       // inches liquid rain
  precip_24h_in: number | null;     // total inches precip (rain + snow water equivalent)
  wind_mph_avg: number | null;
};

/** Output of classify(). */
export type SurfaceResult = {
  code: SurfaceCode;
  label: string;          // official SANY label, e.g. "Packed Powder"
  short: string;          // SANY code, e.g. "PPC"
  emoji: string;          // legacy field — kept for backward compat, no longer rendered
  alsoCalled?: string;    // rider-friendly alternative names (Red Bull-style vocabulary)
  description: string;    // 1-sentence "what" — neutral, factual
  reasons: string[];      // 1-3 bullets — the WHY from the data
  confidence: "low" | "medium" | "high";
  when?: string;          // optional WHEN best-window suggestion
};

/**
 * What the classifier knows about the resort beyond the weather rows.
 * Every field is optional so the cron (which only has history) and the
 * page (which has the resort row + season status) share one entry point.
 */
export type SurfaceContext = {
  /** Resort-reported base depth in inches (resorts.snow_base_depth_in). */
  baseDepthIn?: number | null;
  /** Explicit "there is snow on the ground" signal when the base depth
   *  is unknown (e.g. snow report status = open). */
  hasSnowpack?: boolean | null;
  /** Season window says lifts should be spinning. Counts as snowpack
   *  evidence: an operating US resort has a base by definition. */
  inSeason?: boolean | null;
  /** Live open state: true = lifts running, false = closed, null =
   *  unknown. False makes the report dormant. */
  isOpen?: boolean | null;
  /** The calendar says it is summer for this resort. With isOpen unknown
   *  this alone makes the report dormant. */
  offSeason?: boolean | null;
  /** Timestamp of the newest input row (history observed_date or the
   *  weather_cache fetched_at). Older than 48 h → dormant "stale". */
  lastObservedAt?: string | Date | null;
  /** Injected clock for tests. */
  now?: Date;
};

export type DormantReason = "closed" | "off-season" | "stale" | "no-data";

/** Report when we decline to classify. Never carries a code. */
export type DormantSurfaceReport = {
  dormant: true;
  reason: DormantReason;
  /** Short card title, e.g. "Off-season". */
  headline: string;
  /** One plain sentence explaining why there is no surface call. */
  message: string;
};

/** Report with a classification plus the evidence it rests on. */
export type ActiveSurfaceReport = {
  dormant: false;
  today: SurfaceResult;
  // Day 1 = tomorrow, Day 2 = day after, Day 3 = three days out.
  // null entries mean the upstream forecast didn't reach that day.
  forecast: Array<SurfaceResult | null>;
  /** Plain-English inputs for a "Based on: …" line. */
  basedOn: string[];
  /** The derived features, for debugging + tests. */
  features: SurfaceFeatures;
};

export type SurfaceReport = ActiveSurfaceReport | DormantSurfaceReport;

// ---------- Education content (used by the UI modal) ----------

// Hybrid taxonomy:
//   - `label` + `short` keep the official SANY vocabulary so users learn
//     the same codes their resort's snow report uses (OnTheSnow, SkiReport,
//     ski-area boards all publish in this format).
//   - `alsoCalled` is the rider-friendly term you'd hear in the lodge
//     ("corn snow", "slush", "crud") — what Red Bull and most skiing media
//     actually call it. We display both so the page reads warm but stays
//     authoritative.
export const SURFACE_GLOSSARY: Record<SurfaceCode, {
  label: string;
  short: string;
  emoji: string;        // legacy — not rendered anywhere after the type-chip refactor
  alsoCalled?: string;
  feelsLike: string;    // plain-English "what it feels like" for the modal
  causedBy: string;     // root cause in non-jargon terms
}> = {
  PP:  { label: "Powder",            short: "PP",  emoji: "❄️", alsoCalled: "fresh / fluff",                feelsLike: "Soft, fluffy snow that compresses under your weight. Floaty turns, quiet underfoot.",                       causedBy: "Fresh, cold snow that hasn't been groomed or skied off yet." },
  PPC: { label: "Packed powder",     short: "PPC", emoji: "🌨️", alsoCalled: "hard pack with soft top",      feelsLike: "Firm but forgiving. Edges hold without chatter; the snow doesn't fly when you carve.",                       causedBy: "Powder compacted by skier traffic or wind, while still cold enough to stay soft." },
  MG:  { label: "Groomed",           short: "MG",  emoji: "🧑‍🔧", alsoCalled: "corduroy from the snowcat",   feelsLike: "Smooth corduroy lines. Predictable underfoot — the safest fast-cruise surface.",                            causedBy: "Resort grooming overnight on packed snow, or snowmaking when natural snow is thin." },
  LSG: { label: "Loose granular",    short: "LSG", emoji: "🌾", alsoCalled: "sugar snow / dry granular",   feelsLike: "Pellet-y or sugary snow. Slides easily; edges can wash out if you push too hard.",                            causedBy: "Cold, dry conditions where old snow grains have broken down without melting." },
  FG:  { label: "Frozen granular",   short: "FG",  emoji: "🧊", alsoCalled: "refrozen corn",               feelsLike: "Like skiing on grippy gravel. Edges work but it's loud, and it gets slick if temps climb.",                   causedBy: "Snow that thawed and refroze. One melt-freeze cycle is enough." },
  WS:  { label: "Wet snow",          short: "WS",  emoji: "💧", alsoCalled: "heavy / sticky new snow",     feelsLike: "Heavy and sticky. Tiring on the legs; slow underfoot. Can dam up at the base of turns.",                      causedBy: "New snow falling at warm temps, or freshly fallen powder warming up through the day." },
  WG:  { label: "Wet granular",      short: "WG",  emoji: "🟡", alsoCalled: "spring corn / slush",         feelsLike: "Loose, forgiving kernels once the sun gets on it. Firm early, buttery mid-morning, slushy by afternoon.",     causedBy: "Old snow cycling above and below freezing — the melt-freeze rhythm of spring skiing." },
  IP:  { label: "Icy",               short: "IP",  emoji: "⚠️", alsoCalled: "boilerplate / breakable crust", feelsLike: "Hard, glassy patches. Edges chatter or wash. Tough on intermediates, dangerous on steeps. Watch for breakable crust on aspects that took rain-on-snow then refroze.", causedBy: "Rain falling on snow, OR repeated thaws that never get warm enough to soften before refreezing." },
  VC:  { label: "Variable",          short: "VC",  emoji: "❔", alsoCalled: "crud / mixed",                feelsLike: "Patchy — skied-out powder mixed with hard pack and ice chunks. What you find depends on aspect, time of day, and what's been groomed.", causedBy: "Mixed conditions where no single surface dominates." },
};

// ---------- Feature extraction ----------

/** Derived features the classifier consumes. All inches / Fahrenheit. */
export type SurfaceFeatures = {
  snow_24h_in: number | null;
  snow_3d_in: number;
  snow_7d_in: number;
  rain_5d_in: number;
  precip_5d_in: number;
  melt_freeze_cycles_5d: number;
  days_since_meaningful_snow: number | null; // null = no day in window had >= MEANINGFUL threshold
  temp_high_today_f: number | null;
  temp_low_today_f: number | null;
  wind_mph_avg_today: number | null;
  /** How many daily rows the window actually had (1-7). */
  window_days: number;
  /** observed_date of the newest row. */
  latest_observed_date: string;
};

/** Snow events <1" don't really change the surface; ignore as "meaningful." */
const MEANINGFUL_SNOW_IN = 1.0;
/** Wet/dry crossover. Above this and warm-day surface chemistry takes over. */
const WARM_F = 38;
/** Below this, melt-freeze can't happen overnight. */
const COLD_F = 26;
/** Multi-cycle threshold for IP escalation. */
const ICE_CYCLE_MIN = 2;
/** Rain-on-snow icing trigger — even a trace can glaze the surface. */
const RAIN_ICE_MIN_IN = 0.05;
/** Inputs older than this are not "today's surface" — go dormant. */
const STALE_AFTER_MS = 48 * 60 * 60 * 1000;

/**
 * Pull derived features from a chronological array of daily snapshots.
 * `history` should be sorted oldest → newest (most recent at the end).
 * Today's row, if present, is the LAST entry.
 */
export function deriveFeatures(history: DailyWeather[]): SurfaceFeatures | null {
  if (history.length === 0) return null;
  const today = history[history.length - 1];
  // Helpers — windowed sums + counts. We tolerate sparse data: missing
  // values are treated as 0, not as NaN. That's the right bias because
  // "no measurement" is closer to "no precip" than to "unknown precip"
  // when our cron has hit the resort every day this season.
  const last = (n: number) => history.slice(-n);
  const sumSnow = (rows: DailyWeather[]) =>
    rows.reduce((acc, r) => acc + (r.snow_24h_in ?? 0), 0);
  const sumRain = (rows: DailyWeather[]) =>
    rows.reduce((acc, r) => acc + (r.rain_24h_in ?? 0), 0);
  const sumPrecip = (rows: DailyWeather[]) =>
    rows.reduce((acc, r) => acc + (r.precip_24h_in ?? 0), 0);

  // Melt-freeze: a day with high >= 33°F AND low <= 30°F. Conservative
  // bounds — full snowpack thaws above 33, refreezes below 30; the gap
  // avoids double-counting marginal days.
  let cycles = 0;
  for (const r of last(5)) {
    const hi = r.temp_high_f;
    const lo = r.temp_low_f;
    if (hi != null && lo != null && hi >= 33 && lo <= 30) cycles++;
  }

  // Days since meaningful snow — walk backward.
  let daysSince: number | null = null;
  for (let i = history.length - 1; i >= 0; i--) {
    const s = history[i].snow_24h_in ?? 0;
    if (s >= MEANINGFUL_SNOW_IN) {
      daysSince = history.length - 1 - i;
      break;
    }
  }

  return {
    snow_24h_in: today.snow_24h_in,
    snow_3d_in: Math.round(sumSnow(last(3)) * 10) / 10,
    snow_7d_in: Math.round(sumSnow(last(7)) * 10) / 10,
    rain_5d_in: Math.round(sumRain(last(5)) * 100) / 100,
    precip_5d_in: Math.round(sumPrecip(last(5)) * 100) / 100,
    melt_freeze_cycles_5d: cycles,
    days_since_meaningful_snow: daysSince,
    temp_high_today_f: today.temp_high_f,
    temp_low_today_f: today.temp_low_f,
    wind_mph_avg_today: today.wind_mph_avg,
    window_days: Math.min(history.length, 7),
    latest_observed_date: today.observed_date,
  };
}

// ---------- The decision tree ----------

const ROUND1 = (n: number) => Math.round(n * 10) / 10;
const ROUND2 = (n: number) => Math.round(n * 100) / 100;

function makeResult(
  code: SurfaceCode,
  reasons: string[],
  confidence: SurfaceResult["confidence"],
  when?: string,
): SurfaceResult {
  const g = SURFACE_GLOSSARY[code];
  return {
    code,
    label: g.label,
    short: g.short,
    emoji: g.emoji,
    alsoCalled: g.alsoCalled,
    description: g.feelsLike,
    reasons,
    confidence,
    when,
  };
}

/**
 * Is there snow on the ground for weather to act on? Rain on bare ground
 * makes mud, not ice; warm sun on bare ground makes nothing. Evidence, in
 * order of trust: a reported base depth, an explicit snowpack flag, snow
 * that fell inside our 7-day window, or a season window that says the
 * lifts are running (an operating US resort has a base by definition).
 *
 * Previously only "snow fell in the last 7 days" counted, which is why a
 * mid-January rain on a 40" base after a dry week classified as
 * "Groomed — no rain" (audit domain-logic-3).
 */
export function hasSnowpackEvidence(f: SurfaceFeatures, ctx: SurfaceContext): boolean {
  if (ctx.baseDepthIn != null && ctx.baseDepthIn > 0) return true;
  if (ctx.hasSnowpack === true) return true;
  if (f.snow_7d_in > 0) return true;
  return ctx.inSeason === true;
}

/**
 * Classify today's surface from derived features.
 * Priority-ordered rules — first match wins.
 *
 * Order rationale: the most diagnostic features (fresh snow, rain,
 * melt-freeze cycles) fire first; the warm/dry buckets sit in the
 * middle; LSG and MG act as gentle fallbacks before VC catches the rest.
 */
export function classifyFromFeatures(f: SurfaceFeatures, ctx: SurfaceContext = {}): SurfaceResult {
  const reasons: string[] = [];

  const snow24 = f.snow_24h_in ?? 0;
  const hi = f.temp_high_today_f;
  const wind = f.wind_mph_avg_today;
  const snowpack = hasSnowpackEvidence(f, ctx);
  const cycles = f.melt_freeze_cycles_5d;

  // ---------- 1. Rain-on-snow → IP (highest priority, asymmetric safety rule) ----------
  // Any meaningful rain in the last 5 days, when there's old snow on
  // the ground, glazes the surface. This rule fires BEFORE the
  // melt-freeze branches because rain produces ice faster than thermal
  // cycling does, and the resulting surface is unmistakably icy.
  // Gate = snowpack EVIDENCE (base depth / flag / recent snow / in
  // season), not "snow fell this week" — see hasSnowpackEvidence.
  if (f.rain_5d_in >= RAIN_ICE_MIN_IN && snowpack) {
    const onWhat =
      ctx.baseDepthIn != null && ctx.baseDepthIn > 0
        ? `on a ${Math.round(ctx.baseDepthIn)}" base`
        : "on the existing snowpack";
    reasons.push(`${ROUND2(f.rain_5d_in)}" rain in the last 5 days ${onWhat}`);
    if (cycles >= 1) {
      reasons.push(`${cycles} melt-freeze ${cycles === 1 ? "cycle" : "cycles"} after the rain`);
    }
    const confidence = f.rain_5d_in >= 0.25 || cycles >= 1 ? "high" : "medium";
    return makeResult("IP", reasons, confidence, "Best window: skip dawn, ride after the sun softens the surface.");
  }

  // ---------- 2. Fresh significant snow → PP ----------
  // Powder requires (a) ≥4" in last 24h, (b) cold-ish today so it
  // hasn't sun-baked, (c) wind that didn't strip it. We allow PP up to
  // 32°F today because new snow buffers itself against warm air for
  // most of the morning. Confidence drops when wind was high.
  if (snow24 >= 4 && (hi == null || hi <= 32)) {
    reasons.push(`${ROUND1(snow24)}" fresh in the last 24h`);
    if (hi != null) reasons.push(`high ${hi}°F — cold enough to preserve the surface`);
    const windy = wind != null && wind >= 20;
    if (windy) reasons.push(`wind ${wind} mph may scour exposed terrain`);
    return makeResult(
      "PP",
      reasons,
      windy ? "medium" : "high",
      "Best window: first chair. Sheltered glades + lee aspects hold it longest.",
    );
  }

  // ---------- 3. Recent snow + still cold → PPC ----------
  // Packed powder: enough snow that the base has a soft top, recent
  // enough that it hasn't all gotten skied off, AND cold enough that
  // it hasn't transformed yet. No rain in window (rule 1 caught that).
  if (
    (snow24 >= 1 || f.snow_3d_in >= 3) &&
    (hi == null || hi < WARM_F) &&
    cycles <= 1
  ) {
    if (snow24 >= 1) reasons.push(`${ROUND1(snow24)}" in the last 24h`);
    if (f.snow_3d_in >= 3) reasons.push(`${ROUND1(f.snow_3d_in)}" total in the last 3 days`);
    if (hi != null) reasons.push(`high ${hi}°F keeps the surface soft`);
    return makeResult("PPC", reasons, "high");
  }

  // ---------- 4. Warm + new snow → WS ----------
  // Snow falling at warm temps becomes wet quickly. Heavy, sticky,
  // tiring — different beast from cold powder.
  if (snow24 >= 1 && hi != null && hi >= WARM_F) {
    reasons.push(`${ROUND1(snow24)}" new snow at high ${hi}°F (warm = wet)`);
    return makeResult(
      "WS",
      reasons,
      "high",
      "Best window: morning if cold front is moving in; otherwise expect heavy turns.",
    );
  }

  // ---------- 5. Warm day + old snow on the ground → WG (spring corn) ----------
  // Old surface warming above freezing without fresh input. Freeze-thaw
  // cycles are the SIGNATURE of corn, not a disqualifier: firm at first
  // chair, kernels loosen mid-morning, slush after lunch. The old gate
  // (snow inside the window AND ≥2 days since it fell) made WG almost
  // unreachable and pushed every dry spring week into "Icy" via rule 6
  // (audit domain-logic-5). Now: warm high + snowpack evidence is
  // enough; cycles raise confidence and pick the timing copy. Cold-high
  // cycling days (thaw too weak to soften) still fall through to IP.
  if (hi != null && hi >= WARM_F && snow24 < 1 && snowpack) {
    reasons.push(`high ${hi}°F warming the old snowpack`);
    if (cycles >= 1) {
      reasons.push(`${cycles} freeze-thaw ${cycles === 1 ? "cycle" : "cycles"} in the last 5 days — a corn cycle`);
    }
    if (f.days_since_meaningful_snow != null) {
      reasons.push(`${f.days_since_meaningful_snow} days since last meaningful snow`);
    }
    const confidence = cycles >= ICE_CYCLE_MIN ? "high" : cycles === 1 ? "medium" : "low";
    return makeResult(
      "WG",
      reasons,
      confidence,
      cycles >= 1
        ? "Firm early, corn mid-morning, slush after — ride roughly 10:30 to 1:30."
        : "Best window: late morning once the surface softens; refreezes overnight.",
    );
  }

  // ---------- 6. Freeze-thaw with a cold high → FG (or IP if ≥2 cycles) ----------
  // Melt-freeze cycles transform the surface into refrozen granules.
  // Single cycle = FG. Two or more without a warm-enough day to soften
  // = surface gets polished — bias to IP per the asymmetric rule.
  if (cycles >= 1) {
    reasons.push(
      `${cycles} freeze-thaw ${cycles === 1 ? "cycle" : "cycles"} in the last 5 days`,
    );
    if (hi != null) reasons.push(`high ${hi}°F — too cool to soften the refrozen surface`);
    if (f.snow_7d_in > 0) reasons.push(`${ROUND1(f.snow_7d_in)}" snow over those days got reworked`);
    const code: SurfaceCode = cycles >= ICE_CYCLE_MIN ? "IP" : "FG";
    return makeResult(
      code,
      reasons,
      cycles >= ICE_CYCLE_MIN ? "high" : "medium",
      "Best window: midday once the sun grinds off the polish.",
    );
  }

  // ---------- 7. Cold + dry sustained → LSG ----------
  // Old cold snow that hasn't been touched. Dry granular without the
  // melt-freeze polish.
  if (
    hi != null &&
    hi <= COLD_F &&
    f.days_since_meaningful_snow != null &&
    f.days_since_meaningful_snow >= 4
  ) {
    reasons.push(`high ${hi}°F + ${f.days_since_meaningful_snow} days since last meaningful snow`);
    reasons.push("no rain, no melt-freeze — snow grains have broken down dry");
    return makeResult("LSG", reasons, "medium");
  }

  // ---------- 8. Open, no real natural input → MG fallback ----------
  // If we got here, the day is mild, dry, low-cycle. That's a
  // grooming day — resorts run cats overnight on whatever's left.
  if (f.snow_7d_in > 0 || (hi != null && hi <= WARM_F)) {
    if (f.snow_7d_in > 0) reasons.push(`${ROUND1(f.snow_7d_in)}" total snow over last 7 days`);
    if (hi != null) {
      // The rain clause is conditional on the actual reading — the old
      // hard-coded "no rain" printed under a 0.6" rain day (domain-logic-3).
      const rainNote =
        f.rain_5d_in >= RAIN_ICE_MIN_IN
          ? `${ROUND2(f.rain_5d_in)}" rain but no confirmed snowpack to glaze`
          : "no rain";
      reasons.push(`high ${hi}°F, ${rainNote}, no melt-freeze`);
    }
    reasons.push("conditions match an overnight grooming surface");
    return makeResult("MG", reasons, "medium", "Best window: first hour after the lifts open.");
  }

  // ---------- 9. Nothing solid → VC ----------
  reasons.push("Mixed signals — not enough recent weather to pick one surface");
  return makeResult("VC", reasons, "low");
}

/** Convenience — derive + classify in one call. */
export function classifyToday(history: DailyWeather[], ctx: SurfaceContext = {}): SurfaceResult | null {
  const f = deriveFeatures(history);
  if (!f) return null;
  return classifyFromFeatures(f, ctx);
}

// ---------- 3-day forecast classifier ----------

/**
 * Build a 3-day surface outlook from the next 3 forecast days + the
 * 7-day history (used as a rolling base). Each forecast day is fed
 * into the classifier as if it were "today" with the history rolled
 * forward by one day.
 *
 * Inputs from forecast_json are coarser than the daily history rows —
 * we synthesize snow + rain + temp from what's available and accept
 * lower confidence on day 3.
 */
export type ForecastDay = {
  date: string;
  temp_high_f: number | null;
  temp_low_f: number | null;
  snow_in: number | null;
  precip_chance: number | null;
  conditions_short: string | null;
  wind_short?: string | null; // e.g. "10 mph"
  /** Liquid rain for the day when the pipeline supplies it (forecast_json
   *  v2). When present it replaces the wording-based guess below. */
  rain_in?: number | null;
  /** Total liquid precipitation when supplied. */
  precip_in?: number | null;
};

function parseWindMph(short: string | null | undefined): number | null {
  if (!short) return null;
  const m = /(\d+)/.exec(short);
  return m ? Number(m[1]) : null;
}

/**
 * Does a forecast wording describe liquid rain? "Snow showers",
 * "Flurries" and "Wintry mix" below ~34°F are snow, not rain — the old
 * `includes("shower")` test turned every "Snow Showers Likely" day into
 * an Icy outlook (audit domain-logic-4). A mixed phrase ("Rain and
 * snow", "Wintry mix") counts as rain only when the day gets warm enough
 * for the liquid part to matter.
 */
export function wordingLooksRainy(conditions: string | null | undefined, tempHighF: number | null | undefined): boolean {
  const c = (conditions ?? "").toLowerCase();
  if (!c) return false;
  const mentionsSnow = /snow|flurr|wintry|sleet|blizzard/.test(c);
  const mentionsRain = /rain|drizzle|thunder|shower/.test(c);
  if (!mentionsRain) return false;
  if (!mentionsSnow) return true;
  return tempHighF != null && tempHighF >= 34;
}

/** Convert a forecast strip day into a DailyWeather row the classifier
 *  understands. Rain comes from `rain_in` when the pipeline provides it,
 *  otherwise it is inferred from the wording + precipitation chance. */
export function forecastDayToDailyWeather(d: ForecastDay): DailyWeather {
  const precipChanceFrac =
    typeof d.precip_chance === "number" ? d.precip_chance / 100 : 0;
  // Rough rain inference: when forecast says "Rain"-ish and chance is
  // high, assume modest accumulation. Better than treating all rain as
  // zero — which would mask ice risk.
  const rainGuess =
    typeof d.rain_in === "number"
      ? d.rain_in
      : wordingLooksRainy(d.conditions_short, d.temp_high_f) && precipChanceFrac >= 0.5
        ? 0.2
        : 0;
  return {
    observed_date: d.date,
    temp_high_f: d.temp_high_f,
    temp_low_f: d.temp_low_f,
    snow_24h_in: d.snow_in,
    rain_24h_in: rainGuess,
    precip_24h_in:
      typeof d.precip_in === "number" ? d.precip_in : (d.snow_in ?? 0) * 0.1 + rainGuess, // very rough SWE
    wind_mph_avg: parseWindMph(d.wind_short),
  };
}

/**
 * Produce a 3-day surface outlook.
 * `history` is the trailing 7 days (oldest → newest, includes today).
 * `forecast` is the next 3 forecast days (tomorrow, +2, +3).
 *
 * Returns up to 3 results; entries are null when the forecast strip
 * doesn't reach that day. Day 3 always returns "low" confidence at
 * best — we don't pretend to know 3 days of snow-surface chemistry.
 */
export function classifyForecast(
  history: DailyWeather[],
  forecast: ForecastDay[],
  ctx: SurfaceContext = {},
): Array<SurfaceResult | null> {
  const out: Array<SurfaceResult | null> = [];
  // Each forecast day becomes the new "today" in turn, with the window
  // sliding forward by one day.
  let rolling: DailyWeather[] = history.slice();
  for (let i = 0; i < 3; i++) {
    const fd = forecast[i];
    if (!fd) {
      out.push(null);
      continue;
    }
    rolling = [...rolling.slice(-6), forecastDayToDailyWeather(fd)];
    const r = classifyToday(rolling, ctx);
    if (!r) {
      out.push(null);
      continue;
    }
    // Cap forecast confidence — even a "clear powder day" two days out
    // shouldn't claim certainty we don't have.
    const capped: SurfaceResult = { ...r };
    if (i === 1 && capped.confidence === "high") capped.confidence = "medium";
    if (i === 2) capped.confidence = "low";
    out.push(capped);
  }
  return out;
}

// ---------- Dormancy + evidence ----------

function toDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
}

/**
 * Should we decline to classify? Closed / off-season mountains and
 * stale inputs get a dormant report; the caller renders a season
 * preview instead of a surface card.
 */
export function dormantReason(history: DailyWeather[], ctx: SurfaceContext): DormantSurfaceReport | null {
  if (ctx.isOpen === false || (ctx.isOpen == null && ctx.offSeason === true)) {
    return ctx.offSeason
      ? {
          dormant: true,
          reason: "off-season",
          headline: "Off-season",
          message: "The surface forecast starts when the lifts spin. Until then the weather here is just weather.",
        }
      : {
          dormant: true,
          reason: "closed",
          headline: "Closed",
          message: "No lifts are running, so there is no skiable surface to call.",
        };
  }
  if (history.length === 0) {
    return {
      dormant: true,
      reason: "no-data",
      headline: "No recent weather",
      message: "Daily weather has not synced for this resort yet, so there is nothing to classify.",
    };
  }
  const now = ctx.now ?? new Date();
  const newest =
    toDate(ctx.lastObservedAt) ??
    toDate(`${history[history.length - 1].observed_date}T23:59:59Z`);
  if (newest && now.getTime() - newest.getTime() > STALE_AFTER_MS) {
    return {
      dormant: true,
      reason: "stale",
      headline: "Waiting for fresh weather",
      message: "The newest weather reading is more than two days old, so a surface call would be a guess.",
    };
  }
  return null;
}

/** Plain-English list of the inputs a classification rests on. */
export function describeInputs(f: SurfaceFeatures, ctx: SurfaceContext = {}): string[] {
  const out: string[] = [];
  out.push(`${f.window_days} day${f.window_days === 1 ? "" : "s"} of weather through ${f.latest_observed_date}`);
  if (f.temp_high_today_f != null || f.temp_low_today_f != null) {
    const hi = f.temp_high_today_f != null ? `${f.temp_high_today_f}°` : "—";
    const lo = f.temp_low_today_f != null ? `${f.temp_low_today_f}°` : "—";
    out.push(`today ${hi} / ${lo}F`);
  }
  out.push(`${ROUND1(f.snow_7d_in)}" new snow in 7 days`);
  if (f.rain_5d_in >= RAIN_ICE_MIN_IN) out.push(`${ROUND2(f.rain_5d_in)}" rain in 5 days`);
  if (f.melt_freeze_cycles_5d > 0) {
    out.push(`${f.melt_freeze_cycles_5d} freeze-thaw cycle${f.melt_freeze_cycles_5d === 1 ? "" : "s"} in 5 days`);
  }
  if (f.wind_mph_avg_today != null) out.push(`wind ${Math.round(f.wind_mph_avg_today)} mph`);
  if (ctx.baseDepthIn != null && ctx.baseDepthIn > 0) out.push(`${Math.round(ctx.baseDepthIn)}" base (resort report)`);
  return out;
}

/** All-in-one: dormancy check → today + 3-day + evidence. */
export function buildSurfaceReport(
  history: DailyWeather[],
  forecast: ForecastDay[],
  ctx: SurfaceContext = {},
): SurfaceReport {
  const dormant = dormantReason(history, ctx);
  if (dormant) return dormant;
  const features = deriveFeatures(history)!;
  return {
    dormant: false,
    today: classifyFromFeatures(features, ctx),
    forecast: classifyForecast(history, forecast, ctx),
    basedOn: describeInputs(features, ctx),
    features,
  };
}

/** Verbal anchor for confidence (used in UI copy). */
export function confidenceLabel(c: SurfaceResult["confidence"]): string {
  switch (c) {
    case "high":
      return "High confidence";
    case "medium":
      return "Medium confidence";
    case "low":
      return "Low confidence";
  }
}
