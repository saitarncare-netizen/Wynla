# Prediction ledger — 2026-09-23

Quietly freeze every prediction next to what actually happened. No public UI in season 1.

Why: the Snow Surface Forecast is the one claim competitors do not make, and it has never been compared with reality (strategy 2026-09-18 move 3b; scorecard must-have 2). A season of frozen calls is the only way to earn "Wynla called 9 of your 11 days right" in season 2, to find the classifier's real biases, and to refuse to advertise accuracy we cannot show.

## Files

| File | Role |
| --- | --- |
| `handoff-docs/sql/2026-09-23-ledger.sql` | Creates `prediction_log` (RLS on, service role only, no policies), its indexes, and the `prediction_log_region_stats` view. Idempotent. NOT part of `2026-09-23-ALL-season-1.sql`; run it separately, before or after deploy. |
| `lib/predictionLog.ts` | `buildPredictionRows`, `writePredictions`, `scoreRows` / `scoreDay` / `scorePendingDays`, `ledgerSummary`, `ledgerRegionStats`, `readHistoryRange`, the class-equivalence table. Feature-detects the table and the view (42P01 / 42703 / PGRST205 / PGRST204), warns once with the error code, re-probes after 10 minutes, never throws into a cron. Every read pages through PostgREST's 1,000-row cap. |
| `lib/predictionLog.test.ts` | 39 unit tests with fixtures (horizons, hit table, row building, scoring, insert-only writes, paging, pending-days walk, missing-table path and TTL, summary thresholds, region view). |
| `app/api/cron/refresh-weather/route.ts` | Hook at the end of the daily run: freeze today / tomorrow / Saturday for every resort that got a forecast (first write of the day wins), then score every pending target day through UTC yesterday. Skipped when under 25 s of budget remain, stops between pages when the budget runs low. Summary field `ledger` in the run's JSON. Its own `weather_history` read is now paged too (it was silently truncated at 1,000 rows). |
| `app/api/cron/score-predictions/route.ts` | Manual / backfill scorer (no params = the same pending pass as the refresh; `?date=` or `?from=&to=`, max 31 days). Same `CRON_SECRET` auth. Not scheduled in `vercel.json`; the daily run scores on its own. |
| `app/api/health/route.ts` | Adds `ledger: { available, window_days, predictions_logged_24h, scored_7d, closed_unobserved_7d, surface_compared_7d }` on the public path. With the cron bearer token it also carries `surface_hits_7d`, `surface_hit_rate_7d` and `by_region` (the founder gate table). Informational only; never changes the verdict. |

`vercel.json` is unchanged: no extra cron is needed on the Hobby plan.

## What is logged

One row per `(resort_id, for_date, horizon_days)`, inserted once and never overwritten (`ON CONFLICT DO NOTHING`). In season the refresh runs every 30 minutes; a row that moved with every re-run until the day was over would not be a frozen call and would inflate the same-day hit rate. `made_at` is therefore the first forecast of that resort-local day: 03:00-07:00 local on the daily 11:00 UTC schedule, shortly after local midnight on the half-hourly in-season schedule. The run summary reports `ledger.logged` (new rows) and `ledger.already_frozen` (keys that already existed).

Each run writes, for every active resort whose refresh succeeded:

| horizon_days | Target day (`for_date`, resort-local) |
| --- | --- |
| 0 | today |
| 1 | tomorrow |
| n | the coming Saturday (n = days until Saturday; on a Friday this is the tomorrow row, on a Saturday the following Saturday, n = 7) |

Prediction columns:

- `surface_class`, `surface_confidence`: the SANY code from `lib/snowSurface`. Day 0 reuses the class the run just stored on `resorts.current_surface_class`, so the ledger and the resort page agree. Later horizons roll the same window forward one forecast day at a time (`forecastDayToDailyWeather`), with confidence capped exactly as the resort page caps its three forecast days (`classifyForecast` over tomorrow, +2, +3): tomorrow keeps the classifier's confidence, two days out is at most medium, three or more days out is low. Null when the resort is closed or off-season (dormant): the numbers are still logged, no surface is claimed, and nothing can score as a hit.
- `forecast_snow_in` (base elevation, 0.1"), `forecast_high_f`, `forecast_low_f`, `forecast_gust_mph` from the forecast strip day.
- `source`: `forecast_updated_at`, `day_source` (nws / open-meteo), `nws_coverage`, `classifier` (`snowSurface` / `dormant` / `forecast_gap`), `window_days`, `day0_from_stored`.

About 3 rows per resort per day: roughly 1,300 rows a day, 200k a season. Retention: 24 months (delete statement at the bottom of the SQL).

## How a row is scored

At the end of every refresh, `scorePendingDays` asks for the oldest unscored `for_date` up to UTC yesterday and scores every day from there through yesterday (at most 10 days back; older days are for the manual route). At 11:00 UTC every US zone's local yesterday is UTC yesterday, so one date covers the country. Walking every pending day rather than a fixed one or two is what lets a row whose observation landed late be scored on day 2 and a row with no observation be closed on day 3 without anyone running anything by hand.

Inside a day the unscored rows are read in keyset pages of 1,000 by `id` (a Saturday accumulates horizons 0, 1 and 2-7 from the preceding week, several thousand rows), each page's observations are read with range paging, and the updates are written before the next page. Scoring stops between pages when the run's budget is nearly spent and resumes on the next run.

Actuals come from `weather_history` for that resort-day (the measured layer: NOHRSC analysis snowfall, lowest live station highs/lows, SNOTEL, Open-Meteo fill):

- `actual_snow_in`, `actual_high_f`, `actual_low_f`, and `snow_abs_err_in = |forecast - actual|` when both exist.
- `actual_gust_mph` is always null for now: `weather_history` carries a daily average wind but no daily peak gust. The column is reserved.
- `actual_surface_class`: the same classifier re-run on OBSERVED inputs only, the up-to-8 `weather_history` rows ending on the target day, with the resort's current base depth and open flag as snowpack evidence. Null when the resort is closed, or unknown during the May to mid-October off-season (there is no skiable surface to have been right about).
- `actual_source`: `{ table, observed_date, window_days, history_sources }`, where `history_sources` is the per-column provenance from `forecast_json.measured` when it describes that day.

A row whose target day is 3 or more days old and still has no `weather_history` row is closed with null actuals and `actual_source.reason = "no_observation"`, so it is not retried forever. Rows with a recent target day and no observation yet stay unscored for the next pass. In the health block these closed rows are reported separately as `closed_unobserved_7d`; `scored_7d` counts only rows scored against an observation, so a dead history feed shows up as closed rows climbing while scored rows do not.

### Hit definition

`surface_hit` is true when the predicted class equals the observed class, or is its neighbour in this table. It is null when either side has no class (dormant prediction, closed resort, no observation).

| Predicted | Counts as a hit against |
| --- | --- |
| PP Powder | PP, PPC |
| PPC Packed powder | PPC, PP, MG |
| MG Machine groomed | MG, PPC, LSG |
| LSG Loose granular | LSG, MG, FG, WG |
| FG Frozen granular | FG, LSG, IP |
| IP Icy | IP, FG |
| WS Wet snow | WS, WG |
| WG Wet granular | WG, WS, LSG |
| VC Variable | VC only |

Rationale: the pairs are the ones a rider would not feel as a wrong call. Powder groomed overnight is machine groomed; frozen granular that set up hard is icy patches; wet snow that refroze loose is wet granular. PP and IP are never neighbours, in either direction. VC means "not enough signal", so a VC prediction only scores as a hit when the observed inputs were equally inconclusive; it is counted honestly, not excused.

### Known biases of the "actual" label

- It is a model label, not a human on the hill. Both sides share the classifier's rules, so a systematic rule error can look like a hit on both sides. Numeric errors (`snow_abs_err_in`, temperature deltas) do not have this problem and are the more trustworthy series.
- Base depth and the open flag used for the observed class are the resort's values at scoring time, one day later, not on the target day.
- `weather_history` temperatures come from the lowest live station, which may be some distance from the base area.
- Groomer behaviour is invisible to both sides.
- The day-0 row is the first forecast of the local day, not a mid-morning one. On the in-season half-hourly schedule that is close to a "night before" call, which is slightly harder than what a rider sees on the page at 7 am. This makes the same-day number conservative rather than flattering, which is the right direction for a claim.

## What may be claimed publicly, and when

Nothing, until all of these hold:

1. At least 200 scored rows with `surface_hit` not null per region (`resorts.region`), per horizon (0, 1, Saturday), from in-season days only. Off-season and dormant rows never count (their `surface_hit` is null). The `by_region` table in `/api/health` (cron bearer token required) shows this gate per region and horizon.
2. The founder has reviewed the numbers, including the per-class confusion (which classes are being missed, and in which direction) and the snow MAE by horizon and by forecast source.
3. Any wording says what was measured: "same or adjacent surface class, scored against station and analysis data, n days ahead". Never "accurate", never a bare percentage without n, horizon and region.

Until then:

- The public `/api/health` reports availability and volume counts only. Hit counts, the 7-day hit rate (withheld below 30 compared rows) and the per-region table are returned only to a request carrying the cron bearer token, so nothing scrapeable can be quoted as Wynla's accuracy. Those numbers are an ops signal, not a marketing number.
- No user-facing surface shows a hit rate, a streak or a "called it" badge.
- The Thursday email and the share card make no accuracy claim.

Review queries (Supabase SQL editor, service role):

```sql
-- hit rate by region and horizon (the same numbers as the view)
select region, horizon_days, compared, hits,
       round(hits::numeric / nullif(compared, 0), 3) as hit_rate
from public.prediction_log_region_stats
order by 1, 2;

-- confusion: what did we say vs what the observed inputs said
select surface_class as predicted, actual_surface_class as observed, count(*)
from public.prediction_log
where surface_hit is not null
group by 1, 2 order by 3 desc;

-- snow error by horizon and source
select horizon_days, source->>'day_source' as src,
       count(snow_abs_err_in) as n, round(avg(snow_abs_err_in), 2) as mae_in
from public.prediction_log
where scored_at is not null
group by 1, 2 order by 1, 2;

-- feed gaps: closed without an observation, by day
select for_date, count(*)
from public.prediction_log
where actual_source->>'reason' = 'no_observation'
group by 1 order by 1 desc;
```

## Operating notes

- The table and view are created by `handoff-docs/sql/2026-09-23-ledger.sql`. Until they exist the daily run logs one warning (`[predictionLog] prediction_log is unavailable (write, PGRST205: ...)`) and re-probes ten minutes later; `ledger.available` is false in the run summary and in `/api/health`, and nothing else changes. A missing column (42703 / PGRST204, a partial migration) prints its own code so it is not mistaken for a missing table.
- Backfill after an outage: `GET /api/cron/score-predictions` with no params repeats the pending pass (10-day lookback); `?from=YYYY-MM-DD&to=YYYY-MM-DD` reaches older days (max 31 per call, stops early when the budget runs low). Predictions themselves cannot be backfilled; a day the refresh did not run has no frozen forecast, which is the honest outcome.
- The refresh's ledger step runs after the surface classes are stored and before the health check. It needs 25 s of remaining budget; a run that ran out of time skips it and says `ledger.skipped = "out_of_time"`, and a scoring pass cut short between pages reports the same and continues next run.
- Time: about seven insert requests plus, per pending day, one page read, up to four history/resort reads and up to five update requests. A few seconds on a normal day.
- Season 2 candidates once the numbers are reviewed: a per-user "your days" recap, a public track-record page with n and horizon shown, and using the confusion matrix to tune the classifier's thresholds.
