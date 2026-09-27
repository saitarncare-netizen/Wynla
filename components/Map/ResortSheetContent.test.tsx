// @vitest-environment jsdom

// Render tests for the sheet body pieces the 2026-09-27 package changed:
// the 2x2 conditions tiles (lazy per-resort extras, projected openings,
// no truncation), "The mountain" facts, the full-page button, and the
// nearby strip without its "See all" link. The two network reads are
// mocked so each test controls when (and for which resort) they answer.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import type { ResortStatus } from "@/lib/seasonDates";
import type { ResortWeatherExtras } from "@/lib/fetchResortWeather";
import type { Resort } from "./MapPage";

const net = vi.hoisted(() => ({
  weather: new Map<number, (v: ResortWeatherExtras | null) => void>(),
  nearby: [] as Array<Record<string, unknown>>,
}));

vi.mock("@/lib/fetchResortWeather", () => ({
  fetchResortWeather: (id: number) => new Promise((resolve) => net.weather.set(id, resolve)),
}));
vi.mock("@/lib/fetchNearby", () => ({
  fetchNearbyRestaurants: () => Promise.resolve(net.nearby),
  fetchNearbyActivities: () => Promise.resolve([]),
}));

import { ConditionsGlance, FullPageButton, MountainFacts, NearbyInPanel } from "./ResortSheetContent";

function resort(over: Partial<Resort> = {}): Resort {
  return {
    id: 1,
    slug: "test-peak",
    name: "Test Peak",
    state: "CO",
    region: null,
    city: null,
    latitude: 39.6,
    longitude: -106.0,
    passes: [],
    tier: "listed",
    vertical_drop: 3450,
    total_trails: 147,
    total_acres: null,
    website_url: null,
    has_night_skiing: true,
    difficulty_pct_beginner: 20,
    difficulty_pct_intermediate: 45,
    difficulty_pct_advanced: 25,
    difficulty_pct_expert: 10,
    trails_beginner: null,
    trails_intermediate: null,
    trails_advanced: null,
    trails_expert: null,
    has_terrain_park: null,
    terrain_park_count: null,
    total_lifts: 31,
    high_speed_lifts: null,
    base_elevation_ft: 8120,
    summit_elevation_ft: 11570,
    annual_snowfall_in: null,
    season_open_text: null,
    season_close_text: null,
    typical_season_start: null,
    typical_season_end: null,
    operating_status: null,
    snowmaking_pct: null,
    hero_image_url: null,
    hero_image_alt: null,
    snow_base_depth_in: null,
    snow_new_24h_in: null,
    trails_open_today: null,
    lifts_open_today: null,
    snow_report_status: null,
    snow_report_updated_at: null,
    ticket_price_adult_min: null,
    ticket_price_adult_max: null,
    has_tubing: null,
    has_lessons: null,
    has_rentals: null,
    has_lodging_on_mountain: null,
    has_xc_skiing: null,
    has_backcountry_access: null,
    webcam_url: null,
    closest_airport_iata: null,
    lift_types: null,
    currently_open: null,
    season_end_date: null,
    current_surface_class: null,
    has_adaptive_program: null,
    ...over,
  };
}

const OPENS: ResortStatus = { kind: "opens", label: "Opens Dec 18", detail: "in 82 days", tone: "navy", dormant: true };
const WEATHER = {
  resort_id: 1,
  temp_high_f: 41,
  temp_low_f: 22,
  conditions_short: "Slight chance snow showers",
  fetched_at: new Date().toISOString(),
};
const EXTRAS: ResortWeatherExtras = { snowNext3In: 7.6, lowF: 22, todayWindMph: 12, todayGustMph: 30, fetchedAt: null };

beforeEach(() => {
  net.weather.clear();
  net.nearby = [];
});
afterEach(cleanup);

describe("ConditionsGlance", () => {
  it("shows four untruncated tiles and fills the next-3-days tile when the read lands", async () => {
    const { container } = render(
      <ConditionsGlance resort={resort()} weather={WEATHER} status={OPENS} openProjected />,
    );
    expect(container.querySelectorAll("dl > div")).toHaveLength(4);
    expect(container.querySelector("dl")?.className).toContain("grid-cols-2");
    expect(container.querySelector(".truncate")).toBeNull();
    expect(screen.getByText("41° / 22°F")).toBeTruthy();
    expect(screen.getByText("Slight chance snow showers")).toBeTruthy();
    expect(screen.getByText("in 82 days · projected")).toBeTruthy();
    expect(screen.getByText("…")).toBeTruthy();

    await act(async () => net.weather.get(1)!(EXTRAS));
    expect(screen.getByText('8"')).toBeTruthy();
    expect(screen.getByText("Slight chance snow showers · wind up to 12 mph, gusts 30")).toBeTruthy();
  });

  it("never shows the previous resort's answer on the next pin", async () => {
    const { rerender } = render(
      <ConditionsGlance resort={resort()} weather={WEATHER} status={OPENS} openProjected={false} />,
    );
    rerender(
      <ConditionsGlance resort={resort({ id: 2, slug: "other" })} weather={null} status={OPENS} openProjected={false} />,
    );
    await act(async () => net.weather.get(1)!(EXTRAS));
    expect(screen.queryByText('8"')).toBeNull();
    expect(screen.getByText("…")).toBeTruthy();
    expect(screen.getByText("in 82 days")).toBeTruthy();

    await act(async () => net.weather.get(2)!(null));
    expect(screen.getAllByText("Not synced").length).toBeGreaterThan(0);
  });
});

describe("MountainFacts", () => {
  it("shows the difficulty bar and the facts line", () => {
    render(<MountainFacts resort={resort()} />);
    expect(screen.getByRole("heading", { name: "The mountain" })).toBeTruthy();
    expect(screen.getByRole("img", { name: /Difficulty mix: 20% Beginner/ })).toBeTruthy();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent?.replace(/ /g, " ").trim());
    expect(items).toEqual(["Summit 11,570 ft ·", "Base 8,120 ft ·", "147 trails ·", "31 lifts ·", "Night skiing"]);
  });

  it("renders nothing without a verified mix or any facts", () => {
    const { container } = render(
      <MountainFacts
        resort={resort({
          difficulty_pct_beginner: null,
          difficulty_pct_intermediate: null,
          difficulty_pct_advanced: null,
          difficulty_pct_expert: null,
          vertical_drop: null,
          total_trails: null,
          total_lifts: null,
          base_elevation_ft: null,
          summit_elevation_ft: null,
          has_night_skiing: null,
        })}
      />,
    );
    expect(container.innerHTML).toBe("");
  });
});

describe("FullPageButton", () => {
  it("links to the resort page as a full-width 44 px navy-outline button", () => {
    render(<FullPageButton slug="test-peak" />);
    const link = screen.getByRole("link", { name: "See full mountain page" });
    expect(link.getAttribute("href")).toBe("/resort/test-peak");
    expect(link.className).toContain("min-h-11");
    expect(link.className).toContain("w-full");
    // A navy edge with no hover needed (phones): not the faint
    // border-wn-line of "secondary", and never the gold of Plan trip.
    const classes = link.className.split(/\s+/);
    expect(classes).toContain("border-wn-navy");
    expect(classes).not.toContain("border-wn-line");
    expect(link.className).not.toContain("wn-gold");
  });
});

describe("NearbyInPanel", () => {
  it("keeps the Top picks strip and has no 'See all places' link", async () => {
    net.nearby = Array.from({ length: 9 }, (_, i) => ({
      id: i + 1,
      resort_id: 1,
      name: `Cafe ${i + 1}`,
      category: "cafe",
      description: null,
      distance_km: i + 1,
      drive_minutes: null,
      latitude: 39.6,
      longitude: -106.0,
      website_url: null,
      source: "osm",
      confidence_score: null,
      is_recommended: false,
    }));
    render(<NearbyInPanel resortId={1} />);
    await act(async () => {});
    expect(screen.getByRole("heading", { name: "Top picks nearby" })).toBeTruthy();
    expect(screen.queryByText(/See all/)).toBeNull();
  });
});
