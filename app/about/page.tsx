import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { PageStructuredData } from "@/components/seo/structured-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getBaseUrl } from "@/lib/seo/metadata-utils";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("about");
  const baseUrl = getBaseUrl();

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: `${baseUrl}/about`,
      languages: {
        en: `${baseUrl}/about`,
        es: `${baseUrl}/about`,
      },
    },
  };
}

export default async function AboutPage() {
  const locale = await getLocale();
  const t = await getTranslations("about");
  const tm = await getTranslations("modes");
  const baseUrl = getBaseUrl();

  return (
    <>
      <PageStructuredData
        baseUrl={baseUrl}
        path="/about"
        title={t("title")}
        description={t("description")}
        locale={locale}
      />
      <div className="container max-w-3xl mx-auto py-8 px-4 space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">{t("title")}</h1>
          <p className="text-lg text-muted-foreground">{t("intro")}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🧠 {t("howFsrsWorks")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>{t("fsrsIntro")}</p>
            <p>{t("fsrsCoreIdea")}</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong>{t("newCards")}</strong>
              </li>
              <li>
                <strong>{t("difficultCards")}</strong>
              </li>
              <li>
                <strong>{t("easyCards")}</strong>
              </li>
              <li>
                <strong>{t("masteredCards")}</strong>
              </li>
            </ul>
            <p>{t("fsrsEfficiency")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📚 {t("studyModes")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <h3 className="font-semibold">{tm("quiz")}</h3>
                <p className="text-sm text-muted-foreground">
                  {tm("quizDescription")}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">{tm("flashcard")}</h3>
                <p className="text-sm text-muted-foreground">
                  {tm("flashcardDescription")}
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">{tm("reading")}</h3>
                <p className="text-sm text-muted-foreground">
                  {tm("readingDescription")}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ❓ {t("faq")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is-fsrs">
                <AccordionTrigger>{t("faqFsrsQuestion")}</AccordionTrigger>
                <AccordionContent>{t.rich("faqFsrsAnswer", {
                  link: (chunks) => (
                    <a href="https://github.com/open-spaced-repetition/fsrs4anki/wiki/The-Algorithm" target="_blank" rel="noopener noreferrer" className="text-primary underline hover:text-primary/80">{chunks}</a>
                  )
                })}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="anonymous">
                <AccordionTrigger>{t("faqAnonymousQuestion")}</AccordionTrigger>
                <AccordionContent>{t("faqAnonymousAnswer")}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="bilingual">
                <AccordionTrigger>{t("faqBilingualQuestion")}</AccordionTrigger>
                <AccordionContent>{t("faqBilingualAnswer")}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="progress">
                <AccordionTrigger>{t("faqProgressQuestion")}</AccordionTrigger>
                <AccordionContent>{t("faqProgressAnswer")}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="suspend">
                <AccordionTrigger>{t("faqSuspendQuestion")}</AccordionTrigger>
                <AccordionContent>{t("faqSuspendAnswer")}</AccordionContent>
              </AccordionItem>
              <AccordionItem value="data">
                <AccordionTrigger>{t("faqDataQuestion")}</AccordionTrigger>
                <AccordionContent>{t("faqDataAnswer")}</AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
