// Coverage report + contact sheet for the harvested photo candidates.
//
//   node scripts/photos/report.mjs        (re-generate from what is on disk)
//
// Also imported by 1-commons-harvest.mjs so a finished run ends with the
// same two artefacts:
//   scripts/photos/reports/harvest-coverage.{json,md}   numbers for the handoff
//   .tmp-photo-candidates/contact-sheet.html             thumbs for the vetting pass
//
// The contact sheet is deliberately self-contained (no framework, relative
// image paths) so it opens from the file system, and it can export a
// chosen.json in the shape scripts/photos/3-publish.mjs expects.

import { readdirSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readJsonIfExists } from "./_shared.mjs";

export function loadManifests(outDir) {
  if (!existsSync(outDir)) return [];
  const manifests = [];
  for (const entry of readdirSync(outDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const m = readJsonIfExists(join(outDir, entry.name, "manifest.json"));
    if (m) manifests.push(m);
  }
  manifests.sort((a, b) => (a.state ?? "").localeCompare(b.state ?? "") || a.name.localeCompare(b.name));
  return manifests;
}

const count = (obj, key) => (obj[key] = (obj[key] ?? 0) + 1);

export function buildCoverage(manifests) {
  const dist = {};
  const byTier = {};
  const byState = {};
  const byMatch = { coord: 0, name: 0, none: 0 };
  const rejections = {};
  const seasons = { winter: 0, unknown: 0 };
  const sourcesUsed = { p18: 0, category: 0, geosearch: 0, search: 0 };
  let withCandidates = 0;
  let withExistingStorageHero = 0;
  let noCandidateAndNoHero = 0;
  let totalCandidates = 0;
  for (const m of manifests) {
    const n = m.candidates?.length ?? 0;
    totalCandidates += n;
    count(dist, String(Math.min(n, 6)));
    const tier = m.tier ?? "unknown";
    byTier[tier] ??= { resorts: 0, withCandidates: 0 };
    byTier[tier].resorts++;
    byState[m.state] ??= { resorts: 0, withCandidates: 0 };
    byState[m.state].resorts++;
    if (n > 0) {
      withCandidates++;
      byTier[tier].withCandidates++;
      byState[m.state].withCandidates++;
    }
    byMatch[m.wikidata?.method ?? "none"]++;
    for (const [reason, c] of Object.entries(m.gate?.rejected ?? {})) rejections[reason] = (rejections[reason] ?? 0) + c;
    for (const c of m.candidates ?? []) {
      count(seasons, c.exifSeason === "winter" ? "winter" : "unknown");
      count(sourcesUsed, c.source);
    }
    const hasStorageHero = !!m.existingHero?.url && /\/storage\/v1\/object\/public\//.test(m.existingHero.url);
    if (hasStorageHero) withExistingStorageHero++;
    if (!hasStorageHero && n === 0) noCandidateAndNoHero++;
  }
  return {
    generatedAt: new Date().toISOString(),
    resorts: manifests.length,
    withCandidates,
    withoutCandidates: manifests.length - withCandidates,
    withExistingStorageHero,
    noCandidateAndNoHero,
    totalCandidates,
    candidateDistribution: dist,
    wikidataMatch: byMatch,
    candidateSeasons: seasons,
    candidateSources: sourcesUsed,
    byTier,
    byState,
    topRejections: Object.entries(rejections)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([reason, n]) => ({ reason, n })),
  };
}

export function writeCoverageReport(outDir, reportsDir) {
  const manifests = loadManifests(outDir);
  const cov = buildCoverage(manifests);
  mkdirSync(reportsDir, { recursive: true });
  writeFileSync(join(reportsDir, "harvest-coverage.json"), JSON.stringify(cov, null, 2) + "\n");
  const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : "0%");
  const md = [
    `# Commons harvest coverage`,
    ``,
    `Generated ${cov.generatedAt}. Numbers are Gate 1 (metadata) only; the vision pass decides what ships.`,
    ``,
    `| Metric | Value |`,
    `|---|---|`,
    `| Active resorts harvested | ${cov.resorts} |`,
    `| Resorts with >= 1 gated candidate | ${cov.withCandidates} (${pct(cov.withCandidates, cov.resorts)}) |`,
    `| Resorts with 0 candidates | ${cov.withoutCandidates} |`,
    `| Resorts already holding a storage-hosted hero | ${cov.withExistingStorageHero} |`,
    `| No candidate and no hero (terrain card only) | ${cov.noCandidateAndNoHero} |`,
    `| Candidate thumbs downloaded | ${cov.totalCandidates} |`,
    `| Wikidata match by coordinates / name / none | ${cov.wikidataMatch.coord} / ${cov.wikidataMatch.name} / ${cov.wikidataMatch.none} |`,
    `| Candidates with a Nov-Apr EXIF month / unknown month | ${cov.candidateSeasons.winter} / ${cov.candidateSeasons.unknown} |`,
    ``,
    `## Candidates per resort`,
    ``,
    `| Candidates | Resorts |`,
    `|---|---|`,
    ...["0", "1", "2", "3", "4", "5", "6"].map((k) => `| ${k}${k === "6" ? " (cap)" : ""} | ${cov.candidateDistribution[k] ?? 0} |`),
    ``,
    `## By tier`,
    ``,
    `| Tier | Resorts | With candidates |`,
    `|---|---|---|`,
    ...Object.entries(cov.byTier).map(([t, v]) => `| ${t} | ${v.resorts} | ${v.withCandidates} (${pct(v.withCandidates, v.resorts)}) |`),
    ``,
    `## Where the candidates came from`,
    ``,
    `| Source | Candidates |`,
    `|---|---|`,
    ...Object.entries(cov.candidateSources).map(([s, n]) => `| ${s} | ${n} |`),
    ``,
    `## Top Gate 1 rejections`,
    ``,
    `| Reason | Files |`,
    `|---|---|`,
    ...cov.topRejections.map((r) => `| ${r.reason} | ${r.n} |`),
    ``,
    `## By state`,
    ``,
    `| State | Resorts | With candidates |`,
    `|---|---|---|`,
    ...Object.entries(cov.byState)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([s, v]) => `| ${s} | ${v.resorts} | ${v.withCandidates} |`),
    ``,
  ].join("\n");
  writeFileSync(join(reportsDir, "harvest-coverage.md"), md);
  return cov;
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export function writeContactSheet(outDir) {
  const manifests = loadManifests(outDir);
  const rows = manifests
    .map((m) => {
      const cands = (m.candidates ?? [])
        .map(
          (c, i) => `
        <figure data-slug="${esc(m.slug)}" data-index="${i}" data-title="${esc(c.title)}">
          <img src="${esc(c.file.replace(".tmp-photo-candidates/", ""))}" alt="${esc(c.title)}" loading="lazy" width="320">
          <figcaption>
            <b>#${i}</b> ${esc(c.source)} · ${c.width}×${c.height} · ${esc(c.exifSeason)}${c.exifDate ? ` (${esc(c.exifDate.slice(0, 10))})` : ""}<br>
            ${c.author ? esc(c.author) : `<span class="pill warn">author unknown: add "author" to chosen.json</span>`} · ${esc(c.licence)}<br>
            <a href="${esc(c.sourcePage)}" target="_blank" rel="noopener">${esc(c.title.replace(/^File:/, "")).slice(0, 60)}</a>
          </figcaption>
        </figure>`,
        )
        .join("");
      const hero = m.existingHero?.url
        ? `<span class="pill ${/storage\/v1\/object\/public/.test(m.existingHero.url) ? "ok" : "warn"}">hero: ${/storage\/v1\/object\/public/.test(m.existingHero.url) ? "storage" : "third-party"}${m.existingHero.verifiedWinter === true ? ", verified winter" : ""}</span>`
        : `<span class="pill none">no hero</span>`;
      const wd = m.wikidata ? `<a href="${esc(m.wikidata.wikidataUrl)}" target="_blank" rel="noopener">${esc(m.wikidata.qid)}</a> ${esc(m.wikidata.method)}${m.wikidata.distanceKm != null ? ` ${m.wikidata.distanceKm} km` : ""}` : "no Wikidata match";
      return `
      <section id="${esc(m.slug)}" class="${cands.length ? "" : "empty"}">
        <h2>${esc(m.name)} <small>${esc(m.state)} · ${esc(m.tier ?? "")} · ${esc(m.slug)}</small></h2>
        <p class="meta">${hero} · ${wd} · pool ${m.considered ?? 0}, passed ${m.gate?.passed ?? 0}, overflow ${(m.overflow ?? []).length}</p>
        <div class="grid">${cands || "<p class='muted'>No candidate passed Gate 1.</p>"}</div>
      </section>`;
    })
    .join("\n");

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Wynla photo candidates</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body{font-family:system-ui,Segoe UI,sans-serif;margin:0;padding:16px;background:#FAFAF7;color:#2A2A2A}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:16px;margin:24px 0 4px;color:#1E2952} h2 small{font-weight:400;color:#666}
  .meta{font-size:12px;color:#555;margin:0 0 8px} .pill{display:inline-block;padding:1px 6px;border-radius:999px;font-size:11px}
  .pill.ok{background:#dcfce7;color:#166534} .pill.warn{background:#fef3c7;color:#92400e} .pill.none{background:#e5e7eb;color:#374151}
  .grid{display:flex;flex-wrap:wrap;gap:10px} figure{margin:0;width:320px;border:3px solid transparent;border-radius:8px;background:#fff;padding:4px;cursor:pointer}
  figure.chosen{border-color:#F5C443} figcaption{font-size:11px;line-height:1.35;color:#444;padding:4px 2px} img{display:block;width:312px;height:176px;object-fit:cover;border-radius:4px;background:#1E2952}
  .muted{color:#888;font-size:12px} section.empty{opacity:.7} .toolbar{position:sticky;top:0;background:#FAFAF7;padding:8px 0;border-bottom:1px solid #ddd;z-index:1}
  button{min-height:44px;padding:0 14px;border-radius:8px;border:1px solid #1E2952;background:#1E2952;color:#fff;font-weight:600}
  input[type=search]{min-height:44px;padding:0 10px;border-radius:8px;border:1px solid #bbb;width:240px}
</style></head><body>
<div class="toolbar">
  <h1>Wynla photo candidates <small style="font-weight:400;color:#666">${manifests.length} resorts, generated ${new Date().toISOString().slice(0, 16)}Z</small></h1>
  <p class="meta">Click a thumb to choose it for that resort (one per resort), then Copy chosen.json. Vetting rubric and next step: handoff-docs/PHOTOS_2026-09-23.md.</p>
  <input type="search" id="q" placeholder="Filter by name, state or slug"> <button type="button" id="copy">Copy chosen.json</button> <span id="n" class="meta"></span>
</div>
${rows}
<script>
  const chosen = new Map();
  document.querySelectorAll('figure').forEach(f => f.addEventListener('click', () => {
    const slug = f.dataset.slug;
    document.querySelectorAll('figure[data-slug="' + slug + '"]').forEach(x => x.classList.remove('chosen'));
    if (chosen.get(slug) === f.dataset.index) { chosen.delete(slug); }
    else { chosen.set(slug, f.dataset.index); f.classList.add('chosen'); }
    document.getElementById('n').textContent = chosen.size + ' chosen';
  }));
  document.getElementById('copy').addEventListener('click', async () => {
    const out = [...chosen].map(([slug, index]) => ({ slug, index: Number(index), reason: '' }));
    await navigator.clipboard.writeText(JSON.stringify(out, null, 2));
    document.getElementById('n').textContent = chosen.size + ' chosen, copied';
  });
  document.getElementById('q').addEventListener('input', e => {
    const q = e.target.value.toLowerCase();
    document.querySelectorAll('section').forEach(s => { s.style.display = s.querySelector('h2').textContent.toLowerCase().includes(q) ? '' : 'none'; });
  });
</script>
</body></html>`;
  writeFileSync(join(outDir, "contact-sheet.html"), html);
  return manifests.length;
}

// Standalone run.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outDir = resolve(".tmp-photo-candidates");
  const reportsDir = resolve("scripts/photos/reports");
  const cov = writeCoverageReport(outDir, reportsDir);
  const n = writeContactSheet(outDir);
  console.log(`coverage: ${cov.withCandidates}/${cov.resorts} resorts with candidates; contact sheet for ${n} resorts`);
}
