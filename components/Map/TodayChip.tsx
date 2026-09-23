"use client";

// "☀️ Today" pill in the phone header's secondary row for signed-in users
// who have saved at least one resort: one tap to the Go / Wait / Skip
// screen. Renders nothing while the favorites count is unknown or zero,
// so a brand-new account sees no dead link. The secondary row only takes
// space once a pill like this one has rendered (MapPage).

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { HIT_AREA_44 } from "@/lib/hitArea";

export default function TodayChip() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const sb = createSupabaseBrowserClient();
      // getSession reads the local cookie/storage; getUser would be a
      // round trip to Supabase Auth on every map load. MapPage already
      // mounts this only for signed-in users, so a missing session just
      // means "no chip".
      const { data: s } = await sb.auth.getSession();
      const userId = s.session?.user.id;
      if (!userId || cancelled) return;
      // Head request: the count is all we need, RLS scopes it to the user.
      const { count: n, error } = await sb
        .from("favorites")
        .select("resort_id", { count: "exact", head: true })
        .eq("user_id", userId);
      if (!cancelled) setCount(error ? 0 : (n ?? 0));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!count) return null;

  return (
    <Link
      href="/today"
      // 36 px pill with a 44 px hit area (lib/hitArea) in the 44 px row.
      className={`${HIT_AREA_44} inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border border-wn-navy/20 bg-white/95 pl-3 pr-2 text-xs font-bold text-wn-navy shadow-md backdrop-blur-sm transition hover:border-wn-navy active:scale-95`}
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
  );
}
