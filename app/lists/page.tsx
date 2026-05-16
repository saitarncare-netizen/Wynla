// Stage 8 — Curated lists directory. Browsable index of hand-curated
// resort lists (powder paradise, beginner-friendly, etc.). Each card
// links to /lists/[slug].

import type { Metadata } from "next";
import Link from "next/link";
import { LISTS } from "@/lib/lists";

// ISR — list directory rarely changes, hourly is plenty.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Curated Ski Resort Lists",
  description:
    "Hand-picked resort lists for specific trips, skill levels, and passes.",
  openGraph: {
    title: "Curated Ski Resort Lists · Wynla",
    description:
      "Hand-picked resort lists for specific trips, skill levels, and passes.",
  },
};

export default function ListsIndexPage() {
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
            href="/guides"
            className="hidden text-xs font-semibold text-white/85 underline-offset-4 hover:underline sm:inline"
          >
            Guides
          </Link>
        </div>

        <div className="relative z-10 mx-auto max-w-5xl px-4 pb-12 pt-6 sm:px-6 sm:pb-14 sm:pt-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/65">
            Lists
          </p>
          <h1 className="text-4xl font-extrabold leading-[0.95] tracking-tight text-white sm:text-6xl">
            Curated Lists
          </h1>
          <p className="mt-3 max-w-2xl text-base text-white/85 sm:text-lg">
            Hand-picked resorts for specific trips and skill levels.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-12">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {LISTS.map((l) => (
            <Link
              key={l.slug}
              href={`/lists/${l.slug}`}
              className="group flex flex-col overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm transition hover:border-wn-navy/40 hover:shadow-md"
            >
              <div
                className="h-1.5 w-full"
                style={{ backgroundColor: l.accent ?? "#1E2952" }}
                aria-hidden="true"
              />
              <div className="flex-1 p-4 sm:p-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-wn-charcoal/55">
                  {l.resortSlugs.length} resorts
                </p>
                <h2 className="mt-1 text-base font-bold leading-tight text-wn-navy sm:text-lg">
                  {l.title}
                </h2>
                <p className="mt-1 text-xs text-wn-charcoal/70">{l.subtitle}</p>
                <div className="mt-3 text-xs font-semibold text-wn-navy/70 transition group-hover:text-wn-navy">
                  Open list →
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
