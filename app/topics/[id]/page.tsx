import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { cache } from "react";
import { ClickableCard } from "@/components/topics/clickable-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTopicProgress } from "@/lib/fsrs/progress";
import { getQuizSummary } from "@/lib/services/quiz-attempts";
import { createClient } from "@/lib/supabase/server";

const getTopicById = cache(async (id: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("topics")
    .select("*, creator:profiles!creator_id(display_name)")
    .eq("id", id)
    .single();
  return data;
});

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const locale = await getLocale();
  const topic = await getTopicById(id);

  if (!topic) {
    return {
      title: "Topic Not Found",
    };
  }

  const title =
    locale === "es" ? topic.title_es || topic.title_en : topic.title_en;
  const description =
    locale === "es"
      ? topic.description_es || topic.description_en
      : topic.description_en;

  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";

  return {
    title: `${title} | LEARN`,
    description:
      description || `Study ${title} with science-backed spaced repetition`,
    openGraph: {
      title: `${title} | LEARN`,
      description:
        description || `Study ${title} with science-backed spaced repetition`,
      url: `${baseUrl}/topics/${id}`,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | LEARN`,
      description:
        description || `Study ${title} with science-backed spaced repetition`,
    },
    alternates: {
      canonical: `${baseUrl}/topics/${id}`,
    },
  };
}

export default async function TopicDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const locale = await getLocale();
  const tTopics = await getTranslations("topics");
  const tModes = await getTranslations("modes");

  const topic = await getTopicById(id);

  if (!topic) redirect("/topics");

  const [progress, { count: quizQuestionCount }] = await Promise.all([
    getTopicProgress(user.id, id),
    supabase
      .from("questions")
      .select("id, categories!inner(topic_id)", {
        count: "exact",
        head: true,
      })
      .eq("categories.topic_id", id),
  ]);
  const quizSummary = await getQuizSummary(user.id, id);

  const title =
    locale === "es" ? topic.title_es || topic.title_en : topic.title_en;
  const description =
    locale === "es"
      ? topic.description_es || topic.description_en
      : topic.description_en;

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/topics"
          className="text-sm text-muted-foreground hover:text-foreground"
        >{`\u2190 ${tTopics("backToTopics")}`}</Link>
        <div className="flex items-center gap-3 mt-2">
          <span className="text-4xl">{topic.icon}</span>
          <div>
            <h1 className="text-3xl font-bold">{title}</h1>
            <p className="text-muted-foreground">{description}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {tTopics("createdBy", {
                creator: topic.creator?.display_name || tTopics("anonymous"),
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Fully Memorized */}
      {progress.fullyMemorized && (
        <Card className="border-green-500/50 bg-green-500/5">
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-2xl">🏆</p>
            <p className="font-semibold text-green-600">
              {tTopics("fullyMemorized")}
            </p>
            <p className="text-sm text-muted-foreground">
              {tTopics("masteredAll")}
            </p>
            <Button asChild variant="outline" size="sm">
              <Link href={`/topics/${id}/flashcards?subMode=full`}>
                {tTopics("reviewAnyway")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Progress summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{tTopics("recallProgress")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex h-3 rounded-full overflow-hidden bg-muted">
            {progress.total > 0 && (
              <>
                <div
                  className="bg-green-500"
                  style={{
                    width: `${(progress.masteredCount / progress.total) * 100}%`,
                  }}
                />
                <div
                  className="bg-blue-500"
                  style={{
                    width: `${(progress.reviewCount / progress.total) * 100}%`,
                  }}
                />
                <div
                  className="bg-yellow-500"
                  style={{
                    width: `${(progress.learningCount / progress.total) * 100}%`,
                  }}
                />
              </>
            )}
          </div>
          <div className="grid grid-cols-4 gap-2 text-center text-xs">
            <div>
              <span className="block text-lg font-semibold">
                {progress.newCount}
              </span>
              <span className="text-muted-foreground">
                {tTopics("progress.new")}
              </span>
            </div>
            <div>
              <span className="block text-lg font-semibold text-yellow-600">
                {progress.learningCount}
              </span>
              <span className="text-muted-foreground">
                {tTopics("progress.learning")}
              </span>
            </div>
            <div>
              <span className="block text-lg font-semibold text-blue-600">
                {progress.reviewCount}
              </span>
              <span className="text-muted-foreground">
                {tTopics("progress.review")}
              </span>
            </div>
            <div>
              <span className="block text-lg font-semibold text-green-600">
                {progress.masteredCount}
              </span>
              <span className="text-muted-foreground">
                {tTopics("progress.mastered")}
              </span>
            </div>
          </div>
          {progress.dueToday > 0 && (
            <p className="text-sm text-center">
              <Badge variant="secondary">
                {progress.dueToday} {tTopics("dueToday")}
              </Badge>
            </p>
          )}
        </CardContent>
      </Card>

      {/* Study Modes */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Flashcards — Primary CTA */}
        <Link href={`/topics/${id}/flashcards`} className="sm:col-span-2">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-primary/30">
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-4xl">🃏</div>
              <h3 className="text-lg font-semibold">{tModes("flashcard")}</h3>
              <p className="text-sm text-muted-foreground">
                {tModes("flashcardDescription")}
              </p>
              <Badge variant="outline">
                {progress.total} {tTopics("flashcardCount")}
              </Badge>
              {progress.total > 0 && progress.newCount === progress.total && (
                <p className="text-xs font-medium text-primary">
                  {tTopics("startStudying")}
                </p>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Quiz — Recognition Test */}
        {quizSummary.attemptCount > 0 &&
        quizSummary.uniqueCorrectCount < (quizQuestionCount ?? 0) ? (
          <ClickableCard
            href={`/topics/${id}/quiz?mode=remaining`}
            className="cursor-pointer"
          >
            <Card className="hover:shadow-md transition-shadow h-full">
              <CardContent className="pt-6 text-center space-y-2">
                <div className="text-3xl">📝</div>
                <h3 className="font-semibold">{tTopics("recognitionTest")}</h3>
                <p className="text-xs text-muted-foreground">
                  {tModes("quizDescription")}
                </p>
                <Badge variant="outline">
                  {quizQuestionCount ?? 0} {tTopics("questionCount")}
                </Badge>
                <p className="text-sm text-muted-foreground">
                  {tTopics("quizSummary", {
                    attempts: quizSummary.attemptCount,
                    correct: quizSummary.uniqueCorrectCount,
                  })}
                </p>
                <div className="flex items-center justify-center gap-3 text-xs">
                  <span className="font-medium text-primary underline">
                    {tTopics("remainingTest")}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <Link
                    href={`/topics/${id}/quiz`}
                    className="text-muted-foreground hover:text-primary hover:underline"
                  >
                    {tTopics("fullTest")}
                  </Link>
                </div>
              </CardContent>
            </Card>
          </ClickableCard>
        ) : (
          <Link href={`/topics/${id}/quiz`}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="pt-6 text-center space-y-2">
                <div className="text-3xl">📝</div>
                <h3 className="font-semibold">{tTopics("recognitionTest")}</h3>
                <p className="text-xs text-muted-foreground">
                  {tModes("quizDescription")}
                </p>
                <Badge variant="outline">
                  {quizQuestionCount ?? 0} {tTopics("questionCount")}
                </Badge>
                {quizSummary.attemptCount > 0 && (
                  <p className="text-sm text-muted-foreground">
                    {tTopics("quizSummaryAllCorrect", {
                      attempts: quizSummary.attemptCount,
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Reading */}
        <Link href={`/topics/${id}/reading`}>
          <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
            <CardContent className="pt-6 text-center space-y-2">
              <div className="text-3xl">📖</div>
              <h3 className="font-semibold">{tModes("reading")}</h3>
              <p className="text-xs text-muted-foreground">
                {tModes("readingDescription")}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Categories */}
      {progress.categories.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{tTopics("categories")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {progress.categories.map((cat) => (
              <div
                key={cat.categoryId}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  {cat.categoryColor && (
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: cat.categoryColor }}
                    />
                  )}
                  <span className="text-sm font-medium">
                    {locale === "es"
                      ? cat.categoryNameEs || cat.categoryNameEn
                      : cat.categoryNameEn}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex h-1.5 w-24 rounded-full overflow-hidden bg-muted">
                    {cat.total > 0 && (
                      <>
                        <div
                          className="bg-green-500"
                          style={{
                            width: `${(cat.masteredCount / cat.total) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-blue-500"
                          style={{
                            width: `${(cat.reviewCount / cat.total) * 100}%`,
                          }}
                        />
                        <div
                          className="bg-yellow-500"
                          style={{
                            width: `${(cat.learningCount / cat.total) * 100}%`,
                          }}
                        />
                      </>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">
                    {cat.masteredCount}/{cat.total}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
