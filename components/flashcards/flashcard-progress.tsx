'use client';

import { Progress } from '@/components/ui/progress';

interface FlashcardProgressProps {
  current: number;
  total: number;
  knew: number;
  didntKnow: number;
}

export function FlashcardProgress({ current, total, knew, didntKnow }: FlashcardProgressProps) {
  const percent = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="space-y-2">
      <Progress value={percent} className="h-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{current}/{total} cards</span>
        <div className="flex gap-3">
          <span className="text-green-600">Knew: {knew}</span>
          <span className="text-red-600">Didn&apos;t Know: {didntKnow}</span>
        </div>
      </div>
    </div>
  );
}
