// Server-rendered result cards for /go. Every number carries its label
// (Forecast / Measured / Reported / Estimated) and its time, and a dormant
// surface says why instead of showing a class.

import Link from "next/link";
import SurfaceIcon from "@/components/icons/SurfaceIcon";
import { ResortStatusPill } from "@/components/SeasonCountdown";
import { CROWD_COLORS } from "@/lib/crowdForecast";
import { windHoldChipClass } from "@/lib/windHold";
import { formatAge, formatMonthDay } from "@/lib/saturday/dates";
import type { Confidence, CountdownEntry, Excluded, RankedPick, RankResult } from "@/lib/saturday/rank";

const CONFIDENCE_CLASS: Record<Confidence, string> = {
  High: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200",
  Medium: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  Low: "bg-wn-charcoal/5 text-wn-charcoal/70 ring-1 ring-wn-charcoal/10",
};

function ConfidenceChip({ pick }: { pick: RankedPick }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${CONFIDENCE_CLASS[pick.confidence]}`}
      title={pick.confidenceWhy}
    >
      {pick.confidence} confidence
    </span>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-wn-charcoal/55">{label}</div>
      <div className="truncate text-base font-bold text-wn-navy">{value}</div>
      <div className="text-[11px] leading-tight text-wn-charcoal/60">{sub}</div>
    </div>
  );
}

function snowStat(pick: RankedPick, now: Date): { value: string; sub: string } {
  const s = pick.snow;
  if (s.expectedIn == null) return { value: "—", sub: "Forecast does not reach that day yet" };
  const age = formatAge(s.forecastUpdatedAt, now);
  return {
    value: s.expectedIn < 0.5 ? "0 in" : `${s.expectedIn} in`,
    sub: `Forecast · NWS${age ? `, ${age}` : ""}`,
  };
}

function onGroundStat(pick: RankedPick, now: Date): { value: string; sub: string } | null {
  const s = pick.snow;
  if (s.reported24In != null && s.reportedAt) {
    return { value: `${s.reported24In} in / 24 h`, sub: `Reported by resort · ${formatAge(s.reportedAt, now)}` };
  }
  if (s.measured72In != null && s.measuredAt) {
    return { value: `${s.measured72In} in / 72 h`, sub: `Measured · NOAA, ${formatAge(s.measuredAt, now)}` };
  }
  return null;
}

export function PickCard({ pick, now, planHref }: { pick: RankedPick; now: Date; planHref: string }) {
  const snow = snowStat(pick, now);
  const ground = onGroundStat(pick, now);
  const wind = windHoldChipClass(pick.windHold.level);
  const crowd = CROWD_COLORS[pick.crowd.level];
  return (
    <article className="rounded-2xl border border-wn-charcoal/10 bg-white p-4 shadow-sm sm:p-5">
      <header className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wn-navy text-base font-extrabold text-wn-gold">
          {pick.rank}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-lg font-extrabold leading-tight text-wn-navy">{pick.resort.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-wn-charcoal/60">{pick.resort.state}</span>
            <ResortStatusPill status={pick.status} />
            <ConfidenceChip pick={pick} />
          </div>
        </div>
      </header>

      <p className="mt-3 text-sm font-semibold text-wn-charcoal">{pick.reason}</p>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          label="Drive"
          value={pick.drive.label}
          sub={pick.drive.estimated ? "Estimated · straight line × 1.2" : "Road route · cached"}
        />
        <Stat label="Expected snow" value={snow.value} sub={snow.sub} />
        <div className="min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wide text-wn-charcoal/55">Surface</div>
          {pick.surface.dormant ? (
            <>
              <div className="text-base font-bold text-wn-charcoal/60">No call</div>
              <div className="text-[11px] leading-tight text-wn-charcoal/60">{pick.surface.reason}</div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-1.5 text-base font-bold text-wn-navy">
                <SurfaceIcon code={pick.surface.code} className="h-5 w-5 shrink-0 text-wn-sky" aria-hidden="true" />
                <span className="truncate">{pick.surface.label}</span>
              </div>
              <div className="text-[11px] leading-tight text-wn-charcoal/60">
                {pick.surface.basis === "stored" ? "Classified this morning" : "Estimated from forecast"} ·{" "}
                {pick.surface.confidence} confidence
                {pick.surface.asOf ? ` · ${formatAge(pick.surface.asOf, now)}` : ""}
              </div>
            </>
          )}
        </div>
        {ground ? (
          <Stat label="On the ground" value={ground.value} sub={ground.sub} />
        ) : (
          <Stat
            label="Crowds"
            value={pick.crowd.label}
            sub={`Estimated${pick.crowd.holiday ? ` · ${pick.crowd.holiday}` : ""}`}
          />
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        {ground && (
          <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-semibold ${crowd.bg} ${crowd.text}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${crowd.dot}`} aria-hidden="true" />
            {pick.crowd.label} · estimated
          </span>
        )}
        {wind.container && (
          <span className={wind.container}>
            <span aria-hidden="true">{wind.icon}</span>
            {pick.windHold.label} · {pick.windHold.detail} forecast
          </span>
        )}
        {pick.snow.tempHighF != null && (
          <span className="text-wn-charcoal/60">
            High {pick.snow.tempHighF}°F{pick.snow.tempLowF != null ? ` / low ${pick.snow.tempLowF}°F` : ""} · forecast
          </span>
        )}
      </div>

      <p className="mt-3 text-xs text-wn-charcoal/75">
        <span className="font-semibold text-wn-charcoal">Pass:</span> {pick.access.line}
      </p>
      {pick.access.note && <p className="mt-1 text-xs text-amber-800">{pick.access.note}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link
          href={`/resort/${encodeURIComponent(pick.resort.slug)}`}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-wn-charcoal/20 bg-white text-sm font-semibold text-wn-navy hover:border-wn-navy"
        >
          Details
        </Link>
        <Link
          href={planHref}
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-wn-navy text-sm font-semibold text-white hover:bg-wn-navy/90"
        >
          Plan trip
        </Link>
      </div>
    </article>
  );
}

export function RunnerUpRow({ pick }: { pick: RankedPick }) {
  return (
    <li className="flex items-start gap-3 py-3">
      <span className="mt-0.5 w-5 shrink-0 text-sm font-bold text-wn-charcoal/50">{pick.rank}</span>
      <div className="min-w-0 flex-1">
        <Link href={`/resort/${encodeURIComponent(pick.resort.slug)}`} className="font-semibold text-wn-navy hover:underline">
          {pick.resort.name}
        </Link>
        <span className="text-xs text-wn-charcoal/60"> · {pick.resort.state}</span>
        <p className="text-xs text-wn-charcoal/75">{pick.reason}</p>
      </div>
      <ConfidenceChip pick={pick} />
    </li>
  );
}

export function CountdownCard({ entry }: { entry: CountdownEntry }) {
  const when = entry.opensOn
    ? `${entry.projected ? "Projected to open" : "Opens"} ${entry.approximate ? "~" : ""}${formatMonthDay(entry.opensOn)}`
    : "Opening date not published";
  return (
    <article className="rounded-2xl border border-wn-charcoal/10 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-lg font-extrabold leading-tight text-wn-navy">{entry.resort.name}</h3>
      <div className="mt-1 text-xs text-wn-charcoal/60">
        {entry.resort.state} · {entry.drive.label} drive{entry.drive.estimated ? " (estimated)" : ""}
      </div>
      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-wn-navy px-3 py-1.5 text-sm font-semibold text-white">
        <span aria-hidden="true">❄️</span>
        <span>
          {when}
          {entry.daysUntilOpen != null && entry.daysUntilOpen >= 0
            ? ` · ${entry.daysUntilOpen === 0 ? "today" : `in ${entry.daysUntilOpen} day${entry.daysUntilOpen === 1 ? "" : "s"}`}`
            : ""}
        </span>
      </div>
      {entry.projected && (
        <p className="mt-2 text-[11px] text-wn-charcoal/60">Projected by a third party, not announced by the resort.</p>
      )}
      {entry.access && (
        <p className="mt-2 text-xs text-wn-charcoal/75">
          <span className="font-semibold text-wn-charcoal">Pass:</span> {entry.access.line}
        </p>
      )}
      <Link
        href={`/resort/${encodeURIComponent(entry.resort.slug)}`}
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-wn-charcoal/20 bg-white text-sm font-semibold text-wn-navy hover:border-wn-navy"
      >
        Resort page
      </Link>
    </article>
  );
}

export function ExcludedList({ items }: { items: Excluded[] }) {
  if (items.length === 0) return null;
  return (
    <ul className="divide-y divide-wn-charcoal/10 text-sm">
      {items.map((e) => (
        <li key={e.resort.id} className="flex items-baseline justify-between gap-3 py-2">
          <span className="min-w-0">
            <Link href={`/resort/${encodeURIComponent(e.resort.slug)}`} className="font-semibold text-wn-navy hover:underline">
              {e.resort.name}
            </Link>
            <span className="text-xs text-wn-charcoal/70"> · {e.reason}</span>
          </span>
          <span className="shrink-0 text-xs text-wn-charcoal/60">{e.drive.label}</span>
        </li>
      ))}
    </ul>
  );
}

export function WhyThese({ result }: { result: RankResult }) {
  const w = result.weights;
  return (
    <details className="rounded-2xl border border-wn-charcoal/10 bg-white p-4 shadow-sm sm:p-5">
      <summary className="min-h-11 cursor-pointer list-none text-base font-bold text-wn-navy marker:content-none">
        Why these three
      </summary>
      <div className="mt-3 space-y-4 text-sm text-wn-charcoal/80">
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-wn-charcoal/55">Inputs</h4>
          <dl className="mt-1 space-y-1">
            {result.inputs.map((i) => (
              <div key={i.label} className="flex flex-col sm:flex-row sm:gap-2">
                <dt className="shrink-0 font-semibold text-wn-charcoal sm:w-32">{i.label}</dt>
                <dd>{i.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div>
          <h4 className="text-[11px] font-bold uppercase tracking-wide text-wn-charcoal/55">How the score adds up</h4>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            <li>
              Forecast snow the day before plus the day itself: +{w.snowPerInch} per inch, up to {w.snowCapIn} in.
            </li>
            <li>Snow already on the ground (measured or reported): +{w.measuredPerInch} per inch, up to {w.measuredCapIn} in.</li>
            <li>
              Surface class: powder +{w.surface.PP}, packed powder +{w.surface.PPC}, groomed +{w.surface.MG}, spring corn +
              {w.surface.WG}, frozen granular {w.surface.FG}, icy {w.surface.IP}; scaled by the surface confidence.
            </li>
            <li>Drive: −{w.drivePerHour} per hour beyond the first {w.driveFreeHours} h.</li>
            <li>
              Wind: {w.windWarning} when a lift hold is likely, {w.windHighRisk} when lifts may close (forecast gusts vs the
              resort&rsquo;s chair threshold).
            </li>
            <li>
              Crowds: moderate {w.crowd.moderate}, busy {w.crowd.busy}, packed {w.crowd.packed} (estimated).
            </li>
            <li>+{w.verifiedOpen} when the resort is verified open today; {w.rainLikely} when rain is likely.</li>
          </ul>
        </div>
        <p className="text-xs text-wn-charcoal/65">
          Candidates within reach: {result.candidateCount}. Beyond the drive cap: {result.tooFarCount}. Excluded with a
          reason: {result.excluded.length}.
        </p>
      </div>
    </details>
  );
}
