-- Stage 11: in-app weather/wind/snow.
--
-- Daily refresh from weather.gov (US federal) + Open-Meteo (free
-- worldwide). One row per active resort. Public RLS read so the map
-- + ResortPanel + trip pages can all consume it without auth. Writes
-- come from the server-side cron only.

CREATE TABLE IF NOT EXISTS weather_cache (
  resort_id          INTEGER PRIMARY KEY REFERENCES resorts(id) ON DELETE CASCADE,

  -- weather.gov gridpoint identifier so we can refetch without going
  -- through the lat/lng → grid lookup every run.
  nws_grid_office    TEXT,
  nws_grid_x         INTEGER,
  nws_grid_y         INTEGER,

  -- Today's forecast (next 24h) at the resort point.
  temp_high_f        INTEGER,
  temp_low_f         INTEGER,
  conditions_short   TEXT,    -- "Snow", "Sunny", "Mostly Cloudy", …
  conditions_long    TEXT,    -- multi-sentence detailedForecast
  precip_chance      INTEGER, -- 0-100 %

  -- Snow forecast (next 24h / 48h, in inches). weather.gov gridpoint
  -- forecast returns snowfallAmount as mm; we store inches for the UI.
  snow_24h_in        NUMERIC(5,1),
  snow_48h_in        NUMERIC(5,1),

  -- Wind from Open-Meteo current_weather (gives sustained avg + gust).
  wind_mph_avg       INTEGER,
  wind_mph_gust      INTEGER,
  wind_dir_deg       INTEGER,
  wind_dir_short     TEXT,    -- "N", "NE", "E", "SE", "S", "SW", "W", "NW"

  forecast_for_date  DATE,
  fetched_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fetch_source       TEXT,    -- "nws+meteo", "stale", or null on first miss
  fetch_error        TEXT     -- last error string for debugging stuck rows
);

ALTER TABLE weather_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weather_public_read ON weather_cache;
CREATE POLICY weather_public_read ON weather_cache FOR SELECT USING (true);

-- No client-side write policies — only the service-role cron writes.
