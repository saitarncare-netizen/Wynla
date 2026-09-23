// Single reader for the resorts.lift_types JSON so the map filters and
// the resort page Lifts stat can never disagree about which keys count.
//
// Canonical keys (every populated row uses these since the 2026-09-23
// backfill remapped the last Phase 0 placeholder rows):
//   high_speed_eight, high_speed_six, high_speed_quad, high_speed_triple,
//   fixed_quad, fixed_triple, fixed_double, gondola, bubble_chair, tram,
//   surface, magic_carpet
// Values are coerced with Number() because one imported row stored
// strings; `?? 0` on a string would concatenate instead of add.

/** Shape of resorts.lift_types as the app types it (integers per key). */
export type LiftTypes = Partial<Record<LiftKey, number>>;

/** What actually arrives from JSONB: one imported row stored strings/nulls. */
export type LiftTypesInput = Partial<Record<LiftKey, number | string | null>>;

export type LiftKey =
  | "high_speed_eight"
  | "high_speed_six"
  | "high_speed_quad"
  | "high_speed_triple"
  | "fixed_quad"
  | "fixed_triple"
  | "fixed_double"
  | "gondola"
  | "bubble_chair"
  | "tram"
  | "surface"
  | "magic_carpet";

export type LiftCounts = {
  /** Detachable chairs of any width (eight / six / quad / triple). */
  highSpeed: number;
  gondola: number;
  tram: number;
  /** Anything that is not a surface lift or carpet, i.e. real uphill capacity. */
  aerial: number;
};

const HIGH_SPEED: LiftKey[] = ["high_speed_eight", "high_speed_six", "high_speed_quad", "high_speed_triple"];
// bubble_chair is counted as aerial but not as high-speed: the key does
// not assert the chair is detachable.
const AERIAL: LiftKey[] = [...HIGH_SPEED, "fixed_quad", "fixed_triple", "fixed_double", "gondola", "bubble_chair", "tram"];

function count(t: LiftTypesInput, key: LiftKey): number {
  const n = Number(t[key]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function liftCounts(t: LiftTypesInput | null | undefined): LiftCounts {
  if (!t || typeof t !== "object") return { highSpeed: 0, gondola: 0, tram: 0, aerial: 0 };
  const sum = (keys: LiftKey[]) => keys.reduce((acc, k) => acc + count(t, k), 0);
  return {
    highSpeed: sum(HIGH_SPEED),
    gondola: count(t, "gondola"),
    tram: count(t, "tram"),
    aerial: sum(AERIAL),
  };
}
