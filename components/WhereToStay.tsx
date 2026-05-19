// Lodging surface on the resort detail page — Booking.com + Vrbo +
// Airbnb. Three cards, each a direct deep-link that pre-fills the
// resort name + state for the partner's own search.
//
// Why this is the only revenue surface on the page:
//   - Lift tickets are bought at the resort window or on the resort's
//     own site; tickets-affiliate UX is awkward and conversion rates
//     are low (Liftopia / Catalate notwithstanding).
//   - Gear, flights and insurance live in their own modes (someone
//     buying skis isn't on a resort detail page; same for flights).
//   - Lodging is where a resort-page visitor's intent is HIGHEST
//     during planning — "I want to ski Killington, where do I sleep?"
//
// FTC: the global footer carries a one-line disclosure that some
// partner links earn Wynla a commission. Booking and Vrbo pay; Airbnb
// is a UX-courtesy handoff (Airbnb has no affiliate program in 2026).

import Icon from "@/components/icons/Icon";
import {
  airbnbUrl,
  bookingComUrl,
  vrboUrl,
  type AffiliateContext,
} from "@/lib/affiliateLinks";

type Props = {
  resort: {
    name: string;
    state: string | null;
    latitude: number;
    longitude: number;
    closest_airport_iata: string | null;
  };
};

export default function WhereToStay({ resort }: Props) {
  const ctx: AffiliateContext = {
    name: resort.name,
    state: resort.state,
    lat: resort.latitude,
    lng: resort.longitude,
    closest_airport_iata: resort.closest_airport_iata,
  };

  const cards: Array<{
    partner: string;
    title: string;
    sub: string;
    href: string;
  }> = [
    {
      partner: "Booking.com",
      title: "Hotels & lodges",
      sub: "Browse stays near the mountain",
      href: bookingComUrl(ctx),
    },
    {
      partner: "Vrbo",
      title: "Cabins & houses",
      sub: "Group rentals with kitchens",
      href: vrboUrl(ctx),
    },
    {
      partner: "Airbnb",
      title: "Homes & rooms",
      sub: "Local hosts and unique stays",
      href: airbnbUrl(ctx),
    },
  ];

  return (
    <section aria-label={`Lodging near ${resort.name}`}>
      <div className="mb-3">
        <h2 className="text-lg font-bold text-wn-navy sm:text-xl">
          Where to stay
        </h2>
        <p className="text-xs text-wn-charcoal/60">
          Search lodging near {resort.name}. Some links earn Wynla a
          commission at no extra cost to you.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {cards.map((c) => (
          <a
            key={c.partner}
            href={c.href}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="group flex items-center justify-between gap-3 rounded-lg border border-wn-charcoal/10 bg-white px-4 py-3 transition hover:border-wn-navy hover:shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-wn-navy/5 text-wn-navy">
                <Icon name="pin" className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-wn-navy">
                  {c.title}
                </div>
                <div className="truncate text-xs text-wn-charcoal/60">
                  {c.sub} · {c.partner}
                </div>
              </div>
            </div>
            <span className="text-wn-navy/40 transition group-hover:translate-x-0.5 group-hover:text-wn-navy">
              →
            </span>
          </a>
        ))}
      </div>
    </section>
  );
}
