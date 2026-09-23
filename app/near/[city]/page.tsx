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
      <header
        className="relative w-full overflow-hidden"
        style={{ background: "linear-gradient(135deg, #1E2952 0%, #141A3A 60%, #0B1028 100%)" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)",
          }}
        />
        <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
          <Link
            href={`/?from=${city.code}`}
            className="inline-flex min-h-11 items-center gap-1 rounded-md bg-white/95 px-3 text-xs font-semibold text-wn-navy shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            ← Map
          </Link>
          <Link
            href="/go"
            className="inline-flex min-h-11 items-center text-xs font-semibold text-white/85 underline-offset-4 hover:underline"
          >
            Saturday picks
          </Link>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 pb-10 pt-4 sm:px-6 sm:pb-14 sm:pt-8">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            {originLabel(city)} · Within {NEAR_MAX_HOURS} hours
          </p>
          <h1 className="text-4xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl">
            Ski resorts near {name}
          </h1>
          <p className="mt-3 text-base text-white/85 sm:text-lg">
            {data.rows.length} resorts · Sorted by drive time
          </p>
          <Link
            href={cta.href}
            className="mt-5 inline-flex min-h-11 items-center gap-1 rounded-md bg-wn-gold px-4 text-sm font-semibold text-wn-navy transition hover:bg-wn-gold/90"
          >
            {cta.label} →
          </Link>
        </div>
      </header>

      <div
        className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12"
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))" }}
      >
        {/* How the numbers are made. Stated up front so nobody reads an
            estimate as a road route (every drive-time surface carries ≈). */}
        <section className="rounded-2xl border border-wn-charcoal/10 bg-white p-4 text-sm leading-relaxed text-wn-charcoal/80 sm:p-5">
          <h2 className="text-sm font-bold uppercase tracking-wide text-wn-charcoal/60">How this list is built</h2>
          <p className="mt-2">
            Drive times start from downtown {name} ({formatCoords(city)}).{" "}
            {city.cached && data.driveSource === "cache"
              ? `Times without a mark are road routes cached from Mapbox Directions; a ${ESTIMATE_MARK} mark means no route is cached for that resort and the time is estimated from straight-line distance at 60 mph with a 1.2 road factor.`
              : `${name} has no cached road routes yet, so every time is marked ${ESTIMATE_MARK} and estimated from straight-line distance at 60 mph with a 1.2 road factor. Expect real drives to be longer in mountain traffic.`}{" "}
            Opening status comes from each resort&apos;s own report when it is fresh, otherwise from its announced or projected season dates. Snow is the NOHRSC 24 h analysis (Measured) and only appears while a resort is running.
            {loadedAt ? ` Data loaded ${loadedAt}, refreshed every ${Math.round(NEAR_DATA_REVALIDATE_SECONDS / 60)} minutes.` : ""}
          </p>
        </section>

        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`band-${group.key}`}>
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 id={`band-${group.key}`} className="text-lg font-bold text-wn-navy sm:text-xl">
                {group.label}
              </h2>
              <span className="text-xs font-semibold text-wn-charcoal/55">
                {group.rows.length} resort{group.rows.length === 1 ? "" : "s"}
              </span>
            </div>
            <ol className="divide-y divide-wn-charcoal/10 overflow-hidden rounded-2xl border border-wn-charcoal/10 bg-white shadow-sm">
              {group.rows.map((r) => (
                <li key={r.id}>
                  <ResortRow row={r} />
                </li>
              ))}
            </ol>
          </section>
        ))}

        {anyEstimated && (
          <p className="text-xs text-wn-charcoal/60">
            {ESTIMATE_MARK} Estimated from straight-line distance; the resort page and the map upgrade a tapped resort to an exact route.
          </p>
        )}

        {/* The Saturday answer. */}
        <section className="rounded-2xl border border-wn-charcoal/10 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-bold text-wn-navy">
            {cta.isGo ? `Which of these should you ride this Saturday?` : `Plan a trip from ${name}`}
          </h2>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            {cta.isGo
              ? "Pick your pass and Wynla ranks the three best mountains by forecast snow, the surface you will ski, drive time, wind and crowds."
              : "The map filters every resort by drive time from this city, pass and size, and the planner strings a multi-stop trip together."}
          </p>
          <Link
            href={cta.href}
            className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-md bg-wn-navy px-4 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            {cta.label} →
          </Link>
        </section>

        {/* Other cities: the crawl path between the 29 pages, and the
            way a rider in a city we did not guess finds theirs. */}
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-wn-charcoal/60">Other cities</h2>
          <div className="flex flex-wrap gap-1.5">
            {nearAllCityCodes()
              .filter((code) => code !== city.code)
              .map((code) => findOrigin(code))
              .filter((c): c is CityOrigin => c !== null)
              .sort((a, b) => nearCityName(a).localeCompare(nearCityName(b)))
              .map((c) => (
                <Link
                  key={c.code}
                  href={nearPath(c.code)}
                  className="inline-flex min-h-11 items-center rounded-full border border-wn-charcoal/15 bg-white px-3 text-xs font-medium text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy"
                >
                  {nearCityName(c)}
                </Link>
              ))}
          </div>
        </section>

        <p className="text-xs text-wn-charcoal/55">
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
        <div className="text-[10px] uppercase tracking-wide text-wn-charcoal/50">
          {row.drive.estimated ? "estimated" : "road route"}
        </div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <h3 className="text-sm font-bold leading-tight text-wn-navy group-hover:underline sm:text-base">{row.name}</h3>
          <span className="text-[11px] text-wn-charcoal/60">{row.state}</span>
          {row.passes.map((p) => (
            <span
              key={p}
              title={passLabel(p)}
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: passColor(p), color: p === "ikon" ? "#1E2952" : "#FFFFFF" }}
            >
              {passShort(p)}
            </span>
          ))}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-wn-charcoal/70">
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
