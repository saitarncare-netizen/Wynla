// "Mountains like X" recommender — pure scoring function used by the
// /resort/[slug] page to surface 4 resorts most similar to the one the
// user is currently viewing.
//
// Score is a SUM of weighted penalties (lower = more similar). Each
// factor either contributes a normalized distance or a small fixed
// penalty when data is missing. Final list is sorted ascending and
// the current resort itself is always excluded.

import { getDifficultyMix, type ResortDifficultyInput } from "./difficulty";

export type SimilarityResort = ResortDifficultyInput & {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: string | null;
  passes: string[];
  vertical_drop: number | null;
  total_trails: number | null;
  active?: boolean;
};

function diffMixDistance(
  a: ReturnType<typeof getDifficultyMix>,
  b: ReturnType<typeof getDifficultyMix>,
): number | null {
  if (!a || !b) return null;
  const db = a.beginner - b.beginner;
  const di = a.intermediate - b.intermediate;
  const dadv = a.advanced - b.advanced;
  const dex = a.expert - b.expert;
  // Mix values are 0–100; sqrt of summed squares stays in a comfortable
  // 0–~140 range. Divide by 10 so the scale matches the other factors
  // and a 10-point mix gap costs ~1 point.
  return Math.sqrt(db * db + di * di + dadv * dadv + dex * dex) / 10;
}

function passOverlapPenalty(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 5;
  const setB = new Set(b);
  for (const p of a) {
    if (setB.has(p)) return 0;
  }
  return 5;
}

function scoreCandidate(current: SimilarityResort, c: SimilarityResort): number {
  let score = 0;

  // Vertical drop — penalty grows with the gap. Null on either side =
  // mild fixed penalty (we don't know, so be a little less sure).
  if (current.vertical_drop != null && c.vertical_drop != null) {
    score += Math.abs(current.vertical_drop - c.vertical_drop) / 100;
  } else {
    score += 30;
  }

  // Total trails — same shape, smaller denominator since counts are
  // typically two-digit not four.
  if (current.total_trails != null && c.total_trails != null) {
    score += Math.abs(current.total_trails - c.total_trails) / 20;
  } else {
    score += 15;
  }

  // Difficulty-mix Euclidean distance × 10. Skip silently when either
  // resort has no mix data; we'd rather have the size factors decide
  // than penalize evenly across all unknowns.
  const mixDist = diffMixDistance(getDifficultyMix(current), getDifficultyMix(c));
  if (mixDist != null) score += mixDist * 10;

  // Pass affinity — being on a pass the user already follows is a big
  // similarity signal, so the gap between overlap (0) and no-overlap
  // (5) is intentionally wide vs. the trail-count contribution.
  score += passOverlapPenalty(current.passes ?? [], c.passes ?? []);

  // Geographic diversity — we WANT to surface resorts in other states
  // (the user already knows their local options), so we don't penalize
  // distance. But a same-region match gets a small bonus because
  // similar geography usually means similar snow/terrain character.
  if (
    current.region &&
    c.region &&
    current.region.toLowerCase() === c.region.toLowerCase()
  ) {
    score -= 3;
  }

  return score;
}

export function findSimilarResorts(
  current: SimilarityResort,
  pool: SimilarityResort[],
  n = 4,
): SimilarityResort[] {
  const candidates: Array<{ r: SimilarityResort; score: number }> = [];
  for (const r of pool) {
    if (r.id === current.id) continue;
    if (r.active === false) continue;
    candidates.push({ r, score: scoreCandidate(current, r) });
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates.slice(0, n).map((c) => c.r);
}
