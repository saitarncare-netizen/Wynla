// Wind-hold helper — decides whether a forecast wind speed is high
// enough to risk lift closures, given resort-specific thresholds.
//
// Threshold sources (priority order):
//   1. resort.wind_hold_mph_chair / wind_hold_mph_gondola (filled by
//      Phase 2 Tier 1 research per-resort)
//   2. global defaults (chair 35 mph warning / 50 mph high-risk,
//      gondola 50 mph warning / 65 mph high-risk) — based on US lift
//      industry conventions
//
// Output is rendered as a small chip next to the existing wind value
// on the Today's weather card and on each 10-day forecast card. The
// chip stays absent when wind is below the warning threshold (most
// days) so we don't add visual noise.

export type WindHoldLevel = "ok" | "warning" | "high-risk";

export type WindHoldEvaluation = {
  level: WindHoldLevel;
  /** Short, user-facing label suitable for a chip. */
  label: string;
  /** Threshold (mph) that triggered the level. NULL when level=ok. */
  threshold: number | null;
  /** Threshold source — "resort" if Phase 2 data is set, "default"
   *  otherwise. */
  source: "resort" | "default";
};

const DEFAULT_CHAIR_WARNING = 35;
const DEFAULT_CHAIR_HIGH_RISK = 50;
// Gondolas tolerate ~15 mph more than chairs on average.
const DEFAULT_GONDOLA_WARNING = 50;
const DEFAULT_GONDOLA_HIGH_RISK = 65;

export type ResortWindContext = {
  wind_hold_mph_chair: number | null;
  wind_hold_mph_gondola: number | null;
  /** When true, we'll use the gondola threshold for the high-risk
   *  upper bound (chair still warns first). Set true when the resort
   *  is gondola-or-tram-served on most aspects. */
  hasGondolaOrTram?: boolean;
};

/**
 * Evaluate a forecast wind speed against a resort's wind-hold profile.
 * Returns level=ok for wind <= warning threshold; warning between
 * warning and high-risk; high-risk above the upper threshold.
 */
export function evaluateWindHold(
  mph: number | null | undefined,
  resort: ResortWindContext,
): WindHoldEvaluation {
  if (mph == null || !Number.isFinite(mph)) {
    return { level: "ok", label: "", threshold: null, source: "default" };
  }

  const chairWarn = resort.wind_hold_mph_chair ?? DEFAULT_CHAIR_WARNING;
  const chairHigh = Math.max(chairWarn + 10, DEFAULT_CHAIR_HIGH_RISK);
  const gondolaWarn =
    resort.wind_hold_mph_gondola ?? DEFAULT_GONDOLA_WARNING;
  const gondolaHigh = Math.max(gondolaWarn + 10, DEFAULT_GONDOLA_HIGH_RISK);

  const source: "resort" | "default" =
    resort.wind_hold_mph_chair != null || resort.wind_hold_mph_gondola != null
      ? "resort"
      : "default";

  const upperBound = resort.hasGondolaOrTram ? gondolaHigh : chairHigh;
  const warnBound = resort.hasGondolaOrTram
    ? Math.min(chairWarn, gondolaWarn)
    : chairWarn;

  if (mph >= upperBound) {
    return {
      level: "high-risk",
      label: "Lifts may close",
      threshold: upperBound,
      source,
    };
  }
  if (mph >= warnBound) {
    return {
      level: "warning",
      label: "Lift hold likely",
      threshold: warnBound,
      source,
    };
  }
  return { level: "ok", label: "", threshold: null, source };
}

/** Tailwind classes for a chip rendered next to a wind value, keyed
 *  to the evaluation level. Empty strings mean the chip is hidden. */
export function windHoldChipClass(level: WindHoldLevel): {
  container: string;
  icon: string;
} {
  switch (level) {
    case "high-risk":
      return {
        container:
          "inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800",
        icon: "🛑",
      };
    case "warning":
      return {
        container:
          "inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800",
        icon: "⚠️",
      };
    case "ok":
    default:
      return { container: "", icon: "" };
  }
}

/** Parse a wind-mph value out of a forecast strip's free-text wind
 *  field (e.g. "12 to 15 mph SW", "20 mph W", "10 mph", "5 to 10 mph").
 *  Returns the average of any range we find, or null. */
export function parseWindMphFromText(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /(\d+)(?:\s*to\s*(\d+))?\s*mph/i.exec(s);
  if (!m) return null;
  const lo = Number(m[1]);
  const hi = m[2] ? Number(m[2]) : lo;
  if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
  return (lo + hi) / 2;
}
