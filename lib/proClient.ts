// Client-side Pro status helper. Lightweight: one fetch per mount,
// in-memory cache keyed on the lifetime of the page. Components that
// need to gate UI on Pro status call `useProStatus()`.

"use client";

import { useEffect, useState } from "react";

type ProStatus = { isPro: boolean; isLoading: boolean };

// Module-level cache so multiple components don't refetch on the same
// page load. Cleared on hard navigation (process boundary).
let cached: { isPro: boolean } | null = null;
let inFlight: Promise<{ isPro: boolean }> | null = null;

async function fetchProStatus(): Promise<{ isPro: boolean }> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = fetch("/api/me/pro-status", { cache: "no-store" })
    .then(async (r) => {
      if (!r.ok) return { isPro: false };
      const j = (await r.json()) as { isPro?: boolean };
      return { isPro: Boolean(j?.isPro) };
    })
    .catch(() => ({ isPro: false }))
    .then((v) => {
      cached = v;
      inFlight = null;
      return v;
    });
  return inFlight;
}

export function useProStatus(): ProStatus {
  const [state, setState] = useState<ProStatus>(() => ({
    isPro: cached?.isPro ?? false,
    isLoading: cached === null,
  }));

  useEffect(() => {
    let alive = true;
    fetchProStatus().then((v) => {
      if (!alive) return;
      setState({ isPro: v.isPro, isLoading: false });
    });
    return () => {
      alive = false;
    };
  }, []);

  return state;
}

// Invalidate the in-memory cache, e.g. after a successful checkout
// redirect lands the user back on /account/pro. The next call to
// useProStatus will hit the server again.
export function invalidateProStatus(): void {
  cached = null;
}
