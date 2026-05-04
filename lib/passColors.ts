// Verified pass brand colors (2026)
//   Epic Pass:           Vail Resorts orange
//   Ikon Pass:           Alterra/Ikon black
//   Indy Pass:           red, post-2023 rebrand
//   Mountain Collective: navy
//   Independent:         neutral gray
export const PASS_COLORS = {
  epic: "#F37021",
  ikon: "#000000",
  indy: "#DC2626",
  mountain_collective: "#1E3A8A",
  independent: "#6B7280",
} as const;

export const PASS_LABELS = {
  epic: "Epic Pass",
  ikon: "Ikon Pass",
  indy: "Indy Pass",
  mountain_collective: "Mountain Collective",
  independent: "Independent",
} as const;

// Short labels for tight UI (chips, pin badges)
export const PASS_SHORT = {
  epic: "Epic",
  ikon: "Ikon",
  indy: "Indy",
  mountain_collective: "MC",
  independent: "Indep.",
} as const;

export type Pass = keyof typeof PASS_COLORS;

export const PASS_KEYS: ReadonlyArray<Pass> = [
  "epic",
  "ikon",
  "indy",
  "mountain_collective",
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

// Pass badge styling (HTML string for use inside Mapbox popups, where we
// can't use Tailwind classes). Solid bg + white text, WCAG AA contrast.
export function passBadgeHtml(pass: string): string {
  return `
    <span style="
      display: inline-block;
      background: ${passColor(pass)};
      color: #FFFFFF;
      font-size: 11px;
      font-weight: 600;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.01em;
    ">${passLabel(pass)}</span>
  `.trim();
}
