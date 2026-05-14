-- Stage 33 — OnTheSnow.com URL discovery cache for the daily snow scraper.
-- The scraper at /api/cron/refresh-snow-conditions tries to derive each
-- resort's OnTheSnow snow-report page on first hit, then stores the
-- discovered URL here so subsequent runs skip the 1-3 probe requests.
--
-- onthesnow_url               Cached snow-report URL once verified.
-- onthesnow_url_verified_at   Set when discovery returned a 200.
-- onthesnow_last_404_at       Set when discovery gave up; we then skip
--                             this resort for ~7 days before re-trying.

BEGIN;

ALTER TABLE resorts ADD COLUMN IF NOT EXISTS onthesnow_url TEXT;
ALTER TABLE resorts ADD COLUMN IF NOT EXISTS onthesnow_url_verified_at TIMESTAMPTZ;
ALTER TABLE resorts ADD COLUMN IF NOT EXISTS onthesnow_last_404_at TIMESTAMPTZ;

-- Widen snow_report_status to include the "unknown" sentinel we set when
-- OnTheSnow fails and only the Open-Meteo fallback ran.
ALTER TABLE resorts DROP CONSTRAINT IF EXISTS resorts_snow_report_status_check;
ALTER TABLE resorts ADD CONSTRAINT resorts_snow_report_status_check
  CHECK (snow_report_status IS NULL OR snow_report_status IN ('open', 'closed', 'limited', 'off-season', 'unknown'));

COMMIT;
