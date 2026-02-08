import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LEARN - Bilingual Study App",
    short_name: "LEARN",
    description:
      "Master any topic with science-backed spaced repetition. Bilingual quiz and flashcard app.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#000000",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    categories: ["education", "productivity"],
    lang: "en",
    dir: "ltr",
  };
}
