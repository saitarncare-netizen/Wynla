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

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://wynla.app";

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
      lastModified: new Date(),
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

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/pro`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/guides`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/lists`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.3,
    },
    ...stateRoutes,
    ...guideRoutes,
    ...listRoutes,
    ...resortRoutes,
  ];
}
