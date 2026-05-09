// /trip/[id] — single saved trip view with day-by-day itinerary, the
// "Start trip" button, and per-day check-in. RLS makes this implicitly
// owner-only — a different user requesting this id gets a 404.

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passColor, primaryPass, passLabel } from "@/lib/passColors";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";
import { formatDriveTime } from "@/lib/origins";
import TripActions from "./TripActions";

export const dynamic = "force-dynamic";

type Trip = {
  id: string;
  user_id: string;
  name: string | null;
  origin_lat: number;
  origin_lng: number;
  origin_label: string | null;
  resort_slugs: string[];
  lodging_mode: "basecamp" | "roadtrip";
  total_days: number;
  started_at: string | null;
  current_day: number | null;
  completed_days: number[];
  created_at: string;
};

type ResortRow = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: string | null;
  latitude: number | string;
  longitude: number | string;
  passes: string[];
  vertical_drop: number | null;
  total_trails: number | null;
};

export default async function TripPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    redirect(`/login?next=/trip/${id}`);
  }

  const { data: tripData, error: tripErr } = await supabase
    .from("trips")
    .select(
      "id, user_id, name, origin_lat, origin_lng, origin_label, resort_slugs, lodging_mode, total_days, started_at, current_day, completed_days, created_at",
    )
    .eq("id", id)
    .maybeSingle<Trip>();

  if (tripErr) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-8">
        <p className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          Failed to load trip: {tripErr.message}
        </p>
      </main>
    );
  }
  if (!tripData) notFound();

  const trip = tripData;

  // Pull resort details for every slug in the itinerary (deduped) to
  // render the day cards. Dedup matters in basecamp mode where the same
  // slug repeats `total_days` times.
  const uniqueSlugs = Array.from(new Set(trip.resort_slugs));
  const { data: resortData } = await supabase
    .from("resorts")
    .select("id, slug, name, state, region, latitude, longitude, passes, vertical_drop, total_trails")
    .in("slug", uniqueSlugs)
    .returns<ResortRow[]>();
  const bySlug = new Map((resortData ?? []).map((r) => [r.slug, r]));

  // Build legs from origin → r1 → r2 → … using Haversine estimates.
  // Exact times can be computed client-side later via Mapbox Matrix.
  const legs: { fromLabel: string; toSlug: string; driveSeconds: number }[] = [];
  let cursor = { lat: trip.origin_lat, lng: trip.origin_lng, label: trip.origin_label ?? "Start" };
  let prevSlug: string | null = null;
  for (let i = 0; i < trip.resort_slugs.length; i++) {
    const slug = trip.resort_slugs[i];
    const r = bySlug.get(slug);
    if (!r) {
      legs.push({ fromLabel: cursor.label, toSlug: slug, driveSeconds: 0 });
      continue;
    }
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    const sameAsPrev = prevSlug === slug;
    const meters = sameAsPrev ? 0 : haversineMeters(cursor.lat, cursor.lng, lat, lng);
    legs.push({
      fromLabel: cursor.label,
      toSlug: slug,
      driveSeconds: sameAsPrev ? 0 : estimateDriveSeconds(meters),
    });
    cursor = { lat, lng, label: r.name };
    prevSlug = slug;
  }
  // Drive home leg
  const last = bySlug.get(trip.resort_slugs[trip.resort_slugs.length - 1]);
  const homeLegSeconds = last
    ? estimateDriveSeconds(
        haversineMeters(
          Number(last.latitude),
          Number(last.longitude),
          trip.origin_lat,
          trip.origin_lng,
        ),
      )
    : 0;
  const totalDriveSeconds =
    legs.reduce((s, l) => s + l.driveSeconds, 0) + homeLegSeconds;

  const isActive = trip.started_at != null;
  const currentDay = trip.current_day ?? 0;
  const completedSet = new Set(trip.completed_days);
  const tripFinished = isActive && completedSet.size >= trip.total_days;

  // Google Maps multi-waypoint URL. Round-trip from origin → resorts in
  // order → back to origin. Dedupes consecutive repeats (basecamp mode
  // where the same resort fills every day). Caps to 9 waypoints which
  // is the Maps URL limit.
  const dedupedWaypointSlugs: string[] = [];
  for (const slug of trip.resort_slugs) {
    if (dedupedWaypointSlugs[dedupedWaypointSlugs.length - 1] !== slug) {
      dedupedWaypointSlugs.push(slug);
    }
  }
  const waypointCoords = dedupedWaypointSlugs
    .slice(0, 9)
    .map((slug) => bySlug.get(slug))
    .filter((r): r is ResortRow => r != null)
    .map((r) => `${Number(r.latitude)},${Number(r.longitude)}`);
  const googleMapsUrl =
    waypointCoords.length === 0
      ? null
      : `https://www.google.com/maps/dir/?api=1&travelmode=driving` +
        `&origin=${trip.origin_lat},${trip.origin_lng}` +
        `&destination=${trip.origin_lat},${trip.origin_lng}` +
        `&waypoints=${encodeURIComponent(waypointCoords.join("|"))}`;

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4">
          <Link
            href="/trips"
            className="inline-flex items-center gap-1 text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
          >
            ← All trips
          </Link>
        </div>

        <header className="mb-6">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-wn-charcoal/55">
            {trip.lodging_mode === "basecamp" ? "🏠 Basecamp" : "🛣️ Road trip"}
            {" · "}
            {trip.total_days} day{trip.total_days === 1 ? "" : "s"}
            {trip.origin_label ? ` · from ${trip.origin_label}` : ""}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-wn-navy sm:text-4xl">
            {trip.name ?? `${trip.total_days}-day trip`}
          </h1>
          <p className="mt-1 text-xs text-wn-charcoal/55">
            Total drive time across the trip: ≈ {formatDriveTime(totalDriveSeconds)}
          </p>
        </header>

        <TripActions
          tripId={trip.id}
          isActive={isActive}
          tripFinished={tripFinished}
          currentDay={currentDay}
          totalDays={trip.total_days}
          googleMapsUrl={googleMapsUrl}
        />

        <ol className="mt-6 flex flex-col gap-3">
          {trip.resort_slugs.map((slug, i) => {
            const dayNum = i + 1;
            const r = bySlug.get(slug);
            const leg = legs[i];
            const completed = completedSet.has(dayNum);
            const isCurrent = isActive && currentDay === dayNum;
            const isFuture = isActive && dayNum > currentDay && !completed;
            const stayPut = leg.driveSeconds === 0 && i > 0;
            const primary = primaryPass(r?.passes ?? []);
            const dot = passColor(primary);
            return (
              <li
                key={i}
                className={`rounded-xl border bg-white p-4 transition ${
                  isCurrent
                    ? "border-wn-navy ring-2 ring-wn-navy/20"
                    : completed
                      ? "border-wn-charcoal/10 opacity-70"
                      : "border-wn-charcoal/10"
                }`}
              >
                <div className="mb-1 flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
                  <span>
                    Day {dayNum}
                    {completed && <span className="ml-2 text-emerald-700">✓ done</span>}
                    {isCurrent && <span className="ml-2 text-wn-navy">today</span>}
                    {isFuture && <span className="ml-2 text-wn-charcoal/45">upcoming</span>}
                  </span>
                  <span className="text-wn-charcoal/45 normal-case tracking-normal">
                    {stayPut ? "stay put" : `≈ ${formatDriveTime(leg.driveSeconds)} drive`}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full"
                    style={{ backgroundColor: dot }}
                    aria-hidden="true"
                  />
                  {r ? (
                    <Link
                      href={`/resort/${r.slug}`}
                      className="text-base font-bold text-wn-navy hover:underline"
                    >
                      {r.name}
                    </Link>
                  ) : (
                    <span className="text-base font-bold text-wn-charcoal/55">{slug}</span>
                  )}
                  {r && (
                    <span className="text-[11px] text-wn-charcoal/55">{r.state}</span>
                  )}
                </div>
                {r && (r.passes ?? []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(r.passes ?? []).slice(0, 4).map((p) => (
                      <span
                        key={p}
                        className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
                        style={{ backgroundColor: passColor(p) }}
                      >
                        {passLabel(p)}
                      </span>
                    ))}
                  </div>
                )}
                {r && (r.vertical_drop || r.total_trails) && (
                  <p className="mt-1 text-[11px] text-wn-charcoal/55">
                    {r.vertical_drop != null && `${r.vertical_drop.toLocaleString()} ft vert`}
                    {r.vertical_drop && r.total_trails ? " · " : ""}
                    {r.total_trails != null && `${r.total_trails} trails`}
                  </p>
                )}
                {!stayPut && i === 0 && (
                  <p className="mt-1.5 text-[11px] text-wn-charcoal/55">
                    From {leg.fromLabel}
                  </p>
                )}
                {!stayPut && i > 0 && (
                  <p className="mt-1.5 text-[11px] text-wn-charcoal/55">
                    From {leg.fromLabel} the night before
                  </p>
                )}
              </li>
            );
          })}
          <li className="rounded-xl border border-dashed border-wn-charcoal/20 bg-wn-offwhite p-3">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
              After day {trip.total_days}
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-sm font-bold text-wn-navy">🏠 Drive home</span>
              <span className="text-xs text-wn-charcoal/60">
                ≈ {formatDriveTime(homeLegSeconds)}
              </span>
            </div>
          </li>
        </ol>
      </div>
    </main>
  );
}
