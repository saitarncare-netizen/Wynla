import type { Metadata, Viewport } from "next";
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
    default: "Wynla — Plan smart. Ride better.",
    template: "%s · Wynla",
  },
  description:
    "Plan your ski or snowboard trip with confidence — 451 US resorts on a single map, with pass info, drive time, and curated weather sources.",
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
    title: "Wynla — Plan smart. Ride better.",
    description:
      "Map of 451 US ski resorts with pass colors, drive time, and curated weather sources. Built for skiers and snowboarders.",
    url: SITE_URL,
    images: [{ url: "/og-home.png", width: 1200, height: 630, alt: "Wynla — US ski resort map" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Wynla — Plan smart. Ride better.",
    description: "Plan your ski trip with one map.",
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
    "Wynla is a US ski resort discovery and multi-stop trip planner — 451 resorts on one map with pass info, drive time, and weather.",
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
        <PwaRegistrar />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
