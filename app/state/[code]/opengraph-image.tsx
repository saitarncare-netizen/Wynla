// Per-state OG card. The twitter-slim fix in app/layout.tsx removed the
// layout-level twitter image these ~35 state pages used to inherit, and
// their generateMetadata defines openGraph without images — leaving state
// shares imageless on X. Give them the same editorial card treatment as
// guides/lists, with a live resort count.

import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";
import { getStateName } from "@/lib/usStates";
import { editorialOgCard, OG_SIZE } from "@/lib/ogCard";

export const runtime = "edge";
export const alt = "Wynla state ski guide";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const upper = code.toUpperCase();
  const stateName = getStateName(upper);

  let count = 0;
  if (stateName) {
    const { count: c } = await supabase
      .from("resorts")
      .select("id", { count: "exact", head: true })
      .eq("state", upper)
      .eq("active", true);
    count = c ?? 0;
  }

  return new ImageResponse(
    editorialOgCard({
      kicker: "State guide",
      title: stateName ? `${stateName} Ski Resorts` : "Wynla",
      subtitle:
        stateName && count > 0
          ? `All ${count} resort${count === 1 ? "" : "s"} on one map — passes, snow, drive times`
          : "Every US ski resort on one map.",
    }),
    { ...size },
  );
}
