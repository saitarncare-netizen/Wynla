// Apply guarded UPDATE statements of the form
//   UPDATE resorts SET col = 'v', col2 = true, updated_at = now() WHERE slug = 's' AND hero_image_url = 'u';
// through PostgREST (service key), matching BOTH filters, after a backup.
//   node scripts/photos/7-apply-guarded-sql.mjs <file.sql> [--apply]
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./_shared.mjs";

loadEnv();
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const [file] = process.argv.slice(2);
const apply = process.argv.includes("--apply");
const sql = fs.readFileSync(file, "utf8");
const lit = (raw) => raw === "now()" ? new Date().toISOString() : raw === "true" ? true : raw === "false" ? false : raw === "NULL" ? null : raw.slice(1, -1).replace(/''/g, "'");
const stmts = [];
for (const m of sql.matchAll(/^UPDATE resorts SET (.+?) WHERE slug = '((?:[^']|'')+)' AND hero_image_url = '((?:[^']|'')+)';$/gm)) {
  const patch = {};
  for (const a of m[1].matchAll(/(\w+) = ('(?:[^']|'')*'|true|false|NULL|now\(\))/g)) patch[a[1]] = lit(a[2]);
  stmts.push({ slug: m[2].replace(/''/g, "'"), url: m[3].replace(/''/g, "'"), patch });
}
const unparsed = (sql.match(/^UPDATE /gm) || []).length - stmts.length;
const slugs = [...new Set(stmts.map((s) => s.slug))];
const live = await fetch(`${URL_}/rest/v1/resorts?select=slug,hero_image_url,hero_image_attribution,hero_image_credit,hero_image_alt,hero_image_verified_winter&slug=in.(${encodeURIComponent(slugs.map((s) => `"${s}"`).join(","))})`, { headers: H }).then((r) => r.json());
const bySlug = Object.fromEntries(live.map((r) => [r.slug, r]));
const matching = stmts.filter((s) => bySlug[s.slug] && bySlug[s.slug].hero_image_url === s.url);
console.log(`statements ${stmts.length} (unparsed ${unparsed}) | rows still matching guard ${matching.length}`);
if (!apply) { console.log("DRY RUN — add --apply"); process.exit(0); }
const dir = path.join("scripts/photos/reports/backups");
fs.mkdirSync(dir, { recursive: true });
const bf = path.join(dir, `guarded-${path.basename(file, ".sql")}-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(bf, JSON.stringify(live, null, 1));
let ok = 0, failed = 0;
for (const s of matching) {
  const res = await fetch(`${URL_}/rest/v1/resorts?slug=eq.${encodeURIComponent(s.slug)}&hero_image_url=eq.${encodeURIComponent(s.url)}`, { method: "PATCH", headers: { ...H, Prefer: "return=representation" }, body: JSON.stringify(s.patch) });
  const body = await res.json().catch(() => null);
  if (res.ok && Array.isArray(body) && body.length === 1) ok++; else { failed++; console.log("FAILED", s.slug, res.status); }
}
console.log(`applied ${ok}, failed ${failed}; backup ${bf}`);
