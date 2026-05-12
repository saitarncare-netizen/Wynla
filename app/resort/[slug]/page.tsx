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
  weatherGovUrl,
  windyUrl,
  googleMapsUrl,
  lodgingSearchUrl,
  airbnbSearchUrl,
} from "@/lib/externalLinks";
import { getDifficultyMix } from "@/lib/difficulty";
import FavoriteToggle from "@/components/auth/FavoriteToggle";
import DifficultyBar from "@/components/Map/DifficultyBar";
import ResortReviews from "@/components/Map/ResortReviews";
import SnowAlertButton from "@/components/SnowAlertButton";

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
};

async function getData(slug: string): Promise<{ resort: Resort; weather: WeatherSnapshot | null } | null> {
  const { data: resort, error } = await supabase
    .from("resorts")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error || !resort) return null;
  const { data: wx } = await supabase
    .from("weather_cache")
    .select(
      "resort_id, temp_high_f, temp_low_f, conditions_short, snow_24h_in, snow_48h_in, wind_mph_avg, wind_dir_short, fetched_at",
    )
    .eq("resort_id", resort.id)
    .maybeSingle();
  return { resort: resort as Resort, weather: (wx as WeatherSnapshot) ?? null };
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
  const { resort, weather } = data;

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

        {/* Top bar — back link + favorite */}
        <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-1.5 text-xs font-semibold text-wn-navy shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            ← Map
          </Link>
          <FavoriteToggle resortId={resort.id} size="lg" />
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

        {/* WEATHER — in-app card driven by weather_cache, with the
            external links surfaced as small follow-ons. */}
        <Section title="Today's weather">
          <FullWeatherCard weather={weather} lat={lat} lng={lng} />
        </Section>

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
            <ActionLink
              href={weatherGovUrl(lat, lng)}
              label="🌡️ Weather.gov"
              sub="Official 7-day forecast"
              external
            />
            <ActionLink
              href={windyUrl(lat, lng)}
              label="🌬️ Windy.com"
              sub="Animated wind layer"
              external
            />
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

        {/* ABOUT — always show; inner rows gracefully omit when fields are null */}
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
            {resort.has_night_skiing != null && (
              <DataRow
                label="Night skiing"
                value={resort.has_night_skiing ? "Yes" : "No"}
              />
            )}
          </div>
        </Section>

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
  // difficulty bar so we don't duplicate it here.
  const features: string[] = [];
  if (resort.has_halfpipe) features.push("Halfpipe");
  if (resort.has_glades) features.push("Glades");
  if (resort.has_night_skiing) features.push("Night skiing");

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
              key={f}
              className="rounded-full border border-wn-charcoal/15 bg-white px-2.5 py-1 font-medium text-wn-charcoal"
            >
              ✓ {f}
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

// In-page weather card — same data model as the homepage ResortPanel.
// Falls back to "no data yet" state when weather_cache hasn't refreshed.
function FullWeatherCard({
  weather,
  lat,
  lng,
}: {
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
        Live weather hasn&apos;t synced for this resort yet. Use the links below
        for current conditions.
      </div>
    );
  }
  const snow24 = weather.snow_24h_in != null ? Number(weather.snow_24h_in) : null;
  const snow48 = weather.snow_48h_in != null ? Number(weather.snow_48h_in) : null;
  return (
    <div className="rounded-lg border border-wn-charcoal/10 bg-white p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl" aria-hidden="true">
            {conditionEmoji(weather.conditions_short)}
          </span>
          <div>
            <div className="text-2xl font-extrabold tracking-tight text-wn-navy">
              {weather.temp_high_f != null ? `${weather.temp_high_f}°F` : "—"}
              {weather.temp_low_f != null && (
                <span className="ml-2 text-base font-semibold text-wn-charcoal/60">
                  / {weather.temp_low_f}°F
                </span>
              )}
            </div>
            <div className="text-xs text-wn-charcoal/65">
              {weather.conditions_short ?? "—"}
            </div>
          </div>
        </div>
        {(snow24 != null && snow24 > 0) || (snow48 != null && snow48 > 0) ? (
          <div className="rounded-md bg-wn-sky/15 px-3 py-1.5 text-right">
            <div className="text-[10px] font-semibold uppercase tracking-wide text-wn-navy/70">
              Snow
            </div>
            <div className="text-sm font-bold text-wn-navy">
              {snow24 != null && snow24 > 0 && <>{snow24}&quot; (24h) </>}
              {snow48 != null && snow48 > 0 && <>· {snow48}&quot; (48h)</>}
            </div>
          </div>
        ) : null}
      </div>
      {(weather.wind_mph_avg != null || weather.wind_dir_short) && (
        <p className="mt-2 text-xs text-wn-charcoal/65">
          🌬️ Wind {weather.wind_mph_avg != null ? `${weather.wind_mph_avg} mph` : ""}
          {weather.wind_dir_short ? ` ${weather.wind_dir_short}` : ""}
        </p>
      )}
      {weather.fetched_at && (
        <p className="mt-1 text-[10px] text-wn-charcoal/45">
          Synced{" "}
          {new Date(weather.fetched_at).toLocaleString(undefined, {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      )}
      {/* Hint that we have lat/lng if user wants external sources */}
      <p className="mt-2 text-[10px] text-wn-charcoal/40">
        {lat.toFixed(3)}, {lng.toFixed(3)}
      </p>
    </div>
  );
}

function FullAmenities({ resort }: { resort: Resort }) {
  const items: Array<{ key: string; label: string; emoji: string; on: boolean }> = [
    { key: "tubing", label: "Tubing", emoji: "🛷", on: resort.has_tubing === true },
    { key: "lessons", label: "Ski school", emoji: "🎓", on: resort.has_lessons === true },
    { key: "rentals", label: "Rentals", emoji: "🎿", on: resort.has_rentals === true },
    { key: "lodging", label: "On-mountain lodging", emoji: "🏨", on: resort.has_lodging_on_mountain === true },
    { key: "xc", label: "XC skiing", emoji: "⛷️", on: resort.has_xc_skiing === true },
    { key: "backcountry", label: "Backcountry access", emoji: "🏔️", on: resort.has_backcountry_access === true },
    { key: "night", label: "Night skiing", emoji: "🌙", on: resort.has_night_skiing === true },
    { key: "glades", label: "Glades", emoji: "🌲", on: resort.has_glades === true },
    { key: "halfpipe", label: "Halfpipe", emoji: "🛹", on: resort.has_halfpipe === true },
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
