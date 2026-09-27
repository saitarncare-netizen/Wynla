import { describe, expect, it } from "vitest";
import {
  completeCurrentDay,
  effectiveCurrentDay,
  finishDay,
  restartTrip,
  sortTrips,
  startTrip,
  tripFinished,
  undoLastCompletedDay,
} from "./tripProgress";

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
  it("keeps the trip started when the only completed day is undone", () => {
    // Starting is its own tap now: undoing "Finish day 1" lands on an
    // active day 1, not back on the Start screen.
    const u = undoLastCompletedDay({ started_at: "s", current_day: 2, completed_days: [1] });
    expect(u).toEqual({ completed_days: [], current_day: 1 });
    expect(u).not.toHaveProperty("started_at");
  });
  it("undoes the last day of a finished trip in place", () => {
    expect(undoLastCompletedDay({ started_at: "s", current_day: 3, completed_days: [1, 2, 3] })).toEqual({
      completed_days: [1, 2],
      current_day: 3,
    });
  });
});

describe("startTrip", () => {
  it("starts on day 1 with nothing finished", () => {
    expect(startTrip({ started_at: null, current_day: null, completed_days: null }, "2026-12-20T14:00:00Z")).toEqual({
      started_at: "2026-12-20T14:00:00Z",
      current_day: 1,
      completed_days: [],
    });
  });
  it("is a no-op on a trip that is already started, so progress is never wiped", () => {
    expect(startTrip({ started_at: "s", current_day: 3, completed_days: [1, 2] }, "n")).toBeNull();
  });
});

describe("restartTrip", () => {
  it("clears progress and the start", () => {
    expect(restartTrip()).toEqual({ started_at: null, current_day: null, completed_days: [] });
  });
});

describe("effectiveCurrentDay", () => {
  it("defaults to day 1 and clamps into the trip", () => {
    expect(effectiveCurrentDay({ started_at: "s", current_day: null, completed_days: null }, 3)).toBe(1);
    expect(effectiveCurrentDay({ started_at: "s", current_day: 0, completed_days: [] }, 3)).toBe(1);
    expect(effectiveCurrentDay({ started_at: "s", current_day: 7, completed_days: [] }, 3)).toBe(3);
  });
  it("moves past a day that is already finished, stopping at the last day", () => {
    expect(effectiveCurrentDay({ started_at: "s", current_day: 1, completed_days: [1, 2] }, 3)).toBe(3);
    expect(effectiveCurrentDay({ started_at: "s", current_day: 3, completed_days: [1, 2, 3] }, 3)).toBe(3);
  });
});

describe("finishDay", () => {
  const active = { started_at: "s", current_day: 2, completed_days: [1] };
  it("finishes the day the button showed and moves to the next", () => {
    expect(finishDay(active, 2, 3, "n")).toEqual({ completed_days: [1, 2], current_day: 3 });
  });
  it("finishes the last day in place", () => {
    expect(finishDay({ started_at: "s", current_day: 3, completed_days: [1, 2] }, 3, 3, "n")).toEqual({
      completed_days: [1, 2, 3],
      current_day: 3,
    });
  });
  it("ignores a second tap for the same day (card + sticky bar, or two devices)", () => {
    const afterFirst = { started_at: "s", current_day: 3, completed_days: [1, 2] };
    expect(finishDay(afterFirst, 2, 3, "n")).toBeNull();
  });
  it("ignores an already finished last day", () => {
    expect(finishDay({ started_at: "s", current_day: 3, completed_days: [1, 2, 3] }, 3, 3, "n")).toBeNull();
  });
  it("never starts a trip: a stale page must resync, not auto-start", () => {
    expect(finishDay({ started_at: null, current_day: null, completed_days: [] }, 1, 3, "n")).toBeNull();
  });
});
