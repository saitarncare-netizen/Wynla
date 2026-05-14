// /trip-templates/[slug] — preview a pre-made trip template. Pulls the
// template definition from lib/tripTemplates and the resort details
// (name, lat/lng, passes) from the resorts table. Renders the full
// itinerary + a "Customize and save" CTA that hands off to the planner
// with ?plan=1&template=<slug>.

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTemplate, TEMPLATES } from "@/lib/tripTemplates";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";
import { formatDriveTime } from "@/lib/origins";
import { metersToMiles } from "@/lib/tripCost";
import { passColor, primaryPass } from "@/lib/passColors";

type ResortRow = {
  slug: string;
  name: string;
  state: string;
  latitude: number | string;
  longitude: number | string;
  passes: string[];
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const tpl = getTemplate(slug);
  if (!tpl) return { title: "Trip template — Wynla" };
  return {
    title: `${tpl.title} — Wynla trip template`,
    description: tpl.description,
  };
}

// Pre-render at build time for the eight templates we ship.
export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ slug: t.slug }));
}

export default async function TripTemplatePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tpl = getTemplate(slug);
  if (!tpl) notFound();

  const supabase = await createSupabaseServerClient();
  const uniqueSlugs = Array.from(new Set(tpl.resortSlugs));
  const { data: resortData } = await supabase
    .from("resorts")
    .select("slug, name, state, latitude, longitude, passes")
    .in("slug", uniqueSlugs)
    .returns<ResortRow[]>();
  const bySlug = new Map((resortData ?? []).map((r) => [r.slug, r]));

  // Compute Haversine miles for the round-trip route. Same math as
  // the planner panel, so the preview matches the planner's display.
  let cursorLat = tpl.origin.lat;
  let cursorLng = tpl.origin.lon;
  let totalMeters = 0;
  let totalDriveSeconds = 0;
  for (const s of tpl.resortSlugs) {
    const r = bySlug.get(s);
    if (!r) continue;
    const lat = Number(r.latitude);
    const lng = Number(r.longitude);
    const meters = haversineMeters(cursorLat, cursorLng, lat, lng);
    totalMeters += meters;
    totalDriveSeconds += estimateDriveSeconds(meters);
    cursorLat = lat;
    cursorLng = lng;
  }
  // Drive home leg.
  const last = bySlug.get(tpl.resortSlugs[tpl.resortSlugs.length - 1]);
  if (last) {
    const homeMeters = haversineMeters(
      Number(last.latitude),
      Number(last.longitude),
      tpl.origin.lat,
      tpl.origin.lon,
    );
    totalMeters += homeMeters;
    totalDriveSeconds += estimateDriveSeconds(homeMeters);
  }
  const totalMiles = Math.round(metersToMiles(totalMeters * 1.2)); // 1.2 highway factor
  const totalDays = tpl.daysPerResort.reduce((a, b) => a + b, 0);

  // Build the "Customize and save" deep link. The planner reads
  // ?template=<slug> on mount and hydrates from getTemplate(slug).
  // ?plan=1 opens the planner sheet immediately. We also set
  // ?from=geo&fromLat=…&fromLng=… so the map's origin resolver picks
  // up the template's origin city (most template origins aren't in
  // the global city list yet — Denver / SLC / Reno / Bozeman). MapPage
  // resolves this as a "geo" origin with the template's label.
  const customizeHref =
    `/?plan=1&template=${tpl.slug}` +
    `&from=geo&fromLat=${tpl.origin.lat.toFixed(5)}` +
    `&fromLng=${tpl.origin.lon.toFixed(5)}`;

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <header className="bg-wn-navy text-white">
        <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <Link
            href="/trip-templates"
            className="mb-3 inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/20"
          >
            ← All templates
          </Link>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Template · {totalDays}-day trip from {tpl.origin.name}
          </p>
          <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
            {tpl.title}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75">
            {tpl.description}
          </p>
          <p className="mt-2 inline-flex rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold backdrop-blur-sm">
            Best for: {tpl.bestFor}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Summary tiles */}
        <section className="mb-6 grid grid-cols-3 gap-2 sm:gap-3">
          <SummaryTile label="Ski days" value={String(totalDays)} />
          <SummaryTile label="Stops" value={String(tpl.resortSlugs.length)} />
          <SummaryTile
            label="Total drive"
            value={formatDriveTime(totalDriveSeconds)}
          />
        </section>

        <section className="mb-6 rounded-xl border border-wn-charcoal/10 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-[11px] font-bold uppercase tracking-[0.15em] text-wn-charcoal/55">
            Itinerary
          </h2>
          <ol className="flex flex-col gap-2">
            {tpl.resortSlugs.map((s, i) => {
              const r = bySlug.get(s);
              const days = tpl.daysPerResort[i] ?? 1;
              const passes = r?.passes ?? [];
              const primary = primaryPass(passes);
              const dot = passColor(primary);
              return (
                <li
                  key={`${s}-${i}`}
                  className="flex items-center gap-3 rounded-lg border border-wn-charcoal/10 bg-wn-offwhite p-3"
                >
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: dot }}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-wn-navy">
                      {r ? (
                        <Link
                          href={`/resort/${r.slug}`}
                          className="hover:underline"
                        >
                          {r.name}
                        </Link>
                      ) : (
                        <span className="text-wn-charcoal/55">{s}</span>
                      )}
                    </div>
                    <div className="text-[11px] text-wn-charcoal/60">
                      {days} day{days === 1 ? "" : "s"}
                      {r?.state ? ` · ${r.state}` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-[11px] text-wn-charcoal/55">
            ≈ {totalMiles.toLocaleString()} mi round-trip from {tpl.origin.name}.
            Drive times are estimates — actual routes via Mapbox once you save.
          </p>
        </section>

        <section>
          <Link
            href={customizeHref}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-wn-navy px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-wn-navy/90 active:scale-[0.99]"
          >
            ✨ Customize and save this template
            <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-2 text-center text-[11px] text-wn-charcoal/55">
            Opens the trip planner so you can tweak stops, swap resorts, or
            change your origin.
          </p>
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
