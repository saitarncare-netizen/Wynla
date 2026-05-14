// Stage 33 — daily snow-conditions scraper.
//
// Vercel cron hits this at 11:30 UTC, 30 min before refresh-weather and
// 90 min before check-snow-alerts. We populate the columns added in
// stage-26-schema.sql (snow_base_depth_in, snow_new_24h_in, ...,
// snow_report_status, snow_report_updated_at) by:
//
//   1. Scraping each resort's OnTheSnow.com snow-report page.
//   2. Caching the discovered URL in resorts.onthesnow_url so we don't
//      re-probe on every run.
//   3. Falling back to Open-Meteo's previous-day snowfall_sum when
//      OnTheSnow fails (404, 5xx, parse failure). The fallback gives us
//      rough 24h snow + sets status="unknown"; lifts/trails stay null.
//   4. Bailing the whole run if OnTheSnow rate-limits us (403/429) so we
//      don't burn through all 442 resorts antagonising their CDN.
//
// Env vars (same as refresh-weather):
//   CRON_SECRET                 matches Vercel cron Authorization header
//   NEXT_PUBLIC_SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY   service-role client; updates resorts rows
//
// Output JSON: { ok, scraped, fallback, failed, total, rateLimited? }.

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseOnTheSnowHTML, type SnowReport } from "@/lib/onthesnowParser";
import { US_STATES } from "@/lib/usStates";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — 442 resorts × concurrency-4, ~2s/req.

const USER_AGENT = "Wynla/1.0 (+https://ridewise-rcko.vercel.app)";
const CONCURRENCY = 4;
const FETCH_TIMEOUT_MS = 10_000;
const REVERIFY_404_AFTER_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

type Resort = {
  id: number;
  slug: string;
  name: string;
  state: string | null;
  latitude: number | string | null;
  longitude: number | string | null;
  onthesnow_url: string | null;
  onthesnow_url_verified_at: string | null;
  onthesnow_last_404_at: string | null;
};

type ResortUpdate = {
  id: number;
  snow_base_depth_in: number | null;
  snow_new_24h_in: number | null;
  snow_new_48h_in: number | null;
  snow_new_7d_in: number | null;
  trails_open_today: number | null;
  lifts_open_today: number | null;
  snow_report_status: SnowReport["snow_report_status"] | null;
  snow_report_updated_at: string;
  // URL discovery columns — only set when changed.
  onthesnow_url?: string | null;
  onthesnow_url_verified_at?: string | null;
  onthesnow_last_404_at?: string | null;
};

// Slugify a resort name OnTheSnow-style: lowercase, strip apostrophes /
// ampersands / periods, dashes for spaces, collapse multi-dashes.
function slugifyResort(name: string): string {
  return name
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/&/g, "and")
    .replace(/[.,/\\(){}[\]:;!?]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function stateSlug(stateCode: string | null): string | null {
  if (!stateCode) return null;
  const name = US_STATES[stateCode.toUpperCase()];
  if (!name) return null;
  return name.toLowerCase().replace(/\s+/g, "-");
}

// Strip generic "ski resort" / "mountain resort" suffixes — many
// OnTheSnow slugs drop these (e.g. "Park City Mountain Resort" → "park-city").
function trimSlugSuffix(slug: string): string {
  return slug
    .replace(/-(?:mountain-resort|ski-resort|ski-area|mountain|resort)$/i, "")
    .replace(/-+$/, "");
}

// Build a small ordered list of OnTheSnow URLs to probe. Empirically
// (sitemap scan + sampling 12 resorts) OnTheSnow uses
// `/{state-slug}/{resort-slug}/ski-resort` where the resort-slug often
// has — but sometimes lacks — a `-ski-area` / `-ski-resort` / `-resort`
// suffix. We try base-slug first, then trimmed, then add suffixes back.
// Cap at ~6 attempts per resort to keep discovery polite.
function candidateUrls(resort: Resort): string[] {
  const baseSlug = slugifyResort(resort.name);
  if (!baseSlug) return [];
  const trimmed = trimSlugSuffix(baseSlug);
  const st = stateSlug(resort.state);

  const slugVariants = new Set<string>();
  slugVariants.add(baseSlug);
  if (trimmed) slugVariants.add(trimmed);
  // Add common suffix variants when the resort's name doesn't already
  // include them. Helps "Mammoth Mountain" → "mammoth-mountain-ski-area".
  const root = trimmed || baseSlug;
  for (const suffix of ["ski-area", "ski-resort", "resort", "mountain-resort"]) {
    if (!baseSlug.endsWith(`-${suffix}`)) {
      slugVariants.add(`${root}-${suffix}`);
    }
  }

  const out: string[] = [];
  for (const s of slugVariants) {
    if (st) out.push(`https://www.onthesnow.com/${st}/${s}/ski-resort`);
  }
  // No-state-slug variant as a last resort (covers a few legacy paths).
  if (st) out.push(`https://www.onthesnow.com/${st}/${baseSlug}/ski-resort`);
  return out.slice(0, 6);
}

type FetchOutcome =
  | { kind: "ok"; html: string; url: string }
  | { kind: "404"; url: string }
  | { kind: "blocked"; status: number; url: string }
  | { kind: "error"; url: string; reason: string };

async function fetchHtml(url: string, signal: AbortSignal): Promise<FetchOutcome> {
  try {
    const r = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal,
    });
    if (r.status === 404) return { kind: "404", url };
    if (r.status === 403 || r.status === 429) {
      return { kind: "blocked", status: r.status, url };
    }
    if (!r.ok) return { kind: "error", url, reason: `${r.status} ${r.statusText}` };
    const html = await r.text();
    return { kind: "ok", html, url };
  } catch (e) {
    return { kind: "error", url, reason: String((e as Error)?.message ?? e).slice(0, 120) };
  }
}

function withTimeout(ms: number): { signal: AbortSignal; cancel: () => void } {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), ms);
  return { signal: ac.signal, cancel: () => clearTimeout(t) };
}

async function jitter(): Promise<void> {
  const ms = 50 + Math.floor(Math.random() * 150);
  await new Promise((r) => setTimeout(r, ms));
}

async function openMeteoFallback(
  lat: number,
  lng: number,
): Promise<{ snow_new_24h_in: number | null }> {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}` +
    `&daily=snowfall_sum&past_days=1&forecast_days=1` +
    `&precipitation_unit=inch&timezone=auto`;
  const { signal, cancel } = withTimeout(FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { "User-Agent": USER_AGENT }, signal });
    if (!r.ok) return { snow_new_24h_in: null };
    const j = (await r.json()) as { daily?: { snowfall_sum?: (number | null)[] } };
    const arr = j?.daily?.snowfall_sum ?? [];
    // past_days=1 → arr[0] is yesterday, arr[1] would be today's forecast.
    const yesterday = typeof arr[0] === "number" ? arr[0] : null;
    if (yesterday == null || !Number.isFinite(yesterday)) return { snow_new_24h_in: null };
    return { snow_new_24h_in: Math.max(0, Math.round(yesterday)) };
  } catch {
    return { snow_new_24h_in: null };
  } finally {
    cancel();
  }
}

type RunState = {
  scraped: number;
  fallback: number;
  failed: number;
  rateLimited: boolean;
};

async function scrapeOne(
  resort: Resort,
  state: RunState,
): Promise<ResortUpdate | null> {
  if (state.rateLimited) return null; // bail short once we've hit a block

  const now = new Date().toISOString();
  let workingUrl: string | null = resort.onthesnow_url;
  let urlJustVerified = false;
  let urlJustFailed = false;

  // Discovery path: if no cached URL, try a small set of guesses
  // (unless we 404'd recently and should give it a rest).
  if (!workingUrl) {
    const recently404 =
      resort.onthesnow_last_404_at &&
      Date.now() - new Date(resort.onthesnow_last_404_at).getTime() < REVERIFY_404_AFTER_MS;
    if (!recently404) {
      const candidates = candidateUrls(resort);
      for (const url of candidates) {
        if (state.rateLimited) break;
        const { signal, cancel } = withTimeout(FETCH_TIMEOUT_MS);
        const res = await fetchHtml(url, signal);
        cancel();
        await jitter();
        if (res.kind === "ok") {
          workingUrl = res.url;
          urlJustVerified = true;
          // We'll parse the same HTML below instead of re-fetching.
          const parsed = parseOnTheSnowHTML(res.html);
          state.scraped++;
          return {
            id: resort.id,
            snow_base_depth_in: parsed.snow_base_depth_in,
            snow_new_24h_in: parsed.snow_new_24h_in,
            snow_new_48h_in: parsed.snow_new_48h_in,
            snow_new_7d_in: parsed.snow_new_7d_in,
            trails_open_today: parsed.trails_open_today,
            lifts_open_today: parsed.lifts_open_today,
            snow_report_status: parsed.snow_report_status,
            snow_report_updated_at: now,
            onthesnow_url: workingUrl,
            onthesnow_url_verified_at: now,
            onthesnow_last_404_at: null,
          };
        }
        if (res.kind === "blocked") {
          state.rateLimited = true;
          break;
        }
        // 404 / error → try next candidate
      }
      if (!workingUrl) urlJustFailed = true;
    }
  }

  // Cached URL path.
  if (workingUrl && !state.rateLimited) {
    const { signal, cancel } = withTimeout(FETCH_TIMEOUT_MS);
    const res = await fetchHtml(workingUrl, signal);
    cancel();
    await jitter();
    if (res.kind === "ok") {
      const parsed = parseOnTheSnowHTML(res.html);
      state.scraped++;
      return {
        id: resort.id,
        snow_base_depth_in: parsed.snow_base_depth_in,
        snow_new_24h_in: parsed.snow_new_24h_in,
        snow_new_48h_in: parsed.snow_new_48h_in,
        snow_new_7d_in: parsed.snow_new_7d_in,
        trails_open_today: parsed.trails_open_today,
        lifts_open_today: parsed.lifts_open_today,
        snow_report_status: parsed.snow_report_status,
        snow_report_updated_at: now,
        ...(urlJustVerified ? { onthesnow_url_verified_at: now } : {}),
      };
    }
    if (res.kind === "blocked") {
      state.rateLimited = true;
    } else if (res.kind === "404") {
      // The previously cached URL stopped working — clear it so next
      // run does discovery again.
      urlJustFailed = true;
      workingUrl = null;
    }
  }

  // Fallback: Open-Meteo prior-day snowfall.
  const lat = resort.latitude != null ? Number(resort.latitude) : NaN;
  const lng = resort.longitude != null ? Number(resort.longitude) : NaN;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    state.failed++;
    return {
      id: resort.id,
      snow_base_depth_in: null,
      snow_new_24h_in: null,
      snow_new_48h_in: null,
      snow_new_7d_in: null,
      trails_open_today: null,
      lifts_open_today: null,
      snow_report_status: "unknown",
      snow_report_updated_at: now,
      ...(urlJustFailed
        ? { onthesnow_url: null, onthesnow_last_404_at: now }
        : {}),
    };
  }

  const meteo = await openMeteoFallback(lat, lng);
  state.fallback++;
  return {
    id: resort.id,
    snow_base_depth_in: null,
    snow_new_24h_in: meteo.snow_new_24h_in,
    snow_new_48h_in: null,
    snow_new_7d_in: null,
    trails_open_today: null,
    lifts_open_today: null,
    snow_report_status: "unknown",
    snow_report_updated_at: now,
    ...(urlJustFailed
      ? { onthesnow_url: null, onthesnow_last_404_at: now }
      : {}),
  };
}

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return NextResponse.json({ ok: false, reason: "missing supabase env" }, { status: 500 });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  });

  const { data: resortsData, error } = await supabase
    .from("resorts")
    .select(
      "id, slug, name, state, latitude, longitude, onthesnow_url, onthesnow_url_verified_at, onthesnow_last_404_at",
    )
    .eq("active", true);
  if (error || !resortsData) {
    return NextResponse.json(
      { ok: false, reason: error?.message ?? "no resorts" },
      { status: 500 },
    );
  }
  const resorts: Resort[] = resortsData as Resort[];

  const state: RunState = { scraped: 0, fallback: 0, failed: 0, rateLimited: false };
  const updates: ResortUpdate[] = [];

  let i = 0;
  async function worker() {
    while (i < resorts.length) {
      const idx = i++;
      if (state.rateLimited) {
        // Once we're rate-limited by OnTheSnow we switch every remaining
        // resort to fallback-only without further OnTheSnow probes.
        const r = resorts[idx];
        const lat = r.latitude != null ? Number(r.latitude) : NaN;
        const lng = r.longitude != null ? Number(r.longitude) : NaN;
        const now = new Date().toISOString();
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          const meteo = await openMeteoFallback(lat, lng);
          state.fallback++;
          updates.push({
            id: r.id,
            snow_base_depth_in: null,
            snow_new_24h_in: meteo.snow_new_24h_in,
            snow_new_48h_in: null,
            snow_new_7d_in: null,
            trails_open_today: null,
            lifts_open_today: null,
            snow_report_status: "unknown",
            snow_report_updated_at: now,
          });
        } else {
          state.failed++;
        }
        continue;
      }
      try {
        const up = await scrapeOne(resorts[idx], state);
        if (up) updates.push(up);
      } catch (e) {
        state.failed++;
        // Log shape mirrored from refresh-weather; never crash the run.
        console.error(
          `[refresh-snow-conditions] resort ${resorts[idx].id} (${resorts[idx].slug}) failed:`,
          String((e as Error)?.message ?? e).slice(0, 160),
        );
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, () => worker()));

  // Upsert resorts rows in chunks. We use update (not upsert) because
  // we're touching an existing row keyed by id, and we don't want to
  // accidentally insert phantom resorts.
  const CHUNK = 100;
  let upsertErrors = 0;
  for (let off = 0; off < updates.length; off += CHUNK) {
    const chunk = updates.slice(off, off + CHUNK);
    // Supabase doesn't support batch UPDATE — do one at a time per row
    // but in parallel within the chunk to keep wall-clock down.
    const results = await Promise.all(
      chunk.map((row) => {
        const { id, ...rest } = row;
        return supabase.from("resorts").update(rest).eq("id", id);
      }),
    );
    for (const r of results) {
      if (r.error) upsertErrors++;
    }
  }

  return NextResponse.json({
    ok: true,
    scraped: state.scraped,
    fallback: state.fallback,
    failed: state.failed,
    total: resorts.length,
    upsertErrors,
    ...(state.rateLimited ? { rateLimited: true } : {}),
  });
}
