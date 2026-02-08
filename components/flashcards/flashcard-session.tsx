"use client";

import { useLocale } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { scheduleReview } from "@/lib/fsrs/actions";
import { Rating } from "@/lib/fsrs/scheduler";
import { suspendQuestion } from "@/lib/services/user-preferences";
import type { FSRSRating } from "@/lib/types/database";
import { FlashcardProgress } from "./flashcard-progress";
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
}

export function FlashcardSession({
  userId,
  themeTitleEn,
  themeTitleEs,
  questions,
}: FlashcardSessionProps) {
  const locale = useLocale();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [knewCount, setKnewCount] = useState(0);
  const [didntKnowCount, setDidntKnowCount] = useState(0);
  const [results, setResults] = useState<{
    knew: string[];
    didntKnow: string[];
  } | null>(null);
  const startTime = useRef(Date.now());

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
    },
    [userId],
  );

  const handleComplete = useCallback(
    (finalResults: { knew: string[]; didntKnow: string[] }) => {
      setResults(finalResults);
    },
    [],
  );

  const handleProgressChange = useCallback(
    (knew: number, didntKnow: number, index: number) => {
      setKnewCount(knew);
      setDidntKnowCount(didntKnow);
      setCurrentIndex(index);
    },
    [],
  );

  const handleReviewDidntKnow = useCallback(() => {
    setResults(null);
    setCurrentIndex(0);
    setKnewCount(0);
    setDidntKnowCount(0);
  }, []);

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

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold text-center">
        {locale === "es" ? themeTitleEs : themeTitleEn}
      </h1>

      <FlashcardProgress
        current={currentIndex}
        total={questions.length}
        knew={knewCount}
        didntKnow={didntKnowCount}
      />

      <FlashcardStack
        questions={questions}
        locale={locale as "en" | "es"}
        onGrade={handleGrade}
        onSuspend={handleSuspend}
        onComplete={handleComplete}
        onProgressChange={handleProgressChange}
      />
    </div>
  );
}
