import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Auth-gated, personalized, or token-addressed pages — no value to
        // crawl, and for /trip/ (owner pages + share tokens) and /compare
        // (any ?ids= permutation) indexing would only create duplicate or
        // leaked URLs. /api/ is machine endpoints, never pages.
        disallow: [
          "/login",
          "/auth/",
          "/favorites",
          "/account",
          "/trips",
          "/trip/",
          "/compare",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
