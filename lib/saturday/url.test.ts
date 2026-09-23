import { describe, expect, it } from "vitest";
import { goPath, goQuery, parseGoParams, parseMaxHours, parsePassFamily, parseProduct } from "./url";

describe("parseGoParams", () => {
  it("defaults to NYC, any pass, 5 h, Saturday", () => {
    expect(parseGoParams({})).toEqual({
      city: "nyc",
      lat: null,
      lng: null,
      pass: null,
      product: null,
      max: 5,
      day: "sat",
    });
  });

  it("keeps a valid product only with its family", () => {
    expect(parseGoParams({ pass: "ikon", product: "ikon-base-pass" }).product).toBe("ikon-base-pass");
    expect(parseGoParams({ pass: "epic", product: "ikon-base-pass" }).product).toBeNull();
    expect(parseGoParams({ product: "ikon-base-pass" }).product).toBeNull();
    expect(parseProduct("ikon", "IKON-BASE-PASS")).toBe("ikon-base-pass");
  });

  it("treats any/none as no pass and rejects unknown families", () => {
    expect(parsePassFamily("any")).toBeNull();
    expect(parsePassFamily("none")).toBeNull();
    expect(parsePassFamily("vail")).toBeNull();
    expect(parsePassFamily("Ikon")).toBe("ikon");
  });

  it("clamps the drive cap", () => {
    expect(parseMaxHours("0")).toBe(1);
    expect(parseMaxHours("99")).toBe(12);
    expect(parseMaxHours("abc")).toBe(5);
    expect(parseMaxHours("4.6")).toBe(5);
  });

  it("only keeps coordinates for a geo origin, rounded to four decimals", () => {
    const s = parseGoParams({ city: "geo", lat: "40.712776", lng: "-74.005974" });
    expect(s).toMatchObject({ city: "geo", lat: "40.7128", lng: "-74.0060" });
    expect(parseGoParams({ city: "boston", lat: "40.7", lng: "-74" })).toMatchObject({ lat: null, lng: null });
    expect(parseGoParams({ city: "geo", lat: "91", lng: "0" }).lat).toBeNull();
  });

  it("round-trips through the canonical query", () => {
    const s = parseGoParams({ city: "chicago", pass: "epic", product: "epic-local-pass", max: "6", day: "sun" });
    expect(goQuery(s)).toBe("city=chicago&pass=epic&product=epic-local-pass&max=6&day=sun");
    expect(parseGoParams(new URLSearchParams(goQuery(s)))).toEqual(s);
    expect(goPath(parseGoParams({}))).toBe("/go?city=nyc&pass=any");
  });

  it("drops a bad city string to the default", () => {
    expect(parseGoParams({ city: "<script>" }).city).toBe("nyc");
  });
});
