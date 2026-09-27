import type { NextConfig } from "next";

// Every third-party origin the browser legitimately talks to. Keep this
// list in sync with the code that introduces a new origin, or the CSP
// report will light up the moment it ships.
//
// The Supabase origin comes from the same env var the app uses, so a
// preview deploy pointed at a staging project is covered too (this file
// is evaluated at build time, where Vercel injects the env). The literal
// is only a fallback for a build with no env at all.
const SUPABASE_HOST = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://yhmzkeeaiknsotydaucs.supabase.co"
).replace(/\/$/, "");
const SUPABASE_WS = SUPABASE_HOST.replace(/^https:/, "wss:");
const SUPABASE_HOSTNAME = new URL(SUPABASE_HOST).hostname;

// Content-Security-Policy, shipped REPORT-ONLY first. Nothing is blocked;
// the browser only logs violations to the devtools console, so a missed
// origin can't take the map or sign-in down mid-season.
//
// Why these allowances:
//   script-src  'unsafe-inline' — Next's hydration bootstrap + the splash
//               FOUC killer in components/Map/MapPage.tsx are inline. The
//               strict alternative is a per-request nonce set in proxy.ts,
//               which forces dynamic rendering on every route (Next docs:
//               app/guides/content-security-policy); deferred until the
//               ISR content pages are worth re-architecting for it.
//               va.vercel-scripts.com serves @vercel/analytics +
//               speed-insights; api.mapbox.com serves the GL worker glue.
//               'unsafe-eval' is dev-only (React source-map debugging).
//   connect-src Supabase REST + realtime, Mapbox tiles/styles/telemetry,
//               Vercel analytics beacons, and api.zippopotam.us (the ZIP →
//               lat/lng lookup in components/Map/FilterBar.tsx).
//   img-src     data:/blob: for Mapbox sprites + canvas exports, the
//               Supabase Storage hero photos, Mapbox raster tiles.
//   style-src   'unsafe-inline' — Tailwind v4 + Mapbox GL inject styles.
//   worker-src  Mapbox GL runs its tile parser in a blob: worker.
//   font-src    next/font self-hosts Geist; data: for Mapbox glyph atlases.
//   form-action Stripe Checkout / Billing Portal are top-level navigations
//               initiated by our own fetch → redirect, but listed so a
//               future <form action> to Stripe is not a surprise.
//
// How to promote to enforcing:
//   1. Deploy, then watch the browser console on /, /resort/[slug],
//      /trip/[id], /login and /account/pro for "[Report Only]" messages
//      over ~1 week (Vercel has no report endpoint configured — report-to
//      is intentionally absent, so violations are console-only).
//   2. Add any missing origin to the directive that reported it.
//   3. Rename the header key below to "Content-Security-Policy".
//   4. Later, replace 'unsafe-inline' in script-src with a proxy.ts nonce
//      + 'strict-dynamic' once every route can render dynamically.
const CSP_REPORT_ONLY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${
    process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
  } https://va.vercel-scripts.com https://api.mapbox.com`,
  `connect-src 'self' ${SUPABASE_HOST} ${SUPABASE_WS} https://*.mapbox.com https://events.mapbox.com https://va.vercel-scripts.com https://vitals.vercel-insights.com https://api.zippopotam.us`,
  `img-src 'self' data: blob: ${SUPABASE_HOST} https://*.mapbox.com`,
  "style-src 'self' 'unsafe-inline'",
  "worker-src 'self' blob:",
  "child-src blob:",
  "font-src 'self' data:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://billing.stripe.com",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
].join("; ");

// Old resort slug -> the active row that replaced it (see
// scripts/backfill-2026-09-23/reports/03-duplicates.md).
const RETIRED_RESORT_SLUGS: Record<string, string> = {
  "aspen-snowmass": "snowmass",
  "tyrol-basin-and-snowboard": "tyrol-basin",
  "sunburst-area": "sunburst",
  "schuss-shanty-creek": "shanty-creek",
};

const nextConfig: NextConfig = {
  // Hero photos live in Supabase Storage; next/image proxies + optimizes
  // them (WebP/AVIF + immutable CDN caching — the Supabase public URLs
  // themselves serve Cache-Control: no-cache, see components/HeroImage.tsx).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: SUPABASE_HOSTNAME,
        pathname: "/storage/v1/object/public/resort-heroes/**",
      },
      // Branded terrain cards (scripts/photos/2-terrain-cards.mjs), the
      // hero fallback for resorts with no vetted photo (lib/heroSource.ts).
      {
        protocol: "https",
        hostname: SUPABASE_HOSTNAME,
        pathname: "/storage/v1/object/public/resort-cards/**",
      },
    ],
    // Next 16 snaps any requested quality to this list (default [75]) —
    // without registering 70 here, HeroImage's quality={70} is silently
    // coerced to 75 and the intended compression never applies.
    qualities: [70, 75],
  },
  // PWA install fix — when Saitarn installed the PWA on her iPhone she
  // accidentally pinned the ridewise-rcko.vercel.app default URL
  // instead of wynla.app. Safari treats those as different origins, so
  // the manifest's start_url + service-worker scope didn't match the
  // installed PWA's origin — resulting in Safari's URL bar + toolbar
  // staying visible (no fullscreen PWA mode). 308 permanent redirect
  // wynla.app sees the right traffic and PWA installs from the right
  // canonical origin going forward.
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "ridewise-rcko.vercel.app" }],
        destination: "https://wynla.app/:path*",
        permanent: true,
      },
      // www → apex. Without this, www.wynla.app served the whole site as
      // a 200 duplicate — two full copies of ~480 URLs in Google's eyes
      // (found in the 2026-06-28 live sweep). Same mechanism as the
      // vercel.app redirect above so all host canonicalization lives here.
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.wynla.app" }],
        destination: "https://wynla.app/:path*",
        permanent: true,
      },
      // Slugs retired by the 2026-09-23 data backfill (duplicate rows and
      // the Aspen aggregate, now active=false so /resort/[slug] 404s).
      // The aspen-snowmass row was tier=featured and Google-indexed, so
      // each old URL 301s to the row that replaced it.
      ...Object.entries(RETIRED_RESORT_SLUGS).map(([from, to]) => ({
        source: `/resort/${from}`,
        destination: `/resort/${to}`,
        permanent: true,
      })),
    ];
  },
  // Baseline security headers (the 2026-06-28 sweep found only HSTS
  // present) plus a REPORT-ONLY Content-Security-Policy (audit finding
  // security-4: Supabase auth cookies are JS-readable by design, so any
  // XSS is full session theft; CSP is the mitigation).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Wynla has no legitimate embedding use case; block clickjacking.
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Full URL for same-origin, origin-only cross-origin (default
          // browser behavior made explicit).
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Content-Security-Policy-Report-Only", value: CSP_REPORT_ONLY },
        ],
      },
    ];
  },
};

export default nextConfig;
