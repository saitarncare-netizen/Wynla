import { describe, expect, it } from "vitest";
import type { DayPlace, DayPlans } from "./dayPlans";
import { placeCategoryLabel, stopForDay, tripStops, tripToday, type TodayInput } from "./tripToday";

const place = (id: number, kind: DayPlace["kind"] = "restaurant", name = `Place ${id}`): DayPlace => ({
  id,
  kind,
  name,
  category: kind === "restaurant" ? "local" : "ski_shop",
  latitude: 39.6,
  longitude: -106.3,
  website_url: null,
});

// Vail x2, Beaver Creek x1, Vail x1 (driving back counts as a new stop).
const SLUGS = ["vail", "vail", "beaver-creek", "vail"];

function input(over: Partial<TodayInput> = {}): TodayInput {
  return {
    daySlugs: SLUGS,
    currentDay: null,
    completedDays: [],
    startedAt: null,
    totalDays: SLUGS.length,
    dayPlans: {},
    ...over,
  };
}

describe("tripStops / stopForDay", () => {
  it("groups consecutive days at one mountain into a stop", () => {
    expect(tripStops(SLUGS)).toEqual([
      { slug: "vail", days: [1, 2] },
      { slug: "beaver-creek", days: [3] },
      { slug: "vail", days: [4] },
    ]);
  });
  it("finds the stop for a day, null out of range", () => {
    expect(stopForDay(SLUGS, 2)).toEqual({ slug: "vail", days: [1, 2] });
    expect(stopForDay(SLUGS, 4)).toEqual({ slug: "vail", days: [4] });
    expect(stopForDay(SLUGS, 5)).toBeNull();
    expect(tripStops([])).toEqual([]);
  });
});

describe("tripToday states", () => {
  it("is not_started before Start trip, pointing at day 1", () => {
    const t = tripToday(input());
    expect(t.state).toBe("not_started");
    expect(t.day).toBe(1);
    expect(t.slug).toBe("vail");
    expect(t.stayPut).toBe(false);
    expect(t.nextDay).toEqual({ day: 2, slug: "vail", sameStop: true });
  });

  it("is active on the current day once started", () => {
    const t = tripToday(input({ startedAt: "s", currentDay: 3, completedDays: [1, 2] }));
    expect(t.state).toBe("active");
    expect(t.day).toBe(3);
    expect(t.slug).toBe("beaver-creek");
    expect(t.stayPut).toBe(false);
    expect(t.stop).toEqual({ slug: "beaver-creek", days: [3] });
    expect(t.nextDay).toEqual({ day: 4, slug: "vail", sameStop: false });
    expect(t.completedCount).toBe(2);
    expect(t.lastCompletedDay).toBe(2);
  });

  it("treats a just-started trip (current_day null) as day 1", () => {
    const t = tripToday(input({ startedAt: "s", currentDay: null, completedDays: null }));
    expect(t.state).toBe("active");
    expect(t.day).toBe(1);
    expect(t.lastCompletedDay).toBeNull();
  });

  it("flags stay-put days: same mountain as yesterday", () => {
    const t = tripToday(input({ startedAt: "s", currentDay: 2, completedDays: [1] }));
    expect(t.stayPut).toBe(true);
    expect(t.stop).toEqual({ slug: "vail", days: [1, 2] });
    expect(t.nextDay).toEqual({ day: 3, slug: "beaver-creek", sameStop: false });
  });

  it("does not call day 4 stay-put: Vail again after Beaver Creek is a drive", () => {
    const t = tripToday(input({ startedAt: "s", currentDay: 4, completedDays: [1, 2, 3] }));
    expect(t.stayPut).toBe(false);
    expect(t.nextDay).toBeNull();
  });

  it("is complete when every day is finished", () => {
    const t = tripToday(input({ startedAt: "s", currentDay: 4, completedDays: [1, 2, 3, 4] }));
    expect(t.state).toBe("complete");
    expect(t.day).toBe(4);
    expect(t.nextDay).toBeNull();
    expect(t.lastCompletedDay).toBe(4);
  });

  it("skips a current day that is already finished (legacy / hand-edited rows)", () => {
    const t = tripToday(input({ startedAt: "s", currentDay: 2, completedDays: [1, 2] }));
    expect(t.day).toBe(3);
  });

  it("clamps an out-of-range current_day and ignores out-of-range finished days", () => {
    const t = tripToday(input({ startedAt: "s", currentDay: 9, completedDays: [7, 8] }));
    expect(t.state).toBe("active");
    expect(t.day).toBe(4);
    expect(t.completedCount).toBe(0);
  });

  it("uses the itinerary length, not trips.total_days, when they disagree", () => {
    const t = tripToday(input({ startedAt: "s", currentDay: 4, completedDays: [1, 2, 3, 4], totalDays: 6 }));
    expect(t.totalDays).toBe(4);
    expect(t.state).toBe("complete");
  });

  it("stays not_started for an empty itinerary", () => {
    const t = tripToday(input({ daySlugs: [], totalDays: 0, startedAt: "s" }));
    expect(t.state).toBe("not_started");
    expect(t.slug).toBeNull();
    expect(t.stop).toBeNull();
    expect(t.placesForStop).toEqual([]);
  });
});

describe("tripToday placesForStop", () => {
  const plans: DayPlans = {
    "1": { places: [place(1), place(2, "activity")] },
    "2": { note: "rest day", places: [place(3), place(1)] },
    "3": { places: [place(9)] },
  };

  it("shows every place saved on any day of the stop, today's first, deduped", () => {
    const t = tripToday(input({ startedAt: "s", currentDay: 2, completedDays: [1], dayPlans: plans }));
    expect(t.placesForStop.map((p) => `${p.kind}:${p.id}`)).toEqual(["restaurant:3", "restaurant:1", "activity:2"]);
  });

  it("shows the same stop's places on its first day", () => {
    const t = tripToday(input({ startedAt: "s", currentDay: 1, dayPlans: plans }));
    expect(t.placesForStop.map((p) => `${p.kind}:${p.id}`)).toEqual(["restaurant:1", "activity:2", "restaurant:3"]);
  });

  it("never leaks another stop's places, even at the same mountain", () => {
    const t = tripToday(input({ startedAt: "s", currentDay: 4, completedDays: [1, 2, 3], dayPlans: plans }));
    expect(t.placesForStop).toEqual([]);
    const bc = tripToday(input({ startedAt: "s", currentDay: 3, completedDays: [1, 2], dayPlans: plans }));
    expect(bc.placesForStop.map((p) => p.id)).toEqual([9]);
  });

  it("keeps restaurant 1 and activity 1 apart: ids are per table", () => {
    const t = tripToday(input({ dayPlans: { "1": { places: [place(1), place(1, "activity")] } } }));
    expect(t.placesForStop).toHaveLength(2);
  });
});

describe("placeCategoryLabel", () => {
  it("maps known category keys to their labels", () => {
    expect(placeCategoryLabel({ kind: "restaurant", category: "cafe" })).toBe("Cafe + breakfast");
    expect(placeCategoryLabel({ kind: "activity", category: "ski_shop" })).toBe("Ski & board shops");
  });
  it("prettifies unknown keys and falls back by kind", () => {
    expect(placeCategoryLabel({ kind: "restaurant", category: "food_truck" })).toBe("Food truck");
    expect(placeCategoryLabel({ kind: "activity", category: null })).toBe("Activity");
    expect(placeCategoryLabel({ kind: "restaurant", category: "  " })).toBe("Restaurant");
  });
  it("does not read Object.prototype keys as categories", () => {
    expect(placeCategoryLabel({ kind: "restaurant", category: "constructor" })).toBe("Constructor");
  });
  it("does not use the restaurant table for activities", () => {
    expect(placeCategoryLabel({ kind: "activity", category: "fine_dining" })).toBe("Fine dining");
    expect(placeCategoryLabel({ kind: "activity", category: "local" })).toBe("Local");
  });
});
