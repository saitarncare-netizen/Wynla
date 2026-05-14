// Trip cost estimator — pure helpers. Adds a rough "how much will this
// trip cost?" number to the planner review screen so users can ballpark
// the spend before they commit. Three buckets:
//
//   1. Lift tickets — sum across all ski days. If the user owns a pass
//      the resort honors, that day is free. Otherwise we use the
//      resort's ticket_price_adult_min / _max from the DB, falling back
//      to $150 when unknown.
//   2. Lodging — assumes 1 night per ski day. Default $150/night,
//      ranged $80 (budget motel) to $300 (slope-side) for low/high.
//   3. Driving — total miles × $0.18 (IRS 2026 std mileage rate).
//
// All numbers are estimates — surfaced with a disclaimer in the UI.

// Default $150/night is a rough national average for ski-town lodging
// in shoulder weeks (Hipcamp/AirDNA data, 2025). High-season Aspen or
// Park City obviously blows past this — the range below widens the
// envelope, and the UI tells the user it's an estimate.
const DEFAULT_NIGHTLY_LODGING = 150;
const LOW_NIGHTLY_LODGING = 80;
const HIGH_NIGHTLY_LODGING = 300;
// IRS standard business mileage rate for 2026. Captures fuel,
// depreciation, insurance — close enough for a trip-cost ballpark and
// the number most US users recognize (taxes / employer reimbursement).
const IRS_MILEAGE_RATE = 0.18;
// Day-pass walk-up rate when we don't have the resort's price.
// Conservative middle of the road — most US ski areas sit $90-$220.
const DEFAULT_TICKET_PRICE = 150;
const FALLBACK_TICKET_MIN = 90;
const FALLBACK_TICKET_MAX = 220;

export type CostBreakdown = {
  /** Sum of lift-ticket cost across all days, midpoint of min/max
      when both are known. Zero when the user's pass covers every stop. */
  liftTickets: number;
  /** Estimated lodging cost using default nightly rate. */
  lodging: number;
  /** Driving cost = totalMiles × IRS_MILEAGE_RATE. */
  driving: number;
  /** Lower envelope of the estimate (budget lodging, min ticket). */
  totalLow: number;
  /** Upper envelope (slope-side lodging, max ticket). */
  totalHigh: number;
  /** Convenience flags for the UI badge. */
  passCoversAll: boolean;
  /** Number of ski days totaled (sum of daysPerResort). */
  totalDays: number;
};

export type EstimateOptions = {
  /** Override default nightly lodging ($150). */
  nightlyLodging?: number;
  /** Per-resort ticket min override — keyed by slug. Falls back to the
      DB's ticket_price_adult_min when absent. */
  ticketPriceMin?: Map<string, number>;
  /** Per-resort ticket max override — keyed by slug. */
  ticketPriceMax?: Map<string, number>;
};

/**
 * Does the user own a pass that the resort honors? Case-insensitive
 * lookup — DB values are lowercase ("ikon", "epic"), but a caller
 * passing "IKON" still matches.
 */
function passCoversResort(userPasses: string[], resortPasses: string[]): boolean {
  if (userPasses.length === 0 || resortPasses.length === 0) return false;
  const owned = new Set(userPasses.map((p) => p.toLowerCase()));
  return resortPasses.some((p) => owned.has(p.toLowerCase()));
}

/**
 * Compute a rough cost breakdown for the trip.
 *
 * `resortSlugs` and `daysPerResort` must be the same length and
 * positionally aligned (slug at i has days at i). `resortPasses` maps
 * each slug to its passes list (from the resorts.passes column).
 * `userPasses` is the list of passes the user owns (may be empty).
 * `totalMiles` is the round-trip drive estimate (origin → stops → home).
 */
export function estimateTripCost(
  resortSlugs: string[],
  daysPerResort: number[],
  resortPasses: Map<string, string[]>,
  totalMiles: number,
  userPasses: string[],
  options: EstimateOptions = {},
): CostBreakdown {
  const nightlyLodging = options.nightlyLodging ?? DEFAULT_NIGHTLY_LODGING;
  const ticketMinMap = options.ticketPriceMin;
  const ticketMaxMap = options.ticketPriceMax;

  let ticketsMid = 0;
  let ticketsLow = 0;
  let ticketsHigh = 0;
  let passCoversAll = true;
  let totalDays = 0;

  for (let i = 0; i < resortSlugs.length; i++) {
    const slug = resortSlugs[i];
    const days = Math.max(0, daysPerResort[i] ?? 0);
    totalDays += days;
    if (days === 0) continue;
    const passes = resortPasses.get(slug) ?? [];
    if (passCoversResort(userPasses, passes)) {
      // Pass covers this resort — zero ticket cost for these days.
      continue;
    }
    passCoversAll = false;
    const min = ticketMinMap?.get(slug) ?? FALLBACK_TICKET_MIN;
    const max = ticketMaxMap?.get(slug) ?? FALLBACK_TICKET_MAX;
    // If only one is known, prefer it for the midpoint; the range
    // defaults pad the other side.
    const mid =
      ticketMinMap?.has(slug) && ticketMaxMap?.has(slug)
        ? (min + max) / 2
        : ticketMinMap?.has(slug)
          ? min
          : ticketMaxMap?.has(slug)
            ? max
            : DEFAULT_TICKET_PRICE;
    ticketsMid += days * mid;
    ticketsLow += days * min;
    ticketsHigh += days * max;
  }

  // No ski days at all → nothing covered (avoid the misleading "your
  // pass covers all stops" badge on an empty trip).
  if (totalDays === 0) passCoversAll = false;

  const lodging = totalDays * nightlyLodging;
  const lodgingLow = totalDays * LOW_NIGHTLY_LODGING;
  const lodgingHigh = totalDays * HIGH_NIGHTLY_LODGING;

  const safeMiles = Number.isFinite(totalMiles) && totalMiles > 0 ? totalMiles : 0;
  const driving = Math.round(safeMiles * IRS_MILEAGE_RATE);

  const totalLow = Math.round(ticketsLow + lodgingLow + driving);
  const totalHigh = Math.round(ticketsHigh + lodgingHigh + driving);

  return {
    liftTickets: Math.round(ticketsMid),
    lodging: Math.round(lodging),
    driving,
    totalLow,
    totalHigh,
    passCoversAll,
    totalDays,
  };
}

/**
 * Convert meters → US miles. Helper for callers who only have a Haversine
 * meter total (e.g. the planner panel).
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}
