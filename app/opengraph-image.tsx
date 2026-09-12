import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SITE_SEO } from "@/lib/seo/site";
import { SYNCOPS } from "@/lib/print/syncops";

export const alt = `${SYNCOPS.name} by ${SYNCOPS.builder.name}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const logoData = await readFile(join(process.cwd(), "public/brand/beautora-logo.png"));
  const logoSrc = `data:image/png;base64,${logoData.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(145deg, #06211D 0%, #0a2f29 55%, #123f37 100%)",
          padding: "64px 72px",
          color: "#F5F6F3",
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
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={72} height={64} alt="" />
            <div
              style={{
                display: "flex",
                fontSize: 28,
                letterSpacing: "0.28em",
                textTransform: "uppercase",
                color: "#C5D4CE",
              }}
            >
              {SYNCOPS.builder.name}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "rgba(245,246,243,0.55)" }}>
            {SYNCOPS.builder.domain}
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={120} height={106} alt="" />
            <div style={{ display: "flex", fontSize: 84, fontWeight: 600, lineHeight: 1.05 }}>
              {SYNCOPS.name}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 34,
              color: "rgba(245,246,243,0.78)",
              maxWidth: 820,
            }}
          >
            {SITE_SEO.tagline}
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#C5D4CE" }}>
            {`A ${SYNCOPS.builder.name} product · Salon POS, booking & operations`}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            width: "100%",
            fontSize: 22,
            color: "rgba(245,246,243,0.5)",
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
