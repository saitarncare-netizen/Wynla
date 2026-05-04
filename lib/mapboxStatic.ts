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
  } = opts;
  if (!token) return "";
  const cleanColor = pinColor.replace("#", "").toLowerCase();
  const overlay = `pin-l-mountain+${cleanColor}(${lng},${lat})`;
  const center = `${lng},${lat},${zoom},0,0`;
  const size = `${width}x${height}${retina ? "@2x" : ""}`;
  return `https://api.mapbox.com/styles/v1/mapbox/${style}/static/${overlay}/${center}/${size}?access_token=${token}`;
}
