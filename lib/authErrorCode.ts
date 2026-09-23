// Short internal codes for sign-in failures. The auth routes put ONE of these
// in `/login?e=<code>`; the login page turns it into human copy with the
// right next step. Raw SDK messages never reach the URL or the screen: they
// leak implementation details (one of them mentions SvelteKit) and give
// people nothing they can act on.

export type LoginErrorCode = "expired" | "used" | "different-browser" | "invalid";

const LOGIN_ERROR_CODES: ReadonlySet<string> = new Set<LoginErrorCode>([
  "expired",
  "used",
  "different-browser",
  "invalid",
]);

export function isLoginErrorCode(value: string | null | undefined): value is LoginErrorCode {
  return typeof value === "string" && LOGIN_ERROR_CODES.has(value);
}

export const LOGIN_ERROR_COPY: Record<LoginErrorCode, string> = {
  expired: "That sign-in link has expired. Enter your email and we'll send a new code.",
  used: "That sign-in link was already used. Enter your email and we'll send a new code.",
  "different-browser":
    "That link was opened in a different browser than the one you started in. Enter your email below and use the 6-digit code from the email instead.",
  invalid: "That sign-in link is not valid. Enter your email and we'll send a new code.",
};

// Shape shared by auth-js AuthError and the query params Supabase appends on
// a failed redirect (error, error_code, error_description).
type AuthFailure = {
  code?: string | null;
  message?: string | null;
};

// Map an auth-js error (from exchangeCodeForSession / verifyOtp) to a code.
export function loginErrorCodeFromAuthError(error: AuthFailure): LoginErrorCode {
  switch (error.code ?? "") {
    case "otp_expired":
    case "flow_state_expired":
      return "expired";
    case "flow_state_not_found":
      // The PKCE flow state is deleted once a code has been exchanged, so a
      // second click on the same link lands here.
      return "used";
    case "pkce_code_verifier_not_found":
    case "bad_code_verifier":
      return "different-browser";
    default:
      break;
  }
  // Older auth-js versions throw the verifier error without a code.
  if (/code verifier/i.test(error.message ?? "")) return "different-browser";
  return "invalid";
}

// Map the `error` / `error_code` query params Supabase adds when it cannot
// even issue a code (expired or consumed link, provider cancel).
// Returns null when the user simply cancelled an OAuth prompt: that is not
// an error worth a banner.
export function loginErrorCodeFromRedirectParams(params: {
  error: string | null;
  errorCode: string | null;
}): LoginErrorCode | null {
  if (params.errorCode === "otp_expired" || params.errorCode === "flow_state_expired") {
    return "expired";
  }
  if (params.errorCode === "flow_state_not_found") return "used";
  if (params.error === "access_denied" && !params.errorCode) return null;
  return "invalid";
}
