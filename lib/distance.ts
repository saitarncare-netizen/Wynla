// Haversine + drive-time estimator for the geolocation feature.
// We keep a cached drive_time_cache for the 4 fixed origins (NYC/Boston/
// Philly/Hartford). When the origin is the user's actual location, we
// compute great-circle distance and estimate drive time on-the-fly:
//   driveMeters ≈ greatCircleMeters × 1.3
//   driveSeconds = (driveMeters / METERS_PER_MILE) / AVG_MPH × 3600
//
// 1.3 is a typical "circuity factor" for US road networks; 55 mph splits
// the difference between 65 mph highway and 35 mph local. The estimate
// is good enough for filtering ("≤ 5h trips"); the panel upgrades to a
// Mapbox Matrix exact value on click (see lib/mapboxMatrix.ts).

const EARTH_RADIUS_METERS = 6_371_000;
const METERS_PER_MILE = 1609.34;
const HIGHWAY_FACTOR = 1.3;
const AVG_MPH = 55;

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
