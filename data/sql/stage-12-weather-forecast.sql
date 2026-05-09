-- Stage 12: extend weather_cache with a 7-day forecast.
--
-- We already pay for the weather.gov /forecast call (returns up to 14
-- periods = 7 days × day/night) and the Open-Meteo /forecast call —
-- they were previously throwing away the future periods. Now we keep
-- them all in one JSONB array per resort so the WeatherCard UI can
-- show today big + 6 future days as scrollable chips à la iPhone
-- Weather.

ALTER TABLE weather_cache
  ADD COLUMN IF NOT EXISTS forecast_json JSONB;

-- Schema for the array (1 entry per future day, including today):
-- [
--   {
--     "date": "2026-05-09",
--     "weekday": "Sat",
--     "temp_high_f": 34,
--     "temp_low_f": 18,
--     "conditions_short": "Snow",
--     "snow_in": 4.0,
--     "precip_chance": 80,
--     "wind_mph_avg": 12,
--     "wind_dir_short": "NW"
--   },
--   { ... 6 more days ... }
-- ]
