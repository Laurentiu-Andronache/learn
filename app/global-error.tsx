"use client";

import { useEffect } from "react";

const text = {
  en: {
    title: "Something went wrong",
    description: "An unexpected error occurred. Please try again.",
    retry: "Try Again",
    home: "Go to Topics",
  },
  es: {
    title: "Algo salió mal",
    description: "Ocurrió un error inesperado. Por favor, inténtalo de nuevo.",
    retry: "Intentar de nuevo",
    home: "Ir a Temas",
  },
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  const lang =
    typeof navigator !== "undefined" && navigator.language?.startsWith("es")
      ? "es"
      : "en";
  const t = text[lang];

  return (
    <html lang={lang}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "hsl(200 6% 10%)",
          color: "hsl(210 6% 93%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{ textAlign: "center", padding: "2rem", maxWidth: "28rem" }}
        >
          <div style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>⚠️</div>
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              marginBottom: "0.5rem",
            }}
          >
            {t.title}
          </h1>
          <p style={{ color: "hsl(210 6% 63%)", marginBottom: "1.5rem" }}>
            {t.description}
          </p>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                border: "1px solid hsl(210 6% 25%)",
                backgroundColor: "transparent",
                color: "hsl(210 6% 93%)",
                cursor: "pointer",
              }}
            >
              {t.retry}
            </button>
            <a
              href="/topics"
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "0.375rem",
                backgroundColor: "hsl(172 100% 41%)",
                color: "hsl(200 6% 10%)",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              {t.home}
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
