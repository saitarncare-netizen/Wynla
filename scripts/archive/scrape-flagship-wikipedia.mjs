// Pull Wikipedia infobox + lead image for the 20 flagship resorts we want to
// promote to Featured. Output: output/flagship-data.json — one record per slug
// with parsed stats and verified image URL/attribution.
//
// Wikipedia API:
//   /api/rest_v1/page/summary/<title>  → lead image + extract
//   /w/api.php?action=parse&page=<title>&prop=wikitext  → infobox source
//
// We deliberately stay narrow: only the fields we'll write to DB. If Wikipedia
// can't answer cleanly we leave NULL — "wrong > missing".
import { writeFileSync } from "node:fs";

// slug → Wikipedia title (manually mapped — slug vs Wiki title diverges often)
const TARGETS = [
  // Aspen Mountain has the cleanest infobox; Snowmass + 2 others are sister
  // mountains under the same operator. We'll attribute stats to Aspen Mountain
  // and the city/state to Aspen, Colorado in the final SQL.
  { slug: "aspen-snowmass",      wp: "Aspen Mountain (Colorado)" },
  { slug: "jackson-hole",        wp: "Jackson Hole Mountain Resort" },
  { slug: "big-sky",             wp: "Big Sky Resort" },
  { slug: "snowbird",            wp: "Snowbird (ski resort)" },
  { slug: "alta",                wp: "Alta Ski Area" },
  { slug: "telluride",           wp: "Telluride Ski Resort" },
  { slug: "sun-valley",          wp: "Sun Valley Ski Resort" },
  { slug: "snowbasin",           wp: "Snowbasin" },
  { slug: "vail",                wp: "Vail Ski Resort" },
  { slug: "park-city",           wp: "Park City Mountain Resort" },
  { slug: "mammoth-mountain",    wp: "Mammoth Mountain Ski Area" },
  { slug: "beaver-creek",        wp: "Beaver Creek Resort" },
  { slug: "breckenridge",        wp: "Breckenridge Ski Resort" },
  { slug: "crested-butte",       wp: "Crested Butte Mountain Resort" },
  { slug: "killington",          wp: "Killington Ski Resort" },
  { slug: "sunday-river",        wp: "Sunday River (ski resort)" },
  { slug: "sugarloaf",           wp: "Sugarloaf (Maine ski resort)" },
  { slug: "jay-peak",            wp: "Jay Peak Resort" },
  { slug: "bretton-woods",       wp: "Bretton Woods Mountain Resort" },
  { slug: "taos-ski-valley",     wp: "Taos Ski Valley" },
];

// Parse a {{Infobox ...}} block out of wikitext and return its parameters.
// Lightweight — won't handle every quirk but works for ski-resort infoboxes
// which follow `| key = value` line conventions.
function parseInfobox(wikitext) {
  const start = wikitext.search(/\{\{Infobox[^|}]*/i);
  if (start === -1) return null;
  let depth = 0;
  let end = start;
  for (let i = start; i < wikitext.length; i++) {
    if (wikitext[i] === "{" && wikitext[i + 1] === "{") { depth++; i++; }
    else if (wikitext[i] === "}" && wikitext[i + 1] === "}") { depth--; i++; if (depth === 0) { end = i + 1; break; } }
  }
  const block = wikitext.slice(start, end);
  const params = {};
  // split on `|` at depth 0 — ignore | inside [[wiki links]] / templates
  let buf = "";
  let d = 0;
  const parts = [];
  for (let i = 0; i < block.length; i++) {
    const c = block[i];
    const cn = block[i + 1];
    if ((c === "{" && cn === "{") || (c === "[" && cn === "[")) { d++; buf += c + cn; i++; continue; }
    if ((c === "}" && cn === "}") || (c === "]" && cn === "]")) { d--; buf += c + cn; i++; continue; }
    if (c === "|" && d === 1) { parts.push(buf); buf = ""; continue; }
    buf += c;
  }
  parts.push(buf);
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq === -1) continue;
    const k = p.slice(0, eq).trim().toLowerCase().replace(/\s+/g, "_");
    const v = p.slice(eq + 1).trim().replace(/<ref.*?<\/ref>/gs, "").replace(/<ref.*?\/>/g, "").trim();
    params[k] = v;
  }
  return params;
}

// Convert "3,450 ft (1,052 m)" → 3450, "5,317 acres" → 5317, "195" → 195.
// Wikipedia ski-resort infoboxes very commonly wrap numbers in
// {{convert|N|unit|...}} or {{cvt|N|unit|...}}; if we see that pattern, take
// the FIRST positional arg (N) — earlier we were grabbing precision/sigfig
// values like the 2 in {{convert|3450|ft|m|2}}.
function parseInt2(s) {
  if (s === null || s === undefined) return null;
  const str = String(s).replace(/&nbsp;/g, " ");
  const conv = str.match(/\{\{\s*(?:convert|cvt)\s*\|\s*([\d,.]+)/i);
  if (conv) {
    const n = parseInt(conv[1].replace(/,/g, ""), 10);
    return Number.isFinite(n) ? n : null;
  }
  const m = str.match(/[\d,]+/);
  if (!m) return null;
  const n = parseInt(m[0].replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}
function parseFloat2(s) {
  if (s === null || s === undefined) return null;
  const str = String(s).replace(/&nbsp;/g, " ");
  const conv = str.match(/\{\{\s*(?:convert|cvt)\s*\|\s*([\d.,]+)/i);
  if (conv) {
    const n = parseFloat(conv[1].replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }
  const m = str.match(/\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}
// "https://www.example.com" or "[https://www.example.com Label]" → URL
function parseUrl(s) {
  if (!s) return null;
  const m = String(s).match(/https?:\/\/[^\s\]]+/);
  return m ? m[0] : null;
}
function stripWiki(s) {
  if (!s) return null;
  return String(s)
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/'''(.+?)'''/g, "$1")
    .replace(/''(.+?)''/g, "$1")
    .replace(/<br\s*\/?>/gi, " · ")
    .replace(/\{\{[^}]*\}\}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim() || null;
}

async function fetchSummary(title) {
  const u = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const r = await fetch(u, { headers: { "User-Agent": "Wynla/0.1 (https://wynla.app)" } });
  if (!r.ok) return null;
  return r.json();
}
async function fetchWikitext(title) {
  const u = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&redirects=1`;
  const r = await fetch(u, { headers: { "User-Agent": "Wynla/0.1 (https://wynla.app)" } });
  if (!r.ok) return null;
  const j = await r.json();
  return j?.parse?.wikitext?.["*"] ?? null;
}

const out = [];
for (const t of TARGETS) {
  process.stderr.write(`fetching ${t.slug} (${t.wp}) ... `);
  const [summary, wikitext] = await Promise.all([fetchSummary(t.wp), fetchWikitext(t.wp)]);
  if (!wikitext) {
    process.stderr.write(`no wikitext\n`);
    out.push({ slug: t.slug, wp: t.wp, error: "no_wikitext" });
    continue;
  }
  const ib = parseInfobox(wikitext);
  if (!ib) {
    process.stderr.write(`no infobox\n`);
    out.push({ slug: t.slug, wp: t.wp, error: "no_infobox" });
    continue;
  }
  const heroUrl = summary?.originalimage?.source || summary?.thumbnail?.source || null;

  const result = {
    slug: t.slug,
    wp: t.wp,
    canonical_title: summary?.title ?? null,
    hero_image_url: heroUrl,
    hero_image_alt: heroUrl
      ? `${stripWiki(ib.name) ?? t.wp} ski resort`
      : null,
    hero_image_source: heroUrl ? "Wikimedia Commons" : null,
    vertical_drop: parseInt2(ib.vertical || ib.vertical_drop),
    elevation_summit: parseInt2(ib.top_elevation || ib.summit_elevation),
    elevation_base: parseInt2(ib.base_elevation),
    total_trails: parseInt2(ib.number_trails || ib.runs || ib.number_of_trails),
    total_lifts: parseInt2(ib.liftsystem || ib.number_of_lifts || ib.lifts),
    total_acres: parseInt2(ib.skiable_area),
    longest_run_miles: parseFloat2(ib.longest_run),
    has_terrain_park: ib.terrainparks ? true : null,
    terrain_park_count: parseInt2(ib.terrainparks),
    typical_season_start: stripWiki(ib.opening_date),
    typical_season_end: stripWiki(ib.closing_date),
    address: stripWiki(ib.address || ib.location),
    city: stripWiki(ib.nearest_city || ib.nearest_town),
    website_url: parseUrl(ib.website || ib.homepage),
    raw_image_field: ib.image ?? null,
  };
  out.push(result);
  process.stderr.write(`ok\n`);
  // Polite delay to avoid rate-limiting
  await new Promise((r) => setTimeout(r, 200));
}

writeFileSync("output/flagship-data.json", JSON.stringify(out, null, 2));
process.stderr.write(`\nwrote output/flagship-data.json (${out.length} records)\n`);
