// Origin resolution + estimate labelling (Round 2 filters package).
//
// Pins down the precedence the map and /compare share (URL, then the
// stored choice, then NYC), the cookie encoding both sides use, and the
// invariant that only the four cached Northeast cities may show a drive
// time without the "≈" estimate mark.

import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORIGIN,
  ORIGINS,
  decodeStoredOrigin,
  encodeStoredOrigin,
  findOrigin,
  formatDriveTimeLabel,
  hasCachedDriveTimes,
  originByCode,
  originLabel,
  originsForPicker,
  resolveOrigin,
  resolveOriginWithFallback,
  storedToOrigin,
  originToStored,
} from "@/lib/origins";

describe("ORIGINS catalog", () => {
  it("keeps the four cached cities with the exact drive_time_cache keys", () => {
    const cached = ORIGINS.filter((o) => o.cached).map((o) => o.name);
    expect(cached).toEqual(["NYC", "Boston", "Philadelphia", "Hartford"]);
  });

  it("has unique codes and finite coordinates inside the US", () => {
    const codes = new Set(ORIGINS.map((o) => o.code));
    expect(codes.size).toBe(ORIGINS.length);
    for (const o of ORIGINS) {
      expect(o.lat).toBeGreaterThan(24);
      expect(o.lat).toBeLessThan(50);
      expect(o.lon).toBeGreaterThan(-125);
      expect(o.lon).toBeLessThan(-66);
    }
  });

  it("includes the cities the round asked for", () => {
    for (const code of [
      "washington-dc",
      "chicago",
      "minneapolis",
      "detroit",
      "denver",
      "salt-lake-city",
      "seattle",
      "portland",
      "los-angeles",
      "san-francisco",
      "boise",
      "reno",
      "spokane",
      "boston",
    ]) {
      expect(findOrigin(code), code).not.toBeNull();
    }
  });

  it("lists cached cities first in the picker, then the rest A-Z", () => {
    const list = originsForPicker();
    expect(list.slice(0, 4).every((o) => o.cached)).toBe(true);
    const rest = list.slice(4).map((o) => o.name);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
  });

  it("labels cities with their state", () => {
    expect(originLabel(originByCode("denver"))).toBe("Denver, CO");
    expect(originLabel(originByCode("nyc"))).toBe("New York City, NY");
  });
});

describe("resolveOrigin (URL only)", () => {
  it("falls back to NYC for unknown codes", () => {
    expect(resolveOrigin(null, null, null)).toBe(DEFAULT_ORIGIN);
    expect(resolveOrigin("atlantis", null, null)).toBe(DEFAULT_ORIGIN);
  });

  it("returns a geo origin for valid coordinates and NYC for bad ones", () => {
    const geo = resolveOrigin("geo", "39.74", "-104.99");
    expect(geo.kind).toBe("geo");
    expect(geo.lat).toBeCloseTo(39.74);
    expect(resolveOrigin("geo", "abc", "-104.99")).toBe(DEFAULT_ORIGIN);
    expect(resolveOrigin("geo", "95", "-104.99")).toBe(DEFAULT_ORIGIN);
  });
});

describe("resolveOriginWithFallback", () => {
  it("lets the URL win over the stored choice", () => {
    const o = resolveOriginWithFallback("boston", null, null, { kind: "city", code: "denver" });
    expect(o.code).toBe("boston");
  });

  it("uses the stored city when the URL has no origin", () => {
    const o = resolveOriginWithFallback(null, null, null, { kind: "city", code: "denver" });
    expect(o.code).toBe("denver");
  });

  it("uses a stored geo origin, including its coordinates", () => {
    const o = resolveOriginWithFallback(null, null, null, { kind: "geo", lat: 44.5, lon: -72.8 });
    expect(o.kind).toBe("geo");
    expect(o.lat).toBe(44.5);
    expect(o.lon).toBe(-72.8);
  });

  it("treats an unknown URL code as absent so the stored choice still applies", () => {
    const o = resolveOriginWithFallback("atlantis", null, null, { kind: "city", code: "seattle" });
    expect(o.code).toBe("seattle");
  });

  it("treats geo with bad coordinates as absent", () => {
    const o = resolveOriginWithFallback("geo", "x", "y", { kind: "city", code: "reno" });
    expect(o.code).toBe("reno");
  });

  it("ends on NYC when nothing is usable", () => {
    expect(resolveOriginWithFallback(null, null, null, null)).toBe(DEFAULT_ORIGIN);
    expect(resolveOriginWithFallback(null, null, null, { kind: "city", code: "nope" })).toBe(
      DEFAULT_ORIGIN,
    );
  });
});

describe("stored origin encoding", () => {
  it("round-trips a city", () => {
    const stored = { kind: "city", code: "salt-lake-city" } as const;
    expect(encodeStoredOrigin(stored)).toBe("city:salt-lake-city");
    expect(decodeStoredOrigin("city:salt-lake-city")).toEqual(stored);
  });

  it("round-trips a geo origin at 5 decimals", () => {
    const encoded = encodeStoredOrigin({ kind: "geo", lat: 40.123456, lon: -74.987654 });
    expect(encoded).toBe("geo:40.12346,-74.98765");
    expect(decodeStoredOrigin(encoded)).toEqual({ kind: "geo", lat: 40.12346, lon: -74.98765 });
  });

  it("rejects garbage, unknown cities and out-of-range coordinates", () => {
    expect(decodeStoredOrigin(null)).toBeNull();
    expect(decodeStoredOrigin("")).toBeNull();
    expect(decodeStoredOrigin("nyc")).toBeNull();
    expect(decodeStoredOrigin("city:atlantis")).toBeNull();
    expect(decodeStoredOrigin("geo:200,0")).toBeNull();
    expect(decodeStoredOrigin("geo:abc")).toBeNull();
  });

  it("converts between Origin and StoredOrigin", () => {
    const denver = originByCode("denver");
    expect(originToStored(denver)).toEqual({ kind: "city", code: "denver" });
    expect(storedToOrigin({ kind: "city", code: "denver" })).toBe(denver);
    expect(storedToOrigin({ kind: "geo", lat: 1, lon: 2 })?.kind).toBe("geo");
    expect(storedToOrigin(null)).toBeNull();
  });
});

describe("estimate labelling", () => {
  it("only the cached Northeast cities count as measured", () => {
    expect(hasCachedDriveTimes(originByCode("nyc"))).toBe(true);
    expect(hasCachedDriveTimes(originByCode("hartford"))).toBe(true);
    expect(hasCachedDriveTimes(originByCode("denver"))).toBe(false);
    expect(hasCachedDriveTimes(resolveOrigin("geo", "40", "-74"))).toBe(false);
  });

  it("prefixes estimates with ≈ and leaves cached routes bare", () => {
    expect(formatDriveTimeLabel(9000, true)).toBe("≈ 2h 30m");
    expect(formatDriveTimeLabel(9000, false)).toBe("2h 30m");
    expect(formatDriveTimeLabel(300, true)).toBe("≈ 0h 05m");
  });
});
