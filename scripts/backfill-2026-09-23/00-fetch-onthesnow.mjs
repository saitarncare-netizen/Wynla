// Step 0 — pull the public OnTheSnow resort pages into a local cache.
//
// Why: OnTheSnow publishes, per resort, the projected 2026-27 opening and
// closing dates plus a stats block (lifts, trails, acres, base, summit,
// vertical, average snowfall) and the terrain mix (% beginner / intermediate
// / advanced / expert). Steps 02, 05 and 06 read this cache instead of
// hitting the network again, so every value we write can be traced to a
// source URL in the report.
//
// Read-only against our DB. One request per page with a polite delay.
// Output: reports/onthesnow-cache.json (committed as evidence).
//   node scripts/backfill-2026-09-23/00-fetch-onthesnow.mjs [--refresh]

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { select, sleep, REPORT_DIR } from "./_lib.mjs";

const CACHE = path.join(REPORT_DIR, "onthesnow-cache.json");
const REFRESH = process.argv.includes("--refresh");
const DELAY_MS = 1500;
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) WynlaDataBackfill/1.0 (+https://wynla.app)";

// OnTheSnow uses full state names as URL slugs.
const STATE_SLUG = {
  AK: "alaska", AL: "alabama", AZ: "arizona", CA: "california", CO: "colorado", CT: "connecticut",
  IA: "iowa", ID: "idaho", IL: "illinois", IN: "indiana", MA: "massachusetts", MD: "maryland",
  ME: "maine", MI: "michigan", MN: "minnesota", MO: "missouri", MT: "montana", NC: "north-carolina",
  ND: "north-dakota", NH: "new-hampshire", NJ: "new-jersey", NM: "new-mexico", NV: "nevada",
  NY: "new-york", OH: "ohio", OR: "oregon", PA: "pennsylvania", SD: "south-dakota", TN: "tennessee",
  UT: "utah", VA: "virginia", VT: "vermont", WA: "washington", WI: "wisconsin", WV: "west-virginia",
  WY: "wyoming",
};

async function getHtml(url) {
  const res = await fetch(url, { headers: { "user-agent": UA, accept: "text/html" } });
  if (!res.ok) return { status: res.status, html: null };
  return { status: res.status, html: await res.text() };
}

const decode = (s) =>
  s
    .replace(/&#x27;|&rsquo;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .trim();

/** State "projected openings" table -> [{ name, path, projected_open }]. */
function parseStatePage(html) {
  const out = [];
  const re = /<a[^>]+href="(\/[a-z-]+\/[a-z0-9-]+\/ski-resort)">([^<]+)<\/a><\/th><td[^>]*>([^<]*)<\/td>/g;
  for (const m of html.matchAll(re)) {
    out.push({ name: decode(m[2]), path: m[1], projected_open: decode(m[3]) || null });
  }
  return out;
}

const toInt = (s) => {
  const n = Number(String(s).replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && String(s).match(/\d/) ? Math.round(n) : null;
};

/** Resort page -> stats block + terrain percentages. */
function parseResortPage(html) {
  const dl = {};
  for (const m of html.matchAll(/<dt[^>]*>([^<]+)<\/dt><dd[^>]*>([^<]+)<\/dd>/g)) {
    dl[decode(m[1])] = decode(m[2]);
  }
  const pct = (label) => {
    // Markup: ...<span>Beginners Runs</span>...<span>17%</span> — the label
    // and value are separated by a few tags, never by another label.
    const m = html.match(new RegExp(`${label} Runs[^%]{0,400}?(\\d{1,3})%`));
    return m ? Number(m[1]) : null;
  };
  return {
    projected_open: dl["Projected Opening"] ?? null,
    projected_close: dl["Projected Closing"] ?? null,
    lifts: toInt(dl.Lifts),
    trails: toInt(dl.Trails),
    acres: toInt(dl["Skiable Terrain"]),
    base_ft: toInt(dl.Base),
    summit_ft: toInt(dl.Summit),
    vertical_ft: toInt(dl["Vertical Drop"]),
    snowfall_in: toInt(dl["Average Snowfall"]),
    pct_beginner: pct("Beginners"),
    pct_intermediate: pct("Intermediate"),
    pct_advanced: pct("Advanced"),
    pct_expert: pct("Expert"),
  };
}

// Name normaliser for matching DB names to OnTheSnow names within a state.
export function normName(s) {
  return String(s)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’.]/g, "")
    .replace(/\b(ski|snowboard|snow|resort|resorts|area|areas|mountain|mountains|mtn|mt|park|hill|the|of|at|and|winter|sports|complex|inc|recreation|center|centre|family|ski area)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const cache = !REFRESH && existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")) : { fetched_at: null, states: {}, resorts: {} };
const save = () => (mkdirSync(REPORT_DIR, { recursive: true }), writeFileSync(CACHE, JSON.stringify({ ...cache, fetched_at: new Date().toISOString() }, null, 2)));

const resorts = await select(
  "resorts",
  "select=id,slug,name,state,onthesnow_url,passes,tier&active=eq.true&order=id.asc",
);

// 1) State tables (one request per state present in the DB).
for (const code of [...new Set(resorts.map((r) => r.state))].sort()) {
  const slug = STATE_SLUG[code];
  if (!slug || cache.states[code]) continue;
  const url = `https://www.onthesnow.com/${slug}/projected-openings`;
  const { status, html } = await getHtml(url);
  cache.states[code] = { url, status, rows: html ? parseStatePage(html) : [] };
  console.log(`state ${code}: ${status} ${cache.states[code].rows.length} rows`);
  save();
  await sleep(DELAY_MS);
}

// 2) Resort pages: stored onthesnow_url first, else a same-state name match
//    from the state table (exact normalised name, or unique substring).
// Rows whose only OnTheSnow candidate is a different area sharing the
// name (Woodward Park City is a separate action-sports hill, not Park
// City Mountain). Reviewed by hand on 2026-09-23.
const NEVER_MATCH = new Set(["woodward-park-city"]);

function matchPath(r) {
  if (NEVER_MATCH.has(r.slug)) return null;
  const rows = cache.states[r.state]?.rows ?? [];
  const want = normName(r.name);
  if (want.length < 4) return null;
  const exact = rows.filter((x) => normName(x.name) === want);
  if (exact.length === 1) return exact[0].path;
  // Loose: one name contains the other. Both sides must keep a real
  // word after normalisation — "Winter Park" normalises to "" and would
  // otherwise swallow every small Colorado hill.
  const loose = rows.filter((x) => {
    const n = normName(x.name);
    return n.length >= 4 && (n.includes(want) || want.includes(n));
  });
  return loose.length === 1 ? loose[0].path : null;
}

// --rematch: throw away the name-matched entries (not the ones from a
// stored onthesnow_url) so a fixed matcher can redo them.
if (process.argv.includes("--rematch")) {
  for (const [slug, e] of Object.entries(cache.resorts)) {
    if (e.matched_by !== "onthesnow_url") delete cache.resorts[slug];
  }
}

let done = 0;
for (const r of resorts) {
  if (cache.resorts[r.slug] && !REFRESH) continue;
  const url = r.onthesnow_url || (matchPath(r) ? `https://www.onthesnow.com${matchPath(r)}` : null);
  if (!url) {
    cache.resorts[r.slug] = { id: r.id, url: null, status: null, matched_by: "none" };
    continue;
  }
  const { status, html } = await getHtml(url);
  cache.resorts[r.slug] = {
    id: r.id,
    url,
    status,
    matched_by: r.onthesnow_url ? "onthesnow_url" : "state-table-name",
    ...(html ? parseResortPage(html) : {}),
  };
  done += 1;
  console.log(`${String(done).padStart(3)} ${r.slug.padEnd(34)} ${status} open=${cache.resorts[r.slug].projected_open ?? "-"} close=${cache.resorts[r.slug].projected_close ?? "-"}`);
  save();
  await sleep(DELAY_MS);
}
save();

const withUrl = Object.values(cache.resorts).filter((x) => x.url).length;
const ok = Object.values(cache.resorts).filter((x) => x.status === 200).length;
console.log(`\nresorts: ${resorts.length}, with a page: ${withUrl}, fetched OK: ${ok}. Cache -> ${path.relative(process.cwd(), CACHE)}`);
