"use client";

import { useCallback } from "react";
import {
  isExtraDuplicate,
  stripFrontFromAnswer,
} from "@/lib/flashcards/strip-front-from-answer";
import { localizedField } from "@/lib/i18n/localized-field";
import type { UserCardState } from "@/lib/types/database";
import { cn } from "@/lib/utils";
import { FlashcardBack } from "./flashcard-back";
import { FlashcardFront } from "./flashcard-front";
import { FlashcardProgress } from "./flashcard-progress";
import { useFlashcardNavigation } from "./use-flashcard-navigation";

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
  const getFlashcardId = useCallback(
    (index: number) => flashcards[index]?.id,
    [flashcards],
  );

  const {
    currentIndex,
    isFlipped,
    hasBeenRevealed,
    reportOpen,
    setReportOpen,
    playingEl,
    paused,
    questionRef,
    backCardRef,
    handleFlip,
    handleTTSClick,
    handleSuspendAdvance,
    againCount,
    hardCount,
    goodCount,
    easyCount,
  } = useFlashcardNavigation({
    totalCards: flashcards.length,
    skipSignal,
    undoSignal,
    rateSignal,
    readQuestionsAloud,
    onGrade,
    onComplete,
    onIndexChange,
    onFlipChange,
    getFlashcardId,
  });

  const current = flashcards[currentIndex];
  if (!current) return null;

  const fc = current as unknown as Record<string, unknown>;
  const questionText = localizedField(fc, "question", locale);
  const rawAnswer = localizedField(fc, "answer", locale);
  const answer = rawAnswer
    ? stripFrontFromAnswer(rawAnswer, questionText)
    : rawAnswer;
  const rawExtra = localizedField(fc, "extra", locale) || null;
  const extra =
    rawExtra && answer && isExtraDuplicate(answer, rawExtra) ? null : rawExtra;

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
          <FlashcardFront
            questionText={questionText}
            hasBeenRevealed={hasBeenRevealed}
            questionRef={questionRef}
            playingEl={playingEl}
          />

          <FlashcardBack
            flashcardId={current.id}
            questionText={questionText}
            answer={answer || null}
            extra={extra}
            backCardRef={backCardRef}
            playingEl={playingEl}
            paused={paused}
            reportOpen={reportOpen}
            onReportOpenChange={setReportOpen}
            onTTSClick={handleTTSClick}
            onSuspend={() => handleSuspendAdvance(current.id, onSuspend)}
          />
        </div>
      </div>
    </div>
  );
}
