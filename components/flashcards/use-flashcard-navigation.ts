import { useCallback, useEffect, useRef, useState } from "react";
import { useTTS } from "@/hooks/use-tts";

interface UseFlashcardNavigationProps {
  totalCards: number;
  skipSignal?: number;
  undoSignal?: number;
  rateSignal?: { count: number; rating: 1 | 2 | 3 | 4 };
  readQuestionsAloud?: boolean;
  onGrade: (flashcardId: string, rating: 1 | 2 | 3 | 4) => void;
  onComplete: (results: Map<string, 1 | 2 | 3 | 4>) => void;
  onIndexChange?: (index: number) => void;
  onFlipChange?: (flipped: boolean) => void;
  getFlashcardId: (index: number) => string | undefined;
}

export function useFlashcardNavigation({
  totalCards,
  skipSignal,
  undoSignal,
  rateSignal,
  readQuestionsAloud = false,
  onGrade,
  onComplete,
  onIndexChange,
  onFlipChange,
  getFlashcardId,
}: UseFlashcardNavigationProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [hasBeenRevealed, setHasBeenRevealed] = useState(false);
  const [ratings, setRatings] = useState<Map<string, 1 | 2 | 3 | 4>>(new Map());
  const [reportOpen, setReportOpen] = useState(false);

  const { playingEl, paused, handleBlockClick, stop: stopTTS } = useTTS();
  const questionRef = useRef<HTMLParagraphElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const stopAutoPlayRef = useRef(false);
  const prevSkipSignal = useRef(skipSignal ?? 0);
  const prevUndoSignal = useRef(undoSignal ?? 0);
  const prevRateSignal = useRef(rateSignal?.count ?? 0);

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
  }, [undoSignal, currentIndex, onIndexChange, onFlipChange, getFlashcardId]);

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

  const stopAutoPlay = useCallback(() => {
    stopAutoPlayRef.current = true;
    const container = backCardRef.current;
    if (container) {
      for (const audio of container.querySelectorAll<HTMLAudioElement>(
        "audio[data-inline-audio]",
      )) {
        audio.pause();
        audio.currentTime = 0;
      }
    }
  }, []);

  // Stop TTS + auto-play on card change, then auto-read question if enabled
  useEffect(() => {
    stopTTS();
    stopAutoPlay();
    if (readQuestionsAloud && questionRef.current) {
      handleBlockClick(questionRef.current);
    }
  }, [currentIndex]);

  // Auto-play inline audio when card flips to back
  useEffect(() => {
    if (!isFlipped) {
      stopAutoPlay();
      return;
    }
    const container = backCardRef.current;
    if (!container) return;

    const timeout = setTimeout(() => {
      const audios = Array.from(
        container.querySelectorAll<HTMLAudioElement>(
          "audio[data-inline-audio]",
        ),
      ).filter((a) => !a.closest("details:not([open])"));
      if (audios.length === 0) return;

      stopTTS();
      stopAutoPlayRef.current = false;

      let idx = 0;
      const playNext = () => {
        if (stopAutoPlayRef.current || idx >= audios.length) return;
        const audio = audios[idx];
        idx++;
        const onEnded = () => {
          audio.removeEventListener("ended", onEnded);
          playNext();
        };
        audio.addEventListener("ended", onEnded);
        audio.play().catch(() => {});
      };
      playNext();
    }, 350);

    return () => clearTimeout(timeout);
  }, [isFlipped, currentIndex]);

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

  const handleTTSClick = useCallback(
    (el: HTMLElement) => {
      stopAutoPlay();
      handleBlockClick(el);
    },
    [stopAutoPlay, handleBlockClick],
  );

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

  // Rating counts
  const againCount = [...ratings.values()].filter((r) => r === 1).length;
  const hardCount = [...ratings.values()].filter((r) => r === 2).length;
  const goodCount = [...ratings.values()].filter((r) => r === 3).length;
  const easyCount = [...ratings.values()].filter((r) => r === 4).length;

  return {
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
  };
}
