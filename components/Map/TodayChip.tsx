"use client";

// "☀️ Today" chip on the map for signed-in users who have saved at least
// one resort: one tap to the Go / Wait / Skip screen. Same slot and
// styling as ActiveTripChip. Renders nothing while the favorites count
// is unknown or zero, so a brand-new account sees no dead link.

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function TodayChip() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = createSupabaseBrowserClient();
      const { data: u } = await sb.auth.getUser();
      if (!u.user || cancelled) return;
      // Head request: the count is all we need, RLS scopes it to the user.
      const { count: n } = await sb
        .from("favorites")
        .select("resort_id", { count: "exact", head: true })
        .eq("user_id", u.user.id);
      if (!cancelled) setCount(n ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!count) return null;

  return (
    <div className="flex justify-center px-3 pt-2 sm:justify-end sm:px-6">
      <Link
        href="/today"
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-wn-navy/20 bg-white/95 py-1.5 pl-3 pr-2.5 text-xs font-bold text-wn-navy shadow-lg backdrop-blur-sm transition hover:border-wn-navy hover:shadow-xl active:scale-95"
      >
        <span aria-hidden="true">☀️</span>
        <span>
          Today · {count} {count === 1 ? "mountain" : "mountains"}
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
