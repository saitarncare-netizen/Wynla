"use client";

// "+ Trip" — save a nearby restaurant / activity into the trip while
// browsing a mountain (map sheet "Top picks nearby" strip and the resort
// page's "Around the resort" cards). Saitarn's trip-mode ask: collect a
// mountain's places while planning, then at that mountain open the app
// and tap Directions to each.
//
// Where a save lands is decided in lib/saveToTrip.ts: the trip running
// now (started within its own length + 2 days, with a day left here),
// else the next upcoming one, else the last edited with this mountain
// still ahead — whichever includes this mountain — under the first open
// day of that mountain's stop. A trip that is behind the person, or has
// skied every day here, is never saved into: the button offers to plan a
// trip instead (pickSaveTarget). Places belong to the stop; the trip view
// shows them on every day of it. With two trips at a mountain the saved
// line names the trip, since the rule cannot be right every time.
//
// Data. The signed-in user's trips load ONCE per page into a module-level
// store shared by every card (refreshed when it is over a minute old), so
// a strip of twenty cards costs one query and can still show "In trip" on
// places saved earlier. The store is dropped once the last card leaves
// the screen (coming back from the trip page, where places can be
// removed, loads fresh) and whenever Supabase reports another account
// (or none), so one person's trips never show — or get written — under
// the next person's session. A tap re-checks
// the store (refetching when it is stale or has no trip for this
// mountain, since the person may have just signed in or planned one),
// then writes read-merge-write against a fresh copy of the row — same
// reason as app/trip/[id]/DayPlan.tsx: a stale local copy would clobber
// edits made elsewhere. Writes run one at a time, so two quick taps on
// two cards never overwrite each other either.
//
// Layout. Renders inline pieces for a flex-wrap action row: the button,
// a screen-reader status, and (when open) a full-width line pushed to the
// end of the row with order-last, so the card's other actions stay put.

import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { parseDayPlans, type DayPlace } from "@/lib/dayPlans";
import type { NearbyRow } from "@/lib/nearbyCategories";
import {
  addPlaceToStop,
  findPlaceDay,
  hasOpenDayAt,
  hasSeveralTripsAt,
  isMissingColumnError,
  localTodayISO,
  pickSaveTarget,
  pickTargetDay,
  planTripHref,
  removePlaceFromTrip,
  signInHref,
  stopDaysFrom,
  toDayPlace,
  tripLabel,
  type SaveTripRow,
} from "@/lib/saveToTrip";
import { HIT_AREA_44 } from "@/lib/hitArea";
import Icon from "@/components/icons/Icon";

// ---------- Shared trips store (one per page) ----------

type TripsSnapshot =
  | { status: "signed-out"; userId: null; loadedAt: number }
  | {
      status: "error";
      /** The account it failed for; absent when it failed before the
       *  session was read. */
      userId?: string;
      loadedAt: number;
    }
  | {
      status: "ready";
      /** The account these trips belong to (see accountChanged). */
      userId: string;
      trips: SaveTripRow[];
      /** False until the trips.day_plans DDL has run: nothing to save into. */
      dayPlansSupported: boolean;
      /** The viewer's date when the list loaded (upcoming-trip rule). */
      today: string;
      loadedAt: number;
    };

// A tap trusts a list at most this old; after that it refetches, so a
// trip planned in another tab is picked up without a reload.
const STALE_AFTER_MS = 60_000;

// Newest optional columns first: start_date (Sep 2026) and day_plans
// (Jun 2026) are feature-detected, so a missing one is retried without.
const BASE_COLUMNS =
  "id, name, resort_slugs, days_per_resort, total_days, current_day, completed_days, started_at, updated_at";
const LIST_SELECTS = [
  `${BASE_COLUMNS}, start_date, day_plans`,
  `${BASE_COLUMNS}, day_plans`,
  BASE_COLUMNS,
] as const;

let snapshot: TripsSnapshot | null = null;
let inflight: Promise<TripsSnapshot> | null = null;
/** The account the load in flight reads for, once its getSession returns. */
let loadingUserId: string | null | undefined;
/** Bumped when the account changes (accountChanged): a load or write that
 *  started under an earlier generation keeps its result out of the store. */
let generation = 0;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}
function setSnapshot(next: TripsSnapshot) {
  snapshot = next;
  notify();
}
function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
    scheduleRelease();
  };
}
const getSnapshot = () => snapshot;
const getServerSnapshot = () => null;

// Lifetime: the list is only kept while a card shows it. Without this,
// coming back from the trip page (where places can be removed) inside the
// one-minute window would still paint "In trip" from the old list. The
// drop waits one task and checks again: when the map sheet switches
// resort, React unmounts the old cards and subscribes the new ones in the
// same commit, and dropping in between would flash every card back to
// "+ Trip" until a refetch. It also waits for loads and writes in flight
// (each calls back here when it settles), since a load landing after the
// drop would quietly fill the store again.
let pendingWrites = 0;
let releaseTimer: ReturnType<typeof setTimeout> | null = null;
function scheduleRelease() {
  if (listeners.size > 0 || releaseTimer != null) return;
  releaseTimer = setTimeout(() => {
    releaseTimer = null;
    if (listeners.size === 0 && inflight == null && pendingWrites === 0) snapshot = null;
  }, 0);
}

// Account changes. The store outlives a client-side sign-out / sign-in
// (the module stays loaded), so without this the next person on the phone
// would see the previous account's "In trip" marks and a tap would aim at
// that account's trip ids.
let authWatched = false;

/** Listen once per page (browser only, from the first load) for the
 *  account Supabase holds. Never unsubscribed: the store lives as long
 *  as the page. A client without auth events (some tests mock one) just
 *  means no reset. */
function watchAuth() {
  if (authWatched || typeof window === "undefined") return;
  authWatched = true;
  try {
    const { auth } = createSupabaseBrowserClient();
    if (typeof auth?.onAuthStateChange !== "function") return;
    auth.onAuthStateChange((_event, session) => accountChanged(session?.user.id ?? null));
  } catch {
    // No client at all (missing env in a test): the store still works.
  }
}

/**
 * Supabase now holds `userId` (null = signed out). Events for the account
 * already in the store — INITIAL_SESSION, TOKEN_REFRESHED, the SIGNED_IN
 * repeated when a tab regains focus — change nothing. Any other account,
 * or none, empties the store and tells the cards at once; the generation
 * bump keeps a load or write still in flight for the old account out.
 */
function accountChanged(userId: string | null) {
  const differs = (known: string | null | undefined) => known !== undefined && known !== userId;
  if (!differs(snapshot?.userId) && !(inflight && differs(loadingUserId))) return;
  generation++;
  snapshot = null;
  inflight = null;
  loadingUserId = undefined;
  notify();
  // Reload for the cards on screen so the new account's own "In trip"
  // marks show. Deferred out of the callback: the SDK holds its session
  // lock while it notifies, and a query issued inside it would wait on
  // that same lock for its access token (see GuestFavoritesSync).
  if (listeners.size > 0) {
    setTimeout(() => {
      if (listeners.size > 0) void loadTrips(STALE_AFTER_MS);
    }, 0);
  }
}

async function fetchTrips(onSession: (userId: string | null) => void): Promise<TripsSnapshot> {
  const sb = createSupabaseBrowserClient();
  // getSession reads the local cookie (no network); RLS still limits the
  // query to the owner, so a stale session can only see fewer rows.
  const { data: auth } = await sb.auth.getSession();
  const user = auth.session?.user;
  onSession(user?.id ?? null);
  if (!user) return { status: "signed-out", userId: null, loadedAt: Date.now() };
  for (const columns of LIST_SELECTS) {
    const { data, error } = await sb
      .from("trips")
      .select(columns)
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(50);
    if (!error) {
      return {
        status: "ready",
        userId: user.id,
        trips: (data ?? []) as unknown as SaveTripRow[],
        dayPlansSupported: columns.includes("day_plans"),
        today: localTodayISO(new Date()),
        loadedAt: Date.now(),
      };
    }
    if (!isMissingColumnError(error)) break;
  }
  return { status: "error", userId: user.id, loadedAt: Date.now() };
}

/** The cached list when it is fresh enough, else one shared fetch. */
function loadTrips(maxAgeMs = Number.POSITIVE_INFINITY): Promise<TripsSnapshot> {
  watchAuth();
  if (inflight) return inflight;
  if (snapshot && snapshot.status !== "error" && Date.now() - snapshot.loadedAt <= maxAgeMs) {
    return Promise.resolve(snapshot);
  }
  const gen = generation;
  const p: Promise<TripsSnapshot> = fetchTrips((userId) => {
    if (gen === generation) loadingUserId = userId;
  })
    .catch((): TripsSnapshot => ({ status: "error", loadedAt: Date.now() }))
    .then((s) => {
      // Read for an account that has since signed out or switched: keep
      // it out of the store and answer with the current account's list
      // (accountChanged already cleared `inflight`, so this joins or
      // starts that load rather than returning this one).
      if (gen !== generation) return loadTrips();
      setSnapshot(s);
      return s;
    })
    .finally(() => {
      if (inflight === p) {
        inflight = null;
        loadingUserId = undefined;
      }
      scheduleRelease();
    });
  inflight = p;
  return p;
}

/** Keep every card's "In trip" state in step after a write, unless the
 *  account changed while it ran (the store is someone else's now). */
function patchTripPlans(gen: number, tripId: string, dayPlans: unknown) {
  if (gen !== generation || snapshot?.status !== "ready") return;
  setSnapshot({
    ...snapshot,
    trips: snapshot.trips.map((t) => (t.id === tripId ? { ...t, day_plans: dayPlans } : t)),
  });
}

// One write at a time across every card on the page (see header). The
// count lets scheduleRelease wait for them.
let writeChain: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  pendingWrites++;
  const run = writeChain.then(task, task);
  writeChain = run.catch(() => undefined);
  const settle = () => {
    pendingWrites--;
    scheduleRelease();
  };
  void run.then(settle, settle);
  return run;
}

const FRESH_COLUMNS =
  "id, name, resort_slugs, days_per_resort, total_days, current_day, completed_days, started_at, day_plans";

type AddOutcome =
  | { status: "added" | "already" | "full"; day: number; tripName: string }
  | { status: "gone" | "error" };

async function writeAdd(tripId: string, place: DayPlace, resortSlug: string, today: string): Promise<AddOutcome> {
  const gen = generation;
  const sb = createSupabaseBrowserClient();
  const { data, error } = await sb.from("trips").select(FRESH_COLUMNS).eq("id", tripId).maybeSingle();
  if (error) return { status: "error" };
  // No row: deleted since the list loaded, or no longer this session's to
  // see (RLS). Not a network failure, so not "try again": "gone" reloads
  // the list, and the next tap picks from what is really there.
  if (!data) return { status: "gone" };
  const fresh = data as unknown as SaveTripRow;
  // The day is recomputed from the fresh row: the trip may have been
  // re-routed or advanced since the list loaded. `today` keeps an
  // abandoned trip's stale current_day from deciding it.
  const day = pickTargetDay(fresh, resortSlug, today);
  // Every day here ticked done since the list loaded (another tab, the
  // Today card): the list's canSaveInto no longer holds, so this is
  // "gone" too rather than a save into a stop already skied. Only the
  // open-day half is re-checked: the past-trip half needs start_date,
  // which this read leaves out, and finishing a trip closes its days here
  // anyway.
  if (day == null || !hasOpenDayAt(fresh, resortSlug)) return { status: "gone" };
  const current = parseDayPlans(fresh.day_plans);
  const res = addPlaceToStop(current, stopDaysFrom(fresh, day), place);
  if (res.status !== "added") {
    patchTripPlans(gen, tripId, current);
    return { status: res.status, day: res.day, tripName: tripLabel(fresh) };
  }
  // .select("id") turns the RLS 0-row case (signed out in another tab)
  // into a visible error instead of a silent fake success.
  const { data: updated, error: upErr } = await sb
    .from("trips")
    .update({ day_plans: res.dayPlans })
    .eq("id", tripId)
    .select("id");
  if (upErr || !updated || updated.length === 0) return { status: "error" };
  patchTripPlans(gen, tripId, res.dayPlans);
  return { status: "added", day: res.day, tripName: tripLabel(fresh) };
}

type RemoveOutcome = "removed" | "gone" | "error";

async function writeRemove(tripId: string, place: DayPlace): Promise<RemoveOutcome> {
  const gen = generation;
  const sb = createSupabaseBrowserClient();
  const { data, error } = await sb.from("trips").select("day_plans").eq("id", tripId).maybeSingle();
  if (error) return "error";
  // No row: the trip was deleted (or is no longer visible to this
  // session), as in writeAdd. The caller reloads the list.
  if (!data) return "gone";
  const { dayPlans, day } = removePlaceFromTrip(
    parseDayPlans((data as { day_plans?: unknown }).day_plans),
    place.kind,
    place.id,
  );
  if (day != null) {
    const { data: updated, error: upErr } = await sb
      .from("trips")
      .update({ day_plans: dayPlans })
      .eq("id", tripId)
      .select("id");
    if (upErr || !updated || updated.length === 0) return "error";
  }
  patchTripPlans(gen, tripId, dayPlans);
  return "removed";
}

function currentPath(): string {
  return `${window.location.pathname}${window.location.search}`;
}

// ---------- Button ----------

type View =
  | { kind: "none" }
  | { kind: "signin"; href: string }
  | { kind: "no-trip" }
  | { kind: "saved"; day: number; tripId: string; tripName: string }
  | { kind: "in-trip"; day: number; tripId: string; tripName: string }
  | { kind: "full"; day: number; tripId: string; tripName: string }
  | { kind: "removed" }
  | { kind: "error"; text: string };

const NONE: View = { kind: "none" };

// How long a passing confirmation stays on the card. The saved line
// carries Undo, so it gets the longest window.
const LINGER_MS: Partial<Record<View["kind"], number>> = { saved: 8000, full: 6000, removed: 4000 };

// Idle reads as "add" (dashed outline) next to the solid Directions; saved
// turns success-green so a strip shows at a glance what is in the trip.
const IDLE_LOOK = "border border-dashed border-wn-navy/40 bg-white text-wn-navy hover:border-wn-navy hover:bg-wn-navy/5";
const SAVED_LOOK = "border border-wn-success/30 bg-wn-success-bg text-wn-success hover:border-wn-success/60";
// Small text actions inside the status line (Undo, Remove, Open trip).
const LINE_ACTION = `${HIT_AREA_44} inline-flex min-h-9 shrink-0 items-center rounded-wn-sm px-2 text-xs font-bold text-wn-navy underline-offset-2 hover:underline`;

type Props = {
  /** The card's place. Rows without `kind` render nothing (see NearbyRow). */
  row: NearbyRow;
  resortSlug: string;
  resortName: string;
  /** The card's shared action look (NearbyGroup's ACTION: 36 px, 44 px hit
   *  area), so "+ Trip" lines up with Directions and Website. */
  actionClassName: string;
};

export default function SaveToTripButton({ row, resortSlug, resortName, actionClassName }: Props) {
  const place = useMemo(() => toDayPlace(row), [row]);
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [view, setView] = useState<View>(NONE);
  const [busy, setBusy] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const buttonRef = useRef<HTMLButtonElement>(null);
  const lineRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lineId = `${useId()}-save`;

  // Warm the shared store so saved places show "In trip" on first paint
  // after hydration. Every card calls this; only the first one fetches.
  // Coming back from the trip page (where places can be removed) starts
  // from an empty store, since it was dropped when the last card left
  // (scheduleRelease); the age limit covers cards mounted into a strip
  // that stayed on screen.
  useEffect(() => {
    void loadTrips(STALE_AFTER_MS);
  }, []);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  // A tap outside the button or its line closes the line. On "click",
  // not "pointerdown" (DayResortSwap's choice): the line lives in the card
  // flow, so closing it on pointerdown shifts the strip under the finger
  // and the tap lands on whatever moved there — "+ Trip" on the next card
  // could become its Directions. A click has already been delivered when
  // this runs; a swipe through the carousel is not a click at all.
  const open = view.kind !== "none";
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (buttonRef.current?.contains(t) || lineRef.current?.contains(t)) return;
      setView(NONE);
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [open]);

  // Is this place already in the trip a tap would save into? A place kept
  // only in last season's trip is not "In trip": a tap would offer to plan
  // one, and the check mark would promise otherwise.
  const saved = useMemo(() => {
    if (!place || snap?.status !== "ready") return null;
    const trip = pickSaveTarget(snap.trips, resortSlug, snap.today);
    if (!trip) return null;
    const day = findPlaceDay(parseDayPlans(trip.day_plans), place.kind, place.id);
    return day == null ? null : { day, tripId: trip.id, tripName: tripLabel(trip) };
  }, [place, snap, resortSlug]);

  // With two trips at this mountain (say last season's and this one's),
  // "Saved · Day 2" alone does not say which, so the line names the trip.
  const severalTrips = useMemo(
    () => snap?.status === "ready" && hasSeveralTripsAt(snap.trips, resortSlug),
    [snap, resortSlug],
  );

  if (!place) return null;
  // Before the day_plans column exists there is nowhere to save to.
  if (snap?.status === "ready" && !snap.dayPlansSupported) return null;

  function show(next: View, say?: string) {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setView(next);
    if (say) setAnnouncement(say);
    const linger = LINGER_MS[next.kind];
    if (linger) {
      timerRef.current = setTimeout(() => setView((v) => (v === next ? NONE : v)), linger);
    }
  }

  function close() {
    show(NONE);
  }

  async function save(p: DayPlace) {
    setBusy(true);
    show(NONE);
    try {
      const tappedAt = Date.now();
      let s = await loadTrips(STALE_AFTER_MS);
      // pickSaveTarget, not pickTargetTrip: when every trip here is behind
      // the person (finished, abandoned, dated before today) or has
      // skied all its days here, nothing is written and the popover
      // offers to plan a trip — never a silent save into last season's.
      let target = s.status === "ready" ? pickSaveTarget(s.trips, resortSlug, s.today) : null;
      // "No trip" and "signed out" are exactly the answers that go stale
      // when someone follows our own Sign in / Plan a trip links, so they
      // are re-checked against the server before being shown.
      if (!target && s.loadedAt < tappedAt) {
        s = await loadTrips(0);
        target = s.status === "ready" ? pickSaveTarget(s.trips, resortSlug, s.today) : null;
      }
      if (s.status === "signed-out") {
        show({ kind: "signin", href: signInHref(currentPath()) }, "Sign in to save places to a trip.");
        return;
      }
      if (s.status === "error") {
        show({ kind: "error", text: "Couldn't reach your trips. Try again." }, "Couldn't reach your trips.");
        return;
      }
      if (!target) {
        show({ kind: "no-trip" }, `Add ${resortName} to a trip first.`);
        return;
      }
      const tripId = target.id;
      const today = s.today;
      const res = await serialized(() => writeAdd(tripId, p, resortSlug, today));
      switch (res.status) {
        case "added":
          show(
            { kind: "saved", day: res.day, tripId, tripName: res.tripName },
            `Saved ${p.name} to ${res.tripName}, day ${res.day}.`,
          );
          break;
        case "already":
          show(
            { kind: "in-trip", day: res.day, tripId, tripName: res.tripName },
            `${p.name} is already in ${res.tripName}, day ${res.day}.`,
          );
          break;
        case "full":
          show({ kind: "full", day: res.day, tripId, tripName: res.tripName }, `Day ${res.day} of ${res.tripName} is full.`);
          break;
        case "gone":
          // The trip was deleted, or no longer has a day to ski here:
          // refresh the list so the next tap picks again from what is
          // really there.
          void loadTrips(0);
          show({ kind: "error", text: "Your trip changed. Tap again." }, "Your trip changed. Tap again.");
          break;
        default:
          show({ kind: "error", text: "Couldn't save. Try again." }, "Couldn't save. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: DayPlace, tripId: string) {
    setBusy(true);
    try {
      const res = await serialized(() => writeRemove(tripId, p));
      if (res === "removed") {
        show({ kind: "removed" }, `Removed ${p.name} from your trip.`);
      } else if (res === "gone") {
        // The trip is not there to remove from any more. Reload so the
        // card shows what is really saved; "Try again" would only fail
        // the same way.
        void loadTrips(0);
        show({ kind: "error", text: "Your trip changed." }, "Your trip changed.");
      } else {
        show({ kind: "error", text: "Couldn't remove it. Try again." }, "Couldn't remove it.");
      }
    } finally {
      setBusy(false);
      // The Undo / Remove button just unmounted; keep focus on the card.
      buttonRef.current?.focus();
    }
  }

  function onTap() {
    if (busy || !place) return;
    // A second tap closes whatever the first one opened.
    if (view.kind === "signin" || view.kind === "no-trip" || view.kind === "in-trip") {
      close();
      return;
    }
    if (saved) {
      show({ kind: "in-trip", ...saved });
      return;
    }
    void save(place);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape" && open) {
      e.stopPropagation();
      close();
      buttonRef.current?.focus();
    }
  }

  const inTrip = saved != null;
  const expandable = view.kind === "signin" || view.kind === "no-trip" || view.kind === "in-trip" || inTrip;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onTap}
        onKeyDown={onKeyDown}
        aria-busy={busy || undefined}
        aria-expanded={expandable ? open : undefined}
        aria-controls={open ? lineId : undefined}
        aria-label={
          busy
            ? `Saving ${place.name} to trip`
            : saved
              ? `In trip: ${place.name}, day ${saved.day} of ${saved.tripName}`
              : `Add ${place.name} to trip`
        }
        title={saved ? `In ${saved.tripName} · Day ${saved.day}` : `Save ${place.name} to your trip`}
        className={`${actionClassName} ${inTrip ? SAVED_LOOK : IDLE_LOOK}`}
      >
        {busy ? (
          <Icon name="spinner" className="h-3.5 w-3.5 motion-safe:animate-spin" />
        ) : inTrip ? (
          <Icon name="check" className="h-3.5 w-3.5" />
        ) : (
          <span aria-hidden="true" className="text-sm leading-none">
            +
          </span>
        )}
        {inTrip ? (
          // "✓ In trip" needs ~70 px, which on a 180 px compact card no
          // longer fits beside Directions; there it reads "✓ Trip" so the
          // button keeps its place instead of jumping to the next line.
          // Outside an @container ancestor the full label always shows.
          <>
            <span className="@max-[169px]:hidden">In trip</span>
            <span className="hidden @max-[169px]:inline">Trip</span>
          </>
        ) : (
          "Trip"
        )}
      </button>

      <span role="status" className="sr-only">
        {announcement}
      </span>

      {open && (
        <div id={lineId} ref={lineRef} onKeyDown={onKeyDown} className="order-last basis-full">
          {view.kind === "signin" || view.kind === "no-trip" ? (
            // Tiny navy popover: the one gold CTA sits on a navy surface,
            // per the design guide.
            <div className="on-dark rounded-wn-sm bg-wn-navy p-2 text-xs text-white shadow-wn-md">
              <p className="font-semibold leading-snug">
                {view.kind === "signin" ? "Sign in to save places to a trip" : `Add ${resortName} to a trip first`}
              </p>
              <Link
                href={view.kind === "signin" ? view.href : planTripHref(resortSlug)}
                className={`${HIT_AREA_44} mt-2 flex min-h-9 w-full items-center justify-center gap-1 rounded-wn-sm bg-wn-gold px-2 text-xs font-bold text-wn-navy transition hover:bg-wn-gold/90`}
              >
                {view.kind === "signin" ? "Sign in" : "Plan a trip here"}
                <Icon name="arrow-right" className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            // "Day N" is the fact the person needs, so it never truncates;
            // only a trip name does ("Vail + Aspen 5d" is wider than what a
            // 180 px card leaves beside Remove / Undo).
            <div className="flex min-h-9 items-center justify-between gap-1 text-xs">
              {view.kind === "saved" && (
                <>
                  <span className="flex min-w-0 flex-col" title={`Saved to ${view.tripName} · Day ${view.day}`}>
                    <span className="inline-flex items-center gap-1 whitespace-nowrap font-semibold text-wn-success">
                      <Icon name="check" className="h-3.5 w-3.5 shrink-0" />
                      Saved · Day {view.day}
                    </span>
                    {/* Two text-xs rows still fit the line's 36 px, so
                        naming the trip does not shift the card. */}
                    {severalTrips && <span className="truncate text-wn-muted">in {view.tripName}</span>}
                  </span>
                  <button type="button" disabled={busy} onClick={() => void remove(place, view.tripId)} className={LINE_ACTION}>
                    Undo
                  </button>
                </>
              )}
              {view.kind === "in-trip" && (
                <>
                  <span className="flex min-w-0 font-semibold text-wn-muted" title={`${view.tripName} · Day ${view.day}`}>
                    <span className="shrink-0 whitespace-nowrap">Day {view.day}</span>{" "}
                    <span className="ml-1 min-w-0 truncate">· {view.tripName}</span>
                  </span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void remove(place, view.tripId)}
                    aria-label={`Remove ${place.name} from your trip`}
                    className={LINE_ACTION}
                  >
                    Remove
                  </button>
                </>
              )}
              {view.kind === "full" && (
                <>
                  <span className="min-w-0 font-semibold text-wn-warning" title={`${view.tripName} · Day ${view.day} is full`}>
                    Day {view.day} is full
                  </span>
                  <Link href={`/trip/${view.tripId}`} title={`Open ${view.tripName}`} className={LINE_ACTION}>
                    Open trip
                  </Link>
                </>
              )}
              {view.kind === "removed" && <span className="font-semibold text-wn-muted">Removed from your trip</span>}
              {view.kind === "error" && <span className="font-semibold text-wn-danger">{view.text}</span>}
            </div>
          )}
        </div>
      )}
    </>
  );
}
