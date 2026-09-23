# Wynla data pipeline (2026-09-23)

How weather, observations, measured snow and resort snow reports get into
the database, how often, from where, what every environment variable does,
and how to plug in a licensed feed. This replaces the OnTheSnow scraper
(deleted: it stopped working when OnTheSnow moved to React Server
Components, and its terms forbade the use anyway).

Related: `handoff-docs/sql/2026-09-23-pipeline.sql` (run once),
`WYNLA_DATA_ACCURACY_PLAN_2026-09-18.md` (why these sources),
`audit-2026-09-17/` findings api-crons-email-1..7, 10, 18, 34, 35,
data-quality-2/3, domain-logic-2/7, performance-10/22.

## 1. What runs, in order

| UTC (Hobby, daily) | Route | Job |
|---|---|---|
| 10:00 | `/api/cron/refresh-snow-conditions` | Season status for every resort (`currently_open`, `snow_report_status`) and, when a feed key exists, resort-reported snow numbers. |
| 11:00 | `/api/cron/refresh-weather` | Forecast + observations for every resort, stalest first; once per local day the measured layer → `weather_history`; Snow Surface Forecast classifier; health check + founder alert. |
| 12:30 | `/api/cron/check-snow-alerts` | Push alerts (now skips resorts known to be closed). |
| 13:00 | `/api/cron/daily-digest` | Digest emails. |

Vercel Hobby fires each cron once within the scheduled hour and forbids
anything more frequent, so the four jobs sit in four different hours to
keep the dependency order (status → weather → alerts → digest).

**In season the cadence comes from GitHub Actions**, not Vercel:
`.github/workflows/refresh.yml` runs every 30 minutes from November to
April (and once a day at 14:00 UTC in the off-season as a watchdog). It
calls the same routes with the same `CRON_SECRET`. It is inactive until
the repository secret exists (see §6). If Wynla moves to Vercel Pro, the
equivalent `vercel.json` schedules would be:

```
refresh-snow-conditions  */15 4-10 * * *   (local-morning polling, feed guidance)
refresh-weather          */30 * * * *
check-snow-alerts        15,45 * * * *
daily-digest             0 13 * * *
```

`vercel.json` cannot carry comments, which is why this table lives here.

**On-request freshness:** `GET /api/refresh/resort/{id-or-slug}` refreshes
one resort's forecast and observations when its row is older than 45
minutes. No secret; rate-limited per IP (12/min); the DB timestamp is the
lock, so repeated calls are no-ops. A resort page can call it on load to
stay fresh on the Hobby plan.

## 2. Sources

All government sources are public domain and commercial-OK. Attribution
strings are written to `forecast_json.sources.attribution` for the UI.

### NWS gridpoint forecast (headline, days 1-7)
- `GET https://api.weather.gov/points/{lat},{lon}` once per resort → office / x / y / IANA time zone (cached in `weather_cache.nws_grid_*` and `forecast_json.sources.nws.time_zone`).
- `GET https://api.weather.gov/gridpoints/{office}/{x},{y}` every run. We read the **quantitative layers** (`snowfallAmount`, `iceAccumulation`, `quantitativePrecipitation`, `maxTemperature`, `minTemperature`, `temperature`, `windSpeed`, `windGust`, `windDirection`, `probabilityOfPrecipitation`, `skyCover`, structured `weather`) — no prose regex any more. Each value is `{ validTime: "<ISO>/<ISO-8601 duration>", value }` in metric units; accumulations are spread evenly over the hours of their bin and summed per resort-local day; mm → in, °C → °F, km/h → mph.
- User-Agent is mandatory: `Wynla/2.0 (https://wynla.app; hello@wynla.app)`; override the contact with `NWS_CONTACT_EMAIL`.
- Known gaps: `snowLevel` is empty for eastern offices; the last day of the grid is a stub (we use a day only when its snowfall layer covers ≥ 50 % of the day, otherwise Open-Meteo takes over).

### Open-Meteo (hourly detail, base + summit, days 8-16)
- One call at base elevation and one at summit elevation (`elevation=` metres; summit only when it is ≥ 500 ft above base). `forecast_days=16`, `past_days=1`, hourly `snowfall, rain, precipitation, temperature_2m, wind_*, freezing_level_height, weather_code`, daily sums, current wind.
- `OPEN_METEO_API_KEY` set → `https://customer-api.open-meteo.com/v1/forecast?...&apikey=KEY` (commercial licence). Unset → `https://api.open-meteo.com/v1/forecast` and one warning per process that the free tier is non-commercial. **Buy the Standard plan before launch**; the free terms exclude apps with subscriptions.
- Call weight: ~2 units per call (16 days, 9 hourly variables). 425 resorts × 2 elevations × 48 runs/day ≈ 82k calls/day ≈ 2.4M/month at the 30-minute cadence → Professional tier, or keep 1 elevation hourly for Standard.

### NWS station observations (observed temperature, wind, gust)
- Station discovery once per resort per 30 days: `GET https://api.weather.gov/stations?state=XX&limit=500` (paged by `pagination.next`, ≤ 6 pages, memoised per run per state). Candidates within 15 km ranked highest-elevation first; each is probed with `/stations/{id}/observations?limit=3` and kept only if it reported within 6 h with a temperature or wind. Up to 3 stations are cached in `forecast_json.stations.nws` (id, name, elevation, distance). This list includes MADIS mesonets — resort-owned, SNOTEL, DOT, avalanche-centre — e.g. Alta → `HDP Hidden Peak` (11,000 ft, 3.1 km), Stowe → `MMNV1 Mount Mansfield`.
- Every run: `/stations/{id}/observations?limit=4` per mapped station; the last 3 h of readings are merged field-by-field (individual observations often carry nulls). Result in `forecast_json.obs` with `observed_at`, elevation and distance. The primary station's wind replaces the model's current wind in `weather_cache.wind_mph_*` when it is < 3 h old.
- Once per local day the primary station's last 40 h of observations are summarised into yesterday's high/low/average wind for `weather_history`.

### NRCS SNOTEL via AWDB (measured snow depth, SWE, temps — West only)
- `GET https://wcc.sc.egov.usda.gov/awdbRestApi/services/v1/stations?stationTriplets=*:{ST}:SNTL&activeOnly=true` (the documented bounding-box filters are ignored by the server, so we filter client-side). Nearest site within 15 km and ±300 m (985 ft) of mid-mountain elevation, cached in `forecast_json.stations.snotel`.
- `GET .../v1/data?stationTriplets=766:UT:SNTL&elements=SNWD,WTEQ,TMAX,TMIN,TAVG,PRCP&duration=DAILY&beginDate=…&endDate=…&periodRef=END` → daily inches / °F. Hourly exists for some sites but was empty in testing, so daily is the dependable series. Depth change vs the previous day is used as a floor on snowfall (settlement only lowers it).

### NOAA NOHRSC SNODAS (modelled-assimilated snow depth and SWE, CONUS)
- ArcGIS identify, verified live 2026-09-23:
  `GET https://mapservices.weather.noaa.gov/raster/rest/services/snow/NOHRSC_Snow_Analysis/MapServer/identify?geometry={lon},{lat}&geometryType=esriGeometryPoint&sr=4326&layers=visible:2,3,6,7&tolerance=1&mapExtent={lon-.05},{lat-.05},{lon+.05},{lat+.05}&imageDisplay=400,400,96&returnGeometry=false&f=json`
  → `results[]` with `layerId 3` (Snow Depth, `attributes["Service Pixel Value"]`), `layerId 7` (SWE), and the parent footprint layers 2/6 carrying `idp_validtime` ("9/22/2026 9:00:00 PM", UTC). Outside CONUS (Alaska) `results` is `[]` → nulls.
- Units: layer legends run 0-787 (depth) and 0-79 (SWE) labelled inches; the Mt Rainier sample (depth 68.58, SWE 41111) is only physically consistent as **depth in inches, SWE in thousandths of an inch** (density 0.60). Raw pixel values are kept in `forecast_json.measured.snodas_raw` so this can be re-checked on the first storm. Updates daily, ~20 min past 01/05/11/17 UTC.

### NOAA NOHRSC National Snowfall Analysis v2 (measured 24 h snowfall, CONUS)
- Directory listing `https://www.nohrsc.noaa.gov/snowfall_v2/data/YYYYMM/` → newest `sfav2_CONUS_24h_YYYYMMDDHH.tif` (00Z and 12Z, re-issued as late reports arrive). 
- Verified header 2026-09-23: little-endian GeoTIFF, 1500 × 850 float32, LZW (compression 5), one row per strip, tiepoint (-126, 55), pixel 0.04°, nodata -99999, values in inches (1.78 on Wheeler Peak NV after the 22 Sep storm). `lib/weather/nohrsc.ts` range-reads the 16 KB header once per run, then one ~250-byte strip per latitude row and LZW-decodes it — no GDAL, no full download. `lib/weather/__fixtures__/sfav2-24h-2026092300-row400.json` holds a real header + strip for the unit test.
- 48 h / 72 h totals are not sampled; `resorts.snow_new_48h_in` / `snow_new_7d_in` are sums of the daily `weather_history` rows.

### SnoCountry feed (resort-reported, needs a licence)
- `GET http://feeds.snocountry.net/getSnowReport.php?apiKey=KEY&states=vt&output=json` per state (single-state calls are unlimited; region calls must be 10-15 min apart). Fields verified with the public demo key `SnoCountry.example`: `resortStatus` (1 open, 2 reopen certain days, 3 no recent info, 4 operating no details, 5 plan to open, 6 opening soon, 7 closed, 8 summer), `newSnowMin/Max`, `snowLast48Hours` ("13-15" ranges take the upper bound), `avgBaseDepthMin/Max` (averaged), `openDownHillLifts/Trails`, `maxOpenDownHillLifts/Trails`, `primarySurfaceCondition`, `reportDateTime` (Eastern time, converted to UTC).
- Matching: no id table exists yet, so feed items are matched by state + normalised name (exact, then unique prefix). Unmatched items are listed in the run summary (`unmatched_sample`) so the mapping can be tightened by hand.
- Dry run without a key: `node scripts/pipeline-trigger.mjs refresh-snow-conditions --dry-run` uses the demo key, prints the normalised reports and writes nothing.

## 3. What gets written

### `weather_cache` (one row per resort)
Scalar columns are unchanged and still filled (`temp_high_f`, `temp_low_f`,
`conditions_short`, `conditions_long`, `precip_chance`, `snow_24h_in` =
forecast snowfall today at base, `snow_48h_in` = today + tomorrow,
`wind_mph_avg` / `wind_mph_gust` / `wind_dir_*` = live station when fresh
else model, `forecast_for_date`, `fetched_at`, `fetch_source` ∈
`nws+open-meteo | nws | open-meteo | failed`, `fetch_error`).

`forecast_json` is now a versioned object (v2). Old readers go through
`forecastDaysFrom()` (`lib/weather/forecastJson.ts`), which accepts both
the legacy array and the object:

```
{ v: 2, updated_at,
  days: [ { date, weekday, temp_high_f, temp_low_f, conditions_short, snow_in, precip_chance,
            wind_short, wind_dir_short, uv_index_max,            // v1 keys, unchanged
            snow_summit_in, ice_in, qpf_in, gust_mph, freezing_level_ft, source: "nws"|"open-meteo" } ... up to 16 ],
  hourly: [ { time (UTC), temp_f, temp_summit_f, snow_in, snow_summit_in, rain_in, wind_mph, gust_mph, wind_dir, freezing_level_ft, conditions_short } ... 48 h ],
  obs: { primary, stations: [ { station_id, station_name, elevation_ft, distance_km, observed_at, temp_f, wind_mph, gust_mph, wind_dir, precip_1h_in, conditions_short } ], fetched_at },
  measured: { for_date, sfav2_24h_in, sfav2_valid_end, sfav2_file, snodas_depth_in, snodas_swe_in, snodas_valid, snodas_raw, snotel: {...}, history_sources: { column: source } },
  stations: { nws: [...], snotel: [...], mapped_at },
  sources: { nws: { office, x, y, grid_elevation_ft, update_time, time_zone, ok, error }, open_meteo: { endpoint, base_elevation_ft, summit_elevation_ft, time_zone, utc_offset_seconds, ok, error }, attribution: [...] },
  freezing_level_ft }
```

A resort whose forecast sources ALL failed keeps its previous row; only
`fetched_at`, `fetch_source='failed'` and `fetch_error` are updated
(fixes the column-union upsert that used to null out yesterday's data).

### `weather_history` (one row per resort per day)
Row shape unchanged. Rows are written for **yesterday (resort-local)**
from observed / measured values, never from the morning forecast:

| column | priority |
|---|---|
| `temp_high_f`, `temp_low_f` | SNOTEL TMAX/TMIN → primary station daily summary → Open-Meteo past day |
| `snow_24h_in` | NOHRSC 24 h analysis → SNOTEL positive depth change → Open-Meteo past day |
| `precip_24h_in` | SNOTEL PRCP → station hourly precip (≥ 12 samples) → Open-Meteo |
| `rain_24h_in` | Open-Meteo past day (no measured rain source) |
| `wind_mph_avg` | station daily mean → Open-Meteo hourly mean |

The chosen source per column is stored in `forecast_json.measured.history_sources`.
Yesterday's forecast row (written by the old cron) is overwritten by the
observed row for the same date via the `(resort_id, observed_date)` upsert.
The measured layer runs once per local day per resort, plus again when a
newer analysis file appears (00Z → 12Z).

### `resorts`
- `refresh-snow-conditions`: `currently_open` (true/false with evidence, null without — see `lib/snowReport/seasonStatus.ts`), `snow_report_status` = `no_feed` or `reported`, `snow_report_updated_at`; with a feed also `snow_base_depth_in`, `snow_new_24h_in`, `snow_new_48h_in`, `trails_open_today`, `lifts_open_today`.
- `refresh-weather`: for resorts without a report (`snow_report_status ≠ reported`) `snow_new_24h_in` (measured, yesterday), `snow_new_48h_in`, `snow_new_7d_in` (sums of history rows); `current_surface_class` / `current_surface_updated_at` from the classifier (cleared for `currently_open = false`, and for unknown status during May-Oct).

### `cron_runs` (new, optional)
`job, started_at, finished_at, ok, duration_ms, summary, error`. Written by
`lib/cronRun.ts` when the table exists; the code logs once and carries on
when it does not (PostgREST `PGRST205` / Postgres `42P01`). `/api/health`
shows the last run per job. Health-alert dedupe rows use `job='health-alert'`;
without the table a sentinel `weather_cache` row with `resort_id = 0`
(`fetch_source='health-alert-sentinel'`) is used instead — readers ignore
it because no resort has id 0.

## 4. Monitoring

- `GET /api/health` (public, no secret, 30 req/min per IP). Returns freshness of `weather_cache`, `weather_history`, the snow report, last `cron_runs`, the thresholds and a verdict: `fresh` (HTTP 200) / `stale` / `dead` (HTTP 503). Thresholds: weather ≤ 26 h old and ≥ 70 % of resorts refreshed in that window = fresh; ≤ 48 h = stale; else dead; history older than 3 days or a failed last weather run downgrades to stale. Env: `HEALTH_FRESH_HOURS`, `HEALTH_DEAD_HOURS` (set 2 / 6 once the 30-minute workflow is live).
- `GET /api/health?notify=1` also emails the founder (`PIPELINE_ALERT_EMAIL`, default saitarncare@gmail.com) when not fresh, at most once per 12 h, if `RESEND_API_KEY` is set. The daily weather cron does the same at the end of its run, and the GitHub workflow calls it after every refresh.
- Every cron prints one JSON line (`{"cron":"refresh-weather","duration_ms":…,"ok":…}`) and answers HTTP 500 when `ok:false` (more than 30 % of resorts failed, DB errors, or a configured feed returned nothing in season), so Vercel's own cron-failure email fires as well.
- Point a free uptime monitor at `https://wynla.app/api/health` for a deploy-independent watcher.

## 5. Budget

`refresh-weather` has `maxDuration = 300` (the Hobby ceiling; Pro allows 800).
Per resort: 1 NWS grid + 2 Open-Meteo + 1-3 station reads + (daily) 1 sfav2 strip + 1 SNODAS identify + 1 SNOTEL + 1 station history ≈ 6-10 calls. 12 concurrent workers, stalest resorts first (local-morning resorts get a bonus), a 25-second dispatch floor before the deadline, writes flushed every 25 resorts, resorts refreshed < 45 min ago skipped. A run that runs out of time reports `out_of_time: true` and `remaining`; the next invocation continues with those resorts because they are then the stalest. Measured live: a full first run maps stations for every resort (~6 extra calls each) and may need two invocations; steady state fits in one.

## 6. Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `CRON_SECRET` | Vercel (all envs) + GitHub repository secret | Auth for every `/api/cron/*` call. Missing → crons answer 503 and log `[cronRun] CRON_SECRET is not configured`. |
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | Vercel | Server-side writes. |
| `OPEN_METEO_API_KEY` | Vercel | Commercial Open-Meteo host. Unset = free (non-commercial) host with a logged warning. |
| `SNOCOUNTRY_API_KEY` | Vercel | Enables the SnoCountry provider (`snow_report_status='reported'`). |
| `RESEND_API_KEY`, `RESEND_FROM` | Vercel | Founder health alerts (and digests). |
| `PIPELINE_ALERT_EMAIL` | Vercel | Alert recipient (default saitarncare@gmail.com). |
| `NWS_CONTACT_EMAIL` | Vercel | Contact in the NWS User-Agent (default hello@wynla.app). |
| `HEALTH_FRESH_HOURS`, `HEALTH_DEAD_HOURS` | Vercel | Health thresholds (defaults 26 / 48). |
| `SITE_URL` | GitHub Actions variable (optional) | Base URL for the workflow (default https://wynla.app). |
| `PIPELINE_BASE_URL` | local | Base URL for `scripts/pipeline-trigger.mjs`. |

## 7. Plugging in a licensed feed

1. Implement `SnowReportProvider` from `lib/snowReport/provider.ts`: `name`, `isConfigured()`, `getReports(resorts) → NormalizedReport[]` (`baseDepthIn, new24In, new48In, liftsOpen, liftsTotal, trailsOpen, trailsTotal, surface, status, reportedAt, source`).
2. Register it in `getConfiguredProvider()` in `lib/snowReport/snocountry.ts` (or move that function into `provider.ts` once there are two).
3. Set the provider's env var. From then on `refresh-snow-conditions` writes `reported` rows for matched resorts and `refresh-weather` stops overwriting their `snow_new_*` columns.
4. If the feed exposes stable ids, add a `resort_feed_ids` mapping table (SQL) and match by id instead of name; the unmatched list in the run summary tells you which names need help.

Mountain News / OnTheSnow Partner API (metric units, `x-api-key` header,
per-lift detail) would follow the same shape.

## 8. Local tools

- `node scripts/pipeline-probe-sources.mjs [--lat --lon --state]` — one-line status per upstream source.
- `node scripts/pipeline-trigger.mjs <job> [--base=…] [--force] [--limit=N] [--resort=ID] [--dry-run] [--notify]` — call a cron / health / on-request refresh the way the schedulers do (reads `CRON_SECRET` from `.env.local`, never prints it).
- `PIPELINE_LIVE=1 npx vitest run lib/weather/live.test.ts` — full per-resort refresh against the real APIs for Stowe, Alta and Alyeska, printed, no DB writes.
- `npm test` — 64 unit tests with recorded fixtures under `lib/weather/__fixtures__/` (NWS grid + observations, Open-Meteo, SNODAS identify, sfav2 header + strip, AWDB daily, SnoCountry demo).

## 9. Known limits and follow-ups

- `weather_history` rows before 2026-09-23 are morning forecasts (snow always 0). They age out of the classifier's 7-day window within a week of the first run.
- SNODAS / sfav2 units are inferred from legends and physical plausibility (see §2); confirm against a SNOTEL site on the first storm and adjust `parseSnodasIdentify` if needed — the raw pixels are stored for exactly this.
- No id mapping exists for SnoCountry; name matching handles the demo set but expect a handful of misses across 344 areas.
- `lib/seasonDates.ts` cannot parse hyphenated qualifiers ("Mid-November", which is how the DB stores them); `seasonStatus.ts` works around it locally, the resort page's countdown still goes through the shared parser.
- The resort page reads `weather_history` with `order(ascending).limit(7)`, i.e. the OLDEST seven rows; the surface classifier on the page therefore looks at May data. Not touched here (UI package), but it should become `ascending: false` + reverse.
- Vercel Hobby also forbids commercial use; the plan is Pro + Supabase Pro before launch.
