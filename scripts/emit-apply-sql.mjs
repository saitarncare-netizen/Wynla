// Read data/diff_vs_db.json and emit data/apply_pass_corrections.sql
// containing only the SAFE subset of corrections:
//
//   1. All 4 featured-tier corrections (manually verified)
//   2. All REPLACE_PASS where current value is exactly ["independent"]
//      (additive: just adding the missing pass tag from Stage 2)
//   3. All ADD_PASS (only adds, never removes)
//
// Held back (NOT in this SQL — separate review needed):
//   - REPLACE_PASS where current has a non-independent pass (~8 entries,
//     "other REPLACE" bucket — most are diff false positives)
//   - REMOVE_PASS for non-featured (2 entries — need verification)
//   - REPLACE_PASS where new value is ["independent"] = "indy → independent"
//     (~36 entries — scraped cache is incomplete, DB tags likely correct)

import { readFileSync, writeFileSync } from "node:fs";

const r = JSON.parse(readFileSync("data/diff_vs_db.json", "utf8"));

function isSafe(c) {
  if (c.tier === "featured") return true;
  if (c.kind === "ADD_PASS") return true;
  if (c.kind === "REPLACE_PASS") {
    // additive: from is exactly ["independent"], to is anything else
    return JSON.stringify(c.from) === '["independent"]';
  }
  return false; // REMOVE_PASS, other REPLACE held
}

const apply = r.corrections.filter(isSafe);
const held = r.corrections.filter((c) => !isSafe(c));

const lines = [
  `-- Stage 3.6 pass-truth corrections — applied subset (${apply.length} of ${r.corrections.length})`,
  `-- Generated ${new Date().toISOString()}`,
  `--`,
  `-- Apply policy: additive only.`,
  `--   1. Featured tier corrections (manually verified)`,
  `--   2. REPLACE_PASS where current is ["independent"] (Stage 2 missed tag)`,
  `--   3. ADD_PASS (only adds tags, never removes)`,
  `--`,
  `-- Held for separate review (${held.length}):`,
  `--   - REMOVE_PASS for listed tier (2): need cache + news cross-check`,
  `--   - REPLACE_PASS "indy → independent" (~36): scraped cache incomplete,`,
  `--     DB Stage 2 tags likely correct, conservative hold`,
  `--   - "other REPLACE" (~8): mostly diff false positives`,
  ``,
  `BEGIN;`,
  ``,
];

for (const c of apply) {
  const arr = `ARRAY[${c.to.map((p) => `'${p}'`).join(",")}]::TEXT[]`;
  const featured = c.tier === "featured" ? " -- ★ featured" : "";
  lines.push(`UPDATE resorts SET passes = ${arr}, last_verified_at = NOW() WHERE slug = '${c.slug}';${featured}`);
}

lines.push("");
lines.push(`COMMIT;`);
lines.push("");
lines.push(`-- Verify: pass distribution after apply`);
lines.push(`SELECT unnest(passes) AS pass, COUNT(*) FROM resorts GROUP BY unnest(passes) ORDER BY pass;`);
lines.push(`SELECT name, passes FROM resorts WHERE slug IN ('cannon-mountain','jiminy-peak','mohawk-mountain-ski-area','whiteface-mountain') ORDER BY name;`);

writeFileSync("data/apply_pass_corrections.sql", lines.join("\n") + "\n");

// Also write held list for follow-up
writeFileSync(
  "data/held_for_review.json",
  JSON.stringify({ generated_at: new Date().toISOString(), count: held.length, held }, null, 2) + "\n",
);

console.error(`Wrote data/apply_pass_corrections.sql (${apply.length} UPDATE statements)`);
console.error(`Wrote data/held_for_review.json (${held.length} corrections held for next-session review)`);
console.error(`\nApply breakdown:`);
const buckets = { featured: 0, indep_to_indy: 0, indep_to_other: 0, add_pass: 0 };
for (const c of apply) {
  if (c.tier === "featured") buckets.featured++;
  else if (c.kind === "ADD_PASS") buckets.add_pass++;
  else if (JSON.stringify(c.to) === '["indy"]') buckets.indep_to_indy++;
  else buckets.indep_to_other++;
}
console.error(`  featured (verified):      ${buckets.featured}`);
console.error(`  indep -> indy:            ${buckets.indep_to_indy}`);
console.error(`  indep -> ikon/epic/MC:    ${buckets.indep_to_other}`);
console.error(`  ADD_PASS (additive only): ${buckets.add_pass}`);
console.error(`  ----`);
console.error(`  total apply:              ${apply.length}`);
