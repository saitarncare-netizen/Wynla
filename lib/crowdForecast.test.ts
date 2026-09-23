import { describe, expect, it } from "vitest";
import {
  calendarParts,
  crowdForecast,
  holidayWindows,
  peakHolidayFor,
  upcomingSaturday,
} from "./crowdForecast";

const iso = (t: number) => new Date(t).toISOString().slice(0, 10);

describe("holiday calendar — 2026-27 season", () => {
  const w = Object.fromEntries(holidayWindows(2026).map((h) => [h.key, h]));

  it("Thanksgiving Wed Nov 25 – Sun Nov 29 2026", () => {
    expect(iso(w.thanksgiving.start)).toBe("2026-11-25");
    expect(iso(w.thanksgiving.end)).toBe("2026-11-29");
  });
  it("Christmas break Sat Dec 19 2026 – Sun Jan 3 2027", () => {
    expect(iso(w.christmas.start)).toBe("2026-12-19");
    expect(iso(w.christmas.end)).toBe("2027-01-03");
  });
  it("MLK Fri Jan 15 – Mon Jan 18 2027", () => {
    expect(iso(w.mlk.start)).toBe("2027-01-15");
    expect(iso(w.mlk.end)).toBe("2027-01-18");
  });
  it("Presidents' Fri Feb 12 – Sun Feb 21 2027, including the Saturday", () => {
    expect(iso(w.presidents.start)).toBe("2027-02-12");
    expect(iso(w.presidents.end)).toBe("2027-02-21");
    expect(peakHolidayFor(2027, 1, 13)?.key).toBe("presidents");
    expect(peakHolidayFor(2027, 1, 15)?.key).toBe("presidents");
    expect(peakHolidayFor(2027, 1, 22)).toBeNull();
  });
  it("catches the days the old day-of-month windows missed", () => {
    expect(peakHolidayFor(2026, 11, 19)?.key).toBe("christmas");
    expect(peakHolidayFor(2027, 0, 3)?.key).toBe("christmas");
    expect(peakHolidayFor(2027, 0, 4)).toBeNull();
    expect(peakHolidayFor(2026, 10, 24)).toBeNull();
    expect(peakHolidayFor(2026, 10, 26)?.key).toBe("thanksgiving");
  });
  it("rolls into later seasons without edits", () => {
    const w28 = Object.fromEntries(holidayWindows(2027).map((h) => [h.key, h]));
    expect(iso(w28.thanksgiving.start)).toBe("2027-11-24");
    expect(iso(w28.presidents.start)).toBe("2028-02-18");
    expect(iso(w28.presidents.end)).toBe("2028-02-27");
    expect(iso(w28.christmas.start)).toBe("2027-12-18");
    expect(iso(w28.christmas.end)).toBe("2028-01-02");
  });
});

describe("time-zone aware calendar", () => {
  it("reads Friday night in Denver as Friday, not UTC Saturday", () => {
    const fridayNightDenver = new Date("2027-01-16T05:30:00Z");
    expect(calendarParts(fridayNightDenver, "America/Denver").weekday).toBe(5);
    expect(calendarParts(fridayNightDenver, undefined).weekday).toBe(6);
  });
  it("upcomingSaturday uses the resort calendar", () => {
    const fridayNightDenver = new Date("2027-01-16T05:30:00Z");
    expect(upcomingSaturday(fridayNightDenver, "America/Denver").toISOString().slice(0, 10)).toBe("2027-01-16");
    expect(upcomingSaturday(fridayNightDenver, "UTC").toISOString().slice(0, 10)).toBe("2027-01-23");
  });
});

describe("crowdForecast", () => {
  const saturday = new Date("2027-01-23T18:00:00Z");

  it("does not treat Burlington VT as a major city", () => {
    const madRiver = crowdForecast({ latitude: 44.0, longitude: -72.7, state: "VT" }, saturday);
    expect(madRiver.reasons).not.toContain("close to a major city");
    expect(madRiver.level).not.toBe("packed");
  });

  it("still sees Denver day-trip pressure", () => {
    const loveland = crowdForecast({ latitude: 39.68, longitude: -105.9, state: "CO", tier: "featured", vertical_drop: 2210 }, saturday);
    expect(loveland.reasons).toContain("close to a major city");
    expect(loveland.level).toBe("packed");
  });

  it("names the holiday in the reasons", () => {
    const presidentsSat = new Date("2027-02-13T18:00:00Z");
    const r = crowdForecast({ latitude: 44.0, longitude: -72.7, state: "VT" }, presidentsSat);
    expect(r.holiday).toBe("Presidents' Day week");
    expect(r.reasons).toContain("Presidents' Day week");
  });

  it("scores a midweek non-holiday quietly", () => {
    const tuesday = new Date("2027-01-26T18:00:00Z");
    const r = crowdForecast({ latitude: 44.0, longitude: -72.7, state: "VT" }, tuesday);
    expect(r.reasons).toContain("midweek");
    expect(r.level).toBe("quiet");
  });
});
