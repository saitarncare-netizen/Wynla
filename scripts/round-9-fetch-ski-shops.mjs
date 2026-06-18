// Round 9 (2026-06) — OSM ski/snowboard SHOP sweep.
//
// Skiers want to know where to buy (or rent) gear near a resort — a
// category the main nearby sweep missed (it only pulled shop=outdoor/
// mall as generic "shopping"). This queries shop=ski + shop=sports
// within RADIUS of each resort and writes them as activity rows with
// category "ski_shop". Same 2-mirror / timeout / resume / incremental
// design as round-9-fetch-nearby.mjs.
//
// Run:  node scripts/round-9-fetch-ski-shops.mjs

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTDIR = join(ROOT, "output");

const SUPABASE_URL = "https://yhmzkeeaiknsotydaucs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlobXprZWVhaWtuc290eWRhdWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NTAyMTcsImV4cCI6MjA5MzMyNjIxN30.7s8DMxVY3Qsijw9p90AIwxdECvs3AZfbwFMP10JB88c";

const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const RADIUS_M = 25000;
const MAX_PER_RESORT = 5;
const CONCURRENCY = MIRRORS.length;
const JITTER_MS = 2500;
const RETRY_DELAY_MS = 12000;
const USER_AGENT = "Wynla/1.0 ski-shop-fetch (+https://wynla.app)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function jitter() { return sleep(JITTER_MS + Math.floor(Math.random() * 1200)); }

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

async function fetchResorts() {
  const url = `${SUPABASE_URL}/rest/v1/resorts?select=id,slug,name,state,latitude,longitude&active=eq.true&latitude=not.is.null&longitude=not.is.null&order=id`;
  const res = await fetch(url, { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } });
  if (!res.ok) throw new Error(`Supabase fetch: ${res.status}`);
  const rows = await res.json();
  return rows.map((r) => ({ id: r.id, slug: r.slug, name: r.name, state: r.state, lat: Number(r.latitude), lng: Number(r.longitude) }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}

async function queryOverpass(resort, overpassUrl, attempt = 1) {
  const { lat, lng } = resort;
  const q = `
    [out:json][timeout:25];
    (
      node["shop"="ski"](around:${RADIUS_M},${lat},${lng});
      way["shop"="ski"](around:${RADIUS_M},${lat},${lng});
      node["shop"="sports"](around:${RADIUS_M},${lat},${lng});
      way["shop"="sports"](around:${RADIUS_M},${lat},${lng});
    );
    out tags center;
  `;
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), 35_000);
  try {
    const res = await fetch(overpassUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", "User-Agent": USER_AGENT },
      body: "data=" + encodeURIComponent(q),
      signal: ctrl.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      if ((res.status === 429 || res.status >= 500) && attempt <= 4) {
        await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
        return queryOverpass(resort, overpassUrl, attempt + 1);
      }
      throw new Error(`overpass ${res.status} for ${resort.slug}`);
    }
    return await res.json();
  } catch (e) {
    clearTimeout(timeoutId);
    if (attempt <= 4) {
      await sleep(RETRY_DELAY_MS * Math.pow(2, attempt - 1));
      return queryOverpass(resort, overpassUrl, attempt + 1);
    }
    throw e;
  }
}

function elemLatLng(el) {
  if (el.lat != null && el.lon != null) return [el.lat, el.lon];
  if (el.center) return [el.center.lat, el.center.lon];
  return [null, null];
}

function confidence({ distanceKm, hasName, hasWebsite, hasTags }) {
  let s = 0.6;
  if (hasName) s += 0.15;
  if (hasWebsite) s += 0.1;
  if (hasTags) s += 0.05;
  if (distanceKm <= 20) s += 0.05;
  if (distanceKm <= 10) s += 0.05;
  return Math.min(1, Math.round(s * 100) / 100);
}

function buildRecord(resort, el) {
  const tags = el.tags || {};
  // shop=sports is broad; keep it only when it plausibly sells ski/board
  // gear (explicit sport tag, or the name hints at it). shop=ski always
  // qualifies. Avoids tagging a random soccer/gym shop as a ski shop.
  if (tags.shop === "sports") {
    const sport = (tags.sport || "").toLowerCase();
    const name = (tags.name || "").toLowerCase();
    const skiHint = /ski|snowboard|board|snow|alpine|nordic|winter/;
    if (!(skiHint.test(sport) || skiHint.test(name))) return null;
  }
  const [lat, lng] = elemLatLng(el);
  if (lat == null || lng == null) return null;
  const name = (tags.name || tags["name:en"] || "").trim();
  if (!name || name.length < 2) return null;
  const km = distanceKm(resort.lat, resort.lng, lat, lng);
  if (km > RADIUS_M / 1000) return null;
  const rents = /(rental|rent|hire)/i.test(JSON.stringify(tags));
  return {
    resort_id: resort.id,
    name,
    category: "ski_shop",
    description: rents ? "Gear shop · rentals available" : "Ski / snowboard gear",
    distance_km: km,
    drive_minutes: Math.round((km / 55) * 60),
    latitude: lat,
    longitude: lng,
    osm_id: el.id ?? null,
    website_url: tags.website || tags["contact:website"] || null,
    source: "osm",
    confidence_score: confidence({
      distanceKm: km, hasName: !!name,
      hasWebsite: !!(tags.website || tags["contact:website"]),
      hasTags: Object.keys(tags).length > 4,
    }),
    kind: "activity",
  };
}

async function processResort(resort, overpassUrl) {
  const raw = await queryOverpass(resort, overpassUrl);
  const elements = raw.elements ?? [];
  const records = [];
  for (const el of elements) {
    const r = buildRecord(resort, el);
    if (r) records.push(r);
  }
  records.sort((a, b) => a.distance_km - b.distance_km);
  const seen = new Set();
  const kept = [];
  for (const r of records) {
    if (r.osm_id != null) { if (seen.has(r.osm_id)) continue; seen.add(r.osm_id); }
    kept.push(r);
    if (kept.length >= MAX_PER_RESORT) break;
  }
  return kept;
}

async function runWithConcurrency(items, fn, concurrency) {
  const results = [];
  let i = 0;
  async function worker(id) {
    while (i < items.length) {
      const idx = i++;
      try {
        const r = await fn(items[idx], idx, id);
        results.push(r);
        const done = results.length;
        if (done % 20 === 0 || done === items.length) {
          process.stdout.write(`  [${done}/${items.length}] worker ${id} finished ${items[idx].slug}\n`);
        }
      } catch (e) {
        console.error(`  ! failed ${items[idx].slug}: ${e.message}`);
      }
      await jitter();
    }
  }
  await Promise.all(Array.from({ length: concurrency }, (_, k) => worker(k + 1)));
  return results;
}

const PROGRESS_PATH = join(OUTDIR, "round-9-ski-shops-progress.json");
function loadProgress() {
  if (!existsSync(PROGRESS_PATH)) return { records: [], done: [] };
  try {
    const blob = JSON.parse(readFileSync(PROGRESS_PATH, "utf8"));
    return { records: Array.isArray(blob.records) ? blob.records : [], done: Array.isArray(blob.done) ? blob.done : [] };
  } catch { return { records: [], done: [] }; }
}
function saveProgress(state) { writeFileSync(PROGRESS_PATH, JSON.stringify(state)); }

async function main() {
  console.log("> fetching resorts...");
  const resorts = await fetchResorts();
  console.log(`  ${resorts.length} active resorts`);
  mkdirSync(OUTDIR, { recursive: true });
  const state = loadProgress();
  const doneSet = new Set(state.done);
  if (doneSet.size > 0) console.log(`> resuming — skipping ${doneSet.size} already-done resorts`);
  const work = resorts.filter((r) => !doneSet.has(r.id));
  console.log(`> querying Overpass (shop=ski|sports) for ${work.length} resorts (concurrency=${CONCURRENCY})`);

  async function processAndSave(resort, idx, workerId) {
    const mirror = MIRRORS[(workerId - 1) % MIRRORS.length];
    const recs = await processResort(resort, mirror);
    state.records.push(...recs);
    state.done.push(resort.id);
    saveProgress(state);
    return recs;
  }
  await runWithConcurrency(work, processAndSave, CONCURRENCY);

  console.log(`> ski_shop total: ${state.records.length} across ${new Set(state.records.map(r => r.resort_id)).size} resorts`);
  console.log(`> progress saved to ${PROGRESS_PATH}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
