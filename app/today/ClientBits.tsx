"use client";

// Small client islands for /today. The page itself is a server
// component; these exist only where the browser knows something the
// server does not (the viewer's clock and zone, their saved pass
// families in localStorage, whether a hero photo actually loads).

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { getPreferences } from "@/lib/preferences";
// Type-only: erased at build time, so the pass table stays out of the bundle.
import type { PassFamily } from "@/lib/passAccess";

// The wall clock as an external store: subscribers re-read the snapshot
// every 30 s. Snapshots are strings, so an unchanged minute is "equal"
// and causes no render.
function subscribeClock(onChange: () => void): () => void {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
}

function localDateText(): string {
  const d = new Date();
  const date = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const time = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });
  return `${date} · ${time}`;
}

/**
 * "Wednesday, January 13 · 7:02 AM EST" in the viewer's own zone. The
 * server renders the UTC version so the line is never empty; the browser
 * swaps in its own clock on hydration (the mismatch is expected).
 */
export function LocalDate({ fallback }: { fallback: string }) {
  const text = useSyncExternalStore(subscribeClock, localDateText, () => fallback);
  return <time suppressHydrationWarning>{text}</time>;
}

/** "12 min ago" / "3 h ago", refreshed so a page left open at breakfast
 *  does not keep saying "just now". */
export function UpdatedAgo({ iso }: { iso: string }) {
  const text = useSyncExternalStore(
    subscribeClock,
    () => relative(iso, Date.now()),
    () => relative(iso, Date.now()),
  );
  return <span suppressHydrationWarning>{text}</span>;
}

function relative(iso: string, nowMs: number): string {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "at an unknown time";
  const mins = Math.max(0, Math.round((nowMs - t) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
}

/**
 * 56 px hero thumbnail. Falls back to a pass-coloured tile with the
 * resort's initial when there is no photo or the photo fails to load,
 * so a broken image never becomes the row's first impression.
 */
export function RowThumb({
  src,
  alt,
  initial,
  color,
}: {
  src: string | null;
  alt: string;
  initial: string;
  color: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImage = !!src && !failed;
  return (
    <div
      className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg"
      style={{ background: `linear-gradient(135deg, ${color} 0%, #1E2952 100%)` }}
      aria-hidden={showImage ? undefined : true}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes="56px"
          quality={60}
          className="object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-lg font-extrabold text-white/90">
          {initial}
        </span>
      )}
    </div>
  );
}

/**
 * Blackout warning from the pass families the viewer picked in
 * onboarding (localStorage only; the server never sees them). Rendered
 * only when the server verdict could not answer the blackout question
 * itself. A family is a warning, not a verdict: we do not know which
 * product they hold, so the copy says "check which pass you hold".
 */
export function BlackoutNote({ slug, dateISO }: { slug: string; dateISO: string }) {
  const [products, setProducts] = useState<string[]>([]);
  useEffect(() => {
    let cancelled = false;
    const picked = getPreferences()?.passes ?? [];
    if (picked.length === 0) return;
    // The pass-access table is ~200 KB of JSON; load it only for viewers
    // who actually told us their pass (a static import would bundle it
    // for everyone).
    void import("@/lib/passAccess").then((mod) => {
      if (cancelled) return;
      const blocked: string[] = [];
      for (const family of picked.filter((p): p is PassFamily => mod.isPassFamily(p))) {
        for (const entry of mod.getFamilyAccess(slug, family)) {
          if (mod.isBlackedOutFor(entry, dateISO) === true) blocked.push(entry.product);
        }
      }
      setProducts(blocked);
    });
    return () => {
      cancelled = true;
    };
  }, [slug, dateISO]);
  if (products.length === 0) return null;
  return (
    <p className="mt-1 rounded-md bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-900">
      Blackout today on {products.join(", ")} · Reported · check which pass you hold
    </p>
  );
}
