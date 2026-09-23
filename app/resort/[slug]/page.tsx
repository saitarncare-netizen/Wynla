import { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import HeroImage from "@/components/HeroImage";
import {
  passColor,
  passLabel,
  primaryPass,
} from "@/lib/passColors";
import { googleMapsUrl } from "@/lib/externalLinks";
import { getDifficultyMix } from "@/lib/difficulty";
import FavoriteToggle from "@/components/auth/FavoriteToggle";
import CompareToggle from "@/components/CompareToggle";
import RecordRecentVisit from "@/components/RecordRecentVisit";
import DifficultyBar from "@/components/Map/DifficultyBar";
import { crowdForecast, upcomingSaturday, CROWD_COLORS } from "@/lib/crowdForecast";
import ResortReviews from "@/components/Map/ResortReviews";
import SnowAlertButton from "@/components/SnowAlertButton";
import SeasonCountdown, { ResortStatusPill } from "@/components/SeasonCountdown";
import {
  resolveSeasonInfo,
  deriveResortStatus,
  seasonWindowText,
  type ResortStatus,
} from "@/lib/seasonDates";
import SimilarResorts from "@/components/SimilarResorts";
import type { SimilarityResort } from "@/lib/similarity";
import SnowSurfaceForecast, { type SeasonPreview } from "@/components/SnowSurfaceForecast";
import WhereToStay from "@/components/WhereToStay";
import NearbyRestaurants from "@/components/NearbyRestaurants";
import NearbyActivities from "@/components/NearbyActivities";
import type { NearbyRow } from "@/lib/nearbyCategories";
import { liftCounts, type LiftTypes } from "@/lib/liftTypes";
import {
  evaluateWindHold,
  liftMixFromTypes,
  parseWindFromText,
  windHoldChipClass,
  type ResortWindContext,
} from "@/lib/windHold";
import {
  computeSunTimes,
  formatLocal,
  formatStampInZone,
  timeZoneForResort,
} from "@/lib/sunTimes";
import {
  buildSurfaceReport,
  type DailyWeather,
  type ForecastDay as SurfaceForecastDay,
  type SurfaceReport,
} from "@/lib/snowSurface";
import { airportByIata } from "@/lib/airports";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";
import { formatDriveTime } from "@/lib/origins";
import { skyscannerUrl } from "@/lib/affiliateLinks";
import { forecastDaysFrom } from "@/lib/weather/forecastJson";

// ISR — resort detail data (lifts/trails/passes/coords) changes rarely.
// Snow conditions are stamped on the row by the cron; ISR every 10 min
// keeps the page fresh enough while letting Vercel cache the rendered
// HTML for every visitor. Capacitor wrap needs static-friendly pages too.
export const revalidate = 600;

// Explicit column list — replaces a select("*") that pulled ~70+ columns
// per row, several of them large text fields (descriptions, attribution
// blobs). Keeping this in sync with the local Resort type is enforced by
// TS at the cast site. ~3-5KB per detail page hit saved.
const RESORT_DETAIL_COLS =
  "id, slug, name, state, region, city, address, latitude, longitude, passes, tier, operating_status, vertical_drop, total_trails, total_lifts, total_acres, difficulty_pct_beginner, difficulty_pct_intermediate, difficulty_pct_advanced, difficulty_pct_expert, trails_beginner, trails_intermediate, trails_advanced, trails_expert, has_terrain_park, terrain_park_count, has_glades, has_halfpipe, has_night_skiing, longest_run_miles, elevation_base, elevation_summit, typical_season_start, typical_season_end, weekday_hours, weekend_hours, website_url, trail_map_url, ticket_booking_url, hero_image_url, hero_image_source, hero_image_alt, hero_image_attribution, last_verified_at, high_speed_lifts, base_elevation_ft, summit_elevation_ft, annual_snowfall_in, season_open_text, season_close_text, snowmaking_pct, has_tubing, has_lessons, has_rentals, has_lodging_on_mountain, has_xc_skiing, has_backcountry_access, webcam_url, closest_airport_iata, closest_airport_distance_mi, snow_base_depth_in, snow_new_24h_in, snow_new_48h_in, snow_new_7d_in, trails_open_today, lifts_open_today, snow_report_status, snow_report_updated_at, allows_snowboards, wind_hold_mph_chair, wind_hold_mph_gondola, currently_open, season_end_date, lift_types, terrain_park_features, avalanche_zone_id";

type Resort = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: string | null;
  city: string | null;
  address: string | null;
  latitude: number | string;
  longitude: number | string;
  passes: string[];
  tier: "featured" | "listed";
  operating_status: "active" | "closed" | "seasonal";
  vertical_drop: number | null;
  total_trails: number | null;
  total_lifts: number | null;
  total_acres: number | null;
  difficulty_pct_beginner: number | null;
  difficulty_pct_intermediate: number | null;
  difficulty_pct_advanced: number | null;
  difficulty_pct_expert: number | null;
  trails_beginner: number | null;
  trails_intermediate: number | null;
  trails_advanced: number | null;
  trails_expert: number | null;
  has_terrain_park: boolean | null;
  terrain_park_count: number | null;
  has_glades: boolean | null;
  has_halfpipe: boolean | null;
  has_night_skiing: boolean | null;
  longest_run_miles: number | null;
  elevation_base: number | null;
  elevation_summit: number | null;
  typical_season_start: string | null;
  typical_season_end: string | null;
  weekday_hours: string | null;
  weekend_hours: string | null;
  website_url: string | null;
  trail_map_url: string | null;
  ticket_booking_url: string | null;
  hero_image_url: string | null;
  hero_image_source: string | null;
  hero_image_alt: string | null;
  hero_image_attribution: string | null;
  last_verified_at: string | null;
  // Stage 23 columns — preferred over the legacy elevation_base /
  // typical_season_* fields above when both exist.
  high_speed_lifts: number | null;
  base_elevation_ft: number | null;
  summit_elevation_ft: number | null;
  annual_snowfall_in: number | null;
  season_open_text: string | null;
  season_close_text: string | null;
  snowmaking_pct: number | null;
  has_tubing: boolean | null;
  has_lessons: boolean | null;
  has_rentals: boolean | null;
  has_lodging_on_mountain: boolean | null;
  has_xc_skiing: boolean | null;
  has_backcountry_access: boolean | null;
  webcam_url: string | null;
  closest_airport_iata: string | null;
  closest_airport_distance_mi: number | null;
  // Stage 26 — live snow + open conditions (cron-refreshed daily).
  snow_base_depth_in: number | null;
  snow_new_24h_in: number | null;
  snow_new_48h_in: number | null;
  snow_new_7d_in: number | null;
  trails_open_today: number | null;
  lifts_open_today: number | null;
  snow_report_status: string | null;
  snow_report_updated_at: string | null;
  // Phase 0 one-app additions (2026-05-21).
  allows_snowboards: boolean | null;
  wind_hold_mph_chair: number | null;
  wind_hold_mph_gondola: number | null;
  currently_open: boolean | null;
  season_end_date: string | null;
  lift_types: LiftTypes | null;
  terrain_park_features: number | null;
  avalanche_zone_id: string | null;
};

type ForecastDay = {
  date: string;
  weekday: string;
  temp_high_f: number | null;
  temp_low_f: number | null;
  conditions_short: string | null;
  snow_in: number | null;
  precip_chance: number | null;
  wind_short: string | null;
  wind_dir_short: string | null;
  uv_index_max?: number | null;
  // forecast_json v2 (pipeline package, lib/weather/forecastJson.ts)
  // adds these; read defensively — v1 rows lack them.
  rain_in?: number | null;
  precip_in?: number | null;
  /** Liquid-equivalent precipitation (NWS QPF), v2. */
  qpf_in?: number | null;
  /** Peak gust, v2. */
  gust_mph?: number | null;
  wind_gust_mph?: number | null;
};

type WeatherSnapshot = {
  resort_id: number;
  temp_high_f: number | null;
  temp_low_f: number | null;
  conditions_short: string | null;
  snow_24h_in: number | string | null;
  snow_48h_in: number | string | null;
  wind_mph_avg: number | null;
  wind_mph_gust: number | null;
  wind_dir_short: string | null;
  fetched_at: string | null;
  /** v1 array or v2 object; always read through forecastDaysFrom(). */
  forecast_json: ForecastDay[] | { v: 2; days: ForecastDay[] } | null;
};

type HistoryRow = {
  observed_date: string;
  temp_high_f: number | null;
  temp_low_f: number | null;
  snow_24h_in: number | string | null;
  rain_24h_in: number | string | null;
  precip_24h_in: number | string | null;
  wind_mph_avg: number | null;
};

async function getDataUncached(
  slug: string,
): Promise<{
  resort: Resort;
  weather: WeatherSnapshot | null;
  pool: SimilarityResort[];
  history: HistoryRow[];
  nearbyRestaurants: NearbyRow[];
  nearbyActivities: NearbyRow[];
  /** False only when the platform has zero reviews anywhere — the
   *  Reviews block is hidden until the first one exists. */
  hasAnyReviews: boolean;
} | null> {
  // Fetch resort, weather, and the active-resort pool in parallel.
  // The pool select is trimmed to just the columns similarity.ts needs
  // (no images/links/booleans) so we don't pay for transferring 50+
  // columns × ~450 rows on a page that only reads ~10 of them.
  const [resortRes, poolRes] = await Promise.all([
    supabase
      .from("resorts")
      .select(RESORT_DETAIL_COLS)
      .eq("slug", slug)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("resorts")
      .select(
        "id, slug, name, state, region, passes, vertical_drop, total_trails, difficulty_pct_beginner, difficulty_pct_intermediate, difficulty_pct_advanced, difficulty_pct_expert, trails_beginner, trails_intermediate, trails_advanced, trails_expert",
      )
      .eq("active", true),
  ]);
  if (resortRes.error || !resortRes.data) return null;
  const resort = resortRes.data as Resort;

  // Weather snapshot + the NEWEST 7 days of history. weather_history has
  // no retention job, so "order ascending, limit 7" returned the first
  // week the cron ever ran (May 2026) and the surface classifier was
  // scoring four-month-old weather (audit domain-logic-1). We fetch
  // descending and reverse below so the most recent row sits at the end
  // (lib/snowSurface.deriveFeatures contract).
  // Round 9 (2026-06) also fetches nearby_restaurants + nearby_activities
  // here so the new sections render server-side in the same round trip.
  const [wxRes, historyRes, restaurantsRes, activitiesRes, reviewsRes] = await Promise.all([
    supabase
      .from("weather_cache")
      .select(
        "resort_id, temp_high_f, temp_low_f, conditions_short, snow_24h_in, snow_48h_in, wind_mph_avg, wind_mph_gust, wind_dir_short, fetched_at, forecast_json",
      )
      .eq("resort_id", resort.id)
      .maybeSingle(),
    supabase
      .from("weather_history")
      .select(
        "observed_date, temp_high_f, temp_low_f, snow_24h_in, rain_24h_in, precip_24h_in, wind_mph_avg",
      )
      .eq("resort_id", resort.id)
      .order("observed_date", { ascending: false })
      .limit(7),
    supabase
      .from("nearby_restaurants")
      .select(
        "id, resort_id, name, category, description, distance_km, drive_minutes, latitude, longitude, website_url, source, confidence_score, is_recommended",
      )
      .eq("resort_id", resort.id)
      .order("is_recommended", { ascending: false })
      .order("distance_km", { ascending: true })
      .limit(60),
    supabase
      .from("nearby_activities")
      .select(
        "id, resort_id, name, category, description, distance_km, drive_minutes, latitude, longitude, website_url, source, confidence_score, is_recommended",
      )
      .eq("resort_id", resort.id)
      .order("is_recommended", { ascending: false })
      .order("distance_km", { ascending: true })
      .limit(60),
    // Platform-wide review count (head request, no rows). Zero reviews
    // anywhere → the Reviews block stays hidden on every page.
    supabase.from("resort_reviews").select("id", { count: "exact", head: true }),
  ]);

  const history = ((historyRes.data as HistoryRow[] | null) ?? []).slice().reverse();
  // If the count query fails we fall back to showing the block — the
  // old behaviour — rather than hiding a feature on a transient error.
  const hasAnyReviews = reviewsRes.error ? true : (reviewsRes.count ?? 0) > 0;

  return {
    resort,
    weather: (wxRes.data as WeatherSnapshot) ?? null,
    pool: (poolRes.data ?? []) as SimilarityResort[],
    history,
    nearbyRestaurants: (restaurantsRes.data ?? []) as NearbyRow[],
    nearbyActivities: (activitiesRes.data ?? []) as NearbyRow[],
    hasAnyReviews,
  };
}

// Dedupe the 6 queries (incl. two ~360-row scans) across generateMetadata +
// the page render within one request — Supabase calls aren't auto-deduped.
const getData = cache(getDataUncached);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) return { title: "Resort not found · Wynla" };

  const { resort } = data;
  const passSummary = (resort.passes ?? [])
    .map((p) => passLabel(p))
    .join(", ");

  // Layout's title.template adds " · Wynla" automatically, so the per-page
  // title omits it to avoid "X · Wynla · Wynla".
  // Note: openGraph.images is omitted here — Next.js auto-detects the
  // co-located opengraph-image.tsx route handler and wires it in.
  return {
    title: `${resort.name} — ${resort.state} Ski Resort`,
    description: `${resort.name} in ${resort.state}${resort.region ? " (" + resort.region + ")" : ""}. ${passSummary ? "On the " + passSummary + ". " : ""}Plan your ski or snowboard trip with weather, drive times, and resort info.`,
    alternates: { canonical: `/resort/${slug}` },
    openGraph: {
      title: `${resort.name} · Wynla`,
      description: `Ski resort in ${resort.state}${resort.region ? " (" + resort.region + ")" : ""}`,
      url: `/resort/${slug}`,
    },
  };
}

export default async function ResortPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getData(slug);
  if (!data) notFound();
  const { resort, weather, pool, history, nearbyRestaurants, nearbyActivities, hasAnyReviews } = data;

  const now = new Date();
  const tz = timeZoneForResort(resort);
  const seasonInfo = resolveSeasonInfo(resort, now);
  const status = deriveResortStatus(resort, seasonInfo, now);

  // Snow Surface Forecast — build the report on the server so the
  // client island stays small. We synthesize a "today" row from
  // weather_cache when weather_history hasn't caught up yet (which
  // will be the case for the first ~7 days post-deploy). The classifier
  // gracefully returns lower confidence rather than failing when the
  // window is short.
  const surfaceHistory: DailyWeather[] = (() => {
    const fromHistory: DailyWeather[] = history.map((h) => ({
      observed_date: h.observed_date,
      temp_high_f: h.temp_high_f,
      temp_low_f: h.temp_low_f,
      snow_24h_in:
        h.snow_24h_in == null ? null : Number(h.snow_24h_in),
      rain_24h_in:
        h.rain_24h_in == null ? null : Number(h.rain_24h_in),
      precip_24h_in:
        h.precip_24h_in == null ? null : Number(h.precip_24h_in),
      wind_mph_avg: h.wind_mph_avg,
    }));
    const todayDate = new Date().toISOString().slice(0, 10);
    const lastDate = fromHistory.at(-1)?.observed_date;
    if (lastDate !== todayDate && weather) {
      fromHistory.push({
        observed_date: todayDate,
        temp_high_f: weather.temp_high_f,
        temp_low_f: weather.temp_low_f,
        snow_24h_in:
          weather.snow_24h_in == null ? null : Number(weather.snow_24h_in),
        // rain + precip aren't on weather_cache; rough fallback uses 0
        // so today's row exists at all. Once a few days of history
        // accumulate this synthesis tapers out naturally.
        rain_24h_in: 0,
        precip_24h_in:
          weather.snow_24h_in != null ? Number(weather.snow_24h_in) * 0.1 : 0,
        wind_mph_avg: weather.wind_mph_avg,
      });
    }
    return fromHistory;
  })();

  // forecast_json is v1 (bare array) or v2 ({ v: 2, days: [...] }) —
  // forecastDaysFrom() reads both while rows roll over.
  const forecastDays: ForecastDay[] = forecastDaysFrom(weather?.forecast_json);
  const surfaceForecastDays: SurfaceForecastDay[] = forecastDays
    .slice(1, 4)
    .map((d) => ({
      date: d.date,
      temp_high_f: d.temp_high_f,
      temp_low_f: d.temp_low_f,
      snow_in: d.snow_in,
      precip_chance: d.precip_chance,
      conditions_short: d.conditions_short,
      wind_short: d.wind_short,
      rain_in: typeof d.rain_in === "number" ? d.rain_in : null,
      precip_in:
        typeof d.precip_in === "number" ? d.precip_in : typeof d.qpf_in === "number" ? d.qpf_in : null,
    }));

  // Context the classifier needs beyond the weather rows. isOpen is a
  // three-state: a live/season signal makes it true, a dormant status
  // makes it false, and "Check resort" leaves it null. With null the
  // classifier only runs on positive evidence of operation (a parsed
  // season window, a reported base, lifts counted open) — the calendar
  // alone is not evidence, or every resort the broken scraper cannot see
  // would get a confident class from mid-October until it actually opens.
  const isOpen: boolean | null =
    status.kind === "open" || status.kind === "limited" || status.kind === "likely-open"
      ? true
      : status.dormant
        ? false
        : null;
  const liveSnowpack =
    status.kind === "open" ||
    status.kind === "limited" ||
    (resort.snow_base_depth_in ?? 0) > 0 ||
    (resort.lifts_open_today ?? 0) > 0;
  const surfaceReport: SurfaceReport = buildSurfaceReport(surfaceHistory, surfaceForecastDays, {
    baseDepthIn: resort.snow_base_depth_in,
    hasSnowpack: liveSnowpack ? true : null,
    inSeason: seasonInfo.status === "in-season",
    isOpen,
    offSeason: status.kind === "off-season" || status.kind === "opens",
    lastObservedAt: weather?.fetched_at ?? null,
    now,
  });
  const forecastDateLabels: Array<string | null> = surfaceForecastDays.map(
    (d) =>
      new Date(d.date + "T12:00:00Z").toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      }),
  );
  while (forecastDateLabels.length < 3) forecastDateLabels.push(null);

  // Facts for the dormant "Season preview" card.
  const lastSeasonEnded =
    resort.season_end_date && new Date(resort.season_end_date + "T00:00:00Z") < now
      ? resort.season_end_date
      : null;
  // The opening date itself is NOT repeated here: the status pill in the
  // at-a-glance strip and the weather card already carry it.
  const seasonPreview: SeasonPreview = {
    resortName: resort.name,
    seasonWindow: seasonWindowText(resort),
    annualSnowfallIn: resort.annual_snowfall_in,
    lastSeasonEnded,
  };

  const lng = Number(resort.longitude);
  const lat = Number(resort.latitude);
  const primary = primaryPass(resort.passes);
  const heroBg = passColor(primary);

  // QuickStats / Listed-footer gating: show the listed-footer fallback only
  // when QuickStats would render nothing. Mirrors the QuickStats null-check.
  const hasAnyStats =
    resort.vertical_drop != null ||
    resort.total_trails != null ||
    resort.total_lifts != null ||
    resort.total_acres != null ||
    resort.summit_elevation_ft != null ||
    resort.elevation_summit != null ||
    resort.annual_snowfall_in != null ||
    resort.longest_run_miles != null;

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      {/* Client-only effect that records this resort in the localStorage
          "recently viewed" list so the homepage strip can show it next time. */}
      <RecordRecentVisit
        id={resort.id}
        slug={resort.slug}
        name={resort.name}
        primary_pass={primary}
        lat={lat}
        lng={lng}
      />
      {/* JSON-LD for SEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SkiResort",
            name: resort.name,
            description: `Ski resort in ${resort.state}${resort.region ? " (" + resort.region + ")" : ""}`,
            url: resort.website_url ?? undefined,
            address: {
              "@type": "PostalAddress",
              addressRegion: resort.state,
              addressLocality: resort.city ?? undefined,
              addressCountry: "US",
              streetAddress: resort.address ?? undefined,
            },
            geo: {
              "@type": "GeoCoordinates",
              latitude: lat,
              longitude: lng,
            },
          }),
        }}
      />

      {/* HERO — vetted winter photo (hero_image_url) when present, else a
          designed navy gradient. hero_image_url is filled by the
          scripts/hero-*.mjs sourcing + vision-vetting pipeline (every photo
          is a hand-vetted winter ski scene; rest fall back to the gradient). */}
      <header
        className="relative w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${heroBg} 0%, #1E2952 60%, #0F1530 100%)`,
          // 12px breathing room under the iOS status bar. The safe-area
          // inset itself is applied once for every non-map route by the
          // #main-content rule in globals.css.
          paddingTop: "12px",
        }}
      >
        {resort.hero_image_url && (
          <HeroImage
            src={resort.hero_image_url}
            alt={resort.hero_image_alt ?? `${resort.name} in winter`}
            attribution={resort.hero_image_attribution}
          />
        )}
        {/* Two-stop atmosphere overlay — soft highlight top-left, deeper
            shadow bottom-right. Plus a faint SVG-grain layer that gives
            the gradient a Stripe/Linear-style depth instead of a flat fill. */}
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

        {/* Top bar — back link + compare + favorite */}
        <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          {/* Carry the slug back as ?recent=<slug> so the map page can
              promote it into the recentlyViewedId slot and paint the
              gold ring on the pin the user just visited — without that
              hand-off, the cross-route navigation drops the state PR
              #36 set when the user closed the in-map panel. Resolves
              Saitarn 2026-05-23 "พอออกมายังไม่เห็นมีไฮไลท์เลย" — the
              highlight now survives the /resort/[slug] round-trip. */}
          <Link
            href={`/?recent=${encodeURIComponent(resort.slug)}`}
            className="inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-1.5 text-xs font-semibold text-wn-navy shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            ← Map
          </Link>
          <div className="flex items-center gap-2">
            <CompareToggle resortId={resort.id} size="lg" />
            <FavoriteToggle resortId={resort.id} size="lg" />
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-8 sm:px-6 sm:pb-16 sm:pt-12">
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            {(resort.passes ?? []).map((p) => (
              <PassBadge key={p} pass={p} />
            ))}
          </div>
          <h1 className="text-4xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-7xl md:text-[7.5rem] md:tracking-[-0.025em]">
            {resort.name}
          </h1>
          {/* Season countdown — sits just under the hero title while the
              season is running ("Season runs to Apr 15 · 85 days left").
              Off-season the at-a-glance pill already says "Opens ~Nov 15 ·
              in 53 days", so repeating it here (the review counted the
              same fact four times on one screen) adds nothing. */}
          {seasonInfo.status === "in-season" && (
            <div className="mt-4">
              <SeasonCountdown info={seasonInfo} variant="hero" />
            </div>
          )}
          <p className="mt-3 text-base text-white/85 sm:text-lg">
            {resort.state}
            {resort.region ? " · " + resort.region : ""}
            {resort.city ? " · " + resort.city : ""}
          </p>
          {resort.operating_status === "closed" && (
            <p className="mt-3 inline-block rounded bg-red-600/95 px-2 py-0.5 text-xs font-semibold text-white">
              Permanently closed
            </p>
          )}
          {resort.operating_status === "seasonal" && (
            <p className="mt-3 inline-block rounded bg-amber-500/95 px-2 py-0.5 text-xs font-semibold text-white">
              Seasonal / limited operations
            </p>
          )}
          {resort.allows_snowboards === false && (
            <p
              className="mt-3 inline-block rounded bg-white/95 px-2 py-0.5 text-xs font-semibold text-wn-navy"
              title="This resort does not permit snowboarding"
            >
              🎿 Skis only
            </p>
          )}
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        {/* AT A GLANCE — the five answers a visitor came for, directly
            under the hero: is it open, did it snow, how deep, what does
            the surface feel like, how cold. Every number is labelled
            with what it is and where it came from. Mountain stats (the
            static 7-tile block that used to sit here) now follows the
            conditions block (audit resort-panel-detail-5). */}
        <AtAGlance resort={resort} weather={weather} status={status} report={surfaceReport} />

        {/* CONDITIONS BLOCK — three sections sharing a single narrative.
            The Snow Surface card carries the headline ("what will today
            feel like under your edges"); Today's weather is the snapshot
            that informs it; the 10-day forecast extends the same data
            into planning range. We lead with the surface so the killer
            feature lands first, then drop into the supporting evidence. */}

        {/* Snow Surface Forecast — interprets the 7-day weather window
            into a SANY surface label (PP / PPC / MG / FG / IP / etc.)
            with a 3-day outlook + a tap-to-learn glossary modal. When the
            report is dormant (closed / off-season / stale) it renders the
            Season preview card instead — never a confident class on a
            mountain with no lifts turning. */}
        <SnowSurfaceForecast
          report={surfaceReport}
          forecastDates={forecastDateLabels}
          preview={seasonPreview}
        />

        {/* Today's weather — the current-conditions snapshot that feeds
            the surface classifier above. Kept compact and second so the
            page reads as "here's the surface, here's the evidence". */}
        <Section title="Today's weather">
          <FullWeatherCard resort={resort} weather={weather} lat={lat} lng={lng} status={status} tz={tz} />
        </Section>

        {/* 10-day forecast — same Open-Meteo + NWS data extended into
            planning range. Always rendered when forecast_json is
            populated; the summer cards still give users a "is the
            mountain getting cold yet" pulse leading into November. */}
        {forecastDays.length > 0 && (
          <Section
            title={`${Math.min(forecastDays.length, 10)}-day forecast`}
            subtitle={
              forecastDays.length >= 8
                ? "Swipe sideways to see the full window. Days 8–10 are trend-only."
                : "Swipe sideways to see the full window."
            }
          >
            <TenDayForecast
              days={forecastDays.slice(0, 10)}
              resortWind={windContextFor(resort)}
            />
          </Section>
        )}

        {/* MOUNTAIN STATS — the static profile (vertical, trails, lifts,
            difficulty mix, weekend crowds). Below the conditions block so
            the page opens on what changes daily, not on what never does. */}
        <QuickStats resort={resort} status={status} tz={tz} now={now} />

        {/* Inaugural Season 2026 — Powder Day Score retired from the
            UI. The Snow Surface Forecast (above) covers the same
            "what will today feel like?" question with more nuance —
            powder, packed powder, frozen granular, icy, etc. — and a
            3-day outlook. lib/powderScore.ts + components/PowderDayScore.tsx
            stay in tree as dead code in case we want to revive it. */}

        {/* WHERE TO STAY — three lodging partners (Booking, Vrbo,
            Airbnb). Sits right after the conditions block so a user
            who's just decided "yes the snow looks worth it" can act
            on lodging without scrolling past five more stat sections.
            Booking + Vrbo earn Wynla a commission; Airbnb is a
            no-affiliate UX courtesy. FTC disclosure lives in the
            global footer. */}
        <WhereToStay
          resort={{
            name: resort.name,
            state: resort.state,
            latitude: lat,
            longitude: lng,
            closest_airport_iata: resort.closest_airport_iata,
          }}
        />

        {/* AMENITIES — Stage 23 booleans + legacy night/halfpipe/glades. */}
        <FullAmenities resort={resort} />

        {/* NEARBY EATS + OFF-MOUNTAIN — Round 9 (2026-06).
            Curated from OpenStreetMap within ~25 km of the resort.
            The whole section is hidden when the DB has no rows for this
            resort (low-coverage areas during the initial sweep stay
            quiet instead of showing an empty "Around the resort"
            header — the Section wrapper itself doesn't self-collapse). */}
        {(nearbyRestaurants.length > 0 || nearbyActivities.length > 0) && (
          <Section id="around-the-resort" title="Around the resort">
            <NearbyRestaurants rows={nearbyRestaurants} />
            <NearbyActivities rows={nearbyActivities} />
          </Section>
        )}

        {/* CLOSEST AIRPORT — Stage 23; audit round 2 added the airport
            name + city, an estimated distance / drive from coordinates
            (the DB distance exists for 4 of 425 rows) and a flights link. */}
        {resort.closest_airport_iata && (
          <Section title="Closest airport">
            <ClosestAirportCard resort={resort} lat={lat} lng={lng} />
          </Section>
        )}

        {/* QUICK ACTIONS — utility-only after Stage 37.
            Booking (lodging / lift tickets / gear / flights / insurance)
            moved into the dedicated PlanYourTrip section higher in the
            page; this row is now just navigation + trail map + webcam,
            which are the no-revenue informational links. */}
        <Section title="Maps & cameras">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ActionLink
              href={googleMapsUrl(resort.name, resort.state)}
              label="Open in Google Maps"
              sub="Navigation, photos, reviews"
              emoji="📍"
              external
            />
            {resort.trail_map_url && (
              <ActionLink
                href={resort.trail_map_url}
                label="Trail map"
                sub="Lifts, runs, terrain"
                emoji="🗺️"
                external
              />
            )}
            {resort.webcam_url && (
              <ActionLink
                href={resort.webcam_url}
                label="Live webcam"
                sub="Current conditions"
                emoji="📷"
                external
              />
            )}
            {resort.website_url && (
              <ActionLink
                href={resort.website_url}
                label="Resort website"
                sub="Hours, tickets, news"
                emoji="🌐"
                external
              />
            )}
          </div>
        </Section>

        {/* ABOUT — Stage 33: hide entirely if there's nothing useful
            to show (after we dropped the noisy "Night skiing: No" row,
            About often collapsed to just an address row). */}
        {(resort.address ||
          resort.weekday_hours ||
          resort.weekend_hours ||
          resort.typical_season_start ||
          resort.typical_season_end) && (
        <Section title="About">
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 rounded-lg border border-wn-charcoal/10 bg-white p-4 text-sm sm:grid-cols-2">
            {resort.address && (
              <DataRow label="Address" value={resort.address} />
            )}
            {(resort.weekday_hours || resort.weekend_hours) && (
              <DataRow
                label="Hours"
                value={
                  [
                    resort.weekday_hours && `Weekday ${resort.weekday_hours}`,
                    resort.weekend_hours && `Weekend ${resort.weekend_hours}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                }
              />
            )}
            {(resort.typical_season_start || resort.typical_season_end) && (
              <DataRow
                label="Typical season"
                value={`${resort.typical_season_start ?? "—"} to ${resort.typical_season_end ?? "—"}`}
              />
            )}
            {/* Stage 33 — night skiing row removed from About; it's
                already surfaced as a 🌙 feature chip in QuickStats /
                Amenities + as a filter chip on the homepage. Showing
                "No" was just noise. */}
          </div>
        </Section>
        )}

        {/* Snow alerts — Stage 29. Push notifications for new-snow events. */}
        <SnowAlertButton resortId={resort.id} resortName={resort.name} />

        {/* Reviews — Stage 28. RLS-driven, signed-out users see-only.
            Hidden platform-wide until the first review exists anywhere
            (an empty "No reviews yet" block on 425 pages is noise). */}
        {hasAnyReviews && <ResortReviews resortId={resort.id} />}

        {/* Listed footer — shown only when no stats are available */}
        {!hasAnyStats && (
          <div className="rounded-lg border border-wn-charcoal/10 bg-white p-4 text-sm text-wn-charcoal/70">
            <p className="font-medium text-wn-charcoal">More details coming soon.</p>
            <p className="mt-1">
              We have basic info for this resort. Detailed stats, hours, and gallery
              are added as Wynla grows. In the meantime, the resort website above is
              the best source for live conditions.
            </p>
          </div>
        )}

        {/* Mountains like this one — pure server-side recommender,
            computed from the active-resort pool fetched alongside the
            primary resort row above. */}
        <SimilarResorts
          currentResort={resort as unknown as SimilarityResort}
          allResorts={pool}
        />

        {/* Trust footer */}
        <footer className="mt-8 rounded-lg border border-wn-charcoal/10 bg-white/70 p-4 text-xs text-wn-charcoal/60">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <span>
              {resort.last_verified_at
                ? `Last verified ${new Date(resort.last_verified_at).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}`
                : "Not yet verified"}
            </span>
            <a
              href={`mailto:hello@wynla.app?subject=Incorrect%20info%20for%20${encodeURIComponent(resort.name)}&body=${encodeURIComponent(`Resort: ${resort.name}\nURL: https://wynla.app/resort/${resort.slug}\n\nWhat's wrong:\n`)}`}
              className="font-medium text-wn-charcoal/80 underline hover:text-wn-navy"
            >
              Report incorrect info →
            </a>
          </div>
          <p className="mt-2">
            Wynla shows verified resort info from official sources. We use “—” when
            a value isn’t confirmed — better that than a wrong number. Always check
            the resort site for live trail status.
          </p>
        </footer>
      </div>
    </main>
  );
}

// ---------- Helpers ----------

/** Tailwind chip styling for UV index. EPA/WHO scale: 0-2 low, 3-5
 *  moderate, 6-7 high, 8-10 very high, 11+ extreme. We treat 0-5 as
 *  neutral grey + 6+ as accent amber. */
function uvChipClass(uv: number): string {
  if (uv >= 8) {
    return "inline-flex items-center gap-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-800";
  }
  if (uv >= 6) {
    return "inline-flex items-center gap-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800";
  }
  return "inline-flex items-center gap-1 text-wn-charcoal/65";
}

function PassBadge({ pass }: { pass: string }) {
  const color = passColor(pass);
  const fg = pass === "ikon" ? "#1E2952" : "#FFFFFF";
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={{ backgroundColor: color, color: fg }}
    >
      {passLabel(pass)}
    </span>
  );
}

function Section({
  id,
  title,
  subtitle,
  children,
}: {
  /** Anchor target, e.g. the panel's "See all places nearby" link. */
  id?: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={id ? "scroll-mt-4" : undefined}>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-wn-navy sm:text-xl">{title}</h2>
        {subtitle && (
          <p className="text-xs text-wn-charcoal/60">{subtitle}</p>
        )}
      </div>
      {children}
    </section>
  );
}

/** Wind-hold thresholds + lift mix for a resort, shared by the today
 *  card and the 10-day strip. */
function windContextFor(resort: Resort): ResortWindContext {
  const mix = liftMixFromTypes(resort.lift_types);
  return {
    wind_hold_mph_chair: resort.wind_hold_mph_chair,
    wind_hold_mph_gondola: resort.wind_hold_mph_gondola,
    hasGondolaOrTram: mix != null && mix.gondolas + mix.trams > 0,
    liftMix: mix,
  };
}

// At-a-glance strip — status pill + four labelled numbers. Reads from
// the resort-reported snow columns first (what the mountain measured)
// and falls back to the station-derived weather_cache values, and says
// which one it is showing.
function AtAGlance({
  resort,
  weather,
  status,
  report,
}: {
  resort: Resort;
  weather: WeatherSnapshot | null;
  status: ResortStatus;
  report: SurfaceReport;
}) {
  const snowFromReport = resort.snow_new_24h_in != null;
  const snowNew24 = snowFromReport
    ? resort.snow_new_24h_in
    : weather?.snow_24h_in != null
      ? Number(weather.snow_24h_in)
      : null;
  const tiles: Array<{ label: string; value: string; sub?: string; accent?: boolean }> = [];
  tiles.push({
    label: "New snow (24h)",
    value: snowNew24 != null ? `${snowNew24}"` : "—",
    sub: snowNew24 == null ? "not reported" : snowFromReport ? "resort report" : "weather station",
    accent: snowNew24 != null && snowNew24 > 0,
  });
  tiles.push({
    label: "Base depth",
    value: resort.snow_base_depth_in != null ? `${resort.snow_base_depth_in}"` : "—",
    sub: resort.snow_base_depth_in != null ? "resort report" : "not reported",
  });
  tiles.push(
    report.dormant
      ? { label: "Surface", value: report.headline, sub: "forecast paused" }
      : { label: "Surface", value: report.today.label, sub: `${report.today.short} · ${report.today.confidence} confidence` },
  );
  tiles.push({
    label: "Today's temp",
    value:
      weather?.temp_high_f != null
        ? `${weather.temp_high_f}°${weather.temp_low_f != null ? ` / ${weather.temp_low_f}°F` : "F"}`
        : "—",
    sub: weather?.temp_high_f != null ? "high / low" : "not synced",
  });

  return (
    <section aria-label="At a glance" className="rounded-xl border border-wn-charcoal/10 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <ResortStatusPill status={status} size="md" />
      </div>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg bg-wn-offwhite px-3 py-2">
            <dt className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">{t.label}</dt>
            <dd className={`mt-0.5 truncate text-base font-extrabold tracking-tight ${t.accent ? "text-wn-sky" : "text-wn-navy"}`}>
              {t.value}
            </dd>
            {t.sub && <dd className="text-[10px] text-wn-charcoal/50">{t.sub}</dd>}
          </div>
        ))}
      </dl>
    </section>
  );
}

function ClosestAirportCard({ resort, lat, lng }: { resort: Resort; lat: number; lng: number }) {
  const iata = resort.closest_airport_iata!.toUpperCase();
  const airport = airportByIata(iata);
  // Prefer the researched DB distance; otherwise estimate from the two
  // coordinate pairs with the same drive model the trip planner uses.
  const estimatedMiles =
    airport && Number.isFinite(lat) && Number.isFinite(lng)
      ? Math.round(haversineMeters(lat, lng, airport.lat, airport.lng) / 1609.34)
      : null;
  const miles = resort.closest_airport_distance_mi ?? estimatedMiles;
  const isEstimate = resort.closest_airport_distance_mi == null;
  const driveText =
    airport && Number.isFinite(lat) && Number.isFinite(lng)
      ? formatDriveTime(estimateDriveSeconds(haversineMeters(lat, lng, airport.lat, airport.lng)))
      : null;
  return (
    <div className="rounded-lg border border-wn-charcoal/10 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-wn-navy/5 text-xl" aria-hidden="true">
          ✈️
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-lg font-extrabold tracking-tight text-wn-navy">
              {airport ? airport.name : "Nearest commercial airport"}
            </span>
            <span className="font-mono text-sm font-semibold text-wn-charcoal/60">{iata}</span>
          </div>
          <div className="text-xs text-wn-charcoal/65">
            {airport ? `${airport.city}, ${airport.state}` : "Airport details not on file"}
            {miles != null && ` · ${isEstimate ? "≈ " : ""}${miles} mi straight-line`}
            {driveText && ` · ~${driveText} drive (estimate)`}
          </div>
        </div>
        <a
          href={skyscannerUrl({
            name: resort.name,
            state: resort.state,
            lat,
            lng,
            closest_airport_iata: iata,
          })}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="inline-flex items-center gap-1 rounded-md border border-wn-charcoal/15 px-3 py-1.5 text-xs font-semibold text-wn-navy transition hover:border-wn-navy"
        >
          Flights to {iata} →
        </a>
      </div>
    </div>
  );
}

function QuickStats({
  resort,
  status,
  tz,
  now,
}: {
  resort: Resort;
  status: ResortStatus;
  tz: string | undefined;
  now: Date;
}) {
  const stats: Array<{ label: string; value: string }> = [];
  if (resort.vertical_drop) stats.push({ label: "Vertical drop", value: `${resort.vertical_drop.toLocaleString()} ft` });
  if (resort.total_trails) stats.push({ label: "Trails", value: String(resort.total_trails) });
  if (resort.total_lifts) {
    // Phase 3 one-app: when Tier 1 lift_types is available, derive a
    // richer label e.g. "21 (6 high-speed + 2 gondola)". Falls back to
    // the legacy high_speed_lifts label when only that field is set.
    const t = resort.lift_types;
    let value = String(resort.total_lifts);
    if (t) {
      // Same reader as the map filters (lib/liftTypes) so the page and
      // the "High-speed chair" filter can never disagree. The curated
      // high_speed_lifts column still wins when it is higher: 19 rows
      // (Breckenridge, Jackson Hole, Stowe, ...) carry a legacy JSON that
      // undercounts detachables, listed in
      // scripts/backfill-2026-09-23/reports/01-lift-types.md.
      const { highSpeed: jsonHs, gondola, tram } = liftCounts(t);
      const hs = Math.max(jsonHs, resort.high_speed_lifts ?? 0);
      const parts: string[] = [];
      if (hs > 0) parts.push(`${hs} HS chair`);
      if (gondola > 0) parts.push(`${gondola} gondola`);
      if (tram > 0) parts.push(`${tram} tram`);
      if (parts.length > 0) {
        value = `${resort.total_lifts} (${parts.join(" + ")})`;
      }
    } else if (resort.high_speed_lifts != null && resort.high_speed_lifts > 0) {
      value = `${resort.total_lifts} (${resort.high_speed_lifts} HS)`;
    }
    stats.push({ label: "Lifts", value });
  }
  if (resort.total_acres) stats.push({ label: "Skiable acres", value: resort.total_acres.toLocaleString() });
  const baseEl = resort.base_elevation_ft ?? resort.elevation_base;
  const summitEl = resort.summit_elevation_ft ?? resort.elevation_summit;
  if (baseEl != null) stats.push({ label: "Base elevation", value: `${baseEl.toLocaleString()} ft` });
  if (summitEl != null) stats.push({ label: "Summit elevation", value: `${summitEl.toLocaleString()} ft` });
  if (resort.annual_snowfall_in != null) stats.push({ label: "Annual snowfall", value: `${resort.annual_snowfall_in}" / yr` });
  if (resort.snowmaking_pct != null) stats.push({ label: "Snowmaking", value: `${resort.snowmaking_pct}%` });
  if (resort.season_open_text || resort.season_close_text) {
    stats.push({
      label: "Season",
      value: `${resort.season_open_text ?? "—"} → ${resort.season_close_text ?? "—"}`,
    });
  }
  if (resort.longest_run_miles) stats.push({ label: "Longest run", value: `${resort.longest_run_miles} mi` });

  const mix = getDifficultyMix(resort);
  const hasPark =
    resort.has_terrain_park === true || (resort.terrain_park_count ?? 0) > 0;

  if (stats.length === 0 && !mix && !hasPark) return null;

  // Features chip row. Terrain park lives in its own pill below the
  // difficulty bar so we don't duplicate it here. Stage 33 — each
  // feature ships its own emoji so the chip carries meaning at a
  // glance (Night skiing especially — the moon icon reads as "open
  // at night" much faster than a ✓ does).
  const features: Array<{ label: string; emoji: string }> = [];
  if (resort.has_halfpipe) features.push({ label: "Halfpipe", emoji: "🛹" });
  if (resort.has_glades) features.push({ label: "Glades", emoji: "🌲" });
  if (resort.has_night_skiing) features.push({ label: "Night skiing", emoji: "🌙" });

  // Expected weekend crowds — only when lifts are (likely) running; a
  // closed mountain isn't busy. "This weekend" = the next Saturday in
  // the resort's own calendar, not the UTC server's.
  const lat = resort.latitude == null ? null : Number(resort.latitude);
  const lng = resort.longitude == null ? null : Number(resort.longitude);
  const crowd =
    !status.dormant && lat != null && Number.isFinite(lat) && lng != null && Number.isFinite(lng)
      ? crowdForecast(
          {
            latitude: lat,
            longitude: lng,
            tier: resort.tier,
            vertical_drop: resort.vertical_drop,
            snow_new_24h_in: resort.snow_new_24h_in,
            snow_new_48h_in: resort.snow_new_48h_in,
            slug: resort.slug,
            state: resort.state,
          },
          upcomingSaturday(now, tz),
        )
      : null;
  // The label already says "this weekend", so the printed reason is the
  // first one that adds information (holiday, city, powder).
  const crowdReason = crowd?.reasons.find((r) => r !== "weekend" && r !== "midweek") ?? null;

  return (
    <Section title="Mountain stats">
      {stats.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {stats.map((s) => (
            <div
              key={s.label}
              className="rounded-lg border border-wn-charcoal/10 bg-white px-3 py-2.5"
            >
              <div className="text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/50">
                {s.label}
              </div>
              <div className="mt-0.5 text-base font-semibold text-wn-navy">
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {mix ? (
        <div className="mt-4 rounded-lg border border-wn-charcoal/10 bg-white p-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/50">
            Difficulty mix
          </div>
          <DifficultyBar mix={mix} size="full" showSourceHint />
        </div>
      ) : (
        <p className="mt-3 text-xs italic text-wn-charcoal/55">
          Difficulty mix not yet verified.
        </p>
      )}

      {crowd && (
        <div
          className={`mt-3 flex w-fit items-center gap-2 rounded-full border border-wn-charcoal/10 px-3 py-1.5 text-xs font-semibold ${CROWD_COLORS[crowd.level].bg} ${CROWD_COLORS[crowd.level].text}`}
          title="Estimated from resort size, proximity to a major city, weekend/holiday timing, and fresh snow"
        >
          <span className={`block h-2 w-2 rounded-full ${CROWD_COLORS[crowd.level].dot}`} aria-hidden="true" />
          <span>
            Est. {crowd.label.toLowerCase()} this weekend
            {crowdReason ? ` · ${crowdReason}` : ""}
          </span>
        </div>
      )}

      {hasPark && (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-wn-charcoal/15 bg-white px-3 py-1.5 text-xs font-medium text-wn-charcoal">
          <span
            className="block h-2.5 w-5 rounded-full bg-orange-500"
            aria-hidden="true"
          />
          <span>
            Terrain park
            {resort.terrain_park_count != null && resort.terrain_park_count > 0 && (
              <span className="ml-1 font-normal text-wn-charcoal/60">
                · {resort.terrain_park_count}
              </span>
            )}
          </span>
        </div>
      )}

      {features.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          {features.map((f) => (
            <span
              key={f.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-wn-charcoal/15 bg-white px-2.5 py-1 font-semibold text-wn-charcoal"
            >
              <span aria-hidden="true">{f.emoji}</span>
              <span>{f.label}</span>
            </span>
          ))}
        </div>
      )}
    </Section>
  );
}

function ActionLink({
  href,
  label,
  sub,
  external,
  emoji,
}: {
  href: string;
  label: string;
  sub?: string;
  external?: boolean;
  emoji?: string;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group flex items-center justify-between gap-3 rounded-lg border border-wn-charcoal/10 bg-white px-4 py-3 transition hover:border-wn-navy hover:shadow-sm"
    >
      <div className="flex items-center gap-3 min-w-0">
        {emoji && (
          <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-wn-navy/5 text-lg" aria-hidden="true">
            {emoji}
          </span>
        )}
        <div className="min-w-0">
          <div className="text-sm font-semibold text-wn-navy">{label}</div>
          {sub && <div className="text-xs text-wn-charcoal/60">{sub}</div>}
        </div>
      </div>
      <span className="text-wn-navy/40 transition group-hover:translate-x-0.5 group-hover:text-wn-navy">
        →
      </span>
    </a>
  );
}

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/50">
        {label}
      </div>
      <div className="text-sm text-wn-charcoal">{value}</div>
    </div>
  );
}

// Stage 33 — Compact "Today's weather" card that folds the old
// SnowReportCard data inline. Layout:
//
//   [optional status line: 🟢 Open · 79/175 trails ...]
//   [ 🌨️ 43°/36°F     |    💨 5 mph S    |    ❄️ 2"      ]
//   [ Light snow      |    Wind          |    24h new    ]
//
// Each column hides if its data is missing. Saves ~250px vertical
// vs the previous separate-section design while keeping all the
// decision-driving info: status, temp, wind, snow.
function FullWeatherCard({
  resort,
  weather,
  lat,
  lng,
  status,
  tz,
}: {
  resort: Resort;
  weather: WeatherSnapshot | null;
  lat: number;
  lng: number;
  status: ResortStatus;
  tz: string | undefined;
}) {
  const conditionEmoji = (cond: string | null): string => {
    if (!cond) return "🌤️";
    const c = cond.toLowerCase();
    if (c.includes("snow")) return "🌨️";
    if (c.includes("rain") || c.includes("shower")) return "🌧️";
    if (c.includes("thunder")) return "⛈️";
    if (c.includes("cloud")) return "☁️";
    if (c.includes("clear") || c.includes("sun")) return "☀️";
    if (c.includes("fog") || c.includes("mist")) return "🌫️";
    return "🌤️";
  };

  if (!weather || (weather.temp_high_f == null && weather.conditions_short == null)) {
    return (
      <div className="rounded-lg border border-dashed border-wn-charcoal/15 bg-white p-4 text-sm text-wn-charcoal/65">
        Live weather hasn&apos;t synced for this resort yet.
      </div>
    );
  }

  // New snow: resorts.snow_new_24h_in is MEASURED (NOHRSC analysis /
  // SNOTEL, or a licensed resort report when one exists) while
  // weather_cache holds today's FORECAST. Prefer measured, else forecast.
  const snowNew24 =
    resort.snow_new_24h_in ?? (weather.snow_24h_in != null ? Number(weather.snow_24h_in) : null);
  const base = resort.snow_base_depth_in;

  // Status line — the same derived status the at-a-glance pill shows
  // (open / opens ~date / off-season / check resort), so the weather card
  // never contradicts the strip. lib/seasonDates.deriveResortStatus reads
  // the verified open flag (resorts.currently_open: true / false with
  // evidence, null unknown) and only prints lifts / trails counts when a
  // licensed report (snow_report_status = 'reported') supplied them.
  const statusTone: Record<ResortStatus["tone"], string> = {
    green: "text-emerald-800",
    amber: "text-amber-800",
    red: "text-red-800",
    navy: "text-wn-navy",
    muted: "text-wn-charcoal/65",
  };
  // Only a licensed resort report has a "Snow report" time worth dating;
  // for 'no_feed' rows snow_report_updated_at is just the last season-
  // status evaluation.
  const reported = resort.snow_report_status === "reported";

  return (
    <div className="rounded-lg border border-wn-charcoal/10 bg-white p-4">
      <div className={`mb-3 text-xs font-semibold ${statusTone[status.tone]}`}>
        {status.label}
        {status.detail && (
          <span className="ml-1 font-normal text-wn-charcoal/60">· {status.detail}</span>
        )}
        {status.dormant && (
          <span className="ml-1 font-normal text-wn-charcoal/60">· surface forecast paused until lifts run</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2 text-center sm:gap-4">
        {/* Weather column */}
        <WeatherStat
          icon={conditionEmoji(weather.conditions_short)}
          value={
            weather.temp_high_f != null
              ? `${weather.temp_high_f}°${
                  weather.temp_low_f != null ? `/${weather.temp_low_f}°F` : "F"
                }`
              : "—"
          }
          label={weather.conditions_short ?? "Weather"}
        />
        {/* Wind column — adds a wind-hold warning chip when GUSTS (or
            sustained wind when gusts are unknown) exceed the resort's
            chairlift/gondola hold threshold (or default 35/50 mph when
            Phase 2 hasn't filled per-resort values yet). Chip is hidden
            on normal wind days. */}
        {(() => {
          const evaluation = evaluateWindHold(
            { sustained: weather.wind_mph_avg, gust: weather.wind_mph_gust },
            windContextFor(resort),
          );
          const cls = windHoldChipClass(evaluation.level);
          const gustLabel =
            weather.wind_mph_gust != null && weather.wind_mph_avg != null && weather.wind_mph_gust > weather.wind_mph_avg
              ? `gusts ${weather.wind_mph_gust} mph`
              : "sustained";
          return (
            <WeatherStat
              icon="💨"
              value={
                weather.wind_mph_avg != null
                  ? `${weather.wind_mph_avg} mph${weather.wind_dir_short ? " " + weather.wind_dir_short : ""}`
                  : "—"
              }
              label={weather.wind_mph_avg != null ? `Wind · ${gustLabel}` : "Wind"}
              divider
              warning={
                evaluation.level === "ok"
                  ? null
                  : {
                      icon: cls.icon,
                      label: `${evaluation.label} · ${evaluation.detail}`,
                      class: cls.container,
                    }
              }
            />
          );
        })()}
        {/* Snow column */}
        <WeatherStat
          icon="❄️"
          value={snowNew24 != null ? `${snowNew24}"` : "—"}
          label={base != null ? `24h new · ${base}" base` : "24h new"}
          accent={snowNew24 != null && snowNew24 > 0}
        />
      </div>

      {/* Sun / UV row — sunrise, sunset, daylight hours, today's UV.
          Sun times computed server-side from lat/lng (NOAA algorithm).
          UV pulled from forecast_json[0].uv_index_max (Open-Meteo) when
          available. */}
      {(() => {
        const sun = computeSunTimes(lat, lng);
        const todayUv = forecastDaysFrom(weather.forecast_json)[0]?.uv_index_max ?? null;
        if (!sun && todayUv == null) return null;
        return (
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium text-wn-charcoal/70">
            {sun && (
              <>
                <span>
                  <span aria-hidden="true">🌅</span> Sunrise{" "}
                  <span className="font-bold text-wn-navy">
                    {formatLocal(sun.sunrise, tz)}
                  </span>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  <span aria-hidden="true">🌇</span> Sunset{" "}
                  <span className="font-bold text-wn-navy">
                    {formatLocal(sun.sunset, tz)}
                  </span>
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-wn-charcoal/55">
                  {sun.daylightHours}h daylight
                </span>
              </>
            )}
            {todayUv != null && (
              <>
                {sun && <span aria-hidden="true">·</span>}
                <span className={uvChipClass(todayUv)}>
                  <span aria-hidden="true">☀️</span> UV {todayUv}
                  {todayUv >= 6 && " — wear sunscreen"}
                </span>
              </>
            )}
          </div>
        );
      })()}

      {/* Sync stamps in the RESORT's clock with the zone named — the ISR
          server renders in UTC, so a bare "12:03 PM" was wrong for every
          visitor. The snow-report stamp only shows for a licensed resort
          report; a 'no_feed' row has no report worth dating. */}
      {weather.fetched_at && (
        <p className="mt-3 text-[10px] text-wn-charcoal/45">
          Weather synced {formatStampInZone(new Date(weather.fetched_at), tz)}
          {reported && resort.snow_report_updated_at && (
            <>
              {" · Snow report "}
              {formatStampInZone(new Date(resort.snow_report_updated_at), tz)}
            </>
          )}
        </p>
      )}
    </div>
  );
}

function WeatherStat({
  icon,
  value,
  label,
  accent = false,
  divider = false,
  warning,
}: {
  icon: string;
  value: string;
  label: string;
  accent?: boolean;
  divider?: boolean;
  /** Optional wind-hold-style warning chip rendered under the label. */
  warning?: { icon: string; label: string; class: string } | null;
}) {
  return (
    <div
      className={
        divider
          ? "border-l border-r border-wn-charcoal/10 px-1 sm:px-3"
          : "px-1 sm:px-3"
      }
    >
      <div className="text-3xl leading-none sm:text-4xl" aria-hidden="true">
        {icon}
      </div>
      <div
        className={`mt-1.5 text-base font-extrabold tracking-tight sm:text-lg ${
          accent ? "text-wn-sky" : "text-wn-navy"
        }`}
      >
        {value}
      </div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-wn-charcoal/55 truncate">
        {label}
      </div>
      {warning && (
        <div className={`mt-1 ${warning.class}`}>
          <span aria-hidden="true">{warning.icon}</span>
          <span>{warning.label}</span>
        </div>
      )}
    </div>
  );
}


// 10-day forecast strip — horizontal scroll carousel. One card per
// day; cards are a fixed width so 3-4 fit on mobile and 6-7 on
// desktop, and the user swipes/scrolls sideways to see the rest.
// snap-x mandatory so each swipe lands cleanly on a day boundary
// instead of stopping mid-card. The right-edge fade is a soft hint
// that more days are off-screen; pair with the section subtitle copy
// "swipe sideways" so the affordance is also told in words.
//
// Days 8-10 visually de-emphasize (slightly muted background) because
// Open-Meteo's accuracy past day 7 is noticeably looser than NWS days
// 1-7. We label them with "trend" rather than promising a number.
function TenDayForecast({
  days,
  resortWind,
}: {
  days: ForecastDay[];
  resortWind: ResortWindContext;
}) {
  const emoji = (cond: string | null): string => {
    if (!cond) return "🌤️";
    const c = cond.toLowerCase();
    if (c.includes("snow")) return "🌨️";
    if (c.includes("rain") || c.includes("shower")) return "🌧️";
    if (c.includes("thunder")) return "⛈️";
    if (c.includes("cloud")) return "☁️";
    if (c.includes("clear") || c.includes("sun")) return "☀️";
    if (c.includes("fog") || c.includes("mist")) return "🌫️";
    return "🌤️";
  };
  return (
    <div className="relative">
      <div
        className="-mx-4 flex snap-x snap-mandatory gap-2 overflow-x-auto overflow-y-hidden px-4 pb-2 [scrollbar-width:thin] sm:mx-0 sm:px-0"
        style={{
          // Phones: horizontal scroll only, never pan the page vertically
          // when swiping the strip. Stays smooth on iOS Safari.
          touchAction: "pan-x",
          WebkitOverflowScrolling: "touch",
        }}
        aria-label="10-day forecast (scrollable)"
        role="region"
      >
        {days.map((d, i) => {
          const isTrend = i >= 7; // days 8-10 — Open-Meteo trend, not NWS
          return (
            <div
              key={`${d.date}-${i}`}
              className={[
                "snap-start shrink-0 rounded-lg border p-3 text-center",
                // Stage 33 — trend cards: keep a dashed border to flag
                // them as less-trusted, but drop the muted background.
                // The faded-text variant was unreadable on mobile.
                isTrend
                  ? "w-[88px] border-dashed border-wn-charcoal/30 bg-white"
                  : "w-[88px] border-wn-charcoal/10 bg-white",
              ].join(" ")}
            >
              <div className="text-[10px] font-bold uppercase tracking-wide text-wn-navy">
                {d.weekday ||
                  new Date(d.date).toLocaleDateString(undefined, {
                    weekday: "short",
                  })}
              </div>
              <div className="text-[9px] font-medium text-wn-charcoal/60">
                {new Date(d.date + "T12:00:00").toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="my-1 text-2xl" aria-hidden="true">
                {emoji(d.conditions_short)}
              </div>
              <div className="text-sm font-bold text-wn-navy">
                {d.temp_high_f != null ? `${d.temp_high_f}°` : "—"}
                {d.temp_low_f != null && (
                  <span className="ml-1 text-xs font-semibold text-wn-charcoal/70">
                    / {d.temp_low_f}°
                  </span>
                )}
              </div>
              {d.snow_in != null && d.snow_in > 0 && (
                <div className="mt-1 inline-block rounded bg-wn-sky/15 px-1.5 py-0.5 text-[10px] font-bold text-wn-navy">
                  ❄️ {d.snow_in}&quot;
                </div>
              )}
              {d.precip_chance != null &&
                d.precip_chance > 30 &&
                (d.snow_in == null || d.snow_in === 0) && (
                  <div className="mt-1 text-[10px] font-semibold text-wn-charcoal/70">
                    {d.precip_chance}% precip
                  </div>
                )}
              {d.wind_short && (() => {
                // Gusts from the v2 pipeline field when present, else
                // parsed out of NWS wording ("… gusts as high as 45 mph").
                const parsed = parseWindFromText(d.wind_short);
                const evaluation = evaluateWindHold(
                  { sustained: parsed.sustained, gust: d.wind_gust_mph ?? parsed.gust },
                  resortWind,
                );
                const cls = windHoldChipClass(evaluation.level);
                return (
                  <>
                    <div className="mt-1 text-[10px] font-medium text-wn-charcoal/65">
                      💨 {d.wind_short}
                      {d.wind_dir_short ? ` ${d.wind_dir_short}` : ""}
                    </div>
                    {evaluation.level !== "ok" && (
                      <div className={`mt-1 ${cls.container}`} title={evaluation.detail}>
                        <span aria-hidden="true">{cls.icon}</span>
                        <span>{evaluation.label}</span>
                      </div>
                    )}
                  </>
                );
              })()}
              {isTrend && (
                <div className="mt-1 text-[9px] font-bold uppercase tracking-wide text-wn-charcoal/55">
                  trend
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Soft right-edge fade — visual hint that the strip scrolls. Hidden
          on desktop where the full set usually fits without scrolling. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 hidden w-8 bg-gradient-to-l from-wn-offwhite to-transparent sm:hidden"
      />
    </div>
  );
}

function FullAmenities({ resort }: { resort: Resort }) {
  // Stage 33 — night skiing / glades / halfpipe removed from this list
  // because they already render as feature chips inside QuickStats
  // (the "Mountain stats" block above). The Amenities section now
  // covers ONLY things QuickStats doesn't surface, so a resort never
  // shows the same icon twice on the same page.
  const items: Array<{ key: string; label: string; emoji: string; on: boolean }> = [
    { key: "tubing", label: "Tubing", emoji: "🛷", on: resort.has_tubing === true },
    { key: "lessons", label: "Ski school", emoji: "🎓", on: resort.has_lessons === true },
    { key: "rentals", label: "Rentals", emoji: "🎿", on: resort.has_rentals === true },
    { key: "lodging", label: "On-mountain lodging", emoji: "🏨", on: resort.has_lodging_on_mountain === true },
    { key: "xc", label: "XC skiing", emoji: "⛷️", on: resort.has_xc_skiing === true },
    { key: "backcountry", label: "Backcountry access", emoji: "🏔️", on: resort.has_backcountry_access === true },
  ];
  const active = items.filter((i) => i.on);
  if (active.length === 0) return null;
  return (
    <Section title="Amenities">
      <div className="flex flex-wrap gap-1.5">
        {active.map((i) => (
          <span
            key={i.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-wn-charcoal/15 bg-white px-3 py-1.5 text-sm font-semibold text-wn-charcoal"
          >
            <span aria-hidden="true">{i.emoji}</span>
            <span>{i.label}</span>
          </span>
        ))}
      </div>
    </Section>
  );
}
