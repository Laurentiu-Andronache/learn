import { useCallback, useState } from "react";

interface UseCardNavigationProps {
  totalCards: number;
  onGrade: (flashcardId: string, rating: 1 | 2 | 3 | 4) => void;
  onComplete: (results: Map<string, 1 | 2 | 3 | 4>) => void;
  onIndexChange?: (index: number) => void;
  onFlipChange?: (flipped: boolean) => void;
  getFlashcardId: (index: number) => string | undefined;
  stopTTS: () => void;
  stopAutoPlay: () => void;
}

export function useCardNavigation({
  totalCards,
  onGrade,
  onComplete,
  onIndexChange,
  onFlipChange,
  getFlashcardId,
  stopTTS,
  stopAutoPlay,
}: UseCardNavigationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasBeenRevealed, setHasBeenRevealed] = useState(false);
  const [ratings, setRatings] = useState<Map<string, 1 | 2 | 3 | 4>>(new Map());
  const [reportOpen, setReportOpen] = useState(false);

  const advance = useCallback(
    (rating: 1 | 2 | 3 | 4) => {
      const id = getFlashcardId(currentIndex);
      if (!id) return;
      onGrade(id, rating);

      const newRatings = new Map(ratings);
      newRatings.set(id, rating);
      setRatings(newRatings);

      if (currentIndex + 1 >= totalCards) {
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
    [
      currentIndex,
      totalCards,
      ratings,
      onGrade,
      onComplete,
      onIndexChange,
      onFlipChange,
      getFlashcardId,
    ],
  );

  const handleFlip = useCallback(() => {
    stopTTS();
    stopAutoPlay();
    if (!hasBeenRevealed) {
      setIsFlipped(true);
      setHasBeenRevealed(true);
      onFlipChange?.(true);
    } else {
      const next = !isFlipped;
      setIsFlipped(next);
      onFlipChange?.(next);
    }
  }, [stopTTS, stopAutoPlay, hasBeenRevealed, isFlipped, onFlipChange]);

  const handleSuspendAdvance = useCallback(
    (flashcardId: string, onSuspend: (id: string) => void) => {
      onSuspend(flashcardId);
      if (currentIndex + 1 >= totalCards) {
        onComplete(ratings);
      } else {
        setCurrentIndex(currentIndex + 1);
        setIsFlipped(false);
        setHasBeenRevealed(false);
      }
    },
    [currentIndex, totalCards, ratings, onComplete],
  );

  const againCount = [...ratings.values()].filter((r) => r === 1).length;
  const hardCount = [...ratings.values()].filter((r) => r === 2).length;
  const goodCount = [...ratings.values()].filter((r) => r === 3).length;
  const easyCount = [...ratings.values()].filter((r) => r === 4).length;

  return {
    currentIndex,
    setCurrentIndex,
    isFlipped,
    setIsFlipped,
    hasBeenRevealed,
    setHasBeenRevealed,
    ratings,
    setRatings,
    reportOpen,
    setReportOpen,
    advance,
    handleFlip,
    handleSuspendAdvance,
    againCount,
    hardCount,
    goodCount,
    easyCount,
  };
}
