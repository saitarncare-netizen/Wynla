// Inaugural Season 2026 — /early waitlist landing page.
//
// Server component. Reads the current Founder Member count via the
// service role (RLS allows public INSERT but not SELECT on
// pro_waitlist) and renders the hero + founder pitch + signup form.
//
// IMPORTANT — copy never quotes the actual founder price. We tell
// visitors there's a "special founder rate, locked forever" and let
// the welcome email surprise them with the number after they sign up.
// This is intentional positioning: keeps the price out of public
// search archives, creates a small dose of mystery, and makes the
// welcome email feel like an actual reward for being early.

import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import EarlySignupForm from "./EarlySignupForm";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Wynla — Founder Members get early access",
  description:
    "Wynla opens free for the inaugural 2026-27 ski season. Founder Members keep a special founder rate locked forever for Season 2 and beyond.",
  alternates: { canonical: "/early" },
  openGraph: {
    title: "Wynla — Founder Members",
    description:
      "Free inaugural season. Founder pricing locked forever for early members.",
    url: "/early",
  },
};

async function fetchFounderCount(): Promise<number | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  try {
    const sb = createClient(url, key, { auth: { persistSession: false } });
    const { count, error } = await sb
      .from("pro_waitlist")
      .select("id", { count: "exact", head: true })
      .eq("source", "founder");
    if (error) return null;
    return count ?? 0;
  } catch {
    return null;
  }
}

export default async function EarlyPage() {
  const count = await fetchFounderCount();

  return (
    <main
      id="main-content"
      className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6 sm:py-16"
    >
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
        >
          ← Back to map
        </Link>

        {/* HERO */}
        <header className="mt-6 sm:mt-8">
          <span className="inline-flex items-center rounded bg-wn-gold/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-wn-navy">
            Inaugural Season · Nov 2026
          </span>
          <h1 className="mt-4 text-3xl font-extrabold leading-tight text-wn-navy sm:text-5xl">
            Free for the whole inaugural season.
          </h1>
          <p className="mt-3 text-base text-wn-charcoal/75 sm:text-lg">
            Wynla is the ski + snowboard trip planner I&apos;m building
            for the 2026–27 season. One beautiful map of every US
            resort, with weather, drive time, and a first-of-its-kind
            <strong> snow surface forecast</strong> that tells you what
            the snow will actually feel like under your edges.
          </p>
        </header>

        {/* FOUNDER PITCH */}
        <section className="mt-8 rounded-2xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-7">
          <div className="space-y-3 text-sm text-wn-charcoal/85 sm:text-base">
            <p>
              <strong className="text-wn-navy">
                Season 1 (Nov 2026 – Apr 2027) is free for everyone.
              </strong>{" "}
              No card, no trial countdown. I want feedback more than
              revenue right now.
            </p>
            <p>
              <strong className="text-wn-navy">Founder Members</strong>{" "}
              — anyone on this list before launch — get something the
              public never will: a{" "}
              <em>special founder rate, locked forever</em>, the moment
              Wynla goes paid for Season 2. We&apos;ll share the
              number in your welcome email so it stays between us.
            </p>
            <p>
              No catch, no commitment. Skip the season if it&apos;s
              not for you. We just want to build the resort planner
              I&apos;ve always wanted to use, and Founder Members get
              the first look + the lowest price ever.
            </p>
          </div>
        </section>

        {/* SIGNUP FORM */}
        <section className="mt-8">
          <EarlySignupForm initialCount={count} />
          {count != null && count > 0 && (
            <p className="mt-3 text-center text-xs text-wn-charcoal/55">
              <span className="font-bold text-wn-navy">
                {count.toLocaleString()}
              </span>{" "}
              Founder{count === 1 ? "" : "s"} already in.
            </p>
          )}
        </section>

        {/* WHAT YOU'LL GET */}
        <section className="mt-10">
          <h2 className="text-base font-bold text-wn-navy">
            What Founder Members unlock when Wynla opens
          </h2>
          <ul className="mt-3 space-y-2 text-sm text-wn-charcoal/80">
            <Bullet>
              <strong>Free, full access</strong> to all 451 US resorts
              for the inaugural season — favorites, alerts, trip
              planner, every filter.
            </Bullet>
            <Bullet>
              <strong>Snow Surface Forecast</strong> for every resort
              on the map — powder, packed powder, machine-groomed,
              icy, and the four other US-standard surface classes,
              with a 3-day outlook.
            </Bullet>
            <Bullet>
              <strong>Founder rate locked forever</strong> when paid
              plans launch for Season 2 — disclosed in the welcome
              email, never on the public site.
            </Bullet>
            <Bullet>
              <strong>First-look access</strong> to new features as we
              ship them. You&apos;ll see the snow forecast,
              multi-pass optimizer, and trip exports before anyone
              else.
            </Bullet>
          </ul>
        </section>

        {/* TRUST FOOTER */}
        <footer className="mt-12 text-xs text-wn-charcoal/55">
          <p>
            Wynla is built by Saitarn — a solo snowboarder/founder. No
            ads, no data sales. Just a tool I wanted to exist.
          </p>
        </footer>
      </div>
    </main>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex gap-2.5">
      <span
        aria-hidden="true"
        className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-wn-gold/30 text-[10px] font-bold text-wn-navy"
      >
        ✓
      </span>
      <span>{children}</span>
    </li>
  );
}
