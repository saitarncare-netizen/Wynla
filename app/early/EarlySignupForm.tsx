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

import { useState, useSyncExternalStore } from "react";
import Button from "@/components/ui/Button";
import Field from "@/components/ui/Field";
import Input from "@/components/ui/Input";
import Notice from "@/components/ui/Notice";

// ?ref=<code> reader — validated with the SAME rule the server uses
// (lib/referral sanitizeRef) so the "invited by a Founder" banner never
// promises an attribution the server would silently drop. Read via
// useSyncExternalStore with a no-op subscribe: the server snapshot is
// null (SSR has no URL search params), and React re-renders with the
// client snapshot right after hydration — no setState-in-effect lint
// error, no hydration mismatch. The value never changes after load, so
// the subscription never needs to fire.
const noopSubscribe = () => () => {};
const getServerRef = () => null;
function readRefFromUrl(): string | null {
  try {
    const r = new URLSearchParams(window.location.search).get("ref");
    const norm = r?.trim().toLowerCase();
    return norm && /^[a-z0-9]{4,16}$/.test(norm) ? norm : null;
  } catch {
    return null;
  }
}

type Status =
  | { kind: "idle" }
  | { kind: "loading" }
  | {
      kind: "success";
      alreadyOnList: boolean;
      /** Server confirmed the welcome email went out (see /api/early). */
      emailed: boolean;
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
  const [copied, setCopied] = useState(false);
  // Validated ?ref code (or null) — see readRefFromUrl above.
  const ref = useSyncExternalStore(noopSubscribe, readRefFromUrl, getServerRef);

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
        emailed?: boolean;
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
        emailed: Boolean(data.emailed),
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
        <Notice tone="success" title={status.alreadyOnList ? "You're already in." : "You're in."} className="px-5 py-4">
          <p className="text-sm">
            {status.alreadyOnList
              ? "Your email is already on the Founder list. We'll write to you the morning Wynla opens for the inaugural season (November 2026)."
              : status.emailed
                ? "A welcome email is on its way. You're now a Founder Member: your founder rate is locked when Wynla moves to paid plans for Season 2."
                : "You're now a Founder Member: your founder rate is locked when Wynla moves to paid plans for Season 2. The welcome email could not be sent just now; your spot is saved either way."}
          </p>
          {count != null && (
            <p className="mt-3 text-xs">
              You&apos;re one of <span className="tabular-nums">{count.toLocaleString()}</span> Founders.
            </p>
          )}
        </Notice>

        {/* Referral share card — turn this Founder into an inviter. */}
        {shareUrl && (
          <div className="rounded-wn-md border border-wn-gold/50 bg-wn-gold/10 p-5">
            <p className="text-sm font-bold text-wn-navy">Invite friends</p>
            <p className="mt-1 text-xs leading-relaxed text-wn-muted">
              Anyone who joins with your link gets the same Founder rate, and we count them next to your name. Share it
              anywhere.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Input
                readOnly
                value={shareUrl}
                aria-label="Your referral link"
                onFocus={(e) => e.currentTarget.select()}
                className="select-all"
              />
              <Button onClick={copy} className="sm:shrink-0">
                {copied ? "Copied" : "Copy link"}
              </Button>
            </div>
            {status.referralCount > 0 && (
              <p className="mt-3 text-xs font-semibold text-wn-navy">
                <span className="tabular-nums">{status.referralCount.toLocaleString()}</span> friend
                {status.referralCount === 1 ? "" : "s"} joined through your link so far.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-2">
      <Field
        label="Email address"
        hideLabel
        hint="One email when we open. No spam, no sharing."
        error={status.kind === "error" ? status.message : undefined}
      >
        {(a11y) => (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              {...a11y}
              type="email"
              autoComplete="email"
              inputMode="email"
              spellCheck={false}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
            <Button type="submit" loading={status.kind === "loading"} className="sm:shrink-0">
              {status.kind === "loading" ? "Joining" : "Join the Founders"}
            </Button>
          </div>
        )}
      </Field>
      {ref && <p className="text-xs font-medium text-wn-navy">You were invited by a Founder. You get the same Founder rate.</p>}
    </form>
  );
}
