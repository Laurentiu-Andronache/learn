"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { SessionToolbar } from "@/components/session/session-toolbar";
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
  themeId: string;
  themeTitleEn: string;
  themeTitleEs: string;
  flashcards: FlashcardItemData[];
  isAdmin?: boolean;
  fsrsSettings?: FsrsSettings | null;
}

export function FlashcardSession({
  userId,
  themeId,
  themeTitleEn,
  themeTitleEs,
  flashcards: initialFlashcards,
  isAdmin = false,
  fsrsSettings = null,
}: FlashcardSessionProps) {
  const locale = useLocale();
  const tq = useTranslations("quiz");
  const ts = useTranslations("session");
  const [sessionKey, setSessionKey] = useState(0);
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

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 pb-16 space-y-6">
      <h1 className="text-xl font-bold text-center">
        {locale === "es" ? themeTitleEs : themeTitleEn}
      </h1>

      <FlashcardStack
        key={sessionKey}
        flashcards={flashcards}
        locale={locale as "en" | "es"}
        intervalPreviews={intervalPreviews}
        showIntervalPreviews={showIntervalPreviews}
        onGrade={handleGrade}
        onSuspend={handleSuspend}
        onComplete={handleComplete}
        skipSignal={skipSignal}
        undoSignal={undoSignal}
        onIndexChange={handleIndexChange}
      />

      {currentFc && (
        <SessionToolbar
          userId={userId}
          themeId={themeId}
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
  );
}
