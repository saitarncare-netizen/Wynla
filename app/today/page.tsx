// /today — "My mountains today": the 6 am screen. One row per saved
// resort with a Go / Wait / Skip / Unknown verdict, a one-line reason
// and every number labelled with its source and time; a powder banner
// when any favorite crosses 6 in; the next trip; and a footer that says
// how old the data is. Auth-guarded (redirects to /login?next=/today).
//
// Server component: the verdicts are computed once here from the same
// rows the resort panel reads (app/today/data.ts), so a phone renders
// static HTML plus three tiny client islands (local clock, "updated N
// min ago", pass-blackout note from localStorage preferences).

import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passColor, primaryPass } from "@/lib/passColors";
import { formatStampInZone } from "@/lib/sunTimes";
import { isPowderDay, POWDER_IN } from "@/lib/goWaitSkip";
import { loadNextTrip, loadTodayRows, type NextTrip, type TodayRow } from "./data";
import { BlackoutNote, LocalDate, RowThumb, UpdatedAgo } from "./ClientBits";
import VerdictPill from "./VerdictPill";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today",
  description: "Go, wait or skip: this morning's call for every mountain you saved.",
  // Personal, signed-in only: nothing here for a crawler.
  robots: { index: false, follow: false },
};

export default async function TodayPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    redirect("/login?next=/today");
  }

  const now = new Date();
  const todayUTC = now.toISOString().slice(0, 10);
  const [today, nextTrip, profileRes] = await Promise.all([
    loadTodayRows(supabase, { now, withHistory: true }),
    loadNextTrip(supabase, todayUTC),
    supabase.from("profiles").select("display_name").eq("id", user.id).maybeSingle(),
  ]);
  const displayName = (profileRes.data as { display_name: string | null } | null)?.display_name?.trim() || null;

  const rows = today.rows;
  const powder = rows.filter((r) => isPowderDay(r.verdict));
  const allDormant = rows.length > 0 && rows.every((r) => r.verdict.dormant);
  const serverDate = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 pb-10 pt-6 sm:px-6 sm:pt-10">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="mb-4 inline-flex min-h-11 items-center text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
        >
          ← Map
        </Link>

        <header className="mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
            <LocalDate fallback={`${serverDate} · UTC`} />
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-wn-navy sm:text-3xl">
            {displayName ? `${displayName}, your mountains today` : "My mountains today"}
          </h1>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            {rows.length === 0
              ? "Save a mountain and it shows up here every morning."
              : allDormant
                ? "Nothing is running yet. Verdicts start the day the lifts spin."
                : "One call per mountain, with the reason and where each number came from."}
          </p>
        </header>

        {today.error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            Failed to load favorites: {today.error}
          </p>
        )}

        {powder.length > 0 && <PowderBanner rows={powder} />}

        {rows.length === 0 && !today.error ? (
          <EmptyState />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <TodayRowCard key={row.resort.id} row={row} />
            ))}
          </ul>
        )}

        {allDormant && (
          <p className="mt-3 text-xs text-wn-charcoal/60">
            Each row shows the opening date we have. Once a mountain reports open, its row switches to Go, Wait or Skip
            with the reason.
          </p>
        )}

        <NextTripCard trip={nextTrip} />

        <DataFooter updatedAt={today.weatherUpdatedAt} unsynced={today.unsynced} hasRows={rows.length > 0} />
      </div>
    </main>
  );
}

// ---------- Pieces ----------

function PowderBanner({ rows }: { rows: TodayRow[] }) {
  const parts = rows.map((r) => {
    const v = r.verdict;
    const measured = v.newSnow && v.newSnow.source !== "Forecast" ? v.newSnow : null;
    const n = measured ? measured.inches : (v.forecastSnowToday ?? 0);
    const source = measured ? measured.source.toLowerCase() : "forecast";
    return `${r.resort.name} ${Math.round(n * 10) / 10} in ${source}`;
  });
  return (
    <div
      role="status"
      className="mb-4 rounded-xl bg-wn-navy px-4 py-3 text-white shadow-sm ring-1 ring-wn-sky/40"
    >
      <p className="text-sm font-extrabold">
        <span aria-hidden="true">❄️ </span>
        Powder day
      </p>
      <p className="mt-0.5 text-xs text-white/85">
        {parts.join(" · ")}. {POWDER_IN} in or more counts. Forecast totals are not measured yet.
      </p>
    </div>
  );
}

function TodayRowCard({ row }: { row: TodayRow }) {
  const { resort, verdict: v } = row;
  const color = passColor(primaryPass(resort.passes ?? []));
  const labels = v.labels.slice(0, 4);
  return (
    <li>
      <Link
        href={`/resort/${resort.slug}`}
        className="flex gap-3 rounded-xl border border-wn-charcoal/10 bg-white p-3 shadow-sm transition hover:border-wn-navy/30 active:bg-wn-offwhite"
      >
        <RowThumb
          src={resort.hero_image_url}
          alt={resort.hero_image_alt ?? resort.name}
          initial={resort.name.charAt(0)}
          color={color}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-wn-navy">{resort.name}</h2>
              <p className="text-[11px] text-wn-charcoal/55">
                {resort.state}
                {resort.region ? ` · ${resort.region}` : ""}
              </p>
            </div>
            <VerdictPill v={v} />
          </div>
          <p className="mt-1.5 text-[13px] font-semibold leading-snug text-wn-charcoal">
            {v.dormant ? v.status.label : v.headline}
            {!v.dormant && v.verdict !== "unknown" && (
              <span className="ml-1 font-normal text-wn-charcoal/55">· {v.confidence} confidence</span>
            )}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-wn-charcoal/75">{v.reasons[0]}</p>
          {labels.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-wn-charcoal/65">
              {labels.map((l) => (
                <li key={`${l.text}-${l.source}`} className="whitespace-nowrap">
                  <span className="font-medium text-wn-charcoal/80">{l.text}</span>
                  <span className="text-wn-charcoal/50">
                    {" · "}
                    {l.source}
                    {l.at ? ` ${formatStampInZone(new Date(l.at), v.timeZone)}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {!v.dormant && v.blackout == null && <BlackoutNote slug={resort.slug} dateISO={v.todayISO} />}
        </div>
      </Link>
    </li>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-wn-charcoal/20 bg-white p-8 text-center">
      <div className="mb-2 text-3xl" aria-hidden="true">
        🏔️
      </div>
      <h2 className="text-base font-bold text-wn-navy">Save a mountain</h2>
      <p className="mx-auto mt-1 max-w-xs text-sm text-wn-charcoal/70">
        Tap the heart on any resort. Every morning it shows up here with a Go, Wait or Skip and the reason.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
      >
        Open the map
      </Link>
    </div>
  );
}

function formatTripDate(iso: string): string {
  return new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function NextTripCard({ trip }: { trip: NextTrip | null }) {
  return (
    <section className="mt-6 rounded-xl border border-wn-charcoal/10 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-wn-navy">{trip?.upcoming ? "Next trip" : "Latest trip"}</h2>
        <Link href="/trips" className="inline-flex min-h-11 items-center text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy">
          All trips →
        </Link>
      </div>
      {trip ? (
        <Link href={`/trip/${trip.id}`} className="mt-1 block rounded-lg transition hover:bg-wn-offwhite">
          <p className="text-base font-bold text-wn-navy">{trip.name ?? `${trip.total_days}-day trip`}</p>
          {trip.stopNames.length > 0 && (
            <p className="truncate text-[13px] font-semibold text-wn-charcoal/80">
              {trip.stopNames.slice(0, 3).join(" → ")}
              {trip.stopNames.length > 3 ? ` +${trip.stopNames.length - 3}` : ""}
            </p>
          )}
          <p className="mt-0.5 text-xs text-wn-charcoal/65">
            {trip.start_date
              ? `Starts ${formatTripDate(trip.start_date)}`
              : trip.started_at
                ? "In progress"
                : "No date set"}
            {" · "}
            {trip.total_days} days
            {trip.lodging_mode ? ` · ${trip.lodging_mode === "basecamp" ? "Basecamp" : "Road trip"}` : ""}
          </p>
        </Link>
      ) : (
        <div className="mt-1">
          <p className="text-sm text-wn-charcoal/70">No trips yet. Plan a multi-day route from the map.</p>
          <Link
            href="/?days=3&plan=1"
            className="mt-3 inline-flex min-h-11 items-center rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            Plan a trip
          </Link>
        </div>
      )}
    </section>
  );
}

function DataFooter({
  updatedAt,
  unsynced,
  hasRows,
}: {
  updatedAt: string | null;
  unsynced: string[];
  hasRows: boolean;
}) {
  return (
    <footer className="mt-6 text-[11px] leading-relaxed text-wn-charcoal/55">
      <p>
        {hasRows && updatedAt ? (
          <>
            All weather updated <UpdatedAgo iso={updatedAt} />
            {unsynced.length > 0 ? ` (${unsynced.join(", ")} not synced yet)` : ""}
          </>
        ) : hasRows ? (
          "Weather has not synced for these mountains yet"
        ) : (
          "Weather refreshes daily before dawn"
        )}
        {" · "}
        Measured snow: NOAA snowfall analysis and SNOTEL · Forecast: NWS and Open-Meteo · Estimated: our own models
      </p>
      <p className="mt-1">
        <Link href="/data-sources" className="font-semibold text-wn-navy hover:underline">
          Data sources
        </Link>
        {" · "}
        <a href="/api/health" className="font-semibold text-wn-navy hover:underline">
          Pipeline health
        </a>
      </p>
    </footer>
  );
}
