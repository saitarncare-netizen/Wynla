// Share card for /near/[city]: the same editorial card as guides, lists
// and state pages, with the city name and the live count. Node runtime
// so it reads the same 10-minute cache entry as the page (unstable_cache
// is not available on the edge runtime) and the count on the card always
// matches the count on the page it previews.

import { ImageResponse } from "next/og";
import { editorialOgCard, OG_SIZE } from "@/lib/ogCard";
import { NEAR_MAX_HOURS, nearCityName, resolveNearCity } from "@/lib/near";
import { loadNearData } from "./data";

export const runtime = "nodejs";
export const alt = "Wynla ski resorts near a city";
export const size = OG_SIZE;
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const city = resolveNearCity(slug);

  let count = 0;
  if (city) {
    // A failed read renders the card without a count rather than a broken
    // image in the share preview.
    count = await loadNearData(city.code)
      .then((d) => d.rows.length)
      .catch(() => 0);
  }

  return new ImageResponse(
    editorialOgCard({
      kicker: `Within ${NEAR_MAX_HOURS} hours`,
      title: city ? `Ski resorts near ${nearCityName(city)}` : "Wynla",
      subtitle:
        city && count > 0
          ? `${count} resort${count === 1 ? "" : "s"} sorted by drive time — passes, opening status, snow`
          : "Every US ski resort on one map.",
    }),
    { ...size },
  );
}
