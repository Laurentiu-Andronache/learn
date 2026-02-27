import { useCallback, useEffect, useRef } from "react";
import { useTTS } from "@/hooks/use-tts";

interface UseCardAudioProps {
  currentIndex: number;
  isFlipped: boolean;
  readQuestionsAloud: boolean;
}

export function useCardAudio({
  currentIndex,
  isFlipped,
  readQuestionsAloud,
}: UseCardAudioProps) {
  const { playingEl, paused, handleBlockClick, stop: stopTTS } = useTTS();
  const questionRef = useRef<HTMLParagraphElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const stopAutoPlayRef = useRef(false);

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

  const handleTTSClick = useCallback(
    (el: HTMLElement) => {
      stopAutoPlay();
      handleBlockClick(el);
    },
    [stopAutoPlay, handleBlockClick],
  );

  // Stop TTS + auto-play on card change, then auto-read question if enabled
  useEffect(() => {
    stopTTS();
    stopAutoPlay();
    if (readQuestionsAloud && questionRef.current) {
      handleBlockClick(questionRef.current);
    }
  }, [currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

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
  }, [isFlipped, currentIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    playingEl,
    paused,
    questionRef,
    backCardRef,
    handleTTSClick,
    stopTTS,
    stopAutoPlay,
  };
}
