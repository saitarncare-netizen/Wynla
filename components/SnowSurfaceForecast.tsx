"use client";

// Inaugural Season 2026 — Snow Surface Forecast UI.
//
// Renders three things on the resort detail page:
//   1. A prominent "Today's surface" card: the plain-English surface name
//      as the headline, the "feels like" sentence under it, the SANY code
//      as a small mono tag, the WHY bullets, a confidence chip and a
//      "Based on" evidence line.
//   2. A horizontal 3-day forecast strip showing the predicted
//      surface for tomorrow / +2 / +3 days.
//   3. A clickable info button that opens the education modal —
//      8 cards, one per code, with "feels like" + "caused by" copy
//      from lib/snowSurface.ts SURFACE_GLOSSARY.
//
// When the report is DORMANT (closed / off-season / stale inputs) the
// card becomes a compact "Season preview": typical opening window,
// annual snowfall, last season's end, and a line saying the forecast
// starts when the lifts spin. No code, no confidence, no 3-day strip —
// the audit's most-repeated complaint was "VC Variable · Low confidence"
// on a closed mountain in September.
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

/** Facts the dormant card shows instead of a classification. */
export type SeasonPreview = {
  resortName: string;
  /** e.g. "late November – mid April", or null when unknown. */
  seasonWindow: string | null;
  /** e.g. "Opens ~Nov 22 · in 61 days", or null. */
  opensLine: string | null;
  annualSnowfallIn: number | null;
  /** ISO date last season ended, when it is in the past. */
  lastSeasonEnded: string | null;
};

type Props = {
  report: SurfaceReport;
  /** Up to 3 forecast dates aligned with report.forecast slots. Used as
   *  the day labels on the strip. */
  forecastDates?: Array<string | null>;
  /** Shown when the report is dormant. */
  preview?: SeasonPreview;
};

export default function SnowSurfaceForecast({ report, forecastDates, preview }: Props) {
  const [showModal, setShowModal] = useState(false);

  return (
    <section aria-label="Snow surface forecast">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-wn-navy sm:text-xl">
            {report.dormant ? "Snow surface" : "Snow surface today"}
          </h2>
          <p className="text-xs text-wn-charcoal/60">
            {report.dormant
              ? "What the snow will feel like under your edges, once the lifts are running."
              : "What the snow feels like under your edges, worked out from the last 7 days of weather."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex shrink-0 items-center gap-1 rounded-full border border-wn-charcoal/15 bg-white px-2.5 py-1 text-[11px] font-semibold text-wn-charcoal/80 transition hover:border-wn-navy hover:text-wn-navy"
          aria-label="Learn what each surface type means"
        >
          <span aria-hidden="true">ⓘ</span>
          <span>Surface types</span>
        </button>
      </div>

      {report.dormant ? (
        <DormantCard headline={report.headline} message={report.message} preview={preview} />
      ) : (
        <>
          <TodayCard today={report.today} basedOn={report.basedOn} />
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
        </>
      )}

      {/* EDUCATION MODAL */}
      {showModal && <SurfaceEducationModal onClose={() => setShowModal(false)} />}
    </section>
  );
}

function TodayCard({ today, basedOn }: { today: SurfaceResult; basedOn: string[] }) {
  const tone = toneFor(today.code);
  return (
    <div className={`rounded-xl border p-4 shadow-sm sm:p-5 ${tone.container}`}>
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className={`relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${tone.bubble} sm:h-16 sm:w-16`}
        >
          <span className="text-lg font-extrabold tracking-tight sm:text-xl">
            {today.short}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-lg font-extrabold leading-tight ${tone.headline} sm:text-xl`}>
              {today.label}
            </h3>
            <CodeTag code={today.short} />
            <ConfidenceChip confidence={today.confidence} />
          </div>
          {today.alsoCalled && (
            <p className="mt-0.5 text-[11px] italic text-wn-charcoal/60">
              also called {today.alsoCalled}
            </p>
          )}
          <p className="mt-1 text-sm text-wn-charcoal/85 sm:text-base">
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
          {basedOn.length > 0 && (
            <p className="mt-3 text-[11px] leading-snug text-wn-charcoal/55">
              <span className="font-semibold text-wn-charcoal/70">Based on:</span>{" "}
              {basedOn.join(" · ")}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DormantCard({
  headline,
  message,
  preview,
}: {
  headline: string;
  message: string;
  preview?: SeasonPreview;
}) {
  const facts: Array<{ label: string; value: string }> = [];
  if (preview?.opensLine) facts.push({ label: "Next opening", value: preview.opensLine });
  if (preview?.seasonWindow) facts.push({ label: "Typical season", value: preview.seasonWindow });
  if (preview?.annualSnowfallIn != null) {
    facts.push({ label: "Average snowfall", value: `${preview.annualSnowfallIn}" per season` });
  }
  if (preview?.lastSeasonEnded) {
    facts.push({
      label: "Last season ended",
      value: new Date(preview.lastSeasonEnded + "T00:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }),
    });
  }
  return (
    <div className="rounded-xl border border-wn-charcoal/10 bg-wn-offwhite p-4 shadow-sm sm:p-5">
      <div className="flex items-start gap-4">
        <div
          aria-hidden="true"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-wn-navy/10 text-2xl sm:h-16 sm:w-16"
        >
          🏔️
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold uppercase tracking-wider text-wn-charcoal/55">
            Season preview
          </div>
          <h3 className="mt-0.5 text-lg font-extrabold leading-tight text-wn-navy sm:text-xl">
            {headline}
          </h3>
          <p className="mt-1 text-sm text-wn-charcoal/80">{message}</p>
          {facts.length > 0 && (
            <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/50">
                    {f.label}
                  </dt>
                  <dd className="text-sm font-semibold text-wn-navy">{f.value}</dd>
                </div>
              ))}
            </dl>
          )}
          {facts.length === 0 && preview && (
            <p className="mt-2 text-xs text-wn-charcoal/55">
              Opening dates for {preview.resortName} are not published yet — most US resorts open between late November and mid December.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CodeTag({ code }: { code: string }) {
  return (
    <span
      className="inline-flex items-center rounded border border-wn-charcoal/15 bg-white/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-wn-charcoal/70"
      title="The code resorts use in their snow reports"
    >
      {code}
    </span>
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
      <div className={`mt-1.5 text-sm font-extrabold leading-tight ${tone.headline}`}>
        {result.label}
      </div>
      <div className="mt-1 font-mono text-[10px] font-semibold text-wn-charcoal/55">
        {result.short}
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
            The eight snow surfaces
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
            These are the surface types US resorts use in their daily snow reports, with the
            short code each one goes by. Wynla predicts which one you&apos;ll be skiing on from
            the last 7 days of weather.
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
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${tone.bubble}`}
                  >
                    <span className="text-xs font-extrabold tracking-tight">
                      {c}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-sm font-bold text-wn-navy">
                        {g.label}
                      </span>
                      <CodeTag code={g.short} />
                    </div>
                    {g.alsoCalled && (
                      <p className="mt-0.5 text-[11px] italic text-wn-charcoal/60">
                        also called {g.alsoCalled}
                      </p>
                    )}
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
        bubble: "bg-wn-sky text-wn-navy",
        headline: "text-wn-navy",
        code: "text-sky-700",
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
        bubble: "bg-wn-sky/70 text-wn-navy",
        headline: "text-wn-navy",
        code: "text-sky-700",
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
