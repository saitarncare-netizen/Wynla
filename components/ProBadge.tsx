"use client";

// Inaugural Season 2026 — Pro tier UI is hidden everywhere during the
// "Founder Season" (Nov 2026 – Apr 2027). The component now renders
// nothing so we don't have to chase every import site. Underlying
// /api/me/pro-status + Stripe + pro_subscriptions table still work;
// they just don't have a UI affordance until Season 2 launches.
//
// To restore for Season 2: revert this file to git history (see Stage 35
// commit) — original three-state ProBadge component is still there.

export default function ProBadge(_props: {
  className?: string;
}): null {
  void _props;
  return null;
}
