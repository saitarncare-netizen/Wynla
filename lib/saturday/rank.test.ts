import { describe, expect, it } from "vitest";
import resortsFixture from "./__fixtures__/resorts.json";
import offSeasonFixture from "./__fixtures__/resorts-off-season.json";
import powderFixture from "./__fixtures__/weather-powder.json";
import rainFixture from "./__fixtures__/weather-rain.json";
import staleFixture from "./__fixtures__/weather-stale.json";
import {
  accessFor,
  confidenceFor,
  rankForSaturday,
  WEIGHTS,
  type DriveInfo,
  type RankInput,
  type RankResort,
  type RankWeather,
} from "./rank";

// Thursday 2027-01-14 09:00 EST; the coming Saturday is Jan 16.
const NOW = new Date("2027-01-14T14:00:00Z");
const TARGET = "2027-01-16";
const NYC = { lat: 40.7128, lon: -74.006, name: "NYC" };

const resorts = resortsFixture as unknown as RankResort[];
const offSeasonResorts = offSeasonFixture as unknown as RankResort[];

function weatherMap(fixture: Record<string, RankWeather>, rows: RankResort[]): Map<number, RankWeather> {
  const m = new Map<number, RankWeather>();
  for (const r of rows) {
    const w = fixture[r.slug];
    if (w) m.set(r.id, w);
  }
  return m;
}

// Sugarbush has a cached road route (4 h 50 m); everything else is estimated.
const cachedDrives = new Map<number, DriveInfo>([[1, { seconds: 17_400, meters: 470_000, estimated: false }]]);

function run(overrides: Partial<RankInput> = {}) {
  return rankForSaturday({
    resorts,
    weatherById: weatherMap(powderFixture as unknown as Record<string, RankWeather>, resorts),
    driveById: cachedDrives,
    passFamily: "ikon",
    product: "ikon-pass",
    origin: NYC,
    targetDate: TARGET,
    maxDriveHours: 6,
    now: NOW,
    ...overrides,
  });
}

describe("rankForSaturday — a powder Saturday from NYC on the Ikon Pass", () => {
  const result = run();

  it("puts the storm resort first with a plain reason and the surface it will ski like", () => {
    expect(result.mode).toBe("picks");
    expect(result.horizonDays).toBe(2);
    const top = result.picks[0];
    expect(top.resort.slug).toBe("sugarbush");
    expect(top.snow.expectedIn).toBe(10);
    expect(top.surface).toMatchObject({ dormant: false, code: "PP", basis: "classified" });
    expect(top.reason).toBe("10 in expected Fri into Sat, powder by first chair, 4h 50m drive");
    expect(top.breakdown.snow).toBe(40);
    expect(top.breakdown.open).toBe(WEIGHTS.verifiedOpen);
  });

  it("caps the surface confidence by the forecast horizon", () => {
    const top = result.picks[0];
    // The classifier says high for a 4" cold day; two days out that is medium.
    expect(top.surface).toMatchObject({ confidence: "medium" });
    expect(top.confidence).toBe("Medium");
    expect(top.confidenceWhy).toContain("2 days out");
  });

  it("labels an estimated drive with ≈ and a cached route without", () => {
    const sugarbush = result.picks.find((p) => p.resort.slug === "sugarbush")!;
    const killington = result.picks.find((p) => p.resort.slug === "killington")!;
    expect(sugarbush.drive.estimated).toBe(false);
    expect(sugarbush.drive.label).toBe("4h 50m");
    expect(killington.drive.estimated).toBe(true);
    expect(killington.drive.label.startsWith("≈")).toBe(true);
    expect(killington.reason).toMatch(/≈\dh \d\dm drive$/);
  });

  it("only lists Ikon resorts, and never a resort it cannot confirm is running", () => {
    const slugs = [...result.picks, ...result.runnersUp].map((p) => p.resort.slug);
    expect(slugs).toEqual(["sugarbush", "killington"]);
    // Whiteface has no season text and no verified flag: excluded, with the
    // reason, and only when the pass filter is off (it is on no pass here).
    expect(result.excluded.find((e) => e.resort.slug === "whiteface-mountain")).toBeUndefined();
    const anyPass = run({ passFamily: null, product: null, maxDriveHours: 6 });
    const whiteface = anyPass.excluded.find((e) => e.resort.slug === "whiteface-mountain");
    expect(whiteface?.kind).toBe("unknown");
    expect(whiteface?.reason).toBe("Cannot confirm the lifts are running");
  });

  it("drops fly-distance resorts by the drive cap without listing them", () => {
    expect(result.tooFarCount).toBeGreaterThanOrEqual(1);
    expect(result.excluded.some((e) => e.resort.slug === "vail")).toBe(false);
    expect([...result.picks, ...result.runnersUp].some((p) => p.resort.slug === "vail")).toBe(false);
  });

  it("explains its inputs with their freshness", () => {
    const labels = result.inputs.map((i) => i.label);
    expect(labels).toEqual(expect.arrayContaining(["Forecast", "Measured snow", "Drive times", "Pass rules"]));
    expect(result.inputs.find((i) => i.label === "Forecast")?.value).toContain("2 h ago");
    expect(result.inputs.find((i) => i.label === "Drive times")?.value).toContain("≈");
  });
});

describe("rankForSaturday — blackout dates", () => {
  it("excludes an Ikon Base resort on a blackout Saturday and says why", () => {
    const result = run({ product: "ikon-base-pass" });
    expect(result.picks).toHaveLength(0);
    expect(result.mode).toBe("no-picks");
    const sugarbush = result.excluded.find((e) => e.resort.slug === "sugarbush");
    expect(sugarbush?.kind).toBe("blackout");
    expect(sugarbush?.reason).toBe("Ikon Base blackout on Jan 16");
    expect(result.excluded.find((e) => e.resort.slug === "killington")?.kind).toBe("blackout");
  });

  it("prints the day limit and the no-blackout check on a normal Saturday", () => {
    const result = run({ product: "ikon-base-pass", targetDate: "2027-01-23" });
    const killington = [...result.picks, ...result.runnersUp].find((p) => p.resort.slug === "killington")!;
    expect(killington.access.line).toContain("Ikon Base: 5 days (shared across Killington and Pico)");
    expect(killington.access.line).toContain("no blackout Jan 23");
    expect(killington.access.blackout).toBe(false);
    expect(killington.access.verified).toBe(true);
  });

  it("never prints an unpublished blackout list as open", () => {
    const jay = resorts.find((r) => r.slug === "jay-peak")!;
    const { access, exclude } = accessFor(jay, "indy", "indy-base-pass", TARGET);
    expect(exclude).toBeNull();
    expect(access?.blackout).toBeNull();
    expect(access?.line).toContain("blackouts not announced yet");
  });

  it("keeps a resort the family lists but the dataset lacks, marked unverified", () => {
    const mystery: RankResort = { ...resorts[0], slug: "no-such-resort", passes: ["ikon"] };
    const { access, exclude } = accessFor(mystery, "ikon", "ikon-pass", TARGET);
    expect(exclude).toBeNull();
    expect(access?.verified).toBe(false);
    expect(access?.line).toContain("not verified");
  });
});

describe("rankForSaturday — a rain day on the Epic Pass", () => {
  const result = run({
    passFamily: "epic",
    product: "epic-pass",
    weatherById: weatherMap(rainFixture as unknown as Record<string, RankWeather>, resorts),
  });

  it("calls the rained-on resort icy and ranks the cold dry one above it", () => {
    const hunter = [...result.picks, ...result.runnersUp].find((p) => p.resort.slug === "hunter-mountain")!;
    const mountSnow = [...result.picks, ...result.runnersUp].find((p) => p.resort.slug === "mount-snow")!;
    expect(hunter.surface).toMatchObject({ dormant: false, code: "IP" });
    expect(hunter.breakdown.surface).toBeLessThan(0);
    expect(hunter.reason).toContain("icy, edges required");
    expect(mountSnow.surface).toMatchObject({ dormant: false, code: "PPC" });
    expect(mountSnow.rank).toBeLessThan(hunter.rank);
  });

  it("includes an announced opening-day resort without a surface call", () => {
    const stowe = [...result.picks, ...result.runnersUp].find((p) => p.resort.slug === "stowe-mountain-resort")!;
    expect(stowe.openingDay).toBe(true);
    expect(stowe.surface.dormant).toBe(true);
    expect(stowe.reason).toContain("opening day");
    expect(stowe.breakdown.open).toBe(0);
  });
});

describe("rankForSaturday — wind hold", () => {
  it("penalises forecast gusts above the chair threshold and says lifts may close", () => {
    const result = run({ passFamily: "indy", product: "indy-plus-pass", maxDriveHours: 7 });
    const jay = result.picks.find((p) => p.resort.slug === "jay-peak")!;
    expect(jay.windHold.level).toBe("high-risk");
    expect(jay.windHold.basis).toBe("gust");
    expect(jay.breakdown.wind).toBe(WEIGHTS.windHighRisk);
    expect(jay.reason).toContain("gusts to 55 mph may close lifts");
  });
});

describe("rankForSaturday — off-season", () => {
  it("shows the opening countdown instead of picks before the season", () => {
    const now = new Date("2026-09-24T14:00:00Z");
    const result = rankForSaturday({
      resorts: offSeasonResorts,
      weatherById: new Map(),
      passFamily: null,
      product: null,
      origin: NYC,
      targetDate: "2026-09-26",
      maxDriveHours: 6,
      now,
    });
    expect(result.mode).toBe("off-season");
    expect(result.globalOffSeason).toBe(true);
    expect(result.picks).toHaveLength(0);
    expect(result.countdown.map((c) => c.resort.slug)).toEqual(["killington", "sugarbush", "hunter-mountain"]);
    expect(result.countdown[0]).toMatchObject({ opensOn: "2026-11-14", projected: true });
    expect(result.countdown[1]).toMatchObject({ opensOn: "2026-11-21", projected: false, approximate: false });
    expect(result.countdown[2]).toMatchObject({ approximate: true });
    expect(result.countdown[1].daysUntilOpen).toBe(58);
  });

  it("filters the countdown by pass family", () => {
    const now = new Date("2026-09-24T14:00:00Z");
    const result = rankForSaturday({
      resorts: offSeasonResorts,
      weatherById: new Map(),
      passFamily: "ikon",
      product: "ikon-pass",
      origin: NYC,
      targetDate: "2026-09-26",
      maxDriveHours: 6,
      now,
    });
    expect(result.mode).toBe("off-season");
    expect(result.countdown.map((c) => c.resort.slug)).toEqual(["killington", "sugarbush"]);
    expect(result.countdown[1].access?.line).toBe("Ikon: unlimited · no blackout Sep 26");
  });

  it("does not treat a projected opening as an opening day", () => {
    const now = new Date("2026-11-12T14:00:00Z");
    const result = rankForSaturday({
      resorts: offSeasonResorts,
      weatherById: new Map(),
      passFamily: "ikon",
      product: "ikon-pass",
      origin: NYC,
      targetDate: "2026-11-14",
      maxDriveHours: 6,
      now,
    });
    const killington = result.excluded.find((e) => e.resort.slug === "killington");
    expect(killington?.kind).toBe("projected");
    expect(killington?.reason).toContain("not confirmed");
  });
});

describe("confidence tag", () => {
  it("follows the horizon", () => {
    expect(confidenceFor({ horizonDays: 0, forecastAgeHours: 2, hasTargetForecast: true, surfaceUnavailable: false }).tag).toBe("High");
    expect(confidenceFor({ horizonDays: 1, forecastAgeHours: 2, hasTargetForecast: true, surfaceUnavailable: false }).tag).toBe("High");
    expect(confidenceFor({ horizonDays: 2, forecastAgeHours: 2, hasTargetForecast: true, surfaceUnavailable: false }).tag).toBe("Medium");
    expect(confidenceFor({ horizonDays: 5, forecastAgeHours: 2, hasTargetForecast: true, surfaceUnavailable: false }).tag).toBe("Low");
  });

  it("steps down for stale or missing data", () => {
    expect(confidenceFor({ horizonDays: 0, forecastAgeHours: 40, hasTargetForecast: true, surfaceUnavailable: false }).tag).toBe("Medium");
    expect(confidenceFor({ horizonDays: 0, forecastAgeHours: null, hasTargetForecast: true, surfaceUnavailable: false }).tag).toBe("Medium");
    expect(confidenceFor({ horizonDays: 0, forecastAgeHours: 2, hasTargetForecast: false, surfaceUnavailable: false }).tag).toBe("Low");
    expect(confidenceFor({ horizonDays: 0, forecastAgeHours: 2, hasTargetForecast: true, surfaceUnavailable: true }).tag).toBe("Medium");
  });

  it("goes dormant on stale weather rather than inventing a surface", () => {
    const result = run({
      weatherById: weatherMap(staleFixture as unknown as Record<string, RankWeather>, resorts),
    });
    const top = result.picks[0];
    expect(top.surface.dormant).toBe(true);
    expect(top.confidence).toBe("Low");
    expect(top.confidenceWhy).toContain("forecast last refreshed");
  });
});
