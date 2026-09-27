// Pure helpers for saved trips: list ordering for /trips and the
// day-progress transitions trip mode applies (Start trip, Undo start,
// Finish day, Undo, Restart). Kept out of the page modules so they can be unit-tested
// and so the Today card, the sticky bar and the Trip controls panel
// agree on what each tap means. The browser writes live in one client
// hook (useTripProgress in app/trip/[id]/TodayCard.tsx).

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export type TripListRow = {
  created_at: string;
  /** Absent until the 2026-09-23 DDL adds the column; null when unset. */
  start_date?: string | null;
  started_at: string | null;
  total_days: number;
  completed_days: number[] | null;
};

export function tripStartDate(t: Pick<TripListRow, "start_date">): string | null {
  return typeof t.start_date === "string" && ISO_DATE.test(t.start_date) ? t.start_date : null;
}

export function tripFinished(t: Pick<TripListRow, "started_at" | "total_days" | "completed_days">): boolean {
  return t.started_at != null && (t.completed_days ?? []).length >= t.total_days;
}

/** Scheduled trips (start_date on or after today) soonest first, then
 *  everything else newest first. Past-dated trips fall into the second
 *  group, so a trip that already happened never sits above next week's. */
export function sortTrips<T extends TripListRow>(trips: T[], todayISO: string): T[] {
  const upcoming = trips
    .filter((t) => (tripStartDate(t) ?? "") >= todayISO)
    .sort(
      (a, b) =>
        tripStartDate(a)!.localeCompare(tripStartDate(b)!) || b.created_at.localeCompare(a.created_at),
    );
  const seen = new Set(upcoming);
  const rest = trips.filter((t) => !seen.has(t)).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return [...upcoming, ...rest];
}

// ---------- Day progress ----------

export type TripProgress = {
  started_at: string | null;
  current_day: number | null;
  completed_days: number[] | null;
};

export type ProgressUpdate = {
  completed_days: number[];
  current_day: number | null;
  /** Only present when the transition changes it (start, restart, or the
   *  legacy auto-start in completeCurrentDay). */
  started_at?: string | null;
};

/** Start trip mode on day 1. Null when the trip is already started: the
 *  Today card and the sticky bar both offer Start, and a page left open
 *  on another device must never wipe the progress made there. */
export function startTrip(prior: TripProgress, nowISO: string): ProgressUpdate | null {
  if (prior.started_at) return null;
  return { started_at: nowISO, current_day: 1, completed_days: [] };
}

/** Back to "not started": every finished day is cleared. Only for the
 *  explicit "Restart trip" buttons; "Undo start" goes through undoStart. */
export function restartTrip(): ProgressUpdate {
  return { started_at: null, current_day: null, completed_days: [] };
}

/** Take back an accidental Start tap: back to "not started", but only
 *  while the trip is started and no day is finished yet. Null otherwise,
 *  the reverse of startTrip's guard: a page rendered right after Start and
 *  left open (a laptop tab, a second phone) still shows "Undo start" after
 *  days were finished elsewhere, and that stale tap must never wipe them. */
export function undoStart(prior: TripProgress): ProgressUpdate | null {
  if (!prior.started_at) return null;
  if ((prior.completed_days ?? []).length > 0) return null;
  return restartTrip();
}

/** The day the trip is on: current_day clamped to 1..totalDays, moved
 *  forward past a day that is already finished (a hand-edited or legacy
 *  row) so "Finish day N" never offers a day that is done. On a fully
 *  finished trip it is the last day. */
export function effectiveCurrentDay(prior: TripProgress, totalDays: number): number {
  const last = Math.max(1, totalDays);
  const done = new Set(prior.completed_days ?? []);
  let day = Math.min(Math.max(prior.current_day ?? 1, 1), last);
  while (day < last && done.has(day)) day++;
  return day;
}

/** Finish exactly the day the button showed. Null (the caller just
 *  resyncs) when the trip is not started, is already past that day, or
 *  already finished it: two Finish buttons and a second device can all
 *  tap "Finish day 2", and only the first may count, or the trip would
 *  skip day 3 unseen. */
export function finishDay(prior: TripProgress, day: number, totalDays: number, nowISO: string): ProgressUpdate | null {
  if (!prior.started_at) return null;
  if ((prior.completed_days ?? []).includes(day)) return null;
  if (effectiveCurrentDay(prior, totalDays) !== day) return null;
  return completeCurrentDay({ ...prior, current_day: day }, totalDays, nowISO);
}

/** Mark the current day done and move the focus to the next one. On the
 *  last day the focus stays put. A trip that was never started is
 *  started by its first completion (the pre-"Start trip" behaviour, kept
 *  for callers without a Start button); trip mode goes through finishDay,
 *  which refuses an unstarted trip. */
export function completeCurrentDay(prior: TripProgress, totalDays: number, nowISO: string): ProgressUpdate {
  const today = prior.current_day ?? 1;
  const completed = Array.from(new Set([...(prior.completed_days ?? []), today])).sort((a, b) => a - b);
  const update: ProgressUpdate = {
    completed_days: completed,
    current_day: today + 1 > totalDays ? today : today + 1,
  };
  if (!prior.started_at) update.started_at = nowISO;
  return update;
}

/** Unmark the highest completed day and rewind the focus to it. The trip
 *  stays started even when nothing is left completed: starting is its own
 *  tap now, so undoing "Finish day 1" lands on an active day 1, not back
 *  on the Start screen (Restart is the way back there). Returns null when
 *  there is nothing to undo.
 *
 *  `expectedDay` is the N the tapped "Undo day N" button showed. When the
 *  latest finished day is no longer N (a page left open while day N+1 was
 *  finished on another device, or the other Undo button already ran) the
 *  tap is stale: null, and the caller just resyncs, instead of silently
 *  unmarking a day the person never saw on that button. */
export function undoLastCompletedDay(prior: TripProgress, expectedDay?: number): ProgressUpdate | null {
  const completed = prior.completed_days ?? [];
  if (completed.length === 0) return null;
  const last = Math.max(...completed);
  if (expectedDay !== undefined && last !== expectedDay) return null;
  return {
    completed_days: completed.filter((d) => d !== last),
    current_day: Math.min(prior.current_day ?? last, last),
  };
}
