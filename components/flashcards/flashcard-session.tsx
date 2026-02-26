"use client";

import { useLocale, useTranslations } from "next-intl";
import { SessionToolbar } from "@/components/session/session-toolbar";
import { Button } from "@/components/ui/button";
import type { FsrsSettings } from "@/lib/services/user-preferences";
import type { UserCardState } from "@/lib/types/database";
import { FlashcardResults } from "./flashcard-results";
import { FlashcardStack } from "./flashcard-stack";
import { useFlashcardSession } from "./use-flashcard-session";

interface FlashcardItemData {
  id: string;
  question_en: string;
  question_es: string;
  answer_en: string;
  answer_es: string;
  extra_en: string | null;
  extra_es: string | null;
  categoryNameEn: string;
  categoryNameEs: string;
  categoryColor: string | null;
  cardState: UserCardState | null;
}

interface FlashcardSessionProps {
  topicId: string;
  topicTitleEn: string;
  topicTitleEs: string;
  flashcards: FlashcardItemData[];
  isAdmin?: boolean;
  fsrsSettings?: FsrsSettings | null;
}

export function FlashcardSession({
  topicId,
  topicTitleEn,
  topicTitleEs,
  flashcards: initialFlashcards,
  isAdmin = false,
  fsrsSettings = null,
}: FlashcardSessionProps) {
  const locale = useLocale();
  const tf = useTranslations("flashcard");

  const {
    sessionKey,
    flashcards,
    results,
    currentIdx,
    currentFc,
    currentPreviews,
    skipSignal,
    undoSignal,
    rateSignal,
    hasRevealed,
    showIntervalPreviews,
    handleGrade,
    handleSuspend,
    handleComplete,
    handleFlipChange,
    handleRate,
    handleReviewAgain,
    handleIndexChange,
    handleBury,
    handleUndo,
    handleDeleteQuestion,
  } = useFlashcardSession({ initialFlashcards, fsrsSettings });

  if (results) {
    const categoryMap = new Map<
      string,
      { name: string; again: number; hard: number; good: number; easy: number }
    >();
    for (const fc of flashcards) {
      const catName = locale === "es" ? fc.categoryNameEs : fc.categoryNameEn;
      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, {
          name: catName,
          again: 0,
          hard: 0,
          good: 0,
          easy: 0,
        });
      }
      const cat = categoryMap.get(catName)!;
      const rating = results.get(fc.id);
      if (rating === 1) cat.again++;
      else if (rating === 2) cat.hard++;
      else if (rating === 3) cat.good++;
      else if (rating === 4) cat.easy++;
    }

    const againCount = [...results.values()].filter((r) => r === 1).length;
    const hardCount = [...results.values()].filter((r) => r === 2).length;
    const goodCount = [...results.values()].filter((r) => r === 3).length;
    const easyCount = [...results.values()].filter((r) => r === 4).length;

    return (
      <FlashcardResults
        again={againCount}
        hard={hardCount}
        good={goodCount}
        easy={easyCount}
        categories={Array.from(categoryMap.values())}
        onReviewAgain={againCount > 0 ? handleReviewAgain : undefined}
      />
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-4 flex-1 flex flex-col gap-4 bg-[radial-gradient(ellipse_at_top,hsl(var(--flashcard-accent)/0.04)_0%,transparent_50%)]">
      <h1 className="text-xl font-bold text-center">
        {locale === "es" ? topicTitleEs : topicTitleEn}
      </h1>

      <FlashcardStack
        key={sessionKey}
        flashcards={flashcards}
        locale={locale as "en" | "es"}
        onGrade={handleGrade}
        onSuspend={handleSuspend}
        onComplete={handleComplete}
        skipSignal={skipSignal}
        undoSignal={undoSignal}
        onIndexChange={handleIndexChange}
        onFlipChange={handleFlipChange}
        rateSignal={rateSignal}
        readQuestionsAloud={fsrsSettings?.read_questions_aloud === true}
      />

      <div className="shrink-0 pt-3 pb-4">
        {hasRevealed && currentFc && (
          <div className="space-y-2 animate-fade-up mb-3">
            <p className="text-xs text-center text-muted-foreground">
              {tf("ratingHint")}
            </p>
            <div className="grid grid-cols-4 gap-2">
              <Button
                variant="outline"
                className="flex-col h-auto py-2 border-rating-again/40 text-rating-again hover:bg-rating-again/10 hover:text-rating-again hover:shadow-[0_0_10px_-3px_hsl(var(--rating-again)/0.4)]"
                onClick={() => handleRate(1)}
              >
                <span className="text-sm font-medium">{tf("again")}</span>
                {showIntervalPreviews && (
                  <span className="text-[10px] text-muted-foreground">
                    {currentPreviews[1]}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-2 border-rating-hard/40 text-rating-hard hover:bg-rating-hard/10 hover:text-rating-hard hover:shadow-[0_0_10px_-3px_hsl(var(--rating-hard)/0.4)]"
                onClick={() => handleRate(2)}
              >
                <span className="text-sm font-medium">{tf("hard")}</span>
                {showIntervalPreviews && (
                  <span className="text-[10px] text-muted-foreground">
                    {currentPreviews[2]}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-2 border-rating-good/40 text-rating-good hover:bg-rating-good/10 hover:text-rating-good hover:shadow-[0_0_10px_-3px_hsl(var(--rating-good)/0.4)]"
                onClick={() => handleRate(3)}
              >
                <span className="text-sm font-medium">{tf("good")}</span>
                {showIntervalPreviews && (
                  <span className="text-[10px] text-muted-foreground">
                    {currentPreviews[3]}
                  </span>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-col h-auto py-2 border-rating-easy/40 text-rating-easy hover:bg-rating-easy/10 hover:text-rating-easy hover:shadow-[0_0_10px_-3px_hsl(var(--rating-easy)/0.4)]"
                onClick={() => handleRate(4)}
              >
                <span className="text-sm font-medium">{tf("easy")}</span>
                {showIntervalPreviews && (
                  <span className="text-[10px] text-muted-foreground">
                    {currentPreviews[4]}
                  </span>
                )}
              </Button>
            </div>
          </div>
        )}
        {currentFc && (
          <SessionToolbar
            topicId={topicId}
            mode="flashcard"
            isAdmin={isAdmin}
            currentFlashcard={{
              id: currentFc.id,
              question_en: currentFc.question_en,
              question_es: currentFc.question_es,
              answer_en: currentFc.answer_en,
              answer_es: currentFc.answer_es,
              extra_en: currentFc.extra_en,
              extra_es: currentFc.extra_es,
              difficulty: 5,
            }}
            onBury={handleBury}
            onUndo={handleUndo}
            onDeleteQuestion={handleDeleteQuestion}
            canUndo={currentIdx > 0}
          />
        )}
      </div>
    </div>
  );
}
