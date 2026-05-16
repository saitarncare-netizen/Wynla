// Stage 8 — Single curated list page. Renders the list's hero, intro,
// and a grid of resort cards in the order specified by lib/lists.ts
// (intentional ranking, no re-sort). When a resort in the list isn't
// active in the DB it's silently skipped — the page still renders.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getList, LISTS } from "@/lib/lists";
import { passColor, primaryPass, passLabel } from "@/lib/passColors";

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
    openGraph: {
      title: `${list.title} · Wynla`,
      description: list.intro,
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

  const accent = list.accent ?? "#1E2952";

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

      <header
        className="relative w-full overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${accent} 0%, #1E2952 60%, #0B1028 100%)`,
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
            href="/lists"
            className="inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-1.5 text-xs font-semibold text-wn-navy shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            ← All lists
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
            Curated list · {resorts.length} resorts
          </p>
          <h1 className="text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            {list.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/85 sm:text-lg">
            {list.subtitle}
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <section className="max-w-3xl">
          <p className="text-base leading-relaxed text-wn-charcoal/85">
            {list.intro}
          </p>
        </section>

        <section>
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {resorts.map((r, i) => (
              <li key={r.id}>
                <ResortCard resort={r} rank={i + 1} />
              </li>
            ))}
          </ol>
          {resorts.length === 0 && (
            <p className="rounded-lg border border-dashed border-wn-charcoal/20 bg-white p-6 text-center text-sm text-wn-charcoal/60">
              No resorts found for this list.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-wn-charcoal/10 bg-white p-6 text-center shadow-sm">
          <h3 className="text-lg font-bold text-wn-navy">
            Plan a trip around this list
          </h3>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            Use the map to stitch these resorts into a multi-stop trip.
          </p>
          <Link
            href="/?plan=1"
            className="mt-4 inline-flex items-center gap-1 rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            Plan a trip →
          </Link>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-wn-charcoal/60">
            More lists
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {LISTS.filter((l) => l.slug !== list.slug).map((l) => (
              <Link
                key={l.slug}
                href={`/lists/${l.slug}`}
                className="rounded-full border border-wn-charcoal/15 bg-white px-3 py-1 text-xs font-medium text-wn-charcoal transition hover:border-wn-navy hover:text-wn-navy"
              >
                {l.title}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function ResortCard({ resort, rank }: { resort: Resort; rank: number }) {
  const primary = primaryPass(resort.passes);
  const accent = passColor(primary);
  return (
    <Link
      href={`/resort/${resort.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm transition hover:border-wn-navy/40 hover:shadow-md"
    >
      <div
        className="h-1.5 w-full"
        style={{ backgroundColor: accent }}
        aria-hidden="true"
      />
      <div className="flex-1 p-3 sm:p-4">
        <div className="flex items-baseline gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-wn-charcoal/45">
            #{rank}
          </span>
          <p className="text-[11px] text-wn-charcoal/60">
            {resort.state}
            {resort.region ? " · " + resort.region : ""}
          </p>
        </div>
        <h3 className="mt-1 text-sm font-bold leading-tight text-wn-navy sm:text-base">
          {resort.name}
        </h3>

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
