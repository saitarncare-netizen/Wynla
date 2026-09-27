// /today — "My mountains today": the 6 am screen. One row per saved
// resort with a Go / Wait / Skip / Unknown verdict, a one-line reason
// and every number labelled with its source and time; a powder banner
// when any favorite crosses 6 in; the next trip; and a footer that says
// how old the data is. Signed out, it shows what the call is and how to
// get one (GuestToday) instead of redirecting to /login from a tab bar
// item.
//
// Server component: the verdicts are computed once here from the same
// rows the resort panel reads (app/today/data.ts), so a phone renders
// static HTML plus three tiny client islands (local clock, "updated N
// min ago", pass-blackout note from localStorage preferences).

import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passColor, primaryPass } from "@/lib/passColors";
import { formatStampInZone } from "@/lib/sunTimes";
import { isPowderDay, POWDER_IN } from "@/lib/goWaitSkip";
import { localDate } from "@/lib/weather/time";
import { pluralize, tripRouteLabel } from "@/lib/tripLabels";
import { loadNextTrip, loadTodayRows, type NextTrip, type TodayRow } from "./data";
import { BlackoutNote, LocalDate, RowThumb, UpdatedAgo } from "./ClientBits";
import VerdictPill from "./VerdictPill";
import Icon from "@/components/icons/Icon";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Notice from "@/components/ui/Notice";
import PageHeader from "@/components/ui/PageHeader";
import GuestIntroCard from "@/components/GuestIntroCard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Today",
  description: "Go, wait or skip: this morning's call for every mountain you saved.",
  // Personal: the signed-in page is per user and the signed-out one is
  // only an explainer, so nothing here for a crawler.
  robots: { index: false, follow: false },
};

export default async function TodayPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return <GuestToday />;
  }

  const now = new Date();
  // The verdict rows use each resort's own calendar day. The trip card
  // does not know its resorts' zones before it has picked a trip, so it
  // uses the earliest calendar day anywhere in the US (Alaska): a trip
  // that starts today never drops off the card while the day is still
  // running in its own zone, at the cost of lingering a few hours into
  // the next morning on the East Coast. UTC would drop a same-day trip
  // at 7 pm Eastern.
  const tripFloorISO = localDate(now, "America/Anchorage");
  const [today, nextTrip, profileRes] = await Promise.all([
    loadTodayRows(supabase, { now, withHistory: true }),
    loadNextTrip(supabase, tripFloorISO),
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
    <main className="min-h-dvh bg-wn-offwhite pb-10">
      <PageHeader
        width="max-w-2xl"
        eyebrow={<LocalDate fallback={`${serverDate} · UTC`} />}
        title={displayName ? `${displayName}, your mountains today` : "My mountains today"}
        description={
          rows.length === 0
            ? "Save a mountain and it shows up here every morning."
            : allDormant
              ? "Nothing is running yet. Verdicts start the day the lifts spin."
              : "One call per mountain, with the reason and where each number came from."
        }
      />

      <div className="mx-auto mt-5 max-w-2xl px-4 sm:px-6">
        {today.error && (
          <Notice tone="danger" className="mb-4">
            Failed to load favorites: {today.error}
          </Notice>
        )}

        {powder.length > 0 && <PowderBanner rows={powder} />}

        {rows.length === 0 && !today.error ? (
          <EmptyState
            icon="mountain"
            title={
              <span role="heading" aria-level={2}>
                Save a mountain
              </span>
            }
            body="Tap the heart on any resort. Every morning it shows up here with a Go, Wait or Skip and the reason."
            action={<Button href="/">Open the map</Button>}
          />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {rows.map((row) => (
              <TodayRowCard key={row.resort.id} row={row} />
            ))}
          </ul>
        )}

        {allDormant && (
          <p className="mt-3 text-xs text-wn-muted">
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

// Signed-out /today. The call needs a saved list, and a guest's hearts
// live on the device (lib/guestFavorites) where this server page cannot
// read them; they move into the account on sign-in. So the page says
// what the call is and the two steps that unlock it, with the map as
// the thing to do right now. The Saturday pick needs no account, so it
// is offered as the useful answer for someone who is not ready to sign
// in.
function GuestToday() {
  return (
    <main className="min-h-dvh bg-wn-offwhite pb-10">
      {/* Title only, like the guest /trips header: the card below does the
          explaining, so the header does not say it a third time. */}
      <PageHeader width="max-w-2xl" title="Today" />
      <div className="mx-auto mt-5 max-w-2xl px-4 sm:px-6">
        <GuestIntroCard
          headingId="today-guest-title"
          icon="sun"
          title="Go, Wait or Skip, every morning"
          body="One call for each mountain you save, with the reason behind it."
          steps={[
            {
              icon: "heart",
              text: (
                <>
                  Save mountains with <span aria-hidden="true">♡</span>
                  <span className="sr-only">the heart</span> on the map.
                </>
              ),
            },
            { icon: "user", text: "Sign in to get your daily call." },
          ]}
          primary={{ href: "/", label: "Browse the map" }}
          secondary={{ href: "/login?next=/today", label: "Sign in" }}
        />
        <Card href="/go" className="mt-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-wn-navy/5 text-wn-navy"
              aria-hidden="true"
            >
              <Icon name="compass" className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-wn-navy">Where to ride this Saturday</p>
              <p className="mt-0.5 text-xs text-wn-muted">Picks for your pass from your city. No account needed.</p>
            </div>
            <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-wn-subtle" />
          </div>
        </Card>
      </div>
    </main>
  );
}

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
      className="on-dark mb-4 rounded-wn-md bg-wn-navy px-4 py-3 text-white shadow-wn-sm ring-1 ring-wn-sky/40"
    >
      <p className="flex items-center gap-1.5 text-sm font-extrabold">
        <Icon name="snowflake" className="h-4 w-4 shrink-0 text-wn-sky" />
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
        className="flex gap-3 rounded-wn-md border border-wn-line bg-white p-3 shadow-wn-sm transition hover:border-wn-navy/30 active:bg-wn-offwhite"
      >
        <RowThumb
          src={row.hero.thumb}
          alt={row.hero.alt || resort.name}
          initial={resort.name.charAt(0)}
          color={color}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-sm font-bold text-wn-navy">{resort.name}</h2>
              <p className="text-xs text-wn-muted">
                {resort.state}
                {resort.region ? ` · ${resort.region}` : ""}
              </p>
            </div>
            <VerdictPill v={v} />
          </div>
          <p className="mt-1.5 text-sm font-semibold leading-snug text-wn-charcoal">
            {v.dormant ? v.status.label : v.headline}
            {!v.dormant && v.verdict !== "unknown" && (
              <span className="ml-1 font-normal text-wn-muted">· {v.confidence} confidence</span>
            )}
          </p>
          <p className="mt-0.5 text-xs leading-snug text-wn-muted">{v.reasons[0]}</p>
          {labels.length > 0 && (
            <ul className="mt-1.5 flex flex-wrap gap-x-2 gap-y-1 text-xs text-wn-muted">
              {labels.map((l) => (
                <li key={`${l.text}-${l.source}`} className="whitespace-nowrap">
                  <span className="font-medium text-wn-charcoal/80">{l.text}</span>
                  <span className="text-wn-muted">
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
    <Card className="mt-6">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-wn-navy">{trip?.upcoming ? "Next trip" : "Latest trip"}</h2>
        <Link href="/trips" className="inline-flex min-h-11 items-center text-xs font-semibold text-wn-muted hover:text-wn-navy">
          All trips →
        </Link>
      </div>
      {trip ? (
        <Link href={`/trip/${trip.id}`} className="mt-1 block rounded-wn-sm transition hover:bg-wn-offwhite">
          <p className="text-base font-bold text-wn-navy">{trip.name ?? `${trip.total_days}-day trip`}</p>
          {trip.stopNames.length > 0 && (
            <p className="truncate text-sm font-semibold text-wn-charcoal/80">{tripRouteLabel(trip.stopNames)}</p>
          )}
          <p className="mt-0.5 text-xs text-wn-muted">
            {trip.start_date
              ? `Starts ${formatTripDate(trip.start_date)}`
              : trip.started_at
                ? "In progress"
                : "No date set"}
            {" · "}
            {pluralize(trip.total_days, "day")}
            {trip.lodging_mode ? ` · ${trip.lodging_mode === "basecamp" ? "Basecamp" : "Road trip"}` : ""}
          </p>
        </Link>
      ) : (
        <div className="mt-1">
          <p className="text-sm text-wn-muted">No trips yet. Plan a multi-day route from the map.</p>
          <Button href="/?days=3&plan=1" className="mt-3">
            Plan a trip
          </Button>
        </div>
      )}
    </Card>
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
    <footer className="mt-6 text-xs leading-relaxed text-wn-muted">
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
