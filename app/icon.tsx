import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Simple Beautora mark for browser tab / PWA fallback */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#06211D",
          color: "#F5F6F3",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "Georgia, serif",
        }}
      >
        B
      </div>
    ),
    { ...size }
  );
}
