"use client";

import { useEffect } from "react";

/**
 * Top-level error boundary. Catches errors thrown inside the root layout
 * itself (e.g. a font load failure, an env crash) — anywhere app/error.tsx
 * can't reach. Has to render its own <html>/<body> because the root
 * layout is what failed.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
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
          <div style={{ fontSize: 48 }}>🏔️</div>
          <h1
            style={{
              marginTop: 16,
              fontSize: 24,
              fontWeight: 800,
              color: "#1e2952",
            }}
          >
            Wynla hit an unexpected error.
          </h1>
          <p style={{ marginTop: 12, fontSize: 14, color: "rgba(42,42,42,0.75)" }}>
            We&apos;re sorry — something failed at the top level. Reload the
            page or try again in a moment.
          </p>
          {error.digest && (
            <p
              style={{
                marginTop: 8,
                fontSize: 10,
                fontFamily: "monospace",
                color: "rgba(42,42,42,0.4)",
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
              height: 44,
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
