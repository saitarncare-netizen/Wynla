import { describe, expect, it } from "vitest";
import { parseDayPlans, type DayPlace, type DayPlans } from "./dayPlans";
import type { NearbyRow } from "./nearbyCategories";
import {
  MAX_PLACES_PER_DAY,
  TRIP_GRACE_DAYS,
  addPlaceToDay,
  addPlaceToStop,
  canSaveInto,
  expandTripDays,
  findPlaceDay,
  hasOpenDayAt,
  hasSeveralTripsAt,
  isMissingColumnError,
  isPastTrip,
  isRunningNow,
  localTodayISO,
  pickSaveTarget,
  pickTargetDay,
  pickTargetTrip,
  planTripHref,
  removePlaceFromTrip,
  signInHref,
  stopDaysFrom,
  toDayPlace,
  tripIncludesResort,
  tripLabel,
  tripStops,
  type SaveTripRow,
} from "./saveToTrip";

function trip(over: Partial<SaveTripRow> & Pick<SaveTripRow, "id">): SaveTripRow {
  return {
    name: null,
    resort_slugs: ["vail"],
    days_per_resort: [1],
    total_days: 1,
    current_day: null,
    completed_days: [],
    started_at: null,
    start_date: null,
    updated_at: "2026-09-01T00:00:00Z",
    day_plans: {},
    ...over,
  };
}

function place(id: number, kind: DayPlace["kind"] = "restaurant"): DayPlace {
  return { id, kind, name: `Place ${id}`, category: "local", latitude: 39.6, longitude: -106.3, website_url: null };
}

function fullDay(startId: number, kind: DayPlace["kind"] = "restaurant"): DayPlace[] {
  return Array.from({ length: MAX_PLACES_PER_DAY }, (_, i) => place(startId + i, kind));
}

describe("expandTripDays", () => {
  it("repeats each slug by its day count", () => {
    expect(expandTripDays(["vail", "aspen"], [3, 2], 5)).toEqual(["vail", "vail", "vail", "aspen", "aspen"]);
  });

  it("treats a null days_per_resort as one day per slug (pre-Stage-13 rows)", () => {
    expect(expandTripDays(["vail", "vail", "aspen"], null, 3)).toEqual(["vail", "vail", "aspen"]);
  });

  it("treats missing, zero, negative or non-finite counts as one day", () => {
    expect(expandTripDays(["a", "b", "c"], [2], 10)).toEqual(["a", "a", "b", "c"]);
    expect(expandTripDays(["a", "b", "c"], [0, -3, Number.NaN], 10)).toEqual(["a", "b", "c"]);
    expect(expandTripDays(["a"], [2.7], 10)).toEqual(["a", "a"]);
  });

  it("never runs past total_days", () => {
    expect(expandTripDays(["vail", "aspen"], [3, 3], 4)).toEqual(["vail", "vail", "vail", "aspen"]);
  });

  it("does not pad when total_days is longer than the slugs cover", () => {
    expect(expandTripDays(["vail"], [2], 5)).toEqual(["vail", "vail"]);
  });

  it("handles an empty or missing slug list", () => {
    expect(expandTripDays([], [], 3)).toEqual([]);
    expect(expandTripDays(null, null, 3)).toEqual([]);
  });
});

describe("tripStops", () => {
  it("groups consecutive days at the same resort, and a revisit is a new stop", () => {
    expect(tripStops(["vail", "vail", "aspen", "vail"])).toEqual([
      { slug: "vail", days: [1, 2] },
      { slug: "aspen", days: [3] },
      { slug: "vail", days: [4] },
    ]);
    expect(tripStops([])).toEqual([]);
  });
});

describe("pickTargetTrip", () => {
  const today = "2026-12-10";

  it("returns null when no trip includes the resort", () => {
    expect(pickTargetTrip([trip({ id: "a", resort_slugs: ["aspen"] })], "vail", today)).toBeNull();
    expect(pickTargetTrip([], "vail", today)).toBeNull();
  });

  it("prefers a trip that is running now over an upcoming or newer one", () => {
    const active = trip({
      id: "active",
      resort_slugs: ["aspen", "vail"],
      days_per_resort: [1, 2],
      total_days: 3,
      started_at: "2026-12-09T15:00:00Z",
      current_day: 2,
      completed_days: [1],
      updated_at: "2026-11-01T00:00:00Z",
    });
    const upcoming = trip({ id: "upcoming", start_date: "2026-12-20", updated_at: "2026-12-09T00:00:00Z" });
    expect(pickTargetTrip([upcoming, active], "vail", today)?.id).toBe("active");
  });

  it("ignores a started trip whose every day is done", () => {
    const finished = trip({ id: "done", started_at: "2026-12-01T00:00:00Z", current_day: 1, completed_days: [1] });
    const upcoming = trip({ id: "next", start_date: "2026-12-20" });
    expect(pickTargetTrip([finished, upcoming], "vail", today)?.id).toBe("next");
  });

  it("only counts an active trip when this resort is one of its days", () => {
    const activeElsewhere = trip({
      id: "elsewhere",
      resort_slugs: ["aspen"],
      started_at: "2026-12-09T00:00:00Z",
      current_day: 1,
    });
    const upcoming = trip({ id: "next", start_date: "2026-12-20" });
    expect(pickTargetTrip([activeElsewhere, upcoming], "vail", today)?.id).toBe("next");
  });

  it("picks the most recently started of two active trips", () => {
    const older = trip({ id: "older", started_at: "2026-12-07T00:00:00Z", total_days: 3, days_per_resort: [3] });
    const newer = trip({ id: "newer", started_at: "2026-12-08T00:00:00Z", total_days: 3, days_per_resort: [3] });
    expect(pickTargetTrip([older, newer], "vail", today)?.id).toBe("newer");
  });

  // Last season: marked day 1 done at Vail, never ticked the rest. Nobody
  // ticks the last day, so this is the common shape, not an edge case.
  const abandoned = trip({
    id: "abandoned",
    name: "Presidents Day",
    resort_slugs: ["vail"],
    days_per_resort: [3],
    total_days: 3,
    started_at: "2026-02-14T16:00:00Z",
    current_day: 2,
    completed_days: [1],
    updated_at: "2026-02-14T16:00:00Z",
  });

  it("does not treat last season's half-ticked trip as running", () => {
    const plan = trip({ id: "plan", updated_at: "2026-09-20T00:00:00Z" });
    delete plan.start_date; // start_date is not live yet: the upcoming rule cannot help
    expect(pickTargetTrip([abandoned, plan], "vail", today)?.id).toBe("plan");
  });

  it("ranks an abandoned trip below a plan even when it was edited more recently", () => {
    const renamed = { ...abandoned, updated_at: "2026-12-01T00:00:00Z" };
    const plan = trip({ id: "plan", updated_at: "2026-09-20T00:00:00Z" });
    expect(pickTargetTrip([renamed, plan], "vail", today)?.id).toBe("plan");
  });

  it("still falls back to an abandoned trip when it is the only one here", () => {
    expect(pickTargetTrip([abandoned], "vail", today)?.id).toBe("abandoned");
  });

  it("lets a trip that is still inside its window run, and not a day past the grace", () => {
    // Started Dec 1, 3 days: running through Dec 1 + 3 + TRIP_GRACE_DAYS.
    const t = trip({
      id: "t",
      days_per_resort: [3],
      total_days: 3,
      started_at: "2026-12-01T22:00:00Z",
      current_day: 2,
      completed_days: [1],
      updated_at: "2026-08-01T00:00:00Z",
    });
    const plan = trip({ id: "plan", updated_at: "2026-09-20T00:00:00Z" });
    const dec = (d: number) => `2026-12-${String(d).padStart(2, "0")}`;
    const last = dec(1 + 3 + TRIP_GRACE_DAYS);
    const after = dec(2 + 3 + TRIP_GRACE_DAYS);
    expect(pickTargetTrip([t, plan], "vail", last)?.id).toBe("t");
    expect(pickTargetTrip([t, plan], "vail", after)?.id).toBe("plan");
  });

  it("skips a running trip whose stop at this mountain is already skied", () => {
    // Vail days 1-2 done, now in Aspen.
    const running = trip({
      id: "running",
      resort_slugs: ["vail", "aspen"],
      days_per_resort: [2, 2],
      total_days: 4,
      started_at: "2026-12-08T23:00:00Z",
      current_day: 3,
      completed_days: [1, 2],
      updated_at: "2026-12-10T01:00:00Z",
    });
    const plan = trip({ id: "plan", updated_at: "2026-09-20T00:00:00Z" });
    expect(pickTargetTrip([running, plan], "vail", today)?.id).toBe("plan");
    // Aspen is still ahead on the running trip, so it keeps Aspen saves.
    expect(pickTargetTrip([running, trip({ id: "a", resort_slugs: ["aspen"] })], "aspen", today)?.id).toBe("running");
    // Alone, it is still the answer (the button never loses a target).
    expect(pickTargetTrip([running], "vail", today)?.id).toBe("running");
  });

  it("ranks a trip dated before today below an undated plan", () => {
    const lastSeason = trip({ id: "past", start_date: "2026-02-14", updated_at: "2026-12-01T00:00:00Z" });
    const plan = trip({ id: "plan", updated_at: "2026-09-20T00:00:00Z" });
    expect(pickTargetTrip([lastSeason, plan], "vail", today)?.id).toBe("plan");
  });

  it("picks the upcoming trip that starts soonest, today included", () => {
    const later = trip({ id: "later", start_date: "2027-01-15" });
    const soon = trip({ id: "soon", start_date: "2026-12-12" });
    const todayTrip = trip({ id: "today", start_date: today });
    const past = trip({ id: "past", start_date: "2026-12-01", updated_at: "2026-12-09T00:00:00Z" });
    expect(pickTargetTrip([later, soon, past], "vail", today)?.id).toBe("soon");
    expect(pickTargetTrip([later, soon, todayTrip], "vail", today)?.id).toBe("today");
  });

  it("falls back to the most recently edited trip, unfinished before finished", () => {
    const undatedOld = trip({ id: "old", updated_at: "2026-08-01T00:00:00Z" });
    const undatedNew = trip({ id: "new", updated_at: "2026-09-01T00:00:00Z" });
    const finishedNewest = trip({
      id: "finished",
      started_at: "2026-02-01T00:00:00Z",
      completed_days: [1],
      updated_at: "2026-10-01T00:00:00Z",
    });
    expect(pickTargetTrip([undatedOld, undatedNew, finishedNewest], "vail", today)?.id).toBe("new");
    expect(pickTargetTrip([finishedNewest], "vail", today)?.id).toBe("finished");
  });

  it("works when start_date is absent (column not added yet)", () => {
    const a = trip({ id: "a", updated_at: "2026-08-01T00:00:00Z" });
    const b = trip({ id: "b", updated_at: "2026-09-01T00:00:00Z" });
    delete a.start_date;
    delete b.start_date;
    expect(pickTargetTrip([a, b], "vail", today)?.id).toBe("b");
  });
});

describe("pickTargetDay", () => {
  // Day 1-2 Vail, day 3 Aspen, day 4 Vail again.
  const route = { resort_slugs: ["vail", "aspen", "vail"], days_per_resort: [2, 1, 1], total_days: 4 };

  it("returns today's day when the running trip is at this resort", () => {
    const t = trip({ id: "t", ...route, started_at: "x", current_day: 2, completed_days: [1] });
    expect(pickTargetDay(t, "vail")).toBe(2);
  });

  it("returns the first day of the first stop at the resort before the trip starts", () => {
    const t = trip({ id: "t", ...route });
    expect(pickTargetDay(t, "vail")).toBe(1);
    expect(pickTargetDay(t, "aspen")).toBe(3);
  });

  it("skips a stop whose days are all done", () => {
    const t = trip({ id: "t", ...route, started_at: "x", current_day: 3, completed_days: [1, 2] });
    expect(pickTargetDay(t, "vail")).toBe(4);
  });

  it("falls back to the resort's first day when every stop there is done", () => {
    const t = trip({ id: "t", ...route, started_at: "x", current_day: 4, completed_days: [1, 2, 3, 4] });
    expect(pickTargetDay(t, "vail")).toBe(1);
  });

  it("does not use current_day for a trip that has not started", () => {
    const t = trip({ id: "t", ...route, current_day: 3 });
    expect(pickTargetDay(t, "vail")).toBe(1);
  });

  it("returns null when the trip does not include the resort", () => {
    expect(pickTargetDay(trip({ id: "t", ...route }), "stowe")).toBeNull();
  });

  it("with today, trusts current_day only while the trip is running now", () => {
    // Day 1 and 3 ticked, focus on day 4 (Vail again); day 2 was skipped.
    const base = { id: "t", ...route, current_day: 4, completed_days: [1, 3] };
    const live = trip({ ...base, started_at: "2026-12-08T20:00:00Z" });
    const stale = trip({ ...base, started_at: "2026-02-14T20:00:00Z" });
    expect(pickTargetDay(live, "vail", "2026-12-10")).toBe(4);
    // Abandoned last season: the stale focus is ignored, the first stop
    // with an open day wins.
    expect(pickTargetDay(stale, "vail", "2026-12-10")).toBe(1);
    // Without today, any started unfinished trip counts (older callers).
    expect(pickTargetDay(stale, "vail")).toBe(4);
  });
});

describe("isRunningNow / isPastTrip", () => {
  const today = "2026-12-10";
  const started = (started_at: string | null, over: Partial<SaveTripRow> = {}) =>
    trip({ id: "t", days_per_resort: [3], total_days: 3, started_at, completed_days: started_at ? [1] : [], ...over });

  it("runs from the start through total_days + the grace", () => {
    expect(isRunningNow(started("2026-12-10T01:00:00Z"), today)).toBe(true);
    expect(isRunningNow(started("2026-12-05T01:00:00Z"), today)).toBe(true);
    expect(isRunningNow(started("2026-12-04T01:00:00Z"), today)).toBe(false);
  });

  it("is not running when not started, finished, or started_at is not a date", () => {
    expect(isRunningNow(started(null), today)).toBe(false);
    expect(isRunningNow(started("2026-12-09T00:00:00Z", { completed_days: [1, 2, 3] }), today)).toBe(false);
    expect(isRunningNow(started("garbage"), today)).toBe(false);
  });

  it("calls a trip past when finished, abandoned, or dated before today's window", () => {
    expect(isPastTrip(started("2026-12-09T00:00:00Z", { completed_days: [1, 2, 3] }), today)).toBe(true);
    expect(isPastTrip(started("2026-02-14T00:00:00Z"), today)).toBe(true);
    expect(isPastTrip(started(null, { start_date: "2026-11-01" }), today)).toBe(true);
  });

  it("does not call a live, dated-ahead, dated-now or undated plan past", () => {
    expect(isPastTrip(started("2026-12-09T00:00:00Z"), today)).toBe(false);
    expect(isPastTrip(started(null, { start_date: "2026-12-20" }), today)).toBe(false);
    expect(isPastTrip(started(null, { start_date: "2026-12-09" }), today)).toBe(false);
    expect(isPastTrip(started(null), today)).toBe(false);
  });

  it("trusts a start date today or later over an old started_at, unless finished", () => {
    // Start tapped weeks ahead, or the trip re-dated after last season's run.
    expect(isPastTrip(started("2026-02-14T00:00:00Z", { start_date: "2026-12-20" }), today)).toBe(false);
    expect(isPastTrip(started("2026-11-01T00:00:00Z", { start_date: today }), today)).toBe(false);
    expect(isPastTrip(started("2026-02-14T00:00:00Z", { start_date: "2026-12-20", completed_days: [1, 2, 3] }), today)).toBe(
      true,
    );
    // Dated before today, the old started_at still decides.
    expect(isPastTrip(started("2026-02-14T00:00:00Z", { start_date: "2026-02-14" }), today)).toBe(true);
  });

  it("keeps trusting the start date while today is inside the dated trip", () => {
    // Start tapped Dec 1 for a trip dated Dec 9: on Dec 10 it is day 2.
    const early = started("2026-12-01T15:00:00Z", { start_date: "2026-12-09" });
    expect(isPastTrip(early, today)).toBe(false);
    expect(canSaveInto(early, "vail", today)).toBe(true);
    // Dec 9 + 3 days + TRIP_GRACE_DAYS is its last day; after that the
    // old started_at decides again, and says past.
    expect(isPastTrip(early, "2026-12-14")).toBe(false);
    expect(isPastTrip(early, "2026-12-15")).toBe(true);
    // Finished still wins.
    expect(isPastTrip({ ...early, completed_days: [1, 2, 3] }, today)).toBe(true);
  });
});

describe("canSaveInto / pickSaveTarget", () => {
  const today = "2026-12-10";
  const lastSeason = trip({
    id: "last",
    name: "Presidents Day",
    days_per_resort: [3],
    total_days: 3,
    started_at: "2026-02-14T16:00:00Z",
    current_day: 2,
    completed_days: [1],
    updated_at: "2026-12-01T00:00:00Z",
  });
  const finished = trip({ id: "finished", started_at: "2026-12-08T00:00:00Z", completed_days: [1] });
  const datedBefore = trip({ id: "dated", start_date: "2026-11-01" });
  // Running now, Vail (days 1-2) already skied, in Aspen today.
  const pastVail = trip({
    id: "moved-on",
    resort_slugs: ["vail", "aspen"],
    days_per_resort: [2, 2],
    total_days: 4,
    started_at: "2026-12-08T23:00:00Z",
    current_day: 3,
    completed_days: [1, 2],
  });

  it("refuses a trip behind the person or with no day left here", () => {
    expect(canSaveInto(lastSeason, "vail", today)).toBe(false);
    expect(canSaveInto(finished, "vail", today)).toBe(false);
    expect(canSaveInto(datedBefore, "vail", today)).toBe(false);
    expect(canSaveInto(pastVail, "vail", today)).toBe(false);
    expect(canSaveInto(trip({ id: "x", resort_slugs: ["aspen"] }), "vail", today)).toBe(false);
  });

  it("accepts a running, upcoming or undated trip with a day left here", () => {
    expect(canSaveInto(pastVail, "aspen", today)).toBe(true);
    expect(canSaveInto(trip({ id: "up", start_date: "2026-12-20" }), "vail", today)).toBe(true);
    expect(canSaveInto(trip({ id: "plan" }), "vail", today)).toBe(true);
  });

  it("returns null instead of falling back to last season's trip", () => {
    // pickTargetTrip's last resort, which the button must not write into.
    expect(pickTargetTrip([lastSeason], "vail", today)?.id).toBe("last");
    expect(pickSaveTarget([lastSeason], "vail", today)).toBeNull();
    expect(pickSaveTarget([lastSeason, finished, datedBefore, pastVail], "vail", today)).toBeNull();
    expect(pickSaveTarget([], "vail", today)).toBeNull();
  });

  it("picks exactly what pickTargetTrip picks among trips that can take the place", () => {
    const running = { ...pastVail, id: "running" };
    const upcoming = trip({ id: "up", start_date: "2026-12-20" });
    const plan = trip({ id: "plan", updated_at: "2026-09-20T00:00:00Z" });
    expect(pickSaveTarget([lastSeason, running, upcoming], "aspen", today)?.id).toBe("running");
    expect(pickSaveTarget([lastSeason, upcoming, plan], "vail", today)?.id).toBe("up");
    expect(pickSaveTarget([lastSeason, plan], "vail", today)?.id).toBe("plan");
  });

  it("keeps an upcoming trip whose Start was tapped long ago", () => {
    const redated = trip({ id: "redated", start_date: "2026-12-20", started_at: "2026-02-14T16:00:00Z" });
    expect(pickSaveTarget([redated], "vail", today)?.id).toBe("redated");
  });

  it("keeps it through every day of the dated trip, not just until it starts", () => {
    // 3 days from Dec 20, Start tapped Dec 1 (Start is offered any time and
    // never moves started_at). Day 2 and day 3 are the days it matters.
    const early = trip({
      id: "early",
      days_per_resort: [3],
      total_days: 3,
      start_date: "2026-12-20",
      started_at: "2026-12-01T15:00:00Z",
      current_day: 2,
      completed_days: [1],
    });
    for (const day of ["2026-12-19", "2026-12-20", "2026-12-21", "2026-12-22", "2026-12-25"]) {
      expect(canSaveInto(early, "vail", day)).toBe(true);
      expect(pickSaveTarget([early], "vail", day)?.id).toBe("early");
    }
    // Dec 20 + 3 days + TRIP_GRACE_DAYS is the last day it takes a save.
    expect(pickSaveTarget([early], "vail", "2026-12-26")).toBeNull();
    // Same for a trip re-dated after last season's run.
    const redated = { ...early, id: "redated", started_at: "2026-02-14T16:00:00Z" };
    expect(pickSaveTarget([redated], "vail", "2026-12-21")?.id).toBe("redated");
  });

  it("passes over an upcoming trip whose days here were all ticked ahead", () => {
    const ticked = trip({ id: "ticked", start_date: "2026-12-12", started_at: "2026-12-10T00:00:00Z", completed_days: [1] });
    const plan = trip({ id: "plan" });
    // Finished (its one day is done): pickTargetTrip would skip it too.
    expect(pickSaveTarget([ticked, plan], "vail", today)?.id).toBe("plan");
    const twoStops = trip({
      id: "two",
      resort_slugs: ["vail", "aspen"],
      days_per_resort: [1, 1],
      total_days: 2,
      start_date: "2026-12-12",
      started_at: "2026-12-10T00:00:00Z",
      completed_days: [1],
    });
    expect(pickTargetTrip([twoStops, plan], "vail", today)?.id).toBe("two");
    expect(pickSaveTarget([twoStops, plan], "vail", today)?.id).toBe("plan");
  });
});

describe("tripIncludesResort / hasOpenDayAt / hasSeveralTripsAt / tripLabel", () => {
  const t = trip({ id: "t", resort_slugs: ["vail", "aspen"], days_per_resort: [2, 1], total_days: 3 });

  it("checks the expanded days", () => {
    expect(tripIncludesResort(t, "aspen")).toBe(true);
    expect(tripIncludesResort(t, "stowe")).toBe(false);
    // Cut off by total_days: not part of the trip.
    expect(tripIncludesResort({ ...t, total_days: 2 }, "aspen")).toBe(false);
  });

  it("knows whether a mountain still has a day to ski", () => {
    expect(hasOpenDayAt(t, "vail")).toBe(true);
    expect(hasOpenDayAt({ ...t, completed_days: [1] }, "vail")).toBe(true);
    expect(hasOpenDayAt({ ...t, completed_days: [1, 2] }, "vail")).toBe(false);
    expect(hasOpenDayAt(t, "stowe")).toBe(false);
  });

  it("counts the trips at a mountain", () => {
    expect(hasSeveralTripsAt([t], "vail")).toBe(false);
    expect(hasSeveralTripsAt([t, trip({ id: "u", resort_slugs: ["aspen"] })], "vail")).toBe(false);
    expect(hasSeveralTripsAt([t, trip({ id: "u" })], "vail")).toBe(true);
  });

  it("labels a trip by name, else by length", () => {
    expect(tripLabel({ name: "Ikon week", total_days: 5 })).toBe("Ikon week");
    expect(tripLabel({ name: null, total_days: 5 })).toBe("5-day trip");
    expect(tripLabel({ name: "  ", total_days: 2 })).toBe("2-day trip");
  });
});

describe("stopDaysFrom", () => {
  const route = { resort_slugs: ["vail", "aspen"], days_per_resort: [3, 1], total_days: 4 };

  it("lists the target day first, then the stop's other open days", () => {
    expect(stopDaysFrom(trip({ id: "t", ...route }), 1)).toEqual([1, 2, 3]);
    expect(stopDaysFrom(trip({ id: "t", ...route }), 2)).toEqual([2, 1, 3]);
    expect(stopDaysFrom(trip({ id: "t", ...route }), 4)).toEqual([4]);
  });

  it("leaves out completed days, but always keeps the target", () => {
    const t = trip({ id: "t", ...route, started_at: "x", current_day: 2, completed_days: [1] });
    expect(stopDaysFrom(t, 2)).toEqual([2, 3]);
    expect(stopDaysFrom(t, 1)).toEqual([1, 2, 3]);
  });

  it("returns just the day when it is outside the trip", () => {
    expect(stopDaysFrom(trip({ id: "t", ...route }), 9)).toEqual([9]);
  });
});

describe("addPlaceToDay", () => {
  it("adds to an empty day", () => {
    const res = addPlaceToDay({}, 2, place(7));
    expect(res).toEqual({ status: "added", day: 2, dayPlans: { "2": { places: [place(7)] } } });
  });

  it("appends and keeps the day's note and the other days", () => {
    const plans: DayPlans = { "1": { note: "Early start", places: [place(1)] }, "3": { note: "Rest day" } };
    const res = addPlaceToDay(plans, 1, place(2));
    expect(res.status).toBe("added");
    if (res.status !== "added") return;
    expect(res.dayPlans["1"]).toEqual({ note: "Early start", places: [place(1), place(2)] });
    expect(res.dayPlans["3"]).toEqual({ note: "Rest day" });
    // The input is not mutated.
    expect(plans["1"].places).toHaveLength(1);
  });

  it("reports a place already saved on any day of the trip instead of duplicating it", () => {
    const plans: DayPlans = { "4": { places: [place(9)] } };
    expect(addPlaceToDay(plans, 1, place(9))).toEqual({ status: "already", day: 4 });
  });

  it("dedupes by kind and id: a restaurant and an activity may share an id", () => {
    const plans: DayPlans = { "1": { places: [place(9, "activity")] } };
    expect(addPlaceToDay(plans, 1, place(9, "restaurant")).status).toBe("added");
  });

  it("reports the lowest day when a hand-edited trip has the place twice", () => {
    const plans: DayPlans = { "10": { places: [place(5)] }, "2": { places: [place(5)] } };
    expect(addPlaceToDay(plans, 1, place(5))).toEqual({ status: "already", day: 2 });
  });

  it("refuses a 13th place on a day", () => {
    const plans: DayPlans = { "1": { places: fullDay(100) } };
    expect(addPlaceToDay(plans, 1, place(1))).toEqual({ status: "full", day: 1 });
  });

  it("round-trips through parseDayPlans", () => {
    const res = addPlaceToDay(parseDayPlans({ "1": { note: "hi" } }), 1, place(3, "activity"));
    if (res.status !== "added") throw new Error("expected added");
    expect(parseDayPlans(JSON.parse(JSON.stringify(res.dayPlans)))).toEqual(res.dayPlans);
  });

  it("rejects a day that is not a positive integer", () => {
    expect(() => addPlaceToDay({}, 0, place(1))).toThrow(RangeError);
    expect(() => addPlaceToDay({}, 1.5, place(1))).toThrow(RangeError);
  });
});

describe("addPlaceToStop", () => {
  it("spills into the next day of the stop when the first is full", () => {
    const plans: DayPlans = { "1": { places: fullDay(100) } };
    const res = addPlaceToStop(plans, [1, 2, 3], place(1));
    expect(res.status).toBe("added");
    if (res.status !== "added") return;
    expect(res.day).toBe(2);
    expect(res.dayPlans["2"]?.places).toEqual([place(1)]);
  });

  it("says full (naming the first day) only when every day of the stop is", () => {
    const plans: DayPlans = { "1": { places: fullDay(100) }, "2": { places: fullDay(200) } };
    expect(addPlaceToStop(plans, [1, 2], place(1))).toEqual({ status: "full", day: 1 });
  });

  it("still reports a duplicate anywhere in the trip", () => {
    const plans: DayPlans = { "5": { places: [place(1)] } };
    expect(addPlaceToStop(plans, [1, 2], place(1))).toEqual({ status: "already", day: 5 });
  });

  it("needs at least one day", () => {
    expect(() => addPlaceToStop({}, [], place(1))).toThrow(RangeError);
  });
});

describe("findPlaceDay / removePlaceFromTrip", () => {
  const plans: DayPlans = {
    "1": { note: "Keep me", places: [place(1), place(2)] },
    "2": { places: [place(3, "activity")] },
  };

  it("finds the day a place is on", () => {
    expect(findPlaceDay(plans, "restaurant", 2)).toBe(1);
    expect(findPlaceDay(plans, "activity", 3)).toBe(2);
    expect(findPlaceDay(plans, "restaurant", 3)).toBeNull();
  });

  it("removes the place and keeps the day's note", () => {
    const res = removePlaceFromTrip(plans, "restaurant", 2);
    expect(res.day).toBe(1);
    expect(res.dayPlans["1"]).toEqual({ note: "Keep me", places: [place(1)] });
    expect(res.dayPlans["2"]).toEqual(plans["2"]);
  });

  it("drops a day left with nothing on it", () => {
    const res = removePlaceFromTrip(plans, "activity", 3);
    expect(res.day).toBe(2);
    expect("2" in res.dayPlans).toBe(false);
  });

  it("removes every copy and reports the first day", () => {
    const twice: DayPlans = { "3": { places: [place(8)] }, "1": { places: [place(8), place(9)] } };
    const res = removePlaceFromTrip(twice, "restaurant", 8);
    expect(res.day).toBe(1);
    expect(res.dayPlans).toEqual({ "1": { places: [place(9)] } });
  });

  it("is a no-op for a place that is not there", () => {
    const res = removePlaceFromTrip(plans, "activity", 1);
    expect(res.day).toBeNull();
    expect(res.dayPlans).toEqual(plans);
  });
});

describe("toDayPlace", () => {
  const row: NearbyRow = {
    id: 42,
    resort_id: 1,
    name: "Moe's BBQ",
    category: "family",
    description: null,
    distance_km: 1.2,
    drive_minutes: 4,
    latitude: 39.64,
    longitude: -106.37,
    website_url: "https://example.com",
    source: "osm",
    confidence_score: null,
    kind: "restaurant",
  };

  it("keeps what the trip needs and drops the rest", () => {
    expect(toDayPlace(row)).toEqual({
      id: 42,
      kind: "restaurant",
      name: "Moe's BBQ",
      category: "family",
      latitude: 39.64,
      longitude: -106.37,
      website_url: "https://example.com",
    });
  });

  it("uses an explicit kind over the row's", () => {
    expect(toDayPlace({ ...row, kind: undefined }, "activity")?.kind).toBe("activity");
  });

  it("returns null without a kind", () => {
    expect(toDayPlace({ ...row, kind: undefined })).toBeNull();
  });

  it("coerces string coordinates from PostgREST numeric columns", () => {
    const odd = { ...row, latitude: "39.5" as unknown as number, longitude: "" as unknown as number };
    expect(toDayPlace(odd)).toMatchObject({ latitude: 39.5, longitude: null });
    expect(toDayPlace({ ...row, latitude: null, website_url: null })).toMatchObject({ latitude: null, website_url: null });
  });
});

describe("small helpers", () => {
  it("formats the local calendar date", () => {
    expect(localTodayISO(new Date(2026, 0, 5, 23, 30))).toBe("2026-01-05");
    expect(localTodayISO(new Date(2026, 11, 31, 0, 1))).toBe("2026-12-31");
  });

  it("recognises a missing-column error and nothing else", () => {
    expect(isMissingColumnError({ code: "42703", message: "column trips.day_plans does not exist" })).toBe(true);
    expect(isMissingColumnError({ code: "PGRST204" })).toBe(true);
    expect(isMissingColumnError({ message: "Could not find the 'start_date' column of 'trips' in the schema cache" })).toBe(true);
    expect(isMissingColumnError({ code: "42501", message: "permission denied for table trips" })).toBe(false);
    expect(isMissingColumnError(null)).toBe(false);
  });

  it("builds the plan-a-trip deep link as an append, never a route seed", () => {
    // ?route= would replace every stop of a trip being planned.
    expect(planTripHref("vail")).toBe("/?plan=1&add=vail");
    expect(planTripHref("a b&c")).toBe("/?plan=1&add=a%20b%26c");
    expect(planTripHref("vail")).not.toMatch(/route=|days=/);
  });

  it("builds a sign-in link back to a same-site path only", () => {
    expect(signInHref("/resort/vail")).toBe("/login?next=%2Fresort%2Fvail");
    expect(signInHref("/?resort=vail")).toBe(`/login?next=${encodeURIComponent("/?resort=vail")}`);
    expect(signInHref("//evil.example")).toBe("/login?next=%2F");
    expect(signInHref("https://evil.example")).toBe("/login?next=%2F");
  });
});
