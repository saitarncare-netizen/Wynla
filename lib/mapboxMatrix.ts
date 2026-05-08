// Mapbox Matrix API — fetches a single origin/destination drive time.
// Used by ResortPanel to upgrade the Haversine ESTIMATE shown for geo
// origins to a real road-network duration once the user clicks a pin.
//
// One call per click → ~30 calls per browsing session at most. Mapbox
// free tier is 100K Matrix requests/month, so we're nowhere near caps.

export type MatrixResult = {
  durationSeconds: number;
  distanceMeters: number;
};

export async function fetchMatrixDriveTime(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
  token: string,
  signal?: AbortSignal,
): Promise<MatrixResult | null> {
  const coords = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
  const url =
    `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${coords}` +
    `?annotations=duration,distance&sources=0&destinations=1` +
    `&access_token=${encodeURIComponent(token)}`;

  try {
    const r = await fetch(url, { signal });
    if (!r.ok) return null;
    const j = await r.json();
    const duration = j?.durations?.[0]?.[0];
    const distance = j?.distances?.[0]?.[0];
    if (typeof duration !== "number" || typeof distance !== "number") return null;
    return {
      durationSeconds: Math.round(duration),
      distanceMeters: Math.round(distance),
    };
  } catch {
    return null;
  }
}
