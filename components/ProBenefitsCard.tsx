"use client";

// Inaugural Season 2026 — Pro benefits floating card is hidden during
// the "Founder Season" (Nov 2026 – Apr 2027). Returns null so we don't
// have to remove the import site in MapPage.tsx; restoring for Season 2
// is a single-file git revert.
//
// Original Stage 35 implementation (free-vs-pro states, dismissal
// localStorage, 14-day re-appear window) is preserved in git history.

export default function ProBenefitsCard(_props: {
  hidden?: boolean;
}): null {
  void _props;
  return null;
}
