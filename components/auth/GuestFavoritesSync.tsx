"use client";

// Folds hearts tapped before sign-in into the account the moment a
// session exists. Lives in the root layout rather than in AuthButton
// because AuthButton is only mounted on the map header: the 6-digit code
// fires SIGNED_IN on /login (no header there), and the magic-link and
// Google paths land through /auth/callback as a full page load, where a
// fresh subscription only ever sees INITIAL_SESSION. One always-mounted
// listener covers every path; lib/guestFavorites.shouldMergeGuestFavorites
// keeps it silent (no network) unless a device list exists.

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getGuestFavoriteIds, mergeGuestFavorites, shouldMergeGuestFavorites } from "@/lib/guestFavorites";

export default function GuestFavoritesSync() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    let inFlight = false;

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled || inFlight) return;
      const userId = session?.user?.id;
      if (!shouldMergeGuestFavorites(event, userId, getGuestFavoriteIds()) || !userId) return;
      inFlight = true;
      // Deferred out of the auth callback: the SDK holds its session lock
      // while notifying subscribers, and a query issued inside it waits on
      // that same lock for its access token.
      setTimeout(() => {
        void mergeGuestFavorites(supabase, userId).then((r) => {
          inFlight = false;
          if (cancelled) return;
          if (r.error) {
            console.warn("[auth] guest favorites merge failed:", r.error);
            return;
          }
          // Server-rendered pages (/favorites, /today) read the table;
          // refresh so the merged hearts show without a reload. The merge
          // usually lands after /login has already replaced the route, so
          // this refreshes the page the person is now on.
          if (r.merged > 0) router.refresh();
        });
      }, 0);
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}
