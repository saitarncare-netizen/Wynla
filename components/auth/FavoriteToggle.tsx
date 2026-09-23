"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { FREE_LIMITS } from "@/lib/tierLimits";
import {
  GUEST_FAVORITES_CHANGE_EVENT,
  addGuestFavorite,
  claimGuestToast,
  isGuestFavorite,
  removeGuestFavorite,
} from "@/lib/guestFavorites";

type Props = {
  resortId: number;
  // Larger size for hero areas; default fits inline in the panel header.
  size?: "sm" | "lg";
};

// Heart icon. Signed in: toggles a row in the `favorites` table with an
// optimistic flip that reverts if the request fails. Signed out: toggles
// the device list in lib/guestFavorites instead of bouncing to /login,
// with a one-time toast saying where the save lives. AuthButton merges
// the device list into the account on the next sign-in.
export default function FavoriteToggle({ resortId, size = "sm" }: Props) {
  const supabase = createSupabaseBrowserClient();
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  const [favorited, setFavorited] = useState(false);
  const [pending, setPending] = useState(false);
  const [favCount, setFavCount] = useState<number | null>(null);
  // Short status line under the heart: the device toast, a full-list
  // notice, or a save failure. Cleared on a timer.
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const syncGuest = () => {
      if (!cancelled) setFavorited(isGuestFavorite(resortId));
    };

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const isSignedIn = !!data.user;
      setSignedIn(isSignedIn);
      if (!isSignedIn) {
        syncGuest();
        // Another heart for this resort (panel header + hero) may flip
        // the device list; keep every instance in step.
        window.addEventListener(GUEST_FAVORITES_CHANGE_EVENT, syncGuest);
        window.addEventListener("storage", syncGuest);
        return;
      }

      // Fetch favorited state for this resort AND total favorites count
      // in parallel so the cap check has its data before the first tap.
      const uid = data.user!.id;
      void Promise.all([
        supabase
          .from("favorites")
          .select("resort_id")
          .eq("resort_id", resortId)
          .eq("user_id", uid)
          .maybeSingle(),
        supabase
          .from("favorites")
          .select("resort_id", { count: "exact", head: true })
          .eq("user_id", uid),
      ]).then(([rowRes, countRes]) => {
        if (cancelled) return;
        setFavorited(!!rowRes.data);
        setFavCount(countRes.count ?? 0);
      });
    });

    return () => {
      cancelled = true;
      window.removeEventListener(GUEST_FAVORITES_CHANGE_EVENT, syncGuest);
      window.removeEventListener("storage", syncGuest);
    };
  }, [resortId, supabase]);

  useEffect(() => {
    if (!notice) return;
    const id = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(id);
  }, [notice]);

  function toggleGuest() {
    if (favorited) {
      removeGuestFavorite(resortId);
      setFavorited(false);
      return;
    }
    const r = addGuestFavorite(resortId);
    if (r.full) {
      setNotice("This device's list is full. Sign in to keep saving.");
      return;
    }
    setFavorited(true);
    if (claimGuestToast()) setNotice("Saved on this device. Sign in to keep them everywhere.");
  }

  async function toggle() {
    if (pending) return;
    if (signedIn === false) {
      toggleGuest();
      return;
    }
    if (signedIn === undefined) return;
    // Wait for the count before the first add so a tap in the first
    // ~200 ms cannot slip past the cap; null means "not loaded yet".
    if (!favorited && favCount === null) return;
    if (!favorited && favCount !== null && favCount >= FREE_LIMITS.favorites) {
      setNotice(`You can save up to ${FREE_LIMITS.favorites} resorts.`);
      return;
    }
    const prev = favorited;
    setFavorited(!prev);
    setPending(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("not signed in");
      if (prev) {
        const { error } = await supabase
          .from("favorites")
          .delete()
          .eq("resort_id", resortId)
          .eq("user_id", uid);
        if (error) throw error;
        setFavCount((c) => (c == null ? c : Math.max(0, c - 1)));
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ resort_id: resortId, user_id: uid });
        if (error) throw error;
        setFavCount((c) => (c == null ? c : c + 1));
      }
    } catch {
      setFavorited(prev);
      setNotice("Could not save. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  // lg (resort hero) meets the 44 px tap target; sm matches the 36 px
  // controls it sits beside in the map panel header.
  const dim = size === "lg" ? "h-11 w-11 text-xl" : "h-9 w-9 text-base";

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={toggle}
        aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
        aria-pressed={favorited}
        title={
          signedIn === false
            ? favorited
              ? "Remove from this device's favorites"
              : "Save on this device"
            : favorited
              ? "Remove from favorites"
              : "Save to favorites"
        }
        className={[
          "inline-flex items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur-sm transition motion-reduce:transition-none",
          dim,
          favorited ? "text-red-500" : "text-wn-charcoal/60 hover:text-wn-navy",
          pending ? "scale-95" : "",
        ].join(" ")}
      >
        <span aria-hidden="true">{favorited ? "♥" : "♡"}</span>
      </button>
      {/* Toast anchored under the heart. role=status so screen readers
          hear it without stealing focus. */}
      {notice && (
        <div
          role="status"
          className="absolute right-0 top-full z-30 mt-2 w-56 rounded-lg border border-wn-charcoal/10 bg-wn-navy px-3 py-2 text-left text-[11px] font-medium leading-snug text-white shadow-lg"
        >
          {notice}
        </div>
      )}
    </div>
  );
}
