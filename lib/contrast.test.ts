import { describe, expect, it } from "vitest";
import { accentOnNavy, contrastRatio, hexToRgb, mixRgb, relativeLuminance, textOn } from "./contrast";
import { LISTS } from "./lists";
import { PASS_COLORS } from "./passColors";

describe("contrast", () => {
  it("parses short and long hex", () => {
    expect(hexToRgb("#fff")).toEqual([255, 255, 255]);
    expect(hexToRgb("1E2952")).toEqual([0x1e, 0x29, 0x52]);
    expect(hexToRgb("var(--color-wn-navy)")).toBeNull();
  });

  it("matches the WCAG reference points", () => {
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 5);
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
    // The design tokens: wn-muted on off-white is the number quoted in
    // app/globals.css.
    expect(contrastRatio(hexToRgb("#5c5c5b")!, hexToRgb("#fafaf7")!)).toBeGreaterThan(6.3);
  });

  it("picks navy on the light pass colours and white on the dark ones", () => {
    expect(textOn(PASS_COLORS.ikon)).toBe("#1E2952");
    expect(textOn(PASS_COLORS.epic)).toBe("#1E2952");
    expect(textOn(PASS_COLORS.indy)).toBe("#FFFFFF");
    expect(textOn(PASS_COLORS.mountain_collective)).toBe("#FFFFFF");
    expect(textOn(PASS_COLORS.independent)).toBe("#FFFFFF");
  });

  it("always reaches 4.5:1 for the pass badges", () => {
    for (const bg of Object.values(PASS_COLORS)) {
      expect(contrastRatio(hexToRgb(bg)!, hexToRgb(textOn(bg))!)).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("falls back to white for non-hex input", () => {
    expect(textOn("var(--color-wn-navy)")).toBe("#FFFFFF");
  });

  it("darkens every list accent until the hero text clears AA", () => {
    const white = hexToRgb("#ffffff")!;
    for (const list of LISTS) {
      if (!list.accent) continue;
      const start = hexToRgb(accentOnNavy(list.accent))!;
      // Title (pure white) and the faintest hero text, the eyebrow and
      // meta line (white at 70 % opacity).
      expect(contrastRatio(start, white)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(start, mixRgb(white, start, 0.7))).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("keeps CSS variable accents as they are", () => {
    expect(accentOnNavy("var(--color-wn-navy)")).toBe("var(--color-wn-navy)");
  });
});
