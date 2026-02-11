import { ImageResponse } from "next/og";
import { resolveTopicSelect } from "@/lib/topics/resolve-topic";

export const runtime = "edge";

export const alt = "LEARN Topic";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function Image({ params }: Props) {
  const { id } = await params;

  const topic = await resolveTopicSelect<{
    title_en: string;
    title_es: string | null;
    icon: string | null;
  }>(id, "title_en, title_es, icon");

  const title = topic?.title_en || "LEARN";
  const icon = topic?.icon || "📚";

  return new ImageResponse(
    <div
      style={{
        fontSize: 48,
        background: "linear-gradient(135deg, #000000 0%, #1a1a1a 100%)",
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        padding: "40px",
      }}
    >
      <div style={{ fontSize: 120, marginBottom: 20 }}>{icon}</div>
      <div
        style={{
          fontSize: 60,
          fontWeight: "bold",
          textAlign: "center",
          marginBottom: 20,
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 32,
          color: "#888",
          textAlign: "center",
        }}
      >
        Master with Spaced Repetition
      </div>
    </div>,
    {
      ...size,
    },
  );
}
