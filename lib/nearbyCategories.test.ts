import { describe, expect, it } from "vitest";
import { prettifyDescription } from "./nearbyCategories";

describe("prettifyDescription", () => {
  it("humanises single OSM cuisine tags", () => {
    expect(prettifyDescription("Steak_house")).toBe("Steak house");
    expect(prettifyDescription("coffee_shop")).toBe("Coffee shop");
    expect(prettifyDescription("pizza")).toBe("Pizza");
  });

  it("joins multi-value tags with a comma and keeps later words lower-case", () => {
    expect(prettifyDescription("Donut;Coffee_shop")).toBe("Donut, coffee shop");
    expect(prettifyDescription("american;bar_and_grill")).toBe("American, bar and grill");
    expect(prettifyDescription("pizza;pizza")).toBe("Pizza");
  });

  it("keeps brand-style labels readable", () => {
    expect(prettifyDescription("bbq")).toBe("BBQ");
    expect(prettifyDescription("tex-mex")).toBe("Tex-Mex");
  });

  it("hides street-address fallbacks", () => {
    expect(prettifyDescription("Main Street")).toBe("");
    expect(prettifyDescription("Main Street West")).toBe("");
    expect(prettifyDescription("Wealthy Street Southeast")).toBe("");
    expect(prettifyDescription("1st Avenue West North")).toBe("");
    expect(prettifyDescription("Depot St")).toBe("");
    expect(prettifyDescription("U.S. Route 4 East")).toBe("");
    expect(prettifyDescription("Killington Road")).toBe("");
    expect(prettifyDescription("North Lake Boulevard")).toBe("");
    expect(prettifyDescription("Pioneer Trail")).toBe("");
    expect(prettifyDescription("760 Copper Road C102, Frisco, CO 80443")).toBe("");
  });

  it("hides route numbers, grid addresses and French-style street names", () => {
    expect(prettifyDescription("OR 35")).toBe("");
    expect(prettifyDescription("PA-611")).toBe("");
    expect(prettifyDescription("Us-93 North")).toBe("");
    expect(prettifyDescription("I 70 Business Loop")).toBe("");
    expect(prettifyDescription("State Highway 23A")).toBe("");
    expect(prettifyDescription("Central Yosemite Highway (CA-140)")).toBe("");
    expect(prettifyDescription("County Highway K")).toBe("");
    expect(prettifyDescription("West 200 South")).toBe("");
    expect(prettifyDescription("South 7400 East")).toBe("");
    expect(prettifyDescription("East 2nd South")).toBe("");
    expect(prettifyDescription("Rue des Pins")).toBe("");
    expect(prettifyDescription("Chemin de Richford")).toBe("");
  });

  it("does not mistake a street word inside a name for an address", () => {
    expect(prettifyDescription("St. Bernard Grill")).toBe("St. Bernard Grill");
    expect(prettifyDescription("Drive-in burgers")).toBe("Drive-in burgers");
    expect(prettifyDescription("Sandwiches, Butcher Shop and Country Market")).toBe(
      "Sandwiches, Butcher Shop and Country Market",
    );
  });

  it("passes free text through with its own capitalisation", () => {
    expect(prettifyDescription("Ski / snowboard gear")).toBe("Ski / snowboard gear");
    expect(prettifyDescription("Gear shop · rentals available")).toBe("Gear shop · rentals available");
    expect(prettifyDescription("Whitehall Mall")).toBe("Whitehall Mall");
    expect(prettifyDescription("Ski Shop, Climbing Gear, Used Gear")).toBe("Ski Shop, Climbing Gear, Used Gear");
    expect(prettifyDescription("Redemption Rock Trail loop hike")).toBe("Redemption Rock Trail loop hike");
    expect(prettifyDescription("General store; TruValue Hardware")).toBe("General store; TruValue Hardware");
    expect(prettifyDescription("sporting goods store for any mountain adventure")).toBe(
      "Sporting goods store for any mountain adventure",
    );
    expect(
      prettifyDescription(
        "Small non-profit gallery and studios located in an upstairs flat along King Street.",
      ),
    ).toBe("Small non-profit gallery and studios located in an upstairs flat along King Street.");
  });

  it("returns empty for null or blank", () => {
    expect(prettifyDescription(null)).toBe("");
    expect(prettifyDescription("   ")).toBe("");
  });
});
