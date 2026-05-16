// Stage 8 — Single guide page. Server-rendered, content sourced from
// lib/guides.ts. Layout is a hero + max-w-3xl prose article body using
// Tailwind's typography-style rules applied inline (no @tailwindcss/typography
// dep). Article body is plain JSX so we can mix internal links to
// /resort/[slug] freely.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getGuide, GUIDES } from "@/lib/guides";

// ISR — guide bodies live in lib/guides.tsx, refreshed on deploy.
export const revalidate = 86400; // 24h

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return { title: "Guide not found" };
  return {
    title: guide.title,
    description: guide.description,
    openGraph: {
      title: `${guide.title} · Wynla`,
      description: guide.description,
      type: "article",
      publishedTime: guide.publishedAt,
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  // Related guides — the other ones, capped at 3.
  const related = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

  // Article JSON-LD — gives the page a chance at rich-result eligibility.
  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.description,
    datePublished: guide.publishedAt,
    author: { "@type": "Organization", name: "Wynla" },
    publisher: { "@type": "Organization", name: "Wynla" },
  };

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }}
      />

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

        <div className="relative z-10 mx-auto flex max-w-3xl items-center justify-between px-4 py-4 sm:px-6">
          <Link
            href="/guides"
            className="inline-flex items-center gap-1 rounded-md bg-white/95 px-3 py-1.5 text-xs font-semibold text-wn-navy shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            ← Guides
          </Link>
          <span className="text-xs text-white/65">
            {guide.readingMinutes} min read
          </span>
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pb-14 sm:pt-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            Guide
          </p>
          <h1 className="text-3xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            {guide.title}
          </h1>
          <p className="mt-3 text-base text-white/85 sm:text-lg">
            {guide.subtitle}
          </p>
        </div>
      </header>

      {/* Article body — typography rules applied via direct Tailwind
          classes on the wrapper. Keeps headings, paragraphs, lists,
          and links visually coherent without pulling in a plugin. */}
      <article
        className={[
          "mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14",
          "[&_p]:my-4 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-wn-charcoal",
          "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-2xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-wn-navy",
          "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-wn-navy",
          "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5",
          "[&_ul_li]:text-base [&_ul_li]:leading-relaxed [&_ul_li]:text-wn-charcoal",
          "[&_strong]:font-semibold [&_strong]:text-wn-navy",
        ].join(" ")}
      >
        {guide.body}

        <hr className="my-10 border-wn-charcoal/15" />

        <div className="rounded-2xl border border-wn-charcoal/10 bg-white p-6 text-center shadow-sm">
          <h3 className="text-lg font-bold text-wn-navy">Ready to plan?</h3>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            Build a multi-stop trip across passes and regions on the map.
          </p>
          <Link
            href="/?plan=1"
            className="mt-4 inline-flex items-center gap-1 rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            Plan a trip →
          </Link>
        </div>

        {related.length > 0 && (
          <section className="mt-10">
            <h2 className="!mb-4 !text-xl">More guides</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {related.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guides/${g.slug}`}
                  className="group rounded-lg border border-wn-charcoal/10 bg-white p-4 transition hover:border-wn-navy/40"
                >
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
                    {g.readingMinutes} min
                  </p>
                  <p className="mt-0.5 text-sm font-bold text-wn-navy group-hover:underline">
                    {g.title}
                  </p>
                  <p className="mt-1 text-xs text-wn-charcoal/60">
                    {g.subtitle}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
