import { describe, expect, it } from "vitest";
import { isPowderDay, verdict, type VerdictResort, type VerdictWeather } from "./goWaitSkip";
import type { ForecastHour, ForecastJsonV2, MeasuredSnow } from "./weather/forecastJson";

// A Vermont hill (America/New_York) on a mid-January Wednesday, 7 am
// local. Killington is used so the pass-blackout tests hit real rows in
// lib/data/passAccess.json (Ikon Base is blacked out Jan 16-17 2027).
const NOW = new Date("2027-01-13T12:00:00Z");
const TODAY = "2027-01-13";
const EST_OFFSET_H = 5;

function iso(hoursAgo: number, now: Date = NOW): string {
  return new Date(now.getTime() - hoursAgo * 36e5).toISOString();
}

function resort(patch: Partial<VerdictResort> = {}): VerdictResort {
  return {
    slug: "killington",
    state: "VT",
    latitude: 43.6,
    longitude: -72.8,
    tier: "featured",
    vertical_drop: 3050,
    operating_status: "active",
    currently_open: true,
    snow_report_status: "no_feed",
    snow_report_updated_at: iso(2),
    season_open_text: "November 20",
    season_close_text: "May 1",
    snow_new_24h_in: null,
    snow_base_depth_in: 40,
    lifts_open_today: null,
    total_lifts: 21,
    wind_hold_mph_chair: null,
    wind_hold_mph_gondola: null,
    lift_types: { high_speed_quad: 6, gondola: 2 },
    ...patch,
  };
}

/** One hourly row at a resort-local hour on the fixture day. */
function hour(localHour: number, patch: Partial<ForecastHour> = {}): ForecastHour {
  const utc = new Date(Date.UTC(2027, 0, 13, localHour + EST_OFFSET_H, 0, 0));
  return {
    time: utc.toISOString(),
    temp_f: 28,
    temp_summit_f: 22,
    snow_in: 0,
    snow_summit_in: 0,
    rain_in: 0,
    wind_mph: 10,
    gust_mph: 18,
    wind_dir: "NW",
    freezing_level_ft: null,
    conditions_short: "Cloudy",
    ...patch,
  };
}

/** A full ski day (6 am to 5 pm) of calm, cold, dry hours. */
function calmDay(mutate: (h: ForecastHour, localHour: number) => ForecastHour = (h) => h): ForecastHour[] {
  const out: ForecastHour[] = [];
  for (let h = 6; h <= 17; h++) out.push(mutate(hour(h), h));
  return out;
}

function measured(patch: Partial<MeasuredSnow> = {}): MeasuredSnow {
  return {
    for_date: "2027-01-12",
    sfav2_24h_in: null,
    sfav2_48h_in: null,
    sfav2_72h_in: null,
    sfav2_valid_end: iso(6),
    sfav2_file: null,
    snodas_depth_in: null,
    snodas_swe_in: null,
    snodas_valid: null,
    snodas_raw: null,
    snotel: null,
    history_sources: null,
    ...patch,
  };
}

function v2(patch: Partial<ForecastJsonV2> = {}): ForecastJsonV2 {
  return {
    v: 2,
    updated_at: iso(1),
    days: [
      {
        date: TODAY,
        weekday: "Wed",
        temp_high_f: 30,
        temp_low_f: 18,
        conditions_short: "Cloudy",
        snow_in: 0,
        precip_chance: 10,
        wind_short: "10 mph",
        wind_dir_short: "NW",
        gust_mph: 18,
      },
      {
        date: "2027-01-14",
        weekday: "Thu",
        temp_high_f: 28,
        temp_low_f: 15,
        conditions_short: "Snow",
        snow_in: 4,
        precip_chance: 80,
        wind_short: "12 mph",
        wind_dir_short: "NW",
      },
    ],
    hourly: calmDay(),
    obs: { primary: null, stations: [], fetched_at: null },
    measured: null,
    stations: { nws: [], snotel: [], mapped_at: null },
    sources: { nws: null, open_meteo: null, attribution: [] },
    freezing_level_ft: null,
    ...patch,
  };
}

function weather(patch: Partial<VerdictWeather> = {}, json: ForecastJsonV2 = v2()): VerdictWeather {
  return {
    fetched_at: iso(1),
    temp_high_f: 30,
    temp_low_f: 18,
    conditions_short: "Cloudy",
    snow_24h_in: 0,
    wind_mph_avg: 10,
    wind_mph_gust: 18,
    forecast_json: json,
    ...patch,
  };
}

/** Seven cold, dry history days so the surface classifier has a window. */
function history() {
  const out = [];
  for (let i = 7; i >= 1; i--) {
    const d = new Date(Date.UTC(2027, 0, 13 - i));
    out.push({
      observed_date: d.toISOString().slice(0, 10),
      temp_high_f: 26,
      temp_low_f: 12,
      snow_24h_in: i === 3 ? 5 : 0,
      rain_24h_in: 0,
      precip_24h_in: i === 3 ? 0.5 : 0,
      wind_mph_avg: 8,
    });
  }
  return out;
}

describe("verdict — status gates", () => {
  it("permanently closed is a dormant skip", () => {
    const v = verdict(resort({ operating_status: "closed" }), weather(), null, { now: NOW });
    expect(v.verdict).toBe("skip");
    expect(v.dormant).toBe(true);
    expect(v.headline).toBe("Permanently closed");
    expect(v.reasons[0]).toMatch(/closed for good/);
  });

  it("a resort that opens later says how many days, not Skip", () => {
    const oct = new Date("2026-10-20T12:00:00Z");
    const v = verdict(
      resort({ currently_open: null, snow_report_status: null, snow_report_updated_at: null }),
      null,
      null,
      { now: oct },
    );
    expect(v.dormant).toBe(true);
    expect(v.opensInDays).toBe(31);
    expect(v.headline).toBe("Opens in 31 days");
    expect(v.reasons[0]).toMatch(/Verdicts start when they spin/);
  });

  it("no season evidence at all is unknown with 'check resort'", () => {
    const v = verdict(
      resort({
        currently_open: null,
        snow_report_status: null,
        snow_report_updated_at: null,
        season_open_text: null,
        season_close_text: null,
      }),
      weather(),
      null,
      { now: NOW },
    );
    expect(v.verdict).toBe("unknown");
    expect(v.headline).toBe("Check resort");
    expect(v.dormant).toBe(false);
  });

  it("stale weather is unknown, never a Go", () => {
    const v = verdict(resort(), weather({ fetched_at: iso(60) }), null, { now: NOW });
    expect(v.verdict).toBe("unknown");
    expect(v.stale).toBe(true);
    expect(v.headline).toBe("Weather not synced");
    expect(v.reasons[0]).toMatch(/60 hours ago/);
  });

  it("no weather row at all is unknown", () => {
    const v = verdict(resort(), null, null, { now: NOW });
    expect(v.verdict).toBe("unknown");
    expect(v.stale).toBe(true);
  });
});

describe("verdict — snow numbers and labels", () => {
  it("measured overnight snow above the powder line is a Go: powder day", () => {
    const v = verdict(
      resort(),
      weather({}, v2({ measured: measured({ sfav2_24h_in: 9 }) })),
      null,
      { now: NOW, history: history() },
    );
    expect(v.verdict).toBe("go");
    expect(v.headline).toBe("Go: powder day");
    expect(v.newSnow).toEqual({ inches: 9, source: "Measured", at: iso(6) });
    expect(isPowderDay(v)).toBe(true);
    expect(v.labels[0]).toEqual({ text: "9 in new snow", source: "Measured", at: iso(6) });
    expect(v.reasons[0]).toMatch(/9 in of new snow \(measured\)/);
  });

  it("a fresh resort report beats the measured analysis", () => {
    const v = verdict(
      resort({ snow_report_status: "reported", snow_new_24h_in: "7", snow_report_updated_at: iso(2) }),
      weather({}, v2({ measured: measured({ sfav2_24h_in: 3 }) })),
      null,
      { now: NOW },
    );
    expect(v.newSnow?.source).toBe("Reported");
    expect(v.newSnow?.inches).toBe(7);
  });

  it("falls back to the forecast when nothing was measured, and says so", () => {
    const json = v2();
    json.days[0].snow_in = 3;
    const v = verdict(resort(), weather({}, json), null, { now: NOW });
    expect(v.newSnow).toEqual({ inches: 3, source: "Forecast", at: iso(1) });
    expect(v.headline).toBe("Go: fresh snow");
    expect(isPowderDay(v)).toBe(false);
  });

  it("a stale measured value does not masquerade as today's snow", () => {
    const v = verdict(
      resort(),
      weather({}, v2({ measured: measured({ sfav2_24h_in: 12, sfav2_valid_end: iso(50) }) })),
      null,
      { now: NOW },
    );
    expect(v.newSnow?.source).not.toBe("Measured");
    expect(isPowderDay(v)).toBe(false);
  });

  it("every label names its source; measured and forecast ones carry a clock", () => {
    const v = verdict(resort(), weather(), null, { now: NOW, history: history() });
    expect(v.labels.length).toBeGreaterThan(2);
    for (const l of v.labels) {
      expect(["Measured", "Forecast", "Estimated", "Reported"]).toContain(l.source);
      if (l.source === "Measured" || l.source === "Forecast") expect(l.at).toBeTruthy();
    }
    expect(v.labels.at(-1)?.text).toBe(v.crowd?.label);
  });
});

describe("verdict — wind, rain and ice", () => {
  it("gusts over the lift-hold line are a Skip", () => {
    const json = v2({ hourly: calmDay((h, lh) => (lh === 11 ? { ...h, gust_mph: 60 } : h)) });
    const v = verdict(resort(), weather({}, json), null, { now: NOW });
    expect(v.verdict).toBe("skip");
    expect(v.headline).toBe("Skip: lifts may close");
    expect(v.windHold?.level).toBe("high-risk");
    expect(v.labels.some((l) => l.text === "Gusts to 60 mph" && l.source === "Forecast")).toBe(true);
  });

  it("gusts in the warning band are a Wait", () => {
    const json = v2({ hourly: calmDay((h, lh) => (lh === 13 ? { ...h, gust_mph: 40 } : h)) });
    const v = verdict(resort(), weather({}, json), null, { now: NOW });
    expect(v.verdict).toBe("wait");
    expect(v.headline).toBe("Wait: wind holds likely");
  });

  it("evening gusts after the lifts close do not count", () => {
    const json = v2({ hourly: calmDay((h, lh) => (lh === 17 ? { ...h, gust_mph: 60 } : h)) });
    const v = verdict(resort(), weather({}, json), null, { now: NOW });
    expect(v.windHold?.level).toBe("ok");
  });

  it("rain followed by a freeze is a Skip", () => {
    const json = v2({
      hourly: calmDay((h, lh) =>
        lh >= 9 && lh <= 12
          ? { ...h, rain_in: 0.04, temp_f: 36, conditions_short: "Rain" }
          : lh > 12
            ? { ...h, temp_f: 22 }
            : h,
      ),
    });
    const v = verdict(resort(), weather({}, json), null, { now: NOW });
    expect(v.verdict).toBe("skip");
    expect(v.headline).toBe("Skip: rain, then a freeze");
    expect(v.labels.some((l) => /rain$/.test(l.text))).toBe(true);
  });

  it("rain that stays mild is a Wait", () => {
    const json = v2({
      hourly: calmDay((h) => ({ ...h, rain_in: 0.02, temp_f: 38, conditions_short: "Rain" })),
    });
    json.days[0].temp_low_f = 34;
    const v = verdict(resort(), weather({ temp_low_f: 34 }, json), null, { now: NOW });
    expect(v.verdict).toBe("wait");
    expect(v.headline).toBe("Wait: rain today");
  });

  it("cold first chair that softens by lunch is a Wait", () => {
    const json = v2({
      hourly: calmDay((h, lh) => (lh <= 9 ? { ...h, temp_f: 20 } : lh >= 11 ? { ...h, temp_f: 38 } : h)),
    });
    const v = verdict(resort(), weather({}, json), null, { now: NOW });
    expect(v.verdict).toBe("wait");
    expect(v.headline).toBe("Wait: icy early, softens by 11");
  });
});

describe("verdict — pass blackouts", () => {
  const MLK_SAT = new Date("2027-01-16T12:00:00Z");

  it("a known product on a blackout day is a Skip", () => {
    const v = verdict(resort(), weather({ fetched_at: iso(1, MLK_SAT) }), { product: "Ikon Base Pass" }, { now: MLK_SAT });
    expect(v.verdict).toBe("skip");
    expect(v.blackout).toBe(true);
    expect(v.headline).toBe("Skip: blackout day");
    expect(v.reasons[0]).toMatch(/Ikon Base Pass is blacked out/);
    expect(v.labels.some((l) => l.source === "Reported" && /Blackout/.test(l.text))).toBe(true);
  });

  it("a blackout still wins when the weather is stale", () => {
    const v = verdict(resort(), weather({ fetched_at: iso(80, MLK_SAT) }), { product: "ikon-base-pass" }, { now: MLK_SAT });
    expect(v.verdict).toBe("skip");
    expect(v.stale).toBe(true);
  });

  it("a family with mixed products only warns", () => {
    const v = verdict(resort(), weather({ fetched_at: iso(1, MLK_SAT) }), { families: ["ikon"] }, { now: MLK_SAT });
    expect(v.blackout).toBeNull();
    expect(v.verdict).not.toBe("skip");
    expect(v.reasons.some((r) => /Blackout today on Ikon Base Pass, Ikon Session Pass/.test(r))).toBe(true);
  });

  it("the full Ikon Pass is not blacked out", () => {
    const v = verdict(resort(), weather({ fetched_at: iso(1, MLK_SAT) }), { product: "Ikon Pass" }, { now: MLK_SAT });
    expect(v.blackout).toBe(false);
  });

  it("an unknown product is null, never false", () => {
    const v = verdict(resort(), weather(), { product: "Made Up Pass" }, { now: NOW });
    expect(v.blackout).toBeNull();
  });
});

describe("verdict — confidence", () => {
  it("season-dates-only 'likely open' caps confidence and asks to confirm", () => {
    const v = verdict(
      resort({ currently_open: null, snow_report_status: null, snow_report_updated_at: null, snow_base_depth_in: null }),
      weather(),
      null,
      { now: NOW, history: history() },
    );
    expect(v.status.kind).toBe("likely-open");
    expect(v.verdict).toBe("go");
    expect(v.confidence).not.toBe("high");
    expect(v.reasons.some((r) => /confirm with the resort/.test(r))).toBe(true);
  });

  it("verified open + measured snow + a confident class is high", () => {
    const v = verdict(
      resort(),
      weather({}, v2({ measured: measured({ sfav2_24h_in: 8 }) })),
      null,
      { now: NOW, history: history() },
    );
    expect(v.status.kind).toBe("open");
    expect(v.surface).not.toBeNull();
    expect(["medium", "high"]).toContain(v.confidence);
  });

  it("limited lifts without fresh snow is a Wait", () => {
    const v = verdict(
      resort({ currently_open: null, snow_report_status: "limited", snow_report_updated_at: iso(2) }),
      weather(),
      null,
      { now: NOW },
    );
    expect(v.status.kind).toBe("limited");
    expect(v.verdict).toBe("wait");
    expect(v.headline).toBe("Wait: limited lifts");
  });
});
