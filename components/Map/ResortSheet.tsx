"use client";

// Mobile resort sheet shell: three snap points (peek / half / full), a
// drag handle and a draggable hero, flick-to-close, Google's nested-scroll
// rule for the body, a history entry so the phone's back gesture closes
// it, and a live height feed the map uses for its padding.
//
// Hand-rolled on purpose. vaul was evaluated for this (audit benchmark
// #1) but it does not expose the in-flight drag height (the map padding
// has to follow it), its non-modal mode still installs body scroll locks
// that fight Mapbox, and it would add @radix-ui/react-dialog to the map
// bundle. The whole gesture model is ~150 lines and every branch is
// covered by the pure helpers in ResortSheetMath.ts.
//
// Layout: the sheet is `height: h` with a flex column (hero / body /
// footer) so the action bar stays docked at the bottom of the VISIBLE
// sheet at half and full, not at the bottom of a full-height panel.
// Height changes are rAF-batched during a drag and animated on settle.

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import {
  bodyGestureFor,
  clampDragHeight,
  DRAG_SLOP_PX,
  heroCollapseProgress,
  heroHeightFor,
  resolveSnap,
  scrollHandsOverToDrag,
  snapHeights,
  velocityFrom,
  type SheetSnap,
  type SnapHeights,
} from "./ResortSheetMath";
import {
  readSheetEntry,
  sheetCloseAction,
  withSheetEntry,
  withoutSheetEntry,
} from "./sheetHistory";

export type { SheetSnap } from "./ResortSheetMath";

type Props = {
  /** Stable id for the history entry; changing it swaps the entry in place. */
  entryId: number;
  snap: SheetSnap;
  onSnapChange: (snap: SheetSnap) => void;
  /** Close request from a flick, the back gesture or the map tap. */
  onClose: () => void;
  /** Live height (px) plus whether the sheet has settled on a snap. */
  onHeightChange?: (height: number, settled: boolean) => void;
  /** Renders the hero for the current hero height and collapse state. */
  renderHero: (args: { heroHeight: number; collapsed: number }) => ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  ariaLabel: string;
  /** Scroll the body to the top (resort changed under the sheet). */
  resetScrollKey?: string | number;
};

type Gesture = {
  startX: number;
  startY: number;
  startHeight: number;
  fromSnap: SheetSnap;
  /** undecided → drag | scroll, decided on the first move past the slop.
   *  A vertical "scroll" can still become a "drag" mid-gesture (see
   *  scrollHandsOverToDrag); a sideways one never does. */
  mode: "pending" | "drag" | "scroll";
  fromBody: boolean;
  horizontal: boolean;
  /** Finger y at the previous touchmove, for the per-move direction. */
  lastY: number;
  samples: Array<{ y: number; t: number }>;
};

// Settle easing: an ease-out, not a spring. Off under reduced motion.
const SETTLE_MS = 260;
const SETTLE_EASING = "cubic-bezier(0.2, 0.8, 0.2, 1)";

// Lazy initial value for the reduced-motion flag, so the very first paint
// already skips the slide-in when the user asked for less motion. The
// sheet only mounts after a tap (or the history reopen effect), never
// during SSR, so reading matchMedia here cannot cause a hydration mismatch.
function readReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function historySheetId(): number | null {
  if (typeof window === "undefined") return null;
  return readSheetEntry(window.history.state)?.id ?? null;
}

export default function ResortSheet({
  entryId,
  snap,
  onSnapChange,
  onClose,
  onHeightChange,
  renderHero,
  footer,
  children,
  ariaLabel,
  resetScrollKey,
}: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const rafRef = useRef<number | null>(null);
  // Viewport height: innerHeight tracks the iOS toolbar collapsing, which
  // 100dvh also follows, so the snaps and the CSS agree.
  const [snaps, setSnaps] = useState<SnapHeights>(() =>
    snapHeights(typeof window === "undefined" ? 812 : window.innerHeight),
  );
  const [dragHeight, setDragHeight] = useState<number | null>(null);
  const [reducedMotion, setReducedMotion] = useState(readReducedMotion);
  // Latest props / state for the native listeners, which are bound once.
  const snapRef = useRef(snap);
  const snapsRef = useRef(snaps);
  const onCloseRef = useRef(onClose);
  const onSnapChangeRef = useRef(onSnapChange);
  const onHeightChangeRef = useRef(onHeightChange);
  const entryIdRef = useRef(entryId);
  useEffect(() => {
    snapRef.current = snap;
    snapsRef.current = snaps;
    onCloseRef.current = onClose;
    onSnapChangeRef.current = onSnapChange;
    onHeightChangeRef.current = onHeightChange;
    entryIdRef.current = entryId;
  }, [snap, snaps, onClose, onSnapChange, onHeightChange, entryId]);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReducedMotion(mq.matches);
    mq.addEventListener("change", sync);
    const onResize = () => setSnaps(snapHeights(window.innerHeight));
    window.addEventListener("resize", onResize);
    return () => {
      mq.removeEventListener("change", sync);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const height = dragHeight ?? snaps[snap];

  // Publish the height: settled on every snap change, live while dragging.
  useEffect(() => {
    onHeightChangeRef.current?.(height, dragHeight === null);
  }, [height, dragHeight]);

  // Scroll the body to the top whenever the resort under the sheet
  // changes, so resort B never opens mid-way down resort A's nearby list.
  useLayoutEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = 0;
  }, [resetScrollKey]);

  // ---- Back gesture: one history entry per open sheet ----
  // Opening pushes an entry with the SAME URL plus { wnSheet: id,
  // wnSheetHref: href }; switching resorts rewrites the id in place; the
  // phone's back gesture (popstate) closes the sheet. Rules for UI closes
  // (the pure decision lives in sheetHistory.ts): pop our entry only while
  // it is on top and its URL is still the pushed one; once a filter tap
  // has rewritten the URL, going back would restore the pre-filter URL,
  // so the key is dropped in place instead. Next.js patches pushState /
  // replaceState and keeps its own tree in the state object; passing the
  // existing state through (it carries __NA) makes Next treat these calls
  // as its own, which is right because the URL does not change.
  useEffect(() => {
    const current = historySheetId();
    if (current === entryId) return;
    const state = window.history.state;
    if (current == null) {
      window.history.pushState(withSheetEntry(state, entryId, window.location.href), "");
    } else {
      // Same entry, new resort: keep the recorded push URL.
      window.history.replaceState(withSheetEntry(state, entryId, readSheetEntry(state)?.href ?? null), "");
    }
  }, [entryId]);
  // MapPage.writeQuery keeps our keys when it rewrites the URL. Anything
  // else that replaces the entry (a router.replace) rebuilds the state
  // without them; re-assert the id so the back gesture keeps closing the
  // sheet, with an unknown push URL so a UI close never goes back from it.
  const search = useSearchParams();
  const searchKey = search.toString();
  useEffect(() => {
    if (historySheetId() === entryId) return;
    window.history.replaceState(withSheetEntry(window.history.state, entryId, null), "");
  }, [searchKey, entryId]);
  useEffect(() => {
    function onPop(e: PopStateEvent) {
      if (readSheetEntry(e.state)?.id === entryId) return; // forward nav back onto us
      onCloseRef.current();
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [entryId]);
  // Unmount with our entry still on top (× and Escape close through
  // MapPage, Plan trip unmounts after rewriting the URL): apply the same
  // rule as requestClose. Deferred one task and skipped if the sheet is
  // mounted again by then, so React's development double-invoke of
  // effects does not pop the entry it just pushed. A Link navigation has
  // already pushed the next page's entry by then, which reads as "none".
  const aliveRef = useRef(false);
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      const id = entryIdRef.current;
      window.setTimeout(() => {
        if (aliveRef.current) return;
        const action = sheetCloseAction(window.history.state, id, window.location.href);
        if (action === "back") window.history.back();
        else if (action === "replace") window.history.replaceState(withoutSheetEntry(window.history.state), "");
      }, 0);
    };
  }, []);

  const requestClose = useCallback(() => {
    const action = sheetCloseAction(window.history.state, entryIdRef.current, window.location.href);
    if (action === "back") {
      // popstate → onClose
      window.history.back();
      return;
    }
    if (action === "replace") {
      window.history.replaceState(withoutSheetEntry(window.history.state), "");
    }
    onCloseRef.current();
  }, []);

  // ---- Touch gestures (native listeners: React's are passive) ----
  const applyHeight = useCallback((h: number) => {
    if (rafRef.current != null) return;
    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;
      setDragHeight(h);
    });
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    function onTouchStart(e: TouchEvent) {
      // Sheet touches never reach Mapbox (it listens at document level
      // for in-flight drags).
      e.stopPropagation();
      if (e.touches.length !== 1) return;
      const t = e.touches[0];
      const target = e.target as HTMLElement | null;
      const fromBody = !!(bodyRef.current && target && bodyRef.current.contains(target));
      gestureRef.current = {
        startX: t.clientX,
        startY: t.clientY,
        startHeight: snapsRef.current[snapRef.current],
        fromSnap: snapRef.current,
        mode: "pending",
        fromBody,
        horizontal: false,
        lastY: t.clientY,
        samples: [{ y: t.clientY, t: e.timeStamp }],
      };
    }

    function onTouchMove(e: TouchEvent) {
      e.stopPropagation();
      const g = gestureRef.current;
      if (!g || e.touches.length !== 1) return;
      const y = e.touches[0].clientY;
      const dy = y - g.startY; // positive = finger down = sheet shrinks
      const stepDy = y - g.lastY;
      g.lastY = y;
      if (g.mode === "scroll") {
        // Google's rule inside one gesture: dragging down at full scrolls
        // the content to its top, then keeps going as a sheet drag. The
        // browser may already own the pan (its touchmoves are then not
        // cancelable), so the content can bounce while the sheet follows.
        const scrollTop = bodyRef.current?.scrollTop ?? 0;
        if (
          !g.fromBody ||
          !scrollHandsOverToDrag({ fromSnap: g.fromSnap, horizontal: g.horizontal, stepDy, scrollTop })
        ) {
          return;
        }
        g.mode = "drag";
        g.startY = y;
        g.startHeight = snapsRef.current[g.fromSnap];
        g.samples = [{ y, t: e.timeStamp }];
      }
      if (g.mode === "pending") {
        const dx = e.touches[0].clientX - g.startX;
        if (Math.abs(dy) < DRAG_SLOP_PX && Math.abs(dx) < DRAG_SLOP_PX) return;
        // Sideways swipes belong to the horizontal strips inside the body
        // (nearby picks); the browser pans those natively.
        if (Math.abs(dx) > Math.abs(dy)) {
          g.mode = "scroll";
          g.horizontal = true;
          return;
        }
        if (g.fromBody) {
          const scrollTop = bodyRef.current?.scrollTop ?? 0;
          g.mode = bodyGestureFor(g.fromSnap, dy, scrollTop);
        } else {
          g.mode = "drag";
        }
        if (g.mode === "scroll") return;
        // Re-anchor so the sheet does not jump by the slop distance.
        g.startY = y;
        g.samples = [{ y, t: e.timeStamp }];
      }
      if (g.mode !== "drag") return;
      if (e.cancelable) e.preventDefault();
      g.samples.push({ y, t: e.timeStamp });
      if (g.samples.length > 8) g.samples.shift();
      applyHeight(clampDragHeight(g.startHeight - (y - g.startY), snapsRef.current));
    }

    function onTouchEnd(e: TouchEvent) {
      e.stopPropagation();
      const g = gestureRef.current;
      gestureRef.current = null;
      if (!g || g.mode !== "drag") return;
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      const last = g.samples[g.samples.length - 1];
      const h = clampDragHeight(g.startHeight - (last.y - g.startY), snapsRef.current);
      const v = velocityFrom(g.samples);
      const next = resolveSnap(h, v, g.fromSnap, snapsRef.current);
      setDragHeight(null);
      if (next === "closed") requestClose();
      else onSnapChangeRef.current(next);
    }

    root.addEventListener("touchstart", onTouchStart, { passive: true });
    root.addEventListener("touchmove", onTouchMove, { passive: false });
    root.addEventListener("touchend", onTouchEnd, { passive: true });
    root.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      root.removeEventListener("touchstart", onTouchStart);
      root.removeEventListener("touchmove", onTouchMove);
      root.removeEventListener("touchend", onTouchEnd);
      root.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [applyHeight, requestClose]);

  // Mouse drag on the handle / hero for desktop DevTools testing and
  // touchpad browsers at phone widths. Touch is handled above.
  const mouseRef = useRef<{ startY: number; startHeight: number; from: SheetSnap; samples: Array<{ y: number; t: number }> } | null>(null);
  function onHandleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return;
    mouseRef.current = {
      startY: e.clientY,
      startHeight: snaps[snap],
      from: snap,
      samples: [{ y: e.clientY, t: e.timeStamp }],
    };
    const move = (ev: MouseEvent) => {
      const m = mouseRef.current;
      if (!m) return;
      m.samples.push({ y: ev.clientY, t: ev.timeStamp });
      if (m.samples.length > 8) m.samples.shift();
      applyHeight(clampDragHeight(m.startHeight - (ev.clientY - m.startY), snapsRef.current));
    };
    const up = (ev: MouseEvent) => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
      const m = mouseRef.current;
      mouseRef.current = null;
      if (!m) return;
      const h = clampDragHeight(m.startHeight - (ev.clientY - m.startY), snapsRef.current);
      const next = resolveSnap(h, velocityFrom(m.samples), m.from, snapsRef.current);
      setDragHeight(null);
      if (next === "closed") requestClose();
      else onSnapChange(next);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  }

  // Keyboard: arrows resize, Escape is handled by MapPage.
  function onHandleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowUp" && snap !== "full") {
      e.preventDefault();
      onSnapChange(snap === "peek" ? "half" : "full");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (snap === "peek") requestClose();
      else onSnapChange(snap === "full" ? "half" : "peek");
    }
  }

  const heroHeight = heroHeightFor(height, snaps);
  const collapsed = heroCollapseProgress(height, snaps);
  const dragging = dragHeight !== null;
  const transition =
    dragging || reducedMotion ? "none" : `height ${SETTLE_MS}ms ${SETTLE_EASING}`;

  return (
    <section
      ref={rootRef}
      role="dialog"
      aria-label={ariaLabel}
      aria-modal="false"
      data-snap={snap}
      className={[
        "fixed inset-x-0 bottom-0 z-40 flex flex-col overflow-hidden bg-white shadow-[0_-8px_32px_rgba(30,41,82,0.18)]",
        // 24 px radius that flattens at full, matching Google Maps.
        collapsed >= 0.98 ? "rounded-t-none" : "rounded-t-3xl",
        reducedMotion ? "" : "animate-[slideUp_220ms_cubic-bezier(0.16,1,0.3,1)]",
      ].join(" ")}
      style={{
        height: `${height}px`,
        transition,
        willChange: dragging ? "height" : undefined,
        // Overscroll must stay inside the sheet; iOS otherwise rubber-bands
        // the whole page when the body hits its end.
        overscrollBehavior: "contain",
      }}
    >
      {/* Hero strip: handle + title + key facts over the photo. Draggable
          as a whole (touch handled at the root; mouse on this element). */}
      <div
        className="relative shrink-0 select-none"
        style={{
          height: `${heroHeight}px`,
          transition: dragging || reducedMotion ? "none" : `height ${SETTLE_MS}ms ${SETTLE_EASING}`,
          touchAction: "none",
        }}
        onMouseDown={onHandleMouseDown}
      >
        {renderHero({ heroHeight, collapsed })}
        {/* 36 x 5 handle on a 44 px tall hit area, keyboard-focusable. */}
        <button
          type="button"
          aria-label={`Resize resort sheet (${snap}). Arrow keys resize, Escape closes.`}
          onKeyDown={onHandleKeyDown}
          className="absolute left-1/2 top-0 z-10 flex h-11 w-24 -translate-x-1/2 cursor-grab items-start justify-center pt-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-wn-sky active:cursor-grabbing"
        >
          <span
            aria-hidden="true"
            className={[
              "block h-[5px] w-9 rounded-full",
              collapsed > 0.5 ? "bg-wn-charcoal/25" : "bg-white/85",
            ].join(" ")}
          />
        </button>
      </div>

      {/* Body: scrolls vertically only at full (nested-scroll rule); pan-y
          there lets the browser own upward scrolls while our touchmove
          handler takes over for the collapse drag from the top. pan-x at
          every snap keeps the horizontal strips inside swipeable.
          overscroll-none (not just contain) also turns off iOS's rubber
          band on the body, so when a downward scroll reaches the top and
          hands over to a sheet drag mid-gesture the content does not
          bounce while the sheet follows the finger. */}
      <div
        ref={bodyRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-none"
        style={{ touchAction: snap === "full" ? "pan-x pan-y" : "pan-x" }}
      >
        {children}
      </div>

      {footer && <div className="shrink-0">{footer}</div>}
    </section>
  );
}
