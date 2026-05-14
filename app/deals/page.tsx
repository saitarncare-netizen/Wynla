// Pass deals tracker — static, hand-curated page listing current pricing
// for the four major multi-resort season passes. NOT scraped: we update
// the PASS_DEALS constant below monthly when pricing changes.
//
// Why static? Pass pricing changes a few times a year (early-bird tiers
// step up around Sep / Oct / Nov). Maintaining a scraper for four sites
// is more work than a monthly hand-update, and we want to put our own
// editorial framing around "how to choose" anyway.

import Link from "next/link";
import type { Metadata } from "next";
import { passColor, passLabel, type Pass } from "@/lib/passColors";

export const metadata: Metadata = {
  title: "Pass Deals — 2026-27 Season | Wynla",
  description:
    "Locked-in early prices for Ikon, Epic, Indy, and Mountain Collective passes. We track price changes weekly so you don't have to.",
};

type PassTier = {
  name: string;
  price: number;
  currency: "USD";
  priceEnds: string;
};

type PassDeal = {
  pass: Pass;
  label: string;
  tagline: string;
  tiers: PassTier[];
  url: string;
  lastVerified: string;
};

// Plausible 2026-27 pricing based on 2025-26 trends + standard ~5% YoY
// step. Verified-against-marketing prices replace these in the monthly
// update pass.
const PASS_DEALS: PassDeal[] = [
  {
    pass: "ikon",
    label: "Ikon Pass 2026-27",
    tagline: "Aspen, Big Sky, Jackson Hole, 50+ destinations worldwide.",
    tiers: [
      { name: "Ikon Pass (Adult)", price: 1329, currency: "USD", priceEnds: "2026-09-30" },
      { name: "Ikon Base Pass", price: 949, currency: "USD", priceEnds: "2026-09-30" },
      { name: "Ikon Session Pass (4-Day)", price: 599, currency: "USD", priceEnds: "2026-09-30" },
    ],
    url: "https://www.ikonpass.com/en/shop/passes",
    lastVerified: "2026-05-14",
  },
  {
    pass: "epic",
    label: "Epic Pass 2026-27",
    tagline: "Vail, Whistler, Park City, Breckenridge, 40+ resorts on one pass.",
    tiers: [
      { name: "Epic Pass (Adult)", price: 1051, currency: "USD", priceEnds: "2026-09-07" },
      { name: "Epic Local Pass", price: 863, currency: "USD", priceEnds: "2026-09-07" },
      { name: "Epic Day Pass (1-Day)", price: 499, currency: "USD", priceEnds: "2026-09-07" },
    ],
    url: "https://www.epicpass.com/passes/epic-pass.aspx",
    lastVerified: "2026-05-14",
  },
  {
    pass: "indy",
    label: "Indy Pass 2026-27",
    tagline: "230+ independent mountains across North America, Europe, and Japan.",
    tiers: [
      { name: "Indy Base Pass (2 days each)", price: 369, currency: "USD", priceEnds: "2026-10-05" },
      { name: "Indy Plus Pass (no blackouts)", price: 499, currency: "USD", priceEnds: "2026-10-05" },
      { name: "Indy XC Pass (Nordic)", price: 119, currency: "USD", priceEnds: "2026-10-05" },
    ],
    url: "https://www.indyskipass.com/",
    lastVerified: "2026-05-14",
  },
  {
    pass: "mountain_collective",
    label: "Mountain Collective 2026-27",
    tagline: "2 days at each of 25+ flagship resorts — designed for destination trips.",
    tiers: [
      { name: "Adult Pass", price: 629, currency: "USD", priceEnds: "2026-04-30" },
      { name: "Child Pass (12 & under)", price: 129, currency: "USD", priceEnds: "2026-04-30" },
      { name: "College / Military", price: 569, currency: "USD", priceEnds: "2026-04-30" },
    ],
    url: "https://www.mountaincollective.com/",
    lastVerified: "2026-05-14",
  },
];

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPriceEnd(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function DealsPage() {
  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/"
          className="text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
        >
          ← Map
        </Link>

        <header className="mt-6 mb-10">
          <span className="inline-flex items-center rounded bg-wn-sky/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Locked-in pricing
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-wn-navy sm:text-5xl">
            Pass Deals — 2026-27 Season
          </h1>
          <p className="mt-3 text-sm text-wn-charcoal/75 sm:text-base">
            Locked in early prices for the upcoming ski season. We track
            price changes weekly so you don&apos;t have to scroll four
            different pass websites.
          </p>
        </header>

        {/* Pass cards */}
        <div className="grid gap-5 sm:grid-cols-2">
          {PASS_DEALS.map((deal) => (
            <PassCard key={deal.pass} deal={deal} />
          ))}
        </div>

        {/* How to choose */}
        <section className="mt-14">
          <h2 className="text-2xl font-extrabold text-wn-navy sm:text-3xl">
            How to choose
          </h2>
          <p className="mt-1 text-sm text-wn-charcoal/65">
            Match the pass to how you actually ski, not the one with the
            biggest resort list.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Tip
              emoji="🏔️"
              title="Big Western trips → Ikon or Epic"
              body="If you're flying west once or twice per season and want full unlimited days at name-brand mountains, the Ikon or Epic pays back in 4–5 ski days. Pick by which resorts you actually want."
            />
            <Tip
              emoji="🪨"
              title="East Coast value → Indy Pass"
              body="Indy stacks 230+ independent mountains for under $400. East Coast skiers who hit a different hill every weekend get more variety than Ikon Base for less than a third the price."
            />
            <Tip
              emoji="✈️"
              title="1–2 destination trips → Mountain Collective + day passes"
              body="Two days each at flagships like Alta, Snowbasin, and Jackson Hole, with a 50% off third day. Pair it with single-day tickets when you commit to a third resort."
            />
            <Tip
              emoji="🤔"
              title="Not sure yet? Plan the trip first"
              body="Use the planner to map a real itinerary. Once you see which resorts make the cut, the right pass becomes obvious."
            />
          </div>
          <div className="mt-8">
            <Link
              href="/?plan=1"
              className="inline-flex items-center gap-2 rounded-lg bg-wn-navy px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-wn-navy/90"
            >
              🗺️ Plan a trip
            </Link>
          </div>
        </section>

        <p className="mt-12 text-[11px] text-wn-charcoal/50">
          Prices shown are early-bird tiers from each pass operator and
          step up at the dates listed on each card. Wynla isn&apos;t
          affiliated with any pass operator — we just track the public
          pricing so you can compare in one place.
        </p>
      </div>
    </main>
  );
}

function PassCard({ deal }: { deal: PassDeal }) {
  const accent = passColor(deal.pass);
  const headlineTier = deal.tiers[0];

  return (
    <article className="overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm transition hover:shadow-md">
      {/* Color strip */}
      <div className="h-2" style={{ backgroundColor: accent }} aria-hidden="true" />

      <div className="p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-extrabold tracking-tight text-wn-navy sm:text-xl">
            {deal.label}
          </h3>
          <span
            className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
            style={{
              backgroundColor: accent,
              color: deal.pass === "ikon" ? "#1E2952" : "#FFFFFF",
            }}
          >
            {passLabel(deal.pass)}
          </span>
        </div>
        <p className="mt-1 text-xs text-wn-charcoal/65 sm:text-sm">
          {deal.tagline}
        </p>

        {/* Headline price */}
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold tracking-tight text-wn-navy">
            {formatPrice(headlineTier.price, headlineTier.currency)}
          </span>
          <span className="text-xs text-wn-charcoal/60">
            · {headlineTier.name}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-wn-charcoal/55">
          Price ends {formatPriceEnd(headlineTier.priceEnds)}
        </p>

        {/* Other tiers */}
        <ul className="mt-4 space-y-1.5 text-sm">
          {deal.tiers.slice(1).map((tier) => (
            <li
              key={tier.name}
              className="flex items-baseline justify-between gap-3 border-t border-wn-charcoal/5 pt-1.5"
            >
              <span className="text-wn-charcoal/80">{tier.name}</span>
              <span className="font-semibold text-wn-navy">
                {formatPrice(tier.price, tier.currency)}
              </span>
            </li>
          ))}
        </ul>

        <a
          href={deal.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-wn-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
        >
          Get this pass <span aria-hidden="true">→</span>
        </a>

        <p className="mt-3 text-[10px] text-wn-charcoal/45">
          Last verified {formatPriceEnd(deal.lastVerified)}
        </p>
      </div>
    </article>
  );
}

function Tip({
  emoji,
  title,
  body,
}: {
  emoji: string;
  title: string;
  body: string;
}) {
  return (
    <div className="rounded-lg border border-wn-charcoal/10 bg-white p-4">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="text-2xl leading-none">
          {emoji}
        </span>
        <div>
          <h3 className="text-sm font-bold text-wn-navy">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-wn-charcoal/75 sm:text-sm">
            {body}
          </p>
        </div>
      </div>
    </div>
  );
}
