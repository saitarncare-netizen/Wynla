"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { invalidateProStatus } from "@/lib/proClient";
import { mergeGuestFavorites } from "@/lib/guestFavorites";
import Icon from "@/components/icons/Icon";

// Header sign-in / user-menu button. Renders nothing until we know the auth
// state, then either a "Sign in" link or a small avatar dropdown. The button
// keeps its own client-side subscription to auth state changes so it updates
// the moment the user signs in or out without a page reload.
export default function AuthButton() {
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createSupabaseBrowserClient();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setUser(data.user);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      // The Pro-status cache is per page load and would otherwise keep the
      // previous account's answer across a client-side sign-in/out.
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") invalidateProStatus();
      // Hearts tapped before sign-in live on this device; fold them into
      // the account now. The SDK may emit SIGNED_IN more than once per
      // session (tab refocus), which is safe: the merge is a no-op when
      // the device list is empty and the upsert ignores duplicates.
      if (event === "SIGNED_IN" && session?.user) {
        void mergeGuestFavorites(supabase, session.user.id).then((r) => {
          if (cancelled) return;
          if (r.error) console.warn("[auth] guest favorites merge failed:", r.error);
          // Server-rendered pages (/favorites, /today) read the table;
          // refresh so the merged hearts show without a reload.
          else if (r.merged > 0) router.refresh();
        });
      }
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase, router]);

  // Escape closes the menu and returns focus to the trigger, as a menu
  // button is expected to.
  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  async function signOut() {
    if (signingOut) return;
    setSigningOut(true);
    // Local scope: only this browser's session is revoked. The SDK default
    // (global) revoked every device's refresh token, so signing out on the
    // phone silently killed the laptop on its next refresh. "Sign out of all
    // devices" is an explicit choice on /account (app/account/SignOutButtons).
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) {
      // The SDK keeps the local session when the server refuses (network
      // blip, 5xx); a refresh shows the person they are still signed in
      // instead of pretending otherwise. Logged so it is observable.
      console.warn("[auth] sign-out failed:", error.code ?? error.message);
    }
    setMenuOpen(false);
    setSigningOut(false);
    router.refresh();
  }

  if (user === undefined) {
    // Reserve the same footprint as the resolved Sign-in pill so we don't
    // get a layout shift when the auth state lands.
    return <div className="h-11 w-11 animate-pulse rounded-md bg-wn-charcoal/10 sm:w-24" aria-hidden="true" />;
  }

  if (!user) {
    // Mobile: icon-only square pill matching the other header buttons
    // (search/trips/plan/filters → all h-11 px-2.5 with icon-only on
    // small viewports). Desktop reveals the "Sign in" label.
    // whitespace-nowrap so the label never wraps to two lines when the
    // header gets cramped on edge-case widths (iPhone SE / split view).
    // `next` brings people back to the page they were on after sign-in.
    const loginHref = pathname && pathname !== "/" ? `/login?next=${encodeURIComponent(pathname)}` : "/login";
    return (
      <Link
        href={loginHref}
        className="inline-flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-wn-charcoal/20 bg-white px-2 text-xs font-semibold text-wn-charcoal shadow-sm transition hover:border-wn-navy hover:text-wn-navy active:scale-95 sm:px-3"
        title="Sign in"
        aria-label="Sign in"
      >
        <Icon name="user" className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const initial = (user.email ?? "?").slice(0, 1).toUpperCase();

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        aria-label="Account menu"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        // Only point at the menu while it exists in the DOM; a dangling id
        // is flagged by axe and announced as an unreachable control.
        aria-controls={menuOpen ? "account-menu" : undefined}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-wn-navy text-sm font-bold text-white shadow-sm transition hover:bg-wn-navy/90 active:scale-95"
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
          <div
            id="account-menu"
            role="menu"
            aria-label="Account"
            className="absolute right-0 top-9 z-50 w-48 overflow-hidden rounded-md border border-wn-charcoal/10 bg-white shadow-lg"
          >
            <div className="px-3 py-2 text-[11px] text-wn-charcoal/60">{user.email}</div>
            <Link
              href="/favorites"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 border-t border-wn-charcoal/10 px-3 py-2 text-sm font-medium text-wn-charcoal transition hover:bg-wn-offwhite hover:text-wn-navy"
            >
              <Icon name="heart" className="h-4 w-4 text-wn-navy/70" />
              Favorites
            </Link>
            {/* Stage 4 — "Plan a trip" + "My trips" relocated here from
                the map header. The header now keeps a single anon-only
                "Plan a trip" entry; once signed in those links live
                inside this dropdown to keep the top-of-app uncluttered. */}
            <Link
              href="/?plan=1"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 border-t border-wn-charcoal/10 px-3 py-2 text-sm font-medium text-wn-charcoal transition hover:bg-wn-offwhite hover:text-wn-navy"
            >
              <span aria-hidden="true" className="text-base leading-none">🗺️</span>
              Plan a trip
            </Link>
            <Link
              href="/trips"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 border-t border-wn-charcoal/10 px-3 py-2 text-sm font-medium text-wn-charcoal transition hover:bg-wn-offwhite hover:text-wn-navy"
            >
              <Icon name="trips" className="h-4 w-4 text-wn-navy/70" />
              My trips
            </Link>
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 border-t border-wn-charcoal/10 px-3 py-2 text-sm font-medium text-wn-charcoal transition hover:bg-wn-offwhite hover:text-wn-navy"
            >
              <Icon name="settings" className="h-4 w-4 text-wn-navy/70" />
              Account
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={signingOut}
              className="block w-full border-t border-wn-charcoal/10 px-3 py-2 text-left text-sm font-medium text-wn-charcoal transition hover:bg-wn-offwhite hover:text-wn-navy disabled:opacity-60"
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
