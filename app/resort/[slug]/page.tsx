import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getForecast, dayLabel, type WeatherDay } from "@/lib/weather";
import { staticMapUrl } from "@/lib/mapboxStatic";
import {
  passColor,
  passLabel,
  passShort,
  PASS_COLORS,
  type Pass,
} from "@/lib/passColors";
import { ORIGINS, formatDriveTime } from "@/lib/origins";

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
};

type DriveTime = {
  origin_name: string;
  duration_seconds: number;
  distance_meters: number | null;
};

async function getData(slug: string): Promise<{ resort: Resort; driveTimes: DriveTime[] } | null> {
  const { data: resort, error } = await supabase
    .from("resorts")
    .select("*")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (error || !resort) return null;
  const { data: dt } = await supabase
    .from("drive_time_cache")
    .select("origin_name, duration_seconds, distance_meters")
    .eq("resort_id", resort.id);
  return { resort: resort as Resort, driveTimes: (dt as DriveTime[]) ?? [] };
}

function primaryPass(passes: string[] | null | undefined): string {
  return passes?.[0] ?? "independent";
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
  const lng = Number(resort.longitude);
  const lat = Number(resort.latitude);
  const ogImage = staticMapUrl({
    lng,
    lat,
    zoom: 8,
    width: 1200,
    height: 630,
    pinColor: passColor(primaryPass(resort.passes)),
  });
  const passSummary = (resort.passes ?? [])
    .map((p) => passLabel(p))
    .join(", ");

  return {
    title: `${resort.name} — ${resort.state} Ski Resort · Wynla`,
    description: `${resort.name} in ${resort.state}${resort.region ? " (" + resort.region + ")" : ""}. ${passSummary ? "On the " + passSummary + ". " : ""}Plan your ski or snowboard trip with weather, drive times, and resort info.`,
    openGraph: {
      title: `${resort.name} · Wynla`,
      description: `Ski resort in ${resort.state}${resort.region ? " (" + resort.region + ")" : ""}`,
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
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
  const { resort, driveTimes } = data;

  const lng = Number(resort.longitude);
  const lat = Number(resort.latitude);
  const isFeatured = resort.tier === "featured";
  const primary = primaryPass(resort.passes);
  const heroUrl = staticMapUrl({
    lng,
    lat,
    zoom: 9,
    width: 1600,
    height: 540,
    pinColor: passColor(primary),
  });

  // Weather (Next.js fetch caches 30 min server-side)
  let weather: WeatherDay[] = [];
  try {
    weather = await getForecast(lat, lng);
  } catch (err) {
    console.error("Weather fetch failed for", resort.slug, err);
  }
  const todayIso = new Date().toISOString().slice(0, 10);

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
            image: heroUrl || undefined,
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

      {/* HERO */}
      <header className="relative h-[58vh] min-h-[400px] w-full overflow-hidden">
        {heroUrl ? (
          // Static map background; eslint-disable-next-line @next/next/no-img-element
          <img
            src={heroUrl}
            alt={`Map of ${resort.name}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-wn-navy" />
        )}
        {/* Gradient overlay for text contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-wn-navy via-wn-navy/40 to-transparent" />

        {/* Top bar — back link */}
        <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-1.5 text-xs font-semibold text-wn-navy shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            ← Map
          </Link>
          {isFeatured && (
            <span className="inline-flex items-center rounded-md bg-wn-gold/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-wn-navy shadow-sm">
              ★ Featured
            </span>
          )}
        </div>

        {/* Hero text */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-4 pb-6 sm:px-8 sm:pb-10">
          <div className="mx-auto max-w-5xl">
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {(resort.passes ?? []).map((p) => (
                <PassBadge key={p} pass={p} />
              ))}
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
              {resort.name}
            </h1>
            <p className="mt-1 text-sm text-white/85 sm:text-base">
              {resort.state}
              {resort.region ? " · " + resort.region : ""}
              {resort.city ? " · " + resort.city : ""}
            </p>
            {resort.operating_status === "closed" && (
              <p className="mt-2 inline-block rounded bg-red-600/95 px-2 py-0.5 text-xs font-semibold text-white">
                Permanently closed
              </p>
            )}
            {resort.operating_status === "seasonal" && (
              <p className="mt-2 inline-block rounded bg-amber-500/95 px-2 py-0.5 text-xs font-semibold text-white">
                Seasonal / limited operations
              </p>
            )}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
        {/* QUICK STATS — featured only */}
        {isFeatured && <QuickStats resort={resort} />}

        {/* WEATHER */}
        {weather.length > 0 && (
          <Section title="7-Day Forecast" subtitle="Open-Meteo · cached 30 min · always verify on the resort site">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {weather.map((day) => (
                <WeatherCard key={day.date} day={day} todayIso={todayIso} />
              ))}
            </div>
          </Section>
        )}

        {/* DRIVE TIMES — only if cached */}
        {driveTimes.length > 0 && (
          <Section title="Drive time" subtitle="From major Northeast cities">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {ORIGINS.map((o) => {
                const dt = driveTimes.find((d) => d.origin_name === o.name);
                return (
                  <div
                    key={o.code}
                    className="rounded-lg border border-wn-charcoal/10 bg-white px-3 py-2.5"
                  >
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/50">
                      from {o.short}
                    </div>
                    <div className="mt-0.5 text-base font-semibold text-wn-navy">
                      {dt ? formatDriveTime(dt.duration_seconds) : "—"}
                    </div>
                    {dt?.distance_meters && (
                      <div className="text-[11px] text-wn-charcoal/60">
                        {Math.round(dt.distance_meters / 1609.34)} mi
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* QUICK ACTIONS */}
        <Section title="Visit & book">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {resort.website_url && (
              <ActionLink href={resort.website_url} label="Resort website" sub="Live trail status, hours, news" external />
            )}
            <ActionLink
              href={`https://www.google.com/maps/?q=${lat},${lng}`}
              label="Open in Google Maps"
              sub="Navigation"
              external
            />
            {resort.ticket_booking_url && (
              <ActionLink href={resort.ticket_booking_url} label="Lift tickets" sub="Buy on the resort site" external />
            )}
            {resort.trail_map_url && (
              <ActionLink href={resort.trail_map_url} label="Trail map" sub="Official PDF" external />
            )}
            <ActionLink
              href={`https://www.booking.com/searchresults.html?ss=${encodeURIComponent(resort.name)}`}
              label="Find lodging"
              sub="Hotels nearby (Booking.com)"
              external
            />
          </div>
        </Section>

        {/* EXTERNAL FORECAST LINKS — featured only */}
        {isFeatured && (
          <Section title="More forecasts" subtitle="Specialty snow forecasters worth a look">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <ActionLink
                href={`https://opensnow.com/location/${slug}`}
                label="OpenSnow"
                sub="Daily PEAKS snow forecast"
                external
              />
              <ActionLink
                href={`https://forecast.weather.gov/MapClick.php?lat=${lat}&lon=${lng}`}
                label="NWS point forecast"
                sub="Official US weather service"
                external
              />
              <ActionLink
                href={`https://www.snow-forecast.com/resorts/search?term=${encodeURIComponent(resort.name)}`}
                label="Snow-Forecast.com"
                sub="3-elevation forecast"
                external
              />
            </div>
          </Section>
        )}

        {/* ABOUT — featured only */}
        {isFeatured && (
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
        )}

        {/* Listed footer */}
        {!isFeatured && (
          <div className="rounded-lg border border-wn-charcoal/10 bg-white p-4 text-sm text-wn-charcoal/70">
            <p className="font-medium text-wn-charcoal">More details coming soon.</p>
            <p className="mt-1">
              We have basic info for this resort. Detailed stats, hours, and gallery
              are added as Wynla grows. In the meantime, the resort website above is
              the best source for live conditions.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------- Helpers ----------

function PassBadge({ pass }: { pass: string }) {
  const color = passColor(pass);
  return (
    <span
      className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold text-white"
      style={{ backgroundColor: color }}
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
  const stats: Array<{ label: string; value: string; }> = [];
  if (resort.vertical_drop) stats.push({ label: "Vertical drop", value: `${resort.vertical_drop.toLocaleString()} ft` });
  if (resort.total_trails) stats.push({ label: "Trails", value: String(resort.total_trails) });
  if (resort.total_lifts) stats.push({ label: "Lifts", value: String(resort.total_lifts) });
  if (resort.total_acres) stats.push({ label: "Skiable acres", value: resort.total_acres.toLocaleString() });
  if (resort.elevation_summit) stats.push({ label: "Summit elevation", value: `${resort.elevation_summit.toLocaleString()} ft` });
  if (resort.longest_run_miles) stats.push({ label: "Longest run", value: `${resort.longest_run_miles} mi` });

  if (stats.length === 0) return null;

  // Trail breakdown chip row, if all four levels present
  const hasTrailBreakdown = [
    resort.trails_beginner,
    resort.trails_intermediate,
    resort.trails_advanced,
    resort.trails_expert,
  ].some((v) => v != null && v > 0);

  // Features chip row
  const features: string[] = [];
  if (resort.has_terrain_park) features.push(resort.terrain_park_count ? `Terrain park (${resort.terrain_park_count})` : "Terrain park");
  if (resort.has_halfpipe) features.push("Halfpipe");
  if (resort.has_glades) features.push("Glades");
  if (resort.has_night_skiing) features.push("Night skiing");

  return (
    <Section title="Mountain stats">
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

      {hasTrailBreakdown && (
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {resort.trails_beginner != null && (
            <TrailChip color="#22c55e" label={`${resort.trails_beginner} beginner`} />
          )}
          {resort.trails_intermediate != null && (
            <TrailChip color="#3b82f6" label={`${resort.trails_intermediate} intermediate`} />
          )}
          {resort.trails_advanced != null && (
            <TrailChip color="#1f2937" label={`${resort.trails_advanced} advanced`} />
          )}
          {resort.trails_expert != null && resort.trails_expert > 0 && (
            <TrailChip color="#dc2626" label={`${resort.trails_expert} expert`} />
          )}
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

function TrailChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 font-medium text-wn-charcoal shadow-sm">
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}

function WeatherCard({ day, todayIso }: { day: WeatherDay; todayIso: string }) {
  const isToday = day.date === todayIso;
  return (
    <div
      className={`flex min-w-[112px] flex-col rounded-lg border p-3 text-center shadow-sm transition ${
        isToday
          ? "border-wn-navy bg-wn-navy text-white"
          : "border-wn-charcoal/10 bg-white text-wn-charcoal"
      }`}
    >
      <div className={`text-[11px] font-semibold uppercase tracking-wide ${isToday ? "text-white/80" : "text-wn-charcoal/60"}`}>
        {dayLabel(day.date, todayIso)}
      </div>
      <div className="my-1.5 text-2xl">{day.emoji}</div>
      <div className="text-base font-bold">
        {day.tempMaxF != null ? `${day.tempMaxF}°` : "—"}
        <span className={`ml-1 text-xs font-normal ${isToday ? "text-white/70" : "text-wn-charcoal/50"}`}>
          {day.tempMinF != null ? `${day.tempMinF}°` : ""}
        </span>
      </div>
      <div className={`mt-0.5 text-[11px] ${isToday ? "text-white/80" : "text-wn-charcoal/60"}`}>
        {day.snowfallInches > 0
          ? `❄️ ${day.snowfallInches.toFixed(1)}"`
          : day.rainInches > 0
            ? `🌧 ${day.rainInches.toFixed(1)}"`
            : day.conditions}
      </div>
      <div className={`mt-0.5 text-[11px] ${isToday ? "text-white/70" : "text-wn-charcoal/50"}`}>
        wind {day.windSpeedMph} mph
      </div>
    </div>
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
