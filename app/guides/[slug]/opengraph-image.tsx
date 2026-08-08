// Per-guide OG card — guides previously inherited the generic site image,
// so every shared guide link looked identical. Mirrors the resort-page
// pattern (app/resort/[slug]/opengraph-image.tsx): Next's file convention
// wires this into og:image / twitter:image automatically.

import { ImageResponse } from "next/og";
import { getGuide } from "@/lib/guides";
import { editorialOgCard, OG_SIZE } from "@/lib/ogCard";

export const runtime = "edge";
export const alt = "Wynla guide";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // Next 16: params is a Promise — must await (same lesson as the resort
  // OG route, where a missed await sent every resort to the generic card).
  const { slug } = await params;
  const guide = getGuide(slug);

  return new ImageResponse(
    editorialOgCard({
      kicker: "Guide",
      title: guide?.title ?? "Wynla Guides",
      subtitle: guide?.subtitle ?? "Ski trip planning, done right.",
    }),
    { ...size },
  );
}
