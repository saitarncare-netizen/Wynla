import { describe, expect, it } from "vitest";
import { activeNavItem, backLinkFor, isFlowRoute, isMapRoute, NAV_ITEMS, TAB_ITEMS } from "@/lib/nav";

describe("nav model", () => {
  it("lights up exactly one item per route", () => {
    const routes = ["/", "/resort/vail", "/state/co", "/near/nyc", "/compare", "/today", "/go", "/guides", "/guides/ikon-vs-epic", "/lists/powder", "/trip-templates/x", "/deals", "/trips", "/trip/abc", "/account", "/account/pro", "/favorites"];
    for (const r of routes) {
      expect(NAV_ITEMS.filter((i) => i.match(r)).length, r).toBe(1);
    }
  });

  it("does not light anything on flow routes", () => {
    for (const r of ["/login", "/auth/callback", "/get", "/privacy", "/credits", "/data-sources"]) {
      expect(activeNavItem(r), r).toBeUndefined();
    }
  });

  it("keeps the phone tab bar at four places", () => {
    expect(TAB_ITEMS.map((i) => i.label)).toEqual(["Map", "Today", "Trips", "Account"]);
  });

  it("classifies flows and the map", () => {
    expect(isFlowRoute("/login")).toBe(true);
    expect(isFlowRoute("/login/anything")).toBe(true);
    expect(isFlowRoute("/trip/share/abc")).toBe(true);
    expect(isFlowRoute("/trip/abc")).toBe(false);
    expect(isFlowRoute("/getaway")).toBe(false);
    expect(isMapRoute("/")).toBe(true);
    expect(isMapRoute("/today")).toBe(false);
  });

  it("sends nested pages back to their index and everything else to the map", () => {
    expect(backLinkFor("/guides/ikon-vs-epic")).toEqual({ href: "/guides", label: "Guides" });
    expect(backLinkFor("/lists/powder")).toEqual({ href: "/lists", label: "Lists" });
    expect(backLinkFor("/trip/abc")).toEqual({ href: "/trips", label: "Trips" });
    expect(backLinkFor("/trip/share/abc")).toEqual({ href: "/", label: "Map" });
    expect(backLinkFor("/account/pro")).toEqual({ href: "/account", label: "Account" });
    expect(backLinkFor("/resort/vail")).toEqual({ href: "/", label: "Map" });
    expect(backLinkFor("/near/nyc")).toEqual({ href: "/", label: "Map" });
    expect(backLinkFor("/privacy")).toEqual({ href: "/", label: "Map" });
  });
});
