-- Wikimedia hero round 2: backfill 115 Listed resorts
-- Generated 2026-05-07T13:29:37Z
-- Idempotent: WHERE hero_image_url IS NULL on every UPDATE.

BEGIN;

-- Afton Alps (afton-alps)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e3/Afton_Alps%2C_January_2014%2C_Sally%27s_Valley.jpg/3840px-Afton_Alps%2C_January_2014%2C_Sally%27s_Valley.jpg',
  hero_image_alt = 'Afton Alps ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Afton Alps)',
  last_verified_at = '2026-05-07'
WHERE slug = 'afton-alps' AND active = TRUE AND hero_image_url IS NULL;

-- Alpine Meadows (alpine-meadows)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/4/42/Rock_Beaver_Dam_on_Bear_Creek%2C_Jan._2011_Guzzi.jpg',
  hero_image_alt = 'Alpine Meadows ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Alpine Meadows, California)',
  last_verified_at = '2026-05-07'
WHERE slug = 'alpine-meadows' AND active = TRUE AND hero_image_url IS NULL;

-- Angel Fire Resort (angel-fire-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/3/36/Angel_Fire_2.JPG',
  hero_image_alt = 'Angel Fire Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Angel Fire, New Mexico)',
  last_verified_at = '2026-05-07'
WHERE slug = 'angel-fire-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Anthony Lakes Mountain Resort (anthony-lakes)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/9/98/AnthonyLakes.JPG',
  hero_image_alt = 'Anthony Lakes Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Anthony Lakes (ski area))',
  last_verified_at = '2026-05-07'
WHERE slug = 'anthony-lakes' AND active = TRUE AND hero_image_url IS NULL;

-- Arizona Snowbowl (arizona-snowbowl)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Arizona_Snowbowl.png',
  hero_image_alt = 'Arizona Snowbowl ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Arizona Snowbowl)',
  last_verified_at = '2026-05-07'
WHERE slug = 'arizona-snowbowl' AND active = TRUE AND hero_image_url IS NULL;

-- Aspen Highlands (aspen-highlands)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Aspen_Highlands.jpg',
  hero_image_alt = 'Aspen Highlands ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Aspen Highlands)',
  last_verified_at = '2026-05-07'
WHERE slug = 'aspen-highlands' AND active = TRUE AND hero_image_url IS NULL;

-- Aspen Mountain (aspen-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/0/09/DSCN2976_aspenmountain_e_600.jpg',
  hero_image_alt = 'Aspen Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Aspen Mountain (Colorado))',
  last_verified_at = '2026-05-07'
WHERE slug = 'aspen-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Attitash Mountain Resort (attitash)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/5/5e/Attitash_aerial.jpg',
  hero_image_alt = 'Attitash Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Attitash Mountain Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'attitash' AND active = TRUE AND hero_image_url IS NULL;

-- Bear Paw Ski Bowl (bear-paw)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/3/3d/Bear_Paw_Ski_Bowl_logo.png',
  hero_image_alt = 'Bear Paw Ski Bowl ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Bear Paw Ski Bowl)',
  last_verified_at = '2026-05-07'
WHERE slug = 'bear-paw' AND active = TRUE AND hero_image_url IS NULL;

-- Big Boulder (big-boulder)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/2/2d/JackFrost.jpg',
  hero_image_alt = 'Big Boulder ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Jack Frost–Big Boulder Ski Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'big-boulder' AND active = TRUE AND hero_image_url IS NULL;

-- Big Snow American Dream (big-snow-american-dream)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/0/09/Big_Snow_American_Dream_logo.jpg',
  hero_image_alt = 'Big Snow American Dream ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Big Snow American Dream)',
  last_verified_at = '2026-05-07'
WHERE slug = 'big-snow-american-dream' AND active = TRUE AND hero_image_url IS NULL;

-- Blue Hills Ski Area (blue-hills-ski-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/0/02/THE_GREAT_BLUE_HILL_SKI_SLOPES_ARE_10_MILES_FROM_THE_CENTER_OF_BOSTON_AND_CAN_BE_REACHED_BY_STREET_CAR_AND_BUS._THE..._-_NARA_-_549989.jpg',
  hero_image_alt = 'Blue Hills Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Blue Hills Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'blue-hills-ski-area' AND active = TRUE AND hero_image_url IS NULL;

-- Bogus Basin (bogus-basin)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/b/b1/BogusBackside.JPG',
  hero_image_alt = 'Bogus Basin ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Bogus Basin)',
  last_verified_at = '2026-05-07'
WHERE slug = 'bogus-basin' AND active = TRUE AND hero_image_url IS NULL;

-- Boreal Mountain Resort (boreal-mountain-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/1/17/BorealSkiCA.jpg',
  hero_image_alt = 'Boreal Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Boreal Mountain Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'boreal-mountain-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Brian Head Resort (brian-head)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/83/Brian_Head_Dec_2023_03.jpg/3840px-Brian_Head_Dec_2023_03.jpg',
  hero_image_alt = 'Brian Head Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Brian Head Ski Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'brian-head' AND active = TRUE AND hero_image_url IS NULL;

-- Bridger Bowl Ski Area (bridger-bowl)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/d/d2/Bridger_Bowl.jpg',
  hero_image_alt = 'Bridger Bowl Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Bridger Bowl Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'bridger-bowl' AND active = TRUE AND hero_image_url IS NULL;

-- Bristol Mountain (bristol-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/5/57/Bristol_Mountain_Ski_Resort_in_the_summer.jpg',
  hero_image_alt = 'Bristol Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Bristol Mountain Ski Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'bristol-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Buck Hill (buck-hill)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Buck_Hill_in_summer.jpg',
  hero_image_alt = 'Buck Hill ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Buck Hill)',
  last_verified_at = '2026-05-07'
WHERE slug = 'buck-hill' AND active = TRUE AND hero_image_url IS NULL;

-- Campgaw Mountain (campgaw-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/9/97/Watchungs_CampgawSkiSlope.jpg',
  hero_image_alt = 'Campgaw Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Campgaw Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'campgaw-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Catamount Ski Area (catamount-ski-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/d/d6/Mountain_Lion_in_Glacier_National_Park.jpg',
  hero_image_alt = 'Catamount Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Cougar)',
  last_verified_at = '2026-05-07'
WHERE slug = 'catamount-ski-area' AND active = TRUE AND hero_image_url IS NULL;

-- Cooper Spur Mountain Resort (cooper-spur)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/c/cb/CooperSpur.JPG',
  hero_image_alt = 'Cooper Spur Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Cooper Spur ski area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'cooper-spur' AND active = TRUE AND hero_image_url IS NULL;

-- Crotched Mountain (crotched-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/e4/Crotched_Mountain%2C_New_Hampshire.jpg',
  hero_image_alt = 'Crotched Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Crotched Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'crotched-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Cuchara (cuchara)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/b6/Cuchara%2C_Colorado.JPG/3840px-Cuchara%2C_Colorado.JPG',
  hero_image_alt = 'Cuchara ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Cuchara, Colorado)',
  last_verified_at = '2026-05-07'
WHERE slug = 'cuchara' AND active = TRUE AND hero_image_url IS NULL;

-- Diamond Peak (diamond-peak)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/d/dc/2014-10-03_16_59_29_Fully_zoomed_view_of_Diamond_Peak%2C_Nevada_from_Eureka_Airport.JPG',
  hero_image_alt = 'Diamond Peak ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Diamond Peak (Nevada))',
  last_verified_at = '2026-05-07'
WHERE slug = 'diamond-peak' AND active = TRUE AND hero_image_url IS NULL;

-- Donner Ski Ranch (donner-ski-ranch)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Donner_Ski_Ranch_2.JPG/3840px-Donner_Ski_Ranch_2.JPG',
  hero_image_alt = 'Donner Ski Ranch ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Donner Ski Ranch)',
  last_verified_at = '2026-05-07'
WHERE slug = 'donner-ski-ranch' AND active = TRUE AND hero_image_url IS NULL;

-- Dry Hill Ski Area (dry-hill-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Dry_Hill%2C_New_Marlborough_MA.jpg',
  hero_image_alt = 'Dry Hill Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Dry Hill)',
  last_verified_at = '2026-05-07'
WHERE slug = 'dry-hill-area' AND active = TRUE AND hero_image_url IS NULL;

-- Eaglecrest Ski Area (eaglecrest-ski-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/a/a2/Seymour_Canal_From_Pittman%27s_Ridge_2012.jpg',
  hero_image_alt = 'Eaglecrest Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Eaglecrest Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'eaglecrest-ski-area' AND active = TRUE AND hero_image_url IS NULL;

-- Eaton Mountain (eaton-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/f/f2/Eaton_Mountain_Logo_SkiME.png',
  hero_image_alt = 'Eaton Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Eaton Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'eaton-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Elk Mountain Ski Resort (elk-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/9/98/Logo_of_Elk_Mountain_Ski_Area.jpg',
  hero_image_alt = 'Elk Mountain Ski Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Elk Mountain Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'elk-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Ferguson Ridge Ski Area (ferguson-ridge)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Ferguson_ridge_ski_area.jpg',
  hero_image_alt = 'Ferguson Ridge Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Ferguson Ridge Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'ferguson-ridge' AND active = TRUE AND hero_image_url IS NULL;

-- Frost Fire Park (frost-fire-park)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f0/Frost_fire_park_ski_lesson.jpg/1920px-Frost_fire_park_ski_lesson.jpg',
  hero_image_alt = 'Frost Fire Park ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Frost Fire Park)',
  last_verified_at = '2026-05-07'
WHERE slug = 'frost-fire-park' AND active = TRUE AND hero_image_url IS NULL;

-- Great Bear Recreation Park (great-bear)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/5/53/Great_Bear_ski_hill4.JPG',
  hero_image_alt = 'Great Bear Recreation Park ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Great Bear Recreation Park)',
  last_verified_at = '2026-05-07'
WHERE slug = 'great-bear' AND active = TRUE AND hero_image_url IS NULL;

-- Gunstock Mountain Resort (gunstock-mountain-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/f/f1/Gunstock_0152As.jpg',
  hero_image_alt = 'Gunstock Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Gunstock Mountain Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'gunstock-mountain-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Heavenly Mountain Resort (heavenly-mountain-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/b/bd/Heavenly_Mountain_Resort_logo.png',
  hero_image_alt = 'Heavenly Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Heavenly Mountain Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'heavenly-mountain-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Hermon Mountain (hermon-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/4/45/Hermonsnow.jpg',
  hero_image_alt = 'Hermon Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mount Hermon)',
  last_verified_at = '2026-05-07'
WHERE slug = 'hermon-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Hesperus Ski Area (hesperus-ski-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5d/Hesperus_Ski_Area.JPG/3840px-Hesperus_Ski_Area.JPG',
  hero_image_alt = 'Hesperus Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Hesperus Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'hesperus-ski-area' AND active = TRUE AND hero_image_url IS NULL;

-- Holiday Valley (holiday-valley)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/c/c2/Holiday_Valley_Logo.gif',
  hero_image_alt = 'Holiday Valley ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Holiday Valley (ski resort))',
  last_verified_at = '2026-05-07'
WHERE slug = 'holiday-valley' AND active = TRUE AND hero_image_url IS NULL;

-- Homewood Mountain Resort (homewood-mountain-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/7/79/Homewood_logo.png',
  hero_image_alt = 'Homewood Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Homewood Mountain Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'homewood-mountain-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Hoodoo Ski Area (hoodoo-ski-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/7e/Hoodoo.JPG',
  hero_image_alt = 'Hoodoo Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Hoodoo (ski area))',
  last_verified_at = '2026-05-07'
WHERE slug = 'hoodoo-ski-area' AND active = TRUE AND hero_image_url IS NULL;

-- Keystone Resort (keystone)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f8/River_Run_Village_Fireworks%2C_Keystone%2C_CO.jpg/3840px-River_Run_Village_Fireworks%2C_Keystone%2C_CO.jpg',
  hero_image_alt = 'Keystone Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Keystone Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'keystone' AND active = TRUE AND hero_image_url IS NULL;

-- Kirkwood Mountain Resort (kirkwood-mountain-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/c/ca/Kirkwood_Mountain_Resort_logo.png',
  hero_image_alt = 'Kirkwood Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Kirkwood Mountain Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'kirkwood-mountain-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Laurel Mountain (laurel-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/Laurel_Mountain_Views.jpg/3840px-Laurel_Mountain_Views.jpg',
  hero_image_alt = 'Laurel Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Laurel Mountain Ski Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'laurel-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Leavenworth Ski Hill (leavenworth-ski-hill)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Leavenworth_Ski_Hill_Historic_District.jpg',
  hero_image_alt = 'Leavenworth Ski Hill ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Leavenworth Ski Hill)',
  last_verified_at = '2026-05-07'
WHERE slug = 'leavenworth-ski-hill' AND active = TRUE AND hero_image_url IS NULL;

-- Lee Canyon (lee-canyon)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Las_Vegas_Ski_and_Snowboard_Resort_%288328257365%29.jpg',
  hero_image_alt = 'Lee Canyon ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Lee Canyon (ski resort))',
  last_verified_at = '2026-05-07'
WHERE slug = 'lee-canyon' AND active = TRUE AND hero_image_url IS NULL;

-- Liberty Mountain (liberty-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/a/a3/LibertyMountainResortLogo.jpg',
  hero_image_alt = 'Liberty Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Liberty Mountain Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'liberty-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Mad River Glen (mad-river-glen)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/2/20/Snowflake_Logo.png',
  hero_image_alt = 'Mad River Glen ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mad River Glen)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mad-river-glen' AND active = TRUE AND hero_image_url IS NULL;

-- Mad River Mountain (mad-river-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/5/53/Mad_River_Mountain_and_Valley_Hi.jpg',
  hero_image_alt = 'Mad River Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mad River Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mad-river-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Maverick Mountain Ski Area (maverick-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/f/f2/Berry_Meadow.jpg',
  hero_image_alt = 'Maverick Mountain Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Maverick Mountain Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'maverick-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- McCauley Mountain (mccauley-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/a/af/MCCAULEY_MOUNTAIN%2C_NEW_YORK%2C_CHAIR_LIFT_GIVES_TOURISTS_A_PANORAMIC_VIEW_IN_THE_ADIRONDACK_FOREST_PRESERVE_-_NARA_-_554490.jpg',
  hero_image_alt = 'McCauley Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: McCauley Mountain (New York))',
  last_verified_at = '2026-05-07'
WHERE slug = 'mccauley-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Mohawk Mountain Ski Area (mohawk-mountain-ski-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/5/52/MohawkMountain.jpg',
  hero_image_alt = 'Mohawk Mountain Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mohawk Mountain Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mohawk-mountain-ski-area' AND active = TRUE AND hero_image_url IS NULL;

-- Mont Ripley (mont-ripley)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Ripley_bluebird.jpg/3840px-Ripley_bluebird.jpg',
  hero_image_alt = 'Mont Ripley ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mont Ripley)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mont-ripley' AND active = TRUE AND hero_image_url IS NULL;

-- Mount Bohemia (mount-bohemia)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/7/7c/Mount_Bohemia_logo.png',
  hero_image_alt = 'Mount Bohemia ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mount Bohemia)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mount-bohemia' AND active = TRUE AND hero_image_url IS NULL;

-- Mount La Crosse (mount-la-crosse)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Mount_La_Crosse.jpg',
  hero_image_alt = 'Mount La Crosse ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mount LaCrosse)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mount-la-crosse' AND active = TRUE AND hero_image_url IS NULL;

-- Mount Peter (mount-peter)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Bellvale%2C_NY_-_Warwick_Valley_Panorama.jpg',
  hero_image_alt = 'Mount Peter ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mount Peter (New York))',
  last_verified_at = '2026-05-07'
WHERE slug = 'mount-peter' AND active = TRUE AND hero_image_url IS NULL;

-- Mount Sunapee (mount-sunapee)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/9/9a/MountSunapeefromLake.jpg',
  hero_image_alt = 'Mount Sunapee ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mount Sunapee)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mount-sunapee' AND active = TRUE AND hero_image_url IS NULL;

-- Mt. Baker Ski Area (mt-baker-ski-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/2/27/MtBakerSkiAreaLodge.JPG',
  hero_image_alt = 'Mt. Baker Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mt. Baker Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mt-baker-ski-area' AND active = TRUE AND hero_image_url IS NULL;

-- Mt. Baldy Ski Resort (mt-baldy)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/0/03/Baldy-ski-lift.jpg',
  hero_image_alt = 'Mt. Baldy Ski Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mount Baldy Ski Lifts)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mt-baldy' AND active = TRUE AND hero_image_url IS NULL;

-- Mt. Brighton (mt-brighton)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/6/61/Mt._Brighton_Ski_Hill.jpg',
  hero_image_alt = 'Mt. Brighton ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mount Brighton)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mt-brighton' AND active = TRUE AND hero_image_url IS NULL;

-- Mt. Eyak Ski Area (mt-eyak-ski-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/d/d4/Mt_Eyak.jpg',
  hero_image_alt = 'Mt. Eyak Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mount Eyak)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mt-eyak-ski-area' AND active = TRUE AND hero_image_url IS NULL;

-- Mt. Rose Ski Tahoe (mt-rose-ski-tahoe)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Mount_Rose_Ski_Tahoe_-_panoramio_%281%29.jpg/3840px-Mount_Rose_Ski_Tahoe_-_panoramio_%281%29.jpg',
  hero_image_alt = 'Mt. Rose Ski Tahoe ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mount Rose Ski Tahoe)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mt-rose-ski-tahoe' AND active = TRUE AND hero_image_url IS NULL;

-- Mt. Shasta Ski Park (mt-shasta-ski-park)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Mt_shasta_ski_park.jpg/3840px-Mt_shasta_ski_park.jpg',
  hero_image_alt = 'Mt. Shasta Ski Park ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mount Shasta Ski Park)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mt-shasta-ski-park' AND active = TRUE AND hero_image_url IS NULL;

-- Mt. Waterman (mt-waterman)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ab/Mount-waterman.jpg/3840px-Mount-waterman.jpg',
  hero_image_alt = 'Mt. Waterman ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mount Waterman)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mt-waterman' AND active = TRUE AND hero_image_url IS NULL;

-- Mystic Mountain (mystic-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/d/d4/HH_901_and_HH_902_in_the_Carina_nebula_%28captured_by_the_Hubble_Space_Telescope%29.jpg',
  hero_image_alt = 'Mystic Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Mystic Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'mystic-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Nashoba Valley Ski Area (nashoba-valley-ski-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/78/Nashoba_Valley_Ski_Area%2C_Westford_MA.jpg',
  hero_image_alt = 'Nashoba Valley Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Nashoba Valley Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'nashoba-valley-ski-area' AND active = TRUE AND hero_image_url IS NULL;

-- Northeast Slopes (northeast-slopes)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/ba/Northeast_slopes_ski_area_aerial.jpg/3840px-Northeast_slopes_ski_area_aerial.jpg',
  hero_image_alt = 'Northeast Slopes ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Northeast Slopes)',
  last_verified_at = '2026-05-07'
WHERE slug = 'northeast-slopes' AND active = TRUE AND hero_image_url IS NULL;

-- Northstar California (northstar-california)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/be/Northstar_California_East_Ridge_2019.jpg/3840px-Northstar_California_East_Ridge_2019.jpg',
  hero_image_alt = 'Northstar California ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Northstar California)',
  last_verified_at = '2026-05-07'
WHERE slug = 'northstar-california' AND active = TRUE AND hero_image_url IS NULL;

-- Okemo Mountain Resort (okemo-mountain-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/a/ab/Okemo-2005-0316a.jpg',
  hero_image_alt = 'Okemo Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Okemo Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'okemo-mountain-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Otis Ridge (otis-ridge)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d8/Evening_at_Otis_Ridge.jpg/3840px-Evening_at_Otis_Ridge.jpg',
  hero_image_alt = 'Otis Ridge ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Otis Ridge)',
  last_verified_at = '2026-05-07'
WHERE slug = 'otis-ridge' AND active = TRUE AND hero_image_url IS NULL;

-- Pajarito Mountain Ski Area (pajarito-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Pajarito_Ski_Lodge_in_Summer.jpg',
  hero_image_alt = 'Pajarito Mountain Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Pajarito Mountain Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'pajarito-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Perfect North Slopes (perfect-north)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/2/28/Perfect_North_Slopes_-_Runway_%284260540092%29.jpg',
  hero_image_alt = 'Perfect North Slopes ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Perfect North Slopes)',
  last_verified_at = '2026-05-07'
WHERE slug = 'perfect-north' AND active = TRUE AND hero_image_url IS NULL;

-- Pico Mountain (pico-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/0/04/Pico_Mountain_logo.png',
  hero_image_alt = 'Pico Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Pico Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'pico-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Pine Knob (pine-knob)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/DTE_Energy_Music_Theatre_20130225.JPG/1920px-DTE_Energy_Music_Theatre_20130225.JPG',
  hero_image_alt = 'Pine Knob ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Pine Knob)',
  last_verified_at = '2026-05-07'
WHERE slug = 'pine-knob' AND active = TRUE AND hero_image_url IS NULL;

-- Pleasant Mountain (shawnee-peak)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Pleasant_Mountain_View_-_Denmark%2C_Maine.jpg',
  hero_image_alt = 'Pleasant Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Pleasant Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'shawnee-peak' AND active = TRUE AND hero_image_url IS NULL;

-- Powder Mountain (powder-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/3/36/Powder_Mountain_logo.png',
  hero_image_alt = 'Powder Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Powder Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'powder-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Purgatory Resort (purgatory)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Purgatory_Resort_logo.svg/250px-Purgatory_Resort_logo.svg.png',
  hero_image_alt = 'Purgatory Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Purgatory Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'purgatory' AND active = TRUE AND hero_image_url IS NULL;

-- Red River Ski & Summer Area (red-river-ski-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/d/d9/Red_River.JPG',
  hero_image_alt = 'Red River Ski & Summer Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Red River, New Mexico)',
  last_verified_at = '2026-05-07'
WHERE slug = 'red-river-ski-area' AND active = TRUE AND hero_image_url IS NULL;

-- Rikert Outdoor Center (rikert-outdoor-center)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/2/2e/602b1a0244d68.image.jpg',
  hero_image_alt = 'Rikert Outdoor Center ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Rikert Outdoor Center)',
  last_verified_at = '2026-05-07'
WHERE slug = 'rikert-outdoor-center' AND active = TRUE AND hero_image_url IS NULL;

-- Roundtop Mountain Resort (roundtop-mountain-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/3/39/Roundtop_Mountain_Aerial_%2851146269883%29.jpg',
  hero_image_alt = 'Roundtop Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Roundtop Mountain Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'roundtop-mountain-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Sandia Peak Ski Area (sandia-peak)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/9/9c/Sandia_Peak_Ski_Area%2C_Albuquerque_AC2.JPG',
  hero_image_alt = 'Sandia Peak Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Sandia Peak Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'sandia-peak' AND active = TRUE AND hero_image_url IS NULL;

-- Saskadena Six (saskadena-six)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/5/5a/Suicide_Six_ski_resort_aerial.jpg/3840px-Suicide_Six_ski_resort_aerial.jpg',
  hero_image_alt = 'Saskadena Six ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Saskadena Six)',
  last_verified_at = '2026-05-07'
WHERE slug = 'saskadena-six' AND active = TRUE AND hero_image_url IS NULL;

-- Seven Springs Mountain Resort (seven-springs)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a8/Seven_Springs_Resort_during_summer.jpg/3840px-Seven_Springs_Resort_during_summer.jpg',
  hero_image_alt = 'Seven Springs Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Seven Springs Mountain Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'seven-springs' AND active = TRUE AND hero_image_url IS NULL;

-- Silverton Mountain (silverton-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/3/31/Silverton_Mountain_logo.png',
  hero_image_alt = 'Silverton Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Silverton Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'silverton-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Ski Apache (ski-apache)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/8/83/Ski_Apache.jpg',
  hero_image_alt = 'Ski Apache ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Ski Apache)',
  last_verified_at = '2026-05-07'
WHERE slug = 'ski-apache' AND active = TRUE AND hero_image_url IS NULL;

-- Ski Bradford (ski-bradford)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/3/30/Bradfordsm.jpg',
  hero_image_alt = 'Ski Bradford ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Ski Bradford)',
  last_verified_at = '2026-05-07'
WHERE slug = 'ski-bradford' AND active = TRUE AND hero_image_url IS NULL;

-- Ski Butternut (ski-butternut)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/72/Butternut_Basin_-_panoramio.jpg',
  hero_image_alt = 'Ski Butternut ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Ski Butternut)',
  last_verified_at = '2026-05-07'
WHERE slug = 'ski-butternut' AND active = TRUE AND hero_image_url IS NULL;

-- Ski Cooper (ski-cooper)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/e/ed/SkiCooperLogoBlueBack.png',
  hero_image_alt = 'Ski Cooper ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Ski Cooper)',
  last_verified_at = '2026-05-07'
WHERE slug = 'ski-cooper' AND active = TRUE AND hero_image_url IS NULL;

-- Ski Santa Fe (ski-santa-fe)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/ee/Parachute_at_Ski_Santa_Fe.jpg',
  hero_image_alt = 'Ski Santa Fe ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Ski Santa Fe)',
  last_verified_at = '2026-05-07'
WHERE slug = 'ski-santa-fe' AND active = TRUE AND hero_image_url IS NULL;

-- Ski Sundown (ski-sundown)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/DJI_0032-ENHC.jpg/3840px-DJI_0032-ENHC.jpg',
  hero_image_alt = 'Ski Sundown ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Ski Sundown)',
  last_verified_at = '2026-05-07'
WHERE slug = 'ski-sundown' AND active = TRUE AND hero_image_url IS NULL;

-- Ski Ward (ski-ward)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/2/2a/Ski_ward.jpg',
  hero_image_alt = 'Ski Ward ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Ski Ward)',
  last_verified_at = '2026-05-07'
WHERE slug = 'ski-ward' AND active = TRUE AND hero_image_url IS NULL;

-- Smugglers' Notch (smugglers-notch)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/f/ff/Smugglers-notch-vermont.png',
  hero_image_alt = 'Smugglers'' Notch ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Smugglers'' Notch Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'smugglers-notch' AND active = TRUE AND hero_image_url IS NULL;

-- Snow Summit (snow-summit)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/a/a0/Snow_Summit_Ski_Resort.jpg',
  hero_image_alt = 'Snow Summit ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Snow Summit)',
  last_verified_at = '2026-05-07'
WHERE slug = 'snow-summit' AND active = TRUE AND hero_image_url IS NULL;

-- Snowy Range Ski Area (snowy-range)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e8/Snowy_Range_Ski_Area.JPG/3840px-Snowy_Range_Ski_Area.JPG',
  hero_image_alt = 'Snowy Range Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Snowy Range Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'snowy-range' AND active = TRUE AND hero_image_url IS NULL;

-- Soldier Hollow (soldier-hollow)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Soldier_Hollow.jpg',
  hero_image_alt = 'Soldier Hollow ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Soldier Hollow)',
  last_verified_at = '2026-05-07'
WHERE slug = 'soldier-hollow' AND active = TRUE AND hero_image_url IS NULL;

-- Spout Springs Ski Area (spout-springs)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/e/e1/Spout_Springs_Ski_Area.jpg',
  hero_image_alt = 'Spout Springs Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Spout Springs Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'spout-springs' AND active = TRUE AND hero_image_url IS NULL;

-- Spring Mountain (spring-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/2/26/TTB_Map_Napa_Valley_AVA.png',
  hero_image_alt = 'Spring Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Spring Mountain District AVA)',
  last_verified_at = '2026-05-07'
WHERE slug = 'spring-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Stevens Pass (stevens-pass)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Stevens_Pass_Signs_2700px.jpg',
  hero_image_alt = 'Stevens Pass ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Stevens Pass)',
  last_verified_at = '2026-05-07'
WHERE slug = 'stevens-pass' AND active = TRUE AND hero_image_url IS NULL;

-- Stowe Mountain Resort (stowe-mountain-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/6/63/Stowe_Mountain_Resort_logo.png',
  hero_image_alt = 'Stowe Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Stowe Mountain Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'stowe-mountain-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Sugar Bowl Resort (sugar-bowl-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/9/90/Sugar_Bowl_Ski_Resort_Modern_Lodge.jpg',
  hero_image_alt = 'Sugar Bowl Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Sugar Bowl Ski Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'sugar-bowl-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Summit Ski Area (summit-ski-area)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/6/60/Mt_Hood.jpg',
  hero_image_alt = 'Summit Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Summit Pass (Oregon))',
  last_verified_at = '2026-05-07'
WHERE slug = 'summit-ski-area' AND active = TRUE AND hero_image_url IS NULL;

-- Sunrise Park Resort (sunrise-park-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/2/2f/Sunrise_Park_Resort_Aerial_SWG_Media-3.jpg',
  hero_image_alt = 'Sunrise Park Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Sunrise Park Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'sunrise-park-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Tahoe Donner Downhill Ski Area (tahoe-donner-downhill)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3d/Skiing_in_Tahoe.jpg/3840px-Skiing_in_Tahoe.jpg',
  hero_image_alt = 'Tahoe Donner Downhill Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Tahoe Donner Downhill)',
  last_verified_at = '2026-05-07'
WHERE slug = 'tahoe-donner-downhill' AND active = TRUE AND hero_image_url IS NULL;

-- Teton Pass Ski Area (teton-pass)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/4/46/Yonder_Lies_Jackson_Hole.jpg',
  hero_image_alt = 'Teton Pass Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Teton Pass)',
  last_verified_at = '2026-05-07'
WHERE slug = 'teton-pass' AND active = TRUE AND hero_image_url IS NULL;

-- The Omni Homestead Resort (the-omni-homestead-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/0/06/The_Homestead_Resort_in_Winter.jpg',
  hero_image_alt = 'The Omni Homestead Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: The Omni Homestead Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'the-omni-homestead-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Timber Ridge Ski Area (timber-ridge)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/70/Timber_ridge.jpg',
  hero_image_alt = 'Timber Ridge Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Timber Ridge Ski Area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'timber-ridge' AND active = TRUE AND hero_image_url IS NULL;

-- Timberline Lodge Ski Area (timberline-lodge)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/1/10/Timberline_snowgoose.png',
  hero_image_alt = 'Timberline Lodge Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Timberline Lodge ski area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'timberline-lodge' AND active = TRUE AND hero_image_url IS NULL;

-- Warner Canyon Ski Area (warner-canyon)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/9/9d/WarnerCanyon.JPG',
  hero_image_alt = 'Warner Canyon Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Warner Canyon)',
  last_verified_at = '2026-05-07'
WHERE slug = 'warner-canyon' AND active = TRUE AND hero_image_url IS NULL;

-- Welch Village (welch-village)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/8/87/Welch_Village_NYE_2020.jpg',
  hero_image_alt = 'Welch Village ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Welch Village)',
  last_verified_at = '2026-05-07'
WHERE slug = 'welch-village' AND active = TRUE AND hero_image_url IS NULL;

-- Whitefish Mountain Resort (whitefish)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/5/57/WhitefishMountainResort.jpg',
  hero_image_alt = 'Whitefish Mountain Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Whitefish Mountain Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'whitefish' AND active = TRUE AND hero_image_url IS NULL;

-- Whitetail Resort (whitetail-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/en/0/0e/Whitetail_Ski_Resort_Logo.png',
  hero_image_alt = 'Whitetail Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Whitetail Ski Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'whitetail-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Wild Mountain (wild-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/73/Wild_Mountain_From_Above.jpg/3840px-Wild_Mountain_From_Above.jpg',
  hero_image_alt = 'Wild Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Wild Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'wild-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Wildcat Mountain (wildcat-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/0/03/WildcatA.jpg',
  hero_image_alt = 'Wildcat Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Wildcat Mountain (New Hampshire))',
  last_verified_at = '2026-05-07'
WHERE slug = 'wildcat-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Willamette Pass Resort (willamette-pass)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/7/70/WillamettePass.JPG',
  hero_image_alt = 'Willamette Pass Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Willamette Pass Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'willamette-pass' AND active = TRUE AND hero_image_url IS NULL;

-- Wilmot Mountain (wilmot-mountain)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/0/0e/UPPER-CAT-EVE.jpg',
  hero_image_alt = 'Wilmot Mountain ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Wilmot Mountain)',
  last_verified_at = '2026-05-07'
WHERE slug = 'wilmot-mountain' AND active = TRUE AND hero_image_url IS NULL;

-- Wisp Resort (wisp-resort)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/f/f7/WispLogo.png',
  hero_image_alt = 'Wisp Resort ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Wisp Ski Resort)',
  last_verified_at = '2026-05-07'
WHERE slug = 'wisp-resort' AND active = TRUE AND hero_image_url IS NULL;

-- Wolf Creek Ski Area (wolf-creek)
UPDATE resorts SET
  hero_image_url = 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c3/Wolf_Creek_Ski_Area.JPG/3840px-Wolf_Creek_Ski_Area.JPG',
  hero_image_alt = 'Wolf Creek Ski Area ski resort',
  hero_image_source = 'Wikimedia Commons (Wikipedia: Wolf Creek ski area)',
  last_verified_at = '2026-05-07'
WHERE slug = 'wolf-creek' AND active = TRUE AND hero_image_url IS NULL;

-- Verify new hero coverage
SELECT
  COUNT(*) FILTER (WHERE hero_image_url IS NOT NULL) AS with_hero,
  COUNT(*) AS total,
  ROUND(100.0 * COUNT(*) FILTER (WHERE hero_image_url IS NOT NULL) / COUNT(*), 1) AS pct
FROM resorts WHERE active = TRUE;

COMMIT;
