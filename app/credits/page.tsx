// /credits — photo credits for every resort hero we host, grouped by
// state. CC BY and CC BY-SA require the author, the licence and a link
// back to the source wherever the photo is shown or reachable from; the
// resort page prints the short line and links here for the full entry.
//
// Read-only: the list comes from the resorts row's hero_image_* columns
// (the same policy as the hero itself, lib/heroSource.ts, so a photo that
// is not shown, including a denylisted one, is not credited) plus
// lib/data/heroCredits.json, the pipeline's credit ledger. A ledger entry
// is used only when its `url` is the exact URL on the row: between
// 3-publish --confirm (which rewrites the entry for the new file) and the
// SQL being applied, the row still shows the old photo, and it must not
// be credited with the new file's author or source. Terrain cards are
// public-domain renders and get one line, not 395.

import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getStateName } from "@/lib/usStates";
import {
  commonsSearchUrl,
  heroSourceFor,
  licenceUrlFor,
  parseAttribution,
  terrainCardCount,
  tidyAttribution,
  HERO_BUCKET,
} from "@/lib/heroSource";
import heroCredits from "@/lib/data/heroCredits.json";

export const revalidate = 3600; // credits change when a photo is published, not per view

export const metadata: Metadata = {
  title: "Photo credits",
  description: "Photographer, licence and source for every resort photo on Wynla, plus how the terrain cards are made.",
  alternates: { canonical: "/credits" },
  openGraph: {
    title: "Photo credits · Wynla",
    description: "Photographer, licence and source for every resort photo on Wynla.",
    url: "/credits",
    images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "Wynla — US ski resort map" }],
  },
};

type Row = {
  slug: string;
  name: string;
  state: string;
  hero_image_url: string | null;
  hero_image_alt: string | null;
  hero_image_attribution: string | null;
  hero_image_credit: string | null;
  hero_image_source: string | null;
  hero_image_verified_winter: boolean | null;
};

type Credit = {
  slug: string;
  name: string;
  state: string;
  author: string | null;
  licence: string | null;
  licenceUrl: string | null;
  sourcePage: string;
  sourceLabel: string;
};

type LedgerCredit = {
  url?: string;
  title?: string;
  sourcePage?: string;
  author?: string | null;
  licence?: string | null;
  licenceUrl?: string | null;
};
const LEDGER = heroCredits as Record<string, LedgerCredit>;

/** The ledger entry for this row, only when it describes the photo actually on the row. */
function ledgerFor(row: Row): LedgerCredit | null {
  const entry = LEDGER[row.slug];
  return entry?.url && entry.url === row.hero_image_url ? entry : null;
}

/** hero_image_credit is the source page when the 2026-09 pipeline wrote it;
 *  older rows fall back to the matching ledger entry, then to a Commons search. */
function sourceFor(row: Row, ledger: LedgerCredit | null): { url: string; label: string } {
  const credit = row.hero_image_credit?.trim() ?? "";
  if (/^https?:\/\//.test(credit)) return { url: credit, label: "Source" };
  if (ledger?.sourcePage) return { url: ledger.sourcePage, label: "Source" };
  return { url: commonsSearchUrl(row.name), label: "Search on Wikimedia Commons" };
}

/** Deed link: the ledger's (straight from Commons) when present, else derived from the short name. */
function deedFor(licence: string | null, ledger: LedgerCredit | null): string | null {
  const fromLedger = ledger?.licenceUrl?.trim();
  if (fromLedger && /^https:\/\//.test(fromLedger)) return fromLedger;
  return licenceUrlFor(licence);
}

async function loadCredits(): Promise<{ credits: Credit[]; error: string | null }> {
  const { data, error } = await supabase
    .from("resorts")
    .select("slug, name, state, hero_image_url, hero_image_alt, hero_image_attribution, hero_image_credit, hero_image_source, hero_image_verified_winter")
    .eq("active", true)
    .like("hero_image_url", `%/storage/v1/object/public/${HERO_BUCKET}/%`)
    .order("state", { ascending: true })
    .order("name", { ascending: true })
    .returns<Row[]>();
  if (error) return { credits: [], error: error.message };
  const credits: Credit[] = [];
  for (const row of data ?? []) {
    // Same gate as the hero: a photo we do not show is not credited here.
    if (heroSourceFor(row).kind !== "photo") continue;
    const ledger = ledgerFor(row);
    // The ledger holds the cleaned, live-checked author and licence; the
    // column may still hold the 2026-06 batch's raw text until
    // scripts/photos/legacy/legacy-heroes.sql is applied.
    const column = parseAttribution(tidyAttribution(row.hero_image_attribution));
    const author = ledger ? (ledger.author ?? null) : column.author;
    const licence = ledger?.licence ?? column.licence;
    const source = sourceFor(row, ledger);
    credits.push({
      slug: row.slug,
      name: row.name,
      state: row.state,
      author,
      licence,
      licenceUrl: deedFor(licence, ledger),
      sourcePage: source.url,
      sourceLabel: source.label,
    });
  }
  return { credits, error: null };
}

export default async function CreditsPage() {
  const { credits, error } = await loadCredits();
  const byState = new Map<string, Credit[]>();
  for (const c of credits) {
    const list = byState.get(c.state) ?? [];
    list.push(c);
    byState.set(c.state, list);
  }
  const states = [...byState.keys()].sort((a, b) => (getStateName(a) ?? a).localeCompare(getStateName(b) ?? b));
  const cardCount = terrainCardCount();

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link href="/" className="inline-flex min-h-11 items-center text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy">
          ← Map
        </Link>

        <header className="mt-4 mb-8 sm:mt-6 sm:mb-10">
          <span className="inline-flex items-center rounded bg-wn-navy/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-wn-navy">
            Credits
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-wn-navy sm:text-4xl">Photo credits</h1>
          <p className="mt-4 text-sm text-wn-charcoal/75 sm:text-base">
            Every resort photo on Wynla is a Creative Commons or public-domain photograph from Wikimedia Commons, re-hosted on our
            own storage, resized and possibly cropped. The photographer, licence and source file are listed below for each one
            ({credits.length} photo{credits.length === 1 ? "" : "s"} credited). Resorts without a vetted photo show a terrain render
            instead; see the last section.
          </p>
        </header>

        {error && (
          <p className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            The credit list could not be loaded right now ({error}). Each resort page still carries its own credit line.
          </p>
        )}

        {states.map((state) => (
          <section key={state} className="mb-6 rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-3 text-base font-bold text-wn-navy sm:text-lg">
              {getStateName(state) ?? state}
              <span className="ml-2 text-xs font-semibold text-wn-charcoal/50">{byState.get(state)?.length}</span>
            </h2>
            <ul className="divide-y divide-wn-charcoal/10">
              {(byState.get(state) ?? []).map((c) => (
                <li key={c.slug} className="py-3 first:pt-0 last:pb-0 text-sm text-wn-charcoal/80">
                  <Link
                    href={`/resort/${encodeURIComponent(c.slug)}`}
                    className="font-bold text-wn-navy underline-offset-2 hover:underline"
                  >
                    {c.name}
                  </Link>
                  <p className="mt-0.5 flex flex-wrap gap-x-2 gap-y-1">
                    <span>{c.author ? `Photo by ${c.author}` : "Photographer not recorded"}</span>
                    <span aria-hidden="true">·</span>
                    {c.licence ? (
                      c.licenceUrl ? (
                        <a href={c.licenceUrl} target="_blank" rel="noopener noreferrer license" className="underline hover:text-wn-navy">
                          {c.licence}
                        </a>
                      ) : (
                        <span>{c.licence}</span>
                      )
                    ) : (
                      <span>Licence not recorded</span>
                    )}
                    <span aria-hidden="true">·</span>
                    <a href={c.sourcePage} target="_blank" rel="noopener noreferrer" className="underline hover:text-wn-navy">
                      {c.sourceLabel}
                    </a>
                    <span aria-hidden="true">·</span>
                    <span className="text-wn-charcoal/70">resized, may be cropped</span>
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section className="mb-8 rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-base font-bold text-wn-navy sm:text-lg">Terrain renders</h2>
          <div className="space-y-2 text-sm text-wn-charcoal/80 sm:text-base">
            <p>
              A resort without a vetted winter photo shows a shaded-relief render of its own mountain instead of a photo. The
              render is computed by Wynla from public-domain elevation data: USGS 3D Elevation Program (3DEP) and SRTM tiles
              published through the{" "}
              <a
                href="https://registry.opendata.aws/terrain-tiles/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-wn-navy"
              >
                AWS Terrain Tiles
              </a>{" "}
              open dataset (Mapzen terrarium encoding). {cardCount} renders are on file. Each one is labelled as a terrain render
              on the page that shows it; none is a photograph.
            </p>
            <p className="text-xs text-wn-charcoal/60">Elevation data courtesy of the U.S. Geological Survey and NASA JPL, public domain.</p>
          </div>
        </section>

        <section className="mb-8 rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-3 text-base font-bold text-wn-navy sm:text-lg">Take-downs and corrections</h2>
          <p className="text-sm text-wn-charcoal/80 sm:text-base">
            If you are the photographer and the credit is wrong, or you want a photo removed, email{" "}
            <a href="mailto:hello@wynla.app" className="font-semibold text-wn-navy underline hover:no-underline">
              hello@wynla.app
            </a>{" "}
            with the resort name. We fix or remove it within one business day.
          </p>
        </section>

        <p className="text-xs text-wn-charcoal/55">
          See also{" "}
          <Link href="/data-sources" className="font-semibold text-wn-navy underline hover:no-underline">
            data sources
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
