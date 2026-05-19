import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import PwaRegistrar from "@/components/PwaRegistrar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Wynla — Free for the inaugural ski season.",
    template: "%s · Wynla",
  },
  description:
    "Every US ski resort on one map, with pass info, drive time, weather, and the snow surface forecast. Free for the inaugural 2026-27 season — founder pricing locked forever for early members.",
  applicationName: "Wynla",
  manifest: "/manifest.json",
  alternates: { canonical: "/" },
  appleWebApp: {
    capable: true,
    title: "Wynla",
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: "Wynla",
    title: "Wynla — Free for the inaugural ski season.",
    description:
      "Every US ski resort on one map. Snow surface forecast, drive time, pass info. Free for the inaugural 2026-27 season.",
    url: SITE_URL,
    images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "Wynla — US ski resort map" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wynla — Free for the inaugural ski season.",
    description: "Plan your 2026-27 ski trip with one map. Free inaugural season.",
    images: ["/og-home.png"],
  },
  icons: {
    icon: "/icon.svg",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#1E2952",
};

const ORG_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Wynla",
  url: SITE_URL,
  logo: `${SITE_URL}/icon.svg`,
  description:
    "Wynla is a US ski resort discovery + multi-stop trip planner with a first-of-its-kind snow surface forecast. Free for the inaugural 2026-27 season; founder pricing locked forever for early members.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="preconnect" href="https://events.mapbox.com" />
        <link rel="dns-prefetch" href="https://a.tiles.mapbox.com" />
        <link rel="dns-prefetch" href="https://b.tiles.mapbox.com" />
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:rounded focus:bg-wn-navy focus:px-3 focus:py-2 focus:text-sm focus:font-semibold focus:text-white focus:outline-none focus:ring-2 focus:ring-wn-gold"
        >
          Skip to main content
        </a>
        {children}
        {/* Global legal footer. `mt-auto` plus the body's flex column keeps
            it at the very bottom without pushing the map page (the map
            fills the viewport; the footer sits below the fold for that
            route). Kept tiny so it never competes with primary UI. */}
        <footer className="mt-auto flex flex-col items-center gap-1 px-4 py-3 text-[11px] text-wn-charcoal/55">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            <Link href="/early" className="font-semibold text-wn-navy hover:text-wn-navy/80">
              Founder list
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/privacy" className="hover:text-wn-navy">
              Privacy
            </Link>
            <span aria-hidden="true">·</span>
            <Link href="/terms" className="hover:text-wn-navy">
              Terms
            </Link>
            <span aria-hidden="true">·</span>
            <a
              href="mailto:hello@wynla.app"
              className="hover:text-wn-navy"
            >
              Contact
            </a>
          </div>
          <p className="mt-1 text-[10px] text-wn-charcoal/40">
            &copy; {new Date().getFullYear()} Wynla. All rights reserved.
          </p>
        </footer>
        <PwaRegistrar />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
