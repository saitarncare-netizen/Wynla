import { describe, expect, it } from "vitest";
import {
  isLoginErrorCode,
  LOGIN_ERROR_COPY,
  loginErrorCodeFromAuthError,
  loginErrorCodeFromRedirectParams,
} from "./authErrorCode";

describe("loginErrorCodeFromAuthError", () => {
  it("maps expired and consumed PKCE / OTP states", () => {
    expect(loginErrorCodeFromAuthError({ code: "otp_expired" })).toBe("expired");
    expect(loginErrorCodeFromAuthError({ code: "flow_state_expired" })).toBe("expired");
    expect(loginErrorCodeFromAuthError({ code: "flow_state_not_found" })).toBe("used");
  });

  it("maps a missing or wrong code verifier to different-browser", () => {
    expect(loginErrorCodeFromAuthError({ code: "pkce_code_verifier_not_found" })).toBe(
      "different-browser",
    );
    expect(loginErrorCodeFromAuthError({ code: "bad_code_verifier" })).toBe("different-browser");
    expect(
      loginErrorCodeFromAuthError({
        code: undefined,
        message: "PKCE code verifier not found in storage. This can happen if...",
      }),
    ).toBe("different-browser");
  });

  it("falls back to invalid and never leaks the SDK message", () => {
    const code = loginErrorCodeFromAuthError({ code: "unexpected_failure", message: "SvelteKit" });
    expect(code).toBe("invalid");
    expect(LOGIN_ERROR_COPY[code]).not.toMatch(/SvelteKit/);
  });
});

describe("loginErrorCodeFromRedirectParams", () => {
  it("treats Supabase's otp_expired redirect as expired", () => {
    expect(
      loginErrorCodeFromRedirectParams({ error: "access_denied", errorCode: "otp_expired" }),
    ).toBe("expired");
  });

  it("stays silent on a plain OAuth cancel", () => {
    expect(loginErrorCodeFromRedirectParams({ error: "access_denied", errorCode: null })).toBeNull();
  });

  it("maps anything else to invalid", () => {
    expect(loginErrorCodeFromRedirectParams({ error: "server_error", errorCode: null })).toBe(
      "invalid",
    );
  });
});

describe("isLoginErrorCode", () => {
  it("only accepts the known codes", () => {
    expect(isLoginErrorCode("expired")).toBe(true);
    expect(isLoginErrorCode("different-browser")).toBe(true);
    expect(isLoginErrorCode("PKCE code verifier not found")).toBe(false);
    expect(isLoginErrorCode(null)).toBe(false);
  });

  it("has copy for every code", () => {
    for (const code of ["expired", "used", "different-browser", "invalid"] as const) {
      expect(LOGIN_ERROR_COPY[code].length).toBeGreaterThan(20);
      expect(LOGIN_ERROR_COPY[code]).not.toMatch(/!/);
    }
  });
});
