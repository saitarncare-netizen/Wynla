// Resort size tier — derived from vertical_drop (feet).
// Locked 2026-05-04: Small <1,000 ft · Medium 1,000–2,500 ft · Large >2,500 ft.
//
// Filter semantics (refined 2026-05-04 after testing):
//   • No size chip active → show all (NULL inclusive). Default discovery.
//   • Any size chip active → STRICT match. NULL hidden because user is
//     explicitly narrowing; mixed sizes break the "I clicked Small" mental
//     model. Hidden NULL count is surfaced as caption text.
//
// Visual mapping (Stage 4.1 spec):
//   small   → 12 px circle (radius 6)
//   medium  → 16 px circle (radius 8)  ← also default for unknown
//   large   → 20 px circle (radius 10)
// Touch target stays 44×44 px regardless via map clickTolerance.

export type SizeTier = "small" | "medium" | "large";

// Returns SizeTier or null when vertical_drop is unknown.
// Filter logic should treat null as "always pass" — never hide.
export function sizeTier(verticalDropFt: number | null | undefined): SizeTier | null {
  if (verticalDropFt == null) return null;
  if (verticalDropFt < 1000) return "small";
  if (verticalDropFt <= 2500) return "medium";
  return "large";
}

// Pixel diameter for the visible pin. Unknown tier defaults to medium so
// pins still render at a sensible size.
export function sizeTierPx(tier: SizeTier | null): number {
  switch (tier) {
    case "small":  return 12;
    case "large":  return 20;
    case "medium":
    default:       return 16;
  }
}

// Mapbox circle radius is half the visible diameter.
export function sizeTierRadius(tier: SizeTier | null): number {
  return sizeTierPx(tier) / 2;
}

export const SIZE_TIER_LABELS: Record<SizeTier, string> = {
  small:  "Small",
  medium: "Medium",
  large:  "Large",
};

// Short labels with vertical-drop hint for filter chips.
export const SIZE_TIER_SHORT: Record<SizeTier, string> = {
  small:  "Sm",
  medium: "Med",
  large:  "Lg",
};

export const SIZE_TIER_KEYS: ReadonlyArray<SizeTier> = ["small", "medium", "large"];

// Filter predicate: does a resort match the active size filter?
//   activeFilter = null → match everything (NULL included).
//   activeFilter = small/medium/large → strict; NULL hidden.
export function matchesSizeFilter(
  verticalDropFt: number | null | undefined,
  activeFilter: SizeTier | null,
): boolean {
  if (activeFilter === null) return true;
  if (verticalDropFt == null) return false;
  return sizeTier(verticalDropFt) === activeFilter;
}
