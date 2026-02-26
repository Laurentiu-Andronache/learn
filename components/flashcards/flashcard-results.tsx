"use client";

import { ArrowLeft, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { AnimatedScore } from "@/components/shared/animated-score";
import { SegmentedBar } from "@/components/shared/segmented-bar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { triggerCelebration } from "@/lib/confetti";

interface CategoryBreakdown {
  name: string;
  again: number;
  hard: number;
  good: number;
  easy: number;
}

interface FlashcardResultsProps {
  again: number;
  hard: number;
  good: number;
  easy: number;
  categories: CategoryBreakdown[];
  onReviewAgain?: () => void;
}

export function FlashcardResults({
  again,
  hard,
  good,
  easy,
  categories,
  onReviewAgain,
}: FlashcardResultsProps) {
  const t = useTranslations("flashcard.results");

  const total = again + hard + good + easy;
  const recallPercent =
    total > 0 ? Math.round(((good + easy) / total) * 100) : 0;

  useEffect(() => {
    const cleanup = triggerCelebration("flashcard", recallPercent);
    return cleanup;
  }, [recallPercent]);

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 space-y-6 animate-fade-up">
      <h1 className="text-2xl font-bold text-center">{t("title")}</h1>

      {/* Score card */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="text-center space-y-2">
            <AnimatedScore value={recallPercent} showRing />
            <p className="text-sm text-muted-foreground">{t("recallRate")}</p>
          </div>

          {/* 4-segment colored bar */}
          <SegmentedBar
            segments={[
              { className: "bg-rating-again", value: again },
              { className: "bg-rating-hard", value: hard },
              { className: "bg-rating-good", value: good },
              { className: "bg-rating-easy", value: easy },
            ]}
            total={total}
          />

          {/* 4-rating counts */}
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className="text-lg font-semibold text-rating-again">{again}</p>
              <p className="text-xs text-muted-foreground">{t("again")}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-rating-hard">{hard}</p>
              <p className="text-xs text-muted-foreground">{t("hard")}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-rating-good">{good}</p>
              <p className="text-xs text-muted-foreground">{t("good")}</p>
            </div>
            <div>
              <p className="text-lg font-semibold text-rating-easy">{easy}</p>
              <p className="text-xs text-muted-foreground">{t("easy")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category breakdown */}
      {categories.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Categories
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {categories.map((cat) => {
              const catTotal = cat.again + cat.hard + cat.good + cat.easy;
              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span>{cat.name}</span>
                    <span className="text-muted-foreground">
                      {cat.good + cat.easy}/{catTotal}
                    </span>
                  </div>
                  <SegmentedBar
                    segments={[
                      { className: "bg-rating-again", value: cat.again },
                      { className: "bg-rating-hard", value: cat.hard },
                      { className: "bg-rating-good", value: cat.good },
                      { className: "bg-rating-easy", value: cat.easy },
                    ]}
                    total={catTotal}
                    height="h-1.5"
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Action buttons */}
      <div className="flex flex-col gap-3">
        {onReviewAgain && (
          <Button onClick={onReviewAgain} className="w-full" size="lg">
            <RotateCcw size={16} />
            {t("reviewAgain")}
          </Button>
        )}
        <Button variant="outline" asChild className="w-full" size="lg">
          <Link href="/topics">
            <ArrowLeft size={16} />
            {t("backToTopics")}
          </Link>
        </Button>
      </div>
    </div>
  );
}
