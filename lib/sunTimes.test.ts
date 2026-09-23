import { describe, expect, it } from "vitest";
import {
  computeSunTimes,
  formatLocal,
  formatStampInZone,
  timeZoneForResort,
  timeZoneForState,
  zoneAbbreviation,
} from "./sunTimes";

describe("timeZoneForResort — split-state outliers from the audit", () => {
  const cases: Array<[string, string, number, number, string]> = [
    ["schweitzer", "ID", 48.37, -116.62, "America/Los_Angeles"],
    ["silver-mountain", "ID", 47.51, -116.02, "America/Los_Angeles"],
    ["snowhaven", "ID", 46.1, -115.96, "America/Los_Angeles"],
    ["brundage-mountain", "ID", 45.02, -116.16, "America/Denver"],
    ["sun-valley", "ID", 43.67, -114.35, "America/Denver"],
    ["big-powderhorn-mountain", "MI", 46.52, -90.05, "America/Chicago"],
    ["ski-brule", "MI", 46.06, -88.64, "America/Chicago"],
    ["pine-mountain", "MI", 45.83, -88.07, "America/Chicago"],
    ["porcupine-mountains", "MI", 46.76, -89.8, "America/New_York"],
    ["marquette-mountain", "MI", 46.52, -87.44, "America/New_York"],
    ["mount-bohemia", "MI", 47.38, -88.01, "America/New_York"],
    ["boyne-mountain", "MI", 45.17, -84.93, "America/New_York"],
    ["terry-peak", "SD", 44.33, -103.82, "America/Denver"],
    ["great-bear-valley", "SD", 43.58, -96.66, "America/Chicago"],
    ["ober-mountain", "TN", 35.7, -83.51, "America/New_York"],
    ["elko-snobowl", "NV", 40.76, -115.77, "America/Los_Angeles"],
    ["anthony-lakes", "OR", 44.96, -118.23, "America/Los_Angeles"],
    ["huff-hills", "ND", 46.58, -100.67, "America/Chicago"],
    ["perfect-north", "IN", 39.14, -84.94, "America/New_York"],
  ];
  it.each(cases)("%s (%s) → %s", (slug, state, lat, lng, tz) => {
    expect(timeZoneForResort({ slug, state, latitude: lat, longitude: lng })).toBe(tz);
  });

  it("uses the geographic rule when the slug is unknown", () => {
    expect(timeZoneForResort({ slug: "new-panhandle-hill", state: "ID", latitude: 47.9, longitude: -116.5 })).toBe("America/Los_Angeles");
    expect(timeZoneForResort({ slug: "new-up-hill", state: "MI", latitude: 46.45, longitude: -90.1 })).toBe("America/Chicago");
  });

  it("falls back to the state map, then undefined", () => {
    expect(timeZoneForResort({ state: "CO" })).toBe("America/Denver");
    expect(timeZoneForResort({ state: "VT", latitude: "44.5", longitude: "-72.8" })).toBe("America/New_York");
    expect(timeZoneForResort({})).toBeUndefined();
    expect(timeZoneForState("AZ")).toBe("America/Phoenix");
    expect(timeZoneForState("ZZ")).toBeUndefined();
  });
});

describe("computeSunTimes sanity", () => {
  it("Denver, Jan 15 2027: sunrise ~7:20 MST, ~9.6 h of daylight", () => {
    const s = computeSunTimes(39.74, -104.99, new Date("2027-01-15T12:00:00Z"))!;
    expect(s).not.toBeNull();
    const sunriseUtcMin = s.sunrise.getUTCHours() * 60 + s.sunrise.getUTCMinutes();
    expect(sunriseUtcMin).toBeGreaterThan(14 * 60 + 10);
    expect(sunriseUtcMin).toBeLessThan(14 * 60 + 30);
    expect(s.daylightHours).toBeGreaterThan(9.3);
    expect(s.daylightHours).toBeLessThan(9.9);
    expect(formatLocal(s.sunrise, "America/Denver")).toMatch(/^7:\d\d AM$/);
  });

  it("Schweitzer sunrise reads ~7:30 AM in Pacific, not 8:30 Mountain", () => {
    const s = computeSunTimes(48.37, -116.62, new Date("2027-01-15T12:00:00Z"))!;
    expect(formatLocal(s.sunrise, "America/Los_Angeles")).toMatch(/^7:[2-4]\d AM$/);
  });

  it("returns null in polar night", () => {
    expect(computeSunTimes(80, 0, new Date("2027-01-15T12:00:00Z"))).toBeNull();
  });
});

describe("zone stamps", () => {
  it("labels the zone", () => {
    const d = new Date("2027-01-15T12:03:00Z");
    expect(zoneAbbreviation("America/Denver", d)).toBe("MST");
    expect(zoneAbbreviation("America/New_York", new Date("2027-07-15T12:03:00Z"))).toBe("EDT");
    expect(zoneAbbreviation(undefined, d)).toBe("UTC");
    expect(formatStampInZone(d, "America/Denver")).toBe("Fri 5:03 AM MST");
    expect(formatStampInZone(d, undefined)).toBe("Fri 12:03 PM UTC");
  });
});
