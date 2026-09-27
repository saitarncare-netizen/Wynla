"use client";

// Sticky bottom action bar for /trip/[id]: trip mode's next step + Share.
// The page's timeline is long and the old controls sat at the very end,
// so on a phone the one action a rider needs was a full page-scroll away
// (audit trip-planner-8 / mobile-ergonomics-26).
//
//   not started  Start trip
//   active       Navigate (Google Maps to today's mountain) + Finish day N;
//                on a stay-put day Finish leads and Directions shrinks to
//                an icon, the same emphasis as the Today card
//   complete     Plan another trip
//
// Writes go through useTripProgress (TodayCard.tsx), shared with the
// Today card, so both Finish buttons share one busy state and one
// "this day only" rule. Undo lives in the card and in Trip controls: a
// fourth 44 px button does not fit a 375 px row.
//
// Navigate is a navy primary here, not gold: this bar is a white surface
// and gold is reserved for the one CTA on a navy surface (DESIGN_GUIDE).
//
// Layout: position fixed above the phone tab bar (the --wn-tab-bar-h
// custom property AppTabBar publishes), flush to the bottom with the
// home-indicator inset on routes or screens without the bar.

import type { TodayState } from "@/lib/tripToday";
import Button from "@/components/ui/Button";
import Icon from "@/components/icons/Icon";
import TripShareButton from "./TripShareButton";
import { useTripProgress } from "./TodayCard";

type Props = {
  tripId: string;
  tripName: string;
  state: TodayState;
  /** Today's day number (day 1 before the start). */
  day: number;
  totalDays: number;
  /** No day after today: Finish reads "Finish trip". */
  isLastDay: boolean;
  /** Same mountain as yesterday. */
  stayPut: boolean;
  /** Google Maps directions to today's mountain, when it is known. */
  navigate: { name: string; url: string } | null;
};

export default function TripStickyBar({ tripId, tripName, state, day, totalDays, isLastDay, stayPut, navigate }: Props) {
  const { running, busy, error, run } = useTripProgress(tripId, totalDays);
  // Finish is the lead action on a stay-put day, and whenever there is no
  // mountain to navigate to (its resort row failed to load).
  const finishLeads = stayPut || !navigate;

  const finish = (
    <Button
      key="finish"
      variant={finishLeads ? "primary" : "secondary"}
      onClick={() => run("finish", day)}
      loading={running === "finish"}
      disabled={busy}
      className={finishLeads ? "flex-1" : "shrink-0"}
    >
      {isLastDay ? "Finish trip" : `Finish day ${day}`}
    </Button>
  );
  const nav = navigate && (
    <Button
      key="nav"
      variant={stayPut ? "secondary" : "primary"}
      href={navigate.url}
      target="_blank"
      rel="noopener noreferrer"
      iconLeft={<Icon name="car" />}
      aria-label={`${stayPut ? "Directions" : "Navigate"} to ${navigate.name}`}
      // Shrinks and truncates before anything overflows a 375 px row.
      className={stayPut ? "shrink-0" : "min-w-0 flex-1 [&>span:last-child]:min-w-0 [&>span:last-child]:truncate"}
    >
      {stayPut ? (
        <span className="max-sm:sr-only">Directions</span>
      ) : (
        <>
          <span className="sm:hidden">Navigate</span>
          <span className="max-sm:hidden">Navigate to {navigate.name}</span>
        </>
      )}
    </Button>
  );

  return (
    <>
      {/* Above the phone tab bar when it is showing; the inset padding
          only applies when the bar is not there to cover it. */}
      <style>{`
        .wn-trip-bar { bottom: var(--wn-tab-bar-h, 0px); padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem); }
        @media (max-width: 767px) { html[data-tab-bar="1"] .wn-trip-bar { padding-bottom: 0.5rem; } }
      `}</style>
      <div
        className="wn-trip-bar fixed inset-x-0 z-40 border-t border-wn-line bg-white/95 px-4 pt-2 shadow-[0_-4px_16px_rgba(30,41,82,0.08)] backdrop-blur-sm"
        role="region"
        aria-label="Trip actions"
      >
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          {state === "not_started" && (
            <Button
              onClick={() => run("start")}
              loading={running === "start"}
              disabled={busy}
              iconLeft={<Icon name="skier" />}
              className="flex-1"
            >
              Start trip
            </Button>
          )}
          {state === "active" && (finishLeads ? [finish, nav] : [nav, finish])}
          {state === "complete" && (
            <Button href="/?plan=1" iconLeft={<Icon name="map" />} className="flex-1">
              Plan another trip
            </Button>
          )}
          {/* TripShareButton's controls are Button md / 44 px, the same
              as the buttons beside it. */}
          <TripShareButton tripId={tripId} tripName={tripName} />
        </div>
        {error && (
          <p role="alert" className="mx-auto mt-1 max-w-3xl text-xs text-wn-danger">
            {error}
          </p>
        )}
      </div>
    </>
  );
}
