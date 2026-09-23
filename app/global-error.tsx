"use client";

import { useEffect } from "react";

/**
 * Top-level error boundary. Catches errors thrown inside the root layout
 * itself (e.g. a font load failure, an env crash) — anywhere app/error.tsx
 * can't reach. Has to render its own <html>/<body> because the root
 * layout is what failed, which also means globals.css may not have
 * loaded: everything is inline, with the token values from
 * app/globals.css copied in by hand (navy #1e2952, off-white #fafaf7,
 * charcoal #2a2a2a, muted #5c5c5b, subtle #767675).
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Wynla] global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem 1.5rem",
          textAlign: "center",
          background: "#fafaf7",
          color: "#2a2a2a",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        }}
      >
        <div style={{ maxWidth: 480 }}>
          <span
            aria-hidden="true"
            style={{
              display: "inline-flex",
              width: 56,
              height: 56,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 9999,
              background: "rgba(30, 41, 82, 0.05)",
              color: "#1e2952",
            }}
          >
            <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3 2.5 19.5h19Z" />
              <path d="M12 10v4" />
              <path d="M12 17.5v.01" />
            </svg>
          </span>
          <h1
            style={{
              marginTop: 16,
              fontSize: 28,
              lineHeight: "34px",
              fontWeight: 800,
              color: "#1e2952",
            }}
          >
            Wynla hit an unexpected error.
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, lineHeight: "20px", color: "#5c5c5b" }}>
            We&apos;re sorry — something failed at the top level. Reload the
            page or try again in a moment.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 8,
                fontSize: 12,
                fontFamily: "monospace",
                color: "#767675",
              }}
            >
              ref: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 24,
              minHeight: 44,
              borderRadius: 8,
              background: "#1e2952",
              color: "white",
              fontWeight: 600,
              fontSize: 14,
              padding: "0 20px",
              border: "none",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
