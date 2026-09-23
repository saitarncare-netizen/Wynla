// Stage 28 — public read-only view of a shared trip. Anyone with the
// token URL can see the trip name + origin + ordered stops. No login
// required; no edit actions.

import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { passColor, primaryPass } from "@/lib/passColors";
import { formatDriveTime } from "@/lib/origins";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";

export const dynamic = "force-dynamic";

type Trip = {
  id: string;
  name: string | null;
  origin_lat: number;
  origin_lng: number;
  origin_label: string | null;
  resort_slugs: string[];
  days_per_resort: number[] | null;
  total_days: number;
  created_at: string;
  /** date (YYYY-MM-DD); absent until the start_date DDL has run. */
  start_date?: string | null;
};

type ResortRow = {
  id: number;
  slug: string;
  name: string;
  state: string;
  latitude: number | string;
  longitude: number | string;
  passes: string[];
};

async function getData(token: string) {
  // Resolve the token then read the user-owned trips table with a SERVICE-ROLE
  // client so the anon client never touches trips directly (no id-enumeration
  // outside the token flow, regardless of RLS). Falls back to the anon client
  // if the service key isn't configured, keeping the feature working.
  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const db =
    svcKey && url
      ? createClient(url, svcKey, { auth: { persistSession: false } })
      : supabase;

  const { data: share } = await db
    .from("trip_shares")
    .select("trip_id, view_count")
    .eq("share_token", token)
    .maybeSingle();
  if (!share) return null;
  // Bump view count (best-effort; fire-and-forget).
  void db
    .from("trip_shares")
    .update({ view_count: ((share as { view_count: number }).view_count ?? 0) + 1 })
    .eq("share_token", token);

  const tripId = (share as { trip_id: string }).trip_id;
  // select("*") feature-detects trips.start_date for free: before the
  // DDL runs the key is simply absent from the row (no 42703, no second
  // round-trip). The row is filtered by id, so nothing extra leaks.
  const { data: trip } = await db
    .from("trips")
    .select("*")
    .eq("id", tripId)
    .maybeSingle();
  if (!trip) return null;
  const t = trip as Trip;

  const slugs = Array.from(new Set(t.resort_slugs ?? []));
  const { data: resorts } = await supabase
    .from("resorts")
    .select("id, slug, name, state, latitude, longitude, passes")
    .in("slug", slugs);
  const bySlug = new Map((resorts as ResortRow[] | null ?? []).map((r) => [r.slug, r]));
  return { trip: t, bySlug };
}

// Calendar date for ski day N when the trip has a start date. Parsed
// part-by-part so a bare date stays on that day in every time zone.
function dateForDay(startDate: string, dayIndex: number): Date {
  const [y, m, d] = startDate.split("-").map(Number);
  return new Date(y, m - 1, d + dayIndex);
}

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getData(token);
  if (!data) notFound();
  const { trip, bySlug } = data;

  const tripName = trip.name?.trim() || "Ski trip";
  const startDate =
    typeof trip.start_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(trip.start_date)
      ? trip.start_date
      : null;

  // Expand resort_slugs by days_per_resort into the day-by-day plan,
  // then compute drive legs between consecutive resorts.
  const days: { day: number; resort: ResortRow | null; slug: string }[] = [];
  if (trip.days_per_resort && trip.days_per_resort.length === trip.resort_slugs.length) {
    let dayN = 1;
    for (let i = 0; i < trip.resort_slugs.length; i++) {
      const slug = trip.resort_slugs[i];
      const resort = bySlug.get(slug) ?? null;
      const repeat = Math.max(1, trip.days_per_resort[i] ?? 1);
      for (let d = 0; d < repeat; d++) {
        days.push({ day: dayN++, resort, slug });
      }
    }
  } else {
    trip.resort_slugs.forEach((slug, i) =>
      days.push({ day: i + 1, resort: bySlug.get(slug) ?? null, slug }),
    );
  }

  // Drive legs (origin → first, between consecutive, last → home).
  // Consecutive repeats of the same resort are one stop, not a
  // zero-length "Vail → Vail" leg — trips edited from the trip page
  // are stored one slug per day, so the raw list repeats a lot.
  const legStops: ResortRow[] = [];
  for (const d of days) {
    if (!d.resort) continue;
    if (legStops[legStops.length - 1]?.slug === d.resort.slug) continue;
    legStops.push(d.resort);
  }
  const legs: number[] = [];
  let prevLat = trip.origin_lat;
  let prevLng = trip.origin_lng;
  for (const r of legStops) {
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    legs.push(estimateDriveSeconds(haversineMeters(prevLat, prevLng, lat, lng)));
    prevLat = lat;
    prevLng = lng;
  }
  const homeLeg = estimateDriveSeconds(
    haversineMeters(prevLat, prevLng, trip.origin_lat, trip.origin_lng),
  );

  const firstResort = legStops[0];
  const heroPrimary = firstResort ? primaryPass(firstResort.passes) : "indy";
  const heroAccent = passColor(heroPrimary);
  const dateFormat: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  const startLabel = startDate
    ? dateForDay(startDate, 0).toLocaleDateString("en-US", { ...dateFormat, year: "numeric" })
    : null;
  const endLabel =
    startDate && days.length > 1
      ? dateForDay(startDate, days.length - 1).toLocaleDateString("en-US", { ...dateFormat, year: "numeric" })
      : null;

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <header
        className="relative w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${heroAccent} 0%, #1E2952 60%, #0F1530 100%)`,
        }}
      >
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <Link
            href="/"
            className="mb-4 inline-flex items-center gap-1 rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-wn-navy shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            ← Wynla
          </Link>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
            🛣️ Shared trip · {trip.total_days} day{trip.total_days === 1 ? "" : "s"}
            {trip.origin_label ? " · from " + trip.origin_label : ""}
          </p>
          <h1 className="text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
            {tripName}
          </h1>
          {startLabel && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/95 backdrop-blur-sm">
              📅 <span>{endLabel ? `${startLabel} – ${endLabel}` : startLabel}</span>
            </p>
          )}
          <p className="mt-3 text-xs text-white/75">
            Shared {new Date(trip.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
        <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
          Day-by-day
        </h2>
        <ol className="flex flex-col gap-2">
          {days.map((d) => (
            <li
              key={d.day}
              className="flex items-center gap-3 rounded-lg border border-wn-charcoal/10 bg-white p-3"
            >
              <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-wn-navy text-[11px] font-bold text-white">
                {d.day}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-bold text-wn-navy">
                  {d.resort?.name ?? d.slug}
                </div>
                <div className="text-[11px] text-wn-charcoal/55">
                  {startDate
                    ? dateForDay(startDate, d.day - 1).toLocaleDateString("en-US", dateFormat)
                    : `Day ${d.day}`}
                  {d.resort?.state ? ` · ${d.resort.state}` : ""}
                </div>
              </div>
              {d.resort && (
                <Link
                  href={`/resort/${d.slug}`}
                  className="text-[11px] font-semibold text-wn-charcoal/60 underline-offset-2 hover:text-wn-navy hover:underline"
                >
                  View
                </Link>
              )}
            </li>
          ))}
        </ol>

        <div className="mt-6 rounded-lg border border-wn-charcoal/10 bg-white p-4">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
            Drive summary
          </h3>
          <ul className="space-y-1 text-sm text-wn-charcoal">
            {legStops.map((r, i) => (
              <li key={`${r.slug}-${i}`} className="flex justify-between gap-3">
                <span>
                  {i === 0 ? "Home" : legStops[i - 1].name} → {r.name}
                </span>
                <span className="font-semibold text-wn-navy">
                  ≈ {formatDriveTime(legs[i])}
                </span>
              </li>
            ))}
            {legStops.length > 0 && (
              <li className="flex justify-between gap-3">
                <span>{legStops[legStops.length - 1].name} → Home</span>
                <span className="font-semibold text-wn-navy">≈ {formatDriveTime(homeLeg)}</span>
              </li>
            )}
          </ul>
          <p className="mt-2 text-[10px] text-wn-charcoal/50">
            Drive times are straight-line estimates, not live traffic.
          </p>
        </div>

        <p className="mt-6 text-center text-[11px] text-wn-charcoal/50">
          This is a read-only view of someone&apos;s trip plan.{" "}
          <Link href="/" className="font-semibold text-wn-navy underline">
            Plan your own at Wynla
          </Link>
        </p>
      </div>
    </main>
  );
}
