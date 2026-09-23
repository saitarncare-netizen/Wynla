// Pass deals tracker — static, hand-curated page listing current pricing
// for the four major multi-resort season passes. NOT scraped: PASS_DEALS
// below is updated by hand, and every card shows the date it was last
// checked so the page never implies a freshness it does not have.
//
// Why static? Pass pricing changes a few times a year (early-bird tiers
// step up around Sep / Oct / Nov). Maintaining a scraper for four sites
// is more work than an occasional hand-update, and we want to put our own
// editorial framing around "how to choose" anyway.
//
// UPDATE PROCEDURE (takes ten minutes):
//   1. Open each `sourceUrl` below and copy the adult "from" prices.
//   2. Set `checkedOn` to today and `nextIncrease` only if the operator
//      has PUBLISHED a date (never guess one — leave it undefined).
//   3. Keep the source URLs in the comments accurate.

import Link from "next/link";
import type { Metadata } from "next";
import { passColor, passLabel, type Pass } from "@/lib/passColors";

// ISR so the "more than a month ago" staleness note and the next-increase
// countdown are re-evaluated daily instead of frozen at build time.
export const revalidate = 86400; // 24h

export const metadata: Metadata = {
  // Title template in app/layout.tsx already appends " · Wynla". Don't
  // duplicate it here.
  title: "Pass deals — 2026-27 season",
  description:
    "Current published prices for the Ikon, Epic, Indy and Mountain Collective passes, hand-checked against each operator's site, in one place.",
  alternates: { canonical: "/deals" },
  openGraph: {
    title: "Pass deals — 2026-27 season · Wynla",
    description:
      "Current published prices for the Ikon, Epic, Indy and Mountain Collective passes, in one place.",
    url: "/deals",
    images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "Wynla — US ski resort map" }],
  },
};

type PassTier = {
  name: string;
  /** Adult "from" price in whole US dollars, as published by the operator. */
  price: number;
  currency: "USD";
};

type PassDeal = {
  pass: Pass;
  label: string;
  tagline: string;
  tiers: PassTier[];
  url: string;
  /** ISO date we last opened the operator's site and copied the prices. */
  checkedOn: string;
  /** ISO date the operator has PUBLISHED as the next price step-up. Leave
      undefined when they have not announced one — never estimate. */
  nextIncrease?: string;
  /** One line of context on where the current price sits in the season. */
  priceNote: string;
  /** Set when the pass is sold out for the upcoming season. Renders a
      SOLD OUT badge in place of the price + disables the buy CTA. */
  soldOut?: { reason: string; waitlistUrl?: string };
};

// Prices checked 2026-09-23 against the operators' own pages (plus one
// trade-press source where the operator page sits behind a queue). Each
// entry cites where its numbers came from.
const PASS_DEALS: PassDeal[] = [
  {
    pass: "ikon",
    label: "Ikon Pass 2026-27",
    tagline: "Aspen, Big Sky, Jackson Hole, 50+ destinations worldwide.",
    // Source: https://www.ikonpass.com/en/shop-passes/ikon-pass ("From $1,449",
    // age 23+), https://www.ikonpass.com/en/shop-passes/ikon-base-pass
    // ("From $1,019"), https://www.ikonpass.com/en/shop-passes/ikon-session-pass
    // ("From $319", 2-day). Launch price in March was $1,349 renew / $1,399
    // new; Ikon steps up through fall and goes off sale in December but
    // does not publish the step-up dates.
    tiers: [
      { name: "Ikon Pass (adult 23+)", price: 1449, currency: "USD" },
      { name: "Ikon Base Pass (adult 23+)", price: 1019, currency: "USD" },
      { name: "Ikon Session Pass (2-day, adult)", price: 319, currency: "USD" },
    ],
    url: "https://www.ikonpass.com/en/shop-passes/ikon-pass",
    checkedOn: "2026-09-23",
    priceNote:
      "Up from $1,349 (renewal) / $1,399 (new) at the March launch. Ikon raises prices through the fall without announcing dates and stops selling in December.",
  },
  {
    pass: "epic",
    label: "Epic Pass 2026-27",
    tagline: "Vail, Whistler, Park City, Breckenridge, 40+ resorts on one pass.",
    // Source: https://www.epicpass.com/passes/epic-pass.aspx sits behind
    // Vail Resorts' queue page (waitingroom.snow.com) for automated
    // fetches, so the post-September-7 prices are taken from
    // https://www.onthesnow.com/news/epic-pass-buyers-guide/ (updated
    // 2026-09-10: Epic $1,145, Epic Local $849, Epic Day Pass 7-day $701)
    // and https://www.epicorikon.com/news/epic-pass-prices-increasing-september-2026
    // (same figures). Launch prices in March were $1,089 / $809.
    tiers: [
      { name: "Epic Pass (adult 31+)", price: 1145, currency: "USD" },
      { name: "Epic Local Pass (adult 31+)", price: 849, currency: "USD" },
      { name: "Epic Day Pass (7-day, all resorts, adult)", price: 701, currency: "USD" },
    ],
    url: "https://www.epicpass.com/passes/epic-pass.aspx",
    checkedOn: "2026-09-23",
    priceNote:
      "Stepped up on September 8 from the $1,089 / $809 launch prices. Vail Resorts has not published the next increase date; passes historically go off sale in early December. Ages 13-30 get 20% off.",
  },
  {
    pass: "indy",
    label: "Indy Pass 2026-27",
    tagline: "300+ independent mountains across North America, Europe and Japan.",
    // Source: https://www.indyskipass.com/ ("Indy Pass is currently sold
    // out", "300+ Resorts") and https://www.indyskipass.com/shop/indy-base-pass
    // (public-sale prices: Base $419, Indy+ $469; Add-On from $319).
    tiers: [
      { name: "Indy Base Pass (adult, 2 days each)", price: 419, currency: "USD" },
      { name: "Indy+ Pass (adult, no blackouts)", price: 469, currency: "USD" },
      { name: "Indy Add-On Pass (adult, with a partner season pass)", price: 319, currency: "USD" },
    ],
    url: "https://www.indyskipass.com/",
    checkedOn: "2026-09-23",
    priceNote: "Public-sale prices before the pass sold out.",
    soldOut: {
      reason:
        "The 2026-27 Indy Pass is sold out. Join the waitlist to hear first if more passes are released before winter.",
      // The homepage's own "sign up now" link (checked 2026-09-23). The
      // shorter /waitlist path is a bare Shopify collection with no form.
      waitlistUrl: "https://estore.indyskipass.com/products/waitlist-signup",
    },
  },
  {
    pass: "mountain_collective",
    label: "Mountain Collective 2026-27",
    tagline: "2 days at each of 27 flagship resorts, designed for destination trips.",
    // Source: https://www.mountaincollective.com/ (adult 19+ $729, teen
    // $594, kids $304, "27 destinations", "now on sale for the 26/27
    // season"). The March on-sale announcement listed $669 adult:
    // https://mountaincollective.com/2026-27-mountain-collective-passes-now-on-sale-2/
    tiers: [
      { name: "Adult pass (19+)", price: 729, currency: "USD" },
      { name: "Teen pass", price: 594, currency: "USD" },
      { name: "Kids pass", price: 304, currency: "USD" },
    ],
    url: "https://www.mountaincollective.com/",
    checkedOn: "2026-09-23",
    priceNote:
      "Up from $669 at the March launch. Mountain Collective does not announce step-up dates and sells until it hits capacity.",
  },
];

// A card older than this shows a "prices may have changed" warning so a
// missed hand-update degrades visibly instead of silently.
const STALE_AFTER_DAYS = 30;

function formatPrice(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Has this published step-up date already passed? Used to swap the
 *  "Next increase" microcopy for "Pricing has since stepped up" so we never
 *  show a stale countdown. */
function isPriceEnded(iso: string): boolean {
  const d = new Date(iso + "T00:00:00Z").getTime();
  return Number.isFinite(d) && d < Date.now();
}

function daysSince(iso: string): number {
  const d = new Date(iso + "T00:00:00Z").getTime();
  if (!Number.isFinite(d)) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - d) / 86_400_000);
}

export default function DealsPage() {
  const newestCheck = PASS_DEALS.map((d) => d.checkedOn).sort().at(-1);

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
          {/* Contrast fix: bg-wn-sky/95 + white = 2.41:1 (WCAG fail).
              Navy + white = 14:1. */}
          <span className="inline-flex items-center rounded bg-wn-navy px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            2026-27 pricing
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-wn-navy sm:text-5xl">
            Pass deals — 2026-27 season
          </h1>
          <p className="mt-3 text-sm text-wn-charcoal/75 sm:text-base">
            The four big multi-resort passes, with the adult prices each
            operator publishes on its own site, in one place. We check
            these by hand
            {newestCheck ? ` (last check ${formatDate(newestCheck)})` : ""}
            , so always confirm on the operator&apos;s page before you buy.
          </p>
        </header>

        {/* Pass cards. The h2 keeps the heading order h1 → h2 → h3 for
            screen readers; it is visually hidden because the cards speak
            for themselves. */}
        <h2 className="sr-only">Passes</h2>
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
              body="If you're flying west once or twice per season and want full unlimited days at name-brand mountains, Ikon or Epic pays back in 4-5 ski days. Pick by which resorts you actually want."
            />
            <Tip
              emoji="🪨"
              title="East Coast value → Indy Pass"
              body="Indy stacks 300+ independent mountains for under $500. East Coast skiers who hit a different hill every weekend get more variety than Ikon Base for less than half the price. It sells out, so buy in spring."
            />
            <Tip
              emoji="✈️"
              title="1-2 destination trips → Mountain Collective + day passes"
              body="Two days each at flagships like Alta, Snowbasin and Jackson Hole, with 50% off additional days. Pair it with single-day tickets when you commit to a third resort."
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
          Prices are the adult &quot;from&quot; prices published by each
          pass operator on the date shown on its card. Operators raise
          prices through the fall, sometimes without notice. Wynla is not
          affiliated with any pass operator and earns nothing from these
          links; the operator&apos;s own site is always the final word.
          Epic Pass, Ikon Pass, Indy Pass and Mountain Collective are
          trademarks of their respective owners.
        </p>
      </div>
    </main>
  );
}

function PassCard({ deal }: { deal: PassDeal }) {
  const accent = passColor(deal.pass);
  const headlineTier = deal.tiers[0];
  const isSoldOut = deal.soldOut != null;
  const isStale = daysSince(deal.checkedOn) > STALE_AFTER_DAYS;

  return (
    <article className="overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm transition hover:shadow-md">
      {/* Color strip */}
      <div className="h-2" style={{ backgroundColor: accent }} aria-hidden="true" />

      <div className="p-5">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="text-lg font-extrabold tracking-tight text-wn-navy sm:text-xl">
            {deal.label}
          </h3>
          {isSoldOut ? (
            <span className="inline-block rounded-md bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
              Sold out
            </span>
          ) : (
            <span
              className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{
                backgroundColor: accent,
                color: deal.pass === "ikon" ? "#1E2952" : "#FFFFFF",
              }}
            >
              {passLabel(deal.pass)}
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-wn-charcoal/65 sm:text-sm">
          {deal.tagline}
        </p>

        {isSoldOut ? (
          <>
            <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
              <p className="text-sm font-semibold text-red-900">
                🚫 {deal.soldOut?.reason}
              </p>
            </div>
            <p className="mt-3 text-[11px] text-wn-charcoal/55">
              Last published price {formatPrice(headlineTier.price, headlineTier.currency)}{" "}
              ({headlineTier.name}). {deal.priceNote}
            </p>
            {deal.soldOut?.waitlistUrl && (
              <a
                href={deal.soldOut.waitlistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-wn-charcoal/20 bg-white px-4 py-2.5 text-sm font-semibold text-wn-charcoal/85 transition hover:border-wn-navy hover:text-wn-navy"
              >
                Join the waitlist <span aria-hidden="true">→</span>
              </a>
            )}
          </>
        ) : (
          <>
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
              {deal.nextIncrease
                ? isPriceEnded(deal.nextIncrease)
                  ? "Pricing has since stepped up"
                  : `Next increase ${formatDate(deal.nextIncrease)}`
                : "Next increase date not announced"}
            </p>
            <p className="mt-2 text-[11px] leading-relaxed text-wn-charcoal/60">
              {deal.priceNote}
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
              See current price <span aria-hidden="true">→</span>
            </a>
          </>
        )}

        <p className="mt-3 text-[10px] text-wn-charcoal/45">
          Prices as of {formatDate(deal.checkedOn)}
          {isStale ? " — more than a month ago, so they may have changed" : ""}
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
