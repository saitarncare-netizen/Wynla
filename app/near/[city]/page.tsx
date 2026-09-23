// /near/[city] — "Ski resorts near <City>" (audit finding content-seo-27).
//
// The highest-intent query in the category ("ski resorts near Denver")
// answered from data the map already has: every active resort within
// six hours of the city, sorted by drive time, grouped by band, with the
// pass, the opening status the resort page shows, vertical, the lift
// ticket when the backfill has one, and measured 24 h snow while the
// mountain is running. The call to action hands the rider to /go for the
// Saturday answer (launch cities) or to the map with this origin.
//
// Static for the eight launch cities, on demand for the other 21
// origins; both read through app/near/[city]/data.ts (cached 10 min).

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ResortStatusPill } from "@/components/SeasonCountdown";
import {
  DRIVE_BANDS,
  NEAR_MAX_HOURS,
  formatCoords,
  formatDriveRounded,
  formatStampDate,
  formatStampTime,
  groupByBand,
  nearAllCityCodes,
  nearCityName,
  nearCtaFor,
  nearDescription,
  nearPath,
  nearStaticCityCodes,
  nearTitle,
  resolveNearCity,
  type NearRow,
} from "@/lib/near";
import { ESTIMATE_MARK, findOrigin, originLabel, type CityOrigin } from "@/lib/origins";
import { passColor, passShort, passLabel } from "@/lib/passColors";
import { textOn } from "@/lib/contrast";
import { HIT_AREA_44 } from "@/lib/hitArea";
import Icon from "@/components/icons/Icon";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import PageHeader from "@/components/ui/PageHeader";
import { loadNearData, NEAR_DATA_REVALIDATE_SECONDS } from "./data";

// Literal on purpose: Next reads the segment config statically and
// rejects an imported constant. Keep equal to NEAR_DATA_REVALIDATE_SECONDS.
export const revalidate = 600;
export const dynamicParams = true;

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app").replace(/\/+$/, "");

export function generateStaticParams(): Array<{ city: string }> {
  return nearStaticCityCodes().map((city) => ({ city }));
}

export async function generateMetadata({ params }: { params: Promise<{ city: string }> }): Promise<Metadata> {
  const { city: slug } = await params;
  const city = resolveNearCity(slug);
  if (!city) return { title: "City not found", robots: { index: false } };
  const data = await loadNearData(city.code).catch(() => null);
  const count = data?.rows.length ?? 0;
  const title = nearTitle(city);
  const description = nearDescription(city, count);
  const path = nearPath(city.code);
  // Layout's title.template adds " · Wynla". openGraph.images is omitted:
  // Next wires the co-located opengraph-image.tsx in.
  return {
    title: `${title} (${count} within ${NEAR_MAX_HOURS} h)`,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} · Wynla`, description, url: `${SITE_URL}${path}` },
  };
}

export default async function NearCityPage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = resolveNearCity(slug);
  if (!city) notFound();

  const data = await loadNearData(city.code);
  if (data.rows.length === 0) notFound();

  const groups = groupByBand(data.rows);
  const cta = nearCtaFor(city);
  const name = nearCityName(city);
  const path = `${SITE_URL}${nearPath(city.code)}`;
  const anyEstimated = data.rows.some((r) => r.drive.estimated);
  const loadedAt = formatStampTime(data.loadedAt);

  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: nearTitle(city),
    description: nearDescription(city, data.rows.length),
    numberOfItems: data.rows.length,
    itemListOrder: "https://schema.org/ItemListOrderAscending",
    itemListElement: data.rows.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/resort/${r.slug}`,
      name: r.name,
    })),
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Wynla", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: nearTitle(city), item: path },
    ],
  };

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />

      {/* Hero — same navy treatment as the state directory so the SEO
          landing pages read as one family. */}
      <PageHeader
        tone="navy"
        size="lg"
        eyebrow={`${originLabel(city)} · Within ${NEAR_MAX_HOURS} hours`}
        title={`Ski resorts near ${name}`}
        description={`${data.rows.length} resorts · Sorted by drive time`}
      >
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Button variant="gold" href={cta.href} iconRight={<Icon name="arrow-right" />}>
            {cta.label}
          </Button>
          <Link
            href="/go"
            className="inline-flex min-h-11 items-center text-sm font-semibold text-white/85 underline-offset-4 hover:underline"
          >
            Saturday picks
          </Link>
        </div>
      </PageHeader>

      <div
        className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* How the numbers are made. Stated up front so nobody reads an
            estimate as a road route (every drive-time surface carries ≈). */}
        <Card className="text-sm leading-relaxed text-wn-charcoal/80">
          <h2 className="text-sm font-bold uppercase tracking-wide text-wn-muted">How this list is built</h2>
          <p className="mt-2">
            Drive times start from downtown {name} ({formatCoords(city)}).{" "}
            {city.cached && data.driveSource === "cache"
              ? `Times without a mark are road routes cached from Mapbox (Matrix API), computed once and stored; a ${ESTIMATE_MARK} mark means no route is cached for that resort and the time is estimated from straight-line distance at 60 mph with a 1.2 road factor.`
              : `${name} has no cached road routes yet, so every time is marked ${ESTIMATE_MARK} and estimated from straight-line distance at 60 mph with a 1.2 road factor. Expect real drives to be longer in mountain traffic.`}{" "}
            Opening status comes from each resort&apos;s own report when it is fresh, otherwise from its announced or projected season dates. Snow is the NOHRSC 24 h analysis (Measured) and only appears while a resort is running.
            {loadedAt ? ` Data loaded ${loadedAt}, refreshed every ${Math.round(NEAR_DATA_REVALIDATE_SECONDS / 60)} minutes.` : ""}
          </p>
        </Card>

        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`band-${group.key}`}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id={`band-${group.key}`} className="text-lg font-bold text-wn-navy sm:text-wn-xl">
                {group.label}
              </h2>
              <span className="text-xs font-semibold text-wn-muted">
                {group.rows.length} resort{group.rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <ol className="divide-y divide-wn-line overflow-hidden rounded-wn-md border border-wn-line bg-white shadow-wn-sm">
              {group.rows.map((r) => (
                <li key={r.id}>
                  <ResortRow row={r} />
                </li>
              ))}
            </ol>
          </section>
        ))}

        {anyEstimated && (
          <p className="text-xs text-wn-muted">
            {ESTIMATE_MARK} Estimated from straight-line distance; the resort page and the map upgrade a tapped resort to an exact route.
          </p>
        )}

        {/* The Saturday answer. */}
        <Card padding="lg" className="text-center">
          <h2 className="text-lg font-bold text-wn-navy">
            {cta.isGo ? `Which of these should you ride this Saturday?` : `Plan a trip from ${name}`}
          </h2>
          <p className="mt-1 text-sm text-wn-muted">
            {cta.isGo
              ? "Pick your pass and Wynla ranks the three best mountains by forecast snow, the surface you will ski, drive time, wind and crowds."
              : "The map filters every resort by drive time from this city, pass and size, and the planner strings a multi-stop trip together."}
          </p>
          <Button href={cta.href} className="mt-4" iconRight={<Icon name="arrow-right" />}>
            {cta.label}
          </Button>
        </Card>

        {/* Other cities: the crawl path between the 29 pages, and the
            way a rider in a city we did not guess finds theirs. */}
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-wn-muted">Other cities</h2>
          <div className="flex flex-wrap gap-2">
            {nearAllCityCodes()
              .filter((code) => code !== city.code)
              .map((code) => findOrigin(code))
              .filter((c): c is CityOrigin => c !== null)
              .sort((a, b) => nearCityName(a).localeCompare(nearCityName(b)))
              .map((c) => (
                <Chip key={c.code} href={nearPath(c.code)} className={HIT_AREA_44}>
                  {nearCityName(c)}
                </Chip>
              ))}
          </div>
        </section>

        <p className="text-xs text-wn-muted">
          Bands: {DRIVE_BANDS.map((b) => b.label.toLowerCase()).join(", ")}. Resorts past {NEAR_MAX_HOURS} hours are on the{" "}
          <Link href={`/?from=${city.code}`} className="font-semibold text-wn-navy underline-offset-2 hover:underline">
            map
          </Link>
          .
        </p>
      </div>
    </main>
  );
}

function ResortRow({ row }: { row: NearRow }) {
  const drive = `${row.drive.estimated ? `${ESTIMATE_MARK} ` : ""}${formatDriveRounded(row.drive.seconds)}`;
  const ticketDate = formatStampDate(row.ticket?.updatedAt);
  const snowEnd = formatStampTime(row.snow24h?.validEnd);
  return (
    <Link
      href={`/resort/${row.slug}`}
      className="group flex min-h-11 items-start gap-3 px-3 py-3 transition hover:bg-wn-offwhite sm:px-4"
    >
      <div className="w-[4.5rem] shrink-0 pt-0.5 sm:w-24">
        <div className="text-sm font-bold tabular-nums text-wn-navy sm:text-base">{drive}</div>
        <div className="text-eyebrow uppercase text-wn-muted">
          {row.drive.estimated ? "estimated" : "road route"}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-bold leading-tight text-wn-navy group-hover:underline sm:text-base">{row.name}</h3>
          <span className="text-xs text-wn-muted">{row.state}</span>
          {row.passes.map((p) => (
            <span
              key={p}
              title={passLabel(p)}
              className="rounded-wn-sm px-1.5 py-0.5 text-xs font-bold"
              style={{ backgroundColor: passColor(p), color: textOn(passColor(p)) }}
            >
              {passShort(p)}
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-wn-muted">
          <ResortStatusPill
            status={
              row.openProjected && row.status.kind === "opens"
                ? { ...row.status, detail: [row.status.detail, "projected"].filter(Boolean).join(" · ") }
                : row.status
            }
          />
          {row.verticalDropFt != null && <span>{row.verticalDropFt.toLocaleString()} ft vertical</span>}
          {row.ticket && (
            <span>
              Lift ticket from ${row.ticket.minUsd.toLocaleString()}
              {row.ticket.maxUsd != null && row.ticket.maxUsd > row.ticket.minUsd ? `–$${row.ticket.maxUsd.toLocaleString()}` : ""}
              {ticketDate ? ` · Reported ${ticketDate}` : " · Reported"}
            </span>
          )}
          {row.snow24h && (
            <span className="font-semibold text-wn-navy">
              {row.snow24h.inches} in 24 h · Measured{snowEnd ? ` to ${snowEnd}` : ""}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
