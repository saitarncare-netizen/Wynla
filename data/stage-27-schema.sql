-- Stage 27 — lift ticket pricing (current / starting-at).
-- Refreshed by daily cron during season; stays null off-season.

BEGIN;

ALTER TABLE resorts
  ADD COLUMN IF NOT EXISTS ticket_price_adult_min INTEGER
    CHECK (ticket_price_adult_min IS NULL OR (ticket_price_adult_min >= 0 AND ticket_price_adult_min <= 500)),
  ADD COLUMN IF NOT EXISTS ticket_price_adult_max INTEGER
    CHECK (ticket_price_adult_max IS NULL OR (ticket_price_adult_max >= 0 AND ticket_price_adult_max <= 1000)),
  ADD COLUMN IF NOT EXISTS ticket_price_currency TEXT DEFAULT 'USD'
    CHECK (ticket_price_currency IS NULL OR LENGTH(ticket_price_currency) = 3),
  ADD COLUMN IF NOT EXISTS ticket_booking_url TEXT,
  ADD COLUMN IF NOT EXISTS ticket_price_updated_at TIMESTAMPTZ;

COMMENT ON COLUMN resorts.ticket_price_adult_min IS 'Lowest published adult day ticket (advance/value day).';
COMMENT ON COLUMN resorts.ticket_price_adult_max IS 'Highest published adult day ticket (peak day / window walk-up).';
COMMENT ON COLUMN resorts.ticket_booking_url IS 'Direct link to resort lift-ticket purchase page.';

COMMIT;
