'use client';

import { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FlashcardQuestion {
  id: string;
  question_en: string;
  question_es: string;
  explanation_en: string | null;
  explanation_es: string | null;
  extra_en: string | null;
  extra_es: string | null;
}

interface FlashcardStackProps {
  questions: FlashcardQuestion[];
  locale: 'en' | 'es';
  onGrade: (questionId: string, knew: boolean) => void;
  onSuspend: (questionId: string) => void;
  onComplete: (results: { knew: string[]; didntKnow: string[] }) => void;
}

export function FlashcardStack({ questions, locale, onGrade, onSuspend, onComplete }: FlashcardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [knew, setKnew] = useState<string[]>([]);
  const [didntKnow, setDidntKnow] = useState<string[]>([]);

  const advance = useCallback((knewIt: boolean) => {
    const current = questions[currentIndex];
    if (!current) return;
    const qId = current.id;
    onGrade(qId, knewIt);

    if (knewIt) {
      setKnew(prev => [...prev, qId]);
    } else {
      setDidntKnow(prev => [...prev, qId]);
    }

    if (currentIndex + 1 >= questions.length) {
      onComplete({
        knew: knewIt ? [...knew, qId] : knew,
        didntKnow: knewIt ? didntKnow : [...didntKnow, qId],
      });
    } else {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    }
  }, [currentIndex, questions, knew, didntKnow, onGrade, onComplete]);

  const current = questions[currentIndex];
  if (!current) return null;

  const questionText = locale === 'es' ? current.question_es : current.question_en;
  const explanation = locale === 'es' ? current.explanation_es : current.explanation_en;
  const extra = locale === 'es' ? current.extra_es : current.extra_en;

  const handleFlip = () => {
    if (!isFlipped) setIsFlipped(true);
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      {/* Counter */}
      <div className="text-center text-sm text-muted-foreground">
        Card {currentIndex + 1} of {questions.length}
      </div>

      {/* Flashcard */}
      <div
        className="relative w-full aspect-[3/2] cursor-pointer"
        style={{ perspective: '1000px' }}
        onClick={handleFlip}
      >
        <div
          className={cn(
            'absolute inset-0 transition-transform duration-300',
            '[transform-style:preserve-3d]',
            isFlipped && '[transform:rotateY(180deg)]'
          )}
        >
          {/* Front */}
          <Card className="absolute inset-0 [backface-visibility:hidden] flex flex-col items-center justify-center p-6 text-center">
            <p className="text-lg font-semibold mb-4">{questionText}</p>
            <p className="text-sm text-muted-foreground">Tap to reveal</p>
          </Card>

          {/* Back */}
          <Card className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col p-6 overflow-y-auto">
            <div className="flex-1 space-y-3">
              {explanation && (
                <div>
                  <p className="text-sm font-medium mb-1">Answer</p>
                  <p className="text-sm text-muted-foreground">{explanation}</p>
                </div>
              )}
              {extra && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">Learn More</p>
                  <p className="text-xs text-muted-foreground">{extra}</p>
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 self-end"
              onClick={(e) => { e.stopPropagation(); onSuspend(current.id); }}
            >
              ⊘ Suspend
            </Button>
          </Card>
        </div>
      </div>

      {/* Grading buttons - only show when flipped */}
      {isFlipped && (
        <div className="flex gap-3">
          <Button
            variant="destructive"
            className="flex-1"
            onClick={() => advance(false)}
          >
            Didn&apos;t Know
          </Button>
          <Button
            className="flex-1 bg-green-600 hover:bg-green-700"
            onClick={() => advance(true)}
          >
            Knew It
          </Button>
        </div>
      )}

      {/* Progress indicators */}
      <div className="flex justify-center gap-4 text-sm">
        <span className="text-green-600">✓ {knew.length}</span>
        <span className="text-red-600">✗ {didntKnow.length}</span>
      </div>
    </div>
  );
}
