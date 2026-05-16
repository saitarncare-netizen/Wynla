"use client";

// Stage 34 — Powder Day Score display block. Renders a big circular
// 0-100 number + label + 1-2 reasons. Server passes the computed score;
// this client island only handles the Pro gate (free users see a teaser
// + upsell instead of the number).
//
// Why a client component? We need useProStatus() to decide between
// number-visible vs locked-state. Score itself is computed server-side.

import Link from "next/link";
import type { PowderScore } from "@/lib/powderScore";
import { useProStatus } from "@/lib/proClient";

type Props = {
  score: PowderScore;
  resortName: string;
};

export default function PowderDayScore({ score, resortName }: Props) {
  const { isPro, isLoading } = useProStatus();

  const tone = toneStyles(score.tone);

  // Default-locked: show the teaser until /pro-status confirms Pro=true.
  // Showing the unlocked score during the loading window would leak the
  // gated value to free/anon users for ~100-300ms — small but it
  // undermines the upsell. Pro users see the teaser briefly then the
  // score; that's the right trade.
  if (!isPro) {
    return (
      <section
        aria-busy={isLoading || undefined}
        className="rounded-xl border border-wn-gold/40 bg-gradient-to-br from-wn-gold/10 via-white to-white p-4 sm:p-5"
      >
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-wn-charcoal/30 bg-white text-2xl"
          >
            🔒
          </div>
          <div className="flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wider text-wn-gold">
              Wynla Pro
            </div>
            <div className="text-lg font-extrabold text-wn-navy sm:text-xl">
              Powder Day Score
            </div>
            <p className="mt-1 text-xs text-wn-charcoal/70 sm:text-sm">
              See {resortName}&apos;s 0-100 score combining 24h snow, the
              next-3-day forecast, base depth, and wind into one number
              you can trust.
            </p>
            <Link
              href="/pro?from=powderScore"
              className="mt-3 inline-flex h-10 items-center justify-center rounded-md bg-wn-navy px-4 text-xs font-semibold text-white transition hover:bg-wn-navy/90"
            >
              Unlock with Pro →
            </Link>
          </div>
        </div>
      </section>
    );
  }

  // Pro confirmed → reveal the score.
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
