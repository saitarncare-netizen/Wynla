import { describe, expect, it } from "vitest";
import { completeCurrentDay, sortTrips, tripFinished, undoLastCompletedDay } from "./tripProgress";

const base = { started_at: null, total_days: 3, completed_days: [] as number[] };

describe("sortTrips", () => {
  const today = "2026-12-10";
  const rows = [
    { id: "old-undated", created_at: "2026-11-01T00:00:00Z", ...base },
    { id: "next-week", created_at: "2026-10-01T00:00:00Z", start_date: "2026-12-17", ...base },
    { id: "last-week", created_at: "2026-11-20T00:00:00Z", start_date: "2026-12-03", ...base },
    { id: "tomorrow", created_at: "2026-09-01T00:00:00Z", start_date: "2026-12-11", ...base },
    { id: "new-undated", created_at: "2026-12-01T00:00:00Z", start_date: null, ...base },
  ];
  it("puts scheduled trips soonest first, then the rest newest first", () => {
    expect(sortTrips(rows, today).map((r) => r.id)).toEqual([
      "tomorrow",
      "next-week",
      "new-undated",
      "last-week",
      "old-undated",
    ]);
  });
  it("orders by creation alone when the column is missing", () => {
    const noCol = rows.map((r) => {
      const copy: Record<string, unknown> = { ...r };
      delete copy.start_date;
      return copy as unknown as Omit<typeof r, "start_date">;
    });
    expect(sortTrips(noCol, today).map((r) => r.id)).toEqual([
      "new-undated",
      "last-week",
      "old-undated",
      "next-week",
      "tomorrow",
    ]);
  });
});

describe("tripFinished", () => {
  it("needs a start and every day done", () => {
    expect(tripFinished({ started_at: null, total_days: 2, completed_days: [1, 2] })).toBe(false);
    expect(tripFinished({ started_at: "x", total_days: 2, completed_days: [1] })).toBe(false);
    expect(tripFinished({ started_at: "x", total_days: 2, completed_days: [1, 2] })).toBe(true);
  });
});

describe("completeCurrentDay", () => {
  it("starts the trip on the first completion and advances", () => {
    const u = completeCurrentDay({ started_at: null, current_day: null, completed_days: null }, 3, "2026-12-10T15:00:00Z");
    expect(u).toEqual({ completed_days: [1], current_day: 2, started_at: "2026-12-10T15:00:00Z" });
  });
  it("stays on the last day and does not touch started_at", () => {
    const u = completeCurrentDay({ started_at: "s", current_day: 3, completed_days: [1, 2] }, 3, "n");
    expect(u).toEqual({ completed_days: [1, 2, 3], current_day: 3 });
  });
  it("is idempotent for a repeated tap", () => {
    const u = completeCurrentDay({ started_at: "s", current_day: 2, completed_days: [1, 2] }, 3, "n");
    expect(u.completed_days).toEqual([1, 2]);
    expect(u.current_day).toBe(3);
  });
});

describe("undoLastCompletedDay", () => {
  it("returns null with nothing to undo", () => {
    expect(undoLastCompletedDay({ started_at: "s", current_day: 1, completed_days: [] })).toBeNull();
  });
  it("rewinds to the undone day", () => {
    expect(undoLastCompletedDay({ started_at: "s", current_day: 3, completed_days: [1, 2] })).toEqual({
      completed_days: [1],
      current_day: 2,
    });
  });
  it("resets the trip when the only completed day is undone", () => {
    expect(undoLastCompletedDay({ started_at: "s", current_day: 2, completed_days: [1] })).toEqual({
      completed_days: [],
      current_day: null,
      started_at: null,
    });
  });
});
