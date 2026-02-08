"use client";

import Script from "next/script";
import {
  generateEducationalApplicationSchema,
  generateWebSiteSchema,
} from "@/lib/seo/structured-data";

interface StructuredDataProps {
  baseUrl: string;
  locale: string;
}

// biome-ignore lint/correctness/noUnusedFunctionParameters: locale used for future i18n schema
export function StructuredData({ baseUrl, locale }: StructuredDataProps) {
  const languages = ["en", "es"];
  const webSiteSchema = generateWebSiteSchema(baseUrl);
  const appSchema = generateEducationalApplicationSchema(baseUrl, languages);

  return (
    <>
      <Script
        id="website-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(webSiteSchema),
        }}
      />
      <Script
        id="app-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(appSchema),
        }}
      />
    </>
  );
}

interface PageStructuredDataProps {
  baseUrl: string;
  path: string;
  title: string;
  description: string;
  locale: string;
}

export function PageStructuredData({
  baseUrl,
  path,
  title,
  description,
  locale,
}: PageStructuredDataProps) {
  const { generateWebPageSchema } = require("@/lib/seo/structured-data");
  const pageSchema = generateWebPageSchema(
    baseUrl,
    path,
    title,
    description,
    locale,
  );

  return (
    <Script
      id="page-schema"
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(pageSchema),
      }}
    />
  );
}
