'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Question, Language, FSRSRating } from '@/lib/types/database';
import { Rating } from '@/lib/fsrs/scheduler';

// ─── Types ───────────────────────────────────────────────────────────────────

type Phase = 'answering' | 'feedback';

export interface QuizCardProps {
  question: Question;
  locale: Language;
  categoryName: string;
  categoryColor: string | null;
  onAnswer: (rating: FSRSRating, wasCorrect: boolean | null, timeMs: number) => void;
  onSuspend: () => void;
}

// ─── Fisher-Yates Shuffle (skip for true/false) ─────────────────────────────

function shuffleOptions(options: string[], correctIndex: number) {
  const indices = options.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return {
    options: indices.map(i => options[i]),
    correctIndex: indices.indexOf(correctIndex),
  };
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QuizCard({
  question,
  locale,
  categoryName,
  categoryColor,
  onAnswer,
  onSuspend,
}: QuizCardProps) {
  const t = useTranslations('quiz');
  const tCommon = useTranslations('common');
  const startTime = useRef(Date.now());

  const [phase, setPhase] = useState<Phase>('answering');
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const questionText = locale === 'es' ? question.question_es : question.question_en;
  const rawOptions = (locale === 'es' ? question.options_es : question.options_en) ?? [];
  const explanation = locale === 'es' ? question.explanation_es : question.explanation_en;
  const extra = locale === 'es' ? question.extra_es : question.extra_en;
  const correctIdx = question.correct_index ?? 0;

  // Shuffle once per question (not true/false)
  const shuffled = useMemo(() => {
    if (question.type === 'true_false') {
      return { options: rawOptions, correctIndex: correctIdx };
    }
    return shuffleOptions(rawOptions, correctIdx);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  // Reset state when question changes
  useEffect(() => {
    setPhase('answering');
    setSelectedIndex(null);
    startTime.current = Date.now();
  }, [question.id]);

  const wasCorrect = selectedIndex !== null && selectedIndex === shuffled.correctIndex;

  const handleSelect = useCallback((index: number) => {
    if (phase !== 'answering') return;
    setSelectedIndex(index);
    setPhase('feedback');
  }, [phase]);

  const handleIdk = useCallback(() => {
    if (phase !== 'answering') return;
    setSelectedIndex(null);
    setPhase('feedback');
  }, [phase]);

  const handleNext = useCallback(() => {
    const timeMs = Date.now() - startTime.current;
    if (selectedIndex === null) {
      // IDK
      onAnswer(Rating.Again as FSRSRating, null, timeMs);
    } else if (selectedIndex === shuffled.correctIndex) {
      // Correct → Good
      onAnswer(Rating.Good as FSRSRating, true, timeMs);
    } else {
      // Incorrect → Again
      onAnswer(Rating.Again as FSRSRating, false, timeMs);
    }
  }, [selectedIndex, shuffled.correctIndex, onAnswer]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardContent className="pt-6 space-y-6">
        {/* Header: category + suspend */}
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className="text-xs"
            style={categoryColor ? { borderColor: categoryColor, color: categoryColor } : undefined}
          >
            {categoryName}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={onSuspend}
            title={t('suspend')}
            className="text-muted-foreground hover:text-destructive h-8 w-8"
          >
            <span className="text-lg leading-none">&#8856;</span>
          </Button>
        </div>

        {/* Question text */}
        <p className="text-xl font-semibold leading-relaxed">{questionText}</p>

        {/* Options */}
        <div className="space-y-3">
          {shuffled.options.map((option, i) => {
            const isSelected = selectedIndex === i;
            const isCorrectOption = i === shuffled.correctIndex;
            const showResult = phase === 'feedback';

            return (
              <button
                key={i}
                onClick={() => handleSelect(i)}
                disabled={phase === 'feedback'}
                className={cn(
                  'w-full text-left p-4 rounded-lg border-2 transition-all duration-200',
                  phase === 'answering' && 'cursor-pointer hover:border-primary/50 hover:bg-muted/50',
                  phase === 'feedback' && 'cursor-default',
                  showResult && isCorrectOption && 'border-green-500 bg-green-500/10',
                  showResult && isSelected && !isCorrectOption && 'border-red-500 bg-red-500/10',
                  showResult && !isSelected && !isCorrectOption && 'opacity-50',
                  !showResult && 'border-border',
                )}
              >
                <div className="flex items-center gap-3">
                  <span className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-medium',
                    showResult && isCorrectOption && 'border-green-500 text-green-600',
                    showResult && isSelected && !isCorrectOption && 'border-red-500 text-red-600',
                  )}>
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-sm">{option}</span>
                  {showResult && isCorrectOption && (
                    <span className="ml-auto text-green-600 dark:text-green-400 font-bold">&#10003;</span>
                  )}
                  {showResult && isSelected && !isCorrectOption && (
                    <span className="ml-auto text-red-600 dark:text-red-400 font-bold">&#10007;</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* IDK button (answering phase only) */}
        {phase === 'answering' && (
          <Button variant="secondary" onClick={handleIdk} className="w-full">
            {t('idk')}
          </Button>
        )}

        {/* Feedback section */}
        {phase === 'feedback' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Result banner */}
            <div className={cn(
              'rounded-lg px-4 py-3 text-sm font-medium',
              wasCorrect
                ? 'bg-green-500/10 text-green-700 dark:text-green-300'
                : 'bg-red-500/10 text-red-700 dark:text-red-300',
            )}>
              {wasCorrect ? t('correct') : t('incorrect')}
            </div>

            {/* Explanation */}
            {explanation && (
              <div className="rounded-lg bg-muted p-4">
                <p className="text-sm leading-relaxed">{explanation}</p>
              </div>
            )}

            {/* Extra: Learn More */}
            {extra && (
              <details className="rounded-lg bg-blue-500/10 border border-blue-500/20">
                <summary className="px-4 py-2.5 cursor-pointer text-sm font-medium text-blue-700 dark:text-blue-300">
                  {t('learnMore')}
                </summary>
                <div className="px-4 pb-3 text-sm leading-relaxed text-blue-900 dark:text-blue-200">
                  {extra}
                </div>
              </details>
            )}

            {/* Next button */}
            <Button onClick={handleNext} className="w-full" size="lg">
              {tCommon('next')} &rarr;
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
