"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const CACHE_NAME = "tts-audio-v1";
const DEBOUNCE_MS = 300;

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function useTTS() {
  const [playingEl, setPlayingEl] = useState<HTMLElement | null>(null);
  const [paused, setPaused] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const playingElRef = useRef<HTMLElement | null>(null);
  const pausedRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locale = useLocale();
  const t = useTranslations("tts");

  // Keep refs in sync with state
  playingElRef.current = playingEl;
  pausedRef.current = paused;

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.removeAttribute("src");
      audioRef.current = null;
    }
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setPlayingEl(null);
    setPaused(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => stop, [stop]);

  const handleBlockClick = useCallback(
    (el: HTMLElement) => {
      // Debounce rapid clicks
      if (debounceRef.current) clearTimeout(debounceRef.current);

      debounceRef.current = setTimeout(async () => {
        // Pause/resume if clicking the same element
        if (playingElRef.current === el && audioRef.current) {
          if (pausedRef.current) {
            await audioRef.current.play();
            setPaused(false);
          } else {
            audioRef.current.pause();
            setPaused(true);
          }
          return;
        }

        // Stop any current playback
        stop();

        const text = el.textContent?.trim();
        if (!text) return;

        try {
          const hash = await sha256(text);
          const cacheKey = `/api/tts/${hash}`;

          // Check browser Cache API
          let response: Response | undefined;
          try {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(cacheKey);
            if (cached) {
              response = cached;
            }
          } catch {
            // Cache API unavailable (e.g. incognito) — proceed without
          }

          // Fetch from API if not cached
          if (!response) {
            const fetchResponse = await fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text, locale }),
            });

            if (fetchResponse.status === 429) {
              toast.error(t("rateLimited"));
              return;
            }
            if (!fetchResponse.ok) {
              toast.error(t("error"));
              return;
            }

            // Cache the response clone
            try {
              const cache = await caches.open(CACHE_NAME);
              await cache.put(cacheKey, fetchResponse.clone());
            } catch {
              // Silent fail
            }

            response = fetchResponse;
          }

          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          urlRef.current = url;

          const audio = new Audio(url);
          audioRef.current = audio;
          setPlayingEl(el);

          audio.addEventListener("ended", () => {
            stop();
          });
          audio.addEventListener("error", () => {
            stop();
          });

          await audio.play();
        } catch {
          stop();
          toast.error(t("error"));
        }
      }, DEBOUNCE_MS);
    },
    [stop, locale, t],
  );

  return { playingEl, paused, handleBlockClick, stop };
}
