// /trip/[id] — one saved trip in trip mode. Top to bottom: the hero
// (name, dates, progress), the Today card (Start trip / Navigate to
// today's mountain / its saved places with directions / Finish day N,
// lib/tripToday.ts), the day-by-day timeline with per-day notes and
// places, and Trip controls (start date, whole route, undo, restart,
// delete). A sticky bar keeps the next step and Share within reach on a
// phone. RLS makes this implicitly owner-only — a different user
// requesting this id gets a 404.

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { passColor, primaryPass, passLabel } from "@/lib/passColors";
import { accentOnNavy, textOn } from "@/lib/contrast";
import Card from "@/components/ui/Card";
import Notice from "@/components/ui/Notice";
import Icon from "@/components/icons/Icon";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";
import { formatDriveTime } from "@/lib/origins";
import { directionsUrl } from "@/components/Map/ResortSheetMath";
import TripActions from "./TripActions";
import TodayCard, { StartDateBadge, type TodayResortInfo } from "./TodayCard";
import TripNameEditor from "./TripNameEditor";
import TripStickyBar from "./TripStickyBar";
import TripCalendarExport from "@/components/TripCalendarExport";
import DayPlan, { type NearbyOption } from "./DayPlan";
import DayResortSwap from "./DayResortSwap";
import { parseDayPlans } from "@/lib/dayPlans";
import { tripToday } from "@/lib/tripToday";

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
  /** jsonb; undefined until the day-plans DDL has run (feature-detected). */
  day_plans?: unknown;
  /** date (YYYY-MM-DD); undefined until the start_date DDL has run
      (feature-detected), null when the user has not set one. */
  start_date?: string | null;
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

  // select * (single row) so day_plans rides along IF the column exists —
  // the itinerary-v2 UI feature-detects it and hides until the DDL runs.
  const { data: tripData, error: tripErr } = await supabase
    .from("trips")
    .select("*")
    .eq("id", id)
    .maybeSingle<Trip>();

  if (tripErr) {
    return (
      <main className="flex min-h-dvh items-center justify-center p-8">
        <Notice tone="danger">Failed to load trip: {tripErr.message}</Notice>
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

  // Itinerary v2 — day plans. Feature-enabled only once the day_plans
  // column exists (select * returns it). Nearby options are fetched per
  // unique resort (recommended-first, capped) and attached to each day
  // card so the user can one-tap places onto their day. Caps are 20
  // restaurants + 12 activities per mountain: in trip mode this list is
  // where the rider picks tonight's dinner, and 10 + 8 left whole
  // categories (cafes, ski shops) out of dense resort towns.
  const dayPlansEnabled = "day_plans" in trip && trip.day_plans !== undefined;
  const dayPlans = dayPlansEnabled ? parseDayPlans(trip.day_plans) : {};
  const nearbyByResortId = new Map<number, NearbyOption[]>();
  if (dayPlansEnabled && (resortData ?? []).length > 0) {
    const resortIds = (resortData ?? []).map((r) => r.id);
    // Per-resort queries (not one global .in + shared limit): a dense
    // resort town's many recommended sub-1km rows would otherwise eat the
    // whole row budget and leave a sparser co-trip resort's add-list
    // empty. Trips have ≤ a handful of unique resorts, so the extra
    // round-trips are trivial.
    const NEARBY_COLS =
      "id, resort_id, name, category, latitude, longitude, website_url, is_recommended, distance_km";
    const NEARBY_RESTAURANT_CAP = 20;
    const NEARBY_ACTIVITY_CAP = 12;
    const perResort = await Promise.all(
      resortIds.map((rid) =>
        Promise.all([
          supabase
            .from("nearby_restaurants")
            .select(NEARBY_COLS)
            .eq("resort_id", rid)
            .order("is_recommended", { ascending: false })
            .order("distance_km", { ascending: true })
            .limit(NEARBY_RESTAURANT_CAP),
          supabase
            .from("nearby_activities")
            .select(NEARBY_COLS)
            .eq("resort_id", rid)
            .order("is_recommended", { ascending: false })
            .order("distance_km", { ascending: true })
            .limit(NEARBY_ACTIVITY_CAP),
        ]),
      ),
    );
    const restRes = { data: perResort.flatMap(([r]) => r.data ?? []) };
    const actRes = { data: perResort.flatMap(([, a]) => a.data ?? []) };
    type NearbyRowDb = {
      id: number;
      resort_id: number;
      name: string;
      category: string | null;
      latitude: number | string | null;
      longitude: number | string | null;
      website_url: string | null;
      is_recommended: boolean | null;
    };
    const push = (rows: NearbyRowDb[] | null, kind: "restaurant" | "activity", cap: number) => {
      for (const row of rows ?? []) {
        const list = nearbyByResortId.get(row.resort_id) ?? [];
        if (list.filter((x) => x.kind === kind).length >= cap) continue;
        list.push({
          id: row.id,
          kind,
          name: row.name,
          category: row.category,
          latitude: row.latitude == null ? null : Number(row.latitude),
          longitude: row.longitude == null ? null : Number(row.longitude),
          website_url: row.website_url,
          is_recommended: !!row.is_recommended,
        });
        nearbyByResortId.set(row.resort_id, list);
      }
    };
    push(restRes.data as NearbyRowDb[] | null, "restaurant", NEARBY_RESTAURANT_CAP);
    push(actRes.data as NearbyRowDb[] | null, "activity", NEARBY_ACTIVITY_CAP);
  }

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

  // Trip mode. One model drives the Today card, the sticky bar, the hero
  // badge and the day-card highlights so they can never disagree about
  // which day it is (lib/tripToday.ts).
  const today = tripToday({
    daySlugs: expandedSlugs,
    currentDay: trip.current_day,
    completedDays: trip.completed_days,
    startedAt: trip.started_at,
    totalDays: trip.total_days,
    dayPlans,
  });
  const isActive = today.state === "active";
  const tripFinished = today.state === "complete";
  const currentDay = today.day;
  const completedSet = new Set(trip.completed_days ?? []);
  const lastCompletedDay = today.lastCompletedDay;

  // Resort details the Today card and the sticky bar need: today's and
  // tomorrow's mountains only.
  const todayResorts: Record<string, TodayResortInfo> = {};
  for (const slug of [today.slug, today.nextDay?.slug]) {
    const r = slug ? bySlug.get(slug) : undefined;
    if (r) {
      todayResorts[r.slug] = {
        name: r.name,
        state: r.state,
        lat: Number(r.latitude),
        lng: Number(r.longitude),
      };
    }
  }
  const todayResort = today.slug ? todayResorts[today.slug] : undefined;
  const todayLeg = legs[today.day - 1];
  const todayResortRow = today.slug ? bySlug.get(today.slug) : undefined;

  // Trip dates. The column is feature-detected off select("*"): before
  // the DDL runs the key is absent and the date UI stays hidden. The
  // calendar export prefers the planned start date, then the day the
  // user actually started; with neither it anchors to today on the
  // user's clock (null here — the client decides, not this UTC server).
  const startDateEnabled = "start_date" in trip;
  const startDate =
    typeof trip.start_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(trip.start_date)
      ? trip.start_date
      : null;
  const calendarAnchorIso = startDate ?? trip.started_at ?? null;

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
  // Use the resort name + state as the waypoint string instead of raw
  // coords. Google Maps then labels the stop as "Vail Mountain Resort"
  // in the directions panel (and pins to the resort's POI rather than
  // a generic nearby address). Coords-only waypoints displayed as
  // "633 Tamarack Rd, Pittsfield, MA" — adjacent address but not the
  // actual resort POI — which the user flagged as not premium.
  const waypointResorts = dedupedWaypointSlugs
    .slice(0, 9)
    .map((slug) => bySlug.get(slug))
    .filter((r): r is ResortRow => r != null);
  const waypointStrings = waypointResorts.map((r) =>
    r.state ? `${r.name}, ${r.state}` : r.name,
  );
  const googleMapsUrl =
    waypointStrings.length === 0
      ? null
      : `https://www.google.com/maps/dir/?api=1&travelmode=driving` +
        `&origin=${trip.origin_lat},${trip.origin_lng}` +
        `&destination=${trip.origin_lat},${trip.origin_lng}` +
        `&waypoints=${encodeURIComponent(waypointStrings.join("|"))}`;

  // Hero gradient — pulled from the FIRST resort's primary pass color
  // so the page picks up an accent without us shipping per-trip art.
  const firstResortRow = bySlug.get(expandedSlugs[0]);
  const heroPrimary = primaryPass(firstResortRow?.passes ?? []);
  const heroAccent = passColor(heroPrimary);
  const fallbackName = `${expandedSlugs.length}-day trip`;
  const progressPct =
    isActive && today.totalDays > 0 ? Math.round((today.completedCount / today.totalDays) * 100) : 0;

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      {/* Hero — gradient + huge editable trip name. Replaces the prior
          terse plain-bg header so the trip page finally feels like
          something the user planned, not a CRUD record. */}
      <header
        className="on-dark relative w-full overflow-hidden"
        style={{
          // accentOnNavy keeps the white title and eyebrow above 4.5:1
          // where the gradient starts (raw Ikon yellow / Epic orange
          // put white text at 1.7:1 / 2.9:1 there).
          background: `linear-gradient(135deg, ${accentOnNavy(heroAccent)} 0%, var(--color-wn-navy) 60%, var(--color-wn-navy-deep) 100%)`,
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
          <div className="mb-4 flex items-start justify-between gap-2">
            {/* Same look as PageHeader's `back` link on a navy header. */}
            <Link
              href="/trips"
              className="inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-white/80 hover:text-white"
            >
              <Icon name="arrow-left" className="h-4 w-4" />
              All trips
            </Link>
            <div className="flex items-start gap-2">
              <TripCalendarExport
                tripName={trip.name ?? fallbackName}
                originLabel={trip.origin_label ?? "Home"}
                startDateIso={calendarAnchorIso}
                days={expandedSlugs.map((slug, i) => {
                  const r = bySlug.get(slug);
                  return {
                    day: i + 1,
                    resortName: r?.name ?? slug,
                    resortState: r?.state ?? "",
                    lat: r ? Number(r.latitude) : null,
                    lng: r ? Number(r.longitude) : null,
                  };
                })}
              />
              {/* Share lives in the sticky bar below, one instance per
                  page so two mounts never race to create share tokens. */}
            </div>
          </div>

          <p className="mb-2 text-eyebrow font-semibold uppercase text-white/70">
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

          {/* Trip-status badge + planned dates */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
          {startDate && (
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/95 backdrop-blur-sm">
              <Icon name="calendar" className="h-3.5 w-3.5" /> <StartDateBadge isoDate={startDate} />
            </div>
          )}
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white/95 backdrop-blur-sm">
            {tripFinished ? (
              <>
                <Icon name="check" className="h-3.5 w-3.5" /> <span>Trip complete</span>
              </>
            ) : isActive ? (
              <>
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" aria-hidden="true" />
                <span>Day {currentDay} of {expandedSlugs.length} · {progressPct}% done</span>
              </>
            ) : (
              <>
                <Icon name="skier" className="h-3.5 w-3.5" /> <span>Not started yet</span>
              </>
            )}
          </div>
          </div>
        </div>
      </header>

      {/* pb-28 keeps the last card and the controls clear of the sticky
          action bar. */}
      <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:px-6 sm:py-8 sm:pb-28">
        {/* Trip mode first: on the mountain the rider needs today's
            directions and places, not the summary. */}
        <TodayCard
          tripId={trip.id}
          today={today}
          resorts={todayResorts}
          startDate={startDate}
          drive={
            todayLeg && todayLeg.driveSeconds > 0
              ? {
                  seconds: todayLeg.driveSeconds,
                  // Day 1's leg starts at the origin, whose timeline
                  // fallback label ("Start") reads oddly in a sentence.
                  fromLabel: today.day === 1 ? (trip.origin_label ?? "home") : todayLeg.fromLabel,
                }
              : null
          }
          placesEnabled={dayPlansEnabled}
          canAddPlaces={
            todayResortRow != null && (nearbyByResortId.get(todayResortRow.id) ?? []).length > 0
          }
        />

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
            // Day 2+ of a multi-night stay at one mountain (same slug as
            // yesterday). Not the same as stayPut: a resort row that failed
            // to load also has a 0 s leg.
            const continuesStay = i > 0 && expandedSlugs[i - 1] === slug;
            const primary = primaryPass(r?.passes ?? []);
            const dot = passColor(primary);
            return (
              <li key={i}>
                <TimelineLeg
                  kind={stayPut ? "stay" : "drive"}
                  durationSeconds={leg.driveSeconds}
                />
                <div
                  // Anchor for the Today card's "Add places" link (the
                  // global [id] scroll-margin keeps it clear of the top bar).
                  id={`day-${dayNum}`}
                  className={`rounded-wn-md border bg-white p-4 transition ${
                    isCurrent
                      ? "border-wn-navy ring-2 ring-wn-navy/20"
                      : completed
                        ? "border-wn-line opacity-70"
                        : "border-wn-line"
                  }`}
                >
                  <div className="mb-1 flex items-center justify-between text-eyebrow font-semibold uppercase text-wn-muted">
                    <span>
                      Day {dayNum}
                      {completed && (
                        <span className="ml-2 inline-flex items-center gap-0.5 text-wn-success">
                          <Icon name="check" className="h-3 w-3" /> done
                        </span>
                      )}
                      {isCurrent && <span className="ml-2 text-wn-navy">today</span>}
                      {isFuture && <span className="ml-2 text-wn-muted">upcoming</span>}
                    </span>
                    {/* "ปักหมุดทีหลัง" — swap this day's mountain from the
                        trip page. Not offered once the day is done. */}
                    {!completed && (
                      <DayResortSwap
                        tripId={trip.id}
                        day={dayNum}
                        currentName={r?.name ?? slug}
                      />
                    )}
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
                      <span className="text-base font-bold text-wn-muted">{slug}</span>
                    )}
                    {r && (
                      <span className="text-xs text-wn-muted">{r.state}</span>
                    )}
                  </div>
                  {r && (r.passes ?? []).length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {(r.passes ?? []).slice(0, 4).map((p) => (
                        <span
                          key={p}
                          className="rounded-wn-sm px-1.5 py-0.5 text-eyebrow font-semibold"
                          style={{ backgroundColor: passColor(p), color: textOn(passColor(p)) }}
                        >
                          {passLabel(p)}
                        </span>
                      ))}
                    </div>
                  )}
                  {r && (r.vertical_drop || r.total_trails) && (
                    <p className="mt-1 text-xs text-wn-muted">
                      {r.vertical_drop != null && `${r.vertical_drop.toLocaleString()} ft vert`}
                      {r.vertical_drop && r.total_trails ? " · " : ""}
                      {r.total_trails != null && `${r.total_trails} trails`}
                    </p>
                  )}
                  {/* Itinerary v2 — per-day note + attached places. Hidden
                      until the day_plans DDL has run (feature-detected). */}
                  {dayPlansEnabled && (
                    <DayPlan
                      tripId={trip.id}
                      day={dayNum}
                      initialPlans={dayPlans}
                      nearby={r ? (nearbyByResortId.get(r.id) ?? []) : []}
                      completed={completed}
                      continuesStay={continuesStay}
                    />
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

        {/* Housekeeping at the bottom: the day-to-day actions live in
            the Today card at the top and the sticky bar. */}
        <section className="mt-8">
          <h2 className="mb-2 text-eyebrow font-bold uppercase text-wn-muted">Trip controls</h2>
          <TripActions
            tripId={trip.id}
            isActive={isActive}
            tripFinished={tripFinished}
            lastCompletedDay={lastCompletedDay}
            totalDays={today.totalDays}
            googleMapsUrl={googleMapsUrl}
            startDate={startDate}
            startDateEnabled={startDateEnabled}
          />
        </section>
      </div>

      {/* Start / Navigate + Finish day / Plan another, and Share, always
          within reach. */}
      <TripStickyBar
        tripId={trip.id}
        tripName={trip.name ?? fallbackName}
        state={today.state}
        day={today.day}
        totalDays={today.totalDays}
        isLastDay={today.nextDay == null}
        stayPut={today.stayPut}
        navigate={
          todayResort
            ? { name: todayResort.name, url: directionsUrl(todayResort.lat, todayResort.lng) }
            : null
        }
      />
    </main>
  );
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card padding="none" className="px-3 py-3 text-center">
      <div className="text-lg font-extrabold tracking-tight text-wn-navy tabular-nums sm:text-wn-xl">
        {value}
      </div>
      <div className="mt-0.5 text-eyebrow font-semibold uppercase text-wn-muted">{label}</div>
    </Card>
  );
}

// Origin card — the home/start anchor at the top and bottom of the
// timeline. Distinct from a day card so it's visually obvious where
// the trip starts and ends.
function OriginCard({ label, kind }: { label: string; kind: "start" | "end" }) {
  return (
    <div className="flex items-center gap-3 rounded-wn-md border border-wn-line bg-wn-offwhite px-4 py-3 shadow-wn-sm">
      <span className="text-wn-2xl leading-none" aria-hidden="true">
        🏠
      </span>
      <div className="min-w-0 flex-1">
        <div className="text-eyebrow font-semibold uppercase text-wn-muted">
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
          isStay ? "border-wn-line" : "border-wn-navy/35"
        }`}
      />
      <div
        className={`relative ml-4 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold backdrop-blur-sm sm:ml-6 ${
          isStay
            ? "border-wn-line bg-wn-offwhite text-wn-muted"
            : "border-wn-navy/25 bg-white text-wn-navy"
        }`}
      >
        <Icon name={isStay ? "mountain" : "car"} className="h-3.5 w-3.5" />
        <span>
          {isStay ? "stay put" : `≈ ${formatDriveTime(durationSeconds)} drive`}
        </span>
      </div>
    </div>
  );
}
