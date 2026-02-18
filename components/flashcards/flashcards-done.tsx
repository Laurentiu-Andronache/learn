"use client";

import { ArrowLeft, CheckCircle2, Settings } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FlashcardsDoneProps {
  topicUrl: string;
  remainingNewCards: number;
  nextDueAt: string | null;
  effectiveLimit: number;
}

function formatTimeUntil(
  dueAt: string,
  t: ReturnType<typeof useTranslations>,
): string {
  const diffMs = new Date(dueAt).getTime() - Date.now();
  if (diffMs <= 0) return t("dueNow");
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return t("inMinutes", { count: mins });
  const hours = Math.round(mins / 60);
  if (hours < 24) return t("inHours", { count: hours });
  const days = Math.round(hours / 24);
  return t("inDays", { count: days });
}

export function FlashcardsDone({
  topicUrl,
  remainingNewCards,
  nextDueAt,
  effectiveLimit,
}: FlashcardsDoneProps) {
  const t = useTranslations("flashcard.done");

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 space-y-6 animate-fade-up">
      <div className="text-center space-y-3">
        <CheckCircle2
          size={48}
          className="mx-auto text-rating-good"
          strokeWidth={1.5}
        />
        <h1 className="text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Next due info */}
          {nextDueAt && (
            <div className="flex items-start gap-3">
              <div className="text-sm">
                <p className="font-medium">{t("nextReview")}</p>
                <p className="text-muted-foreground">
                  {formatTimeUntil(nextDueAt, t)}
                </p>
              </div>
            </div>
          )}

          {/* Remaining new cards hint */}
          {remainingNewCards > 0 && (
            <div className="text-sm border-t pt-4">
              <p className="text-muted-foreground">
                {t("remainingNewCards", {
                  count: remainingNewCards,
                  limit: effectiveLimit,
                })}
              </p>
              <Button
                variant="link"
                asChild
                className="h-auto p-0 mt-1 text-sm"
              >
                <Link href="/settings">
                  <Settings size={14} />
                  {t("adjustInSettings")}
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" asChild className="w-full" size="lg">
        <Link href={topicUrl}>
          <ArrowLeft size={16} />
          {t("backToTopic")}
        </Link>
      </Button>
    </div>
  );
}
