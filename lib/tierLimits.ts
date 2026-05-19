// Stage 34 — Free vs Pro tier limits. Single source of truth for every
// quota in the app: compare slots, favorites, snow alerts, saved trips,
// custom origins. Components import the limit + check against current
// count + render UpsellModal when free users hit the ceiling.
//
// Server enforcement: Supabase RLS already gates writes by user_id, but
// nothing currently caps row count. For MVP we trust the client gate
// (Pro status comes from /api/me/pro-status which reads pro_subscriptions);
// a follow-up will add a Postgres trigger to cap free-user row counts as
// a defense-in-depth measure.

export type TierLimitKey =
  | "compare"
  | "favorites"
  | "snowAlerts"
  | "savedTrips"
  | "origins";

export type TierLimits = Record<TierLimitKey, number>;

/** Free tier ceilings.
 *
 *  Inaugural Season 2026 (Nov 2026 – Apr 2027): everyone gets everything.
 *  No Pro tier UI visible, no upsell modals, no caps. The original limits
 *  are preserved in the comments below so they're trivial to restore for
 *  Season 2 (Nov 2027+) when paid tiers come back online.
 *
 *  Season 1 free-tier intended caps (commented for restoration):
 *    compare: 2, favorites: 5, snowAlerts: 1, savedTrips: 2, origins: 1
 *
 *  Hard cap on `compare` stays at 5 — comparing more than 5 resorts
 *  side-by-side becomes UX-hostile regardless of payment status. */
export const FREE_LIMITS: TierLimits = {
  compare: 5,
  favorites: Number.POSITIVE_INFINITY,
  snowAlerts: Number.POSITIVE_INFINITY,
  savedTrips: Number.POSITIVE_INFINITY,
  origins: Number.POSITIVE_INFINITY,
};

/** Pro tier ceilings. Number.POSITIVE_INFINITY = "unlimited"; we still
 *  keep a hard ceiling in localStorage helpers (e.g. COMPARE_MAX = 5)
 *  because comparing >5 resorts becomes UX-hostile regardless of payment. */
export const PRO_LIMITS: TierLimits = {
  compare: 5,
  favorites: Number.POSITIVE_INFINITY,
  snowAlerts: Number.POSITIVE_INFINITY,
  savedTrips: Number.POSITIVE_INFINITY,
  origins: Number.POSITIVE_INFINITY,
};

export function getLimits(isPro: boolean): TierLimits {
  return isPro ? PRO_LIMITS : FREE_LIMITS;
}

/** Returns true if a free user can add one more of `key`, false if
 *  they've reached the free ceiling. Pro users always get `true`. */
export function canAddMore(
  isPro: boolean,
  key: TierLimitKey,
  currentCount: number,
): boolean {
  const cap = getLimits(isPro)[key];
  return currentCount < cap;
}

/** Human-readable label for each limit. Used in upsell modal copy + the
 *  /pro page comparison table. Keep these strings short — they're rendered
 *  in tight spaces on mobile. */
export const LIMIT_LABELS: Record<TierLimitKey, { free: string; pro: string }> = {
  compare: { free: "2 resorts", pro: "5 side-by-side" },
  favorites: { free: "5 resorts", pro: "Unlimited + lists" },
  snowAlerts: { free: "1 resort", pro: "Every favorite + custom thresholds" },
  savedTrips: { free: "2 trips", pro: "Unlimited + PDF export" },
  origins: { free: "1 origin", pro: "Unlimited (NYC + LA + …)" },
};

/** Tagline shown in the upsell modal headline per gate. */
export const UPSELL_TAGLINES: Record<TierLimitKey, string> = {
  compare: "Compare more resorts side-by-side",
  favorites: "Save every resort you love",
  snowAlerts: "Get alerts for every favorite",
  savedTrips: "Plan unlimited ski trips",
  origins: "Save multiple home origins",
};
