// Wynla Pro upgrade page. Rewritten in Stage 34 to align with the new
// tier model (lib/tierLimits.ts) — single source of truth for what's
// free vs paid. Page renders for everyone; CTA + content vary by auth +
// subscription state:
//   - signed out          → "Sign in to upgrade" → /login?next=/pro
//   - signed-in free      → "Start your subscription" → Stripe checkout
//   - signed-in Pro       → "You're a Pro" + manage link
//   - Stripe not configured → "Coming soon" banner + disabled CTA
//
// `?from=<gate>` URL param personalizes the hero headline (e.g. arriving
// from the favorites cap shows "Save unlimited resorts" instead of the
// generic "Unlock the full mountain").
//
// Required env vars (set in Vercel before launch):
//   STRIPE_SECRET_KEY              — server only, Production
//   STRIPE_PUBLISHABLE_KEY         — Production + Preview
//   STRIPE_WEBHOOK_SECRET          — set after webhook is registered
//   STRIPE_PRICE_ID_PRO_MONTHLY    — $7/mo price ID from Stripe dashboard
//   STRIPE_PRICE_ID_PRO_YEARLY     — $59/yr price ID from Stripe dashboard

import Link from "next/link";
import type { Metadata } from "next";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isProUser, isStripeConfigured } from "@/lib/pro";
import {
  FREE_LIMITS,
  LIMIT_LABELS,
  UPSELL_TAGLINES,
  type TierLimitKey,
} from "@/lib/tierLimits";
import UpgradeCta from "./UpgradeCta";
import AutoStartCheckout from "./AutoStartCheckout";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Wynla Pro — Plan your best ski season",
  description:
    "Unlock unlimited trips, alerts, favorites, and the Powder Day Score. 7-day free trial. $7/mo or $59/year.",
  alternates: { canonical: "/pro" },
};

// Comparison-table rows. Each row is one capability shown side-by-side.
// Free copy comes from LIMIT_LABELS (single source of truth); Pro copy
// extended for the marketing surface.
const COMPARISON_ROWS: { feature: string; free: string; pro: string; bonus?: boolean }[] = [
  {
    feature: "451 US ski resorts on one map",
    free: "✓ All resorts, every filter",
    pro: "✓ All resorts, every filter",
  },
  {
    feature: "Lift tickets + lodging links (Booking, Airbnb)",
    free: "✓ Direct external links",
    pro: "✓ Direct external links",
  },
  {
    feature: "Multi-stop trip planner",
    free: "✓ Plan unlimited drafts",
    pro: "✓ Plan unlimited drafts",
  },
  {
    feature: "Saved trips",
    free: LIMIT_LABELS.savedTrips.free,
    pro: LIMIT_LABELS.savedTrips.pro,
  },
  {
    feature: "Compare resorts side-by-side",
    free: LIMIT_LABELS.compare.free,
    pro: LIMIT_LABELS.compare.pro,
  },
  {
    feature: "Saved favorite resorts",
    free: LIMIT_LABELS.favorites.free,
    pro: LIMIT_LABELS.favorites.pro,
  },
  {
    feature: "Snow alerts (push)",
    free: LIMIT_LABELS.snowAlerts.free,
    pro: LIMIT_LABELS.snowAlerts.pro,
  },
  {
    feature: "Custom home origins",
    free: LIMIT_LABELS.origins.free,
    pro: LIMIT_LABELS.origins.pro,
  },
  {
    feature: "Powder Day Score 0-100",
    free: "—",
    pro: "✓ Forecast-based",
    bonus: true,
  },
  {
    feature: "Historical snow data",
    free: "—",
    pro: "✓ Last 5 winters",
    bonus: true,
  },
  {
    feature: "Multi-pass optimizer",
    free: "—",
    pro: "✓ Ikon vs Epic vs Indy",
    bonus: true,
  },
  {
    feature: "Trip PDF + calendar export (.ics)",
    free: "—",
    pro: "✓ Apple / Google / Outlook",
    bonus: true,
  },
  {
    feature: "Weekly email digest",
    free: "—",
    pro: "✓ Personalized",
    bonus: true,
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Can I cancel anytime?",
    a: "Yes — open /account/pro, hit Manage payment method, and cancel from the Stripe portal. Your Pro features stay active until the end of the billing period you've already paid for.",
  },
  {
    q: "Is the 7-day trial really free?",
    a: "Yes. Card is required (Stripe), but you're not charged until day 8. Cancel before then and you pay $0.",
  },
  {
    q: "Will an iOS app be available?",
    a: "Yes — a native iPhone wrap is on the roadmap for fall 2026. Pro carries over: same subscription, same login.",
  },
  {
    q: "What happens to my saved trips if I cancel?",
    a: "They stay on your account. If you re-subscribe later, everything is exactly where you left it. Free tier just caps you at the first 2.",
  },
  {
    q: "Do you sell my data?",
    a: "No. Wynla is a paid product, not an ads business. We don't sell or share your trip history, location, or alerts.",
  },
];

export default async function ProPage(props: {
  searchParams: Promise<{
    canceled?: string;
    from?: string;
    autostart?: string;
  }>;
}) {
  const sp = await props.searchParams;
  const canceled = sp.canceled === "1";
  const fromGate = isValidGate(sp.from) ? (sp.from as TierLimitKey) : null;
  // Non-tier upsell sources (e.g. the Powder Day Score teaser on resort
  // detail) personalize the hero but don't map to a TierLimitKey.
  const fromFeature: "powderScore" | null =
    sp.from === "powderScore" ? "powderScore" : null;
  const autostart: "month" | "year" | null =
    sp.autostart === "month" || sp.autostart === "year" ? sp.autostart : null;

  const supabase = await createSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  const isPro = await isProUser(user?.id);
  const configured = isStripeConfigured();

  // Resume an interrupted checkout: when the user arrives back from
  // /login?next=/pro?autostart=<interval>, fire the Stripe session
  // automatically. Guard so we don't auto-charge existing Pros or fire
  // before Stripe is configured.
  const shouldAutoStart =
    autostart !== null && Boolean(user) && !isPro && configured;

  const headline = fromGate
    ? UPSELL_TAGLINES[fromGate]
    : fromFeature === "powderScore"
      ? "Know the powder day before everyone else."
      : "Plan your best ski season yet.";
  const subheadline = fromGate
    ? "Pro lifts every limit + adds the features serious skiers use to chase storms."
    : fromFeature === "powderScore"
      ? "Pro unlocks the 0-100 Powder Day Score, historical snow, and snow alerts for every favorite."
      : "Everything you need to chase storms, plan deeper trips, and never miss a powder day.";

  return (
    <main
      id="main-content"
      className="min-h-dvh bg-wn-offwhite px-4 py-10 sm:px-6 sm:py-16"
    >
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

        {shouldAutoStart && autostart && (
          <AutoStartCheckout interval={autostart} />
        )}

        {!configured && (
          <div className="mt-4 rounded-lg border border-wn-sky/30 bg-wn-sky/10 px-3 py-2 text-sm text-wn-navy">
            Coming soon — Pro tier launches when payments are configured.
          </div>
        )}

        {/* HERO */}
        <header className="mt-6 mb-8 text-center sm:mt-8 sm:mb-10">
          <span className="inline-flex items-center rounded bg-wn-gold/95 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-wn-navy">
            ✨ Wynla Pro
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-wn-navy sm:text-5xl">
            {headline}
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-wn-charcoal/75 sm:text-base">
            {subheadline}
          </p>
          <p className="mt-4 text-xs text-wn-charcoal/55">
            7-day free trial · $7/mo or $59/year (save 30%) · cancel anytime
          </p>
        </header>

        {/* PRICING */}
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
              className="mt-3 inline-flex h-11 items-center justify-center rounded-md bg-wn-navy px-4 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
            >
              Manage subscription
            </Link>
          </div>
        )}

        {/* COMPARISON TABLE */}
        <section className="mb-10 overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm">
          <div className="border-b border-wn-charcoal/10 bg-wn-offwhite px-5 py-3">
            <h2 className="text-base font-bold text-wn-navy">
              Free vs Pro
            </h2>
            <p className="mt-1 text-xs text-wn-charcoal/60">
              Free is generous — the gates kick in only when you start using
              Wynla like a planner.
            </p>
          </div>
          <div className="hidden grid-cols-[1.6fr_1fr_1fr] gap-px bg-wn-charcoal/10 text-[11px] font-bold uppercase tracking-wider text-wn-charcoal/55 sm:grid">
            <div className="bg-white px-5 py-2.5">Feature</div>
            <div className="bg-white px-5 py-2.5 text-center">Free</div>
            <div className="bg-white px-5 py-2.5 text-center">Pro</div>
          </div>
          <ul className="divide-y divide-wn-charcoal/10">
            {COMPARISON_ROWS.map((row) => (
              <li
                key={row.feature}
                className="grid grid-cols-1 gap-1 px-5 py-3 sm:grid-cols-[1.6fr_1fr_1fr] sm:items-center sm:gap-0"
              >
                <div className="text-sm font-semibold text-wn-navy">
                  {row.feature}
                  {row.bonus && (
                    <span className="ml-2 inline-flex items-center rounded bg-wn-gold/20 px-1.5 py-0.5 align-middle text-[9px] font-bold uppercase tracking-wider text-wn-navy">
                      Pro only
                    </span>
                  )}
                </div>
                <div className="text-xs text-wn-charcoal/70 sm:text-center">
                  <span className="sm:hidden">Free: </span>
                  {row.free}
                </div>
                <div className="text-xs font-semibold text-wn-navy sm:text-center">
                  <span className="sm:hidden">Pro: </span>
                  {row.pro}
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* WHY PRO */}
        <section className="mb-10 rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-bold text-wn-navy">
            Built for the way real skiers plan
          </h2>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <WhyTile
              icon="🌨️"
              title="Powder Day Score"
              body="One 0–100 number that combines next-24h snow, base depth, wind, and forecast. Sort the map by it during storm cycles."
            />
            <WhyTile
              icon="🎟️"
              title="Multi-pass optimizer"
              body="Tell us your planned trips. We tell you whether Ikon Base, Epic Local, Indy, or Mountain Collective actually pays back — with day-by-day math."
            />
            <WhyTile
              icon="❄️"
              title="Alerts for every favorite"
              body={`Free tier alerts ${FREE_LIMITS.snowAlerts} resort. Pro alerts every favorite with a custom threshold per mountain — "ping me when Alta gets 8 in".`}
            />
            <WhyTile
              icon="📅"
              title="Export trips you'll actually use"
              body=".ics for Apple / Google calendar. PDF for sharing with the crew. Printable day-by-day for the gear bag."
            />
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-10 rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-4 text-base font-bold text-wn-navy">
            Common questions
          </h2>
          <ul className="space-y-4">
            {FAQ.map((row) => (
              <li key={row.q}>
                <div className="text-sm font-semibold text-wn-navy">
                  {row.q}
                </div>
                <p className="mt-1 text-xs text-wn-charcoal/70 sm:text-sm">
                  {row.a}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <p className="text-center text-xs text-wn-charcoal/55">
          Wynla is a paid product, not an ad business. Your data stays yours.
        </p>
      </div>
    </main>
  );
}

function isValidGate(s: string | undefined): boolean {
  if (!s) return false;
  return (
    s === "compare" ||
    s === "favorites" ||
    s === "snowAlerts" ||
    s === "savedTrips" ||
    s === "origins"
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
            href={`/login?next=${encodeURIComponent(`/pro?autostart=${interval}`)}`}
            className={`block w-full rounded-md px-4 py-2.5 text-center text-sm font-semibold transition ${
              featured
                ? "bg-wn-navy text-white hover:bg-wn-navy/90"
                : "border border-wn-navy text-wn-navy hover:bg-wn-navy/5"
            }`}
          >
            Start free trial
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

function WhyTile({
  icon,
  title,
  body,
}: {
  icon: string;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-3">
      <span aria-hidden="true" className="text-2xl leading-tight">
        {icon}
      </span>
      <div>
        <div className="text-sm font-bold text-wn-navy">{title}</div>
        <p className="mt-1 text-xs text-wn-charcoal/70">{body}</p>
      </div>
    </li>
  );
}
