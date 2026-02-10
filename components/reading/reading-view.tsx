"use client";

import { ArrowLeft, Pencil } from "lucide-react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { Button } from "@/components/ui/button";
import { ReadingProgressBar } from "./reading-progress";

interface ReadingViewProps {
  userId: string;
  topic: {
    id: string;
    title_en: string;
    title_es: string;
    intro_text_en: string | null;
    intro_text_es: string | null;
  };
  progress: Array<{
    category_id: string;
    current_section: number;
    completion_percent: number;
  }>;
  isAdmin?: boolean;
}

export function ReadingView({
  userId,
  topic,
  progress,
  isAdmin,
}: ReadingViewProps) {
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const title = locale === "es" ? topic.title_es : topic.title_en;
  const rawContent =
    locale === "es"
      ? topic.intro_text_es || topic.intro_text_en
      : topic.intro_text_en || topic.intro_text_es;

  const totalProgress =
    progress.length > 0
      ? progress.reduce((sum, p) => sum + p.completion_percent, 0) /
        progress.length
      : 0;

  return (
    <div className="relative min-h-screen">
      <ReadingProgressBar
        userId={userId}
        topicId={topic.id}
        initialPercent={totalProgress}
      />

      <div className="max-w-[680px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href={`/topics/${topic.id}`}>
              <ArrowLeft size={16} />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{title}</h1>
          {isAdmin && (
            <Button variant="ghost" size="icon-sm" asChild className="ml-auto">
              <Link href={`/admin/topics/${topic.id}/edit`}>
                <Pencil size={16} />
              </Link>
            </Button>
          )}
        </div>

        {rawContent ? (
          <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-7 prose-pre:bg-muted prose-pre:border prose-code:text-sm prose-code:before:content-none prose-code:after:content-none">
            <MarkdownContent text={rawContent} />
          </article>
        ) : (
          <p className="text-muted-foreground text-center py-12">
            {tCommon("noResults")}
          </p>
        )}
      </div>
    </div>
  );
}
