// Restore a backup written by any step in this folder.
//
// Each backup holds, per row, the exact column values as they were
// BEFORE that step wrote. Restoring PATCHes those values back by id,
// nothing more — so it undoes one step without touching anything else.
//
//   node scripts/backfill-2026-09-23/restore.mjs backups/<file>.json [--apply]

import { readFileSync } from "node:fs";
import path from "node:path";
import { APPLY, USING_SERVICE_ROLE, patchById, printChanges } from "./_lib.mjs";

const file = process.argv.find((a) => a.endsWith(".json"));
if (!file) {
  console.error("usage: node restore.mjs backups/<step>-<timestamp>.json [--apply]");
  process.exit(1);
}
const backup = JSON.parse(readFileSync(path.resolve(file), "utf8"));
const table = backup.table ?? "resorts";
const changes = backup.rows.map((row) => ({
  id: row.id,
  slug: row.slug,
  before: row.after,
  // Only the columns the step wrote, so an unrelated later edit to the
  // same row is left alone.
  patch: Object.fromEntries(Object.keys(row.after).map((c) => [c, row.before[c] ?? null])),
}));

console.log(`Restoring ${changes.length} row(s) of ${table} from ${backup.step} (taken ${backup.taken_at})`);
printChanges(changes);
if (!APPLY) {
  console.log("\nDry run only. Re-run with --apply to write.");
  process.exit(0);
}
if (!USING_SERVICE_ROLE) throw new Error("--apply needs SUPABASE_SERVICE_ROLE_KEY");
for (const c of changes) await patchById(table, c.id, c.patch);
console.log(`\nRestored ${changes.length} row(s).`);
