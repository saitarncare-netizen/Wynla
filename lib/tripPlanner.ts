// Multi-day trip planner. Two modes:
//
//   "basecamp"  — sleep at the same resort every night. Algorithm picks
//                 the single best resort, defined as: closest to origin
//                 AND has the most other resorts within day-trip range
//                 (so days 2..N you can drive out and back). Returns one
//                 resort repeated `days` times.
//
//   "roadtrip"  — sleep at a different resort each night. Greedy
//                 nearest-neighbor from origin → resort 1 → resort 2 →
//                 …, never repeating, capped by single-leg drive time.
//
// Drive-time inputs are pre-computed Haversine estimates from the
// caller. The panel can later upgrade individual legs to Mapbox Matrix
// exact values.

import { haversineMeters, estimateDriveSeconds } from "./distance";

export type LatLng = { lat: number; lng: number };

export type PlannerCandidate = {
  id: number;
  slug: string;
  name: string;
  state: string;
  lat: number;
  lng: number;
};

export type TripLeg = {
  fromKind: "origin" | "resort";
  fromName: string;
  fromLat: number;
  fromLng: number;
  toSlug: string;
  toName: string;
  toLat: number;
  toLng: number;
  durationSeconds: number;
  distanceMeters: number;
};

export type TripPlan = {
  mode: "basecamp" | "roadtrip";
  days: number;
  // resorts[i] = where you ski on day i+1 (0-indexed). For basecamp mode
  // the same resort is repeated; for roadtrip each day has a different
  // resort. Length always === days.
  resorts: PlannerCandidate[];
  // legs.length === days. Leg i is "where you sleep on the night of
  // day i" — i.e. the drive from yesterday's spot (or the origin on
  // day 1) to today's resort. The very last entry of `homeLeg` is the
  // drive home from the final resort.
  legs: TripLeg[];
  homeLeg: TripLeg | null;
  totalDriveSeconds: number;
};

const MAX_LEG_HOURS_BY_MODE: Record<"basecamp" | "roadtrip", number> = {
  basecamp: 6,   // willing to drive up to 6h to reach the basecamp
  roadtrip: 5,   // each leg between resorts capped tighter
};

const DAY_TRIP_RADIUS_HOURS = 1.5;

function legBetween(
  fromKind: "origin" | "resort",
  fromName: string,
  from: LatLng,
  to: PlannerCandidate,
): TripLeg {
  const meters = haversineMeters(from.lat, from.lng, to.lat, to.lng);
  const driveMeters = Math.round(meters * 1.3);
  return {
    fromKind,
    fromName,
    fromLat: from.lat,
    fromLng: from.lng,
    toSlug: to.slug,
    toName: to.name,
    toLat: to.lat,
    toLng: to.lng,
    durationSeconds: estimateDriveSeconds(meters),
    distanceMeters: driveMeters,
  };
}

// Score a basecamp candidate: low drive time from origin (penalty) +
// many other candidates within day-trip range (bonus).
function scoreBasecamp(
  origin: LatLng,
  candidate: PlannerCandidate,
  others: PlannerCandidate[],
): number {
  const meters = haversineMeters(origin.lat, origin.lng, candidate.lat, candidate.lng);
  const driveHours = estimateDriveSeconds(meters) / 3600;
  if (driveHours > MAX_LEG_HOURS_BY_MODE.basecamp) return -Infinity;
  const dayTripCount = others.filter((o) => {
    if (o.id === candidate.id) return false;
    const m = haversineMeters(candidate.lat, candidate.lng, o.lat, o.lng);
    return estimateDriveSeconds(m) / 3600 <= DAY_TRIP_RADIUS_HOURS;
  }).length;
  // Closer to origin + more nearby resorts = better. Origin distance
  // weighted ~half a day-trip option.
  return dayTripCount - driveHours * 0.5;
}

export function planBasecamp(
  origin: LatLng,
  originLabel: string,
  candidates: PlannerCandidate[],
  days: number,
): TripPlan | null {
  if (candidates.length === 0 || days < 1) return null;

  let best: { c: PlannerCandidate; score: number } | null = null;
  for (const c of candidates) {
    const score = scoreBasecamp(origin, c, candidates);
    if (!Number.isFinite(score)) continue;
    if (!best || score > best.score) best = { c, score };
  }
  if (!best) return null;

  const arrival = legBetween("origin", originLabel, origin, best.c);
  const homeLeg = legBetween(
    "resort",
    best.c.name,
    { lat: best.c.lat, lng: best.c.lng },
    { id: -1, slug: "__origin__", name: originLabel, state: "", lat: origin.lat, lng: origin.lng },
  );
  // For days 2..N at basecamp, the "leg" is just "stay put" — represent
  // as a zero-distance leg from the resort to itself. Keeps the data
  // shape predictable for the UI.
  const stayPut: TripLeg = {
    fromKind: "resort",
    fromName: best.c.name,
    fromLat: best.c.lat,
    fromLng: best.c.lng,
    toSlug: best.c.slug,
    toName: best.c.name,
    toLat: best.c.lat,
    toLng: best.c.lng,
    durationSeconds: 0,
    distanceMeters: 0,
  };

  const resorts = Array.from({ length: days }, () => best!.c);
  const legs: TripLeg[] = [arrival];
  for (let i = 1; i < days; i++) legs.push(stayPut);

  const totalDriveSeconds = arrival.durationSeconds + homeLeg.durationSeconds;
  return { mode: "basecamp", days, resorts, legs, homeLeg, totalDriveSeconds };
}

export function planRoadtrip(
  origin: LatLng,
  originLabel: string,
  candidates: PlannerCandidate[],
  days: number,
): TripPlan | null {
  if (candidates.length === 0 || days < 1) return null;

  const visited = new Set<number>();
  const resorts: PlannerCandidate[] = [];
  const legs: TripLeg[] = [];

  let cursor: { lat: number; lng: number; name: string; kind: "origin" | "resort" } = {
    lat: origin.lat,
    lng: origin.lng,
    name: originLabel,
    kind: "origin",
  };

  for (let day = 0; day < days; day++) {
    let bestNext: { c: PlannerCandidate; seconds: number } | null = null;
    for (const c of candidates) {
      if (visited.has(c.id)) continue;
      const meters = haversineMeters(cursor.lat, cursor.lng, c.lat, c.lng);
      const seconds = estimateDriveSeconds(meters);
      // For day 1 we allow up to 6h (willing to drive farther to start);
      // subsequent legs are capped by roadtrip mode (5h).
      const cap =
        day === 0
          ? MAX_LEG_HOURS_BY_MODE.basecamp
          : MAX_LEG_HOURS_BY_MODE.roadtrip;
      if (seconds / 3600 > cap) continue;
      if (!bestNext || seconds < bestNext.seconds) bestNext = { c, seconds };
    }
    if (!bestNext) {
      // Ran out of options within drive cap — abort with whatever we
      // have so far. The caller can show "couldn't fill all days".
      break;
    }
    const leg = legBetween(cursor.kind, cursor.name, cursor, bestNext.c);
    legs.push(leg);
    resorts.push(bestNext.c);
    visited.add(bestNext.c.id);
    cursor = {
      lat: bestNext.c.lat,
      lng: bestNext.c.lng,
      name: bestNext.c.name,
      kind: "resort",
    };
  }

  if (resorts.length === 0) return null;

  const last = resorts[resorts.length - 1];
  const homeLeg = legBetween(
    "resort",
    last.name,
    { lat: last.lat, lng: last.lng },
    { id: -1, slug: "__origin__", name: originLabel, state: "", lat: origin.lat, lng: origin.lng },
  );

  const totalDriveSeconds =
    legs.reduce((s, l) => s + l.durationSeconds, 0) + homeLeg.durationSeconds;

  return {
    mode: "roadtrip",
    days: resorts.length,
    resorts,
    legs,
    homeLeg,
    totalDriveSeconds,
  };
}

export function planTrip(
  mode: "basecamp" | "roadtrip",
  origin: LatLng,
  originLabel: string,
  candidates: PlannerCandidate[],
  days: number,
): TripPlan | null {
  return mode === "basecamp"
    ? planBasecamp(origin, originLabel, candidates, days)
    : planRoadtrip(origin, originLabel, candidates, days);
}

// Plan a trip where SOME days are user-locked to a specific slug and
// the rest fill in via greedy nearest-neighbor from the previous day's
// position. Picks and gaps are interleaved correctly, so a Day-1
// override of "loveland" leads Days 2..N to greedy from Loveland CO,
// not from the origin. Lock entries for resorts not in `candidates`
// are silently dropped.
export function planWithOverrides(
  origin: LatLng,
  originLabel: string,
  candidates: PlannerCandidate[],
  days: number,
  overridesByDay: Record<number, string>,
): TripPlan | null {
  if (candidates.length === 0 || days < 1) return null;
  const bySlug = new Map(candidates.map((c) => [c.slug, c]));
  const visited = new Set<number>();
  const resorts: PlannerCandidate[] = [];
  let cursor: { lat: number; lng: number; name: string; kind: "origin" | "resort" } = {
    lat: origin.lat,
    lng: origin.lng,
    name: originLabel,
    kind: "origin",
  };

  for (let day = 0; day < days; day++) {
    let pick: PlannerCandidate | null = null;
    const overrideSlug = overridesByDay[day];
    if (overrideSlug) {
      const found = bySlug.get(overrideSlug);
      if (found && !visited.has(found.id)) pick = found;
    }
    if (!pick) {
      // Greedy nearest unvisited from cursor — no drive cap when filling
      // gaps around user picks, since the user has explicitly anchored
      // a far point and may want the algorithm to reach toward it.
      let bestSeconds = Infinity;
      for (const c of candidates) {
        if (visited.has(c.id)) continue;
        const meters = haversineMeters(cursor.lat, cursor.lng, c.lat, c.lng);
        const seconds = estimateDriveSeconds(meters);
        if (seconds < bestSeconds) {
          bestSeconds = seconds;
          pick = c;
        }
      }
    }
    if (!pick) break;
    resorts.push(pick);
    visited.add(pick.id);
    cursor = { lat: pick.lat, lng: pick.lng, name: pick.name, kind: "resort" };
  }
  if (resorts.length === 0) return null;

  // Build legs by walking the route again so we get the correct fromName.
  const legs: TripLeg[] = [];
  let walkCursor: { lat: number; lng: number; name: string; kind: "origin" | "resort" } = {
    lat: origin.lat,
    lng: origin.lng,
    name: originLabel,
    kind: "origin",
  };
  for (const r of resorts) {
    legs.push(legBetween(walkCursor.kind, walkCursor.name, walkCursor, r));
    walkCursor = { lat: r.lat, lng: r.lng, name: r.name, kind: "resort" };
  }

  const last = resorts[resorts.length - 1];
  const homeLeg = legBetween(
    "resort",
    last.name,
    { lat: last.lat, lng: last.lng },
    { id: -1, slug: "__origin__", name: originLabel, state: "", lat: origin.lat, lng: origin.lng },
  );
  const totalDriveSeconds =
    legs.reduce((s, l) => s + l.durationSeconds, 0) + homeLeg.durationSeconds;

  return {
    mode: "roadtrip",
    days: resorts.length,
    resorts,
    legs,
    homeLeg,
    totalDriveSeconds,
  };
}

// Reconstruct a plan from a fixed list of resort slugs (the form used
// by saved trips and the share-link URL state). Skips resorts not in
// `candidates`. Used by the panel when ?route=… or a saved trip
// dictates the order.
export function planFromOrderedSlugs(
  origin: LatLng,
  originLabel: string,
  candidates: PlannerCandidate[],
  orderedSlugs: string[],
  mode: "basecamp" | "roadtrip",
): TripPlan | null {
  const bySlug = new Map(candidates.map((c) => [c.slug, c]));
  const resorts: PlannerCandidate[] = [];
  for (const s of orderedSlugs) {
    const c = bySlug.get(s);
    if (c) resorts.push(c);
  }
  if (resorts.length === 0) return null;

  const legs: TripLeg[] = [];
  let cursor: { lat: number; lng: number; name: string; kind: "origin" | "resort" } = {
    lat: origin.lat,
    lng: origin.lng,
    name: originLabel,
    kind: "origin",
  };
  for (const c of resorts) {
    const leg = legBetween(cursor.kind, cursor.name, cursor, c);
    legs.push(leg);
    cursor = { lat: c.lat, lng: c.lng, name: c.name, kind: "resort" };
  }

  const last = resorts[resorts.length - 1];
  const homeLeg = legBetween(
    "resort",
    last.name,
    { lat: last.lat, lng: last.lng },
    { id: -1, slug: "__origin__", name: originLabel, state: "", lat: origin.lat, lng: origin.lng },
  );

  const totalDriveSeconds =
    legs.reduce((s, l) => s + l.durationSeconds, 0) + homeLeg.durationSeconds;

  return {
    mode,
    days: resorts.length,
    resorts,
    legs,
    homeLeg,
    totalDriveSeconds,
  };
}
