// Step 4 of the resort photo pipeline: apply the UPDATE statements written by
// 3-publish.mjs --confirm, through PostgREST with the service-role key, so the
// founder does not have to paste SQL into the dashboard.
//
//   node scripts/photos/4-apply-publish.mjs scripts/photos/reports/publish-<date>.sql            (dry run)
//   node scripts/photos/4-apply-publish.mjs scripts/photos/reports/publish-<date>.sql --apply    (write)
//
// Safety: backs up every touched row's hero_image_* columns to
// scripts/photos/reports/backups/heroes-<timestamp>.json before writing, and
// refuses to overwrite a row whose current hero_image_url is already a
// storage-hosted photo (the vetting pass only targeted resorts without one;
// replacing an existing hero is a separate, deliberate decision).
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./_shared.mjs";

loadEnv();
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing");
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };

const file = process.argv[2];
const apply = process.argv.includes("--apply");
if (!file) throw new Error("usage: 4-apply-publish.mjs <publish.sql> [--apply]");
const sql = fs.readFileSync(file, "utf8");

// Parse: UPDATE resorts SET a = 'x', b = true, updated_at = now() WHERE slug = 's';
const rows = [];
for (const m of sql.matchAll(/^UPDATE resorts SET (.+) WHERE slug = '((?:[^']|'')+)';$/gm)) {
  const patch = {};
  for (const a of m[1].matchAll(/(\w+) = ('(?:[^']|'')*'|true|false|now\(\))/g)) {
    const [, col, raw] = a;
    if (raw === "now()") patch[col] = new Date().toISOString();
    else if (raw === "true" || raw === "false") patch[col] = raw === "true";
    else patch[col] = raw.slice(1, -1).replace(/''/g, "'");
  }
  rows.push({ slug: m[2].replace(/''/g, "'"), patch });
}
if (!rows.length) throw new Error("no UPDATE statements found");

const cols = "slug,hero_image_url,hero_image_source,hero_image_attribution,hero_image_credit,hero_image_alt,hero_image_verified_winter";
const inList = rows.map((r) => `"${r.slug}"`).join(",");
const live = await fetch(`${URL_}/rest/v1/resorts?select=${cols}&slug=in.(${encodeURIComponent(inList)})`, { headers: H }).then((r) => r.json());
const bySlug = Object.fromEntries(live.map((r) => [r.slug, r]));
const storagePrefix = `${URL_}/storage/v1/object/public/resort-heroes/`;

const plan = rows.map((r) => {
  const cur = bySlug[r.slug];
  if (!cur) return { ...r, status: "missing" };
  if (cur.hero_image_url === r.patch.hero_image_url) return { ...r, status: "already" };
  if (cur.hero_image_url && cur.hero_image_url.startsWith(storagePrefix)) return { ...r, status: "skip-has-storage-hero" };
  return { ...r, status: "update" };
});
const count = (s) => plan.filter((p) => p.status === s).length;
console.log(`statements ${rows.length} | update ${count("update")} | already ${count("already")} | skip ${count("skip-has-storage-hero")} | missing ${count("missing")}`);
for (const p of plan.filter((x) => x.status !== "update")) console.log(`  ${p.slug}: ${p.status}`);
if (!apply) { console.log("DRY RUN — add --apply to write."); process.exit(0); }

const dir = path.join(path.dirname(file), "backups");
fs.mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.writeFileSync(path.join(dir, `heroes-${stamp}.json`), JSON.stringify(live, null, 1));

let ok = 0, failed = 0;
for (const p of plan.filter((x) => x.status === "update")) {
  const res = await fetch(`${URL_}/rest/v1/resorts?slug=eq.${encodeURIComponent(p.slug)}`, {
    method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(p.patch),
  });
  const body = await res.json().catch(() => null);
  if (res.ok && Array.isArray(body) && body.length === 1) ok++;
  else { failed++; console.log("FAILED", p.slug, res.status, JSON.stringify(body).slice(0, 200)); }
}
console.log(`applied ${ok}, failed ${failed}; backup ${path.join(dir, `heroes-${stamp}.json`)}`);
