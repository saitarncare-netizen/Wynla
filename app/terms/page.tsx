// Terms of Service — plain-English contract between Wynla and the
// person using it. Stage 35 prerequisite for App Store submission.
//
// Honest tone: this is an early-stage solo-founder product, not a
// Fortune-500 SaaS. Don't promise SLAs, dedicated support reps, or
// indemnification we can't actually offer.
//
// TODO (post-incorporation): replace "Wynla (operated by Saitarn Care)"
// with the registered US legal entity name, and fill in the governing-
// law section with the actual state of incorporation (likely Delaware
// via Stripe Atlas) plus the venue clause once the LLC is formed.

import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The rules for using Wynla. Plain English — what you agree to when you sign in or subscribe.",
  alternates: { canonical: "/terms" },
};

const LAST_UPDATED = "May 16, 2026";

export default function TermsPage() {
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

        <header className="mt-6 mb-8 sm:mt-8 sm:mb-10">
          <span className="inline-flex items-center rounded bg-wn-navy/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-wn-navy">
            Legal
          </span>
          <h1 className="mt-3 text-3xl font-extrabold text-wn-navy sm:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-2 text-xs text-wn-charcoal/55">
            Last updated: {LAST_UPDATED}
          </p>
          <p className="mt-4 text-sm text-wn-charcoal/75 sm:text-base">
            Wynla is a US ski and snowboard trip planning service. These
            terms keep things clear for everyone using the product. If
            anything is unclear, reach the team at{" "}
            <a
              href="mailto:hello@wynla.app"
              className="font-semibold text-wn-navy underline hover:no-underline"
            >
              hello@wynla.app
            </a>
            .
          </p>
        </header>

        <Section title="Acceptance">
          <p>
            By signing in, creating a trip, posting a review, or
            subscribing to Pro, you agree to these terms. If you
            don&apos;t agree, please do not use Wynla. These terms may
            be updated over time (see &quot;Changes&quot; below).
          </p>
        </Section>

        <Section title="Who runs this">
          <p>
            Wynla is an early-stage product operated by an independent
            founding team. We respond to support requests personally and
            aim to reply within two business days.
          </p>
        </Section>

        <Section title="Account requirements">
          <ul className="ml-5 list-disc space-y-2">
            <li>You must be at least 16 years old.</li>
            <li>
              You give us a working email address (used for magic-link
              sign-in and any opt-in messages).
            </li>
            <li>
              You&apos;re responsible for activity on your account. If
              you think someone else is using it, email us.
            </li>
            <li>
              One account per person. Don&apos;t share login credentials
              with people who haven&apos;t agreed to these terms.
            </li>
          </ul>
        </Section>

        <Section title="Acceptable use">
          <p>Please don&apos;t:</p>
          <ul className="ml-5 mt-2 list-disc space-y-2">
            <li>
              Scrape, crawl, or run automated tooling against the app,
              the API, the map tiles, or the resort dataset.
            </li>
            <li>
              Re-publish the resort dataset, drive times, or weather
              numbers as your own product, or for commercial resale.
            </li>
            <li>
              Reverse-engineer the app or interfere with how it runs for
              other people.
            </li>
            <li>
              Post reviews that are spam, defamatory, harassing, or
              clearly fake.
            </li>
            <li>Impersonate someone else.</li>
            <li>Use Wynla for anything illegal.</li>
          </ul>
          <p className="mt-3">
            If you find a security issue, please email us before
            publishing — we&apos;ll fix it and thank you publicly if
            you&apos;d like.
          </p>
        </Section>

        <Section title="Pro subscription">
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <span className="font-semibold text-wn-navy">
                Free 7-day trial
              </span>{" "}
              — a payment method is required at signup, but you&apos;re
              not charged until day 8. Cancel before then and you pay $0.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Auto-renewal
              </span>{" "}
              — after the trial, your subscription renews automatically
              at the price displayed on the Pro page ($7/month or
              $59/year as of the date above). We may change pricing for
              new signups; existing subscribers get notice before any
              renewal at a higher rate.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Cancellation
              </span>{" "}
              — cancel anytime from{" "}
              <Link
                href="/account/pro"
                className="font-semibold text-wn-navy underline hover:no-underline"
              >
                /account/pro
              </Link>{" "}
              (opens the Stripe customer portal). Pro features stay
              active until the end of the period you&apos;ve already
              paid for.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">Refunds</span>{" "}
              — we generally don&apos;t pro-rate partial periods. If
              something obviously went wrong (charged twice, broken
              feature you paid for), email us and we&apos;ll make it
              right.
            </li>
            <li>
              Payment is processed by Stripe, who handles your card
              data. We don&apos;t see or store card numbers.
            </li>
          </ul>
        </Section>

        <Section title="Intellectual property">
          <p>
            Wynla owns the app, its code, its design, and the curated
            content we produce (guides, lists, layouts).
          </p>
          <p className="mt-3">
            Resort data — locations, lift counts, base elevations, pass
            affiliations — comes from public sources, resort websites,
            and user contributions. We do our best to verify it, but we
            don&apos;t claim exclusive ownership of facts about a public
            mountain.
          </p>
          <p className="mt-3">
            Trademarks (Ikon, Epic, Indy, resort names and logos) belong
            to their respective owners. We display them to identify the
            resort or pass, not to suggest affiliation.
          </p>
        </Section>

        <Section title="Your content">
          <p>
            When you post a review or submit a tip, you keep ownership
            of what you wrote. You grant Wynla a non-exclusive,
            worldwide, royalty-free license to display, format, and
            store that content so the rest of the site can see it. You
            can remove your own reviews from your account page; once
            removed they stop appearing on the resort page within a few
            minutes.
          </p>
          <p className="mt-3">
            Don&apos;t post anything you don&apos;t have the right to
            share, and don&apos;t post anything that violates the
            acceptable-use rules above.
          </p>
        </Section>

        <Section title="Termination">
          <p>
            You can delete your account anytime from{" "}
            <Link
              href="/account"
              className="font-semibold text-wn-navy underline hover:no-underline"
            >
              /account
            </Link>
            . If you do, your Pro subscription is canceled too (no
            further charges) and your data is removed per the Privacy
            Policy.
          </p>
          <p className="mt-3">
            We may suspend or terminate an account that abuses the
            service — for example, scraping in violation of the rules
            above, posting harassment, or repeated chargebacks. If your
            account is suspended in error, email us.
          </p>
        </Section>

        <Section title="Disclaimer — read this one">
          <p>
            <span className="font-semibold text-wn-navy">
              Wynla is informational.
            </span>{" "}
            Snow totals, forecasts, lift status, trail conditions, drive
            times, and resort details are pulled from third-party
            sources and may be wrong, stale, or unavailable. Mountain
            conditions change by the hour.
          </p>
          <p className="mt-3">
            <span className="font-semibold text-wn-navy">
              Do not rely on Wynla for safety decisions.
            </span>{" "}
            Before you ski, ride, or drive in winter conditions: check
            the resort&apos;s official channels, local avalanche
            forecast, road conditions (DOT, weather services), and your
            own judgment. Skiing and snowboarding have inherent risks,
            including serious injury and death — those risks are yours,
            not ours.
          </p>
          <p className="mt-3">
            The service is provided &quot;as is&quot; and &quot;as
            available.&quot; We don&apos;t warrant that it will always
            work, that data will always be accurate, or that uptime will
            hit a particular number.
          </p>
        </Section>

        <Section title="Limitation of liability">
          <p>
            To the maximum extent permitted by law, Wynla and its
            founder are not liable for indirect, incidental, or
            consequential damages from your use of the service —
            including missed powder days, ruined trips, vehicle damage,
            injury, or lost data.
          </p>
          <p className="mt-3">
            If a court finds we owe you something anyway, our total
            liability is capped at the amount you paid Wynla in the 12
            months before the issue arose, or $50 (whichever is
            greater). If you&apos;re on the free tier, that cap is $50.
          </p>
        </Section>

        <Section title="External links">
          <p>
            Wynla links out to third-party sites (Booking.com, Airbnb,
            ticket vendors, resort sites, weather services). We
            don&apos;t control those sites, and we&apos;re not
            responsible for what happens once you click through. Some
            booking links use affiliate tracking, which may earn Wynla a
            small commission at no extra cost to you.
          </p>
        </Section>

        <Section title="Governing law">
          <p>
            These terms are governed by the laws of the United States and
            the state where Wynla is eventually incorporated. The
            operating entity is currently being formed; the specific
            state and venue will be filled in here once incorporation
            completes. Until then, disputes will be handled in good
            faith by email — please reach out before escalating.
          </p>
          <p className="mt-3 text-xs text-wn-charcoal/60">
            {/* TODO: replace with actual governing state + venue once US
                LLC formation (Stripe Atlas) is complete. */}
            (Governing law and venue: TBD until US entity formation
            completes.)
          </p>
        </Section>

        <Section title="Changes to these terms">
          <p>
            We may update these terms over time. The &quot;Last
            updated&quot; date at the top reflects the latest revision.
            For material changes — pricing structure, new restrictions,
            altered IP terms — we&apos;ll notify registered users by
            email. Continued use of Wynla after the change means you
            accept the new terms.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, disputes, refund requests, or feedback? Email{" "}
            <a
              href="mailto:hello@wynla.app"
              className="font-semibold text-wn-navy underline hover:no-underline"
            >
              hello@wynla.app
            </a>
            . We respond personally to every message.
          </p>
        </Section>

        <p className="mt-12 text-center text-xs text-wn-charcoal/55">
          Thanks for using Wynla. Ride well, ride safe.
        </p>
      </div>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 rounded-xl border border-wn-charcoal/10 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-3 text-base font-bold text-wn-navy sm:text-lg">
        {title}
      </h2>
      <div className="space-y-2 text-sm text-wn-charcoal/80 sm:text-base">
        {children}
      </div>
    </section>
  );
}
