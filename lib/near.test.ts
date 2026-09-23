// /near/[city] pure helpers (content package, 2026-09-23).
//
// Pins down: the drive bands and their edge, that a cached road route
// wins over the estimate only for cached cities, that closed and
// unplaceable resorts never appear, the sort, the CTA routing between
// /go (launch cities) and the map (every other origin), and the
// nearest-city helper the state pages use.

import { describe, expect, it } from "vitest";
import { findOrigin, LAUNCH_CITIES, ORIGINS } from "@/lib/origins";
import {
  bandFor,
  buildNearRows,
  centroidOf,
  driveFor,
  formatDriveRounded,
  groupByBand,
  nearCityName,
  nearCtaFor,
  nearDescription,
  nearStaticCityCodes,
  nearestCities,
  resolveNearCity,
  type NearResortRow,
} from "@/lib/near";

const NYC = findOrigin("nyc")!;
const DENVER = findOrigin("denver")!;
const NOW = new Date("2026-09-23T12:00:00Z");

function resort(over: Partial<NearResortRow> & { id: number; name: string }): NearResortRow {
  return {
    slug: over.name.toLowerCase().replace(/\s+/g, "-"),
    state: "VT",
    latitude: 43.6,
    longitude: -72.8,
    passes: ["ikon"],
    tier: "listed",
    vertical_drop: 2000,
    ticket_price_adult_min: null,
    ticket_price_adult_max: null,
    ticket_price_currency: null,
    ticket_price_updated_at: null,
    operating_status: "active",
    season_open_text: "November 22, 2026 (projected)",
    season_close_text: "April 12, 2027",
    ...over,
  };
}

describe("bandFor", () => {
  it("bands on the hour boundaries, inclusive at the top", () => {
    expect(bandFor(0)).toBe("under-2");
    expect(bandFor(2 * 3600)).toBe("under-2");
    expect(bandFor(2 * 3600 + 1)).toBe("2-4");
    expect(bandFor(4 * 3600)).toBe("2-4");
    expect(bandFor(6 * 3600)).toBe("4-6");
    expect(bandFor(6 * 3600 + 1)).toBeNull();
  });
});

describe("driveFor", () => {
  const cached = new Map([[1, { seconds: 9000, meters: 200_000 }]]);

  it("uses the cached road route for a cached city", () => {
    const d = driveFor(NYC, resort({ id: 1, name: "Hunter" }), cached);
    expect(d).toEqual({ seconds: 9000, meters: 200_000, estimated: false });
  });

  it("estimates when the resort has no cached row", () => {
    const d = driveFor(NYC, resort({ id: 2, name: "Stratton", latitude: 43.1, longitude: -72.9 }), cached);
    expect(d?.estimated).toBe(true);
    expect(d?.seconds).toBeGreaterThan(2 * 3600);
    expect(d?.seconds).toBeLessThan(6 * 3600);
  });

  it("ignores cached rows for a city without cached routes", () => {
    // Denver has no drive_time_cache rows; a stray row must not be trusted.
    const d = driveFor(DENVER, resort({ id: 1, name: "Loveland", latitude: 39.68, longitude: -105.9 }), cached);
    expect(d?.estimated).toBe(true);
  });

  it("returns null when the resort cannot be placed", () => {
    expect(driveFor(NYC, resort({ id: 3, name: "Nowhere", latitude: null }), cached)).toBeNull();
  });
});

describe("buildNearRows", () => {
  const cached = new Map<number, { seconds: number; meters: number | null }>();

  it("keeps resorts inside 6 h, sorts by drive, drops closed and unplaceable", () => {
    const rows = buildNearRows(
      NYC,
      [
        resort({ id: 1, name: "Far", latitude: 44.5, longitude: -73.2 }), // Burlington-ish, ~5-6 h
        resort({ id: 2, name: "Near", latitude: 41.2, longitude: -74.2 }), // ~1 h
        resort({ id: 3, name: "Closed", operating_status: "closed", latitude: 41.2, longitude: -74.2 }),
        resort({ id: 4, name: "Lost", latitude: null, longitude: null }),
        resort({ id: 5, name: "Utah", latitude: 40.6, longitude: -111.6 }),
      ],
      cached,
      new Map(),
      NOW,
    );
    expect(rows.map((r) => r.name)).toEqual(["Near", "Far"]);
    expect(rows[0].band).toBe("under-2");
    expect(rows[0].drive.estimated).toBe(true);
  });

  it("carries the projected flag and hides snow for a dormant resort", () => {
    const rows = buildNearRows(
      NYC,
      [resort({ id: 2, name: "Near", latitude: 41.2, longitude: -74.2 })],
      cached,
      new Map([[2, { inches: 4, validEnd: "2026-09-23T12:00:00Z" }]]),
      NOW,
    );
    expect(rows[0].openProjected).toBe(true);
    expect(rows[0].status.kind).toBe("opens");
    expect(rows[0].snow24h).toBeNull();
  });

  it("shows measured snow only when the resort is running", () => {
    const rows = buildNearRows(
      NYC,
      [
        resort({
          id: 2,
          name: "Near",
          latitude: 41.2,
          longitude: -74.2,
          currently_open: true,
          snow_report_status: "reported",
          snow_report_updated_at: "2026-09-23T10:00:00Z",
        }),
      ],
      cached,
      new Map([[2, { inches: 4, validEnd: "2026-09-23T12:00:00Z" }]]),
      NOW,
    );
    expect(rows[0].status.kind).toBe("open");
    expect(rows[0].snow24h).toEqual({ inches: 4, validEnd: "2026-09-23T12:00:00Z" });
  });

  it("only exposes a ticket price when the minimum is a positive number", () => {
    const rows = buildNearRows(
      NYC,
      [
        resort({ id: 2, name: "Priced", latitude: 41.2, longitude: -74.2, ticket_price_adult_min: 89, ticket_price_adult_max: 129 }),
        resort({ id: 3, name: "Zero", latitude: 41.3, longitude: -74.2, ticket_price_adult_min: 0 }),
      ],
      cached,
      new Map(),
      NOW,
    );
    expect(rows.find((r) => r.name === "Priced")?.ticket).toEqual({ minUsd: 89, maxUsd: 129, updatedAt: null });
    expect(rows.find((r) => r.name === "Zero")?.ticket).toBeNull();
  });

  it("groups into bands and drops empty bands", () => {
    const rows = buildNearRows(
      NYC,
      [
        resort({ id: 1, name: "Far", latitude: 44.5, longitude: -73.2 }),
        resort({ id: 2, name: "Near", latitude: 41.2, longitude: -74.2 }),
      ],
      cached,
      new Map(),
      NOW,
    );
    const groups = groupByBand(rows);
    expect(groups.map((g) => g.key)).toEqual(["under-2", "4-6"]);
  });
});

describe("cities and paths", () => {
  it("resolves every origin code and rejects unknown slugs", () => {
    for (const o of ORIGINS) expect(resolveNearCity(o.code)?.code).toBe(o.code);
    expect(resolveNearCity("NYC")?.code).toBe("nyc");
    expect(resolveNearCity("atlantis")).toBeNull();
    expect(resolveNearCity(null)).toBeNull();
  });

  it("pre-renders exactly the launch cities", () => {
    expect(nearStaticCityCodes()).toEqual(LAUNCH_CITIES.map((c) => c.code));
  });

  it("sends launch cities to /go and the rest to the map", () => {
    expect(nearCtaFor(NYC)).toMatchObject({ href: "/go?city=nyc", isGo: true });
    expect(nearCtaFor(DENVER)).toMatchObject({ href: "/?from=denver", isGo: false });
  });

  it("names the two Portlands by state and NYC in full", () => {
    expect(nearCityName(NYC)).toBe("New York City");
    expect(nearCityName(findOrigin("portland")!)).toBe("Portland, OR");
    expect(nearCityName(findOrigin("portland-me")!)).toBe("Portland, ME");
    expect(nearCityName(findOrigin("washington-dc")!)).toBe("Washington DC");
    expect(nearCityName(DENVER)).toBe("Denver");
  });

  it("says whether the drive times are road routes or estimates", () => {
    expect(nearDescription(NYC, 40)).toContain("road drive times");
    expect(nearDescription(DENVER, 12)).toContain("estimated drive times");
    expect(nearDescription(DENVER, 1)).toContain("1 ski resort within");
  });
});

describe("nearestCities", () => {
  it("puts launch cities first inside the radius, nearest first", () => {
    // Killington, VT: Hartford / Boston / NYC are launch cities within
    // 6 h; Albany and Burlington are closer but not launch cities.
    const near = nearestCities(43.6, -72.8, 3);
    expect(near.every((c) => c.isLaunch)).toBe(true);
    expect(near.map((c) => c.city.code).sort()).toEqual(["boston", "hartford", "nyc"]);
    expect(near.map((c) => c.seconds)).toEqual([...near.map((c) => c.seconds)].sort((a, b) => a - b));
    expect(near.every((c) => c.seconds <= 6 * 3600)).toBe(true);
  });

  it("returns nothing when no origin is inside the radius", () => {
    // Anchorage: no origin within 6 h, and Seattle at ≈28 h is not a
    // drive anyone plans, so no link and no FAQ claim.
    expect(nearestCities(61.2, -149.9, 3)).toEqual([]);
    // Juneau has no road connection at all; the same guard covers it.
    expect(nearestCities(58.3, -134.4, 1, 12)).toEqual([]);
  });

  it("honours a wider radius for the resort FAQ", () => {
    // Eastern Montana plains (Glendive): outside 6 h of every origin but
    // ≈10 h from Denver, so the FAQ can still name a city at 12 h.
    expect(nearestCities(47.1, -104.7, 1)).toEqual([]);
    // Launch-first ordering picks Minneapolis (≈11 h) for the state
    // links; the FAQ asks for the truly nearest city and gets Denver.
    expect(nearestCities(47.1, -104.7, 1, 12)[0].city.code).toBe("minneapolis");
    const wide = nearestCities(47.1, -104.7, 1, 12, false);
    expect(wide).toHaveLength(1);
    expect(wide[0].city.code).toBe("denver");
    expect(wide[0].seconds).toBeLessThanOrEqual(12 * 3600);
  });
});

describe("centroidOf / formatDriveRounded", () => {
  it("averages the coordinates that parse", () => {
    expect(centroidOf([{ latitude: "40", longitude: "-100" }, { latitude: 42, longitude: -102 }, { latitude: null, longitude: 1 }])).toEqual({ lat: 41, lon: -101 });
    expect(centroidOf([])).toBeNull();
  });

  it("rounds to five minutes", () => {
    expect(formatDriveRounded(50 * 60)).toBe("50 min");
    expect(formatDriveRounded(3600 + 7 * 60)).toBe("1 h 05 min");
    expect(formatDriveRounded(2 * 3600 + 2 * 60)).toBe("2 h");
  });
});
