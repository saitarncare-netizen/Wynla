import { describe, expect, it } from "vitest";
import {
  GEO_REGION_ZOOM,
  MIN_FIT_INSET_PX,
  REGION_BOUNDS_BY_ORIGIN,
  US_CENTER,
  US_VIEW,
  US_ZOOM,
  firstFramePadding,
  initialCameraFor,
  isValidCamera,
  paddingFitsContainer,
  sanitizeInitialCamera,
} from "./mapCamera";

const nyc = { kind: "city" as const, code: "nyc", lat: 40.7128, lon: -74.006 };

// A 2560x1271 desktop viewport (the size the preview was tested at) and a
// portrait phone, both with the measured header height MapPage publishes.
const DESKTOP = { width: 2560, height: 1271 };
const PHONE = { width: 375, height: 667 };

describe("initialCameraFor", () => {
  it("keeps the whole-US view on desktop regardless of origin", () => {
    expect(initialCameraFor(nyc, true)).toEqual({
      kind: "view",
      center: US_CENTER,
      zoom: US_ZOOM,
    });
  });

  it("desktop 2560x1271 with the default nyc origin gets a finite, valid camera", () => {
    const cam = initialCameraFor(nyc, true);
    expect(isValidCamera(cam)).toBe(true);
    if (cam.kind !== "view") throw new Error("expected view");
    expect(Number.isFinite(cam.center[0])).toBe(true);
    expect(Number.isFinite(cam.center[1])).toBe(true);
    expect(Number.isFinite(cam.zoom)).toBe(true);
    expect(cam.zoom).toBeGreaterThan(0);
    // The camera Mapbox gets is exactly the candidate, not the fallback.
    expect(sanitizeInitialCamera(cam)).toBe(cam);
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

  it("falls back to the whole-US view for a geo origin with garbage coordinates", () => {
    const bad = { kind: "geo" as const, code: "geo", lat: Number.NaN, lon: -104.99 };
    expect(initialCameraFor(bad, false)).toEqual(US_VIEW);
    const polar = { kind: "geo" as const, code: "geo", lat: 89.9, lon: 10 };
    expect(initialCameraFor(polar, false)).toEqual(US_VIEW);
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

  it("every region box and the US view pass camera validation", () => {
    expect(isValidCamera(US_VIEW)).toBe(true);
    for (const bounds of Object.values(REGION_BOUNDS_BY_ORIGIN)) {
      expect(isValidCamera({ kind: "bounds", bounds })).toBe(true);
    }
  });
});

describe("isValidCamera / sanitizeInitialCamera", () => {
  it("rejects NaN, out-of-range and malformed cameras", () => {
    expect(isValidCamera({ kind: "view", center: [Number.NaN, 40], zoom: 3 })).toBe(false);
    expect(isValidCamera({ kind: "view", center: [-95, 40], zoom: Number.POSITIVE_INFINITY })).toBe(
      false,
    );
    expect(isValidCamera({ kind: "view", center: [-95, 40], zoom: -1 })).toBe(false);
    expect(isValidCamera({ kind: "view", center: [-95, 40], zoom: 23 })).toBe(false);
    expect(isValidCamera({ kind: "view", center: [-95, 91], zoom: 3 })).toBe(false);
    expect(isValidCamera({ kind: "view", center: [-95], zoom: 3 })).toBe(false);
    // Inverted or collapsed bounds.
    expect(
      isValidCamera({
        kind: "bounds",
        bounds: [
          [-70, 45],
          [-76, 40],
        ],
      }),
    ).toBe(false);
    expect(
      isValidCamera({
        kind: "bounds",
        bounds: [
          [-74, 40],
          [-74, 40],
        ],
      }),
    ).toBe(false);
    expect(isValidCamera(null)).toBe(false);
    expect(isValidCamera({ kind: "orbit" })).toBe(false);
  });

  it("accepts a saved session view and rejects a corrupt one", () => {
    const saved = { kind: "view", center: [-73.9, 41.2], zoom: 7.25 };
    expect(sanitizeInitialCamera(saved)).toBe(saved);
    expect(sanitizeInitialCamera({ kind: "view", center: [-73.9, 41.2], zoom: "7" })).toEqual(
      US_VIEW,
    );
    expect(sanitizeInitialCamera(undefined)).toEqual(US_VIEW);
  });
});

describe("firstFramePadding", () => {
  it("is far smaller than a 2560x1271 desktop canvas", () => {
    const pad = firstFramePadding(DESKTOP, 145);
    expect(pad).toEqual({ top: 157, right: 20, bottom: 90, left: 20 });
    expect(paddingFitsContainer(pad, DESKTOP)).toBe(true);
    expect(pad.top + pad.bottom).toBeLessThan(DESKTOP.height / 2);
  });

  it("clears a tall phone header while leaving most of a portrait canvas", () => {
    const pad = firstFramePadding(PHONE, 210);
    expect(pad.top).toBe(222);
    expect(paddingFitsContainer(pad, PHONE)).toBe(true);
    expect(PHONE.height - pad.top - pad.bottom).toBeGreaterThanOrEqual(MIN_FIT_INSET_PX);
  });

  it("never asks for less than the 150px the layout was tuned for", () => {
    expect(firstFramePadding(PHONE, 0).top).toBe(150);
    expect(firstFramePadding(PHONE, Number.NaN).top).toBe(150);
    expect(firstFramePadding(PHONE, 60).top).toBe(150);
  });

  it("scales both vertical sides down on a short landscape phone", () => {
    const landscape = { width: 740, height: 320 };
    const pad = firstFramePadding(landscape, 220);
    // Wanted 232 + 90 = 322px on a 320px canvas: Mapbox would refuse.
    expect(pad.top + pad.bottom).toBeLessThanOrEqual(landscape.height - MIN_FIT_INSET_PX);
    expect(pad.top).toBeGreaterThan(pad.bottom);
    expect(paddingFitsContainer(pad, landscape)).toBe(true);
  });

  it("is zero for a container that has no layout yet", () => {
    expect(firstFramePadding({ width: 0, height: 0 }, 145)).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
    expect(firstFramePadding({ width: Number.NaN, height: Number.NaN }, 145)).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });
});
