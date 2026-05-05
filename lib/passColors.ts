// Verified pass brand colors (2026-05-04, Stage 4.1 update)
//   Mountain Collective: navy (highest visual priority — most prestigious multi-pass)
//   Ikon Pass:           yellow #F2C200 (was #000000 — black blended into map)
//   Epic Pass:           Vail Resorts orange
//   Indy Pass:           red, post-2023 rebrand
//   Independent:         neutral gray
export const PASS_COLORS = {
  mountain_collective: "#1E3A8A",
  ikon: "#F2C200",
  epic: "#F37021",
  indy: "#DC2626",
  independent: "#6B7280",
} as const;

export const PASS_LABELS = {
  mountain_collective: "Mountain Collective",
  ikon: "Ikon Pass",
  epic: "Epic Pass",
  indy: "Indy Pass",
  independent: "Independent",
} as const;

// Short labels for tight UI (chips, pin badges)
export const PASS_SHORT = {
  mountain_collective: "MC",
  ikon: "Ikon",
  epic: "Epic",
  indy: "Indy",
  independent: "Indep.",
} as const;

export type Pass = keyof typeof PASS_COLORS;

// Priority order: most prestigious first. Used to pick the primary pass for
// pin coloring on multi-pass resorts (e.g. Snowbasin Epic+Ikon+MC → MC navy).
export const PASS_KEYS: ReadonlyArray<Pass> = [
  "mountain_collective",
  "ikon",
  "epic",
  "indy",
  "independent",
];

export function passColor(pass: string): string {
  return PASS_COLORS[pass as Pass] ?? PASS_COLORS.independent;
}

export function passLabel(pass: string): string {
  return PASS_LABELS[pass as Pass] ?? "Independent";
}

export function passShort(pass: string): string {
  return PASS_SHORT[pass as Pass] ?? "Indep.";
}

// Pick the primary pass for pin color from a resort's pass list.
// Walks PASS_KEYS in priority order and returns the first one present.
// Empty/null list → "independent" gray.
export function primaryPass(passes: string[] | null | undefined): Pass {
  if (!passes || passes.length === 0) return "independent";
  for (const key of PASS_KEYS) {
    if (passes.includes(key)) return key;
  }
  return "independent";
}

// Pass badge styling (HTML string for use inside Mapbox popups, where we
// can't use Tailwind classes). Solid bg + white text, WCAG AA contrast.
// Ikon yellow gets dark text since white-on-yellow fails WCAG.
export function passBadgeHtml(pass: string): string {
  const bg = passColor(pass);
  const fg = pass === "ikon" ? "#1E2952" : "#FFFFFF";
  return `
    <span style="
      display: inline-block;
      background: ${bg};
      color: ${fg};
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.01em;
    ">${passLabel(pass)}</span>
  `.trim();
}
