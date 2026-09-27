"use client";

// Gold trip pill in the resort page hero. The page is a server component,
// so the label that follows the planner draft (sessionStorage, this tab)
// needs this small client island: "Plan trip" with no draft, "Add to
// trip" when this resort would be a new stop, "View trip" when it already
// is one, the same wording as the map sheet's ActionBar (both read
// lib/plannerDraft planActionLabel). The server has no draft, so it
// renders "Plan trip"; usePlannerDraftSlugs hydrates with that same
// server snapshot and only then switches to the draft's label, so there
// is no hydration mismatch.
//
// Every label links to /?plan=1&add=<slug>: ?add appends to the trip in
// progress, starts one, or just opens it when the resort is already a
// stop. Never ?route=, which replaces every stop, and people reach this
// page from a resort sheet mid-plan. No ?days: the planner sizes the trip
// from the draft plus this stop.

import Link from "next/link";
import Icon from "@/components/icons/Icon";
import { planActionLabel, usePlannerDraftSlugs, type PlanActionLabel } from "@/lib/plannerDraft";

// Accessible names start with the visible label (WCAG 2.5.3, label in
// name) and add the resort for screen-reader context.
function accessibleName(label: PlanActionLabel, name: string): string {
  if (label === "Plan trip") return `Plan trip to ${name}`;
  if (label === "Add to trip") return `Add to trip: ${name}`;
  return `View trip with ${name}`;
}

export default function PlanTripPill({
  slug,
  name,
  closed,
}: {
  slug: string;
  name: string;
  /** Permanently closed mountain: no pill unless it is already a stop
      (then "View trip" still leads back to the trip). Same rule as the
      map sheet's ActionBar and lib/near.ts. */
  closed: boolean;
}) {
  const { label, inTrip } = planActionLabel(usePlannerDraftSlugs(), slug);
  if (closed && !inTrip) return null;
  return (
    <Link
      href={`/?plan=1&add=${encodeURIComponent(slug)}`}
      aria-label={accessibleName(label, name)}
      className="inline-flex h-11 min-w-0 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-wn-gold px-4 text-sm font-bold text-wn-navy shadow-wn-md transition hover:bg-wn-gold/90 active:scale-[0.98] motion-reduce:transition-none"
    >
      <Icon name={inTrip ? "check" : "trips"} className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
