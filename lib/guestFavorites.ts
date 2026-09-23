// Guest favorites — the heart works before sign-in. Signed-out taps land
// in localStorage (same pattern as lib/compareList) so a first-time
// visitor can shortlist mountains on the map without hitting the login
// wall (audit account-social-22 / fresh-eyes-newbie-40). On SIGNED_IN the
// list is merged into the `favorites` table once and then cleared, so
// the account becomes the only source of truth from that point.
//
// All storage access is SSR-safe (`typeof window` guards) and swallows
// storage errors (private mode, quota), so a blocked storage never
// throws out of a tap handler.

import { FREE_LIMITS } from "@/lib/tierLimits";

const KEY = "wynla_guest_favorites_v1";
const TOAST_KEY = "wynla_guest_favorites_toast_v1";

/** Fired on the window whenever the guest list changes, so every heart
 *  on the page (panel header, resort hero, favorites grid) stays in
 *  step without a global store. The native `storage` event only fires
 *  in other tabs. */
export const GUEST_FAVORITES_CHANGE_EVENT = "wynla:guest-favorites-change";

/** A device list has a hard ceiling even while the account tier is
 *  uncapped, so a hand-edited or runaway list can never grow without
 *  bound in localStorage. The lower of the two wins. */
const DEVICE_MAX = 50;
export const GUEST_FAVORITES_CAP = Math.min(FREE_LIMITS.favorites, DEVICE_MAX);

function isIdArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === "number" && Number.isInteger(x) && x > 0);
}

function dedupCap(ids: number[], cap = GUEST_FAVORITES_CAP): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= cap) break;
  }
  return out;
}

function read(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return isIdArray(parsed) ? dedupCap(parsed) : [];
  } catch {
    return [];
  }
}

function write(ids: number[]): number[] {
  const next = dedupCap(ids);
  if (typeof window === "undefined") return next;
  try {
    if (next.length === 0) window.localStorage.removeItem(KEY);
    else window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(GUEST_FAVORITES_CHANGE_EVENT));
  } catch {
    // Storage blocked or full: the in-memory result still drives the
    // optimistic UI for this page view.
  }
  return next;
}

export function getGuestFavoriteIds(): number[] {
  return read();
}

export function isGuestFavorite(resortId: number): boolean {
  return read().includes(resortId);
}

export function guestFavoritesFull(): boolean {
  return read().length >= GUEST_FAVORITES_CAP;
}

export type GuestAddResult = {
  ids: number[];
  /** False when the id was already saved or the device list is full. */
  added: boolean;
  /** True when the add was refused because the list is at the cap. */
  full: boolean;
};

export function addGuestFavorite(resortId: number): GuestAddResult {
  const cur = read();
  if (cur.includes(resortId)) return { ids: cur, added: false, full: false };
  if (cur.length >= GUEST_FAVORITES_CAP) return { ids: cur, added: false, full: true };
  return { ids: write([...cur, resortId]), added: true, full: false };
}

export function removeGuestFavorite(resortId: number): number[] {
  const cur = read();
  if (!cur.includes(resortId)) return cur;
  return write(cur.filter((x) => x !== resortId));
}

export function clearGuestFavorites(): void {
  write([]);
}

/** The "Saved on this device" toast shows once per device, on the first
 *  guest heart. Returns true exactly once. */
export function claimGuestToast(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.localStorage.getItem(TOAST_KEY)) return false;
    window.localStorage.setItem(TOAST_KEY, "1");
    return true;
  } catch {
    // Without storage the toast would repeat on every tap; better once
    // per page view than never, so say yes and let React state gate it.
    return true;
  }
}

// ---------- Merge on sign-in ----------

/**
 * Whether an auth event should trigger the merge. Pure so the trigger
 * rule is testable: the 6-digit code, the magic link and Google each
 * deliver the session differently (a client-side SIGNED_IN on /login, or
 * a full page load after /auth/callback that yields INITIAL_SESSION
 * only), so both events count. No user or an empty device list means
 * there is nothing to do and no network call is made.
 */
export function shouldMergeGuestFavorites(
  event: string,
  userId: string | null | undefined,
  guestIds: readonly number[],
): boolean {
  if (event !== "SIGNED_IN" && event !== "INITIAL_SESSION") return false;
  if (!userId) return false;
  return guestIds.length > 0;
}

/**
 * Which guest ids to insert for an account that already has
 * `existingCount` favorites (with `existingIds` when known). Pure, so the
 * cap and the ordering are testable without a database: oldest guest
 * saves go first, duplicates are dropped, and nothing past the account
 * cap is inserted.
 */
export function planGuestMerge(
  guestIds: number[],
  existingIds: Iterable<number>,
  cap: number = FREE_LIMITS.favorites,
): number[] {
  const have = new Set(existingIds);
  const room = Number.isFinite(cap) ? Math.max(0, cap - have.size) : Number.POSITIVE_INFINITY;
  const out: number[] = [];
  for (const id of dedupCap(guestIds, Number.POSITIVE_INFINITY)) {
    if (have.has(id)) continue;
    if (out.length >= room) break;
    out.push(id);
  }
  return out;
}

/** The client is typed loosely on purpose: a structural slice of the
 *  Supabase query builder makes TypeScript walk the SDK's generics to
 *  their depth limit at the call site, and tests want to hand in a stub. */
export type FavoritesClient = {
  from(table: "favorites"): {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    select(columns: string): any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    upsert(rows: unknown, options: { onConflict: string; ignoreDuplicates: boolean }): any;
  };
};

type SelectResult = { data: Array<{ resort_id: number }> | null; error: { message: string } | null };
type WriteResult = { error: { message: string } | null };

export type GuestMergeResult = {
  /** Rows sent to the database (duplicates are ignored server-side). */
  merged: number;
  /** Guest saves dropped because the account was at its cap. */
  dropped: number;
  error: string | null;
};

/**
 * Move this device's guest list into the account. Reads the account's
 * current favorites (RLS scopes the query), upserts only what is new
 * and fits under the cap, then clears the device list. On any error the
 * device list is kept so the next sign-in retries; the upsert ignores
 * duplicates, so a retry is harmless. Resolves to `merged: 0` without a
 * network call when there is nothing to merge.
 */
export async function mergeGuestFavorites(client: FavoritesClient, userId: string): Promise<GuestMergeResult> {
  const guest = read();
  if (guest.length === 0) return { merged: 0, dropped: 0, error: null };

  const existing = (await client.from("favorites").select("resort_id").eq("user_id", userId)) as SelectResult;
  if (existing.error) return { merged: 0, dropped: 0, error: existing.error.message };
  const have = (existing.data ?? []).map((r) => r.resort_id);

  const toInsert = planGuestMerge(guest, have);
  const dropped = guest.filter((id) => !have.includes(id) && !toInsert.includes(id)).length;
  if (toInsert.length > 0) {
    const { error } = (await client
      .from("favorites")
      .upsert(
        toInsert.map((resort_id) => ({ user_id: userId, resort_id })),
        { onConflict: "user_id,resort_id", ignoreDuplicates: true },
      )) as WriteResult;
    if (error) return { merged: 0, dropped, error: error.message };
  }
  clearGuestFavorites();
  return { merged: toInsert.length, dropped, error: null };
}
