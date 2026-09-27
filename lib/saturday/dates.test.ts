import { describe, expect, it } from "vitest";
import {
  daysBetween,
  formatTargetDate,
  formatTargetDateShort,
  isThursdayIn,
  shiftIso,
  todayIso,
  upcomingWeekendDate,
  weekdayOf,
} from "./dates";

const NY = "America/New_York";

describe("upcomingWeekendDate — New York calendar", () => {
  it("picks the coming Saturday from a Thursday", () => {
    // Thu 2027-01-14 09:00 EST
    const now = new Date("2027-01-14T14:00:00Z");
    expect(upcomingWeekendDate(now, "sat", NY)).toBe("2027-01-16");
    expect(upcomingWeekendDate(now, "sun", NY)).toBe("2027-01-17");
  });

  it("keeps today on a Saturday and rolls a Sunday to next Saturday", () => {
    const sat = new Date("2027-01-16T15:00:00Z");
    expect(upcomingWeekendDate(sat, "sat", NY)).toBe("2027-01-16");
    expect(upcomingWeekendDate(sat, "sun", NY)).toBe("2027-01-17");
    const sun = new Date("2027-01-17T15:00:00Z");
    expect(upcomingWeekendDate(sun, "sat", NY)).toBe("2027-01-23");
    expect(upcomingWeekendDate(sun, "sun", NY)).toBe("2027-01-17");
  });

  it("uses the city clock, not UTC, late on a Friday night", () => {
    // 23:30 EST on Friday Jan 15 is already 04:30 UTC on Saturday Jan 16.
    const lateFriday = new Date("2027-01-16T04:30:00Z");
    expect(todayIso(lateFriday, NY)).toBe("2027-01-15");
    expect(upcomingWeekendDate(lateFriday, "sat", NY)).toBe("2027-01-16");
    // In UTC the same instant is Saturday, so the answer would differ.
    expect(upcomingWeekendDate(lateFriday, "sat", "UTC")).toBe("2027-01-16");
    expect(upcomingWeekendDate(new Date("2027-01-17T04:30:00Z"), "sat", NY)).toBe("2027-01-16");
    expect(upcomingWeekendDate(new Date("2027-01-17T04:30:00Z"), "sat", "UTC")).toBe("2027-01-23");
  });

  it("is stable across the spring-forward DST change", () => {
    // Sat 2027-03-13 → Sun 2027-03-14 (clocks jump at 2 AM local).
    const satEvening = new Date("2027-03-14T02:30:00Z"); // 21:30 EST Saturday
    expect(upcomingWeekendDate(satEvening, "sat", NY)).toBe("2027-03-13");
    expect(upcomingWeekendDate(satEvening, "sun", NY)).toBe("2027-03-14");
    const sundayNoon = new Date("2027-03-14T16:00:00Z"); // 12:00 EDT Sunday
    expect(upcomingWeekendDate(sundayNoon, "sat", NY)).toBe("2027-03-20");
    expect(weekdayOf(upcomingWeekendDate(sundayNoon, "sat", NY))).toBe(6);
  });

  it("is stable across the fall-back DST change", () => {
    // Sun 2026-11-01 clocks fall back at 2 AM local.
    const satNight = new Date("2026-11-01T05:30:00Z"); // 01:30 EDT Sunday morning
    expect(upcomingWeekendDate(satNight, "sat", NY)).toBe("2026-11-07");
    const wed = new Date("2026-11-04T18:00:00Z");
    expect(upcomingWeekendDate(wed, "sat", NY)).toBe("2026-11-07");
    expect(daysBetween(todayIso(wed, NY), upcomingWeekendDate(wed, "sat", NY))).toBe(3);
  });

  it("always returns the requested weekday", () => {
    for (let i = 0; i < 14; i++) {
      const now = new Date(Date.UTC(2027, 0, 10 + i, 17, 0));
      expect(weekdayOf(upcomingWeekendDate(now, "sat", NY))).toBe(6);
      expect(weekdayOf(upcomingWeekendDate(now, "sun", NY))).toBe(0);
      const horizon = daysBetween(todayIso(now, NY), upcomingWeekendDate(now, "sat", NY));
      expect(horizon).toBeGreaterThanOrEqual(0);
      expect(horizon).toBeLessThanOrEqual(6);
    }
  });
});

describe("date arithmetic + formatting", () => {
  it("shifts and diffs ISO dates without DST drift", () => {
    expect(shiftIso("2027-03-13", 1)).toBe("2027-03-14");
    expect(shiftIso("2027-01-16", -1)).toBe("2027-01-15");
    expect(daysBetween("2027-01-14", "2027-01-16")).toBe(2);
    expect(daysBetween("2027-01-16", "2027-01-14")).toBe(-2);
  });

  it("formats the target date", () => {
    expect(formatTargetDate("2027-01-16")).toBe("Saturday, Jan 16");
    expect(formatTargetDateShort("2027-01-16")).toBe("Sat, Jan 16");
  });

  it("knows Thursday in New York", () => {
    expect(isThursdayIn(new Date("2027-01-14T14:00:00Z"), NY)).toBe(true);
    // 23:30 EST Wednesday is 04:30 UTC Thursday — still Wednesday in NY.
    expect(isThursdayIn(new Date("2027-01-14T04:30:00Z"), NY)).toBe(false);
    expect(isThursdayIn(new Date("2027-01-15T14:00:00Z"), NY)).toBe(false);
  });
});
