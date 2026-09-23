import { describe, expect, it } from "vitest";
import { hoursBetween, localDate, localHour, parseValidTime, shiftDate, weekdayShort } from "./time";

describe("parseValidTime", () => {
  it("parses NWS ISO-8601 interval strings", () => {
    const six = parseValidTime("2026-09-22T12:00:00+00:00/PT6H");
    expect(six).toEqual({ start: Date.parse("2026-09-22T12:00:00Z"), end: Date.parse("2026-09-22T18:00:00Z") });
    const days = parseValidTime("2026-09-22T12:00:00+00:00/P3D");
    expect(days!.end - days!.start).toBe(3 * 86_400_000);
    const mixed = parseValidTime("2026-09-22T12:00:00+00:00/P7DT13H");
    expect(mixed!.end - mixed!.start).toBe((7 * 24 + 13) * 3_600_000);
    const mins = parseValidTime("2026-09-22T12:00:00+00:00/PT30M");
    expect(mins!.end - mins!.start).toBe(30 * 60_000);
  });

  it("rejects malformed input", () => {
    expect(parseValidTime("2026-09-22T12:00:00+00:00")).toBeNull();
    expect(parseValidTime("garbage/PT1H")).toBeNull();
    expect(parseValidTime("2026-09-22T12:00:00+00:00/PT0H")).toBeNull();
  });
});

describe("local dates", () => {
  it("uses the resort time zone, not UTC", () => {
    const t = new Date("2026-12-01T05:30:00Z"); // 21:30 the previous evening in Denver
    expect(localDate(t, "America/Denver")).toBe("2026-11-30");
    expect(localDate(t, "America/New_York")).toBe("2026-12-01");
    expect(localDate(t, null)).toBe("2026-12-01");
    expect(localDate(t, "Not/AZone")).toBe("2026-12-01");
    expect(localHour(t, "America/Denver")).toBe(22);
  });

  it("shifts and labels dates", () => {
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
    expect(shiftDate("2026-12-31", 1)).toBe("2027-01-01");
    expect(weekdayShort("2026-09-22")).toBe("Tue");
    expect(hoursBetween("2026-09-22T00:00:00Z", "2026-09-22T06:30:00Z")).toBe(6.5);
  });
});
