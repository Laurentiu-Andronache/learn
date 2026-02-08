import type { Metadata } from "next";

const defaultTitle = "LEARN";
const defaultDescription =
  "Learn what you need to know to boost your cognition and live a longer, healthier life.";
const defaultKeywords = [
  "spaced repetition",
  "flashcards",
  "quiz app",
  "learning",
  "study",
  "FSRS",
  "bilingual",
  "education",
  "memory",
  "retention",
];

export function generateBaseMetadata(
  baseUrl: string,
  locale: string = "en",
): Metadata {
  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: defaultTitle,
      template: "%s | LEARN",
    },
    description: defaultDescription,
    keywords: defaultKeywords,
    authors: [{ name: "LEARN" }],
    creator: "LEARN",
    publisher: "LEARN",
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      type: "website",
      locale: locale === "es" ? "es_ES" : "en_US",
      url: baseUrl,
      siteName: "LEARN",
      title: defaultTitle,
      description: defaultDescription,
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: "LEARN - Bilingual Study App",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: defaultTitle,
      description: defaultDescription,
      images: ["/twitter-image.png"],
      creator: "@learn_app",
    },
    alternates: {
      canonical: baseUrl,
      languages: {
        en: `${baseUrl}/en`,
        es: `${baseUrl}/es`,
      },
    },
    verification: {
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    },
    category: "education",
  };
}

export function generatePageMetadata(
  baseUrl: string,
  path: string,
  title: string,
  description: string,
  locale: string = "en",
  noIndex: boolean = false,
): Metadata {
  const fullUrl = `${baseUrl}${path}`;

  return {
    title,
    description,
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : undefined,
    openGraph: {
      type: "website",
      locale: locale === "es" ? "es_ES" : "en_US",
      url: fullUrl,
      siteName: "LEARN",
      title,
      description,
      images: [
        {
          url: "/opengraph-image.png",
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/twitter-image.png"],
    },
    alternates: {
      canonical: fullUrl,
      languages: {
        en: `${baseUrl}/en${path}`,
        es: `${baseUrl}/es${path}`,
      },
    },
  };
}

export function generateNoIndexMetadata(): Metadata {
  return {
    robots: {
      index: false,
      follow: false,
      noarchive: true,
      nosnippet: true,
      noimageindex: true,
    },
  };
}
