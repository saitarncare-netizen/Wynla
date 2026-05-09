"use client";

import { useEffect, useState } from "react";
// useEffect/useState used by the matrix-driven drive-time refinement;
// other hooks not needed here.
import Link from "next/link";
import { passColor, passLabel, primaryPass } from "@/lib/passColors";
import { formatDriveTime, type Origin } from "@/lib/origins";
import { weatherGovUrl, windyUrl, googleMapsUrl } from "@/lib/externalLinks";
import { fetchMatrixDriveTime, type MatrixResult } from "@/lib/mapboxMatrix";
import FavoriteToggle from "@/components/auth/FavoriteToggle";
import type { Resort, DriveTime, WeatherSnapshot } from "./MapPage";

type Props = {
  resort: Resort;
  driveTime: DriveTime | undefined;
  origin: Origin;
  weather: WeatherSnapshot | null;
  onClose: () => void;
};

export default function ResortPanel({
  resort,
  driveTime,
  origin,
  weather,
  onClose,
}: Props) {
  const lng = Number(resort.longitude);
  const lat = Number(resort.latitude);

  // Typographic hero — pass-color gradient instead of imagery. All resorts
  // get equal visual treatment regardless of tier. Primary pass drives the
  // gradient hue (matches the pin color on the map for visual continuity).
  const primary = primaryPass(resort.passes);
  const heroBg = passColor(primary);

  // Phase B: when the origin is the user's geolocation the initial drive
  // time is a Haversine ESTIMATE. We upgrade it to a Mapbox Matrix exact
  // value once the panel opens. The state is keyed on resort.id + origin
  // signature so stale results from a previous pin are ignored without
  // having to call setState synchronously inside the effect.
  type MatrixState = {
    key: string;
    result: MatrixResult;
  };
  const matrixKey = `${resort.id}|${origin.kind}|${origin.lat.toFixed(5)}|${origin.lon.toFixed(5)}`;
  const [matrixState, setMatrixState] = useState<MatrixState | null>(null);
  const matrixResult = matrixState?.key === matrixKey ? matrixState.result : null;
  useEffect(() => {
    if (origin.kind !== "geo") return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token) return;
    const ctrl = new AbortController();
    fetchMatrixDriveTime({ lat: origin.lat, lng: origin.lon }, { lat, lng }, token, ctrl.signal)
      .then((res) => {
        if (ctrl.signal.aborted || !res) return;
        setMatrixState({ key: matrixKey, result: res });
      });
    return () => ctrl.abort();
  }, [matrixKey, lat, lng, origin]);

  // Pick the best drive-time data we have for display.
  const isEstimate = matrixResult ? false : driveTime?.is_estimate ?? false;
  const displayDurationSeconds = matrixResult?.durationSeconds ?? driveTime?.duration_seconds ?? null;
  const displayDistanceMeters =
    matrixResult?.distanceMeters ?? driveTime?.distance_meters ?? null;
  const driveText =
    displayDurationSeconds != null ? formatDriveTime(displayDurationSeconds) : null;
  const distanceMiles =
    displayDistanceMeters != null
      ? Math.round(displayDistanceMeters / 1609.34)
      : null;
  const originShort = origin.kind === "geo" ? "your location" : origin.short;

  return (
    <>
      {/* Mobile-only scrim — taps outside the sheet close it. Hidden on
          desktop where the panel is alongside the map. */}
      <button
        type="button"
        aria-label="Close resort panel"
        onClick={onClose}
        className="fixed inset-0 z-30 bg-wn-charcoal/30 backdrop-blur-[1px] md:hidden"
      />

      <aside
        role="complementary"
        aria-label={`${resort.name} details`}
        className={[
          "fixed z-40 flex flex-col bg-white shadow-2xl",
          // mobile bottom sheet — slides up from bottom on open
          "inset-x-0 bottom-0 max-h-[78vh] rounded-t-2xl",
          "animate-[slideUp_220ms_cubic-bezier(0.16,1,0.3,1)]",
          // desktop right side panel — slides in from right
          "md:inset-x-auto md:right-0 md:top-0 md:bottom-0 md:w-[380px] md:max-h-none md:rounded-none",
          "md:animate-[slideLeft_220ms_cubic-bezier(0.16,1,0.3,1)]",
        ].join(" ")}
      >
        {/* Mobile drag handle (visual only — Stage 4.4 will wire drag) */}
        <div className="flex shrink-0 justify-center pt-2 md:hidden" aria-hidden="true">
          <div className="h-1 w-10 rounded-full bg-wn-charcoal/20" />
        </div>

        {/* Typographic hero — pass-color gradient + resort name. No image. */}
        <div
          className="relative shrink-0 overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${heroBg} 0%, #1E2952 100%)`,
          }}
        >
          {/* Faint SVG-grain layer adding subtle depth to the flat gradient. */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.85'/></svg>\")",
              backgroundSize: "160px 160px",
            }}
          />
          <div className="relative h-32 px-4 pt-4 pb-3 md:h-36">
            {/* Top-right: Favorite + Close */}
            <div className="absolute right-3 top-3 flex items-center gap-2 z-10">
              <FavoriteToggle resortId={resort.id} />
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 text-wn-navy shadow-md backdrop-blur-sm transition hover:bg-white"
              >
                <span aria-hidden="true" className="text-lg leading-none">×</span>
              </button>
            </div>

            {/* Title block bottom-left */}
            <div className="absolute inset-x-4 bottom-3">
              <h2 className="text-2xl font-extrabold leading-tight text-white drop-shadow-sm sm:text-3xl">
                {resort.name}
              </h2>
              <p className="mt-0.5 text-xs text-white/85">
                {resort.state}
                {resort.region ? " · " + resort.region : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Pass badges */}
          {resort.passes?.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-1.5">
              {resort.passes.map((p) => (
                <span
                  key={p}
                  className="inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold text-white"
                  style={{ backgroundColor: passColor(p) }}
                >
                  {passLabel(p)}
                </span>
              ))}
            </div>
          )}

          {/* Drive time card. For geo origins we show "≈ 4h 20m" until the
              Mapbox Matrix call resolves, then swap in the exact value. */}
          {driveText && (
            <div className="mb-4 rounded-lg border border-wn-charcoal/10 bg-wn-offwhite px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
                Drive from {originShort}
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-lg font-bold text-wn-navy">
                  🚗 {isEstimate ? "≈ " : ""}
                  {driveText}
                </span>
                {distanceMiles && (
                  <span className="text-xs text-wn-charcoal/60">
                    {distanceMiles} mi
                  </span>
                )}
              </div>
              {isEstimate && (
                <div className="mt-1 text-[10px] text-wn-charcoal/45">
                  Estimate based on straight-line distance.
                </div>
              )}
            </div>
          )}

          {/* Quick stats — always shown for visual consistency across
              all 451 resorts. Missing values show "—" so the layout
              never shifts and the user knows which dimensions matter
              even for resorts whose specs aren't published. */}
          <div className="mb-4 grid grid-cols-3 gap-2">
            <Stat
              label="Vert"
              value={
                resort.vertical_drop != null
                  ? `${resort.vertical_drop.toLocaleString()} ft`
                  : "—"
              }
              muted={resort.vertical_drop == null}
            />
            <Stat
              label="Trails"
              value={resort.total_trails != null ? String(resort.total_trails) : "—"}
              muted={resort.total_trails == null}
            />
            <Stat
              label="Acres"
              value={
                resort.total_acres != null ? resort.total_acres.toLocaleString() : "—"
              }
              muted={resort.total_acres == null}
            />
          </div>

          {/* Weather — in-app card built from weather_cache (refreshed
              daily by the cron). Falls back to a "no data yet" state
              with the original Weather.gov / Windy links until the
              first refresh lands. */}
          <Section title="Today's weather">
            <WeatherCard weather={weather} lat={lat} lng={lng} />
          </Section>

          {/* Visit & book — Google Maps + resort website */}
          <Section title="Visit & book">
            <div className="grid grid-cols-1 gap-1.5">
              <PanelLink
                href={googleMapsUrl(resort.name, resort.state)}
                emoji="📍"
                label="Open in Google Maps"
                sub="Photos, reviews, navigation"
              />
              {resort.website_url && (
                <PanelLink
                  href={resort.website_url}
                  emoji="🌐"
                  label="Resort website"
                  sub="Live trail status"
                />
              )}
            </div>
          </Section>
        </div>

        {/* Sticky footer CTA */}
        <div className="shrink-0 border-t border-wn-charcoal/10 bg-white p-3">
          <Link
            href={`/resort/${resort.slug}`}
            className="flex items-center justify-center gap-2 rounded-lg bg-wn-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            View full details
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </aside>
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4 last:mb-0">
      <h3 className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-wn-charcoal/55">
        {title}
      </h3>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="rounded-lg border border-wn-charcoal/10 bg-white px-2.5 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/50">
        {label}
      </div>
      <div
        className={`mt-0.5 text-sm font-bold ${muted ? "text-wn-charcoal/30" : "text-wn-navy"}`}
      >
        {value}
      </div>
    </div>
  );
}

// In-app weather card. Renders a hero strip (high/low + conditions),
// a snow chip when there's measurable precipitation, and a wind block.
// Falls back to two link rows (Weather.gov + Windy) when the cache row
// hasn't been populated yet — first refresh lands once Vercel Cron runs.
function WeatherCard({
  weather,
  lat,
  lng,
}: {
  weather: WeatherSnapshot | null;
  lat: number;
  lng: number;
}) {
  // Show absolute fetch date (no relative "X hours ago") — Date.now()
  // during render trips the React purity lint, and the relative form
  // doesn't add much value once we already have an exact timestamp.
  const fetchedLabel = weather?.fetched_at
    ? new Date(weather.fetched_at).toLocaleString(undefined, {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      })
    : null;

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

  if (!weather || (weather.temp_high_f == null && weather.temp_low_f == null)) {
    // No cache row yet — show the two external-link rows as a safe fallback.
    return (
      <div className="rounded-lg border border-wn-charcoal/10 bg-white">
        <a
          href={weatherGovUrl(lat, lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-wn-offwhite"
        >
          <span aria-hidden="true" className="text-base">🌡️</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-wn-navy">Weather.gov</div>
            <div className="text-[11px] text-wn-charcoal/55">In-app forecast loads once today&apos;s refresh runs</div>
          </div>
          <span className="text-wn-navy/40 transition group-hover:translate-x-0.5 group-hover:text-wn-navy">↗</span>
        </a>
        <div className="border-t border-wn-charcoal/10" />
        <a
          href={windyUrl(lat, lng)}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-wn-offwhite"
        >
          <span aria-hidden="true" className="text-base">🌬️</span>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-wn-navy">Windy.com</div>
            <div className="text-[11px] text-wn-charcoal/55">Animated wind layer</div>
          </div>
          <span className="text-wn-navy/40 transition group-hover:translate-x-0.5 group-hover:text-wn-navy">↗</span>
        </a>
      </div>
    );
  }

  const snow24 = Number(weather.snow_24h_in ?? 0);
  const snow48 = Number(weather.snow_48h_in ?? 0);
  return (
    <div className="overflow-hidden rounded-lg border border-wn-charcoal/10 bg-white">
      {/* Hero — temps + conditions */}
      <div className="flex items-center gap-3 bg-gradient-to-br from-sky-50 to-white px-3 py-3">
        <div className="text-3xl leading-none" aria-hidden="true">
          {conditionEmoji(weather.conditions_short)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1">
            {weather.temp_high_f != null && (
              <span className="text-xl font-extrabold text-wn-navy">
                {Math.round(weather.temp_high_f)}°
              </span>
            )}
            {weather.temp_low_f != null && weather.temp_high_f != null && (
              <span className="text-sm text-wn-charcoal/55">
                / {Math.round(weather.temp_low_f)}°
              </span>
            )}
            <span className="ml-0.5 text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/50">
              F
            </span>
          </div>
          {weather.conditions_short && (
            <div className="truncate text-xs font-medium text-wn-charcoal">
              {weather.conditions_short}
            </div>
          )}
        </div>
      </div>

      {/* Snow + wind grid */}
      <div className="grid grid-cols-2 divide-x divide-wn-charcoal/10 border-t border-wn-charcoal/10">
        <div className="px-3 py-2.5">
          <div className="flex items-baseline gap-1.5">
            <span aria-hidden="true">🌨️</span>
            <span className="text-base font-bold text-wn-navy">
              {snow24 > 0 ? `${snow24.toFixed(snow24 < 1 ? 1 : 0)}"` : "—"}
            </span>
          </div>
          <div className="text-[10px] uppercase tracking-wide text-wn-charcoal/55">
            snow / 24h
          </div>
          {snow48 > 0 && snow48 !== snow24 && (
            <div className="mt-0.5 text-[10px] text-wn-charcoal/55">
              {snow48.toFixed(snow48 < 1 ? 1 : 0)}&quot; / 48h
            </div>
          )}
        </div>
        <div className="px-3 py-2.5">
          <div className="flex items-baseline gap-1.5">
            <span aria-hidden="true">🌬️</span>
            <span className="text-base font-bold text-wn-navy">
              {weather.wind_mph_avg != null ? `${weather.wind_mph_avg}` : "—"}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
              mph
            </span>
            {weather.wind_dir_short && (
              <span className="text-[10px] text-wn-charcoal/55">
                · {weather.wind_dir_short}
              </span>
            )}
          </div>
          <div className="text-[10px] uppercase tracking-wide text-wn-charcoal/55">
            wind
          </div>
        </div>
      </div>

      {/* 7-day forecast strip — scrollable on overflow. Skips today
          since it's already the hero above. */}
      {weather.forecast_json && weather.forecast_json.length > 1 && (
        <div className="border-t border-wn-charcoal/10 bg-white px-3 py-2.5">
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-wn-charcoal/55">
            Next 6 days
          </div>
          <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
            {weather.forecast_json.slice(1, 7).map((d) => (
              <div
                key={d.date}
                className="flex w-16 shrink-0 flex-col items-center rounded-md border border-wn-charcoal/10 bg-wn-offwhite px-1.5 py-1.5 text-center"
                title={d.conditions_short ?? undefined}
              >
                <div className="text-[10px] font-bold uppercase tracking-wide text-wn-charcoal/65">
                  {d.weekday}
                </div>
                <div className="my-0.5 text-base leading-none" aria-hidden="true">
                  {conditionEmoji(d.conditions_short)}
                </div>
                <div className="text-[11px] font-bold text-wn-navy leading-tight">
                  {d.temp_high_f != null ? `${Math.round(d.temp_high_f)}°` : "—"}
                </div>
                {d.temp_low_f != null && (
                  <div className="text-[9px] text-wn-charcoal/55 leading-tight">
                    {Math.round(d.temp_low_f)}°
                  </div>
                )}
                {d.snow_in != null && d.snow_in > 0 && (
                  <div className="mt-0.5 text-[9px] font-semibold text-sky-700">
                    🌨️{Number(d.snow_in).toFixed(d.snow_in < 1 ? 1 : 0)}&quot;
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {fetchedLabel && (
        <div className="border-t border-wn-charcoal/10 bg-wn-offwhite px-3 py-1.5 text-[10px] text-wn-charcoal/55">
          Updated {fetchedLabel} · weather.gov + Open-Meteo
        </div>
      )}
    </div>
  );
}

function PanelLink({
  href,
  emoji,
  label,
  sub,
}: {
  href: string;
  emoji: string;
  label: string;
  sub?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2.5 rounded-lg border border-wn-charcoal/10 bg-white px-3 py-2 transition hover:border-wn-navy hover:shadow-sm"
    >
      <span aria-hidden="true" className="text-base">{emoji}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-wn-navy">{label}</div>
        {sub && (
          <div className="truncate text-[11px] text-wn-charcoal/60">{sub}</div>
        )}
      </div>
      <span className="text-wn-navy/40 transition group-hover:translate-x-0.5 group-hover:text-wn-navy">
        ↗
      </span>
    </a>
  );
}
