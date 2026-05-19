"use client";

// Inaugural Season 2026 — Founder Waitlist email capture form.
//
// Single email input + submit button. POSTs to /api/early; the API
// handles dedup (UNIQUE on email) and treats "already on the list" as
// a success state. We show three states inline:
//   • idle      — input + button
//   • loading   — disabled, "Joining…"
//   • success   — green confirmation panel (different copy for new vs
//                 "you're already in")
//   • error     — red error text below the input, input stays editable
//
// Counter on the server-rendered page is stale by definition, so on
// successful signup we optimistically bump it via the parent callback
// (defined in app/early/page.tsx as a server component, so the bump
// has to live in this client island — kept simple with a local
// state ref instead of useReducer).

import { useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "success"; alreadyOnList: boolean }
  | { kind: "error"; message: string };

export default function EarlySignupForm({
  initialCount,
}: {
  initialCount: number | null;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  // Local optimistic count — initial value from the server, bumped on a
  // first-time signup. Stays static for "already on the list" since the
  // count didn't change.
  const [count, setCount] = useState<number | null>(initialCount);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status.kind === "loading") return;
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/early", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data: {
        ok?: boolean;
        alreadyOnList?: boolean;
        count?: number | null;
        error?: string;
      } = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setStatus({
          kind: "error",
          message:
            data.error ?? "Something went wrong. Try again in a moment.",
        });
        return;
      }
      if (typeof data.count === "number") setCount(data.count);
      setStatus({
        kind: "success",
        alreadyOnList: Boolean(data.alreadyOnList),
      });
    } catch (err) {
      console.error(err);
      setStatus({
        kind: "error",
        message: "Network error — check your connection and try again.",
      });
    }
  };

  if (status.kind === "success") {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-5 text-emerald-900">
        <div className="text-base font-bold">
          {status.alreadyOnList ? "You're already in." : "You're in."}
        </div>
        <p className="mt-1 text-sm">
          {status.alreadyOnList
            ? "Your email is already on the Founder list. We'll send your welcome the morning Wynla opens for the inaugural season (November 2026)."
            : "Check your inbox for the welcome message. You're now a Founder Member — your founder rate is locked forever when Wynla moves to paid plans for Season 2."}
        </p>
        {count != null && (
          <p className="mt-3 text-xs text-emerald-900/70">
            You&apos;re Founder #{count.toLocaleString()}.
          </p>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          autoComplete="email"
          inputMode="email"
          spellCheck={false}
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="Email address"
          className="h-12 flex-1 rounded-md border border-wn-charcoal/20 bg-white px-4 text-sm text-wn-charcoal shadow-sm placeholder:text-wn-charcoal/40 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
        />
        <button
          type="submit"
          disabled={status.kind === "loading"}
          className="inline-flex h-12 items-center justify-center rounded-md bg-wn-navy px-6 text-sm font-bold text-white shadow-sm transition hover:bg-wn-navy/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status.kind === "loading" ? "Joining…" : "Join the Founders"}
        </button>
      </div>
      {status.kind === "error" && (
        <p role="alert" className="text-xs text-red-700">
          {status.message}
        </p>
      )}
      <p className="text-[11px] text-wn-charcoal/55">
        One email when we open. No spam, no sharing.
      </p>
    </form>
  );
}
