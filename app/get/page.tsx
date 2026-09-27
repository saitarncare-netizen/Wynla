// /get — the "install Wynla" landing page.
//
// This is the link that goes in the TikTok / Instagram bio and in the
// "Open in Safari" escape buttons: most social traffic arrives inside an
// in-app browser that cannot install anything, so the flow is escape
// first (InstallCard mode C), then install (modes A / B) once the page
// reloads in a real browser. `?from=<app>` is set by the escape links so
// the card can open the guided sheet immediately on arrival.

import type { Metadata } from "next";
import { InstallCard } from "@/components/InstallPrompt";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import Icon, { type IconName } from "@/components/icons/Icon";

export const metadata: Metadata = {
  title: "Get the app",
  description:
    "Add Wynla to your home screen for one-tap access to every US ski resort, the snow surface forecast, and powder alerts. Free, no app store.",
  alternates: { canonical: "/get" },
};

const BENEFITS: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "bell",
    title: "Powder alerts",
    body: "Snow alerts only work from the installed app on iPhone. Pick a resort and a threshold, and we ping you when it hits.",
  },
  {
    icon: "sparkle",
    title: "One tap from your home screen",
    body: "Opens full screen like a native app, with no address bar in the way of the map.",
  },
  {
    icon: "map",
    title: "Your trips and favorites",
    body: "Saved resorts, planned trips, and the compare list are right there every time you open it.",
  },
];

export default async function GetPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const sp = await searchParams;
  const rawFrom = Array.isArray(sp.from) ? sp.from[0] : sp.from;
  // Only keep a short alphanumeric token — this value is echoed back into
  // escape links and must never carry arbitrary text.
  const from = rawFrom && /^[a-z0-9-]{1,24}$/i.test(rawFrom) ? rawFrom.toLowerCase() : "";

  return (
    <main className="min-h-dvh bg-wn-offwhite">
      <PageHeader
        tone="navy"
        width="max-w-2xl"
        eyebrow="Install"
        title="Wynla on your home screen"
        description="Every US ski resort on one map, the snow surface forecast, drive times, and powder alerts. It installs from the browser in seconds and takes almost no space."
      />

      <div className="mx-auto -mt-4 max-w-2xl space-y-6 px-4 pb-16 sm:px-6">
        <InstallCard from={from} autoOpenGuide={Boolean(from)} />

        <Card padding="lg">
          <h2 className="text-lg font-bold text-wn-navy">Why install</h2>
          <ul className="mt-3 space-y-4">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex items-start gap-3">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wn-navy/5 text-wn-navy" aria-hidden="true">
                  <Icon name={b.icon} className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-wn-charcoal">{b.title}</p>
                  <p className="mt-0.5 text-sm text-wn-muted">{b.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-bold text-wn-navy">Where to ride Saturday</h2>
          <p className="mt-2 text-sm text-wn-muted">
            Pick your pass and your city and get the three best mountains for this Saturday, with the snow surface and
            the drive. No sign-in needed.
          </p>
          <Button href="/go" className="mt-3" iconLeft={<Icon name="compass" />}>
            Find my Saturday
          </Button>
        </Card>

        <Card padding="lg">
          <h2 className="text-lg font-bold text-wn-navy">Good to know</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <div>
              <dt className="font-semibold text-wn-charcoal">Is it a real app?</dt>
              <dd className="mt-0.5 text-wn-muted">
                It is a web app that installs straight from the browser. Same features as wynla.app, updated
                automatically, nothing to download from an app store.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-wn-charcoal">Why two taps on iPhone?</dt>
              <dd className="mt-0.5 text-wn-muted">
                Apple does not let any website install itself with one tap. Share, then Add to Home Screen, is the route
                for every web app on iOS.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-wn-charcoal">Coming from TikTok or Instagram?</dt>
              <dd className="mt-0.5 text-wn-muted">
                Their built-in browsers cannot install apps. Use the button above to open this page in Safari or Chrome
                first.
              </dd>
            </div>
          </dl>
        </Card>
      </div>
    </main>
  );
}
