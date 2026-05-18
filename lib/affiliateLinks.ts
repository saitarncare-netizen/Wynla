// Centralized affiliate-aware URL builders for the 6 Wynla launch partners:
//   1. Booking.com         — lodging         (Booking Partner Programme)
//   2. Vrbo (via Expedia)  — cabins/rentals  (Expedia TAAP)
//   3. Catalate / Liftopia — lift tickets    (Catalate affiliate)
//   4. evo.com             — ski gear        (evo direct affiliate)
//   5. Skyscanner          — flights         (Skyscanner partner)
//   6. World Nomads        — travel insurance (World Nomads affiliate)
//
// Plus Airbnb as a no-affiliate UX-convenience handoff (Airbnb has no
// public affiliate program in 2026; we keep it as a third-place option
// so users who prefer Airbnb still get value, but the affiliate-paying
// Booking + Vrbo lead the lodging stack visually).
//
// Each affiliate ID is read from a NEXT_PUBLIC_AFFILIATE_* env var so
// the user can paste in real credentials without redeploying code
// changes. Until those env vars are set the links still work — they
// just don't earn commission. Tracking starts the moment the env var
// lands in Vercel.
//
// All builders take a small `Resort` context so the destination is
// pre-seeded (e.g. Booking.com lands on a list of hotels near the
// resort, not on Booking's homepage).

export type AffiliateContext = {
  name: string;
  state: string | null;
  lat: number;
  lng: number;
  closest_airport_iata?: string | null;
};

// ────────────────────────────────────────────────────────────────────────
// 1. Booking.com — Booking Partner Programme
//    Affiliate ID is appended as `?aid={id}` and Booking attributes the
//    next booking to that partner for 30 days. Commission ~25-40% of
//    Booking's own cut (so ~4% of the gross booking value end-to-end).
//    Sign up: https://partner.booking.com
// ────────────────────────────────────────────────────────────────────────
export function bookingComUrl(ctx: AffiliateContext): string {
  const query = ctx.state ? `${ctx.name} ${ctx.state}` : ctx.name;
  const params = new URLSearchParams({
    ss: query,
    dest_type: "landmark",
  });
  const aid = process.env.NEXT_PUBLIC_AFFILIATE_BOOKING_AID;
  if (aid) params.set("aid", aid);
  return `https://www.booking.com/searchresults.html?${params.toString()}`;
}

// ────────────────────────────────────────────────────────────────────────
// 2. Vrbo — Expedia TAAP (Travel Agent Affiliate Program)
//    TAAP uses `camref={CAMID}` to track. Commission 6-8% on Vrbo
//    bookings. Stronger than Booking for ski-trip-specific intent
//    because Vrbo's inventory is mostly cabins and houses (which is
//    what families and groups want for ski weekends).
//    Sign up: https://www.expediagroup.com/affiliate
// ────────────────────────────────────────────────────────────────────────
export function vrboUrl(ctx: AffiliateContext): string {
  const query = ctx.state ? `${ctx.name}, ${ctx.state}` : ctx.name;
  const camid = process.env.NEXT_PUBLIC_AFFILIATE_EXPEDIA_CAMID;
  const base = `https://www.vrbo.com/search?q=${encodeURIComponent(query)}`;
  return camid ? `${base}&camref=${camid}` : base;
}

// ────────────────────────────────────────────────────────────────────────
// Airbnb — NOT an affiliate program in 2026 (Airbnb Associates closed
// 2021 and Airbnb's brand-partnership team only works with big
// platforms like Skyscanner/Trivago). We keep this link as a UX
// convenience so users who prefer Airbnb don't bounce — they just
// don't generate revenue for Wynla. Ranks third visually for that
// reason.
// ────────────────────────────────────────────────────────────────────────
export function airbnbUrl(ctx: AffiliateContext): string {
  const query = ctx.state ? `${ctx.name} ${ctx.state}` : ctx.name;
  return `https://www.airbnb.com/s/${encodeURIComponent(query)}/homes`;
}

// ────────────────────────────────────────────────────────────────────────
// 3. Catalate / Liftopia — lift tickets
//    Post-2020 the marketplace model died; Skitude/Catalate run it as
//    a B2B distribution platform now, but Liftopia.com still operates
//    as the consumer-facing front and has an open affiliate program.
//    Commission 3-7% of the ticket price.
//    Sign up: https://www.liftopia.com/affiliate
// ────────────────────────────────────────────────────────────────────────
export function liftopiaUrl(ctx: AffiliateContext): string {
  const slug = ctx.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const affId = process.env.NEXT_PUBLIC_AFFILIATE_LIFTOPIA_ID;
  const base = `https://www.liftopia.com/lift-tickets/${slug}`;
  return affId ? `${base}?affiliateId=${affId}` : base;
}

// ────────────────────────────────────────────────────────────────────────
// 4. evo.com — ski gear (skis, boards, boots, apparel)
//    Direct affiliate. Commission 5-8%, average order ~$200 in ski.
//    Sign up: https://www.evo.com/affiliates (also via AvantLink)
// ────────────────────────────────────────────────────────────────────────
export function evoUrl(category: "skis" | "snowboards" | "outerwear" | "all" = "all"): string {
  const affId = process.env.NEXT_PUBLIC_AFFILIATE_EVO_ID;
  const path =
    category === "all"
      ? "/shop/ski"
      : category === "snowboards"
        ? "/shop/snowboard"
        : category === "outerwear"
          ? "/shop/outerwear"
          : "/shop/ski/equipment/skis";
  const base = `https://www.evo.com${path}`;
  return affId ? `${base}?avad=${affId}` : base;
}

// ────────────────────────────────────────────────────────────────────────
// 5. Skyscanner — flights
//    Pay-per-click ($0.30-0.50/click on US ski-airport searches). Lower
//    commission per event than the others but the easiest "I'm flying
//    in for this trip" upsell to slot in.
//    Sign up: https://www.partners.skyscanner.net
// ────────────────────────────────────────────────────────────────────────
export function skyscannerUrl(ctx: AffiliateContext): string {
  const airport = ctx.closest_airport_iata?.toLowerCase() ?? "us";
  const partnerId = process.env.NEXT_PUBLIC_AFFILIATE_SKYSCANNER_ID;
  const params = new URLSearchParams({
    associateid: partnerId ?? "",
  });
  return `https://www.skyscanner.com/transport/flights-to/${airport}/?${params.toString()}`;
}

// ────────────────────────────────────────────────────────────────────────
// 6. World Nomads — travel insurance
//    Adventure-friendly (covers off-piste, snow injuries, gear loss).
//    Commission 10% on policies; average policy $50-80 for a 1-week
//    ski trip. Most valuable affiliate per conversion in the stack.
//    Sign up: https://www.worldnomads.com/affiliates
// ────────────────────────────────────────────────────────────────────────
export function worldNomadsUrl(): string {
  const affId = process.env.NEXT_PUBLIC_AFFILIATE_WORLDNOMADS_ID;
  return affId
    ? `https://www.worldnomads.com/travel-insurance?aff=${affId}`
    : `https://www.worldnomads.com/travel-insurance`;
}

// ────────────────────────────────────────────────────────────────────────
// Whitelisted partner identity → used by the disclosure badge component
// next to each affiliate CTA so the FTC compliance is consistent across
// the four "Plan your trip" cards.
// ────────────────────────────────────────────────────────────────────────
export const AFFILIATE_PARTNERS = {
  booking: { name: "Booking.com", paysCommission: true },
  vrbo: { name: "Vrbo", paysCommission: true },
  airbnb: { name: "Airbnb", paysCommission: false }, // kept for UX, no $
  liftopia: { name: "Liftopia", paysCommission: true },
  evo: { name: "evo.com", paysCommission: true },
  skyscanner: { name: "Skyscanner", paysCommission: true },
  worldNomads: { name: "World Nomads", paysCommission: true },
} as const;

export type PartnerKey = keyof typeof AFFILIATE_PARTNERS;
