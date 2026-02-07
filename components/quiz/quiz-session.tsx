'use client';

import { useState, useCallback, useRef } from 'react';
import { useLocale } from 'next-intl';
import { QuizCard } from './quiz-card';
import { QuizProgress } from './quiz-progress';
import { QuizResults, type QuizAnswer } from './quiz-results';
import { SubModeSelector } from './sub-mode-selector';
import { scheduleReview } from '@/lib/fsrs/actions';
import { suspendQuestion } from '@/lib/services/user-preferences';
import type { Question, Language, FSRSRating } from '@/lib/types/database';
import type { SubMode } from '@/lib/fsrs/question-ordering';

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
}

type SessionPhase = 'select_mode' | 'quiz' | 'results';

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
}: QuizSessionProps) {
  const locale = useLocale() as Language;
  const themeTitle = locale === 'es' ? themeTitleEs : themeTitleEn;

  const [phase, setPhase] = useState<SessionPhase>(
    initialSubMode ? 'quiz' : 'select_mode'
  );
  const [questions, setQuestions] = useState(allQuestions);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const sessionStartTime = useRef(Date.now());

  // ── Sub-mode selection ──
  const handleSubModeSelect = useCallback((subMode: SubMode, categoryId?: string) => {
    let filtered = allQuestions;
    if (subMode === 'category_focus' && categoryId) {
      filtered = allQuestions.filter(q => q.question.category_id === categoryId);
    } else if (subMode === 'quick_review') {
      filtered = allQuestions.slice(0, 20);
    }
    setQuestions(filtered);
    setCurrentIndex(0);
    setAnswers([]);
    sessionStartTime.current = Date.now();
    setPhase('quiz');
  }, [allQuestions]);

  // ── Answer handling ──
  const handleAnswer = useCallback((rating: FSRSRating, wasCorrect: boolean | null, timeMs: number) => {
    const q = questions[currentIndex];
    const catName = locale === 'es' ? q.categoryNameEs : q.categoryNameEn;
    const opts = (locale === 'es' ? q.question.options_es : q.question.options_en) ?? [];

    const answer: QuizAnswer = {
      questionId: q.question.id,
      questionText: locale === 'es' ? q.question.question_es : q.question.question_en,
      selectedIndex: wasCorrect === null ? null : (wasCorrect ? (q.question.correct_index ?? 0) : -1),
      correctIndex: q.question.correct_index ?? 0,
      options: opts,
      wasCorrect: wasCorrect === true,
      wasIdk: wasCorrect === null,
      categoryName: catName,
      categoryColor: q.categoryColor,
    };

    // Fire-and-forget FSRS scheduling
    scheduleReview(userId, q.question.id, rating, 'quiz', wasCorrect, timeMs);

    setAnswers(prev => [...prev, answer]);

    if (currentIndex + 1 >= questions.length) {
      setPhase('results');
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [questions, currentIndex, locale, userId]);

  // ── Suspend question ──
  const handleSuspend = useCallback(() => {
    const q = questions[currentIndex];
    suspendQuestion(userId, q.question.id, 'Suspended from quiz session');

    // Skip to next question
    if (currentIndex + 1 >= questions.length) {
      setPhase('results');
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [questions, currentIndex, userId]);

  // ── Review missed ──
  const handleReviewMissed = useCallback(() => {
    const missedIds = new Set(answers.filter(a => !a.wasCorrect).map(a => a.questionId));
    const missedQuestions = allQuestions.filter(q => missedIds.has(q.question.id));
    setQuestions(missedQuestions);
    setCurrentIndex(0);
    setAnswers([]);
    sessionStartTime.current = Date.now();
    setPhase('quiz');
  }, [answers, allQuestions]);

  // ── Render ──

  if (phase === 'select_mode') {
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

  if (phase === 'results') {
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
  const catName = locale === 'es' ? currentQ.categoryNameEs : currentQ.categoryNameEn;

  return (
    <div className="w-full">
      <QuizProgress
        current={currentIndex + 1}
        total={questions.length}
        correct={answers.filter(a => a.wasCorrect).length}
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
    </div>
  );
}
