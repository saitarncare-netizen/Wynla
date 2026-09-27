import { describe, expect, it } from "vitest";
import {
  appendStop,
  daysParamValue,
  daysToCoverPlan,
  draftSlugsKey,
  fitTripDays,
  MAX_TRIP_DAYS,
  newStopDayCap,
  parseDraft,
  planActionLabel,
  plannedDays,
  plannerParamsKeptByClearAll,
  SESSION_DRAFT_TTL_MS,
  sheetClosesForPlanner,
  stepStopDays,
  tripDaysFromParam,
} from "./plannerDraft";

const NOW = 1_800_000_000_000;
const HOUR = 60 * 60 * 1000;

describe("parseDraft", () => {
  it("reads a fresh draft and floors fractional day counts", () => {
    const raw = JSON.stringify({
      stops: [{ slug: "vail", days: 2.7 }],
      draftName: "Vail weekend",
      startDate: "2026-12-19",
      days: 3,
      savedAt: NOW - 1000,
    });
    expect(parseDraft(raw, HOUR, NOW)).toEqual({
      stops: [{ slug: "vail", days: 2 }],
      draftName: "Vail weekend",
      startDate: "2026-12-19",
      days: 3,
      savedAt: NOW - 1000,
      pendingSave: false,
    });
  });

  it("still loads drafts saved while the cost estimate existed", () => {
    // Pre-2026-09-27 drafts carry partySize; it is ignored, not an error.
    const raw = JSON.stringify({ stops: [{ slug: "vail", days: 1 }], draftName: "", partySize: 4, savedAt: NOW });
    const draft = parseDraft(raw, HOUR, NOW);
    expect(draft?.stops).toEqual([{ slug: "vail", days: 1 }]);
    expect(draft && "partySize" in draft).toBe(false);
  });

  it("keeps the Save stash flag only when it is literally true", () => {
    const base = { stops: [{ slug: "vail", days: 1 }], savedAt: NOW };
    expect(parseDraft(JSON.stringify({ ...base, pendingSave: true }), HOUR, NOW)?.pendingSave).toBe(true);
    expect(parseDraft(JSON.stringify({ ...base, pendingSave: "yes" }), HOUR, NOW)?.pendingSave).toBe(false);
  });

  it("drops expired, malformed and empty drafts", () => {
    const stops = [{ slug: "vail", days: 1 }];
    expect(parseDraft(null, HOUR, NOW)).toBeNull();
    expect(parseDraft("{nope", HOUR, NOW)).toBeNull();
    expect(parseDraft("null", HOUR, NOW)).toBeNull();
    expect(parseDraft(JSON.stringify({ stops, savedAt: NOW - HOUR }), HOUR, NOW)).toBeNull();
    expect(parseDraft(JSON.stringify({ stops: "vail", savedAt: NOW }), HOUR, NOW)).toBeNull();
    expect(parseDraft(JSON.stringify({ stops: [{ slug: "", days: 1 }, { slug: "x", days: 0 }], savedAt: NOW }), HOUR, NOW)).toBeNull();
  });

  it("clamps the stored trip length into 1..MAX_TRIP_DAYS", () => {
    const stops = [{ slug: "vail", days: 1 }];
    expect(parseDraft(JSON.stringify({ stops, days: 40, savedAt: NOW }), HOUR, NOW)?.days).toBe(MAX_TRIP_DAYS);
    expect(parseDraft(JSON.stringify({ stops, days: 0, savedAt: NOW }), HOUR, NOW)?.days).toBe(1);
    expect(parseDraft(JSON.stringify({ stops, savedAt: NOW }), HOUR, NOW)?.days).toBeUndefined();
  });
});

describe("draftSlugsKey", () => {
  it("lists the stop slugs of a live session draft, empty otherwise", () => {
    const raw = JSON.stringify({ stops: [{ slug: "vail", days: 2 }, { slug: "aspen-snowmass", days: 1 }], savedAt: NOW });
    expect(draftSlugsKey(raw, NOW)).toBe("vail,aspen-snowmass");
    expect(draftSlugsKey(raw, NOW + SESSION_DRAFT_TTL_MS)).toBe("");
    expect(draftSlugsKey(null, NOW)).toBe("");
  });
});

describe("planActionLabel", () => {
  it("says Plan trip when no trip is being planned", () => {
    expect(planActionLabel([], "vail")).toEqual({ label: "Plan trip", inTrip: false });
  });

  it("says Add to trip when the resort would be a new stop", () => {
    expect(planActionLabel(["aspen-snowmass"], "vail")).toEqual({ label: "Add to trip", inTrip: false });
  });

  it("says View trip when the resort is already a stop, wherever it sits", () => {
    expect(planActionLabel(["vail"], "vail")).toEqual({ label: "View trip", inTrip: true });
    expect(planActionLabel(["aspen-snowmass", "vail"], "vail")).toEqual({ label: "View trip", inTrip: true });
  });

  it("matches whole slugs only", () => {
    // "vail" is not a stop just because "vail-pass" is.
    expect(planActionLabel(["vail-pass"], "vail").inTrip).toBe(false);
  });
});

describe("plannerParamsKeptByClearAll", () => {
  const kept = (qs: string) => plannerParamsKeptByClearAll(new URLSearchParams(qs)).toString();

  it("keeps the trip's origin while the planner is open", () => {
    expect(
      kept("pass=ikon&within=3&from=geo&fromLat=39.74&fromLng=-104.99&fromLabel=Denver&days=3&plan=1"),
    ).toBe("days=3&plan=1&from=geo&fromLat=39.74&fromLng=-104.99&fromLabel=Denver");
    expect(kept("pass=epic&from=BOS&plan=1")).toBe("plan=1&from=BOS");
  });

  it("drops the origin when the planner is closed, so it falls back to the stored choice", () => {
    expect(kept("pass=ikon&from=geo&fromLat=39.74&fromLng=-104.99&days=2")).toBe("days=2");
    expect(kept("from=BOS&plan=0")).toBe("");
  });

  it("keeps ?days and ?plan but no filter", () => {
    expect(kept("pass=ikon,epic&size=large&night=1&within=2&days=4&plan=1")).toBe("days=4&plan=1");
    expect(kept("pass=ikon")).toBe("");
  });

  it("skips empty origin params instead of writing them back blank", () => {
    expect(kept("plan=1&from=&fromLabel=")).toBe("plan=1");
  });
});

describe("sheetClosesForPlanner", () => {
  it("closes an open resort sheet on phones only", () => {
    expect(sheetClosesForPlanner(false, 12)).toBe(true);
    // Desktop: the rail sits beside the planner.
    expect(sheetClosesForPlanner(true, 12)).toBe(false);
    // Nothing selected: nothing to close (id 0 is still a selection).
    expect(sheetClosesForPlanner(false, null)).toBe(false);
    expect(sheetClosesForPlanner(false, 0)).toBe(true);
  });
});

describe("appendStop", () => {
  const trip = [
    { slug: "vail", days: 2 },
    { slug: "beaver-creek", days: 1 },
  ];

  it("adds the resort as a 1-day last stop and grows a fully planned trip", () => {
    const out = appendStop(trip, "breckenridge", 3);
    expect(out.status).toBe("added");
    expect(out.stops).toEqual([...trip, { slug: "breckenridge", days: 1 }]);
    expect(out.days).toBe(4);
    // Never mutates the caller's array.
    expect(trip).toHaveLength(2);
  });

  it("uses an unplanned day before growing the trip", () => {
    const out = appendStop(trip, "breckenridge", 5);
    expect(out.status).toBe("added");
    expect(out.days).toBe(5);
  });

  it("starts a trip when there is no draft", () => {
    expect(appendStop([], "vail", 1)).toEqual({ status: "added", stops: [{ slug: "vail", days: 1 }], days: 1 });
  });

  it("leaves the trip alone when the resort is already a stop", () => {
    const out = appendStop(trip, "vail", 3);
    expect(out.status).toBe("exists");
    expect(out.stops).toBe(trip);
    expect(out.days).toBe(3);
  });

  it("refuses to pass the day cap", () => {
    const full = [{ slug: "vail", days: MAX_TRIP_DAYS }];
    const out = appendStop(full, "aspen", MAX_TRIP_DAYS);
    expect(out.status).toBe("full");
    expect(out.stops).toBe(full);
    expect(out.days).toBe(MAX_TRIP_DAYS);
  });
});

describe("stepStopDays", () => {
  const trip = [
    { slug: "vail", days: 1 },
    { slug: "aspen", days: 2 },
  ];

  it("grows the stop and the trip together (1-day seed becomes a weekend)", () => {
    const out = stepStopDays([{ slug: "vail", days: 1 }], 0, 1, 1);
    expect(out).toEqual({ stops: [{ slug: "vail", days: 2 }], days: 2 });
  });

  it("fills an unplanned day before growing the trip", () => {
    const out = stepStopDays(trip, 0, 1, 5);
    expect(out.stops[0].days).toBe(2);
    expect(out.days).toBe(5);
  });

  it("shrinks a fully planned trip with the stop", () => {
    const out = stepStopDays(trip, 1, -1, 3);
    expect(out).toEqual({ stops: [{ slug: "vail", days: 1 }, { slug: "aspen", days: 1 }], days: 2 });
  });

  it("keeps the trip length when it still had unplanned days", () => {
    const out = stepStopDays(trip, 1, -1, 6);
    expect(out.stops[1].days).toBe(1);
    expect(out.days).toBe(6);
  });

  it("is a no-op below one day, at the cap, or for a bad index", () => {
    const atMin = stepStopDays(trip, 0, -1, 3);
    expect(atMin.stops).toBe(trip);
    expect(atMin.days).toBe(3);
    const full = [{ slug: "vail", days: MAX_TRIP_DAYS }];
    expect(stepStopDays(full, 0, 1, MAX_TRIP_DAYS).stops).toBe(full);
    expect(stepStopDays(trip, 5, 1, 3).stops).toBe(trip);
  });
});

describe("day helpers", () => {
  it("sums planned days", () => {
    expect(plannedDays([])).toBe(0);
    expect(plannedDays([{ slug: "a", days: 2 }, { slug: "b", days: 3 }])).toBe(5);
  });

  it("caps a new stop at what the 14-day limit leaves, at least one", () => {
    expect(newStopDayCap(0)).toBe(MAX_TRIP_DAYS);
    expect(newStopDayCap(10)).toBe(4);
    expect(newStopDayCap(MAX_TRIP_DAYS)).toBe(1);
  });

  it("fits the trip length around the plan within 1..cap", () => {
    expect(fitTripDays(3, 5)).toBe(5);
    expect(fitTripDays(7, 5)).toBe(7);
    expect(fitTripDays(0, 0)).toBe(1);
    expect(fitTripDays(3, 20)).toBe(MAX_TRIP_DAYS);
  });

  it("raises a ?days that fell under the plan instead of cutting stops", () => {
    // Vail + Aspen collected from two sheets (2 days), then ?days dropped
    // (back press to an older URL): the trip goes back to 2 days.
    expect(daysToCoverPlan(null, 2)).toBe(2);
    expect(daysToCoverPlan("1", 2)).toBe(2);
    expect(daysToCoverPlan("junk", 3)).toBe(3);
  });

  it("leaves ?days alone when it already covers the plan", () => {
    expect(daysToCoverPlan("2", 2)).toBeNull();
    expect(daysToCoverPlan("5", 3)).toBeNull();
    expect(daysToCoverPlan(null, 1)).toBeNull();
    expect(daysToCoverPlan(null, 0)).toBeNull();
  });

  it("never asks for more than the day cap", () => {
    expect(daysToCoverPlan("3", 20)).toBe(MAX_TRIP_DAYS);
    // Already at the cap: no write, so a plan past the cap cannot loop.
    expect(daysToCoverPlan(String(MAX_TRIP_DAYS), 20)).toBeNull();
    expect(daysToCoverPlan("30", 20)).toBeNull();
  });

  it("parses and writes ?days the way MapPage does", () => {
    expect(tripDaysFromParam(null)).toBe(1);
    expect(tripDaysFromParam("abc")).toBe(1);
    expect(tripDaysFromParam("-2")).toBe(1);
    expect(tripDaysFromParam("4")).toBe(4);
    expect(tripDaysFromParam("30")).toBe(MAX_TRIP_DAYS);
    expect(daysParamValue(1)).toBeNull();
    expect(daysParamValue(3)).toBe("3");
  });
});
