"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { SessionToolbar } from "@/components/session/session-toolbar";
import { deleteQuestion } from "@/lib/services/admin-reviews";
import { saveQuizAttempt } from "@/lib/services/quiz-attempts";
import type { Language, Question } from "@/lib/types/database";
import { QuizCard } from "./quiz-card";
import { QuizProgress } from "./quiz-progress";
import { type QuizAnswer, QuizResults } from "./quiz-results";

// --- Types ---

export interface QuizQuestionData {
  question: Question;
  categoryNameEn: string;
  categoryNameEs: string;
  categoryColor: string | null;
}

export interface QuizSessionProps {
  userId: string;
  topicId: string;
  topicTitleEn: string;
  topicTitleEs: string;
  questions: QuizQuestionData[];
  isAdmin?: boolean;
}

type SessionPhase = "quiz" | "results";

// --- Component ---

export function QuizSession({
  userId,
  topicId,
  questions: allQuestions,
  isAdmin = false,
}: QuizSessionProps) {
  const locale = useLocale() as Language;
  const _tq = useTranslations("quiz");
  const ts = useTranslations("session");

  const [phase, setPhase] = useState<SessionPhase>("quiz");
  const [questions, setQuestions] = useState(allQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const sessionStartTime = useRef(Date.now());
  const [saving, setSaving] = useState(false);

  // Answer handling (local only — no server calls during quiz)
  const handleAnswer = useCallback(
    (wasCorrect: boolean | null, timeMs: number) => {
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
        timeMs,
      };

      const newAnswers = [...answers, answer];
      setAnswers(newAnswers);

      if (currentIndex + 1 >= questions.length) {
        // Quiz complete — save attempt
        const score = newAnswers.filter((a) => a.wasCorrect).length;
        setSaving(true);
        saveQuizAttempt(userId, topicId, {
          score,
          total: newAnswers.length,
          answers: newAnswers.map((a) => ({
            question_id: a.questionId,
            selected_index: a.selectedIndex,
            was_correct: a.wasCorrect,
            time_ms: a.timeMs,
          })),
        })
          .catch(() => toast.error("Failed to save quiz results."))
          .finally(() => setSaving(false));
        setPhase("results");
      } else {
        setCurrentIndex((prev) => prev + 1);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [questions, currentIndex, locale, userId, topicId, answers],
  );

  // Retry failed questions
  const handleRetryFailed = useCallback(() => {
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [answers, allQuestions]);

  // Save partial attempt on stop
  const savePartialAttempt = useCallback(async () => {
    if (answers.length === 0) return;
    const score = answers.filter((a) => a.wasCorrect).length;
    try {
      await saveQuizAttempt(userId, topicId, {
        score,
        total: answers.length,
        answers: answers.map((a) => ({
          question_id: a.questionId,
          selected_index: a.selectedIndex,
          was_correct: a.wasCorrect,
          time_ms: a.timeMs,
        })),
      });
    } catch {
      // Best-effort — don't block navigation
    }
  }, [answers, userId, topicId]);

  // Delete question (admin)
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

  // Render

  if (phase === "results") {
    return (
      <QuizResults
        answers={answers}
        totalTimeMs={Date.now() - sessionStartTime.current}
        topicId={topicId}
        onRetryFailed={handleRetryFailed}
        saving={saving}
      />
    );
  }

  // Quiz phase
  const currentQ = questions[currentIndex];
  if (!currentQ) {
    return (
      <QuizResults
        answers={answers}
        totalTimeMs={Date.now() - sessionStartTime.current}
        topicId={topicId}
        onRetryFailed={handleRetryFailed}
        saving={saving}
      />
    );
  }

  const catName =
    locale === "es" ? currentQ.categoryNameEs : currentQ.categoryNameEn;

  return (
    <div className="w-full flex-1 flex flex-col bg-[radial-gradient(ellipse_at_top,hsl(var(--quiz-accent)/0.04)_0%,transparent_50%)]">
      <QuizProgress
        current={currentIndex + 1}
        total={questions.length}
        correct={answers.filter((a) => a.wasCorrect).length}
        answered={answers.length}
        categoryName={catName}
        categoryColor={currentQ.categoryColor}
      />
      <div className="max-w-3xl mx-auto px-4 py-6 flex-1">
        <QuizCard
          question={currentQ.question}
          locale={locale}
          categoryName={catName}
          categoryColor={currentQ.categoryColor}
          onAnswer={handleAnswer}
        />
      </div>
      <div className="shrink-0 pt-3 pb-4">
        <SessionToolbar
          userId={userId}
          topicId={topicId}
          mode="quiz"
          isAdmin={isAdmin}
          currentQuestion={currentQ.question}
          onBury={() => {}}
          onUndo={() => {}}
          onDeleteQuestion={handleDeleteQuestion}
          canUndo={false}
          onStop={savePartialAttempt}
        />
      </div>
    </div>
  );
}
