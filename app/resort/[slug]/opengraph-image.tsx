import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";
import { passColor, passLabel, primaryPass } from "@/lib/passColors";
import { textOn } from "@/lib/contrast";

export const runtime = "edge";
export const alt = "Wynla resort";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori (the renderer behind ImageResponse) is stricter than the DOM:
//   - a <div> with more than one child MUST declare display:flex, and
//   - mixed text children ("Colorado" + " · Front Range") inside one
//     element are rejected outright.
// The 2026-09-17 audit found every real resort returned a 200 with a
// 0-byte body because the state/region line and the stats row broke
// both rules (the render threw inside the edge runtime and the error
// was swallowed). Every text node below is therefore a single string
// built ahead of time, and every multi-child container is a flex box.

type OgResort = {
  name: string | null;
  state: string | null;
  region: string | null;
  passes: string[] | null;
  vertical_drop: number | null;
  total_trails: number | null;
  total_acres: number | null;
};

const LABEL_STYLE = {
  fontSize: 16,
  opacity: 0.6,
  fontWeight: 600,
  textTransform: "uppercase" as const,
  letterSpacing: 1,
};

function fallbackCard() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1E2952",
          color: "white",
          fontSize: 64,
          fontWeight: 800,
        }}
      >
        Wynla
      </div>
    ),
    { ...size },
  );
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  // Next 16: params is a Promise — must await, or slug is undefined and every
  // resort falls through to the generic card below.
  const { slug } = await params;
  const { data } = await supabase
    .from("resorts")
    .select("name, state, region, passes, vertical_drop, total_trails, total_acres")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  const resort = data as OgResort | null;

  if (!resort || !resort.name) return fallbackCard();

  const passes = (resort.passes ?? []).filter((p): p is string => typeof p === "string" && p.length > 0);
  const bg = passColor(primaryPass(passes));
  const locationLine = [resort.state, resort.region].filter(Boolean).join(" · ");

  // Stats are pre-formatted strings so each cell is text-only for Satori.
  const stats: Array<{ label: string; value: string }> = [];
  if (typeof resort.vertical_drop === "number") {
    stats.push({ label: "Vertical", value: `${resort.vertical_drop.toLocaleString("en-US")} ft` });
  }
  if (typeof resort.total_trails === "number") {
    stats.push({ label: "Trails", value: String(resort.total_trails) });
  }
  if (typeof resort.total_acres === "number") {
    stats.push({ label: "Acres", value: resort.total_acres.toLocaleString("en-US") });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px",
          background: `linear-gradient(135deg, ${bg} 0%, #1E2952 70%, #0F1530 100%)`,
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 12,
            fontSize: 28,
            fontWeight: 700,
            opacity: 0.9,
          }}
        >
          <div style={{ display: "flex" }}>Wynla</div>
          <div style={{ display: "flex", fontSize: 22, opacity: 0.7 }}>· Plan smart. Ride better.</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {passes.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
              {passes.map((p) => (
                <div
                  key={p}
                  style={{
                    display: "flex",
                    fontSize: 22,
                    fontWeight: 700,
                    background: passColor(p),
                    color: textOn(passColor(p)),
                    padding: "6px 16px",
                    borderRadius: 10,
                  }}
                >
                  {passLabel(p)}
                </div>
              ))}
            </div>
          )}
          <div
            style={{
              display: "flex",
              fontSize: 110,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -2,
            }}
          >
            {resort.name}
          </div>
          {locationLine && (
            <div style={{ display: "flex", marginTop: 16, fontSize: 36, fontWeight: 600, opacity: 0.85 }}>
              {locationLine}
            </div>
          )}
        </div>

        {stats.length > 0 && (
          <div style={{ display: "flex", gap: 40, fontSize: 26, fontWeight: 700, opacity: 0.95 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", ...LABEL_STYLE }}>{s.label}</div>
                <div style={{ display: "flex" }}>{s.value}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    { ...size },
  );
}
