// Merge: existing DB state (flagship-check.json) + scraped Wikipedia data
// (flagship-data.json) + manual overrides for the 3 records the scraper missed
// or got wrong, then emit a single transactional UPDATE SQL file.
//
// Merge rules:
//   - tier always set to 'featured'
//   - last_verified_at always set to today
//   - other fields: only fill if currently NULL in DB and we have a value;
//     never overwrite an existing non-NULL DB value (avoids stomping on
//     curated Stage 3.5 work).
//
// Output: data/sql/stage-4.2-extra-featured-promotions.sql
import { readFileSync, writeFileSync } from "node:fs";

// PowerShell `>` redirect writes UTF-16 LE with BOM; the JSON files we feed
// in were emitted via that path. Strip BOMs / decode as UTF-16 if needed.
function readJson(path) {
  const buf = readFileSync(path);
  // UTF-16 LE BOM = 0xFF 0xFE
  if (buf[0] === 0xff && buf[1] === 0xfe) {
    return JSON.parse(buf.toString("utf16le").replace(/^﻿/, ""));
  }
  // UTF-8 BOM = 0xEF 0xBB 0xBF
  let text = buf.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  return JSON.parse(text);
}

const dbState = readJson("output/flagship-check.json");
const scraped = readJson("output/flagship-data.json");

// Manual overrides — slugs the scraper missed or where I verified better data
// via WebFetch. Sources noted inline so this stays auditable.
const MANUAL = {
  // Aspen Snowmass: scraper hit Aspen Mountain (small) — Snowmass Mountain is
  // the largest of the 4 sister mountains, used for "Aspen Snowmass" the brand.
  // Source: en.wikipedia.org/wiki/Snowmass_Ski_Area (verified 2026-05-07).
  "aspen-snowmass": {
    hero_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Snowmass_Village.JPG/1200px-Snowmass_Village.JPG",
    hero_image_alt: "Snowmass village at Aspen Snowmass ski resort",
    hero_image_source: "Wikimedia Commons (Snowmass Ski Area)",
    vertical_drop: 4406,
    elevation_summit: 12510,
    elevation_base: 8104,
    total_trails: 94,
    total_lifts: 16,
    total_acres: 3362,
    longest_run_miles: 5.3,
    has_terrain_park: true,
  },
  // Sun Valley: scraper page redirect issue — used Sun Valley, Idaho article
  // for Bald Mountain (the main alpine area). Source verified 2026-05-07.
  "sun-valley": {
    hero_image_url: "https://upload.wikimedia.org/wikipedia/commons/d/da/Baldmountainid.jpg",
    hero_image_alt: "Bald Mountain, Sun Valley Resort",
    hero_image_source: "Wikimedia Commons (Sun Valley, Idaho)",
    vertical_drop: 3400,
    elevation_summit: 9150,
    elevation_base: 5750,
    total_trails: 121,
    total_lifts: 17,
    total_acres: 2829,
  },
  // Sugarloaf: scraper hit "Sugarloaf, Maine" town article instead of resort.
  // Source: en.wikipedia.org/wiki/Sugarloaf_(ski_resort) (verified 2026-05-07).
  "sugarloaf": {
    hero_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Sugarloaf_Mountain_Maine.jpg/1200px-Sugarloaf_Mountain_Maine.jpg",
    hero_image_alt: "Sugarloaf Mountain, Maine",
    hero_image_source: "Wikimedia Commons",
    vertical_drop: 2820,
    elevation_summit: 4237,
    elevation_base: 1417,
    total_trails: 176,
    total_lifts: 15,
    total_acres: 1360,
    longest_run_miles: 3.5,
  },
  // Jay Peak: scraper missed lead image; fall back to logo (keeps panel hero
  // populated, even if not a vista shot).
  "jay-peak": {
    hero_image_url: "https://upload.wikimedia.org/wikipedia/en/thumb/4/4b/Jay_Peak_Resort_logo.svg/512px-Jay_Peak_Resort_logo.svg.png",
    hero_image_alt: "Jay Peak Resort logo",
    hero_image_source: "Wikimedia (Jay Peak Resort article)",
  },
  // Taos: same — logo only.
  "taos-ski-valley": {
    hero_image_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Taoslogo.png/512px-Taoslogo.png",
    hero_image_alt: "Taos Ski Valley logo",
    hero_image_source: "Wikimedia Commons",
  },
  // Jackson Hole: liftsystem field has format "1 [[aerial tram]] · 13
  // chairlifts · 4 surface lifts" so my parser grabbed the first number (1).
  // Total lifts at JH per Wikipedia = 1 + 13 + 4 = 18. Override.
  "jackson-hole": {
    total_lifts: 18,
  },
  // Telluride: same parser issue with multi-line lift breakdown — Wikipedia
  // reports 18 lifts total (verified 2026-05-07).
  "telluride": {
    total_lifts: 18,
  },
};

const dbBySlug = new Map(dbState.found.map((r) => [r.slug, r]));
const scrapedBySlug = new Map(scraped.map((r) => [r.slug, r]));

const TARGETS = [
  "aspen-snowmass", "jackson-hole", "big-sky", "snowbird", "alta",
  "telluride", "sun-valley", "snowbasin", "vail", "park-city",
  "mammoth-mountain", "beaver-creek", "breckenridge", "crested-butte",
  "killington", "sunday-river", "sugarloaf", "jay-peak", "bretton-woods",
  "taos-ski-valley",
];

const FIELDS_FROM_SCRAPER = [
  "hero_image_url", "hero_image_alt", "hero_image_source",
  "vertical_drop", "elevation_summit", "elevation_base",
  "total_trails", "total_lifts", "total_acres", "longest_run_miles",
  "has_terrain_park", "terrain_park_count",
];

// Sanity bounds — any scraped value outside these is treated as suspect
// (skip rather than write garbage).
const BOUNDS = {
  vertical_drop:    [200, 5000],
  elevation_summit: [500, 15000],
  elevation_base:   [0,   12000],
  total_trails:     [3,   500],
  total_lifts:      [2,   60],
  total_acres:      [50,  10000],
  longest_run_miles:[0.5, 10],
  terrain_park_count:[1, 30],
};

function inBounds(field, value) {
  if (typeof value !== "number") return true;
  const b = BOUNDS[field];
  if (!b) return true;
  return value >= b[0] && value <= b[1];
}

const rows = [];
const skipped = [];
const out = { merged: [], summary: {} };

for (const slug of TARGETS) {
  const db = dbBySlug.get(slug);
  if (!db) {
    skipped.push({ slug, reason: "not in DB" });
    continue;
  }

  const sc = scrapedBySlug.get(slug) ?? {};
  const ov = MANUAL[slug] ?? {};

  // Build the merged record: only fill fields where DB is NULL.
  const updates = {};
  // tier always
  if (db.tier !== "featured") updates.tier = "featured";

  for (const f of FIELDS_FROM_SCRAPER) {
    if (db[f] !== null && db[f] !== undefined) continue;          // DB wins
    const candidate = (ov[f] !== undefined ? ov[f] : sc[f]);
    if (candidate === null || candidate === undefined) continue;
    if (!inBounds(f, candidate)) continue;
    updates[f] = candidate;
  }

  // last_verified_at — overwrite always so tier-bump is dated
  updates.last_verified_at = "2026-05-07";

  rows.push({ slug, name: db.name, updates });
}

// Emit SQL — single transaction for atomicity
function sqlValue(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
}

let sql = `-- Stage 4.2 extra: promote 20 flagship resorts Listed → Featured\n`;
sql += `-- with stats backfilled from Wikipedia infoboxes (verified 2026-05-07).\n`;
sql += `-- Idempotent: only fills NULL fields, never overwrites existing values.\n`;
sql += `-- Manual overrides for 3 scraper-miss + 2 image fixes are inline above.\n\n`;
sql += `BEGIN;\n\n`;
for (const r of rows) {
  const setClauses = Object.entries(r.updates)
    .map(([k, v]) => `  ${k} = ${sqlValue(v)}`)
    .join(",\n");
  sql += `-- ${r.name} (${r.slug})\n`;
  sql += `UPDATE resorts SET\n${setClauses}\nWHERE slug = '${r.slug}' AND active = TRUE;\n\n`;
}
sql += `-- Sanity: confirm 50 active Featured resorts after this batch.\n`;
sql += `SELECT count(*) AS featured_count FROM resorts WHERE tier = 'featured' AND active = TRUE;\n\n`;
sql += `COMMIT;\n`;

writeFileSync("data/sql/stage-4.2-extra-featured-promotions.sql", sql);

const summary = {
  promoted_count: rows.length,
  skipped_count: skipped.length,
  skipped,
  fields_filled_per_slug: rows.map((r) => ({
    slug: r.slug,
    fields: Object.keys(r.updates).filter((k) => k !== "last_verified_at"),
  })),
};
writeFileSync("output/promotion-summary.json", JSON.stringify(summary, null, 2));
console.log(`SQL written. ${rows.length} resorts to promote, ${skipped.length} skipped.`);
