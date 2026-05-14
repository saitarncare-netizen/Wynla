// Pre-made trip templates surfaced on /trip-templates. Each template
// has an origin city, a list of resort slugs in order, and the day
// count to spend at each. When a user opens /trip-templates/[slug] and
// taps "Customize and save", they're sent to the planner with
// ?plan=1&template=<slug>, which TripPlannerPanel hydrates from.
//
// Slugs verified against the resorts table on 2026-05-14 — see
// substitutions noted inline where the obvious short slug didn't
// match (e.g. "loon" → "loon-mountain").

export type TripTemplateOrigin = {
  /** City origin code matching ORIGINS in lib/origins.ts, OR a custom
      lat/lng. Templates can use cities that aren't in the city picker
      yet — the planner reads the explicit lat/lng so this still works. */
  code: string;
  name: string;
  short: string;
  lat: number;
  lon: number;
};

export type TripTemplate = {
  slug: string;
  title: string;
  description: string;
  origin: TripTemplateOrigin;
  resortSlugs: string[];
  daysPerResort: number[];
  bestFor: string;
};

// Cities used by templates. NYC / Boston already exist in lib/origins.ts;
// the others (Denver, SLC, Reno, Bozeman) are custom origins the
// templates carry inline so we don't have to expand the global origin
// list for a directory feature.
const ORIGIN_NYC: TripTemplateOrigin = {
  code: "nyc",
  name: "NYC",
  short: "NYC",
  lat: 40.7128,
  lon: -74.006,
};
const ORIGIN_BOSTON: TripTemplateOrigin = {
  code: "boston",
  name: "Boston",
  short: "Boston",
  lat: 42.3601,
  lon: -71.0589,
};
const ORIGIN_DENVER: TripTemplateOrigin = {
  code: "denver",
  name: "Denver",
  short: "Denver",
  lat: 39.7392,
  lon: -104.9903,
};
const ORIGIN_SLC: TripTemplateOrigin = {
  code: "slc",
  name: "Salt Lake City",
  short: "SLC",
  lat: 40.7608,
  lon: -111.891,
};
const ORIGIN_RENO: TripTemplateOrigin = {
  code: "reno",
  name: "Reno",
  short: "Reno",
  lat: 39.5296,
  lon: -119.8138,
};
const ORIGIN_BOZEMAN: TripTemplateOrigin = {
  code: "bozeman",
  name: "Bozeman",
  short: "Bozeman",
  lat: 45.6770,
  lon: -111.0429,
};

export const TEMPLATES: TripTemplate[] = [
  {
    slug: "co-front-range-weekend",
    title: "Colorado Front Range Weekend",
    description:
      "Five days of varied I-70 terrain — bowls, beginner runs, and Loveland's no-frills locals' favorite.",
    origin: ORIGIN_DENVER,
    resortSlugs: ["winter-park", "copper-mountain", "loveland"],
    daysPerResort: [2, 2, 1],
    bestFor: "Day-trippers from Denver who want three different mountains in one trip.",
  },
  {
    slug: "utah-cottonwoods-5-day",
    title: "Utah Cottonwoods 5-Day",
    description:
      "The deepest powder in North America — Snowbird, Alta, and Brighton, all under an hour from the airport.",
    origin: ORIGIN_SLC,
    resortSlugs: ["snowbird", "alta", "brighton"],
    daysPerResort: [2, 2, 1],
    bestFor: "Powder hounds — Cottonwoods average 500+ inches a season.",
  },
  {
    slug: "vermont-powder-hunt",
    title: "Vermont Powder Hunt",
    // stowe → stowe-mountain-resort, full slug in DB
    description:
      "Classic New England — Stowe's icy steeps, Killington's vert, and Sugarbush's quiet glades.",
    origin: ORIGIN_BOSTON,
    resortSlugs: ["stowe-mountain-resort", "killington", "sugarbush"],
    daysPerResort: [2, 1, 1],
    bestFor: "East-coasters chasing the biggest snow totals on this side of the Rockies.",
  },
  {
    slug: "new-hampshire-quick-trip",
    title: "New Hampshire Quick Trip",
    // loon → loon-mountain; cannon → cannon-mountain (DB slugs)
    description:
      "Three resorts, three days, two hours apart — the easiest White Mountains weekend you can plan.",
    origin: ORIGIN_BOSTON,
    resortSlugs: ["loon-mountain", "cannon-mountain", "bretton-woods"],
    daysPerResort: [1, 1, 1],
    bestFor: "Weekend warriors who want variety without committing to a long drive.",
  },
  {
    slug: "tahoe-south-trip",
    title: "Tahoe South Trip",
    // heavenly → heavenly-mountain-resort; kirkwood → kirkwood-mountain-resort
    description:
      "South Lake's three flagships — lake views from Heavenly, steeps at Kirkwood, locals at Sierra.",
    origin: ORIGIN_RENO,
    resortSlugs: ["heavenly-mountain-resort", "kirkwood-mountain-resort", "sierra-at-tahoe"],
    daysPerResort: [2, 1, 1],
    bestFor: "Skiers who want variety + scenery on one Lake Tahoe trip.",
  },
  {
    slug: "big-sky-solo-week",
    title: "Big Sky Solo Week",
    description:
      "5,800 acres, almost no lift lines, and Lone Peak's tram for the bucket-list double-black descent.",
    origin: ORIGIN_BOZEMAN,
    resortSlugs: ["big-sky"],
    daysPerResort: [7],
    bestFor: "Anyone who wants one mountain, every day, with terrain that'll outlast the trip.",
  },
  {
    slug: "western-pass-stretch",
    title: "Western Pass-Stretch 7-Day",
    description:
      "Maximum Epic Pass value — four classic I-70 resorts, sleep base of every mountain at least once.",
    origin: ORIGIN_DENVER,
    resortSlugs: ["vail", "beaver-creek", "breckenridge", "keystone"],
    daysPerResort: [2, 1, 2, 2],
    bestFor: "Epic passholders looking to redeem the entire pass in one week.",
  },
  {
    slug: "east-coast-weekend-nyc",
    title: "East Coast Weekend from NYC",
    // hunter → hunter-mountain; belleayre → belleayre-mountain
    description:
      "Three Catskills mountains in three days, all under 2.5 hours from Midtown.",
    origin: ORIGIN_NYC,
    resortSlugs: ["mountain-creek", "hunter-mountain", "belleayre-mountain"],
    daysPerResort: [1, 1, 1],
    bestFor: "NYC weekenders without a Friday off — drive up Saturday morning.",
  },
];

export function getTemplate(slug: string): TripTemplate | null {
  return TEMPLATES.find((t) => t.slug === slug) ?? null;
}
