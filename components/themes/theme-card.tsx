'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { hideTheme } from '@/lib/services/user-preferences';
import { useRouter } from 'next/navigation';
import type { ThemeProgress } from '@/lib/fsrs/progress';

interface ThemeData {
  id: string;
  title_en: string;
  description_en: string | null;
  icon: string | null;
}

interface ThemeCardProps {
  theme: ThemeData;
  progress: ThemeProgress | null;
  userId: string;
}

export function ThemeCard({ theme, progress, userId }: ThemeCardProps) {
  const router = useRouter();

  const total = progress?.total ?? 0;
  const newPct = total > 0 ? (progress!.newCount / total) * 100 : 100;
  const learningPct = total > 0 ? (progress!.learningCount / total) * 100 : 0;
  const reviewPct = total > 0 ? (progress!.reviewCount / total) * 100 : 0;
  const masteredPct = total > 0 ? (progress!.masteredCount / total) * 100 : 0;

  const handleHide = async () => {
    await hideTheme(userId, theme.id);
    router.refresh();
  };

  return (
    <Link href={`/themes/${theme.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{theme.icon}</span>
              <h3 className="font-semibold text-lg leading-tight">{theme.title_en}</h3>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">⋯</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.preventDefault(); handleHide(); }}>
                  Hide Theme
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">{theme.description_en}</p>

          {/* Progress bar */}
          {total > 0 && (
            <div className="space-y-1">
              <div className="flex h-2 rounded-full overflow-hidden bg-muted">
                <div className="bg-green-500" style={{ width: `${masteredPct}%` }} />
                <div className="bg-blue-500" style={{ width: `${reviewPct}%` }} />
                <div className="bg-yellow-500" style={{ width: `${learningPct}%` }} />
                <div className="bg-gray-300 dark:bg-gray-600" style={{ width: `${newPct}%` }} />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{total} questions</span>
                <span>{progress?.percentComplete ?? 0}% mastered</span>
              </div>
            </div>
          )}

          {/* Due today badge */}
          <div className="flex items-center gap-2">
            {progress && progress.dueToday > 0 && (
              <Badge variant="secondary">{progress.dueToday} due today</Badge>
            )}
            {progress?.fullyMemorized && (
              <Badge className="bg-green-600">Fully Memorized!</Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
