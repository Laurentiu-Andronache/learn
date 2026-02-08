"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { QuestionReportForm } from "@/components/feedback/question-report-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { UserCardState } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { FlashcardProgress } from "./flashcard-progress";

interface FlashcardData {
  id: string;
  question_en: string;
  question_es: string;
  answer_en: string;
  answer_es: string;
  extra_en: string | null;
  extra_es: string | null;
  cardState: UserCardState | null;
}

interface FlashcardStackProps {
  flashcards: FlashcardData[];
  locale: "en" | "es";
  intervalPreviews: Map<string, Record<1 | 2 | 3 | 4, string>>;
  onGrade: (flashcardId: string, rating: 1 | 2 | 3 | 4) => void;
  onSuspend: (flashcardId: string) => void;
  onComplete: (results: Map<string, 1 | 2 | 3 | 4>) => void;
  skipSignal?: number;
  undoSignal?: number;
  onIndexChange?: (index: number) => void;
}

export function FlashcardStack({
  flashcards,
  locale,
  intervalPreviews,
  onGrade,
  onSuspend,
  onComplete,
  skipSignal,
  undoSignal,
  onIndexChange,
}: FlashcardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ratings, setRatings] = useState<Map<string, 1 | 2 | 3 | 4>>(new Map());
  const [reportOpen, setReportOpen] = useState(false);
  const t = useTranslations("feedback");
  const tf = useTranslations("flashcard");
  const tq = useTranslations("quiz");
  const prevSkipSignal = useRef(skipSignal ?? 0);
  const prevUndoSignal = useRef(undoSignal ?? 0);

  // Skip signal — advance without grading
  useEffect(() => {
    if (skipSignal !== undefined && skipSignal > prevSkipSignal.current) {
      prevSkipSignal.current = skipSignal;
      if (currentIndex + 1 >= flashcards.length) {
        onComplete(ratings);
      } else {
        const next = currentIndex + 1;
        setCurrentIndex(next);
        setIsFlipped(false);
        onIndexChange?.(next);
      }
    }
  }, [
    skipSignal,
    currentIndex,
    flashcards.length,
    ratings,
    onComplete,
    onIndexChange,
  ]);

  // Undo signal — go back to previous card
  useEffect(() => {
    if (undoSignal !== undefined && undoSignal > prevUndoSignal.current) {
      prevUndoSignal.current = undoSignal;
      if (currentIndex > 0) {
        const prev = currentIndex - 1;
        const prevCard = flashcards[prev];
        setRatings((r) => {
          const next = new Map(r);
          next.delete(prevCard.id);
          return next;
        });
        setCurrentIndex(prev);
        setIsFlipped(false);
        onIndexChange?.(prev);
      }
    }
  }, [undoSignal, currentIndex, flashcards, onIndexChange]);

  const advance = useCallback(
    (rating: 1 | 2 | 3 | 4) => {
      const current = flashcards[currentIndex];
      if (!current) return;
      onGrade(current.id, rating);

      const newRatings = new Map(ratings);
      newRatings.set(current.id, rating);
      setRatings(newRatings);

      if (currentIndex + 1 >= flashcards.length) {
        onComplete(newRatings);
      } else {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        setIsFlipped(false);
        onIndexChange?.(nextIndex);
      }
    },
    [currentIndex, flashcards, ratings, onGrade, onComplete, onIndexChange],
  );

  // Keyboard hotkeys: 1=Again, 2=Hard, 3/Space=Good, 4=Easy (only when flipped)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isFlipped) return;
      if (reportOpen) return;
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      switch (e.key) {
        case "1":
          e.preventDefault();
          advance(1);
          break;
        case "2":
          e.preventDefault();
          advance(2);
          break;
        case "3":
        case " ":
          e.preventDefault();
          advance(3);
          break;
        case "4":
          e.preventDefault();
          advance(4);
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isFlipped, advance, reportOpen]);

  const current = flashcards[currentIndex];
  if (!current) return null;

  const questionText =
    locale === "es" ? current.question_es : current.question_en;
  const answer = locale === "es" ? current.answer_es : current.answer_en;
  const extra = locale === "es" ? current.extra_es : current.extra_en;

  const previews = intervalPreviews.get(current.id) ?? {
    1: "",
    2: "",
    3: "",
    4: "",
  };

  const handleFlip = () => {
    if (!isFlipped) setIsFlipped(true);
  };

  // Count ratings by type
  const againCount = [...ratings.values()].filter((r) => r === 1).length;
  const hardCount = [...ratings.values()].filter((r) => r === 2).length;
  const goodCount = [...ratings.values()].filter((r) => r === 3).length;
  const easyCount = [...ratings.values()].filter((r) => r === 4).length;

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      <FlashcardProgress
        current={currentIndex}
        total={flashcards.length}
        again={againCount}
        hard={hardCount}
        good={goodCount}
        easy={easyCount}
      />

      {/* Flashcard */}
      {/* biome-ignore lint/a11y/useSemanticElements: div needed for 3D perspective container */}
      <div
        role="button"
        tabIndex={0}
        className="relative w-full aspect-[3/2] cursor-pointer"
        style={{ perspective: "1000px" }}
        onClick={handleFlip}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleFlip();
        }}
      >
        <div
          className={cn(
            "absolute inset-0 transition-transform duration-300",
            "[transform-style:preserve-3d]",
            isFlipped && "[transform:rotateY(180deg)]",
          )}
        >
          {/* Front */}
          <Card className="absolute inset-0 [backface-visibility:hidden] flex flex-col items-center justify-center p-6 text-center">
            <p className="text-lg font-semibold mb-4">{questionText}</p>
            <p className="text-sm text-muted-foreground">{tf("tapToReveal")}</p>
          </Card>

          {/* Back */}
          <Card className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col p-6 overflow-y-auto">
            <div className="flex-1 space-y-3">
              {answer && (
                <div>
                  <p className="text-sm font-medium mb-1">{tf("answer")}</p>
                  <p className="text-sm text-muted-foreground">{answer}</p>
                </div>
              )}
              {extra && (
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3">
                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mb-1">
                    {tq("learnMore")}
                  </p>
                  <p className="text-xs text-muted-foreground">{extra}</p>
                </div>
              )}
            </div>
            <div className="mt-2 flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  setReportOpen(true);
                }}
              >
                &#9873; {t("reportQuestion")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onSuspend(current.id);
                  if (currentIndex + 1 >= flashcards.length) {
                    onComplete(ratings);
                  } else {
                    setCurrentIndex(currentIndex + 1);
                    setIsFlipped(false);
                  }
                }}
              >
                ⊘ {tq("suspend")}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <QuestionReportForm
        flashcardId={current.id}
        questionText={
          locale === "es" && current.question_es
            ? current.question_es
            : current.question_en
        }
        open={reportOpen}
        onOpenChange={setReportOpen}
      />

      {/* 4-point FSRS rating buttons - only show when flipped */}
      {isFlipped && (
        <div className="space-y-2">
          <p className="text-xs text-center text-muted-foreground">
            {tf("ratingHint")}
          </p>
          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              className="flex-col h-auto py-2 border-red-500/40 text-red-600 hover:bg-red-500/10 hover:text-red-600"
              onClick={() => advance(1)}
            >
              <span className="text-sm font-medium">{tf("again")}</span>
              <span className="text-[10px] text-muted-foreground">
                {previews[1]}
              </span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-2 border-amber-500/40 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
              onClick={() => advance(2)}
            >
              <span className="text-sm font-medium">{tf("hard")}</span>
              <span className="text-[10px] text-muted-foreground">
                {previews[2]}
              </span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-2 border-green-500/40 text-green-600 hover:bg-green-500/10 hover:text-green-600"
              onClick={() => advance(3)}
            >
              <span className="text-sm font-medium">{tf("good")}</span>
              <span className="text-[10px] text-muted-foreground">
                {previews[3]}
              </span>
            </Button>
            <Button
              variant="outline"
              className="flex-col h-auto py-2 border-blue-500/40 text-blue-600 hover:bg-blue-500/10 hover:text-blue-600"
              onClick={() => advance(4)}
            >
              <span className="text-sm font-medium">{tf("easy")}</span>
              <span className="text-[10px] text-muted-foreground">
                {previews[4]}
              </span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
