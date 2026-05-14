// Stage 8 — Curated lists. Hand-picked groups of resorts for specific
// trips, skill levels, or passes. Each list maps to /lists/[slug] and
// renders the resorts in the order listed here (intentional ranking —
// no sort).
//
// All slugs verified against the active resorts table (audited 2026-05-14).
// When you add a new list, run the same probe to avoid 404s for resort
// cards that don't render.

export type CuratedList = {
  slug: string;
  title: string;
  subtitle: string;
  intro: string;
  resortSlugs: string[];
  publishedAt: string;
  // Optional accent for hero gradient — defaults to wn-navy.
  accent?: string;
};

export const LISTS: CuratedList[] = [
  {
    slug: "powder-paradise-west",
    title: "Powder Paradise — Best Snow in the West",
    subtitle: "Where to chase the deepest storms",
    intro:
      "The American West's powder belt runs through Utah, Wyoming, and the California Sierras. These are the resorts that consistently top 400 inches of annual snowfall and have the terrain to use it. Bring fat skis.",
    resortSlugs: [
      "alta",
      "snowbird",
      "jackson-hole",
      "wolf-creek",
      "mammoth-mountain",
      "palisades-tahoe",
      "crested-butte",
    ],
    publishedAt: "2026-05-14",
    accent: "#1E3A8A",
  },
  {
    slug: "east-coast-classics",
    title: "East Coast Classics",
    subtitle: "The flagship mountains of New England",
    intro:
      "Six mountains that define Eastern skiing — long-lift verticals, real big-mountain feel, and the on-mountain culture that keeps East Coast skiers coming back. Two in Vermont, two in New Hampshire, two in Maine.",
    resortSlugs: [
      "stowe-mountain-resort",
      "killington",
      "sugarbush",
      "sugarloaf",
      "loon-mountain",
      "sunday-river",
    ],
    publishedAt: "2026-05-14",
    accent: "#15803D",
  },
  {
    slug: "best-for-beginners",
    title: "Best for Beginners",
    subtitle: "Resorts that get learn-to-ski right",
    intro:
      "These six resorts run dedicated beginner zones (not a single bunny slope), high-quality ski-school programs, and gentle progression terrain past your first day. They're the right choice for first-timers — or for parents who want to come home married.",
    resortSlugs: [
      "bretton-woods",
      "smugglers-notch",
      "beaver-creek",
      "park-city",
      "solitude",
      "mt-bachelor",
    ],
    publishedAt: "2026-05-14",
    accent: "#0EA5E9",
  },
  {
    slug: "terrain-park-meccas",
    title: "Terrain Park Meccas",
    subtitle: "The freestyle scene's home base",
    intro:
      "Six resorts known for serious terrain parks — big-jump lines, halfpipes, rail gardens, and the kind of park crews that maintain features daily. If freestyle is the priority, plan your trip around these.",
    resortSlugs: [
      "mammoth-mountain",
      "northstar-california",
      "park-city",
      "boreal-mountain-resort",
      "snow-summit",
      "mount-snow",
    ],
    publishedAt: "2026-05-14",
    accent: "#EA580C",
  },
  {
    slug: "family-friendly-east",
    title: "Family-Friendly East",
    subtitle: "Where logistics don't ruin the week",
    intro:
      "Eastern family skiing rewards small operational details: ski-school check-in that doesn't burn an hour, lodging close to the lift, kids' terrain segregated from advanced skiers. These six get the details right.",
    resortSlugs: [
      "smugglers-notch",
      "loon-mountain",
      "mountain-creek",
      "wachusett-mountain",
      "catamount-ski-area",
      "pats-peak",
    ],
    publishedAt: "2026-05-14",
    accent: "#7C3AED",
  },
  {
    slug: "epic-pass-must-ski",
    title: "Epic Pass Must-Ski",
    subtitle: "The seven mountains that justify the pass",
    intro:
      "If you bought the Epic Pass, these are the resorts to anchor your season around. Three Colorado heavyweights, the biggest US mountain by acreage, the East's flagship Vail-owned destination, and a Tahoe / Whistler combo for variety.",
    resortSlugs: [
      "vail",
      "beaver-creek",
      "breckenridge",
      "park-city",
      "northstar-california",
      "stowe-mountain-resort",
      "crested-butte",
    ],
    publishedAt: "2026-05-14",
    accent: "#0F766E",
  },
  {
    slug: "ikon-pass-must-ski",
    title: "Ikon Pass Must-Ski",
    subtitle: "Seven anchors for the Alterra side",
    intro:
      "The Ikon Pass shines at destination mountains — Jackson, Aspen, Big Sky, Mammoth. Pair those with the unlimited workhorses (Steamboat, Killington, Sugarbush) and you have a full-season plan.",
    resortSlugs: [
      "aspen-snowmass",
      "steamboat",
      "mammoth-mountain",
      "big-sky",
      "jackson-hole",
      "killington",
      "sugarbush",
    ],
    publishedAt: "2026-05-14",
    accent: "#DC2626",
  },
  {
    slug: "indy-pass-hidden-gems",
    title: "Indy Pass Hidden Gems",
    subtitle: "Independent mountains that punch above their weight",
    intro:
      "The Indy Pass is the underrated buy for skiers who like small-mountain feel and weekday-empty lift lines. These six are the strongest Indy partners — most are family-owned, none feel corporate, and the price-per-day math is unbeatable.",
    resortSlugs: [
      "bromley-mountain",
      "pats-peak",
      "magic-mountain",
      "cannon-mountain",
      "bolton-valley",
      "powder-mountain",
    ],
    publishedAt: "2026-05-14",
    accent: "#CA8A04",
  },
  {
    slug: "night-skiing-east",
    title: "Night Skiing East",
    subtitle: "Mountains that stay lit past dark",
    intro:
      "Night skiing is the East's secret weapon — cheaper tickets, smaller crowds, and a different feel on the same mountain. Six resorts where night sessions are a real product, not an afterthought.",
    resortSlugs: [
      "wachusett-mountain",
      "bromley-mountain",
      "pats-peak",
      "sugarloaf",
      "mount-sunapee",
      "camelback-mountain-resort",
    ],
    publishedAt: "2026-05-14",
    accent: "#1E40AF",
  },
  {
    slug: "weekend-from-nyc",
    title: "Weekend from NYC",
    subtitle: "Six mountains within a four-hour drive of Manhattan",
    intro:
      "NYC skiers don't have to fly to ski. These six resorts are reachable on a Friday-after-work drive, have the lodging stock for a 2-night weekend, and span the difficulty range from first-timer to expert.",
    resortSlugs: [
      "mountain-creek",
      "hunter-mountain",
      "belleayre-mountain",
      "windham-mountain",
      "catamount-ski-area",
      "camelback-mountain-resort",
    ],
    publishedAt: "2026-05-14",
    accent: "#0369A1",
  },
];

export function getList(slug: string): CuratedList | null {
  return LISTS.find((l) => l.slug === slug) ?? null;
}

export function getAllListSlugs(): string[] {
  return LISTS.map((l) => l.slug);
}
