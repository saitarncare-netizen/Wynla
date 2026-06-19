// Round 9 (2026-06) — Google Places "Recommended" enrichment.
//
// For each nearby place (restaurants + activities), look up its real
// Google rating + review count ONCE via Places API (New) searchText,
// and decide whether to flag it "⭐ Recommended". Per Google Maps
// Platform terms we do NOT persist the rating/review values — only the
// derived editorial flag (is_recommended) + the place_id (which the
// terms allow caching indefinitely). The live rating/reviews stay one
// tap away on Google Maps (the card already links there).
//
// Output: output/round-9-google-progress.json
//   { done:[rowKeys], flagRest:[ids], flagAct:[ids], pidRest:{id:pid}, pidAct:{id:pid}, calls:N }
// Resumable + incremental. The DB write (set is_recommended) is a
// separate step (compact UPDATE ... WHERE id IN (...) via MCP/PostgREST)
// so this script needs only the read-only anon key + the Places key.
//
// Run:  GOOGLE_PLACES_API_KEY=... node scripts/round-9-enrich-google.mjs

import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUTDIR = join(ROOT, "output");

const SUPABASE_URL = "https://yhmzkeeaiknsotydaucs.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlobXprZWVhaWtuc290eWRhdWNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NTAyMTcsImV4cCI6MjA5MzMyNjIxN30.7s8DMxVY3Qsijw9p90AIwxdECvs3AZfbwFMP10JB88c";

const GKEY = process.env.GOOGLE_PLACES_API_KEY;
if (!GKEY) { console.error("missing GOOGLE_PLACES_API_KEY"); process.exit(1); }

// Recommendation threshold — genuinely good + enough reviews to trust.
const MIN_RATING = 4.3;
const MIN_REVIEWS = 25;
const MATCH_RADIUS_M = 800;   // a search hit farther than this isn't our place
const CONCURRENCY = 3;        // new-project Places quota 429s above ~5 QPS
const PER_CALL_DELAY = 150;   // gentle pacing per worker
const PER_CALL_TIMEOUT = 15000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function distM(lat1, lng1, lat2, lng2) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function fetchRows(table) {
  const cols = "id,name,latitude,longitude,category,resort_id,distance_km";
  const out = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${cols}&order=id`, {
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, Range: `${from}-${from + PAGE - 1}` },
    });
    if (!res.ok) throw new Error(`${table} fetch ${res.status}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < PAGE) break;
  }
  return out;
}

async function placeLookup(row, attempt = 1) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), PER_CALL_TIMEOUT);
  try {
    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": GKEY,
        "X-Goog-FieldMask": "places.id,places.rating,places.userRatingCount,places.location",
      },
      body: JSON.stringify({
        textQuery: row.name,
        maxResultCount: 1,
        locationBias: {
          circle: {
            center: { latitude: Number(row.latitude), longitude: Number(row.longitude) },
            radius: 1500,
          },
        },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (res.status === 429 || res.status >= 500) {
      if (attempt <= 4) { await sleep(1500 * Math.pow(2, attempt - 1)); return placeLookup(row, attempt + 1); }
      throw new Error(`places ${res.status}`);
    }
    if (!res.ok) throw new Error(`places ${res.status} ${(await res.text()).slice(0, 160)}`);
    const data = await res.json();
    return (data.places && data.places[0]) || null;
  } catch (e) {
    clearTimeout(t);
    if (attempt <= 4 && e.name === "AbortError") { await sleep(1500 * attempt); return placeLookup(row, attempt + 1); }
    throw e;
  }
}

const PROGRESS = join(OUTDIR, "round-9-google-progress.json");
function load() {
  // matches: { rowKey -> { t:'r'|'a', id, r:rating, c:reviewCount, pid } }.
  // Stored locally only (NOT in the product DB) so the Recommended
  // threshold can be re-tuned without re-paying for Places lookups.
  if (!existsSync(PROGRESS)) return { done: [], matches: {}, calls: 0 };
  try { return JSON.parse(readFileSync(PROGRESS, "utf8")); } catch { return { done: [], matches: {}, calls: 0 }; }
}
function save(s) { writeFileSync(PROGRESS, JSON.stringify(s)); }

async function runPool(items, fn, conc) {
  let i = 0, n = 0, consec429 = 0, abort = false;
  async function worker() {
    while (i < items.length && !abort) {
      const idx = i++;
      try {
        await fn(items[idx]);
        consec429 = 0;
      } catch (e) {
        console.error(`  ! ${items[idx].key}: ${e.message}`);
        // Circuit breaker: a wall of 429s means the daily quota is gone
        // (project not card-verified, or limit hit) — bail instead of
        // grinding through thousands of failing calls for hours.
        if (/429/.test(e.message)) {
          if (++consec429 >= 25) { abort = true; console.error("  ✋ aborting — 25 consecutive 429s (quota wall). Re-run after the quota is raised."); }
        } else consec429 = 0;
      }
      await sleep(PER_CALL_DELAY);
      if (++n % 200 === 0) console.log(`  ${n}/${items.length}`);
    }
  }
  await Promise.all(Array.from({ length: conc }, worker));
  return abort;
}

async function main() {
  mkdirSync(OUTDIR, { recursive: true });
  console.log("> fetching rows...");
  const rest = (await fetchRows("nearby_restaurants")).map((r) => ({ ...r, table: "r", key: "r" + r.id }));
  const act = (await fetchRows("nearby_activities")).map((r) => ({ ...r, table: "a", key: "a" + r.id }));
  let all = [...rest, ...act].filter((r) => r.latitude != null && r.longitude != null);

  // Cost cap: only enrich the CLOSEST few per (table, resort, category).
  // Keeps the Places bill comfortably inside the $300 free trial while
  // still flagging recommendations among the most-likely-visited picks.
  const PER_GROUP = 3;
  const groups = new Map();
  for (const r of all) {
    const k = `${r.table}:${r.resort_id}:${r.category}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(r);
  }
  const capped = [];
  for (const arr of groups.values()) {
    arr.sort((a, b) => (a.distance_km ?? 1e9) - (b.distance_km ?? 1e9));
    for (const r of arr.slice(0, PER_GROUP)) capped.push(r);
  }
  all = capped;
  console.log(`  ${rest.length} restaurants + ${act.length} activities → ${all.length} to enrich (closest ${PER_GROUP}/category)`);

  const state = load();
  const doneSet = new Set(state.done);
  const work = all.filter((r) => !doneSet.has(r.key));
  console.log(`> ${work.length} to look up (resuming, ${doneSet.size} done). threshold: ${MIN_RATING}★ & ${MIN_REVIEWS}+ reviews`);

  const aborted = await runPool(work, async (row) => {
    const p = await placeLookup(row);
    state.calls++;
    if (p && p.location && p.id) {
      const d = distM(Number(row.latitude), Number(row.longitude), p.location.latitude, p.location.longitude);
      if (d <= MATCH_RADIUS_M) {
        state.matches[row.key] = { t: row.table, id: row.id, r: p.rating ?? null, c: p.userRatingCount ?? null, pid: p.id };
      }
    }
    state.done.push(row.key);
    if (state.done.length % 50 === 0) save(state);
  }, CONCURRENCY);

  save(state);
  if (aborted) console.log("> ABORTED on quota wall — progress saved, resume after quota is raised.");
  const m = Object.values(state.matches);
  const wouldFlag = m.filter((x) => x.r != null && x.c != null && x.r >= MIN_RATING && x.c >= MIN_REVIEWS);
  console.log(`> done. calls=${state.calls} | matched ${m.length} | would-flag @ ${MIN_RATING}/${MIN_REVIEWS}: ${wouldFlag.length} (rest ${wouldFlag.filter(x=>x.t==='r').length} / act ${wouldFlag.filter(x=>x.t==='a').length})`);
}

main().catch((e) => { console.error(e); process.exit(1); });
