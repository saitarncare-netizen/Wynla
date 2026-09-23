// Aggregate the 5 agent outputs from Stage 2, dedupe slugs, resolve
// collisions, and emit data/seed_resorts_listed.sql with one big INSERT.
//
// Data sources (all from parallel general-purpose agents on 2026-05-02):
//   - Mountain West (CO, UT, WY, MT, ID)
//   - Pacific & Southwest + Alaska (CA, OR, WA, NV, NM, AZ, AK)
//   - Northeast remainder (ME, NH, VT, NY, PA)
//   - Midwest (MI, WI, MN, IA, IL, IN, OH, MO, ND, SD)
//   - Mid-Atlantic + South + remaining NJ/MA/CT (MD, VA, WV, KY, TN, NC, SC, GA, AL, MS, AR, LA)

import { writeFileSync } from "node:fs";

// Slugs already in the DB from Phase 1 — anything matching these is dropped.
const EXISTING_SLUGS = new Set([
  "hunter-mountain", "windham-mountain", "belleayre-mountain", "plattekill-mountain",
  "gore-mountain", "whiteface-mountain", "mount-pisgah", "thunder-ridge-ski-area",
  "mount-peter", "mountain-creek", "camelback-mountain-resort", "blue-mountain-resort",
  "shawnee-mountain", "jack-frost-mountain", "big-boulder", "montage-mountain",
  "elk-mountain", "mohawk-mountain-ski-area", "mount-southington", "berkshire-east",
  "catamount-ski-area", "jiminy-peak", "wachusett-mountain", "stratton-mountain",
  "mount-snow", "magic-mountain", "bromley-mountain", "okemo-mountain-resort",
  "loon-mountain", "cannon-mountain",
]);

// Manual slug overrides for collisions across agents (e.g., two resorts both
// claiming "crystal-mountain" — we keep the most-recognized one as the bare
// slug and suffix the other with state).
const SLUG_OVERRIDES = {
  // Agent A's Magic Mountain (ID) collides with our existing magic-mountain (VT).
  "magic-mountain__ID": "magic-mountain-id",
  // Agent D's Crystal Mountain (MI) collides with Agent B's Crystal Mountain (WA).
  "crystal-mountain__MI": "crystal-mountain-mi",
};

// ============================================================================
// Agent A — Mountain West (CO, UT, WY, MT, ID)
// ============================================================================
const mountainWest = {
  "arapahoe-basin": {name:"Arapahoe Basin",state:"CO",region:"Front Range / Rocky Mountains",latitude:39.6425,longitude:-105.8719,website_url:"https://www.arapahoebasin.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "aspen-mountain": {name:"Aspen Mountain",state:"CO",region:"Elk Mountains",latitude:39.1844,longitude:-106.8175,website_url:"https://www.aspensnowmass.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "aspen-highlands": {name:"Aspen Highlands",state:"CO",region:"Elk Mountains",latitude:39.1825,longitude:-106.8556,website_url:"https://www.aspensnowmass.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "buttermilk": {name:"Buttermilk",state:"CO",region:"Elk Mountains",latitude:39.2061,longitude:-106.8650,website_url:"https://www.aspensnowmass.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "snowmass": {name:"Snowmass",state:"CO",region:"Elk Mountains",latitude:39.2089,longitude:-106.9489,website_url:"https://www.aspensnowmass.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "beaver-creek": {name:"Beaver Creek Resort",state:"CO",region:"Sawatch Range / Rocky Mountains",latitude:39.6042,longitude:-106.5167,website_url:"https://www.beavercreek.com",passes:["epic"],operating_status:"active"},
  "breckenridge": {name:"Breckenridge Ski Resort",state:"CO",region:"Tenmile Range / Rocky Mountains",latitude:39.4817,longitude:-106.0667,website_url:"https://www.breckenridge.com",passes:["epic"],operating_status:"active"},
  "chapman-hill": {name:"Chapman Hill Ski Area",state:"CO",region:"San Juan Mountains",latitude:37.2811,longitude:-107.8631,website_url:"https://www.durangogov.org",passes:["independent"],operating_status:"active"},
  "copper-mountain": {name:"Copper Mountain",state:"CO",region:"Tenmile Range / Rocky Mountains",latitude:39.5022,longitude:-106.1497,website_url:"https://www.coppercolorado.com",passes:["ikon"],operating_status:"active"},
  "cranor-ski-hill": {name:"Cranor Ski Hill",state:"CO",region:"Sawatch Range",latitude:38.5658,longitude:-106.9006,website_url:"https://www.gunnisonco.gov",passes:["independent"],operating_status:"active"},
  "crested-butte": {name:"Crested Butte Mountain Resort",state:"CO",region:"Elk Mountains",latitude:38.8997,longitude:-106.9650,website_url:"https://www.skicb.com",passes:["epic"],operating_status:"active"},
  "echo-mountain": {name:"Echo Mountain",state:"CO",region:"Front Range",latitude:39.6700,longitude:-105.6017,website_url:"https://www.echomntn.com",passes:["independent"],operating_status:"active"},
  "eldora": {name:"Eldora Mountain Resort",state:"CO",region:"Front Range / Indian Peaks",latitude:39.9372,longitude:-105.5828,website_url:"https://www.eldora.com",passes:["ikon"],operating_status:"active"},
  "granby-ranch": {name:"Granby Ranch",state:"CO",region:"Rocky Mountains",latitude:40.0494,longitude:-105.9408,website_url:"https://www.granbyranch.com",passes:["indy"],operating_status:"active"},
  "hesperus-ski-area": {name:"Hesperus Ski Area",state:"CO",region:"La Plata Mountains / San Juan Mountains",latitude:37.3008,longitude:-108.0444,website_url:"https://www.ski-hesperus.com",passes:["independent"],operating_status:"active"},
  "hoedown-hill": {name:"Hoedown Hill",state:"CO",region:"Front Range",latitude:40.4239,longitude:-105.0008,website_url:"https://www.hoedownhill.com",passes:["independent"],operating_status:"active"},
  "howelsen-hill": {name:"Howelsen Hill Ski Area",state:"CO",region:"Park Range / Rocky Mountains",latitude:40.4831,longitude:-106.8350,website_url:"https://www.steamboatsprings.net",passes:["independent"],operating_status:"active"},
  "keystone": {name:"Keystone Resort",state:"CO",region:"Front Range / Rocky Mountains",latitude:39.6047,longitude:-105.9550,website_url:"https://www.keystoneresort.com",passes:["epic"],operating_status:"active"},
  "lake-city-ski-hill": {name:"Lake City Ski Hill",state:"CO",region:"San Juan Mountains",latitude:38.0297,longitude:-107.3150,website_url:"https://www.lakecity.com",passes:["independent"],operating_status:"active"},
  "lees-ski-hill": {name:"Lee's Ski Hill",state:"CO",region:"San Juan Mountains",latitude:38.0228,longitude:-107.6717,website_url:"https://www.cityofouray.com",passes:["independent"],operating_status:"active"},
  "loveland": {name:"Loveland Ski Area",state:"CO",region:"Front Range / Rocky Mountains",latitude:39.6803,longitude:-105.8978,website_url:"https://www.skiloveland.com",passes:["indy"],operating_status:"active"},
  "monarch-mountain": {name:"Monarch Mountain",state:"CO",region:"Sawatch Range",latitude:38.5125,longitude:-106.3322,website_url:"https://www.skimonarch.com",passes:["indy"],operating_status:"active"},
  "powderhorn": {name:"Powderhorn Resort",state:"CO",region:"Grand Mesa",latitude:39.0750,longitude:-108.1858,website_url:"https://www.powderhorn.com",passes:["indy"],operating_status:"active"},
  "purgatory": {name:"Purgatory Resort",state:"CO",region:"San Juan Mountains",latitude:37.6300,longitude:-107.8136,website_url:"https://www.purgatoryresort.com",passes:["ikon","indy"],operating_status:"active"},
  "silverton-mountain": {name:"Silverton Mountain",state:"CO",region:"San Juan Mountains",latitude:37.8489,longitude:-107.6708,website_url:"https://www.silvertonmountain.com",passes:["mountain_collective"],operating_status:"active"},
  "ski-cooper": {name:"Ski Cooper",state:"CO",region:"Sawatch Range / Rocky Mountains",latitude:39.3656,longitude:-106.3522,website_url:"https://www.skicooper.com",passes:["indy"],operating_status:"active"},
  "steamboat": {name:"Steamboat Ski Resort",state:"CO",region:"Park Range / Rocky Mountains",latitude:40.4572,longitude:-106.8042,website_url:"https://www.steamboat.com",passes:["ikon"],operating_status:"active"},
  "sunlight-mountain": {name:"Sunlight Mountain Resort",state:"CO",region:"White River National Forest",latitude:39.4233,longitude:-107.3461,website_url:"https://www.sunlightmtn.com",passes:["indy"],operating_status:"active"},
  "telluride": {name:"Telluride Ski Resort",state:"CO",region:"San Juan Mountains",latitude:37.9375,longitude:-107.8517,website_url:"https://www.tellurideskiresort.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "vail": {name:"Vail Ski Resort",state:"CO",region:"Gore Range / Rocky Mountains",latitude:39.6403,longitude:-106.3742,website_url:"https://www.vail.com",passes:["epic"],operating_status:"active"},
  "winter-park": {name:"Winter Park Resort",state:"CO",region:"Front Range / Rocky Mountains",latitude:39.8856,longitude:-105.7625,website_url:"https://www.winterparkresort.com",passes:["ikon"],operating_status:"active"},
  "wolf-creek": {name:"Wolf Creek Ski Area",state:"CO",region:"San Juan Mountains",latitude:37.4722,longitude:-106.7944,website_url:"https://www.wolfcreekski.com",passes:["independent"],operating_status:"active"},
  "alta": {name:"Alta Ski Area",state:"UT",region:"Wasatch Range",latitude:40.5883,longitude:-111.6378,website_url:"https://www.alta.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "beaver-mountain": {name:"Beaver Mountain",state:"UT",region:"Bear River Range",latitude:41.9686,longitude:-111.5439,website_url:"https://www.skithebeav.com",passes:["independent"],operating_status:"active"},
  "brian-head": {name:"Brian Head Resort",state:"UT",region:"Markagunt Plateau",latitude:37.7022,longitude:-112.8497,website_url:"https://www.brianhead.com",passes:["indy"],operating_status:"active"},
  "brighton": {name:"Brighton Resort",state:"UT",region:"Wasatch Range",latitude:40.5972,longitude:-111.5836,website_url:"https://www.brightonresort.com",passes:["ikon"],operating_status:"active"},
  "cherry-peak": {name:"Cherry Peak Resort",state:"UT",region:"Bear River Range",latitude:41.9228,longitude:-111.7392,website_url:"https://www.skithepeak.com",passes:["independent"],operating_status:"active"},
  "deer-valley": {name:"Deer Valley Resort",state:"UT",region:"Wasatch Range",latitude:40.6308,longitude:-111.4847,website_url:"https://www.deervalley.com",passes:["ikon"],operating_status:"active"},
  "eagle-point": {name:"Eagle Point Resort",state:"UT",region:"Tushar Mountains",latitude:38.3275,longitude:-112.3819,website_url:"https://www.eaglepointresort.com",passes:["indy"],operating_status:"active"},
  "park-city": {name:"Park City Mountain Resort",state:"UT",region:"Wasatch Range",latitude:40.6514,longitude:-111.5081,website_url:"https://www.parkcitymountain.com",passes:["epic"],operating_status:"active"},
  "powder-mountain": {name:"Powder Mountain",state:"UT",region:"Wasatch Range",latitude:41.3789,longitude:-111.7758,website_url:"https://www.powdermountain.com",passes:["mountain_collective"],operating_status:"active"},
  "snowbasin": {name:"Snowbasin",state:"UT",region:"Wasatch Range",latitude:41.2161,longitude:-111.8569,website_url:"https://www.snowbasin.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "snowbird": {name:"Snowbird",state:"UT",region:"Wasatch Range",latitude:40.5811,longitude:-111.6561,website_url:"https://www.snowbird.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "soldier-hollow": {name:"Soldier Hollow",state:"UT",region:"Wasatch Range",latitude:40.4617,longitude:-111.4761,website_url:"https://www.soldierhollow.org",passes:["independent"],operating_status:"active"},
  "solitude": {name:"Solitude Mountain Resort",state:"UT",region:"Wasatch Range",latitude:40.6197,longitude:-111.5919,website_url:"https://www.solitudemountain.com",passes:["ikon"],operating_status:"active"},
  "sundance": {name:"Sundance Mountain Resort",state:"UT",region:"Wasatch Range",latitude:40.3933,longitude:-111.5808,website_url:"https://www.sundanceresort.com",passes:["indy"],operating_status:"active"},
  "woodward-park-city": {name:"Woodward Park City",state:"UT",region:"Wasatch Range",latitude:40.7239,longitude:-111.5686,website_url:"https://www.woodwardparkcity.com",passes:["independent"],operating_status:"active"},
  "nordic-valley": {name:"Nordic Valley",state:"UT",region:"Wasatch Range",latitude:41.3036,longitude:-111.8775,website_url:"https://www.nordicvalley.com",passes:["indy"],operating_status:"active"},
  "jackson-hole": {name:"Jackson Hole Mountain Resort",state:"WY",region:"Teton Range",latitude:43.5875,longitude:-110.8281,website_url:"https://www.jacksonhole.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "grand-targhee": {name:"Grand Targhee Resort",state:"WY",region:"Teton Range",latitude:43.7886,longitude:-110.9606,website_url:"https://www.grandtarghee.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "snow-king": {name:"Snow King Mountain",state:"WY",region:"Teton Range",latitude:43.4647,longitude:-110.7619,website_url:"https://www.snowkingmountain.com",passes:["indy"],operating_status:"active"},
  "hogadon": {name:"Hogadon Basin Ski Area",state:"WY",region:"Casper Mountain",latitude:42.7339,longitude:-106.3275,website_url:"https://www.hogadon.net",passes:["independent"],operating_status:"active"},
  "snowy-range": {name:"Snowy Range Ski Area",state:"WY",region:"Snowy Range / Medicine Bow Mountains",latitude:41.3556,longitude:-106.1789,website_url:"https://www.snowyrangeski.com",passes:["indy"],operating_status:"active"},
  "white-pine": {name:"White Pine Ski Resort",state:"WY",region:"Wind River Range",latitude:42.8175,longitude:-109.7611,website_url:"https://www.whitepineski.com",passes:["indy"],operating_status:"active"},
  "antelope-butte": {name:"Antelope Butte",state:"WY",region:"Bighorn Mountains",latitude:44.6675,longitude:-107.5908,website_url:"https://www.antelopebutte.org",passes:["independent"],operating_status:"active"},
  "sleeping-giant": {name:"Sleeping Giant Ski Area",state:"WY",region:"Absaroka Range",latitude:44.4744,longitude:-109.8639,website_url:"https://www.skisg.com",passes:["independent"],operating_status:"active"},
  "meadowlark": {name:"Meadowlark Ski Lodge",state:"WY",region:"Bighorn Mountains",latitude:44.0339,longitude:-107.2583,website_url:"https://www.meadowlarkskilodge.com",passes:["independent"],operating_status:"active"},
  "beartooth-basin": {name:"Beartooth Basin Summer Ski Area",state:"WY",region:"Beartooth Mountains",latitude:44.9633,longitude:-109.4750,website_url:"https://www.beartoothbasin.com",passes:["independent"],operating_status:"seasonal"},
  "big-sky": {name:"Big Sky Resort",state:"MT",region:"Madison Range",latitude:45.2841,longitude:-111.4014,website_url:"https://www.bigskyresort.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "whitefish": {name:"Whitefish Mountain Resort",state:"MT",region:"Whitefish Range / Rocky Mountains",latitude:48.4889,longitude:-114.3492,website_url:"https://skiwhitefish.com",passes:["indy"],operating_status:"active"},
  "bridger-bowl": {name:"Bridger Bowl Ski Area",state:"MT",region:"Bridger Range",latitude:45.8194,longitude:-110.9008,website_url:"https://bridgerbowl.com",passes:["indy"],operating_status:"active"},
  "red-lodge": {name:"Red Lodge Mountain",state:"MT",region:"Beartooth Mountains",latitude:45.1894,longitude:-109.3553,website_url:"https://www.redlodgemountain.com",passes:["indy"],operating_status:"active"},
  "discovery": {name:"Discovery Ski Area",state:"MT",region:"Flint Creek Range / Pintler Range",latitude:46.2350,longitude:-113.2381,website_url:"https://www.skidiscovery.com",passes:["indy"],operating_status:"active"},
  "blacktail": {name:"Blacktail Mountain Ski Area",state:"MT",region:"Salish Mountains",latitude:48.0017,longitude:-114.3519,website_url:"https://blacktailmountain.com",passes:["independent"],operating_status:"active"},
  "great-divide": {name:"Great Divide",state:"MT",region:"Continental Divide / Rocky Mountains",latitude:46.7822,longitude:-112.2719,website_url:"https://www.skigd.com",passes:["independent"],operating_status:"active"},
  "lookout-pass": {name:"Lookout Pass Ski and Recreation Area",state:"MT",region:"Bitterroot Range",latitude:47.4525,longitude:-115.6989,website_url:"https://www.skilookout.com",passes:["indy"],operating_status:"active"},
  "lost-trail": {name:"Lost Trail Powder Mountain",state:"MT",region:"Bitterroot Range",latitude:45.6914,longitude:-113.9486,website_url:"https://www.losttrail.com",passes:["indy"],operating_status:"active"},
  "maverick-mountain": {name:"Maverick Mountain Ski Area",state:"MT",region:"Pioneer Mountains",latitude:45.4408,longitude:-113.2389,website_url:"https://skimaverick.com",passes:["independent"],operating_status:"active"},
  "montana-snowbowl": {name:"Montana Snowbowl",state:"MT",region:"Rattlesnake Mountains",latitude:47.0150,longitude:-114.0078,website_url:"https://www.montanasnowbowl.com",passes:["indy"],operating_status:"active"},
  "showdown": {name:"Showdown Montana",state:"MT",region:"Little Belt Mountains",latitude:46.8489,longitude:-110.8861,website_url:"https://showdownmontana.com",passes:["indy"],operating_status:"active"},
  "teton-pass": {name:"Teton Pass Ski Area",state:"MT",region:"Rocky Mountain Front",latitude:47.9956,longitude:-112.8083,website_url:"https://tetonpassmt.com",passes:["independent"],operating_status:"active"},
  "turner-mountain": {name:"Turner Mountain Ski Resort",state:"MT",region:"Purcell Mountains",latitude:48.6833,longitude:-115.5697,website_url:"https://www.skiturner.com",passes:["independent"],operating_status:"active"},
  "bear-paw": {name:"Bear Paw Ski Bowl",state:"MT",region:"Bears Paw Mountains",latitude:48.1731,longitude:-109.6981,website_url:"https://skibearpaw.com",passes:["independent"],operating_status:"active"},
  "yellowstone-club": {name:"Yellowstone Club",state:"MT",region:"Madison Range",latitude:45.2700,longitude:-111.4486,website_url:"https://www.yellowstoneclub.com",passes:["independent"],operating_status:"active"},
  "sun-valley": {name:"Sun Valley Resort",state:"ID",region:"Smoky Mountains / Sawtooth Range",latitude:43.6711,longitude:-114.3539,website_url:"https://www.sunvalley.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "schweitzer": {name:"Schweitzer Mountain",state:"ID",region:"Selkirk Mountains",latitude:48.3678,longitude:-116.6233,website_url:"https://www.schweitzer.com",passes:["ikon"],operating_status:"active"},
  "brundage-mountain": {name:"Brundage Mountain",state:"ID",region:"Salmon River Mountains",latitude:45.0214,longitude:-116.1572,website_url:"https://www.brundage.com",passes:["indy"],operating_status:"active"},
  "tamarack": {name:"Tamarack Resort",state:"ID",region:"West Mountains",latitude:44.9483,longitude:-116.0747,website_url:"https://www.tamarackidaho.com",passes:["indy"],operating_status:"active"},
  "bogus-basin": {name:"Bogus Basin",state:"ID",region:"Boise Mountains",latitude:43.7619,longitude:-116.0972,website_url:"https://www.bogusbasin.org",passes:["indy"],operating_status:"active"},
  "silver-mountain": {name:"Silver Mountain",state:"ID",region:"Bitterroot Range / Coeur d'Alene Mountains",latitude:47.5097,longitude:-116.0181,website_url:"https://www.silvermt.com",passes:["indy"],operating_status:"active"},
  "soldier-mountain": {name:"Soldier Mountain",state:"ID",region:"Soldier Mountains / Sawtooth Range",latitude:43.5417,longitude:-114.8583,website_url:"https://soldiermountain.com",passes:["indy"],operating_status:"active"},
  "pebble-creek": {name:"Pebble Creek Ski Area",state:"ID",region:"Portneuf Range",latitude:42.8500,longitude:-112.1064,website_url:"https://www.pebblecreekskiarea.com",passes:["indy"],operating_status:"active"},
  "kelly-canyon": {name:"Kelly Canyon Ski Resort",state:"ID",region:"Big Hole Mountains",latitude:43.7986,longitude:-111.5750,website_url:"https://skikelly.com",passes:["independent"],operating_status:"active"},
  "pomerelle": {name:"Pomerelle Mountain Resort",state:"ID",region:"Albion Mountains",latitude:42.2672,longitude:-113.5400,website_url:"https://pomerelle-mtn.com",passes:["independent"],operating_status:"active"},
  "magic-mountain__ID": {name:"Magic Mountain Resort",state:"ID",region:"South Hills",latitude:42.1761,longitude:-114.2722,website_url:"https://magicmountainresort.com",passes:["independent"],operating_status:"active"},
  "cottonwood-butte": {name:"Cottonwood Butte",state:"ID",region:"Camas Prairie",latitude:46.0492,longitude:-116.4342,website_url:"https://www.cottonwoodbutte.org",passes:["independent"],operating_status:"active"},
  "snowhaven": {name:"Snowhaven",state:"ID",region:"Camas Prairie",latitude:46.0972,longitude:-115.9619,website_url:"https://www.grangevilleidaho.com",passes:["independent"],operating_status:"active"},
  "little-ski-hill": {name:"Little Ski Hill",state:"ID",region:"Salmon River Mountains",latitude:44.9156,longitude:-116.1592,website_url:"https://littleskihill.org",passes:["independent"],operating_status:"active"},
  "rotarun": {name:"Rotarun Ski Area",state:"ID",region:"Wood River Valley",latitude:43.6978,longitude:-114.3622,website_url:"https://rotarun.com",passes:["independent"],operating_status:"active"},
};

// ============================================================================
// Agent B — Pacific & Southwest + Alaska (CA, OR, WA, NV, NM, AZ, AK)
// ============================================================================
const pacificSouthwest = {
  "alyeska-resort": {name:"Alyeska Resort",state:"AK",region:"Chugach Mountains",latitude:60.9624,longitude:-149.0989,website_url:"https://www.alyeskaresort.com",passes:["mountain_collective"],operating_status:"active"},
  "eaglecrest-ski-area": {name:"Eaglecrest Ski Area",state:"AK",region:"Coast Mountains (Douglas Island)",latitude:58.3700,longitude:-134.5400,website_url:"https://skieaglecrest.com",passes:["independent"],operating_status:"active"},
  "hilltop-ski-area": {name:"Hilltop Ski Area",state:"AK",region:"Chugach Mountains (Anchorage)",latitude:61.1014,longitude:-149.7611,website_url:"https://hilltopskiarea.org",passes:["independent"],operating_status:"active"},
  "mt-eyak-ski-area": {name:"Mt. Eyak Ski Area",state:"AK",region:"Chugach Mountains (Cordova)",latitude:60.5447,longitude:-145.7472,website_url:"https://mteyak.org",passes:["independent"],operating_status:"active"},
  "arctic-valley": {name:"Arctic Valley Ski Area",state:"AK",region:"Chugach Mountains (Anchorage)",latitude:61.2486,longitude:-149.5269,website_url:"https://skiarctic.net",passes:["independent"],operating_status:"active"},
  "skiland": {name:"Moose Mountain (Skiland)",state:"AK",region:"Interior Alaska (Fairbanks)",latitude:64.9706,longitude:-147.7522,website_url:"https://skiland.org",passes:["independent"],operating_status:"active"},
  "palisades-tahoe": {name:"Palisades Tahoe",state:"CA",region:"Sierra Nevada",latitude:39.1969,longitude:-120.2356,website_url:"https://www.palisadestahoe.com",passes:["ikon"],operating_status:"active"},
  "alpine-meadows": {name:"Alpine Meadows",state:"CA",region:"Sierra Nevada",latitude:39.1683,longitude:-120.2386,website_url:"https://www.palisadestahoe.com",passes:["ikon"],operating_status:"active"},
  "heavenly-mountain-resort": {name:"Heavenly Mountain Resort",state:"CA",region:"Sierra Nevada (Lake Tahoe)",latitude:38.9353,longitude:-119.9400,website_url:"https://www.skiheavenly.com",passes:["epic"],operating_status:"active"},
  "northstar-california": {name:"Northstar California",state:"CA",region:"Sierra Nevada (Lake Tahoe)",latitude:39.2747,longitude:-120.1211,website_url:"https://www.northstarcalifornia.com",passes:["epic"],operating_status:"active"},
  "kirkwood-mountain-resort": {name:"Kirkwood Mountain Resort",state:"CA",region:"Sierra Nevada",latitude:38.6850,longitude:-120.0658,website_url:"https://www.kirkwood.com",passes:["epic"],operating_status:"active"},
  "sierra-at-tahoe": {name:"Sierra-at-Tahoe",state:"CA",region:"Sierra Nevada (Lake Tahoe)",latitude:38.7997,longitude:-120.0789,website_url:"https://www.sierraattahoe.com",passes:["independent"],operating_status:"active"},
  "homewood-mountain-resort": {name:"Homewood Mountain Resort",state:"CA",region:"Sierra Nevada (Lake Tahoe)",latitude:39.0856,longitude:-120.1656,website_url:"https://www.skihomewood.com",passes:["independent"],operating_status:"closed"},
  "boreal-mountain-resort": {name:"Boreal Mountain Resort",state:"CA",region:"Sierra Nevada",latitude:39.3328,longitude:-120.3486,website_url:"https://www.rideboreal.com",passes:["independent"],operating_status:"active"},
  "soda-springs": {name:"Soda Springs Mountain Resort",state:"CA",region:"Sierra Nevada",latitude:39.3211,longitude:-120.3781,website_url:"https://www.skisodasprings.com",passes:["independent"],operating_status:"active"},
  "donner-ski-ranch": {name:"Donner Ski Ranch",state:"CA",region:"Sierra Nevada",latitude:39.3169,longitude:-120.3306,website_url:"https://www.donnerskiranch.com",passes:["indy"],operating_status:"active"},
  "sugar-bowl-resort": {name:"Sugar Bowl Resort",state:"CA",region:"Sierra Nevada",latitude:39.3033,longitude:-120.3361,website_url:"https://www.sugarbowl.com",passes:["indy"],operating_status:"active"},
  "tahoe-donner-downhill": {name:"Tahoe Donner Downhill Ski Area",state:"CA",region:"Sierra Nevada",latitude:39.3539,longitude:-120.2586,website_url:"https://www.tahoedonner.com",passes:["independent"],operating_status:"active"},
  "diamond-peak": {name:"Diamond Peak",state:"NV",region:"Sierra Nevada (Lake Tahoe)",latitude:39.2542,longitude:-119.9269,website_url:"https://www.diamondpeak.com",passes:["independent"],operating_status:"active"},
  "mt-rose-ski-tahoe": {name:"Mt. Rose Ski Tahoe",state:"NV",region:"Sierra Nevada (Lake Tahoe)",latitude:39.3247,longitude:-119.8836,website_url:"https://skirose.com",passes:["indy"],operating_status:"active"},
  "lee-canyon": {name:"Lee Canyon",state:"NV",region:"Spring Mountains",latitude:36.3072,longitude:-115.6781,website_url:"https://www.leecanyonlv.com",passes:["indy"],operating_status:"active"},
  "elko-snobowl": {name:"Elko SnoBowl",state:"NV",region:"Ruby Mountains",latitude:40.7589,longitude:-115.7656,website_url:"https://elkosnobowl.com",passes:["independent"],operating_status:"active"},
  "mammoth-mountain": {name:"Mammoth Mountain Ski Area",state:"CA",region:"Sierra Nevada",latitude:37.6308,longitude:-119.0326,website_url:"https://www.mammothmountain.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "june-mountain": {name:"June Mountain",state:"CA",region:"Sierra Nevada",latitude:37.7689,longitude:-119.0894,website_url:"https://www.junemountain.com",passes:["ikon"],operating_status:"active"},
  "bear-valley-mountain": {name:"Bear Valley Mountain Resort",state:"CA",region:"Sierra Nevada",latitude:38.4814,longitude:-120.0436,website_url:"https://www.bearvalley.com",passes:["indy"],operating_status:"active"},
  "dodge-ridge": {name:"Dodge Ridge",state:"CA",region:"Sierra Nevada",latitude:38.1864,longitude:-119.9544,website_url:"https://www.dodgeridge.com",passes:["indy"],operating_status:"active"},
  "china-peak": {name:"China Peak Mountain Resort",state:"CA",region:"Sierra Nevada",latitude:37.2356,longitude:-119.1581,website_url:"https://www.skichinapeak.com",passes:["indy"],operating_status:"active"},
  "badger-pass": {name:"Badger Pass Ski Area (Yosemite)",state:"CA",region:"Sierra Nevada (Yosemite)",latitude:37.6650,longitude:-119.6586,website_url:"https://www.travelyosemite.com/winter/yosemite-ski-snowboard-area/",passes:["independent"],operating_status:"active"},
  "mountain-high": {name:"Mountain High",state:"CA",region:"San Gabriel Mountains",latitude:34.3786,longitude:-117.6883,website_url:"https://www.mthigh.com",passes:["indy"],operating_status:"active"},
  "snow-valley": {name:"Snow Valley Mountain Resort",state:"CA",region:"San Bernardino Mountains",latitude:34.2222,longitude:-117.0353,website_url:"https://www.snow-valley.com",passes:["ikon"],operating_status:"active"},
  "snow-summit": {name:"Snow Summit",state:"CA",region:"San Bernardino Mountains (Big Bear)",latitude:34.2336,longitude:-116.8919,website_url:"https://www.bigbearmountainresort.com",passes:["ikon"],operating_status:"active"},
  "bear-mountain": {name:"Bear Mountain",state:"CA",region:"San Bernardino Mountains (Big Bear)",latitude:34.2289,longitude:-116.8597,website_url:"https://www.bigbearmountainresort.com",passes:["ikon"],operating_status:"active"},
  "mt-baldy": {name:"Mt. Baldy Ski Resort",state:"CA",region:"San Gabriel Mountains",latitude:34.2592,longitude:-117.6244,website_url:"https://www.mtbaldyresort.com",passes:["independent"],operating_status:"active"},
  "mt-waterman": {name:"Mt. Waterman",state:"CA",region:"San Gabriel Mountains",latitude:34.3403,longitude:-117.9181,website_url:"https://www.mtwaterman.org",passes:["independent"],operating_status:"seasonal"},
  "mt-shasta-ski-park": {name:"Mt. Shasta Ski Park",state:"CA",region:"Cascade Range",latitude:41.3175,longitude:-122.2392,website_url:"https://www.skipark.com",passes:["indy"],operating_status:"active"},
  "mt-bachelor": {name:"Mt. Bachelor",state:"OR",region:"Cascade Range",latitude:43.9789,longitude:-121.6886,website_url:"https://www.mtbachelor.com",passes:["ikon"],operating_status:"active"},
  "timberline-lodge": {name:"Timberline Lodge Ski Area",state:"OR",region:"Cascade Range (Mt. Hood)",latitude:45.3311,longitude:-121.7111,website_url:"https://www.timberlinelodge.com",passes:["indy"],operating_status:"active"},
  "mt-hood-meadows": {name:"Mt. Hood Meadows",state:"OR",region:"Cascade Range (Mt. Hood)",latitude:45.3322,longitude:-121.6669,website_url:"https://www.skihood.com",passes:["independent"],operating_status:"active"},
  "mt-hood-skibowl": {name:"Mt. Hood Skibowl",state:"OR",region:"Cascade Range (Mt. Hood)",latitude:45.3017,longitude:-121.7800,website_url:"https://www.skibowl.com",passes:["indy"],operating_status:"active"},
  "cooper-spur": {name:"Cooper Spur Mountain Resort",state:"OR",region:"Cascade Range (Mt. Hood)",latitude:45.4389,longitude:-121.6356,website_url:"https://cooperspur.com",passes:["independent"],operating_status:"active"},
  "summit-ski-area": {name:"Summit Ski Area",state:"OR",region:"Cascade Range (Mt. Hood)",latitude:45.3047,longitude:-121.7397,website_url:"https://summitskiarea.com",passes:["independent"],operating_status:"active"},
  "hoodoo-ski-area": {name:"Hoodoo Ski Area",state:"OR",region:"Cascade Range",latitude:44.4017,longitude:-121.8639,website_url:"https://www.skihoodoo.com",passes:["indy"],operating_status:"active"},
  "willamette-pass": {name:"Willamette Pass Resort",state:"OR",region:"Cascade Range",latitude:43.5969,longitude:-122.0364,website_url:"https://www.willamettepass.com",passes:["indy"],operating_status:"active"},
  "anthony-lakes": {name:"Anthony Lakes Mountain Resort",state:"OR",region:"Elkhorn Mountains (Blue Mountains)",latitude:44.9622,longitude:-118.2306,website_url:"https://www.anthonylakes.com",passes:["indy"],operating_status:"active"},
  "spout-springs": {name:"Spout Springs Ski Area",state:"OR",region:"Blue Mountains",latitude:45.7558,longitude:-118.0608,website_url:"https://spoutspringsskiarea.com",passes:["independent"],operating_status:"seasonal"},
  "ferguson-ridge": {name:"Ferguson Ridge Ski Area",state:"OR",region:"Wallowa Mountains",latitude:45.2667,longitude:-117.0308,website_url:"https://skifergi.com",passes:["independent"],operating_status:"active"},
  "warner-canyon": {name:"Warner Canyon Ski Area",state:"OR",region:"Warner Mountains",latitude:42.2369,longitude:-120.2719,website_url:"https://warnercanyonskiarea.com",passes:["independent"],operating_status:"active"},
  "crystal-mountain": {name:"Crystal Mountain",state:"WA",region:"Cascade Range",latitude:46.9275,longitude:-121.4753,website_url:"https://www.crystalmountainresort.com",passes:["ikon"],operating_status:"active"},
  "stevens-pass": {name:"Stevens Pass",state:"WA",region:"Cascade Range",latitude:47.7461,longitude:-121.0894,website_url:"https://www.stevenspass.com",passes:["epic"],operating_status:"active"},
  "the-summit-at-snoqualmie": {name:"The Summit at Snoqualmie",state:"WA",region:"Cascade Range",latitude:47.4269,longitude:-121.4128,website_url:"https://www.summitatsnoqualmie.com",passes:["ikon"],operating_status:"active"},
  "mt-baker-ski-area": {name:"Mt. Baker Ski Area",state:"WA",region:"Cascade Range",latitude:48.8569,longitude:-121.6781,website_url:"https://www.mtbaker.us",passes:["independent"],operating_status:"active"},
  "mission-ridge": {name:"Mission Ridge Ski & Board Resort",state:"WA",region:"Cascade Range",latitude:47.2872,longitude:-120.4017,website_url:"https://www.missionridge.com",passes:["indy"],operating_status:"active"},
  "white-pass": {name:"White Pass Ski Area",state:"WA",region:"Cascade Range",latitude:46.6378,longitude:-121.3911,website_url:"https://skiwhitepass.com",passes:["indy"],operating_status:"active"},
  "49-degrees-north": {name:"49 Degrees North Mountain Resort",state:"WA",region:"Selkirk Mountains",latitude:48.3014,longitude:-117.5683,website_url:"https://www.ski49n.com",passes:["indy"],operating_status:"active"},
  "mt-spokane": {name:"Mt. Spokane Ski and Snowboard Park",state:"WA",region:"Selkirk Mountains",latitude:47.9211,longitude:-117.1100,website_url:"https://www.mtspokane.com",passes:["indy"],operating_status:"active"},
  "bluewood": {name:"Ski Bluewood",state:"WA",region:"Blue Mountains",latitude:46.0719,longitude:-117.8783,website_url:"https://bluewood.com",passes:["independent"],operating_status:"active"},
  "loup-loup": {name:"Loup Loup Ski Bowl",state:"WA",region:"Cascade Range (Okanogan)",latitude:48.3950,longitude:-119.8881,website_url:"https://skitheloup.com",passes:["independent"],operating_status:"active"},
  "leavenworth-ski-hill": {name:"Leavenworth Ski Hill",state:"WA",region:"Cascade Range",latitude:47.6125,longitude:-120.6772,website_url:"https://skileavenworth.com",passes:["independent"],operating_status:"active"},
  "hurricane-ridge": {name:"Hurricane Ridge Ski and Snowboard Area",state:"WA",region:"Olympic Mountains",latitude:47.9694,longitude:-123.4986,website_url:"https://hurricaneridge.com",passes:["independent"],operating_status:"seasonal"},
  "badger-mountain-wa": {name:"Badger Mountain Ski Area",state:"WA",region:"Columbia Plateau",latitude:47.7467,longitude:-120.0506,website_url:"https://skibadger.com",passes:["independent"],operating_status:"active"},
  "echo-valley": {name:"Echo Valley Ski Area",state:"WA",region:"Cascade Range (Chelan)",latitude:47.9211,longitude:-120.1239,website_url:"https://echovalleyski.com",passes:["independent"],operating_status:"active"},
  "taos-ski-valley": {name:"Taos Ski Valley",state:"NM",region:"Sangre de Cristo Mountains",latitude:36.5961,longitude:-105.4544,website_url:"https://www.skitaos.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "ski-santa-fe": {name:"Ski Santa Fe",state:"NM",region:"Sangre de Cristo Mountains",latitude:35.7942,longitude:-105.8056,website_url:"https://skisantafe.com",passes:["independent"],operating_status:"active"},
  "angel-fire-resort": {name:"Angel Fire Resort",state:"NM",region:"Sangre de Cristo Mountains",latitude:36.3878,longitude:-105.2906,website_url:"https://www.angelfireresort.com",passes:["independent"],operating_status:"active"},
  "red-river-ski-area": {name:"Red River Ski & Summer Area",state:"NM",region:"Sangre de Cristo Mountains",latitude:36.7019,longitude:-105.4117,website_url:"https://www.redriverskiarea.com",passes:["indy"],operating_status:"active"},
  "pajarito-mountain": {name:"Pajarito Mountain Ski Area",state:"NM",region:"Jemez Mountains",latitude:35.8917,longitude:-106.3711,website_url:"https://www.skipajarito.com",passes:["indy"],operating_status:"active"},
  "sipapu": {name:"Sipapu Ski Resort",state:"NM",region:"Sangre de Cristo Mountains",latitude:36.0083,longitude:-105.5556,website_url:"https://www.sipapunm.com",passes:["indy"],operating_status:"active"},
  "sandia-peak": {name:"Sandia Peak Ski Area",state:"NM",region:"Sandia Mountains",latitude:35.2117,longitude:-106.4106,website_url:"https://sandiapeak.com",passes:["indy"],operating_status:"active"},
  "ski-apache": {name:"Ski Apache",state:"NM",region:"Sierra Blanca (Sacramento Mountains)",latitude:33.4047,longitude:-105.7800,website_url:"https://www.skiapache.com",passes:["independent"],operating_status:"active"},
  "arizona-snowbowl": {name:"Arizona Snowbowl",state:"AZ",region:"San Francisco Peaks",latitude:35.3308,longitude:-111.7106,website_url:"https://www.snowbowl.ski",passes:["ikon","indy"],operating_status:"active"},
  "sunrise-park-resort": {name:"Sunrise Park Resort",state:"AZ",region:"White Mountains",latitude:33.9864,longitude:-109.5775,website_url:"https://www.sunriseskipark.com",passes:["independent"],operating_status:"active"},
  "mt-lemmon-ski-valley": {name:"Mt. Lemmon Ski Valley",state:"AZ",region:"Santa Catalina Mountains",latitude:32.4428,longitude:-110.7886,website_url:"https://www.skithelemmon.com",passes:["independent"],operating_status:"active"},
};

// ============================================================================
// Agent C — Northeast remainder (ME, NH, VT, NY, PA)
// ============================================================================
const northeastRemainder = {
  "sunday-river": {name:"Sunday River",state:"ME",region:"Mahoosuc Range",latitude:44.4736,longitude:-70.8569,website_url:"https://www.sundayriver.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "sugarloaf": {name:"Sugarloaf",state:"ME",region:"Western Maine Mountains",latitude:45.0314,longitude:-70.3133,website_url:"https://www.sugarloaf.com",passes:["ikon","mountain_collective"],operating_status:"active"},
  "saddleback": {name:"Saddleback",state:"ME",region:"Western Maine Mountains",latitude:44.9450,longitude:-70.5347,website_url:"https://www.saddlebackmaine.com",passes:["indy"],operating_status:"active"},
  "black-mountain-of-maine": {name:"Black Mountain of Maine",state:"ME",region:"Western Maine Mountains",latitude:44.6975,longitude:-70.5650,website_url:"https://www.skiblackmountain.org",passes:["indy"],operating_status:"active"},
  "mt-abram": {name:"Mt. Abram",state:"ME",region:"Western Maine Mountains",latitude:44.4314,longitude:-70.7825,website_url:"https://www.mtabram.com",passes:["independent"],operating_status:"active"},
  "shawnee-peak": {name:"Pleasant Mountain",state:"ME",region:"Western Maine Mountains",latitude:44.0467,longitude:-70.8589,website_url:"https://www.pleasantmountain.com",passes:["independent"],operating_status:"active"},
  "lost-valley": {name:"Lost Valley",state:"ME",region:"Androscoggin Valley",latitude:44.1361,longitude:-70.2150,website_url:"https://www.lostvalleyski.com",passes:["independent"],operating_status:"active"},
  "camden-snow-bowl": {name:"Camden Snow Bowl",state:"ME",region:"Mid-Coast Maine",latitude:44.2147,longitude:-69.1064,website_url:"https://www.camdensnowbowl.com",passes:["independent"],operating_status:"active"},
  "mount-jefferson-ski-area": {name:"Mount Jefferson Ski Area",state:"ME",region:"Northern Maine",latitude:45.5183,longitude:-68.4733,website_url:"https://www.skimtjefferson.com",passes:["independent"],operating_status:"active"},
  "big-rock": {name:"Big Rock",state:"ME",region:"Aroostook County",latitude:46.1289,longitude:-67.8992,website_url:"https://www.bigrockmaine.com",passes:["independent"],operating_status:"active"},
  "big-squaw-mountain": {name:"Big Moose Mountain",state:"ME",region:"Moosehead Lake",latitude:45.4644,longitude:-69.6489,website_url:"https://www.skibigsquaw.com",passes:["independent"],operating_status:"active"},
  "eaton-mountain": {name:"Eaton Mountain",state:"ME",region:"Central Maine",latitude:44.6594,longitude:-69.5447,website_url:"https://www.eatonmountain.com",passes:["independent"],operating_status:"active"},
  "hermon-mountain": {name:"Hermon Mountain",state:"ME",region:"Central Maine",latitude:44.7986,longitude:-68.9050,website_url:"https://www.skihermonmountain.com",passes:["independent"],operating_status:"active"},
  "titcomb-mountain": {name:"Titcomb Mountain",state:"ME",region:"Western Maine Mountains",latitude:44.6675,longitude:-70.1667,website_url:"https://www.titcombmountain.com",passes:["independent"],operating_status:"active"},
  "spruce-mountain-ski-area": {name:"Spruce Mountain Ski Area",state:"ME",region:"Western Maine Mountains",latitude:44.4358,longitude:-70.2375,website_url:"https://www.sprucemountain.org",passes:["independent"],operating_status:"active"},
  "powderhouse-hill": {name:"Powderhouse Hill",state:"ME",region:"Southern Maine",latitude:43.4633,longitude:-70.7236,website_url:"https://www.powderhousehill.com",passes:["independent"],operating_status:"active"},
  "attitash": {name:"Attitash Mountain Resort",state:"NH",region:"White Mountains",latitude:44.0833,longitude:-71.2333,website_url:"https://www.attitash.com",passes:["epic"],operating_status:"active"},
  "wildcat-mountain": {name:"Wildcat Mountain",state:"NH",region:"White Mountains",latitude:44.2589,longitude:-71.2392,website_url:"https://www.skiwildcat.com",passes:["epic"],operating_status:"active"},
  "crotched-mountain": {name:"Crotched Mountain",state:"NH",region:"Monadnock Region",latitude:42.9967,longitude:-71.8825,website_url:"https://www.crotchedmountain.com",passes:["epic"],operating_status:"active"},
  "mount-sunapee": {name:"Mount Sunapee",state:"NH",region:"Dartmouth-Lake Sunapee",latitude:43.3214,longitude:-72.0833,website_url:"https://www.mountsunapee.com",passes:["epic"],operating_status:"active"},
  "bretton-woods": {name:"Bretton Woods",state:"NH",region:"White Mountains",latitude:44.2581,longitude:-71.4642,website_url:"https://www.brettonwoods.com",passes:["ikon"],operating_status:"active"},
  "waterville-valley": {name:"Waterville Valley",state:"NH",region:"White Mountains",latitude:43.9514,longitude:-71.5142,website_url:"https://www.waterville.com",passes:["ikon"],operating_status:"active"},
  "pats-peak": {name:"Pat's Peak",state:"NH",region:"Merrimack Valley",latitude:43.1656,longitude:-71.7308,website_url:"https://www.patspeak.com",passes:["indy"],operating_status:"active"},
  "granite-gorge": {name:"Granite Gorge",state:"NH",region:"Monadnock Region",latitude:42.9519,longitude:-72.2147,website_url:"https://www.granitegorge.com",passes:["indy"],operating_status:"active"},
  "gunstock-mountain-resort": {name:"Gunstock Mountain Resort",state:"NH",region:"Lakes Region",latitude:43.5439,longitude:-71.3486,website_url:"https://www.gunstock.com",passes:["indy"],operating_status:"active"},
  "ragged-mountain": {name:"Ragged Mountain",state:"NH",region:"Dartmouth-Lake Sunapee",latitude:43.5089,longitude:-71.7867,website_url:"https://www.raggedmountainresort.com",passes:["indy"],operating_status:"active"},
  "black-mountain-nh": {name:"Black Mountain (NH)",state:"NH",region:"White Mountains",latitude:44.1714,longitude:-71.1417,website_url:"https://www.blackmt.com",passes:["indy"],operating_status:"active"},
  "dartmouth-skiway": {name:"Dartmouth Skiway",state:"NH",region:"Dartmouth-Lake Sunapee",latitude:43.7794,longitude:-72.0639,website_url:"https://www.skiway.dartmouth.edu",passes:["independent"],operating_status:"active"},
  "king-pine": {name:"King Pine",state:"NH",region:"White Mountains",latitude:43.8439,longitude:-71.0331,website_url:"https://www.kingpine.com",passes:["independent"],operating_status:"active"},
  "mcintyre-ski-area": {name:"McIntyre Ski Area",state:"NH",region:"Merrimack Valley",latitude:42.9978,longitude:-71.4639,website_url:"https://www.mcintyreskiarea.com",passes:["independent"],operating_status:"active"},
  "tenney-mountain": {name:"Tenney Mountain",state:"NH",region:"Lakes Region",latitude:43.7444,longitude:-71.7489,website_url:"https://www.tenneymtn.com",passes:["independent"],operating_status:"active"},
  "whaleback-mountain": {name:"Whaleback Mountain",state:"NH",region:"Dartmouth-Lake Sunapee",latitude:43.6347,longitude:-72.1858,website_url:"https://www.whaleback.com",passes:["independent"],operating_status:"active"},
  "campton-mountain": {name:"Campton Mountain",state:"NH",region:"White Mountains",latitude:43.8458,longitude:-71.6706,website_url:"https://www.camptonmountain.com",passes:["independent"],operating_status:"active"},
  "killington": {name:"Killington",state:"VT",region:"Greens",latitude:43.6044,longitude:-72.7864,website_url:"https://www.killington.com",passes:["ikon"],operating_status:"active"},
  "pico-mountain": {name:"Pico Mountain",state:"VT",region:"Greens",latitude:43.6628,longitude:-72.8350,website_url:"https://www.picomountain.com",passes:["ikon"],operating_status:"active"},
  "sugarbush": {name:"Sugarbush",state:"VT",region:"Greens",latitude:44.1356,longitude:-72.8939,website_url:"https://www.sugarbush.com",passes:["ikon"],operating_status:"active"},
  "stowe-mountain-resort": {name:"Stowe Mountain Resort",state:"VT",region:"Greens",latitude:44.5306,longitude:-72.7814,website_url:"https://www.stowe.com",passes:["epic"],operating_status:"active"},
  "jay-peak": {name:"Jay Peak",state:"VT",region:"Greens",latitude:44.9333,longitude:-72.5167,website_url:"https://www.jaypeakresort.com",passes:["indy"],operating_status:"active"},
  "smugglers-notch": {name:"Smugglers' Notch",state:"VT",region:"Greens",latitude:44.5683,longitude:-72.7958,website_url:"https://www.smuggs.com",passes:["indy"],operating_status:"active"},
  "bolton-valley": {name:"Bolton Valley",state:"VT",region:"Greens",latitude:44.4214,longitude:-72.8617,website_url:"https://www.boltonvalley.com",passes:["indy"],operating_status:"active"},
  "mad-river-glen": {name:"Mad River Glen",state:"VT",region:"Greens",latitude:44.2042,longitude:-72.9214,website_url:"https://www.madriverglen.com",passes:["indy"],operating_status:"active"},
  "burke-mountain": {name:"Burke Mountain",state:"VT",region:"Northeast Kingdom",latitude:44.5697,longitude:-71.8983,website_url:"https://www.skiburke.com",passes:["indy"],operating_status:"active"},
  "saskadena-six": {name:"Saskadena Six",state:"VT",region:"Greens",latitude:43.6608,longitude:-72.5550,website_url:"https://www.saskadenasix.com",passes:["indy"],operating_status:"active"},
  "middlebury-snow-bowl": {name:"Middlebury Snow Bowl",state:"VT",region:"Greens",latitude:43.9658,longitude:-72.9269,website_url:"https://www.middleburysnowbowl.com",passes:["indy"],operating_status:"active"},
  "ascutney-outdoors": {name:"Ascutney Outdoors",state:"VT",region:"Greens",latitude:43.4458,longitude:-72.4575,website_url:"https://www.ascutneyoutdoors.org",passes:["independent"],operating_status:"active"},
  "cochrans-ski-area": {name:"Cochran's Ski Area",state:"VT",region:"Greens",latitude:44.4453,longitude:-73.0058,website_url:"https://www.cochranskiarea.com",passes:["independent"],operating_status:"active"},
  "northeast-slopes": {name:"Northeast Slopes",state:"VT",region:"Greens",latitude:44.1283,longitude:-72.4042,website_url:"https://www.northeastslopes.org",passes:["independent"],operating_status:"active"},
  "lyndon-outing-club": {name:"Lyndon Outing Club",state:"VT",region:"Northeast Kingdom",latitude:44.5333,longitude:-72.0014,website_url:"https://www.lyndonoutingclub.org",passes:["independent"],operating_status:"active"},
  "quechee-club": {name:"Quechee Club",state:"VT",region:"Greens",latitude:43.6428,longitude:-72.4094,website_url:"https://www.quecheeclub.com",passes:["independent"],operating_status:"active"},
  "rikert-outdoor-center": {name:"Rikert Outdoor Center",state:"VT",region:"Greens",latitude:43.9483,longitude:-72.9633,website_url:"https://www.rikertoutdoor.com",passes:["independent"],operating_status:"active"},
  "holiday-mountain": {name:"Holiday Mountain",state:"NY",region:"Catskills",latitude:41.6386,longitude:-74.6611,website_url:"https://www.holidaymtn.com",passes:["indy"],operating_status:"active"},
  "west-mountain": {name:"West Mountain",state:"NY",region:"Adirondacks",latitude:43.2789,longitude:-73.7261,website_url:"https://www.westmtn.net",passes:["indy"],operating_status:"active"},
  "greek-peak": {name:"Greek Peak",state:"NY",region:"Central NY/Finger Lakes",latitude:42.5394,longitude:-76.1953,website_url:"https://www.greekpeak.net",passes:["indy"],operating_status:"active"},
  "holimont": {name:"HoliMont",state:"NY",region:"Western NY",latitude:42.2547,longitude:-78.6925,website_url:"https://www.holimont.com",passes:["indy"],operating_status:"active"},
  "snow-ridge": {name:"Snow Ridge",state:"NY",region:"Tug Hill",latitude:43.6314,longitude:-75.4683,website_url:"https://www.snowridge.com",passes:["indy"],operating_status:"active"},
  "holiday-valley": {name:"Holiday Valley",state:"NY",region:"Western NY",latitude:42.2517,longitude:-78.6539,website_url:"https://www.holidayvalley.com",passes:["indy"],operating_status:"active"},
  "bristol-mountain": {name:"Bristol Mountain",state:"NY",region:"Finger Lakes",latitude:42.7239,longitude:-77.4106,website_url:"https://www.bristolmountain.com",passes:["indy"],operating_status:"active"},
  "swain-resort": {name:"Swain Resort",state:"NY",region:"Western NY",latitude:42.4886,longitude:-77.7019,website_url:"https://www.swain.com",passes:["indy"],operating_status:"active"},
  "kissing-bridge": {name:"Kissing Bridge",state:"NY",region:"Western NY",latitude:42.6450,longitude:-78.6944,website_url:"https://www.kbski.com",passes:["independent"],operating_status:"active"},
  "peek-n-peak": {name:"Peek'n Peak",state:"NY",region:"Western NY",latitude:42.0764,longitude:-79.7022,website_url:"https://www.pknpk.com",passes:["independent"],operating_status:"active"},
  "song-mountain": {name:"Song Mountain",state:"NY",region:"Central NY/Finger Lakes",latitude:42.7631,longitude:-76.0844,website_url:"https://www.songmountain.com",passes:["independent"],operating_status:"active"},
  "labrador-mountain": {name:"Labrador Mountain",state:"NY",region:"Central NY/Finger Lakes",latitude:42.7969,longitude:-76.0119,website_url:"https://www.labradormtn.com",passes:["independent"],operating_status:"active"},
  "woods-valley": {name:"Woods Valley",state:"NY",region:"Central NY/Finger Lakes",latitude:43.3294,longitude:-75.4500,website_url:"https://www.woodsvalleyskiarea.com",passes:["independent"],operating_status:"active"},
  "mccauley-mountain": {name:"McCauley Mountain",state:"NY",region:"Adirondacks",latitude:43.6753,longitude:-74.9889,website_url:"https://www.mccauleyny.com",passes:["independent"],operating_status:"active"},
  "oak-mountain": {name:"Oak Mountain",state:"NY",region:"Adirondacks",latitude:43.4253,longitude:-74.4750,website_url:"https://www.oakmountainski.com",passes:["independent"],operating_status:"active"},
  "titus-mountain": {name:"Titus Mountain",state:"NY",region:"Adirondacks",latitude:44.7256,longitude:-74.4503,website_url:"https://www.titusmountain.com",passes:["independent"],operating_status:"active"},
  "willard-mountain": {name:"Willard Mountain",state:"NY",region:"Adirondacks",latitude:43.0961,longitude:-73.5328,website_url:"https://www.willardmountain.com",passes:["independent"],operating_status:"active"},
  "royal-mountain": {name:"Royal Mountain",state:"NY",region:"Adirondacks",latitude:43.1392,longitude:-74.4711,website_url:"https://www.royalmountain.com",passes:["independent"],operating_status:"active"},
  "buffalo-ski-club": {name:"Buffalo Ski Club",state:"NY",region:"Western NY",latitude:42.6750,longitude:-78.7158,website_url:"https://www.buffaloskiclub.com",passes:["independent"],operating_status:"active"},
  "victor-constant-ski-area": {name:"Victor Constant Ski Area",state:"NY",region:"Hudson Valley",latitude:41.4022,longitude:-73.9658,website_url:"https://www.westpointmwr.com",passes:["independent"],operating_status:"active"},
  "maple-ski-ridge": {name:"Maple Ski Ridge",state:"NY",region:"Capital District",latitude:42.8694,longitude:-74.0431,website_url:"https://www.mapleskiridge.com",passes:["independent"],operating_status:"active"},
  "liberty-mountain": {name:"Liberty Mountain",state:"PA",region:"South Mountain/Cumberland Valley",latitude:39.7750,longitude:-77.3061,website_url:"https://www.libertymountainresort.com",passes:["epic"],operating_status:"active"},
  "roundtop-mountain-resort": {name:"Roundtop Mountain Resort",state:"PA",region:"South Mountain/Cumberland Valley",latitude:40.1147,longitude:-76.8975,website_url:"https://www.skiroundtop.com",passes:["epic"],operating_status:"active"},
  "whitetail-resort": {name:"Whitetail Resort",state:"PA",region:"South Mountain/Cumberland Valley",latitude:39.7900,longitude:-77.6961,website_url:"https://www.skiwhitetail.com",passes:["epic"],operating_status:"active"},
  "seven-springs": {name:"Seven Springs Mountain Resort",state:"PA",region:"Laurel Highlands",latitude:40.0203,longitude:-79.2961,website_url:"https://www.7springs.com",passes:["epic"],operating_status:"active"},
  "hidden-valley": {name:"Hidden Valley (PA)",state:"PA",region:"Laurel Highlands",latitude:40.0581,longitude:-79.3722,website_url:"https://www.hiddenvalleyresort.com",passes:["epic"],operating_status:"active"},
  "laurel-mountain": {name:"Laurel Mountain",state:"PA",region:"Laurel Highlands",latitude:40.1894,longitude:-79.1678,website_url:"https://www.laurelmountainski.com",passes:["epic"],operating_status:"active"},
  "blue-knob": {name:"Blue Knob All Seasons Resort",state:"PA",region:"Allegheny Mountains",latitude:40.2825,longitude:-78.5764,website_url:"https://www.blueknob.com",passes:["independent"],operating_status:"active"},
  "tussey-mountain": {name:"Tussey Mountain",state:"PA",region:"Allegheny Mountains",latitude:40.7658,longitude:-77.7544,website_url:"https://www.tusseymountain.com",passes:["independent"],operating_status:"active"},
  "bear-creek-mountain-resort": {name:"Bear Creek Mountain Resort",state:"PA",region:"Pocono Mountains",latitude:40.4769,longitude:-75.6925,website_url:"https://www.bcmountainresort.com",passes:["independent"],operating_status:"active"},
  "spring-mountain": {name:"Spring Mountain",state:"PA",region:"Greater Philadelphia",latitude:40.2647,longitude:-75.4683,website_url:"https://www.springmountainadventures.com",passes:["independent"],operating_status:"active"},
  "ski-sawmill": {name:"Ski Sawmill",state:"PA",region:"Northern Tier",latitude:41.5056,longitude:-77.3461,website_url:"https://www.skisawmill.com",passes:["independent"],operating_status:"active"},
  "eagle-rock-resort": {name:"Eagle Rock Resort",state:"PA",region:"Pocono Mountains",latitude:41.0144,longitude:-76.0456,website_url:"https://www.eaglerockresort.com",passes:["independent"],operating_status:"active"},
  "mystic-mountain": {name:"Mystic Mountain",state:"PA",region:"Laurel Highlands",latitude:39.8417,longitude:-79.5928,website_url:"https://www.nemacolin.com",passes:["independent"],operating_status:"active"},
};

// ============================================================================
// Agent D — Midwest (MI, WI, MN, IA, IL, IN, OH, MO, ND, SD)
// ============================================================================
const midwest = {
  "boyne-mountain": {name:"Boyne Mountain Resort",state:"MI",region:"Northern Michigan",latitude:45.1745,longitude:-84.9322,website_url:"https://www.boynemountain.com",passes:["ikon"],operating_status:"active"},
  "the-highlands": {name:"The Highlands (Boyne Highlands)",state:"MI",region:"Northern Michigan",latitude:45.4564,longitude:-84.9336,website_url:"https://www.highlandsatharborsprings.com",passes:["ikon"],operating_status:"active"},
  "mt-brighton": {name:"Mt. Brighton",state:"MI",region:"Southeast Michigan",latitude:42.5292,longitude:-83.8044,website_url:"https://www.mtbrighton.com",passes:["epic"],operating_status:"active"},
  "mount-bohemia": {name:"Mount Bohemia",state:"MI",region:"Upper Peninsula",latitude:47.3839,longitude:-88.0119,website_url:"https://www.mtbohemia.com",passes:["indy"],operating_status:"active"},
  "indianhead-mountain": {name:"Indianhead Mountain",state:"MI",region:"Upper Peninsula",latitude:46.5103,longitude:-90.0475,website_url:"https://www.indianheadmtn.com",passes:["indy"],operating_status:"active"},
  "blackjack-mountain": {name:"Blackjack Mountain",state:"MI",region:"Upper Peninsula",latitude:46.4992,longitude:-90.0769,website_url:"https://www.skiblackjack.com",passes:["indy"],operating_status:"active"},
  "big-powderhorn-mountain": {name:"Big Powderhorn Mountain",state:"MI",region:"Upper Peninsula",latitude:46.5161,longitude:-90.0500,website_url:"https://www.bigpowderhorn.net",passes:["independent"],operating_status:"active"},
  "porcupine-mountains": {name:"Porcupine Mountains Ski Area",state:"MI",region:"Upper Peninsula",latitude:46.7644,longitude:-89.7956,website_url:"https://www.porkiesfun.com",passes:["independent"],operating_status:"active"},
  "ski-brule": {name:"Ski Brule",state:"MI",region:"Upper Peninsula",latitude:46.0606,longitude:-88.6353,website_url:"https://www.skibrule.com",passes:["independent"],operating_status:"active"},
  "marquette-mountain": {name:"Marquette Mountain",state:"MI",region:"Upper Peninsula",latitude:46.5197,longitude:-87.4361,website_url:"https://www.marquettemountain.com",passes:["independent"],operating_status:"active"},
  "mont-ripley": {name:"Mont Ripley",state:"MI",region:"Upper Peninsula",latitude:47.1264,longitude:-88.5547,website_url:"https://www.mtu.edu/mont-ripley",passes:["independent"],operating_status:"active"},
  "pine-mountain": {name:"Pine Mountain Resort",state:"MI",region:"Upper Peninsula",latitude:45.8278,longitude:-88.0697,website_url:"https://www.pinemountainresort.com",passes:["independent"],operating_status:"active"},
  "norway-mountain": {name:"Norway Mountain",state:"MI",region:"Upper Peninsula",latitude:45.7889,longitude:-87.9011,website_url:"https://www.norwaymountain.com",passes:["independent"],operating_status:"active"},
  "crystal-mountain__MI": {name:"Crystal Mountain (MI)",state:"MI",region:"Northern Michigan",latitude:44.5217,longitude:-86.0744,website_url:"https://www.crystalmountain.com",passes:["independent"],operating_status:"active"},
  "shanty-creek": {name:"Shanty Creek Resorts",state:"MI",region:"Northern Michigan",latitude:44.9786,longitude:-85.1922,website_url:"https://www.shantycreek.com",passes:["independent"],operating_status:"active"},
  "nubs-nob": {name:"Nub's Nob",state:"MI",region:"Northern Michigan",latitude:45.4764,longitude:-84.9244,website_url:"https://www.nubsnob.com",passes:["independent"],operating_status:"active"},
  "treetops-resort": {name:"Treetops Resort",state:"MI",region:"Northern Michigan",latitude:45.0628,longitude:-84.6450,website_url:"https://www.treetops.com",passes:["independent"],operating_status:"active"},
  "caberfae-peaks": {name:"Caberfae Peaks",state:"MI",region:"Northern Michigan",latitude:44.2658,longitude:-85.6886,website_url:"https://www.caberfaepeaks.com",passes:["independent"],operating_status:"active"},
  "homestead-resort": {name:"The Homestead",state:"MI",region:"Northern Michigan",latitude:44.8939,longitude:-86.0419,website_url:"https://www.thehomesteadresort.com",passes:["independent"],operating_status:"active"},
  "mount-holly": {name:"Mt. Holly",state:"MI",region:"Southeast Michigan",latitude:42.7669,longitude:-83.5283,website_url:"https://www.skimtholly.com",passes:["independent"],operating_status:"active"},
  "pine-knob": {name:"Pine Knob",state:"MI",region:"Southeast Michigan",latitude:42.7519,longitude:-83.4011,website_url:"https://www.pineknobskiresort.com",passes:["independent"],operating_status:"active"},
  "alpine-valley-mi": {name:"Alpine Valley Ski Area (MI)",state:"MI",region:"Southeast Michigan",latitude:42.6722,longitude:-83.5583,website_url:"https://www.skialpinevalley.com",passes:["independent"],operating_status:"active"},
  "snow-snake": {name:"Snow Snake Mountain",state:"MI",region:"Central Michigan",latitude:43.9606,longitude:-84.7867,website_url:"https://www.snowsnake.net",passes:["independent"],operating_status:"active"},
  "apple-mountain": {name:"Apple Mountain",state:"MI",region:"Central Michigan",latitude:43.4500,longitude:-84.1264,website_url:"https://www.applemountain.com",passes:["independent"],operating_status:"active"},
  "bittersweet-ski-resort": {name:"Bittersweet Ski Resort",state:"MI",region:"Southwest Michigan",latitude:42.4536,longitude:-85.7906,website_url:"https://www.skibittersweet.com",passes:["independent"],operating_status:"active"},
  "cannonsburg": {name:"Cannonsburg Ski Area",state:"MI",region:"West Michigan",latitude:43.0617,longitude:-85.4583,website_url:"https://www.cannonsburg.com",passes:["independent"],operating_status:"active"},
  "timber-ridge": {name:"Timber Ridge Ski Area",state:"MI",region:"Southwest Michigan",latitude:42.3097,longitude:-85.7875,website_url:"https://www.skitimberridge.com",passes:["independent"],operating_status:"active"},
  "swiss-valley": {name:"Swiss Valley Ski & Snowboard Area",state:"MI",region:"Southwest Michigan",latitude:42.0244,longitude:-85.7350,website_url:"https://www.skiswissvalley.com",passes:["independent"],operating_status:"active"},
  "otsego-resort": {name:"Otsego Resort",state:"MI",region:"Northern Michigan",latitude:45.0469,longitude:-84.6650,website_url:"https://www.otsegoresort.com",passes:["independent"],operating_status:"active"},
  "granite-peak": {name:"Granite Peak Ski Area",state:"WI",region:"Central Wisconsin",latitude:44.8528,longitude:-89.6394,website_url:"https://www.skigranitepeak.com",passes:["indy"],operating_status:"active"},
  "wilmot-mountain": {name:"Wilmot Mountain",state:"WI",region:"Southeast Wisconsin",latitude:42.5025,longitude:-88.1939,website_url:"https://www.wilmotmountain.com",passes:["epic"],operating_status:"active"},
  "trollhaugen": {name:"Trollhaugen",state:"WI",region:"Northwest Wisconsin",latitude:45.3478,longitude:-92.5497,website_url:"https://www.trollhaugen.com",passes:["indy"],operating_status:"active"},
  "whitecap-mountains": {name:"Whitecap Mountains",state:"WI",region:"Northwoods Wisconsin",latitude:46.4642,longitude:-90.4022,website_url:"https://www.skiwhitecap.com",passes:["indy"],operating_status:"active"},
  "cascade-mountain": {name:"Cascade Mountain",state:"WI",region:"Southern Wisconsin",latitude:43.6036,longitude:-89.4267,website_url:"https://www.cascademountain.com",passes:["independent"],operating_status:"active"},
  "devils-head": {name:"Devil's Head Resort",state:"WI",region:"Southern Wisconsin",latitude:43.4039,longitude:-89.6953,website_url:"https://www.devilsheadresort.com",passes:["independent"],operating_status:"active"},
  "tyrol-basin": {name:"Tyrol Basin",state:"WI",region:"Southern Wisconsin",latitude:43.0931,longitude:-89.7019,website_url:"https://www.tyrolbasin.com",passes:["independent"],operating_status:"active"},
  "alpine-valley-wi": {name:"Alpine Valley Resort (WI)",state:"WI",region:"Southeast Wisconsin",latitude:42.7164,longitude:-88.4253,website_url:"https://www.alpinevalleyresort.com",passes:["independent"],operating_status:"active"},
  "little-switzerland": {name:"Little Switzerland",state:"WI",region:"Southeast Wisconsin",latitude:43.2358,longitude:-88.2908,website_url:"https://www.littleswitz.com",passes:["independent"],operating_status:"active"},
  "the-rock-snowpark": {name:"The Rock Snowpark",state:"WI",region:"Southeast Wisconsin",latitude:42.9342,longitude:-87.9514,website_url:"https://www.therocksnowpark.com",passes:["independent"],operating_status:"active"},
  "sunburst": {name:"Sunburst",state:"WI",region:"Southeast Wisconsin",latitude:43.4467,longitude:-88.2089,website_url:"https://www.skisunburst.com",passes:["independent"],operating_status:"active"},
  "nordic-mountain": {name:"Nordic Mountain",state:"WI",region:"Central Wisconsin",latitude:44.2064,longitude:-89.2325,website_url:"https://www.nordicmountain.com",passes:["independent"],operating_status:"active"},
  "christmas-mountain": {name:"Christmas Mountain Village",state:"WI",region:"Wisconsin Dells",latitude:43.6731,longitude:-89.9008,website_url:"https://www.christmasmountainvillage.com",passes:["independent"],operating_status:"active"},
  "mount-la-crosse": {name:"Mount La Crosse",state:"WI",region:"Western Wisconsin",latitude:43.7503,longitude:-91.2192,website_url:"https://www.mtlacrosse.com",passes:["independent"],operating_status:"active"},
  "mount-ashwabay": {name:"Mt. Ashwabay",state:"WI",region:"Northwoods Wisconsin",latitude:46.7822,longitude:-90.8392,website_url:"https://www.mtashwabay.org",passes:["independent"],operating_status:"active"},
  "lutsen-mountains": {name:"Lutsen Mountains",state:"MN",region:"North Shore Minnesota",latitude:47.6553,longitude:-90.7256,website_url:"https://www.lutsen.com",passes:["indy"],operating_status:"active"},
  "spirit-mountain": {name:"Spirit Mountain",state:"MN",region:"Duluth Area",latitude:46.7167,longitude:-92.2225,website_url:"https://www.spiritmt.com",passes:["indy"],operating_status:"active"},
  "afton-alps": {name:"Afton Alps",state:"MN",region:"Twin Cities Metro",latitude:44.8506,longitude:-92.7847,website_url:"https://www.aftonalps.com",passes:["epic"],operating_status:"active"},
  "welch-village": {name:"Welch Village",state:"MN",region:"Southern Minnesota",latitude:44.5631,longitude:-92.7339,website_url:"https://www.welchvillage.com",passes:["indy"],operating_status:"active"},
  "buck-hill": {name:"Buck Hill",state:"MN",region:"Twin Cities Metro",latitude:44.6739,longitude:-93.2786,website_url:"https://www.buckhill.com",passes:["indy"],operating_status:"active"},
  "hyland-hills": {name:"Hyland Hills Ski Area",state:"MN",region:"Twin Cities Metro",latitude:44.8517,longitude:-93.3933,website_url:"https://www.threeriversparks.org",passes:["independent"],operating_status:"active"},
  "detroit-mountain": {name:"Detroit Mountain Recreation Area",state:"MN",region:"Northwest Minnesota",latitude:46.8444,longitude:-95.7950,website_url:"https://www.detroitmountain.com",passes:["indy"],operating_status:"active"},
  "mount-kato": {name:"Mount Kato",state:"MN",region:"Southern Minnesota",latitude:44.1264,longitude:-94.0744,website_url:"https://www.mountkato.com",passes:["independent"],operating_status:"active"},
  "powder-ridge": {name:"Powder Ridge Winter Recreation Area",state:"MN",region:"Central Minnesota",latitude:45.5283,longitude:-94.1319,website_url:"https://www.powderridge.com",passes:["indy"],operating_status:"active"},
  "andes-tower-hills": {name:"Andes Tower Hills",state:"MN",region:"Central Minnesota",latitude:45.8772,longitude:-95.3208,website_url:"https://www.andestowerhills.com",passes:["independent"],operating_status:"active"},
  "giants-ridge": {name:"Giants Ridge",state:"MN",region:"Iron Range MN",latitude:47.5614,longitude:-92.2294,website_url:"https://www.giantsridge.com",passes:["indy"],operating_status:"active"},
  "wild-mountain": {name:"Wild Mountain",state:"MN",region:"Twin Cities Area",latitude:45.4869,longitude:-92.6386,website_url:"https://www.wildmountain.com",passes:["independent"],operating_status:"active"},
  "ski-gull": {name:"Ski Gull",state:"MN",region:"Central Minnesota",latitude:46.4181,longitude:-94.3886,website_url:"https://www.skigull.com",passes:["independent"],operating_status:"active"},
  "mount-itasca": {name:"Mount Itasca",state:"MN",region:"Northern Minnesota",latitude:47.2425,longitude:-93.5014,website_url:"https://www.mountitasca.com",passes:["independent"],operating_status:"active"},
  "buena-vista": {name:"Buena Vista Ski Area",state:"MN",region:"Northwest Minnesota",latitude:47.6047,longitude:-94.8964,website_url:"https://www.bvskiarea.com",passes:["independent"],operating_status:"active"},
  "sundown-mountain": {name:"Sundown Mountain",state:"IA",region:"Eastern Iowa",latitude:42.5419,longitude:-90.7475,website_url:"https://www.sundownmtn.com",passes:["independent"],operating_status:"active"},
  "seven-oaks": {name:"Seven Oaks Recreation",state:"IA",region:"Central Iowa",latitude:41.7642,longitude:-94.0381,website_url:"https://www.sevenoaksrec.com",passes:["independent"],operating_status:"active"},
  "sleepy-hollow": {name:"Sleepy Hollow Sports Park",state:"IA",region:"Central Iowa",latitude:41.6483,longitude:-93.5306,website_url:"https://www.sleepyhollowsportspark.com",passes:["independent"],operating_status:"active"},
  "mt-crescent": {name:"Mt. Crescent Ski Area",state:"IA",region:"Western Iowa",latitude:41.4358,longitude:-95.8358,website_url:"https://www.skicrescent.com",passes:["independent"],operating_status:"active"},
  "chestnut-mountain": {name:"Chestnut Mountain Resort",state:"IL",region:"Northwest Illinois",latitude:42.4361,longitude:-90.3636,website_url:"https://www.chestnutmtn.com",passes:["independent"],operating_status:"active"},
  "four-lakes": {name:"Four Lakes Alpine Snowsports",state:"IL",region:"Northern Illinois",latitude:41.8456,longitude:-88.0956,website_url:"https://www.fourlakesskiarea.com",passes:["independent"],operating_status:"active"},
  "villa-olivia": {name:"Villa Olivia",state:"IL",region:"Northern Illinois",latitude:41.9858,longitude:-88.2086,website_url:"https://www.villaolivia.com",passes:["independent"],operating_status:"active"},
  "snowstar": {name:"Snowstar Winter Park",state:"IL",region:"Western Illinois",latitude:41.4011,longitude:-90.5933,website_url:"https://www.snowstarpark.com",passes:["independent"],operating_status:"active"},
  "perfect-north": {name:"Perfect North Slopes",state:"IN",region:"Southeast Indiana",latitude:39.1389,longitude:-84.9417,website_url:"https://www.perfectnorth.com",passes:["independent"],operating_status:"active"},
  "paoli-peaks": {name:"Paoli Peaks",state:"IN",region:"Southern Indiana",latitude:38.5519,longitude:-86.4275,website_url:"https://www.paolipeaks.com",passes:["independent"],operating_status:"active"},
  "boston-mills": {name:"Boston Mills Ski Resort",state:"OH",region:"Northeast Ohio",latitude:41.2697,longitude:-81.5772,website_url:"https://www.bmbw.com",passes:["epic"],operating_status:"active"},
  "brandywine": {name:"Brandywine Ski Resort",state:"OH",region:"Northeast Ohio",latitude:41.2811,longitude:-81.5414,website_url:"https://www.bmbw.com",passes:["epic"],operating_status:"active"},
  "alpine-valley-oh": {name:"Alpine Valley Ski Area (OH)",state:"OH",region:"Northeast Ohio",latitude:41.4514,longitude:-81.1422,website_url:"https://www.alpinevalleyohio.com",passes:["epic"],operating_status:"active"},
  "mad-river-mountain": {name:"Mad River Mountain",state:"OH",region:"Central Ohio",latitude:40.4361,longitude:-83.5519,website_url:"https://www.skimadriver.com",passes:["indy"],operating_status:"active"},
  "snow-trails": {name:"Snow Trails",state:"OH",region:"Central Ohio",latitude:40.6794,longitude:-82.5278,website_url:"https://www.snowtrails.com",passes:["independent"],operating_status:"active"},
  "hidden-valley-mo": {name:"Hidden Valley Ski Resort (MO)",state:"MO",region:"Eastern Missouri",latitude:38.5258,longitude:-90.6622,website_url:"https://www.hiddenvalleyski.com",passes:["epic"],operating_status:"active"},
  "snow-creek": {name:"Snow Creek",state:"MO",region:"Western Missouri",latitude:39.4892,longitude:-94.9519,website_url:"https://www.skisnowcreek.com",passes:["epic"],operating_status:"active"},
  "frost-fire-park": {name:"Frost Fire Park",state:"ND",region:"Northeast North Dakota",latitude:48.7325,longitude:-97.9094,website_url:"https://www.frostfirepark.org",passes:["independent"],operating_status:"active"},
  "huff-hills": {name:"Huff Hills Ski Area",state:"ND",region:"Central North Dakota",latitude:46.5783,longitude:-100.6747,website_url:"https://www.huffhills.com",passes:["independent"],operating_status:"active"},
  "bottineau-winter-park": {name:"Bottineau Winter Park",state:"ND",region:"Northern North Dakota",latitude:48.9217,longitude:-100.4506,website_url:"https://www.skibwp.com",passes:["independent"],operating_status:"active"},
  "terry-peak": {name:"Terry Peak Ski Area",state:"SD",region:"Black Hills SD",latitude:44.3331,longitude:-103.8231,website_url:"https://www.terrypeak.com",passes:["indy"],operating_status:"active"},
  "great-bear": {name:"Great Bear Recreation Park",state:"SD",region:"Eastern South Dakota",latitude:43.5719,longitude:-96.6536,website_url:"https://www.greatbearpark.com",passes:["independent"],operating_status:"active"},
};

// ============================================================================
// Agent E — Mid-Atlantic + South + remaining NJ/MA/CT
// ============================================================================
const midAtlanticSouth = {
  "wisp-resort": {name:"Wisp Resort",state:"MD",region:"Allegheny Mountains",latitude:39.5667,longitude:-79.3667,website_url:"https://www.wispresort.com",passes:["indy"],operating_status:"active"},
  "bryce-resort": {name:"Bryce Resort",state:"VA",region:"Shenandoah Valley",latitude:38.8243,longitude:-78.7681,website_url:"https://www.bryceresort.com",passes:["indy"],operating_status:"active"},
  "massanutten-resort": {name:"Massanutten Resort",state:"VA",region:"Blue Ridge",latitude:38.4137,longitude:-78.7569,website_url:"https://www.massresort.com",passes:["indy"],operating_status:"active"},
  "the-omni-homestead-resort": {name:"The Omni Homestead Resort",state:"VA",region:"Allegheny Mountains",latitude:37.9985,longitude:-79.8336,website_url:"https://www.omnihotels.com/hotels/homestead-virginia",passes:["independent"],operating_status:"active"},
  "wintergreen-resort": {name:"Wintergreen Resort",state:"VA",region:"Blue Ridge",latitude:37.9075,longitude:-78.9558,website_url:"https://www.wintergreenresort.com",passes:["indy"],operating_status:"active"},
  "canaan-valley-resort": {name:"Canaan Valley Resort",state:"WV",region:"Allegheny Mountains",latitude:39.0567,longitude:-79.4583,website_url:"https://canaanresort.com",passes:["indy"],operating_status:"active"},
  "oglebay-resort": {name:"Oglebay Resort",state:"WV",region:"Northern Panhandle",latitude:40.0989,longitude:-80.6647,website_url:"https://oglebay.com",passes:["independent"],operating_status:"active"},
  "snowshoe-mountain": {name:"Snowshoe Mountain",state:"WV",region:"Allegheny Mountains",latitude:38.4083,longitude:-79.9928,website_url:"https://www.snowshoemtn.com",passes:["ikon"],operating_status:"active"},
  "timberline-mountain": {name:"Timberline Mountain",state:"WV",region:"Allegheny Mountains",latitude:39.0742,longitude:-79.4889,website_url:"https://timberlinemountain.com",passes:["independent"],operating_status:"active"},
  "winterplace-ski-resort": {name:"Winterplace Ski Resort",state:"WV",region:"Appalachian Mountains",latitude:37.5556,longitude:-81.1361,website_url:"https://www.winterplace.com",passes:["indy"],operating_status:"active"},
  "ober-mountain": {name:"Ober Mountain",state:"TN",region:"Smoky Mountains",latitude:35.7050,longitude:-83.5083,website_url:"https://www.obermountain.com",passes:["indy"],operating_status:"active"},
  "appalachian-ski-mountain": {name:"Appalachian Ski Mountain",state:"NC",region:"Blue Ridge",latitude:36.1853,longitude:-81.6722,website_url:"https://www.appskimtn.com",passes:["independent"],operating_status:"active"},
  "cataloochee-ski-area": {name:"Cataloochee Ski Area",state:"NC",region:"Smoky Mountains",latitude:35.5650,longitude:-83.1158,website_url:"https://cataloochee.com",passes:["indy"],operating_status:"active"},
  "sapphire-valley-resort": {name:"Sapphire Valley Resort",state:"NC",region:"Blue Ridge",latitude:35.1056,longitude:-83.0889,website_url:"https://www.skisapphire.com",passes:["independent"],operating_status:"active"},
  "beech-mountain-resort": {name:"Beech Mountain Resort",state:"NC",region:"Blue Ridge",latitude:36.2017,longitude:-81.8853,website_url:"https://www.beechmountainresort.com",passes:["independent"],operating_status:"active"},
  "sugar-mountain-resort": {name:"Sugar Mountain Resort",state:"NC",region:"Blue Ridge",latitude:36.1342,longitude:-81.8722,website_url:"https://www.skisugar.com",passes:["independent"],operating_status:"active"},
  "hatley-pointe": {name:"Hatley Pointe",state:"NC",region:"Blue Ridge",latitude:35.9650,longitude:-82.5583,website_url:"https://hatleypointe.com",passes:["indy"],operating_status:"active"},
  "cloudmont-ski-resort": {name:"Cloudmont Ski Resort",state:"AL",region:"Lookout Mountain",latitude:34.5418,longitude:-85.6050,website_url:"https://ww1.cloudmont.com",passes:["independent"],operating_status:"seasonal"},
  "powder-ridge-mountain-park": {name:"Powder Ridge Mountain Park & Resort",state:"CT",region:"Central Connecticut",latitude:41.5208,longitude:-72.7264,website_url:"https://powderridgepark.com",passes:["independent"],operating_status:"active"},
  "ski-sundown": {name:"Ski Sundown",state:"CT",region:"Litchfield Hills",latitude:41.8714,longitude:-72.9319,website_url:"https://www.skisundown.com",passes:["independent"],operating_status:"active"},
  "blue-hills-ski-area": {name:"Blue Hills Ski Area",state:"MA",region:"Greater Boston",latitude:42.2114,longitude:-71.0931,website_url:"https://www.bluehillsboston.com",passes:["independent"],operating_status:"active"},
  "bousquet-mountain": {name:"Bousquet Mountain",state:"MA",region:"Berkshires",latitude:42.4161,longitude:-73.2864,website_url:"https://bousquetmountain.com",passes:["indy"],operating_status:"active"},
  "ski-butternut": {name:"Ski Butternut",state:"MA",region:"Berkshires",latitude:42.1900,longitude:-73.3194,website_url:"https://www.skibutternut.com",passes:["independent"],operating_status:"active"},
  "nashoba-valley-ski-area": {name:"Nashoba Valley Ski Area",state:"MA",region:"Greater Boston",latitude:42.5703,longitude:-71.4561,website_url:"https://skinashoba.com",passes:["independent"],operating_status:"active"},
  "otis-ridge": {name:"Otis Ridge",state:"MA",region:"Berkshires",latitude:42.1928,longitude:-73.0792,website_url:"https://otisridge.com",passes:["independent"],operating_status:"active"},
  "ski-bradford": {name:"Ski Bradford",state:"MA",region:"Greater Boston",latitude:42.7472,longitude:-71.0786,website_url:"https://skibradford.com",passes:["independent"],operating_status:"active"},
  "ski-ward": {name:"Ski Ward",state:"MA",region:"Central Massachusetts",latitude:42.2961,longitude:-71.7261,website_url:"https://www.skiward.com",passes:["independent"],operating_status:"active"},
  "big-snow-american-dream": {name:"Big Snow American Dream",state:"NJ",region:"Meadowlands",latitude:40.8136,longitude:-74.0719,website_url:"https://www.bigsnowamericandream.com",passes:["independent"],operating_status:"active"},
  "campgaw-mountain": {name:"Campgaw Mountain",state:"NJ",region:"Northern New Jersey",latitude:41.0489,longitude:-74.1617,website_url:"https://www.skicampgaw.com",passes:["independent"],operating_status:"active"},
};

// ============================================================================
// Aggregate, dedupe, apply slug overrides, build SQL
// ============================================================================
const all = { ...mountainWest, ...pacificSouthwest, ...northeastRemainder, ...midwest, ...midAtlanticSouth };

const final = {};
const skipped = [];
const renamed = [];

for (const [rawSlug, data] of Object.entries(all)) {
  const slug = SLUG_OVERRIDES[rawSlug] ?? rawSlug;
  if (rawSlug !== slug) renamed.push(`${rawSlug} -> ${slug}`);
  if (EXISTING_SLUGS.has(slug)) {
    skipped.push(`${slug} (already in DB)`);
    continue;
  }
  if (final[slug]) {
    skipped.push(`${slug} (duplicate within agent outputs — keeping first)`);
    continue;
  }
  final[slug] = data;
}

const sqlEscape = (v) => v == null ? "NULL" : `'${String(v).replaceAll("'", "''")}'`;
const sqlArr = (arr) => `ARRAY[${arr.map((s) => `'${s}'`).join(",")}]::TEXT[]`;

const lines = [
  `-- Stage 2 bulk import: ${Object.keys(final).length} listed-tier US ski resorts`,
  `-- Researched 2026-05-02 via 5 parallel general-purpose agents.`,
  `-- All marked tier='listed' and operating_status from agent output.`,
  `-- Re-runnable thanks to ON CONFLICT DO NOTHING on the unique slug.`,
  ``,
  `INSERT INTO resorts (`,
  `  slug, name, state, region, latitude, longitude,`,
  `  passes, website_url, operating_status, tier, active`,
  `) VALUES`,
];

const valueRows = Object.entries(final).map(([slug, r]) => {
  return `  (${sqlEscape(slug)}, ${sqlEscape(r.name)}, ${sqlEscape(r.state)}, ${sqlEscape(r.region)}, ${r.latitude ?? "NULL"}, ${r.longitude ?? "NULL"}, ${sqlArr(r.passes ?? ["independent"])}, ${sqlEscape(r.website_url)}, ${sqlEscape(r.operating_status ?? "active")}, 'listed', true)`;
});

lines.push(valueRows.join(",\n") + "\nON CONFLICT (slug) DO NOTHING;");
lines.push("");
lines.push("-- Verify");
lines.push("SELECT tier, COUNT(*) FROM resorts GROUP BY tier;");
lines.push("SELECT state, COUNT(*) FROM resorts WHERE tier='listed' GROUP BY state ORDER BY COUNT(*) DESC, state;");
lines.push("SELECT operating_status, COUNT(*) FROM resorts GROUP BY operating_status;");

writeFileSync("data/seed_resorts_listed.sql", lines.join("\n") + "\n");

console.error(`Wrote data/seed_resorts_listed.sql`);
console.error(`  inserted: ${Object.keys(final).length}`);
console.error(`  skipped: ${skipped.length} (${skipped.slice(0, 5).join(", ")}${skipped.length > 5 ? ", ..." : ""})`);
console.error(`  renamed: ${renamed.length} (${renamed.join(", ")})`);

// State distribution
const byState = {};
for (const r of Object.values(final)) byState[r.state] = (byState[r.state] ?? 0) + 1;
const stateList = Object.entries(byState).sort(([, a], [, b]) => b - a);
console.error(`\nBy state:`);
for (const [s, n] of stateList) console.error(`  ${s.padEnd(3)} ${n}`);
console.error(`Total states: ${stateList.length}`);
