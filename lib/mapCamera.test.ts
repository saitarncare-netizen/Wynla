import { describe, expect, it } from "vitest";
import {
  GEO_REGION_ZOOM,
  REGION_BOUNDS_BY_ORIGIN,
  US_CENTER,
  US_ZOOM,
  initialCameraFor,
} from "./mapCamera";

const nyc = { kind: "city" as const, code: "nyc", lat: 40.7128, lon: -74.006 };

describe("initialCameraFor", () => {
  it("keeps the whole-US view on desktop regardless of origin", () => {
    expect(initialCameraFor(nyc, true)).toEqual({
      kind: "view",
      center: US_CENTER,
      zoom: US_ZOOM,
    });
  });

  it("frames a known city's region on phones", () => {
    const cam = initialCameraFor(nyc, false);
    expect(cam).toEqual({ kind: "bounds", bounds: REGION_BOUNDS_BY_ORIGIN.nyc });
    if (cam.kind !== "bounds") throw new Error("expected bounds");
    // NYC itself and the Catskills / southern Vermont must be inside.
    const [[w, s], [e, n]] = cam.bounds;
    for (const [lng, lat] of [
      [-74.006, 40.7128], // NYC
      [-74.3, 42.2], // Catskills
      [-72.8, 43.6], // Killington
    ]) {
      expect(lng).toBeGreaterThan(w);
      expect(lng).toBeLessThan(e);
      expect(lat).toBeGreaterThan(s);
      expect(lat).toBeLessThan(n);
    }
  });

  it("centers on the user's location at a regional zoom for geo origins", () => {
    const geo = { kind: "geo" as const, code: "geo", lat: 39.74, lon: -104.99 };
    expect(initialCameraFor(geo, false)).toEqual({
      kind: "view",
      center: [-104.99, 39.74],
      zoom: GEO_REGION_ZOOM,
    });
  });

  it("falls back to the whole-US view for an unknown city code", () => {
    const unknown = { kind: "city" as const, code: "denver", lat: 39.74, lon: -104.99 };
    expect(initialCameraFor(unknown, false)).toEqual({
      kind: "view",
      center: US_CENTER,
      zoom: US_ZOOM,
    });
  });

  it("every region box is a proper south-west / north-east pair", () => {
    for (const [[w, s], [e, n]] of Object.values(REGION_BOUNDS_BY_ORIGIN)) {
      expect(w).toBeLessThan(e);
      expect(s).toBeLessThan(n);
    }
  });
});
