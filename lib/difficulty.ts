// Difficulty-mix helpers. Single source of truth for "what percentage
// of trails are at each difficulty level" so ResortPanel and the
// /resort/[slug] page render identically.
//
// Stage 18 pivot: trail counts are inherently fuzzy (counting trails
// is hard even for active skiers — connecting trails, branches, etc.)
// so we display percentages instead. Percentages are what resorts
// already publish in marketing material, are easier to verify, and
// give users a clearer "is this resort right for me?" signal.

export type DifficultyMix = {
  beginner: number;
  intermediate: number;
  advanced: number;
  expert: number;
  /** True if percentages came from the `difficulty_pct_*` columns
      directly. False if we derived them from the `trails_*` counts. */
  fromPct: boolean;
};

export type ResortDifficultyInput = {
  difficulty_pct_beginner: number | null;
  difficulty_pct_intermediate: number | null;
  difficulty_pct_advanced: number | null;
  difficulty_pct_expert: number | null;
  trails_beginner: number | null;
  trails_intermediate: number | null;
  trails_advanced: number | null;
  trails_expert: number | null;
};

export function getDifficultyMix(r: ResortDifficultyInput): DifficultyMix | null {
  // Prefer explicit percentages — the canonical source post-Stage 18.
  const pctValues = [
    r.difficulty_pct_beginner,
    r.difficulty_pct_intermediate,
    r.difficulty_pct_advanced,
    r.difficulty_pct_expert,
  ];
  const setCount = pctValues.filter((v) => v != null).length;
  const pctSum = pctValues.reduce<number>((acc, v) => acc + (v ?? 0), 0);

  // Stage 33 — fabrication guard. The old `normalize()` blindly absorbed
  // the missing percentage into the largest bucket, which meant a single
  // value (e.g. Hurricane Ridge with advanced=33 and the other three
  // NULL) rendered as "100% Advanced" — wildly wrong. New rule: trust
  // the row only when:
  //   * at least 2 of the 4 buckets have a real value, AND
  //   * the raw sum is at least 70 (missing-bucket = implicit 0 is fine,
  //     but a sum of 33 means the row is genuinely incomplete).
  // Returns null in either failure case so the UI hides the bar and
  // shows "Difficulty mix not yet verified" instead of fabricating.
  if (setCount > 0) {
    if (setCount < 2 || pctSum < 70) return null;
    return normalize({
      beginner: r.difficulty_pct_beginner ?? 0,
      intermediate: r.difficulty_pct_intermediate ?? 0,
      advanced: r.difficulty_pct_advanced ?? 0,
      expert: r.difficulty_pct_expert ?? 0,
      fromPct: true,
    });
  }

  // Fallback: derive percentages from raw counts. Lets resorts whose
  // data was entered as counts (Stage 16 agent run) still show the bar.
  const counts = {
    beginner: r.trails_beginner ?? 0,
    intermediate: r.trails_intermediate ?? 0,
    advanced: r.trails_advanced ?? 0,
    expert: r.trails_expert ?? 0,
  };
  const sum = counts.beginner + counts.intermediate + counts.advanced + counts.expert;
  if (sum === 0) return null;
  return normalize({
    beginner: Math.round((counts.beginner / sum) * 100),
    intermediate: Math.round((counts.intermediate / sum) * 100),
    advanced: Math.round((counts.advanced / sum) * 100),
    expert: Math.round((counts.expert / sum) * 100),
    fromPct: false,
  });
}

// Pin total to exactly 100 by absorbing rounding error into the largest
// segment. Avoids "26 + 25 + 25 + 25 = 101" visual artifacts.
function normalize(mix: DifficultyMix): DifficultyMix {
  const sum = mix.beginner + mix.intermediate + mix.advanced + mix.expert;
  if (sum === 0 || sum === 100) return mix;
  const diff = 100 - sum;
  // Bias the correction toward the largest bucket so it's least visible.
  const entries: Array<[keyof DifficultyMix & ("beginner" | "intermediate" | "advanced" | "expert"), number]> = [
    ["beginner", mix.beginner],
    ["intermediate", mix.intermediate],
    ["advanced", mix.advanced],
    ["expert", mix.expert],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  const target = entries[0][0];
  return { ...mix, [target]: Math.max(0, mix[target] + diff) };
}
