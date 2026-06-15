// One-shot raster generator for the June 2026 brand refresh.
//
// Reads public/icon.svg (the sky-blue squircle mark with the S-curve
// trail) and writes the PNG sizes the manifest + Apple touch icon
// + Open Graph image route reference. Run via `node scripts/gen-brand-rasters.mjs`.
//
// Sharp is already a transitive Next.js dep so no install needed.
import sharp from "sharp";
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, ""));
const PUBLIC = join(ROOT, "public");

const markSvg = readFileSync(join(PUBLIC, "icon.svg"), "utf8");

async function renderSquare(size, outName, { background = "#5BAFE6" } = {}) {
  const out = await sharp(Buffer.from(markSvg), { density: 384 })
    .resize(size, size, { fit: "contain", background })
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUBLIC, outName), out);
  console.log(`wrote public/${outName} (${size}x${size})`);
}

// Open Graph card — 1200x630 with the mark centered on a navy field,
// matching wynla.app's app/layout.tsx metadataBase. Built as a fresh
// composite so the mark sits inside generous breathing room.
async function renderOg() {
  const W = 1200, H = 630;
  const markPx = 360;
  const markBuffer = await sharp(Buffer.from(markSvg), { density: 384 })
    .resize(markPx, markPx, { fit: "contain", background: { r: 30, g: 41, b: 82, alpha: 0 } })
    .png()
    .toBuffer();

  const titleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
    <rect width="${W}" height="${H}" fill="#1E2952"/>
    <text x="${W / 2}" y="${H - 130}" text-anchor="middle" fill="#FAFAF7"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif"
          font-size="78" font-weight="800" letter-spacing="-2">Wynla</text>
    <text x="${W / 2}" y="${H - 70}" text-anchor="middle" fill="#FAFAF7" fill-opacity="0.78"
          font-family="-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif"
          font-size="30" font-weight="500" letter-spacing="0.5">Plan smart. Ride better.</text>
  </svg>`;

  const out = await sharp(Buffer.from(titleSvg))
    .composite([{ input: markBuffer, top: 80, left: Math.floor((W - markPx) / 2) }])
    .png({ compressionLevel: 9 })
    .toBuffer();
  writeFileSync(join(PUBLIC, "og-home.png"), out);
  console.log(`wrote public/og-home.png (1200x630)`);
}

await renderSquare(180, "apple-touch-icon.png");
await renderSquare(192, "icon-192.png");
await renderSquare(512, "icon-512.png");
await renderOg();

console.log("done.");
