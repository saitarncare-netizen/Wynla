// Shared plumbing for the 2026-09-23 resort data backfill.
//
// Every step script in this folder follows the same contract:
//   1. the Supabase key is read from .env.local and never printed;
//   2. affected rows are SELECTed and written to backups/<step>-<ts>.json
//      BEFORE any write, so every change is reversible with restore.mjs;
//   3. a dry-run table of proposed changes is printed;
//   4. writes happen only with --apply, and only as UPDATEs (PATCH by id)
//      — rows are never deleted, "remove" means active=false.
//
// A backup row records both `before` (the restore payload) and `after`
// (what the step wrote) plus an optional `source`, so the per-step
// report can always be regenerated from backups/ with a dry run.
//
// Talks to PostgREST directly with fetch so the scripts have no runtime
// dependency beyond Node 20+. Run from the repo root:
//   node scripts/backfill-2026-09-23/<step>.mjs [--apply]

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const BACKUP_DIR = path.join(HERE, "backups");
export const REPORT_DIR = path.join(HERE, "reports");

export const APPLY = process.argv.includes("--apply");

function loadEnv() {
  // Prefer the cwd .env.local; fall back to the repo root next to this
  // folder so the scripts also work when invoked from elsewhere.
  const candidates = [path.resolve(".env.local"), path.join(HERE, "..", "..", ".env.local")];
  const file = candidates.find((p) => existsSync(p));
  if (!file) throw new Error("No .env.local found (looked in repo root)");
  const env = {};
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / key missing from .env.local");
  return { url: url.replace(/\/$/, ""), key, usingServiceRole: !!env.SUPABASE_SERVICE_ROLE_KEY };
}

const ENV = loadEnv();
export const USING_SERVICE_ROLE = ENV.usingServiceRole;

function headers(extra = {}) {
  return {
    apikey: ENV.key,
    Authorization: `Bearer ${ENV.key}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** GET /rest/v1/<table>?<query>. Pages through everything (PostgREST caps at 1000). */
export async function select(table, query, { pageSize = 1000 } = {}) {
  const out = [];
  for (let from = 0; ; from += pageSize) {
    const res = await fetch(`${ENV.url}/rest/v1/${table}?${query}`, {
      headers: headers({ Range: `${from}-${from + pageSize - 1}`, "Range-Unit": "items" }),
    });
    // 416 = we asked for a page past the end (row count was an exact
    // multiple of pageSize); that is the normal end-of-table signal.
    if (res.status === 416) break;
    if (!res.ok) throw new Error(`select ${table}: ${res.status} ${await res.text()}`);
    const rows = await res.json();
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

/** PATCH one row by primary key. Returns the updated row (representation). */
export async function patchById(table, id, patch) {
  const res = await fetch(`${ENV.url}/rest/v1/${table}?id=eq.${id}`, {
    method: "PATCH",
    headers: headers({ Prefer: "return=representation" }),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`patch ${table}#${id}: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  if (rows.length !== 1) throw new Error(`patch ${table}#${id}: expected 1 row, got ${rows.length}`);
  return rows[0];
}

export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").replace("T", "_").slice(0, 19);
}

/**
 * Write the pre-change snapshot. Always called before any PATCH.
 * `changes` = [{ id, slug, before: row, patch: {col: value}, source? }]
 */
export function writeBackup(step, table, changes, columns, mode) {
  mkdirSync(BACKUP_DIR, { recursive: true });
  const file = path.join(BACKUP_DIR, `${step}-${timestamp()}.json`);
  const rows = changes.map((c) => ({
    id: c.id,
    slug: c.slug,
    // Only the columns the step may touch, so the file stays small and
    // restore.mjs can PATCH it back verbatim.
    before: Object.fromEntries(columns.map((k) => [k, c.before[k] ?? null])),
    after: c.patch,
    ...(c.source ? { source: c.source } : {}),
  }));
  writeFileSync(
    file,
    JSON.stringify({ step, table, mode, taken_at: new Date().toISOString(), columns, rows }, null, 2),
  );
  return file;
}

/** Backups of one step that were actually applied, oldest first. */
export function listBackups(step) {
  if (!existsSync(BACKUP_DIR)) return [];
  return readdirSync(BACKUP_DIR)
    .filter((f) => f.startsWith(`${step}-`) && f.endsWith(".json"))
    .sort()
    .map((f) => ({ file: f, ...JSON.parse(readFileSync(path.join(BACKUP_DIR, f), "utf8")) }))
    .filter((b) => b.mode === "applied");
}

export function writeReport(step, markdown) {
  mkdirSync(REPORT_DIR, { recursive: true });
  const file = path.join(REPORT_DIR, `${step}.md`);
  writeFileSync(file, markdown);
  return file;
}

const fmt = (v) =>
  v === null || v === undefined ? "NULL" : typeof v === "object" ? JSON.stringify(v) : String(v);

/** Prints a compact dry-run table: slug | column | before -> after. */
export function printChanges(changes) {
  if (changes.length === 0) {
    console.log("(no changes proposed)");
    return;
  }
  for (const c of changes) {
    for (const [col, after] of Object.entries(c.patch)) {
      console.log(
        `${c.slug.padEnd(34)} ${col.padEnd(26)} ${fmt(c.before[col]).slice(0, 70)} -> ${fmt(after).slice(0, 70)}`,
      );
    }
  }
  console.log(`\n${changes.length} row(s) would change.`);
}

const esc = (s) => fmt(s).replace(/\|/g, "\\|").slice(0, 120);

/**
 * Markdown table of every change the step has APPLIED (from backups/),
 * followed by whatever the current run still proposes. Lets a report be
 * regenerated with a plain dry run after the step has been applied.
 */
export function appliedChangesTable(step, pending = []) {
  const lines = ["| run | slug | column | before | after | source |", "|---|---|---|---|---|---|"];
  for (const b of listBackups(step)) {
    for (const r of b.rows) {
      for (const [col, after] of Object.entries(r.after)) {
        lines.push(`| ${b.taken_at.slice(0, 16)} | ${r.slug} | ${col} | ${esc(r.before[col])} | ${esc(after)} | ${r.source ?? ""} |`);
      }
    }
  }
  for (const c of pending) {
    for (const [col, after] of Object.entries(c.patch)) {
      lines.push(`| proposed | ${c.slug} | ${col} | ${esc(c.before[col])} | ${esc(after)} | ${c.source ?? ""} |`);
    }
  }
  return lines.length > 2 ? lines.join("\n") : "(nothing applied yet)";
}

/** Every applied backup row of a step, flattened (for counting in reports). */
export function appliedRows(step) {
  return listBackups(step).flatMap((b) => b.rows);
}

/** One line for report headers: which runs were applied. */
export function appliedRunsLine(step) {
  const runs = listBackups(step);
  if (runs.length === 0) return "Applied runs: none yet";
  return `Applied runs: ${runs.map((b) => `${b.file} (${b.rows.length} rows)`).join(", ")}`;
}

/**
 * Standard apply loop: dry-run print -> (with --apply) backup, then PATCH.
 * The backup is written immediately before the first write and only
 * when something changes, so backups/ holds exactly one file per
 * applied run.
 */
export async function run(step, table, changes, columns) {
  printChanges(changes);
  if (changes.length === 0) return { applied: 0, backup: null };
  if (!APPLY) {
    console.log("\nDry run only. Re-run with --apply to write.");
    return { applied: 0, backup: null };
  }
  if (!USING_SERVICE_ROLE) throw new Error("--apply needs SUPABASE_SERVICE_ROLE_KEY (RLS blocks anon writes)");
  const backup = writeBackup(step, table, changes, columns, "applied");
  console.log(`Backup of ${changes.length} row(s) -> ${path.relative(process.cwd(), backup)}`);
  let applied = 0;
  for (const c of changes) {
    await patchById(table, c.id, c.patch);
    applied += 1;
  }
  console.log(`\nApplied ${applied} update(s).`);
  return { applied, backup };
}

/**
 * Guard for OnTheSnow cache consumers: a name-matched page can describe
 * a bigger area with the same name (the aspen-snowmass aggregate page
 * for the 'snowmass' row). Trail counts that differ by more than 60%
 * mean the page's stats are not this row's stats; its season dates may
 * still be.
 */
export function statsLookLikeSameResort(page, dbTotalTrails) {
  if (!page?.trails || !dbTotalTrails) return true;
  const ratio = page.trails / dbTotalTrails;
  return ratio > 0.625 && ratio < 1.6;
}

/** Number coercion that treats "", null, undefined and NaN as null. */
export function num(v) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
