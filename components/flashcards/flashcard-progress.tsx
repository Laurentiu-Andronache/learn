"use client";

import { Progress } from "@/components/ui/progress";

interface FlashcardProgressProps {
  current: number;
  total: number;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

export function FlashcardProgress({
  current,
  total,
  again,
  hard,
  good,
  easy,
}: FlashcardProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <Progress value={percent} className="h-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>
          {current}/{total}
        </span>
        <div className="flex gap-2">
          {again > 0 && <span className="text-red-500">{again}</span>}
          {hard > 0 && <span className="text-amber-500">{hard}</span>}
          {good > 0 && <span className="text-green-500">{good}</span>}
          {easy > 0 && <span className="text-blue-500">{easy}</span>}
        </div>
      </div>
    </div>
  );
}
