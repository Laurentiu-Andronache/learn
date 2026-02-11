import type { MetadataRoute } from "next";
import { getBaseUrl } from "@/lib/seo/metadata-utils";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/auth",
          "/settings",
          "/test-db",
          "/api",
          "/_next",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
