// Invisible hit-area extensions for compact controls. The visual chip
// stays small (36 px pills in a 40-44 px row keep the phone chrome
// budget), while a transparent ::before pseudo-element grows the tappable
// box to the 44 px minimum (Apple HIG, WCAG 2.5.5). A pseudo-element needs
// no wrapper and never changes layout. The parent row must not clip it:
// an overflow-x scroller clips hit-testing at its own box, so rows that
// scroll are at least 44 px tall (see MobileQuickFilters).
//
// Kept as literal class strings so Tailwind's source scan picks them up.

/** 36 px tall control → 44 px hit area (4 px above and below). */
export const HIT_AREA_44 = "relative before:absolute before:inset-x-0 before:-inset-y-1 before:content-['']";

/** 32 px tall control → 44 px hit area (6 px above and below). */
export const HIT_AREA_44_FROM_32 = "relative before:absolute before:inset-x-0 before:-inset-y-1.5 before:content-['']";
