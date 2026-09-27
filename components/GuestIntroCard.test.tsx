// @vitest-environment jsdom

// Render test for the signed-out tab card (/trips, /today): the section
// is labelled by its heading, the steps are an ordered list, and both
// actions are real links with phone-sized tap targets.

import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import GuestIntroCard from "./GuestIntroCard";

afterEach(cleanup);

describe("GuestIntroCard", () => {
  it("labels the section, lists the steps and links both actions", () => {
    render(
      <GuestIntroCard
        headingId="t-guest"
        icon="trips"
        title="Plan a ski trip day by day"
        steps={[
          { icon: "mountain", text: "Pick your mountains." },
          { icon: "pin", text: "Save places near each one." },
        ]}
        primary={{ href: "/?plan=1", label: "Plan a trip" }}
        secondary={{ href: "/login?next=/trips", label: "Sign in to see your trips" }}
        note="Planning is free."
      />,
    );

    const region = screen.getByRole("region", { name: "Plan a ski trip day by day" });
    expect(region.className).toContain("on-dark");

    const steps = within(region).getAllByRole("listitem");
    expect(steps.map((li) => li.textContent)).toEqual(["Pick your mountains.", "Save places near each one."]);

    const primary = within(region).getByRole("link", { name: "Plan a trip" });
    expect(primary.getAttribute("href")).toBe("/?plan=1");
    expect(primary.className).toContain("bg-wn-gold");
    expect(primary.className).toContain("min-h-11");

    const secondary = within(region).getByRole("link", { name: "Sign in to see your trips" });
    expect(secondary.getAttribute("href")).toBe("/login?next=/trips");
    expect(secondary.className).toContain("min-h-11");

    expect(within(region).getByText("Planning is free.")).toBeTruthy();
  });

  it("renders without steps, secondary action or note", () => {
    render(
      <GuestIntroCard
        headingId="t-today"
        icon="sun"
        title="Go, Wait or Skip, every morning"
        body="One call per saved mountain."
        primary={{ href: "/", label: "Browse the map" }}
      />,
    );
    const region = screen.getByRole("region", { name: "Go, Wait or Skip, every morning" });
    expect(within(region).queryByRole("list")).toBeNull();
    expect(within(region).getAllByRole("link")).toHaveLength(1);
    expect(within(region).getByText("One call per saved mountain.")).toBeTruthy();
  });
});
