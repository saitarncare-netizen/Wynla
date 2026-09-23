// /data-sources — attribution and licensing credits for every dataset and
// service Wynla builds on. Several of these licenses (Open-Meteo CC BY 4.0,
// OpenStreetMap ODbL, Wikimedia Commons photo licenses) REQUIRE a visible
// credit somewhere reachable from the product, and the pass operators'
// trademark guidelines expect a non-affiliation statement. Linked from the
// global footer (components/Footer.tsx).

import type { Metadata } from "next";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";

export const revalidate = 86400; // 24h — credits change with the stack, not daily

export const metadata: Metadata = {
  title: "Data sources and credits",
  description:
    "Where Wynla's snow, weather, map, resort and photo data comes from, with licenses and trademark notices.",
  alternates: { canonical: "/data-sources" },
  openGraph: {
    title: "Data sources and credits · Wynla",
    description:
      "Where Wynla's snow, weather, map, resort and photo data comes from, with licenses and trademark notices.",
    url: "/data-sources",
    images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "Wynla — US ski resort map" }],
  },
};

type Source = {
  name: string;
  url: string;
  usedFor: string;
  license: string;
  /** An internal page with the per-item credits, when one exists. */
  details?: { href: string; label: string };
};

// Order matters: government / public-domain sources first, then open
// licenses that require attribution, then commercial services.
//
// Only sources the code actually reads belong here (grep app/, lib/,
// components/ and scripts/ for the hostname before adding one). Planned
// integrations such as SNOTEL or NOHRSC get their entry when they ship.
const SOURCES: Source[] = [
  {
    name: "NOAA National Weather Service (NWS)",
    url: "https://www.weather.gov/",
    usedFor: "Point forecasts and gridpoint weather for every resort in the US",
    license: "US government work, public domain (17 U.S.C. § 105)",
  },
  {
    name: "AWS Terrain Tiles (USGS 3DEP and SRTM elevation)",
    url: "https://registry.opendata.aws/terrain-tiles/",
    usedFor: "The shaded-relief terrain render shown in place of a photo for resorts without one",
    license: "Public domain; elevation data courtesy of the U.S. Geological Survey and NASA JPL",
    details: { href: "/credits", label: "How the renders are made" },
  },
  {
    name: "Open-Meteo",
    url: "https://open-meteo.com/",
    usedFor: "Hourly temperature, precipitation and wind used by the snow surface forecast",
    license: "Weather data © Open-Meteo.com, CC BY 4.0",
  },
  {
    name: "OpenStreetMap contributors",
    url: "https://www.openstreetmap.org/copyright",
    usedFor: "Nearby restaurants, lodging, ski shops and activities around each resort",
    license: "© OpenStreetMap contributors, Open Database License (ODbL) 1.0",
  },
  {
    name: "Wikimedia Commons",
    url: "https://commons.wikimedia.org/",
    usedFor: "Resort header photos",
    license:
      "Each photo carries its own license (CC0, CC BY, CC BY-SA or public domain); the photographer, license and source file are credited on the resort page that shows the photo and on the photo credits page",
    details: { href: "/credits", label: "Photo credits" },
  },
  {
    name: "Mapbox",
    url: "https://www.mapbox.com/about/maps/",
    usedFor: "The interactive map, map tiles and static map images",
    license: "© Mapbox, © OpenStreetMap; Mapbox terms of service",
  },
  {
    name: "Zippopotam.us",
    url: "https://www.zippopotam.us/",
    usedFor: "Turning a typed US ZIP code into a map location for the nearby-resorts filter",
    license: "Free public API; only the ZIP code you type is sent",
  },
  {
    name: "Google Maps",
    url: "https://www.google.com/maps",
    usedFor: "Directions links that open in Google Maps and star-rating flags for recommended places",
    license: "Opens on Google's site under Google's terms; Wynla stores only a recommended yes/no flag, never Google's content",
  },
];

const LINK = "font-semibold text-wn-navy underline underline-offset-2 hover:no-underline";

export default function DataSourcesPage() {
  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <PageHeader
        width="max-w-3xl"
        eyebrow="Credits"
        title="Data sources and credits"
        description="Wynla combines public weather and snow data, open map data and a few commercial services. This page lists each source, what we use it for and the license it comes with. Resort names, trail counts, vertical drop and pass membership are compiled by hand from each resort's own published figures."
      />

      <div className="mx-auto max-w-3xl space-y-8 px-4 pb-12 pt-6 sm:px-6 sm:pb-16">
        <Section id="sources" title="Sources" card>
          <ul className="divide-y divide-wn-line">
            {SOURCES.map((s) => (
              <li key={s.name} className="py-4 first:pt-0 last:pb-0">
                <h3 className="text-base font-bold text-wn-navy">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:underline">
                    {s.name}
                  </a>
                </h3>
                <dl className="mt-1 space-y-1 text-sm text-wn-charcoal">
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-eyebrow font-semibold uppercase text-wn-muted">Used for</dt>
                    <dd>{s.usedFor}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-eyebrow font-semibold uppercase text-wn-muted">License</dt>
                    <dd>{s.license}</dd>
                  </div>
                </dl>
                {s.details && (
                  <Link
                    href={s.details.href}
                    className={`mt-1 inline-flex min-h-11 items-center text-sm ${LINK}`}
                  >
                    {s.details.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </Section>

        <Section id="trademarks" title="Trademarks and non-affiliation" card>
          <div className="space-y-2 text-sm text-wn-charcoal sm:text-base">
            <p>
              Epic Pass is a trademark of Vail Resorts, Inc. Ikon Pass is a trademark of Alterra Mountain Company. Indy
              Pass is a trademark of Indy Pass LLC. Mountain Collective is a trademark of The Mountain Collective. Resort
              names are the trademarks of their respective owners.
            </p>
            <p>
              Wynla is an independent trip planner. It is not affiliated with, endorsed by or sponsored by any pass
              operator, resort or data provider listed on this page. Pass membership and pass prices shown on Wynla are
              compiled from each operator&apos;s public website and can change without notice; the operator&apos;s own
              site is always the final word.
            </p>
          </div>
        </Section>

        <Section id="corrections" title="Corrections" card>
          <p className="text-sm text-wn-charcoal sm:text-base">
            Spotted a wrong number, a missing credit or a photo that should not be here? Email{" "}
            <a href="mailto:hello@wynla.app" className={LINK}>
              hello@wynla.app
            </a>{" "}
            and we will fix it or take it down.
          </p>
        </Section>

        <p className="text-xs text-wn-muted">
          See also our{" "}
          <Link href="/credits" className={LINK}>
            photo credits
          </Link>
          ,{" "}
          <Link href="/privacy" className={LINK}>
            privacy policy
          </Link>{" "}
          and{" "}
          <Link href="/terms" className={LINK}>
            terms of service
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
