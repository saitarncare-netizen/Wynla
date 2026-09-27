// /trips — list of the signed-in user's saved trips.
// Signed out, the page explains what a trip is and opens the planner
// (GuestTrips) instead of redirecting to /login: Trips is a tab in the
// phone bar and planning works without an account (the planner asks for
// sign-in only at Save), so a login wall there hid the feature from the
// people most likely to try it.
//
// Order: scheduled trips soonest first (when trips.start_date exists,
// feature-detected off select("*")), then undated trips newest first.
// Finished trips move to a Completed section so the next plan is at
// the top, not a trip from last February (audit trip-planner-46).

import type { Metadata } from "next";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/tripTemplates";
import Button from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import PageHeader from "@/components/ui/PageHeader";
import { cx } from "@/components/ui/cx";
import GuestIntroCard from "@/components/GuestIntroCard";
import { sortTrips, tripFinished, tripStartDate, type TripListRow } from "@/lib/tripProgress";
import { pluralize, tripRouteLabel, tripStopNames } from "@/lib/tripLabels";
import Icon from "@/components/icons/Icon";
import TripDeleteButton from "./TripDeleteButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Trips",
  description: "Plan a ski trip day by day, then follow it with one-tap directions.",
  // Personal list (robots.txt disallows /trips too); the signed-out
  // explainer is not a landing page worth indexing either.
  robots: { index: false, follow: false },
};

type TripRow = TripListRow & {
  id: string;
  name: string | null;
  origin_label: string | null;
  resort_slugs: string[];
  lodging_mode: "basecamp" | "roadtrip";
  current_day: number | null;
};

function prettyDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

export default async function TripsPage() {
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return <GuestTrips />;
  }

  // select * so start_date rides along once the column exists.
  const { data, error } = await supabase
    .from("trips")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<TripRow[]>();

  if (error) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-8">
        <Notice tone="danger">Failed to load trips: {error.message}</Notice>
      </main>
    );
  }

  // "Today" in the app's cron zone rather than UTC: after about 7 pm
  // Eastern the UTC date is already tomorrow, which would file a trip
  // starting today under past trips for the whole US evening. en-CA
  // formats as ISO yyyy-mm-dd.
  const todayISO = new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York" }).format(new Date());
  const all = sortTrips(data ?? [], todayISO);
  const active = all.filter((t) => !tripFinished(t));
  const completed = all.filter(tripFinished);

  // Resolve resort names for the cards — "3-day trip · Basecamp" says
  // nothing; "Killington → Stowe" is the trip. One deduped lookup.
  const allSlugs = Array.from(new Set(all.flatMap((t) => t.resort_slugs ?? [])));
  const { data: resortNames } = allSlugs.length
    ? await supabase.from("resorts").select("slug, name").in("slug", allSlugs)
    : { data: [] as { slug: string; name: string }[] };
  const nameBySlug = new Map((resortNames ?? []).map((r) => [r.slug, r.name]));

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <PageHeader
        title="My trips"
        width="max-w-3xl"
        actions={<Button href="/?days=3&plan=1">+ New trip</Button>}
      />
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-4 sm:px-6">
        {all.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {active.length === 0 ? (
              <p className="mb-6 rounded-wn-md border border-dashed border-wn-line bg-white p-6 text-center text-sm text-wn-muted">
                Every trip here is done. Plan the next one from the map.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {active.map((trip) => (
                  <TripCard key={trip.id} trip={trip} nameBySlug={nameBySlug} />
                ))}
              </ul>
            )}

            {completed.length > 0 && (
              <section className="mt-10">
                <h2 className="mb-3 text-eyebrow font-bold uppercase text-wn-muted">Completed</h2>
                <ul className="flex flex-col gap-3">
                  {completed.map((trip) => (
                    <TripCard key={trip.id} trip={trip} nameBySlug={nameBySlug} />
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    // Same look as components/ui/EmptyState, inlined because this one
    // also lists template shortcuts under the CTA.
    <div className="flex flex-col items-center rounded-wn-md border border-dashed border-wn-line bg-white px-6 py-10 text-center">
      <span className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-full bg-wn-navy/5 text-wn-navy" aria-hidden="true">
        <Icon name="map" className="h-7 w-7" />
      </span>
      <h2 className="text-lg font-bold text-wn-navy">No trips yet</h2>
      <p className="mt-2 max-w-md text-sm text-wn-muted">
        Plan a route from the map, or start from a ready-made itinerary and change what you like.
      </p>
      <div className="mt-5">
        <Button href="/?days=3&plan=1">Plan a trip</Button>
      </div>
      <TemplateShortcuts onCard className="mt-6" />
    </div>
  );
}

// Signed-out /trips. No list to show, so the page sells the idea in
// three steps (the same promise the planner and trip page keep: pick
// mountains, save places near each one, follow it with directions) and
// hands over the planner. Sign-in is second: a guest can plan without
// it, and anyone with saved trips already knows they want it. The
// ready-made itineraries sit underneath as the low-effort start.
function GuestTrips() {
  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <PageHeader title="Trips" width="max-w-3xl" />
      <div className="mx-auto max-w-3xl px-4 pb-10 pt-4 sm:px-6">
        <GuestIntroCard
          headingId="trips-guest-title"
          icon="trips"
          title="Plan a ski trip day by day"
          steps={[
            { icon: "mountain", text: "Pick your mountains and how many days at each." },
            { icon: "pin", text: "Save restaurants and things to do near each mountain." },
            { icon: "car", text: "On the day, follow it with one-tap directions." },
          ]}
          primary={{ href: "/?plan=1", label: "Plan a trip" }}
          secondary={{ href: "/login?next=/trips", label: "Sign in to see your trips" }}
          note="Planning is free. You only sign in to save a trip."
        />
        <section aria-labelledby="trips-templates-title" className="mt-8">
          <h2 id="trips-templates-title" className="mb-3 text-eyebrow font-bold uppercase text-wn-muted">
            Or start from a ready-made trip
          </h2>
          <TemplateShortcuts />
        </section>
      </div>
    </main>
  );
}

/** The first three ready-made itineraries and a link to the rest. Used
 *  inside the white empty-state card (`onCard`: off-white tiles) and on
 *  the off-white guest page (white tiles), so the tiles read as tiles on
 *  either surface. */
function TemplateShortcuts({ onCard = false, className }: { onCard?: boolean; className?: string }) {
  return (
    <div className={cx("flex w-full flex-col", onCard ? "items-center" : "items-start", className)}>
      <ul className="grid w-full gap-2 text-left sm:grid-cols-3">
        {TEMPLATES.slice(0, 3).map((t) => (
          <li key={t.slug}>
            <Link
              href={`/trip-templates/${t.slug}`}
              className={cx(
                "block min-h-11 rounded-wn-sm border border-wn-line p-3 transition hover:border-wn-navy/40",
                onCard ? "bg-wn-offwhite" : "bg-white shadow-wn-sm",
              )}
            >
              <span className="block text-sm font-semibold text-wn-navy">{t.title}</span>
              <span className="mt-0.5 block text-xs text-wn-muted">
                {pluralize(t.daysPerResort.reduce((a, b) => a + b, 0), "day")} from {t.origin.short}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/trip-templates"
        className="mt-3 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-wn-muted hover:text-wn-navy"
      >
        All templates
        <Icon name="arrow-right" className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function TripCard({ trip, nameBySlug }: { trip: TripRow; nameBySlug: Map<string, string> }) {
  const isActive = trip.started_at != null;
  const completedDays = trip.completed_days ?? [];
  const progress = trip.total_days ? Math.round((completedDays.length / trip.total_days) * 100) : 0;
  const finished = tripFinished(trip);
  const startDate = tripStartDate(trip);
  // Stops in order, e.g. "Killington → Stowe → Sugarbush". A slug the
  // resorts table no longer has prints as a readable name, not "mohawk".
  const stopNames = tripStopNames(trip.resort_slugs, nameBySlug);
  const routeLabel = tripRouteLabel(stopNames);
  const title = trip.name ?? `${trip.total_days}-day trip`;
  return (
    <li className="flex items-stretch rounded-wn-md border border-wn-line bg-white shadow-wn-sm transition hover:border-wn-navy/30">
      <Link href={`/trip/${trip.id}`} className="block min-w-0 flex-1 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-base font-bold text-wn-navy">{title}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-eyebrow font-semibold uppercase ${
              finished
                ? "bg-wn-success-bg text-wn-success"
                : isActive
                  ? "bg-wn-navy/10 text-wn-navy"
                  : "bg-wn-line text-wn-muted"
            }`}
          >
            {finished ? "Complete" : isActive ? `Day ${trip.current_day ?? 1} of ${trip.total_days}` : "Not started"}
          </span>
        </div>
        {stopNames.length > 0 && (
          <p className="mt-1 truncate text-sm font-semibold text-wn-charcoal">{routeLabel}</p>
        )}
        <p className="mt-0.5 text-xs text-wn-muted">
          {trip.lodging_mode === "basecamp" ? "🏠 Basecamp" : "🛣️ Road trip"}
          {" · "}
          {pluralize(trip.total_days, "day")}
          {startDate ? ` · starts ${prettyDate(startDate)}` : ""}
          {trip.origin_label ? ` · from ${trip.origin_label}` : ""}
        </p>
        {isActive && !finished && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-wn-line">
            <div className="h-full rounded-full bg-wn-navy" style={{ width: `${progress}%` }} />
          </div>
        )}
      </Link>
      <div className="flex items-center pr-2">
        <TripDeleteButton tripId={trip.id} tripName={title} />
      </div>
    </li>
  );
}
