"use client";

import { Loader2, RotateCcw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { unsuspendFlashcard } from "@/lib/services/user-preferences";

interface SuspendedFlashcardsListProps {
  userId: string;
  items: Array<{
    id: string;
    reason: string | null;
    suspended_at: string;
    flashcard: {
      id: string;
      question_en: string;
      question_es: string;
      category: { name_en: string; name_es: string } | null;
    } | null;
  }>;
}

export function SuspendedFlashcardsList({
  userId,
  items: initial,
}: SuspendedFlashcardsListProps) {
  const t = useTranslations("settings");
  const locale = useLocale();
  const [items, setItems] = useState(initial);
  const [pending, setPending] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const handleUnsuspend = (flashcardId: string) => {
    setPending(flashcardId);
    startTransition(async () => {
      await unsuspendFlashcard(userId, flashcardId);
      setItems((prev) => prev.filter((i) => i.flashcard?.id !== flashcardId));
      setPending(null);
    });
  };

  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground">{t("noSuspended")}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => {
        if (!item.flashcard) return null;
        const fc = item.flashcard;
        const text = locale === "es" ? fc.question_es : fc.question_en;
        const cat = fc.category
          ? locale === "es"
            ? fc.category.name_es
            : fc.category.name_en
          : null;

        return (
          <div
            key={item.id}
            className="flex items-start justify-between gap-3 rounded-md border p-3"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{text}</p>
              {cat && <p className="text-xs text-muted-foreground">{cat}</p>}
            </div>
            <Button
              variant="ghost"
              size="icon-xs"
              onClick={() => handleUnsuspend(fc.id)}
              disabled={pending === fc.id}
              title={t("unsuspend")}
            >
              {pending === fc.id ? (
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
