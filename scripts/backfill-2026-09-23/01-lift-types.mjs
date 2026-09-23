// Step 1 — normalise resorts.lift_types to the canonical key set.
//
// Why: ~30 marquee rows (Vail, Park City, Snowbird, Jackson Hole, ...)
// still carry the Phase 0 placeholder keys {chair_detach, chair_fixed,
// tbar, poma, rope, carpet}. The map's "High-speed chair" / "No surface
// only" filters and the resort page Lifts stat read the Phase 2 keys
// {high_speed_six, high_speed_quad, fixed_quad, ...}, so those resorts
// were silently dropped from the filters and showed no high-speed count.
// A handful of other rows stash free text ({note, verified}) or a
// closure flag (defunct / defunct_status) inside the JSON.
//
// Mapping (audit data-quality-1, adversarially reviewed):
//   chair_detach -> high_speed_quad   (legacy lumps all detachables)
//   chair_fixed  -> fixed_quad        (legacy lumps quad/triple/double)
//   tbar + poma + rope -> surface
//   carpet       -> magic_carpet
//   gondola / tram kept; note / verified / defunct / defunct_status dropped
//   rows that only had {note, verified} -> NULL (readers fall back to
//   the high_speed_lifts column; the note text lives on in the backup)
// Also sets high_speed_lifts where NULL and derivable from the JSON, and
// flips operating_status to 'closed' for the two rows whose only closure
// signal was a defunct flag inside lift_types (sleeping-giant: sold,
// reopening as a summer park; apple-mountain: defunct per the audit).
//
//   node scripts/backfill-2026-09-23/01-lift-types.mjs [--apply]

import { select, run, writeReport, appliedChangesTable, appliedRows, appliedRunsLine, num } from "./_lib.mjs";

const STEP = "01-lift-types";
const CANON = [
  "high_speed_eight",
  "high_speed_six",
  "high_speed_quad",
  "high_speed_triple",
  "fixed_quad",
  "fixed_triple",
  "fixed_double",
  "gondola",
  "bubble_chair",
  "tram",
  "surface",
  "magic_carpet",
];
const LEGACY = ["chair_detach", "chair_fixed", "tbar", "poma", "rope", "carpet"];
const JUNK = ["note", "verified", "defunct", "defunct_status"];
const HS_KEYS = ["high_speed_eight", "high_speed_six", "high_speed_quad", "high_speed_triple"];
// Closure evidence recorded 2026-09-23 (see reports/01-lift-types.md).
const CLOSE_FOR_GOOD = new Set(["sleeping-giant", "apple-mountain"]);

const rows = await select(
  "resorts",
  "select=id,slug,name,active,lift_types,high_speed_lifts,total_lifts,operating_status&lift_types=not.is.null&order=id.asc",
);

const changes = [];
const notes = [];
for (const r of rows) {
  const t = r.lift_types;
  if (!t || typeof t !== "object" || Array.isArray(t)) continue;
  const keys = Object.keys(t);
  const hasLegacy = keys.some((k) => LEGACY.includes(k));
  const hasJunk = keys.some((k) => JUNK.includes(k));
  const unknown = keys.filter((k) => !CANON.includes(k) && !LEGACY.includes(k) && !JUNK.includes(k));
  if (unknown.length) notes.push(`${r.slug}: unexpected keys ${unknown.join(", ")} left untouched`);

  let next = null;
  if (hasLegacy) {
    next = Object.fromEntries(CANON.map((k) => [k, 0]));
    next.high_speed_quad = num(t.chair_detach) ?? 0;
    next.fixed_quad = num(t.chair_fixed) ?? 0;
    next.surface = (num(t.tbar) ?? 0) + (num(t.poma) ?? 0) + (num(t.rope) ?? 0);
    next.magic_carpet = num(t.carpet) ?? 0;
    next.gondola = num(t.gondola) ?? 0;
    next.tram = num(t.tram) ?? 0;
  } else if (hasJunk) {
    const kept = Object.fromEntries(keys.filter((k) => !JUNK.includes(k)).map((k) => [k, t[k]]));
    // {note, verified} only -> no lift data at all.
    next = Object.keys(kept).length === 0 ? null : kept;
  }

  const patch = {};
  if (hasLegacy || hasJunk) patch.lift_types = next;

  // high_speed_lifts: fill only when NULL. Never override a curated value;
  // mismatches are listed in the report for a human to look at.
  const src = next ?? t;
  if (src && r.high_speed_lifts == null) {
    const hs = HS_KEYS.reduce((a, k) => a + (num(src[k]) ?? 0), 0);
    if (hs > 0) patch.high_speed_lifts = hs;
  } else if (src && r.high_speed_lifts != null) {
    const hs = HS_KEYS.reduce((a, k) => a + (num(src[k]) ?? 0), 0);
    if (hs !== r.high_speed_lifts && hs > 0) {
      notes.push(`${r.slug}: high_speed_lifts=${r.high_speed_lifts} but lift_types sums to ${hs} (left as is)`);
    }
  }

  if (CLOSE_FOR_GOOD.has(r.slug) && r.operating_status !== "closed") patch.operating_status = "closed";

  if (Object.keys(patch).length) changes.push({ id: r.id, slug: r.slug, before: r, patch });
}

const result = await run(STEP, "resorts", changes, ["lift_types", "high_speed_lifts", "operating_status"]);

// Counts cover everything the step has applied plus what this run still
// proposes (after an apply run the proposals are already in the backup).
const pending = result.applied ? [] : changes;
const all = [...appliedRows(STEP).map((r) => ({ before: r.before, patch: r.after })), ...pending];
const legacyCount = all.filter((c) => c.patch.lift_types !== undefined && LEGACY.some((k) => k in (c.before.lift_types ?? {}))).length;
const junkCount = all.filter((c) => c.patch.lift_types !== undefined && !LEGACY.some((k) => k in (c.before.lift_types ?? {}))).length;
const hsCount = all.filter((c) => "high_speed_lifts" in c.patch).length;
const closedCount = all.filter((c) => "operating_status" in c.patch).length;

writeReport(
  STEP,
  `# Step 1 — lift_types canonical keys

Report generated ${new Date().toISOString()} (${result.applied ? "apply run" : "dry run"}). ${appliedRunsLine(STEP)}

| metric | count |
|---|---|
| rows with lift_types now | ${rows.length} |
| legacy key set remapped (chair_detach/chair_fixed/tbar/poma/rope/carpet) | ${legacyCount} |
| junk keys dropped (note/verified/defunct/defunct_status) | ${junkCount} |
| high_speed_lifts filled from lift_types | ${hsCount} |
| operating_status -> closed | ${closedCount} |
| rows updated (all applied runs) | ${appliedRows(STEP).length} |
| still proposed by this run | ${pending.length} |

Closure evidence: sleeping-giant — Cowboy State Daily 2026-02-10 (buyer HMH Capital plans a summer park, no ski operations; ski area closed since 2025-26) https://cowboystatedaily.com/2026/02/10/sleeping-giant-ski-area-near-cody-has-a-buyer-but-not-one-who-wants-a-ski-resort/ · apple-mountain — flagged defunct in its own lift_types JSON and in audit finding data-quality-9.

Readers updated in the same change set: components/Map/MapPage.tsx (High-speed / No-surface filters now also count high_speed_eight + high_speed_triple and coerce with Number()), app/resort/[slug]/page.tsx (Lifts stat).

## Notes
${notes.length ? notes.map((n) => `- ${n}`).join("\n") : "- none"}

## Changes
${appliedChangesTable(STEP, pending)}
`,
);
