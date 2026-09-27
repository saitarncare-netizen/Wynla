// Stage 8 — Single guide page. Server-rendered, content sourced from
// lib/guides.ts. Layout is a hero + max-w-3xl prose article body using
// Tailwind's typography-style rules applied inline (no @tailwindcss/typography
// dep). Article body is plain JSX so we can mix internal links to
// /resort/[slug] freely.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getGuide, GUIDES } from "@/lib/guides";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Section from "@/components/ui/Section";
import Icon from "@/components/icons/Icon";

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
    alternates: { canonical: `/guides/${slug}` },
    openGraph: {
      title: `${guide.title} · Wynla`,
      description: guide.description,
      type: "article",
      publishedTime: guide.publishedAt,
      url: `/guides/${slug}`,
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

      {/* The AppShell top bar carries "back to Guides" (phone) and the
          Guides nav item (desktop), so the hero only needs the article
          front matter. */}
      <PageHeader
        tone="navy"
        width="max-w-3xl"
        eyebrow="Guide"
        title={guide.title}
        description={guide.subtitle}
        meta={`${guide.readingMinutes} min read`}
      />

      {/* Article body — typography rules applied via direct Tailwind
          classes on the wrapper. Keeps headings, paragraphs, lists,
          and links visually coherent without pulling in a plugin. */}
      <article
        className={[
          "mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14",
          "[&_p]:my-4 [&_p]:text-base [&_p]:leading-relaxed [&_p]:text-wn-charcoal",
          "[&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-wn-2xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_h2]:text-wn-navy",
          "[&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-wn-navy",
          "[&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5",
          "[&_ul_li]:text-base [&_ul_li]:leading-relaxed [&_ul_li]:text-wn-charcoal",
          "[&_strong]:font-semibold [&_strong]:text-wn-navy",
          "[&_a]:font-semibold [&_a]:text-wn-navy [&_a]:underline [&_a]:underline-offset-2",
        ].join(" ")}
      >
        {guide.body}
      </article>

      {/* Outside the <article> so the prose selectors above do not
          restyle the primitives. */}
      <div className="mx-auto max-w-3xl space-y-10 px-4 pb-12 sm:px-6 sm:pb-16">
        <hr className="border-wn-line" />

        <Card padding="lg" className="text-center">
          <h2 className="text-lg font-bold text-wn-navy">Ready to plan?</h2>
          <p className="mt-1 text-sm text-wn-muted">Build a multi-stop trip across passes and regions on the map.</p>
          <Button href="/?plan=1" className="mt-4" iconRight={<Icon name="arrow-right" />}>
            Plan a trip
          </Button>
        </Card>

        {related.length > 0 && (
          <Section title="More guides">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {related.map((g) => (
                <Card key={g.slug} href={`/guides/${g.slug}`}>
                  <p className="text-eyebrow font-semibold uppercase text-wn-muted">{g.readingMinutes} min read</p>
                  <p className="mt-0.5 text-sm font-bold text-wn-navy group-hover:underline">{g.title}</p>
                  <p className="mt-1 text-xs text-wn-muted">{g.subtitle}</p>
                </Card>
              ))}
            </div>
          </Section>
        )}
      </div>
    </main>
  );
}
