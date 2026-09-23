import { describe, expect, it } from "vitest";
import terrainCards from "@/lib/data/terrainCards.json";
import heroDenylist from "@/lib/data/heroDenylist.json";
import {
  commonsSearchUrl,
  heroObjectName,
  heroSourceFor,
  isDeniedHero,
  isStorageHeroUrl,
  licenceUrlFor,
  parseAttribution,
  storageHosts,
  terrainCardCount,
  terrainCardFor,
  tidyAttribution,
  CARD_CREDIT,
} from "./heroSource";

const HOSTS = ["yhmzkeeaiknsotydaucs.supabase.co"];
const STORAGE_PHOTO = "https://yhmzkeeaiknsotydaucs.supabase.co/storage/v1/object/public/resort-heroes/alta.jpg";

// A slug the terrain-card run produced, so the card branch is exercised
// against the real data file rather than a stub.
const CARD_SLUG = Object.keys(terrainCards.cards)[0];
const NO_CARD_SLUG = "no-such-resort-slug";
const CARD_BASE = "https://yhmzkeeaiknsotydaucs.supabase.co/storage/v1/object/public/resort-cards/";

// A reviewed-and-rejected legacy hero (wrong resort or licence).
const [DENIED_SLUG, DENIED_ENTRY] = Object.entries(heroDenylist)[0];
const DENIED_URL = `https://yhmzkeeaiknsotydaucs.supabase.co/storage/v1/object/public/resort-heroes/${DENIED_ENTRY.object}`;

describe("isStorageHeroUrl", () => {
  it("accepts a public object in our resort-heroes bucket", () => {
    expect(isStorageHeroUrl(STORAGE_PHOTO, HOSTS)).toBe(true);
  });
  it("rejects third-party hosts even when they serve a ski photo", () => {
    expect(isStorageHeroUrl("https://cdn.sanity.io/images/x/y/alta.jpg", HOSTS)).toBe(false);
    expect(isStorageHeroUrl("https://www.indyskipass.com/img/alta.jpg", HOSTS)).toBe(false);
    expect(isStorageHeroUrl("https://upload.wikimedia.org/wikipedia/commons/a/ab/Alta.jpg", HOSTS)).toBe(false);
  });
  it("rejects our host outside the resort-heroes bucket, http, and junk", () => {
    expect(isStorageHeroUrl("https://yhmzkeeaiknsotydaucs.supabase.co/storage/v1/object/public/resort-cards/alta-1600.webp", HOSTS)).toBe(false);
    expect(isStorageHeroUrl("http://yhmzkeeaiknsotydaucs.supabase.co/storage/v1/object/public/resort-heroes/alta.jpg", HOSTS)).toBe(false);
    expect(isStorageHeroUrl("not a url", HOSTS)).toBe(false);
    expect(isStorageHeroUrl(null, HOSTS)).toBe(false);
    expect(isStorageHeroUrl("", HOSTS)).toBe(false);
  });
  it("always includes the production host in the default allow-list", () => {
    expect(storageHosts()).toContain("yhmzkeeaiknsotydaucs.supabase.co");
  });
});

describe("heroSourceFor", () => {
  it("uses the photo when it is storage-hosted and not flagged non-winter", () => {
    const s = heroSourceFor(
      { slug: CARD_SLUG, name: "Alta Ski Area", hero_image_url: STORAGE_PHOTO, hero_image_attribution: "Baileypalblue / Public domain", hero_image_alt: "Alta in winter" },
      HOSTS,
    );
    expect(s.kind).toBe("photo");
    expect(s.src).toBe(STORAGE_PHOTO);
    expect(s.thumb).toBe(STORAGE_PHOTO);
    expect(s.alt).toBe("Alta in winter");
    expect(s.credit).toBe("Baileypalblue / Public domain");
  });
  it("keeps the photo when verified_winter is null (unvetted, not rejected)", () => {
    const s = heroSourceFor({ slug: NO_CARD_SLUG, name: "X", hero_image_url: STORAGE_PHOTO, hero_image_verified_winter: null }, HOSTS);
    expect(s.kind).toBe("photo");
  });
  it("drops a photo flagged verified_winter = false and falls through", () => {
    const withCard = heroSourceFor({ slug: CARD_SLUG, name: "X", hero_image_url: STORAGE_PHOTO, hero_image_verified_winter: false }, HOSTS);
    expect(withCard.kind).toBe("card");
    const without = heroSourceFor({ slug: NO_CARD_SLUG, name: "X", hero_image_url: STORAGE_PHOTO, hero_image_verified_winter: false }, HOSTS);
    expect(without.kind).toBe("gradient");
  });
  it("never shows a hotlinked third-party hero: card when one exists, else gradient", () => {
    const s = heroSourceFor({ slug: CARD_SLUG, name: "X", hero_image_url: "https://cdn.sanity.io/images/x/y.jpg", hero_image_verified_winter: true }, HOSTS);
    expect(s.kind).toBe("card");
    const entry = terrainCards.cards[CARD_SLUG as keyof typeof terrainCards.cards];
    expect(s.src).toBe(terrainCards.base + entry.hero);
    expect(s.thumb).toBe(terrainCards.base + entry.thumb);
    expect(s.credit).toBe(CARD_CREDIT);
    expect(s.alt).toContain("Terrain render");
    const g = heroSourceFor({ slug: NO_CARD_SLUG, name: "X", hero_image_url: "https://www.indyskipass.com/x.jpg" }, HOSTS);
    expect(g).toEqual({ kind: "gradient", src: null, thumb: null, alt: "", credit: null });
  });
  it("works with the minimal /go ranker shape (slug + name only)", () => {
    expect(heroSourceFor({ slug: CARD_SLUG, name: "X" }, HOSTS).kind).toBe("card");
    expect(heroSourceFor({ slug: NO_CARD_SLUG, name: "X" }, HOSTS).kind).toBe("gradient");
  });
  it("drops a denylisted legacy hero: card when one exists, else gradient", () => {
    const withCard = heroSourceFor({ slug: DENIED_SLUG, name: "X", hero_image_url: DENIED_URL, hero_image_verified_winter: true }, HOSTS);
    expect(withCard.kind).toBe(terrainCardFor(DENIED_SLUG) ? "card" : "gradient");
    expect(withCard.src).not.toBe(DENIED_URL);
  });
  it("keeps a newly published photo for a denylisted slug (new object name)", () => {
    const replaced = DENIED_URL.replace(/\.jpg$/, "-1a2b3c4d.jpg");
    const s = heroSourceFor({ slug: DENIED_SLUG, name: "X", hero_image_url: replaced, hero_image_verified_winter: true }, HOSTS);
    expect(s.kind).toBe("photo");
  });
  it("cleans the 2026-06 batch's unknown-author text out of the credit", () => {
    const s = heroSourceFor(
      { slug: NO_CARD_SLUG, name: "X", hero_image_url: STORAGE_PHOTO, hero_image_attribution: "Unknown authorUnknown author or not provided / Public domain" },
      HOSTS,
    );
    expect(s.credit).toBe("Public domain");
  });
  it("falls back to a generic alt when the column is empty", () => {
    const s = heroSourceFor({ slug: NO_CARD_SLUG, name: "Alta Ski Area", hero_image_url: STORAGE_PHOTO, hero_image_alt: "  " }, HOSTS);
    expect(s.alt).toBe("Alta Ski Area in winter");
  });
});

describe("terrain cards file", () => {
  it("resolves text-free hero and thumb variants plus the share card under the bucket base", () => {
    expect(terrainCards.base).toBe(CARD_BASE);
    const card = terrainCardFor(CARD_SLUG);
    expect(card).not.toBeNull();
    expect(card?.hero).toMatch(new RegExp(`^${CARD_BASE}${CARD_SLUG}-hero-[0-9a-f]{8}\\.webp$`));
    expect(card?.thumb).toMatch(new RegExp(`^${CARD_BASE}${CARD_SLUG}-thumb-[0-9a-f]{8}\\.webp$`));
    expect(card?.share).toMatch(new RegExp(`^${CARD_BASE}${CARD_SLUG}-share-[0-9a-f]{8}\\.webp$`));
    expect(terrainCardFor(NO_CARD_SLUG)).toBeNull();
  });
  it("counts every rendered resort", () => {
    expect(terrainCardCount()).toBe(Object.keys(terrainCards.cards).length);
    expect(terrainCardCount()).toBeGreaterThan(300);
  });
});

describe("denylist", () => {
  it("matches the exact object for the slug, and any listed object without a slug", () => {
    expect(heroObjectName(DENIED_URL)).toBe(DENIED_ENTRY.object);
    expect(isDeniedHero(DENIED_URL, DENIED_SLUG)).toBe(true);
    expect(isDeniedHero(DENIED_URL)).toBe(true);
    expect(isDeniedHero(DENIED_URL, "some-other-slug")).toBe(false);
    expect(isDeniedHero(STORAGE_PHOTO)).toBe(false);
    expect(isDeniedHero(null)).toBe(false);
    expect(isDeniedHero("https://cdn.sanity.io/x.jpg")).toBe(false);
  });
});

describe("tidyAttribution", () => {
  it("keeps real credits and strips template junk", () => {
    expect(tidyAttribution("Zach Dischner / CC BY 2.0")).toBe("Zach Dischner / CC BY 2.0");
    expect(tidyAttribution("Unknown authorUnknown author / FAL")).toBe("FAL");
    expect(tidyAttribution("Public domain")).toBe("Public domain");
    expect(tidyAttribution("  ")).toBeNull();
    expect(tidyAttribution(null)).toBeNull();
  });
});

describe("parseAttribution", () => {
  it("splits Author / Licence on the last separator", () => {
    expect(parseAttribution("Zach Dischner / CC BY 2.0")).toEqual({ author: "Zach Dischner", licence: "CC BY 2.0" });
    expect(parseAttribution("A / B Studio / CC BY-SA 4.0")).toEqual({ author: "A / B Studio", licence: "CC BY-SA 4.0" });
  });
  it("treats a lone value as author unless it reads as a licence", () => {
    expect(parseAttribution("Somebody")).toEqual({ author: "Somebody", licence: null });
    expect(parseAttribution("Public domain")).toEqual({ author: null, licence: "Public domain" });
    expect(parseAttribution(null)).toEqual({ author: null, licence: null });
    expect(parseAttribution("   ")).toEqual({ author: null, licence: null });
  });
});

describe("licenceUrlFor", () => {
  it("maps Creative Commons short names to deed URLs", () => {
    expect(licenceUrlFor("CC BY 2.0")).toBe("https://creativecommons.org/licenses/by/2.0/");
    expect(licenceUrlFor("CC BY-SA 4.0")).toBe("https://creativecommons.org/licenses/by-sa/4.0/");
    expect(licenceUrlFor("CC BY-SA 3.0")).toBe("https://creativecommons.org/licenses/by-sa/3.0/");
    expect(licenceUrlFor("CC0")).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
    expect(licenceUrlFor("CC0 1.0")).toBe("https://creativecommons.org/publicdomain/zero/1.0/");
  });
  it("points public domain at the Commons explainer and unknowns at nothing", () => {
    expect(licenceUrlFor("Public domain")).toContain("commons.wikimedia.org");
    expect(licenceUrlFor("PD US")).toContain("commons.wikimedia.org");
    expect(licenceUrlFor("GFDL")).toBeNull();
    expect(licenceUrlFor(null)).toBeNull();
  });
});

describe("commonsSearchUrl", () => {
  it("searches the File namespace for the resort name", () => {
    const url = commonsSearchUrl("Alta Ski Area");
    expect(url).toContain("commons.wikimedia.org");
    expect(url).toContain("ns6=1");
    expect(url).toContain("Alta+Ski+Area");
  });
});
