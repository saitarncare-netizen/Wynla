// Pure helpers for saved trips: list ordering for /trips and the
// day-progress transitions the trip page's action bar applies. Kept
// out of the page modules so they can be unit-tested and so the sticky
// bar and the older TripActions panel agree on what "mark done" means.

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
  /** Only present when the transition changes it (auto-start, or the
   *  undo that empties the trip). */
  started_at?: string | null;
};

/** Mark the current day done and move the focus to the next one. The
 *  first completion also starts the trip: there is no separate Start
 *  button. On the last day the focus stays put. */
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

/** Unmark the highest completed day and rewind the focus to it. When
 *  nothing is left completed the trip returns to "not started". Returns
 *  null when there is nothing to undo. */
export function undoLastCompletedDay(prior: TripProgress): ProgressUpdate | null {
  const completed = prior.completed_days ?? [];
  if (completed.length === 0) return null;
  const last = Math.max(...completed);
  const remaining = completed.filter((d) => d !== last);
  const update: ProgressUpdate = {
    completed_days: remaining,
    current_day: remaining.length === 0 ? null : Math.min(prior.current_day ?? last, last),
  };
  if (remaining.length === 0) update.started_at = null;
  return update;
}
