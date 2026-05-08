"use client";

import Link from "next/link";
import { passColor, passLabel, primaryPass } from "@/lib/passColors";
import { formatDriveTime } from "@/lib/origins";
import { weatherGovUrl, windyUrl, googleMapsUrl } from "@/lib/externalLinks";
import FavoriteToggle from "@/components/auth/FavoriteToggle";
import type { Resort } from "./MapPage";

type DriveTime = {
  resort_id: number;
  origin_name: string;
  duration_seconds: number;
  distance_meters: number | null;
};

type Props = {
  resort: Resort;
  driveTime: DriveTime | undefined;
  originShort: string;
  onClose: () => void;
};

export default function ResortPanel({
  resort,
  driveTime,
  originShort,
  onClose,
}: Props) {
  const lng = Number(resort.longitude);
  const lat = Number(resort.latitude);

  // Typographic hero — pass-color gradient instead of imagery. All resorts
  // get equal visual treatment regardless of tier. Primary pass drives the
  // gradient hue (matches the pin color on the map for visual continuity).
  const primary = primaryPass(resort.passes);
  const heroBg = passColor(primary);

  const driveText = driveTime ? formatDriveTime(driveTime.duration_seconds) : null;
  const distanceMiles = driveTime?.distance_meters
    ? Math.round(driveTime.distance_meters / 1609.34)
    : null;

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

          {/* Drive time card */}
          {driveText && (
            <div className="mb-4 rounded-lg border border-wn-charcoal/10 bg-wn-offwhite px-3 py-2.5">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
                Drive from {originShort}
              </div>
              <div className="mt-0.5 flex items-baseline gap-2">
                <span className="text-lg font-bold text-wn-navy">🚗 {driveText}</span>
                {distanceMiles && (
                  <span className="text-xs text-wn-charcoal/60">
                    {distanceMiles} mi
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Quick stats — show whenever any field exists, regardless of tier */}
          {(resort.vertical_drop || resort.total_trails || resort.total_acres) && (
            <div className="mb-4 grid grid-cols-3 gap-2">
              {resort.vertical_drop != null && (
                <Stat label="Vert" value={`${resort.vertical_drop.toLocaleString()} ft`} />
              )}
              {resort.total_trails != null && (
                <Stat label="Trails" value={String(resort.total_trails)} />
              )}
              {resort.total_acres != null && (
                <Stat label="Acres" value={resort.total_acres.toLocaleString()} />
              )}
            </div>
          )}

          {/* Weather — single card with Weather.gov + Windy sub-rows */}
          <Section title="Weather">
            <div className="rounded-lg border border-wn-charcoal/10 bg-white overflow-hidden">
              <a
                href={weatherGovUrl(lat, lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2.5 px-3 py-2.5 transition hover:bg-wn-offwhite"
              >
                <span aria-hidden="true" className="text-base">🌡️</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-wn-navy">Weather.gov forecast</div>
                  <div className="text-[11px] text-wn-charcoal/60">Official US 7-day forecast</div>
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
                  <div className="text-[11px] text-wn-charcoal/60">Animated wind layer</div>
                </div>
                <span className="text-wn-navy/40 transition group-hover:translate-x-0.5 group-hover:text-wn-navy">↗</span>
              </a>
            </div>
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

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-wn-charcoal/10 bg-white px-2.5 py-2 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/50">
        {label}
      </div>
      <div className="mt-0.5 text-sm font-bold text-wn-navy">{value}</div>
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
