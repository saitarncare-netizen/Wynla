"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Props = {
  resortId: number;
  // Larger size for hero areas; default fits inline in the panel header.
  size?: "sm" | "lg";
};

// Heart icon — toggles a row in the `favorites` table. Optimistic UI: flip
// the heart immediately, then revert if the request fails. Signed-out users
// are routed to /login (with a `next` param so they return here after login).
export default function FavoriteToggle({ resortId, size = "sm" }: Props) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [signedIn, setSignedIn] = useState<boolean | undefined>(undefined);
  const [favorited, setFavorited] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      const isSignedIn = !!data.user;
      setSignedIn(isSignedIn);
      if (!isSignedIn) return;

      supabase
        .from("favorites")
        .select("resort_id")
        .eq("resort_id", resortId)
        .eq("user_id", data.user!.id)
        .maybeSingle()
        .then(({ data }) => {
          if (!cancelled) setFavorited(!!data);
        });
    });

    return () => {
      cancelled = true;
    };
  }, [resortId, supabase]);

  async function toggle() {
    if (signedIn === false) {
      // Bounce to login, preserving where to come back to.
      const here = window.location.pathname + window.location.search;
      router.push(`/login?next=${encodeURIComponent(here)}`);
      return;
    }
    if (signedIn === undefined || pending) return;
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
      } else {
        const { error } = await supabase
          .from("favorites")
          .insert({ resort_id: resortId, user_id: uid });
        if (error) throw error;
      }
    } catch {
      setFavorited(prev);
    } finally {
      setPending(false);
    }
  }

  const dim = size === "lg" ? "h-10 w-10 text-xl" : "h-9 w-9 text-base";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={favorited}
      title={
        signedIn === false
          ? "Sign in to save"
          : favorited
            ? "Remove from favorites"
            : "Save to favorites"
      }
      className={[
        "inline-flex items-center justify-center rounded-full bg-white/95 shadow-md backdrop-blur-sm transition",
        dim,
        favorited ? "text-red-500" : "text-wn-charcoal/60 hover:text-wn-navy",
        pending ? "scale-95" : "",
      ].join(" ")}
    >
      <span aria-hidden="true">{favorited ? "♥" : "♡"}</span>
    </button>
  );
}
