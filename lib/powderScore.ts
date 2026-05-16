// Stage 34 — Powder Day Score.
//
// One 0-100 number per resort that combines recent + forecasted snow,
// base depth, and openness signals into a single sortable metric. Pro
// users see this on every resort detail page and in a future "powder
// today" map sort.
//
// Why "own a metric": every skier checks OpenSnow, NOAA, and the resort
// site separately to triage powder days. If Wynla rolls them into one
// number that's good enough to trust, it becomes the daily reason to
// open the app — and a defensible Pro feature.
//
// Server-only. No "use client" — keep it cheap to call from RSC.

export type PowderInputs = {
  snow_new_24h_in: number | null;
  snow_new_48h_in: number | null;
  snow_new_7d_in: number | null;
  snow_base_depth_in: number | null;
  /** Sum of `snow_in` from the next-3-day forecast (in inches). Optional;
   *  if null/undefined we score off observed snow only. */
  forecast_next3_in: number | null;
  /** Average wind mph for "now". Above 35 mph = strong penalty (wind-scoured
   *  snow + chair holds). Optional. */
  wind_mph_avg: number | null;
  /** "open" / "limited" / "closed" / null. Closed resorts cap at score 30
   *  regardless of snow — no powder is good if you can't ski. */
  snow_report_status: string | null;
};

export type PowderScore = {
  score: number; // 0-100
  label: string;
  tone: "epic" | "powder" | "solid" | "ok" | "sleeper";
  breakdown: {
    recent: number;
    forecast: number;
    base: number;
    penalty: number;
  };
  /** Why we landed at this score — 1-2 short user-facing reasons. */
  reasons: string[];
};

/** Tunable: how generous the curve is. Bumped during season; calibration
 *  is informed by real data once we have a winter of usage. */
const CURVE = {
  recentWeight: 40, // max 40 from observed 24h snow
  forecastWeight: 35, // max 35 from forecasted next-3 days
  baseWeight: 20, // max 20 from base depth
  windPenaltyMax: 15, // max 15 deduction at wind ≥40mph
};

/** Maps observed 24h snow → 0..1 contribution. 12+ inches saturates. */
function recentContribution(n: number | null): number {
  if (n == null || !Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1, n / 12);
}

/** Maps forecasted next-3-day snow → 0..1. 18+ inches saturates. */
function forecastContribution(n: number | null): number {
  if (n == null || !Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1, n / 18);
}

/** Maps base depth → 0..1. 80+ inches saturates (= properly built up). */
function baseContribution(n: number | null): number {
  if (n == null || !Number.isFinite(n) || n <= 0) return 0;
  return Math.min(1, n / 80);
}

/** Wind penalty curve. Below 25 = 0. Linear up to windPenaltyMax at 45+. */
function windPenalty(mph: number | null): number {
  if (mph == null || !Number.isFinite(mph) || mph < 25) return 0;
  const t = Math.min(1, (mph - 25) / 20);
  return CURVE.windPenaltyMax * t;
}

function labelFor(score: number): { label: string; tone: PowderScore["tone"] } {
  if (score >= 85) return { label: "EPIC", tone: "epic" };
  if (score >= 70) return { label: "Powder day", tone: "powder" };
  if (score >= 50) return { label: "Solid", tone: "solid" };
  if (score >= 30) return { label: "OK day", tone: "ok" };
  return { label: "Sleeper", tone: "sleeper" };
}

/** Returns null when we don't have enough data to produce a meaningful
 *  number — e.g. resort row missing every snow column. Components should
 *  hide the surface entirely in that case rather than show "0/100". */
export function computePowderScore(inputs: PowderInputs): PowderScore | null {
  const hasAnyInput =
    inputs.snow_new_24h_in != null ||
    inputs.snow_new_48h_in != null ||
    inputs.snow_base_depth_in != null ||
    inputs.forecast_next3_in != null;
  if (!hasAnyInput) return null;

  const recent = CURVE.recentWeight * recentContribution(inputs.snow_new_24h_in);
  const forecast =
    CURVE.forecastWeight * forecastContribution(inputs.forecast_next3_in);
  const base = CURVE.baseWeight * baseContribution(inputs.snow_base_depth_in);
  const penalty = windPenalty(inputs.wind_mph_avg);

  let raw = recent + forecast + base - penalty;

  // Closed resorts cap at 30 — no powder is good if the mountain isn't
  // running. "Limited" doesn't cap (some big mountains have plenty of
  // terrain even when not 100% open).
  if (inputs.snow_report_status === "closed") {
    raw = Math.min(raw, 30);
  }

  const score = Math.max(0, Math.min(100, Math.round(raw)));
  const { label, tone } = labelFor(score);

  const reasons: string[] = [];
  if (inputs.snow_new_24h_in && inputs.snow_new_24h_in >= 6) {
    reasons.push(`${Math.round(inputs.snow_new_24h_in)}" new in 24h`);
  } else if (inputs.snow_new_48h_in && inputs.snow_new_48h_in >= 8) {
    reasons.push(`${Math.round(inputs.snow_new_48h_in)}" in 48h`);
  }
  if (inputs.forecast_next3_in && inputs.forecast_next3_in >= 8) {
    reasons.push(`${Math.round(inputs.forecast_next3_in)}" forecasted next 3 days`);
  }
  if (
    inputs.snow_base_depth_in &&
    inputs.snow_base_depth_in >= 60 &&
    reasons.length === 0
  ) {
    reasons.push(`${Math.round(inputs.snow_base_depth_in)}" base depth`);
  }
  if (penalty > 5 && inputs.wind_mph_avg) {
    reasons.push(`${Math.round(inputs.wind_mph_avg)}mph winds (chair holds risk)`);
  }
  if (inputs.snow_report_status === "closed") {
    reasons.push("Currently closed");
  }
  if (reasons.length === 0) {
    reasons.push(score >= 50 ? "Decent conditions" : "Quiet right now");
  }

  return {
    score,
    label,
    tone,
    breakdown: {
      recent: Math.round(recent),
      forecast: Math.round(forecast),
      base: Math.round(base),
      penalty: Math.round(penalty),
    },
    reasons: reasons.slice(0, 2),
  };
}

/** Sum the next N days of forecasted snow_in (server-side helper). */
export function forecastNext3Snow(
  forecast: { snow_in: number | null }[] | null | undefined,
): number | null {
  if (!forecast || forecast.length === 0) return null;
  const top3 = forecast.slice(0, 3);
  const sum = top3.reduce(
    (acc, d) => acc + (typeof d.snow_in === "number" ? d.snow_in : 0),
    0,
  );
  return Number.isFinite(sum) ? sum : null;
}
