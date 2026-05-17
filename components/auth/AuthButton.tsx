"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// Header sign-in / user-menu button. Renders nothing until we know the auth
// state, then either a "Sign in" link or a small avatar dropdown. The button
// keeps its own client-side subscription to auth state changes so it updates
// the moment the user signs in or out without a page reload.
export default function AuthButton() {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUser(data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setUser(session?.user ?? null);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  if (user === undefined) {
    // Avoid layout shift: reserve roughly the same width as the signed-out
    // state while we resolve the session.
    return <div className="h-7 w-20 animate-pulse rounded-md bg-wn-charcoal/10" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Link
        href="/login"
        className="rounded-md border border-wn-charcoal/20 bg-white px-2.5 py-1 text-xs font-semibold text-wn-charcoal/80 transition hover:border-wn-charcoal/40 hover:text-wn-navy"
      >
        Sign in
      </Link>
    );
  }

  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Account menu"
        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-wn-navy text-xs font-bold text-white transition hover:bg-wn-navy/90"
      >
        {initial}
      </button>
      {menuOpen && (
        <>
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 top-9 z-50 w-44 overflow-hidden rounded-md border border-wn-charcoal/10 bg-white shadow-lg">
            <div className="px-3 py-2 text-[11px] text-wn-charcoal/60">{user.email}</div>
            <Link
              href="/favorites"
              onClick={() => setMenuOpen(false)}
              className="block border-t border-wn-charcoal/10 px-3 py-2 text-sm font-medium text-wn-charcoal transition hover:bg-wn-offwhite hover:text-wn-navy"
            >
              ❤️ Favorites
            </Link>
            <Link
              href="/trips"
              onClick={() => setMenuOpen(false)}
              className="block border-t border-wn-charcoal/10 px-3 py-2 text-sm font-medium text-wn-charcoal transition hover:bg-wn-offwhite hover:text-wn-navy"
            >
              🗺️ My trips
            </Link>
            <Link
              href="/account"
              onClick={() => setMenuOpen(false)}
              className="block border-t border-wn-charcoal/10 px-3 py-2 text-sm font-medium text-wn-charcoal transition hover:bg-wn-offwhite hover:text-wn-navy"
            >
              ⚙️ Account
            </Link>
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                setMenuOpen(false);
                router.refresh();
              }}
              className="block w-full border-t border-wn-charcoal/10 px-3 py-2 text-left text-sm font-medium text-wn-charcoal transition hover:bg-wn-offwhite hover:text-wn-navy"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
