"use client";

// Trip-mode discoverability. Saitarn designed the "mark day complete"
// flow herself and STILL couldn't find it — because it only lives on
// /trip/[id]. This chip surfaces the user's active (started, unfinished)
// trip right on the map: "🎿 Day 2 · Ikon Week →". One tap = the
// itinerary. Renders nothing for signed-out users, users with no active
// trip, or while a search/planner flow has the screen.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type ActiveTrip = {
  id: string;
  name: string | null;
  current_day: number | null;
  total_days: number;
};

export default function ActiveTripChip() {
  const [trip, setTrip] = useState<ActiveTrip | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = createSupabaseBrowserClient();
      const { data: u } = await sb.auth.getUser();
      if (!u.user || cancelled) return;
      // Most recently started, not yet finished. completed_days length vs
      // total_days is checked client-side (array column).
      const { data } = await sb
        .from("trips")
        .select("id, name, current_day, total_days, completed_days, started_at")
        .eq("user_id", u.user.id)
        .not("started_at", "is", null)
        .order("started_at", { ascending: false })
        // 20, not 5 — a user whose 5 newest started trips are all finished
        // would otherwise never see their older still-active trip.
        .limit(20);
      if (cancelled || !data) return;
      const active = data.find(
        (t) => (t.completed_days?.length ?? 0) < t.total_days,
      );
      if (active) {
        setTrip({
          id: active.id,
          name: active.name,
          current_day: active.current_day,
          total_days: active.total_days,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!trip) return null;
  const day = Math.min(Math.max(trip.current_day ?? 1, 1), trip.total_days);

  return (
    // In-flow row under the header (same slot as RecentlyViewedStrip) so
    // it never overlaps map controls; right-aligned on desktop.
    <div className="flex justify-center px-3 pt-2 sm:justify-end sm:px-6">
      <Link
        href={`/trip/${trip.id}`}
        className="inline-flex items-center gap-2 rounded-full border border-wn-navy/20 bg-white/95 py-1.5 pl-3 pr-2.5 text-xs font-bold text-wn-navy shadow-lg backdrop-blur-sm transition hover:border-wn-navy hover:shadow-xl active:scale-95"
      >
        <span aria-hidden="true">🎿</span>
        <span className="max-w-[180px] truncate">
          Day {day} of {trip.total_days}
          {trip.name ? ` · ${trip.name}` : ""}
        </span>
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-wn-navy text-[11px] text-white"
        >
          →
        </span>
      </Link>
    </div>
  );
}
