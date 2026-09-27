// Source candidate hero photos for ALL resorts from license-clear sources so they
// can be vision-vetted (winter + beautiful + correct) before any DB write.
// Sources: Wikimedia Commons (no key). Unsplash + Pexels added automatically if
// UNSPLASH_ACCESS_KEY / PEXELS_API_KEY are set (better long-tail + modern shots).
// Robust: per-fetch AbortController timeout, exponential backoff, polite delay,
// incremental manifest write + resume (re-running skips resorts already done).
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';

const RESORTS = JSON.parse(await readFile('./data/stage-22-resorts.json', 'utf8'));
const UA = 'WynlaHeroBot/1.0 (https://wynla.app; saitarncare@gmail.com)';
const OUT = '.tmp-hero-candidates';
const MANIFEST = `${OUT}/manifest.json`;
const PER_RESORT = 5;
const UNSPLASH = process.env.UNSPLASH_ACCESS_KEY || '';
const PEXELS = process.env.PEXELS_API_KEY || '';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function fetchJson(url, headers = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 20000);
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, ...headers }, signal: ac.signal });
      clearTimeout(t);
      if (r.status === 429) { await sleep(2000 * (attempt + 1)); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch { clearTimeout(t); await sleep(800 * (attempt + 1)); }
  }
  return null;
}

function cleanName(name) {
  return name.replace(/\b(Ski |Mountain )?Resort\b| Mountain Resort| Ski Area| Winter Park/gi, '').trim();
}

async function wikimedia(query) {
  const url = 'https://commons.wikimedia.org/w/api.php?' + new URLSearchParams({
    action: 'query', generator: 'search', gsrsearch: query, gsrnamespace: '6',
    gsrlimit: '8', prop: 'imageinfo', iiprop: 'url|mime|extmetadata',
    iiurlwidth: '1280', format: 'json', origin: '*',
  });
  const j = await fetchJson(url);
  const pages = j?.query?.pages ? Object.values(j.query.pages) : [];
  return pages.map(p => {
    const ii = p.imageinfo?.[0]; if (!ii) return null;
    if (!/^image\/(jpeg|png|webp)$/.test(ii.mime || '')) return null;
    const m = ii.extmetadata || {};
    const author = (m.Artist?.value || '').replace(/<[^>]+>/g, '').trim().slice(0, 80);
    const lic = (m.LicenseShortName?.value || '').replace(/<[^>]+>/g, '').trim();
    return { thumb: ii.thumburl || ii.url, source: 'wikimedia',
             attribution: [author, lic].filter(Boolean).join(' / ') || 'Wikimedia Commons',
             credit: p.title };
  }).filter(Boolean);
}

async function unsplash(query) {
  if (!UNSPLASH) return [];
  const url = 'https://api.unsplash.com/search/photos?' + new URLSearchParams({
    query, per_page: '5', orientation: 'landscape', content_filter: 'high',
  });
  const j = await fetchJson(url, { Authorization: `Client-ID ${UNSPLASH}` });
  return (j?.results || []).map(p => ({
    thumb: p.urls?.regular, source: 'unsplash',
    attribution: `${p.user?.name || 'Unsplash'} / Unsplash`, credit: p.links?.html,
  })).filter(c => c.thumb);
}

async function pexels(query) {
  if (!PEXELS) return [];
  const url = 'https://api.pexels.com/v1/search?' + new URLSearchParams({
    query, per_page: '5', orientation: 'landscape',
  });
  const j = await fetchJson(url, { Authorization: PEXELS });
  return (j?.photos || []).map(p => ({
    thumb: p.src?.large2x || p.src?.large, source: 'pexels',
    attribution: `${p.photographer || 'Pexels'} / Pexels`, credit: p.url,
  })).filter(c => c.thumb);
}

async function download(url, dest) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), 25000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA }, signal: ac.signal });
    clearTimeout(t);
    if (!r.ok) return false;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 6000) return false;
    await writeFile(dest, buf);
    return true;
  } catch { clearTimeout(t); return false; }
}

let manifest = {};
if (existsSync(MANIFEST)) { try { manifest = JSON.parse(await readFile(MANIFEST, 'utf8')); } catch {} }
if (!existsSync(OUT)) await mkdir(OUT, { recursive: true });

let done = 0, withCands = 0;
for (const rz of RESORTS) {
  done++;
  if (manifest[rz.slug]?.candidates?.length) { withCands++; continue; } // resume
  const dir = `${OUT}/${rz.slug}`;
  if (!existsSync(dir)) await mkdir(dir, { recursive: true });
  const clean = cleanName(rz.name);
  const queries = [`${rz.name} ski`, `${rz.name} winter`, `${clean} ${rz.state} ski resort`];
  const seen = new Set(); let cands = [];
  for (const q of queries) {
    for (const c of await wikimedia(q)) { if (!seen.has(c.thumb)) { seen.add(c.thumb); cands.push(c); } }
  }
  // Supplement with Unsplash/Pexels (if keys present) — modern winter shots
  for (const c of await unsplash(`${clean} ski resort winter snow`)) { if (!seen.has(c.thumb)) { seen.add(c.thumb); cands.push(c); } }
  for (const c of await pexels(`${clean} ski resort winter`)) { if (!seen.has(c.thumb)) { seen.add(c.thumb); cands.push(c); } }

  const picked = cands.slice(0, PER_RESORT + (UNSPLASH || PEXELS ? 3 : 0));
  const saved = [];
  for (let i = 0; i < picked.length; i++) {
    const dest = `${dir}/cand-${i}.jpg`;
    if (await download(picked[i].thumb, dest)) {
      saved.push({ file: dest, url: picked[i].thumb, source: picked[i].source, attribution: picked[i].attribution, credit: picked[i].credit });
    }
  }
  manifest[rz.slug] = { name: rz.name, state: rz.state, candidates: saved };
  if (saved.length) withCands++;
  if (done % 10 === 0) {
    await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
    console.log(`[${done}/${RESORTS.length}] ${withCands} resorts with candidates so far (last: ${rz.slug} ${saved.length})`);
  }
  await sleep(250);
}
await writeFile(MANIFEST, JSON.stringify(manifest, null, 2));
console.log(`DONE: ${done} resorts processed, ${withCands} have >=1 candidate. Manifest: ${MANIFEST}`);
