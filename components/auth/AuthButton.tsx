"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { invalidateProStatus } from "@/lib/proClient";
import Icon from "@/components/icons/Icon";
import { customHistoryState } from "@/components/Map/sheetHistory";

// One row of the account menu. min-h-11 keeps every row a 44 px target
// (the rows were 36 px, under the phone minimum).
const MENU_ITEM =
  "flex min-h-11 items-center gap-2 border-t border-wn-charcoal/10 px-3 py-2 text-sm font-medium text-wn-charcoal transition hover:bg-wn-offwhite hover:text-wn-navy";

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
      // Guest favorites are merged by components/auth/GuestFavoritesSync
      // (root layout), not here: this button only mounts on the map
      // header, so it never sees the SIGNED_IN that /login emits.
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

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
        // 36 px avatar, 44 px target: the ::before grows the hit area.
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-full bg-wn-navy text-sm font-bold text-white shadow-sm transition before:absolute before:-inset-1 before:content-[''] hover:bg-wn-navy/90 active:scale-95"
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
              className={MENU_ITEM}
            >
              <Icon name="heart" className="h-4 w-4 text-wn-navy/70" />
              Favorites
            </Link>
            {/* "Plan a trip" is also the gold header button for everyone
                (2026-09-27); this entry stays for people who look for it
                here. On the map it opens the planner in place: a plain
                link to "/?plan=1" dropped every other param, and losing
                ?days made the planner trim a multi-day draft to one day. */}
            <Link
              href="/?plan=1"
              role="menuitem"
              onClick={(e) => {
                setMenuOpen(false);
                if (pathname !== "/") return;
                e.preventDefault();
                const params = new URLSearchParams(window.location.search);
                params.set("plan", "1");
                // Same write MapPage uses (history API + sheet-safe
                // state), so Next syncs useSearchParams without a server
                // round trip.
                window.history.replaceState(customHistoryState(window.history.state), "", `?${params.toString()}`);
              }}
              className={MENU_ITEM}
            >
              <Icon name="map" className="h-4 w-4 text-wn-navy/70" />
              Plan a trip
            </Link>
            <Link
              href="/trips"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className={MENU_ITEM}
            >
              <Icon name="trips" className="h-4 w-4 text-wn-navy/70" />
              My trips
            </Link>
            <Link
              href="/account"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className={MENU_ITEM}
            >
              <Icon name="settings" className="h-4 w-4 text-wn-navy/70" />
              Account
            </Link>
            <button
              type="button"
              role="menuitem"
              onClick={signOut}
              disabled={signingOut}
              className={`${MENU_ITEM} w-full text-left disabled:opacity-60`}
            >
              {signingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
