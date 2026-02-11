"use client";

import { useTranslations } from "next-intl";
import { TopicCard } from "@/components/topics/topic-card";
import type { TopicProgress } from "@/lib/fsrs/progress";

interface TopicData {
  id: string;
  slug: string | null;
  title_en: string;
  title_es: string | null;
  description_en: string | null;
  description_es: string | null;
  icon: string | null;
  creator: { display_name: string | null } | null;
}

interface TopicGridProps {
  topics: TopicData[];
  progress: TopicProgress[];
  userId: string;
  locale: string;
}

export function TopicGrid({
  topics,
  progress,
  userId,
  locale,
}: TopicGridProps) {
  const t = useTranslations("topics");
  const progressMap = new Map(progress.map((p) => [p.topicId, p]));

  if (topics.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">{t("noTopics")}</p>
        <p className="text-sm mt-2">{t("noTopicsDetail")}</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {topics.map((topic, index) => (
        <div
          key={topic.id}
          className="animate-fade-up"
          style={{ animationDelay: `${index * 0.05}s`, animationFillMode: "backwards" }}
        >
          <TopicCard
            topic={topic}
            progress={progressMap.get(topic.id) || null}
            userId={userId}
            locale={locale}
          />
        </div>
      ))}
    </div>
  );
}
