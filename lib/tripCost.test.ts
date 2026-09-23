import { describe, expect, it } from "vitest";
import {
  clampPartySize,
  estimateTripCost,
  metersToMiles,
  nightsForDays,
} from "./tripCost";

const noPasses = new Map<string, string[]>();

describe("nightsForDays", () => {
  it("charges no hotel night for a day trip", () => {
    expect(nightsForDays(1)).toBe(0);
    expect(nightsForDays(0)).toBe(0);
  });

  it("sleeps between ski days, not after the last one", () => {
    expect(nightsForDays(2)).toBe(1);
    expect(nightsForDays(5)).toBe(4);
  });
});

describe("clampPartySize", () => {
  it("defaults to one person for missing or invalid input", () => {
    expect(clampPartySize(undefined)).toBe(1);
    expect(clampPartySize(null)).toBe(1);
    expect(clampPartySize(Number.NaN)).toBe(1);
  });

  it("clamps into the supported range and rounds", () => {
    expect(clampPartySize(0)).toBe(1);
    expect(clampPartySize(2.4)).toBe(2);
    expect(clampPartySize(50)).toBe(8);
  });
});

describe("estimateTripCost", () => {
  it("prices a 1-day trip with tickets and driving but no lodging", () => {
    const out = estimateTripCost(["vail"], [1], noPasses, 100, [], {
      ticketPriceMin: new Map([["vail", 100]]),
      ticketPriceMax: new Map([["vail", 200]]),
    });
    expect(out.totalDays).toBe(1);
    expect(out.nights).toBe(0);
    expect(out.lodging).toBe(0);
    expect(out.liftTickets).toBe(150);
    expect(out.driving).toBe(18);
    expect(out.totalLow).toBe(100 + 0 + 18);
    expect(out.totalHigh).toBe(200 + 0 + 18);
    expect(out.passCoversAll).toBe(false);
  });

  it("multiplies tickets per person but shares rooms and cars", () => {
    const solo = estimateTripCost(["vail"], [3], noPasses, 200, [], {
      ticketPriceMin: new Map([["vail", 100]]),
      ticketPriceMax: new Map([["vail", 100]]),
      partySize: 1,
    });
    const pair = estimateTripCost(["vail"], [3], noPasses, 200, [], {
      ticketPriceMin: new Map([["vail", 100]]),
      ticketPriceMax: new Map([["vail", 100]]),
      partySize: 2,
    });
    // Tickets: 3 days × $100 each → $300 solo, $600 for two.
    expect(solo.liftTickets).toBe(300);
    expect(pair.liftTickets).toBe(600);
    // Lodging: 2 nights × $150 × 1 room, whether one or two people.
    expect(solo.rooms).toBe(1);
    expect(pair.rooms).toBe(1);
    expect(solo.lodging).toBe(300);
    expect(pair.lodging).toBe(300);
    // Driving: one car either way.
    expect(solo.cars).toBe(1);
    expect(pair.cars).toBe(1);
    expect(solo.driving).toBe(36);
    expect(pair.driving).toBe(36);
    // Per-person share of the group total halves the shared buckets.
    expect(pair.perPersonLow).toBe(Math.round(pair.totalLow / 2));
    expect(pair.perPersonHigh).toBe(Math.round(pair.totalHigh / 2));
    expect(pair.perPersonLow).toBeLessThan(solo.totalLow);
  });

  it("adds a second room at three people and a second car at six", () => {
    const three = estimateTripCost(["vail"], [2], noPasses, 100, [], { partySize: 3 });
    const six = estimateTripCost(["vail"], [2], noPasses, 100, [], { partySize: 6 });
    expect(three.rooms).toBe(2);
    expect(three.cars).toBe(1);
    expect(six.rooms).toBe(3);
    expect(six.cars).toBe(2);
    expect(six.driving).toBe(three.driving * 2);
  });

  it("zeroes tickets when the user's pass covers every stop", () => {
    const passes = new Map([
      ["vail", ["epic"]],
      ["breck", ["epic"]],
    ]);
    const out = estimateTripCost(["vail", "breck"], [2, 2], passes, 300, ["EPIC"]);
    expect(out.passCoversAll).toBe(true);
    expect(out.liftTickets).toBe(0);
    expect(out.totalLow).toBe(out.lodging === 0 ? out.driving : 3 * 80 + out.driving);
  });

  it("only flags passCoversAll when every stop is covered", () => {
    const passes = new Map([
      ["vail", ["epic"]],
      ["copper", ["ikon"]],
    ]);
    const out = estimateTripCost(["vail", "copper"], [1, 1], passes, 0, ["epic"]);
    expect(out.passCoversAll).toBe(false);
    // Only Copper's day is charged, at the fallback midpoint.
    expect(out.liftTickets).toBe(150);
  });

  it("uses the fallback ticket range when the resort has no price", () => {
    const out = estimateTripCost(["mystery"], [1], noPasses, 0, []);
    expect(out.liftTickets).toBe(150);
    expect(out.totalLow).toBe(90);
    expect(out.totalHigh).toBe(220);
  });

  it("uses the one known ticket bound as the midpoint", () => {
    const minOnly = estimateTripCost(["a"], [1], noPasses, 0, [], {
      ticketPriceMin: new Map([["a", 120]]),
    });
    expect(minOnly.liftTickets).toBe(120);
    expect(minOnly.totalHigh).toBe(220);
  });

  it("returns an all-zero breakdown for an empty trip", () => {
    const out = estimateTripCost([], [], noPasses, 0, ["ikon"]);
    expect(out.totalDays).toBe(0);
    expect(out.nights).toBe(0);
    expect(out.totalLow).toBe(0);
    expect(out.totalHigh).toBe(0);
    expect(out.passCoversAll).toBe(false);
  });

  it("ignores negative or non-finite mileage", () => {
    expect(estimateTripCost(["a"], [1], noPasses, -50, []).driving).toBe(0);
    expect(estimateTripCost(["a"], [1], noPasses, Number.NaN, []).driving).toBe(0);
  });
});

describe("metersToMiles", () => {
  it("converts using the statute mile", () => {
    expect(metersToMiles(1609.34)).toBeCloseTo(1, 6);
  });
});
