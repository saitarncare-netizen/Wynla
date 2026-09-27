"use client";

// Trip mode's "Today" card: the first thing on /trip/[id]. Saitarn's ask
// (2026-09-27): Start trip -> Google Maps to mountain 1 only; at the
// mountain, open the app and see the places saved for it, each one tap
// from directions; Finish day 1 -> day 2's mountain and ITS places. A
// multi-night stay keeps the same mountain and the same places (the model
// in lib/tripToday.ts does that union; this file only renders it).
//
// Before this, trip mode had no Start button (the first "Mark day done"
// silently started it), one whole-trip Google Maps link at the bottom of
// the page, and saved places that opened a map search. The card puts the
// one action that matters today at the top, on a navy surface so the gold
// CTA follows the design guide (gold only on navy, one per screen).
//
// useTripProgress is the ONE client path for progress writes (Start,
// Undo start, Finish, Undo, Restart); the sticky bar and the Trip controls
// panel call it too, so the three never disagree. Every write but the
// explicit Restart is read-then-write, and every write gets .select("id").

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  finishDay,
  restartTrip,
  startTrip,
  undoLastCompletedDay,
  undoStart,
  type ProgressUpdate,
  type TripProgress,
} from "@/lib/tripProgress";
import { placeCategoryLabel, type TodayModel } from "@/lib/tripToday";
import { placeKey } from "@/lib/dayPlans";
import { resortNameFromSlug } from "@/lib/tripLabels";
import { mapsDirectionsUrl } from "@/lib/nearbyCategories";
import { directionsUrl } from "@/components/Map/ResortSheetMath";
import { formatDriveTime } from "@/lib/origins";
import Button, { buttonClasses } from "@/components/ui/Button";
import Notice from "@/components/ui/Notice";
import Icon from "@/components/icons/Icon";
import { OPEN_DAY_PLAN_EVENT } from "./DayPlan";

// ---------- Dates on the viewer's clock ----------

/** Today as YYYY-MM-DD on the viewer's clock (the date input's min). */
export function todayIsoDate(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

// A bare YYYY-MM-DD parsed part-by-part, so it stays on that calendar
// day in every time zone (new Date(string) would read UTC midnight).
function parseIsoDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d);
}

const noopSubscribe = () => () => {};

/**
 * "Starts Sat, Feb 14, 2027 · in 12 days" for the trip page hero and the
 * Today card. A client component because "in N days" depends on the
 * viewer's clock: computed on the server (UTC on Vercel) it could be a
 * day off around midnight US time. The server render and the first
 * client render show only the date; the relative part appears once the
 * client knows its own today (useSyncExternalStore keeps the two in
 * agreement, so there is no hydration mismatch).
 */
export function StartDateBadge({ isoDate }: { isoDate: string }) {
  const today = useSyncExternalStore(noopSubscribe, todayIsoDate, () => null);
  const start = parseIsoDate(isoDate);
  const pretty = start.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: today && start.getFullYear() === parseIsoDate(today).getFullYear() ? undefined : "numeric",
  });
  if (!today) return <span>Starts {pretty}</span>;
  const diffDays = Math.round((start.getTime() - parseIsoDate(today).getTime()) / 86_400_000);
  const relative =
    diffDays === 0
      ? "today"
      : diffDays === 1
        ? "tomorrow"
        : diffDays > 1
          ? `in ${diffDays} days`
          : diffDays === -1
            ? "yesterday"
            : `${-diffDays} days ago`;
  return (
    <span>
      Starts {pretty} · {relative}
    </span>
  );
}

// ---------- Shared progress writes ----------

/** "unstart" is the guarded "Undo start" (refuses once a day is finished);
 *  "restart" is the explicit "Restart trip" and clears everything. */
export type ProgressAction = "start" | "unstart" | "finish" | "undo" | "restart";

// One progress write per trip at a time, across every mounted control.
// The Today card and the sticky bar both show Finish; without a shared
// lock a quick tap on each would read the same row twice. finishDay()
// already refuses the second write, but sharing the busy state also
// greys out the other button so it never looks tappable mid-save.
const inflight = new Map<string, ProgressAction>();
const inflightListeners = new Set<() => void>();

function subscribeInflight(cb: () => void) {
  inflightListeners.add(cb);
  return () => {
    inflightListeners.delete(cb);
  };
}

function setInflight(tripId: string, action: ProgressAction | null) {
  if (action) inflight.set(tripId, action);
  else inflight.delete(tripId);
  inflightListeners.forEach((cb) => cb());
}

const LOAD_ERROR = "Couldn't load the trip. Check your connection and try again.";
const SAVE_ERROR = "Couldn't save. Check your connection, or sign in again and retry.";

export function useTripProgress(tripId: string, totalDays: number) {
  const router = useRouter();
  // SSR-aware browser client: reads the session from the auth cookies, so
  // a fresh magic-link login is signed in here too (see TripActions).
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const running = useSyncExternalStore(
    subscribeInflight,
    () => inflight.get(tripId) ?? null,
    () => null,
  );

  // Read-then-write so a tap on a page left open all day applies to the
  // trip's real state, and the pure transitions return null when that
  // state already moved on (another tab, the other button): then there
  // is nothing to write and the page just resyncs. .select("id") turns
  // the RLS 0-row case (session expired) into a visible error instead of
  // a silent fake success. Only "restart" skips the read: it is the
  // explicit "Restart trip" tap, and its result is the same whatever the
  // row holds. "Undo start" is "unstart", which reads first so a stale
  // page never clears days finished on another device.
  // `day` is the day the tapped button showed: "Finish day N" finishes N
  // only, and "Undo day N" undoes N only (a page left open while day N+1
  // was finished elsewhere must not unmark N+1, a day that button never
  // named). Omitted, finish refuses and undo takes the latest day.
  async function run(action: ProgressAction, day?: number): Promise<void> {
    if (inflight.has(tripId)) return;
    setInflight(tripId, action);
    setError(null);
    try {
      let update: ProgressUpdate | null = restartTrip();
      if (action !== "restart") {
        const { data: prior, error: readErr } = await supabase
          .from("trips")
          .select("started_at, current_day, completed_days")
          .eq("id", tripId)
          .maybeSingle<TripProgress>();
        if (readErr || !prior) {
          setError(LOAD_ERROR);
          return;
        }
        const now = new Date().toISOString();
        update =
          action === "start"
            ? startTrip(prior, now)
            : action === "unstart"
              ? undoStart(prior)
              : action === "finish"
                ? finishDay(prior, day ?? 0, totalDays, now)
                : undoLastCompletedDay(prior, day);
      }
      if (update) {
        const { data, error: writeErr } = await supabase
          .from("trips")
          .update(update)
          .eq("id", tripId)
          .select("id");
        if (writeErr || !data || data.length === 0) {
          setError(SAVE_ERROR);
          return;
        }
      }
      startTransition(() => router.refresh());
    } catch {
      setError(LOAD_ERROR);
    } finally {
      setInflight(tripId, null);
    }
  }

  return { running, busy: running != null || refreshing, error, run };
}

// ---------- The card ----------

export type TodayResortInfo = { name: string; state: string; lat: number; lng: number };

type Props = {
  tripId: string;
  today: TodayModel;
  /** Details for today's and tomorrow's mountains, keyed by slug. */
  resorts: Record<string, TodayResortInfo>;
  /** Planned first ski day (YYYY-MM-DD) or null. */
  startDate: string | null;
  /** Estimated drive into today's mountain; null when there is none. */
  drive: { seconds: number; fromLabel: string } | null;
  /** False until the day_plans column exists: hides the places block. */
  placesEnabled: boolean;
  /** Today's mountain has nearby places to add in its day card below. */
  canAddPlaces: boolean;
};

export default function TodayCard({ tripId, today, resorts, startDate, drive, placesEnabled, canAddPlaces }: Props) {
  const { running, busy, error, run } = useTripProgress(tripId, today.totalDays);
  const resort = today.slug ? resorts[today.slug] : undefined;
  // A slug the resorts table no longer knows (renamed or merged since the
  // trip was saved) reads "Mohawk", not the raw "mohawk".
  const resortName = resort?.name || resortNameFromSlug(today.slug ?? "") || "your first stop";
  const navUrl = resort ? directionsUrl(resort.lat, resort.lng) : null;
  // The day the "Undo day N" buttons name; passed to the write so a stale
  // page undoes that day or nothing (lib/tripProgress undoLastCompletedDay).
  const undoDay = today.lastCompletedDay;

  // When a tap moves the trip on (Start, Finish, Undo) the button that
  // had focus is gone; move focus to the new heading so keyboard and
  // screen-reader users land on "Today · Day 3" instead of <body>. Only
  // when focus was actually lost or inside this card: a Finish tapped in
  // the sticky bar keeps its focus there. preventScroll keeps the page
  // still for sighted users who tapped far below.
  const cardRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepKey = `${today.state}:${today.day}:${today.completedCount}`;
  const lastStepKey = useRef(stepKey);
  useEffect(() => {
    if (lastStepKey.current === stepKey) return;
    lastStepKey.current = stepKey;
    const active = document.activeElement;
    if (!active || active === document.body || cardRef.current?.contains(active)) {
      headingRef.current?.focus({ preventScroll: true });
    }
  }, [stepKey]);

  const eyebrow =
    today.state === "active"
      ? `Today · Day ${today.day} of ${today.totalDays}`
      : today.state === "complete"
        ? `All ${today.totalDays} day${today.totalDays === 1 ? "" : "s"} done`
        : "🎿 Trip mode";

  return (
    <section
      ref={cardRef}
      id="today"
      aria-labelledby="today-title"
      className="mb-6 overflow-hidden rounded-wn-lg border border-wn-navy/15 bg-white shadow-wn-md"
    >
      {/* Navy top: where we are + the one big action. `on-dark` turns the
          focus ring gold on this surface. */}
      <div
        className="on-dark px-4 py-5 text-white sm:px-6"
        style={{
          background: "linear-gradient(150deg, var(--color-wn-navy) 0%, var(--color-wn-navy-deep) 100%)",
        }}
      >
        <p className="text-eyebrow font-semibold uppercase text-white/70">{eyebrow}</p>
        <h2
          id="today-title"
          ref={headingRef}
          tabIndex={-1}
          className="mt-1 text-wn-2xl font-extrabold tracking-tight text-white"
        >
          {today.state === "not_started" ? (
            "Ready when you are"
          ) : today.state === "complete" ? (
            "Trip complete 🎉"
          ) : (
            <>
              {resortName}
              {resort?.state && <span className="ml-2 text-base font-semibold text-white/70">{resort.state}</span>}
            </>
          )}
        </h2>

        {today.state === "not_started" && (
          <div className="mt-1 space-y-0.5 text-sm text-white/85">
            {startDate && (
              <p>
                <StartDateBadge isoDate={startDate} />
              </p>
            )}
            <p>Day 1 · {resortName}</p>
          </div>
        )}
        {today.state === "active" && today.stayPut && (
          <p className="mt-1 text-sm text-white/85">You&apos;re staying at {resortName} — no drive today</p>
        )}
        {today.state === "active" && !today.stayPut && drive && drive.seconds > 0 && (
          // ≈ marks the drive as a Wynla estimate (straight-line based).
          <p className="mt-1 text-sm text-white/85">
            ≈ {formatDriveTime(drive.seconds)} drive from {drive.fromLabel}
          </p>
        )}
        {today.state === "complete" && (
          <p className="mt-1 text-sm text-white/85">Hope the snow was good. Ready for the next one?</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          {today.state === "not_started" && (
            <>
              <Button
                variant="gold"
                onClick={() => run("start")}
                loading={running === "start"}
                disabled={busy}
                iconLeft={<Icon name="skier" />}
                className="w-full sm:w-auto"
              >
                Start trip
              </Button>
              {navUrl && (
                <a
                  href={navUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-wn-sm text-sm font-semibold text-white underline-offset-4 hover:underline"
                >
                  <Icon name="car" className="h-4 w-4" />
                  Directions to {resortName}
                </a>
              )}
            </>
          )}
          {today.state === "active" && navUrl && (
            <Button
              variant={today.stayPut ? "secondary" : "gold"}
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              iconLeft={<Icon name="car" />}
              // Long resort names truncate instead of pushing the button
              // past a 375 px card.
              className="w-full max-w-full sm:w-auto [&>span:last-child]:min-w-0 [&>span:last-child]:truncate"
            >
              {today.stayPut ? `Directions to ${resortName}` : `Navigate to ${resortName}`}
            </Button>
          )}
          {today.state === "complete" && (
            <Button variant="gold" href="/?plan=1" iconLeft={<Icon name="map" />} className="w-full sm:w-auto">
              Plan another trip
            </Button>
          )}
        </div>
      </div>

      {/* White body: today's places and the day's check-off. */}
      <div className="px-4 py-4 sm:px-6 sm:py-5">
        {error && (
          <Notice tone="danger" className="mb-3">
            {error}
          </Notice>
        )}

        {today.state === "not_started" && (
          <ul className="space-y-2 text-sm text-wn-charcoal">
            <li className="flex gap-2">
              <span aria-hidden="true">🚗</span>
              <span>
                <strong className="text-wn-navy">Navigate</strong> to each day&apos;s mountain in Google Maps
              </span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">🍽️</span>
              <span>See the restaurants and things to do you saved there, one tap from directions</span>
            </li>
            <li className="flex gap-2">
              <span aria-hidden="true">✅</span>
              <span>
                <strong className="text-wn-navy">Finish the day</strong> and tomorrow&apos;s stop is ready
              </span>
            </li>
          </ul>
        )}

        {today.state === "active" && (
          <>
            {placesEnabled && (
              <TodayPlaces
                today={today}
                resortName={resortName}
                canAddPlaces={canAddPlaces}
              />
            )}
            <div className={`flex flex-wrap items-center gap-2 ${placesEnabled ? "mt-4 border-t border-wn-line pt-4" : ""}`}>
              <Button
                onClick={() => run("finish", today.day)}
                loading={running === "finish"}
                disabled={busy}
                iconLeft={<Icon name="check" />}
                className="flex-1 sm:flex-none"
              >
                {today.nextDay ? `Finish day ${today.day}` : "Finish trip"}
              </Button>
              {undoDay != null ? (
                <Button
                  variant="ghost"
                  onClick={() => run("undo", undoDay)}
                  loading={running === "undo"}
                  disabled={busy}
                  title={`Unmark day ${undoDay}`}
                >
                  Undo day {undoDay}
                </Button>
              ) : (
                // Nothing finished yet: the only thing to undo is the
                // Start tap itself (an accidental start the night before).
                // "unstart", not "restart": it re-reads the row and does
                // nothing if days were finished since this page rendered.
                <Button variant="ghost" onClick={() => run("unstart")} loading={running === "unstart"} disabled={busy}>
                  Undo start
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-wn-muted">
              {today.nextDay
                ? today.nextDay.sameStop
                  ? `Tomorrow: another day at ${resortName}`
                  : `Tomorrow: ${resorts[today.nextDay.slug]?.name || resortNameFromSlug(today.nextDay.slug)}`
                : "Last day. Finish the trip when you head home."}
            </p>
          </>
        )}

        {today.state === "complete" && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="secondary" onClick={() => run("restart")} loading={running === "restart"} disabled={busy}>
                Restart trip
              </Button>
              {undoDay != null && (
                <Button
                  variant="ghost"
                  onClick={() => run("undo", undoDay)}
                  loading={running === "undo"}
                  disabled={busy}
                >
                  Undo day {undoDay}
                </Button>
              )}
            </div>
            <p className="mt-2 text-xs text-wn-muted">Restart clears the finished days so you can ride it again.</p>
          </>
        )}
      </div>
    </section>
  );
}

function TodayPlaces({
  today,
  resortName,
  canAddPlaces,
}: {
  today: TodayModel;
  resortName: string;
  canAddPlaces: boolean;
}) {
  const places = today.placesForStop;
  const stopDays = today.stop?.days ?? [];
  const addHref = `#day-${today.day}`;
  // The anchor scrolls to today's day card; the event opens its add list
  // so the rider lands on the places, not on a closed toggle.
  const openAddList = () => window.dispatchEvent(new CustomEvent(OPEN_DAY_PLAN_EVENT, { detail: today.day }));

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-base font-bold text-wn-navy">Your places around {resortName}</h3>
        {places.length > 0 && <span className="shrink-0 text-xs font-semibold text-wn-muted tabular-nums">{places.length}</span>}
      </div>
      {stopDays.length > 1 && (
        <p className="mt-0.5 text-xs text-wn-muted">
          For your whole stay here, days {stopDays[0]}–{stopDays[stopDays.length - 1]}
        </p>
      )}

      {places.length === 0 ? (
        <div className="mt-2 rounded-wn-sm border border-dashed border-wn-line bg-wn-offwhite px-3 py-3">
          <p className="text-sm text-wn-charcoal">
            {canAddPlaces
              ? "No places saved yet — add restaurants and things to do below"
              : "No places saved for this mountain."}
          </p>
          {canAddPlaces && (
            <a href={addHref} onClick={openAddList} className={buttonClasses({ variant: "secondary", className: "mt-2" })}>
              <Icon name="chevron-down" className="h-4 w-4" />
              Add places for today
            </a>
          )}
        </div>
      ) : (
        <>
          <ul className="mt-2 divide-y divide-wn-line">
            {places.map((p) => (
              <li key={placeKey(p)} className="flex min-h-14 items-center gap-3 py-2">
                <span aria-hidden="true" className="text-lg leading-none">
                  {p.kind === "restaurant" ? "🍽️" : "🎯"}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-wn-charcoal">{p.name}</p>
                  <p className="truncate text-xs text-wn-muted">{placeCategoryLabel(p)}</p>
                </div>
                <Button
                  variant="secondary"
                  href={mapsDirectionsUrl(p.name, p.latitude, p.longitude)}
                  target="_blank"
                  rel="noopener noreferrer"
                  iconLeft={<Icon name="car" />}
                  aria-label={`Directions to ${p.name}`}
                  className="shrink-0"
                >
                  Directions
                </Button>
              </li>
            ))}
          </ul>
          {canAddPlaces && (
            <a
              href={addHref}
              onClick={openAddList}
              className="mt-1 inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-wn-navy underline-offset-4 hover:underline"
            >
              <span aria-hidden="true">+</span> Add more places
            </a>
          )}
        </>
      )}
    </div>
  );
}
