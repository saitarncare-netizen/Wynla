-- Stage 7: Verify all 451 resorts from official websites
-- Generated: 2026-05-08T00:25:26.413Z
-- Resorts touched: 277
-- Field writes: 1262

BEGIN;

-- camelback-mountain-resort
UPDATE resorts SET has_night_skiing = TRUE, address = '193 Resort Dr, Tannersville, PA 18372', city = 'Tannersville', last_verified_at = NOW() WHERE id = 40;
-- loveland
UPDATE resorts SET vertical_drop = 2210, total_trails = 94, total_lifts = 9, total_acres = 1800, elevation_summit = 13010, elevation_base = 10800, longest_run_miles = 2, address = 'PO Box 899, Georgetown, CO 80444', city = 'Georgetown', last_verified_at = NOW() WHERE id = 80;
-- winter-park
UPDATE resorts SET vertical_drop = 3060, total_trails = 171, total_lifts = 23, total_acres = 3081, elevation_summit = 12060, elevation_base = 9000, longest_run_miles = 4.9, has_glades = TRUE, address = '85 Parsenn Road, Winter Park, CO 80482', city = 'Winter Park', last_verified_at = NOW() WHERE id = 90;
-- powder-mountain
UPDATE resorts SET city = 'Eden', last_verified_at = NOW() WHERE id = 100;
-- snow-king
UPDATE resorts SET total_trails = 41, has_night_skiing = TRUE, address = '402 E. Snow King Ave, Jackson, WY', city = 'Jackson', last_verified_at = NOW() WHERE id = 110;
-- bridger-bowl
UPDATE resorts SET vertical_drop = 2700, total_trails = 75, total_lifts = 8, total_acres = 2000, elevation_summit = 8800, weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', has_terrain_park = TRUE, address = '15795 Bridger Canyon Rd, Bozeman, MT', city = 'Bozeman', last_verified_at = NOW() WHERE id = 120;
-- soldier-mountain
UPDATE resorts SET address = '1043 N Soldier Creek Rd, Fairfield, ID 83327', city = 'Fairfield', last_verified_at = NOW() WHERE id = 140;
-- eaglecrest-ski-area
UPDATE resorts SET vertical_drop = 1620, total_acres = 640, city = 'Juneau', last_verified_at = NOW() WHERE id = 150;
-- sierra-at-tahoe
UPDATE resorts SET terrain_park_count = 8, has_terrain_park = TRUE, has_night_skiing = TRUE, address = '1111 Sierra at Tahoe Road, Twin Bridges, CA 95735', city = 'Twin Bridges', last_verified_at = NOW() WHERE id = 160;
-- hoodoo-ski-area
UPDATE resorts SET has_night_skiing = TRUE, last_verified_at = NOW() WHERE id = 190;
-- mission-ridge
UPDATE resorts SET address = '7500 Mission Ridge Rd, Wenatchee, WA 98801', city = 'Wenatchee', last_verified_at = NOW() WHERE id = 200;
-- mt-lemmon-ski-valley
UPDATE resorts SET address = '10300 Ski Run Rd, Mt. Lemmon, AZ 85619', city = 'Mt. Lemmon', last_verified_at = NOW() WHERE id = 220;
-- big-rock
UPDATE resorts SET city = 'Mars Hill', last_verified_at = NOW() WHERE id = 230;
-- mcintyre-ski-area
UPDATE resorts SET total_trails = 11, total_lifts = 2, has_terrain_park = TRUE, has_night_skiing = TRUE, address = '50 Chalet Way, Manchester, NH 03104', city = 'Manchester', last_verified_at = NOW() WHERE id = 250;
-- bolton-valley
UPDATE resorts SET address = '4302 Bolton Valley Access Rd, Bolton Valley, VT 05477', city = 'Bolton Valley', last_verified_at = NOW() WHERE id = 260;
-- rikert-outdoor-center
UPDATE resorts SET weekday_hours = '8:30am-4:30pm', weekend_hours = '8:30am-4:30pm', address = '106 College Cross Rd, Ripton, VT 05766', city = 'Ripton', last_verified_at = NOW() WHERE id = 270;
-- peek-n-peak
UPDATE resorts SET total_trails = 26, total_lifts = 9, terrain_park_count = 3, has_terrain_park = TRUE, has_glades = TRUE, address = '1405 Olde Road, Clymer, NY 14724', city = 'Clymer', last_verified_at = NOW() WHERE id = 280;
-- bear-creek-mountain-resort
UPDATE resorts SET address = '101 Doe Mountain Lane, Lehigh Valley, PA 18062', city = 'Lehigh Valley', last_verified_at = NOW() WHERE id = 300;
-- nubs-nob
UPDATE resorts SET weekday_hours = '9am-4:30pm', weekend_hours = '9am-4:30pm', has_night_skiing = TRUE, has_terrain_park = TRUE, address = '500 Nub''s Nob Road, Harbor Springs, MI 49740', city = 'Harbor Springs', last_verified_at = NOW() WHERE id = 320;
-- cannonsburg
UPDATE resorts SET address = '6800 Cannonsburg Rd, Belmont, MI 49306', city = 'Belmont', last_verified_at = NOW() WHERE id = 330;
-- tyrol-basin
UPDATE resorts SET address = '3487 Bohn Road, Mount Horeb, WI 53572', city = 'Mount Horeb', last_verified_at = NOW() WHERE id = 340;
-- spirit-mountain
UPDATE resorts SET address = '9500 Spirit Mountain Place, Duluth, MN 55810', city = 'Duluth', last_verified_at = NOW() WHERE id = 350;
-- wild-mountain
UPDATE resorts SET address = '37200 Wild Mtn Rd, Taylors Falls, MN 55084', city = 'Taylors Falls', last_verified_at = NOW() WHERE id = 360;
-- villa-olivia
UPDATE resorts SET address = '1401 W Lake Street, Bartlett, IL 60103', city = 'Bartlett', last_verified_at = NOW() WHERE id = 370;
-- wintergreen-resort
UPDATE resorts SET total_trails = 26, address = 'Route 664, Wintergreen, VA 22958', city = 'Wintergreen', last_verified_at = NOW() WHERE id = 390;
-- beech-mountain-resort
UPDATE resorts SET vertical_drop = 830, total_trails = 17, total_lifts = 9, total_acres = 95, elevation_summit = 5506, elevation_base = 4675, trails_beginner = 3, trails_intermediate = 9, trails_advanced = 4, terrain_park_count = 2, has_terrain_park = TRUE, address = '1007 Beech Mountain Parkway, Beech Mountain, NC 28604', city = 'Beech Mountain', last_verified_at = NOW() WHERE id = 400;
-- otis-ridge
UPDATE resorts SET address = '159 Monterey Road, Otis, MA 01253', city = 'Otis', last_verified_at = NOW() WHERE id = 410;
-- northern-maine-community-trails
UPDATE resorts SET address = '450 Fort Fairfield Rd, Presque Isle, ME 04769', city = 'Presque Isle', last_verified_at = NOW() WHERE id = 435;
-- maplelag
UPDATE resorts SET address = '30501 Maplelag Road, Callaway, MN 56521', city = 'Callaway', last_verified_at = NOW() WHERE id = 445;
-- great-bear-valley
UPDATE resorts SET total_trails = 14, total_acres = 220, has_terrain_park = TRUE, address = '5901 E Rice Street, Sioux Falls, SD 57110', city = 'Sioux Falls', last_verified_at = NOW() WHERE id = 465;
-- bruce-mound-winter-sports-area
UPDATE resorts SET vertical_drop = 375, total_lifts = 5, has_night_skiing = TRUE, address = 'N791 Bruce Mound Ave, Merrillan, WI 54754', city = 'Merrillan', last_verified_at = NOW() WHERE id = 475;
-- turpin-meadow-ranch
UPDATE resorts SET address = '24505 Buffalo Valley Road, Moran, WY 83013', city = 'Moran', last_verified_at = NOW() WHERE id = 485;
-- windham-mountain
UPDATE resorts SET vertical_drop = 1600, elevation_summit = 3100, total_trails = 54, total_lifts = 9, total_acres = 732, terrain_park_count = 3, has_terrain_park = TRUE, weekday_hours = '9am-4pm', weekend_hours = '8am-4pm', address = '19 Resort Drive, Windham, NY 12496', city = 'Windham', last_verified_at = NOW() WHERE id = 31;
-- blue-mountain-resort
UPDATE resorts SET total_trails = 40, total_lifts = 16, address = '1660 Blue Mountain Drive, Palmerton, PA 18071', city = 'Palmerton', last_verified_at = NOW() WHERE id = 41;
-- jiminy-peak
UPDATE resorts SET vertical_drop = 1150, elevation_summit = 2380, total_trails = 45, total_lifts = 9, total_acres = 167, longest_run_miles = 2, terrain_park_count = 3, has_terrain_park = TRUE, has_night_skiing = TRUE, weekday_hours = '9am-10pm', weekend_hours = '8:30am-10pm', typical_season_start = 'Mid-November', typical_season_end = 'Early April', address = '37 Corey Rd, Hancock, MA 01237', city = 'Hancock', last_verified_at = NOW() WHERE id = 51;
-- monarch-mountain
UPDATE resorts SET vertical_drop = 1225, elevation_summit = 11952, elevation_base = 10727, total_trails = 80, total_lifts = 9, total_acres = 1146, longest_run_miles = 1, trails_beginner = 15, trails_intermediate = 27, trails_advanced = 28, trails_expert = 7, terrain_park_count = 3, has_terrain_park = TRUE, weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', typical_season_start = 'Late November', typical_season_end = 'Early April', last_verified_at = NOW() WHERE id = 81;
-- wolf-creek
UPDATE resorts SET weekday_hours = '8:30am-4pm', weekend_hours = '8:30am-4pm', address = 'P.O. Box 2800, Pagosa Springs, CO 81147', city = 'Pagosa Springs', last_verified_at = NOW() WHERE id = 91;
-- snowbasin
UPDATE resorts SET vertical_drop = 3000, total_trails = 23, total_acres = 3000, address = '3925 E. Snowbasin Road, Huntsville, UT 84317', city = 'Huntsville', last_verified_at = NOW() WHERE id = 101;
-- hogadon
UPDATE resorts SET address = '2500 W Hogadon Road, Casper, WY 82601', city = 'Casper', typical_season_start = 'December', typical_season_end = 'April', last_verified_at = NOW() WHERE id = 111;
-- red-lodge
UPDATE resorts SET vertical_drop = 2400, elevation_summit = 9416, elevation_base = 7016, total_trails = 70, total_lifts = 8, total_acres = 1635, longest_run_miles = 1.5, trails_beginner = 13, trails_intermediate = 18, trails_advanced = 25, trails_expert = 14, has_terrain_park = TRUE, weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', typical_season_start = 'Day after Thanksgiving', typical_season_end = 'Second Sunday in April', address = '305 Ski Run Road, Red Lodge, MT 59068', city = 'Red Lodge', last_verified_at = NOW() WHERE id = 121;
-- pebble-creek
UPDATE resorts SET vertical_drop = 2200, elevation_summit = 9271, elevation_base = 8650, total_trails = 51, total_lifts = 4, total_acres = 1100, trails_beginner = 10, trails_intermediate = 18, trails_advanced = 21, trails_expert = 2, typical_season_start = 'Mid-December', typical_season_end = 'Late March', address = '3340 E Green Canyon Rd, Inkom, ID 83245', city = 'Inkom', last_verified_at = NOW() WHERE id = 141;
-- hilltop-ski-area
UPDATE resorts SET vertical_drop = 294, elevation_summit = 786, elevation_base = 492, total_trails = 12, total_lifts = 3, total_acres = 30, has_terrain_park = TRUE, terrain_park_count = 1, has_night_skiing = TRUE, trails_beginner = 10, trails_intermediate = 1, trails_advanced = 1, address = '7015 Abbott Road, Anchorage, AK 99507', city = 'Anchorage', last_verified_at = NOW() WHERE id = 151;
-- homewood-mountain-resort
UPDATE resorts SET total_trails = 67, total_lifts = 7, address = '5145 West Lake Blvd, Homewood, CA 96141', city = 'Homewood', last_verified_at = NOW() WHERE id = 161;
-- mammoth-mountain
UPDATE resorts SET total_trails = 178, total_lifts = 25, total_acres = 3500, address = '10001 Minaret Road, Mammoth Lakes, CA 93546', city = 'Mammoth Lakes', last_verified_at = NOW() WHERE id = 171;
-- willamette-pass
UPDATE resorts SET vertical_drop = 1563, address = 'Highway 58 Mile Marker 62, Cascade Summit, OR', city = 'Cascade Summit', last_verified_at = NOW() WHERE id = 191;
-- white-pass
UPDATE resorts SET total_lifts = 9, total_acres = 1402, weekday_hours = '8:45am-4pm', weekend_hours = '8:45am-4pm', address = '48935 US Hwy 12, Naches, WA 98937', city = 'Naches', last_verified_at = NOW() WHERE id = 201;
-- sunday-river
UPDATE resorts SET total_trails = 139, total_lifts = 19, total_acres = 884, address = '15 South Ridge Road, Newry, ME 04261', city = 'Newry', last_verified_at = NOW() WHERE id = 221;
-- big-squaw-mountain
UPDATE resorts SET elevation_summit = 2950, address = '447 Ski Resort Road, Greenville Junction, ME 04442', city = 'Greenville Junction', last_verified_at = NOW() WHERE id = 231;
-- bretton-woods
UPDATE resorts SET address = '99 Ski Area Rd, Bretton Woods, NH 03575', city = 'Bretton Woods', last_verified_at = NOW() WHERE id = 241;
-- mad-river-glen
UPDATE resorts SET address = '57 Schuss Pass Road, Waitsfield, VT 05673', city = 'Waitsfield', last_verified_at = NOW() WHERE id = 261;
-- maple-ski-ridge
UPDATE resorts SET address = '2725 Mariaville Road, Schenectady, NY 12306', city = 'Schenectady', last_verified_at = NOW() WHERE id = 291;
-- spring-mountain
UPDATE resorts SET address = '757 Spring Mount Road, Spring Mount, PA 19478', city = 'Spring Mount', last_verified_at = NOW() WHERE id = 301;
-- big-powderhorn-mountain
UPDATE resorts SET address = 'N11375 Powderhorn Road, Bessemer, MI 49911', city = 'Bessemer', last_verified_at = NOW() WHERE id = 311;
-- treetops-resort
UPDATE resorts SET city = 'Gaylord', last_verified_at = NOW() WHERE id = 321;
-- alpine-valley-wi
UPDATE resorts SET address = 'W2501 County Road D, Elkhorn, WI 53121', city = 'Elkhorn', last_verified_at = NOW() WHERE id = 341;
-- ski-gull
UPDATE resorts SET address = '9898 County 77 SW, Nisswa, MN 56468', city = 'Nisswa', last_verified_at = NOW() WHERE id = 361;
-- frost-fire-park
UPDATE resorts SET address = '11950 Co Hwy 55, Walhalla, ND 58282', city = 'Walhalla', last_verified_at = NOW() WHERE id = 381;
-- canaan-valley-resort
UPDATE resorts SET address = '230 Main Lodge Road, Davis, WV 26260', city = 'Davis', last_verified_at = NOW() WHERE id = 391;
-- sugar-mountain-resort
UPDATE resorts SET elevation_summit = 5300, total_acres = 125, address = '1009 Sugar Mountain Drive, Sugar Mountain, NC 28604', city = 'Sugar Mountain', last_verified_at = NOW() WHERE id = 401;
-- ski-bradford
UPDATE resorts SET total_trails = 15, has_night_skiing = TRUE, address = '60 S Cross Rd, Haverhill, MA 01835', city = 'Haverhill', last_verified_at = NOW() WHERE id = 411;
-- mt-shasta
UPDATE resorts SET address = '4500 Ski Park Hwy, McCloud, CA 96057', city = 'McCloud', last_verified_at = NOW() WHERE id = 426;
-- quarry-road-trails
UPDATE resorts SET address = '300 Quarry Road, Waterville, ME 04901', city = 'Waterville', last_verified_at = NOW() WHERE id = 436;
-- high-point-xc-center
UPDATE resorts SET elevation_summit = 1803, elevation_base = 1325, last_verified_at = NOW() WHERE id = 456;
-- wachusett-mountain
UPDATE resorts SET vertical_drop = 1000, total_trails = 27, total_lifts = 8, elevation_summit = 2006, address = '499 Mountain Rd, Princeton, MA 01541', city = 'Princeton', last_verified_at = NOW() WHERE id = 52;
-- snowbird
UPDATE resorts SET vertical_drop = 3000, total_acres = 2500, last_verified_at = NOW() WHERE id = 102;
-- discovery
UPDATE resorts SET weekday_hours = '9:30am-4pm', weekend_hours = '9:30am-4pm', address = '180 Discovery Basin Rd, Anaconda, MT 59711', city = 'Anaconda', last_verified_at = NOW() WHERE id = 122;
-- kelly-canyon
UPDATE resorts SET total_lifts = 5, address = '5488 Kelly Canyon Rd, Ririe, ID 83443', city = 'Ririe', last_verified_at = NOW() WHERE id = 142;
-- mt-eyak-ski-area
UPDATE resorts SET city = 'Cordova', last_verified_at = NOW() WHERE id = 152;
-- june-mountain
UPDATE resorts SET total_acres = 1500, address = '3819 Hwy 158, June Lake, CA 93529', city = 'June Lake', last_verified_at = NOW() WHERE id = 172;
-- anthony-lakes
UPDATE resorts SET weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', address = '47500 Anthony Lakes Hwy, North Powder, OR 97867', city = 'North Powder', last_verified_at = NOW() WHERE id = 192;
-- 49-degrees-north
UPDATE resorts SET address = '3311 Flowery Trail Road, Chewelah, WA 99109', city = 'Chewelah', last_verified_at = NOW() WHERE id = 202;
-- angel-fire-resort
UPDATE resorts SET elevation_summit = 10677, weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', last_verified_at = NOW() WHERE id = 212;
-- sugarloaf
UPDATE resorts SET elevation_summit = 4237, address = '5092 Sugarloaf Access Rd, Carrabassett Valley, ME 04947', city = 'Carrabassett Valley', last_verified_at = NOW() WHERE id = 222;
-- waterville-valley
UPDATE resorts SET vertical_drop = 2020, total_trails = 62, total_lifts = 10, elevation_summit = 4004, last_verified_at = NOW() WHERE id = 242;
-- burke-mountain
UPDATE resorts SET vertical_drop = 2011, total_trails = 53, total_lifts = 5, address = '223 Sherburne Lodge Rd, East Burke, VT 05832', city = 'East Burke', last_verified_at = NOW() WHERE id = 262;
-- west-mountain
UPDATE resorts SET address = '59 West Mountain Road, Queensbury, NY 12804', city = 'Queensbury', last_verified_at = NOW() WHERE id = 272;
-- ski-sawmill
UPDATE resorts SET address = '383 Oregon Hill Rd, Morris, PA 16938', city = 'Morris', last_verified_at = NOW() WHERE id = 302;
-- caberfae-peaks
UPDATE resorts SET total_trails = 27, total_lifts = 5, address = '1 Caberfae Lane, Cadillac, MI 49601', city = 'Cadillac', last_verified_at = NOW() WHERE id = 322;
-- swiss-valley
UPDATE resorts SET total_trails = 12, address = '13421 Mann Street, Jones, MI 49061', city = 'Jones', last_verified_at = NOW() WHERE id = 332;
-- little-switzerland
UPDATE resorts SET weekday_hours = '4pm-9:30pm', weekend_hours = '9am-9:30pm', address = '105 Cedar Creek Rd, Slinger, WI 53086', city = 'Slinger', last_verified_at = NOW() WHERE id = 342;
-- welch-village
UPDATE resorts SET address = '26685 County Road 7 Blvd, Welch, MN 55089', city = 'Welch', last_verified_at = NOW() WHERE id = 352;
-- perfect-north
UPDATE resorts SET total_trails = 23, total_lifts = 15, terrain_park_count = 3, has_terrain_park = TRUE, address = '19074 Perfect Lane, Lawrenceburg, IN 47025', city = 'Lawrenceburg', last_verified_at = NOW() WHERE id = 372;
-- huff-hills
UPDATE resorts SET address = '5455 County Road 80, Mandan, ND 58554', city = 'Mandan', last_verified_at = NOW() WHERE id = 382;
-- hatley-pointe
UPDATE resorts SET vertical_drop = 700, total_trails = 21, total_lifts = 4, total_acres = 54, elevation_summit = 4700, has_night_skiing = TRUE, city = 'Mars Hill', last_verified_at = NOW() WHERE id = 402;
-- ski-ward
UPDATE resorts SET address = '1000 Main Street, Shrewsbury, MA 01545', city = 'Shrewsbury', last_verified_at = NOW() WHERE id = 412;
-- crosscut-sports-center
UPDATE resorts SET total_acres = 500, address = '16621 Bridger Canyon Road, Bozeman, MT 59715', city = 'Bozeman', last_verified_at = NOW() WHERE id = 447;
-- enchanted-forest-xc
UPDATE resorts SET address = '29 Sangre de Cristo Drive, Red River, NM 87558', city = 'Red River', last_verified_at = NOW() WHERE id = 457;
-- catamount-outdoor-family-center
UPDATE resorts SET address = '592 Governor Chittenden Road, Williston, VT 05495', city = 'Williston', last_verified_at = NOW() WHERE id = 467;
-- christie
UPDATE resorts SET total_trails = 33, address = 'W13755 County Road O, Bruce, WI 54819', city = 'Bruce', last_verified_at = NOW() WHERE id = 477;
-- plattekill-mountain
UPDATE resorts SET vertical_drop = 1100, total_trails = 41, address = '469 Plattekill Road, Roxbury, NY 12474', city = 'Roxbury', last_verified_at = NOW() WHERE id = 33;
-- stratton-mountain
UPDATE resorts SET vertical_drop = 2003, total_trails = 99, total_lifts = 14, total_acres = 670, elevation_summit = 3875, longest_run_miles = 3, address = '5 Village Lodge Rd. Stratton Mountain Vermont, 05155', city = 'Stratton Mountain', last_verified_at = NOW() WHERE id = 53;
-- purgatory
UPDATE resorts SET address = '#1 Skier Place, Durango, CO 81301', city = 'Durango', last_verified_at = NOW() WHERE id = 83;
-- white-pine
UPDATE resorts SET total_acres = 363, address = '74 White Pine Road, Pinedale, WY 82941', city = 'Pinedale', last_verified_at = NOW() WHERE id = 113;
-- blacktail
UPDATE resorts SET vertical_drop = 1440, total_lifts = 4, elevation_summit = 6780, longest_run_miles = 1.75, address = '13990 Blacktail Rd, Lakeside, MT', city = 'Lakeside', last_verified_at = NOW() WHERE id = 123;
-- yellowstone-club
UPDATE resorts SET total_acres = 2900, last_verified_at = NOW() WHERE id = 133;
-- bear-valley-mountain
UPDATE resorts SET vertical_drop = 1900, total_trails = 75, total_lifts = 9, total_acres = 1680, elevation_base = 8495, address = '2280 State Route 207 Bear Valley, CA 95223', city = 'Bear Valley', last_verified_at = NOW() WHERE id = 173;
-- mt-shasta-ski-park
UPDATE resorts SET address = '4500 Ski Park Hwy, McCloud, CA 96057', city = 'McCloud', last_verified_at = NOW() WHERE id = 183;
-- mt-spokane
UPDATE resorts SET total_trails = 53, total_lifts = 6, total_acres = 1700, has_terrain_park = TRUE, last_verified_at = NOW() WHERE id = 203;
-- red-river-ski-area
UPDATE resorts SET elevation_base = 8750, address = '400 Pioneer Road Red River, New Mexico 87558', city = 'Red River', last_verified_at = NOW() WHERE id = 213;
-- saddleback
UPDATE resorts SET vertical_drop = 2000, total_trails = 68, total_lifts = 6, total_acres = 600, elevation_summit = 4120, elevation_base = 2460, longest_run_miles = 3.1, trails_beginner = 23, trails_intermediate = 20, trails_advanced = 18, trails_expert = 7, has_terrain_park = TRUE, terrain_park_count = 2, has_glades = TRUE, address = '976 Saddleback Mountain Rd, Rangeley, Maine 04970', city = 'Rangeley', last_verified_at = NOW() WHERE id = 223;
-- hermon-mountain
UPDATE resorts SET address = '441 Newburg Road, Hermon, ME 04401', city = 'Hermon', last_verified_at = NOW() WHERE id = 233;
-- campton-mountain
UPDATE resorts SET address = '24 Parker Rd, Campton, NH 03223', city = 'Campton', last_verified_at = NOW() WHERE id = 253;
-- saskadena-six
UPDATE resorts SET address = '247 Stage Rd, South Pomfret, Vermont, 05067', city = 'South Pomfret', last_verified_at = NOW() WHERE id = 263;
-- greek-peak
UPDATE resorts SET address = '2000 NYS Rt. 392, Cortland, NY 13045', city = 'Cortland', last_verified_at = NOW() WHERE id = 273;
-- woods-valley
UPDATE resorts SET address = '9100 State Route 46, Westernville, NY 13486', city = 'Westernville', last_verified_at = NOW() WHERE id = 283;
-- otsego-resort
UPDATE resorts SET address = '696 M-32 East, Gaylord, MI 49734', city = 'Gaylord', last_verified_at = NOW() WHERE id = 333;
-- buena-vista
UPDATE resorts SET address = '19600 Irvine Ave. NW Bemidji, MN 56601', city = 'Bemidji', last_verified_at = NOW() WHERE id = 363;
-- bottineau-winter-park
UPDATE resorts SET total_trails = 8, total_lifts = 5, last_verified_at = NOW() WHERE id = 383;
-- snowshoe-mountain
UPDATE resorts SET total_trails = 56, total_lifts = 15, total_acres = 267, elevation_summit = 4848, has_terrain_park = TRUE, terrain_park_count = 4, address = '10 Snowshoe Drive, Snowshoe, WV 26209', city = 'Snowshoe', last_verified_at = NOW() WHERE id = 393;
-- big-snow-american-dream
UPDATE resorts SET address = '1 American Dream Way, E Rutherford, NJ', city = 'East Rutherford', last_verified_at = NOW() WHERE id = 413;
-- cuchara
UPDATE resorts SET vertical_drop = 1500, address = '1234 Panadero Ave, La Veta, CO 81055', city = 'La Veta', last_verified_at = NOW() WHERE id = 428;
-- crystal
UPDATE resorts SET address = '12500 Crystal Mountain Dr. Thompsonville, Michigan 49683', city = 'Thompsonville', last_verified_at = NOW() WHERE id = 438;
-- dog-creek-lodge-nordic-center
UPDATE resorts SET address = '8775 US Hwy 93 N, Olney, MT 59927', city = 'Olney', last_verified_at = NOW() WHERE id = 448;
-- dry-hill-area
UPDATE resorts SET address = '18160 Alpine Ridge Rd, Watertown, NY 13601', city = 'Watertown', last_verified_at = NOW() WHERE id = 458;
-- rikert-nordic-center
UPDATE resorts SET weekday_hours = '8:30am-4:30pm', weekend_hours = '8:30am-4:30pm', address = '106 College Cross Rd, Ripton, VT 05766', city = 'Ripton', last_verified_at = NOW() WHERE id = 468;
-- crystal-ridge
UPDATE resorts SET address = '7011 S Ballpark Dr, Franklin, WI 53132', city = 'Franklin', last_verified_at = NOW() WHERE id = 478;
-- silverton-mountain
UPDATE resorts SET vertical_drop = 1900, total_lifts = 1, elevation_summit = 13487, elevation_base = 10400, has_terrain_park = FALSE, has_halfpipe = FALSE, has_night_skiing = FALSE, city = 'Silverton', last_verified_at = NOW() WHERE id = 84;
-- brian-head
UPDATE resorts SET has_terrain_park = TRUE, address = '329 South Highway 143, Brian Head, UT 84719', city = 'Brian Head', last_verified_at = NOW() WHERE id = 94;
-- solitude
UPDATE resorts SET address = '12000 Big Cottonwood Canyon, Solitude, UT 84121', city = 'Solitude', last_verified_at = NOW() WHERE id = 104;
-- antelope-butte
UPDATE resorts SET vertical_drop = 1000, total_lifts = 3, elevation_summit = 9400, elevation_base = 8400, city = 'Shell', last_verified_at = NOW() WHERE id = 114;
-- sun-valley
UPDATE resorts SET vertical_drop = 3400, address = '1 Sun Valley Rd, Sun Valley, ID 83353', city = 'Sun Valley', last_verified_at = NOW() WHERE id = 134;
-- magic-mountain-id
UPDATE resorts SET total_trails = 11, total_acres = 120, elevation_summit = 7240, has_terrain_park = TRUE, weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', address = 'Forest Rd 499, Kimberly, ID 83341', city = 'Kimberly', last_verified_at = NOW() WHERE id = 144;
-- skiland
UPDATE resorts SET vertical_drop = 1027, total_lifts = 1, typical_season_start = 'Early December', typical_season_end = 'End of April', city = 'Fairbanks', last_verified_at = NOW() WHERE id = 154;
-- donner-ski-ranch
UPDATE resorts SET address = '19320 Donner Pass Rd., Norden, CA 95724', city = 'Norden', last_verified_at = NOW() WHERE id = 164;
-- dodge-ridge
UPDATE resorts SET vertical_drop = 1600, total_acres = 800, last_verified_at = NOW() WHERE id = 174;
-- mt-bachelor
UPDATE resorts SET has_glades = TRUE, has_halfpipe = TRUE, city = 'Bend', last_verified_at = NOW() WHERE id = 184;
-- ferguson-ridge
UPDATE resorts SET vertical_drop = 640, total_trails = 8, total_lifts = 2, has_night_skiing = FALSE, weekend_hours = '10am-4pm', typical_season_start = 'Mid-December', typical_season_end = 'Early April', last_verified_at = NOW() WHERE id = 194;
-- bluewood
UPDATE resorts SET address = '2000 N. Touchet Rd., Dayton, WA 99328', city = 'Dayton', last_verified_at = NOW() WHERE id = 204;
-- pajarito-mountain
UPDATE resorts SET vertical_drop = 1440, total_trails = 53, total_lifts = 6, total_acres = 280, elevation_summit = 10440, elevation_base = 9000, trails_beginner = 11, trails_intermediate = 26, trails_advanced = 16, has_night_skiing = FALSE, typical_season_start = 'Mid-December', typical_season_end = 'Mid-March', address = '397 Camp May Rd, Los Alamos, NM 87544', city = 'Los Alamos', last_verified_at = NOW() WHERE id = 214;
-- black-mountain-of-maine
UPDATE resorts SET weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', address = '39 Glover Road, Rumford, ME 04276', city = 'Rumford', last_verified_at = NOW() WHERE id = 224;
-- titcomb-mountain
UPDATE resorts SET address = '180 Ski Slope Road, Farmington, ME', city = 'Farmington', last_verified_at = NOW() WHERE id = 234;
-- middlebury-snow-bowl
UPDATE resorts SET weekday_hours = '9am-9pm', weekend_hours = '9am-4pm', address = '6886 Rt 125, Hancock, VT 05748', city = 'Hancock', last_verified_at = NOW() WHERE id = 264;
-- holimont
UPDATE resorts SET total_trails = 55, total_lifts = 8, weekday_hours = '9:30am-4:20pm', weekend_hours = '8am-4:20pm', address = '6921 NY-242, Ellicottville, NY 14731', city = 'Ellicottville', last_verified_at = NOW() WHERE id = 274;
-- mccauley-mountain
UPDATE resorts SET vertical_drop = 633, total_trails = 21, address = '300 McCauley Mountain Road, Old Forge, NY 13420', city = 'Old Forge', last_verified_at = NOW() WHERE id = 284;
-- marquette-mountain
UPDATE resorts SET address = '4501 M-553, Marquette, MI 49855', city = 'Marquette', last_verified_at = NOW() WHERE id = 314;
-- mount-holly
UPDATE resorts SET has_night_skiing = TRUE, address = '13536 Dixie Hwy, Holly, MI 48442', city = 'Holly', last_verified_at = NOW() WHERE id = 324;
-- granite-peak
UPDATE resorts SET total_trails = 62, total_acres = 200, terrain_park_count = 6, has_terrain_park = TRUE, address = '227200 Snowbird Avenue, Wausau, WI 54401', city = 'Wausau', last_verified_at = NOW() WHERE id = 334;
-- sunburst
UPDATE resorts SET address = '8355 Prospect Dr, Kewaskum, WI 53040', city = 'Kewaskum', last_verified_at = NOW() WHERE id = 344;
-- hyland-hills
UPDATE resorts SET has_terrain_park = TRUE, address = '8800 Chalet Road, Bloomington, MN 55438', city = 'Bloomington', last_verified_at = NOW() WHERE id = 354;
-- sundown-mountain
UPDATE resorts SET total_trails = 21, address = '16991 Asbury Rd, Dubuque, IA 52002', city = 'Dubuque', last_verified_at = NOW() WHERE id = 364;
-- terry-peak
UPDATE resorts SET has_terrain_park = TRUE, address = '21120 Stewart Slope Road, Lead, SD 57754', city = 'Lead', last_verified_at = NOW() WHERE id = 384;
-- timberline-mountain
UPDATE resorts SET total_trails = 22, total_lifts = 4, terrain_park_count = 2, has_terrain_park = TRUE, address = '254 Four Seasons Dr., Davis, WV 26260', city = 'Davis', last_verified_at = NOW() WHERE id = 394;
-- campgaw-mountain
UPDATE resorts SET address = '200 Campgaw Road, Mahwah, NJ 07430', city = 'Mahwah', last_verified_at = NOW() WHERE id = 414;
-- haymaker-nordic-center
UPDATE resorts SET weekday_hours = '9am-3pm', weekend_hours = '9am-3pm', address = '34855 US-40, Steamboat Springs, CO 80487', city = 'Steamboat Springs', last_verified_at = NOW() WHERE id = 429;
-- mont-ripley-area
UPDATE resorts SET vertical_drop = 440, total_trails = 25, total_lifts = 3, total_acres = 112, has_terrain_park = TRUE, has_glades = TRUE, has_night_skiing = TRUE, city = 'Hancock', last_verified_at = NOW() WHERE id = 439;
-- garnet-hill-xc
UPDATE resorts SET address = '39 Garnet Hill Road, North River, NY 12856', city = 'North River', last_verified_at = NOW() WHERE id = 459;
-- saskadena-six-area
UPDATE resorts SET address = '247 Stage Rd, South Pomfret, VT 05067', city = 'South Pomfret', last_verified_at = NOW() WHERE id = 469;
-- brighton
UPDATE resorts SET vertical_drop = 1875, total_acres = 1050, address = '8302 South Brighton Loop Road', city = 'Brighton', last_verified_at = NOW() WHERE id = 95;
-- sundance
UPDATE resorts SET address = '8841 N. Alpine Loop Road', city = 'Sundance', last_verified_at = NOW() WHERE id = 105;
-- sleeping-giant
UPDATE resorts SET has_terrain_park = TRUE, has_night_skiing = TRUE, last_verified_at = NOW() WHERE id = 115;
-- lookout-pass
UPDATE resorts SET vertical_drop = 1650, total_trails = 59, total_acres = 1023, terrain_park_count = 3, has_terrain_park = TRUE, has_glades = TRUE, last_verified_at = NOW() WHERE id = 125;
-- schweitzer
UPDATE resorts SET vertical_drop = 2400, total_trails = 92, total_lifts = 10, total_acres = 2900, elevation_summit = 6400, longest_run_miles = 2.1, trails_beginner = 9, trails_intermediate = 37, trails_advanced = 32, trails_expert = 14, has_terrain_park = TRUE, terrain_park_count = 2, has_night_skiing = TRUE, typical_season_start = 'Late November', typical_season_end = 'Early/mid April', address = '10000 Schweitzer Mountain Rd', city = 'Sandpoint', last_verified_at = NOW() WHERE id = 135;
-- cottonwood-butte
UPDATE resorts SET vertical_drop = 845, has_glades = TRUE, has_night_skiing = TRUE, weekend_hours = '10am-4pm', address = '490 Radar Road', city = 'Cottonwood', last_verified_at = NOW() WHERE id = 145;
-- palisades-tahoe
UPDATE resorts SET address = '1960 Olympic Valley Road', city = 'Olympic Valley', last_verified_at = NOW() WHERE id = 155;
-- sugar-bowl-resort
UPDATE resorts SET total_trails = 105, total_lifts = 12, total_acres = 1650, elevation_summit = 8383, terrain_park_count = 4, has_terrain_park = TRUE, address = '629 Sugar Bowl Rd.', city = 'Norden', last_verified_at = NOW() WHERE id = 165;
-- china-peak
UPDATE resorts SET address = '59265 Highway 168', city = 'Lakeshore', last_verified_at = NOW() WHERE id = 175;
-- timberline-lodge
UPDATE resorts SET vertical_drop = 4540, has_terrain_park = TRUE, last_verified_at = NOW() WHERE id = 185;
-- loup-loup
UPDATE resorts SET total_acres = 300, weekday_hours = '9am-3:45pm', weekend_hours = '9am-3:45pm', address = '97 FS 4200 100 Road', city = 'Okanogan', last_verified_at = NOW() WHERE id = 205;
-- sipapu
UPDATE resorts SET vertical_drop = 1055, total_trails = 43, total_lifts = 6, total_acres = 215, elevation_summit = 9255, elevation_base = 8200, trails_beginner = 9, trails_intermediate = 17, trails_advanced = 11, trails_expert = 6, has_terrain_park = TRUE, terrain_park_count = 4, typical_season_start = 'November', typical_season_end = 'April', address = '5224 Highway 518', city = 'Vadito', last_verified_at = NOW() WHERE id = 215;
-- mt-abram
UPDATE resorts SET total_trails = 42, total_lifts = 4, weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', address = '308 Howe Hill Road', city = 'Greenwood', last_verified_at = NOW() WHERE id = 225;
-- spruce-mountain-ski-area
UPDATE resorts SET address = 'Spruce Mountain Road', city = 'Jay', last_verified_at = NOW() WHERE id = 235;
-- gunstock-mountain-resort
UPDATE resorts SET total_trails = 49, total_acres = 227, has_terrain_park = TRUE, terrain_park_count = 2, has_night_skiing = TRUE, address = '719 Cherry Valley Road', city = 'Gilford', last_verified_at = NOW() WHERE id = 245;
-- snow-ridge
UPDATE resorts SET has_terrain_park = TRUE, has_night_skiing = TRUE, address = '4173 West Road', city = 'Turin', last_verified_at = NOW() WHERE id = 275;
-- boyne-mountain
UPDATE resorts SET total_trails = 65, total_lifts = 10, total_acres = 415, address = '1 Boyne Mountain Road', city = 'Boyne Falls', last_verified_at = NOW() WHERE id = 305;
-- mont-ripley
UPDATE resorts SET vertical_drop = 440, total_trails = 25, total_lifts = 3, total_acres = 112, has_terrain_park = TRUE, has_glades = TRUE, has_night_skiing = TRUE, typical_season_start = 'December', typical_season_end = 'March', address = '49051 Ski Hill Rd.', city = 'Hancock', last_verified_at = NOW() WHERE id = 315;
-- nordic-mountain
UPDATE resorts SET address = 'W5806 County Road W', city = 'Wild Rose', last_verified_at = NOW() WHERE id = 345;
-- detroit-mountain
UPDATE resorts SET has_terrain_park = TRUE, address = '29409 170th St', city = 'Detroit Lakes', last_verified_at = NOW() WHERE id = 355;
-- seven-oaks
UPDATE resorts SET total_trails = 12, total_lifts = 4, has_terrain_park = TRUE, address = '1086 222nd Drive', city = 'Boone', last_verified_at = NOW() WHERE id = 365;
-- great-bear
UPDATE resorts SET total_trails = 14, total_acres = 220, has_terrain_park = TRUE, address = '5901 E Rice Street', city = 'Sioux Falls', last_verified_at = NOW() WHERE id = 385;
-- winterplace-ski-resort
UPDATE resorts SET vertical_drop = 603, total_trails = 28, total_lifts = 9, total_acres = 90, elevation_summit = 3600, elevation_base = 2997, longest_run_miles = 1.25, trails_beginner = 11, trails_intermediate = 10, trails_advanced = 7, has_terrain_park = TRUE, terrain_park_count = 2, has_night_skiing = TRUE, typical_season_start = 'Early December', typical_season_end = 'Mid-March', address = '425 Winterplace Drive', city = 'Ghent', last_verified_at = NOW() WHERE id = 395;
-- ski-sundown
UPDATE resorts SET vertical_drop = 625, total_trails = 16, total_lifts = 5, total_acres = 70, elevation_summit = 1075, elevation_base = 450, longest_run_miles = 1, trails_beginner = 9, trails_intermediate = 4, trails_advanced = 3, trails_expert = 1, has_terrain_park = TRUE, has_night_skiing = TRUE, typical_season_start = 'Early December', typical_season_end = 'Late March', address = '126 Ratlum Rd', city = 'New Hartford', last_verified_at = NOW() WHERE id = 405;
-- eaglecrest
UPDATE resorts SET vertical_drop = 1620, total_acres = 640, weekday_hours = '8:30am-3:30pm', weekend_hours = '8:30am-3:30pm', city = 'Juneau', last_verified_at = NOW() WHERE id = 420;
-- steamboat-touring-center
UPDATE resorts SET weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', address = '1230 Steamboat Boulevard', city = 'Steamboat Springs', last_verified_at = NOW() WHERE id = 430;
-- mt-holiday
UPDATE resorts SET address = '3100 Holiday Road', city = 'Traverse City', last_verified_at = NOW() WHERE id = 440;
-- hunt-hollow-club
UPDATE resorts SET vertical_drop = 875, total_trails = 21, total_acres = 300, address = '7532 County Rd #36', city = 'Naples', last_verified_at = NOW() WHERE id = 460;
-- trapp-family-lodge
UPDATE resorts SET address = '700 Trapp Hill Road', city = 'Stowe', last_verified_at = NOW() WHERE id = 470;
-- mt-la-crosse
UPDATE resorts SET has_terrain_park = TRUE, has_night_skiing = TRUE, weekday_hours = '12pm-8pm', weekend_hours = '10am-8pm', address = 'W5549 Old Town Hall Rd', city = 'La Crosse', last_verified_at = NOW() WHERE id = 480;
-- mount-pisgah
UPDATE resorts SET total_trails = 6, total_lifts = 1, trails_beginner = 1, trails_intermediate = 2, trails_advanced = 3, has_night_skiing = TRUE, weekday_hours = '3pm-8pm', weekend_hours = '10am-4pm', address = '92 Mount Pisgah Lane', city = 'Saranac Lake', last_verified_at = NOW() WHERE id = 36;
-- elk-mountain
UPDATE resorts SET total_trails = 27, total_acres = 180, has_terrain_park = TRUE, has_night_skiing = TRUE, address = '344 Elk Mountain Rd', city = 'Union Dale', last_verified_at = NOW() WHERE id = 46;
-- bromley-mountain
UPDATE resorts SET vertical_drop = 1334, total_trails = 47, total_lifts = 9, total_acres = 178, elevation_summit = 3284, elevation_base = 1950, longest_run_miles = 2.5, trails_beginner = 15, trails_intermediate = 17, trails_advanced = 15, has_terrain_park = TRUE, address = '3984 VT Rt. 11', city = 'Peru', last_verified_at = NOW() WHERE id = 56;
-- steamboat
UPDATE resorts SET vertical_drop = 3668, total_trails = 182, total_lifts = 23, total_acres = 3741, elevation_summit = 10568, elevation_base = 6900, longest_run_miles = 3, has_terrain_park = TRUE, has_glades = TRUE, has_halfpipe = TRUE, address = '2305 Mt. Werner Circle', city = 'Steamboat Springs', last_verified_at = NOW() WHERE id = 86;
-- lost-trail
UPDATE resorts SET address = '9485 US Hwy-93 South', city = 'Sula', last_verified_at = NOW() WHERE id = 126;
-- brundage-mountain
UPDATE resorts SET vertical_drop = 1921, total_trails = 70, total_lifts = 6, total_acres = 1920, elevation_summit = 7803, elevation_base = 5882, trails_beginner = 15, trails_intermediate = 23, trails_advanced = 32, has_terrain_park = TRUE, terrain_park_count = 2, has_glades = TRUE, typical_season_start = 'Mid-November', typical_season_end = 'Mid-April', city = 'McCall', last_verified_at = NOW() WHERE id = 136;
-- alpine-meadows
UPDATE resorts SET address = '1960 Olympic Valley Road', city = 'Olympic Valley', last_verified_at = NOW() WHERE id = 156;
-- crystal-mountain
UPDATE resorts SET city = 'Enumclaw', last_verified_at = NOW() WHERE id = 196;
-- shawnee-peak
UPDATE resorts SET total_trails = 44, total_lifts = 6, has_night_skiing = TRUE, address = '119 Mountain Road', city = 'Bridgton', last_verified_at = NOW() WHERE id = 226;
-- ragged-mountain
UPDATE resorts SET has_terrain_park = TRUE, address = '620 Ragged Mountain Rd.', city = 'Danbury', last_verified_at = NOW() WHERE id = 246;
-- sugarbush
UPDATE resorts SET total_lifts = 16, total_acres = 2000, has_terrain_park = TRUE, terrain_park_count = 4, has_glades = TRUE, address = '102 Forest Drive', city = 'Warren', last_verified_at = NOW() WHERE id = 256;
-- cochrans-ski-area
UPDATE resorts SET address = '910 Cochran Road', city = 'Richmond', last_verified_at = NOW() WHERE id = 266;
-- holiday-valley
UPDATE resorts SET weekday_hours = '8am-4:30pm', city = 'Ellicottville', last_verified_at = NOW() WHERE id = 276;
-- titus-mountain
UPDATE resorts SET has_terrain_park = TRUE, terrain_park_count = 3, has_night_skiing = TRUE, address = '215 Johnson Road', city = 'Malone', last_verified_at = NOW() WHERE id = 286;
-- the-highlands
UPDATE resorts SET address = '600 Highlands Drive', city = 'Harbor Springs', last_verified_at = NOW() WHERE id = 306;
-- pine-mountain
UPDATE resorts SET address = 'N3332 Pine Mountain Rd.', city = 'Iron Mountain', last_verified_at = NOW() WHERE id = 316;
-- alpine-valley-mi
UPDATE resorts SET has_terrain_park = TRUE, address = '6775 Highland Road', city = 'White Lake', last_verified_at = NOW() WHERE id = 326;
-- trollhaugen
UPDATE resorts SET address = '2232 100th Avenue', city = 'Dresser', last_verified_at = NOW() WHERE id = 336;
-- sleepy-hollow
UPDATE resorts SET address = '4051 Dean Avenue', city = 'Des Moines', last_verified_at = NOW() WHERE id = 366;
-- wisp-resort
UPDATE resorts SET has_night_skiing = TRUE, address = '296 Marsh Hill Road', city = 'McHenry', last_verified_at = NOW() WHERE id = 386;
-- ober-mountain
UPDATE resorts SET address = '1001 Parkway', city = 'Gatlinburg', last_verified_at = NOW() WHERE id = 396;
-- blue-hills-ski-area
UPDATE resorts SET has_night_skiing = TRUE, weekday_hours = '10am-9pm', weekend_hours = '8:30am-8pm', last_verified_at = NOW() WHERE id = 406;
-- moose
UPDATE resorts SET vertical_drop = 1300, total_acres = 750, has_night_skiing = FALSE, typical_season_start = 'October', typical_season_end = 'March', address = '3450 Moose Mountain Road', city = 'Fairbanks', last_verified_at = NOW() WHERE id = 421;
-- schuss-shanty-creek
UPDATE resorts SET total_trails = 42, total_lifts = 7, has_terrain_park = TRUE, terrain_park_count = 2, last_verified_at = NOW() WHERE id = 441;
-- thrill-hills
UPDATE resorts SET address = '270 Mill Road', city = 'Fort Ransom', last_verified_at = NOW() WHERE id = 451;
-- skaneateles-club
UPDATE resorts SET address = '2995 State Rte 174', city = 'Marietta', last_verified_at = NOW() WHERE id = 461;
-- sunlight-mountain
UPDATE resorts SET vertical_drop = 2010, total_trails = 77, total_acres = 749, city = 'Glenwood Springs', last_verified_at = NOW() WHERE id = 87;
-- deer-valley
UPDATE resorts SET address = '2250 Deer Valley Drive South, Park City, UT 84060', city = 'Park City', last_verified_at = NOW() WHERE id = 97;
-- beartooth-basin
UPDATE resorts SET weekday_hours = '9am-3pm', weekend_hours = '9am-3pm', address = 'P.O. Box 2091 Red Lodge, Montana 59068', city = 'Red Lodge', last_verified_at = NOW() WHERE id = 117;
-- tamarack
UPDATE resorts SET vertical_drop = 2800, total_acres = 1610, address = '311 Village DR. Tamarack, Idaho 83615', city = 'Tamarack', last_verified_at = NOW() WHERE id = 137;
-- little-ski-hill
UPDATE resorts SET vertical_drop = 405, has_night_skiing = TRUE, address = '3635 ID-55, McCall, ID 83638', city = 'McCall', last_verified_at = NOW() WHERE id = 147;
-- diamond-peak
UPDATE resorts SET vertical_drop = 1840, total_trails = 28, total_acres = 655, has_terrain_park = TRUE, terrain_park_count = 3, has_glades = TRUE, weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', typical_season_start = 'Early December', typical_season_end = 'Mid-April', last_verified_at = NOW() WHERE id = 167;
-- mt-hood-skibowl
UPDATE resorts SET total_acres = 960, elevation_summit = 5010, has_terrain_park = TRUE, has_night_skiing = TRUE, address = '87000 U.S. 26 Government Camp, OR 97028', city = 'Government Camp', last_verified_at = NOW() WHERE id = 187;
-- hurricane-ridge
UPDATE resorts SET weekday_hours = '10am-4pm', weekend_hours = '10am-4pm', has_terrain_park = TRUE, address = '424 E 1st Street #3049, Port Angeles, WA 98362', city = 'Port Angeles', last_verified_at = NOW() WHERE id = 207;
-- ski-apache
UPDATE resorts SET total_trails = 55, total_lifts = 11, total_acres = 750, elevation_summit = 11500, address = '1286 Ski Run Road Alto, New Mexico 88312', city = 'Alto', last_verified_at = NOW() WHERE id = 217;
-- lost-valley
UPDATE resorts SET total_lifts = 3, has_glades = TRUE, has_terrain_park = TRUE, address = '200 Lost Valley Road, Auburn, ME 04210', city = 'Auburn', last_verified_at = NOW() WHERE id = 227;
-- black-mountain-nh
UPDATE resorts SET weekend_hours = '9am-7pm', address = '373 Black Mountain Rd. Jackson, NH 03846', city = 'Jackson', last_verified_at = NOW() WHERE id = 247;
-- northeast-slopes
UPDATE resorts SET vertical_drop = 360, total_trails = 12, total_lifts = 3, total_acres = 35, has_glades = TRUE, weekday_hours = '12pm-4pm', weekend_hours = '12pm-4pm', city = 'East Corinth', last_verified_at = NOW() WHERE id = 267;
-- bristol-mountain
UPDATE resorts SET vertical_drop = 1200, total_trails = 39, total_lifts = 2, has_night_skiing = TRUE, address = '5662 Route 64 Canandaigua, NY 14424', city = 'Canandaigua', last_verified_at = NOW() WHERE id = 277;
-- willard-mountain
UPDATE resorts SET vertical_drop = 450, total_trails = 20, total_lifts = 6, elevation_summit = 1450, has_glades = TRUE, has_night_skiing = TRUE, address = '77 Intervale Road, Greenwich, NY 12834', city = 'Greenwich', last_verified_at = NOW() WHERE id = 287;
-- snow-snake
UPDATE resorts SET has_terrain_park = TRUE, address = '3407 East Mannsiding Rd., Harrison, MI 48625', city = 'Harrison', last_verified_at = NOW() WHERE id = 327;
-- mount-la-crosse
UPDATE resorts SET has_terrain_park = TRUE, weekday_hours = '12pm-8pm', weekend_hours = '10am-8pm', address = 'W5549 Old Town Hall Rd La Crosse, WI 54601', city = 'La Crosse', last_verified_at = NOW() WHERE id = 347;
-- powder-ridge
UPDATE resorts SET has_terrain_park = TRUE, address = '15015 93rd Ave, Kimball, MN 55353', city = 'Kimball', last_verified_at = NOW() WHERE id = 357;
-- bryce-resort
UPDATE resorts SET has_terrain_park = TRUE, address = 'PO Box 3, 1982 Fairway Drive, Basye, VA 22810', city = 'Basye', last_verified_at = NOW() WHERE id = 387;
-- appalachian-ski-mountain
UPDATE resorts SET vertical_drop = 365, total_trails = 13, total_lifts = 6, elevation_summit = 4000, elevation_base = 3635, longest_run_miles = 0.5, trails_beginner = 3, trails_intermediate = 6, trails_advanced = 4, has_terrain_park = TRUE, terrain_park_count = 4, has_night_skiing = TRUE, weekday_hours = '9am-10pm', weekend_hours = '9am-10pm', typical_season_start = 'Mid-November', typical_season_end = 'Mid-March', city = 'Blowing Rock', last_verified_at = NOW() WHERE id = 397;
-- bousquet-mountain
UPDATE resorts SET vertical_drop = 750, total_trails = 23, total_lifts = 4, total_acres = 200, elevation_summit = 1818, elevation_base = 1068, has_terrain_park = TRUE, terrain_park_count = 1, has_night_skiing = TRUE, city = 'Pittsfield', last_verified_at = NOW() WHERE id = 407;
-- mt-eyak
UPDATE resorts SET city = 'Cordova', last_verified_at = NOW() WHERE id = 422;
-- snowriver
UPDATE resorts SET total_trails = 53, total_lifts = 10, has_terrain_park = TRUE, terrain_park_count = 2, address = '500 Indianhead Road, Wakefield, MI 49968', city = 'Wakefield', last_verified_at = NOW() WHERE id = 442;
-- black-area
UPDATE resorts SET weekend_hours = '9am-7pm', address = '373 Black Mountain Rd. Jackson, NH 03846', city = 'Jackson', last_verified_at = NOW() WHERE id = 452;
-- cooper-spur-area
UPDATE resorts SET address = '10755 Cooper Spur Rd, Mt Hood, OR 97041', city = 'Mt Hood', last_verified_at = NOW() WHERE id = 462;
-- sunburst-area
UPDATE resorts SET address = '8355 Prospect Dr Kewaskum, WI 53040', city = 'Kewaskum', last_verified_at = NOW() WHERE id = 482;
-- mount-peter
UPDATE resorts SET address = '51 Old Mt. Peter Road', city = 'Warwick', last_verified_at = NOW() WHERE id = 38;
-- mount-southington
UPDATE resorts SET total_trails = 14, total_lifts = 8, address = '396 Mt Vernon Rd', city = 'Plantsville', last_verified_at = NOW() WHERE id = 48;
-- loon-mountain
UPDATE resorts SET address = '60 Loon Mountain Rd.', city = 'Lincoln', last_verified_at = NOW() WHERE id = 58;
-- eagle-point
UPDATE resorts SET elevation_summit = 10000, address = '150 S W Village Cir', city = 'Beaver', last_verified_at = NOW() WHERE id = 98;
-- jackson-hole
UPDATE resorts SET vertical_drop = 4139, total_trails = 131, total_lifts = 16, total_acres = 2500, elevation_summit = 10450, elevation_base = 6311, trails_beginner = 13, trails_intermediate = 52, trails_expert = 66, weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', last_verified_at = NOW() WHERE id = 108;
-- big-sky
UPDATE resorts SET address = '50 Big Sky Resort Road', city = 'Big Sky', last_verified_at = NOW() WHERE id = 118;
-- bogus-basin
UPDATE resorts SET total_trails = 86, total_lifts = 10, total_acres = 2600, address = '2600 N Bogus Basin Road', city = 'Boise', last_verified_at = NOW() WHERE id = 138;
-- mt-rose-ski-tahoe
UPDATE resorts SET vertical_drop = 1800, total_acres = 1200, elevation_summit = 9700, elevation_base = 8260, longest_run_miles = 2.5, total_lifts = 7, weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', last_verified_at = NOW() WHERE id = 168;
-- the-summit-at-snoqualmie
UPDATE resorts SET vertical_drop = 2280, total_acres = 1994, total_lifts = 25, address = '1001 WA-906', city = 'Snoqualmie Pass', last_verified_at = NOW() WHERE id = 198;
-- arizona-snowbowl
UPDATE resorts SET vertical_drop = 2800, total_trails = 61, total_lifts = 8, total_acres = 777, elevation_summit = 11500, elevation_base = 9200, longest_run_miles = 2, typical_season_start = 'Mid-November', typical_season_end = 'Early to late May', address = '9300 N Snowbowl Rd', city = 'Flagstaff', last_verified_at = NOW() WHERE id = 218;
-- camden-snow-bowl
UPDATE resorts SET vertical_drop = 1000, total_trails = 15, has_terrain_park = TRUE, terrain_park_count = 2, has_glades = TRUE, address = '20 Barnestown Road', city = 'Camden', last_verified_at = NOW() WHERE id = 228;
-- royal-mountain
UPDATE resorts SET city = 'Caroga Lake', last_verified_at = NOW() WHERE id = 288;
-- blue-knob
UPDATE resorts SET vertical_drop = 1072, total_trails = 34, trails_beginner = 7, trails_intermediate = 12, trails_advanced = 12, trails_expert = 3, has_glades = TRUE, address = '1424 Overland Pass', city = 'Claysburg', last_verified_at = NOW() WHERE id = 298;
-- crystal-mountain-mi
UPDATE resorts SET vertical_drop = 375, total_trails = 59, total_lifts = 8, total_acres = 104, trails_beginner = 13, trails_intermediate = 28, trails_advanced = 18, has_terrain_park = TRUE, terrain_park_count = 3, has_glades = TRUE, has_night_skiing = TRUE, address = '12500 Crystal Mountain Dr.', city = 'Thompsonville', last_verified_at = NOW() WHERE id = 318;
-- apple-mountain
UPDATE resorts SET address = '4519 North River Road', city = 'Freeland', last_verified_at = NOW() WHERE id = 328;
-- cascade-mountain
UPDATE resorts SET total_trails = 48, total_lifts = 11, weekday_hours = '10am-8pm', weekend_hours = '9am-10pm', address = 'W10441 Cascade Mountain Road', city = 'Portage', last_verified_at = NOW() WHERE id = 338;
-- mount-ashwabay
UPDATE resorts SET address = '32525 Ski Hill Rd', city = 'Bayfield', last_verified_at = NOW() WHERE id = 348;
-- andes-tower-hills
UPDATE resorts SET address = '4505 Andes Rd SW', city = 'Kensington', last_verified_at = NOW() WHERE id = 358;
-- snow-trails
UPDATE resorts SET total_trails = 21, terrain_park_count = 5, has_terrain_park = TRUE, typical_season_start = 'Second week of December', typical_season_end = 'March', address = '3100 Possum Run Road', city = 'Mansfield', last_verified_at = NOW() WHERE id = 378;
-- cataloochee-ski-area
UPDATE resorts SET vertical_drop = 740, total_trails = 18, total_lifts = 5, total_acres = 50, elevation_summit = 5400, elevation_base = 4660, longest_run_miles = 0.66, trails_beginner = 8, trails_intermediate = 7, trails_expert = 3, has_terrain_park = TRUE, terrain_park_count = 1, has_night_skiing = TRUE, address = '1080 Ski Lodge Road', city = 'Maggie Valley', last_verified_at = NOW() WHERE id = 398;
-- ski-butternut
UPDATE resorts SET vertical_drop = 1000, total_trails = 22, total_acres = 100, elevation_summit = 1800, trails_beginner = 4, trails_intermediate = 13, trails_advanced = 4, has_terrain_park = TRUE, last_verified_at = NOW() WHERE id = 408;
-- catamount
UPDATE resorts SET total_lifts = 8, last_verified_at = NOW() WHERE id = 433;
-- franconia-village-xc-area
UPDATE resorts SET address = '1172 Easton Road', city = 'Franconia', last_verified_at = NOW() WHERE id = 453;
-- north-cascade-heli
UPDATE resorts SET address = '31 Early Winters Dr', city = 'Mazama', last_verified_at = NOW() WHERE id = 473;
-- tyrol-basin-and-snowboard
UPDATE resorts SET has_terrain_park = TRUE, address = '3487 Bohn Road', city = 'Mount Horeb', last_verified_at = NOW() WHERE id = 483;
-- mountain-creek
UPDATE resorts SET address = '200 Route 94, Vernon, NJ 07462', city = 'Vernon', last_verified_at = NOW() WHERE id = 39;
-- berkshire-east
UPDATE resorts SET address = '66 Thunder Mountain Rd, Charlemont, MA 01339', city = 'Charlemont', last_verified_at = NOW() WHERE id = 49;
-- cannon-mountain
UPDATE resorts SET address = '260 Tramway Drive, Franconia, NH 03580', city = 'Franconia', last_verified_at = NOW() WHERE id = 59;
-- grand-targhee
UPDATE resorts SET vertical_drop = 2270, total_lifts = 6, total_acres = 2602, elevation_summit = 9862, elevation_base = 7851, longest_run_miles = 2.7, has_terrain_park = FALSE, has_halfpipe = FALSE, has_night_skiing = FALSE, weekday_hours = '9am-4pm', weekend_hours = '9am-4pm', typical_season_start = 'Late November', typical_season_end = 'Mid-April', address = '3300 Ski Hill Rd, Alta, WY 83414', city = 'Alta', last_verified_at = NOW() WHERE id = 109;
-- whitefish
UPDATE resorts SET vertical_drop = 2353, total_trails = 110, total_acres = 3000, elevation_summit = 6817, elevation_base = 4464, longest_run_miles = 2.52, has_terrain_park = TRUE, terrain_park_count = 4, has_glades = TRUE, has_night_skiing = TRUE, address = '1015 Glades Drive, Whitefish, MT 59937', city = 'Whitefish', last_verified_at = NOW() WHERE id = 119;
-- showdown
UPDATE resorts SET address = '2850 US HWY 89, Neihart, MT 59465', city = 'Neihart', last_verified_at = NOW() WHERE id = 129;
-- silver-mountain
UPDATE resorts SET address = '610 Bunker Avenue, Kellogg, ID 83837', city = 'Kellogg', last_verified_at = NOW() WHERE id = 139;
-- alyeska-resort
UPDATE resorts SET has_night_skiing = TRUE, city = 'Girdwood', last_verified_at = NOW() WHERE id = 149;
-- lee-canyon
UPDATE resorts SET total_acres = 445, address = '6725 Lee Canyon Rd, Las Vegas, NV 89124', city = 'Las Vegas', last_verified_at = NOW() WHERE id = 169;
-- mt-baker-ski-area
UPDATE resorts SET vertical_drop = 1500, total_acres = 1000, total_lifts = 10, elevation_summit = 5089, elevation_base = 3500, address = '1420 Iowa Street, Bellingham, WA 98229', city = 'Bellingham', last_verified_at = NOW() WHERE id = 199;
-- sunrise-park-resort
UPDATE resorts SET address = '200 Highway 273, Greer, AZ 85927', city = 'Greer', last_verified_at = NOW() WHERE id = 219;
-- king-pine
UPDATE resorts SET address = '1251 Eaton Road, Route 153, Madison, NH 03849', city = 'Madison', last_verified_at = NOW() WHERE id = 249;
-- kissing-bridge
UPDATE resorts SET total_trails = 39, total_lifts = 9, total_acres = 700, has_terrain_park = TRUE, has_night_skiing = TRUE, weekday_hours = '10am-9pm', weekend_hours = '9am-10pm', address = '10296 State Road, Glenwood, NY 14069', city = 'Glenwood', last_verified_at = NOW() WHERE id = 279;
-- buffalo-ski-club
UPDATE resorts SET total_trails = 43, city = 'Colden', last_verified_at = NOW() WHERE id = 289;
-- tussey-mountain
UPDATE resorts SET address = '301 Bear Meadows Road, Boalsburg, PA 16827', city = 'Boalsburg', last_verified_at = NOW() WHERE id = 299;
-- shanty-creek
UPDATE resorts SET total_trails = 42, total_lifts = 7, terrain_park_count = 2, has_terrain_park = TRUE, city = 'Bellaire', last_verified_at = NOW() WHERE id = 319;
-- bittersweet-ski-resort
UPDATE resorts SET vertical_drop = 350, total_trails = 20, total_lifts = 11, address = '600 River Road, Otsego, MI 49078', city = 'Otsego', last_verified_at = NOW() WHERE id = 329;
-- lutsen-mountains
UPDATE resorts SET total_trails = 58, total_lifts = 9, address = '467 Ski Hill Rd, Lutsen, MN 55612', city = 'Lutsen', last_verified_at = NOW() WHERE id = 349;
-- nashoba-valley-ski-area
UPDATE resorts SET address = '79 Powers Road, Westford, MA 01886', city = 'Westford', last_verified_at = NOW() WHERE id = 409;
-- detroit
UPDATE resorts SET address = '29409 170th St, Detroit Lakes, MN 56501', city = 'Detroit Lakes', last_verified_at = NOW() WHERE id = 444;
-- great-glen-trails-outdoor-center
UPDATE resorts SET address = '1 Mount Washington Auto Road, Gorham, NH 03581', city = 'Gorham', last_verified_at = NOW() WHERE id = 454;
-- big-bear-pa
UPDATE resorts SET vertical_drop = 650, total_trails = 18, total_lifts = 7, address = '192 Karl Hope Blvd., Lackawaxen, PA 18435', city = 'Lackawaxen', last_verified_at = NOW() WHERE id = 464;
-- plain-valley-trails
UPDATE resorts SET city = 'Plain', last_verified_at = NOW() WHERE id = 474;
-- white-grass-touring
UPDATE resorts SET elevation_summit = 4463, elevation_base = 3220, weekday_hours = '9am-Dark', weekend_hours = '9am-Dark', typical_season_start = 'December', typical_season_end = 'March', address = '643 Weiss Knob Ski Road, Davis, WV 26260', city = 'Davis', last_verified_at = NOW() WHERE id = 484;

COMMIT;