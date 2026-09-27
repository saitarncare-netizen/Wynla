// Reads for /near/[city], cached ten minutes per city like app/page.tsx
// and lib/saturday/cached.ts: the crons that feed these tables run once
// a day, and the page plus its OG image share one entry so a link
// preview never costs more than the page it previews.
//
// Anon client only; every table here is public and read-only
// (handoff-docs/DB_SCHEMA_LIVE_2026-09-23.md). The measured-snow read
// projects `forecast_json->measured`, which is null on v1 rows the
// pipeline has not rewritten, so the column is feature-detected per row.

import { unstable_cache } from "next/cache";
import { supabase } from "@/lib/supabase";
import { findOrigin, hasCachedDriveTimes } from "@/lib/origins";
import {
  buildNearRows,
  type MeasuredSnow24h,
  type NearResortRow,
  type NearRow,
} from "@/lib/near";

export const NEAR_DATA_REVALIDATE_SECONDS = 600;
export const NEAR_DATA_CACHE_TAG = "near-data";

const RESORT_COLUMNS =
  "id, slug, name, state, latitude, longitude, passes, tier, vertical_drop, ticket_price_adult_min, ticket_price_adult_max, ticket_price_currency, ticket_price_updated_at, season_open_text, season_close_text, typical_season_start, typical_season_end, operating_status, currently_open, snow_report_status, snow_report_updated_at, lifts_open_today, total_lifts, trails_open_today, total_trails, season_end_date";

/** PostgREST caps a response at 1,000 rows; drive_time_cache holds ~437
 *  per origin today, paged anyway so a future growth cannot drop the tail. */
const DRIVE_PAGE = 1000;
const SNOW_CHUNK = 100;

type DriveRow = { resort_id: number; duration_seconds: number; distance_meters: number | null };

type SnowRow = {
  resort_id: number;
  measured: { sfav2_24h_in?: number | string | null; sfav2_valid_end?: string | null } | null;
};

export type NearData = {
  rows: NearRow[];
  driveSource: "cache" | "estimate";
  loadedAt: string;
};

async function loadDrives(originName: string): Promise<Map<number, { seconds: number; meters: number | null }>> {
  const out = new Map<number, { seconds: number; meters: number | null }>();
  let total: number | null = null;
  let fetched = 0;
  while (total === null || fetched < total) {
    const { data, error, count } = await supabase
      .from("drive_time_cache")
      .select("resort_id, duration_seconds, distance_meters", { count: "exact" })
      .eq("origin_name", originName)
      .order("resort_id")
      .order("id")
      .range(fetched, fetched + DRIVE_PAGE - 1);
    if (error) throw new Error(`drive_time_cache: ${error.message}`);
    const page = (data ?? []) as DriveRow[];
    if (page.length === 0) break;
    for (const r of page) {
      // The (resort_id, origin_name) index has been partial before; keep
      // the first row per resort so duplicates cannot flip the value.
      if (!out.has(r.resort_id)) out.set(r.resort_id, { seconds: r.duration_seconds, meters: r.distance_meters });
    }
    fetched += page.length;
    total = count ?? fetched;
  }
  return out;
}

/** Measured 24 h snowfall for the given resorts, from forecast_json v2.
 *  A read failure degrades to "no snow shown" rather than failing the
 *  page: the number is enrichment, the list is the product. */
async function loadMeasuredSnow(ids: number[]): Promise<Map<number, MeasuredSnow24h>> {
  const out = new Map<number, MeasuredSnow24h>();
  for (let i = 0; i < ids.length; i += SNOW_CHUNK) {
    const part = ids.slice(i, i + SNOW_CHUNK);
    const { data, error } = await supabase
      .from("weather_cache")
      .select("resort_id, measured:forecast_json->measured")
      .in("resort_id", part);
    if (error) {
      console.error("[near] weather_cache measured read failed", error.message);
      return out;
    }
    for (const row of (data ?? []) as SnowRow[]) {
      const raw = row.measured?.sfav2_24h_in;
      const inches = typeof raw === "string" ? Number(raw) : raw;
      if (inches == null || !Number.isFinite(inches) || inches < 0) continue;
      out.set(row.resort_id, { inches: Math.round(inches * 10) / 10, validEnd: row.measured?.sfav2_valid_end ?? null });
    }
  }
  return out;
}

const getCachedNearData = unstable_cache(
  async (code: string): Promise<NearData> => {
    const city = findOrigin(code);
    if (!city) throw new Error(`near-data: unknown city "${code}"`);

    const [resortsRes, cached] = await Promise.all([
      supabase.from("resorts").select(RESORT_COLUMNS).eq("active", true).order("name"),
      hasCachedDriveTimes(city)
        ? loadDrives(city.name).catch((err: unknown) => {
            // Drive times are enrichment: without them the page still
            // renders on the ≈ estimate path with "estimated" copy, the
            // same way app/page.tsx degrades. Only the resorts read is fatal.
            console.error(`near-data: drive_time_cache read failed for ${city.name}; using estimates`, err);
            return new Map<number, { seconds: number; meters: number | null }>();
          })
        : Promise.resolve(new Map<number, { seconds: number; meters: number | null }>()),
    ]);
    // Throwing keeps a failed read out of the cache so the next request
    // retries instead of serving an empty page for ten minutes.
    if (resortsRes.error) throw new Error(`resorts: ${resortsRes.error.message}`);
    const resorts = (resortsRes.data ?? []) as unknown as NearResortRow[];

    const now = new Date();
    // Two passes: the first finds who is inside the radius and running,
    // the second attaches measured snow to only those ids.
    const first = buildNearRows(city, resorts, cached, new Map(), now);
    const runningIds = first.filter((r) => !r.status.dormant).map((r) => r.id);
    const snow = runningIds.length > 0 ? await loadMeasuredSnow(runningIds) : new Map<number, MeasuredSnow24h>();
    const rows = snow.size > 0 ? buildNearRows(city, resorts, cached, snow, now) : first;

    return {
      rows,
      driveSource: cached.size > 0 ? "cache" : "estimate",
      loadedAt: now.toISOString(),
    };
  },
  ["near-data", "v1"],
  { revalidate: NEAR_DATA_REVALIDATE_SECONDS, tags: [NEAR_DATA_CACHE_TAG] },
);

export function loadNearData(code: string): Promise<NearData> {
  return getCachedNearData(code);
}
