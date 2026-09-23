"use client";

// AppShell — the top bar on every non-map route (audit design-system-29:
// the layout had no <nav>; 22 pages hand-rolled their own header with
// eight different back links).
//
//   Desktop (md+)  lockup · Map · Today · Saturday · Guides · Trips …
//                  Account avatar / Sign in on the right
//   Phone          back link · lockup · one action (Sign in, or the
//                  Saturday pick when signed in). The link row is hidden
//                  because components/AppTabBar.tsx carries Map / Today /
//                  Trips / Account at the bottom — same items, same
//                  active-route rules, from lib/nav.ts.
//   Map route (/)  renders nothing; MapPage owns its floating header.
//   Flow routes    (/login, /auth, /get, shared links) keep the mark and
//                  the back link only, so the page stays a single task.
//
// Sign-in state
// -------------
// The root layout is shared by ~480 ISR pages, and reading the auth
// cookie there (cookies() in a server component) would force every one
// of them to render per request. So the state is resolved in three
// steps, cheapest first:
//   1. A page that already has the user on the server passes
//      `initialUser` (zero flicker, no client work).
//   2. Otherwise, the presence of the Supabase auth cookie is read from
//      document.cookie during hydration (@supabase/ssr writes it
//      httpOnly: false because the browser client has to read it). No
//      cookie means signed out, so the common case — a signed-out visitor
//      on an ISR page — paints "Sign in" straight away instead of a
//      neutral "Account" that swaps a moment later.
//   3. getSession (local, no network) confirms the user and supplies the
//      email initial for the avatar; onAuthStateChange keeps it fresh.
// Until step 3 settles for a visitor who does have a cookie, the phone
// slot stays empty at a fixed width and desktop shows a neutral "Account"
// link, which redirects to /login when the session turns out to be dead.
//
// The bar is sticky and pads its top by env(safe-area-inset-top) so the
// installed-app status bar never covers it; app/globals.css subtracts
// --wn-shell-h from each page's min-height.

import { Suspense, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { activeNavItem, backLinkFor, isFlowRoute, isMapRoute, NAV_ITEMS } from "@/lib/nav";
import BrandMark from "@/components/BrandMark";
import Icon from "@/components/icons/Icon";
import { buttonClasses } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";

export type ShellUser = { email: string | null } | null;

type AuthState = { known: false } | { known: true; user: ShellUser };

// @supabase/ssr stores the session as sb-<ref>-auth-token, split into
// .0 / .1 chunks when it outgrows one cookie. <ref> is the first label of
// the Supabase hostname, which can contain hyphens on a custom domain.
// Only the presence is read; the value is never parsed here. A false
// negative only costs the old behaviour (a "Sign in" that getSession
// corrects a moment later), never a wrong signed-in state.
const AUTH_COOKIE = /(?:^|;\s*)sb-[a-z0-9-]+-auth-token(?:\.\d+)?=/i;

function readAuthCookieHint(): boolean {
  try {
    return AUTH_COOKIE.test(document.cookie);
  } catch {
    return false;
  }
}

// The cookie only changes through Supabase auth events, which
// onAuthStateChange below already reports, so nothing to subscribe to.
const subscribeNoop = () => () => {};
const serverCookieHint = () => null;

function useShellAuth(initialUser: ShellUser | undefined): AuthState {
  const [state, setState] = useState<AuthState>(initialUser === undefined ? { known: false } : { known: true, user: initialUser });
  // null while hydrating (matches the server HTML, so no mismatch), then
  // the real boolean on the render React schedules right after.
  const cookieHint = useSyncExternalStore(subscribeNoop, readAuthCookieHint, serverCookieHint);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    // getSession reads the cookie-backed session locally; the proxy has
    // already refreshed it on the way in, so no round trip is needed.
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      const u = data.session?.user;
      setState({ known: true, user: u ? { email: u.email ?? null } : null });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      const u = session?.user;
      setState({ known: true, user: u ? { email: u.email ?? null } : null });
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  if (state.known) return state;
  // No auth cookie at all: there is no session for getSession to find.
  if (cookieHint === false) return { known: true, user: null };
  return state;
}

// useSearchParams needs a Suspense boundary on statically rendered pages
// (Next renders the fallback at build time and the real link on the
// client), which is why the sign-in link is its own component: `next`
// has to keep the query string, so /trip/abc?tab=cost comes back to the
// same tab after the code entry.
function SignInLink({ pathname, className }: { pathname: string; className: string }) {
  const search = useSearchParams()?.toString();
  const next = search ? `${pathname}?${search}` : pathname;
  return (
    <Link href={`/login?next=${encodeURIComponent(next)}`} className={className}>
      Sign in
    </Link>
  );
}

export default function AppShell({ initialUser }: { initialUser?: ShellUser }) {
  const pathname = usePathname() ?? "/";
  const auth = useShellAuth(initialUser);

  if (isMapRoute(pathname)) return null;

  const flow = isFlowRoute(pathname);
  const back = backLinkFor(pathname);
  const active = activeNavItem(pathname);
  const signedIn = auth.known && auth.user !== null;
  const initial = auth.known && auth.user?.email ? auth.user.email.slice(0, 1).toUpperCase() : null;
  // Phone action buttons are 44 px (the guide's phone minimum) and drop
  // to the 36 px dense size only inside the desktop bar.
  const actionSize = "md:min-h-9 md:px-3";

  return (
    <header
      className="sticky top-0 z-40 border-b border-wn-line bg-white/95 backdrop-blur-sm"
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className="mx-auto flex h-[var(--wn-shell-h)] max-w-6xl items-center gap-1 px-2 sm:gap-2 sm:px-4 lg:px-6">
        {/* Phone: back link. Desktop has the full link row instead. */}
        <Link
          href={back.href}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-1 rounded-wn-sm px-2 text-sm font-semibold text-wn-navy hover:bg-wn-navy/5 md:hidden"
        >
          <Icon name="arrow-left" className="h-5 w-5" />
          <span className="sr-only sm:not-sr-only">{back.label}</span>
        </Link>

        {/* min-h-11: the lockup image is ~28 px tall; the link box is 44. */}
        <BrandMark variant="lockup" priority className="min-h-11 px-1" />

        {!flow && (
          <nav aria-label="Primary" className="ml-4 hidden items-center gap-0.5 md:flex">
            {NAV_ITEMS.filter((item) => item.href !== "/account").map((item) => {
              const isActive = active?.href === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={cx(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-wn-sm px-3 text-sm font-semibold transition-colors",
                    isActive ? "bg-wn-navy/5 text-wn-navy" : "text-wn-muted hover:bg-wn-navy/5 hover:text-wn-navy",
                  )}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}

        <div className="ml-auto flex min-w-[5.5rem] items-center justify-end gap-2">
          {flow ? null : !auth.known ? (
            <Link href="/account" className={cx(buttonClasses({ variant: "ghost", size: "sm" }), "hidden md:inline-flex")}>
              Account
            </Link>
          ) : signedIn ? (
            <>
              {/* Phone: the Saturday pick is the one destination the tab
                  bar does not carry. Desktop: it is in the link row. Not
                  shown on /go itself (a link to the current page). */}
              {active?.href !== "/go" && (
                <Link href="/go" className={cx(buttonClasses({ variant: "secondary", size: "md" }), "md:hidden")}>
                  <Icon name="compass" className="h-4 w-4" />
                  Saturday
                </Link>
              )}
              <Link
                href="/account"
                aria-label="Account"
                aria-current={active?.href === "/account" ? "page" : undefined}
                className="hidden h-9 w-9 items-center justify-center rounded-full bg-wn-navy text-sm font-bold text-white shadow-wn-sm transition-colors hover:bg-wn-navy/90 md:inline-flex"
              >
                {initial ?? <Icon name="user" className="h-4 w-4" />}
              </Link>
            </>
          ) : (
            <Suspense
              fallback={
                <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonClasses({ variant: "primary", size: "md", className: actionSize })}>
                  Sign in
                </Link>
              }
            >
              <SignInLink pathname={pathname} className={buttonClasses({ variant: "primary", size: "md", className: actionSize })} />
            </Suspense>
          )}
        </div>
      </div>
    </header>
  );
}
