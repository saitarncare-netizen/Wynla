// Re-check the heroes already live in the resort-heroes bucket (the 2026-06
// batch, 104 photos on 2026-09-23) against the same rules new photos meet.
//
//   node scripts/photos/4-legacy-recheck.mjs [--sheet]
//
// Why: the 2026-06 pipeline vetted "is this a winter ski scene" but never
// "is this THIS resort". The source files recovered for those heroes show
// several photos of other resorts (Keystone showing Breckenridge, 49 Degrees
// North showing North Carolina's Sugar Mountain), and its author field
// printed licence boilerplate verbatim.
//
// What it does (read-only against the database and Commons):
//   1. Reads every active row whose hero_image_url is in resort-heroes and
//      the Commons file recorded for it in lib/data/heroCredits.json.
//   2. Fetches that file's live Commons metadata (title, description,
//      categories, camera coordinates, EXIF date, licence, author).
//   3. Same-resort signal per file: does the title / description /
//      categories name this resort; does it name a different resort we
//      list or a place outside the US; how far is the camera position from
//      the resort. Verdict match / unclear / mismatch, with reasons.
//   4. Writes scripts/photos/legacy/legacy-recheck.json (the evidence), and
//      refreshes the heroCredits.json entries with the live, cleaned author
//      and licence plus the exact hero URL they describe.
//   5. Writes scripts/photos/legacy/legacy-heroes.sql for a human to apply:
//      hero_image_verified_winter = false for every slug in
//      lib/data/heroDenylist.json (the reviewed list; this script only
//      proposes), and the cleaned attribution + source page for the rest.
//      Every statement is guarded by the current hero_image_url, so it is a
//      no-op for a row whose photo has since been replaced.
//   6. --sheet: downloads the live heroes and writes labelled contact
//      sheets (12 per image, suspect files first) to
//      .tmp-photo-candidates/legacy-recheck/ for the visual pass.
//
// The denylist takes effect in the app on the next deploy (lib/heroSource.ts reads
// it); the SQL makes the database agree so other readers do too.

import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  loadEnv,
  loadActiveResorts,
  readJsonIfExists,
  writeJson,
  parseArgs,
  makeLogger,
  haversineKm,
  politeFetch,
  commonsFileInfo,
  commonsAuthor,
  stripHtml,
  attributionString,
  sqlComment,
} from "./_shared.mjs";

const CREDITS_JSON = resolve("lib/data/heroCredits.json");
const DENYLIST_JSON = resolve("lib/data/heroDenylist.json");
const LEGACY_DIR = resolve("scripts/photos/legacy");
const SHEET_DIR = resolve(".tmp-photo-candidates/legacy-recheck");
const HERO_PATH = "/storage/v1/object/public/resort-heroes/";

// A camera this far from the resort is not photographing it (a summit view
// of a neighbouring range can still sit 10-15 km away, so the bar is high).
const FAR_KM = 25;
const NEAR_KM = 8;

const GENERIC = new Set(["ski", "skiing", "area", "resort", "resorts", "mountain", "mountains", "mtn", "mt", "mount", "the", "at", "of", "and", "snow", "winter", "sports", "center", "centre", "valley", "hill", "hills", "park", "lodge", "peak", "basin", "bowl", "ridge", "village", "california"]);
const FOREIGN = /\b(canada|british columbia|alberta|ontario|quebec|newfoundland|nova scotia|austria|switzerland|italy|france|germany|japan|chile|new zealand|australia|norway|sweden)\b/i;

// Files whose Commons metadata names no author even though the file page
// says who made it ({{self}} licence or "taken by me" by the uploader),
// checked by hand on 2026-09-23. The uploader is the author ONLY in that
// case, which is why commonsAuthor() never falls back to it on its own.
const AUTHOR_OVERRIDES = {
  "ragged-mountain": "Jrclark at English Wikipedia", // {{self|GFDL|cc-by-3.0}}, uploaded by Jrclark
  brighton: "Darkbowmen", // "This photograph was taken by me", uploaded by Darkbowmen
};

const args = parseArgs();
const env = loadEnv();
const logger = makeLogger("legacy-recheck");

function identityTokens(name) {
  return name
    .toLowerCase()
    .replace(/[’'`.]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter((t) => t.length >= 3 && !GENERIC.has(t));
}

const words = (text) => ` ${text.toLowerCase().replace(/[’'`.]/g, "").replace(/[^a-z0-9]+/g, " ")} `;

function monthOf(value) {
  const m = stripHtml(value).match(/\b(\d{4})[-:/](\d{1,2})\b/);
  const n = m ? Number(m[2]) : null;
  return n && n >= 1 && n <= 12 ? n : null;
}

function objectName(url) {
  const i = (url ?? "").indexOf(HERO_PATH);
  return i === -1 ? null : decodeURIComponent(url.slice(i + HERO_PATH.length).split("?")[0]);
}

// ------------------------------------------------------------------- main

const resorts = await loadActiveResorts(env);
const storage = resorts.filter((r) => objectName(r.hero_image_url));
const credits = readJsonIfExists(CREDITS_JSON, {});
const denylist = readJsonIfExists(DENYLIST_JSON, {});

// Names of every other resort we list, as phrases, for the "names a
// different resort" check. Only phrases distinctive enough to mean one
// place (two identity tokens, or one of 6+ letters).
const otherNames = resorts
  .map((r) => ({ slug: r.slug, name: r.name, phrase: identityTokens(r.name).join(" ") }))
  .filter((o) => o.phrase && (o.phrase.includes(" ") || o.phrase.length >= 6));

const titles = storage.map((r) => credits[r.slug]?.title).filter(Boolean);
const live = await commonsFileInfo(titles, { thumbWidth: 320 });
logger.log(`legacy recheck: ${storage.length} storage heroes, ${titles.length} with a recorded Commons file`);

const results = [];
for (const r of storage) {
  const entry = credits[r.slug] ?? {};
  const info = entry.title ? live.get(entry.title) : null;
  const meta = info?.extmetadata ?? {};
  const reasons = [];
  let verdict = "unclear";
  if (!info || info.missing) {
    reasons.push(entry.title ? "file no longer on Commons" : "no source file recorded");
  } else {
    // What the photographer wrote (title, description, object name) is the
    // strong signal; categories are added by anyone and are broad ("Ski
    // areas in Colorado", "North Carolina"), so they only count as a weak
    // hint. Names match as whole phrases: a lone "north" or "big" says
    // nothing about 49 Degrees North or Big Boulder.
    const said = words([info.title.replace(/^File:/, "").replace(/_/g, " "), stripHtml(meta.ImageDescription?.value), stripHtml(meta.ObjectName?.value)].join(" "));
    const cats = words(stripHtml(meta.Categories?.value));
    const own = identityTokens(r.name).join(" ");
    const nameHit = !!own && said.includes(` ${own} `);
    const catHit = !!own && cats.includes(` ${own} `);
    const others = otherNames.filter((o) => o.slug !== r.slug && said.includes(` ${o.phrase} `) && !own.includes(o.phrase));
    const foreign = `${said} ${cats}`.match(FOREIGN)?.[0] ?? null;
    const coord = info.coordinates?.[0] ?? null;
    const lat = coord?.lat ?? (Number(stripHtml(meta.GPSLatitude?.value)) || null);
    const lon = coord?.lon ?? (Number(stripHtml(meta.GPSLongitude?.value)) || null);
    const distanceKm = lat != null && lon != null ? Math.round(haversineKm(r.latitude, r.longitude, lat, lon) * 10) / 10 : null;
    const month = monthOf(meta.DateTimeOriginal?.value);

    if (nameHit) reasons.push("title or description names this resort");
    else if (catHit) reasons.push("only a category names this resort");
    for (const o of others.slice(0, 3)) reasons.push(`names ${o.name}`);
    if (foreign) reasons.push(`mentions ${foreign}`);
    if (distanceKm != null) reasons.push(`camera ${distanceKm} km away`);
    if (month != null && month >= 5 && month <= 10) reasons.push(`EXIF month ${month} (May-Oct)`);

    const far = distanceKm != null && distanceKm > FAR_KM;
    if (far || foreign || (others.length > 0 && !nameHit)) verdict = "mismatch";
    else if (nameHit || (distanceKm != null && distanceKm <= NEAR_KM)) verdict = "match";
  }

  const licence = stripHtml(meta.LicenseShortName?.value ?? meta.License?.value) || null;
  const author = info && !info.missing ? (commonsAuthor(meta) ?? AUTHOR_OVERRIDES[r.slug] ?? null) : null;
  results.push({
    slug: r.slug,
    name: r.name,
    state: r.state,
    object: objectName(r.hero_image_url),
    title: entry.title ?? null,
    sourcePage: info?.descriptionurl ?? entry.sourcePage ?? null,
    verdict,
    reasons,
    author,
    licence,
    dbAttribution: r.hero_image_attribution,
    dbCredit: r.hero_image_credit,
    denied: denylist[r.slug]?.object === objectName(r.hero_image_url),
    thumb: info?.thumburl ?? null,
    url: r.hero_image_url,
  });

  // Refresh the credit entry with live, cleaned values and pin it to the
  // exact URL it describes, so a later replacement never inherits it.
  if (info && !info.missing && licence) {
    credits[r.slug] = {
      ...entry,
      sourcePage: info.descriptionurl ?? entry.sourcePage,
      url: r.hero_image_url,
      author,
      licence,
      licenceUrl: stripHtml(meta.LicenseUrl?.value) || null,
      attribution: attributionString(author, licence),
      checkedAt: new Date().toISOString(),
    };
  }
}

const order = { mismatch: 0, unclear: 1, match: 2 };
results.sort((a, b) => order[a.verdict] - order[b.verdict] || a.slug.localeCompare(b.slug));
const tally = results.reduce((acc, x) => ((acc[x.verdict] = (acc[x.verdict] ?? 0) + 1), acc), {});
mkdirSync(LEGACY_DIR, { recursive: true });
writeJson(join(LEGACY_DIR, "legacy-recheck.json"), {
  generatedAt: new Date().toISOString(),
  rules: { farKm: FAR_KM, nearKm: NEAR_KM },
  tally,
  denylisted: Object.keys(denylist).length,
  // The thumb and hero URLs are only for the contact sheets; the evidence
  // file keeps the object name, which is enough to find the photo.
  results: results.map((x) => {
    const rest = { ...x };
    delete rest.thumb;
    delete rest.url;
    return rest;
  }),
});
writeJson(CREDITS_JSON, Object.fromEntries(Object.entries(credits).sort(([a], [b]) => a.localeCompare(b))));
logger.log(`verdicts: ${JSON.stringify(tally)}`);
for (const x of results.filter((y) => y.verdict !== "match")) {
  logger.log(`  ${x.verdict.padEnd(8)} ${x.slug.padEnd(30)} ${x.denied ? "[denied] " : ""}${x.title ?? "-"} · ${x.reasons.join("; ")}`);
}

// ---------------------------------------------------------------- the SQL

const sqlEsc = (s) => String(s).replace(/'/g, "''");
const lines = [
  `-- Legacy hero re-check, generated by scripts/photos/4-legacy-recheck.mjs on ${new Date().toISOString()}.`,
  `-- Evidence: scripts/photos/legacy/legacy-recheck.json. Review, then run in the Supabase SQL editor.`,
  `-- Every statement is guarded by the hero_image_url it was written for, so it does nothing to a row`,
  `-- whose photo has been replaced since. Idempotent.`,
  "",
  "-- 1. Rejected heroes (lib/data/heroDenylist.json): a different resort, or a licence outside the",
  "--    allow-list. lib/heroSource.ts already skips them (it reads the denylist), so the terrain card",
  "--    shows once the app is deployed; this makes the database agree for every other reader.",
  "--    The URL is kept for the audit trail.",
];
for (const x of results.filter((y) => y.denied)) {
  lines.push(`-- ${sqlComment(`${x.name} (${x.state}) · ${x.title ?? "no source file"} · ${denylist[x.slug].reason}`)}`);
  lines.push(`UPDATE resorts SET hero_image_verified_winter = false, updated_at = now() WHERE slug = '${sqlEsc(x.slug)}' AND hero_image_url = '${sqlEsc(x.url)}';`);
}
lines.push("", "-- 2. Cleaned attribution (live Commons author + licence) and the source page for the rest.");
for (const x of results.filter((y) => !y.denied && credits[y.slug]?.checkedAt)) {
  const c = credits[x.slug];
  if (c.attribution === x.dbAttribution && c.sourcePage === x.dbCredit) continue;
  lines.push(`-- ${sqlComment(`${x.name}: was "${x.dbAttribution ?? ""}"`)}`);
  lines.push(
    `UPDATE resorts SET hero_image_attribution = '${sqlEsc(c.attribution)}', hero_image_credit = '${sqlEsc(c.sourcePage)}', updated_at = now() ` +
      `WHERE slug = '${sqlEsc(x.slug)}' AND hero_image_url = '${sqlEsc(x.url)}';`,
  );
}
writeFileSync(join(LEGACY_DIR, "legacy-heroes.sql"), lines.join("\n") + "\n");
logger.log(`SQL at ${join(LEGACY_DIR, "legacy-heroes.sql")}`);

// ------------------------------------------------------- contact sheets

if (args.sheet) {
  mkdirSync(SHEET_DIR, { recursive: true });
  const W = 480;
  const H = 270;
  const LABEL = 44;
  const COLS = 3;
  const PER = 12;
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  for (let page = 0; page * PER < results.length; page++) {
    const slice = results.slice(page * PER, page * PER + PER);
    const rows = Math.ceil(slice.length / COLS);
    const composites = [];
    for (let i = 0; i < slice.length; i++) {
      const x = slice[i];
      const left = (i % COLS) * W;
      const top = Math.floor(i / COLS) * (H + LABEL);
      try {
        const res = await politeFetch(x.url, { intervalMs: 100, timeoutMs: 30000 });
        const buf = Buffer.from(await res.arrayBuffer());
        composites.push({ input: await sharp(buf).resize(W, H, { fit: "cover" }).jpeg().toBuffer(), left, top });
      } catch (e) {
        logger.log(`  sheet: ${x.slug} download failed: ${e.message}`);
      }
      const label = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${LABEL}"><rect width="100%" height="100%" fill="${x.verdict === "match" ? "#1E2952" : x.verdict === "mismatch" ? "#8B1E1E" : "#7A5A00"}"/><text x="6" y="17" font-family="Arial" font-size="15" font-weight="700" fill="#fff">${esc(`${x.slug} (${x.state}) · ${x.verdict}`)}</text><text x="6" y="36" font-family="Arial" font-size="12" fill="#fff">${esc((x.title ?? "").replace(/^File:/, "").slice(0, 70))}</text></svg>`;
      composites.push({ input: Buffer.from(label), left, top: top + H });
    }
    const sheet = await sharp({ create: { width: W * COLS, height: rows * (H + LABEL), channels: 3, background: "#ffffff" } })
      .composite(composites)
      .jpeg({ quality: 80 })
      .toBuffer();
    writeFileSync(join(SHEET_DIR, `sheet-${String(page + 1).padStart(2, "0")}.jpg`), sheet);
  }
  logger.log(`contact sheets in ${SHEET_DIR}`);
}
