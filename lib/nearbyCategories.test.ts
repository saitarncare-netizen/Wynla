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
    expect(prettifyDescription("U.S. Route 4 East")).toBe("");
    expect(prettifyDescription("Killington Road")).toBe("");
    expect(prettifyDescription("North Lake Boulevard")).toBe("");
    expect(prettifyDescription("760 Copper Road C102, Frisco, CO 80443")).toBe("");
  });

  it("passes through editorial copy from the ski-shop import", () => {
    expect(prettifyDescription("Ski / snowboard gear")).toBe("Ski / snowboard gear");
    expect(prettifyDescription("Gear shop · rentals available")).toBe("Gear shop · rentals available");
  });

  it("returns empty for null or blank", () => {
    expect(prettifyDescription(null)).toBe("");
    expect(prettifyDescription("   ")).toBe("");
  });
});
