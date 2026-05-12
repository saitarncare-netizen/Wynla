// Stage 28 — public read-only view of a shared trip. Anyone with the
// token URL can see the trip name + origin + ordered stops. No login
// required; no edit actions.

import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { passColor, primaryPass } from "@/lib/passColors";
import { formatDriveTime } from "@/lib/origins";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";

export const dynamic = "force-dynamic";

type Trip = {
  id: number;
  name: string;
  origin_lat: number;
  origin_lng: number;
  origin_label: string | null;
  resort_slugs: string[];
  days_per_resort: number[] | null;
  total_days: number;
  created_at: string;
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
  const { data: share } = await supabase
    .from("trip_shares")
    .select("trip_id, view_count")
    .eq("share_token", token)
    .maybeSingle();
  if (!share) return null;
  // Bump view count (best-effort; ignore errors). Anyone-can-update
  // would normally violate RLS, but view_count is non-sensitive.
  // We fire-and-forget; if RLS blocks it, the count just stops.
  void supabase
    .from("trip_shares")
    .update({ view_count: ((share as { view_count: number }).view_count ?? 0) + 1 })
    .eq("share_token", token);

  const tripId = (share as { trip_id: number }).trip_id;
  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, name, origin_lat, origin_lng, origin_label, resort_slugs, days_per_resort, total_days, created_at",
    )
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

export default async function SharedTripPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const data = await getData(token);
  if (!data) notFound();
  const { trip, bySlug } = data;

  // Expand resort_slugs by days_per_resort into the day-by-day plan,
  // then compute drive legs between consecutive resorts.
  const days: { day: number; resort: ResortRow | null; slug: string }[] = [];
  if (trip.days_per_resort && trip.days_per_resort.length === trip.resort_slugs.length) {
    let dayN = 1;
    for (let i = 0; i < trip.resort_slugs.length; i++) {
      const slug = trip.resort_slugs[i];
      const resort = bySlug.get(slug) ?? null;
      const repeat = trip.days_per_resort[i];
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
  const legs: number[] = [];
  let prevLat = trip.origin_lat;
  let prevLng = trip.origin_lng;
  const uniqueOrdered: ResortRow[] = [];
  for (const slug of trip.resort_slugs) {
    const r = bySlug.get(slug);
    if (r) uniqueOrdered.push(r);
  }
  for (const r of uniqueOrdered) {
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    legs.push(estimateDriveSeconds(haversineMeters(prevLat, prevLng, lat, lng)));
    prevLat = lat;
    prevLng = lng;
  }
  const homeLeg = estimateDriveSeconds(
    haversineMeters(prevLat, prevLng, trip.origin_lat, trip.origin_lng),
  );

  const firstResort = uniqueOrdered[0];
  const heroPrimary = firstResort ? primaryPass(firstResort.passes) : "indy";
  const heroAccent = passColor(heroPrimary);

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
            {trip.name}
          </h1>
          <p className="mt-3 text-xs text-white/75">
            Shared {new Date(trip.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
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
                {d.resort?.state && (
                  <div className="text-[11px] text-wn-charcoal/55">{d.resort.state}</div>
                )}
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
            {uniqueOrdered.map((r, i) => (
              <li key={r.slug} className="flex justify-between gap-3">
                <span>
                  {i === 0 ? "Home" : uniqueOrdered[i - 1].name} → {r.name}
                </span>
                <span className="font-semibold text-wn-navy">
                  ≈ {formatDriveTime(legs[i])}
                </span>
              </li>
            ))}
            {uniqueOrdered.length > 0 && (
              <li className="flex justify-between gap-3">
                <span>{uniqueOrdered[uniqueOrdered.length - 1].name} → Home</span>
                <span className="font-semibold text-wn-navy">≈ {formatDriveTime(homeLeg)}</span>
              </li>
            )}
          </ul>
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
