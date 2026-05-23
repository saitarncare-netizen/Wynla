// Privacy Policy — plain-English description of what Wynla collects and
// how we handle it. This is a Stage 35 prerequisite for the iOS App
// Store submission (Apple guideline 5.1.1 requires a privacy policy URL).
//
// Tone: friendly, specific to Wynla, no Termly boilerplate.
//
// ---------------------------------------------------------------------------
// PRE-LAUNCH ENV CHECKLIST — set before going public
// ---------------------------------------------------------------------------
// NEXT_PUBLIC_OPERATOR_NAME     Legal operator name (sole-prop registration
//                               in Thailand). Until set, the page shows
//                               "[Operator name pending registration]".
// NEXT_PUBLIC_OPERATOR_ADDRESS  Operator business address. Defaults to
//                               "Bangkok, Thailand".
// NEXT_PUBLIC_CONTACT_EMAIL     Public contact mailbox. Defaults to
//                               "hello@wynla.app" (Resend-backed once DNS
//                               is verified — see handoff-docs/RESEND_SETUP.md).
// ---------------------------------------------------------------------------

import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 86400; // 24h — copy changes rarely

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Wynla collects, uses, and protects your data. Plain English, no legalese.",
  alternates: { canonical: "/privacy" },
};

const LAST_UPDATED = "May 23, 2026";

const OPERATOR_NAME =
  process.env.NEXT_PUBLIC_OPERATOR_NAME ??
  "[Operator name pending registration]";
const OPERATOR_ADDRESS =
  process.env.NEXT_PUBLIC_OPERATOR_ADDRESS ?? "Bangkok, Thailand";
const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "hello@wynla.app";

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-xs text-wn-charcoal/55">
            Last updated: {LAST_UPDATED}
          </p>
          <p className="mt-4 text-sm text-wn-charcoal/75 sm:text-base">
            Wynla is a ski and snowboard trip planning service focused on
            the US market. This page explains what we collect, why, and what
            your choices are. If anything is unclear, reach the team at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-wn-navy underline hover:no-underline"
            >
              {CONTACT_EMAIL}
            </a>{" "}
            — we&apos;ll answer in plain English.
          </p>
        </header>

        <Section title="Who we are">
          <p>
            Wynla is an early-stage product helping US skiers and
            snowboarders discover resorts and plan multi-stop trips. The
            service runs at{" "}
            <span className="font-semibold text-wn-navy">wynla.app</span>.
            There is no advertising and no data brokerage involved — only
            the third-party services listed below, each of which is named
            and explained.
          </p>
          <p className="mt-3">
            Wynla is operated by{" "}
            <span className="font-semibold text-wn-navy">{OPERATOR_NAME}</span>
            , a sole proprietorship based in {OPERATOR_ADDRESS}. The
            product is offered globally on the public web, but it is built
            around US ski resorts and US users. You can reach the operator
            directly at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-wn-navy underline hover:no-underline"
            >
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>

        <Section title="What we collect">
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <span className="font-semibold text-wn-navy">Your email</span> —
              when you sign in. We use Supabase magic links, so we never see
              or store a password.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Browser location
              </span>{" "}
              — only if you tap &quot;use my location&quot; and approve the
              browser prompt. Used in-session to show resorts near you. We
              don&apos;t log or store your coordinates server-side.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Saved trips, favorites, compare list, snow-alert preferences
              </span>{" "}
              — what you create while signed in. Stored against your account
              so you see the same data on every device.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Push-notification subscription
              </span>{" "}
              — if you opt in to snow alerts. Your browser hands us a Web
              Push subscription object (an endpoint and two keys); we store
              that so we can send the alert. No content of your browsing is
              attached.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Subscription state
              </span>{" "}
              — if you upgrade to Pro, Stripe tells us whether your
              subscription is active. We store your Stripe customer ID and
              status, never your card number.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Reviews you post
              </span>{" "}
              — visible publicly on the resort page you wrote them for, with
              the display name you choose.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Anonymous analytics
              </span>{" "}
              — Vercel Analytics and Speed Insights track page views and load
              performance. No cookies, no fingerprinting, no cross-site
              tracking. If Google Analytics is enabled for a campaign, it is
              configured without advertising features and with IP
              anonymization on.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                On-device history
              </span>{" "}
              — your recently-viewed resorts and a small set of UI
              preferences live in your browser&apos;s <code>localStorage</code>
              . That data never leaves your device — we don&apos;t upload
              your search history to any server.
            </li>
          </ul>
          <p className="mt-3 text-wn-charcoal/70">
            We do <span className="font-semibold">not</span> collect facial
            photos, payment-card numbers, Social Security numbers,
            government ID, contacts, microphone, or camera input.
          </p>
        </Section>

        <Section title="How we use it">
          <ul className="ml-5 list-disc space-y-2">
            <li>Sign you in and keep you signed in.</li>
            <li>
              Show your trips, favorites, and alert preferences across
              devices.
            </li>
            <li>
              Send the snow alerts and the weekly digest you opted into (and
              only those — no marketing blasts).
            </li>
            <li>
              Charge your Pro subscription via Stripe and unlock the matching
              features on your account.
            </li>
            <li>
              Understand which pages are slow or broken so we can fix them.
            </li>
          </ul>
        </Section>

        <Section title="What we share — and what we don't">
          <p>
            We do <span className="font-semibold">not</span> sell, rent, or
            trade your data. We don&apos;t share it for ad targeting. The
            only parties that touch it are the service providers we use to
            run the product, listed below.
          </p>
          <p className="mt-3">
            We may disclose data if compelled by a valid US legal request
            (subpoena, court order). If that happens and we&apos;re permitted
            to tell you, we will.
          </p>
        </Section>

        <Section title="Third parties we use">
          <p>
            These are the services that make Wynla work. Each handles
            encryption and security on their end — we don&apos;t replicate
            their security stacks, we trust theirs.
          </p>
          <ul className="ml-5 mt-3 list-disc space-y-2">
            <li>
              <span className="font-semibold text-wn-navy">Supabase</span> —
              authentication and database (hosted in the US).
            </li>
            <li>
              <span className="font-semibold text-wn-navy">Vercel</span> —
              web hosting, anonymous analytics, performance metrics.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">Stripe</span> —
              processes Pro subscription payments. Stripe handles card data
              directly; we never see your card number.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">Mapbox</span> —
              renders the map. Mapbox sees the tiles your browser requests
              and your approximate location (from your IP) when you load
              them.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">Resend</span> —
              sends transactional emails (waitlist confirmations, sign-in
              links, future digests) once the wynla.app sending domain is
              verified. Resend processes the recipient address and the
              message body, nothing more.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Google Analytics
              </span>{" "}
              — optional. Used only if and when we enable it, configured
              without advertising features and with IP anonymization. Until
              enabled, no GA data is collected.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Booking.com, Airbnb, lift-ticket vendors
              </span>{" "}
              — when you click an external booking link from a resort page,
              you leave Wynla. Those sites set their own cookies and may use
              affiliate tracking that lets us know a referral converted.
              We don&apos;t pass them your email or account.
            </li>
          </ul>
        </Section>

        <Section title="Cookies and tracking">
          <p>
            We use a small number of cookies for things that have to work:
          </p>
          <ul className="ml-5 mt-3 list-disc space-y-2">
            <li>
              A Supabase session cookie that keeps you signed in.
            </li>
            <li>
              A preference cookie or two (e.g. distance units, last-used
              filters) so the app remembers how you like it.
            </li>
          </ul>
          <p className="mt-3">
            We do not use third-party advertising or cross-site tracking
            cookies. Vercel Analytics works without cookies.
          </p>
        </Section>

        <Section title="Your rights and choices">
          <ul className="ml-5 list-disc space-y-2">
            <li>
              <span className="font-semibold text-wn-navy">Access</span> —
              email{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-semibold text-wn-navy underline hover:no-underline"
              >
                {CONTACT_EMAIL}
              </a>{" "}
              and we&apos;ll send you a copy of what we have on file.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">Delete</span> —
              you can delete your account from{" "}
              <Link
                href="/account"
                className="font-semibold text-wn-navy underline hover:no-underline"
              >
                /account
              </Link>{" "}
              at any time. We remove your profile, trips, favorites, and
              alert subscriptions within 30 days. Reviews you posted
              publicly stay up unless you ask us to remove them.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">Export</span> —
              ask and we&apos;ll send your saved trips and favorites as a
              JSON file.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Turn off alerts
              </span>{" "}
              — unsubscribe in /account, or hit unsubscribe in any digest
              email. Push notifications can also be revoked in your browser
              settings.
            </li>
            <li>
              <span className="font-semibold text-wn-navy">
                Cross-jurisdictional rights
              </span>{" "}
              — Wynla is operated from Thailand, but users may have
              additional rights under their local privacy laws, including
              Thailand&apos;s PDPA, the EU/UK GDPR, and California&apos;s
              CCPA/CPRA. We honor access, deletion, and portability
              requests from any of these regimes regardless of where you
              live. We don&apos;t have a dedicated data protection officer
              (we are not big enough yet), but email us and we&apos;ll
              act on the request.
            </li>
          </ul>
        </Section>

        <Section title="Data retention">
          <p>
            We keep your account data while your account is active. If you
            delete the account, the data is wiped within 30 days, except
            anything we&apos;re legally required to retain (e.g. Stripe
            keeps payment records for tax law). Anonymous analytics roll up
            into totals and aren&apos;t tied back to you.
          </p>
        </Section>

        <Section title="Children">
          <p>
            Wynla is for users aged 16 and over. We don&apos;t knowingly
            collect data from anyone younger. If you believe a child has
            created an account, email us and we&apos;ll delete it.
          </p>
        </Section>

        <Section title="International users">
          <p>
            Wynla is operated from Thailand by {OPERATOR_NAME} and hosted
            on infrastructure in the United States (Vercel, Supabase). If
            you use the site from outside the US, your data is transferred
            to and stored on US servers. By using Wynla you understand and
            consent to that transfer. Users in regions with stronger
            privacy regimes (EU/UK GDPR, Thailand PDPA, California
            CCPA/CPRA) keep all the rights described in the previous
            section regardless of where the data lives.
          </p>
        </Section>

        <Section title="Security">
          <p>
            Data in transit is encrypted via HTTPS. Data at rest is stored
            in Supabase Postgres and protected by Supabase&apos;s and
            Vercel&apos;s infrastructure. Payment data is held by Stripe.
            No system is unbreakable; if we learn of a breach that affects
            your account, we&apos;ll email you.
          </p>
        </Section>

        <Section title="Changes to this policy">
          <p>
            If we make a meaningful change — for example, adding a new
            third-party service or starting a new type of data collection —
            we&apos;ll update the &quot;Last updated&quot; date at the top
            and, for material changes, email registered users.
          </p>
        </Section>

        <Section title="Contact">
          <p>
            Questions, requests, or concerns? Email{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="font-semibold text-wn-navy underline hover:no-underline"
            >
              {CONTACT_EMAIL}
            </a>
            . The operator of record is {OPERATOR_NAME}, {OPERATOR_ADDRESS}.
            We respond personally and aim to reply within two business days.
          </p>
        </Section>

        <p className="mt-12 text-center text-xs text-wn-charcoal/55">
          Wynla is a paid product, not an ads business. Your data stays
          yours.
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
