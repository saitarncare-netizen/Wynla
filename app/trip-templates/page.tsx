// /trip-templates — directory of pre-made trip itineraries. Each card
// links to /trip-templates/[slug] for a fuller preview + "Customize
// and save" CTA. No DB calls — the templates live in lib/tripTemplates.

import Link from "next/link";
import type { Metadata } from "next";
import { TEMPLATES } from "@/lib/tripTemplates";

export const metadata: Metadata = {
  title: "Trip templates — Wynla",
  description:
    "Pre-made ski trip itineraries you can customize in seconds. From Colorado weekends to week-long Utah powder hunts.",
};

export default function TripTemplatesPage() {
  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <header className="bg-wn-navy text-white">
        <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12">
          <Link
            href="/"
            className="mb-3 inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-xs font-semibold text-white/90 backdrop-blur-sm transition hover:bg-white/20"
          >
            ← Back to map
          </Link>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/60">
            Trip ideas
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Pre-made trip itineraries
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/75 sm:text-base">
            Eight ski trips designed around classic regions. Tap one to see the
            route, then customize and save your own version.
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {TEMPLATES.map((t) => {
            const totalDays = t.daysPerResort.reduce((a, b) => a + b, 0);
            const stopCount = t.resortSlugs.length;
            return (
              <li key={t.slug}>
                <Link
                  href={`/trip-templates/${t.slug}`}
                  className="group flex h-full flex-col rounded-xl border border-wn-charcoal/10 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-wn-navy/30 hover:shadow-md"
                >
                  <div className="mb-2 flex items-baseline justify-between text-[10px] font-semibold uppercase tracking-[0.15em] text-wn-charcoal/55">
                    <span>{totalDays}-day trip</span>
                    <span>{stopCount} stop{stopCount === 1 ? "" : "s"}</span>
                  </div>
                  <h2 className="text-base font-bold text-wn-navy group-hover:underline">
                    {t.title}
                  </h2>
                  <p className="mt-1 line-clamp-3 flex-1 text-[13px] leading-snug text-wn-charcoal/70">
                    {t.description}
                  </p>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-wn-charcoal/55">
                      From {t.origin.name}
                    </span>
                    <span className="font-semibold text-wn-navy">
                      Use this template →
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
