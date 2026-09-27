// Stage 8 — Curated lists directory. Browsable index of hand-curated
// resort lists (powder paradise, beginner-friendly, etc.). Each card
// links to /lists/[slug].

import type { Metadata } from "next";
import { LISTS } from "@/lib/lists";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/icons/Icon";

// ISR — list directory rarely changes, hourly is plenty.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Curated ski resort lists",
  description:
    "Hand-picked resort lists for specific trips, skill levels, and passes.",
  openGraph: {
    title: "Curated ski resort lists · Wynla",
    description:
      "Hand-picked resort lists for specific trips, skill levels, and passes.",
    // Defining openGraph replaces the layout block wholesale — without an
    // explicit image this page would share imageless (layout twitter no
    // longer carries a fallback image).
    images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "Wynla — US ski resort map" }],
  },
};

export default function ListsIndexPage() {
  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <PageHeader
        tone="navy"
        size="lg"
        eyebrow="Lists"
        title="Curated lists"
        description="Hand-picked resorts for specific trips and skill levels."
        actions={
          <Button href="/guides" variant="secondary" size="sm">
            Guides
          </Button>
        }
      />

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LISTS.map((l) => (
            <Card key={l.slug} href={`/lists/${l.slug}`} accent={l.accent ?? "var(--color-wn-navy)"}>
              <p className="text-eyebrow font-semibold uppercase text-wn-muted">{l.resortSlugs.length} resorts</p>
              <h2 className="mt-1 text-base font-bold leading-tight text-wn-navy sm:text-lg">{l.title}</h2>
              <p className="mt-1 text-sm text-wn-muted">{l.subtitle}</p>
              <p className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-wn-navy">
                Open list
                <Icon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </p>
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
