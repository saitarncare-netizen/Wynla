// /trips — list of the signed-in user's saved trips.
// Auth-guarded: redirects to /login?next=/trips if not signed in.
//
// Order: scheduled trips soonest first (when trips.start_date exists,
// feature-detected off select("*")), then undated trips newest first.
// Finished trips move to a Completed section so the next plan is at
// the top, not a trip from last February (audit trip-planner-46).

import Link from "next/link";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TEMPLATES } from "@/lib/tripTemplates";
import { sortTrips, tripFinished, tripStartDate, type TripListRow } from "@/lib/tripProgress";
import TripDeleteButton from "./TripDeleteButton";

export const dynamic = "force-dynamic";

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
    redirect("/login?next=/trips");
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
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          Failed to load trips: {error.message}
        </p>
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
    <main className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <Link
              href="/"
              className="mb-2 inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
            >
              ← Map
            </Link>
            <h1 className="text-3xl font-extrabold tracking-tight text-wn-navy sm:text-4xl">My trips</h1>
          </div>
          <Link
            href="/?days=3&plan=1"
            className="inline-flex min-h-11 items-center rounded-lg bg-wn-navy px-4 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            + New trip
          </Link>
        </header>

        {all.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {active.length === 0 ? (
              <p className="mb-6 rounded-xl border border-dashed border-wn-charcoal/20 bg-white p-6 text-center text-sm text-wn-charcoal/70">
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
                <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
                  Completed
                </h2>
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
    <div className="rounded-xl border border-dashed border-wn-charcoal/20 bg-white p-8 text-center sm:p-10">
      <div className="mx-auto mb-3 text-4xl" aria-hidden="true">
        🗺️
      </div>
      <h2 className="mb-1 text-lg font-bold text-wn-navy">No trips yet</h2>
      <p className="mb-4 text-sm text-wn-charcoal/70">
        Plan a route from the map, or start from a ready-made itinerary and change what you like.
      </p>
      <Link
        href="/?days=3&plan=1"
        className="inline-flex min-h-11 items-center rounded-md bg-wn-navy px-4 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
      >
        Plan a trip
      </Link>
      <ul className="mt-6 grid gap-2 text-left sm:grid-cols-3">
        {TEMPLATES.slice(0, 3).map((t) => (
          <li key={t.slug}>
            <Link
              href={`/trip-templates/${t.slug}`}
              className="block min-h-11 rounded-lg border border-wn-charcoal/10 bg-wn-offwhite p-3 transition hover:border-wn-navy/40"
            >
              <span className="block text-sm font-semibold text-wn-navy">{t.title}</span>
              <span className="mt-0.5 block text-[11px] text-wn-charcoal/60">
                {t.daysPerResort.reduce((a, b) => a + b, 0)} days from {t.origin.short}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <Link
        href="/trip-templates"
        className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
      >
        All templates →
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
  // Unique stops in order, e.g. "Killington → Stowe → Sugarbush".
  const stopNames: string[] = [];
  for (const s of trip.resort_slugs ?? []) {
    const n = nameBySlug.get(s) ?? s;
    if (stopNames[stopNames.length - 1] !== n) stopNames.push(n);
  }
  const routeLabel = stopNames.slice(0, 3).join(" → ") + (stopNames.length > 3 ? ` +${stopNames.length - 3}` : "");
  const title = trip.name ?? `${trip.total_days}-day trip`;
  return (
    <li className="flex items-stretch rounded-xl border border-wn-charcoal/10 bg-white shadow-sm transition hover:border-wn-navy/30">
      <Link href={`/trip/${trip.id}`} className="block min-w-0 flex-1 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="truncate text-base font-bold text-wn-navy">{title}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
              finished
                ? "bg-emerald-100 text-emerald-800"
                : isActive
                  ? "bg-wn-navy/10 text-wn-navy"
                  : "bg-wn-charcoal/10 text-wn-charcoal/70"
            }`}
          >
            {finished ? "Complete" : isActive ? `Day ${trip.current_day ?? 1} of ${trip.total_days}` : "Not started"}
          </span>
        </div>
        {stopNames.length > 0 && (
          <p className="mt-1 truncate text-[13px] font-semibold text-wn-charcoal/80">{routeLabel}</p>
        )}
        <p className="mt-0.5 text-xs text-wn-charcoal/65">
          {trip.lodging_mode === "basecamp" ? "🏠 Basecamp" : "🛣️ Road trip"}
          {" · "}
          {trip.total_days} days
          {startDate ? ` · starts ${prettyDate(startDate)}` : ""}
          {trip.origin_label ? ` · from ${trip.origin_label}` : ""}
        </p>
        {isActive && !finished && (
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-wn-charcoal/10">
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
