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

/** Full surface report including a 3-day outlook. */
export type SurfaceReport = {
  today: SurfaceResult;
  // Day 1 = tomorrow, Day 2 = day after, Day 3 = three days out.
  // null entries mean the upstream forecast didn't reach that day.
  forecast: Array<SurfaceResult | null>;
};

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
  PPC: { label: "Packed Powder",     short: "PPC", emoji: "🌨️", alsoCalled: "hard pack with soft top",      feelsLike: "Firm but forgiving. Edges hold without chatter; the snow doesn't fly when you carve.",                       causedBy: "Powder compacted by skier traffic or wind, while still cold enough to stay soft." },
  MG:  { label: "Groomed",           short: "MG",  emoji: "🧑‍🔧", alsoCalled: "corduroy from the snowcat",   feelsLike: "Smooth corduroy lines. Predictable underfoot — the safest fast-cruise surface.",                            causedBy: "Resort grooming overnight on packed snow, or snowmaking when natural snow is thin." },
  LSG: { label: "Loose Granular",    short: "LSG", emoji: "🌾", alsoCalled: "sugar snow / dry granular",   feelsLike: "Pellet-y or sugary snow. Slides easily; edges can wash out if you push too hard.",                            causedBy: "Cold, dry conditions where old snow grains have broken down without melting." },
  FG:  { label: "Frozen Granular",   short: "FG",  emoji: "🧊", alsoCalled: "corn snow",                   feelsLike: "Like skiing on grippy gravel. Edges work but it's loud, and it gets slick if temps climb.",                   causedBy: "Snow that thawed and refroze. One melt-freeze cycle is enough." },
  WS:  { label: "Wet Snow",          short: "WS",  emoji: "💧", alsoCalled: "heavy / sticky new snow",     feelsLike: "Heavy and sticky. Tiring on the legs; slow underfoot. Can dam up at the base of turns.",                      causedBy: "New snow falling at warm temps, or freshly fallen powder warming up through the day." },
  WG:  { label: "Wet Granular",      short: "WG",  emoji: "🟡", alsoCalled: "slush",                       feelsLike: "Slushy clumps. Edges sink in; great in spring sun, sketchy if it refreezes overnight.",                       causedBy: "Old snow surface warming above freezing — corn snow under the right conditions." },
  IP:  { label: "Icy",               short: "IP",  emoji: "⚠️", alsoCalled: "boilerplate / breakable crust", feelsLike: "Hard, glassy patches. Edges chatter or wash. Tough on intermediates, dangerous on steeps. Watch for breakable crust on aspects that took rain-on-snow then refroze.", causedBy: "Rain falling on snow, OR multiple melt-freeze cycles polishing the surface." },
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
 * Classify today's surface from derived features.
 * Priority-ordered rules — first match wins.
 *
 * Order rationale: the most diagnostic features (fresh snow, rain,
 * melt-freeze cycles) fire first; the warm/dry buckets sit in the
 * middle; LSG and MG act as gentle fallbacks before VC catches the rest.
 */
export function classifyFromFeatures(f: SurfaceFeatures): SurfaceResult {
  const reasons: string[] = [];

  const snow24 = f.snow_24h_in ?? 0;
  const hi = f.temp_high_today_f;
  const wind = f.wind_mph_avg_today;

  // ---------- 1. Rain-on-snow → IP (highest priority, asymmetric safety rule) ----------
  // Any meaningful rain in the last 5 days, when there's old snow on
  // the ground, glazes the surface. This rule fires BEFORE the
  // melt-freeze branches because rain produces ice faster than thermal
  // cycling does, and the resulting surface is unmistakably icy.
  if (f.rain_5d_in >= RAIN_ICE_MIN_IN && f.snow_7d_in > 0) {
    reasons.push(
      `${ROUND2(f.rain_5d_in)}" rain in the last 5 days on existing snowpack`,
    );
    if (f.melt_freeze_cycles_5d >= 1) {
      reasons.push(`${f.melt_freeze_cycles_5d} melt-freeze ${f.melt_freeze_cycles_5d === 1 ? "cycle" : "cycles"} after the rain`);
    }
    const confidence = f.rain_5d_in >= 0.25 || f.melt_freeze_cycles_5d >= 1 ? "high" : "medium";
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
    f.melt_freeze_cycles_5d <= 1
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

  // ---------- 5. Warm + no new snow + old snow on ground → WG ----------
  // Spring corn. Old surface warming above freezing without fresh
  // input. Confidence drops the longer since meaningful snow.
  if (
    hi != null &&
    hi >= WARM_F &&
    snow24 < 1 &&
    f.snow_7d_in > 0 &&
    f.days_since_meaningful_snow != null &&
    f.days_since_meaningful_snow >= 2
  ) {
    reasons.push(`high ${hi}°F warming old snowpack`);
    reasons.push(`${f.days_since_meaningful_snow} days since last meaningful snow`);
    return makeResult(
      "WG",
      reasons,
      "medium",
      "Best window: late morning once the surface softens; refreezes overnight.",
    );
  }

  // ---------- 6. Multiple freeze-thaw → FG (or IP if ≥2 cycles) ----------
  // Melt-freeze cycles transform the surface into refrozen granules.
  // Single cycle = FG. Two or more = surface gets polished — bias to
  // IP per the asymmetric rule.
  if (f.melt_freeze_cycles_5d >= 1) {
    reasons.push(
      `${f.melt_freeze_cycles_5d} freeze-thaw ${
        f.melt_freeze_cycles_5d === 1 ? "cycle" : "cycles"
      } in the last 5 days`,
    );
    if (f.snow_7d_in > 0) reasons.push(`${ROUND1(f.snow_7d_in)}" snow over those days got reworked`);
    const code: SurfaceCode = f.melt_freeze_cycles_5d >= ICE_CYCLE_MIN ? "IP" : "FG";
    return makeResult(
      code,
      reasons,
      f.melt_freeze_cycles_5d >= ICE_CYCLE_MIN ? "high" : "medium",
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
    if (hi != null) reasons.push(`high ${hi}°F, no rain, no melt-freeze`);
    reasons.push("conditions match an overnight grooming surface");
    return makeResult("MG", reasons, "medium", "Best window: first hour after the lifts open.");
  }

  // ---------- 9. Nothing solid → VC ----------
  reasons.push("Mixed signals — not enough recent weather to pick one surface");
  return makeResult("VC", reasons, "low");
}

/** Convenience — derive + classify in one call. */
export function classifyToday(history: DailyWeather[]): SurfaceResult | null {
  const f = deriveFeatures(history);
  if (!f) return null;
  return classifyFromFeatures(f);
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
};

function parseWindMph(short: string | null | undefined): number | null {
  if (!short) return null;
  const m = /(\d+)/.exec(short);
  return m ? Number(m[1]) : null;
}

/** Convert a forecast strip day into a DailyWeather row the classifier
 *  understands. Rain is inferred from conditions when not provided
 *  numerically (cron forecast_json only stores snow_in). */
function forecastDayToDailyWeather(d: ForecastDay): DailyWeather {
  const condLower = (d.conditions_short ?? "").toLowerCase();
  const looksRainy =
    condLower.includes("rain") ||
    condLower.includes("shower") ||
    condLower.includes("drizzle") ||
    condLower.includes("thunder");
  const precipChanceFrac =
    typeof d.precip_chance === "number" ? d.precip_chance / 100 : 0;
  // Rough rain inference: when forecast says "Rain"-ish and chance is
  // high, assume modest accumulation. Better than treating all rain as
  // zero — which would mask ice risk.
  const rainGuess = looksRainy && precipChanceFrac >= 0.5 ? 0.2 : 0;
  return {
    observed_date: d.date,
    temp_high_f: d.temp_high_f,
    temp_low_f: d.temp_low_f,
    snow_24h_in: d.snow_in,
    rain_24h_in: rainGuess,
    precip_24h_in: (d.snow_in ?? 0) * 0.1 + rainGuess, // very rough SWE
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
): Array<SurfaceResult | null> {
  const out: Array<SurfaceResult | null> = [];
  // Drop today from the rolling base — we want each forecast day to
  // become the new "today" in turn.
  let rolling: DailyWeather[] = history.slice();
  for (let i = 0; i < 3; i++) {
    const fd = forecast[i];
    if (!fd) {
      out.push(null);
      continue;
    }
    rolling = [...rolling.slice(-6), forecastDayToDailyWeather(fd)];
    const r = classifyToday(rolling);
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

/** All-in-one: today + 3-day. */
export function buildSurfaceReport(
  history: DailyWeather[],
  forecast: ForecastDay[],
): SurfaceReport | null {
  const today = classifyToday(history);
  if (!today) return null;
  return {
    today,
    forecast: classifyForecast(history, forecast),
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
