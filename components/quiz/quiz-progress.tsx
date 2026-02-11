"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export interface QuizProgressProps {
  current: number;
  total: number;
  correct: number;
  answered: number;
  categoryName?: string;
  categoryColor?: string | null;
}

export function QuizProgress({
  current,
  total,
  correct,
  answered,
  categoryName,
  categoryColor,
}: QuizProgressProps) {
  const t = useTranslations("quiz");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const percent = total > 0 ? Math.round((answered / total) * 100) : 0;
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 pb-3 pt-2 px-1 space-y-2">
      <div className="flex items-center justify-between gap-x-2 gap-y-1 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          {categoryName && (
            <Badge
              variant="outline"
              className="text-xs shrink-0 max-w-[120px] truncate"
              style={
                categoryColor
                  ? { borderColor: categoryColor, color: categoryColor }
                  : undefined
              }
            >
              {categoryName}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground whitespace-nowrap">
            {t("question")} {current}/{total}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground shrink-0">
          <span className="tabular-nums">{timeStr}</span>
          {answered > 0 && (
            <span className="font-medium">
              {t("score")}: {correct}/{answered}
            </span>
          )}
        </div>
      </div>
      <Progress value={percent} className="h-1.5" />
    </div>
  );
}
