// Step 5 — difficulty mix rows that do not add up.
//
// Why: lib/difficulty.ts trusts a row as soon as two of the four
// difficulty_pct_* buckets are set and the sum is >= 70, then pins the
// remainder onto the largest bucket. A row like Okemo [32, 38, NULL,
// NULL] therefore renders as 32 / 68 / 0 / 0 — fabricated. 96 active rows
// were partial or summed outside 98-102.
//
// Policy (revised 2026-09-23 after review): a resort's OWN published
// split is the source of truth and is normalised, never replaced.
// OnTheSnow — a third-party aggregator with its own bucket definitions —
// fills only pass resorts that never had a usable split of their own.
// "Own" means the values before this step ever touched the row (read
// back from backups/), so a re-run after a policy change re-derives
// every row from the same starting point and writes only what differs
// from the live row.
//
// Rules, applied to the original values in order:
//   1. Percentages typed into the trails_* count columns (four counts
//      summing to exactly 100 while total_trails is nowhere near 100):
//      copy them into difficulty_pct_*, clear the counts.
//   2. Four buckets set, sum outside 98-102 but within 70-150: scale to
//      exactly 100 (largest-remainder rounding). Killington
//      [17, 39, 39, 14] -> [16, 36, 36, 12] + remainders, not OnTheSnow's mix.
//   3. Three buckets set: the missing one is 0 when the other three
//      already sum to 98-102 (Alta has no green runs by any source), or
//      the remainder to 100 when they sum to 65-97 (Bretton Woods
//      [25, 29, 27, NULL] -> expert 19).
//   4. Fewer than three buckets, or a sum outside those ranges, on a pass
//      resort (Epic / Ikon / Indy / Mountain Collective): OnTheSnow's
//      published mix (cache from 00-fetch-onthesnow.mjs, source URL in
//      the report) when it sums to 98-102.
//   5. Everything else is left alone and listed in the report.
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

// The values each row had before this step first wrote to it.
const original = {};
for (const r of appliedRows(STEP)) original[r.id] ??= r.before;

const sumOf = (vals) => vals.reduce((a, v) => a + (v ?? 0), 0);
const setCount = (vals) => vals.filter((v) => v != null).length;
const okSum = (s) => s >= 98 && s <= 102;
const isBad = (vals) => setCount(vals) > 0 && (setCount(vals) < 4 || !okSum(sumOf(vals)));

/** Scale four numbers to sum to exactly 100, distributing the rounding remainder to the largest fractional parts. */
function scaleTo100(vals) {
  const total = sumOf(vals);
  const raw = vals.map((v) => (v * 100) / total);
  const out = raw.map(Math.floor);
  const byFraction = raw.map((v, i) => [v - out[i], i]).sort((a, b) => b[0] - a[0]);
  for (let k = 0; k < 100 - sumOf(out); k++) out[byFraction[k][1]] += 1;
  return out;
}

/**
 * Rules 2-3 on the row's own numbers. Returns { pct, rule } or null when
 * the row's own numbers cannot be normalised (rule 4/5 territory).
 */
function normaliseOwn(vals) {
  const set = setCount(vals);
  const sum = sumOf(vals);
  if (set === 4) {
    if (okSum(sum)) return { pct: vals, rule: "already consistent" };
    if (sum >= 70 && sum <= 150) return { pct: scaleTo100(vals), rule: `own four buckets scaled from ${sum} to 100` };
    return null;
  }
  if (set === 3) {
    const missing = vals.findIndex((v) => v == null);
    if (okSum(sum)) {
      const pct = vals.map((v) => v ?? 0);
      return { pct, rule: "other three buckets sum to ~100; missing bucket is 0" };
    }
    if (sum >= 65 && sum <= 97) {
      const pct = vals.map((v, i) => (i === missing ? 100 - sum : v));
      return { pct, rule: `missing bucket is the remainder to 100 (${100 - sum})` };
    }
  }
  return null;
}

/** OnTheSnow's four buckets, reading a lone missing one as 0, when they sum to ~100. */
function onTheSnowMix(o) {
  const vals = [o.pct_beginner, o.pct_intermediate, o.pct_advanced, o.pct_expert];
  if (setCount(vals) < 3) return null;
  const filled = vals.map((v) => v ?? 0);
  return okSum(sumOf(filled)) ? filled : null;
}

const changes = [];
const left = [];
// Final rule per slug, for every row the policy touches (whether or not
// the live row still needs a write) — the report counts from this, so a
// row corrected twice (OnTheSnow, then its own normalised split) is one row.
const ruleBySlug = {};
for (const r of rows) {
  const o = { ...r, ...(original[r.id] ?? {}) };
  let ownPct = PCT.map((c) => o[c]);
  let counts = CNT.map((c) => o[c]);
  let rule = null;

  // Rule 1 — percentages stored as counts.
  const countsArePct = setCount(counts) >= 3 && sumOf(counts) === 100 && (o.total_trails == null || Math.abs(o.total_trails - 100) > 2);
  if (countsArePct) {
    ownPct = counts.map((v) => v ?? 0);
    counts = [null, null, null, null];
    rule = `trails_* held percentages (sum 100, total_trails ${o.total_trails})`;
  }

  let targetPct = ownPct;
  if (isBad(ownPct)) {
    const own = normaliseOwn(ownPct);
    if (own) {
      targetPct = own.pct;
      rule = rule ? `${rule}; ${own.rule}` : own.rule;
    } else {
      const isPass = (o.passes || []).some((p) => PASS.test(p));
      const page = ots[r.slug];
      const mix = isPass && page?.status === 200 && statsLookLikeSameResort(page, o.total_trails) ? onTheSnowMix(page) : null;
      if (mix) {
        targetPct = mix;
        rule = `OnTheSnow ${page.url} (own split had ${setCount(ownPct)} buckets summing to ${sumOf(ownPct)})`;
      } else {
        left.push(
          `${r.slug} (${r.state}, ${(o.passes || []).join("/") || "independent"}) [${ownPct.map((v) => v ?? "-").join(", ")}] sum=${sumOf(ownPct)}` +
            (page?.status === 200
              ? ` — OnTheSnow has [${[page.pct_beginner, page.pct_intermediate, page.pct_advanced, page.pct_expert].map((v) => v ?? "-").join(", ")}]`
              : ""),
        );
        continue;
      }
    }
  } else if (!rule) {
    continue;
  }

  ruleBySlug[r.slug] = rule;
  const target = Object.fromEntries([...PCT.map((c, i) => [c, targetPct[i]]), ...CNT.map((c, i) => [c, counts[i]])]);
  const patch = Object.fromEntries(Object.entries(target).filter(([c, v]) => r[c] !== v));
  if (Object.keys(patch).length === 0) continue;
  // A live row that already differs from its original values was written
  // by an earlier run of this step (the OnTheSnow replacement); say so.
  const reverted = original[r.id] && PCT.some((c) => original[r.id][c] !== r[c]) && !/^OnTheSnow/.test(rule);
  const source = reverted ? `${rule} — replaces the OnTheSnow mix written by the first run` : rule;
  changes.push({ id: r.id, slug: r.slug, before: r, patch, source });
}

const result = await run(STEP, "resorts", changes, [...PCT, ...CNT]);

const pending = result.applied ? [] : changes;
const badNow = rows.filter((r) => isBad(PCT.map((c) => r[c]))).length;
// Rows this step has corrected, counted once each by their final rule.
const touched = new Set([...appliedRows(STEP).map((c) => c.slug), ...pending.map((c) => c.slug)]);
const countRule = (re) => [...touched].filter((slug) => re.test(ruleBySlug[slug] ?? "")).length;
const isPassRow = (r) => (r.passes || []).some((p) => PASS.test(p));
const independentsNormalised = rows.filter((r) => touched.has(r.slug) && !isPassRow(r) && /scaled from|missing bucket/.test(ruleBySlug[r.slug] ?? "")).length;
writeReport(
  STEP,
  `# Step 5 — difficulty mix

Report generated ${new Date().toISOString()} (${result.applied ? "apply run" : "dry run"}). ${appliedRunsLine(STEP)}

Policy: a resort's own published split is normalised (scaled to 100, or a lone missing bucket filled), never replaced. That is arithmetic, not research, so it applies to independents too. OnTheSnow's mix is used only for pass resorts whose own split had fewer than three buckets or a sum outside 70-150. The first two applied runs had replaced 33 pass resorts with OnTheSnow's mix; the third run puts the normalised original values back (rows marked "replaces the OnTheSnow mix" below).

| metric | count |
|---|---|
| active rows with any difficulty_pct | ${rows.filter((r) => setCount(PCT.map((c) => r[c])) > 0).length} |
| partial or not summing to 98-102 at this run (before this run's writes) | ${badNow} |
| rows corrected by this step (all runs, counted once) | ${touched.size} |
| fixed: percentages that had been typed into trails_* counts | ${countRule(/trails_\* held percentages/)} |
| fixed: own four buckets scaled to 100 | ${countRule(/scaled from/)} |
| fixed: lone missing bucket set to 0 (other three sum to ~100) | ${countRule(/missing bucket is 0/)} |
| fixed: lone missing bucket set to the remainder to 100 | ${countRule(/missing bucket is the remainder/)} |
| of which independents (own numbers normalised, no outside source) | ${independentsNormalised} |
| filled from OnTheSnow (pass resorts without a usable own split) | ${countRule(/^OnTheSnow/)} |
| rows whose OnTheSnow mix from the first run is replaced by their own normalised split | ${pending.filter((c) => /replaces the OnTheSnow mix/.test(c.source)).length + appliedRows(STEP).filter((c) => /replaces the OnTheSnow mix/.test(c.source ?? "")).length} |
| rows updated (all applied runs) | ${appliedRows(STEP).length} |
| still proposed by this run | ${pending.length} |
| left as is (fewer than three own buckets and no clean source) | ${left.length} |

## Left as is
${left.length ? left.map((l) => `- ${l}`).join("\n") : "- none"}

## Changes (with source)
${appliedChangesTable(STEP, pending)}
`,
);
