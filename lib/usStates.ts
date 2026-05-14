// Stage 8 — SEO + discovery. Map of US state codes to display names,
// plus the subset of codes we actually have resort data for. Used by
// /state/[code] pages and the sitemap to avoid 404s on states we don't
// yet cover.
//
// The `resorts.state` column stores 2-letter codes ("CO", "VT") — we
// query against those directly. The `name` is used only for display
// (page title, H1, metadata).

export const US_STATES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

// States with at least one active resort in the DB (audited 2026-05-14).
// Keep this list in sync if new states get coverage — it's used to
// pre-validate /state/[code] requests + generate sitemap entries.
export const STATE_CODES_WITH_RESORTS: string[] = [
  "AK", "AL", "AZ", "CA", "CO", "CT", "ID", "IL", "IN", "IA",
  "MA", "MD", "ME", "MI", "MN", "MO", "MT", "NC", "ND", "NH",
  "NJ", "NM", "NV", "NY", "OH", "OR", "PA", "SD", "TN", "UT",
  "VA", "VT", "WA", "WI", "WV", "WY",
];

export function getStateName(code: string): string | null {
  return US_STATES[code.toUpperCase()] ?? null;
}

export function isStateCodeWithResorts(code: string): boolean {
  return STATE_CODES_WITH_RESORTS.includes(code.toUpperCase());
}
