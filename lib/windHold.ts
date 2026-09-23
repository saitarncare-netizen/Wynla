// Wind-hold helper — decides whether a wind reading is high enough to
// risk lift closures, given resort-specific thresholds.
//
// What we evaluate: GUSTS when we have them, sustained wind only as a
// fallback. Lift operators put chairs on hold because of gusts — a 25 mph
// sustained day with 50 mph gusts closes ridge lifts, a steady 25 does
// not — so evaluating the average alone under-warned on exactly the days
// that matter (audit domain-logic-20 / resort-panel-detail-55).
//
// Threshold sources (priority order):
//   1. resort.wind_hold_mph_chair / wind_hold_mph_gondola (filled by
//      Phase 2 Tier 1 research per-resort)
//   2. global defaults (chair 35 mph warning / 50 mph high-risk,
//      gondola 50 mph warning / 65 mph high-risk) — based on US lift
//      industry conventions
//
// Which threshold applies: a resort that runs ANY chairlifts is judged on
// the chair numbers, because those are the lifts that go on hold first
// and the ones most visitors ride. Only a resort served purely by
// gondolas / trams (no chairs at all) gets the more tolerant gondola
// bounds. Previously a single gondola in the lift mix raised the
// high-risk bar for the whole mountain — a weaker warning for exactly
// the big resorts where chairs still carry most riders.
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
  /** Which reading the level was judged on. */
  basis: "gust" | "sustained" | "none";
  /** The mph value that was evaluated (gust or sustained). */
  mph: number | null;
  /** Labelled reading for copy, e.g. "gusts to 48 mph". Empty when ok. */
  detail: string;
};

const DEFAULT_CHAIR_WARNING = 35;
const DEFAULT_CHAIR_HIGH_RISK = 50;
// Gondolas tolerate ~15 mph more than chairs on average.
const DEFAULT_GONDOLA_WARNING = 50;
const DEFAULT_GONDOLA_HIGH_RISK = 65;

export type LiftMix = { chairs: number; gondolas: number; trams: number };

export type ResortWindContext = {
  wind_hold_mph_chair: number | null;
  wind_hold_mph_gondola: number | null;
  /** Legacy flag — "the resort has at least one gondola or tram". It no
   *  longer relaxes the high-risk bound; pass `liftMix` for the real
   *  decision. Kept so older call sites still type-check. */
  hasGondolaOrTram?: boolean;
  /** Counts by lift family. When provided, gondola thresholds apply only
   *  to a gondola/tram-only resort. */
  liftMix?: LiftMix | null;
};

/** A wind reading: sustained speed plus (when known) the gust peak. */
export type WindReading = {
  sustained: number | null | undefined;
  gust?: number | null | undefined;
};

/** Sum the Phase 2 `lift_types` JSON into chair / gondola / tram counts. */
export function liftMixFromTypes(
  t: Record<string, number | null | undefined> | null | undefined,
): LiftMix | null {
  if (!t) return null;
  const n = (k: string) => Number(t[k]) || 0;
  return {
    chairs:
      n("high_speed_six") +
      n("high_speed_quad") +
      n("fixed_quad") +
      n("fixed_triple") +
      n("fixed_double") +
      n("bubble_chair"),
    gondolas: n("gondola"),
    trams: n("tram"),
  };
}

/**
 * Evaluate a wind reading against a resort's wind-hold profile.
 * Accepts a bare number (treated as sustained) or a {sustained, gust}
 * reading; gusts win when present. Returns level=ok below the warning
 * threshold; warning between warning and high-risk; high-risk above.
 */
export function evaluateWindHold(
  wind: number | WindReading | null | undefined,
  resort: ResortWindContext,
): WindHoldEvaluation {
  const reading: WindReading =
    typeof wind === "number" ? { sustained: wind } : (wind ?? { sustained: null });
  const gust = finiteOrNull(reading.gust);
  const sustained = finiteOrNull(reading.sustained);
  const basis: WindHoldEvaluation["basis"] = gust != null ? "gust" : sustained != null ? "sustained" : "none";
  const mph = basis === "gust" ? gust : sustained;

  const source: "resort" | "default" =
    resort.wind_hold_mph_chair != null || resort.wind_hold_mph_gondola != null
      ? "resort"
      : "default";

  if (mph == null) {
    return { level: "ok", label: "", threshold: null, source, basis, mph: null, detail: "" };
  }

  const chairWarn = resort.wind_hold_mph_chair ?? DEFAULT_CHAIR_WARNING;
  const chairHigh = Math.max(chairWarn + 10, DEFAULT_CHAIR_HIGH_RISK);
  const gondolaWarn = resort.wind_hold_mph_gondola ?? DEFAULT_GONDOLA_WARNING;
  const gondolaHigh = Math.max(gondolaWarn + 10, DEFAULT_GONDOLA_HIGH_RISK);

  const mix = resort.liftMix ?? null;
  const gondolaOnly = mix != null && mix.chairs === 0 && mix.gondolas + mix.trams > 0;
  const hasBoth = mix != null && mix.chairs > 0 && mix.gondolas + mix.trams > 0;

  const upperBound = gondolaOnly ? gondolaHigh : chairHigh;
  // With both families the first hold hits whichever warns lower —
  // normally the chairs, unless resort research says otherwise.
  const warnBound = gondolaOnly ? gondolaWarn : hasBoth ? Math.min(chairWarn, gondolaWarn) : chairWarn;

  const detail = basis === "gust" ? `gusts to ${Math.round(mph)} mph` : `sustained ${Math.round(mph)} mph`;

  if (mph >= upperBound) {
    return { level: "high-risk", label: "Lifts may close", threshold: upperBound, source, basis, mph, detail };
  }
  if (mph >= warnBound) {
    return { level: "warning", label: "Lift hold likely", threshold: warnBound, source, basis, mph, detail };
  }
  return { level: "ok", label: "", threshold: null, source, basis, mph, detail: "" };
}

function finiteOrNull(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
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

/**
 * Parse an NWS / Open-Meteo wind phrase into a reading. Handles
 * "12 to 15 mph", "20 mph W", "25 to 35 mph, with gusts as high as
 * 55 mph", "15 mph, gusts up to 30 mph". Sustained = the average of a
 * range; gust = the "gusts …" figure when present.
 */
export function parseWindFromText(s: string | null | undefined): WindReading {
  if (!s) return { sustained: null, gust: null };
  const gustMatch = /gusts?\s*(?:as high as|up to|to|of)?\s*(\d+)\s*mph/i.exec(s);
  const gust = gustMatch ? Number(gustMatch[1]) : null;
  // Sustained: the first "N [to M] mph" that is NOT the gust phrase.
  const withoutGust = gustMatch ? s.slice(0, gustMatch.index) + s.slice(gustMatch.index + gustMatch[0].length) : s;
  const m = /(\d+)(?:\s*to\s*(\d+))?\s*mph/i.exec(withoutGust);
  let sustained: number | null = null;
  if (m) {
    const lo = Number(m[1]);
    const hi = m[2] ? Number(m[2]) : lo;
    if (Number.isFinite(lo) && Number.isFinite(hi)) sustained = (lo + hi) / 2;
  }
  return { sustained, gust: Number.isFinite(gust as number) ? gust : null };
}

/** Sustained-only convenience kept for existing call sites: the average
 *  of any range found, or null. */
export function parseWindMphFromText(s: string | null | undefined): number | null {
  return parseWindFromText(s).sustained ?? null;
}
