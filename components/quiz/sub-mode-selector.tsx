'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SubMode } from '@/lib/fsrs/question-ordering';

export interface CategoryOption {
  id: string;
  nameEn: string;
  nameEs: string;
  color: string | null;
  count: number;
}

interface SubModeSelectorProps {
  counts: { full: number; quickReview: number; spacedRepetition: number };
  categories: CategoryOption[];
  onSelect: (subMode: SubMode, categoryId?: string) => void;
}

const SUB_MODE_ICONS: Record<string, string> = {
  full: '📋',
  quickReview: '🔄',
  spacedRepetition: '🧠',
  categoryFocus: '🎯',
};

export function SubModeSelector({ counts, categories, onSelect }: SubModeSelectorProps) {
  const t = useTranslations('subModes');
  const locale = useLocale();

  const modes: { key: string; subMode: SubMode; count: number | null; disabled: boolean }[] = [
    { key: 'full', subMode: 'full', count: counts.full, disabled: counts.full === 0 },
    { key: 'quickReview', subMode: 'quick_review', count: counts.quickReview, disabled: counts.quickReview === 0 },
    { key: 'spacedRepetition', subMode: 'spaced_repetition', count: counts.spacedRepetition, disabled: counts.spacedRepetition === 0 },
    { key: 'categoryFocus', subMode: 'category_focus', count: null, disabled: categories.length === 0 },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {modes.map(({ key, subMode, count, disabled }) => (
          key === 'categoryFocus' ? null : (
            <button
              key={key}
              onClick={() => !disabled && onSelect(subMode)}
              disabled={disabled}
              className="text-left"
            >
              <Card className={cn(
                'h-full transition-all duration-200',
                disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md hover:border-primary/50 cursor-pointer',
              )}>
                <CardContent className="pt-5 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{SUB_MODE_ICONS[key]}</span>
                    <span className="font-semibold text-sm">{t(key)}</span>
                    {count !== null && (
                      <Badge variant="secondary" className="ml-auto text-xs">{count}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">{t(`${key}Description`)}</p>
                </CardContent>
              </Card>
            </button>
          )
        ))}
      </div>

      {/* Category focus section */}
      {categories.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">{SUB_MODE_ICONS.categoryFocus}</span>
            <span className="font-semibold text-sm">{t('categoryFocus')}</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">{t('categoryFocusDescription')}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {categories.map(cat => {
              const catName = locale === 'es' ? cat.nameEs : cat.nameEn;
              return (
              <button
                key={cat.id}
                onClick={() => onSelect('category_focus', cat.id)}
                className="text-left"
              >
                <Card className="hover:shadow-md hover:border-primary/50 cursor-pointer transition-all duration-200">
                  <CardContent className="py-3 px-4 flex items-center justify-between">
                    <span className="flex items-center gap-2 text-sm">
                      {cat.color && <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />}
                      {catName}
                    </span>
                    <Badge variant="outline" className="text-xs">{cat.count}</Badge>
                  </CardContent>
                </Card>
              </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
