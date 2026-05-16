// User onboarding preferences — answers to the 3-question wizard surfaced
// to first-time visitors. Stored client-side in localStorage so we can
// personalize the map filters on subsequent visits without a server
// round-trip or an account. When the user later signs in, we can mirror
// these into the profiles table; for now they're purely local.
//
// All reads are guarded against SSR / disabled-storage cases (returns
// null/false instead of throwing) so callers can use them inside React
// effects without try/catch noise.

export type SkillLevel = "beginner" | "intermediate" | "advanced" | "any";

export type Preferences = {
  skillLevel: SkillLevel;
  /** Empty list = "no preference / any pass". Otherwise pass keys from
      lib/passColors.ts (ikon, epic, indy, mountain_collective). */
  passes: string[];
  /** null = user picked "Set later". */
  origin: { kind: "city"; code: string } | null;
};

const PREFS_KEY = "wynla_prefs_v1";
const ONBOARDED_KEY = "wynla_onboarded_v1";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getPreferences(): Preferences | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    const obj = parsed as Record<string, unknown>;
    const skill = obj.skillLevel;
    const skillLevel: SkillLevel =
      skill === "beginner" || skill === "intermediate" || skill === "advanced"
        ? skill
        : "any";
    const passes = Array.isArray(obj.passes)
      ? obj.passes.filter((p): p is string => typeof p === "string")
      : [];
    let origin: Preferences["origin"] = null;
    if (
      obj.origin &&
      typeof obj.origin === "object" &&
      (obj.origin as { kind?: unknown }).kind === "city" &&
      typeof (obj.origin as { code?: unknown }).code === "string"
    ) {
      origin = { kind: "city", code: (obj.origin as { code: string }).code };
    }
    return { skillLevel, passes, origin };
  } catch {
    return null;
  }
}

export function setPreferences(p: Preferences): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    // localStorage may be full or disabled (private mode); silent failure
    // is the right call here — preferences are nice-to-have, not critical.
  }
}

export function isOnboarded(): boolean {
  if (!isBrowser()) return false;
  try {
    return window.localStorage.getItem(ONBOARDED_KEY) === "1";
  } catch {
    return false;
  }
}

export function setOnboarded(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(ONBOARDED_KEY, "1");
  } catch {
    // ignore
  }
}

/** Reset onboarding so the wizard re-appears on next visit. Useful if
 *  the user wants to update their skill level / passes / origin. Also
 *  clears the stored preferences so MapPage doesn't filter against
 *  stale answers. */
export function clearOnboarding(): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(ONBOARDED_KEY);
    window.localStorage.removeItem(PREFS_KEY);
  } catch {
    // ignore
  }
}

/**
 * Stage 33 — true when this resort's difficulty mix matches the user's
 * stated skill level. Used by the "🎯 For you" filter chip + as the
 * basis for the "Matches you" badge on resort cards.
 *
 *   beginner    → resort needs >=30% beginner terrain
 *   intermediate → >=35% intermediate
 *   advanced    → >=25% advanced or >=10% expert-only
 *   any         → match everything
 *
 * Resorts with no difficulty data scrape are INCLUDED (we don't punish
 * unknown — the user can decide). This keeps the filter from hiding
 * the 68 resorts where the partial-data sanity check has nulled the
 * percentages.
 */
export function matchesSkill(
  difficulty: {
    difficulty_pct_beginner: number | null;
    difficulty_pct_intermediate: number | null;
    difficulty_pct_advanced: number | null;
    difficulty_pct_expert: number | null;
  },
  skill: SkillLevel,
): boolean {
  if (skill === "any") return true;
  const beg = difficulty.difficulty_pct_beginner;
  const intm = difficulty.difficulty_pct_intermediate;
  const adv = difficulty.difficulty_pct_advanced;
  const exp = difficulty.difficulty_pct_expert;
  // No data → include rather than exclude.
  if (beg == null && intm == null && adv == null && exp == null) return true;
  if (skill === "beginner") return (beg ?? 0) >= 30;
  if (skill === "intermediate") return (intm ?? 0) >= 35;
  if (skill === "advanced") return (adv ?? 0) >= 25 || (exp ?? 0) >= 10;
  return true;
}
