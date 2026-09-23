import { describe, expect, it } from "vitest";
import { nextFromRedirectTo, safeNext } from "./safeNext";

const ORIGIN = "https://wynla.app";

describe("safeNext", () => {
  it("keeps same-origin paths with query and hash", () => {
    expect(safeNext("/favorites", ORIGIN)).toBe("/favorites");
    expect(safeNext("/resort/vail?tab=snow#lifts", ORIGIN)).toBe("/resort/vail?tab=snow#lifts");
    expect(safeNext("/?plan=1", ORIGIN)).toBe("/?plan=1");
  });

  it("falls back to / when next is missing or empty", () => {
    expect(safeNext(null, ORIGIN)).toBe("/");
    expect(safeNext(undefined, ORIGIN)).toBe("/");
    expect(safeNext("", ORIGIN)).toBe("/");
  });

  it("rejects protocol-relative and backslash host tricks", () => {
    expect(safeNext("//evil.com", ORIGIN)).toBe("/");
    expect(safeNext("//evil.com/path", ORIGIN)).toBe("/");
    expect(safeNext("/\\evil.com", ORIGIN)).toBe("/");
    expect(safeNext("\\\\evil.com", ORIGIN)).toBe("/");
  });

  it("keeps percent-encoded backslash on our own origin", () => {
    // The browser does not decode %5C when resolving, so this stays a
    // same-origin path and is harmless.
    expect(safeNext("/%5Cevil.com", ORIGIN)).toBe("/%5Cevil.com");
  });

  it("rejects absolute URLs to other origins and scheme swaps", () => {
    expect(safeNext("https://evil.com", ORIGIN)).toBe("/");
    expect(safeNext("https://evil.com/favorites", ORIGIN)).toBe("/");
    expect(safeNext("http://wynla.app/favorites", ORIGIN)).toBe("/");
    expect(safeNext("https://wynla.app.evil.com/", ORIGIN)).toBe("/");
    expect(safeNext("https://wynla.app@evil.com/", ORIGIN)).toBe("/");
  });

  it("accepts an absolute URL that is exactly our origin", () => {
    expect(safeNext("https://wynla.app/trips", ORIGIN)).toBe("/trips");
  });

  it("rejects javascript: and data: URLs", () => {
    expect(safeNext("javascript:alert(1)", ORIGIN)).toBe("/");
    expect(safeNext("data:text/html,hi", ORIGIN)).toBe("/");
  });

  it("never loops back into the auth pages", () => {
    expect(safeNext("/login", ORIGIN)).toBe("/");
    expect(safeNext("/login?next=/trips", ORIGIN)).toBe("/");
    expect(safeNext("/auth/callback?code=x", ORIGIN)).toBe("/");
    expect(safeNext("/auth/confirm", ORIGIN)).toBe("/");
  });

  it("resolves relative paths without a leading slash on our origin", () => {
    expect(safeNext("trips", ORIGIN)).toBe("/trips");
  });
});

describe("nextFromRedirectTo", () => {
  it("unwraps the next param from our own auth route URL", () => {
    expect(
      nextFromRedirectTo("https://wynla.app/auth/confirm?next=%2Ffavorites", ORIGIN),
    ).toBe("/favorites");
    expect(
      nextFromRedirectTo("https://wynla.app/auth/callback?next=%2Fresort%2Fvail%3Ftab%3Dsnow", ORIGIN),
    ).toBe("/resort/vail?tab=snow");
  });

  it("uses a plain same-origin URL as the destination", () => {
    expect(nextFromRedirectTo("https://wynla.app/trips", ORIGIN)).toBe("/trips");
  });

  it("falls back to / for foreign origins, empty values and unsafe inner next", () => {
    expect(nextFromRedirectTo(null, ORIGIN)).toBe("/");
    expect(nextFromRedirectTo("https://evil.com/auth/confirm?next=%2Ffavorites", ORIGIN)).toBe("/");
    expect(
      nextFromRedirectTo("https://wynla.app/auth/confirm?next=https%3A%2F%2Fevil.com", ORIGIN),
    ).toBe("/");
    expect(nextFromRedirectTo("https://wynla.app/auth/confirm", ORIGIN)).toBe("/");
  });
});
