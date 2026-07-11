import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Hero photos live in Supabase Storage; next/image proxies + optimizes
  // them (WebP/AVIF + immutable CDN caching — the Supabase public URLs
  // themselves serve Cache-Control: no-cache, see components/HeroImage.tsx).
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "yhmzkeeaiknsotydaucs.supabase.co",
        pathname: "/storage/v1/object/public/resort-heroes/**",
      },
    ],
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
    ];
  },
  // Baseline security headers (the 2026-06-28 sweep found only HSTS
  // present). Conservative set that can't break existing behavior:
  // no CSP yet — Mapbox/Supabase/inline-script allowances need care.
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
        ],
      },
    ];
  },
};

export default nextConfig;
