"use client";

import { useState, useTransition } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { unsuspendQuestion } from "@/lib/services/user-preferences";
import { Loader2, RotateCcw } from "lucide-react";

interface SuspendedQuestionsListProps {
  userId: string;
  items: Array<{
    id: string;
    reason: string | null;
    suspended_at: string;
    question: {
      id: string;
      question_en: string;
      question_es: string;
      category: { name_en: string; name_es: string } | null;
    } | null;
  }>;
}

export function SuspendedQuestionsList({ userId, items: initial }: SuspendedQuestionsListProps) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleUnsuspend = (questionId: string) => {
    setPending(questionId);
    startTransition(async () => {
      await unsuspendQuestion(userId, questionId);
      setItems((prev) => prev.filter((i) => i.question?.id !== questionId));
      setPending(null);
    });
  };

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noSuspended")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        if (!item.question) return null;
        const q = item.question;
        const text = locale === "es" ? q.question_es : q.question_en;
        const cat = q.category
          ? locale === "es" ? q.category.name_es : q.category.name_en
          : null;

        return (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-md border p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{text}</p>
              {cat && (
                <p className="text-xs text-muted-foreground">{cat}</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleUnsuspend(q.id)}
              disabled={pending === q.id}
              title={t("unsuspend")}
            >
              {pending === q.id ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <RotateCcw size={12} />
              )}
            </Button>
          </div>
        );
      })}
    </div>
  );
}
