// Brand raster generator — June 2026 refresh (designer's real marks),
// extended 2026-09-23 for the one-tap install package.
//
// Source of truth = the designer's high-res PNGs in public/brand/
// (Smith's "Logo Usage" deliverable, 4500x4500 transparent):
//   wynla-mark.png             — the sky-dome + mountains + gold trail mark
//   wynla-logo-horizontal.png  — mark + "WYNLA" wordmark, horizontal lockup
//
// Writes every PNG the manifest / Apple touch icon / Open Graph card /
// install UI reference:
//   icon-{32,96,192,512}.png     square app icons (purpose "any")
//   icon-maskable-512.png        maskable icon — mark inside the 80% safe
//                                zone so Android's circle/squircle masks
//                                never clip it
//   apple-touch-icon.png         180x180
//   og-home.png                  1200x630 Open Graph card
//   splash.png                   legacy single iOS launch image
//   splash/<w>x<h>.png           per-device iOS launch images (see
//                                IOS_SPLASH_SIZES + app/layout.tsx)
//   screenshots/*.png            manifest screenshots (3 narrow 1080x1920
//                                + 1 wide 1920x1080) so Chrome shows the
//                                richer install sheet instead of the
//                                mini-infobar
//
// Run via `node scripts/gen-brand-rasters.mjs`. Sharp is already a
// transitive Next.js dep.

import sharp from "sharp";
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, ""));
const PUBLIC = join(ROOT, "public");
const BRAND = join(PUBLIC, "brand");

const NAVY = "#1E2952";   // brand navy (manifest theme/background)
const PAPER = "#FAFAF7";  // brand paper
const GOLD = "#F5C443";   // brand gold (accent line on screenshots)
const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

// Trim the transparent margins so we control the padding ourselves.
const mark = await sharp(join(BRAND, "wynla-mark.png")).trim({ threshold: 1 }).png().toBuffer();
const logo = await sharp(join(BRAND, "wynla-logo-horizontal.png")).trim({ threshold: 1 }).png().toBuffer();

function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, alpha: 1 };
}

function write(relPath, buf, note) {
  writeFileSync(join(PUBLIC, relPath), buf);
  console.log(`wrote public/${relPath}${note ? ` (${note})` : ""}`);
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
  write(outName, out, `${size}x${size}, bg ${bg}`);
}

// Maskable icon: the spec's safe zone is a centred circle of 80% of the
// canvas, so anything outside a 20% margin can be clipped by the
// launcher's mask. The mark is wider than it is tall, so we fit it to
// 58% of the width — that keeps every corner of its bounding box inside
// the safe circle rather than only its midpoints.
async function maskableIcon(size, outName) {
  await squareIcon(size, outName, { bg: NAVY, widthFrac: 0.58 });
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
      font-family="${FONT_STACK}"
      font-size="34" font-weight="600" letter-spacing="0.3">Plan smart. Ride better.</text>
  </svg>`;
  const out = await sharp(Buffer.from(tagline))
    .composite([{ input: logoBuf, top: Math.round((H - lm.height) / 2) - 28, left: Math.round((W - logoW) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  write("og-home.png", out, "1200x630");
}

// Navy field with the mark centred — the shared look for the iOS launch
// images. The sky-dome reads cleanly on navy (the dome is its own light
// container). `markFrac` = mark width as a fraction of the short side.
async function navyMarkCanvas(W, H, markFrac = 0.59) {
  const markW = Math.round(Math.min(W, H) * markFrac);
  const markBuf = await sharp(mark).resize({ width: markW }).toBuffer();
  const mm = await sharp(markBuf).metadata();
  return sharp({
    create: { width: W, height: H, channels: 4, background: hexToRgb(NAVY) },
  }).composite([{ input: markBuf, top: Math.round((H - mm.height) / 2), left: Math.round((W - markW) / 2) }]);
}

// Legacy single launch image (kept for the media-query-less fallback link).
async function renderSplash() {
  const W = 1284, H = 2778;
  const out = await (await navyMarkCanvas(W, H)).png({ compressionLevel: 9 }).toBuffer();
  write("splash.png", out, `${W}x${H}`);
}

// iOS only honours apple-touch-startup-image when the PNG's pixel size
// exactly matches the device AND the <link> carries a matching media
// query. One file therefore only ever works on one device class, so we
// emit one per iPhone class still in circulation. Keep this list in sync
// with `appleWebApp.startupImage` in app/layout.tsx.
const IOS_SPLASH_SIZES = [
  { w: 440, h: 956, dpr: 3 }, // iPhone 16 Pro Max / 17 Pro Max
  { w: 402, h: 874, dpr: 3 }, // iPhone 16 Pro / 17 Pro / 17
  { w: 430, h: 932, dpr: 3 }, // iPhone 14 Pro Max / 15 Plus / 15 Pro Max / 16 Plus
  { w: 393, h: 852, dpr: 3 }, // iPhone 14 Pro / 15 / 15 Pro / 16
  { w: 428, h: 926, dpr: 3 }, // iPhone 12 Pro Max / 13 Pro Max / 14 Plus
  { w: 390, h: 844, dpr: 3 }, // iPhone 12 / 12 Pro / 13 / 13 Pro / 14
  { w: 375, h: 812, dpr: 3 }, // iPhone X / XS / 11 Pro / 12 mini / 13 mini
  { w: 414, h: 896, dpr: 3 }, // iPhone XS Max / 11 Pro Max
  { w: 414, h: 896, dpr: 2 }, // iPhone XR / 11
  { w: 375, h: 667, dpr: 2 }, // iPhone SE (2nd/3rd gen) / 8
];

async function renderIosSplashSet() {
  mkdirSync(join(PUBLIC, "splash"), { recursive: true });
  for (const { w, h, dpr } of IOS_SPLASH_SIZES) {
    const W = w * dpr, H = h * dpr;
    const out = await (await navyMarkCanvas(W, H)).png({ compressionLevel: 9 }).toBuffer();
    write(`splash/${W}x${H}.png`, out, `${w}x${h}@${dpr}x`);
  }
}

// Manifest screenshots. Chrome's richer install UI needs at least one
// screenshot per form factor; all narrow ones must share an aspect
// ratio (9:16 here) and the long side may not exceed 2.3x the short one.
// These are branded "poster" frames — navy field, mark, WYNLA wordmark,
// one line of copy — rather than real UI captures, so they never go
// stale when the map redesign lands.
const SCREENSHOTS = [
  { file: "narrow-map.png", W: 1080, H: 1920, copy: "Every US ski resort on one map" },
  { file: "narrow-forecast.png", W: 1080, H: 1920, copy: "Drive time, pass info, and the snow surface forecast" },
  { file: "narrow-alerts.png", W: 1080, H: 1920, copy: "Powder alerts straight to your home screen" },
  { file: "wide-map.png", W: 1920, H: 1080, copy: "Plan smart. Ride better." },
];

async function renderScreenshots() {
  mkdirSync(join(PUBLIC, "screenshots"), { recursive: true });
  for (const { file, W, H, copy } of SCREENSHOTS) {
    const portrait = H > W;
    const markW = Math.round(Math.min(W, H) * (portrait ? 0.56 : 0.38));
    const markBuf = await sharp(mark).resize({ width: markW }).toBuffer();
    const mm = await sharp(markBuf).metadata();
    // Vertical rhythm: mark sits above centre, wordmark + copy below it.
    const markTop = Math.round(H * (portrait ? 0.24 : 0.14));
    const wordY = markTop + mm.height + Math.round(H * 0.075);
    const copyY = wordY + Math.round(H * 0.06);
    const wordSize = Math.round(Math.min(W, H) * 0.11);
    const copySize = Math.round(Math.min(W, H) * 0.042);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="${NAVY}"/>
      <text x="${W / 2}" y="${wordY}" text-anchor="middle" fill="#FFFFFF"
        font-family="${FONT_STACK}" font-size="${wordSize}" font-weight="800" letter-spacing="${Math.round(wordSize * 0.12)}">WYNLA</text>
      <rect x="${W / 2 - 40}" y="${wordY + Math.round(H * 0.022)}" width="80" height="6" rx="3" fill="${GOLD}"/>
      <text x="${W / 2}" y="${copyY}" text-anchor="middle" fill="${PAPER}" fill-opacity="0.88"
        font-family="${FONT_STACK}" font-size="${copySize}" font-weight="500">${copy}</text>
    </svg>`;
    const out = await sharp(Buffer.from(svg))
      .composite([{ input: markBuf, top: markTop, left: Math.round((W - markW) / 2) }])
      .png({ compressionLevel: 9 })
      .toBuffer();
    write(`screenshots/${file}`, out, `${W}x${H}`);
  }
}

await squareIcon(180, "apple-touch-icon.png");
await squareIcon(192, "icon-192.png");
await squareIcon(512, "icon-512.png");
await squareIcon(96, "icon-96.png");
await squareIcon(32, "icon-32.png");
await maskableIcon(512, "icon-maskable-512.png");
await renderOg();
await renderSplash();
await renderIosSplashSet();
await renderScreenshots();

// Comparison previews (bg options) — gitignored scratch, not shipped.
await squareIcon(512, "brand/_preview-navy.png", { bg: NAVY });
await squareIcon(512, "brand/_preview-white.png", { bg: "#FFFFFF" });
await squareIcon(512, "brand/_preview-paper.png", { bg: PAPER });

console.log("done.");
