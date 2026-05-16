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
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { passColor, primaryPass, passLabel } from "@/lib/passColors";
import {
  getStateName,
  isStateCodeWithResorts,
  US_STATES,
} from "@/lib/usStates";

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
    title: `${stateName} Ski Resorts (${count} resorts)`,
    description:
      count > 0
        ? `All ${count} active ski resorts in ${stateName}, sorted by vertical drop. Top resorts: ${topThree}. Compare passes, trails, and trip plans on Wynla.`
        : `Ski resorts in ${stateName} on Wynla.`,
    openGraph: {
      title: `${stateName} Ski Resorts · Wynla`,
      description: `${count} resorts in ${stateName}. Plan your trip with maps, passes, and drive times.`,
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

      {/* HERO — gradient header. Matches the resort detail page palette
          so the brand reads consistent across SEO landing pages. */}
      <header
        className="relative w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #1E2952 0%, #141A3A 60%, #0B1028 100%)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.3) 0%, transparent 50%)",
          }}
        />

        <div className="relative z-10 mx-auto flex max-w-5xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-1.5 text-xs font-semibold text-wn-navy shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            ← Map
          </Link>
          <Link
            href="/guides"
            className="hidden text-xs font-semibold text-white/85 underline-offset-4 hover:underline sm:inline"
          >
            Guides
          </Link>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 sm:pb-14 sm:pt-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            {upper} · State directory
          </p>
          <h1 className="text-4xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl">
            Ski Resorts in {stateName}
          </h1>
          <p className="mt-3 text-base text-white/85 sm:text-lg">
            {resorts.length} resorts · Sorted by size
          </p>
          <p className="mt-1 text-sm text-white/65">
            Plan your {stateName} trip — passes, drive times, weather.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-10 px-4 py-8 sm:px-6 sm:py-12">
        {/* Stats row */}
        <section>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Stat label="Total resorts" value={resorts.length.toLocaleString()} />
            <Stat
              label="Total vertical"
              value={`${totalVertical.toLocaleString()} ft`}
            />
            <Stat
              label="Avg vertical"
              value={avgVertical > 0 ? `${avgVertical.toLocaleString()} ft` : "—"}
            />
          </div>
        </section>

        {/* Resort grid */}
        <section>
          <h2 className="mb-3 text-lg font-bold text-wn-navy sm:text-xl">
            All resorts
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {resorts.map((r) => (
              <ResortCard key={r.id} resort={r} />
            ))}
          </div>
        </section>

        {/* Bottom CTA */}
        <section className="rounded-2xl border border-wn-charcoal/10 bg-white p-6 text-center shadow-sm">
          <h3 className="text-lg font-bold text-wn-navy">
            Stringing together a multi-stop {stateName} trip?
          </h3>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            Wynla&apos;s planner picks legs by drive time, pass, and snow.
          </p>
          <Link
            href="/?plan=1"
            className="mt-4 inline-flex items-center gap-1 rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            Plan a trip →
          </Link>
        </section>

        {/* Other state quick-links — helps both users and crawlers
            find adjacent landing pages without a separate index. */}
        <section>
          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-wn-charcoal/60">
            Other states
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {Object.keys(US_STATES)
              .sort()
              .filter((c) => c !== upper && isStateCodeWithResorts(c))
              .map((c) => (
                <Link
                  key={c}
                  href={`/state/${c.toLowerCase()}`}
                  className="rounded-full border border-wn-charcoal/15 bg-white px-3 py-1 text-xs font-medium text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy"
                >
                  {US_STATES[c]}
                </Link>
              ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-wn-charcoal/10 bg-white px-3 py-3 sm:px-4">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/50">
        {label}
      </div>
      <div className="mt-0.5 text-lg font-bold text-wn-navy sm:text-xl">
        {value}
      </div>
    </div>
  );
}

function ResortCard({ resort }: { resort: Resort }) {
  const primary = primaryPass(resort.passes);
  const accent = passColor(primary);
  return (
    <Link
      href={`/resort/${resort.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm transition hover:border-wn-navy/40 hover:shadow-md"
    >
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
      <div className="flex-1 p-3 sm:p-4">
        <h3 className="text-sm font-bold leading-tight text-wn-navy sm:text-base">
          {resort.name}
        </h3>
        <p className="mt-0.5 text-[11px] text-wn-charcoal/60">
          {resort.state}
          {resort.region ? " · " + resort.region : ""}
        </p>

        <dl className="mt-3 grid grid-cols-3 gap-1.5 text-[11px]">
          <div>
            <dt className="text-wn-charcoal/50">Vertical</dt>
            <dd className="font-semibold text-wn-charcoal">
              {resort.vertical_drop != null
                ? `${resort.vertical_drop.toLocaleString()}ft`
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-wn-charcoal/50">Trails</dt>
            <dd className="font-semibold text-wn-charcoal">
              {resort.total_trails ?? "—"}
            </dd>
          </div>
          <div>
            <dt className="text-wn-charcoal/50">Passes</dt>
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

        <div className="mt-3 text-[11px] font-semibold text-wn-navy/70 transition group-hover:text-wn-navy">
          View details →
        </div>
      </div>
    </Link>
  );
}
