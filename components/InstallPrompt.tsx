"use client";

// Install Wynla — one component, four platform modes.
//
//   A. Chromium on Android / desktop  → native one-tap prompt. The
//      `beforeinstallprompt` event is stashed by an inline script in
//      app/layout.tsx <head> (it can fire before hydration) and replayed
//      here with prompt(); `appinstalled` shows a toast.
//   B. iOS Safari / Chrome / Firefox / Edge on iOS (all can Add to Home
//      Screen since iOS 16.4) → guided sheet with the exact taps for that
//      browser, plus an honest line that iOS has no one-tap install.
//   C. In-app browsers (TikTok, Instagram, Facebook, Threads, X, Reddit,
//      LinkedIn, Line) → cannot install at all. Sheet offers "Open in
//      Safari / Chrome" (x-safari-https:// on iOS, intent:// on Android)
//      and a copy-link fallback that lands on /get.
//   D. Already installed (display-mode standalone) → renders nothing.
//   Desktop browsers with no install at all (Firefox, Safari on Mac
//   before 17) → no nudge, no /account row; /get says so plainly.
//
// Entry points exported from this file:
//   <InstallPrompt />  — mounted once in the root layout. Owns the
//                        "second visit" nudge (bottom pill, at most once
//                        per 7 days, never on /login, auth, shared
//                        trip/list links, /get or /offline.html) and the
//                        installed toast.
//   <InstallCard />    — the hero card on /get.
//   <InstallRow />     — the "Install Wynla" row on /account.
// Every entry point opens the same <InstallSheet />.

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useFocusTrap } from "@/lib/useFocusTrap";

// ---------------------------------------------------------------------
// Types + platform detection
// ---------------------------------------------------------------------

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    /** Stashed by the inline <head> script in app/layout.tsx. */
    __wynlaInstallEvent?: BeforeInstallPromptEvent | null;
  }
}

export type InstallPlatform =
  | "installed"
  | "in-app"
  | "ios"
  | "chromium"
  | "other";

export type InstallInfo = {
  platform: InstallPlatform;
  /** iOS only: which browser, for the guided steps. */
  iosBrowser: "safari" | "chrome" | "firefox" | "edge" | "other";
  /** iOS major version (0 when unknown). iOS 26 moved Share behind "…". */
  iosMajor: number;
  isIpad: boolean;
  isAndroid: boolean;
  /** In-app browsers only: the host app's name for copy. */
  inAppName: string;
  /**
   * False when this browser cannot install a web app at all (desktop
   * Firefox, desktop Safari before 17). The nudge and the /account row
   * stay hidden rather than promising an "Install app" menu item that
   * does not exist; /get explains instead.
   */
  canInstall: boolean;
  /** Safari 17+ on macOS: installs via File > Add to Dock, nothing else. */
  macSafariDock: boolean;
};

const IN_APP_PATTERNS: Array<[RegExp, string]> = [
  [/BytedanceWebview|musical_ly|Trill|TikTok/i, "TikTok"],
  [/Instagram/i, "Instagram"],
  [/Barcelona/i, "Threads"],
  [/FBAN|FBAV|FB_IAB|FBIOS/i, "Facebook"],
  [/Twitter|X\/[\d.]+ iOS/i, "X"],
  [/RedditApp|Reddit\//i, "Reddit"],
  [/LinkedInApp/i, "LinkedIn"],
  [/\bLine\//i, "Line"],
  [/Snapchat/i, "Snapchat"],
  [/Pinterest/i, "Pinterest"],
];

export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: minimal-ui)").matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

export function detectInstallPlatform(): InstallInfo {
  const base: InstallInfo = {
    platform: "other",
    iosBrowser: "other",
    iosMajor: 0,
    isIpad: false,
    isAndroid: false,
    inAppName: "",
    canInstall: false,
    macSafariDock: false,
  };
  if (typeof window === "undefined") return base;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports itself as a Mac; the touch-point check separates it.
  const isIpad = /iPad/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  const isIos = isIpad || /iPhone|iPod/.test(ua);
  const isAndroid = /Android/i.test(ua);
  const iosMajor = Number((ua.match(/OS (\d+)_/) ?? [])[1] ?? 0);
  const info: InstallInfo = { ...base, isIpad, isAndroid, iosMajor, canInstall: true };

  if (isStandaloneDisplay()) {
    return { ...info, platform: "installed", canInstall: false };
  }
  for (const [re, name] of IN_APP_PATTERNS) {
    if (re.test(ua)) return { ...info, platform: "in-app", inAppName: name };
  }
  if (isIos) {
    const iosBrowser: InstallInfo["iosBrowser"] = /CriOS/.test(ua)
      ? "chrome"
      : /FxiOS/.test(ua)
        ? "firefox"
        : /EdgiOS/.test(ua)
          ? "edge"
          : /Safari/.test(ua)
            ? "safari"
            : "other";
    return { ...info, platform: "ios", iosBrowser };
  }
  // Chromium (Chrome, Edge, Brave, Samsung Internet 26-, Opera) is the only
  // engine that fires beforeinstallprompt. Firefox desktop has no install
  // at all; Firefox Android + Samsung 27+ install from their own menu.
  const isChromium = /Chrome\/|CriOS|Chromium\/|EdgA\/|Edg\//.test(ua) && !/OPR\/|Opera/.test(ua);
  if (isChromium) return { ...info, platform: "chromium" };
  if (isAndroid) return { ...info, platform: "other" }; // Firefox / Samsung 27+: menu install
  // Desktop, non-Chromium. Safari 17+ on macOS has File > Add to Dock;
  // everything else (Firefox, older Safari) cannot install a web app.
  const macSafariDock =
    /Macintosh/.test(ua) &&
    /Safari\//.test(ua) &&
    Number((ua.match(/Version\/(\d+)/) ?? [])[1] ?? 0) >= 17;
  return { ...info, platform: "other", canInstall: macSafariDock, macSafariDock };
}

// ---------------------------------------------------------------------
// Shared store + hook
// ---------------------------------------------------------------------
//
// Platform detection lives in a tiny external store read through
// useSyncExternalStore: the server snapshot is null (nothing is known
// about the device during SSR, so components render their neutral state
// and there is no hydration mismatch), the client snapshot is computed
// once and then updated by the `wynla:installable` / `wynla:installed`
// events the <head> script dispatches.

type InstallSnapshot = {
  info: InstallInfo;
  /** A BeforeInstallPromptEvent is stashed and unused (mode A available). */
  canPromptNatively: boolean;
  /** Installed during this page's lifetime (via prompt or the browser menu). */
  installed: boolean;
};

let snapshot: InstallSnapshot | null = null;
let relatedAppsChecked = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function patchSnapshot(patch: Partial<InstallSnapshot>) {
  snapshot = { ...getSnapshot(), ...patch };
  emit();
}

function getSnapshot(): InstallSnapshot {
  if (!snapshot) {
    snapshot = {
      info: detectInstallPlatform(),
      canPromptNatively: Boolean(window.__wynlaInstallEvent),
      installed: false,
    };
  }
  return snapshot;
}

function getServerSnapshot(): InstallSnapshot | null {
  return null;
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onInstallable = () => patchSnapshot({ canPromptNatively: true });
  const onInstalled = () => patchSnapshot({ canPromptNatively: false, installed: true });
  window.addEventListener("wynla:installable", onInstallable);
  window.addEventListener("wynla:installed", onInstalled);

  // Chromium never fires beforeinstallprompt when the app is already
  // installed, so a browser-tab visit would otherwise show the manual
  // guide to someone who has it on their home screen. This API is
  // Chromium-only and needs the manifest's related_applications self
  // reference; anywhere else it just rejects and we keep the default.
  if (!relatedAppsChecked && getSnapshot().info.platform === "chromium") {
    relatedAppsChecked = true;
    type RelatedApp = { platform: string; url?: string };
    const nav = navigator as Navigator & {
      getInstalledRelatedApps?: () => Promise<RelatedApp[]>;
    };
    nav.getInstalledRelatedApps?.()
      .then((apps) => {
        if (apps.some((a) => a.platform === "webapp")) {
          patchSnapshot({ info: { ...getSnapshot().info, platform: "installed" } });
        }
      })
      .catch(() => {});
  }
  return () => {
    listeners.delete(cb);
    window.removeEventListener("wynla:installable", onInstallable);
    window.removeEventListener("wynla:installed", onInstalled);
  };
}

export function useInstall() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [prompting, setPrompting] = useState(false);

  /** Mode A. Returns true when the OS dialog was shown. */
  const promptNative = useCallback(async (): Promise<boolean> => {
    const evt = window.__wynlaInstallEvent;
    if (!evt) return false;
    setPrompting(true);
    try {
      await evt.prompt();
      const { outcome } = await evt.userChoice;
      // A BeforeInstallPromptEvent can only be used once either way.
      window.__wynlaInstallEvent = null;
      if (outcome === "accepted") {
        // `appinstalled` normally follows; flip state now so the UI never
        // waits on an event some Chromium builds delay by seconds.
        patchSnapshot({ canPromptNatively: false, installed: true });
      } else {
        patchSnapshot({ canPromptNatively: false });
      }
      return true;
    } catch {
      return false;
    } finally {
      setPrompting(false);
    }
  }, []);

  return {
    info: snap?.info ?? null,
    canPromptNatively: snap?.canPromptNatively ?? false,
    installed: snap?.installed ?? false,
    prompting,
    promptNative,
  };
}

// ---------------------------------------------------------------------
// Escape helpers (mode C)
// ---------------------------------------------------------------------

function getUrl(from: string): string {
  const u = new URL("/get", window.location.origin);
  if (from) u.searchParams.set("from", from.toLowerCase());
  return u.toString();
}

function safariEscapeHref(from: string): string {
  // x-safari-https:// forces Safari on iOS (there is no "default browser"
  // scheme). Only honoured for a real user tap on an <a>, never from JS.
  return getUrl(from).replace(/^https:\/\//, "x-safari-https://");
}

function chromeIntentHref(from: string): string {
  const url = getUrl(from);
  const bare = url.replace(/^https?:\/\//, "");
  return `intent://${bare}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API is missing or blocked in some in-app browsers; a
    // selectable text field below the button is the last resort.
    return false;
  }
}

// ---------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------

function ShareGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4" />
    </svg>
  );
}

function PlusSquareGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M12 9v6M9 12h6" />
    </svg>
  );
}

function Step({
  n,
  icon,
  children,
}: {
  n: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-wn-navy text-[11px] font-bold text-white">
        {n}
      </span>
      <span className="flex-1 text-sm leading-snug text-wn-charcoal">{children}</span>
      {icon && (
        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-wn-navy/5 text-wn-navy">
          {icon}
        </span>
      )}
    </li>
  );
}

function iosSteps(info: InstallInfo): React.ReactNode {
  const { iosBrowser, iosMajor, isIpad } = info;
  const shareWhere =
    iosBrowser === "safari"
      ? isIpad
        ? "at the top right"
        : iosMajor >= 26
          ? "in the bottom bar (tap the three dots first if you see them)"
          : "in the bottom bar"
      : iosBrowser === "chrome"
        ? "at the top right of the address bar"
        : iosBrowser === "firefox"
          ? "in the menu at the bottom"
          : iosBrowser === "edge"
            ? "in the bottom bar"
            : "in your browser's toolbar";
  return (
    <ol className="space-y-3">
      <Step n={1} icon={<ShareGlyph />}>
        Tap <b className="font-semibold">Share</b> {shareWhere}.
      </Step>
      <Step n={2} icon={<PlusSquareGlyph />}>
        Scroll down and tap <b className="font-semibold">Add to Home Screen</b>.
      </Step>
      <Step n={3}>
        Tap <b className="font-semibold">Add</b>
        {iosMajor >= 26 ? " and keep Open as Web App switched on" : ""}. Then open Wynla from your
        home screen and sign in there once — iPhone keeps the app&rsquo;s data separate from the
        browser.
      </Step>
    </ol>
  );
}

function genericSteps(info: InstallInfo): React.ReactNode {
  if (info.macSafariDock) {
    return (
      <ol className="space-y-3">
        <Step n={1}>
          In the Safari menu bar, choose <b className="font-semibold">File</b> &rsaquo;{" "}
          <b className="font-semibold">Add to Dock</b>.
        </Step>
        <Step n={2} icon={<PlusSquareGlyph />}>
          Confirm the name and click <b className="font-semibold">Add</b>. Wynla opens from the
          Dock and Launchpad from then on.
        </Step>
      </ol>
    );
  }
  return (
    <ol className="space-y-3">
      <Step n={1}>
        Open your browser&rsquo;s menu (usually three dots or lines{" "}
        {info.isAndroid ? "at the top right" : "in the toolbar"}).
      </Step>
      <Step n={2} icon={<PlusSquareGlyph />}>
        Choose <b className="font-semibold">Install app</b> or{" "}
        <b className="font-semibold">Add to Home screen</b>, then confirm.
      </Step>
    </ol>
  );
}

export function InstallSheet({
  open,
  onClose,
  info,
  from = "",
}: {
  open: boolean;
  onClose: () => void;
  info: InstallInfo;
  /** Attribution carried to /get by the escape links (e.g. "tiktok"). */
  from?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const [copied, setCopied] = useState<"idle" | "ok" | "manual">("idle");
  useFocusTrap(ref, open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const isIos = info.platform === "ios";
  const inApp = info.platform === "in-app";
  const escapeFrom = from || info.inAppName;
  const landing = getUrl(escapeFrom);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-wn-charcoal/40 backdrop-blur-[1px]"
      />
      <div
        ref={ref}
        tabIndex={-1}
        className="relative w-full max-w-md rounded-t-2xl bg-white p-5 shadow-2xl outline-none sm:rounded-2xl"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 1.25rem)" }}
      >
        <div className="flex items-start gap-3">
          <Image
            src="/icon-192.png"
            alt=""
            width={48}
            height={48}
            className="h-12 w-12 flex-shrink-0 rounded-xl shadow-sm"
          />
          <div className="flex-1">
            <h2 id={titleId} className="text-lg font-extrabold text-wn-navy">
              {inApp ? `Open Wynla outside ${info.inAppName}` : "Add Wynla to your home screen"}
            </h2>
            <p className="mt-0.5 text-xs text-wn-charcoal/65">
              {inApp
                ? "In-app browsers can't install apps. Open this page in your real browser first."
                : "Free, no app store, takes about ten seconds."}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 inline-flex h-8 w-8 items-center justify-center rounded-full text-wn-charcoal/60 transition hover:bg-wn-charcoal/5 hover:text-wn-navy"
          >
            <span aria-hidden="true" className="text-lg leading-none">
              ×
            </span>
          </button>
        </div>

        <div className="mt-4">
          {inApp ? (
            <div className="space-y-3">
              {info.isAndroid ? (
                <a
                  href={chromeIntentHref(escapeFrom)}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-wn-navy text-sm font-semibold text-white shadow-sm transition hover:bg-wn-navy/90"
                >
                  Open in Chrome
                </a>
              ) : (
                <a
                  href={safariEscapeHref(escapeFrom)}
                  className="flex h-11 w-full items-center justify-center rounded-lg bg-wn-navy text-sm font-semibold text-white shadow-sm transition hover:bg-wn-navy/90"
                >
                  Open in Safari
                </a>
              )}
              <button
                type="button"
                onClick={async () => setCopied((await copyText(landing)) ? "ok" : "manual")}
                className="flex h-11 w-full items-center justify-center rounded-lg border border-wn-navy/20 bg-white text-sm font-semibold text-wn-navy transition hover:bg-wn-offwhite"
              >
                {copied === "ok" ? "Link copied" : "Copy link"}
              </button>
              {copied === "manual" && (
                <input
                  readOnly
                  value={landing}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Wynla install link"
                  className="w-full rounded-md border border-wn-charcoal/15 bg-wn-offwhite px-3 py-2 text-xs text-wn-charcoal"
                />
              )}
              <p className="text-xs leading-relaxed text-wn-charcoal/65">
                If the button does nothing, tap the menu in the corner of {info.inAppName} (usually
                three dots) and choose <b className="font-semibold">Open in browser</b>, then come
                back to this page.
              </p>
            </div>
          ) : isIos ? (
            <>
              {iosSteps(info)}
              <p className="mt-4 rounded-lg bg-wn-offwhite px-3 py-2 text-[11px] leading-relaxed text-wn-charcoal/65">
                iOS has no one-tap install. Apple requires these taps for every website, not just
                Wynla.
              </p>
            </>
          ) : (
            genericSteps(info)
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Toast
// ---------------------------------------------------------------------

function Toast({ text, onDone }: { text: string; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, 6000);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 z-[105] flex justify-center px-3"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
    >
      <div className="pointer-events-auto rounded-full bg-wn-navy px-4 py-2.5 text-[13px] font-medium text-white shadow-lg shadow-black/25 ring-1 ring-white/10">
        {text}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------
// Install button (shared by card + row + nudge)
// ---------------------------------------------------------------------

type InstallButtonProps = {
  info: InstallInfo;
  canPromptNatively: boolean;
  busy: boolean;
  onNative: () => Promise<boolean>;
  onGuide: () => void;
  className: string;
  label?: string;
};

function InstallButton({
  info,
  canPromptNatively,
  busy,
  onNative,
  onGuide,
  className,
  label,
}: InstallButtonProps) {
  const text =
    label ??
    (info.platform === "in-app"
      ? `Open outside ${info.inAppName}`
      : canPromptNatively
        ? "Install Wynla"
        : info.macSafariDock
          ? "Add to Dock"
          : "Add to home screen");
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        // Same tap for both paths: the OS dialog must run inside the user
        // gesture, and if Chromium never handed us the event (criteria
        // unmet, Samsung 27+, Firefox Android) the guide is the honest
        // fallback.
        if (canPromptNatively && (await onNative())) return;
        onGuide();
      }}
      className={className}
    >
      {busy ? "Opening…" : text}
    </button>
  );
}

// ---------------------------------------------------------------------
// /get card
// ---------------------------------------------------------------------

export function InstallCard({
  from = "",
  autoOpenGuide = false,
}: {
  from?: string;
  /** /get?from=… means the user just escaped an in-app browser: open the guide straight away. */
  autoOpenGuide?: boolean;
}) {
  const { info, canPromptNatively, installed, prompting, promptNative } = useInstall();
  const [sheet, setSheet] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const closeSheet = useCallback(() => setSheet(false), []);

  // Chromium needs a real tap for prompt(), so only the manual guides
  // auto-open. Deferred one tick so the platform detection has settled.
  useEffect(() => {
    if (!autoOpenGuide || !info || !info.canInstall) return;
    if (info.platform === "ios" || info.platform === "other") {
      const t = window.setTimeout(() => setSheet(true), 400);
      return () => window.clearTimeout(t);
    }
  }, [autoOpenGuide, info]);

  if (!info) {
    return <div className="h-40 animate-pulse rounded-2xl bg-white/60" aria-hidden="true" />;
  }
  if (dismissed) return null;

  if (!info.canInstall && info.platform !== "installed" && !installed) {
    return (
      <section className="rounded-2xl border border-wn-charcoal/10 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-wn-navy">
          Install isn&rsquo;t available in this browser
        </h2>
        <p className="mt-1 text-sm text-wn-charcoal/70">
          Open wynla.app in Chrome or Edge on this computer, or in Safari or Chrome on your phone,
          and the install button appears here.
        </p>
      </section>
    );
  }

  if (info.platform === "installed" || installed) {
    return (
      <section className="rounded-2xl border border-wn-charcoal/10 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-wn-navy">
          {installed ? "Installed" : "You're using the installed app"}
        </h2>
        <p className="mt-1 text-sm text-wn-charcoal/70">
          {installed
            ? "Open Wynla from your home screen or app list."
            : "Nothing else to do here. Turn on snow alerts from any resort page."}
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-wn-charcoal/10 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-wn-navy">
            {info.platform === "in-app"
              ? `You're inside ${info.inAppName}`
              : "Put Wynla on your home screen"}
          </h2>
          <p className="mt-1 text-sm text-wn-charcoal/70">
            {info.platform === "in-app"
              ? "Apps can't be installed from here. One tap opens Wynla in your real browser."
              : info.platform === "ios"
                ? `Two taps in ${info.iosBrowser === "safari" ? "Safari" : "your browser"}. No App Store.`
                : canPromptNatively
                  ? "One tap. No app store."
                  : info.macSafariDock
                    ? "Two clicks in Safari. No App Store."
                    : "A couple of taps in your browser menu."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="-mr-1 -mt-1 inline-flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-wn-charcoal/50 transition hover:bg-wn-charcoal/5 hover:text-wn-navy"
        >
          <span aria-hidden="true" className="text-lg leading-none">
            ×
          </span>
        </button>
      </div>
      <InstallButton
        info={info}
        canPromptNatively={canPromptNatively}
        busy={prompting}
        onNative={promptNative}
        onGuide={() => setSheet(true)}
        className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-wn-navy text-sm font-semibold text-white shadow-sm transition hover:bg-wn-navy/90 disabled:opacity-60"
      />
      <InstallSheet open={sheet} onClose={closeSheet} info={info} from={from} />
    </section>
  );
}

// ---------------------------------------------------------------------
// /account row
// ---------------------------------------------------------------------

export function InstallRow() {
  const { info, canPromptNatively, installed, prompting, promptNative } = useInstall();
  const [sheet, setSheet] = useState(false);
  const closeSheet = useCallback(() => setSheet(false), []);
  if (!info || !info.canInstall || installed) return null;
  return (
    <li>
      <InstallButton
        info={info}
        canPromptNatively={canPromptNatively}
        busy={prompting}
        onNative={promptNative}
        onGuide={() => setSheet(true)}
        label="📲 Install Wynla"
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-wn-charcoal transition hover:text-wn-navy disabled:opacity-60"
      />
      <InstallSheet open={sheet} onClose={closeSheet} info={info} />
    </li>
  );
}

// ---------------------------------------------------------------------
// Global mount: visit counting, nudge, installed toast
// ---------------------------------------------------------------------

const VISITS_KEY = "wynla_install_visits";
const NUDGE_AT_KEY = "wynla_install_nudge_at";
const SESSION_KEY = "wynla_install_visit_counted";
const NUDGE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const NUDGE_MIN_VISITS = 2;
// Routes where an install nudge would get in the way or make no sense:
// sign-in, auth callbacks, shared trip / list links (first-time visitors
// following a friend's link), /get (has its own card) and /offline.html.
const NUDGE_BLOCKED_PREFIXES = ["/login", "/auth", "/trip/", "/lists/", "/get", "/offline"];

function nudgeAllowedOn(pathname: string): boolean {
  return !NUDGE_BLOCKED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

/** Counts one visit per browser session; returns true when the nudge is due. */
function recordVisitAndCheckNudge(): boolean {
  try {
    let visits = Number(localStorage.getItem(VISITS_KEY) ?? "0");
    if (!sessionStorage.getItem(SESSION_KEY)) {
      visits += 1;
      localStorage.setItem(VISITS_KEY, String(visits));
      sessionStorage.setItem(SESSION_KEY, "1");
    }
    if (visits < NUDGE_MIN_VISITS) return false;
    const last = Number(localStorage.getItem(NUDGE_AT_KEY) ?? "0");
    return Date.now() - last > NUDGE_INTERVAL_MS;
  } catch {
    // Private mode / storage blocked: never nudge rather than nudge every load.
    return false;
  }
}

function markNudged() {
  try {
    localStorage.setItem(NUDGE_AT_KEY, String(Date.now()));
  } catch {
    // Storage blocked — the in-memory `nudge` state still hides it for this load.
  }
}

export default function InstallPrompt() {
  const pathname = usePathname();
  const { info, canPromptNatively, installed, prompting, promptNative } = useInstall();
  const [nudge, setNudge] = useState(false);
  const [sheet, setSheet] = useState(false);
  const [toastDone, setToastDone] = useState(false);
  const closeSheet = useCallback(() => setSheet(false), []);
  const finishToast = useCallback(() => setToastDone(true), []);

  // Strip the ?source=pwa / ?source=shortcut attribution the manifest adds
  // to launch URLs. It has been recorded by analytics by now; leaving it
  // in the address bar breaks share links and back-navigation on the map.
  // Native replaceState on purpose: Next keeps usePathname/useSearchParams
  // in sync with it, whereas router.replace() would re-fetch the
  // force-dynamic home page (resorts, drive times, weather) a second time
  // right after first paint on every app launch.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("source") === "pwa" || params.get("source") === "shortcut") {
      params.delete("source");
      const qs = params.toString();
      window.history.replaceState(
        window.history.state,
        "",
        `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`,
      );
    }
  }, []);

  const nudgeAllowed = nudgeAllowedOn(pathname);
  useEffect(() => {
    // Mac Safari's File > Add to Dock is real but niche; it stays on /get
    // and /account rather than interrupting a desktop session.
    if (!info || !info.canInstall || info.macSafariDock || !nudgeAllowed) return;
    if (!recordVisitAndCheckNudge()) return;
    // Show after the page has had a moment to become useful, per the
    // "promote install after engagement, not on load" guidance.
    const t = window.setTimeout(() => {
      setNudge(true);
      markNudged();
    }, 8000);
    return () => window.clearTimeout(t);
  }, [info, nudgeAllowed]);

  if (!info) return null;

  const onMap = pathname === "/";
  const showNudge = nudge && nudgeAllowed && !installed && info.canInstall;
  const onPhone = info.isAndroid || info.platform === "ios" || info.platform === "in-app";

  return (
    <>
      {installed && !toastDone && (
        <Toast text="Installed. Open Wynla from your home screen." onDone={finishToast} />
      )}
      {showNudge && (
        <div
          role="region"
          aria-label="Install Wynla"
          className="pointer-events-none fixed inset-x-0 z-[70] flex justify-center px-3"
          // Bottom pill: that is the thumb zone on a phone. The map keeps
          // its feedback / compare / location pills in the first ~60px
          // above the home indicator, so the nudge sits above that band;
          // everywhere else it hugs the bottom edge.
          style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + ${onMap ? 72 : 16}px)` }}
        >
          <div className="pointer-events-auto flex w-full max-w-[480px] items-center gap-3 rounded-2xl bg-wn-navy px-3 py-2.5 text-white shadow-lg shadow-black/25 ring-1 ring-white/10">
            <Image src="/icon-192.png" alt="" width={36} height={36} className="h-9 w-9 rounded-lg" />
            <p className="flex-1 text-[12.5px] leading-tight">
              <span className="font-semibold">
                {onPhone ? "Add Wynla to your home screen" : "Install Wynla as an app"}
              </span>
              <span className="block text-white/75">
                {info.platform === "in-app"
                  ? `Open outside ${info.inAppName} to install`
                  : "Faster to open, powder alerts included"}
              </span>
            </p>
            <InstallButton
              info={info}
              canPromptNatively={canPromptNatively}
              busy={prompting}
              onNative={promptNative}
              onGuide={() => setSheet(true)}
              label={info.platform === "in-app" ? "How" : canPromptNatively ? "Install" : "Show me"}
              className="h-9 flex-shrink-0 rounded-full bg-wn-gold px-3.5 text-xs font-bold text-wn-navy transition hover:bg-wn-gold/90 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={() => setNudge(false)}
              aria-label="Not now"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <span aria-hidden="true" className="text-lg leading-none">
                ×
              </span>
            </button>
          </div>
        </div>
      )}
      <InstallSheet open={sheet} onClose={closeSheet} info={info} />
    </>
  );
}
