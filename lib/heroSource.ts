// Which image a resort's hero shows, and why.
//
// One policy for every surface (resort page header, map panel, /today
// thumbnails, /go cards, /credits):
//
//   photo    hero_image_url points at OUR Supabase Storage bucket
//            (resort-heroes), the row has not been flagged
//            hero_image_verified_winter = false, and the object is not in
//            lib/data/heroDenylist.json. Only re-hosted, vetted,
//            licence-clear photos live in that bucket, so the host check
//            doubles as the copyright check: a hotlinked third-party URL
//            (the 2026-05 Ikon / Indy marketing images) is never shown,
//            whatever the column says. The denylist covers the 2026-06
//            heroes that the 2026-09-23 re-check found to show a different
//            resort or to sit outside the licence allow-list; it applies
//            here so they disappear on deploy, before anyone runs
//            scripts/photos/legacy/legacy-heroes.sql.
//   card     no usable photo, but scripts/photos/2-terrain-cards.mjs has
//            rendered a terrain card for the slug (lib/data/terrainCards.json).
//            Public-domain USGS elevation with no drawn-in text (the page
//            lays its own heading over it); the caller labels it a render.
//   gradient neither: the caller keeps its designed navy gradient.
//
// Pure and dependency-free so it runs in server components, client
// components and unit tests alike. Both JSON imports are small (about
// 75 KB and 2 KB raw, a few KB gzipped); a client component that calls
// this (the map panel) ships them once.

import terrainCards from "@/lib/data/terrainCards.json";
import heroDenylist from "@/lib/data/heroDenylist.json";

export type HeroKind = "photo" | "card" | "gradient";

export type HeroSource = {
  kind: HeroKind;
  /** Full-size image URL; null for the gradient. */
  src: string | null;
  /** Smaller variant for 56 px thumbnails and list rows; null for the gradient. */
  thumb: string | null;
  alt: string;
  /** Credit line to print under a photo or card; null for the gradient. */
  credit: string | null;
};

/** The subset of a resorts row the policy reads. Every hero column is optional so
 *  a caller with only {slug, name} (the /go ranker) still gets a card or gradient. */
export type HeroResortInput = {
  slug: string;
  name: string;
  state?: string | null;
  hero_image_url?: string | null;
  hero_image_alt?: string | null;
  hero_image_attribution?: string | null;
  hero_image_source?: string | null;
  hero_image_verified_winter?: boolean | null;
};

/**
 * lib/data/terrainCards.json as written by scripts/photos/2-terrain-cards.mjs:
 * `base` is the public URL prefix of the resort-cards bucket and each card
 * lists three content-addressed object names (a re-render always yields
 * new names, so the 1-year cache never serves a stale card).
 *   hero   1600x900, no text: resort page header and map panel.
 *   thumb  800x450 of the hero: 56 px list thumbnails.
 *   share  1600x900 with the resort name, state and provenance note drawn
 *          in, for share / OG use where the card stands alone.
 */
type TerrainCardsFile = { base: string; cards: Record<string, { hero: string; thumb: string; share: string }> };
const CARDS_FILE = terrainCards as TerrainCardsFile;

export type TerrainCard = { hero: string; thumb: string; share: string };

type DenylistEntry = { object: string; reason: string };
const DENYLIST = heroDenylist as Record<string, DenylistEntry>;
const DENIED_OBJECTS = new Set(Object.values(DENYLIST).map((d) => d.object));

export const HERO_BUCKET = "resort-heroes";
export const CARD_BUCKET = "resort-cards";
export const CARD_CREDIT = "Terrain render from USGS 3DEP elevation data, not a photo";

/**
 * Hosts whose Storage objects count as ours. The env var covers a preview
 * deploy pointed at a staging project; the literal is the production
 * project so a build with no env still recognises production URLs.
 */
export function storageHosts(): string[] {
  const hosts = new Set<string>(["yhmzkeeaiknsotydaucs.supabase.co"]);
  const env = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (env) {
    try {
      hosts.add(new URL(env).hostname);
    } catch {
      // A malformed env value must not take the hero policy down.
    }
  }
  return [...hosts];
}

/** True when `url` is a public object in our resort-heroes bucket. */
export function isStorageHeroUrl(url: string | null | undefined, hosts: string[] = storageHosts()): boolean {
  if (!url) return false;
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  if (!hosts.includes(parsed.hostname)) return false;
  return parsed.pathname.startsWith(`/storage/v1/object/public/${HERO_BUCKET}/`);
}

/** Object name inside resort-heroes for a storage hero URL, else null. */
export function heroObjectName(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const path = new URL(url).pathname;
    const prefix = `/storage/v1/object/public/${HERO_BUCKET}/`;
    return path.startsWith(prefix) ? decodeURIComponent(path.slice(prefix.length)) : null;
  } catch {
    return null;
  }
}

/**
 * True when this hero object was reviewed and rejected (wrong resort, or a
 * licence outside the allow-list). With a slug the entry must be that
 * resort's; without one (a caller that only has the URL) any entry
 * matches, which is safe because object names are per slug. A photo
 * published later gets a new content-addressed name, so an old entry
 * never catches it.
 */
export function isDeniedHero(url: string | null | undefined, slug?: string): boolean {
  const object = heroObjectName(url);
  if (!object) return false;
  if (slug != null) return DENYLIST[slug]?.object === object;
  return DENIED_OBJECTS.has(object);
}

/** Full URLs of a resort's terrain card variants, or null when none was rendered. */
export function terrainCardFor(slug: string): TerrainCard | null {
  const card = CARDS_FILE.cards?.[slug];
  if (!card) return null;
  return { hero: CARDS_FILE.base + card.hero, thumb: CARDS_FILE.base + card.thumb, share: CARDS_FILE.base + card.share };
}

/** How many resorts have a terrain card on file (for /credits). */
export function terrainCardCount(): number {
  return Object.keys(CARDS_FILE.cards ?? {}).length;
}

export function heroSourceFor(resort: HeroResortInput, hosts?: string[]): HeroSource {
  const photoAlt = resort.hero_image_alt?.trim() || `${resort.name} in winter`;
  if (
    isStorageHeroUrl(resort.hero_image_url, hosts) &&
    resort.hero_image_verified_winter !== false &&
    !isDeniedHero(resort.hero_image_url, resort.slug)
  ) {
    return {
      kind: "photo",
      src: resort.hero_image_url as string,
      thumb: resort.hero_image_url as string,
      alt: photoAlt,
      credit: tidyAttribution(resort.hero_image_attribution),
    };
  }
  const card = terrainCardFor(resort.slug);
  if (card) {
    return {
      kind: "card",
      src: card.hero,
      thumb: card.thumb,
      alt: `Terrain render of ${resort.name}${resort.state ? `, ${resort.state}` : ""}`,
      credit: CARD_CREDIT,
    };
  }
  return { kind: "gradient", src: null, thumb: null, alt: "", credit: null };
}

// ---------------------------------------------------------------------------
// Attribution helpers for the /credits page and the resort page credit line.

export type ParsedAttribution = { author: string | null; licence: string | null };

/**
 * The attribution column holds "Author / Licence" (written by the 2026-06
 * hero pipeline). Split on the LAST slash so an author like "A / B Studio"
 * keeps its slash, and treat a lone value with no recognisable licence as
 * an author.
 */
export function parseAttribution(value: string | null | undefined): ParsedAttribution {
  const text = (value ?? "").trim();
  if (!text) return { author: null, licence: null };
  const idx = text.lastIndexOf(" / ");
  if (idx === -1) {
    return looksLikeLicence(text) ? { author: null, licence: text } : { author: text, licence: null };
  }
  const author = text.slice(0, idx).trim() || null;
  const licence = text.slice(idx + 3).trim() || null;
  return { author, licence };
}

/**
 * The attribution column as a printable credit. The 2026-06 batch stored
 * Commons' rendered {{unknown|author}} template verbatim ("Unknown
 * authorUnknown author or not provided / Public domain"); print the
 * licence alone for those. scripts/photos/legacy/legacy-heroes.sql fixes
 * the column itself; this keeps the page clean until it is applied.
 */
export function tidyAttribution(value: string | null | undefined): string | null {
  const { author, licence } = parseAttribution(value);
  const cleanAuthor = author && !/^unknown author|not provided$/i.test(author) ? author : null;
  if (cleanAuthor && licence) return `${cleanAuthor} / ${licence}`;
  return cleanAuthor ?? licence ?? null;
}

function looksLikeLicence(s: string): boolean {
  return /^(CC0|CC[ -]BY|Public domain|PD\b)/i.test(s);
}

/** Canonical deed URL for a licence short name, or null for public domain / unknown. */
export function licenceUrlFor(licence: string | null | undefined): string | null {
  const text = (licence ?? "").trim();
  if (!text) return null;
  if (/^CC0/i.test(text)) return "https://creativecommons.org/publicdomain/zero/1.0/";
  const cc = text.match(/^CC[ -]BY(-SA|-NC|-ND|-NC-SA|-NC-ND)?\s*(\d\.\d)?/i);
  if (cc) {
    const variant = `by${(cc[1] ?? "").toLowerCase()}`;
    const version = cc[2] ?? "4.0";
    return `https://creativecommons.org/licenses/${variant}/${version}/`;
  }
  if (/public domain|^PD\b/i.test(text)) return "https://commons.wikimedia.org/wiki/Commons:Licensing#Public_domain";
  return null;
}

/** A Commons search for the source file when no source page is stored. */
export function commonsSearchUrl(resortName: string): string {
  return `https://commons.wikimedia.org/w/index.php?${new URLSearchParams({ search: resortName, ns6: "1" })}`;
}
