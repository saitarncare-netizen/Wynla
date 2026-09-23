// Recover source-page links for the heroes that already live in the
// resort-heroes bucket (the 2026-06 batch re-hosted 112 Commons photos
// but stored only "Author / Licence" in hero_image_attribution, no file
// title and no source URL). CC BY / BY-SA attribution wants a link back
// to the source, so /credits needs one.
//
//   node scripts/photos/0-legacy-credits.mjs [--chosen path/to/chosen.json]
//
// Input: the 2026-06 pipeline's chosen.json (default
// .tmp-hero-candidates/chosen.json in the main worktree), whose `url` is
// the upload.wikimedia.org thumb the photo was cut from. The Commons file
// title is the path segment before the thumb size, so the source page is
// https://commons.wikimedia.org/wiki/File:<title>.
//
// Output: lib/data/heroCredits.json {slug: {title, sourcePage}} for the
// slugs that currently have a storage-hosted hero (read-only PostgREST
// check). scripts/photos/3-publish.mjs merges new entries into the same
// file. No database writes.

import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { execSync } from "node:child_process";
import { loadEnv, loadActiveResorts, readJsonIfExists, writeJson, parseArgs, makeLogger } from "./_shared.mjs";

const args = parseArgs();
const env = loadEnv();
const logger = makeLogger("legacy-credits");
const OUT = resolve("lib/data/heroCredits.json");

function defaultChosenPath() {
  const local = resolve(".tmp-hero-candidates/chosen.json");
  if (existsSync(local)) return local;
  try {
    const common = execSync("git rev-parse --path-format=absolute --git-common-dir", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
    return join(dirname(common), ".tmp-hero-candidates", "chosen.json");
  } catch {
    return local;
  }
}

/** "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f5/Alta_LCC.JPG/1280px-Alta_LCC.JPG" -> "Alta_LCC.JPG" */
export function commonsTitleFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    const i = parts.indexOf("thumb");
    const raw = i >= 0 && parts.length > i + 3 ? parts[i + 3] : parts[parts.length - 1];
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
}

const chosenPath = args.chosen ? resolve(String(args.chosen)) : defaultChosenPath();
const chosen = readJsonIfExists(chosenPath, null);
if (!chosen) {
  logger.log(`no chosen.json at ${chosenPath}; nothing to recover`);
  process.exit(0);
}
const byPath = new Map(chosen.map((c) => [c.slug, c]));

const resorts = await loadActiveResorts(env);
const existing = readJsonIfExists(OUT, {});
let added = 0;
let missing = 0;
for (const r of resorts) {
  if (!r.hero_image_url || !/\/storage\/v1\/object\/public\/resort-heroes\//.test(r.hero_image_url)) continue;
  if (existing[r.slug]) continue;
  const c = byPath.get(r.slug);
  const title = c?.url ? commonsTitleFromUrl(c.url) : null;
  if (!title) {
    missing++;
    logger.log(`${r.slug}: storage hero but no chosen.json entry; /credits will link a Commons search instead`);
    continue;
  }
  existing[r.slug] = {
    title: `File:${title}`,
    sourcePage: `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(title).replace(/%20/g, "_")}`,
    attribution: c.attribution ?? null,
    recoveredFrom: "2026-06 chosen.json",
  };
  added++;
}
writeJson(OUT, Object.fromEntries(Object.entries(existing).sort(([a], [b]) => a.localeCompare(b))));
logger.log(`legacy credits: ${added} added, ${missing} storage heroes without a source link, ${Object.keys(existing).length} total in ${OUT}`);
