"use client";

import { useTranslations, useLocale } from "next-intl";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ReadingProgressBar } from "./reading-progress";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface ReadingViewProps {
  userId: string;
  theme: {
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
}

export function ReadingView({ userId, theme, progress }: ReadingViewProps) {
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const title = locale === "es" ? theme.title_es : theme.title_en;
  const content = locale === "es"
    ? (theme.intro_text_es || theme.intro_text_en)
    : (theme.intro_text_en || theme.intro_text_es);

  const totalProgress = progress.length > 0
    ? progress.reduce((sum, p) => sum + p.completion_percent, 0) / progress.length
    : 0;

  return (
    <div className="relative min-h-screen">
      <ReadingProgressBar userId={userId} themeId={theme.id} initialPercent={totalProgress} />

      <div className="max-w-[680px] mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon-sm" asChild>
            <Link href="/themes">
              <ArrowLeft size={16} />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">{title}</h1>
        </div>

        {content ? (
          <article className="prose prose-sm dark:prose-invert max-w-none prose-headings:font-semibold prose-p:leading-7 prose-pre:bg-muted prose-pre:border prose-code:text-sm prose-code:before:content-none prose-code:after:content-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
