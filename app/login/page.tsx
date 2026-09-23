"use client";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { AuthError } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { safeNext } from "@/lib/safeNext";
import { isLoginErrorCode, LOGIN_ERROR_COPY } from "@/lib/authErrorCode";

// Sign-in page. The primary path is a 6-digit code typed into this page:
// the code is verified from the browser the person is already in, so it
// works inside the installed PWA, in mail-app browsers and across devices,
// none of which the PKCE magic link could do. The same email carries a
// link to /auth/confirm as a fallback, and Google OAuth stays as the
// one-tap option.

// Supabase enforces a 60 s gap between emails to the same address; mirror
// it in the UI so the resend button never produces a raw rate-limit error.
const RESEND_COOLDOWN_SECONDS = 60;
const CODE_LENGTH = 6;
// If the OAuth redirect never happens (popup blocked, bfcache restore) the
// button would stay disabled forever; release it after this long.
const OAUTH_WATCHDOG_MS = 10_000;

// useSearchParams forces dynamic rendering — wrap in Suspense so the page
// still passes Next 16's static-prerender phase.
export default function LoginPage() {
  return (
    <Suspense fallback={<LoginShell />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginShell() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-wn-offwhite px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-wn-charcoal/10 bg-white p-6 shadow-sm">
          <div className="h-6 w-40 animate-pulse rounded bg-wn-charcoal/10" />
          <div className="mt-4 h-10 animate-pulse rounded bg-wn-charcoal/10" />
        </div>
      </div>
    </main>
  );
}

type Busy = "idle" | "sending" | "verifying" | "google";

function sendErrorCopy(error: AuthError): { copy: string; cooldown?: number } {
  const wait = /after (\d+) seconds/i.exec(error.message ?? "");
  if (wait) {
    const seconds = Number(wait[1]);
    return {
      copy: `Wait ${seconds} seconds before requesting another code.`,
      cooldown: seconds,
    };
  }
  switch (error.code) {
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return {
        copy: "Too many sign-in emails were sent recently. Wait a few minutes, or continue with Google.",
      };
    case "validation_failed":
    case "email_address_invalid":
      return { copy: "That doesn't look like a valid email address." };
    case "email_address_not_authorized":
      return { copy: "We couldn't send to that address. Try continuing with Google instead." };
    case "signup_disabled":
      return { copy: "New sign-ups are paused right now. Try continuing with Google." };
    default:
      return { copy: "We couldn't send the email. Check your connection and try again." };
  }
}

function verifyErrorCopy(error: AuthError): string {
  switch (error.code) {
    case "otp_expired":
      // Supabase returns otp_expired for a mistyped code too, so the copy
      // has to cover both.
      return "That code didn't work. It may be mistyped or expired. Check the digits or send a new one.";
    case "over_request_rate_limit":
      return "Too many attempts. Wait a minute, then try again.";
    default:
      return "We couldn't verify that code. Try again or send a new one.";
  }
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"), typeof window === "undefined" ? "https://wynla.app" : window.location.origin);
  const errorParam = params.get("e");

  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState<Busy>("idle");
  const [error, setError] = useState(() =>
    isLoginErrorCode(errorParam) ? LOGIN_ERROR_COPY[errorParam] : "",
  );
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const codeInputRef = useRef<HTMLInputElement>(null);
  // verifyOtp must run once per 6-digit entry: both the change handler and
  // the form submit can fire for the same code.
  const verifyingRef = useRef(false);

  const loginPath = next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`;

  // Show the error from the URL once, then strip it so a refresh or a
  // bookmark does not resurface a stale message.
  useEffect(() => {
    if (errorParam !== null) router.replace(loginPath, { scroll: false });
  }, [errorParam, loginPath, router]);

  // Already signed in (the proxy refreshed the cookie on the way here):
  // there is nothing to do on this page, go where they were headed.
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled && data.session) {
        router.replace(next);
        router.refresh();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [next, router]);

  // Resend countdown.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  // Coming back from Google via the Back button (bfcache) or a cancelled
  // prompt restores this page with `busy` still set; release the buttons.
  useEffect(() => {
    const release = () => setBusy((b) => (b === "google" ? "idle" : b));
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) release();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") release();
    };
    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (step === "code") codeInputRef.current?.focus();
  }, [step]);

  const sendCode = useCallback(
    async (resend: boolean) => {
      const address = email.trim();
      if (!address) return;
      setBusy("sending");
      setError("");
      setNotice("");
      const supabase = createSupabaseBrowserClient();
      // The link in the email lands on /auth/confirm, which verifies a token
      // hash server-side and needs no PKCE verifier, so it works in any
      // browser. `next` rides along so the person ends up where they started.
      const emailRedirectTo = `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`;
      const { error: sendError } = await supabase.auth.signInWithOtp({
        email: address,
        options: { shouldCreateUser: true, emailRedirectTo },
      });
      setBusy("idle");
      if (sendError) {
        const mapped = sendErrorCopy(sendError);
        setError(mapped.copy);
        if (mapped.cooldown) setCooldown(mapped.cooldown);
        return;
      }
      setCode("");
      setCooldown(RESEND_COOLDOWN_SECONDS);
      setStep("code");
      if (resend) setNotice("New code sent. Only the newest code works.");
    },
    [email, next],
  );

  const verifyCode = useCallback(
    async (token: string) => {
      if (verifyingRef.current || token.length !== CODE_LENGTH) return;
      verifyingRef.current = true;
      setBusy("verifying");
      setError("");
      setNotice("");
      const supabase = createSupabaseBrowserClient();
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token,
        type: "email",
      });
      if (verifyError) {
        verifyingRef.current = false;
        setBusy("idle");
        setError(verifyErrorCopy(verifyError));
        setCode("");
        codeInputRef.current?.focus();
        return;
      }
      // Session cookies are now set in this browser; refresh so server
      // components (header, favorites) render signed in.
      router.replace(next);
      router.refresh();
    },
    [email, next, router],
  );

  function onCodeChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) void verifyCode(digits);
  }

  async function onGoogleSignIn() {
    setBusy("google");
    setError("");
    setNotice("");
    const watchdog = setTimeout(
      () => setBusy((b) => (b === "google" ? "idle" : b)),
      OAUTH_WATCHDOG_MS,
    );
    const supabase = createSupabaseBrowserClient();
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (oauthError) {
      clearTimeout(watchdog);
      setBusy("idle");
      setError(
        /provider is not enabled|disabled/i.test(oauthError.message)
          ? "Google sign-in is being set up. Use the email code for now."
          : "We couldn't open Google sign-in. Try again, or use the email code.",
      );
    }
  }

  function useDifferentEmail() {
    setStep("email");
    setCode("");
    setError("");
    setNotice("");
    verifyingRef.current = false;
  }

  const disabled = busy !== "idle";

  return (
    <main className="flex min-h-dvh items-center justify-center bg-wn-offwhite px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 inline-block text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy">
          ← Map
        </Link>

        <div className="rounded-xl border border-wn-charcoal/10 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-extrabold text-wn-navy">Sign in to Wynla</h1>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
            No password needed
          </p>

          {step === "code" ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void verifyCode(code);
              }}
              className="mt-4 space-y-3"
            >
              <p className="text-sm text-wn-charcoal/75">
                Enter the 6-digit code we emailed to{" "}
                <span className="font-semibold text-wn-charcoal">{email.trim()}</span>.
              </p>

              <div>
                <label htmlFor="otp" className="mb-1 block text-xs font-semibold text-wn-charcoal/70">
                  6-digit code
                </label>
                <input
                  ref={codeInputRef}
                  id="otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]*"
                  maxLength={CODE_LENGTH}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  disabled={busy === "verifying"}
                  aria-describedby="otp-help"
                  className="w-full rounded-md border border-wn-charcoal/20 bg-white px-3 py-2.5 text-center font-mono text-2xl tracking-[0.4em] text-wn-charcoal focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-sky/30 disabled:opacity-60"
                />
                <p id="otp-help" className="mt-1.5 text-[11px] leading-snug text-wn-charcoal/60">
                  The code is valid for 15 minutes. The same email has a sign-in link that
                  works in any browser if you prefer to tap it.
                </p>
              </div>

              {notice && (
                <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-900">
                  {notice}
                </p>
              )}
              {error && (
                <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={disabled || code.length !== CODE_LENGTH}
                className="w-full rounded-md bg-wn-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
              >
                {busy === "verifying" ? "Checking…" : "Sign in"}
              </button>

              <div className="flex items-center justify-between gap-3 text-xs">
                <button
                  type="button"
                  onClick={() => void sendCode(true)}
                  disabled={disabled || cooldown > 0}
                  className="font-semibold text-wn-navy underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-wn-charcoal/45 disabled:no-underline"
                >
                  {busy === "sending"
                    ? "Sending…"
                    : cooldown > 0
                      ? `Resend code in ${cooldown} s`
                      : "Resend code"}
                </button>
                <button
                  type="button"
                  onClick={useDifferentEmail}
                  disabled={busy === "verifying"}
                  className="font-semibold text-wn-charcoal/70 underline-offset-2 hover:text-wn-navy hover:underline"
                >
                  Use a different email
                </button>
              </div>

              <p className="text-[11px] leading-snug text-wn-charcoal/55">
                Nothing after a minute? Check your spam or promotions folder, or continue with
                Google from the previous step.
              </p>
            </form>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-sm text-wn-charcoal/70">
                Save favorites, plan trips, and get snow alerts.
              </p>

              {/* Google OAuth — fastest path. One tap, no email round trip. */}
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={disabled}
                className="flex w-full items-center justify-center gap-2.5 rounded-md border border-wn-charcoal/20 bg-white px-4 py-2.5 text-sm font-semibold text-wn-charcoal transition hover:border-wn-charcoal/40 hover:bg-wn-offwhite disabled:opacity-60"
                aria-label="Continue with Google"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
                  />
                  <path
                    fill="#34A853"
                    d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
                  />
                  <path
                    fill="#EA4335"
                    d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
                  />
                </svg>
                <span>{busy === "google" ? "Opening Google…" : "Continue with Google"}</span>
              </button>

              <div className="flex items-center gap-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-wn-charcoal/40">
                <span className="h-px flex-1 bg-wn-charcoal/10" />
                or
                <span className="h-px flex-1 bg-wn-charcoal/10" />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void sendCode(false);
                }}
                className="space-y-3"
              >
                <div>
                  <label htmlFor="email" className="mb-1 block text-xs font-semibold text-wn-charcoal/70">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    enterKeyHint="send"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={disabled}
                    className="w-full rounded-md border border-wn-charcoal/20 bg-white px-3 py-2 text-sm text-wn-charcoal focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-sky/30 disabled:opacity-60"
                  />
                  <p className="mt-1.5 text-[11px] leading-snug text-wn-charcoal/60">
                    We&apos;ll email you a 6-digit code to type here, plus a sign-in link.
                  </p>
                </div>

                {error && (
                  <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={disabled}
                  className="w-full rounded-md bg-wn-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
                >
                  {busy === "sending" ? "Sending…" : "Email me a code"}
                </button>

                <p className="text-center text-[11px] text-wn-charcoal/55">
                  By continuing you agree to receive a one-time sign-in email. No marketing
                  without an explicit opt-in.
                </p>
              </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
