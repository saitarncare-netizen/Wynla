export const ORIGINS = [
  { code: "nyc",          name: "NYC",          short: "NYC",      lat: 40.7128, lon: -74.006  },
  { code: "boston",       name: "Boston",       short: "Boston",   lat: 42.3601, lon: -71.0589 },
  { code: "philadelphia", name: "Philadelphia", short: "Philly",   lat: 39.9526, lon: -75.1652 },
  { code: "hartford",     name: "Hartford",     short: "Hartford", lat: 41.7637, lon: -72.6851 },
] as const;

export type Origin = (typeof ORIGINS)[number];

export function originByCode(code: string | null | undefined): Origin {
  return ORIGINS.find((o) => o.code === code) ?? ORIGINS[0];
}

export function formatDriveTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  return `${h}h ${String(m).padStart(2, "0")}m`;
}
