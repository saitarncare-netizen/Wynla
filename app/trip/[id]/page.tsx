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
import TripNameEditor from "./TripNameEditor";

export const dynamic = "force-dynamic";

type Trip = {
  id: string;
  user_id: string;
  name: string | null;
  origin_lat: number;
  origin_lng: number;
  origin_label: string | null;
  resort_slugs: string[];
  days_per_resort: number[] | null;
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
      "id, user_id, name, origin_lat, origin_lng, origin_label, resort_slugs, days_per_resort, lodging_mode, total_days, started_at, current_day, completed_days, created_at",
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

  // Stage 13: trips can store days_per_resort[] alongside resort_slugs[]
  // so a "Vail 3 days, Aspen 2 days" trip is expressible as
  // resort_slugs=['vail','aspen'], days_per_resort=[3,2]. The day-by-
  // day UI below expects ONE slug per day, so we expand here.
  const expandedSlugs: string[] = (() => {
    if (trip.days_per_resort && trip.days_per_resort.length === trip.resort_slugs.length) {
      const out: string[] = [];
      for (let i = 0; i < trip.resort_slugs.length; i++) {
        const reps = Math.max(1, trip.days_per_resort[i] ?? 1);
        for (let j = 0; j < reps; j++) out.push(trip.resort_slugs[i]);
      }
      return out;
    }
    return trip.resort_slugs;
  })();

  // Pull resort details for every slug in the itinerary (deduped) to
  // render the day cards.
  const uniqueSlugs = Array.from(new Set(expandedSlugs));
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
  for (let i = 0; i < expandedSlugs.length; i++) {
    const slug = expandedSlugs[i];
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
  const last = bySlug.get(expandedSlugs[expandedSlugs.length - 1]);
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
  for (const slug of expandedSlugs) {
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

  // Hero gradient — pulled from the FIRST resort's primary pass color
  // so the page picks up an accent without us shipping per-trip art.
  const firstResortRow = bySlug.get(expandedSlugs[0]);
  const heroPrimary = primaryPass(firstResortRow?.passes ?? []);
  const heroAccent = passColor(heroPrimary);
  const fallbackName = `${expandedSlugs.length}-day trip`;
  const completedCount = completedSet.size;
  const progressPct = isActive
    ? Math.round((completedCount / expandedSlugs.length) * 100)
    : 0;

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      {/* Hero — gradient + huge editable trip name. Replaces the prior
          terse plain-bg header so the trip page finally feels like
          something the user planned, not a CRUD record. */}
      <header
        className="relative w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${heroAccent} 0%, #1E2952 60%, #0F1530 100%)`,
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)",
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.85'/></svg>\")",
            backgroundSize: "160px 160px",
          }}
        />

        <div className="relative z-10 mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <Link
            href="/trips"
            className="mb-4 inline-flex items-center gap-1 rounded-md bg-white/95 px-2.5 py-1 text-xs font-semibold text-wn-navy shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            ← All trips
          </Link>

          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70">
            🛣️ {expandedSlugs.length} day{expandedSlugs.length === 1 ? "" : "s"}
            {dedupedWaypointSlugs.length > 0 &&
              ` · ${dedupedWaypointSlugs.length} stop${dedupedWaypointSlugs.length === 1 ? "" : "s"}`}
            {trip.origin_label ? ` · from ${trip.origin_label}` : ""}
          </p>

          <TripNameEditor
            tripId={trip.id}
            initialName={trip.name}
            fallbackName={fallbackName}
          />

          {/* Trip-status badge */}
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white/95 backdrop-blur-sm">
            {tripFinished ? (
              <>🎉 <span>Trip complete</span></>
            ) : isActive ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                <span>Day {currentDay} of {expandedSlugs.length} · {progressPct}% done</span>
              </>
            ) : (
              <>📅 <span>Not started yet</span></>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Trip summary tiles — replaces the old terse "total drive"
            line. Three stats so the page has visual weight without an
            image. */}
        <section className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
          <SummaryTile
            label="Ski days"
            value={String(expandedSlugs.length)}
          />
          <SummaryTile
            label="Stops"
            value={String(dedupedWaypointSlugs.length)}
          />
          <SummaryTile
            label="Total drive"
            value={formatDriveTime(totalDriveSeconds)}
          />
        </section>

        {/* Timeline view — Home → Resort → Resort → Home, with each
            drive leg made explicit as a dashed connector showing the
            estimated time. Stage 19 redesign. The previous layout
            tucked drive time inside each day card's header so the
            ordering / direction of the trip wasn't obvious at a glance. */}
        <ol className="flex flex-col">
          {/* Origin card */}
          <li>
            <OriginCard label={trip.origin_label ?? "Home"} kind="start" />
          </li>

          {expandedSlugs.map((slug, i) => {
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
              <li key={i}>
                <TimelineLeg
                  kind={stayPut ? "stay" : "drive"}
                  durationSeconds={leg.driveSeconds}
                />
                <div
                  className={`rounded-xl border bg-white p-4 transition ${
                    isCurrent
                      ? "border-wn-navy ring-2 ring-wn-navy/20"
                      : completed
                        ? "border-wn-charcoal/10 opacity-70"
                        : "border-wn-charcoal/10"
                  }`}
                >
                  <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
                    <span>
                      Day {dayNum}
                      {completed && <span className="ml-2 text-emerald-700">✓ done</span>}
                      {isCurrent && <span className="ml-2 text-wn-navy">today</span>}
                      {isFuture && <span className="ml-2 text-wn-charcoal/45">upcoming</span>}
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
                </div>
              </li>
            );
          })}

          {/* Final leg + home card */}
          <li>
            <TimelineLeg kind="drive" durationSeconds={homeLegSeconds} />
            <OriginCard label={trip.origin_label ?? "Home"} kind="end" />
          </li>
        </ol>

        {/* Action panel — moved to the bottom so the page reads as
            "here's your trip" first, "do something with it" second.
            The previous layout put Start-trip right under the title
            and users were tapping it expecting "view details". */}
        <section className="mt-8">
          <h2 className="mb-2 text-[11px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
            Trip controls
          </h2>
          <TripActions
            tripId={trip.id}
            isActive={isActive}
            tripFinished={tripFinished}
            currentDay={currentDay}
            totalDays={expandedSlugs.length}
            googleMapsUrl={googleMapsUrl}
          />
        </section>
      </div>
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-wn-charcoal/10 bg-white px-3 py-3 text-center shadow-sm">
      <div className="text-lg font-extrabold tracking-tight text-wn-navy sm:text-xl">
        {value}
      </div>
      <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
        {label}
      </div>
    </div>
  );
}

// Origin card — the home/start anchor at the top and bottom of the
// timeline. Distinct from a day card so it's visually obvious where
// the trip starts and ends.
function OriginCard({ label, kind }: { label: string; kind: "start" | "end" }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-wn-charcoal/15 bg-wn-offwhite px-4 py-3 shadow-sm">
      <span className="text-2xl leading-none" aria-hidden="true">
        🏠
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-[0.15em] text-wn-charcoal/55">
          {kind === "start" ? "Trip start" : "Trip end"}
        </div>
        <div className="truncate text-base font-bold text-wn-navy">{label}</div>
      </div>
    </div>
  );
}

// Vertical connector between trip cards. Shows a dashed line on the
// left + a centered duration chip. "stay" kind is used when a stop
// repeats (basecamp days) — connector becomes a small "stay put" pill
// rather than a drive estimate to keep the timeline readable.
function TimelineLeg({
  kind,
  durationSeconds,
}: {
  kind: "drive" | "stay";
  durationSeconds: number;
}) {
  const isStay = kind === "stay";
  return (
    <div className="relative flex min-h-[44px] items-center py-1.5 pl-4 sm:pl-6">
      {/* Dashed vertical line — sits flush with the cards above and
          below by stretching the parent's full vertical extent. */}
      <span
        aria-hidden="true"
        className={`absolute bottom-0 left-4 top-0 border-l-2 border-dashed sm:left-6 ${
          isStay ? "border-wn-charcoal/20" : "border-wn-navy/35"
        }`}
      />
      <div
        className={`relative ml-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold backdrop-blur-sm sm:ml-6 ${
          isStay
            ? "border-wn-charcoal/15 bg-wn-offwhite text-wn-charcoal/70"
            : "border-wn-navy/25 bg-white text-wn-navy"
        }`}
      >
        <span aria-hidden="true">{isStay ? "🏔️" : "🚗"}</span>
        <span>
          {isStay ? "stay put" : `≈ ${formatDriveTime(durationSeconds)} drive`}
        </span>
      </div>
    </div>
  );
}
