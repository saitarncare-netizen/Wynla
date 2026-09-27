// /trip-templates — directory of pre-made trip itineraries. Each card
// links to /trip-templates/[slug] for a fuller preview + "Customize
// and save" CTA. No DB calls — the templates live in lib/tripTemplates.

import type { Metadata } from "next";
import { TEMPLATES } from "@/lib/tripTemplates";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Icon from "@/components/icons/Icon";

export const metadata: Metadata = {
  // The layout's title template appends " · Wynla".
  title: "Trip templates",
  description:
    "Pre-made ski trip itineraries you can customize in seconds. From Colorado weekends to week-long Utah powder hunts.",
};

export default function TripTemplatesPage() {
  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <PageHeader
        tone="navy"
        eyebrow="Trip ideas"
        title="Pre-made trip itineraries"
        description={`${TEMPLATES.length} ski trips designed around classic regions. Tap one to see the route, then customize and save your own version.`}
      />

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10" aria-label="Templates">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => {
            const totalDays = t.daysPerResort.reduce((a, b) => a + b, 0);
            const stopCount = t.resortSlugs.length;
            return (
              <li key={t.slug}>
                <Card href={`/trip-templates/${t.slug}`} className="h-full">
                  <div className="flex h-full flex-col">
                    <div className="mb-2 flex items-baseline justify-between text-eyebrow font-semibold uppercase text-wn-muted">
                      <span>{totalDays}-day trip</span>
                      <span>
                        {stopCount} stop{stopCount === 1 ? "" : "s"}
                      </span>
                    </div>
                    <h2 className="text-base font-bold text-wn-navy group-hover:underline">{t.title}</h2>
                    <p className="mt-1 line-clamp-3 flex-1 text-sm text-wn-muted">{t.description}</p>
                    <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                      <span className="text-wn-muted">From {t.origin.name}</span>
                      <span className="inline-flex items-center gap-1 text-sm font-semibold text-wn-navy">
                        Use this template
                        <Icon name="arrow-right" className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
