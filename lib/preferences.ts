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
