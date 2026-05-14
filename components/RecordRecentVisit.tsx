"use client";

import { useEffect } from "react";
import { addRecent } from "@/lib/recentlyViewed";

type Props = {
  id: number;
  slug: string;
  name: string;
  primary_pass: string;
  lat: number;
  lng: number;
};

// Tiny client-only effect-runner. Mounted inside the server-rendered
// /resort/[slug] page to push the current resort onto the "recently
// viewed" localStorage list. No render output — just a useEffect.
export default function RecordRecentVisit(props: Props) {
  useEffect(() => {
    addRecent(props);
    // Re-record if any identifying field changes (defensive — in
    // practice the slug page mounts once per navigation).
  }, [props]);
  return null;
}
