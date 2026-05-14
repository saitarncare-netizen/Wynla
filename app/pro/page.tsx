// Wynla Pro upgrade page. The page renders for everyone; the CTA
// varies by auth + subscription state:
//   - signed out          → "Sign in to upgrade" → /login?next=/pro
//   - signed-in free      → "Start your subscription" (client component)
//   - signed-in Pro       → "You're a Pro" + link to /account/pro
//   - Stripe not configured → "Coming soon" banner + disabled CTA
//
// Required env vars (set in Vercel before launch):
//   STRIPE_SECRET_KEY              — server only, Production
//   STRIPE_PUBLISHABLE_KEY         — Production + Preview
//   STRIPE_WEBHOOK_SECRET          — set after webhook is registered
//   STRIPE_PRICE_ID_PRO_MONTHLY    — $7/mo price ID from Stripe dashboard
//   STRIPE_PRICE_ID_PRO_YEARLY     — $59/yr price ID from Stripe dashboard

import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isProUser, isStripeConfigured } from "@/lib/pro";
import UpgradeCta from "./UpgradeCta";

export const dynamic = "force-dynamic";

const FEATURES: { icon: string; title: string; body: string }[] = [
  {
    icon: "❄️",
    title: "Real-time snow alerts",
    body: "Free: daily roll-up. Pro: instant push per resort, threshold per favorite.",
  },
  {
    icon: "🔍",
    title: "Compare up to 5 resorts",
    body: "Free: 2 at a time. Pro: 5 side-by-side with full stat coverage.",
  },
  {
    icon: "📊",
    title: "Historical snow data",
    body: "Pro: last 3 seasons of daily snowfall, base depth, and storm cycles.",
  },
  {
    icon: "🎟️",
    title: "Trip cost calculator",
    body: "Real-time lift, lodging, and gas estimates pulled into every itinerary.",
  },
  {
    icon: "🚫",
    title: "Ad-free experience",
    body: "Wynla stays a planner. Pro keeps it that way as we grow.",
  },
  {
    icon: "🏔️",
    title: "Unlimited saved trips",
    body: "Free: 3 trips. Pro: unlimited, with folders and notes.",
  },
  {
    icon: "🌐",
    title: "Custom origin list",
    body: "Free: 4 cities. Pro: unlimited, plus full ZIP / lat-lng support.",
  },
  {
    icon: "📅",
    title: ".ics calendar export",
    body: "Send any trip straight into Apple, Google, or Outlook calendar.",
  },
  {
    icon: "🛏️",
    title: "Direct booking links",
    body: "Pro: priority access to partner discounts on lift tickets and lodging.",
  },
];

export default async function ProPage(props: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const sp = await props.searchParams;
  const canceled = sp.canceled === "1";

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const isPro = await isProUser(user?.id);
  const configured = isStripeConfigured();

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/"
          className="text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
        >
          ← Map
        </Link>

        {canceled && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Checkout canceled. No charges made.
          </div>
        )}

        {!configured && (
          <div className="mt-4 rounded-lg border border-wn-sky/30 bg-wn-sky/10 px-3 py-2 text-sm text-wn-navy">
            Coming soon — Pro tier launches when payments are configured.
          </div>
        )}

        <header className="mt-6 mb-8 text-center sm:mt-8 sm:mb-10">
          <span className="inline-flex items-center rounded bg-wn-gold/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-wn-navy">
            ✨ Wynla Pro
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-wn-navy sm:text-5xl">
            Unlock the full mountain.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-wn-charcoal/75 sm:text-base">
            Everything you need to chase storms, plan deeper trips, and never
            miss a powder day.
          </p>
        </header>

        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <PriceCard
            badge={null}
            interval="month"
            price="$7"
            cadence="/month"
            sub="Billed monthly. Cancel anytime."
            isPro={isPro}
            signedIn={Boolean(user)}
            configured={configured}
          />
          <PriceCard
            badge="Best value — save 30%"
            interval="year"
            price="$59"
            cadence="/year"
            sub="Two months free vs monthly. Cancel anytime."
            isPro={isPro}
            signedIn={Boolean(user)}
            configured={configured}
          />
        </section>

        {isPro && (
          <div className="mb-8 rounded-xl border border-wn-navy/15 bg-white p-5 text-center shadow-sm">
            <div className="text-lg font-bold text-wn-navy">
              You&apos;re a Pro 💎
            </div>
            <p className="mt-1 text-sm text-wn-charcoal/70">
              Thanks for backing Wynla. All features below are unlocked.
            </p>
            <Link
              href="/account/pro"
              className="mt-3 inline-flex rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
            >
              Manage subscription
            </Link>
          </div>
        )}

        <section className="mb-10 rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-bold text-wn-navy">
            What&apos;s included
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f.title} className="flex gap-2">
                <span aria-hidden className="text-lg leading-tight">
                  {f.icon}
                </span>
                <div>
                  <div className="text-sm font-semibold text-wn-navy">
                    <span aria-hidden className="mr-1 text-emerald-600">
                      ✓
                    </span>
                    {f.title}
                  </div>
                  <div className="text-xs text-wn-charcoal/70">{f.body}</div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-center text-xs text-wn-charcoal/55">
          Cancel anytime. 7-day free trial.
        </p>
      </div>
    </main>
  );
}

function PriceCard({
  badge,
  interval,
  price,
  cadence,
  sub,
  isPro,
  signedIn,
  configured,
}: {
  badge: string | null;
  interval: "month" | "year";
  price: string;
  cadence: string;
  sub: string;
  isPro: boolean;
  signedIn: boolean;
  configured: boolean;
}) {
  const featured = interval === "year";
  return (
    <div
      className={`relative flex flex-col rounded-xl border bg-white p-5 shadow-sm sm:p-6 ${
        featured
          ? "border-wn-gold ring-2 ring-wn-gold/40"
          : "border-wn-charcoal/15"
      }`}
    >
      {badge && (
        <span className="absolute -top-3 left-4 inline-flex items-center rounded bg-wn-gold px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-wn-navy">
          {badge}
        </span>
      )}
      <div className="text-xs font-semibold uppercase tracking-wider text-wn-charcoal/60">
        {interval === "year" ? "Yearly" : "Monthly"}
      </div>
      <div className="mt-1 flex items-baseline gap-1">
        <span className="text-4xl font-extrabold text-wn-navy">{price}</span>
        <span className="text-sm text-wn-charcoal/70">{cadence}</span>
      </div>
      <p className="mt-1 text-xs text-wn-charcoal/65">{sub}</p>

      <div className="mt-4">
        {isPro ? (
          <Link
            href="/account/pro"
            className="block w-full rounded-md border border-wn-navy bg-white px-4 py-2.5 text-center text-sm font-semibold text-wn-navy transition hover:bg-wn-navy/5"
          >
            Manage subscription
          </Link>
        ) : !signedIn ? (
          <Link
            href="/login?next=/pro"
            className={`block w-full rounded-md px-4 py-2.5 text-center text-sm font-semibold transition ${
              featured
                ? "bg-wn-navy text-white hover:bg-wn-navy/90"
                : "border border-wn-navy text-wn-navy hover:bg-wn-navy/5"
            }`}
          >
            Sign in to upgrade
          </Link>
        ) : !configured ? (
          <button
            type="button"
            disabled
            className="block w-full cursor-not-allowed rounded-md bg-wn-charcoal/20 px-4 py-2.5 text-center text-sm font-semibold text-wn-charcoal/60"
          >
            Coming soon
          </button>
        ) : (
          <UpgradeCta interval={interval} featured={featured} />
        )}
      </div>
    </div>
  );
}
