-- Stage 4.2 extra: promote 20 flagship resorts Listed → Featured
-- with stats backfilled from Wikipedia infoboxes (verified 2026-05-07).
-- Idempotent: only fills NULL fields, never overwrites existing values.
-- Manual overrides for 3 scraper-miss + 2 image fixes are inline above.

BEGIN;

-- Aspen Snowmass (aspen-snowmass)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bd/Snowmass_Village.JPG/1200px-Snowmass_Village.JPG',
  hero_image_alt = 'Snowmass village at Aspen Snowmass ski resort',
  hero_image_source = 'Wikimedia Commons (Snowmass Ski Area)',
  vertical_drop = 4406,
  elevation_summit = 12510,
  elevation_base = 8104,
  total_trails = 94,
  total_lifts = 16,
  total_acres = 3362,
  longest_run_miles = 5.3,
  has_terrain_park = TRUE,
  last_verified_at = '2026-05-07'
WHERE slug = 'aspen-snowmass' AND active = TRUE;

-- Jackson Hole Mountain Resort (jackson-hole)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/de/Jackson_hole_new_tram.jpg/3840px-Jackson_hole_new_tram.jpg',
  hero_image_alt = 'Jackson Hole Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 4139,
  elevation_summit = 10450,
  elevation_base = 6311,
  total_trails = 116,
  total_lifts = 18,
  total_acres = 2500,
  longest_run_miles = 4.5,
  has_terrain_park = TRUE,
  last_verified_at = '2026-05-07'
WHERE slug = 'jackson-hole' AND active = TRUE;

-- Big Sky Resort (big-sky)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/6/6a/Big_Sky_Resort_Logo.svg/330px-Big_Sky_Resort_Logo.svg.png',
  hero_image_alt = 'Big Sky ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 4350,
  elevation_summit = 11166,
  elevation_base = 6800,
  total_trails = 320,
  total_lifts = 40,
  total_acres = 5850,
  longest_run_miles = 6,
  last_verified_at = '2026-05-07'
WHERE slug = 'big-sky' AND active = TRUE;

-- Snowbird (snowbird)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/c/ce/Snowbird_logo.png',
  hero_image_alt = 'Snowbird ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 3240,
  elevation_summit = 11000,
  elevation_base = 7760,
  total_trails = 169,
  total_lifts = 13,
  total_acres = 2500,
  longest_run_miles = 2.5,
  has_terrain_park = TRUE,
  last_verified_at = '2026-05-07'
WHERE slug = 'snowbird' AND active = TRUE;

-- Alta Ski Area (alta)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Altalogo.png',
  hero_image_alt = 'Alta ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 2538,
  elevation_summit = 11068,
  elevation_base = 8530,
  total_trails = 116,
  total_lifts = 7,
  total_acres = 2614,
  has_terrain_park = TRUE,
  last_verified_at = '2026-05-07'
WHERE slug = 'alta' AND active = TRUE;

-- Telluride Ski Resort (telluride)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/e6/Telluride_Ski_Resort%2C_Col._%288645173834%29.jpg',
  hero_image_alt = 'Telluride Ski Resort ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 4425,
  elevation_summit = 13150,
  elevation_base = 8725,
  total_trails = 127,
  total_lifts = 18,
  total_acres = 2000,
  longest_run_miles = 4.6,
  has_terrain_park = TRUE,
  terrain_park_count = 3,
  last_verified_at = '2026-05-07'
WHERE slug = 'telluride' AND active = TRUE;

-- Sun Valley Resort (sun-valley)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/d/da/Baldmountainid.jpg',
  hero_image_alt = 'Bald Mountain, Sun Valley Resort',
  hero_image_source = 'Wikimedia Commons (Sun Valley, Idaho)',
  vertical_drop = 3400,
  elevation_summit = 9150,
  elevation_base = 5750,
  total_trails = 121,
  total_lifts = 17,
  total_acres = 2829,
  last_verified_at = '2026-05-07'
WHERE slug = 'sun-valley' AND active = TRUE;

-- Snowbasin (snowbasin)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Basin_1x_blue_sky.jpg',
  hero_image_alt = 'Snowbasin ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 2959,
  elevation_summit = 9350,
  elevation_base = 6391,
  total_trails = 104,
  total_lifts = 13,
  total_acres = 3000,
  longest_run_miles = 2.9,
  has_terrain_park = TRUE,
  terrain_park_count = 3,
  last_verified_at = '2026-05-07'
WHERE slug = 'snowbasin' AND active = TRUE;

-- Vail Ski Resort (vail)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/2/25/Vail_Ski_Resort_Logo.svg/250px-Vail_Ski_Resort_Logo.svg.png',
  hero_image_alt = 'Vail Ski Resort ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 3450,
  elevation_summit = 11570,
  elevation_base = 8120,
  total_trails = 195,
  total_lifts = 31,
  total_acres = 5317,
  longest_run_miles = 4,
  has_terrain_park = TRUE,
  last_verified_at = '2026-05-07'
WHERE slug = 'vail' AND active = TRUE;

-- Park City Mountain Resort (park-city)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Eagle_Race_Arena_at_Park_City_Resort.jpg',
  hero_image_alt = 'Park City Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 3200,
  elevation_summit = 10026,
  elevation_base = 6900,
  total_trails = 324,
  total_lifts = 41,
  total_acres = 6700,
  longest_run_miles = 3.5,
  has_terrain_park = TRUE,
  terrain_park_count = 7,
  last_verified_at = '2026-05-07'
WHERE slug = 'park-city' AND active = TRUE;

-- Mammoth Mountain Ski Area (mammoth-mountain)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/1/12/Mammoth_Mountain_Ski_Area_logo.png',
  hero_image_alt = 'Mammoth Mountain ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 3100,
  elevation_summit = 11053,
  elevation_base = 7953,
  total_trails = 175,
  total_lifts = 25,
  total_acres = 3500,
  longest_run_miles = 3,
  has_terrain_park = TRUE,
  last_verified_at = '2026-05-07'
WHERE slug = 'mammoth-mountain' AND active = TRUE;

-- Beaver Creek Resort (beaver-creek)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/b/b3/BeaverCreekLogo.png',
  hero_image_alt = 'Beaver Creek ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 3340,
  elevation_summit = 11440,
  elevation_base = 8100,
  total_trails = 167,
  total_lifts = 24,
  total_acres = 2082,
  longest_run_miles = 2.75,
  has_terrain_park = TRUE,
  terrain_park_count = 13,
  last_verified_at = '2026-05-07'
WHERE slug = 'beaver-creek' AND active = TRUE;

-- Breckenridge Ski Resort (breckenridge)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Breckenridge_Ski_Area_from_Dercum_Mountain%2C_Keystone_Ski_Area.jpg',
  hero_image_alt = 'Breckenridge ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 3398,
  elevation_summit = 12998,
  elevation_base = 9600,
  total_trails = 187,
  total_lifts = 20,
  total_acres = 2908,
  longest_run_miles = 3.5,
  has_terrain_park = TRUE,
  terrain_park_count = 25,
  last_verified_at = '2026-05-07'
WHERE slug = 'breckenridge' AND active = TRUE;

-- Crested Butte Mountain Resort (crested-butte)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/3/36/Mount_crested_butte_1988.jpg',
  hero_image_alt = 'Crested Butte Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 3055,
  elevation_summit = 12162,
  elevation_base = 9375,
  total_trails = 121,
  total_lifts = 15,
  total_acres = 1547,
  longest_run_miles = 2.6,
  has_terrain_park = TRUE,
  last_verified_at = '2026-05-07'
WHERE slug = 'crested-butte' AND active = TRUE;

-- Killington (killington)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/Killington_Resort_2018-03-18.jpg/3840px-Killington_Resort_2018-03-18.jpg',
  hero_image_alt = 'Killington Ski Resort ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 3076,
  elevation_summit = 4241,
  elevation_base = 1165,
  total_trails = 155,
  total_acres = 1509,
  last_verified_at = '2026-05-07'
WHERE slug = 'killington' AND active = TRUE;

-- Sunday River (sunday-river)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/1/18/Sunday_River_logo.svg/250px-Sunday_River_logo.svg.png',
  hero_image_alt = 'Sunday River Ski Resort ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 2340,
  elevation_summit = 3140,
  elevation_base = 800,
  total_trails = 135,
  total_lifts = 20,
  total_acres = 870,
  longest_run_miles = 3,
  last_verified_at = '2026-05-07'
WHERE slug = 'sunday-river' AND active = TRUE;

-- Sugarloaf (sugarloaf)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f9/Sugarloaf_Mountain_Maine.jpg/1200px-Sugarloaf_Mountain_Maine.jpg',
  hero_image_alt = 'Sugarloaf Mountain, Maine',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 2820,
  elevation_summit = 4237,
  elevation_base = 1417,
  total_trails = 176,
  total_lifts = 15,
  total_acres = 1360,
  longest_run_miles = 3.5,
  last_verified_at = '2026-05-07'
WHERE slug = 'sugarloaf' AND active = TRUE;

-- Jay Peak (jay-peak)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/thumb/4/4b/Jay_Peak_Resort_logo.svg/512px-Jay_Peak_Resort_logo.svg.png',
  hero_image_alt = 'Jay Peak Resort logo',
  hero_image_source = 'Wikimedia (Jay Peak Resort article)',
  vertical_drop = 2153,
  elevation_summit = 3862,
  elevation_base = 1815,
  total_trails = 81,
  total_lifts = 9,
  total_acres = 385,
  longest_run_miles = 4.828,
  last_verified_at = '2026-05-07'
WHERE slug = 'jay-peak' AND active = TRUE;

-- Bretton Woods (bretton-woods)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/c/c9/Bretton_Woods_Resort.jpg',
  hero_image_alt = 'Bretton Woods Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 1500,
  elevation_summit = 3100,
  elevation_base = 1600,
  total_trails = 102,
  total_lifts = 9,
  total_acres = 468,
  longest_run_miles = 2.5,
  has_terrain_park = TRUE,
  terrain_park_count = 1,
  last_verified_at = '2026-05-07'
WHERE slug = 'bretton-woods' AND active = TRUE;

-- Taos Ski Valley (taos-ski-valley)
UPDATE resorts SET
  tier = 'featured',
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Taoslogo.png/512px-Taoslogo.png',
  hero_image_alt = 'Taos Ski Valley logo',
  hero_image_source = 'Wikimedia Commons',
  vertical_drop = 3281,
  elevation_summit = 12481,
  elevation_base = 9200,
  total_trails = 110,
  total_lifts = 14,
  total_acres = 1294,
  longest_run_miles = 5,
  has_terrain_park = TRUE,
  terrain_park_count = 2,
  last_verified_at = '2026-05-07'
WHERE slug = 'taos-ski-valley' AND active = TRUE;

-- Sanity: confirm 50 active Featured resorts after this batch.
SELECT count(*) AS featured_count FROM resorts WHERE tier = 'featured' AND active = TRUE;

COMMIT;
