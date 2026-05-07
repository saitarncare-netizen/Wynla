// Dynamic sitemap covering the homepage + every active resort detail page.
// Next.js 16 generates /sitemap.xml from this at build / on-demand.
//
// SEO priority skew: featured resorts get priority 0.9 (these are the pages
// we want indexed and surfaced); listed get 0.6.

import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

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
    ...resortRoutes,
  ];
}
