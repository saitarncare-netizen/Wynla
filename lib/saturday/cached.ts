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
import type { GoOrigin } from "./cities";
import { loadSaturdayData, type LoadedSaturdayData } from "./load";

export const GO_DATA_REVALIDATE_SECONDS = 600;

const getCachedData = unstable_cache(
  async (kind: "city" | "geo", code: string, lat: number, lon: number, name: string, driveCache: boolean, max: number) => {
    const origin: GoOrigin =
      kind === "city"
        ? { kind: "city", code, name, short: name, lat, lon, driveCache }
        : { kind: "geo", code: "geo", name: "Here", short: "your location", lat, lon };
    return loadSaturdayData(supabase, origin, max, new Date());
  },
  ["go-data"],
  { revalidate: GO_DATA_REVALIDATE_SECONDS, tags: ["go-data"] },
);

export function loadCachedSaturdayData(origin: GoOrigin, maxDriveHours: number): Promise<LoadedSaturdayData> {
  const round = (n: number) => Math.round(n * 100) / 100;
  return origin.kind === "city"
    ? getCachedData("city", origin.code, origin.lat, origin.lon, origin.name, origin.driveCache === true, maxDriveHours)
    : getCachedData("geo", "geo", round(origin.lat), round(origin.lon), "Here", false, maxDriveHours);
}
