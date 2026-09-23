import { describe, expect, it } from "vitest";
import {
  decideDigest,
  evaluateAlert,
  formatResortLocalTime,
  isReportFresh,
  isResortOperating,
  isSameLocalDay,
  snowSourceForStatus,
  statusLabel,
  surfaceLabelForCode,
} from "@/lib/alertRules";

const NOW = new Date("2026-12-15T12:30:00Z"); // 05:30 in Denver

function hoursAgo(h: number): string {
  return new Date(NOW.getTime() - h * 36e5).toISOString();
}

describe("isResortOperating / labels", () => {
  it("treats only open and limited as operating", () => {
    expect(isResortOperating("open")).toBe(true);
    expect(isResortOperating("limited")).toBe(true);
    for (const s of ["closed", "off-season", "unknown", null, undefined]) {
      expect(isResortOperating(s)).toBe(false);
    }
  });

  it("labels the Open-Meteo fallback as estimated and parsed reports as reported", () => {
    expect(snowSourceForStatus("unknown")).toBe("Estimated");
    expect(snowSourceForStatus(null)).toBe("Estimated");
    expect(snowSourceForStatus("open")).toBe("Reported");
    expect(snowSourceForStatus("closed")).toBe("Reported");
  });

  it("maps status codes to friendly copy without leaking raw values", () => {
    expect(statusLabel("off-season")).toBe("Off-season");
    expect(statusLabel("unknown")).toBe("Status unknown");
    expect(statusLabel(null)).toBe("Status unknown");
  });

  it("resolves surface codes case-insensitively", () => {
    expect(surfaceLabelForCode("ppc")).toBe("Packed Powder");
    expect(surfaceLabelForCode("XX")).toBeNull();
    expect(surfaceLabelForCode(null)).toBeNull();
  });
});

describe("isReportFresh", () => {
  it("accepts reports inside 36 h and rejects older, missing or future ones", () => {
    expect(isReportFresh(hoursAgo(1), NOW)).toBe(true);
    expect(isReportFresh(hoursAgo(35), NOW)).toBe(true);
    expect(isReportFresh(hoursAgo(37), NOW)).toBe(false);
    expect(isReportFresh(null, NOW)).toBe(false);
    expect(isReportFresh("not a date", NOW)).toBe(false);
    expect(isReportFresh(hoursAgo(-2), NOW)).toBe(false);
  });
});

describe("local day helpers", () => {
  it("compares calendar days in the resort zone, not UTC", () => {
    // 04:00Z on the 15th is still the 14th at 21:00 in Denver.
    const lateNightDenver = new Date("2026-12-15T04:00:00Z");
    const earlierSameUtcDay = new Date("2026-12-15T12:30:00Z");
    expect(isSameLocalDay(lateNightDenver, earlierSameUtcDay)).toBe(
      isSameLocalDay(lateNightDenver, earlierSameUtcDay, undefined),
    );
    expect(isSameLocalDay(lateNightDenver, earlierSameUtcDay, "America/Denver")).toBe(false);
    expect(isSameLocalDay(lateNightDenver, earlierSameUtcDay, "UTC")).toBe(true);
  });

  it("formats a resort-local stamp with the zone abbreviation", () => {
    const s = formatResortLocalTime(NOW, "America/Denver");
    expect(s).toMatch(/5:30\s?AM/);
    expect(s).toMatch(/MST/);
  });
});

describe("evaluateAlert", () => {
  const base = {
    thresholdIn: 6,
    lastAlertedAt: null,
    snowNew24hIn: 8,
    snowReportStatus: "open",
    snowReportUpdatedAt: hoursAgo(1),
    timeZone: "America/Denver",
  };

  it("fires for a fresh report at an open resort above threshold", () => {
    expect(evaluateAlert(base, NOW)).toBe("fire");
  });

  it("never fires for closed or unknown-status resorts even with big numbers", () => {
    expect(evaluateAlert({ ...base, snowReportStatus: "unknown", snowNew24hIn: 30 }, NOW)).toBe("closed");
    expect(evaluateAlert({ ...base, snowReportStatus: "off-season" }, NOW)).toBe("closed");
    expect(evaluateAlert({ ...base, snowReportStatus: "closed" }, NOW)).toBe("closed");
  });

  it("never fires from stale data", () => {
    expect(evaluateAlert({ ...base, snowReportUpdatedAt: hoursAgo(40) }, NOW)).toBe("stale");
    expect(evaluateAlert({ ...base, snowReportUpdatedAt: null }, NOW)).toBe("stale");
  });

  it("respects the threshold inclusively", () => {
    expect(evaluateAlert({ ...base, snowNew24hIn: 6 }, NOW)).toBe("fire");
    expect(evaluateAlert({ ...base, snowNew24hIn: 5 }, NOW)).toBe("below_threshold");
    expect(evaluateAlert({ ...base, snowNew24hIn: null }, NOW)).toBe("below_threshold");
  });

  it("sends at most one alert per resort-local day", () => {
    // Already alerted at 04:00Z = 21:00 the previous evening in Denver → new day → fire.
    expect(evaluateAlert({ ...base, lastAlertedAt: "2026-12-15T04:00:00Z" }, NOW)).toBe("fire");
    // Alerted at 08:00Z = 01:00 today in Denver → same day → suppressed.
    expect(evaluateAlert({ ...base, lastAlertedAt: "2026-12-15T08:00:00Z" }, NOW)).toBe("already_today");
  });
});

describe("decideDigest", () => {
  const open = (in24: number | null, in7d: number | null = null) => ({
    operating: true,
    snowNew24hIn: in24,
    snowNew7dIn: in7d,
  });
  const closed = (in24: number | null) => ({ operating: false, snowNew24hIn: in24, snowNew7dIn: null });

  it("skips users with nothing to show", () => {
    expect(decideDigest([], 0, "daily").verdict).toBe("empty");
  });

  it("skips entirely when every favorite is off-season, whatever the threshold", () => {
    expect(decideDigest([closed(0), closed(12)], 0, "daily").verdict).toBe("off_season");
  });

  it("sends at threshold 0 when at least one favorite is open, even with no new snow", () => {
    expect(decideDigest([open(0), closed(0)], 0, "daily").verdict).toBe("send");
    expect(decideDigest([open(null)], null, "daily").verdict).toBe("send");
  });

  it("applies the threshold against the best open favorite only", () => {
    expect(decideDigest([open(3), closed(20)], 6, "daily")).toEqual({ verdict: "below_threshold", maxNewIn: 3 });
    expect(decideDigest([open(3), open(6)], 6, "daily")).toEqual({ verdict: "send", maxNewIn: 6 });
  });

  it("uses the 7-day total for weekly digests", () => {
    expect(decideDigest([open(1, 14)], 10, "weekly")).toEqual({ verdict: "send", maxNewIn: 14 });
    expect(decideDigest([open(1, 4)], 10, "weekly").verdict).toBe("below_threshold");
  });
});
