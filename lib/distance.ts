// Haversine + drive-time estimator. Used both for live geolocation
// origins (no cached row in drive_time_cache) and for the trip planner's
// per-leg estimates. The panel + ResortPanel both upgrade to a Mapbox
// Matrix exact value once the user is on a specific pin.
//
// Tuning: 1.3 × Haversine + 55 mph over-estimated cross-country routes
// by ~10h (NYC→Rockies came out at 39h vs ~28h real). Lowering the
// factor to 1.2 and bumping the average speed to 60 mph keeps short
// East-Coast drives within ~10% of Mapbox while making far Western
// resorts feel reachable instead of impossible.

const EARTH_RADIUS_METERS = 6_371_000;
const METERS_PER_MILE = 1609.34;
const HIGHWAY_FACTOR = 1.2;
const AVG_MPH = 60;

export function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

export function estimateDriveSeconds(greatCircleMeters: number): number {
  const driveMeters = greatCircleMeters * HIGHWAY_FACTOR;
  const driveMiles = driveMeters / METERS_PER_MILE;
  const hours = driveMiles / AVG_MPH;
  return Math.round(hours * 3600);
}

export function estimateDriveMeters(greatCircleMeters: number): number {
  return Math.round(greatCircleMeters * HIGHWAY_FACTOR);
}
