"use client";

// Shared focus management for every modal, sheet, drawer and popover.
//
// One hook instead of seven hand-rolled Escape handlers (audit a11y-44):
//   - moves focus inside on open (a chosen control, else the first
//     focusable, else the container itself)
//   - wraps Tab / Shift+Tab inside the container while `modal` is true
//   - Escape calls `onEscape` (only the top-most open trap reacts, so a
//     drawer stacked on a search sheet closes one layer at a time)
//   - restores focus to whatever opened it on close
//   - marks everything outside the container `inert` while `inert` is
//     true (aria-hidden fallback for browsers without inert), so a screen
//     reader cannot wander onto the map behind a sheet
//   - locks body scroll while any scroll-locking trap is open
//     (ref-counted, so nested modals do not unlock each other)
//
// Non-modal surfaces (a popover, a bottom sheet that intentionally leaves
// the map usable) pass `modal: false` and still get Escape, initial focus
// and focus return.
//
// The DOM-free helpers below are exported for unit tests; the hook is a
// thin effect around them.

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Elements that carry this attribute are never made inert by a trap.
 *  Use it on a click-to-close backdrop that sits OUTSIDE the trapped
 *  container in the DOM (give it tabIndex={-1} so it stays out of the
 *  Tab order). */
export const TRAP_KEEP_ATTR = "data-focus-trap-keep";

export type FocusTrapOptions = {
  /** Control that should receive focus on open instead of the first
   *  focusable one (a search input, the primary CTA). */
  initialFocusRef?: RefObject<HTMLElement | null>;
  /** false when the component manages its own initial focus (the mobile
   *  search sheet has to keep the iOS keyboard alive across the open
   *  animation and must not have focus stolen by the trap). */
  autoFocus?: boolean;
  /** Called on Escape. Omit to leave Escape to the component. */
  onEscape?: () => void;
  /** true (default): Tab wraps, background is inert, body scroll locks.
   *  false: only Escape, initial focus and focus return. */
  modal?: boolean;
  /** Hide and disable everything outside the container while open.
   *  Defaults to `modal`. Set false for a modal whose click-to-close
   *  backdrop is a sibling of the trapped element. */
  inert?: boolean;
  /** Lock body scroll while open. Defaults to `modal`. */
  lockScroll?: boolean;
  /** Where focus should go on close when the element that had focus at
   *  open time is not the real opener (a hidden keyboard-primer input,
   *  a control that unmounted). Wins over the recorded element. */
  returnFocusRef?: RefObject<HTMLElement | null>;
};

/** Everything the effect needs, with every default applied. */
export type ResolvedFocusTrapOptions = Required<
  Pick<FocusTrapOptions, "autoFocus" | "modal" | "inert" | "lockScroll">
> &
  Pick<FocusTrapOptions, "initialFocusRef" | "onEscape" | "returnFocusRef">;

/* ------------------------------------------------------------------ */
/* Pure helpers (tested in useFocusTrap.test.ts)                       */
/* ------------------------------------------------------------------ */

/** The older call sites pass `useFocusTrap(ref, open)` or
 *  `useFocusTrap(ref, open, initialFocusRef)`. They were written for a
 *  trap that only wrapped Tab, so they keep exactly that: no inert (their
 *  click-to-close backdrops are siblings of the trapped panel and would
 *  stop working) and no scroll lock (they manage their own). New call
 *  sites pass an options object and get the full modal by default. */
export function resolveFocusTrapOptions(
  optionsOrInitialFocus?: RefObject<HTMLElement | null> | FocusTrapOptions,
): ResolvedFocusTrapOptions {
  const legacy =
    optionsOrInitialFocus === undefined ||
    optionsOrInitialFocus === null ||
    "current" in optionsOrInitialFocus;
  if (legacy) {
    return {
      initialFocusRef: (optionsOrInitialFocus as RefObject<HTMLElement | null> | undefined) ?? undefined,
      autoFocus: true,
      onEscape: undefined,
      modal: true,
      inert: false,
      lockScroll: false,
      returnFocusRef: undefined,
    };
  }
  const o = optionsOrInitialFocus as FocusTrapOptions;
  const modal = o.modal ?? true;
  return {
    initialFocusRef: o.initialFocusRef,
    autoFocus: o.autoFocus ?? true,
    onEscape: o.onEscape,
    modal,
    inert: o.inert ?? modal,
    lockScroll: o.lockScroll ?? modal,
    returnFocusRef: o.returnFocusRef,
  };
}

/** Where Tab should land. `null` means "let the browser do it".
 *  `activeItem` that is inside the container but not one of `items`
 *  (the container itself after a fallback focus, or a tabindex=-1
 *  element the user clicked) is treated as "before the first" on Tab
 *  and "after the last" on Shift+Tab, so focus never leaves. */
export function nextTabTarget<T>(
  items: readonly T[],
  activeItem: T | null,
  shiftKey: boolean,
  insideContainer: boolean,
): T | null {
  if (items.length === 0) return null;
  const first = items[0];
  const last = items[items.length - 1];
  if (!insideContainer) return shiftKey ? last : first;
  const idx = activeItem === null ? -1 : items.indexOf(activeItem);
  if (idx === -1) return shiftKey ? last : first;
  if (shiftKey && idx === 0) return last;
  if (!shiftKey && idx === items.length - 1) return first;
  return null;
}

/** Minimal DOM shape so the inert walk can be unit tested without jsdom. */
export type InertNode = {
  parentElement: InertNode | null;
  children: ArrayLike<InertNode>;
  hasAttribute(name: string): boolean;
};

/** Every sibling of `container` and of each of its ancestors up to (not
 *  including) `root`. Those are the elements that must be hidden from
 *  assistive tech while the container is modal. Elements that already
 *  carry `inert`, or that opt out with TRAP_KEEP_ATTR, are skipped. */
export function collectInertTargets<N extends InertNode>(container: N, root: N | null): N[] {
  const out: N[] = [];
  let node: N = container;
  while (node.parentElement && node !== root) {
    const parent = node.parentElement as N;
    const siblings = parent.children;
    for (let i = 0; i < siblings.length; i++) {
      const sib = siblings[i] as N;
      if (sib === node) continue;
      if (sib.hasAttribute("inert") || sib.hasAttribute(TRAP_KEEP_ATTR)) continue;
      out.push(sib);
    }
    node = parent;
  }
  return out;
}

/** Minimal shape of a focus candidate for the return-focus decision. */
export type ReturnFocusCandidate = {
  isConnected: boolean;
  getAttribute(name: string): string | null;
};

/** Which element gets focus back when the trap closes.
 *  1. an explicit `returnFocusRef` that is still in the document
 *  2. the element that had focus when the trap opened, unless it is
 *     gone, hidden from AT, or a tabindex=-1 helper (the iOS keyboard
 *     primer): focusing those would strand the user on nothing
 *  3. nothing (the browser keeps focus where the close left it) */
export function resolveReturnTarget<E extends ReturnFocusCandidate>(
  explicit: E | null | undefined,
  recorded: E | null | undefined,
): E | null {
  if (explicit && explicit.isConnected) return explicit;
  if (!recorded || !recorded.isConnected) return null;
  if (recorded.getAttribute("aria-hidden") === "true") return null;
  if (recorded.getAttribute("tabindex") === "-1") return null;
  return recorded;
}

/** Inline styles the scroll lock overwrites, so they can be put back. */
export type ScrollLockState = { overflow: string; paddingRight: string };

/** Stack of open traps: only the top one handles Tab and Escape, and
 *  body scroll stays locked until the last locking one closes. */
export class TrapStack<T, S = string> {
  private entries: Array<{ id: T; modal: boolean }> = [];
  private saved: S | null = null;

  /** `lock` runs only for the first locking entry and returns the value
   *  `restore` receives once the last locking entry is removed. */
  push(id: T, modal: boolean, lock?: () => S) {
    if (modal && this.modalCount() === 0 && lock) this.saved = lock();
    this.entries.push({ id, modal });
  }

  remove(id: T, restore?: (v: S) => void) {
    this.entries = this.entries.filter((e) => e.id !== id);
    if (this.modalCount() === 0 && this.saved !== null) {
      restore?.(this.saved);
      this.saved = null;
    }
  }

  isTop(id: T): boolean {
    return this.entries.length > 0 && this.entries[this.entries.length - 1].id === id;
  }

  modalCount(): number {
    return this.entries.filter((e) => e.modal).length;
  }

  get size(): number {
    return this.entries.length;
  }
}

export function supportsInert(proto: object | undefined = typeof HTMLElement === "undefined" ? undefined : HTMLElement.prototype): boolean {
  return !!proto && "inert" in proto;
}

/* ------------------------------------------------------------------ */
/* Hook                                                                */
/* ------------------------------------------------------------------ */

const stack = new TrapStack<symbol, ScrollLockState>();

function lockBodyScroll(): ScrollLockState {
  const body = document.body;
  const saved = { overflow: body.style.overflow, paddingRight: body.style.paddingRight };
  // Removing the scrollbar would shift the page under the modal on
  // desktop; pad the body by its width so nothing moves. iOS Safari has
  // no scrollbar (0px) and also ignores overflow:hidden on body for
  // rubber-band scrolling; that is a known gap, the sheets there are
  // full-height so the page behind is rarely reachable.
  const scrollbar = window.innerWidth - document.documentElement.clientWidth;
  if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;
  body.style.overflow = "hidden";
  return saved;
}

function restoreBodyScroll(saved: ScrollLockState) {
  document.body.style.overflow = saved.overflow;
  document.body.style.paddingRight = saved.paddingRight;
}

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  // Third argument accepts the older positional `initialFocusRef` so the
  // existing call sites keep working (Tab wrap only, see
  // resolveFocusTrapOptions), or the options object.
  optionsOrInitialFocus?: RefObject<HTMLElement | null> | FocusTrapOptions,
) {
  const { initialFocusRef, autoFocus, onEscape, modal, inert, lockScroll, returnFocusRef } =
    resolveFocusTrapOptions(optionsOrInitialFocus);

  // Callers usually pass an inline arrow for onEscape. Reading it through
  // a ref keeps it out of the effect's dependencies, so a re-render while
  // the dialog is open does not tear the trap down (which would un-inert
  // the page, bounce focus to the opener and back, and re-run the
  // initial focus while the user is typing in another field).
  const onEscapeRef = useRef(onEscape);
  useEffect(() => {
    onEscapeRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const id = Symbol("focus-trap");
    const prevFocused = document.activeElement as HTMLElement | null;
    // Read at close time on purpose: the opener may be handed in after
    // the trap mounts (ResortPicker fills it once the keyboard primer
    // has done its job), so a snapshot taken here would be stale.
    const explicitReturnTarget = () => returnFocusRef?.current ?? null;

    const items = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) =>
          // tabindex=-1 controls (e.g. a click-only backdrop) are clickable
          // but must not be Tab stops.
          el.getAttribute("tabindex") !== "-1" &&
          // getClientRects (not offsetParent) so position:fixed focusables aren't dropped.
          (el.getClientRects().length > 0 || el === document.activeElement),
      );

    stack.push(id, lockScroll, lockBodyScroll);

    // Hide the rest of the page from assistive tech. `inert` also blocks
    // pointer and keyboard input, which is what a modal wants; the
    // aria-hidden fallback only hides it from screen readers.
    const inerted: HTMLElement[] = [];
    const useInert = supportsInert();
    if (inert) {
      for (const el of collectInertTargets(container as unknown as InertNode, document.body as unknown as InertNode) as unknown as HTMLElement[]) {
        if (useInert) {
          el.setAttribute("inert", "");
        } else {
          if (el.getAttribute("aria-hidden") === "true") continue;
          el.setAttribute("aria-hidden", "true");
        }
        inerted.push(el);
      }
    }

    // Move focus inside on open (next tick so the content is mounted and
    // any open animation has started).
    const t = autoFocus
      ? window.setTimeout(() => {
          const target = initialFocusRef?.current ?? items()[0] ?? container;
          target.focus({ preventScroll: true });
        }, 0)
      : 0;

    function onKey(e: KeyboardEvent) {
      if (!stack.isTop(id)) return;
      const escape = onEscapeRef.current;
      if (e.key === "Escape" && escape) {
        e.preventDefault();
        // Stop window-level handlers (the map's own Escape) from closing
        // a second layer underneath this one.
        e.stopPropagation();
        escape();
        return;
      }
      if (e.key !== "Tab" || !modal) return;
      const list = items();
      const activeEl = document.activeElement as HTMLElement | null;
      if (list.length === 0) {
        e.preventDefault();
        container!.focus();
        return;
      }
      const next = nextTabTarget(list, activeEl, e.shiftKey, container!.contains(activeEl));
      if (next) {
        e.preventDefault();
        next.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      for (const el of inerted) {
        if (useInert) el.removeAttribute("inert");
        else el.removeAttribute("aria-hidden");
      }
      stack.remove(id, restoreBodyScroll);
      // Return focus to the opener if it is still on the page.
      const back = resolveReturnTarget(explicitReturnTarget(), prevFocused);
      back?.focus?.({ preventScroll: true });
    };
  }, [active, containerRef, initialFocusRef, autoFocus, modal, inert, lockScroll, returnFocusRef]);
}
