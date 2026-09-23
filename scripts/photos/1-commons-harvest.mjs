// Step 1 of the resort photo pipeline: harvest licence-clear photo
// candidates from Wikimedia Commons for every active resort.
//
//   node scripts/photos/1-commons-harvest.mjs [--limit N] [--slug a,b] [--force]
//
// Per resort:
//   1. Match a Wikidata item by coordinates (P625 within 3 km of our row)
//      plus name similarity, so "Hunter Mountain" never picks up the
//      wrong Hunter. Pull P18 (main image), P373 (Commons category).
//   2. Pool candidates from four Commons sources: the P18 file, the
//      category tree (one level of subcategories), a 3 km geosearch and a
//      title search.
//   3. Gate 1 (metadata only, free): jpg/png, >= 1600 px wide, landscape,
//      licence in {CC0, public domain, CC BY, CC BY-SA}, no maps / logos /
//      signs / satellite frames, no Commons restrictions flag, and not
//      shot in May-Oct when EXIF says so. Photos with no EXIF month are
//      kept for the vision pass rather than guessed at.
//   4. Download up to 6 1280 px thumbs per resort to
//      .tmp-photo-candidates/<slug>/cand-N.jpg + manifest.json.
//
// Nothing here writes to the database. The vetting pass (see
// handoff-docs/PHOTOS_2026-09-23.md) reads the manifests and thumbs and
// produces chosen.json; scripts/photos/3-publish.mjs takes it from there.
//
// Resume-safe: a slug with a manifest.json is skipped unless --force.
// Polite: one request per second per host, a contact User-Agent, and
// AbortController timeouts on every fetch. Progress and a log land in
// scripts/photos/reports/.

import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  loadEnv,
  loadActiveResorts,
  fetchJson,
  politeFetch,
  makeLogger,
  writeJson,
  readJsonIfExists,
  haversineKm,
  parseArgs,
  REPORTS_DIR,
} from "./_shared.mjs";
import { writeCoverageReport, writeContactSheet } from "./report.mjs";

const OUT_DIR = resolve(".tmp-photo-candidates");
const MAX_CANDIDATES = 6;
const MATCH_RADIUS_KM = 3;
const MIN_WIDTH = 1600;
const MIN_ASPECT = 1.2;
const THUMB_WIDTH = 1280;

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const COMMONS_API = "https://commons.wikimedia.org/w/api.php";

// Wikidata classes that mean "a place you ski". Q130003 ski resort,
// Q4442980 ski area (some items use it), Q3010369 skiing venue/piste.
const SKI_CLASSES = new Set(["Q130003", "Q4442980", "Q3010369", "Q22698", "Q8502"]);

// Words that appear in almost every resort name and carry no identity.
const GENERIC = new Set(["ski", "skiing", "area", "resort", "resorts", "mountain", "mountains", "mtn", "mt", "mount", "the", "at", "of", "and", "&", "snow", "winter", "sports", "recreation", "center", "centre"]);

const args = parseArgs();
const env = loadEnv();
const logger = makeLogger("harvest");

// ---------------------------------------------------------------- helpers

function tokens(name) {
  return name
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Dice coefficient on identity tokens (generic words dropped when possible). */
function similarity(a, b) {
  const ta = tokens(a);
  const tb = tokens(b);
  let ca = ta.filter((t) => !GENERIC.has(t));
  let cb = tb.filter((t) => !GENERIC.has(t));
  if (ca.length === 0) ca = ta;
  if (cb.length === 0) cb = tb;
  const sa = new Set(ca);
  const sb = new Set(cb);
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  if (sa.size + sb.size === 0) return 0;
  return (2 * inter) / (sa.size + sb.size);
}

/** Search strings that reach Wikidata items whose label differs from ours. */
function nameVariants(name) {
  const core = name
    .replace(/\s*\((.*?)\)\s*/g, " ")
    .replace(/\b(Ski (Area|Resort|Hill|Bowl|Valley)|Mountain Resort|Snow Resort|Resort|Ski & Snowboard( Resort| Area)?|Ski and Snowboard( Resort| Area)?)\s*$/i, "")
    .trim();
  const set = new Set([name, core, `${core} ski`].map((s) => s.trim()).filter((s) => s.length >= 3));
  return [...set];
}

function claimValue(entity, prop) {
  return entity?.claims?.[prop]?.[0]?.mainsnak?.datavalue?.value ?? null;
}

function claimIds(entity, prop) {
  return (entity?.claims?.[prop] ?? []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
}

// -------------------------------------------------------------- wikidata

async function matchWikidata(resort) {
  const ids = new Set();
  const descriptions = new Map();
  for (const q of nameVariants(resort.name)) {
    const data = await fetchJson(
      `${WIKIDATA_API}?${new URLSearchParams({ action: "wbsearchentities", search: q, language: "en", type: "item", limit: "7", format: "json" })}`,
    );
    for (const s of data.search ?? []) {
      ids.add(s.id);
      if (s.description) descriptions.set(s.id, s.description);
    }
  }
  if (ids.size === 0) return { match: null, considered: 0 };

  const data = await fetchJson(
    `${WIKIDATA_API}?${new URLSearchParams({ action: "wbgetentities", ids: [...ids].slice(0, 50).join("|"), props: "claims|labels|sitelinks", languages: "en", format: "json" })}`,
  );
  let best = null;
  for (const [qid, entity] of Object.entries(data.entities ?? {})) {
    if (entity.missing != null) continue;
    const label = entity.labels?.en?.value ?? "";
    const coord = claimValue(entity, "P625");
    const distanceKm = coord ? haversineKm(resort.latitude, resort.longitude, coord.latitude, coord.longitude) : null;
    const sim = similarity(resort.name, label);
    const classes = claimIds(entity, "P31");
    const isSki = classes.some((c) => SKI_CLASSES.has(c)) || /\bski/i.test(descriptions.get(qid) ?? "");
    let method = null;
    let score = 0;
    if (distanceKm != null && distanceKm <= MATCH_RADIUS_KM && sim >= 0.34) {
      // Coordinates are the strong signal; the similarity floor only
      // rejects a neighbouring town or lake that shares the radius.
      method = "coord";
      // A ski-class item outranks the mountain or town that shares the
      // name and radius (Hunter Mountain the peak vs the ski resort).
      score = 2 + sim - distanceKm / 10 + (isSki ? 0.5 : 0);
    } else if (distanceKm == null && isSki && sim >= 0.8) {
      // No coordinates on the item, but it is a ski place with our name.
      method = "name";
      score = 1 + sim;
    }
    if (!method || score <= (best?.score ?? -Infinity)) continue;
    const commonsSitelink = entity.sitelinks?.commonswiki?.title ?? null;
    best = {
      qid,
      label,
      method,
      score,
      distanceKm: distanceKm == null ? null : Math.round(distanceKm * 100) / 100,
      similarity: Math.round(sim * 100) / 100,
      p18: claimValue(entity, "P18"),
      p373: claimValue(entity, "P373"),
      commonsSitelink,
      wikidataUrl: `https://www.wikidata.org/wiki/${qid}`,
    };
  }
  if (best) delete best.score;
  return { match: best, considered: ids.size };
}

// --------------------------------------------------------------- commons

async function commonsQuery(params) {
  return fetchJson(`${COMMONS_API}?${new URLSearchParams({ format: "json", formatversion: "2", ...params })}`);
}

async function categoryMembers(category, { types = "file|subcat", limit = 200 } = {}) {
  const data = await commonsQuery({ action: "query", list: "categorymembers", cmtitle: category, cmtype: types, cmlimit: String(limit) });
  return data.query?.categorymembers ?? [];
}

// A subcategory named like these is sliced off before we descend into it.
const SUBCAT_SKIP = /\b(maps?|logos?|signs?|diagrams?|documents?|scans?|trail maps?|piste maps?|panoramas?)\b/i;

async function collectCategoryFiles(category) {
  const files = [];
  const members = await categoryMembers(category);
  for (const m of members) if (m.ns === 6) files.push(m.title);
  const subcats = members.filter((m) => m.ns === 14 && !SUBCAT_SKIP.test(m.title)).slice(0, 6);
  for (const sub of subcats) {
    const subFiles = await categoryMembers(sub.title, { types: "file", limit: 100 });
    for (const m of subFiles) if (m.ns === 6) files.push(m.title);
  }
  return { files, subcats: subcats.map((s) => s.title) };
}

async function geosearchFiles(lat, lon) {
  const data = await commonsQuery({
    action: "query",
    list: "geosearch",
    gscoord: `${lat}|${lon}`,
    gsradius: String(MATCH_RADIUS_KM * 1000),
    gsnamespace: "6",
    gsprimary: "all",
    gslimit: "100",
  });
  return (data.query?.geosearch ?? []).map((g) => ({ title: g.title, distM: g.dist }));
}

async function searchFiles(name) {
  const core = nameVariants(name)[1] ?? name;
  const data = await commonsQuery({
    action: "query",
    list: "search",
    srsearch: `"${core}" filetype:bitmap`,
    srnamespace: "6",
    srlimit: "20",
  });
  return (data.query?.search ?? []).map((s) => s.title);
}

const EXT_FILTER = [
  "LicenseShortName", "LicenseUrl", "License", "Artist", "Credit", "Attribution", "AttributionRequired", "UsageTerms",
  "DateTimeOriginal", "DateTime", "Restrictions", "ImageDescription", "Categories", "ObjectName",
].join("|");

/** imageinfo + extmetadata for up to 20 titles per request (thumb URLs are capped per call). */
async function imageInfo(titles) {
  const out = [];
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const data = await commonsQuery({
      action: "query",
      titles: batch.join("|"),
      prop: "imageinfo",
      iiprop: "url|size|mime|extmetadata|user",
      iiurlwidth: String(THUMB_WIDTH),
      iiextmetadatafilter: EXT_FILTER,
    });
    for (const page of data.query?.pages ?? []) {
      const ii = page.imageinfo?.[0];
      if (!ii || page.missing) continue;
      out.push({ title: page.title, pageid: page.pageid, ...ii });
    }
  }
  return out;
}

// ---------------------------------------------------------------- gate 1

const stripHtml = (s) => String(s ?? "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const ALLOWED_LICENCE = /^(CC0|Public domain|PD|CC[ -]BY(-SA)?(\s|$|[ -]\d))/i;
const FORBIDDEN_LICENCE = /\b(NC|ND|GFDL only|all rights reserved|fair use)\b/i;

const TITLE_EXCLUDE = /\b(maps?|logos?|signs?|signage|plans?|piste maps?|trail maps?|diagrams?|ISS\d+|landsat|sentinel|satellite|screenshot|poster|brochure|flyer|ticket|painting|postcard|lithograph|engraving)\b/i;
const CATEGORY_EXCLUDE = /\b(maps of|logos of|signs of|road signs|trail maps|piste maps|diagrams|documents|scanned|satellite images|screenshots|posters|book covers|paintings|drawings|engravings|lithographs|postcards|artworks)\b/i;

const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };

/** Returns the month (1-12) an EXIF-ish date string names, or null. */
function exifMonth(value) {
  const text = stripHtml(value);
  if (!text) return null;
  const iso = text.match(/\b(\d{4})[-:/](\d{1,2})\b/);
  if (iso) {
    const m = Number(iso[2]);
    return m >= 1 && m <= 12 ? m : null;
  }
  const named = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i);
  return named ? MONTHS[named[1].toLowerCase()] : null;
}

function seasonOf(month) {
  if (month == null) return "unknown";
  return month >= 11 || month <= 4 ? "winter" : "summer";
}

function gate(info) {
  const meta = info.extmetadata ?? {};
  const licence = stripHtml(meta.LicenseShortName?.value ?? meta.License?.value);
  const title = info.title.replace(/^File:/, "");
  const categories = stripHtml(meta.Categories?.value);
  if (!/^image\/(jpeg|png)$/.test(info.mime ?? "")) return { ok: false, reason: "not-jpg-png" };
  if (!info.width || info.width < MIN_WIDTH) return { ok: false, reason: "too-small" };
  if (!info.height || info.width / info.height < MIN_ASPECT) return { ok: false, reason: "not-landscape" };
  if (!licence) return { ok: false, reason: "no-licence" };
  if (!ALLOWED_LICENCE.test(licence) || FORBIDDEN_LICENCE.test(licence)) return { ok: false, reason: `licence:${licence.slice(0, 24)}` };
  if (TITLE_EXCLUDE.test(title)) return { ok: false, reason: "title-excluded" };
  if (CATEGORY_EXCLUDE.test(categories)) return { ok: false, reason: "category-excluded" };
  if (stripHtml(meta.Restrictions?.value)) return { ok: false, reason: "restrictions" };
  const month = exifMonth(meta.DateTimeOriginal?.value);
  const season = seasonOf(month);
  if (season === "summer") return { ok: false, reason: "exif-summer" };
  return { ok: true, licence, season, month };
}

// Geosearch returns everything geotagged within 3 km (a fungus, a town
// hall) and a title search on a generic name ("Bear Creek", "Blue
// Mountain") returns the wrong Bear Creek. Files reached through the
// matched Wikidata item (P18, its category) are trusted; the other two
// routes must mention the resort or something you would photograph at a
// ski area. The vision pass still judges every survivor.
const SKI_WORDS =
  /\b(ski|skis|skiing|skier|skiers|snowboard\w*|chairlift|chair lift|gondola|t-bar|rope tow|lifts?|slopes?|piste|trails?|snow\w*|winter|resort|summit|mountain|mtn|peak|ridge|lodge|bowl|glades?)\b/i;

function isRelevant(info, source, resort) {
  if (source === "p18" || source === "category") return true;
  const meta = info.extmetadata ?? {};
  const text = [info.title, stripHtml(meta.ImageDescription?.value), stripHtml(meta.Categories?.value)].join(" ");
  const core = nameVariants(resort.name)[1] ?? resort.name;
  const nameHit = tokens(core)
    .filter((t) => !GENERIC.has(t))
    .some((t) => new RegExp(`\\b${t}\\b`, "i").test(text));
  if (source === "geosearch") return nameHit || SKI_WORDS.test(text);
  return SKI_WORDS.test(text);
}

function candidateRecord(info, gateResult, source, extra = {}) {
  const meta = info.extmetadata ?? {};
  const author = stripHtml(meta.Artist?.value) || stripHtml(meta.Credit?.value) || info.user || "Unknown";
  return {
    title: info.title,
    url: info.url,
    thumbUrl: info.thumburl ?? info.url,
    author: author.slice(0, 120),
    licence: gateResult.licence,
    licenceUrl: stripHtml(meta.LicenseUrl?.value) || null,
    sourcePage: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(info.title)}`,
    exifDate: stripHtml(meta.DateTimeOriginal?.value) || null,
    exifSeason: gateResult.season,
    width: info.width,
    height: info.height,
    description: stripHtml(meta.ImageDescription?.value).slice(0, 240) || null,
    source,
    ...extra,
  };
}

// ---------------------------------------------------------------- resort

async function downloadThumb(url, file) {
  const res = await politeFetch(url, { timeoutMs: 45000 });
  if (!res.ok) throw new Error(`thumb ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(file, buf);
  return buf.length;
}

async function harvestResort(resort) {
  const dir = join(OUT_DIR, resort.slug);
  mkdirSync(dir, { recursive: true });

  const { match, considered } = await matchWikidata(resort);

  // Candidate pool keyed by title so the same file reached by two routes
  // keeps the higher-priority source.
  const pool = new Map();
  const add = (title, source, extra = {}) => {
    if (!title || !title.startsWith("File:")) return;
    const prev = pool.get(title);
    if (!prev || prev.priority < SOURCE_PRIORITY[source]) pool.set(title, { source, priority: SOURCE_PRIORITY[source], ...extra });
  };

  const sources = { p18: null, category: null, subcats: [], categoryFiles: 0, geosearch: 0, search: 0 };
  if (match?.p18) {
    sources.p18 = `File:${match.p18}`;
    add(sources.p18, "p18");
  }
  const category = match?.p373 ? `Category:${match.p373}` : match?.commonsSitelink?.startsWith("Category:") ? match.commonsSitelink : match ? `Category:${match.label}` : null;
  if (category) {
    const { files, subcats } = await collectCategoryFiles(category);
    sources.category = category;
    sources.subcats = subcats;
    sources.categoryFiles = files.length;
    for (const f of files) add(f, "category");
  }
  const geo = await geosearchFiles(resort.latitude, resort.longitude);
  sources.geosearch = geo.length;
  for (const g of geo) add(g.title, "geosearch", { distM: g.distM });
  const found = await searchFiles(resort.name);
  sources.search = found.length;
  for (const t of found) add(t, "search");

  const titles = [...pool.keys()];
  const infos = titles.length ? await imageInfo(titles) : [];

  const rejected = {};
  const passed = [];
  for (const info of infos) {
    const g = gate(info);
    const entry = pool.get(info.title) ?? { source: "search", priority: 0 };
    if (!g.ok) {
      rejected[g.reason] = (rejected[g.reason] ?? 0) + 1;
      continue;
    }
    if (!isRelevant(info, entry.source, resort)) {
      rejected["not-relevant"] = (rejected["not-relevant"] ?? 0) + 1;
      continue;
    }
    const rec = candidateRecord(info, g, entry.source, entry.distM != null ? { distanceM: entry.distM } : {});
    // Ranking: how the file was reached, then a winter EXIF month, then
    // resolution. Aerials and unknown-season photos stay in for vetting.
    rec.score =
      entry.priority * 20 +
      (g.season === "winter" ? 30 : 0) +
      Math.min(info.width / 1000, 6) -
      (entry.distM != null ? entry.distM / 1000 : 0);
    passed.push(rec);
  }
  passed.sort((a, b) => b.score - a.score);

  const candidates = [];
  for (const rec of passed.slice(0, MAX_CANDIDATES)) {
    const ext = /png/i.test(rec.thumbUrl.split("?")[0].split(".").pop() ?? "") ? "png" : "jpg";
    const file = join(dir, `cand-${candidates.length}.${ext}`);
    try {
      rec.bytes = await downloadThumb(rec.thumbUrl, file);
      rec.file = `.tmp-photo-candidates/${resort.slug}/cand-${candidates.length}.${ext}`;
      candidates.push(rec);
    } catch (e) {
      logger.log(`  ${resort.slug}: thumb download failed for ${rec.title}: ${e.message}`);
    }
  }

  const manifest = {
    slug: resort.slug,
    name: resort.name,
    state: resort.state,
    tier: resort.tier,
    latitude: resort.latitude,
    longitude: resort.longitude,
    existingHero: resort.hero_image_url ? { url: resort.hero_image_url, source: resort.hero_image_source, verifiedWinter: resort.hero_image_verified_winter } : null,
    wikidata: match,
    wikidataConsidered: considered,
    sources,
    considered: infos.length,
    gate: { passed: passed.length, rejected },
    // Gated candidates beyond the download cap, so a vetting pass that
    // rejects all six can reach for the next ones without re-harvesting.
    overflow: passed.slice(MAX_CANDIDATES).map(({ title, sourcePage, licence, author, width, height, exifSeason, source }) => ({ title, sourcePage, licence, author, width, height, exifSeason, source })),
    candidates,
    harvestedAt: new Date().toISOString(),
  };
  writeJson(join(dir, "manifest.json"), manifest);
  return manifest;
}

const SOURCE_PRIORITY = { p18: 5, category: 4, geosearch: 3, search: 2 };

// ------------------------------------------------------------------ main

mkdirSync(OUT_DIR, { recursive: true });
let resorts = await loadActiveResorts(env);
resorts = resorts.filter((r) => r.latitude != null && r.longitude != null);
if (args.slug) {
  const wanted = new Set(String(args.slug).split(","));
  resorts = resorts.filter((r) => wanted.has(r.slug));
}
if (args.limit) resorts = resorts.slice(0, Number(args.limit));

logger.log(`harvest: ${resorts.length} active resorts, output ${OUT_DIR}`);
let done = 0;
let skipped = 0;
let failed = 0;
const summary = [];
for (const resort of resorts) {
  const manifestPath = join(OUT_DIR, resort.slug, "manifest.json");
  if (!args.force && existsSync(manifestPath)) {
    skipped++;
    const m = readJsonIfExists(manifestPath);
    if (m) summary.push({ slug: m.slug, candidates: m.candidates?.length ?? 0 });
    continue;
  }
  logger.progress({ total: resorts.length, done, skipped, failed, current: resort.slug });
  try {
    const m = await harvestResort(resort);
    done++;
    summary.push({ slug: m.slug, candidates: m.candidates.length });
    logger.log(
      `${resort.slug}: wikidata=${m.wikidata ? `${m.wikidata.qid} (${m.wikidata.method}, ${m.wikidata.distanceKm ?? "no coord"} km)` : "none"} pool=${m.considered} passed=${m.gate.passed} downloaded=${m.candidates.length}`,
    );
  } catch (e) {
    failed++;
    logger.log(`${resort.slug}: FAILED ${e.message}`);
  }
}
logger.progress({ total: resorts.length, done, skipped, failed, current: null, finishedAt: new Date().toISOString() });
logger.log(`harvest finished: ${done} harvested, ${skipped} skipped (resume), ${failed} failed`);

// Coverage + contact sheet over everything on disk, not just this run.
const coverage = writeCoverageReport(OUT_DIR, REPORTS_DIR);
writeContactSheet(OUT_DIR);
logger.log(`coverage: ${coverage.withCandidates}/${coverage.resorts} resorts have >= 1 gated candidate; contact sheet at ${join(OUT_DIR, "contact-sheet.html")}`);
