"use client";

// Floating "💬 Feedback" pill — mirror of LocationButton's
// bottom-right anchor, but anchored bottom-LEFT. Tap opens a modal with
// a textarea (required, 5-5000 chars) + optional email and POSTs to
// /api/feedback. Designed for the Inaugural / Founder Season where
// every signal from real users is load-bearing.
//
// Touch propagation is stopped at both React + native DOM layers so
// Mapbox underneath doesn't swallow the touches as map gestures while
// the modal is open (same pattern as FiltersDrawer / RecentlyViewedStrip).

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success" }
  | { kind: "error"; message: string };

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SendState>({ kind: "idle" });
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Trap focus inside the dialog (was Escape-only — keyboard could tab out).
  useFocusTrap(dialogRef, open, textareaRef);

  // ESC closes the modal — keyboard parity with the X button.
  // closeModal is declared above the effect so it can be a stable
  // reference in the dep list without exhaustive-deps warnings.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setTimeout(() => {
          setState({ kind: "idle" });
          setBody("");
          setEmail("");
        }, 250);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function closeModal() {
    setOpen(false);
    // Reset state shortly after close so the modal re-opens fresh next
    // time without flashing the previous success/error briefly.
    setTimeout(() => {
      setState({ kind: "idle" });
      setBody("");
      setEmail("");
    }, 250);
  }

  async function submit() {
    const trimmed = body.trim();
    if (trimmed.length < 5) {
      setState({ kind: "error", message: "Feedback must be at least 5 characters." });
      return;
    }
    if (trimmed.length > 5000) {
      setState({ kind: "error", message: "Feedback is too long (max 5000 chars)." });
      return;
    }
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: trimmed,
          email: email.trim() || null,
          page_url: typeof window !== "undefined" ? window.location.href : null,
        }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setState({
          kind: "error",
          message: data.error ?? "Couldn't send feedback. Try again?",
        });
        return;
      }
      setState({ kind: "success" });
    } catch {
      setState({ kind: "error", message: "Network error — try again?" });
    }
  }

  // Stop touches from reaching Mapbox underneath. Mapbox listens at
  // window level so React's stopPropagation alone is not enough; we
  // also call nativeEvent.stopImmediatePropagation.
  const stopTouchBubble = (e: React.TouchEvent) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();
  };

  return (
    <>
      {/* Floating button — bottom-left mirror of LocationButton.
          pointer-events-none on the wrapper, pointer-events-auto on the
          inner button so the rest of the area stays click-through. */}
      <div
        className="pointer-events-none absolute bottom-3 left-3 z-20 flex flex-col items-start gap-1 sm:bottom-4 sm:left-4 md:bottom-24"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Send feedback"
          title="Send feedback"
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-wn-charcoal/15 bg-white/95 px-4 py-2.5 text-xs font-semibold text-wn-charcoal shadow-lg backdrop-blur-sm transition hover:border-wn-navy hover:text-wn-navy active:scale-95"
        >
          <span aria-hidden="true">💬</span>
          <span>Feedback</span>
        </button>
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-4 sm:items-center sm:pb-0"
          role="dialog"
          aria-modal="true"
          aria-label="Send feedback"
          onTouchStart={stopTouchBubble}
          onTouchMove={stopTouchBubble}
          onTouchEnd={stopTouchBubble}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={closeModal}
            className="absolute inset-0 cursor-default bg-wn-charcoal/40 backdrop-blur-sm"
          />
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="relative z-10 w-full max-w-md rounded-2xl border border-wn-charcoal/10 bg-white p-5 shadow-2xl"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close feedback"
              className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full bg-wn-offwhite text-wn-charcoal transition hover:bg-wn-charcoal/10"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </button>

            {state.kind === "success" ? (
              <div className="py-2">
                <h3 className="mb-1 text-lg font-bold text-wn-navy">Thanks!</h3>
                <p className="mb-4 text-sm leading-relaxed text-wn-charcoal/75">
                  We read every one. If you left an email we&apos;ll follow up
                  when there&apos;s news.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                <h3 className="mb-1 text-lg font-bold text-wn-navy">
                  Send feedback
                </h3>
                <p className="mb-3 text-xs leading-relaxed text-wn-charcoal/65">
                  Founder Season — your input shapes Wynla.
                </p>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/60">
                  What&apos;s on your mind?
                </label>
                <textarea
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  maxLength={5000}
                  placeholder="Bug, feature idea, resort missing, copy that confused you — anything."
                  style={{ fontSize: "16px" }}
                  className="mb-2 w-full rounded-lg border border-wn-charcoal/20 bg-white px-3 py-2 font-medium text-wn-charcoal placeholder:text-wn-charcoal/40 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
                />
                <div className="mb-3 flex justify-end text-[10px] text-wn-charcoal/45">
                  {body.length} / 5000
                </div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/60">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com — only if you want us to reply"
                  style={{ fontSize: "16px" }}
                  className="mb-4 w-full rounded-lg border border-wn-charcoal/20 bg-white px-3 py-2 font-medium text-wn-charcoal placeholder:text-wn-charcoal/40 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
                />

                {state.kind === "error" && (
                  <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">
                    {state.message}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="rounded-lg border border-wn-charcoal/20 bg-white px-3 py-2 text-sm font-semibold text-wn-charcoal transition hover:border-wn-charcoal/40"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={state.kind === "sending" || body.trim().length < 5}
                    className="rounded-lg bg-wn-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {state.kind === "sending" ? "Sending…" : "Send feedback"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
