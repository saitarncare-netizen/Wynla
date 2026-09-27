// @vitest-environment jsdom

// Render tests for the "+ Trip" button: each state the founder asked for
// (signed out, no trip for this mountain, saved + Undo, already in trip),
// the safety rules of the write (read-merge-write against the fresh row,
// an RLS 0-row update is an error, a vanished trip reloads the list, last
// season's trip is never written), and the page-level store (one fetch per
// page, dropped when the last card leaves, reset when the account
// changes). The Supabase browser client is replaced by a small in-memory
// fake, and the module is re-imported per test so its cache starts empty.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { NearbyRow } from "@/lib/nearbyCategories";

type Row = Record<string, unknown> & { id: string };
type AuthListener = (event: string, session: { user: { id: string } } | null) => void;

const fake = vi.hoisted(() => {
  const db = {
    user: null as { id: string } | null,
    trips: [] as Row[],
    /** Columns whose select fails as "does not exist". */
    missingColumns: [] as string[],
    /** Simulate RLS silently matching no row on update. */
    zeroRowUpdates: false,
    /** Fail the single-row read (network / PostgREST error). */
    singleSelectError: false,
    /** When set, each list query holds its answer (the rows it read when
     *  sent) until the next gate in line opens. */
    listGates: [] as Promise<void>[],
    authListeners: [] as AuthListener[],
    listCalls: 0,
    updates: [] as { id: unknown; payload: Record<string, unknown> }[],
  };
  const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;
  const session = () => (db.user ? { user: db.user } : null);

  /** What supabase-js does on sign-in / sign-out / refresh. */
  function emitAuth(event: string) {
    for (const cb of [...db.authListeners]) cb(event, session());
  }

  function client() {
    return {
      auth: {
        getSession: async () => ({ data: { session: session() } }),
        onAuthStateChange(cb: AuthListener) {
          db.authListeners.push(cb);
          // Like supabase-js, a new listener first hears INITIAL_SESSION.
          const initial = session();
          queueMicrotask(() => cb("INITIAL_SESSION", initial));
          return {
            data: {
              subscription: {
                unsubscribe: () => {
                  db.authListeners = db.authListeners.filter((l) => l !== cb);
                },
              },
            },
          };
        },
      },
      from() {
        const q = { op: "select", cols: "", payload: {} as Record<string, unknown>, filters: {} as Record<string, unknown> };
        const run = (single: boolean) => {
          if (q.op === "update") {
            const t = db.trips.find((r) => r.id === q.filters.id);
            if (db.zeroRowUpdates || !t) return { data: [], error: null };
            Object.assign(t, copy(q.payload));
            db.updates.push({ id: q.filters.id, payload: copy(q.payload) });
            return { data: [{ id: t.id }], error: null };
          }
          const missing = db.missingColumns.find((c) => q.cols.includes(c));
          if (missing) return { data: null, error: { code: "42703", message: `column trips.${missing} does not exist` } };
          if (single) {
            if (db.singleSelectError) return { data: null, error: { code: "08006", message: "connection failure" } };
            const t = db.trips.find((r) => r.id === q.filters.id);
            return { data: t ? copy(t) : null, error: null };
          }
          db.listCalls++;
          return { data: copy(db.trips.filter((r) => r.user_id === q.filters.user_id)), error: null };
        };
        const b = {
          select(cols: string) {
            if (q.op === "select") q.cols = cols;
            return b;
          },
          update(payload: Record<string, unknown>) {
            q.op = "update";
            q.payload = payload;
            return b;
          },
          eq(k: string, v: unknown) {
            q.filters[k] = v;
            return b;
          },
          order: () => b,
          limit: () => b,
          maybeSingle: () => Promise.resolve(run(true)),
          then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
            const out = run(false);
            const gate = q.op === "select" ? db.listGates.shift() : undefined;
            return (gate ?? Promise.resolve()).then(() => out).then(res, rej);
          },
        };
        return b;
      },
    };
  }
  return { db, client, emitAuth };
});

vi.mock("@/lib/supabase/client", () => ({ createSupabaseBrowserClient: () => fake.client() }));

const ROW: NearbyRow = {
  id: 42,
  resort_id: 7,
  name: "Moe's BBQ",
  category: "family",
  description: null,
  distance_km: 1,
  drive_minutes: 3,
  latitude: 39.64,
  longitude: -106.37,
  website_url: null,
  source: "osm",
  confidence_score: null,
  kind: "restaurant",
};

const SAVED_PLACE = {
  id: 42,
  kind: "restaurant",
  name: "Moe's BBQ",
  category: "family",
  latitude: 39.64,
  longitude: -106.37,
  website_url: null,
};

function vailTrip(over: Partial<Row> = {}): Row {
  return {
    id: "t1",
    user_id: "u1",
    name: "Ikon week",
    resort_slugs: ["vail"],
    days_per_resort: [2],
    total_days: 2,
    current_day: null,
    completed_days: [],
    started_at: null,
    start_date: null,
    updated_at: "2026-09-20T00:00:00Z",
    day_plans: {},
    ...over,
  };
}

/** Last season: Start tapped, day 1 ticked, the rest never were. */
function lastSeasonTrip(over: Partial<Row> = {}): Row {
  return vailTrip({
    id: "old",
    name: "Presidents Day",
    days_per_resort: [3],
    total_days: 3,
    started_at: "2025-02-14T16:00:00Z",
    current_day: 2,
    completed_days: [1],
    updated_at: "2025-02-14T16:00:00Z",
    ...over,
  });
}

async function cards(rows: NearbyRow[] = [ROW]) {
  const { default: SaveToTripButton } = await import("./SaveToTripButton");
  return (
    <div>
      {rows.map((r) => (
        <SaveToTripButton key={`${r.kind}:${r.id}`} row={r} resortSlug="vail" resortName="Vail" actionClassName="action" />
      ))}
    </div>
  );
}

async function renderButtons(rows: NearbyRow[] = [ROW]) {
  const utils = render(await cards(rows));
  // Let the shared trips load settle.
  await act(async () => {});
  return utils;
}

async function tap(name: string | RegExp) {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name }));
  });
}

/** Run the timers the store defers to the next task (its drop and its
 *  reload after an account change), then whatever they started. */
async function nextTask() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function gate() {
  let open!: () => void;
  const promise = new Promise<void>((r) => {
    open = r;
  });
  return { promise, open };
}

beforeEach(() => {
  vi.resetModules();
  fake.db.user = null;
  fake.db.trips = [];
  fake.db.missingColumns = [];
  fake.db.zeroRowUpdates = false;
  fake.db.singleSelectError = false;
  fake.db.listGates = [];
  fake.db.authListeners = [];
  fake.db.listCalls = 0;
  fake.db.updates = [];
  window.history.replaceState(null, "", "/resort/vail");
});
afterEach(cleanup);

describe("SaveToTripButton", () => {
  it("asks a signed-out visitor to sign in and comes back to this page", async () => {
    window.history.replaceState(null, "", "/?resort=vail");
    await renderButtons();
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByText("Sign in to save places to a trip")).toBeTruthy();
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link.getAttribute("href")).toBe(`/login?next=${encodeURIComponent("/?resort=vail")}`);
    expect(fake.db.updates).toHaveLength(0);
  });

  it("offers to plan a trip when no trip includes this mountain", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip({ resort_slugs: ["aspen"] })];
    await renderButtons();
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByText("Add Vail to a trip first")).toBeTruthy();
    // ?add= appends to a trip being planned; ?route= would replace it.
    expect(screen.getByRole("link", { name: "Plan a trip here" }).getAttribute("href")).toBe("/?plan=1&add=vail");
    // A second tap closes the popover again.
    await tap("Add Moe's BBQ to trip");
    expect(screen.queryByText("Add Vail to a trip first")).toBeNull();
  });

  it("closes the popover on a click elsewhere, and on Escape", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip({ resort_slugs: ["aspen"] })];
    await renderButtons();
    await tap("Add Moe's BBQ to trip");
    act(() => {
      fireEvent.click(document.body);
    });
    expect(screen.queryByText("Add Vail to a trip first")).toBeNull();

    await tap("Add Moe's BBQ to trip");
    const btn = screen.getByRole("button", { name: "Add Moe's BBQ to trip" });
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    act(() => {
      fireEvent.keyDown(screen.getByRole("link", { name: "Plan a trip here" }), { key: "Escape" });
    });
    expect(screen.queryByText("Add Vail to a trip first")).toBeNull();
    expect(document.activeElement).toBe(btn);
  });

  it("saves under the stop's first day, then Undo takes it back out", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip()];
    await renderButtons();
    await tap("Add Moe's BBQ to trip");

    expect(screen.getByText("Saved · Day 1")).toBeTruthy();
    expect(fake.db.updates).toEqual([{ id: "t1", payload: { day_plans: { "1": { places: [SAVED_PLACE] } } } }]);
    const btn = screen.getByRole("button", { name: "In trip: Moe's BBQ, day 1 of Ikon week" });
    expect(btn.getAttribute("title")).toBe("In Ikon week · Day 1");
    expect(screen.getByRole("status").textContent).toBe("Saved Moe's BBQ to Ikon week, day 1.");

    await tap("Undo");
    expect(screen.getByText("Removed from your trip")).toBeTruthy();
    expect(fake.db.trips[0].day_plans).toEqual({});
    expect(screen.getByRole("button", { name: "Add Moe's BBQ to trip" })).toBeTruthy();
  });

  it("saves into today's day of a running trip", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [
      // Started today, whenever the suite runs: "running" has a time limit.
      vailTrip({ days_per_resort: [3], total_days: 3, started_at: new Date().toISOString(), current_day: 2, completed_days: [1] }),
    ];
    await renderButtons();
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByText("Saved · Day 2")).toBeTruthy();
    // Only one trip at Vail: the line does not need to name it.
    expect(screen.queryByText(/^in /)).toBeNull();
  });

  it("does not save into last season's half-ticked trip, and names the trip it used", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [
      vailTrip({
        id: "old",
        name: "Presidents Day",
        days_per_resort: [3],
        total_days: 3,
        started_at: "2025-02-14T16:00:00Z",
        current_day: 2,
        completed_days: [1],
        updated_at: "2025-02-14T16:00:00Z",
      }),
      vailTrip({ id: "new", name: "Vail + Aspen 5d" }),
    ];
    await renderButtons();
    await tap("Add Moe's BBQ to trip");
    expect(fake.db.updates.map((u) => u.id)).toEqual(["new"]);
    expect(screen.getByText("Saved · Day 1")).toBeTruthy();
    // Two trips include Vail, so the visible line says which one.
    expect(screen.getByText("in Vail + Aspen 5d").className).toContain("truncate");
  });

  it("merges into the row as it is now, not as it was when the page loaded", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip()];
    await renderButtons();
    // Another tab adds a note after this page loaded its trips.
    fake.db.trips[0].day_plans = { "1": { note: "Leave at 6" }, "2": { note: "Ski school" } };
    await tap("Add Moe's BBQ to trip");
    expect(fake.db.trips[0].day_plans).toEqual({
      "1": { note: "Leave at 6", places: [SAVED_PLACE] },
      "2": { note: "Ski school" },
    });
  });

  it("shows a place saved earlier as In trip, and lets it be removed", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip({ day_plans: { "2": { places: [SAVED_PLACE] } } })];
    await renderButtons();
    await tap("In trip: Moe's BBQ, day 2 of Ikon week");
    expect(screen.getByTitle("Ikon week · Day 2").textContent).toBe("Day 2 · Ikon week");
    await tap("Remove Moe's BBQ from your trip");
    expect(fake.db.trips[0].day_plans).toEqual({});
  });

  it("keeps Day N whole and truncates only a long trip name on the In trip line", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip({ name: "Vail + Aspen 5d", day_plans: { "2": { places: [SAVED_PLACE] } } })];
    await renderButtons();
    await tap("In trip: Moe's BBQ, day 2 of Vail + Aspen 5d");
    const day = screen.getByText("Day 2");
    expect(day.className).toContain("shrink-0");
    expect(day.className).not.toContain("truncate");
    expect(screen.getByText("· Vail + Aspen 5d").className).toContain("truncate");
  });

  it("labels an unnamed trip by its length", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip({ name: null })];
    await renderButtons();
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByRole("status").textContent).toBe("Saved Moe's BBQ to 2-day trip, day 1.");
  });

  it("treats an update that matched no row as a failure", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip()];
    fake.db.zeroRowUpdates = true;
    await renderButtons();
    await tap("Add Moe's BBQ to trip");
    // Visible line (the screen-reader status repeats it).
    expect(screen.getByText("Couldn't save. Try again.", { ignore: ".sr-only" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Couldn't save. Try again.");
    expect(screen.getByRole("button", { name: "Add Moe's BBQ to trip" })).toBeTruthy();
  });

  it("loads the trips once for every card on the page", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip()];
    await renderButtons([ROW, { ...ROW, id: 43, name: "Blue Moose" }, { ...ROW, id: 42, kind: "activity" }]);
    expect(screen.getAllByRole("button")).toHaveLength(3);
    expect(fake.db.listCalls).toBe(1);
  });

  it("hides itself while trips.day_plans does not exist yet", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip()];
    fake.db.missingColumns = ["day_plans"];
    await renderButtons();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("renders nothing for a row without a kind", async () => {
    await renderButtons([{ ...ROW, kind: undefined }]);
    expect(screen.queryByRole("button")).toBeNull();
  });
});

describe("SaveToTripButton — only a trip still ahead takes a save", () => {
  it.each([
    ["last season's half-ticked trip", () => lastSeasonTrip()],
    [
      "a finished trip",
      () => vailTrip({ started_at: "2025-02-14T16:00:00Z", current_day: 2, completed_days: [1, 2] }),
    ],
    ["a trip dated before today", () => vailTrip({ start_date: "2025-02-14" })],
    [
      "a running trip that has already skied every day here",
      () =>
        vailTrip({
          resort_slugs: ["vail", "aspen"],
          days_per_resort: [2, 2],
          total_days: 4,
          started_at: new Date().toISOString(),
          current_day: 3,
          completed_days: [1, 2],
        }),
    ],
  ])("offers to plan a trip instead of saving into %s", async (_label, makeTrip) => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [makeTrip()];
    await renderButtons();
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByText("Add Vail to a trip first")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Plan a trip here" }).getAttribute("href")).toBe("/?plan=1&add=vail");
    expect(screen.getByRole("status").textContent).toBe("Add Vail to a trip first.");
    expect(fake.db.updates).toHaveLength(0);
  });

  it("does not call a place kept only in last season's trip In trip", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [lastSeasonTrip({ day_plans: { "2": { places: [SAVED_PLACE] } } })];
    await renderButtons();
    expect(screen.queryByRole("button", { name: /^In trip/ })).toBeNull();
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByText("Add Vail to a trip first")).toBeTruthy();
    expect(fake.db.updates).toHaveLength(0);
  });

  it("still saves into an upcoming trip, even one whose Start was tapped long ago", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [
      lastSeasonTrip(),
      vailTrip({ id: "next", start_date: "2099-01-10", started_at: "2025-02-14T16:00:00Z" }),
    ];
    await renderButtons();
    await tap("Add Moe's BBQ to trip");
    expect(fake.db.updates.map((u) => u.id)).toEqual(["next"]);
    expect(screen.getByText("Saved · Day 1")).toBeTruthy();
  });

  it("re-checks the fresh row: a stop skied since the list loaded is not saved into", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [
      vailTrip({
        resort_slugs: ["vail", "aspen"],
        days_per_resort: [2, 2],
        total_days: 4,
        started_at: new Date().toISOString(),
        current_day: 1,
        completed_days: [],
      }),
    ];
    await renderButtons();
    // Both Vail days ticked on the Today card in another tab.
    fake.db.trips[0].completed_days = [1, 2];
    fake.db.trips[0].current_day = 3;
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByText("Your trip changed. Tap again.", { ignore: ".sr-only" })).toBeTruthy();
    expect(fake.db.updates).toHaveLength(0);
    // The list was reloaded, so the next tap knows there is no stop left here.
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByText("Add Vail to a trip first")).toBeTruthy();
    expect(fake.db.updates).toHaveLength(0);
  });
});

describe("SaveToTripButton — a trip that vanished", () => {
  it("reloads the list when the trip was deleted after it loaded", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip()];
    await renderButtons();
    fake.db.trips = []; // deleted in another tab
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByText("Your trip changed. Tap again.", { ignore: ".sr-only" })).toBeTruthy();
    expect(fake.db.listCalls).toBe(2);
    expect(fake.db.updates).toHaveLength(0);
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByText("Add Vail to a trip first")).toBeTruthy();
  });

  it("says try again, without reloading, when the read itself fails", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip()];
    await renderButtons();
    fake.db.singleSelectError = true;
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByText("Couldn't save. Try again.", { ignore: ".sr-only" })).toBeTruthy();
    expect(fake.db.listCalls).toBe(1);
  });

  it("reloads on Remove when the trip is gone, and the card shows what is left", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip({ day_plans: { "2": { places: [SAVED_PLACE] } } })];
    await renderButtons();
    await tap("In trip: Moe's BBQ, day 2 of Ikon week");
    fake.db.trips = [];
    await tap("Remove Moe's BBQ from your trip");
    expect(screen.getByText("Your trip changed.", { ignore: ".sr-only" })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Your trip changed.");
    expect(fake.db.listCalls).toBe(2);
    expect(screen.getByRole("button", { name: "Add Moe's BBQ to trip" })).toBeTruthy();
  });

  it("says try again on Remove when the read fails", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip({ day_plans: { "2": { places: [SAVED_PLACE] } } })];
    await renderButtons();
    await tap("In trip: Moe's BBQ, day 2 of Ikon week");
    fake.db.singleSelectError = true;
    await tap("Remove Moe's BBQ from your trip");
    expect(screen.getByText("Couldn't remove it. Try again.")).toBeTruthy();
    expect(fake.db.listCalls).toBe(1);
    expect(fake.db.trips[0].day_plans).toEqual({ "2": { places: [SAVED_PLACE] } });
  });
});

describe("SaveToTripButton — store lifetime", () => {
  it("forgets the list once the last card is gone, so coming back loads fresh", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip({ day_plans: { "2": { places: [SAVED_PLACE] } } })];
    const first = await renderButtons();
    expect(screen.getByRole("button", { name: /^In trip: Moe's BBQ/ })).toBeTruthy();
    first.unmount();
    await nextTask();
    // Removed on the trip page, then back within the minute.
    fake.db.trips[0].day_plans = {};
    await renderButtons();
    expect(fake.db.listCalls).toBe(2);
    expect(screen.getByRole("button", { name: "Add Moe's BBQ to trip" })).toBeTruthy();
  });

  it("keeps the list when one render swaps the cards (the map sheet switching resort)", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip()];
    const { rerender } = await renderButtons();
    rerender(await cards([{ ...ROW, id: 43, name: "Blue Moose" }]));
    await nextTask();
    // A dropped store would make this tap fetch the list again.
    await tap("Add Blue Moose to trip");
    expect(screen.getByText("Saved · Day 1")).toBeTruthy();
    expect(fake.db.listCalls).toBe(1);
  });

  it("waits for a load in flight before forgetting, so it cannot refill the store", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip({ day_plans: { "2": { places: [SAVED_PLACE] } } })];
    const slow = gate();
    fake.db.listGates = [slow.promise];
    const first = await renderButtons();
    first.unmount();
    await nextTask();
    fake.db.trips[0].day_plans = {};
    await act(async () => {
      slow.open();
    });
    await nextTask();
    await renderButtons();
    expect(fake.db.listCalls).toBe(2);
    expect(screen.getByRole("button", { name: "Add Moe's BBQ to trip" })).toBeTruthy();
  });
});

describe("SaveToTripButton — account changes", () => {
  it("drops the previous account's trips on sign-out", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip({ day_plans: { "2": { places: [SAVED_PLACE] } } })];
    await renderButtons();
    expect(screen.getByRole("button", { name: /^In trip: Moe's BBQ/ })).toBeTruthy();
    await act(async () => {
      fake.db.user = null;
      fake.emitAuth("SIGNED_OUT");
    });
    // Gone at once, before any reload.
    expect(screen.getByRole("button", { name: "Add Moe's BBQ to trip" })).toBeTruthy();
    await nextTask();
    await tap("Add Moe's BBQ to trip");
    expect(screen.getByText("Sign in to save places to a trip")).toBeTruthy();
    expect(fake.db.updates).toHaveLength(0);
  });

  it("saves into the new account's trip after signing in as someone else", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [
      vailTrip({ day_plans: { "2": { places: [SAVED_PLACE] } } }),
      vailTrip({ id: "t2", user_id: "u2", name: "Epic weekend" }),
    ];
    await renderButtons();
    await act(async () => {
      fake.db.user = { id: "u2" };
      fake.emitAuth("SIGNED_IN");
    });
    await nextTask();
    expect(fake.db.listCalls).toBe(2);
    await tap("Add Moe's BBQ to trip");
    expect(fake.db.updates.map((u) => u.id)).toEqual(["t2"]);
    expect(screen.getByRole("status").textContent).toBe("Saved Moe's BBQ to Epic weekend, day 1.");
  });

  it("ignores events for the account already loaded", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [vailTrip({ day_plans: { "2": { places: [SAVED_PLACE] } } })];
    await renderButtons();
    await act(async () => {
      fake.emitAuth("TOKEN_REFRESHED");
      fake.emitAuth("SIGNED_IN");
    });
    await nextTask();
    expect(fake.db.listCalls).toBe(1);
    expect(screen.getByRole("button", { name: /^In trip: Moe's BBQ/ })).toBeTruthy();
  });

  it("drops a list that lands after the account changed", async () => {
    fake.db.user = { id: "u1" };
    fake.db.trips = [
      vailTrip({ day_plans: { "2": { places: [SAVED_PLACE] } } }),
      vailTrip({ id: "t2", user_id: "u2", name: "Epic weekend" }),
    ];
    const u1List = gate();
    const u2List = gate();
    fake.db.listGates = [u1List.promise, u2List.promise];
    await renderButtons();
    // u1's list is still on its way when the phone changes hands.
    await act(async () => {
      fake.db.user = { id: "u2" };
      fake.emitAuth("SIGNED_IN");
    });
    await nextTask();
    await act(async () => {
      u2List.open();
    });
    await act(async () => {
      u1List.open();
    });
    expect(fake.db.listCalls).toBe(2);
    expect(screen.queryByRole("button", { name: /^In trip/ })).toBeNull();
    await tap("Add Moe's BBQ to trip");
    expect(fake.db.updates.map((u) => u.id)).toEqual(["t2"]);
  });
});
