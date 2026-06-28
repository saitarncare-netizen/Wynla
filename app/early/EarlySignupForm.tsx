"use client";

// Inaugural Season 2026 — Founder Waitlist email capture form.
//
// Single email input + submit button. POSTs to /api/early; the API
// handles dedup (UNIQUE on email) and treats "already on the list" as
// a success state. We show three states inline:
//   • idle      — input + button
//   • loading   — disabled, "Joining…"
//   • success   — green confirmation panel + a referral share card
//                 (different copy for new vs "you're already in")
//   • error     — red error text below the input, input stays editable
//
// Referral loop: if the visitor arrived via ?ref=<code> we forward that
// to the API so their signup is attributed to the referrer. On success
// the API returns THIS member's own code + how many they've referred, so
// we can show a share link + progress and turn every signup into a
// potential inviter. (Attribution is schema-free — see lib/referral.ts.)
//
// Counter on the server-rendered page is stale by definition, so on
// successful signup we optimistically bump it from the API response.

import { useEffect, useState } from "react";

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "success";
      alreadyOnList: boolean;
      referralCode: string | null;
      referralCount: number;
    }
  | { kind: "error"; message: string };

export default function EarlySignupForm({
  initialCount,
}: {
  initialCount: number | null;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [count, setCount] = useState<number | null>(initialCount);
  const [ref, setRef] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Capture ?ref=<code> from the URL once on mount (reading
  // window.location avoids needing a Suspense boundary for useSearchParams).
  // Validate with the SAME rule the server uses (lib/referral sanitizeRef)
  // so a malformed/hand-edited link doesn't show the "you were invited"
  // banner only for the server to silently drop the attribution.
  useEffect(() => {
    try {
      const r = new URLSearchParams(window.location.search).get("ref");
      const norm = r?.trim().toLowerCase();
      if (norm && /^[a-z0-9]{4,16}$/.test(norm)) setRef(norm);
    } catch {
      /* no-op */
    }
  }, []);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status.kind === "loading") return;
    setStatus({ kind: "loading" });
    try {
      const res = await fetch("/api/early", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ref }),
      });
      const data: {
        ok?: boolean;
        alreadyOnList?: boolean;
        count?: number | null;
        referralCode?: string | null;
        referralCount?: number;
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
        referralCode: data.referralCode ?? null,
        referralCount: data.referralCount ?? 0,
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
    const shareUrl =
      status.referralCode != null
        ? `${typeof window !== "undefined" ? window.location.origin : "https://wynla.app"}/early?ref=${status.referralCode}`
        : null;

    const copy = async () => {
      if (!shareUrl) return;
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* clipboard blocked — the link is still visible to copy by hand */
      }
    };

    return (
      <div className="space-y-3">
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
              You&apos;re one of {count.toLocaleString()} Founders.
            </p>
          )}
        </div>

        {/* Referral share card — turn this Founder into an inviter. */}
        {shareUrl && (
          <div className="rounded-xl border border-wn-gold/40 bg-wn-gold/10 p-5">
            <div className="text-sm font-bold text-wn-navy">
              Move up the list — invite friends
            </div>
            <p className="mt-1 text-xs leading-relaxed text-wn-charcoal/75">
              Every friend who joins with your link is one more reason
              you&apos;re first in line when Wynla opens. Share it anywhere.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                readOnly
                value={shareUrl}
                aria-label="Your referral link"
                onFocus={(e) => e.currentTarget.select()}
                className="h-10 flex-1 select-all rounded-md border border-wn-charcoal/20 bg-white px-3 text-xs text-wn-charcoal focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
              />
              <button
                type="button"
                onClick={copy}
                className="inline-flex h-10 items-center justify-center rounded-md bg-wn-navy px-4 text-xs font-bold text-white transition hover:bg-wn-navy/90 active:scale-[0.98]"
              >
                {copied ? "Copied!" : "Copy link"}
              </button>
            </div>
            {status.referralCount > 0 && (
              <p className="mt-3 text-xs font-semibold text-wn-navy">
                🎉 {status.referralCount.toLocaleString()} friend
                {status.referralCount === 1 ? "" : "s"} joined through you.
              </p>
            )}
          </div>
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
      {ref && (
        <p className="text-[11px] font-medium text-wn-navy/70">
          ✓ You were invited by a Founder — you&apos;ll both move up the list.
        </p>
      )}
      <p className="text-[11px] text-wn-charcoal/55">
        One email when we open. No spam, no sharing.
      </p>
    </form>
  );
}
