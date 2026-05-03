export const PASS_COLORS = {
  epic: "#003B71",
  ikon: "#00477F",
  indy: "#E5732C",
  mountain_collective: "#9333EA",
  independent: "#6B7280",
} as const;

export const PASS_LABELS = {
  epic: "Epic Pass",
  ikon: "Ikon Pass",
  indy: "Indy Pass",
  mountain_collective: "Mountain Collective",
  independent: "Independent",
} as const;

export type Pass = keyof typeof PASS_COLORS;

export function passColor(pass: string): string {
  return PASS_COLORS[pass as Pass] ?? PASS_COLORS.independent;
}

export function passLabel(pass: string): string {
  return PASS_LABELS[pass as Pass] ?? "Independent";
}
