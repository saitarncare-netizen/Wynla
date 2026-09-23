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
  driveFilterLabel,
  encodeStoredOrigin,
  findOrigin,
  formatDriveTimeLabel,
  hasCachedDriveTimes,
  originByCode,
  originLabel,
  originOptionLabel,
  originShort,
  originsForPicker,
  resolveOrigin,
  resolveOriginWithFallback,
  storedToOrigin,
  originToStored,
  withEstimateMark,
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

  it("lists cached cities first in the picker, then the rest A-Z by label", () => {
    const list = originsForPicker();
    expect(list.slice(0, 4).every((o) => o.cached)).toBe(true);
    const rest = list.slice(4).map(originLabel);
    expect(rest).toEqual([...rest].sort((a, b) => a.localeCompare(b)));
    // The two Portlands sit next to each other, Maine before Oregon.
    const me = rest.indexOf("Portland, ME");
    expect(rest[me + 1]).toBe("Portland, OR");
  });

  it("labels cities with their state exactly once", () => {
    expect(originLabel(originByCode("denver"))).toBe("Denver, CO");
    expect(originLabel(originByCode("nyc"))).toBe("New York City, NY");
    // Regression: these used to render as "Portland OR, OR" / "Washington DC, DC".
    expect(originLabel(originByCode("portland"))).toBe("Portland, OR");
    expect(originLabel(originByCode("portland-me"))).toBe("Portland, ME");
    expect(originLabel(originByCode("washington-dc"))).toBe("Washington, DC");
    for (const o of ORIGINS) {
      expect(originLabel(o).split(", ").length, o.code).toBe(2);
    }
  });

  it("keeps the two Portlands apart in chips via the short label", () => {
    expect(originByCode("portland").short).toBe("Portland OR");
    expect(originByCode("portland-me").short).toBe("Portland ME");
    expect(originShort(originByCode("portland"))).toBe("Portland OR");
    expect(originShort(resolveOrigin("geo", "40", "-74"))).toBe("here");
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

  it("stores a geo origin at 2 decimals so the cookie never pins a street address", () => {
    const encoded = encodeStoredOrigin({ kind: "geo", lat: 40.123456, lon: -74.987654 });
    expect(encoded).toBe("geo:40.12,-74.99");
    expect(decodeStoredOrigin(encoded)).toEqual({ kind: "geo", lat: 40.12, lon: -74.99 });
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
    expect(withEstimateMark("2.5 h", true)).toBe("≈ 2.5 h");
    expect(withEstimateMark("2.5 h", false)).toBe("2.5 h");
    expect(formatDriveTimeLabel(9000, true)).toBe("≈ 2h 30m");
    expect(formatDriveTimeLabel(9000, false)).toBe("2h 30m");
    expect(formatDriveTimeLabel(300, true)).toBe("≈ 0h 05m");
  });

  it("marks uncached cities in the picker option label and leaves cached ones plain", () => {
    expect(originOptionLabel(originByCode("nyc"))).toBe("New York City, NY");
    expect(originOptionLabel(originByCode("boston"))).toBe("Boston, MA");
    expect(originOptionLabel(originByCode("denver"))).toBe("Denver, CO (≈ estimated)");
    const marked = originsForPicker().filter((o) => originOptionLabel(o).includes("≈"));
    expect(marked.every((o) => !o.cached)).toBe(true);
    expect(marked.length).toBe(ORIGINS.length - 4);
  });

  it("builds the drive-time filter label the From button and the chip share", () => {
    const nyc = originByCode("nyc");
    const denver = originByCode("denver");
    const here = resolveOrigin("geo", "39.74", "-104.99");
    expect(driveFilterLabel(5, nyc, false)).toBe("≤ 5h drive from NYC");
    expect(driveFilterLabel(0, nyc, false)).toBe("Any drive from NYC");
    expect(driveFilterLabel(5, denver, true)).toBe("≈ ≤ 5h drive from Denver");
    expect(driveFilterLabel(3, here, true)).toBe("≈ ≤ 3h drive from here");
    // A cached city whose rows have not loaded is still an estimate.
    expect(driveFilterLabel(5, nyc, true)).toBe("≈ ≤ 5h drive from NYC");
  });
});
