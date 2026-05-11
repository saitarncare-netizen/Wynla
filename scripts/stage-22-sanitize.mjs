// Stage 22 — sanitize agent outputs by stripping FABRICATED values.
//
// An agent's record is "fabricated" if its `notes` field contains
// estimation/guess markers (estimated, typical, approx, balanced split,
// inferred, etc.) AND the record has any non-null trails_total or
// difficulty_pct values. We null those values out — keeping the record
// alive so the audit trail stays intact, but preventing the values
// from contributing to consensus.
//
// Writes sanitized copies as `data/stage-22/<original-name>.sanitized.json`.
// Run: `node scripts/stage-22-sanitize.mjs`.

import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const DIR = path.resolve("data/stage-22");
const FAB_RE = /\b(estimat(ed|e|ing)?|typical|balanced split|approx(imate(ly)?)?|guess(ed|es|ing)?|inferred|fill[- ]?in|assume(d|s|ing)?|likely|probably|presumed)\b/i;

let totalChecked = 0;
let totalSanitized = 0;
let trailsStripped = 0;
let pctStripped = 0;

for (const f of readdirSync(DIR)) {
  if (!/^(pilot|batch-\d+|deepdive-\d+)-strategy-[abcd]\.json$/.test(f)) continue;
  const filePath = path.join(DIR, f);
  const data = JSON.parse(readFileSync(filePath, "utf8"));
  if (!Array.isArray(data)) continue;

  const sanitized = data.map((r) => {
    totalChecked++;
    const notes = typeof r.notes === "string" ? r.notes : "";
    if (!FAB_RE.test(notes)) return r;

    const copy = { ...r };
    let didStrip = false;

    // If trails_total exists but the note marks it as estimated → strip.
    // We're conservative: strip ANY trails_total when the note has a
    // fabrication marker, since the agent might have estimated either
    // count or pct (or both).
    if (copy.trails_total != null) {
      copy.trails_total = null;
      trailsStripped++;
      didStrip = true;
    }
    // Same for difficulty_pct — strip the whole object.
    if (copy.difficulty_pct && Object.values(copy.difficulty_pct).some((v) => v != null)) {
      copy.difficulty_pct = { beginner: null, intermediate: null, advanced: null, expert: null };
      pctStripped++;
      didStrip = true;
    }
    if (didStrip) {
      copy._sanitized = true;
      copy._original_notes = notes;
      copy.notes = `[SANITIZED — fabrication marker in notes] ${notes}`;
      totalSanitized++;
    }
    return copy;
  });

  // Write to .sanitized.json (so we keep originals for audit)
  const outPath = path.join(DIR, f.replace(/\.json$/, ".sanitized.json"));
  writeFileSync(outPath, JSON.stringify(sanitized, null, 2));
}

console.log(`Checked ${totalChecked} records`);
console.log(`Sanitized ${totalSanitized} records`);
console.log(`  trails_total stripped: ${trailsStripped}`);
console.log(`  difficulty_pct stripped: ${pctStripped}`);
