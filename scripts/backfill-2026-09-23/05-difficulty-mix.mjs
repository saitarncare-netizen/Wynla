// Step 5 — difficulty mix rows that do not add up.
//
// Why: lib/difficulty.ts trusts a row as soon as two of the four
// difficulty_pct_* buckets are set and the sum is >= 70, then pins the
// remainder onto the largest bucket. A row like Okemo [32, 38, NULL,
// NULL] therefore renders as 32 / 68 / 0 / 0 — fabricated. 96 active rows
// were partial or summed outside 98-102.
//
// Fixes, in order:
//   1. Percentages typed into the trails_* count columns: when the four
//      counts sum to exactly 100 while total_trails is nowhere near 100,
//      they are percentages — copy them into difficulty_pct_* and clear
//      the count columns.
//   2. One bucket NULL while the other three already sum to 98-102: the
//      missing bucket is 0 (Alta [15, 30, 55, NULL] has no green runs
//      by any source), so write the 0 instead of letting normalize()
//      guess.
//   3. Pass resorts (Epic / Ikon / Indy / Mountain Collective): take the
//      percentages OnTheSnow publishes for the resort (cache from
//      00-fetch-onthesnow.mjs, source URL in the report) when they sum
//      to 98-102, again reading one missing bucket as 0.
//   4. Everything else is left alone and listed in the report.
//
//   node scripts/backfill-2026-09-23/05-difficulty-mix.mjs [--apply]

import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import {
  select,
  run,
  writeReport,
  appliedChangesTable,
  appliedRows,
  appliedRunsLine,
  statsLookLikeSameResort,
  REPORT_DIR,
} from "./_lib.mjs";

const STEP = "05-difficulty-mix";
const CACHE = path.join(REPORT_DIR, "onthesnow-cache.json");
const ots = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")).resorts : {};
const PCT = ["difficulty_pct_beginner", "difficulty_pct_intermediate", "difficulty_pct_advanced", "difficulty_pct_expert"];
const CNT = ["trails_beginner", "trails_intermediate", "trails_advanced", "trails_expert"];
const PASS = /^(epic|ikon|indy|mountain_collective)$/;

const rows = await select(
  "resorts",
  `select=id,slug,name,state,passes,tier,total_trails,${PCT.join(",")},${CNT.join(",")}&active=eq.true&order=id.asc`,
);

const sumOf = (r, cols) => cols.reduce((a, c) => a + (r[c] ?? 0), 0);
const setCount = (r, cols) => cols.filter((c) => r[c] != null).length;
const okSum = (s) => s >= 98 && s <= 102;
const isBad = (r) => setCount(r, PCT) > 0 && (setCount(r, PCT) < 4 || !okSum(sumOf(r, PCT)));
/** Four values with at most one null; a lone null reads as 0 when the rest sum to ~100. */
const completeMix = (vals) => {
  const nulls = vals.filter((v) => v == null).length;
  if (nulls > 1) return null;
  const filled = vals.map((v) => v ?? 0);
  return okSum(filled.reduce((a, b) => a + b, 0)) ? filled : null;
};

const changes = [];
const left = [];
for (const r of rows) {
  const countsArePct = setCount(r, CNT) >= 3 && sumOf(r, CNT) === 100 && (r.total_trails == null || Math.abs(r.total_trails - 100) > 2);
  if (countsArePct) {
    const patch = Object.fromEntries(PCT.map((c, i) => [c, r[CNT[i]] ?? 0]));
    for (const c of CNT) patch[c] = null;
    const differs = PCT.some((c) => patch[c] !== r[c]) || CNT.some((c) => r[c] != null);
    if (differs) {
      changes.push({ id: r.id, slug: r.slug, before: r, patch, source: `trails_* held percentages (sum 100, total_trails ${r.total_trails})` });
      continue;
    }
  }
  if (!isBad(r)) continue;
  const own = completeMix(PCT.map((c) => r[c]));
  if (own && setCount(r, PCT) === 3) {
    const missing = PCT.find((c) => r[c] == null);
    changes.push({ id: r.id, slug: r.slug, before: r, patch: { [missing]: 0 }, source: "other three buckets sum to ~100; missing bucket is 0" });
    continue;
  }
  const isPass = (r.passes || []).some((p) => PASS.test(p));
  const o = ots[r.slug];
  const pcts = o && o.status === 200 && statsLookLikeSameResort(o, r.total_trails)
    ? completeMix([o.pct_beginner, o.pct_intermediate, o.pct_advanced, o.pct_expert])
    : null;
  if (isPass && pcts) {
    const patch = Object.fromEntries(PCT.map((c, i) => [c, pcts[i]]).filter(([c, v]) => r[c] !== v));
    changes.push({ id: r.id, slug: r.slug, before: r, patch, source: `OnTheSnow ${o.url}` });
    continue;
  }
  left.push(
    `${r.slug} (${r.state}, ${(r.passes || []).join("/") || "independent"}) [${PCT.map((c) => r[c] ?? "-").join(", ")}] sum=${sumOf(r, PCT)}` +
      (o?.status === 200
        ? ` — OnTheSnow has [${[o.pct_beginner, o.pct_intermediate, o.pct_advanced, o.pct_expert].map((v) => v ?? "-").join(", ")}]`
        : ""),
  );
}

const result = await run(STEP, "resorts", changes, [...PCT, ...CNT]);

const pending = result.applied ? [] : changes;
const all = [...appliedRows(STEP), ...pending];
const badNow = rows.filter(isBad).length;
writeReport(
  STEP,
  `# Step 5 — difficulty mix

Report generated ${new Date().toISOString()} (${result.applied ? "apply run" : "dry run"}). ${appliedRunsLine(STEP)}

| metric | count |
|---|---|
| active rows with any difficulty_pct | ${rows.filter((r) => setCount(r, PCT) > 0).length} |
| partial or not summing to 98-102 at this run | ${badNow} |
| fixed: percentages that had been typed into trails_* counts | ${all.filter((c) => c.source?.startsWith("trails_*")).length} |
| fixed: lone missing bucket set to 0 (other three sum to ~100) | ${all.filter((c) => c.source?.startsWith("other three")).length} |
| fixed: pass resorts from OnTheSnow's published mix | ${all.filter((c) => c.source?.startsWith("OnTheSnow")).length} |
| rows updated (all applied runs) | ${appliedRows(STEP).length} |
| still proposed by this run | ${pending.length} |
| left as is (non-pass, or no clean source) | ${left.length} |

## Left as is
${left.length ? left.map((l) => `- ${l}`).join("\n") : "- none"}

## Changes (with source)
${appliedChangesTable(STEP, pending)}
`,
);
