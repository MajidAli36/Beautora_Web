import { ImageResponse } from "next/og";
import { SITE_SEO } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const alt = `${SYNCOPS.name} by ${SYNCOPS.builder.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #07090c 0%, #121820 55%, #1a2430 100%)",
          padding: "64px 72px",
          color: "#e8e0d2",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 28,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#d4b483",
            }}
          >
            {SYNCOPS.builder.name}
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "rgba(232,224,210,0.55)" }}>
            {SYNCOPS.builder.domain}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", fontSize: 84, fontWeight: 600, lineHeight: 1.05 }}>
            {SYNCOPS.name}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              color: "rgba(232,224,210,0.78)",
              maxWidth: 820,
            }}
          >
            {SITE_SEO.tagline}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#d4b483" }}>
            {`A ${SYNCOPS.builder.name} product · Salon POS, booking & operations`}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            fontSize: 22,
            color: "rgba(232,224,210,0.5)",
          }}
        >
          <div style={{ display: "flex" }}>{SYNCOPS.domain}</div>
          <div style={{ display: "flex" }}>{`Built by ${SYNCOPS.builder.name}`}</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
