// Request-side cache for the Saturday loader, shared by app/go/page.tsx
// and the share card at app/go/og. One entry per (origin, radius) for ten
// minutes: the crons that feed it run once a day, and sharing the entry
// means a link preview never costs more than the page it previews. A geo
// origin is rounded to ~1 km so the key space stays bounded and a shared
// link with the same rounded point hits the same entry.
//
// Server-only (unstable_cache); the anon client is enough because every
// table the loader reads is public.

import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { findOrigin } from "@/lib/origins";
import type { GoOrigin } from "./cities";
import { loadSaturdayData, type LoadedSaturdayData } from "./load";

export const GO_DATA_REVALIDATE_SECONDS = 600;

// The cached function takes primitives only (they form the cache key).
// A city is re-resolved from the shared list in lib/origins by code, so
// the entry carries its state / time zone / cached flag without copying
// them into the key; a geo origin is rebuilt from its rounded point.
const getCachedData = unstable_cache(
  async (kind: "city" | "geo", code: string, lat: number, lon: number, max: number) => {
    let origin: GoOrigin;
    if (kind === "city") {
      const c = findOrigin(code);
      if (!c) throw new Error(`go-data: unknown city "${code}"`);
      origin = c;
    } else {
      origin = { kind: "geo", code: "geo", name: "Here", short: "your location", lat, lon };
    }
    return loadSaturdayData(supabase, origin, max, new Date());
  },
  ["go-data"],
  { revalidate: GO_DATA_REVALIDATE_SECONDS, tags: ["go-data"] },
);

export function loadCachedSaturdayData(origin: GoOrigin, maxDriveHours: number): Promise<LoadedSaturdayData> {
  const round = (n: number) => Math.round(n * 100) / 100;
  return origin.kind === "city"
    ? getCachedData("city", origin.code, origin.lat, origin.lon, maxDriveHours)
    : getCachedData("geo", "geo", round(origin.lat), round(origin.lon), maxDriveHours);
}
