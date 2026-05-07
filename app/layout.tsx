import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
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
  },
  twitter: {
    card: "summary_large_image",
    title: "Wynla — Plan smart. Ride better.",
    description: "Plan your ski trip with one map.",
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#1E2952",
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
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
