import { describe, expect, it } from "vitest";
import { isMissingSchemaError } from "./cronRun";

describe("isMissingSchemaError", () => {
  it("recognises the PostgREST and Postgres codes for a missing table or column", () => {
    expect(isMissingSchemaError({ code: "42P01" })).toBe(true);
    expect(isMissingSchemaError({ code: "42703" })).toBe(true);
    expect(isMissingSchemaError({ code: "PGRST205" })).toBe(true);
    expect(isMissingSchemaError({ code: "PGRST204" })).toBe(true);
    expect(isMissingSchemaError({ code: "23505" })).toBe(false);
    expect(isMissingSchemaError({ code: null })).toBe(false);
    expect(isMissingSchemaError(null)).toBe(false);
  });
});
