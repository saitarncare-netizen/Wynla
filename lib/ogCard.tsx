// Shared OG-card JSX for editorial surfaces (guides + curated lists).
//
// The resort pages already get a rich per-resort card from
// app/resort/[slug]/opengraph-image.tsx; guides and lists previously fell
// back to the generic site-wide image, which made shared links look
// identical and anonymous. This builder gives them a branded editorial
// card: navy canvas, gold kicker, big title, subtitle. Kept dependency-free
// so the edge OG routes stay tiny.
//
// Gold here is #D4A84B (the muted email/map gold) — it reads better on the
// navy gradient at OG-thumbnail sizes than the brighter UI gold.

export const OG_SIZE = { width: 1200, height: 630 };

export function editorialOgCard({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle?: string | null;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "60px 80px",
        background: "linear-gradient(135deg, #26335F 0%, #1E2952 55%, #0F1530 100%)",
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
        <div
          style={{
            display: "flex",
            fontSize: 24,
            fontWeight: 800,
            color: "#D4A84B",
            textTransform: "uppercase",
            letterSpacing: 3,
            marginBottom: 18,
          }}
        >
          {kicker}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: title.length > 42 ? 66 : 84,
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: -1.5,
          }}
        >
          {title}
        </div>
        {subtitle ? (
          <div
            style={{
              display: "flex",
              marginTop: 20,
              fontSize: 32,
              fontWeight: 500,
              opacity: 0.8,
              lineHeight: 1.3,
            }}
          >
            {subtitle}
          </div>
        ) : null}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          fontSize: 24,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            display: "flex",
            width: 44,
            height: 6,
            background: "#D4A84B",
            borderRadius: 3,
          }}
        />
        wynla.app
      </div>
    </div>
  );
}
