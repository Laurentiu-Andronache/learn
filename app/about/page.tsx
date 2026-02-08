import type { Metadata } from "next";
import { getLocale } from "next-intl/server";
import { PageStructuredData } from "@/components/seo/structured-data";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  return {
    title: locale === "es" ? "Acerca de LEARN" : "About LEARN",
    description:
      locale === "es"
        ? "Aprende sobre la aplicación de cuestionarios y tarjetas bilingüe LEARN con repetición espaciada FSRS"
        : "Learn about the LEARN bilingual quiz and flashcard app with FSRS spaced repetition",
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
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
  const title = locale === "es" ? "Acerca de LEARN" : "About LEARN";
  const description =
    locale === "es"
      ? "Aprende sobre la aplicación de cuestionarios y tarjetas bilingüe LEARN con repetición espaciada FSRS"
      : "Learn about the LEARN bilingual quiz and flashcard app with FSRS spaced repetition";

  return (
    <>
      <PageStructuredData
        baseUrl={baseUrl}
        path="/about"
        title={title}
        description={description}
        locale={locale}
      />
      <div className="container max-w-3xl mx-auto py-8 px-4 space-y-8">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">About LEARN</h1>
          <p className="text-lg text-muted-foreground">
            LEARN is a bilingual (English/Spanish) quiz and flashcard
            application designed to help you master any topic using
            science-backed spaced repetition. Whether you&apos;re studying
            vaccines, languages, or any subject, LEARN adapts to your memory
            patterns for optimal long-term retention.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🧠 How Spaced Repetition Works
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              LEARN uses the{" "}
              <strong>FSRS (Free Spaced Repetition Scheduler)</strong>{" "}
              algorithm, a modern, research-backed system for optimizing when
              you review material.
            </p>
            <p>
              The core idea is simple: review information just before
              you&apos;re about to forget it. FSRS tracks how well you remember
              each card and schedules the next review at the optimal time:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground">
              <li>
                <strong>New cards</strong> appear frequently at first
              </li>
              <li>
                <strong>Difficult cards</strong> you struggle with show up more
                often
              </li>
              <li>
                <strong>Easy cards</strong> you know well appear at longer
                intervals
              </li>
              <li>
                <strong>Mastered cards</strong> may only need review every few
                months
              </li>
            </ul>
            <p>
              This approach is dramatically more efficient than re-reading or
              cramming — you spend your time exactly where it&apos;s needed
              most.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📚 Study Modes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <h3 className="font-semibold">Quiz Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Test your knowledge with multiple choice and true/false
                  questions. Get immediate feedback with detailed explanations.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Flashcard Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Study with interactive flip cards. Rate your recall to
                  optimize future review scheduling.
                </p>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Reading Mode</h3>
                <p className="text-sm text-muted-foreground">
                  Read comprehensive educational material about each topic
                  before testing your knowledge.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              ❓ Frequently Asked Questions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="what-is-fsrs">
                <AccordionTrigger>
                  What makes FSRS different from other flashcard apps?
                </AccordionTrigger>
                <AccordionContent>
                  FSRS is a newer algorithm that outperforms traditional systems
                  like SM-2 (used by Anki). It uses machine learning principles
                  to more accurately predict when you&apos;ll forget something,
                  resulting in fewer reviews needed to maintain the same level
                  of retention.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="anonymous">
                <AccordionTrigger>
                  Can I use LEARN without creating an account?
                </AccordionTrigger>
                <AccordionContent>
                  Yes! You can try LEARN as a guest. Your progress will be
                  saved, and you can upgrade to a full account at any time to
                  ensure your data is permanently saved.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="bilingual">
                <AccordionTrigger>
                  How does bilingual support work?
                </AccordionTrigger>
                <AccordionContent>
                  All content in LEARN is available in both English and Spanish.
                  You can switch languages at any time using the language
                  switcher in the navigation bar. Your preference is saved to
                  your profile.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="progress">
                <AccordionTrigger>How is my progress tracked?</AccordionTrigger>
                <AccordionContent>
                  Every time you answer a question or review a flashcard, FSRS
                  updates your card state. Cards progress through states: New →
                  Learning → Review → Mastered. You can see your progress on the
                  theme selection page.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="suspend">
                <AccordionTrigger>
                  What does &quot;suspending&quot; a question do?
                </AccordionTrigger>
                <AccordionContent>
                  Suspending a question removes it from your review queue. This
                  is useful for questions you find too easy, too hard, or
                  irrelevant. You can unsuspend questions from Settings at any
                  time.
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="data">
                <AccordionTrigger>Is my data safe?</AccordionTrigger>
                <AccordionContent>
                  Your data is stored securely in Supabase with row-level
                  security (RLS). Only you can access your progress,
                  preferences, and review history. We never share your data with
                  third parties.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
