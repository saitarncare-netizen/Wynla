// Generates the JSON fixtures next to this file. Run when the scenarios
// change:  node lib/saturday/__fixtures__/build.mjs
//
// Scenario clock: Thursday 2027-01-14 09:00 EST, target Saturday 2027-01-16.
// Origin NYC. Every resort is a real slug so lib/passAccess.json answers
// the blackout questions with real 2026-27 rules (Ikon Base is blacked
// out Jan 16-17, 2027; Epic Pass has no blackouts).

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

const SEASON = { season_open_text: "November 21, 2026", season_close_text: "April 18, 2027" };
const OPEN = {
  currently_open: true,
  snow_report_status: "reported",
  snow_report_updated_at: "2027-01-14T11:00:00Z",
  operating_status: "open",
};
const CHAIRS = { high_speed_quad: 3, fixed_quad: 2, fixed_triple: 1, gondola: 0, tram: 0 };

const resort = (id, slug, name, state, lat, lon, passes, extra = {}) => ({
  id,
  slug,
  name,
  state,
  latitude: lat,
  longitude: lon,
  passes,
  tier: "featured",
  vertical_drop: 2000,
  total_lifts: 6,
  lifts_open_today: 6,
  snow_base_depth_in: 30,
  snow_new_24h_in: 0,
  snow_new_48h_in: 0,
  current_surface_class: null,
  current_surface_updated_at: null,
  wind_hold_mph_chair: null,
  wind_hold_mph_gondola: null,
  lift_types: CHAIRS,
  ...SEASON,
  ...OPEN,
  ...extra,
});

const resorts = [
  resort(1, "sugarbush", "Sugarbush", "VT", 44.136, -72.894, ["ikon"]),
  resort(2, "killington", "Killington", "VT", 43.6045, -72.8201, ["ikon"]),
  resort(3, "hunter-mountain", "Hunter Mountain", "NY", 42.2039, -74.2303, ["epic"]),
  resort(4, "mount-snow", "Mount Snow", "VT", 42.9602, -72.9204, ["epic"]),
  resort(5, "jay-peak", "Jay Peak", "VT", 44.9246, -72.5259, ["indy"]),
  resort(6, "vail", "Vail", "CO", 39.6403, -106.3742, ["epic"]),
  // Unknown status: no season text, no verified flag, legacy scraper word.
  resort(7, "whiteface-mountain", "Whiteface Mountain", "NY", 44.3658, -73.9026, [], {
    season_open_text: null,
    season_close_text: null,
    currently_open: null,
    snow_report_status: "unknown",
    snow_report_updated_at: null,
    operating_status: null,
    lifts_open_today: null,
    snow_base_depth_in: null,
  }),
  // Opens on the target Saturday (announced, not projected), not running yet.
  resort(8, "stowe-mountain-resort", "Stowe", "VT", 44.5303, -72.7814, ["epic"], {
    season_open_text: "January 16, 2027",
    currently_open: false,
    snow_report_status: "no_feed",
    snow_report_updated_at: "2027-01-14T11:00:00Z",
    lifts_open_today: 0,
    snow_base_depth_in: null,
  }),
];

// Off-season scenario: Thursday 2026-09-24, every resort counting down.
const offSeasonResorts = [
  resort(1, "sugarbush", "Sugarbush", "VT", 44.136, -72.894, ["ikon"], {
    currently_open: false,
    snow_report_status: "no_feed",
    snow_report_updated_at: "2026-09-23T11:00:00Z",
    lifts_open_today: 0,
    snow_base_depth_in: null,
  }),
  resort(2, "killington", "Killington", "VT", 43.6045, -72.8201, ["ikon"], {
    season_open_text: "November 14, 2026 (projected)",
    season_close_text: "May 30, 2027 (projected)",
    currently_open: false,
    snow_report_status: "no_feed",
    snow_report_updated_at: "2026-09-23T11:00:00Z",
    lifts_open_today: 0,
    snow_base_depth_in: null,
  }),
  resort(3, "hunter-mountain", "Hunter Mountain", "NY", 42.2039, -74.2303, ["epic"], {
    season_open_text: "Late November",
    season_close_text: "Early April",
    currently_open: false,
    snow_report_status: "no_feed",
    snow_report_updated_at: "2026-09-23T11:00:00Z",
    lifts_open_today: 0,
    snow_base_depth_in: null,
  }),
];

function iso(dayOffset) {
  return new Date(Date.UTC(2027, 0, 14 + dayOffset)).toISOString().slice(0, 10);
}
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Ten forecast days from Jan 14; `overrides` is keyed by day offset. */
function days(base, overrides = {}) {
  const out = [];
  for (let i = 0; i < 10; i++) {
    const date = iso(i);
    out.push({
      date,
      weekday: WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()],
      temp_high_f: base.high,
      temp_low_f: base.low,
      conditions_short: "Mostly cloudy",
      snow_in: 0,
      precip_chance: 20,
      wind_short: "10 mph",
      wind_dir_short: "NW",
      gust_mph: base.gust ?? 18,
      qpf_in: 0,
      source: "nws",
      ...(overrides[i] ?? {}),
    });
  }
  return out;
}

/** Seven history days ending Jan 14 (today). */
function history(base, overrides = {}) {
  const out = [];
  for (let i = -6; i <= 0; i++) {
    out.push({
      observed_date: iso(i),
      temp_high_f: base.high,
      temp_low_f: base.low,
      snow_24h_in: 0,
      rain_24h_in: 0,
      precip_24h_in: 0,
      wind_mph_avg: 8,
      ...(overrides[i] ?? {}),
    });
  }
  return out;
}

const UPDATED = "2027-01-14T12:05:00Z";
const measured = (in24, in48, in72) => ({
  for_date: iso(-1),
  sfav2_24h_in: in24,
  sfav2_48h_in: in48,
  sfav2_72h_in: in72,
  sfav2_valid_end: "2027-01-14T12:00:00Z",
  sfav2_file: "fixture",
  snodas_depth_in: 30,
  snodas_swe_in: 6,
  snodas_valid: "2027-01-14T06:00:00Z",
  snodas_raw: null,
  snotel: null,
  history_sources: null,
});

const cold = { high: 22, low: 8 };
const powder = {
  sugarbush: {
    days: days(cold, {
      1: { snow_in: 6, conditions_short: "Snow", precip_chance: 90 },
      2: { snow_in: 4, conditions_short: "Snow showers", precip_chance: 70 },
    }),
    measured: measured(1, 1, 2),
    updatedAt: UPDATED,
    history: history(cold, { [-2]: { snow_24h_in: 1 } }),
  },
  killington: {
    days: days({ high: 26, low: 12 }, {
      1: { snow_in: 3, conditions_short: "Snow", precip_chance: 80 },
      2: { snow_in: 2, conditions_short: "Snow showers", precip_chance: 60 },
    }),
    measured: measured(0, 1, 1),
    updatedAt: UPDATED,
    history: history({ high: 26, low: 12 }, { [-2]: { snow_24h_in: 1 } }),
  },
  "hunter-mountain": {
    days: days({ high: 31, low: 18 }),
    measured: measured(0, 0, 0),
    updatedAt: UPDATED,
    history: history({ high: 31, low: 18 }),
  },
  "mount-snow": {
    days: days({ high: 25, low: 10 }, { 1: { snow_in: 1 }, 2: { snow_in: 1 } }),
    measured: measured(0, 0, 3),
    updatedAt: UPDATED,
    history: history({ high: 25, low: 10 }, { [-1]: { snow_24h_in: 3 } }),
  },
  "jay-peak": {
    days: days({ high: 18, low: 2, gust: 55 }, {
      1: { snow_in: 8, conditions_short: "Snow", precip_chance: 95, gust_mph: 40 },
      2: { snow_in: 6, conditions_short: "Snow", precip_chance: 90, gust_mph: 55, wind_short: "25 to 35 mph" },
    }),
    measured: measured(2, 3, 5),
    updatedAt: UPDATED,
    history: history({ high: 18, low: 2 }, { [-3]: { snow_24h_in: 2 } }),
  },
  vail: {
    days: days({ high: 28, low: 10 }, { 1: { snow_in: 10 }, 2: { snow_in: 8 } }),
    measured: measured(4, 8, 12),
    updatedAt: UPDATED,
    history: history({ high: 28, low: 10 }),
  },
  "whiteface-mountain": {
    days: days(cold, { 1: { snow_in: 5 }, 2: { snow_in: 3 } }),
    measured: measured(1, 1, 1),
    updatedAt: UPDATED,
    history: history(cold),
  },
  "stowe-mountain-resort": {
    days: days(cold, { 1: { snow_in: 2 }, 2: { snow_in: 2 } }),
    measured: null,
    updatedAt: UPDATED,
    history: history(cold),
  },
};

// Rain day: Hunter gets warm rain on Friday, then refreezes Saturday;
// Mount Snow stays cold and dry with a soft top.
const rain = {
  ...powder,
  "hunter-mountain": {
    days: days({ high: 31, low: 18 }, {
      1: { temp_high_f: 42, temp_low_f: 34, conditions_short: "Rain", precip_chance: 90, qpf_in: 0.6, snow_in: 0 },
      2: { temp_high_f: 30, temp_low_f: 18, conditions_short: "Mostly cloudy", precip_chance: 10, snow_in: 0 },
    }),
    measured: measured(0, 0, 0),
    updatedAt: UPDATED,
    history: history({ high: 31, low: 18 }),
  },
};

// Stale weather: same powder numbers, but last refreshed three days ago.
const stale = Object.fromEntries(
  Object.entries(powder).map(([slug, w]) => [
    slug,
    { ...w, updatedAt: "2027-01-11T12:05:00Z", history: w.history.slice(0, 4) },
  ]),
);

const write = (name, data) => writeFileSync(join(here, name), JSON.stringify(data, null, 2) + "\n");
write("resorts.json", resorts);
write("resorts-off-season.json", offSeasonResorts);
write("weather-powder.json", powder);
write("weather-rain.json", rain);
write("weather-stale.json", stale);
console.log("fixtures written");
