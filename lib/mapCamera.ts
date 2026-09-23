// First camera frame for the homepage map when there is no saved view.
//
// Desktop keeps the whole contiguous US: at zoom 3.6 it fits on any
// canvas 1200px or wider. On a phone that same zoom shows ~22 degrees of
// longitude centered on Kansas, so an NYC visitor's first paint had no
// Northeast on it at all. Phones start on the origin's region instead:
// a per-city bounding box for the cached drive-time origins, or a
// regional zoom around the user's own location when they have shared it.
//
// Pure functions only (no mapbox import) so this stays unit-testable.

export type LngLat = [lng: number, lat: number];
export type Bounds = [southWest: LngLat, northEast: LngLat];

export type CameraOrigin = {
  kind: "city" | "geo";
  code: string;
  lat: number;
  lon: number;
};

export type InitialCamera =
  | { kind: "view"; center: LngLat; zoom: number }
  | { kind: "bounds"; bounds: Bounds };

export const US_CENTER: LngLat = [-95, 40];
export const US_ZOOM = 3.6;

// Zoom for a "here is your region" frame around a shared location. On a
// 375px-wide phone this spans about 5.5 degrees of longitude, i.e. a
// day-trip radius, and sits above clusterMaxZoom (4) so individual
// pass-colored pins show rather than count bubbles.
export const GEO_REGION_ZOOM = 5.6;

// Boxes are sized so a portrait phone (the binding axis is longitude)
// fits them at roughly zoom 5.2-5.4: close enough to show individual pins
// with their pass colors, wide enough to include the day-trip mountains
// that city's skiers actually drive to.
export const REGION_BOUNDS_BY_ORIGIN: Record<string, Bounds> = {
  // Catskills, Poconos, Berkshires, southern Vermont / New Hampshire.
  nyc: [
    [-76.5, 39.8],
    [-70.5, 45.0],
  ],
  // Vermont, New Hampshire, western Maine.
  boston: [
    [-74.5, 41.0],
    [-68.5, 45.5],
  ],
  // Poconos, Catskills, central Pennsylvania.
  philadelphia: [
    [-79.0, 39.0],
    [-73.0, 43.5],
  ],
  // Berkshires, Catskills, southern Vermont / New Hampshire.
  hartford: [
    [-75.0, 40.5],
    [-69.5, 45.0],
  ],
};

export function initialCameraFor(
  origin: CameraOrigin,
  isDesktop: boolean,
): InitialCamera {
  if (isDesktop) return { kind: "view", center: US_CENTER, zoom: US_ZOOM };
  if (origin.kind === "geo") {
    return { kind: "view", center: [origin.lon, origin.lat], zoom: GEO_REGION_ZOOM };
  }
  const bounds = REGION_BOUNDS_BY_ORIGIN[origin.code];
  if (bounds) return { kind: "bounds", bounds };
  return { kind: "view", center: US_CENTER, zoom: US_ZOOM };
}
