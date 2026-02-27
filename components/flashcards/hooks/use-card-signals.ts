import { type Dispatch, type SetStateAction, useEffect, useRef } from "react";

interface UseCardSignalsProps {
  skipSignal?: number;
  undoSignal?: number;
  rateSignal?: { count: number; rating: 1 | 2 | 3 | 4 };
  currentIndex: number;
  totalCards: number;
  ratings: Map<string, 1 | 2 | 3 | 4>;
  advance: (rating: 1 | 2 | 3 | 4) => void;
  setCurrentIndex: (i: number) => void;
  setIsFlipped: (v: boolean) => void;
  setHasBeenRevealed: (v: boolean) => void;
  setRatings: Dispatch<SetStateAction<Map<string, 1 | 2 | 3 | 4>>>;
  onComplete: (results: Map<string, 1 | 2 | 3 | 4>) => void;
  onIndexChange?: (index: number) => void;
  onFlipChange?: (flipped: boolean) => void;
  getFlashcardId: (index: number) => string | undefined;
}

export function useCardSignals({
  skipSignal,
  undoSignal,
  rateSignal,
  currentIndex,
  totalCards,
  ratings,
  advance,
  setCurrentIndex,
  setIsFlipped,
  setHasBeenRevealed,
  setRatings,
  onComplete,
  onIndexChange,
  onFlipChange,
  getFlashcardId,
}: UseCardSignalsProps) {
  const prevSkipSignal = useRef(skipSignal ?? 0);
  const prevUndoSignal = useRef(undoSignal ?? 0);
  const prevRateSignal = useRef(rateSignal?.count ?? 0);

  // Skip signal — advance without grading
  useEffect(() => {
    if (skipSignal !== undefined && skipSignal > prevSkipSignal.current) {
      prevSkipSignal.current = skipSignal;
      if (currentIndex + 1 >= totalCards) {
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
    totalCards,
    ratings,
    onComplete,
    onIndexChange,
    onFlipChange,
    setCurrentIndex,
    setIsFlipped,
    setHasBeenRevealed,
  ]);

  // Undo signal — go back to previous card
  useEffect(() => {
    if (undoSignal !== undefined && undoSignal > prevUndoSignal.current) {
      prevUndoSignal.current = undoSignal;
      if (currentIndex > 0) {
        const prev = currentIndex - 1;
        const prevId = getFlashcardId(prev);
        if (prevId) {
          setRatings((r) => {
            const next = new Map(r);
            next.delete(prevId);
            return next;
          });
        }
        setCurrentIndex(prev);
        setIsFlipped(false);
        setHasBeenRevealed(false);
        onFlipChange?.(false);
        onIndexChange?.(prev);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }, [
    undoSignal,
    currentIndex,
    onIndexChange,
    onFlipChange,
    getFlashcardId,
    setCurrentIndex,
    setIsFlipped,
    setHasBeenRevealed,
    setRatings,
  ]);

  // Rate signal — grade from parent
  useEffect(() => {
    if (rateSignal && rateSignal.count > prevRateSignal.current) {
      prevRateSignal.current = rateSignal.count;
      advance(rateSignal.rating);
    }
  }, [rateSignal, advance]);
}
