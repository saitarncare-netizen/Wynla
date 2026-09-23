import { describe, expect, it } from "vitest";
import {
  isSessionCookieName,
  SESSION_MAX_AGE_SECONDS,
  withSessionMaxAge,
} from "./sessionMaxAge";

describe("withSessionMaxAge", () => {
  it("extends a live cookie to 90 days and keeps the other attributes", () => {
    const out = withSessionMaxAge("token", {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 400 * 24 * 60 * 60,
    });
    expect(out.maxAge).toBe(SESSION_MAX_AGE_SECONDS);
    expect(out.path).toBe("/");
    expect(out.sameSite).toBe("lax");
    expect(out.httpOnly).toBe(false);
  });

  it("leaves deletions alone so sign-out really clears the cookie", () => {
    expect(withSessionMaxAge("", { maxAge: 0 }).maxAge).toBe(0);
    expect(withSessionMaxAge("token", { maxAge: 0 }).maxAge).toBe(0);
    const past = new Date(Date.now() - 1000);
    expect(withSessionMaxAge("token", { expires: past }).maxAge).toBeUndefined();
  });
});

describe("isSessionCookieName", () => {
  it("matches the session cookie and its chunks", () => {
    expect(isSessionCookieName("sb-abcdefgh-auth-token")).toBe(true);
    expect(isSessionCookieName("sb-abcdefgh-auth-token.0")).toBe(true);
    expect(isSessionCookieName("sb-abcdefgh-auth-token.12")).toBe(true);
  });

  it("does not match the PKCE verifier or unrelated cookies", () => {
    expect(isSessionCookieName("sb-abcdefgh-auth-token-code-verifier")).toBe(false);
    expect(isSessionCookieName("sb-abcdefgh-auth-token.")).toBe(false);
    expect(isSessionCookieName("wn-theme")).toBe(false);
    expect(isSessionCookieName("auth-token")).toBe(false);
  });
});
