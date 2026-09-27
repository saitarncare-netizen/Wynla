import { describe, expect, it } from "vitest";
import type { DayPlace, DayPlans } from "./dayPlans";
import {
  applyDayPlanEdit,
  mountainDaysFrom,
  movePlacesOnSwap,
  placeCategoryLabel,
  stopForDay,
  swapTargetDays,
  tripStops,
  tripToday,
  type TodayInput,
} from "./tripToday";

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

describe("mountainDaysFrom", () => {
  it("is the day, the rest of its stop, then other visits in trip order", () => {
    expect(mountainDaysFrom(SLUGS, 2)).toEqual([2, 1, 4]);
    expect(mountainDaysFrom(SLUGS, 1)).toEqual([1, 2, 4]);
    expect(mountainDaysFrom(SLUGS, 4)).toEqual([4, 1, 2]);
    expect(mountainDaysFrom(SLUGS, 3)).toEqual([3]);
  });
  it("is empty out of range", () => {
    expect(mountainDaysFrom(SLUGS, 0)).toEqual([]);
    expect(mountainDaysFrom(SLUGS, 5)).toEqual([]);
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

  it("shows a mountain's places on a second visit too ('+ Trip' saves once per trip)", () => {
    // Day 4 is Vail again after Beaver Creek; the Vail places were saved
    // under the first Vail stop and must not vanish on the way back.
    const t = tripToday(input({ startedAt: "s", currentDay: 4, completedDays: [1, 2, 3], dayPlans: plans }));
    expect(t.placesForStop.map((p) => `${p.kind}:${p.id}`)).toEqual(["restaurant:1", "activity:2", "restaurant:3"]);
  });

  it("puts today's stop before the other visit, today's own saves first", () => {
    const withDay4 = { ...plans, "4": { places: [place(7)] } };
    const t = tripToday(input({ startedAt: "s", currentDay: 2, completedDays: [1], dayPlans: withDay4 }));
    expect(t.placesForStop.map((p) => p.id)).toEqual([3, 1, 2, 7]);
    const back = tripToday(input({ startedAt: "s", currentDay: 4, completedDays: [1, 2, 3], dayPlans: withDay4 }));
    expect(back.placesForStop.map((p) => p.id)).toEqual([7, 1, 2, 3]);
  });

  it("never leaks another mountain's places", () => {
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

describe("applyDayPlanEdit (DayPlan's delta write)", () => {
  // `fresh` stands for the row just re-read from the database: it has a
  // place ("+ Trip" from the map sheet, another tab) the card never saw.
  const fresh: DayPlans = {
    "1": { note: "leave at 7", places: [place(1), place(2), place(5, "activity")] },
    "2": { places: [place(3)] },
  };

  it("a note edit replaces only the note and keeps places saved elsewhere", () => {
    const res = applyDayPlanEdit(fresh, 1, { note: "leave at 6" });
    expect(res.changed).toBe(true);
    expect(res.dayPlans["1"]).toEqual({ note: "leave at 6", places: fresh["1"].places });
    expect(res.dayPlans["2"]).toBe(fresh["2"]);
  });

  it("clearing the note of a day with no places drops the day", () => {
    const res = applyDayPlanEdit({ "1": { note: "x" } }, 1, { note: "  " });
    expect(res.dayPlans).toEqual({});
    expect(res.changed).toBe(true);
  });

  it("a remove takes off only that one place and keeps the note", () => {
    const res = applyDayPlanEdit(fresh, 1, { remove: "restaurant:2" });
    expect(res.dayPlans["1"]).toEqual({ note: "leave at 7", places: [place(1), place(5, "activity")] });
    expect(res.changed).toBe(true);
  });

  it("removing a place that is already gone changes nothing", () => {
    const res = applyDayPlanEdit(fresh, 1, { remove: "restaurant:9" });
    expect(res.changed).toBe(false);
    expect(res.dayPlans).toEqual(fresh);
  });

  it("an add appends to the fresh day and keeps its note", () => {
    const res = applyDayPlanEdit(fresh, 1, { add: place(1, "activity") });
    expect(res.add).toEqual({ status: "added", day: 1 });
    expect(res.changed).toBe(true);
    expect(res.dayPlans["1"].places?.map((p) => `${p.kind}:${p.id}`)).toEqual([
      "restaurant:1",
      "restaurant:2",
      "activity:5",
      "activity:1",
    ]);
    expect(res.dayPlans["1"].note).toBe("leave at 7");
  });

  it("an add dedupes: a place already on this day is not written twice", () => {
    const res = applyDayPlanEdit(fresh, 1, { add: place(2) });
    expect(res.add).toEqual({ status: "already", day: 1 });
    expect(res.changed).toBe(false);
  });

  it("an add of a place saved on another day reports that day (once per trip)", () => {
    const res = applyDayPlanEdit(fresh, 1, { add: place(3) });
    expect(res.add).toEqual({ status: "already", day: 2 });
    expect(res.changed).toBe(false);
    expect(res.dayPlans).toBe(fresh);
  });

  it("an add to a full day reports full instead of dropping a place", () => {
    const full: DayPlans = { "1": { places: Array.from({ length: 12 }, (_, i) => place(100 + i)) } };
    const res = applyDayPlanEdit(full, 1, { add: place(1) });
    expect(res.add).toEqual({ status: "full", day: 1 });
    expect(res.changed).toBe(false);
    expect(res.dayPlans["1"].places).toHaveLength(12);
    expect(res.dayPlans["1"].places?.some((p) => p.id === 1)).toBe(false);
  });

  it("still saves an unsaved note that rides along with an add to a full day", () => {
    const full: DayPlans = { "1": { places: Array.from({ length: 12 }, (_, i) => place(100 + i)) } };
    const res = applyDayPlanEdit(full, 1, { note: "dinner at 8", add: place(1) });
    expect(res.add?.status).toBe("full");
    expect(res.changed).toBe(true);
    expect(res.dayPlans["1"]).toEqual({ note: "dinner at 8", places: full["1"].places });
  });
});

describe("swapTargetDays", () => {
  it("prefers the rest of the old stay after the swapped day", () => {
    // Vail days 1-3; day 1 became Beaver Creek.
    expect(swapTargetDays(["beaver-creek", "vail", "vail", "aspen"], 1, "vail")).toEqual([2, 3]);
  });
  it("falls back to the part of the stay before it, first day first", () => {
    expect(swapTargetDays(["vail", "beaver-creek", "vail", "aspen"], 2, "vail")).toEqual([3, 1]);
    expect(swapTargetDays(["vail", "vail", "beaver-creek"], 3, "vail")).toEqual([1, 2]);
    expect(swapTargetDays(["vail", "vail", "beaver-creek", "vail", "vail"], 3, "vail")).toEqual([4, 5, 1, 2]);
  });
  it("then another visit to the old mountain", () => {
    expect(swapTargetDays(["aspen", "beaver-creek", "vail"], 1, "vail")).toEqual([3]);
    expect(swapTargetDays(["vail", "beaver-creek", "aspen", "vail"], 2, "vail")).toEqual([1, 4]);
  });
  it("is empty when no day at the old mountain is left", () => {
    expect(swapTargetDays(["beaver-creek", "aspen"], 1, "vail")).toEqual([]);
  });
});

describe("movePlacesOnSwap", () => {
  it("moves a 3-night stay's places off the swapped first day instead of deleting them", () => {
    const plans: DayPlans = {
      "1": { note: "early start", places: [place(1), place(2), place(3, "activity")] },
      "2": { note: "rest day", places: [place(4)] },
    };
    const next = movePlacesOnSwap(plans, ["beaver-creek", "vail", "vail", "aspen"], 1, "vail");
    expect(next["1"]).toEqual({ note: "early start" });
    expect(next["2"]).toEqual({ note: "rest day", places: [place(4), place(1), place(2), place(3, "activity")] });
    expect(next["3"]).toBeUndefined();
  });

  it("moves to the day before when the swapped day ended the stay", () => {
    const plans: DayPlans = { "3": { places: [place(1)] } };
    const next = movePlacesOnSwap(plans, ["vail", "vail", "beaver-creek"], 3, "vail");
    expect(next).toEqual({ "1": { places: [place(1)] } });
  });

  it("spills to the next day of the stay when one hits the 12-place cap", () => {
    const eleven = Array.from({ length: 11 }, (_, i) => place(100 + i));
    const plans: DayPlans = { "1": { places: [place(1), place(2), place(3)] }, "2": { places: eleven } };
    const next = movePlacesOnSwap(plans, ["beaver-creek", "vail", "vail"], 1, "vail");
    expect(next["2"].places).toHaveLength(12);
    expect(next["2"].places?.[11]).toEqual(place(1));
    expect(next["3"]).toEqual({ places: [place(2), place(3)] });
    expect(next["1"]).toBeUndefined();
  });

  it("does not duplicate a place already saved on another day", () => {
    const plans: DayPlans = { "1": { places: [place(1), place(2)] }, "3": { places: [place(1)] } };
    const next = movePlacesOnSwap(plans, ["beaver-creek", "vail", "vail"], 1, "vail");
    expect(next).toEqual({ "2": { places: [place(2)] }, "3": { places: [place(1)] } });
  });

  it("keeps the places on another visit to the old mountain", () => {
    const plans: DayPlans = { "1": { places: [place(1)] } };
    expect(movePlacesOnSwap(plans, ["aspen", "beaver-creek", "vail"], 1, "vail")).toEqual({
      "3": { places: [place(1)] },
    });
  });

  it("drops the places (keeping the note) only when no day at the old mountain is left", () => {
    const plans: DayPlans = { "1": { note: "n", places: [place(1)] }, "2": { places: [place(9)] } };
    expect(movePlacesOnSwap(plans, ["beaver-creek", "aspen"], 1, "vail")).toEqual({
      "1": { note: "n" },
      "2": { places: [place(9)] },
    });
  });

  it("changes nothing when the day has no places or kept its mountain", () => {
    const plans: DayPlans = { "1": { note: "n" }, "2": { places: [place(1)] } };
    expect(movePlacesOnSwap(plans, ["beaver-creek", "vail"], 1, "vail")).toBe(plans);
    expect(movePlacesOnSwap(plans, ["vail", "vail"], 2, "vail")).toBe(plans);
  });
});
