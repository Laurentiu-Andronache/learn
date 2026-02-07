'use client';

import { ThemeCard } from '@/components/themes/theme-card';
import { useTranslations } from 'next-intl';
import type { ThemeProgress } from '@/lib/fsrs/progress';

interface ThemeData {
  id: string;
  title_en: string;
  title_es: string | null;
  description_en: string | null;
  description_es: string | null;
  icon: string | null;
}

interface ThemeGridProps {
  themes: ThemeData[];
  progress: ThemeProgress[];
  userId: string;
  locale: string;
}

export function ThemeGrid({ themes, progress, userId, locale }: ThemeGridProps) {
  const t = useTranslations('themes');
  const progressMap = new Map(progress.map(p => [p.themeId, p]));

  if (themes.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p className="text-lg">{t('noThemes')}</p>
        <p className="text-sm mt-2">{t('noThemesDetail')}</p>
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
          locale={locale}
        />
      ))}
    </div>
  );
}
