// Display helpers for saved trips: the /trips cards and the /today
// "Next trip" card print a trip the same way. Pure (no Supabase, no
// React) so the edge cases the founder saw on the live list ("1 days",
// a raw "mohawk" where a resort name should be) are unit-tested in
// lib/tripLabels.test.ts.

import { US_STATES } from "@/lib/usStates";

/** "1 day", "3 days". Regular plurals only; pass `pluralWord` for the rest. */
export function pluralize(n: number, word: string, pluralWord = `${word}s`): string {
  return `${n} ${n === 1 ? word : pluralWord}`;
}

// Joining words stay lower case inside a name ("Sierra at Tahoe"), the
// way resort names are written. "in" is left out on purpose: a trailing
// "-in" is Indiana, and a middle one is too rare to be worth the clash.
const SMALL_WORDS = new Set(["a", "an", "and", "at", "of", "on", "the"]);

/**
 * A readable stand-in for a resort slug the resorts table no longer
 * knows (renamed or merged since the trip was saved). Old trips kept the
 * slug they were planned with, so without this the list printed
 * "mohawk" or "burke-ny". Title-cases each word, keeps joining words
 * lower case, and upper-cases a trailing US state code ("Burke NY").
 * Returns "" for an empty slug so callers can skip it.
 */
export function resortNameFromSlug(slug: string): string {
  const words = slug.trim().toLowerCase().split(/[-_\s]+/).filter(Boolean);
  const last = words.length - 1;
  return words
    .map((w, i) => {
      if (i > 0 && i === last && w.length === 2 && US_STATES[w.toUpperCase()]) return w.toUpperCase();
      if (i > 0 && i < last && SMALL_WORDS.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

/**
 * The trip's stops in route order, named. Two adjacent entries for the
 * same mountain read as one stay, so consecutive repeats collapse; a
 * mountain visited again later in the route is a new stop and appears
 * again. Unknown slugs fall back to resortNameFromSlug; empty ones are
 * skipped.
 */
export function tripStopNames(
  slugs: readonly string[] | null | undefined,
  nameBySlug: ReadonlyMap<string, string>,
): string[] {
  const out: string[] = [];
  for (const s of slugs ?? []) {
    const name = nameBySlug.get(s) ?? resortNameFromSlug(s);
    if (!name) continue;
    if (out[out.length - 1] !== name) out.push(name);
  }
  return out;
}

/** "Killington → Stowe → Sugarbush +2": the first `max` stops, then a count. */
export function tripRouteLabel(stopNames: readonly string[], max = 3): string {
  const shown = stopNames.slice(0, max).join(" → ");
  return stopNames.length > max ? `${shown} +${stopNames.length - max}` : shown;
}
