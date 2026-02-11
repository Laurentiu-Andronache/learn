"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SessionToolbar } from "@/components/session/session-toolbar";
import { Button } from "@/components/ui/button";
import {
  buryFlashcard,
  scheduleFlashcardReview,
  undoLastReview,
} from "@/lib/fsrs/actions";
import type { UserSchedulerSettings } from "@/lib/fsrs/interval-preview";
import { getIntervalPreviews } from "@/lib/fsrs/interval-preview";
import { deleteFlashcard } from "@/lib/services/admin-reviews";
import type { FsrsSettings } from "@/lib/services/user-preferences";
import { suspendFlashcard } from "@/lib/services/user-preferences";
import type { UserCardState } from "@/lib/types/database";
import { FlashcardResults } from "./flashcard-results";
import { FlashcardStack } from "./flashcard-stack";

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
  userId: string;
  topicId: string;
  topicTitleEn: string;
  topicTitleEs: string;
  flashcards: FlashcardItemData[];
  isAdmin?: boolean;
  fsrsSettings?: FsrsSettings | null;
}

export function FlashcardSession({
  userId,
  topicId,
  topicTitleEn,
  topicTitleEs,
  flashcards: initialFlashcards,
  isAdmin = false,
  fsrsSettings = null,
}: FlashcardSessionProps) {
  const locale = useLocale();
  const tq = useTranslations("quiz");
  const tf = useTranslations("flashcard");
  const ts = useTranslations("session");
  const [sessionKey, setSessionKey] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [rateSignal, setRateSignal] = useState({ count: 0, rating: 3 as 1 | 2 | 3 | 4 });
  const [flashcards, setFlashcards] = useState(initialFlashcards);
  const [results, setResults] = useState<Map<string, 1 | 2 | 3 | 4> | null>(
    null,
  );
  const startTime = useRef(Date.now());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [skipSignal, setSkipSignal] = useState(0);
  const [undoSignal, setUndoSignal] = useState(0);

  // Compute interval previews for all flashcards (client-side, no server call)
  const userSchedulerSettings: UserSchedulerSettings | undefined = useMemo(
    () =>
      fsrsSettings
        ? {
            desired_retention: fsrsSettings.desired_retention,
            max_review_interval: fsrsSettings.max_review_interval,
          }
        : undefined,
    [fsrsSettings],
  );
  const showIntervalPreviews = fsrsSettings?.show_review_time !== false;
  const intervalPreviews = useMemo(() => {
    const map = new Map<string, Record<1 | 2 | 3 | 4, string>>();
    for (const fc of flashcards) {
      map.set(fc.id, getIntervalPreviews(fc.cardState, userSchedulerSettings));
    }
    return map;
  }, [flashcards, userSchedulerSettings]);

  const handleGrade = useCallback(
    (flashcardId: string, rating: 1 | 2 | 3 | 4) => {
      const timeMs = Date.now() - startTime.current;
      scheduleFlashcardReview(userId, flashcardId, rating, timeMs).catch(() =>
        toast.error(
          "Failed to save progress. Your answer was recorded locally but may not persist.",
        ),
      );
      startTime.current = Date.now();
    },
    [userId],
  );

  const handleSuspend = useCallback(
    (flashcardId: string) => {
      suspendFlashcard(
        userId,
        flashcardId,
        "Suspended from flashcard session",
      ).catch(() => toast.error("Failed to suspend flashcard."));
      toast.success(tq("questionSuspended"), { duration: 3000 });
    },
    [userId, tq],
  );

  const handleComplete = useCallback(
    (finalResults: Map<string, 1 | 2 | 3 | 4>) => {
      setResults(finalResults);
    },
    [],
  );

  const handleFlipChange = useCallback((flipped: boolean) => setIsFlipped(flipped), []);
  const handleRate = useCallback((rating: 1 | 2 | 3 | 4) => {
    setRateSignal(prev => ({ count: prev.count + 1, rating }));
  }, []);

  const handleReviewAgain = useCallback(() => {
    if (!results) return;
    const againIds = new Set(
      [...results.entries()].filter(([, r]) => r === 1).map(([id]) => id),
    );
    const againCards = flashcards.filter((fc) => againIds.has(fc.id));
    setFlashcards(againCards);
    setResults(null);
    setSessionKey((k) => k + 1);
    setCurrentIdx(0);
    setIsFlipped(false);
  }, [results, flashcards]);

  const handleIndexChange = useCallback((index: number) => {
    setCurrentIdx(index);
  }, []);

  const handleBury = useCallback(() => {
    const fc = flashcards[currentIdx];
    if (!fc) return;
    buryFlashcard(userId, fc.id).catch(() => {});
    toast.success(ts("cardBuried"), { duration: 3000 });
    setSkipSignal((s) => s + 1);
  }, [flashcards, currentIdx, userId, ts]);

  const handleUndo = useCallback(() => {
    if (currentIdx === 0) return;
    const prevFc = flashcards[currentIdx - 1];
    undoLastReview(userId, prevFc.id).catch(() => {});
    toast.success(ts("undone"), { duration: 3000 });
    setUndoSignal((s) => s + 1);
  }, [flashcards, currentIdx, userId, ts]);

  const handleDeleteQuestion = useCallback(() => {
    const fc = flashcards[currentIdx];
    if (!fc) return;
    deleteFlashcard(fc.id).catch(() => {});
    toast.success(ts("questionDeleted"), { duration: 3000 });

    const remaining = flashcards.filter((_, i) => i !== currentIdx);
    setFlashcards(remaining);
    if (remaining.length === 0 || currentIdx >= remaining.length) {
      setResults(new Map());
    }
    setSessionKey((k) => k + 1);
  }, [flashcards, currentIdx, ts]);

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

  const currentFc = flashcards[currentIdx];
  const currentPreviews = currentFc
    ? (intervalPreviews.get(currentFc.id) ?? { 1: "", 2: "", 3: "", 4: "" })
    : { 1: "", 2: "", 3: "", 4: "" };

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
      />

      <div className="shrink-0 pt-3 pb-4">
        {isFlipped && currentFc && (
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
            userId={userId}
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
