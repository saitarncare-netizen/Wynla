import { ImageResponse } from "next/og";
import { supabase } from "@/lib/supabase";
import { passColor, passLabel, primaryPass } from "@/lib/passColors";

export const runtime = "edge";
export const alt = "Wynla resort";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  // Next 16: params is a Promise — must await, or slug is undefined and every
  // resort falls through to the generic card below.
  const { slug } = await params;
  const { data: resort } = await supabase
    .from("resorts")
    .select("name, state, region, passes, vertical_drop, total_trails, total_acres")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!resort) {
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

  const primary = primaryPass(resort.passes ?? []);
  const bg = passColor(primary);

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
          Wynla
          <span style={{ fontSize: 22, opacity: 0.7 }}>· Plan smart. Ride better.</span>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 20 }}>
            {(resort.passes ?? []).map((p: string) => (
              <div
                key={p}
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  background: passColor(p),
                  color: p === "ikon" ? "#1E2952" : "white",
                  padding: "6px 16px",
                  borderRadius: 10,
                }}
              >
                {passLabel(p)}
              </div>
            ))}
          </div>
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
          <div style={{ marginTop: 16, fontSize: 36, fontWeight: 600, opacity: 0.85 }}>
            {resort.state}
            {resort.region ? ` · ${resort.region}` : ""}
          </div>
        </div>
        <div style={{ display: "flex", gap: 40, fontSize: 26, fontWeight: 700, opacity: 0.95 }}>
          {resort.vertical_drop != null && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 16,
                  opacity: 0.6,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Vertical
              </div>
              <div>{resort.vertical_drop.toLocaleString()} ft</div>
            </div>
          )}
          {resort.total_trails != null && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 16,
                  opacity: 0.6,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Trails
              </div>
              <div>{resort.total_trails}</div>
            </div>
          )}
          {resort.total_acres != null && (
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  fontSize: 16,
                  opacity: 0.6,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Acres
              </div>
              <div>{resort.total_acres.toLocaleString()}</div>
            </div>
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}
