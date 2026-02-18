"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronRight } from "lucide-react";
import { QuestionReportForm } from "@/components/feedback/question-report-form";
import { MarkdownContent } from "@/components/shared/markdown-content";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTTS } from "@/hooks/use-tts";
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
  onGrade: (flashcardId: string, rating: 1 | 2 | 3 | 4) => void;
  onSuspend: (flashcardId: string) => void;
  onComplete: (results: Map<string, 1 | 2 | 3 | 4>) => void;
  skipSignal?: number;
  undoSignal?: number;
  onIndexChange?: (index: number) => void;
  onFlipChange?: (flipped: boolean) => void;
  rateSignal?: { count: number; rating: 1 | 2 | 3 | 4 };
  readQuestionsAloud?: boolean;
}

export function FlashcardStack({
  flashcards,
  locale,
  onGrade,
  onSuspend,
  onComplete,
  skipSignal,
  undoSignal,
  onIndexChange,
  onFlipChange,
  rateSignal,
  readQuestionsAloud = false,
}: FlashcardStackProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasBeenRevealed, setHasBeenRevealed] = useState(false);
  const [ratings, setRatings] = useState<Map<string, 1 | 2 | 3 | 4>>(new Map());
  const [reportOpen, setReportOpen] = useState(false);
  const t = useTranslations("feedback");
  const tf = useTranslations("flashcard");
  const tq = useTranslations("quiz");
  const { playingEl, paused, handleBlockClick, stop: stopTTS } = useTTS();
  const questionRef = useRef<HTMLParagraphElement>(null);
  const prevSkipSignal = useRef(skipSignal ?? 0);
  const prevUndoSignal = useRef(undoSignal ?? 0);
  const prevRateSignal = useRef(rateSignal?.count ?? 0);

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
        setHasBeenRevealed(false);
        onFlipChange?.(false);
        onIndexChange?.(next);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [
    skipSignal,
    currentIndex,
    flashcards.length,
    ratings,
    onComplete,
    onIndexChange,
    onFlipChange,
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
        setHasBeenRevealed(false);
        onFlipChange?.(false);
        onIndexChange?.(prev);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [undoSignal, currentIndex, flashcards, onIndexChange, onFlipChange]);

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
        setHasBeenRevealed(false);
        onFlipChange?.(false);
        onIndexChange?.(nextIndex);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    },
    [currentIndex, flashcards, ratings, onGrade, onComplete, onIndexChange, onFlipChange],
  );

  // Rate signal — grade from parent
  useEffect(() => {
    if (rateSignal && rateSignal.count > prevRateSignal.current) {
      prevRateSignal.current = rateSignal.count;
      advance(rateSignal.rating);
    }
  }, [rateSignal, advance]);

  // Keyboard hotkeys: 1=Again, 2=Hard, 3/Space=Good, 4=Easy (only after first reveal)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!hasBeenRevealed) return;
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
  }, [hasBeenRevealed, advance, reportOpen]);

  // Stop TTS on card change, then auto-read question if enabled
  // biome-ignore lint/correctness/useExhaustiveDependencies: trigger on card change
  useEffect(() => {
    stopTTS();
    if (readQuestionsAloud && questionRef.current) {
      handleBlockClick(questionRef.current);
    }
  }, [currentIndex]);

  const current = flashcards[currentIndex];
  if (!current) return null;

  const questionText =
    locale === "es" ? current.question_es : current.question_en;
  const answer = locale === "es" ? current.answer_es : current.answer_en;
  const extra = locale === "es" ? current.extra_es : current.extra_en;

  const handleFlip = () => {
    stopTTS();
    if (!hasBeenRevealed) {
      setIsFlipped(true);
      setHasBeenRevealed(true);
      onFlipChange?.(true);
    } else {
      const next = !isFlipped;
      setIsFlipped(next);
      onFlipChange?.(next);
    }
  };

  // Count ratings by type
  const againCount = [...ratings.values()].filter((r) => r === 1).length;
  const hardCount = [...ratings.values()].filter((r) => r === 2).length;
  const goodCount = [...ratings.values()].filter((r) => r === 3).length;
  const easyCount = [...ratings.values()].filter((r) => r === 4).length;

  return (
    <div className="w-full flex-1 flex flex-col min-h-0 gap-3">
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
        className="relative w-full flex-1 min-h-0 cursor-pointer"
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
          <Card className="absolute inset-0 [backface-visibility:hidden] flex flex-col items-center justify-center p-6 text-center border-[hsl(var(--flashcard-accent)/0.2)]">
            <div
              ref={questionRef}
              className={cn(
                "text-lg font-semibold mb-4 transition-colors duration-200",
                playingEl === questionRef.current && "bg-[hsl(var(--primary)/0.10)] rounded-md px-2 -mx-2",
              )}
            >
              <MarkdownContent text={questionText} className="text-lg font-semibold" />
            </div>
            <p className="text-sm text-muted-foreground">{hasBeenRevealed ? tf("tapToSeeAnswer") : tf("tapToReveal")}</p>
          </Card>

          {/* Back */}
          <Card className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)] flex flex-col p-6 overflow-y-auto border-[hsl(var(--flashcard-accent)/0.2)]">
            <div className="flex-1 space-y-3">
              {answer && (
                <div>
                  <p className="text-sm font-medium mb-1">{tf("answer")}</p>
                  <MarkdownContent text={answer} className="text-sm text-muted-foreground" onBlockClick={handleBlockClick} playingEl={playingEl} ttsPaused={paused} />
                </div>
              )}
              {extra && (
                <details key={current.id} className="group rounded-lg bg-[hsl(var(--flashcard-accent)/0.1)]" onClick={(e) => e.stopPropagation()}>
                  <summary className="pl-1 py-2 cursor-pointer text-sm font-medium text-[hsl(var(--flashcard-accent))] list-none flex items-center gap-1">
                    <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                    {tq("learnMore")}
                  </summary>
                  <div className="pl-1 pb-3">
                    <MarkdownContent text={extra} className="text-sm text-muted-foreground" onBlockClick={handleBlockClick} playingEl={playingEl} ttsPaused={paused} />
                  </div>
                </details>
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
                    setHasBeenRevealed(false);
                  }
                }}
              >
                &#8856; {tq("suspend")}
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

    </div>
  );
}
