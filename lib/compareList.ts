// Compare-list localStorage helper. Backs Feature 1: the floating
// "Compare X" button + the /compare side-by-side page. Keeps state
// purely client-side — no DB, no auth requirement — so anonymous
// users can stack up to 4 resorts and inspect them as a group.
//
// All functions are SSR-safe via `typeof window` guards: during the
// initial server render the list reads as empty, then re-syncs on
// hydration when the first effect runs.

const KEY = "wynla_compare_v1";
// Pro tier ceiling; free users hit a soft cap from FREE_LIMITS.compare
// (lib/tierLimits.ts) and see UpsellModal before reaching this hard one.
// Anything above 5 makes the /compare page UX-hostile regardless of tier.
export const COMPARE_MAX = 5;

/** Custom event name dispatched whenever the list mutates. Components
 *  in different parts of the tree listen for this to stay in sync
 *  without resorting to a global store. The native `storage` event
 *  doesn't fire in the same tab, hence the supplemental custom one. */
export const COMPARE_CHANGE_EVENT = "wynla:compare-change";

function isNumberArray(v: unknown): v is number[] {
  return Array.isArray(v) && v.every((x) => typeof x === "number" && Number.isFinite(x));
}

function read(): number[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!isNumberArray(parsed)) return [];
    // Defensive: dedup + cap on read in case storage was hand-edited.
    return dedupCap(parsed);
  } catch {
    return [];
  }
}

function write(ids: number[]): number[] {
  const next = dedupCap(ids);
  if (typeof window === "undefined") return next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(COMPARE_CHANGE_EVENT));
  } catch {
    // Storage may be full / blocked — keep the in-memory result so
    // the caller can still proceed with the optimistic UI flip.
  }
  return next;
}

function dedupCap(ids: number[]): number[] {
  const seen = new Set<number>();
  const out: number[] = [];
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= COMPARE_MAX) break;
  }
  return out;
}

export function getCompareIds(): number[] {
  return read();
}

export function isInCompare(id: number): boolean {
  return read().includes(id);
}

/** Adds `id` to the list (no-op if already present, capped at COMPARE_MAX).
 *  Returns the new list so the caller can update UI synchronously. */
export function addToCompare(id: number): number[] {
  const cur = read();
  if (cur.includes(id)) return cur;
  return write([...cur, id]);
}

export function removeFromCompare(id: number): number[] {
  const cur = read();
  if (!cur.includes(id)) return cur;
  return write(cur.filter((x) => x !== id));
}

/** Toggle convenience — handy for buttons that flip the same id on/off. */
export function toggleCompare(id: number): number[] {
  return read().includes(id) ? removeFromCompare(id) : addToCompare(id);
}

export function clearCompare(): number[] {
  return write([]);
}
