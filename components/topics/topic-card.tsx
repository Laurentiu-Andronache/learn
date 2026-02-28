"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef } from "react";
import { SegmentedBar } from "@/components/shared/segmented-bar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { TopicProgress } from "@/lib/fsrs/progress";
import { localizedField } from "@/lib/i18n/localized-field";
import { topicUrl } from "@/lib/topics/topic-url";
import { TopicCardMenu } from "./topic-card-menu";

interface TopicData {
  id: string;
  slug: string | null;
  title_en: string;
  title_es: string | null;
  description_en: string | null;
  description_es: string | null;
  icon: string | null;
  creator: { display_name: string | null } | null;
  visibility?: string | null;
  creator_id?: string | null;
}

interface TopicCardProps {
  topic: TopicData;
  progress: TopicProgress | null;
  locale: string;
}

export function TopicCard({ topic, progress, locale }: TopicCardProps) {
  const router = useRouter();
  const t = useTranslations("topics");
  const menuInteracting = useRef(false);

  const title = localizedField(topic, "title", locale as "en" | "es");
  const description = localizedField(
    topic,
    "description",
    locale as "en" | "es",
  );

  const total = progress?.total ?? 0;

  return (
    <div className="h-full">
      <Card
        className="hover:shadow-glow-sm hover:border-primary/20 transition-all duration-200 cursor-pointer h-full"
        onClick={() => {
          if (menuInteracting.current) return;
          router.push(topicUrl(topic));
        }}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl bg-muted rounded-full p-2">
                {topic.icon}
              </span>
              <h3 className="font-semibold text-lg leading-tight">{title}</h3>
            </div>
            <TopicCardMenu
              topicId={topic.id}
              topicSlug={topic.slug}
              onInteractionChange={(v) => {
                menuInteracting.current = v;
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {t("createdBy", {
              creator: topic.creator?.display_name || t("anonymous"),
            })}
          </p>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {description}
          </p>

          {/* Progress bar */}
          {total > 0 && progress && (
            <div className="space-y-1">
              <SegmentedBar
                segments={[
                  {
                    className: "bg-progress-mastered",
                    value: progress.masteredCount,
                  },
                  {
                    className: "bg-progress-review",
                    value: progress.reviewCount,
                  },
                  {
                    className: "bg-progress-learning",
                    value: progress.learningCount,
                  },
                  { className: "bg-progress-new", value: progress.newCount },
                ]}
                total={total}
                height="h-2"
                className="bg-muted"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  {total} {t("flashcardCount")}
                </span>
                <span>
                  {progress?.percentComplete ?? 0}% {t("recallMastery")}
                </span>
              </div>
            </div>
          )}

          {/* Due today badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {topic.visibility === "private" && (
              <Badge variant="outline" className="text-xs">
                {t("private")}
              </Badge>
            )}
            {progress && progress.dueToday > 0 && (
              <Badge variant="secondary">
                {progress.dueToday} {t("dueToday")}
              </Badge>
            )}
            {progress?.fullyMemorized && (
              <Badge className="bg-progress-mastered/15 text-progress-mastered border-progress-mastered/30 border">
                {t("fullyMemorized")}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
