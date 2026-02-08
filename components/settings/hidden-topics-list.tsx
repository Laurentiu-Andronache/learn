"use client";

import { Eye, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { unhideTopic } from "@/lib/services/user-preferences";

interface HiddenTopicsListProps {
  userId: string;
  items: Array<{
    id: string;
    hidden_at: string;
    theme: {
      id: string;
      title_en: string;
      title_es: string;
      icon: string | null;
      color: string | null;
    } | null;
  }>;
}

export function HiddenTopicsList({
  userId,
  items: initial,
}: HiddenTopicsListProps) {
  const t = useTranslations("settings");
  const tTopics = useTranslations("topics");
  const locale = useLocale();
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleUnhide = (topicId: string) => {
    setPending(topicId);
    startTransition(async () => {
      await unhideTopic(userId, topicId);
      setItems((prev) => prev.filter((i) => i.theme?.id !== topicId));
      setPending(null);
    });
  };

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noHidden")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        if (!item.theme) return null;
        const topic = item.theme;
        const title = locale === "es" ? topic.title_es : topic.title_en;

        return (
          <div
            key={item.id}
            className="flex items-center justify-between gap-3 rounded-md border p-3"
          >
            <div className="flex items-center gap-2 min-w-0">
              {topic.icon && <span className="text-lg">{topic.icon}</span>}
              <span className="text-sm truncate">{title}</span>
            </div>
            <Button
              variant="ghost"
              size="xs"
              onClick={() => handleUnhide(topic.id)}
              disabled={pending === topic.id}
            >
              {pending === topic.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <>
                  <Eye size={12} />
                  <span>{tTopics("unhide")}</span>
                </>
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
