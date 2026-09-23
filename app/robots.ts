import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        // /compare and /trip/share/[token] are deliberately NOT disallowed:
        // both carry robots noindex metadata, and a crawler can only read
        // that tag on a URL it is allowed to fetch. Disallowing them too
        // would let a linked URL surface as "Indexed, though blocked by
        // robots.txt" with no title (audit finding content-seo-25; the review
        // of the 2026-09-23 hygiene package chose noindex over disallow).
        allow: ["/", "/trip/share/"],
        // Auth-gated or personalized pages — no value to crawl. /trip/
        // (owner pages) redirects to /login when signed out. /api/ is
        // machine endpoints, never pages.
        disallow: [
          "/login",
          "/auth/",
          "/favorites",
          "/account",
          "/trips",
          "/trip/",
          "/api/",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
