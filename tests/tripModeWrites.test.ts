// @vitest-environment jsdom
//
// Trip mode's progress writes (app/trip/[id]/TodayCard.tsx useTripProgress)
// against a fake Supabase client. Pins the two guarantees the pure
// transitions in lib/tripProgress cannot pin on their own:
//   * the Today card and the sticky bar both show "Finish day 2"; tapping
//     both finishes day 2 ONCE (one shared in-flight lock per trip), so
//     day 3 is never skipped unseen;
//   * a write RLS silently drops (0 rows, e.g. an expired session) is shown
//     as an error instead of refreshing as if it had saved.
// .ts with createElement because the tests/ glob only picks up .ts files.

import { createElement as h, Fragment } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

type Row = { started_at: string | null; current_day: number | null; completed_days: number[] };
const db: { row: Row; rowsReturned: number; writes: unknown[] } = {
  row: { started_at: "s", current_day: 2, completed_days: [1] },
  rowsReturned: 1,
  writes: [],
};

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    // TripShareButton (inside the sticky bar) looks up the user on mount.
    auth: { getUser: async () => ({ data: { user: null } }) },
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: db.row, error: null }) }) }),
      update: (u: unknown) => ({
        eq: () => ({
          select: async () => {
            db.writes.push(u);
            return { data: Array.from({ length: db.rowsReturned }, () => ({ id: "t" })), error: null };
          },
        }),
      }),
    }),
  }),
}));

import TodayCard from "@/app/trip/[id]/TodayCard";
import TripStickyBar from "@/app/trip/[id]/TripStickyBar";
import { tripToday } from "@/lib/tripToday";

const SLUGS = ["vail", "vail", "aspen"];
const RESORTS = {
  vail: { name: "Vail", state: "CO", lat: 39.6, lng: -106.35 },
  aspen: { name: "Aspen Snowmass", state: "CO", lat: 39.2, lng: -106.9 },
};

function page() {
  const today = tripToday({
    daySlugs: SLUGS,
    totalDays: 3,
    dayPlans: {},
    startedAt: db.row.started_at,
    currentDay: db.row.current_day,
    completedDays: db.row.completed_days,
  });
  return h(
    Fragment,
    null,
    h(TodayCard, {
      tripId: "t",
      today,
      resorts: RESORTS,
      startDate: null,
      drive: null,
      placesEnabled: true,
      canAddPlaces: false,
    }),
    h(TripStickyBar, {
      tripId: "t",
      tripName: "Test trip",
      state: today.state,
      day: today.day,
      totalDays: 3,
      isLastDay: today.nextDay == null,
      stayPut: today.stayPut,
      navigate: { name: "Vail", url: "https://www.google.com/maps/dir/?api=1&destination=39.6,-106.35" },
    }),
  );
}

beforeEach(() => {
  db.row = { started_at: "s", current_day: 2, completed_days: [1] };
  db.rowsReturned = 1;
  db.writes = [];
  refresh.mockClear();
});
afterEach(cleanup);

describe("trip mode writes", () => {
  it("finishes day 2 once when both Finish buttons are tapped", async () => {
    const { getAllByText } = render(page());
    const buttons = getAllByText("Finish day 2");
    expect(buttons).toHaveLength(2);
    await act(async () => {
      fireEvent.click(buttons[0]);
      fireEvent.click(buttons[1]);
    });
    expect(db.writes).toEqual([{ completed_days: [1, 2], current_day: 3 }]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("does not write when the trip already moved past the day (stale page)", async () => {
    // The page still says day 2, but another device finished it.
    const { getAllByText } = render(page());
    db.row = { started_at: "s", current_day: 3, completed_days: [1, 2] };
    await act(async () => {
      fireEvent.click(getAllByText("Finish day 2")[0]);
    });
    expect(db.writes).toEqual([]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("reports a 0-row write as an error instead of refreshing", async () => {
    db.rowsReturned = 0;
    const { getAllByText, findAllByText } = render(page());
    await act(async () => {
      fireEvent.click(getAllByText("Finish day 2")[0]);
    });
    expect(db.writes).toHaveLength(1);
    expect(refresh).not.toHaveBeenCalled();
    expect((await findAllByText(/Couldn't save/)).length).toBeGreaterThan(0);
  });

  it("starts a not-started trip on day 1", async () => {
    db.row = { started_at: null, current_day: null, completed_days: [] };
    const { getAllByText } = render(page());
    await act(async () => {
      fireEvent.click(getAllByText("Start trip")[0]);
    });
    expect(db.writes).toHaveLength(1);
    expect(db.writes[0]).toMatchObject({ current_day: 1, completed_days: [] });
    expect(typeof (db.writes[0] as { started_at: unknown }).started_at).toBe("string");
  });
});
