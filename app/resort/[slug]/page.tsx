import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  passColor,
  passLabel,
  primaryPass,
} from "@/lib/passColors";
import {
  googleMapsUrl,
  lodgingSearchUrl,
  airbnbSearchUrl,
} from "@/lib/externalLinks";
import { getDifficultyMix } from "@/lib/difficulty";
import FavoriteToggle from "@/components/auth/FavoriteToggle";
import CompareToggle from "@/components/CompareToggle";
import RecordRecentVisit from "@/components/RecordRecentVisit";
import DifficultyBar from "@/components/Map/DifficultyBar";
import ResortReviews from "@/components/Map/ResortReviews";
import SnowAlertButton from "@/components/SnowAlertButton";
import SeasonCountdown from "@/components/SeasonCountdown";
import { parseSeasonDates } from "@/lib/seasonDates";
import SimilarResorts from "@/components/SimilarResorts";
import type { SimilarityResort } from "@/lib/similarity";

export const dynamic = "force-dynamic";

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
};

type WeatherSnapshot = {
  resort_id: number;
  temp_high_f: number | null;
  temp_low_f: number | null;
  conditions_short: string | null;
  snow_24h_in: number | string | null;
  snow_48h_in: number | string | null;
  wind_mph_avg: number | null;
  wind_dir_short: string | null;
  fetched_at: string | null;
  forecast_json: ForecastDay[] | null;
};

async function getData(
  slug: string,
): Promise<{
  resort: Resort;
  weather: WeatherSnapshot | null;
  pool: SimilarityResort[];
} | null> {
  // Fetch resort, weather, and the active-resort pool in parallel.
  // The pool select is trimmed to just the columns similarity.ts needs
  // (no images/links/booleans) so we don't pay for transferring 50+
  // columns × ~450 rows on a page that only reads ~10 of them.
  const [resortRes, poolRes] = await Promise.all([
    supabase
      .from("resorts")
      .select("*")
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

  const { data: wx } = await supabase
    .from("weather_cache")
    .select(
      "resort_id, temp_high_f, temp_low_f, conditions_short, snow_24h_in, snow_48h_in, wind_mph_avg, wind_dir_short, fetched_at, forecast_json",
    )
    .eq("resort_id", resort.id)
    .maybeSingle();
  return {
    resort,
    weather: (wx as WeatherSnapshot) ?? null,
    pool: (poolRes.data ?? []) as SimilarityResort[],
  };
}

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
    openGraph: {
      title: `${resort.name} · Wynla`,
      description: `Ski resort in ${resort.state}${resort.region ? " (" + resort.region + ")" : ""}`,
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
  const { resort, weather, pool } = data;

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

      {/* HERO — gradient only. Stage 25 hero photo data stays in DB
          (hero_image_url) but UI keeps the uniform gradient until
          coverage > 70%. Re-enable in Stage 25.2 once raw-HTML scraper
          fills the gaps. */}
      <header
        className="relative w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${heroBg} 0%, #1E2952 60%, #0F1530 100%)`,
        }}
      >
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
          <Link
            href="/"
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
          {/* Season countdown — sits just under the hero title for
              high visibility. Hidden when both season fields can't be
              parsed (status === "unknown"). */}
          {(() => {
            const seasonInfo = parseSeasonDates(
              resort.season_open_text,
              resort.season_close_text,
            );
            if (seasonInfo.status === "unknown") return null;
            return (
              <div className="mt-4">
                <SeasonCountdown info={seasonInfo} variant="hero" />
              </div>
            );
          })()}
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
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
        {/* QUICK STATS — show whenever any stats exist (QuickStats returns null otherwise) */}
        <QuickStats resort={resort} />

        {/* TODAY'S WEATHER — Stage 33 merge: snow + status from the
            Stage 26 columns are now inline in the 3-icon weather row
            instead of a separate "Today's snow report" section. */}
        <Section title="Today's weather">
          <FullWeatherCard resort={resort} weather={weather} lat={lat} lng={lng} />
        </Section>

        {/* 10-DAY FORECAST — pulled from weather_cache.forecast_json on
            the same daily cron that powers Today's weather. NWS gives
            ~7 reliable days, Open-Meteo fills 8-10. Horizontal-scroll
            strip so the user sees a few days at once and swipes for
            the rest — feels more natural on phones than a stacked grid. */}
        {weather?.forecast_json && weather.forecast_json.length > 0 && (
          <Section
            title={`${Math.min(weather.forecast_json.length, 10)}-day forecast`}
            subtitle={
              weather.forecast_json.length >= 8
                ? "Swipe sideways to see the full window. Days 8–10 are trend-only."
                : "Swipe sideways to see the full window."
            }
          >
            <TenDayForecast days={weather.forecast_json.slice(0, 10)} />
          </Section>
        )}

        {/* AMENITIES — Stage 23 booleans + legacy night/halfpipe/glades. */}
        <FullAmenities resort={resort} />

        {/* CLOSEST AIRPORT — Stage 23. */}
        {resort.closest_airport_iata && (
          <Section title="Closest airport">
            <div className="rounded-lg border border-wn-charcoal/10 bg-white px-4 py-3">
              <div className="flex items-baseline gap-3">
                <span className="text-2xl font-extrabold tracking-tight text-wn-navy">
                  ✈️ {resort.closest_airport_iata}
                </span>
                {resort.closest_airport_distance_mi != null && (
                  <span className="text-sm text-wn-charcoal/65">
                    {resort.closest_airport_distance_mi} mi away
                  </span>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* QUICK ACTIONS — Google Maps + Trail map + Webcam. Resort
            website + ticket-booking links dropped Stage 21.5 since many
            were broken or stale. Find-lodging dropped too — it can be
            added back later if user feedback wants it. */}
        <Section title="Visit & book">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ActionLink
              href={googleMapsUrl(resort.name, resort.state)}
              label="Open in Google Maps"
              sub="Navigation, photos, reviews"
              external
            />
            {resort.trail_map_url && (
              <ActionLink href={resort.trail_map_url} label="Trail map" sub="Lifts, runs, terrain" external />
            )}
            {resort.webcam_url && (
              <ActionLink href={resort.webcam_url} label="Live webcam" sub="Current conditions" external />
            )}
            {/* Weather.gov + Windy.com links removed Stage 33 — Wynla
                now ships its own 10-day forecast + live snow report
                above this section, so the external links were
                redundant and pushed users off the site. */}
            <ActionLink
              href={lodgingSearchUrl(resort.name, resort.state)}
              label="🏨 Find lodging"
              sub="Booking.com nearby"
              external
            />
            <ActionLink
              href={airbnbSearchUrl(resort.name, resort.state)}
              label="🏡 Airbnb nearby"
              sub="Homes + cabins"
              external
            />
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

        {/* Reviews — Stage 28. RLS-driven, signed-out users see-only. */}
        <ResortReviews resortId={resort.id} />

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
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
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

function QuickStats({ resort }: { resort: Resort }) {
  const stats: Array<{ label: string; value: string }> = [];
  if (resort.vertical_drop) stats.push({ label: "Vertical drop", value: `${resort.vertical_drop.toLocaleString()} ft` });
  if (resort.total_trails) stats.push({ label: "Trails", value: String(resort.total_trails) });
  if (resort.total_lifts) {
    const hs = resort.high_speed_lifts;
    stats.push({
      label: "Lifts",
      value: hs != null && hs > 0 ? `${resort.total_lifts} (${hs} HS)` : String(resort.total_lifts),
    });
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
}: {
  href: string;
  label: string;
  sub?: string;
  external?: boolean;
}) {
  return (
    <a
      href={href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="group flex items-center justify-between rounded-lg border border-wn-charcoal/10 bg-white px-4 py-3 transition hover:border-wn-navy hover:shadow-sm"
    >
      <div>
        <div className="text-sm font-semibold text-wn-navy">{label}</div>
        {sub && <div className="text-xs text-wn-charcoal/60">{sub}</div>}
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
}: {
  resort: Resort;
  weather: WeatherSnapshot | null;
  lat: number;
  lng: number;
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

  // Combine new-snow from weather_cache (live NWS-derived) and the
  // Stage 26 cron column. Prefer the cron column when set since it
  // pulls from OnTheSnow's resort-reported numbers; fall back to NWS.
  const snowNew24 =
    resort.snow_new_24h_in ?? (weather.snow_24h_in != null ? Number(weather.snow_24h_in) : null);
  const base = resort.snow_base_depth_in;

  // Status line — open/closed/limited/off-season, with trails+lifts
  // open ratios inline when applicable. Hide for "unknown" (Open-Meteo
  // fallback couldn't infer status reliably).
  const status = resort.snow_report_status;
  const trailsOpen = resort.trails_open_today;
  const totalTrails = resort.total_trails;
  const liftsOpen = resort.lifts_open_today;
  const totalLifts = resort.total_lifts;
  // Status labels — written so a casual visitor reads them without a
  // glossary. "Closed" alone (the raw OnTheSnow term) confused testers
  // who thought it meant "closed today" rather than "winter ended".
  const statusMeta: Record<
    string,
    { emoji: string; label: string; color: string }
  > = {
    open: { emoji: "🟢", label: "Open today", color: "text-emerald-800" },
    closed: { emoji: "🔴", label: "Closed for the season", color: "text-red-800" },
    limited: { emoji: "🟡", label: "Limited operations", color: "text-amber-800" },
    "off-season": { emoji: "🌸", label: "Off-season — opens in Nov", color: "text-wn-charcoal/65" },
  };
  const sm = status ? statusMeta[status] : null;
  const trailsStr =
    trailsOpen != null && totalTrails != null && totalTrails > 0
      ? `${trailsOpen}/${totalTrails} trails`
      : null;
  const liftsStr =
    liftsOpen != null && totalLifts != null && totalLifts > 0
      ? `${liftsOpen}/${totalLifts} lifts`
      : null;

  return (
    <div className="rounded-lg border border-wn-charcoal/10 bg-white p-4">
      {sm && (
        <div className={`mb-3 text-xs font-semibold ${sm.color}`}>
          <span aria-hidden="true">{sm.emoji}</span> {sm.label}
          {(trailsStr || liftsStr) && status === "open" && (
            <span className="ml-1 font-normal text-wn-charcoal/60">
              · {[trailsStr, liftsStr].filter(Boolean).join(" · ")}
            </span>
          )}
        </div>
      )}

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
        {/* Wind column */}
        <WeatherStat
          icon="💨"
          value={
            weather.wind_mph_avg != null
              ? `${weather.wind_mph_avg} mph${weather.wind_dir_short ? " " + weather.wind_dir_short : ""}`
              : "—"
          }
          label="Wind"
          divider
        />
        {/* Snow column */}
        <WeatherStat
          icon="❄️"
          value={snowNew24 != null ? `${snowNew24}"` : "—"}
          label={
            base != null ? `${base}" base` : "24h new"
          }
          accent={snowNew24 != null && snowNew24 > 0}
        />
      </div>

      {weather.fetched_at && (
        <p className="mt-3 text-[10px] text-wn-charcoal/45">
          Synced{" "}
          {new Date(weather.fetched_at).toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
          {resort.snow_report_updated_at && status && status !== "unknown" && (
            <>
              {" · Snow report "}
              {new Date(resort.snow_report_updated_at).toLocaleString(
                undefined,
                { weekday: "short", hour: "numeric", minute: "2-digit" },
              )}
            </>
          )}
        </p>
      )}
      {/* Tiny coord footer kept for users who want to plug into external
          tools. Not a link — just a hint that lat/lng is known. */}
      <p className="mt-1 text-[10px] text-wn-charcoal/40">
        {lat.toFixed(3)}, {lng.toFixed(3)}
      </p>
    </div>
  );
}

function WeatherStat({
  icon,
  value,
  label,
  accent = false,
  divider = false,
}: {
  icon: string;
  value: string;
  label: string;
  accent?: boolean;
  divider?: boolean;
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
function TenDayForecast({ days }: { days: ForecastDay[] }) {
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
              {d.wind_short && (
                <div className="mt-1 text-[10px] font-medium text-wn-charcoal/65">
                  💨 {d.wind_short}
                  {d.wind_dir_short ? ` ${d.wind_dir_short}` : ""}
                </div>
              )}
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

function BestTimeStrip({ start, end }: { start: string; end: string }) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // Parse "YYYY-MM-DD" or "MM-DD" or just month names — be permissive
  const toMonthIdx = (s: string): number | null => {
    const m = /(\d{4}-)?(\d{1,2})/.exec(s);
    if (m) {
      const idx = parseInt(m[2], 10) - 1;
      return idx >= 0 && idx < 12 ? idx : null;
    }
    const lower = s.slice(0, 3).toLowerCase();
    const i = months.findIndex((mm) => mm.toLowerCase() === lower);
    return i >= 0 ? i : null;
  };
  const a = toMonthIdx(start);
  const b = toMonthIdx(end);
  if (a == null || b == null) return null;
  const isInRange = (i: number) => {
    if (a <= b) return i >= a && i <= b;
    return i >= a || i <= b; // wraps year-end (e.g., Nov–Apr)
  };
  return (
    <div className="rounded-lg border border-wn-charcoal/10 bg-white p-3">
      <div className="grid grid-cols-12 gap-1">
        {months.map((m, i) => (
          <div
            key={m}
            className={`flex h-9 items-center justify-center rounded text-[10px] font-semibold ${
              isInRange(i)
                ? "bg-wn-navy text-white"
                : "bg-wn-charcoal/5 text-wn-charcoal/40"
            }`}
          >
            {m}
          </div>
        ))}
      </div>
    </div>
  );
}
