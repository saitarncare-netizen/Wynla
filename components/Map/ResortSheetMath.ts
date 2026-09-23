// Pure geometry + formatting for the mobile resort sheet (ResortSheet.tsx)
// and the map shell chrome budget. No DOM, no React: everything here is
// unit-tested in tests/resortSheetMath.test.ts, and the components only
// wire events to these functions.

export type SheetSnap = "peek" | "half" | "full";
export type SheetResolution = SheetSnap | "closed";

export type SnapHeights = Record<SheetSnap, number>;

/** Peek shows the hero strip: name, status pill, drive and one stat. */
export const PEEK_PX = 140;
/** Half and full are viewport fractions (Google Maps: 15-18 / 50 / 90). */
export const HALF_RATIO = 0.52;
export const FULL_RATIO = 0.92;

/** Hero header height at peek / half, and the title bar it collapses to at full. */
export const HERO_PX = 140;
export const TITLE_BAR_PX = 56;

/** Flick threshold: faster than this (px per ms) moves one snap in the
 *  flick direction regardless of where the finger stopped. */
export const FLICK_VELOCITY = 0.45;
/** Minimum travel before a touch counts as a drag rather than a tap. */
export const DRAG_SLOP_PX = 6;

/** Snap heights (px) for a viewport. Half never drops under peek + 120 so
 *  the stat row and action bar always fit on very short phones. */
export function snapHeights(viewportH: number): SnapHeights {
  const vh = Math.max(320, Math.round(viewportH));
  const full = Math.round(vh * FULL_RATIO);
  const half = Math.min(full - 80, Math.max(PEEK_PX + 120, Math.round(vh * HALF_RATIO)));
  return { peek: PEEK_PX, half, full };
}

/** Rubber-band a dragged height: free between 0 and full, damped past full. */
export function clampDragHeight(proposed: number, snaps: SnapHeights): number {
  if (proposed <= snaps.full) return Math.max(0, proposed);
  const over = proposed - snaps.full;
  return snaps.full + over * 0.18;
}

const ORDER: SheetSnap[] = ["peek", "half", "full"];

export function nearestSnap(height: number, snaps: SnapHeights): SheetSnap {
  let best: SheetSnap = "peek";
  let dist = Number.POSITIVE_INFINITY;
  for (const s of ORDER) {
    const d = Math.abs(height - snaps[s]);
    if (d < dist) {
      dist = d;
      best = s;
    }
  }
  return best;
}

/**
 * Where the sheet settles after a drag.
 *   velocity: px per ms, positive = finger moving DOWN (sheet shrinking).
 * A flick moves one snap in its direction from the snap the drag started
 * at (a downward flick from peek closes); a slow release picks the nearest
 * snap, and releasing below half of peek closes.
 */
export function resolveSnap(
  height: number,
  velocity: number,
  from: SheetSnap,
  snaps: SnapHeights,
): SheetResolution {
  const idx = ORDER.indexOf(from);
  if (velocity >= FLICK_VELOCITY) {
    // Flick down: from the nearest-or-lower snap, one step further down.
    const base = Math.min(idx, ORDER.indexOf(nearestSnap(height, snaps)));
    return base === 0 ? "closed" : ORDER[base - 1];
  }
  if (velocity <= -FLICK_VELOCITY) {
    const base = Math.max(idx, ORDER.indexOf(nearestSnap(height, snaps)));
    return ORDER[Math.min(ORDER.length - 1, base + 1)];
  }
  if (height < snaps.peek * 0.5) return "closed";
  return nearestSnap(height, snaps);
}

/** 0 at half or below, 1 at full: drives the hero → title-bar collapse. */
export function heroCollapseProgress(height: number, snaps: SnapHeights): number {
  const span = snaps.full - snaps.half;
  if (span <= 0) return height >= snaps.full ? 1 : 0;
  return Math.min(1, Math.max(0, (height - snaps.half) / span));
}

/** Hero height for a sheet height: HERO_PX until half, then shrinking to
 *  the 56 px title bar as the sheet reaches full. */
export function heroHeightFor(height: number, snaps: SnapHeights): number {
  const p = heroCollapseProgress(height, snaps);
  return Math.round(HERO_PX - (HERO_PX - TITLE_BAR_PX) * p);
}

/**
 * Bottom map padding for a sheet height. The map is padded by the sheet
 * at peek and half so camera moves centre a pin in the visible sliver;
 * at full the sheet covers the map anyway, so the padding stays at the
 * half value instead of squeezing the camera into a 60 px strip.
 */
export function mapBottomPadding(height: number, snaps: SnapHeights): number {
  return Math.round(Math.min(height, snaps.half));
}

/**
 * Google's nested-scroll rule for a touch that starts inside the
 * scrollable body:
 *   - below full: any vertical move drags the sheet (up expands first)
 *   - at full: moving up scrolls the content; moving down drags the sheet
 *     only once the content is scrolled to the top.
 */
export function bodyGestureFor(
  snap: SheetSnap,
  dy: number,
  scrollTop: number,
): "drag" | "scroll" {
  if (snap !== "full") return "drag";
  if (dy < 0) return "scroll";
  return scrollTop <= 0 ? "drag" : "scroll";
}

/** Velocity from the last two samples of a drag, px per ms. */
export function velocityFrom(
  samples: ReadonlyArray<{ y: number; t: number }>,
): number {
  if (samples.length < 2) return 0;
  // Use a sample ~60 ms back for a stable reading rather than the last
  // two events, which on iOS can be 0-1 ms apart.
  const last = samples[samples.length - 1];
  let ref = samples[samples.length - 2];
  for (let i = samples.length - 2; i >= 0; i--) {
    ref = samples[i];
    if (last.t - ref.t >= 60) break;
  }
  const dt = last.t - ref.t;
  if (dt <= 0) return 0;
  return (last.y - ref.y) / dt;
}

/**
 * "just now" / "12m ago" / "3h ago" / "2d ago" for an ISO stamp, or null
 * when the stamp is missing or unparsable. Relative ages are zone-free,
 * which matters because the map does not know each resort's time zone.
 */
export function formatRelativeAge(iso: string | null | undefined, now: Date = new Date()): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  const diffMin = Math.round((now.getTime() - t) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.round(diffMin / 60);
  if (h < 48) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

/** Google Maps driving directions to a coordinate (opens the native app on phones). */
export function directionsUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat.toFixed(5)},${lng.toFixed(5)}&travelmode=driving`;
}

// ---------- Header chrome budget (375 x 812 phone) ----------
//
// Every mobile header row has an explicit height so the total chrome over
// the map is a known number, not the sum of whatever wrapped. Tested in
// tests/resortSheetMath.test.ts against the 170 px budget from the
// 2026-09-17 audit (mobile-ergonomics-11).
export const MOBILE_CHROME = {
  /** Gap between the status bar and the first row. */
  topGap: 8,
  /** Brand mark + search / map / filters / account buttons. */
  primaryRow: 44,
  /** Pass chip strip (36 px chips in a 40 px row). */
  chipRow: 40,
  /** Saturday / Today / active trip / recents pills. Only when it has content. */
  secondaryRow: 44,
  /** Founder banner strip. Only in the off-season and until dismissed. */
  bannerRow: 32,
} as const;

export function mobileChromeTotal(opts: { secondary: boolean; banner: boolean }): number {
  const c = MOBILE_CHROME;
  return (
    c.topGap +
    c.primaryRow +
    c.chipRow +
    (opts.secondary ? c.secondaryRow : 0) +
    (opts.banner ? c.bannerRow : 0)
  );
}

/** Attribution band Mapbox's terms need visible at the bottom of the canvas. */
export const ATTRIBUTION_BAND_PX = 40;
/** The install nudge (components/InstallPrompt.tsx) sits 72-136 px above
 *  the home indicator on the map route; pills move above it while it shows. */
export const INSTALL_NUDGE_CLEAR_PX = 148;

/**
 * Offset (px from the map container's bottom edge) at which the floating
 * pills start. Published as --wn-bottom-stack on the map root.
 */
export function bottomStackPx(opts: {
  installNudgeVisible: boolean;
  sheetHeight: number | null;
  sheetSnap: SheetSnap | null;
}): number {
  // Above a peek sheet the pills float on the sheet's shoulder; at half
  // or full they hide instead (data-sheet-snap on the root), so the
  // value only matters for peek.
  if (opts.sheetHeight != null && opts.sheetSnap === "peek") {
    return Math.round(opts.sheetHeight + 12);
  }
  return opts.installNudgeVisible ? INSTALL_NUDGE_CLEAR_PX : ATTRIBUTION_BAND_PX;
}
