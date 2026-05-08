import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  passColor,
  passLabel,
  primaryPass,
} from "@/lib/passColors";
import { ORIGINS, formatDriveTime } from "@/lib/origins";
import {
  weatherGovUrl,
  windyUrl,
  googleMapsUrl,
  bookingComUrl,
} from "@/lib/externalLinks";
import FavoriteToggle from "@/components/auth/FavoriteToggle";

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
  hero_image_url: string | null;
  hero_image_source: string | null;
  hero_image_alt: string | null;
  last_verified_at: string | null;
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
  const { resort, driveTimes } = data;

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
    resort.elevation_summit != null ||
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

      {/* HERO — typographic, no photo. Pass-color gradient + huge name. */}
      <header
        className="relative w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${heroBg} 0%, #1E2952 60%, #0F1530 100%)`,
        }}
      >
        {/* Subtle topographic texture overlay using a CSS pattern */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)",
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
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
            {resort.name}
          </h1>
          <p className="mt-2 text-base text-white/85 sm:text-lg">
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

        {/* WEATHER — combined external links. Wynla is a planner, not a
            conditions app: we link to specialized sources rather than maintain
            mediocre inline data. */}
        <Section
          title="Weather"
          subtitle="Live conditions from trusted external sources:"
        >
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ActionLink
              href={weatherGovUrl(lat, lng)}
              label="🌡️ Weather.gov"
              sub="Official US 7-day forecast"
              external
            />
            <ActionLink
              href={windyUrl(lat, lng)}
              label="🌬️ Windy.com"
              sub="Animated wind layer"
              external
            />
          </div>
        </Section>

        {/* BEST TIME TO VISIT — typical-season month strip */}
        {resort.typical_season_start && resort.typical_season_end && (
          <Section
            title="Best time to visit"
            subtitle="Typical season — verify on resort site for current conditions"
          >
            <BestTimeStrip
              start={resort.typical_season_start}
              end={resort.typical_season_end}
            />
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
              href={googleMapsUrl(resort.name, resort.state)}
              label="Open in Google Maps"
              sub="Navigation, photos, reviews"
              external
            />
            {resort.ticket_booking_url && (
              <ActionLink href={resort.ticket_booking_url} label="Lift tickets" sub="Buy on the resort site" external />
            )}
            {resort.trail_map_url && (
              <ActionLink href={resort.trail_map_url} label="Trail map" sub="Official PDF" external />
            )}
            <ActionLink
              href={bookingComUrl(resort.name)}
              label="Find lodging"
              sub="Hotels nearby (Booking.com)"
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
