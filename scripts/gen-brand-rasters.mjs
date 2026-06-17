// Brand raster generator — June 2026 refresh (designer's real marks).
//
// Source of truth = the designer's high-res PNGs in public/brand/
// (Smith's "Logo Usage" deliverable, 4500x4500 transparent):
//   wynla-mark.png             — the sky-dome + mountains + gold trail mark
//   wynla-logo-horizontal.png  — mark + "WYNLA" wordmark, horizontal lockup
//
// Writes the PNG sizes the manifest / Apple touch icon / Open Graph card
// reference. Run via `node scripts/gen-brand-rasters.mjs`.
// Sharp is already a transitive Next.js dep.

import sharp from "sharp";
import { writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, ""));
const PUBLIC = join(ROOT, "public");
const BRAND = join(PUBLIC, "brand");

const NAVY = "#1E2952";   // brand navy (manifest theme/background)
const PAPER = "#FAFAF7";  // brand paper

// Trim the transparent margins so we control the padding ourselves.
const mark = await sharp(join(BRAND, "wynla-mark.png")).trim({ threshold: 1 }).png().toBuffer();
const logo = await sharp(join(BRAND, "wynla-logo-horizontal.png")).trim({ threshold: 1 }).png().toBuffer();

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1 };
}

// Square app/favicon: mark centred on a solid square, padded so the
// half-dome breathes. `widthFrac` = mark width as a fraction of canvas.
async function squareIcon(size, outName, { bg = NAVY, widthFrac = 0.78 } = {}) {
  const innerW = Math.round(size * widthFrac);
  const resized = await sharp(mark)
    .resize({ width: innerW, withoutEnlargement: false })
    .toBuffer();
  const out = await sharp({
    create: { width: size, height: size, channels: 4, background: hexToRgb(bg) },
  })
    .composite([{ input: resized, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUBLIC, outName), out);
  console.log(`wrote public/${outName} (${size}x${size}, bg ${bg})`);
}

// Open Graph card — paper field with the horizontal lockup + tagline.
async function renderOg() {
  const W = 1200, H = 630;
  const logoW = 720;
  const logoBuf = await sharp(logo).resize({ width: logoW }).toBuffer();
  const lm = await sharp(logoBuf).metadata();
  const tagline = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="${PAPER}"/>
    <text x="${W / 2}" y="${H - 78}" text-anchor="middle" fill="#1E2952" fill-opacity="0.72"
      font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif"
      font-size="34" font-weight="600" letter-spacing="0.3">Plan smart. Ride better.</text>
  </svg>`;
  const out = await sharp(Buffer.from(tagline))
    .composite([{ input: logoBuf, top: Math.round((H - lm.height) / 2) - 28, left: Math.round((W - logoW) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUBLIC, "og-home.png"), out);
  console.log(`wrote public/og-home.png (1200x630)`);
}

// iOS PWA launch image — navy field, mark centred. The sky-dome reads
// cleanly on navy (the dome is its own light container).
async function renderSplash() {
  const W = 1284, H = 2778;
  const markW = 760;
  const markBuf = await sharp(mark).resize({ width: markW }).toBuffer();
  const mm = await sharp(markBuf).metadata();
  const out = await sharp({
    create: { width: W, height: H, channels: 4, background: hexToRgb(NAVY) },
  })
    .composite([{ input: markBuf, top: Math.round((H - mm.height) / 2), left: Math.round((W - markW) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUBLIC, "splash.png"), out);
  console.log(`wrote public/splash.png (${W}x${H})`);
}

await squareIcon(180, "apple-touch-icon.png");
await squareIcon(192, "icon-192.png");
await squareIcon(512, "icon-512.png");
await squareIcon(32, "icon-32.png");
await renderOg();
await renderSplash();

// Comparison previews (bg options) — gitignored scratch, not shipped.
await squareIcon(512, "brand/_preview-navy.png", { bg: NAVY });
await squareIcon(512, "brand/_preview-white.png", { bg: "#FFFFFF" });
await squareIcon(512, "brand/_preview-paper.png", { bg: PAPER });

console.log("done.");
