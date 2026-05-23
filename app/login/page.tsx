"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/";
  const initialError = params.get("error");

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    initialError ? "error" : "idle",
  );
  const [errorMsg, setErrorMsg] = useState(initialError ?? "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setStatus("sending");
    setErrorMsg("");

    const supabase = createSupabaseBrowserClient();
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callbackUrl },
    });

    if (error) {
      setStatus("error");
      setErrorMsg(error.message);
    } else {
      setStatus("sent");
    }
  }

  // Stage 5 round 5 — Google OAuth handler. Supabase manages the
  // provider config (client id + secret + redirect URLs) in its
  // dashboard; the client just calls signInWithOAuth and Supabase
  // round-trips the user through Google. emailRedirectTo equivalent
  // is `redirectTo` here. Errors include 'Provider is not enabled'
  // when the founder hasn't yet added Google credentials in Supabase
  // — surfaced as a friendly message rather than the raw string.
  async function onGoogleSignIn() {
    setStatus("sending");
    setErrorMsg("");
    const supabase = createSupabaseBrowserClient();
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callbackUrl },
    });
    if (error) {
      setStatus("error");
      const msg = /provider is not enabled|disabled/i.test(error.message)
        ? "Google sign-in is being set up. Use the email link for now."
        : error.message;
      setErrorMsg(msg);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-wn-offwhite px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-6 inline-block text-xs font-semibold text-wn-charcoal/60 hover:text-wn-navy">
          ← Map
        </Link>

        <div className="rounded-xl border border-wn-charcoal/10 bg-white p-6 shadow-sm">
          <h1 className="text-xl font-extrabold text-wn-navy">Sign in to Wynla</h1>
          <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/55">
            Passwordless sign-in
          </p>
          <p className="mt-2 text-sm text-wn-charcoal/70">
            Save favorites, track resorts you&apos;ve viewed, plan trips.
          </p>

          {status === "sent" ? (
            <div className="mt-5 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
              <div className="font-semibold">Check your inbox 📬</div>
              <div className="mt-1 text-emerald-800/85">
                We sent a sign-in link to <span className="font-mono">{email}</span>. Click it on this device to come back signed in.
              </div>
            </div>
          ) : (
            <div className="mt-5 space-y-3">
              {/* Google OAuth — fastest path. One click, no email round-trip. */}
              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={status === "sending"}
                className="flex w-full items-center justify-center gap-2.5 rounded-md border border-wn-charcoal/20 bg-white px-4 py-2.5 text-sm font-semibold text-wn-charcoal transition hover:border-wn-charcoal/40 hover:bg-wn-offwhite disabled:opacity-60"
                aria-label="Sign in with Google"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 18 18"
                  aria-hidden="true"
                >
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
                <span>Continue with Google</span>
              </button>

              <div className="flex items-center gap-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-wn-charcoal/40">
                <span className="h-px flex-1 bg-wn-charcoal/10" />
                or
                <span className="h-px flex-1 bg-wn-charcoal/10" />
              </div>

            <form onSubmit={onSubmit} className="space-y-3">
              <div>
                <label htmlFor="email" className="mb-1 block text-xs font-semibold text-wn-charcoal/70">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-wn-charcoal/20 bg-white px-3 py-2 text-sm text-wn-charcoal focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-sky/30"
                  disabled={status === "sending"}
                />
                <p className="mt-1.5 text-[11px] leading-snug text-wn-charcoal/60">
                  We email a one-tap link instead of a password — no
                  password to remember.
                </p>
              </div>

              {status === "error" && errorMsg && (
                <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-800">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "sending" || !email}
                className="w-full rounded-md bg-wn-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:opacity-60"
              >
                {status === "sending" ? "Sending…" : "Email me a sign-in link"}
              </button>

              <p className="text-center text-[11px] text-wn-charcoal/55">
                By continuing you agree to receive a one-time email. We never
                send marketing without an explicit opt-in.
              </p>
            </form>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
