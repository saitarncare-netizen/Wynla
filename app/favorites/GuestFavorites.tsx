"use client";

// Signed-out /favorites. The device list (lib/guestFavorites) is only
// known to the browser, so this island reads it, fetches the public
// resort rows with the anon client and renders the same card shape as
// the signed-in grid minus the Go / Wait / Skip verdict, which needs the
// account's pass context. A banner says exactly what sign-in adds.

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { passColor, passLabel } from "@/lib/passColors";
import { textOn } from "@/lib/contrast";
import {
  GUEST_FAVORITES_CHANGE_EVENT,
  getGuestFavoriteIds,
  removeGuestFavorite,
} from "@/lib/guestFavorites";

type GuestResort = {
  id: number;
  slug: string;
  name: string;
  state: string;
  region: string | null;
  passes: string[] | null;
  vertical_drop: number | null;
};

const COLS = "id, slug, name, state, region, passes, vertical_drop";

export default function GuestFavorites() {
  // undefined until the first effect reads storage, so the server render
  // and the first client render agree (no hydration mismatch).
  const [ids, setIds] = useState<number[] | undefined>(undefined);
  const [resorts, setResorts] = useState<Map<number, GuestResort>>(new Map());
  const [error, setError] = useState<string | null>(null);
  // Ids already sent to the database. Kept here rather than derived from
  // `resorts` so an id the query does not return (resort deactivated or a
  // stale entry) is asked for once, not on every render.
  const requested = useRef<Set<number>>(new Set());

  useEffect(() => {
    const sync = () => setIds(getGuestFavoriteIds());
    sync();
    window.addEventListener(GUEST_FAVORITES_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(GUEST_FAVORITES_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // Fetch each id at most once; removals never need a round-trip. Ids the
  // database no longer returns are dropped from the device list so the
  // grid never shows a permanent skeleton for a resort that is gone.
  useEffect(() => {
    if (!ids || ids.length === 0) return;
    const missing = ids.filter((id) => !requested.current.has(id));
    if (missing.length === 0) return;
    for (const id of missing) requested.current.add(id);
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("resorts")
      .select(COLS)
      .in("id", missing)
      .eq("active", true)
      .returns<GuestResort[]>()
      .then(({ data, error: err }) => {
        if (cancelled) return;
        if (err) {
          // Let a later mount retry these ids; a network blip is not a
          // reason to forget a save.
          for (const id of missing) requested.current.delete(id);
          setError(err.message);
          return;
        }
        const rows = data ?? [];
        setResorts((prev) => {
          const next = new Map(prev);
          for (const r of rows) next.set(r.id, r);
          return next;
        });
        const found = new Set(rows.map((r) => r.id));
        for (const id of missing) if (!found.has(id)) removeGuestFavorite(id);
      });
    return () => {
      cancelled = true;
    };
  }, [ids]);

  const count = ids?.length ?? 0;

  return (
    <main className="min-h-dvh bg-wn-offwhite px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/"
          className="mb-4 inline-flex min-h-11 items-center text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy"
        >
          ← Map
        </Link>

        <header className="mb-4">
          <h1 className="text-2xl font-extrabold text-wn-navy sm:text-3xl">Your favorites</h1>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            {ids === undefined
              ? "Loading what you saved on this device…"
              : count === 0
                ? "Nothing saved yet. Tap the heart on any resort to keep it here."
                : `${count} resort${count === 1 ? "" : "s"} saved on this device.`}
          </p>
        </header>

        {/* Sign-in banner: says where the list lives and what an account
            adds, without pretending the device list is synced. */}
        <div className="mb-6 flex flex-col gap-3 rounded-xl border border-wn-sky/40 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-wn-navy">Saved on this device only</p>
            <p className="mt-0.5 text-xs text-wn-charcoal/70">
              Sign in to keep these on every device and see today&rsquo;s Go / Wait / Skip for each one.
              Anything saved here moves to your account automatically.
            </p>
          </div>
          <Link
            href="/login?next=%2Ffavorites"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
          >
            Sign in
          </Link>
        </div>

        {error && (
          <p className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            Could not load resorts: {error}
          </p>
        )}

        {ids !== undefined && count === 0 ? (
          <div className="rounded-xl border border-dashed border-wn-charcoal/20 bg-white p-8 text-center">
            <p className="text-sm text-wn-charcoal/70">
              Find resorts you like, tap the heart, come back here to plan.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex min-h-11 items-center gap-1 rounded-md bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
            >
              Browse the map
            </Link>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {(ids ?? []).map((id) => {
              const r = resorts.get(id);
              return (
                <li key={id}>
                  {r ? <GuestCard resort={r} /> : <SkeletonCard />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function GuestCard({ resort: r }: { resort: GuestResort }) {
  const primary = r.passes?.[0] ?? "independent";
  const bg = passColor(primary);
  return (
    <div className="relative overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm transition hover:shadow-md">
      <Link href={`/resort/${r.slug}`} className="block">
        <div
          className="flex h-28 items-center justify-center overflow-hidden px-4"
          style={{ background: `linear-gradient(135deg, ${bg} 0%, #1E2952 100%)` }}
        >
          <h3 className="line-clamp-2 text-center text-base font-extrabold leading-tight text-white drop-shadow-sm sm:text-lg">
            {r.name}
          </h3>
        </div>
        <div className="p-3 pr-14">
          <p className="text-xs text-wn-charcoal/60">
            {r.state}
            {r.region ? ` · ${r.region}` : ""}
            {r.vertical_drop ? ` · ${r.vertical_drop.toLocaleString()} ft vert` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {(r.passes ?? []).map((p) => (
              <span
                key={p}
                className="inline-block rounded px-1.5 py-0.5 text-[9px] font-semibold"
                style={{ backgroundColor: passColor(p), color: textOn(passColor(p)) }}
              >
                {passLabel(p)}
              </span>
            ))}
          </div>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => removeGuestFavorite(r.id)}
        aria-label={`Remove ${r.name} from favorites`}
        title="Remove from this device"
        className="absolute bottom-2 right-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-lg text-red-500 transition hover:bg-red-50"
      >
        <span aria-hidden="true">♥</span>
      </button>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-wn-charcoal/10 bg-white shadow-sm" aria-hidden="true">
      <div className="h-28 animate-pulse bg-wn-charcoal/10 motion-reduce:animate-none" />
      <div className="space-y-2 p-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-wn-charcoal/10 motion-reduce:animate-none" />
        <div className="h-3 w-1/3 animate-pulse rounded bg-wn-charcoal/10 motion-reduce:animate-none" />
      </div>
    </div>
  );
}
