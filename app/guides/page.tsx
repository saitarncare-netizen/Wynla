// Stage 8 — Guides index. Lists every editorial guide as a card grid.
// Long-form content with strong internal-link density, designed to rank
// for "ikon vs epic", "best beginner colorado ski resorts", etc.

import type { Metadata } from "next";
import { GUIDES } from "@/lib/guides";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/icons/Icon";

// ISR — guides are editorial content, rarely changes.
export const revalidate = 86400; // 24h

export const metadata: Metadata = {
  title: "Guides",
  description:
    "Pass choices, region advice, and trip planning for US skiers and snowboarders.",
  openGraph: {
    title: "Wynla Guides · Pass choices, regions, trip planning",
    description:
      "Long-form guides for ski-trip planners — pass comparisons, regional advice, and first-trip walk-throughs.",
    // Defining openGraph replaces the layout block wholesale — without an
    // explicit image this page would share imageless (layout twitter no
    // longer carries a fallback image).
    images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "Wynla — US ski resort map" }],
  },
};

export default function GuidesIndexPage() {
  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <PageHeader
        tone="navy"
        size="lg"
        eyebrow="Editorial"
        title="Wynla guides"
        description="Pass choices, region advice, and trip planning for US skiers and snowboarders."
        actions={
          <>
            <Button href="/lists" variant="secondary" size="sm">
              Curated lists
            </Button>
            <Button href="/trip-templates" variant="secondary" size="sm">
              Trip ideas
            </Button>
          </>
        }
      />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <Card key={g.slug} href={`/guides/${g.slug}`} accent="var(--color-wn-navy)">
              <p className="text-eyebrow font-semibold uppercase text-wn-muted">{g.readingMinutes} min read</p>
              <h2 className="mt-1 text-lg font-bold leading-tight text-wn-navy sm:text-xl">{g.title}</h2>
              <p className="mt-1 text-sm text-wn-muted">{g.subtitle}</p>
              <p className="mt-3 text-sm text-wn-charcoal">{g.description}</p>
              <p className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-wn-navy">
                Read guide
                <Icon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Card>
          ))}
        </div>

        <Card padding="lg" className="text-center">
          <h2 className="text-lg font-bold text-wn-navy">Ready to plan?</h2>
          <p className="mt-1 text-sm text-wn-muted">
            Use the map to build a multi-stop trip across passes and regions, or start from a pre-made itinerary.
          </p>
          <div className="mt-4 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
            <Button href="/?plan=1" iconRight={<Icon name="arrow-right" />}>
              Plan a trip
            </Button>
            <Button href="/trip-templates" variant="secondary">
              Browse trip templates
            </Button>
          </div>
        </Card>
      </div>
    </main>
  );
}
