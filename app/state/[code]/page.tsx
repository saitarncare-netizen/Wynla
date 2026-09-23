// Stage 8 — State landing page. Per-state directory at /state/[code]
// (e.g. /state/co, /state/vt) that lists every active resort in the
// state sorted by vertical drop. Built as an SEO + AI-search funnel:
// when someone searches "Colorado ski resorts", we want a real page
// that ranks. JSON-LD ItemList markup helps with rich-result eligibility.
//
// Source of truth: resorts.state stores 2-letter codes; we filter
// against the uppercased route param. Unknown / unsupported codes →
// notFound() rather than rendering an empty grid.

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { passColor, primaryPass, passLabel } from "@/lib/passColors";
import {
  getStateName,
  isStateCodeWithResorts,
  US_STATES,
} from "@/lib/usStates";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Icon from "@/components/icons/Icon";

// ISR — state pages list resorts in a single state and rarely change.
// Hourly revalidate is plenty.
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
  total_acres: number | null;
};

async function getResortsForState(code: string): Promise<Resort[] | null> {
  const { data, error } = await supabase
    .from("resorts")
    .select(
      "id, slug, name, state, region, passes, vertical_drop, total_trails, total_acres",
    )
    .eq("active", true)
    .eq("state", code)
    .order("vertical_drop", { ascending: false, nullsFirst: false });
  if (error) return null;
  return (data ?? []) as Resort[];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const upper = code.toUpperCase();
  const stateName = getStateName(upper);
  if (!stateName || !isStateCodeWithResorts(upper)) {
    return { title: `State not found` };
  }
  const resorts = await getResortsForState(upper);
  const count = resorts?.length ?? 0;
  const topThree = (resorts ?? []).slice(0, 3).map((r) => r.name).join(", ");
  // Layout's title.template adds " · Wynla" automatically.
  return {
    title: `${stateName} ski resorts (${count} resorts)`,
    description:
      count > 0
        ? `All ${count} active ski resorts in ${stateName}, sorted by vertical drop. Top resorts: ${topThree}. Compare passes, trails, and trip plans on Wynla.`
        : `Ski resorts in ${stateName} on Wynla.`,
    alternates: { canonical: `/state/${code.toLowerCase()}` },
    openGraph: {
      title: `${stateName} ski resorts · Wynla`,
      description: `${count} resorts in ${stateName}. Plan your trip with maps, passes, and drive times.`,
      url: `/state/${code.toLowerCase()}`,
    },
  };
}

export default async function StatePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const stateName = getStateName(upper);
  if (!stateName) notFound();
  if (!isStateCodeWithResorts(upper)) notFound();

  const resorts = await getResortsForState(upper);
  if (!resorts || resorts.length === 0) notFound();

  // Aggregate stats. Vertical drop is the most-populated stat across
  // tiers — `total_trails` and `total_acres` are sparser, so we lead
  // with vertical_drop totals.
  const totalVertical = resorts.reduce(
    (sum, r) => sum + (r.vertical_drop ?? 0),
    0,
  );
  const verticalCount = resorts.filter((r) => r.vertical_drop != null).length;
  const avgVertical =
    verticalCount > 0 ? Math.round(totalVertical / verticalCount) : 0;

  // JSON-LD ItemList — feeds Google rich-results / AI summarization with
  // an ordered list of the state's resorts. listOrder matches our visual
  // sort (vertical_drop desc).
  const itemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `Ski Resorts in ${stateName}`,
    numberOfItems: resorts.length,
    itemListOrder: "https://schema.org/ItemListOrderDescending",
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
        size="lg"
        eyebrow={`${upper} · State directory`}
        title={`Ski resorts in ${stateName}`}
        description={`${resorts.length} resorts, sorted by vertical drop. Plan your ${stateName} trip with passes, drive times and weather.`}
        actions={
          <Button href="/guides" variant="secondary" size="sm">
            Guides
          </Button>
        }
      />

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
        {/* Stats row. Every number is a resort-reported figure compiled
            by hand, so the row says so once instead of each tile. */}
        <section aria-label="State totals">
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Resorts" value={resorts.length.toLocaleString()} />
            <Stat label="Total vertical" value={`${totalVertical.toLocaleString()} ft`} />
            <Stat label="Avg vertical" value={avgVertical > 0 ? `${avgVertical.toLocaleString()} ft` : "—"} />
          </div>
          <p className="mt-2 text-xs text-wn-muted">
            Reported by each resort, compiled by hand. {verticalCount < resorts.length ? `${resorts.length - verticalCount} resorts have no published vertical drop and are left out of the averages.` : ""}
          </p>
        </section>

        <Section title="All resorts" description="Biggest vertical drop first.">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {resorts.map((r) => (
              <ResortCard key={r.id} resort={r} />
            ))}
          </div>
        </Section>

        <Card padding="lg" className="text-center">
          <h2 className="text-lg font-bold text-wn-navy text-balance">Stringing together a multi-stop {stateName} trip?</h2>
          <p className="mt-1 text-sm text-wn-muted">Wynla&apos;s planner picks legs by drive time, pass, and snow.</p>
          <Button href="/?plan=1" className="mt-4" iconRight={<Icon name="arrow-right" />}>
            Plan a trip
          </Button>
        </Card>

        {/* Other state quick-links — helps both users and crawlers
            find adjacent landing pages without a separate index. */}
        <Section title="Other states">
          <div className="flex flex-wrap gap-2">
            {Object.keys(US_STATES)
              .sort()
              .filter((c) => c !== upper && isStateCodeWithResorts(c))
              .map((c) => (
                <Chip key={c} href={`/state/${c.toLowerCase()}`}>
                  {US_STATES[c]}
                </Chip>
              ))}
          </div>
        </Section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-wn-md border border-wn-line bg-white px-3 py-3 sm:px-4">
      <div className="text-eyebrow font-semibold uppercase text-wn-muted">{label}</div>
      <div className="mt-0.5 text-lg font-bold tabular-nums text-wn-navy sm:text-wn-xl">{value}</div>
    </div>
  );
}

function ResortCard({ resort }: { resort: Resort }) {
  const primary = primaryPass(resort.passes);
  const accent = passColor(primary);
  return (
    <Card href={`/resort/${resort.slug}`} accent={accent} className="h-full">
      <h3 className="text-sm font-bold leading-tight text-wn-navy sm:text-base">{resort.name}</h3>
      <p className="mt-0.5 text-xs text-wn-muted">
        {resort.state}
        {resort.region ? " · " + resort.region : ""}
      </p>

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
