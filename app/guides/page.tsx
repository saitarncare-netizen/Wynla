// Stage 8 — Guides index. Lists every editorial guide as a card grid.
// Long-form content with strong internal-link density, designed to rank
// for "ikon vs epic", "best beginner colorado ski resorts", etc.

import type { Metadata } from "next";
import Link from "next/link";
import { GUIDES } from "@/lib/guides";

// ISR — guides are editorial content, rarely changes.
export const revalidate = 86400; // 24h

export const metadata: Metadata = {
  title: "Wynla Guides",
  description:
    "Pass choices, region advice, and trip planning for US skiers and snowboarders.",
  openGraph: {
    title: "Wynla Guides · Pass choices, regions, trip planning",
    description:
      "Long-form guides for ski-trip planners — pass comparisons, regional advice, and first-trip walk-throughs.",
  },
};

export default function GuidesIndexPage() {
  return (
    <main className="min-h-dvh bg-wn-offwhite">
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
            href="/lists"
            className="hidden text-xs font-semibold text-white/85 underline-offset-4 hover:underline sm:inline"
          >
            Curated lists
          </Link>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 sm:pb-14 sm:pt-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            Editorial
          </p>
          <h1 className="text-4xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl">
            Wynla Guides
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/85 sm:text-lg">
            Pass choices, region advice, and trip planning for US skiers and
            snowboarders.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {GUIDES.map((g) => (
            <Link
              key={g.slug}
              href={`/guides/${g.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm transition hover:border-wn-navy/40 hover:shadow-md"
            >
              <div className="h-1.5 w-full bg-wn-navy" aria-hidden="true" />
              <div className="flex-1 p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-wn-charcoal/55">
                  {g.readingMinutes} min read
                </p>
                <h2 className="mt-1 text-lg font-bold leading-tight text-wn-navy sm:text-xl">
                  {g.title}
                </h2>
                <p className="mt-1 text-sm text-wn-charcoal/70">{g.subtitle}</p>
                <p className="mt-3 text-xs leading-relaxed text-wn-charcoal/60">
                  {g.description}
                </p>
                <div className="mt-4 text-xs font-semibold text-wn-navy/70 transition group-hover:text-wn-navy">
                  Read guide →
                </div>
              </div>
            </Link>
          ))}
        </div>

        <section className="rounded-2xl border border-wn-charcoal/10 bg-white p-6 text-center shadow-sm">
          <h3 className="text-lg font-bold text-wn-navy">
            Ready to plan?
          </h3>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            Use the map to build a multi-stop trip across passes and regions.
          </p>
          <Link
            href="/?plan=1"
            className="mt-4 inline-flex items-center gap-1 rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            Plan a trip →
          </Link>
        </section>
      </div>
    </main>
  );
}
