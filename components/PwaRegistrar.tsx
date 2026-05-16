"use client";

import { useEffect } from "react";

/**
 * PwaRegistrar — registers the global service worker (/sw.js) on every
 * page load so PWA install banners (Android) and iOS 16.4+ web push are
 * eligible to fire without requiring the user to first visit a resort
 * detail page and tap "Enable snow alerts" (which was the only previous
 * registration site).
 *
 * Why a dedicated component? Service-worker registration must run after
 * window load to avoid contending with initial paint. We do it client-side
 * once and forget about it.
 */
export default function PwaRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Wait for window load so SW registration doesn't fight with LCP.
    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          // Non-fatal: registration can fail in dev / preview / blocked
          // contexts. Silently swallow so we never break the app.
          if (process.env.NODE_ENV !== "production") {
            console.warn("[PwaRegistrar] SW registration failed:", err);
          }
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}
