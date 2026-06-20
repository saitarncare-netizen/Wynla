// Take the vision-vetting result + the candidate manifest and produce:
//   1) hero-update.sql  — UPDATE statements for the chosen resorts (run in
//      the Supabase SQL editor; no service key needed)
//   2) contact-sheet.html — every chosen winter hero in a grid for review
//   3) chosen.json — machine-readable record of the picks
import { readFileSync, writeFileSync } from 'node:fs';

const VET_OUT = process.argv[2];
const manifest = JSON.parse(readFileSync('./.tmp-hero-candidates/manifest.json', 'utf8'));
const raw = JSON.parse(readFileSync(VET_OUT, 'utf8'));
const picks = raw.result?.picks || raw.picks || [];

const sqlEsc = (s) => String(s ?? '').replace(/'/g, "''");

const chosen = [];
const fallback = [];
for (const p of picks) {
  if (!p.chosenFile || !p.chosenFile.trim()) { fallback.push(p.slug); continue; }
  const entry = manifest[p.slug];
  const cand = entry?.candidates?.find((c) => c.file === p.chosenFile);
  if (!cand?.url) { fallback.push(p.slug); continue; }
  chosen.push({
    slug: p.slug,
    name: entry.name,
    state: entry.state,
    url: cand.url,
    source: cand.source || 'wikimedia',
    attribution: cand.attribution || 'Wikimedia Commons',
    alt: `${entry.name} — ${entry.state} ski resort in winter`,
    confidence: p.winterConfidence,
    reason: p.reason,
    file: p.chosenFile,
  });
}

// 1) SQL
const sql = [
  '-- Wynla hero photos — vetted winter shots (run in Supabase SQL editor).',
  `-- ${chosen.length} resorts get a vetted real winter hero; the rest keep the designed fallback.`,
  '-- Re-runnable: overwrites hero_image_* by slug.',
  '',
  ...chosen.map((c) =>
    `UPDATE resorts SET hero_image_url='${sqlEsc(c.url)}', hero_image_source='${sqlEsc(c.source)}', hero_image_alt='${sqlEsc(c.alt)}', hero_image_attribution='${sqlEsc(c.attribution)}' WHERE slug='${sqlEsc(c.slug)}';`
  ),
].join('\n');
writeFileSync('./.tmp-hero-candidates/hero-update.sql', sql + '\n');

// 2) contact sheet
const byConf = { high: [], medium: [], low: [] };
for (const c of chosen) (byConf[c.confidence] || byConf.low).push(c);
const card = (c) => `<figure style="margin:0">
  <img src="${c.url}" loading="lazy" style="width:100%;height:150px;object-fit:cover;border-radius:8px;background:#1E2952" />
  <figcaption style="font:12px system-ui;padding:4px 2px;color:#222">
    <b>${c.name}</b> <span style="color:#888">(${c.state})</span><br>
    <span style="color:#${c.confidence === 'high' ? '0a7' : c.confidence === 'medium' ? 'a70' : 'a44'}">${c.confidence}</span>
    · ${c.reason}
  </figcaption></figure>`;
const section = (title, list) => `<h2 style="font:600 18px system-ui;margin:24px 0 8px">${title} (${list.length})</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px">${list.map(card).join('')}</div>`;
const html = `<!doctype html><meta charset="utf8"><title>Wynla hero photos — review</title>
<div style="max-width:1200px;margin:24px auto;padding:0 16px;font:14px system-ui">
<h1 style="font:700 24px system-ui">Wynla resort hero photos — ${chosen.length} vetted winter shots</h1>
<p style="color:#555">Every image below was machine-vetted as a beautiful winter ski scene. Flag any that look off and I'll swap or drop them. The ${fallback.length} resorts with no good photo use the clean designed fallback.</p>
${section('High confidence', byConf.high)}
${section('Medium confidence', byConf.medium)}
${section('Low confidence — eyeball these', byConf.low)}
</div>`;
writeFileSync('./.tmp-hero-candidates/contact-sheet.html', html);

// 3) chosen.json
writeFileSync('./.tmp-hero-candidates/chosen.json', JSON.stringify(chosen, null, 1));

console.log(`chosen: ${chosen.length}  fallback: ${fallback.length}`);
console.log(`confidence — high: ${byConf.high.length}  medium: ${byConf.medium.length}  low: ${byConf.low.length}`);
console.log('wrote hero-update.sql, contact-sheet.html, chosen.json');
