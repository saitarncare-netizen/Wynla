// Trip cost estimator — pure helpers. Adds a rough "how much will this
// trip cost?" number to the planner review screen so users can ballpark
// the spend before they commit. Three buckets, each priced at the unit
// it is actually bought in, then summed for the whole party:
//
//   1. Lift tickets — per person per ski day. If the user owns a pass
//      the resort honors, that day is free. Otherwise we use the
//      resort's ticket_price_adult_min / _max from the DB, falling back
//      to a national range when unknown.
//   2. Lodging — per room per NIGHT. Nights = ski days − 1 (a 1-day trip
//      is a day trip with no hotel; a 5-day trip sleeps 4 nights). Rooms
//      assume two people share.
//   3. Driving — per car for the round-trip miles × the IRS mileage
//      rate. One car carries up to five people.
//
// The group total is what the party pays together; perPerson* splits it
// evenly so the UI can show both. All numbers are estimates and the UI
// says so.

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
// Occupancy assumptions behind the per-room / per-car split.
const PEOPLE_PER_ROOM = 2;
const PEOPLE_PER_CAR = 5;
export const MIN_PARTY_SIZE = 1;
export const MAX_PARTY_SIZE = 8;

export type CostBreakdown = {
  /** Lift-ticket cost for the whole party across all ski days, using
      the midpoint of min/max when both are known. Zero when the user's
      pass covers every stop. */
  liftTickets: number;
  /** Lodging for the whole party: rooms × nights × default nightly rate. */
  lodging: number;
  /** Driving for the whole party: cars × round-trip miles × IRS rate. */
  driving: number;
  /** Lower envelope of the group total (budget lodging, min ticket). */
  totalLow: number;
  /** Upper envelope of the group total (slope-side lodging, max ticket). */
  totalHigh: number;
  /** Group envelope divided evenly by partySize. */
  perPersonLow: number;
  perPersonHigh: number;
  /** True when every ski day is covered by a pass the user owns. */
  passCoversAll: boolean;
  /** Number of ski days totaled (sum of daysPerResort). */
  totalDays: number;
  /** Hotel nights priced: max(0, totalDays − 1). */
  nights: number;
  /** Inputs echoed back so the UI can label the numbers honestly. */
  partySize: number;
  rooms: number;
  cars: number;
};

export type EstimateOptions = {
  /** Override default nightly lodging ($150). */
  nightlyLodging?: number;
  /** Per-resort ticket min override — keyed by slug. Falls back to the
      DB's ticket_price_adult_min when absent. */
  ticketPriceMin?: Map<string, number>;
  /** Per-resort ticket max override — keyed by slug. */
  ticketPriceMax?: Map<string, number>;
  /** How many people are travelling (drives tickets, rooms, cars).
      Clamped to 1..8; defaults to 1. */
  partySize?: number;
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

/** Clamp a requested party size into the supported range. Non-finite
    or missing input means "one person". */
export function clampPartySize(n: number | null | undefined): number {
  if (n == null || !Number.isFinite(n)) return MIN_PARTY_SIZE;
  return Math.max(MIN_PARTY_SIZE, Math.min(MAX_PARTY_SIZE, Math.round(n)));
}

/** Hotel nights for a trip of `totalDays` ski days: you sleep between
    ski days, not after the last one. A 1-day trip is a day trip. */
export function nightsForDays(totalDays: number): number {
  return Math.max(0, Math.floor(totalDays) - 1);
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
  const partySize = clampPartySize(options.partySize);
  const rooms = Math.ceil(partySize / PEOPLE_PER_ROOM);
  const cars = Math.ceil(partySize / PEOPLE_PER_CAR);

  // Per-person ticket totals first; multiplied by the party at the end.
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

  const nights = nightsForDays(totalDays);
  const lodging = rooms * nights * nightlyLodging;
  const lodgingLow = rooms * nights * LOW_NIGHTLY_LODGING;
  const lodgingHigh = rooms * nights * HIGH_NIGHTLY_LODGING;

  const safeMiles = Number.isFinite(totalMiles) && totalMiles > 0 ? totalMiles : 0;
  const driving = Math.round(cars * safeMiles * IRS_MILEAGE_RATE);

  const totalLow = Math.round(ticketsLow * partySize + lodgingLow + driving);
  const totalHigh = Math.round(ticketsHigh * partySize + lodgingHigh + driving);

  return {
    liftTickets: Math.round(ticketsMid * partySize),
    lodging: Math.round(lodging),
    driving,
    totalLow,
    totalHigh,
    perPersonLow: Math.round(totalLow / partySize),
    perPersonHigh: Math.round(totalHigh / partySize),
    passCoversAll,
    totalDays,
    nights,
    partySize,
    rooms,
    cars,
  };
}

/**
 * Convert meters → US miles. Helper for callers who only have a Haversine
 * meter total (e.g. the planner panel).
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}
