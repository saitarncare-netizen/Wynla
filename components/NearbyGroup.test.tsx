// @vitest-environment jsdom

// Render tests for the nearby cards' "+ Trip" wiring: the action only
// appears when the caller passes `saveToTrip`, only on rows that know
// their table (kind), and NearbyRestaurants / NearbyActivities stamp that
// kind on server-fetched rows. The merged map strip mixes both tables, so
// a restaurant and an activity with the same id must both render.

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import type { NearbyRow } from "@/lib/nearbyCategories";
import NearbyGroup from "./NearbyGroup";
import NearbyRestaurants from "./NearbyRestaurants";
import NearbyActivities from "./NearbyActivities";

// Signed out: the button renders its idle state and never writes.
vi.mock("@/lib/supabase/client", () => ({
  createSupabaseBrowserClient: () => ({
    auth: { getSession: async () => ({ data: { session: null } }) },
  }),
}));

afterEach(cleanup);

function row(id: number, over: Partial<NearbyRow> = {}): NearbyRow {
  return {
    id,
    resort_id: 1,
    name: `Place ${id}`,
    category: "local",
    description: null,
    distance_km: id,
    drive_minutes: null,
    latitude: 39.6,
    longitude: -106.3,
    website_url: null,
    source: "osm",
    confidence_score: null,
    ...over,
  };
}

const VAIL = { resortSlug: "vail", resortName: "Vail" };

describe("NearbyGroup + Trip action", () => {
  it("shows no Trip button unless the caller opts in", () => {
    render(<NearbyGroup emoji="⭐" label="Top picks" rows={[row(1, { kind: "restaurant" })]} />);
    expect(screen.queryByRole("button", { name: /to trip$/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Directions/ })).toBeTruthy();
  });

  it("adds one Trip button per card that knows its kind", () => {
    render(
      <NearbyGroup
        emoji="⭐"
        label="Top picks"
        variant="compact"
        saveToTrip={VAIL}
        rows={[row(1, { kind: "restaurant" }), row(2, { kind: "activity" }), row(3)]}
      />,
    );
    expect(screen.getByRole("button", { name: "Add Place 1 to trip" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Place 2 to trip" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add Place 3 to trip" })).toBeNull();
  });

  it("renders a restaurant and an activity that share an id as two cards", () => {
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <NearbyGroup
        emoji="⭐"
        label="Top picks"
        saveToTrip={VAIL}
        rows={[row(5, { kind: "restaurant", name: "Diner" }), row(5, { kind: "activity", name: "Spa" })]}
      />,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(errors.mock.calls.some((c) => String(c[0]).includes("same key"))).toBe(false);
    errors.mockRestore();
  });

  it("puts Trip right after Directions so it sits in the same spot on every card", () => {
    render(
      <NearbyGroup
        emoji="⭐"
        label="Top picks"
        saveToTrip={VAIL}
        rows={[row(1, { kind: "restaurant", website_url: "https://example.com" })]}
      />,
    );
    const actions = screen
      .getAllByRole("listitem")[0]
      .querySelectorAll("a[href^='https://www.google.com/maps/dir'], button, a[href='https://example.com']");
    expect(Array.from(actions).map((el) => el.textContent?.trim())).toEqual(["Directions", "+Trip", "Website"]);
  });
});

describe("NearbyRestaurants / NearbyActivities", () => {
  it("stamp their table's kind so server rows can be saved", () => {
    render(
      <>
        <NearbyRestaurants rows={[row(1, { category: "cafe" })]} saveToTrip={VAIL} />
        <NearbyActivities rows={[row(2, { category: "spa" })]} saveToTrip={VAIL} />
      </>,
    );
    expect(screen.getByRole("button", { name: "Add Place 1 to trip" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Add Place 2 to trip" })).toBeTruthy();
  });

  it("leave the cards as they were without saveToTrip", () => {
    render(<NearbyRestaurants rows={[row(1, { category: "cafe" })]} />);
    expect(screen.queryByRole("button")).toBeNull();
  });
});
