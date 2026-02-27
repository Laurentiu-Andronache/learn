import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  buryFlashcard,
  scheduleFlashcardReview,
  undoLastReview,
} from "@/lib/fsrs/actions";
import type { UserSchedulerSettings } from "@/lib/fsrs/interval-preview";
import { getIntervalPreviews } from "@/lib/fsrs/interval-preview";
import { deleteFlashcard } from "@/lib/services/admin-reviews";
import type { FsrsSettings } from "@/lib/services/user-preferences";
import { suspendFlashcard } from "@/lib/services/user-preferences";
import type { UserCardState } from "@/lib/types/database";

interface FlashcardItemData {
  id: string;
  question_en: string;
  question_es: string;
  answer_en: string;
  answer_es: string;
  extra_en: string | null;
  extra_es: string | null;
  categoryNameEn: string;
  categoryNameEs: string;
  categoryColor: string | null;
  cardState: UserCardState | null;
}

interface UseFlashcardSessionProps {
  initialFlashcards: FlashcardItemData[];
  fsrsSettings: FsrsSettings | null;
}

export function useFlashcardSession({
  initialFlashcards,
  fsrsSettings,
}: UseFlashcardSessionProps) {
  const tq = useTranslations("quiz");
  const ts = useTranslations("session");
  const [sessionKey, setSessionKey] = useState(0);
  const [, setIsFlipped] = useState(false);
  const [rateSignal, setRateSignal] = useState({
    count: 0,
    rating: 3 as 1 | 2 | 3 | 4,
  });
  const [flashcards, setFlashcards] = useState(initialFlashcards);
  const [results, setResults] = useState<Map<string, 1 | 2 | 3 | 4> | null>(
    null,
  );
  const startTime = useRef(Date.now());
  const [currentIdx, setCurrentIdx] = useState(0);
  const [skipSignal, setSkipSignal] = useState(0);
  const [undoSignal, setUndoSignal] = useState(0);
  const [hasRevealed, setHasRevealed] = useState(false);

  // Compute interval previews for all flashcards (client-side, no server call)
  const userSchedulerSettings: UserSchedulerSettings | undefined = useMemo(
    () =>
      fsrsSettings
        ? {
            desired_retention: fsrsSettings.desired_retention,
            max_review_interval: fsrsSettings.max_review_interval,
          }
        : undefined,
    [fsrsSettings],
  );
  const showIntervalPreviews = fsrsSettings?.show_review_time !== false;
  const intervalPreviews = useMemo(() => {
    const map = new Map<string, Record<1 | 2 | 3 | 4, string>>();
    for (const fc of flashcards) {
      map.set(fc.id, getIntervalPreviews(fc.cardState, userSchedulerSettings));
    }
    return map;
  }, [flashcards, userSchedulerSettings]);

  const handleGrade = useCallback(
    (flashcardId: string, rating: 1 | 2 | 3 | 4) => {
      const timeMs = Date.now() - startTime.current;
      scheduleFlashcardReview(flashcardId, rating, timeMs).catch(() =>
        toast.error(ts("gradeFailed")),
      );
      startTime.current = Date.now();
    },
    [ts],
  );

  const handleSuspend = useCallback(
    (flashcardId: string) => {
      suspendFlashcard(flashcardId, "Suspended from flashcard session").catch(
        () => toast.error(ts("suspendFailed")),
      );
      toast.success(tq("questionSuspended"), { duration: 3000 });
    },
    [tq, ts],
  );

  const handleComplete = useCallback(
    (finalResults: Map<string, 1 | 2 | 3 | 4>) => {
      setResults(finalResults);
    },
    [],
  );

  const handleFlipChange = useCallback((flipped: boolean) => {
    setIsFlipped(flipped);
    if (flipped) setHasRevealed(true);
  }, []);

  const handleRate = useCallback((rating: 1 | 2 | 3 | 4) => {
    setRateSignal((prev) => ({ count: prev.count + 1, rating }));
  }, []);

  const handleReviewAgain = useCallback(() => {
    if (!results) return;
    const againIds = new Set(
      [...results.entries()].filter(([, r]) => r === 1).map(([id]) => id),
    );
    const againCards = flashcards.filter((fc) => againIds.has(fc.id));
    setFlashcards(againCards);
    setResults(null);
    setSessionKey((k) => k + 1);
    setCurrentIdx(0);
    setIsFlipped(false);
    setHasRevealed(false);
  }, [results, flashcards]);

  const handleIndexChange = useCallback((index: number) => {
    setCurrentIdx(index);
    setHasRevealed(false);
  }, []);

  const handleBury = useCallback(() => {
    const fc = flashcards[currentIdx];
    if (!fc) return;
    buryFlashcard(fc.id).catch(() => toast.error(ts("buryFailed")));
    toast.success(ts("cardBuried"), { duration: 3000 });
    setSkipSignal((s) => s + 1);
  }, [flashcards, currentIdx, ts]);

  const handleUndo = useCallback(() => {
    if (currentIdx === 0) return;
    const prevFc = flashcards[currentIdx - 1];
    undoLastReview(prevFc.id).catch(() => toast.error(ts("undoFailed")));
    toast.success(ts("undone"), { duration: 3000 });
    setUndoSignal((s) => s + 1);
  }, [flashcards, currentIdx, ts]);

  const handleDeleteQuestion = useCallback(() => {
    const fc = flashcards[currentIdx];
    if (!fc) return;
    deleteFlashcard(fc.id).catch(() => toast.error(ts("deleteFailed")));
    toast.success(ts("questionDeleted"), { duration: 3000 });

    const remaining = flashcards.filter((_, i) => i !== currentIdx);
    setFlashcards(remaining);
    if (remaining.length === 0 || currentIdx >= remaining.length) {
      setResults(new Map());
    }
    setSessionKey((k) => k + 1);
  }, [flashcards, currentIdx, ts]);

  const currentFc = flashcards[currentIdx];
  const currentPreviews = currentFc
    ? (intervalPreviews.get(currentFc.id) ?? { 1: "", 2: "", 3: "", 4: "" })
    : { 1: "", 2: "", 3: "", 4: "" };

  return {
    sessionKey,
    flashcards,
    results,
    currentIdx,
    currentFc,
    currentPreviews,
    skipSignal,
    undoSignal,
    rateSignal,
    hasRevealed,
    showIntervalPreviews,
    handleGrade,
    handleSuspend,
    handleComplete,
    handleFlipChange,
    handleRate,
    handleReviewAgain,
    handleIndexChange,
    handleBury,
    handleUndo,
    handleDeleteQuestion,
  };
}
