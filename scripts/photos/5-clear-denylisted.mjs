// Clear hero_image_* on rows whose current storage hero is on the denylist
// (wrong resort or licence outside the allow-list), so production stops
// showing them immediately instead of waiting for the heroSourceFor deploy.
//   node scripts/photos/5-clear-denylisted.mjs [--apply]
// Backs up the touched rows first; only clears a row whose hero_image_url
// still ends with the denylisted object name.
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./_shared.mjs";

loadEnv();
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
const apply = process.argv.includes("--apply");
const deny = JSON.parse(fs.readFileSync("lib/data/heroDenylist.json", "utf8"));
const slugs = Object.keys(deny);
const cols = "slug,hero_image_url,hero_image_source,hero_image_attribution,hero_image_credit,hero_image_alt,hero_image_verified_winter";
const live = await fetch(`${URL_}/rest/v1/resorts?select=${cols}&slug=in.(${encodeURIComponent(slugs.map((s) => `"${s}"`).join(","))})`, { headers: H }).then((r) => r.json());
const targets = live.filter((r) => r.hero_image_url && r.hero_image_url.endsWith("/" + deny[r.slug].object));
console.log(`denylisted ${slugs.length} | still live in DB ${targets.length}`);
for (const t of targets) console.log(`  ${t.slug}: ${deny[t.slug].reason.slice(0, 90)}`);
if (!apply) { console.log("DRY RUN — add --apply"); process.exit(0); }
const dir = "scripts/photos/reports/backups";
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, `denylist-clear-${new Date().toISOString().replace(/[:.]/g, "-")}.json`);
fs.writeFileSync(file, JSON.stringify(live, null, 1));
let ok = 0;
for (const t of targets) {
  const res = await fetch(`${URL_}/rest/v1/resorts?slug=eq.${encodeURIComponent(t.slug)}`, {
    method: "PATCH", headers: { ...H, Prefer: "return=representation" },
    body: JSON.stringify({ hero_image_url: null, hero_image_source: null, hero_image_attribution: null, hero_image_credit: null, hero_image_alt: null, hero_image_verified_winter: false, updated_at: new Date().toISOString() }),
  });
  if (res.ok) ok++; else console.log("FAILED", t.slug, res.status);
}
console.log(`cleared ${ok}; backup ${file}`);
