// @vitest-environment jsdom

// Render tests for the AppShell review fixes: the sign-in link keeps the
// query string in `next`, the phone action is 44 px, the signed-in phone
// action never links to the page it is on, and the map route gets no bar.
// next/navigation and the Supabase browser client are mocked so the test
// controls the route and the session without a Next runtime or network.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

const nav = vi.hoisted(() => ({ pathname: "/guides", search: "" }));
const auth = vi.hoisted(() => ({ user: null as { email: string } | null }));

vi.mock("next/navigation", () => ({
  usePathname: () => nav.pathname,
  useSearchParams: () => new URLSearchParams(nav.search),
}));

vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: {
      getSession: () => Promise.resolve({ data: { session: auth.user ? { user: auth.user } : null } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
  }),
}));

import AppShell from "./AppShell";

async function renderShell() {
  const utils = render(<AppShell />);
  // Let getSession resolve and the cookie-hint render settle.
  await act(async () => {});
  return utils;
}

beforeEach(() => {
  nav.pathname = "/guides";
  nav.search = "";
  auth.user = null;
});
afterEach(cleanup);

describe("AppShell", () => {
  it("renders nothing on the map route", async () => {
    nav.pathname = "/";
    const { container } = await renderShell();
    expect(container.innerHTML).toBe("");
  });

  it("keeps the query string in the sign-in return path", async () => {
    nav.pathname = "/trip/abc";
    nav.search = "tab=cost";
    await renderShell();
    const link = screen.getByRole("link", { name: "Sign in" });
    expect(link.getAttribute("href")).toBe(`/login?next=${encodeURIComponent("/trip/abc?tab=cost")}`);
  });

  it("gives the phone sign-in action a 44 px tap target and 36 px only on desktop", async () => {
    await renderShell();
    const cls = screen.getByRole("link", { name: "Sign in" }).className;
    expect(cls).toContain("min-h-11");
    expect(cls).toContain("md:min-h-9");
  });

  it("shows the Saturday action to signed-in visitors, except on /go itself", async () => {
    auth.user = { email: "rider@example.com" };
    // The desktop link row also carries Saturday; the phone action is the
    // md:hidden one in the right-hand slot.
    const phoneSaturday = () =>
      screen.queryAllByRole("link", { name: "Saturday" }).filter((a) => a.className.includes("md:hidden"));
    await renderShell();
    expect(phoneSaturday().map((a) => a.getAttribute("href"))).toEqual(["/go"]);
    cleanup();

    nav.pathname = "/go";
    await renderShell();
    expect(phoneSaturday()).toEqual([]);
    // The desktop link row still marks /go as the current page.
    const current = screen.getAllByRole("link").filter((a) => a.getAttribute("aria-current") === "page");
    expect(current.map((a) => a.getAttribute("href"))).toContain("/go");
  });
});
