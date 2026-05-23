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
            <form onSubmit={onSubmit} className="mt-5 space-y-3">
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
              <p className="text-center text-[10.5px] text-wn-charcoal/45">
                Google sign-in coming soon (Founder Season improvement).
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
