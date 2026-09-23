// Step 2 — fill resorts.vertical_drop where it is NULL.
//
// Why: vertical_drop drives the size filter (NULL rows vanish when any
// size chip is active), the /state page sort and the headline stat.
// 197 of 425 active rows were NULL; 97 of them already had both a base
// and a summit elevation on the row.
//
// Sources, in order:
//   1. summit - base from the row itself (summit_elevation_ft /
//      base_elevation_ft, falling back to the legacy elevation_summit /
//      elevation_base pair), accepted only when the result is 100-6000 ft.
//   2. OnTheSnow's published "Vertical Drop" for the resort, from the
//      cache built by 00-fetch-onthesnow.mjs (source URL in the report),
//      accepted with the same 100-6000 ft sanity range.
// Rows that neither source can fill are listed in the report.
//
//   node scripts/backfill-2026-09-23/02-vertical-drop.mjs [--apply]

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
  num,
  REPORT_DIR,
} from "./_lib.mjs";

const STEP = "02-vertical-drop";
const CACHE = path.join(REPORT_DIR, "onthesnow-cache.json");
const ots = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, "utf8")).resorts : {};

const rows = await select(
  "resorts",
  "select=id,slug,name,state,passes,tier,vertical_drop,summit_elevation_ft,base_elevation_ft,elevation_summit,elevation_base,total_lifts,total_trails&active=eq.true&vertical_drop=is.null&order=id.asc",
);

const inRange = (v) => v != null && v >= 100 && v <= 6000;
const changes = [];
const unfilled = [];
for (const r of rows) {
  const summit = num(r.summit_elevation_ft) ?? num(r.elevation_summit);
  const base = num(r.base_elevation_ft) ?? num(r.elevation_base);
  const derived = summit != null && base != null ? summit - base : null;
  if (inRange(derived)) {
    changes.push({ id: r.id, slug: r.slug, before: r, patch: { vertical_drop: derived }, source: `summit ${summit} - base ${base}` });
    continue;
  }
  const o = ots[r.slug];
  if (o && o.status === 200 && inRange(o.vertical_ft) && statsLookLikeSameResort(o, r.total_trails)) {
    changes.push({ id: r.id, slug: r.slug, before: r, patch: { vertical_drop: o.vertical_ft }, source: `OnTheSnow ${o.url}` });
    continue;
  }
  unfilled.push(
    `${r.slug} (${r.state}, ${(r.passes || []).join("/")}, lifts=${r.total_lifts ?? "?"})` +
      (derived != null ? ` — summit-base=${derived} out of range` : ""),
  );
}

const result = await run(STEP, "resorts", changes, ["vertical_drop"]);

const pending = result.applied ? [] : changes;
const all = [...appliedRows(STEP), ...pending];
const fromRow = all.filter((c) => c.source?.startsWith("summit")).length;
const fromOts = all.filter((c) => c.source?.startsWith("OnTheSnow")).length;
writeReport(
  STEP,
  `# Step 2 — vertical_drop backfill

Report generated ${new Date().toISOString()} (${result.applied ? "apply run" : "dry run"}). ${appliedRunsLine(STEP)}

| metric | count |
|---|---|
| active rows with NULL vertical_drop at this run | ${rows.length} |
| filled from summit - base on the row | ${fromRow} |
| filled from OnTheSnow published vertical | ${fromOts} |
| rows updated (all applied runs) | ${appliedRows(STEP).length} |
| still proposed by this run | ${pending.length} |
| still NULL after this step | ${unfilled.length} |

## Still NULL (no elevations on the row and no OnTheSnow page)
${unfilled.length ? unfilled.map((u) => `- ${u}`).join("\n") : "- none"}

## Changes (with source)
${appliedChangesTable(STEP, pending)}
`,
);
