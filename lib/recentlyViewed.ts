// Recently-viewed localStorage helper. Backs the homepage "Recently
// viewed" strip that lets users hop back to resorts they just looked
// at. Stores a small projection of each resort (just what the strip
// + the map flyTo handler need) so we don't have to re-fetch on
// render.
//
// SSR-safe: all window/localStorage access is guarded.

const KEY = "wynla_recent_v1";
export const RECENT_MAX = 8;
export const RECENT_CHANGE_EVENT = "wynla:recent-change";

export type RecentResort = {
  id: number;
  slug: string;
  name: string;
  primary_pass: string;
  lat: number;
  lng: number;
};

function isRecentResort(v: unknown): v is RecentResort {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "number" &&
    Number.isFinite(o.id) &&
    typeof o.slug === "string" &&
    typeof o.name === "string" &&
    typeof o.primary_pass === "string" &&
    typeof o.lat === "number" &&
    typeof o.lng === "number" &&
    Number.isFinite(o.lat) &&
    Number.isFinite(o.lng)
  );
}

function isRecentArray(v: unknown): v is RecentResort[] {
  return Array.isArray(v) && v.every(isRecentResort);
}

function read(): RecentResort[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isRecentArray(parsed)) return [];
    return dedupCap(parsed);
  } catch {
    return [];
  }
}

function write(list: RecentResort[]): RecentResort[] {
  const next = dedupCap(list);
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(RECENT_CHANGE_EVENT));
  } catch {
    // Ignore quota / blocked storage — caller still gets next.
  }
  return next;
}

function dedupCap(list: RecentResort[]): RecentResort[] {
  const seen = new Set<number>();
  const out: RecentResort[] = [];
  for (const r of list) {
    if (seen.has(r.id)) continue;
    seen.add(r.id);
    out.push(r);
    if (out.length >= RECENT_MAX) break;
  }
  return out;
}

export function getRecent(): RecentResort[] {
  return read();
}

/** Push a resort to the front of the recent list. If it's already
 *  present, it moves to position 0 (most-recent-first). Capped at
 *  RECENT_MAX entries. Returns the new list. */
export function addRecent(entry: RecentResort): RecentResort[] {
  // Skip writes if coords aren't usable — protects the map flyTo handler.
  if (!Number.isFinite(entry.lat) || !Number.isFinite(entry.lng)) return read();
  const cur = read();
  const filtered = cur.filter((r) => r.id !== entry.id);
  const next = [entry, ...filtered];
  write(next);
  return dedupCap(next);
}

export function removeRecent(id: number): RecentResort[] {
  const cur = read();
  const next = cur.filter((r) => r.id !== id);
  write(next);
  return next;
}

export function clearRecent(): RecentResort[] {
  write([]);
  return [];
}
