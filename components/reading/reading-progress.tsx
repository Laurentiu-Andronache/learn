"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useTranslations } from "next-intl";
import { updateReadingProgress } from "@/lib/services/user-preferences";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";

interface ReadingProgressBarProps {
  userId: string;
  themeId: string;
  initialPercent: number;
}

export function ReadingProgressBar({ userId, themeId, initialPercent }: ReadingProgressBarProps) {
  const t = useTranslations("reading");
  const [scrollPercent, setScrollPercent] = useState(0);
  const [completed, setCompleted] = useState(initialPercent >= 100);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setScrollPercent(100);
        return;
      }
      setScrollPercent(Math.min(100, Math.round((scrollTop / docHeight) * 100)));
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMarkAsRead = useCallback(() => {
    startTransition(async () => {
      await updateReadingProgress(userId, themeId, themeId, 1, 100);
      setCompleted(true);
    });
  }, [userId, themeId]);

  return (
    <>
      {/* Top scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-150"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      {/* Bottom "Mark as Read" bar */}
      {!completed && scrollPercent > 80 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
          <div className="max-w-[680px] mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{scrollPercent}%</span>
            <Button size="sm" onClick={handleMarkAsRead} disabled={isPending}>
              {isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <>
                  <Check size={14} />
                  {t("markAsRead")}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Completed badge */}
      {completed && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full bg-green-500/10 border border-green-500/30 px-3 py-1.5 text-green-600 dark:text-green-400 text-sm">
          <Check size={14} />
          {t("completed")}
        </div>
      )}
    </>
  );
}
