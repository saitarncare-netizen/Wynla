// @vitest-environment jsdom
//
// Trip mode's progress writes (app/trip/[id]/TodayCard.tsx useTripProgress)
// against a fake Supabase client. Pins the two guarantees the pure
// transitions in lib/tripProgress cannot pin on their own:
//   * the Today card and the sticky bar both show "Finish day 2"; tapping
//     both finishes day 2 ONCE (one shared in-flight lock per trip), so
//     day 3 is never skipped unseen;
//   * a write RLS silently drops (0 rows, e.g. an expired session) is shown
//     as an error instead of refreshing as if it had saved;
//   * "Undo start" on a page left open since Start re-reads the row, so it
//     never clears days finished on another device; a stale "Undo day N"
//     undoes day N or nothing, never a later day finished elsewhere.
// And the day card's day_plans writes (app/trip/[id]/DayPlan.tsx): each is
// a delta on the freshly read row, so a place saved with "+ Trip" from
// the map sheet or another tab after this page loaded survives a note
// edit, and a remove / add touches only that one place.
// .ts with createElement because the tests/ glob only picks up .ts files.

import { createElement as h, Fragment } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render } from "@testing-library/react";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));

type Row = {
  started_at: string | null;
  current_day: number | null;
  completed_days: number[];
  day_plans?: unknown;
};
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
      update: (u: Partial<Row>) => ({
        eq: () => ({
          select: async () => {
            db.writes.push(u);
            // A write that lands is what the next read sees.
            if (db.rowsReturned > 0) db.row = { ...db.row, ...u };
            return { data: Array.from({ length: db.rowsReturned }, () => ({ id: "t" })), error: null };
          },
        }),
      }),
    }),
  }),
}));

import TodayCard from "@/app/trip/[id]/TodayCard";
import TripStickyBar from "@/app/trip/[id]/TripStickyBar";
import DayPlan, { type NearbyOption, type TodayCardStay } from "@/app/trip/[id]/DayPlan";
import { tripToday } from "@/lib/tripToday";
import type { DayPlace, DayPlans } from "@/lib/dayPlans";

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
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

/** Let the queued read-then-write promise chains settle. */
async function settle() {
  await act(async () => {
    for (let i = 0; i < 20; i++) await Promise.resolve();
  });
}

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

  it("Undo start on a fresh start returns the trip to not started", async () => {
    db.row = { started_at: "s", current_day: 1, completed_days: [] };
    const { getByText } = render(page());
    await act(async () => {
      fireEvent.click(getByText("Undo start"));
    });
    expect(db.writes).toEqual([{ started_at: null, current_day: null, completed_days: [] }]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("a stale Undo start never wipes days finished elsewhere", async () => {
    // Rendered right after Start, left open; days 1-2 were finished on
    // another device since.
    db.row = { started_at: "s", current_day: 1, completed_days: [] };
    const { getByText } = render(page());
    db.row = { started_at: "s", current_day: 3, completed_days: [1, 2] };
    await act(async () => {
      fireEvent.click(getByText("Undo start"));
    });
    expect(db.writes).toEqual([]);
    expect(refresh).toHaveBeenCalledTimes(1);
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

  it("Undo day N unmarks day N", async () => {
    const { getByText } = render(page());
    await act(async () => {
      fireEvent.click(getByText("Undo day 1"));
    });
    expect(db.writes).toEqual([{ completed_days: [], current_day: 1 }]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("a stale 'Undo day 1' never unmarks day 2 finished elsewhere", async () => {
    // Rendered after day 1 was finished; day 2 was finished on another
    // device since. The button still says "Undo day 1".
    const { getByText } = render(page());
    db.row = { started_at: "s", current_day: 3, completed_days: [1, 2] };
    await act(async () => {
      fireEvent.click(getByText("Undo day 1"));
    });
    expect(db.writes).toEqual([]);
    expect(refresh).toHaveBeenCalledTimes(1);
  });
});

describe("Today card names", () => {
  it("names a mountain the resorts table no longer knows from its slug", () => {
    const today = tripToday({
      daySlugs: ["mohawk", "burke-vt"],
      totalDays: 2,
      dayPlans: {},
      startedAt: "s",
      currentDay: 1,
      completedDays: [],
    });
    const { getByRole, getByText } = render(
      h(TodayCard, {
        tripId: "t",
        today,
        resorts: {},
        startDate: null,
        drive: null,
        placesEnabled: false,
        canAddPlaces: false,
      }),
    );
    expect(getByRole("heading", { level: 2 }).textContent).toBe("Mohawk");
    expect(getByText("Tomorrow: Burke VT")).toBeTruthy();
  });
});

// ---------- DayPlan: day_plans writes are deltas on the fresh row ----------

const spot = (id: number, name: string, kind: DayPlace["kind"] = "restaurant"): DayPlace => ({
  id,
  kind,
  name,
  category: null,
  latitude: 39.6,
  longitude: -106.3,
  website_url: null,
});
const option = (p: DayPlace, is_recommended = false): NearbyOption => ({ ...p, is_recommended });

const TACOS = spot(1, "Tacos");
const PIZZA = spot(2, "Pizza");
const RAMEN = spot(3, "Ramen");

function dayPlan(
  initialPlans: DayPlans,
  over: { day?: number; nearby?: NearbyOption[]; savedElsewhere?: string[]; continuesStay?: boolean; todayCard?: TodayCardStay } = {},
) {
  return h(DayPlan, {
    tripId: "t",
    day: over.day ?? 1,
    initialPlans,
    nearby: over.nearby ?? [],
    savedElsewhere: over.savedElsewhere,
    continuesStay: over.continuesStay,
    todayCard: over.todayCard,
  });
}

const lastPlans = () => (db.writes[db.writes.length - 1] as { day_plans: DayPlans }).day_plans;

describe("DayPlan writes", () => {
  it("a note edit keeps a place saved elsewhere after the page loaded", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    // The page loaded with nothing on day 1; "+ Trip" on the map sheet
    // then saved Tacos there.
    db.row = { ...db.row, day_plans: { "1": { places: [TACOS] } } };
    const { getByPlaceholderText } = render(dayPlan({}));
    fireEvent.change(getByPlaceholderText(/Notes for this day/), { target: { value: "leave at 7" } });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });
    await settle();
    expect(db.writes).toHaveLength(1);
    expect(lastPlans()).toEqual({ "1": { note: "leave at 7", places: [TACOS] } });
  });

  it("a remove takes off only that place, keeping one saved elsewhere since load", async () => {
    db.row = { ...db.row, day_plans: { "1": { note: "n", places: [TACOS, PIZZA, RAMEN] } } };
    const { getByLabelText } = render(dayPlan({ "1": { note: "n", places: [TACOS, PIZZA] } }));
    fireEvent.click(getByLabelText("Remove Tacos from this day"));
    await settle();
    expect(db.writes).toHaveLength(1);
    expect(lastPlans()).toEqual({ "1": { note: "n", places: [PIZZA, RAMEN] } });
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("a remove never resurrects a place removed elsewhere", async () => {
    // Pizza was removed in another tab; this card still shows it.
    db.row = { ...db.row, day_plans: { "1": { places: [TACOS] } } };
    const { getByLabelText } = render(dayPlan({ "1": { places: [TACOS, PIZZA] } }));
    fireEvent.click(getByLabelText("Remove Tacos from this day"));
    await settle();
    expect(lastPlans()).toEqual({});
  });

  it("an add appends to the fresh day and never resurrects a place removed elsewhere", async () => {
    db.row = { ...db.row, day_plans: { "1": { places: [TACOS] } } };
    const { getByText } = render(dayPlan({ "1": { places: [TACOS, PIZZA] } }, { nearby: [option(RAMEN)] }));
    fireEvent.click(getByText("Add more places"));
    fireEvent.click(getByText("Ramen"));
    await settle();
    expect(lastPlans()).toEqual({ "1": { places: [TACOS, RAMEN] } });
  });

  it("an add dedupes: a place already saved on this day since load is not written twice", async () => {
    db.row = { ...db.row, day_plans: { "1": { places: [TACOS] } } };
    const { getByText, getAllByText } = render(dayPlan({}, { nearby: [option(TACOS)] }));
    fireEvent.click(getByText("Add restaurants & activities"));
    fireEvent.click(getByText("Tacos"));
    await settle();
    expect(db.writes).toEqual([]);
    expect(getAllByText("Tacos")).toHaveLength(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("an add of a place saved on another day since load says so instead of duplicating it", async () => {
    db.row = { ...db.row, day_plans: { "2": { places: [TACOS] } } };
    const { getByText, findByText } = render(dayPlan({}, { nearby: [option(TACOS)] }));
    fireEvent.click(getByText("Add restaurants & activities"));
    fireEvent.click(getByText("Tacos"));
    await settle();
    expect(db.writes).toEqual([]);
    expect(await findByText("Already saved on day 2.")).toBeTruthy();
  });

  it("an add to a day filled up elsewhere reports full instead of dropping a place", async () => {
    const twelve = Array.from({ length: 12 }, (_, i) => spot(100 + i, `Spot ${i}`));
    db.row = { ...db.row, day_plans: { "1": { places: twelve } } };
    const { getByText, findByText } = render(dayPlan({}, { nearby: [option(TACOS)] }));
    fireEvent.click(getByText("Add restaurants & activities"));
    fireEvent.click(getByText("Tacos"));
    await settle();
    expect(db.writes).toEqual([]);
    expect(await findByText(/Day 1 already has 12 places/)).toBeTruthy();
  });

  it("rolls back and shows the error when the write reaches no row", async () => {
    db.rowsReturned = 0;
    db.row = { ...db.row, day_plans: { "1": { places: [TACOS] } } };
    const { getByLabelText, findByText } = render(dayPlan({ "1": { places: [TACOS] } }));
    fireEvent.click(getByLabelText("Remove Tacos from this day"));
    await settle();
    expect(await findByText(/Couldn't save/)).toBeTruthy();
    expect(getByLabelText("Remove Tacos from this day")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });
});

describe("DayPlan add list and stay hint", () => {
  it("leaves out places saved on other days of the trip", () => {
    const { getByText, queryByText } = render(
      dayPlan({}, { day: 2, nearby: [option(TACOS), option(PIZZA)], savedElsewhere: ["restaurant:1"] }),
    );
    fireEvent.click(getByText("Add restaurants & activities"));
    expect(queryByText("Tacos")).toBeNull();
    expect(getByText("Pizza")).toBeTruthy();
  });

  it("says everything is saved when every nearby place is on another day", () => {
    const { getByText } = render(dayPlan({}, { day: 2, nearby: [option(TACOS)], savedElsewhere: ["restaurant:1"] }));
    fireEvent.click(getByText("Add restaurants & activities"));
    expect(getByText("Everything nearby is already saved on this trip.")).toBeTruthy();
  });

  it("links to the Today card only while it shows this stay", () => {
    const now = render(dayPlan({}, { day: 2, continuesStay: true, todayCard: "now" }));
    expect(now.getByRole("link", { name: "Today card at the top of this page" }).getAttribute("href")).toBe("#today");
    now.unmount();

    const later = render(dayPlan({}, { day: 2, continuesStay: true, todayCard: "after-start" }));
    expect(later.queryByRole("link", { name: /Today card/ })).toBeNull();
    expect(later.getByText(/show together in the Today card each day of the stay, once the trip starts\./)).toBeTruthy();
    later.unmount();

    const notNow = render(dayPlan({}, { day: 2, continuesStay: true, todayCard: "not-now" }));
    expect(notNow.queryByRole("link", { name: /Today card/ })).toBeNull();
    expect(notNow.getByText(/each day of the stay\.$/)).toBeTruthy();
  });
});
