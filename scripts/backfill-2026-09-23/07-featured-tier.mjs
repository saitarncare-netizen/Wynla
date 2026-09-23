// Step 7 — keep Aspen in the featured layer after the aggregate row retired.
//
// Why: step 3 set the aggregate 'aspen-snowmass' row (tier=featured)
// active=false, but the four real mountains were all tier=listed. The
// featured tier drives the +30 pin score and the featured pin layer in
// components/Map/MapView.tsx, the sitemap priority (app/sitemap.ts) and
// the ?featured=1 filter, so Aspen had silently dropped out of all of
// them. Snowmass (the largest of the four, and the row lib/lists.ts and
// lib/guides.tsx now point at) and Aspen Mountain (the flagship above
// town) take the featured tier; Highlands and Buttermilk stay listed so
// the featured layer does not show four Aspen pins on top of each other.
//
//   node scripts/backfill-2026-09-23/07-featured-tier.mjs [--apply]

import { select, run, writeReport, appliedChangesTable, appliedRows, appliedRunsLine } from "./_lib.mjs";

const STEP = "07-featured-tier";
const FEATURE = ["snowmass", "aspen-mountain"];

const rows = await select("resorts", `select=id,slug,name,tier,active&slug=in.(${FEATURE.join(",")})&order=id.asc`);
const missing = FEATURE.filter((s) => !rows.some((r) => r.slug === s));
if (missing.length) throw new Error(`rows not found: ${missing.join(", ")}`);

const changes = rows
  .filter((r) => r.active && r.tier !== "featured")
  .map((r) => ({ id: r.id, slug: r.slug, before: r, patch: { tier: "featured" }, source: "aggregate aspen-snowmass row (tier=featured) retired in step 3" }));

const result = await run(STEP, "resorts", changes, ["tier"]);
const pending = result.applied ? [] : changes;

writeReport(
  STEP,
  `# Step 7 — featured tier for Aspen

Report generated ${new Date().toISOString()} (${result.applied ? "apply run" : "dry run"}). ${appliedRunsLine(STEP)}

| metric | count |
|---|---|
| rows promoted to tier=featured | ${appliedRows(STEP).length + pending.length} |
| still proposed by this run | ${pending.length} |

The aggregate \`aspen-snowmass\` row carried tier=featured; when step 3 retired it, Aspen left the featured pin layer, the featured pin score, the sitemap 0.9 priority and the ?featured=1 filter. Snowmass and Aspen Mountain now carry the tier. In the same change set lib/lists.ts ("Ikon Pass Must-Ski") and lib/guides.tsx point at \`snowmass\`, and next.config.ts 301s /resort/aspen-snowmass (and the three other retired slugs) to the kept rows.

## Changes
${appliedChangesTable(STEP, pending)}
`,
);
