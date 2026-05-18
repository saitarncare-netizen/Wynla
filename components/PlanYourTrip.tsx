"use client";

// "Plan your trip" — single section, four cards (Tickets / Stay / Gear /
// Travel) on the resort detail page. Each card opens a modal with 2–3
// affiliate-linked partner options. Replaces the older two-button
// "Find lodging / Airbnb nearby" row.
//
// Design rules:
//   - Exactly one revenue section per resort page. No second cluster
//     in headers, sidebars, or footers (the discovery surfaces stay
//     ad-free per Komoot/AllTrails playbook).
//   - The card body shows the action ("Stay", "Tickets") and the
//     starting context — NOT the partner brand. Partner branding lives
//     inside the modal, so the row reads like product navigation
//     instead of a banner ad.
//   - Affiliate-paying partners lead each modal; the non-revenue
//     fallback (Airbnb, direct resort site) is third or "Other".
//   - FTC: every modal carries a one-line disclosure that some links
//     pay Wynla a commission.

import { useState } from "react";
import {
  bookingComUrl,
  vrboUrl,
  airbnbUrl,
  liftopiaUrl,
  evoUrl,
  skyscannerUrl,
  worldNomadsUrl,
  type AffiliateContext,
} from "@/lib/affiliateLinks";

type Props = {
  resort: {
    name: string;
    state: string | null;
    latitude: number;
    longitude: number;
    closest_airport_iata: string | null;
    ticket_booking_url: string | null;
    website_url: string | null;
  };
};

type ModalKey = "tickets" | "stay" | "gear" | "travel" | null;

export default function PlanYourTrip({ resort }: Props) {
  const [open, setOpen] = useState<ModalKey>(null);

  const ctx: AffiliateContext = {
    name: resort.name,
    state: resort.state,
    lat: resort.latitude,
    lng: resort.longitude,
    closest_airport_iata: resort.closest_airport_iata,
  };

  return (
    <section className="rounded-xl border border-wn-charcoal/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-bold text-wn-navy sm:text-lg">
          Plan your trip
        </h2>
        <span className="text-[10px] font-medium text-wn-charcoal/45">
          Some links may earn us a commission
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Card
          icon="🎫"
          label="Tickets"
          sub="Lift tickets"
          onClick={() => setOpen("tickets")}
        />
        <Card
          icon="🏨"
          label="Stay"
          sub="Hotels & cabins"
          onClick={() => setOpen("stay")}
        />
        <Card
          icon="🎿"
          label="Gear"
          sub="Skis · boards"
          onClick={() => setOpen("gear")}
        />
        <Card
          icon="✈️"
          label="Travel"
          sub="Flights · insurance"
          onClick={() => setOpen("travel")}
        />
      </div>

      {open === "tickets" && (
        <Modal title="Lift tickets" onClose={() => setOpen(null)}>
          <PartnerRow
            label="Liftopia"
            sub="Discounted advance tickets · save up to 40%"
            href={liftopiaUrl(ctx)}
            badge="Partner"
          />
          {resort.ticket_booking_url && (
            <PartnerRow
              label={`${resort.name} (official)`}
              sub="Buy direct from the resort"
              href={resort.ticket_booking_url}
            />
          )}
          {resort.website_url && (
            <PartnerRow
              label="Resort website"
              sub="More pricing options"
              href={resort.website_url}
            />
          )}
        </Modal>
      )}

      {open === "stay" && (
        <Modal title="Where to stay" onClose={() => setOpen(null)}>
          <PartnerRow
            label="Booking.com"
            sub="Hotels near the mountain"
            href={bookingComUrl(ctx)}
            badge="Partner"
          />
          <PartnerRow
            label="Vrbo"
            sub="Cabins, condos, group homes"
            href={vrboUrl(ctx)}
            badge="Partner"
          />
          <PartnerRow
            label="Airbnb"
            sub="Browse listings nearby"
            href={airbnbUrl(ctx)}
          />
        </Modal>
      )}

      {open === "gear" && (
        <Modal title="Gear up" onClose={() => setOpen(null)}>
          <PartnerRow
            label="Skis & boards"
            sub="evo.com — top brands, free shipping"
            href={evoUrl("all")}
            badge="Partner"
          />
          <PartnerRow
            label="Outerwear"
            sub="evo.com — jackets, pants, gloves"
            href={evoUrl("outerwear")}
            badge="Partner"
          />
        </Modal>
      )}

      {open === "travel" && (
        <Modal title="Getting there" onClose={() => setOpen(null)}>
          <PartnerRow
            label="Find flights"
            sub={
              resort.closest_airport_iata
                ? `Flights to ${resort.closest_airport_iata.toUpperCase()} · Skyscanner`
                : "Search flights · Skyscanner"
            }
            href={skyscannerUrl(ctx)}
            badge="Partner"
          />
          <PartnerRow
            label="Travel insurance"
            sub="World Nomads — covers ski + adventure"
            href={worldNomadsUrl()}
            badge="Partner"
          />
        </Modal>
      )}
    </section>
  );
}

function Card({
  icon,
  label,
  sub,
  onClick,
}: {
  icon: string;
  label: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-0.5 rounded-lg border border-wn-charcoal/15 bg-wn-offwhite/60 px-3 py-3 text-left transition hover:border-wn-navy hover:bg-white hover:shadow-sm active:scale-[0.98] sm:py-4"
    >
      <span className="text-xl" aria-hidden="true">
        {icon}
      </span>
      <span className="mt-1 text-sm font-bold text-wn-navy">{label}</span>
      <span className="text-[11px] text-wn-charcoal/60">{sub}</span>
    </button>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <>
      {/* Backdrop. z-40 so it sits below sticky resort-page chrome
          but above the resort content. */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="fixed inset-0 z-40 bg-wn-navy/30 backdrop-blur-sm transition"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md rounded-t-2xl border border-wn-charcoal/10 bg-white p-4 shadow-2xl sm:inset-x-1/2 sm:bottom-1/2 sm:max-w-md sm:-translate-x-1/2 sm:translate-y-1/2 sm:rounded-2xl sm:p-5"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-base font-bold text-wn-navy">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-wn-charcoal/60 transition hover:bg-wn-offwhite hover:text-wn-navy"
          >
            ✕
          </button>
        </div>
        <div className="flex flex-col gap-2">{children}</div>
        <p className="mt-4 text-[10px] leading-snug text-wn-charcoal/50">
          Partner links pay Wynla a small commission at no extra cost to
          you. Wynla may earn money when you book through these links;
          prices and availability are set by the partner.
        </p>
      </div>
    </>
  );
}

function PartnerRow({
  label,
  sub,
  href,
  badge,
}: {
  label: string;
  sub: string;
  href: string;
  badge?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="flex items-start justify-between gap-2 rounded-lg border border-wn-charcoal/15 bg-white px-3 py-2.5 text-left transition hover:border-wn-navy hover:bg-wn-offwhite active:scale-[0.98]"
    >
      <span className="flex flex-col gap-0.5">
        <span className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-wn-navy">{label}</span>
          {badge && (
            <span className="rounded-sm bg-wn-gold/15 px-1 text-[9px] font-bold uppercase tracking-wide text-wn-navy/70">
              {badge}
            </span>
          )}
        </span>
        <span className="text-[11px] text-wn-charcoal/65">{sub}</span>
      </span>
      <span
        aria-hidden="true"
        className="mt-0.5 text-xs text-wn-charcoal/40"
      >
        ↗
      </span>
    </a>
  );
}
