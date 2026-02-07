'use client';

import { ThemeCard } from '@/components/themes/theme-card';
import type { ThemeProgress } from '@/lib/fsrs/progress';

interface ThemeData {
  id: string;
  title_en: string;
  description_en: string | null;
  icon: string | null;
}

interface ThemeGridProps {
  themes: ThemeData[];
  progress: ThemeProgress[];
  userId: string;
}

export function ThemeGrid({ themes, progress, userId }: ThemeGridProps) {
  const progressMap = new Map(progress.map(p => [p.themeId, p]));

  if (themes.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">No themes available yet.</p>
        <p className="text-sm mt-2">Check back soon for new content!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {themes.map(theme => (
        <ThemeCard
          key={theme.id}
          theme={theme}
          progress={progressMap.get(theme.id) || null}
          userId={userId}
        />
      ))}
    </div>
  );
}
