// /trip-templates/[slug] — preview a pre-made trip template. Pulls the
// template definition from lib/tripTemplates and the resort details
// (name, lat/lng, passes) from the resorts table. Renders the full
// itinerary + a "Customize and save" CTA that hands off to the planner
// with ?plan=1&template=<slug>&route=…&days=N (see customizeHref below).

import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getTemplate, TEMPLATES } from "@/lib/tripTemplates";
import { haversineMeters, estimateDriveSeconds } from "@/lib/distance";
import { formatDriveTime, ORIGINS } from "@/lib/origins";
import { metersToMiles } from "@/lib/tripCost";
import { textOn } from "@/lib/contrast";
import { passColor, primaryPass } from "@/lib/passColors";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Icon from "@/components/icons/Icon";

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
  // The layout's title template appends " · Wynla".
  if (!tpl) return { title: "Trip template" };
  return {
    title: `${tpl.title} trip template`,
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

  // Build the "Customize and save" deep link. Everything the planner
  // needs is in the URL from the first render so nothing has to be
  // patched in afterwards:
  //   plan=1      opens the planner sheet immediately
  //   template=   title + "Template loaded" banner
  //   route=      one slug per day (Vail,Vail,Aspen) — the planner's
  //               route seed groups repeats into stops with day counts
  //   days=       the template's total, so the trip length matches the
  //               stops instead of defaulting to 1 and being bumped
  //   from=       the origin. Cities in the global list (NYC, Boston)
  //               use their code; the others (Denver, SLC, Reno,
  //               Bozeman) go as geo coordinates plus fromLabel= so the
  //               planner shows "Denver", not "Your location".
  const routeSlugs = tpl.resortSlugs.flatMap((slug, i) =>
    Array.from({ length: Math.max(1, tpl.daysPerResort[i] ?? 1) }, () => slug),
  );
  const originParams = ORIGINS.some((o) => o.code === tpl.origin.code)
    ? `from=${tpl.origin.code}`
    : `from=geo&fromLat=${tpl.origin.lat.toFixed(5)}` +
      `&fromLng=${tpl.origin.lon.toFixed(5)}` +
      `&fromLabel=${encodeURIComponent(tpl.origin.name)}`;
  const customizeHref =
    `/?plan=1&template=${tpl.slug}` +
    `&route=${encodeURIComponent(routeSlugs.join(","))}` +
    `&days=${Math.max(1, totalDays)}` +
    `&${originParams}`;

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <PageHeader
        tone="navy"
        width="max-w-3xl"
        eyebrow={`Template · ${totalDays}-day trip from ${tpl.origin.name}`}
        title={tpl.title}
        description={tpl.description}
      >
        <Chip tone="dark">Best for: {tpl.bestFor}</Chip>
      </PageHeader>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
        {/* Summary tiles. The drive is a straight-line estimate with a
            highway factor, so the row says "Estimated" once. */}
        <section aria-label="Trip summary">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <SummaryTile label="Ski days" value={String(totalDays)} />
            <SummaryTile label="Stops" value={String(tpl.resortSlugs.length)} />
            <SummaryTile label="Total drive" value={formatDriveTime(totalDriveSeconds)} note="Estimated" />
          </div>
        </section>

        <Section title="Itinerary" card>
          <ol className="flex flex-col gap-2">
            {tpl.resortSlugs.map((s, i) => {
              const r = bySlug.get(s);
              const days = tpl.daysPerResort[i] ?? 1;
              const passes = r?.passes ?? [];
              const primary = primaryPass(passes);
              const dot = passColor(primary);
              return (
                <li key={`${s}-${i}`} className="flex items-center gap-3 rounded-wn-sm border border-wn-line bg-wn-offwhite p-3">
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                    // Navy digits on Ikon yellow / Epic orange (white was
                    // 1.7:1 and 2.9:1), white on the darker pass colours.
                    style={{ backgroundColor: dot, color: textOn(dot) }}
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-bold text-wn-navy">
                      {r ? (
                        <Link href={`/resort/${r.slug}`} className="hover:underline">
                          {r.name}
                        </Link>
                      ) : (
                        <span className="text-wn-muted">{s}</span>
                      )}
                    </div>
                    <div className="text-xs text-wn-muted">
                      {days} day{days === 1 ? "" : "s"}
                      {r?.state ? ` · ${r.state}` : ""}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-xs text-wn-muted">
            Estimated <span className="tabular-nums">{totalMiles.toLocaleString()}</span> mi round-trip from{" "}
            {tpl.origin.name}, straight-line distance with a highway factor. Real routes come from Mapbox once you
            save.
          </p>
        </Section>

        <section aria-label="Customize">
          <Button href={customizeHref} block iconLeft={<Icon name="sparkle" />} iconRight={<Icon name="arrow-right" />}>
            Customize and save this template
          </Button>
          <p className="mt-2 text-center text-xs text-wn-muted">
            Opens the trip planner so you can tweak stops, swap resorts, or change your origin.
          </p>
        </section>
      </div>
    </main>
  );
}

function SummaryTile({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card padding="none" className="px-3 py-3 text-center">
      <div className="text-lg font-extrabold tabular-nums tracking-tight text-wn-navy sm:text-wn-xl">{value}</div>
      <div className="mt-0.5 text-eyebrow font-semibold uppercase text-wn-muted">
        {label}
        {note ? ` · ${note}` : ""}
      </div>
    </Card>
  );
}
