"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { buryCard, scheduleReview, undoLastReview } from "@/lib/fsrs/actions";
import type { SubMode } from "@/lib/fsrs/question-ordering";
import { deleteQuestion } from "@/lib/services/admin-reviews";
import { suspendQuestion } from "@/lib/services/user-preferences";
import type { FSRSRating, Language, Question } from "@/lib/types/database";
import { SessionToolbar } from "@/components/session/session-toolbar";
import { QuizCard } from "./quiz-card";
import { QuizProgress } from "./quiz-progress";
import { type QuizAnswer, QuizResults } from "./quiz-results";
import { SubModeSelector } from "./sub-mode-selector";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuizQuestionData {
  question: Question;
  categoryNameEn: string;
  categoryNameEs: string;
  categoryColor: string | null;
}

interface CategoryOption {
  id: string;
  nameEn: string;
  nameEs: string;
  color: string | null;
  count: number;
}

export interface QuizSessionProps {
  userId: string;
  themeId: string;
  themeTitleEn: string;
  themeTitleEs: string;
  questions: QuizQuestionData[];
  counts: { full: number; quickReview: number; spacedRepetition: number };
  categories: CategoryOption[];
  initialSubMode?: SubMode;
  isAdmin?: boolean;
}

type SessionPhase = "select_mode" | "quiz" | "results";

// ─── Component ───────────────────────────────────────────────────────────────

export function QuizSession({
  userId,
  themeId,
  themeTitleEn,
  themeTitleEs,
  questions: allQuestions,
  counts,
  categories,
  initialSubMode,
  isAdmin = false,
}: QuizSessionProps) {
  const locale = useLocale() as Language;
  const tq = useTranslations("quiz");
  const ts = useTranslations("session");
  const themeTitle = locale === "es" ? themeTitleEs : themeTitleEn;

  const [phase, setPhase] = useState<SessionPhase>(
    initialSubMode ? "quiz" : "select_mode",
  );
  const [questions, setQuestions] = useState(allQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const sessionStartTime = useRef(Date.now());

  // ── Sub-mode selection ──
  const handleSubModeSelect = useCallback(
    (subMode: SubMode, categoryId?: string) => {
      let filtered = allQuestions;
      if (subMode === "category_focus" && categoryId) {
        filtered = allQuestions.filter(
          (q) => q.question.category_id === categoryId,
        );
      } else if (subMode === "quick_review") {
        filtered = allQuestions.slice(0, 20);
      }
      setQuestions(filtered);
      setCurrentIndex(0);
      setAnswers([]);
      sessionStartTime.current = Date.now();
      setPhase("quiz");
    },
    [allQuestions],
  );

  // ── Answer handling ──
  const handleAnswer = useCallback(
    (rating: FSRSRating, wasCorrect: boolean | null, timeMs: number) => {
      const q = questions[currentIndex];
      const catName = locale === "es" ? q.categoryNameEs : q.categoryNameEn;
      const opts =
        (locale === "es" ? q.question.options_es : q.question.options_en) ?? [];

      const answer: QuizAnswer = {
        questionId: q.question.id,
        questionText:
          locale === "es" ? q.question.question_es : q.question.question_en,
        selectedIndex:
          wasCorrect === null
            ? null
            : wasCorrect
              ? (q.question.correct_index ?? 0)
              : -1,
        correctIndex: q.question.correct_index ?? 0,
        options: opts,
        wasCorrect: wasCorrect === true,
        wasIdk: wasCorrect === null,
        categoryName: catName,
        categoryColor: q.categoryColor,
      };

      scheduleReview(userId, q.question.id, rating, "quiz", wasCorrect, timeMs)
        .catch(() => toast.error("Failed to save progress. Your answer was recorded locally but may not persist."));

      setAnswers((prev) => [...prev, answer]);

      if (currentIndex + 1 >= questions.length) {
        setPhase("results");
      } else {
        setCurrentIndex((prev) => prev + 1);
      }
    },
    [questions, currentIndex, locale, userId],
  );

  // ── Suspend question ──
  const handleSuspend = useCallback(() => {
    const q = questions[currentIndex];
    suspendQuestion(userId, q.question.id, "Suspended from quiz session")
      .catch(() => toast.error("Failed to suspend question."));

    toast.success(tq("questionSuspended"), { duration: 3000 });

    // Skip to next question
    if (currentIndex + 1 >= questions.length) {
      setPhase("results");
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [questions, currentIndex, userId, tq]);

  // ── Review missed ──
  const handleReviewMissed = useCallback(() => {
    const missedIds = new Set(
      answers.filter((a) => !a.wasCorrect).map((a) => a.questionId),
    );
    const missedQuestions = allQuestions.filter((q) =>
      missedIds.has(q.question.id),
    );
    setQuestions(missedQuestions);
    setCurrentIndex(0);
    setAnswers([]);
    sessionStartTime.current = Date.now();
    setPhase("quiz");
  }, [answers, allQuestions]);

  // ── Bury card ──
  const handleBury = useCallback(() => {
    const q = questions[currentIndex];
    buryCard(userId, q.question.id).catch(() => {});
    toast.success(ts("cardBuried"), { duration: 3000 });

    if (currentIndex + 1 >= questions.length) {
      setPhase("results");
    } else {
      setCurrentIndex((prev) => prev + 1);
    }
  }, [questions, currentIndex, userId, ts]);

  // ── Undo last answer ──
  const handleUndo = useCallback(() => {
    if (currentIndex === 0 || answers.length === 0) return;
    const prevQ = questions[currentIndex - 1];
    undoLastReview(userId, prevQ.question.id).catch(() => {});
    toast.success(ts("undone"), { duration: 3000 });
    setAnswers((prev) => prev.slice(0, -1));
    setCurrentIndex((prev) => prev - 1);
  }, [questions, currentIndex, answers.length, userId, ts]);

  // ── Delete question (admin) ──
  const handleDeleteQuestion = useCallback(() => {
    const q = questions[currentIndex];
    deleteQuestion(q.question.id).catch(() => {});
    toast.success(ts("questionDeleted"), { duration: 3000 });

    const remaining = questions.filter((_, i) => i !== currentIndex);
    setQuestions(remaining);
    if (remaining.length === 0 || currentIndex >= remaining.length) {
      setPhase("results");
    }
  }, [questions, currentIndex, ts]);

  // ── Render ──

  if (phase === "select_mode") {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
        <h1 className="text-2xl font-bold text-center">{themeTitle}</h1>
        <SubModeSelector
          counts={counts}
          categories={categories}
          onSelect={handleSubModeSelect}
        />
      </div>
    );
  }

  if (phase === "results") {
    return (
      <QuizResults
        answers={answers}
        totalTimeMs={Date.now() - sessionStartTime.current}
        themeId={themeId}
        onReviewMissed={handleReviewMissed}
      />
    );
  }

  // Quiz phase
  const currentQ = questions[currentIndex];
  const catName =
    locale === "es" ? currentQ.categoryNameEs : currentQ.categoryNameEn;

  return (
    <div className="w-full pb-16">
      <QuizProgress
        current={currentIndex + 1}
        total={questions.length}
        correct={answers.filter((a) => a.wasCorrect).length}
        answered={answers.length}
        categoryName={catName}
        categoryColor={currentQ.categoryColor}
      />
      <div className="max-w-2xl mx-auto px-4 py-6">
        <QuizCard
          question={currentQ.question}
          locale={locale}
          categoryName={catName}
          categoryColor={currentQ.categoryColor}
          onAnswer={handleAnswer}
          onSuspend={handleSuspend}
        />
      </div>
      <SessionToolbar
        userId={userId}
        themeId={themeId}
        mode="quiz"
        isAdmin={isAdmin}
        currentQuestion={currentQ.question}
        onBury={handleBury}
        onUndo={handleUndo}
        onDeleteQuestion={handleDeleteQuestion}
        canUndo={currentIndex > 0 && answers.length > 0}
      />
    </div>
  );
}
