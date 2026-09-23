// Dynamic sitemap covering the homepage + every active resort detail
// page, plus the Stage 8 SEO surfaces (state landings, guides, curated
// lists). Next.js 16 generates /sitemap.xml from this at build /
// on-demand.
//
// SEO priority skew: featured resorts get priority 0.9 (these are the
// pages we want indexed and surfaced); listed get 0.6. State landings,
// guides, and lists sit at 0.7 — important to crawl but not the leaf
// detail pages.

import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";
import { STATE_CODES_WITH_RESORTS } from "@/lib/usStates";
import { GUIDES } from "@/lib/guides";
import { LISTS } from "@/lib/lists";
import { TEMPLATES } from "@/lib/tripTemplates";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app";

// Static pages report the build time as lastmod instead of "now" on every
// crawl — claiming every page changed today on each fetch teaches Google
// to ignore the field (audit finding content-seo-25).
const BUILD_TIME = new Date();

export const revalidate = 86400; // 24h

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { data, error } = await supabase
    .from("resorts")
    .select("slug, tier, last_verified_at")
    .eq("active", true);

  if (error) return [{ url: SITE_URL, lastModified: new Date() }];

  const resortRoutes: MetadataRoute.Sitemap = (data ?? []).map((r) => ({
    url: `${SITE_URL}/resort/${r.slug}`,
    lastModified: r.last_verified_at ? new Date(r.last_verified_at) : new Date(),
    changeFrequency: "weekly",
    priority: r.tier === "featured" ? 0.9 : 0.6,
  }));

  const stateRoutes: MetadataRoute.Sitemap = STATE_CODES_WITH_RESORTS.map(
    (code) => ({
      url: `${SITE_URL}/state/${code.toLowerCase()}`,
      lastModified: BUILD_TIME,
      changeFrequency: "weekly",
      priority: 0.7,
    }),
  );

  const guideRoutes: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${SITE_URL}/guides/${g.slug}`,
    lastModified: new Date(g.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const listRoutes: MetadataRoute.Sitemap = LISTS.map((l) => ({
    url: `${SITE_URL}/lists/${l.slug}`,
    lastModified: new Date(l.publishedAt),
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const templateRoutes: MetadataRoute.Sitemap = TEMPLATES.map((t) => ({
    url: `${SITE_URL}/trip-templates/${t.slug}`,
    lastModified: BUILD_TIME,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // Only public, indexable routes belong here. /compare, /trip/*, /account,
  // /trips, /favorites and /login are personalized or token-addressed and
  // are disallowed in app/robots.ts instead.
  return [
    {
      url: SITE_URL,
      lastModified: BUILD_TIME,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/deals`,
      lastModified: BUILD_TIME,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/early`,
      lastModified: BUILD_TIME,
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/guides`,
      lastModified: BUILD_TIME,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/lists`,
      lastModified: BUILD_TIME,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/trip-templates`,
      lastModified: BUILD_TIME,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/data-sources`,
      lastModified: BUILD_TIME,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: BUILD_TIME,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: BUILD_TIME,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    ...stateRoutes,
    ...guideRoutes,
    ...listRoutes,
    ...templateRoutes,
    ...resortRoutes,
  ];
}
