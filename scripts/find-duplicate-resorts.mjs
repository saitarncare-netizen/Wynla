// Find duplicate / zone-split resort entries.
//
// We pull every active resort, then for each pair (i, j) compute a
// haversine distance. Pairs that fall within 5 km AND share name/slug
// signals (a common root word, a "tubing"/"snow play" suffix, a slug
// prefix) get flagged. Each pair is scored HIGH / MEDIUM / LOW based
// on how close they are and how strongly the signals line up.
//
// Output is a markdown report at:
//   data/stage-31-duplicate-resorts-report.md
//
// Read-only: this script never writes to the DB.

import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv(p) {
  if (!fs.existsSync(p)) return;
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadDotEnv(".env.local");
loadDotEnv(".env");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Read-only sweep: service key preferred, but anon key works since `resorts`
// has public-read RLS (it powers the public map).
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or a Supabase key (service or anon)");
  process.exit(1);
}
console.log(
  `Using ${process.env.SUPABASE_SERVICE_ROLE_KEY ? "service-role" : "anon"} key.`,
);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

// --- Geometry --------------------------------------------------------------

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

// --- Name/slug heuristics --------------------------------------------------

// Words we strip when computing a "root" name so that
// "Crystal Mountain" and "Crystal Mountain Tubing" both collapse to "crystal".
const NOISE_WORDS = new Set([
  "mountain", "mountains", "mt", "mt.", "mtn", "mtns",
  "ski", "skiing", "snowboard", "snowboarding",
  "resort", "resorts", "area", "areas",
  "snow", "snowpark", "park", "the", "of", "at", "and", "&",
  "valley", "ridge", "peak", "peaks", "pass",
  "center", "centre", "club", "lodge", "inn",
  "nordic", "alpine", "xc", "cross-country", "tubing",
  "adventure", "adventures", "play", "playground",
]);

// Keywords that, if present in ONLY one of the two names, strongly suggest
// the pair is a "main resort vs add-on zone" duplicate.
const SPLIT_KEYWORDS = [
  "tubing", "snow play", "snowplay", "snow-play",
  "snow park", "snowpark", "snow-park",
  "adventure", "adventures",
  "nordic", "xc center", "xc centre", "cross country", "cross-country",
];

function normName(name) {
  return name
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function nameRoot(name) {
  // Drop noise words and return the remaining tokens joined.
  // "Crystal Mountain Resort" -> "crystal"
  // "Bear Creek Ski Area"      -> "bear creek"
  const tokens = normName(name).split(" ").filter((t) => t && !NOISE_WORDS.has(t));
  return tokens.join(" ");
}

function firstWord(name) {
  const tokens = normName(name).split(" ").filter(Boolean);
  return tokens[0] || "";
}

function commonPrefix(a, b) {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return a.slice(0, i);
}

function slugPrefix(slug) {
  // Take the first two slug segments, e.g. "crystal-mountain" from
  // "crystal-mountain-tubing". Single-segment slugs return as-is.
  const parts = slug.split("-");
  return parts.slice(0, Math.min(2, parts.length)).join("-");
}

function hasSplitKeyword(name) {
  const n = normName(name);
  return SPLIT_KEYWORDS.find((k) => n.includes(k)) || null;
}

// --- Pair scoring ----------------------------------------------------------

function scorePair(a, b, distKm) {
  const nameA = normName(a.name);
  const nameB = normName(b.name);
  const rootA = nameRoot(a.name);
  const rootB = nameRoot(b.name);
  const fwA = firstWord(a.name);
  const fwB = firstWord(b.name);

  // Name-root match signal
  let rootMatch = false;
  if (rootA && rootB) {
    if (rootA === rootB) rootMatch = true;
    else if (rootA && rootB && (rootA.startsWith(rootB) || rootB.startsWith(rootA))) rootMatch = true;
  }
  // Also accept matching first word + same state if roots collapsed to empty
  // ("Mountain Creek" vs "Mountain Creek Tubing" → both roots empty after
  // dropping "mountain creek"). Fall back to first-word match in that case.
  if (!rootMatch && fwA && fwA === fwB) {
    rootMatch = true;
  }
  // 4+ char common prefix on the normalized names
  const cp = commonPrefix(nameA, nameB);
  const prefixMatch = cp.replace(/\s/g, "").length >= 4;

  // Slug prefix match
  const sa = slugPrefix(a.slug);
  const sb = slugPrefix(b.slug);
  const slugMatch = sa === sb || a.slug === b.slug;
  // Also count "starts-with" slug match: crystal-mountain vs crystal-mountain-tubing
  const slugStartsWith =
    a.slug !== b.slug &&
    (a.slug.startsWith(b.slug + "-") || b.slug.startsWith(a.slug + "-"));

  // Split-keyword signal (one has it, the other doesn't)
  const kwA = hasSplitKeyword(a.name);
  const kwB = hasSplitKeyword(b.name);
  const xorKeyword = (kwA && !kwB) ? kwA : (kwB && !kwA) ? kwB : null;

  const passesDiffer = !arraysEqual(a.passes ?? [], b.passes ?? []);

  // Did anything trigger?
  const flagged =
    rootMatch || prefixMatch || slugMatch || slugStartsWith || xorKeyword !== null;
  if (!flagged) return null;

  // Severity
  let severity = "LOW";
  if (a.slug === b.slug) severity = "HIGH";
  else if (distKm < 1 && (rootMatch || slugStartsWith)) severity = "HIGH";
  else if (distKm < 2 && xorKeyword) severity = "HIGH";
  else if (distKm < 2 && rootMatch) severity = "MEDIUM";
  else if (distKm < 5 && rootMatch && passesDiffer) severity = "MEDIUM";
  else severity = "LOW";

  // If only the prefix signal fired (no root, no slug, no keyword), drop noise.
  if (!rootMatch && !slugMatch && !slugStartsWith && !xorKeyword) {
    // 4-char prefix alone is too weak. Skip.
    return null;
  }

  return {
    severity,
    distKm,
    rootMatch,
    prefixMatch,
    slugMatch,
    slugStartsWith,
    xorKeyword,
    passesDiffer,
    reasoning: buildReasoning({
      distKm, rootMatch, slugMatch, slugStartsWith, xorKeyword, passesDiffer,
    }),
  };
}

function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  const sa = [...a].sort();
  const sb = [...b].sort();
  for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
  return true;
}

function buildReasoning({ distKm, rootMatch, slugMatch, slugStartsWith, xorKeyword, passesDiffer }) {
  const bits = [];
  bits.push(`${distKm.toFixed(2)} km apart`);
  if (slugMatch) bits.push("identical slug");
  else if (slugStartsWith) bits.push("one slug is a prefix of the other");
  if (rootMatch) bits.push("same name root");
  if (xorKeyword) bits.push(`one name contains "${xorKeyword}"`);
  if (passesDiffer) bits.push("pass arrays differ");
  return bits.join("; ") + ".";
}

// --- Recommendation --------------------------------------------------------

function recommend(a, b, sig) {
  // Prefer KEEP the entry with the larger vertical_drop / total_trails
  // (that's almost always the "main" resort), and suggest dropping the
  // smaller add-on zone (tubing / snow play / nordic).
  const score = (r) =>
    (Number(r.vertical_drop) || 0) * 10 + (Number(r.total_trails) || 0);
  const sa = score(a);
  const sb = score(b);
  const aHasKw = hasSplitKeyword(a.name);
  const bHasKw = hasSplitKeyword(b.name);
  let keep, drop, note;
  if (aHasKw && !bHasKw) { keep = b; drop = a; note = `B is the main resort; A is the "${aHasKw}" add-on`; }
  else if (bHasKw && !aHasKw) { keep = a; drop = b; note = `A is the main resort; B is the "${bHasKw}" add-on`; }
  else if (sa > sb) { keep = a; drop = b; note = "A has larger vertical_drop/trails"; }
  else if (sb > sa) { keep = b; drop = a; note = "B has larger vertical_drop/trails"; }
  else { keep = a; drop = b; note = "tie on size metrics — pick whichever has cleaner data"; }

  // If passes differ, suggest a merge of the union.
  if (sig.passesDiffer) {
    return `KEEP ${keep === a ? "A" : "B"}, DROP ${drop === a ? "A" : "B"}; MERGE passes = union of both arrays (${note})`;
  }
  return `KEEP ${keep === a ? "A" : "B"}, DROP ${drop === a ? "A" : "B"} (${note})`;
}

// --- Formatting ------------------------------------------------------------

function fmtResort(r, label) {
  const passes = (r.passes ?? []).length ? r.passes.join(", ") : "(none)";
  const vd = r.vertical_drop == null ? "?" : r.vertical_drop;
  const tt = r.total_trails == null ? "?" : r.total_trails;
  return `- **Resort ${label}**: ${r.name} (${r.state}) · \`${r.slug}\` · id=${r.id} · passes=[${passes}] · vertical_drop=${vd} · total_trails=${tt}`;
}

function fmtPair(a, b, sig) {
  return [
    fmtResort(a, "A"),
    fmtResort(b, "B"),
    `- Distance: ${sig.distKm.toFixed(2)} km`,
    `- Recommendation: ${recommend(a, b, sig)}`,
    `- Reasoning: ${sig.reasoning}`,
    "",
  ].join("\n");
}

// --- Main ------------------------------------------------------------------

async function main() {
  console.log("Loading active resorts…");
  const { data: resorts, error } = await supabase
    .from("resorts")
    .select("id, slug, name, state, latitude, longitude, passes, tier, active, vertical_drop, total_trails")
    .eq("active", true);
  if (error) {
    console.error("Failed to load resorts:", error.message);
    process.exit(1);
  }
  console.log(`Loaded ${resorts.length} active resorts.`);

  // Coerce coords to numbers and drop rows missing coords.
  const rows = resorts
    .map((r) => ({
      ...r,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      passes: r.passes ?? [],
    }))
    .filter((r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude));
  const skipped = resorts.length - rows.length;
  if (skipped) console.log(`Skipped ${skipped} resorts with missing coordinates.`);

  // Pairwise scan. ~442^2 / 2 = ~98k pairs — trivial.
  const flagged = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      // Cheap bbox prefilter: skip if lat differs by > 0.1 deg (~11 km)
      if (Math.abs(a.latitude - b.latitude) > 0.1) continue;
      if (Math.abs(a.longitude - b.longitude) > 0.15) continue;
      const d = haversineKm(a.latitude, a.longitude, b.latitude, b.longitude);
      if (d >= 5) continue;
      const sig = scorePair(a, b, d);
      if (sig) flagged.push({ a, b, sig });
    }
  }
  console.log(`Flagged ${flagged.length} suspicious pairs.`);

  // Exact slug duplicates (regardless of distance).
  const bySlug = new Map();
  for (const r of resorts) {
    if (!bySlug.has(r.slug)) bySlug.set(r.slug, []);
    bySlug.get(r.slug).push(r);
  }
  const exactDupSlugs = [...bySlug.entries()].filter(([, arr]) => arr.length > 1);
  console.log(`Found ${exactDupSlugs.length} slugs with duplicates.`);

  // Bucket by severity.
  const bySeverity = { HIGH: [], MEDIUM: [], LOW: [] };
  for (const p of flagged) bySeverity[p.sig.severity].push(p);

  // Sort each bucket by distance ascending.
  for (const k of Object.keys(bySeverity)) {
    bySeverity[k].sort((x, y) => x.sig.distKm - y.sig.distKm);
  }

  // Build the markdown report.
  const today = new Date().toISOString().slice(0, 10);
  const md = [];
  md.push(`# Duplicate Resorts Report — sweep date ${today}`);
  md.push("");
  md.push(`Scanned ${rows.length} active resorts (skipped ${skipped} with bad coords).`);
  md.push(`Flagged ${flagged.length} suspicious pairs within 5 km of each other.`);
  md.push("");

  md.push("## HIGH severity (definite duplicates — merge or drop)");
  md.push("");
  if (!bySeverity.HIGH.length) md.push("_None._");
  for (const p of bySeverity.HIGH) md.push(fmtPair(p.a, p.b, p.sig));
  md.push("");

  md.push("## MEDIUM severity (likely duplicates — needs human review)");
  md.push("");
  if (!bySeverity.MEDIUM.length) md.push("_None._");
  for (const p of bySeverity.MEDIUM) md.push(fmtPair(p.a, p.b, p.sig));
  md.push("");

  md.push("## LOW severity (review)");
  md.push("");
  if (!bySeverity.LOW.length) md.push("_None._");
  for (const p of bySeverity.LOW) md.push(fmtPair(p.a, p.b, p.sig));
  md.push("");

  md.push("## Exact duplicate slugs");
  md.push("");
  if (!exactDupSlugs.length) {
    md.push("_None found._");
  } else {
    for (const [slug, arr] of exactDupSlugs) {
      md.push(`### \`${slug}\` (${arr.length} rows)`);
      for (const r of arr) {
        const passes = (r.passes ?? []).length ? r.passes.join(", ") : "(none)";
        md.push(`- id=${r.id} · ${r.name} (${r.state}) · lat=${r.latitude}, lng=${r.longitude} · passes=[${passes}] · vd=${r.vertical_drop ?? "?"} · trails=${r.total_trails ?? "?"} · active=${r.active}`);
      }
      md.push("");
    }
  }
  md.push("");

  const totalAfterMerge = rows.length - bySeverity.HIGH.length;
  md.push("## Summary");
  md.push("");
  md.push(`- Total flagged pairs: **${flagged.length}**`);
  md.push(`- HIGH: **${bySeverity.HIGH.length}**, MEDIUM: **${bySeverity.MEDIUM.length}**, LOW: **${bySeverity.LOW.length}**`);
  md.push(`- Exact-duplicate slugs: **${exactDupSlugs.length}**`);
  md.push(`- Estimated dedupe impact (HIGH only): ${rows.length} active resorts → ~${totalAfterMerge} after merge`);
  md.push("");

  const outPath = path.join("data", "stage-31-duplicate-resorts-report.md");
  fs.writeFileSync(outPath, md.join("\n"), "utf8");
  console.log(`\nReport written to ${outPath}`);

  // Console echo of top HIGH pairs for the parent agent.
  console.log("\nTop HIGH-severity pairs:");
  for (const p of bySeverity.HIGH.slice(0, 10)) {
    console.log(`  ${p.sig.distKm.toFixed(2)}km  ${p.a.name} (${p.a.state}/${p.a.slug}) ⇄ ${p.b.name} (${p.b.state}/${p.b.slug})`);
  }
  console.log(`\nCounts: HIGH=${bySeverity.HIGH.length} MEDIUM=${bySeverity.MEDIUM.length} LOW=${bySeverity.LOW.length}`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
