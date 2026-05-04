-- Stage 3.6 pass-truth corrections — applied subset (62 of 110)
-- Generated 2026-05-04T15:29:33.796Z
--
-- Apply policy: additive only.
--   1. Featured tier corrections (manually verified)
--   2. REPLACE_PASS where current is ["independent"] (Stage 2 missed tag)
--   3. ADD_PASS (only adds tags, never removes)
--
-- Held for separate review (48):
--   - REMOVE_PASS for listed tier (2): need cache + news cross-check
--   - REPLACE_PASS "indy → independent" (~36): scraped cache incomplete,
--     DB Stage 2 tags likely correct, conservative hold
--   - "other REPLACE" (~8): mostly diff false positives

BEGIN;

UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'cannon-mountain'; -- ★ featured
UPDATE resorts SET passes = ARRAY['ikon']::TEXT[], last_verified_at = NOW() WHERE slug = 'jiminy-peak'; -- ★ featured
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'mohawk-mountain-ski-area'; -- ★ featured
UPDATE resorts SET passes = ARRAY['mountain_collective']::TEXT[], last_verified_at = NOW() WHERE slug = 'whiteface-mountain'; -- ★ featured
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'antelope-butte';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'arctic-valley';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'bear-creek-mountain-resort';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'beaver-mountain';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'big-powderhorn-mountain';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'blacktail';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'blue-knob';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'bottineau-winter-park';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'buffalo-ski-club';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'caberfae-peaks';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'camden-snow-bowl';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'cherry-peak';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'chestnut-mountain';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'cooper-spur';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'crystal-mountain-mi';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'dartmouth-skiway';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'eaglecrest-ski-area';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'echo-mountain';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'great-bear';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'hilltop-ski-area';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'hoedown-hill';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'howelsen-hill';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'huff-hills';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'hurricane-ridge';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'hyland-hills';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'kelly-canyon';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'king-pine';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'little-switzerland';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'loup-loup';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'maple-ski-ridge';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'marquette-mountain';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'mcintyre-ski-area';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'meadowlark';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'mont-ripley';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'skiland';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'mt-abram';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'mt-eyak-ski-area';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'mt-hood-meadows';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'nordic-mountain';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'norway-mountain';
UPDATE resorts SET passes = ARRAY['epic']::TEXT[], last_verified_at = NOW() WHERE slug = 'paoli-peaks';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'pine-mountain';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'pomerelle';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'porcupine-mountains';
UPDATE resorts SET passes = ARRAY['ikon']::TEXT[], last_verified_at = NOW() WHERE slug = 'sierra-at-tahoe';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'snowstar';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'sunburst';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'sundown-mountain';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'tenney-mountain';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'titus-mountain';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'tussey-mountain';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'tyrol-basin';
UPDATE resorts SET passes = ARRAY['indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'whaleback-mountain';
UPDATE resorts SET passes = ARRAY['ikon']::TEXT[], last_verified_at = NOW() WHERE slug = 'wild-mountain';
UPDATE resorts SET passes = ARRAY['epic']::TEXT[], last_verified_at = NOW() WHERE slug = 'woodward-park-city';
UPDATE resorts SET passes = ARRAY['ikon','mountain_collective']::TEXT[], last_verified_at = NOW() WHERE slug = 'alyeska-resort';
UPDATE resorts SET passes = ARRAY['ikon','indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'granite-peak';
UPDATE resorts SET passes = ARRAY['ikon','indy']::TEXT[], last_verified_at = NOW() WHERE slug = 'lutsen-mountains';

COMMIT;

-- Verify: pass distribution after apply
SELECT unnest(passes) AS pass, COUNT(*) FROM resorts GROUP BY unnest(passes) ORDER BY pass;
SELECT name, passes FROM resorts WHERE slug IN ('cannon-mountain','jiminy-peak','mohawk-mountain-ski-area','whiteface-mountain') ORDER BY name;
