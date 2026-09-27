import { describe, expect, it } from "vitest";
import {
  MAX_PLACES_PER_DAY,
  parseDayPlans,
  placeKey,
  placeKeysOutsideDay,
  unionPlaces,
  withDayPlan,
  type DayPlace,
} from "./dayPlans";

const place = (id: number, kind: DayPlace["kind"] = "restaurant"): DayPlace => ({
  id,
  kind,
  name: `Place ${id}`,
  category: null,
  latitude: null,
  longitude: null,
  website_url: null,
});

describe("parseDayPlans", () => {
  it("returns {} for anything that is not a plain object", () => {
    expect(parseDayPlans(null)).toEqual({});
    expect(parseDayPlans([])).toEqual({});
    expect(parseDayPlans("x")).toEqual({});
  });
  it("keeps numeric day keys and drops malformed places", () => {
    const parsed = parseDayPlans({
      "1": { note: "  ", places: [{ id: 1, kind: "restaurant", name: "A" }, { id: "2", kind: "restaurant", name: "B" }] },
      "2": { places: [{ id: 3, kind: "bar", name: "C" }] },
      x: { note: "not a day" },
    });
    expect(parsed).toEqual({
      "1": {
        places: [{ id: 1, kind: "restaurant", name: "A", category: null, latitude: null, longitude: null, website_url: null }],
      },
    });
  });
  it("caps places per day", () => {
    const many = Array.from({ length: MAX_PLACES_PER_DAY + 3 }, (_, i) => place(i + 1));
    expect(parseDayPlans({ "1": { places: many } })["1"].places).toHaveLength(MAX_PLACES_PER_DAY);
  });
});

describe("withDayPlan", () => {
  it("sets one day without touching the others", () => {
    const next = withDayPlan({ "1": { note: "a" } }, 2, { places: [place(1)] });
    expect(next).toEqual({ "1": { note: "a" }, "2": { places: [place(1)] } });
  });
  it("drops a day that becomes empty", () => {
    expect(withDayPlan({ "1": { note: "a" } }, 1, { note: " ", places: [] })).toEqual({});
  });
});

describe("unionPlaces", () => {
  const plans = {
    "1": { places: [place(1), place(2, "activity")] },
    "2": { places: [place(2), place(1)] },
  };
  it("follows the day order given and dedupes by kind + id", () => {
    expect(unionPlaces(plans, [2, 1]).map(placeKey)).toEqual(["restaurant:2", "restaurant:1", "activity:2"]);
    expect(unionPlaces(plans, [1, 2]).map(placeKey)).toEqual(["restaurant:1", "activity:2", "restaurant:2"]);
  });
  it("ignores days with no plan", () => {
    expect(unionPlaces(plans, [3, 4])).toEqual([]);
  });
});

describe("placeKeysOutsideDay", () => {
  const plans = {
    "1": { note: "leave at 7", places: [place(1), place(2, "activity")] },
    "2": { places: [place(3)] },
    "4": { places: [place(1)] },
  };
  it("lists the places saved on every other day, deduped", () => {
    expect(placeKeysOutsideDay(plans, 2).sort()).toEqual(["activity:2", "restaurant:1"]);
    expect(placeKeysOutsideDay(plans, 1).sort()).toEqual(["restaurant:1", "restaurant:3"]);
  });
  it("is everything for a day with no plan, and nothing for an empty trip", () => {
    expect(placeKeysOutsideDay(plans, 3).sort()).toEqual(["activity:2", "restaurant:1", "restaurant:3"]);
    expect(placeKeysOutsideDay({}, 1)).toEqual([]);
  });
});
