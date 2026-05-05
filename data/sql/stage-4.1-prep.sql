-- ============================================================================
-- Stage 4.1 prep — verify + insert 3 Batch-5 skipped resorts
-- Generated 2026-05-04
--
-- Background: Batch 5 skipped 3 resorts as "likely-dups". Verify presence
-- in DB and insert the missing ones. Idempotent — safe to re-run.
--
-- Source: scraped from official pass sites (output/epic_detailed.json,
-- output/ikon_detailed.json) confirms:
--   - Mt Brighton, MI         → epic  (Vail-owned, near Brighton MI)
--   - Alpine Valley, OH       → epic  (Vail-owned, near Cleveland OH)
--   - Killington-Pico, VT     → ikon  (Killington main + Pico ski-linked)
--
-- Run sections in order. Section 1 is read-only diagnostic.
-- ============================================================================


-- ============================================================
-- SECTION 1 — Diagnostic (read-only): see what's in DB now
-- ============================================================
-- Expected hits BEFORE upsert:
--   - brighton-ut          → already in DB (Brighton, UT — Ikon)  → DO NOT TOUCH
--   - alpine-valley-mi     → may exist (Alpine Valley, MI)        → DO NOT TOUCH
--   - mt-brighton          → likely MISSING (this is the Vail one)
--   - alpine-valley-oh     → likely MISSING (this is the Vail one)
--   - killington           → likely MISSING (Ikon main; Pico = small linked mountain)
SELECT slug, name, state, passes, tier, latitude, longitude, vertical_drop
FROM resorts
WHERE slug ILIKE ANY (ARRAY['%brighton%', '%alpine-valley%', '%killington%', '%pico%'])
   OR name ILIKE ANY (ARRAY['%brighton%', '%alpine valley%', '%killington%', '%pico%'])
ORDER BY slug;


-- ============================================================
-- SECTION 2 — Idempotent UPSERT
-- - INSERT if slug missing
-- - If slug exists: union passes (dedup), backfill NULL coords/vert,
--   bump last_verified_at. Never overwrites existing non-NULL values.
-- ============================================================
BEGIN;

INSERT INTO resorts (
  slug, name, state, region, latitude, longitude,
  passes, website_url, operating_status, tier, active,
  vertical_drop, last_verified_at
) VALUES
  -- Mt Brighton, MI (Vail Resorts, Detroit metro). Public: 230 ft vert, 25 trails.
  ('mt-brighton', 'Mt Brighton', 'MI', 'Southeast Michigan',
   42.5167, -83.7919, ARRAY['epic']::TEXT[],
   'https://www.mtbrighton.com', 'active', 'listed', true,
   230, NOW()),

  -- Alpine Valley, OH (Vail Resorts, Cleveland metro). Public: 230 ft vert, 11 trails.
  ('alpine-valley-oh', 'Alpine Valley Ski Area', 'OH', 'Northeast Ohio',
   41.5350, -81.2117, ARRAY['epic']::TEXT[],
   'https://www.alpinevalleyohio.com', 'active', 'listed', true,
   230, NOW()),

  -- Killington Resort, VT (POWDR / Ikon). Public: 3,050 ft vert, 155+ trails.
  -- Note: Ikon lists "Killington-Pico" as ski-linked. Pico Mountain (1,967 ft)
  -- can be added as a separate row later if needed; for now Killington is canonical.
  ('killington', 'Killington Resort', 'VT', 'Green Mountains',
   43.6042, -72.8086, ARRAY['ikon']::TEXT[],
   'https://www.killington.com', 'active', 'listed', true,
   3050, NOW())

ON CONFLICT (slug) DO UPDATE SET
  -- Union passes from existing + new, dedup. Adds 'ikon'/'epic' if missing,
  -- preserves any other passes already present.
  passes = ARRAY(
    SELECT DISTINCT unnest(resorts.passes || EXCLUDED.passes)
  ),
  -- Backfill NULL only — never overwrite existing values.
  vertical_drop = COALESCE(resorts.vertical_drop, EXCLUDED.vertical_drop),
  latitude      = COALESCE(resorts.latitude,      EXCLUDED.latitude),
  longitude     = COALESCE(resorts.longitude,     EXCLUDED.longitude),
  region        = COALESCE(resorts.region,        EXCLUDED.region),
  website_url   = COALESCE(resorts.website_url,   EXCLUDED.website_url),
  last_verified_at = NOW();

COMMIT;


-- ============================================================
-- SECTION 3 — Verify after upsert
-- ============================================================
SELECT slug, name, state, passes, tier, vertical_drop, latitude, longitude
FROM resorts
WHERE slug IN ('mt-brighton', 'alpine-valley-oh', 'killington')
ORDER BY slug;

-- Final check: total active count should be 451 (no change) or 452-454 (1-3 new).
SELECT COUNT(*) AS active_total FROM resorts WHERE active = true;
