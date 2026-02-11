"use client";

import { Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateReadingProgress } from "@/lib/services/user-preferences";

interface ReadingProgressBarProps {
  userId: string;
  topicId: string;
  initialPercent: number;
}

export function ReadingProgressBar({
  userId,
  topicId,
  initialPercent,
}: ReadingProgressBarProps) {
  const t = useTranslations("reading");
  const router = useRouter();
  const [scrollPercent, setScrollPercent] = useState(0);
  const [completed, setCompleted] = useState(initialPercent >= 100);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setScrollPercent(100);
        return;
      }
      setScrollPercent(
        Math.min(100, Math.round((scrollTop / docHeight) * 100)),
      );
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMarkAsRead = useCallback(() => {
    startTransition(async () => {
      await updateReadingProgress(userId, topicId, null, 1, 100);
      setCompleted(true);
      toast.success(t("completed"));
      setTimeout(() => router.push(`/topics/${topicId}`), 1500);
    });
  }, [userId, topicId, t, router]);

  return (
    <>
      {/* Top scroll progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div
          className="h-full bg-gradient-to-r from-reading-accent/80 to-reading-accent transition-[width] duration-150"
          style={{ width: `${scrollPercent}%` }}
        />
      </div>

      {/* Bottom "Mark as Read" bar */}
      {!completed && scrollPercent > 80 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 shadow-[0_-4px_20px_-5px_hsl(var(--reading-accent)/0.1)]">
          <div className="max-w-[680px] mx-auto px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              {scrollPercent}%
            </span>
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
    </>
  );
}
