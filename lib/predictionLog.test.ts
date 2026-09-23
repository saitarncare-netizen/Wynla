import { afterEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyWeather } from "./snowSurface";
import type { ForecastDay } from "./weather/forecastJson";
import {
  buildPredictionRows,
  capConfidence,
  isSurfaceHit,
  ledgerSummary,
  MIN_RATE_SAMPLE,
  predictionHorizons,
  resetLedgerAvailability,
  scoreDay,
  scoreRows,
  SURFACE_NEIGHBOURS,
  writePredictions,
  type ObservedDay,
  type UnscoredRow,
} from "./predictionLog";

// ---------- fixtures ----------

/** N consecutive observed days ending on endDate (oldest first). */
function observed(n: number, fill: (i: number) => Partial<DailyWeather>, endDate: string): DailyWeather[] {
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Array.from({ length: n }, (_, i) => ({
    observed_date: new Date(end - (n - 1 - i) * 86_400_000).toISOString().slice(0, 10),
    temp_high_f: 28,
    temp_low_f: 15,
    snow_24h_in: 0,
    rain_24h_in: 0,
    precip_24h_in: 0,
    wind_mph_avg: 6,
    ...fill(i),
  }));
}

function forecastDay(date: string, extra: Partial<ForecastDay> = {}): ForecastDay {
  return {
    date,
    weekday: "Thu",
    temp_high_f: 27,
    temp_low_f: 14,
    conditions_short: "Snow",
    snow_in: 4,
    precip_chance: 80,
    wind_short: "10 mph",
    wind_dir_short: "NW",
    gust_mph: 25,
    source: "nws",
    nws_coverage: 1,
    ...extra,
  };
}

/** Thursday 2027-01-21 in resort-local time; Saturday is two days out. */
const LOCAL_TODAY = "2027-01-21";
const NOW = new Date("2027-01-21T11:05:00Z");
const strip = Array.from({ length: 10 }, (_, i) =>
  forecastDay(new Date(Date.parse(`${LOCAL_TODAY}T00:00:00Z`) + i * 86_400_000).toISOString().slice(0, 10)),
);
const midSeasonCtx = { baseDepthIn: 40, hasSnowpack: true, inSeason: true };

// ---------- pure helpers ----------

describe("predictionHorizons", () => {
  it("logs today, tomorrow and the coming Saturday", () => {
    expect(predictionHorizons("2027-01-21")).toEqual([0, 1, 2]); // Thursday
    expect(predictionHorizons("2027-01-18")).toEqual([0, 1, 5]); // Monday
  });
  it("collapses Friday's Saturday into the tomorrow row", () => {
    expect(predictionHorizons("2027-01-22")).toEqual([0, 1]);
  });
  it("logs the following Saturday when today is Saturday", () => {
    expect(predictionHorizons("2027-01-23")).toEqual([0, 1, 7]);
  });
});

describe("isSurfaceHit", () => {
  it("exact class is a hit", () => {
    expect(isSurfaceHit("PP", "PP")).toBe(true);
    expect(isSurfaceHit("VC", "VC")).toBe(true);
  });
  it("adjacent classes are hits in both directions", () => {
    for (const [code, neighbours] of Object.entries(SURFACE_NEIGHBOURS)) {
      for (const n of neighbours) {
        expect(isSurfaceHit(code as never, n)).toBe(true);
        expect(SURFACE_NEIGHBOURS[n]).toContain(code);
      }
    }
  });
  it("powder against ice is never a hit, nor is VC against anything else", () => {
    expect(isSurfaceHit("PP", "IP")).toBe(false);
    expect(isSurfaceHit("IP", "PP")).toBe(false);
    expect(isSurfaceHit("VC", "PPC")).toBe(false);
    expect(isSurfaceHit("PPC", "VC")).toBe(false);
  });
  it("is null when either side has no class", () => {
    expect(isSurfaceHit(null, "PP")).toBeNull();
    expect(isSurfaceHit("PP", null)).toBeNull();
  });
});

describe("capConfidence", () => {
  it("keeps today, caps tomorrow at medium, everything further at low", () => {
    expect(capConfidence("high", 0)).toBe("high");
    expect(capConfidence("high", 1)).toBe("medium");
    expect(capConfidence("low", 1)).toBe("low");
    expect(capConfidence("high", 2)).toBe("low");
    expect(capConfidence("medium", 7)).toBe("low");
  });
});

// ---------- buildPredictionRows ----------

describe("buildPredictionRows", () => {
  const hist = observed(7, (i) => ({ snow_24h_in: i === 6 ? 6 : 0 }), "2027-01-20");
  const window = [...hist, { ...hist[6], observed_date: LOCAL_TODAY, snow_24h_in: 4 }];
  const todayResult = {
    code: "PP" as const,
    label: "Powder",
    short: "PP",
    emoji: "",
    description: "",
    reasons: [],
    confidence: "high" as const,
  };

  it("writes one row per horizon with the day's numbers and the stored day-0 class", () => {
    const rows = buildPredictionRows({
      resortId: 7,
      localToday: LOCAL_TODAY,
      days: strip,
      window,
      todayResult,
      dormant: false,
      ctx: midSeasonCtx,
      now: NOW,
      forecastUpdatedAt: "2027-01-21T11:00:00Z",
    });
    expect(rows.map((r) => r.horizon_days)).toEqual([0, 1, 2]);
    expect(rows.map((r) => r.for_date)).toEqual(["2027-01-21", "2027-01-22", "2027-01-23"]);
    expect(rows[0]).toMatchObject({
      resort_id: 7,
      made_at: NOW.toISOString(),
      surface_class: "PP",
      surface_confidence: "high",
      forecast_snow_in: 4,
      forecast_high_f: 27,
      forecast_low_f: 14,
      forecast_gust_mph: 25,
    });
    expect(rows[0].source).toMatchObject({ classifier: "snowSurface", day_source: "nws", day0_from_stored: true });
    // Horizons past today are rolled from the forecast and capped.
    expect(rows[1].surface_class).not.toBeNull();
    expect(["medium", "low"]).toContain(rows[1].surface_confidence);
    expect(rows[2].surface_confidence).toBe("low");
    expect(rows[2].source).toMatchObject({ day0_from_stored: false, window_days: window.length + 2 });
  });

  it("logs numbers but no class for a dormant resort", () => {
    const rows = buildPredictionRows({
      resortId: 7,
      localToday: LOCAL_TODAY,
      days: strip,
      window: [],
      todayResult: null,
      dormant: true,
      ctx: {},
      now: NOW,
      forecastUpdatedAt: null,
    });
    expect(rows).toHaveLength(3);
    for (const r of rows) {
      expect(r.surface_class).toBeNull();
      expect(r.surface_confidence).toBeNull();
      expect(r.forecast_snow_in).toBe(4);
      expect(r.source).toMatchObject({ classifier: "dormant", window_days: 0 });
    }
  });

  it("skips horizons the strip does not reach and matches days by date, not index", () => {
    const rows = buildPredictionRows({
      resortId: 7,
      localToday: LOCAL_TODAY,
      days: [strip[1], strip[0]], // tomorrow first, no Saturday
      window,
      todayResult,
      dormant: false,
      ctx: midSeasonCtx,
      now: NOW,
      forecastUpdatedAt: null,
    });
    expect(rows.map((r) => r.horizon_days)).toEqual([0, 1]);
    expect(rows[0].for_date).toBe(LOCAL_TODAY);
  });

  it("logs the numbers but no class when an intermediate forecast day is missing", () => {
    const rows = buildPredictionRows({
      resortId: 7,
      localToday: LOCAL_TODAY,
      days: [strip[0], strip[2]], // Saturday present, Friday missing
      window,
      todayResult,
      dormant: false,
      ctx: midSeasonCtx,
      now: NOW,
      forecastUpdatedAt: null,
    });
    const sat = rows.find((r) => r.horizon_days === 2)!;
    expect(sat.surface_class).toBeNull();
    expect(sat.forecast_snow_in).toBe(4);
    expect(sat.source.classifier).toBe("forecast_gap");
  });

  it("rounds forecast numbers to what the columns hold", () => {
    const rows = buildPredictionRows({
      resortId: 7,
      localToday: LOCAL_TODAY,
      days: [forecastDay(LOCAL_TODAY, { snow_in: 3.14159, temp_high_f: 27.6, gust_mph: null })],
      window,
      todayResult,
      dormant: false,
      ctx: midSeasonCtx,
      now: NOW,
      forecastUpdatedAt: null,
    });
    expect(rows[0].forecast_snow_in).toBe(3.1);
    expect(rows[0].forecast_high_f).toBe(28);
    expect(rows[0].forecast_gust_mph).toBeNull();
  });
});

// ---------- scoreRows ----------

function unscored(over: Partial<UnscoredRow> = {}): UnscoredRow {
  return {
    id: 1,
    resort_id: 7,
    for_date: "2027-01-21",
    horizon_days: 0,
    made_at: "2027-01-21T11:00:00Z",
    surface_class: "PP",
    forecast_snow_in: "4.0",
    forecast_high_f: 27,
    forecast_low_f: 14,
    ...over,
  };
}

/** 8 observed days ending on the target day: a 7" dump on the target day = powder. */
function powderHistory(resortId = 7, endDate = "2027-01-21"): ObservedDay[] {
  return observed(8, (i) => ({ snow_24h_in: i === 7 ? 7 : 0, precip_24h_in: i === 7 ? 0.7 : 0 }), endDate).map((d) => ({
    resort_id: resortId,
    ...d,
    // PostgREST returns numeric columns as strings.
    snow_24h_in: d.snow_24h_in === null ? null : String(d.snow_24h_in),
  }));
}

const scoreNow = new Date("2027-01-22T11:05:00Z");
const openResort = new Map([[7, { id: 7, currently_open: true, snow_base_depth_in: 40 }]]);

describe("scoreRows", () => {
  it("fills actuals, classifies the observed surface and marks a hit", () => {
    const { updates, pending } = scoreRows({
      rows: [unscored()],
      history: powderHistory(),
      resorts: openResort,
      now: scoreNow,
    });
    expect(pending).toHaveLength(0);
    expect(updates).toHaveLength(1);
    expect(updates[0]).toMatchObject({
      id: 1,
      actual_snow_in: 7,
      actual_high_f: 28,
      actual_low_f: 15,
      actual_gust_mph: null,
      actual_surface_class: "PP",
      surface_hit: true,
      snow_abs_err_in: 3,
      scored_at: scoreNow.toISOString(),
    });
    expect(updates[0].actual_source).toMatchObject({ table: "weather_history", observed_date: "2027-01-21", window_days: 8 });
  });

  it("scores an adjacent class as a hit and a far class as a miss", () => {
    const { updates } = scoreRows({
      rows: [unscored({ id: 1, surface_class: "PPC" }), unscored({ id: 2, horizon_days: 1, surface_class: "IP" })],
      history: powderHistory(),
      resorts: openResort,
      now: scoreNow,
    });
    expect(updates.find((u) => u.id === 1)!.surface_hit).toBe(true);
    expect(updates.find((u) => u.id === 2)!.surface_hit).toBe(false);
  });

  it("leaves surface_hit null when the prediction was dormant", () => {
    const { updates } = scoreRows({
      rows: [unscored({ surface_class: null })],
      history: powderHistory(),
      resorts: openResort,
      now: scoreNow,
    });
    expect(updates[0].surface_hit).toBeNull();
    expect(updates[0].actual_surface_class).toBe("PP");
    expect(updates[0].snow_abs_err_in).toBe(3);
  });

  it("does not claim an observed surface for a closed resort", () => {
    const { updates } = scoreRows({
      rows: [unscored()],
      history: powderHistory(),
      resorts: new Map([[7, { id: 7, currently_open: false, snow_base_depth_in: null }]]),
      now: scoreNow,
    });
    expect(updates[0].actual_surface_class).toBeNull();
    expect(updates[0].surface_hit).toBeNull();
    expect(updates[0].actual_snow_in).toBe(7);
  });

  it("keeps a recent row pending when the observation has not landed yet", () => {
    const { updates, pending } = scoreRows({
      rows: [unscored()],
      history: [],
      resorts: openResort,
      now: scoreNow,
    });
    expect(updates).toHaveLength(0);
    expect(pending).toHaveLength(1);
  });

  it("closes an old row as unobserved so it is not retried forever", () => {
    const { updates, pending } = scoreRows({
      rows: [unscored({ for_date: "2027-01-18" })],
      history: [],
      resorts: openResort,
      now: scoreNow,
    });
    expect(pending).toHaveLength(0);
    expect(updates[0]).toMatchObject({
      actual_snow_in: null,
      actual_surface_class: null,
      surface_hit: null,
      snow_abs_err_in: null,
    });
    expect(updates[0].actual_source).toMatchObject({ reason: "no_observation" });
  });

  it("attaches history_sources provenance only for the matching day", () => {
    const measured = {
      for_date: "2027-01-21",
      history_sources: { snow_24h_in: "nohrsc-analysis:24h-to-2027-01-22T12:00Z" },
    } as never;
    const { updates } = scoreRows({
      rows: [unscored({ id: 1 }), unscored({ id: 2, for_date: "2027-01-20" })],
      history: powderHistory(),
      resorts: openResort,
      measured: new Map([[7, measured]]),
      now: scoreNow,
    });
    expect(updates.find((u) => u.id === 1)!.actual_source.history_sources).toEqual({
      snow_24h_in: "nohrsc-analysis:24h-to-2027-01-22T12:00Z",
    });
    expect(updates.find((u) => u.id === 2)!.actual_source.history_sources).toBeNull();
  });

  it("leaves snow_abs_err_in null when either side is missing", () => {
    const hist = powderHistory().map((h) => (h.observed_date === "2027-01-21" ? { ...h, snow_24h_in: null } : h));
    const { updates } = scoreRows({ rows: [unscored()], history: hist, resorts: openResort, now: scoreNow });
    expect(updates[0].actual_snow_in).toBeNull();
    expect(updates[0].snow_abs_err_in).toBeNull();
  });
});

// ---------- I/O with a fake PostgREST client ----------

type Reply = { data?: unknown; error?: { code?: string; message: string } | null; count?: number | null };

/** Chainable thenable stub: filters return the chain, awaiting it consumes
 *  the next queued reply, so replies are matched to queries in await order. */
function fakeClient(replies: Reply[], calls: Array<{ table: string; op: string; payload?: unknown }> = []) {
  const next = () => replies.shift() ?? { data: [], error: null, count: 0 };
  const from = (table: string) => {
    const chain: Record<string, unknown> = {};
    for (const f of ["eq", "is", "gte", "lte", "in", "not", "limit", "order"]) chain[f] = () => chain;
    chain.select = () => {
      calls.push({ table, op: "select" });
      return chain;
    };
    chain.upsert = (payload: unknown) => {
      calls.push({ table, op: "upsert", payload });
      return chain;
    };
    chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => {
      const r = next();
      return Promise.resolve({ data: r.data ?? null, error: r.error ?? null, count: r.count ?? null }).then(resolve, reject);
    };
    return chain;
  };
  return { from } as unknown as SupabaseClient;
}

afterEach(() => {
  resetLedgerAvailability();
  vi.restoreAllMocks();
});

describe("writePredictions", () => {
  it("upserts on the unique key in batches", async () => {
    const calls: Array<{ table: string; op: string; payload?: unknown }> = [];
    const client = fakeClient([{ error: null }, { error: null }], calls);
    const rows = Array.from({ length: 250 }, (_, i) => ({
      resort_id: i,
      for_date: "2027-01-21",
      made_at: NOW.toISOString(),
      horizon_days: 0,
      surface_class: null,
      surface_confidence: null,
      forecast_snow_in: null,
      forecast_high_f: null,
      forecast_low_f: null,
      forecast_gust_mph: null,
      source: {},
    }));
    const res = await writePredictions(client, rows);
    expect(res).toEqual({ available: true, written: 250, errors: [] });
    expect(calls.map((c) => c.op)).toEqual(["upsert", "upsert"]);
    expect((calls[0].payload as unknown[]).length).toBe(200);
  });

  it("logs once and goes quiet when the table is missing", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const client = fakeClient([{ error: { code: "PGRST205", message: "relation prediction_log does not exist" } }]);
    const row = {
      resort_id: 1,
      for_date: "2027-01-21",
      made_at: NOW.toISOString(),
      horizon_days: 0,
      surface_class: null,
      surface_confidence: null,
      forecast_snow_in: null,
      forecast_high_f: null,
      forecast_low_f: null,
      forecast_gust_mph: null,
      source: {},
    };
    expect(await writePredictions(client, [row])).toEqual({ available: false, written: 0, errors: [] });
    expect(await writePredictions(client, [row])).toEqual({ available: false, written: 0, errors: [] });
    expect(await scoreDay(client, "2027-01-20", scoreNow)).toMatchObject({ available: false, candidates: 0 });
    expect(await ledgerSummary(client, scoreNow)).toMatchObject({ available: false });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toContain("2026-09-23-ledger.sql");
  });

  it("reports other errors without throwing", async () => {
    const client = fakeClient([{ error: { code: "23503", message: "fk violation" } }]);
    const res = await writePredictions(client, [
      {
        resort_id: 1,
        for_date: "2027-01-21",
        made_at: NOW.toISOString(),
        horizon_days: 0,
        surface_class: null,
        surface_confidence: null,
        forecast_snow_in: null,
        forecast_high_f: null,
        forecast_low_f: null,
        forecast_gust_mph: null,
        source: {},
      },
    ]);
    expect(res.available).toBe(true);
    expect(res.errors).toEqual(["fk violation"]);
  });
});

describe("scoreDay", () => {
  it("reads unscored rows, joins observations and writes the scores", async () => {
    const calls: Array<{ table: string; op: string; payload?: unknown }> = [];
    const client = fakeClient(
      [
        { data: [unscored({ id: 11 }), unscored({ id: 12, horizon_days: 2, surface_class: "IP" })] },
        { data: powderHistory() },
        { data: [{ id: 7, currently_open: true, snow_base_depth_in: 40 }] },
        { data: [{ resort_id: 7, measured: null }] },
        { error: null },
      ],
      calls,
    );
    const res = await scoreDay(client, "2027-01-21", scoreNow);
    expect(res).toMatchObject({
      available: true,
      candidates: 2,
      scored: 2,
      closed_unobserved: 0,
      pending: 0,
      surface_compared: 2,
      surface_hits: 1,
      errors: [],
    });
    const write = calls.find((c) => c.op === "upsert")!;
    expect(write.table).toBe("prediction_log");
    const payload = write.payload as Array<Record<string, unknown>>;
    expect(payload.map((p) => p.id)).toEqual([11, 12]);
    expect(payload[0]).toMatchObject({ resort_id: 7, for_date: "2027-01-21", horizon_days: 0, surface_hit: true });
  });

  it("does not close rows when the history read itself failed", async () => {
    const client = fakeClient([
      { data: [unscored({ for_date: "2027-01-10" })] },
      { error: { code: "57014", message: "statement timeout" } },
      { data: [] },
      { data: [] },
    ]);
    const res = await scoreDay(client, "2027-01-10", scoreNow);
    expect(res.scored + res.closed_unobserved).toBe(0);
    expect(res.errors[0]).toContain("weather_history");
  });

  it("is a no-op when nothing is unscored", async () => {
    const calls: Array<{ table: string; op: string }> = [];
    const client = fakeClient([{ data: [] }], calls);
    const res = await scoreDay(client, "2027-01-21", scoreNow);
    expect(res.candidates).toBe(0);
    expect(calls).toHaveLength(1);
  });
});

describe("ledgerSummary", () => {
  it("withholds the hit rate below the minimum sample", async () => {
    const client = fakeClient([{ count: 900 }, { count: 20 }, { count: 10 }, { count: 9 }]);
    expect(await ledgerSummary(client, scoreNow)).toEqual({
      available: true,
      predictions_logged_24h: 900,
      scored_7d: 20,
      surface_compared_7d: 10,
      surface_hits_7d: 9,
      surface_hit_rate_7d: null,
    });
  });

  it("reports the rate once the sample is large enough", async () => {
    const client = fakeClient([{ count: 900 }, { count: 400 }, { count: MIN_RATE_SAMPLE }, { count: 21 }]);
    const s = await ledgerSummary(client, scoreNow);
    expect(s.surface_hit_rate_7d).toBe(Math.round((21 / MIN_RATE_SAMPLE) * 1000) / 1000);
  });
});
