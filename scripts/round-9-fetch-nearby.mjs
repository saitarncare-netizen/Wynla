// Round 9 (2026-06) — OSM nearby restaurants + activities sweep.
//
// For each active resort with lat/lng, query Overpass for amenity /
// leisure / tourism / shop / natural POIs within RADIUS_KM. Categorize
// each by OSM tag, score confidence, and write JSON files to
// output/round-9-restaurants.json + output/round-9-activities.json.
//
// Output is a flat array of insert-ready records:
//   { resort_id, name, category, distance_km, drive_minutes,
//     latitude, longitude, osm_id, website_url, source,
//     confidence_score, description }
//
// Run:   node scripts/round-9-fetch-nearby.mjs
// or:    node scripts/round-9-fetch-nearby.mjs --sample 5
//
// Throttle: 2 concurrent Overpass calls + 800ms jitter so we don't
// antagonise the public servers (mainline Overpass + Kumi systems
// rotate; we target overpass-api.de). Failures retry once.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTDIR = join(ROOT, "output");

// CLI flags
const args = process.argv.slice(2);
const SAMPLE = args.includes("--sample") ? Number(args[args.indexOf("--sample") + 1]) : null;

const SUPABASE_URL = "https://yhmzkeeaiknsotydaucs.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlobXprZWVhaWtuc290eWRhdWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NTAyMTcsImV4cCI6MjA5MzMyNjIxN30.7s8DMxVY3Qsijw9p90AIwxdECvs3AZfbwFMP10JB88c";
// Two independent Overpass mirrors. Each concurrent worker is pinned to
// one mirror (worker N -> MIRRORS[N-1]) so every server still sees only
// concurrency=1 from us — same per-server politeness as the original
// single-stream run — while total throughput doubles. (overpass.kumi
// was unreachable on 2026-06-16; maps.mail.ru is a fast healthy clone.)
const MIRRORS = [
  "https://overpass-api.de/api/interpreter",
  "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];
const RADIUS_M = 25000;             // 25 km — comfortable shuttle / morning-stop range
const MAX_PER_CATEGORY = 5;         // shipping cap per category per resort
const CONCURRENCY = MIRRORS.length; // one worker per mirror
const JITTER_MS = 2500;     // overpass-api.de's public load balancer
                            // 429s us at higher rates — 2.5s + jitter
                            // is the sustainable floor for a long run
const RETRY_DELAY_MS = 12000; // back off hard on the first 429 instead
                              // of pounding the retry queue
const USER_AGENT = "Wynla/1.0 nearby-fetch (+https://wynla.app)";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function jitter() { return sleep(JITTER_MS + Math.floor(Math.random() * 1200)); }

// Haversine — distance in km between two lat/lng pairs.
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

// Fetch all resorts with coords (active only).
async function fetchResorts() {
  const url = `${SUPABASE_URL}/rest/v1/resorts?select=id,slug,name,state,latitude,longitude&active=eq.true&latitude=not.is.null&longitude=not.is.null&order=id`;
  const res = await fetch(url, {
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`Supabase fetch: ${res.status}`);
  const rows = await res.json();
  return rows
    .map((r) => ({
      id: r.id, slug: r.slug, name: r.name, state: r.state,
      lat: Number(r.latitude), lng: Number(r.longitude),
    }))
    .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng));
}

// Overpass query for ONE resort against a specific mirror. Returns
// parsed JSON with elements[].
async function queryOverpass(resort, overpassUrl, attempt = 1) {
  const { lat, lng } = resort;
  // Single query combines all amenity classes we care about so each
  // resort costs one Overpass call instead of two.
  const q = `
    [out:json][timeout:25];
    (
      node["amenity"~"^(restaurant|fast_food|cafe|bar|pub|brewery|biergarten|food_court|ice_cream)$"](around:${RADIUS_M},${lat},${lng});
      way["amenity"~"^(restaurant|fast_food|cafe|bar|pub|brewery|biergarten|food_court|ice_cream)$"](around:${RADIUS_M},${lat},${lng});
      node["leisure"~"^(spa|ice_rink|sauna|sports_centre|water_park)$"](around:${RADIUS_M},${lat},${lng});
      node["tourism"~"^(museum|theme_park|attraction|gallery|viewpoint|zoo|aquarium)$"](around:${RADIUS_M},${lat},${lng});
      node["natural"="hot_spring"](around:${RADIUS_M},${lat},${lng});
      node["shop"~"^(mall|department_store|outdoor|farm)$"](around:${RADIUS_M},${lat},${lng});
      node["craft"="brewery"](around:${RADIUS_M},${lat},${lng});
      node["craft"="distillery"](around:${RADIUS_M},${lat},${lng});
      node["craft"="winery"](around:${RADIUS_M},${lat},${lng});
    );
    out tags center;
  `;
  // Client-side timeout — earlier runs hung indefinitely when Overpass
  // accepted the connection then never responded; 35s per attempt + the
  // retry/backoff below caps the worst-case stall at ~4 min per resort.
  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), 35_000);
  try {
    const res = await fetch(overpassUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": USER_AGENT,
      },
      body: "data=" + encodeURIComponent(q),
      signal: ctrl.signal,
    });
    clearTimeout(timeoutId);
    if (!res.ok) {
      if ((res.status === 429 || res.status >= 500) && attempt <= 4) {
        // Exponential backoff for repeated 429s — the public
        // overpass-api.de balancer hands out per-IP quotas and the
        // only kind move is to wait.
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

// Pull the lat/lng of a returned element (nodes have lat/lon; ways
// have center.lat/lon when `out center` was used).
function elemLatLng(el) {
  if (el.lat != null && el.lon != null) return [el.lat, el.lon];
  if (el.center) return [el.center.lat, el.center.lon];
  return [null, null];
}

// Restaurant categorization. Returns 'local' | 'fast_food' | 'family'
// | 'cafe' | 'fine_dining' | null (null = not a restaurant POI).
function categorizeRestaurant(tags) {
  if (!tags) return null;
  const amenity = tags.amenity;
  if (amenity === "fast_food") return "fast_food";
  if (amenity === "cafe" || amenity === "ice_cream") return "cafe";
  if (amenity === "bar" || amenity === "pub" || amenity === "biergarten") return null; // route bars to activities
  if (amenity !== "restaurant" && amenity !== "food_court") return null;
  const cuisine = (tags.cuisine || "").toLowerCase();
  if (/(fine|michelin|tasting_menu|steakhouse)/.test(cuisine)) return "fine_dining";
  if (/(burger|pizza|sandwich|chicken|american|tex-?mex|diner|breakfast|family)/.test(cuisine)) return "family";
  // Default sit-down restaurant = local
  return "local";
}

// Activity categorization. Returns the activity category or null.
function categorizeActivity(tags) {
  if (!tags) return null;
  if (tags.natural === "hot_spring") return "hot_springs";
  if (tags.tourism === "museum" || tags.tourism === "gallery") return "museum";
  // tourism=theme_park was previously mapped to "tubing" but in practice
  // it surfaces go-karts / caverns / haunted houses — not snow tubing.
  // Dropped (wrong > missing). Real tubing hills aren't reliably tagged
  // in OSM, so the "tubing" category ships empty rather than wrong.
  if (tags.craft === "brewery" || tags.amenity === "brewery") return "brewery";
  if (tags.craft === "winery") return "winery";
  if (tags.craft === "distillery") return "brewery";
  if (tags.leisure === "ice_rink") return "ice_skating";
  if (tags.leisure === "spa" || tags.leisure === "sauna" || tags.amenity === "spa") return "spa";
  if (tags.shop === "mall" || tags.shop === "department_store" || tags.shop === "outdoor") return "shopping";
  return null;
}

// Confidence based on how complete the OSM record is.
function confidence({ distanceKm, hasName, hasWebsite, hasTags }) {
  let s = 0.6;
  if (hasName) s += 0.15;
  if (hasWebsite) s += 0.1;
  if (hasTags) s += 0.05;
  if (distanceKm <= 20) s += 0.05;
  if (distanceKm <= 10) s += 0.05;
  return Math.min(1, Math.round(s * 100) / 100);
}

function buildRecord(resort, el, category, kind) {
  const tags = el.tags || {};
  const [lat, lng] = elemLatLng(el);
  if (lat == null || lng == null) return null;
  const name = (tags.name || tags["name:en"] || "").trim();
  if (!name || name.length < 2) return null;
  const km = distanceKm(resort.lat, resort.lng, lat, lng);
  if (km > RADIUS_M / 1000) return null;
  return {
    resort_id: resort.id,
    name,
    category,
    description: tags.cuisine || tags.description || tags["addr:street"] || null,
    distance_km: km,
    drive_minutes: Math.round((km / 55) * 60), // est highway-speed drive (matches Round 7's airport est)
    latitude: lat,
    longitude: lng,
    osm_id: el.id ?? null,
    website_url: tags.website || tags["contact:website"] || null,
    source: "osm",
    confidence_score: confidence({
      distanceKm: km,
      hasName: !!name,
      hasWebsite: !!(tags.website || tags["contact:website"]),
      hasTags: Object.keys(tags).length > 4,
    }),
    kind, // 'restaurant' | 'activity' — split later
  };
}

// Per-resort processing — fetch Overpass, categorize, distance-rank,
// cap to MAX_PER_CATEGORY per category per kind.
async function processResort(resort, overpassUrl) {
  const raw = await queryOverpass(resort, overpassUrl);
  const elements = raw.elements ?? [];
  const records = [];
  for (const el of elements) {
    const restaurantCat = categorizeRestaurant(el.tags);
    const activityCat = categorizeActivity(el.tags);
    if (restaurantCat) {
      const r = buildRecord(resort, el, restaurantCat, "restaurant");
      if (r) records.push(r);
    } else if (activityCat) {
      const r = buildRecord(resort, el, activityCat, "activity");
      if (r) records.push(r);
    }
  }
  // Distance-rank within each (kind, category) bucket and cap.
  const buckets = new Map();
  for (const r of records) {
    const k = `${r.kind}:${r.category}`;
    if (!buckets.has(k)) buckets.set(k, []);
    buckets.get(k).push(r);
  }
  const kept = [];
  for (const [, arr] of buckets) {
    arr.sort((a, b) => a.distance_km - b.distance_km);
    for (const r of arr.slice(0, MAX_PER_CATEGORY)) kept.push(r);
  }
  // Dedup by osm_id within the resort — guards the rare OSM node/way
  // numeric-id collision that would otherwise violate the DB's
  // (resort_id, osm_id) unique index on import.
  const seen = new Set();
  const deduped = [];
  for (const r of kept) {
    if (r.osm_id != null) {
      if (seen.has(r.osm_id)) continue;
      seen.add(r.osm_id);
    }
    deduped.push(r);
  }
  return deduped;
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
        if (done % 10 === 0 || done === items.length) {
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

// Incremental progress file — after each resort we write all
// resort_ids seen so far + their results so a crash or stuck-fetch
// kill doesn't lose hours of work. Resuming reads this and skips
// any resort_id already present.
const PROGRESS_PATH = join(OUTDIR, "round-9-progress.json");

function loadProgress() {
  if (!existsSync(PROGRESS_PATH)) return { records: [], done: [] };
  try {
    const blob = JSON.parse(readFileSync(PROGRESS_PATH, "utf8"));
    return {
      records: Array.isArray(blob.records) ? blob.records : [],
      done: Array.isArray(blob.done) ? blob.done : [],
    };
  } catch {
    return { records: [], done: [] };
  }
}

function saveProgress(state) {
  writeFileSync(PROGRESS_PATH, JSON.stringify(state));
}

async function main() {
  console.log("> fetching resorts...");
  const resorts = await fetchResorts();
  console.log(`  ${resorts.length} active resorts`);

  mkdirSync(OUTDIR, { recursive: true });
  const state = loadProgress();
  const doneSet = new Set(state.done);
  if (doneSet.size > 0) {
    console.log(`> resuming — skipping ${doneSet.size} already-done resorts`);
  }
  const all = SAMPLE ? resorts.slice(0, SAMPLE) : resorts;
  const work = all.filter((r) => !doneSet.has(r.id));
  console.log(`> querying Overpass for ${work.length} remaining resorts (concurrency=${CONCURRENCY})`);

  async function processAndSave(resort, idx, workerId) {
    const mirror = MIRRORS[(workerId - 1) % MIRRORS.length];
    const recs = await processResort(resort, mirror);
    state.records.push(...recs);
    state.done.push(resort.id);
    saveProgress(state);
    return recs;
  }
  await runWithConcurrency(work, processAndSave, CONCURRENCY);

  const restaurants = state.records.filter((r) => r.kind === "restaurant").map(({ kind, ...rest }) => rest);
  const activities = state.records.filter((r) => r.kind === "activity").map(({ kind, ...rest }) => rest);

  writeFileSync(join(OUTDIR, "round-9-restaurants.json"), JSON.stringify(restaurants, null, 2));
  writeFileSync(join(OUTDIR, "round-9-activities.json"), JSON.stringify(activities, null, 2));

  // Per-category counts so we can eyeball coverage before writing to DB.
  const restCats = restaurants.reduce((m, r) => { m[r.category] = (m[r.category] ?? 0) + 1; return m; }, {});
  const actCats = activities.reduce((m, r) => { m[r.category] = (m[r.category] ?? 0) + 1; return m; }, {});
  console.log("> restaurants total:", restaurants.length, restCats);
  console.log("> activities  total:", activities.length, actCats);
  console.log("> wrote output/round-9-restaurants.json + output/round-9-activities.json");
}

main().catch((e) => { console.error(e); process.exit(1); });
