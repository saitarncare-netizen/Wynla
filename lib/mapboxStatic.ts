// Build a Mapbox Static Images API URL — used as resort detail page hero.
// https://docs.mapbox.com/api/maps/static-images/
//
// Mapbox Static Images is a public-token-friendly endpoint and counts toward
// the same 50K/month free tier as Mapbox GL tiles.

type StaticMapOptions = {
  lng: number;
  lat: number;
  zoom?: number;
  width?: number;
  height?: number;
  pinColor?: string;     // hex without leading #
  retina?: boolean;
  style?: string;        // mapbox style URL slug, e.g. "outdoors-v12"
  token?: string;
  showPin?: boolean;     // suppress the pin overlay (used for hero satellite)
};

export function staticMapUrl(opts: StaticMapOptions): string {
  const {
    lng,
    lat,
    zoom = 9,
    width = 1600,
    height = 540,
    pinColor = "1E2952",
    retina = true,
    style = "outdoors-v12",
    token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
    showPin = true,
  } = opts;
  if (!token) return "";
  const cleanColor = pinColor.replace("#", "").toLowerCase();
  const overlay = showPin
    ? `pin-l-mountain+${cleanColor}(${lng},${lat})`
    : "";
  const center = `${lng},${lat},${zoom},0,0`;
  const size = `${width}x${height}${retina ? "@2x" : ""}`;
  // Path segment is `/static/<overlay>/<center>` when there's an overlay,
  // `/static/<center>` (no leading overlay segment) when there isn't.
  const path = overlay ? `${overlay}/${center}` : center;
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${path}/${size}?access_token=${token}`;
}

// Aerial satellite hero for resorts without a real photo. Closer zoom (13)
// shows the actual mountain terrain — looks meaningful, isn't pretending to
// be a curated photo. Used by ResortPanel + detail page when hero_image_url
// is NULL. Mapbox token covers commercial use.
//
// Mapbox Static Images caps a single image at 1280×1280 (with @2x doubling
// internally), so we keep dimensions ≤ 1280 even when the caller asks
// bigger.
export function satelliteHeroUrl(opts: { lng: number; lat: number; width?: number; height?: number }): string {
  const width = Math.min(opts.width ?? 1200, 1280);
  const height = Math.min(opts.height ?? 540, 1280);
  return staticMapUrl({
    lng: opts.lng,
    lat: opts.lat,
    zoom: 13,
    width,
    height,
    style: "satellite-streets-v12",
    showPin: false,
    retina: false,
  });
}
