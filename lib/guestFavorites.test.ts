import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GUEST_FAVORITES_CAP,
  GUEST_FAVORITES_CHANGE_EVENT,
  addGuestFavorite,
  claimGuestToast,
  clearGuestFavorites,
  getGuestFavoriteIds,
  isGuestFavorite,
  mergeGuestFavorites,
  planGuestMerge,
  removeGuestFavorite,
  shouldMergeGuestFavorites,
  type FavoritesClient,
} from "./guestFavorites";

// Minimal window + localStorage so the SSR guards see a browser.
function fakeWindow() {
  const store = new Map<string, string>();
  const dispatched: string[] = [];
  return {
    localStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    dispatchEvent: (e: { type: string }) => {
      dispatched.push(e.type);
      return true;
    },
    __dispatched: dispatched,
    __store: store,
  };
}

describe("guest favorites storage", () => {
  let win: ReturnType<typeof fakeWindow>;
  beforeEach(() => {
    win = fakeWindow();
    vi.stubGlobal("window", win);
    vi.stubGlobal("CustomEvent", class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("adds, dedups, removes and clears, announcing each change", () => {
    expect(getGuestFavoriteIds()).toEqual([]);
    expect(addGuestFavorite(12)).toEqual({ ids: [12], added: true, full: false });
    expect(addGuestFavorite(12)).toEqual({ ids: [12], added: false, full: false });
    expect(addGuestFavorite(7).ids).toEqual([12, 7]);
    expect(isGuestFavorite(7)).toBe(true);
    expect(removeGuestFavorite(12)).toEqual([7]);
    expect(removeGuestFavorite(99)).toEqual([7]);
    clearGuestFavorites();
    expect(getGuestFavoriteIds()).toEqual([]);
    expect(win.__store.has("wynla_guest_favorites_v1")).toBe(false);
    expect(win.__dispatched.every((t) => t === GUEST_FAVORITES_CHANGE_EVENT)).toBe(true);
    expect(win.__dispatched.length).toBe(4);
  });

  it("refuses an add past the device cap", () => {
    for (let i = 1; i <= GUEST_FAVORITES_CAP; i++) addGuestFavorite(i);
    const r = addGuestFavorite(GUEST_FAVORITES_CAP + 1);
    expect(r.added).toBe(false);
    expect(r.full).toBe(true);
    expect(r.ids.length).toBe(GUEST_FAVORITES_CAP);
  });

  it("ignores hand-edited garbage in storage", () => {
    win.__store.set("wynla_guest_favorites_v1", JSON.stringify(["a", -1, 2.5]));
    expect(getGuestFavoriteIds()).toEqual([]);
    win.__store.set("wynla_guest_favorites_v1", "{not json");
    expect(getGuestFavoriteIds()).toEqual([]);
  });

  it("shows the device toast exactly once", () => {
    expect(claimGuestToast()).toBe(true);
    expect(claimGuestToast()).toBe(false);
  });
});

describe("shouldMergeGuestFavorites", () => {
  // The merge must fire on INITIAL_SESSION too: magic-link and Google
  // sign-ins land through /auth/callback as a full page load, where a new
  // subscription never sees SIGNED_IN.
  it("fires on INITIAL_SESSION with a user and a device list", () => {
    expect(shouldMergeGuestFavorites("INITIAL_SESSION", "u1", [3])).toBe(true);
  });
  it("fires on SIGNED_IN with a user and a device list", () => {
    expect(shouldMergeGuestFavorites("SIGNED_IN", "u1", [3, 4])).toBe(true);
  });
  it("stays silent without a user, without a device list, or on other events", () => {
    expect(shouldMergeGuestFavorites("INITIAL_SESSION", null, [3])).toBe(false);
    expect(shouldMergeGuestFavorites("INITIAL_SESSION", undefined, [3])).toBe(false);
    expect(shouldMergeGuestFavorites("SIGNED_IN", "u1", [])).toBe(false);
    expect(shouldMergeGuestFavorites("TOKEN_REFRESHED", "u1", [3])).toBe(false);
    expect(shouldMergeGuestFavorites("SIGNED_OUT", "u1", [3])).toBe(false);
  });
});

describe("planGuestMerge", () => {
  it("skips ids the account already has and keeps guest order", () => {
    expect(planGuestMerge([3, 1, 2, 3], [1])).toEqual([3, 2]);
  });
  it("respects the account cap counting what is already saved", () => {
    expect(planGuestMerge([10, 11, 12, 13], [1, 2, 3], 5)).toEqual([10, 11]);
    expect(planGuestMerge([10, 11], [1, 2, 3, 4, 5], 5)).toEqual([]);
  });
  it("treats an infinite cap as no cap", () => {
    expect(planGuestMerge([10, 11], [], Number.POSITIVE_INFINITY)).toEqual([10, 11]);
  });
});

describe("mergeGuestFavorites", () => {
  let win: ReturnType<typeof fakeWindow>;
  beforeEach(() => {
    win = fakeWindow();
    vi.stubGlobal("window", win);
    vi.stubGlobal("CustomEvent", class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  function client(existing: number[], upsertError: string | null = null) {
    const calls: { rows: Array<{ user_id: string; resort_id: number }>; options: unknown }[] = [];
    const c: FavoritesClient = {
      from: () => ({
        select: () => ({
          eq: () => Promise.resolve({ data: existing.map((resort_id) => ({ resort_id })), error: null }),
        }),
        upsert: (rows: Array<{ user_id: string; resort_id: number }>, options: unknown) => {
          calls.push({ rows, options });
          return Promise.resolve({ error: upsertError ? { message: upsertError } : null });
        },
      }),
    };
    return { c, calls };
  }

  it("does nothing without a guest list", async () => {
    const { c, calls } = client([]);
    expect(await mergeGuestFavorites(c, "u1")).toEqual({ merged: 0, dropped: 0, error: null });
    expect(calls.length).toBe(0);
  });

  it("upserts only the new ids with ignoreDuplicates and clears the device list", async () => {
    addGuestFavorite(5);
    addGuestFavorite(6);
    const { c, calls } = client([5]);
    const r = await mergeGuestFavorites(c, "u1");
    expect(r).toEqual({ merged: 1, dropped: 0, error: null });
    expect(calls[0].rows).toEqual([{ user_id: "u1", resort_id: 6 }]);
    expect(calls[0].options).toEqual({ onConflict: "user_id,resort_id", ignoreDuplicates: true });
    expect(getGuestFavoriteIds()).toEqual([]);
  });

  it("keeps the device list when the upsert fails so the next sign-in retries", async () => {
    addGuestFavorite(9);
    const { c } = client([], "network down");
    const r = await mergeGuestFavorites(c, "u1");
    expect(r.error).toBe("network down");
    expect(getGuestFavoriteIds()).toEqual([9]);
  });
});
