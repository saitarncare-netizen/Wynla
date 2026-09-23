// On-request freshness for one resort (Hobby-plan workaround).
//
// GET /api/refresh/resort/{id-or-slug}
//   → { refreshed: true|false, fetched_at, age_minutes, reason }
//
// The daily cron leaves data up to a day old; a resort page (or a
// client-side effect on it) can call this to refresh a single resort's
// forecast + observations when the row is older than MAX_AGE_MIN. It
// needs no secret because it is idempotent, rate-limited per IP, and
// bounded to one upstream refresh per resort per MAX_AGE_MIN: the DB
// timestamp is the lock, plus an in-memory map that dedupes concurrent
// callers on a warm instance. Worst case an attacker can make us
// refresh each of 425 resorts once every 45 minutes, which is exactly
// the in-season cadence anyway.

import { NextResponse } from "next/server";
import { getServiceClient } from "@/lib/cronRun";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";
import { errorText } from "@/lib/weather/http";
import { findLatestSfav2, Sfav2Sampler } from "@/lib/weather/nohrsc";
import {
  CACHE_COLUMNS,
  refreshResort,
  RESORT_COLUMNS,
  writeOutcomes,
  type CacheRow,
  type ResortRow,
} from "@/lib/weather/refreshResort";
import { StationDirectory } from "@/lib/weather/stations";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_AGE_MIN = 45;
const SFAV2_LISTING_TTL_MS = 30 * 60_000;

// Per-instance memo of the latest analysis file so hot pages do not
// re-read the NOHRSC directory listing on every call.
let sfav2Memo: { at: number; sampler: Sfav2Sampler | null } | null = null;
async function sfav2Sampler(now: Date): Promise<Sfav2Sampler | null> {
  if (sfav2Memo && now.getTime() - sfav2Memo.at < SFAV2_LISTING_TTL_MS) return sfav2Memo.sampler;
  let sampler: Sfav2Sampler | null = null;
  try {
    const file = await findLatestSfav2(now);
    sampler = file ? new Sfav2Sampler(file) : null;
  } catch {
    sampler = null;
  }
  sfav2Memo = { at: now.getTime(), sampler };
  return sampler;
}

const inFlight = new Map<number, Promise<NextResponse>>();

function json(body: Record<string, unknown>, status = 200): NextResponse {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = checkRateLimit(`refresh:${clientIp(_request)}`, { windowMs: 60_000, max: 12 });
  if (!rl.ok) {
    return json({ refreshed: false, reason: "rate_limited" }, 429);
  }
  const { id } = await params;
  const supabase = getServiceClient();
  if (!supabase) return json({ refreshed: false, reason: "missing supabase env" }, 503);

  const numeric = /^\d+$/.test(id) ? Number(id) : null;
  let q = supabase.from("resorts").select(RESORT_COLUMNS).eq("active", true);
  q = numeric !== null ? q.eq("id", numeric) : q.eq("slug", id);
  const { data: resortData } = await q.maybeSingle();
  if (!resortData) return json({ refreshed: false, reason: "not_found" }, 404);
  const resort = resortData as unknown as ResortRow;

  const now = new Date();
  const { data: cacheData } = await supabase
    .from("weather_cache")
    .select(CACHE_COLUMNS)
    .eq("resort_id", resort.id)
    .maybeSingle();
  const cached = (cacheData as CacheRow | null) ?? undefined;
  const ageMin = cached?.fetched_at ? Math.round((now.getTime() - Date.parse(cached.fetched_at)) / 60_000) : null;
  if (ageMin !== null && ageMin < MAX_AGE_MIN && cached?.forecast_json) {
    return json({ refreshed: false, reason: "fresh", fetched_at: cached.fetched_at, age_minutes: ageMin });
  }

  const existing = inFlight.get(resort.id);
  if (existing) return existing;
  const work = (async () => {
    try {
      const sampler = await sfav2Sampler(now);
      const outcome = await refreshResort(resort, cached, {
        now,
        directory: new StationDirectory(),
        sfav2: sampler,
        allowMeasured: true,
      });
      const { data: hist } = await supabase
        .from("weather_history")
        .select("observed_date, snow_24h_in")
        .eq("resort_id", resort.id)
        .gte("observed_date", new Date(now.getTime() - 9 * 86_400_000).toISOString().slice(0, 10));
      const stats = await writeOutcomes(supabase, [outcome], {
        resortsById: new Map([[resort.id, resort]]),
        recentHistory: new Map([
          [
            resort.id,
            ((hist ?? []) as Array<{ observed_date: string; snow_24h_in: number | string | null }>).map((h) => ({
              observed_date: h.observed_date,
              snow_24h_in: h.snow_24h_in === null ? null : Number(h.snow_24h_in),
            })),
          ],
        ]),
      });
      if (!outcome.ok) {
        return json(
          { refreshed: false, reason: "upstream_failed", error: outcome.error, fetched_at: cached?.fetched_at ?? null, age_minutes: ageMin },
          502,
        );
      }
      return json({
        refreshed: true,
        fetched_at: outcome.cacheRow.fetched_at,
        age_minutes: 0,
        source: outcome.cacheRow.fetch_source,
        warnings: outcome.warnings,
        db_errors: stats.dbErrors,
      });
    } catch (e) {
      return json({ refreshed: false, reason: "error", error: errorText(e) }, 500);
    } finally {
      inFlight.delete(resort.id);
    }
  })();
  inFlight.set(resort.id, work);
  return work;
}
