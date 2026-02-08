interface WebSiteSchema {
  "@context": "https://schema.org";
  "@type": "WebSite";
  name: string;
  url: string;
  description: string;
  inLanguage: string[];
}

interface WebPageSchema {
  "@context": "https://schema.org";
  "@type": "WebPage";
  name: string;
  description: string;
  url: string;
  inLanguage: string;
}

interface EducationalApplicationSchema {
  "@context": "https://schema.org";
  "@type": "EducationalApplication";
  name: string;
  description: string;
  url: string;
  applicationCategory: string;
  operatingSystem: string;
  inLanguage: string[];
  offers: {
    "@type": "Offer";
    price: string;
    priceCurrency: string;
  };
  featureList: string[];
}

export function generateWebSiteSchema(
  baseUrl: string,
  name: string = "LEARN - Bilingual Study App",
  description: string = "Master any topic with science-backed spaced repetition. Bilingual quiz and flashcard app.",
  languages: string[] = ["en", "es"],
): WebSiteSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: baseUrl,
    description,
    inLanguage: languages,
  };
}

export function generateWebPageSchema(
  baseUrl: string,
  path: string,
  name: string,
  description: string,
  language: string = "en",
): WebPageSchema {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name,
    description,
    url: `${baseUrl}${path}`,
    inLanguage: language,
  };
}

export function generateEducationalApplicationSchema(
  baseUrl: string,
  languages: string[] = ["en", "es"],
): EducationalApplicationSchema {
  return {
    "@context": "https://schema.org",
    "@type": "EducationalApplication",
    name: "LEARN",
    description:
      "Master any topic with science-backed spaced repetition. Bilingual quiz and flashcard app with FSRS algorithm.",
    url: baseUrl,
    applicationCategory: "Education",
    operatingSystem: "Any",
    inLanguage: languages,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    featureList: [
      "Bilingual support (English/Spanish)",
      "FSRS spaced repetition algorithm",
      "Quiz mode with multiple choice questions",
      "Flashcard mode with optimized review scheduling",
      "Reading mode for comprehensive study",
      "Progress tracking and analytics",
      "Guest mode without registration",
    ],
  };
}
