// Header-sized brand rasters for components/BrandMark.tsx.
//
// The designer's PNGs in public/brand/ are 4500x4500 canvases with the
// artwork in the middle third, so rendering them straight into a 28 px
// tall header would ship ~200 KB and leave the mark floating in a sea of
// transparent padding. This trims the margins (like gen-brand-rasters.mjs
// does for the icons) and writes two tight, 2x-ready files:
//   public/brand/mark-trim.png            400x200  (mark alone, 2:1)
//   public/brand/logo-horizontal-trim.png 1080x200 (mark + WYNLA wordmark)
// Run with `node scripts/gen-brand-shell-assets.mjs` after a logo update.

import sharp from "sharp";
import { join, resolve } from "node:path";

const ROOT = resolve(new URL("..", import.meta.url).pathname.replace(/^\/(?=[A-Za-z]:)/, ""));
const BRAND = join(ROOT, "public", "brand");

async function trimTo(src, out, { width, height }) {
  const trimmed = await sharp(join(BRAND, src)).trim({ threshold: 1 }).png().toBuffer();
  const buf = await sharp(trimmed)
    .resize({ width, height, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png({ compressionLevel: 9, palette: true })
    .toBuffer();
  const meta = await sharp(buf).metadata();
  await sharp(buf).toFile(join(BRAND, out));
  console.log(`wrote public/brand/${out} (${meta.width}x${meta.height}, ${buf.length} bytes)`);
}

await trimTo("wynla-mark.png", "mark-trim.png", { width: 400, height: 200 });
await trimTo("wynla-logo-horizontal.png", "logo-horizontal-trim.png", { width: 1080, height: 200 });
