"use client";

// Stage 34 / Inaugural Season 2026 — Powder Day Score display block.
// Renders a big circular 0-100 number + label + 1-2 reasons.
//
// **Pro gate removed for Inaugural Season.** Everyone sees the full
// score during Nov 2026 – Apr 2027. Re-gate for Season 2 by uncommenting
// the useProStatus / locked-state block in git history.
//
// Server passes the computed score; this client island just renders.

import type { PowderScore } from "@/lib/powderScore";

type Props = {
  score: PowderScore;
  resortName: string;
};

export default function PowderDayScore({ score, resortName }: Props) {
  void resortName;
  const tone = toneStyles(score.tone);

  return (
    <section
      className={`rounded-xl border p-4 shadow-sm sm:p-5 ${tone.container}`}
    >
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className={`relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-extrabold ${tone.bubble}`}
        >
          {score.score}
        </div>
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wider text-wn-charcoal/55">
            Powder Day Score
          </div>
          <div className={`text-xl font-extrabold ${tone.headline}`}>
            {score.label}
          </div>
          <ul className="mt-1 space-y-0.5">
            {score.reasons.map((r) => (
              <li key={r} className="text-xs text-wn-charcoal/75 sm:text-sm">
                · {r}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[10px] text-wn-charcoal/50">
            Combines 24h new snow, 3-day forecast, base depth, and wind.
            Updated when conditions refresh.
          </p>
        </div>
      </div>
    </section>
  );
}

function toneStyles(tone: PowderScore["tone"]): {
  container: string;
  bubble: string;
  headline: string;
} {
  switch (tone) {
    case "epic":
      return {
        container: "border-emerald-500/40 bg-emerald-50",
        bubble: "bg-emerald-600 text-white",
        headline: "text-emerald-800",
      };
    case "powder":
      return {
        container: "border-wn-sky/40 bg-wn-sky/10",
        bubble: "bg-wn-sky text-white",
        headline: "text-wn-navy",
      };
    case "solid":
      return {
        container: "border-wn-navy/15 bg-white",
        bubble: "bg-wn-navy text-white",
        headline: "text-wn-navy",
      };
    case "ok":
      return {
        container: "border-wn-charcoal/15 bg-white",
        bubble: "bg-wn-charcoal/70 text-white",
        headline: "text-wn-charcoal",
      };
    case "sleeper":
    default:
      return {
        container: "border-wn-charcoal/10 bg-wn-offwhite",
        bubble: "bg-wn-charcoal/30 text-white",
        headline: "text-wn-charcoal/70",
      };
  }
}
