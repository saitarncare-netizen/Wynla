-- 29 additional resorts beyond Hunter Mountain
-- Run this AFTER seed.sql (which creates the table + Hunter Mountain).
-- Researched 2026-05-02 from Wikipedia + official resort websites for the 2025-2026 season.
-- NULL means data was not confirmed in source — never fabricated.

INSERT INTO resorts (
  slug, name, state, region, city, address,
  latitude, longitude, elevation_base, elevation_summit,
  pass, vertical_drop, total_acres, total_trails,
  trails_beginner, trails_intermediate, trails_advanced, trails_expert,
  total_lifts, longest_run_miles,
  has_terrain_park, terrain_park_count, has_halfpipe, has_glades, has_night_skiing,
  beginner_area_size, typical_season_start, typical_season_end,
  website_url, active
) VALUES
  -- Catskills, NY
  ('windham-mountain', 'Windham Mountain', 'NY', 'Catskills', 'Windham', 'Windham, NY', 42.2987, -74.2573, 1500, 3100, 'independent', 1600, 285, 54, 12, 25, 10, 7, 11, 2.37, true, 6, NULL, NULL, true, NULL, NULL, NULL, 'https://www.windhammountainclub.com', true),
  ('belleayre-mountain', 'Belleayre Mountain', 'NY', 'Catskills', 'Highmount', 'Highmount, NY', 42.1422, -74.5108, 2025, 3429, 'independent', 1404, 171, 62, 18, 24, 10, 4, 5, 2.28, true, 3, NULL, true, false, NULL, NULL, NULL, 'https://www.belleayre.com', true),
  ('plattekill-mountain', 'Plattekill Mountain', 'NY', 'Catskills', 'Roxbury', '469 Plattekill Road, Roxbury, NY 12474', 42.2903, -74.6537, 2400, 3500, 'indy', 1100, NULL, 41, NULL, NULL, NULL, NULL, 4, NULL, true, 1, NULL, NULL, NULL, NULL, NULL, NULL, 'https://plattekill.com', true),

  -- Adirondacks, NY
  ('gore-mountain', 'Gore Mountain', 'NY', 'Adirondacks', 'North Creek', 'North Creek, NY', 43.6722, -74.0069, 998, 3600, 'independent', 2537, 428, 110, NULL, NULL, NULL, NULL, 14, 3.7, true, 4, true, true, true, NULL, NULL, NULL, 'https://goremountain.com', true),
  ('whiteface-mountain', 'Whiteface Mountain', 'NY', 'Adirondacks', 'Wilmington', 'Wilmington, NY', 44.3658, -73.9028, 1220, 4386, 'independent', 3166, 299, 94, NULL, NULL, NULL, NULL, 11, 2.1, true, 7, NULL, NULL, false, NULL, NULL, NULL, 'https://whiteface.com', true),
  ('mount-pisgah', 'Mount Pisgah', 'NY', 'Adirondacks', 'Saranac Lake', '92 Mt Pisgah Lane, Saranac Lake, NY 12983', 44.3328, -74.1247, NULL, 2057, 'independent', 329, 15, 6, 1, 2, 3, NULL, 1, NULL, NULL, NULL, NULL, NULL, true, 'small', 'Mid December', 'Late March', 'https://saranaclakeny.gov/mount-pisgah/', true),

  -- Hudson Valley, NY
  ('thunder-ridge-ski-area', 'Thunder Ridge Ski Area', 'NY', 'Hudson Valley', 'Patterson', '137 Birch Hill Road, Patterson, NY 12563', 41.50722, -73.58111, NULL, 880, 'independent', 403, 90, 23, NULL, NULL, NULL, NULL, 7, NULL, true, 1, NULL, NULL, true, NULL, NULL, NULL, 'https://thunderridgeski.com', true),
  ('mount-peter', 'Mount Peter', 'NY', 'Hudson Valley', 'Warwick', '51 Old Mt. Peter Road, Warwick, NY 10990', 41.24139, -74.29056, NULL, 1250, 'independent', NULL, NULL, 13, NULL, NULL, NULL, NULL, 7, NULL, true, 1, NULL, NULL, true, NULL, NULL, NULL, 'https://mtpeter.com', true),

  -- Northern NJ
  ('mountain-creek', 'Mountain Creek', 'NJ', 'Northern NJ', 'Vernon Township', '200 Route 94, Vernon Township, NJ 07462', 41.181, -74.513, 449, 1490, 'independent', 1041, 167, 46, 7, 24, 8, NULL, 9, 1.17, true, 18, true, NULL, true, NULL, NULL, NULL, 'https://mountaincreek.com', true),

  -- Poconos, PA
  ('camelback-mountain-resort', 'Camelback Mountain Resort', 'PA', 'Poconos', 'Tannersville', '193 Resort Drive, Tannersville, PA 18372', 41.05139, -75.35528, NULL, 2133, 'ikon', 800, 166, 35, NULL, NULL, NULL, NULL, 16, 0.88, true, 2, NULL, NULL, true, NULL, NULL, NULL, 'https://www.camelbackresort.com', true),
  ('blue-mountain-resort', 'Blue Mountain Resort', 'PA', 'Poconos', 'Palmerton', '1660 Blue Mountain Drive, Palmerton, PA 18071', 40.82222, -75.51333, 458, 1540, 'ikon', 1082, 164, 40, 14, 4, 12, 3, 12, 1.21, true, 5, NULL, true, true, NULL, NULL, NULL, 'https://www.skibluemt.com', true),
  ('shawnee-mountain', 'Shawnee Mountain Ski Area', 'PA', 'Poconos', 'East Stroudsburg', NULL, 41.0408, -75.0833, NULL, 1351, 'indy', 700, 125, 23, NULL, NULL, NULL, NULL, 9, 0.97, true, 2, NULL, NULL, true, NULL, 'Late November', 'Mid-to-late March', 'https://shawneemt.com', true),
  ('jack-frost-mountain', 'Jack Frost Mountain', 'PA', 'Poconos', 'Blakeslee', NULL, 41.111, -75.652, 1400, 2000, 'epic', 600, NULL, 20, NULL, NULL, NULL, NULL, 9, NULL, true, 1, NULL, NULL, true, NULL, NULL, NULL, 'https://www.jfbb.com', true),
  ('big-boulder', 'Big Boulder', 'PA', 'Poconos', 'Lake Harmony', '357 Big Boulder Drive, Lake Harmony, PA 18624', 41.111, -75.652, 1700, 2175, 'epic', 475, NULL, 18, NULL, NULL, NULL, NULL, 7, NULL, true, 2, NULL, NULL, true, NULL, NULL, NULL, 'https://www.jfbb.com', true),
  ('montage-mountain', 'Montage Mountain', 'PA', 'Poconos', 'Scranton', '1000 Montage Mountain Rd, Scranton, PA 18507', 41.3533, -75.6592, 960, 1960, 'indy', 1000, 140, 27, NULL, NULL, NULL, NULL, 9, 1.183, true, 2, NULL, true, true, NULL, NULL, NULL, 'https://www.montagemountainresorts.com', true),
  ('elk-mountain', 'Elk Mountain Ski Resort', 'PA', 'Poconos', 'Union Dale', '344 Elk Mountain Rd, Union Dale, PA 18470', 41.721, -75.559, 1742, 2667, 'independent', 925, 180, 27, 6, 10, 11, 0, 7, 1.75, true, 2, NULL, NULL, true, NULL, NULL, NULL, 'https://www.elkskier.com', true),

  -- Connecticut
  ('mohawk-mountain-ski-area', 'Mohawk Mountain Ski Area', 'CT', 'Connecticut', 'Cornwall', NULL, 41.83675, -73.31342, NULL, NULL, 'independent', 650, 112, 27, NULL, NULL, NULL, NULL, 8, 1.25, NULL, NULL, NULL, NULL, true, NULL, NULL, NULL, 'https://www.mohawkmtn.com', true),
  ('mount-southington', 'Mount Southington Ski Area', 'CT', 'Connecticut', 'Plantsville', 'Mount Vernon Road, Plantsville, CT', 41.58235, -72.92587, 100, 525, 'independent', 425, 51, 14, 6, 4, 2, NULL, 7, 0.08, true, 1, NULL, NULL, true, NULL, NULL, NULL, 'http://www.mountsouthington.com', true),

  -- Massachusetts
  ('berkshire-east', 'Berkshire East Mountain Resort', 'MA', 'Berkshires', 'Charlemont', '66 Thunder Mountain Rd, Charlemont, MA 01339', 42.62083, -72.87694, 520, 1840, 'indy', 1180, 180, 45, 14, 16, 14, 2, 6, 2.5, true, NULL, false, false, true, NULL, NULL, NULL, 'https://berkshireeast.com', true),
  ('catamount-ski-area', 'Catamount Ski Area', 'MA', 'Berkshires', 'South Egremont', NULL, 42.171457, -73.477764, 1000, 2000, 'indy', 1000, 119, 44, 16, 17, 8, 4, 8, 2.5, true, 3, false, true, true, NULL, NULL, NULL, 'http://www.catamountski.com', true),
  ('jiminy-peak', 'Jiminy Peak', 'MA', 'Berkshires', 'Hancock', NULL, 42.55083, -73.29083, 1245, 2375, 'independent', 1150, 170, 45, NULL, NULL, NULL, NULL, 9, 2, true, 3, NULL, NULL, NULL, NULL, NULL, NULL, 'https://www.jiminypeak.com', true),
  ('wachusett-mountain', 'Wachusett Mountain', 'MA', 'Central MA', 'Princeton', NULL, 42.49944, -71.88639, 1000, 2006, 'independent', 1006, 110, 27, 5, 17, 5, NULL, 8, 1.3, true, 1, false, false, true, NULL, NULL, NULL, 'https://www.wachusett.com', true),

  -- Vermont Southern
  ('stratton-mountain', 'Stratton Mountain', 'VT', 'Vermont Southern', 'Stratton', '5 Village Lodge Rd, Stratton Mountain, VT 05155', 43.11417, -72.90667, 1872, 3875, 'ikon', 2003, 670, 99, NULL, NULL, NULL, NULL, 14, 3.0, true, NULL, true, true, false, NULL, 'Mid-November', 'Mid-April', 'https://www.stratton.com', true),
  ('mount-snow', 'Mount Snow', 'VT', 'Vermont Southern', 'West Dover', '39 Mount Snow Rd, West Dover, VT 05356', 42.959, -72.922, 1900, 3600, 'epic', 1700, 601, 86, NULL, NULL, NULL, NULL, 19, 3.1, true, 10, true, true, false, NULL, NULL, NULL, 'https://www.mountsnow.com', true),
  ('magic-mountain', 'Magic Mountain', 'VT', 'Vermont Southern', 'Londonderry', NULL, 43.19278, -72.76, 1350, 2850, 'indy', 1500, 205, 39, NULL, NULL, NULL, NULL, 6, 1.6, true, NULL, NULL, true, true, NULL, NULL, NULL, 'https://www.magicmtn.com', true),
  ('bromley-mountain', 'Bromley Mountain', 'VT', 'Vermont Southern', 'Peru', '3984 VT Rt. 11, Peru, VT 05152', 43.22778, -72.93861, 1950, 3284, 'independent', 1334, 178, 47, NULL, NULL, NULL, NULL, 9, 2.5, true, 3, NULL, true, NULL, NULL, NULL, NULL, 'https://www.bromley.com', true),
  ('okemo-mountain-resort', 'Okemo Mountain Resort', 'VT', 'Vermont Southern', 'Ludlow', '77 Okemo Ridge Rd, Ludlow, VT 05149', 43.40139, -72.71667, 1144, 3344, 'epic', 2200, 667, 123, NULL, NULL, NULL, NULL, 21, 4.5, true, 8, true, true, NULL, NULL, NULL, NULL, 'https://www.okemo.com', true),

  -- New Hampshire (White Mountains)
  ('loon-mountain', 'Loon Mountain', 'NH', 'White Mountains', 'Lincoln', '60 Loon Mountain Rd, Lincoln, NH 03251', 44.03583, -71.62139, 860, 3050, 'ikon', 2190, 403, 73, NULL, NULL, NULL, NULL, 14, NULL, true, 7, true, true, false, NULL, 'Mid-November', 'Mid-April', 'https://www.loonmtn.com', true),
  ('cannon-mountain', 'Cannon Mountain', 'NH', 'White Mountains', 'Franconia', '260 Tramway Drive, Franconia, NH 03580', 44.15645, -71.69842, 1900, 4080, 'independent', 2180, 287, 98, NULL, NULL, NULL, NULL, 9, 2.3, NULL, NULL, NULL, true, NULL, NULL, NULL, NULL, 'https://www.cannonmt.com', true);

-- Verify
SELECT COUNT(*) AS total_resorts FROM resorts;
-- Should return 30 (1 Hunter Mountain + 29 new)

SELECT pass, COUNT(*) FROM resorts GROUP BY pass ORDER BY pass;
-- Expected approximate distribution:
--   epic         5 (Hunter, Jack Frost, Big Boulder, Mount Snow, Okemo)
--   ikon         4 (Camelback, Blue Mountain, Stratton, Loon)
--   indy         6 (Plattekill, Shawnee, Montage, Berkshire East, Catamount, Magic)
--   independent 15 (everyone else)
