import { useCallback, useRef } from "react";
import { useCardAudio } from "./hooks/use-card-audio";
import { useCardHotkeys } from "./hooks/use-card-hotkeys";
import { useCardNavigation } from "./hooks/use-card-navigation";
import { useCardSignals } from "./hooks/use-card-signals";

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
  // Ref-bridge: navigation's handleFlip needs audio's stop functions,
  // but audio's effects need navigation's state. Refs break the cycle —
  // navigation calls through refs, audio populates them each render.
  const stopTTSRef = useRef<() => void>(() => {});
  const stopAutoPlayRef = useRef<() => void>(() => {});

  const stopTTSStable = useCallback(() => stopTTSRef.current(), []);
  const stopAutoPlayStable = useCallback(() => stopAutoPlayRef.current(), []);

  const nav = useCardNavigation({
    totalCards,
    onGrade,
    onComplete,
    onIndexChange,
    onFlipChange,
    getFlashcardId,
    stopTTS: stopTTSStable,
    stopAutoPlay: stopAutoPlayStable,
  });

  const audio = useCardAudio({
    currentIndex: nav.currentIndex,
    isFlipped: nav.isFlipped,
    readQuestionsAloud,
  });

  // Keep refs in sync with audio's actual functions
  stopTTSRef.current = audio.stopTTS;
  stopAutoPlayRef.current = audio.stopAutoPlay;

  useCardSignals({
    skipSignal,
    undoSignal,
    rateSignal,
    currentIndex: nav.currentIndex,
    totalCards,
    ratings: nav.ratings,
    advance: nav.advance,
    setCurrentIndex: nav.setCurrentIndex,
    setIsFlipped: nav.setIsFlipped,
    setHasBeenRevealed: nav.setHasBeenRevealed,
    setRatings: nav.setRatings,
    onComplete,
    onIndexChange,
    onFlipChange,
    getFlashcardId,
  });

  useCardHotkeys({
    hasBeenRevealed: nav.hasBeenRevealed,
    reportOpen: nav.reportOpen,
    advance: nav.advance,
  });

  return {
    currentIndex: nav.currentIndex,
    isFlipped: nav.isFlipped,
    hasBeenRevealed: nav.hasBeenRevealed,
    reportOpen: nav.reportOpen,
    setReportOpen: nav.setReportOpen,
    playingEl: audio.playingEl,
    paused: audio.paused,
    questionRef: audio.questionRef,
    backCardRef: audio.backCardRef,
    handleFlip: nav.handleFlip,
    handleTTSClick: audio.handleTTSClick,
    handleSuspendAdvance: nav.handleSuspendAdvance,
    againCount: nav.againCount,
    hardCount: nav.hardCount,
    goodCount: nav.goodCount,
    easyCount: nav.easyCount,
  };
}
