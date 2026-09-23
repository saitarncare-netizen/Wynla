// WCAG 2.x contrast maths for the few places that put text on a colour
// the design system does not control: pass badges (Epic orange, Ikon
// yellow), list accents and anything else that arrives as a hex string.
// Pure functions, no DOM; unit tested in lib/contrast.test.ts.
//
// The rule the tokens in app/globals.css were checked against is the
// same one used here: body text needs 4.5:1, large text (>= 18 px, or
// >= 14 px bold) and non-text graphics need 3:1.

export type Rgb = readonly [number, number, number];

const NAVY: Rgb = [0x1e, 0x29, 0x52];
const WHITE: Rgb = [0xff, 0xff, 0xff];

/** Parses #rgb / #rrggbb (case-insensitive). Returns null for anything else. */
export function hexToRgb(hex: string): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].split("").map((c) => c + c).join("") : m[1];
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance per WCAG 2.x (0 = black, 1 = white). */
export function relativeLuminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Contrast ratio between two colours, 1:1 .. 21:1. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * The text colour to put on an arbitrary background: brand navy or
 * white, whichever contrasts more. Navy wins on Ikon yellow and Epic
 * orange (white is 1.7:1 and 2.9:1 there); white wins on Indy red,
 * Mountain Collective navy and the independent grey. Unknown strings
 * (CSS variables, rgb()) fall back to white, which is what every
 * pre-existing badge used.
 */
export function textOn(background: string): "#1E2952" | "#FFFFFF" {
  const rgb = hexToRgb(background);
  if (!rgb) return "#FFFFFF";
  return contrastRatio(rgb, NAVY) >= contrastRatio(rgb, WHITE) ? "#1E2952" : "#FFFFFF";
}

function toHex([r, g, b]: Rgb): string {
  return "#" + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("");
}

/** Linear sRGB mix: `weight` of `a`, the rest `b` (what color-mix(in srgb) does). */
export function mixRgb(a: Rgb, b: Rgb, weight: number): Rgb {
  return [0, 1, 2].map((i) => a[i] * weight + b[i] * (1 - weight)) as unknown as Rgb;
}

/**
 * Gradient start for a navy PageHeader tinted with an arbitrary accent
 * (lib/lists.ts gives every list its own colour). The title and the
 * text-white/85 description sit on the top-left of the hero, which is
 * exactly where the gradient starts, so a bright accent there put white
 * text at 2.8:1 (#0EA5E9) or 2.9:1 (#CA8A04). The accent is mixed toward
 * navy, most accent first, until the 85 % white description text clears
 * 4.5:1 on it; saturated accents keep about half their colour, so each
 * list still reads as its own. Non-hex input (a CSS variable token) is
 * returned unchanged: tokens are checked in app/globals.css.
 */
export function accentOnNavy(accent: string): string {
  const rgb = hexToRgb(accent);
  if (!rgb) return accent;
  for (let weight = 0.6; weight > 0; weight -= 0.05) {
    const bg = mixRgb(rgb, NAVY, weight);
    const faintest = mixRgb(WHITE, bg, 0.7);
    if (contrastRatio(bg, faintest) >= 4.5) return toHex(bg);
  }
  return toHex(NAVY);
}
