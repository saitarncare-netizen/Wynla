"use client";

// Shared modal focus management: when `active`, move focus into the dialog,
// trap Tab / Shift+Tab inside it, and restore focus to the previously-focused
// element on close. Modals keep their own Escape + scroll-lock handling — this
// only fixes the keyboard-trap / focus-return gap the a11y audit flagged on
// OnboardingCard, FiltersDrawer, and ResortPicker.

import { useEffect, type RefObject } from "react";

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  // When the modal already auto-focuses a specific control (e.g. a search
  // input), pass its ref so the trap respects that instead of grabbing the
  // first focusable.
  initialFocusRef?: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;
    const prevFocused = document.activeElement as HTMLElement | null;

    const items = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null || el === document.activeElement,
      );

    // Move focus inside on open (next frame so the content is mounted/visible).
    const t = window.setTimeout(() => {
      const target = initialFocusRef?.current ?? items()[0] ?? container;
      target.focus();
    }, 0);

    function onKey(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const list = items();
      if (list.length === 0) {
        e.preventDefault();
        container!.focus();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const activeEl = document.activeElement;
      if (e.shiftKey && (activeEl === first || !container!.contains(activeEl))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKey, true);

    return () => {
      window.clearTimeout(t);
      document.removeEventListener("keydown", onKey, true);
      prevFocused?.focus?.();
    };
  }, [active, containerRef, initialFocusRef]);
}
