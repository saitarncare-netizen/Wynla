// Stage 8 — Single curated list page. Renders the list's hero, intro,
// and a grid of resort cards in the order specified by lib/lists.ts
// (intentional ranking, no re-sort). When a resort in the list isn't
// active in the DB it's silently skipped — the page still renders.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getList, LISTS } from "@/lib/lists";
import { passColor, primaryPass, passLabel } from "@/lib/passColors";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import EmptyState from "@/components/ui/EmptyState";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Icon from "@/components/icons/Icon";

// ISR — single list pages, hourly revalidate.
export const revalidate = 3600;

type Resort = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: string | null;
  passes: string[];
  vertical_drop: number | null;
  total_trails: number | null;
};

async function getResortsBySlugs(slugs: string[]): Promise<Resort[]> {
  if (slugs.length === 0) return [];
  const { data, error } = await supabase
    .from("resorts")
    .select("id, slug, name, state, region, passes, vertical_drop, total_trails")
    .in("slug", slugs)
    .eq("active", true);
  if (error || !data) return [];
  // Preserve the curated order from the list, not whatever Supabase
  // returns — the list ordering is editorial.
  const bySlug = new Map((data as Resort[]).map((r) => [r.slug, r]));
  return slugs.map((s) => bySlug.get(s)).filter((r): r is Resort => Boolean(r));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const list = getList(slug);
  if (!list) return { title: "List not found" };
  return {
    title: list.title,
    description: list.intro,
    alternates: { canonical: `/lists/${slug}` },
    openGraph: {
      title: `${list.title} · Wynla`,
      description: list.intro,
      url: `/lists/${slug}`,
    },
  };
}

export default async function ListPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const list = getList(slug);
  if (!list) notFound();

  const resorts = await getResortsBySlugs(list.resortSlugs);

  // ItemList JSON-LD — useful structured data for SEO + AI summarizers.
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: list.title,
    description: list.intro,
    numberOfItems: resorts.length,
    itemListElement: resorts.map((r, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app"}/resort/${r.slug}`,
      name: r.name,
    })),
  };

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListLd) }}
      />

      <PageHeader
        tone="navy"
        accent={list.accent}
        eyebrow={`Curated list · ${resorts.length} resorts`}
        title={list.title}
        description={list.subtitle}
      />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <section className="max-w-3xl">
          <p className="text-base leading-relaxed text-wn-charcoal">{list.intro}</p>
        </section>

        <section aria-label="Resorts in this list">
          {resorts.length > 0 ? (
            <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
              {resorts.map((r, i) => (
                <li key={r.id}>
                  <ResortCard resort={r} rank={i + 1} />
                </li>
              ))}
            </ol>
          ) : (
            <EmptyState
              icon="list"
              title="No resorts in this list right now"
              body="The resorts on this list are not active in Wynla at the moment. Browse the map for everything that is."
              action={<Button href="/">Open the map</Button>}
            />
          )}
          <p className="mt-3 text-xs text-wn-muted">
            Vertical drop and trail counts are reported by each resort and compiled by hand; see{" "}
            <a href="/data-sources" className="font-semibold text-wn-navy underline underline-offset-2">
              data sources
            </a>
            .
          </p>
        </section>

        <Card padding="lg" className="text-center">
          <h2 className="text-lg font-bold text-wn-navy">Plan a trip around this list</h2>
          <p className="mt-1 text-sm text-wn-muted">Use the map to stitch these resorts into a multi-stop trip.</p>
          <Button href="/?plan=1" className="mt-4" iconRight={<Icon name="arrow-right" />}>
            Plan a trip
          </Button>
        </Card>

        <Section title="More lists">
          <div className="flex flex-wrap gap-2">
            {LISTS.filter((l) => l.slug !== list.slug).map((l) => (
              <Chip key={l.slug} href={`/lists/${l.slug}`}>
                {l.title}
              </Chip>
            ))}
          </div>
        </Section>
      </div>
    </main>
  );
}

function ResortCard({ resort, rank }: { resort: Resort; rank: number }) {
  const primary = primaryPass(resort.passes);
  const accent = passColor(primary);
  return (
    <Card href={`/resort/${resort.slug}`} accent={accent} className="h-full">
      <div className="flex items-baseline gap-2 text-xs text-wn-muted">
        <span className="font-bold uppercase">#{rank}</span>
        <p>
          {resort.state}
          {resort.region ? " · " + resort.region : ""}
        </p>
      </div>
      <h3 className="mt-1 text-base font-bold leading-tight text-wn-navy">{resort.name}</h3>

      <dl className="mt-3 grid grid-cols-3 gap-1.5 text-xs">
        <div>
          <dt className="text-wn-muted">Vertical</dt>
          <dd className="font-semibold tabular-nums text-wn-charcoal">
            {resort.vertical_drop != null ? `${resort.vertical_drop.toLocaleString()} ft` : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-wn-muted">Trails</dt>
          <dd className="font-semibold tabular-nums text-wn-charcoal">{resort.total_trails ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-wn-muted">Passes</dt>
          <dd className="font-semibold text-wn-charcoal">
            {(resort.passes ?? []).length > 0
              ? (resort.passes ?? [])
                  .slice(0, 2)
                  .map((p) => passLabel(p))
                  .join(", ")
              : "—"}
          </dd>
        </div>
      </dl>

      <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-wn-navy">
        View details
        <Icon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </p>
    </Card>
  );
}
