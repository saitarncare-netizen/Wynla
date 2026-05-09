-- Stage 13: per-resort day counts ("Vail 3 days, Beaver Creek 2 days")
-- replacing the old basecamp/roadtrip binary with a flexible stops list.
--
-- Schema change: parallel arrays.
--   resort_slugs[]      — each unique stop in order
--   days_per_resort[]   — how many days at each stop, same length & order
--
-- For backward compatibility the old shape (resort_slugs flat-listed
-- one-per-day) is treated as days_per_resort[] all-1s when the new
-- column is null.

ALTER TABLE trips
  ADD COLUMN IF NOT EXISTS days_per_resort INTEGER[];

-- Optional: drop the lodging_mode column entirely. We keep it for now
-- as a hint ("basecamp" rows tend to have all-same slug) but no UI
-- writes it anymore. Future migration can DROP COLUMN once we're sure
-- nothing reads it.
