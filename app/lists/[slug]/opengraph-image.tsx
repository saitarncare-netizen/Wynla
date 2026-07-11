// Per-list OG card — same gap + same fix as the guides route: curated
// lists previously shared the generic site image. Uses the shared
// editorial card with a "N resorts" subtitle suffix for scanability.

import { ImageResponse } from "next/og";
import { LISTS } from "@/lib/lists";
import { editorialOgCard, OG_SIZE } from "@/lib/ogCard";

export const runtime = "edge";
export const alt = "Wynla curated list";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const list = LISTS.find((l) => l.slug === slug);

  const count = list?.resortSlugs.length ?? 0;
  const subtitle = list
    ? `${list.subtitle} · ${count} resort${count === 1 ? "" : "s"}`
    : "Hand-picked resort collections.";

  return new ImageResponse(
    editorialOgCard({
      kicker: "Curated list",
      title: list?.title ?? "Wynla Lists",
      subtitle,
    }),
    { ...size },
  );
}
