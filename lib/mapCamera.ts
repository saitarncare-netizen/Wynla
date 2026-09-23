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

export type CameraPadding = { top: number; right: number; bottom: number; left: number };

export const US_CENTER: LngLat = [-95, 40];
export const US_ZOOM = 3.6;
export const US_VIEW: InitialCamera = { kind: "view", center: US_CENTER, zoom: US_ZOOM };

// Zoom for a "here is your region" frame around a shared location. On a
// 375px-wide phone this spans about 5.5 degrees of longitude, i.e. a
// day-trip radius, and sits above clusterMaxZoom (4) so individual
// pass-colored pins show rather than count bubbles.
export const GEO_REGION_ZOOM = 5.6;

// Mercator cannot represent latitudes past ~85.05; Mapbox throws on a
// center outside +/-90 and clamps the rest, so treat anything past the
// projection's edge as garbage rather than a camera.
const MAX_MERCATOR_LAT = 85.05;
// Mapbox's own zoom ceiling; the map's minZoom is 0 for us (no globe).
const MIN_ZOOM = 0;
const MAX_ZOOM = 22;

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
  if (isDesktop) return US_VIEW;
  if (origin.kind === "geo") {
    const geo: InitialCamera = {
      kind: "view",
      center: [origin.lon, origin.lat],
      zoom: GEO_REGION_ZOOM,
    };
    return isValidCamera(geo) ? geo : US_VIEW;
  }
  const bounds = REGION_BOUNDS_BY_ORIGIN[origin.code];
  if (bounds) return { kind: "bounds", bounds };
  return US_VIEW;
}

function isLngLat(p: unknown): p is LngLat {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    Number.isFinite(p[0]) &&
    Number.isFinite(p[1]) &&
    Math.abs(p[1]) <= MAX_MERCATOR_LAT
  );
}

// True when Mapbox can build a real transform from the camera: finite
// center inside the projection, finite zoom in range, and for bounds a
// proper south-west / north-east pair with positive extent. A camera that
// fails this would leave the map on a degenerate transform (NaN center or
// zoom), from which it requests no tiles and never fires `load`.
export function isValidCamera(cam: unknown): cam is InitialCamera {
  if (!cam || typeof cam !== "object") return false;
  const c = cam as Partial<{ kind: string; center: unknown; zoom: unknown; bounds: unknown }>;
  if (c.kind === "view") {
    return (
      isLngLat(c.center) &&
      typeof c.zoom === "number" &&
      Number.isFinite(c.zoom) &&
      c.zoom >= MIN_ZOOM &&
      c.zoom <= MAX_ZOOM
    );
  }
  if (c.kind === "bounds") {
    const b = c.bounds;
    if (!Array.isArray(b) || b.length !== 2) return false;
    const [sw, ne] = b as unknown[];
    if (!isLngLat(sw) || !isLngLat(ne)) return false;
    return sw[0] < ne[0] && sw[1] < ne[1];
  }
  return false;
}

// The camera actually handed to Mapbox: the candidate when it is usable,
// otherwise the static whole-US view that shipped before regional frames.
export function sanitizeInitialCamera(candidate: unknown): InitialCamera {
  return isValidCamera(candidate) ? candidate : US_VIEW;
}

// Smallest run of canvas pixels that must stay free of padding on each
// axis for a bounds fit. Mapbox refuses a fit whose padding meets or
// exceeds the canvas ("Map cannot fit within canvas with the given
// bounds, padding, and/or offset") and silently leaves the camera at
// [0, 0] zoom 0, so the first frame must never ask for that.
export const MIN_FIT_INSET_PX = 120;

// Padding for the first-frame bounds fit on phones: clear the measured
// header stack (brand row + chips + recent strip + banner can pass 200px)
// plus a little breathing room, never less than the 150px the layout was
// tuned for; leave room for the bottom pills; and a small side gutter.
// Clamped so each axis keeps MIN_FIT_INSET_PX of canvas, scaling both
// sides down together when the container is too small (landscape phones
// with browser chrome open, or a container that has not been laid out
// yet), and zero for a container with no size at all.
export function firstFramePadding(
  container: { width: number; height: number },
  headerPx: number,
): CameraPadding {
  const header = Number.isFinite(headerPx) && headerPx > 0 ? headerPx : 0;
  const wanted: CameraPadding = {
    top: Math.max(150, Math.round(header) + 12),
    bottom: 90,
    left: 20,
    right: 20,
  };
  const [top, bottom] = clampAxis(wanted.top, wanted.bottom, container.height);
  const [left, right] = clampAxis(wanted.left, wanted.right, container.width);
  return { top, right, bottom, left };
}

function clampAxis(a: number, b: number, size: number): [number, number] {
  if (!Number.isFinite(size) || size <= MIN_FIT_INSET_PX) return [0, 0];
  const room = size - MIN_FIT_INSET_PX;
  const total = a + b;
  if (total <= room) return [a, b];
  const scale = room / total;
  return [Math.floor(a * scale), Math.floor(b * scale)];
}

// True when a padding leaves Mapbox room to fit bounds on this container.
export function paddingFitsContainer(
  padding: CameraPadding,
  container: { width: number; height: number },
): boolean {
  return (
    padding.top + padding.bottom < container.height &&
    padding.left + padding.right < container.width
  );
}
