// Share card for /go. The file-convention opengraph-image.tsx cannot read
// the query string (it only receives route params), and the picks live
// entirely in ?city=&pass=&product=&max=&day=, so the page's
// generateMetadata points og:image here instead. Same brand style as
// lib/ogCard.tsx: navy gradient, gold kicker, big title.
//
// Satori rules (see app/resort/[slug]/opengraph-image.tsx): every
// multi-child container is display:flex and every text node is one
// pre-built string.

import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase";
import { OG_SIZE } from "@/lib/ogCard";
import { originLabel, originTimeZone, resolveGoOrigin } from "@/lib/saturday/cities";
import { formatMonthDay, formatTargetDate, upcomingWeekendDate } from "@/lib/saturday/dates";
import { loadSaturdayData } from "@/lib/saturday/load";
import { passChoiceLabel } from "@/lib/saturday/passProduct";
import { rankForSaturday } from "@/lib/saturday/rank";
import { parseGoParams } from "@/lib/saturday/url";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOLD = "#D4A84B";

function card(kicker: string, title: string, subtitle: string, lines: string[]) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "56px 80px",
          background: "linear-gradient(135deg, #26335F 0%, #1E2952 55%, #0F1530 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, fontSize: 28, fontWeight: 700, opacity: 0.9 }}>
          <div style={{ display: "flex" }}>Wynla</div>
          <div style={{ display: "flex", fontSize: 22, opacity: 0.7 }}>· Where to ride this Saturday</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
          <div
            style={{
              display: "flex",
              fontSize: 24,
              fontWeight: 800,
              color: GOLD,
              textTransform: "uppercase",
              letterSpacing: 3,
              marginBottom: 14,
            }}
          >
            {kicker}
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>{title}</div>
          <div style={{ display: "flex", marginTop: 12, fontSize: 30, fontWeight: 500, opacity: 0.85 }}>{subtitle}</div>
          {lines.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", marginTop: 28, gap: 8 }}>
              {lines.map((l, i) => (
                <div key={i} style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>
                  {l}
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 24, fontWeight: 700 }}>
          <div style={{ display: "flex", width: 44, height: 6, background: GOLD, borderRadius: 3 }} />
          <div style={{ display: "flex" }}>wynla.app/go</div>
        </div>
      </div>
    ),
    { ...OG_SIZE, headers: { "Cache-Control": "public, max-age=600, s-maxage=600" } },
  );
}

export async function GET(request: NextRequest) {
  const state = parseGoParams(request.nextUrl.searchParams);
  const origin = resolveGoOrigin(state.city, state.lat, state.lng);
  if (!origin) {
    return card("Saturday picks", "Where to ride this Saturday", "Pick your pass and your city", []);
  }
  const now = new Date();
  const targetDate = upcomingWeekendDate(now, state.day, originTimeZone(origin));
  const passText = passChoiceLabel({ family: state.pass, product: state.product });
  const subtitle = `${passText} from ${originLabel(origin)} · within ${state.max} h`;
  try {
    const data = await loadSaturdayData(supabase, origin, state.max, now);
    const result = rankForSaturday({
      resorts: data.resorts,
      weatherById: new Map(data.weather),
      driveById: new Map(data.drives),
      passFamily: state.pass,
      product: state.product,
      origin: { lat: origin.lat, lon: origin.lon, name: originLabel(origin) },
      targetDate,
      maxDriveHours: state.max,
      timeZone: originTimeZone(origin),
      now,
    });
    if (result.mode === "picks") {
      const lines = result.picks.map(
        (p) =>
          `${p.rank}  ${p.resort.name} · ${p.drive.label}${p.snow.expectedIn != null && p.snow.expectedIn >= 0.5 ? ` · ${p.snow.expectedIn} in forecast` : ""}`,
      );
      return card("Top 3 picks", formatTargetDate(targetDate), subtitle, lines);
    }
    if (result.mode === "off-season") {
      const lines = result.countdown.slice(0, 3).map((c) => {
        const when = c.opensOn ? `${c.projected ? "projected " : ""}${c.approximate ? "~" : ""}${formatMonthDay(c.opensOn)}` : "date TBA";
        return `${c.resort.name} · opens ${when} · ${c.drive.label}`;
      });
      return card("Season countdown", "The season has not started yet", subtitle, lines);
    }
    if (result.mode === "no-picks") {
      return card("No fit this Saturday", formatTargetDate(targetDate), subtitle, [
        `${result.excluded.length} resort${result.excluded.length === 1 ? "" : "s"} within reach, none on your pass that day`,
      ]);
    }
    return card("Nothing within reach", formatTargetDate(targetDate), subtitle, ["Widen the drive radius on wynla.app/go"]);
  } catch (e) {
    console.error("[go/og] render failed", e);
    return card("Saturday picks", formatTargetDate(targetDate), subtitle, []);
  }
}
