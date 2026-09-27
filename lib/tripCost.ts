// Distance unit helper for the trip pages.
//
// This file used to hold the planner's "Estimated trip cost" (lift
// tickets + lodging + IRS mileage). It was removed on 2026-09-27: ticket
// and lodging prices swing daily, so a single range was more misleading
// than useful and the founder cut it. Only the unit conversion is left,
// because the trip-template pages (app/trip-templates/[slug]) print the
// round-trip miles.

/**
 * Convert meters → US miles. Helper for callers who only have a Haversine
 * meter total (e.g. the trip-template pages).
 */
export function metersToMiles(meters: number): number {
  return meters / 1609.34;
}
