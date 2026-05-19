// Wynla Pro upgrade page — REPLACED for Inaugural Season 2026.
//
// During the "Founder Season" (Nov 2026 – Apr 2027) Wynla is free for
// everyone, no Pro tier visible. This page used to be the full
// pricing/comparison/FAQ surface; now it's a single placeholder card
// that points users to the inaugural-season story + the waitlist.
//
// The full Stage 35 page (pricing cards, Stripe checkout, comparison
// table, FAQ) is preserved in git history. To restore for Season 2:
// `git show <stage-35-commit>:app/pro/page.tsx > app/pro/page.tsx`.

import Link from "next/link";
import type { Metadata } from "next";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Wynla Pro — Coming Season 2",
  description:
    "Wynla is free during the inaugural 2026–27 season. Paid plans launch Season 2. Waitlist members lock in founder pricing.",
  alternates: { canonical: "/pro" },
};

export default function ProPage() {
  return (
    <main
      id="main-content"
      className="min-h-dvh bg-wn-offwhite px-4 py-12 sm:px-6 sm:py-20"
    >
      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
        >
          ← Map
        </Link>

        <div className="mt-6 rounded-2xl border border-wn-charcoal/10 bg-white p-6 shadow-sm sm:p-8">
          <span className="inline-flex items-center rounded bg-wn-gold/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-wn-navy">
            Inaugural Season 2026
          </span>
          <h1 className="mt-4 text-2xl font-extrabold text-wn-navy sm:text-4xl">
            Free for everyone, all season.
          </h1>
          <p className="mt-3 text-sm text-wn-charcoal/75 sm:text-base">
            Wynla is built for skiers and snowboarders, and our first
            season (November 2026 – April 2027) is on the house. Every
            feature — the map, trip planner, snow surface forecast,
            favorites, alerts — is unlocked, no credit card, no trial
            countdown.
          </p>
          <p className="mt-3 text-sm text-wn-charcoal/75 sm:text-base">
            Paid plans return for Season 2. Anyone who joins the
            waitlist now becomes a <strong>Founder Member</strong> and
            locks in a special founder rate forever — never disclosed
            publicly, only sent in the welcome email.
          </p>

          <Link
            href="/early"
            className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-md bg-wn-navy px-4 text-sm font-bold text-white shadow-sm transition hover:bg-wn-navy/90 sm:w-auto sm:px-6"
          >
            Join the waitlist →
          </Link>

          <p className="mt-4 text-[11px] text-wn-charcoal/55">
            Already on the waitlist? You&apos;re in. We&apos;ll email
            you the morning Wynla opens for Season 1.
          </p>
        </div>
      </div>
    </main>
  );
}
