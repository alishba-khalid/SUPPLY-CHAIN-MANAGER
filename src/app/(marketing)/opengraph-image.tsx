import { ImageResponse } from "next/og";
import { SITE_NAME, TAGLINE } from "@/lib/site-config";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#f8fafc",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 64,
            height: 64,
            borderRadius: 12,
            background: "#0f766e",
            color: "#ffffff",
            fontSize: 32,
            fontWeight: 700,
          }}
        >
          S
        </div>
        <div style={{ display: "flex", marginTop: 40, fontSize: 64, fontWeight: 700, color: "#0f172a" }}>
          {SITE_NAME}
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 32, color: "#475569" }}>{TAGLINE}</div>
      </div>
    ),
    { ...size },
  );
}
