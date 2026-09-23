// Step 2 of the resort photo pipeline: render a branded "terrain card" for
// every active resort, so a resort with no vetted photo still gets a hero
// that is specific to its mountain instead of a flat gradient.
//
//   node scripts/photos/2-terrain-cards.mjs [--limit N] [--slug a,b] [--force]
//        [--no-upload] [--preview N] [--concurrency 4]
//
// How a card is made:
//   1. Fetch a 3x3 mosaic of AWS Terrain Tiles (terrarium encoding, zoom 12)
//      centred on the resort. The tiles are USGS 3DEP / SRTM elevation
//      published by Mapzen and AWS in the public domain, so the render is
//      ours to keep and serve forever, unlike a Mapbox or Google static map.
//   2. Decode elevation, compute a Horn hillshade with the sun in the
//      north-west, crop a 16:9 window centred on the resort.
//   3. Colourise in the brand palette: navy shadows, sky-blue lit slopes,
//      off-white above a per-resort snow line (halfway up the resort's own
//      vertical when the row has base and summit, else the 75th percentile
//      of the window).
//   4. Export three WebP variants:
//        hero   1600x900, hillshade + vignette/scrim only, NO text. The
//               resort page and the map panel lay their own h1, state
//               line and buttons over the hero, and object-cover crops the
//               sides on a phone, so drawn-in text would be cut off and
//               doubled under the real heading.
//        thumb  800x450 of the hero; at 56 px any drawn-in text is noise.
//        share  1600x900 with the resort name, state, gold rule, brand
//               mark and provenance note drawn in, for share and OG use
//               where the card stands alone.
//      Upload to the public Storage bucket `resort-cards` under
//      content-addressed names (<slug>-<variant>-<sha8>.webp) and record
//      them in lib/data/terrainCards.json, the runtime source of truth for
//      lib/heroSource.ts. A re-render always yields a new URL, so the
//      1-year cache can never serve a stale card.
//
// Writes: Supabase Storage only (bucket resort-cards). No database rows.
// Resume-safe: a slug already in terrainCards.json (current format) is
// skipped unless --force. --preview N also writes the first N cards to
// .tmp-photo-candidates/cards-preview/ for a visual check.

import sharp from "sharp";
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  loadEnv,
  loadActiveResorts,
  politeFetch,
  ensurePublicBucket,
  uploadObject,
  makeLogger,
  readJsonIfExists,
  writeJson,
  parseArgs,
  mapLimit,
  contentHash,
  publicObjectUrl,
  REPORTS_DIR,
} from "./_shared.mjs";

const ZOOM = 12;
const TILE = 256;
const MOSAIC = TILE * 3;
const CROP_W = 768;
const CROP_H = 432;
const OUT_W = 1600;
const OUT_H = 900;
const BUCKET = "resort-cards";
const CARDS_JSON = resolve("lib/data/terrainCards.json");
const PREVIEW_DIR = resolve(".tmp-photo-candidates/cards-preview");
const TILE_URL = (z, x, y) => `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`;

// Brand tokens (app/globals.css wn-*). Kept as RGB triples for the per-pixel
// mix below; the SVG overlay uses the hex forms.
const NAVY_DEEP = [15, 21, 48]; // #0F1530, the resort page's gradient end
const NAVY = [30, 41, 82]; // #1E2952 wn-navy
const SKY = [91, 175, 230]; // #5BAFE6 wn-sky
const SNOW_SHADE = [156, 184, 214]; // shaded snow, a cool blue-grey
const SNOW = [250, 250, 247]; // #FAFAF7 wn-offwhite

const args = parseArgs();
const env = loadEnv();
const logger = makeLogger("terrain-cards");
const upload = !args["no-upload"];
const previewCount = args.preview ? Number(args.preview) : 0;
const concurrency = args.concurrency ? Number(args.concurrency) : 4;

// ------------------------------------------------------------- tile math

function lonToX(lon, z) {
  return ((lon + 180) / 360) * 2 ** z;
}
function latToY(lat, z) {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
}
/** Ground size of one pixel at this latitude and zoom, in metres. */
function metresPerPixel(lat, z) {
  return (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** z;
}

async function fetchTile(z, x, y) {
  const res = await politeFetch(TILE_URL(z, x, y), { intervalMs: 50, timeoutMs: 30000 });
  if (!res.ok) throw new Error(`tile ${z}/${x}/${y} HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (info.width !== TILE || info.height !== TILE) throw new Error(`tile ${z}/${x}/${y} is ${info.width}x${info.height}`);
  return data;
}

/** 3x3 terrarium mosaic decoded to metres, plus the resort's pixel position. */
async function loadElevation(lat, lon) {
  const fx = lonToX(lon, ZOOM);
  const fy = latToY(lat, ZOOM);
  const cx = Math.floor(fx);
  const cy = Math.floor(fy);
  const elev = new Float32Array(MOSAIC * MOSAIC);
  const coords = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) coords.push({ dx, dy });
  await mapLimit(coords, 3, async ({ dx, dy }) => {
    const raw = await fetchTile(ZOOM, cx + dx, cy + dy);
    const ox = (dx + 1) * TILE;
    const oy = (dy + 1) * TILE;
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const i = (y * TILE + x) * 4;
        // Terrarium: height = (R * 256 + G + B / 256) - 32768.
        elev[(oy + y) * MOSAIC + ox + x] = raw[i] * 256 + raw[i + 1] + raw[i + 2] / 256 - 32768;
      }
    }
  });
  return { elev, px: (fx - (cx - 1)) * TILE, py: (fy - (cy - 1)) * TILE };
}

// -------------------------------------------------------------- hillshade

/**
 * Horn hillshade, sun azimuth 315 deg (north-west), altitude 45 deg,
 * vertical exaggeration 1.6 so gentle Midwest hills still read as relief.
 * Returns shade in [0, 1] for the crop window only.
 */
function hillshade(elev, cell, crop) {
  // ESRI convention: zenith = 90 - altitude; azimuth measured from east,
  // counter-clockwise, so a 315 deg (north-west) sun becomes 135 deg.
  const zenith = ((90 - 45) * Math.PI) / 180;
  const azimuth = ((360 - 315 + 90) % 360) * (Math.PI / 180);
  const zf = 1.6;
  const out = new Float32Array(crop.w * crop.h);
  const at = (x, y) => elev[Math.min(MOSAIC - 1, Math.max(0, y)) * MOSAIC + Math.min(MOSAIC - 1, Math.max(0, x))];
  for (let y = 0; y < crop.h; y++) {
    for (let x = 0; x < crop.w; x++) {
      const X = crop.x + x;
      const Y = crop.y + y;
      const a = at(X - 1, Y - 1), b = at(X, Y - 1), c = at(X + 1, Y - 1);
      const d = at(X - 1, Y), f = at(X + 1, Y);
      const g = at(X - 1, Y + 1), h = at(X, Y + 1), i = at(X + 1, Y + 1);
      const dzdx = ((c + 2 * f + i) - (a + 2 * d + g)) / (8 * cell);
      const dzdy = ((g + 2 * h + i) - (a + 2 * b + c)) / (8 * cell);
      const slope = Math.atan(zf * Math.sqrt(dzdx * dzdx + dzdy * dzdy));
      const aspect = Math.atan2(dzdy, -dzdx);
      let s = Math.cos(zenith) * Math.cos(slope) + Math.sin(zenith) * Math.sin(slope) * Math.cos(azimuth - aspect);
      // Flat ground sits at cos(45 deg) = 0.71; stretch so flats are mid-tone
      // and the brightest sun-facing slopes reach 1.
      s = (s - 0.15) / 0.85;
      out[y * crop.w + x] = Math.min(1, Math.max(0, s));
    }
  }
  return out;
}

function percentile(values, p) {
  const sorted = Float32Array.from(values).sort();
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))];
}

const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const smoothstep = (e0, e1, x) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

/**
 * Shade + elevation -> RGB buffer for the crop window. `snowArea`, when
 * set, is {cx, cy, r} in crop pixels: snow is only painted inside that
 * circle (feathered over its outer 30%), see the low-relief note in
 * renderCard.
 */
function colourise(elev, shade, crop, snowlineM, halfBandM, snowArea = null) {
  const rgb = Buffer.alloc(crop.w * crop.h * 3);
  for (let y = 0; y < crop.h; y++) {
    for (let x = 0; x < crop.w; x++) {
      const k = y * crop.w + x;
      const s = shade[k];
      const e = elev[(crop.y + y) * MOSAIC + crop.x + x];
      // Terrain: deep navy in shadow, brand navy on flats, sky on lit slopes.
      const base = s < 0.5 ? mix(NAVY_DEEP, NAVY, s * 2) : mix(NAVY, SKY, (s - 0.5) * 2);
      // Snow: fades in across a band around the snow line, and is itself
      // shaded so ridges stay readable in the white.
      let w = smoothstep(snowlineM - halfBandM, snowlineM + halfBandM, e);
      if (snowArea && w > 0) {
        const d = Math.hypot(x - snowArea.cx, y - snowArea.cy);
        w *= 1 - smoothstep(snowArea.r * 0.7, snowArea.r, d);
      }
      const snow = mix(SNOW_SHADE, SNOW, Math.pow(s, 0.8));
      const c = mix(base, snow, w * 0.9);
      rgb[k * 3] = c[0];
      rgb[k * 3 + 1] = c[1];
      rgb[k * 3 + 2] = c[2];
    }
  }
  return rgb;
}

// ---------------------------------------------------------------- overlay

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Vignette + bottom scrim, and (for the share variant only) the text. */
function overlaySvg(resort, { text }) {
  const name = resort.name;
  // Long names shrink so the wordmark never runs off the 1600 px card.
  const size = Math.max(40, Math.min(72, Math.floor((OUT_W * 0.86) / (name.length * 0.56))));
  const note = "Terrain render from USGS 3DEP elevation data via AWS Terrain Tiles";
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0F1530" stop-opacity="0.15"/>
      <stop offset="0.55" stop-color="#0F1530" stop-opacity="0.05"/>
      <stop offset="1" stop-color="#0F1530" stop-opacity="0.82"/>
    </linearGradient>
    <radialGradient id="vignette" cx="0.5" cy="0.45" r="0.75">
      <stop offset="0.6" stop-color="#0F1530" stop-opacity="0"/>
      <stop offset="1" stop-color="#0F1530" stop-opacity="0.45"/>
    </radialGradient>
  </defs>
  <rect width="100%" height="100%" fill="url(#vignette)"/>
  <rect width="100%" height="100%" fill="url(#scrim)"/>${text ? `
  <rect x="96" y="${OUT_H - 96 - size - 84}" width="96" height="6" rx="3" fill="#F5C443"/>
  <text x="96" y="${OUT_H - 96 - 44}" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="${size}" font-weight="700" fill="#FAFAF7" letter-spacing="-0.5">${esc(name)}</text>
  <text x="96" y="${OUT_H - 96}" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="26" font-weight="600" fill="#5BAFE6" letter-spacing="4">${esc(String(resort.state ?? "").toUpperCase())}</text>
  <text x="${OUT_W - 64}" y="${OUT_H - 40}" text-anchor="end" font-family="Segoe UI, Helvetica Neue, Arial, sans-serif" font-size="18" fill="#FAFAF7" fill-opacity="0.62">${esc(note)}</text>` : ""}
</svg>`);
}

let markPng = null;
async function brandMark() {
  if (markPng) return markPng;
  const src = resolve("public/brand/wynla-mark.png");
  if (!existsSync(src)) return null;
  markPng = await sharp(src).resize(88, 88).png().toBuffer();
  return markPng;
}

// ----------------------------------------------------------------- render

async function renderCard(resort) {
  const { elev, px, py } = await loadElevation(resort.latitude, resort.longitude);
  // 16:9 window as wide as the mosaic, vertically centred on the resort so
  // the base area sits mid-card rather than in a corner.
  const crop = {
    x: Math.round(Math.min(MOSAIC - CROP_W, Math.max(0, px - CROP_W / 2))),
    y: Math.round(Math.min(MOSAIC - CROP_H, Math.max(0, py - CROP_H / 2))),
    w: CROP_W,
    h: CROP_H,
  };
  const cell = metresPerPixel(resort.latitude, ZOOM);
  const shade = hillshade(elev, cell, crop);
  const window = new Float32Array(crop.w * crop.h);
  for (let y = 0; y < crop.h; y++) for (let x = 0; x < crop.w; x++) window[y * crop.w + x] = elev[(crop.y + y) * MOSAIC + crop.x + x];
  // Snow line: halfway up the resort's own vertical when the row has base
  // and summit (the upper mountain reads as snow, the valley stays navy),
  // base + 250 m with base alone, else the window's 75th percentile so
  // every card has some white without pretending to know where snow falls.
  // The fade band scales with the vertical so a 100 m Midwest hill still
  // shows a snow cap instead of one hard line.
  const baseM = resort.base_elevation_ft != null ? resort.base_elevation_ft * 0.3048 : null;
  const summitM = resort.summit_elevation_ft != null ? resort.summit_elevation_ft * 0.3048 : null;
  let snowlineM;
  let halfBandM = 150;
  if (baseM != null && summitM != null && summitM > baseM) {
    snowlineM = baseM + (summitM - baseM) * 0.5;
    halfBandM = Math.max(40, Math.min(150, (summitM - baseM) * 0.25));
  } else if (baseM != null && Number.isFinite(baseM)) {
    snowlineM = baseM + 250;
  } else {
    snowlineM = percentile(window, 0.75);
    halfBandM = 80;
  }
  // Low-relief resorts (under 200 m of vertical, or a window with under
  // 200 m of relief when the row has no base/summit) are mostly bluffs and
  // river-valley hills: the farmland around them is as high as the summit,
  // so any elevation rule paints the fields white and the card reads as
  // clouds over a valley (Afton Alps did). For those, snow is limited to
  // about 1.5 km around the resort point and the snow line is the resort's
  // own mid-vertical; the hillshade carries the rest of the card.
  const verticalM = baseM != null && summitM != null && summitM > baseM ? summitM - baseM : null;
  const lowRelief = verticalM != null ? verticalM < 200 : percentile(window, 0.9) - percentile(window, 0.1) < 200;
  let snowArea = null;
  if (lowRelief) {
    snowArea = { cx: px - crop.x, cy: py - crop.y, r: 1500 / cell };
  } else {
    // Mountain country: keep at least the lower two-thirds of the window
    // navy so the brand reads and the high ground is the highlight.
    const floorM = percentile(window, 0.66);
    if (snowlineM < floorM) snowlineM = floorM;
  }
  // The fade band must also fit the window's own relief: a 40 m band on
  // a hill with 60 m of relief tints every pixel half-white. Cap it at
  // half the spread between the snow line and the 90th percentile.
  if (!lowRelief) halfBandM = Math.max(8, Math.min(halfBandM, (percentile(window, 0.9) - snowlineM) / 2));
  const rgb = colourise(elev, shade, crop, snowlineM, halfBandM, snowArea);

  const base = await sharp(rgb, { raw: { width: crop.w, height: crop.h, channels: 3 } })
    .resize(OUT_W, OUT_H, { kernel: "lanczos3" })
    .png()
    .toBuffer();

  const hero = await sharp(base)
    .composite([{ input: overlaySvg(resort, { text: false }), top: 0, left: 0 }])
    .webp({ quality: 82, effort: 5 })
    .toBuffer();
  const thumb = await sharp(hero).resize(OUT_W / 2, OUT_H / 2, { kernel: "lanczos3" }).webp({ quality: 80, effort: 5 }).toBuffer();

  const shareLayers = [{ input: overlaySvg(resort, { text: true }), top: 0, left: 0 }];
  const mark = await brandMark();
  if (mark) shareLayers.push({ input: mark, top: 56, left: OUT_W - 56 - 88 });
  const share = await sharp(base).composite(shareLayers).webp({ quality: 82, effort: 5 }).toBuffer();

  return { hero, thumb, share, snowlineM: Math.round(snowlineM), lowRelief, crop, cell: Math.round(cell * 10) / 10 };
}

// ------------------------------------------------------------------- main

let resorts = (await loadActiveResorts(env)).filter((r) => r.latitude != null && r.longitude != null);
if (args.slug) {
  const wanted = new Set(String(args.slug).split(","));
  resorts = resorts.filter((r) => wanted.has(r.slug));
}
if (args.limit) resorts = resorts.slice(0, Number(args.limit));


// terrainCards.json: { base, cards: { slug: { hero, thumb, share } } }.
// `base` is the public URL prefix of the bucket the objects were uploaded
// to and each variant is an object name, which keeps the file small (it
// ships to the client with lib/heroSource.ts) and makes the host explicit.
const file = readJsonIfExists(CARDS_JSON, {});
const cards = file.cards && typeof file.cards === "object" ? file.cards : {};
const base = publicObjectUrl(env, BUCKET, "");
if (file.base && file.base !== base) {
  // Mixing hosts in one file would point some cards at a project that
  // never received them. Re-render everything against the new host.
  logger.log(`terrainCards.json was written for ${file.base}; this run uploads to ${base}. Pass --force to re-render every card for the new host.`);
  if (!args.force) process.exit(1);
}
const todo = args.force ? resorts : resorts.filter((r) => !cards[r.slug]?.hero);
logger.log(`terrain cards: ${resorts.length} resorts, ${todo.length} to render (${upload ? "upload on" : "upload off"})`);

if (upload && todo.length > 0) {
  const state = await ensurePublicBucket(env, BUCKET, { allowedMime: ["image/webp"], fileSizeLimit: 2 * 1024 * 1024 });
  logger.log(`bucket ${BUCKET}: ${state}`);
}
if (previewCount > 0) mkdirSync(PREVIEW_DIR, { recursive: true });

let done = 0;
let failed = 0;
let previews = 0;
const report = readJsonIfExists(join(REPORTS_DIR, "terrain-cards-report.json"), { cards: {} });
const persist = () => {
  // Sorted keys keep the JSON diff readable when a single card is re-rendered.
  writeJson(CARDS_JSON, { base, cards: Object.fromEntries(Object.entries(cards).sort(([a], [b]) => a.localeCompare(b))) });
  writeJson(join(REPORTS_DIR, "terrain-cards-report.json"), { ...report, updatedAt: new Date().toISOString() });
};

await mapLimit(todo, concurrency, async (resort) => {
  try {
    const { hero, thumb, share, snowlineM, lowRelief, crop, cell } = await renderCard(resort);
    if (previews < previewCount) {
      previews++;
      writeFileSync(join(PREVIEW_DIR, `${resort.slug}-hero.webp`), hero);
      writeFileSync(join(PREVIEW_DIR, `${resort.slug}-share.webp`), share);
    }
    if (upload) {
      const names = {
        hero: `${resort.slug}-hero-${contentHash(hero)}.webp`,
        thumb: `${resort.slug}-thumb-${contentHash(thumb)}.webp`,
        share: `${resort.slug}-share-${contentHash(share)}.webp`,
      };
      await uploadObject(env, BUCKET, names.hero, hero, "image/webp");
      await uploadObject(env, BUCKET, names.thumb, thumb, "image/webp");
      await uploadObject(env, BUCKET, names.share, share, "image/webp");
      // No timestamp here: the file ships to the client, and the render
      // time is already in the report and the log.
      cards[resort.slug] = names;
    }
    report.cards[resort.slug] = {
      renderedAt: new Date().toISOString(),
      snowlineM,
      lowRelief,
      cropX: crop.x,
      cropY: crop.y,
      metresPerPixel: cell,
      bytesHero: hero.length,
      bytesThumb: thumb.length,
      bytesShare: share.length,
      uploaded: upload,
    };
    done++;
    // A --no-upload run has no URLs to record, so it never touches the JSON.
    if (upload && (done % 10 === 0 || done === todo.length)) persist();
    logger.progress({ total: todo.length, done, failed, current: resort.slug });
    logger.log(`${resort.slug}: snowline ${snowlineM} m, hero ${Math.round(hero.length / 1024)} KB, thumb ${Math.round(thumb.length / 1024)} KB, share ${Math.round(share.length / 1024)} KB${upload ? "" : " (not uploaded)"}`);
  } catch (e) {
    failed++;
    report.cards[resort.slug] = { error: e.message };
    logger.log(`${resort.slug}: FAILED ${e.message}`);
  }
});
if (upload) persist();
logger.progress({ total: todo.length, done, failed, current: null, finishedAt: new Date().toISOString() });
logger.log(`terrain cards finished: ${done} rendered, ${failed} failed, ${Object.keys(cards).length} in ${CARDS_JSON}`);
