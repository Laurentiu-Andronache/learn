"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TopicProgress } from "@/lib/fsrs/progress";
import { hideTopic } from "@/lib/services/user-preferences";

interface TopicData {
  id: string;
  title_en: string;
  title_es: string | null;
  description_en: string | null;
  description_es: string | null;
  icon: string | null;
}

interface TopicCardProps {
  topic: TopicData;
  progress: TopicProgress | null;
  userId: string;
  locale: string;
}

export function TopicCard({ topic, progress, userId, locale }: TopicCardProps) {
  const router = useRouter();
  const t = useTranslations("topics");

  const title =
    locale === "es" ? topic.title_es || topic.title_en : topic.title_en;
  const description =
    locale === "es"
      ? topic.description_es || topic.description_en
      : topic.description_en;

  const total = progress?.total ?? 0;
  const newPct = total > 0 ? (progress!.newCount / total) * 100 : 100;
  const learningPct = total > 0 ? (progress!.learningCount / total) * 100 : 0;
  const reviewPct = total > 0 ? (progress!.reviewCount / total) * 100 : 0;
  const masteredPct = total > 0 ? (progress!.masteredCount / total) * 100 : 0;

  const handleHide = async () => {
    await hideTopic(userId, topic.id);
    router.refresh();
  };

  return (
    <Link href={`/topics/${topic.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{topic.icon}</span>
              <h3 className="font-semibold text-lg leading-tight">{title}</h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                >
                  ⋯
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.preventDefault();
                    handleHide();
                  }}
                >
                  {t("hide")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>

          {/* Progress bar */}
          {total > 0 && (
            <div className="space-y-1">
              <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                <div
                  className="bg-green-500"
                  style={{ width: `${masteredPct}%` }}
                />
                <div
                  className="bg-blue-500"
                  style={{ width: `${reviewPct}%` }}
                />
                <div
                  className="bg-yellow-500"
                  style={{ width: `${learningPct}%` }}
                />
                <div
                  className="bg-gray-300 dark:bg-gray-600"
                  style={{ width: `${newPct}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {total} {t("questionCount")}
                </span>
                <span>
                  {progress?.percentComplete ?? 0}% {t("percentMastered")}
                </span>
              </div>
            </div>
          )}

          {/* Due today badge */}
          <div className="flex items-center gap-2">
            {progress && progress.dueToday > 0 && (
              <Badge variant="secondary">
                {progress.dueToday} {t("dueToday")}
              </Badge>
            )}
            {progress?.fullyMemorized && (
              <Badge className="bg-green-600">{t("fullyMemorized")}</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
