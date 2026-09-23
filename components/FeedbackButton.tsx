"use client";

// Floating "Feedback" pill — mirror of LocationButton's bottom-right
// anchor, but anchored bottom-LEFT. Tap opens a modal with a textarea
// (required, 5-5000 chars) + optional email and POSTs to /api/feedback.
// Designed for the Inaugural / Founder Season where every signal from
// real users is load-bearing.
//
// Touch propagation is stopped at both React + native DOM layers so
// Mapbox underneath doesn't swallow the touches as map gestures while
// the modal is open (same pattern as FiltersDrawer / RecentlyViewedStrip).

import { useId, useRef, useState } from "react";
import { useFocusTrap } from "@/lib/useFocusTrap";

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success" }
  | { kind: "error"; message: string };

const MIN_CHARS = 5;
const MAX_CHARS = 5000;

export default function FeedbackButton() {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [state, setState] = useState<SendState>({ kind: "idle" });
  const dialogRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const ids = useId();
  const titleId = `${ids}-title`;
  const bodyId = `${ids}-body`;
  const bodyHintId = `${ids}-body-hint`;
  const emailId = `${ids}-email`;
  const errorId = `${ids}-error`;

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

  // Focus trap + Escape + body scroll lock + inert background + focus
  // return to the pill, all from the shared hook.
  useFocusTrap(dialogRef, open, {
    initialFocusRef: textareaRef,
    onEscape: closeModal,
  });

  const trimmedLength = body.trim().length;
  const tooShort = trimmedLength < MIN_CHARS;

  async function submit() {
    const trimmed = body.trim();
    if (trimmed.length < MIN_CHARS) {
      setState({ kind: "error", message: `Feedback must be at least ${MIN_CHARS} characters.` });
      return;
    }
    if (trimmed.length > MAX_CHARS) {
      setState({ kind: "error", message: `Feedback is too long (max ${MAX_CHARS} characters).` });
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
          message: data.error ?? "Could not send feedback. Try again.",
        });
        return;
      }
      setState({ kind: "success" });
    } catch {
      setState({ kind: "error", message: "Network error. Try again." });
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
      {/* Floating pill — bottom-left mirror of LocationButton.
          pointer-events-none on the wrapper, pointer-events-auto on the
          inner button so the rest of the area stays click-through.
          The vertical anchor is the shared --wn-bottom-stack variable
          (set by the map shell) so this pill, the location pill, the
          compare pill and the Alaska inset move together when the tab
          bar, an install nudge or the Mapbox attribution changes the
          band they share. The 2.5rem fallback keeps the lowest 40px free
          for the Mapbox wordmark, which its terms require visible.
          On desktop the pill sits to the RIGHT of the 200px Alaska inset
          (left-4 + 200px + gap) instead of on top of it. */}
      <div
        className="pointer-events-none absolute left-3 z-20 flex flex-col items-start gap-1 sm:left-4 md:left-[228px]"
        style={{
          bottom: "var(--wn-bottom-stack, 2.5rem)",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={open}
          className="pointer-events-auto inline-flex min-h-[44px] touch-manipulation items-center gap-2 rounded-full border border-wn-charcoal/15 bg-white/95 px-4 text-xs font-semibold text-wn-charcoal shadow-lg backdrop-blur-sm transition hover:border-wn-navy hover:text-wn-navy active:scale-95"
        >
          <span aria-hidden="true">💬</span>
          <span>Feedback</span>
        </button>
      </div>

      {open && (
        <div
          ref={dialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[80] flex items-end justify-center px-4 pb-4 outline-none sm:items-center sm:pb-0"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onTouchStart={stopTouchBubble}
          onTouchMove={stopTouchBubble}
          onTouchEnd={stopTouchBubble}
        >
          {/* Click-to-close backdrop. tabIndex -1 keeps it out of the Tab
              order; the labelled × button is the keyboard close path. */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={closeModal}
            className="absolute inset-0 cursor-default bg-wn-charcoal/40 backdrop-blur-sm"
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-wn-charcoal/10 bg-white p-5 shadow-2xl">
            <button
              type="button"
              onClick={closeModal}
              aria-label="Close feedback"
              className="absolute right-2 top-2 inline-flex h-11 w-11 touch-manipulation items-center justify-center rounded-full bg-wn-offwhite text-wn-charcoal transition hover:bg-wn-charcoal/10"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </button>

            {state.kind === "success" ? (
              <div className="py-2" role="status">
                <h2 id={titleId} className="mb-1 text-lg font-bold text-wn-navy">
                  Thanks
                </h2>
                <p className="mb-4 text-sm leading-relaxed text-wn-charcoal/75">
                  We read every one. If you left an email we will follow up
                  when there is news.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="min-h-[44px] rounded-lg bg-wn-navy px-4 text-sm font-semibold text-white transition hover:bg-wn-navy/90"
                >
                  Close
                </button>
              </div>
            ) : (
              <form
                noValidate
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
              >
                <h2 id={titleId} className="mb-1 text-lg font-bold text-wn-navy">
                  Send feedback
                </h2>
                <p className="mb-3 text-xs leading-relaxed text-wn-charcoal/65">
                  Founder Season: your input shapes Wynla.
                </p>
                <label
                  htmlFor={bodyId}
                  className="mb-2 block text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/65"
                >
                  What is on your mind?
                </label>
                <textarea
                  id={bodyId}
                  ref={textareaRef}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  maxLength={MAX_CHARS}
                  required
                  aria-required="true"
                  aria-invalid={state.kind === "error" ? true : undefined}
                  aria-describedby={
                    state.kind === "error" ? `${bodyHintId} ${errorId}` : bodyHintId
                  }
                  placeholder="Bug, feature idea, resort missing, copy that confused you: anything."
                  style={{ fontSize: "16px" }}
                  className="mb-1 w-full rounded-lg border border-wn-charcoal/20 bg-white px-3 py-2 font-medium text-wn-charcoal placeholder:text-wn-charcoal/40 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
                />
                {/* Visible reason for the disabled Send button (a11y-35):
                    the counter says how many more characters are needed. */}
                <div
                  id={bodyHintId}
                  className="mb-3 flex justify-between gap-2 text-[11px] text-wn-charcoal/65"
                >
                  <span>
                    {tooShort
                      ? `At least ${MIN_CHARS} characters to send`
                      : "Ready to send"}
                  </span>
                  <span>
                    {body.length} / {MAX_CHARS}
                  </span>
                </div>
                <label
                  htmlFor={emailId}
                  className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-wn-charcoal/65"
                >
                  Email (optional)
                </label>
                <input
                  id={emailId}
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@email.com, only if you want a reply"
                  style={{ fontSize: "16px" }}
                  className="mb-4 min-h-[44px] w-full rounded-lg border border-wn-charcoal/20 bg-white px-3 py-2 font-medium text-wn-charcoal placeholder:text-wn-charcoal/40 focus:border-wn-navy focus:outline-none focus:ring-2 focus:ring-wn-navy/20"
                />

                {state.kind === "error" && (
                  <div
                    id={errorId}
                    role="alert"
                    className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800"
                  >
                    {state.message}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="min-h-[44px] rounded-lg border border-wn-charcoal/20 bg-white px-3 text-sm font-semibold text-wn-charcoal transition hover:border-wn-charcoal/40"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={state.kind === "sending" || tooShort}
                    aria-describedby={bodyHintId}
                    className="min-h-[44px] rounded-lg bg-wn-navy px-4 text-sm font-semibold text-white transition hover:bg-wn-navy/90 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {state.kind === "sending" ? "Sending…" : "Send feedback"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
