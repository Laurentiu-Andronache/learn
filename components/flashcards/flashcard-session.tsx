"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { SessionToolbar } from "@/components/session/session-toolbar";
import { buryCard, scheduleReview, undoLastReview } from "@/lib/fsrs/actions";
import { Rating } from "@/lib/fsrs/scheduler";
import { deleteQuestion } from "@/lib/services/admin-reviews";
import { suspendQuestion } from "@/lib/services/user-preferences";
import type { FSRSRating } from "@/lib/types/database";
import { FlashcardResults } from "./flashcard-results";
import { FlashcardStack } from "./flashcard-stack";

interface FlashcardQuestionData {
  id: string;
  question_en: string;
  question_es: string;
  explanation_en: string | null;
  explanation_es: string | null;
  extra_en: string | null;
  extra_es: string | null;
  categoryNameEn: string;
  categoryNameEs: string;
  categoryColor: string | null;
}

interface FlashcardSessionProps {
  userId: string;
  themeId: string;
  themeTitleEn: string;
  themeTitleEs: string;
  questions: FlashcardQuestionData[];
  isAdmin?: boolean;
}

export function FlashcardSession({
  userId,
  themeId,
  themeTitleEn,
  themeTitleEs,
  questions: initialQuestions,
  isAdmin = false,
}: FlashcardSessionProps) {
  const locale = useLocale();
  const tq = useTranslations("quiz");
  const ts = useTranslations("session");
  const [sessionKey, setSessionKey] = useState(0);
  const [questions, setQuestions] = useState(initialQuestions);
  const [results, setResults] = useState<{
    knew: string[];
    didntKnow: string[];
  } | null>(null);
  const startTime = useRef(Date.now());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [skipSignal, setSkipSignal] = useState(0);
  const [undoSignal, setUndoSignal] = useState(0);

  const handleGrade = useCallback(
    (questionId: string, knew: boolean) => {
      const timeMs = Date.now() - startTime.current;
      const rating = knew
        ? (Rating.Good as FSRSRating)
        : (Rating.Again as FSRSRating);
      scheduleReview(userId, questionId, rating, "flashcard", knew, timeMs)
        .catch(() => toast.error("Failed to save progress. Your answer was recorded locally but may not persist."));
      startTime.current = Date.now();
    },
    [userId],
  );

  const handleSuspend = useCallback(
    (questionId: string) => {
      suspendQuestion(userId, questionId, "Suspended from flashcard session")
        .catch(() => toast.error("Failed to suspend question."));
      toast.success(tq("questionSuspended"), { duration: 3000 });
    },
    [userId, tq],
  );

  const handleComplete = useCallback(
    (finalResults: { knew: string[]; didntKnow: string[] }) => {
      setResults(finalResults);
    },
    [],
  );

  const handleReviewDidntKnow = useCallback(() => {
    setResults(null);
    setSessionKey((k) => k + 1);
    setCurrentIdx(0);
  }, []);

  const handleIndexChange = useCallback((index: number) => {
    setCurrentIdx(index);
  }, []);

  const handleBury = useCallback(() => {
    const q = questions[currentIdx];
    if (!q) return;
    buryCard(userId, q.id).catch(() => {});
    toast.success(ts("cardBuried"), { duration: 3000 });
    setSkipSignal((s) => s + 1);
  }, [questions, currentIdx, userId, ts]);

  const handleUndo = useCallback(() => {
    if (currentIdx === 0) return;
    const prevQ = questions[currentIdx - 1];
    undoLastReview(userId, prevQ.id).catch(() => {});
    toast.success(ts("undone"), { duration: 3000 });
    setUndoSignal((s) => s + 1);
  }, [questions, currentIdx, userId, ts]);

  const handleDeleteQuestion = useCallback(() => {
    const q = questions[currentIdx];
    if (!q) return;
    deleteQuestion(q.id).catch(() => {});
    toast.success(ts("questionDeleted"), { duration: 3000 });

    const remaining = questions.filter((_, i) => i !== currentIdx);
    setQuestions(remaining);
    if (remaining.length === 0 || currentIdx >= remaining.length) {
      setResults({ knew: [], didntKnow: [] });
    }
    setSessionKey((k) => k + 1);
  }, [questions, currentIdx, ts]);

  if (results) {
    const categoryMap = new Map<
      string,
      { name: string; knew: number; didntKnow: number }
    >();
    for (const q of questions) {
      const catName = locale === "es" ? q.categoryNameEs : q.categoryNameEn;
      if (!categoryMap.has(catName)) {
        categoryMap.set(catName, { name: catName, knew: 0, didntKnow: 0 });
      }
      const cat = categoryMap.get(catName)!;
      if (results.knew.includes(q.id)) cat.knew++;
      else if (results.didntKnow.includes(q.id)) cat.didntKnow++;
    }

    return (
      <FlashcardResults
        knew={results.knew.length}
        didntKnow={results.didntKnow.length}
        categories={Array.from(categoryMap.values())}
        onReviewDidntKnow={
          results.didntKnow.length > 0 ? handleReviewDidntKnow : undefined
        }
      />
    );
  }

  const currentQ = questions[currentIdx];

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 pb-16 space-y-6">
      <h1 className="text-xl font-bold text-center">
        {locale === "es" ? themeTitleEs : themeTitleEn}
      </h1>

      <FlashcardStack
        key={sessionKey}
        questions={questions}
        locale={locale as "en" | "es"}
        onGrade={handleGrade}
        onSuspend={handleSuspend}
        onComplete={handleComplete}
        skipSignal={skipSignal}
        undoSignal={undoSignal}
        onIndexChange={handleIndexChange}
      />

      {currentQ && (
        <SessionToolbar
          userId={userId}
          themeId={themeId}
          mode="flashcard"
          isAdmin={isAdmin}
          currentQuestion={{
            id: currentQ.id,
            question_en: currentQ.question_en,
            question_es: currentQ.question_es,
            options_en: null,
            options_es: null,
            correct_index: null,
            explanation_en: currentQ.explanation_en,
            explanation_es: currentQ.explanation_es,
            extra_en: currentQ.extra_en,
            extra_es: currentQ.extra_es,
            type: "multiple_choice",
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
