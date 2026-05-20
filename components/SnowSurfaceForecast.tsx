"use client";

// Inaugural Season 2026 — Snow Surface Forecast UI.
//
// Renders three things on the resort detail page:
//   1. A prominent "Today's surface" card with the SANY code +
//      plain-English label, an emoji, the WHY reasons, and a
//      confidence chip.
//   2. A horizontal 3-day forecast strip showing the predicted
//      surface for tomorrow / +2 / +3 days.
//   3. A clickable info button that opens the SANY education modal —
//      8 cards, one per code, with "feels like" + "caused by" copy
//      from lib/snowSurface.ts SURFACE_GLOSSARY.
//
// The server passes a pre-classified `report` so this client island
// doesn't import the classifier directly. Keeps the page payload thin
// and lets us evolve the algorithm without re-shipping the UI.

import { useState } from "react";
import {
  SURFACE_GLOSSARY,
  confidenceLabel,
  type SurfaceCode,
  type SurfaceReport,
  type SurfaceResult,
} from "@/lib/snowSurface";
import SurfaceIcon from "@/components/icons/SurfaceIcon";

type Props = {
  report: SurfaceReport;
  /** Up to 3 forecast dates aligned with report.forecast slots. Used as
   *  the day labels on the strip. */
  forecastDates?: Array<string | null>;
};

export default function SnowSurfaceForecast({ report, forecastDates }: Props) {
  const [showModal, setShowModal] = useState(false);
  const today = report.today;
  const tone = toneFor(today.code);

  return (
    <section aria-label="Snow surface forecast">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-wn-navy sm:text-xl">
            Snow surface today
          </h2>
          <p className="text-xs text-wn-charcoal/60">
            US-standard SANY classification, predicted from the last 7 days of weather.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1 rounded-full border border-wn-charcoal/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-wn-charcoal/80 transition hover:border-wn-navy hover:text-wn-navy"
          aria-label="Learn what each surface code means"
        >
          <span aria-hidden="true">ⓘ</span>
          <span>What do these mean?</span>
        </button>
      </div>

      {/* TODAY'S SURFACE CARD */}
      <div
        className={`rounded-xl border p-4 shadow-sm sm:p-5 ${tone.container}`}
      >
        <div className="flex items-start gap-4">
          <div
            aria-hidden="true"
            className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone.bubble} sm:h-16 sm:w-16`}
          >
            <SurfaceIcon code={today.code} className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[11px] font-bold uppercase tracking-wider ${tone.code}`}>
                {today.short} · {today.label}
              </span>
              <ConfidenceChip confidence={today.confidence} />
            </div>
            <p className={`mt-1 text-sm font-semibold ${tone.headline} sm:text-base`}>
              {today.description}
            </p>
            {today.reasons.length > 0 && (
              <ul className="mt-2 space-y-0.5">
                {today.reasons.map((r, i) => (
                  <li
                    key={`${i}-${r}`}
                    className="text-xs text-wn-charcoal/75 sm:text-sm"
                  >
                    · {r}
                  </li>
                ))}
              </ul>
            )}
            {today.when && (
              <p className="mt-2 text-xs font-semibold text-wn-navy/80 sm:text-sm">
                {today.when}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 3-DAY FORECAST STRIP */}
      {report.forecast.some(Boolean) && (
        <div className="mt-4">
          <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-wn-charcoal/55">
            3-day surface outlook
          </div>
          <div className="grid grid-cols-3 gap-2">
            {report.forecast.map((r, i) => (
              <ForecastSlot
                key={i}
                result={r}
                dateLabel={forecastDates?.[i] ?? null}
                dayIndex={i}
              />
            ))}
          </div>
          <p className="mt-2 text-[10px] text-wn-charcoal/50">
            Confidence drops with distance — day 3 is trend only.
          </p>
        </div>
      )}

      {/* EDUCATION MODAL */}
      {showModal && <SurfaceEducationModal onClose={() => setShowModal(false)} />}
    </section>
  );
}

function ConfidenceChip({
  confidence,
}: {
  confidence: SurfaceResult["confidence"];
}) {
  const c =
    confidence === "high"
      ? "bg-emerald-100 text-emerald-800"
      : confidence === "medium"
        ? "bg-amber-100 text-amber-800"
        : "bg-wn-charcoal/10 text-wn-charcoal/60";
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${c}`}
    >
      {confidenceLabel(confidence)}
    </span>
  );
}

function ForecastSlot({
  result,
  dateLabel,
  dayIndex,
}: {
  result: SurfaceResult | null;
  dateLabel: string | null;
  dayIndex: number;
}) {
  const headerLabel =
    dateLabel ??
    (dayIndex === 0 ? "Tomorrow" : dayIndex === 1 ? "Day +2" : "Day +3");

  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-wn-charcoal/15 bg-white p-3 text-center">
        <div className="text-[10px] font-bold uppercase tracking-wider text-wn-navy">
          {headerLabel}
        </div>
        <div className="mt-2 text-xs text-wn-charcoal/50">No data</div>
      </div>
    );
  }
  const tone = toneFor(result.code);
  return (
    <div className={`rounded-lg border p-3 text-center ${tone.container}`}>
      <div className="text-[10px] font-bold uppercase tracking-wider text-wn-navy">
        {headerLabel}
      </div>
      <div
        className={`my-1.5 inline-flex h-8 w-8 items-center justify-center rounded-lg ${tone.bubble}`}
      >
        <SurfaceIcon code={result.code} className="h-5 w-5" />
      </div>
      <div className={`text-xs font-extrabold ${tone.headline}`}>
        {result.short}
      </div>
      <div className="mt-0.5 text-[10px] font-medium text-wn-charcoal/65 truncate">
        {result.label}
      </div>
    </div>
  );
}

function SurfaceEducationModal({ onClose }: { onClose: () => void }) {
  // 8 user-facing codes; we hide VC from the education list since it's
  // a fallback bucket, not something the resort would report.
  const codes: SurfaceCode[] = ["PP", "PPC", "MG", "LSG", "FG", "WS", "WG", "IP"];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="surface-edu-title"
      className="fixed inset-0 z-50 flex items-end justify-center bg-wn-charcoal/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-h-[80vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-wn-charcoal/10 bg-white px-5 py-3">
          <h3
            id="surface-edu-title"
            className="text-base font-bold text-wn-navy sm:text-lg"
          >
            Snow surface classes (US standard)
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-wn-charcoal/60 transition hover:bg-wn-charcoal/5 hover:text-wn-navy"
          >
            <span aria-hidden="true" className="text-xl leading-none">×</span>
          </button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="text-xs text-wn-charcoal/65">
            These are the surface codes US resorts use in their daily snow reports.
            Wynla predicts which one you&apos;ll be skiing on, from the last 7 days of weather.
          </p>
          <ul className="space-y-3">
            {codes.map((c) => {
              const g = SURFACE_GLOSSARY[c];
              const tone = toneFor(c);
              return (
                <li
                  key={c}
                  className={`flex gap-3 rounded-lg border p-3 ${tone.container}`}
                >
                  <div
                    aria-hidden="true"
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone.bubble}`}
                  >
                    <SurfaceIcon code={c} className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className={`text-xs font-extrabold uppercase tracking-wider ${tone.code}`}>
                        {g.short}
                      </span>
                      <span className="text-sm font-bold text-wn-navy">
                        {g.label}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-wn-charcoal/75 sm:text-sm">
                      <strong className="text-wn-navy">Feels like:</strong>{" "}
                      {g.feelsLike}
                    </p>
                    <p className="mt-1 text-xs text-wn-charcoal/65 sm:text-sm">
                      <strong className="text-wn-navy/80">Caused by:</strong>{" "}
                      {g.causedBy}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="pt-2 text-[10px] text-wn-charcoal/50">
            Wynla&apos;s predictions are rule-based for v1 (realistic 75–85% accuracy on
            the dominant classes). We bias toward calling ice when in doubt —
            over-warning is recoverable, under-warning is not.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------- Tone palette ----------
// Each SANY code maps to a soft container colour + a saturated bubble.
// Stays inside the Wynla palette (navy / gold / charcoal) — only the
// emerald/amber/sky/red accents leak in to differentiate the more
// extreme states. Keeps the page consistent with the rest of the resort
// detail surface.

function toneFor(code: SurfaceCode): {
  container: string;
  bubble: string;
  headline: string;
  code: string;
} {
  switch (code) {
    case "PP":
      return {
        container: "border-wn-sky/40 bg-wn-sky/10",
        bubble: "bg-wn-sky text-white",
        headline: "text-wn-navy",
        code: "text-wn-sky",
      };
    case "PPC":
      return {
        container: "border-wn-navy/15 bg-white",
        bubble: "bg-wn-navy text-white",
        headline: "text-wn-navy",
        code: "text-wn-navy/70",
      };
    case "MG":
      return {
        container: "border-wn-charcoal/10 bg-white",
        bubble: "bg-wn-charcoal/70 text-white",
        headline: "text-wn-charcoal",
        code: "text-wn-charcoal/70",
      };
    case "LSG":
      return {
        container: "border-wn-charcoal/15 bg-wn-offwhite",
        bubble: "bg-wn-charcoal/50 text-white",
        headline: "text-wn-charcoal",
        code: "text-wn-charcoal/70",
      };
    case "FG":
      return {
        container: "border-wn-charcoal/15 bg-white",
        bubble: "bg-slate-500 text-white",
        headline: "text-wn-charcoal",
        code: "text-slate-700",
      };
    case "WS":
      return {
        container: "border-wn-sky/30 bg-wn-sky/5",
        bubble: "bg-wn-sky/70 text-white",
        headline: "text-wn-navy",
        code: "text-wn-sky/80",
      };
    case "WG":
      return {
        container: "border-wn-gold/40 bg-wn-gold/10",
        bubble: "bg-wn-gold text-wn-navy",
        headline: "text-wn-navy",
        code: "text-wn-navy",
      };
    case "IP":
      return {
        container: "border-red-500/30 bg-red-50",
        bubble: "bg-red-600 text-white",
        headline: "text-red-800",
        code: "text-red-700",
      };
    case "VC":
    default:
      return {
        container: "border-wn-charcoal/10 bg-wn-offwhite",
        bubble: "bg-wn-charcoal/30 text-white",
        headline: "text-wn-charcoal/70",
        code: "text-wn-charcoal/60",
      };
  }
}
