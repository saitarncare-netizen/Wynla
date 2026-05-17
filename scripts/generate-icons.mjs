// scripts/generate-icons.mjs
// Converts the Wynla SVG logo into PNG assets needed by the app:
//   - public/apple-touch-icon.png   180×180
//   - public/icon-192.png           192×192 (PWA manifest)
//   - public/icon-512.png           512×512 (PWA manifest, also maskable)
//   - public/og-home.png            1200×630 (social share preview)
//
// Run: node scripts/generate-icons.mjs
// Requires: sharp (already a transitive dep of next.js)
//
// SVG source: public/icon.svg (square icon) + design-mockups/og-home.svg (OG layout).
// Re-run anytime the SVG changes.

import { promises as fs } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "..");
const ICON_SVG = await fs.readFile(path.join(ROOT, "public/icon.svg"));
const OG_SVG = await fs.readFile(path.join(ROOT, "design-mockups/og-home.svg"));

const targets = [
  { size: 180, in: ICON_SVG, out: "public/apple-touch-icon.png" },
  { size: 192, in: ICON_SVG, out: "public/icon-192.png" },
  { size: 512, in: ICON_SVG, out: "public/icon-512.png" },
];

for (const t of targets) {
  await sharp(t.in)
    .resize(t.size, t.size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9 })
    .toFile(path.join(ROOT, t.out));
  console.log(`✓ ${t.out} (${t.size}×${t.size})`);
}

// OG image has non-square aspect — render at native viewBox dimensions.
await sharp(OG_SVG)
  .resize(1200, 630, { fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(path.join(ROOT, "public/og-home.png"));
console.log("✓ public/og-home.png (1200×630)");

console.log("\nDone. 4 PNG files written to public/.");
